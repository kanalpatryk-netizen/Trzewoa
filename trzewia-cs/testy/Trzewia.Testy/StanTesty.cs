using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>Przebieg partii bez gracza: kanoniczny stan symulacji C# w tych samych tikach co w TS (Chromium).</summary>
public class StanTesty
{
    readonly ITestOutputHelper wyj;
    public StanTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    [Fact]
    public void PartiaBezGracza()
    {
        var plik = Environment.GetEnvironmentVariable("STAN_WZORZEC") ?? Path.Combine(Sciezka.Testy, "zlote", "stan-bez-gracza.json");
        var ziarno = double.Parse(Environment.GetEnvironmentVariable("STAN_ZIARNO") ?? "1");
        var tiki = (Environment.GetEnvironmentVariable("STAN_TIKI") ?? "0,1000,5000,10000,20000,40000,60000").Split(',').Select(double.Parse).ToList();
        var wzorce = System.Text.Json.JsonSerializer.Deserialize<List<string>>(File.ReadAllText(plik))!;
        var sim = new Sim(ziarno);
        for (int k = 0; k < tiki.Count; k++)
        {
            while (sim.tick < tiki[k] && sim.ending == null) sim.step();
            var moj = Kanon.Zapisz(sim);
            if (moj == wzorce[k]) { wyj.WriteLine($"tik {tiki[k]}: zgodny ({moj.Length} B)"); continue; }
            var r = Kanon.Roznice(wzorce[k], moj);
            Assert.Fail($"tik {tiki[k]}: stan się różni:\n" + string.Join("\n", r));
        }
    }
}
