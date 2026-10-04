import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import type { Rola } from '../sim/lud';
import type { Czynnosc } from './figury';

/**
 * Remake v1: postacie ludu — robotnik, pobożny, rycerz — rysowane od nowa.
 *
 * Ciało to szkielet (biodro, tułów, głowa, dwie nogi, dwie ręce) liczony w każdej klatce:
 * nogi z cyklu kroku (stopa, która stoi, sama trzyma ziemię — biodro dostosowuje się do nóg,
 * więc postać naturalnie się kołysze), ręce z cyklu albo dochodzą do celu (oba ręce na kilofie,
 * złożone dłonie w modlitwie, księga). Bryły mają światło od góry i przodu, dalsze kończyny są
 * ciemniejsze, a całość obwiedziona jest jasną obwódką roli i ciemną kreską — sylwetka czyta się
 * na ciemnej skale nawet z daleka. Peleryna, pióropusz, kaptur i rąbek szaty mają bezwładność:
 * zostają z tyłu, gdy postać rusza, i dociągają, gdy staje.
 *
 * Układ: (0, 0) = środek stóp, twarz w prawo (+x), góra to −y; skala — wysokość postaci `h`.
 */

// ------------------------------------------------------------------ barwy

type Rgb = readonly [number, number, number];

/** k > 0 rozjaśnia ku ciepłej bieli, k < 0 przyciemnia. */
function ton(c: Rgb, k = 0, a = 1): string {
  let r = c[0], g = c[1], b = c[2];
  if (k > 0) { r += (255 - r) * k; g += (246 - g) * k; b += (226 - b) * k; } else if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return a < 1 ? `rgba(${r | 0},${g | 0},${b | 0},${a})` : `rgb(${r | 0},${g | 0},${b | 0})`;
}

interface Stroj {
  skora: Rgb; obwodka: string;
  // robotnik
  koszula: Rgb; kamizelka: Rgb; spodnie: Rgb; buty: Rgb; czapka: Rgb;
  // pobożny
  szata: Rgb; lamowka: Rgb;
  // rycerz
  stal: Rgb; tunika: Rgb; plaszcz: Rgb; pioro: Rgb; oko: string;
}

const OBWODKA = { pobozny: 'rgba(250,232,180,0.95)', robotnik: 'rgba(228,176,108,0.95)', rycerz: 'rgba(176,198,232,0.97)', buntownik: 'rgba(232,70,56,0.98)' } as const;

function stroj(rola: Rola, c: Creature): Stroj {
  const z = (c.id * 2654435761) >>> 0;
  const wariant = (n: number) => ((z >>> (n * 3)) & 7) / 7;
  const skory: Rgb[] = [[214, 162, 120], [196, 140, 100], [226, 180, 140], [170, 118, 84]];
  const koszule: Rgb[] = [[206, 150, 76], [188, 138, 84], [200, 116, 64], [164, 150, 98]];
  const bunt = !!c.buntownik;
  return {
    skora: skory[z % skory.length],
    obwodka: bunt ? OBWODKA.buntownik : OBWODKA[rola],
    koszula: koszule[(z >>> 4) % koszule.length], kamizelka: [112 + wariant(1) * 24, 74, 44], spodnie: [120, 98, 74], buty: [58, 42, 32], czapka: [132, 94, 56],
    szata: [222, 212, 190], lamowka: [216, 172, 82],
    stal: [152, 166, 188],
    tunika: bunt ? [112, 22, 26] : [44, 80, 142],
    plaszcz: bunt ? [32, 22, 24] : [130, 32, 36],
    pioro: bunt ? [26, 20, 22] : [198, 42, 40],
    oko: bunt ? 'rgba(255,70,50,0.95)' : 'rgba(150,200,255,0.55)',
  };
}

// ------------------------------------------------------------------ pamięć ruchu wtórnego

interface Wtorny {
  t: number; x: number; y: number;
  /** wygładzona prędkość w kaflach/s (vx w stronę twarzy) */
  vx: number; vy: number;
  /** sprężyny: peleryna, pióropusz, kaptur/szata — kąt i prędkość kątowa */
  pa: number; pv: number; pia: number; piv: number; sa: number; sv: number;
  /** ślad broni: ostatni kąt ramienia */
  slad: number;
  /** poprzednia poza — nowa dochodzi do niej płynnie, zamiast przeskoczyć */
  poza?: Poza;
  pozaT?: number;
}
const wtorne = new WeakMap<Creature, Wtorny>();

function sprezyna(a: number, v: number, cel: number, dt: number, k: number, tl: number): [number, number] {
  // półjawny Euler w kilku krokach — stabilny przy nierównych klatkach
  const n = Math.max(1, Math.ceil(dt / 0.016));
  const h = dt / n;
  for (let i = 0; i < n; i++) { v += (k * (cel - a) - tl * v) * h; a += v * h; }
  return [a, v];
}

function ruchWtorny(c: Creature, czas: number, kier: number): Wtorny {
  let m = wtorne.get(c);
  if (!m) {
    m = { t: czas, x: c.x, y: c.y, vx: 0, vy: 0, pa: -0.25, pv: 0, pia: -0.3, piv: 0, sa: 0, sv: 0, slad: 0 };
    wtorne.set(c, m);
    return m;
  }
  const dt = Math.max(0.001, Math.min(0.25, (czas - m.t) / 1000));
  if (czas === m.t) return m;
  const dx = c.x - m.x, dy = c.y - m.y;
  if (Math.hypot(dx, dy) > 4) { m.x = c.x; m.y = c.y; m.t = czas; return m; }
  const vx = (dx / dt) * kier, vy = dy / dt;
  const w = Math.min(1, dt * 6);
  m.vx += (vx - m.vx) * w; m.vy += (vy - m.vy) * w;
  const pred = Math.min(1, Math.abs(m.vx) / 3.2);
  // peleryna: zostaje z tyłu w biegu, unosi się przy spadaniu
  const celP = -0.18 - pred * 0.95 * Math.sign(m.vx || 1) * (m.vx >= 0 ? 1 : -0.4) - Math.max(0, Math.min(1, m.vy / 6)) * 1.4;
  [m.pa, m.pv] = sprezyna(m.pa, m.pv, celP, dt, 38, 6.5);
  [m.pia, m.piv] = sprezyna(m.pia, m.piv, -0.3 - pred * 0.7 - Math.max(0, Math.min(1, m.vy / 6)) * 0.9, dt, 70, 7);
  [m.sa, m.sv] = sprezyna(m.sa, m.sv, -pred * 0.5 * Math.sign(m.vx || 1), dt, 45, 7);
  m.x = c.x; m.y = c.y; m.t = czas;
  return m;
}

// ------------------------------------------------------------------ poza

/** Kąty kończyn od pionu w dół: + = do przodu. Kolano zgina goleń do tyłu, łokieć przedramię do przodu. */
interface Poza {
  tulow: number; glowa: number;
  uA: number; kA: number; uB: number; kB: number;
  rA: number; eA: number; rB: number; eB: number;
  /** wisi w powietrzu (wspina się, spada) — biodro na stałej wysokości */
  zawis?: number;
  /** dodatkowe uniesienie (faza lotu w biegu) */
  lot?: number;
  /** narzędzie w bliższej ręce: kąt względem przedramienia */
  narz?: number;
  /** kąt narzędzia od pionu w dół, bezwzględny (laska stoi pionowo, miecz w spoczynku ostrzem w dół) */
  bron?: number;
  /** obie ręce na narzędziu */
  oburacz?: boolean;
  /** dalsza ręka sięga do punktu (IK) zamiast kątów — względem barku, w jednostkach h */
  celB?: [number, number];
  celA?: [number, number];
  uderzenie?: number;
  ciecie?: number;
  lezy?: boolean;
  oddech: number;
  /** oczy: 1 otwarte, 0 zamknięte */
  oczy: number;
}

const TAU = Math.PI * 2;
const sin = Math.sin, cos = Math.cos;
const gladko = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mrugniecie(czas: number, id: number): number {
  const k = (czas + id * 977) % 3900;
  return k < 120 ? Math.abs(k - 60) / 60 : 1;
}

/** Cykl uderzenia: zamach (powoli) → cios (szybko) → odrzut → powrót. Zwraca [kąt ramion 0..1 od zamachu do ciosu, siła uderzenia]. */
function cyklCiosu(k: number): [number, number] {
  if (k < 0.55) return [1 - gladko(k / 0.55), 0];                 // 1 = w górze za głową
  if (k < 0.66) { const t = (k - 0.55) / 0.11; return [1 - t * t, 0]; }   // przyspiesza w dół
  if (k < 0.8) { const t = (k - 0.66) / 0.14; return [0, 1 - t]; } // trafienie, drgnięcie
  return [gladko((k - 0.8) / 0.2) * 0.25, 0];
}

