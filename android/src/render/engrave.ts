import { Sim } from '../sim/sim';
import { T, PASSABLE } from '../sim/tiles';
import { MEM_SPAN } from '../sim/world';
import { ustawienia, skalaRenderu } from '../core/settings-store';
import { Camera } from './camera';

import { TON_MAX, MATERIALY, MASA, type Kreskowanie } from '../nastawy/wyglad/rycina';

// materiały ryciny (ton, kąt, odstęp, krzyż, kropki, barwa) — nastawy/wyglad/rycina.ts
type Hatch = Kreskowanie;
/** Powyżej TONE_MAX linie zlewają się w kleks i cały kamień ma jedną wartość. */
const TONE_MAX = TON_MAX;
const H: Record<number, Hatch> = MATERIALY;
const BAZA: Record<number, [number, number, number]> = MASA;

/**
 * Barwa masy, barwa kreski i ton materiału na danej głębokości — do płynnych przejść
 * między materiałami (7 liczb od `o`). Te same wzory co w `rebuild`.
 */
function barwyMaterialu(mat: number, depth: number, wy: number, out: Float32Array, o: number): void {
  const dg = depth * depth * (3 - 2 * depth);
  const czerwien = Math.pow(depth, 1.9);
  const dk = 1 - depth * 0.16;
  const inkR = (228 - dg * 26 - czerwien * 48) * dk;
  const inkG = (218 - dg * 66 - czerwien * 92) * dk;
  const inkB = (202 - dg * 96 - czerwien * 74) * dk;
  const baza = BAZA[mat];
  out[o] = baza ? baza[0] : 16 + czerwien * 10;
  out[o + 1] = baza ? baza[1] : 12 + dg;
  out[o + 2] = baza ? baza[2] : 11 + (1 - dg) * 2;
  const hat = H[mat];
  const tint = hat && hat.tint;
  out[o + 3] = tint ? (tint[0] * 2 + inkR) / 3 : inkR;
  out[o + 4] = tint ? (tint[1] * 2 + inkG) / 3 : inkG;
  out[o + 5] = tint ? (tint[2] * 2 + inkB) / 3 : inkB;
  const pasmo = 0.94 + 0.12 * Math.sin(wy * 0.21 + Math.sin(wy * 0.043) * 2.1);
  out[o + 6] = hat ? hat.tone * (1 - depth * 0.12) * pasmo : 0.2;
}

/** Parametry kreski dla jednego materiału — liczone raz na kafel, nie raz na piksel. */
interface Kreska {
  mat: number; toneC: number; sp: number; cross: number; stip: number;
  tr: number; tg: number; tb: number; br: number; bg: number; bb: number;
}
const nowaKreska = (): Kreska => ({ mat: 0, toneC: 0, sp: 4.2, cross: 0.6, stip: 0, tr: 0, tg: 0, tb: 0, br: 0, bg: 0, bb: 0 });

/**
 * Rycina, nie mapa. Kafle idą przez sitodruk kreskowania: jasność materiału
 * decyduje o grubości linii, pamięć o tym, czy linia w ogóle się pojawi.
 */
export class Engraver {
  buf = document.createElement('canvas');
  private bctx = this.buf.getContext('2d', { alpha: false })!;
  private img!: ImageData;
  private data!: Uint8ClampedArray;
  /** Osobny bufor samych źródeł światła — tylko on idzie do poświaty. */
  emis = document.createElement('canvas');
  private ectx = this.emis.getContext('2d')!;
  private eimg!: ImageData;
  private edata!: Uint8ClampedArray;
  aw = 1; ah = 1; scale = 1;

  private noise = new Float32Array(256 * 256);
  /** Szum gładki — papier drze się płatami, nie pikselami. */
  private smooth = new Float32Array(256 * 256);
  private fresh = new Float32Array(1);
  private freshB = new Float32Array(1);
  /** Kąt kreskowania per kafel, wygładzany — twarde szwy między materiałami wyglądały jak dżins. */
  private angle = new Float32Array(1);
  private angleB = new Float32Array(1);
  private cosT = new Float32Array(257);
  private sinT = new Float32Array(257);
  private light = new Float32Array(1);
  /** Bliskość jaskini dla skały: 1 przy samej krawędzi, 0 w głębi masy. Z niej płaskorzeźba. */
  private bliskosc = new Float32Array(1);
  private odl = new Uint8Array(1);
  /** Poziom magmy i wody w kaflu 0..1 — z nich gładki brzeg zamiast schodków siatki. */
  private magmaP = new Float32Array(1);
  private wodaP = new Float32Array(1);
  /**
   * Twardość kafla (1 skała, 0 przejście) i kafel, jaki się rysuje (prawdziwy albo
   * zapamiętany). Twardość próbkowana w środkach kafli i interpolowana daje gładką
   * ścianę jaskini zamiast schodków siatki.
   */
  private sol = new Float32Array(1);
  private rys = new Uint8Array(1);
  /** Barwy materiałów (7 na kafel) i ich średnie w narożnikach kafli — z nich miękkie przejścia. */
  private matK = new Float32Array(7);
  private rogK = new Float32Array(7);
  private kraw = new Float32Array(14);
  /** 1 = kafel leży na styku materiałów i potrzebuje miękkiego przejścia. */
  private miek = new Uint8Array(1);
  private s9 = new Float32Array(9);
  private m9 = new Float32Array(9);
  private w9 = new Float32Array(9);
  private pA = nowaKreska();
  private pB = nowaKreska();
  private lw = 0; private lh = 0; private lx0 = 0; private ly0 = 0;

