import type { Sim } from '../sim/sim';
import type { World } from '../sim/world';
import type { Camera } from './camera';
import { T, PASSABLE } from '../sim/tiles';
import { MEM_SPAN } from '../sim/world';
import { wolnoRuszac } from './nastroj';
import { SW } from './lud/tusz';

/**
 * ŻYŁY — kruszec w skale, rysowany tuszem jak postacie i jak okaz w atlasie górniczym.
 *
 * Żelazo (T.ORE) to gniazdo kanciastych bryłek w ciemnej, rdzawej masie rudy (obwiedzionej kreską
 * jak wtrącenie): stalowa szarość ze ściankami w świetle i w cieniu (cień kreskowany rylcem), rdzawy
 * brzeg, kontur tuszem grubszy od cienia, błysk metalu na grani; skała wokół gniazda przyrdzewiała,
 * z bryłek ciekną zacieki rdzy, za skrajem leżą okruchy.
 * Złoto (T.ZLOTO) to żyła w jasnej soczewce kwarcu: pień biegnie przez kafle kruszcu (drzewo bez pętli —
 * nie drabinka ani siatka), puchnie i zwęża się, od niego odchodzą gałązki zwężone do ostrza, końce
 * uciekają ogonem w skałę, na pniu siedzą samorodki. Żyła jest płaska (wąski sierp cienia, blask
 * w urywkach), samorodki mają twardy światłocień jak postacie; większe co jakiś czas powoli błyskają
 * (bez błysków przy „ograniczonym ruchu”). Z daleka kształty są prostsze i grubsze.
 *
 * Bryłki leżą na siatce świata, nie po jednej na kafel — sąsiednie kafle to jedno gniazdo bez szwów.
 * Kształt zależy tylko od położenia (i od kształtu skupiska), nie od losu klatki.
 *
 * Każde skupisko (spójne kafle jednego kruszcu) rysuje się raz do własnej odbitki w skali ekranu
 * i dalej tylko się ją przykłada; skupisko zmienione kilofem (albo z nową pustką obok) ma inny klucz,
 * więc stara odbitka nie wraca. Kruszec nie wchodzi w pustkę: brzeg jaskini zostaje na wierzchu.
 * Widać tylko kruszec, który rycina pokazuje: świeżo widziany — prawdziwy kafel, dawno widziany —
 * pamięć (przygaszona), nigdy niewidziany — nic. Rysowane pod mrokiem: w ciemności gaśnie ze skałą.
 */

const ZYLY = {
  /** Poniżej tego przybliżenia (pikseli na kafel) żyły zostają samą barwą kreski ryciny. */
  odZoomu: 4.5,
  /** Ponad tyle pikseli urządzenia na kafel odbitka już nie rośnie (dalej się skaluje). */
  maxSkala: 72,
  /** Tyle ms na klatkę wolno rysować odbitki (nowe i w nowej skali); reszta czeka do następnej klatki. */
  msNaKlatke: 4,
  /** W nowej skali przerysowuje się dopiero, gdy przybliżenie stoi tyle ms (w trakcie zoomu odbitka się skaluje)… */
  spokojMs: 180,
  /** …albo gdy skala rozjechała się o więcej niż tyle (odbitka byłaby rozmyta). */
  maxRozjazd: 0.35,
  /** Zapas odbitki wokół skupiska (kafle) — bryłki, rdza i gałązki wychodzą trochę poza kafle. */
  zapas: 0.75,
  /** Tyle kafla kruszec trzyma się z dala od pustki: kreska brzegu jaskini zostaje na wierzchu. */
  odPustki: 0.07,
  /** Krycie pamięci: świeżo pamiętane i najdawniejsze (kruszec świeżo widziany ma pełne). */
  kryciePamieci: 0.66, krycieDawne: 0.32,
  /** Większy samorodek (od tej wielkości, w kaflach) błyska co tyle sekund (od–do); błysk trwa taką część okresu. */
  blyskOdWielkosci: 0.12, blyskOd: 5, blyskDo: 11, blyskCzesc: 0.1,
};

type Rgb = readonly [number, number, number];
/** Barwy kruszców. */
const B = {
  /** Stal bryłek: ścianka w cieniu, w półcieniu, w świetle; błysk metalu. */
  // matowa, przyrdzewiała stal — dawna srebrna szarość z bielą na graniach czytała się jak srebro albo lód
  stalCien: [32, 28, 27] as Rgb, stalPol: [72, 63, 58] as Rgb, stalSwiatlo: [116, 101, 88] as Rgb, blyskStali: [172, 152, 130] as Rgb,
  /** Rdza: brzeg bryłek, zacieki i plama w skale wokół gniazda. */
  rdza: [150, 74, 32] as Rgb, rdzaPlama: [118, 62, 28] as Rgb,
  /** Masa rudy, w której siedzą bryłki: ciemna, rdzawa. */
  rudaMasa: [58, 36, 26] as Rgb,
  /** Atrament konturu. */
  tusz: [14, 10, 8] as Rgb,
  /** Złoto: sierp cienia, ciało, jasny bok, blask. */
  zlotoCien: [132, 86, 24] as Rgb, zloto: [212, 164, 60] as Rgb, zlotoJasne: [240, 204, 116] as Rgb, zlotoSwiatlo: [250, 236, 196] as Rgb,
  /** Kwarc, w którym siedzi żyła. */
  kwarc: [238, 228, 200] as Rgb,
};
const rgb = (c: Rgb, a = 1): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mieszaj = (a: Rgb, b: Rgb, t: number): string =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;

