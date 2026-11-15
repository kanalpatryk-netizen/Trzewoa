/**
 * Rysunki trybu deweloperskiego: śledzona postać z jej drogą i celem, obrys kafla pod
 * kursorem, a na życzenie gniazda kamiennych rycerzy i drogi wszystkich postaci.
 * Rysowane w układzie płyty, na wierzchu świata.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Creature } from '../sim/creatures';
import { DEV } from '../sim/dziennik';

const MONO = '11px ui-monospace,Consolas,monospace';

function droga(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, c: Creature): void {
  if (!c.droga || !c.droga.length) return;
  const w = sim.world.w;
  ctx.beginPath();
  ctx.moveTo(cam.toScreenX(c.x), cam.toScreenY(c.y - 0.5));
  for (let i = c.drogaI ?? 0; i < c.droga.length; i++) {
    const k = c.droga[i];
    ctx.lineTo(cam.toScreenX((k % w) + 0.5), cam.toScreenY(((k / w) | 0) + 0.5));
  }
  ctx.stroke();
}

function podpis(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, kolor: string): void {
  ctx.font = MONO;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(tekst, x, y);
  ctx.fillStyle = kolor;
  ctx.fillText(tekst, x, y);
}

export function rysujDev(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const z = cam.zoom;
  const sx = (x: number) => cam.toScreenX(x), sy = (y: number) => cam.toScreenY(y);
  ctx.save();
  // drogi wszystkich (cienko), zanim dojdzie gruba droga śledzonego
  if (DEV.pokazDrogi) {
    ctx.strokeStyle = 'rgba(160,220,255,0.35)';
    ctx.lineWidth = 1;
    for (const c of sim.creatures) if (!c.dead && c.id !== DEV.sledzony) droga(ctx, sim, cam, c);
  }
  // kafel pod kursorem
  if (DEV.kursor) {
    ctx.strokeStyle = 'rgba(120,220,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx(DEV.kursor.x), sy(DEV.kursor.y), z, z);
  }
  const c = DEV.sledzony >= 0 ? sim.creatures.find((q) => q.id === DEV.sledzony && !q.dead) : undefined;
  if (c) {
    // droga: od miejsca, w którym jest, do końca
    ctx.strokeStyle = 'rgba(255,220,90,0.85)';
    ctx.lineWidth = Math.max(1.5, z * 0.18);
    ctx.setLineDash([z * 0.5, z * 0.35]);
    droga(ctx, sim, cam, c);
    ctx.setLineDash([]);
    // cel zajęcia
    ctx.strokeStyle = 'rgba(255,120,90,0.9)';
    ctx.lineWidth = 1.5;
    const tx = sx(c.jx + 0.5), ty = sy(c.jy + 0.5);
    ctx.beginPath(); ctx.moveTo(tx - z * 0.6, ty - z * 0.6); ctx.lineTo(tx + z * 0.6, ty + z * 0.6);
    ctx.moveTo(tx + z * 0.6, ty - z * 0.6); ctx.lineTo(tx - z * 0.6, ty + z * 0.6); ctx.stroke();
    // pierścień wokół postaci i jej numer
    const puls = 1 + 0.15 * Math.sin(teraz * 0.008);
    ctx.strokeStyle = 'rgba(255,220,90,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx(c.x), sy(c.y - 0.6), Math.max(8, z * 1.3) * puls, 0, Math.PI * 2);
    ctx.stroke();
    podpis(ctx, `#${c.id}`, sx(c.x), sy(c.y - 0.6) - Math.max(10, z * 1.5), '#ffdc5a');
  }
  ctx.restore();
}