function poza(cz: Czynnosc, rola: Rola, czas: number, faza: number, fazaPion: number, zegar: number, c: Creature): Poza {
  const id = c.id;
  const oddech = sin(czas * 0.0021 + id) * 0.5 + 0.5;
  const oczy = mrugniecie(czas, id);
  const p: Poza = { tulow: 0.04, glowa: 0, uA: 0.06, kA: 0.06, uB: -0.07, kB: 0.05, rA: 0.1, eA: 0.2, rB: -0.06, eB: 0.18, oddech, oczy };
  const niesie = c.carry > 0;
  switch (cz) {
    case 'stoi': {
      const przest = sin(czas * 0.0007 + id * 1.3);
      p.tulow = 0.03 + przest * 0.025;
      p.glowa = 0.1 * sin(czas * 0.00045 + id * 1.7) * sin(czas * 0.00011 + id);
      p.uA = 0.08 + przest * 0.03; p.uB = -0.09 + przest * 0.03;
      p.rA = 0.08 + oddech * 0.04; p.rB = -0.05 - oddech * 0.03;
      if (rola === 'rycerz') { p.rA = 0.25; p.eA = 0.5; p.bron = 0.55; p.rB = 0.5; p.eB = 0.9; p.uA = 0.16; p.uB = -0.14; }
      if (rola === 'pobozny') { p.rA = 0.32; p.eA = 0.75; p.bron = 0.06 + przest * 0.03; }
      if (rola === 'robotnik') {
        // co jakiś czas ociera pot z czoła
        const k = (czas * 0.00011 + id * 0.43) % 1;
        if (k > 0.9) { const t = Math.sin(((k - 0.9) / 0.1) * Math.PI); p.rA = lerp(p.rA, 1.9, t); p.eA = lerp(p.eA, 1.25, t); p.glowa = lerp(p.glowa, -0.15, t); }
      }
      break;
    }
    case 'idzie': {
      const q = faza * TAU;
      p.uA = 0.42 * sin(q); p.kA = 0.08 + 0.85 * Math.max(0, cos(q)) ** 1.4;
      p.uB = 0.42 * sin(q + Math.PI); p.kB = 0.08 + 0.85 * Math.max(0, cos(q + Math.PI)) ** 1.4;
      p.rA = -0.38 * sin(q); p.eA = 0.25 + 0.35 * Math.max(0, -sin(q));
      p.rB = 0.38 * sin(q); p.eB = 0.25 + 0.35 * Math.max(0, sin(q));
      p.tulow = 0.07; p.glowa = -0.04 + 0.03 * sin(q * 2);
      if (rola === 'rycerz') { p.rA = 0.2 - 0.25 * sin(q); p.eA = 0.55; p.bron = 0.65 - 0.2 * sin(q); p.rB = 0.5; p.eB = 1.0; }
      if (rola === 'pobozny') { p.rA = 0.4 + 0.22 * sin(q); p.eA = 0.6; p.bron = 0.12 + 0.22 * sin(q); }
      break;
    }
    case 'biegnie': {
      const q = faza * TAU;
      p.uA = 0.78 * sin(q); p.kA = 0.25 + 1.45 * Math.max(0, cos(q)) ** 1.2;
      p.uB = 0.78 * sin(q + Math.PI); p.kB = 0.25 + 1.45 * Math.max(0, cos(q + Math.PI)) ** 1.2;
      p.rA = -0.85 * sin(q); p.eA = 1.5;
      p.rB = 0.85 * sin(q); p.eB = 1.5;
      p.tulow = 0.3; p.glowa = -0.18;
      p.lot = 0.035 * Math.max(0, sin(q * 2));
      if (rola === 'rycerz') { p.bron = 1.9; p.rB = 0.7; p.eB = 1.1; }
      if (rola === 'pobozny') { p.bron = 0.5; }
      break;
    }
    case 'kopie': case 'buduje': {
      const tempo = cz === 'buduje' ? 1.6 : 1.1;
      const k = (zegar * tempo + id * 0.13) % 1;
      const [g, u] = cyklCiosu(k);
      const kat = lerp(1.25, -2.55, g);                 // od dołu przed sobą do góry za głową
      p.rA = kat; p.eA = lerp(0.15, 1.1, g);
      p.oburacz = true; p.narz = 1.35;
      p.tulow = lerp(0.42, -0.12, g) + u * 0.05;
      p.glowa = lerp(0.25, -0.15, g);
      p.uA = 0.42; p.kA = 0.35 + u * 0.2; p.uB = -0.3; p.kB = 0.2 + u * 0.15;
      p.uderzenie = u;
      if (cz === 'buduje') { p.uA = 1.25; p.kA = 1.5; p.uB = 0.1; p.kB = 1.6; }
      break;
    }
    case 'modli': {
      // klęczy: bliższa noga przed sobą (stopa na ziemi), dalsza kolanem w ziemi
      p.uA = 1.35; p.kA = 1.45; p.uB = 0.12; p.kB = 1.62;
      const cykl = (czas * 0.00016 + id * 0.37) % 1;
      const wznosi = cykl > 0.78 ? gladko(Math.min(1, (cykl - 0.78) / 0.06)) * gladko(Math.min(1, (1 - cykl) / 0.06)) : 0;
      p.tulow = lerp(0.12, -0.08, wznosi) + oddech * 0.02;
      p.glowa = lerp(0.42, -0.35, wznosi) + oddech * 0.03;
      p.rA = lerp(0.7, 2.6, wznosi); p.eA = lerp(1.75, 0.25, wznosi);
      p.rB = lerp(0.62, 2.45, wznosi); p.eB = lerp(1.8, 0.3, wznosi);
      if (!wznosi) { p.celA = [0.19, -0.075]; p.celB = [0.18, -0.07]; }
      break;
    }
    case 'walczy': {
      const tempo = rola === 'rycerz' ? 1.25 : 1.5;
      const k = (zegar * tempo + id * 0.31) % 1;
      const [g, u] = cyklCiosu(k);
      p.uA = 0.5; p.kA = 0.35; p.uB = -0.4; p.kB = 0.2;
      p.tulow = lerp(0.38, 0.0, g);
      p.glowa = lerp(0.1, -0.1, g);
      p.uderzenie = u;
      if (rola === 'rycerz') {
        p.rA = lerp(1.35, -2.4, g); p.eA = lerp(0.15, 1.4, g); p.narz = lerp(0.2, 1.2, g);
        p.rB = 0.9; p.eB = 0.85;
        p.ciecie = g < 0.98 && k > 0.5 && k < 0.72 ? 1 : 0;
      } else if (rola === 'robotnik') {
        p.rA = lerp(1.25, -2.4, g); p.eA = lerp(0.2, 1.1, g); p.oburacz = true; p.narz = 1.35;
      } else {
        // pobożny: pchnięcie laską
        const t = sin(k * TAU);
        p.rA = 0.9 + t * 0.35; p.eA = 0.4 - t * 0.3; p.bron = 1.25 + t * 0.15;
        p.rB = 0.8 + t * 0.3; p.eB = 0.5; p.tulow = 0.15 + t * 0.12;
      }
      break;
    }
    case 'wspina': {
      const q = fazaPion * TAU;
      p.zawis = 0.47;
      p.rA = 2.75 + 0.35 * sin(q); p.eA = 0.35 - 0.3 * sin(q);
      p.rB = 2.75 + 0.35 * sin(q + Math.PI); p.eB = 0.35 - 0.3 * sin(q + Math.PI);
      p.uA = 0.7 + 0.45 * sin(q + Math.PI); p.kA = 1.3;
      p.uB = 0.7 + 0.45 * sin(q); p.kB = 1.3;
      p.tulow = 0.1; p.glowa = -0.35;
      break;
    }
    case 'spada': {
      const t = czas * 0.028 + id;
      p.zawis = 0.5;
      p.rA = 2.3 + 0.55 * sin(t); p.eA = 0.6 + 0.4 * sin(t * 1.3);
      p.rB = 2.0 + 0.55 * sin(t + 2); p.eB = 0.7;
      p.uA = 0.55 + 0.15 * sin(t * 0.9); p.kA = 1.0; p.uB = -0.15; p.kB = 0.9;
      p.tulow = -0.1; p.glowa = -0.3;
      p.oczy = 1;
      break;
    }
    case 'je': {
      p.uA = 1.45; p.kA = 2.3; p.uB = 1.2; p.kB = 2.2;
      const gryz = (czas * 0.0012 + id * 0.21) % 1;
      const doUst = gryz < 0.35 ? gladko(gryz / 0.35) : gryz < 0.6 ? 1 : 1 - gladko((gryz - 0.6) / 0.4);
      p.rA = lerp(0.6, 0.15, doUst); p.eA = lerp(1.2, 2.55, doUst);
      p.rB = 0.75; p.eB = 1.1;
      p.tulow = 0.25; p.glowa = lerp(0.12, -0.05, doUst) + (doUst > 0.95 ? 0.04 * sin(czas * 0.03) : 0);
      break;
    }
    case 'czyta': {
      p.rA = 1.0; p.eA = 1.0; p.rB = 0.95; p.eB = 1.05;
      p.celA = [0.2, 0.01]; p.celB = [0.18, 0.02];
      p.tulow = -0.04 + oddech * 0.02; p.glowa = 0.12;
      p.uA = 0.18; p.uB = -0.16;
      break;
    }
    case 'spi': {
      p.lezy = true; p.oczy = 0;
      p.uA = 0.25; p.kA = 0.5; p.uB = 0.1; p.kB = 0.4;
      p.rA = 0.6; p.eA = 1.2; p.rB = 0.3; p.eB = 1.0; p.glowa = 0.1;
      break;
    }
    default: break;
  }
  // tragarz: worek na plecach, bliższa ręka trzyma rzemień przy barku
  if (niesie && (cz === 'stoi' || cz === 'idzie' || cz === 'biegnie')) { p.rA = -0.25; p.eA = 2.2; p.narz = undefined; }
  return p;
}

