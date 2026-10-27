package pl.gorahugona.granica;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;
import java.util.List;

/**
 * Okno z mapą (assets = gora-hugona/www, ta sama strona co w przeglądarce). Strona rozpoznaje
 * aplikację po obiekcie {@code HugonAndroid} i zamiast GPS przeglądarki używa usługi {@link Straz},
 * która pilnuje granicy także przy zgaszonym ekranie i prowadzi grę ({@link Gra}).
 * Stan wraca na stronę przez {@code hugonStan(…)}.
 */
public class Mapa extends Activity {
    private static final int PROSBA_ZGODY = 7, PROSBA_MIKROFONU = 8;

    private WebView widok;
    private Straz.Sluchacz sluchacz;
    private final Handler watek = new Handler(Looper.getMainLooper());
    private String czekaGranica, czekaUstawienia;

    @Override
    protected void onCreate(Bundle stan) {
        super.onCreate(stan);
        widok = new WebView(this);
        widok.setBackgroundColor(Color.rgb(19, 32, 26));
        WebSettings u = widok.getSettings();
        u.setJavaScriptEnabled(true);
        u.setDomStorageEnabled(true);                       // granica i ustawienia (localStorage)
        u.setAllowFileAccess(true);
        u.setMediaPlaybackRequiresUserGesture(false);
        u.setTextZoom(100);
        u.setUserAgentString(u.getUserAgentString() + " GoraHugona/1.0"); // serwery map chcą wiedzieć, kto pyta
        widok.setOverScrollMode(View.OVER_SCROLL_NEVER);
        widok.setWebViewClient(new WebViewClient());
        widok.setWebChromeClient(new WebChromeClient());
        widok.addJavascriptInterface(new Most(), "HugonAndroid");
        setContentView(widok);
        widok.loadUrl("file:///android_asset/index.html");

        sluchacz = json -> {
            if (widok != null) widok.evaluateJavascript("window.hugonStan&&hugonStan(" + json + ")", null);
        };
        Straz.sluchacz = sluchacz;
    }

    /** Most dla strony; metody wołane z wątku WebView — wszystko przekładamy na główny. */
    private class Most {
        @JavascriptInterface
        public void start(String granica, String ustawienia) {
            watek.post(() -> zacznij(granica, ustawienia));
        }

        @JavascriptInterface
        public void ustaw(String granica, String ustawienia) {
            watek.post(() -> {
                if (!Straz.dziala) return;
                Intent i = new Intent(Mapa.this, Straz.class).setAction(Straz.USTAW)
                    .putExtra("granica", granica).putExtra("ustawienia", ustawienia);
                startService(i);
            });
        }

        @JavascriptInterface
        public void stop() {
            watek.post(() -> startService(new Intent(Mapa.this, Straz.class).setAction(Straz.STOP)));
        }

        @JavascriptInterface
        public void wycisz(int sekundy) {
            watek.post(() -> startService(new Intent(Mapa.this, Straz.class).setAction(Straz.WYCISZ).putExtra("sekundy", sekundy)));
        }

        @JavascriptInterface
        public boolean dziala() {
            return Straz.dziala;
        }

        @JavascriptInterface
        public String stan() {
            return Straz.ostatniStan;
        }

        @JavascriptInterface
        public void testAlarmu() {
            watek.post(() -> {
                if (!Dzwiek.test(Mapa.this)) return;
                watek.postDelayed(() -> Dzwiek.koniecTestu(Mapa.this), 3000);
            });
        }

        @JavascriptInterface
        public void testOstrzezenia() {
            watek.post(() -> Dzwiek.pisk(Mapa.this, true));
        }

        @JavascriptInterface
        public void baterie() {
            watek.post(() -> otworzBaterie(true));
        }

        @JavascriptInterface
        public void lokalizacja() {
            watek.post(() -> {
                try {
                    startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
                } catch (RuntimeException ignored) {
                }
            });
        }

        // ---- gra (działa, gdy pilnowanie trwa i gracz jest zalogowany) ----

        /** Krótkofalówka: wciśnięty przycisk MÓW. „zgoda” — właśnie pytamy o mikrofon (trzeba wcisnąć jeszcze raz). */
        @JavascriptInterface
        public String mowStart() {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                watek.post(() -> requestPermissions(new String[] {Manifest.permission.RECORD_AUDIO}, PROSBA_MIKROFONU));
                return "zgoda";
            }
            return Nadajnik.start();
        }

