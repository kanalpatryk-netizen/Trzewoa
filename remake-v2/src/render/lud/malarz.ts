import { CIEN, clamp, cos, PI, sin, TAU, tonC, type Pkt, type Rgb } from './matma';
import type { Szkielet, Stopa } from './szkielet';
import type { Poza } from './poza';

/**
 * Malarz zbiera części sylwetki (od tyłu do przodu) i maluje je jak fresk:
 * jasna aura tynku wokół całej sylwetki (żeby postać nie ginęła w mroku skały), kontur sinopią
 * (czerwonobrązowy, jak rysunek pod freskiem), a w środku matowe, płaskie tony z twardo
 * odciętym światłem i cieniem — bez plastikowych przejść. Duże płaszczyzny dostają fakturę tynku.
 *
 * Szczegółowość (lod) zależy od wielkości postaci w pikselach ekranu:
 * 0 — płaskie barwy (bardzo z daleka), 1 — światłocień i faktura, 2 — ornament, rysy, refleksy.
 */

export interface Czesc {
  sciezka?: Path2D;
  kreska?: [number, number, number, number, number];
  styl: string | CanvasGradient;
  po?: (g: CanvasRenderingContext2D) => void;
  /** cienka wewnętrzna kreska po wypełnieniu (oddziela bliższą kończynę od tułowia) */
  rys?: boolean;
  /** faktura tynku na tej części */
  tynk?: boolean;
  bezObrysu?: boolean;
}

/** Światło: z góry i z przodu. */
const SW = { x: 0.45, y: -0.89 };

// ------------------------------------------------------------------ faktura tynku

let tynkPlotno: HTMLCanvasElement | null = null;
const tynki = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();

/** Kafel tynku: biel (bez zmian przy mnożeniu), plamy pigmentu i drobne rysy. */
function zrobTynk(): HTMLCanvasElement {
  const n = 128;
  const c = document.createElement('canvas');
  c.width = n; c.height = n;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, n, n);
  let z = 7919;
  const los = () => ((z = (Math.imul(z, 1103515245) + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < 150; i++) {
    const x = los() * n, y = los() * n, r = 2 + los() * 9;
    g.fillStyle = `rgba(${90 + los() * 40 | 0},${70 + los() * 30 | 0},${50 + los() * 30 | 0},${0.05 + los() * 0.09})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    // kafel się powtarza — plamy przy brzegu rysujemy też po drugiej stronie
    for (const [dx, dy] of [[n, 0], [-n, 0], [0, n], [0, -n]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); }
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(40,28,20,${0.05 + los() * 0.12})`;
    g.fillRect(los() * n, los() * n, 1, 1);
  }
  g.strokeStyle = 'rgba(46,30,20,0.45)'; g.lineWidth = 0.7;
  for (let k = 0; k < 5; k++) {
    let x = los() * n, y = los() * n;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 6; j++) { x += (los() - 0.5) * 22; y += (los() - 0.3) * 16; g.lineTo(x, y); }
    g.stroke();
  }
  return c;
}

function tynk(g: CanvasRenderingContext2D): CanvasPattern | null {
  let p = tynki.get(g);
  if (p) return p;
  if (typeof document === 'undefined') return null;
  if (!tynkPlotno) tynkPlotno = zrobTynk();
  p = g.createPattern(tynkPlotno, 'repeat') ?? undefined;
  if (p) tynki.set(g, p);
  return p ?? null;
}

export class Malarz {
  czesci: Czesc[] = [];
  readonly lod: 0 | 1 | 2;
  readonly prosto: boolean;

  constructor(public g: CanvasRenderingContext2D, public h: number, pikseli: number, maksLod: 0 | 1 | 2 = 2) {
    this.lod = Math.min(maksLod, pikseli < 22 ? 0 : pikseli < 70 ? 1 : 2) as 0 | 1 | 2;
    this.prosto = this.lod === 0;
  }

