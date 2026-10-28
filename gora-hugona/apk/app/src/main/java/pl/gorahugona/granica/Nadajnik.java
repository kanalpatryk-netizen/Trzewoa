package pl.gorahugona.granica;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.SystemClock;

/**
 * Mikrofon krótkofalówki: póki szukający trzyma przycisk MÓW, nagrywa i co 250 ms wysyła pakiet głosu
 * ({@link Radio}) przez grę ({@link Gra#glos}). Nagrywa tylko przy otwartym oknie aplikacji; najwyżej 60 s naraz.
 */
final class Nadajnik {
    private static final long MAKS_MS = 60000;
    private static final int[] CZESTOTLIWOSCI = {8000, 16000, 44100, 48000};
    private static volatile boolean nadaje, puszczony;

    private Nadajnik() {}

    /**
     * Wciśnięcie przycisku. Zwraca „ok”, „start” (gra nie działa — trzeba nacisnąć START), „rola” (mówią tylko
     * szukający i mistrz gry) albo „mikrofon” (nie da się go włączyć). Wołane z wątku strony; zgodę na mikrofon
     * sprawdza okno.
     */
    static synchronized String start() {
        Gra g = Straz.gra;
        if (g == null || !g.polaczony()) return "start";
        if (!g.mozeMowic()) return "rola";
        if (nadaje) {                                       // jeszcze kończy poprzednie — po prostu mów dalej
            puszczony = false;
            return "ok";
        }
        AudioRecord r = null;
        int hz = 0;
        for (int czest : CZESTOTLIWOSCI) {
            int min = AudioRecord.getMinBufferSize(czest, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
            if (min <= 0) continue;
            try {
                AudioRecord t = new AudioRecord(MediaRecorder.AudioSource.MIC, czest, AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT, Math.max(min, czest / 2));   // co najmniej 0,25 s zapasu
                if (t.getState() == AudioRecord.STATE_INITIALIZED) {
                    r = t;
                    hz = czest;
                    break;
                }
                t.release();
            } catch (RuntimeException e) {
                // ta częstotliwość nie działa albo brak zgody
            }
        }
        if (r == null) return "mikrofon";
        try {
            r.startRecording();
        } catch (RuntimeException e) {
            r.release();
            return "mikrofon";
        }
        nadaje = true;
        puszczony = false;
        final AudioRecord mikrofon = r;
        final int czestotliwosc = hz;
        new Thread(() -> nagrywaj(g, mikrofon, czestotliwosc), "nadajnik").start();
        return "ok";
    }

    /** Puszczenie przycisku (albo schowanie aplikacji). */
    static void stop() {
        puszczony = true;
    }

    static boolean nadaje() {
        return nadaje;
    }

    private static void nagrywaj(Gra g, AudioRecord r, int hz) {
        Radio.Nadawanie n = new Radio.Nadawanie(hz);
        short[] bufor = new short[hz / 50];                 // po 20 ms
        long poczatek = SystemClock.elapsedRealtime();
        try {
            while (!puszczony && SystemClock.elapsedRealtime() - poczatek < MAKS_MS) {
                int k = r.read(bufor, 0, bufor.length);
                if (k < 0) break;
                for (byte[] p : n.dodaj(bufor, k)) g.glos(p);
            }
            for (byte[] p : n.zakoncz()) g.glos(p);
        } catch (RuntimeException ignored) {
        } finally {
            try {
                r.stop();
            } catch (RuntimeException ignored) {
            }
            r.release();
            nadaje = false;
        }
    }
}
