/**
 * KUKIEŁKA DEMONA (Alpha 1, 5.11). Boss z Wielkiego Pomnika to ten sam rysunek co posąg (obrazy/pomnik/demon-*.png),
 * pocięty po narysowanych liniach na 18 części (scripts/pomnik/czesci.py): aureola, łydki, stopy, uda, ramiona,
 * przedramiona, dłonie, tułów, przepaska, naszyjnik z czaszek, głowa i szczęka. Każda część ma dwie skóry wypieczone
 * z rysunku — żywą (ciemny bazalt z żyłami żaru, pod światło płonącej aureoli) i kamienną (posąg, z którego wstaje
 * i w który zastyga, kiedy kona) — oraz warstwy świecenia: żyły żaru, pęknięcia ran w czterech stopniach, biały
 * i złoty obrys. Pod sąsiadami z przodu części mają schowane zakładki, więc ruch nie odsłania dziur.
 *
 * Szkielet: miednica → tułów → głowa → szczęka, aureola, naszyjnik, ramiona → przedramiona → dłonie; miednica →
 * przepaska, uda → łydki; stopy stoją na ziemi same. Ręce i nogi liczy IK (cel nadgarstka i kostki; łokcie i kolana
 * zginają się na zewnątrz) — przysiad to opuszczona miednica, a stopy zostają na ziemi.
 * Rysuje się stopami w (0, 0), w jednostkach wysokości postaci `h` (rysunek z cokołem ma 1,15 h — jak dawniej).
 * Ruchy, zachowanie bossa i sceny (wstawanie z gruzu, konanie) — render/demon-boss.ts.
 */
import zywyUrl from '../../obrazy/pomnik/kukla-zywy.webp?url';
import kamienUrl from '../../obrazy/pomnik/kukla-kamien.webp?url';
import zarUrl from '../../obrazy/pomnik/kukla-zar.png?url';
import {
  CZESCI_DEMONA as CZ, KOLEJNOSC_CZESCI, ATLAS_DEMONA as ATL, RYSUNEK_DEMONA as RYS, STAWY_DEMONA as ST,
  OCZY_DEMONA, USTA_DEMONA, PLOMIENIE_AUREOLI, type CzescDemona,
} from './demon-czesci';

export type P = [number, number];
/** Macierz 2D jak w setTransform: [a, b, c, d, e, f]. */
export type M = [number, number, number, number, number, number];
export type { CzescDemona };

/** Piksele ekranu na piksel rysunku przy wysokości postaci `h`. */
export const skalaKukly = (h: number): number => (h * 1.15) / RYS.wys;
/** Linia stóp i środek w pikselach rysunku. */
export const ZIEMIA_KUKLY = RYS.ziemia, SRODEK_KUKLY = RYS.srodek;

// ---------- poza ----------

/** Poza kukły. Przesunięcia w pikselach rysunku, kąty w radianach (+ zgodnie ze wskazówkami zegara). */
export interface PozaKukly {
  /** całe ciało (wokół środka stóp): przesunięcie, przechył, skala */
  x: number; y: number; obrot: number; sx: number; sy: number;
  /** miednica: przesunięcie (przysiad — y w dół) i przechył */
  mx: number; my: number; mr: number;
  /** tułów wokół pasa: przechył i skala (oddech, skłon) */
  tr: number; tsx: number; tsy: number;
  /** głowa wokół szyi; szczęka 0…1 (ryk do 1,5) */
  gr: number; gx: number; gy: number; szczeka: number;
  /** aureola: rozbłysk (skala − 1) i obrót; kołysanie naszyjnika i przepaski */
  aureola: number; aur: number; naszyjnik: number; przepaska: number;
  /** ręce: cel nadgarstka (przesunięcie od spoczynku w układzie tułowia), obrót dłoni, uniesienie barku (− w górę) */
  rL: P; rP: P; dL: number; dP: number; bL: number; bP: number;
  /** nogi: cel kostki (przesunięcie od spoczynku), obrót stopy */
  nL: P; nP: P; sL: number; sP: number;
}
/** Ruch — przyrosty pozy (skale też jako przyrost). */
export type RuchKukly = { [K in keyof PozaKukly]?: PozaKukly[K] };

export function spoczynek(): PozaKukly {
  return {
    x: 0, y: 0, obrot: 0, sx: 1, sy: 1, mx: 0, my: 0, mr: 0, tr: 0, tsx: 1, tsy: 1,
    gr: 0, gx: 0, gy: 0, szczeka: 0, aureola: 0, aur: 0, naszyjnik: 0, przepaska: 0,
    rL: [0, 0], rP: [0, 0], dL: 0, dP: 0, bL: 0, bP: 0, nL: [0, 0], nP: [0, 0], sL: 0, sP: 0,
  };
}

