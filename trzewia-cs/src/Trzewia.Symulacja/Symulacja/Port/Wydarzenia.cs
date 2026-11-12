// Port: alpha-1/src/sim/wydarzenia.ts
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyWydarzenia;
using static Trzewia.Nastawy.NastawyGora;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.CechyNacji;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.KartyLudu;
using static Trzewia.Symulacja.Zabytki;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class Wybor
    {
        public string id = "";
        /// <summary>Co robisz — krótko, na przycisk.</summary>
        public string tekst = "";
        /// <summary>Co z tego wyniknie — jedno zdanie pod przyciskiem.</summary>
        public string skutek = "";
        public double krew;
        public double wiara;
    }

    public sealed class CelKarty { public double x, y; public string tekst = ""; }

    public sealed class Wydarzenie
    {
        public string rodzaj = "";
        public string tytul = "";
        public string tekst = "";
        public List<Wybor> wybory = new List<Wybor>();
        /// <summary>Wybór, gdy nikt nie wybierze (świat bez gracza).</summary>
        public double domyslny;
        /// <summary>Co wybrałby rozsądny gracz — dla automatu testowego.</summary>
        public double rozsadny;
        /// <summary>Gdzie to się dzieje — kamera jedzie tam przy pokazaniu karty.</summary>
        public CelKarty? cel;
        public double od;
        /// <summary>Dane skutku: nacje, miejsce.</summary>
        public double? klan, klan2, x, rasa;
        /// <summary>v4.1 beta: karta z łańcucha — skutek wcześniejszego wyboru.</summary>
        public bool? lancuch;
    }

    public sealed class WojnaKarty { public double a, b, x, y; }

    /// <summary>Skutek, który spełni się w tiku `tick` ('dlug' | 'przysiega' | 'krzywoprzysiestwo' | 'karta').</summary>
    public sealed class Odroczony
    {
        public double tick;
        public string rodzaj = "";
        public double? klan, klan2;
        /// <summary>Przy rodzaju 'karta': która karta wraca.</summary>
        public string? karta;
    }

    public sealed class CzekajacaKarta { public string karta = ""; public double? klan, klan2; }

    /// <summary>Stan wydarzeń w symulacji (nie trafia do zapisu — po wczytaniu karty liczą się od nowa).</summary>
    public sealed class StanWydarzen
    {
        public Wydarzenie? biezace;
        public double nastepne;
        public string ostatnie = "";
        /// <summary>Czy gra ma gracza — wtedy karta czeka na wybór, a nie rozstrzyga się sama.</summary>
        public bool gracz;
        /// <summary>Najwyższa liczebność każdej rasy (do karty „wymierają”).</summary>
        public List<double> szczyt = new List<double>();
        /// <summary>Ile kart już było — pierwsze są łagodniejsze.</summary>
        public double ile;
        /// <summary>Tik, w którym rozstrzygnięto ostatnią kartę.</summary>
        public double koniec;
        /// <summary>Pierwsza krew między dwiema nacjami — czeka na swoją kartę.</summary>
        public WojnaKarty? wojna;
        public double ostatniaWojna;
        /// <summary>Para nacji → do którego tiku nie pytać o nią znowu.</summary>
        public JsMap<double, double> ciszaWojen = new JsMap<double, double>();
        /// <summary>Para nacji → do którego tiku trwa rozejm („rozdziel ich”).</summary>
        public JsMap<double, double> pokoj = new JsMap<double, double>();
        public List<Odroczony> odroczone = new List<Odroczony>();
        public List<CzekajacaKarta> czekajace = new List<CzekajacaKarta>();
        /// <summary>v4.2 beta: ile razy w tej partii kupiono dany wybór („rodzaj:id”).</summary>
        public Dictionary<string, double> kupione = new Dictionary<string, double>();
    }

    public sealed class KandydatKarty { public double waga; public Func<Wydarzenie?> zbuduj = () => null; public string rodzaj = ""; }

    /// <summary>
    /// Karty wydarzeń (wersja na telefon i Remake) — główny sposób wpływania na świat poza rozkazami (patrz wydarzenia.ts).
    /// </summary>
    public static class Wydarzenia
    {
        static Typ_WYDARZENIA W => WYDARZENIA;

        public static StanWydarzen nowyStanWydarzen() => new StanWydarzen
        {
            biezace = null, nastepne = WYDARZENIA.pierwsze, ostatnie = "", gracz = false, szczyt = new List<double> { 0, 0, 0, 0, 0, 0 }, ile = 0, koniec = -1e9,
            wojna = null, ostatniaWojna = -1e9,
        };

        /// <summary>Klucz pary nacji (bez kolejności).</summary>
        public static double paraNacji(double a, double b) => a < b ? a * 65536 + b : b * 65536 + a;

        // ---------------------------------------------------------------- pomocnicze

        /// <summary>Nazwa nacji z jej krwią i cechą — „Mrokowie (Ślepy Lud, pobożni)”.</summary>
        public static string nazwaNacji(Clan k)
        {
            var cecha = cechaNacji(k).nazwa;
            return $"{k.name} ({RACES[k.race].name}{(!string.IsNullOrEmpty(cecha) ? $", {cecha}" : "")})";
        }

        static List<Clan> zywe(Sim sim) => sim.clans.Where(k => !k.dead && k.pop > 0 && k.race != Race.HUMAN).ToList();
        static Clan? najwieksza(Sim sim, double? rasa = null) =>
            JS.Sort(zywe(sim).Where(k => rasa == null || k.race == rasa).ToList(), (a, b) => b.pop - a.pop).FirstOrDefault();
        static CelKarty gniazdo(Clan k) => new CelKarty { x = k.hx + 0.5, y = k.hy + 0.5, tekst = k.name };
        static Wybor wybor(string id, string tekst, string skutek, double krew = 0, double wiara = 0) => new Wybor { id = id, tekst = tekst, skutek = skutek, krew = krew, wiara = wiara };

        static bool stac(Sim sim, Wybor w) => sim.krew - sim.rezerwa.krew >= w.krew && sim.wiara - sim.rezerwa.wiara >= w.wiara;

        /// <summary>Nacja, która bierze górę (najliczniejsza z dominującej krwi), gdy dominacja jest wyraźna.</summary>
        static Clan? dominujaca(Sim sim, double prog = 0.5)
        {
            if (sim.dominance < prog || sim.domRace < 0) return null;
            return najwieksza(sim, sim.domRace);
        }

        static double ilePielgrzymow(Sim sim, double klan)
        {
            double n = 0;
            foreach (var c in sim.creatures) if (!c.dead && c.clan == klan && c.job == Job.PIELGRZYM) n++;
            return n;
        }

        static double ileOltarzy(Sim sim)
        {
            double n = 0;
            var t = sim.world.tile.d;
            for (var i = 0; i < t.Length; i++) if (t[i] == T.SHRINE) n++;
            return n;
        }

        static string proc(double v) => $"{JS.S(JS.Round(v * 100))}%";

        // ---------------------------------------------------------------- karty

        static List<KandydatKarty> kandydaci(Sim sim, StanWydarzen st)
        {
            var w = sim.world;
            var @out = new List<KandydatKarty>();
            var dom = dominujaca(sim);
            var wiodaca = najwierniejsza(sim);
            var naDom = dom != null && sim.dominance > 0.6 && (wiodaca == null || wiodaca.race != dom.race);
            var surowe = st.ile >= 2;                     // dwie pierwsze karty bez klęsk żywiołowych

            // --- powódź
            if (surowe) @out.Add(new KandydatKarty { rodzaj = "powodz", waga = 2.5, zbuduj = () =>
            {
                double x = 6 + sim.rng.@int(w.w - 12);
                var wybory = new List<Wybor>
                {
                    wybor("zatkaj", "Zatkaj szczelinę", "Woda zostanie w skale.", W.powodzZatkaj),
                    wybor("plyn", "Niech płynie", "Zaleje górne korytarze. Kto nie pływa, może utonąć."),
                };
                if (dom != null) wybory.Add(wybor("kieruj", $"Skieruj ją na {dom.name}", $"Zaleje najliczniejszych — {RACES[dom.race].name}.", 0, W.powodzKieruj));
                double rozsadny = naDom && dom != null ? 2 : sim.krew >= 45 ? 0 : 1;
                return new Wydarzenie { rodzaj = "powodz", tytul = "Woda znalazła szczelinę", tekst = "Nad górnymi korytarzami pęka żyła wodna.", wybory = wybory, domyslny = 1, rozsadny = rozsadny, cel = new CelKarty { x = x + 0.5, y = 8, tekst = "szczelina" }, od = sim.tick, x = x };
            } });

            // --- zaraza
            if (surowe) @out.Add(new KandydatKarty { rodzaj = "zaraza", waga = 3, zbuduj = () =>
            {
                var cel = dom ?? najwieksza(sim);
                var wybory = new List<Wybor>
                {
                    wybor("uzdrow", "Uzdrów ich", $"Nikt nie zachoruje, a każda nacja uwierzy mocniej (+{JS.S(JS.Round(W.zarazaUzdrowOddanie * 100))}% oddania).", 0, W.zarazaUzdrow),
                    wybor("niech", "Niech przejdzie", $"Zachorują najciężej najliczniejsi{(cel != null ? $" — {RACES[cel.race].name}" : "")}. Część umrze."),
                };
                var ciasno = sim.domRace >= 0 && sim.crowding[(int)sim.domRace] > 0.9;
                double rozsadny = naDom || ciasno || sim.dominance > 0.6 ? 1 : sim.wiara >= 30 ? 0 : 1;
                return new Wydarzenie { rodzaj = "zaraza", tytul = "Nadchodzi zaraza", tekst = "Coś gnije w powietrzu twoich korytarzy.", wybory = wybory, domyslny = 1, rozsadny = rozsadny, cel = cel != null ? gniazdo(cel) : null, od = sim.tick };
            } });

            // --- żyła szaleństwa
            if (surowe) @out.Add(new KandydatKarty { rodzaj = "zyla", waga = 1.5, zbuduj = () =>
            {
                var wybory = new List<Wybor>
                {
                    wybor("zasklep", "Zasklep ją", "Głębia zostanie spokojna.", W.zylaZasklep),
                    wybor("zostaw", "Zostaw", "Kto będzie tam kopał, oszaleje — i może wrócić jako trol."),
                };
                return new Wydarzenie { rodzaj = "zyla", tytul = "Żyła szaleństwa w głębi", tekst = "Głęboko w skale otwiera się coś, od czego pęka głowa.", wybory = wybory, domyslny = 1, rozsadny = sim.krew >= 45 ? 0 : 1, od = sim.tick };
            } });

            // --- obcy lud (gdy jedna krew zjada resztę)
            if (sim.tick > W.obcyPo && sim.dominance > W.obcyOdDominacji && sim.przybyszow < PRZYPLYWY.maxPrzybyszow) @out.Add(new KandydatKarty { rodzaj = "obcy", waga = 3, zbuduj = () => new Wydarzenie
            {
                rodzaj = "obcy", tytul = "Ktoś puka od spodu", tekst = $"{(sim.domRace >= 0 && sim.domRace < RACES.Length ? RACES[(int)sim.domRace].name : "Jedna krew")} zajmuje prawie całą górę. W głębi czeka garstka innych.",
                wybory = new List<Wybor>
                {
                    wybor("wypusc", "Wypuść ich", "Nowa krew stanie przeciw najliczniejszym — sen się oddali."),
                    wybor("zamknij", "Zamknij szczeliny", "Góra zostanie taka, jaka jest."),
                }, domyslny = 0, rozsadny = 0, od = sim.tick,
            } });

            // --- głód
            var glodna = najglodniejsza(sim);
            if (glodna != null) @out.Add(new KandydatKarty { rodzaj = "glod", waga = 1 + glodna.Value.udzial * 3, zbuduj = () =>
            {
                var (gk, udzial) = glodna.Value;
                var wybory = new List<Wybor>
                {
                    wybor("karm", "Wyhoduj im jedzenie", "Przy gnieździe wyrośnie jedzenie dla wszystkich. Najedzą się.", W.glodGrzyb),
                    wybor("zmarli", "Niech zjedzą najsłabszych", $"{JS.S(W.glodZmarlych)} najsłabszych zginie, reszta się naje. Śmierć to twoja krew."),
                    wybor("nic", "Nic nie rób", "Część umrze z głodu."),
                };
                var zaDuzo = gk.race == sim.domRace && sim.dominance > 0.65;
                return new Wydarzenie { rodzaj = "glod", tytul = $"{gk.name} głodują", tekst = $"{nazwaNacji(gk)}: {JS.S(JS.Round(udzial * 100))}% nie ma co jeść. Jeśli nic się nie zmieni, zaczną umierać — wszyscy naraz.", wybory = wybory, domyslny = 2, rozsadny = zaDuzo ? 2 : stac(sim, wybory[0]) ? 0 : 1, cel = gniazdo(gk), od = sim.tick, klan = gk.id };
            } });

            // --- prorok
            var duza = (dom != null && dom.pop >= W.prorokMinNacja ? dom : null) ?? JS.Sort(zywe(sim).Where(k => k.pop >= W.prorokMinNacja && RACES[k.race].faithGain > 0).ToList(), (a, b) => b.pop - a.pop).FirstOrDefault();
            if (duza != null) @out.Add(new KandydatKarty { rodzaj = "prorok", waga = naDom ? 5 : 2, zbuduj = () =>
            {
                var wybory = new List<Wybor>
                {
                    wybor("wysluchaj", "Wysłuchaj go", "Odejdzie z częścią wiernych i założy nową nację. Będzie wojna — a sen się cofnie.", 0, W.prorokWysluchaj),
                    wybor("ucisz", "Ucisz go", $"Nacja zostanie w całości i uwierzy mocniej (+{JS.S(JS.Round(W.prorokUciszOddanie * 100))}%)."),
                };
                double rozsadny = duza.race == sim.domRace && sim.dominance > 0.6 ? 0 : 1;
                return new Wydarzenie { rodzaj = "prorok", tytul = $"{duza.name}: wstaje prorok", tekst = $"{nazwaNacji(duza)} jest ich już {JS.S(duza.pop)}. Jeden z nich słyszy cię wyraźniej niż inni.", wybory = wybory, domyslny = 1, rozsadny = rozsadny, cel = gniazdo(duza), od = sim.tick, klan = duza.id };
            } });

            // --- ruda
            var gob = najwieksza(sim, Race.GOBLIN); var zuz = najwieksza(sim, Race.DWARF);
            if (gob != null || zuz != null) @out.Add(new KandydatKarty { rodzaj = "ruda", waga = 1.5, zbuduj = () =>
            {
                var wybory = new List<Wybor>();
                if (gob != null) wybory.Add(wybor("oltarz", $"Daj ją: {gob.name}", "Postawią z niej ołtarz i zaczną się przy nim modlić — przybędzie ci wiary."));
                if (zuz != null) wybory.Add(wybor("kuznia", $"Daj ją: {zuz.name}", "Żużlowcy wykują z niej nowych kowali."));
                wybory.Add(wybor("zostaw", "Zostaw w skale", "Nic się nie zmieni."));
                double rozsadny = gob != null && ileOltarzy(sim) < 2 ? 0 : zuz != null && zuz.pop < 6 ? wybory.FindIndex(x => x.id == "kuznia") : 0;
                var k = gob ?? zuz!;
                return new Wydarzenie { rodzaj = "ruda", tytul = "Odsłoniła się żyła rudy", tekst = "Obsunęła się ściana, a pod nią błyszczy ruda. Komu ją dasz?", wybory = wybory, domyslny = wybory.Count - 1, rozsadny = rozsadny, cel = gniazdo(k), od = sim.tick, klan = gob?.id, klan2 = zuz?.id };
            } });

            // --- prośba o znak
            var wierna = najwierniejsza(sim);
            if (wierna != null && wierna.devotion >= W.znakOd && wierna.devotion < W.znakDo && ilePielgrzymow(sim, wierna.id) == 0) @out.Add(new KandydatKarty { rodzaj = "znak", waga = 2, zbuduj = () =>
            {
                var wybory = new List<Wybor>
                {
                    wybor("objaw", "Objaw się", $"Oddanie nacji wzrośnie o {JS.S(JS.Round(W.znakOddanie * 100))}% — bliżej zejścia pod twój rdzeń.", 0, W.znakObjaw),
                    wybor("milcz", "Milcz", $"Zwątpią (−{JS.S(JS.Round(W.znakMilczenie * 100))}% oddania)."),
                };
                return new Wydarzenie { rodzaj = "znak", tytul = $"{wierna.name} proszą o znak", tekst = $"{nazwaNacji(wierna)} wierzą w ciebie na {JS.S(JS.Round(wierna.devotion * 100))}%. Chcą zobaczyć, że jesteś.", wybory = wybory, domyslny = 1, rozsadny = stac(sim, wybory[0]) ? 0 : 1, cel = gniazdo(wierna), od = sim.tick, klan = wierna.id };
            } });

            // --- warta pod rdzeniem
            if (wierna != null && !sim.rytual.otwarta && wierna.devotion >= W.wartaOddanie && wierna.pop >= W.wartaMinNacja && ilePielgrzymow(sim, wierna.id) < W.wartaIlu) @out.Add(new KandydatKarty { rodzaj = "warta", waga = 4, zbuduj = () =>
            {
                var wybory = new List<Wybor>
                {
                    wybor("posl", $"Poślij {JS.S(W.wartaIlu)} pod rdzeń", "Zejdą pod skorupę i będą się modlić, aż kamień pęknie. To droga do wolności.", 0, W.wartaPosl),
                    wybor("poslJedz", $"Poślij {JS.S(W.wartaIlu)} i daj im jeść", "Jak wyżej — a przy przedsionku wyrośnie jedzenie, żeby warta nie zgłodniała.", W.wartaGrzyb, W.wartaPosl),
                    wybor("czekaj", "Jeszcze nie", "Zostaną w domu."),
                };
                double rozsadny = sim.jedzeniePrzedsionka < 3 && stac(sim, wybory[1]) ? 1 : stac(sim, wybory[0]) ? 0 : 2;
                return new Wydarzenie { rodzaj = "warta", tytul = $"{wierna.name} chcą zejść pod twój rdzeń", tekst = $"{nazwaNacji(wierna)} wierzą na {JS.S(JS.Round(wierna.devotion * 100))}%. Kilku z nich gotowych jest modlić się pod skorupą.", wybory = wybory, domyslny = 2, rozsadny = rozsadny, cel = gniazdo(wierna), od = sim.tick, klan = wierna.id };
            } });

            // --- kłótnia dwóch nacji
            var nacje = zywe(sim).Where(k => k.pop >= 3).ToList();
            (Clan, Clan)? para = null;
            for (var i = 0; i < nacje.Count && para == null; i++)
                for (var j = i + 1; j < nacje.Count; j++)
                    if (JS.Hypot(nacje[i].hx - nacje[j].hx, nacje[i].hy - nacje[j].hy) < 45) { para = (nacje[i], nacje[j]); break; }
            if (para != null) @out.Add(new KandydatKarty { rodzaj = "klotnia", waga = naDom || sim.sen > 0.1 ? 3.5 : 1.5, zbuduj = () =>
            {
                var (a, b) = para.Value;
                var wybory = new List<Wybor>
                {
                    wybor("podsyc", "Podsyć kłótnię", "Wybuchnie wojna. Popłynie krew, a sen się cofnie.", 0, W.klotniaPodsyc),
                    wybor("pogodz", "Pogódź ich", $"Obie nacje uwierzą mocniej (+{JS.S(JS.Round(W.klotniaPogodzOddanie * 100))}%)."),
                };
                double rozsadny = naDom || sim.sen > 0.1 ? (stac(sim, wybory[0]) ? 0 : 1) : 1;
                return new Wydarzenie { rodzaj = "klotnia", tytul = $"Kłótnia: {a.name} i {b.name}", tekst = $"{nazwaNacji(a)} i {nazwaNacji(b)} spierają się o korytarz między gniazdami.", wybory = wybory, domyslny = 1, rozsadny = rozsadny, cel = gniazdo(a), od = sim.tick, klan = a.id, klan2 = b.id };
            } });

            // --- krew, która wymiera
            foreach (var r in new[] { Race.GOBLIN, Race.DWARF, Race.SPINNER })
            {
                var ilu = sim.popByRace[r];
                if (sim.tick > 3000 && ilu > 0 && ilu <= W.wymieraPonizej && st.szczyt[r] >= W.wymieraSzczyt)
                {
                    var rr = r;
                    @out.Add(new KandydatKarty { rodzaj = "wymiera", waga = 6, zbuduj = () =>
                    {
                        st.szczyt[rr] = ilu;                           // następna taka karta dopiero, gdy znów urosną i spadną
                        var k = najwieksza(sim, rr);
                        var wybory = new List<Wybor>
                        {
                            wybor("ratuj", "Ratuj ich", "Dostaną jedzenie i siły. Każda krew w górze oddala sen.", W.ratunek),
                            wybor("pozwol", "Pozwól im zniknąć", "Jedna krew mniej. Łatwiej o monokulturę — i o sen."),
                        };
                        return new Wydarzenie { rodzaj = "wymiera", tytul = $"{RACES[rr].name} wymierają", tekst = $"Zostało {(ilu == 1 ? "jedno" : ilu == 2 ? "dwoje" : "troje")}. Bez nich nikt nie skruszy skorupy.", wybory = wybory, domyslny = 1, rozsadny = stac(sim, wybory[0]) ? 0 : 1, cel = k != null ? gniazdo(k) : null, od = sim.tick, rasa = rr };
                    } });
                    break;
                }
            }
            // --- v4 beta: układ z głębią (krew teraz, sen później)
            if (surowe && sim.tick > W.dlugOd && sim.sen < W.dlugMaxSen && !st.odroczone.Any(o => o.rodzaj == "dlug")) @out.Add(new KandydatKarty { rodzaj = "dlug", waga = 1.5, zbuduj = () =>
            {
                var minut = JS.Round(W.dlugPo / 7200);
                var wybory = new List<Wybor>
                {
                    wybor("bierz", $"Weź {JS.S(W.dlugKrew)} krwi", $"Teraz +{JS.S(W.dlugKrew)} krwi. Za {JS.S(minut)} min głębia się upomni — sen urośnie."),
                    wybor("odmow", "Odmów", "Nic nie dostajesz i nic nie jesteś winien."),
                };
                return new Wydarzenie { rodzaj = "dlug", tytul = "Głębia proponuje układ", tekst = "Coś z dna szepcze: da ci krwi, jeśli kiedyś oddasz jej trochę swojego czuwania.", wybory = wybory, domyslny = 1, rozsadny = sim.krew < 40 ? 0 : 1, od = sim.tick };
            } });

            // --- v4 beta: przysięga dwóch nacji
            var pary = zywe(sim).Where(k => k.pop >= 4).ToList();
            if (surowe && pary.Count >= 2) @out.Add(new KandydatKarty { rodzaj = "przysiega", waga = 1.5, zbuduj = () =>
            {
                var a = pary[sim.rng.@int(pary.Count)];
                var reszta = pary.Where(k => k.id != a.id).ToList();
                var b = reszta[sim.rng.@int(reszta.Count)];
                var minut = JS.Round(W.przysiegaPo / 7200);
                var wybory = new List<Wybor>
                {
                    wybor("blogoslaw", "Pobłogosław przysięgę", $"Za {JS.S(minut)} min {a.name} i {b.name} zawrą długi pokój i oboje uwierzą mocniej.", 0, W.przysiegaWiara),
                    wybor("zlekcewaz", "Zlekceważ", $"Za {JS.S(minut)} min przysięga pęknie — zostanie uraza i może polać się krew (a krew to twój zysk)."),
                };
                return new Wydarzenie { rodzaj = "przysiega", tytul = $"Przysięga: {a.name} i {b.name}", tekst = "Starsi dwóch nacji spotkali się w połowie drogi i proszą cię o świadectwo.", wybory = wybory, domyslny = 1, rozsadny = sim.wiara >= W.przysiegaWiara + 20 ? 0 : 1, cel = gniazdo(a), od = sim.tick, klan = a.id, klan2 = b.id };
            } });

            // Remake v1: jeden lud — tylko karty, które mają w nim sens; etap 4: talia ludu
            var wynik = @out.Where(k => KARTY_REMAKE.Contains(k.rodzaj)).ToList();
            wynik.AddRange(kandydaciLudu(sim, st));
            return wynik;
        }

        // (najazd ludzi z powierzchni wycięty — był zbyt niezbalansowany; może kiedyś wróci)
        static readonly HashSet<string> KARTY_REMAKE = new HashSet<string> { "zaraza", "glod", "znak", "warta", "dlug", "wymiera" };

        /// <summary>Karty, które naprawdę mogą wypaść w grze (z nazwami) — dla okienka dewelopera.</summary>
        public static readonly (string, string)[] KARTY_W_GRZE =
        {
            ("zaraza", "Zaraza"), ("glod", "Głód"), ("znak", "Prośba o znak"),
            ("warta", "Warta pod rdzeniem"), ("dlug", "Głębia proponuje układ"), ("wymiera", "Lud wymiera"),
            ("plony", "Zatrute plony"), ("zawal", "Zawał nad drogą wiernych"),
        };

        /// <summary>v4 beta: spełnia skutki odroczone, którym przyszła pora.</summary>
        static void spelnijOdroczone(Sim sim)
        {
            var st = sim.wydarzenia;
            var teraz = st.odroczone.Where(o => o.tick <= sim.tick).ToList();
            if (teraz.Count == 0) return;
            st.odroczone = st.odroczone.Where(o => o.tick > sim.tick).ToList();
            foreach (var o in teraz)
            {
                var a = o.klan != null ? sim.klan(o.klan.Value) : null;
                var b = o.klan2 != null ? sim.klan(o.klan2.Value) : null;
                if (o.rodzaj == "karta")
                {
                    if (!string.IsNullOrEmpty(o.karta)) st.czekajace.Add(new CzekajacaKarta { karta = o.karta!, klan = o.klan, klan2 = o.klan2 });
                }
                else if (o.rodzaj == "dlug")
                {
                    sim.sen = Math.Min(1, sim.sen + W.dlugSen * (sim.koszmar ? W.koszmarDlug : 1));
                    sim.log("Głębia upomniała się o dług. Powieki ciężeją.", "otchlan");
                    zapisz(sim, "karta", $"dług spłacony snem (+{JS.S(JS.Round(W.dlugSen * 100))}% snu)");
                }
                else if (a != null && b != null && !a.dead && !b.dead)
                {
                    if (o.rodzaj == "przysiega")
                    {
                        st.pokoj.set(paraNacji(a.id, b.id), sim.tick + W.przysiegaPokoj);
                        a.grudge.delete(b.id); b.grudge.delete(a.id);
                        a.devotion = Math.Min(1, a.devotion + W.przysiegaOddanie);
                        b.devotion = Math.Min(1, b.devotion + W.przysiegaOddanie);
                        sim.stat.przysiega++;
                        sim.gdzie(a.hx + 0.5, a.hy + 0.5).log($"{a.name} i {b.name} dotrzymali przysięgi. Chwalą cię razem.", "wiara");
                        zapisz(sim, "karta", $"przysięga spełniona: {a.name} i {b.name}", a.hx, a.hy);
                    }
                    else
                    {
                        a.grudge.set(b.id, a.grudge.getOr(b.id, 0) + W.przysiegaUraza);
                        b.grudge.set(a.id, b.grudge.getOr(a.id, 0) + W.przysiegaUraza);
                        sim.gdzie(a.hx + 0.5, a.hy + 0.5).log($"Przysięga {a.name} i {b.name} pękła. Pamiętają sobie każde słowo.", "krew");
                        zapisz(sim, "karta", $"przysięga pękła: {a.name} i {b.name}", a.hx, a.hy);
                    }
                }
            }
        }

        // ---------------------------------------------------------------- rytm

        /// <summary>Wywoływane co tik z sim.step().</summary>
        public static void tikWydarzen(Sim sim)
        {
            var st = sim.wydarzenia;
            if (sim.spokojnySwiat || sim.ending != null) return;
            if (st.odroczone.Count > 0 && sim.tick % 60 == 0) spelnijOdroczone(sim);
            if (sim.tick % 90 == 0) for (var r = 0; r < st.szczyt.Count; r++) st.szczyt[r] = Math.Max(st.szczyt[r], sim.popByRace[r]);
            if (st.biezace != null)
            {
                if (!st.gracz && sim.tick - st.biezace.od > W.bezGraczaPo) rozstrzygnij(sim, st.biezace.domyslny);
                return;
            }
            if (sim.tick % 900 == 0) foreach (var kv in st.pokoj) if (kv.Value <= sim.tick) st.pokoj.delete(kv.Key);
            // Pierwsza krew nie czeka na kolejkę
            if (st.wojna != null && sim.tick - st.ostatniaWojna >= W.wojnaPo)
            {
                var wj = st.wojna;
                st.wojna = null;
                if (kartaWojny(sim, wj)) return;
            }
            // v4.1 beta: karta z łańcucha
            while (st.czekajace.Count > 0 && sim.tick - st.koniec >= W.lancuchOdstep)
            {
                var l = st.czekajace[0]; st.czekajace.RemoveAt(0);
                if (kartaLancucha(sim, l)) return;
            }
            // Karty pilne: głód całej nacji i ginąca krew nie czekają na swoją kolej
            if (sim.tick < st.nastepne)
            {
                if (sim.tick % 120 != 0 || sim.tick - st.koniec < W.pilnaPo) return;
                var g = najglodniejsza(sim);
                if (g != null && g.Value.udzial >= W.pilnyGlod && g.Value.k.race != sim.domRace) { wylosuj(sim, "glod"); return; }
                return;
            }
            wylosuj(sim);
        }

        /// <summary>Nacja, w której głoduje największa część (co najmniej `glodUdzial`) — z tą częścią.</summary>
        static (Clan k, double udzial)? najglodniejsza(Sim sim)
        {
            Clan? best = null; double udz = 0;
            foreach (var k in zywe(sim))
            {
                if (k.race == Race.DWARF || k.pop < W.glodMinNacja) continue;
                double g = 0, n = 0;
                foreach (var c in sim.creatures) if (!c.dead && c.clan == k.id) { n++; if (c.hunger > 0.6) g++; }
                if (n > 0 && g / n >= W.glodUdzial && g / n > udz) { udz = g / n; best = k; }
            }
            return best != null ? (best, udz) : ((Clan, double)?)null;
        }

        /// <summary>Losuje następną kartę (z wagami, bez powtórki tej samej pod rząd).</summary>
        public static Wydarzenie? wylosuj(Sim sim, string? wymus = null)
        {
            var st = sim.wydarzenia;
            var pula = kandydaci(sim, st).Where(k => wymus != null ? k.rodzaj == wymus : k.rodzaj != st.ostatnie).ToList();
            if (pula.Count == 0 && wymus == null) pula = kandydaci(sim, st);
            if (pula.Count == 0) { st.nastepne = sim.tick + 900; return null; }
            double suma = 0;
            foreach (var k in pula) suma += k.waga;
            var los = sim.rng.next() * suma;
            var wybrany = pula[pula.Count - 1];
            foreach (var k in pula) { los -= k.waga; if (los <= 0) { wybrany = k; break; } }
            var w = wybrany.zbuduj();
            if (w == null) { st.nastepne = sim.tick + 900; return null; }
            podrozej(sim, w);
            st.biezace = w;
            st.ile++;
            zapisz(sim, "karta", $"nowa karta: {w.tytul}");
            st.ostatnie = w.rodzaj;
            return w;
        }

        /// <summary>Wykonuje wybór. Zwraca powód odmowy (np. „Brakuje krwi.”) albo null, gdy się udało.</summary>
        public static string? rozstrzygnij(Sim sim, double i)
        {
            var st = sim.wydarzenia;
            var e = st.biezace;
            if (e == null) return "Nie ma wydarzenia.";
            var w = JS.At(e.wybory, i);
            if (w == null) return "Nie ma takiego wyboru.";
            if (!stac(sim, w))
            {
                var brak = new List<string>();
                if (sim.krew - sim.rezerwa.krew < w.krew) brak.Add("krwi");
                if (sim.wiara - sim.rezerwa.wiara < w.wiara) brak.Add("wiary");
                return $"Brakuje {string.Join(" i ", brak)}.";
            }
            sim.krew -= w.krew; sim.wiara -= w.wiara;
            if (JS.Tak(w.krew) || JS.Tak(w.wiara))
            {
                var klucz = $"{e.rodzaj}:{w.id}";
                st.kupione[klucz] = (st.kupione.TryGetValue(klucz, out var ile) ? ile : 0) + 1;
            }
            wykonaj(sim, e, w.id);
            if (e.cel != null) sim.gdzie(e.cel.x, e.cel.y);
            sim.log($"{e.tytul}. Wybrałeś: {w.tekst.ToLowerInvariant()}.", "swiat");
            sim.stat.kart++;
            zapisz(sim, "karta", $"karta „{e.tytul}” → {w.tekst}");
            st.biezace = null;
            st.koniec = sim.tick;
            if (e.lancuch == true) { sim.stat.lancuch++; st.nastepne = Math.Max(st.nastepne, sim.tick + W.lancuchOdstep); }
            else if (e.rodzaj != "wojna" && e.rodzaj != "zabytek") st.nastepne = sim.tick + W.odstep + sim.rng.@int(W.rozrzut);
            return null;
        }

        /// <summary>Pierwsza śmierć w walce między nacjami, które dotąd nie miały do siebie urazy (creatures.ts).</summary>
        public static void zglosWojne(Sim sim, double a, double b, double x, double y)
        {
            var st = sim.wydarzenia;
            if (sim.spokojnySwiat || sim.ending != null || st.wojna != null || a == b) return;
            var A = sim.klan(a); var B = sim.klan(b);
            if (A == null || B == null || A.race == Race.HUMAN || B.race == Race.HUMAN) return;
            if (st.ciszaWojen.getOr(paraNacji(a, b), -1) > sim.tick) return;
            st.wojna = new WojnaKarty { a = a, b = b, x = x, y = y };
        }

        static bool kartaWojny(Sim sim, WojnaKarty wj)
        {
            var st = sim.wydarzenia;
            var A = sim.klan(wj.a); var B = sim.klan(wj.b);
            if (A == null || B == null || A.dead || B.dead || A.pop <= 0 || B.pop <= 0) return false;
            if (!JS.Tak(A.grudge.getOr(B.id, 0)) && !JS.Tak(B.grudge.getOr(A.id, 0))) return false;
            st.ciszaWojen.set(paraNacji(A.id, B.id), sim.tick + W.wojnaCisza);
            var minut = JS.Round(W.wojnaPokoj / 7200);
            var wybory = new List<Wybor>
            {
                wybor("rozdziel", "Rozdziel ich", $"Zapomną urazę i przez {JS.S(minut)} min nie tkną się nawzajem.", W.wojnaRozdziel),
                wybor("niech", "Niech walczą", "Każda śmierć to twoja krew. Ale gdy słabsi wyginą, jedna krew zje resztę — a to sen."),
            };
            var slabsi = sim.popByRace[A.race] <= sim.popByRace[B.race] ? A : B;
            var silniejsi = slabsi == A ? B : A;
            var wiodaca = najwierniejsza(sim);
            var chron = sim.popByRace[slabsi.race] <= W.wojnaChronPonizej
                || (wiodaca != null && (wiodaca.id == A.id || wiodaca.id == B.id))
                || (silniejsi.race == sim.domRace && sim.dominance > 0.5);
            if (!chron) return false;
            st.ostatniaWojna = sim.tick;
            st.biezace = new Wydarzenie
            {
                rodzaj = "wojna", tytul = $"Pierwsza krew: {A.name} i {B.name}",
                tekst = $"Padł pierwszy trup. Po jednej stronie {nazwaNacji(A)}, po drugiej {nazwaNacji(B)}. Będą się mścić, aż uraza wygaśnie albo jedni wyginą.",
                wybory = wybory, domyslny = 1, rozsadny = stac(sim, wybory[0]) ? 0 : 1,
                cel = new CelKarty { x = wj.x, y = wj.y, tekst = "pierwsza krew" }, od = sim.tick, klan = A.id, klan2 = B.id,
            };
            podrozej(sim, st.biezace);
            st.biezace.rozsadny = stac(sim, st.biezace.wybory[0]) ? 0 : 1;
            st.ile++;
            return true;
        }

        /// <summary>Karta wymuszona z zewnątrz — nowe plemię zeszło w pustą górę.</summary>
        public static void kartaPlemienia(Sim sim, Clan k)
        {
            var st = sim.wydarzenia;
            if (st.biezace != null || sim.spokojnySwiat) return;
            st.biezace = new Wydarzenie
            {
                rodzaj = "plemie", tytul = $"{k.name} zeszli w górę", tekst = $"{nazwaNacji(k)} — pustka ich przyciągnęła. Nie wiedzą, co tu zastaną.",
                wybory = new List<Wybor>
                {
                    wybor("karm", "Nakarm ich na powitanie", "Przy gnieździe wyrośnie jedzenie — przeżyją pierwsze dni.", W.plemieNakarm),
                    wybor("nic", "Niech radzą sobie sami", "Może przeżyją, może nie."),
                }, domyslny = 1, rozsadny = sim.krew >= W.plemieNakarm ? 0 : 1, cel = gniazdo(k), od = sim.tick, klan = k.id,
            };
        }

        // ---------------------------------------------------------------- skutki

        static void wykonaj(Sim sim, Wydarzenie e, string id)
        {
            var klan = e.klan != null ? sim.klan(e.klan.Value) : null;
            var klan2 = e.klan2 != null ? sim.klan(e.klan2.Value) : null;
            if (wykonajLudu(sim, e, id)) return;
            // Alpha, etap 3e: zabytek z ruin — numer ruiny w `x`
            if (e.rodzaj == "zabytek") { rozstrzygnijZabytek(sim, e.x ?? -1, id == "wez"); return; }
            switch ($"{e.rodzaj}:{id}")
            {
                case "powodz:plyn": sim.flood(e.x); break;
                case "powodz:kieruj": { var d = dominujaca(sim, 0); sim.flood(d != null ? d.hx : e.x); break; }
                case "zaraza:niech":
                    sim.plague();
                    lancuch(sim, "ozdrowiency", W.lancuchPo);
                    break;
                case "zaraza:uzdrow":
                    foreach (var k in zywe(sim)) k.devotion = Math.Min(1, k.devotion + W.zarazaUzdrowOddanie);
                    break;
                case "zyla:zostaw": sim.madVein(); break;
                case "dlug:bierz":
                    sim.stat.dlug++;
                    sim.krew += W.dlugKrew;
                    sim.wydarzenia.odroczone.Add(new Odroczony { tick = sim.tick + W.dlugPo, rodzaj = "dlug" });
                    break;
                case "przysiega:blogoslaw":
                case "przysiega:zlekcewaz":
                    if (klan != null && klan2 != null) sim.wydarzenia.odroczone.Add(new Odroczony { tick = sim.tick + W.przysiegaPo, rodzaj = id == "blogoslaw" ? "przysiega" : "krzywoprzysiestwo", klan = klan.id, klan2 = klan2.id });
                    break;
                case "obcy:wypusc": sim.obcyLud(); break;
                case "glod:karm":
                    if (klan != null)
                    {
                        sim.zapasy(klan, Math.Max(W.glodJedzenia, JS.Round(klan.pop * 1.2)));
                        foreach (var c in sim.creatures) if (!c.dead && c.clan == klan.id) c.hunger = Math.Max(0, c.hunger - W.glodUlga);
                        sim.efekt(klan.hx + 0.5, klan.hy + 0.5, "zasiew");
                        lancuch(sim, "wdzieczni", W.lancuchPo, klan.id);
                    }
                    break;
                case "glod:zmarli":
                    if (klan != null)
                    {
                        var czlonkowie = JS.Sort(sim.creatures.Where(c => !c.dead && c.clan == klan.id).ToList(), (a, b) => a.hp - b.hp);
                        foreach (var c in czlonkowie.Take((int)W.glodZmarlych).ToList()) sim.kill(c, "zjedzony przez swoich", "głód");
                        foreach (var c in czlonkowie.Skip((int)W.glodZmarlych)) c.hunger = Math.Max(0, c.hunger - W.glodZmarlychUlga);
                    }
                    break;
                case "prorok:wysluchaj":
                    if (klan != null)
                    {
                        var glos = sim.creatures.FirstOrDefault(c => !c.dead && c.clan == klan.id && !c.prophet);
                        if (glos != null)
                        {
                            sim.makeProphet(glos);
                            lancuch(sim, "proroctwo", W.lancuchPo, glos.clan, klan.id);
                        }
                    }
                    break;
                case "prorok:ucisz":
                    if (klan != null)
                    {
                        klan.devotion = Math.Min(1, klan.devotion + W.prorokUciszOddanie);
                        lancuch(sim, "heretyk", W.lancuchPo, klan.id);
                    }
                    break;
                case "ruda:oltarz": if (klan != null) klan.stock += W.rudaOltarz; break;
                case "ruda:kuznia": if (klan2 != null) klan2.stock += W.rudaKuznia; break;
                case "znak:objaw":
                    if (klan != null)
                    {
                        klan.devotion = Math.Min(1, klan.devotion + W.znakOddanie);
                        postawGlif(sim, klan);
                        sim.efekt(klan.hx + 0.5, klan.hy + 0.5, "cud");
                    }
                    break;
                case "znak:milcz": if (klan != null) klan.devotion = Math.Max(0, klan.devotion - W.znakMilczenie); break;
                case "warta:poslJedz":
                    jedzeniePrzyPrzedsionku(sim);
                    poslijWarte(sim, klan);
                    break;
                case "warta:posl": poslijWarte(sim, klan); break;
                case "klotnia:podsyc":
                    sim.stat.walka++;
                    if (klan != null && klan2 != null)
                    {
                        sim.feud(klan.id, klan2.id); sim.feud(klan2.id, klan.id);
                        klan.zSzeptu = true;                        // to twoja wojna — jej śmierci cofają sen
                    }
                    break;
                case "klotnia:pogodz":
                    if (klan != null && klan2 != null)
                    {
                        klan.grudge.delete(klan2.id); klan2.grudge.delete(klan.id);
                        klan.devotion = Math.Min(1, klan.devotion + W.klotniaPogodzOddanie);
                        klan2.devotion = Math.Min(1, klan2.devotion + W.klotniaPogodzOddanie);
                    }
                    break;
                case "wymiera:ratuj":
                    foreach (var k in zywe(sim))
                    {
                        if (k.race != e.rasa) continue;
                        sim.zapasy(k, W.ratunekJedzenia);
                        if (k.race == Race.DWARF) k.stock += W.rudaKuznia;
                    }
                    foreach (var c in sim.creatures)
                    {
                        if (c.dead || c.race != e.rasa) continue;
                        c.hunger = 0; c.hp = RACES[c.race].maxHp;
                    }
                    break;
                case "plemie:karm": if (klan != null) sim.zapasy(klan, W.plemieJedzenia); break;
                case "wojna:rozdziel":
                    if (klan != null && klan2 != null) rozdziel(sim, klan, klan2, e.cel);
                    break;
                case "wojna:niech":
                    sim.stat.walka++;
                    if (klan != null && klan2 != null) lancuch(sim, "zemsta", W.zemstaPo, klan.id, klan2.id);
                    break;
                default:
                    if (e.lancuch == true) wykonajLancuch(sim, e, id, klan, klan2);
                    break;
            }
        }

        /// <summary>Rozejm między dwiema nacjami („rozdziel ich”).</summary>
        static void rozdziel(Sim sim, Clan klan, Clan klan2, CelKarty? cel)
        {
            klan.grudge.delete(klan2.id); klan2.grudge.delete(klan.id);
            sim.wydarzenia.pokoj.set(paraNacji(klan.id, klan2.id), sim.tick + W.wojnaPokoj);
            foreach (var c in sim.creatures)
            {
                if (c.dead || (c.clan != klan.id && c.clan != klan2.id)) continue;
                var t = sim.creatureById(sim.target.getOr(c.id, -1));
                if (t != null && t.clan != c.clan && (t.clan == klan.id || t.clan == klan2.id)) { sim.target.delete(c.id); c.jt = 0; }
            }
            if (cel != null) sim.efekt(cel.x, cel.y, "cud");
        }

        /// <summary>v4.2 beta: ten sam płatny wybór kupowany raz za razem drożeje.</summary>
        static void podrozej(Sim sim, Wydarzenie e)
        {
            foreach (var w in e.wybory)
            {
                var n = sim.wydarzenia.kupione.TryGetValue($"{e.rodzaj}:{w.id}", out var ile) ? ile : 0;
                if (!JS.Tak(n) || (!JS.Tak(w.krew) && !JS.Tak(w.wiara))) continue;
                var m = 1 + W.drozeje * n;
                w.krew = JS.Round(w.krew * m); w.wiara = JS.Round(w.wiara * m);
                w.skutek += $" (Drożej: wybrane już {(n == 1 ? "raz" : $"{JS.S(n)} razy")}.)";
            }
        }

        // ---------------------------------------------------------------- v4.1 beta: łańcuchy kart

        /// <summary>Zapisuje kartę, która wróci za `po` tików jako skutek dzisiejszego wyboru.</summary>
        static void lancuch(Sim sim, string karta, double po, double? klan = null, double? klan2 = null)
        {
            sim.wydarzenia.odroczone.Add(new Odroczony { tick = sim.tick + po, rodzaj = "karta", karta = karta, klan = klan, klan2 = klan2 });
        }

        static Clan? zywaNacja(Sim sim, double? id)
        {
            var k = id != null ? sim.klan(id.Value) : null;
            return k != null && !k.dead && k.pop > 0 ? k : null;
        }

        static Wydarzenie lancuchowa(Sim sim, string karta) => new Wydarzenie { rodzaj = karta, od = sim.tick, lancuch = true };

        /// <summary>Buduje kartę z łańcucha; null, gdy jej nacja już nie żyje albo karta straciła sens.</summary>
        static Wydarzenie? zbudujLancuch(Sim sim, CzekajacaKarta l)
        {
            var ludu = zbudujLancuchLudu(sim, l.karta);
            if (ludu != null || l.karta == "bunt") return ludu;
            var k = zywaNacja(sim, l.klan); var k2 = zywaNacja(sim, l.klan2);
            Wydarzenie e;
            switch (l.karta)
            {
                case "heretyk":
                {
                    if (k == null) return null;
                    var wybory = new List<Wybor>
                    {
                        wybor("nawroc", "Nawróć go cudem", $"Wróci do ciebie, a z nim cała nacja (+{proc(W.heretykNawrocOddanie)} oddania).", 0, W.heretykNawroc),
                        wybor("zmiazdz", "Zmiażdż herezję", $"{JS.S(W.heretykOfiar)} najsłabszych w wierze zginie — krew dla ciebie, a reszta uwierzy ze strachu (+{proc(W.heretykStrachOddanie)})."),
                        wybor("zostaw", "Niech mówi", $"Herezja się szerzy: nacja straci wiarę (−{proc(W.heretykZwatpienie)})."),
                    };
                    e = lancuchowa(sim, l.karta);
                    e.tytul = $"{k.name}: uciszony prorok wrócił"; e.tekst = $"Ten, którego uciszyłeś, nie zamilkł. Szepcze teraz po kątach — i {nazwaNacji(k)} zaczynają go słuchać.";
                    e.wybory = wybory; e.domyslny = 2; e.rozsadny = stac(sim, wybory[0]) ? 0 : 1; e.cel = gniazdo(k); e.klan = k.id;
                    return e;
                }
                case "proroctwo":
                {
                    if (k == null) return null;
                    var wybory = new List<Wybor>
                    {
                        wybor("spelnij", "Spełnij proroctwo", $"Każda nacja uwierzy mocniej (+{proc(W.proroctwoOddanie)}), a skorupa, którą ktoś kuje, pęknie szybciej (+{proc(W.proroctwoSkorupa)}).", 0, W.proroctwoWiara),
                        wybor("milcz", "Milcz", $"Proroctwo się nie spełni — {k.name} zwątpią (−{proc(W.proroctwoZwatpienie)})."),
                    };
                    e = lancuchowa(sim, l.karta);
                    e.tytul = $"{k.name}: proroctwo"; e.tekst = $"Prorok, który odszedł z wiernymi i założył nację {nazwaNacji(k)}, zapowiedział, że skorupa twojego rdzenia pęknie. Wszystkie nacje patrzą teraz na ciebie.";
                    e.wybory = wybory; e.domyslny = 1; e.rozsadny = stac(sim, wybory[0]) ? 0 : 1; e.cel = gniazdo(k); e.klan = k.id;
                    return e;
                }
                case "wdzieczni":
                {
                    if (k == null) return null;
                    var wybory = new List<Wybor>
                    {
                        wybor("ofiara", "Przyjmij ofiarę", $"Dostaniesz {JS.S(W.wdzieczniKrew)} krwi i {JS.S(W.wdzieczniWiara)} wiary."),
                        wybor("wiara", "Niech uwierzą", $"Oddanie nacji wzrośnie o {proc(W.wdzieczniOddanie)}."),
                    };
                    var moznaWarta = !sim.rytual.otwarta && RACES[k.race].faithGain > 0 && k.race != Race.TROLL;
                    if (moznaWarta) wybory.Add(wybor("warta", $"Niech {JS.S(W.wartaIlu)} zejdzie pod rdzeń", "Najedzeni zejdą pod skorupę i będą się modlić — jak warta."));
                    double rozsadny = moznaWarta && k.devotion >= W.wartaOddanie ? 2 : k.devotion < 0.5 ? 1 : 0;
                    e = lancuchowa(sim, l.karta);
                    e.tytul = $"{k.name} pamiętają"; e.tekst = $"{nazwaNacji(k)} pamiętają, kto ich nakarmił, kiedy głodowali. Pytają, czego chcesz w zamian.";
                    e.wybory = wybory; e.domyslny = 0; e.rozsadny = rozsadny; e.cel = gniazdo(k); e.klan = k.id;
                    return e;
                }
                case "ozdrowiency":
                {
                    if (zywe(sim).Count == 0) return null;
                    var wybory = new List<Wybor>
                    {
                        wybor("poblogoslaw", "Pobłogosław ozdrowieńców", $"Wszyscy odzyskają siły, a każda nacja uwierzy mocniej (+{proc(W.ozdrowiencyOddanie)}).", 0, W.ozdrowiencyWiara),
                        wybor("milcz", "Milcz", $"Nic się nie stanie — choć zaraza może wrócić (szansa {proc(W.ozdrowiencyNawrot)})."),
                    };
                    e = lancuchowa(sim, l.karta);
                    e.tytul = "Ozdrowieńcy"; e.tekst = "Zaraza przeszła. Ci, którzy ją przeżyli, chodzą twardsi niż przedtem — i pytają, czy to była twoja próba.";
                    e.wybory = wybory; e.domyslny = 1; e.rozsadny = stac(sim, wybory[0]) ? 0 : 1;
                    return e;
                }
                case "zemsta":
                {
                    if (k == null || k2 == null) return null;
                    var (slabsi, silniejsi) = k.pop <= k2.pop ? (k, k2) : (k2, k);
                    var minut = JS.Round(W.wojnaPokoj / 7200);
                    var wybory = new List<Wybor>
                    {
                        wybor("sila", "Daj im siłę", $"{slabsi.name} odzyskają zdrowie i dostaną jedzenie — wojna się wyrówna.", W.zemstaKrew),
                        wybor("rozejm", "Zakończ wojnę", $"Zapomną urazę i przez {JS.S(minut)} min nie tkną się nawzajem.", W.wojnaRozdziel),
                        wybor("nic", "Niech los rozstrzygnie", "Silniejsi zrobią swoje. Każda śmierć to twoja krew."),
                    };
                    var chron = sim.popByRace[slabsi.race] <= W.wojnaChronPonizej || (silniejsi.race == sim.domRace && sim.dominance > 0.5);
                    double rozsadny = chron ? (stac(sim, wybory[1]) ? 1 : stac(sim, wybory[0]) ? 0 : 2) : 2;
                    e = lancuchowa(sim, l.karta);
                    e.tytul = $"{slabsi.name} chcą pomsty"; e.tekst = $"{nazwaNacji(slabsi)} przegrywają wojnę — po drugiej stronie stoją {silniejsi.name}. Proszą cię o siłę.";
                    e.wybory = wybory; e.domyslny = 2; e.rozsadny = rozsadny; e.cel = gniazdo(slabsi); e.klan = slabsi.id; e.klan2 = silniejsi.id;
                    return e;
                }
            }
            return null;
        }

        /// <summary>Pokazuje kartę z łańcucha (zwraca false, gdy nie ma już kogo pytać).</summary>
        static bool kartaLancucha(Sim sim, CzekajacaKarta l)
        {
            var e = zbudujLancuch(sim, l);
            if (e == null) return false;
            podrozej(sim, e);
            var st = sim.wydarzenia;
            st.biezace = e;
            st.ile++;
            zapisz(sim, "karta", $"karta z łańcucha: {e.tytul}");
            return true;
        }

        /// <summary>Narzędzie dewelopera: karta z łańcucha od razu, dla największych nacji.</summary>
        public static bool wymusLancuch(Sim sim, string karta)
        {
            if (sim.wydarzenia.biezace != null || sim.ending != null) return false;
            var l = JS.Sort(new List<Clan>(zywe(sim)), (x, y) => y.pop - x.pop);
            return kartaLancucha(sim, new CzekajacaKarta { karta = karta, klan = l.Count > 0 ? l[0].id : (double?)null, klan2 = l.Count > 1 ? l[1].id : (double?)null });
        }

        /// <summary>Karty, które wracają z łańcuchów — dla okienka dewelopera.</summary>
        public static readonly string[] KARTY_LANCUCHA = { "heretyk", "proroctwo", "wdzieczni", "ozdrowiency", "zemsta", "bunt" };

        static void wykonajLancuch(Sim sim, Wydarzenie e, string id, Clan? klan, Clan? klan2)
        {
            void dodajOddanie(Clan k, double v) { k.devotion = Math.Max(0, Math.Min(1, k.devotion + v)); }
            switch ($"{e.rodzaj}:{id}")
            {
                case "heretyk:nawroc":
                    if (klan != null) { dodajOddanie(klan, W.heretykNawrocOddanie); sim.efekt(klan.hx + 0.5, klan.hy + 0.5, "cud"); }
                    break;
                case "heretyk:zmiazdz":
                    if (klan != null)
                    {
                        var najslabsi = JS.Sort(sim.creatures.Where(c => !c.dead && c.clan == klan.id && !c.prophet).ToList(), (a, b) => a.devotion - b.devotion);
                        foreach (var c in najslabsi.Take((int)W.heretykOfiar).ToList()) sim.kill(c, "za herezję", "herezja");
                        dodajOddanie(klan, W.heretykStrachOddanie);
                    }
                    break;
                case "heretyk:zostaw": if (klan != null) dodajOddanie(klan, -W.heretykZwatpienie); break;
                case "proroctwo:spelnij":
                {
                    sim.stat.proroctwo++;
                    foreach (var k in zywe(sim)) dodajOddanie(k, W.proroctwoOddanie);
                    var r = sim.rytual;
                    var kuje = r.klan >= 0 ? sim.klan(r.klan) : null;
                    if (kuje != null && !kuje.dead && !r.otwarta) kuje.rytual = Math.Min(0.99, kuje.rytual + W.proroctwoSkorupa);
                    if (klan != null) sim.efekt(klan.hx + 0.5, klan.hy + 0.5, "cud");
                    sim.log("Proroctwo się wypełnia. Skorupa rdzenia drży.", "wiara");
                    break;
                }
                case "proroctwo:milcz": if (klan != null) dodajOddanie(klan, -W.proroctwoZwatpienie); break;
                case "wdzieczni:ofiara": sim.krew += W.wdzieczniKrew; sim.wiara += W.wdzieczniWiara; break;
                case "wdzieczni:wiara": if (klan != null) dodajOddanie(klan, W.wdzieczniOddanie); break;
                case "wdzieczni:warta": poslijWarte(sim, klan); break;
                case "ozdrowiency:poblogoslaw":
                    foreach (var k in zywe(sim)) dodajOddanie(k, W.ozdrowiencyOddanie);
                    foreach (var c in sim.creatures)
                    {
                        if (c.dead || c.race == Race.HUMAN) continue;
                        c.hp = RACES[c.race].maxHp; c.hunger = Math.Max(0, c.hunger - W.ozdrowiencyUlga);
                    }
                    break;
                case "ozdrowiency:milcz":
                    if (sim.rng.chance(W.ozdrowiencyNawrot)) { sim.plague(); sim.log("Zaraza wróciła. Nikt jej nie zatrzymał.", "krew"); }
                    break;
                case "zemsta:sila":
                    if (klan != null)
                    {
                        sim.zapasy(klan, W.zemstaJedzenia);
                        foreach (var c in sim.creatures) if (!c.dead && c.clan == klan.id) { c.hp = RACES[c.race].maxHp; c.hunger = 0; c.fear = 0; }
                        sim.efekt(klan.hx + 0.5, klan.hy + 0.5, "cud");
                    }
                    break;
                case "zemsta:rozejm": if (klan != null && klan2 != null) rozdziel(sim, klan, klan2, e.cel); break;
            }
        }

        /// <summary>Świecący glif przy gnieździe — modlitwa przy nim liczy się podwójnie.</summary>
        static void postawGlif(Sim sim, Clan k)
        {
            var w = sim.world;
            for (double r = 0; r <= 3; r++)
                for (var dx = -r; dx <= r; dx++)
                {
                    double x = k.hx + dx, y = k.hy;
                    if (w.inb(x, y) && w.get(x, y) == T.AIR) { w.set(x, y, T.GLYPH); return; }
                }
        }

        /// <summary>Jedzenie na podłodze przy przedsionku nad rdzeniem — tym żyje warta.</summary>
        static void jedzeniePrzyPrzedsionku(Sim sim)
        {
            var w = sim.world;
            var poszlo = 0;
            for (var k = 0; k < 400 && poszlo < 10; k++)
            {
                var x = w.coreX + sim.rng.@int(21) - 10;
                var y = w.przedsionekY + sim.rng.@int(9) - 6;
                if (!w.inb(x, y) || w.get(x, y) != T.AIR || PASSABLE[w.get(x, y + 1)] == 1) continue;
                w.set(x, y, T.FUNGUS);
                poszlo++;
            }
            sim.efekt(w.coreX + 0.5, w.przedsionekY + 0.5, "zasiew");
        }

        /// <summary>Wysyła najedzonych wiernych pod rdzeń — ten sam skutek co szept „módl się”.</summary>
        static void poslijWarte(Sim sim, Clan? k)
        {
            if (k == null) return;
            var posl = ilePielgrzymow(sim, k.id);
            var chetni = JS.Sort(sim.creatures.Where(c => !c.dead && c.clan == k.id && c.job != Job.PIELGRZYM && !c.slave && (c.rola ?? "pobozny") == "pobozny").ToList(),
                (a, b) => a.hunger - b.hunger);
            foreach (var c in chetni)
            {
                if (posl >= W.wartaIlu) break;
                c.thought = Thought.PRAY_CORE; c.jt = 0;
                sim.efekt(c.x, c.y, "mysl", "módl się");
                posl++;
            }
            odswiezPlan(sim);
        }
    }
}
