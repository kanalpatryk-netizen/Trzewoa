/**
 * ŻARŁOK W 3D (Krąg Trzeci, beta) — po uwadze użytkownika (15.11): „popraw wygląd ludzi, którzy są mało realistyczni,
 * a ich rany tym bardziej; rany zadane człowiekowi po rozszarpaniu przez Cerbera są nieporównywalnie mniejsze, niż
 * powinny być”.
 *
 * Nagi, obrzmiały potępiony (pieśń VI: żarłocy leżą w błocie pod deszczem): blada, brudna, mokra skóra z żyłkami,
 * wielki brzuch z fałdem nad łonem, obwisłe piersi, boczki, tłuste uda i ramiona, podwójny podbródek, zlepione
 * włosy, otwarte w krzyku usta. Części w układach stawów — tak samo jak w rysunku 2D (render/ludzik.ts), żeby gra
 * składała z nich postać w dowolnej pozie: tułów (od biodra w górę), głowa (od nasady szyi), ramię, przedramię
 * z dłonią, udo, podudzie ze stopą (kończyny w dół od stawu).
 * Rany są duże i dosłowne: tułów rozerwany w pasie (górna i dolna połowa — poszarpany przekrój z tłuszczem, mięsem
 * i kręgosłupem, wywleczone jelita), rozpruty brzuch z wypływającymi trzewiami, oderwana głowa z kikutem szyi,
 * kikuty kończyn z kością, kupa trzewi. Przekroje są pochylone ku widzowi, żeby było je widać z boku.
 * Jednostka = wzrost stojącego; x — przód (twarz), y — w dół, z — w głąb (od widza).
 */
import { MAT, type Prym, type V3 } from './gl3d';

const SKORA: V3 = [0.21, 0.175, 0.15];
const WLOSY: V3 = [0.03, 0.022, 0.017];
const BIALKO: V3 = [0.55, 0.5, 0.42];
const TECZOWKA: V3 = [0.03, 0.025, 0.02];
const WARGI: V3 = [0.22, 0.1, 0.09];
const GARDLO: V3 = [0.09, 0.012, 0.012];
const ZEBY: V3 = [0.55, 0.48, 0.34];
const PAZNOKIEC: V3 = [0.32, 0.26, 0.2];
const JELITA: V3 = [0.36, 0.2, 0.18];
const KOSC: V3 = [0.75, 0.68, 0.55];

export interface OpcjeZarloka {
  /** krew na skórze 0…1, otwarte usta 0…1, brzuch 0…1 (obżarstwo), czas (s) do kołysania trzewi */
  krew?: number; usta?: number; brzuch?: number; czas?: number;
}

type O = Partial<Prym> & { typ: number; a: V3; r1: number };
const los = (n: number): number => {
  let h = Math.imul(((n * 1000) | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function skora(o: O, kr: number): Prym { return { k: 0.03, mat: MAT.cialo, kol: SKORA, krew: kr, ...o }; }
function E(c: V3, r: V3, rot: number, kr: number, k = 0.03): Prym { return skora({ typ: 2, a: c, b: r, r1: 0, r2: rot, k }, kr); }
function S(a: V3, b: V3, r1: number, r2: number, kr: number, k = 0.03): Prym { return skora({ typ: 1, a, b, r1, r2, k }, kr); }

/** Łańcuch jelit: pętle od `a` w dół i w bok; `dl` — długość, `kol` — kołysanie. */
function jelita(out: Prym[], a: V3, dl: number, r: number, ziarno: number, kol = 0, kier: V3 = [0, 1, 0]): void {
  let p: V3 = a;
  const n = 14;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const wij = Math.sin(u * 9 + ziarno) * 0.035 + Math.sin(u * 4.3 + ziarno * 2) * 0.02;
    const q: V3 = [a[0] + kier[0] * dl * u + wij + kol * u * u, a[1] + kier[1] * dl * u + Math.sin(u * 7 + ziarno) * 0.012, a[2] + Math.cos(u * 6 + ziarno) * 0.03 - 0.02 * u];
    out.push({ typ: 1, a: p, b: q, r1: r * (1 - 0.15 * u), r2: r * (1 - 0.15 * u), k: 0.006, mat: MAT.jelita, kol: JELITA, krew: 0.25 + 0.4 * los(i + ziarno) });
    p = q;
  }
}

/** Kręgosłup: kręgi jako krótkie kości z przerwami. */
function kregi(out: Prym[], a: V3, b: V3, r: number): void {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 0.7) / n;
    const p0: V3 = [a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0, a[2] + (b[2] - a[2]) * u0];
    const p1: V3 = [a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1, a[2] + (b[2] - a[2]) * u1];
    out.push({ typ: 1, a: p0, b: p1, r1: r, r2: r, k: 0.004, mat: MAT.kosc, kol: KOSC, krew: 0.55 });
  }
}

