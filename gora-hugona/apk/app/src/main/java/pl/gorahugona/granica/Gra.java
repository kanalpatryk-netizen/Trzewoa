package pl.gorahugona.granica;

import org.eclipse.paho.client.mqttv3.IMqttActionListener;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.IMqttToken;
import org.eclipse.paho.client.mqttv3.MqttAsyncClient;
import org.eclipse.paho.client.mqttv3.MqttCallbackExtended;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.security.SecureRandom;
import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Gra w chowanego przez sieć. Telefony wymieniają się wiadomościami przez publiczny serwer MQTT; treść jest
 * zaszyfrowana ({@link Szyfr}). Tematy pod {@link #TEMAT} (wszystkie zachowywane na serwerze, więc kto dołączy
 * później, od razu dostaje aktualny stan):
 * <ul>
 *   <li>{@code gracz/<n>} — ostatnia pozycja gracza n (1–6 gracze, 7 mistrz gry);</li>
 *   <li>{@code role} — kto szuka, kto się chowa (ustawia tylko mistrz gry);</li>
 *   <li>{@code czas} — kiedy kończy się gra (ustawia mistrz albo szukający);</li>
 *   <li>{@code wiadomosc} — ostatnie powiadomienie (wysyła mistrz albo szukający).</li>
 * </ul>
 * Poza tym {@code glos/<n>} — krótkofalówka szukających ({@link Radio}): pakiety głosu na żywo, niezachowywane
 * na serwerze i niewysyłane później (stary głos jest bez sensu); słyszą je tylko inni szukający.
 * Kto kogo widzi na mapie: mistrz gry — wszystkich; szukający — innych szukających; chowający się — nikogo.
 * Klasa jest w czystej Javie (bez Androida), żeby dało się ją sprawdzić na zwykłej JVM — patrz gora-hugona/test.
 */
final class Gra implements MqttCallbackExtended {
    /** Publiczny serwer MQTT; zapasowo bez TLS — treść i tak jest zaszyfrowana. (Bez WebSocketów: Paho używa w nich
     *  java.util.prefs, z którym na Androidzie bywa różnie.) */
    static final String[] SERWERY = {"ssl://broker.hivemq.com:8883", "tcp://broker.hivemq.com:1883"};
    static final String TEMAT = "gorahugona/3bb33ac48e2c89ff/";
    static final int MISTRZ = 7;
    static final String SZUKA = "szuka", CHOWA = "chowa";
    /** Własna pozycja idzie nie częściej niż co tyle ms (wyjście za granicę i powrót — od razu). */
    static final long CO_ILE_POZYCJA = 3000;
    /** Zachowana na serwerze wiadomość starsza niż tyle ms nie wyskakuje już jako powiadomienie. */
    static final long STARA_WIADOMOSC = 120000;

    interface Sluchacz {
        /** Zmieniło się połączenie, pozycje, role albo czas. Wołane z wątku sieci. */
        void zmiana();

        /** Wiadomość do mnie od gracza {@code od} (7 = mistrz gry). Wołane z wątku sieci. */
        void wiadomosc(int od, String tekst);

        /** Czas gry właśnie minął. Wołane z wątku, który woła {@link #sprawdzCzas}. */
        void koniecCzasu();

        /** Pakiet krótkofalówki od innego szukającego ({@link Radio}). Wołane z wątku sieci. */
        void glos(int od, byte[] pakiet);
    }

    private static final class Zalegla {
        final String temat;
        final byte[] tresc;
        final int qos;

        Zalegla(String temat, byte[] tresc, int qos) {
            this.temat = temat;
            this.tresc = tresc;
            this.qos = qos;
        }
    }

    private static final SecureRandom LOS = new SecureRandom();

    private final int ja;
    private final String[] serwery;
    private final String temat;
    private final Sluchacz sluchacz;
    private final MqttAsyncClient klient;
    private final ScheduledExecutorService planista = Executors.newSingleThreadScheduledExecutor();
    /** Do wysłania po (ponownym) połączeniu: temat → ostatnia treść (wiadomości — każda osobno). */
    private final Map<String, Zalegla> czeka = new LinkedHashMap<>();

