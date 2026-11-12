// Port: alpha-1/src/sim/zbroja.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyZbroja;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.Pomieszczenia;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>
    /// ZBROJA RYCERZA (Alpha, etap 3f) — kuźnia wykuwa części, rycerz zakłada je z wieszaka (patrz zbroja.ts).
    /// </summary>
    public static class Zbroja
    {
        /// <summary>Wykute części, których nikt nie nosi — wiszą na wieszaku w kuźni.</summary>
        public static List<string> naWieszaku(Sim sim)
        {
            var noszone = new HashSet<string>();
            foreach (var c in sim.creatures) if (c.zbroja != null) foreach (var z in c.zbroja) noszone.Add(z);
            return sim.zbroja.Where(id => !noszone.Contains(id)).ToList();
        }

        /// <summary>Czy postać nosi tę część zbroi.</summary>
        public static bool nosi(Creature c, string cz) => c.zbroja?.Contains(cz) == true;

        /// <summary>Mnożnik życia, siły albo szybkości od zbroi, którą rycerz nosi.</summary>
        public static double mnoznikZbroi(Creature c, string co)
        {
            if (c.zbroja == null || c.zbroja.Count == 0 || (co != "hp" && co != "sila" && co != "szybkosc")) return 1;
            double v = 1;
            foreach (var z in c.zbroja) v *= ZBROJA.premie[z]?[co] ?? 1;
            return v;
        }

        /// <summary>Ile zostaje z rany (tarcza zmniejsza ciosy).</summary>
        public static double ranyZbroi(Creature c) => nosi(c, "tarcza") ? ZBROJA.premie.tarcza.rany ?? 1 : 1;

        /// <summary>Miejsce rycerza w kuźni: pod wieszakiem, twarzą do wieszaka i kowadła.</summary>
        public static (double x, double y, double kier) miejscePodWieszakiem(Pomieszczenie pom)
        {
            var (x, y, _) = miejsceWPom(pom, 2);
            return (x, y, -1);
        }

        /// <summary>Najbliższa gotowa kuźnia (w linii prostej).</summary>
        static Pomieszczenie? najblizszaKuznia(Sim sim, Creature c)
        {
            Pomieszczenie? best = null; var bd = double.PositiveInfinity;
            foreach (var p in sim.pomieszczenia)
            {
                if (!p.gotowe || p.rodzaj != "kuznia") continue;
                var d = JS.Hypot(p.x + p.w / 2 - c.x, p.y + p.h / 2 - c.y);
                if (d < bd) { bd = d; best = p; }
            }
            return best;
        }

        /// <summary>Czy rycerz pójdzie sam po zbroję.</summary>
        public static bool idziePoZbroje(Sim sim, Creature c)
        {
            if (rolaPostaci(c) != "rycerz" || c.polecenie != null || c.hunger >= ZBROJA.glodDo || sim.tick < (c.zbrojaBezDo ?? 0)) return false;
            return naWieszaku(sim).Count > 0 && najblizszaKuznia(sim, c) != null;
        }

        /// <summary>Rycerz idzie do kuźni i zakłada części z wieszaka: 'zaklada' | 'idzie' | 'nic' | 'nie dojdzie'.</summary>
        public static string planZbroi(Sim sim, Creature c, double? pomId, NaDrogeF naDroge, ZamiarF zamiar, DrogaF droga, PodrozF podroz)
        {
            var czesci = naWieszaku(sim);
            var pom = pomId != null ? pomieszczenieId(sim, pomId) : najblizszaKuznia(sim, c);
            if (czesci.Count == 0 || pom == null || !pom.gotowe || pom.rodzaj != "kuznia") { c.doKuzni = null; c.zakladanie = 0; return "nic"; }
            var (mx, my, kier) = miejscePodWieszakiem(pom);
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            var cz = CZESC[czesci[0]];
            c.doKuzni = pom.id;
            var tutaj = cx == mx && cy == my && stoi(sim, cx, cy);
            var dTam = tutaj || budzetDrog() <= 0 ? null : droga((x, y) => x == mx && y == my && stoi(sim, x, y), ZBROJA.szukanieDrogi);
            if (tutaj || (dTam == null && Math.Abs(cx - mx) <= 1 && cy == my && stoi(sim, cx, cy)))
            {
                c.jx = cx; c.jy = cy; c.droga = null;
                c.face = kier;
                c.czynnosc = "zaklada";
                zamiar($"zakłada {cz.biernik} z wieszaka w kuźni", Job.STOI, Math.Max(30, ZBROJA.zakladanieTikow - (c.zakladanie ?? 0) + 1));
                return "zaklada";
            }
            c.zakladanie = 0;
            if (budzetDrog() <= 0) { zamiar("zastanawia się, którędy iść", Job.STOI, 30); return "idzie"; }
            var d = dTam ?? droga((x, y) => Math.Abs(x - mx) <= 1 && y == my && stoi(sim, x, y), ZBROJA.szukanieDrogi);
            if (d != null)
            {
                naDroge(d, mx, my);
                zamiar($"idzie do kuźni — na wieszaku czeka {(czesci.Count > 1 ? $"{czesci.Count} części zbroi" : cz.nazwa)}", Job.WANDER, podroz(d) + 60);
                return "idzie";
            }
            c.doKuzni = null;
            return "nie dojdzie";
        }

        /// <summary>Co tik: kto stoi pod wieszakiem i zakłada — po chwili część jest na nim.</summary>
        public static void tikZbroi(Sim sim)
        {
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.czynnosc != "zaklada" || c.doKuzni == null || c.job != Job.STOI) continue;
                var pom = pomieszczenieId(sim, c.doKuzni);
                var czesci = naWieszaku(sim);
                if (pom == null || czesci.Count == 0) { koniec(sim, c); continue; }
                var (mx, my, _) = miejscePodWieszakiem(pom);
                if (Math.Abs(Math.Floor(c.x) - mx) > 1 || Math.Floor(c.y) != my) continue;
                c.zakladanie = (c.zakladanie ?? 0) + 1;
                if (c.zakladanie < ZBROJA.zakladanieTikow) continue;
                c.zakladanie = 0;
                zaloz(sim, c, czesci[0], pom);
                if (czesci.Count == 1) koniec(sim, c);
                else c.jt = 0;   // następna część — planer od razu ustawi nowy zamiar
            }
        }

        /// <summary>Część z wieszaka trafia na rycerza: życie rośnie o tyle, o ile urosło największe życie.</summary>
        static void zaloz(Sim sim, Creature c, string cz, Pomieszczenie pom)
        {
            var przed = maxHp(sim, c);
            (c.zbroja ??= new List<string>()).Add(cz);
            var po = maxHp(sim, c);
            if (po > przed) c.hp = Math.Min(po, c.hp + (po - przed));
            var (mx, my, _) = miejscePodWieszakiem(pom);
            zdarzenie(sim, new ZdarzeniePom { rodzaj = "zbroja", kto = c.id, czesc = cz, x = mx + 0.1, y = my - 1.55, tik = sim.tick });
            var C = CZESC[cz];
            sim.gdzie(mx, my).log($"Rycerz założył {C.biernik} — {C.skutek}.", "swiat", $"zbroja-{JS.S(c.id)}-{cz}");
            zapisz(sim, "praca", $"{kto(sim, c)}: zakłada {C.biernik} ({C.skutek})", mx, my);
        }

        /// <summary>Wszystko założone (albo nic już nie wisi) — rozkaz do kuźni się kończy.</summary>
        static void koniec(Sim sim, Creature c)
        {
            c.czynnosc = null; c.doKuzni = null; c.zakladanie = 0;
            if (c.polecenie?.typ == "zbroja") c.polecenie = null;
            c.jt = 0; c.zamiarDo = sim.tick;
        }

        /// <summary>Wiersz na karcie postaci: co nosi i co mu to daje.</summary>
        public static string? opisZbroi(Creature c)
        {
            if (c.zbroja == null || c.zbroja.Count == 0) return null;
            return string.Join(", ", c.zbroja.Select(z => $"{CZESC[z].nazwa}: {CZESC[z].skutek}"));
        }
    }
}
