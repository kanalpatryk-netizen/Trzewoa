/**
 * POTĘPIONY W 3D (Krąg Trzeci, beta). Uwagi użytkownika: (15.11) „popraw wygląd ludzi, którzy są mało realistyczni,
 * a ich rany tym bardziej”, (16.11) „ludzi chcę jeszcze bardziej realistycznych, dodaj jeszcze więcej gore”.
 *
 * Nagi, ciężki żarłok w deszczu (pieśń VI), zbudowany jak prawdziwe ciało, nie jak bałwan z kul:
 *  - proporcje człowieka (głowa ~1/7,5 wzrostu, ramię, przedramię i dłoń, udo, podudzie i stopa we właściwych
 *    długościach), punkty orientacyjne: obojczyki i dołek szyjny, mięśnie mostkowo-obojczykowe, mostek, ciężkie piersi
 *    z brodawkami, żebra pod tłuszczem, brzuch wiszący nad łonem z pępkiem, boczki, łopatki, pośladki, naramienne,
 *    bicepsy i tricepsy, łokcie, przedramiona, nadgarstki, dłonie z kłykciami, palcami i paznokciami, rzepki, łydki,
 *    kostki, pięty, stopy z palcami;
 *  - twarz: czoło, łuki brwiowe, oczodoły, gałki oczne (przekrwione białka, tęczówki, źrenice) pod górną i dolną
 *    powieką z workami pod oczami, nos z grzbietem, czubkiem i skrzydełkami, kości policzkowe, obwisłe policzki
 *    i podwójny podbródek, wargi, zęby, gardło przy otwartych ustach, żuchwa z kątami, uszy z małżowiną i płatkiem;
 *  - włosy mokre, zlepione w strąki przylegające do czaszki i karku (nie sterczą), brwi, kilkudniowy zarost;
 *  - skóra żywa: tułów blady i żółtawy, twarz, uszy, dłonie, łokcie, kolana i stopy czerwieńsze (krew pod skórą).
 * Części w układach stawów, jak w rysunku 2D (render/ludzik.ts), żeby gra składała z nich postać w dowolnej pozie:
 * tułów (od biodra w górę), głowa (od nasady szyi), ramię, przedramię z dłonią, udo, podudzie ze stopą.
 * Rany duże i dosłowne: tułów rozerwany w pasie (górna i dolna połowa — poszarpany przekrój z tłuszczem, mięsem
 * i kręgosłupem, wywleczone jelita), rozpruty brzuch z wypływającymi trzewiami, oderwana głowa z kikutem szyi,
 * kikuty kończyn z kością, kupa trzewi. Przekroje pochylone ku widzowi, żeby było je widać z boku.
 * Jednostka = wzrost stojącego; x — przód (twarz), y — w dół, z — w głąb (od widza).
 */
import { MAT, type Prym, type V3 } from './gl3d';

/** skóra: tułów (blady, żółtawy), twarz i dłonie (czerwieńsze), nos, uszy i policzki (najczerwieńsze) */
const SKORA: V3 = [0.235, 0.172, 0.142];
const SKORA_TW: V3 = [0.25, 0.158, 0.132];
/** zarost: szczęka, broda i warga górna — kilkudniowy cień */
const ZAROST: V3 = [0.165, 0.118, 0.104];
const SKORA_CZ: V3 = [0.275, 0.145, 0.125];
const SKORA_KON: V3 = [0.25, 0.16, 0.135];
const OTOCZKA: V3 = [0.2, 0.1, 0.085];
const WLOSY: V3 = [0.035, 0.026, 0.02];
const BIALKO: V3 = [0.5, 0.4, 0.34];
const TECZOWKA: V3 = [0.07, 0.045, 0.025];
const ZRENICA: V3 = [0.006, 0.005, 0.005];
const WARGI: V3 = [0.24, 0.095, 0.085];
const GARDLO: V3 = [0.1, 0.012, 0.012];
const ZEBY: V3 = [0.5, 0.42, 0.28];
const PAZNOKIEC: V3 = [0.3, 0.22, 0.17];
const JELITA: V3 = [0.36, 0.2, 0.19];
const KOSC: V3 = [0.75, 0.68, 0.55];
const MIESO: V3 = [0.32, 0.03, 0.025];

export interface OpcjeZarloka {
  /** krew na skórze 0…1, otwarte usta 0…1, brzuch 0…1 (obżarstwo), czas (s) do kołysania trzewi */
  krew?: number; usta?: number; brzuch?: number; czas?: number;
}

