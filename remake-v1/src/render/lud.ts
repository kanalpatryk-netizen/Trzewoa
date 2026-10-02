/**
 * Remake v1: znaczniki ludu na mapie — stara spiżarnia po przenosinach siedziby
 * i obozy odciętych grupek. Rysowane w układzie płyty, nad światem.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { SERIF } from './ink';

export function rysujZnacznikiLudu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const z = cam.zoom;
  const sx = (x: number) => cam.toScreenX(x), sy = (y: number) => cam.toScreenY(y);
  ctx.save();
  ctx.font = `italic ${Math.max(12, Math.min(16, z))}px ${SERIF}`;
  ctx.textAlign = 'center';
  const sklad = sim.lud.sklad;
  if (sklad && sklad.ilosc > 0) {
    const x = sx(sklad.x + 0.5), y = sy(sklad.y + 0.5);
    ctx.strokeStyle = 'rgba(170,200,130,0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - z * 0.6, y - z * 0.6, z * 1.2, z * 1.2);
    ctx.fillStyle = 'rgba(190,214,150,0.95)';
    ctx.fillText(`stara spiżarnia · ${sklad.ilosc}`, x, y - z * 0.9);
  }
  for (const o of sim.lud.obozy) {
    const x = sx(o.x), y = sy(o.y);
    // namiot: trójkąt z wejściem
    ctx.strokeStyle = 'rgba(226,196,140,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - z * 0.8, y + z * 0.2); ctx.lineTo(x, y - z * 0.9); ctx.lineTo(x + z * 0.8, y + z * 0.2); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(236,214,170,0.95)';
    ctx.fillText(`obóz · ${o.ilu}`, x, y - z * 1.2);
  }
  ctx.restore();
}
