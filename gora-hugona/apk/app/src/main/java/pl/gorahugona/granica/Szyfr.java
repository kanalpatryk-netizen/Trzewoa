package pl.gorahugona.granica;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Szyfrowanie wiadomości gry (AES-GCM). Serwer MQTT jest publiczny — bez szyfru każdy, kto zna temat,
 * czytałby pozycje graczy. Klucz jest wpisany w aplikację, więc chroni przed przypadkowymi podglądaczami,
 * nie przed kimś, kto rozbierze APK. Format: [1 bajt wersji = 1][12 bajtów IV][szyfrogram z 16-bajtowym znacznikiem].
 */
final class Szyfr {
    private static final byte[] KLUCZ = hex("e0bb393b9d727efecb085413f5dc6ea18e3c2827874632d5204b3214473be5c7");
    private static final SecureRandom LOS = new SecureRandom();
    private static final int WERSJA = 1, IV = 12, ZNACZNIK = 16;

    private Szyfr() {}

    static byte[] zaszyfruj(String tekst) {
        return zaszyfruj(tekst.getBytes(StandardCharsets.UTF_8));
    }

    static byte[] zaszyfruj(byte[] dane) {
        try {
            byte[] iv = new byte[IV];
            LOS.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(KLUCZ, "AES"), new GCMParameterSpec(ZNACZNIK * 8, iv));
            byte[] s = c.doFinal(dane);
            byte[] w = new byte[1 + IV + s.length];
            w[0] = WERSJA;
            System.arraycopy(iv, 0, w, 1, IV);
            System.arraycopy(s, 0, w, 1 + IV, s.length);
            return w;
        } catch (GeneralSecurityException e) {
            return null;
        }
    }

    /** Odszyfrowany tekst albo null, gdy to nie nasza wiadomość (inny klucz, śmieci, uszkodzenie). */
    static String odszyfruj(byte[] b) {
        byte[] d = odszyfrujBajty(b);
        return d == null ? null : new String(d, StandardCharsets.UTF_8);
    }

    static byte[] odszyfrujBajty(byte[] b) {
        if (b == null || b.length < 1 + IV + ZNACZNIK || b[0] != WERSJA) return null;
        try {
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(KLUCZ, "AES"), new GCMParameterSpec(ZNACZNIK * 8, b, 1, IV));
            return c.doFinal(b, 1 + IV, b.length - 1 - IV);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            return null;
        }
    }

    private static byte[] hex(String h) {
        byte[] b = new byte[h.length() / 2];
        for (int i = 0; i < b.length; i++) b[i] = (byte) Integer.parseInt(h.substring(2 * i, 2 * i + 2), 16);
        return b;
    }
}