const los = (n: number): number => {
  let h = Math.imul(((n * 1000) | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

type O = Partial<Prym> & { typ: number; a: V3; r1: number };
function skora(o: O, kr: number, kol: V3 = SKORA): Prym { return { k: 0.03, mat: MAT.cialo, kol, krew: kr, ...o }; }
/** elipsoida skóry: środek, półosie, obrót wokół z, krew, zlanie, barwa */
function E(c: V3, r: V3, rot: number, kr: number, k = 0.03, kol: V3 = SKORA): Prym { return skora({ typ: 2, a: c, b: r, r1: 0, r2: rot, k }, kr, kol); }
/** stożek zaokrąglony skóry */
function S(a: V3, b: V3, r1: number, r2: number, kr: number, k = 0.03, kol: V3 = SKORA): Prym { return skora({ typ: 1, a, b, r1, r2, k }, kr, kol); }
/** kula skóry */
function K(a: V3, r: number, kr: number, k = 0.02, kol: V3 = SKORA): Prym { return skora({ typ: 0, a, r1: r, k }, kr, kol); }
/** wgłębienie (odejmowane bez barwienia) */
function W(a: V3, r: number, k = 0.006): Prym { return { typ: 4, a, r1: r, k, mat: MAT.cialo, kol: SKORA }; }
/** po obu stronach ciała (z i −z) */
function obie(f: (s: number) => Prym | Prym[]): Prym[] { return [f(1), f(-1)].flat(); }

/** Łańcuch jelit: pętle od `a` w dół i w bok; `dl` — długość, `kol` — kołysanie. */
function jelita(out: Prym[], a: V3, dl: number, r: number, ziarno: number, kol = 0, kier: V3 = [0, 1, 0]): void {
  let p: V3 = a;
  const n = 22;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const wij = Math.sin(u * 9 + ziarno) * 0.035 + Math.sin(u * 4.3 + ziarno * 2) * 0.02;
    const q: V3 = [a[0] + kier[0] * dl * u + wij + kol * u * u, a[1] + kier[1] * dl * u + Math.sin(u * 7 + ziarno) * 0.012, a[2] + Math.cos(u * 6 + ziarno) * 0.03 - 0.02 * u];
    // jelito nierówne: przewężenia i wybrzuszenia jak u prawdziwego
    const gr = r * (1 - 0.12 * u) * (0.94 + 0.12 * Math.sin(u * 17 + ziarno));
    out.push({ typ: 1, a: p, b: q, r1: gr, r2: gr, k: 0.008, mat: MAT.jelita, kol: JELITA, krew: 0.7 + 0.3 * los(i + ziarno) });
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

/** Strzępy mięsa i skóry na brzegu rany (od punktu `a`, w kierunku `kier`). */
function strzepy(out: Prym[], a: V3, kier: V3, ile: number, dl: number, r: number, ziarno: number): void {
  for (let i = 0; i < ile; i++) {
    const da = ((i / Math.max(1, ile - 1)) - 0.5) * 2;
    const p: V3 = [a[0] + da * dl * 1.3 * (0.6 + 0.4 * los(ziarno + i)), a[1], a[2] + (los(ziarno + i * 3) - 0.5) * dl];
    const q: V3 = [p[0] + kier[0] * dl * (0.4 + los(ziarno + i * 5)), p[1] + kier[1] * dl * (0.4 + los(ziarno + i * 5)), p[2] + kier[2] * dl * 0.5 - 0.01];
    out.push({ typ: 1, a: p, b: q, r1: r, r2: r * 0.25, k: 0.004, mat: i % 3 === 0 ? MAT.tluszcz : MAT.mieso, kol: i % 3 === 0 ? [0.55, 0.42, 0.2] : MIESO, krew: 1 });
  }
}

// ---------------------------------------------------------------- tułów

/** Tułów: biodro w (0, 0), nasada szyi w (0.01, −0.34). */
export function tulowZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0, b = o.brzuch ?? 0.85;
  const t: Prym[] = [
    // miednica i pośladki
    E([-0.012, -0.04, 0], [0.078, 0.064, 0.102], 0, kr, 0.035),
    ...obie((s) => E([-0.058, -0.022, 0.047 * s], [0.056, 0.066, 0.056], 0.15, kr, 0.03)),
    // brzuch: dolny wisi nad łonem, górny przechodzi w żebra; boczki
    E([0.038 + 0.02 * b, -0.082, 0], [0.072 + 0.022 * b, 0.07, 0.1], 0.35, kr, 0.04),
    E([0.032 + 0.025 * b, -0.148, 0], [0.084 + 0.02 * b, 0.082, 0.106], 0.05, kr, 0.045),
    ...obie((s) => E([-0.012, -0.118, 0.088 * s], [0.06, 0.05, 0.034], 0.1, kr, 0.035)),
    // klatka piersiowa, plecy i łopatki
    E([0.0, -0.238, 0], [0.08, 0.093, 0.104], 0.08, kr, 0.045),
    E([-0.044, -0.24, 0], [0.045, 0.085, 0.094], 0.05, kr, 0.04),
    ...obie((s) => E([-0.062, -0.272, 0.052 * s], [0.022, 0.044, 0.038], 0.2, kr, 0.02)),
    // ciężkie piersi z brodawkami
    ...obie((s) => E([0.056, -0.258, 0.05 * s], [0.038, 0.04, 0.046], -0.45, kr, 0.025)),
    ...obie((s) => K([0.091, -0.243, 0.052 * s], 0.0068, kr, 0.008, OTOCZKA)),
    ...obie((s) => K([0.094, -0.243, 0.052 * s], 0.0035, kr, 0.003, OTOCZKA)),
    // mostek (płytka bruzda między piersiami)
    W([0.083, -0.272, 0], 0.012, 0.02),
    // kaptury: mięsień czworoboczny, barki (naramienne), obojczyki z dołkiem szyjnym
    E([-0.016, -0.326, 0], [0.04, 0.026, 0.082], 0.15, kr, 0.03),
    ...obie((s) => K([0.002, -0.31, 0.106 * s], 0.042, kr, 0.03)),
    ...obie((s) => S([0.042, -0.333, 0.013 * s], [0.012, -0.321, 0.094 * s], 0.0072, 0.0062, kr, 0.012)),
    W([0.047, -0.337, 0], 0.0085, 0.01),
    // nasada szyi
    S([-0.002, -0.305, 0], [0.012, -0.356, 0], 0.048, 0.037, kr, 0.03),
    // pępek: głęboki dołek w fałdzie
    W([0.112 + 0.04 * b, -0.118, -0.004], 0.0075, 0.005),
    E([0.108 + 0.04 * b, -0.112, -0.004], [0.006, 0.003, 0.011], 0, kr, 0.004),
    // kręgosłup i miednica (niewidoczne — barwią przekrój na kość)
    { typ: 5, a: [-0.065, 0, 0], b: [-0.055, -0.34, 0], r1: 0.016, mat: MAT.kosc, kol: KOSC },
    { typ: 5, a: [-0.03, -0.04, -0.06], b: [-0.03, -0.04, 0.06], r1: 0.02, mat: MAT.kosc, kol: KOSC },
  ];
  // żebra pod skórą boków: płytkie, ukośne pasma (widać je, gdy się skręca)
  for (let i = 0; i < 4; i++) {
    const y = -0.2 - i * 0.022;
    t.push(S([-0.02, y, 0.098], [0.045, y + 0.03, 0.088], 0.0055, 0.004, kr, 0.02));
  }
  return t;
}

// ---------------------------------------------------------------- głowa

/** Głowa: nasada szyi w (0, 0), szczyt czaszki ok. (0, −0.18). */
export function glowaZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0, u = o.usta ?? 0.4;
  const zu = 0.024 * u;   // opuszczenie żuchwy
  const g: Prym[] = [
    // szyja: walec z mięśniami mostkowo-obojczykowo-sutkowymi i jabłkiem Adama
    S([0, 0, 0], [0.006, -0.07, 0], 0.031, 0.028, kr, 0.02),
    ...obie((s) => S([0.022, -0.004, 0.012 * s], [-0.004, -0.074, 0.034 * s], 0.0115, 0.0105, kr, 0.016)),
    E([0.03, -0.033, 0], [0.007, 0.01, 0.0075], 0, kr, 0.01),
    // czaszka, czoło, łuki brwiowe, skronie
    E([-0.007, -0.13, 0], [0.053, 0.052, 0.045], 0, kr, 0.02, SKORA_TW),
    E([0.025, -0.14, 0], [0.03, 0.03, 0.04], 0, kr, 0.025, SKORA_TW),
    E([0.045, -0.1255, 0], [0.011, 0.0068, 0.034], -0.1, kr, 0.008, SKORA_TW),
    // kości policzkowe, obwisłe policzki, szczęka (górna warga) i żuchwa z kątami, broda, podwójny podbródek
    ...obie((s) => E([0.035, -0.104, 0.032 * s], [0.02, 0.011, 0.012], 0.1, kr, 0.015, SKORA_TW)),
    ...obie((s) => E([0.032, -0.086 + zu * 0.3, 0.029 * s], [0.021, 0.024, 0.017], 0.1, kr, 0.02, SKORA_CZ)),
    E([0.045, -0.084, 0], [0.017, 0.013, 0.025], 0.1, kr, 0.018, ZAROST),
    E([0.02, -0.064 + zu * 0.6, 0], [0.036, 0.015, 0.039], 0.05, kr, 0.02, ZAROST),
    ...obie((s) => S([-0.003, -0.08, 0.04 * s], [0.03, -0.058 + zu * 0.8, 0.031 * s], 0.011, 0.011, kr, 0.016, ZAROST)),
    E([0.049, -0.058 + zu, 0], [0.012, 0.013, 0.016], 0.1, kr, 0.012, ZAROST),
    E([0.026, -0.052 + zu * 0.5, 0], [0.02, 0.011, 0.024], 0.25, kr, 0.016, SKORA_TW),
    // nos: grzbiet, czubek, skrzydełka, nozdrza
    S([0.053, -0.118, 0], [0.067, -0.097, 0], 0.0052, 0.0072, kr, 0.006, SKORA_TW),
    E([0.068, -0.094, 0], [0.0088, 0.0082, 0.0082], 0, kr, 0.006, SKORA_CZ),
    ...obie((s) => E([0.06, -0.091, 0.0085 * s], [0.0068, 0.0058, 0.0052], 0.2, kr, 0.005, SKORA_CZ)),
    ...obie((s) => W([0.064, -0.0875, 0.0052 * s], 0.0027, 0.002)),
    // oczodoły i gałki oczne: przekrwione białka, brązowe tęczówki, czarne źrenice
    ...obie((s) => ({ typ: 0, a: [0.0405, -0.1143, 0.0168 * s] as V3, r1: 0.0077, k: 0.001, mat: MAT.zab, kol: BIALKO })),
    ...obie((s) => ({ typ: 0, a: [0.0458, -0.1143, 0.0166 * s] as V3, r1: 0.0036, k: 0.0006, mat: MAT.skora, kol: TECZOWKA })),
    ...obie((s) => ({ typ: 0, a: [0.0478, -0.1143, 0.0165 * s] as V3, r1: 0.0018, k: 0.0003, mat: MAT.skora, kol: ZRENICA })),
    // powieki (górna ciężka, opadająca), worki pod oczami
    ...obie((s) => E([0.0442, -0.1219, 0.0168 * s], [0.0068, 0.0041, 0.0102], 0.3, kr, 0.004, SKORA_TW)),
    ...obie((s) => E([0.0432, -0.1072, 0.0168 * s], [0.006, 0.0026, 0.0094], -0.15, kr, 0.004, SKORA_TW)),
    ...obie((s) => E([0.042, -0.1045, 0.0185 * s], [0.0075, 0.0045, 0.0105], -0.1, kr, 0.006, SKORA_CZ)),
    // uszy: małżowina, wgłębienie, płatek
    ...obie((s) => E([-0.008, -0.111, 0.045 * s], [0.0105, 0.0175, 0.0055], 0.2, kr, 0.005, SKORA_CZ)),
    ...obie((s) => W([-0.006, -0.112, 0.0495 * s], 0.0048, 0.002)),
    ...obie((s) => K([-0.005, -0.097, 0.046 * s], 0.0048, kr, 0.004, SKORA_CZ)),
    // usta: wargi, zęby, ciemne gardło (krzyk) — wycięte między wargami
    { typ: 2, a: [0.058, -0.0815, 0], b: [0.0052, 0.0038, 0.0142], r1: 0, r2: 0.15, k: 0.004, mat: MAT.skora, kol: WARGI, krew: kr },
    { typ: 2, a: [0.0555, -0.0738 + zu, 0], b: [0.0052, 0.0042, 0.0132], r1: 0, r2: 0.25, k: 0.004, mat: MAT.skora, kol: WARGI, krew: kr },
    { typ: 1, a: [0.0555, -0.0786, -0.0105], b: [0.0565, -0.0786, 0.0105], r1: 0.0032, r2: 0.0032, k: 0.001, mat: MAT.zab, kol: ZEBY },
  ];
  if (u > 0.08) {
    g.push(W([0.06, -0.0775 + zu * 0.5, 0], 0.0028 + zu * 0.38, 0.003));
    g.push({ typ: 2, a: [0.052, -0.0775 + zu * 0.5, 0], b: [0.008, 0.003 + zu * 0.42, 0.011], r1: 0, r2: 0, k: 0.002, mat: MAT.dziasla, kol: GARDLO });
    g.push({ typ: 1, a: [0.0535, -0.0722 + zu * 0.9, -0.0095], b: [0.0545, -0.0722 + zu * 0.9, 0.0095], r1: 0.0027, r2: 0.0027, k: 0.001, mat: MAT.zab, kol: ZEBY });
  }
  // brwi: krótkie pasma włosa na łukach brwiowych
  for (const s of [1, -1]) {
    g.push({ typ: 1, a: [0.0495, -0.1235, 0.008 * s], b: [0.046, -0.1255, 0.027 * s], r1: 0.0028, r2: 0.0018, k: 0.002, mat: MAT.wlosy, kol: WLOSY, kier: [0, 0, s] });
  }
  // włosy: krótkie, mokre, przylegające do czaszki (zlepione — szorstkie w cieniowaniu), schodzą nisko na kark
  g.push({ typ: 2, a: [-0.016, -0.133, 0], b: [0.0548, 0.0545, 0.0478], r1: 0, r2: -0.12, k: 0.006, mat: MAT.wlosy, kol: WLOSY, wlos: 0.005, kier: [-0.7, 0.7, 0] });
  return g;
}

// ---------------------------------------------------------------- ręce

/** Ramię: bark w (0, 0), łokieć w (0, 0.17). */
export function ramieZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0;
  return [
    S([0, 0, 0], [0, 0.166, 0], 0.039, 0.029, kr, 0.02),
    E([0.003, 0.03, 0], [0.044, 0.05, 0.044], 0, kr, 0.025),
    E([0.014, 0.097, 0], [0.025, 0.046, 0.027], 0, kr, 0.02),
    E([-0.015, 0.085, 0], [0.029, 0.056, 0.03], 0, kr, 0.02),
    E([-0.019, 0.105, 0], [0.022, 0.045, 0.026], 0.1, kr, 0.03),
    K([-0.007, 0.168, 0], 0.025, kr, 0.015, SKORA_KON),
  ];
}

/** Przedramię z dłonią: łokieć w (0, 0), nadgarstek ok. (0, 0.135), koniec palców ok. (0, 0.235). */
export function przedramieZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0;
  const p: Prym[] = [
    S([0, 0, 0], [0, 0.133, 0], 0.029, 0.0185, kr, 0.02),
    E([0.005, 0.04, 0], [0.026, 0.05, 0.029], 0, kr, 0.02),
    K([-0.013, 0.002, 0], 0.016, kr, 0.01, SKORA_KON),
    E([0, 0.135, 0], [0.012, 0.011, 0.021], 0, kr, 0.008, SKORA_KON),
    // śródręcze z kłykciami
    E([0.002, 0.163, 0], [0.011, 0.028, 0.024], 0.05, kr, 0.008, SKORA_KON),
  ];
  // palce: trzy człony, lekko zgięte ku dłoni; paznokcie
  for (let i = 0; i < 4; i++) {
    const z = (i - 1.5) * 0.0118;
    const dl = [0.021, 0.015, 0.012].map((d) => d * (1 - Math.abs(i - 1.3) * 0.08));
    let x = 0.004, y = 0.188, kat = 0.08 + 0.05 * i;
    p.push(K([0.006, 0.187, z], 0.0062, kr, 0.004, SKORA_KON));
    for (let c = 0; c < 3; c++) {
      const x2 = x + Math.sin(kat) * dl[c], y2 = y + Math.cos(kat) * dl[c];
      const r = 0.0056 - c * 0.0007;
      p.push(S([x, y, z], [x2, y2, z], r, r - 0.0004, kr, 0.003, SKORA_KON));
      x = x2; y = y2; kat += 0.22;
    }
    p.push({ typ: 2, a: [x + 0.0028, y - 0.0028, z], b: [0.0016, 0.0046, 0.0038], r1: 0, r2: kat, k: 0.0015, mat: MAT.rog, kol: PAZNOKIEC });
  }
  // kciuk: od nasady dłoni, w bok i do przodu
  p.push(E([0.01, 0.16, -0.02], [0.011, 0.014, 0.009], 0.4, kr, 0.006, SKORA_KON));
  p.push(S([0.013, 0.164, -0.024], [0.024, 0.18, -0.028], 0.0072, 0.0062, kr, 0.004, SKORA_KON));
  p.push(S([0.024, 0.18, -0.028], [0.031, 0.194, -0.029], 0.006, 0.0052, kr, 0.003, SKORA_KON));
  return p;
}