  /** Bryła walcowa po freskowemu: pas światła, ton własny, pas cienia — odcięte twardo. */
  bryla(a: Pkt, b: Pkt, r: number, kol: Rgb, dalej = false, sila = 1, cien: Rgb = CIEN.tkanina): string | CanvasGradient {
    const baza = dalej ? -0.3 : 0;
    if (this.prosto || (dalej && this.lod < 2)) return tonC(kol, baza - (this.prosto ? 0.02 : 0.08), cien);
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (nx * SW.x + ny * SW.y < 0) { nx = -nx; ny = -ny; }
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const gr = this.g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
    const sw = tonC(kol, baza + 0.14 * sila, cien), wl = tonC(kol, baza - 0.02, cien), ci = tonC(kol, baza - 0.34 * sila, cien);
    gr.addColorStop(0, sw); gr.addColorStop(0.26, sw);
    gr.addColorStop(0.26, wl); gr.addColorStop(0.66, wl);
    gr.addColorStop(0.66, ci); gr.addColorStop(1, ci);
    return gr;
  }

  /** Płaszczyzna (tułów, szata): matowa, z łagodnym przejściem ku cieniowi u dołu. */
  plaszczyzna(x0: number, y0: number, x1: number, y1: number, kol: Rgb, dalej = false, sila = 1, cien: Rgb = CIEN.tkanina): string | CanvasGradient {
    const baza = dalej ? -0.3 : 0;
    if (this.prosto || (dalej && this.lod < 2)) return tonC(kol, baza - (this.prosto ? 0.02 : 0.08), cien);
    const gr = this.g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, tonC(kol, baza + 0.06 * sila, cien));
    gr.addColorStop(0.55, tonC(kol, baza - 0.04 * sila, cien));
    gr.addColorStop(1, tonC(kol, baza - 0.3 * sila, cien));
    return gr;
  }

  /** Metal po freskowemu: ton własny, wąski pas blasku (biel wapienna), twardy cień. */
  metal(a: Pkt, b: Pkt, r: number, kol: Rgb, dalej = false, cien: Rgb = CIEN.metal): string | CanvasGradient {
    const baza = dalej ? -0.3 : 0;
    if (this.prosto || (dalej && this.lod < 2)) return tonC(kol, baza - (this.prosto ? 0.02 : 0.1), cien);
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (nx * SW.x + ny * SW.y < 0) { nx = -nx; ny = -ny; }
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const gr = this.g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
    const wl = tonC(kol, baza, cien), bl = tonC(kol, baza + 0.4, cien), ci = tonC(kol, baza - 0.38, cien);
    gr.addColorStop(0, wl); gr.addColorStop(0.16, wl);
    gr.addColorStop(0.16, bl); gr.addColorStop(0.28, bl);
    gr.addColorStop(0.28, wl); gr.addColorStop(0.64, wl);
    gr.addColorStop(0.64, ci); gr.addColorStop(1, ci);
    return gr;
  }

  /** Kula (głowa, dłoń): miękko, matowo, cień przy brzegu. */
  kula(c: Pkt, r: number, kol: Rgb, dalej = false, polysk = 0, cien: Rgb = CIEN.tkanina): string | CanvasGradient {
    const baza = dalej ? -0.3 : 0;
    if (this.prosto || (dalej && this.lod < 2)) return tonC(kol, baza - 0.03, cien);
    const gr = this.g.createRadialGradient(c.x + r * 0.3, c.y - r * 0.36, r * 0.1, c.x, c.y, r * 1.1);
    gr.addColorStop(0, tonC(kol, baza + 0.1 + polysk * 0.25, cien));
    gr.addColorStop(0.62, tonC(kol, baza - 0.03, cien));
    gr.addColorStop(1, tonC(kol, baza - 0.36, cien));
    return gr;
  }

  ksztalt(sciezka: Path2D, styl: string | CanvasGradient, po?: (g: CanvasRenderingContext2D) => void, rys = false, tynk = false): void {
    this.czesci.push({ sciezka, styl, po, rys, tynk });
  }

  kreska(x1: number, y1: number, x2: number, y2: number, w: number, styl: string | CanvasGradient, po?: (g: CanvasRenderingContext2D) => void): void {
    this.czesci.push({ kreska: [x1, y1, x2, y2, w], styl, po });
  }

  /** Szczegół bez obrysu, rysowany w kolejności części (np. twarz na głowie). */
  szczegol(po: (g: CanvasRenderingContext2D) => void): void {
    this.czesci.push({ styl: '', po, bezObrysu: true });
  }

  maluj(obwodka: Rgb): void {
    const g = this.g, h = this.h;
    // aura: jasny tynk z nutą barwy roli; z daleka mocniejsza, żeby postać nie ginęła w mroku
    const jasna = clamp(h * 0.036, 1.2, 2.2), ciemna = clamp(h * 0.02, 0.85, 1.8);
    const a = clamp(1.02 - h / 160, 0.42, 0.88);
    const aura = `rgba(${(obwodka[0] * 0.4 + 222 * 0.6) | 0},${(obwodka[1] * 0.4 + 206 * 0.6) | 0},${(obwodka[2] * 0.4 + 170 * 0.6) | 0},${a.toFixed(2)})`;
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const [szer, barwa] of [[jasna + ciemna, aura], [ciemna, 'rgba(66,28,18,0.96)']] as const) {
      g.strokeStyle = barwa;
      for (const c of this.czesci) {
        if (c.bezObrysu) continue;
        if (c.sciezka) { g.lineWidth = szer * 2; g.stroke(c.sciezka); }
        else if (c.kreska) { const [x1, y1, x2, y2, w] = c.kreska; g.lineWidth = w + szer * 2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      }
    }
    const wzor = this.lod > 0 ? tynk(g) : null;
    for (const c of this.czesci) {
      if (c.sciezka) {
        g.fillStyle = c.styl; g.fill(c.sciezka);
        if (c.tynk && wzor) {
          g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = this.lod === 2 ? 0.9 : 0.6;
          g.fillStyle = wzor; g.fill(c.sciezka);
          g.restore();
        }
        if (c.rys && !this.prosto) { g.strokeStyle = 'rgba(70,30,18,0.6)'; g.lineWidth = clamp(h * 0.01, 0.6, 1.3); g.stroke(c.sciezka); }
      } else if (c.kreska) {
        const [x1, y1, x2, y2, w] = c.kreska;
        g.strokeStyle = c.styl; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      }
      if (c.po) c.po(g);
    }
  }
}

