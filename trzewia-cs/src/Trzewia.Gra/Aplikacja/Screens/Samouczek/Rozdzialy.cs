// Port: alpha-1/src/app/screens/samouczek/rozdzialy.ts — TREŚĆ SAMOUCZKA.
// Krótkie rozdziały (Alpha: lud, wiadra, ryty, pauza, wydarzenia, bez lin, ciemność, Strażnicy Snu, droga do wolności):
// tytuł, wstęp, czynności do odhaczenia (z palcem, który wskazuje, w co kliknąć) i zdanie na koniec. Logika karty,
// palca i przechodzenia między rozdziałami jest w EkranSamouczka.cs.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyWiadro;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Nastawy.NastawyMoce;
using static Trzewia.Nastawy.NastawyPomieszczenia;
using static Trzewia.Nastawy.NastawyOltarz;
using JS = Trzewia.Js.Js;

namespace Trzewia.Aplikacja
{
    /// <summary>Na co samouczek wskazuje palcem: punkt na ekranie (ryt, słowo, przycisk), obszar (organ w ramie) albo miejsce na płycie.</summary>
    public sealed class Wskazanie
    {
        /// <summary>'punkt' | 'obszar' | 'swiat'</summary>
        public string typ = "punkt";
        public double x, y, r;
        public Obszar o;
        public Cel? cel;
        public static Wskazanie Punkt(double x, double y, double r) => new Wskazanie { typ = "punkt", x = x, y = y, r = r };
        public static Wskazanie ObszarW(Obszar o) => new Wskazanie { typ = "obszar", o = o };
        public static Wskazanie Swiat(Cel c) => new Wskazanie { typ = "swiat", cel = c };
    }

    public sealed class EtapSamouczka
    {
        /// <summary>Polecenie: jedno krótkie zdanie.</summary>
        public Func<EkranSamouczka, string> tekst = _ => "";
        /// <summary>Skrót: akcja z klawiszologii albo gotowy napis („kółko myszy").</summary>
        public Func<EkranSamouczka, string>? klawisz;
        public Func<EkranSamouczka, Wskazanie?>? wskaz;
        /// <summary>'przeciagnij' | 'kolko'</summary>
        public string? gest;
        /// <summary>Czy etap jest spełniony — stan gry albo zdarzenie.</summary>
        public Func<EkranGry, ZdarzenieGry?, EkranSamouczka, bool>? gotowe;
        /// <summary>Etap wyboru (ryt, słowo): odznaczenie cofa do niego.</summary>
        public bool cofa;
        /// <summary>Etap opisowy — kończy go „Rozumiem".</summary>
        public bool rozumiem;
        /// <summary>Przy wejściu w etap.</summary>
        public Action<EkranGry, EkranSamouczka>? wejdz;
        /// <summary>Alpha 1: etap tylko na komputerze (księga, okno postaci) albo tylko na telefonie (ryty).</summary>
        public string? tylko;
    }

    public sealed class Rozdzial
    {
        public string tytul = "";
        /// <summary>Po co — jedno, dwa zdania.</summary>
        public string wstep = "";
        public List<EtapSamouczka> etapy = new List<EtapSamouczka>();
        /// <summary>Co się właśnie stało.</summary>
        public Func<EkranSamouczka, string> koniec = _ => "";
        public string[]? czasowniki;
        /// <summary>Świat stoi przez cały rozdział — gdy trzeba trafić w konkretne stworzenie.</summary>
        public bool stopCzasu;
        public Action<EkranGry, EkranSamouczka>? przygotuj;
        public Rozdzial Kopia(List<EtapSamouczka> etapy) => new Rozdzial { tytul = tytul, wstep = wstep, etapy = etapy, koniec = koniec, czasowniki = czasowniki, stopCzasu = stopCzasu, przygotuj = przygotuj };
    }

    public static class Rozdzialy
    {
        static string S(double x) => JS.S(x);
        /// <summary>`${x}` dla pola, którego może nie być (TS: undefined).</summary>
        static string S(double? x) => x.HasValue ? JS.S(x.Value) : "undefined";
        static double round(double x) => Math.Floor(x + 0.5);
        static Func<EkranSamouczka, string> T(string t) => _ => t;

        /// <summary>Samouczek pomieszczeń: pierwsze miejsce w skale obok sali, gdzie wolno położyć warsztat (dolny rząd wnętrza).</summary>
        static (double x, double y)? miejsceNaWarsztat(Sim sim)
        {
            var s = sim.world.salaStart;
            for (var dx = 0; dx < 40; dx++) foreach (var k in new[] { 1, -1 }) foreach (var dy in new[] { 0, -1, 1 })
                    {
                        double x = s.x + k * dx, y = s.y + dy;
                        var p = Pomieszczenia.probaPlanu(sim, "warsztat", x, y);
                        // w litej skale (najwyżej kolumna wejścia już pusta) — nie pod sklepieniem sali
                        var litych = p.kafle.Count(i => sim.world.solid(i % sim.world.w, JS.ToInt32(i / sim.world.w)));
                        if (p.ok && litych >= p.kafle.Count - p.h) return (x, y);
                    }
            return null;
        }

