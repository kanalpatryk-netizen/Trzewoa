// Port: alpha-1/src/sim/pomnik.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Rytual;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Dziennik;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class CiosDemona { public double kto, x, y; }

    /// <summary>Stan pomnika (sim.lud.pomnik — trafia do zapisu). Faza: 'stoi' | 'rozpada' | 'wychodzi' | 'walka' | 'kona'.</summary>
    public sealed class StanPomnika
    {
        public string faza = "stoi";
        public double od;
        /// <summary>Widoczny stan pękania: 0 — cały, 1–3 — kolejne stany; i od kiedy.</summary>
        public double stan;
        public double stanT;
        /// <summary>Ostatnie uderzenie: kto je zadał i gdzie stał demon.</summary>
        public CiosDemona? cios;
    }

    /// <summary>
    /// WIELKI POMNIK DEMONA (Alpha, etap 5) — modlitwa go kruszy, z gruzów wstaje demon (patrz pomnik.ts).
    /// </summary>
    public static class Pomnik
    {
        public static StanPomnika stanPomnika(Sim sim)
        {
            if (sim.lud.pomnik == null)
            {
                // starszy zapis: w komorze leżą jeszcze kafle rdzenia — teraz stoi tam pomnik
                var w = sim.world;
                for (var y = w.coreY - 4; y <= w.coreY + 4; y++) for (var x = w.coreX - 4; x <= w.coreX + 4; x++) if (w.inb(x, y) && w.tile[w.idx(x, y)] == T.CORE) w.tile[w.idx(x, y)] = T.AIR;
                sim.lud.pomnik = new StanPomnika { faza = "stoi", od = 0, stan = 0, stanT = -1e9 };
            }
            return sim.lud.pomnik;
        }

        /// <summary>Gdzie stoi pomnik: środek u podstawy (x) i rząd kafli tuż nad dnem komory (y).</summary>
        public static XY miejscePomnika(Sim sim)
        {
            var w = sim.world;
            return new XY(w.coreX + 0.5, w.coreY + Math.Floor(RDZEN.komoraY));
        }

        /// <summary>Pomnik pękł do końca (rytuał już nic nie kruszy).</summary>
        public static bool pomnikRozbity(Sim sim) => POMNIK.wlaczony && sim.rytual.pekniecia >= POMNIK.pekniec;

        /// <summary>Demon kona po ostatnim uderzeniu — nie rusza się i nie bije.</summary>
        public static bool demonKona(Sim sim) => sim.lud.pomnik?.faza == "kona";

        /// <summary>Ile stanów pękania przy tylu procentach.</summary>
        public static double stanPekania(double proc)
        {
            double n = 0;
            foreach (var p in POMNIK.stany) if (proc >= p) n++;
            return n;
        }

        static readonly string[] LOG_STANU =
        {
            "",
            "Wielki Pomnik pęka pod modlitwą — po kamiennym demonie biegną pierwsze rysy.",
            "Z pomnika odpadają kawałki kamienia. Coś w środku się porusza.",
            "Przez szczeliny pomnika bije czerwone światło. Demon w środku się budzi.",
        };

        /// <summary>Co tik symulacji (z tikLudu).</summary>
        public static void tikPomnika(Sim sim)
        {
            if (!POMNIK.wlaczony) return;
            var s = stanPomnika(sim);
            var w = sim.world;
            if (s.faza == "stoi")
            {
                var nowy = stanPekania(procentSkorupy(sim));
                if (nowy > s.stan)
                {
                    s.stan = nowy; s.stanT = sim.tick;
                    for (var k = 0; k < 8; k++) sim.spark(w.coreX + 0.5 + sim.rng.range(-3, 3), w.coreY + sim.rng.range(-4, 3), "dust");
                    sim.gdzie(w.coreX + 0.5, w.coreY).log(JS.At(LOG_STANU, nowy) ?? LOG_STANU[3], "otchlan", $"pomnik-{JS.S(nowy)}");
                    zapisz(sim, "rytual", $"pomnik demona — stan pękania {JS.S(nowy)} z {POMNIK.stany.Length}", w.coreX, w.coreY);
                }
                if (pomnikRozbity(sim))
                {
                    s.faza = "rozpada"; s.od = sim.tick; s.stan = POMNIK.stany.Length; s.stanT = sim.tick;
                    sim.gdzie(w.coreX + 0.5, w.coreY).log("Wielki Pomnik rozpada się w gruz. Spod kamienia coś wstaje.", "krew", "pomnik-rozpad");
                    zapisz(sim, "rytual", "pomnik demona rozpada się", w.coreX, w.coreY);
                }
                return;
            }
            var t = sim.tick - s.od;
            if (s.faza == "rozpada" && t >= POMNIK.rozpad) { s.faza = "wychodzi"; s.od = sim.tick; return; }
            if (s.faza == "wychodzi" && t >= POMNIK.wyjscie)
            {
                s.faza = "walka"; s.od = sim.tick;
                zacznijFaleBossa(sim);
                return;
            }
            if (s.faza == "kona" && t >= POMNIK.konanie) koniecDemona(sim, s);
        }

        /// <summary>Ostatnie uderzenie: demon nie pada od razu — kona. True, gdy to był demon.</summary>
        public static bool ostatnieUderzenie(Sim sim, Creature demon, Creature od)
        {
            if (!POMNIK.wlaczony || demon.boss == null) return false;
            var s = stanPomnika(sim);
            if (s.faza == "kona") return true;
            demon.hp = 0;
            s.faza = "kona"; s.od = sim.tick;
            s.cios = new CiosDemona { kto = od.id, x = demon.x, y = demon.y };
            sim.target.delete(demon.id);
            for (var k = 0; k < 10; k++) sim.spark(demon.x + sim.rng.range(-0.8, 0.8), demon.y - sim.rng.range(0, 2.5), "hit");
            sim.gdzie(demon.x, demon.y).log($"{kto(sim, od).Split(new[] { " (" }, StringSplitOptions.None)[0]} zadaje ostatnie uderzenie. Demon z pomnika pęka od środka.", "koniec", "demon-cios");
            zapisz(sim, "rytual", $"ostatnie uderzenie: {kto(sim, od)}", Math.Floor(demon.x), Math.Floor(demon.y));
            return true;
        }

        /// <summary>Demon rozsypał się: znikają Strażnicy, a lud jest wolny — koniec gry.</summary>
        static void koniecDemona(Sim sim, StanPomnika s)
        {
            foreach (var c in zywiStraznicy(sim)) sim.kill(c, c.boss != null ? "pokonany — ostatnie uderzenie" : "rozsypał się razem z demonem", "walka");
            var klan = klanLudu(sim);
            sim.ending = $"uwolnienie:{klan?.name ?? "Lud"}";
            double x = s.cios?.x ?? sim.world.coreX, y = s.cios?.y ?? sim.world.przedsionekY;
            sim.gdzie(x, y).log("Demon z pomnika rozsypał się w pył. Nikt już nie strzeże twojego więzienia — jesteś wolny.", "koniec");
        }

        /// <summary>Narzędzie dewelopera: pomnik od razu w gruz.</summary>
        public static string devRozbijPomnik(Sim sim)
        {
            if (!POMNIK.wlaczony) return "Pomnik wyłączony.";
            var s = stanPomnika(sim);
            if (s.faza != "stoi") return "Pomnik już rozbity.";
            if (sim.lud.straznicy?.trwa == true) return "Trwa fala Strażników — najpierw ją pokonaj.";
            sim.rytual.pekniecia = POMNIK.pekniec;
            foreach (var k in sim.clans) k.rytual = 0;
            double fala = Math.Max(0, Array.FindIndex(STRAZNICY.fale, f => f.boss == true));
            var st = sim.lud.straznicy;
            if (st != null) st.fala = Math.Max(st.fala, fala);
            else sim.lud.straznicy = new StanStraznikow { fala = fala, trwa = false, klan = -1, od = 0 };
            return "Pomnik rozpada się — za chwilę wstanie demon.";
        }
    }
}
