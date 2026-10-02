import { REMAKE } from '../nastawy/lud';
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { RACES } from '../sim/races';
import { cechaNacji } from '../sim/cechy';
import { BARWA, rgba } from './palette';
import { SERIF } from './ink';

export interface Cel { x: number; y: number; r: number; tekst?: string; }

/**
 * Nazwy nacji przy gniazdach. Bez nich plansza jest mrowiskiem bez imion —
 * a cała gra polega na tym, żeby wiedzieć, kto jest kim.
 */
export function etykietyKolonii(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, cel?: Cel | null): void {
  if (cam.zoom < 4) return;
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const rozmiar = Math.max(14, Math.min(20, z * 1.1));
  ctx.save();
  ctx.font = `${rozmiar}px ${SERIF}`;
  ctx.textAlign = 'left';

  for (const klan of sim.clans) {
    if (klan.dead || klan.pop <= 0) continue;
    const i = sim.world.idx(klan.hx, klan.hy);
    if (!sim.world.ever[i]) continue;                    // nieznanego gniazda nie podpisujemy
    // celownik ma własny podpis; dwa imiona w jednym pierścieniu to jeden za dużo
    if (cel && Math.hypot(klan.hx - cel.x, klan.hy - cel.y) < cel.r + 2) continue;
    const sx = (klan.hx - left) * z;
    const sy = (klan.hy - top) * z;
    if (sx < -60 || sy < -40 || sx > cam.vw + 60 || sy > cam.vh + 40) continue;

    const barwa = RACES[klan.race].color;
    const cecha = cechaNacji(klan).nazwa;
    // Remake v1: jeden lud — podpis mówi, że to siedziba i ile jest w spiżarni
    const tekst = REMAKE ? `siedziba · ${klan.pop} dusz · spiżarnia ${klan.stock}` : `${klan.name} · ${klan.pop}${cecha ? ` · ${cecha}` : ''}`;
    const szer = ctx.measureText(tekst).width;
    const lx = sx + 14, ly = sy - 18 - Math.sin(teraz * 0.001 + klan.id) * 2;

    // linia odniesienia jak w atlasie: od gniazda do podpisu
    ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(lx - 6, ly + 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(12,8,7,0.88)';
    ctx.fillRect(lx - 6, ly - rozmiar, szer + 12, rozmiar * 1.5);
    ctx.strokeStyle = rgba(BARWA.atrament, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(lx - 6, ly - rozmiar, szer + 12, rozmiar * 1.5);
    ctx.fillStyle = `rgba(${barwa[0]},${barwa[1]},${barwa[2]},0.95)`;
    ctx.fillText(tekst, lx, ly + rozmiar * 0.15);

    // znak gniazda
    ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.7);
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(3, z * 0.25), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Podświetlenie celu: pierścień, podpis i strzałka na krawędzi, gdy cel jest poza kadrem.
 * To jest jedyny element interfejsu, który wprost mówi „patrz tutaj".
 */
export function podswietlCel(ctx: CanvasRenderingContext2D, cam: Camera, cel: Cel, teraz: number): void {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const sx = (cel.x - left) * z, sy = (cel.y - top) * z;
  const puls = 0.6 + 0.4 * Math.sin(teraz * 0.004);
  const r = Math.max(22, cel.r * z);

  const wKadrze = sx > 0 && sy > 0 && sx < cam.vw && sy < cam.vh;
  ctx.save();
  if (wKadrze) {
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.45 + 0.35 * puls);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, r * (0.9 + 0.12 * puls), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.25);
    ctx.beginPath();
    ctx.arc(sx, sy, r * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    // cztery nacięcia celownika
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * r * 1.35, sy + Math.sin(a) * r * 1.35);
      ctx.lineTo(sx + Math.cos(a) * r * 1.7, sy + Math.sin(a) * r * 1.7);
      ctx.stroke();
    }
    if (cel.tekst) {
      ctx.font = `italic ${Math.max(14, cam.vw / 64)}px ${SERIF}`;
      ctx.textAlign = 'center';
      const szer = ctx.measureText(cel.tekst).width;
      ctx.fillStyle = 'rgba(10,7,6,0.8)';
      ctx.fillRect(sx - szer / 2 - 8, sy - r * 1.9 - 18, szer + 16, 24);
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
      ctx.fillText(cel.tekst, sx, sy - r * 1.9);
    }
  } else {
    // strzałka przy krawędzi z podpisem — sama strzałka nie mówi, dokąd prowadzi
    const cx = cam.vw / 2, cy = cam.vh / 2;
    const kat = Math.atan2(sy - cy, sx - cx);
    const px = cx + Math.cos(kat) * (cam.vw / 2 - 52);
    const py = cy + Math.sin(kat) * (cam.vh / 2 - 52);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(kat);
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.6 + 0.35 * puls);
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(-11, -10); ctx.lineTo(-4, 0); ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (cel.tekst) {
      ctx.font = `italic ${Math.max(14, cam.vw / 74)}px ${SERIF}`;
      ctx.textAlign = 'center';
      const szer = ctx.measureText(cel.tekst).width;
      const tx = Math.max(szer / 2 + 8, Math.min(cam.vw - szer / 2 - 8, px));
      const ty = Math.max(24, Math.min(cam.vh - 12, py + (Math.sin(kat) > 0 ? -18 : 24)));
      ctx.fillStyle = 'rgba(10,7,6,0.8)';
      ctx.fillRect(tx - szer / 2 - 7, ty - 15, szer + 14, 21);
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
      ctx.fillText(cel.tekst, tx, ty);
    }
  }
  ctx.restore();
}
