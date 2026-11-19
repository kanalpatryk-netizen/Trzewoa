// Port: alpha-1/src/app/screens/game.ts — ekran rozgrywki: świat, płyta, księga, okno postaci, „Budowa”, karty i ryty.
// Samouczek nakłada się na niego z góry. Rozbity na pliki częściowe: EkranGry.cs (pola, życie ekranu, kamera, pauza,
// tablice atlasu, wydarzenia i alarmy), EkranGry.Krok.cs (krok świata, dźwięki z różnicy stanu — na razie zaślepki),
// EkranGry.Rysuj.cs (obraz), EkranGry.Wejscie.cs (mysz i klawisze, rozkazy, plany, ołtarz).
// Tylko układ komputera (Alpha 1): gałęzie telefonu (plate.waski / plate.niski) w TS są martwe na komputerze
// i tu ich nie ma — wyjątki opisane przy metodach.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Atlas;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Aplikacja.Obserwowany;
using static Trzewia.Nastawy.NastawySterowanie;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyWygladAtlas;
using static Trzewia.Rdzen.SettingsStore;
using SLud = Trzewia.Symulacja.Lud;

namespace Trzewia.Aplikacja
{
    /// <summary>
    /// Co gracz zrobił — samouczek podsłuchuje (game.ts: ZdarzenieGry). typ: 'moc' | 'szept' | 'wybranoCzasownik' |
    /// 'kamera' | 'rozkaz' | 'zaznaczono' | 'polecenie' | 'oltarz' | 'planowanie' | 'plan' | 'pauza' | 'tempo' |
    /// 'wydarzenie' | 'koniec'.
    /// </summary>
    public sealed class ZdarzenieGry
    {
        public string typ = "";
        public string? czasownik, narzedzie, rodzaj, wybor, opis;
        public bool zPlanu, stoi;
        public double ile, przyjeli;
    }

    public sealed partial class EkranGry : Ekran, IWarstwySterowania
    {
        public override string nazwa => "gra";
        /// <summary>Najmniejsze pole dotyku (px logiczne) — przyciski banera i alarmu rysują się mniejsze, trafia się w tyle.</summary>
        const double POLE_PALCA = 44;
        static readonly Random los = new Random();

        public Sim sim;
        /// <summary>W jakim trybie powstała bieżąca partia (Krąg Trzeci czy Alpha 1) — menu nie wraca do partii drugiego trybu.</summary>
        public bool partiaKregu;
        /// <summary>Krąg Trzeci: film i scena wejścia na początku partii (Aplikacja/WstepKregu.cs).</summary>
        public readonly WstepKregu wstep = new WstepKregu();
        public Camera cam = new Camera(1, 1);
        /// <summary>Świat na płycie: rycina (eng), tajemnica, pomieszczenia, ołtarz, ruiny, urobki — wspólne z ekranem próbnym.</summary>
        readonly PlytaSwiata plyta = new PlytaSwiata();
        Rycina eng => plyta.rycina;
        Urobki urobki => plyta.urobki;
        Pokoje pokoje => plyta.pokoje;
        Tajemnica tajemnica => plyta.tajemnica;
        /// <summary>Pilnuje klatek w trybie jakości „auto” — przy zadyszce rycina tanieje.</summary>
        readonly StrazKlatek straz = new StrazKlatek();
        bool oknoOltarza;
        List<PoleOltarza> polaOltarza = new List<PoleOltarza>();
        /// <summary>Planujesz: szablon pod kursorem (null — nie planujesz).</summary>
        public string? szablon;
        string ostatniSzablon = "warsztat";
        /// <summary>Korytarz i szyb: kafel, od którego ciągniesz pas.</summary>
        (double x, double y)? ciagniecie;
        /// <summary>Ile znaków pisma w skale było w ostatniej klatce — po nich odkrywa się ich tablica.</summary>
        int znakowWidac => plyta.znakowWidac;
        double ostatnieOdkrywanie;
        public readonly Ui ui = new Ui();
        public Plate plate = Plyta.computePlate(1366, 820);
        /// <summary>Samouczek podsłuchuje, co gracz zrobił.</summary>
        public Action<ZdarzenieGry>? nasluch;
        /// <summary>Samouczek może odciąć część czasowników.</summary>
        public HashSet<string>? dozwolone;
        /// <summary>Miejsce, na które gra wprost każe patrzeć (samouczek, podpowiedzi).</summary>
        public Cel? cel;
        /// <summary>Alpha, etap 2: zaznaczone postacie ludu (id) — dotknięcie mapy wydaje im rozkaz „idź tam”.</summary>
        public readonly HashSet<double> zaznaczeni = new HashSet<double>();
        /// <summary>Pola paska drużyny pod płytą (telefon) — na komputerze zawsze puste.</summary>
        readonly List<PoleDruzyny> polaDruzyny = new List<PoleDruzyny>();
        /// <summary>Alpha 1 (komputer): pola księgi pod płytą, płyty „Budowa” z menu kafli i okna postaci.</summary>
        List<PoleKsiegi> polaKsiegi = new List<PoleKsiegi>();
        List<PoleBudowy> polaBudowy = new List<PoleBudowy>();
        List<PoleOkna> polaOkna = new List<PoleOkna>();
        /// <summary>Menu kafli „Budowa” otwarte.</summary>
        public bool menuBudowy;
        /// <summary>Fala w miejscu ostatniego rozkazu (render/druzyna.ts).</summary>
        FalaRozkazu? falaRozkazu;
        /// <summary>Samouczek gra na własnej górze i nie ma prawa nadpisać zapisu gracza.</summary>
        public bool zapisujAuto = true;

