import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import { rolaPostaci } from '../../sim/lud';
import { MROK } from '../../nastawy/mrok';
import type { Rgb } from './matma';

/**
 * Światło otoczenia na postaci ludu: skąd pada najbliższe cudze światło — świece i dzień nad ołtarzem,
 * lampa siedziby, ogień kuźni, świeca warsztatu, obóz, lampka sąsiada. Od tej strony sylwetka dostaje
 * ciepłą krawędź (render/lud/malarz.ts: maluj), więc postać stoi w tym samym świetle co skała wokół.
 * Własna lampka się nie liczy — świeci z miejsca postaci, z każdej strony po równo.
 */
export interface SwiatloOtoczenia {
  /** kierunek do światła na ekranie (jednostkowy, y w dół) */
  x: number; y: number;
  /** 0..1 */
  sila: number;
  barwa: Rgb;
}

const SWIECA: Rgb = [255, 204, 136], OGIEN: Rgb = [255, 150, 72], DZIEN: Rgb = [255, 234, 190];

let biezace: SwiatloOtoczenia | null = null;

/** Światło postaci rysowanej właśnie na mapie; null — portret w interfejsie (bez światła otoczenia). */
export function ustawSwiatlo(s: SwiatloOtoczenia | null): void { biezace = s; }
export function swiatloOtoczenia(): SwiatloOtoczenia | null { return biezace; }

/**
 * Suma świateł w zasięgu, ważona spadkiem (1 − d/R)²: kierunek i barwa. `wys` — wysokość sylwetki w kaflach
 * (światło liczymy do piersi, nie do stóp). Bez światła w pobliżu — null.
 */
export function swiatloDla(sim: Sim, c: Creature, wys: number): SwiatloOtoczenia | null {
  const S = MROK.swiatlo, w = sim.world;
  const cx = c.x, cy = c.y + 1 - wys * 0.55;
  let vx = 0, vy = 0, r = 0, g = 0, b = 0, waga = 0;
  const dodaj = (x: number, y: number, R: number, barwa: Rgb, moc = 1): void => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d >= R || d < 0.35) return;
    const f = (1 - d / R) * (1 - d / R) * moc;
    vx += (dx / d) * f; vy += (dy / d) * f;
    r += barwa[0] * f; g += barwa[1] * f; b += barwa[2] * f; waga += f;
  };
  // lampa siedziby wisi nad gniazdem, nie leży na podłodze
  for (const k of sim.clans) if (!k.dead && k.pop > 0) dodaj(k.hx + 0.5, k.hy - 2, S.siedziba * 0.8, SWIECA, 0.8);
  if (w.salaOltarza.x1 >= 0) dodaj(w.oltarz.x + 0.5, w.oltarz.y - 0.6, S.oltarz * 1.6, DZIEN, 1.1);
  for (const p of sim.pomieszczenia) {
    const z = p.gotowe ? S.pomieszczenia[p.rodzaj] : undefined;
    if (!z) continue;
    const ogien = p.rodzaj === 'kuznia';
    dodaj(p.x + p.w / 2, p.y + p.h * 0.6, Math.max(p.w, p.h) / 2 + z, ogien ? OGIEN : SWIECA, ogien ? 1.2 : p.rodzaj === 'sypialnia' ? 0.4 : 0.8);
  }
  for (const o of sim.lud.obozy ?? []) dodaj(o.x + 0.5, o.y + 0.5, S.oboz, SWIECA, 0.8);
  // lampka sąsiada (robotnicy noszą oliwne lampki) — słabsza, za to blisko
  for (const o of sim.creatures) {
    if (o === c || o.dead || rolaPostaci(o) !== 'robotnik') continue;
    if (Math.abs(o.x - cx) > 4 || Math.abs(o.y - c.y) > 4) continue;
    dodaj(o.x, o.y + 1 - wys * 0.5, 3.6, SWIECA, 0.55);
  }
  let dl = Math.hypot(vx, vy);
  if (waga < 0.04 || dl < 0.03) return null;
  const sila = Math.min(1, dl * 1.5);
  // światło spod nóg wyglądałoby jak żarząca się podłoga — co najwyżej z boku, raczej z góry
  vx /= dl; vy /= dl;
  if (vy > -0.3) { vy = -0.3; dl = Math.hypot(vx, vy); vx /= dl; vy /= dl; }
  return { x: vx, y: vy, sila, barwa: [r / waga, g / waga, b / waga] };
}
