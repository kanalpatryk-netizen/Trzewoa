package pl.gorahugona.granica;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Strażnik granicy: usługa na pierwszym planie, która co sekundę bierze pozycję z GPS,
 * sprawdza, czy telefon jest w obszarze, i podnosi alarm (syrena + wibracje + powiadomienie),
 * gdy z niego wyjdzie. Działa przy zgaszonym ekranie i po zamknięciu okna mapy;
 * kończy ją dopiero „Stop” (w aplikacji albo w powiadomieniu).
 */
public class Straz extends Service implements LocationListener {
    static final String START = "start", USTAW = "ustaw", STOP = "stop", WYCISZ = "wycisz";
    private static final String KANAL_STRAZ = "straz", KANAL_ALARM = "alarm";
    private static final int NR_STRAZ = 1, NR_ALARM = 2;

    /** Pomiar gorszy niż tyle metrów rozstrzyga tylko, gdy odległość od granicy jest większa niż jego błąd. */
    private static final float DOKLADNOSC = 35;
    /** Tyle kolejnych pewnych pomiarów poza granicą włącza alarm (odsiewa pojedyncze skoki GPS). */
    private static final int POZA_RAZY = 2;
    /** Bez nowej pozycji przez tyle ms — „brak sygnału GPS”. */
    private static final long CISZA_GPS = 20000;

    /** Okno mapy słucha stanu (ten sam proces, wołane na głównym wątku). */
    interface Sluchacz {
        void stan(String json);
    }

    static Sluchacz sluchacz;
    static volatile boolean dziala;
    static volatile String ostatniStan;

    private final Handler watek = new Handler(Looper.getMainLooper());
    private LocationManager lm;
    private PowerManager.WakeLock blokada;
    private NotificationManager nm;

    private Granica granica;
    private double strefa = 15;
    private boolean wibracje = true, ostrzegaj = true;

    private Location pozycja;
    private boolean wewnatrz = true, blisko, alarm, gpsWylaczony;
    private double odleglosc = -1;
    private int pozaRazy;
    private long wyciszonyDo, ostatniGps, ostatniPomiar, ostatnieOdswiezenie;
    private String ostatniTekst = "";

    private final Runnable tik = new Runnable() {
        @Override
        public void run() {
            if (!dziala) return;
            if (alarm && wyciszonyDo != 0 && SystemClock.elapsedRealtime() >= wyciszonyDo) {
                wyciszonyDo = 0;
                Dzwiek.syrena(Straz.this, wibracje);
                pokazAlarm();
            }
            nadaj();
            watek.postDelayed(this, 2000);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel k = new NotificationChannel(KANAL_STRAZ, "Pilnowanie granicy", NotificationManager.IMPORTANCE_LOW);
            k.setDescription("Stałe powiadomienie, gdy aplikacja pilnuje granicy");
            k.setShowBadge(false);
            nm.createNotificationChannel(k);
            NotificationChannel a = new NotificationChannel(KANAL_ALARM, "Alarm: poza granicą", NotificationManager.IMPORTANCE_HIGH);
            a.setDescription("Wyskakuje, gdy wyjdziesz poza obszar (syrenę gra sama aplikacja)");
            a.setSound(null, null);
            a.enableVibration(false);
            a.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(a);
        }
    }

    @Override
    public int onStartCommand(Intent i, int flagi, int nr) {
        String co = i != null ? i.getAction() : null;
        if (STOP.equals(co)) {
            zakoncz();
            return START_NOT_STICKY;
        }
        if (WYCISZ.equals(co)) {
            if (dziala) wycisz(i.getIntExtra("sekundy", 60));
            else stopSelf();
            return dziala ? START_STICKY : START_NOT_STICKY;
        }
        if (i != null && i.hasExtra("granica")) {
            zapisz(i.getStringExtra("granica"), i.getStringExtra("ustawienia"));
        }
        if (!wczytaj()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!dziala && !uruchom()) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (pozycja != null) ocen(pozycja);
        nadaj();
        return START_STICKY;
    }

    // ---- ustawienia (zapisane, żeby po wznowieniu przez system usługa wiedziała, czego pilnować) ----

    private SharedPreferences prefs() {
        return getSharedPreferences("straz", MODE_PRIVATE);
    }

    private void zapisz(String g, String u) {
        prefs().edit().putString("granica", g).putString("ustawienia", u != null ? u : "{}").apply();
    }

