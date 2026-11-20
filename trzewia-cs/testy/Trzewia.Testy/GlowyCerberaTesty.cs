using Trzewia.Nastawy;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Etap 6 — mechanika Cerbera (Symulacja/GlowyCerbera.cs): ataki głów z zapowiedzią, karmienie jako decyzja gracza, dłoń
/// jako cud, wskazywanie głowy (życie każdej głowy osobno).
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

    static void Krok(Sim sim, bool bot = true)
    {
        sim.step();
        if (bot && sim.tick % Bot.BOT_CO == 0) { Bot.ruchBota(sim, "rozsadny"); if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, "rozsadny"); }
    }

    /// <summary>Partia ziarna 3 do początku walki z Cerberem (pieczęć rozbita, Cerber wyszedł).</summary>
    static (Sim sim, Creature b) DoWalki()
    {
        var sim = new Sim(3);
        while (sim.tick < 200000 && !GlowyCerbera.Walka(sim)) Krok(sim);
        Assert.True(GlowyCerbera.Walka(sim));
        return (sim, sim.creatures.First(c => !c.dead && c.boss == "demon"));
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
        // „czas” broni głowy = zapowiedź z planu: gryzienie 0,5 s, ogień 0,7 s, wycie 0,8 s
        Assert.Equal(GlowyCerbera.ZAPOWIEDZ_GRYZIE, GlowyCerbera.BronRuchu("zGory").czas);
        Assert.Equal(GlowyCerbera.ZAPOWIEDZ_OGIEN, GlowyCerbera.BronRuchu("tchnienie").czas);
        Assert.Equal(GlowyCerbera.ZAPOWIEDZ_WYJE, GlowyCerbera.BronRuchu("wybuchAureoli").czas);
        Assert.Same(WalkaWzor.CERBER, GlowyCerbera.BronRuchu("zamach"));
        // pozostałe głowy przyspieszają: przerwa × 0,8 po jednej ściętej, × 0,6 po dwóch
        var b = new Creature { boss = "demon" };
        Assert.Equal(120, GlowyCerbera.PrzerwaBossaT(b, 120));
        b.glowyOdciete = new List<GlowaOdcieta> { new GlowaOdcieta { nr = 2 } };
        Assert.Equal(96, GlowyCerbera.PrzerwaBossaT(b, 120));
        // bez zmian kręgu — ruchy jak w TS (żadnej głowy)
        ZmianyKregu.Wlaczone = false;
        Assert.Null(GlowyCerbera.GlowaRuchu("zGory"));
    }

    [Fact]
    public void WskazanaGlowaBierzeRanyInneTrzymajaSwojeZycie()
    {
        using var _ = new WKregu();
        var (sim, b) = DoWalki();
        var max = b.hpMax ?? 500;
        var czesc = max / 3;
        b.hp = max;
        // domyślnie bije się pitbulla (pierwszy w kolejności ścinania)
        Assert.Equal(GlowyCerbera.PITBULL, Walka.glowyCerbera(b).biezaca);
        b.hp -= 50;
        Assert.Equal((czesc - 50) / czesc, Walka.pasekGlowy(b, GlowyCerbera.PITBULL), 6);
        Assert.Equal(1, Walka.pasekGlowy(b, GlowyCerbera.WILK), 6);
        // gracz wskazuje wilka: życie Cerbera się nie zmienia, pitbull zachowuje swój pasek
        Assert.Null(GlowyCerbera.Wskaz(sim, GlowyCerbera.WILK));
        Assert.Equal(max - 50, b.hp, 6);
        Assert.Equal(GlowyCerbera.WILK, Walka.glowyCerbera(b).biezaca);
        b.hp -= 30;
        Assert.Equal((czesc - 30) / czesc, Walka.pasekGlowy(b, GlowyCerbera.WILK), 6);
        Assert.Equal((czesc - 50) / czesc, Walka.pasekGlowy(b, GlowyCerbera.PITBULL), 6);
        // rany nie schodzą poniżej dna paska wskazanej głowy (reszta życia to dwie pozostałe głowy)
        Assert.Equal(max - 50 - czesc, Walka.glowyCerbera(b).dno, 6);
        // ścięcie: spada wskazana głowa (wilk), nie następna w kolejności
        var r = sim.creatures.First(c => !c.dead && Lud.rolaPostaci(c) == "rycerz");
        b.hp = Walka.glowyCerbera(b).dno + 1;
        Walka.ucinaGlowe(sim, b, r);
        Assert.True(GlowyCerbera.Scieta(b, GlowyCerbera.WILK));
        Assert.False(GlowyCerbera.Scieta(b, GlowyCerbera.PITBULL));
        Assert.Equal(GlowyCerbera.PITBULL, Walka.glowyCerbera(b).biezaca);
        Assert.Equal(czesc - 50 + czesc, b.hp, 6);
        // ściętej nie da się wskazać
        Assert.NotNull(GlowyCerbera.Wskaz(sim, GlowyCerbera.WILK));
    }

    [Fact]
    public void KarmienieUsypiaJednaGloweIKosztujeJedzenie()
    {
        using var _ = new WKregu();
        var (sim, b) = DoWalki();
        var przed = Wiadro.porcjiWWiadrach(sim) + sim.creatures.Where(c => !c.dead).Sum(c => c.carry);
        Assert.Null(GlowyCerbera.Nakarm(sim, GlowyCerbera.WILK));
        var po = Wiadro.porcjiWWiadrach(sim) + sim.creatures.Where(c => !c.dead).Sum(c => c.carry);
        Assert.Equal(GlowyCerbera.KARMIENIE_PORCJI, przed - po, 6);
        Assert.True(GlowyCerbera.Spi(sim, b, GlowyCerbera.WILK));
        Assert.False(GlowyCerbera.MozeAtakowac(sim, b, GlowyCerbera.WILK));
        Assert.True(GlowyCerbera.MozeAtakowac(sim, b, GlowyCerbera.DOBERMAN));
        Assert.NotNull(GlowyCerbera.Nakarm(sim, GlowyCerbera.WILK));          // już śpi
        // po KARMIENIE_SEN tików się budzi; przez ten czas Cerber nie wyje (to atak wilka)
        var wycie = false;
        for (var t = 0; t < GlowyCerbera.KARMIENIE_SEN - 1; t++) { Krok(sim, false); if (b.ruch?.id == "wybuchAureoli") wycie = true; }
        Assert.False(wycie);
        Krok(sim, false); Krok(sim, false);
        Assert.False(GlowyCerbera.Spi(sim, b, GlowyCerbera.WILK));
    }

    [Fact]
    public void DlonTrzymaCerberaZaWiare()
    {
        using var _ = new WKregu();
        var (sim, b) = DoWalki();
        sim.wiara = GlowyCerbera.DLON_WIARY - 1;
        Assert.NotNull(GlowyCerbera.Dlon(sim));
        sim.wiara = GlowyCerbera.DLON_WIARY + 10;
        Assert.Null(GlowyCerbera.Dlon(sim));
        Assert.Equal(10, sim.wiara, 6);
        Assert.NotNull(GlowyCerbera.Dlon(sim));                                 // już trzyma
        // gdy palce się zamkną — Cerber stoi i nie atakuje; potem dłoń puszcza
        var trzymany = 0; double x0 = double.NaN; var ruszyl = false; var atakowal = false;
        for (var t = 0; t < 1400; t++)
        {
            Krok(sim, false);
            if (!GlowyCerbera.Trzymany(sim)) continue;
            trzymany++;
            if (double.IsNaN(x0)) x0 = b.x;
            if (Math.Abs(b.x - x0) > 1e-9) ruszyl = true;
            if (b.ruch != null) atakowal = true;
        }
        wyj.WriteLine($"trzymany {trzymany} tików");
        Assert.InRange(trzymany, GlowyCerbera.DLON_TRZYMA, GlowyCerbera.DLON_TRZYMA + 60);
        Assert.False(ruszyl);
        Assert.False(atakowal);
        Assert.False(GlowyCerbera.Trzymany(sim));
    }

    [Theory]
    [InlineData(3)]
    [InlineData(5)]
    [InlineData(13)]
    public void PartiaZEtapem6KonczySieWygrana(double ziarno)
    {
        using var _ = new WKregu();
        var sim = new Sim(ziarno);
        while (sim.ending == null && sim.tick < 250000) Krok(sim);
        wyj.WriteLine($"ziarno {ziarno}: {sim.ending}, karmień {sim.lud.krag?.okupow}");
        Assert.StartsWith("uwolnienie", sim.ending);
        // bot karmi głowy sam — automatyczny okup już się nie dzieje, więc każde karmienie to decyzja (tu: bota)
        Assert.True((sim.lud.krag?.okupow ?? 0) > 0);
    }
}
