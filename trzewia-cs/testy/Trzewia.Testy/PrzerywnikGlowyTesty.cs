using Trzewia.Symulacja;
using Trzewia.Visual;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Oprawa walki, etap 7b (Visual/PrzerywnikGlowy.cs): przy każdym ścięciu głowy przez rycerza rusza film — w chwili
/// wybicia do skoku, raz na głowę, po kolei pitbull, wilk, doberman. Film tylko wstrzymuje liczenie tików: gra rusza
/// potem od tego samego tiku, rycerz kończy skok i ścina głowę już w grze (wtedy dźwięk uderzenia — prócz ostatniej
/// głowy, którą gra konanie Cerbera). Wynik partii jest ten sam co bez filmów.
/// </summary>
public class PrzerywnikGlowyTesty
{
    readonly ITestOutputHelper wyj;
    public PrzerywnikGlowyTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed class WKregu : IDisposable
    {
        readonly bool zmiany = ZmianyKregu.Wlaczone, wzor = WalkaWzor.Wlaczony;
        readonly (bool, bool) oprawa = (VisualConfig.Wlaczone, VisualConfig.Przerywniki);
        public WKregu()
        {
            Krag.Ustaw(true); ZmianyKregu.Wlaczone = true; WalkaWzor.Wlaczony = true;
            VisualConfig.Wlaczone = true; VisualConfig.Przerywniki = true;
            PrzerywnikGlowy.Nowa();
        }
        public void Dispose()
        {
            ZmianyKregu.Wlaczone = zmiany; WalkaWzor.Wlaczony = wzor; Krag.Ustaw(false);
            (VisualConfig.Wlaczone, VisualConfig.Przerywniki) = oprawa;
            PrzerywnikGlowy.Nowa();
        }
    }

    static void Krok(Sim sim)
    {
        sim.step();
        if (sim.tick % Bot.BOT_CO == 0) { Bot.ruchBota(sim, "rozsadny"); if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, "rozsadny"); }
    }

    [Theory]
    [InlineData(3)]
    [InlineData(7)]
    public void FilmPrzyKazdymScieciuRycerzaGraRuszaOdSkoku(double ziarno)
    {
        string? koniecBez; double tikBez;
        using (new WKregu())
        {
            var bez = new Sim(ziarno);
            while (bez.ending == null && bez.tick < 400000) Krok(bez);
            koniecBez = bez.ending; tikBez = bez.tick;
        }

        using var _ = new WKregu();
        var sim = new Sim(ziarno);
        double teraz = 1000;
        var filmy = new List<(int glowa, int ktora, double tik)>();
        var dzwieki = new List<(string co, double tik)>();
        while (sim.ending == null && sim.tick < 400000)
        {
            Krok(sim);
            teraz += 1000.0 / 120;
            if (PrzerywnikGlowy.Dzwiek(sim, teraz) is { } d0) dzwieki.Add((d0, sim.tick));
            if (!PrzerywnikGlowy.PoKroku(sim, teraz)) continue;
            // film ruszył: rycerz w skoku „Ścięcia głowy”, przed trafieniem, głowa jeszcze na karku
            var tik = sim.tick;
            Assert.True(PrzerywnikGlowy.Trwa);
            var rycerz = sim.creatures.Single(c => !c.dead && c.ruch?.id == "sciecieGlowy" && c.ruch.traf == 0);
            var boss = sim.creatureById(rycerz.ruch!.cel)!;
            Assert.DoesNotContain(boss.glowyOdciete ?? new(), o => (int)o.nr == PrzerywnikGlowy.Glowa);
            filmy.Add((PrzerywnikGlowy.Glowa, PrzerywnikGlowy.Ktora, tik));
            // film trwa: gra stoi (ekran nie liczy tików) — tu: czas filmu mija, okrzyk w chwili wybicia, koniec filmu
            var okrzyk = false;
            for (double ms = 0; ms <= PrzerywnikGlowy.DlugoscMs(PrzerywnikGlowy.Ktora) + 20; ms += 1000.0 / 60)
            {
                teraz += 1000.0 / 60;
                PrzerywnikGlowy.Krok(teraz);
                if (PrzerywnikGlowy.Dzwiek(sim, teraz) == "okrzyk") okrzyk = true;
            }
            Assert.False(PrzerywnikGlowy.Trwa);
            Assert.True(okrzyk);
        }
        foreach (var f in filmy) wyj.WriteLine($"film: głowa {f.glowa}, która {f.ktora}, tik {f.tik}");
        foreach (var d in dzwieki) wyj.WriteLine($"dźwięk: {d.co}, tik {d.tik}");
        wyj.WriteLine($"koniec: {sim.ending} (tik {sim.tick}); bez filmów: {koniecBez} (tik {tikBez})");

        // wynik ten sam co bez filmów: film tylko wstrzymuje tiki
        Assert.Equal(koniecBez, sim.ending);
        Assert.Equal(tikBez, sim.tick);
        // filmy po kolei: pitbull (pierwsza), wilk (druga), doberman (ostatnia) — każda głowa najwyżej raz
        Assert.NotEmpty(filmy);
        for (int i = 0; i < filmy.Count; i++)
        {
            Assert.Equal(i, filmy[i].ktora);
            Assert.Equal((int)Nastawy.NastawyKrag.SCIECIE_GLOW.kolejnosc[i], filmy[i].glowa);
        }
        // uderzenie w chwili cięcia już w grze: po filmie każdej głowy prócz ostatniej
        Assert.Equal(filmy.Count(f => f.ktora < 2), dzwieki.Count(d => d.co == "ciecie"));
    }

    [Fact]
    public void BezPrzerywnikowFilmuNieMa()
    {
        using var _ = new WKregu();
        VisualConfig.Przerywniki = false;
        var sim = new Sim(3);
        double teraz = 1000;
        while (sim.ending == null && sim.tick < 400000)
        {
            Krok(sim);
            teraz += 1000.0 / 120;
            Assert.False(PrzerywnikGlowy.PoKroku(sim, teraz));
        }
        Assert.False(PrzerywnikGlowy.Trwa);
    }
}
