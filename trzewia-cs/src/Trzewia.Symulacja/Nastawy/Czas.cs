// Wygenerowane z alpha-1/src/nastawy/czas.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/czas.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/czas.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyCzas
    {
        /// <summary>
        /// CZAS — jak liczy się czas gry.
        ///
        /// Symulacja idzie w tikach: zwykły czas to 120 tików na sekundę (TEMPO.tikowNaSekunde
        /// w nastawy/sterowanie.ts), niezależnie od klatek obrazu. Wszystkie „tiki” w innych
        /// nastawach przeliczaj przez TIKOW_NA_MINUTE: 600 tików to 1/12 minuty gry.
        ///
        /// Ile tików trwa jedna minuta gry (do przeliczeń w kronice, rytuale i wyroku).
        /// </summary>
        public static double TIKOW_NA_MINUTE = 7200;
    }
}
