using System.Text.Json;
using System.Text.Json.Nodes;
using Trzewia.Nastawy;
using Trzewia.Symulacja;
using Xunit.Abstractions;
using JS = Trzewia.Js.Js;

namespace Trzewia.Testy;

/// <summary>
/// Tryb Kręgu Trzeciego (krag-3-beta, gałąź claude/youthful-wozniak-dqa6s9) — ta sama gra co w TS, bit w bit:
/// nastawy kręgu, partie z botem (skróty stanu co 1000 tików), test pieczęci i Cerbera z trzema głowami, pełne partie
/// bota do końca walki. Wzorce: testy/zlote/krag/*.json (narzedzia/wzorce/krag/zlote.ts, KRAG=…/krag-3-beta).
/// Każdy test włącza tryb kręgu i wyłącza go na koniec (W trybie kręgu).
/// </summary>
public class KragTesty
{
    readonly ITestOutputHelper wyj;
    public KragTesty(ITestOutputHelper wyj) { this.wyj = wyj; }

    /// <summary>
    /// Tryb kręgu na czas testu (<c>using var _ = new WTrybieKregu();</c>). Porównanie z TS — bez nowej walki według
    /// wzorów (Symulacja/WalkaWzor.cs): TS jej nie ma; z wyłączoną gra liczy walkę jak dotąd, bit w bit.
    /// </summary>
    sealed class WTrybieKregu : IDisposable
    {
        readonly bool wzor = WalkaWzor.Wlaczony;
        public WTrybieKregu() { Krag.Ustaw(true); WalkaWzor.Wlaczony = false; }
        public void Dispose() { Krag.Ustaw(false); WalkaWzor.Wlaczony = wzor; }
    }