/** Tułów: biodro w (0, 0), nasada szyi w (0.01, −0.34). */
export function tulowZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0, b = o.brzuch ?? 0.85;
  const t: Prym[] = [
    E([-0.01, -0.035, 0], [0.095, 0.075, 0.125], 0, kr),
    E([-0.068, -0.025, -0.05], [0.066, 0.072, 0.06], 0.2, kr, 0.025),
    E([-0.068, -0.025, 0.05], [0.066, 0.072, 0.06], 0.2, kr, 0.025),
    E([0.035 + 0.025 * b, -0.125, 0], [0.095 + 0.035 * b, 0.115, 0.122], -0.1, kr, 0.04),
    E([0.06 + 0.03 * b, -0.05, 0], [0.065 + 0.025 * b, 0.042, 0.1], 0.15, kr, 0.022),
    E([-0.005, -0.255, 0], [0.085, 0.098, 0.112], 0.1, kr, 0.04),
    E([0.052, -0.245, -0.05], [0.045, 0.046, 0.042], -0.4, kr, 0.025),
    E([0.052, -0.245, 0.05], [0.045, 0.046, 0.042], -0.4, kr, 0.025),
    S([-0.052, -0.09, 0], [-0.045, -0.3, 0], 0.07, 0.078, kr, 0.05),
    E([-0.005, -0.085, -0.1], [0.07, 0.05, 0.04], 0.1, kr, 0.03),
    E([-0.005, -0.085, 0.1], [0.07, 0.05, 0.04], 0.1, kr, 0.03),
    skora({ typ: 0, a: [0.005, -0.31, -0.105], r1: 0.047, k: 0.035 }, kr),
    skora({ typ: 0, a: [0.005, -0.31, 0.105], r1: 0.047, k: 0.035 }, kr),
    S([0, -0.3, 0], [0.012, -0.355, 0], 0.056, 0.046, kr, 0.04),
    { typ: 4, a: [0.128 + 0.06 * b, -0.105, -0.01], r1: 0.009, k: 0.006, mat: MAT.cialo, kol: SKORA },
    { typ: 0, a: [0.09, -0.235, -0.045], r1: 0.007, k: 0.004, mat: MAT.skora, kol: WARGI },
    // kręgosłup (niewidoczny — barwi przekrój na kość)
    { typ: 5, a: [-0.065, 0, 0], b: [-0.055, -0.34, 0], r1: 0.016, mat: MAT.kosc, kol: KOSC },
    { typ: 5, a: [-0.03, -0.04, -0.06], b: [-0.03, -0.04, 0.06], r1: 0.02, mat: MAT.kosc, kol: KOSC },
  ];
  return t;
}

