package pl.gorahugona.granica;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Zgodność aplikacji na iPhone'a (Swift, gora-hugona/ios) z aplikacją na Androida: ten sam szyfr i ten sam kodek
 * krótkofalówki co do bajtu. Ta strona zapisuje wektory Javy i sprawdza wektory Swifta (ios/test/main.swift):
 *   java -cp out pl.gorahugona.granica.Wektory zrob java.txt
 *   java -cp out pl.gorahugona.granica.Wektory sprawdz swift.txt
 */
public class Wektory {
    static final String TEKST = "Zażółć gęślą jaźń — 📣 {\"lat\":50.2776,\"poza\":true}";
    private static int bledy;

    private static void sprawdz(boolean w, String opis) {
        System.out.println((w ? "OK    " : "BŁĄD  ") + opis);
        if (!w) bledy++;
    }

    /** Ten sam sygnał co sygnalWektorow() w main.swift — same liczby całkowite (48 kHz). */
    static short[] sygnal() {
        int n = 48000 * 3;
        short[] s = new short[n];
        long x = 12345;
        for (int i = 0; i < n; i++) {
            int p = i % 200;
            int tri = p < 100 ? p * 200 - 10000 : (200 - p) * 200 - 10000;
            x = (x * 1103515245L + 12345) & 0x7fffffffL;
            int szum = (int) ((x >> 16) % 2001) - 1000;
            int cichy = i < 48000 ? 1 : 4;
            s[i] = (short) Math.max(-32768, Math.min(32767, (tri + szum) * cichy / 4));
        }
        return s;
    }

    static List<byte[]> pakiety() {
        Radio.Nadawanie n = new Radio.Nadawanie(48000);
        short[] s = sygnal();
        List<byte[]> p = new ArrayList<>();
        for (int i = 0; i < s.length; i += 960) {
            int dl = Math.min(960, s.length - i);
            short[] r = new short[dl];
            System.arraycopy(s, i, r, 0, dl);
            p.addAll(n.dodaj(r, dl));
        }
        p.addAll(n.zakoncz());
        return p;
    }

    static String hex(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format("%02x", x & 0xff));
        return s.toString();
    }

    static byte[] zHex(String h) {
        byte[] b = new byte[h.length() / 2];
        for (int i = 0; i < b.length; i++) b[i] = (byte) Integer.parseInt(h.substring(2 * i, 2 * i + 2), 16);
        return b;
    }

    static byte[] bezId(byte[] b) {
        byte[] c = b.clone();
        for (int i = 2; i <= 5 && i < c.length; i++) c[i] = 0;
        return c;
    }

    public static void main(String[] a) throws Exception {
        if (a[0].equals("zrob")) {
            StringBuilder w = new StringBuilder("szyfr " + hex(Szyfr.zaszyfruj(TEKST)) + "\n");
            for (byte[] p : pakiety()) w.append("radio ").append(hex(p)).append("\n");
            Files.write(Paths.get(a[1]), w.toString().getBytes(StandardCharsets.UTF_8));
            System.out.println("zapisano " + a[1]);
            return;
        }
        List<byte[]> szyfr = new ArrayList<>(), radio = new ArrayList<>();
        for (String l : Files.readAllLines(Paths.get(a[1]), StandardCharsets.UTF_8)) {
            if (l.startsWith("szyfr ")) szyfr.add(zHex(l.substring(6)));
            if (l.startsWith("radio ")) radio.add(zHex(l.substring(6)));
        }
        sprawdz(szyfr.size() == 1 && TEKST.equals(Szyfr.odszyfruj(szyfr.get(0))), "Java odszyfrowuje wiadomość ze Swifta");
        List<byte[]> moje = pakiety();
        sprawdz(radio.size() == moje.size(), "tyle samo pakietów głosu (" + radio.size() + " ze Swifta, " + moje.size() + " z Javy)");
        int zgodne = 0;
        for (int i = 0; i < Math.min(radio.size(), moje.size()); i++) {
            if (java.util.Arrays.equals(bezId(radio.get(i)), bezId(moje.get(i)))) zgodne++;
        }
        sprawdz(zgodne == moje.size(), "pakiety głosu Javy bajt w bajt jak ze Swifta (" + zgodne + " z " + moje.size() + ")");
        boolean czyta = !radio.isEmpty();
        for (int i = 0; i < radio.size(); i++) {
            Radio.Pakiet p = Radio.odczytaj(radio.get(i));
            czyta &= p != null && p.nr == i && p.id == 0x0BADCAFE && p.ostatni == (i == radio.size() - 1);
        }
        sprawdz(czyta, "Java odczytuje pakiety Swifta: id, kolejne numery, ostatni z flagą końca");
        System.out.println(bledy == 0 ? "WSZYSTKO OK" : "BŁĘDÓW: " + bledy);
        System.exit(bledy == 0 ? 0 : 1);
    }
}
