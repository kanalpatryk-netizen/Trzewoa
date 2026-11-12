using System.IO.Compression;
using System.Text.Json;
using Trzewia.Rdzen;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Zapis gry (core/save.ts → Symulacja/Zapis.cs): partia z botem do tiku, zapis, wczytanie i dalsza gra wczytanej partii —
/// skróty porównane z TS w Chromium (narzedzia/wzorce/zapis.ts → testy/zlote/zapis-rozsadny.json). Skrót zapisu liczony
/// z danych (JSON.parse, kanon), więc kolejność kluczy w pliku nie gra roli. Drugi test wczytuje prawdziwy zapis z gry TS.
/// </summary>
public class ZapisTesty
{
    readonly ITestOutputHelper wyj;
    public ZapisTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed record Wzor(int ziarno, double tik, string zapis, string poWczytaniu, string poKrokach, double tikPo);

    static readonly Lazy<List<Wzor>> Wzory = new(() =>
        JsonSerializer.Deserialize<List<Wzor>>(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "zapis-rozsadny.json")))!);

    const int DALEJ = 6000;

    static void Graj(Sim sim, double doTiku)
    {
        while (sim.tick < doTiku && sim.ending == null)
        {
            sim.step();
            if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny");
        }
    }

    public static IEnumerable<object[]> Przypadki() => Enumerable.Range(0, 5).Select(i => new object[] { i });

    [Theory]
    [MemberData(nameof(Przypadki))]
    public void ZapisIWczytanieJakWTs(int nr)
    {
        var w = Wzory.Value[nr];
        var sim = new Sim(w.ziarno);
        Graj(sim, w.tik);
        Assert.Equal(w.tik, sim.tick);
        var tekst = Zapis.serialize(sim);
        Porownaj("zapis", Kanon.Zapisz(Json.Czytaj(tekst)), w.zapis);

        var r = Zapis.restore(tekst);
        Assert.NotNull(r);
        Porownaj("stan po wczytaniu", Kanon.Zapisz(r), w.poWczytaniu);
        for (int i = 0; i < DALEJ && r!.ending == null; i++)
        {
            r.step();
            if (r.tick % Bot.BOT_CO == 0) Bot.ruchBota(r, "rozsadny");
        }
        Assert.Equal(w.tikPo, r!.tick);
        Porownaj($"stan po {DALEJ} tikach", Kanon.Zapisz(r), w.poKrokach);
        wyj.WriteLine($"ziarno {w.ziarno}, tik {w.tik}: zapis {tekst.Length} znaków, zgodny z TS; wczytana partia zgodna do tiku {r.tick}");

        void Porownaj(string co, string kanon, string wzor)
        {
            if (ZloteTesty.Fnv64(kanon) == wzor) return;
            var plik = Path.Combine(Path.GetTempPath(), $"trzewia-zapis-cs-z{w.ziarno}-{co.Replace(' ', '-')}.json");
            File.WriteAllText(plik, kanon);
            Assert.Fail($"ziarno {w.ziarno}, tik {w.tik}: {co} różni się od TS. Kanon C#: {plik}");
        }
    }

    /// <summary>Zapis z gry w TS (ziarno 3, tik 35 000) wczytany w C# daje ten sam stan, co wczytany w TS.</summary>
    [Fact]
    public void ZapisZGryTsWczytujeSie()
    {
        var w = Wzory.Value.First(x => x.ziarno == 3);
        using var gz = new GZipStream(File.OpenRead(Path.Combine(Sciezka.Testy, "zlote", "zapis-ts-ziarno3.json.gz")), CompressionMode.Decompress);
        var tekst = new StreamReader(gz).ReadToEnd();
        Assert.Equal(w.zapis, ZloteTesty.Fnv64(Kanon.Zapisz(Json.Czytaj(tekst))));
        var r = Zapis.restore(tekst);
        Assert.NotNull(r);
        Assert.Equal(w.poWczytaniu, ZloteTesty.Fnv64(Kanon.Zapisz(r)));
    }

    [Fact]
    public void ZlyZapisToNull()
    {
        Assert.Null(Zapis.restore("nie json"));
        Assert.Null(Zapis.restore("{\"v\":4}"));
        Assert.Null(Zapis.restore("[1,2]"));
        Assert.Null(Zapis.restore("{\"v\":5"));
    }
}