// ---------------------------------------------------------------- nogi

/** Udo: biodro w (0, 0), kolano w (0, 0.25). */
export function udoZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0;
  return [
    S([0, 0, 0], [0, 0.245, 0], 0.067, 0.042, kr, 0.025),
    E([0.017, 0.11, 0], [0.044, 0.098, 0.05], 0, kr, 0.03),
    E([-0.02, 0.12, 0], [0.039, 0.088, 0.046], 0, kr, 0.03),
    E([-0.004, 0.05, 0], [0.06, 0.06, 0.058], 0, kr, 0.03),
    E([0.026, 0.244, 0], [0.013, 0.017, 0.017], 0, kr, 0.012, SKORA_KON),
    K([0.002, 0.25, 0], 0.04, kr, 0.02, SKORA_KON),
  ];
}

/** Podudzie ze stopą: kolano w (0, 0), kostka ok. (0, 0.215), stopa ku +x. */
export function podudzieZarloka(o: OpcjeZarloka = {}): Prym[] {
  const kr = o.krew ?? 0;
  const p: Prym[] = [
    S([0, 0, 0], [0, 0.205, 0], 0.039, 0.021, kr, 0.02),
    E([-0.021, 0.072, 0], [0.029, 0.062, 0.032], 0.05, kr, 0.025),
    S([0.021, 0.022, 0], [0.015, 0.18, 0], 0.0095, 0.0075, kr, 0.016),
    ...obie((s) => K([0.002, 0.206, 0.0155 * s], 0.0115, kr, 0.008, SKORA_KON)),
    E([-0.014, 0.228, 0], [0.019, 0.017, 0.017], 0, kr, 0.012, SKORA_KON),
    E([0.03, 0.236, 0], [0.05, 0.015, 0.026], 0.03, kr, 0.015, SKORA_KON),
    E([0.018, 0.224, 0], [0.034, 0.013, 0.021], 0.1, kr, 0.012, SKORA_KON),
  ];
  // palce stóp: duży i cztery mniejsze, paznokcie
  for (let i = 0; i < 5; i++) {
    const z = (i - 2) * 0.0105 - 0.004;
    const x = 0.083 - Math.abs(i - 0.6) * 0.005;
    p.push(K([x, 0.243, z], i === 0 ? 0.0082 : 0.0062 - i * 0.0003, kr, 0.006, SKORA_KON));
    p.push({ typ: 0, a: [x + 0.004, 0.24, z], r1: i === 0 ? 0.004 : 0.003, k: 0.002, mat: MAT.rog, kol: PAZNOKIEC });
  }
  return p;
}