  constructor() {
    for (let i = 0; i <= 256; i++) {
      const a = -1.8 + (i / 256) * 3.6;
      this.cosT[i] = Math.cos(a);
      this.sinT[i] = Math.sin(a);
    }
    for (let i = 0; i < this.noise.length; i++) this.noise[i] = Math.random();
    const G = 32, cell = 256 / G;
    const grid = new Float32Array(G * G);
    for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const gx = x / cell, gy = y / cell;
        const x0 = Math.floor(gx) % G, y0 = Math.floor(gy) % G;
        const x1 = (x0 + 1) % G, y1 = (y0 + 1) % G;
        const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy);
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const a = grid[y0 * G + x0], b = grid[y0 * G + x1];
        const c = grid[y1 * G + x0], d = grid[y1 * G + x1];
        const top = a + (b - a) * sx, bot = c + (d - c) * sx;
        this.smooth[(y << 8) | x] = top + (bot - top) * sy;
      }
    }
  }

  resize(vw: number, vh: number): void {
    this.scale = skalaRenderu(vw);
    this.aw = Math.max(2, Math.ceil(vw / this.scale));
    this.ah = Math.max(2, Math.ceil(vh / this.scale));
    this.buf.width = this.aw; this.buf.height = this.ah;
    this.img = this.bctx.createImageData(this.aw, this.ah);
    this.data = this.img.data;
    this.emis.width = this.aw; this.emis.height = this.ah;
    this.eimg = this.ectx.createImageData(this.aw, this.ah);
    this.edata = this.eimg.data;
  }

  private n(x: number, y: number): number { return this.noise[((y & 255) << 8) | (x & 255)]; }

  /** Gładkie, rzadkie pole „słojów" skały — po nim skręca kreska rytownika. */
  private sloje(x: number, y: number): number {
    const fx = x * 0.05, fy = y * 0.05;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
    const a = this.n(ix, iy), b = this.n(ix + 1, iy), c = this.n(ix, iy + 1), d = this.n(ix + 1, iy + 1);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  }

  // ------------------------------------------------------------------ światło

  /** Światło jest wyłącznie diegetyczne: ogień, termika, biolumina. */
  private computeLight(sim: Sim, cam: Camera): void {
    const w = sim.world;
    const zoom = cam.zoom / this.scale;
    const tilesX = Math.ceil(this.aw / zoom) + 10;
    const tilesY = Math.ceil(this.ah / zoom) + 10;
    const x0 = Math.floor(cam.x - tilesX / 2), y0 = Math.floor(cam.y - tilesY / 2);
    if (this.lw !== tilesX || this.lh !== tilesY) {
      this.lw = tilesX; this.lh = tilesY;
      this.light = new Float32Array(tilesX * tilesY);
      this.fresh = new Float32Array(tilesX * tilesY);
      this.freshB = new Float32Array(tilesX * tilesY);
      this.angle = new Float32Array(tilesX * tilesY);
      this.angleB = new Float32Array(tilesX * tilesY);
      this.bliskosc = new Float32Array(tilesX * tilesY);
      this.odl = new Uint8Array(tilesX * tilesY);
      this.magmaP = new Float32Array(tilesX * tilesY);
      this.wodaP = new Float32Array(tilesX * tilesY);
      this.sol = new Float32Array(tilesX * tilesY);
      this.rys = new Uint8Array(tilesX * tilesY);
      this.matK = new Float32Array(tilesX * tilesY * 7);
      this.rogK = new Float32Array(tilesX * tilesY * 7);
      this.miek = new Uint8Array(tilesX * tilesY);
    }
    this.lx0 = x0; this.ly0 = y0;
    const L = this.light, F = this.fresh;
    L.fill(0);

    for (let y = 0; y < tilesY; y++) {
      const wy = y0 + y;
      for (let x = 0; x < tilesX; x++) {
        const wx = x0 + x;
        const k = y * tilesX + x;
        if (!w.inb(wx, wy)) { F[k] = 0; this.magmaP[k] = 0; this.wodaP[k] = 0; continue; }
        const i = w.idx(wx, wy);
        const age = sim.tick - w.lastSeen[i];
        // to, co zrobiła twoja ręka, nie blaknie do zera
        const podstawa = wy <= w.surface[wx] + 1 ? 1 : (w.ever[i] ? Math.max(0, 1 - age / MEM_SPAN) : 0);
        F[k] = w.slad[i] ? Math.max(0.42, podstawa) : podstawa;
        const t = w.tile[i];
        const hh = H[t];
        this.magmaP[k] = w.magma[i] > 0 ? 0.55 + w.magma[i] / 8 * 0.45 : 0;
        this.wodaP[k] = w.water[i] > 0 && PASSABLE[t] === 1 ? 0.5 + w.water[i] / 8 * 0.5 : 0;
        // kierunek kreski skręca powoli razem ze skałą — jedna wspólna ukośna dla całej
        // góry robiła z rysunku tapetę w paski
        const skret = (this.sloje(wx, wy) - 0.5) * 0.72;
        this.angle[k] = w.magma[i] > 0 ? 1.57 : (w.water[i] > 0 && PASSABLE[t] === 1) ? 0.02
          : (hh ? hh.ang + (PASSABLE[t] === 1 ? 0 : skret) : 0.62 + skret);
        let e = 0;
        if (w.magma[i] > 0) e = 0.4 + w.magma[i] / 8 * 0.32;
        else if (t === T.FORGE) e = 0.85;
        else if (t === T.GLYPH) e = 0.8;
        else if (t === T.CORE) e = 0.5;
        else if (t === T.FUNGUS) e = 0.3;
        else if (t === T.CRYSTAL) e = 0.12;
        else if (t === T.SHRINE) e = 0.12;
        else if (wy < 16) e = Math.max(e, 0.22 - wy * 0.012);
        if (e > L[k]) L[k] = e;
      }
    }
    // odległość skały od najbliższej pustki (do 5 kafli) — dwa przejścia jak w mapie odległości
    const O = this.odl, B = this.bliskosc;
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const wx = x0 + x, wy = y0 + y;
        const k = y * tilesX + x;
        O[k] = !w.inb(wx, wy) ? 5 : PASSABLE[w.tile[w.idx(wx, wy)]] === 1 ? 0 : 5;
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      const fwd = pass === 0;
      for (let yy = 0; yy < tilesY; yy++) {
        const y = fwd ? yy : tilesY - 1 - yy;
        for (let xx = 0; xx < tilesX; xx++) {
          const x = fwd ? xx : tilesX - 1 - xx;
          const k = y * tilesX + x;
          let m = O[k];
          if (m === 0) continue;
          if (x > 0 && O[k - 1] + 1 < m) m = O[k - 1] + 1;
          if (x < tilesX - 1 && O[k + 1] + 1 < m) m = O[k + 1] + 1;
          if (y > 0 && O[k - tilesX] + 1 < m) m = O[k - tilesX] + 1;
          if (y < tilesY - 1 && O[k + tilesX] + 1 < m) m = O[k + tilesX] + 1;
          O[k] = m;
        }
      }
    }
    for (let k = 0; k < O.length; k++) B[k] = O[k] === 0 ? 1 : Math.max(0, (5 - O[k]) / 4);

    // kąt rozmywany razem z resztą — granica materiału ma być przejściem, nie szwem
    const AB = this.angleB, A = this.angle;
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const k = y * tilesX + x;
        let sum = A[k] * 2, cnt = 2;
        if (x > 0) { sum += A[k - 1]; cnt++; }
        if (x < tilesX - 1) { sum += A[k + 1]; cnt++; }
        if (y > 0) { sum += A[k - tilesX]; cnt++; }
        if (y < tilesY - 1) { sum += A[k + tilesX]; cnt++; }
        AB[k] = (sum / cnt) * 0.45 + A[k] * 0.55;
      }
    }
    A.set(AB);

    // najpierw domykanie: pojedyncze zapomniane kafle robiły z rysunku odrę,
    // a zapominać ma się całymi obszarami, nie punktami
    const FB = this.freshB;
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const k = y * tilesX + x;
        let m = F[k];
        if (x > 0 && F[k - 1] > m) m = F[k - 1];
        if (x < tilesX - 1 && F[k + 1] > m) m = F[k + 1];
        if (y > 0 && F[k - tilesX] > m) m = F[k - tilesX];
        if (y < tilesY - 1 && F[k + tilesX] > m) m = F[k + tilesX];
        FB[k] = m;
      }
    }
    F.set(FB);

    for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const k = y * tilesX + x;
        let sum = F[k] * 2, cnt = 2;
        if (x > 0) { sum += F[k - 1]; cnt++; }
        if (x < tilesX - 1) { sum += F[k + 1]; cnt++; }
        if (y > 0) { sum += F[k - tilesX]; cnt++; }
        if (y < tilesY - 1) { sum += F[k + tilesX]; cnt++; }
        FB[k] = sum / cnt;
      }
    }
    F.set(FB);
    }

    // co się rysuje: dobrze widziane — prawda, dawno widziane — pamięć, nieznane — lita skała
    const S = this.sol, R = this.rys;
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const k = y * tilesX + x;
        const wx = x0 + x, wy = y0 + y;
        // nad światem niebo ciągnie się dalej — bez tego nad powierzchnią wisiała linia krawędzi mapy
        if (wy < 0 && wx >= 0 && wx < w.w) { R[k] = T.SKY; S[k] = 0; continue; }
        if (!w.inb(wx, wy) || F[k] <= 0.01) { R[k] = T.ROCK; S[k] = 1; continue; }
        const i = w.idx(wx, wy);
        const t = F[k] > 0.82 ? w.tile[i] : w.mem[i];
        R[k] = t;
        S[k] = PASSABLE[t] === 1 ? 0 : 1;
      }
    }
    // barwy materiałów i ich średnie w narożnikach — tylko z litych kafli
    const MK = this.matK, RK = this.rogK;
    for (let y = 0; y < tilesY; y++) {
      const wy = y0 + y;
      const d = w.depth(wy);
      for (let x = 0; x < tilesX; x++) {
        const k = y * tilesX + x;
        if (S[k] === 1) barwyMaterialu(R[k], d, wy, MK, k * 7);
      }
    }
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const k = y * tilesX + x;
        let n = 0;
        const o = k * 7;
        for (let c = 0; c < 7; c++) RK[o + c] = 0;
        for (let dy = -1; dy <= 0; dy++) {
          for (let dx = -1; dx <= 0; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0) continue;
            const j = yy * tilesX + xx;
            if (S[j] !== 1) continue;
            n++;
            for (let c = 0; c < 7; c++) RK[o + c] += MK[j * 7 + c];
          }
        }
        if (n > 1) for (let c = 0; c < 7; c++) RK[o + c] /= n;
      }
    }
    const MI = this.miek;
    MI.fill(0);
    for (let y = 0; y < tilesY - 1; y++) {
      for (let x = 0; x < tilesX - 1; x++) {
        const k = y * tilesX + x;
        if (S[k] !== 1) continue;
        const o = k * 7, c10 = o + 7, c01 = o + tilesX * 7, c11 = c01 + 7;
        for (let c = 0; c < 7; c++) {
          const v = MK[o + c], e = c === 6 ? 0.01 : 1.5;
          if (Math.abs(RK[o + c] - v) > e || Math.abs(RK[c10 + c] - v) > e || Math.abs(RK[c01 + c] - v) > e || Math.abs(RK[c11 + c] - v) > e) { MI[k] = 1; break; }
        }
      }
    }

    // dwa przejścia zamiast prawdziwej propagacji — na oko nie widać różnicy
    for (let pass = 0; pass < 2; pass++) {
      const fwd = pass === 0;
      for (let yy = 0; yy < tilesY; yy++) {
        const y = fwd ? yy : tilesY - 1 - yy;
        for (let xx = 0; xx < tilesX; xx++) {
          const x = fwd ? xx : tilesX - 1 - xx;
          const k = y * tilesX + x;
          const wx = x0 + x, wy = y0 + y;
          const att = w.inb(wx, wy) && PASSABLE[w.tile[w.idx(wx, wy)]] === 1 ? 0.085 : 0.30;
          let m = L[k];
          if (x > 0) m = Math.max(m, L[k - 1] - att);
          if (x < tilesX - 1) m = Math.max(m, L[k + 1] - att);
          if (y > 0) m = Math.max(m, L[k - tilesX] - att);
          if (y < tilesY - 1) m = Math.max(m, L[k + tilesX] - att);
          L[k] = m;
        }
      }
    }
  }

  // ------------------------------------------------------------------ kreska

  rebuild(sim: Sim, cam: Camera, time: number): void {
    const w = sim.world;
    const data = this.data;
    const noise = this.noise, smooth = this.smooth;
    const aw = this.aw;
    const zoom = cam.zoom / this.scale;
    const left = cam.x - aw / 2 / zoom;
    const top = cam.y - this.ah / 2 / zoom;
    this.computeLight(sim, cam);

    const tx0 = Math.floor(left) - 1, ty0 = Math.floor(top) - 1;
    const tx1 = Math.ceil(left + aw / zoom) + 1, ty1 = Math.ceil(top + this.ah / zoom) + 1;
    const drift = time * 0.00004;
    const fala = time * 0.0016;                 // woda i magma płyną
    const edata = this.edata;
    edata.fill(0);
    // poziom szczegółu: z daleka płaski ton, z bliska pełne kreskowanie
    const far = zoom < 6 ? Math.max(0.55, zoom / 6) : 1;
    const plaski = zoom < 2.6;   // liczone w pikselach sztuki, nie ekranu
    // bliski plan: siatka rośnie razem z kaflem, żeby faktura nie zamieniła się w słoje
    const spWide = zoom < 6 ? 1.6 : Math.min(3.2, Math.max(1, zoom / 7));
    const kontrast = ustawienia.kontrast;
    const tetno = 0.5 + 0.5 * Math.sin(time * 0.0025);
    // faktura przyklejona do świata, nie do ekranu — przy przesuwaniu kamery kreska jedzie razem ze skałą
    const ox = Math.floor(left * zoom), oy = Math.floor(top * zoom);
    // kontur ściany: podłoga gruba i jasna — to na niej się stoi; strop i boki cieńsze
    const linie = zoom >= 1.6;
    const hwP = Math.max(0.95, zoom / 9), hwS = Math.max(0.55, zoom / 22);
    const S9 = this.s9, M9 = this.m9, W9 = this.w9;
    const pA = this.pA, pB = this.pB;
    const lw = this.lw;
    const F = this.fresh, L = this.light, A = this.angle, B = this.bliskosc, S = this.sol, R = this.rys;
    const MP = this.magmaP, WP = this.wodaP, MI = this.miek, RK = this.rogK;

    let depth = 0, pasmo = 1;
    let inkR = 0, inkG = 0, inkB = 0, rockR = 0, rockG = 0, rockB = 0;
    const ustaw = (P: Kreska, mat: number): void => {
      const hat = H[mat];
      P.mat = mat;
      P.tr = inkR; P.tg = inkG; P.tb = inkB;
      const baza = BAZA[mat];
      if (baza) { P.br = baza[0]; P.bg = baza[1]; P.bb = baza[2]; } else { P.br = rockR; P.bg = rockG; P.bb = rockB; }
      if (hat) {
        P.toneC = hat.tone * (1 - depth * 0.12) * pasmo;
        P.sp = hat.sp; P.cross = hat.cross; P.stip = hat.stipple;
        if (hat.tint) { P.tr = (hat.tint[0] * 2 + inkR) / 3; P.tg = (hat.tint[1] * 2 + inkG) / 3; P.tb = (hat.tint[2] * 2 + inkB) / 3; }
      } else { P.toneC = 0.2; P.sp = 4.2; P.cross = 0.6; P.stip = 0; }
      if (mat === T.CORE) { P.tr = 255; P.tg = 110 + tetno * 60; P.tb = 96; }
      P.sp *= spWide;
      P.toneC *= far;
    };
    /** Poziom cieczy w narożniku: średnia z przejść wokół — ściana nie obniża lustra. */
    const rog = (L: Float32Array, a: number, b: number, c: number, d: number): number => {
      const wa = 1 - S9[a], wb = 1 - S9[b], wc = 1 - S9[c], wd = 1 - S9[d];
      const den = wa + wb + wc + wd;
      return den > 0 ? (L[a] * wa + L[b] * wb + L[c] * wc + L[d] * wd) / den : 0;
    };

    for (let ty = ty0; ty <= ty1; ty++) {
      const py0 = Math.max(0, Math.round((ty - top) * zoom));
      const py1 = Math.min(this.ah, Math.round((ty + 1 - top) * zoom));
      if (py1 <= py0) continue;
      const inbY = ty >= 0 && ty < w.h;
      depth = w.depth(ty);

      // barwa atramentu: kość u góry, ochra w środku, czerwień dopiero na dnie
      const dg = depth * depth * (3 - 2 * depth);
      const czerwien = Math.pow(depth, 1.9);
      const dk = 1 - depth * 0.16;
      inkR = (228 - dg * 26 - czerwien * 48) * dk;
      inkG = (218 - dg * 66 - czerwien * 92) * dk;
      inkB = (202 - dg * 96 - czerwien * 74) * dk;
      // pustka jaskini: ciepły półmrok, głębiej chłodniejszy i rdzawy
      const airR = 36 + czerwien * 10, airG = 29 - dg * 8, airB = 25 - dg * 8;
      // lita skała: ciemna masa, na której dopiero kreska wydobywa kształt
      rockR = 16 + czerwien * 10; rockG = 12 + dg * 1; rockB = 11 + (1 - dg) * 2;
      pasmo = 0.94 + 0.12 * Math.sin(ty * 0.21 + Math.sin(ty * 0.043) * 2.1);
      const lr = 244 - depth * 50, lg = 234 - depth * 140, lb = 212 - depth * 150;

      for (let tx = tx0; tx <= tx1; tx++) {
        const px0 = Math.max(0, Math.round((tx - left) * zoom));
        const px1 = Math.min(aw, Math.round((tx + 1 - left) * zoom));
        if (px1 <= px0) continue;
        const inb = inbY && tx >= 0 && tx < w.w;
        const i = inb ? w.idx(tx, ty) : -1;

        // kafel w oknie pól pomocniczych (okno ma zapas, więc na ekranie zawsze jest wewnątrz)
        const kx = tx - this.lx0, ky = ty - this.ly0;
        const k = ky * lw + kx;
        const wOknie = kx >= 1 && ky >= 1 && kx < lw - 2 && ky < this.lh - 2;
        const f00 = wOknie ? F[k] : 0, f10 = wOknie ? F[k + 1] : 0;
        const f01 = wOknie ? F[k + lw] : 0, f11 = wOknie ? F[k + lw + 1] : 0;
        const known = f00 + f10 + f01 + f11;
        if (known <= 0.002) {
          // Nieznane jest ciemne, nie jasne: gra dzieje się w mroku, a pustka ma
          // ciągnąć oko mniej niż to, co widać.
          for (let py = py0; py < py1; py++) {
            const gy = py + oy;
            const row = py * aw, sy = (gy * 2) & 255, ny = gy & 255;
            for (let px = px0; px < px1; px++) {
              const gx = px + ox;
              const ziarno = smooth[(sy << 8) | ((gx * 2) & 255)] * 5 + noise[(ny << 8) | (gx & 255)] * 4;
              const o = (row + px) * 4;
              data[o] = 11 + ziarno; data[o + 1] = 9 + ziarno * 0.8; data[o + 2] = 8 + ziarno * 0.7; data[o + 3] = 255;
            }
          }
          continue;
        }
        const l00 = L[k], l10 = L[k + 1], l01 = L[k + lw], l11 = L[k + lw + 1];
        const a00 = A[k], a10 = A[k + 1], a01 = A[k + lw], a11 = A[k + lw + 1];
        const b00 = B[k], b10 = B[k + 1], b01 = B[k + lw], b11 = B[k + lw + 1];

        // otoczenie 3×3: twardość i ciecze — z nich gładka ściana i gładki brzeg jeziora
        let suma = 0, ciecz = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const kk = k + dy * lw;
          for (let dx = -1; dx <= 1; dx++) {
            const j = (dy + 1) * 3 + dx + 1;
            const s = S[kk + dx];
            S9[j] = s; suma += s;
            const m = MP[kk + dx], wo = WP[kk + dx];
            M9[j] = m; W9[j] = wo; ciecz += m + wo;
          }
        }
        const lity = S9[4] === 1;
        const brzegowy = suma > 0 && suma < 9;
        const cieczObok = ciecz > 0;
        let m00 = 0, m10 = 0, m01 = 0, m11 = 0, w00 = 0, w10 = 0, w01 = 0, w11 = 0;
        if (cieczObok) {
          m00 = rog(M9, 0, 1, 3, 4); m10 = rog(M9, 1, 2, 4, 5); m01 = rog(M9, 3, 4, 6, 7); m11 = rog(M9, 4, 5, 7, 8);
          w00 = rog(W9, 0, 1, 3, 4); w10 = rog(W9, 1, 2, 4, 5); w01 = rog(W9, 3, 4, 6, 7); w11 = rog(W9, 4, 5, 7, 8);
        }

        const tile = R[k];
        const water = inb ? w.water[i] : 0;
        const magma = inb ? w.magma[i] : 0;
        const slad = inb ? w.slad[i] : 0;                 // 1 = twój wykop, 2 = twój zawał
        const lustro = water > 0 && inb && ty > 0 && w.water[i - w.w] === 0;

        // miękkie przejście materiałów: w środku kafla jego własna barwa, przy krawędzi
        // średnia z sąsiadami — lita skała nie rozpada się na kwadraty
        const miekko = lity && MI[k] === 1;
        const c00 = k * 7, c10 = c00 + 7, c01 = (k + lw) * 7, c11 = c01 + 7;
        if (lity) ustaw(pA, tile);
        else if (brzegowy) {
          // skała wchodząca w róg pustego kafla bierze materiał sąsiada — najpierw podłogi
          const nb = S9[7] ? R[k + lw] : S9[3] ? R[k - 1] : S9[5] ? R[k + 1] : S9[1] ? R[k - lw]
            : S9[6] ? R[k + lw - 1] : S9[8] ? R[k + lw + 1] : S9[0] ? R[k - lw - 1] : R[k - lw + 1];
          ustaw(pB, nb);
        }
        const P = lity ? pA : pB;
        const pMat = P.mat, pSp = P.sp, pCross = P.cross, pStip = P.stip * 0.22;
        const pBr = P.br, pBg = P.bg, pBb = P.bb, pTr = P.tr, pTg = P.tg, pTb = P.tb, pTone = P.toneC;

        for (let py = py0; py < py1; py++) {
          const fy = (py / zoom + top) - ty;
          const gy = py + oy;
          const row = py * aw;
          const ny = gy & 255, ny2 = (gy + 71) & 255, ny3 = ((gy * 3 + 5) & 255), nyS = ((gy * 0.55) & 255), ny2b = ((gy * 2 + 29) & 255);
          const fyi = 1 - fy;
          const fa0 = f00 * fyi + f01 * fy, fa1 = f10 * fyi + f11 * fy;
          const la0 = l00 * fyi + l01 * fy, la1 = l10 * fyi + l11 * fy;
          const aa0 = a00 * fyi + a01 * fy, aa1 = a10 * fyi + a11 * fy;
          const ba0 = b00 * fyi + b01 * fy, ba1 = b10 * fyi + b11 * fy;
          // ćwiartka między środkami kafli, w której leży wiersz
          const qy = fy < 0.5 ? 0 : 3;
          const v = fy < 0.5 ? fy + 0.5 : fy - 0.5;
          const sv = v * v * (3 - 2 * v), dv = 6 * v * (1 - v);
          const wyq = (((ty + fy) * 4.3) | 0) & 255;
          const KR = this.kraw;
          if (miekko) {
            for (let c = 0; c < 7; c++) {
              KR[c] = RK[c00 + c] * fyi + RK[c01 + c] * fy;
              KR[7 + c] = RK[c10 + c] * fyi + RK[c11 + c] * fy;
            }
          }
          const ey = fy < 0.5 ? 1 - fy * 2 : fy * 2 - 1;

          for (let px = px0; px < px1; px++) {
            const fx = (px / zoom + left) - tx;
            const gx = px + ox;
            const o = (row + px) * 4;

            const ft = fa0 * (1 - fx) + fa1 * fx;
            const fr = ft <= 0.001 ? 0 : ft + (smooth[(nyS << 8) | ((gx * 0.35) & 255)] - 0.5) * 1.15;
            if (fr <= 0.06) {                            // Otchłań — ciemność bez rysunku
              const ziarno = smooth[(((gy * 2) & 255) << 8) | ((gx * 2) & 255)] * 5 + noise[(ny << 8) | (gx & 255)] * 4;
              data[o] = 11 + ziarno; data[o + 1] = 9 + ziarno * 0.8; data[o + 2] = 8 + ziarno * 0.7; data[o + 3] = 255;
              continue;
            }
            const lt = la0 * (1 - fx) + la1 * fx;
            const mem = fr < 1 ? fr : 1;

            // gładka ściana: twardość interpolowana między środkami kafli, z drżeniem rylca
            let skala = lity, linia = 0;
            if (brzegowy) {
              const qx = fx < 0.5 ? 0 : 1;
              const u = fx < 0.5 ? fx + 0.5 : fx - 0.5;
              const s00 = S9[qy + qx], s10 = S9[qy + qx + 1], s01 = S9[qy + 3 + qx], s11 = S9[qy + 4 + qx];
              const su = u * u * (3 - 2 * u);
              const gT = s00 + (s10 - s00) * su, gB = s01 + (s11 - s01) * su;
              const drzy = (smooth[(wyq << 8) | ((((tx + fx) * 4.3) | 0) & 255)] - 0.5) * 0.16;
              const sP = gT + (gB - gT) * sv + drzy;
              skala = sP > 0.5;
              if (linie) {
                const gu = ((s10 - s00) * (1 - sv) + (s11 - s01) * sv) * 6 * u * (1 - u);
                const gv = (gB - gT) * dv;
                const gr = Math.sqrt(gu * gu + gv * gv);
                if (gr > 0.02) {
                  const d = Math.abs(sP - 0.5) / gr * zoom;
                  const podloga = gv > 0 ? gv / gr : 0;    // twardość rośnie w dół: pod spodem skała
                  const hw = hwS + (hwP - hwS) * podloga * podloga;
                  linia = hw + 0.5 - d;
                  if (linia > 1) linia = 1;
                  if (linia > 0) linia *= (0.55 + 0.35 * podloga) * (mem < 0.7 ? mem / 0.7 : 1);
                }
              }
            }

            // ciecz tylko w pustce; o brzegu decyduje poziom uśredniony z sąsiadami, nie kafel
            let rodzaj = skala ? 1 : 0;
            if (!skala && cieczObok) {
              const mP = (m00 * (1 - fx) + m10 * fx) * (1 - fy) + (m01 * (1 - fx) + m11 * fx) * fy;
              const wP = (w00 * (1 - fx) + w10 * fx) * (1 - fy) + (w01 * (1 - fx) + w11 * fx) * fy;
              const brzeg = (smooth[(ny << 8) | ((gx * 2) & 255)] - 0.5) * 0.12;
              if (mP + brzeg > 0.3) rodzaj = 3;
              else if (wP + brzeg > 0.28 && magma === 0) rodzaj = 2;
            }
            let r: number, g: number, b: number;

            if (rodzaj === 3) {
              // magma: płynący żar — jaśniejsze żyły wędrują z czasem
              // dwie warstwy płynącego szumu i miękki próg — żyły zamiast pomarańczowych kwadratów
              // współrzędne obrócone względem siatki szumu — inaczej plamy układały się w kwadraty
              const plyn = smooth[((((gy * 0.62 - gx * 0.42 + fala * 40) | 0) & 255) << 8) | (((gx * 0.62 + gy * 0.42 + fala * 23) | 0) & 255)];
              const plyn2 = smooth[((((gy * 1.2 + gx * 0.75 - fala * 31) | 0) & 255) << 8) | (((gx * 1.2 - gy * 0.75 + fala * 17) | 0) & 255)];
              let zyla = (plyn * 0.62 + plyn2 * 0.38 - 0.4) * 3.4;
              zyla = zyla < 0 ? 0 : zyla > 1 ? 1 : zyla * zyla * (3 - 2 * zyla);
              zyla = 0.2 + zyla * 0.8;
              const moc = 0.55 + (magma || 4) / 8 * 0.45;
              r = 150 + 105 * moc * (0.6 + 0.4 * zyla); g = (60 + 150 * zyla) * moc - depth * 20; b = (20 + 60 * zyla * zyla) * moc;
              edata[o] = r; edata[o + 1] = g * 0.8; edata[o + 2] = b * 0.5; edata[o + 3] = 255;
            } else if (rodzaj === 2) {
              // woda: chłodna toń, poziome zmarszczki, jasne lustro na powierzchni
              const glab = (water || 3) / 8;
              r = 16 + lt * 30; g = 30 + lt * 26 - glab * 6; b = 38 + lt * 12 + glab * 10;
              const fal = Math.sin(gx * 0.35 + fala * 3 + ty * 1.7) * 0.8;
              const pas = ((gy + fal) % 4 + 4) % 4 < 1;
              if (pas && noise[(ny2 << 8) | (gx & 255)] > 0.25) { r += 34; g += 62; b += 70; }
              if (lustro && fy < 0.28) { const k = 1 - fy / 0.28; r += 150 * k; g += 170 * k; b += 170 * k; }
              r = r * (0.35 + 0.65 * mem); g = g * (0.35 + 0.65 * mem); b = b * (0.35 + 0.65 * mem);
            } else if (rodzaj === 1) {
              const mat = pMat;
              if (mat === T.CORE) {
                // rdzeń: serce, nie kamień — jasny środek i kręgi rozchodzące się z każdym uderzeniem
                const dxr = tx + fx - w.coreX - 0.5, dyr = ty + fy - w.coreY - 0.5;
                const dr = Math.sqrt(dxr * dxr + dyr * dyr);
                const krag = 0.5 + 0.5 * Math.sin(dr * 5 - time * 0.004);
                // okrągła kula w ciemnej skorupie, nie krzyż z kafli: brzeg kuli oddycha z tętnem
                const R = 1.55 + 0.18 * tetno;
                let kula = (R + 0.3 - dr) / 0.6;
                kula = kula < 0 ? 0 : kula > 1 ? 1 : kula * kula * (3 - 2 * kula);
                const srodek = Math.max(0, 1 - dr / 2.2);
                const pr = 120 + 130 * srodek + 40 * krag, pg = 20 + 80 * srodek * srodek + 20 * krag * srodek, pb = 28 + 56 * srodek * srodek;
                const blask = Math.max(0, 1 - dr / 3.6) * (0.5 + 0.5 * tetno);
                const sr = 30 + 70 * blask, sg = 10 + 12 * blask, sb = 12 + 12 * blask;
                r = sr + (pr - sr) * kula; g = sg + (pg - sg) * kula; b = sb + (pb - sb) * kula;
                edata[o] = r; edata[o + 1] = g * 0.6; edata[o + 2] = b * 0.6; edata[o + 3] = 255 * (0.25 + 0.6 * tetno) * (0.35 + 0.65 * kula);
              } else {
                // skała: ciemna masa, kreska gęstnieje i jaśnieje ku krawędzi jaskini
                const bl = ba0 * (1 - fx) + ba1 * fx;
                const ciem = 0.55 + 0.45 * mem;
                let kBr = pBr, kBg = pBg, kBb = pBb, kTr = pTr, kTg = pTg, kTb = pTb, kT = pTone;
                if (miekko) {
                  const ex = fx < 0.5 ? 1 - fx * 2 : fx * 2 - 1;
                  let t = ex > ey ? ex : ey;
                  t *= t;
                  const fxi = 1 - fx;
                  kBr += (KR[0] * fxi + KR[7] * fx - kBr) * t;
                  kBg += (KR[1] * fxi + KR[8] * fx - kBg) * t;
                  kBb += (KR[2] * fxi + KR[9] * fx - kBb) * t;
                  kTr += (KR[3] * fxi + KR[10] * fx - kTr) * t;
                  kTg += (KR[4] * fxi + KR[11] * fx - kTg) * t;
                  kTb += (KR[5] * fxi + KR[12] * fx - kTb) * t;
                  kT += ((KR[6] * fxi + KR[13] * fx) * far - kT) * t;
                }
                r = kBr * ciem + lt * 38; g = kBg * ciem + lt * 20; b = kBb * ciem + lt * 8;
                let tone = (kT * (0.3 + 1.0 * bl) + lt * 0.22) * (0.15 + 0.85 * mem) * kontrast;
                if (slad === 1) tone *= 1.3;
                else if (slad === 2) tone *= 0.7;
                if (tone > TONE_MAX) tone = TONE_MAX;
                if (plaski) {
                  // z daleka: gęsta ukośna kreska co cztery piksele — skała ma fakturę, pustka jest gładka
                  const k = Math.min(1, tone * 1.3) * (((gx + gy) & 3) === 0 ? 0.75 : 0.18);
                  r += (kTr - r) * k; g += (kTg - g) * k; b += (kTb - b) * k;
                } else if (tone > 0.02) {
                  const sp = pSp;
                  const angP = aa0 * (1 - fx) + aa1 * fx;
                  const ai = ((angP + 1.8) * 71.1) | 0;
                  const ca = this.cosT[ai < 0 ? 0 : ai > 256 ? 256 : ai];
                  const sa = this.sinT[ai < 0 ? 0 : ai > 256 ? 256 : ai];
                  const jit = (smooth[(ny2 << 8) | (gx & 255)] - 0.5) * sp * 0.28 + (noise[(ny << 8) | (gx & 255)] - 0.5) * 0.3;
                  const u = gx * ca + gy * sa + jit + drift * 12;
                  const grubosc = Math.max(1.1, tone * sp * 0.9);
                  let ink = ((u % sp) + sp) % sp < grubosc;
                  if (!ink && tone > pCross) {
                    const u2 = gx * -sa + gy * ca + jit;
                    ink = ((u2 % sp) + sp) % sp < (tone - pCross) * sp * 1.3;
                  }
                  if (!ink && pStip > 0 && noise[(ny2b << 8) | ((gx * 2 + 13) & 255)] < pStip * tone) ink = true;
                  // iskry w rudzie i krysztale: metal i szkło łapią światło
                  if ((mat === T.ORE || mat === T.CRYSTAL) && noise[(((gy * 5 + 7) & 255) << 8) | ((gx * 5 + 3) & 255)] > 0.996) {
                    r = 255; g = mat === T.ORE ? 230 : 244; b = mat === T.ORE ? 170 : 255;
                    if (mat === T.CRYSTAL) { edata[o] = 200; edata[o + 1] = 190; edata[o + 2] = 255; edata[o + 3] = 255; }
                    ink = false;
                  }
                  // pamiętane dawno: kreska rwie się w szkic
                  if (ink && mem < 0.9 && noise[(ny3 << 8) | ((gx + 33) & 255)] > 0.22 + mem * 0.78) ink = false;
                  if (ink) {
                    let cr = kTr, cg = kTg, cb = kTb;
                    if (mem < 0.8) {
                      const sz = (cr + cg + cb) / 3;
                      const ile = (0.8 - mem) / 0.8 * 0.8;
                      cr += (sz - cr) * ile; cg += (sz - cg) * ile; cb += (sz - cb) * ile;
                    }
                    // w głębi masy kreska ciemnieje — płaskorzeźba: bryła wychodzi ku jaskini
                    const k = Math.min(1, (0.3 + tone * 0.6 + bl * 0.45 + lt * 0.3) * (0.28 + 0.72 * mem));
                    r += (cr - r) * k; g += (cg - g) * k; b += (cb - b) * k;
                  }
                }
              }
            } else {
              // jaskinia: gładki półmrok z ledwie widoczną fakturą tylnej ściany;
              // jasność daje tylko światło — ogień, kuźnia, grzybnia
              const sciana = (smooth[((((gy * 0.7) | 0) & 255) << 8) | (((gx * 0.7) | 0) & 255)] - 0.5) * 12
                + (smooth[(ny2 << 8) | ((gx * 3) & 255)] - 0.5) * 4;
              const pam = 0.3 + 0.7 * mem;
              r = 11 + (airR - 11 + sciana + lt * 92) * pam;
              g = 9 + (airG - 9 + sciana * 0.85 + lt * 56) * pam;
              b = 8 + (airB - 8 + sciana * 0.7 + lt * 24) * pam;
              if (slad === 1) { r += 7; g += 5; b += 3; }
              // pył w powietrzu: rzadkie jasne ziarna
              if (!plaski && noise[(ny << 8) | ((gx * 3 + 17) & 255)] > 0.992 - lt * 0.01) { r += 30 * pam; g += 24 * pam; b += 18 * pam; }

              if (tile === T.FUNGUS) {
                // grzybnia: gęste kępy świecących zarodni, gęściej przy podłożu
                const z1 = noise[(((gy * 2 + 3) & 255) << 8) | ((gx * 2 + 91) & 255)];
                const gest = 0.28 + fy * 0.34;
                if (z1 < gest) {
                  const jas = z1 < gest * 0.35 ? 1 : 0.6;
                  const zr = (70 + 70 * jas) * pam, zg = (120 + 110 * jas) * pam, zb = (60 + 50 * jas) * pam;
                  r += (zr - r) * 0.85; g += (zg - g) * 0.85; b += (zb - b) * 0.85;
                  if (jas === 1) { edata[o] = zr * 0.8; edata[o + 1] = zg; edata[o + 2] = zb * 0.7; edata[o + 3] = 255; }
                }
              } else if (tile === T.BONES) {
                // kości: blade, krótkie kreski na dnie
                const k1 = noise[(((gy * 3 + 11) & 255) << 8) | ((gx + 57) & 255)];
                if (fy > 0.4 && k1 < 0.22) { r += (218 - r) * 0.8 * pam; g += (208 - g) * 0.8 * pam; b += (186 - b) * 0.8 * pam; }
              } else if (tile === T.WEB) {
                // sieć: cienkie nici na krzyż
                const n1 = ((gx + gy * 0.9) % 7 + 7) % 7 < 0.8, n2 = ((gx - gy * 1.1) % 9 + 9) % 9 < 0.8;
                if (n1 || n2) { r += (214 - r) * 0.55 * pam; g += (208 - g) * 0.55 * pam; b += (228 - b) * 0.55 * pam; }
              } else if (tile === T.NEST) {
                // gniazdo: kopczyk słomy i ziemi, gęstszy u dołu
                const n1 = noise[(((gy * 2 + 5) & 255) << 8) | ((gx * 2 + 23) & 255)];
                if (n1 < 0.1 + fy * 0.55) { r += (150 - r) * 0.7 * pam; g += (108 - g) * 0.7 * pam; b += (64 - b) * 0.7 * pam; }
              } else if (tile === T.GLYPH) {
                // ślad Znaku: złoty, promienisty
                const dx = fx - 0.5, dy2 = fy - 0.5;
                const d = Math.sqrt(dx * dx + dy2 * dy2);
                const prom = Math.abs(Math.sin(Math.atan2(dy2, dx) * 4)) > 0.8 && d < 0.48;
                if (d < 0.18 || prom) { r = 250; g = 214; b = 130; edata[o] = 250; edata[o + 1] = 214; edata[o + 2] = 120; edata[o + 3] = 255; }
              }
            }

            // kontur rylcem na granicy skały — w tym samym miejscu, w którym ściana naprawdę jest
            if (linia > 0) { r += (lr - r) * linia; g += (lg - g) * linia; b += (lb - b) * linia; }
            data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
            // do poświaty trafia tylko to, co naprawdę świeci
            if (rodzaj < 2 && lt > 0.25) {
              const moc = (lt - 0.25) / 0.75 * 0.7;
              if (moc * 255 > edata[o + 3]) { edata[o] = r * moc; edata[o + 1] = g * moc; edata[o + 2] = b * moc; edata[o + 3] = 255 * moc; }
            }
          }
        }
      }
    }
    this.bctx.putImageData(this.img, 0, 0);
    this.ectx.putImageData(this.eimg, 0, 0);
  }
}
