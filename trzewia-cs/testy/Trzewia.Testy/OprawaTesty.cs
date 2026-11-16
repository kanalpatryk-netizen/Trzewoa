using Trzewia.Aplikacja;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Visual;

namespace Trzewia.Testy;

/// <summary>Oprawa walki z bossem (docs/plan-oprawy-cerber.md): wyłącznik F9 i przełącznik --oprawa.</summary>
public class OprawaTesty
{
    sealed class Okno : IOknoGry
    {
        public int PikseleW => 320;
        public int PikseleH => 200;
        public double Dpr => 1;
        public bool NowaPowierzchnia { get; set; }
        public void Podepnij(IPlotno ctx, int pw, int ph, bool wprost) { }
        public void Rozciagnij(IPlotno ctx) { }
    }

    /// <summary>Ekran, który zapisuje, jakie klawisze do niego doszły.</summary>
    sealed class Sluchacz : Ekran
    {
        public readonly List<string> klawisze = new();
        public override string nazwa => "sluchacz";
        public override void krok(double dt, double teraz) { }
        public override void rysuj(IPlotno ctx, double w, double h, double teraz) { }
        public override void klawisz(Akcja? akcja, Klawisz e) => klawisze.Add(e.key);
    }

    [Fact]
    public void F9PrzelaczaOpraweINieDochodziDoEkranu()
    {
        var bylo = VisualConfig.Wlaczone;
        try
        {
            Plotno.Fabryka ??= new FabrykaSkia();
            using var p = new PlotnoSkia(320, 200);
            var app = new App(new Okno(), p);
            var ekran = new Sluchacz();
            app.zarejestruj(ekran);
            app.idz("sluchacz");
            VisualConfig.Wlaczone = true;
            app.NaKlawisz(new Klawisz { key = "F9" });
            Assert.False(VisualConfig.Wlaczone);
            app.NaKlawisz(new Klawisz { key = "F9" });
            Assert.True(VisualConfig.Wlaczone);
            app.NaKlawisz(new Klawisz { key = "a" });
            Assert.Equal(new[] { "a" }, ekran.klawisze);
            // główny wyłącznik gasi każdy efekt, nawet z włączoną flagą
            VisualConfig.Wlaczone = false;
            Assert.False(VisualConfig.Aktywne(true));
            VisualConfig.Wlaczone = true;
            Assert.True(VisualConfig.Aktywne(true));
            Assert.False(VisualConfig.Aktywne(false));
        }
        finally { VisualConfig.Wlaczone = bylo; }
    }

    /// <summary>Po F9 w prawym górnym rogu przez chwilę widać napis; bez F9 róg zostaje taki, jak był.</summary>
    [Fact]
    public void NapisPoF9()
    {
        var bylo = VisualConfig.Wlaczone;
        var byloO = VisualConfig.PrzelaczonoO;
        try
        {
            Plotno.Fabryka ??= new FabrykaSkia();
            Fonts.zaladujKroje();
            using var p = new PlotnoSkia(320, 200);
            var app = new App(new Okno(), p);
            app.zarejestruj(new Sluchacz());
            app.idz("sluchacz");
            int[] rog()
            {
                var plik = Path.Combine(Path.GetTempPath(), "trzewia-f9.png");
                p.ZapiszPng(plik);
                using var bmp = SkiaSharp.SKBitmap.Decode(plik);
                var px = new List<int>();
                for (int y = 14; y < 44; y++) for (int x = 120; x < 306; x++) px.Add((int)(uint)bmp.GetPixel(x, y));
                return px.ToArray();
            }
            VisualConfig.PrzelaczonoO = double.NegativeInfinity;
            app.Klatka(Wydajnosc.Teraz());
            var bez = rog();
            app.NaKlawisz(new Klawisz { key = "F9" });
            app.Klatka(Wydajnosc.Teraz());
            var z = rog();
            Assert.NotEqual(bez, z);
            var katalog = Path.Combine(Sciezka.Testy, "wyniki");
            Directory.CreateDirectory(katalog);
            p.ZapiszPng(Path.Combine(katalog, "oprawa-napis-f9.png"));
        }
        finally { VisualConfig.Wlaczone = bylo; VisualConfig.PrzelaczonoO = byloO; }
    }

    [Theory]
    [InlineData("wl", true)]
    [InlineData("WŁ", true)]
    [InlineData("on", true)]
    [InlineData("wyl", false)]
    [InlineData("wył", false)]
    [InlineData("0", false)]
    [InlineData("może", null)]
    public void PrzelacznikOprawa(string napis, bool? oczekiwane) => Assert.Equal(oczekiwane, VisualConfig.Czytaj(napis));

    /// <summary>Etap 1: pula błysków — stała wielkość, nowy błysk wypiera najstarszy, słaby (siła 0) się nie zapisuje.</summary>
    [Fact]
    public void PulaBlyskow()
    {
        LightEvents.Wyczysc();
        var czerwony = new double[] { 255, 54, 24 };
        LightEvents.Zegar = 1000;
        LightEvents.Flash(czerwony, 0, 100);
        Assert.DoesNotContain(LightEvents.Pula, b => b.jest);
        for (int i = 0; i < LightEvents.MAKS + 3; i++)
        {
            LightEvents.Zegar = 1000 + i;
            LightEvents.Flash(czerwony, 0.5, 10000, 10, 20, 5);
        }
        Assert.Equal(LightEvents.MAKS, LightEvents.Pula.Count(b => b.jest));
        // trzy najstarsze wyparte: zostały błyski od 1003 do 1010
        Assert.Equal(1003, LightEvents.Pula.Min(b => b.od));
        Assert.Equal("rgb(255,54,24)", LightEvents.Pula[0].styl);
        LightEvents.Flash(czerwony, 3, 50);
        Assert.Contains(LightEvents.Pula, b => b.jest && b.sila == 1 && b.promien == 0);
        LightEvents.Wyczysc();
        Assert.DoesNotContain(LightEvents.Pula, b => b.jest);
    }
}

/// <summary>
/// Na czas porównania z grą TS (PorownanieEkranow, PorownaniePlyty, PodgladPlyty): nowa oprawa walki wyłączona — TS jej
/// nie ma, a z wyłączoną oprawą gra C# ma wyglądać 1:1 jak dotąd. <c>using var _ = new BezOprawy();</c>
/// </summary>
sealed class BezOprawy : IDisposable
{
    readonly bool bylo = VisualConfig.Wlaczone;
    public BezOprawy() { VisualConfig.Wlaczone = false; }
    public void Dispose() => VisualConfig.Wlaczone = bylo;
}