// ------------------------------------------------------------------ kształty

export function wielokat(pk: number[]): Path2D {
  const p = new Path2D();
  p.moveTo(pk[0], pk[1]);
  for (let i = 2; i < pk.length; i += 2) p.lineTo(pk[i], pk[i + 1]);
  p.closePath();
  return p;
}

export function kolo(c: Pkt, r: number): Path2D {
  const p = new Path2D(); p.arc(c.x, c.y, r, 0, TAU); return p;
}

/**
 * Kończyna: zwęża się od ra do rb, z wybrzuszeniem (mięsień, fałda) po jednej i drugiej stronie.
 * Strona +n to tył kończyny skierowanej w dół (łydka), −n — przód (kolano, piszczel).
 */
export function konczyna(a: Pkt, ra: number, b: Pkt, rb: number, tyl = 0, przod = 0, gdzie = 0.4): Path2D {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const ang = Math.atan2(ny, nx);
  const sx = a.x + ux * L * gdzie, sy = a.y + uy * L * gdzie;
  const r = ra + (rb - ra) * gdzie;
  const p = new Path2D();
  // bok +n: przez punkt (s + n·(r+tyl)) — punkt kontrolny tak, by krzywa przez niego przechodziła
  const m1x = sx + nx * (r + tyl), m1y = sy + ny * (r + tyl);
  const p1x = a.x + nx * ra, p1y = a.y + ny * ra, p2x = b.x + nx * rb, p2y = b.y + ny * rb;
  p.moveTo(p1x, p1y);
  p.quadraticCurveTo(2 * m1x - (p1x + p2x) / 2, 2 * m1y - (p1y + p2y) / 2, p2x, p2y);
  p.arc(b.x, b.y, rb, ang, ang - PI, true);
  const m2x = sx - nx * (r + przod), m2y = sy - ny * (r + przod);
  const q1x = b.x - nx * rb, q1y = b.y - ny * rb, q2x = a.x - nx * ra, q2y = a.y - ny * ra;
  p.quadraticCurveTo(2 * m2x - (q1x + q2x) / 2, 2 * m2y - (q1y + q2y) / 2, q2x, q2y);
  p.arc(a.x, a.y, ra, ang - PI, ang - TAU, true);
  p.closePath();
  return p;
}

