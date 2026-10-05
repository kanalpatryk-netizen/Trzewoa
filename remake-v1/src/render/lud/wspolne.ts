import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import type { Czynnosc } from '../figury';
import { CIEN, clamp, cos, frac, kier, PI, sin, TAU, ton, tonC, type Pkt, type Rgb } from './matma';
import { but, dlon, konczyna, podeszwa, wielokat, type Malarz } from './malarz';
import type { Poza, Tryb } from './poza';
import type { Szkielet, Stopa } from './szkielet';
import type { Stroj } from './stroj';
import type { Pamiec } from './pamiec';

/** Wszystko, czego potrzebuje rysunek jednej roli. */
export interface Rysunek {
  m: Malarz; s: Szkielet; p: Poza; tryb: Tryb; st: Stroj; h: number;
  c: Creature; cz: Czynnosc; czas: number; pm: Pamiec; sim: Sim;
}

// ------------------------------------------------------------------ ciało

/** Tułów: biodra, talia, pierś, zaokrąglone barki, plecy z łukiem. `przod` < 1 cofa przód (fartuch, kamizelka). */
export function tulowSciezka(s: Szkielet, h: number, szerB: number, szerP: number, piers = 1, brzuch = 1, przod = 1): Path2D {
  const tx = sin(s.katT), ty = -cos(s.katT);           // w górę tułowia
  const fx = cos(s.katT), fy = sin(s.katT);            // do przodu
  const L = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const B = s.biodro, Bk = s.bark;
  const P = (o: Pkt, t: number, f: number): [number, number] => [o.x + tx * t + fx * f, o.y + ty * t + fy * f];
  const sB = szerB * h, sP = szerP * h, q = przod;
  const p = new Path2D();
  p.moveTo(...P(B, -0.01 * h, -sP));
  p.lineTo(...P(B, -0.01 * h, sP * 0.95 * q));
  p.quadraticCurveTo(...P(B, L * 0.35, sP * 1.08 * brzuch * q), ...P(B, L * 0.55, sB * 0.95 * piers * q));
  p.quadraticCurveTo(...P(B, L * 0.85, sB * 1.18 * piers * q), ...P(Bk, 0.004 * h, sB * 0.78 * q));
  p.quadraticCurveTo(...P(Bk, 0.04 * h, sB * 0.2 * q), ...P(Bk, 0.03 * h, -sB * 0.4));
  p.quadraticCurveTo(...P(Bk, 0.022 * h, -sB * 1.0), ...P(Bk, -0.03 * h, -sB * 0.98));
  p.quadraticCurveTo(...P(B, L * 0.45, -sB * 1.02), ...P(B, L * 0.22, -sP * 0.86));
  p.quadraticCurveTo(...P(B, L * 0.08, -sP * 0.95), ...P(B, -0.01 * h, -sP));
  p.closePath();
  return p;
}

/** Gradient tułowia: z góry-przodu w dół-tył. */
export function gradTulowia(m: Malarz, s: Szkielet, h: number, kol: Rgb, sila = 1, cien: Rgb = CIEN.tkanina): string | CanvasGradient {
  const fx = cos(s.katT), fy = sin(s.katT);
  return m.plaszczyzna(s.bark.x + fx * 0.09 * h, s.bark.y + fy * 0.09 * h - 0.02 * h, s.biodro.x - fx * 0.08 * h, s.biodro.y + 0.02 * h, kol, false, sila, cien);
}

export interface Noga {
  udo: Rgb; golen: Rgb; but: Rgb; grub?: number; metal?: boolean; cholewka?: number;
  /** bosa stopa tej barwy (skóra) zamiast buta */
  bosa?: Rgb;
  /** owijki na goleni (onuce przewiązane rzemieniem) */
  owijki?: boolean;
  cien?: Rgb;
}

