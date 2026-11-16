/**
 * KRĄG TRZECI (beta) — rysunek kręgu żarłoków:
 *  - brzeg kręgu zamiast katedry: poszarpane skały z naturalnym łukiem nad szybem; w łuku szczelina w burzowych
 *    chmurach, przez którą pada jedyne światło łaski (promień na ołtarz — render/promien.ts, bez zmian);
 *  - na powierzchni leżą w błocie potępieni żarłocy, a z nieba wiecznie leje (ulewa — gęściej, z gradem,
 *    brudnym śniegiem i błyskawicami);
 *  - pod ziemią: krople z wykutych stropów, kałuże;
 *  - żarłocy: obżarty — zielonkawe smugi smrodu nad głową; przejedzony leży w kałuży błota z bąblami;
 *  - okup dla Cerbera: garść jedzenia leci łukiem do paszczy.
 * Mechanika: sim/krag.ts, nastawy/krag.ts.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { SURFACE_Y } from '../sim/world';
import { Race } from '../sim/races';
import { ulewa } from '../sim/krag';
import { ukladKatedry } from './katedra';
import { wysokoscGrzbietu } from './grzbiet';
import { wolnoRuszac } from './nastroj';
import { ustawienia } from '../core/settings-store';
import { wygladzUlewe, luna, blyskawica, pasMgly, szum1 } from './pieklo';
import { kaluzaKrwi } from './ludzik';
import { rysujOderwanaReke, rysujOderwanaGlowe, rysujTrzewia } from './zarlok-sprite';

const TUSZ = 'rgba(14,10,8,0.95)';
const los = (n: number): number => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Ulewa na ekranie: wygładzona w czasie (żeby deszcz nie skakał) — render/pieklo.ts. */
const mocUlewy = (sim: Sim, teraz: number): number => wygladzUlewe(ulewa(sim), teraz);

// ---------------------------------------------------------------- brzeg kręgu (zamiast katedry)

/** Skały brzegu kręgu nad szybem ze światłem — przed mrokiem. */
export function rysujBrzegKregu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const k = ukladKatedry(sim.world);
  if (!k) return;
  const z = cam.zoom;
  const X = (x: number): number => cam.toScreenX(x), Y = (y: number): number => cam.toScreenY(y);
  if (X(k.x1 + 4) < 0 || X(k.x0 - 4) > cam.vw || Y(k.szczyt - 3) > cam.vh || Y(k.g + 1) < 0) return;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const g = k.g, cx = k.cx, r = k.rozeta;
  const lw = Math.max(1.2, z * 0.09);
  // dwie turnie po bokach szybu i łuk nad nim
  const turnia = (xa: number, xb: number, wys: number, ziarno: number): [number, number][] => {
    // poszarpana turnia: zęby skały, występy, szczeliny
    const pts: [number, number][] = [[xa - 0.6, g + 0.3]];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = xa + (xb - xa) * u;
      const prof = Math.pow(Math.sin(u * Math.PI), 0.55);
      const zab = (i % 2 ? 1 : -1) * (0.6 + los(ziarno + i * 3) * 1.6) * prof;
      pts.push([x + (los(ziarno + i * 7) - 0.5) * 1.1, g - wys * prof * (0.82 + 0.25 * los(ziarno + i)) + zab]);
    }
    pts.push([xb + 0.6, g + 0.3]);
    return pts;
  };
  const wysL = (g - r.y) + r.r + 2.6, wysP = ((g - r.y) + r.r + 2.6) * 0.92;
  const lewa = turnia(cx - 9, cx - 1.2, wysL, 11);
  const prawa = turnia(cx + 1.2, cx + 7, wysP, 37);
  const luk: [number, number][] = [];
  {
    // łuk: od lewej turni ponad rozetą do prawej, gruby i poszarpany
    const ya = r.y - r.r - 1.6, n = 12;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = cx - r.r - 3.2 + (2 * r.r + 6.4) * u;
      luk.push([x, ya - Math.sin(u * Math.PI) * 1.4 + (los(70 + i) - 0.5) * 0.7]);
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n, x = cx - r.r - 2.4 + (2 * r.r + 4.8) * u;
      luk.push([x, r.y - r.r * 0.2 + Math.sin(u * Math.PI) * -r.r * 0.9 + (los(90 + i) - 0.5) * 0.5]);
    }
  }
  const kamien = (pts: [number, number][], jas: number): void => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.closePath();
    const gr = ctx.createLinearGradient(0, Y(k.szczyt), 0, Y(g));
    gr.addColorStop(0, `rgba(${78 * jas},${80 * jas},${72 * jas},1)`);
    gr.addColorStop(1, `rgba(${30 * jas},${31 * jas},${28 * jas},1)`);
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
    // spękania i warstwy — kreska tuszem
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(14,10,8,0.45)'; ctx.lineWidth = Math.max(0.7, lw * 0.5);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys);
    for (let i = 0; i < 18; i++) {
      const sx = x0 + los(i * 13 + x0 * 7) * (x1 - x0), sy = y0 + los(i * 17 + 3) * (g - y0);
      ctx.beginPath(); ctx.moveTo(X(sx), Y(sy));
      ctx.lineTo(X(sx + (los(i * 5) - 0.5) * 2.4), Y(sy + 0.6 + los(i * 3) * 1.4));
      ctx.lineTo(X(sx + (los(i * 9) - 0.5) * 3), Y(sy + 1.6 + los(i * 11) * 1.6));
      ctx.stroke();
    }
    // mokre lśnienie na krawędziach
    ctx.strokeStyle = 'rgba(170,190,180,0.22)'; ctx.lineWidth = Math.max(1, lw * 1.4);
    ctx.beginPath();
    pts.slice(1, -1).forEach(([x, y], i) => (i ? ctx.lineTo(X(x + 0.15), Y(y + 0.25)) : ctx.moveTo(X(x + 0.15), Y(y + 0.25))));
    ctx.stroke();
    ctx.restore();
  };
  kamien(lewa, 1);
  kamien(prawa, 0.9);
  kamien(luk, 1.05);
  // szczelina w łuku — ciemne niebo (świeci nad mrokiem: rysujBrzegKreguNad)
  ctx.fillStyle = 'rgba(10,12,14,1)';
  ctx.beginPath(); ctx.ellipse(X(r.x), Y(r.y), r.r * z * 0.95, r.r * z * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
  // martwe, poskręcane drzewo na lewej turni
  {
    const tx = cx - 7.5, ty = lewa[2][1] + 0.6;
    ctx.strokeStyle = 'rgba(20,16,12,0.95)';
    const galaz = (x: number, y: number, kat: number, dl: number, gr: number, n: number): void => {
      if (n <= 0 || dl < 0.25) return;
      const x2 = x + Math.cos(kat) * dl, y2 = y + Math.sin(kat) * dl;
      ctx.lineWidth = Math.max(0.8, gr * z);
      ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.quadraticCurveTo(X((x + x2) / 2 + 0.3), Y((y + y2) / 2), X(x2), Y(y2)); ctx.stroke();
      galaz(x2, y2, kat - 0.5 - los(n * 7 + dl * 10) * 0.3, dl * 0.68, gr * 0.62, n - 1);
      galaz(x2, y2, kat + 0.45 + los(n * 3 + dl * 10) * 0.3, dl * 0.6, gr * 0.6, n - 1);
    };
    galaz(tx, ty, -Math.PI / 2 - 0.25, 2.6, 0.32, 5);
  }
  ctx.restore();
}

