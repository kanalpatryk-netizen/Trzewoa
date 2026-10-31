package pl.gorahugona.granica;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.json.JSONArray;
import org.json.JSONObject;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.BooleanSupplier;

/**
 * Gra mieszana: mistrz gry na Androidzie (ta klasa — Gra.java) i dwa iPhone'y (gora-hugona/ios/test/main.swift,
 * polecenie „mieszany”), uruchomione równocześnie na tym samym temacie prawdziwego serwera:
 *   java -cp 'out:lib/*' pl.gorahugona.granica.TestMieszany <serwery> <temat> & ./testy mieszany <serwery> <temat>
 * Sprawdza po stronie Androida: pozycje z iPhone'ów, wiadomość i głos od szukającego z iPhone'a.
 */
public class TestMieszany {
    private static int bledy;

    private static void sprawdz(boolean w, String opis) {
        System.out.println((w ? "OK    " : "BŁĄD  ") + "[Android] " + opis);
        if (!w) bledy++;
    }

    private static boolean czekaj(BooleanSupplier w, long ms) throws InterruptedException {
        long koniec = System.currentTimeMillis() + ms;
        while (System.currentTimeMillis() < koniec) {
            if (w.getAsBoolean()) return true;
            Thread.sleep(100);
        }
        return w.getAsBoolean();
    }

    private static JSONObject gracz(Gra g, int n) {
        JSONArray a = g.stan().getJSONArray("gracze");
        for (int i = 0; i < a.length(); i++) if (a.getJSONObject(i).getInt("n") == n) return a.getJSONObject(i);
        return null;
    }

    public static void main(String[] arg) throws Exception {
        String[] serwery = arg[0].split(",");
        String temat = arg[1];
        List<String> wiadomosci = Collections.synchronizedList(new ArrayList<>());
        List<byte[]> glosy = Collections.synchronizedList(new ArrayList<>());
        Set<Integer> odKogo = Collections.synchronizedSet(new HashSet<>());
        Gra m = new Gra(7, serwery, temat, new Gra.Sluchacz() {
            @Override public void zmiana() { }
            @Override public void wiadomosc(int od, String tekst) { wiadomosci.add(od + ":" + tekst); }
            @Override public void koniecCzasu() { }
            @Override public void glos(int od, byte[] pakiet) { odKogo.add(od); glosy.add(pakiet); }
        });
        m.polacz();
        sprawdz(czekaj(m::polaczony, 30000), "mistrz gry połączony");
        sprawdz(czekaj(() -> gracz(m, 1) != null && gracz(m, 3) != null, 60000), "mistrz widzi pozycje obu iPhone'ów");
        JSONObject p3 = gracz(m, 3);
        sprawdz(p3 != null && Math.abs(p3.getDouble("lat") - 50.278) < 1e-6 && Math.abs(p3.getDouble("lon") - 18.917) < 1e-6
            && p3.getBoolean("poza") && p3.getInt("dokl") == 8 && p3.getBoolean("aktywny"), "pozycja z iPhone'a 3: współrzędne, dokładność, „poza granicą”");
        sprawdz(m.ustawRole("{\"1\":\"szuka\",\"3\":\"chowa\"}"), "mistrz ustawia role");
        sprawdz(m.ustawCzas(20), "mistrz ustawia czas gry");
        Thread.sleep(3000);
        sprawdz(m.wyslijWiadomosc("wszyscy", "Start z Androida!"), "mistrz wysyła do wszystkich");
        Radio.Nadawanie nad = new Radio.Nadawanie(8000);
        List<byte[]> nadane = new ArrayList<>();
        short[] ramka = new short[160];
        for (int r = 0; r < 50; r++) {
            for (int i = 0; i < 160; i++) ramka[i] = (short) (8000 * Math.sin(2 * Math.PI * 440 * (r * 160 + i) / 8000.0));
            nadane.addAll(nad.dodaj(ramka, 160));
        }
        nadane.addAll(nad.zakoncz());
        boolean nadaje = true;
        for (byte[] p : nadane) {
            nadaje &= m.glos(p);
            Thread.sleep(250);
        }
        sprawdz(nadaje, "mistrz nadaje głos (" + nadane.size() + " pakietów)");
        sprawdz(czekaj(() -> wiadomosci.contains("1:Znalazłem z iPhone'a!"), 60000), "wiadomość z iPhone'a dotarła do mistrza");
        sprawdz(czekaj(() -> glosy.size() >= 4, 30000), "mistrz słyszy szukającego z iPhone'a (" + glosy.size() + " pakietów)");
        boolean czyta = !glosy.isEmpty() && odKogo.equals(Set.of(1));
        synchronized (glosy) {
            for (byte[] g : glosy) czyta &= Radio.odczytaj(g) != null;
            czyta &= !glosy.isEmpty() && Radio.odczytaj(glosy.get(glosy.size() - 1)).ostatni;
        }
        sprawdz(czyta, "głos z iPhone'a odczytany, od gracza 1, ostatni pakiet z flagą końca");
        sprawdz(czekaj(() -> {
            JSONObject g = gracz(m, 3);
            return g != null && !g.getBoolean("aktywny");
        }, 30000), "mistrz widzi, że iPhone 3 wyłączył grę");

        m.zamknij();
        Thread.sleep(2000);
        // sprzątanie zachowanych wiadomości testu
        MqttClient c = new MqttClient(serwery[0], "ghtest-" + Long.toHexString(new SecureRandom().nextLong()).substring(0, 8), new MemoryPersistence());
        MqttConnectOptions o = new MqttConnectOptions();
        o.setServerURIs(serwery);
        c.connect(o);
        for (String t : new String[] {"role", "czas", "wiadomosc", "gracz/1", "gracz/3", "gracz/7"}) c.publish(temat + t, new byte[0], 1, true);
        c.disconnect();
        c.close();
        System.out.println(bledy == 0 ? "[Android] WSZYSTKO OK" : "[Android] BŁĘDÓW: " + bledy);
        System.exit(bledy == 0 ? 0 : 1);
    }
}
