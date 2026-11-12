// Port: alpha-1/src/sim/creatures.ts — część 4: planPolecenia, klecz, PRZYCZYNA, doStoi, idz
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyStworzenia;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyPolecenia;
using static Trzewia.Nastawy.NastawyPomieszczenia;
using static Trzewia.Nastawy.NastawyOltarz;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Brama;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.Zbroja;
using static Trzewia.Symulacja.BudowaSchodow;
using static Trzewia.Symulacja.Polecenia;
using static Trzewia.Symulacja.LinaWiadra;
using static Trzewia.Symulacja.Pomieszczenia;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static partial class Stworzenia
    {
        /// <summary>
        /// Alpha: rozkaz gracza (sim/polecenia.ts). Zwraca false, gdy rozkaz się skończył albo przepadł — wtedy planer robi to, co zwykle.
        /// </summary>
        static bool planPolecenia(Sim sim, Creature c, string rola, NaDrogeF naDroge, ZamiarF zamiar, DrogaF droga, PodrozF podroz)
        {
            var p = c.polecenie!;
            var w = sim.world;
            var Z = LUD.zamiarTikow;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            double przekop(List<double> dk) => K.noszenieTikow + dk.Count * K.tikowNaKafelKopania * 2;
            // nie było czasu szukać drogi w tym tiku — spróbuje za chwilę (to nie „nie ma drogi”)
            bool brakCzasu() { zamiar("zastanawia się, którędy iść", Job.STOI, 30); return true; }
            bool poddajSie(string tekst)
            {
                p.prob = (p.prob ?? 0) + 1;
                if (p.prob < POLECENIA.prob) { zamiar("szuka drogi tam, gdzie kazałeś", Job.STOI, 240); return true; }
                c.polecenie = null;
                odmow(sim, c, tekst);
                return false;
            }

            if (p.typ == "droga")
            {
                var cz = czoloDrogi(sim);
                if (cz < 0)
                {
                    // 6.11: rozkaz wydany już po wykopie to rozkaz budowy schodów — trwa, póki trwa budowa
                    if (p.budowa == true && budujSchody(sim, c, naDroge, zamiar, droga, podroz, false)) { p.x = c.jx; p.y = c.jy; p.prob = 0; return true; }
                    c.polecenie = null; c.kopieDroge = false;
                    sim.efekt(c.x, c.y, "mysl", p.budowa == true && trwaBudowaSchodow(sim) ? "przy schodach komplet" : "droga gotowa");
                    return false;
                }
                p.x = cz % w.w; p.y = JS.ToInt32(cz / w.w);
                double fx = p.x, fy = p.y;
                // miejsce tuż przy czole, na którym da się stać — kuje się na podłodze, nie wisząc
                bool obok(double x, double y) => (Math.Abs(x - fx) + Math.Abs(y - fy) == 1 || (Math.Abs(x - fx) == 1 && Math.Abs(y - fy) == 1)) && stoi(sim, x, y);
                if (budzetDrog() <= 0) return brakCzasu();
                var d = droga(obok, LUD.dostawaLimit);
                if (d != null) { naDroge(d); c.jx = fx; c.jy = fy; c.dig = 0; c.kopieDroge = true; zamiar("kopie drogę wiernych — tak kazałeś", Job.DIG, podroz(d) + Z); p.prob = 0; return true; }
                if (budzetDrog() <= 0) return brakCzasu();
                var reszta = new HashSet<double>(sim.planDrogi?.dwukierunkowa == true ? new List<double>() : nieWykopane(sim).Skip(1));
                double kafelObok(double x, double y)
                {
                    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if ((dx != 0 || dy != 0) && w.inb(x + dx, y + dy) && reszta.Contains(w.idx(x + dx, y + dy))) return w.idx(x + dx, y + dy);
                    return -1;
                }
                var d2 = reszta.Count > 0 ? droga((x, y) => stoi(sim, x, y) && kafelObok(x, y) >= 0, LUD.dostawaLimit) : null;
                if (d2 != null)
                {
                    var k = d2.Count > 0 ? d2[d2.Count - 1] : w.idx(cx, cy);
                    var cel = kafelObok(k % w.w, JS.ToInt32(k / w.w));
                    naDroge(d2); c.jx = cel % w.w; c.jy = JS.ToInt32(cel / w.w); c.dig = 0; c.kopieDroge = true;
                    zamiar("kopie dalszy kawałek drogi wiernych — do czoła nie dojdzie", Job.DIG, podroz(d2) + Z); p.prob = 0;
                    return true;
                }
                if (budzetDrog() <= 1) return brakCzasu();
                // przekopuje się w samo czoło
                var dk = wkopDroga(sim, c, (x, y) => x == fx && y == fy, POLECENIA.szukanieKopania);
                if (dk != null) { zamiar("przekopuje się do czoła drogi wiernych", Job.WANDER, przekop(dk)); p.prob = 0; return true; }
                return poddajSie("nie dojdę do czoła drogi");
            }

            // etap 4: „napraw linę”
            if (p.typ == "naprawa")
            {
                var lp = linaPrzecieta(sim);
                var inny = sklejajacy(sim);
                if (lp == null || (inny != null && inny != c)) { c.polecenie = null; if (lp != null) sim.efekt(c.x, c.y, "mysl", "ktoś już ją skleja"); return false; }
                p.x = lp.x; p.y = lp.dno;
                bool tam(double x, double y) => x == lp.x && y == lp.dno && stoi(sim, x, y);
                if (Math.Abs(c.x - (lp.x + 0.5)) < 0.6 && cy == lp.dno && zacznijNaprawe(sim, c)) { p.na = true; return true; }
                if (tam(cx, cy)) { naDroge(new List<double>(), lp.x, lp.dno); zamiar("staje pod zwisającą liną", Job.WANDER, 60); return true; }
                if (budzetDrog() <= 0) return brakCzasu();
                var d = droga(tam, POLECENIA.szukanieDrogi);
                if (d != null) { naDroge(d, lp.x, lp.dno); zamiar("idzie skleić przeciętą linę wiadra", Job.WANDER, podroz(d) + 60); p.prob = 0; return true; }
                return poddajSie("nie dojdę do liny — nie ma drogi");
            }

            // etap 3f: rycerz posłany do kuźni
            if (p.typ == "zbroja")
            {
                var r = planZbroi(sim, c, p.pom, naDroge, zamiar, droga, podroz);
                if (r == "zaklada" || r == "idzie") { p.prob = 0; return true; }
                if (r == "nic") { c.polecenie = null; return false; }
                return poddajSie("nie dojdę do kuźni — nie ma drogi");
            }

            // etap 3c: warsztat, kuźnia, sypialnia
            if (p.typ == "praca" || p.typ == "sen")
            {
                var pom = pomieszczenieId(sim, p.pom);
                if (pom == null || !pom.gotowe) { c.polecenie = null; return false; }
                var (mx, my, kier) = miejsceWPom(pom, ktoryWPom(sim, pom, c));
                p.x = mx; p.y = my;
                var nazwa = NAZWA_POMIESZCZENIA[pom.rodzaj];
                if (Math.Abs(cx - mx) <= 1 && cy == my && stoi(sim, cx, cy))
                {
                    p.na = true; p.prob = 0;
                    c.jx = mx; c.jy = my; c.droga = null;
                    c.czynnosc = p.typ == "praca" ? "buduje" : "spi";
                    c.face = kier;
                    zamiar(p.typ == "sen" ? "śpi w sypialni — sen zdejmie osłabienia"
                        : !string.IsNullOrEmpty(pom.brak) ? $"czeka: {nazwa} — {pom.brak}" : pom.rodzaj == "warsztat" ? "robi krzyże ze złota w warsztacie" : "kuje zbroję dla rycerza w kuźni", Job.STOI, Z);
                    return true;
                }
                bool tam(double x, double y) => Math.Abs(x - mx) <= 1 && y == my && stoi(sim, x, y);
                if (budzetDrog() <= 0) return brakCzasu();
                var d = droga(tam, POLECENIA.szukanieDrogi);
                if (d != null) { naDroge(d, mx, my); zamiar(p.typ == "sen" ? "idzie spać do sypialni" : $"idzie pracować: {nazwa}", Job.WANDER, podroz(d) + 60); p.prob = 0; return true; }
                return poddajSie("nie dojdę tam — nie ma drogi");
            }

            // etap 3c: plan pomieszczenia — wskazany kafel już wykuty: następny kafel planu
            if (p.typ == "kop" && p.pom != null)
            {
                var pom = pomieszczenieId(sim, p.pom);
                if (pom == null || pom.gotowe) { c.polecenie = null; return false; }
                if (!w.solid(p.x, p.y))
                {
                    var nastL = kafleDoKucia(sim, c, pom, 1);
                    if (nastL.Count == 0) { c.polecenie = null; return false; }
                    p.x = nastL[0].x; p.y = nastL[0].y; p.na = false; p.prob = 0;
                }
            }
            // „kop żyłę” (etap 3b)
            if (p.typ == "kop" && p.zyla != null && !w.solid(p.x, p.y))
            {
                var nast = nastepnyKafelZyly(sim, c, p);
                if (nast != null) { p.x = nast.Value.x; p.y = nast.Value.y; p.zylaIle = (p.zylaIle ?? 0) + 1; p.na = false; p.prob = 0; }
                else { p.zyla = null; sim.efekt(c.x, c.y, "mysl", "żyła wykuta"); }
            }
            // ramka „do wykopania” (25.10)
            if (p.typ == "kop" && p.obszar != null && !w.solid(p.x, p.y))
            {
                var nast = nastepnyWObszarze(sim, c, p);
                if (nast != null) { p.x = nast.Value.x; p.y = nast.Value.y; p.na = false; p.prob = 0; p.pomin = 0; }
                else { c.polecenie = null; sim.efekt(c.x, c.y, "mysl", "wykute"); return false; }
            }
            // „kop tam”: lity kafel jeszcze stoi — stojąc obok, kuje go
            if (p.typ == "kop" && w.solid(p.x, p.y))
            {
                if (w.hardness(p.x, p.y) <= 0) { c.polecenie = null; odmow(sim, c, "tej skały nie ruszę"); return false; }
                var plan = pomieszczenieId(sim, p.pom);
                bool siega(double x, double y, double tx, double ty) => plan != null ? siegaPlanu(x, y, tx, ty) : Math.Abs(x - tx) <= 1 && Math.Abs(y - ty) <= 1;
                if (siega(cx, cy, p.x, p.y) && stoi(sim, cx, cy))
                {
                    c.jx = p.x; c.jy = p.y; c.dig = 0; c.droga = null;
                    zamiar(plan != null ? $"kuje plan: {NAZWA_POMIESZCZENIA[plan.rodzaj]} — tak kazałeś"
                        : p.zyla != null ? $"kuje żyłę {(p.zyla == "zelazo" ? "żelaza" : "złota")} — tak kazałeś" : "kuje tam, gdzie kazałeś", Job.DIG, Z);
                    return true;
                }
                bool obok(double x, double y) => siega(x, y, p.x, p.y) && stoi(sim, x, y);
                if (budzetDrog() <= 0) return brakCzasu();
                var d = droga(obok, POLECENIA.szukanieDrogi);
                if (d != null) { naDroge(d); zamiar(plan != null ? $"idzie kuć plan: {NAZWA_POMIESZCZENIA[plan.rodzaj]}" : "idzie kuć tam, gdzie kazałeś", Job.WANDER, podroz(d)); p.prob = 0; return true; }
                // plan: do tego kafla nie dojdzie — może do innego kafla planu
                if (plan != null)
                {
                    foreach (var (x, y) in kafleDoKucia(sim, c, plan, 4))
                    {
                        if (x == p.x && y == p.y) continue;
                        if (budzetDrog() <= 0) return brakCzasu();
                        var d2 = droga((sx, sy) => siega(sx, sy, x, y) && stoi(sim, sx, sy), POLECENIA.szukanieDrogi);
                        if (d2 != null) { p.x = x; p.y = y; naDroge(d2); zamiar($"idzie kuć plan: {NAZWA_POMIESZCZENIA[plan.rodzaj]}", Job.WANDER, podroz(d2)); p.prob = 0; return true; }
                    }
                }
                // ramka (6.11): do tego kafla nie dojdzie — może do innego z oznaczonych
                if (p.obszar != null)
                {
                    foreach (var (x, y) in kafleObszaru(sim, c, p, 4))
                    {
                        if (x == p.x && y == p.y) continue;
                        if (budzetDrog() <= 0) return brakCzasu();
                        var d2 = droga((sx, sy) => siega(sx, sy, x, y) && stoi(sim, sx, sy), POLECENIA.szukanieDrogi);
                        if (d2 != null) { p.x = x; p.y = y; naDroge(d2); zamiar("idzie kuć tam, gdzie kazałeś", Job.WANDER, podroz(d2)); p.prob = 0; return true; }
                    }
                }
                if (budzetDrog() <= 1) return brakCzasu();
                var dk = wkopDroga(sim, c, (x, y) => x == p.x && y == p.y, POLECENIA.szukanieKopania);
                if (dk != null) { zamiar("przekopuje się tam, gdzie kazałeś", Job.WANDER, przekop(dk)); p.prob = 0; return true; }
                // ramka: ostatnia próba do tego kafla — pomija go i bierze następny
                if (p.obszar != null && (p.prob ?? 0) + 1 >= POLECENIA.prob && pominKafelObszaru(sim, c, p))
                {
                    zamiar("szuka innego kafla z ramki", Job.STOI, 30);
                    return true;
                }
                return poddajSie("tam się nie dokopię");
            }

            // na miejscu (albo wykuł wskazany kafel) — trzyma posterunek, aż rozkaz odwołasz
            var naMiejscu = Math.Abs(cx - p.x) <= 1 && Math.Abs(cy - p.y) <= 1 && (p.typ == "kop" || stoi(sim, cx, cy));
            if (naMiejscu || (p.na == true && Math.Abs(cx - p.x) <= 2 && Math.Abs(cy - p.y) <= 2))
            {
                if (p.na != true) { p.na = true; sim.efekt(c.x, c.y, "mysl", "na miejscu"); }
                p.prob = 0;
                c.jx = naMiejscu ? cx : p.x; c.jy = naMiejscu ? cy : p.y; c.droga = null;
                // 6.11: przy kotle rzuca zaklęcia (to nie modlitwa — nie błogosławi); „za innych” modli się zawsze
                c.modliPrzyObozie = rola == "pobozny" && p.zaklinaj != true && (p.zaInnych == true || sim.tick >= (c.bezModlitwyDo ?? 0));
                var opis = p.zaklinaj == true && rola == "pobozny" ? (przyKotle(sim, c) ? "rzuca zaklęcia nad kotłem — w dole podnosi się stalowa brama lochu" : "idzie do kotła w starej komnacie")
                    : p.zaInnych == true && rola == "pobozny" ? "modli się za tych, którzy stoją wokół — leczy ich i błogosławi"
                    : rola == "pobozny" ? "modli się tam, gdzie kazałeś" : rola == "rycerz" ? "pilnuje miejsca, które wskazałeś" : "czeka tam, gdzie kazałeś";
                zamiar(opis, Job.STOI, Z);
                return true;
            }
            // w drodze — drogą, a robotnik, gdy jej nie ma, przekopuje się
            {
                bool tam(double x, double y) => Math.Abs(x - p.x) <= 1 && Math.Abs(y - p.y) <= 1 && stoi(sim, x, y);
                if (budzetDrog() <= 0) return brakCzasu();
                var d = droga(tam, POLECENIA.szukanieDrogi);
                if (d != null) { naDroge(d, p.x, p.y); zamiar("idzie tam, gdzie kazałeś", Job.WANDER, podroz(d) + 120); p.prob = 0; return true; }
                if (rola == "robotnik")
                {
                    if (budzetDrog() <= 1) return brakCzasu();
                    var dk = wkopDroga(sim, c, tam, POLECENIA.szukanieKopania);
                    if (dk != null) { zamiar("przekopuje się tam, gdzie kazałeś", Job.WANDER, przekop(dk)); p.prob = 0; return true; }
                }
                return poddajSie(rola == "robotnik" ? "tam się nie dokopię" : "nie dojdę tam — nie ma drogi");
            }
        }

        /// <summary>Etap 3d: odprawiający rytuał staje tuż przy ołtarzu, twarzą do krzyża, i klęczy (albo unosi księgę).</summary>
        static void klecz(Sim sim, Creature c, RytualOltarza r, NaDrogeF naDroge, ZamiarF zamiar, DrogaF droga, PodrozF podroz)
        {
            var o = sim.world.oltarz;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            var strona = c.x < o.x + 0.5 ? -1 : 1;
            var mx = o.x + strona * 2;
            var opis = $"odprawia rytuał przy ołtarzu: {NAZWA_RYTUALU[r.rodzaj].ToLowerInvariant()}";
            if (Math.Abs(cx - mx) <= 1 && cy == o.y && stoi(sim, cx, cy))
            {
                c.jx = cx; c.jy = cy; c.droga = null;
                c.face = -strona;
                c.czynnosc = r.rodzaj == "szal" || r.rodzaj == "wskrzeszenie" ? "czyta" : "modli";
                zamiar(opis, Job.STOI, Math.Max(30, Math.Min(LUD.zamiarTikow, r.@do - sim.tick + 1)));
                return;
            }
            var d = budzetDrog() > 0 ? droga((x, y) => Math.Abs(x - mx) <= 1 && y == o.y && stoi(sim, x, y), 400) : null;
            if (d != null) { naDroge(d, mx, o.y); zamiar(opis, Job.WANDER, podroz(d)); return; }
            c.jx = cx; c.jy = cy; c.droga = null;
            c.czynnosc = "modli";
            zamiar(opis, Job.STOI, 60);
        }

        /// <summary>Ostatnia rana → (opis w kronice, znacznik statystyki) (głód zostaje „wycieńczeniem” — tak liczą testy).</summary>
        static readonly Dictionary<string, (string, string)> PRZYCZYNA = new Dictionary<string, (string, string)>
        {
            ["magma"] = ("w ogniu", "magma"), ["woda"] = ("utonął", "woda"), ["glod"] = ("z głodu", "wycieńczenie"), ["starosc"] = ("ze starości", "starość"),
            ["przysypany"] = ("przysypany skałą", "przysypany"), ["upadek"] = ("od upadku", "upadek"), ["grzybnia"] = ("poparzony grzybnią", "grzybnia"),
        };

        /// <summary>Remake v1: kto stoi na swoim miejscu bez podłogi pod nogami (na linie, przy ścianie), trzyma chwyt.</summary>
        static void trzymajSieNaMiejscu(Sim sim, Creature c)
        {
            // Remake v2: lud nie wisi na ścianie bez końca (bez lin i klamer) — bez podłogi zsunie się na dno
            if (ludRuch(c)) return;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            if (REMAKE && rolaPostaci(c) != null && !stoi(sim, cx, cy) && uchwyt(sim, cx, cy)) { c.wspina = sim.tick; c.vy = 0; }
        }

        static void doStoi(Sim sim, Creature c)
        {
            if (Math.Abs(c.jx - Math.Floor(c.x)) > 1 || Math.Abs(c.jy - Math.Floor(c.y)) > 1) { idz(sim, c, c.jx, c.jy, false); return; }
            trzymajSieNaMiejscu(sim, c);
            if (c.modliPrzyObozie == true && sim.tick >= (c.bezModlitwyDo ?? 0))
            {
                sim.pray(c, T.AIR);
                c.devotion = Math.Min(1, c.devotion + K.modlitwaOddanie * 0.5);
            }
        }

        // -------------------------------------------------------------------- ruch

        /// <summary>Idzie do celu wyznaczoną drogą, a gdy jej nie ma (albo się zgubił) — na przełaj. Zwraca true, gdy jest na miejscu.</summary>
        static bool idz(Sim sim, Creature c, double tx, double ty, bool mayDig = true)
        {
            if (c.droga != null && c.drogaKopie == true)
            {
                if (krokKopiac(sim, c)) return false;
                c.droga = null; c.drogaKopie = false;
            }
            if (c.droga != null)
            {
                var nast = nastepnyKafel(sim, c);
                if (nast >= 0) { krok(sim, c, nast); return false; }
                c.droga = null;
            }
            var w = sim.world;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            if (REMAKE && rolaPostaci(c) != null && (Math.Abs(tx - cx) > 1 || Math.Abs(ty - cy) > 1) && !stoi(sim, cx, cy))
            {
                // Alpha: zgubił drogę, wisząc w szybie — przez chwilę trzyma się ściany i od razu szuka nowej
                var sciana = ludRuch(c) && (w.solid(cx - 1, cy) || w.solid(cx + 1, cy));
                var trzyma = sciana && sim.tick - (c.chwytOd ??= sim.tick) < K.chwytZgubionaDroga;
                if (trzyma) { c.wspina = sim.tick; c.vy = 0; }
                if ((trzyma ? (sim.tick + c.id) % 5 == 0 : (sim.tick + c.id) % 30 == 0) && budzetDrog() > 0)
                {
                    var d = szukajDrogi(sim, c, (_i, x, y) => Math.Abs(x - tx) <= 1 && Math.Abs(y - ty) <= 1, 4000);
                    if (d == null && !trzyma) { c.jt = 0; c.droga = null; return false; }
                    if (d != null && d.Count > 0)
                    {
                        c.chwytOd = null;
                        c.droga = d; c.drogaI = 0; c.drogaKopie = false;
                        var nast = nastepnyKafel(sim, c);
                        if (nast >= 0) { krok(sim, c, nast); return false; }
                        c.droga = null;
                    }
                }
                if (trzyma) return false;
            }
            else c.chwytOd = null;
            return walkTo(sim, c, tx, ty, mayDig);
        }
    }
}
