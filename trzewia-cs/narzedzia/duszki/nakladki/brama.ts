// Nakładka piekarni na alpha-1/src/sim/brama.ts: czołganie pod kratą bez stawiania bramy w świecie sceny.
export * from '../../../../alpha-1/src/sim/brama';
import { czolgaSie as zGry } from '../../../../alpha-1/src/sim/brama';

export function czolgaSie(sim: unknown, c: unknown): boolean {
  const s = (globalThis as any).PIEK_CZOLGA;
  return typeof s === 'boolean' ? s : zGry(sim as never, c as never);
}
