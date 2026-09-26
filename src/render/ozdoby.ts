import { BARWA, rgba } from './palette';
import { SERIF, SERIF_TYTUL, kreska } from './ink';
import { glif } from './tajemnica';

/**
 * Ozdoby wspólne dla ekranów poza grą: rama ryciny z podziałką i napisami na marginesie,
 * kartusz tytułowy, przerywniki i znaki pozycji. Wszystko rysowane jak rytownik rysowałby
 * frontyspis starej księgi — cienka kreska, zwoje, kropki, nic płaskiego.
 */

/** Tekst rozstrzelony litera po literze (canvas nie wszędzie zna letter-spacing). */
export function rozstrzel(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, odstep: number): number {
  const litery = [...tekst];
  const szer = litery.map((l) => ctx.measureText(l).width);
  const calosc = szer.reduce((a, b) => a + b, 0) + odstep * (litery.length - 1);
  const wyr = ctx.textAlign;
  let lx = wyr === 'center' ? x - calosc / 2 : wyr === 'right' ? x - calosc : x;
  ctx.save();
  ctx.textAlign = 'left';
  for (let i = 0; i < litery.length; i++) { ctx.fillText(litery[i], lx, y); lx += szer[i] + odstep; }
  ctx.restore();
  return calosc;
}

