// Wygenerowane z alpha-1/src/nastawy/polecenia.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/polecenia.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/polecenia.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyPolecenia
    {
        /// <summary>
        /// POLECENIA I ODSTĘPY (Alpha, etap 2) — rozkazy gracza dla zaznaczonych postaci ludu
        /// (src/sim/polecenia.ts) i to, jak lud rozstawia się w tłumie (src/sim/creatures.ts).
        /// Odległości w kaflach, czas w tikach (120 = sekunda, 7200 = minuta gry).
        /// </summary>
        public static Typ_POLECENIA POLECENIA = new Typ_POLECENIA
        {
            celPromien = 2,
            podlogaNizej = 8,
            szukanieDrogi = 30000,
            szukanieKopania = 40000,
            prob = 3,
            ramkaZajety = 12,
            ramkaPomin = 6,
            odmowaTikow = 300,
            znacznikTikow = 720,
            zylaZasieg = 10,
            zylaKafli = 40,
        };

        public static Typ_ODSTEPY ODSTEPY = new Typ_ODSTEPY
        {
            stojacy = 0.9,
            rozsuwanie = 0.025,
            idacy = 1.1,
            wyprzedza = 1.15,
        };
    }

    /// <summary>
    /// POLECENIA I ODSTĘPY (Alpha, etap 2) — rozkazy gracza dla zaznaczonych postaci ludu
    /// (src/sim/polecenia.ts) i to, jak lud rozstawia się w tłumie (src/sim/creatures.ts).
    /// Odległości w kaflach, czas w tikach (120 = sekunda, 7200 = minuta gry).
    /// </summary>
    public sealed partial class Typ_POLECENIA
    {
        /// <summary>Wskazuje się palcem, nie co do kafla: postać staje najdalej tyle kafli od wskazanego miejsca.</summary>
        public double celPromien;
        /// <summary>Wskazane miejsce w pustce: postać staje na podłodze najwyżej tyle kafli niżej.</summary>
        public double podlogaNizej;
        /// <summary>Ile kafli przejrzeć, sprawdzając przy wydaniu rozkazu, czy da się tam dojść (rozkazy są rzadkie — mogą kosztować).</summary>
        public double szukanieDrogi;
        /// <summary>…i czy robotnik da radę się tam dokopać.</summary>
        public double szukanieKopania;
        /// <summary>W drodze: gdy przejście zniknie (zawał, odkopana podłoga), tyle razy szuka nowego, zanim się podda.</summary>
        public double prob;
        /// <summary>Ramka do wykucia (6.11): kafel, w który już bije inny robotnik, liczy się jak o tyle kafli dalej — rozchodzą się.</summary>
        public double ramkaZajety;
        /// <summary>Ramka: tyle nieosiągalnych kafli z rzędu robotnik pominie (bierze następny), zanim porzuci ramkę.</summary>
        public double ramkaPomin;
        /// <summary>Odmowa wisi nad głową tyle tików (2,5 s) — napis w dymku i kręcenie głową.</summary>
        public double odmowaTikow;
        /// <summary>Znacznik celu rozkazu świeci na płycie tyle tików po wydaniu.</summary>
        public double znacznikTikow;
        /// <summary>
        /// Alpha, etap 3b: „kop żyłę” — robotnik, któremu wskażesz rudę, po wykuciu kafla bierze następny
        /// odsłonięty kafel tej samej rudy, najdalej tyle kafli od wskazanego…
        /// </summary>
        public double zylaZasieg;
        /// <summary>…i najwyżej tyle kafli jednym rozkazem (potem trzyma posterunek jak po „kop tam”).</summary>
        public double zylaKafli;
    }

    public sealed partial class Typ_ODSTEPY
    {
        /// <summary>Stojący z ludu nie stoją bliżej siebie niż tyle kafli (mniej więcej szerokość sylwetki) — rozsuwają się.</summary>
        public double stojacy;
        /// <summary>O tyle kafli na tik się rozsuwają (powoli, krokiem w bok).</summary>
        public double rozsuwanie;
        /// <summary>Idący w tę samą stronę tuż za kimś (bliżej niż tyle) dopasowują krok do niego…</summary>
        public double idacy;
        /// <summary>…chyba że są od niego szybsi co najmniej tyle razy — wtedy go wyprzedzają (mijają się bokiem).</summary>
        public double wyprzedza;
    }
}