/** Noga od biodra: udo z mięśniem z przodu, łydka z tyłu, but albo bosa stopa. */
export function noga(r: Rysunek, kol: Pkt, st: Stopa, dalej: boolean, n: Noga): void {
  const { m, s, h } = r;
  const g = n.grub ?? 1;
  const ru = 0.054 * h * g, rk = 0.038 * h * g, rs = 0.028 * h * g;
  const grad = (a: Pkt, b: Pkt, rr: number, k: Rgb) => (n.metal ? m.metal(a, b, rr, k, dalej, n.cien) : m.bryla(a, b, rr, k, dalej, 1, n.cien));
  m.ksztalt(konczyna(s.biodro, ru, kol, rk, 0.004 * h * g, 0.01 * h * g, 0.35), grad(s.biodro, kol, ru, n.udo), undefined, !dalej);
  m.ksztalt(konczyna(kol, rk, st.kostka, rs, 0.012 * h * g, 0.003 * h * g, 0.3), grad(kol, st.kostka, rk, n.golen), (gg) => {
    if (!n.owijki || m.lod < 1) return;
    // rzemień owinięty na krzyż wokół goleni
    const ux = st.kostka.x - kol.x, uy = st.kostka.y - kol.y, L = Math.hypot(ux, uy) || 1;
    const nx = -uy / L, ny = ux / L;
    gg.strokeStyle = tonC(n.golen, -0.55, CIEN.tkanina); gg.lineWidth = Math.max(0.5, h * 0.006);
    gg.beginPath();
    for (let i = 0; i < 3; i++) {
      const t0 = 0.25 + i * 0.22, t1 = t0 + 0.12;
      gg.moveTo(kol.x + ux * t0 + nx * rk * 0.9, kol.y + uy * t0 + ny * rk * 0.9);
      gg.lineTo(kol.x + ux * t1 - nx * rk * 0.85, kol.y + uy * t1 - ny * rk * 0.85);
    }
    gg.stroke();
  }, !dalej);
  if (n.bosa) {
    // bosa stopa: pięta, podbicie, palce
    const sk = st.kat, fx = cos(sk), fy = -sin(sk), nx = sin(sk), ny = cos(sk);
    const P = (f: number, nn: number): [number, number] => [st.podeszwa.x + fx * f * h + nx * nn * h, st.podeszwa.y + fy * f * h + ny * nn * h];
    const b = new Path2D();
    b.moveTo(...P(-0.03, 0.002)); b.lineTo(...P(0.07, 0.002));
    b.quadraticCurveTo(...P(0.082, -0.006), ...P(0.07, -0.018));
    b.quadraticCurveTo(...P(0.03, -0.03), ...P(0.012, -0.045));
    b.lineTo(...P(-0.022, -0.045)); b.quadraticCurveTo(...P(-0.038, -0.02), ...P(-0.03, 0.002));
    b.closePath();
    m.ksztalt(b, m.plaszczyzna(st.kostka.x, st.kostka.y - 0.02 * h, st.podeszwa.x, st.podeszwa.y, n.bosa, dalej, 1, CIEN.skora));
    return;
  }
  m.ksztalt(but(st, h, n.cholewka ?? 0.05, g), m.plaszczyzna(st.kostka.x, st.kostka.y - 0.03 * h, st.podeszwa.x, st.podeszwa.y + 0.01 * h, n.but, dalej), (gg) => {
    if (m.prosto) return;
    podeszwa(gg, st, h, tonC(n.but, -0.7, CIEN.tkanina));
  });
}

export interface Reka {
  ramie: Rgb; przed: Rgb; dlon: Rgb; grub?: number; piesc?: boolean; metal?: boolean; rekaw?: number; cien?: Rgb; cienPrzed?: Rgb;
  /** krótki rękaw tej barwy na ramieniu (tunika) — do `krotkiDo` długości ramienia, równo ucięty */
  krotki?: Rgb; krotkiDo?: number;
}

