/**
 * PIEKŁO DANTEGO — wspólna atmosfera Kręgu Trzeciego (16.11, po uwadze użytkownika: „całość grafiki dużo mocniej
 * w klimacie piekła Dantego”). Pieśń VI: „Jestem w kręgu trzecim, deszczu wiecznego, przeklętego, zimnego i ciężkiego…
 * Grad gruby, woda brudna i śnieg przez ciemne powietrze się leje; cuchnie ziemia, która to przyjmuje”.
 *
 * Tu są rzeczy wspólne dla nieba, leja, przepaści, gruntu i trzewi:
 *  - tekstura burzowych chmur (raz, w pamięci): ciężki strop z wymionami, podświetlony od spodu łuną niższych kręgów;
 *  - tekstura mgły i wyziewów (smród gnijącego błota);
 *  - błyskawica: jeden zegar dla całego obrazu (niebo rozbłyska, tarasy leja i błoto na chwilę widać jak za dnia);
 *  - łuna z dna: czerwony blask niższych kręgów (miasto Dis), wolno dyszy.
 */
import { wolnoRuszac } from './nastroj';

export const los = (n: number): number => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const gladko = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Szum wartości 2D, powtarzalny w poziomie co `okresX` oczek (tekstury chmur zawijają się bez szwu). */
function szum2(x: number, y: number, okresX: number, ziarno: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const w = (i: number, j: number): number => los((((i % okresX) + okresX) % okresX) * 7919 + j * 104729 + ziarno * 1013);
  const a = w(xi, yi), b = w(xi + 1, yi), c = w(xi, yi + 1), d = w(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, okresX: number, ziarno: number, oktawy: number): number {
  let s = 0, a = 0.5, n = 0, f = 1;
  for (let o = 0; o < oktawy; o++) {
    s += a * szum2(x * f, y * f, okresX * f, ziarno + o * 17);
    n += a; a *= 0.5; f *= 2;
  }
  return s / n;
}

/** Jednowymiarowy szum (poszarpane grzbiety skał, krawędzie kałuż). */
export function szum1(x: number, ziarno = 0): number {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = los(i * 7919 + ziarno * 31), b = los((i + 1) * 7919 + ziarno * 31);
  return a + (b - a) * u;
}

// ---------------------------------------------------------------- chmury

const CHM_W = 512, CHM_H = 176;
let chmuryC: HTMLCanvasElement | null = null;

/**
 * Burzowy strop: gęsty u góry, w dół rwie się na wymiona (zwisające bulwy) i strzępy. Spody podświetlone łuną
 * z dołu (czerwień i żar), wierzchy sine. Zawija się w poziomie (rysowana z przesunięciem — chmury płyną).
 */
export function teksturaChmur(): HTMLCanvasElement | null {
  if (chmuryC) return chmuryC;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = CHM_W; c.height = CHM_H;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(CHM_W, CHM_H);
  const d = img.data;
  const ok = 8;                                 // oczek szumu na szerokość tekstury (najgrubsza oktawa)
  const sk = ok / CHM_W;
  const gest = new Float32Array(CHM_W * (CHM_H + 8));
  for (let y = 0; y < CHM_H + 8; y++) {
    const v = y / CHM_H;
    for (let x = 0; x < CHM_W; x++) {
      // zawirowanie domeny: kłęby, nie plamy
      const wx = fbm(x * sk * 1.3, y * sk * 1.3, ok * 1.3, 5, 3);
      const wy = fbm(x * sk * 1.3 + 7.3, y * sk * 1.3, ok * 1.3, 9, 3);
      let n = fbm(x * sk + (wx - 0.5) * 1.2, y * sk * 1.9 + (wy - 0.5) * 0.9, ok, 1, 5);
      // wymiona: bulwy wiszące pod stropem
      const bulwy = Math.max(0, Math.sin(x * sk * Math.PI * 2 * 1.5 + wx * 5)) * Math.max(0, Math.sin(v * Math.PI * 1.6 - 0.4));
      n += bulwy * 0.12;
      // strop gęsty u góry, w dół rzednie
      const profil = 1.25 - v * 1.05;
      gest[y * CHM_W + x] = n * profil;
    }
  }
  for (let y = 0; y < CHM_H; y++) {
    const v = y / CHM_H;
    for (let x = 0; x < CHM_W; x++) {
      const D = gest[y * CHM_W + x];
      const Dd = gest[(y + 6) * CHM_W + x];
      const a = gladko(0.38, 0.66, D);
      // spód kłębu (gęstość spada w dół) łapie czerwoną łunę; brzeg kłębu prześwituje żarem
      const spod = Math.max(0, Math.min(1, (D - Dd) * 6.5)) * (0.45 + 0.55 * v);
      const brzeg = (1 - gladko(0.42, 0.62, D)) * a;
      const wnetrze = gladko(0.5, 0.95, D);
      // grzbiety kłębów (gęstość rośnie w dół) — sine, od błysków i nieba nad lejem
      const wierzch = Math.max(0, Math.min(1, (Dd - D) * 4)) * (1 - v);
      const i = (y * CHM_W + x) * 4;
      // wierzch sino-grafitowy, w dół brunatny; spód i brzegi: krwawy żar
      const r0 = 34 + 46 * v, g0 = 30 + 12 * v, b0 = 38 + 2 * v;
      const cien = 1.15 - 0.6 * wnetrze;
      const zar = spod * 1.15 + brzeg * (0.35 + 0.5 * v);
      d[i] = Math.min(255, r0 * cien + 225 * zar + 40 * wierzch);
      d[i + 1] = Math.min(255, g0 * cien + 72 * zar + 42 * wierzch);
      d[i + 2] = Math.min(255, b0 * cien + 30 * zar + 52 * wierzch);
      d[i + 3] = Math.round(255 * a * (0.86 + 0.14 * wnetrze));
    }
  }
  g.putImageData(img, 0, 0);
  return (chmuryC = c);
}

/** Rysuje pas chmur: `y0`…`y1` na ekranie, przesunięcie `dx` (piksele, płynie), skala pozioma `sx`, krycie `a`. */
export function pasChmur(ctx: CanvasRenderingContext2D, W: number, y0: number, y1: number, dx: number, sx: number, a: number): void {
  const t = teksturaChmur();
  if (!t || y1 <= y0 || a <= 0) return;
  const h = y1 - y0;
  const w = (CHM_W * h / CHM_H) * sx;
  let x = -(((dx % w) + w) % w);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.imageSmoothingEnabled = true;
  for (; x < W; x += w) ctx.drawImage(t, x, y0, w + 1, h);
  ctx.restore();
}

// ---------------------------------------------------------------- mgła, wyziewy

const MGL_W = 256, MGL_H = 48;
let mglaC: HTMLCanvasElement | null = null;

/** Mgła przy ziemi: miękkie, poziome pasma (biała — barwi ją rysujący), zawija się w poziomie. */
export function teksturaMgly(): HTMLCanvasElement | null {
  if (mglaC) return mglaC;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = MGL_W; c.height = MGL_H;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(MGL_W, MGL_H);
  const d = img.data;
  for (let y = 0; y < MGL_H; y++) {
    const v = y / (MGL_H - 1);
    const pion = Math.sin(v * Math.PI) ** 1.4;
    for (let x = 0; x < MGL_W; x++) {
      const n = fbm(x / MGL_W * 6, y / MGL_H * 2.2, 6, 41, 4);
      const a = gladko(0.3, 0.8, n) * pion;
      const i = (y * MGL_W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.round(255 * a);
    }
  }
  g.putImageData(img, 0, 0);
  return (mglaC = c);
}

/** Pas mgły barwy `kolor` (CSS) od `y0` do `y1`, płynie o `dx`. */
export function pasMgly(ctx: CanvasRenderingContext2D, W: number, y0: number, y1: number, dx: number, kolor: string, a: number): void {
  const t = teksturaMgly();
  if (!t || y1 <= y0 || a <= 0) return;
  // barwienie: biała mgła na osobnym płótnie, raz na kolor
  let b = barwione.get(kolor);
  if (!b) {
    b = document.createElement('canvas');
    b.width = MGL_W; b.height = MGL_H;
    const g = b.getContext('2d')!;
    g.drawImage(t, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = kolor; g.fillRect(0, 0, MGL_W, MGL_H);
    barwione.set(kolor, b);
  }
  const h = y1 - y0, w = MGL_W * h / MGL_H * 3;
  let x = -(((dx % w) + w) % w);
  ctx.save();
  ctx.globalAlpha *= a;
  for (; x < W; x += w) ctx.drawImage(b, x, y0, w + 1, h);
  ctx.restore();
}
const barwione = new Map<string, HTMLCanvasElement>();

// ---------------------------------------------------------------- błyskawica i łuna

export interface Blysk {
  /** jasność błysku teraz (0…1) */
  a: number;
  /** numer błysku (ziarno kształtu pioruna) */
  nr: number;
  /** czas od początku błysku (s) */
  f: number;
  /** gdzie uderza (0…1 szerokości ekranu) */
  x: number;
}

const OKNO = 0.55;
/** Do podglądu (narzędzia, zrzuty): wymuszony błysk w chwili `f` (s od początku) albo null. */
export const BLYSK_TEST = { f: null as number | null, nr: 7, x: 0.42 };
if (typeof window !== 'undefined') {
  const okno = window as unknown as { __blyskTest?: typeof BLYSK_TEST; __blyskTesty?: (typeof BLYSK_TEST)[] };
  okno.__blyskTest = BLYSK_TEST;
  (okno.__blyskTesty ??= []).push(BLYSK_TEST);
}
let ostatniBlysk: Blysk = { a: 0, nr: -1, f: 99, x: 0.5 };
let ostatniT = -1;

/**
 * Błyskawice: zegar wspólny dla nieba, leja i błota. Bez ulewy też grzmi (rzadziej), w ulewie — co kilka sekund.
 * Każdy błysk: jasny strzał, przygaśnięcie, drugi strzał, powolne gaśnięcie.
 */
export function blyskawica(teraz: number, ulewa: number): Blysk {
  if (BLYSK_TEST.f !== null) return { a: profilBlysku(BLYSK_TEST.f), nr: BLYSK_TEST.nr, f: BLYSK_TEST.f, x: BLYSK_TEST.x };
  if (!wolnoRuszac()) return { a: 0, nr: -1, f: 99, x: 0.5 };
  const t = teraz / 1000;
  if (t === ostatniT) return ostatniBlysk;
  ostatniT = t;
  const szansa = 0.045 + 0.2 * ulewa;
  const k = Math.floor(t / OKNO);
  let wynik: Blysk = { a: 0, nr: -1, f: 99, x: 0.5 };
  for (let d = 0; d < 3; d++) {
    const kk = k - d;
    if (los(kk * 977 + 13) >= szansa) continue;
    const f = t - (kk * OKNO + los(kk * 31) * 0.2);
    if (f < 0 || f > 1.2) continue;
    const a = profilBlysku(f) * (0.6 + 0.4 * los(kk * 7));
    if (a > wynik.a) wynik = { a, nr: kk, f, x: 0.08 + los(kk * 53) * 0.84 };
  }
  ostatniBlysk = wynik;
  return wynik;
}

/** Jasność błysku po `f` sekundach: strzał, przygaśnięcie, drugi strzał, powolne gaśnięcie. */
function profilBlysku(f: number): number {
  if (f < 0) return 0;
  return f < 0.06 ? 1 : f < 0.1 ? 0.3 : f < 0.18 ? 0.9 : 0.9 * Math.exp(-(f - 0.18) * 4.5);
}

/** Łuna z dna leja (niższe kręgi, miasto Dis): 0,8…1, wolno dyszy. */
export function luna(teraz: number): number {
  if (!wolnoRuszac()) return 0.9;
  const t = teraz / 1000;
  return 0.86 + 0.08 * Math.sin(t * 0.55) + 0.05 * Math.sin(t * 1.7 + 1.3);
}

/**
 * Piorun: zygzak z gałęziami od (x0, y0) w dół do y1. `a` — jasność, `ziarno` — kształt, `gr` — grubość pnia.
 * Rysowany „lighter”: biały rdzeń i sina poświata.
 */
export function piorun(ctx: CanvasRenderingContext2D, x0: number, y0: number, y1: number, a: number, ziarno: number, gr: number): void {
  if (a <= 0.02) return;
  const galaz = (x: number, y: number, yk: number, kat: number, sila: number, n: number, gl: number): void => {
    const pts: [number, number][] = [[x, y]];
    let px = x, py = y;
    const krok = Math.max(6, (yk - y) / 14);
    let i = 0;
    while (py < yk && i < 40) {
      px += (los(ziarno * 131 + n * 977 + i * 17) - 0.5) * krok * 1.6 + Math.sin(kat) * krok * 0.5;
      py += krok * (0.6 + los(ziarno * 7 + n * 31 + i) * 0.8);
      pts.push([px, py]);
      if (gl < 3 && los(ziarno * 53 + n * 11 + i * 7) < 0.13) {
        galaz(px, py, py + (yk - py) * (0.3 + los(i + n) * 0.4), (los(i * 3 + n) - 0.5) * 2.4, sila * 0.55, n * 7 + i + 1, gl + 1);
      }
      i++;
    }
    for (const [szer, al, kol] of [[gr * 7 * sila, 0.12, '150,170,255'], [gr * 2.6 * sila, 0.35, '190,205,255'], [Math.max(1, gr * sila), 1, '250,252,255']] as [number, number, string][]) {
      ctx.strokeStyle = `rgba(${kol},${Math.min(1, a * al)})`;
      ctx.lineWidth = szer;
      ctx.beginPath();
      pts.forEach(([qx, qy], j) => (j ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy)));
      ctx.stroke();
    }
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  galaz(x0, y0, y1, 0, 1, 1, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- iskry i popiół

/**
 * Iskry z otchłani: drobiny żaru wznoszą się z dołu kadru i gasną (deszcz je dusi — nie dolatują wysoko).
 * `y0`…`y1` — pas ekranu, `n` — ile, `t` — sekundy.
 */
export function iskry(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, n: number, t: number, ziarno = 0): void {
  if (n <= 0 || y1 <= y0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const H = y1 - y0, W = x1 - x0;
  for (let i = 0; i < n; i++) {
    const v = 0.25 + los(i * 13 + ziarno) * 0.5;
    const f = ((t * v * 0.35 + los(i * 7 + ziarno)) % 1);
    const x = x0 + ((los(i * 3 + ziarno) * W + Math.sin(t * 1.3 + i) * 18 + t * 9) % W);
    const y = y1 - f * H;
    const zycie = Math.sin(f * Math.PI);
    const migot = 0.6 + 0.4 * Math.sin(t * 13 + i * 2.1);
    const r = 1 + los(i * 19 + ziarno) * 1.6;
    ctx.fillStyle = `rgba(255,${120 + (i % 3) * 40},${40 + (i % 2) * 30},${0.75 * zycie * migot})`;
    ctx.fillRect(x - r / 2, y - r / 2, r, r);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- ulewa na ekranie

let ulewaEkran = 0, ulewaT = -1;
/** Ulewa wygładzona w czasie (żeby deszcz i błyskawice nie skakały); `u` — ulewa z symulacji (0…1). */
export function wygladzUlewe(u: number, teraz: number): number {
  if (ulewaT < 0) { ulewaT = teraz; ulewaEkran = u; return u; }
  const dt = Math.max(0, Math.min(500, teraz - ulewaT));
  if (dt === 0) return ulewaEkran;
  ulewaT = teraz;
  ulewaEkran += (u - ulewaEkran) * (1 - Math.exp(-dt / 1200));
  return ulewaEkran;
}
