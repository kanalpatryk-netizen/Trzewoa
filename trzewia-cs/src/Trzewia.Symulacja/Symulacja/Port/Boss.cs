// Port: alpha-1/src/sim/boss.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyBoss;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.Pomnik;
using static Trzewia.Symulacja.DlonDemona;
using static Trzewia.Symulacja.Walka;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class KsiegaBossa { public double zasieg, co, rana, cofa, widzi; }

    /// <summary>
    /// Boss ostatniej fali Strażników Snu: `pojaw` — wychodzi na świat, `tik` — krok życia, `przyjmij` — ile z rany przyjmuje.
    /// </summary>
    public sealed class BossDef
    {
        public string id = "";
        public string nazwa = "";
        /// <summary>opis na karcie i w atlasie</summary>
        public string opis = "";
        /// <summary>wielkość rysunku (× zwykła postać)</summary>
        public double rozmiar;
        public Func<Sim, Creature?> pojaw = _ => null;
        public Action<Sim, Creature> tik = (_, __) => { };
        public Func<Sim, Creature, Creature, double, double> przyjmij = (_, __, ___, r) => r;
        /// <summary>ostatnia deska: jak razi go pobożny z księgą</summary>
        public KsiegaBossa ksiega = new KsiegaBossa();
    }

    /// <summary>Bossowie ostatniej fali Strażników Snu (Remake v1, etap 3). Nastawy: nastawy/boss.ts.</summary>
    public static class Boss
    {
        static Typ_SNIACY_KAMIEN K => SNIACY_KAMIEN;

        /// <summary>Ilu wiernych modli się teraz pod rdzeniem (liczy rytuał).</summary>
        static double modlacych(Sim sim) => sim.rytual.wierni;

        static KsiegaBossa ksiegaK() => new KsiegaBossa { zasieg = K.ksiegaZasieg, co = K.ksiegaCo, rana = K.ksiegaRana, cofa = K.ksiegaCofa, widzi = K.ksiegaWidzi };

        static BossDef? sniacyKamien, demon;

        static BossDef SniacyKamien
        {
            get
            {
                if (sniacyKamien != null) return sniacyKamien;
                var b = new BossDef
                {
                    id = "sniacyKamien",
                    nazwa = K.nazwa,
                    opis = "Rani go tylko rycerz. Zasypuje drogę wiernych. Słabnie, gdy pod rdzeniem modli się trzech pobożnych — bez modlitwy się zrasta.",
                    rozmiar = K.rozmiar,
                    ksiega = ksiegaK(),
                    przyjmij = przyjmijKamienny,
                };
                b.pojaw = sim =>
                {
                    var w = sim.world;
                    var straz = sim.creatures.FirstOrDefault(o => !o.dead && walczacy(o) && JS.Hypot(o.x - w.coreX, o.y - w.przedsionekY) < STRAZNICY.limitOdRdzenia + STRAZNICY.ucieczkaZapas);
                    double strona = straz != null ? (straz.x < w.coreX + 0.5 ? -1 : 1) : sim.rng.chance(0.5) ? -1 : 1;
                    var c = nowyStraznik(sim, w.coreX + strona * (STRAZNICY.pojawOd + 2), w.przedsionekY - 1, K.hp);
                    if (c == null) return null;
                    c.boss = "sniacyKamien";
                    c.zamiar = b.opis;
                    c.zasypT = sim.tick;
                    sim.efekt(c.x, c.y, "cud");
                    return c;
                };
                b.tik = (sim, c) => tikKamienny(sim, c, K.hp, K.sila, K.ciosCo, K.zasieg, K.szybkosc);
                return sniacyKamien = b;
            }
        }

        static BossDef Demon
        {
            get
            {
                if (demon != null) return demon;
                var b = new BossDef
                {
                    id = "demon",
                    nazwa = DEMON.nazwa,
                    opis = "Spał w Wielkim Pomniku. Rani go tylko rycerz. Zasypuje drogę wiernych. Słabnie, gdy pobożni się modlą — bez modlitwy się zrasta. Gdy padnie, jesteś wolny.",
                    rozmiar = DEMON.rozmiar,
                    ksiega = ksiegaK(),
                    przyjmij = przyjmijKamienny,
                };
                b.pojaw = sim =>
                {
                    var m = miejscePomnika(sim);
                    var c = nowyStraznik(sim, Math.Floor(m.x), m.y, DEMON.hp);
                    if (c == null) return null;
                    c.x = m.x;
                    c.boss = "demon";
                    c.zamiar = b.opis;
                    c.zasypT = sim.tick;
                    c.face = 1;
                    return c;
                };
                b.tik = (sim, c) =>
                {
                    if (demonKona(sim)) return;
                    // Alpha 1 (6.11): walczy ruchami (sim/walka.ts)
                    tikDemona(sim, c, zasypDroge);
                    // etap 5b: za ścianą gruzu po zawale — nie przechodzi na drugą stronę i zrasta się szybciej
                    var sc = scianaGruzu(sim);
                    if (sc != null)
                    {
                        double lewa = sc.x - 0.7, prawa = sc.x + DLON.demon.zawal.szer + 0.7;
                        if (c.x < (lewa + prawa) / 2) c.x = Math.Min(c.x, lewa); else c.x = Math.Max(c.x, prawa);
                        c.hp = Math.Min(c.hpMax ?? DEMON.hp, c.hp + K.zrastanie * (DLON.demon.zawal.zrastanie - 1));
                    }
                };
                return demon = b;
            }
        }

        /// <summary>Krok bossa z kamienia: zrasta się bez modlitwy, zasypuje drogę, idzie i bije.</summary>
        static void tikKamienny(Sim sim, Creature c, double hp, double sila, double ciosCo, double zasieg, double szybkosc)
        {
            if (modlacych(sim) < K.modlitwaWiernych) c.hp = Math.Min(c.hpMax ?? hp, c.hp + K.zrastanie);
            if (sim.tick - (c.zasypT ?? 0) >= K.zasypCo) { c.zasypT = sim.tick; zasypDroge(sim, c); }
            var cel = sim.creatureById(sim.target.getOr(c.id, -1));
            if (cel == null || cel.dead || sim.tick % 90 == 0)
            {
                cel = celStraznika(sim, c, STRAZNICY.limitOdRdzenia);
                if (cel != null) sim.target.set(c.id, cel.id); else sim.target.delete(c.id);
            }
            var w = sim.world;
            if (cel == null) { ruchStraznika(sim, c, w.coreX + 0.5, w.przedsionekY - 2, szybkosc, STRAZNICY.limitOdRdzenia); return; }
            if (cel.wDloni == true || cel.lot != null) { c.face = cel.x > c.x ? 1 : -1; return; }
            if (JS.Hypot(cel.x - c.x, cel.y - c.y) > zasieg) { ruchStraznika(sim, c, cel.x, cel.y - 0.5, szybkosc, STRAZNICY.limitOdRdzenia); return; }
            c.face = cel.x > c.x ? 1 : -1;
            if (sim.tick - (c.ciosT ?? -1e9) < ciosCo) return;
            c.ciosT = sim.tick;
            ciosStraznika(sim, c, cel, sila);
        }

        static double przyjmijKamienny(Sim sim, Creature _c, Creature od, double rana)
        {
            if (K.tylkoRycerze && !walczacy(od) && !(rolaPostaci(od) == "pobozny" && trybWiernych(sim))) return 0;
            return modlacych(sim) >= K.modlitwaWiernych ? rana * K.modlitwaRany : rana;
        }

        /// <summary>Uderzenie w ziemię: kawałek drogi wiernych znów jest skałą (bez zamurowania kogokolwiek).</summary>
        public static void zasypDroge(Sim sim, Creature c)
        {
            var plan = sim.planDrogi;
            var w = sim.world;
            if (plan == null || sim.rytual.otwarta) return;
            var zajete = new HashSet<double>();
            foreach (var o in sim.creatures) if (!o.dead) zajete.Add(w.idx(Math.Floor(o.x), Math.Floor(o.y)));
            var kandydaci = plan.sciezka.Where(i =>
            {
                double x = i % w.w, y = JS.ToInt32(i / w.w);
                return w.passable(x, y) && !zajete.Contains(i) && JS.Hypot(x - w.coreX, y - w.przedsionekY) <= K.zasypZasieg
                    && JS.Hypot(x - w.coreX, y - w.przedsionekY) > 8;     // nie w samym przedsionku
            }).ToList();
            if (kandydaci.Count == 0) return;
            var start = sim.rng.@int(kandydaci.Count);
            var ile = 0;
            for (var k = 0; k < K.zasypKafli && start + k < kandydaci.Count; k++)
            {
                var i = kandydaci[start + k];
                w.tile[i] = T.ROCK;
                ile++;
            }
            if (ile == 0) return;
            var i0 = kandydaci[start];
            sim.efekt(c.x, c.y, "cud");
            sim.gdzie(i0 % w.w, JS.ToInt32(i0 / w.w)).log($"{K.nazwa} uderza w ziemię — zasypał kawałek drogi wiernych. Robotnicy muszą ją odkopać.", "swiat", "boss-zasyp");
        }

        public static BossDef bossowie(string id) => id == "demon" ? Demon : SniacyKamien;

        /// <summary>Boss ostatniej fali.</summary>
        public static BossDef aktywnyBoss() => bossowie(AKTYWNY_BOSS);
    }
}
