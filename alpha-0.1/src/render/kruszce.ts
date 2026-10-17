import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Plate } from './plate';
import type { RodzajKruszcu, Urobek } from '../sim/kruszce';
import { OKRUCH } from '../nastawy/kruszce';
import { wolnoRuszac } from './nastroj';

/**
 * KRUSZCE (Alpha, etap 3b) — żelazo i złoto nad płytą i ich animacja:
 *  - z rozbitego kafla rudy wyskakuje okruch i leci łukiem do licznika; w miejscu kafla przy złocie
 *    złoty błysk, przy żelazie iskry;
 *  - licznik podbija liczbę dopiero, gdy okruch doleci — błyska (złotem albo iskrą) i liczba na chwilę rośnie.
 * Symulacja tylko odkłada świeży urobek (sim.urobek, sim/kruszce.ts). Animacja idzie zegarem ekranu,
 * nie tikami gry — pauza ani tempo jej nie szarpią. Liczby: OKRUCH w src/nastawy/kruszce.ts.
 */

/** Barwy: sztabka i okruch żelaza (stal i rdza rudy), samorodek i okruch złota. */
const BARWA: Record<RodzajKruszcu, { jasna: string; ciemna: string; obrys: string; blask: [number, number, number] }> = {
  zelazo: { jasna: 'rgba(176,184,196,1)', ciemna: 'rgba(118,62,44,1)', obrys: 'rgba(22,18,20,0.95)', blask: [255, 196, 120] },
  zloto: { jasna: 'rgba(255,222,128,1)', ciemna: 'rgba(196,140,46,1)', obrys: 'rgba(48,30,6,0.95)', blask: [255, 220, 120] },
};

/** Tani skrót liczby — stały kształt okrucha i kierunki iskier (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

interface Lot { rodzaj: RodzajKruszcu; ile: number; x: number; y: number; od: number; ziarno: number }

/** Okruchy w locie i błyski liczników — jedna para na ekran gry. */
export class Urobki {
  private widziane = new WeakSet<Urobek>();
  private loty: Lot[] = [];
  private doleciale: Record<RodzajKruszcu, number> = { zelazo: -1e9, zloto: -1e9 };
  /** Gdzie na ekranie stoją znaczki liczników (ustawia je rysowanie liczników nad płytą). */
  cele: Partial<Record<RodzajKruszcu, { x: number; y: number }>> = {};
  /** Okruch doleciał — ekran gry daje cichy brzęk. */
  onDolot: ((rodzaj: RodzajKruszcu) => void) | null = null;

  /** Bierze świeży urobek z symulacji — każdy kafel rudy to jeden okruch. */
  zbierz(sim: Sim, teraz: number): void {
    for (const u of sim.urobek) {
      if (this.widziane.has(u)) continue;
      this.widziane.add(u);
      // „mniej ruchu”: bez lotu — licznik rośnie od razu
      if (wolnoRuszac()) this.loty.push({ rodzaj: u.rodzaj, ile: u.ile, x: u.x, y: u.y, od: teraz, ziarno: u.x * 7919 + u.y * 104729 + u.tik });
    }
  }

  /** Ile kruszcu jest jeszcze w powietrzu — licznik pokazuje stan symulacji bez tego. */
  wLocie(rodzaj: RodzajKruszcu): number {
    let n = 0;
    for (const l of this.loty) if (l.rodzaj === rodzaj) n += l.ile;
    return n;
  }

  /** Błysk licznika po doleceniu okrucha: 1 tuż po, 0 po OKRUCH.blyskMs. */
  blysk(rodzaj: RodzajKruszcu, teraz: number): number {
    return Math.max(0, 1 - (teraz - this.doleciale[rodzaj]) / OKRUCH.blyskMs);
  }

  /** Chwila ostatniego dolotu — ziarno kierunków iskier, stałe przez cały błysk. */
  dolot(rodzaj: RodzajKruszcu): number { return this.doleciale[rodzaj]; }