// ---------------------------------------------------------------- rany

/** Rozdarcie w pasie: górna połowa (od pasa w górę) — przekrój pochylony ku widzowi, wywleczone jelita i kręgosłup. */
export function tulowGora(o: OpcjeZarloka = {}): { grupy: Prym[][]; ciecie: { n: V3; d: number; szarp: number } } {
  const t = tulowZarloka({ ...o, krew: Math.max(0.55, o.krew ?? 0) });
  const w: Prym[] = [];
  kregi(w, [-0.06, -0.15, 0], [-0.07, -0.05, -0.005], 0.0115);
  const kol = Math.sin((o.czas ?? 0) * 3) * 0.02;
  jelita(w, [0.03, -0.12, -0.02], 0.22, 0.0118, 1.3, kol);
  jelita(w, [0.0, -0.12, 0.01], 0.17, 0.0108, 4.1, -kol, [0.3, 1, 0]);
  jelita(w, [0.06, -0.12, -0.03], 0.13, 0.0124, 7.7, kol * 0.5, [0.5, 0.8, 0]);
  w.push({ typ: 2, a: [0.02, -0.105, -0.01], b: [0.06, 0.02, 0.07], r1: 0, r2: 0.1, k: 0.02, mat: MAT.mieso, kol: MIESO, krew: 1 });
  // wątroba wywleczona z brzucha, strzępy skóry i tłuszczu na brzegu
  w.push({ typ: 2, a: [0.075, -0.085, -0.04], b: [0.03, 0.016, 0.026], r1: 0, r2: 0.4, k: 0.01, mat: MAT.jelita, kol: [0.2, 0.035, 0.03], krew: 1 });
  strzepy(w, [0.0, -0.1, -0.06], [0, 1, -0.3], 7, 0.03, 0.006, 11);
  return { grupy: [t, w], ciecie: { n: norm([0, 1, -0.55]), d: -0.112, szarp: 0.034 } };
}

