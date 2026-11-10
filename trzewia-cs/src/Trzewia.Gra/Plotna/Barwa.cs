using System;
using System.Collections.Generic;
using System.Globalization;

namespace Trzewia.Plotna
{
    /// <summary>
    /// Barwa RGBA (składowe 0–1, bez przemnożenia przez alfę) — jak barwa CSS w Canvas 2D. Napisy CSS
    /// (fillStyle = 'rgba(12,8,6,0.5)', '#e0b068') czyta <see cref="Czytaj"/> i pamięta; w przenoszonym kodzie barwy
    /// liczone w każdej klatce (w TS składane z napisu `rgba(${r},…)`) idą przez <see cref="Rgba"/> — bez składania
    /// i czytania napisu w każdej klatce, z tym samym wynikiem.
    /// </summary>
    public readonly struct Barwa : IEquatable<Barwa>
    {
        public readonly float r, g, b, a;

        public Barwa(float r, float g, float b, float a) { this.r = r; this.g = g; this.b = b; this.a = a; }

        public Barwa ZAlfa(float alfa) => new Barwa(r, g, b, alfa);

        public bool Equals(Barwa o) => r == o.r && g == o.g && b == o.b && a == o.a;
        public override bool Equals(object? o) => o is Barwa b2 && Equals(b2);
        public override int GetHashCode() => HashCode.Combine(r, g, b, a);
        public override string ToString() => $"rgba({r * 255:0},{g * 255:0},{b * 255:0},{a.ToString(CultureInfo.InvariantCulture)})";

        public static readonly Barwa Przezroczysta = new Barwa(0, 0, 0, 0);
        public static readonly Barwa Czarna = new Barwa(0, 0, 0, 1);

        /// <summary>Jak napis `rgba(r,g,b,a)` w przeglądarce: składowe zaokrąglone i obcięte do 0–255, alfa do 0–1.</summary>
        public static Barwa Rgba(double r, double g, double b, double a = 1) =>
            new Barwa((float)(Skladowa(r) / 255.0), (float)(Skladowa(g) / 255.0), (float)(Skladowa(b) / 255.0),
                (float)Math.Clamp(double.IsNaN(a) ? 0 : a, 0, 1));

        static double Skladowa(double v) => double.IsNaN(v) ? 0 : Math.Clamp(Math.Round(v, MidpointRounding.AwayFromZero), 0, 255);

        static readonly Dictionary<string, Barwa> Pamiec = new Dictionary<string, Barwa>(StringComparer.Ordinal);
        const int MaksPamieci = 8192;

        /// <summary>Czyta barwę CSS. Fałsz — napis niezrozumiały (przeglądarka wtedy zostawia poprzednią barwę).</summary>
        public static bool Czytaj(string s, out Barwa barwa)
        {
            if (Pamiec.TryGetValue(s, out barwa)) return true;
            if (!CzytajBezPamieci(s.Trim().ToLowerInvariant(), out barwa)) return false;
            if (Pamiec.Count >= MaksPamieci) Pamiec.Clear();
            Pamiec[s] = barwa;
            return true;
        }

        static bool CzytajBezPamieci(string s, out Barwa b)
        {
            b = default;
            if (s.Length == 0) return false;
            if (s[0] == '#') return Hex(s.Substring(1), out b);
            int nawias = s.IndexOf('(');
            if (nawias > 0 && s[s.Length - 1] == ')')
            {
                var nazwa = s.Substring(0, nawias).Trim();
                var srodek = s.Substring(nawias + 1, s.Length - nawias - 2);
                var cz = srodek.Split(new[] { ',', ' ', '/' }, StringSplitOptions.RemoveEmptyEntries);
                if ((nazwa == "rgb" || nazwa == "rgba") && (cz.Length == 3 || cz.Length == 4))
                {
                    var v = new double[] { 0, 0, 0, 1 };
                    for (int i = 0; i < cz.Length; i++)
                    {
                        var t = cz[i];
                        bool proc = t.EndsWith("%", StringComparison.Ordinal);
                        if (!Liczba(proc ? t.Substring(0, t.Length - 1) : t, out var x)) return false;
                        v[i] = i < 3 ? (proc ? x * 2.55 : x) : (proc ? x / 100 : x);
                    }
                    b = Rgba(v[0], v[1], v[2], v[3]);
                    return true;
                }
                if ((nazwa == "hsl" || nazwa == "hsla") && (cz.Length == 3 || cz.Length == 4))
                {
                    if (!Liczba(cz[0].Replace("deg", ""), out var h) || !Liczba(cz[1].TrimEnd('%'), out var sat) || !Liczba(cz[2].TrimEnd('%'), out var l)) return false;
                    double a = 1;
                    if (cz.Length == 4)
                    {
                        if (!Liczba(cz[3].TrimEnd('%'), out a)) return false;
                        if (cz[3].EndsWith("%", StringComparison.Ordinal)) a /= 100;
                    }
                    HslNaRgb(h, sat / 100, l / 100, out var r, out var g, out var bb);
                    b = Rgba(r * 255, g * 255, bb * 255, a);
                    return true;
                }
                return false;
            }
            return Nazwane.TryGetValue(s, out b);
        }

        static bool Liczba(string t, out double x) => double.TryParse(t, NumberStyles.Float, CultureInfo.InvariantCulture, out x);

        static void HslNaRgb(double h, double s, double l, out double r, out double g, out double b)
        {
            h = ((h % 360) + 360) % 360 / 360;
            s = Math.Clamp(s, 0, 1); l = Math.Clamp(l, 0, 1);
            double q = l <= 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
            r = Odcien(p, q, h + 1.0 / 3); g = Odcien(p, q, h); b = Odcien(p, q, h - 1.0 / 3);
        }

        static double Odcien(double p, double q, double t)
        {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1.0 / 6) return p + (q - p) * 6 * t;
            if (t < 0.5) return q;
            if (t < 2.0 / 3) return p + (q - p) * (2.0 / 3 - t) * 6;
            return p;
        }

