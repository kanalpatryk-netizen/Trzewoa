import { BARWA, rgba } from './palette';
import { KARTA } from '../nastawy/wyglad/ozdoby';

import { KROJ, KROJ_TYTUL } from './fonts';

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

/** Tło ekranów poza grą: ciepła czerń z ziarnem i winietą. */
export function tloSadzy(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.1, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  g.addColorStop(0, '#1a1210');
  g.addColorStop(1, BARWA.sadza);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = wzorKreski(ctx, rgba(BARWA.atrament, 0.6), 7, 1);
  ctx.translate(Math.sin(t * 0.0002) * 3, Math.cos(t * 0.00017) * 3);
  ctx.fillRect(-10, -10, w + 20, h + 20);
  ctx.restore();
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

/** Panel z poszarpanym brzegiem — karta wsunięta w kamień, nie okno dialogowe. */
export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alfa = 0.94): void {
  // ta sama rama co karty w grze i ramy menu: podwójna linia i rogi z rozetami
  const K = KARTA;
  ctx.save();
  ctx.fillStyle = rgba('#0d0a09', Math.min(1, alfa + 0.03));
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 3, y + h + 1.5); ctx.lineTo(x + w + 1.5, y + h + 1.5); ctx.lineTo(x + w + 1.5, y + 3); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(BARWA.atrament, K.linia);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = rgba(BARWA.atrament, K.liniaWew);
  const d = K.wciecie;
  ctx.strokeRect(x + d + 0.5, y + d + 0.5, w - d * 2 - 1, h - d * 2 - 1);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, K.rogi);
  for (const [cx, cy] of [[x, y], [x + w - d, y], [x, y + h - d], [x + w - d, y + h - d]] as const) {
    ctx.fillStyle = '#0d0a09';
    ctx.fillRect(cx, cy, d, d);
    ctx.strokeRect(cx + 0.5, cy + 0.5, d - 1, d - 1);
    ctx.beginPath(); ctx.arc(cx + d / 2, cy + d / 2, d * 0.18, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
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
