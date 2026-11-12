// Port: alpha-1/src/sim/dlon-demona.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Dziennik;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Ściana gruzu po zawale (zostaje po odejściu dłoni).</summary>
    public sealed class ScianaGruzu
    {
        public List<double> kafle = new List<double>();
        public double x, strop, dno;
        public double od, @do;
        /// <summary>Od kiedy się kruszy (albo null).</summary>
        public double? kruszy;
    }

    public sealed class IleAkcjiDloni
    {
        public double rzut, tarcza, zawal;
        public void Dodaj(string a) { if (a == "rzut") rzut++; else if (a == "tarcza") tarcza++; else if (a == "zawal") zawal++; }
    }

    /// <summary>Stan (sim.lud.dlonDemona — trafia do zapisu). Akcja: 'rzut' | 'tarcza' | 'zawal'.</summary>
    public sealed class StanDloniDemona
    {
        public string? akcja;
        /// <summary>'wstaje' | 'chwyta' | 'unosi' | 'rzuca' | 'stoi' | 'drze' | 'wali' | 'cofa'</summary>
        public string faza = "wstaje";
        public double od;
        public double nastT;
        public string? ostatnia;
        /// <summary>Kogo (rycerz) i gdzie; strona: gdzie stoi rycerz.</summary>
        public double? cel;
        public double x, y, bok;
        /// <summary>Zawał: strop i dno kolumny.</summary>
        public double? strop, dno;
        public ScianaGruzu? sciana;
        /// <summary>Tarcza: ostatnie odbite uderzenie (iskry na dłoni).</summary>
        public double? odbicieT;
        public IleAkcjiDloni ile = new IleAkcjiDloni();
        public bool? widziana;
    }

    /// <summary>
    /// DŁOŃ Z OTCHŁANI POMAGA DEMONOWI (Alpha, etap 5b) — rzut rycerzem, tarcza przed demonem, zawał stropu (patrz dlon-demona.ts).
    /// </summary>
    public static class DlonDemona
    {
        static Typ_DLON_demon D => DLON.demon;

        static (string faza, double dl)[] DLUGOSC(string a) => a switch
        {
            "rzut" => new[] { ("wstaje", D.rzut.wstaje), ("chwyta", D.rzut.chwyta), ("unosi", D.rzut.unosi), ("rzuca", D.rzut.rzuca), ("cofa", D.rzut.cofa) },
            "tarcza" => new[] { ("wstaje", D.tarcza.wstaje), ("stoi", D.tarcza.stoi), ("cofa", D.tarcza.cofa) },
            _ => new[] { ("wstaje", D.zawal.wstaje), ("drze", D.zawal.drze), ("wali", D.zawal.wali), ("cofa", D.zawal.cofa) },
        };

        public static StanDloniDemona stanDloniDemona(Sim sim) =>
            sim.lud.dlonDemona ??= new StanDloniDemona { akcja = null, faza = "wstaje", od = 0, nastT = 0, x = 0, y = 0, bok = 1, ile = new IleAkcjiDloni() };

        static Creature? demon(Sim sim) => sim.creatures.FirstOrDefault(c => !c.dead && c.boss != null);

        /// <summary>Rycerz (albo inny walczący) najbliżej demona — na niego dłoń poluje.</summary>
        static Creature? rycerzPrzy(Sim sim, Creature dm)
        {
            Creature? best = null; var bd = double.PositiveInfinity;
            foreach (var c in sim.creatures)
            {
                if (c.dead || !walczacy(c) || c.lot != null || c.wDloni == true) continue;
                var d = JS.Hypot(c.x - dm.x, c.y - dm.y);
                if (d < bd) { bd = d; best = c; }
            }
            return best;
        }

        /// <summary>Pierwszy lity kafel w dół od (x, y) — dno — i w górę od dna — strop.</summary>
        static (double dno, double strop)? kolumna(Sim sim, double x, double y, double maks)
        {
            var w = sim.world;
            var dno = Math.Floor(y);
            while (dno < w.h - 1 && !w.solid(x, dno) && dno - y < maks) dno++;
            if (!w.solid(x, dno)) return null;
            var strop = dno - 1;
            while (strop > 0 && !w.solid(x, strop) && dno - strop <= maks + 1) strop--;
            if (!w.solid(x, strop)) return null;
            return (dno, strop);
        }

        /// <summary>Tarcza stoi — demona nic nie rani.</summary>
        public static bool tarczaChroni(Sim sim)
        {
            var s = sim.lud.dlonDemona;
            if (s == null || s.akcja != "tarcza") return false;
            return s.faza == "stoi" || (s.faza == "wstaje" && sim.tick - s.od > D.tarcza.wstaje * 0.6);
        }

        /// <summary>Cios w demona odbił się od tarczy: iskry na dłoni i odrzut atakującego.</summary>
        public static void odbijOdTarczy(Sim sim, Creature od)
        {
            var s = sim.lud.dlonDemona!;
            s.odbicieT = sim.tick;
            var sg = JS.Sign(od.x - s.x);
            var kier = JS.Tak(sg) ? sg : s.bok;
            var nx = od.x + kier * D.tarcza.odrzut;
            if (sim.world.passable(Math.Floor(nx), Math.Floor(od.y))) od.x = nx;
            for (var k = 0; k < 4; k++) sim.spark(s.x + sim.rng.range(-0.4, 0.4), od.y - 0.8 + sim.rng.range(-0.5, 0.5), "hit");
        }

        /// <summary>Dłoń coś szykuje albo zasłania demona — demon czeka.</summary>
        public static bool demonCzeka(Sim sim)
        {
            var s = sim.lud.dlonDemona;
            if (string.IsNullOrEmpty(s?.akcja) || s!.faza == "cofa") return false;
            return s.akcja == "tarcza" || s.akcja == "zawal";
        }

        /// <summary>Ściana gruzu stoi: demon nie przechodzi na drugą stronę — albo null.</summary>
        public static ScianaGruzu? scianaGruzu(Sim sim)
        {
            var sc = sim.lud.dlonDemona?.sciana;
            return sc != null && sim.tick < sc.@do + D.zawal.kruszy ? sc : null;
        }

        /// <summary>Co tik symulacji (z tikLudu).</summary>
        public static void tikDloniDemona(Sim sim)
        {
            if (!D.wlaczona || !DLON.wlaczona) return;
            var p = sim.lud.pomnik;
            var s = sim.lud.dlonDemona;
            if (s?.sciana != null)
            {
                var sc = s.sciana;
                if (sim.tick >= sc.@do && sc.kruszy == null)
                {
                    sc.kruszy = sim.tick;
                    sim.gdzie(sc.x + 1, sc.dno - 1).log("Gruz po zawale kruszy się i osypuje — przejście znów wolne.", "swiat", "zawal-kruszy");
                }
                if (sc.kruszy != null && sim.tick - sc.kruszy >= D.zawal.kruszy)
                {
                    foreach (var i in sc.kafle) if (sim.world.tile[i] == T.ROCK) sim.world.tile[i] = T.AIR;
                    s.sciana = null;
                }
            }
            if (p == null || (p.faza != "walka" && p.faza != "kona")) return;
            var st = stanDloniDemona(sim);
            var dm = demon(sim);
            if (!string.IsNullOrEmpty(st.akcja) && (p.faza == "kona" || dm == null) && st.faza != "cofa") { puscRycerza(sim, st, false); st.faza = "cofa"; st.od = sim.tick; }
            if (!string.IsNullOrEmpty(st.akcja)) { krokAkcji(sim, st, dm); return; }
            if (p.faza != "walka" || dm == null) return;
            if (st.nastT == 0) st.nastT = sim.tick + D.pierwszaPo;
            if (sim.tick < st.nastT || (sim.lud.dlon != null && sim.lud.dlon.faza != "brak")) return;
            var r = rycerzPrzy(sim, dm);
            if (r == null) { st.nastT = sim.tick + 120; return; }
            wybierz(sim, st, dm, r);
        }

        sealed class Mozliwa { public string a = ""; public double waga; public Func<bool> ustaw = () => false; }

        /// <summary>Wybiera akcję, która ma teraz sens (losowo według wag, nie tę samą co przed chwilą, jeśli jest inna).</summary>
        static void wybierz(Sim sim, StanDloniDemona st, Creature dm, Creature r)
        {
            var odl = JS.Hypot(r.x - dm.x, r.y - dm.y);
            var mozliwe = new List<Mozliwa>();
            var stoiNaZiemi = sim.world.solid(Math.Floor(r.x), Math.Floor(r.y) + 1);
            if (odl <= D.rzut.zasieg && stoiNaZiemi && st.sciana == null) mozliwe.Add(new Mozliwa { a = "rzut", waga = D.wagi.rzut, ustaw = () => ustawRzut(sim, st, dm, r) });
            if (odl <= D.tarcza.zasieg && st.sciana == null) mozliwe.Add(new Mozliwa { a = "tarcza", waga = D.wagi.tarcza, ustaw = () => ustawTarcze(sim, st, dm, r) });
            var dx = Math.Abs(r.x - dm.x);
            if (dx >= D.zawal.minOdstep && dx <= D.zawal.maxOdstep && Math.Abs(r.y - dm.y) <= D.zawal.maxRoznicaWys && st.sciana == null) mozliwe.Add(new Mozliwa { a = "zawal", waga = D.wagi.zawal, ustaw = () => ustawZawal(sim, st, dm, r) });
            var inne = mozliwe.Where(m => m.a != st.ostatnia).ToList();
            var lista = inne.Count > 0 ? inne : mozliwe;
            while (lista.Count > 0)
            {
                double suma = 0;
                foreach (var m0 in lista) suma += m0.waga;
                var los = sim.rng.next() * suma;
                var idx = -1;
                for (var k = 0; k < lista.Count; k++) { los -= lista[k].waga; if (los < 0) { idx = k; break; } }
                var i = Math.Max(0, idx);
                var m = lista[i];
                if (m.ustaw()) { zacznij(sim, st, m.a, r); return; }
                lista.RemoveAt(i);
            }
            st.nastT = sim.tick + 120;
        }

        static bool ustawRzut(Sim sim, StanDloniDemona st, Creature dm, Creature r)
        {
            st.cel = r.id;
            st.x = r.x; st.y = Math.Floor(r.y) + 1;          // podłoga pod rycerzem
            var sg = JS.Sign(r.x - dm.x);
            st.bok = JS.Tak(sg) ? sg : 1;
            return true;
        }

        static bool ustawTarcze(Sim sim, StanDloniDemona st, Creature dm, Creature r)
        {
            var sg = JS.Sign(r.x - dm.x);
            st.bok = JS.Tak(sg) ? sg : 1;
            var x = dm.x + st.bok * D.tarcza.przedDemonem;
            var k = kolumna(sim, Math.Floor(x), Math.Max(dm.y, r.y) - 1, 8);
            if (k == null) return false;
            st.x = x; st.y = k.Value.dno;
            st.cel = r.id;
            return true;
        }

        static bool ustawZawal(Sim sim, StanDloniDemona st, Creature dm, Creature r)
        {
            var w = sim.world;
            var sg = JS.Sign(r.x - dm.x);
            st.bok = JS.Tak(sg) ? sg : 1;
            foreach (var przes in new double[] { 0, 1, -1, 2, -2 })
            {
                var x = Math.Floor(dm.x + st.bok * Math.Max(3, Math.Abs(r.x - dm.x) * 0.45)) + przes;
                var kk = kolumna(sim, x, r.y, D.zawal.maxWys);
                if (kk == null) continue;
                var k = kk.Value;
                if (k.dno - k.strop - 1 < 2 || k.dno - k.strop - 1 > D.zawal.maxWys) continue;
                var zajete = sim.creatures.Any(c => !c.dead && c.straznik != true && c.x >= x - 0.6 && c.x <= x + D.zawal.szer + 0.6 && c.y > k.strop - 1 && c.y < k.dno + 1);
                if (zajete) continue;
                double wolnych = 0; var wSzybie = false;
                for (var xx = x; xx < x + D.zawal.szer; xx++) for (var yy = k.strop + 1; yy < k.dno; yy++)
                {
                    if (w.inb(xx, yy) && !w.solid(xx, yy)) wolnych++;
                    if (w.wSzybie(xx, yy) || w.wBramie(xx, yy) || w.wPrzedprozu(xx, yy)) wSzybie = true;
                }
                if (wSzybie) continue;
                if (wolnych < 3) continue;
                st.x = x; st.strop = k.strop; st.dno = k.dno; st.y = k.strop;
                return true;
            }
            return false;
        }

        static void zacznij(Sim sim, StanDloniDemona st, string a, Creature r)
        {
            st.akcja = a; st.faza = DLUGOSC(a)[0].faza; st.od = sim.tick;
            st.widziana = true;
            st.ile.Dodaj(a);
            var kogo = kto(sim, r).Split(new[] { " (" }, StringSplitOptions.None)[0];
            if (a == "rzut")
            {
                r.wDloni = true; r.droga = null; r.vy = 0; r.ruch = null;
                r.zamiar = "spod podłogi wyrasta dłoń z otchłani i go obejmuje"; r.zamiarDo = sim.tick + 400;
                sim.gdzie(st.x, st.y).log($"Spod podłogi krypty wyrasta dłoń z otchłani — obejmuje palcami: {kogo}.", "otchlan", "dlon-rzut");
            }
            else if (a == "tarcza")
            {
                sim.gdzie(st.x, st.y).log("Przed demonem wyrasta z podłogi dłoń z otchłani — otwarta, wnętrzem do rycerza. Ciosy się od niej odbijają.", "otchlan", "dlon-tarcza");
            }
            else
            {
                r.przystanDo = sim.tick + D.zawal.wstaje + D.zawal.drze + D.zawal.wali;
                r.zamiar = "staje — przed nim pęka strop, sypie się gruz"; r.zamiarDo = r.przystanDo;
                sim.gdzie(st.x + 1, st.y).log("Ze stropu krypty wyłaniają się szpony dłoni z otchłani — drą skałę nad przejściem.", "otchlan", "dlon-zawal");
            }
            zapisz(sim, "swiat", $"Dłoń z otchłani pomaga demonowi: {a} → {kogo}", Math.Floor(st.x), Math.Floor(st.y));
        }

        /// <summary>Rycerz w dłoni: unoszony i kołysany razem z nią.</summary>
        static void trzymanyRycerz(Sim sim, StanDloniDemona st, double t)
        {
            var r = sim.creatureById(st.cel ?? -1);
            if (r == null || r.dead || r.wDloni != true) return;
            var R = D.rzut;
            double unies = 0, wtyl = 0;
            if (st.faza == "chwyta") { var k = Math.Min(1, t / R.chwyta); unies = 1.2 * k * k; }
            else if (st.faza == "unosi") { var k = Math.Min(1, t / R.unosi); unies = 1.2 + 0.8 * k; wtyl = -0.5 * JS.Sin(k * Math.PI * 0.5); }
            else if (st.faza == "rzuca") { var k = Math.Min(1, t / R.rzuca); unies = 2.0 + 0.6 * k; wtyl = -0.5 + 1.0 * k; }
            r.x = st.x + st.bok * wtyl;
            r.y = st.y - 1 - unies;
            r.vy = 0; r.droga = null;
            r.face = -st.bok;
        }

        /// <summary>Puszcza rycerza: `rzut` — ciska go w górę i w bok, inaczej — opuszcza na ziemię.</summary>
        static void puscRycerza(Sim sim, StanDloniDemona st, bool rzut)
        {
            var r = sim.creatureById(st.cel ?? -1);
            if (r == null || r.dead || r.wDloni != true) return;
            r.wDloni = false;
            var R = D.rzut;
            r.lot = rzut
                ? new Lot { vx = st.bok * R.wBok, vy = -Math.Sqrt(2 * R.grawitacja * R.wysokosc), od = sim.tick }
                : new Lot { vx = 0, vy = 0, od = sim.tick };
            if (rzut)
            {
                sim.gdzie(r.x, r.y).log($"Dłoń ciska {kto(sim, r).Split(new[] { " (" }, StringSplitOptions.None)[0].ToLowerInvariant()} w górę — koziołkuje pod sam strop.", "krew", "dlon-rzut-lot");
                sim.stat.rzutow = sim.stat.rzutow + 1;
            }
        }

        static void krokAkcji(Sim sim, StanDloniDemona st, Creature? dm)
        {
            var t = sim.tick - st.od;
            var fazy = DLUGOSC(st.akcja!);
            var i = Array.FindIndex(fazy, f => f.faza == st.faza);
            if (st.akcja == "rzut" && (st.faza == "chwyta" || st.faza == "unosi" || st.faza == "rzuca")) trzymanyRycerz(sim, st, t);
            if (st.akcja == "rzut" && st.faza == "wstaje")
            {
                var r = sim.creatureById(st.cel ?? -1);
                if (r != null && r.wDloni == true) { r.x = st.x; r.vy = 0; r.droga = null; }
            }
            // tarcza idzie za demonem (stoi zawsze przed nim, od strony rycerza)
            if (st.akcja == "tarcza" && dm != null && st.faza != "cofa") st.x += (dm.x + st.bok * D.tarcza.przedDemonem - st.x) * 0.05;
            if (i < 0 || t < fazy[i].dl) return;
            // koniec fazy
            if (st.akcja == "rzut" && st.faza == "rzuca") puscRycerza(sim, st, true);
            if (st.akcja == "zawal" && st.faza == "drze") zawal(sim, st);
            if (i + 1 < fazy.Length) { st.faza = fazy[i + 1].faza; st.od = sim.tick; return; }
            // koniec akcji
            puscRycerza(sim, st, false);
            st.ostatnia = st.akcja!;
            st.akcja = null; st.cel = null;
            st.nastT = sim.tick + D.przerwa;
        }

        /// <summary>Płaskie uderzenie w strop: kolumna zawala się w ścianę gruzu (bez zasypywania kogokolwiek).</summary>
        static void zawal(Sim sim, StanDloniDemona st)
        {
            var w = sim.world;
            if (st.strop == null || st.dno == null) return;
            var kafle = new List<double>();
            for (var xx = st.x; xx < st.x + D.zawal.szer; xx++)
            {
                for (var yy = st.strop.Value + 1; yy < st.dno.Value; yy++)
                {
                    if (!w.inb(xx, yy) || w.solid(xx, yy)) continue;
                    if (sim.creatures.Any(c => !c.dead && c.straznik != true && Math.Floor(c.x) == xx && Math.Abs(c.y - yy) < 1.2)) continue;
                    var i = w.idx(xx, yy);
                    w.tile[i] = T.ROCK;
                    kafle.Add(i);
                }
            }
            for (var k = 0; k < 12; k++) sim.spark(st.x + sim.rng.range(0, D.zawal.szer), st.strop.Value + 1 + sim.rng.range(0, st.dno.Value - st.strop.Value - 1), "dust");
            st.sciana = new ScianaGruzu { kafle = kafle, x = st.x, strop = st.strop.Value, dno = st.dno.Value, od = sim.tick, @do = sim.tick + D.zawal.trwa };
            sim.stat.zawalow = sim.stat.zawalow + 1;
            sim.gdzie(st.x + 1, st.dno.Value - 1).log("Strop krypty zawalił się między rycerzem a demonem. Demon jest odcięty — i zrasta się szybciej. Robotnicy mogą rozkuć gruz.", "krew", "zawal");
            zapisz(sim, "swiat", $"zawał: ściana gruzu {kafle.Count} kafli", st.x, st.dno.Value - 1);
        }

        /// <summary>Ruch rycerza ciśniętego przez dłoń: leci łukiem, odbija się od stropu i ścian, spada ranny i ogłuszony.</summary>
        public static bool krokLotu(Sim sim, Creature c)
        {
            if (c.wDloni == true) { c.vy = 0; return true; }
            var L = c.lot;
            if (L == null) return false;
            var w = sim.world;
            var R = D.rzut;
            L.vy = Math.Min(0.6, L.vy + R.grawitacja);
            double nx = c.x + L.vx, ny = c.y + L.vy;
            bool lity(double x, double y) => !w.inb(Math.Floor(x), Math.Floor(y)) || w.solid(Math.Floor(x), Math.Floor(y));
            if (lity(nx, c.y) || lity(nx, c.y - 1)) { L.vx = -L.vx * 0.3; nx = c.x; }
            if (L.vy < 0 && lity(nx, ny - 1.4))
            {
                L.vy = Math.Abs(L.vy) * 0.15; ny = c.y; L.stropT = sim.tick;
                for (var k = 0; k < 6; k++) sim.spark(nx + sim.rng.range(-0.6, 0.6), ny - 1.4, "dust");
                c.hp -= maxHp(sim, c) * R.rana * 0.3;
                oznaczCios(sim, c, true);
            }
            if (L.vy > 0 && lity(nx, Math.Floor(ny) + 1))
            {
                c.x = nx; c.y = Math.Floor(ny);
                while (lity(c.x, c.y) && c.y > 1) c.y--;
                c.lot = null;
                c.vy = 0;
                if (L.vy > 0.05 || L.vx != 0)
                {
                    c.hp -= maxHp(sim, c) * R.rana;
                    oznaczCios(sim, c, true);
                    c.ogluszonyDo = sim.tick + R.ogluszenie;
                    c.zamiar = "leży ogłuszony po upadku"; c.zamiarDo = c.ogluszonyDo;
                    for (var k = 0; k < 8; k++) sim.spark(c.x + sim.rng.range(-0.8, 0.8), c.y + 0.9, "dust");
                    if (rolaPostaci(c) != null) sim.gdzie(c.x, c.y).log($"{kto(sim, c).Split(new[] { " (" }, StringSplitOptions.None)[0]} spada na ziemię — ranny i ogłuszony.", "krew", "dlon-rzut-ladowanie");
                }
                if (c.hp <= 0) sim.kill(c, "ciśnięty przez dłoń z otchłani", "otchlan");
                return true;
            }
            c.x = Math.Max(1, Math.Min(w.w - 2, nx));
            c.y = Math.Max(1, ny);
            c.vy = 0; c.droga = null;
            return true;
        }

        /// <summary>Narzędzie dewelopera: akcja dłoni od razu (w walce z demonem).</summary>
        public static string devDlonDemona(Sim sim, string a)
        {
            if (sim.lud.pomnik?.faza != "walka") return "Dłoń pomaga tylko w walce z demonem (najpierw „rozbij pomnik”).";
            var st = stanDloniDemona(sim);
            if (!string.IsNullOrEmpty(st.akcja)) return "Dłoń już coś robi.";
            var dm = demon(sim);
            var r = dm != null ? rycerzPrzy(sim, dm) : null;
            if (dm == null || r == null) return "Nie ma demona albo rycerza.";
            var ok = a == "rzut" ? ustawRzut(sim, st, dm, r) : a == "tarcza" ? ustawTarcze(sim, st, dm, r) : ustawZawal(sim, st, dm, r);
            if (!ok) return a == "zawal" ? "Rycerz za blisko albo za daleko od demona — nie ma gdzie zawalić stropu." : "Nie ma gdzie wyrosnąć dłoni.";
            if (st.sciana != null && a == "zawal") return "Ściana gruzu już stoi.";
            zacznij(sim, st, a, r);
            return $"Dłoń z otchłani: {(a == "rzut" ? "rzut rycerzem" : a == "tarcza" ? "tarcza przed demonem" : "zawał stropu")}.";
        }
    }
}