/** Rozdarcie w pasie: dolna połowa (miednica z nogami) — przekrój ku widzowi, trzewia wylewają się w górę i na bok. */
export function tulowDol(o: OpcjeZarloka = {}): { grupy: Prym[][]; ciecie: { n: V3; d: number; szarp: number } } {
  const t = tulowZarloka({ ...o, krew: Math.max(0.55, o.krew ?? 0) });
  const w: Prym[] = [];
  kregi(w, [-0.06, -0.06, 0], [-0.068, -0.165, -0.005], 0.0115);
  jelita(w, [0.02, -0.1, -0.03], 0.18, 0.0118, 2.2, 0, [0.9, -0.2, 0]);
  jelita(w, [0.05, -0.1, 0.0], 0.14, 0.0112, 5.5, 0, [0.6, 0.5, 0]);
  w.push({ typ: 2, a: [0.02, -0.105, -0.01], b: [0.06, 0.025, 0.07], r1: 0, r2: 0.1, k: 0.02, mat: MAT.mieso, kol: MIESO, krew: 1 });
  strzepy(w, [0.0, -0.118, -0.06], [0, -1, -0.3], 7, 0.03, 0.006, 23);
  return { grupy: [t, w], ciecie: { n: norm([0, -1, -0.55]), d: 0.085, szarp: 0.034 } };
}

