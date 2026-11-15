import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Prost } from '../sim/world';
import type { Creature } from '../sim/creatures';
import { SURFACE_Y } from '../sim/world';
import { SWIAT } from '../nastawy/swiat';
import { SCHODY as S, BUDOWA_SCHODOW } from '../nastawy/loch';
import { wolnoRuszac } from './nastroj';
import { warstwaMroku } from './mrok';
import { spirala, wysokoscStopnia, katSpirali, liczbaStopni, szczytSchodow, wysokoscSzczytu, pozycjaDrabiny, dolDrabiny, type Spirala } from '../sim/budowa-schodow';

/**
 * SCHODY DROGI WIERNYCH (6.11, decyzja użytkownika: dawne schody — zygzak biegów z poręczą na słupkach — „były
 * obrzydliwe i wyglądały nowocześnie” i „budowały się nierealistycznie”, wyrastały stopień po stopniu z pustki).
 *
 * Teraz w każdym odcinku szybu są schody kręcone wykute w skale: kamienne stopnie wokół słupa, jak w wieży zamku.
 *  - Spirala rysuje się w lekkim ujęciu z góry (SCHODY.ukos): widać stopnice, podstopnice, spód kolejnych stopni
 *    i bębny słupa; malarsko — od stopni z tyłu, przez słup, do stopni z przodu.
 *  - Kamień ma barwę warstwy, w której wykuto szyb (płytka — ciepła, głęboka — chłodna), stopnie z tyłu są w cieniu,
 *    na ścianie szybu wisi lina na żelaznych pierścieniach, środek stopni jest wytarty stopami.
 *  - Schody się stawia (6.11, sim/budowa-schodow.ts): rysuje się tylko to, co już zbudowano — od dołu odcinka do
 *    najwyższego osadzonego stopnia (mur klatki rząd ciosów wyżej, słup do jego bębna); wyżej jest surowa studnia,
 *    drabina i rusztowanie (render/budowa-schodow.ts). Z wykuwanego kafla szybu sypią się okruchy i pył, a świeżo
 *    ciosana skała jest przez chwilę jaśniejsza.
 *  - Postacie idą po spirali (render/lud/rozstep.ts: naSchodach), stopa po stopniu: na niższy (wyższy) stopień
 *    przechodzą przy jego nosie. Pod stopami cień na stopnicy (stopniePodStopami), a to, co leży bliżej widza
 *    (słup, gdy postać jest za nim, i stopnie po drugiej stronie spirali), rysuje się na niej (zaslonNaSchodach) —
 *    postać znika za słupem, zamiast sunąć po wierzchu rysunku.
 * Rysunek przed mrokiem — ciemność zakrywa schody jak skałę. Placeholder do podmiany na grafikę.
 */

type RGB = [number, number, number];
const TAU = Math.PI * 2;
const TUSZ = 'rgba(38,26,18,0.78)';

/** Tani skrót liczby — stałe kształty (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Wysokość stopnia (kafle). */
const WYS = wysokoscStopnia;

/** Barwa ciosanego kamienia: płytka warstwa (miękka, ciepła), środkowa, głęboka (twarda, chłodna) — płynnie. */
const KAMIEN: RGB[] = [[150, 134, 112], [138, 128, 116], [118, 113, 108]];
function kamien(sim: Sim, y: number): RGB {
  const W = SWIAT.warstwy, h = sim.world.h;
  const g1 = SURFACE_Y + W.plytkaDo * (h - SURFACE_Y), g2 = SURFACE_Y + W.srodkowaDo * (h - SURFACE_Y);
  const t1 = Math.max(0, Math.min(1, (y - g1 + 4) / 8)), t2 = Math.max(0, Math.min(1, (y - g2 + 4) / 8));
  const a = KAMIEN[0], b = KAMIEN[1], c = KAMIEN[2];
  const m = (p: RGB, q: RGB, t: number): RGB => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  return m(m(a, b, t1), c, t2);
}
const barwa = (k: RGB, m: number, a = 1): string =>
  `rgba(${Math.min(255, Math.round(k[0] * m))},${Math.min(255, Math.round(k[1] * m))},${Math.min(255, Math.round(k[2] * m))},${a})`;

type Pkt = [number, number];

/** Rzut punktu spirali na ekran: kąt, promień od środka szybu, wysokość (kafle). Dalej w głąb — odrobinę wyżej. */
function rzut(cam: Camera, sp: Spirala, th: number, r: number, y: number): Pkt {
  return [cam.toScreenX(sp.c + r * Math.sin(th)), cam.toScreenY(y - S.ukos * r * Math.cos(th))];
}

function wielokat(ctx: CanvasRenderingContext2D, p: Pkt[]): void {
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
  ctx.closePath();
}

/**
 * Jasność pionowej ściany kamienia o zwrocie (nx w prawo, nz w głąb): światło pada z lewej i od widza, z góry;
 * do tego cień głębi — co dalej w głąb szybu, tym ciemniej.
 */
function jasnoscSciany(nx: number, nz: number, glebia: number): number {
  const swiatlo = Math.max(0, -0.55 * nx - 0.83 * nz);
  return (0.52 + 0.36 * swiatlo) * (1 - 0.22 * Math.max(0, glebia));
}

/** Ściany jednego stopnia i jego głębia (cosinus środka: 1 — tył szybu, −1 — przód) — malarsko, od dalszych. */
interface Stopien { k: number; y: number; a: number; b: number; glebia: number }

/**
 * Jeden stopień: kamienna płyta między kątami a–b i promieniami słupa i ściany. Stopnica na wysokości y; płyta jest
 * odrobinę grubsza od stopnia (`grubosc`), leży na niższym stopniu i wchodzi w słup i w ścianę — jak w prawdziwych
 * schodach kręconych, gdzie każdy stopień to jeden ciosany kamień. Widać: bok płyty od strony widza (z prawej —
 * podstopnicę, z lewej — czoło pod wyższym stopniem), krawędź przy ściętej przedniej ścianie szybu i stopnicę.
 * Bez konturów dookoła — kamień modeluje światło: stopnica jasna, boki w półcieniu, pod nosem stopnia cień.
 */