        /// <summary>Próg pielgrzymki w procentach — samouczek mówi tę samą liczbę, co dłonie oddania.</summary>
        static string PROG => $"{S(round(PIELGRZYMKA.oddanieNacji * 100))}%";

        static Wskazanie? polePunkt(Obszar? p, bool max = true, double plus = 4) =>
            p is { } q ? Wskazanie.Punkt(q.x + q.w / 2, q.y + q.h / 2, (max ? Math.Max(q.w, q.h) : Math.Min(q.w, q.h)) / 2 + plus) : null;

        /// <summary>Zasoby: na komputerze prawa karta księgi (Alpha 1), na telefonie pasek nad płytą.</summary>
        static Obszar obszarZasobow(Plate p, double vh)
        {
            if (!p.waski && !p.niski) return Przyciski.ukladKsiegi(Przyciski.ukladDolu(p, vh)).prawa;
            return new Obszar { x = p.x + (p.niski ? 0 : p.w * 0.1), y = p.y - p.top * 0.85, w = p.niski ? p.w * 0.6 : p.w * 0.8, h = p.top * 0.75 };
        }

        static Wskazanie zaznaczPoboznych(EkranSamouczka s) => polePunkt(s.gra.miejscePolaDruzyny("rola", "pobozny"))!;

        static List<Rozdzial>? rozdzialyAlfa, rozdzialyKregu, rozdzialyKreguZmian;
        /// <summary>
        /// Rozdziały bieżącego trybu — teksty Kręgu Trzeciego (mnisi, grabarze, Cienie Żarłoków) liczą się osobno; Krąg ze
        /// zmianami po porcie (ZmianyKregu: bez Cieni Żarłoków) — też osobno.
        /// </summary>
        public static List<Rozdzial> ROZDZIALY => !Krag.Wlaczony ? rozdzialyAlfa ??= zbuduj()
            : ZmianyKregu.Aktywne ? rozdzialyKreguZmian ??= zbuduj() : rozdzialyKregu ??= zbuduj();

