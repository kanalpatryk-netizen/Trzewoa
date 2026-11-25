using Trzewia.Plotna;
using Trzewia.Rysunek.Ludzie;
using Trzewia.Skia;

namespace Trzewia.Testy;

/// <summary>
/// Oprawa, etap 7d: nowa postać ludzka (Rysunek/Ludzie) — pozy bez błędów liczbowych, stopa w chodzie stoi na ziemi
/// (nie ślizga się), ciosy rycerza trafiają ostrzem przed siebie dokładnie w tiku trafienia z nastaw.
/// </summary>
public class LudzieTesty
{
    static readonly string[] WSPOLNE =
    {
        "stoi", "stoi-gest", "idzie", "biegnie", "schody-gora", "schody-dol", "wspina", "spada", "czolga", "kuca-stoi", "kuca-idzie",
        "kopie", "buduje", "je", "spi", "odmawia", "skleja", "modli",
    };
    static readonly string[] RYCERZ =
    {
        "walczy-ciecie", "walczy-pchniecie", "zaklada", "garda", "podejscie", "ciecieZGory", "pchniecie", "ciecieBoczne", "ciecieOdwrotne",
        "seriaTrzech", "ciecieOdDolu", "piruet", "ciosZWyskoku", "mlynek", "finta", "egzekucja", "uderzenieTarcza", "szarzaZTarcza",
        "taranBarkiem", "kolano", "uderzenieHelmem", "kontraNapiersnika", "blokTarcza", "parowanie", "unik", "trafionyLekko",
        "trafionyMocno", "powalony-pada", "powalony-wstaje", "powalony-lezy", "sciecieGlowy",
    };

    static bool Skonczone(in PunktyPostaci q)
    {
        foreach (var (x, y) in new[] { q.biodro, q.kark, q.glowa, q.barkL, q.barkP, q.lokiecL, q.lokiecP, q.dlonL, q.dlonP, q.kolanoL, q.kolanoP, q.kostkaL, q.kostkaP, q.pietaL, q.pietaP, q.palceL, q.palceP })
            if (!double.IsFinite(x) || !double.IsFinite(y)) return false;
        return true;
    }

    [Fact]
    public void KazdaPozaJestSkonczonaIRysujeSie()
    {
        Plotno.Fabryka ??= new FabrykaSkia();
        var stroje = new[]
        {
            new Stroj { rola = "robotnik", wzor = 3 }, new Stroj { rola = "pobozny", wzor = 1 }, new Stroj { rola = "rycerz", zbroja = 0 },
            new Stroj { rola = "rycerz", zbroja = 5 },
        };
        using var p = new PlotnoSkia(160, 160);
        foreach (var s in stroje)
        {
            var nazwy = WSPOLNE.Concat(s.rola == "rycerz" ? RYCERZ : s.rola == "robotnik" ? new[] { "walczy", "modli-wznosi", "kreci", "idzie-niesie", "czolga-niesie" } : new[] { "walczy", "modli-wznosi", "czyta", "czyta-trwa" });
            foreach (var n in nazwy)
                for (int i = 0; i <= 16; i++)
                {
                    var k = Animacje.Klatka(s, n, i / 16.0);
                    var q = Postac.Punkty(k.p, 80);
                    Assert.True(Skonczone(q), $"{s.rola}/{n} u={i / 16.0}");
                    p.setTransform(1, 0, 0, 1, 80, 120);
                    Postac.Rysuj(p, 80, k.p, k.r, s);
                }
        }
    }

    [Fact]
    public void StopaWChodzieNieSlizgaSie()
    {
        // podparcie dalszej nogi: faza 0,1…0,35 (płasko na ziemi); kostka jedzie w tył równo z ziemią: S wzrostu na cykl
        var s = new Stroj { rola = "robotnik", wzor = 3 };
        double? x0 = null;
        for (int i = 0; i <= 10; i++)
        {
            var u = 0.1 + 0.025 * i;
            var q = Postac.Punkty(Animacje.Klatka(s, "idzie", u).p, 1);
            // stopa na ziemi: najniższy punkt stopy w zerze
            Assert.InRange(Math.Max(q.pietaL.y, q.palceL.y), -0.004, 0.004);
            x0 ??= q.kostkaL.x + Animacje.CHOD.S * u;
            Assert.InRange(q.kostkaL.x + Animacje.CHOD.S * u - x0.Value, -0.01, 0.01);
        }
    }

    [Theory]
    [InlineData("ciecieZGory", 102, 56)]
    [InlineData("pchniecie", 78, 40)]
    [InlineData("ciecieBoczne", 90, 48)]
    [InlineData("ciecieOdwrotne", 90, 46)]
    [InlineData("seriaTrzech", 168, 46)]
    [InlineData("seriaTrzech", 168, 86)]
    [InlineData("seriaTrzech", 168, 128)]
    [InlineData("ciecieOdDolu", 96, 54)]
    [InlineData("piruet", 132, 78)]
    [InlineData("ciosZWyskoku", 150, 96)]
    [InlineData("mlynek", 180, 42)]
    [InlineData("mlynek", 180, 138)]
    [InlineData("finta", 120, 86)]
    [InlineData("egzekucja", 168, 114)]
    [InlineData("kontraNapiersnika", 110, 70)]
    [InlineData("sciecieGlowy", 156, 100)]
    public void CiosTrafiaOstrzemPrzedSiebieWTikuTrafienia(string ruch, int dl, int traf)
    {
        Plotno.Fabryka ??= new FabrykaSkia();
        using var p = new PlotnoSkia(400, 400);
        foreach (var zbroja in new[] { 0, 5 })
        {
            var s = new Stroj { rola = "rycerz", zbroja = zbroja };
            var k = Animacje.Klatka(s, ruch, (double)traf / dl);
            p.setTransform(1, 0, 0, 1, 200, 300);
            var q = Postac.Rysuj(p, 104, k.p, k.r, s);
            // sztych daleko przed środkiem stóp, nie nad głową
            Assert.True(q.czubek.x > 104 * 0.45, $"{ruch} z{zbroja}: sztych w x={q.czubek.x / 104:F2} wzrostu");
            Assert.True(q.czubek.y > -104 * 1.2, $"{ruch} z{zbroja}: sztych za wysoko");
        }
    }
}
