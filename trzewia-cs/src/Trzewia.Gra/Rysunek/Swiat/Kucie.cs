// Port: alpha-1/src/render/kucie.ts — Alpha, etap 3: skała pęka pod kilofem. Kafel napoczęty (world.kucie, 0..1) dostaje
// rysy, które rosną od krawędzi ku środkowi razem z postępem; pod koniec odpryskują z niego okruchy, a tuż przed
// pęknięciem kafel drży. Wzór rys jest stały dla kafla — nie skacze z klatki na klatkę.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Kucie
    {
        /// <summary>Tani skrót liczby: stały wzór rys dla kafla.</summary>
        static double los(double n0)
        {
            int n = Js.Js.ToInt32(n0);
            int h = unchecked((n ^ (int)0x9e3779b9) * (int)0x85ebca6b);
            h = unchecked((h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35);
            return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
        }

        public static void rysujKucie(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world;
            if (w.kucie.size == 0) return;
            var z = cam.zoom;
            var stare = new List<double>();
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            var pkt = new List<double>();
            foreach (var kv in w.kucie)
            {
                double i = kv.Key, f = kv.Value;
                // kafel zmienił się bokiem (osypał, otwarty rytuałem) — wpis już nic nie znaczy
                if (Tiles.PASSABLE.d[w.tile.d[(int)i]] == 1) { stare.Add(i); continue; }
                double x = i % w.w, y = Math.Floor(i / w.w);
                double sx = cam.toScreenX(x), sy = cam.toScreenY(y);
                if (sx < -z || sy < -z || sx > cam.vw + z || sy > cam.vh + z) continue;
                // tuż przed pęknięciem kafel drży
                if (f > 0.82) { sx += JsM.Sin(teraz * 0.09 + i) * z * 0.035; sy += JsM.Cos(teraz * 0.11 + i) * z * 0.03; }
                var rys = 3 + (int)Math.Floor(los(i) * 3);
                ctx.lineWidth = Math.Max(1, z * 0.07);
                for (int k = 0; k < rys; k++)
                {
                    // rysa startuje z krawędzi kafla i biegnie łamaną ku środkowi; im dalej w kuciu, tym dłuższa
                    var a = los(i * 7 + k * 13);
                    var kraw = (int)Math.Floor(a * 4);
                    var t0 = 0.15 + los(i * 3 + k) * 0.7;
                    double px = kraw == 0 ? t0 : kraw == 1 ? 1 : kraw == 2 ? t0 : 0;
                    double py = kraw == 0 ? 0 : kraw == 1 ? t0 : kraw == 2 ? 1 : t0;
                    var dlugosc = Math.Min(1, f * (1.15 + los(i + k * 31) * 0.4));
                    const int kroki = 3;
                    pkt.Clear(); pkt.Add(sx + px * z); pkt.Add(sy + py * z);
                    for (int s = 1; s <= kroki; s++)
                    {
                        if (s / (double)kroki > dlugosc + 0.001) break;
                        var ku = 0.5 + (los(i * 11 + k * 5 + s) - 0.5) * 0.5;
                        var nx = px + (ku - px) * (s / (double)kroki) + (los(i + k * 17 + s * 3) - 0.5) * 0.3;
                        var ny = py + (0.5 + (los(i * 5 + k + s * 7) - 0.5) * 0.5 - py) * (s / (double)kroki) + (los(i * 13 + s + k) - 0.5) * 0.3;
                        pkt.Add(sx + nx * z); pkt.Add(sy + ny * z);
                    }
                    if (pkt.Count < 4) continue;
                    // rysa wyryta w kamieniu: jasny brzeg tuż pod nią, na nim ciemna szczelina
                    void lamana(double dy)
                    {
                        ctx.beginPath();
                        ctx.moveTo(pkt[0], pkt[1] + dy);
                        for (int p = 2; p < pkt.Count; p += 2) ctx.lineTo(pkt[p], pkt[p + 1] + dy);
                        ctx.stroke();
                    }
                    ctx.strokeStyle = "rgba(225,205,165,0.22)";
                    lamana(Math.Max(1, z * 0.05));
                    ctx.strokeStyle = "rgba(14,10,8,0.9)";
                    lamana(0);
                }
                // okruchy odpryskują z napoczętego kafla
                if (f > 0.45)
                {
                    var n = (int)Math.Floor((f - 0.45) * 8);
                    ctx.fillStyle = "rgba(18,13,10,0.75)";
                    for (int k = 0; k < n; k++)
                    {
                        double ox = 0.15 + los(i * 19 + k) * 0.7, oy = 0.15 + los(i * 23 + k) * 0.7;
                        var r = z * (0.05 + los(i + k * 29) * 0.06);
                        ctx.beginPath();
                        ctx.moveTo(sx + ox * z, sy + oy * z - r);
                        ctx.lineTo(sx + ox * z + r, sy + oy * z + r * 0.6);
                        ctx.lineTo(sx + ox * z - r * 0.8, sy + oy * z + r * 0.5);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
            ctx.restore();
            foreach (var i in stare) w.kucie.delete(i);
        }
    }
}
