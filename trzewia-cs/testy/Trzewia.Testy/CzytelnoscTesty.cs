using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Visual;

namespace Trzewia.Testy;

/// <summary>
/// Oprawa walki, etap 2 (czytelność): etykiety nad postaciami nigdy nie nachodzą na siebie i nie wychodzą z kadru,
/// także gdy wiele postaci stoi w jednym miejscu; znaki spoza krojów gry zamieniają się tylko z włączoną oprawą.
/// </summary>
public class CzytelnoscTesty
{
    static void przygotuj()
    {
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        Fonts.zaladujKroje();
    }

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

    static readonly string[] TEKSTY = { "na miejscu", "garść jedzenia w paszczę!", "mnisi", "do modlitwy", "idę", "zetnę go!", "głodny", "tu kopię" };

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(7)]
    public void EtykietyNieNachodza(int ziarno)
    {
        przygotuj();
        const int W = 1280, H = 560;
        using var p = new PlotnoSkia(W, H);
        var los = new Random(ziarno);
        Czytelnosc.SkalaUi = 1;
        Czytelnosc.PoczatekKlatki(p);
        // trzy skupiska postaci (jak walka przy bossie) i kilka przy krawędziach kadru
        int n = 0;
        for (int i = 0; i < 30; i++)
        {
            double x = i < 24 ? 300 + (i % 3) * 320 + los.NextDouble() * 60 : los.NextDouble() < 0.5 ? 5 : W - 5;
            double y = i < 24 ? 260 + los.NextDouble() * 40 : 20 + los.NextDouble() * 30;
            Czytelnosc.DodajEtykiete(TEKSTY[los.Next(TEKSTY.Length)], x, y, los.Next(2) + 1, los.Next(140), 1);
            n++;
        }
        Czytelnosc.RysujEtykiety(p, W, H);
        var ul = Czytelnosc.UlozoneEtykiety().ToList();
        Assert.Equal(n, ul.Count);
        for (int i = 0; i < ul.Count; i++)
        {
            var a = ul[i];
            Assert.True(a.x >= 0 && a.y >= 0 && a.x + a.w <= W && a.y + a.h <= H, $"etykieta {i} poza kadrem: {a}");
            for (int j = i + 1; j < ul.Count; j++)
            {
                var b = ul[j];
                Assert.False(Czytelnosc.Nachodza(a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h), $"etykiety {i} i {j} nachodzą na siebie: {a} / {b}");
            }
        }
        var katalog = Path.Combine(Sciezka.Testy, "wyniki");
        Directory.CreateDirectory(katalog);
        Assert.True(p.ZapiszPng(Path.Combine(katalog, $"etykiety-{ziarno}.png")));
    }

    [Fact]
    public void GlifyTylkoZOprawa()
    {
        var bylo = (VisualConfig.Wlaczone, VisualConfig.Czytelnosc);
        try
        {
            VisualConfig.Wlaczone = true; VisualConfig.Czytelnosc = true;
            Assert.Equal("Planuj »", Glify.Popraw("Planuj →"));
            Assert.Equal("puść czas »", Glify.Popraw("puść czas ▸"));
            Assert.Equal("zwiń", Glify.Popraw("zwiń ▴"));
            Assert.Equal("·  CERBER  ·", Glify.Popraw("✠  CERBER  ✠"));
            Assert.Equal("w górę", Glify.Popraw("↑"));
            // napis bez obcych znaków — ten sam obiekt (bez alokacji)
            var zwykly = "Zetnij Cerberowi trzy głowy — zejdziecie niżej";
            Assert.Same(zwykly, Glify.Popraw(zwykly));
            VisualConfig.Wlaczone = false;
            Assert.Equal("Planuj →", Glify.Popraw("Planuj →"));
        }
        finally { (VisualConfig.Wlaczone, VisualConfig.Czytelnosc) = bylo; }
    }
}