/** Dłoń: rękawica z kciukiem z przodu albo pięść (gdy coś trzyma). */
export function dlon(c: Pkt, kat: number, r: number, piesc: boolean): Path2D {
  const p = new Path2D();
  const ux = sin(kat), uy = cos(kat);
  const rot = Math.atan2(uy, ux);
  if (piesc) {
    p.ellipse(c.x + ux * r * 0.35, c.y + uy * r * 0.35, r * 1.02, r * 0.9, rot, 0, TAU);
  } else {
    p.ellipse(c.x + ux * r * 0.7, c.y + uy * r * 0.7, r * 1.08, r * 0.74, rot, 0, TAU);
    const fx = sin(kat + PI / 2), fy = cos(kat + PI / 2);
    const kx = c.x + fx * r * 0.62 + ux * r * 0.55, ky = c.y + fy * r * 0.62 + uy * r * 0.55;
    p.moveTo(kx + Math.cos(rot + 0.5) * r * 0.42, ky + Math.sin(rot + 0.5) * r * 0.42);
    p.ellipse(kx, ky, r * 0.42, r * 0.3, rot + 0.5, 0, TAU);
  }
  return p;
}

/** But: podeszwa, obcas, zaokrąglony nosek, cholewka do kostki. */
export function but(st: Stopa, h: number, cholewka = 0.05, szer = 1): Path2D {
  const s = st.kat, fx = cos(s), fy = -sin(s), nx = sin(s), ny = cos(s);
  const P = (f: number, n: number): [number, number] => [st.podeszwa.x + fx * f * h + nx * n * h, st.podeszwa.y + fy * f * h + ny * n * h];
  const K = (f: number, n: number): [number, number] => [st.kostka.x + fx * f * h + nx * n * h, st.kostka.y + fy * f * h + ny * n * h];
  const p = new Path2D();
  p.moveTo(...P(-0.032 * szer, 0.004));
  p.lineTo(...P(0.06, 0.004));
  const [c1x, c1y] = P(0.086, 0.002), [t1x, t1y] = P(0.082, -0.026);
  p.quadraticCurveTo(c1x, c1y, t1x, t1y);
  const [c2x, c2y] = P(0.05, -0.05), [t2x, t2y] = K(0.026 * szer, 0.004);
  p.quadraticCurveTo(c2x, c2y, t2x, t2y);
  p.lineTo(...K(0.028 * szer, -cholewka));
  p.lineTo(...K(-0.032 * szer, -cholewka));
  p.lineTo(...P(-0.036 * szer, -0.022));
  p.closePath();
  return p;
}

/** Podeszwa — ciemny pasek pod butem i obcas. */
export function podeszwa(g: CanvasRenderingContext2D, st: Stopa, h: number, barwa: string): void {
  const s = st.kat, fx = cos(s), fy = -sin(s), nx = sin(s), ny = cos(s);
  const x = st.podeszwa.x, y = st.podeszwa.y;
  g.strokeStyle = barwa; g.lineWidth = Math.max(0.8, h * 0.012);
  g.beginPath();
  g.moveTo(x - fx * 0.03 * h - nx * 0.002 * h, y - fy * 0.03 * h - ny * 0.002 * h);
  g.lineTo(x + fx * 0.07 * h - nx * 0.002 * h, y + fy * 0.07 * h - ny * 0.002 * h);
  g.stroke();
}

/**
 * Głowa z profilu: czaszka, czoło, podbródek i żuchwa. Twarzą w prawo (+x).
 * `kat` — skłon głowy (od pionu w górę, + do przodu).
 */
export function glowaProfil(s: Szkielet, kat: number, szczeka = 1): Path2D {
  const { x, y } = s.glowa, r = s.rg;
  const c = cos(kat), sn = sin(kat);
  const T = (dx: number, dy: number): [number, number] => [x + (dx * c - dy * sn) * r, y + (dx * sn + dy * c) * r];
  const p = new Path2D();
  p.moveTo(...T(-0.5, 0.82));
  p.bezierCurveTo(...T(-1.2, 0.55), ...T(-1.15, -1.0), ...T(0.0, -1.02));
  p.bezierCurveTo(...T(0.72, -1.02), ...T(1.02, -0.6), ...T(0.98, -0.12));
  p.lineTo(...T(1.02, 0.08));
  p.quadraticCurveTo(...T(0.97, 0.4), ...T(0.96, 0.46));
  p.quadraticCurveTo(...T(0.98, 0.62 * szczeka + 0.1), ...T(0.84, 0.74 * szczeka + 0.12));
  p.quadraticCurveTo(...T(0.55, 0.95 * szczeka + 0.05), ...T(0.12, 0.86));
  p.closePath();
  return p;
}

