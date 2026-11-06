import type { Sim } from '../sim/sim';

/**
 * Tik gry z ułamkiem — do płynnych animacji zgranych z symulacją (120 tików na sekundę, a ekran rysuje 60–144 klatek):
 * między tikami ułamek rośnie z zegarem ekranu, w tempie ostatnio widzianych tików. Gdy gra stoi, ułamek staje na 1.
 */
let simOst: Sim | null = null;
let tikOst = 0, czasOst = 0, msNaTik = 1000 / 120;

export function tikZUlamkiem(sim: Sim, czas: number): number {
  if (sim !== simOst) { simOst = sim; tikOst = sim.tick; czasOst = czas; }
  if (sim.tick !== tikOst) {
    const d = sim.tick - tikOst;
    if (d > 0 && d < 60 && czas > czasOst) msNaTik = Math.max(1, Math.min(120, msNaTik * 0.75 + ((czas - czasOst) / d) * 0.25));
    tikOst = sim.tick; czasOst = czas;
  }
  return sim.tick + Math.max(0, Math.min(1, (czas - czasOst) / msNaTik));
}
