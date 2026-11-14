using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Podgląd płyty świata (Rysunek/Swiat/PlytaSwiata.cs) w kilku miejscach góry — zrzuty do oka, bez porównania.
/// Uruchamia się tylko z TRZEWIA_PODGLAD=1 (zapis do testy/wyniki/plyta-*.png).
/// </summary>
public class PodgladPlyty
{
    readonly ITestOutputHelper wyj;
    public PodgladPlyty(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed class DaneZFolderu : Rdzen.IDaneGry
    {
        readonly string folder;
        public DaneZFolderu(string folder) { this.folder = folder; }
        public Stream? Otworz(string sciezka)
        {
            var p = Path.Combine(folder, sciezka.Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(p) ? File.OpenRead(p) : null;
        }
    }

    [Fact]
    public void Zrzuty()
    {
        if (Environment.GetEnvironmentVariable("TRZEWIA_PODGLAD") != "1") return;
        Rdzen.Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        Rdzen.SettingsStore.ustawienia.rycinaWWatku = false;
        var tik = int.Parse(Environment.GetEnvironmentVariable("TRZEWIA_TIK") ?? "9000");
        var sim = new Sim(1);
        while (sim.tick < tik && sim.ending == null) { sim.step(); if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny"); }
        var w = sim.world;
        var katalog = Path.Combine(Sciezka.Testy, "wyniki");
        Directory.CreateDirectory(katalog);

        // miejsca: rdzeń, najbliższy widziany kafel żelaza i złota, siedziba pierwszego klanu
        (double x, double y)? znajdz(int rodzaj)
        {
            (double, double)? naj = null; double d = 1e18;
            for (int i = 0; i < w.w * w.h; i++)
            {
                if (w.tile[i] != rodzaj || w.ever[i] == 0) continue;
                double x = i % (int)w.w, y = i / (int)w.w;
                var dd = (x - w.coreX) * (x - w.coreX) + (y - w.coreY) * (y - w.coreY);
                if (dd < d) { d = dd; naj = (x + 0.5, y + 0.5); }
            }
            return naj;
        }
        var miejsca = new List<(string nazwa, double x, double y, double zoom)> { ("rdzen", w.coreX + 0.5, w.coreY + 0.5, 22) };
        if (znajdz(T.ORE) is { } z) miejsca.Add(("zelazo", z.x, z.y, 30));
        if (znajdz(T.ZLOTO) is { } g) miejsca.Add(("zloto", g.x, g.y, 30));
        foreach (var k in sim.clans) if (!k.dead) { miejsca.Add(("oboz", k.hx, k.hy, 14)); break; }
        miejsca.Add(("ogol", w.w / 2, 40, 6));
        for (int n = 0; n < w.odcinkiDrogi.Count && n < 2; n++)
        {
            var o = w.odcinkiDrogi[n];
            miejsca.Add(($"schody{n}", (o.x0 + o.x1) / 2 + 0.5, Math.Min(o.y1 - 4, o.y0 + 8), 20));
        }
        if (Environment.GetEnvironmentVariable("TRZEWIA_TYLKO") is { } tylko) miejsca.RemoveAll(m => !tylko.Split(',').Contains(m.nazwa));

        const int VW = 1280, VH = 720;
        foreach (var (nazwa, x, y, zoom) in miejsca)
        {
            var cam = new Camera(VW, VH) { x = x, y = y, zoom = zoom };
            cam.clamp(w.w, w.h);
            var rycina = new Rycina();
            var taj = new Tajemnica();
            rycina.resize(VW, VH);
            using var p = new PlotnoSkia(VW, VH);
            var t0 = System.Diagnostics.Stopwatch.StartNew();
            double teraz = 5000;
            rycina.klatka(sim, cam, teraz, true);
            p.fillStyle = "#000"; p.fillRect(0, 0, VW, VH);
            PlytaSwiata.Rysuj(p, sim, cam, rycina, taj, teraz, false, 0.5);
            var ms = t0.Elapsed.TotalMilliseconds;
            var plik = Path.Combine(katalog, $"plyta-{nazwa}.png");
            Assert.True(p.ZapiszPng(plik));
            wyj.WriteLine($"{nazwa}: ({x:F1}, {y:F1}) zoom {zoom} — {ms:F0} ms → {plik}");
        }
    }
}
