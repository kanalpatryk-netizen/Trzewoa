/**
 * MONTAŻ TRAILERA — składa klatkę filmu z ujęć nagranych z gry (trailer/klatki/<id>/), napisów i planszy tytułowej.
 * Strona trailer/montaz.html (Vite dev) — tak napisy dostają kroje pisma gry, ozdobniki menu i logo z bijącym sercem.
 * Klatkę zamawia montaz.mjs: `M.klatka(i)` → JPEG (base64).
 */
import { SCENARIUSZ, FPS, BPM, MUZYKA } from './scenariusz.mjs';
import { zaladujKroje } from '../src/render/fonts';
import { ozdobnik } from '../src/render/ozdobnik';
import { MENU } from '../src/nastawy/wyglad/menu';
import logoUrl from '../obrazy/menu/logo-trzewia.png?url';
import dollumUrl from '../obrazy/menu/zespol-dollum.png?url';
import pillowUrl from '../obrazy/menu/zespol-pillow-bleach.png?url';
import podpisUrl from '../obrazy/menu/zespol-podpis-brych.png?url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dowolny = any;

const W = 1920, H = 1080;
const canvas = document.getElementById('kadr') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;

const KOSC = '236,226,206';          // barwa napisów — kość, jak logo w menu
const ZLOTO = '196,160,104';         // ozdobniki
const TYTUL = '"Trzewia Tytul", "Cormorant Garamond", Georgia, serif';
const TEKST = '"Trzewia Tekst", "EB Garamond", Georgia, serif';

const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const wyjscie = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - x, 3); };
const ff = (s: number): number => Math.round(s * FPS);

/** Deterministyczny „los” z liczby — ziarno, drgania, iskry. */
function los(n: number): number {
  let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- oś montażu
interface Klip { u: Dowolny; i0: number; n: number; od: number; do: number; zapas: number; klatek: number }
const klipy: Klip[] = [];
const napisy = SCENARIUSZ.filter((w: Dowolny) => w.typ === 'napis');
const tytuly = SCENARIUSZ.filter((w: Dowolny) => w.typ === 'tytul');

function zbudujOs(): void {
  const gra = SCENARIUSZ.filter((w: Dowolny) => w.typ === 'gra');
  for (const u of gra) {
    const i0 = ff(u.od), n = ff(u.dl);
    const wej = u.wejscie?.typ === 'przenik' ? ff(u.wejscie.dl / 2) : 0;
    // następne ujęcie, które zaczyna się tam, gdzie to się kończy, z przenikaniem — to ujęcie trwa dłużej o połowę
    const nast = gra.find((q: Dowolny) => Math.abs(ff(q.od) - (i0 + n)) <= 1 && q.wejscie?.typ === 'przenik');
    const wyj = nast ? ff(nast.wejscie.dl / 2) : 0;
    klipy.push({ u, i0, n, od: i0 - wej, do: i0 + n + wyj, zapas: 15, klatek: n + 30 });
  }
}

/** Krycie klipu w klatce (przenikanie, wejście z czerni, zejście do czerni). */
function krycie(k: Klip, i: number): number {
  const u = k.u;
  let a = 1;
  if (u.wejscie?.typ === 'przenik') a *= gladko((i - k.od) / Math.max(1, ff(u.wejscie.dl)));
  if (u.wejscie?.typ === 'czern') a *= gladko((i - k.i0) / Math.max(1, ff(u.wejscie.dl)));
  if (u.wyjscie?.typ === 'czern') a *= gladko((k.i0 + k.n - i) / Math.max(1, ff(u.wyjscie.dl)));
  return a;
}

// ---------------------------------------------------------------- klatki ujęć
const pamiec = new Map<string, ImageBitmap>();
const kolejka: string[] = [];
async function klatkaUjecia(id: string, nr: number): Promise<ImageBitmap | null> {
  const klucz = `${id}/${nr}`;
  const b = pamiec.get(klucz);
  if (b) return b;
  try {
    const r = await fetch(`/trailer/klatki/${id}/${String(nr).padStart(5, '0')}.jpg`);
    if (!r.ok) return null;
    const bmp = await createImageBitmap(await r.blob());
    pamiec.set(klucz, bmp); kolejka.push(klucz);
    while (kolejka.length > 24) { const k = kolejka.shift()!; pamiec.get(k)?.close(); pamiec.delete(k); }
    return bmp;
  } catch { return null; }
}

async function wczytajMeta(): Promise<void> {
  for (const k of klipy) {
    try {
      const r = await fetch(`/trailer/klatki/${k.u.id}/meta.json`);
      if (r.ok) { const m = await r.json(); k.zapas = m.zapas; k.klatek = m.klatek; }
    } catch { /* bez nagrania — zaślepka */ }
  }
}

// ---------------------------------------------------------------- obróbka: winieta, ziarno, drgania
let winieta: HTMLCanvasElement, ziarna: HTMLCanvasElement[] = [];
function przygotujObrobke(): void {
  winieta = document.createElement('canvas'); winieta.width = W; winieta.height = H;
  const g = winieta.getContext('2d')!;
  const r = g.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 1.02);
  r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(0.55, 'rgba(0,0,0,0.12)'); r.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = r; g.fillRect(0, 0, W, H);
  // ziarno filmu: kilka plansz szumu (pół rozdzielczości — ziarno ma ok. 2 px), losowane co klatkę
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas'); c.width = W / 3; c.height = H / 3;
    const gg = c.getContext('2d')!;
    const im = gg.createImageData(c.width, c.height);
    for (let p = 0; p < im.data.length; p += 4) {
      const s = (los(p * 7 + k * 1013) + los(p * 13 + k * 7919 + 1) + los(p * 3 + k * 31 + 2) - 1.5) * 52;
      const v = Math.max(0, Math.min(255, 128 + s));
      im.data[p] = im.data[p + 1] = im.data[p + 2] = v; im.data[p + 3] = 255;
    }
    gg.putImageData(im, 0, 0);
    ziarna.push(c);
  }
}

