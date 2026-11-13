// Nakładka piekarni na alpha-1/src/render/lud/rozstep.ts: chód po schodach kręconych bez budowania schodów w świecie
// sceny — PIEK_SCHODY = { stopien, kier } udaje to, co w grze wylicza rozstawTlum.
export * from '../../../../alpha-1/src/render/lud/rozstep';
import { chodNaSchodach as zGry } from '../../../../alpha-1/src/render/lud/rozstep';

export function chodNaSchodach(c: unknown): { stopien: number; kier: number } | null {
  const s = (globalThis as any).PIEK_SCHODY;
  return s ? s : zGry(c as never);
}
