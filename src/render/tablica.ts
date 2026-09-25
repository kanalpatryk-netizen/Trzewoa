import { TABLICE, NAZWY_GRUP, type Tablica, type Grupa } from '../atlas/tablice';
import { odkrycia } from '../atlas/odkrycia';
import { SERIF, SERIF_TYTUL, akapit, linieAkapitu, naciecie } from './ink';
import { BARWA, rgba } from './palette';
import { kreskuj } from '../cutscene/art/common';

export interface PoleTablicy { akcja: string; x: number; y: number; w: number; h: number }
export const wPolu = (p: PoleTablicy, x: number, y: number): boolean =>
  x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;

const RZYMSKIE: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function rzymska(n: number): string {
  let s = '';
  for (const [v, z] of RZYMSKIE) while (n >= v) { s += z; n -= v; }
  return s;
}

/** Rama planszy: podwójna linia i nacięcia w rogach, jak w starym atlasie. */
function rama(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alfa = 1): void {
  ctx.save();
  ctx.fillStyle = 'rgba(14,10,9,0.98)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.55 * alfa);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 5.5, y + 5.5, w - 11, h - 11);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.22 * alfa);
  ctx.strokeRect(x + 9.5, y + 9.5, w - 19, h - 19);
  const n = Math.min(18, w * 0.06);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6 * alfa);
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]] as [number, number, number, number][]) {
    ctx.moveTo(cx + sx * 2, cy + sy * (n + 2)); ctx.lineTo(cx + sx * 2, cy + sy * 2); ctx.lineTo(cx + sx * (n + 2), cy + sy * 2);
  }
  ctx.stroke();
  ctx.restore();
}

