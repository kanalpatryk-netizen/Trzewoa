import type { Ekran } from './screen';
import type { Resonance } from '../core/audio';
import type { Muzyka } from '../core/music';

/** Wspólny kontekst: to, co każdy ekran może zawołać. */
export interface Kontekst {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dzwiek: Resonance;
  muzyka: Muzyka;
  idz(nazwa: string, dane?: unknown): void;
  zarejestruj(ekran: Ekran): void;
  ekran(nazwa: string): Ekran | undefined;
}
