// Port: alpha-1/src/sim/polecenia.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawyPolecenia;
using static Trzewia.Nastawy.NastawyPomieszczenia;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.BudowaSchodow;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.Kruszce;
using static Trzewia.Symulacja.Pomieszczenia;
using static Trzewia.Symulacja.Zbroja;
using static Trzewia.Symulacja.LinaWiadra;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Rozkaz gracza (typ: 'idz' | 'kop' | 'droga' | 'praca' | 'sen' | 'zbroja' | 'naprawa').</summary>
    public sealed class Polecenie
    {
        public string typ = "idz";
        /// <summary>kafel celu: przy „idź” — podłoga, na której stanie; przy „kop” — lity kafel do wykucia</summary>
        public double x, y;
        /// <summary>tik wydania (znacznik celu na płycie)</summary>
        public double od;
        /// <summary>doszedł — trzyma posterunek</summary>
        public bool? na;
        /// <summary>ile razy w drodze szukał nowego przejścia</summary>
        public double? prob;
        /// <summary>Alpha, etap 3b: „kop żyłę” — jaką rudę kuje, skąd zaczął (zasięg) i ile kafli już wykuł</summary>
        public string? zyla;
        public double? zx, zy, zylaIle;
        /// <summary>Zaznaczanie prostokątem (25.10): kafle skały oznaczone ramką do wykucia.</summary>
        public List<double>? obszar;
        /// <summary>Ramka: ile kafli z rzędu pominął jako nieosiągalne.</summary>
        public double? pomin;
        /// <summary>6.11: pobożny idzie do kotła i tam rzuca zaklęcia (sim/brama.ts).</summary>
        public bool? zaklinaj;
        /// <summary>6.11: pobożny modli się za innych (sim/blogoslawienstwo.ts).</summary>
        public bool? zaInnych;
        /// <summary>6.11: „kop drogę wiernych” wydane po wykopie — robotnik buduje schody.</summary>
        public bool? budowa;
        /// <summary>Alpha, etap 3c: pomieszczenie (sim/pomieszczenia.ts).</summary>
        public double? pom;
    }

    /// <summary>Odmowa wykonania rozkazu — dymek nad głową i kręcenie głową.</summary>
    public sealed class Odmowa { public double od; public string tekst = ""; }

    public sealed class WynikRozkazu { public double przyjeli; public List<string> odmowy = new List<string>(); public double kafli; }

    /// <summary>
    /// POLECENIA (Alpha, etap 2) — rozkazy gracza dla zaznaczonych postaci ludu (patrz polecenia.ts). Liczby: nastawy/polecenia.ts.
    /// </summary>
    public static class Polecenia
    {
        static Typ_POLECENIA P => POLECENIA;

        /// <summary>Czy postać właśnie odmawia (dymek jeszcze wisi).</summary>
        public static bool odmawia(Sim sim, Creature c) => c.odmowa != null && sim.tick - c.odmowa.od < P.odmowaTikow;

        /// <summary>Odmowa: zapisuje ją postaci (rysunek) i zwraca tekst dla gracza.</summary>
        public static string odmow(Sim sim, Creature c, string tekst)
        {
            c.odmowa = new Odmowa { od = sim.tick, tekst = tekst };
            return tekst;
        }

        /// <summary>Podłoga pod wskazanym miejscem w pustce: w dół do pierwszego kafla, na którym się stoi (albo null).</summary>
        public static (double x, double y)? podlogaPod(Sim sim, double x, double y)
        {
            var w = sim.world;
            if (!w.inb(x, y) || !w.passable(x, y)) return null;
            for (double yy = y, k = 0; k <= P.podlogaNizej && yy < w.h - 1; yy++, k++)
            {
                if (!w.passable(x, yy)) return null;
                if (stoi(sim, x, yy)) return (x, yy);
            }
            return null;
        }

        /// <summary>Najbliższe miejsce do stania wokół (x, y), najwyżej `promien` kafli dalej (albo null).</summary>
        public static (double x, double y)? najblizszaPodloga(Sim sim, double x, double y, double promien)
        {
            var w = sim.world;
            for (double r = 0; r <= promien; r++)
            {
                for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++)
                {
                    if (Math.Max(Math.Abs(dx), Math.Abs(dy)) != r) continue;
                    double xx = x + dx, yy = y + dy;
                    if (w.inb(xx, yy) && w.passable(xx, yy) && stoi(sim, xx, yy) && w.magma[w.idx(xx, yy)] == 0) return (xx, yy);
                }
            }
            return null;
        }

        /// <summary>Szukanie drogi na rozkaz — poza budżetem tiku.</summary>
        static List<double>? drogaTeraz(Sim sim, Creature c, Func<double, double, bool> cel, double limit)
        {
            var zostalo = budzetDrog();
            nowyTik(1);
            var d = szukajDrogi(sim, c, (_i, x, y) => cel(x, y), limit);
            nowyTik(zostalo);
            return d;
        }

        /// <summary>Czy robotnik da radę się tam dokopać (bez budżetu tiku).</summary>
        static bool dokopieSie(Sim sim, Creature c, Func<double, double, double, bool> cel)
        {
            var w = sim.world;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            if (!w.inb(cx, cy)) return false;
            return szukajKopiac(sim, new List<double> { w.idx(cx, cy) }, cel, new OpcjeKopania { koszt = kosztKuciaLudu(sim, true), limit = P.szukanieKopania, zBudzetu = false }) != null;
        }

        /// <summary>Postać przestaje robić to, co robiła — planer ludu weźmie rozkaz od razu.</summary>
        static void przerwij(Sim sim, Creature c)
        {
            c.wyprawa = false;
            if (c.job == Job.PIELGRZYM) c.job = Job.WANDER;
            if (c.thought == Thought.PRAY_CORE) c.thought = Thought.NONE;
            c.kopieDroge = false;
            c.modliPrzyObozie = false;
            c.posterunek = null;
            c.budowa = null; c.bezczynnyOd = null;
            c.droga = null; c.drogaKopie = false;
            c.jt = 0; c.zamiarDo = sim.tick;
        }

        /// <summary>Rozkaz dla jednej postaci: „idź tam” / „kop tam” albo „kop drogę wiernych”. Powód odmowy albo null.</summary>
        public static string? wydajPolecenie(Sim sim, Creature c, string typ, double x, double y)
        {
            var w = sim.world;
            var rola = rolaPostaci(c);
            if (c.dead || rola == null) return "To nie twój lud.";
            if (typ == "droga")
            {
                if (rola != "robotnik") return odmow(sim, c, "kopią tylko robotnicy");
                var cz = czoloDrogi(sim);
                if (cz < 0)
                {
                    // 6.11: wykopana — rozkaz przechodzi w budowę schodów, póki trwa
                    var zad = sim.planDrogi != null && !sim.rytual.otwarta ? zadanieBudowy(sim, c, false) : null;
                    if (zad == null)
                    {
                        return odmow(sim, c, sim.rytual.otwarta ? "skorupa już otwarta" : sim.planDrogi == null ? "nie wiem, którędy kopać"
                            : trwaBudowaSchodow(sim) ? "przy schodach nie ma już miejsca" : "droga wiernych już gotowa");
                    }
                    bool przyBudowie(double xx, double yy) => Math.Abs(xx - zad.x) <= 1 && Math.Abs(yy - zad.y) <= 1;
                    if (drogaTeraz(sim, c, przyBudowie, P.szukanieDrogi) == null) return odmow(sim, c, "nie dojdę do schodów");
                    przerwij(sim, c);
                    c.polecenie = new Polecenie { typ = "droga", x = zad.x, y = zad.y, od = sim.tick, budowa = true };
                    c.odmowa = null;
                    zapisz(sim, "praca", $"{kto(sim, c)}: rozkaz — buduj schody drogi wiernych", c.x, c.y);
                    return null;
                }
                var reszta = new HashSet<double>(sim.planDrogi?.dwukierunkowa == true ? new List<double> { cz } : nieWykopane(sim));
                bool przyKresce(double xx, double yy)
                {
                    if (!stoi(sim, xx, yy)) return false;
                    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if ((dx != 0 || dy != 0) && w.inb(xx + dx, yy + dy) && reszta.Contains(w.idx(xx + dx, yy + dy))) return true;
                    return false;
                }
                if (drogaTeraz(sim, c, przyKresce, P.szukanieDrogi) == null && !dokopieSie(sim, c, (i, _x, _y) => i == cz)) return odmow(sim, c, "nie dojdę do drogi wiernych");
                przerwij(sim, c);
                c.polecenie = new Polecenie { typ = "droga", x = cz % w.w, y = JS.ToInt32(cz / w.w), od = sim.tick };
                c.odmowa = null;
                zapisz(sim, "praca", $"{kto(sim, c)}: rozkaz — kop drogę wiernych", c.x, c.y);
                return null;
            }
            if (!w.inb(x, y)) return odmow(sim, c, "tam nie sięgnę");
            // lita skała: robotnik się do niej przekopie, reszta stanie najbliżej, jak się da
            if (w.solid(x, y))
            {
                if (rola == "robotnik" && w.hardness(x, y) > 0)
                {
                    var cel = w.idx(x, y);
                    if (podDroga(sim, cel)) return odmow(sim, c, "to podłoga drogi wiernych");
                    // rozkaz wprost na blok pod wiadrem odblokowuje kolumnę szybu (do końca partii)
                    if (cel == blokWiadra(sim))
                    {
                        sim.wiadroOdblokowane = true;
                        zapisz(sim, "praca", "blok pod wiadrem odblokowany — kolumnę szybu wolno kuć", x, y);
                    }
                    bool obok(double xx, double yy) => Math.Abs(xx - x) <= 1 && Math.Abs(yy - y) <= 1 && stoi(sim, xx, yy);
                    if (drogaTeraz(sim, c, obok, P.szukanieDrogi) == null && !dokopieSie(sim, c, (i, _x, _y) => i == cel)) return odmow(sim, c, "tam się nie dokopię");
                    przerwij(sim, c);
                    // ruda: kuje całą żyłę, nie jeden kafel
                    var zyla = kruszecKafla(w.get(x, y));
                    c.polecenie = zyla != null ? new Polecenie { typ = "kop", x = x, y = y, od = sim.tick, zyla = zyla, zx = x, zy = y, zylaIle = 0 } : new Polecenie { typ = "kop", x = x, y = y, od = sim.tick };
                    c.odmowa = null;
                    zapisz(sim, "praca", $"{kto(sim, c)}: rozkaz — {(zyla != null ? $"kop żyłę {(zyla == "zelazo" ? "żelaza" : "złota")} od" : "kop do")} ({JS.S(x)}, {JS.S(y)})", x, y);
                    return null;
                }
                var p = najblizszaPodloga(sim, x, y, P.celPromien);
                if (p == null) return odmow(sim, c, rola == "robotnik" ? "tej skały nie ruszę" : "tam jest lita skała");
                x = p.Value.x; y = p.Value.y;
            }
            else
            {
                var p = podlogaPod(sim, x, y) ?? najblizszaPodloga(sim, x, y, P.celPromien);
                if (p == null) return odmow(sim, c, "tam nie ma na czym stanąć");
                x = p.Value.x; y = p.Value.y;
            }
            var tx = x; var ty = y;
            bool tam(double xx, double yy) => Math.Abs(xx - tx) <= 1 && Math.Abs(yy - ty) <= 1 && stoi(sim, xx, yy);
            if (drogaTeraz(sim, c, tam, P.szukanieDrogi) == null)
            {
                // pobożny i rycerz nie kują sobie drogi — odmawiają; robotnik przekopie się sam
                if (rola != "robotnik") return odmow(sim, c, "nie dojdę tam — nie ma drogi");
                if (!dokopieSie(sim, c, (_i, xx, yy) => tam(xx, yy))) return odmow(sim, c, "tam się nie dokopię");
            }
            przerwij(sim, c);
            c.polecenie = new Polecenie { typ = "idz", x = x, y = y, od = sim.tick };
            c.odmowa = null;
            zapisz(sim, "praca", $"{kto(sim, c)}: rozkaz — idź do ({JS.S(x)}, {JS.S(y)})", x, y);
            return null;
        }

        /// <summary>„Kop żyłę”: następny odsłonięty kafel tej samej rudy, najbliżej robotnika (albo null).</summary>
        public static (double x, double y)? nastepnyKafelZyly(Sim sim, Creature c, Polecenie p)
        {
            var w = sim.world;
            if (p.zyla == null || (p.zylaIle ?? 0) >= P.zylaKafli) return null;
            var R = P.zylaZasieg;
            double zx = p.zx ?? p.x, zy = p.zy ?? p.y;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            var sciezka = sim.planDrogi != null ? new HashSet<double>(sim.planDrogi.sciezka) : null;
            (double, double)? best = null; var bestD = double.PositiveInfinity;
            for (var y = Math.Max(0, zy - R); y <= Math.Min(Math.Min(w.h - 1, zy + R), Math.Max(cy, p.y) + 1); y++)
            {
                for (var x = Math.Max(0, zx - R); x <= Math.Min(w.w - 1, zx + R); x++)
                {
                    if (!w.solid(x, y) || kruszecKafla(w.get(x, y)) != p.zyla || w.hardness(x, y) <= 0) continue;
                    if (!(w.passable(x - 1, y) || w.passable(x + 1, y) || w.passable(x, y - 1) || w.passable(x, y + 1))) continue;
                    if (sciezka != null && sciezka.Contains(w.idx(x, y - 1))) continue;
                    var d = Math.Abs(x - cx) + Math.Abs(y - cy);
                    if (d < bestD) { bestD = d; best = (x, y); }
                }
            }
            return best;
        }

        /// <summary>Rozkaz dla grupy: każdy dostaje własne miejsce obok wskazanego (co dwa kafle w bok, po podłodze).</summary>
        public static WynikRozkazu wydajGrupie(Sim sim, IReadOnlyList<double> ids, double x, double y)
        {
            var w = sim.world;
            var lud = ids.Select(id => sim.creatureById(id)).Where(c => c != null && !c.dead && rolaPostaci(c) != null).Select(c => c!).ToList();
            (double, double) baza = w.inb(x, y) && !w.solid(x, y) ? (podlogaPod(sim, x, y) ?? (x, y)) : (x, y);
            var miejsca = new List<(double, double)>();
            for (var k = 0; miejsca.Count < lud.Count && k < 24; k++)
            {
                double dx = k == 0 ? 0 : (k % 2 != 0 ? 1 : -1) * Math.Ceiling(k / 2.0) * 2;
                double mx = baza.Item1 + dx, my = baza.Item2;
                if (k == 0 || (w.inb(mx, my) && w.passable(mx, my) && stoi(sim, mx, my))) miejsca.Add((mx, my));
            }
            var wynik = new WynikRozkazu();
            for (var i = 0; i < lud.Count; i++)
            {
                var (mx, my) = i < miejsca.Count ? miejsca[i] : baza;
                var powod = wydajPolecenie(sim, lud[i], "idz", mx, my);
                if (powod != null) wynik.odmowy.Add(powod); else wynik.przyjeli++;
            }
            return wynik;
        }

        /// <summary>Czy ten kafel wolno oznaczyć ramką do wykucia.</summary>
        public static bool doWykuciaRamka(Sim sim, double i)
        {
            var w = sim.world;
            double x = i % w.w, y = JS.ToInt32(i / w.w);
            return w.inb(x, y) && w.solid(x, y) && w.hardness(x, y) > 0 && w.get(x, y) != T.CORE && !podDroga(sim, i);
        }

        /// <summary>Ramka „do wykopania” (propozycja Pawła, 25.10).</summary>
        public static WynikRozkazu wydajObszar(Sim sim, IReadOnlyList<double> ids, IReadOnlyList<double> kafle)
        {
            var w = sim.world;
            var wiadro = blokWiadra(sim);
            if (wiadro >= 0 && kafle.Contains(wiadro))
            {
                sim.wiadroOdblokowane = true;
                zapisz(sim, "praca", "blok pod wiadrem odblokowany ramką — kolumnę szybu wolno kuć", wiadro % w.w, JS.ToInt32(wiadro / w.w));
            }
            var obszar = kafle.Where(i => doWykuciaRamka(sim, i)).ToList();
            var wynik = new WynikRozkazu();
            if (obszar.Count == 0) { wynik.odmowy.Add("tu nie ma czego kuć"); wynik.kafli = 0; return wynik; }
            foreach (var id in ids)
            {
                var c = sim.creatureById(id);
                if (c == null || c.dead || rolaPostaci(c) != "robotnik") continue;
                var kolejnosc = kafleObszaru(sim, c, new Polecenie { typ = "kop", x = 0, y = 0, od = sim.tick, obszar = obszar }, 4).Select(p => w.idx(p.x, p.y)).ToList();
                string? powod = "tam się nie dokopię";
                foreach (var i in kolejnosc)
                {
                    powod = wydajPolecenie(sim, c, "idz", i % w.w, JS.ToInt32(i / w.w));
                    if (powod == null) break;
                }
                if (powod != null || c.polecenie?.typ != "kop") { wynik.odmowy.Add(powod ?? "tam się nie dokopię"); continue; }
                c.polecenie.zyla = null;
                c.polecenie.obszar = obszar;
                wynik.przyjeli++;
            }
            wynik.kafli = obszar.Count;
            return wynik;
        }

        /// <summary>Czy obok kafla jest pustka — od takich zaczyna się kuć.</summary>
        static bool odsloniety(Sim sim, double i)
        {
            var w = sim.world;
            double x = i % w.w, y = JS.ToInt32(i / w.w);
            return w.passable(x - 1, y) || w.passable(x + 1, y) || w.passable(x, y - 1) || w.passable(x, y + 1);
        }

        /// <summary>Ramka: do `n` następnych kafli do wykucia — odsłonięte, najbliżej robotnika (zajęte przez innych dalej).</summary>
        public static List<(double x, double y)> kafleObszaru(Sim sim, Creature c, Polecenie p, int n)
        {
            var w = sim.world;
            if (p.obszar == null) return new List<(double x, double y)>();
            p.obszar = p.obszar.Where(i => doWykuciaRamka(sim, i)).ToList();
            var zajete = new HashSet<double>();
            foreach (var o in sim.creatures)
            {
                var q = o.polecenie;
                if (o != c && !o.dead && q?.typ == "kop" && q.obszar != null) zajete.Add(w.idx(q.x, q.y));
            }
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            var wynik = new List<double>(); var klucze = new List<double>();
            foreach (var i in p.obszar)
            {
                var k = Math.Abs((i % w.w) - cx) + Math.Abs(JS.ToInt32(i / w.w) - cy) + (odsloniety(sim, i) ? 0 : 1000) + (zajete.Contains(i) ? P.ramkaZajety : 0);
                if (wynik.Count == n && k >= klucze[n - 1]) continue;
                var j = Math.Min(wynik.Count, n - 1);
                while (j > 0 && klucze[j - 1] > k) j--;
                wynik.Insert(j, i); klucze.Insert(j, k);
                if (wynik.Count > n) { wynik.RemoveAt(wynik.Count - 1); klucze.RemoveAt(klucze.Count - 1); }
            }
            return wynik.Select(i => (i % w.w, (double)JS.ToInt32(i / w.w))).ToList();
        }

        /// <summary>Ramka: następny kafel do wykucia (albo null, gdy cały obszar jest już pustką).</summary>
        public static (double x, double y)? nastepnyWObszarze(Sim sim, Creature c, Polecenie p)
        {
            var l = kafleObszaru(sim, c, p, 1);
            return l.Count > 0 ? l[0] : ((double x, double y)?)null;
        }

        /// <summary>Ramka: do wskazanego kafla nie da się dojść ani dokopać — pomija go i bierze następny.</summary>
        public static bool pominKafelObszaru(Sim sim, Creature c, Polecenie p)
        {
            if (p.obszar == null || (p.pomin ?? 0) >= P.ramkaPomin) return false;
            var cel = sim.world.idx(p.x, p.y);
            p.obszar = p.obszar.Where(i => i != cel).ToList();
            var nast = nastepnyWObszarze(sim, c, p);
            if (nast == null) return false;
            p.x = nast.Value.x; p.y = nast.Value.y; p.na = false; p.prob = 0;
            p.pomin = (p.pomin ?? 0) + 1;
            return true;
        }

        /// <summary>Robotnik idzie kuć plan: pierwszy kafel, do którego dojdzie (inaczej przekopie się do najbliższego).</summary>
        static string? kujPlan(Sim sim, Creature c, Pomieszczenie pom)
        {
            var w = sim.world;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            var kafle = kafleDoKucia(sim, c, pom, 4);
            if (kafle.Count == 0) return odmow(sim, c, "nie ma tu czego kuć");
            (double x, double y)? cel = null;
            foreach (var (x, y) in kafle)
            {
                bool obok(double xx, double yy) => siegaPlanu(xx, yy, x, y) && stoi(sim, xx, yy);
                if (obok(cx, cy) || drogaTeraz(sim, c, obok, P.szukanieDrogi) != null) { cel = (x, y); break; }
            }
            if (cel == null && dokopieSie(sim, c, (i, _x, _y) => i == w.idx(kafle[0].x, kafle[0].y))) cel = kafle[0];
            if (cel == null) return odmow(sim, c, "nie dojdę do planu");
            przerwij(sim, c);
            c.polecenie = new Polecenie { typ = "kop", x = cel.Value.x, y = cel.Value.y, od = sim.tick, pom = pom.id };
            c.odmowa = null;
            zapisz(sim, "praca", $"{kto(sim, c)}: rozkaz — kuj plan ({NAZWA_POMIESZCZENIA[pom.rodzaj]})", cel.Value.x, cel.Value.y);
            return null;
        }

        /// <summary>Do gotowego pomieszczenia: pracować („praca”) albo spać na posłaniu („sen”).</summary>
        static string? doPomieszczenia(Sim sim, Creature c, Pomieszczenie pom, string typ, double n)
        {
            var (mx, my, _) = miejsceWPom(pom, n);
            bool tam(double x, double y) => Math.Abs(x - mx) <= 1 && y == my && stoi(sim, x, y);
            if (!tam(Math.Floor(c.x), Math.Floor(c.y)) && drogaTeraz(sim, c, tam, P.szukanieDrogi) == null) return odmow(sim, c, "nie dojdę tam — nie ma drogi");
            przerwij(sim, c);
            c.polecenie = new Polecenie { typ = typ, x = mx, y = my, od = sim.tick, pom = pom.id };
            c.odmowa = null;
            c.snu = 0;
            zapisz(sim, "praca", $"{kto(sim, c)}: rozkaz — {(typ == "sen" ? "śpij w sypialni" : $"pracuj: {NAZWA_POMIESZCZENIA[pom.rodzaj]}")}", mx, my);
            return null;
        }

        /// <summary>Etap 3f: rycerz idzie do kuźni zakładać części, które wiszą na wieszaku.</summary>
        static string? poZbroje(Sim sim, Creature c, Pomieszczenie pom)
        {
            if (naWieszaku(sim).Count == 0) return odmow(sim, c, "nie ma części na wieszaku");
            var (mx, my) = miejscePodWieszakiem(pom);
            bool tam(double x, double y) => Math.Abs(x - mx) <= 1 && y == my && stoi(sim, x, y);
            if (!tam(Math.Floor(c.x), Math.Floor(c.y)) && drogaTeraz(sim, c, tam, P.szukanieDrogi) == null) return odmow(sim, c, "nie dojdę do kuźni — nie ma drogi");
            przerwij(sim, c);
            c.polecenie = new Polecenie { typ = "zbroja", x = mx, y = my, od = sim.tick, pom = pom.id };
            c.odmowa = null;
            zapisz(sim, "praca", $"{kto(sim, c)}: rozkaz — załóż zbroję z wieszaka", mx, my);
            return null;
        }

        /// <summary>Alpha, etap 3c: zaznaczonym wskazano plan albo gotowe pomieszczenie.</summary>
        public static WynikRozkazu wydajNaPomieszczenie(Sim sim, IReadOnlyList<double> ids, Pomieszczenie pom)
        {
            var lud = ids.Select(id => sim.creatureById(id)).Where(c => c != null && !c.dead && rolaPostaci(c) != null).Select(c => c!).ToList();
            double zajete = sim.creatures.Count(o => !o.dead && !ids.Contains(o.id) && o.polecenie?.pom == pom.id && (o.polecenie.typ == "praca" || o.polecenie.typ == "sen"));
            var wynik = new WynikRozkazu();
            foreach (var c in lud)
            {
                var rola = rolaPostaci(c);
                string? powod;
                if (!pom.gotowe) powod = rola == "robotnik" ? kujPlan(sim, c, pom) : odmow(sim, c, "kują tylko robotnicy");
                else if (pom.rodzaj == "sypialnia") powod = doPomieszczenia(sim, c, pom, "sen", zajete);
                else if (rola == "robotnik") powod = doPomieszczenia(sim, c, pom, "praca", zajete);
                else if (rola == "rycerz" && pom.rodzaj == "kuznia") powod = poZbroje(sim, c, pom);
                else { var (mx, my, _) = miejsceWPom(pom, 2); powod = wydajPolecenie(sim, c, "idz", mx, my); }
                if (powod != null) wynik.odmowy.Add(powod);
                else { wynik.przyjeli++; if (c.polecenie?.typ == "praca" || c.polecenie?.typ == "sen") zajete++; }
            }
            return wynik;
        }

        /// <summary>„Kop drogę wiernych” dla zaznaczonych robotników.</summary>
        public static WynikRozkazu drogaGrupie(Sim sim, IReadOnlyList<double> ids)
        {
            var wynik = new WynikRozkazu();
            foreach (var id in ids)
            {
                var c = sim.creatureById(id);
                if (c == null || c.dead || rolaPostaci(c) != "robotnik") continue;
                var powod = wydajPolecenie(sim, c, "droga", 0, 0);
                if (powod != null) wynik.odmowy.Add(powod); else wynik.przyjeli++;
            }
            return wynik;
        }

        /// <summary>Etap 4: „napraw linę” — zaznaczeni (pierwszy, który dojdzie) albo najbliższy z ludu.</summary>
        public static (Creature? kto, List<string> odmowy) wydajNaprawe(Sim sim, IReadOnlyList<double> ids)
        {
            var lp = linaPrzecieta(sim);
            if (lp == null) return (null, new List<string> { "lina jest cała" });
            var wisi = sklejajacy(sim);
            if (wisi != null) return (null, new List<string> { "już ktoś na niej wisi i ją skleja" });
            var lud = ids.Select(id => sim.creatureById(id)).Where(c => c != null && !c.dead && rolaPostaci(c) != null).Select(c => c!).ToList();
            if (lud.Count == 0)
            {
                lud = JS.Sort(sim.creatures.Where(c => !c.dead && rolaPostaci(c) != null && c.straznik != true).ToList(),
                    (a, b) => JS.Hypot(a.x - lp.x, a.y - lp.dno) - JS.Hypot(b.x - lp.x, b.y - lp.dno));
            }
            var odmowy = new List<string>();
            bool tam(double x, double y) => x == lp.x && y == lp.dno && stoi(sim, x, y);
            foreach (var c in lud)
            {
                if (!(Math.Floor(c.x) == lp.x && Math.Floor(c.y) == lp.dno) && drogaTeraz(sim, c, tam, P.szukanieDrogi) == null)
                {
                    if (ids.Count > 0) odmowy.Add(odmow(sim, c, "nie dojdę do liny — nie ma drogi"));
                    continue;
                }
                // jeden naraz: kto dotąd szedł skleić linę, wraca do swoich zajęć
                foreach (var o in sim.creatures.ToList()) if (o != c && !o.dead && o.polecenie?.typ == "naprawa") odwolajPolecenie(sim, o);
                przerwij(sim, c);
                c.polecenie = new Polecenie { typ = "naprawa", x = lp.x, y = lp.dno, od = sim.tick };
                c.odmowa = null;
                zapisz(sim, "praca", $"{kto(sim, c)}: rozkaz — napraw linę wiadra", lp.x, lp.dno);
                return (c, odmowy);
            }
            if (odmowy.Count == 0) odmowy.Add("nikt z ludu nie dojdzie do liny");
            return (null, odmowy);
        }

        /// <summary>Odwołuje rozkaz — postać wraca do swoich zajęć.</summary>
        public static void odwolajPolecenie(Sim sim, Creature c)
        {
            if (c.naprawia != null) przerwijNaprawe(sim, c);
            if (c.polecenie == null) return;
            c.polecenie = null;
            c.kopieDroge = false;
            c.modliPrzyObozie = false;
            c.droga = null; c.drogaKopie = false;
            c.jt = 0; c.zamiarDo = sim.tick;
        }

        /// <summary>Alpha, etap 3d: zaznaczonym wskazano ołtarz — idą do niego i zostają.</summary>
        public static WynikRozkazu wydajDoOltarza(Sim sim, IReadOnlyList<double> ids)
        {
            var o = sim.world.oltarz;
            var lud = ids.Select(id => sim.creatureById(id)).Where(c => c != null && !c.dead && rolaPostaci(c) != null).Select(c => c!).ToList();
            JS.Sort(lud, (a, b) => (rolaPostaci(a) == "pobozny" ? 0 : 1) - (rolaPostaci(b) == "pobozny" ? 0 : 1));
            var zajete = new HashSet<double>();
            var wynik = new WynikRozkazu();
            foreach (var c in lud)
            {
                double s = c.x < o.x + 0.5 ? -1 : 1;
                double od = rolaPostaci(c) == "pobozny" ? 2 : 3;
                var kandydaci = new[] { od, -od, od + 1, -(od + 1), od + 2, -(od + 2), od + 3, -(od + 3) }.Select(d => d * s).ToList();
                double dx = s * od;
                foreach (var d in kandydaci) if (!zajete.Contains(d)) { dx = d; break; }
                zajete.Add(dx);
                var powod = wydajPolecenie(sim, c, "idz", o.x + dx, o.y);
                if (powod != null) wynik.odmowy.Add(powod); else wynik.przyjeli++;
            }
            return wynik;
        }

        /// <summary>6.11: „Do kotła” — pobożni idą do kotła i tam rzucają zaklęcia (dwóch naraz podnosi bramę lochu).</summary>
        public static WynikRozkazu wydajDoKotla(Sim sim, IReadOnlyList<double> ids)
        {
            var w = sim.world; var k = w.kociol;
            var wynik = new WynikRozkazu();
            if (w.komnata.x1 < w.komnata.x0) { wynik.odmowy.Add("w tej górze nie ma kotła"); return wynik; }
            var pobozni = ids.Select(id => sim.creatureById(id)).Where(c => c != null && !c.dead && rolaPostaci(c) == "pobozny").Select(c => c!).ToList();
            var zajete = new HashSet<double>();
            foreach (var c in sim.creatures) if (!c.dead && c.polecenie?.zaklinaj == true && !pobozni.Contains(c)) zajete.Add(c.polecenie.x - k.x);
            foreach (var c in pobozni)
            {
                var dx = BRAMA.miejscaPrzyKotle[0];
                foreach (var d in BRAMA.miejscaPrzyKotle) if (!zajete.Contains(d)) { dx = d; break; }
                zajete.Add(dx);
                var powod = wydajPolecenie(sim, c, "idz", k.x + dx, k.y);
                if (powod != null || c.polecenie == null) { wynik.odmowy.Add(powod ?? "nie dojdę do kotła"); continue; }
                c.polecenie.zaklinaj = true;
                zapisz(sim, "praca", $"{kto(sim, c)}: rozkaz — do kotła, rzucać zaklęcia (brama lochu)", k.x, k.y);
                wynik.przyjeli++;
            }
            return wynik;
        }

        /// <summary>6.11: „Módl się za innych” — pobożny zostaje, gdzie stoi, i modli się za tych wokół.</summary>
        public static WynikRozkazu wydajModlitweZaInnych(Sim sim, IReadOnlyList<double> ids)
        {
            var wynik = new WynikRozkazu();
            foreach (var id in ids)
            {
                var c = sim.creatureById(id);
                if (c == null || c.dead || rolaPostaci(c) != "pobozny") continue;
                var powod = wydajPolecenie(sim, c, "idz", Math.Floor(c.x), Math.Floor(c.y));
                if (powod != null || c.polecenie == null) { wynik.odmowy.Add(powod ?? "tu nie stanie"); continue; }
                c.polecenie.zaInnych = true;
                wynik.przyjeli++;
            }
            return wynik;
        }

        /// <summary>Alpha, etap 3d: okno ołtarza — „przywołaj pobożnego”: najbliższy, który dojdzie, idzie do ołtarza.</summary>
        public static string? przywolajDoOltarza(Sim sim)
        {
            var o = sim.world.oltarz;
            var pobozni = JS.Sort(sim.creatures.Where(c => !c.dead && rolaPostaci(c) == "pobozny").ToList(),
                (a, b) => JS.Hypot(a.x - o.x, a.y - o.y) - JS.Hypot(b.x - o.x, b.y - o.y));
            if (pobozni.Count == 0) return "nie żyje żaden pobożny";
            string? powod = "nie dojdzie";
            foreach (var c in pobozni)
            {
                powod = wydajPolecenie(sim, c, "idz", o.x + (c.x < o.x + 0.5 ? -2 : 2), o.y);
                if (powod == null) return null;
            }
            return powod;
        }
    }
}
