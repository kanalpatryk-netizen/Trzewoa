import type { World } from '../sim/world';
import { SWIAT } from '../nastawy/swiat';
import { ukladKatedry } from './katedra';
import { placKonwoju } from './konwoj';
import { wysokoscGrzbietuZ, type RowneGrzbietu } from './grzbiet-wzor';

/**
 * Grzbiet góry (rysunek): łagodne garby ziemi ponad płaską powierzchnią świata — gra zaczyna się pod nimi.
 * Wysokość (kafle nad powierzchnią) w kolumnie x: duże garby co kilka kafli i drobne nierówności; przy wylotach szybów,
 * pod katedrą i na placu przy koźle — równo; na drodze konwoju (na prawo od placu) drobne nierówności są wygładzone,
 * żeby koła nie podskakiwały. Jedno źródło dla ryciny (render/engrave.ts), wozu i jego latarni (render/konwoj.ts).
 * Szum stały, z ziarna — dawniej z losowej tablicy ryciny, więc wóz nie wiedział, gdzie jest ziemia.
 */

/** Gdzie grzbiet schodzi do powierzchni (przedziały x) i skąd zaczyna się droga konwoju — raz na świat. */
const rowne = new WeakMap<World, RowneGrzbietu>();
/** Przedziały równego gruntu i początek drogi konwoju — raz na świat (też dla wątku ryciny). */
export function rowneW(w: World): RowneGrzbietu {
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
  return wysokoscGrzbietuZ(rowneW(w), x);
}