/** Dodaje ruch z wagą `w` (w miejscu). */
export function dodaj(p: PozaKukly, r: RuchKukly, w = 1): PozaKukly {
  if (w === 0) return p;
  const pp = p as unknown as Record<string, number | P>;
  for (const k in r) {
    const v = (r as Record<string, number | P | undefined>)[k];
    if (v === undefined) continue;
    if (Array.isArray(v)) { const a = pp[k] as P; a[0] += v[0] * w; a[1] += v[1] * w; }
    else pp[k] = (pp[k] as number) + v * w;
  }
  return p;
}

// ---------- szkielet ----------

function lok(px: number, py: number, ox: number, oy: number, r: number, sx = 1, sy = 1): M {
  const c = Math.cos(r), s = Math.sin(r);
  const a = c * sx, b = s * sx, cc = -s * sy, d = c * sy;
  return [a, b, cc, d, px + ox - (a * px + cc * py), py + oy - (b * px + d * py)];
}
export function mnoz(m: M, n: M): M {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}
export const naPunkt = (m: M, x: number, y: number): P => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const kat = (m: M): number => Math.atan2(m[1], m[0]);
const kier = (a: P, b: P): number => Math.atan2(b[1] - a[1], b[0] - a[0]);
const odl = (a: P, b: P): number => Math.hypot(b[0] - a[0], b[1] - a[1]);
const pt = (q: readonly number[]): P => [q[0], q[1]];

/** Dwa ogniwa IK: staw środkowy (łokieć, kolano) dla barku/biodra `a` i celu `t`. */
function ik(a: P, t: P, l1: number, l2: number, znak: number): P {
  const dx = t[0] - a[0], dy = t[1] - a[1];
  const d = Math.max(Math.abs(l1 - l2) + 1, Math.min((l1 + l2) * 0.999, Math.hypot(dx, dy) || 1e-6));
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const kb = Math.atan2(dy, dx) + znak * A;
  return [a[0] + Math.cos(kb) * l1, a[1] + Math.sin(kb) * l1];
}

interface Konczyna { a: P; j: P; t: P; l1: number; l2: number; znak: number; al1: number; al2: number }
function konczyna(a0: readonly number[], j0: readonly number[], t0: readonly number[], znak?: number): Konczyna {
  const a = pt(a0), j = pt(j0), t = pt(t0);
  const kr = (t[0] - a[0]) * (j[1] - a[1]) - (t[1] - a[1]) * (j[0] - a[0]);
  return { a, j, t, l1: odl(a, j), l2: odl(j, t), znak: znak ?? (kr >= 0 ? 1 : -1), al1: kier(a, j), al2: kier(j, t) };
}
const RAMIONA = {
  L: konczyna(ST.barkL, ST.lokiecL, ST.nadgarstekL),
  P: konczyna(ST.barkP, ST.lokiecP, ST.nadgarstekP),
};
// kolana na zewnątrz (nogi w spoczynku są prawie proste — znak z rysunku byłby chwiejny)
const NOGI = {
  L: konczyna(ST.biodroL, ST.kolanoL, ST.kostkaL, 1),
  P: konczyna(ST.biodroP, ST.kolanoP, ST.kostkaP, -1),
};
/** Spoczynkowe punkty (piksele rysunku): nadgarstki, kostki. */
export const PUNKTY_KUKLY = {
  nadgarstekL: pt(ST.nadgarstekL), nadgarstekP: pt(ST.nadgarstekP), kostkaL: pt(ST.kostkaL), kostkaP: pt(ST.kostkaP),
  barkL: pt(ST.barkL), barkP: pt(ST.barkP), piers: [330, 350] as P, usta: [350, 196] as P, glowa: [346, 130] as P,
  dlonL: [58, 178] as P, dlonP: [572, 178] as P, oczy: OCZY_DEMONA.map(pt),
};

export interface Szkielet { m: Record<CzescDemona, M>; swiat: M }

