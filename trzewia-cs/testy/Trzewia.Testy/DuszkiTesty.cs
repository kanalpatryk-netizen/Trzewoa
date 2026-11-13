using System.Text.Json;
using SkiaSharp;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Rysunek.Duszki;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Duszki postaci (PLAN.md, punkt 9): ta sama scena narysowana oryginalnym rysunkiem z gry TS (postacie kodem —
/// narzedzia/duszki/porownanie.ts → testy/zlote/duszki/*.png) i grą C# (duszki z dane/grafika/duszki). Symulacja jest ta
/// sama bit w bit, więc postacie stoją w tych samych miejscach i robią to samo; różnić może się tylko rysunek sylwetki
/// (klatka zamiast płynnej pozy). Test pilnuje, żeby różnica była mała, i zapisuje obraz „TS | C# | różnica”.
/// </summary>
public class DuszkiTesty
{
    readonly ITestOutputHelper wyj;
    public DuszkiTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

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

    sealed record Kamera(double x, double y, double zoom, double vw, double vh);
    sealed record Scena(string nazwa, int ziarno, int tik, int klatek, Kamera kam, double skala);

    static readonly Lazy<List<Scena>> Sceny = new(() =>
        JsonSerializer.Deserialize<List<Scena>>(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "duszki", "sceny.json")))!);

    static void Gospodarz()
    {
        Rdzen.Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
    }

    public static IEnumerable<object[]> Numery() => Enumerable.Range(0, 5).Select(i => new object[] { i });

    [Theory]
    [MemberData(nameof(Numery))]
    public void ScenaJakWTs(int nr)
    {
        Gospodarz();
        var sc = Sceny.Value[nr];
        var sim = new Sim(sc.ziarno);
        void Krok() { sim.step(); if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny"); }
        while (sim.tick < sc.tik - sc.klatek * 2 && sim.ending == null) Krok();
        var cam = new Camera(sc.kam.vw, sc.kam.vh) { x = sc.kam.x, y = sc.kam.y, zoom = sc.kam.zoom };
        int W = (int)Math.Round(sc.kam.vw * sc.skala), H = (int)Math.Round(sc.kam.vh * sc.skala);
        using var p = new PlotnoSkia(W, H);
        double czas = 1000;
        for (int i = 0; i < sc.klatek; i++)
        {
            Krok(); Krok();
            czas += 1000.0 / 60;
            p.setTransform(1, 0, 0, 1, 0, 0);
            p.fillStyle = "#2b2420"; p.fillRect(0, 0, W, H);
            p.setTransform(sc.skala, 0, 0, sc.skala, 0, 0);
            Figury.rysujStworzenia(p, sim, cam, czas);
        }
        Assert.Equal(sc.tik, sim.tick);
        var wynik = Path.Combine(Path.GetTempPath(), $"trzewia-duszki-{sc.nazwa}.png");
        Assert.True(p.ZapiszPng(wynik));

        using var cs = SKBitmap.Decode(wynik);
        using var ts = SKBitmap.Decode(Path.Combine(Sciezka.Testy, "zlote", "duszki", sc.nazwa + ".png"));
        Assert.Equal(ts.Width, cs.Width); Assert.Equal(ts.Height, cs.Height);
        // różnica: średnia po całym obrazie i po pikselach, na których w którymś obrazie jest postać (nie tło)
        var tlo = new SKColor(0x2b, 0x24, 0x20);
        double suma = 0, sumaPostaci = 0; long pikseliPostaci = 0, tylkoTs = 0, tylkoCs = 0;
        using var roznica = new SKBitmap(ts.Width, ts.Height);
        for (int y = 0; y < ts.Height; y++)
            for (int x = 0; x < ts.Width; x++)
            {
                SKColor a = ts.GetPixel(x, y), b = cs.GetPixel(x, y);
                int d = (Math.Abs(a.Red - b.Red) + Math.Abs(a.Green - b.Green) + Math.Abs(a.Blue - b.Blue)) / 3;
                suma += d;
                bool wTs = Odleglosc(a, tlo) > 12, wCs = Odleglosc(b, tlo) > 12;
                if (wTs || wCs) { sumaPostaci += d; pikseliPostaci++; if (!wCs) tylkoTs++; if (!wTs) tylkoCs++; }
                roznica.SetPixel(x, y, new SKColor((byte)Math.Min(255, d * 3), (byte)Math.Min(255, d * 3), (byte)Math.Min(255, d * 3)));
            }
        var srednia = suma / (ts.Width * ts.Height);
        var sredniaPostaci = pikseliPostaci > 0 ? sumaPostaci / pikseliPostaci : 0;
        // obraz obok obrazu: TS | C# | różnica ×3
        var obok = Path.Combine(Path.GetTempPath(), $"trzewia-duszki-{sc.nazwa}-obok.png");
        using (var sur = SKSurface.Create(new SKImageInfo(ts.Width, ts.Height * 3)))
        {
            sur.Canvas.DrawBitmap(ts, 0, 0); sur.Canvas.DrawBitmap(cs, 0, ts.Height); sur.Canvas.DrawBitmap(roznica, 0, ts.Height * 2);
            using var img = sur.Snapshot(); using var dane = img.Encode(SKEncodedImageFormat.Png, 100);
            File.WriteAllBytes(obok, dane.ToArray());
        }
        wyj.WriteLine($"{sc.nazwa}: różnica średnio {srednia:F2}/255 na obraz, {sredniaPostaci:F1}/255 na pikselach postaci ({pikseliPostaci} px; tylko w TS {tylkoTs}, tylko w C# {tylkoCs}). Obraz: {obok}");
        // postacie muszą być w tych samych miejscach i w tych samych pozach: pokrycie sylwetek zgodne w ponad 85%
        Assert.True(pikseliPostaci > 500, "na obrazie nie ma postaci");
        Assert.True((tylkoTs + tylkoCs) < 0.25 * pikseliPostaci, $"sylwetki się nie pokrywają: tylko w TS {tylkoTs}, tylko w C# {tylkoCs} z {pikseliPostaci}");
        Assert.True(sredniaPostaci < 26, $"za duża różnica na postaciach: {sredniaPostaci:F1}");
    }

    static int Odleglosc(SKColor a, SKColor b) => Math.Abs(a.Red - b.Red) + Math.Abs(a.Green - b.Green) + Math.Abs(a.Blue - b.Blue);

    /// <summary>Każdy arkusz z dane/grafika/duszki wczytuje się, ma te same klatki na każdym poziomie i strony na dysku.</summary>
    [Fact]
    public void ArkuszeSaKompletne()
    {
        Gospodarz();
        var folder = Path.Combine(Sciezka.Testy, "..", "dane", "grafika", "duszki");
        var pliki = Directory.GetFiles(folder, "*.json");
        Assert.True(pliki.Length >= 19, $"za mało arkuszy: {pliki.Length}");
        int klatek = 0;
        foreach (var plik in pliki)
        {
            var nazwa = Path.GetFileNameWithoutExtension(plik);
            var d = Duszek.Daj(nazwa);
            Assert.NotNull(d);
            Assert.True(d!.klatek > 0 && d.poziomy.Length > 0, nazwa);
            Assert.Equal(d.klatek, d.glowa.Length);
            foreach (var p in d.poziomy)
            {
                Assert.Equal(d.klatek * 7, p.klatki.Length);
                foreach (var s in p.strony) Assert.True(File.Exists(Path.Combine(folder, s)), $"{nazwa}: brak strony {s}");
            }
            foreach (var a in d.animacje.Values) Assert.True(a.od >= 0 && a.n > 0 && a.od + a.n <= d.klatek, $"{nazwa}/{a.nazwa}");
            klatek += d.klatek;
        }
        wyj.WriteLine($"{pliki.Length} arkuszy, {klatek} klatek");
    }
}
