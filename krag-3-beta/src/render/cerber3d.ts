/**
 * CERBER W 3D (Krąg Trzeci, beta) — model według obrazka referencyjnego od użytkownika (15.11): muskularny, suchy pies
 * (doberman / pitbull) o krótkiej, lśniącej sierści, kudłata grzywa na piersi i szyjach, kolce na grzbiecie, wężowy
 * ogon w łuskach, wielkie łapy z pazurami; trzy różne głowy na trzech szyjach rozchodzących się wachlarzem:
 * doberman z przyciętymi, sterczącymi uszami (czarny podpalany) — najwyżej; wilk (szarobury, z kryzą) — w środku;
 * pitbull (pręgowany, szeroka czaszka, ciężkie fafle) — nisko z przodu. Warczą: fafle podciągnięte, dziąsła na wierzchu.
 * Anatomia głowy: mózgoczaszka z grzebieniem, łuki brwiowe, policzki i żwacze, kufa z grzbietem nosa i poduszkami
 * wąsów, nos z nozdrzami, fafle z czarną krawędzią warg, dziąsła, podniebienie, żuchwa na zawiasie z brodą,
 * pełne uzębienie (kły, siekacze, przedtrzonowce), język. Grzywa to setki kępek kudłów opadających pod ciężarem.
 * Bryły zlewają się w jedno ciało (render/gl3d.ts). Ta sama poza co w 2D (PozaCerbera z render/cerber.ts).
 * Układ: stopy w (0, 0), pysk w +x, jednostka = wysokość Cerbera (`h` pikseli).
 */
import { renderuj3d, nalozRender, MAT, type Prym, type V3 } from './gl3d';
import type { PozaCerbera, PunktyCerbera, GlowaCerbera } from './cerber';
import { GLOWY_RIG, rigCerbera, punktGlowy, obr, type Rig } from './cerber-rig';
export { rigCerbera, punktGlowy, KAT_BAZOWY, type Rig } from './cerber-rig';