/** Głowa: nasada szyi w (0, 0), czubek ok. (0, −0.2). */
export function glowaZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0, u = o.usta ?? 0.4;
  const zu = 0.028 * u;   // opuszczenie żuchwy
  const g: Prym[] = [
    S([0, 0, 0], [0.006, -0.065, 0], 0.05, 0.045, kr, 0.03),
    E([-0.004, -0.122, 0], [0.071, 0.079, 0.065], 0, kr, 0.03),
    E([0.032, -0.1, 0], [0.05, 0.045, 0.054], 0.2, kr, 0.03),
    E([0.03, -0.068 + zu * 0.6, 0], [0.05, 0.03 + zu * 0.3, 0.05], 0.25, kr, 0.025),
    E([0.018, -0.042 + zu * 0.5, 0], [0.055, 0.032, 0.058], 0.1, kr, 0.03),
    S([0.066, -0.118, 0], [0.083, -0.092, 0], 0.01, 0.0145, kr, 0.012),
    E([0.057, -0.13, 0], [0.02, 0.011, 0.046], -0.15, kr, 0.015),
    E([0.05, -0.098, -0.035], [0.024, 0.02, 0.022], 0.2, kr, 0.015),
    E([0.05, -0.098, 0.035], [0.024, 0.02, 0.022], 0.2, kr, 0.015),
    E([-0.006, -0.106, -0.064], [0.013, 0.022, 0.008], 0.1, kr, 0.008),
    E([-0.006, -0.106, 0.064], [0.013, 0.022, 0.008], 0.1, kr, 0.008),
    // oczodoły, oczy (zmętniałe), nozdrza
    { typ: 4, a: [0.062, -0.113, -0.026], r1: 0.0135, k: 0.008, mat: MAT.cialo, kol: SKORA },
    { typ: 4, a: [0.062, -0.113, 0.026], r1: 0.0135, k: 0.008, mat: MAT.cialo, kol: SKORA },
    { typ: 0, a: [0.056, -0.113, -0.026], r1: 0.0095, k: 0.002, mat: MAT.zab, kol: BIALKO },
    { typ: 0, a: [0.056, -0.113, 0.026], r1: 0.0095, k: 0.002, mat: MAT.zab, kol: BIALKO },
    { typ: 0, a: [0.064, -0.113, -0.027], r1: 0.0042, k: 0.001, mat: MAT.skora, kol: TECZOWKA },
    { typ: 4, a: [0.086, -0.088, -0.006], r1: 0.0045, k: 0.003, mat: MAT.cialo, kol: SKORA },
    // usta: wargi, ciemne gardło, zęby (krzyk)
    { typ: 1, a: [0.066, -0.08, -0.018], b: [0.074, -0.078, 0.018], r1: 0.006, r2: 0.006, k: 0.006, mat: MAT.skora, kol: WARGI, krew: kr },
    { typ: 1, a: [0.064, -0.064 + zu, -0.016], b: [0.071, -0.062 + zu, 0.016], r1: 0.006, r2: 0.006, k: 0.006, mat: MAT.skora, kol: WARGI, krew: kr },
    { typ: 2, a: [0.07, -0.072 + zu * 0.5, 0], b: [0.012, 0.004 + zu * 0.45, 0.016], r1: 0, r2: 0.15, k: 0.004, mat: MAT.dziasla, kol: GARDLO },
    { typ: 4, a: [0.078, -0.072 + zu * 0.5, 0], r1: 0.006 + zu * 0.4, k: 0.004, mat: MAT.dziasla, kol: GARDLO },
    { typ: 1, a: [0.071, -0.0765, -0.012], b: [0.075, -0.0755, 0.012], r1: 0.0035, r2: 0.0035, k: 0.002, mat: MAT.zab, kol: ZEBY },
  ];
  // zlepione włosy: czepiec z długim, tłustym włosem z tyłu i na czubku
  g.push({ typ: 2, a: [-0.016, -0.135, 0], b: [0.067, 0.07, 0.064], r1: 0, r2: -0.2, k: 0.012, mat: MAT.wlosy, kol: WLOSY, wlos: 0.012, kier: [-0.6, 0.8, 0] });
  for (let i = 0; i < 14; i++) {
    const a = 2.2 + (i / 13) * 2.4, zz = ((i * 7) % 5 - 2) * 0.022;
    const r: V3 = [-0.016 + Math.cos(a) * 0.058, -0.135 + Math.sin(a) * 0.064, zz];
    const k: V3 = [r[0] - 0.008 + 0.012 * los(i + 3), r[1] + 0.05 + 0.035 * los(i + 7), zz * 1.1];
    g.push({ typ: 1, a: r, b: k, r1: 0.0075, r2: 0.0015, k: 0.008, mat: MAT.wlosy, kol: WLOSY, kier: [k[0] - r[0], k[1] - r[1], 0] });
  }
  return g;
}

