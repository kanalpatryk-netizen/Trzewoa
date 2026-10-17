import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import type { Odmowa } from '../../sim/polecenia';
import { POLECENIA } from '../../nastawy/polecenia';

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
