/**
 * PIEKŁO W LOCHU (Krąg Trzeci, 16.11 — po uwadze użytkownika: „całość grafiki dużo mocniej w klimacie piekła
 * Dantego… jeszcze więcej gore”). Loch pod kręgiem, w którym walczy się z Cerberem, to już nie czysta krypta:
 *  - przed mrokiem (rysujPiekloLochu): krew spływająca po murach spod sklepienia, okopcone ściany nad koszami ognia,
 *    wisielcy na łańcuchach (powieszeni za nadgarstki, kołyszą się, kapie z nich krew w kałuże), kopce czaszek
 *    i kości pod murami, krwawe smugi na posadzce, gdzie wleczono ciała;
 *  - nad mrokiem (rysujPiekloLochuNad): żar z koszy ognia czerwieni mury, iskry lecą pod sklepienie, z rozbitej
 *    pieczęci bije łuna niższych kręgów i dym.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { LOCH } from '../nastawy/loch';
import { wolnoRuszac } from './nastroj';
import { migotLampy } from './fresk';
import { rysujLudzika, kaluzaKrwi, type PozaLudzika } from './ludzik';
import { koszeOgnia, lukLochu, widzianyKafel } from './loch';
import { iskry } from './pieklo';
import { ustawienia } from '../core/settings-store';

const los = (n: number): number => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const TUSZ = 'rgba(10,6,5,0.95)';
const KOSC = 'rgb(168,152,124)';

/** Wisielec powieszony za nadgarstki: ręce w górę, głowa opadła, nogi bezwładne. */
function pozaWisielca(t: number, z: number): PozaLudzika {
  const k = Math.sin(t * 0.9 + z) * 0.04;
  return {
    tulow: 0.02 + k, glowa: 0.55, ramieL: Math.PI - 0.22, lokiecL: 0.05, ramieP: Math.PI + 0.18, lokiecP: -0.05,
    udoL: 0.06 - k, kolanoL: 0.12, udoP: -0.04 - k, kolanoP: 0.2, usta: 0.6, brzuch: 0.6, bloto: 0.4, krew: 1,
    brak: z % 3 === 1 ? { trzewia: true } : z % 3 === 2 ? { nogaP: true } : undefined,
  };
}

