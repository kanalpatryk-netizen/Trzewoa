// Port: krag-3-beta/src/render/pieklo.ts — PIEKŁO DANTEGO, wspólna atmosfera Kręgu Trzeciego. Pieśń VI: „deszczu
// wiecznego, przeklętego, zimnego i ciężkiego… Grad gruby, woda brudna i śnieg przez ciemne powietrze się leje; cuchnie
// ziemia, która to przyjmuje”. Rzeczy wspólne dla nieba, leja, przepaści, gruntu i trzewi:
//  - tekstura burzowych chmur (raz, w pamięci): ciężki strop z wymionami, podświetlony od spodu łuną niższych kręgów;
//  - tekstura mgły i wyziewów (smród gnijącego błota);
//  - błyskawica: jeden zegar dla całego obrazu;
//  - łuna z dna: czerwony blask niższych kręgów (miasto Dis), wolno dyszy.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using JS = Trzewia.Js.Js;

namespace Trzewia.Rysunek
{
    /// <summary>Błysk błyskawicy: jasność teraz, numer (ziarno kształtu), czas od początku (s), gdzie uderza (0…1 szerokości).</summary>
    public struct Blysk { public double a, nr, f, x; }

    public static class Pieklo
    {
        public static double los(double n0)
        {
            unchecked
            {
                int h = (JS.ToInt32(n0) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }

        static double gladko(double a, double b, double x)
        {
            var t = Math.Max(0, Math.Min(1, (x - a) / (b - a)));
            return t * t * (3 - 2 * t);
        }

        /// <summary>Szum wartości 2D, powtarzalny w poziomie co `okresX` oczek (tekstury chmur zawijają się bez szwu).</summary>
        static double szum2(double x, double y, double okresX, double ziarno)
        {
            double xi = Math.Floor(x), yi = Math.Floor(y);
            double fx = x - xi, fy = y - yi;
            double ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
            double w(double i, double j) => los((((i % okresX) + okresX) % okresX) * 7919 + j * 104729 + ziarno * 1013);
            double a = w(xi, yi), b = w(xi + 1, yi), c = w(xi, yi + 1), d = w(xi + 1, yi + 1);
            return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
        }

        static double fbm(double x, double y, double okresX, double ziarno, int oktawy)
        {
            double s = 0, a = 0.5, n = 0, f = 1;
            for (int o = 0; o < oktawy; o++)
            {
                s += a * szum2(x * f, y * f, okresX * f, ziarno + o * 17);
                n += a; a *= 0.5; f *= 2;
            }
            return s / n;
        }

        /// <summary>Jednowymiarowy szum (poszarpane grzbiety skał, krawędzie kałuż).</summary>
        public static double szum1(double x, double ziarno = 0)
        {
            var i = Math.Floor(x); var f = x - i;
            var u = f * f * (3 - 2 * f);
            double a = los(i * 7919 + ziarno * 31), b = los((i + 1) * 7919 + ziarno * 31);
            return a + (b - a) * u;
        }

        /// <summary>Obrazek z pikseli RGBA bez przemnożenia alfy (jak putImageData) — fabryka chce alfę wymnożoną.</summary>
        static IObraz zPikseli(int w, int h, double[] rgba)
        {
            var b = new byte[w * h * 4];
            for (int i = 0; i < w * h; i++)
            {
                // putImageData zaokrągla i obcina do 0–255 (Uint8ClampedArray)
                double r = Kanal(rgba[i * 4]), g = Kanal(rgba[i * 4 + 1]), bl = Kanal(rgba[i * 4 + 2]), a = Kanal(rgba[i * 4 + 3]);
                b[i * 4] = (byte)Math.Round(r * a / 255, MidpointRounding.AwayFromZero);
                b[i * 4 + 1] = (byte)Math.Round(g * a / 255, MidpointRounding.AwayFromZero);
                b[i * 4 + 2] = (byte)Math.Round(bl * a / 255, MidpointRounding.AwayFromZero);
                b[i * 4 + 3] = (byte)a;
            }
            return Plotno.Fabryka.ObrazZPikseli(w, h, b);
        }
        static double Kanal(double v) => double.IsNaN(v) ? 0 : Math.Max(0, Math.Min(255, Math.Round(v, MidpointRounding.ToEven)));

        // ---------------------------------------------------------------- chmury

        const int CHM_W = 512, CHM_H = 176;
        static IObraz? chmuryC;

        /// <summary>
        /// Burzowy strop: gęsty u góry, w dół rwie się na wymiona i strzępy. Spody podświetlone łuną z dołu, wierzchy sine.
        /// Zawija się w poziomie (rysowana z przesunięciem — chmury płyną).
        /// </summary>
        public static IObraz teksturaChmur()
        {
            if (chmuryC != null) return chmuryC;
            var d = new double[CHM_W * CHM_H * 4];
            const double ok = 8;                                 // oczek szumu na szerokość tekstury (najgrubsza oktawa)
            const double sk = ok / CHM_W;
            var gest = new float[CHM_W * (CHM_H + 8)];
            for (int y = 0; y < CHM_H + 8; y++)
            {
                var v = (double)y / CHM_H;
                for (int x = 0; x < CHM_W; x++)
                {
                    // zawirowanie domeny: kłęby, nie plamy
                    var wx = fbm(x * sk * 1.3, y * sk * 1.3, ok * 1.3, 5, 3);
                    var wy = fbm(x * sk * 1.3 + 7.3, y * sk * 1.3, ok * 1.3, 9, 3);
                    var n = fbm(x * sk + (wx - 0.5) * 1.2, y * sk * 1.9 + (wy - 0.5) * 0.9, ok, 1, 5);
                    // wymiona: bulwy wiszące pod stropem
                    var bulwy = Math.Max(0, Math.Sin(x * sk * Math.PI * 2 * 1.5 + wx * 5)) * Math.Max(0, Math.Sin(v * Math.PI * 1.6 - 0.4));
                    n += bulwy * 0.12;
                    // strop gęsty u góry, w dół rzednie
                    var profil = 1.25 - v * 1.05;
                    gest[y * CHM_W + x] = (float)(n * profil);
                }
            }
            for (int y = 0; y < CHM_H; y++)
            {
                var v = (double)y / CHM_H;
                for (int x = 0; x < CHM_W; x++)
                {
                    double D = gest[y * CHM_W + x];
                    double Dd = gest[(y + 6) * CHM_W + x];
                    var a = gladko(0.38, 0.66, D);
                    // spód kłębu łapie czerwoną łunę; brzeg kłębu prześwituje żarem
                    var spod = Math.Max(0, Math.Min(1, (D - Dd) * 6.5)) * (0.45 + 0.55 * v);
                    var brzeg = (1 - gladko(0.42, 0.62, D)) * a;
                    var wnetrze = gladko(0.5, 0.95, D);
                    // grzbiety kłębów — sine, od błysków i nieba nad lejem
                    var wierzch = Math.Max(0, Math.Min(1, (Dd - D) * 4)) * (1 - v);
                    var i = (y * CHM_W + x) * 4;
                    double r0 = 34 + 46 * v, g0 = 30 + 12 * v, b0 = 38 + 2 * v;
                    var cien = 1.15 - 0.6 * wnetrze;
                    var zar = spod * 1.15 + brzeg * (0.35 + 0.5 * v);
                    d[i] = Math.Min(255, r0 * cien + 225 * zar + 40 * wierzch);
                    d[i + 1] = Math.Min(255, g0 * cien + 72 * zar + 42 * wierzch);
                    d[i + 2] = Math.Min(255, b0 * cien + 30 * zar + 52 * wierzch);
                    d[i + 3] = Math.Round(255 * a * (0.86 + 0.14 * wnetrze), MidpointRounding.AwayFromZero);
                }
            }
            return chmuryC = zPikseli(CHM_W, CHM_H, d);
        }

        /// <summary>Rysuje pas chmur: `y0`…`y1` na ekranie, przesunięcie `dx` (piksele, płynie), skala pozioma `sx`, krycie `a`.</summary>
        public static void pasChmur(IPlotno ctx, double W, double y0, double y1, double dx, double sx, double a)
        {
            if (y1 <= y0 || a <= 0) return;
            var t = teksturaChmur();
            var h = y1 - y0;
            var w = (CHM_W * h / CHM_H) * sx;
            var x = -(((dx % w) + w) % w);
            ctx.save();
            ctx.globalAlpha = ctx.globalAlpha * a;
            ctx.imageSmoothingEnabled = true;
            for (; x < W; x += w) ctx.drawImage(t, x, y0, w + 1, h);
            ctx.restore();
        }

        // ---------------------------------------------------------------- mgła, wyziewy

        const int MGL_W = 256, MGL_H = 48;
        static IObraz? mglaC;

        /// <summary>Mgła przy ziemi: miękkie, poziome pasma (biała — barwi ją rysujący), zawija się w poziomie.</summary>
        public static IObraz teksturaMgly()
        {
            if (mglaC != null) return mglaC;
            var d = new double[MGL_W * MGL_H * 4];
            for (int y = 0; y < MGL_H; y++)
            {
                var v = (double)y / (MGL_H - 1);
                var pion = Math.Pow(Math.Sin(v * Math.PI), 1.4);
                for (int x = 0; x < MGL_W; x++)
                {
                    var n = fbm((double)x / MGL_W * 6, (double)y / MGL_H * 2.2, 6, 41, 4);
                    var a = gladko(0.3, 0.8, n) * pion;
                    var i = (y * MGL_W + x) * 4;
                    d[i] = d[i + 1] = d[i + 2] = 255;
                    d[i + 3] = Math.Round(255 * a, MidpointRounding.AwayFromZero);
                }
            }
            return mglaC = zPikseli(MGL_W, MGL_H, d);
        }

        static readonly Dictionary<string, IPlotno> barwione = new Dictionary<string, IPlotno>();

        /// <summary>Pas mgły barwy `kolor` (CSS) od `y0` do `y1`, płynie o `dx`.</summary>
        public static void pasMgly(IPlotno ctx, double W, double y0, double y1, double dx, string kolor, double a)
        {
            if (y1 <= y0 || a <= 0) return;
            var t = teksturaMgly();
            // barwienie: biała mgła na osobnym płótnie, raz na kolor
            if (!barwione.TryGetValue(kolor, out var b))
            {
                b = Plotno.Nowe(MGL_W, MGL_H);
                b.drawImage(t, 0, 0);
                b.globalCompositeOperation = "source-in";
                b.fillStyle = kolor; b.fillRect(0, 0, MGL_W, MGL_H);
                b.globalCompositeOperation = "source-over";
                barwione[kolor] = b;
            }
            double h = y1 - y0, w = MGL_W * h / MGL_H * 3;
            var x = -(((dx % w) + w) % w);
            ctx.save();
            ctx.globalAlpha = ctx.globalAlpha * a;
            for (; x < W; x += w) ctx.drawImage(b, x, y0, w + 1, h);
            ctx.restore();
        }

        // ---------------------------------------------------------------- błyskawica i łuna

        const double OKNO = 0.55;
        /// <summary>Do podglądu (narzędzia, zrzuty): wymuszony błysk w chwili `f` (s od początku) albo null.</summary>
        public static double? BLYSK_TEST_f = null;
        public static double BLYSK_TEST_nr = 7, BLYSK_TEST_x = 0.42;
        static Blysk ostatniBlysk = new Blysk { a = 0, nr = -1, f = 99, x = 0.5 };
        static double ostatniT = -1;

        /// <summary>
        /// Błyskawice: zegar wspólny dla nieba, leja i błota. Bez ulewy też grzmi (rzadziej), w ulewie — co kilka sekund.
        /// Każdy błysk: jasny strzał, przygaśnięcie, drugi strzał, powolne gaśnięcie.
        /// </summary>
        public static Blysk blyskawica(double teraz, double ulewa)
        {
            if (BLYSK_TEST_f is double ft) return new Blysk { a = profilBlysku(ft), nr = BLYSK_TEST_nr, f = ft, x = BLYSK_TEST_x };
            if (!Nastroj.wolnoRuszac()) return new Blysk { a = 0, nr = -1, f = 99, x = 0.5 };
            var t = teraz / 1000;
            if (t == ostatniT) return ostatniBlysk;
            ostatniT = t;
            var szansa = 0.045 + 0.2 * ulewa;
            var k = Math.Floor(t / OKNO);
            var wynik = new Blysk { a = 0, nr = -1, f = 99, x = 0.5 };
            for (int d = 0; d < 3; d++)
            {
                var kk = k - d;
                if (los(kk * 977 + 13) >= szansa) continue;
                var f = t - (kk * OKNO + los(kk * 31) * 0.2);
                if (f < 0 || f > 1.2) continue;
                var a = profilBlysku(f) * (0.6 + 0.4 * los(kk * 7));
                if (a > wynik.a) wynik = new Blysk { a = a, nr = kk, f = f, x = 0.08 + los(kk * 53) * 0.84 };
            }
            ostatniBlysk = wynik;
            return wynik;
        }

        /// <summary>Jasność błysku po `f` sekundach: strzał, przygaśnięcie, drugi strzał, powolne gaśnięcie.</summary>
        static double profilBlysku(double f)
        {
            if (f < 0) return 0;
            return f < 0.06 ? 1 : f < 0.1 ? 0.3 : f < 0.18 ? 0.9 : 0.9 * Math.Exp(-(f - 0.18) * 4.5);
        }

        /// <summary>Łuna z dna leja (niższe kręgi, miasto Dis): 0,8…1, wolno dyszy.</summary>
        public static double luna(double teraz)
        {
            if (!Nastroj.wolnoRuszac()) return 0.9;
            var t = teraz / 1000;
            return 0.86 + 0.08 * Math.Sin(t * 0.55) + 0.05 * Math.Sin(t * 1.7 + 1.3);
        }

        static readonly (double szer, double al, double r, double g, double b)[] WARSTWY_PIORUNA =
        {
            (7, 0.12, 150, 170, 255), (2.6, 0.35, 190, 205, 255), (1, 1, 250, 252, 255),
        };
        static readonly List<(double x, double y)> pktPioruna = new List<(double, double)>();

        /// <summary>
        /// Piorun: zygzak z gałęziami od (x0, y0) w dół do y1. `a` — jasność, `ziarno` — kształt, `gr` — grubość pnia.
        /// Rysowany „lighter”: biały rdzeń i sina poświata.
        /// </summary>
        public static void piorun(IPlotno ctx, double x0, double y0, double y1, double a, double ziarno, double gr)
        {
            if (a <= 0.02) return;
            void galaz(double x, double y, double yk, double kat, double sila, double n, int gl)
            {
                var pts = new List<(double x, double y)> { (x, y) };
                double px = x, py = y;
                var krok = Math.Max(6, (yk - y) / 14);
                int i = 0;
                while (py < yk && i < 40)
                {
                    px += (los(ziarno * 131 + n * 977 + i * 17) - 0.5) * krok * 1.6 + Math.Sin(kat) * krok * 0.5;
                    py += krok * (0.6 + los(ziarno * 7 + n * 31 + i) * 0.8);
                    pts.Add((px, py));
                    if (gl < 3 && los(ziarno * 53 + n * 11 + i * 7) < 0.13)
                        galaz(px, py, py + (yk - py) * (0.3 + los(i + n) * 0.4), (los(i * 3 + n) - 0.5) * 2.4, sila * 0.55, n * 7 + i + 1, gl + 1);
                    i++;
                }
                for (int w = 0; w < WARSTWY_PIORUNA.Length; w++)
                {
                    var (szer, al, r, g, b) = WARSTWY_PIORUNA[w];
                    ctx.strokeStyle = Barwa.Rgba(r, g, b, Math.Min(1, a * al));
                    ctx.lineWidth = w == 2 ? Math.Max(1, gr * sila) : gr * szer * sila;
                    ctx.beginPath();
                    for (int j = 0; j < pts.Count; j++) { if (j != 0) ctx.lineTo(pts[j].x, pts[j].y); else ctx.moveTo(pts[j].x, pts[j].y); }
                    ctx.stroke();
                }
            }
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            galaz(x0, y0, y1, 0, 1, 1, 0);
            ctx.restore();
        }

        // ---------------------------------------------------------------- iskry i popiół

        /// <summary>
        /// Iskry z otchłani: drobiny żaru wznoszą się z dołu kadru i gasną (deszcz je dusi — nie dolatują wysoko).
        /// `y0`…`y1` — pas ekranu, `n` — ile, `t` — sekundy.
        /// </summary>
        public static void iskry(IPlotno ctx, double x0, double x1, double y0, double y1, int n, double t, double ziarno = 0)
        {
            if (n <= 0 || y1 <= y0) return;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            double H = y1 - y0, W = x1 - x0;
            for (int i = 0; i < n; i++)
            {
                var v = 0.25 + los(i * 13 + ziarno) * 0.5;
                var f = (t * v * 0.35 + los(i * 7 + ziarno)) % 1;
                var x = x0 + ((los(i * 3 + ziarno) * W + Math.Sin(t * 1.3 + i) * 18 + t * 9) % W);
                var y = y1 - f * H;
                var zycie = Math.Sin(f * Math.PI);
                var migot = 0.6 + 0.4 * Math.Sin(t * 13 + i * 2.1);
                var r = 1 + los(i * 19 + ziarno) * 1.6;
                ctx.fillStyle = Barwa.Rgba(255, 120 + (i % 3) * 40, 40 + (i % 2) * 30, 0.75 * zycie * migot);
                ctx.fillRect(x - r / 2, y - r / 2, r, r);
            }
            ctx.restore();
        }

        // ---------------------------------------------------------------- ulewa na ekranie

        static double ulewaEkran = 0, ulewaT = -1;
        /// <summary>Ulewa wygładzona w czasie (żeby deszcz i błyskawice nie skakały); `u` — ulewa z symulacji (0…1).</summary>
        public static double wygladzUlewe(double u, double teraz)
        {
            if (ulewaT < 0) { ulewaT = teraz; ulewaEkran = u; return u; }
            var dt = Math.Max(0, Math.Min(500, teraz - ulewaT));
            if (dt == 0) return ulewaEkran;
            ulewaT = teraz;
            ulewaEkran += (u - ulewaEkran) * (1 - Math.Exp(-dt / 1200));
            return ulewaEkran;
        }
    }
}
