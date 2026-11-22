// Port: krag-3-beta/src/sim/krag.ts (gałąź claude/youthful-wozniak-dqa6s9) — KRĄG TRZECI: mechaniki kręgu żarłoków
// (obżarstwo, ulewa, okup dla Cerbera, Cerber krążący po powierzchni). Nastawy: Nastawy/Krag.cs (KRAG),
// rysunek: Trzewia.Gra (krąg). Stan: sim.lud.krag.
//
// C#: krąg jest TRYBEM obok Alphy 1 (decyzja użytkownika 16.11), a nie osobną kompilacją jak w TS. Tryb przełącza
// Krag.Ustaw(true/false): nastawy różniące się od Alphy (nazwa bossa, nazwy ruchów walki, kamera nad tarasem…)
// nakłada się z KragNadpisy, a powrót do Alphy przywraca zapamiętane wartości. Kod symulacji pyta o tryb przez
// Krag.Wlaczony — w Alphie 1 każda zmiana kręgu jest wyłączona i symulacja liczy się bit w bit jak dotąd.
using System;
using System.Collections.Generic;
using Trzewia.Js;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyKrag;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Stan kręgu (sim.lud.krag) — StanKregu w TS.</summary>
    public sealed class StanKregu
    {
        /// <summary>Ulewa: od kiedy do kiedy trwa bieżąca (albo ostatnia) i kiedy następna.</summary>
        public double ulewaOd, ulewaDo, nastepna;
        /// <summary>Okup dla Cerbera: kiedy ostatni, kto rzucił i skąd (rysunek: lot jedzenia do paszczy).</summary>
        public double okupT, okupX, okupY, okupKto;
        /// <summary>Ile razy ktoś padł w błoto z przejedzenia, ile okupów.</summary>
        public double upadkow, okupow;
        /// <summary>Ostatnie wiadro, przy którym sprawdzono Cerbera (żeby podjadał raz na dostawę), ile razy podjadł.</summary>
        public double? wiadroSpr, podjadl;
        /// <summary>
        /// (ZmianyKregu) Kafle drogi wiernych zasypane przez Cerbera — gdy nie ma już grabarzy, gruz osypuje się sam
        /// (ZmianyKregu.tik).
        /// </summary>
        public List<double>? zasypane;
    }

    /// <summary>Cerber na powierzchni kręgu (CerberNaKregu w TS).</summary>
    public sealed class CerberNaKregu
    {
        public double x, y, zwrot;
        /// <summary>0…1 — idzie (1) albo stoi i szarpie (0); szarpie: postęp 0…1 od początku postoju.</summary>
        public double idzie, szarpie;
        /// <summary>Czy jest na powierzchni (po rozbiciu pieczęci zszedł za potępionymi w trzewia).</summary>
        public bool jest;
        /// <summary>Numer postoju i sposób zabijania przy nim.</summary>
        public double k, wariant;
    }

    /// <summary>Ofiara Cerbera przy postoju `k`: gdzie leżała, kiedy zginęła, do kiedy leżą szczątki (ZabicieCerbera).</summary>
    public sealed class ZabicieCerbera { public double k, x, zwrot, od, zabite, @do, wariant; }

    public static class Krag
    {
        // ───────────────────────────── tryb ─────────────────────────────

        /// <summary>Czy gra jest w trybie Kręgu Trzeciego (inaczej — Alpha 1).</summary>
        public static bool Wlaczony { get; private set; }

        /// <summary>Tekst według trybu: Alpha 1 albo krąg.</summary>
        public static string T(string alfa, string krag) => Wlaczony ? krag : alfa;

        /// <summary>Nastawy Alphy sprzed włączenia kręgu (pliki z różnicami) — wracają przy wyłączeniu.</summary>
        static Dictionary<string, string>? alfa;

        /// <summary>
        /// Włącza albo wyłącza tryb kręgu: nastawy różne od Alphy (KragNadpisy — różnice policzone z modułów TS obu
        /// wersji), nazwy ludu w rasach. Wołać przed `new Sim` (świat i nazwy klanów biorą się z nastaw i ras).
        /// </summary>
        public static void Ustaw(bool krag)
        {
            if (krag == Wlaczony) return;
            if (krag)
            {
                alfa = new Dictionary<string, string>();
                foreach (var kv in KragNadpisy.Pliki)
                {
                    var typ = KragNadpisy.Typ(kv.Key);
                    if (typ == null) continue;
                    alfa[kv.Key] = NastawyJson.Wypisz(typ);
                    NastawyJson.Wczytaj(typ, kv.Value, kv.Key + " (krąg)");
                }
            }
            else if (alfa != null)
            {
                foreach (var kv in alfa)
                {
                    var typ = KragNadpisy.Typ(kv.Key);
                    if (typ != null) NastawyJson.Wczytaj(typ, kv.Value, kv.Key + " (Alpha 1)");
                }
                alfa = null;
            }
            Wlaczony = krag;
            Races.nazwyKregu(krag);
            Boss.odswiezBossow();
        }

        // ───────────────────────────── mechaniki kręgu ─────────────────────────────

        public static StanKregu stanKregu(Sim sim)
        {
            if (sim.lud.krag == null)
                sim.lud.krag = new StanKregu
                {
                    ulewaOd = -1e9, ulewaDo = -1e9, nastepna = sim.tick + KRAG.deszcz.pierwsza,
                    okupT = -1e9, okupX = 0, okupY = 0, okupKto = -1, upadkow = 0, okupow = 0,
                };
            return sim.lud.krag;
        }

        /// <summary>Czy teraz leje (i jak mocno: 0…1, z łagodnym wejściem i wyjściem).</summary>
        public static double ulewa(Sim sim)
        {
            var k = sim.lud.krag;
            if (k == null || sim.tick < k.ulewaOd || sim.tick > k.ulewaDo) return 0;
            double a = (sim.tick - k.ulewaOd) / 600, b = (k.ulewaDo - sim.tick) / 600;
            return Math.Max(0, Math.Min(1, Math.Min(a, b)));
        }

        /// <summary>Mnożnik do Lud.mnoznik: ulewa (głód, szybkość) i obżarstwo (szybkość, kucie, siła).</summary>
        public static double mnoznikKregu(Sim sim, Creature c, string co)
        {
            double v = 1;
            var u = ulewa(sim);
            if (u > 0)
            {
                if (co == "glod") v *= 1 + (KRAG.deszcz.glod - 1) * u;
                if (co == "szybkosc") v *= 1 - (1 - KRAG.deszcz.szybkosc) * u;
            }
            var o = Math.Min(1, c.obzarstwo ?? 0);
            if (o > 0)
            {
                var O = KRAG.obzarstwo;
                if (co == "szybkosc") v *= 1 - O.spowalnia * o;
                else if (co == "kopanie") v *= 1 - O.kopanie * o;
                else if (co == "sila") v *= 1 - O.sila * o;
            }
            return v;
        }

        /// <summary>Jedzenia w bród — żarłocy jedzą ponad głód.</summary>
        public static bool obfitosc(Sim sim) => Wiadro.porcjiWWiadrach(sim) > KRAG.obzarstwo.obfitoscOd;

        /// <summary>
        /// Posiłek z wiadra (Stworzenia: doZapas): żarłok najadł się — gdy jedzenia w bród, sięga po więcej (`wez(1)`
        /// zabiera porcję). Każda porcja ponad głód to obżarstwo.
        /// </summary>
        public static void zarloczy(Sim sim, Creature c, double glodPrzed, Func<double, double> wez)
        {
            var O = KRAG.obzarstwo;
            if (glodPrzed < O.najedzonyPonizej) c.obzarstwo = (c.obzarstwo ?? 0) + O.zaSytaPorcje;
            if (!obfitosc(sim)) return;
            double zjadl = 0;
            for (double n = 0; n < O.nadmiar && wez(1) > 0; n++) { zjadl++; sim.meals++; }
            if (zjadl == 0) return;
            c.obzarstwo = (c.obzarstwo ?? 0) + O.zaPorcje * zjadl;
            c.hunger = 0;
            if ((c.obzarstwo ?? 0) > 0.5 && (sim.tick + c.id) % 3 == 0) sim.efekt(c.x, c.y - 1, "mysl", "jeszcze… jeszcze jedną…");
        }

        /// <summary>Krok kręgu — raz na tik, z Sim.step.</summary>
        public static void tikKregu(Sim sim)
        {
            var k = stanKregu(sim);
            ZmianyKregu.tik(sim, k);
            cerberPodjada(sim, k);
            // ulewa
            if (sim.tick >= k.nastepna)
            {
                k.ulewaOd = sim.tick; k.ulewaDo = sim.tick + KRAG.deszcz.trwa;
                k.nastepna = k.ulewaDo + KRAG.deszcz.co + Math.Floor((sim.rng.next() - 0.5) * 2 * KRAG.deszcz.rozrzut);
                sim.log("Nad kręgiem pęka niebo: wieczny deszcz, zimny i ciężki, z gradem i brudnym śniegiem. Ziemia cuchnie, błoto chwyta za nogi.", "otchlan");
            }
            if (sim.tick == k.ulewaDo) sim.log("Ulewa słabnie. Błoto zostaje.", "swiat");

            // obżarstwo: trawienie i upadek w błoto (co 30 tików)
            if (sim.tick % 30 == 0)
            {
                var O = KRAG.obzarstwo;
                foreach (var c in sim.creatures)
                {
                    if (c.dead || c.race != Race.GOBLIN || !(c.obzarstwo is double ob) || ob == 0 || double.IsNaN(ob)) continue;
                    c.obzarstwo = Math.Max(0, ob - O.spadek * 30);
                    if (c.obzarstwo >= O.padaOd && !(c.wBlocieDo is double wb && wb != 0 && sim.tick < wb))
                    {
                        c.wBlocieDo = sim.tick + O.lezy;
                        c.ogluszonyDo = Math.Max(c.ogluszonyDo ?? 0, c.wBlocieDo.Value);
                        c.obzarstwo = O.poUpadku;
                        k.upadkow++;
                        sim.efekt(c.x, c.y - 1, "mysl", "pada twarzą w błoto — przejedzony");
                        sim.gdzie(c.x, c.y).log($"{nazwaRoli(c)} obżarł się i padł twarzą w błoto, jak wszyscy żarłocy tego kręgu.", "otchlan", "blotoUpadek",
                            n => $"Żarłocy padają w błoto z przejedzenia ({JS.S(n)}).");
                    }
                }
            }

            // okup dla Cerbera
            Creature? boss = null;
            if (sim.lud.pomnik?.faza == "walka")
                foreach (var c in sim.creatures) if (!c.dead && c.boss != null) { boss = c; break; }
            // (Krąg, ZmianyKregu — decyzja użytkownika 22.11: karmienia Cerbera w walce nie ma wcale)
            if (boss != null && !GlowyCerbera.Aktywne && sim.tick - k.okupT >= KRAG.okup.co)
            {
                // rzuca ten, kto niesie jedzenie (kurierzy noszą je do krypty), a gdy nikt nie niesie — porcje z wiadra
                Creature? kto = null; double best = double.PositiveInfinity;
                var wiadro = Wiadro.porcjiWWiadrach(sim) >= KRAG.okup.porcji;
                foreach (var c in sim.creatures)
                {
                    if (c.dead || c.race != Race.GOBLIN || (c.ogluszonyDo ?? 0) > sim.tick) continue;
                    var d = JS.Hypot(c.x - boss.x, c.y - boss.y);
                    if (d > KRAG.okup.zasieg) continue;
                    var ocena = d - (c.carry > 0 ? 100 : 0);
                    if ((c.carry > 0 || wiadro) && ocena < best) { best = ocena; kto = c; }
                }
                double rzucil = 0;
                if (kto != null)
                {
                    if (kto.carry > 0) { rzucil = Math.Min(kto.carry, KRAG.okup.porcji); kto.carry -= rzucil; }
                    else rzucil = Wiadro.zabierzPorcje(sim, KRAG.okup.porcji);
                }
                if (kto != null && rzucil > 0)
                {
                    k.okupT = sim.tick; k.okupX = kto.x; k.okupY = kto.y - 1; k.okupKto = kto.id; k.okupow++;
                    boss.ogluszonyAtakDo = Math.Max(boss.ogluszonyAtakDo ?? 0, sim.tick + KRAG.okup.zre);
                    kto.face = boss.x > kto.x ? 1 : -1;
                    sim.efekt(kto.x, kto.y - 1.2, "mysl", "garść jedzenia w paszczę!");
                    sim.gdzie(boss.x, boss.y).log("Jak Wergiliusz: garść jedzenia w trzy paszcze. Cerber żre i na chwilę zapomina o gryzieniu.", "swiat", "okup",
                        n => $"Okup dla Cerbera — garść jedzenia w paszcze ({JS.S(n)}).");
                }
            }
        }

        /// <summary>Cerber żre okup (do rysunku): 1 → 0 przez KRAG.okup.zre tików od okupu.</summary>
        public static double cerberZre(Sim sim, Creature c)
        {
            var k = sim.lud.krag;
            if (k == null) return 0;
            var t = sim.tick - k.okupT;
            return t >= 0 && t < KRAG.okup.zre ? 1 - t / KRAG.okup.zre : 0;
        }

        static string nazwaRoli(Creature c)
        {
            var r = Lud.rolaPostaci(c);
            return r == "robotnik" ? "Grabarz" : r == "rycerz" ? "Rycerz" : "Mnich";
        }

        // ───────────────────────────── Cerber na powierzchni kręgu ─────────────────────────────

        /// <summary>Odcinek obchodu Cerbera (tiki): idzie do celu przez `CH` części odcinka, potem szarpie potępionego.</summary>
        const double ODC = 760, CH = 0.42;
        /// <summary>Szczątki po ofierze leżą tyle tików, potem cień żarłoka znów leży w błocie.</summary>
        public const double SZCZATKI_TIKOW = 9000;
        /// <summary>Sposoby zabijania: 0 szarpie i ciska, 1 rozrywa na pół, 2 połyka, 3 miażdży łapą i żre, 4 podrzuca i chwyta.</summary>
        public const double SPOSOBOW_ZABIJANIA = 5;

        /// <summary>hasz z TS (Math.imul i przesunięcia bez znaku, jak w JS).</summary>
        static double hasz(double n)
        {
            int h = JS.Imul(JS.ToInt32(n) ^ unchecked((int)0x9e3779b9), unchecked((int)0x85ebca6b));
            h = JS.Imul(h ^ (int)((uint)h >> 13), unchecked((int)0xc2b2ae35));
            return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
        }

        public static double wariantZabicia(Sim sim, double k) => Math.Floor(hasz(k * 131 + 7 + JS.ToInt32(sim.seed)) * SPOSOBOW_ZABIJANIA);

        /// <summary>Ostatnie zabójstwa (do `ile` postojów wstecz), których szczątki jeszcze leżą — rysunek tłumu i szczątków.</summary>
        public static List<ZabicieCerbera> zabiciaCerbera(Sim sim, double? tik = null, double ile = 14)
        {
            var t = tik ?? sim.tick;
            var wynik = new List<ZabicieCerbera>();
            var faza = sim.lud.pomnik?.faza;
            if (faza != null && faza != "stoi" && faza != "rozpada") return wynik;
            var k0 = Math.Floor(t / ODC);
            for (var k = k0; k > k0 - ile && k >= 1; k--)
            {
                double x0 = celCerbera(sim, k - 1), x1 = celCerbera(sim, k);
                double zwrot = x1 >= x0 ? 1 : -1;
                var od = k * ODC + CH * ODC;
                if (od > t) continue;
                wynik.Add(new ZabicieCerbera { k = k, x = x1 + zwrot * 4, zwrot = zwrot, od = od, zabite = od + (1 - CH) * ODC * 0.45, @do = od + SZCZATKI_TIKOW, wariant = wariantZabicia(sim, k) });
            }
            return wynik;
        }

        /// <summary>Cel odcinka `k` obchodu (kafel x na tarasie).</summary>
        static double celCerbera(Sim sim, double k)
        {
            double xa = 22, xb = sim.world.w - 26;
            return xa + (xb - xa) * hasz(k * 7919 + JS.ToInt32(sim.seed));
        }

        /// <summary>
        /// Cerber krąży po powierzchni kręgu nad trzewiami (Piekło, pieśń VI). Pozycja wynika z samego tiku — obchód od celu
        /// do celu, przy każdym postój nad kimś w błocie.
        /// </summary>
        public static CerberNaKregu cerberNaPowierzchni(Sim sim, double? tik = null)
        {
            var t = tik ?? sim.tick;
            double k = Math.Floor(t / ODC), u = (t % ODC) / ODC;
            double x0 = celCerbera(sim, k - 1), x1 = celCerbera(sim, k);
            var f = Math.Min(1, u / CH);
            var e = f * f * (3 - 2 * f);
            var faza = sim.lud.pomnik?.faza;
            return new CerberNaKregu
            {
                x = x0 + (x1 - x0) * e, y = World.SURFACE_Y - 1,
                zwrot = x1 >= x0 ? 1 : -1,
                idzie = u < CH ? 1 : 0, szarpie = u < CH ? 0 : (u - CH) / (1 - CH),
                jest = faza == null || faza == "stoi" || faza == "rozpada",
                k = k, wariant = wariantZabicia(sim, k),
            };
        }

        /// <summary>Cerber nad szybem wiadra podjada dostawę, zanim zjedzie (raz na wiadro).</summary>
        static void cerberPodjada(Sim sim, StanKregu k)
        {
            WiadroJedzenia? wd = null;
            foreach (var q in Wiadro.wiadra(sim)) if (q.faza == "zapowiedz" && q.szyb == true) { wd = q; break; }
            if (wd == null || wd.id == k.wiadroSpr) return;
            k.wiadroSpr = wd.id;
            var c = cerberNaPowierzchni(sim);
            if (!c.jest || Math.Abs(c.x - wd.x) > KRAG.cerber.podjadaOd || wd.porcje < 2) return;
            var ile = Math.Max(1, Math.Floor(wd.porcje * KRAG.cerber.podjada));
            wd.porcje -= ile;
            k.podjadl = (k.podjadl ?? 0) + 1;
            sim.gdzie(wd.x, World.SURFACE_Y).log($"Cerber dopadł kosza nad szybem i pożarł {JS.S(ile)} porcji, zanim kosz zjechał w trzewia.", "otchlan", "cerber-kosz");
        }
    }
}