/** Rycina tablicy w zadanym prostokącie — przycięta, z winietą. */
function rycina(ctx: CanvasRenderingContext2D, t: Tablica, x: number, y: number, w: number, h: number, teraz: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  t.rycina({ ctx, w, h, t: teraz, p: 1, takt: 99, taktP: 1 });
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,5,4,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Tytuł rozstrzelonymi wersalikami, jak podpis pod planszą. */
function tytul(ctx: CanvasRenderingContext2D, tekst: string, cx: number, y: number, rozm: number): void {
  ctx.font = `600 ${rozm}px ${SERIF_TYTUL}`;
  const litery = [...tekst.toUpperCase()];
  const odstep = rozm * 0.14;
  const szer = litery.reduce((a, l) => a + ctx.measureText(l).width, 0) + odstep * (litery.length - 1);
  let lx = cx - szer / 2;
  ctx.textAlign = 'center';
  for (const l of litery) {
    const lw = ctx.measureText(l).width;
    ctx.fillText(l, lx + lw / 2, y);
    lx += lw + odstep;
  }
}

/**
 * Pełna tablica: rycina u góry, pod nią nazwa, łaciński podpis, opis, „kiedy"
 * i koszt. Zwraca wysokość, jakiej potrzebowała — okno dopasowuje się do treści.
 */
export function rysujTablice(ctx: CanvasRenderingContext2D, t: Tablica, x: number, y: number, w: number, maxH: number, teraz: number): number {
  const rozm = Math.max(14, Math.min(19, w / 24));
  const wew = w - 48;
  ctx.save();
  ctx.font = `${rozm}px ${SERIF}`;
  const lOpis = linieAkapitu(ctx, t.opis, wew);
  ctx.font = `italic ${rozm * 0.95}px ${SERIF}`;
  const lKiedy = linieAkapitu(ctx, t.kiedy, wew - rozm * 1.4);
  const tekstH = rozm * 4.2 + lOpis * rozm * 1.3 + rozm * 0.9 + lKiedy * rozm * 1.25 + (t.koszt ? rozm * 1.6 : 0) + rozm * 1.2;
  const rycH = Math.max(120, Math.min(w * 0.62, maxH - tekstH - 40));
  const h = rycH + tekstH + 40;
  rama(ctx, x, y, w, h);

  // numer tablicy w rogu — atlas ma porządek, nawet jeśli gracz odkrywa go na wyrywki
  const nr = TABLICE.indexOf(t) + 1;
  ctx.font = `italic ${rozm * 0.72}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.atramentCichy, 0.9);
  ctx.textAlign = 'right';
  ctx.fillText(`Tab. ${rzymska(nr)}`, x + w - 18, y + 26);
  ctx.textAlign = 'left';
  ctx.fillText(NAZWY_GRUP[t.grupa], x + 18, y + 26);

  rycina(ctx, t, x + 18, y + 36, w - 36, rycH, teraz);
  let yy = y + 36 + rycH + rozm * 1.9;
  ctx.fillStyle = rgba(BARWA.atramentMocny, 0.97);
  tytul(ctx, t.nazwa, x + w / 2, yy, rozm * 1.35);
  yy += rozm * 1.15;
  ctx.font = `italic ${rozm * 0.85}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.zarBlady, 0.85);
  ctx.textAlign = 'center';
  ctx.fillText(t.lacina, x + w / 2, yy);
  naciecie(ctx, x + w / 2, yy + rozm * 0.55, Math.min(220, w * 0.5), 0.3);
  yy += rozm * 1.6;
  ctx.font = `${rozm}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.atrament, 0.92);
  akapit(ctx, t.opis, x + 24, yy, wew, rozm * 1.3);
  yy += lOpis * rozm * 1.3 + rozm * 0.5;
  // kiedy tego użyć — to jest to zdanie, po które gracz otwiera tablicę
  ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
  ctx.beginPath();
  ctx.moveTo(x + 26, yy - rozm * 0.62); ctx.lineTo(x + 26 + rozm * 0.6, yy - rozm * 0.34); ctx.lineTo(x + 26, yy - rozm * 0.06);
  ctx.closePath(); ctx.fill();
  ctx.font = `italic ${rozm * 0.95}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.atramentMocny, 0.95);
  akapit(ctx, t.kiedy, x + 24 + rozm * 1.2, yy, wew - rozm * 1.2, rozm * 1.25);
  yy += lKiedy * rozm * 1.25;
  if (t.koszt) {
    yy += rozm * 0.4;
    ctx.font = `${rozm * 0.82}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.95);
    ctx.textAlign = 'left';
    ctx.fillText(`Koszt: ${t.koszt}`, x + 24, yy);
  }
  ctx.restore();
  return h;
}

// ---------------------------------------------------------------- miniatury

const pamiecMiniatur = new Map<string, HTMLCanvasElement>();

/** Miniatura z pamięci — dwadzieścia rycin co klatkę to za dużo kreskowania. */
function miniatura(t: Tablica, w: number, h: number): HTMLCanvasElement {
  const klucz = `${t.id}:${Math.round(w)}x${Math.round(h)}`;
  let c = pamiecMiniatur.get(klucz);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const cx = c.getContext('2d')!;
    t.rycina({ ctx: cx, w: c.width, h: c.height, t: 4000, p: 1, takt: 99, taktP: 1 });
    pamiecMiniatur.set(klucz, c);
  }
  return c;
}

function malaTablica(ctx: CanvasRenderingContext2D, t: Tablica, x: number, y: number, w: number, h: number, zaznaczona: boolean, teraz: number): void {
  const znana = odkrycia.zna(t.id);
  const rozm = Math.max(12, Math.min(16, w / 9));
  rama(ctx, x, y, w, h, zaznaczona ? 1.3 : 0.8);
  const ax = x + 12, ay = y + 12, aw = w - 24, ah = h - 24 - rozm * 1.8;
  if (znana) {
    ctx.drawImage(miniatura(t, aw, ah), ax, ay, aw, ah);
    ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
    ctx.strokeRect(ax + 0.5, ay + 0.5, aw - 1, ah - 1);
  } else {
    // nieodkryta: zatarta plansza, na której ledwie widać znak zapytania
    const p = new Path2D();
    p.rect(ax, ay, aw, ah);
    ctx.fillStyle = 'rgba(20,15,13,1)';
    ctx.fill(p);
    kreskuj(ctx, p, 0.8, 4, rgba(BARWA.atrament, 0.12), 1);
    ctx.font = `italic ${ah * 0.45}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.35 + 0.1 * Math.sin(teraz * 0.002 + x));
    ctx.fillText('?', ax + aw / 2, ay + ah * 0.66);
  }
  ctx.font = `${rozm}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = znana ? rgba(BARWA.atramentMocny, zaznaczona ? 1 : 0.88) : rgba(BARWA.atramentCichy, 0.6);
  ctx.fillText(znana ? t.nazwa : 'nieodkryta', x + w / 2, y + h - 12 - rozm * 0.25);
  if (zaznaczona) {
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.8);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
}

/**
 * Siatka atlasu: grupy tablic jedna pod drugą, miniatury w rzędach. Zwraca pola
 * trafień (id tablicy) i największe możliwe przewinięcie.
 */
export function rysujAtlas(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, przewin: number, teraz: number, pod: { x: number; y: number },
): { pola: PoleTablicy[]; maxPrzewin: number } {
  const pola: PoleTablicy[] = [];
  const kol = Math.max(2, Math.min(6, Math.floor(w / 118)));
  const odstep = 12;
  const tw = (w - odstep * (kol - 1)) / kol, th = tw * 1.22;
  const rozm = Math.max(14, Math.min(19, w / 40));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 4, y, w + 8, h);
  ctx.clip();
  let yy = y - przewin;
  for (const g of ['rasy', 'ryty', 'zasoby', 'prawa'] as Grupa[]) {
    const lista = TABLICE.filter((t) => t.grupa === g);
    const znane = lista.filter((t) => odkrycia.zna(t.id)).length;
    yy += rozm * 1.4;
    ctx.font = `${rozm * 0.8}px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.9);
    ctx.fillText(NAZWY_GRUP[g].toUpperCase().split('').join(' '), x, yy);
    ctx.textAlign = 'right';
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.8);
    ctx.fillText(`${znane} z ${lista.length}`, x + w, yy);
    yy += rozm * 0.7;
    for (let i = 0; i < lista.length; i++) {
      const tx = x + (i % kol) * (tw + odstep);
      const ty = yy + Math.floor(i / kol) * (th + odstep);
      if (ty + th > y - 10 && ty < y + h + 10) {
        const nad = pod.x >= tx && pod.x <= tx + tw && pod.y >= ty && pod.y <= ty + th && pod.y >= y && pod.y <= y + h;
        malaTablica(ctx, lista[i], tx, ty, tw, th, nad, teraz);
        if (ty + th > y && ty < y + h) pola.push({ akcja: lista[i].id, x: tx, y: Math.max(y, ty), w: tw, h: Math.min(ty + th, y + h) - Math.max(y, ty) });
      }
    }
    yy += Math.ceil(lista.length / kol) * (th + odstep) + rozm * 0.4;
  }
  ctx.restore();
  const calosc = yy + przewin - y;
  return { pola, maxPrzewin: Math.max(0, calosc - h) };
}