/** Rozpruty brzuch: wielka rana w brzuchu, trzewia wylewają się na ziemię. */
export function tulowRozpruty(o: OpcjeZarloka = {}): Prym[][] {
  const t = tulowZarloka({ ...o, krew: Math.max(0.6, o.krew ?? 0) });
  const b = o.brzuch ?? 0.85;
  t.push({ typ: 3, a: [0.11 + 0.035 * b, -0.125, -0.03], r1: 0.072, k: 0.02, mat: MAT.mieso, kol: MIESO });
  t.push({ typ: 3, a: [0.095 + 0.035 * b, -0.075, -0.05], r1: 0.052, k: 0.02, mat: MAT.mieso, kol: MIESO });
  const w: Prym[] = [];
  jelita(w, [0.095 + 0.03 * b, -0.13, -0.04], 0.26, 0.013, 3.3, 0.03, [0.35, 1, 0]);
  jelita(w, [0.085 + 0.03 * b, -0.1, -0.02], 0.2, 0.0125, 6.1, -0.02, [0.6, 0.9, 0]);
  jelita(w, [0.105 + 0.03 * b, -0.08, -0.06], 0.15, 0.0135, 9.4, 0.01, [0.2, 1, 0]);
  // płat skóry z tłuszczem odwinięty z brzegu rany
  w.push({ typ: 2, a: [0.15 + 0.03 * b, -0.16, -0.05], b: [0.012, 0.03, 0.03], r1: 0, r2: -0.6, k: 0.006, mat: MAT.tluszcz, kol: [0.55, 0.42, 0.2], krew: 0.9 });
  strzepy(w, [0.12 + 0.03 * b, -0.06, -0.07], [0.3, 1, -0.3], 6, 0.025, 0.0055, 31);
  return [t, w];
}

