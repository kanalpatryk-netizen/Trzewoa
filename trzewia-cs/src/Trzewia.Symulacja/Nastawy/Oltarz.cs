// Wygenerowane z alpha-1/src/nastawy/oltarz.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/oltarz.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/oltarz.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyOltarz
    {
        /// <summary>
        /// OŁTARZ (Alpha, etap 3d) — kamienny ołtarz z krzyżem na kopczyku, na środku sali pod szybem ze światłem dziennym
        /// (szkic Pawła). Stoi od początku gry; podkopać go nie można (kamienny kopczyk pod nim, kamienna podłoga sali).
        /// Dotknięcie ołtarza otwiera okno rytuałów. Rytuał odprawia pobożny, który stoi przy ołtarzu; paliwem jest krew
        /// (decyzja użytkownika), a obie ofiary ją dają — „okalecz się” i „ofiaruj” są już tylko tutaj, nie w szeptach.
        /// Symulacja: src/sim/oltarz.ts; rysunek: src/render/oltarz.ts.
        /// Odległości w kaflach, czas w tikach (120 = sekunda, 7200 = minuta gry).
        /// </summary>
        public static Typ_OLTARZ OLTARZ = new Typ_OLTARZ
        {
            przyX = 3,
            przyY = 1,
            odejscieTikow = 240,
            rytualy = new Typ_OLTARZ_rytualy
            {
                modlitwa = new Typ_OLTARZ_rytualy_modlitwa
                {
                    krew = 15,
                    tikow = 1800,
                    wiara = 30,
                },
                szal = new Typ_OLTARZ_rytualy_szal
                {
                    krew = 30,
                    tikow = 900,
                    trwa = 7200,
                    sila = 1.6,
                },
                wskrzeszenie = new Typ_OLTARZ_rytualy_wskrzeszenie
                {
                    krew = 100,
                    tikow = 1800,
                },
                ofiaraKrwi = new Typ_OLTARZ_rytualy_ofiaraKrwi
                {
                    krew = 0,
                    tikow = 720,
                },
                ofiaraZycia = new Typ_OLTARZ_rytualy_ofiaraZycia
                {
                    krew = 0,
                    tikow = 900,
                },
            },
        };

        /// <summary>Kolejność w oknie ołtarza.</summary>
        public static string[] RYTUALY = new string[] { "modlitwa", "szal", "wskrzeszenie", "ofiaraKrwi", "ofiaraZycia" };

        public static Typ_NAZWA_RYTUALU NAZWA_RYTUALU = new Typ_NAZWA_RYTUALU
        {
            modlitwa = "Modlitwa",
            szal = "Szał krwi",
            wskrzeszenie = "Wskrzeszenie",
            ofiaraKrwi = "Ofiara krwi",
            ofiaraZycia = "Ofiara życia",
        };

        /// <summary>Typ RodzajRytualu z TS — dozwolone napisy.</summary>
        public static readonly string[] RodzajRytualu = { "modlitwa", "szal", "wskrzeszenie", "ofiaraKrwi", "ofiaraZycia" };
    }

    /// <summary>
    /// OŁTARZ (Alpha, etap 3d) — kamienny ołtarz z krzyżem na kopczyku, na środku sali pod szybem ze światłem dziennym
    /// (szkic Pawła). Stoi od początku gry; podkopać go nie można (kamienny kopczyk pod nim, kamienna podłoga sali).
    /// Dotknięcie ołtarza otwiera okno rytuałów. Rytuał odprawia pobożny, który stoi przy ołtarzu; paliwem jest krew
    /// (decyzja użytkownika), a obie ofiary ją dają — „okalecz się” i „ofiaruj” są już tylko tutaj, nie w szeptach.
    /// Symulacja: src/sim/oltarz.ts; rysunek: src/render/oltarz.ts.
    /// Odległości w kaflach, czas w tikach (120 = sekunda, 7200 = minuta gry).
    /// </summary>
    public sealed partial class Typ_OLTARZ
    {
        /// <summary>Pobożny stoi „przy ołtarzu”, gdy jest najwyżej tyle kafli w bok i tyle w pionie od kafla ołtarza.</summary>
        public double przyX;
        public double przyY;
        /// <summary>Odprawiający może odejść od ołtarza najwyżej na tyle tików (rozsuwa się z innymi) — dłużej: rytuał przerwany.</summary>
        public double odejscieTikow;
        public Typ_OLTARZ_rytualy rytualy;
    }

    public sealed partial class Typ_OLTARZ_rytualy
    {
        /// <summary>Modlitwa: pobożny klęczy, od krzyża biją promienie, a wiara rośnie przez cały rytuał (razem `wiara`).</summary>
        public Typ_OLTARZ_rytualy_modlitwa modlitwa;
        /// <summary>Szał krwi: krew spływa do misy, zapala się krąg znaków; rycerz przez `trwa` tików bije z siłą × `sila`.</summary>
        public Typ_OLTARZ_rytualy_szal szal;
        /// <summary>Wskrzeszenie: wybrany z poległych (jego ciało musi jeszcze leżeć) wstaje przy ołtarzu.</summary>
        public Typ_OLTARZ_rytualy_wskrzeszenie wskrzeszenie;
        /// <summary>Ofiara krwi: pobożny upuszcza krwi do misy (krew: LUD.okaleczenieKrew) i jest okaleczony, póki się nie wyśpi.</summary>
        public Typ_OLTARZ_rytualy_ofiaraKrwi ofiaraKrwi;
        /// <summary>Ofiara życia: pobożny oddaje życie na ołtarzu (krew: LUD.ofiaraKrew). Ostatniego pobożnego ołtarz nie przyjmie.</summary>
        public Typ_OLTARZ_rytualy_ofiaraZycia ofiaraZycia;
    }

    public sealed partial class Typ_OLTARZ_rytualy_modlitwa
    {
        public double krew;
        public double tikow;
        public double wiara;
    }

    public sealed partial class Typ_OLTARZ_rytualy_szal
    {
        public double krew;
        public double tikow;
        public double trwa;
        public double sila;
    }

    public sealed partial class Typ_OLTARZ_rytualy_wskrzeszenie
    {
        public double krew;
        public double tikow;
    }

    public sealed partial class Typ_OLTARZ_rytualy_ofiaraKrwi
    {
        public double krew;
        public double tikow;
    }

    public sealed partial class Typ_OLTARZ_rytualy_ofiaraZycia
    {
        public double krew;
        public double tikow;
    }

    public sealed partial class Typ_NAZWA_RYTUALU
    {
        public string modlitwa;
        public string szal;
        public string wskrzeszenie;
        public string ofiaraKrwi;
        public string ofiaraZycia;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "modlitwa", "szal", "wskrzeszenie", "ofiaraKrwi", "ofiaraZycia" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public string this[string klucz] => klucz switch
        {
            "modlitwa" => modlitwa,
            "szal" => szal,
            "wskrzeszenie" => wskrzeszenie,
            "ofiaraKrwi" => ofiaraKrwi,
            "ofiaraZycia" => ofiaraZycia,
            _ => default!,
        };
    }
}
