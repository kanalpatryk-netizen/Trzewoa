// Port: alpha-1/src/sim/creatures.ts — część 2: pickJob
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyStworzenia;
using static Trzewia.Nastawy.NastawyGora;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.CechyNacji;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Rytual;
using static Trzewia.Symulacja.Droga;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static partial class Stworzenia
    {
        static void pickJob(Sim sim, Creature c)
        {
            var w = sim.world;
            var d = RACES[c.race];
            var clan = sim.clans[c.clan];
            double oldX = c.jx, oldY = c.jy;
            c.jt = K.decyzjaTikow + sim.rng.@int(K.decyzjaRozrzut);
            c.droga = null; c.drogaI = 0; c.drogaKopie = false;
            // Zapamiętuje drogę i ustawia cel zajęcia na jej końcu (albo na podanym kaflu).
            void naDroge(List<double> droga, double? cx = null, double? cy = null)
            {
                c.droga = droga; c.drogaI = 0; c.drogaKopie = false;
                if (cx != null && cy != null) { c.jx = cx.Value; c.jy = cy.Value; return; }
                var k = droga.Count > 0 ? droga[droga.Count - 1] : w.idx(Math.Floor(c.x), Math.Floor(c.y));
                c.jx = k % w.w; c.jy = JS.ToInt32(k / w.w);
            }
            // Kafel ze świętością w zasięgu modlitwy (3×3) — zwraca go albo -1.
            double swietoscObok(double x, double y, Func<double, bool> jaki)
            {
                for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++)
                {
                    double xx = x + dx, yy = y + dy;
                    if (w.inb(xx, yy) && jaki(w.tile[w.idx(xx, yy)])) return w.idx(xx, yy);
                }
                return -1;
            }
            // Łup i tak trafia do klanu: chowają go po drodze.
            if (c.carry > 0 && !(REMAKE && rolaPostaci(c) != null) && (c.job == Job.HAUL || c.carryT > K.lupChowaPo))
            {
                clan.stock += c.carry; c.carry = 0; c.carryT = 0;
            }
            // Zachowaj postęp kucia, jeśli cel się nie zmienił — inaczej tunel nigdy nie powstaje.
            void keepDig() { if (c.jx != oldX || c.jy != oldY) c.dig = 0; }

            // myśl od ciebie jest silniejsza niż każdy instynkt
            if (c.thought != Thought.NONE)
            {
                switch (c.thought)
                {
                    case Thought.DIG_DOWN:
                        c.job = Job.DESCEND; c.jx = Math.Floor(c.x); c.jy = Math.Min(w.h - 2, Math.Floor(c.y) + K.szeptKopGlebiej);
                        c.jt = K.szeptKopTikow; return;
                    case Thought.KILL_KIN:
                    {
                        var swoj = sim.nearestCreature(c.x, c.y, K.szeptZabijSwoich, o => o.id != c.id && o.clan == c.clan);
                        var ktokolwiek = swoj ?? sim.nearestCreature(c.x, c.y, K.szeptZabijRasy, o => o.id != c.id && o.race == c.race);
                        if (ktokolwiek != null)
                        {
                            c.job = Job.FIGHT; c.jx = ktokolwiek.x; c.jy = ktokolwiek.y;
                            sim.target.set(c.id, ktokolwiek.id); c.jt = K.szeptZabijTikow;
                            c.thought = Thought.NONE;
                            return;
                        }
                        c.thought = Thought.NONE; break;
                    }
                    case Thought.PROPHESY:
                        if (!c.prophet) sim.makeProphet(c);
                        c.thought = Thought.NONE; break;
                    case Thought.FLEE_UP:
                        c.job = Job.FLEE; c.jx = c.x + sim.rng.range(-K.szeptUciekajWBok, K.szeptUciekajWBok); c.jy = Math.Max(2, c.y - K.szeptUciekajWGore); c.jt = K.szeptUciekajTikow; return;
                    case Thought.BREED:
                        c.job = Job.BREED; c.jt = K.szeptPlodzTikow; c.thought = Thought.NONE; return;
                    case Thought.PRAY_CORE:
                        c.thought = Thought.NONE;
                        if (d.faithGain <= 0 || c.race == Race.TROLL || c.race == Race.HUMAN) break;
                        c.devotion = Math.Max(c.devotion, P.szeptOddanie);
                        c.wyprawa = true;
                        // Alpha: droga wiernych jeszcze niewykopana — czeka przy obozie (planer)
                        if (REMAKE && drogaNiegotowa(sim, c)) { c.jt = 0; c.zamiarDo = sim.tick; break; }
                        c.job = Job.PIELGRZYM;
                        if (REMAKE) { c.zamiar = "schodzi do krypty i modli się przy pomniku"; c.zamiarDo = sim.tick + P.wyprawaTikow; }
                        c.jx = miejsceWSzeregu(sim, c);
                        c.jy = w.przedsionekY;
                        c.jt = P.wyprawaTikow; c.dig = 0; return;
                }
            }

            if (!walczacy(c) && c.hp < maxHp(sim, c) * K.rannyUcieka && c.fear > K.rannyStrach) { c.job = Job.FLEE; c.jt = K.ucieczkaTikow; return; }

            // każda rasa ma własny sposób na głód
            if (c.hunger > (c.race == Race.DWARF ? K.glodZuzlowcow : K.glodInnych))
            {
                if (c.race == Race.TROLL && c.hunger > K.trolZasypiaOd)
                {
                    var prey = sim.spokojnySwiat || sim.rozejm ? null : sim.nearestCreature(c.x, c.y, K.trolOfiaraZasieg, o => o.id != c.id && o.race != Race.TROLL && !sim.pokojMiedzy(c.clan, o.clan));
                    if (prey == null) { c.job = Job.SLEEP; c.jt = K.trolSpiTikow; return; }
                }
                if (c.race == Race.DWARF)
                {
                    var droga = szukajDrogi(sim, c, (_i, x, y) => sim.goraco(x, y), K.cieploLimitDrogi);
                    if (droga != null) { naDroge(droga); c.job = Job.HEAT; c.jt = K.cieploTikow + droga.Count * K.tikowNaKafel; return; }
                    var heat = sim.findHeat(c.x, c.y, K.cieploZasieg);
                    if (heat != null) { c.job = Job.HEAT; c.jx = heat.Value.x; c.jy = heat.Value.y; c.jt = K.cieploTikow; return; }
                }
                if (c.race == Race.SPINNER && !sim.spokojnySwiat)
                {
                    var slave = sim.nearestCreature(c.x, c.y, K.przadkaNiewolnik, o => o.clan == c.clan && o.slave);
                    if (slave != null) { c.job = Job.DRAIN; sim.target.set(c.id, slave.id); c.jt = K.przadkaTikow; return; }
                    var ofiara = sim.nearestCreature(c.x, c.y, K.przadkaPoluje, o => o.race != Race.SPINNER && o.race != Race.TROLL
                        && o.clan != c.clan && !o.slave && RACES[o.race].strength < K.przadkaSilaOfiary && !sim.pokojMiedzy(c.clan, o.clan));
                    if (ofiara != null) { c.job = Job.SLAVE; sim.target.set(c.id, ofiara.id); c.jt = K.przadkaTikow; return; }
                }
            }

            // wróg w pobliżu
            var foe = sim.nearestCreature(c.x, c.y, K.wrogZasieg, o => sim.hostile(c, o));
            if (foe != null)
            {
                var scary = RACES[foe.race].strength > d.strength * K.strasznyWrog;
                if (scary && !walczacy(c) && sim.rng.chance(K.strachSzansa * d.fearGain * cechaNacji(sim.clans[c.clan]).strach))
                {
                    c.job = Job.FLEE; c.jx = c.x - (foe.x - c.x); c.jy = c.y - (foe.y - c.y); c.jt = K.ucieczkaTikow; c.fear = 1; return;
                }
                if (c.race == Race.SPINNER && RACES[foe.race].strength < K.przadkaSilaOfiary && sim.rng.chance(K.przadkaJarzmoSzansa))
                {
                    c.job = Job.SLAVE; sim.target.set(c.id, foe.id); c.jt = K.jarzmoTikow; return;
                }
                c.job = Job.FIGHT; sim.target.set(c.id, foe.id); c.jt = K.walkaTikow; return;
            }

            // Remake v1: lud nie losuje zajęć co chwilę — planer daje każdemu zamiar z celem
            if (REMAKE && rolaPostaci(c) != null) { planujLud(sim, c); return; }

            if (c.hunger > K.idzieJesc && c.race != Race.DWARF)
            {
                var droga = szukajDrogi(sim, c, (i, _x, _y) => edible(c.race, w.tile[i]), c.hunger > K.bardzoGlodny ? K.jedzenieLimitGlodny : K.jedzenieLimit);
                if (droga != null) { naDroge(droga); c.job = Job.EAT; c.jt = K.jedzenieTikow + droga.Count * K.tikowNaKafelDoJedzenia; return; }
                var food = sim.findFood(c.x, c.y, c.hunger > K.bardzoGlodny ? K.jedzenieZasiegGlodny : K.jedzenieZasieg, d.swims, t => edible(c.race, t));
                if (food != null) { c.job = Job.EAT; c.jx = food.Value.x; c.jy = food.Value.y; c.jt = K.jedzenieTikow + JS.Round(JS.Hypot(food.Value.x - c.x, food.Value.y - c.y) * K.tikowNaKafel); return; }
                sim.foodMiss++;
                if (d.eatsMeat && !sim.spokojnySwiat && !sim.rozejm)
                {
                    var prey = sim.nearestCreature(c.x, c.y, K.polowanieZasieg, o => o.id != c.id && o.clan != c.clan && (o.race != c.race || c.hunger > K.kanibalizmOd) && !sim.pokojMiedzy(c.clan, o.clan))
                        ?? (c.hunger > K.glodSlepy && rolaPostaci(c) == null ? sim.nearestCreature(c.x, c.y, K.polowanieZasieg, o => o.id != c.id) : null);
                    if (prey != null) { c.job = Job.FIGHT; sim.target.set(c.id, prey.id); c.jt = K.polowanieTikow; return; }
                }
            }

            // Pielgrzymka pod rdzeń (patrz TS)
            if (d.faithGain > 0 && rolaPostaci(c) == "pobozny" && sim.tick >= (c.bezModlitwyDo ?? 0) && clan.devotion > P.oddanieNacji && c.devotion > P.oddanieWlasne && c.hunger < P.najedzony
                && clan.pop >= P.minNacja && sim.crowding[c.race] < P.maxZatloczenie
                && pielgrzymowKlanu(sim, clan.id) < Math.Min(P.maxPielgrzymow, Math.Max(P.minPielgrzymow, Math.Floor(clan.pop * P.czescNacji)))
                && (sim.jedzeniePrzedsionka >= P.jedzenieWPrzedsionku || powrotSpodRdzenia(sim, c, clan)))
            {
                var dystans = JS.Hypot(c.x - w.coreX, c.y - w.przedsionekY);
                var chec = P.szansa + P.szansaBliskosc * Math.Max(0, 1 - dystans / P.zasiegBliskosci);
                if (sim.rng.chance(chec))
                {
                    c.job = Job.PIELGRZYM;
                    c.jx = miejsceWSzeregu(sim, c);
                    c.jy = w.przedsionekY;
                    c.jt = P.wyprawaTikow; c.dig = 0; return;
                }
            }

            if (c.carry > 0)
            {
                c.job = Job.HAUL; c.jx = clan.hx; c.jy = clan.hy; c.jt = K.noszenieTikow;
                var droga = szukajDrogi(sim, c, (_i, x, y) => Math.Abs(x - clan.hx) <= K.noszenieBliskoGniazda && Math.Abs(y - clan.hy) <= K.noszenieBliskoGniazda, K.noszenieLimit);
                if (droga != null) { naDroge(droga, clan.hx, clan.hy); c.jt = K.noszenieTikow + droga.Count * K.tikowNaKafel; }
                return;
            }

            // klan bez ognia przestaje istnieć — odbudowa kuźni jest ważniejsza niż wszystko
            if (c.race == Race.DWARF && clan.forges.Count == 0 && clan.stock >= LUDY.kosztKuzni && sim.canBuild(c))
            {
                c.job = Job.BUILD; c.jt = K.kuzniaTikow;
                var plac = w.idx(c.jx, c.jy);
                var droga = szukajDrogi(sim, c, (i, _x, _y) => i == plac, K.kuzniaLimit);
                if (droga != null) { naDroge(droga, c.jx, c.jy); c.jt = K.kuzniaTikow + droga.Count * K.tikowNaKafel; }
                return;
            }

            if (c.race == Race.DWARF && clan.stock < K.zuzlowcyKopiaDo && c.hunger < K.zuzlowcyKopiaGlod)
            {
                double ruda = -1;
                var droga = szukajDrogi(sim, c, (_i, x, y) =>
                {
                    ruda = swietoscObok(x, y, t => t == T.ORE || t == T.CRYSTAL);
                    return ruda >= 0 && !sim.przyMagmie(ruda % w.w, JS.ToInt32(ruda / w.w));
                }, K.zuzlowcyRudaLimit);
                if (droga != null && ruda >= 0)
                {
                    naDroge(droga, ruda % w.w, JS.ToInt32(ruda / w.w));
                    c.job = Job.DIG; c.jt = K.zuzlowcyRudaTikow + droga.Count * K.tikowNaKafel;
                    keepDig(); return;
                }
                var ore = sim.findTile(c.x, c.y, K.rudaZasieg, (t, _x, _y) => t == T.ORE || t == T.CRYSTAL);
                if (ore != null)
                {
                    var dist = JS.Hypot(ore.Value.x - c.x, ore.Value.y - c.y);
                    c.job = Job.DIG; c.jx = ore.Value.x; c.jy = ore.Value.y; c.jt = K.zuzlowcyRudaTikow + JS.Round(dist * K.tikowNaKafelKopania);
                    keepDig(); return;
                }
            }

            // rytuał: ofiara z własnych dzieci (Remake v1: ofiara tylko z twojej woli)
            if (!REMAKE && c.race == Race.GOBLIN && clan.devotion > K.ofiaraOddanie && clan.pop > K.ofiaraMinKlan && sim.rng.chance(K.ofiaraSzansa))
            {
                double oltarz = -1;
                var droga = szukajDrogi(sim, c, (_i, x, y) => (oltarz = swietoscObok(x, y, t => t == T.SHRINE || t == T.GLYPH)) >= 0, K.ofiaraLimit);
                if (droga != null && oltarz >= 0) { naDroge(droga, oltarz % w.w, JS.ToInt32(oltarz / w.w)); c.job = Job.SACRIFICE; c.jt = K.ofiaraTikow + droga.Count * K.tikowNaKafel; return; }
                var shrine = sim.findTile(c.x, c.y, K.ofiaraZasieg, (t, _x, _y) => t == T.SHRINE || t == T.GLYPH);
                if (shrine != null) { c.job = Job.SACRIFICE; c.jx = shrine.Value.x; c.jy = shrine.Value.y; c.jt = K.ofiaraTikow; return; }
            }

            // Rozmnaża się wyłącznie Ślepy Lud (Remake v1: nikt się nie rodzi)
            var miejsce = Math.Max(0, Math.Min(1, (K.rozrodTlok - sim.crowding[c.race]) * K.rozrodCzulosc));
            if (!REMAKE && c.race == Race.GOBLIN && clan.pop < clan.cap && miejsce > 0
                && sim.popByRace[c.race] < sim.raceCap[c.race]
                && c.hunger < K.rozrodGlod && c.age > K.rozrodWiek && sim.rng.chance(RACES[c.race].breedRate * cechaNacji(clan).rozrod * miejsce))
            {
                c.job = Job.BREED; c.jt = K.rozrodTikow;
                if (JS.Hypot(clan.hx - c.x, clan.hy - c.y) > K.rozrodDoGniazda)
                {
                    var droga = szukajDrogi(sim, c, (_i, x, y) => Math.Abs(x - clan.hx) <= K.noszenieBliskoGniazda && Math.Abs(y - clan.hy) <= K.noszenieBliskoGniazda, K.rozrodLimit);
                    if (droga != null) { naDroge(droga, clan.hx, clan.hy); c.jt = K.rozrodTikow + droga.Count * K.tikowNaKafel; }
                }
                return;
            }

            // modlitwa albo praca — zależnie od tego, jak dana rasa cię czci
            if (d.faithGain > 0 && c.race != Race.TROLL && sim.tick >= (c.bezModlitwyDo ?? 0) && sim.rng.chance((K.modlitwaSzansa + clan.devotion * K.modlitwaOdOddania) * mnoznik(sim, c, "modlitwa")))
            {
                bool swiete(double t) => t == (c.race == Race.DWARF ? T.FORGE : T.SHRINE) || t == T.GLYPH || t == T.CORE;
                double cel = -1;
                var droga = szukajDrogi(sim, c, (_i, x, y) => (cel = swietoscObok(x, y, swiete)) >= 0, K.modlitwaLimit);
                if (droga != null && cel >= 0) { naDroge(droga, cel % w.w, JS.ToInt32(cel / w.w)); c.job = Job.PRAY; c.jt = K.modlitwaTikow + droga.Count * K.tikowNaKafel; return; }
                var holy = sim.findTile(c.x, c.y, K.modlitwaZasieg, (t, _x, _y) => swiete(t));
                if (holy != null) { c.job = Job.PRAY; c.jx = holy.Value.x; c.jy = holy.Value.y; c.jt = K.modlitwaTikow; return; }
                if (sim.canBuild(c)) { c.job = Job.BUILD; c.jt = K.budowaTikow; return; }
            }

            // kopanie: ruda ciągnie, ale pusty korytarz też trzeba komuś wydrążyć
            if (d.digPower > 0 && (rolaPostaci(c) ?? "robotnik") == "robotnik" && sim.rng.chance(K.kopanieSzansa))
            {
                double ruda = -1;
                var droga = szukajDrogi(sim, c, (_i, x, y) =>
                {
                    ruda = swietoscObok(x, y, t => t == T.ORE || (c.race == Race.DWARF && t == T.CRYSTAL));
                    return ruda >= 0 && !sim.przyMagmie(ruda % w.w, JS.ToInt32(ruda / w.w));
                }, K.kopanieLimit);
                if (droga != null && ruda >= 0)
                {
                    naDroge(droga, ruda % w.w, JS.ToInt32(ruda / w.w));
                    c.job = Job.DIG; c.jt = K.kopanieTikow + droga.Count * K.tikowNaKafel;
                    keepDig(); return;
                }
                var ore = sim.findTile(c.x, c.y, K.rudaZasieg, (t, _x, _y) => t == T.ORE || (c.race == Race.DWARF && t == T.CRYSTAL));
                if (ore != null)
                {
                    var dist = JS.Hypot(ore.Value.x - c.x, ore.Value.y - c.y);
                    c.job = Job.DIG; c.jx = ore.Value.x; c.jy = ore.Value.y; c.jt = K.kopanieTikow + JS.Round(dist * K.tikowNaKafelKopania);
                    keepDig(); return;
                }
                c.job = Job.DIG;
                c.jx = Math.Floor(c.x) + sim.rng.@int(K.kopanieLosoweX * 2 + 1) - K.kopanieLosoweX;
                c.jy = Math.Floor(c.y) + sim.rng.@int(9) - 3;
                c.jt = K.kopanieTikowLosowe; c.dig = 0; return;
            }

            c.job = Job.WANDER;
            if (rolaPostaci(c) == "rycerz")
            {
                c.jx = clan.hx + sim.rng.range(-8, 8);
                c.jy = clan.hy + sim.rng.range(-3, 3);
                return;
            }
            c.jx = c.x + sim.rng.range(-K.spacerX, K.spacerX);
            // Remake v1: lud spaceruje w poziomie
            c.jy = REMAKE && rolaPostaci(c) != null ? c.y + sim.rng.range(-1, 1) : c.y + sim.rng.range(-K.spacerY, K.spacerY);
        }
    }
}