        static int Cyfra(char c) => c >= '0' && c <= '9' ? c - '0' : c >= 'a' && c <= 'f' ? c - 'a' + 10 : -1;

        static bool Hex(string h, out Barwa b)
        {
            b = default;
            var v = new int[] { 0, 0, 0, 255 };
            if (h.Length == 3 || h.Length == 4)
            {
                for (int i = 0; i < h.Length; i++) { int d = Cyfra(h[i]); if (d < 0) return false; v[i] = d * 17; }
            }
            else if (h.Length == 6 || h.Length == 8)
            {
                for (int i = 0; i < h.Length / 2; i++)
                {
                    int d1 = Cyfra(h[2 * i]), d2 = Cyfra(h[2 * i + 1]);
                    if (d1 < 0 || d2 < 0) return false;
                    v[i] = d1 * 16 + d2;
                }
            }
            else return false;
            b = new Barwa(v[0] / 255f, v[1] / 255f, v[2] / 255f, v[3] / 255f);
            return true;
        }

        static readonly Dictionary<string, Barwa> Nazwane = new Dictionary<string, Barwa>
        {
            ["transparent"] = Przezroczysta,
            ["black"] = Rgba(0, 0, 0), ["white"] = Rgba(255, 255, 255), ["red"] = Rgba(255, 0, 0),
            ["green"] = Rgba(0, 128, 0), ["lime"] = Rgba(0, 255, 0), ["blue"] = Rgba(0, 0, 255),
            ["yellow"] = Rgba(255, 255, 0), ["gray"] = Rgba(128, 128, 128), ["grey"] = Rgba(128, 128, 128),
            ["orange"] = Rgba(255, 165, 0), ["gold"] = Rgba(255, 215, 0), ["silver"] = Rgba(192, 192, 192),
            ["maroon"] = Rgba(128, 0, 0), ["purple"] = Rgba(128, 0, 128), ["navy"] = Rgba(0, 0, 128),
            ["teal"] = Rgba(0, 128, 128), ["olive"] = Rgba(128, 128, 0), ["brown"] = Rgba(165, 42, 42),
            ["crimson"] = Rgba(220, 20, 60), ["darkred"] = Rgba(139, 0, 0), ["ivory"] = Rgba(255, 255, 240),
            ["wheat"] = Rgba(245, 222, 179), ["tan"] = Rgba(210, 180, 140), ["beige"] = Rgba(245, 245, 220),
            ["cyan"] = Rgba(0, 255, 255), ["magenta"] = Rgba(255, 0, 255),
        };
    }
}
