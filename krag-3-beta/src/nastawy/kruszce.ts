/**
 * KRUSZCE (Alpha, etap 3b) — żelazo i złoto. Wykuty kafel rudy od razu podbija licznik nad płytą;
 * nikt niczego nie nosi i nie ma ekwipunku („wykopią i ci się podnosi numerek na ekranie”).
 * Żelazo (T.ORE) leży w kępach w płytkiej warstwie, złoto (T.ZLOTO) pod dnami jaskiń środkowej.
 * Na co pójdą: żelazo na zbroję rycerza w kuźni, złoto na dewocjonalia w warsztacie (etap 3c).
 * Symulacja: src/sim/creatures.ts (digTile); rysunek: src/render/kruszce.ts.
 */
export const KRUSZCE = {
  /** Ile żelaza daje jeden wykuty kafel rudy. */
  zelazoZaKafel: 1,
  /** Ile złota daje jeden wykuty kafel złota. */
  zlotoZaKafel: 1,
  /**
   * Świeży urobek (skąd leci okruch do licznika) czeka na liście dla rysunku tyle tików (120 = 1 s),
   * a lista ma najwyżej tyle wpisów. To nie stan gry — nie trafia do zapisu.
   */
  urobekTikow: 600,
  urobekMaks: 24,
};

/** Wygląd urobku: lot okrucha do licznika i błysk licznika (milisekundy ekranu, nie tiki gry). */
export const OKRUCH = {
  /** Ile trwa lot okrucha od rozbitego kafla do licznika. */
  lotMs: 1000,
  /** Jak wysoko nad prostą wznosi się łuk lotu (część odległości). */
  luk: 0.32,
  /** Ile trwa rozbłysk w miejscu rozbitego kafla (złoty błysk przy złocie, iskry przy żelazie). */
  rozbloskMs: 650,
  /** Ile trwa błysk licznika i podbicie liczby po doleceniu okrucha. */
  blyskMs: 750,
  /** O ile liczba rośnie przy podbiciu (1 = bez podbicia). */
  podbicie: 1.45,
};
