import { clamp, cos, PI, sin, TAU, ton, type Pkt, type Rgb } from './matma';
import type { Szkielet, Stopa } from './szkielet';
import type { Poza } from './poza';

/**
 * Malarz zbiera części sylwetki (od tyłu do przodu) i maluje je w trzech przejściach:
 * jasna obwódka roli wokół całej sylwetki, ciemna kreska, wypełnienia ze szczegółami.
 * Kontur zostaje tylko na zewnątrz — jak w miedziorycie — a sylwetka czyta się na ciemnej skale.
 *
 * Szczegółowość (lod) zależy od wielkości postaci w pikselach ekranu:
 * 0 — płaskie barwy (z daleka), 1 — cieniowanie, 2 — faktury, szwy, nity, refleksy.
 */

export interface Czesc {
  sciezka?: Path2D;
  kreska?: [number, number, number, number, number];
  styl: string | CanvasGradient;
  po?: (g: CanvasRenderingContext2D) => void;
  /** cienka wewnętrzna kreska po wypełnieniu (oddziela bliższą kończynę od tułowia) */
  rys?: boolean;
  bezObrysu?: boolean;
}

/** Światło: z góry i z przodu. */
const SW = { x: 0.45, y: -0.89 };

export class Malarz {
  czesci: Czesc[] = [];
  readonly lod: 0 | 1 | 2;
  readonly prosto: boolean;

  constructor(public g: CanvasRenderingContext2D, public h: number, pikseli: number, maksLod: 0 | 1 | 2 = 2) {
    this.lod = Math.min(maksLod, pikseli < 34 ? 0 : pikseli < 92 ? 1 : 2) as 0 | 1 | 2;
    this.prosto = this.lod === 0;
  }

  /** Bryła walcowa: jasna krawędź od światła, cień, odbite światło na samym brzegu. */
  bryla(a: Pkt, b: Pkt, r: number, kol: Rgb, dalej = false, sila = 1): string | CanvasGradient {
    const baza = dalej ? -0.34 : 0;
    // dalsze kończyny są w cieniu — z daleka i średnio blisko płaska barwa (oszczędność gradientów)
    if (this.prosto || (dalej && this.lod < 2)) return ton(kol, baza - (this.prosto ? 0 : 0.06));
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (nx * SW.x + ny * SW.y < 0) { nx = -nx; ny = -ny; }
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const gr = this.g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
    gr.addColorStop(0, ton(kol, baza + 0.3 * sila));
    gr.addColorStop(0.32, ton(kol, baza + 0.06 * sila));
    gr.addColorStop(0.78, ton(kol, baza - 0.34 * sila));
    if (this.lod === 2) gr.addColorStop(1, ton(kol, baza - 0.16 * sila));
    return gr;
  }