// ------------------------------------------------------------------ szkielet

interface Pkt { x: number; y: number }

interface Szkielet {
  biodro: Pkt; bark: Pkt; szyja: Pkt; glowa: Pkt; rg: number;
  kolA: Pkt; stopaA: Pkt; kolB: Pkt; stopaB: Pkt;
  lokA: Pkt; dlonA: Pkt; lokB: Pkt; dlonB: Pkt;
  /** kierunek przedramienia (do narzędzia) */
  przedA: number; przedB: number;
}

const D = {
  tulow: 0.3, szyja: 0.045, glowa: 0.088,
  udo: 0.235, golen: 0.225, stopa: 0.032,
  ramie: 0.165, przed: 0.15,
};

const kier = (a: number): Pkt => ({ x: sin(a), y: cos(a) });

function ik(s: Pkt, cel: Pkt, l1: number, l2: number, zgiecie: number): [Pkt, Pkt] {
  let dx = cel.x - s.x, dy = cel.y - s.y;
  let d = Math.hypot(dx, dy);
  const maks = (l1 + l2) * 0.999;
  if (d > maks) { dx *= maks / d; dy *= maks / d; d = maks; }
  if (d < 1e-6) d = 1e-6;
  const a = Math.atan2(dy, dx);
  const cosB = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const b = Math.acos(Math.max(-1, Math.min(1, cosB))) * zgiecie;
  const lok = { x: s.x + cos(a + b) * l1, y: s.y + sin(a + b) * l1 };
  return [lok, { x: s.x + dx, y: s.y + dy }];
}

function szkielet(p: Poza, h: number): Szkielet {
  // nogi od biodra w (0,0) — potem biodro opuszczamy tak, żeby najniższy punkt (stopa albo kolano) stał na ziemi
  const noga = (u: number, k: number) => {
    const ku = kier(u), kg = kier(u - k);
    const kol = { x: ku.x * D.udo * h, y: ku.y * D.udo * h };
    const st = { x: kol.x + kg.x * D.golen * h, y: kol.y + kg.y * D.golen * h };
    return [kol, st] as const;
  };
  const [kA0, sA0] = noga(p.uA, p.kA), [kB0, sB0] = noga(p.uB, p.kB);
  let by: number;
  if (p.zawis !== undefined) by = -p.zawis * h;
  else {
    const dol = Math.max(sA0.y + D.stopa * h, sB0.y + D.stopa * h, kA0.y + 0.022 * h, kB0.y + 0.022 * h);
    by = -dol - (p.lot ?? 0) * h;
  }
  const biodro = { x: 0, y: by };
  const przes = (q: Pkt) => ({ x: q.x, y: q.y + by });
  const kt = kier(Math.PI - p.tulow);   // tułów w górę, pochylony do przodu
  const dlT = D.tulow * h * (1 + p.oddech * 0.012);
  const bark = { x: biodro.x + kt.x * dlT, y: biodro.y + kt.y * dlT };
  const szyja = { x: bark.x + kt.x * D.szyja * h, y: bark.y + kt.y * D.szyja * h };
  const kg = kier(Math.PI - p.tulow - p.glowa * 0.5);
  const rg = D.glowa * h;
  const glowa = { x: szyja.x + kg.x * rg * 0.95, y: szyja.y + kg.y * rg * 0.95 };
  const reka = (r: number, e: number, cel: [number, number] | undefined, zg: number): [Pkt, Pkt, number] => {
    if (cel) {
      const t = { x: bark.x + cel[0] * h, y: bark.y + cel[1] * h };
      const [l, d] = ik(bark, t, D.ramie * h, D.przed * h, zg);
      return [l, d, Math.atan2(d.x - l.x, d.y - l.y)];
    }
    const kr = kier(r + p.tulow * 0.6), kp = kier(r + e + p.tulow * 0.6);
    const lok = { x: bark.x + kr.x * D.ramie * h, y: bark.y + kr.y * D.ramie * h };
    return [lok, { x: lok.x + kp.x * D.przed * h, y: lok.y + kp.y * D.przed * h }, r + e + p.tulow * 0.6];
  };
  const [lokA, dlonA, przedA] = reka(p.rA, p.eA, p.celA, -1);
  let lokB: Pkt, dlonB: Pkt, przedB: number;
  if (p.oburacz) {
    // dalsza dłoń chwyta trzonek kawałek niżej
    const kat = przedA + (p.narz ?? 0);
    const cel = { x: dlonA.x - sin(kat) * 0.06 * h, y: dlonA.y - cos(kat) * 0.06 * h };
    [lokB, dlonB] = ik(bark, cel, D.ramie * h, D.przed * h, -1);
    przedB = Math.atan2(dlonB.x - lokB.x, dlonB.y - lokB.y);
  } else [lokB, dlonB, przedB] = reka(p.rB, p.eB, p.celB, -1);
  return {
    biodro, bark, szyja, glowa, rg,
    kolA: przes(kA0), stopaA: przes(sA0), kolB: przes(kB0), stopaB: przes(sB0),
    lokA, dlonA, lokB, dlonB, przedA, przedB,
  };
}

// ------------------------------------------------------------------ rysowanie brył

const SWIATLO = { x: 0.42, y: -0.9 };

/** Część sylwetki: kształt (wypełnienie) albo kreska (trzonek, laska); `po` dorysowuje szczegóły zaraz po niej. */
interface Czesc {
  sciezka?: Path2D;
  kreska?: [number, number, number, number, number];
  styl: string | CanvasGradient;
  po?: (g: CanvasRenderingContext2D) => void;
  /** cienka wewnętrzna kreska po wypełnieniu (oddziela bliższą kończynę od tułowia) */
  rys?: boolean;
  /** bez obwódki zewnętrznej (np. światło) */
  bezObrysu?: boolean;
}

function kapsula(a: Pkt, ra: number, b: Pkt, rb: number): Path2D {
  const p = new Path2D();
  const kat = Math.atan2(b.y - a.y, b.x - a.x);
  p.arc(b.x, b.y, rb, kat - Math.PI / 2, kat + Math.PI / 2);
  p.arc(a.x, a.y, ra, kat + Math.PI / 2, kat + Math.PI * 1.5);
  p.closePath();
  return p;
}

function wielokat(pk: number[]): Path2D {
  const p = new Path2D();
  p.moveTo(pk[0], pk[1]);
  for (let i = 2; i < pk.length; i += 2) p.lineTo(pk[i], pk[i + 1]);
  p.closePath();
  return p;
}

class Malarz {
  czesci: Czesc[] = [];
  constructor(public g: CanvasRenderingContext2D, public h: number, public prosto: boolean) {}

  /** Gradient w poprzek bryły: od strony światła do cienia. */
  bryla(a: Pkt, b: Pkt, r: number, kol: Rgb, dalej = false): string | CanvasGradient {
    const baza = dalej ? -0.38 : 0;
    if (this.prosto) return ton(kol, baza);
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (nx * SWIATLO.x + ny * SWIATLO.y < 0) { nx = -nx; ny = -ny; }
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const gr = this.g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
    gr.addColorStop(0, ton(kol, baza + 0.32));
    gr.addColorStop(0.4, ton(kol, baza));
    gr.addColorStop(1, ton(kol, baza - 0.45));
    return gr;
  }