function rysujStopien(ctx: CanvasRenderingContext2D, cam: Camera, sp: Spirala, st: Stopien, k0: RGB, z: number, szczegoly: boolean): void {
  const h = WYS(), T = S.grubosc * h;
  const { a, b, y, k } = st;
  const r0 = sp.rn - 0.03, r1 = sp.R;
  const ton = 0.97 + 0.06 * los(k * 7919 + Math.round(sp.c * 31));
  // bok od strony niższego stopnia (z prawej połowy widać go od przodu): od stopnicy do stopnicy niższego
  if (Math.sin(b) > 0.01) {
    const p: Pkt[] = [rzut(cam, sp, b, r0, y), rzut(cam, sp, b, r1, y), rzut(cam, sp, b, r1, y + h), rzut(cam, sp, b, r0, y + h)];
    ctx.fillStyle = barwa(k0, jasnoscSciany(Math.cos(b), -Math.sin(b), st.glebia) * ton); wielokat(ctx, p); ctx.fill();
  }
  // bok od strony wyższego stopnia (z lewej): ta część, której nie przykrywa wyższy stopień
  if (Math.sin(a) < -0.01) {
    const p: Pkt[] = [rzut(cam, sp, a, r0, y + T - h), rzut(cam, sp, a, r1, y + T - h), rzut(cam, sp, a, r1, y + T), rzut(cam, sp, a, r0, y + T)];
    ctx.fillStyle = barwa(k0, jasnoscSciany(-Math.cos(a), Math.sin(a), st.glebia) * ton * 0.92); wielokat(ctx, p); ctx.fill();
  }
  // krawędź płyty przy ściętej przedniej ścianie szybu (przednia połowa)
  const luk: number[] = [];
  for (let i = 0; i <= 4; i++) { const t = a + (b - a) * (i / 4); if (Math.cos(t) < 0.02) luk.push(t); }
  if (luk.length >= 2) {
    const gora = luk.map((t) => rzut(cam, sp, t, r1, y)), dol = luk.map((t) => rzut(cam, sp, t, r1, y + T)).reverse();
    const mid = luk[luk.length >> 1];
    ctx.fillStyle = barwa(k0, jasnoscSciany(Math.sin(mid), Math.cos(mid), st.glebia) * ton); wielokat(ctx, [...gora, ...dol]); ctx.fill();
    // cień pod płytą — płyta niżej jest w jej cieniu
    if (szczegoly) {
      ctx.strokeStyle = 'rgba(30,20,14,0.35)'; ctx.lineWidth = Math.max(0.8, z * 0.045);
      ctx.beginPath(); ctx.moveTo(dol[0][0], dol[0][1]); for (const q of dol) ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
  }
  // stopnica
  const tr: Pkt[] = [];
  for (let i = 0; i <= 4; i++) tr.push(rzut(cam, sp, a + (b - a) * (i / 4), r1, y));
  tr.push(rzut(cam, sp, b, r0, y), rzut(cam, sp, a, r0, y));
  ctx.fillStyle = barwa(k0, (1.06 - 0.16 * Math.max(0, st.glebia)) * ton); wielokat(ctx, tr); ctx.fill();
  if (!szczegoly) return;
  // nos stopnia: jasna krawędź, pod nią ciemna linia cienia na podstopnicy
  const n0 = rzut(cam, sp, b, r0, y), n1 = rzut(cam, sp, b, r1, y);
  ctx.strokeStyle = barwa(k0, 1.32 * ton, 0.75); ctx.lineWidth = Math.max(0.8, z * 0.04);
  ctx.beginPath(); ctx.moveTo(n0[0], n0[1]); ctx.lineTo(n1[0], n1[1]); ctx.stroke();
  ctx.strokeStyle = 'rgba(32,22,16,0.4)'; ctx.lineWidth = Math.max(0.8, z * 0.035);
  ctx.beginPath(); ctx.moveTo(n0[0], n0[1] + z * 0.05); ctx.lineTo(n1[0], n1[1] + z * 0.05); ctx.stroke();
  // wytarty środek stopnicy — tam, gdzie chodzą (lekko jaśniejszy, wklęsły)
  const w0 = rzut(cam, sp, a + (b - a) * 0.2, S.linia, y), w1 = rzut(cam, sp, a + (b - a) * 0.8, S.linia, y);
  ctx.strokeStyle = barwa(k0, 1.2 * ton, 0.45); ctx.lineWidth = Math.max(1, z * 0.08);
  ctx.beginPath(); ctx.moveTo(w0[0], w0[1] + z * 0.02); ctx.lineTo(w1[0], w1[1] + z * 0.02); ctx.stroke();
}

/** Kamienny słup spirali: gładki walec z bębnów (spoina co bęben), od góry odcinka do posadzki. */
function rysujSlup(ctx: CanvasRenderingContext2D, cam: Camera, sp: Spirala, y0: number, y1: number, kolor: (y: number) => RGB, z: number, szczegoly: boolean): void {
  const xl = cam.toScreenX(sp.c - sp.rn), xr = cam.toScreenX(sp.c + sp.rn);
  const sy0 = cam.toScreenY(y0), sy1 = cam.toScreenY(y1);
  const k = kolor((y0 + y1) / 2);
  const g = ctx.createLinearGradient(xl, 0, xr, 0);
  g.addColorStop(0, barwa(k, 0.86)); g.addColorStop(0.28, barwa(k, 1.04)); g.addColorStop(0.62, barwa(k, 0.8)); g.addColorStop(1, barwa(k, 0.5));
  ctx.fillStyle = g; ctx.fillRect(xl, sy0, xr - xl, sy1 - sy0);
  if (!szczegoly) return;
  // spoiny bębnów: przedni łuk elipsy co bęben (bębny równe — ciosane na miarę)
  ctx.strokeStyle = 'rgba(40,28,20,0.32)'; ctx.lineWidth = Math.max(0.7, z * 0.03);
  const krok = S.obrot / 4;
  for (let y = sp.ys + krok; y < y1; y += krok) {
    if (y < y0 - 0.5) continue;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const q = rzut(cam, sp, Math.PI / 2 + Math.PI * (i / 8), sp.rn, y); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
    ctx.stroke();
  }
}

/**
 * Ściana klatki schodowej za spiralą: okrągła, z ciosów na zakładkę. Z góry, odrobinę z góry: rzędy wyginają się
 * łukiem (środek, najdalej, leży wyżej), spoiny pionowe gęstnieją ku bokom; boki w cieniu.
 */
function rysujSciane(ctx: CanvasRenderingContext2D, cam: Camera, sp: Spirala, y0: number, y1: number, kolor: (y: number) => RGB, z: number, szczegoly: boolean, pomin: (y: number) => boolean): void {
  const xl = cam.toScreenX(sp.c - sp.R - 0.05), xr = cam.toScreenX(sp.c + sp.R + 0.05);
  const k = kolor((y0 + y1) / 2);
  const g = ctx.createLinearGradient(xl, 0, xr, 0);
  g.addColorStop(0, barwa(k, 0.3)); g.addColorStop(0.2, barwa(k, 0.48)); g.addColorStop(0.5, barwa(k, 0.58)); g.addColorStop(0.8, barwa(k, 0.46)); g.addColorStop(1, barwa(k, 0.28));
  ctx.fillStyle = g;
  for (let y = y0; y <= y1; y++) if (!pomin(y)) ctx.fillRect(xl, cam.toScreenY(y), xr - xl, z + 0.5);
  if (!szczegoly) return;
  const rzad = 0.62, n = 9;
  ctx.strokeStyle = 'rgba(24,16,12,0.34)'; ctx.lineWidth = Math.max(0.7, z * 0.03);
  for (let yr = sp.ys + rzad * Math.floor((y0 - sp.ys) / rzad); yr <= y1 + 1; yr += rzad) {
    if (pomin(Math.floor(yr))) continue;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const q = rzut(cam, sp, -Math.PI / 2 + Math.PI * (i / 12), sp.R, yr); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
    ctx.stroke();
    // spoiny pionowe na zakładkę
    const zak = Math.round((yr - sp.ys) / rzad) % 2 ? 0.5 : 0;
    ctx.beginPath();
    for (let j = 0; j < n; j++) {
      const f = -Math.PI / 2 + Math.PI * ((j + zak + 0.5) / n);
      const q0 = rzut(cam, sp, f, sp.R, yr), q1 = rzut(cam, sp, f, sp.R, yr + rzad);
      ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]);
    }
    ctx.stroke();
  }
}