        public (double x, double y) camTarget = (0, 0);
        bool dirty = true;
        /// <summary>Kamera z chwili ostatniego przerysowania ryciny.</summary>
        readonly double[] rysKam = { double.NaN, double.NaN, double.NaN };
        double lastInk, lastSave, lastSound, reszta;
        /// <summary>Remake v2: ostatnie wiadro, które już było słychać.</summary>
        double? slyszaneWiadro;
        Podpowiedz? rada;
        double radaOd = -1e9;
        /// <summary>Pauza żyje tylko w tej sesji — zapisana potrafiła uruchomić grę w bezruchu.</summary>
        public bool pauza;
        /// <summary>Samouczek zatrzymuje świat bez pauzy — żeby szept działał od razu, a nie szedł do planu.</summary>
        public bool wstrzymane;
        /// <summary>Rozkazy wydane w pauzie: czekają jako szkice, dzieją się po puszczeniu czasu.</summary>
        public readonly Rozkazy rozkazy = new Rozkazy();
        List<PoleBanera> polaBanera = new List<PoleBanera>();
        /// <summary>Palec trzymany na rycie: po STEROWANIE.przytrzymanieMs otwiera się tablica (zamiast prawego przycisku).</summary>
        sealed class Przytrzymanie { public int id; public string v = ""; public double sx, sy, od; public string? verb, tool; }
        Przytrzymanie? przytrzymanie;
        /// <summary>Podpowiedź nad płytą jako odnośnik do miejsca, o którym mówi (na komputerze nie rysowana).</summary>
        Obszar? radaRect;
        double? slyszanaDlonWstaje, slyszanaDlonChwyt;
        /// <summary>Strażnik auto-pauzy i karta sytuacji, którą właśnie pokazuje.</summary>
        readonly Straznik straznik = new Straznik();
        public Alarm? alarm;
        List<PoleAlarmu> polaAlarmu = new List<PoleAlarmu>();
        /// <summary>Pola wyborów na karcie wydarzenia i karta, którą już pokazano (żeby nie podnosić jej co klatkę).</summary>
        List<PoleWyboru> polaWydarzenia = new List<PoleWyboru>();
        Wydarzenie? pokazaneWydarzenie;
        /// <summary>Atlas tablic — okno nad płytą; świat stoi, póki jest otwarte.</summary>
        public readonly OknoAtlasu atlas = new OknoAtlasu();
        double ostatniaTablica = -1e9;
        public bool legenda, liczby;
        /// <summary>Otwarte zapiski — cała kronika na wierzchu, świat czeka.</summary>
        public bool zapiski;
        double przewinZapiskow;
        List<TrafienieZapisku> trafieniaZapiskow = new List<TrafienieZapisku>();
        double maxPrzewin;
        List<Przycisk> przyciski = new List<Przycisk>();
        /// <summary>Gracz przejął kamerę — automat wraca po C albo po chwili bezruchu.</summary>
        public bool recznaKamera;
        (double x, double y)? ostatnieKlikniecie;
        int indeksWTlumie;
        sealed class Palec { public double x, y, sx, sy; public bool moved, interfejs; public int przycisk; public bool plan, mysz; }
        readonly Dictionary<int, Palec> pointers = new Dictionary<int, Palec>();
        /// <summary>
        /// Zaznaczanie prostokątem (25.10): ramka ciągnięta lewym przyciskiem myszy po mapie — rogi w kaflach świata.
        /// Po puszczeniu zaznacza postacie w środku albo (gdy ich nie ma, a zaznaczeni są robotnicy) oznacza skałę do wykucia.
        /// </summary>
        Ramka? ramka;
        /// <summary>Ostatni podgląd ramki (co zostanie wykute) i klucz, dla którego go policzono.</summary>
        (string klucz, PodgladRamki podglad)? podgladRamkiPamiec;
        double pinch;
        (double x, double y)? srodekPinch;
        bool painting;
        /// <summary>Kafle już opłacone w tym pociągnięciu — ruch myszy nie może kasować krwi co klatkę.</summary>
        readonly HashSet<double> malowane = new HashSet<double>();
        Rezerwa kosztPociagniecia = new Rezerwa();
        /// <summary>Okienko logów i narzędzi (tryb deweloperski, v4 beta).</summary>
        PanelDewelopera? panelDev;
        /// <summary>Znacznik miejsca z karty wydarzenia — znika razem z kartą.</summary>
        Cel? celKarty;
        /// <summary>Gra obserwowana: kiedy partia się skończyła (czas ekranu) i kiedy ostatnio wysłano stan.</summary>
        double botKoniecOd, botStanOd;
        /// <summary>Oprawa, etap 4: czy ta partia już raz weszła w `if (sim.ending != null)` — tam odpalamy scenę śmierci.</summary>
        bool endingObsluzone;