/** Siła wstrząsu w chwili t (s): wielkie uderzenia muzyki trzęsą obrazem gry. */
function wstrzas(t: number): number {
  let a = 0;
  for (const u of (MUZYKA.wstrzasy ?? []) as number[]) { const d = t - u; if (d >= 0 && d < 0.7) a += Math.exp(-d * 7.5); }
  return Math.min(1.3, a);
}

// ---------------------------------------------------------------- napisy
const tymczasowe = document.createElement('canvas');
tymczasowe.width = W; tymczasowe.height = 400;
const tctx = tymczasowe.getContext('2d')!;

interface Linia { tekst: string; font: string; rozmiar: number; odstep: number; opoznienie: number; y: number }

/** Układ napisu: karta (na czerni, pośrodku) albo napis na obrazie (dolna trzecia). */
function uklad(w: Dowolny): Linia[] {
  const linie = String(w.tekst).split('\n');
  if (w.styl === 'karta') {
    if (linie.length === 1) return [{ tekst: linie[0], font: `600 ${94}px ${TYTUL}`, rozmiar: 94, odstep: 3, opoznienie: 0, y: H * 0.5 + 30 }];
    return [
      { tekst: linie[0], font: `italic ${54}px ${TEKST}`, rozmiar: 54, odstep: 1.5, opoznienie: 0, y: H * 0.5 - 40 },
      { tekst: linie[1], font: `600 ${104}px ${TYTUL}`, rozmiar: 104, odstep: 4, opoznienie: 1.1, y: H * 0.5 + 80 },
    ];
  }
  return [{ tekst: linie[0], font: `600 ${60}px ${TYTUL}`, rozmiar: 60, odstep: 2, opoznienie: 0, y: H * 0.845 }];
}

