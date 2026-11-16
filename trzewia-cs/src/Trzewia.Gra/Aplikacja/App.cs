using System;
using System.Collections.Generic;
using System.Linq;
// Port: alpha-1/src/app/app.ts
// Różnice (C#): zamiast requestAnimationFrame — pętla u gospodarza (Trzewia.exe: Program.cs, klatka co odświeżenie
// monitora); zamiast zdarzeń przeglądarki — zdarzenia od gospodarza (NaWskaznik, NaKolko, NaKlawisz); okno i płótno
// przez interfejsy (IOknoGry, IPlotno), więc App działa tak samo w Trzewia.exe i w silniku. Bez kodu pod telefon
// (Wstecz, NieGasnij). Dźwięk (obudzDzwiek) dochodzi w etapie 6.
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyEkran;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Aplikacja
{

/// <summary>
/// Pętla i przełącznik ekranów. Trzyma jedno miejsce, w którym dzieje się czas,
/// i rozdziela wejście do tego ekranu, który jest na wierzchu.
/// </summary>
public sealed class App : IKontekst
{
    public IPlotno ctx { get; }
    public double w { get; private set; } = 1;
    public double h { get; private set; } = 1;
    public Dzwiek dzwiek { get; } = new Dzwiek();
    /// <summary>Film intro na wierzchu (intro.ts) — null, gdy go nie ma.</summary>
    public Intro? intro;
    public Muzyka muzyka { get; } = new Muzyka();
    public Gesty gesty { get; } = new Gesty();
    /// <summary>Rozmiar w pikselach CSS i mnożnik, z którego wyszła skala — po nich poznajemy zmianę.</summary>
    double cssW, cssH, mnoznik = 1;
    /// <summary>Rozdzielczość obrazu (ustawienia → Wydajność) i gęstość pikseli, z którymi policzono płótno.</summary>
    double rozdz = 1, dpr = 1, dprOkna = 1;
    int pikseleW, pikseleH;
    /// <summary>Płótno mniejsze niż okno (rozdzielczość obrazu &lt; 100% albo ekran gęstszy niż maxDpr) — rozciągane przy pokazaniu.</summary>
    bool posrednie;
    /// <summary>Limit klatek: czas, od którego wolno narysować następną.</summary>
    double nastepnaKlatka;
    readonly Dictionary<string, Ekran> ekrany = new Dictionary<string, Ekran>();
    Ekran? aktywny;
    double ostatnia = Wydajnosc.Teraz();
    readonly IOknoGry okno;

    public App(IOknoGry okno, IPlotno ctx)
    {
        this.okno = okno;
        this.ctx = ctx;
        przelicz();
    }

    public void zarejestruj(Ekran ekran) => ekrany[ekran.nazwa] = ekran;
    public Ekran? ekran(string nazwa) => ekrany.TryGetValue(nazwa, out var e) ? e : null;
    public Ekran? aktywnyEkran => aktywny;

    public void idz(string nazwa, object? dane = null)
    {
        if (!ekrany.TryGetValue(nazwa, out var nowy)) return;
        aktywny?.wyjdz();
        // nowy ekran zaczyna od czystego dźwięku — pauza z gry nie może zostać w menu
        Mikser.zawies(0);
        gesty.tonPauzy(false);
        aktywny = nowy;
        // C#: dźwięk rusza z pierwszym ekranem po ładowaniu (w TS dopiero z pierwszym kliknięciem albo klawiszem —
        // przeglądarka nie pozwala wcześniej; tak samo jak pełny ekran, PLAN.md część 5)
        if (nazwa != "ladowanie") obudzDzwiek();
        nowy.rozmiar(w, h);
        nowy.wejdz(dane);
    }

    /// <summary>
    /// Gra liczy wszystko w pikselach logicznych: do ekranu 1366×820 to po prostu piksele,
    /// na większym cały obraz — płyta, napisy, ryty — rośnie proporcjonalnie. Na małym
    /// ekranie skala spada tak, żeby logiczny ekran miał co najmniej minimum z nastaw
    /// (Nastawy/Ekran.cs) — wtedy każdy układ się mieści i nic na siebie nie nachodzi.
    /// </summary>
    public void przelicz()
    {
        // okno: piksele ekranu i skala Windows (125%, 150%…) — w przeglądarce innerWidth × devicePixelRatio
        pikseleW = okno.PikseleW; pikseleH = okno.PikseleH;
        dprOkna = okno.Dpr > 0 ? okno.Dpr : 1;
        var dpr = Math.Min(EKRAN.maxDpr, dprOkna);
        // wydajność: gra rysuje w części pikseli ekranu, a obraz rozciąga się na całe okno
        var rozdz = rozdzielczoscObrazu();
        var cssW = Math.Max(240, pikseleW / dprOkna);
        var cssH = Math.Max(240, pikseleH / dprOkna);
        // duży monitor: cały obraz rośnie z ekranem
        var auto = Math.Max(1, Math.Min(EKRAN.maxPowiekszenie, Math.Min(cssW / EKRAN.wzorzecW, cssH / EKRAN.wzorzecH)));
        mnoznik = ustawienia.wielkoscUI != 0 ? ustawienia.wielkoscUI : 1;
        // mały ekran: skala zaskakuje w dół, aż logiczny ekran osiągnie minimum
        var pion = cssH >= cssW;
        double minW = pion ? EKRAN.pionMinW : EKRAN.poziomMinW, minH = pion ? EKRAN.pionMinH : EKRAN.poziomMinH;
        var skala = Math.Min(Math.Min(auto * mnoznik, cssW / minW), cssH / minH);
        SettingsStore.ekran.skala = Math.Max(EKRAN.minSkala, skala);
        this.cssW = cssW; this.cssH = cssH; this.rozdz = rozdz; this.dpr = dpr;
        w = cssW / SettingsStore.ekran.skala;
        h = cssH / SettingsStore.ekran.skala;
        int pw = Math.Max(1, (int)Math.Floor(cssW * dpr * rozdz));
        int ph = Math.Max(1, (int)Math.Floor(cssH * dpr * rozdz));
        // płótno równe oknu (z dokładnością do piksela zaokrąglenia) rysuje wprost do okna — bez kopii
        posrednie = Math.Abs(pw - pikseleW) > 1 || Math.Abs(ph - pikseleH) > 1;
        okno.Podepnij(ctx, pw, ph, !posrednie);
        okno.NowaPowierzchnia = false;
        ctx.setTransform(dpr * rozdz * SettingsStore.ekran.skala, 0, 0, dpr * rozdz * SettingsStore.ekran.skala, 0, 0);
        aktywny?.rozmiar(w, h);
    }

    bool zmienilSieEkran() =>
        okno.PikseleW != pikseleW || okno.PikseleH != pikseleH || okno.NowaPowierzchnia
        || (ustawienia.wielkoscUI != 0 ? ustawienia.wielkoscUI : 1) != mnoznik
        || rozdzielczoscObrazu() != rozdz || (okno.Dpr > 0 ? okno.Dpr : 1) != dprOkna;

    /// <summary>Zdarzenie w pikselach CSS (z okna) → piksele logiczne gry — ekrany nie wiedzą o skali.</summary>
    double Logiczne(double css) => css / SettingsStore.ekran.skala;

    // ───────────────────────────── wejście (z OknoGry) ─────────────────────────────

    public void NaWskaznik(Faza faza, double cssX, double cssY, int button, int buttons, bool shift, bool ctrl, bool alt)
    {
        if (faza == Faza.dol) obudzDzwiek();
        aktywny?.dotyk(new Wskaznik
        {
            clientX = Logiczne(cssX), clientY = Logiczne(cssY), button = button, buttons = buttons,
            shiftKey = shift, ctrlKey = ctrl, altKey = alt,
        }, faza);
    }

    public void NaKolko(double cssX, double cssY, double dx, double dy, bool shift, bool ctrl) =>
        aktywny?.kolko(new Kolko { clientX = Logiczne(cssX), clientY = Logiczne(cssY), deltaX = dx, deltaY = dy, shiftKey = shift, ctrlKey = ctrl });

    public void NaKlawisz(Klawisz e)
    {
        // F3: licznik wydajności — na każdym ekranie, bez względu na przypisane klawisze
        if (e.key == "F3") { ustaw(ref ustawienia.licznikWydajnosci, !ustawienia.licznikWydajnosci); return; }
        // F9: nowa oprawa walki (Visual/VisualConfig.cs) — wszystkie nowe efekty naraz, do porównania przed/po
        if (e.key == "F9") { Visual.VisualConfig.Przelacz(Wydajnosc.Teraz()); return; }
        // film intro: spacja i Esc go pomijają, a klawisz idzie dalej do gry
        intro?.klawisz(e);
        obudzDzwiek();
        aktywny?.klawisz(Keybinds.akcjaDlaKlawisza(e.key), e);
    }

    public void NaKlawiszPuszczony(Klawisz e)
    {
        if (e.key == "Tab") aktywny?.klawiszPuszczony(e.key);
    }

    bool dzwiekRuszyl;

    /// <summary>Pierwszy gest (albo pierwszy ekran po ładowaniu) budzi dźwięk: gesty, rezonans świata i muzykę.</summary>
    void obudzDzwiek()
    {
        if (dzwiekRuszyl) { Mikser.wznow(); return; }
        dzwiekRuszyl = true;
        gesty.start();
        if (ustawienia.rezonans) dzwiek.start();
        if (ustawienia.muzyka) muzyka.start();
        Mikser.wznow();
    }

    // ───────────────────────────── klatka ─────────────────────────────

    /// <summary>Jedna klatka na żądanie — zrzuty ekranu w trybie deweloperskim.</summary>
    public void rysujRaz()
    {
        var e = aktywny;
        if (e == null) return;
        if (zmienilSieEkran()) przelicz();
        var teraz = Wydajnosc.Teraz();
        e.krok(0, teraz);
        e.rysuj(ctx, w, h, teraz);
        if (ustawienia.licznikWydajnosci) rysujLicznik();
        PokazPosrednie();
    }

    void rysujLicznik() =>
        LicznikWydajnosci.rysujLicznik(ctx, new OpisObrazu(ctx.width, ctx.height, dpr, rozdz, ustawienia.limitKlatek));

    public void start(string pierwszy) => idz(pierwszy);

    /// <summary>
    /// Limit klatek (ustawienia → Wydajność): czy już pora na następną klatkę. Klatka czeka, aż minie jej czas;
    /// pominięta nie liczy świata — następna dostanie cały upływ czasu. Okres liczony od zaplanowanej chwili, nie od
    /// ostatniej klatki, więc na monitorze 144 Hz z limitem 60 wychodzi średnio 60, a nie 48.
    /// </summary>
    public bool Pora(double teraz)
    {
        var limit = ustawienia.limitKlatek;
        if (limit <= 0) return true;
        if (teraz + 1 < nastepnaKlatka) return false;
        var okres = 1000 / limit;
        nastepnaKlatka = nastepnaKlatka + okres < teraz ? teraz + okres : nastepnaKlatka + okres;
        return true;
    }

    /// <summary>Ile ms do następnej klatki przy limicie (0 — od razu) — gospodarz może tyle poczekać.</summary>
    public double DoNastepnej(double teraz) => ustawienia.limitKlatek > 0 ? Math.Max(0, nastepnaKlatka - 1 - teraz) : 0;

    /// <summary>Jedna klatka (w TS: ciało requestAnimationFrame): czas świata, rysunek, licznik F3.</summary>
    public void Klatka(double teraz)
    {
        var dt = Math.Min(100, teraz - ostatnia);
        ostatnia = teraz;
        if (zmienilSieEkran()) przelicz();
        var e = aktywny;
        if (e != null)
        {
            var t0 = Wydajnosc.Teraz();
            // muzyka planuje akordy, dzwony i niepokój co 250 ms (w TS — setInterval)
            muzyka.krok();
            e.krok(dt, teraz);
            e.rysuj(ctx, w, h, teraz);
            Wydajnosc.licznik.klatka(teraz, Wydajnosc.Teraz() - t0);
            if (ustawienia.licznikWydajnosci) rysujLicznik();
            rysujNapisF9(teraz);
            rysujIntro(teraz);
            PokazPosrednie();
        }
    }

    static readonly string KROJ_F9 = "16px " + Fonts.KROJ;

    /// <summary>Po F9: przez chwilę w rogu, czy nowa oprawa jest włączona (tylko wtedy, gdy ktoś nacisnął F9).</summary>
    void rysujNapisF9(double teraz)
    {
        var od = teraz - Visual.VisualConfig.PrzelaczonoO;
        if (!(od >= 0 && od < Visual.VisualConfig.NapisF9Ms)) return;
        var a = Math.Min(1, (Visual.VisualConfig.NapisF9Ms - od) / 300);
        var tekst = Visual.VisualConfig.Wlaczone ? "F9 · nowa oprawa: włączona" : "F9 · nowa oprawa: wyłączona (jak dotąd)";
        ctx.save();
        ctx.globalAlpha = a;
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;
        ctx.font = KROJ_F9;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        var sz = ctx.measureText(tekst).width + 24;
        double x = w - 14, y = 14;
        ctx.fillStyle = "rgba(8,6,5,0.84)";
        ctx.fillRect(x - sz, y, sz, 30);
        ctx.strokeStyle = "rgba(224,176,104,0.55)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x - sz + 0.5, y + 0.5, sz - 1, 29);
        ctx.fillStyle = "rgba(233,221,194,1)";
        ctx.fillText(tekst, x - 12, y + 7);
        ctx.restore();
    }

    /// <summary>Film intro w pikselach CSS (w TS: warstwa strony nad płótnem), potem zwykła skala z powrotem.</summary>
    void rysujIntro(double teraz)
    {
        if (intro == null) return;
        ctx.setTransform(dpr * rozdz, 0, 0, dpr * rozdz, 0, 0);
        intro.rysuj(ctx, cssW, cssH, teraz);
        ctx.setTransform(dpr * rozdz * SettingsStore.ekran.skala, 0, 0, dpr * rozdz * SettingsStore.ekran.skala, 0, 0);
    }

    /// <summary>Do ponownego rysowania od zera (pętla po przerwie: okno zminimalizowane) — czas nie skacze.</summary>
    public void Wznow(double teraz) { ostatnia = teraz; nastepnaKlatka = 0; }

    /// <summary>Płótno mniejsze niż okno: rozciągnięte na całe okno, gładko (jak obraz płótna w przeglądarce).</summary>
    void PokazPosrednie()
    {
        if (posrednie) okno.Rozciagnij(ctx);
    }

    /// <summary>Ustawiona rozdzielczość obrazu (ułamek pikseli ekranu): 0,5–1.</summary>
    static double rozdzielczoscObrazu()
    {
        var r = ustawienia.rozdzielczosc;
        return r > 0 && r < 1 ? Math.Max(0.5, r) : 1;
    }
}
}
