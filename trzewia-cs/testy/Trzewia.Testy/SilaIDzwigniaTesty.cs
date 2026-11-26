using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Etap 8 (prośba użytkownika z 26.11): poziom siły ludu i dźwignia zamiast kotła w Kręgu Trzecim (ze zmianami po porcie).
/// Siła na start według roli (rycerz 2, robotnik 1, pobożny 0), rośnie od chodzenia, kopania i walki i lekko przyspiesza
/// kopanie i cios. Dźwignię ciągnie tylko ten, kto sam ma siłę co najmniej 4 (dowolnej roli, najwyżej dwaj): dwaj —
/// pełnym tempem, jeden — wolniej. Bez zmian kręgu i w Alphie 1 — nic z tego nie działa (kocioł i zaklęcia, jak w TS).
/// </summary>
public class SilaIDzwigniaTesty
{
    readonly ITestOutputHelper wyj;
    public SilaIDzwigniaTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed class WKregu : IDisposable
    {
        readonly bool zmiany = ZmianyKregu.Wlaczone, wzor = WalkaWzor.Wlaczony;
        public WKregu(bool zmianyKregu = true) { Krag.Ustaw(true); ZmianyKregu.Wlaczone = zmianyKregu; WalkaWzor.Wlaczony = true; }
        public void Dispose() { ZmianyKregu.Wlaczone = zmiany; WalkaWzor.Wlaczony = wzor; Krag.Ustaw(false); }
    }

