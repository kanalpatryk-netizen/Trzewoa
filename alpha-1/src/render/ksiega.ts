/**
 * Księga pod płytą (Alpha 1) — zastępuje pasek zasobów, ryty po lewej, medaliony i kronikę na dole ekranu.
 * Otwarta księga w czerwonej oprawie z mosiężnymi narożnikami i zakładką: lewa karta „Twój lud” (trzy
 * medaliony ról — miniatura postaci, liczba, złoty łuk zaznaczonych), prawa „Zasoby” (wiara, krew, jedzenie,
 * żelazo, złoto, oddanie) pisane odręcznym pismem; przy jedzeniu czerwona pieczęć „+” — Nakarm.
 * Wszystko rysowane w kodzie (placeholder do podmiany przez grafika). Układ: `ukladDolu`/`ukladKsiegi`
 * w render/przyciski.ts. Zwraca pola do kliknięcia.
 */
import type { Plate } from './plate';
import { drawOddanie } from './plate';
import { ukladDolu, ukladKsiegi } from './przyciski';
import { SERIF_PISMO } from './ink';
import { ludRoli, zastepca } from './druzyna';
import { rysujPostac } from './figury';
import { znaczekKruszcu, type Urobki } from './kruszce';
import { wolnoRuszac } from './nastroj';
import { NAZWA_ROLI_MNOGA, type Rola } from '../sim/lud';
import { porcjiWWiadrach } from '../sim/wiadro';
import { najwierniejsza } from '../sim/pielgrzymka';
import { affordable, cost } from '../powers/powers';
import { GORA } from '../nastawy/gora';
import { OLTARZ } from '../nastawy/oltarz';
import { PIELGRZYMKA } from '../nastawy/rytual';
import { OKRUCH } from '../nastawy/kruszce';
import { NASTROJ } from '../nastawy/wyglad/nastroj';
import type { Sim } from '../sim/sim';

type Rgb = [number, number, number];
/** Atrament (sepia) i barwy liczb zasobów. */
export const ATRAMENT: Rgb = [44, 28, 16];
const BARWA_ZASOBU: Record<string, Rgb> = {
  wiara: [128, 84, 12], krew: [138, 22, 14], jedzenie: [58, 82, 26], zelazo: [52, 62, 76], zloto: [150, 104, 14], oddanie: [110, 74, 18],
};
const CZERWIEN: Rgb = [150, 26, 16];
export const rgbA = (k: Rgb, a: number): string => `rgba(${k[0]},${k[1]},${k[2]},${a})`;

