import { CIEN, clamp, los, TAU, tonC, type Pkt, type Rgb } from './matma';
import type { Malarz } from './malarz';

/**
 * Tusz — warsztat ilustratora dla krzyżowca (Remake v2): twardy światłocień, kontur o zmiennej grubości,
 * faktury (ziarno płótna, kolczuga) i krew: rozbryzgi, przesiąknięcia, zacieki.
 *
 * Światłocień nie jest gradientem. Część bryły, której nie zasłania jej własna kopia przesunięta ku światłu,
 * leży w cieniu — wychodzi sierp, który idzie za kształtem (fałdą, łokciem, rąbkiem) i ma ostry brzeg,
 * jak cień położony jednym pociągnięciem pędzla. Przesunięcie w drugą stronę daje sierp blasku.
 * Kontur jest grubszy po stronie cienia — tak dociska pióro rysownik.
 */

/** Skąd pada światło lampki: z góry i trochę od przodu (jak w malarzu). */
export const SW: Pkt = { x: 0.45, y: -0.89 };
/** Światło na bryłach ciała krzyżowca: lampka bardziej z przodu — cień kładzie się wzdłuż pleców i tyłu kończyn. */
export const SWB: Pkt = { x: 0.74, y: -0.67 };

/** Światło dla bryły wydłużonej wzdłuż a→b: tylko składowa prostopadła do osi, więc sierp biegnie wzdłuż bryły. */
export function swiatloOsi(a: Pkt, b: Pkt, k: Pkt = SWB): Pkt {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, d = k.x * ux + k.y * uy;
  const px = k.x - d * ux, py = k.y - d * uy, pl = Math.hypot(px, py);
  return pl < 0.25 ? k : { x: px / pl, y: py / pl };
}

export type Styl = string | CanvasGradient | CanvasPattern;
/**
 * Warstwa światłocienia: o ile przesunąć kopię kształtu (+ ku światłu → sierp cienia, − → sierp blasku),
 * czym zalać sierp, z jaką przezroczystością i (gdy inny niż reszta) z jakiego kierunku.
 */
export type Warstwa = readonly [number, Styl, number?, Pkt?];

const DUZO = 1e5;

export const rgba = (k: Rgb, a: number): string => `rgba(${k[0] | 0},${k[1] | 0},${k[2] | 0},${Math.round(clamp(a, 0, 1) * 1000) / 1000})`;

/**
 * Sierpy światłocienia w obrębie kształtu — wszystkie warstwy w jednym obcięciu. `k` — kierunek światła.
 * Kształt złożony z kilku nachodzących brył (ręka: ramię i przedramię) podaj też jako `czesci` —
 * wtedy sierp liczy się od sumy brył, bez szwu w miejscu, gdzie się nakładają.
 */
export function swiatlocien(g: CanvasRenderingContext2D, ksztalt: Path2D, warstwy: readonly Warstwa[], k: Pkt = SW, czesci?: readonly Path2D[], obciete = false): void {
  if (!obciete) { g.save(); g.clip(ksztalt); }
  for (const [d, styl, alfa, kw] of warstwy) {
    if (Math.abs(d) < 0.08) continue;
    const kk = kw ?? k;
    const prz = new DOMMatrix([1, 0, 0, 1, kk.x * d, kk.y * d]);
    g.fillStyle = styl;
    if (alfa !== undefined) g.globalAlpha = alfa;
    if (czesci) {
      g.save();
      for (const c of czesci) { const p = new Path2D(); p.rect(-DUZO, -DUZO, 2 * DUZO, 2 * DUZO); p.addPath(c, prz); g.clip(p, 'evenodd'); }
      g.fill(ksztalt);
      g.restore();
    } else {
      const p = new Path2D();
      p.rect(-DUZO, -DUZO, 2 * DUZO, 2 * DUZO);
      p.addPath(ksztalt, prz);
      g.fill(p, 'evenodd');
    }
    if (alfa !== undefined) g.globalAlpha = 1;
  }
  if (!obciete) g.restore();
}

export const TUSZ = 'rgba(12,8,8,0.92)';

/** Kontur tuszem: cienka kreska dookoła i grubsza po stronie cienia. */
export function tusz(g: CanvasRenderingContext2D, ksztalt: Path2D, h: number, sila = 1, k: Pkt = SWB, czesci?: readonly Path2D[]): void {
  swiatlocien(g, ksztalt, [warstwaTuszu(h, sila)], k, czesci);
  if (!czesci) kreskaTuszu(g, ksztalt, h, sila);
}

