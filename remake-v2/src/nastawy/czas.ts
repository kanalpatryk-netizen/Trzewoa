/**
 * CZAS — jak liczy się czas gry.
 *
 * Symulacja idzie w tikach: zwykły czas to 120 tików na sekundę (TEMPO.tikowNaSekunde
 * w nastawy/sterowanie.ts), niezależnie od klatek obrazu. Wszystkie „tiki” w innych
 * nastawach przeliczaj przez TIKOW_NA_MINUTE: 600 tików to 1/12 minuty gry.
 */

/** Ile tików trwa jedna minuta gry (do przeliczeń w kronice, rytuale i wyroku). */
export const TIKOW_NA_MINUTE = 7200;
