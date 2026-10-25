import { BARWA, rgba } from '../../../render/palette';
import { rekawiceDoRysunku, type RekawicaRys } from '../../../core/kursor';

/**
 * ANIMACJE SAMOUCZKA — wszystko, co rusza się nad grą: rękawica-duch, która pokazuje gest (klik, ramka,
 * przesunięcie, kółko), reflektor przyciemniający resztę ekranu, iskry przy zrobionym kroku, litery
 * wypisywane jedna po drugiej, ptaszek i paciorki postępu. Same rysunki — co i kiedy pokazać, wie
 * ../tutorial.ts, a treść lekcji ./lekcje.ts. Czas w milisekundach (performance.now), żadnych losowań
 * z symulacji: „losowość” iskier i żarzewia to stały skrót z numeru.
 */

export const klamra = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Postęp 0..1 na odcinku [a, b] osi czasu. */
export const odcinek = (t: number, a: number, b: number): number => klamra((t - a) / (b - a));

export const EASE = {
  inOut: (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: (t: number): number => 1 - Math.pow(1 - t, 3),
  inOutSine: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number): number => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

export const ZLOTO = (a: number): string => rgba(BARWA.zarBlady, a);
const ZAR = (a: number): string => rgba(BARWA.zar, a);

/** Stały skrót z liczby — „losowość” rysunku, ta sama w każdej klatce. */
export function los(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export interface Punkt { x: number; y: number }

// ------------------------------------------------------------------ rękawica-duch

let rekawice: { zwykla: RekawicaRys; klik: RekawicaRys } | null = null;
let laduje = false;

/** Rękawica z kursora gry, większa — wczytuje się raz, w tle (do tego czasu duch to świecący czubek palca). */
export function wczytajRekawice(): void {
  if (laduje) return;
  laduje = true;
  rekawiceDoRysunku(52).then((r) => { rekawice = r; }).catch(() => { /* zostaje czubek palca */ });
}

/** Rękawica-duch: czubek palca w (x, y), poświata pod nim; `wcisnieta` — palec wciska (kursor2). */
function rekawica(ctx: CanvasRenderingContext2D, x: number, y: number, wcisnieta: boolean, alfa: number, skala = 1): void {
  if (alfa <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alfa;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 26 * skala);
  g.addColorStop(0, ZLOTO(wcisnieta ? 0.5 : 0.3));
  g.addColorStop(1, ZLOTO(0));
  ctx.fillStyle = g;
  ctx.fillRect(x - 26 * skala, y - 26 * skala, 52 * skala, 52 * skala);
  const r = rekawice ? (wcisnieta ? rekawice.klik : rekawice.zwykla) : null;
  if (r) {
    ctx.shadowColor = ZLOTO(0.75);
    ctx.shadowBlur = 14;
    ctx.drawImage(r.plotno, x - r.czubekX * skala, y - r.czubekY * skala, r.w * skala, r.h * skala);
  } else {
    ctx.fillStyle = ZLOTO(0.95);
    ctx.beginPath(); ctx.arc(x, y, 7 * skala, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Fala po wciśnięciu: dwa pierścienie rozchodzą się od palca (`t` 0..1). */
function fala(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alfa: number, rMax = 34): void {
  for (const [opoz, skala] of [[0, 1], [0.18, 0.62]] as const) {
    const u = klamra((t - opoz) / (1 - opoz));
    if (u <= 0 || u >= 1) continue;
    const e = EASE.out(u);
    ctx.strokeStyle = ZLOTO(0.9 * (1 - u) * alfa);
    ctx.lineWidth = 2.4 * (1 - u) + 0.6;
    ctx.beginPath(); ctx.arc(x, y, 4 + e * rMax * skala, 0, Math.PI * 2); ctx.stroke();
  }
}

/** Mysz w zarysie: `prawy` 0..1 — świeci prawy przycisk, `kolko` — przesunięcie kółka (px) albo null. */
function mysz(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, prawy: number, kolko: number | null, alfa: number): void {
  const w = 13 * s, h = 20 * s;
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.85);
  ctx.fillStyle = 'rgba(11,8,7,0.7)';
  ctx.beginPath();
  ctx.moveTo(x - w, y - h * 0.2);
  ctx.quadraticCurveTo(x - w, y - h, x, y - h);
  ctx.quadraticCurveTo(x + w, y - h, x + w, y - h * 0.2);
  ctx.lineTo(x + w, y + h * 0.45);
  ctx.quadraticCurveTo(x + w, y + h, x, y + h);
  ctx.quadraticCurveTo(x - w, y + h, x - w, y + h * 0.45);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // prawy przycisk
  if (prawy > 0) {
    ctx.fillStyle = ZLOTO(0.85 * prawy);
    ctx.beginPath();
    ctx.moveTo(x + 1.5, y - h * 0.18);
    ctx.lineTo(x + 1.5, y - h + 2.5);
    ctx.quadraticCurveTo(x + w - 1.5, y - h + 2, x + w - 1.5, y - h * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - h * 0.18); ctx.moveTo(x - w, y - h * 0.18); ctx.lineTo(x + w, y - h * 0.18); ctx.stroke();
  // kółko
  const ko = kolko ?? 0;
  ctx.strokeStyle = kolko !== null ? ZLOTO(0.95) : rgba(BARWA.atramentMocny, 0.85);
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y - h * 0.72 + ko); ctx.lineTo(x, y - h * 0.42 + ko); ctx.stroke();
  ctx.restore();
}

/** Strzałka-szewron (kierunek `kat`), do pokazania ruchu. */
function szewron(ctx: CanvasRenderingContext2D, x: number, y: number, kat: number, r: number, alfa: number): void {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(kat);
  ctx.strokeStyle = ZLOTO(alfa);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.5, -r); ctx.lineTo(r * 0.5, 0); ctx.lineTo(-r * 0.5, r); ctx.stroke();
  ctx.restore();
}

export type Gest =
  /** Dotknij tu. */
  | { typ: 'klik'; x: number; y: number }
  /** Przeciągnij ramkę od rogu do rogu — `punkty` to postacie, które zaznaczy. */
  | { typ: 'ramka'; x0: number; y0: number; x1: number; y1: number; punkty: Punkt[] }
  /** Przesuń widok (prawym przyciskiem). */
  | { typ: 'przesun'; x: number; y: number }
  /** Przybliż i oddal (kółkiem). */
  | { typ: 'kolko'; x: number; y: number };

/**
 * Pokaz gestu: rękawica-duch powtarza go w pętli. `t` — ms od początku pokazu, `alfa` — jak mocno widać ducha
 * (przygasa, gdy gracz sam działa).
 */
export function rysujGest(ctx: CanvasRenderingContext2D, g: Gest, t: number, alfa: number, w: number, h: number): void {
  if (alfa <= 0.01 || t < 0) return;
  ctx.save();
  if (g.typ === 'klik') klik(ctx, g.x, g.y, t, alfa, w, h);
  else if (g.typ === 'ramka') ramka(ctx, g, t, alfa);
  else if (g.typ === 'przesun') przesun(ctx, g.x, g.y, t, alfa);
  else kolko(ctx, g.x, g.y, t, alfa);
  ctx.restore();
}

function klik(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alfa: number, w: number, h: number): void {
  const P = 2700, u = t % P;
  // rękawica nadlatuje łukiem z dołu, z prawej (albo z drugiej strony, gdy przy krawędzi brak miejsca)
  const kx = x > w - 130 ? -1 : 1, ky = y > h - 130 ? -1 : 1;
  const sx = x + 74 * kx, sy = y + 84 * ky;
  const ruch = EASE.inOut(odcinek(u, 150, 1000));
  const cx = (sx + x) / 2 + 26 * kx, cy = (sy + y) / 2 - 22 * ky;
  const px = (1 - ruch) * (1 - ruch) * sx + 2 * (1 - ruch) * ruch * cx + ruch * ruch * x;
  const py = (1 - ruch) * (1 - ruch) * sy + 2 * (1 - ruch) * ruch * cy + ruch * ruch * y;
  const wcisk = u >= 1000 && u < 1190;
  const widac = odcinek(u, 0, 260) * (1 - odcinek(u, 1950, 2250));
  fala(ctx, x, y, odcinek(u, 1000, 1650), alfa);
  // pod palcem w chwili wciśnięcia — krótki błysk
  const b = odcinek(u, 1000, 1250);
  if (b > 0 && b < 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 22);
    g.addColorStop(0, ZLOTO(0.55 * (1 - b) * alfa)); g.addColorStop(1, ZLOTO(0));
    ctx.fillStyle = g; ctx.fillRect(x - 22, y - 22, 44, 44);
  }
  rekawica(ctx, px, py, wcisk, widac * alfa, wcisk ? 0.9 : 1);
}

function ramka(ctx: CanvasRenderingContext2D, g: Extract<Gest, { typ: 'ramka' }>, t: number, alfa: number): void {
  const P = 3700, u = t % P;
  const sx = g.x0 - 58, sy = g.y0 - 46;
  const doRogu = EASE.inOut(odcinek(u, 150, 800));
  const ciag = EASE.inOut(odcinek(u, 950, 2050));
  const px = u < 950 ? lerp(sx, g.x0, doRogu) : lerp(g.x0, g.x1, ciag);
  const py = u < 950 ? lerp(sy, g.y0, doRogu) : lerp(g.y0, g.y1, ciag);
  const wcisk = u >= 850 && u < 2150;
  const widac = odcinek(u, 0, 260) * (1 - odcinek(u, 2700, 3000));
  // ramka rośnie za rękawicą — złota, przerywana, jak w grze
  if (u >= 850 && u < 2900) {
    const zgas = 1 - odcinek(u, 2150, 2900);
    const x0 = Math.min(g.x0, px), y0 = Math.min(g.y0, py), rw = Math.abs(px - g.x0), rh = Math.abs(py - g.y0);
    const blysk = u >= 2150 ? 1 - odcinek(u, 2150, 2550) : 0;
    ctx.fillStyle = `rgba(255,214,140,${(0.08 + 0.2 * blysk) * zgas * alfa})`;
    ctx.fillRect(x0, y0, rw, rh);
    // ciemny podkład — na jasnej ścianie sali sama złota kreska ginęła
    ctx.strokeStyle = `rgba(12,8,6,${0.55 * zgas * alfa})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(x0, y0, rw, rh);
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -t * 0.03;
    ctx.strokeStyle = ZLOTO((0.85 + 0.15 * blysk) * zgas * alfa);
    ctx.lineWidth = 2 + blysk;
    ctx.strokeRect(x0, y0, rw, rh);
    ctx.setLineDash([]);
    // narożniki
    const n = Math.min(10, rw / 3, rh / 3);
    ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9 * zgas * alfa);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [cx, cy, sx2, sy2] of [[x0, y0, 1, 1], [x0 + rw, y0, -1, 1], [x0, y0 + rh, 1, -1], [x0 + rw, y0 + rh, -1, -1]] as const) {
      ctx.moveTo(cx + sx2 * n, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy2 * n);
    }
    ctx.stroke();
  }
  // po puszczeniu: zaznaczeni dostają złote obręcze, które wskakują jedna po drugiej
  g.punkty.forEach((q, i) => {
    const v = odcinek(u, 2150 + i * 90, 2550 + i * 90) * (1 - odcinek(u, 3000, 3400));
    if (v <= 0) return;
    const s = EASE.outBack(klamra(v * 1.4));
    ctx.beginPath(); ctx.ellipse(q.x, q.y, 11 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(12,8,6,${0.5 * Math.min(1, v * 2) * alfa})`;
    ctx.lineWidth = 3.6;
    ctx.stroke();
    ctx.strokeStyle = ZLOTO(0.95 * Math.min(1, v * 2) * alfa);
    ctx.lineWidth = 1.8;
    ctx.stroke();
  });
  rekawica(ctx, px, py, wcisk, widac * alfa, wcisk ? 0.92 : 1);
}

function przesun(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alfa: number): void {
  const P = 3000, u = t % P;
  const A = x + 80, B = x - 80;
  const ciag = EASE.inOut(odcinek(u, 380, 1450));
  const px = lerp(A, B, ciag);
  const wcisk = u >= 300 && u < 1520;
  const widac = odcinek(u, 0, 250) * (1 - odcinek(u, 1800, 2100));
  // ślad: kropki, które gasną za rękawicą
  if (wcisk || u < 1900) {
    for (let k = 1; k <= 9; k++) {
      const tk = odcinek(u - k * 45, 380, 1450);
      if (tk <= 0 || (u - k * 45) > 1450 + 400) continue;
      const qx = lerp(A, B, EASE.inOut(tk));
      ctx.fillStyle = ZLOTO(0.5 * (1 - k / 10) * widac * alfa);
      ctx.beginPath(); ctx.arc(qx, y, 3.4 - k * 0.25, 0, Math.PI * 2); ctx.fill();
    }
  }
  // szewrony po bokach: w którą stronę jedzie widok
  const drg = Math.sin(t * 0.006) * 3;
  szewron(ctx, x - 128 + drg, y, Math.PI, 7, 0.45 * widac * alfa);
  szewron(ctx, x + 128 - drg, y, 0, 7, 0.45 * widac * alfa);
  mysz(ctx, px + 34, y + 30, 1, wcisk ? 1 : 0.15, null, widac * alfa);
  rekawica(ctx, px, y, wcisk, widac * alfa, wcisk ? 0.92 : 1);
}

function kolko(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alfa: number): void {
  const faza = Math.sin(t * 0.0028);           // > 0 — przybliża, < 0 — oddala
  const widac = odcinek(t, 0, 350);
  const rx = x + 46;
  // pierścienie: rosną przy przybliżaniu, maleją przy oddalaniu
  for (let k = 0; k < 3; k++) {
    const r = (14 + k * 11) * (1 + 0.3 * faza);
    ctx.strokeStyle = ZLOTO((0.75 - k * 0.2) * widac * alfa);
    ctx.lineWidth = 1.6 - k * 0.3;
    ctx.beginPath(); ctx.arc(rx, y, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = ZLOTO(0.95 * widac * alfa);
  ctx.font = '600 18px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(faza > 0 ? '+' : '−', rx, y + 1);
  // mysz z kręcącym się kółkiem i rękawica nad nią
  const mx = x - 40;
  mysz(ctx, mx, y + 6, 1.15, 0, -faza * 4, widac * alfa);
  szewron(ctx, mx, y - 34, -Math.PI / 2, 6, (faza > 0 ? 0.9 : 0.2) * widac * alfa);
  szewron(ctx, mx, y + 44, Math.PI / 2, 6, (faza < 0 ? 0.9 : 0.2) * widac * alfa);
  rekawica(ctx, mx + 2, y - 10, false, widac * alfa * 0.95);
}

// ------------------------------------------------------------------ reflektor

/** Cel reflektora na ekranie: krąg (x, y, r) albo — z `w` i `h` — prostokąt o środku (x, y) i rogach r. */
export interface CelEkranu { x: number; y: number; r: number; w?: number; h?: number }

interface Ksztalt { x: number; y: number; w: number; h: number; r: number }

/** Punkt na obwodzie prostokąta z zaokrąglonymi rogami (`f` 0..1, od lewego górnego rogu w prawo). */
function punktObwodu(k: Ksztalt, f: number): Punkt {
  const r = Math.min(k.r, k.w / 2, k.h / 2);
  const x0 = k.x - k.w / 2, y0 = k.y - k.h / 2, a = k.w - 2 * r, b = k.h - 2 * r, l = Math.PI * r / 2;
  let d = (((f % 1) + 1) % 1) * (2 * a + 2 * b + 4 * l);
  const luk = (cx: number, cy: number, od: number, u: number): Punkt => ({ x: cx + Math.cos(od + u * Math.PI / 2) * r, y: cy + Math.sin(od + u * Math.PI / 2) * r });
  if (d < a) return { x: x0 + r + d, y: y0 }; d -= a;
  if (d < l) return luk(x0 + r + a, y0 + r, -Math.PI / 2, d / l); d -= l;
  if (d < b) return { x: x0 + k.w, y: y0 + r + d }; d -= b;
  if (d < l) return luk(x0 + r + a, y0 + r + b, 0, d / l); d -= l;
  if (d < a) return { x: x0 + r + a - d, y: y0 + k.h }; d -= a;
  if (d < l) return luk(x0 + r, y0 + r + b, Math.PI / 2, d / l); d -= l;
  if (d < b) return { x: x0, y: y0 + r + b - d }; d -= b;
  return luk(x0 + r, y0 + r, Math.PI, d / l);
}

function sciezka(ctx: CanvasRenderingContext2D, k: Ksztalt, o = 0): void {
  zaokraglony(ctx, k.x - k.w / 2 - o, k.y - k.h / 2 - o, k.w + 2 * o, k.h + 2 * o, k.r + o);
}

/**
 * Reflektor: reszta ekranu przygasa, jasny zostaje krąg (albo prostokąt — pole w oknie) wokół tego, w co trzeba
 * trafić. Kształt płynie od celu do celu i zaciska się na nim jak przesłona, krąg przechodzi w prostokąt i z powrotem;
 * po obwodzie krąży para iskierek, a co chwilę rozchodzi się puls. Krawędź jest miękka (rozmyta maska).
 */
export class Reflektor {
  private k: Ksztalt = { x: 0, y: 0, w: 120, h: 120, r: 60 };
  /** Jak mocno widać (0..1). */
  a = 0;
  private maska: HTMLCanvasElement | null = null;

  /** Obrys oświetlonego miejsca (albo null, gdy reflektora nie ma). */
  get obrys(): { x0: number; y0: number; x1: number; y1: number } | null {
    const k = this.k;
    return this.a > 0.05 ? { x0: k.x - k.w / 2, y0: k.y - k.h / 2, x1: k.x + k.w / 2, y1: k.y + k.h / 2 } : null;
  }

  /** Środek i promień (dla iskier po zrobionej fazie). */
  get srodek(): CelEkranu | null { return this.a > 0.05 ? { x: this.k.x, y: this.k.y, r: Math.min(this.k.w, this.k.h) / 2 } : null; }

  krok(cel: CelEkranu | null, dt: number): void {
    const k = 1 - Math.exp(-dt / 150);
    if (cel) {
      const d: Ksztalt = cel.w && cel.h ? { x: cel.x, y: cel.y, w: cel.w, h: cel.h, r: cel.r } : { x: cel.x, y: cel.y, w: cel.r * 2, h: cel.r * 2, r: cel.r };
      // pojawia się z szerokiego kształtu, który zaciska się na celu
      if (this.a < 0.03) this.k = { ...d, w: d.w * 2.6, h: d.h * 2.6, r: d.r * 2.6 };
      const t = this.k;
      t.x = lerp(t.x, d.x, k); t.y = lerp(t.y, d.y, k);
      t.w = lerp(t.w, d.w, k); t.h = lerp(t.h, d.h, k); t.r = lerp(t.r, d.r, k);
      this.a = lerp(this.a, 1, 1 - Math.exp(-dt / 260));
    } else {
      this.a = lerp(this.a, 0, 1 - Math.exp(-dt / 220));
    }
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    if (this.a < 0.01) return;
    const { k, a } = this;
    // maska: przyciemnienie z wyciętym, rozmytym otworem
    if (!this.maska) this.maska = document.createElement('canvas');
    const m = this.maska;
    if (m.width !== Math.ceil(w) || m.height !== Math.ceil(h)) { m.width = Math.ceil(w); m.height = Math.ceil(h); }
    const mc = m.getContext('2d')!;
    mc.clearRect(0, 0, m.width, m.height);
    mc.fillStyle = `rgba(6,4,3,${0.52 * a})`;
    mc.fillRect(0, 0, m.width, m.height);
    mc.globalCompositeOperation = 'destination-out';
    const miekko = Math.max(10, Math.min(k.w, k.h) * 0.22);
    if (typeof (mc as { filter?: unknown }).filter === 'string') {
      mc.filter = `blur(${miekko}px)`;
      sciezka(mc, k, miekko * 0.6);
      mc.fillStyle = '#000';
      mc.fill();
      mc.filter = 'none';
    } else {
      // bez filtrów (stare przeglądarki): miękka krawędź z kilku coraz szerszych obrysów
      for (let i = 4; i >= 0; i--) { sciezka(mc, k, i * miekko * 0.3); mc.fillStyle = `rgba(0,0,0,${0.25 + (4 - i) * 0.18})`; mc.fill(); }
    }
    mc.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.drawImage(m, 0, 0, w, h);
    const puls = 0.5 + 0.5 * Math.sin(teraz * 0.004);
    ctx.strokeStyle = ZLOTO((0.4 + 0.35 * puls) * a);
    ctx.lineWidth = 1.5;
    sciezka(ctx, k, 2 + puls * 2.5);
    ctx.stroke();
    // puls rozchodzi się od obwodu co 1,8 s
    const p = (teraz % 1800) / 1800;
    ctx.strokeStyle = ZLOTO(0.35 * (1 - p) * a);
    ctx.lineWidth = 1.2;
    sciezka(ctx, k, 2 + EASE.out(p) * Math.min(k.w, k.h) * 0.3);
    ctx.stroke();
    // dwie iskierki krążą po obwodzie
    const obw = { ...k, w: k.w + 5, h: k.h + 5, r: k.r + 2.5 };
    for (let i = 0; i < 2; i++) {
      const q = punktObwodu(obw, teraz * 0.00011 + i * 0.5);
      const gi = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 7);
      gi.addColorStop(0, ZLOTO(0.9 * a)); gi.addColorStop(1, ZLOTO(0));
      ctx.fillStyle = gi;
      ctx.fillRect(q.x - 7, q.y - 7, 14, 14);
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ iskry

interface Iskra { x: number; y: number; vx: number; vy: number; od: number; zycie: number; zar: boolean }

/** Iskry przy zrobionym kroku: rozbłysk, pierścień i garść iskier, które opadają i gasną. */
export class Iskry {
  private lista: Iskra[] = [];
  private kregi: { x: number; y: number; od: number; duze: boolean }[] = [];
  private nr = 0;

  wybuch(x: number, y: number, teraz: number, duze = false): void {
    const ile = duze ? 34 : 18;
    for (let i = 0; i < ile; i++) {
      const n = ++this.nr;
      const kat = los(n) * Math.PI * 2;
      const v = (duze ? 110 : 80) + los(n + 0.5) * (duze ? 260 : 170);
      this.lista.push({ x, y, vx: Math.cos(kat) * v, vy: Math.sin(kat) * v - 70, od: teraz, zycie: 650 + los(n + 0.25) * 550, zar: los(n + 0.75) < 0.35 });
    }
    this.kregi.push({ x, y, od: teraz, duze });
  }

  rysuj(ctx: CanvasRenderingContext2D, teraz: number): void {
    if (!this.lista.length && !this.kregi.length) return;
    ctx.save();
    // rozbłysk i pierścień
    this.kregi = this.kregi.filter((k) => teraz - k.od < 800);
    for (const k of this.kregi) {
      const u = (teraz - k.od) / 800;
      const R = k.duze ? 90 : 60;
      if (u < 0.3) {
        const f = u / 0.3;
        const g = ctx.createRadialGradient(k.x, k.y, 0, k.x, k.y, R * 0.6);
        g.addColorStop(0, ZLOTO(0.55 * (1 - f))); g.addColorStop(1, ZLOTO(0));
        ctx.fillStyle = g; ctx.fillRect(k.x - R, k.y - R, R * 2, R * 2);
      }
      ctx.strokeStyle = ZLOTO(0.85 * (1 - u));
      ctx.lineWidth = 2.6 * (1 - u) + 0.4;
      ctx.beginPath(); ctx.arc(k.x, k.y, 6 + EASE.out(u) * R, 0, Math.PI * 2); ctx.stroke();
    }
    // iskry: z oporem powietrza i grawitacją, jako krótkie smugi
    this.lista = this.lista.filter((s) => teraz - s.od < s.zycie);
    ctx.lineCap = 'round';
    for (const s of this.lista) {
      const pos = (tt: number) => {
        const d = (1 - Math.exp(-3 * tt)) / 3;
        return { x: s.x + s.vx * d, y: s.y + s.vy * d + 150 * tt * tt };
      };
      const tt = (teraz - s.od) / 1000;
      const a = pos(tt), b = pos(Math.max(0, tt - 0.035));
      const zycie = 1 - (teraz - s.od) / s.zycie;
      ctx.strokeStyle = s.zar ? ZAR(0.9 * zycie) : ZLOTO(0.95 * zycie);
      ctx.lineWidth = 1.2 + zycie * 1.3;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(a.x, a.y); ctx.stroke();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ litery, ptaszek, paciorki

const szerokosciLiter = new Map<string, number[]>();

/**
 * Napis wypisywany litera po literze: każda wschodzi z lekkim uniesieniem i rozjaśnieniem. `od` — ms od początku
 * wypisywania (ujemne: jeszcze nic), `znika` — 0..1, napis odpływa w górę i gaśnie. Zwraca, czy już cały widać.
 */
export function wypisz(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, od: number, kolor: (a: number) => string,
  opcje: { krok?: number; czas?: number; dy?: number; znika?: number } = {}): boolean {
  const krok = opcje.krok ?? 16, czas = opcje.czas ?? 260, dy = opcje.dy ?? 7, znika = opcje.znika ?? 0;
  const klucz = ctx.font + '|' + tekst;
  let xs = szerokosciLiter.get(klucz);
  if (!xs) {
    xs = [];
    for (let i = 0; i <= tekst.length; i++) xs.push(ctx.measureText(tekst.slice(0, i)).width);
    if (szerokosciLiter.size > 200) szerokosciLiter.clear();
    szerokosciLiter.set(klucz, xs);
  }
  const wyr = ctx.textAlign;
  const x0 = wyr === 'center' ? x - xs[tekst.length] / 2 : wyr === 'right' ? x - xs[tekst.length] : x;
  ctx.save();
  ctx.textAlign = 'left';
  for (let i = 0; i < tekst.length; i++) {
    const a = EASE.out(klamra((od - i * krok) / czas)) * (1 - znika);
    if (a <= 0.01 || tekst[i] === ' ') continue;
    ctx.fillStyle = kolor(a);
    ctx.fillText(tekst[i], x0 + xs[i], y + (1 - a) * dy - znika * 8);
  }
  ctx.restore();
  return od >= (tekst.length - 1) * krok + czas;
}

/** Ptaszek rysowany jednym pociągnięciem (`t` 0..1). */
export function ptaszek(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, alfa: number): void {
  if (t <= 0) return;
  const pkt: [number, number][] = [[x, y], [x + s * 0.38, y + s * 0.36], [x + s, y - s * 0.5]];
  const d1 = Math.hypot(pkt[1][0] - pkt[0][0], pkt[1][1] - pkt[0][1]);
  const d2 = Math.hypot(pkt[2][0] - pkt[1][0], pkt[2][1] - pkt[1][1]);
  const dl = (d1 + d2) * EASE.out(t);
  ctx.save();
  ctx.strokeStyle = ZLOTO(alfa);
  ctx.lineWidth = Math.max(2, s * 0.16);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = ZLOTO(0.8 * alfa); ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(pkt[0][0], pkt[0][1]);
  if (dl <= d1) ctx.lineTo(lerp(pkt[0][0], pkt[1][0], dl / d1), lerp(pkt[0][1], pkt[1][1], dl / d1));
  else {
    ctx.lineTo(pkt[1][0], pkt[1][1]);
    const u = (dl - d1) / d2;
    ctx.lineTo(lerp(pkt[1][0], pkt[2][0], u), lerp(pkt[1][1], pkt[2][1], u));
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Paciorki postępu: romby lekcji — zrobione złote, bieżący pulsuje, dalsze w zarysie. Świeżo zrobiony
 * (`zrobionyOd` ms temu) wskakuje z przeskokiem i rozsyła obręcz.
 */
export function paciorki(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ile: number, biezacy: number, biezacyZrobiony: boolean,
  zrobionyOd: number, teraz: number, alfa: number): void {
  ctx.save();
  for (let i = 0; i < ile; i++) {
    const px = x + i * s * 1.75;
    const zrobiony = i < biezacy || (i === biezacy && biezacyZrobiony);
    let r = s * 0.5;
    if (i === biezacy && biezacyZrobiony) {
      const u = odcinek(teraz - zrobionyOd, 0, 420);
      r *= u < 1 ? EASE.outBack(u) : 1;
      const o = odcinek(teraz - zrobionyOd, 0, 700);
      if (o < 1) {
        ctx.strokeStyle = ZLOTO(0.8 * (1 - o) * alfa);
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(px, y, s * 0.5 + o * s * 1.6, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (i === biezacy) r *= 1 + 0.12 * Math.sin(teraz * 0.006);
    ctx.beginPath();
    ctx.moveTo(px, y - r); ctx.lineTo(px + r * 0.8, y); ctx.lineTo(px, y + r); ctx.lineTo(px - r * 0.8, y); ctx.closePath();
    if (zrobiony) { ctx.fillStyle = ZLOTO(0.95 * alfa); ctx.fill(); }
    else {
      ctx.strokeStyle = i === biezacy ? ZLOTO(0.9 * alfa) : rgba(BARWA.atramentCichy, 0.55 * alfa);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Prostokąt z zaokrąglonymi rogami (ścieżka). */
export function zaokraglony(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ------------------------------------------------------------------ finał

/** Winieta: brzegi ekranu toną w czerni. */
export function winieta(ctx: CanvasRenderingContext2D, w: number, h: number, a: number): void {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.8 * a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Pasy kinowe u góry i u dołu (`a` 0..1 — jak daleko wjechały). */
export function pasyKinowe(ctx: CanvasRenderingContext2D, w: number, h: number, a: number): void {
  if (a <= 0.01) return;
  const p = h * 0.075 * EASE.inOut(a);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, p);
  ctx.fillRect(0, h - p, w, p);
}

/**
 * Pył mijany w locie: drobiny w głębi przesuwają się po ekranie szybciej albo wolniej (paralaksa), gdy kamera płynie
 * — `przesuniecie` to jej położenie w pikselach ekranu, `a` — jak mocno widać.
 */
export function pylWLocie(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, przesX: number, przesY: number, a: number): void {
  if (a <= 0.01) return;
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const glab = 0.35 + los(i + 0.2) * 0.9;
    const px = x0 + ((((los(i) * w - przesX * glab) % w) + w) % w);
    const py = y0 + ((((los(i + 0.5) * h - przesY * glab) % h) + h) % h);
    const r = 0.6 + glab * 1.1;
    ctx.fillStyle = los(i + 0.7) < 0.3 ? ZLOTO(0.55 * a * glab) : rgba(BARWA.atrament, 0.35 * a * glab);
    ctx.fillRect(px - r / 2, py - r * 2.2, r, r * 4.4);
  }
  ctx.restore();
}

/** Żar nad śpiącym demonem: czerwona łuna, która oddycha, i iskry wznoszące się z kamienia. */
export function zarzewie(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, teraz: number, a: number): void {
  if (a <= 0.01) return;
  ctx.save();
  const oddech = 0.75 + 0.25 * Math.sin(teraz * 0.0021) + 0.08 * Math.sin(teraz * 0.0073);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
  g.addColorStop(0, rgba(BARWA.krewJasna, 0.42 * oddech * a));
  g.addColorStop(0.45, rgba(BARWA.krew, 0.22 * oddech * a));
  g.addColorStop(1, rgba(BARWA.krew, 0));
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 46; i++) {
    const okres = 2600 + los(i) * 2600;
    const u = ((teraz + los(i + 0.3) * okres) % okres) / okres;
    const ex = x + (los(i + 0.6) - 0.5) * r * 1.8 + Math.sin(u * 6 + i) * 6;
    const ey = y + r * 0.4 - u * r * 2.2;
    const al = Math.sin(u * Math.PI) * a;
    ctx.fillStyle = los(i + 0.9) < 0.5 ? ZAR(0.85 * al) : ZLOTO(0.8 * al);
    ctx.beginPath(); ctx.arc(ex, ey, 0.8 + los(i + 0.1) * 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
