// Port: alpha-1/src/sim/creatures.ts — część 1: stepCreature, krokStworzenia, rozstaw
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyStworzenia;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyPolecenia;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.CechyNacji;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Rytual;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Walka;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.Zabytki;
using static Trzewia.Symulacja.Wiadro;
using static Trzewia.Symulacja.LinaWiadra;
using static Trzewia.Symulacja.DlonDemona;
using static Trzewia.Symulacja.BudowaSchodow;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static partial class Stworzenia
    {
        static Typ_STWORZENIA K => STWORZENIA;
        static Typ_PIELGRZYMKA P => PIELGRZYMKA;

        static readonly HashSet<double> FOOD_TILES = new HashSet<double> { T.FUNGUS, T.BONES };
        /// <summary>Żużlowcy nie jedzą rudy — żywią się ciepłem przy ogniu.</summary>
        static bool edible(int race, double t) => race == Race.DWARF ? false : FOOD_TILES.Contains(t);

        /// <summary>Krok stworzenia — w trybie deweloperskim zapisuje do dziennika każdą zmianę zajęcia.</summary>
        public static void stepCreature(Sim sim, Creature c)
        {
            if (!DZIENNIK.wlaczony) { krokStworzenia(sim, c); return; }
            var przed = c.job;
            krokStworzenia(sim, c);
            if (!c.dead && c.job != przed) zapisz(sim, "praca", $"{kto(sim, c)} {(c.job >= 0 && c.job < OPIS_PRACY.Length ? OPIS_PRACY[c.job] : "zajęcie " + c.job)}", c.x, c.y);
        }

        static void krokStworzenia(Sim sim, Creature c)
        {
            // etap 3: Strażnicy Snu żyją po swojemu (sim/straznicy.ts)
            if (c.straznik == true) { krokStraznika(sim, c); return; }
            var w = sim.world;
            var d = RACES[c.race];
            // v4.1 beta: cecha nacji — mnożniki na statystyki rasy
            var m = cechaNacji(sim.clans[c.clan]);
            var tx = Math.Max(0, Math.Min(w.w - 1, Math.Floor(c.x)));
            var ty = Math.Max(0, Math.Min(w.h - 1, Math.Floor(c.y)));
            // Pielgrzym się nie starzeje
            if (c.job != Job.PIELGRZYM) c.age++;
            c.anim++;

            // --- żywioły
            var i = w.idx(Math.Max(0, Math.Min(w.w - 1, tx)), Math.Max(0, Math.Min(w.h - 1, ty)));
            if (w.magma[i] > 0) { c.hp -= K.magmaObrazenia + w.magma[i]; c.fear = 1; c.rana = "magma"; }
            if (w.water[i] > K.toniePowyzej && !d.swims) { c.hp -= K.tonieObrazenia; c.fear = Math.Min(1, c.fear + K.tonieStrach); c.rana = "woda"; }
            // grzybnia parzy obcych
            if (w.tile[i] == T.FUNGUS && c.race != Race.GOBLIN) { c.hp -= K.grzybniaParzy; c.rana = "grzybnia"; }

            // --- głód i wiek
            var over = sim.crowding[c.race] - 1;
            var press = over > 0 ? Math.Min(K.glodOdTlokuMax, 1 + over * over * K.glodOdTloku) : 1;
            var wDrodze = c.job == Job.PIELGRZYM ? P.glodWDrodze : 1;
            c.hunger += K.glodNaTik * d.metabolism * m.glod * mnoznik(sim, c, "glod") * (1 + c.mad * K.glodOdSzalenstwa) * press * wDrodze * (sim.spokojnySwiat ? K.glodWSamouczku : 1);
            // Żużlowcy żywią się tym, co wypluwa ogień
            if (c.race == Race.DWARF)
            {
                var hot = false;
                foreach (var f in sim.allForges)
                {
                    double fx = f % w.w, fy = JS.ToInt32(f / w.w);
                    if (Math.Abs(fx - tx) <= K.cieploKuzni && Math.Abs(fy - ty) <= K.cieploKuzni) { hot = true; break; }
                }
                if (!hot)
                {
                    for (var dy = -K.cieploMagmy; dy <= K.cieploMagmy && !hot; dy++)
                        for (var dx = -K.cieploMagmy; dx <= K.cieploMagmy; dx++)
                        {
                            double x = tx + dx, y = ty + dy;
                            if (w.inb(x, y) && w.magma[w.idx(x, y)] > 0) { hot = true; break; }
                        }
                }
                if (hot) c.hunger = Math.Max(0, c.hunger - K.cieploKarmi);
            }
            // Remake v1: kto niesie jedzenie i już słabnie z głodu, zjada swój ładunek
            if (REMAKE && c.carry > 0 && c.hunger > LUD.zjadaNiesione && rolaPostaci(c) != null)
            {
                c.carry--; sim.meals++; c.hunger = Math.Max(0, c.hunger - LUD.posilek);
                if (c.carry == 0) { c.dostawaDla = null; c.doObozu = null; }
            }
            if (c.hunger > K.glodZabija) { c.hp -= K.glodObrazenia; c.rana = "glod"; }
            else if (c.hunger < K.najedzonyLeczy && c.hp < maxHp(sim, c)) c.hp = Math.Min(maxHp(sim, c), c.hp + K.leczenieNaTik * leczenieZabytkow(sim));
            if (c.age > d.lifespan * m.zycie && !sim.spokojnySwiat && (LUD.starzejeSie || rolaPostaci(c) == null)) { c.hp -= K.starosc; c.rana = "starosc"; }
            c.fear *= K.wygasanieStrachu;

            // --- szaleństwo głębi: im niżej, tym mniej z niego zostaje
            var depth = w.depth(ty);
            var przyRdzeniu = Math.Abs(c.x - w.coreX) < P.ochronaZasieg && Math.Abs(c.y - w.coreY) < P.ochronaZasieg;
            var podRdzeniem = (REMAKE && rolaPostaci(c) != null && przyRdzeniu) || (c.devotion > P.ochronaOddanie
                && (c.job == Job.PIELGRZYM || przyRdzeniu));
            var odpornosc = c.race == Race.DWARF ? K.odpornoscZuzlowcow : 1;
            // (etap 3e: wzięta księga — głębia szybciej miesza w głowach i wolniej puszcza)
            var ksiega = REMAKE && rolaPostaci(c) != null && maZabytek(sim, "ksiega");
            if (!podRdzeniem && depth > K.szalenstwoOdGlebokosci && c.race != Race.TROLL && sim.rng.chance(K.szalenstwoSzansa * (depth - K.szalenstwoPunkt) * 10 * odpornosc * (ksiega ? ZABYTKI.skutki.ksiega.szalenstwo : 1)))
            {
                c.mad = Math.Min(1, c.mad + K.szalenstwoSkok);
                // Remake v1: bez trolów i sekt — szaleństwo nie przemienia nikogo
            }
            if (podRdzeniem && c.mad > 0) c.mad = Math.Max(0, c.mad - P.ochronaLeczy * (ksiega ? ZABYTKI.skutki.ksiega.zdrowienie : 1));
            // kto wrócił wyżej, powoli dochodzi do siebie
            else if (depth < K.zdrowiejePowyzej && c.mad > 0 && c.race != Race.TROLL) c.mad = Math.Max(0, c.mad - K.zdrowienie * (ksiega ? ZABYTKI.skutki.ksiega.zdrowienie : 1));

            if (c.hp <= 0)
            {
                var r = PRZYCZYNA.TryGetValue(c.rana ?? "", out var pr) ? pr : ("z wycieńczenia", c.age > d.lifespan * m.zycie ? "starość" : "wycieńczenie");
                sim.kill(c, r.Item1, r.Item2);
                return;
            }

            // Remake v2: na linie wiadra (sim/wiadro.ts)
            if (c.naLinie != null && krokNaLinie(sim, c)) return;
            // Alpha, etap 4: skleja przeciętą linę wiadra (sim/lina-wiadra.ts)
            if (c.naprawia != null && krokNaprawy(sim, c)) return;
            // Alpha, etap 5b: w dłoni z otchłani albo ciśnięty przez nią (sim/dlon-demona.ts)
            if ((c.wDloni == true || c.lot != null) && krokLotu(sim, c)) return;
            if (c.ogluszonyDo != null)
            {
                if (sim.tick < c.ogluszonyDo) { c.vy = 0; c.droga = null; return; }
                c.ogluszonyDo = null;
            }
            if (c.przystanDo != null)
            {
                if (sim.tick < c.przystanDo) { c.vy = 0; c.droga = null; return; }
                c.przystanDo = null;
            }
            // Alpha 1 (6.11): rycerz w trakcie ruchu walki (sim/walka.ts)
            if (c.ruch != null && c.straznik != true && krokRuchuRycerza(sim, c)) return;

            // --- przysypanie
            if (!w.passable(tx, ty))
            {
                c.hp -= K.przysypanyObrazenia; c.rana = "przysypany";
                c.fear = Math.Min(1, c.fear + K.przysypanyStrach);
                if (d.digPower > 0)
                {
                    c.dig += d.digPower * m.kopanie * K.wygrzebywanieSila;
                    var twardosc = w.hardness(tx, ty);
                    if (twardosc > 0 && c.dig >= twardosc * K.wygrzebywanieProg)
                    {
                        c.dig = 0;
                        w.set(tx, ty, T.AIR);
                        sim.spark(c.x, c.y, "dust");
                    }
                }
                else if (w.passable(tx, ty - 1))
                {
                    c.y -= K.wygrzebywanieWGore;       // kto nie kopie, ten się wygrzebuje w górę
                }
                return;
            }

            // --- grawitacja
            var trzymaSie = (c.wspina ?? -9) >= sim.tick - K.trzymaSieTikow
                && (w.solid(tx - 1, ty) || w.solid(tx + 1, ty) || w.solid(tx - 1, ty + 1) || w.solid(tx + 1, ty + 1));
            // Alpha: na linie się wisi — nie spada; na schodach drogi wiernych się stoi
            var wisiNaLinie = w.lina[i] == 1 || w.schody[i] == 1;
            if (wisiNaLinie && c.vy > 0) c.vy = 0;
            if (!trzymaSie && !wisiNaLinie && w.passable(tx, ty + 1) && w.water[w.idx(tx, Math.Min(w.h - 1, ty + 1))] < K.wodaNiesie)
            {
                if ((c.wspina ?? -99) >= sim.tick - K.zsuwaSieTikow && (w.solid(tx - 1, ty) || w.solid(tx + 1, ty))
                    && w.magma[w.idx(tx, Math.Min(w.h - 1, ty + 1))] == 0)
                {
                    c.vy = 0;
                    c.y += K.zsuwanie;
                    c.wspina = sim.tick - (K.trzymaSieTikow + 1);
                    return;
                }
                // Alpha: lud bez lin zsuwa się po każdej ścianie szybu
                if (ludRuch(c) && (w.solid(tx - 1, ty) || w.solid(tx + 1, ty)) && w.magma[w.idx(tx, Math.Min(w.h - 1, ty + 1))] == 0)
                {
                    c.vy = Math.Min(K.zsuwanieLudu, c.vy + K.grawitacja);
                    c.y += c.vy;
                    c.wspina = sim.tick - (K.trzymaSieTikow + 1);
                    return;
                }
                c.vy = Math.Min(K.maxSpadanie, c.vy + K.grawitacja);
                c.y += c.vy;
                return;
            }
            if (c.vy > K.kurzOdPredkosci)
            {
                var ile = c.vy > K.bolesnyUpadek ? 3 : 1;
                for (var k = 0; k < ile; k++) sim.spark(c.x + sim.rng.range(-0.4, 0.4), c.y + 0.3, "dust");
                if (c.vy > K.bolesnyUpadek) sim.efekt(c.x, c.y + 0.4, "kopniecie");
            }
            if (c.vy > K.bolesnyUpadek) { c.hp -= RACES[c.race].maxHp * K.upadekObrazenia * Math.Min(1, (c.vy - K.bolesnyUpadek) / K.upadekPelny); c.rana = "upadek"; oznaczCios(sim, c, true); }
            c.vy = 0;

            // --- rozglądanie się: rysunek twojego ciała powstaje tylko z ich oczu
            if ((c.id + sim.tick) % K.rozgladanieCo == 0)
            {
                var r = c.race == Race.TROLL ? K.wzrokTroli : K.wzrok;
                var fresh = w.observe(tx, ty, r, sim.tick);
                if (JS.Tak(fresh)) sim.onVisit(fresh);
            }

            if (c.carry > 0) c.carryT++; else c.carryT = 0;

            // --- zakleszczenie
            var modliSiePodRdzeniem = c.job == Job.PIELGRZYM
                && Math.Abs(c.x - w.coreX) < P.przedsionekX && Math.Abs(c.y - w.przedsionekY) < P.przedsionekY;
            var naPosterunku = ((c.job == Job.STOI || c.job == Job.WARTA) && Math.Abs(c.jx - Math.Floor(c.x)) <= 1 && Math.Abs(c.jy - Math.Floor(c.y)) <= 4)
                || (c.job == Job.SCHODY && naPosterunkuBudowy(sim, c));
            if (!modliSiePodRdzeniem && !naPosterunku && (c.id + sim.tick) % K.zakleszczenieCo == 0)
            {
                if (Math.Abs(c.x - c.lx) < K.zakleszczenieRuch && Math.Abs(c.y - c.ly) < K.zakleszczenieRuch) c.stall++;
                else c.stall = 0;
                c.lx = c.x; c.ly = c.y;
                if (c.stall > K.zakleszczenieLimit && REMAKE && rolaPostaci(c) != null)
                {
                    // lud: zamiar się nie udał — planowanie od nowa (bez losowego spaceru)
                    c.stall = 0;
                    c.jt = 0;
                }
                else if (c.stall > K.zakleszczenieLimit)
                {
                    c.stall = 0;
                    c.jt = 0;
                    c.job = Job.WANDER;
                    c.jx = c.x + sim.rng.range(-K.zakleszczenieUciekaX, K.zakleszczenieUciekaX);
                    c.jy = c.y + sim.rng.range(-K.zakleszczenieUciekaY, K.zakleszczenieUciekaY);
                    c.face = -c.face;
                }
            }

            // Dotknięcie rdzenia kończy grę.
            var wolnoWejsc = sim.clans[c.clan].devotion > RYTUAL.uwolnienieNacja || c.devotion > RYTUAL.uwolnienieWlasne;
            if (wolnoWejsc && Math.Abs(c.x - w.coreX) <= RYTUAL.dotykZasieg && Math.Abs(c.y - w.coreY) <= RYTUAL.dotykZasieg)
            {
                double cx = JS.Round(c.x), cy = JS.Round(c.y);
                foreach (var (dx, dy) in SASIEDZI5)
                {
                    if (w.get(cx + dx, cy + dy) == T.CORE) { sim.reachCore(c); return; }
                }
            }
            if (wolnoWejsc && sim.rytual.otwarta && wKomorze(sim, Math.Floor(c.x), Math.Floor(c.y)))
            {
                sim.reachCore(c); return;
            }

            // Remake v1: sięga po niego dłoń z otchłani — stoi jak wryty (sim/dlon.ts)
            if (REMAKE && c.zamarlyDo != null && sim.tick < c.zamarlyDo && !sim.przyMagmie(tx, ty, 1) && w.water[w.idx(tx, ty)] < LUD.wodaUcieka)
            {
                c.fear = 1;
                c.droga = null;
                c.zamiar = "stoi jak wryty — coś sięga po niego z otchłani"; c.zamiarDo = c.zamarlyDo;
                return;
            }

            // --- ogień tuż obok: ucieka, zanim spłynie
            var przechodzi = false;
            if (REMAKE && rolaPostaci(c) != null && c.droga != null)
            {
                var n = JS.At(c.droga, Math.Min(c.droga.Count - 1, c.drogaI ?? 0));
                przechodzi = n != null && w.magma[n.Value] == 0 && w.magma[w.idx(tx, ty)] == 0;
            }
            if ((c.id + sim.tick) % K.ogienSprawdzCo == 0 && c.job != Job.FLEE && !przechodzi && !(REMAKE && c.job == Job.PIELGRZYM && w.prog[w.idx(tx, ty)] == 1) && sim.przyMagmie(tx, ty, 1))
            {
                double mx = 0, my = 0;
                for (var dy = -K.ogienZasieg; dy <= K.ogienZasieg; dy++) for (var dx = -K.ogienZasieg; dx <= K.ogienZasieg; dx++)
                {
                    if (w.inb(tx + dx, ty + dy) && w.magma[w.idx(tx + dx, ty + dy)] > 0) { mx += dx; my += dy; }
                }
                c.job = Job.FLEE; c.droga = null;
                c.odOgnia = sim.tick;
                if (REMAKE && rolaPostaci(c) != null) { c.zamiar = "ucieka od ognia"; c.zamiarDo = sim.tick + K.ogienTikow; }
                c.jx = tx - JS.Sign(JS.Tak(mx) ? mx : c.face) * K.ogienUciekaX; c.jy = ty - (my >= 0 ? K.ogienUciekaWGore : -K.ogienUciekaWDol);
                c.jt = K.ogienTikow; c.fear = 1;
                // Remake v1: prawdziwą drogą do najbliższego miejsca z dala od ognia
                if (REMAKE && rolaPostaci(c) != null)
                {
                    var dr = szukajDrogi(sim, c, (_i, x, y) => !sim.przyMagmie(x, y, 3) && stoi(sim, x, y), 3000);
                    if (dr != null) { c.droga = dr; c.drogaI = 0; c.drogaKopie = false; var k = dr[dr.Count - 1]; c.jx = k % w.w; c.jy = JS.ToInt32(k / w.w); }
                }
            }

            // Remake v1: woda podchodzi — lud wychodzi w górę
            if (REMAKE && rolaPostaci(c) != null && c.job != Job.FLEE && (c.id + sim.tick) % 20 == 0 && w.water[w.idx(tx, ty)] >= LUD.wodaUcieka
                && !(c.hunger > LUD.glodSam && w.water[w.idx(tx, ty)] <= K.toniePowyzej))
            {
                c.job = Job.FLEE; c.droga = null;
                c.jx = tx; c.jy = Math.Max(2, ty - 8); c.jt = 240;
                c.zamiar = "ucieka przed wodą"; c.zamiarDo = sim.tick + 240;
            }

            // Remake v2: głodny przerywa wartę, stanie, kopanie i modlitwę, gdy gdzieś stoi wiadro z jedzeniem
            if (REMAKE && c.carry == 0 && c.hunger > LUD.glodSam && (sim.tick + c.id) % 120 == 0 && rolaPostaci(c) != null
                && (c.job == Job.STOI || c.job == Job.WARTA || c.job == Job.DIG || c.job == Job.PRAY || c.job == Job.BUILD)
                && najblizszaSpizarnia(sim, c.x, c.y, true) != null) c.jt = 0;

            // --- wybór zajęcia
            if (c.jt-- <= 0) pickJob(sim, c);

            switch (c.job)
            {
                case Job.EAT: doEat(sim, c); break;
                case Job.DIG: case Job.DESCEND: doDig(sim, c); break;
                case Job.PRAY: doPray(sim, c); break;
                case Job.BUILD: doBuild(sim, c); break;
                case Job.SCHODY: doSchody(sim, c); break;
                case Job.FIGHT: doFight(sim, c); break;
                case Job.FLEE: doFlee(sim, c); break;
                case Job.BREED: doBreed(sim, c); break;
                case Job.HAUL: doHaul(sim, c); break;
                case Job.SLAVE: doSlave(sim, c); break;
                case Job.SACRIFICE: doSacrifice(sim, c); break;
                case Job.SLEEP: doSleep(sim, c); break;
                case Job.HEAT: doHeat(sim, c); break;
                case Job.DRAIN: doDrain(sim, c); break;
                case Job.PIELGRZYM: doPielgrzym(sim, c); break;
                case Job.ZBIERA: doZbiera(sim, c); break;
                case Job.ZAPAS: doZapas(sim, c); break;
                case Job.WARTA: doWarta(sim, c); break;
                case Job.DOSTAWA: doDostawa(sim, c); break;
                case Job.STOI: doStoi(sim, c); break;
                case Job.LINA: doLina(sim, c); break;
                default: doWander(sim, c); break;
            }
            // Alpha: lud nie stoi jeden w drugim — rozsuwa się i dopasowuje krok
            if (ludRuch(c)) rozstaw(sim, c);
        }

        static readonly (double, double)[] SASIEDZI5 = { (0, 0), (0, 1), (0, -1), (1, 0), (-1, 0) };

        /// <summary>Alpha: odstępy w tłumie (patrz TS).</summary>
        static void rozstaw(Sim sim, Creature c)
        {
            var w = sim.world;
            var ruch = c.x - (c.poprzX ?? c.x);
            c.poprzX = c.x;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            if (c.naLinie != null || !stoi(sim, cx, cy)) return;
            var stoiTu = Math.Abs(ruch) < 0.004;
            var lista = sim.creatures;
            for (int k = 0; k < lista.Count; k++)
            {
                var o = lista[k];
                if (o == c || o.dead || !ludRuch(o) || o.naLinie != null) continue;
                if (Math.Abs(o.y - c.y) > 0.6) continue;
                var dx = c.x - o.x;
                if (stoiTu)
                {
                    if (Math.Abs(dx) >= ODSTEPY.stojacy) continue;
                    var kier = Math.Abs(dx) > 0.001 ? JS.Sign(dx) : (c.id < o.id ? -1 : 1);
                    var nx = c.x + kier * ODSTEPY.rozsuwanie;
                    var kx = Math.Floor(nx + kier * 0.3);
                    if (w.passable(kx, cy) && stoi(sim, kx, cy) && w.magma[w.idx(kx, cy)] == 0) c.x = nx;
                    return;
                }
                var przed = JS.Sign(-dx) == JS.Sign(ruch);
                var ruchO = o.x - (o.poprzX ?? o.x);
                if (!przed || Math.Abs(dx) >= ODSTEPY.idacy || JS.Sign(ruchO) != JS.Sign(ruch)) continue;
                if (Math.Abs(ruch) >= Math.Abs(ruchO) * ODSTEPY.wyprzedza) continue;
                c.x -= ruch - ruchO;
                return;
            }
        }
    }
}
