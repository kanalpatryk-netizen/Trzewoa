import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Plate } from './plate';
import { RACES } from '../sim/races';
import { BARWA, rgba } from './palette';
import { SERIF } from './ink';

export interface ObszarMinimapy { x: number; y: number; w: number; h: number; }

/** Gdzie na ekranie leży pasek mapy — potrzebne i do rysowania, i do kliknięcia. */
export function obszarMinimapy(p: Plate): ObszarMinimapy {
  const szer = Math.max(34, Math.min(78, p.right + 34));
  return { x: p.x + p.w + 12, y: p.y + 6, w: szer, h: p.h - 12 };
}

/**
 * Pasek mapy: cała góra w miniaturze, kropki nacji, rdzeń i ramka aktualnego widoku.
 * Bez niego po dwóch przeciągnięciach nie wiadomo, gdzie się jest.
 */
export function rysujMinimape(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, p: Plate, teraz: number): void {
  const o = obszarMinimapy(p);
  const w = sim.world;
  const sx = o.w / w.w, sy = o.h / w.h;

  ctx.save();
  ctx.fillStyle = 'rgba(10,7,6,0.88)';
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.4);
  ctx.lineWidth = 1;
  ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);

  // zarys góry — znasz swój kształt, nawet jeśli nie pamiętasz wnętrza
  ctx.beginPath();
  ctx.moveTo(o.x, o.y + w.surface[0] * sy);
  for (let x = 0; x < w.w; x += 2) ctx.lineTo(o.x + x * sx, o.y + w.surface[x] * sy);
  ctx.lineTo(o.x + o.w, o.y + o.h);
  ctx.lineTo(o.x, o.y + o.h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(38,28,24,0.85)';
  ctx.fill();
  ctx.strokeStyle = rgba(BARWA.atrament, 0.55);
  ctx.stroke();

  // to, co pamiętane — jaśniejsze plamy; próbkujemy rzadko, bo to tylko podgląd
  ctx.fillStyle = rgba(BARWA.atrament, 0.3);
  const krok = 3;
  for (let y = 0; y < w.h; y += krok) {
    for (let x = 0; x < w.w; x += krok) {
      const i = w.idx(x, y);
      if (!w.ever[i]) continue;
      const swieze = sim.tick - w.lastSeen[i] < 9000;
      if (!swieze) continue;
      ctx.fillRect(o.x + x * sx, o.y + y * sy, Math.max(1, krok * sx), Math.max(1, krok * sy));
    }
  }

  // gniazda nacji
  for (const k of sim.clans) {
    if (k.dead || k.pop <= 0) continue;
    // wiesz tylko to, co wiedzą twoi mieszkańcy — nacji w nieznanym nie widać
    const i = w.idx(k.hx, k.hy);
    if (!w.ever[i] || sim.tick - w.lastSeen[i] > 9000) continue;
    const c = RACES[k.race].color;
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.95)`;
    ctx.beginPath();
    ctx.arc(o.x + k.hx * sx, o.y + k.hy * sy, Math.max(1.6, Math.min(3.4, 1 + k.pop * 0.05)), 0, Math.PI * 2);
    ctx.fill();
  }

  // rdzeń — jedyny wyjątek: swój własny rdzeń znasz bez niczyjej pomocy
  const puls = 0.6 + 0.4 * Math.sin(teraz * 0.003);
  ctx.fillStyle = `rgba(190,40,36,${0.6 + puls * 0.4})`;
  ctx.beginPath();
  ctx.arc(o.x + w.coreX * sx, o.y + w.coreY * sy, 3 + puls * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(230,120,96,${0.5 + puls * 0.3})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(o.x + w.coreX * sx, o.y + w.coreY * sy, 6 + puls * 2, 0, Math.PI * 2);
  ctx.stroke();

  // ramka aktualnego widoku
  const vx = (cam.x - cam.vw / 2 / cam.zoom) * sx, vy = (cam.y - cam.vh / 2 / cam.zoom) * sy;
  const vw = (cam.vw / cam.zoom) * sx, vh = (cam.vh / cam.zoom) * sy;
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(o.x + Math.max(0, vx), o.y + Math.max(0, vy), Math.min(vw, o.w), Math.min(vh, o.h));

  ctx.font = `${Math.max(12, o.w * 0.17)}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.atramentCichy, 0.6);
  ctx.textAlign = 'center';
  ctx.fillText('rdzeń', o.x + o.w / 2, o.y + o.h - 4);
  ctx.restore();
}

/** Zamienia kliknięcie w pasek na miejsce w świecie. */
export function miejsceZMinimapy(sim: Sim, p: Plate, x: number, y: number): [number, number] | null {
  const o = obszarMinimapy(p);
  if (x < o.x || x > o.x + o.w || y < o.y || y > o.y + o.h) return null;
  const w = sim.world;
  return [((x - o.x) / o.w) * w.w, ((y - o.y) / o.h) * w.h];
}