/** Oderwana głowa z poszarpanym kikutem szyi (przekrój ku widzowi: mięso, kręgi, tchawica). */
export function glowaOderwana(o: OpcjeZarloka = {}): { grupy: Prym[][]; ciecie: { n: V3; d: number; szarp: number } } {
  const g = glowaZarloka({ ...o, krew: Math.max(0.6, o.krew ?? 0), usta: o.usta ?? 0.8 });
  g.push({ typ: 5, a: [-0.02, 0.02, 0], b: [-0.012, -0.08, 0], r1: 0.011, mat: MAT.kosc, kol: KOSC });
  const w: Prym[] = [];
  kregi(w, [-0.02, -0.03, 0], [-0.024, 0.035, -0.01], 0.009);
  // tchawica i przełyk wystają z kikuta, zwisają żyły
  w.push({ typ: 1, a: [0.016, -0.02, -0.01], b: [0.022, 0.03, -0.02], r1: 0.0062, r2: 0.0052, k: 0.004, mat: MAT.kosc, kol: [0.6, 0.5, 0.45], krew: 0.8 });
  w.push({ typ: 1, a: [0.004, -0.02, -0.012], b: [0.008, 0.026, -0.022], r1: 0.005, r2: 0.0045, k: 0.004, mat: MAT.mieso, kol: [0.34, 0.06, 0.05], krew: 1 });
  for (let i = 0; i < 6; i++) w.push({ typ: 1, a: [-0.032 + i * 0.013, -0.015, -0.02], b: [-0.03 + i * 0.013 + (los(i) - 0.5) * 0.02, 0.022 + 0.026 * los(i + 2), -0.03], r1: 0.0058, r2: 0.0014, k: 0.004, mat: i % 3 === 0 ? MAT.tluszcz : MAT.mieso, kol: i % 3 === 0 ? [0.55, 0.42, 0.2] : MIESO, krew: 1 });
  return { grupy: [g, w], ciecie: { n: norm([0, 1, -0.6]), d: -0.012, szarp: 0.02 } };
}

