package pl.gorahugona.granica;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

/**
 * Krótkofalówka szukających — część bez Androida (sprawdzana na zwykłej JVM, patrz gora-hugona/test):
 * kodek IMA ADPCM (8 kHz, 4 bity na próbkę = 4 KB/s), pakiety po 250 ms, przeliczanie dźwięku z mikrofonu
 * na 8 kHz, wzmacnianie cichego głosu i sygnały początku i końca jak w walkie-talkie.
 *
 * <p>Pakiet (przed szyfrowaniem): {@code 'R'}, wersja 1, id nadania (4 B), numer kawałka (2 B), flagi (1 B, 1 = ostatni),
 * stan kodeka na początek kawałka — predyktor (2 B) i indeks kroku (1 B) — a potem dane ADPCM, 2 próbki na bajt.
 * Każdy kawałek da się odkodować osobno, więc zgubiony pakiet nie psuje następnych.
 */
final class Radio {
    static final int HZ = 8000;
    /** Próbek w jednym pakiecie: 250 ms. */
    static final int KAWALEK = HZ / 4;
    static final int NAGLOWEK = 12;
    private static final byte TYP = 'R', WERSJA = 1;
    private static final SecureRandom LOS = new SecureRandom();

    private Radio() {}

    static final class Pakiet {
        final int id, nr;
        final boolean ostatni;
        final short[] probki;

        Pakiet(int id, int nr, boolean ostatni, short[] probki) {
            this.id = id;
            this.nr = nr;
            this.ostatni = ostatni;
            this.probki = probki;
        }
    }

    // ---- kodek IMA ADPCM ----

    private static final int[] KROKI = {
        7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97,
        107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796,
        876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871,
        5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623,
        27086, 29794, 32767};
    private static final int[] ZMIANA = {-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8};

    /** Koduje próbkę; stan = {predyktor, indeks kroku} — zmienia się tak samo jak u dekodera. */
    static int koduj(int probka, int[] stan) {
        int krok = KROKI[stan[1]];
        int roznica = probka - stan[0];
        int kod = 0;
        if (roznica < 0) {
            kod = 8;
            roznica = -roznica;
        }
        if (roznica >= krok) {
            kod |= 4;
            roznica -= krok;
        }
        if (roznica >= krok >> 1) {
            kod |= 2;
            roznica -= krok >> 1;
        }
        if (roznica >= krok >> 2) kod |= 1;
        dekoduj(kod, stan);
        return kod;
    }

    static int dekoduj(int kod, int[] stan) {
        int krok = KROKI[stan[1]];
        int delta = krok >> 3;
        if ((kod & 4) != 0) delta += krok;
        if ((kod & 2) != 0) delta += krok >> 1;
        if ((kod & 1) != 0) delta += krok >> 2;
        int p = stan[0] + ((kod & 8) != 0 ? -delta : delta);
        stan[0] = Math.max(-32768, Math.min(32767, p));
        stan[1] = Math.max(0, Math.min(88, stan[1] + ZMIANA[kod]));
        return stan[0];
    }

    /** Buduje pakiet z {@code ile} próbek (parzyście); {@code stan} kodeka przechodzi na następny pakiet. */
    static byte[] pakiet(int id, int nr, boolean ostatni, short[] probki, int ile, int[] stan) {
        byte[] b = new byte[NAGLOWEK + ile / 2];
        b[0] = TYP;
        b[1] = WERSJA;
        b[2] = (byte) (id >>> 24);
        b[3] = (byte) (id >>> 16);
        b[4] = (byte) (id >>> 8);
        b[5] = (byte) id;
        b[6] = (byte) (nr >>> 8);
        b[7] = (byte) nr;
        b[8] = (byte) (ostatni ? 1 : 0);
        b[9] = (byte) (stan[0] >>> 8);
        b[10] = (byte) stan[0];
        b[11] = (byte) stan[1];
        for (int i = 0; i + 1 < ile; i += 2) {
            int a = koduj(probki[i], stan), c = koduj(probki[i + 1], stan);
            b[NAGLOWEK + i / 2] = (byte) (a | c << 4);
        }
        return b;
    }

    /** Odczytuje i dekoduje pakiet; null, gdy to nie pakiet krótkofalówki. */
    static Pakiet odczytaj(byte[] b) {
        if (b == null || b.length < NAGLOWEK || b[0] != TYP || b[1] != WERSJA) return null;
        int dl = b.length - NAGLOWEK, idx = b[11] & 0xff;
        if (dl > KAWALEK / 2 || idx > 88) return null;
        int id = (b[2] & 0xff) << 24 | (b[3] & 0xff) << 16 | (b[4] & 0xff) << 8 | b[5] & 0xff;
        int nr = (b[6] & 0xff) << 8 | b[7] & 0xff;
        int[] stan = {(short) ((b[9] & 0xff) << 8 | b[10] & 0xff), idx};
        short[] p = new short[dl * 2];
        for (int i = 0; i < dl; i++) {
            int v = b[NAGLOWEK + i] & 0xff;
            p[2 * i] = (short) dekoduj(v & 15, stan);
            p[2 * i + 1] = (short) dekoduj(v >> 4, stan);
        }
        return new Pakiet(id, nr, (b[8] & 1) != 0, p);
    }

