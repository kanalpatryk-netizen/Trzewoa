// Port: alpha-1/src/sim/budowa-schodow.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.Lud;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Spirala jednego odcinka szybu: środek, promień (do ściany) i słupa, pierwszy rząd stopni, posadzka pod nimi, faza.</summary>
    public sealed class Spirala { public double c, R, rn, ys, ye, th0; }

    public sealed class BudowaOdcinka
    {
        /// <summary>Ile stopni już stoi — od dołu odcinka.</summary>
        public double stopni;
        /// <summary>Postęp bieżącego stopnia (0..1).</summary>
        public double postep;
        /// <summary>Kurs kubła z urobkiem przy kopaniu (0..1, w kółko).</summary>
        public double kubel;
        /// <summary>'kopanie' | 'budowa' | 'gotowe' (liczony co tik), od kiedy trwa budowa / kiedy się skończyła.</summary>
        public string etap = "kopanie";
        public double? od;
        public double? koniec;
        /// <summary>Czy w tym tiku ktoś kręcił kołowrotem i ilu murarzy osadzało kamień (rysunek).</summary>
        public bool? kreci;
        public double? murarzy;
    }

    public sealed class StanBudowySchodow { public List<BudowaOdcinka> odcinki = new List<BudowaOdcinka>(); }

    public sealed class ZadanieBudowy { public double odcinek; public string rola = "murarz"; public double ktory, x, y; }

    /// <summary>
    /// BUDOWA SCHODÓW DROGI WIERNYCH (6.11, decyzja użytkownika) — wykop, potem budowa od dołu (patrz budowa-schodow.ts).
    /// </summary>
    public static class BudowaSchodow
    {
        public static Spirala spirala(Sim sim, Prost o) => new Spirala
        {
            c = (o.x0 + o.x1 + 1) / 2, R = (o.x1 - o.x0 + 1) / 2 - 0.05, rn = SCHODY.slup,
            ys = Math.Max(o.y0, sim.world.salaOltarza.y1 + 1), ye = o.y1 + 1,
            // na szczycie spirala zaczyna się z prawej — od strony, z której się na nią wchodzi
            th0 = Math.PI / 2,
        };

        /// <summary>Wysokość stopnia (kafle).</summary>
        public static double wysokoscStopnia() => SCHODY.obrot / SCHODY.stopni;

        /// <summary>Kąt na spirali na danej wysokości (0 — tył szybu, π/2 — prawa ściana, π — przód).</summary>
        public static double katSpirali(Spirala sp, double y) => sp.th0 + ((y - sp.ys) / SCHODY.obrot) * Math.PI * 2;

        /// <summary>Drabina w niezabudowanej części szybu: oparta o tylną ścianę — gdzie w poziomie i jak głęboko.</summary>
        public static (double x, double glebia) pozycjaDrabiny(Spirala sp)
        {
            var r = sp.R - 0.32;
            return (sp.c + r * JS.Sin(BUDOWA_SCHODOW.drabinaKat), r * JS.Cos(BUDOWA_SCHODOW.drabinaKat));
        }

        /// <summary>Dolny koniec drabiny (kafle, wysokość).</summary>
        public static double dolDrabiny(Sim sim, int n)
        {
            var w = sim.world; var o = w.odcinkiDrogi[n];
            var sp = spirala(sim, o);
            var b = stanSchodow(sim).odcinki[n];
            if (b.etap == "budowa" && b.stopni > 0) return pomostNadSchodami(sim, n);
            double sx = JS.ToInt32(o.x0 + o.x1) >> 1;
            var y = Math.Floor(sp.ys);
            while (y <= o.y1 && w.schody[w.idx(sx, y)] == 1) y++;
            return y;
        }

        /// <summary>Najniższy pomost rusztowania (wysokość) — nad najwyższym stopniem, przestawiany skokami w górę.</summary>
        public static double pomostNadSchodami(Sim sim, int n)
        {
            var o = sim.world.odcinkiDrogi[n];
            var sp = spirala(sim, o);
            var yTop = wysokoscSzczytu(sim, n);
            var k = BUDOWA_SCHODOW.przestawianie;
            return Math.Max(sp.ys, sp.ys + Math.Floor((yTop - 0.9 - sp.ys) / k) * k);
        }

        /// <summary>Ile stopni ma odcinek (stopień k leży na wysokości ys + k·h, od 0 — najwyższy).</summary>
        public static double liczbaStopni(Spirala sp) => Math.Max(0, Math.Ceiling((sp.ye - 0.02 - sp.ys) / wysokoscStopnia()));

        /// <summary>Stan budowy (tworzony przy pierwszym pytaniu — po jednym wpisie na odcinek szybu).</summary>
        public static StanBudowySchodow stanSchodow(Sim sim)
        {
            var w = sim.world;
            var s = sim.lud.schody;
            if (s == null) s = sim.lud.schody = new StanBudowySchodow();
            while (s.odcinki.Count < w.odcinkiDrogi.Count) s.odcinki.Add(new BudowaOdcinka { stopni = 0, postep = 0, kubel = 0, etap = "kopanie" });
            return s;
        }

        /// <summary>Czy cały odcinek jest już wykuty.</summary>
        static bool wykopany(Sim sim, Prost o)
        {
            var w = sim.world;
            for (var y = o.y0; y <= o.y1; y++) for (var x = o.x0; x <= o.x1; x++) if (doKopania(w.tile[w.idx(x, y)])) return false;
            return true;
        }

        /// <summary>Numer odcinka, w którym leży kafel (albo −1).</summary>
        public static int numerOdcinka(Sim sim, double x, double y) =>
            sim.world.odcinkiDrogi.FindIndex(o => x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1);

        /// <summary>Najwyższy zbudowany stopień odcinka (numer k — od góry) — albo liczba stopni, gdy nie stoi żaden.</summary>
        public static double szczytSchodow(Sim sim, int n)
        {
            var o = JS.At(sim.world.odcinkiDrogi, n);
            if (o == null) return 0;
            var sp = spirala(sim, o);
            var N = liczbaStopni(sp);
            var b = stanSchodow(sim).odcinki[n];
            return Math.Max(0, N - Math.Min(N, b.stopni));
        }

        /// <summary>Wysokość stopnicy najwyższego zbudowanego stopnia — albo posadzki pod odcinkiem.</summary>
        public static double wysokoscSzczytu(Sim sim, int n)
        {
            var o = JS.At(sim.world.odcinkiDrogi, n);
            if (o == null) return 0;
            var sp = spirala(sim, o);
            var k = szczytSchodow(sim, n);
            return k >= liczbaStopni(sp) ? sp.ye : sp.ys + k * wysokoscStopnia();
        }

        /// <summary>Etap odcinka (z ostatniego tiku budowy).</summary>
        public static string etapOdcinka(Sim sim, double n) => JS.At(stanSchodow(sim).odcinki, n)?.etap ?? "kopanie";

        /// <summary>Gdzie stoi murarz przy czole budowy — na najwyższych stopniach, środkiem szybu.</summary>
        public static XY posterunekMurarza(Sim sim, int n, double ktory)
        {
            var o = sim.world.odcinkiDrogi[n];
            double sx = JS.ToInt32(o.x0 + o.x1) >> 1;
            var y = Math.Min(o.y1, Math.Floor(wysokoscSzczytu(sim, n) + 0.05) - 1 + ktory);
            return new XY(sx, Math.Max(o.y0, y));
        }

        /// <summary>Gdzie stoi ten, kto kręci kołowrotem: na posadzce tuż przy wylocie szybu (z prawej).</summary>
        public static XY posterunekKolowrotu(Sim sim, int n)
        {
            var o = sim.world.odcinkiDrogi[n];
            var sp = spirala(sim, o);
            return new XY(o.x1 + 2, Math.Floor(sp.ys) - 1);
        }

        /// <summary>Posterunek tej postaci przy budowie (albo null, gdy nie buduje).</summary>
        public static XY? posterunek(Sim sim, Creature c)
        {
            var b = c.budowa;
            if (b == null || JS.At(sim.world.odcinkiDrogi, b.odcinek) == null) return null;
            return b.rola == "kolowrot" ? posterunekKolowrotu(sim, (int)b.odcinek) : posterunekMurarza(sim, (int)b.odcinek, b.ktory ?? 0);
        }

        /// <summary>Czy postać stoi na swoim posterunku (tam pracuje — liczy się do postępu).</summary>
        public static bool naPosterunkuBudowy(Sim sim, Creature c)
        {
            var p = posterunek(sim, c);
            if (p == null) return false;
            var tol = c.budowa?.rola == "kolowrot" ? 0.45 : 1.05;
            return Math.Abs(c.x - (p.x + 0.5)) <= tol && Math.Abs(c.y - p.y) <= 1.35;
        }

        /// <summary>Czy przy wylocie odcinka da się stanąć.</summary>
        static bool wylotOtwarty(Sim sim, Prost o)
        {
            var w = sim.world; var sp = spirala(sim, o);
            var y = Math.Floor(sp.ys);
            for (var x = o.x0; x <= o.x1; x++) if (!w.passable(x, y)) return false;
            return true;
        }

        /// <summary>Kto teraz pracuje przy odcinku n w roli r (bez postaci `poza`).</summary>
        static List<Creature> ilu(Sim sim, int n, string r, Creature? poza) =>
            sim.creatures.Where(q => !q.dead && q != poza && q.budowa?.odcinek == n && q.budowa.rola == r && q.job == Job.SCHODY && rolaPostaci(q) == "robotnik").ToList();

        /// <summary>Co przy schodach może teraz robić ten robotnik: odcinek, rola i posterunek — albo null.</summary>
        public static ZadanieBudowy? zadanieBudowy(Sim sim, Creature c, bool zKublem)
        {
            var w = sim.world;
            var st = stanSchodow(sim);
            for (var n = 0; n < w.odcinkiDrogi.Count; n++)
            {
                if (st.odcinki[n].etap != "budowa") continue;
                var murarze = ilu(sim, n, "murarz", c);
                if (murarze.Count < BUDOWA_SCHODOW.murarzy)
                {
                    var zajete = new HashSet<double>(murarze.Select(q => q.budowa!.ktory ?? 0));
                    double ktory = zajete.Contains(0) ? 1 : 0;
                    var p = posterunekMurarza(sim, n, ktory);
                    return new ZadanieBudowy { odcinek = n, rola = "murarz", ktory = ktory, x = p.x, y = p.y };
                }
                if (ilu(sim, n, "kolowrot", c).Count == 0 && wylotOtwarty(sim, w.odcinkiDrogi[n]))
                {
                    var p = posterunekKolowrotu(sim, n);
                    return new ZadanieBudowy { odcinek = n, rola = "kolowrot", ktory = 0, x = p.x, y = p.y };
                }
            }
            if (!zKublem) return null;
            // kopanie: kołowrót nad odcinkiem, w którym ktoś teraz kuje
            for (var n = 0; n < w.odcinkiDrogi.Count; n++)
            {
                var o = w.odcinkiDrogi[n];
                if (st.odcinki[n].etap != "kopanie" || !wylotOtwarty(sim, o)) continue;
                var kuja = sim.creatures.Any(q => !q.dead && q.kopieDroge == true && q.jx >= o.x0 && q.jx <= o.x1 && q.jy >= o.y0 && q.jy <= o.y1);
                if (!kuja || ilu(sim, n, "kolowrot", c).Count > 0) continue;
                var p = posterunekKolowrotu(sim, n);
                return new ZadanieBudowy { odcinek = n, rola = "kolowrot", ktory = 0, x = p.x, y = p.y };
            }
            return null;
        }

        /// <summary>Czy w którymś odcinku trwa budowa schodów.</summary>
        public static bool trwaBudowaSchodow(Sim sim) => stanSchodow(sim).odcinki.Any(b => b.etap == "budowa");

        /// <summary>Co ile stopni kronika notuje postęp budowy.</summary>
        const double S_CO = 40;

        /// <summary>Tik budowy: etap każdego odcinka, kurs kubła z urobkiem i postęp stopnia.</summary>
        public static void tikBudowySchodow(Sim sim)
        {
            var w = sim.world;
            if (w.odcinkiDrogi.Count == 0) return;
            var st = stanSchodow(sim);
            for (var n = 0; n < w.odcinkiDrogi.Count; n++)
            {
                var o = w.odcinkiDrogi[n];
                var b = st.odcinki[n];
                var sp = spirala(sim, o);
                var N = liczbaStopni(sp);
                if (b.stopni >= N) b.etap = "gotowe";
                else if (sim.tick % 30 == n || b.etap == "gotowe") b.etap = wykopany(sim, o) ? "budowa" : "kopanie";
                b.kreci = false; b.murarzy = 0;
                if (b.etap == "gotowe") continue;
                double murarzy = 0;
                foreach (var c in sim.creatures)
                {
                    if (c.dead || c.budowa?.odcinek != n || c.job != Job.SCHODY || !naPosterunkuBudowy(sim, c)) continue;
                    if (c.budowa.rola == "murarz") murarzy++; else b.kreci = true;
                }
                b.murarzy = murarzy;
                if (b.etap == "kopanie")
                {
                    if (b.kreci == true) b.kubel = (b.kubel + 1 / BUDOWA_SCHODOW.kubelTikow) % 1;
                    continue;
                }
                if (b.od == null)
                {
                    b.od = sim.tick;
                    sim.gdzie(sp.c, sp.ye - 1).log(n == 0
                        ? "Szyb do starej komnaty wykopany do dna. Robotnicy stawiają rusztowanie i od dołu osadzają kamienne stopnie."
                        : "Szyb na przedproże lochu wykopany do dna. Robotnicy stawiają rusztowanie i od dołu osadzają kamienne stopnie.", "swiat", $"schody-start-{n}");
                }
                if (murarzy == 0) continue;
                b.postep += Math.Min(murarzy, BUDOWA_SCHODOW.murarzy) * (b.kreci == true ? 1 : BUDOWA_SCHODOW.bezKolowrotu) / BUDOWA_SCHODOW.tikowNaStopien;
                while (b.postep >= 1 && b.stopni < N)
                {
                    b.postep -= 1;
                    b.stopni++;
                    if (b.stopni % S_CO == 0 && b.stopni < N) sim.gdzie(sp.c, sp.ys + (N - b.stopni) * wysokoscStopnia()).log($"Schody drogi wiernych rosną — {JS.S(b.stopni)} z {JS.S(N)} stopni osadzonych.", "swiat", $"schody-{n}");
                }
                if (b.stopni >= N)
                {
                    b.stopni = N; b.postep = 0; b.etap = "gotowe"; b.koniec = sim.tick;
                    sim.gdzie(sp.c, sp.ys).log(n == 0
                        ? "Schody do starej komnaty gotowe — rusztowanie, drabinę i kołowrót rozebrano."
                        : "Schody na przedproże lochu gotowe — rusztowanie, drabinę i kołowrót rozebrano. Droga wiernych stoi cała.", "swiat", $"schody-koniec-{n}");
                    foreach (var c in sim.creatures) if (c.budowa?.odcinek == n) { c.budowa = null; if (c.job == Job.SCHODY) c.jt = 0; }
                }
            }
        }
    }
}