  /** Gradient dla dużej płaszczyzny (tułów, szata): z góry-przodu w dół-tył. */
  plaszczyzna(x0: number, y0: number, x1: number, y1: number, kol: Rgb, dalej = false): string | CanvasGradient {
    const baza = dalej ? -0.38 : 0;
    if (this.prosto) return ton(kol, baza);
    const gr = this.g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, ton(kol, baza + 0.28));
    gr.addColorStop(0.45, ton(kol, baza));
    gr.addColorStop(1, ton(kol, baza - 0.42));
    return gr;
  }

  ksztalt(sciezka: Path2D, styl: string | CanvasGradient, po?: (g: CanvasRenderingContext2D) => void, rys = false): void {
    this.czesci.push({ sciezka, styl, po, rys });
  }

  kreska(x1: number, y1: number, x2: number, y2: number, w: number, styl: string, po?: (g: CanvasRenderingContext2D) => void): void {
    this.czesci.push({ kreska: [x1, y1, x2, y2, w], styl, po });
  }

  szczegol(po: (g: CanvasRenderingContext2D) => void): void {
    this.czesci.push({ styl: '', po, bezObrysu: true });
  }

  maluj(obwodka: string): void {
    const g = this.g, h = this.h;
    const jasna = Math.max(1.1, h * 0.05), ciemna = Math.max(0.8, h * 0.026);
    g.lineJoin = 'round'; g.lineCap = 'round';
    // 1. jasna obwódka roli — cała sylwetka naraz; 2. ciemna kreska; 3. wypełnienia od tyłu do przodu
    for (const [szer, barwa] of [[jasna + ciemna, obwodka], [ciemna, 'rgba(12,8,6,0.95)']] as const) {
      g.strokeStyle = barwa;
      for (const c of this.czesci) {
        if (c.bezObrysu) continue;
        if (c.sciezka) { g.lineWidth = szer * 2; g.stroke(c.sciezka); }
        else if (c.kreska) { const [x1, y1, x2, y2, w] = c.kreska; g.lineWidth = w + szer * 2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      }
    }
    for (const c of this.czesci) {
      if (c.sciezka) {
        g.fillStyle = c.styl; g.fill(c.sciezka);
        if (c.rys && !this.prosto) { g.strokeStyle = 'rgba(14,9,7,0.55)'; g.lineWidth = Math.max(0.6, h * 0.012); g.stroke(c.sciezka); }
      } else if (c.kreska) {
        const [x1, y1, x2, y2, w] = c.kreska;
        g.strokeStyle = c.styl; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      }
      if (c.po) c.po(g);
    }
  }
}

// ------------------------------------------------------------------ narzędzia

function kilof(m: Malarz, x: number, y: number, kat: number, h: number): void {
  // trzonek od dłoni w dół-tył i w górę-przód; głowica na końcu
  const dl = 0.36 * h, tyl = 0.08 * h;
  const ux = sin(kat), uy = cos(kat);
  const ax = x - ux * tyl, ay = y - uy * tyl, bx = x + ux * dl, by = y + uy * dl;
  m.kreska(ax, ay, bx, by, Math.max(1.2, h * 0.026), ton([126, 88, 52]));
  // głowica: łuk prostopadły do trzonka
  const px = -uy, py = ux;
  const glow = new Path2D();
  const r = 0.13 * h;
  glow.moveTo(bx + px * r - ux * 0.02 * h, by + py * r - uy * 0.02 * h);
  glow.quadraticCurveTo(bx + ux * 0.05 * h, by + uy * 0.05 * h, bx - px * r * 0.8 - ux * 0.04 * h, by - py * r * 0.8 - uy * 0.04 * h);
  glow.lineTo(bx - px * r * 0.6 + ux * 0.0, by - py * r * 0.6);
  glow.quadraticCurveTo(bx + ux * 0.02 * h, by + uy * 0.02 * h, bx + px * r * 0.85, by + py * r * 0.85);
  glow.closePath();
  m.ksztalt(glow, m.prosto ? ton([176, 180, 186]) : m.bryla({ x: bx - px * r, y: by - py * r }, { x: bx + px * r, y: by + py * r }, 0.03 * h, [176, 180, 186]));
}

function miecz(m: Malarz, x: number, y: number, kat: number, h: number): void {
  const ux = sin(kat), uy = cos(kat), px = -uy, py = ux;
  const dl = 0.46 * h, sz = 0.026 * h;
  const tx = x + ux * 0.04 * h, ty = y + uy * 0.04 * h;
  const ostrze = wielokat([
    tx + px * sz, ty + py * sz,
    tx + ux * dl * 0.88 + px * sz * 0.8, ty + uy * dl * 0.88 + py * sz * 0.8,
    tx + ux * dl, ty + uy * dl,
    tx + ux * dl * 0.88 - px * sz * 0.8, ty + uy * dl * 0.88 - py * sz * 0.8,
    tx - px * sz, ty - py * sz,
  ]);
  m.ksztalt(ostrze, m.prosto ? ton([214, 222, 232]) : m.bryla({ x: tx, y: ty }, { x: tx + ux * dl, y: ty + uy * dl }, sz, [214, 222, 232]), (g) => {
    if (m.prosto) return;
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = Math.max(0.5, h * 0.008);
    g.beginPath(); g.moveTo(tx + ux * 0.05 * h, ty + uy * 0.05 * h); g.lineTo(tx + ux * dl * 0.85, ty + uy * dl * 0.85); g.stroke();
  });
  // jelec i głowica
  m.kreska(tx - px * 0.07 * h, ty - py * 0.07 * h, tx + px * 0.07 * h, ty + py * 0.07 * h, Math.max(1.2, h * 0.026), ton([214, 172, 82]));
  m.kreska(x - ux * 0.06 * h, y - uy * 0.06 * h, x, y, Math.max(1.1, h * 0.024), ton([90, 60, 40]));
}

function laska(m: Malarz, x: number, y: number, kat: number, h: number, stroj: Stroj): void {
  const ux = sin(kat), uy = cos(kat);
  const gora = 0.4 * h, dol = Math.max(0.2 * h, Math.min(0.75 * h, -y / Math.max(0.3, Math.abs(uy))));
  const ax = x + ux * dol, ay = y + uy * dol, bx = x - ux * gora, by = y - uy * gora;
  m.kreska(ax, ay, bx, by, Math.max(1.2, h * 0.024), ton([128, 90, 54]));
  // krzyż na szczycie
  const px = -uy, py = ux;
  const cx = bx - ux * 0.02 * h, cy = by - uy * 0.02 * h;
  m.kreska(cx, cy, cx - ux * 0.11 * h, cy - uy * 0.11 * h, Math.max(1.3, h * 0.03), ton(stroj.lamowka, 0.15));
  const kx = cx - ux * 0.075 * h, ky = cy - uy * 0.075 * h;
  m.kreska(kx - px * 0.045 * h, ky - py * 0.045 * h, kx + px * 0.045 * h, ky + py * 0.045 * h, Math.max(1.3, h * 0.03), ton(stroj.lamowka, 0.15));
}

// ------------------------------------------------------------------ postać

export function rysujLud(
  ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, rola: Rola, h: number, czas: number, cz: Czynnosc,
  faza: number, fazaPion: number, zegar: number,
): void {
  const kierunek = c.face >= 0 ? 1 : -1;
  const wt = ruchWtorny(c, czas, kierunek);
  const st = stroj(rola, c);
  const p = poza(cz, rola, czas, faza, fazaPion, zegar, c);
  const prosto = h < 30;
  const g = ctx;
  g.save();
  if (p.lezy) { g.translate(-h * 0.45, -h * 0.07); g.rotate(-Math.PI / 2); }
  // drgnięcie przy trafieniu
  if (p.uderzenie) g.translate((sin(czas * 0.09) * 0.012 * h) * p.uderzenie, 0);
  wygladz(p, wt, czas);
  const s = szkielet(p, h);
  const m = new Malarz(g, h, prosto);

  if (rola === 'robotnik') robotnik(m, s, p, st, h, c, cz, czas, wt);
  else if (rola === 'pobozny') pobozny(m, s, p, st, h, c, cz, czas, wt, sim);
  else rycerz(m, s, p, st, h, c, cz, czas, wt);

  m.maluj(st.obwodka);
  g.restore();
}

const GLADKIE = ['tulow', 'glowa', 'uA', 'kA', 'uB', 'kB', 'rA', 'eA', 'rB', 'eB'] as const;

/** Nowa poza dochodzi do poprzedniej w ~60 ms — zmiana czynności nie przeskakuje z klatki na klatkę. */
function wygladz(p: Poza, wt: Wtorny, czas: number): void {
  const st = wt.poza;
  const dt = Math.max(0, Math.min(0.25, (czas - (wt.pozaT ?? czas)) / 1000));
  if (st && dt > 0 && !p.lezy && !st.lezy) {
    const w = 1 - Math.exp(-dt * 16);
    for (const k of GLADKIE) p[k] = st[k] + (p[k] - st[k]) * w;
  }
  wt.poza = { ...p }; wt.pozaT = czas;
}

// --- wspólne kawałki ciała

