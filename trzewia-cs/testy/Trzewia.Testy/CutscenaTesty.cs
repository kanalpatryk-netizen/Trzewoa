using System.Linq;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using Trzewia.Visual;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Oprawa walki, etap 4 (przerywniki): scena wejścia bossa trzyma kamerę i chowa HUD, dopóki trwa; pominięcie kończy
/// ją od razu, nie dotykając symulacji (ten sam tik, co bez przerywnika); bez oprawy (F9) w ogóle nie startuje.
/// </summary>
public class CutscenaTesty
{
    readonly ITestOutputHelper wyj;
    public CutscenaTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed class WTrybieKregu : IDisposable
    {
        public WTrybieKregu() { Krag.Ustaw(true); }
        public void Dispose() => Krag.Ustaw(false);
    }

    /// <summary>Partia kręgu tuż przed pęknięciem pieczęci (faza wciąż „stoi”, następny krok ją przełamie).</summary>
    static Sim DoRozpadu(double ziarno, out double tikPrzedRozpadem)
    {
        var sim = new Sim(ziarno);
        double ostatniStoi = 0;
        while (sim.lud.pomnik?.faza != "rozpada" && sim.tick < 200000 && sim.ending == null)
        {
            if (sim.lud.pomnik?.faza == "stoi") ostatniStoi = sim.tick;
            sim.step();
            if (sim.tick % Bot.BOT_CO == 0) { Bot.ruchBota(sim, "rozsadny"); if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, "rozsadny"); }
        }
        Assert.Equal("rozpada", sim.lud.pomnik?.faza);
        tikPrzedRozpadem = ostatniStoi;
        return sim;
    }

    [Fact]
    public void WejscieTrzymaKamereIChowaHudDopokiTrwa()
    {
        using var tryb = new WTrybieKregu();
        var bylo = (VisualConfig.Wlaczone, VisualConfig.Przerywniki);
        try
        {
            VisualConfig.Wlaczone = true; VisualConfig.Przerywniki = true;
            Cutscena.Nowa();
            var sim = DoRozpadu(3, out _);
            var cam = new Camera(1280, 720) { x = 50, y = 50, zoom = 14 };
            Cutscena.RozpocznijWejscie(sim, cam, 1000);
            Assert.True(Cutscena.Trwa);
            Assert.Equal("wejscie", Cutscena.Scena);
            Assert.True(Cutscena.UkryjHud(1000));

            // kamera jedzie w stronę pieca (miejsce pomnika), nie zostaje tam, gdzie była
            var m = Pomnik.miejscePomnika(sim);
            double x0 = cam.x, y0 = cam.y;
            double teraz = 1000;
            for (int i = 0; i < 30 && Cutscena.Trwa; i++) { teraz += 100; sim.step(); Cutscena.Krok(sim, cam, teraz); }
            Assert.True(Math.Abs(cam.x - m.x) < Math.Abs(x0 - m.x), "kamera nie zbliżyła się do pieca");
            wyj.WriteLine($"po {teraz - 1000:F0} ms: kamera ({cam.x:F1},{cam.y:F1}) → cel ({m.x:F1},{m.y:F1})");
        }
        finally { (VisualConfig.Wlaczone, VisualConfig.Przerywniki) = bylo; Cutscena.Nowa(); }
    }

    [Fact]
    public void PominiecieKonczyScenaNiezwlocznieBezZmianyTiku()
    {
        using var tryb = new WTrybieKregu();
        var bylo = (VisualConfig.Wlaczone, VisualConfig.Przerywniki);
        try
        {
            VisualConfig.Wlaczone = true; VisualConfig.Przerywniki = true;
            Cutscena.Nowa();
            var sim = DoRozpadu(3, out _);
            var tik = sim.tick;
            var cam = new Camera(1280, 720) { x = 50, y = 50, zoom = 14 };
            Cutscena.RozpocznijWejscie(sim, cam, 1000);
            Assert.True(Cutscena.Trwa);
            Cutscena.Pomin();
            Cutscena.Krok(sim, cam, 1016);
            Assert.False(Cutscena.Trwa, "pominięcie powinno od razu skończyć scenę");
            Assert.False(Cutscena.UkryjHud(1016));
            // symulacja stała cały czas obok (ani jednego tiku z powodu przerywnika) — pominięcie tego nie zmienia
            Assert.Equal(tik, sim.tick);
        }
        finally { (VisualConfig.Wlaczone, VisualConfig.Przerywniki) = bylo; Cutscena.Nowa(); }
    }

    [Fact]
    public void BezOprawyScenaWcaleNieStartuje()
    {
        using var tryb = new WTrybieKregu();
        var bylo = (VisualConfig.Wlaczone, VisualConfig.Przerywniki);
        try
        {
            VisualConfig.Wlaczone = false; VisualConfig.Przerywniki = true;
            Cutscena.Nowa();
            var sim = DoRozpadu(3, out _);
            var cam = new Camera(1280, 720) { x = 50, y = 50, zoom = 14 };
            Cutscena.RozpocznijWejscie(sim, cam, 1000);
            Assert.False(Cutscena.Trwa, "z F9 wyłączonym przerywnik nie powinien w ogóle ruszyć");
        }
        finally { (VisualConfig.Wlaczone, VisualConfig.Przerywniki) = bylo; Cutscena.Nowa(); }
    }

    [Fact]
    public void SmierKonczySieSamaPoCalejSekwencji()
    {
        using var tryb = new WTrybieKregu();
        var bylo = (VisualConfig.Wlaczone, VisualConfig.Przerywniki);
        try
        {
            VisualConfig.Wlaczone = true; VisualConfig.Przerywniki = true;
            Cutscena.Nowa();
            var sim = new Sim(3);
            var cam = new Camera(1280, 720) { x = 50, y = 50, zoom = 14 };
            var ktos = sim.creatures.First(c => !c.dead);
            Cutscena.RozpocznijSmierc(sim, cam, 1000, ktos);
            Assert.True(Cutscena.Trwa);
            Assert.True(Cutscena.UkryjHud(1000));
            var suma = VisualConfig.Przerywnikowe.TrupRozsypMs + VisualConfig.Przerywnikowe.SmierckKameraMs
                + VisualConfig.Przerywnikowe.SmiercNapisPo + VisualConfig.Przerywnikowe.SmiercNapisMs + VisualConfig.Przerywnikowe.SmiercKoniecMs;
            double teraz = 1000;
            for (int i = 0; i < 2000 && Cutscena.Trwa; i++) { teraz += 50; Cutscena.Krok(sim, cam, teraz); }
            Assert.False(Cutscena.Trwa, "scena śmierci powinna się sama skończyć");
            var trwala = teraz - 1000;
            wyj.WriteLine($"scena śmierci: {trwala:F0} ms (liczona {suma:F0} ms)");
            Assert.True(Math.Abs(trwala - suma) < 200, $"czas sceny {trwala} odbiega od sumy kroków {suma}");
            Assert.False(Cutscena.UkryjHud(teraz));
        }
        finally { (VisualConfig.Wlaczone, VisualConfig.Przerywniki) = bylo; Cutscena.Nowa(); }
    }
}
