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
/// Porównanie ekranów TRYBU KRĘGU TRZECIEGO z grą TS (krag-3-beta; narzedzia/ekrany/porownaj-krag.mjs →
/// testy/zlote/ekrany-krag): menu kręgu, taras kręgu na początku partii, walka z Cerberem i jego konanie — ta sama partia
/// z botem (symulacja kręgu jest z TS bit w bit), ta sama kamera i ten sam zegar ekranu. Nie piksel w piksel: krag-3-beta
/// stoi na starszej Alphie (rycina z losowym szumem), a postacie w C# są duszkami. Test liczy różnice (do raportu)
/// i zapisuje testy/wyniki/ekrany-krag-*.png: TS | C# | różnica ×4.
/// </summary>
public class PorownanieEkranowKregu
{
    readonly ITestOutputHelper wyj;
    public PorownanieEkranowKregu(ITestOutputHelper wyj) { this.wyj = wyj; }

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

    sealed record Scena(string nazwa, string rodzaj, double teraz, double? ziarno, double? tik, double? x, double? y, double? zoom);
    sealed record Spis(int w, int h, double? lw, double? lh, List<Scena> sceny);

    [Fact]
    public void Ekrany()
    {
        var folder = Path.Combine(Sciezka.Testy, "zlote", "ekrany-krag");
        var plik = Path.Combine(folder, "sceny.json");
        if (!File.Exists(plik)) return;
        var spis = JsonSerializer.Deserialize<Spis>(File.ReadAllText(plik))!;
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        SettingsStore.ustawienia.rycinaWWatku = false;
        // porównanie z TS: bez nowej oprawy walki (Visual/VisualConfig.cs) — TS jej nie ma
        using var bezOprawy = new BezOprawy();
        Fonts.zaladujKroje();
        Krag.Ustaw(true);
        try
        {
            int W = spis.w, H = spis.h;
            double lw = spis.lw ?? W, lh = spis.lh ?? H, sk = W / lw;
            using var p = new PlotnoSkia(W, H);
            var app = new Kontekst { ctx = p, w = lw, h = lh };
            var gra = new EkranGry(app); app.zarejestruj(gra);
            app.zarejestruj(new EkranMenu(app));
            var katalog = Path.Combine(Sciezka.Testy, "wyniki");
            Directory.CreateDirectory(katalog);
            foreach (var sc in spis.sceny)
            {
                if (sc.rodzaj == "menu")
                {
                    app.idz("menu");
                    for (int i = 0; i < 3; i++) { p.setTransform(sk, 0, 0, sk, 0, 0); app.aktywny!.rysuj(p, lw, lh, sc.teraz + i); }
                }
                else
                {
                    var ziarno = sc.ziarno!.Value;
                    gra.nowaGra(ziarno, zWstepem: false);
                    var sim = new Sim(ziarno);
                    while (sim.tick < sc.tik!.Value && sim.ending == null) { sim.step(); if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny"); }
                    gra.sim = sim;
                    app.idz("gra");
                    var boss = sim.creatures.FirstOrDefault(c => c.boss != null && !c.dead);
                    double cx = sc.x ?? boss?.x ?? sim.world.coreX, cy = sc.y ?? (boss != null ? boss.y - 2 : sim.world.coreY);
                    for (int i = 0; i < 3; i++)
                    {
                        gra.pokazMiejsce(cx, cy, sc.zoom); gra.recznaKamera = true;
                        p.setTransform(sk, 0, 0, sk, 0, 0); gra.rysuj(p, lw, lh, sc.teraz + i * 40);
                    }
                }
                var cs = Path.Combine(katalog, $"ekrany-krag-cs-{sc.nazwa}.png");
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
                using (var f = File.Create(Path.Combine(katalog, $"ekrany-krag-{sc.nazwa}.png"))) dane.SaveTo(f);
                wyj.WriteLine($"{sc.nazwa}: średnia różnica {suma / (W * H):F1}/255, różnych o > 24: {100.0 * rozne / (W * H):F1}%");
            }
        }
        finally { Krag.Ustaw(false); }
    }
}
