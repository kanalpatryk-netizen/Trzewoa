/**
 * CERBER (Krąg Trzeci, beta) — 2. rysunek, po uwadze użytkownika (15.11): „aktualny Cerber to co najmniej
 * nieporozumienie, musi wyglądać dużo, dużo lepiej”.
 *
 * Ciężki pies piekielny w przekroju anatomicznym: głęboka pierś, potężne łopatki i kłąb, obwisły brzuch żarłoka
 * („brzuch szeroki” — pieśń VI), umięśnione uda i stawy skokowe, wielkie łapy z pazurami. Trzy grube szyje z tłustą,
 * czarną grzywą, trzy psie czaszki: mózgoczaszka, stop, długa kufa, obwisłe fafle, nos, zmarszczki przy warczeniu,
 * odsłonięte dziąsła, kły i siekacze, język, ślina; oczy żarzą się czerwono. Skóra: ciemna, wyliniała sierść (faktura
 * z wypiekanego wzoru), łyse placki z bliznami, mokry połysk deszczu, krew na pysku i piersi. Wężowy ogon.
 * Układ: stopy w (0, 0), pyski w prawo, `h` — wysokość do czubka najwyższej głowy. Ta sama poza (PozaCerbera) co
 * dawniej — rysunek dla posągu w pieczęci (kamień), walki, zabijania i filmu.
 */

import { rysujCerberaZWypieku } from './cerber-sprite';

export interface GlowaCerbera {
  /** pochylenie głowy (radiany, + w dół), otwarcie paszczy 0…1, wysunięcie do przodu 0…1 (kłapnięcie) */
  pochyl: number; paszcza: number; wysun: number;
  /** oczy 0…1 (żar) */
  oczy: number;
}

export interface PozaCerbera {
  /** 0 — żywy, 1 — kamień (płaskorzeźba na pieczęci) */
  kamien: number;
  /** 0 — stoi, 1 — leży jak sfinks */
  lezy: number;
  /** chód: faza (radiany) i wielkość kroku 0…1 */
  faza: number; krok: number;
  /** staje dęba 0…1, przysiad 0…1, odrzut do tyłu 0…1 */
  deba: number; przysiad: number; odrzut: number;
  glowy: [GlowaCerbera, GlowaCerbera, GlowaCerbera];
  /** ogon: wychylenie (−1…1) i smagnięcie 0…1 */
  ogon: number; bicz: number;
  /** rany 0…1 (żarzące się pęknięcia), złote światło konania 0…1, szał 0…1 */
  rany: number; swiatlo: number; szal: number;
  /** oddech 0…1 */
  oddech: number;
  /** ogień ze środkowej paszczy 0…1 */
  ogien: number;
  /** krew na pyskach, piersi i przednich łapach 0…1 */
  krew?: number;
  czas: number;
}

export function glowaSpokoj(oczy = 1): GlowaCerbera { return { pochyl: 0, paszcza: 0.08, wysun: 0, oczy }; }

export function pozaCerbera(): PozaCerbera {
  return {
    kamien: 0, lezy: 0, faza: 0, krok: 0, deba: 0, przysiad: 0, odrzut: 0,
    glowy: [glowaSpokoj(), glowaSpokoj(), glowaSpokoj()],
    ogon: 0, bicz: 0, rany: 0, swiatlo: 0, szal: 0, oddech: 0.5, ogien: 0, krew: 0.6, czas: 0,
  };
}

type P = [number, number];
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const TUSZ = 'rgba(8,5,4,0.97)';
const los = (n: number): number => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

// ---------------------------------------------------------------- paleta (żywy / kamień)

interface Paleta { siersc: [number, number, number]; jasna: [number, number, number]; ciemna: [number, number, number]; skora: [number, number, number]; dziasla: string; kamien: number }
function paleta(p: PozaCerbera, dalszy: boolean): Paleta {
  const k = p.kamien, d = dalszy ? 0.7 : 1;
  const m3 = (a: number[], b: number[]): [number, number, number] => [mix(a[0], b[0], k) * d, mix(a[1], b[1], k) * d, mix(a[2], b[2], k) * d];
  return {
    siersc: m3([34, 26, 22], [96, 92, 84]),
    jasna: m3([82, 66, 54], [150, 144, 132]),
    ciemna: m3([12, 9, 8], [56, 54, 50]),
    skora: m3([88, 60, 56], [110, 106, 98]),
    dziasla: k > 0.5 ? 'rgb(90,86,80)' : 'rgb(120,40,46)',
    kamien: k,
  };
}
const rgb = (c: [number, number, number], a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// ---------------------------------------------------------------- faktura sierści (wypiekana raz)

let wzorSiersci: CanvasPattern | null = null;
function siersc(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (wzorSiersci || typeof document === 'undefined') return wzorSiersci;
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d')!;
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const x = los(i * 3) * 96, y = los(i * 7 + 1) * 96, dl = 3 + los(i * 11) * 7;
    const a = 2.3 + (los(i * 13) - 0.5) * 0.7;   // włos w dół i do tyłu
    const jas = los(i * 17);
    g.strokeStyle = jas < 0.55 ? `rgba(0,0,0,${0.35 + jas * 0.4})` : `rgba(160,130,100,${0.1 + (jas - 0.55) * 0.35})`;
    g.lineWidth = 0.6 + los(i * 19) * 1.0;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * dl * 0.5 + 1, y + Math.sin(a) * dl * 0.5, x + Math.cos(a) * dl, y + Math.sin(a) * dl); g.stroke();
  }
  wzorSiersci = ctx.createPattern(c, 'repeat');
  return wzorSiersci;
}

// ---------------------------------------------------------------- geometria

