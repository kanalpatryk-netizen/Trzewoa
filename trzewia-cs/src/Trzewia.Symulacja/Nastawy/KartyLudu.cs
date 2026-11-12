// Wygenerowane z alpha-1/src/nastawy/karty-ludu.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/karty-ludu.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/karty-ludu.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyKartyLudu
    {
        /// <summary>
        /// KARTY LUDU (Remake v1, etap 4) — talia pod jeden lud: zatrute plony, woda w obozie, zawał nad drogą wiernych.
        /// (Alpha: bez spisku rycerzy, buntu i snu o kamiennych rycerzach.)
        /// Koszty w krwi i wierze; tiki: 120 = sekunda, 7200 = minuta.
        /// </summary>
        public static Typ_KARTY_LUDU KARTY_LUDU = new Typ_KARTY_LUDU
        {
            plonySpal = 6,
            plonyPromien = 10,
            zatrucieTikow = 7200,
            zatrucie = 0.6,
            plonyZatrutych = 4,
            plonyZapasy = 0.5,
            zalanieZatkaj = 12,
            zalanieOdwroc = 8,
            zalanieWoda = 3,
            zawalPodeprzyj = 6,
            zawalKafli = 6,
        };
    }

    /// <summary>
    /// KARTY LUDU (Remake v1, etap 4) — talia pod jeden lud: zatrute plony, woda w obozie, zawał nad drogą wiernych.
    /// (Alpha: bez spisku rycerzy, buntu i snu o kamiennych rycerzach.)
    /// Koszty w krwi i wierze; tiki: 120 = sekunda, 7200 = minuta.
    /// </summary>
    public sealed partial class Typ_KARTY_LUDU
    {
        /// <summary>Zatrute plony: spalenie grzybu (wiara) w promieniu przy spiżarni; zatrucie trwa `zatrucieTikow` (−`zatrucie`).</summary>
        public double plonySpal;
        public double plonyPromien;
        public double zatrucieTikow;
        public double zatrucie;
        public double plonyZatrutych;
        public double plonyZapasy;
        /// <summary>Woda w obozie: zatkanie kosztuje krew; „odwróć” — wiara, woda płynie gdzie indziej.</summary>
        public double zalanieZatkaj;
        public double zalanieOdwroc;
        /// <summary>Ile wody (0–8) leje się ze stropu nad obozem przy „niech płynie”.</summary>
        public double zalanieWoda;
        /// <summary>Zawał nad drogą wiernych: podparcie (wiara); inaczej tyle kafli drogi znów jest skałą.</summary>
        public double zawalPodeprzyj;
        public double zawalKafli;
    }
}
