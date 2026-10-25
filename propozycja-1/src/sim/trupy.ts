/**
 * TRUPY (Remake v2) — kto z ludu umrze, nie znika: jego ciało leży na ziemi tam, gdzie padł
 * (spada na najbliższą podłogę). Wyjątek: zabrani przez ciemność i przez dłoń z otchłani —
 * ich nie ma. Najstarsze trupy, gdy jest ich za dużo, rozsypują się w kości.
 * Rysunek: src/render/trupy.ts (ta sama postać, leżąca, wyblakła).
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import type { Rola } from '../nastawy/lud';
import { LUD } from '../nastawy/lud';
import { Race } from './races';
import { T } from './tiles';

export interface Trup {
  /** id zmarłego — rysunek bierze z niego te same barwy i warianty stroju */
  id: number;
  x: number;
  /** kafel, na którym leży (pod nim podłoga) */
  y: number;
  rola: Rola;
  face: number;
  /** tik śmierci */
  od: number;
  okaleczony?: boolean;
  helm?: boolean;
}

/** Śmierci, po których nie zostaje ciało. */
const BEZ_CIALA = new Set(['otchlan']);

/** Wołane z sim.kill: zostawia ciało postaci ludu. Zwraca true, gdy ciało zostało. */
export function zostawTrupa(sim: Sim, c: Creature, tag: string): boolean {
  if (c.race !== Race.GOBLIN || c.straznik || BEZ_CIALA.has(tag)) return false;
  const w = sim.world;
  let x = Math.max(0, Math.min(w.w - 1, Math.floor(c.x)));
  let y = Math.max(0, Math.min(w.h - 2, Math.floor(c.y)));
  // w ścianie (przysypany) — najbliższa pustka w górę
  for (let k = 0; k < 6 && !w.passable(x, y); k++) y--;
  if (!w.passable(x, y)) return false;
  // ciało spada na najbliższą podłogę (nie dalej niż kawał w dół)
  for (let k = 0; k < 40 && y + 1 < w.h && w.passable(x, y + 1) && w.magma[w.idx(x, y + 1)] === 0; k++) y++;
  if (w.magma[w.idx(x, y)] > 0) return false;       // w ogień — nic nie zostaje
  const trupy = (sim.lud.trupy ??= []);
  trupy.push({
    id: c.id, x: x + 0.5 + Math.max(-0.3, Math.min(0.3, c.x - x - 0.5)), y, rola: c.rola ?? 'pobozny',
    face: c.face >= 0 ? 1 : -1, od: sim.tick, okaleczony: c.okaleczony, helm: c.helm,
  });
  // za dużo — najstarszy rozsypuje się w kości
  while (trupy.length > LUD.trupyMax) {
    const t = trupy.shift()!;
    const tx = Math.floor(t.x);
    if (w.inb(tx, t.y) && w.get(tx, t.y) === T.AIR) w.set(tx, t.y, T.BONES);
  }
  return true;
}

/** Trupy, które jeszcze leżą (bez tych, pod którymi wykopano podłogę — spadają niżej). */
export function tikTrupow(sim: Sim): void {
  const trupy = sim.lud.trupy;
  if (!trupy?.length || sim.tick % 60 !== 0) return;
  const w = sim.world;
  for (const t of trupy) {
    const x = Math.floor(t.x);
    for (let k = 0; k < 40 && t.y + 1 < w.h && w.passable(x, t.y + 1) && w.magma[w.idx(x, t.y + 1)] === 0; k++) t.y++;
  }
  sim.lud.trupy = trupy.filter((t) => w.passable(Math.floor(t.x), t.y) && w.magma[w.idx(Math.floor(t.x), t.y)] === 0);
}