  /** W świecie (pod kamerą): rozbłysk w miejscu rozbitego kafla — złoty przy złocie, iskry przy żelazie. */
  rysujNaMapie(ctx: CanvasRenderingContext2D, cam: Camera, teraz: number): void {
    const z = cam.zoom;
    ctx.save();
    for (const l of this.loty) {
      const p = (teraz - l.od) / OKRUCH.rozbloskMs;
      if (p < 0 || p > 1) continue;
      const sx = cam.toScreenX(l.x + 0.5), sy = cam.toScreenY(l.y + 0.5);
      if (sx < -z * 3 || sy < -z * 3 || sx > cam.vw + z * 3 || sy > cam.vh + z * 3) continue;
      const g = 1 - p;
      const [r, gg, b] = BARWA[l.rodzaj].blask;
      if (l.rodzaj === 'zloto') {
        // złoty błysk: poświata i czteroramienna gwiazda, która rośnie i gaśnie
        const R = z * (0.8 + p * 1.6);
        const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        rg.addColorStop(0, `rgba(${r},${gg},${b},${0.75 * g})`);
        rg.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
        ctx.strokeStyle = `rgba(255,244,200,${0.95 * g})`;
        ctx.lineWidth = Math.max(1, z * 0.08);
        const ram = z * (0.5 + p * 1.3);
        ctx.beginPath();
        ctx.moveTo(sx - ram, sy); ctx.lineTo(sx + ram, sy);
        ctx.moveTo(sx, sy - ram); ctx.lineTo(sx, sy + ram);
        ctx.stroke();
      } else {
        // iskry spod kilofa: żar w miejscu uderzenia i kreski rozlatujące się łukiem w dół
        const R = z * (0.6 + p * 0.8);
        const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        rg.addColorStop(0, `rgba(${r},${gg},${b},${0.55 * g})`);
        rg.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.5, z * 0.1);
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI * (0.05 + 0.9 * los(l.ziarno + k * 31));
          const v = z * (1 + 2 * los(l.ziarno * 3 + k));
          const px = sx + Math.cos(a) * v * p, py = sy + Math.sin(a) * v * p + z * 1.8 * p * p;
          const ogon = 0.4 * z;
          ctx.strokeStyle = `rgba(255,${Math.round(200 - 90 * p)},${Math.round(120 - 80 * p)},${g})`;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - Math.cos(a) * ogon, py - Math.sin(a) * ogon + ogon * p);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /** Na ekranie (nad płytą i ramą): okruchy lecące łukiem od kafla do licznika. */
  rysujLoty(ctx: CanvasRenderingContext2D, plate: Plate, cam: Camera, teraz: number): void {
    if (!this.loty.length) return;
    const z = cam.zoom;
    const zostaja: Lot[] = [];
    ctx.save();
    for (const l of this.loty) {
      const t = (teraz - l.od) / OKRUCH.lotMs;
      if (t >= 1) {
        this.doleciale[l.rodzaj] = teraz;
        this.onDolot?.(l.rodzaj);
        continue;
      }
      zostaja.push(l);
      // start: rozbity kafel (poza kadrem — z brzegu płyty, od strony kafla)
      const x0 = Math.max(plate.x, Math.min(plate.x + plate.w, plate.x + cam.toScreenX(l.x + 0.5)));
      const y0 = Math.max(plate.y, Math.min(plate.y + plate.h, plate.y + cam.toScreenY(l.y + 0.5)));
      const cel = this.cele[l.rodzaj] ?? { x: plate.x + 20, y: plate.y - 10 };
      const dx = cel.x - x0, dy = cel.y - y0;
      const d = Math.hypot(dx, dy);
      // łuk: najpierw w górę i lekko w bok, potem opada na licznik (nie wyżej niż tuż nad licznikiem — licznik
      // stoi przy górnej krawędzi ekranu, a okruch nie może z niego wylecieć)
      const kx = x0 + dx * 0.35, ky = Math.max(cel.y - 30, Math.min(y0, cel.y) - d * OKRUCH.luk);
      // najpierw podskok z kafla (wolno), potem przyspiesza ku licznikowi
      const e = t * t * (3 - 2 * t);
      const pkt = (s: number): [number, number] => [
        (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * kx + s * s * cel.x,
        (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * ky + s * s * cel.y,
      ];
      const [px, py] = pkt(e);
      const rozm = Math.max(6, Math.min(12, z * 0.55)) * (1 - 0.3 * e);
      const b = BARWA[l.rodzaj];
      const [r, g, bb] = b.blask;
      // smuga za okruchem i poświata wokół — na ciemnej skale i ramie musi go być widać
      for (let k = 1; k <= 7; k++) {
        const s = Math.max(0, e - k * 0.03);
        const [qx, qy] = pkt(s);
        ctx.fillStyle = `rgba(${r},${g},${bb},${0.4 * (1 - k / 8)})`;
        ctx.beginPath(); ctx.arc(qx, qy, rozm * (0.6 - k * 0.06), 0, Math.PI * 2); ctx.fill();
      }
      const halo = ctx.createRadialGradient(px, py, 0, px, py, rozm * 2.6);
      halo.addColorStop(0, `rgba(${r},${g},${bb},0.5)`);
      halo.addColorStop(1, `rgba(${r},${g},${bb},0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(px - rozm * 2.6, py - rozm * 2.6, rozm * 5.2, rozm * 5.2);
      // okruch: nieregularny wielokąt, obraca się w locie
      const obrot = l.ziarno + t * 9;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(obrot);
      ctx.beginPath();
      const n = 6;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const rr = rozm * (0.7 + 0.45 * los(l.ziarno + k * 17));
        if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      const gr = ctx.createLinearGradient(-rozm, -rozm, rozm, rozm);
      gr.addColorStop(0, b.jasna);
      gr.addColorStop(1, b.ciemna);
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.strokeStyle = b.obrys;
      ctx.lineWidth = 1;
      ctx.stroke();
      // błysk na krawędzi okrucha
      ctx.fillStyle = 'rgba(255,248,226,0.9)';
      ctx.beginPath(); ctx.arc(-rozm * 0.3, -rozm * 0.3, Math.max(0.8, rozm * 0.18), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    this.loty = zostaja;
  }
}

/**
 * Znaczek licznika w kwadracie `s` (środek w x, y): sztabka żelaza albo samorodek złota.
 * `k` 0..1 — błysk po doleceniu okrucha: złoto rozbłyskuje, z żelaza sypią się iskry (kierunki z `ziarna`).
 */
export function znaczekKruszcu(ctx: CanvasRenderingContext2D, rodzaj: RodzajKruszcu, x: number, y: number, s: number, k: number, ziarno: number): void {
  const b = BARWA[rodzaj];
  const [r, g, bb] = b.blask;
  ctx.save();
  if (k > 0) {
    const R = s * (1.1 + 1.3 * k);
    const rg = ctx.createRadialGradient(x, y, 0, x, y, R);
    rg.addColorStop(0, `rgba(${r},${g},${bb},${(rodzaj === 'zloto' ? 0.8 : 0.6) * k})`);
    rg.addColorStop(1, `rgba(${r},${g},${bb},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
  }
  ctx.translate(x, y);
  ctx.beginPath();
  if (rodzaj === 'zelazo') {
    // sztabka: ścięty klin widziany z ukosa — górna ściana jaśniejsza
    const w = s * 0.5, h = s * 0.22, sc = s * 0.14;
    ctx.moveTo(-w, h); ctx.lineTo(w, h); ctx.lineTo(w - sc, -h); ctx.lineTo(-w + sc, -h); ctx.closePath();
    const gr = ctx.createLinearGradient(0, -h, 0, h);
    gr.addColorStop(0, 'rgba(206,214,224,1)');
    gr.addColorStop(1, 'rgba(96,104,118,1)');
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = b.obrys; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(240,244,250,0.7)';
    ctx.beginPath(); ctx.moveTo(-w + sc + 1, -h + 1.5); ctx.lineTo(w - sc - 1, -h + 1.5); ctx.stroke();
  } else {
    // samorodek: grudka o nierównym brzegu
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = s * 0.4 * (0.78 + 0.3 * los(i * 13 + 5));
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.86); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.86);
    }
    ctx.closePath();
    const gr = ctx.createRadialGradient(-s * 0.12, -s * 0.12, 1, 0, 0, s * 0.45);
    gr.addColorStop(0, 'rgba(255,240,180,1)');
    gr.addColorStop(0.5, b.jasna);
    gr.addColorStop(1, b.ciemna);
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = b.obrys; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
  if (k <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  if (rodzaj === 'zloto') {
    // złoty błysk: gwiazdka na grzbiecie samorodka
    const ram = s * (0.35 + 0.75 * k);
    const sx = x + s * 0.18, sy = y - s * 0.2;
    ctx.strokeStyle = `rgba(255,248,214,${k})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sx - ram, sy); ctx.lineTo(sx + ram, sy);
    ctx.moveTo(sx, sy - ram); ctx.lineTo(sx, sy + ram);
    ctx.stroke();
  } else {
    // iskra: kilka kresek rozlatuje się od sztabki
    const p = 1 - k;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.02 + 0.96 * los(i * 7 + Math.floor(ziarno)));
      const v = s * (0.5 + (1 + 0.8 * los(i * 3 + 1)) * p);
      const px = x + Math.cos(a) * v, py = y + Math.sin(a) * v + s * 0.6 * p * p;
      ctx.strokeStyle = `rgba(255,${Math.round(220 - 80 * p)},${Math.round(150 - 100 * p)},${k})`;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(a) * s * 0.32, py - Math.sin(a) * s * 0.32); ctx.stroke();
    }
  }
  ctx.restore();
}