        readonly IKontekst app;

        public EkranGry(IKontekst app)
        {
            this.app = app;
            sim = new Sim(Math.Floor(los.NextDouble() * 1e9));
            plyta.oltarz.onZdarzenie = z => app.dzwiek.rytual(z.faza, z.rodzaj != "modlitwa" && z.rodzaj != "wskrzeszenie");
            urobki.onDolot = rodzaj => { if (rodzaj == "krew") app.dzwiek.kropla(); else app.dzwiek.kruszec(rodzaj != "zelazo"); };
            // etap 4: „napraw linę” z karty postaci
            ui.naprawa = id => naprawLine(new List<double> { id });
        }

        /// <summary>Mnożnik czasu: w grze zawsze 1 (zwykły czas), w trybie deweloperskim z przycisków i okienka.</summary>
        double tempoTeraz()
        {
            if (BOT.wlaczony) return BOT.tempo;
            return ustawienia.trybDeweloperski ? Trzewia.Symulacja.Dziennik.DEV.mnoznik : 1;
        }

        /// <summary>Tryb deweloperski: następny / poprzedni mnożnik czasu z TEMPO.mnozniki.</summary>
        void zmienTempo(int o)
        {
            var M = TEMPO.mnozniki;
            var i = Array.FindIndex(M, m => m >= Trzewia.Symulacja.Dziennik.DEV.mnoznik);
            if (i < 0) i = M.Length - 1;
            Trzewia.Symulacja.Dziennik.DEV.mnoznik = M[Math.Max(0, Math.Min(M.Length - 1, i + o))];
            ui.say(Trzewia.Symulacja.Dziennik.DEV.mnoznik == 1 ? "Czas zwykły." : $"Czas ×{Js.Js.S(Trzewia.Symulacja.Dziennik.DEV.mnoznik)} (tryb deweloperski).", sim.tick);
            nasluch?.Invoke(new ZdarzenieGry { typ = "tempo" });
        }

        public override void wyjdz()
        {
            panelDev?.ustaw(false);
            // (oprawa, etap 2: zwinięta księga to stan tej walki — inne ekrany liczą płytę po staremu)
            Przyciski.KsiegaZwinieta = false;
        }

        // ------------------------------------------------------------------ życie ekranu

        /// <summary>dane: { tryb: 'nowa' | 'bot' | 'wczytaj' | 'samouczek' } (w C#: napis z trybem).</summary>
        public override void wejdz(object? dane)
        {
            pauza = false;
            straz.zeruj();
            slad = null;
            var tryb = dane as string;
            if (tryb == "nowa") nowaGra();
            else if (tryb == "bot")
            {
                // gra obserwowana: gra od razu, a obserwatorium może zacząć nową partię wiadomością
                Obserwowany.nowaGra = z => nowaGra(z ?? ziarnoPartii());
                nowaGra(ziarnoPartii());
            }
            else if (tryb == "wczytaj")
            {
                var s = Zapisy.loadFromStorage();
                if (s != null)
                {
                    sim = s; partiaKregu = Krag.Wlaczony; wstep.przerwij(); doSerca(true);
                    // zapis skończonej gry nie może otwierać zamrożonej płyty bez wyjścia
                    if (s.ending != null) { app.idz("kronika", s); return; }
                }
            }
            app.muzyka.ustawScene(tryb == "samouczek" ? "samouczek" : "gra");
            rozmiar(app.w, app.h);
        }

        /// <summary>
        /// Góry wygenerowane z wyprzedzeniem (na ekranie ładowania) — klucz to ziarno, -1 to „dowolna nowa”. Generowanie
        /// świata to najdłuższa chwila w całej grze.
        /// </summary>
        readonly Dictionary<double, Sim> zapas = new Dictionary<double, Sim>();

        /// <summary>Generuje górę teraz, żeby „Nowa gra” (albo samouczek) nie czekały.</summary>
        public void przygotuj(double? ziarno = null)
        {
            zapasTrybu();
            var klucz = ziarno ?? -1;
            if (!zapas.ContainsKey(klucz)) zapas[klucz] = new Sim(ziarno ?? Math.Floor(los.NextDouble() * 1e9));
        }

        /// <summary>Góry przygotowane w drugim trybie (inne nastawy) — do wyrzucenia.</summary>
        bool zapasKregu;
        void zapasTrybu()
        {
            if (zapasKregu == Krag.Wlaczony) return;
            zapas.Clear(); zapasKregu = Krag.Wlaczony;
        }