/** Stały skrót trzech liczb całkowitych → 0..1: to samo miejsce zawsze dostaje te same bryłki. */
function los(a: number, b: number, c: number): number {
  let h = Math.imul(a ^ 0x27d4eb2d, 0x85ebca6b) ^ Math.imul(b + 0x165667b1, 0xc2b2ae35) ^ Math.imul(c + 0x3c6ef372, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- co widać

/** Świeżość pamięci ostatnio sprawdzonego kafla (0..1) — obok wyniku `kruszecW`. */
let swiezosc = 0;

/** Świeżość kafla jak w rycinie: 1 przy powierzchni, dalej od ostatniego spojrzenia; ślad ręki nie blednie do zera. */
function swiezoscW(w: World, i: number, x: number, y: number, tick: number): number {
  if (y <= w.surface[x] + 1) return 1;
  if (!w.ever[i]) return 0;
  let f = 1 - (tick - w.lastSeen[i]) / MEM_SPAN;
  if (f < 0) f = 0;
  if (w.slad[i] && f < 0.42) f = 0.42;
  return f;
}

/**
 * Jaki kruszec rycina rysuje w kaflu: 1 żelazo, 2 złoto, 0 nic. Te same progi co w rycinie:
 * świeżo widziany — prawdziwy kafel, dawniej widziany — pamięć, nigdy niewidziany — nic.
 */
function kruszecW(w: World, i: number, x: number, y: number, tick: number): number {
  const f = swiezoscW(w, i, x, y, tick);
  if (f <= 0.01) return 0;
  const t = f > 0.82 ? w.tile[i] : w.mem[i];
  swiezosc = f;
  return t === T.ORE ? 1 : t === T.ZLOTO ? 2 : 0;
}

/** Czy rycina rysuje w kaflu pustkę (jaskinię, korytarz) — tam kruszec nie wchodzi. Nieznane to skała. */
function pustkaW(w: World, i: number, x: number, y: number, tick: number): boolean {
  const f = swiezoscW(w, i, x, y, tick);
  if (f <= 0.01) return false;
  return PASSABLE[f > 0.82 ? w.tile[i] : w.mem[i]] === 1;
}

// ---------------------------------------------------------------- odbitki skupisk

interface Odbitka {
  c: HTMLCanvasElement;
  /** Pikseli odbitki na kafel. */
  skala: number;
  /** Lewy górny róg odbitki w kaflach świata. */
  x0: number; y0: number;
  /** Złoto: samorodki, które błyskają — po cztery liczby: x, y (kafle), faza 0..1, okres (s). */
  blyski: number[];
  /** Klatka ostatniego użycia (do sprzątania). */
  uzyta: number;
}

let swiat: World | null = null;
const odbitki = new Map<number, Odbitka>();
/** Kafel trafił już do skupiska w tej klatce, jeśli jego znak równa się pokoleniu. */
let znak = new Int32Array(0);
/** Pustka sprawdzona już dla bieżącego skupiska, jeśli jej znak równa się numerowi skupiska. */
let znakP = new Int32Array(0);
let pokolenie = 0, nrSkupiska = 0;
let klatka = 0;
/** Ostatnia skala odbitek i chwila, gdy się zmieniła — w trakcie zoomu nie przerysowujemy. */
let ostatniaSkala = 0, zmianaSkali = 0;
const stos: number[] = [];
const kafle: number[] = [];
const pustki: number[] = [];
const blyskiKlatki: number[] = [];
const OSIEM: readonly (readonly [number, number])[] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/**
 * Kruszec w skale, w świecie (pod mrokiem). Wołane co klatkę po rycinie: odbitki skupisk w widoku
 * i błyski złota. Tanie — kilka przyłożeń odbitek; przerysowuje tylko nowe albo zmienione skupiska.
 */
export function rysujZyly(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world, z = cam.zoom;
  if (z < ZYLY.odZoomu) return;
  if (w !== swiat || znak.length !== w.w * w.h) {
    swiat = w; odbitki.clear();
    znak = new Int32Array(w.w * w.h);
    znakP = new Int32Array(w.w * w.h);
  }
  klatka++;
  pokolenie++;
  const W = w.w, tick = sim.tick;
  // piksele urządzenia na piksel płyty: odbitka leży na ekranie jeden do jednego, ostra jak tusz postaci
  const m = ctx.getTransform();
  const ds = Math.hypot(m.a, m.b) || 1;
  const skala = Math.min(ZYLY.maxSkala, z * ds);
  const chwila = performance.now();
  if (Math.abs(skala - ostatniaSkala) > 1e-6) { ostatniaSkala = skala; zmianaSkali = chwila; }
  const spokoj = chwila - zmianaSkali > ZYLY.spokojMs;
  const tx0 = Math.max(0, Math.floor(cam.toWorldX(0)) - 1), tx1 = Math.min(W - 1, Math.ceil(cam.toWorldX(cam.vw)) + 1);
  const ty0 = Math.max(0, Math.floor(cam.toWorldY(0)) - 1), ty1 = Math.min(w.h - 1, Math.ceil(cam.toWorldY(cam.vh)) + 1);
  const koniec = chwila + ZYLY.msNaKlatke;
  let zbudowane = 0;
  blyskiKlatki.length = 0;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  for (let y = ty0; y <= ty1; y++) {
    for (let x = tx0; x <= tx1; x++) {
      const i = y * W + x;
      if (znak[i] === pokolenie) continue;
      const r = kruszecW(w, i, x, y, tick);
      if (!r) continue;
      // całe skupisko, także poza ekranem — przecięte brzegiem miałoby inny klucz przy każdym przesunięciu
      znak[i] = pokolenie;
      stos.length = 0; kafle.length = 0; pustki.length = 0;
      stos.push(i);
      let jasn = swiezosc;
      while (stos.length && kafle.length < 400) {
        const j = stos.pop()!;
        kafle.push(j);
        const jx = j % W, jy = (j / W) | 0;
        for (const [dx, dy] of OSIEM) {
          const xx = jx + dx, yy = jy + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= w.h) continue;
          const q = yy * W + xx;
          if (znak[q] === pokolenie) continue;
          if (kruszecW(w, q, xx, yy, tick) !== r) continue;
          znak[q] = pokolenie;
          if (swiezosc > jasn) jasn = swiezosc;
          stos.push(q);
        }
      }
      kafle.sort((a, b) => a - b);
      // pustka tuż obok skupiska: tam kruszec się urywa (wykuty sąsiad zmienia klucz)
      nrSkupiska++;
      for (const j of kafle) {
        const jx = j % W, jy = (j / W) | 0;
        for (const [dx, dy] of OSIEM) {
          const xx = jx + dx, yy = jy + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= w.h) continue;
          const q = yy * W + xx;
          if (znakP[q] === nrSkupiska || znak[q] === pokolenie) continue;
          znakP[q] = nrSkupiska;
          if (pustkaW(w, q, xx, yy, tick)) pustki.push(q);
        }
      }
      const klucz = skrot(r);
      let o = odbitki.get(klucz);
      if (!o) {
        // nowe skupisko: rysuje się od razu, chyba że klatka już wyczerpała czas — wtedy w następnej
        if (zbudowane > 0 && performance.now() > koniec) continue;
        o = zbuduj(r, kafle, pustki, W, skala); zbudowane++;
      } else {
        const rozjazd = Math.abs(o.skala - skala) / skala;
        if (rozjazd > 0.015 && (spokoj || rozjazd > ZYLY.maxRozjazd) && performance.now() < koniec) { o = zbuduj(r, kafle, pustki, W, skala, o); zbudowane++; }
      }
      odbitki.set(klucz, o);
      o.uzyta = klatka;
      const sx = cam.toScreenX(o.x0), sy = cam.toScreenY(o.y0);
      const dw = (o.c.width / o.skala) * z, dh = (o.c.height / o.skala) * z;
      if (sx > cam.vw || sy > cam.vh || sx + dw < 0 || sy + dh < 0) continue;
      // pamięć blednie: świeżo widziany kruszec pełny, pamiętany przygaszony, im dawniej, tym słabiej
      const krycie = jasn > 0.82 ? 1 : ZYLY.krycieDawne + (ZYLY.kryciePamieci - ZYLY.krycieDawne) * (jasn / 0.82);
      ctx.globalAlpha = krycie;
      ctx.drawImage(o.c, sx, sy, dw, dh);
      if (o.blyski.length && krycie > 0.9) for (const b of o.blyski) blyskiKlatki.push(b);
    }
  }
  ctx.globalAlpha = 1;
  if (blyskiKlatki.length && wolnoRuszac()) rysujBlyski(ctx, cam, teraz);
  ctx.restore();
  // sprzątanie: odbitki skupisk dawno niewidzianych (albo rozkopanych) idą precz
  if (klatka % 120 === 0 || odbitki.size > 600) {
    for (const [k, o] of odbitki) if (klatka - o.uzyta > 400) odbitki.delete(k);
  }
}

/** Skrót skupiska z `kafle` i `pustki` (i rodzaju kruszcu) — liczba zamiast długiego napisu w każdej klatce. */
function skrot(r: number): number {
  let h1 = 0x811c9dc5 ^ r, h2 = 0x9e3779b9 + r;
  for (const j of kafle) { h1 = Math.imul(h1 ^ j, 0x01000193); h2 = Math.imul(h2 ^ (j + 0x7f4a7c15), 0x85ebca6b); h2 ^= h2 >>> 13; }
  h1 = Math.imul(h1 ^ 0x5bd1e995, 0x01000193);
  for (const j of pustki) { h1 = Math.imul(h1 ^ j, 0x01000193); h2 = Math.imul(h2 ^ (j + 0x3c6ef372), 0xc2b2ae35); h2 ^= h2 >>> 15; }
  return (h1 >>> 0) * 1048576 + ((h2 >>> 0) & 0xfffff);
}

