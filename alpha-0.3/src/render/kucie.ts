import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { PASSABLE } from '../sim/tiles';

/**
 * Alpha, etap 3: skała pęka pod kilofem. Kafel napoczęty (world.kucie, 0..1) dostaje rysy, które rosną
 * od krawędzi ku środkowi razem z postępem; pod koniec odpryskują z niego okruchy, a tuż przed pęknięciem
 * kafel drży. Wzór rys jest stały dla kafla — nie skacze z klatki na klatkę.
 */

/** Tani skrót liczby: stały wzór rys dla kafla. */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function rysujKucie(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world;
  if (!w.kucie.size) return;
  const z = cam.zoom;
  const stare: number[] = [];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [i, f] of w.kucie) {
    // kafel zmienił się bokiem (osypał, otwarty rytuałem) — wpis już nic nie znaczy
    if (PASSABLE[w.tile[i]] === 1) { stare.push(i); continue; }
    const x = i % w.w, y = (i / w.w) | 0;
    let sx = cam.toScreenX(x), sy = cam.toScreenY(y);
    if (sx < -z || sy < -z || sx > cam.vw + z || sy > cam.vh + z) continue;
    // tuż przed pęknięciem kafel drży
    if (f > 0.82) { sx += Math.sin(teraz * 0.09 + i) * z * 0.035; sy += Math.cos(teraz * 0.11 + i) * z * 0.03; }
    const rys = 3 + Math.floor(los(i) * 3);
    ctx.lineWidth = Math.max(1, z * 0.07);
    for (let k = 0; k < rys; k++) {
      // rysa startuje z krawędzi kafla i biegnie łamaną ku środkowi; im dalej w kuciu, tym dłuższa
      const a = los(i * 7 + k * 13);
      const kraw = Math.floor(a * 4);
      const t0 = 0.15 + los(i * 3 + k) * 0.7;
      const px = kraw === 0 ? t0 : kraw === 1 ? 1 : kraw === 2 ? t0 : 0;
      const py = kraw === 0 ? 0 : kraw === 1 ? t0 : kraw === 2 ? 1 : t0;
      const dlugosc = Math.min(1, f * (1.15 + los(i + k * 31) * 0.4));
      const kroki = 3;
      const pkt: number[] = [sx + px * z, sy + py * z];
      for (let s = 1; s <= kroki; s++) {
        if (s / kroki > dlugosc + 0.001) break;
        const ku = 0.5 + (los(i * 11 + k * 5 + s) - 0.5) * 0.5;
        const nx = px + (ku - px) * (s / kroki) + (los(i + k * 17 + s * 3) - 0.5) * 0.3;
        const ny = py + (0.5 + (los(i * 5 + k + s * 7) - 0.5) * 0.5 - py) * (s / kroki) + (los(i * 13 + s + k) - 0.5) * 0.3;
        pkt.push(sx + nx * z, sy + ny * z);
      }
      if (pkt.length < 4) continue;
      // rysa wyryta w kamieniu: jasny brzeg tuż pod nią, na nim ciemna szczelina
      const lamana = (dy: number): void => {
        ctx.beginPath();
        ctx.moveTo(pkt[0], pkt[1] + dy);
        for (let p = 2; p < pkt.length; p += 2) ctx.lineTo(pkt[p], pkt[p + 1] + dy);
        ctx.stroke();
      };
      ctx.strokeStyle = 'rgba(225,205,165,0.22)';
      lamana(Math.max(1, z * 0.05));
      ctx.strokeStyle = 'rgba(14,10,8,0.9)';
      lamana(0);
    }
    // okruchy odpryskują z napoczętego kafla
    if (f > 0.45) {
      const n = Math.floor((f - 0.45) * 8);
      ctx.fillStyle = 'rgba(18,13,10,0.75)';
      for (let k = 0; k < n; k++) {
        const ox = 0.15 + los(i * 19 + k) * 0.7, oy = 0.15 + los(i * 23 + k) * 0.7;
        const r = z * (0.05 + los(i + k * 29) * 0.06);
        ctx.beginPath();
        ctx.moveTo(sx + ox * z, sy + oy * z - r);
        ctx.lineTo(sx + ox * z + r, sy + oy * z + r * 0.6);
        ctx.lineTo(sx + ox * z - r * 0.8, sy + oy * z + r * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.restore();
  for (const i of stare) w.kucie.delete(i);
}
