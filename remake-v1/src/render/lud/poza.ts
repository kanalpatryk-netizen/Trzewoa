import { clamp, katLerp, lerp } from './matma';
import { D } from './szkielet';

/**
 * Poza — same liczby, więc dwie pozy da się płynnie zmieszać (przejście między czynnościami).
 * Kąty od pionu w dół, + = do przodu. Ręce obracają się w połowie razem z tułowiem.
 */
export interface Poza {
  /** pochylenie tułowia do przodu */
  tulow: number;
  /** skłon głowy (+ w dół) względem tułowia */
  glowa: number;
  /** udo, zgięcie kolana (goleń do tyłu), stopa (+ palce w górę); A = bliższa noga, B = dalsza */
  uA: number; kA: number; sA: number;
  uB: number; kB: number; sB: number;
  /** ramię i zgięcie łokcia (przedramię do przodu); A = bliższa ręka (narzędzie), B = dalsza */
  rA: number; eA: number;
  rB: number; eB: number;
  /** bezwzględny kąt narzędzia w bliższej dłoni */
  narz: number;
  /** 0 — stoi na ziemi, 1 — wisi (wspina się, spada); wisY — wysokość biodra w h */
  wis: number; wisY: number;
  /** uniesienie nad ziemię (faza lotu w biegu, podskok) */
  lot: number;
  /** wdech 0..1 */
  oddech: number;
  /** oczy 1 — otwarte, 0 — zamknięte; usta 0 — zamknięte, 1 — szeroko; wysiłek — zmarszczone brwi */
  oczy: number; usta: number; wysilek: number;
  /** trafienie (drżenie, odpryski), ślad ostrza, światło modlitwy / księgi */
  cios: number; smuga: number; blask: number;
  /** tarcza: 0 — przy boku, 1 — zasłania */
  tarcza: number;
}

export type Narzedzie = 'kilof' | 'miecz' | 'laska' | 'mlot';

/** Czego nie da się mieszać: co trzyma, czy oburącz, rekwizyty. Bierze się z nowej czynności. */
export interface Tryb {
  narzedzie: Narzedzie | null;
  oburacz: boolean;
  /** dalsza dłoń chwyta trzonek tyle niżej (w h) */
  chwyt: number;
  ksiega: boolean;
  grzyb: boolean;
  /** złożone dłonie (modlitwa) — rysujemy je razem */
  zlozone: boolean;
  /** leży (rzadkie — sen) */
  lezy: boolean;
}

export const LICZBY = [
  'tulow', 'glowa', 'uA', 'kA', 'sA', 'uB', 'kB', 'sB', 'rA', 'eA', 'rB', 'eB',
  'narz', 'wis', 'wisY', 'lot', 'oddech', 'oczy', 'usta', 'wysilek', 'cios', 'smuga', 'blask', 'tarcza',
] as const;

export function nowaPoza(): Poza {
  return {
    tulow: 0.04, glowa: 0, uA: 0.05, kA: 0.06, sA: 0, uB: -0.06, kB: 0.05, sB: 0,
    rA: 0.08, eA: 0.22, rB: -0.06, eB: 0.2, narz: 0.6,
    wis: 0, wisY: 0.5, lot: 0, oddech: 0.5, oczy: 1, usta: 0, wysilek: 0, cios: 0, smuga: 0, blask: 0, tarcza: 0,
  };
}

export function nowyTryb(): Tryb {
  return { narzedzie: null, oburacz: false, chwyt: 0.08, ksiega: false, grzyb: false, zlozone: false, lezy: false };
}

export function kopiuj(p: Poza): Poza { return { ...p }; }

/** Mieszanie dwóch póz; narzędzie obraca się najkrótszą drogą. */
export function mieszajPozy(a: Poza, b: Poza, t: number): Poza {
  const w = { ...b };
  for (const k of LICZBY) w[k] = k === 'narz' ? katLerp(a[k], b[k], t) : lerp(a[k], b[k], t);
  return w;
}

type Klatka = [number, Partial<Poza>, ((t: number) => number)?];

/**
 * Klatki kluczowe: k 0..1 w cyklu, lista [moment, poza, wygładzenie dojścia do tej klatki].
 * Pola brakujące w klatce biorą się z `baza`. Cykl się zamyka: po ostatniej klatce wraca do pierwszej.
 */
export function klucze(p: Poza, k: number, lista: Klatka[]): void {
  const n = lista.length;
  let i = n - 1;
  for (let j = 0; j < n; j++) if (lista[j][0] <= k) i = j;
  const a = lista[i], b = lista[(i + 1) % n];
  const t0 = a[0], t1 = i + 1 < n ? b[0] : b[0] + 1;
  const kk = k < t0 ? k + 1 : k;
  const ease = b[2] ?? ((x: number) => x);
  const t = ease(clamp((kk - t0) / Math.max(1e-6, t1 - t0), 0, 1));
  const klucz = new Set<keyof Poza>();
  for (const l of lista) for (const key of Object.keys(l[1])) klucz.add(key as keyof Poza);
  for (const key of klucz) {
    // brakujące pole klatki — ostatnia wcześniejsza klatka, która je ustawia (cyklicznie)
    const va = wartosc(lista, i, key) ?? p[key], vb = wartosc(lista, (i + 1) % n, key) ?? p[key];
    p[key] = lerp(va, vb, t);
  }
}

function wartosc(lista: Klatka[], i: number, key: keyof Poza): number | undefined {
  const n = lista.length;
  for (let j = 0; j < n; j++) {
    const v = lista[(i - j + n) % n][1][key];
    if (v !== undefined) return v;
  }
  return undefined;
}

/**
 * Ręka sięga do punktu (względem barku, w h). Łokieć zgina się w dół — jak u człowieka,
 * który coś trzyma przed sobą. Ustawia kąty ramienia i łokcia w pozie.
 */
export function siegnij(p: Poza, reka: 'A' | 'B', tx: number, ty: number, lokciem = 1): void {
  const l1 = D.ramie, l2 = D.przed;
  let d = Math.hypot(tx, ty);
  const maks = (l1 + l2) * 0.995, min = Math.abs(l1 - l2) + 0.01;
  if (d > maks) { tx *= maks / d; ty *= maks / d; d = maks; }
  if (d < min) { const s = min / Math.max(1e-6, d); tx *= s; ty *= s; d = min; }
  const a = Math.atan2(ty, tx);                                   // kąt ekranowy celu
  const b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * lokciem;
  const ex = Math.cos(a + b) * l1, ey = Math.sin(a + b) * l1;    // łokieć
  const U = Math.atan2(ex, ey), F = Math.atan2(tx - ex, ty - ey);
  const r = U - p.tulow * 0.5;
  if (reka === 'A') { p.rA = r; p.eA = F - U; } else { p.rB = r; p.eB = F - U; }
}

/** Bezwzględny kąt przedramienia (do ustawiania narzędzia względem dłoni). */
export const przedramie = (p: Poza, reka: 'A' | 'B'): number => (reka === 'A' ? p.rA + p.eA : p.rB + p.eB) + p.tulow * 0.5;

