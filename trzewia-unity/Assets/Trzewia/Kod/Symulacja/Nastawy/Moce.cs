// Wygenerowane z alpha-1/src/nastawy/moce.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/moce.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/moce.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyMoce
    {
        /// <summary>
        /// MOCE — co kosztują i jak działają czasowniki gracza.
        ///
        /// Koszty w punktach zasobów (Krew / Wiara / Otchłań). Gracz nie widzi liczb,
        /// tylko to, czy ryt się rozjarza — więc te wartości ustawiają rytm gry.
        /// </summary>
        public static Dictionary<string, Typ_KOSZTY_wpis> KOSZTY = new Dictionary<string, Typ_KOSZTY_wpis>
        {
            ["zasiej"] = new Typ_KOSZTY_wpis
            {
                grzyb = new Typ_KOSZTY_wpis_grzyb
                {
                    krew = 30,
                    wiara = 0,
                    otchlan = 0,
                },
            },
            ["szept"] = new Typ_KOSZTY_wpis
            {
                modl = new Typ_KOSZTY_wpis_modl
                {
                    krew = 0,
                    wiara = 8,
                    otchlan = 0,
                },
                prorok = new Typ_KOSZTY_wpis_prorok
                {
                    krew = 0,
                    wiara = 18,
                    otchlan = 0,
                },
                przerwij = new Typ_KOSZTY_wpis_przerwij
                {
                    krew = 0,
                    wiara = 0,
                    otchlan = 0,
                },
            },
            ["znak"] = new Typ_KOSZTY_wpis
            {
                objawienie = new Typ_KOSZTY_wpis_objawienie
                {
                    krew = 0,
                    wiara = 30,
                    otchlan = 0,
                },
            },
        };

        public static Typ_MOCE MOCE = new Typ_MOCE
        {
            ksztaltPromien = 1.6,
            plynPoziom = 8,
            zasiewPromien = 2,
            zasiewSzansa = new Typ_MOCE_zasiewSzansa
            {
                ruda = 0.6,
                grzyb = 0.5,
                kosci = 0.5,
            },
            znakZasieg = 26,
            objawienieOddanie = 0.35,
            objawienieStrach = 0.4,
            objawienieNacja = 0.2,
            panikaNacja = 0.08,
            planOdstepKsztalt = 1.2,
            planOdstepZasiew = 1.6,
        };

        /// <summary>
        /// SKAZY — trwałe zmiany krwi rasy. Każda liczba to mnożnik statystyki z sim/races.ts
        /// (1 = bez zmian, 2 = dwa razy więcej). Rytu „Skaź” w tej wersji nie ma — skazy
        /// zostają tylko po to, żeby stare zapisy wczytywały się takie, jakie były.
        /// </summary>
        public static Typ_SKAZY SKAZY = new Typ_SKAZY
        {
            plodnosc = new Typ_SKAZY_plodnosc
            {
                plodnosc = 2.4,
                dlugoscZycia = 0.75,
                metabolizm = 1.45,
            },
            zadza = new Typ_SKAZY_zadza
            {
                sila = 1.7,
                strach = 0.5,
                wiara = 0.35,
            },
            slepota = new Typ_SKAZY_slepota
            {
                szybkosc = 0.72,
                wiara = 2.2,
                kopanie = 1.2,
            },
            kamien = new Typ_SKAZY_kamien
            {
                zdrowie = 1.6,
                szybkosc = 0.8,
                kopanie = 0.6,
                metabolizm = 1.2,
            },
        };
    }

    public sealed partial class Typ_KOSZTY_wpis
    {
        public Typ_KOSZTY_wpis_grzyb grzyb;
        public Typ_KOSZTY_wpis_modl modl;
        public Typ_KOSZTY_wpis_prorok prorok;
        public Typ_KOSZTY_wpis_przerwij przerwij;
        public Typ_KOSZTY_wpis_objawienie objawienie;
    }

    public sealed partial class Typ_KOSZTY_wpis_grzyb
    {
        public double krew;
        public double wiara;
        public double otchlan;
    }

    public sealed partial class Typ_KOSZTY_wpis_modl
    {
        public double krew;
        public double wiara;
        public double otchlan;
    }

    public sealed partial class Typ_KOSZTY_wpis_prorok
    {
        public double krew;
        public double wiara;
        public double otchlan;
    }

    public sealed partial class Typ_KOSZTY_wpis_przerwij
    {
        public double krew;
        public double wiara;
        public double otchlan;
    }

    public sealed partial class Typ_KOSZTY_wpis_objawienie
    {
        public double krew;
        public double wiara;
        public double otchlan;
    }

    public sealed partial class Typ_MOCE
    {
        /// <summary>Kształtowanie: promień pędzla w kaflach.</summary>
        public double ksztaltPromien;
        /// <summary>Woda i żar wlewają tyle płynu na kafel (0..8).</summary>
        public double plynPoziom;
        /// <summary>Zasiew: promień i szansa na kafel dla każdego narzędzia.</summary>
        public double zasiewPromien;
        public Typ_MOCE_zasiewSzansa zasiewSzansa;
        /// <summary>Znak widzą wszyscy w tym promieniu.</summary>
        public double znakZasieg;
        /// <summary>Objawienie: + oddanie każdego widzącego, jego strach × to, + oddanie nacji (raz na nację, nie na widza).</summary>
        public double objawienieOddanie;
        public double objawienieStrach;
        public double objawienieNacja;
        /// <summary>Panika: nacja traci tyle oddania (raz na nację).</summary>
        public double panikaNacja;
        /// <summary>Plan w pauzie: kolejne pociągnięcie bliżej niż to nie dubluje rozkazu.</summary>
        public double planOdstepKsztalt;
        public double planOdstepZasiew;
    }

    public sealed partial class Typ_MOCE_zasiewSzansa
    {
        public double ruda;
        public double grzyb;
        public double kosci;
    }

    /// <summary>
    /// SKAZY — trwałe zmiany krwi rasy. Każda liczba to mnożnik statystyki z sim/races.ts
    /// (1 = bez zmian, 2 = dwa razy więcej). Rytu „Skaź” w tej wersji nie ma — skazy
    /// zostają tylko po to, żeby stare zapisy wczytywały się takie, jakie były.
    /// </summary>
    public sealed partial class Typ_SKAZY
    {
        public Typ_SKAZY_plodnosc plodnosc;
        public Typ_SKAZY_zadza zadza;
        public Typ_SKAZY_slepota slepota;
        public Typ_SKAZY_kamien kamien;
    }

    public sealed partial class Typ_SKAZY_plodnosc
    {
        public double plodnosc;
        public double dlugoscZycia;
        public double metabolizm;
    }

    public sealed partial class Typ_SKAZY_zadza
    {
        public double sila;
        public double strach;
        public double wiara;
    }

    public sealed partial class Typ_SKAZY_slepota
    {
        public double szybkosc;
        public double wiara;
        public double kopanie;
    }

    public sealed partial class Typ_SKAZY_kamien
    {
        public double zdrowie;
        public double szybkosc;
        public double kopanie;
        public double metabolizm;
    }
}
