/**
 * WYPIEK CERBERA (narzędzie, tylko `npm run dev`): renderuje części modelu 3D (render/cerber3d.ts) do obrazków,
 * z których gra składa Cerbera w biegu (render/cerber-sprite.ts). Render 3D jest za wolny, by liczyć go w każdej
 * klatce, więc liczymy raz, w wysokiej jakości: ciało w klatkach chodu, stawania dęba, przysiadu, leżenia (i z kamienia),
 * ogon, trzy szyje i trzy głowy w kilku kątach i rozwarciach paszczy. Prowadzi to `scripts/wypiek-cerbera.mjs`.
 *
 * `window.wypiecz(zadanie)` zwraca PNG (data:) przycięty do treści i położenie lewego górnego rogu w jednostkach
 * modelu względem punktu zaczepienia części (ciało: stopy; ogon: nasada; szyja: nasada; głowa: kotwica głowy).
 */
import { modelCerbera, rigCerbera, YAW_CERBERA, KAT_BAZOWY } from '../render/cerber3d';
import { renderuj3d, type Prym, type V3 } from '../render/gl3d';
import { pozaCerbera, type PozaCerbera } from '../render/cerber';
import * as Z from '../render/czlowiek3d';

export interface Zadanie {
  nazwa: string;
  czesc: 'cialo' | 'ogon' | 'szyja' | 'glowa' | 'zarlok' | 'kikut' | 'odcieta';
  /** dla żarłoka: część ciała albo rana (render/czlowiek3d.ts), krew, usta, ciemniejsza (dalsza kończyna) */
  element?: string; krew?: number; usta?: number; ciemny?: boolean;
  /** numer szyi / głowy (0 — doberman, 1 — wilk, 2 — pitbull) */
  nr?: number;
  /** piksele na jednostkę (wysokość Cerbera) */
  S: number;
  poza?: Partial<Omit<PozaCerbera, 'glowy'>>;
  /** dla głowy: kąt (radiany, jak `kat` w modelu) i rozwarcie paszczy */
  kat?: number; paszcza?: number;
}

export interface Wynik { png: string; x0: number; y0: number; S: number; w: number; h: number }

let YAW = YAW_CERBERA;
const rzutX = (p: V3): number => p[0] * Math.cos(YAW) + p[2] * Math.sin(YAW);
/** Kąt kamery dla żarłoków: prawie z boku, trochę od przodu (brzuch, twarz). */
const YAW_ZARLOKA = 0.3;

function przesun(gr: Prym[][], o: V3): Prym[][] {
  const m = (q: V3): V3 => [q[0] - o[0], q[1] - o[1], q[2] - o[2]];
  return gr.map((g) => g.map((q) => ({ ...q, a: m(q.a), b: q.b && q.typ === 1 ? m(q.b) : q.b })));
}

function kadr(gr: Prym[][]): [number, number, number, number] {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const g of gr) for (const q of g) {
    if (q.typ >= 3) continue;
    const pts: V3[] = q.b && q.typ === 1 ? [q.a, q.b] : [q.a];
    const r = (q.typ === 2 && q.b ? Math.max(...q.b) : Math.max(q.r1, q.r2 ?? 0)) + (q.wlos ?? 0) + Math.abs(q.amp ?? 0) + 0.01;
    for (const p of pts) {
      const x = rzutX(p);
      x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, p[1] - r); y1 = Math.max(y1, p[1] + r);
    }
  }
  return [x0, y0, x1, y1];
}

function zarlok(z: Zadanie): { gr: Prym[][]; ciecie?: { n: V3; d: number; szarp: number }; bloto: number } {
  const o = { krew: z.krew ?? 0, usta: z.usta ?? 0.3, czas: 1 };
  switch (z.element) {
    case 'tulow': return { gr: [Z.tulowZarloka(o)], bloto: -0.07 };
    case 'glowa': return { gr: [Z.glowaZarloka(o)], bloto: 99 };
    case 'ramie': return { gr: [Z.ramieZarloka(o)], bloto: 99 };
    case 'przedramie': return { gr: [Z.przedramieZarloka(o)], bloto: 0.13 };
    case 'udo': return { gr: [Z.udoZarloka(o)], bloto: 99 };
    case 'podudzie': return { gr: [Z.podudzieZarloka(o)], bloto: 0.12 };
    case 'tulow-gora': { const w = Z.tulowGora(o); return { gr: w.grupy, ciecie: w.ciecie, bloto: 99 }; }
    case 'tulow-dol': { const w = Z.tulowDol(o); return { gr: w.grupy, ciecie: w.ciecie, bloto: -0.07 }; }
    case 'tulow-rozpruty': return { gr: Z.tulowRozpruty(o), bloto: -0.07 };
    case 'glowa-oderwana': { const w = Z.glowaOderwana(o); return { gr: w.grupy, ciecie: w.ciecie, bloto: 99 }; }
    case 'kikut-reki': { const w = Z.kikutZarloka(false); return { gr: w.grupy, ciecie: w.ciecie, bloto: 99 }; }
    case 'kikut-nogi': { const w = Z.kikutZarloka(true); return { gr: w.grupy, ciecie: w.ciecie, bloto: 99 }; }
    default: return { gr: Z.kupaTrzewi(), bloto: 99 };
  }
}

