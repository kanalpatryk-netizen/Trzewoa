using System.Globalization;
using Trzewia.Js;

namespace Trzewia.Testy;

/// <summary>
/// Math.sin, Math.cos, Math.atan2 bit w bit jak w Chromium (V8 z LLVM libc — poprawnie zaokrąglone). Wzorzec:
/// testy/zlote/chromium-trygonometria.txt — 10 000 losowych argumentów policzonych w Chromium 153 (10.11; przed zapisem sprawdzone na 200 000).
/// Kolumny: x, y, sin x, cos x, atan2(x, y), hypot(x, y), sqrt|x| (bity double, szesnastkowo).
/// </summary>
public class JsMathTesty
{
    static double D(string h) => BitConverter.Int64BitsToDouble((long)ulong.Parse(h, NumberStyles.HexNumber));
    static string H(double x) => ((ulong)BitConverter.DoubleToInt64Bits(x)).ToString("x");

    [Fact]
    public void JakWChromium()
    {
        int n = 0;
        foreach (var l in File.ReadLines(Path.Combine(Sciezka.Testy, "zlote", "chromium-trygonometria.txt")))
        {
            var p = l.Split(' ');
            double a = D(p[0]), b = D(p[1]);
            Assert.True(p[2] == H(JsMath.Sin(a)), $"sin({a:R})");
            Assert.True(p[3] == H(JsMath.Cos(a)), $"cos({a:R})");
            Assert.True(p[4] == H(JsMath.Atan2(a, b)), $"atan2({a:R}, {b:R})");
            Assert.True(p[5] == H(Js.Js.Hypot(a, b)), $"hypot({a:R}, {b:R})");
            n++;
        }
        Assert.Equal(10000, n);
    }

    [Fact]
    public void SzybkaJakDokladna()
    {
        var r = new Random(11);
        for (int i = 0; i < 2000; i++)
        {
            double a = (r.NextDouble() * 2 - 1) * Math.Pow(10, r.Next(-4, 8)), b = (r.NextDouble() * 2 - 1) * Math.Pow(10, r.Next(-4, 8));
            Assert.Equal(JsMath.SinDokladnie(a), JsMath.Sin(a));
            Assert.Equal(JsMath.CosDokladnie(a), JsMath.Cos(a));
            Assert.Equal(JsMath.Atan2Dokladnie(a, b), JsMath.Atan2(a, b));
        }
    }

    [Fact]
    public void PrzypadkiSzczegolne()
    {
        Assert.Equal(Math.PI, JsMath.Atan2(0, -1));
        Assert.Equal(-Math.PI, JsMath.Atan2(-0.0, -1));
        Assert.True(double.IsNegative(JsMath.Atan2(-0.0, 1)));
        Assert.Equal(Math.PI / 2, JsMath.Atan2(1, 0));
        Assert.True(double.IsNaN(JsMath.Sin(double.PositiveInfinity)));
        Assert.True(double.IsNegative(JsMath.Sin(-0.0)));
        Assert.Equal(1.0, JsMath.Cos(0));
    }
}
