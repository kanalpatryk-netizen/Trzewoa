// Nakładka piekarni na alpha-1/src/render/lud/matma.ts: wszystko z oryginału, a szum (powolne kołysanie w spoczynku,
// drżenie gardy) można zamrozić — pętla animacji w arkuszu ma się zamykać bez skoku. PIEK_SZUM: liczba albo brak.
export * from '../../../../alpha-1/src/render/lud/matma';
import { szum as szumGry } from '../../../../alpha-1/src/render/lud/matma';

export function szum(t: number, z: number): number {
  const stala = (globalThis as any).PIEK_SZUM;
  return typeof stala === 'number' ? stala : szumGry(t, z);
}
