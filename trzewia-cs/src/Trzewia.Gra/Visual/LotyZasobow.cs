// Oprawa walki, etap 3 (docs/plan-oprawy-cerber.md): zasoby nie zmieniają się po cichu. Dotąd tylko ruda, krzyż
// z warsztatu i krew z ołtarza leciały do liczników księgi (Rysunek/Swiat/Kruszce.cs: Urobki); jedzenie, wiara z modlitwy
// i za Cud, krew z zabijania zmieniały się bez śladu. Tu:
//  - przyrost ze źródłem w świecie: ikonka leci łukiem (Bézier, 0,7 s) ze źródła do licznika; licznik rośnie dopiero, gdy
//    doleci (księga odejmuje to, co w locie);
//  - wydatek: ikonka leci z licznika do celu w świecie (licznik spada od razu — zapłacone);
//  - źródło i cel: jedzenie — wiadro w szybie (kosz resztek); wiara — modlący się mnich albo miejsce Cudu; krew — miejsce
//    świeżej śmierci albo ołtarz;
//  - tego, co już leci przez Urobki, nie dublujemy.
// Puls licznika i „+N” / „−N” rysuje księga (Rysunek/Interfejs/Ksiega.cs). Czas ekranu, bez alokacji w klatce.
using System;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using U = Trzewia.Visual.VisualConfig.Uderzenia;

namespace Trzewia.Visual
{
    public static class LotyZasobow
    {
        static readonly string[] RODZAJE = { "wiara", "krew", "jedzenie" };

        struct Lot { public bool jest, doKsiegi; public int rodzaj; public double ile, x, y, od; }
        static readonly Lot[] loty = new Lot[24];
        static readonly double[] byly = new double[3];
        static Sim? simPop;
        static double zegarPop = double.NaN;

        /// <summary>Ile tego zasobu leci jeszcze do księgi (licznik pokazuje stan bez tego).</summary>
        public static double WLocie(string rodzaj)
        {
            if (!Uderzenie.Aktywne) return 0;
            var r = Array.IndexOf(RODZAJE, rodzaj);
            double n = 0;
            for (int i = 0; i < loty.Length; i++) if (loty[i].jest && loty[i].doKsiegi && loty[i].rodzaj == r) n += loty[i].ile;
            return n;
        }

        static double wartosc(Sim sim, int r) => r == 0 ? Math.Floor(sim.wiara) : r == 1 ? Math.Floor(sim.krew) : Wiadro.porcjiWWiadrach(sim);
        static double prog(int r) => r == 0 ? U.ProgWiary : r == 1 ? U.ProgKrwi : U.ProgJedzenia;

        /// <summary>
        /// Co klatkę, po rysunku świata (Urobki zdążyły już zgłosić swoje loty): zmiany zasobów w symulacji → loty.
        /// </summary>
        public static void Krok(Sim sim, Urobki urobki, double teraz)
        {
            if (!Uderzenie.Aktywne) { for (int i = 0; i < loty.Length; i++) loty[i].jest = false; simPop = null; return; }
            var nowa = !ReferenceEquals(sim, simPop) || double.IsNaN(zegarPop) || teraz < zegarPop || teraz - zegarPop > 2000;
            simPop = sim; zegarPop = teraz;
            for (int i = 0; i < loty.Length; i++) if (loty[i].jest && teraz - loty[i].od >= U.LotMs) loty[i].jest = false;
            for (int r = 0; r < 3; r++)
            {
                var v = wartosc(sim, r);
                if (nowa) { byly[r] = v; continue; }
                var d = v - byly[r];
                if (Math.Abs(d) < prog(r)) continue;
                byly[r] = v;
                // krzyż z warsztatu i krew z ołtarza lecą już przez Urobki
                if (r < 2 && urobki.lotAktywny(RODZAJE[r], teraz)) continue;
                var (x, y) = miejsce(sim, r, d > 0, teraz);
                if (double.IsNaN(x)) continue;
                dodaj(r, Math.Abs(d), x, y, d > 0, teraz);
            }
        }