/** Błysk samorodka: cienki czteroramienny krzyżyk światła z poświatą, raz na kilka sekund. */
function rysujBlyski(ctx: CanvasRenderingContext2D, cam: Camera, teraz: number): void {
  const z = cam.zoom, s = teraz / 1000;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let k = 0; k < blyskiKlatki.length; k += 4) {
    const t = (s / blyskiKlatki[k + 3] + blyskiKlatki[k + 2]) % 1;
    if (t > ZYLY.blyskCzesc) continue;
    const b = Math.sin((t / ZYLY.blyskCzesc) * Math.PI);
    const x = cam.toScreenX(blyskiKlatki[k]), y = cam.toScreenY(blyskiKlatki[k + 1]);
    if (x < -z || y < -z || x > cam.vw + z || y > cam.vh + z) continue;
    const L = (0.12 + 0.26 * b) * z;
    const g = ctx.createRadialGradient(x, y, 0, x, y, L * 0.5);
    g.addColorStop(0, `rgba(255,236,170,${0.5 * b})`);
    g.addColorStop(1, 'rgba(255,214,120,0)');
    // sama miękka poświata i jasny punkt — krzyżyki promieni czytały się jak plusiki interfejsu
    ctx.fillStyle = g;
    ctx.fillRect(x - L, y - L, L * 2, L * 2);
    ctx.fillStyle = `rgba(255,246,214,${0.8 * b})`;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, z * 0.025), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- budowa odbitki

/** Pomocnicza warstwa do sierpów światłocienia sumy kształtów (bez szwów tam, gdzie gałązki się nakładają). */
let warstwa: HTMLCanvasElement | null = null;
/** Wzór kreskowania cienia (rylec po skosie), w pikselach urządzenia. */
let wzorKreski: HTMLCanvasElement | null = null;
/** Wzór kreski kwarcu: rzadka, stroma, w przeciwną stronę niż skała — inny materiał, inny rylec. */
let wzorKwarcu: HTMLCanvasElement | null = null;

/** Rysuje skupisko do odbitki (nowej albo starej, przerysowanej w nowej skali). */
function zbuduj(rodzaj: number, kafle: number[], pustki: number[], W: number, skala: number, stara?: Odbitka): Odbitka {
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (const i of kafle) {
    const x = i % W, y = (i / W) | 0;
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  const Z = ZYLY.zapas;
  const x0 = minx - Z, y0 = miny - Z, szer = maxx - minx + 1 + 2 * Z, wys = maxy - miny + 1 + 2 * Z;
  const c = stara ? stara.c : document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(szer * skala));
  c.height = Math.max(1, Math.ceil(wys * skala));
  const g = c.getContext('2d')!;
  g.setTransform(skala, 0, 0, skala, -x0 * skala, -y0 * skala);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const zbior = new Set(kafle);
  const pusto = new Set(pustki);
  const blyski: number[] = [];
  if (rodzaj === 1) rysujZelazo(g, kafle, zbior, pusto, W, skala, kreskowanie(g, skala));
  else rysujZloto(g, kafle, zbior, pusto, W, skala, blyski);
  // kruszec nie wchodzi w pustkę: brzeg jaskini (kreska tuszu i jasna warga) zostaje na wierzchu
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  const o = ZYLY.odPustki;
  for (const q of pustki) {
    const x = q % W, y = (q / W) | 0;
    g.fillRect(x - o, y - o, 1 + 2 * o, 1 + 2 * o);
  }
  g.globalCompositeOperation = 'source-over';
  return { c, skala, x0, y0, blyski, uzyta: klatka };
}

/** Kreskowanie cienia: cienkie ukośne kreski co trzy piksele urządzenia, niezależnie od przybliżenia. */
function kreskowanie(g: CanvasRenderingContext2D, skala: number): CanvasPattern | null {
  if (!wzorKreski) {
    wzorKreski = document.createElement('canvas');
    wzorKreski.width = 6; wzorKreski.height = 6;
    const k = wzorKreski.getContext('2d')!;
    k.strokeStyle = rgb(B.tusz, 0.62);
    k.lineWidth = 0.9;
    k.beginPath();
    for (let d = -6; d <= 12; d += 3) { k.moveTo(d, 6); k.lineTo(d + 6, 0); }
    k.stroke();
  }
  const p = g.createPattern(wzorKreski, 'repeat');
  if (p) p.setTransform(new DOMMatrix([1 / skala, 0, 0, 1 / skala, 0, 0]));
  return p;
}

/** Rzadka, stroma kreska w kwarcu (co pięć pikseli urządzenia). */
function kreskaKwarcu(g: CanvasRenderingContext2D, skala: number): CanvasPattern | string {
  if (!wzorKwarcu) {
    wzorKwarcu = document.createElement('canvas');
    wzorKwarcu.width = 5; wzorKwarcu.height = 10;
    const k = wzorKwarcu.getContext('2d')!;
    k.strokeStyle = 'rgba(120,104,80,0.34)';
    k.lineWidth = 0.8;
    k.beginPath();
    for (let d = -5; d <= 10; d += 5) { k.moveTo(d, 0); k.lineTo(d + 5, 10); }
    k.stroke();
  }
  const p = g.createPattern(wzorKwarcu, 'repeat');
  if (!p) return 'rgba(0,0,0,0)';
  p.setTransform(new DOMMatrix([1 / skala, 0, 0, 1 / skala, 0, 0]));
  return p;
}

/**
 * Sierp światłocienia dla sumy kształtów: część `S`, której nie zasłania kopia `S` przesunięta o (dx, dy).
 * Kopia ku światłu zostawia sierp cienia, kopia od światła — sierp blasku (jak `swiatlocien` postaci,
 * ale dla wielu nakładających się wstęg naraz, przez pomocniczą warstwę).
 */
function sierpSumy(g: CanvasRenderingContext2D, S: Path2D, dx: number, dy: number, styl: string): void {
  const c = g.canvas;
  if (!warstwa) warstwa = document.createElement('canvas');
  if (warstwa.width !== c.width || warstwa.height !== c.height) { warstwa.width = c.width; warstwa.height = c.height; }
  const v = warstwa.getContext('2d')!;
  v.setTransform(1, 0, 0, 1, 0, 0);
  v.clearRect(0, 0, warstwa.width, warstwa.height);
  v.setTransform(g.getTransform());
  v.fillStyle = styl;
  v.fill(S);
  v.globalCompositeOperation = 'destination-out';
  v.translate(dx, dy);
  v.fill(S);
  v.globalCompositeOperation = 'source-over';
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(warstwa, 0, 0);
  g.restore();
}

/** Sierp światłocienia jednego kształtu (bez warstwy): obcięcie do kształtu i dopełnienie przesuniętej kopii. */
function sierp(g: CanvasRenderingContext2D, S: Path2D, cx: number, cy: number, dx: number, dy: number, styl: string): void {
  const p = new Path2D();
  p.rect(cx - 3, cy - 3, 6, 6);
  p.addPath(S, new DOMMatrix([1, 0, 0, 1, dx, dy]));
  g.fillStyle = styl;
  g.fill(p, 'evenodd');
}

// ---------------------------------------------------------------- żelazo

interface Brylka { x: number; y: number; r: number; s: number; }