/** Zwój: ślimacznica z kilku obrotów — róg ramy, koniec kartusza. */
export function zwoj(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kier: number, obroty = 1.6): void {
  ctx.beginPath();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = kier * t * Math.PI * 2 * obroty;
    const rr = r * (1 - t * 0.85);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

/**
 * Rama frontyspisu: podwójna linia, podziałka jak na mapie, zwoje w rogach, napisy
 * na górnym i dolnym marginesie. `napis` idzie u góry, `podpis` na dole.
 */
export function ramaRyciny(ctx: CanvasRenderingContext2D, w: number, h: number, alfa: number, napis: string, podpis: string): void {
  const m = Math.max(12, Math.min(34, w * 0.024));
  const d = Math.max(8, Math.min(14, w * 0.01));
  ctx.save();
  ctx.lineWidth = 1;
  // linia zewnętrzna i wewnętrzna, między nimi podziałka
  ctx.strokeStyle = rgba(BARWA.atrament, 0.5 * alfa);
  ctx.strokeRect(m + 0.5, m + 0.5, w - m * 2 - 1, h - m * 2 - 1);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.32 * alfa);
  ctx.strokeRect(m + d + 0.5, m + d + 0.5, w - (m + d) * 2 - 1, h - (m + d) * 2 - 1);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.26 * alfa);
  ctx.beginPath();
  const krok = Math.max(14, Math.min(24, w / 60));
  for (let x = m + d + krok; x < w - m - d; x += krok) {
    const dl = Math.round((x - m) / krok) % 5 === 0 ? d : d * 0.45;
    ctx.moveTo(x, m); ctx.lineTo(x, m + dl);
    ctx.moveTo(x, h - m); ctx.lineTo(x, h - m - dl);
  }
  for (let y = m + d + krok; y < h - m - d; y += krok) {
    const dl = Math.round((y - m) / krok) % 5 === 0 ? d : d * 0.45;
    ctx.moveTo(m, y); ctx.lineTo(m + dl, y);
    ctx.moveTo(w - m, y); ctx.lineTo(w - m - dl, y);
  }
  ctx.stroke();
  // rogi: kwadrat z rozetą i zwojami wychodzącymi na boki
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6 * alfa);
  for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]] as const) {
    ctx.fillStyle = rgba(BARWA.sadza, 0.95 * alfa);
    ctx.fillRect(cx + (sx > 0 ? 0 : -d), cy + (sy > 0 ? 0 : -d), d, d);
    ctx.strokeRect(cx + (sx > 0 ? 0 : -d) + 0.5, cy + (sy > 0 ? 0 : -d) + 0.5, d - 1, d - 1);
    ctx.beginPath();
    ctx.arc(cx + sx * d / 2, cy + sy * d / 2, d * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    zwoj(ctx, cx + sx * (d + d * 1.1), cy + sy * d * 0.5, d * 0.55, sx * sy);
    zwoj(ctx, cx + sx * d * 0.5, cy + sy * (d + d * 1.1), d * 0.55, -sx * sy);
  }
  // napisy na marginesie, na tle, które przerywa podziałkę
  const rozm = Math.max(10, Math.min(13, w / 110));
  ctx.font = `${rozm}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [tekst, y] of [[napis, m + d / 2], [podpis, h - m - d / 2]] as const) {
    if (!tekst) continue;
    const t = tekst.toUpperCase();
    const odst = rozm * 0.35;
    const szer = [...t].reduce((a, l) => a + ctx.measureText(l).width, 0) + odst * (t.length - 1);
    ctx.fillStyle = rgba(BARWA.sadza, 0.97 * alfa);
    ctx.fillRect(w / 2 - szer / 2 - rozm, y - d / 2 + 1, szer + rozm * 2, d - 2);
    ctx.fillStyle = rgba(BARWA.atrament, 0.7 * alfa);
    rozstrzel(ctx, t, w / 2, y + 0.5, odst);
  }
  ctx.restore();
}

/**
 * Kartusz: pas pergaminu zwinięty na końcach, na którym stoi tytuł.
 * Zwraca szerokość napisu (do ozdobników pod spodem).
 */
export function kartusz(ctx: CanvasRenderingContext2D, x: number, y: number, tekst: string, rozmiar: number, alfa: number, nadtytul = '', podtytul = ''): number {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${rozmiar}px ${SERIF_TYTUL}`;
  const odst = rozmiar * 0.16;
  const litery = [...tekst];
  const szer = litery.reduce((a, l) => a + ctx.measureText(l).width, 0) + odst * (litery.length - 1);
  const pw = szer + rozmiar * 1.6, ph = rozmiar * 1.25;
  const px = x - pw / 2, py = y - rozmiar * 0.95;
  // wstęga: górna i dolna krawędź lekko wygięte, końce zwinięte w zwoje
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = rgba(BARWA.atrament, 0.55 * alfa);
  ctx.beginPath();
  ctx.moveTo(px, py + ph * 0.12);
  ctx.quadraticCurveTo(x, py - ph * 0.1, px + pw, py + ph * 0.12);
  ctx.moveTo(px, py + ph * 0.92);
  ctx.quadraticCurveTo(x, py + ph * 1.12, px + pw, py + ph * 0.92);
  ctx.stroke();
  for (const [sx, kx] of [[-1, px], [1, px + pw]] as const) {
    ctx.beginPath();
    ctx.moveTo(kx, py + ph * 0.12);
    ctx.bezierCurveTo(kx + sx * ph * 0.5, py + ph * 0.1, kx + sx * ph * 0.55, py + ph * 0.55, kx + sx * ph * 0.2, py + ph * 0.52);
    ctx.moveTo(kx, py + ph * 0.92);
    ctx.bezierCurveTo(kx + sx * ph * 0.5, py + ph * 0.95, kx + sx * ph * 0.55, py + ph * 0.5, kx + sx * ph * 0.2, py + ph * 0.52);
    ctx.stroke();
    zwoj(ctx, kx + sx * ph * 0.34, py + ph * 0.52, ph * 0.16, sx);
    // kiście linek pod zwojami
    ctx.beginPath();
    ctx.moveTo(kx + sx * ph * 0.34, py + ph * 0.7);
    ctx.lineTo(kx + sx * ph * 0.34, py + ph * 1.25);
    ctx.stroke();
  }
  // litery: rowek cienia, potem światło
  let lx = x - szer / 2;
  ctx.textAlign = 'left';
  for (const l of litery) {
    const lw = ctx.measureText(l).width;
    ctx.fillStyle = rgba('#000000', 0.8 * alfa);
    ctx.fillText(l, lx + rozmiar * 0.02, y + rozmiar * 0.035);
    ctx.fillStyle = rgba(BARWA.atramentMocny, alfa);
    ctx.fillText(l, lx, y);
    lx += lw + odst;
  }
  ctx.textAlign = 'center';
  if (nadtytul) {
    const r = Math.max(10, rozmiar * 0.16);
    ctx.font = `${r}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, 0.7 * alfa);
    rozstrzel(ctx, nadtytul.toUpperCase(), x, py - r * 0.9, r * 0.4);
  }
  if (podtytul) {
    const r = Math.max(13, rozmiar * 0.2);
    ctx.font = `italic ${r}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, 0.8 * alfa);
    ctx.fillText(podtytul, x, py + ph + r * 1.7);
  }
  ctx.restore();
  return szer;
}

