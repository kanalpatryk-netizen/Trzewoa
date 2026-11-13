// Port (część): alpha-1/src/render/schody.ts — tylko to, czego potrzebują postacie: gdzie na spirali schodów kręconych
// narysować postać (naSchodach). Sam rysunek schodów (stopnie, słup, ściany, zasłanianie postaci za słupem
// — zaslonNaSchodach, cień na stopnicy — stopniePodStopami) to etap 3 (świat).
using System;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Symulacja.BudowaSchodow;

namespace Trzewia.Rysunek
{
    public sealed class NaSchodach
    {
        /// <summary>
        /// 6.11, budowa schodów: 'schody' — na osadzonych stopniach; 'drabina' — wyżej, w surowym szybie: wisi na drabinie
        /// opartej o tylną ścianę (przy pomoście nad najwyższym stopniem przechodzi z drabiny na stopnie)
        /// </summary>
        public string tryb = "schody";
        /// <summary>przesunięcie od miejsca w symulacji: w poziomie, w pionie (stopnie i rzut z góry) — kafle</summary>
        public double dx, dy;
        /// <summary>0..1 — o ile jest „w tle”: z tyłu spirali, w cieniu słupa i ścian</summary>
        public double tlo;
        /// <summary>numer stopnia pod stopami (ciągły — ułamek to droga do następnego)</summary>
        public double stopien;
        /// <summary>kąt na spirali (0 — tył szybu, π/2 — prawa ściana, π — przód)</summary>
        public double kat;
        /// <summary>odcinek drogi i jego spirala, numer odcinka i najwyższy osadzony stopień (sim/budowa-schodow.ts)</summary>
        public Prost odcinek = Prost.Pusty();
        public Spirala sp = new Spirala();
        public int n;
        public double kTop;
    }

    public static class Schody
    {
        /// <summary>
        /// Pół okna przejścia na sąsiedni stopień (w stopniach): ciało przenosi się przy nosie stopnia, od `PRZEJSCIE` przed
        /// nim do `PRZEJSCIE` za nim.
        /// </summary>
        const double PRZEJSCIE = 0.2;

        /// <summary>
        /// Wysokość stóp na rysunku (w stopniach): postać stoi na stopnicy, nad którą jest — stopień n leży między kątami
        /// n i n+1 — a na niższy (idąc w dół) albo wyższy (w górę) przenosi się przy nosie stopnia, gdy stopa staje na
        /// następnym.
        /// </summary>
        static double stopyNaStopniu(double s)
        {
            double q = s + PRZEJSCIE, n = Math.Floor(q), f = q - n;
            if (f >= 2 * PRZEJSCIE) return n;
            var t = f / (2 * PRZEJSCIE);
            return n - 1 + t * t * (3 - 2 * t);
        }

        /// <summary>
        /// Postać na schodach kręconych: gdzie ją rysować na spirali — przesunięcie w poziomie od miejsca w symulacji, w pionie
        /// (stopa zawsze na stopniu, ciało przenosi się stopień po stopniu; rzut z góry — dalej w głąb, wyżej), jak bardzo jest
        /// „w tle” (z tyłu, za słupem), który to stopień i kąt na spirali. Null — postać nie jest na schodach: stoi na posadzce
        /// (dno odcinka, kopacze przy czole szybu) albo kuje.
        /// </summary>
        public static NaSchodach? naSchodach(Sim sim, Creature c)
        {
            var w = sim.world;
            double tx = Math.Floor(c.x), ty = Math.Floor(c.y);
            if (!w.inb(tx, ty) || w.schody[w.idx(tx, ty)] != 1 || w.solid(tx, ty + 1)) return null;
            if (c.kujeT != null && sim.tick - c.kujeT >= 0 && sim.tick - c.kujeT < 24) return null;
            int n = w.odcinkiDrogi.FindIndex(q => tx >= q.x0 && tx <= q.x1 && ty >= q.y0 && ty <= q.y1);
            if (n < 0) return null;
            var o = w.odcinkiDrogi[n];
            var sp = spirala(sim, o);
            var h = wysokoscStopnia();
            var stopy = c.y + 1;
            var st = (stopy - sp.ys) / h;
            double kTop = szczytSchodow(sim, n), N = liczbaStopni(sp);
            // 6.11, budowa schodów: nad osadzonymi stopniami (i w szybie bez schodów) — na drabinie; od pomostu nad najwyższym
            // stopniem do jego stopnicy przechodzi z drabiny na schody (płynnie — nie skacze przez szyb)
            var dr = pozycjaDrabiny(sp);
            double drDx = dr.x - c.x, drDy = -SCHODY.ukos * dr.glebia, drTlo = 0.16;
            double f = 1;
            if (kTop >= N) f = 0;
            else if (kTop > 0)
            {
                double yLad = dolDrabiny(sim, n), yTop = wysokoscSzczytu(sim, n);
                f = Math.Max(0, Math.Min(1, (stopy - yLad) / Math.Max(0.4, yTop - yLad)));
            }
            if (f <= 0) return new NaSchodach { tryb = "drabina", dx = drDx, dy = drDy, tlo = drTlo, stopien = st, kat = BUDOWA_SCHODOW.drabinaKat, odcinek = o, sp = sp, n = n, kTop = kTop };
            var s2 = Math.Max(st, kTop);
            var yStopien = sp.ys + stopyNaStopniu(s2) * h;
            var th = katSpirali(sp, sp.ys + s2 * h);
            double x = sp.c + SCHODY.linia * Math.Sin(th), glebia = SCHODY.linia * Math.Cos(th);
            double schDx = x - c.x, schDy = (yStopien - stopy) - SCHODY.ukos * glebia;
            // z tyłu spirali — w cieniu słupa i ścian, odrobinę ciemniej (sam słup zasłania ją naprawdę: zaslonNaSchodach)
            double schTlo = glebia > 0 ? 0.1 + 0.2 * glebia / SCHODY.linia : 0;
            if (f >= 1) return new NaSchodach { tryb = "schody", dx = schDx, dy = schDy, tlo = schTlo, stopien = s2, kat = th, odcinek = o, sp = sp, n = n, kTop = kTop };
            var g = f * f * (3 - 2 * f);
            return new NaSchodach
            {
                tryb = g < 0.5 ? "drabina" : "schody",
                dx = drDx + (schDx - drDx) * g, dy = drDy + (schDy - drDy) * g, tlo = drTlo + (schTlo - drTlo) * g,
                stopien = s2, kat = g < 0.5 ? BUDOWA_SCHODOW.drabinaKat : th, odcinek = o, sp = sp, n = n, kTop = kTop,
            };
        }
    }
}
