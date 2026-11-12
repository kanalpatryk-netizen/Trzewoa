// Port: alpha-1/src/sim/wiadro.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyWiadro;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyStworzenia;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Droga;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Wiadro z jedzeniem (faza: 'zapowiedz' | 'zjezdza' | 'stoi' | 'odjezdza' | 'spada' | 'rozbite').</summary>
    public sealed class WiadroJedzenia
    {
        public double id;
        /// <summary>Kolumna liny i wiadra.</summary>
        public double x;
        /// <summary>Pierwszy pusty kafel pod stropem jamy — stąd wyłania się z góry.</summary>
        public double sufit;
        /// <summary>Kafel, na którym stanie (pod nim podłoga).</summary>
        public double cel;
        /// <summary>Kafel, w którym jest teraz (ułamek w czasie jazdy).</summary>
        public double y;
        public string faza = "zapowiedz";
        /// <summary>Tik początku fazy.</summary>
        public double od;
        public double porcje;
        public double pelne;
        /// <summary>Prędkość zjazdu (kafle na tik).</summary>
        public double v;
        /// <summary>Spuszczone rytem „Nakarm”.</summary>
        public bool? nakarm;
        /// <summary>Alpha: zjeżdża szybem z powierzchni do sali z siedzibą.</summary>
        public bool? szyb;
    }

    public sealed class StanWiader
    {
        public List<WiadroJedzenia> lista = new List<WiadroJedzenia>();
        /// <summary>Tik następnego wiadra.</summary>
        public double nastepne;
        public double nr;
        /// <summary>Tik ostatniego wyłonienia się wiadra — ekran gra wtedy dźwięk.</summary>
        public double? zjazdT;
        /// <summary>Alpha, etap 4: lina przecięta przez dłoń z otchłani (sim/lina-wiadra.ts).</summary>
        public LinaPrzecieta? przecieta;
        /// <summary>Tik ostatniej naprawy liny i ile razy ją przecięto.</summary>
        public double? naprawionaT;
        public double? ciec;
    }

    /// <summary>Przecięta lina wiadra: kolumna, koniec górnego kikuta, podłoga pod nim i kto ją skleja.</summary>
    public sealed class LinaPrzecieta
    {
        public double od;
        public double x;
        /// <summary>Do tej wysokości zwisa z góry górny kawałek.</summary>
        public double koniec;
        /// <summary>Kafel, na którym leży dolny kawałek (zwój) i stoi wiadro.</summary>
        public double dno;
        /// <summary>Id tego, kto ją właśnie skleja.</summary>
        public double? naprawia;
        /// <summary>Gdzie pazur ją przeciął.</summary>
        public double ciecie;
    }

    /// <summary>Gdzie zjedzie wiadro: kolumna liny, strop, z którego się wyłoni, kafel, na którym stanie.</summary>
    public sealed class MiejsceWiadra { public double x, sufit, cel; }

    /// <summary>
    /// WIADRA (Remake v2) — jedyne jedzenie ludu: z góry, szybem, zjeżdża wiadro z porcjami (patrz wiadro.ts).
    /// </summary>
    public static class Wiadro
    {
        static StanWiader stan(Sim sim) => sim.lud.wiadra ??= new StanWiader { lista = new List<WiadroJedzenia>(), nastepne = WIADRO.pierwsze, nr = 0 };

        /// <summary>Stan wiader (etap 4: przecięta lina — sim/lina-wiadra.ts).</summary>
        public static StanWiader stanWiader(Sim sim) => stan(sim);

        /// <summary>Wszystkie wiadra (do rysunku i do karty postaci).</summary>
        public static List<WiadroJedzenia> wiadra(Sim sim) => sim.lud.wiadra?.lista ?? new List<WiadroJedzenia>();

        public static WiadroJedzenia? wiadroId(Sim sim, double? id)
        {
            if (id == null) return null;
            return wiadra(sim).FirstOrDefault(w => w.id == id);
        }

        /// <summary>Ile tików do następnego wiadra.</summary>
        public static double doNastepnego(Sim sim) => Math.Max(0, stan(sim).nastepne - sim.tick);

        /// <summary>Ile jedzenia czeka w wiadrach (porcje).</summary>
        public static double porcjiWWiadrach(Sim sim)
        {
            double n = 0;
            foreach (var w in wiadra(sim)) n += w.faza == "odjezdza" ? 0 : w.porcje;
            return n;
        }

        /// <summary>Wiadra, które stoją na ziemi i mają jedzenie — z nich lud je i robotnicy biorą porcje.</summary>
        public static List<MiejsceJedzenia> zrodlaJedzenia(Sim sim)
        {
            var @out = new List<MiejsceJedzenia>();
            foreach (var wd in wiadra(sim))
            {
                if (!((wd.faza == "stoi" || wd.faza == "rozbite") && wd.porcje > 0)) continue;
                var w0 = wd;
                @out.Add(new MiejsceJedzenia
                {
                    x = w0.x, y = w0.cel, ilosc = w0.porcje, baza = false,
                    wez = n => { var k = Math.Min(n, w0.porcje); w0.porcje -= k; return k; },
                    odloz = n => { w0.porcje += n; },
                });
            }
            // 6.11: kosz przy kracie bramy lochu (od środka) — porcje podane przez pręty
            var b = sim.lud.brama; var br = sim.world.brama;
            if (b != null && (b.kosz ?? 0) > 0 && br.x1 >= br.x0)
            {
                @out.Add(new MiejsceJedzenia
                {
                    x = br.x1 + 1, y = br.y1, ilosc = b.kosz!.Value, baza = false,
                    wez = n => { var k = Math.Min(n, b.kosz ?? 0); b.kosz = (b.kosz ?? 0) - k; return k; },
                    odloz = n => { b.kosz = (b.kosz ?? 0) + n; },
                });
            }
            return @out;
        }

        /// <summary>Ile porcji wiezie wiadro: tyle na głowę, w granicach.</summary>
        static double porcjeNaLud(Sim sim)
        {
            double zywych = 0;
            foreach (var c in sim.creatures) if (!c.dead && rolaPostaci(c) != null) zywych++;
            return Math.Max(WIADRO.porcjiMin, Math.Min(WIADRO.porcjiMax, JS.Round(zywych * WIADRO.porcjiNaGlowe)));
        }

        /// <summary>Alpha: jedyne miejsce, w które zjeżdża wiadro — dno szybu z jedzeniem (null, gdy go zasypano).</summary>
        public static MiejsceWiadra? miejsceWSzybie(Sim sim)
        {
            if (!SWIAT.warstwy.wlaczone) return null;
            var w = sim.world;
            var x = w.szybWiadraX;
            for (var y = World.SURFACE_Y - 1; y <= w.szybWiadraDol; y++) if (!w.passable(x, y)) return null;
            var cel = dnoKolumny(sim, x, w.szybWiadraDol);
            if (!stoi(sim, x, cel)) return null;
            return new MiejsceWiadra { x = x, sufit = World.SURFACE_Y - 1, cel = cel };
        }

        /// <summary>Najniższy pusty kafel kolumny `x` od `y` w dół (tam staje wiadro).</summary>
        static double dnoKolumny(Sim sim, double x, double y)
        {
            var w = sim.world;
            while (y + 1 < w.h && w.passable(x, y + 1)) y++;
            return y;
        }

        /// <summary>Wiadro, które jest teraz w szybie (zapowiedź, zjazd albo stoi na dnie) — najwyżej jedno.</summary>
        static WiadroJedzenia? wiadroWSzybie(Sim sim) => stan(sim).lista.FirstOrDefault(wd => wd.faza != "odjezdza");

        static WiadroJedzenia dodajWiadro(Sim sim, MiejsceWiadra m, double porcje, bool nakarm)
        {
            var st = stan(sim);
            var v = Math.Max(WIADRO.zjazd, (m.cel - m.sufit) / WIADRO.zjazdMaks);
            var wd = new WiadroJedzenia { id = ++st.nr, x = m.x, sufit = m.sufit, cel = m.cel, y = m.sufit - 1, faza = "zapowiedz", od = sim.tick, porcje = porcje, pelne = porcje, v = v, nakarm = nakarm, szyb = true };
            st.lista.Add(wd);
            zapisz(sim, "swiat", $"wiadro #{JS.S(wd.id)}: {JS.S(porcje)} porcji → ({JS.S(m.x)}, {JS.S(m.cel)}){(nakarm ? " — Nakarm" : "")}", m.x, m.cel);
            return wd;
        }

        /// <summary>Z góry dosypują do wiadra, które jest w szybie (pył sypie się ze stropu).</summary>
        static void dosyp(Sim sim, WiadroJedzenia wd, double porcje, double limit)
        {
            wd.porcje = Math.Min(limit, wd.porcje + porcje);
            wd.pelne = Math.Max(wd.pelne, wd.porcje);
            for (var k = 0; k < 5; k++) sim.spark(wd.x + 0.5 + sim.rng.range(-0.6, 0.6), wd.sufit + 0.2, "dust");
            zapisz(sim, "swiat", $"wiadro #{JS.S(wd.id)} w szybie: dosypane z góry ({JS.S(wd.porcje)} porcji)", wd.x, wd.cel);
        }

        /// <summary>Co tik symulacji (sam pilnuje rytmu).</summary>
        public static void tikWiader(Sim sim)
        {
            var st = stan(sim);
            // etap 4: lina przecięta — z góry nic nie zjedzie, póki ktoś jej nie sklei
            if (st.przecieta != null) st.nastepne = Math.Max(st.nastepne, sim.tick + 1);
            if (sim.tick >= st.nastepne)
            {
                st.nastepne = sim.tick + WIADRO.co;
                var m = klanLudu(sim) != null ? miejsceWSzybie(sim) : null;
                var wSzybie = wiadroWSzybie(sim);
                if (m != null && wSzybie != null) dosyp(sim, wSzybie, porcjeNaLud(sim), WIADRO.szybMaks);
                else if (m != null) dodajWiadro(sim, m, porcjeNaLud(sim), false);
            }
            var w = sim.world;
            foreach (var wd in st.lista)
            {
                var t = sim.tick - wd.od;
                if (wd.faza == "zapowiedz")
                {
                    if (t % 12 == 0) sim.spark(wd.x + 0.5, wd.sufit - 0.1, "dust");
                    if (t >= WIADRO.zapowiedz)
                    {
                        wd.faza = "zjezdza"; wd.od = sim.tick; wd.y = wd.sufit - 0.6; st.zjazdT = sim.tick;
                        for (var k = 0; k < 4; k++) sim.spark(wd.x + 0.5, wd.sufit, "dust");
                    }
                }
                else if (wd.faza == "zjezdza")
                {
                    wd.y += wd.v;
                    // podłoga pod celem zniknęła (wykopana) — wiadro zjeżdża niżej, na nowe dno
                    wd.cel = dnoKolumny(sim, wd.x, wd.cel);
                    if (wd.y >= wd.cel)
                    {
                        wd.y = wd.cel; wd.faza = "stoi"; wd.od = sim.tick;
                        sim.spark(wd.x + 0.5, wd.cel + 0.9, "dust");
                    }
                }
                else if (wd.faza == "spada")
                {
                    // etap 4: lina przecięta w czasie jazdy — leci w dół coraz szybciej i roztrzaskuje się na dnie
                    wd.v = Math.Min(WIADRO.ciecie.spadaMaks, wd.v + WIADRO.ciecie.grawitacja);
                    wd.y += wd.v;
                    wd.cel = dnoKolumny(sim, wd.x, Math.Min(wd.cel, Math.Max(wd.sufit, Math.Floor(wd.y))));
                    if (wd.y >= wd.cel)
                    {
                        wd.y = wd.cel; wd.faza = "rozbite"; wd.od = sim.tick;
                        var bylo = wd.porcje;
                        wd.porcje = Math.Floor(wd.porcje * (1 - WIADRO.ciecie.strata));
                        for (var k = 0; k < 10; k++) sim.spark(wd.x + 0.5 + sim.rng.range(-1, 1), wd.cel + 0.8, "dust");
                        sim.gdzie(wd.x, wd.cel).log($"Wiadro roztrzaskało się o dno sali — jedzenie się rozsypało (z {JS.S(bylo)} porcji zostało {JS.S(wd.porcje)}).", "krew", "wiadro-rozbite");
                        zapisz(sim, "swiat", $"wiadro #{JS.S(wd.id)} roztrzaskane: {JS.S(bylo)} → {JS.S(wd.porcje)} porcji", wd.x, wd.cel);
                    }
                }
                else if (wd.faza == "rozbite")
                {
                    // zostaje na dnie, póki ktoś nie sklei liny
                }
                else if (wd.faza == "stoi")
                {
                    // pusty — odjeżdża w górę (etap 4: bez liny nie odjedzie); zasypane miejsce — jedzenie przepada
                    if ((wd.porcje <= 0 && st.przecieta == null) || !w.passable(wd.x, wd.cel)) { wd.faza = "odjezdza"; wd.od = sim.tick; }
                    // ktoś wykopał dziurę pod stojącym wiadrem — zjeżdża na nowe dno
                    else if (w.passable(wd.x, wd.cel + 1)) { wd.faza = "zjezdza"; wd.od = sim.tick; wd.cel = dnoKolumny(sim, wd.x, wd.cel); }
                }
                else
                {
                    wd.y = wd.cel - (wd.cel - wd.sufit + 1.6) * Math.Min(1, t / WIADRO.odjazd);
                }
            }
            st.lista = st.lista.Where(wd => !(wd.faza == "odjezdza" && sim.tick - wd.od >= WIADRO.odjazd)).ToList();
        }

        /// <summary>Zabiera do `n` porcji z wiader (najpierw z najpełniejszych). Zwraca, ile zabrało.</summary>
        public static double zabierzPorcje(Sim sim, double n)
        {
            var zostalo = n;
            var pelne = JS.Sort(wiadra(sim).Where(wd => wd.porcje > 0 && wd.faza != "odjezdza").ToList(), (a, b) => b.porcje - a.porcje);
            foreach (var wd in pelne)
            {
                if (zostalo <= 0) break;
                var k = Math.Min(zostalo, wd.porcje);
                wd.porcje -= k;
                zostalo -= k;
            }
            return n - zostalo;
        }

        /// <summary>Wiadro na start partii albo z karty: od razu, szybem. Zwraca false, gdy szyb zasypano.</summary>
        public static bool wiadroTeraz(Sim sim, double? porcje = null)
        {
            var m = miejsceWSzybie(sim);
            if (m == null || stan(sim).przecieta != null) return false;
            var wSzybie = wiadroWSzybie(sim);
            if (wSzybie != null) { dosyp(sim, wSzybie, porcje ?? porcjeNaLud(sim), double.PositiveInfinity); return true; }
            var wd = dodajWiadro(sim, m, porcje ?? porcjeNaLud(sim), false);
            wd.od = sim.tick - WIADRO.zapowiedz + 30;
            return true;
        }

        /// <summary>Ryt „Nakarm”: dodatkowe jedzenie z góry — tym samym szybem. Zwraca opis odmowy albo null.</summary>
        public static string? wiadroNaZadanie(Sim sim)
        {
            var m = miejsceWSzybie(sim);
            if (m == null) return "Szyb z wiadrem jest zasypany.";
            if (stan(sim).przecieta != null) return "Lina wiadra jest przecięta — najpierw niech ktoś ją sklei.";
            var wSzybie = wiadroWSzybie(sim);
            if (wSzybie != null) { dosyp(sim, wSzybie, WIADRO.nakarmPorcji, double.PositiveInfinity); return null; }
            dodajWiadro(sim, m, WIADRO.nakarmPorcji, true);
            return null;
        }

        /// <summary>Etap 4: lina sklejona — stojące wiadro znów wisi na linie, roztrzaskane znika, resztki zjeżdżają w nowym.</summary>
        public static void poNaprawie(Sim sim)
        {
            var st = stan(sim);
            double resztki = 0;
            foreach (var wd in st.lista) if (wd.faza == "rozbite") resztki += wd.porcje;
            st.lista = st.lista.Where(wd => wd.faza != "rozbite").ToList();
            st.nastepne = sim.tick + WIADRO.co;
            var m = miejsceWSzybie(sim);
            if (m == null) return;
            var wSzybie = wiadroWSzybie(sim);
            if (wSzybie != null) { if (JS.Tak(resztki)) wSzybie.porcje += resztki; return; }
            var nowe = dodajWiadro(sim, m, porcjeNaLud(sim) + resztki, false);
            nowe.od = sim.tick - WIADRO.zapowiedz + 60;
        }

        // ---------------------------------------------------------------- wspinaczka po linie

        /// <summary>Zjeżdżające wiadro, na które skrajnie głodny jeszcze zdąży się wspiąć (najbliższe w linii prostej).</summary>
        public static WiadroJedzenia? wiadroDoWspinaczki(Sim sim, Creature c)
        {
            WiadroJedzenia? best = null; var bd = double.PositiveInfinity;
            foreach (var wd in wiadra(sim))
            {
                if (wd.porcje <= 0 || (wd.faza != "zapowiedz" && wd.faza != "zjezdza")) continue;
                if (wd.cel - Math.Max(wd.y, wd.sufit) < 2.5) continue;           // już prawie na dole — poczeka na nie
                var d = JS.Hypot(wd.x - c.x, wd.cel - c.y);
                if (d < bd) { bd = d; best = wd; }
            }
            return best;
        }

        /// <summary>Ruch na linie: wspina się do wiadra, wsiada, zjeżdża z nim i je. False — lina się skończyła.</summary>
        public static bool krokNaLinie(Sim sim, Creature c)
        {
            var wd = wiadroId(sim, c.naLinie);
            bool zejdz() { c.naLinie = null; c.naWiadrze = null; c.jt = 0; c.droga = null; return false; }
            if (wd == null || wd.faza == "odjezdza") return zejdz();
            var bx = wd.x + 0.5;
            c.vy = 0; c.wspina = sim.tick; c.droga = null;
            if (c.naWiadrze != true)
            {
                // wiadro już stoi — schodzi z liny i je normalnie
                if (wd.faza == "stoi") return zejdz();
                if (Math.Abs(c.x - bx) > 0.02) c.x += JS.Sign(bx - c.x) * Math.Min(Math.Abs(bx - c.x), 0.06);
                // pod wiadrem: jego dno to wd.y + 1 — wsiada, gdy rękami sięga dna
                var dno = Math.Max(wd.y, wd.sufit - 0.6) + 1;
                if (c.y > dno + 0.8)
                {
                    c.y = Math.Max(dno + 0.8, c.y - WIADRO.wspinaczka);
                    c.face = JS.Tak(c.id % 2) ? 1 : -1;
                    c.zamiar = "umiera z głodu — wspina się po linie do zjeżdżającego wiadra";
                    c.zamiarDo = sim.tick + 120;
                    return true;
                }
                if (wd.faza == "zapowiedz") return true;   // wiadro jeszcze w skale — wisi pod stropem i czeka
                c.naWiadrze = true;
                sim.stat.wspinaczek++;
                sim.efekt(bx, wd.y, "mysl", "jedzenie!");
            }
            // w wiadrze: jedzie z nim w dół i je
            c.x = bx + (JS.Tak(c.id % 2) ? 0.12 : -0.12);
            c.y = wd.y - 0.45;
            c.zamiar = "siedzi w zjeżdżającym wiadrze i je";
            c.zamiarDo = sim.tick + 120;
            if ((sim.tick + c.id) % WIADRO.jedzenieCo == 0 && wd.porcje > 0 && c.hunger > 0.12)
            {
                wd.porcje--; sim.meals++;
                c.hunger = Math.Max(0, c.hunger - LUD.posilek);
                c.hp = Math.Min(maxHp(sim, c), c.hp + STWORZENIA.kesLeczy);
                sim.spark(c.x, c.y - 0.4, "spore");
            }
            if (wd.faza == "stoi")
            {
                // wiadro stanęło — wysiada obok
                c.naLinie = null; c.naWiadrze = null;
                c.y = wd.cel + 0.2; c.x = bx + (JS.Tak(c.id % 2) ? 0.7 : -0.7);
                if (!sim.world.passable(Math.Floor(c.x), wd.cel)) c.x = bx;
                c.jt = 0;
                return false;
            }
            return true;
        }
    }
}