type P2 = [number, number];
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const los = (n: number): number => {
  let h = Math.imul(((n * 1000) | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function norm(v: V3): V3 { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
const dodaj = (a: V3, b: V3, s = 1): V3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

/** Kąt widzenia: z boku i trochę z przodu (trzy czwarte), żeby było widać trzy łby. */
export const YAW_CERBERA = 0.5;
/** Jakość renderu: 1 — długi włos i cienie, 0 — szybko. */
export const JAKOSC_3D = { wartosc: 1 };

// barwy (liniowe)
const CZARNY: V3 = [0.022, 0.02, 0.019];
const PODPAL: V3 = [0.1, 0.046, 0.021];      // podpalanie dobermana
const WILK: V3 = [0.062, 0.055, 0.046];
const WILK_J: V3 = [0.13, 0.115, 0.09];
const PREGI: V3 = [0.05, 0.036, 0.026];      // pręgowany pitbull
const PREGI_J: V3 = [0.085, 0.062, 0.044];
const GRZYWA: V3 = [0.026, 0.023, 0.021];
const NOS: V3 = [0.016, 0.014, 0.015];
const WARGA: V3 = [0.028, 0.019, 0.02];
const DZIASLA: V3 = [0.32, 0.05, 0.065];
const GARDLO: V3 = [0.11, 0.012, 0.018];
const ZAB: V3 = [0.8, 0.76, 0.64];
const JEZYK: V3 = [0.28, 0.055, 0.065];
const OKO: V3 = [1, 0.3, 0.08];
const LUSKI: V3 = [0.035, 0.04, 0.03];
const ROG: V3 = [0.05, 0.042, 0.036];
const PAZUR: V3 = [0.045, 0.04, 0.036];
const SLINA: V3 = [0.7, 0.7, 0.66];
const KAMIEN: V3 = [0.42, 0.4, 0.37];

interface Rasa {
  /** długość głowy (jednostki) */
  L: number;
  /** półosie mózgoczaszki (w długościach głowy) */
  czaszka: V3;
  /** x czubka nosa */
  dl: number;
  /** kufa: pół-wysokość przy stopie i przy nosie, pół-szerokość przy nosie */
  kh0: number; kh1: number; kw: number;
  policzki: number;
  fafle: number;
  futro: V3; futroJ: V3;
  ucho: 'przyciete' | 'wilcze' | 'krotkie';
  /** kryza kudłów na policzkach i gardle */
  kryza: number;
  /** oko (x, y, z w długościach głowy; z — od osi w bok) */
  oko: V3;
}
const RASY: Rasa[] = [
  { ...GLOWY_RIG[0], czaszka: [0.27, 0.19, 0.165], kh0: 0.13, kh1: 0.088, kw: 0.085, policzki: 0.9, fafle: 0.8, futro: CZARNY, futroJ: PODPAL, ucho: 'przyciete', kryza: 0 },
  { ...GLOWY_RIG[1], czaszka: [0.27, 0.19, 0.175], kh0: 0.12, kh1: 0.075, kw: 0.07, policzki: 1.0, fafle: 0.65, futro: WILK, futroJ: WILK_J, ucho: 'wilcze', kryza: 1 },
  { ...GLOWY_RIG[2], czaszka: [0.25, 0.215, 0.215], kh0: 0.165, kh1: 0.135, kw: 0.12, policzki: 1.2, fafle: 1.25, futro: PREGI, futroJ: PREGI_J, ucho: 'krotkie', kryza: 0 },
];

function staw(a: P2, c: P2, l1: number, l2: number, zg: number): P2 {
  const dx = c[0] - a[0], dy = c[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), (l1 + l2) * 0.999) || 0.001;
  const ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const k = Math.atan2(dy, dx) + zg * Math.acos(Math.max(-1, Math.min(1, ca)));
  return [a[0] + Math.cos(k) * l1, a[1] + Math.sin(k) * l1];
}

export interface Model {
  grupy: Prym[][]; oczy: V3[]; paszcze: V3[]; obroza: V3; brzuch: V3;
  /** części do osobnego wypieku: ciało (tułów, łapy, kolce, grzywa), ogon, szyje i głowy (po jednej na rasę) */
  czesci: { cialo: Prym[][]; ogon: Prym[][]; szyje: Prym[][][]; glowy: Prym[][][] };
  rig: Rig;
}

/** Buduje bryły Cerbera w pozie `p` (jednostki: wysokość = 1). */
export function modelCerbera(p: PozaCerbera): Model {
  const t = p.czas / 1000;
  const kam = p.kamien > 0.5;
  const krew = kam ? 0 : p.krew ?? 0.6;
  const K = (c: V3): V3 => (kam ? KAMIEN : c);
  const M = (m: number): number => (kam && m !== MAT.oko ? MAT.kamien : m);
  const lez = p.lezy;
  const rig = rigCerbera(p);
  const { T, Td, deba, dx, SX } = rig;
  const sk = (o: Partial<Prym> & { typ: number; a: V3; r1: number }, kol: V3 = CZARNY, kr = 0): Prym => ({ k: 0.04, mat: M(MAT.siersc), kol: K(kol), krew: kr, kier: [-1, 0.3, 0], wlos: kam ? 0 : 0.0045, ...o });
  const gol = (o: Partial<Prym> & { typ: number; a: V3; r1: number; mat: number; kol: V3 }): Prym => ({ k: 0.006, ...o, mat: M(o.mat), kol: K(o.kol) });
  /** Kępka kudłów: korzeń w skórze, dwa odcinki, koniec opada pod ciężarem. */
  const kepka = (out: Prym[], korzen: V3, kier: V3, dl: number, r: number, kol: V3, kr: number): void => {
    const n = norm(kier);
    const sr = dodaj(korzen, n, dl * 0.5);
    const n2 = norm([n[0] * 0.75, n[1] * 0.75 + 0.6, n[2] * 0.75]);
    const kon = dodaj(sr, n2, dl * 0.5);
    out.push({ typ: 1, a: korzen, b: sr, r1: r, r2: r * 0.62, k: 0.012, mat: M(MAT.grzywa), kol: K(kol), krew: kr, kier: n });
    out.push({ typ: 1, a: sr, b: kon, r1: r * 0.62, r2: r * 0.1, k: 0.005, mat: M(MAT.grzywa), kol: K(kol), krew: kr, kier: n2 });
  };
  /** Kępki na powierzchni elipsoidy (spirala złota), tylko tam, gdzie `gdzie(normalna)`; opadają w dół i w tył. */
  const kepkiElipsoida = (out: Prym[], c: V3, R: V3, n: number, ziarno: number, gdzie: (q: V3) => boolean, dl: number, r: number, kol: V3, kr: number, wTyl = 0.3): void => {
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, fi = Math.acos(1 - 2 * u), th = i * 2.399963 + ziarno;
      const nn: V3 = [Math.sin(fi) * Math.cos(th), -Math.cos(fi), Math.sin(fi) * Math.sin(th)];
      if (!gdzie(nn)) continue;
      const j = los(i * 7.31 + ziarno), j2 = los(i * 3.17 + ziarno * 2.1), j3 = los(i * 5.77 + ziarno * 0.7);
      const korzen = T(c[0] + nn[0] * R[0] * 0.9, c[1] + nn[1] * R[1] * 0.9, c[2] + nn[2] * R[2] * 0.9);
      const kier = Td([nn[0] * 0.55 - wTyl + (j - 0.5) * 0.3, nn[1] * 0.3 + 0.8, nn[2] * 0.55 + (j2 - 0.5) * 0.3]);
      const v = 0.7 + 0.6 * j3;
      kepka(out, korzen, kier, dl * (0.7 + 0.6 * j2), r * (0.8 + 0.4 * j), [kol[0] * v, kol[1] * v, kol[2] * v], kr * (0.5 + j));
    }
  };

  // ---------------------------------------------------------------- tułów (klatka, pierś, łopatki, talia, zad)
  const tulow: Prym[] = [
    sk({ typ: 2, a: T(0.06, -0.44, 0), b: [0.18, 0.165, 0.125], r1: 0, r2: -0.14 + deba, k: 0.045 }),
    sk({ typ: 2, a: T(0.21, -0.38, 0), b: [0.08, 0.11, 0.12], r1: 0, r2: 0.25 + deba, k: 0.05 }, CZARNY, krew * 0.8),
    sk({ typ: 2, a: T(0.13, -0.48, -0.105), b: [0.07, 0.14, 0.05], r1: 0, r2: -0.55 + deba, k: 0.035 }),
    sk({ typ: 2, a: T(0.13, -0.48, 0.105), b: [0.07, 0.14, 0.05], r1: 0, r2: -0.55 + deba, k: 0.035 }),
    sk({ typ: 2, a: T(0.15, -0.35, -0.1), b: [0.07, 0.08, 0.05], r1: 0, r2: 0.3 + deba, k: 0.03 }),
    sk({ typ: 2, a: T(0.15, -0.35, 0.1), b: [0.07, 0.08, 0.05], r1: 0, r2: 0.3 + deba, k: 0.03 }),
    sk({ typ: 1, a: T(0.12, -0.56, 0), b: T(-0.26, -0.52, 0), r1: 0.075, r2: 0.075, k: 0.05 }),
    sk({ typ: 1, a: T(0.02, -0.4, 0), b: T(-0.2, -0.47, 0), r1: 0.078, r2: 0.05, k: 0.05 }),
    sk({ typ: 2, a: T(-0.29, -0.47, 0), b: [0.1, 0.085, 0.1], r1: 0, r2: 0.2 + deba, k: 0.05 }),
    sk({ typ: 2, a: T(-0.28, -0.39, -0.088), b: [0.105, 0.135, 0.058], r1: 0, r2: -0.35 + deba, k: 0.035 }),
    sk({ typ: 2, a: T(-0.28, -0.39, 0.088), b: [0.105, 0.135, 0.058], r1: 0, r2: -0.35 + deba, k: 0.035 }),
    sk({ typ: 2, a: T(-0.33, -0.36, -0.07), b: [0.05, 0.1, 0.045], r1: 0, r2: 0.25 + deba, k: 0.025 }),
    sk({ typ: 2, a: T(-0.33, -0.36, 0.07), b: [0.05, 0.1, 0.045], r1: 0, r2: 0.25 + deba, k: 0.025 }),
    sk({ typ: 2, a: T(0.12, -0.555, 0), b: [0.095, 0.075, 0.13], r1: 0, r2: -0.2, k: 0.05 }),
  ];
  // grzywa: śliniak kudłów na piersi, między łapami, i kudły na karku
  const grzywa: Prym[] = [], kark: Prym[] = [];
  // kudły: długi włos (powłoka pasm w shaderze) na piersi, karku i szyjach
  const kud = (o: Partial<Prym> & { typ: number; a: V3; r1: number }, kol: V3 = GRZYWA, kr = 0, dl = 0.022): Prym => ({ k: 0.05, mat: M(MAT.grzywa), kol: K(kol), krew: kr, wlos: kam ? 0 : dl, ...o });
  // (długi włos powłoką tylko na szyjach — na dużych bryłach tułowia urywał się na ich granicach jak szklana skrzynka)
  grzywa.push(kud({ typ: 2, a: T(0.22, -0.4, 0), b: [0.07, 0.14, 0.112], r1: 0, r2: 0.2 + deba, kier: Td([0.1, 1, 0]) }, GRZYWA, krew * 0.9, 0.0045));
  grzywa.push(kud({ typ: 2, a: T(0.19, -0.31, 0), b: [0.055, 0.07, 0.085], r1: 0, r2: 0.3 + deba, kier: Td([0.05, 1, 0]) }, GRZYWA, krew, 0.0045));
  kark.push(kud({ typ: 2, a: T(0.1, -0.56, 0), b: [0.11, 0.06, 0.13], r1: 0, r2: -0.25 + deba, kier: Td([-0.7, 0.7, 0]) }, GRZYWA, 0, 0.0045));
  // strzępy kudłów zwisające z piersi i z karku
  kepkiElipsoida(grzywa, [0.21, -0.36, 0], [0.07, 0.12, 0.1], 90, 1.3, (q) => q[0] > -0.2 && q[2] < 0.6 && q[1] > 0.25, 0.08, 0.0065, GRZYWA, krew * 0.9, 0.0);
  kepkiElipsoida(kark, [0.1, -0.56, 0], [0.1, 0.06, 0.12], 70, 4.1, (q) => q[2] < 0.55 && q[1] > -0.2 && q[1] < 0.6, 0.06, 0.006, GRZYWA, 0, 0.5);
  const kolce: Prym[] = [];
  for (let i = 0; i < 9; i++) {
    const u = i / 8, x = mix(0.04, -0.36, u), wys = mix(0.075, 0.035, u) * (i % 2 ? 0.75 : 1) * (0.85 + 0.3 * los(i + 0.5));
    const pod = T(x, -0.6 + 0.02 * u, 0);
    const sr = T(x - 0.012, -0.6 - wys * 0.55, 0), kon = T(x - 0.04, -0.6 - wys, 0);
    kolce.push(gol({ typ: 1, a: pod, b: sr, r1: 0.019 * (1 - u * 0.35), r2: 0.011 * (1 - u * 0.35), k: 0.012, mat: MAT.rog, kol: ROG }));
    kolce.push(gol({ typ: 1, a: sr, b: kon, r1: 0.011 * (1 - u * 0.35), r2: 0.0012, k: 0.004, mat: MAT.rog, kol: [ROG[0] * 2.2, ROG[1] * 2, ROG[2] * 1.8] }));
  }
  const ogon: Prym[] = [];
  {
    const sw = p.ogon * 0.06 + Math.sin(t * 1.3) * 0.02 * (kam ? 0 : 1), sm = p.bicz;
    const pk: P2[] = [[-0.36, -0.52], [-0.47, -0.62], [-0.62, -0.62], [-0.72, -0.48], [-0.71, -0.33], [-0.63, -0.26]];
    const pt = (u: number): P2 => {
      const n = pk.length - 1, f = Math.min(n - 1e-6, u * n), i0 = Math.floor(f), tt = f - i0;
      const a = pk[Math.max(0, i0 - 1)], b = pk[i0], c = pk[Math.min(n, i0 + 1)], d = pk[Math.min(n, i0 + 2)];
      const cr = (k: number): number => 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * tt + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * tt * tt + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * tt * tt * tt);
      return [cr(0) + sw * u * u + sm * 0.8 * u * u, cr(1) - sm * 0.25 * Math.sin(u * Math.PI)];
    };
    let prev = T(pt(0)[0], pt(0)[1], 0);
    const n = 18;
    for (let i = 1; i <= n; i++) {
      const u = i / n, q = pt(u);
      const cur = T(q[0], q[1], 0.04 * Math.sin(u * 3 + t * 1.5 * (kam ? 0 : 1)));
      ogon.push(gol({ typ: 1, a: prev, b: cur, r1: mix(0.045, 0.005, (i - 1) / n), r2: mix(0.045, 0.003, u), k: 0.01, mat: MAT.luski, kol: LUSKI }));
      prev = cur;
    }
  }

  // ---------------------------------------------------------------- łapy
  const krok = 0.12 * p.krok, unies = 0.055 * p.krok;
  const stopa = (x0: number, faza: number, przednia: boolean): P2 => {
    if (lez > 0.5) return przednia ? [x0 * SX + 0.2, 0] : [x0 * SX + 0.22, 0];
    const s = Math.sin(p.faza + faza), c = Math.cos(p.faza + faza);
    let x = x0 * SX + s * krok + dx * 0.5;
    let y = -Math.max(0, c) * unies;
    if (przednia && p.deba > 0) { const q = T(x0 + 0.08, -0.15, 0); x = mix(x, q[0], p.deba); y = mix(y, Math.min(0, q[1]), p.deba); }
    return [x, y];
  };
  const lapa = (out: Prym[], f: P2, z: number, kr: number, s: number): void => {
    out.push(sk({ typ: 2, a: [f[0] + 0.012 * s, f[1] - 0.025 * s, z], b: [0.043 * s, 0.027 * s, 0.042 * s], r1: 0, r2: 0, k: 0.02 }, CZARNY, kr));
    for (let i = 0; i < 4; i++) {
      const zz = z + (i - 1.5) * 0.021 * s, sr = 1 - Math.abs(i - 1.5) * 0.3, xx = f[0] + (0.036 + sr * 0.01) * s;
      out.push(sk({ typ: 2, a: [xx, f[1] - 0.019 * s, zz], b: [0.02 * s, 0.019 * s, 0.0125 * s], r1: 0, r2: 0.25, k: 0.01 }, CZARNY, kr));
      const p0: V3 = [xx + 0.012 * s, f[1] - 0.022 * s, zz], p1: V3 = [xx + 0.026 * s, f[1] - 0.012 * s, zz], p2: V3 = [xx + 0.034 * s, f[1] + 0.001, zz];
      out.push(gol({ typ: 1, a: p0, b: p1, r1: 0.0068 * s, r2: 0.0046 * s, k: 0.003, mat: MAT.rog, kol: PAZUR }));
      out.push(gol({ typ: 1, a: p1, b: p2, r1: 0.0046 * s, r2: 0.001, k: 0.002, mat: MAT.rog, kol: PAZUR }));
    }
  };
  const lapaPrzednia = (z: number, bark: V3, f: P2): Prym[] => {
    const out: Prym[] = [];
    const nadg: P2 = [f[0] - 0.02, f[1] - 0.085];
    const lok = staw([bark[0], bark[1]], nadg, 0.17, 0.2, 1);
    out.push(sk({ typ: 1, a: bark, b: [lok[0], lok[1], z], r1: 0.056, r2: 0.05, k: 0.035, kier: [0, 1, 0] }));
    out.push(sk({ typ: 2, a: [mix(bark[0], lok[0], 0.55) - 0.03, mix(bark[1], lok[1], 0.55), z], b: [0.045, 0.075, 0.042], r1: 0, r2: -0.3, k: 0.03, kier: [0, 1, 0] }));
    out.push(sk({ typ: 1, a: [lok[0] + 0.005, lok[1], z], b: [nadg[0], nadg[1], z], r1: 0.05, r2: 0.03, k: 0.03, kier: [0, 1, 0] }, CZARNY, krew * 0.4));
    out.push(sk({ typ: 2, a: [mix(lok[0], nadg[0], 0.3) + 0.02, mix(lok[1], nadg[1], 0.3), z], b: [0.03, 0.07, 0.034], r1: 0, r2: 0.1, k: 0.02, kier: [0, 1, 0] }, CZARNY, krew * 0.5));
    out.push(sk({ typ: 0, a: [lok[0] - 0.022, lok[1] + 0.005, z], r1: 0.033, k: 0.02, kier: [0, 1, 0] }));
    out.push(sk({ typ: 1, a: [nadg[0], nadg[1], z], b: [f[0] + 0.012, f[1] - 0.03, z], r1: 0.03, r2: 0.029, k: 0.015, kier: [0, 1, 0] }, CZARNY, krew * 0.6));
    lapa(out, f, z, krew * 0.6, 1.15);
    return out;
  };
  const lapaTylna = (z: number, biodro: V3, f: P2): Prym[] => {
    const out: Prym[] = [];
    const piet: P2 = [f[0] - 0.075, f[1] - 0.14];
    const kol = staw([biodro[0], biodro[1]], piet, 0.21, 0.19, -1);
    out.push(sk({ typ: 1, a: biodro, b: [kol[0], kol[1], z], r1: 0.058, r2: 0.048, k: 0.04, kier: [0, 1, 0] }));
    out.push(sk({ typ: 1, a: [kol[0], kol[1], z], b: [piet[0], piet[1], z], r1: 0.042, r2: 0.024, k: 0.025, kier: [0, 1, 0] }));
    out.push(sk({ typ: 2, a: [mix(kol[0], piet[0], 0.3) - 0.027, mix(kol[1], piet[1], 0.3), z], b: [0.036, 0.06, 0.03], r1: 0, r2: -0.4, k: 0.02, kier: [0, 1, 0] }));
    out.push(sk({ typ: 1, a: [mix(kol[0], piet[0], 0.4) - 0.032, mix(kol[1], piet[1], 0.4), z], b: [piet[0] - 0.013, piet[1], z], r1: 0.014, r2: 0.013, k: 0.012, kier: [0, 1, 0] }));
    out.push(sk({ typ: 1, a: [piet[0], piet[1], z], b: [f[0] + 0.006, f[1] - 0.03, z], r1: 0.027, r2: 0.026, k: 0.015, kier: [0, 1, 0] }));
    lapa(out, f, z, 0, 1.05);
    return out;
  };
  const lPD = lapaPrzednia(0.105, T(0.2, -0.44, 0.08), stopa(0.19, 0, true));
  const lPB = lapaPrzednia(-0.105, T(0.22, -0.43, -0.08), stopa(0.24, Math.PI, true));
  const lTD = lapaTylna(0.09, T(-0.29, -0.45, 0.065), stopa(-0.34, Math.PI, false));
  const lTB = lapaTylna(-0.09, T(-0.27, -0.45, -0.065), stopa(-0.28, 0, false));

  // ---------------------------------------------------------------- głowy na szyjach (wachlarz)
  const szyje: Prym[][][] = [], glowy: Prym[][][] = [];
  for (let i = 0; i < 3; i++) {
    const g: GlowaCerbera = p.glowy[i];
    const r = RASY[i];
    const L = r.L;
    const kot = rig.kotwice[i], kat = rig.katy[i];
    const H = (x: number, y: number, z: number): V3 => punktGlowy(i, kot, kat, x, y, z);
    const otw = g.paszcza, szcz = otw * 0.85, w = Math.min(1, otw * 1.4);
    const zaw: P2 = [0.3, 0.1];
    const J = (x: number, y: number, z: number): V3 => { const [rx, ry] = obr(x - zaw[0], y - zaw[1], szcz); return H(zaw[0] + rx, zaw[1] + ry, z); };
    const dl = r.dl, kw = r.kw, cz = r.czaszka, pol = r.policzki;
    const wstecz: V3 = [-Math.cos(kat), -Math.sin(kat) + 0.25, 0];
    const fk = r.futro, fj = r.futroJ;
    const wl = kam ? 0 : 0.006;
    const E = (c: V3, rr: V3, rot: number, kol: V3, k = 0.025, kr = 0): Prym => sk({ typ: 2, a: c, b: [rr[0] * L, rr[1] * L, rr[2] * L], r1: 0, r2: kat + rot, k, kier: wstecz, wlos: wl }, kol, kr);
    const S = (a: V3, b: V3, r1: number, r2: number, kol: V3, k = 0.02, kr = 0): Prym => sk({ typ: 1, a, b, r1: r1 * L, r2: r2 * L, k, kier: wstecz, wlos: wl }, kol, kr);
    const szyja: Prym[] = [], twarz: Prym[] = [], pysk: Prym[] = [], uszy: Prym[] = [], kudly: Prym[] = [], rekaw: Prym[] = [];

    // szyja: rdzeń, grzebień karku, gardło
    const ns = rig.nasady[i];
    const glKon = rig.konce[i];
    const osN = norm([glKon[0] - ns[0], glKon[1] - ns[1], glKon[2] - ns[2]]);
    const gora: V3 = norm([osN[1], -osN[0], 0]).map((v, k) => (k === 1 ? -Math.abs(v) : v)) as V3;
    const dN = Math.hypot(glKon[0] - ns[0], glKon[1] - ns[1], glKon[2] - ns[2]);
    const sN = dodaj(dodaj(ns, osN, dN * 0.5), [-0.015, -0.025, 0]);
    szyja.push(sk({ typ: 1, a: ns, b: sN, r1: 0.08, r2: 0.064, k: 0.025, kier: [-0.6, 0.8, 0] }, fk));
    szyja.push(sk({ typ: 1, a: sN, b: glKon, r1: 0.064, r2: 0.05, k: 0.025, kier: [-0.6, 0.8, 0] }, fk));
    szyja.push(sk({ typ: 1, a: dodaj(ns, gora, 0.035), b: dodaj(sN, gora, 0.03), r1: 0.05, r2: 0.045, k: 0.02, kier: [-0.6, 0.8, 0] }, fk));
    szyja.push(sk({ typ: 1, a: dodaj(sN, gora, 0.03), b: H(0.06, -0.1, 0), r1: 0.045, r2: 0.04, k: 0.02, kier: [-0.6, 0.8, 0] }, fk));
    szyja.push(sk({ typ: 1, a: dodaj(ns, gora, -0.03), b: H(0.32, 0.17, 0), r1: 0.05, r2: 0.034, k: 0.025, kier: [-0.6, 0.8, 0] }, i === 0 ? fj : fk, krew * 0.6));
    szyja.push(sk({ typ: 2, a: dodaj(sN, [0, 0.01, -0.05]), b: [dN * 0.38, 0.03, 0.03], r1: 0, r2: Math.atan2(osN[1], osN[0]) + 0.15, k: 0.02, kier: [-0.6, 0.8, 0] }, fk));
    szyja.push(sk({ typ: 2, a: dodaj(sN, [0, 0.01, 0.05]), b: [dN * 0.38, 0.03, 0.03], r1: 0, r2: Math.atan2(osN[1], osN[0]) + 0.15, k: 0.02, kier: [-0.6, 0.8, 0] }, fk));
    // kudłata grzywa na dolnej połowie szyi (rękaw) + kilka strzępów
    rekaw.push({ typ: 1, a: dodaj(ns, gora, 0.005), b: dodaj(sN, gora, 0.006), r1: 0.082, r2: 0.066, k: 0.04, mat: M(MAT.grzywa), kol: K(i === 1 ? fk : GRZYWA), krew: krew * 0.5, wlos: kam ? 0 : 0.006, kier: dodaj(osN, [0, 1.2, 0], -0.6) });
    if (false) {
      const os = norm([glKon[0] - ns[0], glKon[1] - ns[1], glKon[2] - ns[2]]);
      const p1 = norm([-os[1], os[0], 0]), p2: V3 = [0, 0, 1];
      const ile = i === 1 ? 60 : 40;
      for (let j = 0; j < ile; j++) {
        const fi = (j / ile) * Math.PI * 2 * 3 + i, tt = 0.08 + 0.55 * los(j * 1.7 + i * 9);
        const rr = mix(0.075, 0.055, tt);
        const kier: V3 = [Math.cos(fi) * p1[0] + Math.sin(fi) * p2[0], Math.cos(fi) * p1[1] + Math.sin(fi) * p2[1], Math.cos(fi) * p1[2] + Math.sin(fi) * p2[2]];
        if (kier[2] > 0.6) continue;
        const pkt = dodaj(dodaj(ns, os, tt * 0.3), kier, rr);
        const v = 0.7 + 0.6 * los(j * 2.3 + i);
        const kol = i === 1 ? fk : GRZYWA;
        kepka(kudly, pkt, [kier[0] * 0.5 - os[0] * 0.5, kier[1] * 0.3 + 0.7, kier[2] * 0.5], (i === 1 ? 0.095 : 0.075) * (0.7 + 0.6 * los(j * 4.1 + i)), 0.0075, [kol[0] * v, kol[1] * v, kol[2] * v], krew * los(j + i * 3) * 0.8);
      }
    }

    // mózgoczaszka, grzebień, potylica, łuki jarzmowe i policzki, łuki brwiowe
    twarz.push(E(H(0.28, -0.04, 0), cz, 0, fk, 0.02));
    twarz.push(S(H(0.06, -0.15, 0), H(0.42, -0.19, 0), 0.04, 0.05, fk, 0.03));
    for (const s of [-1, 1]) {
      twarz.push(E(H(0.33, 0.05, s * 0.12 * pol), [0.16, 0.12, 0.075 * pol], 0.15, fk, 0.04));
      twarz.push(S(H(0.3, -0.035, s * Math.min(0.15 * pol, 0.17)), H(0.5, -0.05, s * 0.115), 0.03, 0.025, fk, 0.03));
      twarz.push(E(H(0.5, -0.15, s * (i === 2 ? 0.1 : 0.085)), i === 2 ? [0.085, 0.055, 0.07] : [0.07, 0.042, 0.05], -0.2, i === 0 ? fj : fk, 0.015));
    }
    // kufa: grzbiet nosa, trzon, poduszki wąsów
    twarz.push(S(H(0.48, -0.13, 0), H(dl - 0.05, -0.1, 0), 0.05, 0.04, fk, 0.02));
    twarz.push(S(H(0.5, -0.05, 0), H(dl - 0.08, -0.04, 0), r.kh0, r.kh1, fk, 0.03, krew * 0.4));
    for (const s of [-1, 1]) twarz.push(E(H(dl - 0.21, 0.0, s * kw * 0.75), [0.2, r.kh1 * 0.95, kw * 0.6], 0.04, fj, 0.02, krew * 0.6));
    // zmarszczki warczenia na grzbiecie kufy
    if (w > 0.15) for (let j = 0; j < 3; j++) twarz.push(E(H(0.62 + j * 0.09, -0.11 - 0.012 * w, 0), [0.03, 0.006 + 0.01 * w, kw * 1.1], 0.35, fk, 0.02));
    // nos z nozdrzami
    twarz.push(gol({ typ: 2, a: H(dl, -0.075, 0), b: [0.062 * L, 0.056 * L, 0.072 * L], r1: 0, r2: kat - 0.25, k: 0.012, mat: MAT.skora, kol: NOS }));
    for (const s of [-1, 1]) twarz.push({ typ: 4, a: H(dl + 0.055, -0.07, s * 0.03), r1: 0.02 * L, k: 0.006, mat: MAT.skora, kol: NOS });
    twarz.push({ typ: 4, a: H(dl + 0.04, -0.015, 0), r1: 0.012 * L, k: 0.004, mat: MAT.skora, kol: NOS });
    // oczy z powiekami
    for (const s of [-1, 1]) {
      const [ox, oy, oz] = r.oko;
      const o = H(ox, oy, s * oz);
      twarz.push({ typ: 0, a: o, r1: 0.032 * L, k: 0.003, mat: MAT.oko, kol: kam && g.oczy < 0.05 ? KAMIEN : OKO });
      twarz.push(E(H(ox + 0.01, oy - 0.027, s * (oz + 0.007)), [0.055, 0.02, 0.035], -0.35, fk, 0.006));
      twarz.push(E(H(ox, oy + 0.025, s * (oz + 0.008)), [0.05, 0.016, 0.03], 0.2, fk, 0.006));
    }

    // fafle (warga górna) z czarną krawędzią, dziąsła, podniebienie
    const yf = mix(0.035, -0.035, w);
    for (const s of [-1, 1]) {
      pysk.push(E(H(mix(0.5, dl, 0.55), yf, s * kw * 0.95), [(dl - 0.5) * 0.5, 0.058 * r.fafle, 0.03], -0.25 * w, i === 1 ? fj : fk, 0.012, krew));
      pysk.push(gol({ typ: 1, a: H(0.5, yf + 0.06, s * 0.075), b: H(dl - 0.04, yf + 0.05 - 0.05 * w, s * kw * 0.85), r1: 0.012 * L, r2: 0.011 * L, k: 0.006, mat: MAT.skora, kol: WARGA, krew: krew * 0.6 }));
      pysk.push(gol({ typ: 1, a: H(0.52, 0.062, s * 0.072), b: H(dl - 0.06, 0.05, s * kw * 0.7), r1: 0.028 * L, r2: 0.024 * L, k: 0.008, mat: MAT.dziasla, kol: DZIASLA, krew: krew * 0.4 }));
    }
    pysk.push(gol({ typ: 2, a: H(0.65, 0.07, 0), b: [0.28 * L, 0.035 * L, kw * 0.9 * L], r1: 0, r2: kat, k: 0.012, mat: MAT.dziasla, kol: GARDLO }));
    // zęby górne: kły, siekacze, przedtrzonowce (łamaną: nasada → środek → szpic)
    const zab = (a: V3, b: V3, c: V3, r1: number): void => {
      pysk.push(gol({ typ: 1, a, b, r1: r1 * L, r2: r1 * 0.68 * L, k: 0.003, mat: MAT.zab, kol: ZAB, krew: krew * 0.35 }));
      pysk.push(gol({ typ: 1, a: b, b: c, r1: r1 * 0.68 * L, r2: 0.0025 * L, k: 0.002, mat: MAT.zab, kol: ZAB, krew: krew * 0.35 }));
    };
    for (const s of [-1, 1]) {
      zab(H(dl - 0.15, 0.06, s * kw * 0.72), H(dl - 0.155, 0.14, s * kw * 0.7), H(dl - 0.175, 0.22 + 0.015 * i, s * kw * 0.66), 0.025);
      for (let j = 0; j < 3; j++) {
        const x = 0.56 + j * 0.085;
        zab(H(x, 0.07, s * 0.07), H(x + 0.005, 0.1, s * 0.069), H(x + 0.012, 0.13 + (j === 0 ? 0.025 : 0), s * 0.068), 0.016);
      }
    }
    for (let j = 0; j < 6; j++) { const z = (j - 2.5) * kw * 0.2; zab(H(dl - 0.055, 0.05, z), H(dl - 0.055, 0.08, z), H(dl - 0.06, 0.105, z), 0.009); }
    // żuchwa: trzon, gałęzie, broda, warga dolna, dziąsła, zęby
    pysk.push(S(J(0.26, 0.15, 0), J(dl - 0.15, 0.12, 0), 0.062, 0.04, i === 0 ? fj : fk, 0.02, krew * 0.45));
    for (const s of [-1, 1]) pysk.push(S(J(0.3, 0.135, s * 0.072), J(dl - 0.17, 0.115, s * kw * 0.58), 0.036, 0.026, i === 0 ? fj : fk, 0.015, krew * 0.35));
    pysk.push(sk({ typ: 0, a: J(dl - 0.14, 0.145, 0), r1: 0.04 * L, k: 0.02, kier: wstecz, wlos: wl }, i === 0 ? fj : fk, krew * 0.5));
    for (const s of [-1, 1]) {
      pysk.push(gol({ typ: 1, a: J(0.48, 0.095, s * 0.072), b: J(dl - 0.1, 0.09, s * kw * 0.6), r1: 0.011 * L, r2: 0.01 * L, k: 0.006, mat: MAT.skora, kol: WARGA, krew: krew * 0.6 }));
      pysk.push(gol({ typ: 1, a: J(0.5, 0.088, s * 0.064), b: J(dl - 0.11, 0.084, s * kw * 0.55), r1: 0.022 * L, r2: 0.02 * L, k: 0.006, mat: MAT.dziasla, kol: DZIASLA, krew: krew * 0.5 }));
      zab(J(dl - 0.18, 0.085, s * kw * 0.58), J(dl - 0.172, 0.02, s * kw * 0.6), J(dl - 0.16, -0.035, s * kw * 0.62), 0.021);
      for (let j = 0; j < 3; j++) { const x = 0.55 + j * 0.09; zab(J(x, 0.09, s * 0.062), J(x + 0.004, 0.065, s * 0.062), J(x + 0.01, 0.04, s * 0.061), 0.014); }
    }
    for (let j = 0; j < 6; j++) { const z = (j - 2.5) * kw * 0.17; zab(J(dl - 0.12, 0.085, z), J(dl - 0.118, 0.065, z), J(dl - 0.115, 0.045, z), 0.0085); }
    // język: w żuchwie; przy otwartej paszczy wywala się bokiem i zwisa
    const jw = Math.max(0, otw - 0.35) / 0.65;
    const kol0 = Math.sin(t * 3 + i) * 0.05 * jw;
    const jp: V3[] = [J(0.38, 0.1, 0), J(0.58, 0.097, 0), J(mix(dl - 0.26, dl, jw), mix(0.095, 0.15, jw), mix(0, -0.05, jw)), J(mix(dl - 0.21, dl + 0.06 + kol0, jw), mix(0.095, 0.25 + 0.03 * i, jw), mix(0, -0.07, jw)), J(mix(dl - 0.17, dl + 0.05 + kol0 * 2, jw), mix(0.095, 0.36 + 0.04 * i, jw), mix(0, -0.07, jw))];
    for (let j = 0; j < jp.length - 1; j++) pysk.push(gol({ typ: 1, a: jp[j], b: jp[j + 1], r1: mix(0.055, 0.045, j / 4) * L, r2: mix(0.053, 0.04, (j + 1) / 4) * L, k: 0.012, mat: MAT.jezyk, kol: JEZYK, krew: krew * 0.3 }));
    if (!kam) {
      const sl = 0.25 + 0.2 * Math.sin(t * 2 + i);
      const s0 = H(0.72, yf + 0.08, -kw * 1.0), s1 = H(0.73, yf + 0.08 + sl, -kw * 1.0);
      pysk.push({ typ: 1, a: s0, b: s1, r1: 0.01 * L, r2: 0.005 * L, k: 0.008, mat: MAT.slina, kol: krew > 0.5 ? [0.3, 0.03, 0.025] : SLINA });
      if (otw > 0.3) for (const zz of [-0.05, 0.04]) pysk.push({ typ: 1, a: H(dl - 0.3, 0.1, zz), b: J(dl - 0.3, 0.1, zz), r1: 0.007 * L, r2: 0.005 * L, k: 0.006, mat: MAT.slina, kol: SLINA });
    }

    // uszy
    for (const s of [-1, 1]) {
      const wt = -0.35 * w;
      if (r.ucho === 'przyciete') {
        uszy.push(S(H(0.17, -0.2, s * 0.12), H(0.18, -0.3, s * 0.125), 0.06, 0.055, fk, 0.02));
        uszy.push(E(H(0.15, -0.4, s * 0.125), [0.085, 0.2, 0.022], -0.12 + wt, fk, 0.012));
        uszy.push(gol({ typ: 2, a: H(0.18, -0.4, s * 0.115), b: [0.055 * L, 0.15 * L, 0.01 * L], r1: 0, r2: kat - 0.12 + wt, k: 0.004, mat: MAT.skora, kol: [0.07, 0.03, 0.03] }));
        uszy.push(S(H(0.11, -0.56, s * 0.13), H(0.05, -0.72, s * 0.13), 0.04, 0.003, fk, 0.008));
      } else if (r.ucho === 'wilcze') {
        uszy.push({ ...E(H(0.15, -0.31, s * 0.15), [0.1, 0.16, 0.026], -0.3 + wt, fk, 0.015), wlos: kam ? 0 : 0.012 });
        uszy.push(S(H(0.1, -0.42, s * 0.16), H(0.03, -0.53, s * 0.165), 0.04, 0.003, fk, 0.008));
        uszy.push(E(H(0.17, -0.3, s * 0.13), [0.06, 0.11, 0.012], -0.3 + wt, WILK_J, 0.004));
      } else {
        uszy.push(E(H(0.14, -0.27, s * 0.17), [0.06, 0.11, 0.02], -0.35 + wt, fk, 0.012));
        uszy.push(S(H(0.11, -0.36, s * 0.175), H(0.06, -0.45, s * 0.18), 0.03, 0.003, fk, 0.006));
      }
    }
    // kryza wilka: kudły na policzkach i pod gardłem
    if (r.kryza > 0) {
      for (const s of [-1, 1]) kudly.push({ typ: 2, a: H(0.24, 0.06, s * 0.12), b: [0.16 * L, 0.18 * L, 0.1 * L], r1: 0, r2: kat + 0.3, k: 0.03, mat: M(MAT.grzywa), kol: K(WILK_J), krew: krew * 0.4, wlos: kam ? 0 : 0.016, kier: [-Math.cos(kat) * 0.8, 0.6, s * 0.3] });
      kudly.push({ typ: 2, a: H(0.25, 0.18, 0), b: [0.19 * L, 0.13 * L, 0.16 * L], r1: 0, r2: kat + 0.2, k: 0.03, mat: M(MAT.grzywa), kol: K(WILK_J), krew: krew * 0.6, wlos: kam ? 0 : 0.018, kier: [-0.3, 1, 0] });
    }
    if (false) {
      for (let j = 0; j < 50; j++) {
        const s = j % 2 ? 1 : -1, u = los(j * 3.3), v = los(j * 5.1);
        if (s > 0 && v > 0.5) continue;
        const pkt = H(0.18 + u * 0.22, 0.02 + v * 0.18, s * (0.16 + 0.03 * v));
        const kier: V3 = [-Math.cos(kat) * 0.6, 0.6 + 0.3 * v, s * 0.5];
        const jas = 0.8 + 0.5 * los(j * 7.7);
        kepka(kudly, pkt, kier, 0.085 * (0.7 + 0.6 * u), 0.0075, [WILK_J[0] * jas, WILK_J[1] * jas, WILK_J[2] * jas], krew * v * 0.6);
      }
    }
    szyje.push([szyja, rekaw]);
    glowy.push([kudly, twarz, pysk, uszy].filter((q) => q.length));
  }
  const cialo = [tulow, grzywa, kark, kolce, lPD, lPB, lTD, lTB];
  const grupy: Prym[][] = [...cialo, ogon];
  for (let i = 0; i < 3; i++) grupy.push(...szyje[i], ...glowy[i]);
  return { grupy, oczy: rig.oczy, paszcze: rig.paszcze, obroza: rig.obroza, brzuch: rig.brzuch, czesci: { cialo, ogon: [ogon], szyje, glowy }, rig };
}

/** Rzut punktu modelu na ekran (jednostki) przy kamerze `yaw`. */
function rzutX(p: V3, yaw: number): number { return p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw); }