/** Ramię: bark w (0, 0), łokieć w (0, 0.17). */
export function ramieZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0;
  return [
    S([0, 0, 0], [0, 0.17, 0], 0.043, 0.032, kr, 0.03),
    E([0.004, 0.035, 0], [0.046, 0.05, 0.046], 0, kr, 0.03),
    E([0.013, 0.095, 0], [0.028, 0.05, 0.032], 0, kr, 0.025),
    E([-0.014, 0.085, 0], [0.032, 0.06, 0.034], 0, kr, 0.025),
  ];
}

/** Przedramię z dłonią: łokieć w (0, 0), nadgarstek ok. (0, 0.125), koniec palców ok. (0, 0.2). */
export function przedramieZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0;
  const p: Prym[] = [
    S([0, 0, 0], [0, 0.125, 0], 0.031, 0.021, kr, 0.025),
    E([0.006, 0.035, 0], [0.026, 0.045, 0.03], 0, kr, 0.02),
    E([0.004, 0.15, 0], [0.014, 0.028, 0.027], 0.05, kr, 0.012),
  ];
  for (let i = 0; i < 4; i++) {
    const z = (i - 1.5) * 0.012;
    const a: V3 = [0.006, 0.172, z], b: V3 = [0.012, 0.193 - Math.abs(i - 1.5) * 0.004, z], c: V3 = [0.02, 0.205 - Math.abs(i - 1.5) * 0.006, z];
    p.push(S(a, b, 0.0062, 0.0055, kr, 0.006), S(b, c, 0.0055, 0.0048, kr, 0.004));
    p.push({ typ: 0, a: [c[0] + 0.002, c[1] + 0.001, z], r1: 0.0042, k: 0.002, mat: MAT.rog, kol: PAZNOKIEC });
  }
  p.push(S([0.012, 0.142, -0.022], [0.022, 0.168, -0.028], 0.0075, 0.0058, kr, 0.008));
  return p;
}

/** Udo: biodro w (0, 0), kolano w (0, 0.25). */
export function udoZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0;
  return [
    S([0, 0, 0], [0, 0.25, 0], 0.07, 0.044, kr, 0.03),
    E([0.012, 0.09, 0], [0.05, 0.1, 0.06], 0, kr, 0.035),
    skora({ typ: 0, a: [0.008, 0.25, 0], r1: 0.043, k: 0.02 }, kr),
  ];
}

/** Podudzie ze stopą: kolano w (0, 0), kostka ok. (0, 0.215), stopa ku +x. */
export function podudzieZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0;
  const p: Prym[] = [
    S([0, 0, 0], [0, 0.205, 0], 0.041, 0.026, kr, 0.025),
    E([-0.018, 0.07, 0], [0.031, 0.065, 0.035], 0, kr, 0.025),
    skora({ typ: 0, a: [0, 0.215, 0], r1: 0.026, k: 0.015 }, kr),
    E([0.032, 0.236, 0], [0.052, 0.017, 0.03], 0.05, kr, 0.015),
    E([-0.012, 0.232, 0], [0.024, 0.02, 0.025], 0, kr, 0.012),
  ];
  for (let i = 0; i < 5; i++) {
    const z = (i - 2) * 0.011;
    p.push(skora({ typ: 0, a: [0.082 - Math.abs(i - 1.5) * 0.004, 0.243, z], r1: i === 0 ? 0.0085 : 0.0065, k: 0.006 }, kr));
  }
  return p;
}

