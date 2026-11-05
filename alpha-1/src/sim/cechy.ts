/**
 * Cechy nacji (v4.1 beta) — odczyt mnożników i losowanie przy narodzinach nacji.
 * Liczby i opisy są w src/nastawy/cechy.ts.
 */
import { CECHY, BEZ_CECHY, CECHY_RASY, type Cecha } from '../nastawy/cechy';

const PO_ID = new Map(CECHY.map((c) => [c.id, c]));

/** Cecha nacji — albo „bez cechy” (ludzie, stare zapisy, nieznana nazwa). */
export function cechaNacji(k: { cecha?: string } | undefined | null): Cecha {
  return (k?.cecha && PO_ID.get(k.cecha)) || BEZ_CECHY;
}

/** Losuje cechę dla nowej nacji tej rasy (`los(n)` daje liczbę 0..n-1) albo nic. */
export function losujCeche(rasa: number, los: (n: number) => number): string | undefined {
  const pula = CECHY_RASY[rasa];
  return pula && pula.length ? pula[los(pula.length)] : undefined;
}
