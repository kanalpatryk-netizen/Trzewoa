import { Sim } from '../sim/sim';
import { T, PASSABLE } from '../sim/tiles';
import { MEM_SPAN } from '../sim/world';
import { ustawienia, skalaRenderu } from '../core/settings-store';
import { Camera } from './camera';



interface Hatch { tone: number; ang: number; sp: number; cross: number; stipple: number; tint: [number, number, number] | null; }

/**
 * Rycina żyje w półtonach. Ton to udział atramentu w kafelku i nigdy nie sięga
 * jedynki — powyżej TONE_MAX linie zlewają się w kleks i cały kamień ma jedną wartość.
 */
const TONE_MAX = 0.62;

const H: Record<number, Hatch> = {
  [T.SOIL]:    { tone: 0.24, ang: 1.22, sp: 4.8, cross: 0.4, stipple: 0, tint: [214, 180, 132] },
  [T.ROCK]:    { tone: 0.17, ang: 0.62, sp: 5.8, cross: 0.34, stipple: 0, tint: [212, 206, 190] },
  [T.ORE]:     { tone: 0.5, ang: 0.62, sp: 6.2, cross: 0.55, stipple: 0.18, tint: [236, 206, 140] },
  [T.CRYSTAL]: { tone: 0.44, ang: -0.55, sp: 7.4, cross: 0.66, stipple: 0.3, tint: [232, 228, 236] },
  [T.STONE]:   { tone: 0.19, ang: 1.62, sp: 6.0, cross: 0.55, stipple: 0.04, tint: [186, 194, 200] },
  [T.FUNGUS]:  { tone: 0.64, ang: 0.20, sp: 4.8, cross: 0.5, stipple: 0.55, tint: [150, 214, 118] },
  [T.BONES]:   { tone: 0.5, ang: 0.90, sp: 5.4, cross: 0.60, stipple: 0.35, tint: [226, 218, 196] },
  [T.SHRINE]:  { tone: 0.66, ang: 1.57, sp: 3.6, cross: 0.44, stipple: 0.20, tint: [230, 198, 140] },
  [T.FORGE]:   { tone: 0.7, ang: 1.57, sp: 3.6, cross: 0.40, stipple: 0.30, tint: [255, 158, 70] },
  [T.NEST]:    { tone: 0.6, ang: 0.35, sp: 4.2, cross: 0.50, stipple: 0.45, tint: [204, 170, 120] },
  [T.WEB]:     { tone: 0.18, ang: 0.79, sp: 3.4, cross: 0.30, stipple: 0.12, tint: [222, 220, 228] },
  [T.CORE]:    { tone: 0.60, ang: 1.10, sp: 3.0, cross: 0.34, stipple: 0.50, tint: [226, 74, 74] },
  [T.GLYPH]:   { tone: 0.56, ang: 0.00, sp: 3.4, cross: 0.36, stipple: 0.55, tint: [246, 214, 130] },
  [T.SKY]:     { tone: 0.07, ang: 1.57, sp: 9.0, cross: 0.95, stipple: 0, tint: [176, 178, 172] },
};

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
    const tilesX = Math.ceil(this.aw / zoom) + 6;
    const tilesY = Math.ceil(this.ah / zoom) + 6;
    const x0 = Math.floor(cam.x - tilesX / 2), y0 = Math.floor(cam.y - tilesY / 2);
    if (this.lw !== tilesX || this.lh !== tilesY) {
      this.lw = tilesX; this.lh = tilesY;
      this.light = new Float32Array(tilesX * tilesY);
      this.fresh = new Float32Array(tilesX * tilesY);
      this.freshB = new Float32Array(tilesX * tilesY);
      this.angle = new Float32Array(tilesX * tilesY);
      this.angleB = new Float32Array(tilesX * tilesY);
    }
    this.lx0 = x0; this.ly0 = y0;
    const L = this.light, F = this.fresh;
    L.fill(0);

    for (let y = 0; y < tilesY; y++) {
      const wy = y0 + y;
      for (let x = 0; x < tilesX; x++) {
        const wx = x0 + x;
        const k = y * tilesX + x;
        if (!w.inb(wx, wy)) { F[k] = 0; continue; }
        const i = w.idx(wx, wy);
        const age = sim.tick - w.lastSeen[i];
        // to, co zrobiła twoja ręka, nie blaknie do zera
        const podstawa = wy <= w.surface[wx] + 1 ? 1 : (w.ever[i] ? Math.max(0, 1 - age / MEM_SPAN) : 0);
        F[k] = w.slad[i] ? Math.max(0.42, podstawa) : podstawa;
        const t = w.tile[i];
        const hh = H[t];
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

  private sampleF(tx: number, ty: number): number {
    const x = tx - this.lx0, y = ty - this.ly0;
    if (x < 0 || y < 0 || x >= this.lw || y >= this.lh) return 0;
    return this.fresh[y * this.lw + x];
  }
  private sampleL(tx: number, ty: number): number {
    const x = tx - this.lx0, y = ty - this.ly0;
    if (x < 0 || y < 0 || x >= this.lw || y >= this.lh) return 0;
    return this.light[y * this.lw + x];
  }
  private sampleA(tx: number, ty: number): number {
    const x = tx - this.lx0, y = ty - this.ly0;
    if (x < 0 || y < 0 || x >= this.lw || y >= this.lh) return 0.62;
    return this.angle[y * this.lw + x];
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
    const edata = this.edata;
    edata.fill(0);
    // poziom szczegółu: z daleka płaski ton, z bliska pełne kreskowanie
    const far = zoom < 6 ? Math.max(0.55, zoom / 6) : 1;
    const plaski = zoom < 2.6;   // liczone w pikselach sztuki, nie ekranu
    // bliski plan: siatka rośnie razem z kaflem, żeby faktura nie zamieniła się w słoje
    const spWide = zoom < 6 ? 1.6 : Math.min(3.2, Math.max(1, zoom / 7));

    for (let ty = ty0; ty <= ty1; ty++) {
      const py0 = Math.max(0, Math.round((ty - top) * zoom));
      const py1 = Math.min(this.ah, Math.round((ty + 1 - top) * zoom));
      if (py1 <= py0) continue;
      const inbY = ty >= 0 && ty < w.h;
      const depth = w.depth(ty);

      // barwa atramentu: im głębiej, tym mniej koloru zostaje w rysunku
      // barwa atramentu: kość u góry, ochra w środku, czerwień dopiero na dnie.
      // Liniowe przejście robiło z całej góry jeden brąz — stąd krzywa.
      const dg = depth * depth * (3 - 2 * depth);          // wygładzenie
      const czerwien = Math.pow(depth, 1.9);
      const dk = 1 - depth * 0.16;
      const inkR = (228 - dg * 26 - czerwien * 48) * dk;
      const inkG = (218 - dg * 66 - czerwien * 92) * dk;
      const inkB = (202 - dg * 96 - czerwien * 74) * dk;
      const voidR = 16 + depth * 16, voidG = 13 - depth * 6, voidB = 12 - depth * 6;

      for (let tx = tx0; tx <= tx1; tx++) {
        const px0 = Math.max(0, Math.round((tx - left) * zoom));
        const px1 = Math.min(aw, Math.round((tx + 1 - left) * zoom));
        if (px1 <= px0) continue;
        const inb = inbY && tx >= 0 && tx < w.w;
        const i = inb ? w.idx(tx, ty) : -1;

        const f00 = this.sampleF(tx, ty), f10 = this.sampleF(tx + 1, ty);
        const f01 = this.sampleF(tx, ty + 1), f11 = this.sampleF(tx + 1, ty + 1);
        const l00 = this.sampleL(tx, ty), l10 = this.sampleL(tx + 1, ty);
        const l01 = this.sampleL(tx, ty + 1), l11 = this.sampleL(tx + 1, ty + 1);
        const a00 = this.sampleA(tx, ty), a10 = this.sampleA(tx + 1, ty);
        const a01 = this.sampleA(tx, ty + 1), a11 = this.sampleA(tx + 1, ty + 1);
        const known = f00 + f10 + f01 + f11;
        if (known <= 0.002) {
          // Nieznane jest ciemne, nie jasne: gra dzieje się w mroku, a pustka ma
          // ciągnąć oko mniej niż to, co widać.
          for (let py = py0; py < py1; py++) {
            const row = py * aw, sy = (py * 2) & 255, ny = py & 255;
            for (let px = px0; px < px1; px++) {
              const ziarno = smooth[(sy << 8) | ((px * 2) & 255)] * 5 + noise[(ny << 8) | (px & 255)] * 4;
              const o = (row + px) * 4;
              data[o] = 13 + ziarno; data[o + 1] = 10 + ziarno * 0.8; data[o + 2] = 9 + ziarno * 0.7; data[o + 3] = 255;
            }
          }
          continue;
        }

        const fAvg = known * 0.25;
        const tile = inb ? (fAvg > 0.82 ? w.tile[i] : w.mem[i]) : T.ROCK;
        const water = inb ? w.water[i] : 0;
        const magma = inb ? w.magma[i] : 0;
        const hat = H[tile];
        const passable = PASSABLE[tile] === 1;

        // parametry kreski liczone raz na kafel, nie raz na piksel
        let toneC = 0, toneK = 0, sp = 4.2, cross = 0.6, stip = 0;
        const slad = inb ? w.slad[i] : 0;                 // 1 = twój wykop, 2 = twój zawał
        let tr = inkR, tg = inkG, tb = inkB;
        let air = false;
        if (magma > 0) {
          toneC = 0.55 + magma / 8 * 0.22;              // ogień ma grzać, nie zaślepiać
          sp = 3.0; cross = 0.9; stip = 0.3;
          tr = 255; tg = 150 - depth * 40; tb = 60 - depth * 40;
        } else if (water > 0 && passable) {
          toneC = 0.38 + water / 8 * 0.3;               // woda ma się wybijać także przy oddaleniu
          sp = 4.6; cross = 0.95; stip = 0.05;
          tr = inkR * 0.9; tg = inkG * 0.95; tb = inkB;
          // lustro wody: kafel bez wody nad sobą dostaje jasną, drgającą linię
          const nadWoda = inb && ty > 0 ? w.water[i - w.w] : 0;
          if (nadWoda === 0) { toneC = Math.min(0.68, toneC + 0.28); tr = 252; tg = 248; tb = 236; }
        } else if (hat) {
          // pasma osadowe: powolna zmiana tonu z głębokością, żeby skała miała warstwy
          const pasmo = 0.94 + 0.12 * Math.sin(ty * 0.21 + Math.sin(ty * 0.043) * 2.1);
          toneC = hat.tone * (1 - depth * 0.18) * pasmo; toneK = 0.30;
          sp = hat.sp; cross = hat.cross; stip = hat.stipple;
          if (hat.tint) {
            // odcień materiału mieszany z barwą głębi, żeby dno i tak czerwieniało
            tr = (hat.tint[0] + inkR) / 2; tg = (hat.tint[1] + inkG) / 2; tb = (hat.tint[2] + inkB) / 2;
          }
        } else if (passable) {
          air = true;
          toneC = 0.11; toneK = 0.34;               // pustka też ma fakturę — inaczej jest dziurą
          sp = 8.5; cross = 0.95; stip = 0;
        }
        sp *= spWide;
        toneC *= far;
        const stipT = stip * 0.22;

        for (let py = py0; py < py1; py++) {
          const fy = (py / zoom + top) - ty;
          const row = py * aw;
          const ny = py & 255, ny2 = (py + 71) & 255, ny3 = ((py * 3 + 5) & 255), nyS = ((py * 0.55) & 255), ny2b = ((py * 2 + 29) & 255);
          const fyi = 1 - fy;
          const fa0 = f00 * fyi + f01 * fy, fa1 = f10 * fyi + f11 * fy;
          const la0 = l00 * fyi + l01 * fy, la1 = l10 * fyi + l11 * fy;
          const aa0 = a00 * fyi + a01 * fy, aa1 = a10 * fyi + a11 * fy;

          for (let px = px0; px < px1; px++) {
            const fx = (px / zoom + left) - tx;
            const o = (row + px) * 4;

            const ft = fa0 * (1 - fx) + fa1 * fx;
            const fr = ft <= 0.001 ? 0 : ft + (smooth[(nyS << 8) | ((px * 0.35) & 255)] - 0.5) * 1.15;
            if (fr <= 0.06) {                            // Otchłań — ciemność bez rysunku
              const ziarno = smooth[(((py * 2) & 255) << 8) | ((px * 2) & 255)] * 5 + noise[(ny << 8) | (px & 255)] * 4;
              data[o] = 13 + ziarno; data[o + 1] = 10 + ziarno * 0.8; data[o + 2] = 9 + ziarno * 0.7; data[o + 3] = 255;
              continue;
            }

            const lt = la0 * (1 - fx) + la1 * fx;
            const mem = fr < 1 ? fr : 1;
            // znana pustka musi być jaśniejsza od nieznanego, inaczej wszystko zlewa się w czerń
            const rozpoznane = passable ? 24 * mem : 0;
            let r = voidR + rozpoznane + lt * 26, g = voidG + rozpoznane * 0.85 + lt * 12, b = voidB + rozpoznane * 0.7 + lt * 4;
            let tone = (toneC + lt * toneK) * (0.12 + 0.88 * mem) * ustawienia.kontrast;
            // wykop jaśniejszy, zawał ciemniejszy — po tym poznajesz własną robotę
            if (slad === 1) tone *= 1.35;
            else if (slad === 2) tone *= 0.72;
            if (tone > TONE_MAX) tone = TONE_MAX;

            if (plaski) {
              // z daleka rysujemy sam ton materiału — kreska i tak by się zlała w szum
              if (tone > 0.02) {
                const k = Math.min(1, tone * 1.5) * (0.3 + 0.7 * mem);
                let cr = tr, cg = tg, cb = tb;
                if (air) { const dk = (1 - lt); cr = 150 - dk * 90; cg = 120 - dk * 80; cb = 90 - dk * 50; }
                r = r + (cr - r) * k; g = g + (cg - g) * k; b = b + (cb - b) * k;
              }
              data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
              if (lt > 0.2 || magma > 0) {
                const moc = magma > 0 ? 1 : (lt - 0.2) / 0.8;
                edata[o] = r * moc; edata[o + 1] = g * moc; edata[o + 2] = b * moc; edata[o + 3] = 255 * moc;
              }
              continue;
            }

            if (tone > 0.02) {
              const angP = aa0 * (1 - fx) + aa1 * fx;
              const ai = ((angP + 1.8) * 71.1) | 0;
              const ca = this.cosT[ai < 0 ? 0 : ai > 256 ? 256 : ai];
              const sa = this.sinT[ai < 0 ? 0 : ai > 256 ? 256 : ai];
              const jit = (smooth[(ny2 << 8) | (px & 255)] - 0.5) * sp * 0.28 + (noise[(ny << 8) | (px & 255)] - 0.5) * 0.3;
              const u = px * ca + py * sa + jit + drift * 12;
              const grubosc = Math.max(1.15, tone * sp * 0.92);
              let ink = ((u % sp) + sp) % sp < grubosc;
              if (!ink && tone > cross) {
                const u2 = px * -sa + py * ca + jit;
                ink = ((u2 % sp) + sp) % sp < (tone - cross) * sp * 1.3;
              }
              if (!ink && stip > 0 && noise[(ny2b << 8) | ((px * 2 + 13) & 255)] < stipT * tone) ink = true;
              // pojedyncze iskry w rudzie i krysztale: metal i szkło łapią światło
              if (tile === T.ORE || tile === T.CRYSTAL) {
                if (noise[(((py * 5 + 7) & 255) << 8) | ((px * 5 + 3) & 255)] > 0.9988) {
                  data[o] = 255; data[o + 1] = tile === T.ORE ? 236 : 246; data[o + 2] = tile === T.ORE ? 186 : 252; data[o + 3] = 255;
                  continue;
                }
              }
              // rysunek zapominany rwie się w kresce
              // im dawniej ktoś tu był, tym bardziej kreska rwie się w szkic
              if (ink && mem < 0.9 && noise[(ny3 << 8) | ((px + 33) & 255)] > 0.22 + mem * 0.78) ink = false;
              if (ink) {
                let cr = tr, cg = tg, cb = tb;
                if (air) { const dk = (1 - lt); cr = 250 - dk * 120; cg = 190 - dk * 110; cb = 120 - dk * 40; }
                if (mem < 0.8) {                       // szkic: barwa ucieka do szarości
                  const sz = (cr + cg + cb) / 3;
                  const ile = (0.8 - mem) / 0.8;
                  cr = cr + (sz - cr) * ile * 0.8; cg = cg + (sz - cg) * ile * 0.8; cb = cb + (sz - cb) * ile * 0.8;
                }
                // świeża kreska jest pełna, pamiętana blednie do ołówkowego szarego
                const k = (0.72 + tone * 0.4) * (0.28 + 0.72 * mem);
                const kk = k < 1 ? k : 1;
                r = r + (cr - r) * kk; g = g + (cg - g) * kk; b = b + (cb - b) * kk;
              }
            }
            data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
            // do poświaty trafia tylko to, co naprawdę świeci
            if (lt > 0.2 || magma > 0) {
              const moc = magma > 0 ? 1 : (lt - 0.2) / 0.8;
              edata[o] = r * moc; edata[o + 1] = g * moc; edata[o + 2] = b * moc; edata[o + 3] = 255 * moc;
            }
          }
        }
      }
    }
    this.bctx.putImageData(this.img, 0, 0);
    this.ectx.putImageData(this.eimg, 0, 0);
    this.contours(sim, cam, time);
  }

  /**
   * Kontur jak w atlasie anatomicznym: nie obrys kafli, tylko jedno pociągnięcie
   * rylcem wzdłuż całej ściany. Krawędzie zbierane są w ciągi i dopiero ciąg
   * rysowany jest falującą linią — inaczej wychodzą schodki siatki.
   */
  private contours(sim: Sim, cam: Camera, time: number): void {
    const w = sim.world;
    const ctx = this.bctx;
    const zoom = cam.zoom / this.scale;
    if (zoom < 1.6) return;
    const left = cam.x - this.aw / 2 / zoom;
    const top = cam.y - this.ah / 2 / zoom;
    const tx0 = Math.max(0, Math.floor(left) - 1), ty0 = Math.max(0, Math.floor(top) - 1);
    const tx1 = Math.min(w.w - 1, Math.ceil(left + this.aw / zoom) + 1);
    const ty1 = Math.min(w.h - 1, Math.ceil(top + this.ah / zoom) + 1);
    const drift = time * 0.00012;

    const drawn = (tx: number, ty: number): number => {
      const i = w.idx(tx, ty);
      if (ty <= w.surface[tx] + 1) return w.tile[i];
      if (!w.ever[i]) return -1;
      const fr = 1 - (sim.tick - w.lastSeen[i]) / MEM_SPAN;
      if (fr < 0.12) return -1;
      return fr > 0.82 ? w.tile[i] : w.mem[i];
    };
    const wall = (tx: number, ty: number): boolean => {
      const t = drawn(tx, ty);
      return t >= 0 && PASSABLE[t] !== 1;
    };
    const open = (tx: number, ty: number): boolean => {
      const t = drawn(tx, ty);
      return t >= 0 && PASSABLE[t] === 1;
    };

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.1, zoom / 8);

    /** Ciąg krawędzi rysowany jedną drżącą linią; amplituda w kaflach, nie w pikselach. */
    const stroke = (pts: [number, number][], depth: number) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const sx = (pts[i][0] - left) * zoom, sy = (pts[i][1] - top) * zoom;
        if (i === 0) ctx.moveTo(sx, sy);
        else {
          const px = (pts[i - 1][0] - left) * zoom, py = (pts[i - 1][1] - top) * zoom;
          ctx.quadraticCurveTo(px, py, (px + sx) / 2, (py + sy) / 2);
        }
      }
      ctx.strokeStyle = `rgba(${(238 - depth * 60) | 0},${(228 - depth * 160) | 0},${(206 - depth * 164) | 0},0.62)`;
      ctx.stroke();
    };

    const wobble = (tx: number, ty: number, seed: number) => (this.n(tx * 5 + seed, ty * 7 + (drift | 0)) - 0.5) * 0.34;

    // poziome ściany: strop cienko, podłoga grubiej — po tym poznaje się, gdzie się stoi
    for (let ty = ty0; ty <= ty1; ty++) {
      for (const side of [0, 1]) {
        ctx.lineWidth = side === 0 ? Math.max(1.4, zoom / 6) : Math.max(1, zoom / 11);
        let run: [number, number][] = [];
        for (let tx = tx0; tx <= tx1 + 1; tx++) {
          const edge = tx <= tx1 && wall(tx, ty) && open(tx, ty + (side === 0 ? -1 : 1));
          if (edge) {
            const y = ty + (side === 0 ? 0 : 1) + wobble(tx, ty, side * 17);
            run.push([tx + wobble(ty, tx, 3) * 0.3, y]);
            if (tx === tx1) { run.push([tx + 1, y]); }
          } else {
            if (run.length >= 2) stroke(run, w.depth(ty));
            run = [];
          }
        }
        if (run.length >= 2) stroke(run, w.depth(ty));
      }
    }

    // pionowe ściany
    for (let tx = tx0; tx <= tx1; tx++) {
      for (const side of [0, 1]) {
        let run: [number, number][] = [];
        for (let ty = ty0; ty <= ty1 + 1; ty++) {
          const edge = ty <= ty1 && wall(tx, ty) && open(tx + (side === 0 ? -1 : 1), ty);
          if (edge) {
            const x = tx + (side === 0 ? 0 : 1) + wobble(tx, ty, 41 + side * 9);
            run.push([x, ty + wobble(ty, tx, 7) * 0.3]);
            if (ty === ty1) run.push([x, ty + 1]);
          } else {
            if (run.length >= 2) stroke(run, w.depth(ty));
            run = [];
          }
        }
        if (run.length >= 2) stroke(run, w.depth(ty1));
      }
    }
  }
}
