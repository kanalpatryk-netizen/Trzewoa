/**
 * Postacie ludu — wspólna matematyka i barwy.
 *
 * Kąty kończyn i narzędzi liczymy od pionu w dół: 0 = w dół, +π/2 = do przodu (w stronę twarzy),
 * ±π = w górę, −π/2 = do tyłu. Ekran: x w prawo (twarz), y w dół.
 */

export const TAU = Math.PI * 2;
export const PI = Math.PI;
export const sin = Math.sin, cos = Math.cos;

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const frac = (x: number): number => x - Math.floor(x);

/** Wygładzenie 0..1 (smoothstep). */
export const gladko = (t: number): number => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
/** Przyspiesza (start powoli). */
export const wej = (t: number, p = 2): number => Math.pow(clamp(t, 0, 1), p);
/** Hamuje (koniec powoli). */
export const wyj = (t: number, p = 2): number => 1 - Math.pow(1 - clamp(t, 0, 1), p);
/** Powoli — szybko — powoli. */
export const wejWyj = (t: number): number => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

/** Płynny szum −1..1 — kilka nieparzystych sinusów, żeby ruch nie wyglądał na mechaniczny. */
export function szum(t: number, z: number): number {
  return sin(t + z) * 0.5 + sin(t * 2.13 + z * 1.7) * 0.3 + sin(t * 4.37 + z * 2.9) * 0.2;
}

/** Interpolacja kąta najkrótszą drogą. */
export function katLerp(a: number, b: number, t: number): number {
  const d = ((((b - a + PI) % TAU) + TAU) % TAU) - PI;
  return a + d * t;
}

/** Liczba 0..1 wyprowadzona z numeru postaci i „szufladki” (stałe cechy wyglądu). */
export function los(id: number, szuflada: number): number {
  let z = (Math.imul(id + 1, 0x9e3779b1) ^ Math.imul(szuflada + 7, 0x85ebca6b)) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) >>> 0;
  z = Math.imul(z ^ (z >>> 12), 0x297a2d39) >>> 0;
  return ((z ^ (z >>> 15)) >>> 0) / 4294967296;
}

export interface Pkt { x: number; y: number }

/** Wektor jednostkowy dla kąta od pionu w dół (+ = do przodu). */
export const kier = (a: number): Pkt => ({ x: sin(a), y: cos(a) });
/** Kąt odcinka a→b w tej samej konwencji. */
export const katOdc = (a: Pkt, b: Pkt): number => Math.atan2(b.x - a.x, b.y - a.y);
export const dodaj = (a: Pkt, k: number, kat: number): Pkt => ({ x: a.x + sin(kat) * k, y: a.y + cos(kat) * k });
export const srodek = (a: Pkt, b: Pkt, t = 0.5): Pkt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// ------------------------------------------------------------------ barwy

export type Rgb = readonly [number, number, number];

/** Gotowe napisy barw — te same tony wracają w każdej klatce, a składanie napisu i odśmiecanie kosztuje. */
const tony = new Map<number, string>();

/** k > 0 rozjaśnia ku ciepłej bieli, k < 0 przyciemnia (ku chłodnemu brązowi, nie do szarości). */
export function ton(c: Rgb, k = 0, a = 1): string {
  const klucz = (((c[0] | 0) * 256 + (c[1] | 0)) * 256 + (c[2] | 0)) * 262144 + (Math.round(k * 255) + 512) * 256 + Math.round(a * 255);
  const jest = tony.get(klucz);
  if (jest !== undefined) return jest;
  if (tony.size > 6000) tony.clear();
  const w = tonLicz(c, k, a);
  tony.set(klucz, w);
  return w;
}

function tonLicz(c: Rgb, k: number, a: number): string {
  let r = c[0], g = c[1], b = c[2];
  if (k > 0) { r += (255 - r) * k; g += (246 - g) * k; b += (226 - b) * k; }
  else if (k < 0) { const m = 1 + k; r *= m; g *= m; b = b * m + 8 * -k; }
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  return a < 1 ? `rgba(${r | 0},${g | 0},${b | 0},${a})` : `rgb(${r | 0},${g | 0},${b | 0})`;
}

export const mieszaj = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * Ton z barwnym cieniem, jak we fresku: k > 0 ku ciepłemu światłu świecy, k < 0 ku barwie cienia
 * (skóra cieniuje się zielonkawo — verdaccio, tkanina w fioletową czerń, kamień w szarość).
 */
export function tonC(c: Rgb, k: number, cien: Rgb, a = 1): string {
  if (k >= 0) return ton(c, k * 0.8, a);
  const t = Math.min(1, -k);
  return ton([c[0] + (cien[0] - c[0]) * t, c[1] + (cien[1] - c[1]) * t, c[2] + (cien[2] - c[2]) * t], 0, a);
}

/** Barwy cieni: tkanina, skóra (zieleń ziemi), metal, kamień. */
export const CIEN = {
  tkanina: [16, 10, 14] as Rgb,
  skora: [58, 66, 52] as Rgb,
  metal: [14, 16, 20] as Rgb,
  kamien: [30, 28, 28] as Rgb,
};