    private final String[] role = new String[MISTRZ + 1];
    private final JSONObject[] pozycje = new JSONObject[MISTRZ + 1];
    private final Set<String> widziane = new HashSet<>();
    private final ArrayDeque<JSONObject> historia = new ArrayDeque<>();
    private long koniec, ogloszonyKoniec, ostatniaPozycja;
    private int czasOd, proba;
    private boolean ostatnioPoza;
    private volatile boolean polaczony, zamkniety;

    Gra(int ja, Sluchacz sluchacz) throws MqttException {
        this(ja, SERWERY, TEMAT, sluchacz);
    }

    Gra(int ja, String[] serwery, String temat, Sluchacz sluchacz) throws MqttException {
        this.ja = ja;
        this.serwery = serwery;
        this.temat = temat;
        this.sluchacz = sluchacz;
        for (int n = 1; n < MISTRZ; n++) role[n] = "";
        String id = "gh" + ja + "-" + Long.toHexString(LOS.nextLong());
        klient = new MqttAsyncClient(serwery[0], id, new MemoryPersistence());
        klient.setCallback(this);
    }

    // ---- połączenie ----

    void polacz() {
        zaplanuj(this::probuj);
    }

    private void zaplanuj(Runnable r) {
        try {
            planista.execute(r);
        } catch (RuntimeException ignored) {
            // gra już zamknięta
        }
    }

    private void probuj() {
        if (zamkniety) return;
        MqttConnectOptions o = new MqttConnectOptions();
        o.setServerURIs(serwery);
        o.setAutomaticReconnect(true);                      // po zerwaniu wznawia się samo
        o.setCleanSession(true);
        o.setKeepAliveInterval(30);
        o.setConnectionTimeout(15);
        o.setMaxInflight(100);
        try {
            klient.connect(o, null, new IMqttActionListener() {
                @Override
                public void onSuccess(IMqttToken t) {
                    proba = 0;
                }

                @Override
                public void onFailure(IMqttToken t, Throwable e) {
                    ponowPozniej();                         // pierwsze połączenie samo się nie wznawia
                }
            });
        } catch (MqttException | RuntimeException e) {
            ponowPozniej();
        }
    }

    private void ponowPozniej() {
        if (zamkniety) return;
        long s = Math.min(60, 5L << Math.min(proba++, 4));  // 5, 10, 20, 40, 60, 60… s
        try {
            planista.schedule(this::probuj, s, TimeUnit.SECONDS);
        } catch (RuntimeException ignored) {
            // planista już zamknięty
        }
    }

    boolean polaczony() {
        return polaczony;
    }

    int ja() {
        return ja;
    }

    @Override
    public void connectComplete(boolean ponownie, String serwer) {
        polaczony = true;
        try {
            klient.subscribe(temat + "#", 1);
        } catch (MqttException | RuntimeException ignored) {
            // spróbujemy przy następnym połączeniu
        }
        zaplanuj(this::wyslijZalegle);
        sluchacz.zmiana();
    }

    @Override
    public void connectionLost(Throwable przyczyna) {
        polaczony = false;
        sluchacz.zmiana();
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken t) {
    }

    /** Kończy grę na tym telefonie: zostawia ostatnią pozycję z dopiskiem „wyłączony” i rozłącza się. */
    void zamknij() {
        zamkniety = true;
        JSONObject ost = null;
        synchronized (this) {
            if (pozycje[ja] != null) {
                try {
                    ost = new JSONObject(pozycje[ja].toString()).put("aktywny", false).put("t", System.currentTimeMillis());
                } catch (JSONException ignored) {
                }
            }
        }
        final JSONObject ostatnia = ost;
        try {
            planista.execute(() -> {
                try {
                    if (ostatnia != null && polaczony) {
                        MqttMessage m = new MqttMessage(Szyfr.zaszyfruj(ostatnia.toString()));
                        m.setQos(1);
                        m.setRetained(true);
                        klient.publish(temat + "gracz/" + ja, m).waitForCompletion(3000);
                    }
                } catch (Exception ignored) {
                }
                try {
                    klient.disconnectForcibly(500, 1500);
                } catch (Exception ignored) {
                }
                try {
                    klient.close(true);
                } catch (Exception ignored) {
                }
                planista.shutdown();
            });
        } catch (RuntimeException e) {
            planista.shutdownNow();
        }
    }