/** Gniazdo żelaza: przyrdzewiała skała, masa rudy, zacieki, okruchy i kanciaste bryłki ze ściankami w świetle i w cieniu. */
function rysujZelazo(g: CanvasRenderingContext2D, kafle: number[], zbior: Set<number>, pusto: Set<number>, W: number, skala: number, kreska: CanvasPattern | null): void {
  const px = 1 / skala;
  const maly = skala < 11, duzy = skala >= 17;
  const jest = (x: number, y: number): boolean => zbior.has(y * W + x);
  const kandydaci: Brylka[] = [];
  const drobiny: Brylka[] = [];
  // siatka świata dwa oczka na kafel w każdą stronę: bryłki nie wiedzą, gdzie kończy się kafel
  for (const i of kafle) {
    const x = i % W, y = (i / W) | 0;
    let wok = 0;
    for (const [dx, dy] of OSIEM) if (jest(x + dx, y + dy)) wok++;
    // w głębi gniazda bryłki większe, na jego skraju drobniejsze
    const rdzen = 0.82 + 0.28 * (wok / 8);
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        const gx = x * 2 + a, gy = y * 2 + b;
        const u = los(gx, gy, 1), v = los(gx, gy, 4);
        if (u < 0.2) continue;
        const bx = (gx + 0.5 + (los(gx, gy, 2) - 0.5) * 0.8) / 2, by = (gy + 0.5 + (los(gx, gy, 3) - 0.5) * 0.8) / 2;
        let r = (u < 0.55 ? 0.15 + v * 0.06 : 0.23 + v * 0.1) * rdzen;
        if (maly) r = Math.max(r, 0.19);
        kandydaci.push({ x: bx, y: by, r, s: gx * 977 + gy });
      }
    }
    // każdy kafel kruszcu ma choć jedną porządną bryłkę — inaczej kafel czytałby się jak skała
    const r0 = (maly ? 0.29 : 0.25) + los(x, y, 5) * 0.08;
    kandydaci.push({ x: x + 0.3 + los(x, y, 6) * 0.4, y: y + 0.3 + los(x, y, 7) * 0.4, r: r0, s: -(i + 1) });
    if (maly) continue;
    // drobiny: kilka okruchów w skale tuż za skrajem gniazda (brzeg nie biegnie po krawędzi kafli)
    for (const [dx, dy] of OSIEM) {
      if ((dx !== 0 && dy !== 0) || jest(x + dx, y + dy) || los(x * 4 + dx, y * 4 + dy, 8) > 0.6) continue;
      const ile = 1 + Math.floor(los(x * 4 + dx, y * 4 + dy, 9) * 2);
      for (let k = 0; k < ile; k++) {
        const s = (i * 8 + (dx + 1) * 3 + dy + 1) * 4 + k;
        const wz = (los(s, 1, 10) - 0.5) * 0.9, wg = 0.12 + los(s, 1, 11) * 0.3;
        const bx = x + 0.5 + (dx !== 0 ? dx * (0.5 + wg) : wz), by = y + 0.5 + (dy !== 0 ? dy * (0.5 + wg) : wz);
        drobiny.push({ x: bx, y: by, r: 0.03 + los(s, 1, 12) * 0.03, s });
      }
    }
  }
  // od największych: bryłka, która za bardzo wchodzi na większą, odpada — ale się stykają i zachodzą (gniazdo, nie żwir)
  kandydaci.sort((a, b) => b.r - a.r || a.s - b.s);
  const bryly: Brylka[] = [];
  for (const k of kandydaci) {
    let ok = true;
    for (const q of bryly) {
      const dx = k.x - q.x, dy = k.y - q.y;
      if (dx * dx + dy * dy < (0.55 * (k.r + q.r)) ** 2) { ok = false; break; }
    }
    if (ok || k.s < 0) bryly.push(k);
  }

  // ruda: ciemna, rdzawa masa spaja bryłki w jedno gniazdo — koła w kaflach, mostki do sąsiadów i guzy
  // pod bryłkami (brzeg falisty, nie po kafelkach), obwiedziona kreską jak wtrącenie na rycinie
  const plama = new Path2D(), masa = new Path2D(), masaObrys = new Path2D();
  const oM = Math.max(1 * px, 0.022);
  const kolo = (x: number, y: number, rx: number, ry: number): void => {
    masa.moveTo(x + rx, y); masa.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    masaObrys.moveTo(x + rx + oM, y); masaObrys.ellipse(x, y, rx + oM, ry + oM, 0, 0, Math.PI * 2);
    plama.moveTo(x + rx * 1.6, y); plama.ellipse(x, y, rx * 1.6, ry * 1.6, 0, 0, Math.PI * 2);
  };
  for (const i of kafle) {
    const x = i % W, y = (i / W) | 0;
    const r = 0.5 + los(x, y, 20) * 0.12;
    kolo(x + 0.5 + (los(x, y, 21) - 0.5) * 0.16, y + 0.5 + (los(x, y, 22) - 0.5) * 0.12, r * 1.06, r * 0.94);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]] as const) {
      if (jest(x + dx, y + dy)) kolo(x + 0.5 + dx / 2, y + 0.5 + dy / 2, dx !== 0 && dy !== 0 ? 0.42 : 0.5, dx !== 0 && dy !== 0 ? 0.42 : 0.5);
    }
  }
  for (const b of bryly) if (b.r >= 0.16) kolo(b.x, b.y, b.r * 1.2 + 0.04, b.r * 1.05 + 0.03);
  g.fillStyle = rgb(B.rdzaPlama, 0.14);
  g.fill(plama);
  g.fillStyle = rgb(B.tusz, 0.32);
  g.fill(masaObrys);
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fill(masa);
  g.restore();
  g.fillStyle = rgb(B.rudaMasa, 0.7);
  g.fill(masa);
  // ziarno masy: drobne rdzawe i ciemne cętki (z bliska)
  if (duzy) {
    for (const i of kafle) {
      const x = i % W, y = (i / W) | 0;
      for (let k = 0; k < 7; k++) {
        const cx = x + los(i, k, 23), cy = y + los(i, k, 24);
        g.fillStyle = los(i, k, 25) < 0.5 ? rgb(B.rdza, 0.7) : rgb(B.tusz, 0.55);
        g.fillRect(cx, cy, 1.4 * px, 1.4 * px);
      }
    }
  }
  // zacieki rdzy spod większych bryłek — w dół (nie do pustki: tam rdza nie ma po czym spłynąć)
  if (!maly) {
    g.strokeStyle = rgb(B.rdza, 0.28);
    for (const b of bryly) {
      if (b.r < 0.13 || los(b.s, 3, 3) > 0.45) continue;
      const x = b.x + (los(b.s, 3, 4) - 0.5) * b.r, y = b.y + b.r * 0.6;
      const dl = 0.22 + los(b.s, 3, 5) * 0.32;
      if (pusto.has(Math.floor(y + dl) * W + Math.floor(x))) continue;
      g.lineWidth = Math.max(1.2 * px, b.r * 0.16);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (los(b.s, 3, 6) - 0.5) * 0.12, y + dl * 0.5, x + (los(b.s, 3, 7) - 0.5) * 0.08, y + dl);
      g.stroke();
    }
  }
  // okruchy rudy w skale za skrajem gniazda
  for (const d of drobiny) {
    const n = 3 + Math.floor(los(d.s, 1, 1) * 2);
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + los(d.s, k, 2);
      const rr = d.r * (0.7 + los(d.s, k, 3) * 0.5);
      if (k === 0) g.moveTo(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr);
      else g.lineTo(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr);
    }
    g.closePath();
    g.strokeStyle = rgb(B.tusz, 0.9);
    g.lineWidth = Math.max(1.2 * px, d.r * 0.4);
    g.stroke();
    g.fillStyle = rgb(B.stalPol);
    g.fill();
    g.fillStyle = rgb(B.stalSwiatlo, 0.95);
    const pd = Math.max(px, d.r * 0.45);
    g.fillRect(d.x + SW.x * d.r * 0.35 - pd / 2, d.y + SW.y * d.r * 0.35 - pd / 2, pd, pd);
  }
  // z tyłu do przodu: niższa bryłka zachodzi na wyższą jak w usypisku
  bryly.sort((a, b) => a.y + a.r * 0.3 - (b.y + b.r * 0.3));
  for (const b of bryly) rysujBrylke(g, b, px, duzy, kreska);
}

