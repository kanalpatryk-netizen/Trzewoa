// Port: alpha-1/src/sim/lina-wiadra.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyWiadro;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Wiadro;
using static Trzewia.Symulacja.Dziennik;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class MiejsceCiecia { public double x, y, dno; public bool czeka; }

    /// <summary>
    /// PRZECIĘTA LINA WIADRA (Alpha, etap 4) — dłoń z otchłani przecina linę; „napraw linę” posyła kogoś, żeby ją skleił.
    /// </summary>
    public static class LinaWiadra
    {
        /// <summary>Przecięta lina albo null (cała).</summary>
        public static LinaPrzecieta? linaPrzecieta(Sim sim) => sim.lud.wiadra?.przecieta;

        /// <summary>Kto teraz skleja linę (wisi na niej) — albo null.</summary>
        public static Creature? sklejajacy(Sim sim)
        {
            var lp = linaPrzecieta(sim);
            if (lp == null || lp.naprawia == null) return null;
            var c = sim.creatureById(lp.naprawia.Value);
            if (c == null || c.dead || c.naprawia == null) { lp.naprawia = null; return null; }
            return c;
        }

        /// <summary>Gdzie dłoń przetnie linę teraz — tuż nad wiadrem, w sali — albo null.</summary>
        public static MiejsceCiecia? miejsceCiecia(Sim sim)
        {
            var st = sim.lud.wiadra;
            if (st == null || st.przecieta != null) return null;
            var wd = st.lista.FirstOrDefault(w => w.faza == "zapowiedz" || w.faza == "zjezdza" || w.faza == "stoi");
            if (wd == null) return null;
            var strop = sim.world.szybWiadraDol + 1;
            var nadWiadrem = wd.faza == "zapowiedz" ? strop : wd.y - 0.9;
            var y = Math.Max(strop + 0.4, Math.Min(wd.cel - 0.9, nadWiadrem));
            return new MiejsceCiecia { x = wd.x, y = y, dno = wd.cel, czeka = nadWiadrem < y - 0.05 };
        }

        /// <summary>Pazur przeciął linę na wysokości `y`: wiadro w drodze spada, stojące zostaje, nic więcej nie zjedzie.</summary>
        public static bool przetnijLine(Sim sim, double y)
        {
            var st = stanWiader(sim);
            var m = miejsceCiecia(sim);
            if (st.przecieta != null || m == null || m.czeka) return false;
            foreach (var wd in st.lista)
            {
                if (wd.faza == "zapowiedz") { wd.faza = "odjezdza"; wd.od = sim.tick - WIADRO.odjazd; continue; }
                if (wd.faza == "zjezdza" || wd.faza == "odjezdza") { wd.v = wd.faza == "zjezdza" ? wd.v : 0; wd.faza = "spada"; wd.od = sim.tick; }
            }
            st.przecieta = new LinaPrzecieta { od = sim.tick, x = m.x, koniec = m.dno + 1 - WIADRO.naprawa.koniecNadDnem, dno = m.dno, ciecie = y };
            st.ciec = (st.ciec ?? 0) + 1;
            for (var k = 0; k < 6; k++) sim.spark(m.x + 0.5, y, "hit");
            sim.gdzie(m.x, y).log("Dłoń z otchłani przecięła linę wiadra. Z góry nic nie zjedzie, póki ktoś jej nie sklei — „napraw linę”.", "krew", "lina-przecieta");
            zapisz(sim, "swiat", $"lina wiadra przecięta na wysokości {JS.ToFixed(y, 1)}", m.x, JS.Round(y));
            return true;
        }

        /// <summary>Przerywa sklejanie (rozkaz odwołany, ktoś inny przejął): wiszący zsuwa się na dno.</summary>
        public static void przerwijNaprawe(Sim sim, Creature c)
        {
            var n = c.naprawia;
            if (n == null) return;
            if (n.faza != "schodzi") { n.faza = "schodzi"; n.od = sim.tick; }
            var lp = linaPrzecieta(sim);
            if (lp?.naprawia == c.id) lp.naprawia = null;
            c.czynnosc = null;
        }

        /// <summary>Stanął pod zwisającym końcem — chwyta go i zaczyna się wspinać (dalej krokNaprawy).</summary>
        public static bool zacznijNaprawe(Sim sim, Creature c)
        {
            var lp = linaPrzecieta(sim);
            if (lp == null || (sklejajacy(sim) != null && lp.naprawia != c.id)) return false;
            lp.naprawia = c.id;
            c.naprawia = new Naprawa { faza = "wspina", od = sim.tick, x = lp.x, dno = lp.dno };
            c.droga = null; c.jx = lp.x; c.jy = lp.dno;
            c.zamiar = "chwyta zwisający koniec liny i wspina się po nim"; c.zamiarDo = sim.tick + 240;
            zapisz(sim, "praca", $"{kto(sim, c)}: chwyta przeciętą linę wiadra", lp.x, lp.dno);
            return true;
        }

        /// <summary>Ruch przy naprawie: wspina się, wisi i skleja, a gdy lina się napnie — zsuwa się na dno. False — skończył.</summary>
        public static bool krokNaprawy(Sim sim, Creature c)
        {
            var n = c.naprawia;
            if (n == null) return false;
            var N = WIADRO.naprawa;
            var lp = linaPrzecieta(sim);
            bool koniec() { c.naprawia = null; c.czynnosc = null; c.jt = 0; c.droga = null; c.zamiarDo = sim.tick; return false; }
            // lina już cała (skleił ją ktoś inny) albo zniknęła — puszcza i schodzi
            if (lp == null && n.faza != "schodzi") { n.faza = "schodzi"; n.od = sim.tick; }
            var bx = n.x + 0.5;
            c.vy = 0; c.droga = null;
            if (Math.Abs(c.x - bx) > 0.02) c.x += JS.Sign(bx - c.x) * Math.Min(Math.Abs(bx - c.x), 0.05);
            if (n.faza == "wspina")
            {
                var cel = n.dno - N.wspinaczka;
                if (c.y > cel)
                {
                    c.y = Math.Max(cel, c.y - N.wspinaczkaV);
                    c.wspina = sim.tick;
                    c.face = JS.Tak(c.id % 2) ? 1 : -1;
                    c.zamiar = "wspina się po zwisającej linie wiadra"; c.zamiarDo = sim.tick + 120;
                    return true;
                }
                n.faza = "skleja"; n.od = sim.tick;
            }
            if (n.faza == "skleja")
            {
                c.czynnosc = "skleja";
                c.zamiar = "wisi na linie i skleja ją — owija i wiąże oba kawałki";
                c.zamiarDo = n.od + N.sklejanie;
                if (sim.tick - n.od < N.sklejanie) return true;
                naprawiona(sim, c);
                n.faza = "schodzi"; n.od = sim.tick;
            }
            // schodzi: zsuwa się po napiętej linie na dno
            c.czynnosc = null;
            if (c.y < n.dno)
            {
                c.y = Math.Min(n.dno, c.y + N.zjazdV);
                c.wspina = sim.tick;
                c.zamiar = "zsuwa się po linie na dno"; c.zamiarDo = sim.tick + 60;
                return true;
            }
            return koniec();
        }

        /// <summary>Lina sklejona: napina się, a z góry od razu zjeżdża wiadro.</summary>
        static void naprawiona(Sim sim, Creature c)
        {
            var st = stanWiader(sim);
            var lp = st.przecieta;
            if (lp == null) return;
            st.przecieta = null;
            st.naprawionaT = sim.tick;
            if (c.polecenie?.typ == "naprawa") c.polecenie = null;
            poNaprawie(sim);
            sim.stat.naprawLin = sim.stat.naprawLin + 1;
            var r = rolaPostaci(c);
            sim.gdzie(lp.x, lp.dno).log($"{(r != null ? kto(sim, c).Split(new[] { " (" }, StringSplitOptions.None)[0] : "Ktoś")} skleił linę wiadra — napina się, a z góry już zjeżdża jedzenie.", "swiat", "lina-naprawiona");
            zapisz(sim, "praca", $"{kto(sim, c)}: lina wiadra sklejona", lp.x, lp.dno);
        }
    }
}
