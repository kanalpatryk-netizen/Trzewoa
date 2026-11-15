using System.Text.Json;
using SkiaSharp;
using Trzewia.Aplikacja;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Końcowe porównanie ekranów C# z grą TS (narzedzia/ekrany/porownaj.mjs → testy/zlote/ekrany): menu, ustawienia,
/// osiągnięcia, atlas z menu, gra na tym samym ziarnie i tiku, kronika. Nie piksel w piksel — Chrome i Skia rysują
/// ścieżki i pismo trochę inaczej, postacie w C# są duszkami, a animacje zależne od zegara (puls, oddech, serce)
/// trafiają w inną chwilę. Test liczy średnią różnicę i odsetek pikseli różnych o więcej niż 24/255 (do raportu) i zapisuje
/// testy/wyniki/ekrany-*.png: TS | C# | różnica ×4.
/// </summary>
public class PorownanieEkranow
{
    readonly ITestOutputHelper wyj;
    public PorownanieEkranow(ITestOutputHelper wyj) { this.wyj = wyj; }

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

    sealed record Scena(string nazwa, string rodzaj, double? po, double? ziarno, double? tik);
    sealed record Spis(int w, int h, double? lw, double? lh, List<Scena> sceny);

    /// <summary>Skala 1 (1366×820) i Full HD (1920×1080, skala ≈ 1,32 — przekształcenia, których skala 1 nie pokazuje).</summary>
    [Theory]
    [InlineData("")]
    [InlineData("1920x1080")]
    public void Ekrany(string rozdzielczosc)
    {
        var folder = Path.Combine(Sciezka.Testy, "zlote", "ekrany", rozdzielczosc);
        var plik = Path.Combine(folder, "sceny.json");
        if (!File.Exists(plik)) return;
        var spis = JsonSerializer.Deserialize<Spis>(File.ReadAllText(plik))!;
        var przyrostek = rozdzielczosc == "" ? "" : $"-{rozdzielczosc}";
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        SettingsStore.ustawienia.rycinaWWatku = false;
        Fonts.zaladujKroje();
        int W = spis.w, H = spis.h;
        double lw = spis.lw ?? W, lh = spis.lh ?? H, sk = W / lw;
        using var p = new PlotnoSkia(W, H);
        var app = new Kontekst { ctx = p, w = lw, h = lh };
        var gra = new EkranGry(app); app.zarejestruj(gra);
        app.zarejestruj(new EkranMenu(app));
        app.zarejestruj(new EkranBestiariusza(app));
        app.zarejestruj(new EkranUstawien(app));
        app.zarejestruj(new EkranKroniki(app));
        app.zarejestruj(new EkranOsiagniec(app));
        var katalog = Path.Combine(Sciezka.Testy, "wyniki");
        Directory.CreateDirectory(katalog);
        foreach (var sc in spis.sceny)
        {
            if (sc.rodzaj == "ekran")
            {
                app.idz(sc.nazwa);
                var teraz = Wydajnosc.Teraz() + sc.po!.Value;
                for (int i = 0; i < 3; i++) { p.setTransform(sk, 0, 0, sk, 0, 0); app.aktywny!.rysuj(p, lw, lh, teraz + i); }
            }
            else if (sc.rodzaj == "gra")
            {
                gra.nowaGra(sc.ziarno!.Value);
                app.idz("gra");
                while (gra.sim.tick < sc.tik!.Value && gra.sim.ending == null) gra.sim.step();
                var teraz = Wydajnosc.Teraz();
                for (int i = 0; i < 3; i++) { p.setTransform(sk, 0, 0, sk, 0, 0); gra.rysuj(p, lw, lh, teraz + i * 40); }
            }
            else
            {
                gra.sim.ending = "sen";
                app.idz("kronika", gra.sim);
                var teraz = Wydajnosc.Teraz() + sc.po!.Value;
                for (int i = 0; i < 3; i++) { p.setTransform(sk, 0, 0, sk, 0, 0); app.aktywny!.rysuj(p, lw, lh, teraz + i); }
            }
            var cs = Path.Combine(katalog, $"ekrany-cs-{sc.nazwa}{przyrostek}.png");
            Assert.True(p.ZapiszPng(cs));
            using var bTs = SKBitmap.Decode(Path.Combine(folder, sc.nazwa + ".png"));
            using var bCs = SKBitmap.Decode(cs);
            double suma = 0; long rozne = 0;
            using var zlozony = new SKBitmap(W * 3, H);
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    var a = bTs.GetPixel(x, y); var b = bCs.GetPixel(x, y);
                    int dr = Math.Abs(a.Red - b.Red), dg = Math.Abs(a.Green - b.Green), db = Math.Abs(a.Blue - b.Blue);
                    var d = Math.Max(dr, Math.Max(dg, db));
                    suma += (dr + dg + db) / 3.0;
                    if (d > 24) rozne++;
                    zlozony.SetPixel(x, y, a);
                    zlozony.SetPixel(W + x, y, b);
                    var r4 = (byte)Math.Min(255, d * 4);
                    zlozony.SetPixel(2 * W + x, y, new SKColor(r4, r4, r4));
                }
            using (var img = SKImage.FromBitmap(zlozony))
            using (var dane = img.Encode(SKEncodedImageFormat.Png, 100))
            using (var f = File.Create(Path.Combine(katalog, $"ekrany-{sc.nazwa}{przyrostek}.png"))) dane.SaveTo(f);
            wyj.WriteLine($"{sc.nazwa}{przyrostek}: średnia różnica {suma / (W * H):F1}/255, różnych o > 24: {100.0 * rozne / (W * H):F1}%");
        }
    }
}
