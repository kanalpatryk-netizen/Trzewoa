// Port: alpha-1/src/render/rycina-zrodla.ts — światło ludu na rycinie (Engraver.swiatloLudu): gotowe pomieszczenia,
// siedziba, obozy i lampki robotników, rycerzy i pobożnych — po pięć liczb na źródło: środek x, y (kafle), promień,
// moc i zasięg w litej skale (nieskończoność — bez granicy).
using System;
using System.Collections.Generic;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyWygladRycina;

namespace Trzewia.Rysunek
{
    public static class RycinaZrodla
    {
        public static double[] zrodlaSwiatla(Sim sim)
        {
            var SR = SWIATLO_RYCINY;
            var z = new List<double>();
            foreach (var p in sim.pomieszczenia)
            {
                if (!p.gotowe) continue;
                // okrągła plama, nie prostokąt — prostokątne światło rysowało w skale jasne słupy
                if (SR.pomieszczenia.TryGetValue(p.rodzaj, out var moc) && moc != 0)
                    z.AddRange(new[] { p.x + p.w / 2, p.y + p.h / 2, Math.Max(p.w, p.h) / 2 + SR.pomieszczenieZasieg, moc, SR.pomieszczenieWSkale });
            }
            var klan = Symulacja.Lud.klanLudu(sim);
            if (klan != null) z.AddRange(new[] { klan.hx + 0.5, klan.hy + 0.5, SR.siedziba.r, SR.siedziba.moc, double.PositiveInfinity });
            foreach (var o in sim.lud.obozy) z.AddRange(new[] { o.x + 0.5, o.y + 0.5, SR.oboz.r, SR.oboz.moc, double.PositiveInfinity });
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.straznik == true) continue;
                var r = Symulacja.Lud.rolaPostaci(c);
                if (r == null) continue;
                double rr, mm;
                if (r == "robotnik") { rr = SR.robotnik.r; mm = SR.robotnik.moc; }
                else if (r == "rycerz") { rr = SR.rycerz.r; mm = SR.rycerz.moc; }
                else { rr = SR.pobozny.r; mm = SR.pobozny.moc; }
                z.AddRange(new[] { c.x + 0.5, c.y + 0.5, rr, mm, double.PositiveInfinity });
            }
            return z.ToArray();
        }
    }
}
