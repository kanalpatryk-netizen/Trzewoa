package pl.gorahugona.granica;

import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BooleanSupplier;

/**
 * Sprawdza sieć gry (Gra.java + Szyfr.java) na prawdziwym serwerze MQTT: kilka „telefonów” w jednym procesie.
 * Uruchamianie (jary Paho i org.json w lib/):
 *   javac -cp 'lib/*' -d out apk/app/src/main/java/pl/gorahugona/granica/{Gra,Szyfr}.java test/TestGry.java
 *   java -cp 'out:lib/*' pl.gorahugona.granica.TestGry ssl://broker.hivemq.com:8883
 * Każde uruchomienie używa własnego, losowego tematu — nie miesza się z prawdziwą grą.
 */
public class TestGry {
    private static int bledy;

    private static void sprawdz(boolean w, String opis) {
        System.out.println((w ? "OK    " : "BŁĄD  ") + opis);
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

    private static final class Zapis implements Gra.Sluchacz {
        final List<String> wiadomosci = Collections.synchronizedList(new ArrayList<>());
        final AtomicInteger konce = new AtomicInteger();

        @Override
        public void zmiana() {
        }

        @Override
        public void wiadomosc(int od, String tekst) {
            wiadomosci.add(od + ":" + tekst);
        }

        @Override
        public void koniecCzasu() {
            konce.incrementAndGet();
        }
    }

    private static String rola(Gra g) {
        return g.stan().optString("rola");
    }

    private static String rolaGracza(Gra g, int n) {
        return g.stan().getJSONObject("role").optString(String.valueOf(n));
    }

    private static Set<Integer> widzi(Gra g) {
        Set<Integer> s = new HashSet<>();
        JSONArray a = g.stan().getJSONArray("gracze");
        for (int i = 0; i < a.length(); i++) s.add(a.getJSONObject(i).getInt("n"));
        return s;
    }

    private static JSONObject gracz(Gra g, int n) {
        JSONArray a = g.stan().getJSONArray("gracze");
        for (int i = 0; i < a.length(); i++) if (a.getJSONObject(i).getInt("n") == n) return a.getJSONObject(i);
        return null;
    }

    private static long koniec(Gra g) {
        return g.stan().optLong("koniec");
    }

    public static void main(String[] arg) throws Exception {
        String[] serwery = arg[0].split(",");
        String temat = "gorahugona-test/" + Long.toHexString(new SecureRandom().nextLong()) + "/";
        System.out.println("Serwer: " + String.join(", ", serwery) + "  temat: " + temat);

        // surowy podgląd serwera — tak widzi grę ktoś obcy, kto zna temat
        List<byte[]> surowe = Collections.synchronizedList(new ArrayList<>());
        MqttClient podglad = new MqttClient(serwery[0], "ghtest-" + Long.toHexString(new SecureRandom().nextLong()).substring(0, 8), new MemoryPersistence());
        MqttConnectOptions o = new MqttConnectOptions();
        o.setServerURIs(serwery);
        podglad.connect(o);
        podglad.subscribe(temat + "#", 1, (t, m) -> surowe.add(m.getPayload()));

        Zapis zm = new Zapis(), z1 = new Zapis(), z2 = new Zapis(), z3 = new Zapis();
        Gra mistrz = new Gra(7, serwery, temat, zm), s1 = new Gra(1, serwery, temat, z1),
            s2 = new Gra(2, serwery, temat, z2), ch = new Gra(3, serwery, temat, z3);
        Gra[] wszyscy = {mistrz, s1, s2, ch};
        for (Gra g : wszyscy) g.polacz();
        sprawdz(czekaj(() -> mistrz.polaczony() && s1.polaczony() && s2.polaczony() && ch.polaczony(), 30000),
            "4 telefony połączone z serwerem");

        // role
        sprawdz(!ch.ustawRole("{\"1\":\"szuka\"}"), "gracz 3 nie może ustawiać ról");
        sprawdz(mistrz.ustawRole("{\"1\":\"szuka\",\"2\":\"szuka\",\"3\":\"chowa\",\"4\":\"zle\"}"), "mistrz ustawia role");
        sprawdz(czekaj(() -> rola(s1).equals("szuka") && rola(s2).equals("szuka") && rola(ch).equals("chowa"), 10000),
            "role dotarły do graczy (1, 2 szukają, 3 się chowa)");
        sprawdz(rolaGracza(mistrz, 4).isEmpty() && rolaGracza(mistrz, 7).equals("mistrz"), "nieznana rola = nie gra; 7 = mistrz");

        // pozycje i widoczność
        mistrz.pozycja(50.27750, 18.91600, 5, false);
        s1.pozycja(50.27760, 18.91610, 5, false);
        s2.pozycja(50.27770, 18.91620, 6, false);
        ch.pozycja(50.27800, 18.91700, 8, true);
        sprawdz(czekaj(() -> widzi(mistrz).equals(Set.of(1, 2, 3)), 10000), "mistrz widzi graczy 1, 2 i 3");
        sprawdz(czekaj(() -> widzi(s1).equals(Set.of(2)), 10000), "szukający 1 widzi tylko szukającego 2");
        sprawdz(czekaj(() -> widzi(s2).equals(Set.of(1)), 10000), "szukający 2 widzi tylko szukającego 1");
        Thread.sleep(1500);
        sprawdz(widzi(ch).isEmpty(), "chowający się nie widzi nikogo");
        JSONObject p3 = gracz(mistrz, 3);
        sprawdz(p3 != null && Math.abs(p3.getDouble("lat") - 50.278) < 1e-6 && p3.getBoolean("poza") && p3.getString("rola").equals("chowa"),
            "mistrz zna pozycję, rolę i „poza granicą” gracza 3");

        // czas gry
        sprawdz(!ch.ustawCzas(10), "chowający się nie ustawia czasu");
        sprawdz(s1.ustawCzas(15), "szukający ustawia czas 15 min");
        long k = koniec(s1);
        sprawdz(Math.abs(k - (System.currentTimeMillis() + 15 * 60000L)) < 5000, "koniec za 15 min");
        sprawdz(czekaj(() -> koniec(mistrz) == k && koniec(s2) == k && koniec(ch) == k, 10000), "czas dotarł do wszystkich");

        // powiadomienia
        sprawdz(mistrz.wyslijWiadomosc("wszyscy", "Start!"), "mistrz wysyła do wszystkich");
        sprawdz(czekaj(() -> z1.wiadomosci.contains("7:Start!") && z2.wiadomosci.contains("7:Start!") && z3.wiadomosci.contains("7:Start!"), 10000),
            "„do wszystkich” dotarło do 1, 2 i 3");
        sprawdz(zm.wiadomosci.isEmpty(), "nadawca nie dostaje własnego powiadomienia");
        sprawdz(s1.wyslijWiadomosc("chowajacy", "Szukamy!"), "szukający wysyła do chowających się");
        sprawdz(czekaj(() -> z3.wiadomosci.contains("1:Szukamy!"), 10000), "„do chowających” dostał gracz 3");
        sprawdz(mistrz.wyslijWiadomosc("2", "Tylko do 2"), "mistrz wysyła do gracza 2");
        sprawdz(czekaj(() -> z2.wiadomosci.contains("7:Tylko do 2"), 10000), "„do gracza 2” dostał gracz 2");
        Thread.sleep(1500);
        sprawdz(!z2.wiadomosci.contains("1:Szukamy!") && !z1.wiadomosci.contains("7:Tylko do 2") && !z3.wiadomosci.contains("7:Tylko do 2"),
            "inni nie dostali cudzych powiadomień");
        sprawdz(!ch.wyslijWiadomosc("wszyscy", "hej") && !s1.wyslijWiadomosc("nikt", "hej"),
            "chowający się nie wysyła; zły adresat odrzucony");
        sprawdz(mistrz.stan().getJSONArray("wiadomosci").length() == 3 && ch.stan().getJSONArray("wiadomosci").length() == 2,
            "historia: mistrz widzi 3 wiadomości, gracz 3 swoje 2");

        // telefon włączony później (drugi telefon mistrza) dostaje zachowany stan
        Zapis zp = new Zapis();
        Gra pozny = new Gra(7, serwery, temat, zp);
        pozny.polacz();
        sprawdz(czekaj(() -> pozny.polaczony() && widzi(pozny).equals(Set.of(1, 2, 3)) && koniec(pozny) == k
            && rolaGracza(pozny, 1).equals("szuka") && rolaGracza(pozny, 3).equals("chowa"), 20000),
            "telefon włączony później dostaje role, czas i pozycje");
        Thread.sleep(1500);
        sprawdz(zp.wiadomosci.isEmpty(), "…i nie dostaje cudzej zachowanej wiadomości");

        // koniec czasu — raz u każdego
        sprawdz(mistrz.ustawKoniec(System.currentTimeMillis() + 1500), "mistrz skraca czas do 1,5 s");
        long k2 = koniec(mistrz);
        sprawdz(czekaj(() -> koniec(s1) == k2 && koniec(s2) == k2 && koniec(ch) == k2, 10000), "nowy czas dotarł");
        Thread.sleep(2000);
        for (int i = 0; i < 3; i++) for (Gra g : wszyscy) g.sprawdzCzas(System.currentTimeMillis());
        sprawdz(zm.konce.get() == 1 && z1.konce.get() == 1 && z2.konce.get() == 1 && z3.konce.get() == 1,
            "koniec czasu ogłoszony raz u każdego");

        // wyłączenie gracza
        ch.zamknij();
        sprawdz(czekaj(() -> {
            JSONObject g3 = gracz(mistrz, 3);
            return g3 != null && !g3.getBoolean("aktywny");
        }, 10000), "mistrz widzi, że gracz 3 wyłączył grę");

        // szyfrowanie
        Thread.sleep(500);
        boolean jawne = false;
        synchronized (surowe) {
            for (byte[] b : surowe) {
                String t = new String(b, StandardCharsets.ISO_8859_1);
                if (t.contains("lat") || t.contains("Start") || t.contains("szuka")) jawne = true;
            }
        }
        sprawdz(surowe.size() >= 8 && !jawne, "serwer widzi tylko szyfr (" + surowe.size() + " wiadomości, żadna jawna)");
        sprawdz(Szyfr.odszyfruj(new byte[40]) == null && Szyfr.odszyfruj("{\"lat\":1}".getBytes()) == null,
            "obce i uszkodzone wiadomości są pomijane");

        // sprzątanie: rozłącz „telefony”, potem usuń zachowane wiadomości testu z serwera
        for (Gra g : new Gra[] {mistrz, s1, s2, pozny}) g.zamknij();
        Thread.sleep(2500);
        for (String t : new String[] {"role", "czas", "wiadomosc", "gracz/1", "gracz/2", "gracz/3", "gracz/7"}) {
            podglad.publish(temat + t, new byte[0], 1, true);
        }
        podglad.disconnect();
        podglad.close();
        System.out.println(bledy == 0 ? "WSZYSTKO OK" : "BŁĘDÓW: " + bledy);
        System.exit(bledy == 0 ? 0 : 1);
    }
}