/** Macierze części dla pozy (w pikselach rysunku). */
export function zloz(p: PozaKukly): Szkielet {
  const m = {} as Record<CzescDemona, M>;
  const sw = lok(RYS.srodek, RYS.ziemia, p.x, p.y, p.obrot, p.sx, p.sy);
  const mied = lok(314, 560, p.mx, p.my, p.mr);
  const tul = mnoz(mied, lok(314, 540, 0, 0, p.tr, p.tsx, p.tsy));
  m.tulow = tul;
  // przepaska: w przysiadzie marszczy się na udach (skraca), zamiast przebić podłogę
  const pasY = CZ.przepaska.staw[1] + p.my, dolP = CZ.przepaska.y + CZ.przepaska.h;
  const psy = Math.max(0.42, Math.min(1, (RYS.ziemia - 8 - pasY) / (dolP - CZ.przepaska.staw[1])));
  m.przepaska = mnoz(mied, lok(CZ.przepaska.staw[0], CZ.przepaska.staw[1], 0, 0, p.przepaska, 1 + (1 - psy) * 0.12, psy));
  m.naszyjnik = mnoz(tul, lok(CZ.naszyjnik.staw[0], CZ.naszyjnik.staw[1], 0, 0, p.naszyjnik));
  m.glowa = mnoz(tul, lok(CZ.glowa.staw[0], CZ.glowa.staw[1], p.gx, p.gy, p.gr));
  const sz = Math.max(0, p.szczeka);
  m.szczeka = mnoz(m.glowa, lok(CZ.szczeka.staw[0], CZ.szczeka.staw[1], 0, sz * 15, sz * 0.03, 1, 1 + sz * 0.07));
  m.aureola = mnoz(tul, lok(CZ.aureola.staw[0], CZ.aureola.staw[1], 0, 0, p.aur, 1 + p.aureola, 1 + p.aureola));
  const kt = kat(tul);
  for (const b of ['L', 'P'] as const) {
    const K = RAMIONA[b];
    const bark = b === 'L' ? p.bL : p.bP, r = b === 'L' ? p.rL : p.rP, dl = b === 'L' ? p.dL : p.dP;
    const S = naPunkt(tul, K.a[0], K.a[1] + bark);
    const T = naPunkt(tul, K.t[0] + r[0], K.t[1] + r[1]);
    const E = ik(S, T, K.l1, K.l2, K.znak);
    const th1 = kier(S, E), th2 = kier(E, T);
    const ram = mnoz(tul, lok(K.a[0], K.a[1], 0, bark, th1 - K.al1 - kt));
    const prz = mnoz(ram, lok(K.j[0], K.j[1], 0, 0, th2 - K.al2 - (th1 - K.al1)));
    m[`ramie${b}`] = ram;
    m[`przedramie${b}`] = prz;
    m[`dlon${b}`] = mnoz(prz, lok(K.t[0], K.t[1], 0, 0, kt + dl - (th2 - K.al2)));
  }
  const km = kat(mied);
  for (const b of ['L', 'P'] as const) {
    const K = NOGI[b];
    const n = b === 'L' ? p.nL : p.nP, s = b === 'L' ? p.sL : p.sP;
    const Hh = naPunkt(mied, K.a[0], K.a[1]);
    const A: P = [K.t[0] + n[0], K.t[1] + n[1]];
    const Kn = ik(Hh, A, K.l1, K.l2, K.znak);
    const th1 = kier(Hh, Kn), th2 = kier(Kn, A);
    const udo = mnoz(mied, lok(K.a[0], K.a[1], 0, 0, th1 - K.al1 - km));
    m[`udo${b}`] = udo;
    m[`lydka${b}`] = mnoz(udo, lok(K.j[0], K.j[1], 0, 0, th2 - K.al2 - (th1 - K.al1)));
    m[`stopa${b}`] = lok(K.t[0], K.t[1], n[0], n[1], s);
  }
  for (const n of KOLEJNOSC_CZESCI) m[n] = mnoz(sw, m[n]);
  return { m, swiat: sw };
}

// ---------- obrazy i warstwy części ----------

interface Obraz { img: HTMLImageElement; ok: boolean }
function wczytaj(url: string): Obraz {
  const o: Obraz = { img: new Image(), ok: false };
  o.img.onload = () => { o.ok = true; };
  o.img.src = url;
  return o;
}
const obrazy = typeof Image === 'undefined' ? null : { zywy: wczytaj(zywyUrl), kamien: wczytaj(kamienUrl), zar: wczytaj(zarUrl) };

/** Dwie barwy świecenia: ogień i złote światło (modlitwa, konanie). */
type Para = [HTMLCanvasElement, HTMLCanvasElement];
interface Czesc {
  x: number; y: number; w: number; h: number;
  /** skóra żywa i kamienna: mipy 1, 1/2, 1/4 */
  zywy: HTMLCanvasElement[]; kamien: HTMLCanvasElement[];
  /** pół rozdzielczości: żyły żaru, pęknięcia ran (4 stopnie), obrys biały i złoty */
  zyly: Para | null; rysy: (Para | null)[]; bialy: HTMLCanvasElement; zloty: HTMLCanvasElement;
}
let czesci: Record<CzescDemona, Czesc> | null = null;