  /** Płaszczyzna (tułów, szata): z góry-przodu w dół-tył. */
  plaszczyzna(x0: number, y0: number, x1: number, y1: number, kol: Rgb, dalej = false, sila = 1): string | CanvasGradient {
    const baza = dalej ? -0.34 : 0;
    if (this.prosto || (dalej && this.lod < 2)) return ton(kol, baza - (this.prosto ? 0 : 0.06));
    const gr = this.g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, ton(kol, baza + 0.26 * sila));
    gr.addColorStop(0.45, ton(kol, baza));
    gr.addColorStop(1, ton(kol, baza - 0.4 * sila));
    return gr;
  }

  /** Polerowana stal: wąski biały refleks, ciemne odbicie, jaśniejsza krawędź. */
  metal(a: Pkt, b: Pkt, r: number, kol: Rgb, dalej = false): string | CanvasGradient {
    const baza = dalej ? -0.32 : 0;
    if (this.prosto || (dalej && this.lod < 2)) return ton(kol, baza - (this.prosto ? 0 : 0.08));
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (nx * SW.x + ny * SW.y < 0) { nx = -nx; ny = -ny; }
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const gr = this.g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
    if (this.lod === 2) {
      gr.addColorStop(0, ton(kol, baza + 0.2));
      gr.addColorStop(0.16, ton(kol, baza + 0.62));
      gr.addColorStop(0.3, ton(kol, baza + 0.1));
      gr.addColorStop(0.62, ton(kol, baza - 0.42));
      gr.addColorStop(0.84, ton(kol, baza - 0.12));
      gr.addColorStop(1, ton(kol, baza - 0.46));
    } else {
      gr.addColorStop(0.1, ton(kol, baza + 0.5));
      gr.addColorStop(0.55, ton(kol, baza - 0.3));
      gr.addColorStop(1, ton(kol, baza - 0.42));
    }
    return gr;
  }

  /** Kula (głowa, hełm, dłoń): światło z góry-przodu. */
  kula(c: Pkt, r: number, kol: Rgb, dalej = false, polysk = 0): string | CanvasGradient {
    const baza = dalej ? -0.34 : 0;
    if (this.prosto || (dalej && this.lod < 2)) return ton(kol, baza);
    const gr = this.g.createRadialGradient(c.x + r * 0.32, c.y - r * 0.42, r * 0.06, c.x, c.y, r * 1.12);
    gr.addColorStop(0, ton(kol, baza + 0.3 + polysk * 0.4));
    gr.addColorStop(0.55, ton(kol, baza));
    gr.addColorStop(1, ton(kol, baza - 0.42));
    return gr;
  }

  ksztalt(sciezka: Path2D, styl: string | CanvasGradient, po?: (g: CanvasRenderingContext2D) => void, rys = false): void {
    this.czesci.push({ sciezka, styl, po, rys });
  }

  kreska(x1: number, y1: number, x2: number, y2: number, w: number, styl: string | CanvasGradient, po?: (g: CanvasRenderingContext2D) => void): void {
    this.czesci.push({ kreska: [x1, y1, x2, y2, w], styl, po });
  }

  /** Szczegół bez obrysu, rysowany w kolejności części (np. twarz na głowie). */
  szczegol(po: (g: CanvasRenderingContext2D) => void): void {
    this.czesci.push({ styl: '', po, bezObrysu: true });
  }

  maluj(obwodka: string): void {
    const g = this.g, h = this.h;
    const jasna = clamp(h * 0.042, 1.25, 3.4), ciemna = clamp(h * 0.023, 0.85, 2.2);
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const [szer, barwa] of [[jasna + ciemna, obwodka], [ciemna, 'rgba(14,9,7,0.96)']] as const) {
      g.strokeStyle = barwa;
      for (const c of this.czesci) {
        if (c.bezObrysu) continue;
        if (c.sciezka) { g.lineWidth = szer * 2; g.stroke(c.sciezka); }
        else if (c.kreska) { const [x1, y1, x2, y2, w] = c.kreska; g.lineWidth = w + szer * 2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      }
    }
    for (const c of this.czesci) {
      if (c.sciezka) {
        g.fillStyle = c.styl; g.fill(c.sciezka);
        if (c.rys && !this.prosto) { g.strokeStyle = 'rgba(16,10,8,0.5)'; g.lineWidth = clamp(h * 0.011, 0.6, 1.4); g.stroke(c.sciezka); }
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

/**
 * Oko, brew, usta, ucho, rumieniec. lod 0 — tylko kropka oka.
 */
export function twarz(g: CanvasRenderingContext2D, s: Szkielet, kat: number, p: Poza, skora: Rgb, lod: number, opcje: { brew?: string; bezUcha?: boolean; bezUst?: boolean } = {}): void {
  const r = s.rg;
  const P = (dx: number, dy: number) => naGlowie(s, kat, dx, dy);
  const oko = P(0.56, -0.12);
  const otw = clamp(p.oczy, 0, 1);
  g.fillStyle = 'rgba(18,10,8,0.96)';
  if (lod === 0) { g.fillRect(oko.x - r * 0.1, oko.y - r * 0.12 * otw, r * 0.2, Math.max(0.8, r * 0.24 * otw)); return; }
  // ucho
  if (!opcje.bezUcha) {
    const u = P(-0.12, 0.08);
    g.fillStyle = ton(skora, -0.12);
    g.beginPath(); g.ellipse(u.x, u.y, r * 0.17, r * 0.24, kat - 0.2, 0, TAU); g.fill();
    if (lod === 2) { g.strokeStyle = ton(skora, -0.45, 0.8); g.lineWidth = Math.max(0.5, r * 0.05); g.beginPath(); g.arc(u.x + r * 0.02, u.y, r * 0.1, -1.2, 1.4); g.stroke(); }
  }
  // rumieniec
  if (lod === 2) {
    const pl = P(0.62, 0.3);
    const gr = g.createRadialGradient(pl.x, pl.y, 0, pl.x, pl.y, r * 0.3);
    gr.addColorStop(0, 'rgba(210,90,70,0.28)'); gr.addColorStop(1, 'rgba(210,90,70,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(pl.x, pl.y, r * 0.3, 0, TAU); g.fill();
  }
  // oko: białko, źrenica, błysk — przy zmrużeniu kreska
  if (otw > 0.3) {
    g.fillStyle = 'rgba(246,238,222,0.95)';
    g.beginPath(); g.ellipse(oko.x, oko.y, r * 0.15, r * 0.13 * otw, kat, 0, TAU); g.fill();
    g.fillStyle = 'rgba(30,18,12,0.98)';
    g.beginPath(); g.ellipse(oko.x + r * 0.05, oko.y + r * 0.01, r * 0.085, r * 0.11 * otw, kat, 0, TAU); g.fill();
    if (lod === 2) {
      g.fillStyle = 'rgba(255,255,250,0.95)'; g.beginPath(); g.arc(oko.x + r * 0.08, oko.y - r * 0.04, Math.max(0.4, r * 0.035), 0, TAU); g.fill();
      g.strokeStyle = 'rgba(30,16,12,0.8)'; g.lineWidth = Math.max(0.5, r * 0.05);
      g.beginPath(); g.ellipse(oko.x, oko.y, r * 0.15, r * 0.13 * otw, kat, PI * 1.05, PI * 1.95); g.stroke();
    }
  } else {
    g.strokeStyle = 'rgba(30,16,12,0.9)'; g.lineWidth = Math.max(0.6, r * 0.07);
    g.beginPath(); g.moveTo(oko.x - r * 0.14, oko.y + r * 0.01); g.quadraticCurveTo(oko.x, oko.y + r * 0.06, oko.x + r * 0.14, oko.y); g.stroke();
  }
  // brew — przy wysiłku ściągnięta w dół ku nosowi
  const w = p.wysilek;
  const b1 = P(0.38, -0.36 + w * 0.04), b2 = P(0.74, -0.34 + w * 0.12);
  g.strokeStyle = opcje.brew ?? 'rgba(44,26,16,0.9)'; g.lineWidth = Math.max(0.7, r * 0.1);
  g.beginPath(); g.moveTo(b1.x, b1.y); g.lineTo(b2.x, b2.y); g.stroke();
  // usta
  if (!opcje.bezUst) {
    const u1 = P(0.66, 0.55), u2 = P(0.9, 0.52);
    if (p.usta > 0.15) {
      g.fillStyle = 'rgba(70,22,18,0.92)';
      const um = P(0.8, 0.56);
      g.beginPath(); g.ellipse(um.x, um.y + r * 0.04 * p.usta, r * 0.1, r * (0.04 + 0.11 * p.usta), kat, 0, TAU); g.fill();
    } else {
      g.strokeStyle = w > 0.6 ? 'rgba(70,26,20,0.9)' : 'rgba(80,32,24,0.75)'; g.lineWidth = Math.max(0.5, r * 0.06);
      g.beginPath(); g.moveTo(u1.x, u1.y); g.quadraticCurveTo((u1.x + u2.x) / 2, (u1.y + u2.y) / 2 + r * (w > 0.6 ? -0.03 : 0.05), u2.x, u2.y); g.stroke();
    }
  }
}
