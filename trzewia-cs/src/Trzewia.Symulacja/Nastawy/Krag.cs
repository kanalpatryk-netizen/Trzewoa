// Wygenerowane z krag-3-beta/src/nastawy/krag.ts (gałąź claude/youthful-wozniak-dqa6s9) przez narzedzia/nastawy/nastawy-cs.mjs
// (ZRODLO → krag-3-beta) — KRAG bez zmian; SCIECIE_GLOW i SCIECIE_GLOWY przeniesione z wygenerowanego Walka.cs kręgu
// (w Alphie 1 ich nie ma, a walka.ts Alphy zostaje 1:1). Nie zmieniać ręcznie liczb — tylko przez TS albo dane/nastawy/krag.json.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/krag.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z krag-3-beta/src/nastawy/krag.ts (tryb Kręgu Trzeciego) — pola jak eksporty w TS.</summary>
    public static partial class NastawyKrag
    {
        /// <summary>
        /// KRĄG TRZECI (beta) — piekło Dantego, krąg żarłoków (Piekło, pieśń VI). Nowe mechaniki tej wersji:
        /// - OBŻARSTWO: potępieni to żarłocy — gdy jedzenia jest w bród, jedzą ponad głód; obżarty robi się ciężki i wolny,
        /// a przejedzony pada twarzą w błoto i leży (sim/krag.ts). Za mało jedzenia — głód, za dużo — grzech.
        /// - ULEWA: co jakiś czas na krąg spada wieczny, zimny i ciężki deszcz z gradem i brudnym śniegiem — zimno
        /// przyspiesza głód, błoto spowalnia każdy krok (render/krag.ts rysuje deszcz, krople i kałuże).
        /// - OKUP DLA CERBERA: boss to trójgłowy pies. Jak Wergiliusz, potępieni rzucają mu w paszczę garść jedzenia —
        /// głowy żrą i na chwilę przestają gryźć (kosztuje porcje z wiadra).
        /// Tiki: 120 na sekundę.
        /// </summary>
        public static Typ_KRAG KRAG = new Typ_KRAG
        {
            obzarstwo = new Typ_KRAG_obzarstwo
            {
                obfitoscOd = 6,
                nadmiar = 1,
                zaPorcje = 0.3,
                zaSytaPorcje = 0.06,
                najedzonyPonizej = 0.3,
                spadek = 0.00003,
                spowalnia = 0.35,
                kopanie = 0.3,
                sila = 0.2,
                padaOd = 1,
                lezy = 1200,
                poUpadku = 0.35,
            },
            deszcz = new Typ_KRAG_deszcz
            {
                pierwsza = 2400,
                co = 12000,
                rozrzut = 2400,
                trwa = 3000,
                glod = 1.15,
                szybkosc = 0.9,
            },
            cerber = new Typ_KRAG_cerber
            {
                podjadaOd = 18,
                podjada = 0.25,
            },
            okup = new Typ_KRAG_okup
            {
                co = 600,
                porcji = 2,
                zre = 300,
                zasieg = 40,
            },
        };

        /// <summary>
        /// Krąg Trzeci (16.11, prośba użytkownika: „niech Cerber ma trzy paski życia, każdy pasek to jedna głowa, wygrywa się,
        /// odcinając każdą z głów”). Życie Cerbera dzieli się na trzy równe paski — pitbull, wilk, doberman (w tej kolejności).
        /// Rany zbijają pasek bieżącej głowy, ale nie niżej niż do zera: pustą głowę trzeba ściąć (rycerz: „Ścięcie głowy”;
        /// gdy rycerza nie ma wśród żywych — odrąbie ją każdy, kto trafi). Ścięcie trzeciej głowy kończy walkę.
        /// </summary>
        public static Typ_SCIECIE_GLOW SCIECIE_GLOW = new Typ_SCIECIE_GLOW
        {
            najwiecej = 3,
            kolejnosc = new double[] { 2, 1, 0 },
            sciecieOd = 0.3,
            slabszeKly = 0.15,
            wagaPustej = 40,
        };

        /// <summary>
        /// Ruch rycerza „Ścięcie głowy” (krag-3-beta: RUCHY_RYCERZA.sciecieGlowy) — w trybie kręgu dochodzi na koniec listy
        /// ruchów rycerza (Walka.ruchRycerza); w Alphie 1 go nie ma.
        /// </summary>
        public static RuchRycerza SCIECIE_GLOWY = new RuchRycerza
        {
            nazwa = "Ścięcie głowy",
            rodzaj = "atak",
            dl = 156,
            traf = new double[][] { new double[] { 100, 2.8 } },
            waga = 2.6,
            opis = "Gdy pasek głowy Cerbera jest prawie pusty: przysiad, wyskok z mieczem oburącz za plecami i cięcie w poprzek karku — głowa spada na posadzkę (pitbull, potem wilk, na końcu doberman). Ścięcie trzeciej głowy kończy walkę.",
            zDaleka = 1.6,
            doskok = new double[] { 0.7, 40, 96 },
            nieDoZablokowania = true,
            chwieje = true,
        };
    }

    /// <summary>
    /// KRĄG TRZECI (beta) — piekło Dantego, krąg żarłoków (Piekło, pieśń VI). Nowe mechaniki tej wersji:
    /// - OBŻARSTWO: potępieni to żarłocy — gdy jedzenia jest w bród, jedzą ponad głód; obżarty robi się ciężki i wolny,
    /// a przejedzony pada twarzą w błoto i leży (sim/krag.ts). Za mało jedzenia — głód, za dużo — grzech.
    /// - ULEWA: co jakiś czas na krąg spada wieczny, zimny i ciężki deszcz z gradem i brudnym śniegiem — zimno
    /// przyspiesza głód, błoto spowalnia każdy krok (render/krag.ts rysuje deszcz, krople i kałuże).
    /// - OKUP DLA CERBERA: boss to trójgłowy pies. Jak Wergiliusz, potępieni rzucają mu w paszczę garść jedzenia —
    /// głowy żrą i na chwilę przestają gryźć (kosztuje porcje z wiadra).
    /// Tiki: 120 na sekundę.
    /// </summary>
    public sealed partial class Typ_KRAG
    {
        public Typ_KRAG_obzarstwo obzarstwo;
        public Typ_KRAG_deszcz deszcz;
        public Typ_KRAG_cerber cerber;
        public Typ_KRAG_okup okup;
    }

    public sealed partial class Typ_KRAG_obzarstwo
    {
        /// <summary>Gdy w wiadrach jest więcej porcji niż tyle — potępieni jedzą ponad głód.</summary>
        public double obfitoscOd;
        /// <summary>Ile porcji ponad głód zjada żarłok przy jednym posiłku, gdy jedzenia w bród.</summary>
        public double nadmiar;
        /// <summary>Obżarstwo za każdą porcję zjedzoną ponad głód (0…1, przy 1 pada w błoto).</summary>
        public double zaPorcje;
        /// <summary>Obżarstwo za porcję zjedzoną, gdy głód był już mniejszy niż `najedzonyPonizej`.</summary>
        public double zaSytaPorcje;
        public double najedzonyPonizej;
        /// <summary>O tyle spada obżarstwo na tik (trawienie).</summary>
        public double spadek;
        /// <summary>Przy pełnym obżarstwie: szybkość × (1 − spowalnia), kucie × (1 − kopanie), siła × (1 − sila).</summary>
        public double spowalnia;
        public double kopanie;
        public double sila;
        /// <summary>Od tylu pada w błoto; leży tyle tików, po wstaniu zostaje mu tyle obżarstwa.</summary>
        public double padaOd;
        public double lezy;
        public double poUpadku;
    }

    public sealed partial class Typ_KRAG_deszcz
    {
        /// <summary>Pierwsza ulewa po tylu tikach, potem co `co` (± `rozrzut`), trwa `trwa`.</summary>
        public double pierwsza;
        public double co;
        public double rozrzut;
        public double trwa;
        /// <summary>W ulewie: głód × glod (zimno), szybkość × szybkosc (błoto).</summary>
        public double glod;
        public double szybkosc;
    }

    public sealed partial class Typ_KRAG_cerber
    {
        /// <summary>
        /// Cerber krąży po powierzchni kręgu: gdy kosz z jedzeniem rusza w dół, a on jest bliżej niż tyle kafli od szybu,
        /// pożera taką część porcji.
        /// </summary>
        public double podjadaOd;
        public double podjada;
    }

    public sealed partial class Typ_KRAG_okup
    {
        /// <summary>Co tyle tików potępieni mogą rzucić Cerberowi okup — jeśli w wiadrach jest choć `porcji` porcji.</summary>
        public double co;
        public double porcji;
        /// <summary>Tyle tików Cerber żre i nie gryzie.</summary>
        public double zre;
        /// <summary>Rzuca ktoś z ludu (najpierw ten, kto niesie jedzenie), kto stoi nie dalej niż tyle kafli od Cerbera.</summary>
        public double zasieg;
    }

    /// <summary>
    /// Krąg Trzeci (16.11, prośba użytkownika: „niech Cerber ma trzy paski życia, każdy pasek to jedna głowa, wygrywa się,
    /// odcinając każdą z głów”). Życie Cerbera dzieli się na trzy równe paski — pitbull, wilk, doberman (w tej kolejności).
    /// Rany zbijają pasek bieżącej głowy, ale nie niżej niż do zera: pustą głowę trzeba ściąć (rycerz: „Ścięcie głowy”;
    /// gdy rycerza nie ma wśród żywych — odrąbie ją każdy, kto trafi). Ścięcie trzeciej głowy kończy walkę.
    /// </summary>
    public sealed partial class Typ_SCIECIE_GLOW
    {
        /// <summary>ile głów — po ostatniej Cerber pada</summary>
        public double najwiecej;
        /// <summary>kolejność ścinania (numery głów: 0 — doberman, 1 — wilk, 2 — pitbull)</summary>
        public double[] kolejnosc;
        /// <summary>od jakiej części paska bieżącej głowy rycerz może ją ściąć (wcześniej rany ją tylko zbijają)</summary>
        public double sciecieOd;
        /// <summary>o ile słabiej gryzie po każdej ściętej głowie</summary>
        public double slabszeKly;
        /// <summary>waga „Ścięcia głowy” w wyborze ataku, gdy pasek głowy jest pusty (rycerz rzuca się, by ją ściąć)</summary>
        public double wagaPustej;
    }
}
