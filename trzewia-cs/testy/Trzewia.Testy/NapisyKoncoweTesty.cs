using Trzewia.Aplikacja;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Oprawa walki, etap 7b (Aplikacja/Screens/EkranNapisow.cs): po wygranej w Kręgu Trzecim napisy końcowe płyną same
/// i same przechodzą do kroniki; spacja / Esc / klik — od razu kronika; po przegranej (i w Kręgu jak w TS) napisów nie
/// ma. Zrzuty do testy/wyniki/napisy-*.png.
/// </summary>
public class NapisyKoncoweTesty
{
    readonly ITestOutputHelper wyj;
    public NapisyKoncoweTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed class Kontekst : IKontekst
    {
        public IPlotno ctx { get; init; } = null!;
        public double w { get; init; }
        public double h { get; init; }
        public Dzwiek dzwiek { get; } = new Dzwiek();
        public Muzyka muzyka { get; } = new Muzyka();
        public Gesty gesty { get; } = new Gesty();
        readonly Dictionary<string, Ekran> ekrany = new();
        public Ekran? aktywny;
        public void idz(string nazwa, object? dane = null)
        {
            if (!ekrany.TryGetValue(nazwa, out var e)) return;
            aktywny?.wyjdz();
            aktywny = e;
            e.rozmiar(w, h);
            e.wejdz(dane);
        }
        public void zarejestruj(Ekran ekran) => ekrany[ekran.nazwa] = ekran;
        public Ekran? ekran(string nazwa) => ekrany.TryGetValue(nazwa, out var e) ? e : null;
    }

    sealed class WKregu : IDisposable
    {
        readonly bool zmiany = ZmianyKregu.Wlaczone;
        public WKregu() { Krag.Ustaw(true); ZmianyKregu.Wlaczone = true; }
        public void Dispose() { ZmianyKregu.Wlaczone = zmiany; Krag.Ustaw(false); }
    }

    sealed class DaneZFolderu : IDaneGry
    {
        readonly string folder;
        public DaneZFolderu(string folder) { this.folder = folder; }
        public Stream? Otworz(string sciezka)
        {
            var p = Path.Combine(folder, sciezka.Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(p) ? File.OpenRead(p) : null;
        }
    }

    static void przygotuj()
    {
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        Fonts.zaladujKroje();
    }

    static Sim Skonczona(string koniec) { var s = new Sim(3); s.ending = koniec; return s; }

    [Fact]
    public void PoWygranejNapisyPlynaISamePrzechodzaDoKroniki()
    {
        using var _ = new WKregu();
        przygotuj();
        const int W = 1280, H = 720;
        using var p = new PlotnoSkia(W, H);
        var app = new Kontekst { ctx = p, w = W, h = H };
        app.zarejestruj(new EkranNapisow(app));
        app.zarejestruj(new EkranKroniki(app));
        var sim = Skonczona("uwolnienie:Pobożni");
        Assert.True(EkranNapisow.PoPartii(sim));
        app.idz("napisy", sim);
        var katalog = Path.Combine(Sciezka.Testy, "wyniki");
        Directory.CreateDirectory(katalog);
        double teraz = 5000, od = teraz;
        var zrzuty = new[] { 3.0, 9.0, 20.0 };
        var zapisane = 0;
        while (app.aktywny?.nazwa == "napisy" && teraz - od < 120000)
        {
            teraz += 1000.0 / 30;
            app.aktywny.krok(1000.0 / 30, teraz);
            if (app.aktywny?.nazwa != "napisy") break;
            p.setTransform(1, 0, 0, 1, 0, 0);
            app.aktywny.rysuj(p, W, H, teraz);
            var s = (teraz - od) / 1000;
            if (zapisane < zrzuty.Length && s >= zrzuty[zapisane]) Assert.True(p.ZapiszPng(Path.Combine(katalog, $"napisy-{++zapisane}.png")));
        }
        var trwaly = (teraz - od) / 1000;
        wyj.WriteLine($"napisy trwały {trwaly:F1} s");
        Assert.Equal("kronika", app.aktywny?.nazwa);
        Assert.InRange(trwaly, 12, 60);
    }

    [Fact]
    public void PominiecieOdRazuDoKroniki()
    {
        using var _ = new WKregu();
        przygotuj();
        using var p = new PlotnoSkia(640, 360);
        var app = new Kontekst { ctx = p, w = 640, h = 360 };
        app.zarejestruj(new EkranNapisow(app));
        app.zarejestruj(new EkranKroniki(app));
        foreach (var pomin in new Action<Ekran>[]
        {
            e => e.klawisz(Keybinds.akcjaDlaKlawisza("Escape"), new Klawisz { key = "Escape" }),
            e => e.klawisz(Keybinds.akcjaDlaKlawisza(" "), new Klawisz { key = " " }),
            e => e.dotyk(new Wskaznik { clientX = 100, clientY = 100, button = 0, buttons = 1 }, Faza.dol),
        })
        {
            app.idz("napisy", Skonczona("uwolnienie:Pobożni"));
            app.aktywny!.krok(16, 1000); app.aktywny.rysuj(p, 640, 360, 1000);
            pomin(app.aktywny);
            Assert.Equal("kronika", app.aktywny?.nazwa);
        }
    }

    [Fact]
    public void PoPrzegranejIBezZmianKreguNapisowNieMa()
    {
        using (new WKregu())
        {
            Assert.False(EkranNapisow.PoPartii(Skonczona("upadek:Lud")));
            Assert.False(EkranNapisow.PoPartii(Skonczona("sen")));
            Assert.True(EkranNapisow.PoPartii(Skonczona("uwolnienie:Rycerze")));
        }
        using (new WKregu())
        {
            ZmianyKregu.Wlaczone = false;
            Assert.False(EkranNapisow.PoPartii(Skonczona("uwolnienie:Pobożni")));
        }
    }
}