        /// <param name="zWstepem">Krąg Trzeci: film i scena wejścia (nie w samouczku i nie w grze obserwowanej).</param>
        public void nowaGra(double? ziarno = null, bool zWstepem = true)
        {
            // (oprawa, etap 3: bez zaległych zatrzymań, wstrząsu i cząsteczek z poprzedniej partii)
            Visual.Uderzenie.Wyczysc();
            // (oprawa, etap 4: nowa partia — bez przerywnika z poprzedniej)
            Visual.Cutscena.Nowa();
            endingObsluzone = false;
            zapasTrybu();
            partiaKregu = Krag.Wlaczony;
            var klucz = ziarno ?? -1;
            zapas.TryGetValue(klucz, out var gotowa);
            zapas.Remove(klucz);
            // przygotowana góra powstała wcześniej — rasy wracają do stanu sprzed skaz z poprzedniej partii
            if (gotowa != null && gotowa.tick == 0) Races.resetRaces();
            sim = gotowa != null && gotowa.tick == 0 ? gotowa : new Sim(ziarno ?? Math.Floor(los.NextDouble() * 1e9));
            botKoniecOd = 0;
            if (BOT.wlaczony)
            {
                BOT.partia++;
                sim.wydarzenia.gracz = true;
            }
            // Remake v2: jedna trudność — Koszmar (krew na start i reszta ustawia się w Sim)
            ui.verb = null; ui.tool = null; ui.selected = null;
            cam.zoom = KAMERA.start;
            doSerca(true);
            dirty = true;
            wstep.przerwij();
            if (Krag.Wlaczony && zWstepem && !BOT.wlaczony) wstep.zacznij();
        }

        // ------------------------------------------------------------------ kamera

        /// <summary>Wraca do najgęstszego skupiska i oddaje kamerę automatowi.</summary>
        public void doMieszkancow()
        {
            var serce = ogniskoKamery();
            recznaKamera = false;
            if (serce == null) { ui.say("Nie ma już do kogo wracać.", sim.tick); return; }
            var s = serce.Value;
            cam.x = s.x; camTarget.x = s.x;
            cam.y = s.y; camTarget.y = s.y;
            cam.zoom = Math.Max(cam.minZoom, Math.Min(KAMERA.powrotMaxZoom, Math.Min(cam.vw / (s.w + KAMERA.zapasX), cam.vh / (s.h + KAMERA.zapasY))));
            cam.clamp(sim.world.w, sim.world.h);
            ui.say("Wracasz do swoich.", sim.tick);
            nasluch?.Invoke(new ZdarzenieGry { typ = "kamera", rodzaj = "powrot" });
            dirty = true;
        }

        /// <summary>Dowozi kamerę w miejsce; `obokKarty` kładzie je po lewej, bo po prawej stoi karta samouczka.</summary>
        public void pokazMiejsce(double x, double y, double? zoom = null, bool obokKarty = false)
        {
            if (zoom is { } z && z != 0) cam.zoom = Math.Max(cam.minZoom, z);
            var odsuniecie = !obokKarty || plate.waski ? 0 : (plate.w * 0.17) / cam.zoom;
            cam.x = camTarget.x = x + odsuniecie;
            // (telefon: cel schodził poniżej środka — na komputerze bez przesunięcia)
            var telefon = plate.waski || plate.niski;
            cam.y = camTarget.y = y + (telefon ? plate.h * 0.14 / cam.zoom : 0)
                - (obokKarty && plate.waski ? plate.h * 0.12 / cam.zoom : 0);
            przejmijKamere();
            cam.clamp(sim.world.w, sim.world.h);
            dirty = true;
        }

        /// <summary>„pokaż miejsce” na karcie: kamera jedzie tam, a miejsce ląduje pod kartą (`czesc` płyty niżej; skala zostaje).</summary>
        void pokazPodKarta((double x, double y) c, double czesc)
        {
            pokazMiejsce(c.x, c.y);
            cam.y = camTarget.y = c.y - (plate.h * czesc) / cam.zoom;
            cam.clamp(sim.world.w, sim.world.h);
            dirty = true;
        }

        /// <summary>Dotknięcie strzałki celu przy krawędzi płyty wiezie kamerę na miejsce (skala zostaje).</summary>
        bool dotknijStrzalki(double x, double y)
        {
            if (cel == null) return false;
            var s = Znaczniki.strzalkaCelu(cam, cel);
            if (s == null || Math.Sqrt(Math.Pow(x - plate.x - s.Value.x, 2) + Math.Pow(y - plate.y - s.Value.y, 2)) > Math.Max(30, POLE_PALCA * 0.6)) return false;
            pokazMiejsce(cel.x, cel.y);
            dirty = true;
            return true;
        }

