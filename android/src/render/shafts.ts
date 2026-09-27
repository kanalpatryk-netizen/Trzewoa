import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { PASSABLE } from '../sim/tiles';
import { MEM_SPAN } from '../sim/world';

/**
 * Smugi światła z powierzchni. Wpadają tylko tam, gdzie ktoś przebił się do nieba —
 * więc pokazują graczowi, którędy przyjdą ludzie.
 */
export function smugiSwiatla(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number): void {
  const w = sim.world;
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z;
  const right = left + cam.vw / z;
  const top = cam.y - cam.vh / 2 / z;
  if (top > 70) return;                       // głęboko pod ziemią nie ma czego wpuszczać

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const x0 = Math.max(1, Math.floor(left) - 2);
  const x1 = Math.min(w.w - 2, Math.ceil(right) + 2);

  for (let x = x0; x <= x1; x++) {
    const sh = w.surface[x];
    if (PASSABLE[w.tile[w.idx(x, sh + 1)]] !== 1) continue;      // strop zamknięty
    // jak głęboko sięga szyb
    // smuga kończy się tam, gdzie kończy się pamięć — światło nie oświetla Otchłani
    let g = sh + 1;
    while (g < w.h - 1 && g < sh + 60) {
      const i = w.idx(x, g);
      if (PASSABLE[w.tile[i]] !== 1) break;
      if (!w.ever[i] || sim.tick - w.lastSeen[i] > MEM_SPAN * 0.6) break;
      g++;
    }
    const dl = g - sh;
    if (dl < 4) continue;

    const sx = (x + 0.5 - left) * z;
    const sy = (sh - top) * z;
    const sdl = dl * z;
    const drganie = Math.sin(czas * 0.0004 + x) * z * 0.3;
    const grad = ctx.createLinearGradient(sx, sy, sx + drganie, sy + sdl);
    grad.addColorStop(0, 'rgba(236,214,170,0.13)');
    grad.addColorStop(0.55, 'rgba(228,196,150,0.05)');
    grad.addColorStop(1, 'rgba(228,196,150,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx - z * 0.7, sy);
    ctx.lineTo(sx + z * 0.7, sy);
    ctx.lineTo(sx + drganie + z * 2.4, sy + sdl);
    ctx.lineTo(sx + drganie - z * 2.4, sy + sdl);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
