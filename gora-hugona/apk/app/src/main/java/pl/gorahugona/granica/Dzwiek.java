package pl.gorahugona.granica;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

/**
 * Dźwięki strażnika. Wszystko idzie strumieniem ALARMU — słychać je także w trybie cichym
 * i z wibracjami, a na czas syreny głośność alarmu jest podnoszona do co najmniej 80%.
 */
final class Dzwiek {
    private static final int PROBKOWANIE = 22050;
    private static AudioTrack syrena;
    private static int glosnoscPrzed = -1;
    private static boolean test;

    private Dzwiek() {}

    /** Wyjąca syrena w pętli (650 → 1300 → 650 Hz co sekundę), aż do {@link #ucisz}. */
    static synchronized void syrena(Context c, boolean wibruj) {
        test = false;                                       // prawdziwy alarm przejmuje syrenę z próby
        if (syrena == null) {
            podglosnij(c);
            int n = PROBKOWANIE;
            short[] b = new short[n];
            double faza = 0;
            for (int i = 0; i < n; i++) {
                double t = (double) i / n;
                double f = t < 0.5 ? 650 + 1300 * t : 650 + 1300 * (1 - t);
                faza += 2 * Math.PI * f / PROBKOWANIE;
                double v = 0.72 * Math.sin(faza) + 0.22 * Math.sin(3 * faza);
                b[i] = (short) (v * 32000);
            }
            try {
                AudioTrack t = new AudioTrack.Builder()
                    .setAudioAttributes(atrybuty())
                    .setAudioFormat(new AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(PROBKOWANIE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build())
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .setBufferSizeInBytes(n * 2)
                    .build();
                t.write(b, 0, n);
                t.setLoopPoints(0, n, -1);
                t.play();
                syrena = t;
            } catch (RuntimeException e) {
                syrena = null;
            }
        }
        if (wibruj) wibracje(c, new long[] {0, 700, 350}, 0);
    }

    /** Próba alarmu z ustawień: 3 s syreny; nie rusza syreny, która już wyje. */
    static synchronized boolean test(Context c) {
        if (syrena != null) return false;
        syrena(c, true);
        test = true;
        return true;
    }

    static synchronized void koniecTestu(Context c) {
        if (test) ucisz(c);
    }

    static synchronized void ucisz(Context c) {
        test = false;
        if (syrena != null) {
            try {
                syrena.stop();
            } catch (RuntimeException ignored) {
            }
            syrena.release();
            syrena = null;
        }
        Vibrator v = (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
        if (v != null) v.cancel();
        przywrocGlosnosc(c);
    }

    /** Krótkie ostrzeżenie: zbliżasz się do granicy. */
    static void pisk(Context c, boolean wibruj) {
        ton(ToneGenerator.TONE_PROP_BEEP2, 700);
        if (wibruj) wibracje(c, new long[] {0, 250, 150, 250}, -1);
    }

    /** Wróciłeś do środka. */
    static void powrot() {
        ton(ToneGenerator.TONE_PROP_ACK, 500);
    }

    private static void ton(int rodzaj, int ms) {
        try {
            final ToneGenerator g = new ToneGenerator(AudioManager.STREAM_ALARM, 100);
            g.startTone(rodzaj, ms);
            new Handler(Looper.getMainLooper()).postDelayed(g::release, ms + 300);
        } catch (RuntimeException ignored) {
        }
    }

    private static AudioAttributes atrybuty() {
        return new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
    }

    @SuppressWarnings("deprecation")
    private static void wibracje(Context c, long[] wzor, int powtorz) {
        Vibrator v = (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
        if (v == null || !v.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(wzor, powtorz), atrybuty());
        else v.vibrate(wzor, powtorz);
    }

    private static void podglosnij(Context c) {
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return;
        try {
            int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            int teraz = am.getStreamVolume(AudioManager.STREAM_ALARM);
            int cel = (int) Math.ceil(max * 0.8);
            if (teraz < cel) {
                glosnoscPrzed = teraz;
                am.setStreamVolume(AudioManager.STREAM_ALARM, cel, 0);
            }
        } catch (RuntimeException ignored) {
            glosnoscPrzed = -1;
        }
    }

    private static void przywrocGlosnosc(Context c) {
        if (glosnoscPrzed < 0) return;
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        try {
            if (am != null) am.setStreamVolume(AudioManager.STREAM_ALARM, glosnoscPrzed, 0);
        } catch (RuntimeException ignored) {
        }
        glosnoscPrzed = -1;
    }
}