/** Lina na żelaznych pierścieniach w tylnej ścianie (nad stopniami, tylko w tylnej połowie — przód jest ścięty). */
function rysujLine(ctx: CanvasRenderingContext2D, cam: Camera, sp: Spirala, kMin: number, kMax: number, z: number): void {
  const D = TAU / S.stopni, h = WYS();
  const co = S.pierscienCo;
  let poprz: { p: Pkt; tyl: boolean } | null = null;
  for (let k = Math.floor(kMin / co) * co; k <= kMax + co; k += co) {
    const th = sp.th0 + k * D, y = sp.ys + k * h - S.lina;
    const tyl = Math.cos(th) > -0.05;
    const p = rzut(cam, sp, th, sp.R - 0.04, y);
    if (poprz && poprz.tyl && tyl) {
      const m = rzut(cam, sp, th - D * co / 2, sp.R - 0.04, y - h * co / 2 + 0.14);
      ctx.strokeStyle = 'rgba(30,18,10,0.5)'; ctx.lineWidth = Math.max(1.6, z * 0.09);
      ctx.beginPath(); ctx.moveTo(poprz.p[0], poprz.p[1]); ctx.quadraticCurveTo(m[0], m[1], p[0], p[1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(158,124,80,0.9)'; ctx.lineWidth = Math.max(0.9, z * 0.05); ctx.stroke();
    }
    if (tyl) {
      ctx.strokeStyle = 'rgba(30,28,30,0.95)'; ctx.lineWidth = Math.max(1, z * 0.045);
      ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(1.2, z * 0.07), 0, TAU); ctx.stroke();
    }
    poprz = { p, tyl };
  }
}

/** Kiedy kafel schodów pojawił się na ekranie (świeżo wykuty) — stan rysunku, nie gry. */
const pojawienie = new Map<number, number>();
let pierwszaKlatka = true;

/**
 * Narysowany kawałek odcinka (ściana, lina, stopnie, słup — to, co stoi): płótno z `KAWALEK` rzędami odcinka przy
 * danym przybliżeniu, rysowane na nowo dopiero, gdy w jego pobliżu wykuto kafel, osadzono stopień albo zmieniło się
 * przybliżenie — w klatce idzie tylko to, co w kadrze (setki wielokątów stopni co klatkę ważyły kilkanaście ms).
 * 6.11, budowa schodów: kawałkami, bo stopień przybywa co ułamek sekundy — całe płótno odcinka (ponad 3000 px
 * wysokości) rysowane od nowa przy każdym stopniu kosztowało kilkadziesiąt ms.
 */
interface Rysunek { z: number; podpis: number; plotno: HTMLCanvasElement; ox: number; oy: number; szer: number; wys: number }
const rysunki = new WeakMap<Sim['world'], Map<string, Rysunek>>();
/** Rzędy w jednym kawałku płótna. */
const KAWALEK = 12;
/** Podpis rzędów odcinka (które kafle wykute) — z każdej klatki; kawałek łączy podpisy swoich rzędów (z zakładką). */
const podpisyRzedow: number[][] = [];

/**
 * Schody we wszystkich odcinkach szybu drogi wiernych (przed mrokiem). Wołane co klatkę — rysuje kawałek w kadrze.
 */
export function rysujSchodyDrogi(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world;
  // kiedy który kafel został wykuty — w całym szybie, nie tylko w kadrze (kafel wykuty poza ekranem nie sypie
  // okruchami, gdy kamera na niego najedzie); to, co już stało przy pierwszej klatce, jest stare; przy okazji podpis
  // odcinka (które kafle wykute) — zmiana rysuje go na nowo
  w.odcinkiDrogi.forEach((o, n) => {
    const rzedy = podpisyRzedow[n] ??= [];
    for (let y = o.y0; y <= o.y1; y++) {
      let h = 0x811c9dc5;
      for (let x = o.x0; x <= o.x1; x++) {
        const i = w.idx(x, y);
        if (!w.schody[i]) { if (pojawienie.size) pojawienie.delete(i); continue; }
        h = Math.imul(h ^ i, 16777619);
        if (!pojawienie.has(i)) pojawienie.set(i, pierwszaKlatka ? -1e9 : teraz);
      }
      rzedy[y - o.y0] = h >>> 0;
    }
  });
  pierwszaKlatka = false;
  w.odcinkiDrogi.forEach((o, n) => rysujOdcinek(ctx, sim, cam, teraz, o, n));
}

/** Kamera płótna odcinka: lewy górny róg w (ox, oy), przybliżenie z. */
function kameraPlotna(ox: number, oy: number, z: number, szer: number, wys: number): Camera {
  return {
    x: 0, y: 0, zoom: z, vw: szer, vh: wys, minZoom: z, maxZoom: z,
    toScreenX: (wx: number) => (wx - ox) * z, toScreenY: (wy: number) => (wy - oy) * z,
    toWorldX: (sx: number) => sx / z + ox, toWorldY: (sy: number) => sy / z + oy,
  } as unknown as Camera;
}

/**
 * Cały odcinek (to, co stoi) na płótnie — przycięty do wykutych kafli. 6.11: tylko to, co już zbudowano (od stopnia
 * `kTop` w dół — sim/budowa-schodow.ts): mur klatki sięga rząd ciosów nad najwyższy stopień, słup kończy się bębnem
 * na wysokości jego stopnicy; wyżej szyb jest jeszcze surową studnią w skale (rusztowanie i drabinę rysuje
 * render/budowa-schodow.ts).
 */
function narysujOdcinek(sim: Sim, o: Prost, z: number, podpis: number, kTop: number, yA: number, yB: number): Rysunek | null {
  if (typeof document === 'undefined') return null;
  const w = sim.world;
  const sp = spirala(sim, o);
  const ox = o.x0 - 0.5, oy = yA;
  const szer = Math.ceil((o.x1 - o.x0 + 2) * z), wys = Math.ceil((yB - yA) * z);
  if (szer <= 0 || wys <= 0 || wys > 16000) return null;
  const plotno = document.createElement('canvas');
  plotno.width = szer; plotno.height = wys;
  const ctx = plotno.getContext('2d')!;
  const cam = kameraPlotna(ox, oy, z, szer, wys);
  const okno = new Path2D();
  let ile = 0;
  for (let y = Math.max(sp.ys, Math.floor(yA)); y <= Math.min(o.y1, Math.ceil(yB)); y++) {
    let x = o.x0;
    while (x <= o.x1) {
      if (!w.schody[w.idx(x, y)]) { x++; continue; }
      let x2 = x;
      while (x2 + 1 <= o.x1 && w.schody[w.idx(x2 + 1, y)]) x2++;
      okno.rect(cam.toScreenX(x), cam.toScreenY(y), (x2 - x + 1) * z + 0.5, z + 0.5);
      ile += x2 - x + 1;
      x = x2 + 1;
    }
  }
  const rys: Rysunek = { z, podpis, plotno, ox, oy, szer, wys };
  const N = liczbaStopni(sp);
  if (!ile || kTop >= N) return rys;
  const szczegoly = z >= 9;
  const kol = (y: number) => kamien(sim, y);
  const h = WYS(), D = TAU / S.stopni;
  const yTop = sp.ys + kTop * h;
  ctx.save();
  ctx.clip(okno);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // ściana klatki schodowej (w komnacie i na przedprożu tło jest ich, nie szybu) — rząd ciosów nad najwyższy stopień
  const pomin = (y: number) => w.wKomnacie(o.x0, y) || w.wPrzedprozu(o.x0 + 1, y);
  const yMuru = kTop > 0 ? Math.max(sp.ys, yTop - 0.62) : sp.ys;
  ctx.save();
  // (od wierzchu muru do dołu płótna — wierzch bywa daleko nad kawałkiem, wtedy prostokąt sięga poza płótno)
  const tM = cam.toScreenY(yMuru);
  ctx.beginPath(); ctx.rect(0, tM, szer, wys - tM); ctx.clip();
  rysujSciane(ctx, cam, sp, Math.max(Math.floor(yMuru), Math.floor(yA) - 1), Math.min(o.y1, Math.ceil(yB)), kol, z, szczegoly, pomin);
  if (kTop > 0) rysujWienczenieMuru(ctx, cam, sp, yMuru, kol, z);
  ctx.restore();
  // stopnie (i pierścienie liny) w zasięgu kawałka — płyta sięga pod stopnicę na `grubosc` stopni, rzut z góry ±0,5
  const kA = Math.max(kTop, Math.floor((yA - 1.6 - sp.ys) / h)), kB = Math.min(N - 1, Math.ceil((yB + 1.2 - sp.ys) / h));
  if (szczegoly) rysujLine(ctx, cam, sp, kA, kB, z);
  const stopnie: Stopien[] = [];
  for (let k = kA; k <= kB; k++) {
    const y = sp.ys + k * h;
    const a = sp.th0 + k * D, b = a + D;
    stopnie.push({ k, y, a, b, glebia: Math.cos((a + b) / 2) });
  }
  stopnie.sort((p, q) => q.glebia - p.glebia);
  // słup: od bębna najwyższego stopnia do posadzki (barwa jak całego — nie skacze, gdy schody rosną)
  const slupem = () => {
    ctx.save();
    const tS = cam.toScreenY(yTop);
    ctx.beginPath(); ctx.rect(0, tS, szer, wys - tS); ctx.clip();
    rysujSlup(ctx, cam, sp, sp.ys, sp.ye, kol, z, szczegoly);
    ctx.restore();
    if (kTop > 0) rysujWierzchSlupa(ctx, cam, sp, yTop, kol, z);
  };
  let slup = false;
  for (const st of stopnie) {
    if (!slup && st.glebia < 0) { slupem(); slup = true; }
    rysujStopien(ctx, cam, sp, st, kol(st.y), z, szczegoly);
  }
  if (!slup) slupem();
  rysujCokol(ctx, cam, sp, kol, z, kTop === 0);
  ctx.restore();
  return rys;
}

/** Wierzch muru w budowie: ostatni rząd ciosów nierówny — część kamieni już leży, części jeszcze brak. */
function rysujWienczenieMuru(ctx: CanvasRenderingContext2D, cam: Camera, sp: Spirala, y: number, kol: (y: number) => RGB, z: number): void {
  const k = kol(y);
  for (let j = 0; j < 9; j++) {
    if (los(j * 31 + Math.round(y * 7)) < 0.45) continue;
    const f0 = -Math.PI / 2 + Math.PI * (j / 9), f1 = f0 + Math.PI / 9;
    const a = rzut(cam, sp, f0, sp.R, y - 0.3), b = rzut(cam, sp, f1, sp.R, y - 0.3), c = rzut(cam, sp, f1, sp.R, y), d = rzut(cam, sp, f0, sp.R, y);
    ctx.fillStyle = barwa(k, 0.5 + 0.12 * los(j * 7 + 3)); wielokat(ctx, [a, b, c, d]); ctx.fill();
    ctx.strokeStyle = 'rgba(24,16,12,0.4)'; ctx.lineWidth = Math.max(0.6, z * 0.025); ctx.stroke();
  }
}

/** Wierzch słupa w budowie: górny bęben widać z wierzchu (płaska elipsa) — na nim stanie bęben następnego stopnia. */
function rysujWierzchSlupa(ctx: CanvasRenderingContext2D, cam: Camera, sp: Spirala, y: number, kol: (y: number) => RGB, z: number): void {
  const k = kol(y);
  const cx = cam.toScreenX(sp.c), cy = cam.toScreenY(y);
  ctx.fillStyle = barwa(k, 1.12);
  ctx.beginPath(); ctx.ellipse(cx, cy, sp.rn * z, Math.max(1, sp.rn * S.ukos * z), 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,14,0.35)'; ctx.lineWidth = Math.max(0.6, z * 0.025); ctx.stroke();
}

/** Cokół słupa na posadzce i (gdy schody stoją całe) głowica u góry odcinka. */
function rysujCokol(ctx: CanvasRenderingContext2D, cam: Camera, sp: Spirala, kol: (y: number) => RGB, z: number, zGlowica = true): void {
  const baza = (yy: number, wys2: number, szer2: number) => {
    const k = kol(yy);
    const x0 = cam.toScreenX(sp.c - sp.rn - szer2), x1 = cam.toScreenX(sp.c + sp.rn + szer2);
    ctx.fillStyle = barwa(k, 0.96); ctx.fillRect(x0, cam.toScreenY(yy), x1 - x0, wys2 * z);
    ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.8, z * 0.04); ctx.strokeRect(x0, cam.toScreenY(yy), x1 - x0, wys2 * z);
  };
  baza(sp.ye - 0.35, 0.35, 0.16);
  if (zGlowica) baza(sp.ys, 0.22, 0.1);
}

