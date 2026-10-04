import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import type { Czynnosc } from '../figury';
import { clamp, cos, kier, PI, sin, TAU, ton, type Pkt, type Rgb } from './matma';
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

/** Tułów: biodra, talia, pierś wypchnięta do przodu, zaokrąglone barki, plecy z lekkim łukiem. */
export function tulowSciezka(s: Szkielet, h: number, szerB: number, szerP: number, piers = 1, brzuch = 1, przod = 1): Path2D {
  const tx = sin(s.katT), ty = -cos(s.katT);           // w górę tułowia
  const fx = cos(s.katT), fy = sin(s.katT);            // do przodu
  const L = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const B = s.biodro, Bk = s.bark;
  const P = (o: Pkt, t: number, f: number): [number, number] => [o.x + tx * t + fx * f, o.y + ty * t + fy * f];
  const sB = szerB * h, sP = szerP * h;
  const p = new Path2D();
  p.moveTo(...P(B, -0.01 * h, -sP));
  const q = przod;
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
export function gradTulowia(m: Malarz, s: Szkielet, h: number, kol: Rgb, sila = 1): string | CanvasGradient {
  const fx = cos(s.katT), fy = sin(s.katT);
  return m.plaszczyzna(s.bark.x + fx * 0.09 * h, s.bark.y + fy * 0.09 * h - 0.02 * h, s.biodro.x - fx * 0.08 * h, s.biodro.y + 0.02 * h, kol, false, sila);
}

export interface Noga { udo: Rgb; golen: Rgb; but: Rgb; grub?: number; metal?: boolean; cholewka?: number }

/** Noga od biodra: udo z mięśniem z przodu, łydka z tyłu, but z podeszwą. */
export function noga(r: Rysunek, kol: Pkt, st: Stopa, dalej: boolean, n: Noga): void {
  const { m, s, h } = r;
  const g = n.grub ?? 1;
  const ru = 0.056 * h * g, rk = 0.04 * h * g, rs = 0.03 * h * g;
  const grad = (a: Pkt, b: Pkt, rr: number, k: Rgb) => (n.metal ? m.metal(a, b, rr, k, dalej) : m.bryla(a, b, rr, k, dalej));
  m.ksztalt(konczyna(s.biodro, ru, kol, rk, 0.004 * h * g, 0.012 * h * g, 0.35), grad(s.biodro, kol, ru, n.udo), undefined, !dalej);
  m.ksztalt(konczyna(kol, rk, st.kostka, rs, 0.014 * h * g, 0.003 * h * g, 0.3), grad(kol, st.kostka, rk, n.golen), undefined, !dalej);
  m.ksztalt(but(st, h, n.cholewka ?? 0.05, g), m.plaszczyzna(st.kostka.x, st.kostka.y - 0.03 * h, st.podeszwa.x, st.podeszwa.y + 0.01 * h, n.but, dalej), (gg) => {
    if (m.prosto) return;
    podeszwa(gg, st, h, ton(n.but, dalej ? -0.6 : -0.45));
    if (m.lod === 2 && !dalej) {
      // błysk na nosku buta
      const f = { x: cos(st.kat), y: -sin(st.kat) }, nn = { x: sin(st.kat), y: cos(st.kat) };
      gg.strokeStyle = 'rgba(255,240,220,0.35)'; gg.lineWidth = Math.max(0.6, h * 0.008);
      gg.beginPath();
      gg.moveTo(st.podeszwa.x + f.x * 0.045 * h - nn.x * 0.03 * h, st.podeszwa.y + f.y * 0.045 * h - nn.y * 0.03 * h);
      gg.quadraticCurveTo(st.podeszwa.x + f.x * 0.07 * h - nn.x * 0.026 * h, st.podeszwa.y + f.y * 0.07 * h - nn.y * 0.026 * h, st.podeszwa.x + f.x * 0.078 * h - nn.x * 0.012 * h, st.podeszwa.y + f.y * 0.078 * h - nn.y * 0.012 * h);
      gg.stroke();
    }
  });
}

export interface Reka { ramie: Rgb; przed: Rgb; dlon: Rgb; grub?: number; piesc?: boolean; metal?: boolean; rekaw?: number }

/** Ręka: ramię z barkiem, przedramię zwężone ku nadgarstkowi, dłoń z kciukiem albo pięść. */
export function reka(r: Rysunek, bark: Pkt, lok: Pkt, dl: Pkt, przed: number, dalej: boolean, n: Reka): void {
  const { m, h } = r;
  const g = n.grub ?? 1, rw = n.rekaw ?? 1;
  const r1 = 0.04 * h * g * rw, r2 = 0.031 * h * g * rw, r3 = 0.024 * h * g;
  const grad = (a: Pkt, b: Pkt, rr: number, k: Rgb) => (n.metal ? m.metal(a, b, rr, k, dalej) : m.bryla(a, b, rr, k, dalej));
  m.ksztalt(konczyna(bark, r1, lok, r2, 0.004 * h * g, 0.007 * h * g, 0.3), grad(bark, lok, r1, n.ramie), undefined, !dalej);
  m.ksztalt(konczyna(lok, r2 * (n.rekaw ? 0.92 : 1), dl, r3, 0.004 * h * g, 0.006 * h * g, 0.3), grad(lok, dl, r2, n.przed), undefined, !dalej);
  m.ksztalt(dlon(dl, przed, 0.028 * h * g, !!n.piesc), m.kula(dl, 0.03 * h, n.dlon, dalej));
}

// ------------------------------------------------------------------ narzędzia

/** Kilof: drewniany trzonek i żelazny obuch — szpic w stronę ciosu, płaskie ostrze z tyłu. */
export function kilof(m: Malarz, x: number, y: number, kat: number, h: number, st: Stroj): Pkt {
  const d = kier(kat), a = kier(kat - PI / 2);
  const tylT = 0.13 * h, dl = 0.34 * h;
  const ax = x - d.x * tylT, ay = y - d.y * tylT, ex = x + d.x * dl, ey = y + d.y * dl;
  m.kreska(ax, ay, ex, ey, Math.max(1.2, h * 0.024), m.bryla({ x: ax, y: ay }, { x: ex, y: ey }, h * 0.012, st.drewno), (g) => {
    if (m.lod < 2) return;
    g.strokeStyle = ton(st.drewno, -0.35, 0.7); g.lineWidth = Math.max(0.4, h * 0.004);
    g.beginPath(); g.moveTo(ax + a.x * h * 0.004, ay + a.y * h * 0.004); g.lineTo(ex + a.x * h * 0.004, ey + a.y * h * 0.004); g.stroke();
  });
  const E = (da: number, dd: number): [number, number] => [ex + a.x * da * h + d.x * dd * h, ey + a.y * da * h + d.y * dd * h];
  const ob = new Path2D();
  ob.moveTo(...E(0.02, 0.02));
  ob.quadraticCurveTo(...E(0.1, 0.01), ...E(0.158, -0.034));
  ob.quadraticCurveTo(...E(0.085, -0.016), ...E(0.02, -0.02));
  ob.lineTo(...E(-0.02, -0.02));
  ob.lineTo(...E(-0.07, -0.016));
  ob.lineTo(...E(-0.082, 0.004));
  ob.lineTo(...E(-0.07, 0.022));
  ob.lineTo(...E(-0.02, 0.02));
  ob.closePath();
  const [s1x, s1y] = E(0.15, 0), [s2x, s2y] = E(-0.08, 0);
  m.ksztalt(ob, m.metal({ x: s1x, y: s1y }, { x: s2x, y: s2y }, h * 0.025, [168, 172, 180]), (g) => {
    if (m.prosto) return;
    g.fillStyle = 'rgba(30,24,20,0.85)';
    const [kx, ky] = E(0, 0);
    g.beginPath(); g.arc(kx, ky, Math.max(0.6, h * 0.011), 0, TAU); g.fill();
  });
  const [tx, ty] = E(0.158, -0.034);
  return { x: tx, y: ty };
}

/** Miecz: ostrze ze zbroczem, złoty jelec, owinięta rękojeść, głowica. Zwraca czubek. */
export function miecz(m: Malarz, x: number, y: number, kat: number, h: number, st: Stroj, czas: number): Pkt {
  const d = kier(kat), n = kier(kat - PI / 2);
  const dl = 0.5 * h, sz = 0.022 * h;
  const tx = x + d.x * 0.04 * h, ty = y + d.y * 0.04 * h;
  const P = (wd: number, wn: number): number[] => [tx + d.x * wd + n.x * wn, ty + d.y * wd + n.y * wn];
  const ostrze = wielokat([...P(0, sz), ...P(dl * 0.84, sz * 0.82), ...P(dl, 0), ...P(dl * 0.84, -sz * 0.82), ...P(0, -sz)]);
  const czubek = { x: tx + d.x * dl, y: ty + d.y * dl };
  m.ksztalt(ostrze, m.metal({ x: tx, y: ty }, czubek, sz, [214, 222, 234]), (g) => {
    if (m.prosto) return;
    // zbrocze i biegnący błysk
    g.strokeStyle = 'rgba(90,100,120,0.55)'; g.lineWidth = Math.max(0.5, h * 0.006);
    g.beginPath(); g.moveTo(...(P(dl * 0.05, 0) as [number, number])); g.lineTo(...(P(dl * 0.72, 0) as [number, number])); g.stroke();
    const b = (czas * 0.0006) % 1.6;
    if (b < 1 && m.lod === 2) {
      const [x0, y0] = P(dl * Math.max(0.02, b - 0.15), 0) as [number, number], [x1, y1] = P(dl * Math.min(0.8, b + 0.15), 0) as [number, number];
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = gr; g.lineWidth = sz * 1.3; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.lineCap = 'round';
    }
  });
  // jelec, rękojeść, głowica
  const jx = tx, jy = ty;
  m.kreska(jx - n.x * 0.075 * h, jy - n.y * 0.075 * h, jx + n.x * 0.075 * h, jy + n.y * 0.075 * h, Math.max(1.2, h * 0.022), m.bryla({ x: jx - n.x * 0.07 * h, y: jy - n.y * 0.07 * h }, { x: jx + n.x * 0.07 * h, y: jy + n.y * 0.07 * h }, h * 0.011, st.zloto));
  const rx = x - d.x * 0.055 * h, ry = y - d.y * 0.055 * h;
  m.kreska(rx, ry, tx, ty, Math.max(1.1, h * 0.02), ton(st.skorzany), (g) => {
    if (m.lod < 2) return;
    g.strokeStyle = ton(st.skorzany, -0.45); g.lineWidth = Math.max(0.4, h * 0.004);
    for (let i = 1; i < 4; i++) {
      const t = i / 4, cx = rx + (tx - rx) * t, cy = ry + (ty - ry) * t;
      g.beginPath(); g.moveTo(cx - n.x * 0.009 * h - d.x * 0.006 * h, cy - n.y * 0.009 * h - d.y * 0.006 * h); g.lineTo(cx + n.x * 0.009 * h + d.x * 0.006 * h, cy + n.y * 0.009 * h + d.y * 0.006 * h); g.stroke();
    }
  });
  const gl = new Path2D(); gl.arc(rx - d.x * 0.012 * h, ry - d.y * 0.012 * h, Math.max(1, h * 0.019), 0, TAU);
  m.ksztalt(gl, m.kula({ x: rx, y: ry }, h * 0.02, st.zloto, false, 0.6));
  return czubek;
}

/**
 * Laska pobożnego: sękate drewno sięga do ziemi, na szczycie złoty krzyż w kole z kamieniem,
 * pod nim wstążka, która powiewa w ruchu.
 */
export function laska(m: Malarz, x: number, y: number, kat: number, h: number, st: Stroj, wstega: number, czas: number, doZiemi: boolean): Pkt {
  const d = kier(kat);
  const dol = doZiemi && d.y > 0.35 ? clamp(-y / d.y, 0.2 * h, 0.8 * h) : 0.45 * h;
  const gora = 0.36 * h;
  const ax = x + d.x * dol, ay = y + d.y * dol, bx = x - d.x * gora, by = y - d.y * gora;
  m.kreska(ax, ay, bx, by, Math.max(1.2, h * 0.022), m.bryla({ x: ax, y: ay }, { x: bx, y: by }, h * 0.011, st.drewno), (g) => {
    if (m.lod < 2) return;
    g.fillStyle = ton(st.drewno, -0.3);
    for (const t of [0.25, 0.55, 0.8]) { const cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t; g.beginPath(); g.ellipse(cx, cy, h * 0.012, h * 0.006, Math.atan2(by - ay, bx - ax), 0, TAU); g.fill(); }
  });
  const n = kier(kat - PI / 2);
  const cx = bx - d.x * 0.075 * h, cy = by - d.y * 0.075 * h;          // środek krzyża
  // wstążka pod krzyżem
  if (!m.prosto) {
    const wx = bx - d.x * 0.005 * h, wy = by - d.y * 0.005 * h;
    m.szczegol((g) => {
      for (let i = 0; i < 2; i++) {
        // wstega to sprężyna ok. −0,35 w spoczynku, ujemniejsza w ruchu: zwisa, a w biegu odchodzi do tyłu
        const a = (wstega + 0.35) * 1.3 - i * 0.18 + sin(czas * 0.007 + i * 1.7) * 0.12;
        const L = h * (0.1 - i * 0.02);
        const ex = wx + sin(a) * L, ey = wy + cos(a) * L;
        g.strokeStyle = i ? ton([150, 40, 40]) : ton([178, 50, 46]); g.lineWidth = Math.max(0.9, h * 0.014); g.lineCap = 'round';
        g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx - L * 0.2 + sin(czas * 0.01 + i) * h * 0.01, wy + L * 0.4, ex, ey); g.stroke();
      }
    });
  }
  const zl = m.bryla({ x: cx - n.x * h * 0.05, y: cy - n.y * h * 0.05 }, { x: cx + n.x * h * 0.05, y: cy + n.y * h * 0.05 }, h * 0.03, st.zloto);
  m.kreska(bx, by, bx - d.x * 0.15 * h, by - d.y * 0.15 * h, Math.max(1.3, h * 0.026), zl);
  m.kreska(cx - n.x * 0.05 * h, cy - n.y * 0.05 * h, cx + n.x * 0.05 * h, cy + n.y * 0.05 * h, Math.max(1.3, h * 0.026), zl);
  if (!m.prosto) {
    m.szczegol((g) => {
      g.strokeStyle = ton(st.zloto, -0.1); g.lineWidth = Math.max(0.6, h * 0.008);
      g.beginPath(); g.arc(cx, cy, h * 0.032, 0, TAU); g.stroke();
      const swiec = 0.6 + 0.4 * sin(czas * 0.004);
      g.fillStyle = `rgba(150,220,255,${0.9})`;
      g.beginPath(); g.arc(cx, cy, Math.max(0.8, h * 0.011), 0, TAU); g.fill();
      if (m.lod === 2) {
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, h * 0.06);
        gr.addColorStop(0, `rgba(170,230,255,${0.45 * swiec})`); gr.addColorStop(1, 'rgba(170,230,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, h * 0.06, 0, TAU); g.fill();
      }
    });
  }
  return { x: ax, y: ay };
}