    // ---- nadawanie: mikrofon → pakiety ----

    /** Jedno nadanie (od wciśnięcia do puszczenia przycisku). */
    static final class Nadawanie {
        private final int id = LOS.nextInt();
        private final DoOsmiu przelicznik;
        private final short[] kawalek = new short[KAWALEK];
        private final int[] stan = {0, 0};
        private int ile, nr;
        private double obwiednia, wzmocnienie = 1;
        private short[] wy = new short[0];

        Nadawanie(int czestotliwosc) {
            przelicznik = new DoOsmiu(czestotliwosc);
        }

        /** Próbki z mikrofonu (w jego częstotliwości); zwraca gotowe pakiety (zwykle 0 albo 1). */
        List<byte[]> dodaj(short[] we, int dl) {
            List<byte[]> gotowe = new ArrayList<>();
            if (wy.length < dl + 2) wy = new short[dl + 2];
            int k = przelicznik.przerob(we, dl, wy);
            for (int i = 0; i < k; i++) {
                kawalek[ile++] = wzmocnij(wy[i]);
                if (ile == KAWALEK) gotowe.add(kawalek(false));
            }
            return gotowe;
        }

        /** Koniec nadawania: reszta próbek z flagą „ostatni” (także pusty pakiet — odbiorca wie, że to koniec). */
        List<byte[]> zakoncz() {
            List<byte[]> gotowe = new ArrayList<>();
            gotowe.add(kawalek(true));
            return gotowe;
        }

        private byte[] kawalek(boolean ostatni) {
            if ((ile & 1) != 0) kawalek[ile++] = 0;
            byte[] p = pakiet(id, nr++ & 0xffff, ostatni, kawalek, ile, stan);
            ile = 0;
            return p;
        }

        /**
         * Cichy głos podnosi do ok. połowy skali (najwyżej 4×), próbka po próbce: obwiednia szczytów opada o połowę
         * w ok. 0,3 s, a wzmocnienie ścisza się w ok. 6 ms i podgłaśnia w ok. 0,4 s — bez skoków i „pompowania”.
         */
        short wzmocnij(short x) {
            obwiednia = Math.max(Math.abs(x), obwiednia * 0.9997);
            double cel = Math.max(1, Math.min(4, 0.5 * 32767 / Math.max(obwiednia, 600)));
            wzmocnienie += (cel - wzmocnienie) * (cel < wzmocnienie ? 0.02 : 0.0003);
            return (short) Math.max(-32768, Math.min(32767, Math.round(x * wzmocnienie)));
        }
    }

    /** Przeliczanie częstotliwości mikrofonu (8, 16, 44,1 albo 48 kHz) na 8 kHz: średnia z okna. */
    static final class DoOsmiu {
        private final double okno;
        private double granica;
        private long n;
        private long suma;
        private int ile;

        DoOsmiu(int czestotliwosc) {
            okno = czestotliwosc / (double) HZ;
            granica = okno;
        }

        int przerob(short[] we, int dl, short[] wy) {
            int k = 0;
            for (int i = 0; i < dl; i++) {
                suma += we[i];
                ile++;
                if (++n >= granica) {
                    wy[k++] = (short) (suma / ile);
                    suma = 0;
                    ile = 0;
                    granica += okno;
                }
            }
            return k;
        }
    }

    // ---- sygnały ----

    static short[] cisza(int ms) {
        return new short[HZ * ms / 1000];
    }

    static short[] ton(double hz, int ms, double glosnosc) {
        int n = HZ * ms / 1000;
        double zbocze = HZ * 0.005;
        short[] t = new short[n];
        for (int i = 0; i < n; i++) {
            double obwiednia = Math.min(1, Math.min(i, n - 1 - i) / zbocze);
            t[i] = (short) (Math.sin(2 * Math.PI * hz * i / HZ) * glosnosc * 32767 * obwiednia);
        }
        return t;
    }

    /** Ktoś zaczyna mówić: dwa krótkie, rosnące piski. */
    static short[] sygnalPoczatek() {
        return polacz(ton(900, 50, 0.3), cisza(25), ton(1300, 70, 0.3));
    }

    /** Koniec nadawania („roger beep”): dwa opadające piski. */
    static short[] sygnalKoniec() {
        return polacz(cisza(40), ton(1300, 60, 0.3), cisza(20), ton(900, 90, 0.3));
    }

    static short[] polacz(short[]... czesci) {
        int n = 0;
        for (short[] c : czesci) n += c.length;
        short[] w = new short[n];
        int i = 0;
        for (short[] c : czesci) {
            System.arraycopy(c, 0, w, i, c.length);
            i += c.length;
        }
        return w;
    }
}
