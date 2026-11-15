/**
 * FILM NA POCZĄTEK GRY (Krąg Trzeci, beta) — polecenie użytkownika (15.11): „cutscenka na początku to nie ma być pokaz
 * slajdów oddzielanych spacją, tylko spójny filmik… ma pokazywać wydarzenie jedno po drugim albo cały przebieg
 * historii, tak jak normalnie są cutscenki w takich grach, coś w stylu komiksu”.
 *
 * Jeden ciągły film (ok. 75 s), rysowany w kodzie jak komiks w ruchu: kamera jedzie i najeżdża, cięcia, kadry
 * wjeżdżające na stronę, ramki narratora, dymki, wyrazy dźwiękonaśladowcze, rastrowa faktura druku. Przebieg:
 *  1. zjazd z burzowego nieba na krąg żarłoków w deszczu;           2. dwóch żarłoków bije się o ochłap;
 *  3. ziemia drży, za wzgórzem wyrastają trzy łby;                   4. Cerber wpada w tłum — szarpie, rozrywa, pożera;
 *  5. dwóch wędrowców, Cerber ryczy na nich z zakrwawioną paszczą;  6. przewodnik rzuca mu ziemię w gardła (3 kadry);
 *  7. pies żre, a oni przechodzą i schodzą w dół;                   8. oko w błocie — ktoś to widział;
 *  9. grabarz, mnich, rycerz wstają z błota (3 kadry);              10. szóstka razem: „zejdziemy i my”;
 * 11. kamera schodzi pod ziemię: trzewia i pieczęć na dnie;         12. Cerber podnosi zakrwawiony pysk i węszy. Tytuł.
 * Esc — pomija film. Potem scena wejścia (app/wstep-kregu.ts).
 */
import type { Sim } from '../sim/sim';
import { makeCreature, type Creature } from '../sim/creatures';
import { Race } from '../sim/races';
import { rysujPostac, type Czynnosc } from '../render/figury';
import { rysujCerbera, pozaCerbera, type PozaCerbera, type PunktyCerbera } from '../render/cerber';
import {
  rysujLudzika, pozaLezy, pozaCzolga, pozaWyje, pozaZre, pozaSzarpie, pozaWPaszczy, pozaTrup, pozaWstaje, pozaStoi,
  kaluzaKrwi, bryzgKrwi, type PozaLudzika,
} from '../render/ludzik';

export const DLUGOSC_FILMU = 75;
const KROJ = '"Trzewia Tekst", Georgia, serif';
const TUSZ = 'rgba(14,10,8,0.96)';
type P = [number, number];
interface Prost { x: number; y: number; w: number; h: number }
interface Kam { x: number; y: number; s: number }

const los = (n: number): number => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const gl = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const zakres = (t: number, a: number, b: number): number => gl((t - a) / (b - a));
const dzwon = (t: number, a: number, b: number): number => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI));
/** Kamera między klatkami kluczowymi [czas, x, y, s] — wygładzona. */
function kamera(t: number, kl: [number, number, number, number][]): Kam {
  if (t <= kl[0][0]) return { x: kl[0][1], y: kl[0][2], s: kl[0][3] };
  for (let i = 1; i < kl.length; i++) {
    if (t <= kl[i][0]) {
      const u = gl((t - kl[i - 1][0]) / (kl[i][0] - kl[i - 1][0]));
      return { x: mix(kl[i - 1][1], kl[i][1], u), y: mix(kl[i - 1][2], kl[i][2], u), s: mix(kl[i - 1][3], kl[i][3], u) };
    }
  }
  const o = kl[kl.length - 1];
  return { x: o[1], y: o[2], s: o[3] };
}

// ---------------------------------------------------------------- świat filmu (jednostki: wzrost człowieka = 1, grunt y = 0)

class Widok {
  constructor(public R: Prost, public k: Kam, public wstrzas = 0, public czas = 0) {}
  X(wx: number): number { return this.R.x + this.R.w / 2 + (wx - this.k.x) * this.k.s + this.dx(); }
  Y(wy: number): number { return this.R.y + this.R.h / 2 + (wy - this.k.y) * this.k.s + this.dy(); }
  dx(): number { return this.wstrzas ? Math.sin(this.czas * 0.09) * this.wstrzas * this.k.s * 0.06 : 0; }
  dy(): number { return this.wstrzas ? Math.cos(this.czas * 0.11) * this.wstrzas * this.k.s * 0.05 : 0; }
}

