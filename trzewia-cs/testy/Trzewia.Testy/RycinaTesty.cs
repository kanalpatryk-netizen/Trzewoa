using System.IO.Compression;
using System.Text.Json;
using SkiaSharp;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Rycina świata (render/engrave.ts → Rysunek/Swiat/Engraver.cs): ta sama odbitka liczona oryginalnym kodem TS w Chromium
/// (narzedzia/rycina/wzorzec.mjs → testy/zlote/rycina) i grą C#. Symulacja jest bit w bit ta sama, więc odbitka ma być
/// ta sama piksel w piksel — i obraz ryciny, i bufor źródeł światła (poświata).
/// </summary>
public class RycinaTesty
{
    readonly ITestOutputHelper wyj;
    public RycinaTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed record Kam(double x, double y, double zoom, double vw, double vh);
    sealed record Scena(string nazwa, int ziarno, int tik, Kam kam, double czas, bool fresk, int aw, int ah, double dx, double dy);

    static readonly Lazy<List<Scena>> Sceny = new(() =>
        JsonSerializer.Deserialize<List<Scena>>(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "rycina", "sceny.json")))!);

    public static IEnumerable<object[]> Numery() => Enumerable.Range(0, 8).Select(i => new object[] { i });

    static byte[] Piksele(string png, out int w, out int h)
    {
        using var codec = SKCodec.Create(png);
        w = codec.Info.Width; h = codec.Info.Height;
        var info = new SKImageInfo(w, h, SKColorType.Rgba8888, SKAlphaType.Unpremul);
        using var bmp = new SKBitmap(info);
        Assert.Equal(SKCodecResult.Success, codec.GetPixels(info, bmp.GetPixels()));
        return bmp.Bytes;
    }

    [Theory]
    [MemberData(nameof(Numery))]
    public void OdbitkaJakWTs(int nr)
    {
        var sc = Sceny.Value[nr];
        var sim = new Sim(sc.ziarno);
        while (sim.tick < sc.tik && sim.ending == null) { sim.step(); if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny"); }
        var e = new Engraver();
        e.resize(sc.kam.vw, sc.kam.vh, 1);
        e.fresk = sc.fresk;
        e.zrodla = RycinaZrodla.zrodlaSwiatla(sim);
        e.rowne = Grzbiet.rowneW(sim.world);
        var kam = new KameraRyciny(sc.kam.x, sc.kam.y, sc.kam.zoom, sc.kam.vw, sc.kam.vh);
        var zegar = System.Diagnostics.Stopwatch.StartNew();
        e.rebuild(sim.world, sim.tick, kam, sc.czas);
        var ms = zegar.Elapsed.TotalMilliseconds;
        Assert.Equal(sc.aw, e.aw); Assert.Equal(sc.ah, e.ah);
        Assert.Equal(sc.dx, e.dx, 9); Assert.Equal(sc.dy, e.dy, 9);

        var ts = Piksele(Path.Combine(Sciezka.Testy, "zlote", "rycina", sc.nazwa + ".png"), out var w, out var h);
        Assert.Equal(e.aw, w); Assert.Equal(e.ah, h);
        byte[] emisTs;
        using (var gz = new GZipStream(File.OpenRead(Path.Combine(Sciezka.Testy, "zlote", "rycina", sc.nazwa + ".emis.gz")), CompressionMode.Decompress))
        using (var m = new MemoryStream()) { gz.CopyTo(m); emisTs = m.ToArray(); }

        int inne = 0, maks = 0, inneE = 0, maksE = 0, pierwszy = -1;
        var roznica = new byte[w * h * 4];
        for (int i = 0; i < w * h; i++)
        {
            int d = 0, dE = 0;
            for (int c = 0; c < 4; c++)
            {
                d = Math.Max(d, Math.Abs(ts[i * 4 + c] - e.dane[i * 4 + c]));
                dE = Math.Max(dE, Math.Abs(emisTs[i * 4 + c] - e.edane[i * 4 + c]));
            }
            if (d > 0) { inne++; if (pierwszy < 0) pierwszy = i; }
            if (dE > 0) inneE++;
            maks = Math.Max(maks, d); maksE = Math.Max(maksE, dE);
            byte v = (byte)Math.Min(255, d * 40);
            roznica[i * 4] = v; roznica[i * 4 + 1] = v; roznica[i * 4 + 2] = v; roznica[i * 4 + 3] = 255;
        }
        var folder = Path.Combine(Sciezka.Testy, "wyniki", "rycina");
        Directory.CreateDirectory(folder);
        void Zapisz(string plik, byte[] px)
        {
            using var img = SKImage.FromPixelCopy(new SKImageInfo(w, h, SKColorType.Rgba8888, SKAlphaType.Unpremul), px, w * 4);
            using var dane = img.Encode(SKEncodedImageFormat.Png, 100);
            File.WriteAllBytes(Path.Combine(folder, plik), dane.ToArray());
        }
        Zapisz(sc.nazwa + "-cs.png", e.dane);
        Zapisz(sc.nazwa + "-roznica.png", roznica);
        wyj.WriteLine($"{sc.nazwa}: {ms:F1} ms; różnych pikseli ryciny {inne} (najwięcej {maks}/255{(pierwszy >= 0 ? $", pierwszy x={pierwszy % w} y={pierwszy / w}" : "")}), poświaty {inneE} (najwięcej {maksE})");
        Assert.Equal(0, inne);
        Assert.Equal(0, inneE);
    }
}

public class RycinaWydajnosc
{
    readonly ITestOutputHelper wyj;
    public RycinaWydajnosc(ITestOutputHelper wyj) { this.wyj = wyj; }

    /// <summary>Czas pełnej odbitki 1920×1080 i odbitki po przesunięciu kamery o kilka pikseli (tylko pomiar, bez progu).</summary>
    [Fact]
    public void PelnyEkran()
    {
        var sim = new Sim(1);
        while (sim.tick < 9000) { sim.step(); if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny"); }
        var e = new Engraver();
        e.resize(1920, 1080, 1);
        e.zrodla = RycinaZrodla.zrodlaSwiatla(sim);
        e.rowne = Grzbiet.rowneW(sim.world);
        var kam = new KameraRyciny(100, 40, 14 * 1080 / 820.0, 1920, 1080);
        e.rebuild(sim.world, sim.tick, kam, 1000);
        var z = System.Diagnostics.Stopwatch.StartNew();
        for (int i = 0; i < 5; i++) { e.rebuild(sim.world, sim.tick, new KameraRyciny(100 + i * 7, 40, 14 * 1080 / 820.0 * (1 + i * 0.001), 1920, 1080), 1000 + i); }
        wyj.WriteLine($"pełna odbitka 1920×1080: {z.Elapsed.TotalMilliseconds / 5:F1} ms (rdzeni: {Environment.ProcessorCount})");
        z.Restart();
        for (int i = 0; i < 20; i++) e.rebuild(sim.world, sim.tick, new KameraRyciny(100 + i * 0.07, 40, 14 * 1080 / 820.0 * 1.004, 1920, 1080), 2000 + i * 16);
        wyj.WriteLine($"odbitka po przesunięciu kamery (pamięć kafli): {z.Elapsed.TotalMilliseconds / 20:F1} ms");
        z.Restart();
        for (int i = 0; i < 20; i++) e.rebuild(sim.world, sim.tick, new KameraRyciny(100.49, 40, 14 * 1080 / 820.0 * 1.004, 1920, 1080), 3000 + i * 16);
        wyj.WriteLine($"odbitka przy stojącej kamerze: {z.Elapsed.TotalMilliseconds / 20:F1} ms");
    }
}
