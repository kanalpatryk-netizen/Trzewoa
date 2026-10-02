/**
 * Remake v1: znaczniki ludu na mapie — stara spiżarnia po przenosinach siedziby
 * i obozy odciętych grupek. Podpisy w ramce, jak nazwa siedziby: cienkie kreski
 * bez tła ginęły w rycinie skały.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { SERIF } from './ink';

/** Podpis w ciemnej ramce z kreską odniesienia do miejsca (sx, sy). */
function podpis(ctx: CanvasRenderingContext2D, tekst: string, sx: number, sy: number, barwa: string, rozmiar: number): void {
  const szer = ctx.measureText(tekst).width;
  const lx = sx + 12, ly = sy - rozmiar * 1.4;
  ctx.strokeStyle = barwa; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lx - 6, ly + 4); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(12,8,7,0.9)';
  ctx.fillRect(lx - 6, ly - rozmiar, szer + 12, rozmiar * 1.5);
  ctx.strokeStyle = barwa; ctx.globalAlpha = 0.55;
  ctx.strokeRect(lx - 6 + 0.5, ly - rozmiar + 0.5, szer + 11, rozmiar * 1.5 - 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = barwa;
  ctx.fillText(tekst, lx, ly + rozmiar * 0.15);
}

export function rysujZnacznikiLudu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const z = cam.zoom;
  const sx = (x: number) => cam.toScreenX(x), sy = (y: number) => cam.toScreenY(y);
  const rozmiar = Math.max(13, Math.min(18, z * 1.05));
  ctx.save();
  ctx.font = `italic ${rozmiar}px ${SERIF}`;
  ctx.textAlign = 'left';
  // obozy ze spiżarniami (siedziba ma swój podpis przy gnieździe)
  for (const o of sim.lud.spizarnie) {
    const x = sx(o.x + 0.5), y = sy(o.y + 1);
    const r = Math.max(7, z * 0.9);
    // namiot: wypełniony trójkąt z ciemnym wejściem — widać go na każdym przybliżeniu
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y - r * 1.3); ctx.lineTo(x + r, y); ctx.closePath();
    ctx.fillStyle = 'rgba(150,104,60,0.88)'; ctx.fill();
    ctx.strokeStyle = 'rgba(240,214,164,0.98)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(12,8,7,0.95)';
    ctx.beginPath(); ctx.moveTo(x - r * 0.25, y); ctx.lineTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.25, y); ctx.closePath(); ctx.fill();
    const barwa = o.ilosc > 0 ? 'rgba(240,214,164,0.98)' : 'rgba(226,150,120,0.95)';
    podpis(ctx, `obóz · spiżarnia ${o.ilosc}`, x, y - r * 1.3, barwa, rozmiar);
  }
  ctx.restore();
}
