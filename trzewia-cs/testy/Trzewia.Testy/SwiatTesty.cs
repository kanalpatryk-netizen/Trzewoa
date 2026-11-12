using System.Globalization;
using System.Text.Json;
using Trzewia.Symulacja;

namespace Trzewia.Testy;

/// <summary>
/// Generowanie góry jak w TS: wzorzec z Chromium (narzedzia/wzorce/swiat.ts → testy/zlote/swiaty.json) dla ziaren 1–20 —
/// skróty kafli, progu i powierzchni, położenia sali, drogi, lochu i ruin oraz stan losowania po wygenerowaniu.
/// </summary>
public class SwiatTesty
{
    static uint Fnv(byte[] b)
    {
        uint h = 0x811c9dc5;
        foreach (var x in b) { h ^= x; h = unchecked(h * 0x01000193); }
        return h;
    }

    static byte[] Bajty(short[] s) { var b = new byte[s.Length * 2]; Buffer.BlockCopy(s, 0, b, 0, b.Length); return b; }

    public static IEnumerable<object[]> Ziarna() => Enumerable.Range(1, 20).Select(z => new object[] { z });

    static readonly JsonElement[] Wzorce = JsonDocument.Parse(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "swiaty.json"))).RootElement.EnumerateArray().ToArray();

    static void Prost(JsonElement j, Prost p, string co)
    {
        Assert.True(j.GetProperty("x0").GetDouble() == p.x0 && j.GetProperty("x1").GetDouble() == p.x1
            && j.GetProperty("y0").GetDouble() == p.y0 && j.GetProperty("y1").GetDouble() == p.y1, $"{co}: TS {j}, C# {p.x0},{p.x1},{p.y0},{p.y1}");
    }

    static void Xy(JsonElement j, XY p, string co) =>
        Assert.True(j.GetProperty("x").GetDouble() == p.x && j.GetProperty("y").GetDouble() == p.y, $"{co}: TS {j}, C# {p.x},{p.y}");

    [Theory]
    [MemberData(nameof(Ziarna))]
    public void JakWTs(int ziarno)
    {
        var t = Wzorce.First(e => e.GetProperty("ziarno").GetInt32() == ziarno);
        var w = new World(ziarno);
        Assert.Equal(t.GetProperty("tile").GetUInt32(), Fnv(w.tile.d));
        Assert.Equal(t.GetProperty("prog").GetUInt32(), Fnv(w.prog.d));
        Assert.Equal(t.GetProperty("surface").GetUInt32(), Fnv(Bajty(w.surface.d)));
        Assert.Equal(t.GetProperty("coreX").GetDouble(), w.coreX);
        Assert.Equal(t.GetProperty("coreY").GetDouble(), w.coreY);
        Assert.Equal(t.GetProperty("przedsionekY").GetDouble(), w.przedsionekY);
        Xy(t.GetProperty("salaStart"), w.salaStart, "salaStart");
        Xy(t.GetProperty("oltarz"), w.oltarz, "oltarz");
        Xy(t.GetProperty("kociol"), w.kociol, "kociol");
        Assert.Equal(t.GetProperty("szybX").GetDouble(), w.szybX);
        Assert.Equal(t.GetProperty("szybDol").GetDouble(), w.szybDol);
        Assert.Equal(t.GetProperty("szybWiadraX").GetDouble(), w.szybWiadraX);
        Assert.Equal(t.GetProperty("szybWiadraDol").GetDouble(), w.szybWiadraDol);
        Prost(t.GetProperty("salaOltarza"), w.salaOltarza, "salaOltarza");
        Prost(t.GetProperty("szybDrogi"), w.szybDrogi, "szybDrogi");
        Prost(t.GetProperty("komnata"), w.komnata, "komnata");
        Prost(t.GetProperty("loch"), w.loch, "loch");
        Prost(t.GetProperty("brama"), w.brama, "brama");
        Prost(t.GetProperty("przedproze"), w.przedproze, "przedproze");
        var od = t.GetProperty("odcinkiDrogi").EnumerateArray().ToArray();
        Assert.Equal(od.Length, w.odcinkiDrogi.Count);
        for (int i = 0; i < od.Length; i++) Prost(od[i], w.odcinkiDrogi[i], $"odcinek {i}");
        Assert.Equal(t.GetProperty("unknown").GetDouble(), w.unknown);
        var ruiny = t.GetProperty("ruiny").EnumerateArray().ToArray();
        Assert.Equal(ruiny.Length, w.ruiny.Count);
        for (int i = 0; i < ruiny.Length; i++)
        {
            var r = ruiny[i]; var c = w.ruiny[i];
            Assert.Equal(r.GetProperty("rodzaj").GetString(), c.rodzaj);
            Assert.Equal(r.GetProperty("x0").GetDouble(), c.x0); Assert.Equal(r.GetProperty("y0").GetDouble(), c.y0);
            Assert.Equal(r.GetProperty("x1").GetDouble(), c.x1); Assert.Equal(r.GetProperty("y1").GetDouble(), c.y1);
            Assert.Equal(r.GetProperty("dno").GetDouble(), c.dno);
            Assert.Equal(r.GetProperty("mury").GetInt32(), c.mury.Count);
            Assert.Equal(r.GetProperty("gruz").GetInt32(), c.gruz.Count);
            Assert.Equal(r.GetProperty("belki").GetInt32(), c.belki.Count);
            Assert.Equal(r.GetProperty("luki").GetInt32(), c.luki.Count);
            var z = r.GetProperty("zabytek");
            Assert.Equal(z.GetProperty("typ").GetString(), c.zabytek.typ);
            Assert.Equal(z.GetProperty("x").GetDouble(), c.zabytek.x);
            Assert.Equal(z.GetProperty("y").GetDouble(), c.zabytek.y);
        }
        Assert.Equal(t.GetProperty("stanRng").GetDouble(), w.rng.next());
    }
}