/** Kapsuła zwężająca się od a (promień ra) do b (rb) — jako ścieżka. */
function kapsula(ctx: CanvasRenderingContext2D, a: P, b: P, ra: number, rb: number): void {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
  const kat = Math.atan2(dy, dx);
  const s = Math.asin(Math.max(-1, Math.min(1, (ra - rb) / d)));
  ctx.beginPath();
  ctx.arc(a[0], a[1], ra, kat + Math.PI / 2 + s, kat - Math.PI / 2 - s + Math.PI * 2, false);
  ctx.arc(b[0], b[1], rb, kat - Math.PI / 2 - s, kat + Math.PI / 2 + s, false);
  ctx.closePath();
}

/** Staw pośredni dwóch kości (IK): od a do c, długości l1, l2, zgięcie +1/−1. */
function staw(a: P, c: P, l1: number, l2: number, zg: number): P {
  const dx = c[0] - a[0], dy = c[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), (l1 + l2) * 0.999) || 0.001;
  const ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const k = Math.atan2(dy, dx) + zg * Math.acos(Math.max(-1, Math.min(1, ca)));
  return [a[0] + Math.cos(k) * l1, a[1] + Math.sin(k) * l1];
}

/** Wypełnienie bryły sierścią: gradient (światło z góry), faktura, cień od dołu. Ścieżka musi być już ustawiona. */
function bryla(ctx: CanvasRenderingContext2D, pal: Paleta, y0: number, y1: number, lw: number): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgb(pal.jasna)); g.addColorStop(0.35, rgb(pal.siersc)); g.addColorStop(1, rgb(pal.ciemna));
  ctx.fillStyle = g; ctx.fill();
  if (pal.kamien < 0.5) {
    const w = siersc(ctx);
    if (w) { ctx.save(); ctx.clip(); ctx.globalAlpha = 0.85; ctx.fillStyle = w; ctx.fillRect(-4000, -4000, 8000, 8000); ctx.restore(); }
  }
  ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
}

/** Grzywka sierści wzdłuż krawędzi (lista punktów), włosy w kierunku `kat` (+ rozrzut). */
function fredzle(ctx: CanvasRenderingContext2D, pkt: P[], dl: number, kat: number, kol: string, gr: number, ziarno: number, czas: number): void {
  ctx.save();
  ctx.strokeStyle = kol; ctx.lineWidth = gr; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < pkt.length; i++) {
    const [x, y] = pkt[i];
    const r = los(ziarno + i * 7);
    const a = kat + (r - 0.5) * 0.9 + Math.sin(czas / 900 + i) * 0.05;
    const l = dl * (0.5 + r * 0.8);
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a - 0.3) * l * 0.6, y + Math.sin(a - 0.3) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  ctx.stroke();
  ctx.restore();
}

/** Punkty wzdłuż krzywej Béziera trzeciego stopnia. */
function bez(a: P, b: P, c: P, d: P, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
  }
  return out;
}

// ---------------------------------------------------------------- łapy

function lapaPrzednia(ctx: CanvasRenderingContext2D, h: number, bark: P, stopa: P, pal: Paleta, lw: number, krew: number): void {
  const l1 = h * 0.22, l2 = h * 0.24;
  const nadg: P = [stopa[0] - h * 0.035, stopa[1] - h * 0.085];
  const lokiec = staw(bark, nadg, l1, l2, 1);
  // ramię (gruba bryła mięśnia), przedramię, śródręcze
  kapsula(ctx, bark, lokiec, h * 0.1, h * 0.068); bryla(ctx, pal, bark[1] - h * 0.08, lokiec[1] + h * 0.05, lw);
  kapsula(ctx, lokiec, nadg, h * 0.062, h * 0.042); bryla(ctx, pal, lokiec[1], nadg[1], lw);
  kapsula(ctx, nadg, [stopa[0], stopa[1] - h * 0.03], h * 0.042, h * 0.04); bryla(ctx, pal, nadg[1], stopa[1], lw);
  // pazury i palce
  stopaLapy(ctx, h, stopa, pal, lw, krew);
  // łokieć — wystający, łysy
  ctx.fillStyle = rgb(pal.skora, 0.7); ctx.beginPath(); ctx.ellipse(lokiec[0] - h * 0.02, lokiec[1], h * 0.022, h * 0.016, 0, 0, Math.PI * 2); ctx.fill();
  if (krew > 0) {
    ctx.fillStyle = `rgba(110,8,6,${0.8 * krew})`;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(nadg[0] + (los(i) - 0.5) * h * 0.04, mix(lokiec[1], stopa[1], 0.3 + i * 0.18), h * 0.016, h * 0.03, 0.2, 0, Math.PI * 2); ctx.fill(); }
  }
}