/** Kopiec czaszek pod murem: `x`, `y` — środek podstawy (piksele), `s` — wielkość czaszki. */
function kopiecCzaszek(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, n: number, ziarno: number): void {
  const rzedy = Math.max(2, Math.round(Math.sqrt(n)));
  let k = 0;
  for (let r = 0; r < rzedy; r++) {
    const wRz = rzedy - r;
    for (let i = 0; i < wRz; i++, k++) {
      const cx = x + (i - (wRz - 1) / 2) * s * 1.7 + (los(ziarno + k * 7) - 0.5) * s * 0.4;
      const cy = y - s * 0.8 - r * s * 1.35;
      const jas = 0.75 + 0.3 * los(ziarno + k * 3);
      ctx.fillStyle = `rgb(${(168 * jas) | 0},${(150 * jas) | 0},${(122 * jas) | 0})`;
      ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.7, s * 0.12);
      ctx.beginPath(); ctx.ellipse(cx, cy, s, s * 0.88, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(cx - s * 0.55, cy + s * 0.45, s * 1.1, s * 0.5);
      ctx.fillStyle = 'rgba(8,4,3,0.95)';
      ctx.beginPath(); ctx.ellipse(cx - s * 0.36, cy + s * 0.05, s * 0.26, s * 0.3, 0, 0, Math.PI * 2); ctx.ellipse(cx + s * 0.36, cy + s * 0.05, s * 0.26, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.3); ctx.lineTo(cx - s * 0.1, cy + s * 0.55); ctx.lineTo(cx + s * 0.1, cy + s * 0.55); ctx.closePath(); ctx.fill();
      if (los(ziarno + k * 11) < 0.35) { ctx.fillStyle = 'rgba(110,8,6,0.75)'; ctx.beginPath(); ctx.ellipse(cx + s * 0.2, cy - s * 0.4, s * 0.4, s * 0.25, 0.4, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}

/** Piszczele i żebra rozrzucone po posadzce. */
function kosciNaPosadzce(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ziarno: number): void {
  for (let i = 0; i < 3; i++) {
    const dl = s * (3 + los(ziarno + i) * 2.5), kat = (los(ziarno + i * 5) - 0.5) * 0.6;
    const px = x + (los(ziarno + i * 3) - 0.5) * s * 8;
    ctx.save(); ctx.translate(px, y - s * 0.25); ctx.rotate(kat);
    ctx.strokeStyle = TUSZ; ctx.lineWidth = s * 0.55 + 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-dl / 2, 0); ctx.lineTo(dl / 2, 0); ctx.stroke();
    ctx.strokeStyle = KOSC; ctx.lineWidth = s * 0.55;
    ctx.beginPath(); ctx.moveTo(-dl / 2, 0); ctx.lineTo(dl / 2, 0); ctx.stroke();
    ctx.restore();
  }
}

/** Krew i ciała w lochu — przed mrokiem (widać je tylko w świetle ognia). */
export function rysujPiekloLochu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number): void {
  const w = sim.world, z = cam.zoom, l = w.loch;
  if (l.x1 < l.x0) return;
  const L = LOCH.loch, podloga = l.y1 + 1;
  const xa = Math.max(l.x0, Math.floor(cam.toWorldX(0)) - 2), xb = Math.min(l.x1, Math.ceil(cam.toWorldX(cam.vw)) + 2);
  if (xb < xa || cam.toScreenY(podloga - L.nawa - 2) > cam.vh || cam.toScreenY(podloga + 1) < 0) return;
  const t = wolnoRuszac() ? czas / 1000 : 0;
  const yP = cam.toScreenY(podloga);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // krew spływa po murach spod sklepienia: zacieki, gęstsze przy dole, i zaschnięte smugi
  for (let x = xa; x <= xb; x++) {
    if (!widzianyKafel(sim, x, l.y1)) continue;
    const r = los(x * 7349 + 11);
    if (r > 0.42) continue;
    const sx = cam.toScreenX(x + los(x * 3)), y0 = cam.toScreenY(podloga - lukLochu(sim, x + 0.5) + 0.4);
    const dl = (yP - y0) * (0.25 + los(x * 13) * 0.75);
    const szer = Math.max(1, z * (0.06 + los(x * 17) * 0.14));
    const g = ctx.createLinearGradient(0, y0, 0, y0 + dl);
    g.addColorStop(0, 'rgba(70,6,4,0)'); g.addColorStop(0.15, 'rgba(80,6,4,0.7)'); g.addColorStop(1, 'rgba(60,4,3,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - szer, y0);
    ctx.bezierCurveTo(sx - szer * 0.6, y0 + dl * 0.4, sx - szer * 1.4, y0 + dl * 0.7, sx - szer * 0.5, y0 + dl);
    ctx.arc(sx, y0 + dl, szer * 0.55, Math.PI, 0, true);
    ctx.bezierCurveTo(sx + szer * 1.2, y0 + dl * 0.7, sx + szer * 0.5, y0 + dl * 0.4, sx + szer, y0);
    ctx.closePath(); ctx.fill();
    if (r < 0.12) {
      // szeroki, rozmazany odcisk dłoni i smuga — ktoś osuwał się po ścianie
      const hy = yP - z * (1.2 + los(x * 23) * 1.4);
      ctx.fillStyle = 'rgba(96,8,6,0.55)';
      ctx.beginPath(); ctx.ellipse(sx + z * 0.3, hy, z * 0.18, z * 0.24, 0.2, 0, Math.PI * 2); ctx.fill();
      for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.ellipse(sx + z * (0.18 + f * 0.09), hy - z * 0.3, z * 0.04, z * 0.12, 0.1, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(80,6,4,0.4)'; ctx.fillRect(sx + z * 0.15, hy, z * 0.3, yP - hy);
    }
  }
  // okopcone mury nad koszami ognia
  for (const k of koszeOgnia(sim)) {
    if (k.x < xa - 4 || k.x > xb + 4 || !widzianyKafel(sim, k.x, k.y)) continue;
    const sx = cam.toScreenX(k.x + 0.5), sy = cam.toScreenY(k.y - 1);
    const R = z * 4.5;
    const g = ctx.createRadialGradient(sx, sy - R * 0.5, 0, sx, sy - R * 0.5, R);
    g.addColorStop(0, 'rgba(6,4,3,0.55)'); g.addColorStop(1, 'rgba(6,4,3,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - R, sy - R * 1.5, R * 2, R * 2);
  }
  const h = Math.max(16, z * 1.9 * ustawienia.wielkoscSylwetek);
  // wisielcy w przęsłach bez łańcuchów (nieparzystych) — po dwóch, z dala od nawy
  for (let k = 0, x = l.x0 + L.przeslo / 2; x < l.x1; x += L.przeslo, k++) {
    if (Math.abs(x - w.coreX) < L.nawaSzer || k % 2 === 0) continue;
    for (const dx of [-2.2, 2.6]) {
      const wx = x + dx;
      if (wx < xa - 3 || wx > xb + 3 || !widzianyKafel(sim, Math.round(wx), l.y1)) continue;
      const ziarno = k * 7 + (dx > 0 ? 1 : 0);
      const sufit = cam.toScreenY(podloga - lukLochu(sim, wx));
      const dlLancucha = z * (1.6 + los(ziarno) * 1.8);
      const kol = wolnoRuszac() ? Math.sin(t * 0.8 + ziarno) * 0.06 : 0;
      const sx = cam.toScreenX(wx);
      // łańcuch od sklepienia do nadgarstków
      ctx.save();
      ctx.translate(sx, sufit); ctx.rotate(kol);
      const ogniwo = Math.max(2, z * 0.22);
      ctx.lineWidth = Math.max(1, z * 0.05);
      for (let n = 0; n * ogniwo < dlLancucha; n++) {
        ctx.strokeStyle = n % 2 ? 'rgba(70,72,76,0.95)' : 'rgba(52,54,58,0.95)';
        ctx.beginPath(); ctx.ellipse(0, n * ogniwo + ogniwo / 2, ogniwo * (n % 2 ? 0.12 : 0.32), ogniwo * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // ciało: dłonie (skute) na końcu łańcucha — biodro ok. 0,65 wzrostu niżej
      ctx.translate(0, dlLancucha + h * 0.66);
      if (los(ziarno * 3) < 0.5) ctx.scale(-1, 1);
      rysujLudzika(ctx, h, pozaWisielca(t, ziarno), t);
      ctx.restore();
      // kapie krew w kałużę pod nim
      const stopy = sufit + dlLancucha + h * 0.66 + h * 0.48;
      kaluzaKrwi(ctx, sx, yP - z * 0.05, h * (0.32 + los(ziarno * 5) * 0.2), 1, ziarno);
      if (wolnoRuszac()) {
        ctx.fillStyle = 'rgb(110,8,6)';
        for (let n = 0; n < 2; n++) {
          const f = ((t * 0.9 + los(ziarno + n * 7)) % 1);
          const py = stopy + (yP - stopy) * f * f;
          ctx.beginPath(); ctx.ellipse(sx + (n - 0.5) * z * 0.25, py, Math.max(1, z * 0.04), Math.max(1.5, z * 0.08), 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }
  // kopce czaszek pod murami (przy pilastrach) i kości na posadzce
  for (let x = l.x0; x <= l.x1 + 1; x += L.przeslo) {
    if (Math.abs(x - w.coreX) < L.nawaSzer - 1 || x < xa - 3 || x > xb + 3 || !widzianyKafel(sim, Math.min(l.x1, x), l.y1)) continue;
    const s = Math.max(1.5, z * 0.17);
    kopiecCzaszek(ctx, cam.toScreenX(x + 1.4), yP, s, 6 + Math.floor(los(x) * 5), x * 31);
    kosciNaPosadzce(ctx, cam.toScreenX(x - 3), yP, s * 0.8, x * 17);
  }
  // krwawe smugi na posadzce — tu wleczono ciała
  for (let x = xa; x <= xb; x += 3) {
    if (los(x * 977) > 0.45 || !widzianyKafel(sim, x, l.y1)) continue;
    const sx = cam.toScreenX(x), dl = z * (1.5 + los(x * 7) * 3.5);
    const g = ctx.createLinearGradient(sx, 0, sx + dl, 0);
    g.addColorStop(0, 'rgba(90,6,4,0.75)'); g.addColorStop(1, 'rgba(90,6,4,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(sx + dl / 2, yP - z * 0.04, dl / 2, Math.max(1, z * 0.08), 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Żar koszy ognia na murach, iskry i łuna z rozbitej pieczęci — nad mrokiem. */
export function rysujPiekloLochuNad(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number): void {
  const w = sim.world, z = cam.zoom, l = w.loch;
  if (l.x1 < l.x0) return;
  const t = wolnoRuszac() ? czas / 1000 : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const k of koszeOgnia(sim)) {
    if (!widzianyKafel(sim, k.x, k.y)) continue;
    const sx = cam.toScreenX(k.x + 0.5), sy = cam.toScreenY(k.y - 0.8);
    const R = z * 7.5;
    if (sx + R < 0 || sx - R > cam.vw || sy + R < 0 || sy - R > cam.vh) continue;
    const m = wolnoRuszac() ? migotLampy(czas + k.x * 17) : 0.5;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    g.addColorStop(0, `rgba(255,96,30,${0.3 + 0.08 * m})`);
    g.addColorStop(0.35, `rgba(190,40,14,${0.14 + 0.04 * m})`);
    g.addColorStop(1, 'rgba(120,20,8,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const k of koszeOgnia(sim)) {
    if (!widzianyKafel(sim, k.x, k.y)) continue;
    const sx = cam.toScreenX(k.x + 0.5), sy = cam.toScreenY(k.y - 0.9);
    iskry(ctx, sx - z * 1.2, sx + z * 1.2, sy - z * 6, sy, 10, t, k.x);
  }
  ctx.restore();
}
