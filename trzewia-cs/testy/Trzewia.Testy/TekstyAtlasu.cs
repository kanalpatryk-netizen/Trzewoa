using System.Text.Json;
using Trzewia.Atlas;

namespace Trzewia.Testy;

/// <summary>
/// Teksty tablic atlasu (Atlas/Tablice.cs) znak w znak z kodem TS (narzedzia/atlas/teksty.mjs → testy/zlote/atlas-teksty.json):
/// liczby w opisach biorą się z nastaw, więc test pilnuje i przeniesienia treści, i formatu liczb.
/// </summary>
public class TekstyAtlasu
{
    sealed record T(string id, string grupa, string nazwa, string lacina, string opis, string kiedy, string? koszt);

    [Fact]
    public void ZnakWZnak()
    {
        var plik = Path.Combine(Sciezka.Testy, "zlote", "atlas-teksty.json");
        var wzor = JsonSerializer.Deserialize<List<T>>(File.ReadAllText(plik))!;
        Assert.Equal(wzor.Count, Tablice.TABLICE.Length);
        for (int i = 0; i < wzor.Count; i++)
        {
            var a = wzor[i]; var b = Tablice.TABLICE[i];
            Assert.Equal(a.id, b.id);
            Assert.Equal(a.grupa, b.grupa);
            Assert.Equal(a.nazwa, b.nazwa);
            Assert.Equal(a.lacina, b.lacina);
            Assert.Equal(a.opis, b.opis);
            Assert.Equal(a.kiedy, b.kiedy);
            Assert.Equal(a.koszt, b.koszt);
        }
    }
}