/** Szczelina w chmurach w łuku brzegu — świeci przez mrok (zamiast rozety). */
export function rysujBrzegKreguNad(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const k = ukladKatedry(sim.world);
  if (!k) return;
  const z = cam.zoom, r = k.rozeta;
  const x = cam.toScreenX(r.x), y = cam.toScreenY(r.y);
  if (x < -r.r * z * 4 || x > cam.vw + r.r * z * 4 || y < -r.r * z * 4 || y > cam.vh + r.r * z * 4) return;
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, r.r * z * 0.95, r.r * z * 0.8, 0, 0, Math.PI * 2); ctx.clip();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r.r * z);
  g.addColorStop(0, 'rgba(255,244,200,0.95)'); g.addColorStop(0.45, 'rgba(232,206,140,0.75)'); g.addColorStop(1, 'rgba(90,96,100,0.5)');
  ctx.fillStyle = g; ctx.fillRect(x - r.r * z, y - r.r * z, r.r * z * 2, r.r * z * 2);
  // płynące chmury w szczelinie
  ctx.fillStyle = 'rgba(60,64,66,0.55)';
  for (let i = 0; i < 5; i++) {
    const cxp = x + (((t * 0.25 * (1 + i * 0.2) + los(i)) % 1) * 2 - 1) * r.r * z * 1.3;
    ctx.beginPath(); ctx.ellipse(cxp, y + (los(i * 3) - 0.5) * r.r * z * 1.2, r.r * z * 0.5, r.r * z * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // poświata
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const R = r.r * z * 3;
  const p = ctx.createRadialGradient(x, y, r.r * z * 0.5, x, y, R);
  p.addColorStop(0, 'rgba(255,230,170,0.22)'); p.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = p; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
}

// ---------------------------------------------------------------- niebo, deszcz, grad, błyskawice

/**
 * Niebo nad kręgiem (nad mrokiem): wieczny deszcz — dalsza warstwa gęsta i cienka, bliższa gruba; w dole kadru krople
 * łapią czerwoną łunę. Zawsze trochę gradu i brudnego śniegu (pieśń VI), w ulewie dużo więcej. Rozpryski na błocie,
 * przy ziemi mgła smrodu. Błyskawice — wspólny zegar (render/pieklo.ts): błysk na mgnienie wybiela cały krąg.
 */
export function rysujNieboKregu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const u = wygladzUlewe(ulewa(sim), teraz);
  const ruch = wolnoRuszac();
  const t = ruch ? teraz / 1000 : 0;
  const w = sim.world, z = cam.zoom;
  const W = cam.vw;
  const yNajnizej = cam.toScreenY(SURFACE_Y + 0.3);
  if (yNajnizej <= 0) return;
  const H = Math.min(cam.vh, yNajnizej);
  const L = luna(teraz);
  const b = blyskawica(teraz, u);
  // obszar nad gruntem (deszcz nie pada w skałę przekroju)
  const krok = Math.max(4, z * 0.5);
  const grunt = (sx: number): number => cam.toScreenY(SURFACE_Y - wysokoscGrzbietu(w, cam.toWorldX(sx)));
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(W + 10, -10);
  for (let x = W + krok; x >= -krok; x -= krok) ctx.lineTo(x, grunt(x) + z * 0.15);
  ctx.closePath(); ctx.clip();
  const wiatr = 0.2 + 0.2 * u + 0.07 * Math.sin(t * 0.37);
  const kolorDeszczu = (a: number): CanvasGradient => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(150,160,178,${a * 0.7})`);
    g.addColorStop(0.6, `rgba(170,160,168,${a})`);
    g.addColorStop(1, `rgba(${(210 * L) | 0},${(120 * L) | 0},${(100 * L) | 0},${a})`);
    return g;
  };
  // dalsza warstwa: gęsta, cienka, wolniejsza
  const n1 = Math.round((W / 1280) * (260 + 360 * u));
  ctx.strokeStyle = kolorDeszczu(0.16 + 0.14 * u + 0.3 * b.a); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < n1; i++) {
    const v = 0.8 + los(i * 3) * 0.4;
    const dl = (10 + 8 * u) * v;
    const x = ((los(i) * W * 1.3 + t * 700 * wiatr * v) % (W * 1.3)) - W * 0.15;
    const y = (los(i * 7) * (H + 60) + t * 700 * v) % (H + 60) - 30;
    ctx.moveTo(x, y); ctx.lineTo(x - dl * wiatr, y - dl);
  }
  ctx.stroke();
  // bliższa warstwa: grube, długie strugi
  const n2 = Math.round((W / 1280) * (90 + 170 * u));
  ctx.strokeStyle = kolorDeszczu(0.28 + 0.16 * u + 0.4 * b.a); ctx.lineWidth = Math.max(1.3, Math.min(2.4, z * 0.06));
  ctx.beginPath();
  for (let i = 0; i < n2; i++) {
    const v = 0.9 + los(i * 5 + 1) * 0.5;
    const dl = (22 + 22 * u) * v;
    const x = ((los(i * 11 + 3) * W * 1.3 + t * 1250 * wiatr * v) % (W * 1.3)) - W * 0.15;
    const y = (los(i * 13 + 5) * (H + 80) + t * 1250 * v) % (H + 80) - 40;
    ctx.moveTo(x, y); ctx.lineTo(x - dl * wiatr, y - dl);
  }
  ctx.stroke();
  // grad: białe ziarna, szybkie; brudny śnieg: wolne, szarobrunatne płatki
  ctx.fillStyle = `rgba(228,232,236,${0.55 + 0.3 * u})`;
  const nGrad = Math.round((W / 1280) * (24 + 110 * u));
  for (let i = 0; i < nGrad; i++) {
    const x = (los(i * 11 + 1) * W + t * 260 * wiatr) % W, y = (los(i * 13) * H + t * 1400 * (0.8 + los(i) * 0.4)) % H;
    const r = Math.max(1.5, z * (0.05 + 0.04 * los(i * 3)));
    ctx.fillRect(x, y, r, r * 1.3);
  }
  ctx.fillStyle = `rgba(150,140,124,${0.4 + 0.3 * u})`;
  const nSn = Math.round((W / 1280) * (30 + 70 * u));
  for (let i = 0; i < nSn; i++) {
    const x = (los(i * 17 + 5) * W + Math.sin(t * 1.3 + i) * 24 + t * 60 * wiatr) % W, y = (los(i * 19) * H + t * 110 * (0.8 + los(i * 7) * 0.5)) % H;
    ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, z * 0.06), 0, Math.PI * 2); ctx.fill();
  }
  // rozpryski na błocie: korona kropel tam, gdzie struga uderza w grunt
  if (z >= 6) {
    const xa = Math.floor(cam.toWorldX(0)), xb = Math.ceil(cam.toWorldX(W));
    ctx.strokeStyle = `rgba(180,150,146,${0.22 + 0.14 * u})`; ctx.lineWidth = 1;
    ctx.beginPath();
    const gestosc = 3 + Math.round(3 * u);
    for (let k = xa * gestosc; k <= xb * gestosc; k++) {
      const okres = 0.35 + los(k * 7) * 0.4;
      const f = ((t + los(k * 3) * okres) % okres) / okres;
      if (f > 0.4) continue;
      const cykl = Math.floor((t + los(k * 3) * okres) / okres);
      const wx = k / gestosc + los(k * 13 + cykl * 7) / gestosc;
      const sx = cam.toScreenX(wx), sy = cam.toScreenY(SURFACE_Y - wysokoscGrzbietu(w, wx));
      const rr = z * (0.05 + 0.13 * f / 0.4), wys = z * 0.13 * Math.sin((f / 0.4) * Math.PI);
      ctx.moveTo(sx - rr, sy); ctx.quadraticCurveTo(sx - rr * 0.8, sy - wys, sx - rr * 0.5, sy - wys * 0.6);
      ctx.moveTo(sx + rr, sy); ctx.quadraticCurveTo(sx + rr * 0.8, sy - wys, sx + rr * 0.5, sy - wys * 0.6);
    }
    ctx.stroke();
  }
  // mgła smrodu przy ziemi: zgniła, żółtozielona, płynie z wiatrem
  const yM = cam.toScreenY(SURFACE_Y - 0.6);
  pasMgly(ctx, W, yM - z * 1.6, yM + z * 0.9, t * 14 + cam.x * z, 'rgb(92,96,70)', 0.12 + 0.08 * u);
  pasMgly(ctx, W, yM - z * 0.9, yM + z * 0.7, t * 26 + cam.x * z + 400, 'rgb(70,60,48)', 0.18 + 0.08 * u);
  // błysk: wszystko nad ziemią sine i jasne na mgnienie
  if (b.a > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(96,106,136,${0.14 * b.a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // ulewa przygasza i oziębia cały świat
  if (u > 0.02) {
    ctx.save();
    ctx.fillStyle = `rgba(22,28,40,${0.14 * u})`;
    ctx.fillRect(0, 0, cam.vw, cam.vh);
    ctx.restore();
  }
}

/**
 * Grunt kręgu (po leju, przed tłumem): cuchnące błoto na całym tarasie — tłusty połysk z łuną, kałuże z kręgami
 * deszczu, grad leżący w błocie, a w nim kości, czaszki, żebra, gnijące resztki uczt (to krąg żarłoków) i szczątki
 * tych, których rozszarpał Cerber, w kałużach krwi.
 */
export function rysujGruntKregu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world, z = cam.zoom, W = cam.vw;
  if (cam.toScreenY(SURFACE_Y - 4) > cam.vh || cam.toScreenY(SURFACE_Y + 1) < 0) return;
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  const u = wygladzUlewe(ulewa(sim), teraz);
  const L = luna(teraz);
  const b = blyskawica(teraz, u);
  const k = ukladKatedry(w);
  const kraniec = w.w - 9;
  const gy = (wx: number): number => cam.toScreenY(SURFACE_Y - wysokoscGrzbietu(w, wx));
  const krok = Math.max(3, z * 0.4);
  const xMax = Math.min(W + krok, cam.toScreenX(kraniec + 0.5));
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // warstwa błota: gruba i tłusta u góry, w głąb przechodzi w ziemię
  for (const [od, dno, a] of [[-0.14, 0.32, 0.9], [0.32, 0.95, 0.42]] as [number, number, number][]) {
    ctx.beginPath();
    let pierwszy = true;
    for (let x = -krok; x <= xMax; x += krok) {
      const wx = cam.toWorldX(x);
      const fala = (szum1(wx * 2.3, 5) - 0.5) * 0.12;
      const y = gy(wx) + z * (od + fala);
      if (pierwszy) { ctx.moveTo(x, y); pierwszy = false; } else ctx.lineTo(x, y);
    }
    for (let x = xMax; x >= -krok; x -= krok) ctx.lineTo(x, gy(cam.toWorldX(x)) + z * dno);
    ctx.closePath();
    ctx.fillStyle = `rgba(34,27,20,${a})`; ctx.fill();
  }
  // tłusty połysk na wierzchu błota: łuna, a w błysku — sino
  ctx.strokeStyle = `rgba(${(170 * L + 160 * b.a) | 0},${(70 * L + 170 * b.a) | 0},${(44 + 200 * b.a) | 0},${0.32 + 0.4 * b.a})`;
  ctx.lineWidth = Math.max(1, z * 0.05);
  ctx.beginPath();
  for (let x = -krok; x <= xMax; x += krok) {
    const wx = cam.toWorldX(x);
    if (szum1(wx * 1.7, 9) < 0.45) { ctx.moveTo(x + krok, gy(wx + krok / z) - z * 0.08); continue; }
    ctx.lineTo(x, gy(wx) - z * 0.08 - (szum1(wx * 2.3, 5) - 0.5) * 0.12 * z);
  }
  ctx.stroke();
  const xa = Math.max(2, Math.floor(cam.toWorldX(0)) - 2), xb = Math.min(kraniec - 1, Math.ceil(cam.toWorldX(W)) + 2);
  const zajete = (x: number): boolean => !!k && x > k.x0 - 3 && x < k.x1 + 2;
  // kałuże: czarna, tłusta woda, w niej czerwone niebo; deszcz bije kręgi
  for (let kx = Math.floor(xa / 3); kx <= Math.ceil(xb / 3); kx++) {
    if (los(kx * 71) > 0.42) continue;
    const x = kx * 3 + los(kx) * 2;
    if (zajete(x)) continue;
    const sz = 0.7 + los(kx * 3) * 1.7;
    const sx = cam.toScreenX(x), sy = gy(x) + z * 0.06;
    const rx = sz * z, ry = Math.max(1.5, z * (0.12 + 0.05 * los(kx * 5)));
    const g = ctx.createLinearGradient(0, sy - ry, 0, sy + ry);
    g.addColorStop(0, `rgba(${(150 * L + 150 * b.a) | 0},${(48 * L + 160 * b.a) | 0},${(28 + 190 * b.a) | 0},0.85)`);
    g.addColorStop(0.5, 'rgba(26,12,10,0.95)');
    g.addColorStop(1, 'rgba(14,9,8,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(16,10,8,0.8)'; ctx.lineWidth = Math.max(1, z * 0.04); ctx.stroke();
    // kręgi od kropel
    if (z >= 8) {
      for (let r = 0; r < 4; r++) {
        const okr = 0.9 + los(kx * 7 + r) * 0.6;
        const f = ((t + los(kx * 11 + r * 3) * okr) % okr) / okr;
        const cykl = Math.floor((t + los(kx * 11 + r * 3) * okr) / okr);
        const px = sx + (los(kx * 13 + r * 5 + cykl) - 0.5) * rx * 1.4;
        ctx.strokeStyle = `rgba(210,170,160,${0.45 * (1 - f)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(px, sy, z * 0.05 + f * z * 0.35, (z * 0.05 + f * z * 0.35) * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
  // drobiazgi w błocie — dopiero z bliska (z daleka to i tak pył)
  if (z >= 10) {
    const h = Math.max(16, z * 1.9 * ustawienia.wielkoscSylwetek);
    for (let x = xa; x <= xb; x++) {
      if (zajete(x)) continue;
      const r = los(x * 911 + 7);
      const fx = x + 0.2 + los(x * 3) * 0.6;
      const sx = cam.toScreenX(fx), sy = gy(fx) + z * 0.04;
      ctx.save(); ctx.translate(sx, sy);
      if (r < 0.1) czaszka(ctx, h, los(x * 5));
      else if (r < 0.24) kosci(ctx, h, x);
      else if (r < 0.29) zebra(ctx, h, los(x * 7));
      else if (r < 0.35) zgnilizna(ctx, h, x, t);
      else if (r < 0.39) skorupy(ctx, h, x);
      else if (r < 0.42) czaszkaWieprza(ctx, h, los(x * 9));
      ctx.restore();
      // grad leży w błocie
      ctx.fillStyle = 'rgba(214,218,222,0.7)';
      for (let i = 0; i < 3 + Math.round(4 * u); i++) {
        const gx = cam.toScreenX(x + los(x * 17 + i)), gyy = gy(x + los(x * 17 + i)) + z * (0.02 + los(x * 19 + i) * 0.12);
        ctx.fillRect(gx, gyy, Math.max(1, z * 0.05), Math.max(1, z * 0.04));
      }
    }
    // szczątki rozszarpanych: ręka, głowa, trzewia — w kałużach krwi (Cerber żre tu od wieków)
    for (let kx = Math.floor(xa / 11); kx <= Math.ceil(xb / 11); kx++) {
      if (los(kx * 523) > 0.62) continue;
      const x = kx * 11 + 1 + los(kx * 5) * 8;
      if (zajete(x) || x > kraniec - 2) continue;
      const sx = cam.toScreenX(x), sy = gy(x) + z * 0.05;
      if (sx < -h * 2 || sx > W + h * 2) continue;
      ctx.save(); ctx.translate(sx, sy);
      if (los(kx * 3) < 0.5) ctx.scale(-1, 1);
      kaluzaKrwi(ctx, 0, h * 0.02, h * (0.55 + los(kx * 7) * 0.5), 1, kx);
      const rodzaj = Math.floor(los(kx * 17) * 4);
      if (rodzaj === 0) { ctx.translate(0, -h * 0.05); rysujOderwanaReke(ctx, h, -1.4 + los(kx) * 0.3, 0.4 + los(kx * 9) * 0.8); }
      else if (rodzaj === 1) { ctx.translate(0, -h * 0.06); rysujOderwanaGlowe(ctx, h, 1.5 + los(kx) * 0.8); }
      else if (rodzaj === 2) rysujTrzewia(ctx, h * 0.95, (los(kx) - 0.5) * 0.3);
      else { rysujTrzewia(ctx, h * 0.8, 0.1); ctx.translate(h * 0.45, -h * 0.05); rysujOderwanaReke(ctx, h, -1.5, 1.1); }
      ctx.restore();
    }
  }
  ctx.restore();
}

const KOSC = 'rgb(176,162,134)', KOSC_C = 'rgb(120,106,84)';
const BLOTO = 'rgba(34,27,20,0.92)';

function czaszka(ctx: CanvasRenderingContext2D, h: number, r: number): void {
  const s = h * 0.1;
  ctx.rotate((r - 0.5) * 0.8);
  ctx.fillStyle = KOSC; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.8, s * 0.12);
  ctx.beginPath(); ctx.ellipse(0, -s * 0.55, s, s * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.35, -s * 0.1); ctx.lineTo(s * 1.05, -s * 0.05); ctx.lineTo(s * 0.95, s * 0.3); ctx.lineTo(s * 0.3, s * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(14,8,6,0.95)';
  ctx.beginPath(); ctx.ellipse(s * 0.45, -s * 0.55, s * 0.24, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.85, -s * 0.28, s * 0.08, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(14,8,6,0.9)'; ctx.lineWidth = Math.max(0.6, s * 0.06);
  ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(s * (0.45 + i * 0.15), s * 0.05); ctx.lineTo(s * (0.45 + i * 0.15), s * 0.25); } ctx.stroke();
  ctx.fillStyle = BLOTO; ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 1.4, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
}

function kosci(ctx: CanvasRenderingContext2D, h: number, x: number): void {
  const n = 1 + Math.floor(los(x * 13) * 2);
  for (let i = 0; i < n; i++) {
    const dl = h * (0.22 + los(x * 3 + i) * 0.16), kat = (los(x * 7 + i) - 0.5) * 0.7, gr = h * 0.03;
    ctx.save(); ctx.translate((i - 0.5) * h * 0.08, -gr * 0.6); ctx.rotate(kat);
    ctx.strokeStyle = TUSZ; ctx.lineWidth = gr + Math.max(1.2, gr * 0.4);
    ctx.beginPath(); ctx.moveTo(-dl / 2, 0); ctx.lineTo(dl / 2, 0); ctx.stroke();
    ctx.strokeStyle = KOSC; ctx.lineWidth = gr;
    ctx.beginPath(); ctx.moveTo(-dl / 2, 0); ctx.lineTo(dl / 2, 0); ctx.stroke();
    ctx.fillStyle = KOSC;
    for (const e of [-1, 1]) {
      ctx.beginPath(); ctx.arc(e * dl / 2, -gr * 0.35, gr * 0.75, 0, Math.PI * 2); ctx.arc(e * dl / 2, gr * 0.35, gr * 0.75, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function zebra(ctx: CanvasRenderingContext2D, h: number, r: number): void {
  const s = h * 0.2;
  ctx.scale(r < 0.5 ? 1 : -1, 1);
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1.6, s * 0.11);
  ctx.beginPath(); ctx.moveTo(-s, -s * 0.15); ctx.lineTo(s, -s * 0.25); ctx.stroke();
  for (let i = 0; i < 6; i++) { const x = -s * 0.8 + i * s * 0.32; ctx.beginPath(); ctx.moveTo(x, -s * 0.18); ctx.quadraticCurveTo(x + s * 0.3, -s * 0.9, x + s * 0.1, -s * (0.05 + 0.1 * (i % 2))); ctx.stroke(); }
  ctx.strokeStyle = KOSC; ctx.lineWidth = Math.max(0.9, s * 0.06);
  ctx.beginPath(); ctx.moveTo(-s, -s * 0.15); ctx.lineTo(s, -s * 0.25); ctx.stroke();
  for (let i = 0; i < 6; i++) { const x = -s * 0.8 + i * s * 0.32; ctx.beginPath(); ctx.moveTo(x, -s * 0.18); ctx.quadraticCurveTo(x + s * 0.3, -s * 0.9, x + s * 0.1, -s * (0.05 + 0.1 * (i % 2))); ctx.stroke(); }
  ctx.fillStyle = BLOTO; ctx.beginPath(); ctx.ellipse(0, s * 0.02, s * 1.2, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
}

/** Gnijące resztki uczty: ochłap mięsa z robactwem, zielonkawy nalot. */
function zgnilizna(ctx: CanvasRenderingContext2D, h: number, x: number, t: number): void {
  const s = h * 0.13;
  ctx.fillStyle = 'rgb(86,36,26)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.8, s * 0.1);
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(-s * 0.9, -s * 0.8, 0, -s * 0.75); ctx.quadraticCurveTo(s * 1.1, -s * 0.9, s * 1.1, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(112,128,64,0.55)';
  ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.5, s * 0.35, s * 0.15, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgb(150,30,24)';
  ctx.beginPath(); ctx.ellipse(s * 0.45, -s * 0.45, s * 0.3, s * 0.18, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(232,226,200,0.9)';
  for (let i = 0; i < 7; i++) {
    const px = (los(x * 3 + i) - 0.5) * s * 1.6 + Math.sin(t * 2 + i) * s * 0.06, py = -s * (0.2 + los(x * 5 + i) * 0.5);
    ctx.fillRect(px, py, Math.max(1, s * 0.14), Math.max(1, s * 0.06));
  }
  ctx.fillStyle = BLOTO; ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 1.3, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
}

/** Skorupy dzbana po winie. */
function skorupy(ctx: CanvasRenderingContext2D, h: number, x: number): void {
  const s = h * 0.09;
  ctx.fillStyle = 'rgb(122,62,40)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.8, s * 0.1);
  for (let i = 0; i < 3; i++) {
    const px = (i - 1) * s * 1.1 + (los(x + i) - 0.5) * s * 0.4;
    ctx.save(); ctx.translate(px, -s * 0.15); ctx.rotate((los(x * 7 + i) - 0.5) * 1.2);
    ctx.beginPath(); ctx.moveTo(-s * 0.6, 0); ctx.quadraticCurveTo(0, -s * (0.7 + 0.4 * los(x * 3 + i)), s * 0.6, 0); ctx.lineTo(s * 0.3, s * 0.15); ctx.lineTo(-s * 0.4, s * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

/** Czaszka wieprza — Ciacco, „Wieprz”, żarłok z pieśni VI. */
function czaszkaWieprza(ctx: CanvasRenderingContext2D, h: number, r: number): void {
  const s = h * 0.11;
  ctx.scale(r < 0.5 ? 1 : -1, 1); ctx.rotate(-0.15);
  ctx.fillStyle = KOSC; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.8, s * 0.1);
  ctx.beginPath(); ctx.moveTo(-s, -s * 0.2); ctx.quadraticCurveTo(-s * 0.8, -s * 1.1, 0, -s * 0.9); ctx.lineTo(s * 1.6, -s * 0.35); ctx.lineTo(s * 1.65, s * 0.05); ctx.lineTo(-s * 0.7, s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(14,8,6,0.95)'; ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.5, s * 0.22, s * 0.17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = KOSC_C; ctx.lineWidth = Math.max(0.8, s * 0.12);
  ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.05); ctx.quadraticCurveTo(s * 1.2, -s * 0.6, s * 0.9, -s * 0.85); ctx.stroke();
  ctx.fillStyle = BLOTO; ctx.beginPath(); ctx.ellipse(0, s * 0.25, s * 1.8, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
}

/** Krople ze stropów wykutych korytarzy (przed mrokiem — widać je tylko w świetle). */
export function rysujKrople(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  if (!wolnoRuszac()) return;
  const w = sim.world, z = cam.zoom;
  const u = mocUlewy(sim, teraz);
  const okres = 1100;
  const n = Math.round(28 + 50 * u);
  const xa = Math.max(1, Math.floor(cam.toWorldX(0))), xb = Math.min(w.w - 2, Math.ceil(cam.toWorldX(cam.vw)));
  const ya = Math.max(SURFACE_Y + 1, Math.floor(cam.toWorldY(0))), yb = Math.min(w.h - 2, Math.ceil(cam.toWorldY(cam.vh)));
  if (xb <= xa || yb <= ya) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(170,196,200,0.55)'; ctx.lineWidth = Math.max(1, z * 0.06);
  for (let i = 0; i < n; i++) {
    const cykl = Math.floor((teraz + los(i * 5) * okres) / okres);
    const f = ((teraz + los(i * 5) * okres) % okres) / okres;
    const x = xa + Math.floor(los(i * 131 + cykl * 7) * (xb - xa));
    const y0 = ya + Math.floor(los(i * 71 + cykl * 13) * (yb - ya));
    // strop: pierwszy wolny kafel pod skałą, szukany w górę od y0
    let y = y0, sufit = -1;
    for (let k = 0; k < 24 && y > ya; k++, y--) {
      if (w.passable(x, y) && w.solid(x, y - 1)) { sufit = y; break; }
    }
    if (sufit < 0 || !w.ever[w.idx(x, sufit)]) continue;
    let dno = sufit;
    while (dno < w.h - 1 && w.passable(x, dno + 1) && dno - sufit < 30) dno++;
    const fx = x + 0.3 + los(i * 19 + cykl) * 0.4;
    const yy = sufit + (dno + 1 - sufit) * f * f;
    const sx = cam.toScreenX(fx), sy = cam.toScreenY(yy);
    if (f < 0.92) {
      ctx.beginPath(); ctx.moveTo(sx, sy - z * 0.25); ctx.lineTo(sx, sy); ctx.stroke();
    } else {
      // rozprysk
      const k2 = (f - 0.92) / 0.08, py = cam.toScreenY(dno + 1);
      ctx.beginPath(); ctx.ellipse(sx, py, z * 0.3 * k2, z * 0.06, 0, Math.PI, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- żarłocy i okup

/** Obżarci (smród nad głową), przejedzeni w błocie (kałuża, bąble), okup lecący do paszczy — po postaciach. */
export function rysujZarlokow(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const z = cam.zoom;
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  ctx.save();
  ctx.lineCap = 'round';
  for (const c of sim.creatures) {
    if (c.dead || c.race !== Race.GOBLIN) continue;
    const sx = cam.toScreenX(c.x), sy = cam.toScreenY(c.y + 1);
    if (sx < -40 || sx > cam.vw + 40 || sy < -40 || sy > cam.vh + 60) continue;
    const blot = (c.wBlocieDo ?? 0) > sim.tick;
    if (blot) {
      ctx.fillStyle = 'rgba(78,70,38,0.9)';
      ctx.beginPath(); ctx.ellipse(sx - z * 0.4, sy, z * 1.5, z * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,16,10,0.8)'; ctx.lineWidth = Math.max(1, z * 0.05); ctx.stroke();
      ctx.fillStyle = 'rgba(150,170,120,0.35)';
      ctx.beginPath(); ctx.ellipse(sx - z * 0.7, sy - z * 0.08, z * 0.7, z * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(140,150,110,0.6)'; ctx.lineWidth = Math.max(0.6, z * 0.04);
      for (let b = 0; b < 3; b++) {
        const f = (t * 0.7 + b / 3) % 1;
        ctx.beginPath(); ctx.arc(sx - z * 0.9 + b * z * 0.5, sy - z * 0.1 - f * z * 0.25, z * 0.06 * (1 + f), 0, Math.PI * 2); ctx.stroke();
      }
    }
    const o = Math.min(1, c.obzarstwo ?? 0);
    if (o > 0.25 && !blot) {
      // smród przejedzenia: zielonkawe falki nad głową
      ctx.strokeStyle = `rgba(150,206,70,${0.45 + 0.55 * o})`; ctx.lineWidth = Math.max(2, z * 0.14);
      for (let s = 0; s < 1 + Math.round(o * 2); s++) {
        const f = (t * 0.6 + s * 0.37) % 1;
        const bx = sx + (s - 1) * z * 0.35, by = sy - z * (2.5 + f * 1.6);
        ctx.globalAlpha = 1 - f;
        ctx.beginPath();
        ctx.moveTo(bx, by + z * 0.8);
        ctx.bezierCurveTo(bx + z * 0.3, by + z * 0.55, bx - z * 0.3, by + z * 0.25, bx, by);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  // okup: garść jedzenia łukiem do paszczy Cerbera
  const k = sim.lud.krag;
  const boss = sim.creatures.find((c) => !c.dead && c.boss);
  if (k && boss) {
    const dt = sim.tick - k.okupT;
    if (dt >= 0 && dt < 80) {
      const f = dt / 80;
      const tx = boss.x + (boss.face >= 0 ? 2.2 : -2.2), ty = boss.y - 2.2;
      for (let i = 0; i < 5; i++) {
        const ff = Math.max(0, Math.min(1, f * 1.2 - i * 0.04));
        const x = k.okupX + (tx - k.okupX) * ff + (los(i) - 0.5) * 0.4;
        const y = k.okupY + (ty - k.okupY) * ff - Math.sin(ff * Math.PI) * Math.max(3, Math.abs(tx - k.okupX) * 0.35) + (los(i * 3) - 0.5) * 0.4;
        const px = cam.toScreenX(x), py = cam.toScreenY(y);
        ctx.fillStyle = i % 2 ? 'rgba(170,120,70,0.95)' : 'rgba(120,80,48,0.95)';
        ctx.strokeStyle = TUSZ; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py, Math.max(2, z * 0.18), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/**
 * Barwa kręgu (piekło Dantego, 16.11): rycina świata przygaszona i podgrzana — cienie w brunatnej czerwieni
 * zakrzepłej krwi, światła w zgniłej żółci; od dołu kadru grzeje łuna niższych kręgów.
 */
export function barwaKregu(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgb(198,178,166)';
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(70,20,18,0.3)');
  g.addColorStop(1, 'rgba(140,34,14,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------- prolog

const PROLOG = [
  'Krąg trzeci. Pieśń szósta.',
  'Wieczny deszcz, zimny i ciężki, bije w cuchnącą ziemię. Grad, brudny śnieg i woda.',
  'Tu leżą żarłocy. Za życia służyli brzuchowi — teraz brzuch służy błotu.',
  'Nad nimi, w lochu, śpi zakuty w kamień Cerber: trzy gardła, czerwone oczy, brzuch szeroki.',
  'Jesteś ziemią tego kręgu. Garstka potępionych chce zejść niżej — jedyna droga z piekła wiedzie przez jego dno.',
  'Karm ich, ale nie przekarmiaj. Kto się obżera, pada w błoto.',
];
const prologOd = new WeakMap<Sim, number>();
const PROLOG_MS = 11000;

/** Plansza prologu na początku partii (11 s, potem znika) — nad wszystkim. */
export function rysujProlog(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, teraz: number): void {
  let od = prologOd.get(sim);
  if (od === undefined) { if (sim.tick > 600) return; od = teraz; prologOd.set(sim, od); }
  const t = teraz - od;
  if (t > PROLOG_MS) return;
  const a = Math.min(1, t / 600) * (1 - Math.max(0, (t - (PROLOG_MS - 1500)) / 1500));
  ctx.save();
  ctx.fillStyle = `rgba(6,8,8,${0.72 * a})`;
  ctx.fillRect(0, 0, w, h);
  const r = Math.max(16, Math.min(28, w / 60));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y0 = h * 0.3;
  PROLOG.forEach((linia, i) => {
    const wej = Math.max(0, Math.min(1, (t - 500 - i * 900) / 900));
    ctx.globalAlpha = a * wej;
    ctx.font = i === 0 ? `italic ${r * 1.6}px "Trzewia Tekst", Georgia, serif` : `${r}px "Trzewia Tekst", Georgia, serif`;
    ctx.fillStyle = i === 0 ? 'rgba(214,226,206,1)' : 'rgba(206,204,186,1)';
    ctx.fillText(linia, w / 2, y0 + (i === 0 ? 0 : r * 1.4 + i * r * 1.7));
  });
  ctx.restore();
}