        /// <summary>Gracz chwyta kamerę: automat milczy, ale tylko przez chwilę (patrz krok()).</summary>
        public void przejmijKamere() { recznaKamera = true; }

        /// <summary>
        /// Gdzie patrzy kamera „za życiem”: grupa ludu, w której coś się dzieje — nie środek ramki wokół wszystkich.
        /// Kolejno: zaznaczeni, walka z bossem, potem grupa o największej wadze (ludzie i to, co robią); grupa, za którą
        /// kamera już idzie, dostaje przewagę — kamera nie skacze przy remisie.
        /// </summary>
        (double x, double y, double w, double h)? ogniskoKamery()
        {
            var lud = sim.creatures.Where(c => !c.dead && SLud.rolaPostaci(c) != null).ToList();
            if (lud.Count == 0) { var hl = sim.heartOfLife(); return hl == null ? null : (hl.x, hl.y, hl.w, hl.h); }
            (double x, double y, double w, double h) ramkaG(IReadOnlyList<Creature> g)
            {
                double x0 = double.PositiveInfinity, x1 = double.NegativeInfinity, y0 = double.PositiveInfinity, y1 = double.NegativeInfinity;
                foreach (var c in g) { x0 = Math.Min(x0, c.x); x1 = Math.Max(x1, c.x); y0 = Math.Min(y0, c.y); y1 = Math.Max(y1, c.y); }
                return ((x0 + x1) / 2, (y0 + y1) / 2 - 1, Math.Max(6, x1 - x0), Math.Max(4, y1 - y0));
            }
            // skupiska łańcuchem: sąsiad bliżej niż tyle kafli w poziomie i w pionie
            List<List<Creature>> skupiska(IReadOnlyList<Creature> kto)
            {
                var grupa = Enumerable.Range(0, kto.Count).ToArray();
                int korzen(int i) { while (grupa[i] != i) i = grupa[i] = grupa[grupa[i]]; return i; }
                for (int i = 0; i < kto.Count; i++)
                    for (int j = i + 1; j < kto.Count; j++)
                        if (Math.Abs(kto[i].x - kto[j].x) < KAMERA.grupaX && Math.Abs(kto[i].y - kto[j].y) < KAMERA.grupaY) grupa[korzen(i)] = korzen(j);
                // Map w JS trzyma kolejność wstawienia — słownik plus lista kluczy
                var m = new Dictionary<int, List<Creature>>(); var kolejnosc = new List<int>();
                for (int i = 0; i < kto.Count; i++)
                {
                    var k = korzen(i);
                    if (m.TryGetValue(k, out var g)) g.Add(kto[i]); else { m[k] = new List<Creature> { kto[i] }; kolejnosc.Add(k); }
                }
                return kolejnosc.Select(k => m[k]).ToList();
            }
            (double x, double y, double w, double h)? wybierz(List<List<Creature>> grupy, Func<List<Creature>, double> waga)
            {
                (double x, double y, double w, double h)? best = null; var bestW = double.NegativeInfinity;
                foreach (var g in grupy)
                {
                    var r = ramkaG(g);
                    var ta = Math.Abs(r.x - camTarget.x) < r.w / 2 + 8 && Math.Abs(r.y - camTarget.y) < r.h / 2 + 6;
                    var wg = waga(g) + (ta ? KAMERA.przewagaBiezacej : 0);
                    if (wg > bestW) { bestW = wg; best = r; }
                }
                return best;
            }
            // zaznaczeni: gracz właśnie nimi dowodzi
            var zazn = lud.Where(c => zaznaczeni.Contains(c.id)).ToList();
            if (zazn.Count > 0) return wybierz(skupiska(zazn), g => g.Count);
            // walka z bossem: boss i ci, którzy są przy nim — i rycerz w dłoni albo w locie po rzucie
            var boss = sim.creatures.FirstOrDefault(c => !c.dead && c.boss != null);
            if (boss != null && (sim.lud.pomnik?.faza ?? "stoi") != "stoi")
            {
                var przy = lud.Where(c => c.wDloni == true || c.lot != null || (Math.Abs(c.x - boss.x) < KAMERA.grupaX * 1.5 && Math.Abs(c.y - boss.y) < KAMERA.grupaY * 1.5));
                return ramkaG(new[] { boss }.Concat(przy).ToList());
            }
            bool dzieje(Creature c) => c.polecenie != null || c.job == Job.DIG || c.job == Job.PRAY || c.job == Job.FIGHT
                || c.job == Job.PIELGRZYM || c.job == Job.BUILD || c.job == Job.SACRIFICE;
            return wybierz(skupiska(lud), g => g.Count + g.Count(dzieje) * KAMERA.wagaCzynnosci);
        }

        void doSerca(bool natychmiast = false)
        {
            var serce = ogniskoKamery();
            if (serce == null) return;
            if (natychmiast)
            {
                cam.x = camTarget.x = serce.Value.x;
                cam.y = camTarget.y = serce.Value.y;
            }
            cam.clamp(sim.world.w, sim.world.h);
        }