/** Ręka: ramię z barkiem, przedramię zwężone ku nadgarstkowi, dłoń z kciukiem albo pięść. */
export function reka(r: Rysunek, bark: Pkt, lok: Pkt, dl: Pkt, przed: number, dalej: boolean, n: Reka): void {
  const { m, h } = r;
  const g = n.grub ?? 1, rw = n.rekaw ?? 1;
  const r1 = 0.038 * h * g * rw, r2 = 0.029 * h * g * rw, r3 = 0.022 * h * g;
  const grad = (a: Pkt, b: Pkt, rr: number, k: Rgb, ci?: Rgb) => (n.metal ? m.metal(a, b, rr, k, dalej, ci) : m.bryla(a, b, rr, k, dalej, 1, ci));
  m.ksztalt(konczyna(bark, r1, lok, r2, 0.004 * h * g, 0.006 * h * g, 0.3), grad(bark, lok, r1, n.ramie, n.cien), undefined, !dalej);
  if (n.krotki) {
    // rękaw: zaokrąglony na barku, równo ucięty w połowie ramienia, trochę luźniejszy niż ręka
    const t = n.krotkiDo ?? 0.5;
    const dx = lok.x - bark.x, dy = lok.y - bark.y, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const rr = r1 * 1.22, re = r1 * 1.12 + (r2 - r1) * t;
    const kx = bark.x + dx * t, ky = bark.y + dy * t;
    const rk = new Path2D();
    rk.moveTo(bark.x + nx * rr, bark.y + ny * rr);
    rk.lineTo(kx + nx * re, ky + ny * re);
    rk.lineTo(kx - nx * re + ux * 0.006 * h, ky - ny * re + uy * 0.006 * h);
    rk.lineTo(bark.x - nx * rr, bark.y - ny * rr);
    const a = Math.atan2(ny, nx);
    rk.arc(bark.x, bark.y, rr, a + PI, a, true);
    rk.closePath();
    m.ksztalt(rk, grad(bark, { x: kx, y: ky }, rr, n.krotki, CIEN.tkanina), undefined, true);
  }
  m.ksztalt(konczyna(lok, r2 * (n.rekaw ? 0.9 : 1), dl, r3, 0.004 * h * g, 0.005 * h * g, 0.3), grad(lok, dl, r2, n.przed, n.cienPrzed ?? n.cien), undefined, !dalej);
  m.ksztalt(dlon(dl, przed, 0.027 * h * g, !!n.piesc), m.kula(dl, 0.03 * h, n.dlon, dalej, 0, n.metal ? CIEN.metal : CIEN.skora));
}

// ------------------------------------------------------------------ narzędzia

const ZELAZO: Rgb = [84, 84, 88];

/** Dolabra — kilof kopaczy katakumb: drewniany trzonek, żelazny obuch z szerokim ostrzem i szpicem. Zwraca szpic. */
export function kilof(m: Malarz, x: number, y: number, kat: number, h: number, st: Stroj): Pkt {
  const d = kier(kat), a = kier(kat - PI / 2);
  const tylT = 0.13 * h, dl = 0.34 * h;
  const ax = x - d.x * tylT, ay = y - d.y * tylT, ex = x + d.x * dl, ey = y + d.y * dl;
  m.kreska(ax, ay, ex, ey, Math.max(1.1, h * 0.021), m.bryla({ x: ax, y: ay }, { x: ex, y: ey }, h * 0.011, st.drewno));
  const E = (da: number, dd: number): [number, number] => [ex + a.x * da * h + d.x * dd * h, ey + a.y * da * h + d.y * dd * h];
  const ob = new Path2D();
  // szpic w stronę ciosu, z tyłu szerokie ostrze jak siekiera
  ob.moveTo(...E(0.02, 0.018));
  ob.quadraticCurveTo(...E(0.1, 0.012), ...E(0.15, -0.03));
  ob.quadraticCurveTo(...E(0.085, -0.014), ...E(0.02, -0.018));
  ob.lineTo(...E(-0.03, -0.016));
  ob.quadraticCurveTo(...E(-0.07, -0.03), ...E(-0.085, -0.045));
  ob.lineTo(...E(-0.095, 0.03));
  ob.quadraticCurveTo(...E(-0.065, 0.02), ...E(-0.03, 0.018));
  ob.closePath();
  const [s1x, s1y] = E(0.14, 0), [s2x, s2y] = E(-0.09, 0);
  m.ksztalt(ob, m.metal({ x: s1x, y: s1y }, { x: s2x, y: s2y }, h * 0.025, st.zelazo));
  const [tx, ty] = E(0.15, -0.03);
  return { x: tx, y: ty };
}

/**
 * Gliniana lampka oliwna (lucerna) na trzech łańcuszkach: (x, y) — dłoń albo hak, z którego zwisa;
 * `naZiemi` — stoi na ziemi pod (x, y). Płomień u dzióbka, ciepłe światło.
 */
