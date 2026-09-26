import { BARWA, rgba } from './palette';
import { SERIF, SERIF_TYTUL, kreska } from './ink';
import { glif } from './tajemnica';
import { RAMA, KARTUSZ, PRZERYWNIK, NAGLOWEK_DZIALU } from '../nastawy/wyglad/ozdoby';

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
  const R = RAMA;
  const m = Math.max(R.margines.min, Math.min(R.margines.max, w * R.margines.czesc));
  const d = Math.max(R.pas.min, Math.min(R.pas.max, w * R.pas.czesc));
  ctx.save();
  ctx.lineWidth = 1;
  // linia zewnętrzna i wewnętrzna, między nimi podziałka
  ctx.strokeStyle = rgba(BARWA.atrament, R.alfaZewnetrzna * alfa);
  ctx.strokeRect(m + 0.5, m + 0.5, w - m * 2 - 1, h - m * 2 - 1);
  ctx.strokeStyle = rgba(BARWA.atrament, R.alfaWewnetrzna * alfa);
  ctx.strokeRect(m + d + 0.5, m + d + 0.5, w - (m + d) * 2 - 1, h - (m + d) * 2 - 1);
  ctx.strokeStyle = rgba(BARWA.atrament, R.alfaPodzialki * alfa);
  ctx.beginPath();
  const krok = Math.max(R.krok.min, Math.min(R.krok.max, w / R.krok.dzielnik));
  for (let x = m + d + krok; x < w - m - d; x += krok) {
    const dl = Math.round((x - m) / krok) % R.dlugaCo === 0 ? d : d * R.krotka;
    ctx.moveTo(x, m); ctx.lineTo(x, m + dl);
    ctx.moveTo(x, h - m); ctx.lineTo(x, h - m - dl);
  }
  for (let y = m + d + krok; y < h - m - d; y += krok) {
    const dl = Math.round((y - m) / krok) % R.dlugaCo === 0 ? d : d * R.krotka;
    ctx.moveTo(m, y); ctx.lineTo(m + dl, y);
    ctx.moveTo(w - m, y); ctx.lineTo(w - m - dl, y);
  }
  ctx.stroke();
  // rogi: kwadrat z rozetą i zwojami wychodzącymi na boki
  ctx.strokeStyle = rgba(BARWA.atramentMocny, R.alfaRogow * alfa);
  for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]] as const) {
    ctx.fillStyle = rgba(BARWA.sadza, R.alfaTlaRogu * alfa);
    ctx.fillRect(cx + (sx > 0 ? 0 : -d), cy + (sy > 0 ? 0 : -d), d, d);
    ctx.strokeRect(cx + (sx > 0 ? 0 : -d) + 0.5, cy + (sy > 0 ? 0 : -d) + 0.5, d - 1, d - 1);
    ctx.beginPath();
    ctx.arc(cx + sx * d / 2, cy + sy * d / 2, d * R.rozeta, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    zwoj(ctx, cx + sx * (d + d * 1.1), cy + sy * d * 0.5, d * R.zwojRogu, sx * sy);
    zwoj(ctx, cx + sx * d * 0.5, cy + sy * (d + d * 1.1), d * R.zwojRogu, -sx * sy);
  }
  // napisy na marginesie, na tle, które przerywa podziałkę
  const rozm = Math.max(R.napis.min, Math.min(R.napis.max, w / R.napis.dzielnik));
  ctx.font = `${rozm}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [tekst, y] of [[napis, m + d / 2], [podpis, h - m - d / 2]] as const) {
    if (!tekst) continue;
    const t = tekst.toUpperCase();
    const odst = rozm * R.napisRozstrzelenie;
    const szer = [...t].reduce((a, l) => a + ctx.measureText(l).width, 0) + odst * (t.length - 1);
    ctx.fillStyle = rgba(BARWA.sadza, R.alfaTlaNapisu * alfa);
    ctx.fillRect(w / 2 - szer / 2 - rozm, y - d / 2 + 1, szer + rozm * 2, d - 2);
    ctx.fillStyle = rgba(BARWA.atrament, R.alfaNapisu * alfa);
    rozstrzel(ctx, t, w / 2, y + 0.5, odst);
  }
  ctx.restore();
}

/** Pełna szerokość kartusza (ze zwojami) dla danego napisu i rozmiaru — do sprawdzania, czy się zmieści. */
export function szerokoscKartusza(ctx: CanvasRenderingContext2D, tekst: string, rozmiar: number): number {
  const K = KARTUSZ;
  ctx.save();
  ctx.font = `${K.waga} ${rozmiar}px ${SERIF_TYTUL}`;
  const litery = [...tekst];
  const szer = litery.reduce((a, l) => a + ctx.measureText(l).width, 0) + rozmiar * K.rozstrzelenie * (litery.length - 1);
  ctx.restore();
  return szer + rozmiar * K.poszerzenie + rozmiar * K.wysokosc * 1.1;
}

/** Największy rozmiar tytułu (nie większy niż `rozmiar`), przy którym kartusz zmieści się w `maxSzer`. */
export function dopasujKartusz(ctx: CanvasRenderingContext2D, tekst: string, rozmiar: number, maxSzer: number): number {
  const s = szerokoscKartusza(ctx, tekst, rozmiar);
  return s <= maxSzer ? rozmiar : Math.max(12, rozmiar * maxSzer / s);
}

/**
 * Kartusz: pas pergaminu zwinięty na końcach, na którym stoi tytuł.
 * Zwraca szerokość napisu (do ozdobników pod spodem).
 */
export function kartusz(ctx: CanvasRenderingContext2D, x: number, y: number, tekst: string, rozmiar: number, alfa: number, nadtytul = '', podtytul = ''): number {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const K = KARTUSZ;
  ctx.font = `${K.waga} ${rozmiar}px ${SERIF_TYTUL}`;
  const odst = rozmiar * K.rozstrzelenie;
  const litery = [...tekst];
  const szer = litery.reduce((a, l) => a + ctx.measureText(l).width, 0) + odst * (litery.length - 1);
  const pw = szer + rozmiar * K.poszerzenie, ph = rozmiar * K.wysokosc;
  const px = x - pw / 2, py = y - rozmiar * 0.95;
  // wstęga: górna i dolna krawędź lekko wygięte, końce zwinięte w zwoje
  ctx.lineWidth = K.grubosc;
  ctx.strokeStyle = rgba(BARWA.atrament, K.alfaWstegi * alfa);
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
    ctx.fillStyle = rgba('#000000', K.alfaCienia * alfa);
    ctx.fillText(l, lx + rozmiar * K.cienX, y + rozmiar * K.cienY);
    ctx.fillStyle = rgba(BARWA.atramentMocny, alfa);
    ctx.fillText(l, lx, y);
    lx += lw + odst;
  }
  ctx.textAlign = 'center';
  if (nadtytul) {
    const r = Math.max(K.nadtytul.min, rozmiar * K.nadtytul.czesc);
    ctx.font = `${r}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, K.nadtytul.alfa * alfa);
    rozstrzel(ctx, nadtytul.toUpperCase(), x, py - r * 0.9, r * K.nadtytul.rozstrzelenie);
  }
  if (podtytul) {
    const r = Math.max(K.podtytul.min, rozmiar * K.podtytul.czesc);
    ctx.font = `italic ${r}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, K.podtytul.alfa * alfa);
    ctx.fillText(podtytul, x, py + ph + r * K.podtytul.odstep);
  }
  ctx.restore();
  return szer;
}

/** Przerywnik: kreska, romb pośrodku i dwa drobne zwoje po bokach rombu. */
export function przerywnik(ctx: CanvasRenderingContext2D, x: number, y: number, szer: number, alfa: number): void {
  const P = PRZERYWNIK;
  ctx.save();
  ctx.strokeStyle = rgba(BARWA.atrament, P.alfaKreski * alfa);
  ctx.lineWidth = 1;
  kreska(ctx, x - szer / 2, y, x - P.przerwa, y, 0.6, 24);
  kreska(ctx, x + P.przerwa, y, x + szer / 2, y, 0.6, 24);
  zwoj(ctx, x - P.zwojOdstep, y, P.zwojPromien, 1, 1.2);
  zwoj(ctx, x + P.zwojOdstep, y, P.zwojPromien, -1, 1.2);
  ctx.fillStyle = rgba(BARWA.zarBlady, P.alfaRombu * alfa);
  ctx.beginPath();
  ctx.moveTo(x, y - P.romb); ctx.lineTo(x + P.romb, y); ctx.lineTo(x, y + P.romb); ctx.lineTo(x - P.romb, y);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Nagłówek działu: rozstrzelone kapitaliki, glif i kreska do prawego brzegu. */
export function naglowekDzialu(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, szer: number, rozmiar: number, alfa: number, ziarno: number, prawy = ''): void {
  ctx.save();
  ctx.textBaseline = 'middle';
  const N = NAGLOWEK_DZIALU;
  // wąsko: pismo maleje, aż napis, dopisek i odrobina kreski zmieszczą się w szerokości
  for (let k = 0; k < 10; k++) {
    ctx.font = `${rozmiar}px ${SERIF}`;
    const t = tekst.toUpperCase();
    const tw = [...t].reduce((a, l) => a + ctx.measureText(l).width, 0) + rozmiar * N.rozstrzelenie * (t.length - 1);
    ctx.font = `italic ${rozmiar * 0.85}px ${SERIF}`;
    const pw = prawy ? ctx.measureText(prawy).width + rozmiar : 0;
    if (rozmiar * N.kolko * N.wciecie + tw + pw + rozmiar * 1.6 <= szer || rozmiar < 9) break;
    rozmiar *= 0.92;
  }
  // glif działu w kółku
  const r = rozmiar * N.kolko;
  ctx.strokeStyle = rgba(BARWA.zarBlady, N.alfaKolka * alfa);
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
  ctx.fillStyle = rgba(BARWA.zarBlady, N.alfaTekstu * alfa);
  const tw = rozstrzel(ctx, tekst.toUpperCase(), x + r * N.wciecie, y + 1, rozmiar * N.rozstrzelenie);
  let koniec = x + szer;
  if (prawy) {
    ctx.textAlign = 'right';
    ctx.font = `italic ${rozmiar * 0.85}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, N.alfaDopisku * alfa);
    ctx.fillText(prawy, x + szer, y + 1);
    koniec -= ctx.measureText(prawy).width + rozmiar;
  }
  ctx.strokeStyle = rgba(BARWA.atrament, N.alfaKreski * alfa);
  kreska(ctx, x + r * N.wciecie + tw + rozmiar * 0.8, y, koniec, y, 0.5, 30);
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
