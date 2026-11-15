import type { World } from '../sim/world';
import { SWIAT } from '../nastawy/swiat';
import { RYCINA_SWIATA as RS } from '../nastawy/wyglad/rycina';
import { ukladKatedry } from './katedra';
import { placKonwoju } from './konwoj';

/**
 * Grzbiet góry (rysunek): łagodne garby ziemi ponad płaską powierzchnią świata — gra zaczyna się pod nimi.
 * Wysokość (kafle nad powierzchnią) w kolumnie x: duże garby co kilka kafli i drobne nierówności; przy wylotach szybów,
 * pod katedrą i na placu przy koźle — równo; na drodze konwoju (na prawo od placu) drobne nierówności są wygładzone,
 * żeby koła nie podskakiwały. Jedno źródło dla ryciny (render/engrave.ts), wozu i jego latarni (render/konwoj.ts).
 * Szum stały, z ziarna — dawniej z losowej tablicy ryciny, więc wóz nie wiedział, gdzie jest ziemia.
 */

/** Tani skrót liczby — stały szum grzbietu (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const GARBY = new Float32Array(256), DROBNE = new Float32Array(256);
for (let i = 0; i < 256; i++) { GARBY[i] = los(i * 13 + 5); DROBNE[i] = los(i * 29 + 11); }

/** Gdzie grzbiet schodzi do powierzchni (przedziały x) i skąd zaczyna się droga konwoju — raz na świat. */
const rowne = new WeakMap<World, { przedzialy: [number, number][]; droga: number }>();
function rowneW(w: World): { przedzialy: [number, number][]; droga: number } {
  let r = rowne.get(w);
  if (r) return r;
  const pol = SWIAT.warstwy.szyb >> 1;
  const przedzialy: [number, number][] = [
    [w.szybX - pol, w.szybX + pol + 1],
    [w.szybWiadraX, w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer],
  ];
  const kat = ukladKatedry(w), plac = placKonwoju(w);
  if (kat) przedzialy.push([kat.x0, kat.x1]);
  if (plac) przedzialy.push([plac.x0, plac.x1]);
  r = { przedzialy, droga: plac ? plac.x1 : Infinity };
  rowne.set(w, r);
  return r;
}

/** Wysokość grzbietu (kafle nad powierzchnią) w kolumnie x. */
export function wysokoscGrzbietu(w: World, x: number): number {
  if (!SWIAT.warstwy.wlaczone) return 0;
  const r = rowneW(w);
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