    private boolean wczytaj() {
        String g = prefs().getString("granica", null);
        if (g == null) return false;
        try {
            granica = new Granica(g);
            JSONObject u = new JSONObject(prefs().getString("ustawienia", "{}"));
            strefa = u.optDouble("strefa", 15);
            wibracje = u.optBoolean("wibracje", true);
            ostrzegaj = u.optBoolean("ostrzegaj", true);
            return true;
        } catch (JSONException e) {
            return false;
        }
    }

    // ---- start i koniec ----

    private boolean uruchom() {
        Notification n = powiadomienie("Pilnuję granicy", "Szukam sygnału GPS…", false);
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NR_STRAZ, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(NR_STRAZ, n);
        } catch (RuntimeException e) {
            return false;                                   // brak zgody na położenie
        }
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        try {
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, this, Looper.getMainLooper());
        } catch (SecurityException | IllegalArgumentException e) {
            stopForeground(true);
            return false;
        }
        try {
            if (lm.getAllProviders().contains(LocationManager.NETWORK_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 3000, 0, this, Looper.getMainLooper());
            }
        } catch (SecurityException | IllegalArgumentException ignored) {
        }
        gpsWylaczony = !lm.isProviderEnabled(LocationManager.GPS_PROVIDER);

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        blokada = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GoraHugona:straz");
        blokada.setReferenceCounted(false);
        blokada.acquire();

        dziala = true;
        pozaRazy = 0;
        alarm = false;
        blisko = false;
        wewnatrz = true;
        odleglosc = -1;
        pozycja = null;
        ostatniPomiar = SystemClock.elapsedRealtime();     // „brak sygnału” liczymy od startu
        watek.postDelayed(tik, 2000);
        return true;
    }

    private void zakoncz() {
        boolean byla = dziala;
        dziala = false;
        watek.removeCallbacks(tik);
        if (lm != null) lm.removeUpdates(this);
        Dzwiek.ucisz(this);
        if (blokada != null && blokada.isHeld()) blokada.release();
        nm.cancel(NR_ALARM);
        if (byla) stopForeground(true);
        alarm = false;
        nadaj();
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (dziala) zakoncz();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent i) {
        return null;
    }

    // ---- pozycja ----

    @Override
    public void onLocationChanged(Location l) {
        long teraz = SystemClock.elapsedRealtime();
        boolean gps = LocationManager.GPS_PROVIDER.equals(l.getProvider());
        if (gps) ostatniGps = teraz;
        else if (teraz - ostatniGps < 10000) return;      // jest świeży GPS — sieć tylko przeszkadza
        ostatniPomiar = teraz;
        pozycja = l;
        ocen(l);
        nadaj();
    }

    @Override
    public void onProviderEnabled(String p) {
        if (LocationManager.GPS_PROVIDER.equals(p)) {
            gpsWylaczony = false;
            nadaj();
        }
    }

    @Override
    public void onProviderDisabled(String p) {
        if (LocationManager.GPS_PROVIDER.equals(p)) {
            gpsWylaczony = true;
            nadaj();
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onStatusChanged(String p, int s, Bundle b) {
        // starsze Androidy wołają to bez domyślnej wersji w interfejsie — musi być
    }

    private void ocen(Location l) {
        double szer = l.getLatitude(), dl = l.getLongitude();
        boolean w = granica.wewnatrz(szer, dl);
        double d = granica.odleglosc(szer, dl);
        float blad = l.hasAccuracy() ? l.getAccuracy() : 99;
        wewnatrz = w;
        odleglosc = d;
        boolean pewny = blad <= DOKLADNOSC || d >= blad;
        if (!pewny) return;
        if (!w) {
            pozaRazy++;
            if (pozaRazy >= POZA_RAZY && !alarm) wlaczAlarm();
        } else {
            pozaRazy = 0;
            if (alarm) wylaczAlarm();
            if (d <= strefa) {
                if (!blisko && ostrzegaj) Dzwiek.pisk(this, wibracje);
                blisko = true;
            } else if (d > strefa + 5) {
                blisko = false;                             // 5 m zapasu, żeby nie piszczało na krawędzi strefy
            }
        }
    }

    private void wlaczAlarm() {
        alarm = true;
        blisko = false;
        wyciszonyDo = 0;
        Dzwiek.syrena(this, wibracje);
        pokazAlarm();
    }

    private void wylaczAlarm() {
        alarm = false;
        wyciszonyDo = 0;
        Dzwiek.ucisz(this);
        Dzwiek.powrot();
        nm.cancel(NR_ALARM);
    }

    private void wycisz(int sekundy) {
        if (!alarm) return;
        wyciszonyDo = SystemClock.elapsedRealtime() + sekundy * 1000L;
        Dzwiek.ucisz(this);
        nm.cancel(NR_ALARM);
        nadaj();
    }

    // ---- powiadomienia i stan dla mapy ----

    private void pokazAlarm() {
        String t = odleglosc >= 0 ? "Jesteś " + Math.round(odleglosc) + " m za granicą. Wróć do obszaru." : "Wróć do obszaru.";
        nm.notify(NR_ALARM, powiadomienie("POZA GRANICĄ!", t, true));
    }

    private void nadaj() {
        long teraz = SystemClock.elapsedRealtime();
        boolean brak = dziala && teraz - ostatniPomiar > CISZA_GPS;
        long wycisz = alarm && wyciszonyDo > teraz ? (wyciszonyDo - teraz + 999) / 1000 : 0;
        try {
            JSONObject s = new JSONObject();
            s.put("dziala", dziala);
            s.put("alarm", alarm);
            s.put("wyciszony", wycisz);
            s.put("brak", brak);
            s.put("gpsWylaczony", gpsWylaczony);
            if (pozycja != null) {
                s.put("lat", pozycja.getLatitude());
                s.put("lon", pozycja.getLongitude());
                s.put("dokl", pozycja.hasAccuracy() ? pozycja.getAccuracy() : JSONObject.NULL);
                s.put("kurs", pozycja.hasBearing() && pozycja.hasSpeed() && pozycja.getSpeed() > 0.6 ? pozycja.getBearing() : JSONObject.NULL);
                s.put("wiek", (SystemClock.elapsedRealtimeNanos() - pozycja.getElapsedRealtimeNanos()) / 1000000);
                s.put("wewnatrz", wewnatrz);
                s.put("odl", odleglosc);
            }
            ostatniStan = s.toString();
        } catch (JSONException ignored) {
        }
        if (sluchacz != null && ostatniStan != null) sluchacz.stan(ostatniStan);
        if (!dziala) return;

        String tekst;
        if (gpsWylaczony) tekst = "Włącz lokalizację (GPS) w telefonie!";
        else if (brak) tekst = "Brak sygnału GPS — nie wiem, gdzie jesteś";
        else if (pozycja == null || odleglosc < 0) tekst = "Szukam sygnału GPS…";
        else if (alarm && wycisz > 0) tekst = "POZA GRANICĄ (" + Math.round(odleglosc) + " m) — wyciszone na " + wycisz + " s";
        else if (alarm) tekst = "POZA GRANICĄ — " + Math.round(odleglosc) + " m za granicą";
        else if (!wewnatrz) tekst = "Chyba za granicą (" + Math.round(odleglosc) + " m) — sprawdzam";
        else if (blisko) tekst = "Blisko granicy — " + Math.round(odleglosc) + " m";
        else tekst = "W obszarze — do granicy " + Math.round(odleglosc) + " m";
        // powiadomienie odświeżamy przy zmianie treści, ale nie częściej niż co 3 s (limit systemu)
        if (!tekst.equals(ostatniTekst) && (teraz - ostatnieOdswiezenie > 3000 || alarm)) {
            ostatniTekst = tekst;
            ostatnieOdswiezenie = teraz;
            nm.notify(NR_STRAZ, powiadomienie("Pilnuję granicy · Góra Hugona", tekst, false));
        }
    }

    @SuppressWarnings("deprecation")
    private Notification powiadomienie(String tytul, String tekst, boolean alarmowe) {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, alarmowe ? KANAL_ALARM : KANAL_STRAZ)
            : new Notification.Builder(this);
        b.setSmallIcon(R.drawable.ic_powiadomienie)
            .setContentTitle(tytul)
            .setContentText(tekst)
            .setContentIntent(otworz())
            .setOngoing(true)
            .setShowWhen(false)
            .setColor(alarmowe ? 0xFFE5484D : 0xFF3FA36B)
            .setVisibility(Notification.VISIBILITY_PUBLIC);
        Icon ikona = Icon.createWithResource(this, R.drawable.ic_powiadomienie);
        if (alarmowe) {
            b.setCategory(Notification.CATEGORY_ALARM);
            b.addAction(new Notification.Action.Builder(ikona, "Wycisz na 1 min", akcja(WYCISZ, 12)).build());
            if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_MAX);
        } else {
            b.setOnlyAlertOnce(true);
            if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_LOW);
        }
        b.addAction(new Notification.Action.Builder(ikona, "Zakończ pilnowanie", akcja(STOP, 11)).build());
        return b.build();
    }

    private PendingIntent otworz() {
        Intent i = new Intent(this, Mapa.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(this, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private PendingIntent akcja(String co, int nr) {
        Intent i = new Intent(this, Straz.class).setAction(co);
        return PendingIntent.getService(this, nr, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
}