    // ---- wysyłanie ----

    /** Moja pozycja; {@code poza} = trwa alarm granicy. */
    void pozycja(double szer, double dl, float dokl, boolean poza) {
        long teraz = System.currentTimeMillis();
        JSONObject j;
        synchronized (this) {
            if (teraz - ostatniaPozycja < CO_ILE_POZYCJA && poza == ostatnioPoza) return;
            try {
                j = new JSONObject().put("n", ja).put("lat", zaokr(szer)).put("lon", zaokr(dl))
                    .put("dokl", Math.round(dokl)).put("poza", poza).put("t", teraz).put("aktywny", true);
            } catch (JSONException e) {
                return;
            }
            ostatniaPozycja = teraz;
            ostatnioPoza = poza;
            pozycje[ja] = j;
        }
        wyslij("gracz/" + ja, j, 0);
    }

    /** Mistrz gry ustala role: {"1":"szuka","2":"chowa",…}; brak albo coś innego = nie gra. */
    boolean ustawRole(String json) {
        if (ja != MISTRZ) return false;
        JSONObject w;
        synchronized (this) {
            try {
                JSONObject r = new JSONObject(json), czyste = new JSONObject();
                for (int n = 1; n < MISTRZ; n++) {
                    String v = poprawnaRola(r.optString(String.valueOf(n), ""));
                    role[n] = v;
                    czyste.put(String.valueOf(n), v);
                }
                w = new JSONObject().put("role", czyste).put("od", ja).put("t", System.currentTimeMillis());
            } catch (JSONException e) {
                return false;
            }
        }
        wyslij("role", w, 1);
        sluchacz.zmiana();
        return true;
    }

    /** Czas gry od teraz (0 — wyłącza odliczanie). */
    boolean ustawCzas(int minuty) {
        return ustawKoniec(minuty > 0 ? System.currentTimeMillis() + minuty * 60000L : 0);
    }

    boolean ustawKoniec(long k) {
        JSONObject w;
        synchronized (this) {
            if (!mozeSterowac()) return false;
            try {
                w = new JSONObject().put("koniec", Math.max(0, k)).put("od", ja).put("t", System.currentTimeMillis());
            } catch (JSONException e) {
                return false;
            }
            koniec = Math.max(0, k);
            czasOd = ja;
        }
        wyslij("czas", w, 1);
        sluchacz.zmiana();
        return true;
    }

    /** Powiadomienie: do „wszyscy”, „szukajacy”, „chowajacy” albo numeru gracza. */
    boolean wyslijWiadomosc(String doKogo, String tekst) {
        if (tekst == null || doKogo == null || !poprawnyAdresat(doKogo)) return false;
        tekst = tekst.trim();
        if (tekst.isEmpty()) return false;
        if (tekst.length() > 300) tekst = tekst.substring(0, 300);
        JSONObject w;
        synchronized (this) {
            if (!mozeSterowac()) return false;
            String id = Long.toHexString(LOS.nextLong());
            try {
                w = new JSONObject().put("id", id).put("od", ja).put("do", doKogo).put("tekst", tekst)
                    .put("t", System.currentTimeMillis());
            } catch (JSONException e) {
                return false;
            }
            widziane.add(id);
            dopiszDoHistorii(w);
        }
        wyslij("wiadomosc", w, 1);
        sluchacz.zmiana();
        return true;
    }

