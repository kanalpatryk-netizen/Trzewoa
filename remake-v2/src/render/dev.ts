/**
 * Rysunki trybu deweloperskiego: śledzona postać z jej drogą i celem, obrys kafla pod
 * kursorem, a na życzenie to, czego gracz nie widzi — Patrzący w każdej fazie (z celem
 * i punktem krążenia), gniazda kamiennych rycerzy i drogi wszystkich postaci.
 * Rysowane w układzie płyty, na wierzchu świata.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Creature } from '../sim/creatures';
import { DEV } from '../sim/dziennik';
import { gniazdaWSkale } from '../sim/lud';

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
  if (DEV.pokazUkryte) {
    // gniazda kamiennych rycerzy: zielone — śpią, szare — rozkopane
    for (const g of gniazdaWSkale(sim)) {
      const x = sx(g.x + 0.5), y = sy(g.y + 0.5);
      ctx.strokeStyle = g.odkryte ? 'rgba(150,150,150,0.6)' : 'rgba(120,230,140,0.85)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - z * 1.5, y - z, z * 3, z * 2);
      podpis(ctx, `gniazdo ${g.id}: ${g.rycerzy}${g.odkryte ? ' (rozkopane)' : ''}`, x, y - z * 1.3, g.odkryte ? '#aaa' : '#9fe0a8');
    }
    // Patrzący w każdej fazie, także gdy gracz go nie widzi
    const m = sim.lud.mrok;
    if (m) {
      const x = sx(m.x), y = sy(m.y);
      const kolor = m.faza === 'patrzy' ? '#ff6a50' : m.faza === 'podchodzi' ? '#ffb070' : '#c79bff';
      ctx.strokeStyle = kolor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(x, y, Math.max(10, z * 0.9), 0, Math.PI * 2); ctx.stroke();
      if (m.faza === 'krazy') {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(sx(m.kx), sy(m.ky)); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx(m.kx), sy(m.ky), 3, 0, Math.PI * 2); ctx.stroke();
      }
      const cel = m.cel !== null ? sim.creatures.find((c) => c.id === m.cel && !c.dead) : undefined;
      if (cel && (m.faza === 'podchodzi' || m.faza === 'patrzy')) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(sx(cel.x + 0.5), sy(cel.y)); ctx.stroke();
      }
      ctx.setLineDash([]);
      podpis(ctx, `Patrzący: ${m.faza}${cel ? ` → #${cel.id}` : ''}`, x, y - Math.max(14, z * 1.2), kolor);
    }
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
