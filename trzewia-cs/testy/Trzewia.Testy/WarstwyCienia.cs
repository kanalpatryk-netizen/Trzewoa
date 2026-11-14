using SkiaSharp;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;

namespace Trzewia.Testy;

/// <summary>
/// Cień i filtr rysują się w warstwie. Warstwa ma granice rysowanego kształtu (szybkość — PlotnoSkia.Przed); obraz
/// musi być taki sam jak z warstwą na całe płótno: kształty, obrysy, napisy, obrazki, z obrotem, skalą i przesuniętym cieniem
/// (z dokładnością do wygładzania krawędzi — patrz niżej).
/// </summary>
public class WarstwyCienia
{
    static int[] narysuj(bool bezGranic)
    {
        PlotnoSkia.BezGranicWarstw = bezGranic;
        try
        {
            Plotno.Fabryka ??= new FabrykaSkia();
            using var p = new PlotnoSkia(400, 300);
            using var obrazek = new PlotnoSkia(40, 30);
            obrazek.fillStyle = "#c84"; obrazek.fillRect(0, 0, 40, 30);
            obrazek.fillStyle = "#fff"; obrazek.beginPath(); obrazek.arc(20, 15, 10, 0, Math.PI * 2); obrazek.fill();
            p.fillStyle = "#222"; p.fillRect(0, 0, 400, 300);
            p.shadowColor = "rgba(255,200,80,0.8)"; p.shadowBlur = 18;
            p.fillStyle = "#4a8"; p.fillRect(20, 20, 60, 40);
            p.shadowOffsetX = 12; p.shadowOffsetY = 9;
            p.strokeStyle = "#e33"; p.lineWidth = 9; p.lineJoin = "miter"; p.miterLimit = 10;
            p.beginPath(); p.moveTo(120, 20); p.lineTo(200, 80); p.lineTo(130, 90); p.stroke();
            p.save(); p.translate(300, 60); p.rotate(0.7); p.scale(1.6, 0.8);
            p.fillStyle = "#58f"; p.beginPath(); p.arc(0, 0, 25, 0, Math.PI * 2); p.fill();
            p.restore();
            p.shadowOffsetX = 0; p.shadowOffsetY = 4; p.shadowBlur = 6;
            p.font = "24px serif"; p.fillStyle = "#eee"; p.textAlign = "center"; p.fillText("Trzewia — cień", 200, 150);
            p.textAlign = "left"; p.fillText("ściśnięty napis za szeroki", 20, 190, 120);
            p.lineWidth = 2; p.strokeStyle = "#fd8"; p.strokeText("obrys", 260, 190);
            p.shadowBlur = 25; p.shadowColor = "rgba(0,0,0,0.9)";
            p.drawImage(obrazek, 40, 220, 80, 60);
            p.save(); p.translate(250, 250); p.rotate(-0.4); p.drawImage(obrazek, -40, -30, 80, 60); p.restore();
            p.shadowColor = "transparent";
            p.filter = "blur(4px)"; p.fillStyle = "#9cf"; p.fillRect(330, 200, 40, 40); p.filter = "none";
            var plik = Path.Combine(Path.GetTempPath(), $"trzewia-warstwy-{bezGranic}.png");
            Assert.True(p.ZapiszPng(plik));
            using var b = SKBitmap.Decode(plik);
            return b.Pixels.Select(c => (int)(uint)c).ToArray();
        }
        finally { PlotnoSkia.BezGranicWarstw = false; }
    }

    [Fact]
    public void TenSamObraz()
    {
        var a = narysuj(false);
        var b = narysuj(true);
        int rozne = 0, maks = 0; int x0 = 9999, y0 = 9999, x1 = -1, y1 = -1;
        for (int i = 0; i < a.Length; i++)
        {
            int d = 0;
            for (int s = 0; s < 32; s += 8) d = Math.Max(d, Math.Abs(((a[i] >> s) & 255) - ((b[i] >> s) & 255)));
            if (d > 1) { rozne++; int x = i % 400, y = i / 400; x0 = Math.Min(x0, x); y0 = Math.Min(y0, y); x1 = Math.Max(x1, x); y1 = Math.Max(y1, y); }
            maks = Math.Max(maks, d);
        }
        // przy obrocie z nierówną skalą Skia wygładza brzeg kształtu w mniejszej warstwie trochę inaczej (pojedyncze
        // piksele krawędzi, różnica do ~26/255); ucięty cień albo kształt dałby różnice rzędu 100–255 na wielu pikselach
        Assert.True(maks <= 40 && rozne < 400, $"różnych pikseli: {rozne}, największa różnica {maks}, w prostokącie ({x0},{y0})–({x1},{y1})");
    }
}
