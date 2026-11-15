// Wygenerowane z alpha-1/src/nastawy/kruszce.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/kruszce.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/kruszce.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyKruszce
    {
        /// <summary>
        /// KRUSZCE (Alpha, etap 3b) — żelazo i złoto. Wykuty kafel rudy od razu podbija licznik nad płytą;
        /// nikt niczego nie nosi i nie ma ekwipunku („wykopią i ci się podnosi numerek na ekranie”).
        /// Żelazo (T.ORE) leży w kępach w płytkiej warstwie, złoto (T.ZLOTO) pod dnami jaskiń środkowej.
        /// Na co pójdą: żelazo na zbroję rycerza w kuźni, złoto na dewocjonalia w warsztacie (etap 3c).
        /// Symulacja: src/sim/creatures.ts (digTile); rysunek: src/render/kruszce.ts.
        /// </summary>
        public static Typ_KRUSZCE KRUSZCE = new Typ_KRUSZCE
        {
            zelazoZaKafel = 1,
            zlotoZaKafel = 1,
            urobekTikow = 600,
            urobekMaks = 24,
        };

        /// <summary>Wygląd urobku: lot okrucha do licznika i błysk licznika (milisekundy ekranu, nie tiki gry).</summary>
        public static Typ_OKRUCH OKRUCH = new Typ_OKRUCH
        {
            lotMs = 1000,
            luk = 0.32,
            rozbloskMs = 650,
            blyskMs = 750,
            podbicie = 1.45,
        };
    }

    /// <summary>
    /// KRUSZCE (Alpha, etap 3b) — żelazo i złoto. Wykuty kafel rudy od razu podbija licznik nad płytą;
    /// nikt niczego nie nosi i nie ma ekwipunku („wykopią i ci się podnosi numerek na ekranie”).
    /// Żelazo (T.ORE) leży w kępach w płytkiej warstwie, złoto (T.ZLOTO) pod dnami jaskiń środkowej.
    /// Na co pójdą: żelazo na zbroję rycerza w kuźni, złoto na dewocjonalia w warsztacie (etap 3c).
    /// Symulacja: src/sim/creatures.ts (digTile); rysunek: src/render/kruszce.ts.
    /// </summary>
    public sealed partial class Typ_KRUSZCE
    {
        /// <summary>Ile żelaza daje jeden wykuty kafel rudy.</summary>
        public double zelazoZaKafel;
        /// <summary>Ile złota daje jeden wykuty kafel złota.</summary>
        public double zlotoZaKafel;
        /// <summary>
        /// Świeży urobek (skąd leci okruch do licznika) czeka na liście dla rysunku tyle tików (120 = 1 s),
        /// a lista ma najwyżej tyle wpisów. To nie stan gry — nie trafia do zapisu.
        /// </summary>
        public double urobekTikow;
        public double urobekMaks;
    }

    /// <summary>Wygląd urobku: lot okrucha do licznika i błysk licznika (milisekundy ekranu, nie tiki gry).</summary>
    public sealed partial class Typ_OKRUCH
    {
        /// <summary>Ile trwa lot okrucha od rozbitego kafla do licznika.</summary>
        public double lotMs;
        /// <summary>Jak wysoko nad prostą wznosi się łuk lotu (część odległości).</summary>
        public double luk;
        /// <summary>Ile trwa rozbłysk w miejscu rozbitego kafla (złoty błysk przy złocie, iskry przy żelazie).</summary>
        public double rozbloskMs;
        /// <summary>Ile trwa błysk licznika i podbicie liczby po doleceniu okrucha.</summary>
        public double blyskMs;
        /// <summary>O ile liczba rośnie przy podbiciu (1 = bez podbicia).</summary>
        public double podbicie;
    }
}
