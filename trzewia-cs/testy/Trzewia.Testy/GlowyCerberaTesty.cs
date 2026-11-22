using Trzewia.Nastawy;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Etap 6 — mechanika Cerbera (Symulacja/GlowyCerbera.cs) po decyzjach z 22.11: zostały ataki głów (bez zapowiedzi na
/// płycie); wyboru głowy, karmienia i dłoni z otchłani w walce nie ma.
/// </summary>
public class GlowyCerberaTesty
{
    readonly ITestOutputHelper wyj;
    public GlowyCerberaTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

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
    public void KazdaGlowaMaSwojAtak()
    {
        using var _ = new WKregu();
        Assert.Equal(GlowyCerbera.PITBULL, GlowyCerbera.GlowaRuchu("zGory"));
        Assert.Equal(GlowyCerbera.PITBULL, GlowyCerbera.GlowaRuchu("podciecie"));
        Assert.Equal(GlowyCerbera.WILK, GlowyCerbera.GlowaRuchu("wybuchAureoli"));
        Assert.Equal(GlowyCerbera.DOBERMAN, GlowyCerbera.GlowaRuchu("tchnienie"));
        Assert.Null(GlowyCerbera.GlowaRuchu("biczLancucha"));
        Assert.Same(GlowyCerbera.GRYZIE, GlowyCerbera.BronRuchu("zGory"));
        Assert.Same(GlowyCerbera.OGIEN, GlowyCerbera.BronRuchu("tchnienie"));
        Assert.Same(GlowyCerbera.WYJE, GlowyCerbera.BronRuchu("wybuchAureoli"));
        Assert.Same(WalkaWzor.CERBER, GlowyCerbera.BronRuchu("zamach"));
        // pozostałe głowy przyspieszają: przerwa × 0,8 po jednej ściętej
        var b = new Creature { boss = "demon" };
        Assert.Equal(120, GlowyCerbera.PrzerwaBossaT(b, 120));
        b.glowyOdciete = new List<GlowaOdcieta> { new GlowaOdcieta { nr = 2 } };
        Assert.Equal(96, GlowyCerbera.PrzerwaBossaT(b, 120));
        // ścięta głowa nie atakuje
        Assert.False(GlowyCerbera.MozeAtakowac(b, GlowyCerbera.PITBULL));
        // bez zmian kręgu — ruchy jak w TS (żadnej głowy)
        ZmianyKregu.Wlaczone = false;
        Assert.Null(GlowyCerbera.GlowaRuchu("zGory"));
    }

    /// <summary>Walka bez karmienia i bez dłoni: nikt nie rzuca Cerberowi jedzenia, dłoń z otchłani nie wstaje.</summary>
    [Theory]
    [InlineData(3)]
    [InlineData(10)]
    public void WalkaBezKarmieniaIDloni(double ziarno)
    {
        using var _ = new WKregu();
        var sim = new Sim(ziarno);
        var dlonWstala = false;
        while (sim.ending == null && sim.tick < 250000)
        {
            Krok(sim);
            if (!string.IsNullOrEmpty(sim.lud.dlonDemona?.akcja)) dlonWstala = true;
        }
        wyj.WriteLine($"ziarno {ziarno}: {sim.ending}, karmień {sim.lud.krag?.okupow ?? 0}, dłoń {dlonWstala}");
        Assert.StartsWith("uwolnienie", sim.ending);
        Assert.Equal(0, sim.lud.krag?.okupow ?? 0);
        Assert.False(dlonWstala);
    }

    /// <summary>Głowy ścina się po kolei: pitbull, wilk, doberman.</summary>
    [Fact]
    public void GlowySpadajaPoKolei()
    {
        using var _ = new WKregu();
        var sim = new Sim(5);
        while (sim.ending == null && sim.tick < 250000) Krok(sim);
        var b = sim.creatures.First(c => c.boss == "demon");
        Assert.NotNull(b.glowyOdciete);
        Assert.Equal(new double[] { 2, 1, 0 }, b.glowyOdciete!.Select(o => o.nr).ToArray());
    }
}