        /// <summary>Ostatni rozmiar ekranu (oprawa, etap 2: zwinięcie księgi w walce przelicza płytę na nowo).</summary>
        double szerEkranu, wysEkranu;

        public override void rozmiar(double w, double h)
        {
            szerEkranu = w; wysEkranu = h;
            plate = Plyta.computePlate(w, h);
            cam.vw = plate.w; cam.vh = plate.h;
            cam.minZoom = Math.Max(KAMERA.minNaDuzymEkranie, plate.w / sim.world.w);
            if (cam.zoom < cam.minZoom) cam.zoom = cam.minZoom;
            cam.clamp(sim.world.w, sim.world.h);
            eng.resize(plate.w, plate.h);
            ui.layout(plate, w);
            dirty = true;
        }

        /// <summary>Czas staje tylko na pauzie i po zakończeniu — nigdy przez sam wybór czasownika.</summary>
        public bool zamrozone() =>
            // otwarta karta zatrzymuje świat: to moment rozmowy z jednym stworzeniem
            pauza || (BOT.wlaczony && BOT.pauza) || wstrzymane || zapiski || atlas.otwarte || sim.ending != null || ui.selected != null;

        /// <summary>Trzymany czasownik zwalnia świat do ćwierci tempa. Pełne zatrzymanie sprawiało, że gra wyglądała na martwą.</summary>
        public bool spowolnione() => ui.verb != null;

        /// <summary>Przełącza pauzę; puszczenie czasu wykonuje plan.</summary>
        public void ustawPauze(bool stoi)
        {
            if (!stoi && sim.wydarzenia.biezace != null) { ui.say("Najpierw wybierz, co zrobisz.", sim.tick); return; }
            if (!stoi) alarm = null;
            if (pauza == stoi) return;
            pauza = stoi;
            ui.say(stoi ? "Czas stoi. Planuj — rozkazy staną się, gdy go puścisz." : "Czas znów płynie.", sim.tick);
            nasluch?.Invoke(new ZdarzenieGry { typ = "pauza", stoi = stoi });
            if (!stoi) wykonajPlan();
            dirty = true;
        }