/** Młotek (stawianie ołtarza). Zwraca obuch. */
export function mlotek(m: Malarz, x: number, y: number, kat: number, h: number, st: Stroj): Pkt {
  const d = kier(kat), n = kier(kat - PI / 2);
  const ex = x + d.x * 0.15 * h, ey = y + d.y * 0.15 * h;
  m.kreska(x - d.x * 0.03 * h, y - d.y * 0.03 * h, ex, ey, Math.max(1, h * 0.018), ton(st.drewno));
  const gl = wielokat([
    ex + n.x * 0.045 * h - d.x * 0.02 * h, ey + n.y * 0.045 * h - d.y * 0.02 * h,
    ex + n.x * 0.045 * h + d.x * 0.025 * h, ey + n.y * 0.045 * h + d.y * 0.025 * h,
    ex - n.x * 0.03 * h + d.x * 0.025 * h, ey - n.y * 0.03 * h + d.y * 0.025 * h,
    ex - n.x * 0.03 * h - d.x * 0.02 * h, ey - n.y * 0.03 * h - d.y * 0.02 * h,
  ]);
  m.ksztalt(gl, m.metal({ x: ex - n.x * 0.03 * h, y: ey - n.y * 0.03 * h }, { x: ex + n.x * 0.045 * h, y: ey + n.y * 0.045 * h }, 0.02 * h, [150, 150, 156]));
  return { x: ex + n.x * 0.045 * h, y: ey + n.y * 0.045 * h };
}