        static void dodaj(int r, double ile, double x, double y, bool doKsiegi, double teraz)
        {
            int gdzie = 0;
            for (int i = 0; i < loty.Length; i++)
            {
                if (!loty[i].jest) { gdzie = i; break; }
                if (loty[i].od < loty[gdzie].od) gdzie = i;
            }
            loty[gdzie] = new Lot { jest = true, doKsiegi = doKsiegi, rodzaj = r, ile = ile, x = x, y = y, od = teraz };
        }

        /// <summary>Źródło przyrostu albo cel wydatku w świecie (kafle).</summary>
        static (double x, double y) miejsce(Sim sim, int r, bool przyrost, double teraz)
        {
            var w = sim.world;
            if (r == 2)
            {
                foreach (var wd in Wiadro.wiadra(sim)) return (wd.x + 0.5, wd.y + 0.5);
                return (double.NaN, double.NaN);
            }
            if (r == 0)
            {
                if (przyrost)
                {
                    foreach (var c in sim.creatures)
                        if (!c.dead && c.rola == "pobozny" && c.czynnosc == "modli") return (c.x, c.y - 1);
                }
                else
                {
                    // Cud: świeży znak cudu, objawienia albo szeptu
                    Efekt? naj = null;
                    foreach (var e in sim.efekty)
                        if ((e.rodzaj == "cud" || e.rodzaj == "objawienie" || e.rodzaj == "szept") && (naj == null || e.t < naj.t)) naj = e;
                    if (naj != null && naj.t < 240) return (naj.x, naj.y);
                }
            }
            if (r == 1 && przyrost)
            {
                Efekt? naj = null;
                foreach (var e in sim.efekty)
                    if (e.rodzaj == "smierc" && (naj == null || e.t < naj.t)) naj = e;
                if (naj != null && naj.t < 180) return (naj.x, naj.y - 0.5);
            }
            return (w.oltarz.x + 0.5, w.oltarz.y - 1);
        }

        static double gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }

        /// <summary>
        /// Loty nad płytą i księgą (ekran): `cele` — gdzie stoją liczniki (Urobki.cele, ustawia je księga); kamera i płyta
        /// — skąd w świecie.
        /// </summary>
        public static void Rysuj(IPlotno ctx, Plate plate, Camera cam, Urobki urobki, double teraz)
        {
            if (!Uderzenie.Aktywne) return;
            var s = Math.Max(14, 20 * Czytelnosc.SkalaUi);
            for (int i = 0; i < loty.Length; i++)
            {
                ref var l = ref loty[i];
                if (!l.jest) continue;
                if (!urobki.cele.TryGetValue(RODZAJE[l.rodzaj], out var cel)) continue;
                var k = (teraz - l.od) / U.LotMs;
                if (k < 0 || k >= 1) continue;
                double wx = plate.x + cam.toScreenX(l.x), wy = plate.y + cam.toScreenY(l.y);
                double x0 = l.doKsiegi ? wx : cel.x, y0 = l.doKsiegi ? wy : cel.y, x2 = l.doKsiegi ? cel.x : wx, y2 = l.doKsiegi ? cel.y : wy;
                // łuk: punkt kontrolny nad środkiem drogi (o 30% jej długości)
                double mx = (x0 + x2) / 2, my = (y0 + y2) / 2, dl = Math.Sqrt((x2 - x0) * (x2 - x0) + (y2 - y0) * (y2 - y0));
                double cx = mx, cy = my - dl * 0.3;
                var t = gladko(k);
                double x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x2, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y2;
                ctx.save();
                ctx.globalAlpha = Math.Min(1, k * 8) * (1 - Math.Max(0, (k - 0.85) / 0.15) * 0.6);
                Ksiega.ikonaZasobu(ctx, RODZAJE[l.rodzaj], x, y, s * (1 - 0.25 * Math.Sin(k * Math.PI)), teraz);
                ctx.restore();
            }
        }
    }
}