const plotno = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  return c;
};
function zabarw(src: HTMLCanvasElement, kolor: string): HTMLCanvasElement {
  const c = plotno(src.width, src.height), g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = kolor; g.fillRect(0, 0, c.width, c.height);
  return c;
}
function mipy(img: CanvasImageSource, ax: number, ay: number, w: number, h: number): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  let src: CanvasImageSource = img, sx = ax, sy = ay, sw = w, sh = h;
  for (let k = 0; k < 3; k++) {
    const c = plotno(Math.ceil(w / (1 << k)), Math.ceil(h / (1 << k))), g = c.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    out.push(c); src = c; sx = 0; sy = 0; sw = c.width; sh = c.height;
  }
  return out;
}
const OGIEN = 'rgb(255,118,38)', ZLOTO = 'rgb(255,212,130)';

function zbuduj(): Record<CzescDemona, Czesc> {
  const atl = plotno(ATL.w, ATL.h), ga = atl.getContext('2d', { willReadFrequently: true })!;
  ga.drawImage(obrazy!.zar.img, 0, 0);
  const dane = ga.getImageData(0, 0, ATL.w, ATL.h).data;
  const wynik = {} as Record<CzescDemona, Czesc>;
  for (const n of KOLEJNOSC_CZESCI) {
    const { x, y, w, h, ax, ay } = CZ[n];
    const zywy = mipy(obrazy!.zywy.img, ax, ay, w, h), kamien = mipy(obrazy!.kamien.img, ax, ay, w, h);
    // warstwy świecenia z atlasu: R — żyły, G — pęknięcia (stopień × 64 + 1 + pokrycie 0…62)
    const warstwy = [0, 1, 2, 3, 4].map(() => new ImageData(w, h));
    const pelne = [false, false, false, false, false];
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const i = ((ay + yy) * ATL.w + ax + xx) * 4, o = (yy * w + xx) * 4;
        const r = dane[i], g = dane[i + 1];
        if (r) { const d = warstwy[0].data; d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = r; pelne[0] = true; }
        if (g) {
          const st = Math.min(3, g >> 6), a = Math.round(Math.max(0, (g & 63) - 1) / 62 * 255);
          const d = warstwy[1 + st].data; d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = a; pelne[1 + st] = true;
        }
      }
    }
    const pol = (k: number): Para | null => {
      if (!pelne[k]) return null;
      const c = plotno(w, h); c.getContext('2d')!.putImageData(warstwy[k], 0, 0);
      const m = plotno(Math.ceil(w / 2), Math.ceil(h / 2)), g = m.getContext('2d')!;
      g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, m.width, m.height);
      return [zabarw(m, OGIEN), zabarw(m, ZLOTO)];
    };
    wynik[n] = {
      x, y, w, h, zywy, kamien, zyly: pol(0), rysy: [pol(1), pol(2), pol(3), pol(4)],
      bialy: zabarw(zywy[1], 'rgb(255,246,230)'), zloty: zabarw(zywy[1], 'rgb(255,196,104)'),
    };
  }
  return wynik;
}

/** Obrazki kukły wczytane (do tej pory boss rysuje się po staremu). */
export function kuklaGotowa(): boolean {
  if (czesci) return true;
  if (!obrazy || !obrazy.zywy.ok || !obrazy.kamien.ok || !obrazy.zar.ok) return false;
  czesci = zbuduj();
  return true;
}

// ---------- wygląd ----------

/** Część odpada (konanie): przesunięcie, obrót i skala wokół jej środka, krycie. */
export interface Odpad { dx: number; dy: number; r: number; s: number; a: number }

export interface WygladKukly {
  /** zegar ekranu (ms) — migotanie ognia */
  czas: number;
  /** żyły żaru (0…1, więcej — jaśniej) */
  zar: number;
  /** pęknięcia ran: ile ich widać (0…1 — cztery stopnie) i jak jasno się żarzą */
  rysy: number; zarRys: number;
  /** barwa świecenia: 0 — ogień, 1 — złote światło */
  zloto: number;
  /** złota poświata całej postaci, biały błysk (trafienie) */
  zlotyBlask: number; blysk: number;
  /** oczy (0…2), ogień aureoli (0…2), żar w ustach, żar w dłoniach (rozkaz) */
  oczy: number; plomien: number; usta: number; dlonie: number;
  /** krycie całości (przenikanie skały) */
  alfa: number;
  /** 0 — żywy, 1 — kamień (osobno dla części: wstawanie z gruzu, konanie) */
  kamien?: (n: CzescDemona) => number;
  odpad?: (n: CzescDemona) => Odpad | null;
  /** kajdany na nadgarstkach i kostkach (zerwane łańcuchy) */
  kajdany: boolean;
  lancuchy?: StanLancuchow;
}

