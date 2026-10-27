package pl.gorahugona.granica;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Głośnik krótkofalówki: sam odtwarza głos innych szukających — bez dotykania czegokolwiek, także przy zgaszonym
 * ekranie (działa w usłudze {@link Straz}). Każdy nadający ma własny strumień; na początku 200 ms zapasu na nierówno
 * przychodzące pakiety i krótki sygnał, na końcu „roger beep”. Głośność — jak multimedia; muzyka na ten czas cichnie.
 * Wszystko, co dotyczy dźwięku, dzieje się na osobnym wątku, żeby nie blokować sieci.
 */
final class Glosnik {
    private static final int ZAPAS_MS = 200, KONIEC_PO_MS = 2000, BUFOR_S = 4;
    private static final AudioAttributes ATRYBUTY = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build();

    private final Runnable zmiana;
    private final AudioManager am;
    private final HandlerThread watek = new HandlerThread("glosnik");
    private final Handler h;
    /** Kto teraz mówi (numer gracza → strumień). Tylko na wątku głośnika. */
    private final Map<Integer, Strumien> strumienie = new HashMap<>();
    /** Strumienie, które jeszcze dogrywają końcówkę — do zwolnienia. */
    private final List<AudioTrack> wygasaja = new ArrayList<>();
    private final AudioManager.OnAudioFocusChangeListener nicNieRob = z -> { };
    private Object fokus;
    private volatile int[] mowia = new int[0];

    private final class Strumien {
        final int od, id;
        final AudioTrack tor;
        int nastepny;
        final Runnable cisza = new Runnable() {
            @Override
            public void run() {
                zakoncz(Strumien.this, true);             // zgubiony pakiet końca — kończymy sami
            }
        };

        Strumien(int od, int id, AudioTrack tor) {
            this.od = od;
            this.id = id;
            this.tor = tor;
        }
    }

    /** {@code zmiana} — wołane, gdy ktoś zaczyna albo kończy mówić (z wątku głośnika). */
    Glosnik(Context c, Runnable zmiana) {
        this.zmiana = zmiana;
        am = (AudioManager) c.getApplicationContext().getSystemService(Context.AUDIO_SERVICE);
        watek.start();
        h = new Handler(watek.getLooper());
    }

    /** Pakiet z sieci (z dowolnego wątku). */
    void odbierz(int od, byte[] pakiet) {
        h.post(() -> przyjmij(od, pakiet));
    }

    /** Numery graczy, którzy teraz mówią. */
    int[] mowia() {
        return mowia;
    }

    void zamknij() {
        h.post(() -> {
            for (Strumien s : new ArrayList<>(strumienie.values())) {
                h.removeCallbacks(s.cisza);
                zwolnij(s.tor);
            }
            strumienie.clear();
            for (AudioTrack t : wygasaja) zwolnij(t);
            wygasaja.clear();
            oddajFokus();
            odswiez();
            watek.quitSafely();
        });
    }

    private void przyjmij(int od, byte[] b) {
        Radio.Pakiet p = Radio.odczytaj(b);
        if (p == null) return;
        // półdupleks jak w prawdziwej krótkofalówce: kiedy sam mówisz, cudzy głos nie leci z głośnika do mikrofonu
        boolean mowie = Nadajnik.nadaje();
        Strumien s = strumienie.get(od);
        if (s != null && s.id != p.id) {                    // nowe nadanie, a stare bez końca
            zakoncz(s, !mowie);
            s = null;
        }
        if (s == null) {
            if (mowie || p.ostatni && p.probki.length == 0) return;  // mówię albo samo puszczenie przycisku
            s = nowy(od, p.id);
            if (s == null) return;
        }
        if (p.nr < s.nastepny) return;                      // powtórka albo spóźniony
        s.nastepny = p.nr + 1;
        if (!mowie) pisz(s.tor, p.probki);
        h.removeCallbacks(s.cisza);
        if (p.ostatni) zakoncz(s, !mowie);
        else h.postDelayed(s.cisza, KONIEC_PO_MS);
    }

    private Strumien nowy(int od, int id) {
        AudioTrack t;
        try {
            t = new AudioTrack.Builder()
                .setAudioAttributes(ATRYBUTY)
                .setAudioFormat(new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(Radio.HZ)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build())
                .setTransferMode(AudioTrack.MODE_STREAM)
                .setBufferSizeInBytes(Radio.HZ * 2 * BUFOR_S)
                .build();
        } catch (RuntimeException e) {
            return null;
        }
        if (strumienie.isEmpty() && wygasaja.isEmpty()) wezFokus();
        Strumien s = new Strumien(od, id, t);
        strumienie.put(od, s);
        pisz(t, Radio.cisza(ZAPAS_MS));
        pisz(t, Radio.sygnalPoczatek());
        try {
            t.play();
        } catch (IllegalStateException ignored) {
        }
        odswiez();
        return s;
    }

    private void zakoncz(Strumien s, boolean sygnal) {
        h.removeCallbacks(s.cisza);
        strumienie.remove(s.od);
        if (sygnal) pisz(s.tor, Radio.sygnalKoniec());
        try {
            s.tor.stop();                                   // strumień: dogrywa to, co już zapisane, i staje
        } catch (IllegalStateException ignored) {
        }
        wygasaja.add(s.tor);
        h.postDelayed(() -> {
            if (wygasaja.remove(s.tor)) zwolnij(s.tor);
            if (strumienie.isEmpty() && wygasaja.isEmpty()) oddajFokus();
        }, BUFOR_S * 1000L + 500);
        odswiez();
    }

    private static void pisz(AudioTrack t, short[] probki) {
        try {
            t.write(probki, 0, probki.length);
        } catch (RuntimeException ignored) {
        }
    }

    private static void zwolnij(AudioTrack t) {
        try {
            t.stop();
        } catch (IllegalStateException ignored) {
        }
        t.release();
    }

    private void odswiez() {
        int[] m = new int[strumienie.size()];
        int i = 0;
        for (int n : strumienie.keySet()) m[i++] = n;
        java.util.Arrays.sort(m);
        mowia = m;
        zmiana.run();
    }

    @SuppressWarnings("deprecation")
    private void wezFokus() {
        if (am == null || fokus != null) return;
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                AudioFocusRequest r = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(ATRYBUTY)
                    .build();
                am.requestAudioFocus(r);
                fokus = r;
            } else {
                am.requestAudioFocus(nicNieRob, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
                fokus = nicNieRob;
            }
        } catch (RuntimeException ignored) {
        }
    }

    @SuppressWarnings("deprecation")
    private void oddajFokus() {
        if (am == null || fokus == null) return;
        try {
            if (Build.VERSION.SDK_INT >= 26) am.abandonAudioFocusRequest((AudioFocusRequest) fokus);
            else am.abandonAudioFocus(nicNieRob);
        } catch (RuntimeException ignored) {
        }
        fokus = null;
    }
}
