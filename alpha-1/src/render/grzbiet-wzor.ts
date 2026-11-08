import { SWIAT } from '../nastawy/swiat';
import { RYCINA_SWIATA as RS } from '../nastawy/wyglad/rycina';

/**
 * Wzór grzbietu góry (render/grzbiet.ts) bez znajomości świata: tylko przedziały, w których grzbiet schodzi do
 * powierzchni, i początek drogi konwoju. Osobno, bo liczy go też wątek ryciny (render/rycina-watek.ts), który nie
 * ładuje rysunku katedry ani konwoju — dostaje te przedziały gotowe.
 */
export interface RowneGrzbietu { przedzialy: [number, number][]; droga: number }

/** Tani skrót liczby — stały szum grzbietu (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const GARBY = new Float32Array(256), DROBNE = new Float32Array(256);
for (let i = 0; i < 256; i++) { GARBY[i] = los(i * 13 + 5); DROBNE[i] = los(i * 29 + 11); }

/** Wysokość grzbietu (kafle nad powierzchnią) w kolumnie x — przy danych przedziałach równego gruntu. */
export function wysokoscGrzbietuZ(r: RowneGrzbietu, x: number): number {
  if (!SWIAT.warstwy.wlaczone) return 0;
  const f3 = x * 0.12, i3 = Math.floor(f3), t3 = f3 - i3;
  const s5 = GARBY[i3 & 255], s6 = GARBY[(i3 + 1) & 255];
  const f1 = x * 1.6, i1 = Math.floor(f1), t1 = f1 - i1;
  const s1 = DROBNE[i1 & 255], s2 = DROBNE[(i1 + 1) & 255];
  const drobne = x > r.droga ? 0.2 : 1;
  let grz = 0.4 + (s5 + (s6 - s5) * (t3 * t3 * (3 - 2 * t3))) * RS.grzbiet + (s1 + (s2 - s1) * t1 - 0.5) * 0.8 * drobne;
  let d = Infinity;
  for (const [a, b] of r.przedzialy) { const e = x < a ? a - x : x > b ? x - b : 0; if (e < d) d = e; }
  grz *= d >= 3 ? 1 : d / 3;
  return grz < 0 ? 0 : grz;
}
