package pl.trzewia.gra;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Trzewia na Androida: jedno okno z WebView, w którym działa ta sama gra, co w przeglądarce
 * (plik assets/index.html = android/trzewia.html). Aplikacja dokłada to, czego strona sama
 * nie umie: prawdziwy pełny ekran bez pasków systemu, ekran, który nie gaśnie, i przycisk
 * „wstecz” przekazany grze (gra trzyma własne wpisy historii — patrz src/core/android.ts).
 */
public class Gra extends Activity {
    private WebView widok;

    @Override
    protected void onCreate(Bundle stan) {
        super.onCreate(stan);
        Window okno = getWindow();
        okno.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            okno.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        widok = new WebView(this);
        widok.setBackgroundColor(Color.rgb(13, 9, 8));
        WebSettings u = widok.getSettings();
        u.setJavaScriptEnabled(true);
        u.setDomStorageEnabled(true);                       // zapis gry i ustawienia (localStorage)
        u.setMediaPlaybackRequiresUserGesture(false);       // dźwięk po pierwszym dotknięciu
        u.setAllowFileAccess(true);
        u.setSupportZoom(false);
        u.setBuiltInZoomControls(false);
        u.setUseWideViewPort(true);
        u.setLoadWithOverviewMode(true);
        u.setTextZoom(100);                                 // systemowe powiększenie tekstu nie rozsadza ryciny
        widok.setVerticalScrollBarEnabled(false);
        widok.setHorizontalScrollBarEnabled(false);
        widok.setOverScrollMode(View.OVER_SCROLL_NEVER);
        widok.setWebViewClient(new WebViewClient());
        widok.setWebChromeClient(new WebChromeClient());
        setContentView(widok);

        if (stan != null) widok.restoreState(stan);
        else widok.loadUrl("file:///android_asset/index.html");
        pelnyEkran();
    }

    /** Bez paska stanu i nawigacji; machnięcie od krawędzi pokazuje je na chwilę. */
    private void pelnyEkran() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean fokus) {
        super.onWindowFocusChanged(fokus);
        if (fokus) pelnyEkran();
    }

    /**
     * „Wstecz”: gra dopisuje wpis do historii, gdy ma co zamknąć (ryt, kartę, atlas, menu).
     * Póki taki wpis jest, cofnięcie trafia do gry; w menu go nie ma — wtedy aplikacja się zamyka.
     */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (widok != null && widok.canGoBack()) widok.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (widok != null) widok.onPause();                // gra w tle nie gra i nie grzeje telefonu
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (widok != null) widok.onResume();
        pelnyEkran();
    }

    @Override
    protected void onSaveInstanceState(Bundle stan) {
        super.onSaveInstanceState(stan);
        if (widok != null) widok.saveState(stan);
    }

    @Override
    protected void onDestroy() {
        if (widok != null) widok.destroy();
        super.onDestroy();
    }
}
