using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Etap 8 (prośba użytkownika z 26.11): poziom siły ludu i dźwignia zamiast kotła w Kręgu Trzecim (ze zmianami po porcie).
/// Siła na start według roli (rycerz 2, robotnik 1, pobożny 0), rośnie od chodzenia, kopania i walki; dźwignię ciągnie
/// jeden albo dwóch dowolnej roli, a brama rusza, gdy mają razem siłę co najmniej 4. Bez zmian kręgu i w Alphie 1 — nic
/// z tego nie działa (kocioł i zaklęcia, jak w TS).
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
    public void DzwigniaPodnosiBrameGdyRazemCoNajmniej4()
    {
        using var _ = new WKregu();
        var sim = new Sim(3);
        var b = Brama.stanBramy(sim);
        var rycerz = Pierwszy(sim, "rycerz");
        var robotnik = Pierwszy(sim, "robotnik");
        // rycerz (2) + robotnik (1) = 3 — za mało: dźwignia ledwie drga, brama stoi
        PrzyDzwigni(sim, rycerz, 2); PrzyDzwigni(sim, robotnik, 3);
        for (int t = 0; t < 600; t++) { sim.tick++; Brama.tikBramy(sim); }
        Assert.Equal(2, b.ciagnie);
        Assert.Equal(3, b.silaDzwigni);
        Assert.Equal(0, b.otwarcie);
        Assert.True(b.dzwignia <= Dzwignia.ZA_SLABI + 1e-9);
        // robotnik nabrał siły (2) — razem 4: dźwignia w dół, brama w górę
        robotnik.poziomSily = 2;
        for (int t = 0; t < 600; t++) { sim.tick++; Brama.tikBramy(sim); }
        Assert.Equal(4, b.silaDzwigni);
        Assert.Equal(1, b.dzwignia);
        Assert.True(b.otwarcie > 0.1, $"otwarcie {b.otwarcie}");
        // puścili — dźwignia wraca, krata opada
        var szczyt = b.otwarcie;
        rycerz.polecenie = null; robotnik.polecenie = null;
        for (int t = 0; t < 600; t++) { sim.tick++; Brama.tikBramy(sim); }
        Assert.Equal(0, b.dzwignia);
        Assert.True(b.otwarcie < szczyt);
        // jeden sam, z siłą 4 — też podnosi
        var sam = sim.creatures.Where(c => !c.dead && Lud.rolaPostaci(c) == "robotnik").Skip(1).First();
        sam.poziomSily = 4;
        PrzyDzwigni(sim, sam, 2);
        var przed = b.otwarcie;
        for (int t = 0; t < 600; t++) { sim.tick++; Brama.tikBramy(sim); }
        Assert.Equal(1, b.ciagnie);
        Assert.True(b.otwarcie > przed);
    }

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
    public void PrzyDzwigniMieszczaSieDwajDowolnejRoli()
    {
        using var _ = new WKregu();
        var sim = DoWykopanejDrogi(3);
        var kto = new[] { Pierwszy(sim, "pobozny"), Pierwszy(sim, "rycerz"), Pierwszy(sim, "robotnik") };
        var r = Polecenia.wydajDoDzwigni(sim, kto.Select(c => c.id).ToList());
        wyj.WriteLine($"przyjęli {r.przyjeli}, odmowy: {string.Join("; ", r.odmowy)}");
        Assert.Equal(2, r.przyjeli);
        Assert.Contains(r.odmowy, o => o.Contains("nie ma już miejsca"));
        Assert.Equal(2, Dzwignia.doDzwigni(sim).Count);
        // pobożny i rycerz idą (każda rola może) — trzeci odmówił
        Assert.True(kto[0].polecenie?.dzwignia == true && kto[1].polecenie?.dzwignia == true);
        Assert.NotEqual(true, kto[2].polecenie?.dzwignia);
    }

    /// <summary>
    /// Partia z botem: brama lochu podnosi się dźwignią (bot posyła tego, kto ma dość siły — albo dwóch), a partia kończy się
    /// wygraną. Siła rośnie w prawdziwej grze: grabarze kopią drogę wiernych i dochodzą do 4 mniej więcej wtedy, gdy brama
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
            foreach (var c in Dzwignia.ciagnacy(sim)) ciagneli.Add(c.id);
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