/** Grzyb w dłoni: czerwony kapelusz w białe kropki. */
export function grzyb(g: CanvasRenderingContext2D, x: number, y: number, h: number, lod: number): void {
  g.fillStyle = ton([232, 220, 196]);
  g.fillRect(x - h * 0.008, y - h * 0.035, h * 0.016, h * 0.035);
  g.fillStyle = ton([200, 58, 46]);
  g.beginPath(); g.ellipse(x, y - h * 0.035, h * 0.034, h * 0.024, 0, PI, 0); g.closePath(); g.fill();
  if (lod) {
    g.fillStyle = 'rgba(250,244,230,0.95)';
    for (const [dx, dy] of [[-0.016, -0.045], [0.008, -0.05], [0.02, -0.04]]) { g.beginPath(); g.arc(x + dx * h, y + dy * h, Math.max(0.5, h * 0.005), 0, TAU); g.fill(); }
  }
}

/** Odpryski skały i pył z miejsca uderzenia — lecą w górę i opadają. */
export function odpryski(g: CanvasRenderingContext2D, pm: Pamiec, czas: number, h: number, id: number): void {
  const z0 = pm.udar;
  if (!z0) return;
  const u = { x: z0.x * h, y: z0.y * h, t: z0.t };
  const t = (czas - u.t) / 1000;
  if (t < 0 || t > 0.55) return;
  const z = 1 - t / 0.55;
  for (let i = 0; i < 8; i++) {
    const a = -2.5 + i * 0.32 + sin(id * 3.1 + i * 1.7 + Math.floor(u.t / 997)) * 0.25;
    const v = h * (0.7 + ((i * 37) % 10) / 14);
    const px = u.x + Math.cos(a) * v * t, py = u.y + Math.sin(a) * v * t + 2.2 * h * t * t;
    const r = Math.max(0.7, h * (0.008 + (i % 3) * 0.005));
    g.fillStyle = i % 3 ? `rgba(214,196,166,${z})` : `rgba(150,130,104,${z})`;
    g.fillRect(px - r / 2, py - r / 2, r, r);
  }
  const pr = h * (0.03 + t * 0.25);
  const gr = g.createRadialGradient(u.x, u.y, 0, u.x, u.y, pr);
  gr.addColorStop(0, `rgba(200,180,150,${0.4 * z})`); gr.addColorStop(1, 'rgba(200,180,150,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(u.x, u.y, pr, 0, TAU); g.fill();
  if (t < 0.08) {
    g.fillStyle = `rgba(255,236,190,${1 - t / 0.08})`;
    g.beginPath(); g.arc(u.x, u.y, h * 0.02, 0, TAU); g.fill();
  }
}

/** Iskry modlitwy / światła — unoszą się i gasną. */
export function iskry(g: CanvasRenderingContext2D, x: number, y: number, h: number, czas: number, id: number, ile: number, sila: number): void {
  for (let i = 0; i < ile; i++) {
    const t = (czas * 0.00045 + i / ile + id * 0.13) % 1;
    const a = 0.85 * (1 - t) * sila;
    if (a <= 0.02) continue;
    const px = x + sin(t * 9 + i * 2.3) * 0.045 * h, py = y - t * 0.5 * h;
    const r = Math.max(0.6, h * 0.013 * (1 - t * 0.5));
    g.fillStyle = `rgba(255,236,170,${a})`;
    g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
    if (r > 1.2) { g.fillStyle = `rgba(255,244,210,${a * 0.35})`; g.beginPath(); g.arc(px, py, r * 2.4, 0, TAU); g.fill(); }
  }
}

/** Ciepłe światło (modlitwa, księga, lampka) — mieszane addytywnie. */
export function poswiata(g: CanvasRenderingContext2D, x: number, y: number, r: number, barwa: [number, number, number], a: number): void {
  if (a <= 0.01) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${barwa[0]},${barwa[1]},${barwa[2]},${a})`); gr.addColorStop(1, `rgba(${barwa[0]},${barwa[1]},${barwa[2]},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.restore();
}
