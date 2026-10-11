/**
 * ŚWIAT DNIA (v4.1 beta) — jedna góra na cały dzień, ta sama dla każdego.
 *
 * Ziarno liczy się z dzisiejszej daty, więc kształt góry i pierwsze nacje są
 * u wszystkich takie same; dalej świat zależy już od tego, co zrobisz.
 * Najlepszy czas i liczba prób zostają w przeglądarce (ostatnie dni z CELE.dniPamieci).
 */
import { CELE } from '../nastawy/cele';
import { TIKOW_NA_MINUTE } from '../nastawy/czas';

const KLUCZ = 'trzewia:swiatDnia';

export interface WynikDnia {
  /** Najlepszy czas wygranej w tikach — null, gdy dziś jeszcze nie wygrałeś. */
  najlepszy: number | null;
  proby: number;
  wygrane: number;
}

/** Dzisiejsza data w strefie gracza: „2026-10-02”. */
export function dzisiaj(d = new Date()): string {
  const dd = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
}

/** Ziarno góry dla danej daty (FNV-1a, 30 bitów — mieści się w ziarnie Rng). */
export function ziarnoDnia(data = dzisiaj()): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) { h ^= data.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h & 0x3fffffff;
}

function wczytaj(): Record<string, WynikDnia> {
  try {
    const raw = localStorage.getItem(KLUCZ);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}

function zapisz(wszystkie: Record<string, WynikDnia>): void {
  // tylko ostatnie dni — reszta to i tak historia
  const dni = Object.keys(wszystkie).sort().slice(-CELE.dniPamieci);
  const out: Record<string, WynikDnia> = {};
  for (const d of dni) out[d] = wszystkie[d];
  try { localStorage.setItem(KLUCZ, JSON.stringify(out)); } catch { /* tryb prywatny */ }
}

export function wynikDnia(data = dzisiaj()): WynikDnia {
  return wczytaj()[data] ?? { najlepszy: null, proby: 0, wygrane: 0 };
}

/** Zapisuje próbę świata dnia; `tiki` = czas wygranej albo null przy przegranej. */
export function zapiszProbe(data: string, tiki: number | null): { wynik: WynikDnia; rekord: boolean } {
  const wszystkie = wczytaj();
  const w = wszystkie[data] ?? { najlepszy: null, proby: 0, wygrane: 0 };
  w.proby++;
  let rekord = false;
  if (tiki !== null) {
    w.wygrane++;
    if (w.najlepszy === null || tiki < w.najlepszy) { w.najlepszy = tiki; rekord = true; }
  }
  wszystkie[data] = w;
  zapisz(wszystkie);
  return { wynik: w, rekord };
}

/** Tiki gry → „9:12”. */
export function czasGry(tiki: number): string {
  const s = Math.floor(tiki / (TIKOW_NA_MINUTE / 60));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