export function lampa(g: CanvasRenderingContext2D, x: number, y: number, h: number, czas: number, id: number, lod: number, glina: Rgb, naZiemi = false, wahanie = 0): void {
  const L = naZiemi ? 0 : 0.06 * h;
  const lx = x + sin(wahanie) * L, ly = y + cos(wahanie) * L + (naZiemi ? -0.012 * h : 0.012 * h);
  const m = migot(czas, id);
  const fx = lx + 0.03 * h, fy = ly - 0.012 * h;
  if (lod === 0 || h < 46) poswiata(g, fx, fy, Math.max(9, h * 0.36), [255, 166, 80], 0.5 * m);
  else poswiata(g, fx, fy - 0.01 * h, h * (0.34 + 0.05 * m), [255, 166, 80], 0.34 * m);
  if (lod > 0 && !naZiemi) {
    g.strokeStyle = 'rgba(70,56,40,0.9)'; g.lineWidth = Math.max(0.4, h * 0.0035);
    g.beginPath();
    for (const dx of [-0.018, 0, 0.018]) { g.moveTo(x, y); g.lineTo(lx + dx * h, ly - 0.008 * h); }
    g.stroke();
  }
  // naczynie: owalny zbiornik z dzióbkiem
  g.fillStyle = tonC(glina, 0, CIEN.tkanina);
  g.beginPath(); g.ellipse(lx, ly, 0.026 * h, 0.012 * h, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(lx + 0.012 * h, ly - 0.008 * h); g.lineTo(fx + 0.004 * h, fy + 0.004 * h); g.lineTo(lx + 0.014 * h, ly + 0.008 * h); g.closePath(); g.fill();
  if (lod > 0) {
    g.fillStyle = tonC(glina, -0.4, CIEN.tkanina);
    g.beginPath(); g.ellipse(lx, ly + 0.004 * h, 0.024 * h, 0.006 * h, 0, 0, PI); g.fill();
  }
  // płomień
  const fh = Math.max(1.6, h * (0.03 + 0.008 * m)), fw = Math.max(0.8, h * 0.009);
  const gr = g.createRadialGradient(fx, fy, 0, fx, fy - fh * 0.3, fh * 0.7);
  gr.addColorStop(0, 'rgba(255,250,224,1)'); gr.addColorStop(0.45, 'rgba(255,196,104,0.95)'); gr.addColorStop(1, 'rgba(230,90,30,0)');
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(fx + sin(czas * 0.02 + id) * h * 0.002, fy - fh * 0.4, fw, fh * 0.55, 0, 0, TAU); g.fill();
}

/** Spatha — długi, prosty miecz o dwóch ostrzach: prosty jelec, okrągła głowica. Zwraca czubek. */
export function miecz(m: Malarz, x: number, y: number, kat: number, h: number, st: Stroj, czas: number): Pkt {
  const d = kier(kat), n = kier(kat - PI / 2);
  const dl = 0.52 * h, sz = 0.019 * h;
  const tx = x + d.x * 0.035 * h, ty = y + d.y * 0.035 * h;
  const P = (wd: number, wn: number): [number, number] => [tx + d.x * wd + n.x * wn, ty + d.y * wd + n.y * wn];
  const ostrze = wielokat([...P(0, sz), ...P(dl * 0.9, sz * 0.85), ...P(dl, 0), ...P(dl * 0.9, -sz * 0.85), ...P(0, -sz)]);
  const czubek = { x: tx + d.x * dl, y: ty + d.y * dl };
  m.ksztalt(ostrze, m.metal({ x: tx, y: ty }, czubek, sz, [150, 150, 148]), (g) => {
    if (m.prosto) return;
    g.strokeStyle = 'rgba(60,40,30,0.55)'; g.lineWidth = Math.max(0.5, h * 0.005);
    g.beginPath(); g.moveTo(...P(dl * 0.04, 0)); g.lineTo(...P(dl * 0.8, 0)); g.stroke();
    if (m.lod === 2) {
      const b = (czas * 0.00035) % 2.2;
      if (b < 1) {
        const [x0, y0] = P(dl * Math.max(0.02, b - 0.12), 0), [x1, y1] = P(dl * Math.min(0.86, b + 0.12), 0);
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, 'rgba(236,226,200,0)'); gr.addColorStop(0.5, 'rgba(236,226,200,0.5)'); gr.addColorStop(1, 'rgba(236,226,200,0)');
        g.strokeStyle = gr; g.lineWidth = sz * 1.2; g.lineCap = 'butt';
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.lineCap = 'round';
      }
    }
  });
  const zl = m.bryla({ x: tx - n.x * 0.06 * h, y: ty - n.y * 0.06 * h }, { x: tx + n.x * 0.06 * h, y: ty + n.y * 0.06 * h }, h * 0.01, st.zloto);
  m.kreska(tx - n.x * 0.055 * h, ty - n.y * 0.055 * h, tx + n.x * 0.055 * h, ty + n.y * 0.055 * h, Math.max(1.1, h * 0.018), zl);
  const rx = x - d.x * 0.06 * h, ry = y - d.y * 0.06 * h;
  m.kreska(rx, ry, tx, ty, Math.max(1.1, h * 0.018), tonC(st.skorzane, -0.1, CIEN.tkanina));
  const gl = new Path2D(); gl.arc(rx - d.x * 0.012 * h, ry - d.y * 0.012 * h, Math.max(1, h * 0.017), 0, TAU);
  m.ksztalt(gl, m.kula({ x: rx, y: ry }, h * 0.018, st.zloto, false, 0.4, CIEN.metal));
  return czubek;
}

