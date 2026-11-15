// Port: alpha-1/src/app/bot.ts
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using Trzewia.Js;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Nastawy.NastawyPomieszczenia;
using static Trzewia.Nastawy.NastawyOltarz;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Symulacja.Wydarzenia;
using static Trzewia.Symulacja.Moce;
using static Trzewia.Symulacja.Wiadro;
using static Trzewia.Symulacja.Polecenia;
using static Trzewia.Symulacja.Brama;
using static Trzewia.Symulacja.LinaWiadra;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Pomieszczenia;
using static Trzewia.Symulacja.Zbroja;
using static Trzewia.Symulacja.Kruszce;
using static Trzewia.Symulacja.Oltarz;
using static Trzewia.Symulacja.Pomnik;
using static Trzewia.Symulacja.Rytual;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.DlonDemona;
using static Trzewia.Symulacja.Lud;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>
    /// Bot — automatyczny gracz do obserwatorium i prób (patrz app/bot.ts). Style: 'rozsadny' (wszystko po trochu),
    /// 'budowniczy' (wszystkie pomieszczenia i cała zbroja), 'speedrun' (najkrócej do pomnika — tylko kuźnia),
    /// 'bierny' (nic). Wołany co BOT_CO tików symulacji; karty rozstrzyga od razu.
    /// </summary>
    public static class Bot
    {
        public static readonly Dictionary<string, string> STYLE_BOTA = new Dictionary<string, string>
        {
            ["rozsadny"] = "rozsądny", ["budowniczy"] = "budowniczy", ["speedrun"] = "speedrun", ["bierny"] = "bierny (nic nie robi)",
        };

        /// <summary>Co ile tików bot się zastanawia (pół sekundy gry).</summary>
        public const double BOT_CO = 60;

        const double M = 7200;
        /// <summary>Myśl wisi pod oknem co najmniej tyle tików, zanim zastąpi ją podsumowanie.</summary>
        const double MYSL_TIKOW = 900;

        sealed class Odprawia { public double kto; public string rodzaj = ""; }

        /// <summary>Pamięć bota w jednej partii (nie w symulacji — ta trafia do zapisu).</summary>
        sealed class Pamiec
        {
            public double wymarsz;
            public string mysl = ""; public double myslOd = -1e9;
            /// <summary>ostatnia nieudana próba położenia planu (tik) — następna najwcześniej po pół minucie</summary>
            public Dictionary<string, double> nieudany = new Dictionary<string, double>();
            /// <summary>pobożny wezwany do ołtarza: po co i od kiedy</summary>
            public double? wezwany; public string? wezwanyCo; public double? wezwanyOd;
            /// <summary>rytuał odprawiony przez bota, który jeszcze trwa</summary>
            public Odprawia? odprawia;
            /// <summary>szał na demona już odprawiony w tej walce</summary>
            public bool? szalNaDemona;
            /// <summary>odesłani od demona (po walce bot odwołuje im rozkaz)</summary>
            public JsSet<double> odeslani = new JsSet<double>();
            /// <summary>walka z demonem już się zaczęła — gdzie stał wtedy demon</summary>
            public double[]? oslona;
            /// <summary>od kiedy krwi jest mniej niż 10 i kiedy bot ostatnio sam wydał krew na rytuał</summary>
            public double? krewNiskoOd; public double? wydalKrewT;
            /// <summary>6.11: od kiedy bot podnosi bramę lochu</summary>
            public double? bramaOd;
        }

        static readonly ConditionalWeakTable<Sim, Pamiec> pamieci = new ConditionalWeakTable<Sim, Pamiec>();
        static Pamiec pamiec(Sim sim) => pamieci.GetValue(sim, _ => new Pamiec());

        /// <summary>Zapisuje myśl bota (napis pod oknem obserwatorium).</summary>
        static void mysl(Sim sim, string tekst)
        {
            var p = pamiec(sim);
            p.mysl = tekst; p.myslOd = sim.tick;
        }

        static List<Creature> zywi(Sim sim) => sim.creatures.Where(c => !c.dead && c.race == Race.GOBLIN && c.straznik != true).ToList();
        static List<Creature> zRola(Sim sim, string r) => zywi(sim).Where(c => (c.rola ?? "pobozny") == r).ToList();
        static IleRol role(Sim sim)
        {
            var r = new IleRol();
            foreach (var c in zywi(sim)) { var x = c.rola ?? "pobozny"; if (x == "pobozny") r.pobozny++; else if (x == "robotnik") r.robotnik++; else if (x == "rycerz") r.rycerz++; }
            return r;
        }
        /// <summary>Remake v2: jedzenie to porcje w wiadrach.</summary>
        static double jedzenie(Sim sim) => porcjiWWiadrach(sim);
        static string imie(Creature c) => $"{NAZWA_ROLI[c.rola ?? "pobozny"].ToLowerInvariant()} #{JS.S(c.id)}";
        /// <summary>Faza końcowa: pomnik rozbity, demon wychodzi albo walczy.</summary>
        static bool walkaZDemonem(Sim sim) { var f = stanPomnika(sim).faza; return f == "rozpada" || f == "wychodzi" || f == "walka"; }
        static Creature? demon(Sim sim) => sim.creatures.FirstOrDefault(c => !c.dead && c.boss != null);
        static bool oslabiony(Sim sim, Creature c) => c.okaleczony == true || (c.zatrutyDo != null && sim.tick < c.zatrutyDo);

        /// <summary>Szukanie drogi poza budżetem tiku.</summary>
        static List<double>? droga(Sim sim, Creature c, Func<double, double, bool> cel, double limit)
        {
            var zostalo = budzetDrog();
            nowyTik(1);
            var d = szukajDrogi(sim, c, (_i, x, y) => cel(x, y), limit);
            nowyTik(zostalo);
            return d;
        }

        // ---------------------------------------------------------------------------------------------------- karty

        /// <summary>Zabytek: brać czy zostawić — premia ma być warta ceny w tej chwili.</summary>
        static (bool, string) wazZabytek(Sim sim, string typ)
        {
            var proc = procentSkorupy(sim);
            switch (typ)
            {
                case "relikwiarz":
                    return czoloDrogi(sim) < 0 ? (true, "droga gotowa — modlitwa ważniejsza niż kucie") : (false, "droga niegotowa — kucie ważniejsze");
                case "miecz":
                    return proc >= 70 ? (true, "blisko demona — mocniejszy rycerz się przyda") : (false, "za wcześnie — wolniejszy rycerz długo by się wlókł");
                case "kielich":
                {
                    var glodni = zywi(sim).Any(c => c.hunger > 0.5);
                    return jedzenie(sim) >= 15 && !glodni ? (true, "jedzenia dość — szybsze leczenie się opłaca") : (false, "za mało jedzenia — głód rósłby szybciej");
                }
                case "ksiega":
                    return sim.wiara < 70 ? (true, "brakuje wiary — modlitwy z księgi dadzą więcej") : (false, "wiary dość — szaleństwo nie jest tego warte");
            }
            return (false, "nie wiem, co to");
        }

        /// <summary>Karta wydarzenia: rozsądny wybór, a gdy go nie stać — domyślny. True, gdy była karta.</summary>
        public static bool kartaBota(Sim sim, string styl)
        {
            var e = sim.wydarzenia.biezace;
            if (e == null) return false;
            var i = e.rozsadny;
            if (styl == "bierny") i = e.domyslny;
            else if (e.rodzaj == "zabytek")
            {
                var typ = JS.At(sim.world.ruiny, e.x ?? -1)?.zabytek.typ;
                if (!string.IsNullOrEmpty(typ))
                {
                    var (wez, czemu) = wazZabytek(sim, typ!);
                    i = wez ? 0 : 1;
                    mysl(sim, $"{(wez ? "biorę" : "zostawiam")} {ZABYTEK[typ!].biernik} — {czemu}");
                }
            }
            else if (styl == "budowniczy" && e.rodzaj == "warta" && !JS.Tak(pamiec(sim).wymarsz)) i = 2;
            if (rozstrzygnij(sim, i) != null) rozstrzygnij(sim, e.domyslny);
            return true;
        }

        // ---------------------------------------------------------------------------------------------------- pomieszczenia

        static Pomieszczenie? pokoj(Sim sim, string r) => sim.pomieszczenia.FirstOrDefault(p => p.rodzaj == r);
        static Pomieszczenie? gotowy(Sim sim, string r) { var p = pokoj(sim, r); return p?.gotowe == true ? p : null; }

        sealed class KandPokoju { public double x, y, ex, ey, ocena; }

        /// <summary>Kładzie plan pokoju jak najbliżej sali z ołtarzem.</summary>
        static Pomieszczenie? zalozPokoj(Sim sim, string r)
        {
            var p = pamiec(sim);
            if (pokoj(sim, r) != null) return pokoj(sim, r);
            if (sim.tick - (p.nieudany.TryGetValue(r, out var n) ? n : -1e9) < M / 2) return null;
            var w = sim.world;
            var o = w.oltarz;
            var s = szablon(r);
            var kand = new List<KandPokoju>();
            for (var ey = o.y - 14; ey <= o.y + 14; ey++)
            {
                for (var ex = o.x - 34; ex <= o.x + 34; ex++)
                {
                    if (!w.inb(ex, ey) || !w.passable(ex, ey) || !stoi(sim, ex, ey)) continue;
                    foreach (var k in new double[] { 1, -1 })
                    {
                        var x0 = k > 0 ? ex + 1 : ex - s.w;
                        var cx = x0 + Math.Floor((s.w - 1) / 2);
                        var pr = probaPlanu(sim, r, cx, ey);
                        if (!pr.ok) continue;
                        double doKucia = 0;
                        foreach (var i in pr.kafle) if (w.solid(i % w.w, JS.ToInt32(i / w.w))) doKucia++;
                        kand.Add(new KandPokoju { x = cx, y = ey, ex = ex, ey = ey, ocena = Math.Abs(ex - o.x) + 2.5 * Math.Abs(ey - o.y) + 0.25 * doKucia + (Math.Abs(ex - w.szybX) < 3 ? 10 : 0) });
                    }
                }
            }
            JS.Sort(kand, (a, b) => a.ocena - b.ocena);
            var piechur = zRola(sim, "pobozny").FirstOrDefault() ?? zRola(sim, "rycerz").FirstOrDefault();
            foreach (var k in kand.Take(8))
            {
                if (piechur != null && droga(sim, piechur, (x, y) => Math.Abs(x - k.ex) <= 1 && y == k.ey && stoi(sim, x, y), 9000) == null) continue;
                var pr = probaPlanu(sim, r, k.x, k.y);
                if (!pr.ok) continue;
                var pom = polozPlan(sim, pr);
                mysl(sim, $"kładę plan: {NAZWA_POMIESZCZENIA[r]} obok sali z ołtarzem");
                return pom;
            }
            p.nieudany[r] = sim.tick;
            return null;
        }

        /// <summary>Droga wiernych wykopana.</summary>
        static bool drogaGotowa(Sim sim) => sim.planDrogi != null && czoloDrogi(sim) < 0;

        /// <summary>Jakie pokoje ten styl chce mieć teraz (po kolei).</summary>
        static List<string> chcePokoje(Sim sim, string styl)
        {
            if (!drogaGotowa(sim)) return new List<string>();
            var @out = new List<string> { "kuznia" };
            var ktosOslabiony = zywi(sim).Any(c => oslabiony(sim, c));
            if (styl == "budowniczy") { @out.Add("sypialnia"); @out.Add("warsztat"); }
            else if (styl == "rozsadny")
            {
                if (ktosOslabiony || sim.krew < 45) @out.Add("sypialnia");
                if (sim.zloto >= 1 || sim.wiara < 60) @out.Add("warsztat");
            }
            else if (ktosOslabiony) @out.Add("sypialnia");
            return @out;
        }

        // ---------------------------------------------------------------------------------------------------- robotnicy

        /// <summary>Czym robotnik zajmuje się teraz (z rozkazu): 'droga' | 'gruz' | 'plan' | 'kuznia' | 'warsztat' | 'zelazo' | 'zloto' — albo null.</summary>
        static string? zajecie(Sim sim, Creature c)
        {
            var p = c.polecenie;
            if (p == null) return null;
            var w = sim.world;
            if (p.typ == "droga") return "droga";
            if (p.typ == "kop" && p.pom != null) return "plan";
            if (p.typ == "kop" && !string.IsNullOrEmpty(p.zyla)) return p.zyla == "zelazo" ? "zelazo" : "zloto";
            if (p.typ == "kop" && w.solid(p.x, p.y)) return scianaGruzu(sim)?.kafle.Contains(w.idx(p.x, p.y)) == true ? "gruz" : "plan";
            if (p.typ == "praca")
            {
                var pom = sim.pomieszczenia.FirstOrDefault(q => q.id == p.pom);
                return pom?.rodzaj == "kuznia" ? "kuznia" : pom?.rodzaj == "warsztat" ? "warsztat" : null;
            }
            return null;
        }

        /// <summary>Ile żelaza jeszcze trzeba na resztę zbroi.</summary>
        static double brakZelaza(Sim sim)
        {
            var kuz = pokoj(sim, "kuznia");
            double trzeba = 0;
            foreach (var cz in POMIESZCZENIA.kuznia.czesci) if (!sim.zbroja.Contains(cz.id)) trzeba += cz.zelazo;
            if (kuz?.zaplacone == true) trzeba -= nastepnaCzesc(sim)?.zelazo ?? 0;
            return Math.Max(0, trzeba - sim.zelazo);
        }

        /// <summary>Robotnik idzie na najbliższą odsłoniętą żyłę danej rudy, do której dojdzie — „kop żyłę”.</summary>
        static bool naZyle(Sim sim, Creature c, string ruda, List<(double, double)> zajete)
        {
            var w = sim.world;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            var sciezka = sim.planDrogi != null ? new HashSet<double>(sim.planDrogi.sciezka) : null;
            var kand = new List<(double d, double x, double y)>();
            var o = w.oltarz;
            for (var y = Math.Max(1, o.y - 12); y <= Math.Min(w.h - 2, o.y + 14); y++)
            {
                for (var x = Math.Max(1, o.x - 26); x <= Math.Min(w.w - 2, o.x + 26); x++)
                {
                    if (!w.solid(x, y) || kruszecKafla(w.get(x, y)) != ruda || w.hardness(x, y) <= 0) continue;
                    if ((sciezka != null && sciezka.Contains(w.idx(x, y - 1))) || wStrefieStraznikow(sim, x, y, 4)) continue;
                    if (zajete.Any(z => Math.Abs(z.Item1 - x) < 10 && Math.Abs(z.Item2 - y) < 10)) continue;
                    var odslonieta = w.passable(x - 1, y) || w.passable(x + 1, y) || w.passable(x, y - 1) || w.passable(x, y + 1);
                    if (!odslonieta) continue;
                    kand.Add((Math.Abs(x - cx) + Math.Abs(y - cy) * 1.3, x, y));
                }
            }
            JS.Sort(kand, (a, b) => a.d - b.d);
            foreach (var (_, x, y) in kand.Take(6).ToList())
            {
                if (droga(sim, c, (sx, sy) => Math.Abs(sx - x) <= 1 && Math.Abs(sy - y) <= 1 && stoi(sim, sx, sy), 9000) == null) continue;
                if (wydajPolecenie(sim, c, "idz", x, y) == null)
                {
                    mysl(sim, $"{imie(c)}: kop żyłę {(ruda == "zelazo" ? "żelaza — na zbroję rycerza" : "złota — na krzyże w warsztacie")}");
                    return true;
                }
            }
            return false;
        }

        /// <summary>Robotnik, który został w jamie po żyle i nie dojdzie do sali, dostaje linę.</summary>
        static bool linaZJamy(Sim sim, Creature c)
        {
            var w = sim.world;
            var o = w.oltarz;
            if (JS.Hypot(c.x - o.x, c.y - o.y) < 8) return false;
            if (droga(sim, c, (x, y) => Math.Abs(x - o.x) <= 6 && Math.Abs(y - o.y) <= 2 && stoi(sim, x, y), 16000) != null) return false;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            foreach (var dx in new double[] { 0, 1, -1, 2, -2, 3, -3 })
            {
                var x = cx + dx;
                if (!w.inb(x, cy) || !w.passable(x, cy) || !stoi(sim, x, cy)) continue;
                var yt = cy;
                while (w.inb(x, yt - 1) && w.passable(x, yt - 1) && cy - yt < 14) yt--;
                if (cy - yt < 2) continue;
                var kot = kotwicaLiny(w, x, yt);
                if (kot == null || kot.rodzaj != "krawedz") continue;
                var pr = probaPlanu(sim, "lina", x, yt);
                if (!pr.ok || powiesLine(sim, pr) != null) continue;
                mysl(sim, $"wieszam linę — {imie(c)} utknął w jamie po żyle");
                return true;
            }
            return false;
        }

        /// <summary>Rozdziela robotników: zawsze jeden zostaje wolny (nosi jedzenie), reszta — po kolei według potrzeb.</summary>
        static void robotnicy(Sim sim, string styl)
        {
            var w = sim.world;
            var rob = zRola(sim, "robotnik");
            if (rob.Count == 0) return;
            foreach (var c in rob)
            {
                var p = c.polecenie;
                if (p == null || pamiec(sim).odeslani.has(c.id)) continue;
                var zylaWykuta = p.typ == "kop" && string.IsNullOrEmpty(p.zyla) && p.pom == null && !w.solid(p.x, p.y);
                var pom = p.typ == "praca" ? sim.pomieszczenia.FirstOrDefault(q => q.id == p.pom) : null;
                var bezSurowca = pom != null && !string.IsNullOrEmpty(pom.brak) && pom.zaplacone != true && (pom.rodzaj == "kuznia" ? sim.zelazo < (nastepnaCzesc(sim)?.zelazo ?? 99) : sim.zloto < 1);
                var gornik = p.typ == "kop" && (!string.IsNullOrEmpty(p.zyla) || p.pom != null);
                var wraca = gornik && (c.hunger > 0.45 || (p.zylaIle ?? 0) >= 8);
                if (zylaWykuta || bezSurowca || wraca || (p.typ == "idz" && !walkaZDemonem(sim)))
                {
                    odwolajPolecenie(sim, c);
                    if (zylaWykuta) linaZJamy(sim, c);
                }
            }
            var potrzeby = new List<string>();
            var kuz = pokoj(sim, "kuznia"); var war = pokoj(sim, "warsztat");
            if (czoloDrogi(sim) >= 0) { potrzeby.Add("droga"); potrzeby.Add("droga"); }
            var sc = scianaGruzu(sim);
            if (sc != null && walkaZDemonem(sim)) potrzeby.Add("gruz");
            var poDrodze = drogaGotowa(sim);
            if (poDrodze) foreach (var pom in sim.pomieszczenia) if (!pom.gotowe && (pom.rodzaj == "kuznia" || pom.rodzaj == "warsztat" || pom.rodzaj == "sypialnia")) { potrzeby.Add("plan"); potrzeby.Add("plan"); }
            var czesc = nastepnaCzesc(sim);
            if (kuz?.gotowe == true && czesc != null && (kuz.zaplacone == true || sim.zelazo >= czesc.zelazo)) potrzeby.Add("kuznia");
            if (war?.gotowe == true && sim.zloto >= 1) potrzeby.Add("warsztat");
            if (poDrodze && kuz != null && brakZelaza(sim) > 0) { potrzeby.Add("zelazo"); potrzeby.Add("zelazo"); }
            if (poDrodze && war != null && styl != "speedrun" && sim.zloto < 3) potrzeby.Add("zloto");
            var podPomnikiem = zRola(sim, "pobozny").Any(c => c.job == Job.PIELGRZYM || wStrefieStraznikow(sim, c.x, c.y));
            var limit = Math.Max(0, rob.Count - (podPomnikiem && czoloDrogi(sim) < 0 ? 2 : 1));
            var ile = new Dictionary<string, double>();
            var zajetych = 0;
            foreach (var c in rob) { var z = zajecie(sim, c); if (z != null) { ile[z] = (ile.TryGetValue(z, out var v) ? v : 0) + 1; zajetych++; } }
            var chce = new Dictionary<string, double>();
            foreach (var z in potrzeby) chce[z] = (chce.TryGetValue(z, out var v) ? v : 0) + 1;
            var zyly = rob.Where(c => !string.IsNullOrEmpty(c.polecenie?.zyla)).Select(c => (c.polecenie!.x, c.polecenie!.y)).ToList();
            var wolni = JS.Sort(rob.Where(c => c.polecenie == null && c.hunger < 0.4 && !(c.odmowa != null && sim.tick - c.odmowa.od < M / 2) && c.wDloni != true && c.lot == null).ToList(),
                (a, b) => a.hunger - b.hunger);
            double ileZ(string z) => ile.TryGetValue(z, out var v) ? v : 0;
            double chceZ(string z) => chce.TryGetValue(z, out var v) ? v : 0;
            foreach (var c in wolni)
            {
                if (zajetych >= limit) break;
                if (walkaZDemonem(sim) && !(sc != null && ileZ("gruz") < 1)) break;
                var z = potrzeby.Distinct().FirstOrDefault(q => ileZ(q) < chceZ(q));
                if (z == null) break;
                var ok = false;
                if (z == "droga")
                {
                    ok = wydajPolecenie(sim, c, "droga", 0, 0) == null;
                    if (ok) mysl(sim, $"{imie(c)}: kop drogę wiernych — zostało {nieWykopane(sim).Count} kafli");
                }
                else if (z == "gruz" && sc != null)
                {
                    var kk = sc.kafle.Select(i => (double?)i).FirstOrDefault(i => w.solid(i!.Value % w.w, JS.ToInt32(i.Value / w.w)));
                    if (kk != null && JS.Hypot(c.x - sc.x, c.y - sc.dno) < 30)
                    {
                        var k = kk.Value;
                        ok = wydajPolecenie(sim, c, "idz", k % w.w, JS.ToInt32(k / w.w)) == null;
                        if (ok) mysl(sim, $"{imie(c)} rozkuwa gruz po zawale — demon jest odcięty");
                    }
                }
                else if (z == "plan")
                {
                    var pom = sim.pomieszczenia.FirstOrDefault(q => !q.gotowe && (q.rodzaj == "kuznia" || q.rodzaj == "warsztat" || q.rodzaj == "sypialnia"));
                    if (pom != null)
                    {
                        ok = wydajNaPomieszczenie(sim, new List<double> { c.id }, pom).przyjeli > 0;
                        if (ok) mysl(sim, $"{imie(c)} kuje {BIERNIK_POMIESZCZENIA[pom.rodzaj]}");
                    }
                }
                else if (z == "kuznia" && kuz != null)
                {
                    ok = wydajNaPomieszczenie(sim, new List<double> { c.id }, kuz).przyjeli > 0;
                    if (ok) mysl(sim, $"{imie(c)} kuje {czesc?.nazwa ?? "zbroję"} dla rycerza");
                }
                else if (z == "warsztat" && war != null)
                {
                    ok = wydajNaPomieszczenie(sim, new List<double> { c.id }, war).przyjeli > 0;
                    if (ok) mysl(sim, $"{imie(c)} robi krzyże ze złota — będzie wiara");
                }
                else if (z == "zelazo" || z == "zloto")
                {
                    ok = naZyle(sim, c, z, zyly);
                    if (ok) zyly.Add((c.polecenie!.x, c.polecenie!.y));
                }
                if (ok) { ile[z] = ileZ(z) + 1; zajetych++; }
                else chce[z] = 0;
            }
        }

        // ---------------------------------------------------------------------------------------------------- brama, rycerz

        /// <summary>6.11: stalowa brama lochu — dwóch pobożnych do kotła, rycerze pod bramę, potem do lochu.</summary>
        static void brama(Sim sim)
        {
            var w = sim.world; var p = pamiec(sim);
            if (w.brama.x1 < w.brama.x0 || czoloDrogi(sim) >= 0 || sim.rytual.otwarta) return;
            var st = stanBramy(sim);
            var pobozni = zRola(sim, "pobozny");
            var zaklinaja = pobozni.Where(c => c.polecenie?.zaklinaj == true).ToList();
            bool wLochu(Creature c) => w.wLochu(c.x, c.y);
            string? wPosterunku(Creature c) => wydajPolecenie(sim, c, "idz", w.coreX + (JS.Tak(c.id % 2) ? -6 : 6), w.przedsionekY);
            if (zaklinaja.Count > 0)
            {
                if (st.otwarcie >= 0.97)
                {
                    foreach (var c in zaklinaja)
                    {
                        odwolajPolecenie(sim, c);
                        if (sim.wiara < 8 || !whisper(sim, "modl", c)) wydajPolecenie(sim, c, "idz", w.coreX + (JS.Tak(c.id % 2) ? -3 : 3), w.przedsionekY);
                    }
                    foreach (var c in zRola(sim, "rycerz")) if (!wLochu(c)) wPosterunku(c);
                    mysl(sim, "brama lochu podniesiona — pobożni z kotła schodzą pod pomnik, rycerze wchodzą do lochu");
                    return;
                }
                if (zaklinaja.Count < BRAMA.potrzeba)
                {
                    var k = w.kociol;
                    var wolni = JS.Sort(pobozni.Where(c => c.polecenie == null && !wLochu(c) && c.hunger < 0.6).ToList(),
                        (a, b) => JS.Hypot(a.x - k.x, a.y - k.y) - JS.Hypot(b.x - k.x, b.y - k.y)).Take((int)(BRAMA.potrzeba - zaklinaja.Count)).ToList();
                    if (wolni.Count > 0 && JS.Tak(wydajDoKotla(sim, wolni.Select(c => c.id).ToList()).przyjeli)) mysl(sim, "przy kotle zaklina za mało pobożnych — dosyłam drugiego");
                }
                return;
            }
            if (JS.Tak(p.bramaOd) && !st.wolne) p.bramaOd = null;
            if (st.otwarcie >= BRAMA.idzieOd)
            {
                foreach (var c in zRola(sim, "rycerz")) if (!wLochu(c) && w.wPrzedprozu(c.x, c.y)) wPosterunku(c);
                return;
            }
            var chcaWejsc = pobozni.Any(c => (c.job == Job.PIELGRZYM || c.wyprawa == true) && !wLochu(c))
                || zywi(sim).Any(c => w.wPrzedprozu(c.x, c.y));
            if (!chcaWejsc || stanPomnika(sim).faza == "kona") return;
            var kk = w.kociol;
            var wolni2 = JS.Sort(pobozni.Where(c => !wLochu(c) && c.hunger < 0.6).ToList(), (a, b) => JS.Hypot(a.x - kk.x, a.y - kk.y) - JS.Hypot(b.x - kk.x, b.y - kk.y)).Take((int)BRAMA.potrzeba).ToList();
            if (wolni2.Count < BRAMA.potrzeba) return;
            var r = wydajDoKotla(sim, wolni2.Select(c => c.id).ToList());
            if (!JS.Tak(r.przyjeli)) return;
            p.bramaOd = sim.tick;
            var pp = w.przedproze;
            foreach (var c in zRola(sim, "rycerz")) if (!wLochu(c)) wydajPolecenie(sim, c, "idz", pp.x1 - 1 - (c.id % 3), pp.y1);
            mysl(sim, "brama lochu zamknięta — dwóch pobożnych do kotła, rycerze pod bramę");
        }

        static void rycerzNaFale(Sim sim)
        {
            var w = sim.world;
            var fala = sim.lud.straznicy?.trwa == true;
            var p = pamiec(sim);
            foreach (var c in zRola(sim, "rycerz"))
            {
                if (walkaZDemonem(sim)) continue;
                if (JS.Tak(p.bramaOd) && sim.tick - p.bramaOd < 4 * M) continue;
                var daleko = JS.Hypot(c.x - w.coreX, c.y - w.przedsionekY) > STRAZNICY.rycerzWidzi * 0.75;
                if (fala && daleko && (c.polecenie == null || c.polecenie.typ == "zbroja") && !(c.odmowa != null && sim.tick - c.odmowa.od < M / 2))
                {
                    if (wydajPolecenie(sim, c, "idz", w.coreX + (JS.Tak(c.id % 2) ? -6 : 6), w.przedsionekY) == null) mysl(sim, "fala Strażników — rycerz biegnie pod pomnik");
                }
                else if (!fala && c.polecenie?.typ == "idz") odwolajPolecenie(sim, c);
            }
        }

        /// <summary>Części zbroi wiszą na wieszaku w kuźni — rycerz idzie je założyć.</summary>
        static void rycerzPoZbroje(Sim sim)
        {
            var kuz = gotowy(sim, "kuznia");
            var wisi = naWieszaku(sim);
            if (kuz == null || wisi.Count == 0 || falaTrwa(sim) || walkaZDemonem(sim) || procentSkorupy(sim) >= 97) return;
            foreach (var c in zRola(sim, "rycerz"))
            {
                if (c.polecenie != null || c.hunger > 0.6 || (c.odmowa != null && sim.tick - c.odmowa.od < M / 2)) continue;
                if (wydajNaPomieszczenie(sim, new List<double> { c.id }, kuz).przyjeli > 0)
                {
                    mysl(sim, $"rycerz idzie do kuźni założyć: {string.Join(", ", wisi.Select(cz => POMIESZCZENIA.kuznia.czesci.FirstOrDefault(q => q.id == cz)?.nazwa ?? cz))}");
                }
            }
        }

        // ---------------------------------------------------------------------------------------------------- walka z demonem

        static void walka(Sim sim)
        {
            var p = pamiec(sim);
            var w = sim.world;
            if (!walkaZDemonem(sim))
            {
                if (p.odeslani.size > 0)
                {
                    foreach (var id in p.odeslani) { var c = sim.creatureById(id); if (c != null && !c.dead && c.polecenie?.typ == "idz") odwolajPolecenie(sim, c); }
                    p.odeslani.clear();
                }
                p.oslona = null;
                return;
            }
            var d = demon(sim);
            double dx = d != null ? d.x : w.coreX + 0.5, dy = d != null ? d.y : w.coreY;
            double salaX = w.oltarz.x, salaY = w.oltarz.y;
            foreach (var c in zywi(sim))
            {
                var r = c.rola ?? "pobozny";
                if (r == "rycerz" || p.odeslani.has(c.id) || c.wDloni == true || c.lot != null) continue;
                if (p.wezwany == c.id || p.odprawia?.kto == c.id) continue;
                if (c.polecenie != null && c.polecenie.typ != "idz" && zajecie(sim, c) != null) continue;
                if (JS.Hypot(c.x - dx, c.y - dy) > 24) continue;
                if (wydajPolecenie(sim, c, "idz", salaX + (JS.Tak(c.id % 2) ? -8 : 8), salaY) == null)
                {
                    p.odeslani.add(c.id);
                    mysl(sim, $"{imie(c)} odchodzi od demona — nie ma czym walczyć");
                    continue;
                }
                if (w.brama.x1 >= w.brama.x0 && w.wLochu(c.x, c.y))
                {
                    var L = w.loch;
                    var kx = dx < (L.x0 + L.x1) / 2 ? L.x1 - 2 - (c.id % 3) : L.x0 + 2 + (c.id % 3);
                    if (wydajPolecenie(sim, c, "idz", kx, L.y1) == null)
                    {
                        p.odeslani.add(c.id);
                        mysl(sim, $"{imie(c)} odchodzi od demona na drugi koniec lochu — krata opadła");
                    }
                }
            }
            foreach (var c in zRola(sim, "rycerz"))
            {
                if (c.polecenie?.typ == "idz" || c.polecenie?.typ == "zbroja")
                {
                    odwolajPolecenie(sim, c);
                    if (p.oslona == null) { p.oslona = new[] { JS.Round(dx), JS.Round(dy) }; mysl(sim, "rycerz rusza na demona — bezbronni odchodzą w górę drogi"); }
                }
            }
        }

        // ---------------------------------------------------------------------------------------------------- ołtarz

        /// <summary>Najbliższy ołtarza pobożny (do ofiary krwi — nieokaleczony) — albo null.</summary>
        static Creature? pobozny(Sim sim, string rodzaj, bool tylkoBlisko)
        {
            var o = sim.world.oltarz;
            var lista = JS.Sort(zRola(sim, "pobozny").Where(c => c.wDloni != true && c.lot == null && (rodzaj != "ofiaraKrwi" || c.okaleczony != true))
                .Where(c => !tylkoBlisko || (JS.Hypot(c.x - o.x, c.y - o.y) < 22 && c.job != Job.PIELGRZYM)).ToList(),
                (a, b) => JS.Hypot(a.x - o.x, a.y - o.y) - JS.Hypot(b.x - o.x, b.y - o.y));
            return lista.FirstOrDefault();
        }

        sealed class Potrzeba { public string rodzaj = ""; public bool zDaleka; public string czemu = ""; }

        /// <summary>Jakiego rytuału trzeba teraz (i czy wolno w tym celu ściągnąć pobożnego z daleka).</summary>
        static Potrzeba? potrzebnyRytual(Sim sim, string styl)
        {
            var wolna = sim.krew - sim.rezerwa.krew;
            var proc = procentSkorupy(sim);
            var faza = stanPomnika(sim).faza;
            var ryc = zRola(sim, "rycerz").FirstOrDefault();
            if (styl != "speedrun" && ryc != null && pamiec(sim).szalNaDemona != true && (faza == "rozpada" || faza == "wychodzi" || faza == "walka") && wolna >= 30)
                return new Potrzeba { rodzaj = "szal", zDaleka = true, czemu = "szał krwi — rycerz uderzy mocniej w demona" };
            var trup = polegli(sim).FirstOrDefault();
            if (trup != null && wolna >= 100 && !walkaZDemonem(sim)) return new Potrzeba { rodzaj = "wskrzeszenie", zDaleka = true, czemu = $"wskrzeszam poległego ({NAZWA_ROLI[trup.rola].ToLowerInvariant()} #{JS.S(trup.id)})" };
            var p = pamiec(sim);
            if (sim.krew < 10 && sim.tick - (p.krewNiskoOd ?? sim.tick) > M && sim.tick - (p.wydalKrewT ?? -1e9) > 2 * M && role(sim).pobozny >= 2 && proc < 60)
                return new Potrzeba { rodzaj = "ofiaraZycia", zDaleka = false, czemu = "krwi prawie nie ma — pobożny oddaje życie na ołtarzu" };
            if (sim.krew < 30 && gotowy(sim, "sypialnia") != null) return new Potrzeba { rodzaj = "ofiaraKrwi", zDaleka = false, czemu = "krwi mało — ofiara krwi, potem sen w sypialni" };
            if (sim.wiara < 40 && wolna >= 70 && styl != "speedrun" && drogaGotowa(sim)) return new Potrzeba { rodzaj = "modlitwa", zDaleka = false, czemu = "brakuje wiary — modlitwa przy ołtarzu" };
            return null;
        }

        /// <summary>Ołtarz: wzywa pobożnego, a gdy stanie przy nim — odprawia rytuał.</summary>
        static void oltarz(Sim sim, string styl)
        {
            var p = pamiec(sim);
            var o = sim.world.oltarz;
            var r = rytualOltarza(sim);
            if (p.odprawia != null && r == null)
            {
                var c0 = sim.creatureById(p.odprawia.kto);
                if (p.odprawia.rodzaj == "szal") p.szalNaDemona = true;
                if (c0 != null && !c0.dead)
                {
                    if (c0.polecenie?.typ == "idz") odwolajPolecenie(sim, c0);
                    var syp = gotowy(sim, "sypialnia");
                    if (p.odprawia.rodzaj == "ofiaraKrwi" && syp != null && wydajNaPomieszczenie(sim, new List<double> { c0.id }, syp).przyjeli > 0) mysl(sim, $"{imie(c0)} idzie spać — sen zdejmie okaleczenie");
                }
                p.odprawia = null;
            }
            if (sim.krew < 10) p.krewNiskoOd ??= sim.tick; else p.krewNiskoOd = null;
            if (r != null) return;
            var potrzeba = potrzebnyRytual(sim, styl);
            var czekaNaSzal = styl != "speedrun" && p.szalNaDemona != true && procentSkorupy(sim) >= 92 && stanPomnika(sim).faza == "stoi" && sim.krew - sim.rezerwa.krew >= 30;
            var rodzaj = potrzeba?.rodzaj ?? (czekaNaSzal ? "szal" : null);
            if (p.wezwany != null)
            {
                var c1 = sim.creatureById(p.wezwany.Value);
                var zaDlugo = sim.tick - (p.wezwanyOd ?? 0) > 3 * M;
                if (c1 == null || c1.dead || rodzaj == null || zaDlugo || c1.polecenie?.typ != "idz")
                {
                    if (c1 != null && !c1.dead && c1.polecenie?.typ == "idz") odwolajPolecenie(sim, c1);
                    p.wezwany = null;
                }
            }
            if (rodzaj == null) return;
            var c = p.wezwany != null ? sim.creatureById(p.wezwany.Value) : null;
            var ten = c != null && !c.dead && przyOltarzu(sim, c) ? c : zRola(sim, "pobozny").FirstOrDefault(q => przyOltarzu(sim, q) && (rodzaj != "ofiaraKrwi" || q.okaleczony != true));
            if (ten != null && potrzeba != null)
            {
                var cel = rodzaj == "wskrzeszenie" ? polegli(sim).FirstOrDefault()?.id : null;
                if (czemuNie(sim, rodzaj, cel) == null && odprawRytual(sim, rodzaj, cel, ten.id) == null)
                {
                    p.odprawia = new Odprawia { kto = ten.id, rodzaj = rodzaj };
                    if (rodzaj == "modlitwa" || rodzaj == "szal" || rodzaj == "wskrzeszenie") p.wydalKrewT = sim.tick;
                    mysl(sim, $"{NAZWA_RYTUALU[rodzaj]} przy ołtarzu — {potrzeba.czemu}");
                }
                return;
            }
            if (ten != null || p.wezwany != null) return;
            var zDaleka = potrzeba != null ? potrzeba.zDaleka : true;
            var kto = pobozny(sim, rodzaj, !zDaleka);
            if (kto == null) return;
            double s = kto.x < o.x + 0.5 ? -1 : 1;
            if (wydajPolecenie(sim, kto, "idz", o.x + 2 * s, o.y) == null)
            {
                p.wezwany = kto.id; p.wezwanyCo = rodzaj; p.wezwanyOd = sim.tick;
                mysl(sim, rodzaj == "szal" && potrzeba == null ? $"{imie(kto)} idzie do ołtarza — czeka z szałem krwi na demona"
                    : $"{imie(kto)} idzie do ołtarza: {NAZWA_RYTUALU[rodzaj].ToLowerInvariant()}");
            }
        }

        // ---------------------------------------------------------------------------------------------------- sen

        /// <summary>Osłabionych bot posyła spać do sypialni — między falami, nie w walce z demonem.</summary>
        static void sen(Sim sim)
        {
            var syp = gotowy(sim, "sypialnia");
            if (syp == null || falaTrwa(sim) || walkaZDemonem(sim)) return;
            var p = pamiec(sim);
            var spia = sim.creatures.Count(c => !c.dead && c.polecenie?.typ == "sen");
            if (spia >= 2) return;
            foreach (var c in zywi(sim))
            {
                if (!oslabiony(sim, c) || c.polecenie != null || c.hunger > 0.5 || p.wezwany == c.id || p.odprawia?.kto == c.id) continue;
                if (wydajNaPomieszczenie(sim, new List<double> { c.id }, syp).przyjeli > 0) { mysl(sim, $"{imie(c)} idzie spać do sypialni — sen zdejmie osłabienie"); return; }
            }
        }

        // ---------------------------------------------------------------------------------------------------- jedzenie, wiara, pielgrzymka

        /// <summary>Wiadro najgłodniejszemu (ryt Nakarm).</summary>
        static void nakarm(Sim sim, double prog, double krewOd)
        {
            Creature? najg = null;
            foreach (var c in zywi(sim)) if (c.hunger >= prog && (najg == null || c.hunger > najg.hunger)) najg = c;
            if (najg != null && sim.krew > krewOd && seed(sim, "grzyb", JS.Round(najg.x), JS.Round(najg.y))) mysl(sim, $"Nakarm — wiadro dla głodnego ({imie(najg)})");
        }

        /// <summary>Cud przy ludzie — oddanie rośnie, a z nim rytuał pod pomnikiem.</summary>
        static void cud(Sim sim, double wiaraOd, double oddanieDo)
        {
            var k = sim.clans.FirstOrDefault(x => !x.dead && x.race == Race.GOBLIN);
            if (k != null && k.devotion < oddanieDo && sim.wiara >= wiaraOd && sign(sim, "objawienie", k.hx, k.hy)) mysl(sim, "Cud przy ludzie — oddanie rośnie");
        }

        /// <summary>„Módl się”: pobożni idą pod pomnik.</summary>
        static void dopomnika(Sim sim, double maxGlod)
        {
            var p = pamiec(sim);
            var poslal = 0;
            foreach (var c in zRola(sim, "pobozny"))
            {
                if (c.job == Job.PIELGRZYM || c.wyprawa == true || c.hunger > maxGlod || sim.wiara < 8) continue;
                if (c.polecenie != null || p.wezwany == c.id || p.odprawia?.kto == c.id || p.odeslani.has(c.id)) continue;
                if (whisper(sim, "modl", c)) poslal++;
            }
            if (poslal > 0) mysl(sim, $"pobożni schodzą pod pomnik i się modlą ({JS.S(procentSkorupy(sim))}%)");
        }

        static void rozsadny(Sim sim, double k)
        {
            var w = sim.world;
            nakarm(sim, 0.6, 70);
            if (k % 15 == 0 && sim.krew > 60 && sim.jedzeniePrzedsionka < 3 && seed(sim, "grzyb", w.coreX, w.przedsionekY)) mysl(sim, "Nakarm — wiadro dla warty pod pomnikiem");
            if (k % 20 == 0) cud(sim, 35, 0.7);
            if (k % 10 == 0 && !sim.rytual.otwarta && sim.jedzeniePrzedsionka >= 3) dopomnika(sim, 0.35);
        }

        static void budowniczy(Sim sim, double k)
        {
            var p = pamiec(sim);
            if (k % 10 == 0) nakarm(sim, 0.65, 60);
            if (k % 40 == 0) cud(sim, 70, 0.9);
            if (!JS.Tak(p.wymarsz))
            {
                var gotow = jedzenie(sim) >= 12 && sim.krew >= 40 && czoloDrogi(sim) < 0;
                if (gotow || sim.tick > 8 * M) { p.wymarsz = sim.tick; mysl(sim, "wymarsz — pobożni schodzą pod pomnik"); }
            }
            if (JS.Tak(p.wymarsz) && k % 10 == 0) dopomnika(sim, 0.5);
        }

        static void speedrun(Sim sim, double k)
        {
            if (k % 10 == 0) nakarm(sim, 0.65, 60);
            if (k % 20 == 0) cud(sim, 30, 0.95);
            if (k % 10 == 0) dopomnika(sim, 1);
        }

        /// <summary>Etap 4: przecięta lina wiadra — po chwili najbliższy idzie ją skleić.</summary>
        static void naprawLine(Sim sim)
        {
            var lp = linaPrzecieta(sim);
            if (lp == null || sim.tick - lp.od < 8 * 120 || sklejajacy(sim) != null) return;
            if (sim.creatures.Any(c => !c.dead && c.polecenie?.typ == "naprawa")) return;
            var r = wydajNaprawe(sim, new List<double>());
            if (r.kto != null) mysl(sim, $"dłoń przecięła linę wiadra — {imie(r.kto)} idzie ją skleić");
        }

        // ---------------------------------------------------------------------------------------------------- ruch i myśl

        /// <summary>Jeden ruch bota (co BOT_CO tików).</summary>
        public static void ruchBota(Sim sim, string styl)
        {
            if (sim.ending != null) return;
            if (kartaBota(sim, styl)) return;
            if (styl == "bierny") return;
            var k = Math.Floor(sim.tick / BOT_CO);
            naprawLine(sim);
            walka(sim);
            if (k % 2 == 1) brama(sim);
            if (k % 2 == 0) oltarz(sim, styl);
            if (k % 5 == 0)
            {
                foreach (var r in chcePokoje(sim, styl)) { if (pokoj(sim, r) == null) { zalozPokoj(sim, r); break; } }
                robotnicy(sim, styl);
            }
            if (k % 10 == 5) { rycerzNaFale(sim); rycerzPoZbroje(sim); sen(sim); }
            if (styl == "budowniczy") budowniczy(sim, k);
            else if (styl == "speedrun") speedrun(sim, k);
            else rozsadny(sim, k);
        }

        /// <summary>Ostatnia decyzja bota i kiedy zapadła (dziennik prób).</summary>
        public static (string tekst, double od) decyzjaBota(Sim sim)
        {
            var p = pamiec(sim);
            return (p.mysl, p.myslOd);
        }

        /// <summary>Napis pod oknem obserwatorium: ostatnia decyzja bota, a gdy dawno nic — co się teraz dzieje.</summary>
        public static string myslBota(Sim sim, string styl)
        {
            if (styl == "bierny") return "bot nic nie robi — patrzy";
            if (sim.ending != null) return "";
            var p = pamiec(sim);
            if (!string.IsNullOrEmpty(p.mysl) && sim.tick - p.myslOd < MYSL_TIKOW) return p.mysl;
            var faza = stanPomnika(sim).faza;
            if (faza == "walka" || faza == "wychodzi" || faza == "rozpada") return "walka z demonem — rycerz na demona, reszta z dala";
            if (falaTrwa(sim)) return "fala Strażników — rycerz broni pobożnych pod pomnikiem";
            if (czoloDrogi(sim) >= 0) return $"kopiemy drogę wiernych — zostało {nieWykopane(sim).Count} kafli";
            if (styl == "budowniczy" && !JS.Tak(p.wymarsz)) return "przygotowania przed wymarszem pod pomnik";
            var kuz = pokoj(sim, "kuznia");
            var zbroja = $"zbroja {sim.zbroja.Count}/{POMIESZCZENIA.kuznia.czesci.Length}";
            return $"pobożni kruszą pomnik — {JS.S(procentSkorupy(sim))}%{(kuz != null ? $" · {zbroja}" : "")}";
        }
    }
}