/** Przybliżenie płótna odcinka — co ~19% (kamera, która płynnie zmienia przybliżenie, nie rysuje odcinka co klatkę). */
function zoomPlotna(z: number): number {
  return Math.pow(2, Math.round(Math.log2(z) * 4) / 4);
}

function rysujOdcinek(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, o: Prost, n: number): void {
  const w = sim.world, z = cam.zoom;
  const gora = Math.floor(cam.toWorldY(0)) - 2, dol = Math.ceil(cam.toWorldY(cam.vh)) + 2;
  const lewa = cam.toWorldX(0), prawa = cam.toWorldX(cam.vw);
  if (o.x1 + 1 < lewa || o.x0 > prawa) return;
  const sp = spirala(sim, o);
  const y0 = Math.max(sp.ys, gora), y1 = Math.min(o.y1, dol);
  if (y0 > y1) return;
  // to, co stoi — z płócien kawałków odcinka (każdy na nowo, gdy w jego pobliżu wykuto kafel albo osadzono stopień,
  // albo gdy zmieniło się przybliżenie)
  let mapa = rysunki.get(w);
  if (!mapa) { mapa = new Map(); rysunki.set(w, mapa); }
  const zp = zoomPlotna(z);
  const oy = sp.ys - 1.5, koniec = o.y1 + 2;
  const kTop = szczytSchodow(sim, n), N = liczbaStopni(sp), h = WYS();
  const rzedy = podpisyRzedow[n] ?? [];
  for (let j = Math.max(0, Math.floor((y0 - 1 - oy) / KAWALEK)); oy + j * KAWALEK < Math.min(koniec, y1 + 2); j++) {
    const yA = oy + j * KAWALEK, yB = Math.min(koniec, yA + KAWALEK);
    // podpis kawałka: wykute kafle jego rzędów (z zakładką) i ile z jego stopni już stoi
    let pod = 0x9e3779b9;
    for (let y = Math.floor(yA) - 2; y <= Math.ceil(yB) + 2; y++) pod = Math.imul(pod ^ (rzedy[y - o.y0] ?? 0), 16777619);
    const kA = Math.floor((yA - 1.6 - sp.ys) / h), kB = Math.ceil((yB + 1.2 - sp.ys) / h);
    pod = Math.imul(pod ^ Math.max(kA, Math.min(kB + 1, kTop, N)), 2654435761) >>> 0;
    const klucz = `${n}:${j}`;
    let rys = mapa.get(klucz);
    if (!rys || rys.z !== zp || rys.podpis !== pod) {
      const nowy = narysujOdcinek(sim, o, zp, pod, kTop, yA, yB);
      if (nowy) { mapa.set(klucz, nowy); rys = nowy; }
    }
    if (!rys) continue;
    const k = z / rys.z;
    const sy0 = Math.max(0, Math.floor((y0 - 1 - rys.oy) * rys.z)), sy1 = Math.min(rys.wys, Math.ceil((y1 + 2 - rys.oy) * rys.z));
    if (sy1 > sy0) ctx.drawImage(rys.plotno, 0, sy0, rys.szer, sy1 - sy0, cam.toScreenX(rys.ox), cam.toScreenY(rys.oy) + sy0 * k, rys.szer * k, (sy1 - sy0) * k);
  }
  // świeżo wykute kafle w kadrze: jaśniejszy, świeżo ciosany kamień, okruchy i pył
  const nowe: { x: number; y: number; t: number }[] = [];
  for (let y = y0; y <= y1; y++) for (let x = o.x0; x <= o.x1; x++) {
    const i = w.idx(x, y);
    if (!w.schody[i]) continue;
    const t = pojawienie.get(i) ?? -1e9;
    if (teraz - t < S.swiezyMs) nowe.push({ x, y, t });
  }
  if (!nowe.length) return;
  for (const q of nowe) {
    const f = (teraz - q.t) / S.swiezyMs;
    if (f < 0 || f >= 1) continue;
    ctx.fillStyle = `rgba(255,238,206,${0.2 * (1 - f) * (1 - f)})`;
    ctx.fillRect(cam.toScreenX(q.x), cam.toScreenY(q.y), z + 0.5, z + 0.5);
  }
  if (!wolnoRuszac()) return;
  const kol = (y: number) => kamien(sim, y);
  for (const q of nowe) {
    const t = (teraz - q.t) / 1000;
    if (t < 0 || t * 1000 >= S.okruchyMs) continue;
    const f = (t * 1000) / S.okruchyMs;
    const k = kol(q.y);
    const ziarno = q.x * 7919 + q.y * 104729;
    // pył: miękki obłok, rośnie i rzednie
    const px = cam.toScreenX(q.x + 0.5), py = cam.toScreenY(q.y + 0.55);
    const R = z * (0.45 + 1.1 * f);
    const g = ctx.createRadialGradient(px, py, 0, px, py, R);
    g.addColorStop(0, `rgba(196,176,146,${0.42 * (1 - f)})`); g.addColorStop(1, 'rgba(196,176,146,0)');
    ctx.fillStyle = g; ctx.fillRect(px - R, py - R, R * 2, R * 2);
    // okruchy: kilka kanciastych kawałków skały leci w dół, obraca się i gaśnie
    for (let m = 0; m < 6; m++) {
      const r1 = los(ziarno + m * 13), r2 = los(ziarno + m * 29), r3 = los(ziarno + m * 41);
      const x = q.x + 0.15 + 0.7 * r1 + (r3 - 0.5) * 1.4 * t;
      const y = q.y + 0.2 + 0.5 * r2 + 0.5 * 7 * t * t;
      const s2 = z * (0.07 + 0.09 * r3);
      const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
      const kat = r1 * 6 + t * (3 + r2 * 5);
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(kat);
      ctx.globalAlpha = 1 - f;
      ctx.fillStyle = barwa(k, 0.62 + r2 * 0.3);
      ctx.beginPath(); ctx.moveTo(-s2, -s2 * 0.6); ctx.lineTo(s2 * 0.8, -s2); ctx.lineTo(s2, s2 * 0.5); ctx.lineTo(-s2 * 0.5, s2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * 6.11, budowa schodów: ciosany stopień k odcinka `o` w drodze na swoje miejsce — ten sam kamień co osadzony (z bębnem
 * słupa pod wewnętrznym końcem), przesunięty o `dx`, `dy` (kafle). Render/budowa-schodow.ts: zjeżdża na linie kołowrotu
 * i siada na poprzednim stopniu.
 */
export function rysujKamienStopnia(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, o: Prost, k: number, dx: number, dy: number): void {
  const sp0 = spirala(sim, o);
  const sp: Spirala = { ...sp0, c: sp0.c + dx };
  const h = WYS(), D = TAU / S.stopni, z = cam.zoom;
  const y = sp0.ys + k * h + dy;
  const a = sp.th0 + k * D, b = a + D;
  const kol = kamien(sim, sp0.ys + k * h);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // bęben słupa (część stopnia — jak w prawdziwych schodach kręconych, każdy stopień niesie kawałek słupa)
  const xl = cam.toScreenX(sp.c - sp.rn), xr = cam.toScreenX(sp.c + sp.rn);
  const g = ctx.createLinearGradient(xl, 0, xr, 0);
  g.addColorStop(0, barwa(kol, 0.86)); g.addColorStop(0.28, barwa(kol, 1.04)); g.addColorStop(0.62, barwa(kol, 0.8)); g.addColorStop(1, barwa(kol, 0.5));
  ctx.fillStyle = g; ctx.fillRect(xl, cam.toScreenY(y), xr - xl, h * z);
  rysujStopien(ctx, cam, sp, { k, y, a, b, glebia: Math.cos((a + b) / 2) }, kol, z, z >= 9);
  rysujWierzchSlupa(ctx, cam, sp, y, () => kol, z);
  ctx.restore();
}

/** Punkt zaczepienia liny na kamieniu stopnia k (środek ciężaru płyty — w połowie między słupem a ścianą). */
export function zaczepStopnia(sim: Sim, o: Prost, k: number): { x: number; y: number } {
  const sp = spirala(sim, o);
  const D = TAU / S.stopni;
  const th = sp.th0 + (k + 0.5) * D, r = (sp.rn + sp.R) / 2;
  return { x: sp.c + r * Math.sin(th), y: sp.ys + k * WYS() - S.ukos * r * Math.cos(th) };
}

/** Postać na spirali: gdzie ją rysować i jak idzie (render/lud/rozstep.ts, figury.ts, lud/ruch.ts). */
export interface NaSchodach {
  /**
   * 6.11, budowa schodów: 'schody' — na osadzonych stopniach; 'drabina' — wyżej, w surowym szybie: wisi na drabinie
   * opartej o tylną ścianę (przy pomoście nad najwyższym stopniem przechodzi z drabiny na stopnie)
   */
  tryb: 'schody' | 'drabina';
  /** przesunięcie od miejsca w symulacji: w poziomie, w pionie (stopnie i rzut z góry) — kafle */
  dx: number; dy: number;
  /** 0..1 — o ile jest „w tle”: z tyłu spirali, w cieniu słupa i ścian (zasłania ją zaslonNaSchodach) */
  tlo: number;
  /** numer stopnia pod stopami (ciągły — ułamek to droga do następnego) */
  stopien: number;
  /** kąt na spirali (0 — tył szybu, π/2 — prawa ściana, π — przód) */
  kat: number;
  /** odcinek drogi i jego spirala, numer odcinka i najwyższy osadzony stopień (sim/budowa-schodow.ts) */
  odcinek: Prost; sp: Spirala; n: number; kTop: number;
}

/**
 * Pół okna przejścia na sąsiedni stopień (w stopniach): ciało przenosi się przy nosie stopnia, od `PRZEJSCIE` przed
 * nim do `PRZEJSCIE` za nim.
 */
const PRZEJSCIE = 0.2;

/**
 * Wysokość stóp na rysunku (w stopniach): postać stoi na stopnicy, nad którą jest — stopień n leży między kątami
 * n i n+1 — a na niższy (idąc w dół) albo wyższy (w górę) przenosi się przy nosie stopnia, gdy stopa staje na
 * następnym (render/figury.ts: uderzenie pięty w takt nosów). Dawniej ciało opadało w połowie stopnicy: stopy
 * zapadały się w płytę, na której stała postać, i wyglądała, jakby lewitowała obok stopni (uwaga użytkownika).
 */
function stopyNaStopniu(s: number): number {
  const q = s + PRZEJSCIE, n = Math.floor(q), f = q - n;
  if (f >= 2 * PRZEJSCIE) return n;
  const t = f / (2 * PRZEJSCIE);
  return n - 1 + t * t * (3 - 2 * t);
}

/**
 * Postać na schodach kręconych: gdzie ją rysować na spirali — przesunięcie w poziomie od miejsca w symulacji, w pionie
 * (stopa zawsze na stopniu, ciało przenosi się stopień po stopniu; rzut z góry — dalej w głąb, wyżej), jak bardzo jest
 * „w tle” (z tyłu, za słupem), który to stopień i kąt na spirali. Null — postać nie jest na schodach: stoi na posadzce
 * (dno odcinka, kopacze przy czole szybu) albo kuje.
 */
export function naSchodach(sim: Sim, c: Creature): NaSchodach | null {
  const w = sim.world;
  const tx = Math.floor(c.x), ty = Math.floor(c.y);
  if (!w.inb(tx, ty) || w.schody[w.idx(tx, ty)] !== 1 || w.solid(tx, ty + 1)) return null;
  if (c.kujeT !== undefined && sim.tick - c.kujeT >= 0 && sim.tick - c.kujeT < 24) return null;
  const n = w.odcinkiDrogi.findIndex((q) => tx >= q.x0 && tx <= q.x1 && ty >= q.y0 && ty <= q.y1);
  if (n < 0) return null;
  const o = w.odcinkiDrogi[n];
  const sp = spirala(sim, o);
  const h = WYS();
  const stopy = c.y + 1;
  const st = (stopy - sp.ys) / h;
  const kTop = szczytSchodow(sim, n), N = liczbaStopni(sp);
  // 6.11, budowa schodów: nad osadzonymi stopniami (i w szybie bez schodów) — na drabinie; od pomostu nad najwyższym
  // stopniem do jego stopnicy przechodzi z drabiny na schody (płynnie — nie skacze przez szyb)
  const dr = pozycjaDrabiny(sp);
  const drabina = { dx: dr.x - c.x, dy: -S.ukos * dr.glebia, tlo: 0.16 };
  let f = 1;
  if (kTop >= N) f = 0;
  else if (kTop > 0) {
    const yLad = dolDrabiny(sim, n), yTop = wysokoscSzczytu(sim, n);
    f = Math.max(0, Math.min(1, (stopy - yLad) / Math.max(0.4, yTop - yLad)));
  }
  if (f <= 0) return { tryb: 'drabina', ...drabina, stopien: st, kat: BUDOWA_SCHODOW.drabinaKat, odcinek: o, sp, n, kTop };
  const s2 = Math.max(st, kTop);
  const yStopien = sp.ys + stopyNaStopniu(s2) * h;
  const th = katSpirali(sp, sp.ys + s2 * h);
  const x = sp.c + S.linia * Math.sin(th), glebia = S.linia * Math.cos(th);
  const schody = {
    dx: x - c.x, dy: (yStopien - stopy) - S.ukos * glebia,
    // z tyłu spirali — w cieniu słupa i ścian, odrobinę ciemniej (sam słup zasłania ją naprawdę: zaslonNaSchodach)
    tlo: glebia > 0 ? 0.1 + 0.2 * glebia / S.linia : 0,
  };
  if (f >= 1) return { tryb: 'schody', ...schody, stopien: s2, kat: th, odcinek: o, sp, n, kTop };
  const g = f * f * (3 - 2 * f);
  return {
    tryb: g < 0.5 ? 'drabina' : 'schody',
    dx: drabina.dx + (schody.dx - drabina.dx) * g, dy: drabina.dy + (schody.dy - drabina.dy) * g, tlo: drabina.tlo + (schody.tlo - drabina.tlo) * g,
    stopien: s2, kat: g < 0.5 ? BUDOWA_SCHODOW.drabinaKat : th, odcinek: o, sp, n, kTop,
  };
}

/**
 * Stopnice pod stopami postaci na schodach — na nich leży jej cień (render/figury.ts): stopień pod nią i następny
 * niższy (stopa przy nosie stopnia rzuca cień także na niego, słabiej). Wielokąt stopnicy na ekranie, środek cienia
 * (pod stopami, na wysokości tej stopnicy) i siła. `fx` — gdzie postać stoi na rysunku (kafle).
 */
export function stopniePodStopami(sim: Sim, cam: Camera, c: Creature, fx: number): { tr: [number, number][]; cx: number; cy: number; sila: number }[] {
  const ns = naSchodach(sim, c);
  if (!ns || ns.tryb !== 'schody') return [];
  const { sp } = ns;
  const h = WYS(), D = TAU / S.stopni;
  const glebia = S.linia * Math.cos(ns.kat);
  const k0 = Math.floor(ns.stopien);
  const out: { tr: [number, number][]; cx: number; cy: number; sila: number }[] = [];
  for (const [k, sila] of [[k0, 1], [k0 + 1, 0.5]]) {
    const y = sp.ys + k * h;
    if (k < ns.kTop || y >= sp.ye - 0.02) continue;
    const a = sp.th0 + k * D, b = a + D;
    const tr: Pkt[] = [];
    for (let i = 0; i <= 4; i++) tr.push(rzut(cam, sp, a + (b - a) * (i / 4), sp.R, y));
    tr.push(rzut(cam, sp, b, sp.rn - 0.03, y), rzut(cam, sp, a, sp.rn - 0.03, y));
    out.push({ tr, cx: cam.toScreenX(fx), cy: cam.toScreenY(y - S.ukos * glebia), sila });
  }
  return out;
}

let buforZaslony: HTMLCanvasElement | null = null;

/**
 * Po narysowaniu postaci na schodach: to, co na spirali leży bliżej widza niż ona, rysuje się na niej — słup, gdy jest
 * za nim, i stopnie bliżej widza (po drugiej stronie słupa). Stopień pod stopami i oba sąsiednie — nie (na nich stoi). Rysunek jak płótno odcinka (to samo przybliżenie i ta sama siatka pikseli),
 * przycięty do obrysu postaci i do wykutych kafli, przyciemniony warstwą mroku tej klatki jak reszta schodów.
 * Dawniej postać sunęła po wierzchu całych schodów, a za słupem była tylko przygaszona (uwaga użytkownika: ma znikać
 * za filarem). `fx, fy` — stopy na rysunku (kafle), `hPx` — wysokość sylwetki w pikselach.
 */
export function zaslonNaSchodach(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, c: Creature, fx: number, fy: number, hPx: number, teraz: number): void {
  if (typeof document === 'undefined') return;
  const ns = naSchodach(sim, c);
  if (!ns || ns.tryb !== 'schody') return;
  const w = sim.world, { sp, odcinek: o, kTop } = ns;
  const z = cam.zoom, zp = zoomPlotna(z);
  const hw = hPx / z;
  // obrys postaci (z bronią i kijem) — w siatce pikseli płótna odcinka
  const ox = o.x0 - 0.5, oy = sp.ys - 1.5;
  const X0 = ox + Math.floor((fx - 0.95 * hw - ox) * zp) / zp, Y0 = oy + Math.floor((fy - 1.5 * hw - oy) * zp) / zp;
  const X1 = fx + 0.95 * hw, Y1 = fy + 0.2 * hw;
  const bw = Math.ceil((X1 - X0) * zp), bh = Math.ceil((Y1 - Y0) * zp);
  if (bw <= 0 || bh <= 0 || bw > 4096 || bh > 4096) return;
  // co zasłania: stopnie bliżej widza niż postać (bez tych pod stopami) i słup, gdy postać jest za nim
  const glebia = Math.cos(ns.kat);
  const h = WYS(), D = TAU / S.stopni;
  // (pod stopami i tuż obok — przy ścianach szybu płyta sąsiedniego stopnia leży odrobinę bliżej widza i zakrywała
  // stopy aż po kolana: postać brnęła w kamieniu, zamiast stać na stopnicy)
  const k0 = Math.floor(ns.stopien);
  const wlasne = new Set([k0 - 1, k0, k0 + 1]);
  const kOd = Math.max(kTop, Math.floor((Y0 - 1.2 - sp.ys) / h)), kDo = Math.ceil((Y1 + 0.7 - sp.ys) / h);
  const stopnie: Stopien[] = [];
  for (let k = kOd; k <= kDo; k++) {
    const y = sp.ys + k * h;
    if (y >= sp.ye - 0.02) break;
    if (wlasne.has(k)) continue;
    const a = sp.th0 + k * D, b = a + D, g = Math.cos((a + b) / 2);
    if (g < glebia - 0.02) stopnie.push({ k, y, a, b, glebia: g });
  }
  const slup = glebia > 0;
  if (!stopnie.length && !slup) return;
  stopnie.sort((p, q) => q.glebia - p.glebia);
  // bufor: rysunek w przybliżeniu płótna odcinka, potem — jak płótno — skalowany do ekranu
  const buf = buforZaslony ??= document.createElement('canvas');
  if (buf.width < bw || buf.height < bh) { buf.width = Math.max(buf.width, bw); buf.height = Math.max(buf.height, bh); }
  const g = buf.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.clearRect(0, 0, bw, bh);
  const camB = kameraPlotna(X0, Y0, zp, bw, bh);
  g.save();
  const okno = new Path2D();
  for (let y = Math.floor(Y0); y <= Math.floor(Y1); y++) for (let x = o.x0; x <= o.x1; x++) {
    if (w.inb(x, y) && w.schody[w.idx(x, y)]) okno.rect(camB.toScreenX(x), camB.toScreenY(y), zp + 0.5, zp + 0.5);
  }
  g.clip(okno);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const szczegoly = zp >= 9;
  const kol = (y: number) => kamien(sim, y);
  // słup (jak na płótnie odcinka: od bębna najwyższego osadzonego stopnia w dół)
  const yTop = sp.ys + kTop * h;
  const slupem = () => {
    const tS = camB.toScreenY(yTop);
    g.save(); g.beginPath(); g.rect(0, tS, bw, bh - tS); g.clip();
    rysujSlup(g, camB, sp, sp.ys, sp.ye, kol, zp, szczegoly);
    g.restore();
    if (kTop > 0) rysujWierzchSlupa(g, camB, sp, yTop, kol, zp);
    rysujCokol(g, camB, sp, kol, zp, kTop === 0);
  };
  let slupJest = !slup;
  for (const st of stopnie) {
    if (!slupJest && st.glebia < 0) { slupem(); slupJest = true; }
    rysujStopien(g, camB, sp, st, kol(st.y), zp, szczegoly);
  }
  if (!slupJest) slupem();
  g.restore();
  // mrok tej klatki — tylko na tym, co narysowano
  const sx = cam.toScreenX(X0), sy = cam.toScreenY(Y0), sw = bw * (z / zp), sh = bh * (z / zp);
  const m = warstwaMroku(teraz);
  if (m) {
    g.globalCompositeOperation = 'source-atop';
    g.drawImage(m.plotno, sx * m.k, sy * m.k, sw * m.k, sh * m.k, 0, 0, bw, bh);
    g.globalCompositeOperation = 'source-over';
  }
  // tylko obrys postaci (bufor bywa większy niż ten obrys)
  ctx.save();
  ctx.beginPath(); ctx.rect(cam.toScreenX(fx - 0.95 * hw), cam.toScreenY(fy - 1.5 * hw), 1.9 * hw * z, 1.7 * hw * z); ctx.clip();
  ctx.drawImage(buf, 0, 0, bw, bh, sx, sy, sw, sh);
  ctx.restore();
}