function lapaTylna(ctx: CanvasRenderingContext2D, h: number, biodro: P, stopa: P, pal: Paleta, lw: number): void {
  const piet: P = [stopa[0] - h * 0.08, stopa[1] - h * 0.18];   // staw skokowy
  const kolano = staw(biodro, piet, h * 0.26, h * 0.24, -1);
  // udo: wielka bryła mięśnia od biodra do kolana
  ctx.beginPath();
  const u0: P = [biodro[0] - h * 0.15, biodro[1] - h * 0.05], u1: P = [biodro[0] + h * 0.12, biodro[1] + h * 0.0];
  ctx.moveTo(...u0);
  ctx.bezierCurveTo(biodro[0] - h * 0.22, biodro[1] + h * 0.16, kolano[0] - h * 0.08, kolano[1] + h * 0.04, kolano[0], kolano[1] + h * 0.06);
  ctx.bezierCurveTo(kolano[0] + h * 0.1, kolano[1] + h * 0.01, u1[0] + h * 0.05, u1[1] + h * 0.12, u1[0], u1[1]);
  ctx.closePath();
  bryla(ctx, pal, biodro[1] - h * 0.05, kolano[1] + h * 0.05, lw);
  // podudzie (golenie) do stawu skokowego, śródstopie do łapy
  kapsula(ctx, kolano, piet, h * 0.075, h * 0.04); bryla(ctx, pal, kolano[1], piet[1], lw);
  kapsula(ctx, piet, [stopa[0], stopa[1] - h * 0.03], h * 0.04, h * 0.038); bryla(ctx, pal, piet[1], stopa[1], lw);
  // pięta — sterczy
  ctx.fillStyle = rgb(pal.skora, 0.6); ctx.beginPath(); ctx.ellipse(piet[0] - h * 0.022, piet[1], h * 0.016, h * 0.012, 0, 0, Math.PI * 2); ctx.fill();
  // mięśnie uda — kreska
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = lw * 0.8;
  ctx.beginPath(); ctx.moveTo(biodro[0] - h * 0.02, biodro[1] + h * 0.03); ctx.quadraticCurveTo(kolano[0] - h * 0.04, mix(biodro[1], kolano[1], 0.6), kolano[0] + h * 0.01, kolano[1] - h * 0.01); ctx.stroke();
  stopaLapy(ctx, h, stopa, pal, lw, 0);
}