/** Niebo, ściany leja na horyzoncie, błotnisty taras. */
function tlo(ctx: CanvasRenderingContext2D, v: Widok, opts: { blysk?: number } = {}): void {
  const { R } = v;
  const yG = v.Y(0);
  const g = ctx.createLinearGradient(0, v.Y(-14), 0, yG);
  g.addColorStop(0, 'rgb(6,7,9)'); g.addColorStop(0.6, 'rgb(22,25,27)'); g.addColorStop(1, 'rgb(40,42,40)');
  ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
  // chmury
  ctx.fillStyle = 'rgba(30,34,36,0.7)';
  for (let i = 0; i < 9; i++) {
    const x = v.X(-40 + i * 10 + Math.sin(v.czas / 7000 + i) * 2), y = v.Y(-10 - (i % 3) * 1.5);
    ctx.beginPath(); ctx.ellipse(x, y, v.k.s * 7, v.k.s * 1.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  // tarasy wyższych kręgów — rzędy wygięte ku brzegom (wnętrze leja)
  const rzedy: [number, string][] = [[-7.5, 'rgb(26,26,28)'], [-5, 'rgb(34,34,34)'], [-2.6, 'rgb(44,44,42)']];
  for (const [wy, kol] of rzedy) {
    ctx.fillStyle = kol;
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const sx = R.x + (R.w * i) / 30, u = (sx - (R.x + R.w / 2)) / R.w;
      const y = v.Y(wy) - u * u * v.k.s * 6;
      if (i === 0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
    }
    ctx.lineTo(R.x + R.w, yG); ctx.lineTo(R.x, yG); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(140,140,124,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // grunt — błoto
  const gg = ctx.createLinearGradient(0, yG, 0, R.y + R.h);
  gg.addColorStop(0, 'rgb(54,50,38)'); gg.addColorStop(1, 'rgb(30,27,20)');
  ctx.fillStyle = gg; ctx.fillRect(R.x, yG, R.w, R.y + R.h - yG);
  ctx.fillStyle = 'rgba(110,120,116,0.18)';
  for (let i = 0; i < 26; i++) {
    const x = v.X(-40 + los(i * 7) * 80), y = v.Y(0.15 + los(i * 3) * 2.5);
    ctx.beginPath(); ctx.ellipse(x, y, v.k.s * (0.6 + los(i) * 1.4), v.k.s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (opts.blysk) { ctx.fillStyle = `rgba(220,230,240,${opts.blysk})`; ctx.fillRect(R.x, R.y, R.w, R.h); }
}

function deszcz(ctx: CanvasRenderingContext2D, R: Prost, czas: number, moc = 1): void {
  ctx.save();
  ctx.strokeStyle = `rgba(176,190,196,${0.28 * moc + 0.1})`; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 260 * moc; i++) {
    const x = R.x + ((los(i) * R.w * 1.3 + czas * 0.12) % (R.w * 1.3)) - R.w * 0.15;
    const y = R.y + ((los(i * 7) * R.h + czas * 1.1 * (0.8 + los(i * 3) * 0.5)) % R.h);
    ctx.moveTo(x, y); ctx.lineTo(x - 6, y - 22);
  }
  ctx.stroke();
  ctx.restore();
}

/** Żarłok w świecie filmu: biodro na wysokości zależnej od pozy, `zwrot`. */
function zarlok(ctx: CanvasRenderingContext2D, v: Widok, wx: number, p: PozaLudzika, zwrot = 1, skala = 1, wyBiodra?: number, t = 0): void {
  const lezy = Math.abs(p.tulow) > 1.1;
  const hb = wyBiodra ?? (lezy ? 0.08 : p.udoL > 1 ? 0.25 : 0.5);
  ctx.save();
  ctx.translate(v.X(wx), v.Y(-hb * skala));
  ctx.scale(zwrot, 1);
  rysujLudzika(ctx, v.k.s * skala, p, t);
  ctx.restore();
}

/** Tłum leżących, wyjących, żrących — z pominięciem przedziału [bezOd, bezDo]. */
function tlum(ctx: CanvasRenderingContext2D, v: Widok, t: number, bezOd = 1e9, bezDo = -1e9, ucieczkaOd?: number, odX = 0): void {
  for (let warstwa = 2; warstwa >= 0; warstwa--) {
    const sk = warstwa === 2 ? 0.62 : warstwa === 1 ? 0.8 : 1;
    ctx.save();
    ctx.globalAlpha = warstwa === 2 ? 0.6 : warstwa === 1 ? 0.82 : 1;
    for (let i = 0; i < 46; i++) {
      if (i % 3 !== warstwa) continue;
      let x = -34 + i * 1.5 + los(i * 11) * 0.8;
      if (x > bezOd && x < bezDo) continue;
      const r = los(i * 29);
      let p: PozaLudzika;
      if (ucieczkaOd !== undefined && t > ucieczkaOd && Math.abs(x - odX) < 9 && warstwa === 0) {
        const kier = x < odX ? -1 : 1;
        x += kier * (t - ucieczkaOd) * 0.9;
        p = pozaCzolga(t, 1.6, i);
        zarlokNaWarstwie(ctx, v, x, p, kier, sk, warstwa, t);
        continue;
      }
      p = r < 0.45 ? pozaLezy(t, i) : r < 0.62 ? pozaWyje(t, i) : r < 0.8 ? pozaZre(t, i) : pozaCzolga(t * 0.25, 0.5, i);
      zarlokNaWarstwie(ctx, v, x, p, los(i * 3) < 0.5 ? 1 : -1, sk, warstwa, t);
    }
    ctx.restore();
  }
}
function zarlokNaWarstwie(ctx: CanvasRenderingContext2D, v: Widok, x: number, p: PozaLudzika, zwrot: number, sk: number, warstwa: number, t: number): void {
  ctx.save();
  ctx.translate(0, -warstwa * v.k.s * 0.35);
  zarlok(ctx, v, x, p, zwrot, sk, undefined, t);
  ctx.restore();
}

/** Cerber w świecie filmu: stopy w (wx, 0), wysokość 3,2 człowieka. Zwraca paszcze w pikselach ekranu. */
function cerber(ctx: CanvasRenderingContext2D, v: Widok, wx: number, p: PozaCerbera, zwrot: number, wy = 0): P[] {
  const H = v.k.s * 3.2;
  ctx.save();
  ctx.translate(v.X(wx), v.Y(wy));
  ctx.scale(zwrot, 1);
  const pk: PunktyCerbera = rysujCerbera(ctx, H, p);
  ctx.restore();
  return pk.paszcze.map(([x, y]) => [v.X(wx) + x * zwrot, v.Y(wy) + y] as P);
}

/** Ofiara w paszczy: rysowana w punkcie paszczy (piksele), obrót, poza. */
function wPaszczy(ctx: CanvasRenderingContext2D, v: Widok, m: P, p: PozaLudzika, kat: number, t: number, skala = 1): void {
  ctx.save();
  ctx.translate(m[0], m[1]); ctx.rotate(kat);
  ctx.translate(-v.k.s * 0.17 * skala, v.k.s * 0.02);
  rysujLudzika(ctx, v.k.s * skala, p, t);
  ctx.restore();
}

/** Krople krwi kapiące z paszczy. */
function kapie(ctx: CanvasRenderingContext2D, m: P, s: number, czas: number, moc = 1): void {
  ctx.save(); ctx.fillStyle = 'rgb(120,12,8)';
  for (let i = 0; i < 4 * moc; i++) {
    const f = ((czas / 700) + i * 0.27) % 1;
    ctx.beginPath(); ctx.ellipse(m[0] + (i - 1.5) * s * 0.05, m[1] + f * s * 1.2, s * 0.018, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Wędrowiec w szacie (żywy — czerwień i kaptur, przewodnik — szarość i wieniec). Stopy w (0, 0), wzrost h. */
function wedrowiec(ctx: CanvasRenderingContext2D, h: number, zywy: boolean, krok: number, reka: number, schyla = 0): void {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, h * 0.022);
  const szata = zywy ? 'rgb(150,36,30)' : 'rgb(86,92,84)';
  const sk = 'rgb(214,190,160)';
  const n = Math.sin(krok) * h * 0.07;
  ctx.fillStyle = 'rgb(40,30,24)';
  ctx.beginPath(); ctx.ellipse(-h * 0.06 + n, -h * 0.02, h * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(h * 0.06 - n, -h * 0.02, h * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  // schylanie: tułów obraca się wokół bioder
  ctx.translate(0, -h * 0.42); ctx.rotate(schyla * 1.1); ctx.translate(0, h * 0.42);
  ctx.fillStyle = szata;
  ctx.beginPath();
  ctx.moveTo(-h * 0.18, -h * 0.03); ctx.lineTo(-h * 0.12, -h * 0.62); ctx.quadraticCurveTo(0, -h * 0.72, h * 0.12, -h * 0.62);
  ctx.lineTo(h * 0.2, -h * 0.03); ctx.closePath(); ctx.fill(); ctx.stroke();
  // fałdy
  ctx.strokeStyle = 'rgba(14,10,8,0.4)';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-h * 0.06 + i * h * 0.06, -h * 0.55); ctx.lineTo(-h * 0.1 + i * h * 0.08, -h * 0.05); ctx.stroke(); }
  ctx.strokeStyle = szata; ctx.lineWidth = h * 0.07;
  const rx = h * (0.12 + 0.2 * reka + 0.1 * schyla), ry = -h * (0.42 + 0.38 * reka - 0.3 * schyla);
  ctx.beginPath(); ctx.moveTo(h * 0.06, -h * 0.58); ctx.lineTo(rx, ry); ctx.stroke();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, h * 0.018);
  ctx.beginPath(); ctx.moveTo(h * 0.06, -h * 0.58); ctx.lineTo(rx, ry); ctx.stroke();
  ctx.fillStyle = sk; ctx.beginPath(); ctx.arc(rx, ry, h * 0.03, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = sk;
  ctx.beginPath(); ctx.arc(h * 0.02, -h * 0.8, h * 0.085, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (zywy) {
    ctx.fillStyle = szata;
    ctx.beginPath(); ctx.arc(0, -h * 0.82, h * 0.1, Math.PI * 0.95, Math.PI * 2.1); ctx.lineTo(-h * 0.1, -h * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgb(110,140,70)'; ctx.lineWidth = Math.max(1, h * 0.022);
    ctx.beginPath(); ctx.arc(h * 0.02, -h * 0.83, h * 0.09, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = 'rgb(200,196,186)';
    ctx.beginPath(); ctx.moveTo(-h * 0.02, -h * 0.76); ctx.lineTo(h * 0.09, -h * 0.76); ctx.lineTo(h * 0.04, -h * 0.68); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- komiks: ramki, dymki, dźwięki

function zawin(ctx: CanvasRenderingContext2D, tekst: string, max: number): string[] {
  const out: string[] = []; let l = '';
  for (const s of tekst.split(' ')) { const p = l ? l + ' ' + s : s; if (ctx.measureText(p).width > max && l) { out.push(l); l = s; } else l = p; }
  if (l) out.push(l);
  return out;
}

/** Ramka narratora (żółtawy pergamin, czarny brzeg) — lewy górny róg w (x, y), wsuwa się z `a`. */
function narrator(ctx: CanvasRenderingContext2D, x: number, y: number, tekst: string, a: number, maxW: number, r: number): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, a * 1.5);
  ctx.font = `italic ${r}px ${KROJ}`;
  const linie = zawin(ctx, tekst, maxW - r * 1.4);
  const w = Math.max(...linie.map((l) => ctx.measureText(l).width)) + r * 1.4, h = linie.length * r * 1.3 + r * 0.8;
  ctx.translate(x, y + (1 - gl(a)) * -r);
  ctx.fillStyle = 'rgb(232,220,176)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 2.5;
  ctx.fillRect(0, 0, w, h); ctx.strokeRect(0, 0, w, h);
  ctx.fillStyle = 'rgb(28,20,14)'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  linie.forEach((l, i) => ctx.fillText(l, r * 0.7, r * 0.45 + i * r * 1.3));
  ctx.restore();
}

/** Dymek z ogonkiem do (ox, oy). */
function dymek(ctx: CanvasRenderingContext2D, x: number, y: number, tekst: string, ox: number, oy: number, a: number, r: number, krzyk = false): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, a * 2);
  ctx.font = `${krzyk ? 'bold ' : ''}${r}px ${KROJ}`;
  const linie = zawin(ctx, tekst, r * 14);
  const w = Math.max(...linie.map((l) => ctx.measureText(l).width)) + r * 1.6, h = linie.length * r * 1.25 + r * 0.9;
  const sk = 0.7 + 0.3 * gl(a * 3);
  ctx.translate(x, y); ctx.scale(sk, sk);
  ctx.fillStyle = 'rgb(246,242,232)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (krzyk) {
    for (let i = 0; i < 18; i++) { const k = (i / 18) * Math.PI * 2, rr = i % 2 ? 1 : 1.18; ctx.lineTo(Math.cos(k) * w * 0.62 * rr, Math.sin(k) * h * 0.72 * rr); }
  } else ctx.ellipse(0, 0, w * 0.6, h * 0.66, 0, 0, Math.PI * 2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // ogonek
  const tx = (ox - x) / sk, ty = (oy - y) / sk;
  const kat = Math.atan2(ty, tx);
  ctx.beginPath();
  ctx.moveTo(Math.cos(kat + 0.25) * w * 0.45, Math.sin(kat + 0.25) * h * 0.5);
  ctx.lineTo(tx * 0.8, ty * 0.8);
  ctx.lineTo(Math.cos(kat - 0.25) * w * 0.45, Math.sin(kat - 0.25) * h * 0.5);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgb(22,16,12)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  linie.forEach((l, i) => ctx.fillText(l, 0, (i - (linie.length - 1) / 2) * r * 1.25));
  ctx.restore();
}

/** Wyraz dźwiękonaśladowczy: wielkie, postrzępione litery, wyskakują. */
function sfx(ctx: CanvasRenderingContext2D, x: number, y: number, tekst: string, r: number, a: number, kat = -0.12, kolor = 'rgb(220,40,24)'): void {
  if (a <= 0 || a >= 1) return;
  ctx.save();
  const sk = a < 0.25 ? 0.4 + 2.4 * a * 2.4 : 1;
  ctx.globalAlpha *= a > 0.8 ? (1 - a) * 5 : 1;
  ctx.translate(x, y); ctx.rotate(kat); ctx.scale(Math.min(1.15, sk), Math.min(1.15, sk));
  ctx.font = `bold ${r}px Impact, "Arial Black", ${KROJ}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = TUSZ; ctx.lineWidth = r * 0.22; ctx.strokeText(tekst, 0, 0);
  ctx.fillStyle = 'rgb(250,214,90)'; ctx.fillText(tekst, r * 0.04, r * 0.04);
  ctx.fillStyle = kolor; ctx.fillText(tekst, 0, 0);
  ctx.restore();
}

/** Linie pędu (akcja) — promieniście od punktu. */
function linieAkcji(ctx: CanvasRenderingContext2D, R: Prost, x: number, y: number, a: number): void {
  if (a <= 0) return;
  ctx.save();
  ctx.strokeStyle = `rgba(240,236,220,${0.35 * a})`; ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const k = (i / 40) * Math.PI * 2 + los(i) * 0.1;
    const r0 = R.h * (0.35 + los(i * 3) * 0.2);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(k) * r0, y + Math.sin(k) * r0); ctx.lineTo(x + Math.cos(k) * R.w, y + Math.sin(k) * R.w); ctx.stroke();
  }
  ctx.restore();
}

let raster: CanvasPattern | null = null;
/** Faktura druku: drobny raster i winieta. */
function druk(ctx: CanvasRenderingContext2D, R: Prost): void {
  if (!raster) {
    const c = document.createElement('canvas'); c.width = c.height = 5;
    const g = c.getContext('2d')!; g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(2.5, 2.5, 1, 0, Math.PI * 2); g.fill();
    raster = ctx.createPattern(c, 'repeat');
  }
  ctx.save();
  if (raster) { ctx.globalAlpha = 0.12; ctx.fillStyle = raster; ctx.fillRect(R.x, R.y, R.w, R.h); ctx.globalAlpha = 1; }
  const v = ctx.createRadialGradient(R.x + R.w / 2, R.y + R.h / 2, R.h * 0.3, R.x + R.w / 2, R.y + R.h / 2, R.w * 0.65);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.restore();
}

/** Kadr: rysuje zawartość przyciętą do prostokąta i grubą komiksową ramkę. */
function kadr(ctx: CanvasRenderingContext2D, R: Prost, a: number, rysuj: (R: Prost) => void): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  const dy = (1 - gl(a)) * R.h * 0.15;
  const RR = { ...R, y: R.y + dy };
  ctx.beginPath(); ctx.rect(RR.x, RR.y, RR.w, RR.h); ctx.clip();
  rysuj(RR);
  druk(ctx, RR);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  ctx.strokeStyle = 'rgb(8,6,6)'; ctx.lineWidth = 6; ctx.strokeRect(R.x, R.y + dy, R.w, R.h);
  ctx.strokeStyle = 'rgba(232,220,190,0.75)'; ctx.lineWidth = 1.5; ctx.strokeRect(R.x + 4, R.y + dy + 4, R.w - 8, R.h - 8);
  ctx.restore();
}

// ---------------------------------------------------------------- postacie gry (szóstka) w filmie

const atrapy = new Map<string, Creature>();
function postacGry(ctx: CanvasRenderingContext2D, sim: Sim, rola: 'robotnik' | 'pobozny' | 'rycerz', klucz: string, x: number, y: number, h: number, czas: number, cz: Czynnosc, zwrot = 1, wstaje = 1): void {
  let c = atrapy.get(klucz);
  if (!c) { c = makeCreature(Race.GOBLIN, -1, 0, 0, 300000 + atrapy.size); c.rola = rola; atrapy.set(klucz, c); }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(zwrot, 1);
  // wstawanie: obrót wokół stóp z leżenia do pionu
  if (wstaje < 1) ctx.rotate(-(1 - gl(wstaje)) * Math.PI * 0.45);
  rysujPostac(ctx, sim, c, h * (rola === 'rycerz' ? 1.15 : 1), czas, wstaje < 0.25 ? 'spi' : cz);
  ctx.restore();
}

function lopata(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kat: number): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(kat);
  ctx.strokeStyle = 'rgb(100,72,44)'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(0, 0); ctx.stroke();
  ctx.fillStyle = 'rgb(110,108,100)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-s * 0.1, 0); ctx.lineTo(s * 0.1, 0); ctx.lineTo(s * 0.07, s * 0.25); ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 0.07, s * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function miecz(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kat: number): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(kat);
  ctx.fillStyle = 'rgb(150,140,124)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-s * 0.03, 0); ctx.lineTo(s * 0.03, 0); ctx.lineTo(s * 0.02, -s * 0.85); ctx.lineTo(0, -s * 0.92); ctx.lineTo(-s * 0.02, -s * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgb(110,80,40)'; ctx.fillRect(-s * 0.13, -s * 0.02, s * 0.26, s * 0.04); ctx.strokeRect(-s * 0.13, -s * 0.02, s * 0.26, s * 0.04);
  ctx.fillStyle = 'rgb(70,50,30)'; ctx.fillRect(-s * 0.025, 0, s * 0.05, s * 0.16);
  // rdza i błoto
  ctx.fillStyle = 'rgba(120,60,30,0.6)'; ctx.fillRect(-s * 0.015, -s * 0.5, s * 0.03, s * 0.2);
  ctx.restore();
}

// ---------------------------------------------------------------- ujęcia

type Ujecie = (ctx: CanvasRenderingContext2D, R: Prost, t: number, czas: number, sim: Sim, r: number) => void;
interface Pozycja { od: number; do: number; rysuj: Ujecie }

const UJECIA: Pozycja[] = [
  // 1. Zjazd z nieba na krąg
  {
    od: 0, do: 7, rysuj(ctx, R, t, czas, _sim, r) {
      const k = kamera(t, [[0, 0, -11, R.h / 9], [5.5, 0, -1.6, R.h / 7], [7, 1, -1.4, R.h / 6.5]]);
      const v = new Widok(R, k, 0, czas);
      const blysk = t > 2.2 && t < 2.45 ? 0.4 : 0;
      tlo(ctx, v, { blysk });
      tlum(ctx, v, t);
      deszcz(ctx, R, czas, 1.2);
      narrator(ctx, R.x + R.w * 0.04, R.y + R.h * 0.05, 'Piekło. Krąg trzeci — krąg żarłoków.', t - 1.2, R.w * 0.5, r);
      narrator(ctx, R.x + R.w * 0.5, R.y + R.h * 0.78, 'Pada tu wieczny deszcz, zimny i ciężki. Nie ustaje nigdy.', t - 3.8, R.w * 0.46, r);
    },
  },
  // 2. Bójka o ochłap
  {
    od: 7, do: 13, rysuj(ctx, R, t, czas, _sim, r) {
      const k = kamera(t, [[0, -6, -0.7, R.h / 3.2], [6, -6.3, -0.6, R.h / 2.7]]);
      const v = new Widok(R, k, 0, czas);
      tlo(ctx, v); tlum(ctx, v, t + 7, -9, -3);
      // ochłap (kość z mięsem) — szarpany między dwoma
      const ciag = Math.sin(t * 5) * 0.12;
      const bx = v.X(-6.1 + ciag), by = v.Y(-0.42);
      zarlok(ctx, v, -6.75, pozaSzarpie(t, 0), 1, 1, 0.3, t);
      zarlok(ctx, v, -5.45, { ...pozaSzarpie(t + 0.5, 2), krew: t > 3 ? 0.4 : 0 }, -1, 1, 0.3, t);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(0.3 + ciag);
      ctx.strokeStyle = 'rgb(222,212,186)'; ctx.lineWidth = v.k.s * 0.05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-v.k.s * 0.18, 0); ctx.lineTo(v.k.s * 0.18, 0); ctx.stroke();
      ctx.fillStyle = 'rgb(130,40,34)'; ctx.beginPath(); ctx.ellipse(0, 0, v.k.s * 0.1, v.k.s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (t > 3) { bryzgKrwi(ctx, v.X(-5.4), v.Y(-0.75), v.k.s, (t - 3) / 0.8, -0.5, 0.5, 3); }
      deszcz(ctx, R, czas, 1);
      sfx(ctx, R.x + R.w * 0.62, R.y + R.h * 0.3, 'GRRR!', r * 2.4, (t - 1.2) / 1.5, 0.1, 'rgb(200,180,150)');
      narrator(ctx, R.x + R.w * 0.04, R.y + R.h * 0.05, 'Leżą tu ci, którzy za życia służyli brzuchowi. Nawet tutaj biją się o ochłap.', t - 0.6, R.w * 0.5, r);
    },
  },
  // 3. Ziemia drży; za wzgórzem trzy łby
  {
    od: 13, do: 17, rysuj(ctx, R, t, czas, _sim, r) {
      const k = kamera(t, [[0, 6, -1.6, R.h / 9], [4, 7, -1.8, R.h / 8]]);
      const v = new Widok(R, k, t > 0.5 ? 1.2 : 0, czas);
      tlo(ctx, v);
      // trzy łby nad wzgórzem
      const wy = mix(1.2, -0.6, zakres(t, 0.6, 2.6));
      const p = pozaCerbera(); p.czas = czas;
      p.glowy.forEach((g) => { g.pochyl = -0.2; g.paszcza = 0.3 + 0.6 * dzwon(t, 2.2, 3.9); });
      cerber(ctx, v, 13, p, -1, wy + 2.4);
      // wzgórze przed nim
      ctx.fillStyle = 'rgb(46,44,34)';
      ctx.beginPath(); ctx.moveTo(v.X(5), v.Y(0)); ctx.quadraticCurveTo(v.X(12), v.Y(-1.6), v.X(20), v.Y(0)); ctx.closePath(); ctx.fill();
      // żarłocy unoszą głowy
      tlum(ctx, v, t + 13);
      deszcz(ctx, R, czas, 1.2);
      sfx(ctx, R.x + R.w * 0.62, R.y + R.h * 0.25, 'WRRRAAAUU!', r * 3.2, (t - 2.2) / 1.8);
    },
  },
  // 4. Cerber wpada w tłum: szarpie, rozrywa, pożera
  {
    od: 17, do: 27, rysuj(ctx, R, t, czas, _sim, r) {
      // pozycja Cerbera: wbiega z prawej i staje nad ofiarami
      const cx = mix(14, 3.2, zakres(t, 0, 1.5)) - zakres(t, 3.2, 3.8) * 0.8 - zakres(t, 6.2, 6.8) * 0.9;
      const k = kamera(t, [[0, 8, -1.6, R.h / 6.5], [1.5, 2.2, -1.5, R.h / 5.2], [3.2, 1.6, -1.6, R.h / 5.4], [6, 1.3, -1.5, R.h / 5], [10, 1, -1.6, R.h / 5.4]]);
      const uderzenia = [0.9, 1.6, 4.6, 6.9, 7.8];
      let wstrzas = 0;
      for (const u of uderzenia) wstrzas = Math.max(wstrzas, dzwon(t, u - 0.05, u + 0.4) * 1.6);
      const v = new Widok(R, { ...k, s: k.s * (1 + 0.06 * wstrzas) }, wstrzas, czas);
      tlo(ctx, v);
      tlum(ctx, v, t + 17, -1, 6, 0.4, cx);
      // ślady: kałuże krwi
      kaluzaKrwi(ctx, v.X(-2.4), v.Y(0.05), v.k.s * 0.8, zakres(t, 3.1, 4), 1);
      kaluzaKrwi(ctx, v.X(1.0), v.Y(0.08), v.k.s * 1.0, zakres(t, 4.7, 5.6), 2);
      kaluzaKrwi(ctx, v.X(0.5), v.Y(0.05), v.k.s * 0.9, zakres(t, 6.9, 7.5), 3);
      const p = pozaCerbera(); p.czas = czas;
      p.krok = t < 1.5 ? 1 : 0; p.faza = czas / 90; p.szal = 0.5;
      p.glowy.forEach((g, i) => { g.pochyl = 0.1 * Math.sin(czas / 300 + i); g.paszcza = 0.5; });
      // K1 (0.8–3.2): środkowa głowa chwyta i trzęsie, potem ciska
      const k1 = t > 0.8 && t < 3.2;
      if (k1) { const g = p.glowy[1]; g.wysun = 0.4; g.pochyl = 0.5 + Math.sin(czas / 40) * 0.35 * zakres(t, 1, 1.3); g.paszcza = 0.35; }
      // K2 (3.6–6.0): lewa i prawa głowa rozrywają
      const k2 = t > 3.6 && t < 6.0;
      if (k2) {
        const rozciag = zakres(t, 4.1, 4.7);
        p.glowy[0].pochyl = 0.3 - rozciag * 0.9; p.glowy[0].paszcza = 0.3; p.glowy[0].wysun = 0.2;
        p.glowy[2].pochyl = 0.5 + rozciag * 0.5; p.glowy[2].paszcza = 0.3; p.glowy[2].wysun = 0.5;
        p.deba = 0.15 * rozciag;
      }
      // K3 (6.2–9.5): łapa przygniata pełzającego, głowa podnosi i połyka
      const k3 = t > 6.2;
      if (k3) {
        p.deba = dzwon(t, 6.2, 7.0) * 0.6;
        const g = p.glowy[1];
        g.pochyl = t < 7.4 ? 0.7 : mix(0.7, -0.7, zakres(t, 7.4, 8.2));
        g.paszcza = t < 7.4 ? 0.8 : t < 8.4 ? 0.35 : 0.2 + 0.6 * dzwon(t, 8.4, 9.2);
        g.wysun = t < 7.4 ? 0.5 : 0.2;
      }
      const m = cerber(ctx, v, cx, p, -1);
      // ofiara 1
      if (t < 0.8) zarlok(ctx, v, 1.0, pozaWyje(t, 1), 1, 1, undefined, t);
      else if (k1) {
        wPaszczy(ctx, v, m[1], pozaWPaszczy(t, t < 2.5 ? 1 : 0.4), Math.PI / 2 + Math.sin(czas / 40) * 0.4, t);
        bryzgKrwi(ctx, m[1][0], m[1][1], v.k.s, ((t - 1.0) % 0.7) / 0.7, -1.2 + Math.sin(t * 9), 1, Math.floor(t / 0.7));
        if (t > 1.2) kapie(ctx, m[1], v.k.s, czas, 1.5);
      } else {
        // ciśnięty — leci w lewo i pada
        const f = zakres(t, 3.2, 3.9);
        const x = mix(cx - 2.6, -2.4, f), y = -2.2 * dzwon(f, 0, 1) - 0.08;
        ctx.save(); ctx.translate(v.X(x), v.Y(y)); ctx.rotate(f * 4);
        rysujLudzika(ctx, v.k.s, pozaTrup(1), t); ctx.restore();
      }
      // ofiara 2 — rozrywana
      if (t < 3.6) zarlok(ctx, v, 1.6, pozaLezy(t, 2), -1, 1, undefined, t);
      else if (k2) {
        const roz = zakres(t, 4.1, 4.7);
        if (roz < 0.5) {
          wPaszczy(ctx, v, [(m[0][0] + m[2][0]) / 2, (m[0][1] + m[2][1]) / 2], pozaWPaszczy(t, 1), Math.PI / 2, t);
        } else {
          wPaszczy(ctx, v, m[0], { ...pozaWPaszczy(t, 0.6), brak: { polowa: 'gora' } }, Math.PI / 2 + 0.6, t);
          wPaszczy(ctx, v, m[2], { ...pozaWPaszczy(t, 0.6), brak: { polowa: 'dol' } }, Math.PI / 2 - 0.4, t);
          kapie(ctx, m[0], v.k.s, czas, 2); kapie(ctx, m[2], v.k.s, czas, 2);
        }
        bryzgKrwi(ctx, (m[0][0] + m[2][0]) / 2, (m[0][1] + m[2][1]) / 2, v.k.s * 1.4, (t - 4.6) / 0.9, -Math.PI / 2, 2.2, 7);
      } else {
        zarlok(ctx, v, 0.4, { ...pozaTrup(2), brak: { polowa: 'gora' } }, 1, 1, 0.08, t);
        zarlok(ctx, v, 1.6, { ...pozaTrup(3), brak: { polowa: 'dol' } }, -1, 1, 0.1, t);
      }
      // ofiara 3 — pełznie, przygnieciona łapą, połknięta
      if (t < 6.9) zarlok(ctx, v, mix(-0.4, 0.4, zakres(t, 4, 6.9)), pozaCzolga(t, 1.6, 4), 1, 1, undefined, t);
      else if (t < 7.4) {
        zarlok(ctx, v, 0.5, pozaTrup(0), 1, 1, 0.06, t);
        bryzgKrwi(ctx, v.X(0.5), v.Y(-0.1), v.k.s, (t - 6.9) / 0.6, -Math.PI / 2, 1.6, 9);
      } else if (t < 8.6) {
        const lyk = zakres(t, 8.0, 8.6);
        wPaszczy(ctx, v, m[1], { ...pozaWPaszczy(t, 0.3), krew: 1 }, Math.PI / 2 - 0.9, t, 1 - lyk * 0.7);
      }
      if (t > 7.4) kapie(ctx, m[1], v.k.s, czas, 2);
      deszcz(ctx, R, czas, 1);
      sfx(ctx, R.x + R.w * 0.66, R.y + R.h * 0.22, 'CHRUP!', r * 3, (t - 0.9) / 1.4, -0.15);
      sfx(ctx, R.x + R.w * 0.62, R.y + R.h * 0.45, 'TRRRACH!', r * 3.4, (t - 4.5) / 1.5, 0.12);
      sfx(ctx, R.x + R.w * 0.5, R.y + R.h * 0.78, 'ŁUP!', r * 2.6, (t - 6.85) / 1.0, -0.05);
      sfx(ctx, R.x + R.w * 0.72, R.y + R.h * 0.25, 'GLUP.', r * 2.2, (t - 8.4) / 1.4, 0.1, 'rgb(150,30,24)');
      narrator(ctx, R.x + R.w * 0.03, R.y + R.h * 0.04, 'Cerber. Trzy gardła, czerwone ślepia, tłusta czarna broda i brzuch szeroki.', t - 0.3, R.w * 0.42, r);
      narrator(ctx, R.x + R.w * 0.03, R.y + R.h * 0.8, 'Szarpie potępionych, obdziera ze skóry, ćwiartuje. Nikt mu się nie wymknie.', t - 4.2, R.w * 0.5, r);
    },
  },
  // 5. Dwóch wędrowców; Cerber ryczy na nich
  {
    od: 27, do: 32, rysuj(ctx, R, t, czas, _sim, r) {
      const k = kamera(t, [[0, -3, -1.7, R.h / 6.5], [5, -2.4, -1.6, R.h / 6]]);
      const wstrzas = dzwon(t, 1.3, 3.0) * 0.8;
      const v = new Widok(R, k, wstrzas, czas);
      tlo(ctx, v);
      tlum(ctx, v, t + 27, -9, 3);
      kaluzaKrwi(ctx, v.X(0.5), v.Y(0.05), v.k.s * 1.1, 1, 3);
      zarlok(ctx, v, 0.4, { ...pozaTrup(2), brak: { polowa: 'gora' } }, 1, 1, 0.08, t);
      const p = pozaCerbera(); p.czas = czas;
      const ryk = dzwon(t, 1.2, 3.2);
      p.glowy.forEach((g, i) => { g.pochyl = -0.1 - 0.5 * ryk + 0.05 * i; g.paszcza = 0.4 + 0.6 * ryk; g.wysun = 0.2 + 0.3 * ryk; });
      p.deba = 0.15 * ryk;
      const m = cerber(ctx, v, 2.5, p, -1);
      m.forEach((q) => kapie(ctx, q, v.k.s, czas, 1));
      // wędrowcy po lewej
      const h = v.k.s * 1.05;
      ctx.save(); ctx.translate(v.X(-7.6), v.Y(0)); wedrowiec(ctx, h, true, 0, 0); ctx.restore();
      ctx.save(); ctx.translate(v.X(-6.7), v.Y(0)); wedrowiec(ctx, h * 1.04, false, 0, 0.1); ctx.restore();
      deszcz(ctx, R, czas, 1);
      linieAkcji(ctx, R, m[1][0], m[1][1], ryk * 0.8);
      sfx(ctx, R.x + R.w * 0.62, R.y + R.h * 0.2, 'GRRRAAAAH!', r * 3.4, (t - 1.2) / 2.2, -0.08);
      dymek(ctx, v.X(-8.4), v.Y(-2.0), 'Mistrzu…!', v.X(-7.6), v.Y(-1.0), (t - 2.6) * 2, r * 1.1);
      narrator(ctx, R.x + R.w * 0.03, R.y + R.h * 0.04, 'Wtedy przyszło ich dwóch. Jeden z nich rzucał cień — był żywy.', t - 0.2, R.w * 0.46, r);
    },
  },
  // 6. Trzy kadry: przewodnik nabiera ziemi i rzuca w gardła
  {
    od: 32, do: 38.5, rysuj(ctx, R, t, czas, _sim, r) {
      ctx.fillStyle = 'rgb(12,10,10)'; ctx.fillRect(R.x, R.y, R.w, R.h);
      const g = R.w * 0.015, w3 = (R.w - g * 4) / 3, hh = R.h * 0.86;
      const K = (i: number): Prost => ({ x: R.x + g + i * (w3 + g), y: R.y + R.h * 0.04, w: w3, h: hh });
      // kadr 1: schyla się do błota
      kadr(ctx, K(0), t * 2.5, (RR) => {
        const v = new Widok(RR, { x: -6.6, y: -0.6, s: RR.h / 2.2 }, 0, czas);
        tlo(ctx, v);
        ctx.save(); ctx.translate(v.X(-6.9), v.Y(0)); wedrowiec(ctx, v.k.s * 1.05, false, 0, 0, gl(t / 1.2) * 0.8); ctx.restore();
        ctx.fillStyle = 'rgb(40,36,26)'; ctx.beginPath(); ctx.ellipse(v.X(-6.3), v.Y(0.02), v.k.s * 0.3, v.k.s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
        deszcz(ctx, RR, czas, 0.8);
      });
      // kadr 2: pełne garście błota
      kadr(ctx, K(1), (t - 1.8) * 2.5, (RR) => {
        ctx.fillStyle = 'rgb(30,30,28)'; ctx.fillRect(RR.x, RR.y, RR.w, RR.h);
        const cx = RR.x + RR.w / 2, cy = RR.y + RR.h * 0.55, s = RR.w * 0.32;
        for (const dx of [-0.55, 0.55]) {
          ctx.fillStyle = 'rgb(206,180,150)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(cx + dx * s, cy, s * 0.42, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx + dx * s - s * 0.3 + i * s * 0.18, cy - s * 0.1); ctx.lineTo(cx + dx * s - s * 0.3 + i * s * 0.18, cy + s * 0.2); ctx.stroke(); }
          ctx.fillStyle = 'rgb(56,44,30)';
          ctx.beginPath(); ctx.ellipse(cx + dx * s, cy - s * 0.32, s * 0.4, s * 0.22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          for (let i = 0; i < 3; i++) { const f = ((czas / 600) + i * 0.33) % 1; ctx.beginPath(); ctx.ellipse(cx + dx * s + (i - 1) * s * 0.2, cy + s * 0.3 + f * s * 0.6, s * 0.03, s * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
        }
        deszcz(ctx, RR, czas, 0.6);
      });
      // kadr 3: rzut w trzy gardła
      kadr(ctx, K(2), (t - 3.6) * 2.5, (RR) => {
        const v = new Widok(RR, { x: 1.6, y: -2.0, s: RR.h / 4.2 }, dzwon(t, 4.2, 5) * 0.6, czas);
        tlo(ctx, v);
        const p = pozaCerbera(); p.czas = czas;
        p.glowy.forEach((g2) => { g2.pochyl = -0.25; g2.paszcza = 1; g2.wysun = 0.3; });
        const m = cerber(ctx, v, 2.6, p, -1);
        const f = zakres(t, 3.9, 4.8);
        for (let i = 0; i < 12; i++) {
          const ff = Math.max(0, Math.min(1, f * 1.3 - (i % 4) * 0.08));
          if (ff <= 0 || ff >= 1) continue;
          const cel = m[i % 3];
          const x = mix(RR.x - RR.w * 0.1, cel[0], ff), y = mix(RR.y + RR.h * 0.8, cel[1], ff) - Math.sin(ff * Math.PI) * RR.h * 0.2;
          ctx.fillStyle = 'rgb(60,46,32)'; ctx.beginPath(); ctx.arc(x + (los(i) - 0.5) * 20, y, RR.h * 0.018, 0, Math.PI * 2); ctx.fill();
        }
        deszcz(ctx, RR, czas, 0.8);
        linieAkcji(ctx, RR, RR.x + RR.w * 0.75, RR.y + RR.h * 0.4, f > 0 && f < 1 ? 0.7 : 0);
      });
      narrator(ctx, R.x + R.w * 0.2, R.y + R.h * 0.8, 'Przewodnik schylił się, nabrał pełne garście ziemi i cisnął je w łapczywe gardła.', t - 0.5, R.w * 0.6, r);
    },
  },
  // 7. Pies żre; oni przechodzą i schodzą w dół
  {
    od: 38.5, do: 44.5, rysuj(ctx, R, t, czas, _sim, r) {
      const k = kamera(t, [[0, 1, -1.8, R.h / 8], [6, 4, -1.6, R.h / 8.5]]);
      const v = new Widok(R, k, 0, czas);
      tlo(ctx, v);
      tlum(ctx, v, t + 38, -2, 13);
      // krawędź tarasu: przepaść do niższego kręgu
      ctx.fillStyle = 'rgb(8,6,6)';
      ctx.beginPath(); ctx.moveTo(v.X(11), v.Y(0)); ctx.lineTo(v.X(12.2), v.Y(3)); ctx.lineTo(v.X(30), v.Y(3)); ctx.lineTo(v.X(30), v.Y(-0.01)); ctx.closePath(); ctx.fill();
      const lg = ctx.createRadialGradient(v.X(16), v.Y(4), 0, v.X(16), v.Y(4), v.k.s * 8);
      lg.addColorStop(0, 'rgba(200,60,30,0.5)'); lg.addColorStop(1, 'rgba(200,60,30,0)');
      ctx.fillStyle = lg; ctx.fillRect(v.X(10), v.Y(-6), v.k.s * 20, v.k.s * 12);
      const p = pozaCerbera(); p.czas = czas;
      p.glowy.forEach((g, i) => { g.pochyl = 0.6 + 0.1 * Math.sin(czas / 90 + i); g.paszcza = 0.2 + 0.4 * Math.abs(Math.sin(czas / 80 + i * 1.3)); g.wysun = 0.15; });
      p.ogon = Math.sin(czas / 200) * 0.8;
      cerber(ctx, v, 2.5, p, -1);
      // idą: wzdłuż i w dół krawędzi
      const h = v.k.s * 1.05;
      const xw = mix(-4, 13.5, zakres(t, 0.3, 5.6)), zejscie = Math.max(0, xw - 11.2) * 0.9;
      ctx.save(); ctx.translate(v.X(xw - 0.9), v.Y(Math.max(0, xw - 0.9 - 11.2) * 0.9)); wedrowiec(ctx, h, true, czas / 120, 0); ctx.restore();
      ctx.save(); ctx.translate(v.X(xw), v.Y(zejscie)); wedrowiec(ctx, h * 1.04, false, czas / 120 + 1, 0); ctx.restore();
      deszcz(ctx, R, czas, 1);
      narrator(ctx, R.x + R.w * 0.03, R.y + R.h * 0.04, 'Pies zamilkł nad tą strawą jak głodny nad kością.', t - 0.3, R.w * 0.42, r);
      narrator(ctx, R.x + R.w * 0.45, R.y + R.h * 0.78, 'A oni przeszli — i zeszli niżej. Bo z piekła wychodzi się tylko przez jego dno.', t - 2.4, R.w * 0.5, r);
    },
  },
  // 8. Oko w błocie
  {
    od: 44.5, do: 47.5, rysuj(ctx, R, t, czas, _sim, r) {
      ctx.fillStyle = 'rgb(46,42,30)'; ctx.fillRect(R.x, R.y, R.w, R.h);
      const cx = R.x + R.w * 0.5, cy = R.y + R.h * 0.48, s = R.h * (0.42 + t * 0.02);
      // twarz w błocie (zbliżenie)
      ctx.fillStyle = 'rgb(128,118,96)'; ctx.beginPath(); ctx.ellipse(cx, cy, s * 1.6, s * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(46,42,30,0.9)';
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(cx + (los(i) - 0.5) * s * 3, cy + (los(i * 3) - 0.3) * s * 1.6, s * (0.3 + los(i * 5) * 0.4), s * 0.2, los(i) * 3, 0, Math.PI * 2); ctx.fill(); }
      // oko otwiera się
      const otw = zakres(t, 0.3, 1.0);
      ctx.fillStyle = 'rgb(226,214,190)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.55, s * 0.28 * otw + 1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (otw > 0.2) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.55, s * 0.28 * otw, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = 'rgb(70,60,40)'; ctx.beginPath(); ctx.arc(cx + s * 0.05, cy, s * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = TUSZ; ctx.beginPath(); ctx.arc(cx + s * 0.05, cy, s * 0.1, 0, Math.PI * 2); ctx.fill();
        // odbicie dwóch postaci
        ctx.fillStyle = 'rgb(170,40,30)'; ctx.fillRect(cx - s * 0.02, cy - s * 0.1, s * 0.03, s * 0.08);
        ctx.fillStyle = 'rgb(120,126,118)'; ctx.fillRect(cx + s * 0.04, cy - s * 0.11, s * 0.03, s * 0.09);
        ctx.restore();
      }
      deszcz(ctx, R, czas, 0.7);
      druk(ctx, R);
      narrator(ctx, R.x + R.w * 0.36, R.y + R.h * 0.82, 'Ktoś to widział.', t - 1.0, R.w * 0.3, r * 1.3);
    },
  },
  // 9. Wstają: grabarz, mnich, rycerz (trzy kadry)
  {
    od: 47.5, do: 57.5, rysuj(ctx, R, t, czas, sim, r) {
      ctx.fillStyle = 'rgb(12,10,10)'; ctx.fillRect(R.x, R.y, R.w, R.h);
      const g = R.w * 0.015, w3 = (R.w - g * 4) / 3, hh = R.h * 0.7;
      const K = (i: number): Prost => ({ x: R.x + g + i * (w3 + g), y: R.y + R.h * 0.04, w: w3, h: hh });
      const opisy = [
        'Grabarz. Za życia kopał groby za miskę strawy. Kopie i teraz.',
        'Mnich. Modlił się z pełnymi ustami — ale słowa modlitwy pamięta.',
        'Rycerz. Przejadł cały majątek. Miecza nie oddał.',
      ];
      const role: ('robotnik' | 'pobozny' | 'rycerz')[] = ['robotnik', 'pobozny', 'rycerz'];
      for (let i = 0; i < 3; i++) {
        const t0 = i * 3.2;
        kadr(ctx, K(i), (t - t0) * 2.5, (RR) => {
          const v = new Widok(RR, { x: 0, y: -0.8, s: RR.h / 2.4 }, 0, czas);
          tlo(ctx, v);
          for (let j = 0; j < 3; j++) zarlok(ctx, v, -1.6 + j * 1.6, pozaLezy(t + j, j + i), j % 2 ? 1 : -1, 0.8, undefined, t);
          const wst = zakres(t, t0 + 0.6, t0 + 2.2);
          const lt = t - t0;
          if (i === 0) {
            // łopata tkwi w błocie; grabarz chwyta ją i wyciąga
            const wyc = zakres(lt, 1.6, 2.6);
            lopata(ctx, v.X(0.45), v.Y(-0.3 - wyc * 0.4), v.k.s, 0.25 - wyc * 0.2);
          }
          if (i === 2) {
            const wyc = zakres(lt, 1.8, 2.8);
            miecz(ctx, v.X(0.5), v.Y(0.15 - wyc * 0.9), v.k.s, 0.15 - wyc * 0.3);
          }
          postacGry(ctx, sim, role[i], 'film' + i, v.X(-0.1), v.Y(0), v.k.s * 1.0, czas + i * 300, i === 1 && lt > 2.4 ? 'modli' : 'stoi', 1, wst);
          if (i === 1) dymek(ctx, RR.x + RR.w * 0.62, RR.y + RR.h * 0.18, '…Pater noster…', v.X(0), v.Y(-1), (lt - 2.4) * 2, r * 0.9);
          deszcz(ctx, RR, czas, 0.7);
        });
        // podpis pod kadrem
        ctx.save();
        ctx.globalAlpha = gl((t - t0 - 0.8) * 2);
        narrator(ctx, K(i).x, K(i).y + hh + R.h * 0.03, opisy[i], (t - t0 - 0.8) * 2, w3, r * 0.92);
        ctx.restore();
      }
    },
  },
  // 10. Szóstka razem
  {
    od: 57.5, do: 62.5, rysuj(ctx, R, t, czas, sim, r) {
      const k = kamera(t, [[0, 0, -1, R.h / 3.6], [5, 0.8, -1, R.h / 3.3]]);
      const v = new Widok(R, k, 0, czas);
      tlo(ctx, v);
      tlum(ctx, v, t + 57, -5, 6);
      // dziura w ziemi, w którą pada światło
      const hx = v.X(4.2), hy = v.Y(0.12);
      const pr = ctx.createLinearGradient(hx, R.y, hx, hy);
      pr.addColorStop(0, 'rgba(255,236,190,0)'); pr.addColorStop(1, 'rgba(255,236,190,0.35)');
      ctx.fillStyle = pr;
      ctx.beginPath(); ctx.moveTo(hx - v.k.s * 0.3, R.y); ctx.lineTo(hx + v.k.s * 0.3, R.y); ctx.lineTo(hx + v.k.s * 0.7, hy); ctx.lineTo(hx - v.k.s * 0.7, hy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgb(6,4,4)'; ctx.beginPath(); ctx.ellipse(hx, hy, v.k.s * 0.75, v.k.s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      const role: ('robotnik' | 'pobozny' | 'rycerz')[] = ['robotnik', 'robotnik', 'robotnik', 'pobozny', 'pobozny', 'rycerz'];
      role.forEach((rola, i) => postacGry(ctx, sim, rola, 'film' + (i === 0 ? 0 : i === 3 ? 1 : i === 5 ? 2 : 's' + i), v.X(-3.2 + i * 0.95), v.Y(0), v.k.s, czas + i * 211, 'stoi', 1));
      deszcz(ctx, R, czas, 1);
      dymek(ctx, v.X(-2.6), v.Y(-2.4), 'Oni zeszli w dół. Zejdziemy i my.', v.X(-3.2), v.Y(-1.1), (t - 0.6) * 2, r);
      dymek(ctx, v.X(1.2), v.Y(-2.5), 'Przez trzewia tej ziemi…', v.X(-0.4), v.Y(-1.1), (t - 2.6) * 2, r);
    },
  },
  // 11. Pod ziemię: trzewia i pieczęć
  {
    od: 62.5, do: 69, rysuj(ctx, R, t, czas, _sim, r) {
      const zjazd = zakres(t, 0.2, 4.5);
      const yG = R.y + R.h * mix(0.55, -0.6, zjazd);
      ctx.fillStyle = 'rgb(20,22,24)'; ctx.fillRect(R.x, R.y, R.w, R.h);
      const g = ctx.createLinearGradient(0, yG, 0, yG + R.h * 1.6);
      g.addColorStop(0, 'rgb(72,54,40)'); g.addColorStop(1, 'rgb(48,18,14)');
      ctx.fillStyle = g; ctx.fillRect(R.x, yG, R.w, R.h * 2);
      // fałdy trzewi — oddychają
      const odd = Math.sin(czas / 700);
      ctx.strokeStyle = 'rgba(150,64,54,0.5)'; ctx.lineWidth = R.h * 0.016;
      for (let i = 0; i < 14; i++) {
        const y = yG + R.h * (0.1 + i * 0.1);
        ctx.beginPath();
        for (let x = 0; x <= R.w; x += 10) {
          const yy = y + Math.sin(x / (R.w * 0.07) + i * 1.9 + czas / 1500) * R.h * (0.03 + 0.008 * odd);
          if (x === 0) ctx.moveTo(R.x + x, yy); else ctx.lineTo(R.x + x, yy);
        }
        ctx.stroke();
      }
      // szóstka wchodzi w otwór na górze
      ctx.fillStyle = 'rgb(6,4,4)'; ctx.beginPath(); ctx.ellipse(R.x + R.w * 0.55, yG, R.w * 0.03, R.h * 0.015, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 6; i++) ctx.fillRect(R.x + R.w * (0.45 + i * 0.012), yG - R.h * 0.04, R.w * 0.006, R.h * 0.04);
      // pieczęć na dnie
      const py = yG + R.h * 1.35, px = R.x + R.w * 0.5, pr2 = R.h * 0.14;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, pr2 * 2.6);
      pg.addColorStop(0, `rgba(230,60,30,${0.45 + 0.2 * odd})`); pg.addColorStop(1, 'rgba(230,60,30,0)');
      ctx.fillStyle = pg; ctx.fillRect(px - pr2 * 3, py - pr2 * 3, pr2 * 6, pr2 * 6);
      ctx.fillStyle = 'rgb(96,92,84)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(px, py, pr2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgb(60,56,52)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(px - pr2 * 1.4, py - pr2); ctx.lineTo(px + pr2 * 1.4, py + pr2); ctx.moveTo(px + pr2 * 1.4, py - pr2); ctx.lineTo(px - pr2 * 1.4, py + pr2); ctx.stroke();
      // ciała wciągane przez ziemię
      for (let i = 0; i < 9; i++) {
        const x = R.x + R.w * (0.1 + los(i * 7) * 0.8), y = yG + R.h * (0.2 + los(i * 3) * 1.0);
        ctx.save(); ctx.translate(x, y); ctx.rotate(los(i) * 3);
        rysujLudzika(ctx, R.h * 0.12, pozaTrup(i), czas / 1000);
        ctx.restore();
      }
      druk(ctx, R);
      narrator(ctx, R.x + R.w * 0.04, R.y + R.h * 0.05, 'Ziemia pod nimi drgnęła.', t - 0.4, R.w * 0.4, r);
      narrator(ctx, R.x + R.w * 0.04, R.y + R.h * 0.2, 'Ty jesteś trzewiami tego kręgu — ziemią, która trawi żarłoków. Czujesz każdy ich krok.', t - 2.0, R.w * 0.5, r);
      narrator(ctx, R.x + R.w * 0.46, R.y + R.h * 0.8, 'Na samym dnie czeka zapieczętowane zejście do kręgu czwartego.', t - 4.0, R.w * 0.5, r);
    },
  },
  // 12. Cerber węszy; tytuł
  {
    od: 69, do: DLUGOSC_FILMU, rysuj(ctx, R, t, czas, _sim, r) {
      const k = kamera(t, [[0, 3.6, -2.0, R.h / 5.6], [3.5, 4.0, -2.2, R.h / 5.0]]);
      const v = new Widok(R, k, 0, czas);
      tlo(ctx, v);
      kaluzaKrwi(ctx, v.X(0.8), v.Y(0.05), v.k.s * 1.4, 1, 5);
      zarlok(ctx, v, 0.8, { ...pozaTrup(1), brak: { glowa: true, rekaP: true } }, 1, 1, 0.08, t);
      const p = pozaCerbera(); p.czas = czas;
      const unosi = zakres(t, 0.4, 1.6);
      p.glowy.forEach((g, i) => { g.pochyl = mix(0.7, -0.35, unosi) + 0.05 * i; g.paszcza = 0.25 + 0.1 * Math.sin(czas / 150 + i); g.oczy = 1 + dzwon(t, 2, 3.5) * 0.8; });
      const m = cerber(ctx, v, 2.6, p, 1);
      m.forEach((q) => kapie(ctx, q, v.k.s, czas, 1.5));
      // błysk ślepi
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const q of m) { const gg = ctx.createRadialGradient(q[0], q[1] - v.k.s * 0.2, 0, q[0], q[1] - v.k.s * 0.2, v.k.s * 0.8); gg.addColorStop(0, `rgba(255,40,20,${0.4 * dzwon(t, 2, 3.5)})`); gg.addColorStop(1, 'rgba(255,40,20,0)'); ctx.fillStyle = gg; ctx.fillRect(q[0] - v.k.s, q[1] - v.k.s * 1.2, v.k.s * 2, v.k.s * 2); }
      ctx.restore();
      deszcz(ctx, R, czas, 1);
      sfx(ctx, R.x + R.w * 0.75, R.y + R.h * 0.2, 'sniff… sniff…', r * 1.8, (t - 1.2) / 2.0, 0.05, 'rgb(200,190,170)');
      narrator(ctx, R.x + R.w * 0.03, R.y + R.h * 0.8, 'Cerber podniósł łby znad trupa. Zapamiętał ich zapach.', t - 1.6, R.w * 0.5, r);
      // tytuł
      const a = zakres(t, 4.2, 5.0);
      if (a > 0) {
        ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(R.x, R.y, R.w, R.h);
        ctx.globalAlpha = a;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${r * 4.2}px ${KROJ}`; ctx.fillStyle = 'rgb(200,40,30)';
        ctx.fillText('TRZEWIA', R.x + R.w / 2, R.y + R.h * 0.44);
        ctx.font = `italic ${r * 1.6}px ${KROJ}`; ctx.fillStyle = 'rgb(220,210,180)';
        ctx.fillText('Krąg Trzeci', R.x + R.w / 2, R.y + R.h * 0.6);
        ctx.globalAlpha = 1;
      }
    },
  },
];

/** Klatka filmu w czasie `t` (s) na całym ekranie. */
export function rysujFilm(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, t: number, czas: number): void {
  ctx.save();
  ctx.fillStyle = 'rgb(4,4,5)'; ctx.fillRect(0, 0, w, h);
  // pasy kinowe 2,1:1 — film, nie gra
  const H = Math.min(h * 0.86, w / 2.0), R: Prost = { x: 0, y: (h - H) / 2, w, h: H };
  const r = Math.max(14, Math.min(26, w / 60));
  const u = UJECIA.find((q) => t >= q.od && t < q.do) ?? UJECIA[UJECIA.length - 1];
  const lt = t - u.od;
  ctx.save();
  ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  u.rysuj(ctx, R, lt, czas, sim, r);
  // faktura druku na pełnych ujęciach (kadry mają własną)
  druk(ctx, R);
  ctx.restore();
  // cięcia: krótkie zaciemnienie na styku ujęć
  const doKonca = u.do - t;
  const ciemno = Math.max(lt < 0.25 ? 1 - lt / 0.25 : 0, doKonca < 0.18 ? 1 - doKonca / 0.18 : 0);
  if (ciemno > 0 && u.od > 0) { ctx.fillStyle = `rgba(0,0,0,${ciemno * 0.9})`; ctx.fillRect(R.x, R.y, R.w, R.h); }
  if (t < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - t})`; ctx.fillRect(0, 0, w, h); }
  ctx.font = `italic ${r * 0.7}px ${KROJ}`; ctx.fillStyle = 'rgba(170,160,140,0.55)'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  ctx.fillText('Esc — pomiń film', w - r, h - r * 0.6);
  ctx.restore();
}

void pozaStoi; void pozaWstaje;