        @JavascriptInterface
        public void mowStop() {
            Nadajnik.stop();
        }

        @JavascriptInterface
        public boolean ustawRole(String json) {
            Gra g = Straz.gra;
            return g != null && g.ustawRole(json);
        }

        @JavascriptInterface
        public boolean ustawCzas(int minuty) {
            Gra g = Straz.gra;
            return g != null && g.ustawCzas(minuty);
        }

        @JavascriptInterface
        public boolean wyslij(String doKogo, String tekst) {
            Gra g = Straz.gra;
            return g != null && g.wyslijWiadomosc(doKogo, tekst);
        }

        @JavascriptInterface
        public boolean bezOszczedzania() {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            return pm == null || pm.isIgnoringBatteryOptimizations(getPackageName());
        }
    }

    private void zacznij(String granica, String ustawienia) {
        List<String> brak = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            brak.add(Manifest.permission.ACCESS_FINE_LOCATION);
            brak.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (Build.VERSION.SDK_INT >= 33
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            brak.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!brak.isEmpty()) {
            czekaGranica = granica;
            czekaUstawienia = ustawienia;
            requestPermissions(brak.toArray(new String[0]), PROSBA_ZGODY);
            return;
        }
        uruchomStraz(granica, ustawienia);
    }

    @Override
    public void onRequestPermissionsResult(int nr, String[] zgody, int[] wyniki) {
        super.onRequestPermissionsResult(nr, zgody, wyniki);
        if (nr == PROSBA_MIKROFONU) {
            boolean jest = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
            blad(jest ? "mikrofon-ok" : "mikrofon-brak");
            return;
        }
        if (nr != PROSBA_ZGODY || czekaGranica == null) return;
        boolean dokladna = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean przyblizona = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (dokladna) {
            uruchomStraz(czekaGranica, czekaUstawienia);
        } else {
            blad(przyblizona ? "przyblizona" : "brak-zgody");
        }
        czekaGranica = null;
        czekaUstawienia = null;
    }

    private void uruchomStraz(String granica, String ustawienia) {
        Intent i = new Intent(this, Straz.class).setAction(Straz.START)
            .putExtra("granica", granica).putExtra("ustawienia", ustawienia);
        try {
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(i);
            else startService(i);
        } catch (RuntimeException e) {
            blad("usluga");
            return;
        }
        // raz zapytaj o wyłączenie oszczędzania baterii — bez tego część telefonów usypia pilnowanie
        SharedPreferences p = getSharedPreferences("mapa", MODE_PRIVATE);
        if (!p.getBoolean("pytanoOBaterie", false)) {
            p.edit().putBoolean("pytanoOBaterie", true).apply();
            watek.postDelayed(() -> otworzBaterie(false), 1500);
        }
    }

    private void otworzBaterie(boolean zawsze) {
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm == null) return;
        try {
            if (!pm.isIgnoringBatteryOptimizations(getPackageName())) {
                startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:" + getPackageName())));
            } else if (zawsze) {
                startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
            }
        } catch (RuntimeException ignored) {
        }
    }

    private void blad(String kod) {
        if (widok != null) widok.evaluateJavascript("window.hugonBlad&&hugonBlad('" + kod + "')", null);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // strona zamyka swoje panele; gdy nie ma czego zamknąć — aplikacja chowa się (pilnowanie trwa)
        if (widok == null) {
            super.onBackPressed();
            return;
        }
        widok.evaluateJavascript("window.hugonWstecz?hugonWstecz():false", wynik -> {
            if (!"true".equals(wynik)) moveTaskToBack(true);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (widok != null) {
            widok.onResume();
            if (Straz.ostatniStan != null) widok.evaluateJavascript("window.hugonStan&&hugonStan(" + Straz.ostatniStan + ")", null);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        Nadajnik.stop();                                    // krótkofalówka nadaje tylko przy otwartej aplikacji
        if (widok != null) widok.onPause();
    }

    @Override
    protected void onDestroy() {
        if (Straz.sluchacz == sluchacz) Straz.sluchacz = null;
        if (widok != null) widok.destroy();
        widok = null;
        super.onDestroy();
    }
}
