// Port: alpha-1/src/render/nastroj.ts — nastrój ściany krypty: pył w świetle lampki, napisy nieznanym pismem, które same
// pojawiają się w tynku, i płynne przejścia (krążek pod kursorem rozjaśnia się, zamiast przeskakiwać).
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyWygladNastroj;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    public static class Nastroj
    {
        /// <summary>Czy wolno się ruszać (ustawienia → „ogranicz ruch”).</summary>
        public static bool wolnoRuszac() => !ustawienia.ograniczRuch;

        /// <summary>Liczba pseudolosowa 0..1 z ziarna — ta sama za każdym razem.</summary>
        static double los(double n)
        {
            var s = Js.JsMath.Sin(n * 12.9898 + 78.233) * 43758.5453;
            return s - Math.Floor(s);
        }

        sealed class Plynna { public double v, t; }
        static readonly Dictionary<string, Plynna> plynne = new Dictionary<string, Plynna>();

        /// <summary>Wartość, która płynnie dochodzi do `cel` (0..1). `klucz` — czyja to wartość (np. „ryt-nakarm”).</summary>
        public static double plynnie(string klucz, double cel, double? ms = null)
        {
            var czas = ms ?? NASTROJ.podswietlenieMs;
            var teraz = Wydajnosc.Teraz();
            if (!plynne.TryGetValue(klucz, out var s) || !wolnoRuszac()) { plynne[klucz] = new Plynna { v = cel, t = teraz }; return cel; }
            var dt = Math.Max(0, Math.Min(200, teraz - s.t));
            s.t = teraz;
            s.v += (cel - s.v) * (1 - Math.Exp(-dt / czas));
            if (Math.Abs(cel - s.v) < 0.002) s.v = cel;
            return s.v;
        }

        /// <summary>Pył w świetle lampki: drobiny wznoszą się powoli, kołyszą i mienią, gdy wpadną w światło.</summary>
        public static void pyl(IPlotno ctx, double w, double h, double teraz, double lx, double ly)
        {
            var N = NASTROJ;
            var t = teraz * 0.001;
            var R = Math.Max(w, h);
            ctx.save();
            for (int i = 0; i < N.pylIle; i++)
            {
                double a = los(i * 3 + 1), b = los(i * 3 + 2), c = los(i * 3 + 3);
                var tempo = (N.pylTempo[0] + (N.pylTempo[1] - N.pylTempo[0]) * a) * h;
                var okres = h + 40;
                var y = h + 20 - ((t * tempo + b * okres) % okres);
                var x = ((a * 7.31 + c) % 1) * w + Js.JsMath.Sin(t * (0.25 + c * 0.4) + i * 1.7) * (10 + 18 * b);
                var dx = x - lx; var dy = y - ly;
                var d = Math.Sqrt(dx * dx + dy * dy) / R;
                var swiatlo = Math.Max(0, 1 - d * 1.7);
                var migot = 0.55 + 0.45 * Js.JsMath.Sin(t * (1.1 + 2.6 * c) + i * 5.3);
                var alfa = N.pylKrycie[0] + (N.pylKrycie[1] - N.pylKrycie[0]) * swiatlo * migot;
                var r = 0.5 + 1.2 * c;
                ctx.fillStyle = Barwa.Rgba(232, 196, 150, alfa);
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>
        /// Napisy na ścianie: niewidzialna ręka wydrapuje w tynku przy brzegu ekranu kilka znaków nieznanego pisma (znak po
        /// znaku), żarzą się chwilę jak węgle i gasną.
        /// </summary>
        public static void napisyNaScianie(IPlotno ctx, double w, double h, double teraz)
        {
            var N = NASTROJ;
            double zr = FRESK.zar[0], zg = FRESK.zar[1], zb = FRESK.zar[2];
            for (int n = 0; n < N.napisowNaraz; n++)
            {
                var tt = teraz + n * N.napisOkres * 0.53;
                var cykl = Math.Floor(tt / N.napisOkres);
                var f = (tt % N.napisOkres) / N.napisOkres;
                // pisze się (0–0,25), trwa (do 0,55), gaśnie (do 0,85), potem nic
                var gasnie = f < 0.55 ? 1 : f < 0.85 ? 1 - (f - 0.55) / 0.3 : 0;
                if (gasnie <= 0.01) continue;
                var pisze = Math.Min(1, f / 0.25);
                double l(double k) => los(cykl * 17.3 + n * 101.7 + k * 7.1);
                var bok = (int)Math.Floor(l(1) * 4);
                var dl = 3 + (int)Math.Floor(l(2) * 5);
                var s = N.napisRozmiar * (0.8 + 0.5 * l(3));
                var krok = s * 2.7;
                var pion = bok < 2;
                var x0 = pion ? (bok == 0 ? w * (0.012 + 0.03 * l(4)) : w * (0.958 + 0.03 * l(4))) : w * (0.12 + 0.66 * l(5));
                var y0 = pion ? h * (0.14 + 0.6 * l(5)) : (bok == 2 ? h * (0.012 + 0.012 * l(4)) : h * (0.955 + 0.03 * l(4)));
                ctx.save();
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                for (int i = 0; i < dl; i++)
                {
                    var a = Math.Max(0, Math.Min(1, (pisze * dl - i) * 1.5)) * gasnie;
                    if (a <= 0.01) continue;
                    double px = pion ? x0 : x0 + i * krok, py = pion ? y0 + i * krok : y0;
                    var g = Tajemnica.glif(cykl * 29 + n * 11 + i, 1);
                    ctx.save();
                    ctx.translate(px, py);
                    ctx.scale(s, s);
                    // rysa w tynku pod żarem
                    ctx.lineWidth = 2.2 / s;
                    ctx.strokeStyle = Barwa.Rgba(0, 0, 0, 0.35 * a);
                    ctx.stroke(g);
                    ctx.lineWidth = 1.1 / s;
                    ctx.shadowColor = Barwa.Rgba(zr, zg, zb, 0.7 * a);
                    ctx.shadowBlur = 7;
                    ctx.strokeStyle = Barwa.Rgba(zr, zg, zb, N.napisKrycie * a);
                    ctx.stroke(g);
                    ctx.restore();
                }
                ctx.restore();
            }
        }
    }
}
