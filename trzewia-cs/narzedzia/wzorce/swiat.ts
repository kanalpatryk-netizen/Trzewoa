// Wzorzec generowania świata: dla każdego ziarna skróty tablic kafli i najważniejsze pola World (test C#: SwiatTesty).
import { World } from '../../../alpha-1/src/sim/world';

function fnv(b: ArrayLike<number>, h = 0x811c9dc5): number {
  for (let i = 0; i < b.length; i++) { h ^= b[i] & 255; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export function swiaty(ziarna: number[], pelne: boolean) {
  return ziarna.map((z) => {
    const w = new World(z);
    return {
      ziarno: z,
      tile: fnv(w.tile), prog: fnv(w.prog), surface: fnv(new Uint8Array(w.surface.buffer)),
      pelne: pelne ? Array.from(w.tile) : null,
      coreX: w.coreX, coreY: w.coreY, przedsionekY: w.przedsionekY,
      salaStart: w.salaStart, szybX: w.szybX, szybDol: w.szybDol, szybWiadraX: w.szybWiadraX, szybWiadraDol: w.szybWiadraDol,
      oltarz: w.oltarz, salaOltarza: w.salaOltarza, odcinkiDrogi: w.odcinkiDrogi, szybDrogi: w.szybDrogi,
      komnata: w.komnata, kociol: w.kociol, loch: w.loch, brama: w.brama, przedproze: w.przedproze,
      unknown: w.unknown,
      ruiny: w.ruiny.map((r) => ({ rodzaj: r.rodzaj, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, dno: r.dno, mury: r.mury.length, gruz: r.gruz.length,
        belki: r.belki.length, luki: r.luki.length, wozek: r.wozek ?? null, zabytek: r.zabytek })),
      stanRng: w.rng.next(),
    };
  });
}