/**
 * Krzyż procesyjny pobożnego: smukłe drzewce do ziemi, na szczycie złoty krzyż o rozszerzonych
 * ramionach z tarczką pośrodku. `wahadlo` porusza zawieszonymi pod krzyżem frędzlami.
 */
export function laska(m: Malarz, x: number, y: number, kat: number, h: number, st: Stroj, wahadlo: number, czas: number, doZiemi: boolean, id: number): Pkt {
  const d = kier(kat);
  const dol = doZiemi && d.y > 0.35 ? clamp(-y / d.y, 0.2 * h, 0.8 * h) : 0.45 * h;
  const gora = 0.38 * h;
  const ax = x + d.x * dol, ay = y + d.y * dol, bx = x - d.x * gora, by = y - d.y * gora;
  m.kreska(ax, ay, bx, by, Math.max(1, h * 0.017), m.bryla({ x: ax, y: ay }, { x: bx, y: by }, h * 0.009, st.drewno));
  const n = kier(kat - PI / 2);
  const cx = bx - d.x * 0.075 * h, cy = by - d.y * 0.075 * h;
  // krzyż o ramionach rozszerzonych na końcach
  const ram = (ux: number, uy: number, L: number): number[] => {
    const px = -uy, py = ux;
    return [cx + px * 0.008 * h, cy + py * 0.008 * h, cx + ux * L + px * 0.016 * h, cy + uy * L + py * 0.016 * h, cx + ux * L - px * 0.016 * h, cy + uy * L - py * 0.016 * h, cx - px * 0.008 * h, cy - py * 0.008 * h];
  };
  const krzyz = new Path2D();
  for (const [ux, uy, L] of [[-d.x, -d.y, 0.075 * h], [d.x, d.y, 0.07 * h], [n.x, n.y, 0.058 * h], [-n.x, -n.y, 0.058 * h]] as const) {
    const pk = ram(ux, uy, L);
    krzyz.moveTo(pk[0], pk[1]); for (let i = 2; i < pk.length; i += 2) krzyz.lineTo(pk[i], pk[i + 1]); krzyz.closePath();
  }
  krzyz.moveTo(cx + 0.017 * h, cy); krzyz.arc(cx, cy, 0.017 * h, 0, TAU);
  m.ksztalt(krzyz, m.metal({ x: cx - n.x * 0.06 * h, y: cy - n.y * 0.06 * h }, { x: cx + n.x * 0.06 * h, y: cy + n.y * 0.06 * h }, 0.05 * h, st.zloto, false, CIEN.tkanina), (g) => {
    if (m.prosto) return;
    g.fillStyle = tonC(st.stula, 0.05, CIEN.tkanina);
    g.beginPath(); g.arc(cx, cy, Math.max(0.6, 0.008 * h), 0, TAU); g.fill();
    // dwa frędzle pod ramionami krzyża
    g.strokeStyle = tonC(st.stula, -0.1, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.007);
    for (const k of [1, -1]) {
      const zx = cx + n.x * k * 0.05 * h + d.x * 0.01 * h, zy = cy + n.y * k * 0.05 * h + d.y * 0.01 * h;
      const a = wahadlo * 0.7 + sin(czas * 0.004 + id + k) * 0.15;
      g.beginPath(); g.moveTo(zx, zy); g.lineTo(zx + sin(a) * 0.035 * h, zy + cos(a) * 0.035 * h); g.stroke();
    }
  });
  return { x: ax, y: ay };
}