        /// <summary>
        /// Tablice atlasu odkrywa się, grając: rasę — gdy pierwszy raz stanie w kadrze, ryt — gdy pierwszy raz go chwycisz,
        /// prawo góry — gdy pierwszy raz zadziała. Ważne tablice czekają w kolejce na pokazanie, drobne trafiają do atlasu po cichu.
        /// </summary>
        void odkrywaj()
        {
            var odkrycia = Odkrycia.odkrycia;
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            double right = left + cam.vw / z, bottom = top + cam.vh / z;
            // drobne tablice nie przerywają — przycisk atlasu świeci, dopóki do niego nie zajrzysz
            void cicho(string id) => odkrycia.odkryj(id, false);
            var pielgrzym = false;
            foreach (var c in sim.creatures)
            {
                if (c.dead) continue;
                if (c.job == Job.PIELGRZYM) pielgrzym = true;
                if (c.x >= left && c.x <= right && c.y >= top && c.y <= bottom) odkrycia.odkryj($"rasa-{c.race}");
            }
            if (pielgrzym) odkrycia.odkryj("pielgrzymka");
            // Remake v2: sen już nie rośnie — tablica „Przegrana” odkrywa się po trzech minutach albo przy pierwszej śmierci z głodu
            if (sim.tick > 21600 || sim.stat.zGlodu > 0) cicho("sen");
            // (etap 5: „rdzen” to tablica „Ostatnie uderzenie”, „skorupa” — „Wielki Pomnik”)
            if (sim.lud.pomnik?.faza == "kona") odkrycia.odkryj("rdzen");
            var w = sim.world;
            if (w.ever[w.idx(w.coreX, w.coreY)] != 0) odkrycia.odkryj("skorupa");
            // skorupę odkrywa się, gdy ktoś zacznie się przy niej modlić albo gdy pęknie
            if (sim.rytual.wierni >= 1 || sim.rytual.pekniecia > 0) odkrycia.odkryj("skorupa");
            // 6.11: kocioł i brama — gdy lud zobaczy komnatę z kotłem; modlitwa za innych — przy pierwszym błogosławieństwie
            if (w.komnata.x1 >= w.komnata.x0 && w.ever[w.idx(w.kociol.x, w.kociol.y)] != 0) odkrycia.odkryj("brama");
            if (sim.creatures.Any(c => !c.dead && c.blogDo != null)) cicho("modlitwaZaInnych");
            if (sim.tick > 1500) cicho("krew");
            if (sim.wiara > 15) cicho("wiara");
            // wiara to serce drogi do wygranej — jej tablica wyskakuje sama przy pierwszej modlitwie
            if (sim.prayers > 0 && sim.tick > 600) odkrycia.odkryj("oddanie");
            if (sim.tick > 7000) cicho("pamiec");
            // Remake v1: tablice ludu, weteranów, Strażników i bossa
            if (sim.tick > 600) cicho("role");
            // Alpha: tablica rozkazów — przy pierwszym zaznaczeniu (albo po minucie po cichu)
            if (zaznaczeni.Count > 0) odkrycia.odkryj("rozkazy");
            if (sim.tick > 7200) cicho("rozkazy");
            // Remake v2: bez lin — pierwszy, kto kuje sobie schody pod półkę, pokazuje nową zasadę
            if (sim.tick > 600 && sim.creatures.Any(c => !c.dead && c.drogaKopie == true)) odkrycia.odkryj("schody");
            if (sim.tick > 4000) cicho("schody");
            // Alpha, etap 3b: pierwsza wykuta ruda odkrywa tablicę kruszców
            if (sim.urobek.Count > 0 || sim.zelazo != 0 || sim.zloto != 0) odkrycia.odkryj("kruszce");
            // etap 3f: warstwy góry — gdy ktoś z ludu zejdzie pod salę (albo po cichu po minucie); zbroja — pierwsza wykuta część
            if (sim.creatures.Any(c => !c.dead && !string.IsNullOrEmpty(c.rola) && c.y > w.salaStart.y + 6)) odkrycia.odkryj("warstwy");
            if (sim.tick > 7200) cicho("warstwy");
            if (sim.zbroja.Count > 0) odkrycia.odkryj("zbroja");
            // etap 3c: pierwszy plan — tablica pomieszczeń; gotowy warsztat, kuźnia, sypialnia — ich tablice
            if (szablon != null || sim.pomieszczenia.Count > 0) odkrycia.odkryj("pomieszczenia");
            foreach (var pom in sim.pomieszczenia) if (pom.gotowe && (pom.rodzaj == "warsztat" || pom.rodzaj == "kuznia" || pom.rodzaj == "sypialnia")) odkrycia.odkryj(pom.rodzaj);
            // etap 3d: ołtarz — gdy ktoś go zobaczy (albo po cichu po chwili); rytuał — jego tablica przy pierwszym odprawieniu;
            // lina — gdy pierwszy raz bierzesz szablon liny albo coś już wisi
            var o = w.oltarz;
            if (oknoOltarza) odkrycia.odkryj("oltarz");
            if (sim.tick > 1200 && w.ever[w.idx(o.x, o.y)] != 0) cicho("oltarz");
            var rt = Oltarz.rytualOltarza(sim);
            if (rt != null) odkrycia.odkryj(rt.rodzaj == "modlitwa" ? "rytual-modlitwa" : rt.rodzaj == "szal" ? "rytual-szal" : rt.rodzaj == "wskrzeszenie" ? "rytual-wskrzeszenie"
                : rt.rodzaj == "ofiaraKrwi" ? "rytual-ofiara-krwi" : "rytual-ofiara-zycia");
            if (szablon == "lina" || (sim.lud.liny ?? 0) > 0) odkrycia.odkryj("lina");
            // etap 3e: ruiny — gdy ktoś je zobaczy; zabytki — przy pierwszym odkryciu
            if (w.ruiny.Any(r => w.ever[w.idx(r.zabytek.x, r.zabytek.y)] != 0)) odkrycia.odkryj("ruiny");
            if ((sim.lud.zabytki?.stan?.Count ?? 0) > 0) odkrycia.odkryj("zabytki");
            if (sim.tick > LUD.weteranPo) odkrycia.odkryj("weterani");
            if (sim.lud.straznicy?.trwa == true) odkrycia.odkryj("straznicy");
            if (sim.lud.dlon?.widziana == true) odkrycia.odkryj("dlon");
            // etap 4: przecięta lina wiadra i dłoń anielska — przy pierwszym razie
            if (sim.lud.wiadra?.przecieta != null || (sim.lud.wiadra?.ciec ?? 0) > 0) odkrycia.odkryj("lina-wiadra");
            if (sim.lud.aniol?.widziana == true) odkrycia.odkryj("dlon-anielska");
            // etap 5b: dłoń z otchłani pomaga demonowi — tablica każdej akcji, gdy ją pierwszy raz zrobi
            var dd = sim.lud.dlonDemona;
            if (dd != null) foreach (var a in new[] { "rzut", "tarcza", "zawal" }) if ((a == "rzut" ? dd.ile.rzut : a == "tarcza" ? dd.ile.tarcza : dd.ile.zawal) > 0) odkrycia.odkryj($"dlon-{a}");
            // Remake v2: wiadro, hełmy, trupy
            if ((sim.lud.wiadra?.lista ?? new List<WiadroJedzenia>()).Any(wd => wd.faza == "stoi")) cicho("wiadro");
            if (sim.lud.helmy == true) odkrycia.odkryj("helmy");
            if ((sim.lud.trupy?.Count ?? 0) > 0) cicho("trupy");
            if (sim.creatures.Any(c => !c.dead && c.boss != null)) odkrycia.odkryj("boss");
            if (ui.verb != null) cicho($"ryt-{ui.verb}");
            if (pauza) cicho("pauza");
            // pismo w skale: kiedy czas stoi, a znaki świecą — albo gdy ktoś długo na nie patrzy
            if (znakowWidac >= 2 && (pauza || sim.tick > 6000)) cicho("pismo");
        }

