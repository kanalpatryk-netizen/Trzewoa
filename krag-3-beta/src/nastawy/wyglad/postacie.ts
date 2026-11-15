import { Race } from '../../sim/races';

/**
 * POSTACIE — sylwetki mieszkańców na płycie.
 *
 * Budowa: długości kończyn i tułowia jako ułamek wzrostu postaci,
 * grubości jako ułamek wzrostu (większe = masywniej).
 */
export interface Budowa {
  udo: number; lydka: number; tulow: number; bark: number; pas: number;
  glowa: number; ramie: number; przedramie: number;
  grubUda: number; grubRamienia: number;
}

export const BUDOWA: Record<number, Budowa> = {
  [Race.GOBLIN]: { udo: 0.2, lydka: 0.2, tulow: 0.3, bark: 0.13, pas: 0.1, glowa: 0.15, ramie: 0.19, przedramie: 0.19, grubUda: 0.055, grubRamienia: 0.04 },
  [Race.DWARF]: { udo: 0.15, lydka: 0.15, tulow: 0.34, bark: 0.22, pas: 0.2, glowa: 0.15, ramie: 0.17, przedramie: 0.17, grubUda: 0.075, grubRamienia: 0.065 },
  [Race.TROLL]: { udo: 0.2, lydka: 0.18, tulow: 0.36, bark: 0.25, pas: 0.19, glowa: 0.12, ramie: 0.27, przedramie: 0.27, grubUda: 0.085, grubRamienia: 0.07 },
  [Race.HUMAN]: { udo: 0.22, lydka: 0.21, tulow: 0.31, bark: 0.13, pas: 0.12, glowa: 0.12, ramie: 0.18, przedramie: 0.17, grubUda: 0.05, grubRamienia: 0.04 },
};

/** Najszybszy krok, jaki oko jeszcze czyta (kroków na sekundę) — przy tempie ×8 nogi zlewały się w mgłę. */
export const MAKS_KROKOW_NA_SEKUNDE = 3.2;
