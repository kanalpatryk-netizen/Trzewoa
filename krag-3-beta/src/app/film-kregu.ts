/**
 * FILM NA POCZĄTEK GRY (Krąg Trzeci, beta) — polecenie użytkownika (15.11): „cutscenka na początku to nie ma być pokaz
 * slajdów oddzielanych spacją, tylko spójny filmik… ma pokazywać wydarzenie jedno po drugim albo cały przebieg
 * historii, tak jak normalnie są cutscenki w takich grach, coś w stylu komiksu”.
 *
 * Druga uwaga (15.11): „usuń napisy grrr, gulp itp. — to nie jest komiks, tylko dość brutalna opowieść; potrzebujemy
 * więcej brutalności; rany po rozszarpaniu przez Cerbera są nieporównywalnie mniejsze, niż powinny być”.
 *
 * Jeden ciągły film (ok. 75 s) jak przerywnik w grze: kamera jedzie, najeżdża i trzęsie się przy uderzeniach, cięcia
 * między ujęciami, kinowe napisy (narrator kursywą, kwestie z myślnikiem), ziarno, zimna gradacja i winieta. Cerber
 * i potępieni to obrazki wypieczone z modeli 3D (render/cerber-sprite.ts, render/zarlok-sprite.ts); rany są dosłowne:
 * wypatroszenie, rozerwanie na pół z wypadającymi trzewiami, zmiażdżenie z odpadającą głową, oderwana ręka. Przebieg:
 *  1. zjazd z burzowego nieba na krąg żarłoków w deszczu;           2. dwóch żarłoków bije się o ochłap;
 *  3. ziemia drży, za wzgórzem wyrastają trzy łby;                   4. Cerber wpada w tłum — szarpie, rozrywa, pożera;
 *  5. dwóch wędrowców, Cerber ryczy na nich z zakrwawioną paszczą;  6. przewodnik rzuca mu ziemię w gardła (3 ujęcia);
 *  7. pies żre, a oni przechodzą i schodzą w dół;                   8. oko w błocie — ktoś to widział;
 *  9. grabarz, mnich, rycerz wstają z błota (3 ujęcia);             10. szóstka razem: „zejdziemy i my”;
 * 11. kamera schodzi pod ziemię: trzewia i pieczęć na dnie;         12. Cerber podnosi zakrwawiony pysk i węszy. Tytuł.
 * Esc — pomija film. Potem scena wejścia (app/wstep-kregu.ts).
 */
import type { Sim } from '../sim/sim';
import { makeCreature, type Creature } from '../sim/creatures';
import { Race } from '../sim/races';
import { rysujPostac, type Czynnosc } from '../render/figury';
import { rysujCerbera, pozaCerbera, type PozaCerbera, type PunktyCerbera } from '../render/cerber';
import {
  rysujLudzika, pozaLezy, pozaCzolga, pozaWyje, pozaZre, pozaSzarpie, pozaWPaszczy, pozaTrup, pozaStoi,
  kaluzaKrwi, bryzgKrwi, type PozaLudzika,
} from '../render/ludzik';
import { rysujTrzewia, rysujOderwanaGlowe, rysujOderwanaReke } from '../render/zarlok-sprite';

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
  // cień i muł pod ciałem — ciało leży w błocie, nie wisi nad nim
  if (hb < 0.35) {
    const sx = v.X(wx) + zwrot * (lezy ? 0.18 : 0.05) * v.k.s * skala, sy = v.Y(0.02);
    const gc = ctx.createRadialGradient(sx, sy, 0, sx, sy, v.k.s * skala * (lezy ? 0.65 : 0.35));
    gc.addColorStop(0, 'rgba(8,6,4,0.75)'); gc.addColorStop(1, 'rgba(8,6,4,0)');
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.18); ctx.translate(-sx, -sy);
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(sx, sy, v.k.s * skala * (lezy ? 0.65 : 0.35), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(v.X(wx), v.Y(-hb * skala));
  ctx.scale(zwrot, 1);
  rysujLudzika(ctx, v.k.s * skala, p, t);
  ctx.restore();
  // leżący tkwi w błocie: grzbiet mułu przed ciałem zakrywa dół (brzuch, uda, łydki)
  if (lezy || hb < 0.3) blotoPrzed(ctx, v, wx - zwrot * 0.6 * skala, wx + zwrot * 0.62 * skala, skala, wx * 7.3);
}

