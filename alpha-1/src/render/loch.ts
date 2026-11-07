import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Prost } from '../sim/world';
import { BRAMA, LOCH, BLOGOSLAWIENSTWO } from '../nastawy/loch';
import { stanBramy, zaklinajacy, przyKotle } from '../sim/brama';
import { modliSieZaInnych } from '../sim/blogoslawienstwo';
import { rolaPostaci, maxHp } from '../sim/lud';
import { wolnoRuszac } from './nastroj';
import { migotLampy } from './fresk';
import { T } from '../sim/tiles';

/**
 * LOCH, STARA KOMNATA Z KOTŁEM I STALOWA BRAMA (6.11) — rysunek miejsc z sim/world.ts (ukladDrogi, wykujLoch,
 * wykujDroge) i bramy z sim/brama.ts. Styl (decyzja użytkownika): skrajnie mroczny, ale przyjazny dla oka — głęboki
 * grafit z nutą brązu zamiast czystej czerni, mała różnica jasności w murze (bez migotania kreską), światło tylko
 * z kilku ciepłych źródeł (kocioł, pochodnie, kosze ognia) o miękkich krawędziach, wolne i łagodne ruchy.
 *  - przed mrokiem (rysujLoch): mury z ciosów, tylne ściany, filary i łuki sklepienia, posadzka, pajęczyny, półki,
 *    łańcuchy, chorągwie, kocioł na trójnogu, kosze ognia, pochodnie, krata bramy podniesiona o tyle, ile otwarta;
 *  - nad mrokiem (rysujLochNad): wywar w kotle i para, płomienie, runy na nadprożu bramy (ile otwarta), nici zaklęcia
 *    od rąk rzucających do kotła, krąg modlitwy za innych i nici błogosławieństwa.
 * Rysunek pokazuje tylko to, co lud już widział (world.ever). Placeholder do podmiany na grafikę.
 */

/** Tani skrót liczby — stałe kształty (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Widoczne kafle prostokąta (z zapasem) albo null. */
function wKadrze(cam: Camera, r: Prost, zapas = 0): Prost | null {
  const x0 = Math.max(r.x0 - zapas, Math.floor(cam.toWorldX(0)) - 1), x1 = Math.min(r.x1 + zapas, Math.ceil(cam.toWorldX(cam.vw)) + 1);
  const y0 = Math.max(r.y0 - zapas, Math.floor(cam.toWorldY(0)) - 1), y1 = Math.min(r.y1 + zapas, Math.ceil(cam.toWorldY(cam.vh)) + 1);
  return x0 > x1 || y0 > y1 ? null : { x0, x1, y0, y1 };
}

const STAL = 'rgba(70,78,88,1)', STAL_JASNA = 'rgba(190,204,218,0.4)', RDZA = 'rgba(122,64,34,0.4)';
const TUSZ = 'rgba(6,5,8,0.9)';

/** Ciosy muru na litym kaflu (wiązanie: dwa bloki na kafel, co drugi rząd przesunięty) — nisko kontrastowe. */
function cios(ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, z: number, jas: number): void {
  const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
  const r = los(x * 7919 + y * 104729);
  const v = Math.round((84 + r * 16) * jas), g = Math.round((74 + r * 14) * jas), b = Math.round((64 + r * 12) * jas);
  ctx.fillStyle = `rgb(${v},${g},${b})`;
  ctx.fillRect(sx, sy, z + 0.6, z + 0.6);
  if (z < 5) return;
  const sp = Math.max(1, z * 0.07);
  ctx.fillStyle = 'rgba(14,10,8,0.6)';
  ctx.fillRect(sx, sy, z + 0.6, sp);
  const off = (y & 1) ? 0.25 : 0.75;
  ctx.fillRect(sx + z * off - sp / 2, sy, sp, z);
  if (off === 0.75) ctx.fillRect(sx + z * 0.25 - sp / 2, sy, sp, z); else ctx.fillRect(sx + z * 0.75 - sp / 2, sy, sp, z);
  // fazowanie: delikatnie jaśniejsza górna krawędź bloku, ciemniejsza dolna
  ctx.fillStyle = 'rgba(210,190,160,0.12)'; ctx.fillRect(sx, sy + sp, z, Math.max(1, z * 0.06));
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(sx, sy + z * 0.86, z, z * 0.14);
  // rysa albo plama mchu — rzadko
  if (r > 0.86) { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(0.8, z * 0.04); ctx.beginPath(); ctx.moveTo(sx + z * 0.3, sy + z * 0.2); ctx.lineTo(sx + z * 0.45, sy + z * 0.55); ctx.lineTo(sx + z * 0.38, sy + z * 0.85); ctx.stroke(); }
  else if (r < 0.06) { ctx.fillStyle = 'rgba(52,70,46,0.22)'; ctx.beginPath(); ctx.ellipse(sx + z * 0.5, sy + z * 0.9, z * 0.4, z * 0.12, 0, 0, Math.PI * 2); ctx.fill(); }
}

/** Tylna ściana wnętrza (pusty kafel): duże, ciemne ciosy, ledwie widoczne spoiny. */
function tlo(ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, z: number, jas: number, stare: boolean): void {
  const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
  const r = los(x * 15485863 + y * 32452843);
  const v = Math.round((52 + r * 9) * jas), g = Math.round((45 + r * 8) * jas), b = Math.round((40 + r * 7) * jas);
  ctx.fillStyle = `rgb(${v},${g},${b})`;
  ctx.fillRect(sx, sy, z + 0.6, z + 0.6);
  if (z < 6) return;
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  const sp = Math.max(1, z * 0.05);
  if ((y & 1) === 0) ctx.fillRect(sx, sy, z + 0.6, sp);
  if (((x + (y >> 1)) % 2) === 0) ctx.fillRect(sx, sy, sp, z);
  if (stare && r > 0.9) { ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = Math.max(0.8, z * 0.035); ctx.beginPath(); ctx.moveTo(sx + z * 0.1, sy + z * 0.4); ctx.lineTo(sx + z * 0.5, sy + z * 0.5); ctx.lineTo(sx + z * 0.9, sy + z * 0.35); ctx.stroke(); }
}

