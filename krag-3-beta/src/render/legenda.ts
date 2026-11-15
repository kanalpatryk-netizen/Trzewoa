import { BARWA, rgba } from './palette';
import { SERIF, SERIF_TYTUL, panel } from './ink';
import type { Plate } from './plate';

interface Pozycja { rysuj: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => void; nazwa: string; opis: string; }

const POZYCJE: Pozycja[] = [
  {
    nazwa: 'Ruda', opis: 'z niej stawiają ołtarze i wykuwają Żużlowców',
    rysuj: (c, x, y, s) => { c.strokeStyle = 'rgba(236,206,140,0.95)'; c.lineWidth = 1.6; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - s * 0.4 + i * s * 0.25, y + s * 0.3); c.lineTo(x - s * 0.25 + i * s * 0.25, y - s * 0.3); c.stroke(); } },
  },
  {
    nazwa: 'Grzybnia', opis: 'jedzenie, które rośnie ze zwłok',
    rysuj: (c, x, y, s) => { c.strokeStyle = 'rgba(122,178,96,0.95)'; c.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * s * 0.28, y + s * 0.3); c.lineTo(x + i * s * 0.28, y - s * 0.05); c.stroke(); c.beginPath(); c.ellipse(x + i * s * 0.28, y - s * 0.05, s * 0.17, s * 0.11, 0, Math.PI, 0); c.stroke(); } },
  },
  {
    nazwa: 'Kości', opis: 'padlina: jedzenie i paliwo dla grzybni',
    rysuj: (c, x, y, s) => { c.strokeStyle = 'rgba(226,218,196,0.95)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - s * 0.35, y + s * 0.2); c.lineTo(x + s * 0.35, y - s * 0.2); c.stroke(); c.beginPath(); c.arc(x - s * 0.35, y + s * 0.2, s * 0.09, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(x + s * 0.35, y - s * 0.2, s * 0.09, 0, Math.PI * 2); c.stroke(); },
  },
  {
    nazwa: 'Ołtarz i kuźnia', opis: 'przy nich się modlą — stąd bierze się Wiara',
    rysuj: (c, x, y, s) => { c.strokeStyle = 'rgba(240,206,150,0.95)'; c.lineWidth = 1.6; c.strokeRect(x - s * 0.25, y - s * 0.25, s * 0.5, s * 0.5); c.beginPath(); c.moveTo(x, y - s * 0.25); c.lineTo(x, y - s * 0.45); c.stroke(); },
  },
  {
    nazwa: 'Czysta ciemność', opis: 'miejsca, o których nikt nie pamięta',
    rysuj: (c, x, y, s) => { c.fillStyle = 'rgba(150,143,128,0.9)'; c.beginPath(); c.moveTo(x - s * 0.4, y - s * 0.3); c.lineTo(x + s * 0.35, y - s * 0.35); c.lineTo(x + s * 0.4, y + s * 0.3); c.lineTo(x - s * 0.3, y + s * 0.35); c.closePath(); c.fill(); },
  },
  {
    nazwa: 'Podpis przy gnieździe', opis: 'imię nacji i liczba żywych',
    rysuj: (c, x, y, s) => { c.strokeStyle = rgba(BARWA.atrament, 0.8); c.lineWidth = 1.2; c.beginPath(); c.arc(x - s * 0.3, y + s * 0.2, s * 0.12, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x - s * 0.2, y + s * 0.1); c.lineTo(x + s * 0.1, y - s * 0.2); c.stroke(); c.fillStyle = rgba(BARWA.atrament, 0.8); c.fillRect(x + s * 0.12, y - s * 0.33, s * 0.3, s * 0.18); },
  },
];

/** Klucz do ryciny: co znaczy każdy znak na płycie. Wywoływany klawiszem i z bestiariusza. */
export function rysujLegende(ctx: CanvasRenderingContext2D, p: Plate, w: number): void {
  const szer = Math.min(430, p.w * 0.5);
  const rozmiar = Math.max(14, Math.min(18, w / 76));
  const wiersz = rozmiar * 2.5;
  const wys = 52 + POZYCJE.length * wiersz + rozmiar * 2;
  const x = p.x + p.w / 2 - szer / 2;
  const y = p.y + p.h / 2 - wys / 2;

  panel(ctx, x, y, szer, wys, 0.94);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = `600 ${rozmiar * 1.15}px ${SERIF_TYTUL}`;
  ctx.fillStyle = rgba(BARWA.atramentMocny, 0.95);
  ctx.fillText('CO WIDZISZ NA PŁYCIE', x + 18, y + 28);

  POZYCJE.forEach((poz, i) => {
    const yy = y + 52 + i * wiersz;
    poz.rysuj(ctx, x + 36, yy, rozmiar * 1.5);
    ctx.font = `${rozmiar}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.92);
    ctx.fillText(poz.nazwa, x + 68, yy + rozmiar * 0.1);
    ctx.font = `italic ${rozmiar * 0.8}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, 0.7);
    ctx.fillText(poz.opis, x + 68, yy + rozmiar * 1.05);
  });

  ctx.font = `italic ${rozmiar * 0.8}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.atramentCichy, 0.6);
  ctx.textAlign = 'center';
  ctx.fillText('dotknij albo naciśnij L jeszcze raz, żeby schować', x + szer / 2, y + wys - rozmiar * 0.8);
  ctx.restore();
}
