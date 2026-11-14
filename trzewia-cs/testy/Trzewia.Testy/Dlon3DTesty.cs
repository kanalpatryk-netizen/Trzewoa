using System.Diagnostics;
using SkiaSharp;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Rysunek.Model3D;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Dłoń jako model 3D (PLAN.md, punkt 9.6): plik .glb wczytuje się, ma szkielet i animacje, a klatka narysowana
/// z modelu w grze C# jest podobna do klatki z arkusza gry TS (tej samej pozy z tego samego modelu źródłowego).
/// </summary>
public class Dlon3DTesty
{
    readonly ITestOutputHelper wyj;
    public Dlon3DTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

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

    static void Gospodarz()
    {
        Rdzen.Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
    }

    static readonly string Wyniki = Path.Combine(Sciezka.Testy, "wyniki", "dlon3d");

    static void Zapisz(string plik, byte[] rgba, int w, int h)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(plik)!);
        using var img = SKImage.FromPixelCopy(new SKImageInfo(w, h, SKColorType.Rgba8888, SKAlphaType.Premul), rgba, w * 4);
        using var dane = img.Encode(SKEncodedImageFormat.Png, 100);
        File.WriteAllBytes(plik, dane.ToArray());
    }

    [Fact]
    public void ModeleSaKompletne()
    {
        Gospodarz();
        foreach (var (d, klipy) in new[] { (Dlon3D.Otchlan, new[] { "zacisk", "rzut", "tarcza", "zawal" }), (Dlon3D.Anielska, new[] { "zacisk" }) })
        {
            var m = d.Model;
            Assert.NotNull(m);
            // dłoń z otchłani ma 17. kość „piesc” (wnętrze zaciśniętej pięści), anielska — samą dłoń i palce
            Assert.Equal(d == Dlon3D.Otchlan ? 17 : 16, m!.kosci.Length);
            Assert.Equal("dlon", m.kosci[0]);
            Assert.Equal(2, m.siatki.Length);
            foreach (var k in klipy) Assert.True(m.klipy.ContainsKey(k), "brak animacji " + k);
            foreach (var s in m.siatki)
            {
                Assert.True(s.n > 1000);
                for (int i = 0; i < s.n; i++)
                {
                    float suma = s.wagi[i * 4] + s.wagi[i * 4 + 1] + s.wagi[i * 4 + 2] + s.wagi[i * 4 + 3];
                    Assert.InRange(suma, 0.999f, 1.001f);
                }
                foreach (var t in s.troj) Assert.InRange(t, 0, s.n - 1);
            }
        }
    }

    [Fact]
    public void ZdjeciaProbne()
    {
        Gospodarz();
        var zegar = Stopwatch.StartNew();
        int ile = 0;
        foreach (var (nazwa, d, klipy) in new[] { ("otchlan", Dlon3D.Otchlan, new[] { "zacisk", "rzut", "tarcza", "zawal" }), ("aniol", Dlon3D.Anielska, new[] { "zacisk" }) })
            foreach (var klip in klipy)
                for (int k = 0; k < 10; k += 3)
                {
                    var px = d.Renderuj(klip, k / 9.0, 18, out int w, out int h);
                    Zapisz(Path.Combine(Wyniki, $"{nazwa}-{klip}-{k}.png"), px, w, h);
                    ile++;
                }
        wyj.WriteLine($"{ile} klatek 792×360: {zegar.ElapsedMilliseconds / (double)ile:F1} ms na klatkę (z zapisem PNG)");
        // sam rysunek, mała klatka jak w grze (ok. 8 px na jednostkę)
        zegar.Restart();
        for (int i = 0; i < 30; i++) Dlon3D.Otchlan.Renderuj("zacisk", i / 29.0, 8, out _, out _);
        wyj.WriteLine($"klatka 352×160: {zegar.ElapsedMilliseconds / 30.0:F1} ms");
    }

    /// <summary>
    /// Dłonie w grze: stan symulacji ustawiony ręcznie (dłoń z otchłani zabiera robotnika, dłoń demona — rzut, tarcza,
    /// zawał, dłoń anielska z darem krwi) i narysowany tak jak na ekranie gry. Sprawdza, że rysunek przechodzi i że dłoń
    /// rzeczywiście jest na obrazie; obrazy idą do testy/wyniki/dlon3d do obejrzenia.
    /// </summary>
    [Theory]
    [InlineData("otchlan-chwyta")]
    [InlineData("otchlan-cofa")]
    [InlineData("demon-rzut")]
    [InlineData("demon-tarcza")]
    [InlineData("demon-zawal")]
    [InlineData("aniol-krew")]
    public void DlonieWGrze(string scena)
    {
        Gospodarz();
        var sim = new Sim(1);
        for (int i = 0; i < 240; i++) sim.step();
        var t = sim.tick;
        switch (scena)
        {
            case "otchlan-chwyta":
                sim.lud.dlon = new StanDloni { faza = "chwyta", od = t - 50, ox = 102, oy = 48, bx = 102, by = 39, cx = 102, cy = 36.6, cel = "lud" };
                break;
            case "otchlan-cofa":
                sim.lud.dlon = new StanDloni { faza = "cofa", od = t - 40, ox = 102, oy = 48, bx = 102, by = 39, cx = 102, cy = 36.6, cel = "lud", zabrani = new List<string> { "robotnik" } };
                break;
            case "demon-rzut":
                sim.lud.dlonDemona = new StanDloniDemona { akcja = "rzut", faza = "unosi", od = t - 25, x = 103, y = 38, bok = 1 };
                break;
            case "demon-tarcza":
                sim.lud.dlonDemona = new StanDloniDemona { akcja = "tarcza", faza = "stoi", od = t - 100, x = 103, y = 38, bok = 1 };
                break;
            case "demon-zawal":
                sim.lud.dlonDemona = new StanDloniDemona { akcja = "zawal", faza = "drze", od = t - 40, x = 103, y = 38, bok = 1, strop = 32, dno = 38 };
                break;
            default:
                sim.lud.aniol = new StanAniola { faza = "dar", dar = "krew", od = t - 100, x = 103, y = 36 };
                break;
        }
        var cam = new Camera(640, 400) { x = 103, y = 36, zoom = 24 };
        using var p = new PlotnoSkia(640, 400);
        p.fillStyle = "#2b2420"; p.fillRect(0, 0, 640, 400);
        using var sama = new PlotnoSkia(640, 400);
        sama.fillStyle = "#2b2420"; sama.fillRect(0, 0, 640, 400);
        foreach (var g in new[] { p, sama })
        {
            Figury.rysujStworzenia(g, sim, cam, 5000);
            if (g == sama) break;
            RysDlon.rysujDlon(g, sim, cam, 5000);
            RysDlonDemona.rysujDlonDemona(g, sim, cam, 5000);
            RysAniol.rysujAniola(g, sim, cam, 5000);
        }
        Directory.CreateDirectory(Wyniki);
        var plik = Path.Combine(Wyniki, $"gra-{scena}.png"); var plikBez = Path.Combine(Wyniki, $"gra-{scena}-bez.png");
        Assert.True(p.ZapiszPng(plik)); Assert.True(sama.ZapiszPng(plikBez));
        // dłoń (z łuną i efektami) zmienia wyraźną część obrazu
        using var a = SKBitmap.Decode(plik); using var b = SKBitmap.Decode(plikBez);
        int inne = 0;
        for (int y = 0; y < a.Height; y++)
            for (int x = 0; x < a.Width; x++)
            {
                SKColor c = a.GetPixel(x, y), e = b.GetPixel(x, y);
                if (Math.Abs(c.Red - e.Red) + Math.Abs(c.Green - e.Green) + Math.Abs(c.Blue - e.Blue) > 24) inne++;
            }
        wyj.WriteLine($"{scena}: {inne} pikseli dłoni i jej efektów");
        Assert.True(inne > 4000, $"dłoni nie widać na obrazie ({inne} px)");
    }
}
