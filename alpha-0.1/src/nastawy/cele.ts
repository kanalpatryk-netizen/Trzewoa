/**
 * CELE (Remake v2) — progi osiągnięć (src/core/osiagniecia.ts).
 * Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry).
 */
export const CELE = {
  /** „Jak kamień w studnię”: wygrana szybciej niż w tyle minut czasu gry (bot na Koszmarze: 9–10 min). */
  szybkoMinut: 10,
  /** „Mało grobów”: wygrana, gdy z ludu zginęło najwyżej tylu. */
  zgonowMaks: 3,
  /** „Kamienna drużyna”: tyle gniazd kamiennych rycerzy obudzonych w jednej partii (z pięciu). */
  gniazda: 3,
  /** „Stara gwardia”: tylu weteranów naraz. */
  weteranow: 6,
  /** „Ludna góra”: tyle postaci ludu naraz (skała wydaje najwyżej 14; reszta to rycerze z gniazd). */
  lud: 18,
};