/** Pajęczyna w rogu: promienie i łuki — cienka, jasnoszara, półprzezroczysta (w świetle srebrzy się). */
function pajeczyna(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, a0: number, a1: number, n: number, czas: number): void {
  const fal = wolnoRuszac() ? Math.sin(czas * 0.0009 + cx * 0.01) * R * 0.015 : 0;
  ctx.save();
  ctx.strokeStyle = 'rgba(196,196,206,0.2)'; ctx.lineWidth = Math.max(0.6, R * 0.012);
  ctx.beginPath();
  const promieni = 6;
  for (let k = 0; k <= promieni; k++) {
    const a = a0 + (a1 - a0) * (k / promieni);
    ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R + fal);
  }
  for (let k = 1; k <= n; k++) {
    const r = R * (k / (n + 0.4));
    for (let j = 0; j < promieni; j++) {
      const aa = a0 + (a1 - a0) * (j / promieni), ab = a0 + (a1 - a0) * ((j + 1) / promieni);
      const xa = cx + Math.cos(aa) * r, ya = cy + Math.sin(aa) * r + fal * k / n;
      const xb = cx + Math.cos(ab) * r, yb = cy + Math.sin(ab) * r + fal * k / n;
      const am = (aa + ab) / 2, rm = r * 0.86;
      if (j === 0) ctx.moveTo(xa, ya);
      ctx.quadraticCurveTo(cx + Math.cos(am) * rm, cy + Math.sin(am) * rm, xb, yb);
    }
  }
  ctx.stroke();
  // nitka w dół z pająkiem — tylko z większych
  if (R > 30) {
    const nx = cx + Math.cos((a0 + a1) / 2) * R * 0.55, ny = cy + Math.sin((a0 + a1) / 2) * R * 0.55;
    const dl = R * (0.7 + 0.15 * (wolnoRuszac() ? Math.sin(czas * 0.0006 + cx) : 0));
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx, ny + dl); ctx.stroke();
    ctx.fillStyle = 'rgba(14,12,14,0.95)'; ctx.beginPath(); ctx.ellipse(nx, ny + dl, R * 0.035, R * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Łańcuch zwisający ze sklepienia (ogniwa), kołysze się wolno. */
function lancuch(ctx: CanvasRenderingContext2D, x: number, y: number, dl: number, z: number, czas: number, faza: number, kajdany: boolean): void {
  const kat = wolnoRuszac() ? Math.sin(czas * 0.0007 + faza) * 0.05 : 0;
  const ogniwo = Math.max(2, z * 0.22);
  const n = Math.max(2, Math.floor(dl / ogniwo));
  ctx.save();
  ctx.translate(x, y); ctx.rotate(kat);
  ctx.lineWidth = Math.max(1, z * 0.05);
  for (let k = 0; k < n; k++) {
    ctx.strokeStyle = k % 2 ? 'rgba(70,74,80,0.9)' : 'rgba(54,57,62,0.9)';
    ctx.beginPath();
    if (k % 2) ctx.ellipse(0, k * ogniwo + ogniwo / 2, ogniwo * 0.12, ogniwo * 0.55, 0, 0, Math.PI * 2);
    else ctx.ellipse(0, k * ogniwo + ogniwo / 2, ogniwo * 0.32, ogniwo * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (kajdany) {
    ctx.strokeStyle = 'rgba(80,84,90,0.95)'; ctx.lineWidth = Math.max(1.4, z * 0.08);
    ctx.beginPath(); ctx.arc(0, n * ogniwo + ogniwo * 0.6, ogniwo * 0.7, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Ciągła wysokość sklepienia lochu (kafle nad posadzką) — gładki łuk zamiast schodków z kafli. */
function lukLochu(sim: Sim, x: number): number {
  const w = sim.world, L = LOCH.loch;
  const f = ((((x - w.loch.x0) % L.przeslo) + L.przeslo) % L.przeslo) / L.przeslo;
  const luk = L.sklepienie + L.luk * Math.sin(Math.PI * f);
  const dx = (x - w.coreX) / L.nawaSzer;
  const nawa = Math.abs(dx) <= 1 ? L.nawa - 3 * dx * dx : 0;
  return Math.max(luk, nawa);
}

/** Miejsca koszy ognia w lochu (kafle posadzki) — kilka, równo po obu stronach przedsionka. */
export function koszeOgnia(sim: Sim): { x: number; y: number }[] {
  const w = sim.world, l = w.loch;
  if (l.x1 < l.x0) return [];
  const y = l.y1;
  return [l.x0 + 4, w.coreX - LOCH.loch.nawaSzer - 3, w.coreX + LOCH.loch.nawaSzer + 3, l.x1 - 4].map((x) => ({ x, y }));
}

/** Pochodnie na przedprożu, po obu stronach bramy (kafel, przy którego ścianie wiszą). */
export function pochodnie(sim: Sim): { x: number; y: number }[] {
  const w = sim.world, p = w.przedproze;
  if (p.x1 < p.x0) return [];
  return [{ x: p.x1 - 0.2, y: p.y0 + 1.1 }, { x: p.x0 + 2.5, y: p.y0 + 1.1 }];
}

/** Ogarki świec na półkach w niszach starej komnaty (miejsce płomienia, kafle). */
export function swieceKomnaty(sim: Sim): { x: number; y: number }[] {
  const km = sim.world.komnata;
  if (km.x1 < km.x0) return [];
  return [0.2, 0.8].map((fx) => ({ x: km.x0 + (km.x1 - km.x0 + 1) * fx + 1.02, y: km.y0 + 1.2 + 2.25 }));
}

/** Czy lud już kiedyś widział ten kafel. */
function widziany(sim: Sim, x: number, y: number): boolean {
  const w = sim.world;
  return w.inb(x, y) && w.ever[w.idx(x, y)] !== 0;
}

/**
 * Wnętrze i mur prostokąta: tylna ściana na pustych kaflach, ciosy na kamiennych kaflach muru dookoła
 * (`mur` kafli grubości). Tylko kafle, które lud widział.
 */
function wnetrze(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, r: Prost, mur: number, jas: number, stare: boolean): void {
  const w = sim.world, z = cam.zoom;
  const v = wKadrze(cam, r, mur);
  if (!v) return;
  for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
    if (!w.inb(x, y) || !widziany(sim, x, y)) continue;
    const i = w.idx(x, y);
    const wSrodku = x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
    if (w.passable(x, y)) { if (wSrodku) tlo(ctx, cam, x, y, z, jas, stare); }
    else if (w.tile[i] === T.STONE && !w.wBramie(x, y)) cios(ctx, cam, x, y, z, jas);
  }
}

/** Kocioł na trójnogu nad paleniskiem (bryła; wywar, para i żar — w rysujLochNad). */
function kociol(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const w = sim.world, k = w.kociol, z = cam.zoom;
  if (!widziany(sim, k.x, k.y)) return;
  const cx = cam.toScreenX(k.x + 0.5), dno = cam.toScreenY(k.y + 1);
  const R = z * 1.25, H = z * 1.15;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // palenisko: krąg kamieni
  for (let n = -3; n <= 3; n++) {
    const rx = cx + n * z * 0.34, rr = z * (0.16 + los(n + 99) * 0.07);
    ctx.fillStyle = `rgb(${74 + n * 3},${66 + n * 2},${58})`; ctx.beginPath(); ctx.ellipse(rx, dno - rr * 0.6, rr * 1.2, rr * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  }
  // trójnóg
  ctx.strokeStyle = 'rgba(30,32,36,1)'; ctx.lineWidth = Math.max(1.4, z * 0.09);
  ctx.beginPath();
  ctx.moveTo(cx - R * 0.95, dno); ctx.lineTo(cx - R * 0.55, dno - H * 1.05);
  ctx.moveTo(cx + R * 0.95, dno); ctx.lineTo(cx + R * 0.55, dno - H * 1.05);
  ctx.moveTo(cx, dno); ctx.lineTo(cx, dno - H * 0.55);
  ctx.stroke();
  // brzuch kotła: żeliwo, krawędź i uchwyty
  const gy = dno - H * 1.15, by = dno - H * 0.38;
  const brzuch = new Path2D();
  brzuch.moveTo(cx - R * 0.82, gy);
  brzuch.bezierCurveTo(cx - R * 0.98, by, cx - R * 0.5, by + H * 0.26, cx, by + H * 0.24);
  brzuch.bezierCurveTo(cx + R * 0.5, by + H * 0.26, cx + R * 0.98, by, cx + R * 0.82, gy);
  brzuch.closePath();
  const gr = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
  gr.addColorStop(0, 'rgb(20,21,24)'); gr.addColorStop(0.35, 'rgb(40,42,46)'); gr.addColorStop(0.7, 'rgb(28,29,33)'); gr.addColorStop(1, 'rgb(16,17,20)');
  ctx.fillStyle = gr; ctx.fill(brzuch);
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.06); ctx.stroke(brzuch);
  // nity i pas
  ctx.strokeStyle = 'rgba(120,130,140,0.16)'; ctx.lineWidth = Math.max(1, z * 0.05);
  ctx.beginPath(); ctx.moveTo(cx - R * 0.9, gy + H * 0.32); ctx.quadraticCurveTo(cx, gy + H * 0.42, cx + R * 0.9, gy + H * 0.32); ctx.stroke();
  ctx.fillStyle = 'rgba(140,150,160,0.2)';
  for (let n = -3; n <= 3; n++) { ctx.beginPath(); ctx.arc(cx + n * R * 0.24, gy + H * 0.36 + Math.abs(n) * H * 0.015, Math.max(0.8, z * 0.04), 0, Math.PI * 2); ctx.fill(); }
  // krawędź
  ctx.fillStyle = 'rgb(46,48,52)'; ctx.beginPath(); ctx.ellipse(cx, gy, R * 0.86, H * 0.13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = TUSZ; ctx.stroke();
  // uchwyty
  ctx.strokeStyle = 'rgb(36,38,42)'; ctx.lineWidth = Math.max(1.4, z * 0.08);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * R * 0.92, gy + H * 0.2, z * 0.16, -Math.PI / 2, Math.PI / 2, s < 0); ctx.stroke(); }
  // pulpit z księgą zaklęć obok kotła
  const px = cx + R * 2.1;
  ctx.fillStyle = 'rgb(34,24,18)'; ctx.fillRect(px - z * 0.08, dno - z * 1.0, z * 0.16, z * 1.0);
  ctx.beginPath(); ctx.moveTo(px - z * 0.42, dno - z * 1.02); ctx.lineTo(px + z * 0.42, dno - z * 1.24); ctx.lineTo(px + z * 0.42, dno - z * 1.1); ctx.lineTo(px - z * 0.42, dno - z * 0.9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgb(70,58,44)'; ctx.beginPath(); ctx.moveTo(px - z * 0.36, dno - z * 1.06); ctx.lineTo(px + z * 0.36, dno - z * 1.25); ctx.lineTo(px + z * 0.36, dno - z * 1.18); ctx.lineTo(px - z * 0.36, dno - z * 0.99); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Krata bramy w przejściu — podniesiona o tyle, ile brama otwarta; nad nią nadproże z runami (runy świecą nad mrokiem). */
function brama(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number): void {
  const w = sim.world, b = w.brama, z = cam.zoom;
  if (b.x1 < b.x0 || !(widziany(sim, b.x0 - 1, b.y1) || widziany(sim, b.x1 + 1, b.y1))) return;
  const st = stanBramy(sim);
  const x0 = cam.toScreenX(b.x0), x1 = cam.toScreenX(b.x1 + 1), y0 = cam.toScreenY(b.y0), y1 = cam.toScreenY(b.y1 + 1);
  const W = x1 - x0, H = y1 - y0;
  ctx.save();
  // ościeże: mur dookoła przejścia (na kaflach, które bywają kamieniem albo pustką — zawsze jak mur)
  // wnętrze przejścia: głęboka ciemność za kratą
  // przejście przez mur: ciemny, ale widoczny tunel (sklepienie i posadzka), żeby było widać szparę pod kratą
  const gl = ctx.createLinearGradient(0, y0, 0, y1);
  gl.addColorStop(0, 'rgb(26,21,18)'); gl.addColorStop(0.7, 'rgb(40,33,28)'); gl.addColorStop(1, 'rgb(58,49,41)');
  ctx.fillStyle = gl; ctx.fillRect(x0, y0, W, H);
  ctx.fillStyle = 'rgba(210,190,160,0.12)'; ctx.fillRect(x0, y1 - Math.max(1, z * 0.06), W, Math.max(1, z * 0.06));
  // nadproże: jeden wielki blok nad przejściem, z rowkiem na kratę
  const ny = cam.toScreenY(b.y0 - 1);
  ctx.fillStyle = 'rgb(96,86,76)'; ctx.fillRect(x0 - z * 0.25, ny, W + z * 0.5, z);
  ctx.fillStyle = 'rgba(220,200,170,0.14)'; ctx.fillRect(x0 - z * 0.25, ny, W + z * 0.5, Math.max(1, z * 0.08));
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.06); ctx.strokeRect(x0 - z * 0.25, ny, W + z * 0.5, z);
  // runy wyryte (ciemne; świecą w rysujLochNad)
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = Math.max(1, z * 0.06);
  for (let k = 0; k < 5; k++) runa(ctx, x0 + W * ((k + 0.5) / 5), ny + z * 0.5, z * 0.22, k);
  // krata: przesunięta w górę o otwarcie × wysokość przejścia, schowana za nadprożem (przycięta do przejścia)
  const unies = st.otwarcie * H;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
  const gora = y0 - unies, dol = y1 - unies;
  const pion = 6, poz = 4;
  const gr = Math.max(1.4, z * 0.11);
  // poziome pasy
  for (let k = 0; k < poz; k++) {
    const yy = gora + H * ((k + 0.5) / poz);
    ctx.fillStyle = STAL; ctx.fillRect(x0, yy - gr * 0.45, W, gr * 0.9);
    ctx.fillStyle = STAL_JASNA; ctx.fillRect(x0, yy - gr * 0.45, W, Math.max(0.8, gr * 0.22));
  }
  // pręty z kolcami u dołu
  for (let k = 0; k < pion; k++) {
    const xx = x0 + W * ((k + 0.5) / pion);
    const g = ctx.createLinearGradient(xx - gr, 0, xx + gr, 0);
    g.addColorStop(0, 'rgb(40,45,52)'); g.addColorStop(0.45, 'rgb(128,140,152)'); g.addColorStop(1, 'rgb(34,38,44)');
    ctx.fillStyle = g; ctx.fillRect(xx - gr / 2, gora - H, gr, dol - gora + H - gr * 1.4);
    ctx.beginPath(); ctx.moveTo(xx - gr * 0.6, dol - gr * 1.5); ctx.lineTo(xx + gr * 0.6, dol - gr * 1.5); ctx.lineTo(xx, dol); ctx.closePath(); ctx.fill();
    ctx.fillStyle = RDZA; ctx.fillRect(xx - gr / 2, dol - H * 0.3, gr, H * 0.12);
  }
  // nity na skrzyżowaniach
  ctx.fillStyle = 'rgba(150,160,172,0.28)';
  for (let a = 0; a < pion; a++) for (let c = 0; c < poz; c++) {
    ctx.beginPath(); ctx.arc(x0 + W * ((a + 0.5) / pion), gora + H * ((c + 0.5) / poz), Math.max(0.8, gr * 0.32), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // kurz z rowka, gdy krata opada albo się unosi
  if (wolnoRuszac() && st.otwarcie > 0 && st.otwarcie < 1) {
    ctx.fillStyle = 'rgba(150,130,110,0.25)';
    for (let n = 0; n < 4; n++) {
      const f = ((czas * 0.0006 + n * 0.25) % 1);
      ctx.beginPath(); ctx.arc(x0 + W * (0.15 + 0.7 * los(n + 7)), y0 + f * z * 0.8, Math.max(0.8, z * 0.04), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Jedna runa (kreska) — pięć wzorów na zmianę. */
function runa(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, k: number): void {
  ctx.beginPath();
  switch (k % 5) {
    case 0: ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.moveTo(x - r * 0.6, y - r * 0.2); ctx.lineTo(x + r * 0.6, y + r * 0.3); break;
    case 1: ctx.moveTo(x - r * 0.6, y + r); ctx.lineTo(x, y - r); ctx.lineTo(x + r * 0.6, y + r); ctx.moveTo(x - r * 0.3, y + r * 0.1); ctx.lineTo(x + r * 0.3, y + r * 0.1); break;
    case 2: ctx.arc(x, y, r * 0.75, 0, Math.PI * 2); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); break;
    case 3: ctx.moveTo(x - r * 0.6, y - r); ctx.lineTo(x + r * 0.6, y + r); ctx.moveTo(x + r * 0.6, y - r); ctx.lineTo(x - r * 0.6, y + r); break;
    default: ctx.moveTo(x - r * 0.6, y - r); ctx.lineTo(x + r * 0.5, y - r * 0.3); ctx.lineTo(x - r * 0.5, y + r * 0.3); ctx.lineTo(x + r * 0.6, y + r); break;
  }
  ctx.stroke();
}

/** Kosz ognia na trójnogu (bryła; płomień nad mrokiem). */
function kosz(ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, z: number): void {
  const cx = cam.toScreenX(x + 0.5), dno = cam.toScreenY(y + 1);
  ctx.save();
  ctx.strokeStyle = 'rgb(30,31,35)'; ctx.lineWidth = Math.max(1.2, z * 0.07);
  ctx.beginPath(); ctx.moveTo(cx - z * 0.4, dno); ctx.lineTo(cx, dno - z * 0.85); ctx.lineTo(cx + z * 0.4, dno); ctx.moveTo(cx, dno); ctx.lineTo(cx, dno - z * 0.85); ctx.stroke();
  ctx.fillStyle = 'rgb(38,39,43)';
  ctx.beginPath(); ctx.moveTo(cx - z * 0.48, dno - z * 1.15); ctx.lineTo(cx + z * 0.48, dno - z * 1.15); ctx.lineTo(cx + z * 0.3, dno - z * 0.82); ctx.lineTo(cx - z * 0.3, dno - z * 0.82); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.05); ctx.stroke();
  ctx.restore();
}

/** Chorągiew (postrzępiona, ciemny karmazyn) wisząca przy filarze — faluje wolno. */
function choragiew(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, dl: number, czas: number, faza: number): void {
  const fal = wolnoRuszac() ? Math.sin(czas * 0.0011 + faza) * z * 0.08 : 0;
  const sz = z * 1.1;
  ctx.save();
  ctx.fillStyle = 'rgb(118,34,34)';
  ctx.beginPath();
  ctx.moveTo(x - sz / 2, y); ctx.lineTo(x + sz / 2, y);
  ctx.quadraticCurveTo(x + sz / 2 + fal, y + dl * 0.5, x + sz / 2 + fal * 1.4, y + dl);
  ctx.lineTo(x + sz * 0.2 + fal, y + dl * 0.86); ctx.lineTo(x + fal * 1.2, y + dl * 1.02); ctx.lineTo(x - sz * 0.2 + fal, y + dl * 0.86);
  ctx.lineTo(x - sz / 2 + fal * 1.4, y + dl);
  ctx.quadraticCurveTo(x - sz / 2 + fal, y + dl * 0.5, x - sz / 2, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(160,120,70,0.25)'; ctx.lineWidth = Math.max(0.8, z * 0.04);
  ctx.beginPath(); ctx.arc(x + fal * 0.6, y + dl * 0.38, sz * 0.22, 0, Math.PI * 2); ctx.moveTo(x - sz * 0.12 + fal * 0.6, y + dl * 0.38); ctx.lineTo(x + sz * 0.12 + fal * 0.6, y + dl * 0.38); ctx.stroke();
  ctx.fillStyle = 'rgb(40,30,22)'; ctx.fillRect(x - sz * 0.62, y - z * 0.06, sz * 1.24, z * 0.12);
  ctx.restore();
}

/** Loch, przedproże, komnata z kotłem i brama — przed mrokiem (ciemność je zakrywa, światło wydobywa). */
export function rysujLoch(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number): void {
  const w = sim.world, z = cam.zoom;
  if (w.loch.x1 < w.loch.x0) return;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const L = LOCH.loch;

  // --- stara komnata z kotłem
  const km = w.komnata;
  if (wKadrze(cam, km, 2)) {
    wnetrze(ctx, sim, cam, km, 1, 0.95, true);
    if (widziany(sim, km.x0, km.y1) || widziany(sim, km.x1, km.y1) || widziany(sim, w.kociol.x, w.kociol.y)) {
      // nisze z półkami w tylnej ścianie: słoje, czaszki, księgi
      for (const fx of [0.2, 0.8]) {
        const nx = cam.toScreenX(km.x0 + (km.x1 - km.x0 + 1) * fx), ny = cam.toScreenY(km.y0 + 1.2);
        ctx.fillStyle = 'rgb(24,19,16)';
        ctx.beginPath(); ctx.moveTo(nx - z * 1.4, ny + z * 3.2); ctx.lineTo(nx - z * 1.4, ny + z * 0.8); ctx.quadraticCurveTo(nx, ny - z * 0.4, nx + z * 1.4, ny + z * 0.8); ctx.lineTo(nx + z * 1.4, ny + z * 3.2); ctx.closePath(); ctx.fill();
        for (const py of [1.5, 2.6]) {
          ctx.fillStyle = 'rgb(84,58,38)'; ctx.fillRect(nx - z * 1.35, ny + z * py, z * 2.7, z * 0.12);
          for (let k = 0; k < 4; k++) {
            const r = los(Math.round(fx * 100) + k * 13 + py * 7);
            const ox = nx - z * 1.1 + k * z * 0.7;
            if (r < 0.33) { ctx.fillStyle = 'rgb(48,52,44)'; ctx.fillRect(ox, ny + z * (py - 0.42), z * 0.28, z * 0.42); }
            else if (r < 0.6) { ctx.fillStyle = 'rgb(96,90,80)'; ctx.beginPath(); ctx.arc(ox + z * 0.15, ny + z * (py - 0.18), z * 0.17, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgb(16,14,16)'; ctx.fillRect(ox + z * 0.07, ny + z * (py - 0.22), z * 0.05, z * 0.05); ctx.fillRect(ox + z * 0.18, ny + z * (py - 0.22), z * 0.05, z * 0.05); }
            else { ctx.fillStyle = r < 0.8 ? 'rgb(52,30,26)' : 'rgb(30,34,48)'; ctx.fillRect(ox, ny + z * (py - 0.5), z * 0.14, z * 0.5); ctx.fillRect(ox + z * 0.16, ny + z * (py - 0.44), z * 0.12, z * 0.44); }
          }
        }
        pajeczyna(ctx, nx + z * 1.35, ny + z * 0.85, z * 1.2, Math.PI * 0.5, Math.PI, 3, czas);
        // ogarek świecy na dolnej półce (płomień — nad mrokiem)
        ctx.fillStyle = 'rgb(150,136,110)'; ctx.fillRect(nx + z * 0.95, ny + z * 2.25, z * 0.14, z * 0.35);
      }
      // dwa złamane filary
      for (const fx of [0.36, 0.64]) {
        const px = cam.toScreenX(km.x0 + (km.x1 - km.x0 + 1) * fx), dno = cam.toScreenY(km.y1 + 1), wys = z * (fx < 0.5 ? 4.2 : 2.6);
        ctx.fillStyle = 'rgb(90,80,70)'; ctx.fillRect(px - z * 0.42, dno - wys, z * 0.84, wys);
        ctx.fillStyle = 'rgba(220,200,170,0.12)'; ctx.fillRect(px - z * 0.42, dno - wys, z * 0.14, wys);
        ctx.fillStyle = 'rgb(100,88,76)'; ctx.fillRect(px - z * 0.56, dno - z * 0.3, z * 1.12, z * 0.3);
        ctx.beginPath(); ctx.moveTo(px - z * 0.42, dno - wys); ctx.lineTo(px - z * 0.1, dno - wys - z * 0.3); ctx.lineTo(px + z * 0.2, dno - wys + z * 0.05); ctx.lineTo(px + z * 0.42, dno - wys - z * 0.15); ctx.lineTo(px + z * 0.42, dno - wys); ctx.closePath(); ctx.fillStyle = 'rgb(90,80,70)'; ctx.fill();
        // gruz u stóp
        for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgb(${76 + k * 4},${68 + k * 3},${60})`; ctx.beginPath(); ctx.ellipse(px + (k - 1.5) * z * 0.45 + z * 0.9, dno - z * 0.1, z * (0.12 + los(k + fx * 10) * 0.12), z * 0.09, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      // pajęczyny w górnych rogach i łańcuch z kajdanami
      const lx = cam.toScreenX(km.x0), rx = cam.toScreenX(km.x1 + 1), gy = cam.toScreenY(km.y0);
      pajeczyna(ctx, lx, gy, z * 2.6, 0, Math.PI / 2, 5, czas);
      pajeczyna(ctx, rx, gy, z * 2.2, Math.PI / 2, Math.PI, 4, czas);
      pajeczyna(ctx, cam.toScreenX(km.x0 + (km.x1 - km.x0 + 1) * 0.5) - z * 6, gy, z * 1.4, Math.PI * 0.15, Math.PI * 0.85, 3, czas);
      lancuch(ctx, cam.toScreenX(km.x0 + (km.x1 - km.x0) * 0.12), gy, z * 2.2, z, czas, 1.3, true);
      lancuch(ctx, cam.toScreenX(km.x0 + (km.x1 - km.x0) * 0.9), gy, z * 1.6, z, czas, 2.7, false);
      kociol(ctx, sim, cam);
    }
  }

  // --- przedproże: mur, pochodnie, płaskorzeźba nad bramą
  const pp = w.przedproze;
  if (wKadrze(cam, pp, 2)) {
    wnetrze(ctx, sim, cam, pp, 1, 1, false);
    if (widziany(sim, pp.x1, pp.y1)) {
      for (const p of pochodnie(sim)) {
        const px = cam.toScreenX(p.x), py = cam.toScreenY(p.y);
        ctx.strokeStyle = 'rgb(34,30,28)'; ctx.lineWidth = Math.max(1.2, z * 0.08);
        ctx.beginPath(); ctx.moveTo(px, py + z * 0.6); ctx.lineTo(px, py); ctx.stroke();
        ctx.fillStyle = 'rgb(48,34,22)'; ctx.fillRect(px - z * 0.1, py - z * 0.15, z * 0.2, z * 0.25);
      }
      // twarz demona wyryta nad bramą (płaska, ledwo widoczna)
      const fx = cam.toScreenX(w.brama.x0 + 1), fy = cam.toScreenY(pp.y0 + 0.4);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = Math.max(1, z * 0.05);
      ctx.beginPath(); ctx.moveTo(fx - z * 0.6, fy - z * 0.1); ctx.quadraticCurveTo(fx - z * 0.9, fy - z * 0.7, fx - z * 0.4, fy - z * 0.8); ctx.moveTo(fx + z * 0.6, fy - z * 0.1); ctx.quadraticCurveTo(fx + z * 0.9, fy - z * 0.7, fx + z * 0.4, fy - z * 0.8); ctx.stroke();
    }
  }

  // --- loch: mur i tylna ściana, filary przęseł, łuki sklepienia, łańcuchy, chorągwie, kosze ognia, mgła
  const l = w.loch;
  const vl = wKadrze(cam, l, L.mur + 1);
  if (vl) {
    wnetrze(ctx, sim, cam, l, L.mur, 1, false);
    const podloga = l.y1 + 1;
    // pilastry na granicach przęseł (od posadzki do nasady łuku) i łuki: gładka linia + klińce nad nią
    for (let x = l.x0; x <= l.x1 + 1; x += L.przeslo) {
      if (Math.abs(x - w.coreX) < L.nawaSzer - 1 || !widziany(sim, Math.min(l.x1, x), l.y1)) continue;
      const px = cam.toScreenX(x), dol = cam.toScreenY(podloga), gora = cam.toScreenY(podloga - L.sklepienie);
      ctx.fillStyle = 'rgb(92,82,72)'; ctx.fillRect(px - z * 0.45, gora, z * 0.9, dol - gora);
      ctx.fillStyle = 'rgba(220,200,170,0.12)'; ctx.fillRect(px - z * 0.45, gora, z * 0.16, dol - gora);
      ctx.fillStyle = 'rgb(104,92,80)'; ctx.fillRect(px - z * 0.6, gora, z * 1.2, z * 0.35); ctx.fillRect(px - z * 0.6, dol - z * 0.35, z * 1.2, z * 0.35);
    }
    // łuki sklepienia: pas klińców wzdłuż gładkiej linii
    ctx.strokeStyle = 'rgb(98,88,76)'; ctx.lineWidth = z * 0.55;
    ctx.beginPath();
    let pierwszy = true;
    for (let x = Math.max(l.x0, vl.x0); x <= Math.min(l.x1 + 1, vl.x1 + 1); x += 0.5) {
      const sx = cam.toScreenX(x), sy = cam.toScreenY(podloga - lukLochu(sim, x)) - z * 0.25;
      if (pierwszy) { ctx.moveTo(sx, sy); pierwszy = false; } else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1, z * 0.05);
    ctx.beginPath();
    for (let x = Math.max(l.x0, vl.x0); x <= Math.min(l.x1 + 1, vl.x1 + 1); x += 0.75) {
      const h0 = lukLochu(sim, x), sx = cam.toScreenX(x), sy = cam.toScreenY(podloga - h0);
      ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - z * 0.55);
    }
    ctx.stroke();
    // łańcuchy z kajdanami w co drugim przęśle, chorągwie przy nawie
    for (let k = 0, x = l.x0 + L.przeslo / 2; x < l.x1; x += L.przeslo, k++) {
      if (Math.abs(x - w.coreX) < L.nawaSzer || k % 2 || !widziany(sim, Math.round(x), l.y1)) continue;
      const sy = cam.toScreenY(podloga - lukLochu(sim, x));
      lancuch(ctx, cam.toScreenX(x - 1.2), sy, z * 3.4, z, czas, k, true);
      lancuch(ctx, cam.toScreenX(x + 1.4), sy, z * 2.4, z, czas, k + 2, false);
    }
    for (const s of [-1, 1]) {
      const x = w.coreX + s * (L.nawaSzer + 0.5);
      if (!widziany(sim, Math.round(x), l.y1)) continue;
      choragiew(ctx, cam.toScreenX(x), cam.toScreenY(podloga - L.sklepienie + 0.4), z, z * 4.2, czas, s);
    }
    for (const k of koszeOgnia(sim)) if (widziany(sim, k.x, k.y)) kosz(ctx, cam, k.x, k.y, z);
    // mgła przy posadzce: dwie, trzy smugi płyną wolno
    if (widziany(sim, w.coreX, l.y1) || widziany(sim, l.x0 + 2, l.y1)) {
      for (let n = 0; n < 3; n++) {
        const t = wolnoRuszac() ? czas * 0.00002 * (n + 1) : 0;
        const mx = l.x0 + ((los(n + 41) + t) % 1) * (l.x1 - l.x0);
        const sx = cam.toScreenX(mx), sy = cam.toScreenY(podloga - 0.35);
        const R = z * (9 + n * 3);
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        g.addColorStop(0, 'rgba(120,124,140,0.07)'); g.addColorStop(1, 'rgba(120,124,140,0)');
        ctx.fillStyle = g; ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.18); ctx.translate(-sx, -sy); ctx.fillRect(sx - R, sy - R, R * 2, R * 2); ctx.restore();
      }
    }
  }
  brama(ctx, sim, cam, czas);
  ctx.restore();
}

/** Płomień (pochodnia, kosz ognia): miękki, ciepły, drga wolno — bez ostrych błysków. */
function plomien(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, czas: number, faza: number): void {
  const m = wolnoRuszac() ? migotLampy(czas + faza * 997) : 0.5;
  const R = s * (2.6 + 0.4 * m);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,170,90,${0.28 + 0.08 * m})`); g.addColorStop(0.4, 'rgba(200,90,40,0.1)'); g.addColorStop(1, 'rgba(120,40,20,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  const h = s * (0.9 + 0.25 * m);
  ctx.fillStyle = `rgba(255,190,110,${0.75 + 0.15 * m})`;
  ctx.beginPath(); ctx.moveTo(x - s * 0.32, y); ctx.quadraticCurveTo(x - s * 0.2, y - h * 0.6, x + (m - 0.5) * s * 0.3, y - h); ctx.quadraticCurveTo(x + s * 0.24, y - h * 0.5, x + s * 0.32, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,236,190,0.7)';
  ctx.beginPath(); ctx.ellipse(x, y - h * 0.22, s * 0.12, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
}

/** Światło nad mrokiem: kocioł (wywar, para, runy przy zaklinaniu), płomienie, runy bramy, krąg modlitwy za innych. */
export function rysujLochNad(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number): void {
  const w = sim.world, z = cam.zoom;
  if (w.loch.x1 < w.loch.x0) return;
  const ruch = wolnoRuszac();
  const st = stanBramy(sim);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // --- kocioł
  const k = w.kociol;
  if (widziany(sim, k.x, k.y) && wKadrze(cam, { x0: k.x - 6, x1: k.x + 6, y0: k.y - 6, y1: k.y + 1 })) {
    const cx = cam.toScreenX(k.x + 0.5), dno = cam.toScreenY(k.y + 1);
    const R = z * 1.25, H = z * 1.15, gy = dno - H * 1.15;
    const zak = st.zaklina;
    const moc = zak >= BRAMA.potrzeba ? 1 : zak > 0 ? 0.55 : 0.25;
    const puls = ruch ? 0.5 + 0.5 * Math.sin(czas * 0.0024) : 0.5;
    // żar pod kotłem
    const zg = ctx.createRadialGradient(cx, dno - z * 0.2, 0, cx, dno - z * 0.2, z * 1.6);
    zg.addColorStop(0, `rgba(255,120,50,${0.35 + 0.1 * migotLampy(czas)})`); zg.addColorStop(1, 'rgba(160,50,20,0)');
    ctx.fillStyle = zg; ctx.fillRect(cx - z * 1.6, dno - z * 1.8, z * 3.2, z * 1.8);
    // wywar: turkusowe lustro, bańki
    const wg = ctx.createRadialGradient(cx, gy, 0, cx, gy, R * (1.4 + moc));
    wg.addColorStop(0, `rgba(110,220,196,${0.26 + 0.24 * moc + 0.06 * puls})`); wg.addColorStop(1, 'rgba(40,120,110,0)');
    ctx.fillStyle = wg; ctx.fillRect(cx - R * 3, gy - R * 3, R * 6, R * 4);
    ctx.fillStyle = `rgba(120,224,200,${0.55 + 0.3 * moc})`;
    ctx.beginPath(); ctx.ellipse(cx, gy + H * 0.02, R * 0.74, H * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    if (ruch) for (let n = 0; n < 5; n++) {
      const f = (czas * 0.0009 * (1 + moc) + n * 0.21) % 1;
      const bx = cx + (los(n + 3) - 0.5) * R * 1.2, by = gy - f * H * 0.3;
      ctx.strokeStyle = `rgba(170,240,220,${0.5 * (1 - f)})`; ctx.lineWidth = Math.max(0.8, z * 0.04);
      ctx.beginPath(); ctx.arc(bx, by, z * (0.06 + 0.05 * f), 0, Math.PI * 2); ctx.stroke();
    }
    // para: miękkie smugi w górę
    for (let n = 0; n < 3; n++) {
      const f = ruch ? (czas * 0.00025 + n / 3) % 1 : n / 3;
      const px = cx + Math.sin(f * 6 + n) * R * 0.5, py = gy - f * z * 3.2;
      const pr = z * (0.5 + f * 1.2);
      const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
      pg.addColorStop(0, `rgba(170,210,200,${0.12 * (1 - f) * (0.6 + moc)})`); pg.addColorStop(1, 'rgba(170,210,200,0)');
      ctx.fillStyle = pg; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    // zaklinanie: runy krążą nad kotłem, nici od rąk rzucających do wywaru
    if (zak > 0) {
      ctx.strokeStyle = `rgba(150,236,214,${0.55 * moc + 0.15 * puls})`; ctx.lineWidth = Math.max(1, z * 0.06);
      for (let n = 0; n < 6; n++) {
        const a = (ruch ? czas * 0.0012 : 0) + n * Math.PI / 3;
        runa(ctx, cx + Math.cos(a) * R * 1.35, gy - z * 1.3 + Math.sin(a) * z * 0.45, z * 0.2, n);
      }
      for (const c of zaklinajacy(sim)) {
        const hx = cam.toScreenX(c.x + 0.5 + (c.x < k.x + 0.5 ? 0.35 : -0.35)), hy = cam.toScreenY(c.y + 0.05);
        const g = ctx.createLinearGradient(hx, hy, cx, gy);
        g.addColorStop(0, 'rgba(255,236,190,0.6)'); g.addColorStop(1, 'rgba(120,230,206,0.5)');
        ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, z * 0.05);
        const fal = ruch ? Math.sin(czas * 0.006 + c.id) * z * 0.3 : 0;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + cx) / 2, Math.min(hy, gy) - z * 0.9 + fal, cx, gy); ctx.stroke();
        const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, z * 0.5);
        hg.addColorStop(0, 'rgba(255,240,200,0.55)'); hg.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = hg; ctx.fillRect(hx - z * 0.5, hy - z * 0.5, z, z);
      }
    } else {
      // sami przy kotle, bez drugiego — wywar ledwie się burzy
      for (const c of sim.creatures) if (!c.dead && c.polecenie?.zaklinaj && przyKotle(sim, c) && c.polecenie.na) {
        const hx = cam.toScreenX(c.x + 0.5), hy = cam.toScreenY(c.y + 0.05);
        const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, z * 0.35);
        hg.addColorStop(0, 'rgba(255,240,200,0.35)'); hg.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = hg; ctx.fillRect(hx - z * 0.35, hy - z * 0.35, z * 0.7, z * 0.7);
      }
    }
  }
  // --- ogarki świec w niszach starej komnaty
  for (const p of swieceKomnaty(sim)) if (widziany(sim, Math.floor(p.x), Math.floor(p.y))) plomien(ctx, cam.toScreenX(p.x), cam.toScreenY(p.y), z * 0.22, czas, p.x * 3);
  // --- płomienie pochodni i koszy ognia
  for (const p of pochodnie(sim)) if (widziany(sim, Math.floor(p.x), Math.floor(p.y))) plomien(ctx, cam.toScreenX(p.x), cam.toScreenY(p.y) - z * 0.15, z * 0.42, czas, p.x);
  for (const p of koszeOgnia(sim)) if (widziany(sim, p.x, p.y)) plomien(ctx, cam.toScreenX(p.x + 0.5), cam.toScreenY(p.y + 1) - z * 1.12, z * 0.62, czas, p.x);
  // --- runy na nadprożu bramy: zapalają się kolejno, ile otwarta (turkus przy zaklinaniu, gasnące, gdy opada)
  const b = w.brama;
  if (b.x1 >= b.x0 && (widziany(sim, b.x0 - 1, b.y1) || widziany(sim, b.x1 + 1, b.y1)) && st.otwarcie > 0.001) {
    const x0 = cam.toScreenX(b.x0), W = cam.toScreenX(b.x1 + 1) - x0, ny = cam.toScreenY(b.y0 - 1);
    const rosnie = st.zaklina >= BRAMA.potrzeba;
    for (let n = 0; n < 5; n++) {
      const a = Math.max(0, Math.min(1, st.otwarcie * 5 - n));
      if (a <= 0) continue;
      const rx = x0 + W * ((n + 0.5) / 5), ry = ny + z * 0.5;
      const g = ctx.createRadialGradient(rx, ry, 0, rx, ry, z * 0.5);
      g.addColorStop(0, rosnie ? `rgba(140,236,212,${0.45 * a})` : `rgba(220,190,140,${0.3 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(rx - z * 0.5, ry - z * 0.5, z, z);
      ctx.strokeStyle = rosnie ? `rgba(170,244,224,${0.9 * a})` : `rgba(236,210,160,${0.65 * a})`; ctx.lineWidth = Math.max(1, z * 0.06);
      runa(ctx, rx, ry, z * 0.22, n);
    }
  }
  // --- modlitwa za innych: krąg światła pod modlącym się i nici do tych, których właśnie błogosławi
  const B = BLOGOSLAWIENSTWO;
  for (const s of sim.creatures) {
    if (!modliSieZaInnych(sim, s)) continue;
    const sx = cam.toScreenX(s.x + 0.5), sy = cam.toScreenY(s.y + 1);
    const R = B.promien * z;
    if (sx + R < 0 || sx - R > cam.vw || sy + R < 0 || sy - R > cam.vh) continue;
    const puls = ruch ? 0.5 + 0.5 * Math.sin(czas * 0.002 + s.id) : 0.5;
    ctx.save();
    ctx.translate(sx, sy); ctx.scale(1, 0.22);
    const g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
    g.addColorStop(0, `rgba(255,226,150,${0.2 + 0.06 * puls})`); g.addColorStop(0.85, `rgba(255,214,130,${0.1 + 0.05 * puls})`); g.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    // ciemny podkład pod złotą linią — krąg widać i w jasnej sali, i w mroku
    const gr = Math.max(1.4, z * 0.08);
    ctx.setLineDash([z * 0.6, z * 0.5]); ctx.lineDashOffset = ruch ? -czas * 0.01 : 0;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.97, 0, Math.PI * 2);
    ctx.lineWidth = (gr + 2) / 0.22 * 0.35; ctx.strokeStyle = 'rgba(24,14,8,0.4)'; ctx.stroke();
    ctx.lineWidth = gr / 0.22 * 0.35; ctx.strokeStyle = `rgba(255,214,130,${0.7 + 0.2 * puls})`; ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    // słup ciepłego światła nad modlącym się
    const hy0 = cam.toScreenY(s.y - 1.6);
    const sg = ctx.createLinearGradient(0, hy0, 0, sy);
    sg.addColorStop(0, 'rgba(255,230,170,0)'); sg.addColorStop(0.5, `rgba(255,230,170,${0.14 + 0.06 * puls})`); sg.addColorStop(1, 'rgba(255,230,170,0.02)');
    ctx.fillStyle = sg; ctx.fillRect(sx - z * 0.55, hy0, z * 1.1, sy - hy0);
    for (const o of sim.creatures) {
      if (o.dead || o === s || o.blogOd !== s.id || sim.tick - (o.blogT ?? -1e9) > B.co * 2 || !rolaPostaci(o)) continue;
      const ox = cam.toScreenX(o.x + 0.5), oy = cam.toScreenY(o.y + 0.2);
      const hx = sx, hy = cam.toScreenY(s.y + 0.1);
      const gg = ctx.createLinearGradient(hx, hy, ox, oy);
      gg.addColorStop(0, 'rgba(255,226,150,0.9)'); gg.addColorStop(1, 'rgba(255,226,150,0.35)');
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + ox) / 2, Math.min(hy, oy) - z * 1.2, ox, oy);
      ctx.strokeStyle = 'rgba(24,14,8,0.3)'; ctx.lineWidth = Math.max(2.4, z * 0.1); ctx.stroke();
      ctx.strokeStyle = gg; ctx.lineWidth = Math.max(1.1, z * 0.05); ctx.stroke();
      // leczony: złote drobiny wznoszą się wolno
      if (o.hp < maxHp(sim, o) - 0.01 && ruch) {
        for (let n = 0; n < 3; n++) {
          const f = (czas * 0.0007 + n / 3 + o.id * 0.13) % 1;
          ctx.fillStyle = `rgba(255,230,160,${0.6 * (1 - f)})`;
          ctx.beginPath(); ctx.arc(ox + Math.sin(f * 9 + n) * z * 0.3, oy + z * 0.6 - f * z * 1.4, Math.max(0.8, z * 0.05), 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

/** Światła lochu dla mroku (render/mrok.ts): kocioł, pochodnie, kosze ognia, runy bramy, krąg modlitwy za innych. */
export function swiatlaLochu(sim: Sim, swiec: (x: number, y: number, r: number, sila?: number) => void, czas: number): void {
  const w = sim.world;
  if (w.loch.x1 < w.loch.x0) return;
  const m = (f: number) => (wolnoRuszac() ? 0.94 + 0.08 * migotLampy(czas + f) : 1);
  const st = stanBramy(sim);
  const k = w.kociol;
  if (widziany(sim, k.x, k.y)) swiec(k.x + 0.5, k.y - 0.6, (st.zaklina >= BRAMA.potrzeba ? 9.5 : 7) * m(11), 0.95);
  for (const p of swieceKomnaty(sim)) if (widziany(sim, Math.floor(p.x), Math.floor(p.y))) swiec(p.x, p.y, 4.2 * m(p.x * 7), 0.8);
  for (const p of pochodnie(sim)) if (widziany(sim, Math.floor(p.x), Math.floor(p.y))) swiec(p.x, p.y, 5.6 * m(p.x * 31), 0.92);
  for (const p of koszeOgnia(sim)) if (widziany(sim, p.x, p.y)) swiec(p.x + 0.5, p.y - 0.6, 8 * m(p.x * 17), 0.92);
  if (st.otwarcie > 0.01 && widziany(sim, w.brama.x0 - 1, w.brama.y1)) swiec(w.brama.x0 + 1, w.brama.y0 - 0.5, 2.4 + 1.4 * st.otwarcie, 0.7);
}

/**
 * Gęsty mrok (rysunek: render/mrok.ts) — kształty, w których ciemność jest gęstsza niż w zwykłej skale: komnata
 * z kotłem i przedproże (z murem) oraz loch kolumnami — pod sklepieniem i w murze, nie w skale nad łukami.
 */
export function gestyMrok(sim: Sim): Prost[] {
  const w = sim.world;
  if (w.loch.x1 < w.loch.x0) return [];
  const L = LOCH.loch, l = w.loch, podloga = l.y1 + 1;
  const out: Prost[] = [
    { x0: w.komnata.x0 - 1, x1: w.komnata.x1 + 1, y0: w.komnata.y0 - 1, y1: w.komnata.y1 + 1 },
    { x0: w.przedproze.x0 - 1, x1: w.brama.x1, y0: w.przedproze.y0 - 1, y1: w.przedproze.y1 + 1 },
  ];
  // loch: kolumnami o tej samej wysokości sklepienia (sklejone w prostokąty)
  let x0 = l.x0 - L.mur, gora = -1;
  for (let x = l.x0 - L.mur; x <= l.x1 + L.mur + 1; x++) {
    const xx = Math.max(l.x0, Math.min(l.x1, x));
    const g = x > l.x1 + L.mur ? -2 : podloga - w.wysokoscLochu(xx) - L.mur;
    if (g !== gora) {
      if (gora >= 0) out.push({ x0, x1: x - 1, y0: gora, y1: podloga });
      x0 = x; gora = g;
    }
  }
  return out;
}