/** Grzbiet mułu od x0 do x1 (jednostki świata) tuż przy gruncie: nierówny brzeg, mokre odblaski, kałuże. */
function blotoPrzed(ctx: CanvasRenderingContext2D, v: Widok, x0: number, x1: number, skala: number, ziarno: number): void {
  const a = Math.min(x0, x1) - 0.1 * skala, b = Math.max(x0, x1) + 0.1 * skala;
  const yT = v.Y(-0.015 * skala), yD = v.Y(0.3 * skala);
  ctx.save();
  const g = ctx.createLinearGradient(0, yT, 0, yD);
  g.addColorStop(0, 'rgb(50,46,34)'); g.addColorStop(1, 'rgb(38,35,26)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(v.X(a), yD);
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = v.X(a + (b - a) * u);
    const brzeg = Math.sin(u * Math.PI) * 0.035 * skala + (los(ziarno * 13 + i) - 0.5) * 0.03 * skala;
    ctx.lineTo(x, v.Y(-brzeg));
  }
  ctx.lineTo(v.X(b), yD); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(140,150,150,0.16)';
  for (let i = 0; i < 4; i++) {
    const x = v.X(a + (b - a) * (0.15 + los(ziarno + i * 3) * 0.7));
    ctx.beginPath(); ctx.ellipse(x, v.Y(0.04 * skala), v.k.s * skala * (0.05 + 0.08 * los(ziarno + i)), v.k.s * skala * 0.008, 0, 0, Math.PI * 2); ctx.fill();
  }
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
const sylw: { a: HTMLCanvasElement | null; b: HTMLCanvasElement | null } = { a: null, b: null };
/** Wędrowiec jak w kinie: ciemna sylwetka w deszczu z chłodnym konturem światła (szata ledwie barwna). */
function wedrowiec(ctx: CanvasRenderingContext2D, h: number, zywy: boolean, krok: number, reka: number, schyla = 0): void {
  const W = Math.max(8, Math.ceil(h * 1.4)), Hh = Math.max(8, Math.ceil(h * 1.3));
  if (typeof document === 'undefined') return;
  if (!sylw.a || sylw.a.width < W || sylw.a.height < Hh) {
    sylw.a = document.createElement('canvas'); sylw.b = document.createElement('canvas');
    sylw.a.width = sylw.b.width = Math.max(W, sylw.a?.width ?? 0); sylw.a.height = sylw.b.height = Math.max(Hh, sylw.a?.height ?? 0);
  }
  const A = sylw.a, B = sylw.b!;
  const a = A.getContext('2d')!, b = B.getContext('2d')!;
  a.clearRect(0, 0, W, Hh);
  a.save(); a.translate(W / 2, Hh - h * 0.04); wedrowiecRys(a, h, zywy, krok, reka, schyla); a.restore();
  const ox = -W / 2, oy = -(Hh - h * 0.04);
  // kontur światła (zza pleców, z góry)
  b.clearRect(0, 0, W, Hh); b.globalCompositeOperation = 'source-over'; b.drawImage(A, 0, 0, W, Hh, 0, 0, W, Hh);
  b.globalCompositeOperation = 'source-in'; b.fillStyle = 'rgba(176,190,200,0.38)'; b.fillRect(0, 0, W, Hh); b.globalCompositeOperation = 'source-over';
  ctx.drawImage(B, 0, 0, W, Hh, ox - Math.max(1, Math.min(3, h * 0.004)), oy - Math.max(1, Math.min(3, h * 0.004)), W, Hh);
  // sylwetka: ciemna, z odrobiną barwy szaty
  b.clearRect(0, 0, W, Hh); b.drawImage(A, 0, 0, W, Hh, 0, 0, W, Hh);
  b.globalCompositeOperation = 'source-atop'; b.fillStyle = zywy ? 'rgba(30,7,6,0.86)' : 'rgba(15,16,16,0.86)'; b.fillRect(0, 0, W, Hh); b.globalCompositeOperation = 'source-over';
  ctx.drawImage(B, 0, 0, W, Hh, ox, oy, W, Hh);
}
function wedrowiecRys(ctx: CanvasRenderingContext2D, h: number, zywy: boolean, krok: number, reka: number, schyla = 0): void {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(6,4,4,0.4)'; ctx.lineWidth = Math.max(0.6, h * 0.008);
  const szataG = ctx.createLinearGradient(-h * 0.2, -h * 0.7, h * 0.2, 0);
  szataG.addColorStop(0, zywy ? 'rgb(120,30,26)' : 'rgb(92,98,92)'); szataG.addColorStop(0.55, zywy ? 'rgb(84,18,16)' : 'rgb(60,64,60)'); szataG.addColorStop(1, zywy ? 'rgb(40,8,8)' : 'rgb(30,32,30)');
  const szata: CanvasGradient | string = szataG;
  const sk = 'rgb(176,150,124)';
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

// ---------------------------------------------------------------- kino: napisy, ziarno, winieta (po uwadze 15.11: „to nie jest komiks")

function zawin(ctx: CanvasRenderingContext2D, tekst: string, max: number): string[] {
  const out: string[] = []; let l = '';
  for (const s of tekst.split(' ')) { const p = l ? l + ' ' + s : s; if (ctx.measureText(p).width > max && l) { out.push(l); l = s; } else l = p; }
  if (l) out.push(l);
  return out;
}

/** Napis kinowy: blada kursywa z miękkim cieniem, wyśrodkowana u dołu kadru (albo u góry, `gora`); wyłania się z `a`,
 *  gaśnie przed `koniec` (sekundy do końca napisu, gdy podane). */
function napis(ctx: CanvasRenderingContext2D, R: Prost, tekst: string, a: number, gora: boolean, r: number, koniec = 9): void {
  if (a <= 0 || koniec <= 0) return;
  const al = Math.min(1, a * 1.2) * Math.min(1, koniec * 2);
  ctx.save();
  ctx.font = `italic ${r * 1.05}px ${KROJ}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const linie = zawin(ctx, tekst, R.w * 0.62);
  const lh = r * 1.45;
  const y0 = gora ? R.y + R.h * 0.1 : R.y + R.h * 0.9 - (linie.length - 1) * lh;
  ctx.globalAlpha = al;
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = r * 0.6; ctx.shadowOffsetY = r * 0.08;
  ctx.fillStyle = 'rgb(224,218,200)';
  linie.forEach((l, i) => ctx.fillText(l, R.x + R.w / 2, y0 + i * lh));
  ctx.restore();
}

/** Kwestia mówiona (dialog jak w napisach filmu): „— tekst”, cieplejsza barwa, u dołu kadru. */
function kwestia(ctx: CanvasRenderingContext2D, R: Prost, tekst: string, a: number, r: number, koniec = 9): void {
  if (a <= 0 || koniec <= 0) return;
  ctx.save();
  ctx.font = `${r * 1.1}px ${KROJ}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = Math.min(1, a * 1.5) * Math.min(1, koniec * 2);
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = r * 0.6; ctx.shadowOffsetY = r * 0.08;
  ctx.fillStyle = 'rgb(236,214,170)';
  ctx.fillText('— ' + tekst, R.x + R.w / 2, R.y + R.h * 0.9);
  ctx.restore();
}

let ziarnoFilmu: HTMLCanvasElement | null = null;
/** Obraz filmowy: ziarno (drga z klatki na klatkę), zimna gradacja, winieta. */
function kino(ctx: CanvasRenderingContext2D, R: Prost, czas: number): void {
  if (!ziarnoFilmu && typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = c.height = 192;
    const g = c.getContext('2d')!; const d = g.createImageData(192, 192);
    for (let i = 0; i < d.data.length; i += 4) { const v = (los(i * 0.37) * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 11; }
    g.putImageData(d, 0, 0); ziarnoFilmu = c;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(160,172,180,1)'; ctx.globalAlpha = 0.12; ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.restore();
  ctx.save();
  if (ziarnoFilmu) {
    const ox = (los(Math.floor(czas / 42)) * 192) | 0, oy = (los(Math.floor(czas / 42) + 7) * 192) | 0;
    const pat = ctx.createPattern(ziarnoFilmu, 'repeat');
    if (pat) { ctx.translate(-ox, -oy); ctx.fillStyle = pat; ctx.fillRect(R.x + ox, R.y + oy, R.w, R.h); ctx.translate(ox, oy); }
  }
  const v = ctx.createRadialGradient(R.x + R.w / 2, R.y + R.h / 2, R.h * 0.35, R.x + R.w / 2, R.y + R.h / 2, R.w * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = v; ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.restore();
}

/** Ujęcia jedno po drugim w obrębie sceny (zamiast kadrów komiksu): [od, rysuj] — zwraca, które trwa i jego czas. */
function ciecia(t: number, od: number[]): [number, number] {
  let i = 0;
  while (i + 1 < od.length && t >= od[i + 1]) i++;
  return [i, t - od[i]];
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
      napis(ctx, R, 'Piekło. Krąg trzeci — krąg żarłoków.', t - 1.2, true, r);
      napis(ctx, R, 'Pada tu wieczny deszcz, zimny i ciężki. Nie ustaje nigdy.', t - 3.8, false, r);
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
      napis(ctx, R, 'Leżą tu ci, którzy za życia służyli brzuchowi. Nawet tutaj biją się o ochłap.', t - 0.6, true, r);
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
    },
  },
  // 4. Cerber wpada w tłum: patroszy, rozrywa na pół, miażdży i połyka, odrywa rękę
  {
    od: 17, do: 27, rysuj(ctx, R, t, czas, _sim, r) {
      // pozycja Cerbera: wbiega z prawej i staje nad ofiarami
      const cx = mix(14, 3.2, zakres(t, 0, 1.5)) - zakres(t, 3.2, 3.8) * 0.8 - zakres(t, 6.2, 6.8) * 0.9;
      const k0 = kamera(t, [[0, 8, -1.6, R.h / 6.5], [1.5, 2.2, -1.5, R.h / 5.2], [3.2, 1.6, -1.6, R.h / 5.4], [6, 1.3, -1.5, R.h / 5], [10, 1, -1.6, R.h / 5.4]]);
      // najazd kamery na rozrywanie (ofiara 2)
      const zbl = dzwon(t, 3.9, 5.9);
      const k = { x: mix(k0.x, 1.1, zbl * 0.7), y: mix(k0.y, -2.1, zbl * 0.6), s: k0.s * (1 + 0.45 * zbl) };
      const uderzenia = [0.9, 1.6, 4.6, 6.9, 7.6];
      let wstrzas = 0;
      for (const u of uderzenia) wstrzas = Math.max(wstrzas, dzwon(t, u - 0.05, u + 0.4) * 1.6);
      const v = new Widok(R, { ...k, s: k.s * (1 + 0.06 * wstrzas) }, wstrzas, czas);
      tlo(ctx, v);
      tlum(ctx, v, t + 17, -1, 6, 0.4, cx);
      // kałuże krwi rosną
      kaluzaKrwi(ctx, v.X(-2.4), v.Y(0.05), v.k.s * 1.1, zakres(t, 3.1, 4.2), 1);
      kaluzaKrwi(ctx, v.X(1.0), v.Y(0.08), v.k.s * 1.6, zakres(t, 4.7, 6.0), 2);
      kaluzaKrwi(ctx, v.X(0.5), v.Y(0.05), v.k.s * 1.2, zakres(t, 6.9, 7.8), 3);
      kaluzaKrwi(ctx, v.X(cx - 2.2), v.Y(0.06), v.k.s * 0.9, zakres(t, 7.6, 8.6), 4);
      const p = pozaCerbera(); p.czas = czas; p.krew = t > 2 ? 1 : 0.6;
      p.krok = t < 1.5 ? 1 : 0; p.faza = czas / 90; p.szal = 0.6;
      p.glowy.forEach((g, i) => { g.pochyl = 0.1 * Math.sin(czas / 300 + i); g.paszcza = 0.5; });
      // K1 (0.8–3.2): środkowa głowa chwyta, trzęsie — brzuch pęka, trzewia lecą — potem ciska trupem
      const k1 = t > 0.8 && t < 3.2;
      if (k1) { const g = p.glowy[1]; g.wysun = 0.4; g.pochyl = 0.5 + Math.sin(czas / 40) * 0.35 * zakres(t, 1, 1.3); g.paszcza = 0.35; }
      // K2 (3.6–6.0): lewa i prawa głowa rozrywają na pół (wolniej — kamera najeżdża)
      const k2 = t > 3.6 && t < 6.0;
      const roz = zakres(t, 4.1, 5.0);
      if (k2) {
        p.glowy[0].pochyl = 0.3 - roz * 0.9; p.glowy[0].paszcza = 0.3; p.glowy[0].wysun = 0.2;
        p.glowy[2].pochyl = 0.5 + roz * 0.5; p.glowy[2].paszcza = 0.3; p.glowy[2].wysun = 0.5;
        p.deba = 0.15 * roz;
      }
      // K3 (6.2–9.5): łapa miażdży pełzającego (głowa odpada), środkowa głowa podnosi resztę i połyka
      const k3 = t > 6.2;
      if (k3) {
        p.deba = dzwon(t, 6.2, 7.0) * 0.6;
        const g = p.glowy[1];
        g.pochyl = t < 7.4 ? 0.7 : mix(0.7, -0.7, zakres(t, 7.4, 8.2));
        g.paszcza = t < 7.4 ? 0.8 : t < 8.4 ? 0.35 : 0.2 + 0.6 * dzwon(t, 8.4, 9.2);
        g.wysun = t < 7.4 ? 0.5 : 0.2;
      }
      // K4 (7.0–9.8): bliższa głowa (pitbull) odrywa rękę klęczącemu
      const k4 = t > 7.0;
      if (k4) {
        const g = p.glowy[2];
        g.wysun = t < 7.6 ? zakres(t, 7.0, 7.5) * 0.7 : mix(0.7, 0.3, zakres(t, 7.6, 8.4));
        g.pochyl = t < 7.6 ? 0.9 : 0.9 - zakres(t, 7.6, 8.4) * 0.8 + Math.sin(czas / 45) * 0.25 * zakres(t, 8.4, 8.7);
        g.paszcza = t < 7.55 ? 1 : 0.3;
      }
      const m = cerber(ctx, v, cx, p, -1);
      // ofiara 1
      if (t < 0.8) zarlok(ctx, v, 1.0, pozaWyje(t, 1), 1, 1, undefined, t);
      else if (k1) {
        const pek = t > 1.7;
        wPaszczy(ctx, v, m[1], { ...pozaWPaszczy(t, t < 2.5 ? 1 : 0.4), krew: pek ? 1 : 0.6, brak: pek ? { trzewia: true } : undefined }, Math.PI / 2 + Math.sin(czas / 40) * 0.4, t);
        bryzgKrwi(ctx, m[1][0], m[1][1], v.k.s * 0.9, ((t - 1.0) % 0.6) / 0.6, -1.2 + Math.sin(t * 9), 1.4, Math.floor(t / 0.6));
        if (pek) bryzgKrwi(ctx, m[1][0], m[1][1] + v.k.s * 0.2, v.k.s * 1.0, (t - 1.7) / 0.9, Math.PI * 0.6, 2.0, 31);
        if (t > 1.2) kapie(ctx, m[1], v.k.s, czas, 2);
      } else {
        // ciśnięty — leci w lewo, pada wypatroszony, trzewia wloką się za nim
        const f = zakres(t, 3.2, 3.9);
        const x = mix(cx - 2.6, -2.4, f), y = -2.2 * dzwon(f, 0, 1) - 0.08;
        if (f >= 1) { ctx.save(); ctx.translate(v.X(-1.75), v.Y(0)); rysujTrzewia(ctx, v.k.s * 1.1, 0.1); ctx.restore(); }
        ctx.save(); ctx.translate(v.X(x), v.Y(y)); ctx.rotate(f * 4);
        rysujLudzika(ctx, v.k.s, { ...pozaTrup(1), brak: { trzewia: true } }, t); ctx.restore();
      }
      // ofiara 2 — rozrywana na pół
      const sr: P = [(m[0][0] + m[2][0]) / 2, (m[0][1] + m[2][1]) / 2];
      if (t < 3.6) zarlok(ctx, v, 1.6, pozaLezy(t, 2), -1, 1, undefined, t);
      else if (k2) {
        if (roz < 0.5) {
          wPaszczy(ctx, v, sr, { ...pozaWPaszczy(t, 1), krew: 0.4 + roz }, Math.PI / 2, t);
        } else {
          wPaszczy(ctx, v, m[0], { ...pozaWPaszczy(t, 0.6), brak: { polowa: 'gora' } }, Math.PI / 2 + 0.6, t);
          wPaszczy(ctx, v, m[2], { ...pozaWPaszczy(t, 0.6), brak: { polowa: 'dol' } }, Math.PI / 2 - 0.4, t);
          kapie(ctx, m[0], v.k.s, czas, 3); kapie(ctx, m[2], v.k.s, czas, 3);
          // trzewia wypadają z rozdartego tułowia i spadają w błoto
          const sp = zakres(t, 4.6, 5.3);
          ctx.save(); ctx.translate(sr[0], mix(sr[1] + v.k.s * 0.2, v.Y(0), sp)); rysujTrzewia(ctx, v.k.s * 1.2, sp * 1.5 - 0.6); ctx.restore();
        }
        // fontanna krwi i czerwona mgła w chwili rozdarcia
        bryzgKrwi(ctx, sr[0], sr[1], v.k.s * 1.2, (t - 4.55) / 1.1, -Math.PI / 2, 2.4, 7);
        bryzgKrwi(ctx, sr[0], sr[1], v.k.s * 1.0, (t - 4.6) / 1.0, Math.PI * 0.85, 1.8, 19);
        bryzgKrwi(ctx, sr[0], sr[1], v.k.s * 1.0, (t - 4.62) / 1.0, Math.PI * 0.15, 1.8, 23);
        const mg = dzwon(t, 4.5, 5.8);
        if (mg > 0) {
          const gm = ctx.createRadialGradient(sr[0], sr[1], 0, sr[0], sr[1], v.k.s * 1.6);
          gm.addColorStop(0, `rgba(120,6,4,${0.5 * mg})`); gm.addColorStop(1, 'rgba(90,0,0,0)');
          ctx.fillStyle = gm; ctx.fillRect(sr[0] - v.k.s * 1.6, sr[1] - v.k.s * 1.6, v.k.s * 3.2, v.k.s * 3.2);
        }
      } else {
        zarlok(ctx, v, 0.4, { ...pozaTrup(2), brak: { polowa: 'gora' } }, 1, 1, 0.08, t);
        zarlok(ctx, v, 1.6, { ...pozaTrup(3), brak: { polowa: 'dol' } }, -1, 1, 0.1, t);
        ctx.save(); ctx.translate(v.X(1.0), v.Y(0)); rysujTrzewia(ctx, v.k.s * 1.2, 0.3); ctx.restore();
      }
      // ofiara 3 — pełznie, zmiażdżona łapą (głowa odskakuje), podniesiona i połknięta
      if (t < 6.9) zarlok(ctx, v, mix(-0.4, 0.4, zakres(t, 4, 6.9)), pozaCzolga(t, 1.6, 4), 1, 1, undefined, t);
      else if (t < 7.4) {
        zarlok(ctx, v, 0.5, { ...pozaTrup(0), krew: 1, brak: { glowa: true, trzewia: true } }, 1, 1, 0.06, t);
        bryzgKrwi(ctx, v.X(0.5), v.Y(-0.1), v.k.s * 1.0, (t - 6.9) / 0.6, -Math.PI / 2, 2.2, 9);
      } else if (t < 8.6) {
        const lyk = zakres(t, 8.0, 8.6);
        wPaszczy(ctx, v, m[1], { ...pozaWPaszczy(t, 0.3), krew: 1, brak: { glowa: true, trzewia: true } }, Math.PI / 2 - 0.9, t, 1 - lyk * 0.7);
      }
      if (t > 6.9) {
        const f = zakres(t, 6.9, 7.6);
        ctx.save(); ctx.translate(v.X(mix(0.9, 2.6, f)), v.Y(-0.06 - Math.sin(f * Math.PI) * 1.4)); rysujOderwanaGlowe(ctx, v.k.s, f * 8 + 1.5); ctx.restore();
      }
      if (t > 7.4) kapie(ctx, m[1], v.k.s, czas, 2);
      // ofiara 4 — klęczy przed nim i wyje; pitbull odrywa mu rękę
      const x4 = cx - 2.15;
      if (t > 4.5) {
        if (t < 7.6) zarlok(ctx, v, x4, pozaWyje(t, 6), -1, 1, undefined, t);
        else {
          const pad = zakres(t, 7.8, 8.6);
          zarlok(ctx, v, x4 - pad * 0.3, { ...(pad < 0.5 ? pozaWyje(t, 6) : pozaTrup(4)), krew: 1, brak: { rekaP: true } }, -1, 1, pad < 0.5 ? undefined : 0.08, t);
          ctx.save(); ctx.translate(m[2][0], m[2][1]); ctx.rotate(-0.4 + Math.sin(czas / 45) * 0.3 * zakres(t, 8.4, 8.7)); rysujOderwanaReke(ctx, v.k.s, 1.2, 0.6); ctx.restore();
          bryzgKrwi(ctx, v.X(x4 - 0.05), v.Y(-0.62), v.k.s * 0.9, (t - 7.6) / 0.9, -Math.PI * 0.8, 1.8, 41);
          kapie(ctx, m[2], v.k.s, czas, 2);
        }
      }
      deszcz(ctx, R, czas, 1);
      napis(ctx, R, 'Cerber. Trzy gardła, czerwone ślepia, tłusta czarna broda i brzuch szeroki.', t - 0.3, true, r, 4.0 - t);
      napis(ctx, R, 'Szarpie potępionych, obdziera ze skóry, ćwiartuje. Nikt mu się nie wymknie.', t - 6.3, false, r);
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
      kwestia(ctx, R, 'Mistrzu…!', (t - 2.6) * 2, r);
      napis(ctx, R, 'Wtedy przyszło ich dwóch. Jeden z nich rzucał cień — był żywy.', t - 0.2, true, r);
    },
  },
  // 6. Przewodnik nabiera ziemi i rzuca w gardła — trzy ujęcia po sobie (schyla się, garście błota, rzut)
  {
    od: 32, do: 38.5, rysuj(ctx, R, t, czas, _sim, r) {
      const [nr, lt] = ciecia(t, [0, 1.9, 3.5]);
      if (nr === 0) {
        // schyla się do błota (półzbliżenie, kamera lekko najeżdża)
        const v = new Widok(R, { x: -6.6, y: -0.75, s: (R.h / 2.6) * (1 + lt * 0.04) }, 0, czas);
        tlo(ctx, v);
        tlum(ctx, v, t + 32, -9.5, -4.5);
        ctx.save(); ctx.translate(v.X(-6.9), v.Y(0)); wedrowiec(ctx, v.k.s * 1.05, false, 0, 0, gl(lt / 1.2) * 0.8); ctx.restore();
        ctx.fillStyle = 'rgb(34,30,22)'; ctx.beginPath(); ctx.ellipse(v.X(-6.3), v.Y(0.02), v.k.s * 0.32, v.k.s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
        deszcz(ctx, R, czas, 0.9);
      } else if (nr === 1) {
        // z dołu: przewodnik prostuje się z pełnymi garściami błota, ciecze mu po rękach
        const v = new Widok(R, { x: -6.75, y: -0.95, s: (R.h / 1.9) * (1 + lt * 0.05) }, 0, czas);
        tlo(ctx, v);
        const h = v.k.s * 1.05;
        ctx.save(); ctx.translate(v.X(-6.9), v.Y(0)); wedrowiec(ctx, h, false, 0, 0.35 + 0.45 * zakres(lt, 0.2, 1.1), 0.25 * (1 - zakres(lt, 0, 0.8))); ctx.restore();
        const rx = v.X(-6.9) + h * (0.12 + 0.2 * (0.35 + 0.45 * zakres(lt, 0.2, 1.1))), ry = v.Y(0) - h * (0.42 + 0.38 * (0.35 + 0.45 * zakres(lt, 0.2, 1.1)));
        ctx.fillStyle = 'rgb(40,32,22)'; ctx.beginPath(); ctx.ellipse(rx, ry - h * 0.02, h * 0.06, h * 0.035, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 5; i++) { const f = ((czas / 520) + i * 0.21) % 1; ctx.beginPath(); ctx.ellipse(rx + (i - 2) * h * 0.012, ry + f * h * 0.5, h * 0.006, h * 0.016, 0, 0, Math.PI * 2); ctx.fill(); }
        deszcz(ctx, R, czas, 0.9);
      } else {
        // rzut w trzy rozwarte gardła — od dołu, pies nad kamerą
        const v = new Widok(R, { x: 1.4, y: -1.9, s: R.h / 4.0 }, dzwon(lt, 0.6, 1.6) * 0.7, czas);
        tlo(ctx, v);
        const p = pozaCerbera(); p.czas = czas; p.krew = 1;
        p.glowy.forEach((g2, i) => { g2.pochyl = -0.25 + 0.08 * i; g2.paszcza = 1; g2.wysun = 0.3; });
        const m = cerber(ctx, v, 2.6, p, -1);
        m.forEach((q) => kapie(ctx, q, v.k.s, czas, 1.5));
        const f = zakres(lt, 0.3, 1.3);
        for (let i = 0; i < 16; i++) {
          const ff = Math.max(0, Math.min(1, f * 1.3 - (i % 4) * 0.08));
          if (ff <= 0 || ff >= 1) continue;
          const cel = m[i % 3];
          const x = mix(R.x - R.w * 0.05, cel[0], ff), y = mix(R.y + R.h * 0.95, cel[1], ff) - Math.sin(ff * Math.PI) * R.h * 0.2;
          ctx.fillStyle = 'rgb(48,38,26)'; ctx.beginPath(); ctx.arc(x + (los(i) - 0.5) * 24, y, R.h * (0.012 + 0.01 * los(i * 3)), 0, Math.PI * 2); ctx.fill();
        }
        deszcz(ctx, R, czas, 0.9);
      }
      napis(ctx, R, 'Przewodnik schylił się, nabrał pełne garście ziemi i cisnął je w łapczywe gardła.', t - 0.5, false, r);
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
      napis(ctx, R, 'Pies zamilkł nad tą strawą jak głodny nad kością.', t - 0.3, true, r);
      napis(ctx, R, 'A oni przeszli — i zeszli niżej. Bo z piekła wychodzi się tylko przez jego dno.', t - 2.4, false, r);
    },
  },
  // 8. Ktoś to widział: żarłocy leżą twarzą w błocie; jeden powoli unosi głowę i patrzy tam, gdzie zeszli wędrowcy
  {
    od: 44.5, do: 47.5, rysuj(ctx, R, t, czas, _sim, r) {
      const k = { x: 0.3 + t * 0.06, y: -0.5, s: (R.h / 2.3) * (1 + t * 0.07) };
      const v = new Widok(R, k, 0, czas);
      tlo(ctx, v);
      for (let j = 0; j < 6; j++) {
        if (j === 3) continue;
        zarlok(ctx, v, -3.3 + j * 1.35 + los(j * 7) * 0.4, pozaLezy(t + j * 0.7, j + 11), j % 2 ? 1 : -1, 0.95, undefined, t);
      }
      // ten jeden: z leżenia unosi tułów na łokciach, głowa w górę i w prawo
      const u = zakres(t, 0.4, 2.2);
      const p: PozaLudzika = { ...pozaLezy(0, 3), tulow: Math.PI / 2 - 0.42 * u, glowa: mix(-0.1, -0.85, u), ramieL: mix(Math.PI / 2 + 0.3, 0.35, u), lokiecL: mix(0.3, 1.25, u), ramieP: mix(Math.PI / 2, 0.2, u), lokiecP: mix(0.4, 1.35, u), udoL: -Math.PI / 2 + 0.12, kolanoL: -0.1, udoP: -Math.PI / 2 + 0.2, kolanoP: -0.25, usta: 0.2, krew: 0.15 };
      zarlok(ctx, v, 0.75, p, 1, 1.05, 0.06 + 0.07 * u, t);
      deszcz(ctx, R, czas, 0.8);
      napis(ctx, R, 'Ktoś to widział.', t - 1.2, false, r * 1.2);
    },
  },
  // 9. Wstają z błota: grabarz, mnich, rycerz — trzy ujęcia po sobie
  {
    od: 47.5, do: 57.5, rysuj(ctx, R, t, czas, sim, r) {
      const opisy = [
        'Grabarz. Za życia kopał groby za miskę strawy. Kopie i teraz.',
        'Mnich. Modlił się z pełnymi ustami — ale słowa modlitwy pamięta.',
        'Rycerz. Przejadł cały majątek. Miecza nie oddał.',
      ];
      const role: ('robotnik' | 'pobozny' | 'rycerz')[] = ['robotnik', 'pobozny', 'rycerz'];
      const [i, lt] = ciecia(t, [0, 3.3, 6.6]);
      const v = new Widok(R, { x: 0.1 + lt * 0.05, y: -0.85, s: (R.h / 2.7) * (1 + lt * 0.025) }, 0, czas);
      tlo(ctx, v);
      for (let j = 0; j < 4; j++) zarlok(ctx, v, -2.4 + j * 1.6 + (j > 1 ? 0.9 : 0), pozaLezy(t + j, j + i), j % 2 ? 1 : -1, 0.85, undefined, t);
      const wst = zakres(lt, 0.5, 2.0);
      if (i === 0) {
        // łopata tkwi w błocie; grabarz chwyta ją i wyciąga
        const wyc = zakres(lt, 1.6, 2.6);
        lopata(ctx, v.X(0.45), v.Y(-0.3 - wyc * 0.4), v.k.s, 0.25 - wyc * 0.2);
      }
      if (i === 2) {
        const wyc = zakres(lt, 1.8, 2.8);
        miecz(ctx, v.X(0.5), v.Y(0.15 - wyc * 0.9), v.k.s, 0.15 - wyc * 0.3);
      }
      postacGry(ctx, sim, role[i], 'film' + i, v.X(-0.1), v.Y(0), v.k.s * 1.0, czas + i * 300, i === 1 && lt > 2.2 ? 'modli' : 'stoi', 1, wst);
      deszcz(ctx, R, czas, 0.8);
      if (i === 1) kwestia(ctx, R, 'Pater noster, qui es in caelis…', (lt - 2.2) * 2, r, 3.3 - lt);
      napis(ctx, R, opisy[i], (lt - 0.7) * 2, true, r, 3.3 - lt);
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
      kwestia(ctx, R, 'Oni zeszli w dół. Zejdziemy i my.', (t - 0.6) * 2, r, 2.5 - t);
      kwestia(ctx, R, 'Przez trzewia tej ziemi…', (t - 2.7) * 2, r);
    },
  },
  // 11. Pod ziemię: przekrój trzewi kręgu — warstwy mułu, kości, wciągane ciała, żyły ziemi; pieczęć na dnie
  {
    od: 62.5, do: 69, rysuj(ctx, R, t, czas, _sim, r) {
      const zjazd = zakres(t, 0.2, 4.5);
      const yG = R.y + R.h * mix(0.55, -0.6, zjazd);
      ctx.fillStyle = 'rgb(18,20,22)'; ctx.fillRect(R.x, R.y, R.w, R.h);
      const g = ctx.createLinearGradient(0, yG, 0, yG + R.h * 1.6);
      g.addColorStop(0, 'rgb(46,38,28)'); g.addColorStop(0.5, 'rgb(36,24,18)'); g.addColorStop(1, 'rgb(40,14,10)');
      ctx.fillStyle = g; ctx.fillRect(R.x, yG, R.w, R.h * 2);
      // warstwy: nierówne pasy mułu i gliny
      for (let i = 0; i < 12; i++) {
        const y = yG + R.h * (0.06 + i * 0.13);
        ctx.fillStyle = i % 2 ? 'rgba(20,14,10,0.45)' : 'rgba(70,56,40,0.22)';
        ctx.beginPath(); ctx.moveTo(R.x, y);
        for (let x = 0; x <= R.w; x += R.w / 24) ctx.lineTo(R.x + x, y + Math.sin(x / (R.w * 0.11) + i * 2.3) * R.h * 0.018 + (los(i * 31 + x) - 0.5) * R.h * 0.01);
        ctx.lineTo(R.x + R.w, y + R.h * 0.07); ctx.lineTo(R.x, y + R.h * 0.07); ctx.closePath(); ctx.fill();
      }
      // kamienie i kości w glinie
      for (let i = 0; i < 26; i++) {
        const x = R.x + los(i * 7 + 1) * R.w, y = yG + R.h * (0.1 + los(i * 13) * 1.35), rr = R.h * (0.01 + 0.025 * los(i * 3));
        if (i % 3 === 0) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(los(i) * 3);
          ctx.strokeStyle = 'rgba(176,164,140,0.75)'; ctx.lineWidth = rr * 0.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-rr * 2, 0); ctx.lineTo(rr * 2, 0); ctx.stroke();
          ctx.fillStyle = 'rgba(176,164,140,0.75)'; for (const e of [-2, 2]) { ctx.beginPath(); ctx.arc(rr * e, -rr * 0.25, rr * 0.4, 0, Math.PI * 2); ctx.arc(rr * e, rr * 0.25, rr * 0.4, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        } else {
          const gk = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, rr * 0.1, x, y, rr);
          gk.addColorStop(0, 'rgb(84,76,64)'); gk.addColorStop(1, 'rgb(32,28,22)');
          ctx.fillStyle = gk; ctx.beginPath(); ctx.ellipse(x, y, rr * 1.3, rr, los(i) * 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      // żyły ziemi — tętnią (trzewia kręgu trawią)
      const odd = Math.sin(czas / 600);
      for (let i = 0; i < 5; i++) {
        const x0 = R.x + R.w * (0.1 + i * 0.2), y0 = yG + R.h * 0.15;
        ctx.strokeStyle = `rgba(${110 + 30 * odd},${22},${18},0.55)`; ctx.lineWidth = R.h * (0.012 + 0.004 * odd) * (1 + (i % 2) * 0.5);
        ctx.beginPath(); ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0 + R.w * 0.08, y0 + R.h * 0.4, x0 - R.w * 0.1, y0 + R.h * 0.8, R.x + R.w * 0.5 + (i - 2) * R.w * 0.04, yG + R.h * 1.3);
        ctx.stroke();
      }
      // ciała wciągane przez ziemię: całe, rozerwane, bez głów
      const braki = [undefined, { polowa: 'gora' as const }, { glowa: true }, { trzewia: true }, { polowa: 'dol' as const }, undefined, { rekaP: true, nogaL: true }, undefined, { trzewia: true }];
      for (let i = 0; i < 9; i++) {
        const x = R.x + R.w * (0.08 + los(i * 7) * 0.84), y = yG + R.h * (0.2 + los(i * 3) * 1.0) - zjazd * R.h * 0.04 * (i % 3);
        ctx.save(); ctx.translate(x, y); ctx.rotate(los(i) * 6);
        ctx.globalAlpha = 0.85;
        rysujLudzika(ctx, R.h * 0.16, { ...pozaTrup(i), krew: 0.8, brak: braki[i] }, czas / 1000);
        ctx.restore();
      }
      // szóstka wchodzi w otwór na górze
      ctx.fillStyle = 'rgb(6,4,4)'; ctx.beginPath(); ctx.ellipse(R.x + R.w * 0.55, yG, R.w * 0.03, R.h * 0.015, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 6; i++) ctx.fillRect(R.x + R.w * (0.45 + i * 0.012), yG - R.h * 0.04, R.w * 0.006, R.h * 0.04);
      // pieczęć na dnie: kamienne koło z płaskorzeźbą trójgłowego psa, skute łańcuchami, łuna spod spodu
      const py = yG + R.h * 1.35, px = R.x + R.w * 0.5, pr2 = R.h * 0.16;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, pr2 * 2.8);
      pg.addColorStop(0, `rgba(230,60,30,${0.45 + 0.2 * odd})`); pg.addColorStop(1, 'rgba(230,60,30,0)');
      ctx.fillStyle = pg; ctx.fillRect(px - pr2 * 3, py - pr2 * 3, pr2 * 6, pr2 * 6);
      const gp = ctx.createRadialGradient(px - pr2 * 0.3, py - pr2 * 0.4, pr2 * 0.1, px, py, pr2);
      gp.addColorStop(0, 'rgb(118,112,102)'); gp.addColorStop(1, 'rgb(58,54,50)');
      ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(px, py, pr2, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr2 * 0.88, 0, Math.PI * 2); ctx.clip();
      ctx.translate(px - pr2 * 0.1, py + pr2 * 0.55);
      const pc = pozaCerbera(); pc.czas = 0; pc.kamien = 1; pc.glowy.forEach((gg) => { gg.oczy = 0.6; gg.paszcza = 0.3; gg.pochyl = -0.2; });
      rysujCerbera(ctx, pr2 * 1.3, pc);
      ctx.restore();
      ctx.strokeStyle = 'rgb(44,40,36)'; ctx.lineWidth = pr2 * 0.07;
      ctx.beginPath(); ctx.moveTo(px - pr2 * 1.5, py - pr2); ctx.lineTo(px + pr2 * 1.5, py + pr2); ctx.moveTo(px + pr2 * 1.5, py - pr2); ctx.lineTo(px - pr2 * 1.5, py + pr2); ctx.stroke();
      napis(ctx, R, 'Ziemia pod nimi drgnęła.', t - 0.4, true, r, 2.0 - t);
      napis(ctx, R, 'Ty jesteś trzewiami tego kręgu — ziemią, która trawi żarłoków. Czujesz każdy ich krok.', t - 2.0, true, r);
      napis(ctx, R, 'Na samym dnie czeka zapieczętowane zejście do kręgu czwartego.', t - 4.0, false, r);
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
      napis(ctx, R, 'Cerber podniósł łby znad trupa. Zapamiętał ich zapach.', t - 1.6, false, r);
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
  // obraz filmowy: ziarno, gradacja, winieta
  kino(ctx, R, czas);
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

void pozaStoi;