export function wygladZywy(czas: number): WygladKukly {
  return {
    czas, zar: 0.7, rysy: 0, zarRys: 1, zloto: 0, zlotyBlask: 0, blysk: 0, oczy: 1, plomien: 1, usta: 0.5, dlonie: 0,
    alfa: 1, kajdany: true,
  };
}

// ---------- łańcuchy ----------

interface Lancuch { p: P[]; q: P[] }
export interface StanLancuchow { l: Lancuch[]; czas: number }
export const nowyStanLancuchow = (): StanLancuchow => ({ l: [], czas: -1 });
const domyslneLancuchy = nowyStanLancuchow();
const OGNIWO = 15;

function krokLancuchow(st: StanLancuchow, kotwice: P[], ile: number[], czas: number): void {
  const dt = st.czas < 0 ? 1 / 60 : Math.max(1 / 240, Math.min(1 / 20, (czas - st.czas) / 1000));
  const nowy = st.czas < 0;
  st.czas = czas;
  for (let i = 0; i < kotwice.length; i++) {
    const k = kotwice[i];
    let l = st.l[i];
    if (!l || l.p.length !== ile[i] || nowy || odl(l.p[0], k) > 200) {
      l = st.l[i] = { p: [], q: [] };
      for (let j = 0; j < ile[i]; j++) { l.p.push([k[0] + j * 1.5, k[1] + j * OGNIWO]); l.q.push([k[0] + j * 1.5, k[1] + j * OGNIWO]); }
    }
    const g = 2600 * dt * dt;
    for (let j = 1; j < l.p.length; j++) {
      const p = l.p[j], q = l.q[j];
      const vx = (p[0] - q[0]) * 0.985, vy = (p[1] - q[1]) * 0.985;
      q[0] = p[0]; q[1] = p[1];
      p[0] += vx; p[1] += vy + g;
    }
    l.p[0][0] = k[0]; l.p[0][1] = k[1];
    for (let it = 0; it < 4; it++) {
      for (let j = 1; j < l.p.length; j++) {
        const a = l.p[j - 1], b = l.p[j];
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, f = (d - OGNIWO) / d;
        if (j === 1) { b[0] -= dx * f; b[1] -= dy * f; }
        else { a[0] += dx * f * 0.5; a[1] += dy * f * 0.5; b[0] -= dx * f * 0.5; b[1] -= dy * f * 0.5; }
        if (b[1] > RYS.ziemia - 3) b[1] = RYS.ziemia - 3;
      }
    }
  }
}