const wx: number[] = [], wy: number[] = [];

/** Kanciasta bryłka: rdzawy brzeg, ścianki od światła do cienia (cień kreskowany), kontur tuszem, błysk na grani. */
function rysujBrylke(g: CanvasRenderingContext2D, b: Brylka, px: number, duzy: boolean, kreska: CanvasPattern | null): void {
  const s = b.s;
  const nv = 5 + Math.floor(los(s, 7, 0) * 3);
  const a0 = los(s, 7, 1) * Math.PI * 2;
  // spłaszczona wzdłuż warstw skały, trochę obrócona
  const wyd = 1.05 + los(s, 7, 4) * 0.35;
  const obr = (los(s, 7, 5) - 0.5) * 0.6;
  const co = Math.cos(obr), si = Math.sin(obr);
  wx.length = 0; wy.length = 0;
  for (let k = 0; k < nv; k++) {
    const a = a0 + (k / nv) * Math.PI * 2 + (los(s, k, 2) - 0.5) * (Math.PI / nv) * 0.9;
    const rr = b.r * (0.74 + los(s, k, 3) * 0.4);
    const ex = Math.cos(a) * rr * wyd, ey = Math.sin(a) * rr * 0.92 / wyd;
    wx.push(b.x + ex * co - ey * si);
    wy.push(b.y + ex * si + ey * co);
  }
  const obrys = new Path2D();
  obrys.moveTo(wx[0], wy[0]);
  for (let k = 1; k < nv; k++) obrys.lineTo(wx[k], wy[k]);
  obrys.closePath();
  // gniazdo: ciemna masa rudy wokół bryłki, u dołu głębsza — bryłka siedzi w skale, nie leży na niej
  // (dawna jaskrawa obwódka rdzy czytała się jak kawior albo jeżyny)
  g.strokeStyle = rgb(B.rudaMasa, 0.9);
  g.lineWidth = Math.max(2 * px, b.r * 0.24);
  g.stroke(obrys);
  if (duzy) {
    g.save();
    g.translate(0, b.r * 0.12);
    g.strokeStyle = rgb(B.tusz, 0.35);
    g.stroke(obrys);
    g.restore();
  }
  g.fillStyle = rgb(B.stalPol);
  g.fill(obrys);
  // każda bryłka trochę inna: jaśniejsza albo ciemniejsza stal, co czwarta pod patyną rdzy
  const ton = 0.86 + los(s, 7, 6) * 0.26, patyna = los(s, 7, 7) < 0.25 ? 0.22 : 0;
  // ścianki: wierzchołek trochę od światła, więc jasne ścianki są szerokie, a cień zbiera się u dołu
  const ax = b.x - SW.x * b.r * 0.16, ay = b.y - SW.y * b.r * 0.16;
  let najj = -2, kj = 0;
  for (let k = 0; k < nv; k++) {
    const k2 = (k + 1) % nv;
    const mx = (wx[k] + wx[k2]) / 2 - b.x, my = (wy[k] + wy[k2]) / 2 - b.y;
    const dl = Math.hypot(mx, my) || 1;
    const d = (mx * SW.x + my * SW.y) / dl;
    if (d > najj) { najj = d; kj = k; }
    let t = 0.5 + 0.62 * d;
    t = t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    const sciana = new Path2D();
    sciana.moveTo(ax, ay); sciana.lineTo(wx[k], wy[k]); sciana.lineTo(wx[k2], wy[k2]);
    sciana.closePath();
    // dolne ścianki łapią rdzę, a niektóre bryłki całe są przyrdzewiałe; ścianka w pełnym świetle lśni
    const rdzawa = (my / dl > 0.55 ? 0.3 : 0) + patyna;
    const baza = t < 0.5 ? B.stalCien : B.stalPol, cel = t < 0.5 ? B.stalPol : B.stalSwiatlo;
    const tt = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const r0 = (baza[0] + (cel[0] - baza[0]) * tt) * ton, g0 = (baza[1] + (cel[1] - baza[1]) * tt) * ton, b0 = (baza[2] + (cel[2] - baza[2]) * tt) * ton;
    g.fillStyle = t > 0.88 ? mieszaj([r0, g0, b0] as const, B.blyskStali, 0.12) : mieszaj([r0, g0, b0] as const, B.rdza, rdzawa);
    g.fill(sciana);
    // cień kreskowany rylcem — jak skała ryciny
    if (duzy && kreska && t < 0.4) { g.fillStyle = kreska; g.fill(sciana); }
  }
  // granie ścianek cienką kreską
  if (duzy) {
    g.strokeStyle = rgb(B.tusz, 0.3);
    g.lineWidth = Math.max(0.7 * px, b.r * 0.04);
    g.beginPath();
    for (let k = 0; k < nv; k++) { g.moveTo(ax, ay); g.lineTo(wx[k], wy[k]); }
    g.stroke();
  }
  // kontur tuszem: dookoła cienki, od strony cienia dociśnięty
  const wK = Math.max(1 * px, b.r * 0.08);
  g.strokeStyle = rgb(B.tusz, 0.8);
  g.lineWidth = wK;
  g.stroke(obrys);
  g.lineWidth = wK * 2;
  g.beginPath();
  for (let k = 0; k < nv; k++) {
    const k2 = (k + 1) % nv;
    const mx = (wx[k] + wx[k2]) / 2 - b.x, my = (wy[k] + wy[k2]) / 2 - b.y;
    if ((mx * SW.x + my * SW.y) / (Math.hypot(mx, my) || 1) < -0.2) { g.moveTo(wx[k], wy[k]); g.lineTo(wx[k2], wy[k2]); }
  }
  g.stroke();
  // błysk metalu na grani zwróconej do światła
  if (b.r >= 0.17 && los(s, 9, 9) < 0.35) {
    const k2 = (kj + 1) % nv;
    const t0 = 0.3, t1 = 0.62, ins = 0.22;
    const x0 = wx[kj] + (wx[k2] - wx[kj]) * t0, y0 = wy[kj] + (wy[k2] - wy[kj]) * t0;
    const x1 = wx[kj] + (wx[k2] - wx[kj]) * t1, y1 = wy[kj] + (wy[k2] - wy[kj]) * t1;
    g.strokeStyle = rgb(B.blyskStali, 0.55);
    g.lineWidth = Math.max(0.8 * px, b.r * 0.07);
    g.beginPath();
    g.moveTo(x0 + (ax - x0) * ins, y0 + (ay - y0) * ins);
    g.lineTo(x1 + (ax - x1) * ins, y1 + (ay - y1) * ins);
    g.stroke();
  }
}

// ---------------------------------------------------------------- złoto

/** Punkty wstęgi (lewy brzeg tam, prawy z powrotem) — do ścieżki dopisywane zawsze w tym samym obiegu. */
const wst: number[] = [];

/**
 * Wstęga wzdłuż łamanej (xs, ys) o półszerokościach hs (+ `dod`), dopisywana do ścieżki zawsze w tym samym
 * obiegu co łuk „arc” — wypełnienie „nonzero” daje sumę wstęg i kół, bez dziur tam, gdzie się nakładają.
 * Koło na końcu łączy pień z sąsiednim odcinkiem bez wcięcia; gałązka kończy się ostrzem.
 */