/** Kikut kończyny (bark albo biodro): krótki kawałek z przekrojem ku widzowi i sterczącą kością. */
export function kikutZarloka(noga: boolean): { grupy: Prym[][]; ciecie: { n: V3; d: number; szarp: number } } {
  const r = noga ? 0.067 : 0.042;
  const k: Prym[] = [S([0, 0, 0], [0, noga ? 0.07 : 0.05, 0], r, r * 0.92, 1, 0.02)];
  k.push({ typ: 5, a: [0, -0.02, 0], b: [0, 0.1, 0], r1: r * 0.28, mat: MAT.kosc, kol: KOSC });
  const w: Prym[] = [{ typ: 1, a: [0.002, 0.02, -0.005], b: [0.006, noga ? 0.11 : 0.085, -0.012], r1: r * 0.25, r2: r * 0.18, k: 0.004, mat: MAT.kosc, kol: KOSC, krew: 0.6 }];
  for (let i = 0; i < 6; i++) w.push({ typ: 1, a: [(i - 2.5) * r * 0.3, noga ? 0.05 : 0.035, -0.01], b: [(i - 2.5) * r * 0.36, (noga ? 0.07 : 0.05) + 0.015 + 0.025 * los(i + 9), -0.02], r1: r * 0.13, r2: 0.002, k: 0.004, mat: i % 3 === 0 ? MAT.tluszcz : MAT.mieso, kol: i % 3 === 0 ? [0.55, 0.42, 0.2] : MIESO, krew: 1 });
  return { grupy: [k, w], ciecie: { n: norm([0, 1, -0.6]), d: noga ? 0.045 : 0.032, szarp: 0.014 } };
}

/** Kupa trzewi na ziemi (szczątki): splątane jelita, żołądek i płaty mięsa we krwi. */
export function kupaTrzewi(): Prym[][] {
  const w: Prym[] = [];
  for (let i = 0; i < 5; i++) jelita(w, [-0.09 + i * 0.045, -0.02 - 0.01 * (i % 2), -0.02 + i * 0.01], 0.14, 0.012 + 0.002 * (i % 2), i * 2.7 + 1, 0, [i % 2 ? 1 : -0.4, 0.15, 0]);
  w.push({ typ: 2, a: [0, 0.0, 0], b: [0.1, 0.015, 0.06], r1: 0, r2: 0, k: 0.02, mat: MAT.mieso, kol: [0.25, 0.02, 0.02], krew: 1 });
  w.push({ typ: 2, a: [0.05, -0.022, 0.02], b: [0.032, 0.02, 0.024], r1: 0, r2: 0.3, k: 0.008, mat: MAT.jelita, kol: [0.36, 0.16, 0.15], krew: 0.8 });
  w.push({ typ: 2, a: [-0.06, -0.016, 0.01], b: [0.026, 0.012, 0.02], r1: 0, r2: -0.2, k: 0.008, mat: MAT.jelita, kol: [0.2, 0.035, 0.03], krew: 1 });
  return [w];
}

function norm(v: V3): V3 { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