/** Nos z profilu — osobna bryła, żeby wystawał poza obrys głowy. */
export function nos(s: Szkielet, kat: number, wielkosc = 1): Path2D {
  const { x, y } = s.glowa, r = s.rg;
  const c = cos(kat), sn = sin(kat);
  const T = (dx: number, dy: number): [number, number] => [x + (dx * c - dy * sn) * r, y + (dx * sn + dy * c) * r];
  const p = new Path2D();
  p.moveTo(...T(0.9, -0.08));
  p.quadraticCurveTo(...T(1.0 + 0.24 * wielkosc, 0.22), ...T(1.0 + 0.2 * wielkosc, 0.3));
  p.quadraticCurveTo(...T(1.04, 0.36), ...T(0.9, 0.34));
  p.closePath();
  return p;
}

/** Punkt na głowie w jej układzie (r — promień głowy). */
export function naGlowie(s: Szkielet, kat: number, dx: number, dy: number): Pkt {
  const c = cos(kat), sn = sin(kat), r = s.rg;
  return { x: s.glowa.x + (dx * c - dy * sn) * r, y: s.glowa.y + (dx * sn + dy * c) * r };
}

export interface OpcjeTwarzy {
  brew?: string;
  bezUcha?: boolean;
  bezUst?: boolean;
  /** 0..1 — szaleństwo z głębokości: oczy ciemnieją w puste oczodoły z punkcikiem światła */
  puste?: number;
  /** 0..1 — strach: brwi uniesione nad nosem, oczy szerzej */
  strach?: number;
  /** spojrzenie: 0 — przed siebie, 1 — w górę (modlitwa, ikona) */
  wzrok?: number;
}

/**
 * Twarz z profilu jak na ikonie i portrecie fajumskim: duże migdałowe oko z ciemną tęczówką
 * pod ciężką powieką, wysoko wygięta brew, długi prosty nos, małe zamknięte usta, policzek
 * w zielonkawym cieniu (verdaccio). lod 0 — sam punkt oka.
 */
