using System.Text.Json;
using SkiaSharp;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Płyta świata C# (Rysunek/Swiat/PlytaSwiata.cs) obok płyty TS (narzedzia/plyta/porownaj.mjs → testy/zlote/plyta) —
/// te same sceny, ten sam stos warstw z game.ts. Nie piksel w piksel: Chrome i Skia rysują ścieżki i gradienty trochę
/// inaczej, a postacie w C# są duszkami. Test liczy średnią różnicę i odsetek pikseli różnych o więcej niż 24/255
/// (bez progu — do oka i do raportu) i zapisuje testy/wyniki/porownanie-*.png: TS | C# | różnica ×4.
/// </summary>
public class PorownaniePlyty
{
    readonly ITestOutputHelper wyj;
    public PorownaniePlyty(ITestOutputHelper wyj) { this.wyj = wyj; }

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

    sealed record Kam(double x, double y, double zoom);
    sealed record Scena(string nazwa, int ziarno, int tik, Kam kam, double teraz, int vw, int vh, int klatek);

    [Fact]
    public void Sceny()
    {
        var plik = Path.Combine(Sciezka.Testy, "zlote", "plyta", "sceny.json");
        if (!File.Exists(plik)) return;
        Rdzen.Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        Rdzen.SettingsStore.ustawienia.rycinaWWatku = false;
        var sceny = JsonSerializer.Deserialize<List<Scena>>(File.ReadAllText(plik))!;
        var katalog = Path.Combine(Sciezka.Testy, "wyniki");
        Directory.CreateDirectory(katalog);
        Sim? sim = null; int ziarno = -1;
        foreach (var sc in sceny)
        {
            if (sim == null || ziarno != sc.ziarno || sim.tick > sc.tik) { sim = new Sim(sc.ziarno); ziarno = sc.ziarno; }
            while (sim.tick < sc.tik && sim.ending == null) { sim.step(); if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny"); }
            var cam = new Camera(sc.vw, sc.vh) { x = sc.kam.x, y = sc.kam.y, zoom = sc.kam.zoom };
            var plyta = new PlytaSwiata();
            plyta.rycina.resize(sc.vw, sc.vh);
            plyta.rycina.fresk = Rdzen.SettingsStore.ustawienia.swiat != "rycina";
            using var p = new PlotnoSkia(sc.vw, sc.vh);
            for (int k = 0; k < sc.klatek; k++)
            {
                plyta.rycina.klatka(sim, cam, sc.teraz, true);
                p.setTransform(1, 0, 0, 1, 0, 0);
                p.fillStyle = "#000"; p.fillRect(0, 0, sc.vw, sc.vh);
                plyta.Rysuj(p, sim, cam, sc.teraz, false, 0.5);
            }
            var cs = Path.Combine(katalog, $"plyta-cs-{sc.nazwa}.png");
            Assert.True(p.ZapiszPng(cs));
            using var bTs = SKBitmap.Decode(Path.Combine(Sciezka.Testy, "zlote", "plyta", sc.nazwa + ".png"));
            using var bCs = SKBitmap.Decode(cs);
            int w = sc.vw, h = sc.vh;
            double suma = 0; long rozne = 0;
            using var zlozony = new SKBitmap(w * 3, h);
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    var a = bTs.GetPixel(x, y); var b = bCs.GetPixel(x, y);
                    int dr = Math.Abs(a.Red - b.Red), dg = Math.Abs(a.Green - b.Green), db = Math.Abs(a.Blue - b.Blue);
                    var d = Math.Max(dr, Math.Max(dg, db));
                    suma += (dr + dg + db) / 3.0;
                    if (d > 24) rozne++;
                    zlozony.SetPixel(x, y, a);
                    zlozony.SetPixel(w + x, y, b);
                    var r4 = (byte)Math.Min(255, d * 4);
                    zlozony.SetPixel(2 * w + x, y, new SKColor(r4, r4, r4));
                }
            using (var img = SKImage.FromBitmap(zlozony))
            using (var dane = img.Encode(SKEncodedImageFormat.Png, 100))
            using (var f = File.Create(Path.Combine(katalog, $"porownanie-{sc.nazwa}.png"))) dane.SaveTo(f);
            wyj.WriteLine($"{sc.nazwa}: średnia różnica {suma / (w * h):F1}/255, różnych o > 24: {100.0 * rozne / (w * h):F1}%");
        }
    }
}