function rysujLancuch(ctx: CanvasRenderingContext2D, l: Lancuch, zar: number): void {
  ctx.lineCap = 'round';
  for (let j = 1; j < l.p.length; j++) {
    const a = l.p[j - 1], b = l.p[j];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ang = kier(a, b);
    ctx.save();
    ctx.translate(mx, my); ctx.rotate(ang);
    ctx.beginPath();
    if (j % 2) ctx.ellipse(0, 0, OGNIWO * 0.62, OGNIWO * 0.36, 0, 0, Math.PI * 2);
    else ctx.ellipse(0, 0, OGNIWO * 0.62, OGNIWO * 0.13, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgb(16,12,10)'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = 'rgb(78,68,60)'; ctx.lineWidth = 3.5; ctx.stroke();
    if (zar > 0.05) { ctx.strokeStyle = `rgba(255,120,50,${0.35 * zar})`; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
  }
  // ostatnie ogniwo — rozerwane
  const e = l.p[l.p.length - 1], f = l.p[l.p.length - 2];
  const ang = kier(f, e);
  ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(ang);
  ctx.beginPath(); ctx.arc(OGNIWO * 0.5, 0, OGNIWO * 0.32, -2.2, 2.2);
  ctx.strokeStyle = 'rgb(16,12,10)'; ctx.lineWidth = 6; ctx.stroke();
  ctx.strokeStyle = 'rgb(92,80,70)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

/** Kajdan: obręcz w poprzek kończyny (`a` → `b`), tuż przed `b`. */
function kajdan(ctx: CanvasRenderingContext2D, m: M, a: P, b: P, szer: number, cofniety: number, zar: number): P {
  ctx.save();
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  const ang = kier(a, b);
  ctx.translate(b[0], b[1]); ctx.rotate(ang); ctx.translate(-cofniety, 0);
  const g = ctx.createLinearGradient(-11, 0, 11, 0);
  g.addColorStop(0, 'rgb(36,31,28)'); g.addColorStop(0.35, 'rgb(104,93,82)'); g.addColorStop(0.6, 'rgb(62,55,49)'); g.addColorStop(1, 'rgb(24,20,18)');
  ctx.fillStyle = g; ctx.strokeStyle = 'rgb(12,9,7)'; ctx.lineWidth = 4;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(-11, -szer / 2, 22, szer, 7); else ctx.rect(-11, -szer / 2, 22, szer);
  ctx.fill(); ctx.stroke();
  // brzegi obręczy po bokach kończyny — zaokrąglone, jak opasujące ją żelazo
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-11, -szer / 2 + 2, 22, 5); ctx.fillRect(-11, szer / 2 - 7, 22, 5);
  // nity
  ctx.fillStyle = 'rgb(130,116,100)';
  for (const t of [-0.3, 0.3]) { ctx.beginPath(); ctx.arc(0, szer * t, 2.6, 0, Math.PI * 2); ctx.fill(); }
  if (zar > 0.05) { ctx.strokeStyle = `rgba(255,110,40,${0.4 * zar})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, -szer / 2 + 3); ctx.lineTo(-8, szer / 2 - 3); ctx.stroke(); }
  ctx.restore();
  // środek obręczy w układzie świata kukły — stąd zwisa łańcuch
  const [x, y] = naPunkt(m, b[0] - Math.cos(ang) * cofniety, b[1] - Math.sin(ang) * cofniety);
  return [x, y + 6];
}

// ---------- ogień, oczy, usta ----------

let plomyk: HTMLCanvasElement | null = null;
function plomykObraz(): HTMLCanvasElement {
  if (plomyk) return plomyk;
  const c = plotno(64, 128), g = c.getContext('2d')!;
  g.beginPath();
  g.moveTo(32, 2);
  g.bezierCurveTo(40, 34, 60, 62, 58, 92); g.bezierCurveTo(56, 120, 8, 120, 6, 92); g.bezierCurveTo(4, 62, 24, 34, 32, 2);
  g.closePath();
  const gr = g.createLinearGradient(0, 124, 0, 2);
  gr.addColorStop(0, 'rgba(255,246,210,1)'); gr.addColorStop(0.22, 'rgba(255,200,90,0.95)');
  gr.addColorStop(0.55, 'rgba(255,104,26,0.7)'); gr.addColorStop(1, 'rgba(190,30,8,0)');
  g.fillStyle = gr; g.fill();
  return (plomyk = c);
}
/** Gładki szum 1D (0…1). */
export function szum(x: number): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return hasz(i) * (1 - u) + hasz(i + 1) * u;
}
export function hasz(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function lunaAureoli(ctx: CanvasRenderingContext2D, m: M, w: WygladKukly): void {
  const moc = w.plomien * (1 - 0.5 * w.zloto);
  if (moc <= 0.01) return;
  ctx.save();
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.globalCompositeOperation = 'lighter';
  const migot = 0.85 + 0.15 * szum(w.czas * 0.004);
  const g = ctx.createRadialGradient(314, 170, 20, 314, 170, 360);
  g.addColorStop(0, `rgba(255,120,40,${0.2 * moc * migot})`); g.addColorStop(0.45, `rgba(220,60,18,${0.1 * moc * migot})`);
  g.addColorStop(1, 'rgba(150,25,8,0)');
  ctx.fillStyle = g; ctx.fillRect(-50, -190, 730, 720);
  ctx.restore();
}

function plomienie(ctx: CanvasRenderingContext2D, w: WygladKukly, alfa: number): void {
  const moc = w.plomien * alfa;
  if (moc <= 0.02) return;
  const img = plomykObraz(), t = w.czas * 0.001, a0 = ctx.globalAlpha;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < PLOMIENIE_AUREOLI.length; i++) {
    const [x, y, nx, ny] = PLOMIENIE_AUREOLI[i];
    const n1 = szum(i * 7.13 + t * 2.6), n2 = szum(i * 3.31 + t * 4.1 + 10);
    const L = (30 + 44 * n1) * Math.min(2.2, moc) * (0.8 + 0.4 * n2);
    let dx = nx * 0.55, dy = ny * 0.55 - 0.8;
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const ang = Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(t * 5.3 + i * 1.7) * 0.22;
    const sz = (16 + 10 * n2) * Math.min(1.6, 0.6 + moc * 0.5);
    ctx.globalAlpha = a0 * Math.min(1, 0.55 + 0.45 * moc) * (0.75 + 0.25 * n1);
    ctx.save();
    ctx.translate(x - nx * 4, y - ny * 4); ctx.rotate(ang);
    ctx.drawImage(img, -sz / 2, -L, sz, L * 1.08);
    ctx.restore();
  }
  ctx.restore();
}

function oczy(ctx: CanvasRenderingContext2D, w: WygladKukly, alfa: number): void {
  const o = w.oczy * alfa;
  if (o <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const zl = w.zloto > 0.5;
  for (const [ox, oy] of OCZY_DEMONA) {
    const R = 14 + 12 * Math.min(2, o);
    const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
    g.addColorStop(0, `rgba(255,252,230,${Math.min(1, o)})`);
    g.addColorStop(0.2, zl ? `rgba(255,214,130,${Math.min(1, 0.85 * o)})` : `rgba(255,128,44,${Math.min(1, 0.85 * o)})`);
    g.addColorStop(1, zl ? 'rgba(255,190,90,0)' : 'rgba(255,40,10,0)');
    ctx.fillStyle = g; ctx.fillRect(ox - R, oy - R, R * 2, R * 2);
    if (o > 1.05) {
      // smuga światła z oka (wściekłość, ryk)
      const L = 70 * Math.min(1.5, o - 1);
      const s = ctx.createLinearGradient(ox - L, oy, ox + L, oy);
      s.addColorStop(0, 'rgba(255,90,30,0)'); s.addColorStop(0.5, `rgba(255,200,140,${0.55 * Math.min(1, o - 1)})`); s.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = s; ctx.fillRect(ox - L, oy - 2.5, L * 2, 5);
    }
  }
  ctx.restore();
}

function usta(ctx: CanvasRenderingContext2D, szczeka: number, w: WygladKukly, alfa: number): void {
  if (szczeka < 0.02) return;
  ctx.save();
  ctx.beginPath();
  USTA_DEMONA.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.globalAlpha *= alfa;
  ctx.fillStyle = 'rgb(30,5,3)'; ctx.fill();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const u = Math.min(1, szczeka * 1.4) * (0.35 + w.usta);
  const g = ctx.createRadialGradient(350, 200, 0, 350, 200, 62);
  const zl = w.zloto > 0.5;
  g.addColorStop(0, zl ? `rgba(255,236,170,${Math.min(1, 0.9 * u)})` : `rgba(255,206,100,${Math.min(1, 0.9 * u)})`);
  g.addColorStop(0.45, zl ? `rgba(255,190,90,${0.6 * u})` : `rgba(255,90,28,${Math.min(1, 0.65 * u)})`);
  g.addColorStop(1, 'rgba(140,20,6,0)');
  ctx.fillStyle = g; ctx.fillRect(286, 140, 128, 120);
  ctx.restore();
}

/** Żar w dłoni (rozkaz dla dłoni z otchłani): krąg i znaki wokół wnętrza dłoni. */
function zarDloni(ctx: CanvasRenderingContext2D, srodek: P, moc: number, czas: number): void {
  if (moc <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const [x, y] = srodek;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 70);
  g.addColorStop(0, `rgba(255,140,60,${0.55 * moc})`); g.addColorStop(0.5, `rgba(220,40,20,${0.25 * moc})`); g.addColorStop(1, 'rgba(150,10,5,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140);
  ctx.strokeStyle = `rgba(255,90,40,${0.7 * moc})`; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.stroke();
  const t = czas * 0.002;
  for (let i = 0; i < 6; i++) {
    const a = t + (i / 6) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 32, y + Math.sin(a) * 32); ctx.lineTo(x + Math.cos(a + 0.35) * 48, y + Math.sin(a + 0.35) * 48); ctx.stroke();
  }
  ctx.restore();
}

// ---------- rysowanie ----------

function rysujCzesc(ctx: CanvasRenderingContext2D, c: Czesc, poz: number, w: WygladKukly, kam: number, alfa: number): void {
  const a0 = ctx.globalAlpha;
  if (kam < 0.999) { ctx.globalAlpha = a0 * alfa; ctx.drawImage(c.zywy[poz], c.x, c.y, c.w, c.h); }
  if (kam > 0.001) { ctx.globalAlpha = a0 * alfa * Math.min(1, kam); ctx.drawImage(c.kamien[poz], c.x, c.y, c.w, c.h); }
  ctx.globalCompositeOperation = 'lighter';
  const swiec = (para: Para, moc: number): void => {
    for (let m = moc; m > 0.01; m -= 1) {
      const a = Math.min(1, m) * alfa;
      if (w.zloto < 0.99) { ctx.globalAlpha = a0 * a * (1 - w.zloto); ctx.drawImage(para[0], c.x, c.y, c.w, c.h); }
      if (w.zloto > 0.01) { ctx.globalAlpha = a0 * a * w.zloto; ctx.drawImage(para[1], c.x, c.y, c.w, c.h); }
    }
  };
  if (c.zyly) swiec(c.zyly, w.zar * (1 - kam * 0.9));
  const r = w.rysy * 4;
  for (let st = 0; st < 4 && r - st > 0; st++) {
    const L = c.rysy[st];
    if (L) swiec(L, Math.min(1, Math.min(1, r - st) * w.zarRys));
  }
  if (w.blysk > 0.01) { ctx.globalAlpha = a0 * Math.min(1, w.blysk) * alfa; ctx.drawImage(c.bialy, c.x, c.y, c.w, c.h); }
  if (w.zlotyBlask > 0.01) { ctx.globalAlpha = a0 * Math.min(1, w.zlotyBlask) * alfa; ctx.drawImage(c.zloty, c.x, c.y, c.w, c.h); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a0;
}

function odpadnij(m: M, n: CzescDemona, o: Odpad): M {
  const c = CZ[n];
  const [cx, cy] = naPunkt(m, c.x + c.w / 2, c.y + c.h / 2);
  return mnoz(lok(cx, cy, o.dx, o.dy, o.r, o.s, o.s), m);
}

export interface KosciKukly {
  /** macierze części (piksele rysunku) */
  m: Record<CzescDemona, M>;
  /** piksele ekranu (wokół stóp) na piksel rysunku */
  s: number;
  /** punkt części (piksele rysunku w spoczynku) → miejsce wokół stóp (piksele ekranu, przed odwróceniem zwrotu) */
  gdzie: (n: CzescDemona, p: P) => P;
}

/** Rysuje kukłę stopami w (0, 0). Zwraca kości (do zaczepiania efektów) albo null, póki obrazki się nie wczytały. */
export function rysujKukle(ctx: CanvasRenderingContext2D, h: number, p: PozaKukly, w: WygladKukly): KosciKukly | null {
  if (!kuklaGotowa()) return null;
  const C = czesci!;
  const s = skalaKukly(h);
  const sk = zloz(p);
  const T = ctx.getTransform();
  const efekt = Math.hypot(T.a, T.b) * s;
  const poz = efekt < 0.27 ? 2 : efekt < 0.55 ? 1 : 0;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-RYS.srodek, -RYS.ziemia);
  ctx.globalAlpha *= w.alfa;
  lunaAureoli(ctx, sk.m.aureola, w);
  for (const n of KOLEJNOSC_CZESCI) {
    let m = sk.m[n], alfa = 1;
    const od = w.odpad?.(n);
    if (od) { if (od.a <= 0.01) continue; m = odpadnij(m, n, od); alfa = od.a; }
    ctx.save();
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    rysujCzesc(ctx, C[n], poz, w, w.kamien?.(n) ?? 0, alfa);
    if (n === 'aureola') plomienie(ctx, w, alfa * (1 - (w.kamien?.(n) ?? 0)));
    if (n === 'glowa') { usta(ctx, p.szczeka, w, alfa); oczy(ctx, w, alfa); }
    if (n === 'dlonL' && w.dlonie > 0.02) zarDloni(ctx, PUNKTY_KUKLY.dlonL, w.dlonie * alfa, w.czas);
    if (n === 'dlonP' && w.dlonie > 0.02) zarDloni(ctx, PUNKTY_KUKLY.dlonP, w.dlonie * alfa, w.czas);
    ctx.restore();
  }
  if (w.kajdany) {
    const zar = w.zar * 0.6;
    const k: P[] = [];
    const ok = (n: CzescDemona): boolean => { const o = w.odpad?.(n); return !o || o.a > 0.5; };
    if (ok('przedramieL')) k.push(kajdan(ctx, sk.m.przedramieL, RAMIONA.L.j, RAMIONA.L.t, 70, 12, zar));
    if (ok('przedramieP')) k.push(kajdan(ctx, sk.m.przedramieP, RAMIONA.P.j, RAMIONA.P.t, 70, 12, zar));
    // na kostkach w układzie stopy (stoi płasko — obręcz nie sterczy przy ugiętym kolanie)
    if (ok('stopaL')) kajdan(ctx, sk.m.stopaL, [174, 700], [174, 862], 74, 2, zar);
    if (ok('stopaP')) kajdan(ctx, sk.m.stopaP, [454, 700], [454, 862], 86, 2, zar);
    if (k.length === 2) {
      const st = w.lancuchy ?? domyslneLancuchy;
      krokLancuchow(st, k, [6, 5], w.czas);
      for (const l of st.l) rysujLancuch(ctx, l, zar);
    }
  }
  ctx.restore();
  return {
    m: sk.m, s,
    gdzie: (n, q) => { const [x, y] = naPunkt(sk.m[n], q[0], q[1]); return [(x - RYS.srodek) * s, (y - RYS.ziemia) * s]; },
  };
}