export function twarz(g: CanvasRenderingContext2D, s: Szkielet, kat: number, p: Poza, skora: Rgb, lod: number, opcje: OpcjeTwarzy = {}): void {
  const r = s.rg;
  const P = (dx: number, dy: number) => naGlowie(s, kat, dx, dy);
  const oko = P(0.55, -0.1);
  const strach = opcje.strach ?? 0, puste = opcje.puste ?? 0, wzrok = opcje.wzrok ?? 0;
  const otw = clamp(p.oczy * (1 + strach * 0.3), 0, 1.3);
  if (lod === 0) {
    g.fillStyle = 'rgba(30,14,10,0.95)';
    g.fillRect(oko.x - r * 0.14, oko.y - r * 0.1 * Math.min(1, otw), r * 0.28, Math.max(0.8, r * 0.2 * Math.min(1, otw)));
    return;
  }
  // policzek w zielonkawym cieniu i ciepły ton na kości policzkowej
  {
    const pl = P(0.46, 0.4);
    const gr = g.createRadialGradient(pl.x, pl.y, 0, pl.x, pl.y, r * 0.36);
    gr.addColorStop(0, 'rgba(70,84,62,0.32)'); gr.addColorStop(1, 'rgba(70,84,62,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(pl.x, pl.y, r * 0.36, 0, TAU); g.fill();
  }
  // ucho
  if (!opcje.bezUcha) {
    const u = P(-0.14, 0.1);
    g.fillStyle = tonC(skora, -0.22, CIEN.skora);
    g.beginPath(); g.ellipse(u.x, u.y, r * 0.15, r * 0.22, kat - 0.2, 0, TAU); g.fill();
    if (lod === 2) { g.strokeStyle = 'rgba(90,40,26,0.55)'; g.lineWidth = Math.max(0.5, r * 0.045); g.beginPath(); g.arc(u.x + r * 0.02, u.y, r * 0.09, -1.2, 1.4); g.stroke(); }
  }
  // oko: duży migdał, tęczówka sięga powieki; spojrzenie może iść w górę
  if (otw > 0.25) {
    const wys = r * 0.11 * otw;
    if (puste < 0.5) {
      g.fillStyle = 'rgba(216,204,178,0.95)';
      g.beginPath(); g.ellipse(oko.x, oko.y, r * 0.2, wys, kat, 0, TAU); g.fill();
      const ix = oko.x + r * 0.06, iy = oko.y - wys * 0.25 * (1 + wzrok);
      g.fillStyle = 'rgba(40,22,14,0.98)';
      g.beginPath(); g.ellipse(ix, iy, r * 0.095, Math.min(wys * 1.05, r * 0.1), kat, 0, TAU); g.fill();
      if (lod === 2) { g.fillStyle = 'rgba(250,236,206,0.85)'; g.beginPath(); g.arc(ix + r * 0.03, iy - r * 0.03, Math.max(0.35, r * 0.022), 0, TAU); g.fill(); }
    } else {
      g.fillStyle = 'rgba(12,6,6,0.98)';
      g.beginPath(); g.ellipse(oko.x, oko.y, r * 0.2, Math.max(wys, r * 0.07), kat, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,214,170,${0.5 + 0.4 * puste})`;
      g.beginPath(); g.arc(oko.x + r * 0.05, oko.y, Math.max(0.4, r * 0.03), 0, TAU); g.fill();
    }
    // ciężka górna powieka i cienka dolna
    g.strokeStyle = 'rgba(52,22,14,0.95)'; g.lineWidth = Math.max(0.6, r * 0.075);
    g.beginPath(); g.ellipse(oko.x, oko.y, r * 0.2, wys + r * 0.01, kat, PI * 1.05, PI * 1.95); g.stroke();
    if (lod === 2) { g.lineWidth = Math.max(0.4, r * 0.035); g.beginPath(); g.ellipse(oko.x, oko.y + r * 0.01, r * 0.18, wys, kat, PI * 0.15, PI * 0.85); g.stroke(); }
  } else {
    g.strokeStyle = 'rgba(52,22,14,0.95)'; g.lineWidth = Math.max(0.6, r * 0.075);
    g.beginPath(); g.moveTo(oko.x - r * 0.18, oko.y); g.quadraticCurveTo(oko.x, oko.y + r * 0.06, oko.x + r * 0.19, oko.y); g.stroke();
  }
  // brew: wysoki łuk ikony; wysiłek ściąga, strach unosi
  const w = p.wysilek;
  const b1 = P(0.3, -0.36 + w * 0.06 - strach * 0.04), bc = P(0.56, -0.5 + w * 0.1 - strach * 0.08), b2 = P(0.84, -0.36 + w * 0.12 - strach * 0.12);
  g.strokeStyle = opcje.brew ?? 'rgba(46,24,16,0.92)'; g.lineWidth = Math.max(0.7, r * 0.08);
  g.beginPath(); g.moveTo(b1.x, b1.y); g.quadraticCurveTo(bc.x, bc.y, b2.x, b2.y); g.stroke();
  // długi nos: linia sinopii od brwi wzdłuż grzbietu
  {
    const n1 = P(0.86, -0.3), n2 = P(1.02, 0.3);
    g.strokeStyle = 'rgba(96,40,24,0.65)'; g.lineWidth = Math.max(0.45, r * 0.045);
    g.beginPath(); g.moveTo(n1.x, n1.y); g.lineTo(n2.x, n2.y); g.stroke();
  }
  // małe usta
  if (!opcje.bezUst) {
    const u1 = P(0.72, 0.62), u2 = P(0.94, 0.58);
    if (p.usta > 0.15) {
      g.fillStyle = 'rgba(40,12,10,0.95)';
      const um = P(0.84, 0.62);
      g.beginPath(); g.ellipse(um.x, um.y + r * 0.04 * p.usta, r * 0.08, r * (0.035 + 0.11 * p.usta), kat, 0, TAU); g.fill();
    } else {
      g.strokeStyle = 'rgba(110,34,26,0.9)'; g.lineWidth = Math.max(0.5, r * 0.06);
      g.beginPath(); g.moveTo(u1.x, u1.y); g.quadraticCurveTo((u1.x + u2.x) / 2, (u1.y + u2.y) / 2 + r * 0.02, u2.x, u2.y); g.stroke();
    }
  }
}
