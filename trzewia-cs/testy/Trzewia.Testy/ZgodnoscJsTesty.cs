using System.Globalization;
using System.Text.Json;
using Trzewia.Js;
using Trzewia.Rdzen;

namespace Trzewia.Testy;

/// <summary>
/// Zgodność z JavaScriptem: wzorzec z narzedzia/wzorce/zgodnosc.ts liczony w Chromium (kod z alpha-1/src/core/rng.ts)
/// w testy/zlote/js-zgodnosc.json. Sin, cos i atan2 sprawdza osobny wzorzec z Chromium (JsMathTesty).
/// </summary>
public class ZgodnoscJsTesty
{
    static readonly JsonElement W = JsonDocument.Parse(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "js-zgodnosc.json"))).RootElement;

    static double D(JsonElement h) => BitConverter.Int64BitsToDouble((long)ulong.Parse(h.GetString()!, NumberStyles.HexNumber));
    static string H(double x) => ((ulong)BitConverter.DoubleToInt64Bits(x)).ToString("x");

    [Fact]
    public void GeneratorLiczbLosowych()
    {
        foreach (var z in W.GetProperty("rng").EnumerateObject())
        {
            var r = new Rng(double.Parse(z.Name, CultureInfo.InvariantCulture));
            int i = 0;
            foreach (var v in z.Value.EnumerateArray()) Assert.True(v.GetString() == H(r.next()), $"ziarno {z.Name}, liczba {i++}");
        }
    }

    [Fact]
    public void Szum()
    {
        foreach (var z in W.GetProperty("szum").EnumerateObject())
        {
            var n = new Noise(new Rng(double.Parse(z.Name, CultureInfo.InvariantCulture)));
            foreach (var w in z.Value.EnumerateArray())
            {
                double x = D(w[0]), y = D(w[1]);
                Assert.Equal(w[2].GetString(), H(n.fbm(x * 0.05, y * 0.05, 4, 2, 0.5)));
                Assert.Equal(w[3].GetString(), H(n.value(x, y)));
            }
        }
    }

    [Fact]
    public void HypotRoundInt32()
    {
        foreach (var w in W.GetProperty("hypot").EnumerateArray()) Assert.Equal(w[2].GetString(), H(Js.Js.Hypot(D(w[0]), D(w[1]))));
        foreach (var w in W.GetProperty("round").EnumerateArray())
        {
            double x = D(w[0]);
            Assert.Equal(w[1].GetString(), H(Js.Js.Round(x)));
            Assert.Equal(w[2].GetString(), H(Js.Js.Round(x + 0.5)));
            Assert.Equal(w[3].GetString(), H(Js.Js.Round(-0.5 - x * 0)));
        }
        foreach (var w in W.GetProperty("int32").EnumerateArray())
        {
            double big = D(w[0]);
            Assert.Equal(w[1].GetInt64(), Js.Js.ToInt32(big));
            Assert.Equal(w[2].GetInt64(), (long)Js.Js.ToUint32(big));
        }
        Assert.Equal(0.0, Js.Js.Round(0.49999999999999994));
        Assert.True(double.IsNegative(Js.Js.Round(-0.4)));
    }

    [Fact]
    public void SortowanieJakWV8()
    {
        foreach (var w in W.GetProperty("sort").EnumerateArray())
        {
            int n = w.GetProperty("n").GetInt32();
            // porównanie losowe: dokładnie jak w V8 dla tablic krótszych niż 16 (gra sortuje losowo tylko 3 i 4 elementy —
            // sim/ruiny.ts); dłuższe V8 scala PowerSortem, co przy spójnym porównaniu nie zmienia wyniku
            if (n < 16)
            {
                var g = new Rng(n + 1);
                var a = Enumerable.Range(0, n).ToList();
                Js.Js.Sort(a, (_, _) => g.next() - 0.5);
                Assert.Equal(w.GetProperty("losowe").EnumerateArray().Select(e => e.GetInt32()), a);
                Assert.Equal(H(w.GetProperty("stanRng").GetDouble()), H(g.next()));   // tyle samo wywołań porównania
            }
            var h = new Rng(n + 1000);
            var b = Enumerable.Range(0, n).Select(i => (i, k: Js.Js.ToInt32(h.next() * 5))).ToList();
            Js.Js.Sort(b, (p, q) => p.k - q.k);
            Assert.Equal(w.GetProperty("stabilne").EnumerateArray().Select(e => e.GetInt32()), b.Select(e => e.i));
        }
    }
}

static class Sciezka
{
    /// <summary>Folder testy/ (dane wzorców) — szukany w górę od folderu programu testów.</summary>
    public static readonly string Testy = Znajdz();
    static string Znajdz()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d != null && !Directory.Exists(Path.Combine(d.FullName, "zlote"))) d = d.Parent;
        if (d != null) return d.FullName;
        d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d != null && !Directory.Exists(Path.Combine(d.FullName, "testy", "zlote"))) d = d.Parent;
        return Path.Combine(d!.FullName, "testy");
    }
}