function noga(m: Malarz, biodro: Pkt, kol: Pkt, stopa: Pkt, h: number, udo: Rgb, golen: Rgb, but: Rgb, dalej: boolean, gruba = 1): void {
  const r1 = 0.05 * h * gruba, r2 = 0.04 * h * gruba, r3 = 0.034 * h * gruba;
  m.ksztalt(kapsula(biodro, r1, kol, r2), m.bryla(biodro, kol, r1, udo, dalej), undefined, !dalej);
  m.ksztalt(kapsula(kol, r2, stopa, r3), m.bryla(kol, stopa, r2, golen, dalej), undefined, !dalej);
  // but: zaokrąglony klin do przodu
  const b = new Path2D();
  const x = stopa.x, y = stopa.y;
  b.moveTo(x - 0.04 * h, y - 0.03 * h);
  b.lineTo(x + 0.03 * h, y - 0.03 * h);
  b.quadraticCurveTo(x + 0.09 * h, y - 0.02 * h, x + 0.085 * h, y + 0.03 * h);
  b.lineTo(x - 0.045 * h, y + 0.03 * h);
  b.closePath();
  m.ksztalt(b, m.plaszczyzna(x, y - 0.03 * h, x, y + 0.03 * h, but, dalej));
}

function reka(m: Malarz, bark: Pkt, lok: Pkt, dlon: Pkt, h: number, ramie: Rgb, przed: Rgb, dl: Rgb, dalej: boolean, rekaw = 1): void {
  const r1 = 0.036 * h * rekaw, r2 = 0.03 * h * rekaw, r3 = 0.026 * h;
  m.ksztalt(kapsula(bark, r1, lok, r2), m.bryla(bark, lok, r1, ramie, dalej), undefined, !dalej);
  m.ksztalt(kapsula(lok, r2, dlon, r3), m.bryla(lok, dlon, r2, przed, dalej), undefined, !dalej);
  const d = new Path2D(); d.arc(dlon.x, dlon.y, 0.03 * h, 0, TAU);
  m.ksztalt(d, m.bryla({ x: dlon.x - 1, y: dlon.y - 1 }, { x: dlon.x + 1, y: dlon.y + 1 }, 0.03 * h, dl, dalej));
}

/** Tułów: trapez od bioder do barków, z lekką wypukłością piersi. */
function tulow(m: Malarz, s: Szkielet, h: number, kol: Rgb, szerB = 0.085, szerD = 0.065): Path2D {
  const dx = s.bark.x - s.biodro.x, dy = s.bark.y - s.biodro.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, px = -uy, py = ux;   // px wskazuje do przodu (dla tułowia w górę)
  const B = szerB * h, Dd = szerD * h;
  const t = new Path2D();
  t.moveTo(s.biodro.x - px * Dd, s.biodro.y - py * Dd);
  t.lineTo(s.biodro.x + px * Dd, s.biodro.y + py * Dd);
  t.quadraticCurveTo(s.biodro.x + ux * L * 0.6 + px * B * 1.25, s.biodro.y + uy * L * 0.6 + py * B * 1.25, s.bark.x + px * B * 0.9, s.bark.y + py * B * 0.9);
  t.quadraticCurveTo(s.bark.x + ux * 0.03 * h, s.bark.y + uy * 0.03 * h, s.bark.x - px * B, s.bark.y - py * B);
  t.closePath();
  m.ksztalt(t, m.plaszczyzna(s.bark.x + px * B, s.bark.y - 0.02 * h, s.biodro.x - px * Dd, s.biodro.y, kol));
  return t;
}