        /// <summary>Karta wydarzenia: czas staje, kamera jedzie na miejsce (tylko z ustawieniem albo w samouczku), dzwon. Czeka na wybór.</summary>
        void podniesWydarzenie(Wydarzenie e)
        {
            pokazaneWydarzenie = e;
            alarm = null;
            pauza = true;
            nasluch?.Invoke(new ZdarzenieGry { typ = "pauza", stoi = true });
            ui.selected = null;
            ui.verb = null; ui.tool = null;
            painting = false;
            if (e.cel != null)
            {
                // kamera zostaje tam, gdzie ją zostawiłeś — miejsce jest tylko zaznaczone (poza kadrem: strzałka przy
                // krawędzi, dotknięcie jej wiezie kamerę). Sama jedzie tylko z ustawieniem „Kamera do wydarzeń” i w samouczku.
                if (ustawienia.kameraDoWydarzen || nasluch != null)
                {
                    pokazMiejsce(e.cel.x, e.cel.y, Math.Max(cam.zoom, KAMERA.pokazZoom));
                    // karta stoi u góry płyty — miejsce, o którym mówi, ląduje pod nią
                    cam.y = camTarget.y = e.cel.y - (plate.h * 0.25) / cam.zoom;
                    cam.clamp(sim.world.w, sim.world.h);
                }
                cel = celKarty = new Cel { x = e.cel.x, y = e.cel.y, r = 5, tekst = e.cel.tekst };
            }
            Odkrycia.odkrycia.odkryj("wydarzenia", false);
            if (ustawienia.efekty) app.gesty.alarm(true);
            else app.dzwiek.toll();
            dirty = true;
        }

        /// <summary>Wybór na karcie wydarzenia.</summary>
        void wybierzWydarzenie(int i)
        {
            var e = sim.wydarzenia.biezace;
            if (e == null) return;
            var powod = Wydarzenia.rozstrzygnij(sim, i);
            if (powod != null) { ui.say(powod, sim.tick); app.gesty.odmowa(); return; }
            nasluch?.Invoke(new ZdarzenieGry { typ = "wydarzenie", rodzaj = e.rodzaj, wybor = e.wybory[i].id });
            pokazaneWydarzenie = null;
            polaWydarzenia = new List<PoleWyboru>();
            ustawPauze(false);
            dirty = true;
        }

        void podniesAlarm(Alarm a)
        {
            alarm = a;
            pauza = true;
            nasluch?.Invoke(new ZdarzenieGry { typ = "pauza", stoi = true });
            ui.selected = null;
            if (a.cel is { } c)
            {
                // jak przy karcie wydarzenia: miejsce zaznaczone, kamera stoi (chyba że „Kamera do wydarzeń”)
                if (ustawienia.kameraDoWydarzen)
                {
                    pokazMiejsce(c.x, c.y, Math.Max(cam.zoom, KAMERA.pokazZoom));
                    // karta sytuacji stoi u góry płyty — miejsce, o którym mówi, ląduje pod nią
                    cam.y = camTarget.y = c.y - (plate.h * 0.2) / cam.zoom;
                    cam.clamp(sim.world.w, sim.world.h);
                }
                cel = new Cel { x = c.x, y = c.y, r = 5, tekst = c.tekst };
                radaOd = Wydajnosc.Teraz();             // podpowiedź nie nadpisze celu alarmu od razu
            }
            if (ustawienia.efekty) app.gesty.alarm(a.kryzys);
            else app.dzwiek.toll();
            dirty = true;
        }

        void wykonajPlan()
        {
            if (rozkazy.ile == 0) return;
            var wyniki = rozkazy.wykonaj(sim);
            var udanych = 0;
            foreach (var w in wyniki)
            {
                if (!w.udane) continue;
                udanych++;
                var o = w.rozkaz;
                if (o.czasownik == "szept") nasluch?.Invoke(new ZdarzenieGry { typ = "szept", narzedzie = o.narzedzie });
                else nasluch?.Invoke(new ZdarzenieGry { typ = "moc", czasownik = o.czasownik, narzedzie = o.narzedzie, zPlanu = true });
            }
            if (wyniki.Any(w => w.udane && w.rozkaz.czasownik == "znak")) app.dzwiek.toll();
            var nieudane = wyniki.Count - udanych;
            app.gesty.wykonanie(udanych, nieudane);
            ui.say(nieudane > 0 ? $"Stało się {udanych} z {wyniki.Count} — świat zdążył się zmienić." : "Twoja wola stała się ciałem.", sim.tick);
            dirty = true;
        }
    }
}
