using Trzewia.Aplikacja;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Test dymny ekranu gry (Aplikacja/Screens/EkranGry*.cs): nowa partia, a potem kilka tysięcy losowych kliknięć
/// (lewy i prawy przycisk, przeciągnięcia — ramka i przesuwanie, kółko) i klawiszy ze wszystkich przypisań — także
/// z panelem dewelopera i w pauzie. Nic nie może rzucić wyjątkiem; na koniec zrzut do testy/wyniki/ekran-gry-dym.png.
/// </summary>
public class EkranGryDym
{
    readonly ITestOutputHelper wyj;
    public EkranGryDym(ITestOutputHelper wyj) { this.wyj = wyj; }

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
        public readonly List<string> przejscia = new();
        readonly Dictionary<string, Ekran> ekrany = new();
        public void idz(string nazwa, object? dane = null) => przejscia.Add(nazwa);
        public void zarejestruj(Ekran ekran) => ekrany[ekran.nazwa] = ekran;
        public Ekran? ekran(string nazwa) => ekrany.TryGetValue(nazwa, out var e) ? e : null;
    }

    [Fact]
    public void LosoweKlikniecia()
    {
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        SettingsStore.ustawienia.rycinaWWatku = false;
        Fonts.zaladujKroje();
        const int W = 1366, H = 820;
        using var p = new PlotnoSkia(W, H);
        var app = new Kontekst { ctx = p, w = W, h = H };
        var gra = new EkranGry(app);
        app.zarejestruj(gra);
        gra.wejdz("nowa");
        var los = new Random(7);
        double teraz = 1000;
        // rysunek programowy jest wolny: krok co zdarzenie, rysunek co kilka (wejście czyta pola z ostatniego rysunku)
        void klatka(bool rysuj = true)
        {
            teraz += 16.7;
            gra.krok(16.7, teraz);
            if (!rysuj) return;
            p.setTransform(1, 0, 0, 1, 0, 0);
            gra.rysuj(p, W, H, teraz);
        }
        var zegar = System.Diagnostics.Stopwatch.StartNew();
        string[] klawisze = { " ", "Escape", "b", "B", "q", "w", "e", "s", "r", "d", "x", "Tab", "l", "z", "c", "+", "-", "1", "2", "3", "4", "Enter", "F5", "F9", "a", "f", "g", "h", "j", "k", "p", "m", "t", "y", "u", "i", "o", "n", "v" };
        int zdarzen = 0;
        foreach (var dev in new[] { false, true })
        {
            SettingsStore.ustawienia.trybDeweloperski = dev;
            for (int n = 0; n < 700; n++)
            {
                var r = los.NextDouble();
                double x = los.NextDouble() * W, y = los.NextDouble() * H;
                bool shift = los.NextDouble() < 0.15;
                if (r < 0.55)
                {
                    var b = los.NextDouble() < 0.8 ? 0 : 2;
                    gra.dotyk(new Wskaznik { clientX = x, clientY = y, button = b, buttons = 1 << b, shiftKey = shift }, Faza.dol);
                    if (los.NextDouble() < 0.3)
                    {
                        // przeciągnięcie: ramka (lewy) albo przesunięcie widoku (prawy)
                        for (int k = 1; k <= 4; k++)
                            gra.dotyk(new Wskaznik { clientX = x + k * 25, clientY = y + k * 12, button = -1, buttons = 1 << b, shiftKey = shift }, Faza.ruch);
                        x += 100; y += 48;
                    }
                    gra.dotyk(new Wskaznik { clientX = x, clientY = y, button = b, buttons = 0, shiftKey = shift }, Faza.gora);
                }
                else if (r < 0.7) gra.dotyk(new Wskaznik { clientX = x, clientY = y, button = -1, buttons = 0 }, Faza.ruch);
                else if (r < 0.8) gra.kolko(new Kolko { clientX = x, clientY = y, deltaY = los.NextDouble() < 0.5 ? 100 : -100 });
                else
                {
                    var k = klawisze[los.Next(klawisze.Length)];
                    var e = new Klawisz { key = k, shiftKey = shift };
                    gra.klawisz(Keybinds.akcjaDlaKlawisza(k), e);
                    if (k == "Tab") gra.klawiszPuszczony("Tab");
                }
                zdarzen++;
                klatka(n % 8 == 0);
                // czas świata płynie także między kliknięciami
                if (n % 50 == 0) for (int t = 0; t < 60; t++) klatka(t == 59);
            }
        }
        for (int t = 0; t < 10; t++) klatka();
        var katalog = Path.Combine(Sciezka.Testy, "wyniki");
        Directory.CreateDirectory(katalog);
        Assert.True(p.ZapiszPng(Path.Combine(katalog, "ekran-gry-dym.png")));
        wyj.WriteLine($"czas: {zegar.Elapsed.TotalSeconds:F0} s");
        wyj.WriteLine($"zdarzeń: {zdarzen}, przejścia: {string.Join(", ", app.przejscia.Distinct())}");
    }
}
