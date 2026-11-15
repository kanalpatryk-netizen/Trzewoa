import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { PROMIEN as P } from '../nastawy/katedra';
import { ukladKatedry } from './katedra';
import { wolnoRuszac } from './nastroj';

/**
 * PROMIEŃ Z ROZETY (Alpha 0.2) — światło, które pada z rozety katedry: w dół przez skrzyżowanie, przez otwór
 * w posadzce, szybem do sali i na ołtarz. Zamiast płaskiej smugi z dwóch trapezów (użytkownik, 23.10: „ten promień
 * światła wygląda niebotycznie sztucznie”) liczony piksel po pikselu w małym buforze i rozciągany na ekran:
 *  - brzeg jest miękki i rozmywa się tym mocniej, im dalej od otworu, przez który światło przeszło (rozeta, szyb);
 *  - w środku biegną smugi od maswerku rozety, tuż pod nią w barwach witraży, niżej coraz bledsze i szersze;
 *  - przez całą długość pasma mgły i pyłu, które powoli spływają w dół; szyb przycina promień do swoich ścian;
 *  - na balustradzie otworu i na posadzce sali — plama światła, na krzyżu ołtarza — blask.
 * Nastawy: PROMIEN w src/nastawy/katedra.ts. Mrok wzdłuż promienia wycina render/mrok.ts.
 */

/** Tani skrót liczby — stałe położenia pyłu (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const gladko = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Szum wartości 64×64, gładki i zawinięty — mgła w promieniu. */
const SZ = 64;
const szum = new Float32Array(SZ * SZ);
for (let i = 0; i < szum.length; i++) szum[i] = los(i * 7 + 3);
function mgla(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const x0 = xi & (SZ - 1), y0 = yi & (SZ - 1), x1 = (x0 + 1) & (SZ - 1), y1 = (y0 + 1) & (SZ - 1);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = szum[y0 * SZ + x0], b = szum[y0 * SZ + x1], c = szum[y1 * SZ + x0], d = szum[y1 * SZ + x1];
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}

/** Barwy smug pod rozetą (od lewej): witraże rozety — złoto, rubin, błękit, złoto w środku i z powrotem. */
const BARWY_SMUG: [number, number, number][] = [
  [255, 214, 140], [255, 176, 150], [176, 196, 255], [255, 226, 170], [176, 196, 255], [255, 176, 150], [255, 214, 140],
];
const BIEL: [number, number, number] = [255, 236, 200];

/** Profil smug w poprzek promienia (u od −1 do 1): ostry pod rozetą i rozmyty niżej — jasność i barwa. */
const PROFIL = 128;
const ostryJ = new Float32Array(PROFIL), ostryR = new Float32Array(PROFIL), ostryG = new Float32Array(PROFIL), ostryB = new Float32Array(PROFIL);
const mietyJ = new Float32Array(PROFIL);
function liczProfil(teraz: number, ruch: boolean): void {
  const n = P.smugi.ile;
  let sumaO = 0, sumaM = 0;
  for (let i = 0; i < PROFIL; i++) {
    const u = (i / (PROFIL - 1)) * 2 - 1;
    let jo = 0.42, jm = 0.6, r = 0, g = 0, b = 0;
    for (let k = 0; k < n; k++) {
      const uk = -0.86 + (1.72 * k) / (n - 1);
      const a = (k === (n >> 1) ? 1.15 : 0.85 + 0.3 * los(k * 5 + 1)) * (ruch ? 1 + P.smugi.migot * Math.sin(teraz * (0.0006 + 0.00025 * k) + k * 2.1) : 1);
      const d = (u - uk) / 0.085, dm = (u - uk) / 0.2;
      const e = a * Math.exp(-d * d), em = a * Math.exp(-dm * dm);
      jo += e; jm += em * 0.55;
      const c = BARWY_SMUG[k % BARWY_SMUG.length];
      r += e * c[0]; g += e * c[1]; b += e * c[2];
    }
    ostryJ[i] = jo; mietyJ[i] = jm;
    const w = 0.42 * BIEL[0] + r, wg = 0.42 * BIEL[1] + g, wb = 0.42 * BIEL[2] + b;
    ostryR[i] = w / jo; ostryG[i] = wg / jo; ostryB[i] = wb / jo;
    sumaO += jo; sumaM += jm;
  }
  // średnio jedna jasność — smugi przesuwają światło w poprzek, nie dokładają go
  const so = PROFIL / sumaO, sm = PROFIL / sumaM;
  for (let i = 0; i < PROFIL; i++) { ostryJ[i] *= so; mietyJ[i] *= sm; }
}

