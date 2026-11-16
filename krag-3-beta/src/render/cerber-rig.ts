/**
 * SZKIELET CERBERA (Krąg Trzeci, beta) — gdzie w danej pozie (PozaCerbera) są nasady szyj, kotwice i kąty głów,
 * końce szyj, nasada ogona, paszcze i oczy. Wspólny dla modelu 3D (render/cerber3d.ts, wypiek obrazków) i dla
 * składania Cerbera z obrazków w grze (render/cerber-sprite.ts), żeby części trafiały dokładnie w swoje miejsca.
 * Jednostka = wysokość Cerbera; stopy w (0, 0), pyski w +x, y w dół, z w głąb (od widza).
 */
import type { PozaCerbera } from './cerber';

export type V3 = [number, number, number];
type P2 = [number, number];

export function obr(x: number, y: number, kat: number): P2 { const c = Math.cos(kat), s = Math.sin(kat); return [x * c - y * s, x * s + y * c]; }

/** Wymiary głów potrzebne szkieletowi: długość głowy (jednostki), x czubka nosa i oko (w długościach głowy). */
export const GLOWY_RIG: { L: number; dl: number; oko: V3 }[] = [
  { L: 0.29, dl: 1.0, oko: [0.53, -0.085, 0.115] },     // doberman
  { L: 0.3, dl: 1.03, oko: [0.53, -0.085, 0.115] },     // wilk
  { L: 0.28, dl: 0.85, oko: [0.47, -0.11, 0.165] },     // pitbull
];

/** Szkielet pozy: gdzie są nasady szyj, głowy (kotwica i kąt), końce szyj, nasada ogona, paszcze i oczy. */
export interface Rig {
  T: (x: number, y: number, z: number) => V3;
  Td: (v: V3) => V3;
  deba: number; dx: number; dy: number; SX: number;
  nasady: V3[]; kotwice: V3[]; katy: number[]; konce: V3[];
  ogonBaza: V3; paszcze: V3[]; oczy: V3[]; obroza: V3; brzuch: V3;
}
const KOTWICE: V3[] = [[0.3, -1.0, 0.13], [0.5, -0.83, 0.0], [0.58, -0.62, -0.13]];
const NASADY: V3[] = [[0.1, -0.6, 0.06], [0.17, -0.55, 0.0], [0.21, -0.47, -0.07]];
/** Kąt głowy w spoczynku (przy pochyl = 0): doberman zadarty, wilk prosto, pitbull lekko w dół. */
export const KAT_BAZOWY = [-0.3, -0.02, 0.12];
/** Punkt w układzie głowy `i` (x od potylicy do nosa, y w dół, z w bok; w długościach głowy). */
export function punktGlowy(i: number, kot: V3, kat: number, x: number, y: number, z: number): V3 {
  const L = GLOWY_RIG[i].L;
  const [rx, ry] = obr((x - 0.3) * L, y * L, kat);
  return [kot[0] + rx, kot[1] + ry, kot[2] + z * L];
}

export function rigCerbera(p: PozaCerbera): Rig {
  const lez = p.lezy;
  const dy = 0.27 * lez + 0.09 * p.przysiad - 0.01 * Math.sin(p.faza * 2) * p.krok + 0.005 * (p.oddech - 0.5);
  const dx = -0.1 * p.odrzut;
  const deba = p.deba * 0.5;
  const piv: P2 = [-0.3 + dx, -0.47 + dy];
  const SX = 0.92;
  const T = (x: number, y: number, z: number): V3 => {
    const qx = x * SX + dx - piv[0], qy = y + dy - piv[1];
    const [rx, ry] = obr(qx, qy, -deba);
    return [piv[0] + rx, piv[1] + ry, z];
  };
  const Td = (v: V3): V3 => { const [rx, ry] = obr(v[0], v[1], -deba); return [rx, ry, v[2]]; };
  const nasady: V3[] = [], kotwice: V3[] = [], katy: number[] = [], konce: V3[] = [], paszcze: V3[] = [], oczy: V3[] = [];
  for (let i = 0; i < 3; i++) {
    const g = p.glowy[i], kz = KOTWICE[i];
    const kot = T(kz[0] + 0.24 * g.wysun, kz[1] + 0.07 * g.wysun + (lez > 0.5 ? 0.15 : 0), kz[2]);
    const kat = KAT_BAZOWY[i] + g.pochyl - deba * 0.3;
    nasady.push(T(NASADY[i][0], NASADY[i][1], NASADY[i][2]));
    kotwice.push(kot); katy.push(kat);
    konce.push(punktGlowy(i, kot, kat, 0.12, 0.06, 0));
    paszcze.push(punktGlowy(i, kot, kat, GLOWY_RIG[i].dl * 0.75, 0.13 + 0.15 * g.paszcza, 0));
    const ok = GLOWY_RIG[i].oko;
    oczy.push(punktGlowy(i, kot, kat, ok[0], ok[1], -ok[2]));
  }
  return { T, Td, deba, dx, dy, SX, nasady, kotwice, katy, konce, ogonBaza: T(-0.36, -0.52, 0), paszcze, oczy, obroza: T(0.25, -0.58, 0), brzuch: T(0, -0.32, 0) };
}