    private void wyslij(String co, JSONObject j, int qos) {
        byte[] b = Szyfr.zaszyfruj(j.toString());
        if (b == null) return;
        Zalegla z = new Zalegla(temat + co, b, qos);
        if (polaczony && opublikuj(z)) return;
        synchronized (czeka) {
            czeka.put(co.equals("wiadomosc") ? co + "/" + j.optString("id", "") : co, z);
        }
        if (polaczony) zaplanuj(this::wyslijZalegle);  // połączyło się w międzyczasie
    }

    private boolean opublikuj(Zalegla z) {
        try {
            MqttMessage m = new MqttMessage(z.tresc);
            m.setQos(z.qos);
            m.setRetained(true);
            klient.publish(z.temat, m);
            return true;
        } catch (MqttException | RuntimeException e) {
            return false;
        }
    }

    private void wyslijZalegle() {
        LinkedHashMap<String, Zalegla> kopia;
        synchronized (czeka) {
            kopia = new LinkedHashMap<>(czeka);
            czeka.clear();
        }
        for (Map.Entry<String, Zalegla> e : kopia.entrySet()) {
            if (!polaczony || !opublikuj(e.getValue())) {
                synchronized (czeka) {
                    if (!czeka.containsKey(e.getKey())) czeka.put(e.getKey(), e.getValue());
                }
            }
        }
    }

    // ---- krótkofalówka ----

    synchronized boolean mozeMowic() {
        return SZUKA.equals(role[ja]);
    }

    /** Pakiet głosu do innych szukających: od razu albo wcale (bez kolejki — spóźniony głos nikomu nie pomoże). */
    boolean glos(byte[] pakiet) {
        if (!mozeMowic() || !polaczony) return false;
        byte[] b = Szyfr.zaszyfruj(pakiet);
        if (b == null) return false;
        try {
            MqttMessage m = new MqttMessage(b);
            m.setQos(0);
            m.setRetained(false);
            klient.publish(temat + "glos/" + ja, m);
            return true;
        } catch (MqttException | RuntimeException e) {
            return false;
        }
    }

    private void odbierzGlos(String co, MqttMessage m) {
        int n;
        try {
            n = Integer.parseInt(co.substring("glos/".length()));
        } catch (NumberFormatException e) {
            return;
        }
        synchronized (this) {
            // tylko szukający słyszą szukających (sprawdzane przed odszyfrowaniem — reszta nie traci na to czasu)
            if (n == ja || n < 1 || n >= MISTRZ || !SZUKA.equals(role[ja]) || !SZUKA.equals(role[n])) return;
        }
        if (m.isRetained()) return;
        byte[] pakiet = Szyfr.odszyfrujBajty(m.getPayload());
        if (pakiet != null) sluchacz.glos(n, pakiet);
    }

    // ---- odbieranie ----

    @Override
    public void messageArrived(String t, MqttMessage m) {
        try {
            if (!t.startsWith(temat)) return;
            String co = t.substring(temat.length());
            if (co.startsWith("glos/")) odbierzGlos(co, m);
            else odbierz(co, m);
        } catch (Exception ignored) {
            // cudza albo uszkodzona wiadomość — wyjątek stąd rozłączyłby klienta
        }
    }

    private void odbierz(String co, MqttMessage m) throws JSONException {
        String tekst = Szyfr.odszyfruj(m.getPayload());
        if (tekst == null) return;
        JSONObject j = new JSONObject(tekst);
        int od = 0;
        String powiadom = null;
        synchronized (this) {
            if (co.startsWith("gracz/")) {
                int n = j.optInt("n");
                if (n < 1 || n > MISTRZ || !co.equals("gracz/" + n)) return;
                if (pozycje[n] != null && pozycje[n].optLong("t") > j.optLong("t")) return;  // mam nowszą
                pozycje[n] = j;
            } else if (co.equals("role")) {
                JSONObject r = j.optJSONObject("role");
                if (r == null) return;
                for (int n = 1; n < MISTRZ; n++) role[n] = poprawnaRola(r.optString(String.valueOf(n), ""));
            } else if (co.equals("czas")) {
                koniec = Math.max(0, j.optLong("koniec"));
                czasOd = j.optInt("od");
            } else if (co.equals("wiadomosc")) {
                String id = j.optString("id", "");
                if (id.isEmpty() || !widziane.add(id)) return;
                dopiszDoHistorii(j);
                long wiek = System.currentTimeMillis() - j.optLong("t");
                if (j.optInt("od") != ja && doMnie(j.optString("do", "wszyscy"))
                    && (!m.isRetained() || wiek < STARA_WIADOMOSC)) {
                    od = j.optInt("od");
                    powiadom = j.optString("tekst", "");
                }
            } else {
                return;
            }
        }
        if (powiadom != null) sluchacz.wiadomosc(od, powiadom);
        sluchacz.zmiana();
    }

