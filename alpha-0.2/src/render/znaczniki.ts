import type { Camera } from './camera';
import { BARWA, rgba } from './palette';

export interface Cel { x: number; y: number; r: number; tekst?: string; }

/**
 * Podświetlenie celu: pierścień i strzałka na krawędzi, gdy cel jest poza kadrem.
 * To jest jedyny element interfejsu, który wprost mówi „patrz tutaj".
 */
/**
 * Strzałka przy krawędzi płyty, gdy cel jest poza kadrem (współrzędne płyty), albo null, gdy cel widać.
 * Rysunek (podswietlCel) i dotyk (ekran gry: dotknięcie strzałki wiezie tam kamerę) liczą ją tak samo.
 */
export function strzalkaCelu(cam: Camera, cel: Cel): { x: number; y: number; kat: number } | null {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const sx = (cel.x - left) * z, sy = (cel.y - top) * z;
  if (sx > 0 && sy > 0 && sx < cam.vw && sy < cam.vh) return null;
  const cx = cam.vw / 2, cy = cam.vh / 2;
  const kat = Math.atan2(sy - cy, sx - cx);
  return { x: cx + Math.cos(kat) * (cam.vw / 2 - 52), y: cy + Math.sin(kat) * (cam.vh / 2 - 52), kat };
}

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
  } else {
    // strzałka przy krawędzi
    const s = strzalkaCelu(cam, cel);
    if (!s) { ctx.restore(); return; }
    const { x: px, y: py, kat } = s;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(kat);
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.6 + 0.35 * puls);
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(-11, -10); ctx.lineTo(-4, 0); ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