/** Młotek (stawianie ołtarza). Zwraca obuch. */
export function mlotek(m: Malarz, x: number, y: number, kat: number, h: number, st: Stroj): Pkt {
  const d = kier(kat), n = kier(kat - PI / 2);
  const ex = x + d.x * 0.15 * h, ey = y + d.y * 0.15 * h;
  m.kreska(x - d.x * 0.03 * h, y - d.y * 0.03 * h, ex, ey, Math.max(1, h * 0.017), ton(st.drewno, -0.1));
  const gl = wielokat([
    ex + n.x * 0.045 * h - d.x * 0.02 * h, ey + n.y * 0.045 * h - d.y * 0.02 * h,
    ex + n.x * 0.045 * h + d.x * 0.025 * h, ey + n.y * 0.045 * h + d.y * 0.025 * h,
    ex - n.x * 0.03 * h + d.x * 0.025 * h, ey - n.y * 0.03 * h + d.y * 0.025 * h,
    ex - n.x * 0.03 * h - d.x * 0.02 * h, ey - n.y * 0.03 * h - d.y * 0.02 * h,
  ]);
  m.ksztalt(gl, m.metal({ x: ex - n.x * 0.03 * h, y: ey - n.y * 0.03 * h }, { x: ex + n.x * 0.045 * h, y: ey + n.y * 0.045 * h }, 0.02 * h, ZELAZO));
  return { x: ex + n.x * 0.045 * h, y: ey + n.y * 0.045 * h };
}

/** Grzyb jaskiniowy: blady, z zielonkawą poświatą — jedyne, co tu rośnie. */
export function grzyb(g: CanvasRenderingContext2D, x: number, y: number, h: number, lod: number): void {
  if (lod) poswiata(g, x, y - h * 0.035, h * 0.06, [170, 230, 170], 0.22);
  g.fillStyle = 'rgb(196,190,166)';
  g.fillRect(x - h * 0.007, y - h * 0.035, h * 0.014, h * 0.035);
  g.fillStyle = 'rgb(214,214,186)';
  g.beginPath(); g.ellipse(x, y - h * 0.035, h * 0.032, h * 0.022, 0, PI, 0); g.closePath(); g.fill();
  if (lod) {
    g.strokeStyle = 'rgba(120,130,96,0.8)'; g.lineWidth = Math.max(0.4, h * 0.004);
    g.beginPath(); g.moveTo(x - h * 0.03, y - h * 0.036); g.lineTo(x + h * 0.03, y - h * 0.036); g.stroke();
  }
}

