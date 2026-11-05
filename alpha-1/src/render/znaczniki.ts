import type { Camera } from './camera';
import { BARWA, rgba } from './palette';

export interface Cel { x: number; y: number; r: number; tekst?: string; klan?: number; }

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

/** Od kiedy wisi ten sam cel (tekst i miejsce) — podpowiedź odświeża się co kilka sekund nowym obiektem. */
const wiekCelu = { klucz: '', od: 0 };

export function podswietlCel(ctx: CanvasRenderingContext2D, cam: Camera, cel: Cel, teraz: number): void {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const sx = (cel.x - left) * z, sy = (cel.y - top) * z;
  const klucz = `${cel.tekst ?? ''}|${Math.round(cel.x)}|${Math.round(cel.y)}`;
  if (klucz !== wiekCelu.klucz) { wiekCelu.klucz = klucz; wiekCelu.od = teraz; }
  // świeży cel woła, a po kilku sekundach przygasa — rytuał trwa minutami i pierścień nad kryptą wisiał jak znacznik debugowy
  const wiek = (teraz - wiekCelu.od) / 1000;
  const glos = wiek < 6 ? 1 : Math.max(0.4, 1 - (wiek - 6) * 0.2);
  const puls = (0.6 + 0.4 * Math.sin(teraz * 0.004)) * glos;
  // pierścień nie większy niż kawałek kadru — dawniej dwa wielkie okręgi z nacięciami zasłaniały scenę
  const r = Math.min(Math.max(18, cel.r * z), Math.min(cam.vw, cam.vh) * 0.11);

  const wKadrze = sx > 0 && sy > 0 && sx < cam.vw && sy < cam.vh;
  ctx.save();
  if (wKadrze) {
    // jeden cienki, oddychający pierścień i delikatna poświata pod nim
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.12 * glos + 0.08 * puls);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(sx, sy, r * (0.94 + 0.08 * puls), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.3 * glos + 0.25 * puls);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(sx, sy, r * (0.94 + 0.08 * puls), 0, Math.PI * 2);
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
