using Trzewia.Aplikacja;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>Pomiar części klatki ekranu gry (rysunek programowy Skii). Tylko z TRZEWIA_POMIAR=1.</summary>
public class PomiarEkranuGry
{
    readonly ITestOutputHelper wyj;
    public PomiarEkranuGry(ITestOutputHelper wyj) { this.wyj = wyj; }

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
        public void idz(string nazwa, object? dane = null) { }
        public void zarejestruj(Ekran ekran) { }
        public Ekran? ekran(string nazwa) => null;
    }

    [Fact]
    public void Czesci()
    {
        if (Environment.GetEnvironmentVariable("TRZEWIA_POMIAR") != "1") return;
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        SettingsStore.ustawienia.rycinaWWatku = false;
        Fonts.zaladujKroje();
        const int W = 1366, H = 820;
        using var p = new PlotnoSkia(W, H);
        var gra = new EkranGry(new Kontekst { ctx = p, w = W, h = H });
        gra.wejdz("nowa");
        double teraz = 1000;
        var sw = System.Diagnostics.Stopwatch.StartNew();
        for (int k = 0; k < 12; k++)
        {
            teraz += 50;
            var t0 = Wydajnosc.Teraz();
            gra.krok(50, teraz);
            var t1 = Wydajnosc.Teraz();
            p.setTransform(1, 0, 0, 1, 0, 0);
            gra.rysuj(p, W, H, teraz);
            var t2 = Wydajnosc.Teraz();
            Wydajnosc.licznik.klatka(teraz, t2 - t0);
            wyj.WriteLine($"klatka {k}: krok {t1 - t0:F1} ms, rysuj {t2 - t1:F1} ms");
        }
        // ta sama klatka z granicami warstw i bez (dawniej) — obraz ma być ten sam
        int[] zrzut()
        {
            p.setTransform(1, 0, 0, 1, 0, 0);
            gra.rysuj(p, W, H, teraz);
            var plik = Path.Combine(Path.GetTempPath(), "trzewia-pomiar.png");
            p.ZapiszPng(plik);
            using var bmp = SkiaSharp.SKBitmap.Decode(plik);
            return bmp.Pixels.Select(c => (int)(uint)c).ToArray();
        }
        var a = zrzut(); var c2 = zrzut();
        PlotnoSkia.BezGranicWarstw = true;
        var b = zrzut();
        PlotnoSkia.BezGranicWarstw = false;
        int rozne(int[] x, int[] y) { int n = 0; for (int i = 0; i < x.Length; i++) { var d = Math.Max(Math.Abs((x[i] & 255) - (y[i] & 255)), Math.Max(Math.Abs(((x[i] >> 8) & 255) - ((y[i] >> 8) & 255)), Math.Abs(((x[i] >> 16) & 255) - ((y[i] >> 16) & 255)))); if (d > 2) n++; } return n; }
        wyj.WriteLine($"różnych pikseli (>2/255): ta sama klatka dwa razy {rozne(a, c2)}, z granicami i bez {rozne(c2, b)}");
        var w = Wydajnosc.licznik.wynik;
        for (int i = 0; i < Wydajnosc.CZESCI.Length; i++)
            wyj.WriteLine($"  {Wydajnosc.NazwaCzesci(Wydajnosc.CZESCI[i]),-17} {w.czesci[i]:F1} ms");
        wyj.WriteLine($"  reszta {w.resztaMs:F1} ms");
    }
}
