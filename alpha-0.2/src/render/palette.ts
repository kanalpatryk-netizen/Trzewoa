import { BARWA, ATRAMENT_GLEBI } from '../nastawy/barwy';

/** Paleta jest w nastawy/barwy.ts — tu tylko narzędzia do jej używania. */
export { BARWA };

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Barwa atramentu zmienia się z głębokością: kość na górze, czerwień na dnie. */
export function atramentGlebi(d: number, a = 1): string {
  const { gora, spadek, przyciemnienie } = ATRAMENT_GLEBI;
  const k = 1 - d * przyciemnienie;
  return `rgba(${((gora[0] - d * spadek[0]) * k) | 0},${((gora[1] - d * spadek[1]) * k) | 0},${((gora[2] - d * spadek[2]) * k) | 0},${a})`;
}