/** Przerywnik: kreska, romb pośrodku i dwa drobne zwoje po bokach rombu. */
export function przerywnik(ctx: CanvasRenderingContext2D, x: number, y: number, szer: number, alfa: number): void {
  ctx.save();
  ctx.strokeStyle = rgba(BARWA.atrament, 0.45 * alfa);
  ctx.lineWidth = 1;
  kreska(ctx, x - szer / 2, y, x - 18, y, 0.6, 24);
  kreska(ctx, x + 18, y, x + szer / 2, y, 0.6, 24);
  zwoj(ctx, x - 12, y, 4, 1, 1.2);
  zwoj(ctx, x + 12, y, 4, -1, 1.2);
  ctx.fillStyle = rgba(BARWA.zarBlady, 0.7 * alfa);
  ctx.beginPath();
  ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Nagłówek działu: rozstrzelone kapitaliki, glif i kreska do prawego brzegu. */
export function naglowekDzialu(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, szer: number, rozmiar: number, alfa: number, ziarno: number, prawy = ''): void {
  ctx.save();
  ctx.textBaseline = 'middle';
  // glif działu w kółku
  const r = rozmiar * 0.62;
  ctx.strokeStyle = rgba(BARWA.zarBlady, 0.65 * alfa);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x + r, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.save();
  ctx.translate(x + r, y);
  ctx.scale(r * 0.55, r * 0.55);
  ctx.lineWidth = 1.2 / (r * 0.55);
  ctx.stroke(glif(ziarno, 1));
  ctx.restore();
  ctx.font = `${rozmiar}px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = rgba(BARWA.zarBlady, 0.9 * alfa);
  const tw = rozstrzel(ctx, tekst.toUpperCase(), x + r * 2.8, y + 1, rozmiar * 0.22);
  let koniec = x + szer;
  if (prawy) {
    ctx.textAlign = 'right';
    ctx.font = `italic ${rozmiar * 0.85}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.8 * alfa);
    ctx.fillText(prawy, x + szer, y + 1);
    koniec -= ctx.measureText(prawy).width + rozmiar;
  }
  ctx.strokeStyle = rgba(BARWA.atrament, 0.3 * alfa);
  kreska(ctx, x + r * 2.8 + tw + rozmiar * 0.8, y, koniec, y, 0.5, 30);
  ctx.restore();
}

/** Znak pozycji menu — mała rycina: oko, zwój, klepsydra, dłoń, księga, klucz. */
export function znakPozycji(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (id) {
    case 'wroc':        // strzała w dół, w głąb — wracasz do swoich trzewi
      ctx.moveTo(0, -s); ctx.lineTo(0, s * 0.8);
      ctx.moveTo(-s * 0.55, s * 0.25); ctx.lineTo(0, s * 0.85); ctx.lineTo(s * 0.55, s * 0.25);
      break;
    case 'nowa':        // otwierające się oko
      ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 1.1, s, 0); ctx.quadraticCurveTo(0, s * 1.1, -s, 0);
      ctx.moveTo(s * 0.34, 0); ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2);
      for (let i = -2; i <= 2; i++) { ctx.moveTo(i * s * 0.4, -s * 0.72); ctx.lineTo(i * s * 0.5, -s * 1.05); }
      break;
    case 'wczytaj':     // klepsydra
      ctx.moveTo(-s * 0.6, -s); ctx.lineTo(s * 0.6, -s); ctx.lineTo(-s * 0.6, s); ctx.lineTo(s * 0.6, s); ctx.closePath();
      break;
    case 'samouczek':   // dłoń wskazująca
      ctx.moveTo(-s, s * 0.3); ctx.lineTo(-s * 0.1, s * 0.3); ctx.lineTo(s, s * 0.3);
      ctx.moveTo(-s * 0.1, s * 0.3); ctx.lineTo(-s * 0.1, s * 0.9); ctx.lineTo(-s, s * 0.9); ctx.lineTo(-s, s * 0.3);
      ctx.moveTo(s, s * 0.3); ctx.lineTo(s * 0.55, -s * 0.1);
      break;
    case 'bestiariusz': // otwarta księga
      ctx.moveTo(0, -s * 0.7); ctx.lineTo(0, s * 0.9);
      ctx.moveTo(0, -s * 0.7); ctx.quadraticCurveTo(-s * 0.5, -s, -s, -s * 0.75); ctx.lineTo(-s, s * 0.7); ctx.quadraticCurveTo(-s * 0.5, s * 0.5, 0, s * 0.9);
      ctx.moveTo(0, -s * 0.7); ctx.quadraticCurveTo(s * 0.5, -s, s, -s * 0.75); ctx.lineTo(s, s * 0.7); ctx.quadraticCurveTo(s * 0.5, s * 0.5, 0, s * 0.9);
      break;
    default:            // klucz — ustawienia
      ctx.arc(-s * 0.4, 0, s * 0.45, 0, Math.PI * 2);
      ctx.moveTo(s * 0.05, 0); ctx.lineTo(s, 0);
      ctx.moveTo(s * 0.7, 0); ctx.lineTo(s * 0.7, s * 0.4);
      ctx.moveTo(s * 0.45, 0); ctx.lineTo(s * 0.45, s * 0.3);
  }
  ctx.stroke();
  ctx.restore();
}

/** Liczebnik rzymski — numery plansz, pozycji i tablic. */
export function rzymska(n: number): string {
  const t: [number, string][] = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, z] of t) while (n >= v) { s += z; n -= v; }
  return s;
}
