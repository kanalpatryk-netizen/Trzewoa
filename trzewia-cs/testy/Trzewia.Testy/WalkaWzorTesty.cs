using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Walka według wzorów użytkownika (Symulacja/WalkaWzor.cs, docs/walka/wzory.md): wzory jak na kartce, zatwierdzony
/// wariant liczb (nr 3), blok jako chwilowy pancerz, rytm ruchu (trafienie dokładnie po „czasie”, poza uderzenia w tej
/// samej chwili), pełna partia Kręgu z nową walką kończy się zwycięstwem w podobnym czasie, a Alpha 1 się nie zmienia.
/// </summary>
public class WalkaWzorTesty
{
    readonly ITestOutputHelper wyj;
    public WalkaWzorTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    [Fact]
    public void WzoryJakNaKartce()
    {
        // miecz 10–20 przeciw pancerzowi 25 (przykład użytkownika): a = 1 → min, a = 2 → max
        Assert.Equal(10, WalkaWzor.L(10, 20, 1), 9);
        Assert.Equal(20, WalkaWzor.L(10, 20, 2), 9);
        Assert.Equal(15, WalkaWzor.L(10, 20, 1.5), 9);
        Assert.Equal(13.7, WalkaWzor.L(10, 20, 1.37), 9);
        Assert.Equal(8, WalkaWzor.O(10, 25), 9);
        Assert.Equal(16, WalkaWzor.O(20, 25), 9);
        // bez pancerza — cała siła
        Assert.Equal(17, WalkaWzor.O(17, 0), 9);
    }

    [Fact]
    public void ZatwierdzonyWariantNr3()
    {
        void Jest(WalkaWzor.Bron b, double min, double max, double czas, double przerwa)
        {
            Assert.Equal(min, b.min); Assert.Equal(max, b.max); Assert.Equal(czas, b.czas); Assert.Equal(przerwa, b.przerwa);
        }
        Jest(WalkaWzor.RYCERZ, 45, 67, 0.5, 0.6);
        Jest(WalkaWzor.CERBER, 9.5, 14, 0.7, 1.0);
        Jest(WalkaWzor.CIEN, 2, 3.5, 0.3, 0.7);
        Jest(WalkaWzor.LUD, 2.5, 3.5, 0.25, 0.25);
        Jest(WalkaWzor.KSIEGA, 2, 3, 0.5, 0.75);
        Assert.Equal(20, WalkaWzor.P_CIEN);
        Assert.Equal(25, WalkaWzor.P_TARCZA);
        Assert.Equal(60, WalkaWzor.RYCERZ.CzasT);
        Assert.Equal(72, WalkaWzor.RYCERZ.PrzerwaT);
    }

    [Fact]
    public void BlokToChwilowyPancerz()
    {
        // tarcza: dziś rany × 0,8 — w tym wzorze p = 25
        Assert.Equal(0.8, WalkaWzor.O(1, WalkaWzor.P_TARCZA), 9);
        // blok Cerbera (rany × 0,45) = pancerz ok. 122 na ten jeden cios; z innym pancerzem celu — ten sam ułamek rany
        Assert.Equal(122.222, WalkaWzor.PancerzBloku(0, 0.45), 3);
        foreach (var p in new[] { 0.0, 20, 25 })
            foreach (var rany in new[] { 0.45, 0.6, 0.8 })
                Assert.Equal(40 * rany, WalkaWzor.ZBlokiem(40, p, rany), 9);
    }