/** Odpryski skały, iskry z żelaza i pył z miejsca uderzenia. */
export function odpryski(g: CanvasRenderingContext2D, pm: Pamiec, czas: number, h: number, id: number): void {
  const z0 = pm.udar;
  if (!z0) return;
  const u = { x: z0.x * h, y: z0.y * h, t: z0.t };
  const t = (czas - u.t) / 1000;
  if (t < 0 || t > 0.6) return;
  const z = 1 - t / 0.6;
  for (let i = 0; i < 8; i++) {
    const a = -2.5 + i * 0.32 + sin(id * 3.1 + i * 1.7 + Math.floor(u.t / 997)) * 0.25;
    const v = h * (0.7 + ((i * 37) % 10) / 14);
    const px = u.x + Math.cos(a) * v * t, py = u.y + Math.sin(a) * v * t + 2.2 * h * t * t;
    const r = Math.max(0.7, h * (0.008 + (i % 3) * 0.005));
    g.fillStyle = i % 3 ? `rgba(150,136,116,${z})` : `rgba(96,84,70,${z})`;
    g.fillRect(px - r / 2, py - r / 2, r, r);
  }
  // iskry z żelaza — krótko, pomarańczowo
  if (t < 0.2) {
    const zz = 1 - t / 0.2;
    g.fillStyle = `rgba(255,170,80,${zz})`;
    for (let i = 0; i < 5; i++) {
      const a = -1.9 + i * 0.45 + sin(id + i * 2.3) * 0.3;
      const px = u.x + Math.cos(a) * h * 1.6 * t, py = u.y + Math.sin(a) * h * 1.6 * t + 3 * h * t * t;
      g.fillRect(px, py, Math.max(0.8, h * 0.008), Math.max(0.8, h * 0.008));
    }
  }
  const pr = h * (0.03 + t * 0.25);
  const gr = g.createRadialGradient(u.x, u.y, 0, u.x, u.y, pr);
  gr.addColorStop(0, `rgba(120,108,92,${0.4 * z})`); gr.addColorStop(1, 'rgba(120,108,92,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(u.x, u.y, pr, 0, TAU); g.fill();
}

// ------------------------------------------------------------------ światło i powietrze

/** Ciepłe albo zimne światło — mieszane addytywnie. */
export function poswiata(g: CanvasRenderingContext2D, x: number, y: number, r: number, barwa: [number, number, number], a: number): void {
  if (a <= 0.01 || r <= 0.5) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${barwa[0]},${barwa[1]},${barwa[2]},${a})`); gr.addColorStop(1, `rgba(${barwa[0]},${barwa[1]},${barwa[2]},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.restore();
}

/** Migotanie płomienia 0..1 — różne dla każdej świecy. */
export function migot(czas: number, id: number): number {
  return 0.72 + 0.16 * sin(czas * 0.031 + id) * sin(czas * 0.017 + id * 1.7) + 0.12 * sin(czas * 0.052 + id * 3.3);
}

/** Świeca (ogarek z łojem): wosk, knot, płomień, światło. (x, y) — podstawa; `pion` — kąt „do góry”. */
export function swieca(g: CanvasRenderingContext2D, x: number, y: number, h: number, czas: number, id: number, lod: number, pion = 0): void {
  const m = migot(czas, id);
  const ux = sin(pion), uy = -cos(pion);
  const wys = h * 0.045, sz = h * 0.016;
  const gx = x + ux * wys, gy = y + uy * wys;
  if (lod === 0 || h < 46) {
    // z daleka: jasny punkt płomienia i wyraźna poświata
    poswiata(g, gx, gy - 1, Math.max(9, h * 0.38), [255, 160, 70], 0.55 * m);
    g.fillStyle = 'rgba(255,236,180,1)'; g.fillRect(gx - 1, gy - 2.6, 2, 2.4);
    if (lod === 0) return;
  } else poswiata(g, gx, gy - h * 0.02, h * (0.3 + 0.05 * m), [255, 160, 70], 0.32 * m);
  g.fillStyle = 'rgb(206,192,156)';
  g.beginPath();
  g.moveTo(x - uy * sz, y + ux * sz); g.lineTo(gx - uy * sz, gy + ux * sz);
  g.lineTo(gx + uy * sz, gy - ux * sz); g.lineTo(x + uy * sz, y - ux * sz); g.closePath(); g.fill();
  if (lod === 2) {
    // zacieki wosku
    g.fillStyle = 'rgb(222,210,176)';
    g.beginPath(); g.ellipse(gx - uy * sz * 0.8 - ux * h * 0.012, gy + ux * sz * 0.8 - uy * h * 0.012, sz * 0.32, h * 0.012, pion, 0, TAU); g.fill();
  }
  // płomień: kropla, białe jądro, pomarańczowy brzeg, drga
  const fh = h * (0.045 + 0.012 * m), fw = h * 0.013;
  const fx = gx + ux * fh * 0.55 + sin(czas * 0.02 + id) * h * 0.003, fy = gy + uy * fh * 0.55;
  const gr = g.createRadialGradient(fx, fy + fh * 0.18, 0, fx, fy, fh * 0.6);
  gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.45, 'rgba(255,200,110,0.95)'); gr.addColorStop(1, 'rgba(230,90,30,0)');
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(fx, fy, fw, fh * 0.55, pion, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(30,20,14,0.9)'; g.lineWidth = Math.max(0.4, h * 0.003);
  g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + ux * h * 0.008, gy + uy * h * 0.008); g.stroke();
}

/** Dym (kadzidło, kopeć świecy): smugi wznoszą się, rozmywają i gasną. */
export function dym(g: CanvasRenderingContext2D, x: number, y: number, h: number, czas: number, id: number, ile: number, sila: number): void {
  for (let i = 0; i < ile; i++) {
    const t = frac(czas * 0.00032 + i / ile + id * 0.17);
    const a = 0.22 * (1 - t) * sila * Math.min(1, t * 6);
    if (a <= 0.01) continue;
    const px = x + sin(t * 6 + i * 1.9 + id) * 0.03 * h + t * 0.02 * h, py = y - t * 0.32 * h;
    const r = h * (0.012 + t * 0.045);
    g.fillStyle = `rgba(150,146,140,${a})`;
    g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
  }
}

