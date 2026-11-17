using Trzewia.Aplikacja;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Tryb Kręgu Trzeciego na ekranie: film na początek partii (Aplikacja/FilmKregu.cs) rysuje się bez wyjątków i nie jest
/// pusty w żadnym ujęciu; nowa partia kręgu zaczyna się filmem i sceną wejścia, w której symulacja stoi, a po scenie
/// szóstka stoi tam, gdzie zaczyna się gra; menu przełącza tryb i wraca. Arkusz klatek filmu: testy/wyniki/krag-film.png.
/// </summary>
public class KragEkranyTesty
{
    readonly ITestOutputHelper wyj;
    public KragEkranyTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

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

    static void przygotuj()
    {
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        SettingsStore.ustawienia.rycinaWWatku = false;
        Fonts.zaladujKroje();
    }

    /// <summary>Ułamek pikseli jaśniejszych niż ciemne tło filmu.</summary>
    static double jasnych(PlotnoSkia p)
    {
        using var bmp = SkiaSharp.SKBitmap.FromImage(p.Migawka()!);
        int n = 0, wszystkich = 0;
        for (int y = 0; y < bmp.Height; y += 4)
            for (int x = 0; x < bmp.Width; x += 4)
            {
                var c = bmp.GetPixel(x, y);
                wszystkich++;
                if (c.Red + c.Green + c.Blue > 90) n++;
            }
        return (double)n / wszystkich;
    }

    [Fact]
    public void FilmKazdeUjecie()
    {
        przygotuj();
        Krag.Ustaw(true);
        try
        {
            var sim = new Sim(3);
            const int W = 960, H = 540;
            using var p = new PlotnoSkia(W, H);
            // po dwie chwile z każdego ujęcia (w tym środki scen z kilkoma cięciami)
            double[] chwile = { 3, 6, 9, 12, 14.5, 16.5, 18, 21, 22.5, 25.5, 28.5, 31, 33, 34.5, 36.5, 40, 43, 46, 49, 52, 55.5, 59, 61.5, 64, 67.5, 70.5, 72.8 };
            const int K = 6, kw = 320, kh = 180;
            using var arkusz = new PlotnoSkia(kw * K, kh * ((chwile.Length + K - 1) / K));
            arkusz.fillStyle = "rgb(0,0,0)"; arkusz.fillRect(0, 0, arkusz.width, arkusz.height);
            for (int i = 0; i < chwile.Length; i++)
            {
                p.setTransform(1, 0, 0, 1, 0, 0);
                var t = chwile[i];
                FilmKregu.rysujFilm(p, sim, W, H, t, 1000 + t * 1000);
                var j = jasnych(p);
                wyj.WriteLine($"t = {t,5:F1} s: jasnych {j:P1}");
                Assert.True(j > 0.01, $"klatka filmu w {t} s prawie czarna ({j:P2})");
                arkusz.drawImage(p, 0, 0, W, H, (i % K) * kw, (i / K) * kh, kw, kh);
            }
            var katalog = Path.Combine(Sciezka.Testy, "wyniki");
            Directory.CreateDirectory(katalog);
            Assert.True(arkusz.ZapiszPng(Path.Combine(katalog, "krag-film.png")));
        }
        finally { Krag.Ustaw(false); }
    }

    [Fact]
    public void NowaPartiaKreguFilmIScenaWejscia()
    {
        przygotuj();
        Krag.Ustaw(true);
        try
        {
            const int W = 1280, H = 720;
            using var p = new PlotnoSkia(W, H);
            var app = new Kontekst { ctx = p, w = W, h = H };
            var gra = new EkranGry(app);
            app.zarejestruj(gra);
            app.idz("gra", "nowa");
            Assert.True(gra.partiaKregu);
            Assert.True(gra.wstep.plansze(), "nowa partia kręgu zaczyna się filmem");
            var tik0 = gra.sim.tick;
            var start = gra.sim.creatures.Where(c => !c.dead && c.race == Race.GOBLIN).Select(c => (c.id, c.x, c.y)).ToList();
            double teraz = 1000;
            void klatka(bool rysuj)
            {
                teraz += 1000.0 / 30;
                gra.krok(1000.0 / 30, teraz);
                if (rysuj) { p.setTransform(1, 0, 0, 1, 0, 0); gra.rysuj(p, W, H, teraz); }
            }
            for (int i = 0; i < 30; i++) klatka(i % 10 == 9);
            Assert.Equal(tik0, gra.sim.tick);
            // Esc pomija film — zaczyna się scena wejścia, symulacja dalej stoi, szóstka leży na tarasie
            gra.klawisz(Akcja.menu, new Klawisz { key = "Escape" });
            Assert.True(gra.wstep.trwa() && !gra.wstep.plansze());
            for (int i = 0; i < 60; i++) klatka(true);
            Assert.Equal(tik0, gra.sim.tick);
            var naTarasie = gra.sim.creatures.Count(c => !c.dead && c.race == Race.GOBLIN && c.y < World.SURFACE_Y);
            Assert.True(naTarasie > 0, "w scenie wejścia szóstka zaczyna na tarasie kręgu");
            var katalog = Path.Combine(Sciezka.Testy, "wyniki");
            Directory.CreateDirectory(katalog);
            Assert.True(p.ZapiszPng(Path.Combine(katalog, "krag-wejscie.png")));
            // do końca sceny (najwyżej 3 minuty) — potem gra rusza, a szóstka stoi tam, gdzie zaczyna się gra
            int klatek = 0;
            while (gra.wstep.trwa() && klatek++ < 30 * 180) klatka(klatek % 30 == 0);
            wyj.WriteLine($"scena wejścia: {klatek / 30.0:F1} s");
            Assert.False(gra.wstep.trwa(), "scena wejścia się nie skończyła");
            foreach (var (id, x, y) in start)
            {
                var c = gra.sim.creatureById(id)!;
                Assert.Equal(x, c.x, 6); Assert.Equal(y, c.y, 6);
            }
            for (int i = 0; i < 30; i++) klatka(false);
            Assert.True(gra.sim.tick > tik0, "po scenie wejścia czas gry rusza");
        }
        finally { Krag.Ustaw(false); }
    }
}
