// Port: alpha-1/src/sim/creatures.ts — część 6: doWander … idzPlanem
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyStworzenia;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyWiadro;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Brama;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.Wiadro;
using static Trzewia.Symulacja.Zabytki;
using static Trzewia.Symulacja.Pomieszczenia;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static partial class Stworzenia
    {
        static void doWander(Sim sim, Creature c)
        {
            // Remake v1: lud nie kopie na spacerze — chyba że zbłąkany wraca w stronę siedziby
            if (REMAKE && rolaPostaci(c) != null && c.carry == 0 && c.hunger > LUD.glodSam && (sim.tick + c.id) % 60 == 0) { c.jt = 0; return; }
            // (na przełaj kuje tylko ten, kto się przekopuje — z rozkazu albo z odciętej kieszeni)
            if (REMAKE && rolaPostaci(c) != null)
            {
                idz(sim, c, c.jx, c.jy, c.zamiar?.StartsWith("wkopuje", StringComparison.Ordinal) == true || c.zamiar?.StartsWith("przekopuje", StringComparison.Ordinal) == true);
                return;
            }
            walkTo(sim, c, c.jx, c.jy, sim.rng.chance(K.spacerKopie));
        }

        /// <summary>Remake v1: miejsce pobożnego w szeregu pod rdzeniem — co dwa kafle, żeby nie stali jeden na drugim.</summary>
        public static double miejsceWSzeregu(Sim sim, Creature c) => sim.world.coreX + ((c.id % 5) - 2) * 2;

        /// <summary>Remake v1: droga do rdzenia wciąż się kopie, a pielgrzym nie jest jeszcze blisko przedsionka.</summary>
        static bool drogaNiegotowa(Sim sim, Creature c)
        {
            if (czoloDrogi(sim) < 0) return false;
            var w = sim.world;
            return JS.Hypot(c.x - w.coreX, c.y - w.przedsionekY) > LUD.strefaRdzenia;
        }

        /// <summary>Remake v1: czy któryś pobożny jest w drodze pod rdzeń albo czeka na nią.</summary>
        static bool wyprawaTrwa(Sim sim)
        {
            foreach (var o in sim.creatures) if (!o.dead && (o.wyprawa == true || o.job == Job.PIELGRZYM)) return true;
            return false;
        }

        /// <summary>Remake v1: czy ktoś z ludu modli się już pod rdzeniem (wtedy rycerze stają na warcie).</summary>
        static bool wartaPotrzebna(Sim sim)
        {
            var w = sim.world;
            foreach (var o in sim.creatures)
            {
                if (o.dead || o.job != Job.PIELGRZYM) continue;
                if (Math.Abs(o.x - w.coreX) < P.przedsionekX + 4 && Math.Abs(o.y - w.przedsionekY) < P.przedsionekY + 4) return true;
            }
            return false;
        }

        /// <summary>Remake v1: najbliższy głodny pobożny albo rycerz, któremu nikt jeszcze nie niesie jedzenia.</summary>
        static Creature? glodnyDoNakarmienia(Sim sim, Creature c)
        {
            var obslugiwani = new HashSet<double>();
            foreach (var o in sim.creatures) if (!o.dead && o.id != c.id && o.dostawaDla != null) obslugiwani.Add(o.dostawaDla.Value);
            Creature? best = null; var bd = double.PositiveInfinity;
            foreach (var o in sim.creatures)
            {
                // stacjonujący — i kopacze drogi daleko od spiżarni
                var kopaczDaleko = false;
                if (o.kopieDroge == true)
                {
                    var s0 = najblizszaSpizarnia(sim, o.x, o.y, false);
                    kopaczDaleko = s0 != null && JS.Hypot(najblizszaSpizarnia(sim, o.x, o.y, false)!.x - o.x, najblizszaSpizarnia(sim, o.x, o.y, false)!.y - o.y) > LUD.daleko;
                }
                if (o.dead || o.clan != c.clan || !(stacjonuje(o) || kopaczDaleko) || obslugiwani.Contains(o.id)) continue;
                // 6.11: za zamkniętą kratą — póki w koszu przy kracie leży jedzenie, nikt nie niesie więcej
                if (zaKrata(sim, o) && (sim.lud.brama?.kosz ?? 0) >= 2) continue;
                var spO = najblizszaSpizarnia(sim, o.x, o.y, true);
                var prog = spO == null || JS.Hypot(spO.x - o.x, spO.y - o.y) > LUD.daleko ? LUD.glodDostawyDaleko : LUD.glodDostawy;
                if (o.hunger < prog) continue;
                var d = JS.Hypot(o.x - c.x, o.y - c.y);
                if (d < bd) { bd = d; best = o; }
            }
            return best;
        }

        /// <summary>Remake v1: czy ktoś stacjonujący bardzo głoduje, a nikt mu nie niesie jedzenia.</summary>
        static bool pilnieGlodny(Sim sim, Creature c)
        {
            var g = glodnyDoNakarmienia(sim, c);
            return g != null && g.hunger > LUD.glodPilny;
        }

        /// <summary>Remake v1: robotnik niesie jedzenie głodnemu — idzie za nim, karmi z ręki, resztę odnosi.</summary>
        static void doDostawa(Sim sim, Creature c)
        {
            var komu = c.dostawaDla != null ? sim.creatureById(c.dostawaDla.Value) : null;
            if (komu == null || komu.dead || c.carry <= 0) { c.jt = 0; return; }
            // 6.11: głodny jest za zamkniętą kratą lochu — porcje idą pod kratę i przez pręty do kosza
            if (zaKrata(sim, komu))
            {
                var pk = podKrata(sim);
                if (Math.Floor(c.x) == pk.x && Math.Floor(c.y) == pk.y)
                {
                    podajPrzezKrate(sim, c);
                    c.dostawaDla = null; c.jt = 0;
                    return;
                }
                if (c.jx != pk.x || c.jy != pk.y || c.droga == null)
                {
                    c.jx = pk.x; c.jy = pk.y; c.droga = null;
                    var d = szukajDrogi(sim, c, (_i, x, y) => x == pk.x && y == pk.y, LUD.dostawaLimit);
                    if (d != null) { c.droga = d; c.drogaI = 0; c.drogaKopie = false; }
                }
                if (c.droga != null) { var n = nastepnyKafel(sim, c); if (n >= 0) { krok(sim, c, n); return; } c.droga = null; }
                idz(sim, c, pk.x, pk.y);
                return;
            }
            if (JS.Hypot(komu.x - c.x, komu.y - c.y) < 1.8)
            {
                while (c.carry > 0 && komu.hunger > 0.1)
                {
                    c.carry--; sim.meals++;
                    komu.hunger = Math.Max(0, komu.hunger - LUD.posilek);
                }
                komu.hp = Math.Min(maxHp(sim, komu), komu.hp + K.kesLeczy * leczenieZabytkow(sim));
                sim.spark(komu.x, komu.y - 0.5, "spore");
                c.dostawaDla = null;
                c.jt = 0;
                return;
            }
            // głodny się przesunął — droga od nowa
            if (Math.Abs(c.jx - Math.Floor(komu.x)) > 3 || Math.Abs(c.jy - Math.Floor(komu.y)) > 3)
            {
                c.jx = Math.Floor(komu.x); c.jy = Math.Floor(komu.y); c.droga = null;
                var droga = szukajDrogi(sim, c, (_i, x, y) => Math.Abs(x - c.jx) <= 1 && Math.Abs(y - c.jy) <= 1, LUD.dostawaLimit);
                if (droga != null) { c.droga = droga; c.drogaI = 0; c.drogaKopie = false; }
            }
            idz(sim, c, c.jx, c.jy);
        }

        /// <summary>Remake v2: skrajnie głodny biegnie pod linę zjeżdżającego wiadra; na miejscu chwyta ją.</summary>
        static void doLina(Sim sim, Creature c)
        {
            var wd = wiadroId(sim, c.linaDo);
            if (wd == null || wd.porcje <= 0 || wd.faza == "odjezdza" || wd.faza == "stoi") { c.linaDo = null; c.jt = 0; return; }
            if (Math.Abs(c.x - (wd.x + 0.5)) < 0.9 && Math.Abs(Math.Floor(c.y) - wd.cel) <= 1)
            {
                c.naLinie = wd.id; c.linaDo = null;
                c.zamiar = "umiera z głodu — chwyta linę i wspina się do wiadra"; c.zamiarDo = sim.tick + 240;
                return;
            }
            idz(sim, c, wd.x, wd.cel);
        }

        /// <summary>Remake v1: warta — idzie na posterunek i stoi; nie wchodzi między modlących się.</summary>
        static void doWarta(Sim sim, Creature c)
        {
            if (!wartaPotrzebna(sim)) { c.jt = 0; return; }
            if (Math.Abs(c.jx - Math.Floor(c.x)) > 1 || Math.Abs(c.jy - Math.Floor(c.y)) > 4) idz(sim, c, c.jx, c.jy, false);
            else trzymajSieNaMiejscu(sim, c);
        }

        static void doDig(Sim sim, Creature c)
        {
            var w = sim.world;
            if (w.get(c.jx, c.jy) == T.AIR || !w.inb(c.jx, c.jy))
            {
                // Remake v1: droga do rdzenia (Alpha: na rozkaz) — następny kafel czoła, póki trwa zamiar
                if (c.kopieDroge == true && (sim.tick + c.id) % 240 == 0 && pilnieGlodny(sim, c)) { c.jt = 0; return; }
                if (c.kopieDroge == true && sim.tick < (c.zamiarDo ?? 0))
                {
                    var cz = czoloDrogi(sim);
                    double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
                    bool wZasiegu(double i) => Math.Abs((i % w.w) - cx) <= 1 && Math.Abs(JS.ToInt32(i / w.w) - cy) <= 1;
                    double nast;
                    if (!REMAKE) nast = cz;
                    else
                    {
                        nast = -1;
                        foreach (var i in new[] { cz }.Concat(nieWykopane(sim))) if (i >= 0 && wZasiegu(i)) { nast = i; break; }
                    }
                    if (nast >= 0) { c.jx = nast % w.w; c.jy = JS.ToInt32(nast / w.w); c.dig = 0; c.droga = null; return; }
                }
                c.jt = 0;
                return;
            }
            // zasięg po kaflach — sąsiedni kafel, także po skosie (kując plan pomieszczenia — też nad głową)
            var near = c.polecenie?.typ == "kop" && c.polecenie.pom != null
                ? siegaPlanu(Math.Floor(c.x), Math.Floor(c.y), c.jx, c.jy)
                : Math.Abs(c.jx - Math.Floor(c.x)) <= 1 && Math.Abs(c.jy - Math.Floor(c.y)) <= 1;
            // Remake v2: kuje tylko stojąc
            if (near && (!ludRuch(c) || stoi(sim, Math.Floor(c.x), Math.Floor(c.y)))) digTile(sim, c, c.jx, c.jy);
            else idz(sim, c, c.jx, c.jy);
        }

        /// <summary>Remake v2: robotnik bierze porcje z wiadra dla głodnego (potem niesie mu je — DOSTAWA).</summary>
        static void doZbiera(Sim sim, Creature c)
        {
            if (Math.Abs(c.jx - Math.Floor(c.x)) > 1 || Math.Abs(c.jy - Math.Floor(c.y)) > 1) { idz(sim, c, c.jx, c.jy); return; }
            var sp = c.dostawaDla != null ? spizarniaW(sim, c.jx, c.jy) : null;
            // (Alpha, jedno wiadro: najpierw sam się najada)
            if (sp != null && c.hunger > LUD.kurierNajadaOd)
            {
                for (var n = 0; n < 4 && c.hunger > WIADRO.najadaDo && sp.wez(1) > 0; n++)
                {
                    sim.meals++;
                    c.hunger = Math.Max(0, c.hunger - LUD.posilek);
                }
                sim.spark(c.x, c.y - 0.5, "spore");
            }
            if (sp != null) c.carry += sp.wez(LUD.przenoszenie);
            c.carryT = 0;
            c.jt = 0;
        }

        /// <summary>Etap 3e: wzięty kielich — rany goją się szybciej.</summary>
        static double leczenieZabytkow(Sim sim) => maZabytek(sim, "kielich") ? ZABYTKI.skutki.kielich.leczenie : 1;

        /// <summary>Posiłek z wiadra (Remake v2; dawniej ze spiżarni).</summary>
        static void doZapas(Sim sim, Creature c)
        {
            if (Math.Abs(c.jx - Math.Floor(c.x)) > 2 || Math.Abs(c.jy - Math.Floor(c.y)) > 2)
            {
                if (c.jt <= 1) c.bezSpizarniDo = sim.tick + LUD.spizarniaPrzerwa;   // nie doszedł — na chwilę odpuszcza to wiadro
                idz(sim, c, c.jx, c.jy);
                return;
            }
            var sp = spizarniaW(sim, c.jx, c.jy);
            // Alpha, etap 3: je do syta (porcja za porcją)
            for (var n = 0; sp != null && n < 4 && (n == 0 || c.hunger > WIADRO.najadaDo) && sp.wez(1) > 0; n++)
            {
                sim.meals++;
                c.hunger = Math.Max(0, c.hunger - LUD.posilek);
                c.hp = Math.Min(maxHp(sim, c), c.hp + K.kesLeczy * leczenieZabytkow(sim));
            }
            c.jt = 0;
        }

        static void doEat(Sim sim, Creature c)
        {
            var w = sim.world;
            var t = w.get(c.jx, c.jy);
            if (!edible(c.race, t)) { c.jt = 0; return; }
            if (Math.Abs(c.jx - Math.Floor(c.x)) <= 1 && Math.Abs(c.jy - Math.Floor(c.y)) <= 1)
            {
                w.set(c.jx, c.jy, T.AIR);
                sim.meals++;
                c.hunger = Math.Max(0, c.hunger - (t == T.BONES ? K.kesKosci : K.kesGrzyba));
                c.hp = Math.Min(maxHp(sim, c), c.hp + K.kesLeczy * leczenieZabytkow(sim));
                c.jt = 0;
            }
            else idz(sim, c, c.jx, c.jy);
        }

        /// <summary>6.11: przejście po garbie gruzu na kresce drogi w lochu (patrz TS). False — to nie garb w lochu.</summary>
        static bool poGruzie(Sim sim, Creature c, List<double> sciezka, int j)
        {
            var w = sim.world;
            bool wolny(int k)
            {
                double x = sciezka[k] % w.w, y = JS.ToInt32(sciezka[k] / w.w);
                return w.wLochu(x, y) && !w.solid(x, y);
            }
            for (var k = j; k >= 0; k--)
            {
                double x = sciezka[k] % w.w, y = JS.ToInt32(sciezka[k] / w.w);
                if (!w.wLochu(x, y) || w.solid(x, y - 1)) return false;
                if (w.solid(x, y)) continue;
                var t = k;
                for (var n = 0; n < 2 && t > 0 && wolny(t - 1); n++) t--;
                double gx = sciezka[t] % w.w, gy = JS.ToInt32(sciezka[t] / w.w);
                c.poGruzie = new PoGruzie { x = gx, y = gy, @do = sim.tick + Math.Ceiling((Math.Abs(gx + 0.5 - c.x) + Math.Abs(gy + 0.5 - c.y) + 2) * 30) };
                walkTo(sim, c, gx, gy, false);
                return true;
            }
            return false;
        }

        /// <summary>Krok pielgrzyma po planie drogi (od końca). False, gdy plan mu nie pomoże.</summary>
        static bool idzPlanem(Sim sim, Creature c, List<double> sciezka)
        {
            var w = sim.world;
            double tx = Math.Floor(c.x), ty = Math.Floor(c.y);
            if (c.poGruzie != null)
            {
                var g = c.poGruzie;
                var wTrakcie = sim.tick < g.@do && w.wLochu(c.x, c.y) && Math.Abs(g.x - tx) <= 24 && (tx != g.x || ty != g.y) && !w.solid(g.x, g.y);
                if (wTrakcie && !walkTo(sim, c, g.x, g.y, false)) return true;
                c.poGruzie = null;
            }
            var k = sciezka.LastIndexOf(w.idx(tx, ty));
            if (k < 0)
            {
                // zszedł z kreski — wraca do najbliższego jej kafla, jeśli jest blisko
                int best = -1; var bd = P.planZasieg + 1;
                for (var j = 0; j < sciezka.Count; j++)
                {
                    var i = sciezka[j];
                    var d = Math.Abs((i % w.w) - tx) + Math.Abs(JS.ToInt32(i / w.w) - ty);
                    if (d < bd) { bd = d; best = j; }
                }
                if (best < 0) return false;
                double bx = sciezka[best] % w.w, by = JS.ToInt32(sciezka[best] / w.w);
                if (bd <= 1 && w.solid(bx, by))
                {
                    if (w.hardness(bx, by) <= 0) return false;
                    if (REMAKE && poGruzie(sim, c, sciezka, best)) return true;
                    // Alpha: pobożny nie kuje — czeka, aż robotnicy wykują kreskę
                    if (REMAKE) return true;
                    digTile(sim, c, bx, by);
                    return true;
                }
                if (bd <= 1) { krok(sim, c, sciezka[best]); return true; }
                if (bd == 2 && Math.Abs(bx - tx) == 1 && Math.Abs(by - ty) == 1 && !w.solid(bx, by)) { krok(sim, c, sciezka[best]); return true; }
                if (REMAKE) return false;
                walkTo(sim, c, bx, by);
                return true;
            }
            if (k == 0) return false;
            var nast = sciezka[k - 1];
            double nx = nast % w.w, ny = JS.ToInt32(nast / w.w);
            if (w.solid(nx, ny))
            {
                if (w.hardness(nx, ny) <= 0) return false;
                if (REMAKE && poGruzie(sim, c, sciezka, k - 1)) return true;
                if (REMAKE) return true;
                digTile(sim, c, nx, ny);
                return true;
            }
            krok(sim, c, nast);
            return true;
        }
    }
}
