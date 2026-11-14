// Port (część): alpha-1/src/render/shafts.ts — co dzień trzyma na widoku (odWidoku). Smugi światła: dalej w etapie 3.
using System;
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
    }
}