    static void Krok(Sim sim)
    {
        sim.step();
        if (sim.tick % Bot.BOT_CO == 0) { Bot.ruchBota(sim, "rozsadny"); if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, "rozsadny"); }
    }

    static Creature Pierwszy(Sim sim, string rola) => sim.creatures.First(c => !c.dead && Lud.rolaPostaci(c) == rola);

    [Fact]
    public void SilaNaStartWedlugRoli()
    {
        using var _ = new WKregu();
        var sim = new Sim(3);
        Assert.True(Sila.Aktywna);
        foreach (var c in sim.creatures.Where(c => !c.dead && Lud.rolaPostaci(c) != null))
        {
            Assert.Null(c.poziomSily);
            Assert.Equal(Lud.rolaPostaci(c) switch { "rycerz" => 2, "robotnik" => 1, _ => 0 }, Sila.Poziom(c));
        }
    }

    [Fact]
    public void SilaRosnieOdChoduKopaniaIWalki()
    {
        using var _ = new WKregu();
        var sim = new Sim(3);
        var c = Pierwszy(sim, "pobozny");
        // chód: dwa kafle w bok między dwoma liczeniami
        sim.tick = 3000; Sila.Chod(sim);
        c.x += 2; sim.tick += Sila.CO_CHOD; Sila.Chod(sim);
        Assert.Equal(2 * Sila.ZA_KAFEL_CHODU, c.punktySily);
        // przeniesienie (dłużej niż kilka kafli naraz) to nie chód
        c.x += 10; sim.tick += Sila.CO_CHOD; Sila.Chod(sim);
        Assert.Equal(2 * Sila.ZA_KAFEL_CHODU, c.punktySily);
        // kopanie i walka
        Sila.Kucie(sim, c);
        Sila.Cios(sim, c);
        Assert.Equal(2 * Sila.ZA_KAFEL_CHODU + Sila.ZA_KAFEL_KUCIA + Sila.ZA_CIOS, c.punktySily);
        // poziom w górę, a każdy następny kosztuje więcej
        Assert.True(Sila.KosztPoziomu(1) > Sila.KosztPoziomu(0));
        Sila.Dodaj(sim, c, Sila.KosztPoziomu(0));
        Assert.Equal(1, Sila.Poziom(c));
        Assert.Contains(sim.chronicle, w => w.key == "sila");
    }

    [Fact]
    public void BezZmianKreguSilaSieNieLiczy()
    {
        var sim = new Sim(3);
        Assert.False(Sila.Aktywna);
        Assert.False(Dzwignia.Aktywna);
        var c = Pierwszy(sim, "robotnik");
        Sila.Dodaj(sim, c, 10000);
        Sila.Kucie(sim, c);
        Assert.Null(c.poziomSily);
        Assert.Null(c.punktySily);
        Assert.Equal(1, Sila.Mnoznik(c));
        using var _ = new WKregu(zmianyKregu: false);
        Assert.False(Dzwignia.Aktywna);
    }

    /// <summary>Stawia postać przy dźwigni, z rozkazem „do dźwigni” — już na miejscu.</summary>
    static void PrzyDzwigni(Sim sim, Creature c, double dx)
    {
        var k = sim.world.kociol;
        c.x = k.x + dx + 0.5; c.y = k.y + 0.5;
        c.polecenie = new Polecenie { typ = "idz", x = k.x + dx, y = k.y, od = sim.tick, na = true, dzwignia = true };
    }

    [Fact]
    public void SilaLekkoPrzyspieszaKopanieIWzmacniaCios()
    {
        using var _ = new WKregu();
        var sim = new Sim(3);
        var r = Pierwszy(sim, "robotnik");
        // na start bez zmian (wyjściowy układ ról zostaje), potem +4% za każdy poziom ponad startowy
        Assert.Equal(1, Sila.Mnoznik(r));
        r.poziomSily = Sila.NaStart("robotnik") + 3;
        Assert.Equal(1 + 3 * Sila.ZA_POZIOM, Sila.Mnoznik(r), 12);
        Assert.True(Sila.ZA_POZIOM <= 0.05, "wpływ siły miał być lekki");
    }

    [Fact]
    public void DzwignieCiagnieKazdyZSila4JedenWolniejNizDwaj()
    {
        using var _ = new WKregu();
        var sim = new Sim(3);
        var b = Brama.stanBramy(sim);
        var rycerz = Pierwszy(sim, "rycerz");
        var roboty = sim.creatures.Where(c => !c.dead && Lud.rolaPostaci(c) == "robotnik").Take(2).ToList();
        double podnies(int tikow) { var przed = b.otwarcie; for (int t = 0; t < tikow; t++) { sim.tick++; Brama.tikBramy(sim); } return b.otwarcie - przed; }
        // rycerz (2) przy dźwigni się nie liczy — brama stoi
        PrzyDzwigni(sim, rycerz, 2);
        Assert.Equal(0, podnies(600));
        Assert.Equal(0, b.ciagnie);
        Assert.Equal(0, b.dzwignia);
        rycerz.polecenie = null;
        // jeden z siłą 4 — ciągnie sam, wolniej
        roboty[0].poziomSily = 4;
        PrzyDzwigni(sim, roboty[0], 2);
        var sam = podnies(1200);
        Assert.Equal(1, b.ciagnie);
        Assert.True(sam > 0);
        // drugi z siłą 4 — pełne tempo (sam: razy Dzwignia.SAM)
        roboty[1].poziomSily = 5;
        PrzyDzwigni(sim, roboty[1], 3);
        var dwaj = podnies(1200);
        Assert.Equal(2, b.ciagnie);
        Assert.Equal(1, b.dzwignia);
        Assert.Equal(Dzwignia.SAM, sam / dwaj, 6);
        Assert.Equal(1200 / NastawyDlaTestu.Otwieranie, dwaj, 9);
        // puścili — dźwignia wraca, krata opada
        var szczyt = b.otwarcie;
        roboty[0].polecenie = null; roboty[1].polecenie = null;
        podnies(600);
        Assert.Equal(0, b.dzwignia);
        Assert.True(b.otwarcie < szczyt);
    }

    static class NastawyDlaTestu { public static double Otwieranie => Trzewia.Nastawy.NastawyLoch.BRAMA.otwieranie; }

    /// <summary>Partia z botem do chwili, gdy droga wiernych jest wykopana (komnata z dźwignią osiągalna).</summary>
    static Sim DoWykopanejDrogi(double ziarno)
    {
        var sim = new Sim(ziarno);
        while (sim.ending == null && sim.tick < 120000 && !(Pielgrzymka.czoloDrogi(sim) < 0 && sim.planDrogi != null)) Krok(sim);
        Assert.True(Pielgrzymka.czoloDrogi(sim) < 0, "droga wiernych niewykopana");
        foreach (var c in Dzwignia.doDzwigni(sim)) Polecenia.odwolajPolecenie(sim, c);
        return sim;
    }

    [Fact]
    public void PrzyDzwigniMieszczaSieDwajZSila4()
    {
        using var _ = new WKregu();
        var sim = DoWykopanejDrogi(3);
        var slaby = sim.creatures.Last(c => !c.dead && Lud.rolaPostaci(c) == "pobozny");
        Assert.True(Sila.Poziom(slaby) < Dzwignia.POTRZEBA);
        // słabszy odmawia
        var r0 = Polecenia.wydajDoDzwigni(sim, new List<double> { slaby.id });
        Assert.Equal(0, r0.przyjeli);
        Assert.Contains(r0.odmowy, o => o.Contains("za słaby"));
        // trzech z siłą 4 (każda rola może): idą dwaj, trzeci odmawia — nie ma miejsca
        var kto = new[] { Pierwszy(sim, "pobozny"), Pierwszy(sim, "rycerz"), Pierwszy(sim, "robotnik") };
        foreach (var c in kto) c.poziomSily = Math.Max(Dzwignia.POTRZEBA, Sila.Poziom(c));
        var r = Polecenia.wydajDoDzwigni(sim, kto.Select(c => c.id).ToList());
        wyj.WriteLine($"przyjęli {r.przyjeli}, odmowy: {string.Join("; ", r.odmowy)}");
        Assert.Equal(2, r.przyjeli);
        Assert.Contains(r.odmowy, o => o.Contains("nie ma już miejsca"));
        Assert.Equal(2, Dzwignia.doDzwigni(sim).Count);
        Assert.True(kto[0].polecenie?.dzwignia == true && kto[1].polecenie?.dzwignia == true);
        Assert.NotEqual(true, kto[2].polecenie?.dzwignia);
    }

    /// <summary>
    /// Partia z botem: brama lochu podnosi się dźwignią (bot posyła dwóch z siłą 4, a gdy jest jeden — jego samego), a partia
    /// kończy się wygraną. Siła rośnie w prawdziwej grze: grabarze kopią drogę wiernych i dochodzą do 4 mniej więcej wtedy, gdy brama
    /// jest potrzebna (ok. 6. minuty).
    /// </summary>
    [Theory]
    [InlineData(3)]
    [InlineData(12)]
    public void BotPodnosiBrameDzwignia(double ziarno)
    {
        using var _ = new WKregu();
        var sim = new Sim(ziarno);
        double? pelna = null;
        var ciagneli = new HashSet<double>();
        double maksRobotnika = 0;
        while (sim.ending == null && sim.tick < 250000)
        {
            Krok(sim);
            foreach (var c in Dzwignia.ciagnacy(sim)) { ciagneli.Add(c.id); Assert.True(Dzwignia.dosycSilny(c)); }
            // (bot puszcza dźwignię przy 97% — jak dawniej zaklinających przy kotle)
            if (pelna == null && Brama.stanBramy(sim).otwarcie >= 0.95 && !ZmianyKregu.WalkaZCerberem(sim)) pelna = sim.tick;
            if (sim.tick == 6 * 7200) maksRobotnika = sim.creatures.Where(c => !c.dead && Lud.rolaPostaci(c) == "robotnik").Max(Sila.Poziom);
        }
        wyj.WriteLine($"ziarno {ziarno}: {sim.ending} po {sim.tick / 7200.0:F1} min; brama w górze po {pelna / 7200:F1} min; ciągnęli: {ciagneli.Count}; najsilniejszy grabarz po 6 min: {maksRobotnika}");
        Assert.NotNull(pelna);
        Assert.NotEmpty(ciagneli);
        Assert.True(maksRobotnika >= 3, $"grabarze za słabi po 6 min: {maksRobotnika}");
        Assert.StartsWith("uwolnienie", sim.ending);
    }
}
