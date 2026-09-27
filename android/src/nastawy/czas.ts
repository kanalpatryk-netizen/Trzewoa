/**
 * CZAS — jak liczy się czas gry.
 *
 * Symulacja idzie w tikach: na każdą klatkę obrazu przypada tyle tików, ile
 * wynosi tempo (1×–8×, patrz STEROWANIE.tempo). Wszystkie „tiki” w innych
 * nastawach przeliczaj przez TIKOW_NA_MINUTE: 600 tików to 1/12 minuty gry.
 */

/** Ile tików trwa jedna minuta gry (do przeliczeń w kronice, rytuale i wyroku). */
export const TIKOW_NA_MINUTE = 7200;
