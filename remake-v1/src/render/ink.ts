import { BARWA, rgba } from './palette';

import { KROJ, KROJ_TYTUL } from './fonts';
import { scianaKrypty, tablica } from './fresk';

export const SERIF = KROJ;
export const SERIF_TYTUL = KROJ_TYTUL;

/** Kreskowanie jako wzór — te same ukośne linie, co w skale. */
const wzory = new Map<string, CanvasPattern>();
export function wzorKreski(ctx: CanvasRenderingContext2D, kolor: string, odstep = 5, grubosc = 1): CanvasPattern | string {
  const klucz = `${kolor}|${odstep}|${grubosc}`;
  const gotowy = wzory.get(klucz);
  if (gotowy) return gotowy;
  const c = document.createElement('canvas');
  c.width = odstep; c.height = odstep;
  const g = c.getContext('2d')!;
  g.strokeStyle = kolor;
  g.lineWidth = grubosc;
  g.beginPath();
  g.moveTo(-1, odstep); g.lineTo(odstep, -1);
  g.moveTo(1, odstep + 1); g.lineTo(odstep + 1, 1);
  g.stroke();
  const p = ctx.createPattern(c, 'repeat');
  if (p) wzory.set(klucz, p);
  return p ?? kolor;
}

/** Linia rysowana drżącą ręką — nic w tej grze nie jest idealnie proste. */
export function kreska(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, amp = 1.2, krok = 14): void {
  const dx = x2 - x1, dy = y2 - y1;
  const dl = Math.hypot(dx, dy);
  const n = Math.max(2, Math.round(dl / krok));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const nx = -dy / dl, ny = dx / dl;
    const drgnienie = (Math.sin(t * 9.1 + x1 * 0.05) + Math.sin(t * 21.7 + y1 * 0.07)) * 0.5 * amp;
    const px = x1 + dx * t + nx * drgnienie;
    const py = y1 + dy * t + ny * drgnienie;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

/** Tło ekranów poza grą: ściana krypty — ciemny tynk w świetle lampki, ciemność w kątach oddycha. */
export function tloSadzy(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  scianaKrypty(ctx, w, h, t, 0.5 + 0.5 * Math.sin(t * 0.0006));
}

/** Ryty tytuł: rowek cienia, potem światło na krawędzi liter. */
export function tytulRyty(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, rozmiar: number, alfa = 1): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `600 ${rozmiar}px ${SERIF_TYTUL}`;
  ctx.fillStyle = rgba('#000000', 0.8 * alfa);
  ctx.fillText(tekst, x + rozmiar * 0.02, y + rozmiar * 0.035);
  ctx.fillStyle = rgba(BARWA.atramentMocny, alfa);
  ctx.fillText(tekst, x, y);
  ctx.restore();
}

/** Podkreślenie w stylu nacięcia rylcem. */
export function naciecie(ctx: CanvasRenderingContext2D, x: number, y: number, szer: number, alfa = 0.6): void {
  ctx.save();
  ctx.strokeStyle = rgba(BARWA.atrament, alfa);
  ctx.lineWidth = 1;
  kreska(ctx, x - szer / 2, y, x + szer / 2, y, 0.8, 18);
  ctx.restore();
}

/** Panel: tablica ciemnego tynku z malowanym brzegiem — karta wsunięta w ścianę krypty, nie okno dialogowe. */
export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alfa = 0.94): void {
  tablica(ctx, x, y, w, h, false, Math.min(1, alfa + 0.06));
}

/** Tekst łamany na akapit o zadanej szerokości. Zwraca liczbę linii. */
export function akapit(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, maxW: number, lh: number, wyrownanie: CanvasTextAlign = 'left'): number {
  const slowa = tekst.split(' ');
  let linia = '';
  let yy = y;
  let n = 0;
  ctx.textAlign = wyrownanie;
  for (const s of slowa) {
    const test = linia ? `${linia} ${s}` : s;
    if (ctx.measureText(test).width > maxW && linia) {
      ctx.fillText(linia, x, yy);
      linia = s; yy += lh; n++;
    } else linia = test;
  }
  if (linia) { ctx.fillText(linia, x, yy); n++; }
  return n;
}

/** Ile linii zajmie akapit — do policzenia wysokości przed rysowaniem. */
export function linieAkapitu(ctx: CanvasRenderingContext2D, tekst: string, maxW: number): number {
  const slowa = tekst.split(' ');
  let linia = '';
  let n = 0;
  for (const s of slowa) {
    const test = linia ? `${linia} ${s}` : s;
    if (ctx.measureText(test).width > maxW && linia) { linia = s; n++; }
    else linia = test;
  }
  return linia ? n + 1 : n;
}