/** Warstwa konturu tuszem (grubszego po stronie cienia) — do dołączenia na końcu listy warstw. */
export const warstwaTuszu = (h: number, sila = 1): Warstwa => [Math.max(0.6, h * 0.0062 * sila), TUSZ];
/** Warstwa zimnego kontrświatła tuż przy krawędzi od strony cienia (przed warstwą tuszu). */
export const warstwaKontr = (h: number, sila = 1): Warstwa => [Math.max(1, h * 0.012), `rgba(120,140,170,${0.2 * sila})`];

/** Cienka kreska tuszu dookoła kształtu. */
export function kreskaTuszu(g: CanvasRenderingContext2D, ksztalt: Path2D, h: number, sila = 1): void {
  g.strokeStyle = 'rgba(12,8,8,0.7)'; g.lineWidth = Math.max(0.45, h * 0.0022 * sila);
  g.stroke(ksztalt);
}

/**
 * Światłocień bryły z tuszem w jednym obcięciu: podane warstwy, kontrświatło (gdy `kontr`), kontur tuszem.
 * `tanio` (małe postacie) — tylko pierwsza warstwa, bez tuszu: z daleka i tak go nie widać, a każde obcięcie kosztuje.
 */
export function bryla(g: CanvasRenderingContext2D, ksztalt: Path2D, h: number, warstwy: readonly Warstwa[], k: Pkt = SWB, sila = 1, kontr = 0, czesci?: readonly Path2D[], tanio = false, obciete = false): void {
  if (tanio) { swiatlocien(g, ksztalt, warstwy.slice(0, 1), k, undefined, obciete); return; }
  const w = kontr > 0 ? [...warstwy, warstwaKontr(h, kontr), warstwaTuszu(h, sila)] : [...warstwy, warstwaTuszu(h, sila)];
  swiatlocien(g, ksztalt, w, k, czesci, obciete);
  if (!czesci) kreskaTuszu(g, ksztalt, h, sila);
}

// ------------------------------------------------------------------ faktury

const kafle = new Map<string, HTMLCanvasElement>();
const wzory = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern>>();

function wzor(g: CanvasRenderingContext2D, klucz: string, rob: () => HTMLCanvasElement): CanvasPattern | null {
  if (typeof document === 'undefined') return null;
  let mapa = wzory.get(g);
  if (!mapa) { mapa = new Map(); wzory.set(g, mapa); }
  const jest = mapa.get(klucz);
  if (jest) return jest;
  let k = kafle.get(klucz);
  if (!k) { k = rob(); kafle.set(klucz, k); }
  const p = g.createPattern(k, 'repeat');
  if (!p) return null;
  mapa.set(klucz, p);
  return p;
}

/** Ile pikseli ekranu przypada na jednostkę rysunku. */
export function skalaEkranu(g: CanvasRenderingContext2D): number {
  const t = g.getTransform();
  return Math.hypot(t.a, t.b) || 1;
}

