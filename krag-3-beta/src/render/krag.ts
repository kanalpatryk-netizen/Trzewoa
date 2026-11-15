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

const TUSZ = 'rgba(14,10,8,0.95)';
const los = (n: number): number => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Ulewa na ekranie: wygładzona (żeby deszcz nie skakał). */
let ulewaEkran = 0;
function mocUlewy(sim: Sim): number {
  const u = ulewa(sim);
  ulewaEkran += (u - ulewaEkran) * 0.05;
  return ulewaEkran;
}

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

/** Żarłocy leżący w błocie na powierzchni (przed mrokiem — w ciemności ledwo ich widać). */
export function rysujBlotoPowierzchni(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world, z = cam.zoom;
  const k = ukladKatedry(w);
  const x0 = Math.max(2, Math.floor(cam.toWorldX(0)) - 2), x1 = Math.min(w.w - 2, Math.ceil(cam.toWorldX(cam.vw)) + 2);
  if (cam.toScreenY(SURFACE_Y - 6) > cam.vh || cam.toScreenY(SURFACE_Y + 2) < 0) return;
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  ctx.save();
  for (let x = x0 - (x0 % 5); x <= x1; x += 5) {
    if (k && x > k.x0 - 3 && x < k.x1 + 2) continue;
    if (los(x * 31) < 0.35) continue;
    const gx = x + los(x) * 3, gy = SURFACE_Y - wysokoscGrzbietu(w, Math.floor(gx));
    const sx = cam.toScreenX(gx), sy = cam.toScreenY(gy) + z * 0.15;
    // kałuża błota
    ctx.fillStyle = 'rgba(38,40,30,0.9)';
    ctx.beginPath(); ctx.ellipse(sx, sy, z * 1.4, z * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,140,130,0.16)';
    ctx.beginPath(); ctx.ellipse(sx - z * 0.3, sy - z * 0.05, z * 0.8, z * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    // ciało zanurzone w błocie: grzbiet, głowa, ręka wyciągnięta
    const kier = los(x * 7) < 0.5 ? -1 : 1;
    const oddech = Math.sin(t * 0.8 + x) * z * 0.03;
    ctx.fillStyle = 'rgba(52,46,40,0.95)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.7, z * 0.05);
    ctx.beginPath(); ctx.ellipse(sx, sy - z * 0.12 - oddech, z * 0.75, z * 0.22, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx + kier * z * 0.85, sy - z * 0.15, z * 0.2, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (los(x * 13) < 0.5) {
      ctx.beginPath(); ctx.moveTo(sx + kier * z * 0.9, sy - z * 0.1);
      ctx.lineTo(sx + kier * z * 1.5, sy - z * (0.4 + 0.08 * Math.sin(t * 0.6 + x)));
      ctx.lineWidth = Math.max(0.8, z * 0.12); ctx.strokeStyle = 'rgba(52,46,40,0.95)'; ctx.stroke();
    }
  }
  ctx.restore();
}

/** Niebo nad kręgiem: chmury, deszcz (wieczny), w ulewie grad, brudny śnieg i błyskawice — nad mrokiem. */
export function rysujNieboKregu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const u = mocUlewy(sim);
  const ruch = wolnoRuszac();
  const t = ruch ? teraz / 1000 : 0;
  const yZiemi = cam.toScreenY(SURFACE_Y - 0.5);
  if (yZiemi <= 0) return;
  const W = cam.vw, H = Math.min(cam.vh, yZiemi);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  // ciężkie chmury u góry
  const chm = ctx.createLinearGradient(0, cam.toScreenY(0), 0, yZiemi);
  chm.addColorStop(0, `rgba(18,22,22,${0.4 + 0.25 * u})`); chm.addColorStop(0.6, `rgba(36,42,40,${0.12 + 0.15 * u})`); chm.addColorStop(1, 'rgba(36,42,40,0)');
  ctx.fillStyle = chm; ctx.fillRect(0, 0, W, H);
  // deszcz: smugi ukośne
  const n = Math.round(140 + 420 * u);
  const dl = 14 + 16 * u, kat = 0.18 + 0.15 * u;
  ctx.strokeStyle = `rgba(170,186,190,${0.18 + 0.2 * u})`; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const v = 0.9 + los(i * 3) * 0.6;
    const x = ((los(i) * W * 1.3 + t * 220 * kat * v) % (W * 1.3)) - W * 0.15;
    const y = (los(i * 7) * (H + 60) + t * 900 * v) % (H + 60) - 30;
    ctx.moveTo(x, y); ctx.lineTo(x - dl * kat * v, y - dl * v);
  }
  ctx.stroke();
  if (u > 0.05) {
    // grad: białe ziarna
    ctx.fillStyle = `rgba(226,232,232,${0.7 * u})`;
    for (let i = 0; i < 90 * u; i++) {
      const x = (los(i * 11 + 1) * W + t * 120) % W, y = (los(i * 13) * H + t * 1300 * (0.8 + los(i) * 0.4)) % H;
      ctx.fillRect(x, y, 2, 2);
    }
    // brudny śnieg: wolne, szare płatki
    ctx.fillStyle = `rgba(150,148,136,${0.5 * u})`;
    for (let i = 0; i < 60 * u; i++) {
      const x = (los(i * 17 + 5) * W + Math.sin(t * 1.3 + i) * 20 + t * 40) % W, y = (los(i * 19) * H + t * 120) % H;
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // błyskawica: raz na kilka sekund, krótki błysk nieba
    const sek = Math.floor(t * 1.4);
    if (ruch && los(sek * 977) < 0.18 * u) {
      const f = t * 1.4 - sek;
      if (f < 0.25) {
        const a = (1 - f / 0.25) * 0.35 * u;
        ctx.fillStyle = `rgba(210,226,240,${a})`; ctx.fillRect(0, 0, W, H);
        // zygzak
        ctx.strokeStyle = `rgba(240,248,255,${a * 2.4})`; ctx.lineWidth = 2;
        let bx = los(sek * 31) * W, by = 0;
        ctx.beginPath(); ctx.moveTo(bx, by);
        while (by < H * 0.85) { bx += (los(sek * 7 + by) - 0.5) * 60; by += 20 + los(sek + by) * 30; ctx.lineTo(bx, by); }
        ctx.stroke();
      }
    }
  }
  ctx.restore();
  // ulewa przygasza i oziębia cały świat
  if (u > 0.02) {
    ctx.save();
    ctx.fillStyle = `rgba(30,44,52,${0.16 * u})`;
    ctx.fillRect(0, 0, cam.vw, cam.vh);
    ctx.restore();
  }
}

/** Krople ze stropów wykutych korytarzy (przed mrokiem — widać je tylko w świetle). */
export function rysujKrople(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  if (!wolnoRuszac()) return;
  const w = sim.world, z = cam.zoom;
  const u = mocUlewy(sim);
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

/** Barwa kręgu: zgniła zieleń i sina szarość nałożone na rycinę świata (zamiast ciepłej sepii). */
export function barwaKregu(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgb(184,198,180)';
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(40,70,60,0.35)';
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