/** Para z ust — w zimnych trzewiach góry oddech widać co kilka sekund. */
export function para(g: CanvasRenderingContext2D, x: number, y: number, h: number, czas: number, id: number, sila = 1): void {
  const okres = 3600 + (id % 7) * 230;
  const t = ((czas + id * 911) % okres) / 1200;
  if (t > 1) return;
  for (let i = 0; i < 3; i++) {
    const ti = t - i * 0.12;
    if (ti <= 0) continue;
    const a = 0.2 * (1 - ti) * Math.min(1, ti * 5) * sila;
    const px = x + ti * h * 0.1 + i * h * 0.01, py = y - ti * h * 0.05 + sin(ti * 5 + i) * h * 0.006;
    g.fillStyle = `rgba(206,210,214,${a})`;
    g.beginPath(); g.arc(px, py, h * (0.01 + ti * 0.03), 0, TAU); g.fill();
  }
}

/** Pył osypujący się z kamiennej zbroi. */
export function pyl(g: CanvasRenderingContext2D, x: number, y: number, szer: number, h: number, czas: number, id: number): void {
  for (let i = 0; i < 5; i++) {
    const t = frac(czas * 0.0004 + i * 0.21 + id * 0.37);
    const a = 0.55 * (1 - t);
    const px = x + (frac(i * 0.618 + id * 0.11) - 0.5) * szer + sin(t * 4 + i) * h * 0.01, py = y + t * h * 0.5;
    g.fillStyle = `rgba(150,144,132,${a})`;
    g.fillRect(px, py, Math.max(0.6, h * 0.006), Math.max(0.6, h * 0.006));
  }
}

/** Krew kapie z rany co jakiś czas. */
export function krople(g: CanvasRenderingContext2D, x: number, y: number, h: number, czas: number, id: number): void {
  const t = frac(czas * 0.0005 + id * 0.29);
  g.fillStyle = 'rgba(96,12,10,0.95)';
  if (t < 0.6) {
    const r = h * 0.007 * (0.5 + t);
    g.beginPath(); g.arc(x, y + r, r, 0, TAU); g.fill();
  } else {
    const tt = (t - 0.6) / 0.4;
    g.beginPath(); g.ellipse(x, y + h * 0.01 + tt * tt * h * 0.4, h * 0.005, h * 0.009, 0, 0, TAU); g.fill();
  }
}

/** Nimb jak na fresku: złota tarcza za głową, ryte promienie, przygaszony blask. */
export function nimb(g: CanvasRenderingContext2D, x: number, y: number, r: number, sila: number, lod: number, zloto: Rgb): void {
  if (sila <= 0.02) return;
  poswiata(g, x, y, r * 1.8, [255, 214, 140], 0.16 * sila);
  g.save();
  g.globalAlpha = Math.min(1, sila);
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  gr.addColorStop(0, tonC(zloto, 0.25, CIEN.tkanina)); gr.addColorStop(0.8, tonC(zloto, -0.1, CIEN.tkanina)); gr.addColorStop(1, tonC(zloto, -0.45, CIEN.tkanina));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = tonC(zloto, -0.6, CIEN.tkanina); g.lineWidth = Math.max(0.6, r * 0.06);
  g.beginPath(); g.arc(x, y, r * 0.92, 0, TAU); g.stroke();
  if (lod === 2) {
    g.lineWidth = Math.max(0.4, r * 0.025);
    g.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; g.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); g.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); }
    g.stroke();
  }
  g.restore();
}

/** Muchy krążą nad zatrutym. */
export function muchy(g: CanvasRenderingContext2D, x: number, y: number, h: number, czas: number, id: number): void {
  g.fillStyle = 'rgba(18,14,12,0.9)';
  for (let i = 0; i < 3; i++) {
    const a = czas * (0.006 + i * 0.0017) + i * 2.1 + id;
    const px = x + Math.cos(a) * h * (0.08 + i * 0.03), py = y + Math.sin(a * 1.7) * h * 0.05 - h * 0.04;
    g.fillRect(px, py, Math.max(0.8, h * 0.008), Math.max(0.8, h * 0.006));
  }
}