function stopaLapy(ctx: CanvasRenderingContext2D, h: number, s: P, pal: Paleta, lw: number, krew: number): void {
  const [x, y] = s;
  for (let i = 0; i < 4; i++) {
    const px = x - h * 0.025 + i * h * 0.026;
    ctx.beginPath(); ctx.ellipse(px, y - h * 0.02, h * 0.021, h * 0.024, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgb(i % 2 ? pal.siersc : pal.ciemna); ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = lw * 0.8; ctx.stroke();
    // pazur — zakrzywiony, rogowy
    ctx.fillStyle = 'rgb(48,40,34)';
    ctx.beginPath(); ctx.moveTo(px + h * 0.01, y - h * 0.016); ctx.quadraticCurveTo(px + h * 0.04, y - h * 0.012, px + h * 0.042, y + h * 0.003); ctx.lineTo(px + h * 0.016, y); ctx.closePath(); ctx.fill();
  }
  if (krew > 0.3) { ctx.fillStyle = `rgba(110,8,6,${krew * 0.8})`; ctx.beginPath(); ctx.ellipse(x + h * 0.02, y - h * 0.01, h * 0.045, h * 0.012, 0, 0, Math.PI * 2); ctx.fill(); }
}

// ---------------------------------------------------------------- głowa

/**
 * Psia głowa w (0, 0) — potylica przy szyi; pysk w prawo. `L` — długość czaszki. Zwraca punkt paszczy (między
 * szczękami, w układzie wołającego).
 */
function glowa(ctx: CanvasRenderingContext2D, L: number, g: GlowaCerbera, pal: Paleta, p: PozaCerbera, lw: number, nr: number): P {
  ctx.save();
  ctx.rotate(g.pochyl);
  const otw = g.paszcza;
  const szczeka = otw * 0.72;
  const warczy = Math.min(1, otw * 1.6);
  const krew = p.krew ?? 0;
  const zawias: P = [L * 0.24, L * 0.12];
  // --- żuchwa (pod spodem)
  ctx.save();
  ctx.translate(...zawias); ctx.rotate(szczeka);
  ctx.beginPath();
  ctx.moveTo(-L * 0.12, -L * 0.04);
  ctx.quadraticCurveTo(L * 0.3, L * 0.16, L * 0.66, L * 0.1);
  ctx.quadraticCurveTo(L * 0.7, L * 0.05, L * 0.66, -L * 0.01);
  ctx.lineTo(L * 0.05, -L * 0.03);
  ctx.closePath();
  bryla(ctx, pal, -L * 0.05, L * 0.16, lw);
  // dolne dziąsło i zęby
  if (otw > 0.08) {
    ctx.fillStyle = pal.dziasla;
    ctx.beginPath(); ctx.moveTo(L * 0.08, -L * 0.025); ctx.lineTo(L * 0.66, -L * 0.012); ctx.lineTo(L * 0.64, L * 0.025); ctx.lineTo(L * 0.1, L * 0.012); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgb(228,214,184)'; ctx.strokeStyle = 'rgba(40,24,16,0.8)'; ctx.lineWidth = Math.max(0.5, lw * 0.5);
    for (let i = 0; i < 7; i++) {
      const x = L * (0.14 + i * 0.07), kiel = i === 5;
      const hz = L * (kiel ? 0.11 : 0.035 + (i % 2) * 0.012);
      ctx.beginPath(); ctx.moveTo(x - L * 0.018, -L * 0.012); ctx.quadraticCurveTo(x, -L * 0.012 - hz * 1.1, x + L * 0.006, -L * 0.012 - hz); ctx.lineTo(x + L * 0.02, -L * 0.012); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // język
    ctx.fillStyle = p.kamien > 0.5 ? 'rgb(100,96,90)' : 'rgb(150,64,70)';
    ctx.beginPath(); ctx.ellipse(L * 0.34, -L * 0.035, L * 0.2, L * 0.035, -0.05, 0, Math.PI * 2); ctx.fill();
  }
  // krew na żuchwie
  if (krew > 0) { ctx.fillStyle = `rgba(120,6,4,${0.85 * krew})`; ctx.beginPath(); ctx.ellipse(L * 0.5, L * 0.07, L * 0.16, L * 0.05, 0.1, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  // --- wnętrze paszczy
  if (otw > 0.08) {
    ctx.fillStyle = p.kamien > 0.5 ? 'rgb(36,34,32)' : `rgb(${50 + 150 * p.ogien},${8 + 60 * p.ogien},${6})`;
    ctx.beginPath(); ctx.moveTo(zawias[0] - L * 0.04, zawias[1] - L * 0.02); ctx.lineTo(L * 0.86, L * 0.05);
    ctx.lineTo(zawias[0] + Math.cos(szczeka) * L * 0.62, zawias[1] + Math.sin(szczeka) * L * 0.62); ctx.closePath(); ctx.fill();
    // nitki śliny między szczękami
    if (p.kamien < 0.5) {
      ctx.strokeStyle = krew > 0.5 ? 'rgba(170,60,50,0.6)' : 'rgba(220,214,200,0.45)'; ctx.lineWidth = Math.max(0.6, L * 0.008);
      for (let i = 0; i < 3; i++) {
        const u = 0.45 + i * 0.13;
        const a: P = [L * (0.3 + u * 0.5), L * 0.06], b: P = [zawias[0] + Math.cos(szczeka) * L * u * 0.8, zawias[1] + Math.sin(szczeka) * L * u * 0.8];
        ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + L * 0.04, b[0], b[1]); ctx.stroke();
      }
    }
  }
  // --- czaszka z kufą (profil): masywna mózgoczaszka, wyraźny stop, szeroka, głęboka kufa, ciężkie fafle
  const fafle = mix(0.15, 0.05, warczy);
  ctx.beginPath();
  ctx.moveTo(-L * 0.04, L * 0.22);                                                       // gardło
  ctx.bezierCurveTo(-L * 0.2, L * 0.12, -L * 0.22, -L * 0.14, -L * 0.06, -L * 0.28);   // tył czaszki, potylica
  ctx.bezierCurveTo(L * 0.06, -L * 0.36, L * 0.26, -L * 0.36, L * 0.37, -L * 0.27);    // czoło, łuk brwiowy
  ctx.quadraticCurveTo(L * 0.42, -L * 0.2, L * 0.48, -L * 0.2);                         // stop
  ctx.bezierCurveTo(L * 0.66, -L * 0.2, L * 0.84, -L * 0.18, L * 0.93, -L * 0.15);     // grzbiet kufy
  ctx.quadraticCurveTo(L * 1.0, -L * 0.12, L * 0.99, -L * 0.04);                        // nos
  ctx.quadraticCurveTo(L * 0.99, L * 0.04, L * 0.93, L * 0.06);                         // przód górnej wargi
  ctx.bezierCurveTo(L * 0.86, L * (fafle + 0.04), L * 0.66, L * (fafle + 0.09), L * 0.46, L * (fafle + 0.07));   // obwisłe fafle
  ctx.quadraticCurveTo(L * 0.3, L * 0.16, L * 0.22, L * 0.2);                           // kącik paszczy, policzek
  ctx.quadraticCurveTo(L * 0.1, L * 0.26, -L * 0.04, L * 0.22);
  ctx.closePath();
  const gg = ctx.createLinearGradient(0, -L * 0.3, 0, L * 0.15);
  gg.addColorStop(0, rgb(pal.jasna)); gg.addColorStop(0.45, rgb(pal.siersc)); gg.addColorStop(1, rgb(pal.ciemna));
  ctx.fillStyle = gg; ctx.fill();
  if (pal.kamien < 0.5) { const w = siersc(ctx); if (w) { ctx.save(); ctx.clip(); ctx.globalAlpha = 0.6; ctx.fillStyle = w; ctx.fillRect(-L, -L, L * 3, L * 2); ctx.restore(); } }
  ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
  // górne dziąsło i zęby — odsłonięte przy warczeniu
  if (otw > 0.08) {
    ctx.fillStyle = pal.dziasla;
    ctx.beginPath(); ctx.moveTo(L * 0.3, L * (fafle + 0.035)); ctx.lineTo(L * 0.92, L * 0.045); ctx.lineTo(L * 0.9, L * 0.075); ctx.lineTo(L * 0.3, L * 0.07); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgb(232,218,188)'; ctx.strokeStyle = 'rgba(40,24,16,0.8)'; ctx.lineWidth = Math.max(0.5, lw * 0.5);
    for (let i = 0; i < 8; i++) {
      const x = L * (0.33 + i * 0.075), kiel = i === 6;
      const hz = L * (kiel ? 0.14 : 0.04 + (i % 2) * 0.015);
      const y0 = L * mix(0.07, 0.07, i / 8);
      ctx.beginPath(); ctx.moveTo(x - L * 0.02, y0); ctx.quadraticCurveTo(x + L * 0.002, y0 + hz * 1.05, x + L * 0.008, y0 + hz); ctx.lineTo(x + L * 0.022, y0); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // nos — wilgotny, z połyskiem
  ctx.fillStyle = 'rgb(18,12,12)';
  ctx.beginPath(); ctx.ellipse(L * 0.955, -L * 0.075, L * 0.05, L * 0.04, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(200,210,220,0.35)'; ctx.beginPath(); ctx.ellipse(L * 0.95, -L * 0.095, L * 0.02, L * 0.01, 0.3, 0, Math.PI * 2); ctx.fill();
  // zmarszczki na kufie (warczenie) i fałdy policzka
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = Math.max(0.7, lw * 0.7);
  for (let i = 0; i < 4; i++) {
    const x = L * (0.5 + i * 0.08), a = warczy * L * 0.035;
    ctx.beginPath(); ctx.moveTo(x, -L * (0.14 + 0.005 * i)); ctx.quadraticCurveTo(x + L * 0.02 + a, -L * 0.1, x + L * 0.005, -L * (0.05 - warczy * 0.02)); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(L * 0.3, L * 0.02); ctx.quadraticCurveTo(L * 0.4, L * 0.08, L * 0.36, L * 0.13); ctx.stroke();
  // ucho: krótkie, poszarpane, położone płasko do tyłu
  ctx.beginPath();
  ctx.moveTo(L * 0.02, -L * 0.3);
  ctx.bezierCurveTo(-L * 0.08, -L * 0.42 - warczy * L * 0.03, -L * 0.2, -L * 0.42, -L * 0.26, -L * 0.36);
  ctx.lineTo(-L * 0.2, -L * 0.33); ctx.lineTo(-L * 0.23, -L * 0.29);   // wyszarpnięty kawałek
  ctx.quadraticCurveTo(-L * 0.12, -L * 0.27, -L * 0.06, -L * 0.21);
  ctx.closePath();
  ctx.fillStyle = rgb(pal.ciemna); ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
  ctx.fillStyle = rgb(pal.skora, 0.45); ctx.beginPath(); ctx.ellipse(-L * 0.1, -L * 0.33, L * 0.06, L * 0.02, -0.5, 0, Math.PI * 2); ctx.fill();
  // oko: głęboko pod łukiem brwiowym, żarzy się
  const ox = L * 0.37, oy = -L * 0.19;
  ctx.fillStyle = 'rgb(6,2,2)'; ctx.beginPath(); ctx.ellipse(ox, oy, L * 0.055, L * 0.03, -0.25, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = Math.max(1, lw * 1.2);
  ctx.beginPath(); ctx.moveTo(ox - L * 0.07, oy - L * 0.045); ctx.quadraticCurveTo(ox, oy - L * 0.075, ox + L * 0.07, oy - L * 0.03); ctx.stroke();
  if (g.oczy > 0.02) {
    const zl = p.swiatlo > 0.3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const r = L * (0.16 + 0.1 * g.oczy);
    const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    og.addColorStop(0, zl ? `rgba(255,230,150,${0.8 * g.oczy})` : `rgba(255,60,20,${0.9 * g.oczy})`);
    og.addColorStop(0.35, zl ? `rgba(255,200,90,${0.3 * g.oczy})` : `rgba(200,20,8,${0.35 * g.oczy})`);
    og.addColorStop(1, 'rgba(120,0,0,0)');
    ctx.fillStyle = og; ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
    ctx.fillStyle = zl ? `rgba(255,246,210,${g.oczy})` : `rgba(255,170,90,${g.oczy})`;
    ctx.beginPath(); ctx.ellipse(ox + L * 0.01, oy, L * 0.026, L * 0.016, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // krew na pysku i kufie
  if (krew > 0 && p.kamien < 0.5) {
    ctx.fillStyle = `rgba(120,6,4,${0.85 * krew})`;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.ellipse(L * (0.6 + los(nr * 9 + i) * 0.35), L * (0.0 + los(nr * 5 + i) * 0.08), L * (0.03 + los(i) * 0.04), L * 0.02, 0.4, 0, Math.PI * 2); ctx.fill();
    }
    // strużki w dół z fafli
    ctx.strokeStyle = `rgba(110,4,2,${0.8 * krew})`; ctx.lineWidth = Math.max(1, L * 0.014); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const x = L * (0.45 + i * 0.15); ctx.beginPath(); ctx.moveTo(x, L * 0.08); ctx.lineTo(x + L * 0.005, L * (0.14 + los(nr + i) * 0.08)); ctx.stroke(); }
  }
  // mokry połysk deszczu na grzbiecie kufy
  if (p.kamien < 0.5) {
    ctx.strokeStyle = 'rgba(170,190,200,0.28)'; ctx.lineWidth = Math.max(1, L * 0.012);
    ctx.beginPath(); ctx.moveTo(L * 0.1, -L * 0.25); ctx.quadraticCurveTo(L * 0.3, -L * 0.28, L * 0.4, -L * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L * 0.5, -L * 0.155); ctx.lineTo(L * 0.85, -L * 0.115); ctx.stroke();
  }
  const pysk: P = [L * 0.75, L * 0.06 + otw * L * 0.22];
  const c = Math.cos(g.pochyl), s = Math.sin(g.pochyl);
  ctx.restore();
  return [pysk[0] * c - pysk[1] * s, pysk[0] * s + pysk[1] * c];
}

// ---------------------------------------------------------------- całość

export interface PunktyCerbera {
  /** obroża na karku (łańcuchy), paszcze trzech głów, środek brzucha */
  obroza: P; paszcze: [P, P, P]; brzuch: P;
}

export function rysujCerbera(ctx: CanvasRenderingContext2D, h: number, p: PozaCerbera): PunktyCerbera {
  // Cerber z obrazków wypieczonych z modelu 3D (render/cerber-sprite.ts); rysunek niżej — póki się nie wczytały
  const zWypieku = rysujCerberaZWypieku(ctx, h, p);
  if (zWypieku) return zWypieku;
  const lw = Math.max(1, h * 0.006);
  const t = p.czas / 1000;
  const palB = paleta(p, false), palD = paleta(p, true);
  const krew = p.kamien > 0.5 ? 0 : p.krew ?? 0;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // poświata szału
  if (p.szal > 0.01 && p.kamien < 0.5) {
    const R = h * 1.1;
    const g = ctx.createRadialGradient(0, -h * 0.5, h * 0.1, 0, -h * 0.5, R);
    g.addColorStop(0, `rgba(255,40,10,${0.18 * p.szal * (0.7 + 0.3 * Math.sin(t * 7))})`); g.addColorStop(1, 'rgba(150,10,5,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(-R, -h * 0.5 - R, R * 2, R * 2); ctx.restore();
  }
  // cień pod nim
  ctx.fillStyle = 'rgba(4,3,3,0.45)';
  ctx.beginPath(); ctx.ellipse(-h * 0.02, 0, h * 0.62, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();

  // poza tułowia: leżenie, przysiad, odrzut, stawanie dęba (obrót wokół bioder)
  const lez = p.lezy;
  const dy = h * (0.3 * lez + 0.1 * p.przysiad) - h * 0.012 * Math.sin(p.faza * 2) * p.krok + h * 0.006 * (p.oddech - 0.5);
  const dx = -h * 0.12 * p.odrzut;
  const biodroO: P = [-h * 0.3 + dx, -h * 0.52 + dy];
  const deba = p.deba * 0.45;
  const T = (x: number, y: number): P => {
    const q: P = [x * h + dx, y * h + dy];
    const ddx = q[0] - biodroO[0], ddy = q[1] - biodroO[1];
    const c = Math.cos(-deba), s = Math.sin(-deba);
    return [biodroO[0] + ddx * c - ddy * s, biodroO[1] + ddx * s + ddy * c];
  };
  // łapy: pozycje stóp (chód)
  const krok = h * 0.13 * p.krok, unies = h * 0.06 * p.krok;
  const stopa = (x0: number, faza: number, przednia: boolean): P => {
    if (lez > 0.5) return przednia ? [x0 * h + h * 0.22, 0] : [x0 * h + h * 0.24, 0];
    const s = Math.sin(p.faza + faza), c = Math.cos(p.faza + faza);
    let x = x0 * h + s * krok + dx * 0.5;
    let y = -Math.max(0, c) * unies;
    if (przednia && p.deba > 0) { const q = T(x0 + 0.08, -0.16); x = mix(x, q[0], p.deba); y = mix(y, Math.min(0, q[1]), p.deba); }
    return [x, y];
  };

  // ogon (za wszystkim) — gruby, kudłaty, posklejany błotem i krwią
  {
    const a = T(-0.44, -0.62);
    const sw = p.ogon * 0.5 + Math.sin(t * 1.4) * 0.12 * (1 - p.kamien), sm = p.bicz;
    const pkt: P[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const x = a[0] - h * (0.06 + 0.42 * u) * (1 - sm * 0.4) + sm * h * 1.0 * u * u;
      const y = a[1] - h * (0.1 * Math.sin(u * 2.2 + sw) - 0.12 * u) - sm * h * 0.35 * Math.sin(u * Math.PI);
      pkt.push([x, y + Math.sin(u * 5 + t * 2.5 * (1 - p.kamien)) * h * 0.012 * u]);
    }
    for (const [w, kol] of [[lw * 2.2, TUSZ], [0, rgb(palD.siersc)]] as const) {
      ctx.strokeStyle = kol;
      for (let i = 0; i < pkt.length - 1; i++) { ctx.lineWidth = h * 0.065 * (1 - (i / 12) * 0.55) + w; ctx.beginPath(); ctx.moveTo(...pkt[i]); ctx.lineTo(...pkt[i + 1]); ctx.stroke(); }
    }
    if (p.kamien < 0.5) {
      fredzle(ctx, pkt, h * 0.06, Math.PI * 0.62, rgb(palD.ciemna), Math.max(1.2, h * 0.005), 77, p.czas);
      fredzle(ctx, pkt.slice(3), h * 0.05, -Math.PI * 0.8, rgb(palD.ciemna), Math.max(1.2, h * 0.005), 79, p.czas);
      fredzle(ctx, pkt.slice(8), h * 0.07, Math.PI * 0.95, rgb(palD.ciemna), Math.max(1.2, h * 0.006), 81, p.czas);
    }
  }

  // dalsze łapy
  lapaTylna(ctx, h, T(-0.34, -0.55), stopa(-0.36, Math.PI, false), palD, lw);
  lapaPrzednia(ctx, h, T(0.18, -0.52), stopa(0.2, 0, true), palD, lw, krew * 0.6);

  // tułów: kłąb wysoko, grzbiet, zad, uda; głęboka pierś, obwisły brzuch żarłoka
  const W = T(0.14, -0.74), B = T(-0.08, -0.67), R = T(-0.33, -0.69), TB = T(-0.42, -0.65), Tz = T(-0.5, -0.5);
  const Lp = T(-0.28, -0.32), U = T(-0.02, -0.21 - 0.01 * Math.sin(t * 2.4)), K = T(0.22, -0.28), C = T(0.36, -0.46), N = T(0.33, -0.66);
  const korpus = (): void => {
    ctx.beginPath();
    ctx.moveTo(...N);
    ctx.bezierCurveTo(N[0] - h * 0.02, N[1] - h * 0.06, W[0] + h * 0.08, W[1] - h * 0.02, ...W);
    ctx.bezierCurveTo(W[0] - h * 0.1, W[1] + h * 0.01, B[0] + h * 0.1, B[1], ...B);
    ctx.bezierCurveTo(B[0] - h * 0.12, B[1], R[0] + h * 0.1, R[1] - h * 0.02, ...R);
    ctx.bezierCurveTo(R[0] - h * 0.06, R[1], TB[0] + h * 0.02, TB[1] - h * 0.02, ...TB);
    ctx.bezierCurveTo(TB[0] - h * 0.06, TB[1] + h * 0.04, Tz[0] - h * 0.02, Tz[1] - h * 0.06, ...Tz);
    ctx.bezierCurveTo(Tz[0] + h * 0.02, Tz[1] + h * 0.1, Lp[0] - h * 0.06, Lp[1] + h * 0.02, ...Lp);
    ctx.bezierCurveTo(Lp[0] + h * 0.1, Lp[1] + h * 0.02, U[0] - h * 0.16, U[1] + h * 0.02, ...U);
    ctx.bezierCurveTo(U[0] + h * 0.12, U[1] - h * 0.01, K[0] - h * 0.08, K[1] + h * 0.02, ...K);
    ctx.bezierCurveTo(K[0] + h * 0.1, K[1] - h * 0.02, C[0] + h * 0.03, C[1] + h * 0.08, ...C);
    ctx.bezierCurveTo(C[0] + h * 0.02, C[1] - h * 0.08, N[0] + h * 0.04, N[1] + h * 0.06, ...N);
    ctx.closePath();
  };
  korpus();
  bryla(ctx, palB, W[1] - h * 0.04, U[1] + h * 0.02, lw * 1.3);
  // cieniowanie bryły: cień pod brzuchem, światło na kłębie, mięśnie łopatki i żebra
  ctx.save();
  korpus(); ctx.clip();
  const cb = ctx.createRadialGradient(U[0], U[1] + h * 0.05, h * 0.02, U[0], U[1], h * 0.35);
  cb.addColorStop(0, 'rgba(0,0,0,0.55)'); cb.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cb; ctx.fillRect(U[0] - h * 0.5, U[1] - h * 0.4, h, h * 0.6);
  const sw = ctx.createRadialGradient(W[0], W[1] + h * 0.06, h * 0.01, W[0], W[1] + h * 0.06, h * 0.22);
  sw.addColorStop(0, `rgba(${palB.jasna[0] + 40},${palB.jasna[1] + 34},${palB.jasna[2] + 30},0.3)`); sw.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sw; ctx.fillRect(W[0] - h * 0.3, W[1] - h * 0.2, h * 0.6, h * 0.5);
  ctx.strokeStyle = 'rgba(0,0,0,0.42)'; ctx.lineWidth = lw;
  // łopatka
  const L0 = T(0.12, -0.66), L1 = T(0.3, -0.42);
  ctx.beginPath(); ctx.moveTo(...L0); ctx.quadraticCurveTo(L0[0] + h * 0.12, L0[1] + h * 0.04, ...L1); ctx.stroke();
  // żebra pod wyliniałą skórą
  for (let i = 0; i < 5; i++) {
    const a = T(-0.12 + i * 0.065, -0.58), b = T(-0.06 + i * 0.07, -0.33);
    ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(a[0] + h * 0.06, (a[1] + b[1]) / 2, ...b); ctx.stroke();
  }
  // fałdy obwisłego brzucha
  for (let i = 0; i < 3; i++) {
    const a = T(-0.28 + i * 0.04, -0.3 + i * 0.03), b = T(0.18, -0.26 + i * 0.025);
    ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo((a[0] + b[0]) / 2, b[1] + h * 0.06, ...b); ctx.stroke();
  }
  // łyse placki i blizny
  if (p.kamien < 0.5) {
    for (let i = 0; i < 4; i++) {
      const q = T(-0.4 + los(i * 7) * 0.7, -0.6 + los(i * 3) * 0.3);
      ctx.fillStyle = rgb(palB.skora, 0.55);
      ctx.beginPath(); ctx.ellipse(q[0], q[1], h * (0.025 + los(i) * 0.03), h * 0.018, los(i * 5) * 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(190,150,140,0.5)'; ctx.lineWidth = Math.max(0.8, lw * 0.8);
      ctx.beginPath(); ctx.moveTo(q[0] - h * 0.04, q[1] - h * 0.01); ctx.lineTo(q[0] + h * 0.04, q[1] + h * 0.015); ctx.stroke();
    }
    // krew na piersi
    if (krew > 0) {
      ctx.fillStyle = `rgba(110,6,4,${0.8 * krew})`;
      for (let i = 0; i < 6; i++) { const q = T(0.28 + los(i * 13) * 0.14, -0.5 + los(i * 7) * 0.22); ctx.beginPath(); ctx.ellipse(q[0], q[1], h * (0.015 + los(i) * 0.03), h * (0.025 + los(i * 3) * 0.04), 0.2, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
  // sierść na grzbiecie i pod brzuchem — strzępy
  if (p.kamien < 0.5) {
    fredzle(ctx, bez(N, [W[0] + h * 0.05, W[1] - h * 0.02], [B[0] + h * 0.1, B[1]], R, 22), h * 0.035, -Math.PI * 0.85, rgb(palB.ciemna), Math.max(1, h * 0.004), 11, p.czas);
    fredzle(ctx, bez(Lp, [Lp[0] + h * 0.1, Lp[1] + h * 0.02], [U[0] - h * 0.1, U[1] + h * 0.02], K, 18), h * 0.03, Math.PI * 0.55, rgb(palB.ciemna), Math.max(1, h * 0.004), 31, p.czas);
    // mokry połysk wzdłuż grzbietu
    ctx.strokeStyle = 'rgba(160,180,195,0.3)'; ctx.lineWidth = Math.max(1, h * 0.005);
    ctx.beginPath(); ctx.moveTo(W[0], W[1] + h * 0.015); ctx.bezierCurveTo(W[0] - h * 0.1, W[1] + h * 0.02, B[0] + h * 0.1, B[1] + h * 0.015, R[0] + h * 0.05, R[1] + h * 0.02); ctx.stroke();
  }
  // rany: żarzące się pęknięcia / złote światło konania
  if (p.rany > 0.02 || p.swiatlo > 0.02) {
    ctx.save(); korpus(); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const zl = p.swiatlo, n = Math.round(3 + 9 * Math.max(p.rany, zl));
    for (let i = 0; i < n; i++) {
      const s0 = T(-0.5 + los(i * 3 + 1) * 0.9, -0.66 + los(i * 3 + 2) * 0.4);
      ctx.strokeStyle = zl > 0.05 ? `rgba(255,${200 + 40 * zl},${120 + 80 * zl},${0.4 + 0.6 * zl})` : `rgba(255,${60 + 40 * Math.sin(t * 4 + i)},20,${0.3 + 0.45 * p.rany})`;
      ctx.lineWidth = Math.max(0.8, lw * (1 + zl));
      ctx.beginPath(); ctx.moveTo(...s0);
      let x = s0[0], y = s0[1];
      for (let j = 0; j < 4; j++) { x += (los(i * 17 + j) - 0.5) * h * 0.1; y += (los(i * 29 + j) - 0.3) * h * 0.06; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // bliższe łapy
  lapaTylna(ctx, h, T(-0.28, -0.55), stopa(-0.27, 0, false), palB, lw);
  lapaPrzednia(ctx, h, T(0.26, -0.5), stopa(0.28, Math.PI, true), palB, lw, krew);

  // szyje i głowy: dalsza (wysoko), środkowa, bliższa (nisko)
  const L = h * 0.4;
  const kotwice: P[] = [[0.3, -0.98], [0.5, -0.88], [0.6, -0.66]];
  const nasady: P[] = [T(0.18, -0.7), T(0.27, -0.64), T(0.32, -0.55)];
  const paszcze: P[] = [];
  for (let i = 0; i < 3; i++) {
    const g = p.glowy[i];
    const pal = i === 0 ? palD : palB;
    const [kx, ky] = kotwice[i];
    const cel = T(kx + 0.28 * g.wysun, ky + 0.1 * g.wysun + (lez > 0.5 ? 0.18 : 0));
    const baza = nasady[i];
    // szyja: gruba, umięśniona; grzywa na karku
    const sr1: P = [mix(baza[0], cel[0], 0.35) - h * 0.03, mix(baza[1], cel[1], 0.35) - h * 0.07];
    const sr2: P = [mix(baza[0], cel[0], 0.75) - h * 0.03, mix(baza[1], cel[1], 0.75) - h * 0.04];
    const os = bez(baza, sr1, sr2, cel, 10);
    ctx.beginPath();
    const R0 = h * 0.13, R1 = h * 0.095;
    const lewa: P[] = [], prawa: P[] = [];
    for (let j = 0; j < os.length; j++) {
      const a = os[Math.max(0, j - 1)], b = os[Math.min(os.length - 1, j + 1)];
      const kat = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      const r = mix(R0, R1, j / (os.length - 1));
      lewa.push([os[j][0] + Math.cos(kat) * r, os[j][1] + Math.sin(kat) * r]);
      prawa.push([os[j][0] - Math.cos(kat) * r, os[j][1] - Math.sin(kat) * r]);
    }
    ctx.moveTo(...lewa[0]); for (const q of lewa) ctx.lineTo(...q);
    for (let j = prawa.length - 1; j >= 0; j--) ctx.lineTo(...prawa[j]);
    ctx.closePath();
    bryla(ctx, pal, cel[1] - h * 0.08, baza[1] + h * 0.08, lw);
    // kryza sierści u nasady szyi — zakrywa styk z tułowiem
    if (p.kamien < 0.5) {
      const kryza: P[] = [];
      for (let j = 0; j < 14; j++) { const a = -Math.PI * 0.2 + (j / 13) * Math.PI * 1.3; kryza.push([baza[0] + Math.cos(a) * R0 * 1.1, baza[1] + Math.sin(a) * R0 * 1.1 - h * 0.02]); }
      fredzle(ctx, kryza, h * 0.09, Math.PI * 0.62, rgb(pal.ciemna), Math.max(1.4, h * 0.007), 400 + i * 30, p.czas);
    }
    // fałdy skóry na gardle
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = lw * 0.8;
    for (let j = 3; j < 9; j += 2) { ctx.beginPath(); ctx.moveTo(...lewa[j]); ctx.quadraticCurveTo(os[j][0] + h * 0.01, os[j][1] + h * 0.02, prawa[j][0], prawa[j][1]); ctx.stroke(); }
    // tłusta czarna broda-grzywa: strąki wzdłuż karku i pod gardłem
    if (p.kamien < 0.5) {
      fredzle(ctx, prawa, h * 0.06, -Math.PI * 0.75, rgb(pal.ciemna), Math.max(1.2, h * 0.006), 100 + i * 40, p.czas);
      fredzle(ctx, lewa.slice(2), h * 0.07, Math.PI * 0.5, rgb(pal.ciemna), Math.max(1.2, h * 0.007), 200 + i * 40, p.czas);
      // tłusty połysk na strąkach
      fredzle(ctx, prawa.filter((_, j) => j % 2 === 0), h * 0.04, -Math.PI * 0.75, 'rgba(150,140,130,0.25)', Math.max(0.8, h * 0.003), 300 + i, p.czas);
    }
    ctx.save();
    ctx.translate(...cel);
    ctx.rotate(deba * 0.3);
    const pk = glowa(ctx, L, { ...g, pochyl: g.pochyl - deba * 0.3 }, pal, p, lw, i);
    ctx.restore();
    paszcze[i] = [cel[0] + pk[0], cel[1] + pk[1]];
  }
  // ogień ze środkowej paszczy
  if (p.ogien > 0.02) {
    const [fx, fy] = paszcze[1];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const u = ((t * 2.2 + i / 16) % 1);
      const x = fx + u * h * 1.3, y = fy + u * h * 0.25 + Math.sin(i * 7 + t * 9) * u * h * 0.12;
      const r = h * (0.04 + u * 0.16) * p.ogien;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,${210 - u * 120},${90 - u * 80},${0.55 * (1 - u) * p.ogien})`); g.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  ctx.restore();
  return { obroza: T(0.32, -0.62), paszcze: paszcze as [P, P, P], brzuch: T(0, -0.3) };
}