    static string Wzorzec(string plik) => File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "krag", plik));

    /// <summary>
    /// W trybie kręgu wszystkie nastawy jak w krag-3-beta (testy/zlote/krag/nastawy-ts.json); nowe nastawy kręgu (KRAG,
    /// SCIECIE_GLOW i ruch „Ścięcie głowy”) leżą w C# w jednym pliku „krag”. Po wyłączeniu — znów jak w Alphie 1.
    /// </summary>
    [Fact]
    public void NastawyJakWKregu()
    {
        var ts = JsonNode.Parse(Wzorzec("nastawy-ts.json"))!.AsObject();
        // w TS ścięcie głów jest w walka.ts — w C# w pliku „krag”, obok KRAG
        var walka = ts["walka"]!.AsObject();
        var sg = walka["SCIECIE_GLOW"]!; walka.Remove("SCIECIE_GLOW");
        var rr = walka["RUCHY_RYCERZA"]!.AsObject();
        var ruch = rr["sciecieGlowy"]!; rr.Remove("sciecieGlowy");
        var krag = ts["krag"]!.AsObject();
        krag["SCIECIE_GLOW"] = sg.DeepClone();
        krag["SCIECIE_GLOWY"] = ruch.DeepClone();
        var wzorzec = JsonDocument.Parse(ts.ToJsonString()).RootElement;
        int porownan = 0;
        using (new WTrybieKregu())
        {
            foreach (var p in Rejestr.Pliki)
            {
                var cs = JsonDocument.Parse(NastawyJson.Wypisz(p.Value)).RootElement;
                NastawyTesty.Porownaj(wzorzec.GetProperty(p.Key), cs, p.Key, ref porownan);
            }
            Assert.Equal("Cerber", NastawyPomnik.DEMON.nazwa);
            Assert.Equal("Potępieni", Races.RACES[Race.GOBLIN].name);
        }
        Assert.True(porownan > 2000, $"porównań: {porownan}");
        // po wyłączeniu kręgu — Alpha 1 jak była
        Assert.False(Krag.Wlaczony);
        Assert.Equal("Demon z pomnika", NastawyPomnik.DEMON.nazwa);
        Assert.Equal("Pobożni", Races.RACES[Race.GOBLIN].name);
        var alfa = JsonDocument.Parse(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "nastawy-ts.json"))).RootElement;
        int n = 0;
        foreach (var plik in KragNadpisy.Pliki.Keys)
            NastawyTesty.Porownaj(alfa.GetProperty(plik), JsonDocument.Parse(NastawyJson.Wypisz(KragNadpisy.Typ(plik)!)).RootElement, plik, ref n);
    }

    static readonly Lazy<List<List<string>>> Skroty = new(() => JsonSerializer.Deserialize<List<List<string>>>(Wzorzec("skroty-rozsadny.json"))!);

    public static IEnumerable<object[]> Ziarna() => Enumerable.Range(1, 20).Select(z => new object[] { z });

    /// <summary>Partia z botem w trybie kręgu: skrót pełnego stanu co 1000 tików jak w TS kręgu.</summary>
    [Theory]
    [MemberData(nameof(Ziarna))]
    public void PartiaZBotem(int ziarno)
    {
        using var _ = new WTrybieKregu();
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
        wyj.WriteLine($"krąg, ziarno {ziarno}: {wzor.Count} skrótów zgodnych (do tiku {sim.tick}), ulewa od {sim.lud.krag?.ulewaOd}");
        void Sprawdz(int k, Sim s)
        {
            var kanon = Kanon.Zapisz(s);
            if (ZloteTesty.Fnv64(kanon) == wzor[k]) return;
            var plik = Path.Combine(Path.GetTempPath(), $"trzewia-krag-stan-cs-z{ziarno}-t{k * 1000}.json");
            File.WriteAllText(plik, kanon);
            Assert.Fail($"krąg, ziarno {ziarno}, tik {k * 1000}: stan różni się od TS kręgu. Stan C#: {plik}.");
        }
    }

    /// <summary>
    /// Pieczęć i Cerber (krag-3-beta/scripts/test-pomnika.mjs): modlitwa kruszy pieczęć w trzech stanach, przy 100% rozpad,
    /// Cerber wychodzi, rycerz zbija paski głów i ścina pustą głowę — po trzeciej Uwolnienie. Przebieg jak w TS kręgu.
    /// </summary>
    [Fact]
    public void Pieczec12()
    {
        using var _ = new WTrybieKregu();
        var wzor = JsonDocument.Parse(Wzorzec("pomnik.json")).RootElement;
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
            int scietych = 0;
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
                if (boss != null && p?.faza == "walka" && i - fazy[^1].Item2 > 600 && i % 30 == 0)
                {
                    var r = sim.creatures.FirstOrDefault(c => !c.dead && c.rola == "rycerz");
                    // pusty pasek głowy: rana już go nie zbija — rycerz ścina głowę (trzecia kończy walkę)
                    if (r != null && Walka.glowaCzeka(boss)) { scietych++; Walka.ucinaGlowe(sim, boss, r); }
                    else if (r != null) Straznicy.ranStraznika(sim, boss, r, 60);
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
            var okKoniec = (sim.ending ?? "").StartsWith("uwolnienie") && sim.rytual.pekniecia == NastawyPomnik.POMNIK.pekniec;
            var okGlowy = scietych == 3;
            var tz = wzor[z];
            var zgodnyZTs = tz.GetProperty("tikow").GetDouble() == i && tz.GetProperty("koniec").GetString() == (sim.ending ?? "brak")
                && tz.GetProperty("scietych").GetDouble() == scietych && tz.GetProperty("skrot").GetString() == ZloteTesty.Fnv64(Kanon.Zapisz(sim));
            wyj.WriteLine($"krąg, ziarno {z}: stany {string.Join(" ", stany.Select(s => $"{s.Item1}@{s.Item2}"))} · fazy {string.Join(" ", fazy.Select(f => $"{f.Item1}@{f.Item2}"))} · ściętych głów {scietych} · koniec {sim.ending} po {i} tikach{(zgodnyZTs ? " · zgodny z TS" : " · INNY NIŻ W TS")}");
            if (!(okStany && okFazy && okKoniec && okGlowy && zgodnyZTs)) zle.Add($"ziarno {z}");
        }
        Assert.True(zle.Count == 0, "pieczęć/Cerber nie w normie: " + string.Join(", ", zle));
    }

    /// <summary>Pełne partie bota w trybie kręgu (ziarna 3 i 5, do 200 000 tików): koniec, tik, faza i skrót stanu jak w TS.</summary>
    [Fact]
    public void PartieDoKonca()
    {
        using var _ = new WTrybieKregu();
        var wzor = JsonDocument.Parse(Wzorzec("wyniki-rozsadny.json")).RootElement;
        var inne = new List<string>();
        foreach (var w in wzor.EnumerateArray())
        {
            var z = w.GetProperty("ziarno").GetDouble();
            var sim = new Sim(z);
            while (sim.tick < 200000 && sim.ending == null) { sim.step(); if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny"); }
            var koniec = sim.ending ?? "brak";
            var faza = sim.lud.pomnik?.faza ?? "brak";
            var zgodny = koniec == w.GetProperty("koniec").GetString() && sim.tick == w.GetProperty("tik").GetDouble()
                && faza == w.GetProperty("faza").GetString() && ZloteTesty.Fnv64(Kanon.Zapisz(sim)) == w.GetProperty("skrot").GetString();
            var glowy = sim.creatures.FirstOrDefault(c => c.boss != null)?.glowyOdciete?.Count ?? -1;
            wyj.WriteLine($"krąg, ziarno {z}: {koniec} po {sim.tick} tikach ({sim.tick / 7200:F1} min), faza {faza}, ściętych głów {glowy}{(zgodny ? "" : "  ← INNY NIŻ W TS")}");
            if (!zgodny) inne.Add($"ziarno {z}");
        }
        Assert.True(inne.Count == 0, "partie kręgu różne niż w TS: " + string.Join(", ", inne));
    }
}
