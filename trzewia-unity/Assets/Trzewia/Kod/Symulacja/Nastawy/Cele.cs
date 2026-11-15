// Wygenerowane z alpha-1/src/nastawy/cele.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/cele.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/cele.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyCele
    {
        /// <summary>
        /// CELE (Alpha 0.2) — progi osiągnięć (src/core/osiagniecia.ts). Drużyna jest stała: 6 na start.
        /// Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry).
        /// </summary>
        public static Typ_CELE CELE = new Typ_CELE
        {
            szybkoMinut = 10,
            zgonowMaks = 1,
            weteranow = 6,
            lud = 8,
        };
    }

    /// <summary>
    /// CELE (Alpha 0.2) — progi osiągnięć (src/core/osiagniecia.ts). Drużyna jest stała: 6 na start.
    /// Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry).
    /// </summary>
    public sealed partial class Typ_CELE
    {
        /// <summary>„Jak kamień w studnię”: wygrana szybciej niż w tyle minut czasu gry (bot na Koszmarze: 9–10 min).</summary>
        public double szybkoMinut;
        /// <summary>„Mało grobów”: wygrana, gdy z ludu zginęło najwyżej tylu.</summary>
        public double zgonowMaks;
        /// <summary>„Stara gwardia”: tylu weteranów naraz (cała drużyna z początku partii).</summary>
        public double weteranow;
        /// <summary>„Ludna góra”: tyle postaci ludu naraz (start 6 — więcej tylko z daru ludzi).</summary>
        public double lud;
    }
}
