// Port: alpha-1/src/sim/aniol.ts
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyAniol;
using static Trzewia.Nastawy.NastawyGora;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.Kruszce;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.Stworzenia;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Stan dłoni anielskiej (sim.lud.aniol — trafia do zapisu). Faza: 'brak' | 'swiatlo' | 'schodzi' | 'dar' | 'wraca'.</summary>
    public sealed class StanAniola
    {
        public string faza = "brak";
        public double od;
        public double losT;
        public double ciszaDo;
        public double ile;
        /// <summary>Co niesie ('podkop' | 'ludzie' | 'krew') i gdzie (kafle).</summary>
        public string? dar;
        public double x, y;
        /// <summary>Podkop: kafle drogi do wykruszenia (po kolei) i ile już wykruszyła.</summary>
        public List<double>? kafle;
        public double? wykute;
        /// <summary>Dar ludzi: id postawionego robotnika. Dar krwi: ile już wlała.</summary>
        public double? nowy;
        public double? krewDana;
        /// <summary>Ktoś ją już widział — atlas ma tablicę.</summary>
        public bool? widziana;
    }

    /// <summary>
    /// DŁOŃ ANIELSKA (Alpha, etap 4) — losowy dar: podkop drogi wiernych, nowy robotnik albo krew (patrz aniol.ts).
    /// </summary>
    public static class Aniol
    {
        sealed class MozliwyDar { public string dar = ""; public double x, y; public List<double>? kafle; }

        static double DLUGOSC(string f) => f switch { "swiatlo" => ANIOL.swiatlo, "schodzi" => ANIOL.schodzi, "dar" => ANIOL.dar, "wraca" => ANIOL.wraca, _ => double.NaN };
        static string NASTEPNA(string f) => f switch { "swiatlo" => "schodzi", "schodzi" => "dar", "dar" => "wraca", _ => "brak" };

        static StanAniola stan(Sim sim) => sim.lud.aniol ??= new StanAniola { faza = "brak", od = 0, losT = ANIOL.pierwszaPo, ciszaDo = 0, ile = 0, x = 0, y = 0 };

        /// <summary>Które dary mają teraz sens, z miejscem, gdzie dłoń zejdzie.</summary>
        static List<MozliwyDar> mozliweDary(Sim sim)
        {
            var w = sim.world;
            var @out = new List<MozliwyDar>();
            var P = ANIOL.dary.podkop;
            var kafle = nieWykopane(sim).Where(i => w.tile[i] != T.CORE).Take((int)(P.kafli ?? 0)).ToList();
            if (kafle.Count >= (P.najmniej ?? double.NaN)) @out.Add(new MozliwyDar { dar = "podkop", x = kafle[0] % w.w, y = JS.ToInt32(kafle[0] / w.w), kafle = kafle });
            var o = w.oltarz;
            double ludu = 0;
            foreach (var c in sim.creatures) if (!c.dead && rolaPostaci(c) != null) ludu++;
            if (klanLudu(sim) != null && ludu < (ANIOL.dary.ludzie.maksLudu ?? double.NaN))
            {
                var m = podloga(sim, o.x + (sim.rng.next() < 0.5 ? -3 : 3), o.y, 4);
                if (m != null) @out.Add(new MozliwyDar { dar = "ludzie", x = m.Value.x, y = m.Value.y });
            }
            if (sim.krew < GORA.krewMax * (ANIOL.dary.krew.niePonad ?? double.NaN)) @out.Add(new MozliwyDar { dar = "krew", x = o.x, y = o.y - 2 });
            return @out;
        }

        static void zacznij(Sim sim, StanAniola s, MozliwyDar m)
        {
            s.faza = "swiatlo"; s.od = sim.tick;
            s.dar = m.dar; s.x = m.x; s.y = m.y;
            s.kafle = m.kafle; s.wykute = 0; s.nowy = null; s.krewDana = 0;
            s.widziana = true;
            sim.gdzie(m.x + 0.5, m.y).log("Z góry, przez skałę, sączy się złote światło. Schodzi w nim jasna dłoń.", "wiara", "aniol");
            zapisz(sim, "swiat", $"Dłoń anielska: {DAR[m.dar].nazwa} → ({JS.S(m.x)}, {JS.S(m.y)})", m.x, m.y);
        }

        static double waga(string dar) => dar switch { "podkop" => ANIOL.dary.podkop.waga, "ludzie" => ANIOL.dary.ludzie.waga, _ => ANIOL.dary.krew.waga };

        /// <summary>Co tik symulacji (sam pilnuje rytmu).</summary>
        public static void tikAniola(Sim sim)
        {
            if (!ANIOL.wlaczona || sim.ending != null) return;
            var s = stan(sim);
            if (s.faza == "brak")
            {
                if (sim.spokojnySwiat || sim.tick < s.losT) return;
                s.losT = sim.tick + ANIOL.losujCo;
                if (sim.tick < s.ciszaDo || s.ile >= ANIOL.maxNaPartie || sim.rng.next() >= ANIOL.szansa) return;
                var dary = mozliweDary(sim);
                if (dary.Count == 0) return;
                double suma = 0;
                foreach (var d in dary) suma += waga(d.dar);
                var r = sim.rng.next() * suma;
                MozliwyDar? m = null;
                foreach (var d in dary) { r -= waga(d.dar); if (r < 0) { m = d; break; } }
                zacznij(sim, s, m ?? dary[0]);
                return;
            }
            var t = sim.tick - s.od;
            if (s.faza == "dar") darTik(sim, s, t);
            var faza = s.faza;
            if (t < DLUGOSC(faza)) return;
            if (faza == "dar") koniecDaru(sim, s);
            s.faza = NASTEPNA(faza);
            s.od = sim.tick;
            if (s.faza == "brak") { s.ile++; s.ciszaDo = sim.tick + ANIOL.przerwa; }
        }

        /// <summary>W czasie gestu: podkop kruszy kafel po kaflu, krew spływa porcjami, robotnik staje w połowie.</summary>
        static void darTik(Sim sim, StanAniola s, double t)
        {
            var w = sim.world;
            if (s.dar == "podkop" && s.kafle != null && s.kafle.Count > 0)
            {
                var ile = Math.Min(s.kafle.Count, Math.Floor(Math.Max(0, t - ANIOL.dar * 0.2) / (ANIOL.dar * 0.75 / s.kafle.Count)));
                while ((s.wykute ?? 0) < ile)
                {
                    var i = s.kafle[(int)(s.wykute ?? 0)];
                    s.wykute = (s.wykute ?? 0) + 1;
                    double x = i % w.w, y = JS.ToInt32(i / w.w);
                    s.x = x; s.y = y;
                    var k = w.tile[i];
                    if (!w.solid(x, y) || w.hardness(x, y) <= 0 || k == T.CORE) continue;
                    w.set(x, y, T.AIR);
                    w.kucie.delete(i);
                    sim.dug++;
                    wykutyKafel(sim, k, x, y);
                    for (var n = 0; n < 4; n++) sim.spark(x + 0.5 + sim.rng.range(-0.4, 0.4), y + 0.5, "dust");
                }
            }
            else if (s.dar == "krew")
            {
                var cel = JS.Round((ANIOL.dary.krew.ile ?? double.NaN) * Math.Min(1, t / (ANIOL.dar * 0.85)));
                var dolej = cel - (s.krewDana ?? 0);
                if (dolej > 0) { sim.krew = Math.Min(GORA.krewMax, sim.krew + dolej); s.krewDana = cel; }
            }
            else if (s.dar == "ludzie" && s.nowy == null && t >= ANIOL.dar * 0.55)
            {
                var klan = klanLudu(sim);
                if (klan == null) return;
                var c = makeCreature(Race.GOBLIN, klan.id, s.x + 0.5, s.y, sim.nextId++);
                sim.creatures.Add(c);
                sim.byId.set(c.id, c);
                klan.pop++;
                klan.dead = false;
                nadajRole(sim, c, "robotnik");
                c.hunger = 0.15;
                c.devotion = Math.Max(c.devotion, 0.8);
                c.od = sim.tick;
                c.face = s.x < w.oltarz.x ? 1 : -1;
                s.nowy = c.id;
                zapisz(sim, "narodziny", $"{kto(sim, c)} — dar dłoni anielskiej", c.x, c.y);
            }
        }

        static void koniecDaru(Sim sim, StanAniola s)
        {
            sim.stat.darow = sim.stat.darow + 1;
            var txt = s.dar == "podkop" ? $"Dłoń anielska wykruszyła palcami {JS.S(s.wykute ?? 0)} kafli drogi wiernych."
                : s.dar == "ludzie" ? "Dłoń anielska postawiła przy ołtarzu nowego robotnika."
                : $"Z dłoni anielskiej spłynęło do relikwiarza {JS.S(s.krewDana ?? 0)} krwi.";
            sim.gdzie(s.x + 0.5, s.y).log(txt, "wiara", "aniol-dar");
        }

        /// <summary>Narzędzie dewelopera: dłoń anielska od razu (`dar` — który, inaczej losowy z możliwych).</summary>
        public static string devAniol(Sim sim, string? dar = null)
        {
            var s = stan(sim);
            if (s.faza != "brak") return "Dłoń anielska już tu jest.";
            var dary = mozliweDary(sim).Where(d => dar == null || d.dar == dar).ToList();
            if (dary.Count == 0) return dar != null ? $"Dar „{DAR[dar].nazwa}” nie ma teraz sensu." : "Żaden dar nie ma teraz sensu.";
            var m = dary[(int)Math.Floor(sim.rng.next() * dary.Count)];
            zacznij(sim, s, m);
            return $"Dłoń anielska schodzi: {DAR[m.dar].nazwa}.";
        }
    }
}
