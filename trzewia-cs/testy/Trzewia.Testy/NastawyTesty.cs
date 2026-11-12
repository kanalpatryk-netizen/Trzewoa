using System.Text.Json;
using Trzewia.Nastawy;
using Trzewia.Rdzen;

namespace Trzewia.Testy;

/// <summary>
/// Nastawy w C# mają te same liczby co w TS: każdy eksport każdego pliku porównany z wartościami prosto z modułów TS
/// (testy/zlote/nastawy-ts.json — wypisuje je narzedzia/nastawy/nastawy-cs.mjs przy generowaniu).
/// </summary>
public class NastawyTesty
{
    [Fact]
    public void JakWTs()
    {
        var wzorzec = JsonDocument.Parse(File.ReadAllText(Path.Combine(Sciezka.Testy, "zlote", "nastawy-ts.json"))).RootElement;
        int porownan = 0;
        foreach (var p in Rejestr.Pliki)
        {
            var cs = JsonDocument.Parse(NastawyJson.Wypisz(p.Value)).RootElement;
            Porownaj(wzorzec.GetProperty(p.Key), cs, p.Key, ref porownan);
        }
        Assert.True(porownan > 2000, $"porównań: {porownan}");
    }

    static void Porownaj(JsonElement ts, JsonElement cs, string gdzie, ref int n)
    {
        switch (ts.ValueKind)
        {
            case JsonValueKind.Object:
                Assert.True(cs.ValueKind == JsonValueKind.Object, $"{gdzie}: w C# nie obiekt");
                foreach (var w in ts.EnumerateObject())
                {
                    Assert.True(cs.TryGetProperty(w.Name, out var c), $"{gdzie}.{w.Name}: brak w C#");
                    Porownaj(w.Value, c, $"{gdzie}.{w.Name}", ref n);
                }
                foreach (var w in cs.EnumerateObject()) Assert.True(ts.TryGetProperty(w.Name, out _), $"{gdzie}.{w.Name}: nadmiarowe w C#");
                break;
            case JsonValueKind.Array:
                Assert.Equal(ts.GetArrayLength(), cs.GetArrayLength());
                for (int i = 0; i < ts.GetArrayLength(); i++) Porownaj(ts[i], cs[i], $"{gdzie}[{i}]", ref n);
                break;
            case JsonValueKind.Number:
                Assert.True(ts.GetDouble() == cs.GetDouble(), $"{gdzie}: TS {ts.GetDouble():R}, C# {cs.GetDouble():R}");
                n++;
                break;
            default:
                Assert.True(ts.ToString() == cs.ToString(), $"{gdzie}: TS „{ts}”, C# „{cs}”");
                n++;
                break;
        }
    }

    [Fact]
    public void NadpisanieZJson()
    {
        var stare = NastawySwiat.SWIAT.jaskinie.prog;
        var ost = NastawyJson.Wczytaj(typeof(NastawySwiat), "{ \"SWIAT\": { \"jaskinie\": { \"prog\": 0.65, \"literowka\": 1 }, \"szerokosc\": \"zle\" } }", "swiat.json");
        try
        {
            Assert.Equal(0.65, NastawySwiat.SWIAT.jaskinie.prog);
            Assert.Equal(192.0, NastawySwiat.SWIAT.szerokosc);                 // zły typ — zostaje z kodu
            Assert.Contains(ost, o => o.Contains("literowka"));
            Assert.Contains(ost, o => o.Contains("szerokosc"));
        }
        finally { NastawySwiat.SWIAT.jaskinie.prog = stare; }
    }
}