function wstega(p: Path2D, xs: number[], ys: number[], hs: number[], dod: number, kolkoA: boolean, kolkoB: boolean): void {
  const n = xs.length;
  wst.length = 0;
  const L: number[] = [], P: number[] = [];
  for (let k = 0; k < n; k++) {
    const k0 = k > 0 ? k - 1 : k, k1 = k < n - 1 ? k + 1 : k;
    let dx = xs[k1] - xs[k0], dy = ys[k1] - ys[k0];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const h = Math.max(0, hs[k]) + dod;
    L.push(xs[k] - dy * h, ys[k] + dx * h); P.push(xs[k] + dy * h, ys[k] - dx * h);
  }
  for (let k = 0; k < L.length; k += 2) wst.push(L[k], L[k + 1]);
  for (let k = P.length - 2; k >= 0; k -= 2) wst.push(P[k], P[k + 1]);
  let pole = 0;
  for (let k = 0; k < wst.length; k += 2) {
    const k2 = (k + 2) % wst.length;
    pole += wst[k] * wst[k2 + 1] - wst[k2] * wst[k + 1];
  }
  if (pole >= 0) {
    p.moveTo(wst[0], wst[1]);
    for (let k = 2; k < wst.length; k += 2) p.lineTo(wst[k], wst[k + 1]);
  } else {
    p.moveTo(wst[wst.length - 2], wst[wst.length - 1]);
    for (let k = wst.length - 4; k >= 0; k -= 2) p.lineTo(wst[k], wst[k + 1]);
  }
  p.closePath();
  const h0 = Math.max(0, hs[0]) + dod, h1 = Math.max(0, hs[n - 1]) + dod;
  if (kolkoA && h0 > 0) { p.moveTo(xs[0] + h0, ys[0]); p.arc(xs[0], ys[0], h0, 0, Math.PI * 2); }
  if (kolkoB && h1 > 0) { p.moveTo(xs[n - 1] + h1, ys[n - 1]); p.arc(xs[n - 1], ys[n - 1], h1, 0, Math.PI * 2); }
}

/** Odcinek żyły: łamana z półszerokościami; pień (z kwarcem i kołami na końcach) albo gałązka (z ostrzem). */
interface Zylka { xs: number[]; ys: number[]; hs: number[]; pien: boolean; }
interface Samorodek { x: number; y: number; r: number; s: number; }

/**
 * Łamana od (ax, ay) do (bx, by), pogięta w poprzek o losowe odchyłki, wygładzona jednym ścięciem rogów;
 * półszerokość od h0 do h1, po drodze pęcznieje i zwęża się (soczewki złota w szczelinie).
 */
function lamana(ax: number, ay: number, bx: number, by: number, h0: number, h1: number, s: number, giecie: number, puchnie: number): Zylka {
  const dx = bx - ax, dy = by - ay, dl = Math.hypot(dx, dy) || 1;
  const nx = -dy / dl, ny = dx / dl;
  const xs0: number[] = [], ys0: number[] = [], hs0: number[] = [];
  for (let k = 0; k <= 4; k++) {
    const t = k / 4;
    const o = k === 0 || k === 4 ? 0 : (los(s, k, 40) - 0.5) * giecie * dl;
    xs0.push(ax + dx * t + nx * o); ys0.push(ay + dy * t + ny * o);
    hs0.push((h0 + (h1 - h0) * t) * (k === 0 || k === 4 ? 1 : 1 + (los(s, k, 41) - 0.4) * puchnie));
  }
  // ścięcie rogów (Chaikin): łagodne zakola zamiast zygzaka
  const xs = [xs0[0]], ys = [ys0[0]], hs = [hs0[0]];
  for (let k = 0; k < 4; k++) {
    for (const t of [0.25, 0.75]) {
      xs.push(xs0[k] + (xs0[k + 1] - xs0[k]) * t); ys.push(ys0[k] + (ys0[k + 1] - ys0[k]) * t); hs.push(hs0[k] + (hs0[k + 1] - hs0[k]) * t);
    }
  }
  xs.push(xs0[4]); ys.push(ys0[4]); hs.push(hs0[4]);
  return { xs, ys, hs, pien: true };
}