/**
 * Rysuje Cerbera w 3D: stopy w (0, 0) bieżącego układu `ctx`, wysokość `h` px. Zwraca punkty (w px, w tym samym
 * układzie) albo null, gdy WebGL2 nie działa (wtedy wołający rysuje po staremu, w 2D). `kadr` (jednostki,
 * [x0, y0, x1, y1]) zawęża render do wycinka — do zbliżeń.
 */
export function rysujCerbera3d(ctx: CanvasRenderingContext2D, h: number, p: PozaCerbera, jakosc = 1, kadr?: [number, number, number, number]): PunktyCerbera | null {
  const m = modelCerbera(p);
  const yaw = YAW_CERBERA;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const g of m.grupy) for (const q of g) {
    if (q.typ >= 3) continue;
    const pts: V3[] = q.b && q.typ !== 2 ? [q.a, q.b] : [q.a];
    const r = (q.typ === 2 && q.b ? Math.max(...q.b) : Math.max(q.r1, q.r2 ?? 0)) + (q.wlos ?? 0);
    for (const pt of pts) {
      const x = rzutX(pt, yaw);
      x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, pt[1] - r); y1 = Math.max(y1, pt[1] + r);
    }
  }
  const zap = 0.02;
  x0 -= zap; x1 += zap; y0 -= zap; y1 += zap * 0.4;
  if (kadr) { x0 = Math.max(x0, kadr[0]); y0 = Math.max(y0, kadr[1]); x1 = Math.min(x1, kadr[2]); y1 = Math.min(y1, kadr[3]); }
  const skala = Math.min(h * jakosc, 4000);
  const r = renderuj3d(m.grupy, { x0, y0, w: x1 - x0, h: y1 - y0, skala, yaw, czas: p.czas, swiatlo: 1, ziarno: 3.7, jakosc: JAKOSC_3D.wartosc, bloto: -0.07, mokry: 0.7 });
  if (!r) return null;
  if (!kadr) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.ellipse(-0.04 * h, 0, 0.55 * h, 0.045 * h, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  nalozRender(ctx, r, x0 * h, y0 * h, (x1 - x0) * h, (y1 - y0) * h);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  m.oczy.forEach((o, i) => {
    const g = p.glowy[i];
    if (g.oczy <= 0.02) return;
    const x = rzutX(o, yaw) * h, y = o[1] * h, R = h * 0.022 * (0.7 + 0.5 * g.oczy);
    const gg = ctx.createRadialGradient(x, y, 0, x, y, R);
    gg.addColorStop(0, p.swiatlo > 0.3 ? `rgba(255,220,140,${0.3 * g.oczy})` : `rgba(255,70,20,${0.35 * g.oczy})`); gg.addColorStop(1, 'rgba(160,0,0,0)');
    ctx.fillStyle = gg; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  });
  ctx.restore();
  const pz = (q: V3): P2 => [rzutX(q, yaw) * h, q[1] * h];
  return { obroza: pz(m.obroza), paszcze: [pz(m.paszcze[0]), pz(m.paszcze[1]), pz(m.paszcze[2])], brzuch: pz(m.brzuch) };
}
