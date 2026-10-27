package pl.gorahugona.granica;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Sprawdza krótkofalówkę bez sieci i bez Androida (Radio.java): jakość kodeka ADPCM, przeliczanie
 * częstotliwości mikrofonu, pakiety (kolejność, koniec), wzmacnianie cichego głosu.
 *   javac -d out apk/app/src/main/java/pl/gorahugona/granica/Radio.java test/TestRadio.java
 *   java -cp out pl.gorahugona.granica.TestRadio
 */
public class TestRadio {
    private static int bledy;

    private static void sprawdz(boolean w, String opis) {
        System.out.println((w ? "OK    " : "BŁĄD  ") + opis);
        if (!w) bledy++;
    }

    /** Coś jak mowa: harmoniczne zmiennego tonu podstawowego, „sylaby” 4 razy na sekundę, trochę szumu. */
    private static short[] mowa(int hz, double sekundy, double glosnosc, long ziarno) {
        Random los = new Random(ziarno);
        int n = (int) (hz * sekundy);
        short[] s = new short[n];
        double faza = 0;
        for (int i = 0; i < n; i++) {
            double t = (double) i / hz;
            double f0 = 150 + 50 * Math.sin(2 * Math.PI * 0.7 * t);
            faza += 2 * Math.PI * f0 / hz;
            double v = 0;
            for (int k = 1; k <= 15; k++) {
                double fk = f0 * k;
                if (fk > 3400) break;
                double formant = Math.exp(-Math.pow((fk - 700) / 400, 2)) + 0.5 * Math.exp(-Math.pow((fk - 1800) / 500, 2)) + 0.1;
                v += formant * Math.sin(k * faza) / k;
            }
            double sylaby = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(2 * Math.PI * 2 * t)), 2);
            v = v * sylaby + 0.01 * los.nextGaussian();
            s[i] = (short) Math.max(-32768, Math.min(32767, v * glosnosc * 32767 / 1.6));
        }
        return s;
    }

    private static double snr(short[] wzor, short[] wynik, int n) {
        double s = 0, e = 0;
        for (int i = 0; i < n; i++) {
            s += (double) wzor[i] * wzor[i];
            double d = wzor[i] - wynik[i];
            e += d * d;
        }
        return 10 * Math.log10(s / Math.max(e, 1));
    }

    private static double korelacja(short[] a, short[] b, int n) {
        double ab = 0, aa = 0, bb = 0;
        for (int i = 0; i < n; i++) {
            ab += (double) a[i] * b[i];
            aa += (double) a[i] * a[i];
            bb += (double) b[i] * b[i];
        }
        return ab / Math.sqrt(aa * bb);
    }

    private static List<byte[]> nadaj(short[] we, int hz) {
        Radio.Nadawanie nad = new Radio.Nadawanie(hz);
        List<byte[]> p = new ArrayList<>();
        int ramka = hz / 50;                                   // jak mikrofon: po 20 ms
        short[] buf = new short[ramka];
        for (int i = 0; i < we.length; i += ramka) {
            int k = Math.min(ramka, we.length - i);
            System.arraycopy(we, i, buf, 0, k);
            p.addAll(nad.dodaj(buf, k));
        }
        p.addAll(nad.zakoncz());
        return p;
    }

    private static short[] odbierz(List<byte[]> pakiety) {
        List<Short> w = new ArrayList<>();
        for (byte[] b : pakiety) for (short v : Radio.odczytaj(b).probki) w.add(v);
        short[] s = new short[w.size()];
        for (int i = 0; i < s.length; i++) s[i] = w.get(i);
        return s;
    }

    public static void main(String[] a) {
        // 1. sam kodek na 8 kHz
        short[] wzor = mowa(8000, 2, 0.5, 1);
        int[] stan = {0, 0};
        byte[] p = Radio.pakiet(7, 0, false, wzor, Radio.KAWALEK, stan);
        Radio.Pakiet r = Radio.odczytaj(p);
        sprawdz(p.length == Radio.NAGLOWEK + Radio.KAWALEK / 2, "pakiet 250 ms = " + p.length + " B (4 bity na próbkę)");
        double snrKodeka = snr(wzor, r.probki, Radio.KAWALEK);
        sprawdz(r.id == 7 && r.nr == 0 && !r.ostatni && snrKodeka > 15, String.format("kodek ADPCM: SNR %.1f dB", snrKodeka));

        // 2. cała droga: mikrofon 48 kHz → pakiety → głośnik
        short[] mikrofon = mowa(48000, 3, 0.5, 2);
        List<byte[]> pakiety = nadaj(mikrofon, 48000);
        boolean kolejno = true, jedenId = true;
        int id = Radio.odczytaj(pakiety.get(0)).id;
        for (int i = 0; i < pakiety.size(); i++) {
            Radio.Pakiet q = Radio.odczytaj(pakiety.get(i));
            kolejno &= q.nr == i && q.ostatni == (i == pakiety.size() - 1);
            jedenId &= q.id == id;
        }
        sprawdz(pakiety.size() == 13 && kolejno && jedenId, "3 s mowy = 12 pakietów + końcowy, numery po kolei, jedno id, flaga końca");
        short[] glosnik = odbierz(pakiety);
        sprawdz(Math.abs(glosnik.length - 24000) <= 2, "po drugiej stronie 3 s dźwięku 8 kHz (" + glosnik.length + " próbek)");
        // wzorzec: ta sama mowa policzona od razu w 8 kHz (bez ADPCM i wzmocnienia) — porównujemy kształt
        short[] wzor8 = mowa(8000, 3, 0.5, 2);
        double k = korelacja(wzor8, glosnik, Math.min(wzor8.length, glosnik.length) - 4);
        sprawdz(k > 0.9, String.format("głos zgodny z oryginałem (korelacja %.3f)", k));
        // pocięcie na pakiety nic nie zmienia: to samo, co zakodować całość jednym ciągiem (więc bez trzasków na granicach)
        Radio.Nadawanie wzorNad = new Radio.Nadawanie(48000);
        short[] po8 = new short[mikrofon.length];
        int ile8 = new Radio.DoOsmiu(48000).przerob(mikrofon, mikrofon.length, po8);
        int[] kod = {0, 0}, dek = {0, 0};
        int roznice = 0;
        for (int i = 0; i < ile8; i++) {
            int v = Radio.dekoduj(Radio.koduj(wzorNad.wzmocnij(po8[i]), kod), dek);
            if (v != glosnik[i]) roznice++;
        }
        sprawdz(roznice == 0, "pakiety = kodowanie ciągłe, próbka w próbkę (bez trzasków na granicach)");

        // 3. wzmacnianie: cichy głos głośniej, głośny bez przesterowania
        short[] cichy = mowa(16000, 2, 0.03, 3);
        short[] cichyPo = odbierz(nadaj(cichy, 16000));
        int szczytPrzed = 0, szczytPo = 0;
        for (short v : cichy) szczytPrzed = Math.max(szczytPrzed, Math.abs(v));
        for (int i = cichyPo.length / 2; i < cichyPo.length; i++) szczytPo = Math.max(szczytPo, Math.abs(cichyPo[i]));
        sprawdz(szczytPo > 3 * szczytPrzed, "cichy głos wzmocniony (szczyt " + szczytPrzed + " → " + szczytPo + ")");
        short[] glosny = odbierz(nadaj(mowa(44100, 2, 0.95, 4), 44100));
        int przester = 0;
        for (short v : glosny) if (Math.abs(v) >= 32700) przester++;
        sprawdz(przester < glosny.length / 200, "głośny głos bez przesterowania (" + przester + " próbek na granicy)");

        // 4. krótkie wciśnięcie, śmieci, sygnały
        Radio.Nadawanie krotko = new Radio.Nadawanie(8000);
        List<byte[]> nic = krotko.zakoncz();
        Radio.Pakiet pusty = Radio.odczytaj(nic.get(0));
        sprawdz(nic.size() == 1 && pusty.ostatni && pusty.probki.length == 0, "puszczenie od razu: jeden pusty pakiet „koniec”");
        byte[] zly = p.clone();
        zly[11] = (byte) 200;
        sprawdz(Radio.odczytaj(new byte[] {1, 2, 3}) == null && Radio.odczytaj(zly) == null && Radio.odczytaj(new byte[2000]) == null,
            "śmieci odrzucone");
        sprawdz(Radio.sygnalPoczatek().length == 1160 && Radio.sygnalKoniec().length == 1680, "sygnały początku i końca");

        System.out.println(bledy == 0 ? "WSZYSTKO OK" : "BŁĘDÓW: " + bledy);
        System.exit(bledy == 0 ? 0 : 1);
    }
}