/** Powtarzalny „los” 0..1 z liczby. */
export function los(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function hashTekstu(t: string): number {
  let h = 7;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return h;
}

export interface OpcjePisma { align?: CanvasTextAlign; maxW?: number; alfa?: number; blask?: string; blaskR?: number; }
/**
 * Napis odręcznym pismem: lekko przechylony (każdy napis po swojemu, ale zawsze tak samo), z rozlanym
 * atramentem i cieniem. Zwraca szerokość napisu.
 */
export function pismo(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, rozmiar: number,
  barwa: Rgb = ATRAMENT, o: OpcjePisma = {}): number {
  ctx.save();
  ctx.font = `${rozmiar}px ${SERIF_PISMO}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  let t = tekst;
  if (o.maxW) while (ctx.measureText(t).width > o.maxW && t.length > 3) t = t.slice(0, -1);
  const szer = ctx.measureText(t).width, alfa = o.alfa ?? 1, przechyl = (los(hashTekstu(t)) - 0.5) * 0.018;
  ctx.translate(x, y);
  ctx.rotate(przechyl);
  if (o.blask) {
    ctx.shadowColor = o.blask; ctx.shadowBlur = o.blaskR ?? 8;
    ctx.fillStyle = rgbA(barwa, 0.9 * alfa); ctx.fillText(t, 0, 0);
  }
  ctx.shadowColor = rgbA(barwa, 0.35 * alfa); ctx.shadowBlur = Math.max(0.6, rozmiar * 0.05);
  ctx.fillStyle = rgbA(barwa, 0.88 * alfa); ctx.fillText(t, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = rgbA(barwa, 0.22 * alfa); ctx.fillText(t, rozmiar * 0.025, rozmiar * 0.02);
  ctx.restore();
  return szer;
}

/** Nagłówek karty: czerwony inicjał, reszta atramentem, pod spodem dwie kreski z rombem i kropkami. */
export function naglowekKarty(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, rozmiar: number, szerKarty: number): void {
  ctx.save();
  const reszta = tekst.slice(1);
  ctx.font = `${rozmiar * 1.35}px ${SERIF_PISMO}`;
  const wInicjalu = ctx.measureText(tekst[0]).width;
  ctx.font = `${rozmiar}px ${SERIF_PISMO}`;
  const wReszty = ctx.measureText(reszta).width, x0 = x - (wInicjalu + wReszty) / 2;
  pismo(ctx, tekst[0], x0, y, rozmiar * 1.35, CZERWIEN);
  pismo(ctx, reszta, x0 + wInicjalu, y, rozmiar);
  const ly = y + rozmiar * 0.42, d = Math.min(szerKarty * 0.26, (wInicjalu + wReszty) * 0.75);
  ctx.strokeStyle = 'rgba(150,30,18,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - d, ly); ctx.quadraticCurveTo(x - d * 0.5, ly - 2.5, x - 5, ly);
  ctx.moveTo(x + 5, ly); ctx.quadraticCurveTo(x + d * 0.5, ly - 2.5, x + d, ly);
  ctx.stroke();
  ctx.fillStyle = 'rgba(150,30,18,0.8)';
  ctx.beginPath(); ctx.moveTo(x, ly - 3); ctx.lineTo(x + 3, ly); ctx.lineTo(x, ly + 3); ctx.lineTo(x - 3, ly); ctx.closePath(); ctx.fill();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * (d + 2.5), ly, 1.3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function zaokraglony(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const okladki = new Map<string, HTMLCanvasElement>();
/**
 * Okładka z kartami (w × h — same karty, `oprawa` — grubość okładki wokół), rysowana raz na rozmiar
 * i trzymana w pamięci: skóra z ziarnem, złocona linia, stos kartek, papier z włóknami i plamami,
 * cień przy grzbiecie, mosiężne narożniki i czerwona zakładka zwisająca spod księgi.
 */
function okladka(w: number, h: number, oprawa: number): HTMLCanvasElement {
  const klucz = `${Math.round(w)}x${Math.round(h)}x${oprawa}`;
  const gotowa = okladki.get(klucz);
  if (gotowa) return gotowa;
  if (okladki.size > 6) okladki.clear();
  const sk = 2, W = w + oprawa * 2, H = h + oprawa * 2;
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * sk); c.height = Math.ceil((H + 12) * sk);
  const g = c.getContext('2d')!;
  g.scale(sk, sk);
  // skóra
  zaokraglony(g, 0, 0, W, H, 9);
  const skora = g.createLinearGradient(0, 0, 0, H);
  skora.addColorStop(0, '#5c2619'); skora.addColorStop(0.5, '#47190f'); skora.addColorStop(1, '#2c0e08');
  g.fillStyle = skora; g.fill();
  g.save(); g.clip();
  for (let i = 0; i < (W * H) / 40; i++) {
    const x = los(i * 3 + 1) * W, y = los(i * 5 + 2) * H;
    g.fillStyle = los(i * 7) > 0.5 ? 'rgba(255,200,160,0.05)' : 'rgba(0,0,0,0.12)';
    g.fillRect(x, y, 1 + los(i) * 1.5, 1);
  }
  const blask = g.createRadialGradient(W * 0.3, H * 0.2, 4, W * 0.3, H * 0.2, W * 0.6);
  blask.addColorStop(0, 'rgba(255,190,140,0.10)'); blask.addColorStop(1, 'rgba(255,190,140,0)');
  g.fillStyle = blask; g.fillRect(0, 0, W, H);
  g.restore();
  zaokraglony(g, 3.5, 3.5, W - 7, H - 7, 7); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.2; g.stroke();
  zaokraglony(g, 5, 5, W - 10, H - 10, 6); g.strokeStyle = 'rgba(214,170,96,0.45)'; g.lineWidth = 0.9; g.stroke();
  zaokraglony(g, 0.5, 0.5, W - 1, H - 1, 9); g.strokeStyle = 'rgba(16,4,2,0.9)'; g.lineWidth = 1; g.stroke();
  // cień grzbietu na okładce
  const gx = W / 2, cg = g.createLinearGradient(gx - 10, 0, gx + 10, 0);
  cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(0.5, 'rgba(0,0,0,0.45)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = cg; g.fillRect(gx - 10, 0, 20, H);
  // stos kartek pod wierzchnią kartą
  for (let i = 4; i >= 1; i--) {
    const d = i * 1.3;
    g.fillStyle = i % 2 ? '#bda77c' : '#a68f64';
    g.beginPath(); g.moveTo(oprawa - d, oprawa + 3); g.lineTo(gx - 2, oprawa + 4); g.lineTo(gx - 2, oprawa + h + d);
    g.quadraticCurveTo(oprawa + w * 0.25, oprawa + h + d + 2, oprawa - d, oprawa + h + d - 1); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(W - oprawa + d, oprawa + 3); g.lineTo(gx + 2, oprawa + 4); g.lineTo(gx + 2, oprawa + h + d);
    g.quadraticCurveTo(W - oprawa - w * 0.25, oprawa + h + d + 2, W - oprawa + d, oprawa + h + d - 1); g.closePath(); g.fill();
  }
  // dwie karty
  const pol = w / 2;
  for (const strona of [-1, 1]) {
    const xb = strona < 0 ? oprawa : oprawa + w, karta = new Path2D();
    karta.moveTo(xb, oprawa + 1); karta.quadraticCurveTo((xb + gx) / 2, oprawa - 4, gx, oprawa + 3);
    karta.lineTo(gx, oprawa + h - 1); karta.quadraticCurveTo((xb + gx) / 2, oprawa + h + 3, xb, oprawa + h); karta.closePath();
    const papier = g.createLinearGradient(xb, 0, gx, 0);
    papier.addColorStop(0, '#cdb489'); papier.addColorStop(0.12, '#e3d1aa'); papier.addColorStop(0.6, '#e9dbb8');
    papier.addColorStop(0.9, '#d6c196'); papier.addColorStop(1, '#a88d60');
    g.fillStyle = papier; g.fill(karta);
    g.save(); g.clip(karta);
    const x0 = Math.min(xb, gx);
    g.lineWidth = 0.6;
    for (let i = 0; i < (pol * h) / 120; i++) {           // włókna papieru
      const n = i * 13 + (strona < 0 ? 0 : 7777), x = x0 + los(n) * pol, y = oprawa + los(n + 1) * h;
      const kat = los(n + 2) * Math.PI, dl = 3 + los(n + 3) * 9;
      g.strokeStyle = los(n + 4) > 0.5 ? 'rgba(120,88,48,0.06)' : 'rgba(255,250,232,0.10)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(kat) * dl, y + Math.sin(kat) * dl * 0.3); g.stroke();
    }
    for (let i = 0; i < 16; i++) {                          // plamy (dwie duże)
      const n = i * 29 + (strona < 0 ? 31 : 5555), x = x0 + los(n) * pol, y = oprawa + los(n + 1) * h;
      const r = 2 + los(n + 2) * (i < 2 ? 26 : 8), pl = g.createRadialGradient(x, y, 0, x, y, r);
      pl.addColorStop(0, `rgba(140,92,40,${i < 2 ? 0.07 : 0.12})`); pl.addColorStop(1, 'rgba(140,92,40,0)');
      g.fillStyle = pl; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const winieta = g.createRadialGradient(x0 + pol / 2, oprawa + h / 2, Math.min(pol, h) * 0.35, x0 + pol / 2, oprawa + h / 2, Math.max(pol, h) * 0.75);
    winieta.addColorStop(0, 'rgba(110,76,36,0)'); winieta.addColorStop(1, 'rgba(110,76,36,0.22)');
    g.fillStyle = winieta; g.fillRect(x0, oprawa - 6, pol, h + 12);
    const przyGrzbiecie = g.createLinearGradient(gx, 0, gx - strona * 34, 0);
    przyGrzbiecie.addColorStop(0, 'rgba(70,44,18,0.5)'); przyGrzbiecie.addColorStop(0.35, 'rgba(70,44,18,0.18)'); przyGrzbiecie.addColorStop(1, 'rgba(70,44,18,0)');
    g.fillStyle = przyGrzbiecie; g.fillRect(Math.min(gx, gx - strona * 34), oprawa - 6, 34, h + 12);
    // margines karty — blada czerwona linia
    g.strokeStyle = 'rgba(150,40,20,0.10)'; g.lineWidth = 0.7;
    const xm = strona < 0 ? oprawa + Math.max(16, w * 0.04) - 5 : oprawa + w - Math.max(16, w * 0.04) + 5;
    g.beginPath(); g.moveTo(xm, oprawa + 6); g.lineTo(xm, oprawa + h - 6); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(96,66,36,0.55)'; g.lineWidth = 0.8; g.stroke(karta);
  }
  g.strokeStyle = 'rgba(60,36,16,0.6)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(gx, oprawa + 3); g.lineTo(gx, oprawa + h - 1); g.stroke();
  // mosiężne narożniki z nitem
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]]) {
    const d = Math.min(22, oprawa * 1.8);
    g.save(); g.translate(x, y); g.scale(sx, sy);
    g.beginPath(); g.moveTo(1, 1); g.lineTo(d, 1); g.quadraticCurveTo(d * 0.45, d * 0.45, 1, d); g.closePath();
    const mosiadz = g.createLinearGradient(0, 0, d, d);
    mosiadz.addColorStop(0, '#e2c27a'); mosiadz.addColorStop(0.5, '#a07a36'); mosiadz.addColorStop(1, '#5e4218');
    g.fillStyle = mosiadz; g.fill(); g.strokeStyle = 'rgba(30,16,4,0.85)'; g.lineWidth = 0.9; g.stroke();
    g.fillStyle = '#f2dc9e'; g.beginPath(); g.arc(d * 0.3, d * 0.3, 1.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(30,16,4,0.7)'; g.beginPath(); g.arc(d * 0.3 + 0.5, d * 0.3 + 0.6, 0.8, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // zakładka — czerwona wstążka spod grzbietu, z wyciętym końcem
  const zx = gx + 4, zw = 6, wst = g.createLinearGradient(zx, 0, zx + zw, 0);
  wst.addColorStop(0, '#5e0c08'); wst.addColorStop(0.5, '#9a1c14'); wst.addColorStop(1, '#5e0c08');
  g.fillStyle = wst;
  g.beginPath(); g.moveTo(zx, oprawa - 3); g.lineTo(zx + zw, oprawa - 3);
  g.quadraticCurveTo(zx + zw + 3, oprawa + h * 0.6, zx + zw + 5, H + 10); g.lineTo(zx + zw / 2 + 5, H + 6); g.lineTo(zx + 5, H + 10);
  g.quadraticCurveTo(zx + 3, oprawa + h * 0.6, zx, oprawa - 3); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(30,2,0,0.6)'; g.lineWidth = 0.6; g.stroke();
  okladki.set(klucz, c);
  return c;
}

/**
 * Ikony zasobów w księdze (dawniej w ramce nad płytą) (placeholder do podmiany na grafikę): wiara — złoty krzyż, krew — ampułka
 * napełniona do poziomu krwi (pulsuje czerwienią, gdy za mało na rytuał, żarzy się, gdy pełna), jedzenie — bochen.
 */
export function ikonaZasobu(ctx: CanvasRenderingContext2D, rodzaj: 'wiara' | 'krew' | 'jedzenie', x: number, y: number, s: number, teraz: number,
  krew?: { poziom: number; malo: boolean; pelna: boolean }): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const tusz = 'rgba(14,9,7,0.9)';
  if (rodzaj === 'wiara') {
    ctx.shadowColor = 'rgba(255,214,120,0.6)'; ctx.shadowBlur = s * 0.3;
    ctx.fillStyle = 'rgba(232,196,110,1)';
    ctx.fillRect(-s * 0.09, -s * 0.45, s * 0.18, s * 0.9);
    ctx.fillRect(-s * 0.3, -s * 0.24, s * 0.6, s * 0.17);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = tusz; ctx.lineWidth = 1;
    ctx.strokeRect(-s * 0.09, -s * 0.45, s * 0.18, s * 0.9); ctx.strokeRect(-s * 0.3, -s * 0.24, s * 0.6, s * 0.17);
  } else if (rodzaj === 'krew' && krew) {
    // ampułka: szyjka z korkiem i pękaty brzuch
    const brzuch = () => { ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.3); ctx.lineTo(-s * 0.1, -s * 0.16); ctx.quadraticCurveTo(-s * 0.36, -s * 0.05, -s * 0.3, s * 0.22); ctx.quadraticCurveTo(-s * 0.2, s * 0.46, 0, s * 0.46); ctx.quadraticCurveTo(s * 0.2, s * 0.46, s * 0.3, s * 0.22); ctx.quadraticCurveTo(s * 0.36, -s * 0.05, s * 0.1, -s * 0.16); ctx.lineTo(s * 0.1, -s * 0.3); ctx.closePath(); };
    const puls = 0.5 + 0.5 * Math.sin(teraz * 0.006);
    if (krew.pelna || krew.malo) { ctx.shadowColor = krew.pelna ? `rgba(255,110,80,${0.5 + 0.4 * puls})` : `rgba(230,40,30,${0.3 + 0.5 * puls})`; ctx.shadowBlur = s * 0.45; }
    brzuch(); ctx.fillStyle = 'rgba(60,44,40,0.85)'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save(); brzuch(); ctx.clip();
    const top = s * 0.46 - (s * 0.76) * krew.poziom;
    const g = ctx.createLinearGradient(0, top, 0, s * 0.46);
    g.addColorStop(0, 'rgba(206,40,30,1)'); g.addColorStop(1, 'rgba(110,10,8,1)');
    ctx.fillStyle = g; ctx.fillRect(-s * 0.4, top, s * 0.8, s);
    ctx.restore();
    brzuch(); ctx.strokeStyle = 'rgba(214,176,108,0.95)'; ctx.lineWidth = Math.max(1, s * 0.07); ctx.stroke();
    ctx.fillStyle = 'rgba(120,80,44,1)'; ctx.fillRect(-s * 0.12, -s * 0.44, s * 0.24, s * 0.15);
    // połysk szkła
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath(); ctx.moveTo(-s * 0.18, s * 0.02); ctx.quadraticCurveTo(-s * 0.2, s * 0.22, -s * 0.1, s * 0.33); ctx.stroke();
  } else {
    // bochen: kopuła z nacięciami
    ctx.beginPath(); ctx.moveTo(-s * 0.42, s * 0.22); ctx.quadraticCurveTo(-s * 0.42, -s * 0.3, 0, -s * 0.3); ctx.quadraticCurveTo(s * 0.42, -s * 0.3, s * 0.42, s * 0.22); ctx.closePath();
    const g = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.22);
    g.addColorStop(0, 'rgba(206,150,82,1)'); g.addColorStop(1, 'rgba(132,82,40,1)');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = tusz; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(250,220,160,0.8)'; ctx.lineWidth = Math.max(1, s * 0.06);
    for (const dx of [-0.16, 0, 0.16]) { ctx.beginPath(); ctx.moveTo(s * (dx - 0.06), -s * 0.12); ctx.lineTo(s * (dx + 0.06), -s * 0.02); ctx.stroke(); }
  }
  ctx.restore();
}


/** Dymek nad księgą: karteczka z poszarpanymi brzegami i kilkoma linijkami pisma. */
export function dymek(ctx: CanvasRenderingContext2D, x: number, yDol: number, linie: { t: string; barwa?: Rgb }[], rozmiar: number): void {
  ctx.save();
  ctx.font = `${rozmiar}px ${SERIF_PISMO}`;
  const w = Math.max(...linie.map((l) => ctx.measureText(l.t).width)) + rozmiar * 1.4, h = linie.length * rozmiar * 1.3 + rozmiar * 0.7;
  const szerEkranu = ctx.canvas.width / (ctx.getTransform().a || 1);
  const x0 = Math.max(6, Math.min(szerEkranu - w - 6, x - w / 2)), y0 = yDol - h;
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#e4d3ac';
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 2); ctx.lineTo(x0 + w * 0.4, y0); ctx.lineTo(x0 + w, y0 + 3);
  ctx.lineTo(x0 + w - 1, y0 + h); ctx.lineTo(x0 + w * 0.6, y0 + h - 2); ctx.lineTo(x0 + 1, y0 + h);
  ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(96,66,36,0.6)'; ctx.lineWidth = 0.8; ctx.stroke();
  linie.forEach((l, i) => pismo(ctx, l.t, x0 + rozmiar * 0.7, y0 + rozmiar * 1.15 + i * rozmiar * 1.3, rozmiar, l.barwa ?? ATRAMENT));
  ctx.restore();
}

export interface PoleKsiegi { akcja: 'rola' | 'nakarm'; rola?: Rola; x: number; y: number; w: number; h: number; }
type Zasob = 'wiara' | 'krew' | 'jedzenie' | 'zelazo' | 'zloto';
const NAPIS_ZASOBU: Record<Zasob | 'oddanie', string> = { wiara: 'wiara', krew: 'krew', jedzenie: 'jedzenie', zelazo: 'żelazo', zloto: 'złoto', oddanie: 'oddanie' };
/** Ostatnio pokazana liczba każdego zasobu — żeby przy zmianie liczba na chwilę rozjarzyła się (więcej złotem, mniej czerwienią). */
const ostatnie = new Map<string, { n: number; t: number; wiecej: boolean }>();

/** Rysuje księgę i zwraca pola do kliknięcia (medaliony ról, pieczęć Nakarm). */
export function rysujKsiege(ctx: CanvasRenderingContext2D, sim: Sim, p: Plate, vh: number,
  o: { zaznaczeni: Set<number>; kursor: { x: number; y: number }; czas: number; urobki: Urobki }): PoleKsiegi[] {
  const ud = ukladDolu(p, vh), k = ud.ksiega, oprawa = ud.oprawa, u = ukladKsiegi(ud);
  const { kursor, czas, urobki } = o, pola: PoleKsiegi[] = [];
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.drawImage(okladka(k.w, k.h, oprawa), k.x - oprawa, k.y - oprawa, k.w + oprawa * 2, k.h + oprawa * 2 + 12);
  ctx.restore();

  // ---- lewa karta: Twój lud
  naglowekKarty(ctx, 'Twój lud', u.lewa.x + u.lewa.w / 2, u.lewa.y + u.naglowek * 0.95, u.naglowek, u.lewa.w);
  for (const m of u.medaliony) {
    const rola = m.rola, lud = ludRoli(sim, rola), ile = lud.length, zazn = lud.filter((c) => o.zaznaczeni.has(c.id)).length;
    const pod = ((kursor.x - m.x) / (m.rx + 4)) ** 2 + ((kursor.y - m.y) / (m.ry + 4)) ** 2 <= 1;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, Math.PI * 2);
    const tlo = ctx.createRadialGradient(m.x, m.y - m.ry * 0.2, m.rx * 0.2, m.x, m.y, m.ry);
    tlo.addColorStop(0, pod ? 'rgba(255,246,214,0.85)' : 'rgba(250,240,210,0.6)'); tlo.addColorStop(1, 'rgba(176,136,82,0.35)');
    ctx.fillStyle = tlo; ctx.fill();
    const wzor = lud.find((c) => o.zaznaczeni.has(c.id)) ?? lud[0];
    if (wzor) {
      // miniatura postaci tej roli (zaznaczona, jeśli jest) na kresce podłogi
      ctx.save(); ctx.clip();
      ctx.strokeStyle = rgbA(ATRAMENT, 0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.x - m.rx * 0.7, m.y + m.ry * 0.7); ctx.lineTo(m.x + m.rx * 0.7, m.y + m.ry * 0.7); ctx.stroke();
      ctx.translate(m.x, m.y + m.ry * 0.72);
      rysujPostac(ctx, sim, zastepca(rola, wzor), m.ry * 1.45, czas, 'stoi');
      ctx.restore();
    } else {
      // nikogo z tej roli — przekreślony medalion
      ctx.strokeStyle = rgbA(ATRAMENT, 0.6); ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x - m.rx * 0.5, m.y - m.ry * 0.5); ctx.lineTo(m.x + m.rx * 0.5, m.y + m.ry * 0.5);
      ctx.moveTo(m.x + m.rx * 0.5, m.y - m.ry * 0.5); ctx.lineTo(m.x - m.rx * 0.5, m.y + m.ry * 0.5);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgbA(ATRAMENT, pod ? 0.95 : 0.8); ctx.lineWidth = pod ? 2 : 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.rx + 3.5, m.ry + 3.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgbA(ATRAMENT, 0.35); ctx.lineWidth = 0.8; ctx.stroke();
    if (zazn > 0) {
      // złoty łuk: jaka część roli jest zaznaczona (cały owal — wszyscy)
      const t = wolnoRuszac() ? 0.5 + 0.5 * Math.sin(czas * 5e-3) : 1;
      ctx.save();
      ctx.shadowColor = `rgba(255,200,90,${0.55 + 0.35 * t})`; ctx.shadowBlur = 8 + 6 * t;
      const zl = ctx.createLinearGradient(m.x - m.rx, m.y - m.ry, m.x + m.rx, m.y + m.ry);
      zl.addColorStop(0, '#f6dc8c'); zl.addColorStop(0.5, '#b8862e'); zl.addColorStop(1, '#f0d27a');
      ctx.strokeStyle = zl; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      if (zazn === ile) ctx.ellipse(m.x, m.y, m.rx + 1.5, m.ry + 1.5, 0, 0, Math.PI * 2);
      else ctx.ellipse(m.x, m.y, m.rx + 1.5, m.ry + 1.5, 0, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * zazn) / ile);
      ctx.stroke();
      ctx.restore();
    }
    // liczba w kółku i nazwa roli pod medalionem
    const lx = m.x + m.rx * 0.82, ly = m.y - m.ry * 0.78, lr = Math.max(8, u.naglowek * 0.55);
    ctx.fillStyle = '#e8d8b2'; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(150,30,18,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
    pismo(ctx, String(ile), lx, ly + lr * 0.45, lr * 1.25, ile ? CZERWIEN : [120, 100, 80], { align: 'center' });
    pismo(ctx, NAZWA_ROLI_MNOGA[rola], m.x, m.y + m.ry + u.naglowek * 1.05, u.naglowek * 0.85, zazn ? [120, 80, 10] : ATRAMENT, { align: 'center', alfa: ile ? 1 : 0.5 });
    ctx.restore();
    pola.push({ akcja: 'rola', rola, x: m.x - m.rx - 6, y: m.y - m.ry - 6, w: m.rx * 2 + 12, h: m.ry * 2 + 12 + u.naglowek });
  }

  // ---- prawa karta: Zasoby
  naglowekKarty(ctx, 'Zasoby', u.prawa.x + u.prawa.w / 2, u.prawa.y + u.naglowek * 0.95, u.naglowek, u.prawa.w);
  const krewMax = GORA.krewMax, naRytual = Math.min(...Object.values(OLTARZ.rytualy).map((r) => r.krew).filter((k) => k > 0));
  const liczby: Record<Zasob, number> = {
    wiara: Math.max(0, Math.floor(sim.wiara - urobki.wLocie('wiara'))),
    krew: Math.max(0, Math.floor(sim.krew - urobki.wLocie('krew'))),
    jedzenie: porcjiWWiadrach(sim),
    zelazo: Math.max(0, sim.zelazo - urobki.wLocie('zelazo')),
    zloto: Math.max(0, sim.zloto - urobki.wLocie('zloto')),
  };
  let obszarKrwi: { x: number; y: number; w: number; h: number } | null = null;
  for (const z of ['wiara', 'krew', 'jedzenie', 'zelazo', 'zloto'] as const) {
    const m = u.zasoby[z], lot = z === 'jedzenie' ? null : z, blysk = lot ? urobki.blysk(lot, czas) : 0;
    if (z === 'zelazo' || z === 'zloto') {
      znaczekKruszcu(ctx, z, m.x, m.y - m.pismo * 0.3, m.s, blysk, urobki.dolot(z));
      urobki.cele[z] = { x: m.x, y: m.y - m.pismo * 0.3 };
    } else {
      ikonaZasobu(ctx, z, m.x, m.y - m.pismo * 0.3, m.s, czas, z === 'krew'
        ? { poziom: Math.min(1, Math.max(0, sim.krew) / krewMax), malo: sim.krew < naRytual, pelna: sim.krew >= krewMax - 0.5 } : undefined);
    }
    let x = m.x + m.s * 0.72;
    const n = liczby[z];
    // nazwa przed liczbą, jeśli się zmieści
    ctx.font = `${m.pismo * 0.66}px ${SERIF_PISMO}`;
    const wNazwy = ctx.measureText(NAPIS_ZASOBU[z]).width;
    ctx.font = `${m.pismo}px ${SERIF_PISMO}`;
    if (wNazwy + m.pismo * 0.3 + ctx.measureText(String(n)).width <= m.szer + m.s * 0.7) {
      x += pismo(ctx, NAPIS_ZASOBU[z], x, m.y, m.pismo * 0.66, ATRAMENT, { alfa: 0.85 }) + m.pismo * 0.3;
    }
    const byla = ostatnie.get(z);
    if (!byla || byla.n !== n) ostatnie.set(z, { n, t: byla ? czas : -1e9, wiecej: !byla || n > byla.n });
    const st = ostatnie.get(z)!;
    const zar = wolnoRuszac() ? Math.max(0, 1 - (czas - st.t) / NASTROJ.liczbaZar) : 0;
    const blaskLiczby = blysk > 0 ? (z === 'krew' ? `rgba(255,70,50,${blysk})` : `rgba(255,214,110,${blysk})`)
      : zar > 0 ? (st.wiecej ? `rgba(240,190,90,${0.9 * zar})` : `rgba(214,50,32,${0.9 * zar})`) : undefined;
    const podbicie = blysk > 0 ? 1 + (OKRUCH.podbicie - 1) * blysk * blysk : 1;
    // okruchy wiary i krwi lecą do liczby
    if (lot === 'wiara' || lot === 'krew') urobki.cele[lot] = { x: x + m.pismo * 0.5, y: m.y - m.pismo * 0.35 };
    const wLiczby = pismo(ctx, String(n), x, m.y, m.pismo * podbicie, BARWA_ZASOBU[z], { blask: blaskLiczby, blaskR: 10 });
    if (z === 'krew') obszarKrwi = { x: m.x - m.s / 2, y: m.y - m.pismo * 1.1, w: x + wLiczby - (m.x - m.s / 2), h: m.pismo * 1.5 };
  }
  {
    // oddanie: dłonie i procent najwierniejszego ludu
    const m = u.zasoby.oddanie;
    drawOddanie(ctx, p, sim, vh, { x: m.x - m.s / 2, y: m.y - m.s * 0.62, h: m.s });
    const klan = najwierniejsza(sim), oddanie = klan ? klan.devotion : 0, dosc = oddanie > PIELGRZYMKA.oddanieNacji;
    let x = m.x + m.s * 0.72;
    const ile = `${Math.floor(oddanie * 100)}%`;
    ctx.font = `${m.pismo * 0.66}px ${SERIF_PISMO}`;
    const wNazwy = ctx.measureText('oddanie').width;
    ctx.font = `${m.pismo}px ${SERIF_PISMO}`;
    if (wNazwy + m.pismo * 0.3 + ctx.measureText(ile).width <= m.szer + m.s * 0.7) {
      x += pismo(ctx, 'oddanie', x, m.y - m.pismo * 0.15, m.pismo * 0.66, ATRAMENT, { alfa: 0.85 }) + m.pismo * 0.3;
    }
    pismo(ctx, ile, x, m.y - m.pismo * 0.15, m.pismo, BARWA_ZASOBU.oddanie, { blask: dosc ? 'rgba(255,200,90,0.8)' : undefined });
    const dopisek = klan ? (dosc ? 'idą do krypty' : `pielgrzymka od ${Math.round(PIELGRZYMKA.oddanieNacji * 100)}%`) : 'nikt nie wierzy';
    pismo(ctx, dopisek, m.x + m.s * 0.72, m.y + m.pismo * 0.62, m.pismo * 0.54, dosc ? [120, 80, 10] : ATRAMENT, { alfa: 0.7, maxW: m.szer + m.s * 0.4 });
  }
  {
    // pieczęć „+” przy jedzeniu — Nakarm
    const n = u.nakarm, stac = affordable(sim, 'zasiej', 'grzyb'), pod = Math.hypot(kursor.x - n.x, kursor.y - n.y) <= n.r + 4;
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.shadowColor = 'rgba(40,10,4,0.5)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const kat = (i / 14) * Math.PI * 2, r = n.r * (pod ? 1.12 : 1) * (0.92 + 0.08 * los(i * 17));
      if (i === 0) ctx.moveTo(Math.cos(kat) * r, Math.sin(kat) * r); else ctx.lineTo(Math.cos(kat) * r, Math.sin(kat) * r);
    }
    ctx.closePath();
    const lak = ctx.createRadialGradient(-n.r * 0.3, -n.r * 0.3, 1, 0, 0, n.r * 1.2);
    lak.addColorStop(0, stac ? '#d2402c' : '#9c7a6a'); lak.addColorStop(1, stac ? '#6e0e08' : '#5a463c');
    ctx.fillStyle = lak; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = stac ? 'rgba(255,200,170,0.5)' : 'rgba(220,200,190,0.35)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, n.r * 0.68, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = stac ? '#fbe2c8' : 'rgba(230,214,200,0.7)'; ctx.lineWidth = Math.max(1.8, n.r * 0.2); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-n.r * 0.4, 0); ctx.lineTo(n.r * 0.4, 0); ctx.moveTo(0, -n.r * 0.4); ctx.lineTo(0, n.r * 0.4); ctx.stroke();
    ctx.restore();
    pola.push({ akcja: 'nakarm', x: n.x - n.r - 5, y: n.y - n.r - 5, w: n.r * 2 + 10, h: n.r * 2 + 10 });
    if (pod) {
      const c = cost('zasiej', 'grzyb');
      dymek(ctx, n.x, k.y - oprawa - 6, [
        { t: 'Nakarm — dosyp jedzenia do wiadra' },
        { t: stac ? `kosztuje ${c.krew} krwi` : `nie stać cię — trzeba ${c.krew} krwi`, barwa: stac ? ATRAMENT : CZERWIEN },
      ], Math.max(13, u.naglowek * 0.8));
    }
  }
  // dymek nad krwią
  const ok = obszarKrwi as { x: number; y: number; w: number; h: number } | null;
  if (ok && kursor.x >= ok.x && kursor.x <= ok.x + ok.w && kursor.y >= ok.y && kursor.y <= ok.y + ok.h) {
    const krew = Math.floor(Math.max(0, sim.krew)), pelna = sim.krew >= krewMax - 0.5, malo = sim.krew < naRytual;
    dymek(ctx, ok.x + ok.w / 2, k.y - oprawa - 6, [
      { t: `krew: ${krew} z ${krewMax}` },
      { t: pelna ? 'pełna — nadmiar przepada' : malo ? `za mało na rytuał (${naRytual})` : 'płynie z każdej śmierci', barwa: pelna || malo ? CZERWIEN : ATRAMENT },
    ], Math.max(13, u.naglowek * 0.8));
  }
  return pola;
}
