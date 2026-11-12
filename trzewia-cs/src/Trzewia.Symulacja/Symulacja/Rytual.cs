// Port: alpha-1/src/sim/rytual.ts
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyCzas;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Wiadro;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.Pomnik;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.Stworzenia;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class StanRytualu
    {
        /// <summary>Postęp nacji, która jest najbliżej przebicia — tylko do pokazania graczowi.</summary>
        public double postep;
        /// <summary>Nacja, która ostatnio ruszyła kamień.</summary>
        public double klan;
        public double wierni;
        public double pekniecia;
        /// <summary>Czy z przedsionka da się już dojść do rdzenia. Liczone z mapy, nie z licznika.</summary>
        public bool otwarta;
        /// <summary>Ile kafli skorupy stało w środkowej kolumnie na początku.</summary>
        public double skorupa;
        /// <summary>Strona, z której pęka skorupa: 'gora' | 'dol' | 'lewo' | 'prawo'.</summary>
        public string? strona;
    }

    /// <summary>
    /// Rytuał otwarcia rdzenia (Alpha, etap 5: modlitwa kruszy Wielki Pomnik) — postęp zapisuje się na nacji (patrz rytual.ts).
    /// </summary>
    public static class Rytual
    {
        static Typ_RYTUAL R => RYTUAL;
        static Typ_PIELGRZYMKA P => PIELGRZYMKA;

        public static void tikRytualu(Sim sim, StanRytualu stan)
        {
            var w = sim.world;
            if (stan.skorupa == 0) stan.skorupa = POMNIK.wlaczony ? POMNIK.pekniec : kamienNadRdzeniem(sim);
            var liczniki = new JsMap<double, double>();
            var kierunek = new JsMap<double, double[]>();
            double najlepszy = -1, ilu = 0;

            foreach (var c in sim.creatures)
            {
                if (c.dead || c.race == Race.HUMAN) continue;
                var wPrzedsionku = c.job == Job.PIELGRZYM && Math.Abs(c.x - w.coreX) < P.przedsionekX && Math.Abs(c.y - w.przedsionekY) < P.przedsionekY;
                if (!wPrzedsionku && (Math.Abs(c.x - w.coreX) > R.promien || Math.Abs(c.y - w.coreY) > R.promien)) continue;
                if (c.devotion < R.minOddanie) continue;
                var n = liczniki.getOr(c.clan, 0) + 1;
                liczniki.set(c.clan, n);
                var k = kierunek.getOr(c.clan, null!) ?? new double[] { 0, 0 };
                k[0] += c.x - (w.coreX + 0.5); k[1] += c.y - (w.coreY + 0.5);
                kierunek.set(c.clan, k);
                if (n > ilu) { ilu = n; najlepszy = c.clan; }
            }

            double razem = 0;
            foreach (var n in liczniki.values()) razem += n;
            foreach (var kv in liczniki)
            {
                var id = kv.Key;
                if (stan.otwarta || pomnikRozbity(sim)) break;
                var n = razem;
                if (n < R.potrzebaWiernych || id != najlepszy) continue;
                // etap 3: dopóki trwa fala Strażników Snu, skorupa nie pęka
                if (falaTrwa(sim)) continue;
                // droga wiernych (25.10): pomnik słucha tylko tych, którzy zeszli wykopaną drogą
                if (REMAKE && sim.planDrogi?.szyb != null && czoloDrogi(sim) >= 0) continue;
                var klan = sim.klan(id);
                if (klan == null) continue;
                if (klan.dead && n > 0) klan.dead = false;
                var opor = 1 + klan.pekniecia * R.oporNaPekniecie;
                var przed = klan.rytual;
                var laska = sim.koszmar ? R.koszmarMnoznik : 1;
                var wczesnie = R.wczesnieOd + (1 - R.wczesnieOd) * Math.Min(1, sim.tick / (TIKOW_NA_MINUTE * R.wczesnieMinut));
                klan.rytual = Math.Min(1, klan.rytual + R.tempo * laska * wczesnie * (Math.Min(R.maxWiernychLiczonych, n) / R.normaWiernych) * (R.podstawaOddania + klan.devotion) / opor);

                if (przed < R.kronikaStart && klan.rytual >= R.kronikaStart)
                {
                    sim.gdzie(w.coreX, w.przedsionekY)
                        .log(POMNIK.wlaczony ? $"{klan.name} zeszli do krypty nad Wielkim Pomnikiem i nie chcą odejść. Modlą się, a kamienny demon drży."
                            : $"{klan.name} zeszli pod twój rdzeń i nie chcą odejść. Modlą się do kamienia.", "wiara", $"rytual-start{JS.S(id)}");
                }
                else if (przed < R.kronikaPolowa && klan.rytual >= R.kronikaPolowa)
                {
                    sim.gdzie(w.coreX, w.przedsionekY)
                        .log(POMNIK.wlaczony ? "Modlitwa w krypcie nie cichnie. Kamień pomnika zaczyna się rysować." : "Modlitwa pod skorupą nie cichnie. Kamień zaczyna się rysować.", "otchlan", $"rytual-pol{JS.S(id)}");
                }

                if (klan.rytual >= 1) peknij(sim, stan, klan, id);
            }

            if (!POMNIK.wlaczony && !stan.otwarta && stan.pekniecia > 0 && sim.tick % R.sprawdzDrogeCo == 0) osuszPekniecia(sim);
            if (!POMNIK.wlaczony && !stan.otwarta && sim.tick % R.sprawdzDrogeCo == 0 && drogaDoRdzenia(sim))
            {
                stan.otwarta = true;
                sim.gdzie(w.coreX, w.coreY - 6).log("Droga do rdzenia stoi otworem.", "koniec", "skorupa-otwarta");
            }

            if (stan.otwarta && !falaTrwa(sim) && sim.tick % R.zejscieCo == 0)
            {
                var prowadzi = sim.klan(stan.klan >= 0 ? stan.klan : najlepszy);
                if (prowadzi != null)
                {
                    double idzie = 0, prob = 0;
                    foreach (var c in sim.creatures)
                    {
                        if (idzie >= R.zejscieNaRaz || prob >= R.zejscieProb) break;
                        if (c.dead || c.race == Race.HUMAN) continue;
                        if (c.clan != prowadzi.id && c.devotion <= R.zejscieObcyOddanie) continue;
                        if (c.devotion <= R.uwolnienieWlasne && prowadzi.devotion <= R.uwolnienieNacja) continue;
                        if (JS.Hypot(c.x - w.coreX, c.y - w.coreY) > R.zejscieZasieg) continue;
                        if (c.job == Job.DIG && c.jx == w.coreX && c.jy == w.coreY && c.droga != null) { idzie++; continue; }
                        prob++;
                        wyslijDoRdzenia(sim, c, R.zejscieTikow);
                        if (c.droga != null) idzie++;
                    }
                }
            }

            stan.wierni = razem;
            if (stan.klan < 0) stan.klan = najlepszy;
            double max = 0;
            foreach (var k in sim.clans) if (!k.dead && k.rytual > max) max = k.rytual;
            stan.postep = max;
        }

        /// <summary>Ile kafli kamienia stoi jeszcze w środkowej kolumnie nad rdzeniem.</summary>
        public static double kamienNadRdzeniem(Sim sim)
        {
            var w = sim.world;
            double n = 0;
            for (var y = w.coreY - R.kolumnaSkorupy; y <= w.coreY; y++)
                if (w.tile[w.idx(w.coreX, y)] == T.STONE) n++;
            return n;
        }

        /// <summary>Czy kafel leży w pustej komorze wokół rdzenia — wejście tam kończy drogę wiernych.</summary>
        public static bool wKomorze(Sim sim, double x, double y)
        {
            var w = sim.world;
            double dx = (x - w.coreX) / RDZEN.komoraX, dy = (y - w.coreY) / RDZEN.komoraY;
            return dx * dx + dy * dy <= 1 && w.passable(x, y);
        }

        /// <summary>Czy spoza skorupy da się DOJŚĆ do rdzenia — tą samą fizyką, którą ma lud.</summary>
        public static bool drogaDoRdzenia(Sim sim)
        {
            var w = sim.world; var W = w.w;
            double x0 = Math.Max(0, w.coreX - R.drogaPudloX), x1 = Math.Min(W - 1, w.coreX + R.drogaPudloX);
            double y0 = Math.Max(0, w.coreY - R.drogaPudloGora), y1 = Math.Min(w.h - 1, w.coreY + R.drogaPudloDol);
            bool wPudle(double x, double y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
            var widziane = new HashSet<double>();
            var kolejka = new List<double>();
            void dodaj(double j) { if (widziane.Add(j)) kolejka.Add(j); }
            for (var y = y0; y <= y1; y++)
            {
                for (var x = x0; x <= x1; x++)
                {
                    if (Math.Abs(x - w.coreX) <= R.drogaStartPozaPromieniem && Math.Abs(y - w.coreY) <= R.drogaStartPozaPromieniem) continue;
                    var i = w.idx(x, y);
                    if (wolny(sim, i, false)) dodaj(i);
                }
            }
            bool przyRdzeniu(double x, double y) => wKomorze(sim, x, y) ||
                w.get(x, y + 1) == T.CORE || w.get(x, y - 1) == T.CORE || w.get(x - 1, y) == T.CORE || w.get(x + 1, y) == T.CORE;
            for (var k = 0; k < kolejka.Count; k++)
            {
                var i = kolejka[k];
                double x = i % W, y = JS.ToInt32(i / W);
                if (przyRdzeniu(x, y)) return true;
                var naPodlodze = stoi(sim, x, y);
                var wisi = !naPodlodze && uchwyt(sim, x, y);
                if (!naPodlodze && y + 1 <= y1 && wolny(sim, i + W, false) && !(REMAKE && wisi && przepasc(sim, x, y + 1))) dodaj(i + W);
                if (!naPodlodze && !wisi) continue;
                if (y - 1 >= y0 && wolny(sim, i - W, false) && (REMAKE ? naPodlodze : uchwyt(sim, x, y - 1))) dodaj(i - W);
                foreach (var dx in new double[] { -1, 1 })
                {
                    var nx = x + dx;
                    if (!wPudle(nx, y)) continue;
                    var j = i + dx;
                    if (!wolny(sim, j, false)) continue;
                    var tamStoi = stoi(sim, nx, y);
                    if (wisi && !tamStoi) continue;
                    if (!tamStoi && nadOgniem(sim, nx, y)) continue;
                    if (REMAKE && przepasc(sim, nx, y)) continue;
                    dodaj(j);
                }
            }
            return false;
        }

        /// <summary>Na czym może osiąść okruch skorupy: pustka, grzybnia, kości, sieć.</summary>
        static bool osypiskoNa(double t) => t == T.AIR || t == T.FUNGUS || t == T.BONES || t == T.WEB;

        /// <summary>Wylot pęknięcia zawieszony nad jaskinią — okruchy osypują się pod nim w schody.</summary>
        static void podeprzyjWylot(Sim sim, double x, double y)
        {
            var w = sim.world;
            if (!w.inb(x, y + 1) || !wolny(sim, w.idx(x, y + 1), false) || stoi(sim, x, y + 1)) return;
            bool pusty(double xx, double yy) => w.inb(xx, yy) && wolny(sim, w.idx(xx, yy), false);
            bool ktos(double xx, double yy) => sim.creatures.Any(c => !c.dead && Math.Floor(c.x) == xx && Math.Floor(c.y) == yy);
            foreach (var dx in new double[] { -1, 1 })
            {
                var stopnie = new List<(double, double)>();
                var dno = false;
                for (double k = 0; k <= R.osypiskoMax; k++)
                {
                    double sx = x + k * dx, sy = y + 2 + k;
                    if (!pusty(sx, sy - 1) || !pusty(sx, sy - 2)) break;
                    if (!w.inb(sx, sy)) break;
                    if (w.solid(sx, sy)) { dno = true; break; }
                    if (!osypiskoNa(w.tile[w.idx(sx, sy)]) || ktos(sx, sy)) break;
                    stopnie.Add((sx, sy));
                }
                if (!dno) continue;
                foreach (var (sx, sy) in stopnie) w.set(sx, sy, T.STONE);
                return;
            }
        }

        /// <summary>Ilu pielgrzymów tej nacji jest właśnie w drodze albo na miejscu.</summary>
        public static double pielgrzymowKlanu(Sim sim, double clanId)
        {
            var w = sim.world;
            double n = 0;
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.clan != clanId) continue;
                if (c.job == Job.PIELGRZYM || (Math.Abs(c.x - w.coreX) < P.wartaPudloX && Math.Abs(c.y - (w.coreY - P.wartaNadRdzeniem)) < P.wartaPudloY)) n++;
            }
            return n;
        }

        /// <summary>Jedzenie dla warty pod rdzeniem (Remake v2: porcje w wiadrach).</summary>
        public static double policzJedzeniePrzedsionka(Sim sim)
        {
            if (REMAKE) return porcjiWWiadrach(sim);
            var w = sim.world;
            double n = 0;
            for (var y = w.coreY - P.jedzenieOd; y <= w.coreY - P.jedzenieDo; y++)
            {
                for (var x = w.coreX - P.jedzeniePolSzerokosci; x <= w.coreX + P.jedzeniePolSzerokosci; x++)
                {
                    if (!w.inb(x, y) || !w.suchaStrefa(x, y)) continue;
                    var t = w.tile[w.idx(x, y)];
                    if (t == T.FUNGUS || t == T.BONES) n++;
                }
            }
            return n;
        }

        /// <summary>Kruszy kamień od strony przedsionka w głąb (kolumną, od środka).</summary>
        static void otworzSkorupe(Sim sim, StanRytualu stan, string strona = "gora")
        {
            var w = sim.world;
            var przed = kamienNadRdzeniem(sim);
            (double, double) kafel(double d, double r) => (
                strona == "lewo" ? w.coreX - r : strona == "prawo" ? w.coreX + r : w.coreX + d,
                strona == "gora" ? w.coreY - r : strona == "dol" ? w.coreY + r : w.coreY + d);
            bool kamien(double x, double y) => w.inb(x, y) && w.tile[w.idx(x, y)] == T.STONE;
            foreach (var d in R.kolumnyPekniec)
            {
                for (var r = R.glebokoscPekniecia; r >= 0; r--)
                {
                    var (x, y) = kafel(d, r);
                    if (!kamien(x, y)) continue;
                    for (var rr = r - 1; rr >= 0; rr--)
                    {
                        var (xx, yy) = kafel(d, rr);
                        if (kamien(xx, yy)) { x = xx; y = yy; break; }
                    }
                    var i = w.idx(x, y);
                    w.tile[i] = T.AIR;
                    w.oznaczSlad(x, y, 2, sim.tick);
                    sim.efekt(x + 0.5, y + 0.5, "zawal");
                    if (strona != "gora") podeprzyjWylot(sim, x, y);

                    if (stan.pekniecia == 1)
                    {
                        sim.gdzie(x, y).log("Skorupa rdzenia pękła. Ktoś jest coraz bliżej.", "koniec", "skorupa-pierwsze");
                    }
                    else if (stan.skorupa > 0 && przed > stan.skorupa / 2 && kamienNadRdzeniem(sim) <= stan.skorupa / 2)
                    {
                        sim.gdzie(x, y).log("Skorupa pęka do połowy. Słychać ich pod samym rdzeniem.", "koniec", "skorupa-polowa");
                    }
                    return;
                }
            }
        }

        /// <summary>Postęp kruszenia całej skorupy w procentach (0–100).</summary>
        public static double procentSkorupy(Sim sim)
        {
            var r = sim.rytual;
            if (r.otwarta || pomnikRozbity(sim)) return 100;
            var potrzeba = POMNIK.wlaczony ? POMNIK.pekniec : Math.Max(Math.Max(1, r.skorupa), r.pekniecia + 1);
            return Math.Min(99, Math.Floor(((r.pekniecia + r.postep) / potrzeba) * 100));
        }

        /// <summary>Woda wsiąka w pęknięcia skorupy (szyb nad rdzeniem i komora wokół niego).</summary>
        static void osuszPekniecia(Sim sim)
        {
            var w = sim.world;
            for (var y = w.coreY - R.glebokoscPekniecia; y <= w.coreY + R.glebokoscPekniecia; y++)
            {
                for (var x = w.coreX - R.glebokoscPekniecia; x <= w.coreX + R.glebokoscPekniecia; x++)
                {
                    if (!w.inb(x, y)) continue;
                    var i = w.idx(x, y);
                    var wSzybie = y <= w.coreY && R.kolumnyPekniec.Contains(x - w.coreX);
                    if ((w.tile[i] == T.SHRINE || w.tile[i] == T.FORGE) && (wSzybie || wKomorze(sim, x, y))) w.tile[i] = T.AIR;
                    if (w.water[i] == 0 || w.tile[i] != T.AIR) continue;
                    if (wSzybie || wKomorze(sim, x, y)) w.water[i] = 0;
                }
            }
        }

        /// <summary>Jedno pęknięcie skorupy (z modlitwy albo z narzędzia dewelopera).</summary>
        static void peknij(Sim sim, StanRytualu stan, Clan klan, double id)
        {
            var w = sim.world;
            klan.rytual = 0;
            klan.pekniecia++;
            stan.pekniecia++;
            zapisz(sim, "rytual", $"{(POMNIK.wlaczony ? "pomnik" : "skorupa")} pęka ({JS.S(procentSkorupy(sim))}%) — kują {klan.name}", w.coreX, w.coreY);
            sim.wiara += R.nagrodaWiary;
            stan.klan = id;
            // Alpha, etap 5: pęka pomnik (stany i rozpad — sim/pomnik.ts), skorupa zostaje cała
            if (POMNIK.wlaczony) return;
            if (stan.strona == null) stan.strona = "gora";
            otworzSkorupe(sim, stan, stan.strona);
            if (!stan.otwarta && drogaDoRdzenia(sim))
            {
                stan.otwarta = true;
                sim.gdzie(w.coreX, w.coreY - 6).log("Droga do rdzenia stoi otworem.", "koniec", "skorupa-otwarta");
            }
        }

        /// <summary>Narzędzie dewelopera: wymuszone pęknięcie skorupy.</summary>
        public static void wymusPekniecie(Sim sim)
        {
            var stan = sim.rytual;
            if (stan.otwarta || pomnikRozbity(sim)) return;
            double id = stan.klan >= 0 && sim.klan(stan.klan)?.dead == false ? stan.klan : sim.clans.FindIndex(k => !k.dead && k.pop > 0);
            if (id < 0) return;
            peknij(sim, stan, sim.clans[(int)id], id);
        }
    }
}
