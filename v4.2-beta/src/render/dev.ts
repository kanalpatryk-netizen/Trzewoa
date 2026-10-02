/**
 * Rysunki trybu deweloperskiego (v4 beta): śledzona postać z jej drogą i celem
 * oraz obrys kafla pod kursorem. Rysowane w układzie płyty, na wierzchu świata.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { DEV } from '../sim/dziennik';

export function rysujDev(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const z = cam.zoom;
  const sx = (x: number) => cam.toScreenX(x), sy = (y: number) => cam.toScreenY(y);
  ctx.save();
  // kafel pod kursorem
  if (DEV.kursor) {
    ctx.strokeStyle = 'rgba(120,220,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx(DEV.kursor.x), sy(DEV.kursor.y), z, z);
  }
  const c = DEV.sledzony >= 0 ? sim.creatures.find((q) => q.id === DEV.sledzony && !q.dead) : undefined;
  if (c) {
    const w = sim.world.w;
    // droga: od miejsca, w którym jest, do końca
    if (c.droga && c.droga.length) {
      ctx.strokeStyle = 'rgba(255,220,90,0.85)';
      ctx.lineWidth = Math.max(1.5, z * 0.18);
      ctx.setLineDash([z * 0.5, z * 0.35]);
      ctx.beginPath();
      ctx.moveTo(sx(c.x), sy(c.y - 0.5));
      for (let i = c.drogaI ?? 0; i < c.droga.length; i++) {
        const k = c.droga[i];
        ctx.lineTo(sx((k % w) + 0.5), sy(((k / w) | 0) + 0.5));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // cel zajęcia
    ctx.strokeStyle = 'rgba(255,120,90,0.9)';
    ctx.lineWidth = 1.5;
    const tx = sx(c.jx + 0.5), ty = sy(c.jy + 0.5);
    ctx.beginPath(); ctx.moveTo(tx - z * 0.6, ty - z * 0.6); ctx.lineTo(tx + z * 0.6, ty + z * 0.6);
    ctx.moveTo(tx + z * 0.6, ty - z * 0.6); ctx.lineTo(tx - z * 0.6, ty + z * 0.6); ctx.stroke();
    // pierścień wokół postaci
    const puls = 1 + 0.15 * Math.sin(teraz * 0.008);
    ctx.strokeStyle = 'rgba(255,220,90,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx(c.x), sy(c.y - 0.6), Math.max(8, z * 1.3) * puls, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
