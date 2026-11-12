using System.Diagnostics;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>Test dymny: góra rusza i żyje przez kilka minut gry bez wyjątków.</summary>
public class SymulacjaDym
{
    readonly ITestOutputHelper wyj;
    public SymulacjaDym(ITestOutputHelper wyj) { this.wyj = wyj; }

    [Fact]
    public void GoraZyje()
    {
        var sw = Stopwatch.StartNew();
        var sim = new Sim(1);
        var start = sw.Elapsed.TotalMilliseconds;
        sw.Restart();
        for (var t = 0; t < 20000 && sim.ending == null; t++) sim.step();
        var ms = sw.Elapsed.TotalMilliseconds;
        wyj.WriteLine($"start {start:F0} ms, {sim.tick} tików w {ms:F0} ms ({ms / sim.tick * 1000:F1} µs/tik); żywych {sim.creatures.Count(c => !c.dead)}, krew {sim.krew:F1}, wiara {sim.wiara:F1}, koniec {sim.ending}");
        foreach (var w in sim.chronicle.TakeLast(12)) wyj.WriteLine($"  [{w.tick}] {w.text}");
        Assert.True(sim.tick > 0);
    }
}
