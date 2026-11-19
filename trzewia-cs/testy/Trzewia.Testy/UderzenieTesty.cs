using System.Diagnostics;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Trzewia.Visual;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Oprawa walki, etap 3 („uderzenie”): ścięta głowa ląduje tam, gdzie kładzie ją symulacja; wstrząs słucha suwaka
/// i nie przekracza granic; pula cząsteczek nie rośnie ponad 500 nawet przy zalewie; rysunek pełnej puli mieści się
/// w klatce.
/// </summary>
public class UderzenieTesty
{
    readonly ITestOutputHelper wyj;
    public UderzenieTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed class Wlaczona : IDisposable
    {
        readonly (bool, bool, double, bool) bylo = (VisualConfig.Wlaczone, VisualConfig.Uderzenie, SettingsStore.ustawienia.silaWstrzasu, SettingsStore.ustawienia.ograniczRuch);
        public Wlaczona() { VisualConfig.Wlaczone = true; VisualConfig.Uderzenie = true; SettingsStore.ustawienia.ograniczRuch = false; }
        public void Dispose() { (VisualConfig.Wlaczone, VisualConfig.Uderzenie, SettingsStore.ustawienia.silaWstrzasu, SettingsStore.ustawienia.ograniczRuch) = bylo; Uderzenie.Wyczysc(); }
    }

    [Theory]
    [InlineData(0, 3.0, 40.0, 5.0, 42.0, 1)]
    [InlineData(1, 10.0, 38.2, 7.4, 41.0, -1)]
    [InlineData(2, 20.0, 39.0, 21.5, 40.0, 1)]
    public void GlowaLadujeTamGdzieSymulacja(double nr, double x0, double y0, double x, double y, double zwrot)
    {
        using var opr = new Wlaczona();
        var o = new GlowaOdcieta { nr = nr, tick = 1000, x0 = x0, y0 = y0, x = x, y = y, zwrot = zwrot };
        Assert.True(Uderzenie.LotGlowy(o, 1000, out var ax, out var ay, out _, out _));
        Assert.Equal(x0, ax, 6); Assert.Equal(y0, ay, 6);
        // w locie wyżej niż start (w górę), potem na posadzce — dokładnie (x, y + 1), bez obrotu
        double najwyzej = ay;
        for (double t = 1000; t < 1000 + 120 * 3; t += 2)
        {
            Uderzenie.LotGlowy(o, t, out _, out var yy, out _, out _);
            najwyzej = Math.Min(najwyzej, yy);
        }
        Assert.True(najwyzej < y0 - 1, $"głowa nie poleciała w górę ({najwyzej} vs {y0})");
        Assert.True(Uderzenie.LotGlowy(o, 1000 + 120 * 3, out var kx, out var ky, out var kat, out var poLad));
        Assert.Equal(x, kx, 6); Assert.Equal(y + 1, ky, 6); Assert.Equal(0, kat, 6);
        Assert.True(poLad > 0);
        Assert.False(Uderzenie.LotGlowy(o, 999, out _, out _, out _, out _), "przed cięciem głowy nie ma");
    }

    [Fact]
    public void WstrzasSluchaSuwakaIGranic()
    {
        using var opr = new Wlaczona();
        Czytelnosc.SkalaUi = 1;
        Uderzenie.Wyczysc();
        SettingsStore.ustawienia.silaWstrzasu = 0;
        Uderzenie.Trauma(1);
        Assert.False(Uderzenie.Wstrzas(1000, out _, out _, out _), "suwak na 0% — bez wstrząsu");
        Uderzenie.Wyczysc();
        SettingsStore.ustawienia.silaWstrzasu = 1;
        Uderzenie.Trauma(1);
        double najX = 0, najK = 0;
        for (double t = 1000; t < 1600; t += 16)
        {
            if (!Uderzenie.Wstrzas(t, out var dx, out var dy, out var k)) continue;
            najX = Math.Max(najX, Math.Max(Math.Abs(dx), Math.Abs(dy)));
            najK = Math.Max(najK, Math.Abs(k));
        }
        Assert.True(najX > 1, "przy pełnej traumie wstrząs widać");
        Assert.True(najX <= VisualConfig.Uderzenia.WstrzasPx + 1e-9, $"przesunięcie {najX} > {VisualConfig.Uderzenia.WstrzasPx} px");
        Assert.True(najK <= VisualConfig.Uderzenia.WstrzasStopnie * Math.PI / 180 + 1e-9);
        // zanik ok. 1,5/s: po 1 s z pełnej traumy zostaje niewiele
        Assert.True(Uderzenie.Traumy < 0.2, $"trauma po sekundzie {Uderzenie.Traumy}");
        // „Ogranicz ruch” — bez wstrząsu
        SettingsStore.ustawienia.ograniczRuch = true;
        Uderzenie.Trauma(1);
        Assert.False(Uderzenie.Wstrzas(1700, out _, out _, out _));
    }

    [Fact]
    public void PulaCzasteczekNieRosnieIRysujeSieWKlatce()
    {
        using var opr = new Wlaczona();
        Gospodarz.Dane ??= new DaneTestowe();
        Plotno.Fabryka ??= new FabrykaSkia();
        var sim = new Sim(3);
        Czasteczki.Wyczysc();
        Czasteczki.Krok(sim, 1000);
        // zalew: 4000 cząsteczek w jednej chwili, wysoko nad ziemią
        for (int i = 0; i < 1000; i++)
        {
            Czasteczki.Iskry(100 + i % 50, 30, 0, 1);
            Czasteczki.Krew(100 + i % 50, 30, 0, 1);
            Czasteczki.Pyl(100 + i % 50, 30, 2, 1);
            Czasteczki.Popiol(100 + i % 50, 30, 1, 1);
        }
        Czasteczki.Krok(sim, 1016);
        Assert.True(Czasteczki.Zywych <= VisualConfig.Uderzenia.Czasteczek, $"żywych {Czasteczki.Zywych}");
        Assert.True(Czasteczki.Zywych >= VisualConfig.Uderzenia.Czasteczek * 0.9, $"pula nie pełna: {Czasteczki.Zywych}");
        // rysunek pełnej puli przy 1080p: średnio na klatkę (procesor, bez karty)
        using var p = new PlotnoSkia(1920, 1080);
        var cam = new Camera(1920, 1080) { x = 125, y = 30, zoom = 17.5 };
        var sw = Stopwatch.StartNew();
        for (int k = 0; k < 20; k++) { Czasteczki.RysujPod(p, cam, 1020 + k); Czasteczki.RysujNad(p, cam, 1020 + k); }
        var ms = sw.Elapsed.TotalMilliseconds / 20;
        wyj.WriteLine($"pełna pula ({Czasteczki.Zywych}): {ms:F2} ms na klatkę (rysunek procesorem)");
        Assert.True(ms < 16, $"pełna pula rysuje się {ms:F1} ms — za długo na 60 fps");
        Czasteczki.Wyczysc();
    }

    sealed class DaneTestowe : IDaneGry
    {
        public Stream? Otworz(string sciezka)
        {
            var p = Path.Combine(Sciezka.Testy, "..", "dane", sciezka.Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(p) ? File.OpenRead(p) : null;
        }
    }
}
