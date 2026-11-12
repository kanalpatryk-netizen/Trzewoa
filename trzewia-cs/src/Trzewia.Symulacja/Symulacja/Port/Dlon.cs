// Port: alpha-1/src/sim/dlon.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.LinaWiadra;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Stan dłoni z otchłani (trafia do zapisu razem z ludem). Faza: 'brak' | 'wstaje' | 'siega' | 'chwyta' | 'cofa' | 'gasnie'.</summary>
    public sealed class StanDloni
    {
        public string faza = "brak";
        /// <summary>Tik początku bieżącej fazy.</summary>
        public double od;
        /// <summary>Kiedy następne losowanie i do kiedy cisza po ostatnim razie.</summary>
        public double losT;
        public double ciszaDo;
        /// <summary>Ile razy w tej partii.</summary>
        public double ile;
        /// <summary>Głębia otchłani pod ofiarą, brzeg otchłani i miejsce chwytu.</summary>
        public double ox, oy;
        public double bx, by;
        public double cx, cy;
        /// <summary>Kogo bierze (id) i jakie role miały zabrane postacie.</summary>
        public List<double> ofiary = new List<double>();
        public List<string> zabrani = new List<string>();
        /// <summary>Cud odpędził ją przed chwytem — i jak wysoko już była.</summary>
        public bool? odpedzona;
        public double? odpedzonaU;
        /// <summary>Ktoś już ją widział — atlas ma tablicę.</summary>
        public bool? widziana;
        /// <summary>Tik, w którym otchłań się poruszyła / dłoń zacisnęła się — ekran gra wtedy dźwięk.</summary>
        public double? wstajeT;
        public double? chwytT;
        /// <summary>Etap 4: po co przyszła ('lud' | 'lina'); los liny, cisza po niej i ile razy cięła.</summary>
        public string? cel;
        public double? linaLosT;
        public double? linaCiszaDo;
        public double? ileLin;
    }

    /// <summary>
    /// DŁOŃ Z OTCHŁANI (Remake v1, tylko Koszmar) — wznosi się z nieznanego i zabiera ludzi albo przecina linę wiadra.
    /// </summary>
    public static class Dlon
    {
        /// <summary>Biernik (i dopełniacz) roli: „zabrała robotnika”, „pod stopami pobożnego”.</summary>
        static readonly Dictionary<string, string> KOGO = new Dictionary<string, string> { ["pobozny"] = "pobożnego", ["robotnik"] = "robotnika", ["rycerz"] = "rycerza" };

        static double DLUGOSC(string f) => f switch
        {
            "wstaje" => DLON.wstaje, "siega" => DLON.siega, "chwyta" => DLON.chwyta, "cofa" => DLON.cofa, "gasnie" => DLON.gasnie, _ => double.NaN,
        };
        static string NASTEPNA(string f) => f switch
        {
            "wstaje" => "siega", "siega" => "chwyta", "chwyta" => "cofa", "cofa" => "gasnie", "gasnie" => "brak", _ => "brak",
        };

        static StanDloni nowyStan() => new StanDloni { faza = "brak", od = 0, losT = DLON.pierwszaPo, ciszaDo = 0, ile = 0 };

        /// <summary>Czy kafel jest w otchłani (nieznany albo zapomniany).</summary>
        static bool wOtchlani(Sim sim, double x, double y)
        {
            var w = sim.world;
            if (!w.inb(x, y) || y <= World.SURFACE_Y + 2) return false;
            var i = w.idx(x, y);
            if (w.tile[i] == T.SKY) return false;
            return w.ever[i] == 0 || sim.tick - w.lastSeen[i] > World.MEM_SPAN;
        }

        static bool moznaWziac(Creature c) => !c.dead && c.straznik != true && rolaPostaci(c) != null;

        static double ileLudu(Sim sim)
        {
            double n = 0;
            foreach (var c in sim.creatures) if (moznaWziac(c)) n++;
            return n;
        }

        static bool przyObozie(Sim sim, double x, double y)
        {
            var klan = klanLudu(sim);
            var r = DLON.odObozu;
            if (klan != null && JS.Hypot(klan.hx - x, klan.hy - y) < r) return true;
            foreach (var o in sim.lud.obozy ?? new List<ObozLudu>()) if (JS.Hypot(o.x - x, o.y - y) < r * 0.8) return true;
            foreach (var s in sim.lud.spizarnie ?? new List<Spizarnia>()) if (JS.Hypot(s.x - x, s.y - y) < r * 0.8) return true;
            return JS.Hypot(sim.world.coreX - x, sim.world.coreY - y) < r;
        }

        sealed class Kandydat { public Creature c = null!; public double ocena, bx, by, ox, oy; }

        /// <summary>Szuka ofiary nad otchłanią (patrz TS). `wszedzie` — narzędzie dewelopera.</summary>
        static bool znajdzOfiare(Sim sim, StanDloni d, bool wszedzie = false)
        {
            var R = DLON.otchlanPromien;
            var w = sim.world;
            Kandydat? naj = null;
            foreach (var c in sim.creatures)
            {
                if (!moznaWziac(c)) continue;
                if (!wszedzie && przyObozie(sim, c.x, c.y)) continue;
                if (!wszedzie && (c.x < DLON.odKrawedzi || c.x > w.w - DLON.odKrawedzi)) continue;
                double x0 = Math.Floor(c.x), y0 = Math.Floor(c.y);
                double ile = 0, sx = 0, bx = 0, by = 0, bd = 1e9;
                for (double dy = 2; dy <= R + 4; dy++)
                {
                    for (double dx = -6; dx <= 6; dx++)
                    {
                        if (!wOtchlani(sim, x0 + dx, y0 + dy)) continue;
                        ile++; sx += dx;
                        var dd = dy + Math.Abs(dx) * 0.7;
                        if (dd < bd) { bd = dd; bx = dx; by = dy; }
                    }
                }
                if (ile < (wszedzie ? 1 : DLON.otchlanMin)) continue;
                var pochyl = Math.Max(-DLON.pochylenie, Math.Min(DLON.pochylenie, sx / ile / 4));
                double ox = x0 + 0.5 + pochyl * DLON.glebia, oy = y0 + DLON.glebia;
                var miesci = ox >= 5 && ox <= w.w - 6 && oy <= w.h - 3;
                if (!miesci && !wszedzie) continue;
                var ocena = ile * (0.7 + sim.rng.next() * 0.6) * (miesci ? 1 : 0.2);
                if (naj == null || ocena > naj.ocena) naj = new Kandydat { c = c, ocena = ocena, bx = x0 + bx + 0.5, by = y0 + by + 0.5, ox = ox, oy = oy };
            }
            if (naj == null) return false;
            var cc = naj.c;
            d.cx = cc.x + 0.5; d.cy = cc.y - 0.6;
            d.bx = naj.bx; d.by = Math.Max(naj.by, cc.y + 1.5);
            d.ox = Math.Max(4, Math.Min(w.w - 5, naj.ox));
            d.oy = Math.Min(w.h - 3, Math.Max(naj.oy, d.by + 3));
            d.ofiary = new List<double> { cc.id };
            if (sim.rng.next() < DLON.drugiSzansa)
            {
                Creature? drugi = null; var dd = DLON.drugiDo;
                foreach (var o in sim.creatures)
                {
                    if (o == cc || !moznaWziac(o)) continue;
                    var odl = JS.Hypot(o.x - cc.x, o.y - cc.y);
                    if (odl < dd) { dd = odl; drugi = o; }
                }
                if (drugi != null)
                {
                    d.ofiary.Add(drugi.id);
                    d.cx = (cc.x + drugi.x) / 2 + 0.5; d.cy = (cc.y + drugi.y) / 2 - 0.6;
                }
            }
            return true;
        }

        static void zacznij(Sim sim, StanDloni d)
        {
            d.faza = "wstaje";
            d.od = sim.tick;
            d.wstajeT = sim.tick;
            d.widziana = true;
            d.odpedzona = false;
            d.odpedzonaU = null;
            d.zabrani = new List<string>();
            foreach (var id in d.ofiary)
            {
                var c = sim.creatures.FirstOrDefault(q => q.id == id);
                if (c == null) continue;
                c.fear = 1;
                c.zamarlyDo = sim.tick + DLON.wstaje + DLON.siega + DLON.chwyta;
                c.zamiar = "stoi jak wryty — spod ziemi, z otchłani, wznosi się dłoń";
                c.zamiarDo = c.zamarlyDo;
            }
            var pierwszy = sim.creatures.FirstOrDefault(q => q.id == d.ofiary[0]);
            var kogo = d.ofiary.Count > 1 ? "dwojga z ludu" : KOGO[(pierwszy != null ? rolaPostaci(pierwszy) : null) ?? "pobozny"];
            sim.gdzie(d.cx, d.cy).log($"Pod stopami {kogo} poruszyła się otchłań. Z ciemności w dole wznosi się ogromna dłoń.", "otchlan");
            zapisz(sim, "swiat", $"Dłoń z otchłani: wznosi się, ofiary {string.Join(", ", d.ofiary.Select(i => $"#{JS.S(i)}"))}", d.cx, d.cy);
        }

        /// <summary>Dłoń się zacisnęła: ofiary znikają w otchłani (bez kości).</summary>
        static void chwyc(Sim sim, StanDloni d)
        {
            d.chwytT = sim.tick;
            var nazwy = new List<string>();
            foreach (var id in d.ofiary)
            {
                var c = sim.creatures.FirstOrDefault(q => q.id == id);
                if (c == null || c.dead) continue;
                var r = rolaPostaci(c) ?? "pobozny";
                d.zabrani.Add(r);
                nazwy.Add(KOGO[r]);
                double x = Math.Floor(c.x), y = Math.Floor(c.y);
                var bylo = sim.world.inb(x, y) ? sim.world.get(x, y) : -1;
                sim.kill(c, "zabrany w otchłań", "otchlan");
                if (bylo == T.AIR && sim.world.get(x, y) == T.BONES) sim.world.set(x, y, T.AIR);
                sim.efekty = sim.efekty.Where(e => !(e.rodzaj == "smierc" && e.x == c.x && e.y == c.y)).ToList();
            }
            if (nazwy.Count > 0) sim.gdzie(d.cx, d.cy).log($"Ogromna dłoń z otchłani zabrała w dół {string.Join(" i ", nazwy)}. Nie zostały nawet kości.", "krew");
        }

        /// <summary>Etap 4: dłoń sięga po linę wiadra. False, gdy w szybie nie ma wiadra na linie.</summary>
        static bool ustawLine(Sim sim, StanDloni d)
        {
            var m = miejsceCiecia(sim);
            if (m == null) return false;
            double bok = sim.rng.next() < 0.5 ? -1 : 1;
            d.cel = "lina";
            d.ofiary = new List<double>();
            d.cx = m.x + 0.5; d.cy = m.y;
            d.bx = m.x + 0.5 + bok * DLON.lina.bok; d.by = m.dno + 1.4;
            d.ox = m.x + 0.5 + bok * (DLON.lina.bok + DLON.glebia * DLON.pochylenie * 0.5); d.oy = d.by + DLON.glebia;
            return true;
        }

        static void zacznijLine(Sim sim, StanDloni d)
        {
            d.faza = "wstaje";
            d.od = sim.tick;
            d.wstajeT = sim.tick;
            d.widziana = true;
            d.odpedzona = false;
            d.odpedzonaU = null;
            d.zabrani = new List<string>();
            sim.gdzie(d.cx, d.cy).log("Pod podłogą sali, tuż przy wiadrze, poruszyła się otchłań. Wznosi się dłoń — sięga po linę.", "otchlan", "dlon-lina");
            zapisz(sim, "swiat", "Dłoń z otchłani: wznosi się po linę wiadra", d.cx, d.cy);
        }

        /// <summary>Co tik symulacji (sam pilnuje rytmu).</summary>
        public static void tikDloni(Sim sim)
        {
            if (!DLON.wlaczona || sim.ending != null) return;
            var d = sim.lud.dlon;
            if (d == null && !sim.koszmar) return;
            if (sim.lud.dlon == null) sim.lud.dlon = nowyStan();
            var s = sim.lud.dlon;
            // zapis sprzed zmiany: faza nazywała się „oczy”
            if (s.faza == "oczy") s.faza = "wstaje";
            // etap 4: los liny wiadra — osobny od chwytania ludzi
            if (s.faza == "brak" && sim.koszmar && !sim.spokojnySwiat && sim.tick >= (s.linaLosT ?? DLON.lina.pierwszaPo))
            {
                s.linaLosT = sim.tick + DLON.lina.losujCo;
                if (sim.tick >= (s.linaCiszaDo ?? 0) && (s.ileLin ?? 0) < DLON.lina.maxNaPartie && linaPrzecieta(sim) == null
                    && sim.rng.next() < DLON.lina.szansa && ustawLine(sim, s)) { zacznijLine(sim, s); return; }
            }
            if (s.faza == "brak")
            {
                if (!sim.koszmar || sim.spokojnySwiat || sim.tick < s.losT) return;
                // (etap 5b: w walce z demonem dłoń pomaga jemu — i nie chodzi po ludzi)
                if (sim.lud.pomnik != null && sim.lud.pomnik.faza != "stoi") return;
                s.losT = sim.tick + DLON.losujCo;
                if (sim.tick < s.ciszaDo || s.ile >= DLON.maxNaPartie || ileLudu(sim) < DLON.minLudu) return;
                if (sim.rng.next() >= DLON.szansa) return;
                if (znajdzOfiare(sim, s)) { s.cel = "lud"; zacznij(sim, s); }
                return;
            }
            // etap 4: miejsce cięcia idzie za wiadrem; wiadra już nie ma albo lina przecięta — dłoń się cofa
            if (s.cel == "lina" && (s.faza == "wstaje" || s.faza == "siega" || s.faza == "chwyta"))
            {
                var m = miejsceCiecia(sim);
                if (m == null) { s.faza = "cofa"; s.od = sim.tick; s.odpedzona = true; s.odpedzonaU = 0.6; return; }
                s.cx = m.x + 0.5; s.cy = m.y;
                if (m.czeka && s.faza == "siega") s.od = Math.Max(s.od, sim.tick - Math.Floor(DLON.siega * 0.6));
            }
            // miejsce chwytu idzie za ofiarami
            else if (s.faza == "wstaje" || s.faza == "siega")
            {
                var zywe = s.ofiary.Select(id => sim.creatures.FirstOrDefault(q => q.id == id)).Where(c => c != null && !c.dead).Select(c => c!).ToList();
                if (zywe.Count == 0) { s.faza = "gasnie"; s.od = sim.tick; return; }
                double sx = 0, sy = 0;
                foreach (var c in zywe) sx += c.x;
                foreach (var c in zywe) sy += c.y;
                s.cx = sx / zywe.Count + 0.5;
                s.cy = sy / zywe.Count - 0.6;
                foreach (var c in zywe) c.fear = 1;
            }
            var faza = s.faza;
            if (sim.tick - s.od < DLUGOSC(faza)) return;
            s.faza = NASTEPNA(faza);
            s.od = sim.tick;
            // palce zamknęły się na nich (etap 4: albo pazur tnie linę)
            if (s.faza == "cofa" && s.odpedzona != true)
            {
                if (s.cel == "lina") { s.chwytT = sim.tick; przetnijLine(sim, s.cy); } else chwyc(sim, s);
            }
            if (s.faza == "brak")
            {
                if (s.cel == "lina") { s.ileLin = (s.ileLin ?? 0) + 1; s.linaCiszaDo = sim.tick + DLON.lina.przerwa; }
                else { s.ile++; s.ciszaDo = sim.tick + DLON.przerwa; }
                s.ofiary = new List<double>();
                s.cel = null;
            }
        }

        /// <summary>Cud rzucony w (tx, ty): odpycha dłoń, jeśli jeszcze nie chwyciła i jest blisko.</summary>
        public static bool odpedzDlon(Sim sim, double tx, double ty)
        {
            var d = sim.lud.dlon;
            if (d == null || (d.faza != "wstaje" && d.faza != "siega")) return false;
            var blisko = JS.Hypot(d.bx - tx, d.by - ty) <= DLON.cudPromien || JS.Hypot(d.cx - tx, d.cy - ty) <= DLON.cudPromien;
            if (!blisko) return false;
            foreach (var id in d.ofiary)
            {
                var c = sim.creatures.FirstOrDefault(q => q.id == id);
                if (c != null && !c.dead) { c.zamarlyDo = null; c.zamiarDo = sim.tick; c.fear = Math.Max(c.fear, 0.6); }
            }
            d.odpedzona = true;
            sim.stat.odepchnieta++;
            var u = Math.Min(1, (sim.tick - d.od) / (d.faza == "siega" ? DLON.siega : DLON.wstaje));
            d.odpedzonaU = d.faza == "siega" ? 1 + u : u;
            d.faza = "cofa";
            d.od = sim.tick;
            sim.gdzie(d.cx, d.cy).log("Światło Cudu odepchnęło dłoń z powrotem w otchłań.", "wiara");
            zapisz(sim, "swiat", "Dłoń z otchłani odpędzona Cudem", d.cx, d.cy);
            return true;
        }

        /// <summary>Narzędzie dewelopera (etap 4): dłoń po linę wiadra od razu.</summary>
        public static string devLina(Sim sim)
        {
            if (sim.lud.dlon == null) sim.lud.dlon = nowyStan();
            var d = sim.lud.dlon;
            if (d.faza != "brak") return "Dłoń już tu jest.";
            if (linaPrzecieta(sim) != null) return "Lina już jest przecięta.";
            if (!ustawLine(sim, d)) return "W szybie nie ma wiadra na linie.";
            zacznijLine(sim, d);
            return "Dłoń wznosi się spod podłogi po linę wiadra.";
        }

        /// <summary>Narzędzie dewelopera: wydarzenie od razu (także poza Koszmarem).</summary>
        public static string devDlon(Sim sim)
        {
            if (sim.lud.dlon == null) sim.lud.dlon = nowyStan();
            var d = sim.lud.dlon;
            if (d.faza != "brak") return "Dłoń już tu jest.";
            if (!znajdzOfiare(sim, d) && !znajdzOfiare(sim, d, true)) return "Nikt z ludu nie stoi nad otchłanią (nieznanym).";
            d.cel = "lud";
            zacznij(sim, d);
            return $"Dłoń wznosi się z otchłani po {string.Join(" i ", d.ofiary.Select(i => $"#{JS.S(i)}"))}.";
        }

        /// <summary>Jedna linijka o stanie wydarzenia — dla okienka dewelopera.</summary>
        public static string opisDloni(Sim sim)
        {
            var d = sim.lud.dlon;
            string mmss(double t) { var s = Math.Max(0, Math.Ceiling(t / 120)); return $"{JS.S(Math.Floor(s / 60))}:{JS.S(s % 60).PadLeft(2, '0')}"; }
            if (!sim.koszmar && (d == null || d.faza == "brak")) return "Dłoń z otchłani: tylko w Koszmarze";
            if (d == null) return $"Dłoń z otchłani: najwcześniej za {mmss(DLON.pierwszaPo - sim.tick)}";
            if (d.faza != "brak") return $"Dłoń z otchłani: {d.faza} → {string.Join(", ", d.ofiary.Select(i => $"#{JS.S(i)}"))}";
            if (d.ile >= DLON.maxNaPartie) return $"Dłoń z otchłani: była już {JS.S(d.ile)}× — więcej nie przyjdzie";
            var za = Math.Max(d.ciszaDo, d.losT) - sim.tick;
            return $"Dłoń z otchłani: była {JS.S(d.ile)}× · następny los za {mmss(za)} ({JS.S(JS.Round(DLON.szansa * 100))}%)";
        }
    }
}