let bufor: HTMLCanvasElement | null = null;
let obraz: ImageData | null = null;

/** Promień z rozety — nad mrokiem (światło dodawane do obrazu). */
export function rysujPromien(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world;
  const k = ukladKatedry(w);
  if (!k || typeof document === 'undefined') return;
  const z = cam.zoom;
  const ruch = wolnoRuszac();
  // stacje promienia (y kafli): pod rozetą, posadzka katedry, wylot szybu w sali, posadzka sali nad ołtarzem
  const yR = k.rozeta.y, yK = k.posadzka, yS = w.szybDol, yP = w.oltarz.y + 1;
  const cx = k.cx, ax = w.oltarz.x + 0.5;
  const Sz = P.szerokosc, Ro = P.rozmycie, Ja = P.jasnosc;
  const marg = Sz.sala + Ro[3] + 0.3;
  const x0 = Math.min(cx, ax) - marg, x1 = Math.max(cx, ax) + marg, y0 = yR - 0.2, y1 = yP + 0.2;
  const sx0 = cam.toScreenX(x0), sy0 = cam.toScreenY(y0), sw = (x1 - x0) * z, sh = (y1 - y0) * z;
  if (sx0 + sw < 0 || sy0 + sh < 0 || sx0 > cam.vw || sy0 > cam.vh) return;

  const R = P.rozdzielczosc;
  const W = Math.ceil((x1 - x0) * R), H = Math.ceil((y1 - y0) * R);
  if (!bufor) bufor = document.createElement('canvas');
  if (bufor.width !== W || bufor.height !== H) { bufor.width = W; bufor.height = H; obraz = null; }
  const g = bufor.getContext('2d')!;
  if (!obraz) obraz = g.createImageData(W, H);
  const d = obraz.data;
  liczProfil(teraz, ruch);
  const t = ruch ? teraz / 1000 : 0;
  const splyw = t * P.mgla.splyw;
  const oddech = ruch ? 0.96 + 0.04 * Math.sin(teraz * 0.00031) * Math.sin(teraz * 0.00017 + 1) : 1;
  const sm = P.mgla.sila;

  for (let j = 0; j < H; j++) {
    const y = y0 + (j + 0.5) / R;
    // parametry wiersza: środek, pół szerokości, rozmycie brzegu, jasność, barwa witraży i kontrast smug, przycięcie
    let c = cx, hw: number, s: number, jas: number, barwa: number, kontrast: number, cl = -1e9, cr = 1e9;
    if (y < yK) {
      const f = (y - yR) / (yK - yR);
      hw = lerp(Sz.rozeta, Sz.posadzka, f); s = lerp(Ro[0], Ro[1], f); jas = lerp(Ja[0], Ja[1], f);
      barwa = lerp(1, 0.3, f); kontrast = lerp(P.smugi.kontrastGora, 0.4, f);
      // światło wychodzi z całej rozety — u góry promień narasta od jej środka
      jas *= gladko(yR - 0.6, yR + 1.1, y);
    } else if (y < yS) {
      const f = (y - yK) / (yS - yK);
      // w szybie: jaśniejszy środek, przy ścianach przygasa — promień w szybie, nie świecąca rura
      hw = (k.otwor.x1 - k.otwor.x0) / 2; s = Ro[1]; jas = lerp(Ja[1], Ja[2], f);
      barwa = lerp(0.3, 0.08, f); kontrast = lerp(0.4, 0.28, f);
      cl = k.otwor.x0; cr = k.otwor.x1;
    } else {
      const f = (y - yS) / (yP - yS);
      c = lerp(cx, ax, f);
      hw = lerp((k.otwor.x1 - k.otwor.x0) / 2, Sz.sala, f); s = lerp(Ro[2], Ro[3], f); jas = lerp(Ja[2], Ja[3], f);
      barwa = lerp(0.08, 0, f); kontrast = lerp(0.28, P.smugi.kontrastDol, f);
      // przy posadzce sali światło kończy się na podłodze
      jas *= 1 - gladko(yP - 0.25, yP + 0.05, y);
    }
    jas *= oddech;
    const mieszaj = gladko(0, 1, (y - yR) / 6);       // im dalej od rozety, tym smugi bardziej rozmyte
    const row = j * W * 4;
    for (let i = 0; i < W; i++) {
      const x = x0 + (i + 0.5) / R;
      const o = row + i * 4;
      let v = gladko(hw + s, hw - s, Math.abs(x - c));
      if (v > 0 && (x < cl || x > cr)) v *= gladko(0.12, 0, x < cl ? cl - x : x - cr);
      if (v <= 0.002) { d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = 255; continue; }
      const u = Math.max(-1, Math.min(1, (x - c) / hw));
      const pi = Math.round((u + 1) * 0.5 * (PROFIL - 1));
      const smuga = lerp(ostryJ[pi], mietyJ[pi], mieszaj);
      const swiatlo = v * jas * (1 + kontrast * (smuga - 1)) * (1 - sm / 2 + sm * mgla(x * 0.9, (y - splyw) * 0.32))
        * (0.92 + 0.16 * mgla(x * 0.35 + 17, (y - splyw * 0.6) * 0.09 + 5));
      const b = barwa * (1 - mieszaj * 0.5);
      const r = lerp(BIEL[0], ostryR[pi], b), gg = lerp(BIEL[1], ostryG[pi], b), bb = lerp(BIEL[2], ostryB[pi], b);
      const drz = los(o) - 0.5;                         // drżenie: bez schodków w gradiencie
      d[o] = Math.max(0, Math.min(255, r * swiatlo + drz));
      d[o + 1] = Math.max(0, Math.min(255, gg * swiatlo + drz));
      d[o + 2] = Math.max(0, Math.min(255, bb * swiatlo + drz));
      d[o + 3] = 255;
    }
  }
  g.putImageData(obraz, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bufor, sx0, sy0, sw, sh);

  // plamy: na balustradzie otworu w katedrze i na posadzce sali, blask na krzyżu ołtarza
  plama(ctx, cam.toScreenX(cx), cam.toScreenY(yK - 0.45), z * 2.5, z * 0.75, 'rgba(255,226,176,0.16)');
  plama(ctx, cam.toScreenX(ax), cam.toScreenY(yP - 0.05), z * 3.3, z * 0.55, 'rgba(255,230,180,0.3)');
  const krzyzY = cam.toScreenY(yP) - z * 2.6;
  plama(ctx, cam.toScreenX(ax), krzyzY, z * 2.4, z * 2.4, 'rgba(255,236,190,0.13)');

  // pył: drobiny opadają powoli i krążą na boki, w szybie trzymają się jego ścian
  const ile = P.pyl.ile, dl = yP - yR;
  for (let n = 0; n < ile; n++) {
    const f = ((los(n * 3) + (ruch ? (teraz / 1000) * P.pyl.opad * (0.5 + los(n * 5)) / dl : 0)) % 1);
    const y = yR + 0.8 + f * (dl - 1);
    const wSzybie = y >= yK && y < yS;
    const hwy = y < yK ? Sz.rozeta : y < yS ? (k.otwor.x1 - k.otwor.x0) / 2 - 0.15 : lerp((k.otwor.x1 - k.otwor.x0) / 2, Sz.sala, (y - yS) / (yP - yS));
    const cy = y < yS ? cx : lerp(cx, ax, (y - yS) / (yP - yS));
    let x = cy + (los(n * 7) * 2 - 1) * hwy * 0.85 + (ruch ? Math.sin(teraz * 0.0006 + n * 1.3) * 0.25 : 0);
    if (wSzybie) x = Math.max(k.otwor.x0 + 0.1, Math.min(k.otwor.x1 - 0.1, x));
    const mig = ruch ? 0.5 + 0.5 * Math.sin(teraz * (0.002 + 0.002 * los(n * 11)) + n) : 0.7;
    const al = 0.55 * mig * Math.sin(f * Math.PI) ** 0.5;
    if (al < 0.03) continue;
    ctx.fillStyle = `rgba(255,246,222,${al})`;
    ctx.beginPath(); ctx.arc(cam.toScreenX(x), cam.toScreenY(y), Math.max(0.6, z * (0.03 + 0.025 * los(n * 13))), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Miękka eliptyczna plama światła. */
function plama(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, barwa: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, barwa); g.addColorStop(1, 'rgba(255,230,180,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