// ---------------------------------------------------------------- rany

/** Rozdarcie w pasie: górna połowa (od pasa w górę) — przekrój pochylony ku widzowi, wywleczone jelita i kręgosłup. */
export function tulowGora(o: OpcjeZarloka = {}): { grupy: Prym[][]; ciecie: { n: V3; d: number; szarp: number } } {
  const t = tulowZarloka({ ...o, krew: Math.max(0.45, o.krew ?? 0) });
  const w: Prym[] = [];
  kregi(w, [-0.06, -0.15, 0], [-0.07, -0.055, -0.005], 0.0115);
  const kol = Math.sin((o.czas ?? 0) * 3) * 0.02;
  jelita(w, [0.03, -0.12, -0.02], 0.2, 0.0115, 1.3, kol);
  jelita(w, [0.0, -0.12, 0.01], 0.15, 0.0105, 4.1, -kol, [0.3, 1, 0]);
  jelita(w, [0.06, -0.12, -0.03], 0.11, 0.012, 7.7, kol * 0.5, [0.5, 0.8, 0]);
  w.push({ typ: 2, a: [0.02, -0.105, -0.01], b: [0.06, 0.02, 0.07], r1: 0, r2: 0.1, k: 0.02, mat: MAT.mieso, kol: [0.32, 0.03, 0.025], krew: 1 });
  return { grupy: [t, w], ciecie: { n: norm([0, 1, -0.55]), d: -0.112, szarp: 0.03 } };
}

/** Rozdarcie w pasie: dolna połowa (miednica z nogami) — przekrój ku widzowi, trzewia wylewają się w górę i na bok. */
export function tulowDol(o: OpcjeZarloka = {}): { grupy: Prym[][]; ciecie: { n: V3; d: number; szarp: number } } {
  const t = tulowZarloka({ ...o, krew: Math.max(0.45, o.krew ?? 0) });
  const w: Prym[] = [];
  kregi(w, [-0.06, -0.06, 0], [-0.068, -0.16, -0.005], 0.0115);
  jelita(w, [0.02, -0.1, -0.03], 0.16, 0.0115, 2.2, 0, [0.9, -0.2, 0]);
  jelita(w, [0.05, -0.1, 0.0], 0.12, 0.011, 5.5, 0, [0.6, 0.5, 0]);
  w.push({ typ: 2, a: [0.02, -0.105, -0.01], b: [0.06, 0.025, 0.07], r1: 0, r2: 0.1, k: 0.02, mat: MAT.mieso, kol: [0.32, 0.03, 0.025], krew: 1 });
  return { grupy: [t, w], ciecie: { n: norm([0, -1, -0.55]), d: 0.085, szarp: 0.03 } };
}

/** Rozpruty brzuch: wielka rana w brzuchu, trzewia wylewają się na ziemię. */
export function tulowRozpruty(o: OpcjeZarloka = {}): Prym[][] {
  const t = tulowZarloka({ ...o, krew: Math.max(0.5, o.krew ?? 0) });
  const b = o.brzuch ?? 0.85;
  t.push({ typ: 3, a: [0.12 + 0.05 * b, -0.12, -0.03], r1: 0.07, k: 0.02, mat: MAT.mieso, kol: [0.32, 0.03, 0.025] });
  t.push({ typ: 3, a: [0.1 + 0.05 * b, -0.07, -0.05], r1: 0.05, k: 0.02, mat: MAT.mieso, kol: [0.32, 0.03, 0.025] });
  const w: Prym[] = [];
  jelita(w, [0.1 + 0.04 * b, -0.13, -0.04], 0.24, 0.0125, 3.3, 0.03, [0.35, 1, 0]);
  jelita(w, [0.09 + 0.04 * b, -0.1, -0.02], 0.18, 0.012, 6.1, -0.02, [0.6, 0.9, 0]);
  jelita(w, [0.11 + 0.04 * b, -0.08, -0.06], 0.13, 0.013, 9.4, 0.01, [0.2, 1, 0]);
  return [t, w];
}

