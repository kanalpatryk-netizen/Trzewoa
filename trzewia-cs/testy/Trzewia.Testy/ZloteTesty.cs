using System.Text.Json;
using Trzewia.Symulacja;
using Xunit.Abstractions;
using JS = Trzewia.Js.Js;

namespace Trzewia.Testy;

/// <summary>
/// Testy złote: partia z botem (styl „rozsądny”) — skrót pełnego stanu symulacji co 1000 tików do 60 000, ziarna 1–20,
/// porównany ze skrótami z gry TS liczonej w Chromium (narzedzia/wzorce/zlote.ts → testy/zlote/skroty-rozsadny.json).
/// Przy różnicy test zapisuje pełny stan C# z tego tiku; ten sam stan z TS daje stan.ts (stanyBot).
/// </summary>
public class ZloteTesty
{
    readonly ITestOutputHelper wyj;
    public ZloteTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    public static string Fnv64(string s)
    {
        ulong h = 0xcbf29ce484222325;
        foreach (var ch in s) { h ^= ch; h = unchecked(h * 0x100000001b3); }
        return h.ToString("x16");
    }

    static readonly Lazy<List<List<string>>> Skroty = new(() =>
        JsonSerializer.Deserialize<List<List<string>>>(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "skroty-rozsadny.json")))!);

    public static IEnumerable<object[]> Ziarna() => Enumerable.Range(1, 20).Select(z => new object[] { z });

    [Theory]
    [MemberData(nameof(Ziarna))]
    public void PartiaZBotem(int ziarno)
    {
        var wzor = Skroty.Value[ziarno - 1];
        var sim = new Sim(ziarno);
        Sprawdz(0, sim);
        for (int k = 1; k < wzor.Count; k++)
        {
            var t = k * 1000.0;
            while (sim.tick < t && sim.ending == null)
            {
                sim.step();
                if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny");
            }
            Sprawdz(k, sim);
        }
        wyj.WriteLine($"ziarno {ziarno}: {wzor.Count} skrótów zgodnych (do tiku {sim.tick})");

        void Sprawdz(int k, Sim s)
        {
            var kanon = Kanon.Zapisz(s);
            if (Fnv64(kanon) == wzor[k]) return;
            var plik = Path.Combine(Path.GetTempPath(), $"trzewia-stan-cs-z{ziarno}-t{k * 1000}.json");
            File.WriteAllText(plik, kanon);
            Assert.Fail($"ziarno {ziarno}, tik {k * 1000}: stan różni się od TS. Stan C#: {plik}. Stan TS: " +
                $"node narzedzia/wzorce/chromium.mjs narzedzia/wzorce/stan.ts stanyBot '[{ziarno},\"rozsadny\",[{k * 1000}]]' stan-ts.json");
        }
    }

    /// <summary>
    /// Test Wielkiego Pomnika (scripts/test-pomnika.mjs): modlitwa kruszy pomnik w trzech stanach, przy 100% rozpad,
    /// demon wstaje z gruzów, ostatnie uderzenie rycerza — Uwolnienie. Do tego zgodność przebiegu z TS (zlote/pomnik.json).
    /// </summary>
    [Fact]
    public void Pomnik12()
    {
        var wzor = JsonDocument.Parse(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "pomnik.json"))).RootElement;
        var zle = new List<string>();
        for (int z = 0; z < 12; z++)
        {
            var sim = new Sim(z * 31337 + 7);
            sim.wydarzenia.nastepne = double.PositiveInfinity;
            for (int i0 = 0; i0 < 400; i0++) sim.step();
            var klan = sim.clans.FirstOrDefault(k => !k.dead && k.pop > 3) ?? sim.clans[0];
            var warta = new List<Creature>();
            double kolejnosc(Creature o) => o.rola == "robotnik" ? 1 : 0;
            void uzupelnij()
            {
                warta = warta.Where(c => !c.dead).ToList();
                while (warta.Count < 4)
                {
                    var c = JS.Sort(new List<Creature>(sim.creatures), (a, b) => kolejnosc(a) - kolejnosc(b)).FirstOrDefault(o => !o.dead && o.straznik != true && !warta.Contains(o));
                    if (c == null) break;
                    c.clan = klan.id;
                    warta.Add(c);
                }
                klan.pop = Math.Max(klan.pop, warta.Count);
            }
            var stany = new List<(double, double)>();
            var fazy = new List<(string, double)>();
            (double x, double y, XY m)? bossStart = null;
            int i = 0;
            for (; i < 200000 && sim.ending == null; i++)
            {
                sim.step();
                var p = sim.lud.pomnik;
                if (p != null)
                {
                    if (stany.Count == 0 || stany[^1].Item1 != p.stan) stany.Add((p.stan, i));
                    if (fazy.Count == 0 || fazy[^1].Item1 != p.faza) fazy.Add((p.faza, i));
                }
                if (i % 60 == 0) foreach (var c in sim.creatures.ToList()) if (!c.dead && c.straznik == true && c.boss == null) sim.kill(c, "test", "test");
                var boss = sim.creatures.FirstOrDefault(c => !c.dead && c.boss != null);
                if (boss != null && bossStart == null) bossStart = (boss.x, boss.y, Trzewia.Symulacja.Pomnik.miejscePomnika(sim));
                if (boss != null && p?.faza == "walka" && i - fazy[^1].Item2 > 600 && i % 30 == 0)
                {
                    var r = sim.creatures.FirstOrDefault(c => !c.dead && c.rola == "rycerz");
                    if (r != null) Straznicy.ranStraznika(sim, boss, r, 60);
                }
                klan.devotion = 1;
                klan.dead = false;
                if (i % 50 == 0) uzupelnij();
                if (i % 600 == 0 && sim.planDrogi != null)
                {
                    var w = sim.world;
                    foreach (var k in sim.planDrogi.kopac) if (w.tile[k] != T.CORE && w.tile[k] != T.STONE) w.tile[k] = T.AIR;
                }
                foreach (var c in warta)
                {
                    if (c.dead) continue;
                    c.devotion = 1;
                    c.hunger = 0.1;
                    c.hp = Math.Max(c.hp, 30);
                    c.x = sim.world.coreX + (i % 5) - 2; c.y = sim.world.coreY - 14;
                }
                sim.sen = 0;
            }
            var okStany = string.Join(",", stany.Select(s => s.Item1)) == "0,1,2,3";
            var okFazy = string.Join(",", fazy.Select(f => f.Item1)) == "stoi,rozpada,wychodzi,walka,kona";
            var okBoss = bossStart != null && Math.Abs(bossStart.Value.x - bossStart.Value.m.x) < 0.01 && Math.Abs(bossStart.Value.y - bossStart.Value.m.y) < 0.5;
            var okKoniec = (sim.ending ?? "").StartsWith("uwolnienie") && sim.rytual.pekniecia == Trzewia.Nastawy.NastawyPomnik.POMNIK.pekniec;
            var tz = wzor[z];
            var zgodnyZTs = tz.GetProperty("tikow").GetDouble() == i && tz.GetProperty("koniec").GetString() == (sim.ending ?? "brak")
                && tz.GetProperty("skrot").GetString() == Fnv64(Kanon.Zapisz(sim));
            wyj.WriteLine($"ziarno {z}: pęknięć {sim.rytual.pekniecia} · stany {string.Join(" ", stany.Select(s => $"{s.Item1}@{s.Item2}"))} · fazy {string.Join(" ", fazy.Select(f => $"{f.Item1}@{f.Item2}"))} · koniec {sim.ending} po {i} tikach{(zgodnyZTs ? " · zgodny z TS" : " · INNY NIŻ W TS")}");
            if (!(okStany && okFazy && okBoss && okKoniec && zgodnyZTs)) zle.Add($"ziarno {z}");
        }
        Assert.True(zle.Count == 0, "pomnik nie w normie: " + string.Join(", ", zle));
    }

    /// <summary>
    /// Balans (długi — tylko z TRZEWIA_BALANS=1): partie bota do końca, wynik każdej jak w TS (zlote/balans-rozsadny.json).
    /// </summary>
    [Fact]
    public void Balans()
    {
        if (Environment.GetEnvironmentVariable("TRZEWIA_BALANS") != "1") { wyj.WriteLine("pominięty (TRZEWIA_BALANS=1, żeby uruchomić)"); return; }
        var wzor = JsonDocument.Parse(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "balans-rozsadny.json"))).RootElement;
        int wygrane = 0, wygraneTs = 0;
        var inne = new List<string>();
        var zakres = (Environment.GetEnvironmentVariable("TRZEWIA_BALANS_ZIARNA") ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToHashSet();
        foreach (var w in wzor.EnumerateArray())
        {
            var z = w.GetProperty("ziarno").GetDouble();
            if (zakres.Count > 0 && !zakres.Contains((int)z)) continue;
            var sim = new Sim(z);
            while (sim.tick < 90 * 7200 && sim.ending == null) { sim.step(); if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny"); }
            var koniec = sim.ending ?? "brak";
            if (koniec.StartsWith("uwolnienie")) wygrane++;
            if (w.GetProperty("koniec").GetString()!.StartsWith("uwolnienie")) wygraneTs++;
            var zgodny = koniec == w.GetProperty("koniec").GetString() && sim.tick == w.GetProperty("tik").GetDouble() && Fnv64(Kanon.Zapisz(sim)) == w.GetProperty("skrot").GetString();
            wyj.WriteLine($"ziarno {z}: {koniec} po {sim.tick / 7200:F1} min{(zgodny ? "" : "  ← INNY NIŻ W TS")}");
            if (!zgodny) inne.Add($"ziarno {z}");
        }
        wyj.WriteLine($"wygrane: C# {wygrane}, TS {wygraneTs}");
        Assert.True(inne.Count == 0, "partie różne niż w TS: " + string.Join(", ", inne));
    }
}