/** Jedna linia napisu: wejście ścieraniem od lewej z rozmyciem i uniesieniem, powolne rozszerzanie liter, wyjście. */
function rysujLinie(l: Linia, t: number, dl: number, karta: boolean, alfaWyj: number): { szer: number } {
  const tl = t - l.opoznienie;
  if (tl < 0) return { szer: 0 };
  const wejscieS = karta ? 1.15 : 0.8;
  const p = wyjscie(tl / wejscieS);
  // powolne rozszerzanie liter przez cały czas napisu (klasyczny ruch napisu w zwiastunie)
  const rozstaw = l.odstep + (karta ? 2.2 : 1.2) * (tl / Math.max(1, dl));
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.clearRect(0, 0, W, tymczasowe.height);
  tctx.font = l.font;
  (tctx as Dowolny).letterSpacing = `${rozstaw.toFixed(2)}px`;
  tctx.textAlign = 'center'; tctx.textBaseline = 'alphabetic';
  const szer = tctx.measureText(l.tekst).width;
  const by = 260;
  tctx.shadowColor = 'rgba(255,196,140,0.35)'; tctx.shadowBlur = l.rozmiar * 0.35;
  tctx.fillStyle = `rgb(${KOSC})`;
  tctx.fillText(l.tekst, W / 2, by);
  tctx.shadowBlur = 0;
  // ścieranie od lewej: miękka krawędź na 30% szerokości
  if (p < 1) {
    const x0 = W / 2 - szer / 2 - 40, x1 = W / 2 + szer / 2 + 40;
    const miek = 0.3;
    const front = -miek + p * (1 + miek);
    const g = tctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(Math.max(0, Math.min(1, front)), 'rgba(0,0,0,1)');
    g.addColorStop(Math.max(0, Math.min(1, front + miek)), 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    tctx.globalCompositeOperation = 'destination-in';
    tctx.fillStyle = g; tctx.fillRect(0, 0, W, tymczasowe.height);
    tctx.globalCompositeOperation = 'source-over';
  }
  const rozmycie = (1 - p) * 7 + (1 - alfaWyj) * 5;
  ctx.save();
  ctx.globalAlpha = Math.min(1, p * 1.4) * alfaWyj;
  if (rozmycie > 0.3) ctx.filter = `blur(${rozmycie.toFixed(1)}px)`;
  ctx.drawImage(tymczasowe, 0, l.y - by + (1 - p) * 10 - (1 - alfaWyj) * 6);
  ctx.restore();
  return { szer };
}

function rysujNapis(w: Dowolny, t: number): void {
  const karta = w.styl === 'karta';
  const dl = w.dl as number;
  const wyjS = karta ? 0.8 : 0.5;
  const alfaWyj = 1 - gladko((t - (dl - wyjS)) / wyjS);
  const linie = uklad(w);
  if (!karta) {
    // przyciemnienie pod napisem na obrazie — miękki pas przez całą szerokość
    const a = Math.min(gladko(t / 0.5), alfaWyj) * 0.62;
    const g = ctx.createLinearGradient(0, H * 0.68, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, `rgba(0,0,0,${a})`); g.addColorStop(1, `rgba(0,0,0,${a * 0.9})`);
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.68, W, H * 0.32);
  }
  let szer = 0;
  for (const l of linie) szer = Math.max(szer, rysujLinie(l, t, dl, karta, alfaWyj).szer);
  // ozdobniki gry (jak przy pozycjach menu): po obu stronach napisu na obrazie, pod kartą — kreska z ozdobnikami
  const ost = linie[linie.length - 1];
  const p = wyjscie((t - ost.opoznienie - 0.25) / 1.0);
  if (p <= 0) return;
  ctx.save();
  if (karta) {
    const pol = (szer / 2 + 70) * p;
    const y = ost.y + ost.rozmiar * 0.42;
    const g = ctx.createLinearGradient(W / 2 - pol, 0, W / 2 + pol, 0);
    g.addColorStop(0, `rgba(${ZLOTO},0)`); g.addColorStop(0.5, `rgba(${ZLOTO},${0.7 * alfaWyj})`); g.addColorStop(1, `rgba(${ZLOTO},0)`);
    ctx.fillStyle = g; ctx.fillRect(W / 2 - pol, y - 0.75, pol * 2, 1.5);
    ozdobnik(ctx, W / 2 - pol - 8, y, 46, -1, `rgb(${ZLOTO})`, 0.9 * p * alfaWyj);
    ozdobnik(ctx, W / 2 + pol + 8, y, 46, 1, `rgb(${ZLOTO})`, 0.9 * p * alfaWyj);
  } else {
    const s = ost.rozmiar * 1.05, odst = ost.rozmiar * 0.32;
    const y = ost.y - ost.rozmiar * 0.32;
    ozdobnik(ctx, W / 2 - szer / 2 - odst, y, s, -1, `rgb(${ZLOTO})`, 0.9 * p * alfaWyj);
    ozdobnik(ctx, W / 2 + szer / 2 + odst, y, s, 1, `rgb(${ZLOTO})`, 0.9 * p * alfaWyj);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- iskry i pył (tło kart i planszy tytułowej)
function iskry(t: number, sila: number, ziarno = 1): void {
  if (sila <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const N = 70;
  for (let k = 0; k < N; k++) {
    const r = (q: number) => los(k * 97 + q * 13 + ziarno * 7777);
    const v = 18 + r(1) * 46;                       // px/s w górę
    const y = (H + 60) - (((r(2) * (H + 120)) + t * v) % (H + 120));
    const x = r(3) * W + Math.sin(t * (0.3 + r(4) * 0.6) + r(5) * 6.28) * (14 + r(6) * 30);
    const migot = 0.55 + 0.45 * Math.sin(t * (2 + r(7) * 5) + r(8) * 6.28);
    const rr = 1.1 + r(9) * 2.4;
    const a = sila * migot * (0.25 + r(10) * 0.55) * gladko((H - y) / 220) * gladko(y / 160);
    if (a <= 0.01) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 4);
    g.addColorStop(0, `rgba(255,190,120,${a})`); g.addColorStop(0.35, `rgba(255,120,50,${a * 0.45})`); g.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rr * 4, y - rr * 4, rr * 8, rr * 8);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- logo z bijącym sercem (jak w menu gry)
let logoTlo: HTMLCanvasElement | null = null, logoSerce: HTMLCanvasElement | null = null, sercePkt = { x: 0, y: 0 };
const znakiZespolu: HTMLImageElement[] = [];

function wczytajObraz(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, zle) => { const i = new Image(); i.onload = () => ok(i); i.onerror = zle; i.src = url; });
}

function zabarw(img: HTMLImageElement | HTMLCanvasElement, barwa: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = (img as HTMLImageElement).naturalWidth || img.width; c.height = (img as HTMLImageElement).naturalHeight || img.height;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = barwa; g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Logo rozdzielone na tło i serce — tym samym obrysem co w menu (MENU.serce). */
function rozdzielSerce(logo: HTMLCanvasElement): void {
  const S = MENU.serce, k = logo.width / S.obrysSzer;
  const maska = document.createElement('canvas'); maska.width = logo.width; maska.height = logo.height;
  const g = maska.getContext('2d')!;
  g.filter = `blur(${S.miekkosc * k}px)`;
  g.beginPath();
  S.obrys.forEach(([x, y]: number[], i: number) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)));
  g.closePath();
  g.fillStyle = g.strokeStyle = '#fff'; g.lineJoin = 'round'; g.lineWidth = S.rozszerz * 2 * k;
  g.fill(); g.stroke();
  const warstwa = (tryb: GlobalCompositeOperation) => {
    const c = document.createElement('canvas'); c.width = logo.width; c.height = logo.height;
    const gg = c.getContext('2d')!;
    gg.drawImage(logo, 0, 0); gg.globalCompositeOperation = tryb; gg.drawImage(maska, 0, 0);
    return c;
  };
  logoTlo = warstwa('destination-out'); logoSerce = warstwa('destination-in');
  const xs = S.obrys.map((p: number[]) => p[0]), ys = S.obrys.map((p: number[]) => p[1]);
  sercePkt = { x: ((Math.min(...xs) + Math.max(...xs)) / 2) * k, y: ((Math.min(...ys) + Math.max(...ys)) / 2) * k };
}