function kafelZiarna(): HTMLCanvasElement {
  const n = 96;
  const c = document.createElement('canvas'); c.width = n; c.height = n;
  const g = c.getContext('2d')!;
  const img = g.createImageData(n, n);
  let z = 1234567;
  const r = () => ((z = (Math.imul(z, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let y = 0; y < n; y++) {
    const rzad = (r() - 0.5) * 14;
    for (let x = 0; x < n; x++) {
      // ziarno i splot: nitki osnowy co drugą kolumnę, wątek co trzeci rząd, tu i ówdzie grubsza nitka
      const v = 128 + (r() - 0.5) * 56 + (x % 2 ? -7 : 5) + (y % 3 ? 2 : -9) + rzad;
      const i = (y * n + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp(v, 0, 255); img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Ziarno płótna (w pikselach ekranu) — do mieszania 'soft-light': szarość 128 niczego nie zmienia. */
export function ziarno(g: CanvasRenderingContext2D): CanvasPattern | null {
  const p = wzor(g, 'ziarno', kafelZiarna);
  if (p) { const k = 1 / skalaEkranu(g); p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0])); }
  return p;
}

/** Kafel kolczugi: rzędy splecionych oczek (każdy rząd pochylony w inną stronę), cień pod oczkiem i blask z góry. */
function kafelKolczugi(s: number): HTMLCanvasElement {
  const rh = Math.max(2, Math.round(s * 0.6));
  const W = s, H = rh * 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const lw = Math.max(0.7, s * 0.17);
  const oczka: [number, number, number][] = [];
  for (let rzad = -1; rzad <= 2; rzad++) {
    for (let kol = -1; kol <= 1; kol++) oczka.push([kol * W + (rzad & 1 ? W / 2 : 0), rzad * rh + rh / 2, rzad & 1 ? 0.55 : -0.55]);
  }
  const rx = s * 0.5, ry = rh * 0.8;
  g.lineWidth = lw * 1.8; g.strokeStyle = 'rgba(0,0,0,0.6)';
  for (const [x, y, a] of oczka) { g.beginPath(); g.ellipse(x + lw * 0.25, y + lw * 0.55, rx, ry, a, 0, TAU); g.stroke(); }
  g.lineWidth = lw; g.strokeStyle = 'rgba(150,150,158,0.95)';
  for (const [x, y, a] of oczka) { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, TAU); g.stroke(); }
  g.lineWidth = lw * 0.55; g.strokeStyle = 'rgba(236,234,230,0.85)';
  for (const [x, y, a] of oczka) { g.beginPath(); g.ellipse(x, y, rx, ry, a, -2.1, -0.7); g.stroke(); }
  return c;
}

/**
 * Kolczuga: oczko ok. 0,9% wzrostu, ale nie mniejsze niż 2,4 px ekranu (drobniejsze migotałoby).
 * Zwraca wzór i siłę (przy wymuszonym, za dużym oczku — słabiej).
 */
export function kolczuga(g: CanvasRenderingContext2D, h: number): [CanvasPattern, number] | null {
  const k = skalaEkranu(g);
  const naturalne = 0.0088 * h * k;
  if (naturalne < 0.9) return null;
  const px = Math.max(2.4, naturalne);
  const s = Math.min(20, Math.round(px));
  const p = wzor(g, 'k' + s, () => kafelKolczugi(s));
  if (!p) return null;
  const q = px / s / k;
  p.setTransform(new DOMMatrix([q, 0, 0, q, 0, 0]));
  return [p, clamp(naturalne / 2.4, 0.4, 1)];
}

// ------------------------------------------------------------------ krew

/** Zaschnięta (brunatna), zwykła i świeża (z połyskiem) krew. */
export const KREW_SUCHA: Rgb = [62, 12, 10];
export const KREW: Rgb = [92, 12, 11];
export const KREW_SWIEZA: Rgb = [134, 14, 12];
/** Barwa, którą krew zostawia w płótnie przy mnożeniu. */
export const KREW_WSIAKNIETA: Rgb = [150, 44, 38];

/** Gładki zamknięty kształt przez punkty (węzły w środkach boków). */
export function gladki(pk: readonly (readonly [number, number])[]): Path2D {
  const p = new Path2D();
  const n = pk.length;
  p.moveTo((pk[n - 1][0] + pk[0][0]) / 2, (pk[n - 1][1] + pk[0][1]) / 2);
  for (let i = 0; i < n; i++) {
    const a = pk[i], b = pk[(i + 1) % n];
    p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  p.closePath();
  return p;
}

/** Nieregularna plama: n punktów na elipsie (r·wyd wzdłuż kąta `kat`, r w poprzek), promień ± nier. Kształt z numeru postaci. */
export function klaks(x: number, y: number, r: number, id: number, szuf: number, n = 9, nier = 0.32, wyd = 1, kat = 0): Path2D {
  const c = Math.cos(kat), sn = Math.sin(kat);
  const pk: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (los(id, szuf + i) - 0.5) * (TAU / n) * 0.6;
    const rr = r * (1 - nier + 2 * nier * los(id, szuf + 40 + i));
    const ex = Math.cos(a) * rr * wyd, ey = Math.sin(a) * rr;
    pk.push([x + ex * c - ey * sn, y + ex * sn + ey * c]);
  }
  return gladki(pk);
}

/**
 * Rozbryzg krwi: nieregularna plama, z niej kolce zakończone kroplą w stronę lotu (`kat` — kąt ekranu)
 * i drobne, wydłużone kropelki dalej. Z bliska świeża krew ma połysk.
 */
export function rozbryzg(g: CanvasRenderingContext2D, x: number, y: number, r: number, kat: number, id: number, kol: Rgb, alfa: number, lod: number, polysk = false): void {
  const p = klaks(x, y, r, id, 0, 9, 0.3);
  if (lod === 2) {
    const n = 3 + Math.floor(los(id, 90) * 3);
    for (let i = 0; i < n; i++) {
      const a = kat + (los(id, 91 + i) - 0.5) * 1.9;
      const dl = r * (1.0 + 1.2 * los(id, 100 + i)), sz = r * (0.15 + 0.13 * los(id, 110 + i));
      const ca = Math.cos(a), sa = Math.sin(a);
      const bx = x + ca * r * 0.55, by = y + sa * r * 0.55;
      // kolec (zgodnie ze wskazówkami zegara — jak łuki, żeby się sumowały, a nie wycinały)
      p.moveTo(bx + sa * sz, by - ca * sz);
      p.quadraticCurveTo(x + ca * dl * 0.85, y + sa * dl * 0.85, x + ca * dl, y + sa * dl);
      p.quadraticCurveTo(x + ca * dl * 0.85, y + sa * dl * 0.85, bx - sa * sz, by + ca * sz);
      p.closePath();
      const kr = sz * 0.95, kx = x + ca * (dl + kr), ky = y + sa * (dl + kr);
      p.moveTo(kx + ca * kr * 1.3, ky + sa * kr * 1.3);
      p.ellipse(kx, ky, kr * 1.3, kr, a, 0, TAU);
    }
    // kropelki dalej, coraz mniejsze
    for (let i = 0; i < 7; i++) {
      const a = kat + (los(id, 130 + i) - 0.5) * 1.5;
      const d = r * (1.5 + 1.8 * los(id, 140 + i));
      const kr = r * (0.05 + 0.13 * los(id, 150 + i)) * (2.6 / (1 + d / r));
      const kx = x + Math.cos(a) * d, ky = y + Math.sin(a) * d;
      p.moveTo(kx + Math.cos(a) * kr * 1.5, ky + Math.sin(a) * kr * 1.5);
      p.ellipse(kx, ky, kr * 1.5, kr, a, 0, TAU);
    }
  }
  g.fillStyle = rgba(kol, alfa);
  g.fill(p);
  if (lod === 2) {
    // ciemniejszy brzeg zaschnięcia i (świeża) połyskliwy refleks
    g.strokeStyle = rgba([kol[0] * 0.45, kol[1] * 0.4, kol[2] * 0.4], alfa * 0.5); g.lineWidth = Math.max(0.4, r * 0.07);
    g.stroke(p);
    if (polysk) {
      g.fillStyle = 'rgba(255,214,200,0.32)';
      g.beginPath(); g.ellipse(x + r * 0.25, y - r * 0.28, r * 0.28, r * 0.12, -0.5, 0, TAU); g.fill();
    }
  }
}

/** Krew wsiąknięta w płótno: mnożona (płótno przybiera jej barwę), ciemniejsza w środku, z brzegiem zaschnięcia. */
export function przesiak(g: CanvasRenderingContext2D, x: number, y: number, r: number, id: number, alfa: number, lod: number, wyd = 1, kat = 0): void {
  const p = klaks(x, y, r, id, 200, 11, 0.36, wyd, kat);
  const op = g.globalCompositeOperation;
  g.globalCompositeOperation = 'multiply';
  const gr = g.createRadialGradient(x, y, 0, x, y, r * Math.max(1, wyd) * 1.3);
  gr.addColorStop(0, rgba([110, 18, 16], alfa));
  gr.addColorStop(0.5, rgba(KREW_WSIAKNIETA, alfa * 0.95));
  gr.addColorStop(1, rgba(KREW_WSIAKNIETA, alfa * 0.4));
  g.fillStyle = gr; g.fill(p);
  g.globalCompositeOperation = op;
  if (lod === 2) { g.strokeStyle = rgba(KREW_SUCHA, alfa * 0.4); g.lineWidth = Math.max(0.5, r * 0.05); g.stroke(p); }
}

/** Zaciek: strużka w dół od (x, y), zwężająca się, z kroplą na końcu. */
export function zaciek(g: CanvasRenderingContext2D, x: number, y: number, dl: number, sz: number, kol: Rgb, alfa: number, id: number, szuf: number): void {
  const kx = (los(id, szuf) - 0.5) * sz * 3, ky = y + dl;
  const kr = sz * (0.8 + 0.5 * los(id, szuf + 1));
  const p = new Path2D();
  p.moveTo(x - sz, y);
  p.bezierCurveTo(x - sz * 0.8, y + dl * 0.4, x + kx * 0.6 - sz * 0.35, ky - dl * 0.3, x + kx - kr * 0.55, ky - kr * 0.4);
  p.arc(x + kx, ky, kr, Math.PI * 1.15, Math.PI * 1.85, true);
  p.bezierCurveTo(x + kx * 0.6 + sz * 0.35, ky - dl * 0.3, x + sz * 0.6, y + dl * 0.4, x + sz, y);
  p.closePath();
  g.fillStyle = rgba(kol, alfa);
  g.fill(p);
}

// ------------------------------------------------------------------ kolczuga na bryle

/**
 * Kolczuga na bryle: ciemna stal, oczka ledwie widać w półcieniu, a po stronie lampki lśnią; sierp cienia
 * i głęboki cień przy brzegu, tusz. `gr` — grubość bryły (px), `a`→`b` — oś (cień biegnie wzdłuż niej).
 */
export function kolcze(m: Malarz, g: CanvasRenderingContext2D, ksztalt: Path2D, h: number, gr: number, dalej: boolean, a?: Pkt, b?: Pkt, czesci?: readonly Path2D[]): void {
  if (m.lod < 2) return;
  const k = a && b ? swiatloOsi(a, b) : SWB;
  const wz = kolczuga(g, h);
  if (wz) { g.globalAlpha = (dalej ? 0.1 : 0.16) * wz[1]; g.fillStyle = wz[0]; g.fill(ksztalt); g.globalAlpha = 1; }
  const w: Warstwa[] = [[gr * 0.55, 'rgba(2,2,6,0.5)'], [gr * 0.18, 'rgba(2,2,6,0.5)']];
  if (wz && !dalej) w.push([-gr * 0.34, wz[0], 0.9 * wz[1]]);
  w.push([-gr * 0.18, dalej ? 'rgba(190,198,214,0.04)' : 'rgba(196,204,222,0.12)']);
  bryla(g, ksztalt, h, w, k, dalej ? 0.7 : 1, dalej ? 0 : 1, czesci);
}

/**
 * Ton bryły: z bliska płaski (światłocień robią sierpy), ze średniej odległości gradient w poprzek osi a→b —
 * bez obcięć, które przy małych postaciach kosztują najwięcej.
 */
export function tonBryly(m: Malarz, kol: Rgb, baza: number, a: Pkt, b: Pkt, gr: number, cien: Rgb = CIEN.metal): string | CanvasGradient {
  const plaski = tonC(kol, baza, cien);
  if (m.lod !== 1) return plaski;
  const k = swiatloOsi(a, b), r = gr / 2;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const gr2 = m.g.createLinearGradient(mx + k.x * r, my + k.y * r, mx - k.x * r, my - k.y * r);
  gr2.addColorStop(0, tonC(kol, baza + 0.12, cien)); gr2.addColorStop(0.45, plaski); gr2.addColorStop(1, tonC(kol, baza - 0.38, cien));
  return gr2;
}

/** Zimne kontrświatło: wąski pas tuż przy krawędzi od strony cienia — odcina ciemną bryłę od ciemnej skały. */
export function kontrswiatlo(g: CanvasRenderingContext2D, ksztalt: Path2D, h: number, k: Pkt = SWB, sila = 1, czesci?: readonly Path2D[]): void {
  swiatlocien(g, ksztalt, [[Math.max(1, h * 0.012), `rgba(120,140,170,${0.2 * sila})`]], k, czesci);
}

/** Cień rzucany: kształt przesunięty od światła, przyciemnia to, co leży pod nim (w obrębie `na`). */
export function cienRzucany(g: CanvasRenderingContext2D, na: Path2D, rzuca: Path2D, d: number, alfa: number, k: Pkt = SWB): void {
  g.save();
  g.clip(na);
  g.translate(-k.x * d, -k.y * d);
  g.fillStyle = `rgba(6,3,3,${alfa})`;
  g.fill(rzuca);
  g.restore();
}

/** Kilka cieni rzucanych w jednym obcięciu: [co rzuca, odległość, krycie, (kierunek)]. */
export function cienieRzucane(g: CanvasRenderingContext2D, na: Path2D, lista: readonly (readonly [Path2D | null, number, number, Pkt?])[], obciete = false): void {
  g.save();
  if (!obciete) g.clip(na);
  for (const [rzuca, d, alfa, k] of lista) {
    if (!rzuca) continue;
    const kk = k ?? SWB;
    g.save();
    g.translate(-kk.x * d, -kk.y * d);
    g.fillStyle = `rgba(6,3,3,${alfa})`;
    g.fill(rzuca);
    g.restore();
  }
  g.restore();
}

// ------------------------------------------------------------------ kończyna zgięta

const jedn = (x: number, y: number): Pkt => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };

/** Przecięcie prostych p1→p2 i p3→p4: parametry [t, s] wzdłuż obu; null, gdy równoległe. */
function przeciecie(p1: Pkt, p2: Pkt, p3: Pkt, p4: Pkt): [number, number] | null {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y, d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-9) return null;
  const ex = p3.x - p1.x, ey = p3.y - p1.y;
  return [(ex * d2y - ey * d2x) / den, (ex * d1y - ey * d1x) / den];
}

interface Odcinek { s: Pkt; e: Pkt; k?: Pkt; luk?: { o: Pkt; r: number; a0: number; a1: number; ccw: boolean } }

/**
 * Kończyna przez trzy stawy (bark–łokieć–nadgarstek, biodro–kolano–kostka) jako jedna bryła: od środka zgięcia
 * załom, od zewnątrz łuk. Jeden obrys bez nakładek, więc sierpy światłocienia nie robią szwu w stawie.
 * `wyp` — wybrzuszenia boków: [odcinek 1 strona +n (tył), odcinek 1 strona −n (przód), odcinek 2 +n, odcinek 2 −n].
 */
export function konczynaZgieta(a: Pkt, ra: number, b: Pkt, rb: number, c: Pkt, rc: number, wyp: readonly [number, number, number, number] = [0, 0, 0, 0]): Path2D {
  const u1 = jedn(b.x - a.x, b.y - a.y), u2 = jedn(c.x - b.x, c.y - b.y);
  const n1 = { x: -u1.y, y: u1.x }, n2 = { x: -u2.y, y: u2.x };
  const bok = (z: number, w1: number, w2: number): Odcinek[] => {
    const P = (o: Pkt, n: Pkt, r: number): Pkt => ({ x: o.x + n.x * r * z, y: o.y + n.y * r * z });
    const kt = (s: Pkt, e: Pkt, n: Pkt, w: number): Pkt => ({ x: (s.x + e.x) / 2 + n.x * z * w * 2, y: (s.y + e.y) / 2 + n.y * z * w * 2 });
    const as = P(a, n1, ra), b1 = P(b, n1, rb), b2 = P(b, n2, rb), cs = P(c, n2, rc);
    const x = przeciecie(as, b1, b2, cs);
    if (x && x[0] > 0.25 && x[0] <= 1.02 && x[1] >= -0.02 && x[1] < 0.75) {
      const X = { x: as.x + (b1.x - as.x) * x[0], y: as.y + (b1.y - as.y) * x[0] };
      return [{ s: as, e: X, k: kt(as, X, n1, w1) }, { s: X, e: cs, k: kt(X, cs, n2, w2) }];
    }
    const a0 = Math.atan2(z * n1.y, z * n1.x), a1 = Math.atan2(z * n2.y, z * n2.x);
    const d = ((a1 - a0 + Math.PI) % TAU + TAU) % TAU - Math.PI;
    return [{ s: as, e: b1, k: kt(as, b1, n1, w1) }, { s: b1, e: b2, luk: { o: b, r: rb, a0, a1, ccw: d < 0 } }, { s: b2, e: cs, k: kt(b2, cs, n2, w2) }];
  };
  const p = new Path2D();
  const tyl = bok(1, wyp[0], wyp[2]), przod = bok(-1, wyp[1], wyp[3]);
  p.moveTo(tyl[0].s.x, tyl[0].s.y);
  for (const o of tyl) {
    if (o.luk) p.arc(o.luk.o.x, o.luk.o.y, o.luk.r, o.luk.a0, o.luk.a1, o.luk.ccw);
    else p.quadraticCurveTo(o.k!.x, o.k!.y, o.e.x, o.e.y);
  }
  const ang1 = Math.atan2(n1.y, n1.x), ang2 = Math.atan2(n2.y, n2.x);
  p.arc(c.x, c.y, rc, ang2, ang2 - Math.PI, true);
  for (let i = przod.length - 1; i >= 0; i--) {
    const o = przod[i];
    if (o.luk) p.arc(o.luk.o.x, o.luk.o.y, o.luk.r, o.luk.a1, o.luk.a0, !o.luk.ccw);
    else p.quadraticCurveTo(o.k!.x, o.k!.y, o.s.x, o.s.y);
  }
  p.arc(a.x, a.y, ra, ang1 - Math.PI, ang1 - TAU, true);
  p.closePath();
  return p;
}
