import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import type { Odmowa } from '../../sim/polecenia';
import { POLECENIA } from '../../nastawy/polecenia';
import type { Wypowiedz } from '../../core/glos-rycerza';

/**
 * Alpha, etap 2: odmowa rozkazu na ekranie — postać kręci głową, macha dłonią „nie” i rozkłada ręce,
 * a nad nią wisi dymek z powodem (render/druzyna.ts). Liczona zegarem ekranu, nie tikami: rozkaz
 * wydany w pauzie też dostaje odpowiedź od razu.
 */

/** Ile trwa odmowa na ekranie (ms). */
export const ODMOWA_MS = 2600;

const poczatek = new WeakMap<Odmowa, number>();

/** Postęp odmowy 0…1 albo null, gdy postać teraz nie odmawia. */
export function postepOdmowy(sim: Sim, c: Creature, czas: number): number | null {
  const o = c.odmowa;
  if (!o) return null;
  // stara odmowa (sprzed wczytania gry albo zza kadru) nie wraca po minucie
  if (sim.tick - o.od > POLECENIA.odmowaTikow) return null;
  let t0 = poczatek.get(o);
  if (t0 === undefined) { t0 = czas; poczatek.set(o, t0); }
  const k = (czas - t0) / ODMOWA_MS;
  return k >= 0 && k < 1 ? k : null;
}

/** Rycerz mówi odmowę na głos (core/glos-rycerza.ts): od kiedy (zegar ekranu) i obwiednia słów. */
const glosy = new WeakMap<Odmowa, { t0: number; w: Wypowiedz }>();

export function zacznijGlosOdmowy(o: Odmowa, w: Wypowiedz, czas: number): void {
  glosy.set(o, { t0: czas, w });
}

/** Jak głośno postać teraz mówi swoją odmowę (0…1), albo null, gdy nie mówi. */
export function glosOdmowy(c: Creature, czas: number): number | null {
  const g = c.odmowa && glosy.get(c.odmowa);
  if (!g) return null;
  const t = czas - g.t0 - g.w.opoznienieMs;
  if (t > g.w.ms) return null;
  if (t < 0) return 0;
  return g.w.obwiednia[Math.min(g.w.obwiednia.length - 1, Math.floor(t / g.w.krokMs))] ?? 0;
}