function twarz(g: CanvasRenderingContext2D, s: Szkielet, p: Poza, h: number, skora: Rgb, prosto: boolean, bez: { nos?: boolean; brew?: boolean } = {}): void {
  const { x, y } = s.glowa, r = s.rg;
  // oko
  const ox = x + r * 0.5, oy = y - r * 0.08;
  g.fillStyle = 'rgba(16,10,8,0.95)';
  if (p.oczy > 0.25) { g.beginPath(); g.ellipse(ox, oy, Math.max(0.6, r * 0.11), Math.max(0.5, r * 0.15 * p.oczy), 0, 0, TAU); g.fill(); }
  else { g.fillRect(ox - r * 0.12, oy, r * 0.24, Math.max(0.6, r * 0.05)); }
  if (prosto) return;
  if (p.oczy > 0.25) { g.fillStyle = 'rgba(255,250,236,0.9)'; g.beginPath(); g.arc(ox + r * 0.04, oy - r * 0.05, Math.max(0.4, r * 0.04), 0, TAU); g.fill(); }
  if (!bez.brew) { g.strokeStyle = 'rgba(40,24,16,0.85)'; g.lineWidth = Math.max(0.6, r * 0.09); g.beginPath(); g.moveTo(ox - r * 0.16, oy - r * 0.25); g.lineTo(ox + r * 0.16, oy - r * 0.3); g.stroke(); }
  if (!bez.nos) {
    g.fillStyle = ton(skora, -0.05);
    g.beginPath(); g.moveTo(x + r * 0.88, y - r * 0.02); g.quadraticCurveTo(x + r * 1.14, y + r * 0.22, x + r * 0.9, y + r * 0.3); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(60,26,20,0.7)'; g.lineWidth = Math.max(0.5, r * 0.06);
  g.beginPath(); g.moveTo(x + r * 0.55, y + r * 0.55); g.lineTo(x + r * 0.8, y + r * 0.52); g.stroke();
}

function glowaCialo(m: Malarz, s: Szkielet, h: number, skora: Rgb): void {
  const g = new Path2D(); g.arc(s.glowa.x, s.glowa.y, s.rg, 0, TAU);
  m.ksztalt(g, m.prosto ? ton(skora) : (() => {
    const gr = m.g.createRadialGradient(s.glowa.x + s.rg * 0.35, s.glowa.y - s.rg * 0.4, s.rg * 0.1, s.glowa.x, s.glowa.y, s.rg * 1.1);
    gr.addColorStop(0, ton(skora, 0.3)); gr.addColorStop(0.6, ton(skora)); gr.addColorStop(1, ton(skora, -0.4));
    return gr;
  })());
}

/** Odpryski i pył w chwili trafienia kilofem. */
function odpryski(g: CanvasRenderingContext2D, x: number, y: number, h: number, u: number, id: number): void {
  if (u <= 0) return;
  const t = 1 - u;
  for (let i = 0; i < 6; i++) {
    const a = -2.4 + i * 0.55 + sin(id * 3.1 + i) * 0.3;
    const d = t * h * (0.18 + (i % 3) * 0.07);
    g.fillStyle = `rgba(236,220,190,${0.95 * u})`;
    const r = Math.max(0.8, h * (0.016 + (i % 2) * 0.01));
    g.fillRect(x + cos(a) * d, y + sin(a) * d - t * t * h * 0.05, r, r);
  }
  g.fillStyle = `rgba(190,170,140,${0.35 * u})`;
  g.beginPath(); g.arc(x, y, h * (0.05 + t * 0.12), 0, TAU); g.fill();
}

// ------------------------------------------------------------------ robotnik

function robotnik(m: Malarz, s: Szkielet, p: Poza, st: Stroj, h: number, c: Creature, cz: Czynnosc, czas: number, wt: Wtorny): void {
  const katNarz = s.przedA + (p.narz ?? 1.35);
  const wRekach = p.oburacz || cz === 'kopie' || cz === 'walczy' || cz === 'buduje';
  // worek albo kilof na plecach
  if (c.carry > 0) {
    const wx = s.bark.x - 0.1 * h, wy = s.bark.y + 0.07 * h;
    const w = new Path2D(); w.ellipse(wx, wy, 0.085 * h, 0.1 * h, -0.2 + wt.sa * 0.3, 0, TAU);
    m.ksztalt(w, m.plaszczyzna(wx, wy - 0.1 * h, wx, wy + 0.1 * h, [150, 118, 74]), (g) => {
      // grzyb wystaje z worka
      g.fillStyle = ton([196, 64, 52]);
      g.beginPath(); g.ellipse(wx + 0.01 * h, wy - 0.1 * h, 0.04 * h, 0.022 * h, 0, Math.PI, 0); g.fill();
    });
  } else if (!wRekach) {
    kilof(m, s.bark.x - 0.06 * h, s.bark.y + 0.12 * h, Math.PI - 0.5 + wt.sa * 0.2, h * 0.85);
  }
  reka(m, s.bark, s.lokB, s.dlonB, h, st.koszula, st.skora, st.skora, true);
  noga(m, s.biodro, s.kolB, s.stopaB, h, st.spodnie, st.spodnie, st.buty, true);
  const t = tulow(m, s, h, st.koszula, 0.1, 0.078);
  // kamizelka i pas
  m.szczegol((g) => {
    g.save(); g.clip(t);
    const kx = s.biodro.x - 0.1 * h;
    g.fillStyle = m.prosto ? ton(st.kamizelka) : (() => { const gr = g.createLinearGradient(s.bark.x, s.bark.y, s.biodro.x, s.biodro.y); gr.addColorStop(0, ton(st.kamizelka, 0.15)); gr.addColorStop(1, ton(st.kamizelka, -0.35)); return gr; })();
    g.beginPath(); g.moveTo(kx, s.biodro.y + 0.02 * h); g.lineTo(s.bark.x - 0.1 * h, s.bark.y - 0.02 * h); g.lineTo(s.bark.x + 0.01 * h, s.bark.y - 0.02 * h); g.lineTo(s.biodro.x + 0.02 * h, s.biodro.y + 0.02 * h); g.closePath(); g.fill();
    g.fillStyle = ton([52, 34, 22]);
    const ux = s.bark.x - s.biodro.x, uy = s.bark.y - s.biodro.y;
    g.save(); g.translate(s.biodro.x + ux * 0.12, s.biodro.y + uy * 0.12); g.rotate(Math.atan2(uy, ux) + Math.PI / 2);
    g.fillRect(-0.12 * h, -0.016 * h, 0.24 * h, 0.032 * h);
    g.fillStyle = ton([214, 176, 92]); g.fillRect(0.03 * h, -0.014 * h, 0.022 * h, 0.028 * h);
    g.restore();
    g.restore();
  });
  noga(m, s.biodro, s.kolA, s.stopaA, h, st.spodnie, st.spodnie, st.buty, false);
  // głowa: czapka z lampką
  glowaCialo(m, s, h, st.skora);
  const brodaty = c.id % 3 === 0;
  m.szczegol((g) => {
    const { x, y } = s.glowa, r = s.rg;
    if (brodaty) {
      g.fillStyle = ton([86, 54, 34], 0, 0.9);
      g.beginPath(); g.moveTo(x - r * 0.3, y + r * 0.2); g.quadraticCurveTo(x + r * 0.2, y + r * 1.25, x + r * 0.95, y + r * 0.45); g.lineTo(x + r * 0.6, y + r * 0.35); g.quadraticCurveTo(x + r * 0.1, y + r * 0.7, x - r * 0.3, y + r * 0.2); g.fill();
    }
    twarz(g, s, p, h, st.skora, m.prosto);
  });
  const ck = new Path2D();
  {
    const { x, y } = s.glowa, r = s.rg;
    const kat = -p.glowa * 0.5 - p.tulow * 0.4;
    const obr = (dx: number, dy: number): [number, number] => [x + dx * cos(kat) - dy * sin(kat), y + dx * sin(kat) + dy * cos(kat)];
    const pkt = [[-1.08, -0.05], [-1.02, -0.6], [-0.5, -1.15], [0.3, -1.15], [0.9, -0.7], [1.05, -0.32], [1.38, -0.26], [1.36, -0.14], [0.95, -0.12], [-1.08, 0.0]];
    pkt.forEach(([dx, dy], i) => { const [px, py] = obr(dx * r, dy * r); if (i) ck.lineTo(px, py); else ck.moveTo(px, py); });
    ck.closePath();
    const [lx, ly] = obr(r * 0.72, -r * 0.72);
    m.ksztalt(ck, m.plaszczyzna(x, y - r, x - r, y, st.czapka), (g) => {
      // lampka: mosiężna oprawa i światło
      g.fillStyle = ton([222, 186, 96]);
      g.beginPath(); g.arc(lx, ly, Math.max(1, r * 0.26), 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,250,220,1)';
      g.beginPath(); g.arc(lx + r * 0.05, ly, Math.max(0.7, r * 0.14), 0, TAU); g.fill();
      {
        g.save(); g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(lx, ly, 0, lx, ly, h * 0.28);
        gr.addColorStop(0, 'rgba(255,220,140,0.5)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, h * 0.28, -0.45 + kat, 0.45 + kat); g.closePath(); g.fill();
        g.restore();
      }
    });
  }
  // bliższa ręka z narzędziem
  const rekaw: Rgb = st.koszula;
  m.ksztalt(kapsula(s.bark, 0.036 * h, s.lokA, 0.03 * h), m.bryla(s.bark, s.lokA, 0.036 * h, rekaw), undefined, true);
  m.ksztalt(kapsula(s.lokA, 0.03 * h, s.dlonA, 0.026 * h), m.bryla(s.lokA, s.dlonA, 0.03 * h, st.skora), undefined, true);
  if (wRekach) kilof(m, s.dlonA.x, s.dlonA.y, katNarz, h);
  const d = new Path2D(); d.arc(s.dlonA.x, s.dlonA.y, 0.03 * h, 0, TAU);
  m.ksztalt(d, ton(st.skora, 0.05));
  if (p.oburacz) { const d2 = new Path2D(); d2.arc(s.dlonB.x, s.dlonB.y, 0.028 * h, 0, TAU); m.ksztalt(d2, ton(st.skora, -0.2)); }
  if (cz === 'je') m.szczegol((g) => { g.fillStyle = ton([196, 64, 52]); g.beginPath(); g.ellipse(s.dlonA.x + 0.02 * h, s.dlonA.y - 0.03 * h, 0.035 * h, 0.022 * h, -0.3, Math.PI, 0); g.fill(); g.fillStyle = ton([226, 214, 190]); g.fillRect(s.dlonA.x + 0.01 * h, s.dlonA.y - 0.03 * h, 0.015 * h, 0.03 * h); });
  if (p.uderzenie) {
    const kat = katNarz, bx = s.dlonA.x + sin(kat) * 0.36 * h, by = s.dlonA.y + cos(kat) * 0.36 * h;
    m.szczegol((g) => odpryski(g, bx + 0.06 * h, by, h, p.uderzenie!, c.id));
  }
}

// ------------------------------------------------------------------ pobożny

function pobozny(m: Malarz, s: Szkielet, p: Poza, st: Stroj, h: number, c: Creature, cz: Czynnosc, czas: number, wt: Wtorny, sim: Sim): void {
  const szata = st.szata, cienSzaty: Rgb = [196, 184, 160];
  const katLaski = p.bron ?? 0.1;
  const zLaska = cz !== 'modli' && cz !== 'czyta' && cz !== 'je' && cz !== 'wspina' && cz !== 'spada' && cz !== 'spi';
  // kaptur z tyłu (szpic) — z bezwładnością
  {
    const { x, y } = s.glowa, r = s.rg;
    const a = wt.pia + p.tulow * 0.3;
    const tx = x - r * 1.0 + sin(a) * r * 1.1, ty = y + r * 0.2 + cos(a) * r * 0.9;
    const k = wielokat([x - r * 0.4, y - r * 1.15, tx - r * 0.6, ty + r * 0.3, x - r * 0.9, y + r * 0.9, x + r * 0.2, y + r * 0.6]);
    m.ksztalt(k, ton(szata, -0.22));
  }
  reka(m, s.bark, s.lokB, s.dlonB, h, szata, szata, st.skora, true, 1.25);
  if (p.zawis !== undefined || cz === 'modli' || cz === 'je') {
    noga(m, s.biodro, s.kolB, s.stopaB, h, cienSzaty, cienSzaty, [70, 52, 40], true);
    noga(m, s.biodro, s.kolA, s.stopaA, h, cienSzaty, cienSzaty, [70, 52, 40], true);
  } else {
    // stopy spod szaty
    for (const [st2, dalej] of [[s.stopaB, true], [s.stopaA, false]] as const) {
      const b = new Path2D(); b.ellipse(st2.x + 0.025 * h, st2.y, 0.05 * h, 0.028 * h, 0, Math.PI, 0); b.closePath();
      m.ksztalt(b, ton([70, 52, 40], dalej ? -0.35 : 0));
    }
  }
  // szata: od barków do rąbka, rąbek nad stopami, z tyłu odchodzi z ruchem
  {
    const dol = Math.max(s.stopaA.y, s.stopaB.y) - 0.035 * h;
    const kleczy = cz === 'modli' || cz === 'je';
    const przod = Math.max(s.kolA.x, s.stopaA.x, s.kolB.x, s.stopaB.x, s.biodro.x + 0.1 * h) + 0.04 * h;
    const tyl = Math.min(s.kolA.x, s.stopaA.x, s.kolB.x, s.stopaB.x, s.biodro.x - 0.1 * h) - 0.03 * h + wt.sa * 0.12 * h;
    const fal = sin(czas * 0.006 + c.id) * 0.012 * h * Math.min(1, Math.abs(wt.vx) / 2 + 0.3);
    const yDol = kleczy ? Math.max(s.kolA.y, s.kolB.y, s.stopaA.y) + 0.01 * h : dol;
    const sz = new Path2D();
    sz.moveTo(s.bark.x - 0.08 * h, s.bark.y);
    sz.quadraticCurveTo(s.biodro.x - 0.12 * h, s.biodro.y, tyl, yDol + fal);
    sz.quadraticCurveTo((tyl + przod) / 2, yDol + 0.02 * h - fal, przod, yDol - fal);
    sz.quadraticCurveTo(s.biodro.x + 0.13 * h, s.biodro.y - 0.02 * h, s.bark.x + 0.085 * h, s.bark.y + 0.01 * h);
    sz.closePath();
    m.ksztalt(sz, m.plaszczyzna(przod, s.bark.y, tyl, yDol, szata), (g) => {
      if (m.prosto) return;
      // fałdy i złota lamówka u dołu
      g.save(); g.clip(sz);
      g.strokeStyle = 'rgba(120,100,76,0.45)'; g.lineWidth = Math.max(0.6, h * 0.012);
      for (let i = 0; i < 3; i++) {
        const fx = lerp(tyl, przod, 0.25 + i * 0.22);
        g.beginPath(); g.moveTo(lerp(s.biodro.x, fx, 0.3), s.biodro.y + 0.02 * h); g.quadraticCurveTo(fx + sin(czas * 0.004 + i) * 0.01 * h, (s.biodro.y + yDol) / 2, fx, yDol); g.stroke();
      }
      g.strokeStyle = ton(st.lamowka, 0.1); g.lineWidth = Math.max(1, h * 0.022);
      g.beginPath(); g.moveTo(tyl, yDol + fal - 0.012 * h); g.quadraticCurveTo((tyl + przod) / 2, yDol + 0.008 * h - fal, przod, yDol - fal - 0.012 * h); g.stroke();
      // sznur w pasie
      g.strokeStyle = ton([200, 170, 110]); g.lineWidth = Math.max(0.8, h * 0.016);
      g.beginPath(); g.moveTo(s.biodro.x - 0.1 * h, s.biodro.y - 0.02 * h); g.lineTo(s.biodro.x + 0.11 * h, s.biodro.y - 0.035 * h); g.stroke();
      g.beginPath(); g.moveTo(s.biodro.x + 0.06 * h, s.biodro.y - 0.03 * h); g.lineTo(s.biodro.x + 0.075 * h + sin(czas * 0.005) * 0.01 * h, s.biodro.y + 0.09 * h); g.stroke();
      g.restore();
    });
    // krzyż na piersi
    m.szczegol((g) => {
      const kx = s.bark.x + 0.035 * h, ky = s.bark.y + 0.09 * h;
      g.strokeStyle = ton(st.lamowka, 0.2); g.lineWidth = Math.max(0.8, h * 0.02);
      g.beginPath(); g.moveTo(kx, ky - 0.04 * h); g.lineTo(kx, ky + 0.045 * h); g.moveTo(kx - 0.025 * h, ky - 0.012 * h); g.lineTo(kx + 0.025 * h, ky - 0.012 * h); g.stroke();
    });
  }
  // głowa w kapturze: cień, z którego widać nos i błysk oczu
  {
    const { x, y } = s.glowa, r = s.rg;
    const k = new Path2D();
    k.moveTo(x - r * 1.05, y + r * 0.95);
    k.quadraticCurveTo(x - r * 1.35, y - r * 0.9, x - r * 0.1, y - r * 1.32);
    k.quadraticCurveTo(x + r * 1.0, y - r * 1.1, x + r * 1.18, y + r * 0.1);
    k.quadraticCurveTo(x + r * 1.2, y + r * 0.9, x + r * 0.5, y + r * 1.15);
    k.closePath();
    m.ksztalt(k, m.plaszczyzna(x + r, y - r, x - r, y + r, szata), (g) => {
      // otwór kaptura
      g.fillStyle = 'rgba(26,16,14,0.96)';
      g.beginPath(); g.ellipse(x + r * 0.55, y + r * 0.1, r * 0.55, r * 0.78, 0.15, 0, TAU); g.fill();
      g.fillStyle = ton(st.skora, -0.35);
      g.beginPath(); g.ellipse(x + r * 0.78, y + r * 0.25, r * 0.28, r * 0.5, 0.1, 0, TAU); g.fill();
      if (p.oczy > 0.25) { g.fillStyle = 'rgba(255,236,190,0.95)'; g.beginPath(); g.arc(x + r * 0.72, y - r * 0.02, Math.max(0.5, r * 0.09), 0, TAU); g.fill(); }
      if (!m.prosto) { g.strokeStyle = ton(st.lamowka, 0.1); g.lineWidth = Math.max(0.7, h * 0.016); g.beginPath(); g.ellipse(x + r * 0.55, y + r * 0.1, r * 0.6, r * 0.83, 0.15, -1.9, 1.6); g.stroke(); }
    });
  }
  // bliższa ręka: szeroki rękaw, laska albo księga
  if (zLaska) laska(m, s.dlonA.x, s.dlonA.y, katLaski, h, st);
  reka(m, s.bark, s.lokA, s.dlonA, h, szata, szata, st.skora, false, 1.3);
  if (cz === 'czyta') {
    const bx = (s.dlonA.x + s.dlonB.x) / 2 + 0.03 * h, by = (s.dlonA.y + s.dlonB.y) / 2 - 0.02 * h;
    const blysk = c.ksiegaT !== undefined ? Math.max(0, 1 - (sim.tick - c.ksiegaT) / 60) : 0;
    m.szczegol((g) => {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(bx, by, 0, bx, by, h * (0.3 + blysk * 0.3));
      gr.addColorStop(0, `rgba(255,236,170,${0.55 + blysk * 0.4})`); gr.addColorStop(1, 'rgba(255,220,140,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(bx, by, h * (0.3 + blysk * 0.3), 0, TAU); g.fill();
      g.restore();
      const w = 0.075 * h, hh = 0.1 * h;
      g.fillStyle = ton([96, 52, 34]); g.fillRect(bx - w - 0.006 * h, by - hh / 2 - 0.006 * h, w * 2 + 0.012 * h, hh + 0.012 * h);
      g.fillStyle = ton([250, 242, 220]); g.fillRect(bx - w, by - hh / 2, w * 2, hh);
      // kartka się przewraca
      const kk = (czas * 0.0009 + c.id) % 1;
      if (kk < 0.25 && !m.prosto) { const t = kk / 0.25; g.fillStyle = ton([236, 226, 200]); g.beginPath(); g.moveTo(bx, by - hh / 2); g.lineTo(bx + w * cos(t * Math.PI), by - hh / 2 - 0.01 * h * sin(t * Math.PI)); g.lineTo(bx + w * cos(t * Math.PI), by + hh / 2 - 0.01 * h * sin(t * Math.PI)); g.lineTo(bx, by + hh / 2); g.closePath(); g.fill(); }
      g.fillStyle = ton(st.lamowka, 0.2); g.fillRect(bx - 0.003 * h, by - hh / 2, 0.006 * h, hh);
      if (!m.prosto) { g.strokeStyle = 'rgba(120,100,80,0.6)'; g.lineWidth = Math.max(0.4, h * 0.006); for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(bx - w * 0.8, by - hh / 2 + hh * i / 4); g.lineTo(bx - w * 0.15, by - hh / 2 + hh * i / 4); g.moveTo(bx + w * 0.15, by - hh / 2 + hh * i / 4); g.lineTo(bx + w * 0.8, by - hh / 2 + hh * i / 4); g.stroke(); } }
    });
  }
  if (cz === 'modli' && !m.prosto) {
    // iskry modlitwy unoszą się z dłoni
    m.szczegol((g) => {
      const hx = (s.dlonA.x + s.dlonB.x) / 2, hy = (s.dlonA.y + s.dlonB.y) / 2;
      for (let i = 0; i < 4; i++) {
        const t = (czas * 0.0005 + i * 0.25 + c.id * 0.13) % 1;
        g.fillStyle = `rgba(255,232,160,${0.85 * (1 - t)})`;
        g.beginPath(); g.arc(hx + sin(t * 9 + i * 2) * 0.04 * h, hy - t * 0.45 * h, Math.max(0.6, h * 0.014 * (1 - t * 0.5)), 0, TAU); g.fill();
      }
    });
  }
}

// ------------------------------------------------------------------ rycerz

function rycerz(m: Malarz, s: Szkielet, p: Poza, st: Stroj, h: number, c: Creature, cz: Czynnosc, czas: number, wt: Wtorny): void {
  const stal = st.stal;
  // peleryna za plecami
  {
    const a = wt.pa + p.tulow * 0.4;
    const dl = 0.5 * h;
    const fx = s.bark.x - 0.06 * h, fy = s.bark.y + 0.01 * h;
    const kx = fx + sin(Math.PI + a) * dl * 0.5 - 0.05 * h, ky = fy - cos(Math.PI + a) * dl;
    const fal = sin(czas * 0.008 + c.id) * 0.02 * h * Math.min(1, Math.abs(wt.vx) / 2 + 0.25);
    const pl = new Path2D();
    pl.moveTo(fx + 0.06 * h, fy);
    pl.quadraticCurveTo(fx - 0.04 * h, fy + dl * 0.4, kx + 0.09 * h + fal, ky);
    pl.quadraticCurveTo(kx - 0.02 * h, ky + 0.03 * h - fal, kx - 0.1 * h - fal, ky - 0.02 * h);
    pl.quadraticCurveTo(fx - 0.12 * h, fy + dl * 0.3, fx - 0.04 * h, fy - 0.01 * h);
    pl.closePath();
    m.ksztalt(pl, m.plaszczyzna(fx, fy, kx, ky, st.plaszcz, true));
  }
  // dalsza ręka trzyma tarczę — tarcza rysowana później, przed tułowiem
  reka(m, s.bark, s.lokB, s.dlonB, h, stal, stal, stal, true, 1.15);
  noga(m, s.biodro, s.kolB, s.stopaB, h, stal, stal, stal, true, 1.12);
  tulow(m, s, h, stal, 0.095, 0.072);
  // tunika z krzyżem na napierśniku, dół do połowy uda
  {
    const dx = s.bark.x - s.biodro.x, dy = s.bark.y - s.biodro.y, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const fal = sin(czas * 0.007 + c.id) * 0.012 * h + wt.sa * 0.05 * h;
    const gx = s.biodro.x + ux * L * 0.62, gy = s.biodro.y + uy * L * 0.62;
    const tn = wielokat([
      gx - 0.085 * h, gy, gx + 0.088 * h, gy,
      s.biodro.x + 0.11 * h - fal, s.biodro.y + 0.12 * h,
      s.biodro.x + 0.01 * h, s.biodro.y + 0.14 * h,
      s.biodro.x - 0.1 * h + fal * 1.5, s.biodro.y + 0.12 * h,
    ]);
    m.ksztalt(tn, m.plaszczyzna(gx + 0.08 * h, gy, s.biodro.x - 0.1 * h, s.biodro.y + 0.12 * h, st.tunika), (g) => {
      const kx = s.biodro.x + ux * L * 0.35 + 0.01 * h, ky = s.biodro.y + uy * L * 0.35;
      g.strokeStyle = c.buntownik ? 'rgba(20,10,10,0.9)' : 'rgba(240,236,226,0.95)'; g.lineWidth = Math.max(1, h * 0.024);
      g.beginPath(); g.moveTo(kx, ky - 0.07 * h); g.lineTo(kx, ky + 0.09 * h); g.moveTo(kx - 0.045 * h, ky - 0.02 * h); g.lineTo(kx + 0.045 * h, ky - 0.02 * h); g.stroke();
      if (!m.prosto) {
        g.strokeStyle = ton(st.lamowka, 0); g.lineWidth = Math.max(0.6, h * 0.012);
        g.beginPath(); g.moveTo(gx - 0.085 * h, gy); g.lineTo(gx + 0.088 * h, gy); g.stroke();
      }
    });
  }
  noga(m, s.biodro, s.kolA, s.stopaA, h, stal, stal, stal, false, 1.12);
  // nagolenniki: błysk na stali
  if (!m.prosto) m.szczegol((g) => {
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(0.5, h * 0.01);
    g.beginPath(); g.moveTo(s.kolA.x + 0.025 * h, s.kolA.y + 0.02 * h); g.lineTo(s.stopaA.x + 0.022 * h, s.stopaA.y - 0.05 * h); g.stroke();
    g.fillStyle = ton(stal, -0.3); g.beginPath(); g.arc(s.kolA.x, s.kolA.y, 0.03 * h, 0, TAU); g.fill();
  });
  // hełm garnczkowy z przyłbicą i pióropuszem
  {
    const { x, y } = s.glowa, r = s.rg * 1.12;
    const kat = -p.glowa * 0.4;
    const he = new Path2D();
    he.moveTo(x - r * 0.95, y + r * 0.85);
    he.lineTo(x - r * 1.0, y - r * 0.3);
    he.quadraticCurveTo(x - r * 0.9, y - r * 1.1, x, y - r * 1.12);
    he.quadraticCurveTo(x + r * 0.95, y - r * 1.05, x + r * 1.0, y - r * 0.25);
    he.lineTo(x + r * 1.02, y + r * 0.85);
    he.closePath();
    // pióropusz: trzy pióra, kołyszą się z ruchem
    const pa = wt.pia + kat;
    const px0 = x - r * 0.1, py0 = y - r * 1.05;
    for (let i = 0; i < 3; i++) {
      const pi = new Path2D();
      const dl = r * (1.5 - i * 0.18);
      const a = pa - 0.35 + i * 0.28;
      const ex = px0 + sin(a + Math.PI) * dl * -1, ey = py0 - cos(a) * dl * 0.75;
      const kx = px0 + sin(a) * dl * 0.2 - r * 0.5, ky = py0 - dl * 0.9;
      pi.moveTo(px0 - r * 0.12, py0);
      pi.quadraticCurveTo(kx, ky, ex - r * 0.6, ey + r * 0.15);
      pi.quadraticCurveTo(kx + r * 0.25, ky + r * 0.35, px0 + r * 0.14, py0);
      pi.closePath();
      m.ksztalt(pi, ton(st.pioro, -0.12 * i + (i === 2 ? 0.12 : 0)));
    }
    m.ksztalt(he, m.prosto ? ton(stal) : (() => {
      const gr = m.g.createLinearGradient(x + r, y - r, x - r, y + r);
      gr.addColorStop(0, ton(stal, 0.45)); gr.addColorStop(0.35, ton(stal, 0.05)); gr.addColorStop(1, ton(stal, -0.5));
      return gr;
    })(), (g) => {
      // szczelina wizjera i otwory oddechowe
      g.fillStyle = 'rgba(8,6,8,0.95)';
      g.fillRect(x + r * 0.05, y - r * 0.2, r * 0.97, Math.max(1, r * 0.17));
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = st.oko;
      g.fillRect(x + r * 0.45, y - r * 0.17, r * 0.35, Math.max(0.6, r * 0.1)); g.restore();
      if (!m.prosto) {
        g.fillStyle = 'rgba(8,6,8,0.8)';
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.fillRect(x + r * (0.5 + j * 0.2), y + r * (0.22 + i * 0.18), Math.max(0.5, r * 0.07), Math.max(0.5, r * 0.07));
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(0.5, h * 0.01);
        g.beginPath(); g.moveTo(x + r * 0.55, y - r * 0.85); g.quadraticCurveTo(x + r * 0.85, y - r * 0.65, x + r * 0.88, y - r * 0.35); g.stroke();
        g.strokeStyle = ton(st.lamowka, 0); g.lineWidth = Math.max(0.6, h * 0.014);
        g.beginPath(); g.moveTo(x + r * 0.15, y - r * 1.1); g.lineTo(x + r * 0.15, y + r * 0.85); g.stroke();
      }
    });
  }
  // bliższa ręka z mieczem
  const katMiecza = p.bron ?? s.przedA + (p.narz ?? 1.3);
  if (p.ciecie && !m.prosto) {
    // ślad cięcia: łuk za ostrzem
    const sx = s.bark.x, sy = s.bark.y, R = (D.ramie + D.przed + 0.4) * h;
    m.szczegol((g) => {
      g.save(); g.globalCompositeOperation = 'lighter';
      const a1 = -Math.PI / 2 - 0.4, a2 = 0.6;
      const gr = g.createRadialGradient(sx, sy, R * 0.3, sx, sy, R);
      gr.addColorStop(0, 'rgba(200,220,255,0)'); gr.addColorStop(0.8, 'rgba(220,235,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(sx, sy, R, a1, a2); g.arc(sx, sy, R * 0.45, a2, a1, true); g.closePath(); g.fill();
      g.restore();
    });
  }
  reka(m, s.bark, s.lokA, s.dlonA, h, stal, stal, stal, false, 1.15);
  miecz(m, s.dlonA.x, s.dlonA.y, katMiecza, h);
  { const d = new Path2D(); d.arc(s.dlonA.x, s.dlonA.y, 0.032 * h, 0, TAU); m.ksztalt(d, ton(stal, -0.1)); }
  // tarcza w dalszej ręce, przed tułowiem
  {
    const tx = s.dlonB.x + 0.035 * h, ty = s.dlonB.y - 0.02 * h, w = 0.1 * h, hh = 0.16 * h;
    const tr = new Path2D();
    tr.moveTo(tx - w, ty - hh * 0.45);
    tr.quadraticCurveTo(tx, ty - hh * 0.62, tx + w, ty - hh * 0.45);
    tr.quadraticCurveTo(tx + w * 1.02, ty + hh * 0.2, tx, ty + hh * 0.65);
    tr.quadraticCurveTo(tx - w * 1.02, ty + hh * 0.2, tx - w, ty - hh * 0.45);
    tr.closePath();
    m.ksztalt(tr, m.plaszczyzna(tx + w, ty - hh, tx - w, ty + hh, st.tunika), (g) => {
      g.strokeStyle = ton(st.lamowka, 0.1); g.lineWidth = Math.max(1, h * 0.02); g.stroke(tr);
      g.strokeStyle = c.buntownik ? 'rgba(20,10,10,0.9)' : 'rgba(240,236,226,0.95)'; g.lineWidth = Math.max(1, h * 0.022);
      g.beginPath(); g.moveTo(tx, ty - hh * 0.42); g.lineTo(tx, ty + hh * 0.5); g.moveTo(tx - w * 0.7, ty - hh * 0.12); g.lineTo(tx + w * 0.7, ty - hh * 0.12); g.stroke();
      if (!m.prosto) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(tx + w * 0.35, ty - hh * 0.25, w * 0.35, hh * 0.18, -0.5, 0, TAU); g.fill(); }
    });
  }
}