function wypiecz(z: Zadanie): Wynik | null {
  if (z.czesc === 'zarlok') {
    YAW = YAW_ZARLOKA;
    const { gr, ciecie, bloto } = zarlok(z);
    // piekielne światło: słabe, zimne z góry (burza), czerwona łuna od dołu zostaje — potępieni nie świecą jak w atelier
    return doObrazka(gr, z.S, { czas: 1000, swiatlo: z.ciemny ? 0.4 : 0.62, bloto, ciecie });
  }
  YAW = YAW_CERBERA;
  if (z.czesc === 'kikut' || z.czesc === 'odcieta') return sciete(z);
  const p: PozaCerbera = Object.assign(pozaCerbera(), { czas: 1000, oddech: 0.5 }, z.poza ?? {});
  p.glowy.forEach((g) => { g.oczy = p.kamien > 0.5 ? 0 : 1; g.paszcza = 0.15; });
  const nr = z.nr ?? 0;
  if (z.czesc === 'glowa') {
    p.deba = 0; p.lezy = 0;
    p.glowy[nr].pochyl = (z.kat ?? KAT_BAZOWY[nr]) - KAT_BAZOWY[nr];
    p.glowy[nr].paszcza = z.paszcza ?? 0.15;
  }
  const m = modelCerbera(p);
  const rig = rigCerbera(p);
  let gr: Prym[][];
  let bloto = 99;
  if (z.czesc === 'cialo') { gr = m.czesci.cialo; bloto = -0.07; }
  else if (z.czesc === 'ogon') gr = przesun(m.czesci.ogon, rig.ogonBaza);
  else if (z.czesc === 'szyja') gr = przesun(m.czesci.szyje[nr], rig.nasady[nr]);
  else gr = przesun(m.czesci.glowy[nr], rig.kotwice[nr]);
  return doObrazka(gr, z.S, { czas: p.czas, swiatlo: 1, bloto });
}

/**
 * Ścięcie głowy (Krąg Trzeci, 16.11): kikut szyi — szyja ucięta w połowie, przekrój pochylony ku widzowi (futro, mięso,
 * kręgi); ścięta głowa — z kawałkiem szyi, paszcza rozwarta, oczy zgasłe. Kikut zaczepiony w nasadzie szyi, głowa
 * w swojej kotwicy (jak zwykłe części).
 */
function sciete(z: Zadanie): Wynik | null {
  const nr = z.nr ?? 0;
  const p: PozaCerbera = Object.assign(pozaCerbera(), { czas: 1000, oddech: 0.5, krew: 1 });
  p.glowy.forEach((g) => { g.oczy = 1; g.paszcza = 0.15; });
  if (z.czesc === 'odcieta') p.glowy[nr].paszcza = 0.62;
  const m = modelCerbera(p, { martweOczy: z.czesc === 'odcieta' });
  const rig = rigCerbera(p);
  const a = rig.nasady[nr], b = rig.konce[nr];
  const dl = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const os: V3 = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl, (b[2] - a[2]) / dl];
  const ciecie: V3 = [a[0] + os[0] * dl * 0.5, a[1] + os[1] * dl * 0.5, a[2] + os[2] * dl * 0.5];
  const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const dot = (u: V3, v: V3): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  if (z.czesc === 'kikut') {
    const n = norm([os[0], os[1], os[2] - 0.6]);
    const gr = przesun(m.czesci.szyje[nr], a);
    return doObrazka(gr, z.S, { czas: 1000, swiatlo: 1, bloto: 99, ciecie: { n, d: dot([ciecie[0] - a[0], ciecie[1] - a[1], ciecie[2] - a[2]], n), szarp: 0.012 } });
  }
  const kot = rig.kotwice[nr];
  const n = norm([-os[0], -os[1], -os[2] - 0.6]);
  const gr = przesun([...m.czesci.glowy[nr], ...m.czesci.szyje[nr]], kot);
  return doObrazka(gr, z.S, { czas: 1000, swiatlo: 1, bloto: 99, ciecie: { n, d: dot([ciecie[0] - kot[0], ciecie[1] - kot[1], ciecie[2] - kot[2]], n), szarp: 0.012 } });
}

function doObrazka(gr: Prym[][], S: number, o: { czas: number; swiatlo: number; bloto: number; ciecie?: { n: V3; d: number; szarp: number } }): Wynik | null {
  const [x0, y0, x1, y1] = kadr(gr);
  const r = renderuj3d(gr, { x0, y0, w: x1 - x0, h: y1 - y0, skala: S, yaw: YAW, czas: o.czas, swiatlo: o.swiatlo, ziarno: 3.7, jakosc: 1, bloto: o.bloto, mokry: 0.7, ciecie: o.ciecie });
  if (!r) return null;
  const c = document.createElement('canvas');
  c.width = r.w; c.height = r.h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(r.c, 0, r.c.height - r.h, r.w, r.h, 0, 0, r.w, r.h);
  // przytnij do treści (alfa > 1/255) z marginesem 2 px
  const d = ctx.getImageData(0, 0, r.w, r.h).data;
  let l = r.w, t = r.h, pr = -1, dl = -1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    if (d[(y * r.w + x) * 4 + 3] > 1) { if (x < l) l = x; if (x > pr) pr = x; if (y < t) t = y; if (y > dl) dl = y; }
  }
  if (pr < 0) return null;
  l = Math.max(0, l - 2); t = Math.max(0, t - 2); pr = Math.min(r.w - 1, pr + 2); dl = Math.min(r.h - 1, dl + 2);
  const w = pr - l + 1, h = dl - t + 1;
  const wy = document.createElement('canvas');
  wy.width = w; wy.height = h;
  wy.getContext('2d')!.drawImage(c, l, t, w, h, 0, 0, w, h);
  return { png: wy.toDataURL('image/png'), x0: x0 + l / S, y0: y0 + t / S, S, w, h };
}

declare global { interface Window { wypiecz?: typeof wypiecz; gotowe?: boolean } }
window.wypiecz = wypiecz;
window.gotowe = true;
