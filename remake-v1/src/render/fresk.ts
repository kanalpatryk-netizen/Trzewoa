import { FRESK } from '../nastawy/barwy';
import { glif } from './tajemnica';
import tynkUrl from '../grafiki/tekstury/tynk.jpg';
import zlotoUrl from '../grafiki/tekstury/zloto.jpg';

/**
 * Interfejs jak ściana krypty: ciemny tynk w świetle lampki, ramy malowane pasami czerwieni
 * ziemi i ugru, kontury sinopią, krążki z wycinkami fresków. Ciemność w kątach oddycha,
 * a na ramach co jakiś czas wychodzi z tynku pismo, którego nikt nie umie przeczytać.
 */

// ------------------------------------------------------------------ faktury

type Faktura = 'tynk' | 'zloto';
const ADRESY: Record<Faktura, string> = { tynk: tynkUrl, zloto: zlotoUrl };
const obrazy = new Map<Faktura, HTMLImageElement>();
const wzory = new WeakMap<CanvasRenderingContext2D, Map<Faktura, CanvasPattern>>();

function obraz(f: Faktura): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let o = obrazy.get(f);
  if (!o) { o = new Image(); o.src = ADRESY[f]; obrazy.set(f, o); }
  return o.complete && o.naturalWidth > 0 ? o : null;
}

/** Wzór faktury dla danego płótna (albo null, póki obrazek się nie wczytał). */
export function wzor(ctx: CanvasRenderingContext2D, f: Faktura = 'tynk'): CanvasPattern | null {
  let m = wzory.get(ctx);
  const gotowy = m?.get(f);
  if (gotowy) return gotowy;
  const o = obraz(f);
  if (!o) return null;
  const p = ctx.createPattern(o, 'repeat');
  if (!p) return null;
  if (!m) { m = new Map(); wzory.set(ctx, m); }
  m.set(f, p);
  return p;
}

