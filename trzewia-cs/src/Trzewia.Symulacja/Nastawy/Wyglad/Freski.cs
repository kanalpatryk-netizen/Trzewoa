// Wygenerowane z alpha-1/src/nastawy/wyglad/freski.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-freski.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/freski.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladFreski
    {
        /// <summary>
        /// FRESKI — który wycinek malowidła stoi gdzie. Nazwy to pliki z `src/grafiki/freski/`
        /// (bez rozszerzenia); źródła i licencje w `grafiki-freski/ZRODLA.md`.
        ///
        /// Dostępne: lew, smok, wielblad, aniol-michal, diabel-1, diabel-2, diabel-3,
        /// odlamek-biskup, odlamek-swiety-1, odlamek-swiety-2, odlamek-anna, odlamek-michal,
        /// portret-archaniol-gabriel, ikona-ryt-zasiej, ikona-ryt-szept, ikona-ryt-znak.
        /// Medaliony: oko, smok, diabel-1/2/3, anna, aniol, swiety-2, wielblad, lew, zloto.
        /// </summary>
        public static Typ_FRESKI FRESKI = new Typ_FRESKI
        {
            wydarzenia = new Dictionary<string, string>
            {
                ["plemie"] = "wielblad",
                ["zawal"] = "smok",
                ["zaraza"] = "diabel-2",
                ["spisek"] = "diabel-2",
                ["zyla"] = "diabel-3",
                ["wojna"] = "diabel-3",
                ["plony"] = "diabel-3",
                ["dlug"] = "diabel-1",
                ["klotnia"] = "diabel-1",
                ["bunt"] = "diabel-1",
                ["obcy"] = "lew",
                ["ruda"] = "lew",
                ["sen"] = "lew",
                ["glod"] = "odlamek-swiety-1",
                ["wymiera"] = "odlamek-swiety-1",
                ["znak"] = "aniol-michal",
                ["warta"] = "odlamek-michal",
                ["przysiega"] = "odlamek-biskup",
            },
            wydarzenieInne = "odlamek-anna",
            ilustracjaCzesc = 0.27,
            ilustracjaOdSzerokosci = 440,
            fryzWys = 2.3,
            fryzOdWysokosci = 330,
            atlas = new Dictionary<string, string>
            {
                ["rasa-0"] = "odlamek-biskup",
                ["ryt-zasiej"] = "ikona-ryt-zasiej",
                ["ryt-szept"] = "ikona-ryt-szept",
                ["ryt-znak"] = "ikona-ryt-znak",
                ["krew"] = "diabel-1",
                ["prorok"] = "odlamek-swiety-2",
                ["oddanie"] = "odlamek-swiety-1",
                ["pielgrzymka"] = "wielblad",
                ["wydarzenia"] = "diabel-3",
                ["gniazda"] = "aniol-michal",
                ["weterani"] = "portret-archaniol-gabriel",
                ["straznicy"] = "lew",
                ["pismo"] = "odlamek-anna",
            },
            medaliony = new Dictionary<string, string>
            {
                ["pierwsza"] = "oko",
                ["szybko"] = "smok",
                ["syci"] = "zloto",
                ["ocaleni"] = "anna",
                ["skromny"] = "swiety-2",
                ["wspinaczka"] = "wielblad",
                ["kamienna"] = "aniol",
                ["helmy"] = "lew",
                ["weterani"] = "aniol",
                ["ludna"] = "lew",
                ["swiatlo"] = "diabel-2",
                ["dlon"] = "diabel-1",
                ["dno"] = "smok",
                ["dlug"] = "diabel-3",
            },
            koniecWygrana = "aniol-michal",
            koniecPrzegrana = "odlamek-swiety-1",
            koniecPodSpodemOd = 0.16,
            koniecOdMarginesu = 150,
            koniecZnakWodny = 0.3,
        };
    }

    /// <summary>
    /// FRESKI — który wycinek malowidła stoi gdzie. Nazwy to pliki z `src/grafiki/freski/`
    /// (bez rozszerzenia); źródła i licencje w `grafiki-freski/ZRODLA.md`.
    ///
    /// Dostępne: lew, smok, wielblad, aniol-michal, diabel-1, diabel-2, diabel-3,
    /// odlamek-biskup, odlamek-swiety-1, odlamek-swiety-2, odlamek-anna, odlamek-michal,
    /// portret-archaniol-gabriel, ikona-ryt-zasiej, ikona-ryt-szept, ikona-ryt-znak.
    /// Medaliony: oko, smok, diabel-1/2/3, anna, aniol, swiety-2, wielblad, lew, zloto.
    /// </summary>
    public sealed partial class Typ_FRESKI
    {
        /// <summary>
        /// ------------------------------------------------------------ karta wydarzenia
        /// Ilustracja po lewej stronie karty, według rodzaju wydarzenia.
        /// </summary>
        public Dictionary<string, string> wydarzenia;
        /// <summary>Gdy rodzaju nie ma na liście.</summary>
        public string wydarzenieInne;
        /// <summary>Ilustracja zajmuje taką część szerokości karty; węższa karta (telefon) jej nie ma.</summary>
        public double ilustracjaCzesc;
        public double ilustracjaOdSzerokosci;
        /// <summary>Wysokość fryzu z tancerzami nad kartą (× rozmiar pisma); poniżej tej wysokości płyty fryzu nie ma.</summary>
        public double fryzWys;
        public double fryzOdWysokosci;
        /// <summary>
        /// ------------------------------------------------------------- tablice atlasu
        /// Tablica atlasu → fresk zamiast ryciny. Reszta tablic zostaje przy rycinach.
        /// </summary>
        public Dictionary<string, string> atlas;
        /// <summary>
        /// ---------------------------------------------------------------- osiągnięcia
        /// Medalion przy każdym osiągnięciu.
        /// </summary>
        public Dictionary<string, string> medaliony;
        /// <summary>
        /// ---------------------------------------------------------------- koniec gry
        /// Wygrana i przegrana (sen, upadek, zabili cię).
        /// </summary>
        public string koniecWygrana;
        public string koniecPrzegrana;
        /// <summary>Fresk pod wyrokiem, gdy zostaje tam co najmniej taka część wysokości ekranu.</summary>
        public double koniecPodSpodemOd;
        /// <summary>Inaczej po lewej od kroniki, gdy jest tyle miejsca obok karty (px).</summary>
        public double koniecOdMarginesu;
        /// <summary>Wąski ekran: fresk blado za tytułem (krycie).</summary>
        public double koniecZnakWodny;
    }
}
