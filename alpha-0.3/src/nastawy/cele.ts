/**
 * CELE (Alpha 0.3) — progi osiągnięć (src/core/osiagniecia.ts). Drużyna jest stała: 6 na start.
 * Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry).
 */
export const CELE = {
  /** „Jak kamień w studnię”: wygrana szybciej niż w tyle minut czasu gry (bot na Koszmarze: 9–10 min). */
  szybkoMinut: 10,
  /** „Mało grobów”: wygrana, gdy z ludu zginęło najwyżej tylu. */
  zgonowMaks: 1,
  /** „Stara gwardia”: tylu weteranów naraz (cała drużyna z początku partii). */
  weteranow: 6,
  /** „Ludna góra”: tyle postaci ludu naraz (start 6 — więcej tylko z daru ludzi). */
  lud: 8,
};
