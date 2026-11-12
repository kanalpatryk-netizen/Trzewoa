// Sortowanie z porównaniem losowym (jak sim/ruiny.ts) i dziennik wywołań porównania — Chromium kontra Node.
import { Rng } from '../../../alpha-1/src/core/rng';
export function sortuj(ns: number[]) {
  return ns.map((n) => {
    const g = new Rng(n + 1);
    const a = Array.from({ length: n }, (_, i) => i);
    const wywolania: string[] = [];
    a.sort((x, y) => { const v = g.next() - 0.5; wywolania.push(`${x},${y}`); return v; });
    return { n, a, wywolania };
  });
}
