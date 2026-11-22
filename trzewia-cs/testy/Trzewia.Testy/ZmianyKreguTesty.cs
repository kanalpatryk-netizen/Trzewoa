using Trzewia.Nastawy;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Zmiany Kręgu po porcie (Symulacja/ZmianyKregu.cs, prośby użytkownika z 20.11): bez Cieni Żarłoków, ruchy wieloetapowe
/// jako jedno obrażenie, naprawy błędów (krata lochu w walce, rycerz poza kreską drogi, mnisi z księgą, kurier z jedzeniem,
/// zasypana droga bez grabarzy) — na ziarnach, na których te błędy kończyły partię przegraną albo bez końca.
/// </summary>
public class ZmianyKreguTesty
{
    readonly ITestOutputHelper wyj;
    public ZmianyKreguTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed class WKregu : IDisposable
    {
        readonly bool zmiany = ZmianyKregu.Wlaczone, wzor = WalkaWzor.Wlaczony;
        public WKregu() { Krag.Ustaw(true); ZmianyKregu.Wlaczone = true; WalkaWzor.Wlaczony = true; }
        public void Dispose() { ZmianyKregu.Wlaczone = zmiany; WalkaWzor.Wlaczony = wzor; Krag.Ustaw(false); }
    }

    static void Krok(Sim sim)
    {
        sim.step();
        if (sim.tick % Bot.BOT_CO == 0) { Bot.ruchBota(sim, "rozsadny"); if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, "rozsadny"); }
    }

    [Fact]
    public void BezCieniTylkoCerber()
    {
        using var _ = new WKregu();
        var sim = new Sim(3);
        var widziani = new HashSet<double>();
        var bossBył = false;
        while (sim.ending == null && sim.tick < 200000)
        {
            Krok(sim);
            if (sim.tick % 30 != 0) continue;
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.straznik != true) continue;
                if (c.boss == null) widziani.Add(c.id); else bossBył = true;
            }
        }
        Assert.Empty(widziani);
        Assert.True(bossBył);
        Assert.StartsWith("uwolnienie", sim.ending);
    }

    [Fact]
    public void RuchyWieloetapoweJednoObrazenieNaOstatnim()
    {
        using var _ = new WKregu();
        // Cerber: rytm liczy się do ostatniego ugryzienia (dwie paszcze — 118. tik, łapa na piersi — 150.)
        Assert.Equal(118, Walka.tikTrafieniaBossa(NastawyWalka.RUCHY_BOSSA["podwojnyZamach"]));
        Assert.Equal(150, Walka.tikTrafieniaBossa(NastawyWalka.RUCHY_BOSSA["przygniecenie"]));
        Assert.Equal(70, Walka.tikTrafieniaBossa(NastawyWalka.RUCHY_BOSSA["zGory"]));
        // rycerz: seria trzech cięć i młynek wracają do walki — w partii rycerz używa ruchów wieloetapowych, a każdy taki ruch
        // zostawia jedną ranę (na ostatnim cięciu) i zera przed nią. (Walka trwa około minuty — w jednej partii takiego ruchu
        // może nie być wcale, więc partie po kolei, aż się trafi.)
        var wielo = 0;
        foreach (var ziarno in new double[] { 5, 3, 13, 12, 1 })
        {
            var sim = new Sim(ziarno);
            RuchTrwa? poprz = null;
            while (sim.ending == null && sim.tick < 200000)
            {
                Krok(sim);
                var r = sim.creatures.FirstOrDefault(c => !c.dead && Lud.rolaPostaci(c) == "rycerz");
                var R = r?.ruch;
                if (poprz != null && R != poprz && Walka.Ruch(poprz.id)?.traf is { Length: > 1 } tr && poprz.traf > 0)
                {
                    wielo++;
                    Assert.Equal(tr.Length, poprz.zadane.Count);
                    for (var k = 0; k < tr.Length - 1; k++) Assert.Equal(0, poprz.zadane[k]);
                }
                poprz = R;
            }
            wyj.WriteLine($"ziarno {ziarno}: ruchów wieloetapowych rycerza razem {wielo}");
            if (wielo > 0) break;
        }
        Assert.True(wielo > 0);
    }

    [Fact]
    public void KrataLochuWyrwanaWWalceZCerberem()
    {
        using var _ = new WKregu();
        var sim = new Sim(12);
        var sprawdzono = false;
        while (sim.ending == null && sim.tick < 200000)
        {
            Krok(sim);
            if (sim.tick % 60 == 0 && ZmianyKregu.WalkaZCerberem(sim) && (sim.lud.pomnik?.faza == "walka"))
            {
                Assert.Equal(1, Brama.stanBramy(sim).otwarcie);
                sprawdzono = true;
            }
        }
        Assert.True(sprawdzono);
        Assert.StartsWith("uwolnienie", sim.ending);
    }

    /// <summary>
    /// Ziarna, na których przed naprawami partia była przegrana albo nie kończyła się wcale: 12 (rycerz za kratą lochu),
    /// 56 (rycerz w bocznej komorze szybu), 47 (kurier z jedzeniem zawracał — rycerz umierał z głodu). Teraz każda kończy
    /// się wygraną.
    /// </summary>
    [Theory]
    [InlineData(12)]
    [InlineData(56)]
    [InlineData(47)]
    public void NaprawioneZiarnaKonczaSieWygrana(double ziarno)
    {
        using var _ = new WKregu();
        var sim = new Sim(ziarno);
        while (sim.ending == null && sim.tick < 250000) Krok(sim);
        wyj.WriteLine($"ziarno {ziarno}: {sim.ending} po {sim.tick / 7200.0:F1} min");
        Assert.StartsWith("uwolnienie", sim.ending);
    }

    /// <summary>
    /// Ziarna 35 i 109: rycerz ginie przed walką, grabarze w walce — zostają mnisi z księgami. Dawniej gra stała bez końca
    /// (Cerber zrastał się szybciej, niż go ranili, albo droga była zasypana, a odkopać nie miał kto). Teraz partia się
    /// kończy — wygraną albo przegraną, ale się kończy.
    /// </summary>
    [Theory]
    [InlineData(35)]
    [InlineData(109)]
    public void OstatniaDeskaPartiaSieKonczy(double ziarno)
    {
        using var _ = new WKregu();
        var sim = new Sim(ziarno);
        // (sami mnisi z księgami walczą długo — ziarno 35 kończy się po ok. 34 min gry)
        while (sim.ending == null && sim.tick < 400000) Krok(sim);
        wyj.WriteLine($"ziarno {ziarno}: {sim.ending} po {sim.tick / 7200.0:F1} min");
        Assert.NotNull(sim.ending);
    }

    [Fact]
    public void BezZmianKragJakWTS()
    {
        // wyłącznik zmian gasi też walkę według wzorów (TS jej nie ma)
        using var _ = new WKregu();
        ZmianyKregu.Wlaczone = false;
        Assert.False(ZmianyKregu.Aktywne);
        Assert.False(WalkaWzor.Aktywny);
        Assert.False(ZmianyKregu.BezCieni);
    }
}
