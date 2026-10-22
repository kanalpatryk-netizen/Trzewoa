/**
 * Remake v1: znaczniki ludu na mapie — stara spiżarnia po przenosinach siedziby
 * i obozy odciętych grupek (Alpha 0.2: bez podpisów — sam namiot).
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';

export function rysujZnacznikiLudu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const z = cam.zoom;
  const sx = (x: number) => cam.toScreenX(x), sy = (y: number) => cam.toScreenY(y);
  ctx.save();
  // obozy
  for (const o of sim.lud.spizarnie) {
    const x = sx(o.x + 0.5), y = sy(o.y + 1);
    const r = Math.max(7, z * 0.9);
    // namiot: wypełniony trójkąt z ciemnym wejściem — widać go na każdym przybliżeniu
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y - r * 1.3); ctx.lineTo(x + r, y); ctx.closePath();
    ctx.fillStyle = 'rgba(150,104,60,0.88)'; ctx.fill();
    ctx.strokeStyle = 'rgba(240,214,164,0.98)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(12,8,7,0.95)';
    ctx.beginPath(); ctx.moveTo(x - r * 0.25, y); ctx.lineTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.25, y); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
