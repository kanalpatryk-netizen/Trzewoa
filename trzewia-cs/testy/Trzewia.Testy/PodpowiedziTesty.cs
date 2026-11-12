using System.Text.Json;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Podpowiedzi (sim/podpowiedzi.ts → Podpowiedzi.cs): partia z botem, co 500 tików do 60 000 podpowiedź (tekst, cel,
/// waga) taka sama jak w TS (narzedzia/wzorce/podpowiedzi.ts → testy/zlote/podpowiedzi-rozsadny.json).
/// </summary>
public class PodpowiedziTesty
{
    readonly ITestOutputHelper wyj;
    public PodpowiedziTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    static readonly Lazy<List<List<string>>> Wzory = new(() =>
        JsonSerializer.Deserialize<List<List<string>>>(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "podpowiedzi-rozsadny.json")))!);

    [Theory]
    [InlineData(1)] [InlineData(2)] [InlineData(3)] [InlineData(4)] [InlineData(5)]
    public void JakWTs(int ziarno)
    {
        var wzor = Wzory.Value[ziarno - 1];
        var sim = new Sim(ziarno);
        var rozne = new HashSet<string>();
        for (int k = 0; k < wzor.Count; k++)
        {
            var t = k * 500.0;
            while (sim.tick < t && sim.ending == null)
            {
                sim.step();
                if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny");
            }
            var p = Podpowiedzi.podpowiedz(sim);
            rozne.Add(p.tekst);
            Assert.True(wzor[k] == Kanon.Zapisz(p), $"ziarno {ziarno}, tik {t}:\n C#: {Kanon.Zapisz(p)}\n TS: {wzor[k]}");
        }
        wyj.WriteLine($"ziarno {ziarno}: {wzor.Count} podpowiedzi zgodnych, {rozne.Count} różnych");
    }
}