        static List<Rozdzial> zbuduj() => new List<Rozdzial>
        {
            new Rozdzial
            {
                tytul = "Rozejrzyj się",
                wstep = "Jesteś górą. W twoich korytarzach mieszka jeden lud — Pobożni. To na nich patrzysz.",
                // mieszkańcy obok karty, nie pod nią
                przygotuj = (g, s) => { var d = s.gniazdoGoblinow(); if (d != null) g.pokazMiejsce(d.Value.x, d.Value.y, 14, true); },
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T("Przeciągnij płytę palcem (myszą — prawym przyciskiem), żeby się rozejrzeć."), klawisz = T("palcem albo prawym przyciskiem"), gest = "przeciagnij",
                        gotowe = (g, z, s) => z?.typ == "kamera" && Math.Sqrt(Math.Pow(g.cam.x - s.kamStart.x, 2) + Math.Pow(g.cam.y - s.kamStart.y, 2)) > 3,
                    },
                    new EtapSamouczka
                    {
                        tekst = T("Przybliż i oddal widok."), klawisz = T("rozsuń albo zsuń dwa palce"), gest = "kolko",
                        gotowe = (g, z, s) => z?.typ == "kamera" && z.rodzaj == "zoom" && Math.Abs(Math.Log(g.cam.zoom / s.kamStart.zoom)) > 0.25,
                    },
                    new EtapSamouczka
                    {
                        tekst = T("Dotknij oka pod płytą — kamera wróci do mieszkańców."), klawisz = T("kamera"),
                        wskaz = s => s.przycisk("kamera"),
                        gotowe = (_g, z, _s) => z?.typ == "kamera" && z.rodzaj == "powrot",
                    },
                },
                koniec = T(Krag.T("To Pobożni — pobożni, robotnicy i rycerze. Mieszkają przy siedzibie; jej znak stoi nad nimi.", "To Pobożni — mnisi, grabarze i rycerze. Mieszkają przy siedzibie; jej znak stoi nad nimi.")),
                czasowniki = new string[0],
            },
            new Rozdzial
            {
                tytul = "Czym płacisz",
                wstep = "Na prawej karcie księgi pod płytą (na telefonie — nad płytą) stoją twoje zasoby. To wszystko, co musisz śledzić.",
                przygotuj = (g, _s) => { g.sim.krew += 60; g.sim.wiara += 40; },
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Wiara rośnie, gdy pobożni się modlą. Krew płynie z każdej śmierci i z ofiar — na Koszmarze jest jej mało. Jedzenie to porcje w wiadrze, które zjeżdża z góry do sali. Wiarę i krew wydajesz na ryty i wybory na kartach.", "Wiara rośnie, gdy mnisi się modlą. Krew płynie z każdej śmierci i z ofiar — na Koszmarze jest jej mało. Jedzenie to porcje w wiadrze, które zjeżdża z góry do sali. Wiarę i krew wydajesz na ryty i wybory na kartach.")),
                        rozumiem = true, wskaz = s => Wskazanie.ObszarW(obszarZasobow(s.gra.plate, s.vh)),
                    },
                    new EtapSamouczka
                    {
                        tekst = _ => Krag.T($"Oddanie: jak mocno lud w ciebie wierzy. Złożone dłonie napełniają się złotem — od kreski ({PROG}) pobożni sami idą pod twój rdzeń.", $"Oddanie: jak mocno lud w ciebie wierzy. Złożone dłonie napełniają się złotem — od kreski ({PROG}) mnisi sami idą pod twój rdzeń."),
                        rozumiem = true, wskaz = s => Wskazanie.ObszarW(Plyta.obszarOddania(s.gra.plate, s.vh)),
                    },
                },
                koniec = T("Gdy na coś cię nie stać, możliwość w oknie postaci przygasa, a wybór na karcie ma cenę na czerwono."),
                czasowniki = new string[0],
            },
            new Rozdzial
            {
                tytul = "Lud i jego role",
                wstep = Krag.T($"Twój lud to stała drużyna: {S(LUD.start.robotnik)} robotników, {S(LUD.start.pobozny)} pobożnych i {S(LUD.start.rycerz)} rycerz. Nikt się nie rodzi i nikt nowy nie przyjdzie.", $"Twoi potępieni to stała drużyna: {S(LUD.start.robotnik)} grabarzy, {S(LUD.start.pobozny)} mnichów i {S(LUD.start.rycerz)} rycerz. Nikt się nie rodzi i nikt nowy nie przyjdzie."),
                czasowniki = new string[0],
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Pobożni modlą się i kruszą skorupę rdzenia. Robotnicy kopią drogę i donoszą jedzenie z wiadra. Rycerz broni i walczy ze Strażnikami Snu — a gdy zginie, robotnicy zakładają hełmy i walczą sami.", "Pobożni modlą się i kruszą skorupę rdzenia. Grabarze kopią drogę i donoszą jedzenie z wiadra. Rycerz broni i walczy ze Strażnikami Snu — a gdy zginie, grabarze zakładają hełmy i walczą sami.")),
                        rozumiem = true, wskaz = s => Wskazanie.ObszarW(Plyta.obszarSpisu(s.gra.plate, s.vh)),
                    },
                    new EtapSamouczka
                    {
                        tekst = T($"Kto przeżyje {S(round(LUD.weteranPo / 7200))} minuty, najedzony, a lud wierzy — zostaje weteranem: +{S(round((LUD.weteranPremia - 1) * 100))}% do wszystkiego i jasna aureola."),
                        rozumiem = true,
                    },
                },
                koniec = T("Każda postać ma swój zamiar — dotknij jej, a jej okno powie, co robi i co może."),
            },
            new Rozdzial
            {
                tytul = "Pomieszczenia",
                wstep = Krag.T("W skale możesz wyznaczyć pomieszczenia: sypialnię, warsztat, kuźnię, korytarz i szyb — kują je robotnicy, którym plan wskażesz. Linę wieszasz sam, od razu.", "W skale możesz wyznaczyć pomieszczenia: sypialnię, warsztat, kuźnię, korytarz i szyb — kują je grabarze, którym plan wskażesz. Linę wieszasz sam, od razu."),
                czasowniki = new string[0],
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = s => s.gra.plate.waski || s.gra.plate.niski ? "Dotknij „wyznacz pomieszczenie” pod płytą." : "Dotknij płyty „Budowa” obok księgi.", klawisz = T("planuj"),
                        wskaz = s => polePunkt(s.gra.miejscePolaDruzyny("pomieszczenia")),
                        gotowe = (g, _z, _s) => g.szablon != null || g.menuBudowy,
                    },
                    new EtapSamouczka
                    {
                        tekst = T("Pod palcem masz plan warsztatu. Dotknij skały obok sali — tam, gdzie obrys świeci jasno."),
                        wejdz = (g, _s) => g.ustawSzablon("warsztat"),
                        wskaz = s => { var m = miejsceNaWarsztat(s.gra.sim); return m is { } q ? Wskazanie.Swiat(new Cel { x = q.x + 0.5, y = q.y - 0.5, r = 3, tekst = "tutaj" }) : null; },
                        gotowe = (_g, z, _s) => z?.typ == "plan",
                    },
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Zaznacz robotników (ich miniatura w księdze albo A) i dotknij planu — wykują go.", "Zaznacz grabarzy (ich miniatura w księdze albo A) i dotknij planu — wykują go.")), klawisz = T("robotnicy"),
                        wejdz = (g, _s) => g.ustawSzablon(null),
                        gotowe = (_g, z, _s) => z?.typ == "polecenie" && z.rodzaj == "pomieszczenie" && z.przyjeli > 0,
                    },
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T($"Gotowy warsztat zamienia złoto w wiarę ({S(POMIESZCZENIA.warsztat.zlotoNaSztuke)} złota — {S(POMIESZCZENIA.warsztat.wiaraZaSztuke)} wiary), kuźnia — żelazo w zbroję rycerza (rycerz sam ją zakłada, gdy nie ma fali), a sen w sypialni zdejmuje osłabienia. Wolni robotnicy sami nic nie biorą: pracują ci, którym wskażesz.", $"Gotowy warsztat zamienia złoto w wiarę ({S(POMIESZCZENIA.warsztat.zlotoNaSztuke)} złota — {S(POMIESZCZENIA.warsztat.wiaraZaSztuke)} wiary), kuźnia — żelazo w zbroję rycerza (rycerz sam ją zakłada, gdy nie ma fali), a sen w sypialni zdejmuje osłabienia. Wolni grabarze sami nic nie biorą: pracują ci, którym wskażesz.")),
                        rozumiem = true,
                    },
                },
                koniec = T("Korytarz i szyb ciągniesz palcem od miejsca, gdzie stoi lud — szyb schodzi prostymi schodami, więc da się nim wrócić. Linę wieszasz, wskazując skałę, której się uczepi (krawędź półki, strop) — spada z haka do podłogi; pięć pierwszych jest za darmo, potem kosztują krew."),
            },
            new Rozdzial
            {
                tytul = "Ołtarz",
                wstep = Krag.T("Na środku sali, w smudze światła z góry, stoi ołtarz. Przy nim pobożny odprawia rytuały — płacisz za nie krwią.", "Na środku sali, w smudze światła z góry, stoi ołtarz. Przy nim mnich odprawia rytuały — płacisz za nie krwią."),
                przygotuj = (g, _s) => { g.sim.krew = Math.Max(g.sim.krew, 60); },
                czasowniki = new string[0],
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Zaznacz pobożnych — ich miniatura w księdze pod płytą albo S.", "Zaznacz mnichów — ich miniatura w księdze pod płytą albo S.")), klawisz = T("pobozni"),
                        wskaz = s => zaznaczPoboznych(s),
                        gotowe = (g, _z, _s) => g.zaznaczeniRoli("pobozny") > 0,
                    },
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Dotknij ołtarza — pobożny pójdzie do niego, a otworzy się okno rytuałów.", "Dotknij ołtarza — mnich pójdzie do niego, a otworzy się okno rytuałów.")),
                        wskaz = s => { var o = s.gra.sim.world.oltarz; return Wskazanie.Swiat(new Cel { x = o.x + 0.5, y = o.y - 1.5, r = 3, tekst = "ołtarz" }); },
                        gotowe = (_g, z, _s) => z?.typ == "oltarz" && z.rodzaj == "okno",
                    },
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T($"Gdy pobożny stanie przy ołtarzu, wybierz „Modlitwa” ({S(OLTARZ.rytualy.modlitwa.krew)} krwi) — od krzyża biją promienie, a wiara rośnie.", $"Gdy mnich stanie przy ołtarzu, wybierz „Modlitwa” ({S(OLTARZ.rytualy.modlitwa.krew)} krwi) — od krzyża biją promienie, a wiara rośnie.")),
                        wskaz = s => { var p = s.gra.poleOltarza("modlitwa"); return p != null ? Wskazanie.Punkt(p.x + p.w / 2, p.y + p.h / 2, Math.Min(p.w, p.h) / 2 + 4) : null; },
                        gotowe = (_g, z, _s) => z?.typ == "oltarz" && z.rodzaj == "modlitwa",
                    },
                    new EtapSamouczka
                    {
                        tekst = T($"Szał krwi rozpala rycerza na minutę. Wskrzeszenie przywraca poległego, którego ciało jeszcze leży ({S(OLTARZ.rytualy.wskrzeszenie.krew)} krwi). Ofiara krwi i ofiara życia dają krew — tylko tutaj, nie w szeptach."),
                        rozumiem = true,
                    },
                },
                koniec = T(Krag.T("Ołtarz i każdy rytuał mają swoją tablicę w atlasie. Rytuał przepada, gdy pobożny odejdzie od ołtarza — krew wtedy wraca.", "Ołtarz i każdy rytuał mają swoją tablicę w atlasie. Rytuał przepada, gdy mnich odejdzie od ołtarza — krew wtedy wraca.")),
            },
            new Rozdzial
            {
                tytul = "Jedzenie z góry",
                wstep = "Grzyba ani spiżarni nie ma. Jedzenie zjeżdża z góry w jednym wiadrze, na linie, zawsze tym samym szybem.",
                przygotuj = (g, s) => { g.sim.krew += 60; if (s.najblizszeWiadro() == null) Wiadro.wiadroTeraz(g.sim); },
                czasowniki = new[] { "zasiej" },
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T($"Co {S(round(WIADRO.co / 120))} s z góry zjeżdża wiadro pełne jedzenia — węższym otworem do sali, na dno kolumny pod nim. Kto wykopie pod wiadrem dziurę, sprowadzi je niżej. Do tych w głębi samo nie zjedzie — zaniosą im robotnicy, a kto zszedł drogą wiernych, wróci nią po linach na zakrętach. Kto umiera z głodu, a wiadro jeszcze jedzie, wspina się po linie i je w drodze w dół.", $"Co {S(round(WIADRO.co / 120))} s z góry zjeżdża wiadro pełne jedzenia — węższym otworem do sali, na dno kolumny pod nim. Kto wykopie pod wiadrem dziurę, sprowadzi je niżej. Do tych w głębi samo nie zjedzie — zaniosą im grabarze, a kto zszedł drogą wiernych, wróci nią po linach na zakrętach. Kto umiera z głodu, a wiadro jeszcze jedzie, wspina się po linie i je w drodze w dół.")),
                        rozumiem = true,
                        wskaz = s => { var c = s.najblizszeWiadro(); return c != null ? Wskazanie.Swiat(c) : null; },
                    },
                    new EtapSamouczka
                    {
                        tekst = T("Gdy jedzenia nie starcza, dosyp: dotknij czerwonej pieczęci „+” przy jedzeniu w księdze — jedzenie zjedzie szybem, do tego samego wiadra."),
                        klawisz = T("zasiej"), tylko = "komputer",
                        wskaz = s => { var p = s.gra.miejscePolaKsiegi("nakarm"); return p != null ? Wskazanie.Punkt(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 + 6) : null; },
                        gotowe = (_g, z, _s) => z?.typ == "moc" && z.czasownik == "zasiej",
                    },
                    new EtapSamouczka
                    {
                        tekst = T("Gdy jedzenia nie starcza, dosyp. Wybierz ryt „Nakarm” po lewej."), klawisz = T("zasiej"), cofa = true, tylko = "telefon",
                        wskaz = s => s.ryt("zasiej"), gotowe = (g, _z, _s) => g.ui.verb == "zasiej",
                    },
                    new EtapSamouczka
                    {
                        tylko = "telefon",
                        tekst = T("Dotknij płyty — jedzenie zjedzie szybem, do tego samego wiadra."),
                        wskaz = s => { var c = s.miejsceNaGrzyb(); return c != null ? Wskazanie.Swiat(c) : null; },
                        gotowe = (_g, z, _s) => z?.typ == "moc" && z.czasownik == "zasiej",
                    },
                },
                koniec = T($"Z góry zjeżdża {S(WIADRO.nakarmPorcji)} porcji więcej za {S(KOSZTY["zasiej"].grzyb.krew)} krwi. Liczba „jedzenie” w księdze to porcje w wiadrze."),
            },
            new Rozdzial
            {
                tytul = "Zrób cud",
                wstep = Krag.T("Cud sprowadza pobożny: światło spada z góry tuż przy nim. Widzą go wszyscy dookoła — i ich wiara w ciebie rośnie.", "Cud sprowadza mnich: światło spada z góry tuż przy nim. Widzą go wszyscy dookoła — i ich wiara w ciebie rośnie."),
                przygotuj = (g, _s) => { g.sim.wiara += 60; },
                czasowniki = new[] { "znak" },
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Zaznacz pobożnego — dotknij go albo jego miniatury w księdze.", "Zaznacz mnicha — dotknij go albo jego miniatury w księdze.")), klawisz = T("pobozni"), tylko = "komputer",
                        wskaz = s => zaznaczPoboznych(s),
                        gotowe = (g, _z, _s) => g.zaznaczeniRoli("pobozny") > 0,
                    },
                    new EtapSamouczka
                    {
                        tekst = T("W jego oknie wybierz „Cud”."), klawisz = T("znak"), tylko = "komputer",
                        wskaz = s => { var p = s.gra.poleOkna("cud"); return p != null ? Wskazanie.Punkt(p.x + p.h * 0.5, p.y + p.h / 2, p.h * 0.75) : null; },
                        gotowe = (_g, z, _s) => z?.typ == "moc" && z.czasownik == "znak",
                    },
                    new EtapSamouczka
                    {
                        tekst = T("Wybierz ryt „Cud”."), klawisz = T("znak"), cofa = true, tylko = "telefon",
                        wskaz = s => s.ryt("znak"), gotowe = (g, _z, _s) => g.ui.verb == "znak",
                    },
                    new EtapSamouczka
                    {
                        tylko = "telefon",
                        tekst = T("Dotknij płyty przy siedzibie."),
                        wskaz = s => { var d = s.gniazdoGoblinow(); return d is { } q ? Wskazanie.Swiat(new Cel { x = q.x, y = q.y, r = 4, tekst = "dotknij tutaj" }) : null; },
                        gotowe = (_g, z, _s) => z?.typ == "moc" && z.czasownik == "znak",
                    },
                },
                koniec = _ => Krag.T($"Oddanie Pobożnych skoczyło w górę — zobacz złożone dłonie. Przy {PROG} sami pójdą pod twój rdzeń. Światło Cudu przegania też to, co patrzy z ciemności.", $"Oddanie Mnichów skoczyło w górę — zobacz złożone dłonie. Przy {PROG} sami pójdą pod twój rdzeń. Światło Cudu przegania też to, co patrzy z ciemności."),
            },
            new Rozdzial
            {
                tytul = "Poślij wiernego",
                wstep = Krag.T("Szept dotyka jednej głowy. „Módl się” posyła pobożnego pod twój rdzeń — od razu.", "Szept dotyka jednej głowy. „Módl się” posyła mnicha pod twój rdzeń — od razu."),
                przygotuj = (g, _s) => { g.sim.wiara += 40; },
                czasowniki = new[] { "szept" },
                stopCzasu = true,
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Zaznacz pobożnego — dotknij go albo jego miniatury w księdze.", "Zaznacz mnicha — dotknij go albo jego miniatury w księdze.")), klawisz = T("pobozni"), tylko = "komputer",
                        wskaz = s => zaznaczPoboznych(s),
                        gotowe = (g, _z, _s) => g.zaznaczeniRoli("pobozny") > 0,
                    },
                    new EtapSamouczka
                    {
                        tekst = T("W jego oknie wybierz „Módl się”."), klawisz = T("szept"), tylko = "komputer",
                        wskaz = s => { var p = s.gra.poleOkna("modl"); return p != null ? Wskazanie.Punkt(p.x + p.h * 0.5, p.y + p.h / 2, p.h * 0.75) : null; },
                        gotowe = (_g, z, _s) => z?.typ == "szept" && z.narzedzie == "modl",
                    },
                    new EtapSamouczka
                    {
                        tekst = T("Wybierz ryt „Szepnij”."), klawisz = T("szept"), cofa = true, tylko = "telefon",
                        wskaz = s => s.ryt("szept"), gotowe = (g, _z, _s) => g.ui.verb == "szept",
                    },
                    new EtapSamouczka
                    {
                        tylko = "telefon",
                        tekst = T(Krag.T("Dotknij zaznaczonego pobożnego.", "Dotknij zaznaczonego mnicha.")), cofa = true,
                        wskaz = s => { var c = s.wskazanyGoblin("dotknij go", "pobozny"); return c != null ? Wskazanie.Swiat(c) : null; },
                        gotowe = (g, _z, _s) => g.ui.verb == "szept" && g.ui.selected != null && !g.ui.selected.dead,
                    },
                    new EtapSamouczka
                    {
                        tylko = "telefon",
                        tekst = T("Na jego karcie wybierz „módl się”."),
                        wskaz = s => s.slowo("thought", "modl"),
                        gotowe = (_g, z, _s) => z?.typ == "szept" && z.narzedzie == "modl",
                    },
                },
                koniec = T("Idzie pod twój rdzeń. Gdy się tam pomodli, skorupa zacznie pękać. Krew dają ofiary przy ołtarzu — nie szepty."),
            },
            new Rozdzial
            {
                tytul = "Zatrzymaj czas",
                wstep = "Czas możesz zatrzymać. Przy kryzysach gra staje sama.",
                czasowniki = new string[0],
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = s => s.gra.plate.waski || s.gra.plate.niski ? "Dotknij klepsydry pod płytą." : "Naciśnij spację — czas stanie, a rama płyty zapłonie złotem.", klawisz = T("pauza"),
                        wskaz = s => s.przycisk("pauza"),
                        gotowe = (_g, z, _s) => z?.typ == "pauza" && z.stoi,
                    },
                    new EtapSamouczka
                    {
                        tekst = T("W pauzie wiadro i Cud rysują się jako szkice — dzieją się naraz, gdy puścisz czas. Puść czas (znów spacja)."), klawisz = T("pauza"),
                        wskaz = s => s.przycisk("pauza"),
                        gotowe = (_g, z, _s) => z?.typ == "pauza" && !z.stoi,
                    },
                },
                koniec = T("Zatrzymuj świat, gdy musisz trafić — i przy każdym kryzysie."),
            },
            new Rozdzial
            {
                tytul = "Wydarzenia",
                wstep = "Co chwilę coś się dzieje: zaraza, głód, zgniłe jedzenie, zawał nad drogą wiernych. Czas wtedy staje, a ty wybierasz.",
                czasowniki = new string[0],
                przygotuj = (g, _s) => { g.sim.krew += 40; g.sim.wiara += 40; },
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T("Za chwilę pokaże się karta. Przeczytaj ją i dotknij jednego z wyborów."),
                        wejdz = (g, _s) => { g.sim.wydarzenia.gracz = true; if (Wydarzenia.wylosuj(g.sim, "plony") == null) Wydarzenia.wylosuj(g.sim, "znak"); },
                        gotowe = (_g, z, _s) => z?.typ == "wydarzenie",
                    },
                },
                koniec = T("Każdy wybór ma cenę i skutek, napisane wprost."),
            },
            new Rozdzial
            {
                tytul = "Bez lin",
                wstep = "To Koszmar. Góra nie czeka na tych, którzy zostają z tyłu.",
                czasowniki = new string[0],
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T("Lud nie ma lin: w górę wchodzi najwyżej o jeden stopień, a wyżej musi wykuć sobie schody. W dół zsuwa się szybem albo zeskakuje z niewysokiej półki — zejść łatwo, wrócić długo."),
                        rozumiem = true,
                    },
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Gdy zginie rycerz, robotnicy zakładają hełmy i walczą zamiast niego. A kto umrze, nie znika — jego ciało leży tam, gdzie padł.", "Gdy zginie rycerz, grabarze zakładają hełmy i walczą zamiast niego. A kto umrze, nie znika — jego ciało leży tam, gdzie padł.")),
                        rozumiem = true,
                    },
                },
                koniec = T("Trupy mówią, gdzie lud ginie — tam spuść wiadro albo poślij rycerza."),
            },
            new Rozdzial
            {
                tytul = "Ciemność",
                wstep = "Poza światłem lampek, siedziby i rdzenia góra jest ciemna. I coś w tej ciemności jest.",
                czasowniki = new string[0],
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T($"Rzadko, po {S(round(DLON.pierwszaPo / 7200))} minutach, spod nieznanego pod czyimiś stopami sączy się czerwona łuna, a z głębi wznosi się ogromna dłoń. Rzuć Cud przy ofierze, zanim chwyci."),
                        rozumiem = true,
                    },
                },
                koniec = T("Nie puszczaj nikogo samego daleko od obozu, zwłaszcza nad nieznanym."),
            },
            // Krąg bez Cieni Żarłoków (ZmianyKregu): jedynym wrogiem jest Cerber
            ZmianyKregu.BezCieni ? new Rozdzial
            {
                tytul = "Cerber",
                wstep = $"Pieczęć zejścia ma jednego strażnika. Gdy pęknie do końca ({S(STRAZNICY.fale.FirstOrDefault(f => f.boss == true)?.prog ?? 100)}%), zeskakuje do niej Cerber — innych wrogów w tym kręgu nie ma.",
                czasowniki = new string[0],
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T("Cerbera ranią tylko walczący — rycerz (albo grabarze w hełmach) idzie na niego sam. Każda głowa ma swój pasek; pustą trzeba ściąć."),
                        rozumiem = true,
                        wejdz = (g, _s) => { var w = g.sim.world; g.pokazMiejsce(w.coreX, w.przedsionekY, 10, true); },
                    },
                    new EtapSamouczka
                    {
                        tekst = T("Cerber słabnie, gdy pod rdzeniem modlą się mnisi, a zasypaną przez niego drogę odkopują grabarze. Gdy walczących brak, mnisi razią go księgami."),
                        rozumiem = true,
                    },
                },
                koniec = T("Pasek nad płytą pokaże, ile życia zostało każdej głowie."),
            } : new Rozdzial
            {
                tytul = Krag.T("Strażnicy Snu", "Cienie Żarłoków"),
                wstep = $"Skorupa rdzenia ma strażników. Przy {string.Join(", ", STRAZNICY.fale.Where(f => !(f.boss == true)).Select(f => S(f.prog)))}% wychodzą fale, przy {S(STRAZNICY.fale.FirstOrDefault(f => f.boss == true)?.prog ?? 90)}% — Śniący Kamień.",
                czasowniki = new string[0],
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Dopóki fala trwa, skorupa nie pęka. Rycerz (albo robotnicy w hełmach) walczy sam; pobożni i reszta robotników odchodzą spod rdzenia.", "Dopóki fala trwa, skorupa nie pęka. Rycerz (albo grabarze w hełmach) walczy sam; mnisi i reszta grabarzy odchodzą spod rdzenia.")),
                        rozumiem = true,
                        wejdz = (g, _s) => { var w = g.sim.world; g.pokazMiejsce(w.coreX, w.przedsionekY, 10, true); },
                    },
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Śniącego Kamienia ranią tylko walczący — rycerz idzie na niego sam. Boss słabnie, gdy pod rdzeniem modlą się pobożni, a zasypaną przez niego drogę odkopują robotnicy. Gdy walczących brak, pobożni razią go księgami.", "Śniącego Kamienia ranią tylko walczący — rycerz idzie na niego sam. Boss słabnie, gdy pod rdzeniem modlą się mnisi, a zasypaną przez niego drogę odkopują grabarze. Gdy walczących brak, mnisi razią go księgami.")),
                        rozumiem = true,
                    },
                },
                koniec = T("Pasek nad płytą pokaże, która to fala i ile życia zostało bossowi."),
            },
            new Rozdzial
            {
                tytul = "Droga do wolności",
                wstep = Krag.T("Tak wygrywasz: pobożni schodzą pod rdzeń i modlą się, aż kamień pęknie.", "Tak wygrywasz: mnisi schodzą pod rdzeń i modlą się, aż kamień pęknie."),
                czasowniki = new string[0],
                przygotuj = (g, s) => { var d = s.gniazdoGoblinow(); if (d != null) g.pokazMiejsce(d.Value.x, d.Value.y, 12, true); },
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Najpierw robotnicy kopią drogę wiernych — szyb ze schodami od wnęki przy lewej ścianie sali w dół do starej komnaty z kotłem, a z niej drugi szyb w dół, na przedproże lochu. Wysłani pobożni czekają przy obozie, aż będzie gotowa — wtedy schodzą, a rycerz idzie z nimi na wartę.", "Najpierw grabarze kopią drogę wiernych — szyb ze schodami od wnęki przy lewej ścianie sali w dół do starej komnaty z kotłem, a z niej drugi szyb w dół, na przedproże lochu. Wysłani mnisi czekają przy obozie, aż będzie gotowa — wtedy schodzą, a rycerz idzie z nimi na wartę.")),
                        rozumiem = true,
                    },
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Do lochu z pomnikiem prowadzi tylko stalowa brama. Podnoszą ją zaklęcia dwóch pobożnych przy kotle („Do kotła” w oknie pobożnego) — 40 s do pełna; potem krata powoli opada. Przy połowie da się już tylko przeczołgać.", "Do lochu z pomnikiem prowadzi tylko stalowa brama. Podnoszą ją zaklęcia dwóch mnichów przy kotle („Do kotła” w oknie mnicha) — 40 s do pełna; potem krata powoli opada. Przy połowie da się już tylko przeczołgać.")),
                        rozumiem = true,
                        wejdz = (g, _s) => { var w = g.sim.world; g.pokazMiejsce(w.kociol.x, w.kociol.y, 10, true); },
                        wskaz = s => { var w = s.gra.sim.world; return Wskazanie.Swiat(new Cel { x = w.kociol.x + 0.5, y = w.kociol.y, r = 5, tekst = "kocioł" }); },
                    },
                    new EtapSamouczka
                    {
                        tekst = _ => Krag.T($"Przy {PROG} oddania pobożni sami pójdą pod rdzeń. Karta „chcą zejść pod twój rdzeń” albo szept „módl się” zrobią to od razu.", $"Przy {PROG} oddania mnisi sami pójdą pod rdzeń. Karta „chcą zejść pod twój rdzeń” albo szept „módl się” zrobią to od razu."),
                        rozumiem = true, wskaz = s => Wskazanie.ObszarW(Plyta.obszarOddania(s.gra.plate, s.vh)),
                    },
                    new EtapSamouczka
                    {
                        tekst = T("Wiadra zjeżdżają tam, gdzie lud najbardziej głoduje — także do warty pod rdzeniem. Gdy nie zdążą, spuść wiadro rytem „Nakarm”."),
                        rozumiem = true,
                        wejdz = (g, _s) => { var w = g.sim.world; g.pokazMiejsce(w.coreX, w.przedsionekY, 10, true); },
                        wskaz = s => { var w = s.gra.sim.world; return Wskazanie.Swiat(new Cel { x = w.coreX + 0.5, y = w.przedsionekY + 0.5, r = 6, tekst = "przedsionek" }); },
                    },
                },
                koniec = T("Wiara → droga → warta pod rdzeniem → pęknięcia (i fale) → wolność. Każdy krok widać na wstędze drogi."),
            },
            new Rozdzial
            {
                tytul = "Jak przegrać",
                wstep = "Przegrywasz, gdy nie da się już wygrać.",
                czasowniki = new string[0],
                etapy = new List<EtapSamouczka>
                {
                    new EtapSamouczka
                    {
                        tekst = T(Krag.T("Gdy nie zostanie żaden pobożny — to koniec: nikt inny nie skruszy skorupy, a nowych nikt nie wyda. Najczęściej zabija głód: lud rozproszony daleko od wiadra.", "Gdy nie zostanie żaden mnich — to koniec: nikt inny nie skruszy skorupy, a nowych nikt nie wyda. Najczęściej zabija głód: lud rozproszony daleko od wiadra.")),
                        rozumiem = true, wskaz = s => Wskazanie.ObszarW(Plyta.obszarSpisu(s.gra.plate, s.vh)),
                    },
                },
                koniec = T(Krag.T("Trzymaj lud razem, pilnuj, żeby robotnicy donosili jedzenie z wiadra, i nie wysyłaj pod rdzeń ostatniego pobożnego. Wszystko, co tu było, znajdziesz w atlasie.", "Trzymaj lud razem, pilnuj, żeby grabarze donosili jedzenie z wiadra, i nie wysyłaj pod rdzeń ostatniego mnicha. Wszystko, co tu było, znajdziesz w atlasie.")),
            },
        };
    }
}
