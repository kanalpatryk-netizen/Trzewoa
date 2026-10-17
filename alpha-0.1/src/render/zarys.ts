import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { BARWA, rgba } from './palette';

/**
 * Zarys własnego ciała: linia powierzchni i krawędzie góry widoczne zawsze,
 * także tam, gdzie nikt nie był. Jesteś górą — swój kształt znasz.
 * Rdzeń też jest zawsze widoczny, bo to jedyny cel, jaki ta gra ma.
 */
export function rysujZarys(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world;
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const right = left + cam.vw / z, bottom = top + cam.vh / z;

  ctx.save();
  ctx.lineWidth = Math.max(1, z * 0.08);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.3);

  // linia powierzchni
  if (top < 40) {
    ctx.beginPath();
    const x0 = Math.max(0, Math.floor(left) - 1), x1 = Math.min(w.w - 1, Math.ceil(right) + 1);
    for (let x = x0; x <= x1; x++) {
      const px = (x - left) * z, py = (w.surface[x] - top) * z;
      if (x === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // boki i dno góry
  ctx.beginPath();
  if (left < 1) { ctx.moveTo((0 - left) * z, 0); ctx.lineTo((0 - left) * z, cam.vh); }
  if (right > w.w - 1) { ctx.moveTo((w.w - left) * z, 0); ctx.lineTo((w.w - left) * z, cam.vh); }
  if (bottom > w.h - 1) { ctx.moveTo(0, (w.h - top) * z); ctx.lineTo(cam.vw, (w.h - top) * z); }
  ctx.stroke();

  // rdzeń — widoczny zawsze, nawet w nieznanym
  const cx = (w.coreX + 0.5 - left) * z, cy = (w.coreY + 0.5 - top) * z;
  const puls = 0.55 + 0.45 * Math.sin(teraz * 0.0022);
  if (cx > -80 && cy > -80 && cx < cam.vw + 80 && cy < cam.vh + 80) {
    const r = Math.max(10, z * 1.6);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
    g.addColorStop(0, `rgba(190,40,36,${0.3 + puls * 0.25})`);
    g.addColorStop(1, 'rgba(190,40,36,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
    ctx.strokeStyle = `rgba(226,96,76,${0.5 + puls * 0.4})`;
    ctx.lineWidth = Math.max(1.4, z * 0.1);
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.9 + puls * 0.12), 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `italic ${Math.max(13, z * 0.8)}px "Trzewia Tekst", Georgia, serif`;
    ctx.fillStyle = `rgba(226,140,120,${0.55 + puls * 0.3})`;
    ctx.textAlign = 'center';
    ctx.fillText('rdzeń', cx, cy - r * 1.5);
  }
  ctx.restore();
}