    /** Woła usługa co parę sekund; gdy czas gry właśnie minął — {@link Sluchacz#koniecCzasu()} (raz). */
    void sprawdzCzas(long teraz) {
        boolean oglos = false;
        synchronized (this) {
            if (koniec > 0 && teraz >= koniec && ogloszonyKoniec != koniec) {
                ogloszonyKoniec = koniec;
                oglos = teraz - koniec < 60000;                 // nie ogłaszaj gry, która skończyła się dawno
            }
        }
        if (oglos) sluchacz.koniecCzasu();
    }

    // ---- stan dla mapy ----

    /** Stan gry dla strony; pozycje tylko tych graczy, których wolno mi widzieć. */
    synchronized JSONObject stan() {
        JSONObject s = new JSONObject();
        try {
            s.put("ja", ja).put("rola", rola(ja)).put("polaczony", polaczony).put("mozeSterowac", mozeSterowac())
                .put("koniec", koniec).put("czasOd", czasOd);
            JSONObject r = new JSONObject();
            for (int n = 1; n <= MISTRZ; n++) r.put(String.valueOf(n), rola(n));
            s.put("role", r);
            JSONArray g = new JSONArray();
            for (int n = 1; n <= MISTRZ; n++) {
                if (n == ja || pozycje[n] == null || !widzi(n)) continue;
                g.put(new JSONObject(pozycje[n].toString()).put("rola", rola(n)));
            }
            s.put("gracze", g);
            JSONArray w = new JSONArray();
            for (JSONObject m : historia) {
                if (ja == MISTRZ || m.optInt("od") == ja || doMnie(m.optString("do", "wszyscy"))) w.put(m);
            }
            s.put("wiadomosci", w);
        } catch (JSONException ignored) {
        }
        return s;
    }

    synchronized boolean mozeSterowac() {
        return ja == MISTRZ || SZUKA.equals(role[ja]);
    }

    private boolean widzi(int n) {
        if (ja == MISTRZ) return true;
        return SZUKA.equals(role[ja]) && SZUKA.equals(role[n]);
    }

    private String rola(int n) {
        return n == MISTRZ ? "mistrz" : role[n];
    }

    private boolean doMnie(String doKogo) {
        switch (doKogo) {
            case "wszyscy":
                return true;
            case "szukajacy":
                return SZUKA.equals(role[ja]);
            case "chowajacy":
                return CHOWA.equals(role[ja]);
            default:
                try {
                    return Integer.parseInt(doKogo) == ja;
                } catch (NumberFormatException e) {
                    return false;
                }
        }
    }

    private void dopiszDoHistorii(JSONObject w) {
        historia.addLast(w);
        while (historia.size() > 10) historia.removeFirst();
    }

    private static boolean poprawnyAdresat(String d) {
        if (d.equals("wszyscy") || d.equals("szukajacy") || d.equals("chowajacy")) return true;
        try {
            int n = Integer.parseInt(d);
            return n >= 1 && n <= MISTRZ;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private static String poprawnaRola(String r) {
        return SZUKA.equals(r) || CHOWA.equals(r) ? r : "";
    }

    private static double zaokr(double v) {
        return Math.round(v * 1e6) / 1e6;
    }
}
