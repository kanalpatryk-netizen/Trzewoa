// Port: alpha-1/src/render/shafts.ts — co dzień trzyma na widoku (odWidoku) i smugi światła z powierzchni.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawySwiat;

namespace Trzewia.Rysunek
{
    public static partial class Shafts
    {
        /// <summary>Odległość kafla od prostokąta kafli (włącznie z brzegami); 0 — w środku.</summary>
        static double odProstokata(double x, double y, double x0, double x1, double y0, double y1)
        {
            var dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0;
            var dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
            return dx == 0 && dy == 0 ? 0 : Math.Sqrt(dx * dx + dy * dy);
        }

        /// <summary>
        /// Jak daleko (w kaflach) kafel leży od tego, co dzień trzyma na widoku — jasnej sali z ołtarzem i obu otworów,
        /// którymi wpada do niej z powierzchni (szyb nad ołtarzem i szyb wiadra, z kaflem skały dookoła). 0 — na widoku.
        /// </summary>
        public static double odWidoku(World w, double x, double y)
        {
            var so = w.salaOltarza;
            if (so.x1 < 0) return double.PositiveInfinity;
            var pol = (int)SWIAT.warstwy.szyb >> 1;
            return Math.Min(Math.Min(
                odProstokata(x, y, so.x0 - 1, so.x1 + 1, so.y0 - 1, so.y1 + 2),
                odProstokata(x, y, w.szybX - pol - 1, w.szybX + pol + 1, World.SURFACE_Y - 1, w.szybDol)),
                odProstokata(x, y, w.szybWiadraX - 1, w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer, World.SURFACE_Y - 1, w.szybWiadraDol));
        }

        /// <summary>
        /// Smugi światła z powierzchni. Wpadają tylko tam, gdzie ktoś przebił się do nieba — więc pokazują graczowi,
        /// gdzie góra jest otwarta.
        /// </summary>
        public static void smugiSwiatla(IPlotno ctx, Sim sim, Camera cam, double czas)
        {
            var w = sim.world;
            var z = cam.zoom;
            var left = cam.x - cam.vw / 2 / z;
            var right = left + cam.vw / z;
            var top = cam.y - cam.vh / 2 / z;
            if (top > 70) return;                       // głęboko pod ziemią nie ma czego wpuszczać

            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var x0 = (int)Math.Max(1, Math.Floor(left) - 2);
            var x1 = (int)Math.Min(w.w - 2, Math.Ceiling(right) + 2);
            // oba szyby do sali mają własne światło dnia — smuga stąd rozlewała się w wąskim szybie stożkiem na skałę
            int pol = (int)SWIAT.warstwy.szyb >> 1; var wiad = SWIAT.warstwy.szybWiadra.szer;
            bool doSali(double x) => w.salaOltarza.x1 >= 0
                && ((x >= w.szybX - pol && x <= w.szybX + pol) || (x >= w.szybWiadraX && x < w.szybWiadraX + wiad));
            int W = (int)w.w;
            var tile = w.tile.d; var ever = w.ever.d; var lastSeen = w.lastSeen.d; var PASS = Tiles.PASSABLE.d;
            for (int x = x0; x <= x1; x++)
            {
                int sh = w.surface.d[x];
                if (PASS[tile[(sh + 1) * W + x]] != 1) continue;      // strop zamknięty
                if (doSali(x)) continue;
                // smuga kończy się tam, gdzie kończy się pamięć — światło nie oświetla Otchłani
                int g = sh + 1;
                while (g < w.h - 1 && g < sh + 60)
                {
                    int i = g * W + x;
                    if (PASS[tile[i]] != 1) break;
                    if (ever[i] == 0 || sim.tick - lastSeen[i] > World.MEM_SPAN * 0.6) break;
                    g++;
                }
                var dl = g - sh;
                if (dl < 4) continue;
                var sx = (x + 0.5 - left) * z;
                var sy = (sh - top) * z;
                var sdl = dl * z;
                var drganie = Js.JsMath.Sin(czas * 0.0004 + x) * z * 0.3;
                var grad = ctx.createLinearGradient(sx, sy, sx + drganie, sy + sdl);
                grad.addColorStop(0, "rgba(236,214,170,0.13)");
                grad.addColorStop(0.55, "rgba(228,196,150,0.05)");
                grad.addColorStop(1, "rgba(228,196,150,0)");
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(sx - z * 0.7, sy);
                ctx.lineTo(sx + z * 0.7, sy);
                ctx.lineTo(sx + drganie + z * 2.4, sy + sdl);
                ctx.lineTo(sx + drganie - z * 2.4, sy + sdl);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
    }
}
