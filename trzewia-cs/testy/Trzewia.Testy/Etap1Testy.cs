using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Skia;

namespace Trzewia.Testy;

/// <summary>Etap 1: klawisze jak w TS, barwy CSS, liczby jak w JavaScripcie, JSON ustawień, płótno na procesorze.</summary>
public class Etap1Testy
{
    [Theory]
    [InlineData("Escape", Akcja.menu)]
    [InlineData(" ", Akcja.pauza)]
    [InlineData("+", Akcja.szybciej)]
    [InlineData("q", Akcja.narzedzie1)]
    [InlineData("Q", Akcja.narzedzie1)]      // Shift+q — przeglądarka podaje „Q”, akcja ta sama
    [InlineData("]", Akcja.przyblizenie)]
    [InlineData("p", Akcja.menu)]            // klawisz zapasowy
    [InlineData("g", Akcja.kopDroge)]
    public void KlawiszeJakWTs(string klawisz, Akcja akcja) => Assert.Equal(akcja, Keybinds.akcjaDlaKlawisza(klawisz));

    [Fact]
    public void KlawiszBezAkcji() => Assert.Null(Keybinds.akcjaDlaKlawisza("F7"));

    [Fact]
    public void NazwyKlawiszy()
    {
        Assert.Equal("spacja", Keybinds.nazwaKlawisza(" "));
        Assert.Equal("esc", Keybinds.nazwaKlawisza("Escape"));
        Assert.Equal("Q", Keybinds.nazwaKlawisza("q"));
        Assert.Equal("—", Keybinds.nazwaKlawisza(""));
    }

    [Fact]
    public void BarwyCss()
    {
        Assert.True(Barwa.Czytaj("#e0b068", out var a));
        Assert.Equal(new Barwa(0xe0 / 255f, 0xb0 / 255f, 0x68 / 255f, 1), a);
        Assert.True(Barwa.Czytaj("rgba(236,222,190,0.96)", out var b));
        Assert.Equal(Barwa.Rgba(236, 222, 190, 0.96), b);
        Assert.True(Barwa.Czytaj("#000", out var c));
        Assert.Equal(Barwa.Czarna, c);
        Assert.False(Barwa.Czytaj("nie-barwa", out _));
        // składowe zaokrąglane jak w przeglądarce (połówki w górę) i obcinane do 0–255
        Assert.Equal(Barwa.Rgba(13, 0, 255, 1), Barwa.Rgba(12.5, -4, 300, 1));
    }

    [Theory]
    [InlineData(0.0, "0")]
    [InlineData(1.5, "1.5")]
    [InlineData(-2.0, "-2")]
    [InlineData(0.1 + 0.2, "0.30000000000000004")]
    [InlineData(1e21, "1e+21")]
    [InlineData(1e20, "100000000000000000000")]
    [InlineData(1e-7, "1e-7")]
    [InlineData(0.000001, "0.000001")]
    [InlineData(123456789.125, "123456789.125")]
    public void LiczbyJakWJs(double x, string js) => Assert.Equal(js, Json.Liczba(x));

    [Fact]
    public void JsonTamIZPowrotem()
    {
        var d = new Dictionary<string, object?> { ["a"] = 1.5, ["b"] = "ząb \"x\"", ["c"] = new List<object?> { true, null, 3.0 } };
        var t = Json.Pisz(d);
        Assert.Equal("{\"a\":1.5,\"b\":\"ząb \\\"x\\\"\",\"c\":[true,null,3]}", t);
        var z = (Dictionary<string, object?>)Json.Czytaj(t)!;
        Assert.Equal(1.5, z["a"]);
        Assert.Equal("ząb \"x\"", z["b"]);
    }

    [Fact]
    public void UstawieniaWFormacieTs()
    {
        // pole po polu jak obiekt Settings w TS; zapis i odczyt przez pliki gracza (tu w pamięci)
        SettingsStore.ustaw(ref SettingsStore.ustawienia.limitKlatek, 60.0);
        var t = Gospodarz.Pliki.Czytaj("ustawienia.json")!;
        var d = (Dictionary<string, object?>)Json.Czytaj(t)!;
        Assert.Equal(60.0, d["limitKlatek"]);
        Assert.Equal("auto", d["jakosc"]);
        Assert.Equal(true, d["kameraZaZyciem"]);
        SettingsStore.ustaw(ref SettingsStore.ustawienia.limitKlatek, 0.0);
    }

    [Fact]
    public void PlotnoRysujeNaProcesorze()
    {
        // bez karty graficznej (FabrykaSkia.Kontekst == null) płótno rysuje procesorem — testy nie potrzebują okna
        using var p = new PlotnoSkia(40, 20);
        p.fillStyle = "#ff0000";
        p.fillRect(0, 0, 20, 20);
        p.globalCompositeOperation = "lighter";
        p.fillStyle = "rgba(0,0,255,1)";
        p.fillRect(10, 0, 20, 20);
        var img = p.Migawka()!;
        using var bmp = SkiaSharp.SKBitmap.FromImage(img);
        Assert.Equal(new SkiaSharp.SKColor(255, 0, 0), bmp.GetPixel(5, 5));
        Assert.Equal(new SkiaSharp.SKColor(255, 0, 255), bmp.GetPixel(15, 5));   // lighter = dodawanie
        Assert.Equal(new SkiaSharp.SKColor(0, 0, 255), bmp.GetPixel(25, 5));
        Assert.Equal(new SkiaSharp.SKColor(0, 0, 0, 0), bmp.GetPixel(35, 5));
    }

    [Fact]
    public void SciezkaWPrzestrzeniUzytkownika()
    {
        // Chrome: punkt dodany przed scale() zostaje tam, gdzie był na płótnie
        using var p = new PlotnoSkia(40, 40);
        p.beginPath();
        p.moveTo(0, 0); p.lineTo(10, 0); p.lineTo(10, 10); p.lineTo(0, 10); p.closePath();
        p.scale(2, 2);
        p.fillStyle = "#00ff00";
        p.fill();
        using var bmp = SkiaSharp.SKBitmap.FromImage(p.Migawka()!);
        Assert.Equal(new SkiaSharp.SKColor(0, 255, 0), bmp.GetPixel(5, 5));
        Assert.Equal(0, bmp.GetPixel(15, 15).Alpha);   // nie przeskalowana do 20×20
    }

    [Fact]
    public void LukPelnyIZaokraglonyProstokat()
    {
        using var p = new PlotnoSkia(40, 40);
        p.beginPath();
        p.arc(20, 20, 10, 0, Math.PI * 2);
        p.fillStyle = "#ffffff";
        p.fill();
        using var bmp = SkiaSharp.SKBitmap.FromImage(p.Migawka()!);
        Assert.Equal(255, bmp.GetPixel(20, 20).Alpha);
        Assert.Equal(255, bmp.GetPixel(20, 12).Alpha);
        Assert.Equal(0, bmp.GetPixel(20, 8).Alpha);
        var s = new Path2D();
        s.roundRect(0, 0, 10, 10, 50);   // za duży promień zmniejszony jak w specyfikacji → koło
        Assert.False(s.Pusta);
    }
}