/** Oderwana głowa z poszarpanym kikutem szyi (przekrój ku widzowi: mięso, kręgi, tchawica). */
export function glowaOderwana(o: OpcjeZarloka = {}): { grupy: Prym[][]; ciecie: { n: V3; d: number; szarp: number } } {
  const g = glowaZarloka({ ...o, krew: Math.max(0.5, o.krew ?? 0), usta: o.usta ?? 0.8 });
  g.push({ typ: 5, a: [-0.02, 0.02, 0], b: [-0.012, -0.08, 0], r1: 0.011, mat: MAT.kosc, kol: KOSC });
  const w: Prym[] = [];
  kregi(w, [-0.02, -0.03, 0], [-0.024, 0.03, -0.01], 0.009);
  w.push({ typ: 1, a: [0.012, -0.02, -0.01], b: [0.018, 0.028, -0.02], r1: 0.006, r2: 0.005, k: 0.004, mat: MAT.mieso, kol: [0.34, 0.06, 0.05], krew: 1 });
  for (let i = 0; i < 4; i++) w.push({ typ: 1, a: [-0.03 + i * 0.02, -0.015, -0.02], b: [-0.028 + i * 0.02 + (los(i) - 0.5) * 0.02, 0.02 + 0.02 * los(i + 2), -0.03], r1: 0.006, r2: 0.0015, k: 0.004, mat: MAT.mieso, kol: [0.3, 0.03, 0.025], krew: 1 });
  return { grupy: [g, w], ciecie: { n: norm([0, 1, -0.6]), d: -0.012, szarp: 0.018 } };
}

/** Kikut kończyny (bark albo biodro): krótki kawałek z przekrojem ku widzowi i sterczącą kością. */
export function kikutZarloka(noga: boolean): { grupy: Prym[][]; ciecie: { n: V3; d: number; szarp: number } } {
  const r = noga ? 0.07 : 0.045;
  const k: Prym[] = [S([0, 0, 0], [0, noga ? 0.07 : 0.05, 0], r, r * 0.92, 1, 0.02)];
  k.push({ typ: 5, a: [0, -0.02, 0], b: [0, 0.1, 0], r1: r * 0.28, mat: MAT.kosc, kol: KOSC });
  const w: Prym[] = [{ typ: 1, a: [0.002, 0.02, -0.005], b: [0.006, noga ? 0.1 : 0.08, -0.012], r1: r * 0.25, r2: r * 0.2, k: 0.004, mat: MAT.kosc, kol: KOSC, krew: 0.6 }];
  for (let i = 0; i < 5; i++) w.push({ typ: 1, a: [(i - 2) * r * 0.35, noga ? 0.05 : 0.035, -0.01], b: [(i - 2) * r * 0.4, (noga ? 0.07 : 0.05) + 0.015 + 0.02 * los(i + 9), -0.02], r1: r * 0.13, r2: 0.002, k: 0.004, mat: MAT.mieso, kol: [0.3, 0.03, 0.025], krew: 1 });
  return { grupy: [k, w], ciecie: { n: norm([0, 1, -0.6]), d: noga ? 0.045 : 0.032, szarp: 0.012 } };
}

/** Kupa trzewi na ziemi (szczątki): splątane jelita we krwi. */
export function kupaTrzewi(): Prym[][] {
  const w: Prym[] = [];
  for (let i = 0; i < 4; i++) jelita(w, [-0.08 + i * 0.05, -0.02 - 0.01 * (i % 2), -0.02 + i * 0.01], 0.14, 0.012 + 0.002 * (i % 2), i * 2.7 + 1, 0, [i % 2 ? 1 : -0.4, 0.15, 0]);
  w.push({ typ: 2, a: [0, 0.0, 0], b: [0.1, 0.015, 0.06], r1: 0, r2: 0, k: 0.02, mat: MAT.mieso, kol: [0.25, 0.02, 0.02], krew: 1 });
  return [w];
}

function norm(v: V3): V3 { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