/** Wypełnia ścieżkę pigmentem z fakturą tynku (faktura przyciemnia: mnożenie). */
export function pigment(ctx: CanvasRenderingContext2D, sciezka: Path2D, kolor: string | CanvasGradient, sila = 1, f: Faktura = 'tynk'): void {
  ctx.fillStyle = kolor;
  ctx.fill(sciezka);
  const p = wzor(ctx, f);
  if (!p || sila <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha *= sila;
  ctx.fillStyle = p;
  ctx.fill(sciezka);
  ctx.restore();
}

// ------------------------------------------------------------------ ściana

const sciany = new Map<string, HTMLCanvasElement>();

/** Migotanie płomienia lampki 0..1 — kilka nieparzystych sinusów. */
export function migotLampy(t: number): number {
  return 0.5 + 0.22 * Math.sin(t * 0.0071) * Math.sin(t * 0.0029 + 1.3) + 0.12 * Math.sin(t * 0.0173 + 0.4) + 0.08 * Math.sin(t * 0.031);
}

/**
 * Ściana krypty pod całym ekranem. Tynk liczy się raz na rozmiar; co klatkę dochodzi tylko
 * ciemność w kątach, która oddycha (`oddech` 0..1) i drga razem z płomieniem lampki.
 */
export function scianaKrypty(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, oddech = 0.5, swiatlo = { x: 0.5, y: 0.42 }): void {
  const t = ctx.getTransform();
  const k = Math.min(2, Math.max(1, Math.hypot(t.a, t.b)));
  const klucz = `${Math.round(w)}x${Math.round(h)}@${k}`;
  let c = sciany.get(klucz);
  if (!c) {
    const p = wzor(ctx);
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const g = c.getContext('2d')!;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.fillStyle = FRESK.sciana;
    g.fillRect(0, 0, w, h);
    const pw = p ? wzor(g) : null;
    if (pw) {
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = pw; g.fillRect(0, 0, w, h);
      // druga warstwa, przesunięta i słabsza — kafel tynku się nie powtarza tak wyraźnie
      g.globalAlpha = 0.45;
      g.translate(97, 53); g.rotate(0.5);
      g.fillRect(-w, -h, w * 3, h * 3);
      g.setTransform(k, 0, 0, k, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    // zacieki i plamy wilgoci: ciemniejsze smugi spływające od góry
    for (let i = 0; i < 14; i++) {
      const x = ((i * 0.618 + 0.13) % 1) * w, dl = h * (0.25 + ((i * 0.37) % 1) * 0.5);
      const gr = g.createLinearGradient(0, 0, 0, dl);
      gr.addColorStop(0, 'rgba(20,12,8,0.22)'); gr.addColorStop(1, 'rgba(20,12,8,0)');
      g.fillStyle = gr;
      g.fillRect(x, 0, 6 + ((i * 7) % 5) * 7, dl);
    }
    // ściana bez faktury (obrazek jeszcze się wczytuje) — nie zapamiętujemy, przeliczy się za chwilę
    if (pw) { if (sciany.size > 6) sciany.clear(); sciany.set(klucz, c); }
  }
  ctx.drawImage(c, 0, 0, w, h);
  // ciemność w kątach: oddycha z rdzeniem i drga z płomieniem — zasięg światła nigdy nie stoi
  const m = migotLampy(teraz);
  const R = Math.max(w, h) * (0.58 + 0.05 * oddech + 0.03 * m);
  const cx = w * swiatlo.x, cy = h * swiatlo.y;
  const g = ctx.createRadialGradient(cx, cy, R * 0.22, cx, cy, R);
  g.addColorStop(0, `rgba(${FRESK.mrok},0)`);
  g.addColorStop(0.55, `rgba(${FRESK.mrok},${0.3 * FRESK.mrokAlfa})`);
  g.addColorStop(1, `rgba(${FRESK.mrok},${FRESK.mrokAlfa})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // ciepło lampki w środku ściany
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const l = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.7);
  l.addColorStop(0, `rgba(255,170,90,${0.18 + 0.08 * m})`);
  l.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = l;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ------------------------------------------------------------------ ramy i tablice

function pierscien(x: number, y: number, w: number, h: number, d0: number, d1: number): Path2D {
  const p = new Path2D();
  p.rect(x + d0, y + d0, w - d0 * 2, h - d0 * 2);
  p.rect(x + d1, y + d1, w - d1 * 2, h - d1 * 2);
  return p;
}

const wypelnijPierscien = (ctx: CanvasRenderingContext2D, p: Path2D, kolor: string, sila = 1): void => {
  ctx.save();
  ctx.clip(p, 'evenodd');
  const r = new Path2D(); r.rect(-1e4, -1e4, 2e4, 2e4);
  pigment(ctx, r, kolor, sila);
  ctx.restore();
};

/**
 * Rama malowana jak obramowanie fresku: szeroki pas czerwieni ziemi, nitka bieli wapiennej,
 * węższy pas ugru i kontur sinopią. Na czerwonym pasie rząd perełek; `pismo` — ile znaków
 * nieznanego pisma wyłania się z pasa (0 — wcale). (x, y, w, h) — zewnętrzny brzeg ramy.
 */
export function ramaFresku(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pas = 10, teraz = 0, pismo = 0): void {
  const nic = pas * 0.16, u = pas * 0.5;
  ctx.save();
  // cień ramy na ścianie
  ctx.strokeStyle = 'rgba(8,4,2,0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(x - 1, y + 1, w + 2, h + 2);
  wypelnijPierscien(ctx, pierscien(x, y, w, h, 0, pas), FRESK.czerwien);
  wypelnijPierscien(ctx, pierscien(x, y, w, h, pas, pas + nic), FRESK.biel, 0.5);
  wypelnijPierscien(ctx, pierscien(x, y, w, h, pas + nic, pas + nic + u), FRESK.ugier);
  ctx.strokeStyle = FRESK.sinopia;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 0.6, y + 0.6, w - 1.2, h - 1.2);
  const wew = pas + nic + u;
  ctx.strokeRect(x + wew - 0.6, y + wew - 0.6, w - wew * 2 + 1.2, h - wew * 2 + 1.2);
  // perełki na czerwonym pasie
  if (pas >= 7) {
    ctx.fillStyle = 'rgba(227,214,182,0.42)';
    const krok = Math.max(16, pas * 2.4), r = Math.max(0.9, pas * 0.11), s = pas / 2;
    for (let px = x + krok; px < x + w - krok * 0.5; px += krok) {
      ctx.beginPath(); ctx.arc(px, y + s, r, 0, Math.PI * 2); ctx.arc(px, y + h - s, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let py = y + krok; py < y + h - krok * 0.5; py += krok) {
      ctx.beginPath(); ctx.arc(x + s, py, r, 0, Math.PI * 2); ctx.arc(x + w - s, py, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  // rogi: kwadrat ugru z krzyżykiem bieli
  for (const [cx, cy] of [[x, y], [x + w - pas, y], [x, y + h - pas], [x + w - pas, y + h - pas]]) {
    const r = new Path2D(); r.rect(cx, cy, pas, pas);
    pigment(ctx, r, FRESK.ugier);
    ctx.strokeStyle = FRESK.sinopia; ctx.lineWidth = 1; ctx.stroke(r);
    ctx.strokeStyle = 'rgba(227,214,182,0.6)'; ctx.lineWidth = Math.max(1, pas * 0.12);
    ctx.beginPath();
    ctx.moveTo(cx + pas / 2, cy + pas * 0.22); ctx.lineTo(cx + pas / 2, cy + pas * 0.78);
    ctx.moveTo(cx + pas * 0.22, cy + pas / 2); ctx.lineTo(cx + pas * 0.78, cy + pas / 2);
    ctx.stroke();
  }
  if (pismo > 0 && pas >= 8) pismoNaRamie(ctx, x, y, w, h, pas, teraz, pismo);
  ctx.restore();
}

/**
 * Nieznane pismo na czerwonym pasie ramy: kilka znaków wyłania się z tynku, trwa chwilę
 * i gaśnie, w innym miejscu za każdym razem. Nikt nie wie, co mówi.
 */
function pismoNaRamie(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pas: number, teraz: number, ile: number): void {
  const okres = 9000;
  for (let n = 0; n < ile; n++) {
    const cykl = Math.floor((teraz + n * 3700) / okres);
    const f = ((teraz + n * 3700) % okres) / okres;
    const jasnosc = f < 0.5 ? Math.sin((f / 0.5) * Math.PI) : 0;
    if (jasnosc <= 0.01) continue;
    const los = (k: number) => { const s = Math.sin(cykl * 12.9898 + n * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };
    const bok = Math.floor(los(1) * 4);
    const dl = 5 + Math.floor(los(2) * 5);
    const s = pas * 0.3, krok = s * 2.6;
    const pozioma = bok < 2;
    const dlBoku = pozioma ? w : h;
    const start = pas * 3 + los(3) * Math.max(1, dlBoku - pas * 6 - dl * krok);
    ctx.save();
    ctx.strokeStyle = `rgba(236,214,170,${0.55 * jasnosc})`;
    ctx.lineWidth = Math.max(0.8, pas * 0.09);
    ctx.lineCap = 'round';
    for (let i = 0; i < dl; i++) {
      const px = pozioma ? x + start + i * krok : (bok === 2 ? x + pas / 2 : x + w - pas / 2);
      const py = pozioma ? (bok === 0 ? y + pas / 2 : y + h - pas / 2) : y + start + i * krok;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(s, s);
      ctx.lineWidth /= s;
      ctx.stroke(glif(cykl * 31 + n * 7 + i, 1));
      ctx.restore();
    }
    ctx.restore();
  }
}

/**
 * Tablica tynku: ciemna (jasny tekst, światło lampki pośrodku) albo jasna (tekst sinopią).
 * Brzeg malowany czerwienią ziemi z nitką bieli.
 */
export function tablica(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, jasna = false, alfa = 1): void {
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x + 2, y + 4, w, h);
  const p = new Path2D(); p.rect(x, y, w, h);
  pigment(ctx, p, jasna ? FRESK.tablicaJasna : FRESK.tablicaCiemna);
  // światło lampki z góry, ciemność w dolnych rogach
  const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.25, 0, x + w * 0.5, y + h * 0.4, Math.max(w, h) * 0.8);
  g.addColorStop(0, jasna ? 'rgba(255,240,210,0.18)' : 'rgba(255,190,120,0.1)');
  g.addColorStop(1, 'rgba(10,6,4,0.35)');
  ctx.fillStyle = g;
  ctx.fill(p);
  const pas = Math.max(3, Math.min(6, Math.min(w, h) * 0.03));
  ctx.lineWidth = pas;
  ctx.strokeStyle = FRESK.czerwien;
  ctx.strokeRect(x + pas / 2, y + pas / 2, w - pas, h - pas);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(227,214,182,0.45)';
  ctx.strokeRect(x + pas + 1.5, y + pas + 1.5, w - pas * 2 - 3, h - pas * 2 - 3);
  ctx.strokeStyle = FRESK.sinopia;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

/** Krążek tynku z obrzeżem sinopii — podkład pod ryt albo przycisk. */
export function krazek(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stan: 'zwykly' | 'pod' | 'wlaczony' | 'uspiony' = 'zwykly'): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.arc(x + 1, y + 3, r + 1.5, 0, Math.PI * 2); ctx.fill();
  const p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2);
  pigment(ctx, p, stan === 'wlaczony' ? FRESK.krazekWlaczony : FRESK.krazek);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, stan === 'pod' ? 'rgba(255,236,200,0.22)' : 'rgba(255,236,200,0.08)');
  g.addColorStop(1, 'rgba(30,16,8,0.45)');
  ctx.fillStyle = g; ctx.fill(p);
  ctx.lineWidth = Math.max(1.6, r * 0.09);
  ctx.strokeStyle = FRESK.sinopia;
  ctx.stroke(p);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = `rgba(227,214,182,${stan === 'pod' || stan === 'wlaczony' ? 0.75 : 0.38})`;
  ctx.beginPath(); ctx.arc(x, y, r + 2.2, 0, Math.PI * 2); ctx.stroke();
  if (stan === 'uspiony') { ctx.fillStyle = 'rgba(20,12,8,0.45)'; ctx.fill(p); }
  ctx.restore();
}

// ------------------------------------------------------------------ ikony z fresków

const IKONY = import.meta.glob('../grafiki/ikony/*.jpg', { eager: true, import: 'default' }) as Record<string, string>;
const ikony = new Map<string, HTMLImageElement>();

function ikona(nazwa: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let o = ikony.get(nazwa);
  if (!o) {
    const url = IKONY[`../grafiki/ikony/${nazwa}.jpg`];
    if (!url) return null;
    o = new Image(); o.src = url; ikony.set(nazwa, o);
  }
  return o.complete && o.naturalWidth > 0 ? o : null;
}

/** Czy jest wycinek fresku dla tej ikony (ryt-szept, przycisk-kamera…). */
export const maIkone = (nazwa: string): boolean => !!IKONY[`../grafiki/ikony/${nazwa}.jpg`];

/**
 * Krążek z wycinkiem fresku w środku. `stan` jak w krążku; uśpiony ryt (brak krwi, wiary)
 * gaśnie, aktywny dostaje bladą obwódkę żaru. Zwraca false, gdy wycinka nie ma.
 */
export function krazekZIkona(ctx: CanvasRenderingContext2D, nazwa: string, x: number, y: number, r: number, stan: 'zwykly' | 'pod' | 'wlaczony' | 'uspiony' = 'zwykly'): boolean {
  if (!maIkone(nazwa)) return false;
  krazek(ctx, x, y, r, stan);
  const o = ikona(nazwa);
  if (!o) return true;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, Math.PI * 2); ctx.clip();
  if (stan === 'uspiony') ctx.globalAlpha *= 0.45;
  ctx.drawImage(o, x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
  // wycinek leży w tynku krążka, nie na nim: cień przy brzegu
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 0.88);
  g.addColorStop(0, 'rgba(20,10,6,0)'); g.addColorStop(1, 'rgba(20,10,6,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = FRESK.sinopia;
  ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  return true;
}

// ------------------------------------------------------------------ napisy

/**
 * Tytuł malowany bielą wapienną z cieniem sinopii, pod nim rozstrzelony napis ugrem
 * między dwoma krzyżykami. Zwraca dolną krawędź całego bloku.
 */
export function tytulFresku(ctx: CanvasRenderingContext2D, x: number, y: number, tekst: string, rozmiar: number, alfa: number, podpis = '', krojTytulu = 'serif', krojTekstu = 'serif'): number {
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${rozmiar}px ${krojTytulu}`;
  const odstep = rozmiar * 0.19;
  const litery = [...tekst];
  const szer = litery.reduce((a, l) => a + ctx.measureText(l).width, 0) + odstep * (litery.length - 1);
  let lx = x - szer / 2;
  ctx.textAlign = 'left';
  for (const l of litery) {
    ctx.fillStyle = 'rgba(8,4,2,0.7)';
    ctx.fillText(l, lx + rozmiar * 0.025, y + rozmiar * 0.04);
    ctx.fillStyle = FRESK.sinopia;
    ctx.fillText(l, lx + rozmiar * 0.012, y + rozmiar * 0.022);
    ctx.fillStyle = FRESK.tekst;
    ctx.fillText(l, lx, y);
    lx += ctx.measureText(l).width + odstep;
  }
  let dol = y + rozmiar * 0.12;
  if (podpis) {
    const r = Math.max(10, rozmiar * 0.14);
    ctx.font = `${r}px ${krojTekstu}`;
    const t = `✠  ${podpis.toUpperCase()}  ✠`;
    const od = r * 0.32;
    const sz = [...t].reduce((a, l) => a + ctx.measureText(l).width, 0) + od * (t.length - 1);
    let px = x - sz / 2;
    const py = y + rozmiar * 0.42;
    ctx.fillStyle = FRESK.ugier;
    for (const l of t) { ctx.fillText(l, px, py); px += ctx.measureText(l).width + od; }
    dol = py + r * 0.4;
  }
  ctx.restore();
  return dol;
}
