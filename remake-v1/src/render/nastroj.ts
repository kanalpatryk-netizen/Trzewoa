import { glif } from './tajemnica';
import { FRESK } from '../nastawy/barwy';
import { NASTROJ as N } from '../nastawy/wyglad/nastroj';
import { ustawienia } from '../core/settings-store';

/**
 * Nastrój ściany krypty: pył unoszący się w świetle lampki i napisy nieznanym pismem,
 * które same pojawiają się w tynku, żarzą chwilę i gasną. Do tego płynne przejścia
 * (krążek pod kursorem rozjaśnia się, zamiast przeskakiwać). Liczby: nastawy/wyglad/nastroj.ts.
 */

/** Czy wolno się ruszać (ustawienia → „ogranicz ruch”). */
export const wolnoRuszac = (): boolean => !ustawienia.ograniczRuch;

/** Liczba pseudolosowa 0..1 z ziarna — ta sama za każdym razem. */
function los(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

const plynne = new Map<string, { v: number; t: number }>();

/**
 * Wartość, która płynnie dochodzi do `cel` (0..1): krążek pod kursorem rozjaśnia się przez
 * chwilę, zamiast przeskoczyć. `klucz` — czyja to wartość (np. „ryt-nakarm”).
 */
export function plynnie(klucz: string, cel: number, ms = N.podswietlenieMs): number {
  const teraz = typeof performance !== 'undefined' ? performance.now() : 0;
  const s = plynne.get(klucz);
  if (!s || !wolnoRuszac()) { plynne.set(klucz, { v: cel, t: teraz }); return cel; }
  const dt = Math.max(0, Math.min(200, teraz - s.t));
  s.t = teraz;
  s.v += (cel - s.v) * (1 - Math.exp(-dt / ms));
  if (Math.abs(cel - s.v) < 0.002) s.v = cel;
  return s.v;
}

/** Pył w świetle lampki: drobiny wznoszą się powoli, kołyszą i mienią, gdy wpadną w światło. */
export function pyl(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, lx: number, ly: number): void {
  const t = teraz * 0.001;
  const R = Math.max(w, h);
  ctx.save();
  for (let i = 0; i < N.pylIle; i++) {
    const a = los(i * 3 + 1), b = los(i * 3 + 2), c = los(i * 3 + 3);
    const tempo = (N.pylTempo[0] + (N.pylTempo[1] - N.pylTempo[0]) * a) * h;
    const okres = h + 40;
    const y = h + 20 - ((t * tempo + b * okres) % okres);
    const x = ((a * 7.31 + c) % 1) * w + Math.sin(t * (0.25 + c * 0.4) + i * 1.7) * (10 + 18 * b);
    const d = Math.hypot(x - lx, y - ly) / R;
    const swiatlo = Math.max(0, 1 - d * 1.7);
    const migot = 0.55 + 0.45 * Math.sin(t * (1.1 + 2.6 * c) + i * 5.3);
    const alfa = N.pylKrycie[0] + (N.pylKrycie[1] - N.pylKrycie[0]) * swiatlo * migot;
    const r = 0.5 + 1.2 * c;
    ctx.fillStyle = `rgba(232,196,150,${alfa})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Napisy na ścianie: niewidzialna ręka wydrapuje w tynku przy brzegu ekranu kilka znaków
 * nieznanego pisma (znak po znaku), żarzą się chwilę jak węgle i gasną. Nikt nie wie, co mówią.
 */
export function napisyNaScianie(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
  const [zr, zg, zb] = FRESK.zar;
  for (let n = 0; n < N.napisowNaraz; n++) {
    const tt = teraz + n * N.napisOkres * 0.53;
    const cykl = Math.floor(tt / N.napisOkres);
    const f = (tt % N.napisOkres) / N.napisOkres;
    // pisze się (0–0,25), trwa (do 0,55), gaśnie (do 0,85), potem nic
    const gasnie = f < 0.55 ? 1 : f < 0.85 ? 1 - (f - 0.55) / 0.3 : 0;
    if (gasnie <= 0.01) continue;
    const pisze = Math.min(1, f / 0.25);
    const l = (k: number) => los(cykl * 17.3 + n * 101.7 + k * 7.1);
    const bok = Math.floor(l(1) * 4);
    const dl = 3 + Math.floor(l(2) * 5);
    const s = N.napisRozmiar * (0.8 + 0.5 * l(3));
    const krok = s * 2.7;
    const pion = bok < 2;
    const x0 = pion ? (bok === 0 ? w * (0.012 + 0.03 * l(4)) : w * (0.958 + 0.03 * l(4))) : w * (0.12 + 0.66 * l(5));
    const y0 = pion ? h * (0.14 + 0.6 * l(5)) : (bok === 2 ? h * (0.012 + 0.012 * l(4)) : h * (0.955 + 0.03 * l(4)));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < dl; i++) {
      const a = Math.max(0, Math.min(1, (pisze * dl - i) * 1.5)) * gasnie;
      if (a <= 0.01) continue;
      const px = pion ? x0 : x0 + i * krok, py = pion ? y0 + i * krok : y0;
      const g = glif(cykl * 29 + n * 11 + i, 1);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(s, s);
      // rysa w tynku pod żarem
      ctx.lineWidth = 2.2 / s;
      ctx.strokeStyle = `rgba(0,0,0,${0.35 * a})`;
      ctx.stroke(g);
      ctx.lineWidth = 1.1 / s;
      ctx.shadowColor = `rgba(${zr},${zg},${zb},${0.7 * a})`;
      ctx.shadowBlur = 7;
      ctx.strokeStyle = `rgba(${zr},${zg},${zb},${N.napisKrycie * a})`;
      ctx.stroke(g);
      ctx.restore();
    }
    ctx.restore();
  }
}