/** Żyła złota: kwarc, w nim pień przez wszystkie kafle (drzewo rozpinające), gałązki, ogony i samorodki. */
function rysujZloto(g: CanvasRenderingContext2D, kafle: number[], zbior: Set<number>, pusto: Set<number>, W: number, skala: number, blyski: number[]): void {
  const px = 1 / skala;
  const maly = skala < 11, duzy = skala >= 17;
  const jest = (x: number, y: number): boolean => zbior.has(y * W + x);
  const pustoW = (x: number, y: number): boolean => pusto.has(Math.floor(y) * W + Math.floor(x));
  // z daleka żyła nie może się rozpaść na nitki: najmniejsza półszerokość w pikselach
  const hwMin = (maly ? 1.5 : duzy ? 1.1 : 1.3) * px;
  const n = kafle.length;
  const wezX: number[] = [], wezY: number[] = [], wezH: number[] = [];
  const nr = new Map<number, number>();
  for (let k = 0; k < n; k++) {
    const i = kafle[k], x = i % W, y = (i / W) | 0;
    nr.set(i, k);
    wezX.push(x + 0.5 + (los(x, y, 51) - 0.5) * 0.44);
    wezY.push(y + 0.5 + (los(x, y, 52) - 0.5) * 0.34);
    // cienka żyła w szczelinie, nie sznurek — dawna gruba wstęga czytała się jak makaron albo łańcuszek
    wezH.push(Math.max(hwMin, (maly ? 0.062 : 0.034) + los(x, y, 53) * 0.02));
  }
  // drzewo rozpinające po sąsiadach (Kruskal): poziomo najtaniej, po skosie drożej, w pionie najdrożej —
  // pień płynie wzdłuż pasa kruszcu, między rzędami przechodzi skosem i nigdy nie zamyka się w drabinkę
  const krawedzie: [number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const i = kafle[k], x = i % W, y = (i / W) | 0;
    for (const [dx, dy, waga] of [[1, 0, 1], [0, 1, 2.2], [1, 1, 1.3], [-1, 1, 1.3]] as const) {
      if (!jest(x + dx, y + dy)) continue;
      krawedzie.push([k, nr.get((y + dy) * W + x + dx)!, waga * (0.7 + 0.6 * los(x * 4 + dx + 1, y * 4 + dy, 54))]);
    }
  }
  krawedzie.sort((a, b) => a[2] - b[2]);
  const rodzic = new Int32Array(n);
  for (let k = 0; k < n; k++) rodzic[k] = k;
  const szef = (k: number): number => { while (rodzic[k] !== k) { rodzic[k] = rodzic[rodzic[k]]; k = rodzic[k]; } return k; };
  const sasiad: number[][] = [];
  for (let k = 0; k < n; k++) sasiad.push([]);
  const zylki: Zylka[] = [];
  const samorodki: Samorodek[] = [];
  /** Gałązka od (ox, oy) w kierunku a: w pustkę nie (odbija na drugą stronę), zwęża się do ostrza, czasem widlasta. */
  const galazka = (ox: number, oy: number, a: number, dl: number, h0: number, s: number, odbij: number): void => {
    let ex = ox + Math.cos(a) * dl, ey = oy + Math.sin(a) * dl;
    if (pustoW(ex, ey) || pustoW((ox + ex) / 2, (oy + ey) / 2)) {
      a = odbij - a;
      ex = ox + Math.cos(a) * dl; ey = oy + Math.sin(a) * dl;
      if (pustoW(ex, ey) || pustoW((ox + ex) / 2, (oy + ey) / 2)) return;
    }
    const z = lamana(ox, oy, ex, ey, h0, maly ? hwMin * 0.7 : 0, s, 0.3, 0.3);
    z.pien = false;
    zylki.push(z);
    if (!duzy) return;
    if (los(s, 1, 42) < 0.42) {
      const zw = (los(s, 1, 43) < 0.5 ? -1 : 1) * (0.5 + los(s, 1, 44) * 0.35);
      const fx = z.xs[5], fy = z.ys[5], d2 = dl * (0.35 + los(s, 1, 45) * 0.25);
      const gx = fx + Math.cos(a + zw) * d2, gy = fy + Math.sin(a + zw) * d2;
      if (!pustoW(gx, gy)) { const z2 = lamana(fx, fy, gx, gy, z.hs[5] * 0.8, 0, s + 7, 0.3, 0.2); z2.pien = false; zylki.push(z2); }
    } else if (los(s, 1, 46) < 0.3) samorodki.push({ x: ex, y: ey, r: 0.04 + los(s, 1, 47) * 0.025, s: s * 3 + 1 });
  };
  for (const [a, b] of krawedzie) {
    const ra = szef(a), rb = szef(b);
    if (ra === rb) continue;
    rodzic[ra] = rb;
    sasiad[a].push(b); sasiad[b].push(a);
    const s = kafle[a] * 4 + (kafle[b] - kafle[a] + W + 1);
    const z = lamana(wezX[a], wezY[a], wezX[b], wezY[b], wezH[a], wezH[b], s, 0.3, maly ? 0.3 : 0.5);
    zylki.push(z);
    // z bliska: drobne ząbki wzdłuż żyły — złoto rośnie w szczelinie kryształkami, nie jak gładki drut
    if (duzy) {
      for (let j = 1; j < z.xs.length - 1; j += 2) {
        if (los(s, j, 30) < 0.4) continue;
        const kj = Math.atan2(z.ys[j + 1] - z.ys[j - 1], z.xs[j + 1] - z.xs[j - 1]);
        const a2 = kj + (los(s, j, 31) < 0.5 ? -1 : 1) * (0.8 + los(s, j, 32) * 0.5);
        const d2 = 0.05 + los(s, j, 33) * 0.07 + z.hs[j] * 0.6;
        const ex = z.xs[j] + Math.cos(a2) * d2, ey = z.ys[j] + Math.sin(a2) * d2;
        if (pustoW(ex, ey)) continue;
        const zab = lamana(z.xs[j], z.ys[j], ex, ey, z.hs[j] * 0.55, 0, s * 3 + j, 0, 0);
        zab.pien = false;
        zylki.push(zab);
      }
    }
    // gałązka z połowy odcinka, w bok i trochę naprzód
    const dx = wezX[b] - wezX[a], dy = wezY[b] - wezY[a], kat = Math.atan2(dy, dx);
    if (los(s, 2, 48) < (duzy ? 0.85 : 0.55)) {
      const strona = los(s, 2, 49) < 0.5 ? -1 : 1;
      const m = 3 + Math.floor(los(s, 2, 50) * 3);
      galazka(z.xs[m], z.ys[m], kat + strona * (0.9 + los(s, 2, 51) * 0.5), (maly ? 0.3 : 0.22) + los(s, 2, 52) * 0.22, Math.max(hwMin * 0.8, z.hs[m] * 0.6), s * 5 + 3, 2 * kat);
    }
    // samorodek gdzieś na odcinku, zwykle tam, gdzie żyła spuchła
    if (los(s, 2, 53) < 0.42) {
      let m = 1 + Math.floor(los(s, 2, 55) * (z.hs.length - 2));
      if (los(s, 2, 56) < 0.6) for (let k = 2; k < z.hs.length - 1; k++) if (z.hs[k] > z.hs[m]) m = k;
      samorodki.push({ x: z.xs[m], y: z.ys[m], r: (maly ? 0.16 : 0.11) + los(s, 2, 54) * 0.08, s: s * 5 + 4 });
    }
  }
  for (let k = 0; k < n; k++) {
    const i = kafle[k], x = i % W, y = (i / W) | 0;
    const sas = sasiad[k];
    // koniec żyły nie urywa się kołem: ogon wychodzi w skałę i zwęża się do ostrza
    if (sas.length <= 1) {
      const kier = sas.length ? Math.atan2(wezY[k] - wezY[sas[0]], wezX[k] - wezX[sas[0]]) : (los(x, y, 55) < 0.5 ? 0 : Math.PI);
      const ile = sas.length ? 1 : 2;
      for (let j = 0; j < ile; j++) {
        const a = kier + j * Math.PI + (los(x, y, 56 + j) - 0.5) * 0.7;
        const dl = 0.3 + los(x, y, 58 + j) * 0.22;
        const ex = wezX[k] + Math.cos(a) * dl, ey = wezY[k] + Math.sin(a) * dl;
        if (pustoW(ex, ey)) continue;
        zylki.push(lamana(wezX[k], wezY[k], ex, ey, wezH[k], maly ? hwMin * 0.7 : 0, i * 4 + j, 0.25, 0.3));
      }
    }
    // gałązka z węzła w poprzek pasa
    if (!maly && sas.length <= 2 && los(x, y, 60) < 0.75) {
      const a = (los(x, y, 61) < 0.5 ? -1 : 1) * (Math.PI / 2 + (los(x, y, 62) - 0.5) * 1.2);
      galazka(wezX[k], wezY[k], a, 0.24 + los(x, y, 63) * 0.2, wezH[k] * 0.6, i * 9 + 2, 0);
    }
    // samorodek w węźle
    if (los(x, y, 64) < (maly ? 0.45 : 0.3)) {
      samorodki.push({ x: wezX[k] + (los(x, y, 65) - 0.5) * 0.14, y: wezY[k] + (los(x, y, 66) - 0.5) * 0.08, r: (maly ? 0.18 : 0.13) + los(x, y, 67) * 0.09, s: i * 9 + 7 });
    }
  }

  // kwarc: jasna, kanciasta soczewka wokół pnia — z daleka znać złoże, z bliska kreska innego rylca
  const kwarc = new Path2D(), kwarcObrys = new Path2D();
  const oK = Math.max(1 * px, 0.022);
  for (let k = 0; k < zylki.length; k++) {
    const z = zylki[k];
    if (!z.pien) continue;
    const hq = z.hs.map((h, j) => Math.max(duzy ? 0 : 2.6 * px, 0.15 + 0.05 * Math.sin(j * 0.9 + k * 1.7) + h * 0.4) * (j === z.hs.length - 1 && z.hs[j] <= hwMin ? 0.3 : 1));
    wstega(kwarc, z.xs, z.ys, hq, 0, false, false);
    wstega(kwarcObrys, z.xs, z.ys, hq, oK, false, false);
  }
  // w węzłach kryształ: wielokąt o kilku ścianach (obieg jak łuk — suma bez dziur)
  for (let k = 0; k < n; k++) {
    const i = kafle[k], nw = 6 + Math.floor(los(i, 3, 58) * 3), a0 = los(i, 3, 59) * Math.PI;
    const r = 0.2 + los(i, 3, 57) * 0.06;
    for (const [P, d] of [[kwarc, 0], [kwarcObrys, oK]] as const) {
      for (let j = 0; j < nw; j++) {
        const a = a0 + (j / nw) * Math.PI * 2, rr = r * (0.8 + los(i, j, 60) * 0.35) + d;
        const x = wezX[k] + Math.cos(a) * rr * 1.25, y = wezY[k] + Math.sin(a) * rr * 0.85;
        if (j === 0) P.moveTo(x, y); else P.lineTo(x, y);
      }
      P.closePath();
    }
  }
  // brzeg kwarcu: sam pierścień tuszu (pod półprzejrzystym kwarcem skała nie ciemnieje)
  // kwarc ledwie widać: jaśniejsza szczelina, nie biała otoczka wokół złota
  g.fillStyle = rgb(B.tusz, 0.22);
  g.fill(kwarcObrys);
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fill(kwarc);
  g.restore();
  g.fillStyle = rgb(B.kwarc, 0.26);
  g.fill(kwarc);
  if (!maly) {
    g.fillStyle = kreskaKwarcu(g, skala);
    g.fill(kwarc);
  }

  // żyła: kontur tuszem (suma poszerzonych wstęg), ciało, sierp cienia i sierp blasku
  const zyla = new Path2D(), obrys = new Path2D();
  const oT = Math.max(1.1 * px, 0.02);
  for (const z of zylki) {
    wstega(zyla, z.xs, z.ys, z.hs, 0, true, z.pien);
    wstega(obrys, z.xs, z.ys, z.hs, oT, true, z.pien);
  }
  g.fillStyle = rgb(B.tusz, 0.8);
  g.fill(obrys);
  g.fillStyle = rgb(B.zloto);
  g.fill(zyla);
  // złoto w szczelinie jest płaskie: tylko wąski cień przy dolnym brzegu, a blask w urywkach wzdłuż żyły
  const dS = Math.max(0.8 * px, 0.02);
  sierpSumy(g, zyla, SW.x * dS, SW.y * dS, rgb(B.zlotoCien));
  g.strokeStyle = rgb(B.zlotoSwiatlo, 0.92);
  for (let k = 0; k < zylki.length; k++) {
    const z = zylki[k], ile = z.xs.length;
    if (ile < 4) continue;
    const j0 = 1 + Math.floor(los(k, ile, 94) * (ile - 4)), j1 = j0 + 2 + Math.floor(los(k, ile, 95) * 2);
    let hs = 0;
    for (let j = j0; j <= j1 && j < ile; j++) hs += z.hs[j];
    hs /= j1 - j0 + 1;
    if (hs < 1.1 * px) continue;
    g.lineWidth = Math.max(0.8 * px, hs * 0.5);
    g.beginPath();
    for (let j = j0; j <= j1 && j < ile; j++) {
      const x = z.xs[j] + SW.x * hs * 0.4, y = z.ys[j] + SW.y * hs * 0.4;
      if (j === j0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }

  // samorodki: od mniejszych, duże na wierzchu
  samorodki.sort((a, b) => a.r - b.r);
  for (const sm of samorodki) {
    if (pustoW(sm.x, sm.y)) continue;
    // z daleka samorodki grubsze — to po nich gracz poznaje złoto
    const r = Math.max(sm.r * (duzy ? 1 : 1.25), maly ? 2.6 * px : 1.8 * px);
    rysujSamorodek(g, sm.x, sm.y, r, sm.s, px, duzy);
    if (r >= ZYLY.blyskOdWielkosci) blyski.push(sm.x + SW.x * r * 0.4, sm.y + SW.y * r * 0.35, los(sm.s, 1, 1), ZYLY.blyskOd + los(sm.s, 2, 2) * (ZYLY.blyskDo - ZYLY.blyskOd));
  }
  // okruchy złota w kwarcu
  if (!maly) {
    for (let k = 0; k < n; k++) {
      const i = kafle[k];
      const ile = 4 + Math.floor(los(i, 9, 90) * 4);
      for (let j = 0; j < ile; j++) {
        const x = wezX[k] + (los(i, j, 91) - 0.5) * 0.9, y = wezY[k] + (los(i, j, 92) - 0.5) * 0.5;
        if (pustoW(x, y)) continue;
        const r = Math.max(1 * px, 0.014 + los(i, j, 93) * 0.014);
        g.fillStyle = rgb(B.tusz, 0.8);
        g.beginPath(); g.arc(x, y, r + 0.7 * px, 0, Math.PI * 2); g.fill();
        g.fillStyle = rgb(B.zlotoJasne);
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    }
  }
}

/** Samorodek: obły, guzowaty; sierp cienia, jasny bok, blask i kontur tuszem jak u postaci. */
function rysujSamorodek(g: CanvasRenderingContext2D, x: number, y: number, r: number, s: number, px: number, duzy: boolean): void {
  // guzowaty, spłaszczony, z kilkoma ostrymi rogami — bryłka rodzimego złota, nie kropla
  const n = 7 + Math.floor(los(s, 4, 3) * 4);
  const pxs: number[] = [], pys: number[] = [];
  const a0 = los(s, 4, 4) * Math.PI * 2;
  const wyd = 1.15 + los(s, 4, 5) * 0.3, obr = (los(s, 4, 6) - 0.5) * 0.7;
  const co = Math.cos(obr), si = Math.sin(obr);
  for (let j = 0; j < n; j++) {
    const a = a0 + (j / n) * Math.PI * 2 + (los(s, j, 8) - 0.5) * (Math.PI / n);
    const rr = r * (0.66 + los(s, j, 5) * 0.56);
    const ex = Math.cos(a) * rr * wyd, ey = Math.sin(a) * rr * 0.86 / wyd;
    pxs.push(x + ex * co - ey * si); pys.push(y + ex * si + ey * co);
  }
  const p = new Path2D();
  p.moveTo((pxs[n - 1] + pxs[0]) / 2, (pys[n - 1] + pys[0]) / 2);
  for (let j = 0; j < n; j++) {
    const j2 = (j + 1) % n;
    if (los(s, j, 9) < 0.3) { p.lineTo(pxs[j], pys[j]); p.lineTo((pxs[j] + pxs[j2]) / 2, (pys[j] + pys[j2]) / 2); }
    else p.quadraticCurveTo(pxs[j], pys[j], (pxs[j] + pxs[j2]) / 2, (pys[j] + pys[j2]) / 2);
  }
  p.closePath();
  // kontur pod spodem: połowa kreski wychodzi na zewnątrz
  g.strokeStyle = rgb(B.tusz, 0.95);
  g.lineWidth = Math.max(2.2 * px, r * 0.34);
  g.stroke(p);
  g.fillStyle = rgb(B.zloto);
  g.fill(p);
  g.save();
  g.clip(p);
  sierp(g, p, x, y, SW.x * r * 0.42, SW.y * r * 0.42, rgb(B.zlotoCien));
  sierp(g, p, x, y, -SW.x * r * 0.34, -SW.y * r * 0.34, rgb(B.zlotoJasne));
  // dołki w złocie (z bliska): kute, nie lane
  if (duzy && r > 0.08) {
    g.fillStyle = rgb(B.zlotoCien, 0.8);
    for (let j = 0; j < 2; j++) {
      const dx = (los(s, j, 6) - 0.5) * r, dy = (los(s, j, 7) - 0.5) * r * 0.6;
      g.beginPath(); g.ellipse(x + dx, y + dy, r * 0.13, r * 0.08, 0.4, 0, Math.PI * 2); g.fill();
    }
  }
  // blask: plamka przy jasnym brzegu
  g.fillStyle = rgb(B.zlotoSwiatlo, 0.95);
  g.beginPath();
  g.ellipse(x + SW.x * r * 0.42, y + SW.y * r * 0.36, Math.max(0.9 * px, r * 0.24), Math.max(0.7 * px, r * 0.14), -0.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
