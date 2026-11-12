// Port: alpha-1/src/sim/creatures.ts — część 3: planujLud, wkopDroga, wkopSieDoSpizarni, stanPrzyObozie, planRobotnika
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyStworzenia;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Nastawy.NastawyWiadro;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawyZbroja;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Rytual;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.Wiadro;
using static Trzewia.Symulacja.Brama;
using static Trzewia.Symulacja.Oltarz;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.Zbroja;
using static Trzewia.Symulacja.BudowaSchodow;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Zapamiętuje drogę i ustawia cel zajęcia na jej końcu (albo na podanym kaflu).</summary>
    public delegate void NaDrogeF(List<double> droga, double? cx = null, double? cy = null);
    /// <summary>Zamiar — co teraz robi i do kiedy się tego trzyma.</summary>
    public delegate void ZamiarF(string opis, int job, double jt);
    /// <summary>Droga (bez kopania) do pierwszego kafla spełniającego warunek albo null.</summary>
    public delegate List<double>? DrogaF(Func<double, double, bool> cel, double limit);
    /// <summary>Ile tików na podróż daną drogą.</summary>
    public delegate double PodrozF(List<double> d);

    public static partial class Stworzenia
    {
        // ------------------------------------------------------------- Remake v1: zamiary ludu
        /// <summary>
        /// Planer ludu: każdy dostaje jeden zamiar z celem i trzyma się go `LUD.zamiarTikow` albo do osiągnięcia celu.
        /// Przerywa go tylko to, co pilne: głód, wróg, szept.
        /// </summary>
        static void planujLud(Sim sim, Creature c)
        {
            var w = sim.world;
            var clan = sim.clans[c.clan];
            var rola = rolaPostaci(c)!;
            var Z = LUD.zamiarTikow;
            // z pustymi rękami nikomu nic nie niesie
            if (c.carry == 0) { c.dostawaDla = null; c.doObozu = null; }
            var kopal = c.kopieDroge == true;
            c.kopieDroge = false;
            c.modliPrzyObozie = false;
            c.czynnosc = null;
            // (6.11: przydział do budowy schodów wybiera się od nowa)
            c.budowa = null;
            NaDrogeF naDroge = (dr, cx, cy) =>
            {
                c.droga = dr; c.drogaI = 0; c.drogaKopie = false;
                if (cx != null && cy != null) { c.jx = cx.Value; c.jy = cy.Value; return; }
                var k = dr.Count > 0 ? dr[dr.Count - 1] : w.idx(Math.Floor(c.x), Math.Floor(c.y));
                c.jx = k % w.w; c.jy = JS.ToInt32(k / w.w);
            };
            ZamiarF zamiar = (opis, job, jt) => { c.zamiar = opis; c.job = job; c.jt = jt; c.zamiarDo = sim.tick + jt; };
            DrogaF droga = (cel, limit) => szukajDrogi(sim, c, (_i, x, y) => cel(x, y), limit);
            PodrozF podroz = d => K.noszenieTikow + d.Count * K.tikowNaKafel;

            // etap 3d: odprawia rytuał przy ołtarzu — klęczy przy nim, aż skończy
            var rytual = odprawia(sim, c);
            if (rytual != null) { klecz(sim, c, rytual, naDroge, zamiar, droga, podroz); return; }

            // etap 3: zwykła fala Strażników — kto nie jest rycerzem, odchodzi spod rdzenia
            var glodnyBezpieczny = c.hunger > LUD.glodSam && !zywiStraznicy(sim).Any(s => JS.Hypot(s.x - c.x, s.y - c.y) < STRAZNICY.glodnyNieUciekaOd);
            var czeka = walczacy(c) && rycerzeCzekaja(sim);
            if ((falaZwykla(sim) || czeka) && (!walczacy(c) || czeka) && !(rola == "pobozny" && trybWiernych(sim)) && !glodnyBezpieczny && wStrefieStraznikow(sim, c.x, c.y, STRAZNICY.ucieczkaZapas))
            {
                var skraj = czeka ? droga((x, y) => !wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas) && wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas + 6) && stoi(sim, x, y) && !sim.przyMagmie(x, y, 3), LUD.dostawaLimit) : null;
                if (skraj != null) { naDroge(skraj); zamiar($"czeka na skraju, aż zbierze się ich dość ({JS.S(iluRycerzy(sim))}/{JS.S(STRAZNICY.rycerzyNaBossa)})", Job.WANDER, podroz(skraj)); return; }
                var sp = obozyWgOdleglosci(sim, c.x, c.y).FirstOrDefault(o => !wStrefieStraznikow(sim, o.x, o.y, STRAZNICY.ucieczkaZapas));
                var d = (sp != null ? droga((x, y) => Math.Abs(x - sp.x) <= 3 && Math.Abs(y - sp.y) <= 2 && stoi(sim, x, y), LUD.dostawaLimit) : null)
                    ?? droga((x, y) => !wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas) && stoi(sim, x, y), LUD.dostawaLimit);
                if (d != null) { naDroge(d); zamiar(czeka ? $"czeka na towarzyszy — na bossa ruszą, gdy będzie ich {JS.S(STRAZNICY.rycerzyNaBossa)}" : "odchodzi z krypty przed Strażnikami Snu", Job.WANDER, podroz(d)); return; }
            }
            // pielgrzym trzyma się wyprawy, aż dojdzie (albo aż ty ją przerwiesz)
            if ((c.job == Job.PIELGRZYM || c.wyprawa == true) && sim.tick >= (c.bezModlitwyDo ?? 0) && c.hunger < LUD.glodSam)
            {
                if (drogaNiegotowa(sim, c) || falaZwykla(sim))
                {
                    c.wyprawa = true;
                    if (falaZwykla(sim))
                    {
                        if (!stanPrzyObozie(sim, c, naDroge, droga)) { c.jx = Math.Floor(c.x); c.jy = Math.Floor(c.y); c.droga = null; }
                        zamiar("czeka z dala od krypty, aż fala Strażników minie", Job.STOI, Z);
                        return;
                    }
                    if (stanPrzyObozie(sim, c, naDroge, droga))
                    {
                        c.modliPrzyObozie = true;
                        zamiar("czeka przy obozie, aż robotnicy dokopią drogę do krypty", Job.STOI, Z);
                        return;
                    }
                }
                if (c.job != Job.PIELGRZYM) { c.jx = miejsceWSzeregu(sim, c); c.jy = w.przedsionekY; c.dig = 0; }
                c.wyprawa = true;
                zamiar("schodzi do krypty i modli się przy pomniku", Job.PIELGRZYM, P.wyprawaTikow);
                return;
            }

            // --- głód: robotnik je sam; pobożni i rycerze czekają na dostawę, chyba że już ledwo żyją
            var robotnikow = liczRole(sim).robotnik;
            var spB = najblizszaSpizarnia(sim, c.x, c.y, true);
            var dalekoOdJedzenia = spB == null || JS.Hypot(spB.x - c.x, spB.y - c.y) > LUD.daleko;
            var progRobotnika = kopal && robotnikow > 1 ? LUD.glodSam : dalekoOdJedzenia ? LUD.glodDostawy : K.idzieJesc;
            var spizarniaObok = spB != null && JS.Hypot(spB.x - c.x, spB.y - c.y) <= LUD.spizarniaObok;
            var glodny = rola == "robotnik" ? c.hunger > progRobotnika
                : c.hunger > LUD.glodSam || (robotnikow == 0 && c.hunger > K.idzieJesc) || (spizarniaObok && c.hunger > LUD.glodDostawy);
            var odOgnia = sim.tick - (c.odOgnia ?? -1e9) < Z;   // świeżo uciekł od ognia — nie wraca w jego stronę
            // Remake v2: skrajnie głodny nie czeka, aż wiadro zjedzie — biegnie pod jego linę i wspina się do niego
            if (c.hunger >= WIADRO.wspinaczkaOd && c.carry == 0)
            {
                var wd = wiadroDoWspinaczki(sim, c);
                var d = wd != null ? droga((x, y) => x == wd.x && y == wd.cel, LUD.doSpizarni) : null;
                if (wd != null && d != null) { naDroge(d, wd.x, wd.cel); c.linaDo = wd.id; zamiar("umiera z głodu — biegnie pod linę zjeżdżającego wiadra", Job.LINA, podroz(d) + 600); return; }
            }
            if (glodny && c.carry == 0)
            {
                var wFali = falaZwykla(sim) && (!walczacy(c) || rycerzeCzekaja(sim));
                if (sim.tick >= (c.bezSpizarniDo ?? 0))
                {
                    foreach (var sp in spizarnieWgOdleglosci(sim, c.x, c.y, true).Where(sp => (!odOgnia || !sim.przyMagmie(sp.x, sp.y, 4)) && !(wFali && wStrefieStraznikow(sim, sp.x, sp.y, STRAZNICY.ucieczkaZapas))).Take(3).ToList())
                    {
                        var d = droga((x, y) => Math.Abs(x - sp.x) <= 1 && Math.Abs(y - sp.y) <= 1, LUD.doSpizarni);
                        if (d != null) { naDroge(d, sp.x, sp.y); zamiar("idzie jeść do wiadra", Job.ZAPAS, podroz(d)); return; }
                    }
                    // Alpha, etap 3d: jedno wiadro właśnie zjeżdża tam, dokąd dojdzie — czeka pod nim
                    foreach (var wd in wiadra(sim).ToList())
                    {
                        if (wd.porcje <= 0 || (wd.faza != "zapowiedz" && wd.faza != "zjezdza") || JS.Hypot(wd.x - c.x, wd.cel - c.y) > 30) continue;
                        if (wFali && wStrefieStraznikow(sim, wd.x, wd.cel, STRAZNICY.ucieczkaZapas)) continue;
                        var d = droga((x, y) => Math.Abs(x - wd.x) <= 1 && Math.Abs(y - wd.cel) <= 1, LUD.doSpizarni);
                        if (d != null) { naDroge(d, wd.x, wd.cel); zamiar("głodny — czeka na wiadro, które zjeżdża", Job.STOI, podroz(d) + 120); return; }
                    }
                }
            }

            // --- niesie jedzenie: głodnemu albo do najbliższej spiżarni
            if (c.carry > 0)
            {
                var komu = c.dostawaDla != null ? sim.creatureById(c.dostawaDla.Value) : null;
                if (komu != null && !komu.dead && komu.hunger > 0.1)
                {
                    // 6.11: za zamkniętą kratą lochu niesie się pod kratę
                    var krata = zaKrata(sim, komu);
                    double kx = krata ? podKrata(sim).x : Math.Floor(komu.x), ky = krata ? podKrata(sim).y : Math.Floor(komu.y);
                    var d = krata
                        ? droga((x, y) => x == kx && y == ky, LUD.dostawaLimit)
                        : droga((x, y) => Math.Abs(x - kx) <= 1 && Math.Abs(y - ky) <= 1, LUD.dostawaLimit);
                    if (d != null || (!REMAKE && budzetDrog() > 0))
                    {
                        c.jx = kx; c.jy = ky;
                        if (d != null) naDroge(d, c.jx, c.jy);
                        zamiar($"niesie jedzenie: {(komu.rola == "rycerz" ? "rycerz" : "pobożny")} #{JS.S(komu.id)}", Job.DOSTAWA, d != null ? podroz(d) : Z);
                        return;
                    }
                    if (budzetDrog() <= 0) { zamiar("zastanawia się, którędy iść", Job.STOI, 30); return; }
                }
                c.dostawaDla = null; c.doObozu = null;
                // nie ma komu — odnosi porcję do najbliższego wiadra
                var sp = najblizszaSpizarnia(sim, c.x, c.y, false);
                if (sp != null)
                {
                    var d = droga((x, y) => Math.Abs(x - sp.x) <= 1 && Math.Abs(y - sp.y) <= 1, LUD.dostawaLimit);
                    if (d != null || !REMAKE)
                    {
                        c.jx = sp.x; c.jy = sp.y;
                        if (d != null) naDroge(d, sp.x, sp.y);
                        zamiar("odnosi jedzenie do wiadra", Job.HAUL, d != null ? podroz(d) : Z);
                        return;
                    }
                }
            }

            // Alpha: rozkaz gracza — przed zwykłymi zajęciami
            if (c.polecenie != null && planPolecenia(sim, c, rola, naDroge, zamiar, droga, podroz)) return;

            // (robotnik w hełmie w czasie fali Strażników żyje jak rycerz)
            if (rola == "robotnik" && !(c.helm == true && falaTrwa(sim))) { planRobotnika(sim, c, naDroge, zamiar, droga, podroz); return; }
            if (rola == "pobozny")
            {
                var d = RACES[c.race];
                if (d.faithGain > 0 && sim.tick >= (c.bezModlitwyDo ?? 0) && clan.devotion > P.oddanieNacji && c.devotion > P.oddanieWlasne && c.hunger < P.najedzony
                    && pielgrzymowKlanu(sim, clan.id) < Math.Min(P.maxPielgrzymow, Math.Max(P.minPielgrzymow, Math.Floor(clan.pop * P.czescNacji)))
                    && (sim.jedzeniePrzedsionka >= P.jedzenieWPrzedsionku || powrotSpodRdzenia(sim, c, clan)) && sim.rng.chance(0.35))
                {
                    c.wyprawa = true;
                    if (drogaNiegotowa(sim, c) && stanPrzyObozie(sim, c, naDroge, droga))
                    {
                        c.modliPrzyObozie = true;
                        zamiar("czeka przy obozie, aż robotnicy dokopią drogę do krypty", Job.STOI, Z);
                        return;
                    }
                    c.jx = miejsceWSzeregu(sim, c); c.jy = w.przedsionekY; c.dig = 0;
                    zamiar("schodzi do krypty i modli się przy pomniku", Job.PIELGRZYM, P.wyprawaTikow);
                    return;
                }
                if (sim.tick >= (c.bezModlitwyDo ?? 0))
                {
                    // ołtarz albo znak w pobliżu obozu
                    double cel = -1;
                    bool swiete(double t) => t == T.SHRINE || t == T.GLYPH;
                    var dd = szukajDrogi(sim, c, (_i, x, y) =>
                    {
                        for (var yy = -1; yy <= 1; yy++) for (var xx = -1; xx <= 1; xx++) if (w.inb(x + xx, y + yy) && swiete(w.tile[w.idx(x + xx, y + yy)])) { cel = w.idx(x + xx, y + yy); return true; }
                        return false;
                    }, K.modlitwaLimit);
                    if (dd != null && cel >= 0 && dd.Count < 30) { naDroge(dd, cel % w.w, JS.ToInt32(cel / w.w)); zamiar("modli się przy ołtarzu", Job.PRAY, podroz(dd) + Z); return; }
                    if (sim.rng.chance(0.15) && sim.canBuild(c)) { zamiar("stawia ołtarz przy obozie", Job.BUILD, K.budowaTikow * 3); return; }
                }
                if (stanPrzyObozie(sim, c, naDroge, droga))
                {
                    c.modliPrzyObozie = sim.tick >= (c.bezModlitwyDo ?? 0);
                    zamiar(c.modliPrzyObozie == true ? "modli się przy obozie" : "odpoczywa przy obozie", Job.STOI, Z);
                    return;
                }
            }
            if (rola == "rycerz" || (rola == "robotnik" && c.helm == true))
            {
                // etap 3f: na wieszaku w kuźni czeka część zbroi, a fali nie ma — idzie ją założyć i wraca
                if (!falaTrwa(sim) && idziePoZbroje(sim, c))
                {
                    var r = planZbroi(sim, c, null, naDroge, zamiar, droga, podroz);
                    if (r == "zaklada" || r == "idzie") return;
                    if (r == "nie dojdzie") c.zbrojaBezDo = sim.tick + ZBROJA.ponowPo;
                }
                // za mało rycerzy na bossa — czekają na skraju strefy z bronią w ręku
                if (rycerzeCzekaja(sim))
                {
                    c.jx = Math.Floor(c.x); c.jy = Math.Floor(c.y); c.droga = null;
                    zamiar($"czeka na skraju, aż zbierze się ich dość ({JS.S(iluRycerzy(sim))}/{JS.S(STRAZNICY.rycerzyNaBossa)}) — broni się, gdy coś podejdzie", Job.STOI, Z);
                    return;
                }
                if (wartaPotrzebna(sim) && !rycerzeCzekaja(sim) && w.brama.x1 >= w.brama.x0 && !bramaOtwarta(sim) && !w.wLochu(c.x, c.y) && czoloDrogi(sim) < 0)
                {
                    // 6.11: warta jest w lochu, a brama zamknięta — rycerz czeka pod nią na przedprożu
                    var pp = w.przedproze;
                    var d = droga((x, y) => x >= pp.x0 && x <= pp.x1 && y >= pp.y0 && y <= pp.y1 && stoi(sim, x, y), LUD.dostawaLimit);
                    if (d != null) { naDroge(d); zamiar("czeka pod stalową bramą lochu — warta modli się w środku", Job.WARTA, podroz(d) + Z); return; }
                }
                if (wartaPotrzebna(sim) && !rycerzeCzekaja(sim))
                {
                    double strona = JS.Tak(c.id % 2) ? -1 : 1;
                    bool naPoscie(double x, double y, double s)
                    {
                        var od = (x - w.coreX) * s;
                        return od > P.przedsionekX && od <= P.przedsionekX + LUD.wartaOdstep + 8 && Math.Abs(y - w.przedsionekY) <= 6 && stoi(sim, x, y) && !sim.przyMagmie(x, y, 3);
                    }
                    var d = droga((x, y) => naPoscie(x, y, strona), LUD.dostawaLimit) ?? droga((x, y) => naPoscie(x, y, -strona), LUD.dostawaLimit);
                    if (d != null) { naDroge(d); zamiar("trzyma wartę w krypcie, z boku modlących się", Job.WARTA, podroz(d) + Z); return; }
                }
                if (stanPrzyObozie(sim, c, naDroge, droga)) { zamiar("pilnuje obozu", Job.STOI, Z); return; }
            }
            // nie ma dokąd iść — z odciętej kieszeni wkopuje się do spiżarni, inaczej stoi, gdzie jest
            if (wkopSieDoSpizarni(sim, c, zamiar)) return;
            c.jx = Math.Floor(c.x); c.jy = Math.Floor(c.y);
            zamiar("czeka", Job.STOI, Z);
        }

        /// <summary>Remake v2: droga z kopaniem do celu (`szukajKopiac`). Ustawia ją jako drogę postaci.</summary>
        static List<double>? wkopDroga(Sim sim, Creature c, Func<double, double, bool> cel, double limit = 5000)
        {
            var w = sim.world;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            if (!w.inb(cx, cy)) return null;
            var r = szukajKopiac(sim, new List<double> { w.idx(cx, cy) }, (_i, x, y) => cel(x, y), new OpcjeKopania { koszt = kosztKuciaLudu(sim, true), limit = limit });
            if (r == null || r.droga.Count == 0) return null;
            c.droga = r.droga; c.drogaI = 0; c.drogaKopie = true;
            var k = r.droga[r.droga.Count - 1];
            c.jx = k % w.w; c.jy = JS.ToInt32(k / w.w);
            return r.droga;
        }

        /// <summary>Remake v1: kto utknął w kieszeni, z której nie prowadzi żadna droga, wkopuje się w stronę najbliższej spiżarni.</summary>
        static bool wkopSieDoSpizarni(Sim sim, Creature c, ZamiarF zamiar)
        {
            if (c.hunger <= LUD.glodSam || budzetDrog() < 3) return false;
            var sp = najblizszaSpizarnia(sim, c.x, c.y, false) ?? najblizszyOboz(sim, c.x, c.y);
            if (sp == null || JS.Hypot(sp.x - c.x, sp.y - c.y) <= 3) return false;
            var sps = spizarnieWgOdleglosci(sim, c.x, c.y, false).Concat(obozyLudu(sim)).ToList();
            var d = szukajDrogi(sim, c, (_i, x, y) => sps.Any(o => Math.Abs(o.x - x) <= 1 && Math.Abs(o.y - y) <= 1), LUD.doSpizarni);
            if (d != null || budzetDrog() < 1) return false;
            c.jx = sp.x; c.jy = sp.y; c.droga = null;
            var dk = wkopDroga(sim, c, (x, y) => sps.Any(o => Math.Abs(o.x - x) <= 2 && Math.Abs(o.y - y) <= 1) && stoi(sim, x, y), LUD.wkopDoSpizarni);
            zamiar("wkopuje się z odciętej kieszeni do swoich", Job.WANDER, dk != null ? K.noszenieTikow + dk.Count * K.tikowNaKafelKopania * 2 : LUD.zamiarTikow);
            return true;
        }

        /// <summary>Miejsce do stania przy najbliższym obozie (siedzibie albo obozie ze spiżarnią) — każdy ma swoje.</summary>
        static bool stanPrzyObozie(Sim sim, Creature c, NaDrogeF naDroge, DrogaF droga)
        {
            MiejsceJedzenia? sp;
            if (walczacy(c))
            {
                var stary = c.posterunek != null ? obozyLudu(sim).FirstOrDefault(o => o.x == c.posterunek.x && o.y == c.posterunek.y) : null;
                sp = wyprawaTrwa(sim) ? obozFrontowy(sim) : stary ?? najblizszyOboz(sim, c.x, c.y) ?? obozFrontowy(sim);
                c.posterunek = sp != null ? new XY(sp.x, sp.y) : null;
            }
            else sp = stacjonuje(c) ? obozFrontowy(sim) : najblizszyOboz(sim, c.x, c.y);
            // etap 3: w czasie fali Strażników nie-walczący nie stają przy obozie pod rdzeniem
            if (sp != null && (!walczacy(c) ? falaZwykla(sim) : rycerzeCzekaja(sim)) && wStrefieStraznikow(sim, sp.x, sp.y, STRAZNICY.ucieczkaZapas))
            {
                sp = obozyWgOdleglosci(sim, c.x, c.y).FirstOrDefault(o => !wStrefieStraznikow(sim, o.x, o.y, STRAZNICY.ucieczkaZapas));
            }
            if (sp == null) return false;
            var r = walczacy(c) ? 5 : 2;
            var px = sp.x + (JS.Tak(c.id % 2) ? -1 : 1) * (r + (JS.ToInt32(c.id) >> 1) % 3);
            bool sucho(double x, double y) => sim.world.water[sim.world.idx(x, y)] < 3 && !sim.przyMagmie(x, y, 3);
            var spx = sp.x; var spy = sp.y;
            var d = droga((x, y) => Math.Abs(x - px) <= 1 && Math.Abs(y - spy) <= 3 && stoi(sim, x, y) && sucho(x, y), LUD.doSpizarni)
                ?? droga((x, y) => Math.Abs(x - spx) <= 6 && Math.Abs(y - spy) <= 3 && stoi(sim, x, y) && sucho(x, y), LUD.doSpizarni);
            if (d == null) return false;
            naDroge(d);
            return true;
        }

        /// <summary>Robotnik bez rozkazu: nosi jedzenie z wiader tym, którzy stoją daleko, a poza tym odpoczywa przy obozie.</summary>
        static void planRobotnika(Sim sim, Creature c, NaDrogeF naDroge, ZamiarF zamiar, DrogaF droga, PodrozF podroz)
        {
            var Z = LUD.zamiarTikow;
            if (c.carry == 0) c.dostawaDla = null;
            // etap 4: w czasie zwykłej fali Strażników robotnik nie bierze zadań w ich strefie
            Func<double, double, bool> strefa = falaZwykla(sim) ? (x, y) => wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas) : (Func<double, double, bool>)((x, y) => false);
            // 1. dostawa: z najbliższego wiadra z jedzeniem do głodnego
            var komu = glodnyDoNakarmienia(sim, c);
            bool dojdzie(Creature o)
            {
                if (zaKrata(sim, o)) { var pk = podKrata(sim); return droga((x, y) => x == pk.x && y == pk.y, LUD.dostawaLimit) != null; }
                return droga((x, y) => Math.Abs(x - Math.Floor(o.x)) <= 1 && Math.Abs(y - Math.Floor(o.y)) <= 1, LUD.dostawaLimit) != null;
            }
            XY? dokad = komu != null && zaKrata(sim, komu) ? podKrata(sim) : komu != null ? new XY(komu.x, komu.y) : null;
            if (komu != null && dokad != null && !strefa(dokad.x, dokad.y) && dojdzie(komu))
            {
                foreach (var sp in spizarnieWgOdleglosci(sim, c.x, c.y, true).Take(3).ToList())
                {
                    var d = droga((x, y) => Math.Abs(x - sp.x) <= 1 && Math.Abs(y - sp.y) <= 1, LUD.dostawaLimit);
                    if (d != null)
                    {
                        naDroge(d, sp.x, sp.y); c.dostawaDla = komu.id; c.bezczynnyOd = null;
                        zamiar($"bierze jedzenie z wiadra dla: {(komu.rola == "rycerz" ? "rycerz" : "pobożny")} #{JS.S(komu.id)}", Job.ZBIERA, podroz(d));
                        return;
                    }
                }
            }
            // 2. świeżo uciekł od ognia — przeczekuje z dala od niego
            if (sim.tick - (c.odOgnia ?? -1e9) < Z)
            {
                if (wkopSieDoSpizarni(sim, c, zamiar)) return;
                c.jx = Math.Floor(c.x); c.jy = Math.Floor(c.y);
                zamiar("czeka z dala od ognia", Job.STOI, Z);
                return;
            }
            // 3. 6.11: pomaga przy budowie schodów drogi wiernych — robotnik, który od dawna nie ma co robić
            if (c.bezczynnyOd != null && sim.tick - c.bezczynnyOd >= BUDOWA_SCHODOW.bezczynnyPo
                && budujSchody(sim, c, naDroge, zamiar, droga, podroz, true)) return;
            // 4. odpoczywa przy obozie — czeka na rozkaz
            if (stanPrzyObozie(sim, c, naDroge, droga))
            {
                c.bezczynnyOd ??= sim.tick;
                zamiar("odpoczywa przy obozie — czeka na rozkaz", Job.STOI, Z);
                return;
            }
            if (wkopSieDoSpizarni(sim, c, zamiar)) return;
            c.jx = Math.Floor(c.x); c.jy = Math.Floor(c.y);
            zamiar("czeka na rozkaz", Job.STOI, Z);
        }
    }
}
