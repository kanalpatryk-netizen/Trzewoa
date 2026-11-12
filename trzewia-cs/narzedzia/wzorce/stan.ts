// Wzorzec przebiegu partii: kanoniczny zapis CAŁEGO stanu symulacji w wybranych tikach (test C#: StanTesty).
// Kanon (ten sam w C#: testy/Trzewia.Testy/Kanon.cs): obiekty — klucze posortowane, bez undefined/null i bez funkcji;
// Map — lista par; tablice typowane dłuższe niż 64 — skrót FNV-1a po 4 bajtach (int32) każdego elementu;
// Rng — jego stan; liczby — jak String(x) w JS. Pomijane pola: kopie i pamięć podręczna (byId, siatka hash, noise…).
import { Sim } from '../../../alpha-1/src/sim/sim';

const POMIN = new Set(['byId', 'hash', 'zajete', 'hashW', 'hashH', 'CELL', 'pozWpisu', 'fungusList', 'podsumowanie', 'noise', 'ziarno', 'flip', 'slowaKafli']);

function fnv32(a: ArrayLike<number>): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < a.length; i++) {
    const v = a[i] | 0;
    for (let b = 0; b < 4; b++) { h ^= (v >>> (8 * b)) & 255; h = Math.imul(h, 0x01000193) >>> 0; }
  }
  return h >>> 0;
}

function liczba(x: number): string { return Number.isNaN(x) ? '"NaN"' : !Number.isFinite(x) ? (x > 0 ? '"Infinity"' : '"-Infinity"') : String(x); }

export function kanon(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return liczba(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return JSON.stringify(v);
  if (ArrayBuffer.isView(v)) {
    const a = v as unknown as ArrayLike<number>;
    if (a.length > 64) return `"#${a.length}:${fnv32(a)}"`;
    return '[' + Array.from(a, (x) => liczba(x)).join(',') + ']';
  }
  if (Array.isArray(v)) return '[' + v.map((x) => kanon(x)).join(',') + ']';
  if (v instanceof Map) return '[' + [...v].map(([k, w]) => `[${kanon(k)},${kanon(w)}]`).join(',') + ']';
  if (v instanceof Set) return '[' + [...v].map((x) => kanon(x)).join(',') + ']';
  const o = v as Record<string, unknown>;
  // Rng: tylko stan
  if (o.constructor && o.constructor.name === 'Rng') return liczba((o as { s: number }).s);
  const klucze = Object.keys(o).filter((k) => !POMIN.has(k) && o[k] !== undefined && o[k] !== null && typeof o[k] !== 'function').sort();
  return '{' + klucze.map((k) => `${JSON.stringify(k)}:${kanon(o[k])}`).join(',') + '}';
}

/** Stan partii (bez gracza) w podanych tikach. */
export function stany(ziarno: number, tiki: number[]): string[] {
  const sim = new Sim(ziarno);
  const out: string[] = [];
  for (const t of tiki) {
    while (sim.tick < t && !sim.ending) sim.step();
    out.push(kanon(sim));
  }
  return out;
}