/** Bicie serca w rytmie muzyki (75 uderzeń na minutę): mocne „lub”, słabsze „dub”, przerwa. */
function bicie(t: number): number {
  const okres = 60 / BPM;
  const f = ((t % okres) + okres) % okres;
  let s = 1;
  for (const u of [{ od: 0, sila: 0.045 }, { od: 0.24, sila: 0.024 }]) {
    const d = f - u.od * okres;
    if (d < 0) continue;
    s += u.sila * (d < 0.07 ? Math.sin((d / 0.07) * Math.PI / 2) : Math.max(0, 1 - gladko((d - 0.07) / 0.26)));
  }
  return s;
}

function rysujTytul(w: Dowolny, t: number, tFilmu: number): void {
  const dl = w.dl as number;
  const wyj = 1 - gladko((t - (dl - 1.1)) / 1.1);
  // tło: czerń, ciepła poświata za logo, iskry
  const puls = bicie(tFilmu) - 1;
  const pg = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, H * 0.75);
  const pa = (0.16 + puls * 2.2) * gladko(t / 1.6) * wyj;
  pg.addColorStop(0, `rgba(120,40,24,${pa})`); pg.addColorStop(0.5, `rgba(60,18,12,${pa * 0.45})`); pg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);
  iskry(t + 30, 0.9 * wyj * gladko(t / 1.0), 3);
  if (!logoTlo || !logoSerce) return;
  const wysokosc = H * 0.5;
  const skala = wysokosc / logoTlo.height;
  const lw = logoTlo.width * skala;
  const p = wyjscie(t / 1.8);
  const zoom = 1.07 - 0.07 * p + 0.012 * (t / dl);
  const x = W / 2, y = H * 0.4;
  ctx.save();
  ctx.translate(x, y); ctx.scale(zoom, zoom);
  ctx.globalAlpha = gladko(t / 1.3) * wyj;
  if (t < 1.3) ctx.filter = `blur(${((1 - gladko(t / 1.3)) * 10).toFixed(1)}px)`;
  // poświata logo
  ctx.save();
  ctx.globalAlpha *= 0.32 + puls * 2;
  ctx.filter = 'blur(14px)';
  ctx.drawImage(logoTlo, -lw / 2, -wysokosc / 2, lw, wysokosc);
  ctx.restore();
  ctx.drawImage(logoTlo, -lw / 2, -wysokosc / 2, lw, wysokosc);
  // serce bije w rytmie
  const b = bicie(tFilmu);
  const sx = -lw / 2 + sercePkt.x * skala, sy = -wysokosc / 2 + sercePkt.y * skala;
  ctx.save();
  ctx.translate(sx, sy); ctx.scale(b, b); ctx.translate(-sx, -sy);
  ctx.drawImage(logoSerce, -lw / 2, -wysokosc / 2, lw, wysokosc);
  // żar w sercu przy uderzeniu
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= Math.min(1, (b - 1) * 14) * 0.55;
  ctx.filter = 'blur(6px)';
  ctx.drawImage(zabarwPamiec(), -lw / 2, -wysokosc / 2, lw, wysokosc);
  ctx.restore();
  ctx.restore();
  // przebłysk światła po kresce logo
  const sw = (t - 1.2) / 1.6;
  if (sw > 0 && sw < 1) {
    const c = przeblysk(sw);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.sin(sw * Math.PI) * 0.5 * wyj;
    ctx.translate(x, y); ctx.scale(zoom, zoom);
    ctx.drawImage(c, -lw / 2, -wysokosc / 2, lw, wysokosc);
    ctx.restore();
  }
  // podpis wersji i znaki zespołu
  const a1 = gladko((t - 1.9) / 0.9) * wyj;
  if (a1 > 0) {
    ctx.save();
    ctx.globalAlpha = a1;
    ctx.font = `600 40px ${TYTUL}`;
    (ctx as Dowolny).letterSpacing = '16px';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgb(${KOSC})`;
    ctx.shadowColor = 'rgba(255,196,140,0.3)'; ctx.shadowBlur = 12;
    ctx.fillText(String(w.podpis ?? '').toUpperCase(), W / 2 + 7, H * 0.735);
    ctx.shadowBlur = 0;
    ozdobnik(ctx, W / 2 - 150, H * 0.735 - 13, 48, -1, `rgb(${ZLOTO})`, 0.9);
    ozdobnik(ctx, W / 2 + 150, H * 0.735 - 13, 48, 1, `rgb(${ZLOTO})`, 0.9);
    ctx.restore();
  }
  const a2 = gladko((t - 2.8) / 1.0) * wyj;
  if (a2 > 0 && znakiZespolu.length === 3) {
    ctx.save();
    ctx.globalAlpha = a2 * 0.78;
    const wys = [H * 0.075, H * 0.056, H * 0.034];
    const szer = znakiZespolu.map((im, i) => (im.naturalWidth / im.naturalHeight) * wys[i]);
    const odst = 70;
    const razem = szer.reduce((a, b) => a + b, 0) + odst * 2;
    let xx = W / 2 - razem / 2;
    const yy = H * 0.885;
    znakiZespolu.forEach((im, i) => {
      ctx.drawImage(zabarwZnak(i, im), xx, yy - wys[i] / 2, szer[i], wys[i]);
      xx += szer[i] + odst;
    });
    ctx.restore();
  }
}

let serceZar: HTMLCanvasElement | null = null;
function zabarwPamiec(): HTMLCanvasElement {
  if (!serceZar && logoSerce) serceZar = zabarw(logoSerce, '#ff7a3c');
  return serceZar!;
}
const znakiBarwne: HTMLCanvasElement[] = [];
function zabarwZnak(i: number, im: HTMLImageElement): HTMLCanvasElement {
  if (!znakiBarwne[i]) znakiBarwne[i] = zabarw(im, MENU.logoBarwa);
  return znakiBarwne[i];
}
const swiatlo = document.createElement('canvas');
/** Ukośny pas światła przesuwany po logo (sw 0..1), przycięty do kreski logo. */
function przeblysk(sw: number): HTMLCanvasElement {
  const L = logoTlo!;
  swiatlo.width = L.width; swiatlo.height = L.height;
  const s = swiatlo.getContext('2d')!;
  s.clearRect(0, 0, L.width, L.height);
  const gx = (sw * 1.4 - 0.2) * L.width, pas = L.width * 0.09;
  const g = s.createLinearGradient(gx - pas, 0, gx + pas, L.height * 0.25);
  g.addColorStop(0, 'rgba(255,224,176,0)'); g.addColorStop(0.5, 'rgba(255,224,176,1)'); g.addColorStop(1, 'rgba(255,224,176,0)');
  s.fillStyle = g; s.fillRect(0, 0, L.width, L.height);
  s.globalCompositeOperation = 'destination-in';
  s.drawImage(L, 0, 0);
  s.globalCompositeOperation = 'source-over';
  return swiatlo;
}

// ---------------------------------------------------------------- klatka filmu
export const stan = { klatek: 0, dlugosc: 0 };

export async function przygotuj(): Promise<void> {
  await zaladujKroje();
  zbudujOs();
  await wczytajMeta();
  przygotujObrobke();
  const logo = await wczytajObraz(logoUrl);
  rozdzielSerce(zabarw(logo, MENU.logoBarwa));
  for (const u of [dollumUrl, pillowUrl, podpisUrl]) znakiZespolu.push(await wczytajObraz(u));
  const koniec = Math.max(...SCENARIUSZ.map((w: Dowolny) => w.od + w.dl));
  stan.dlugosc = koniec; stan.klatek = ff(koniec);
}

/** Ustawienia obróbki (do prób). */
export const obrobka = { jasnosc: 1.06, kontrast: 1.06, nasycenie: 1.04, ziarno: 0.035, winieta: 1, wstrzas: 9 };

export async function klatka(i: number, jakosc = 0.95): Promise<string> {
  const t = i / FPS;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  // --- warstwa gry
  const aktywne = klipy.filter((k) => i >= k.od && i < k.do).sort((a, b) => a.od - b.od);
  const drz = wstrzas(t) * obrobka.wstrzas;
  let bylaGra = false;
  for (const k of aktywne) {
    const a = krycie(k, i);
    if (a <= 0.002) continue;
    const nr = Math.max(0, Math.min(k.klatek - 1, k.zapas + (i - k.i0)));
    const bmp = await klatkaUjecia(k.u.id, nr);
    ctx.save();
    ctx.globalAlpha = a;
    if (drz > 0.05) {
      const dx = (los(i * 3 + 1) - 0.5) * 2 * drz, dy = (los(i * 5 + 2) - 0.5) * 2 * drz;
      const sk = 1 + drz / 600;
      ctx.translate(W / 2 + dx, H / 2 + dy); ctx.scale(sk, sk); ctx.translate(-W / 2, -H / 2);
    }
    if (bmp) {
      ctx.filter = `brightness(${obrobka.jasnosc}) contrast(${obrobka.kontrast}) saturate(${obrobka.nasycenie})`;
      ctx.drawImage(bmp, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#1a1412'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#5a4a40'; ctx.font = `40px ${TEKST}`; ctx.textAlign = 'center';
      ctx.fillText(`${k.u.id} — brak klatki ${nr}`, W / 2, H / 2);
    }
    ctx.restore();
    bylaGra = true;
  }
  // błysk na cięciu (uderzenie)
  for (const k of klipy) {
    if (k.u.wejscie?.typ !== 'blysk') continue;
    const d = t - k.i0 / FPS, dl = k.u.wejscie.dl as number;
    if (d < -0.07 || d > dl + 0.5) continue;
    const a = d < 0 ? (d + 0.07) / 0.07 * 0.4 : Math.exp(-d / (dl * 0.3));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(1, a) * 0.7;
    ctx.fillStyle = 'rgb(255,226,190)'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (bylaGra) {
    ctx.globalAlpha = obrobka.winieta;
    ctx.drawImage(winieta, 0, 0);
    ctx.globalAlpha = 1;
  }

  // --- tło kart: pył i iskry na czerni (gdy gry nie widać)
  const karty = napisy.filter((w: Dowolny) => w.styl === 'karta' && t >= w.od - 0.3 && t < w.od + w.dl + 0.3);
  for (const w of karty) {
    const a = gladko((t - w.od + 0.3) / 0.8) * (1 - gladko((t - (w.od + w.dl - 0.6)) / 0.9));
    iskry(t, 0.5 * a, Math.round(w.od * 10));
  }

  // --- plansza tytułowa
  for (const w of tytuly) if (t >= w.od && t < w.od + w.dl) rysujTytul(w, t - w.od, t);

  // --- napisy
  for (const w of napisy) if (t >= w.od && t < w.od + w.dl) rysujNapis(w, t - w.od);

  // --- ziarno filmu na wszystkim
  if (obrobka.ziarno > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = obrobka.ziarno;
    const z = ziarna[Math.floor(los(i) * ziarna.length)];
    const ox = Math.floor(los(i + 7) * 3), oy = Math.floor(los(i + 9) * 3);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(z, -ox, -oy, W + 3, H + 3);
    ctx.restore();
  }
  ctx.restore();
  return canvas.toDataURL('image/jpeg', jakosc).split(',')[1];
}