    [Fact]
    public void RytmRuchuTrafienieDokladniePoCzasie()
    {
        // ruch z danych: 102 tiki, trafienie w 56. tiku (cięcie z góry rycerza)
        var r = new RuchTrwa { id = "ciecieZGory", od = 1000, dl = 102 };
        WalkaWzor.UstawRytm(r, WalkaWzor.RYCERZ, 102, 56);
        Assert.Equal(WalkaWzor.RYCERZ.CzasT, r.trafT);
        Assert.Equal(60.0 / 56, r.tempo!.Value, 9);
        Assert.True(r.dl >= WalkaWzor.RYCERZ.CzasT && r.dl <= WalkaWzor.RYCERZ.CzasT + WalkaWzor.RYCERZ.PrzerwaT);
        // poza uderzenia z animacji (56/102) wypada dokładnie w chwili trafienia
        Assert.Equal(56.0 / 102, WalkaWzor.PostepRuchu(r, r.trafT!.Value), 9);
        // ruch z długim powrotem (przygniecenie Cerbera: 230 tików, trafienie w 80.) — ucięty do czas + przerwa, a i tak
        // poza uderzenia dokładnie w trafieniu
        var p = new RuchTrwa { id = "przygniecenie", od = 0, dl = 230 };
        WalkaWzor.UstawRytm(p, WalkaWzor.CERBER, 230, 80);
        Assert.Equal(WalkaWzor.CERBER.CzasT + WalkaWzor.CERBER.PrzerwaT, p.dl);
        Assert.Equal(80.0 / 230, WalkaWzor.PostepRuchu(p, p.trafT!.Value), 9);
        // ruch bez rytmu — postęp jak dotąd
        var z = new RuchTrwa { id = "blok", od = 0, dl = 50 };
        Assert.Equal(0.5, WalkaWzor.PostepRuchu(z, 25), 9);
    }

    static (string? koniec, double walkaS, double tik) Partia(double ziarno)
    {
        var sim = new Sim(ziarno);
        double pek = -1;
        while (sim.ending == null && sim.tick < 200000)
        {
            sim.step();
            if (sim.tick % Bot.BOT_CO == 0) { Bot.ruchBota(sim, "rozsadny"); if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, "rozsadny"); }
            if (pek < 0 && (sim.lud.pomnik?.faza ?? "stoi") != "stoi") pek = sim.tick;
        }
        return (sim.ending, pek > 0 ? (sim.tick - pek) / 120.0 : double.NaN, sim.tick);
    }

    [Fact]
    public void PelnaPartiaKreguZNowaWalka()
    {
        Krag.Ustaw(true);
        var bylo = WalkaWzor.Wlaczony;
        try
        {
            WalkaWzor.Wlaczony = true;
            // ziarna, na których dziś (stara walka) rycerz dochodzi do Cerbera i wygrywa
            foreach (var z in new[] { 3.0, 5.0, 13.0 })
            {
                var (koniec, walka, tik) = Partia(z);
                wyj.WriteLine($"ziarno {z}: {koniec} po {tik / 7200:F1} min, walka z Cerberem {walka:F0} s");
                Assert.StartsWith("uwolnienie", koniec);
                // stara walka: 46–70 s; nowa trzyma tempo (pomiar 20 ziaren: mediana 54 s wobec 53 s). Po zmianach z 20.11
                // (bez Cieni, ruchy wieloetapowe, naprawy) — 60 ziaren: mediana 56 s, 90% krótszych niż 82 s, najdłuższa
                // 180 s (ziarno 13: rycerz pada, Cerbera kończą grabarze w hełmach). Tu: wygrana, i to bez przeciągania.
                Assert.InRange(walka, 30, 240);
            }
        }
        finally { WalkaWzor.Wlaczony = bylo; Krag.Ustaw(false); }
    }

    [Fact]
    public void Alpha1BezZmian()
    {
        // nowa walka działa tylko w Kręgu: w Alphie 1 ta sama partia z flagą i bez — identyczna
        string Stan(bool wzor)
        {
            var bylo = WalkaWzor.Wlaczony;
            try
            {
                WalkaWzor.Wlaczony = wzor;
                var sim = new Sim(4);
                while (sim.ending == null && sim.tick < 60000)
                {
                    sim.step();
                    if (sim.tick % Bot.BOT_CO == 0) { Bot.ruchBota(sim, "rozsadny"); if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, "rozsadny"); }
                }
                return $"{sim.tick} {sim.ending} " + string.Join(";", sim.creatures.Select(c => $"{c.id}:{c.hp:R},{c.x:R},{c.y:R},{c.dead}"));
            }
            finally { WalkaWzor.Wlaczony = bylo; }
        }
        Assert.False(Krag.Wlaczony);
        Assert.Equal(Stan(false), Stan(true));
    }
}
