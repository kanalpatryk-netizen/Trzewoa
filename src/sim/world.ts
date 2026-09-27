import { Rng, Noise } from '../core/rng';
import { T, PASSABLE, HARDNESS } from './tiles';
import { SWIAT, RDZEN } from '../nastawy/swiat';
import { GORA } from '../nastawy/gora';

export const WORLD_W = SWIAT.szerokosc;
export const WORLD_H = SWIAT.wysokosc;
export const SURFACE_Y = SWIAT.powierzchnia;
/** Po tylu tikach bez niczyjego spojrzenia rysunek rozpada się w pusty papier. */
export const MEM_SPAN = SWIAT.pamiecTikow;

/** Góra: kafle, woda, magma i pamięć o tym, gdzie ktokolwiek dotarł. */
export class World {
  readonly w = WORLD_W;
  readonly h = WORLD_H;
  readonly tile = new Uint8Array(WORLD_W * WORLD_H);
  readonly water = new Uint8Array(WORLD_W * WORLD_H);   // 0..8 objętości
  readonly magma = new Uint8Array(WORLD_W * WORLD_H);   // 0..8
  /** Ostatnio widziany kafel — pamięć bywa nieaktualna i o to chodzi. */
  readonly mem = new Uint8Array(WORLD_W * WORLD_H);
  /** Tik ostatniego spojrzenia; z tego liczy się blaknięcie rysunku. */
  readonly lastSeen = new Int32Array(WORLD_W * WORLD_H).fill(-999999);
  /** Czy ktokolwiek kiedykolwiek tu był. Zero = pusty papier. */
  readonly ever = new Uint8Array(WORLD_W * WORLD_H);
  /** Wysokość gruntu w każdej kolumnie — linia powierzchni jest stałym punktem odniesienia. */
  readonly surface = new Int16Array(WORLD_W);
  /** Ślad twojej ręki: 1 = wykop, 2 = zawał. Tego nie zapominasz nigdy. */
  readonly slad = new Uint8Array(WORLD_W * WORLD_H);
  /**
   * Próg: kafle, przez które nie przepływa ani woda, ani magma. Trzyma sucho
   * przedsionek pod rdzeniem — inaczej magma z sąsiedztwa zalewała jedyne miejsce,
   * w którym da się odprawić rytuał, i połowa światów była nie do przejścia.
   */
  readonly prog = new Uint8Array(WORLD_W * WORLD_H);
  readonly rng: Rng;
  readonly noise: Noise;
  /** Kafli, o których nikt teraz nie pamięta — to jest Otchłań, cała i jedyna. */
  unknown = 0;
  coreX = (WORLD_W / 2) | 0;
  coreY = WORLD_H - RDZEN.nadDnem;
  /** Środek przedsionka — jaskini nad skorupą, w której modli się warta. */
  get przedsionekY(): number { return this.coreY - RDZEN.przedsionekNad; }
  private flip = false;

  constructor(seed: number) {
    this.rng = new Rng(seed);
    this.noise = new Noise(this.rng);
    this.generate();
  }

  idx(x: number, y: number): number { return y * this.w + x; }
  inb(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x: number, y: number): number { return this.inb(x, y) ? this.tile[y * this.w + x] : T.ROCK; }
  set(x: number, y: number, t: number): void { if (this.inb(x, y)) this.tile[y * this.w + x] = t; }
  passable(x: number, y: number): boolean { return this.inb(x, y) ? PASSABLE[this.tile[y * this.w + x]] === 1 : false; }
  solid(x: number, y: number): boolean { return !this.passable(x, y); }
  hardness(x: number, y: number): number { return HARDNESS[this.get(x, y)]; }
  /** Głębokość 0..1 — waluta ryzyka. */
  depth(y: number): number { return Math.max(0, (y - SURFACE_Y) / (this.h - SURFACE_Y)); }

  // ---------------------------------------------------------------- generacja

  private generate(): void {
    const { w, h, noise, rng, tile } = this;
    const S = SWIAT;

    for (let x = 0; x < w; x++) {
      const sh = SURFACE_Y + Math.round(noise.fbm(x * 0.06, 0.5, 3) * (S.falowaniePowierzchni * 2) - S.falowaniePowierzchni);
      this.surface[x] = sh;
      for (let y = 0; y < h; y++) {
        const i = y * w + x;
        if (y < sh) { tile[i] = T.SKY; continue; }
        const d = this.depth(y);
        tile[i] = y < sh + S.gruboscZiemi ? T.SOIL : (d < S.ziemiaDoGlebokosci && rng.chance(S.szansaNaZiemie) ? T.SOIL : T.ROCK);
      }
    }

    // Jaskinie: dwie warstwy szumu, im głębiej tym rzadsze, ale większe.
    for (let y = SURFACE_Y; y < h - 4; y++) {
      const d = this.depth(y);
      const thr = S.jaskinie.prog + S.jaskinie.falowanie * Math.sin(d * 9) - d * S.jaskinie.ubytekWGlebi;
      for (let x = 1; x < w - 1; x++) {
        const n = noise.fbm(x * 0.045, y * 0.055, 4);
        const n2 = noise.fbm(200 + x * 0.02, 90 + y * 0.03, 2);
        if (n > thr && n2 > S.jaskinie.progDrugi) tile[y * w + x] = T.AIR;
      }
    }

    // Komory: kilkanaście wielkich pustek, tam siadają gniazda.
    for (let k = 0; k < S.komory.ile; k++) {
      const cx = rng.int(w - 20) + 10;
      const cy = SURFACE_Y + 8 + rng.int(h - SURFACE_Y - 30);
      const rx = rng.range(S.komory.szerokoscOd, S.komory.szerokoscDo), ry = rng.range(S.komory.wysokoscOd, S.komory.wysokoscDo);
      this.ellipse(cx, cy, rx, ry, T.AIR);
    }

    // Wejścia z powierzchni — stamtąd przychodzą śmiałkowie.
    for (let k = 0; k < S.wejscia.ile; k++) {
      const x = 12 + rng.int(w - 24);
      let y = SURFACE_Y - 4;
      let cx = x;
      while (y < h * S.wejscia.doGlebokosci) {
        this.ellipse(cx, y, rng.range(1.4, 2.6), 1.8, T.AIR);
        y += 2;
        cx += rng.int(3) - 1;
        if (cx < 3 || cx > w - 4) cx = x;
        if (rng.chance(S.wejscia.szansaUrwania)) break;
      }
    }

    // Rudy i kryształy — nagroda rośnie z głębokością.
    for (let y = SURFACE_Y; y < h; y++) {
      const d = this.depth(y);
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (tile[i] !== T.ROCK && tile[i] !== T.SOIL) continue;
        const v = noise.fbm(500 + x * 0.14, 300 + y * 0.10, 3);
        if (v > S.rudy.prog - d * S.rudy.latwiejWGlebi && rng.chance(S.rudy.szansa + d * S.rudy.szansaWGlebi)) tile[i] = T.ORE;
        else if (d > S.rudy.krysztalyOd && v > S.rudy.krysztalyProg && rng.chance(d * S.rudy.krysztalySzansa)) tile[i] = T.CRYSTAL;
      }
    }

    // Woda: kilka zbiorników w górnej połowie.
    for (let k = 0; k < S.woda.ile; k++) {
      const cx = 8 + rng.int(w - 16);
      const cy = SURFACE_Y + 10 + rng.int((h * S.woda.doGlebokosci) | 0);
      const r = rng.range(S.woda.promienOd, S.woda.promienDo);
      this.blob(cx, cy, r, (i) => { if (PASSABLE[tile[i]] === 1) this.water[i] = 8; });
    }

    // Magma: dno góry.
    for (let k = 0; k < S.magma.ile; k++) {
      const cx = 6 + rng.int(w - 12);
      const cy = ((h * S.magma.od) | 0) + rng.int((h * S.magma.pas) | 0);
      this.ellipse(cx, cy, rng.range(S.magma.szerokoscOd, S.magma.szerokoscDo), rng.range(S.magma.wysokoscOd, S.magma.wysokoscDo), T.AIR);
      this.blob(cx, cy, S.magma.promien, (i) => { if (PASSABLE[tile[i]] === 1) this.magma[i] = 8; });
    }

    // Rdzeń — ty. Zamknięty w skorupie, której nikt nie przekopie:
    // wejście otwiera dopiero rytuał wielu wiernych, nie jeden zdeterminowany goblin.
    this.ellipse(this.coreX, this.coreY, RDZEN.skorupaX, RDZEN.skorupaY, T.STONE);
    this.ellipse(this.coreX, this.coreY, RDZEN.komoraX, RDZEN.komoraY, T.AIR);
    this.ellipse(this.coreX, this.coreY, RDZEN.promien, RDZEN.promien, T.CORE);
    // przedsionek nad skorupą: tam schodzą ci, którzy chcą cię znaleźć
    this.ellipse(this.coreX, this.przedsionekY, RDZEN.przedsionekX, RDZEN.przedsionekY, T.AIR);
    this.osuszPrzedsionek();

    // Zejście się osypuje, zanim gracz spojrzy — świat ma startować stabilny.
    for (let k = 0; k < S.osypywanieNaStart; k++) this.tickSoil(k);
    for (let k = 0; k < S.splywanieNaStart; k++) this.tickFluids(k);

    this.unknown = this.w * this.h;
  }

  /**
   * Strefa sucha wokół przedsionka: żadnej magmy, wody ani żyły szaleństwa,
   * a krawędź strefy dostaje próg, przez który ciecze nie przepływają.
   */
  private osuszPrzedsionek(): void {
    const px = this.coreX, py = this.przedsionekY;
    const R = RDZEN.suchaStrefa;
    for (let y = py - R; y <= py + R; y++) {
      for (let x = px - R; x <= px + R; x++) {
        if (!this.inb(x, y)) continue;
        const d = Math.hypot(x - px, y - py);
        if (d > R) continue;
        const i = y * this.w + x;
        this.magma[i] = 0;
        this.water[i] = 0;
        if (this.tile[i] === T.CRYSTAL) this.tile[i] = T.ROCK;
        if (d > R - RDZEN.progSuchejStrefy) this.prog[i] = 1;          // pierścień progu na obrzeżu strefy
      }
    }
  }

  /** Czy kafel leży w suchej strefie przedsionka — tam nie wolno lać ani wody, ani ognia. */
  suchaStrefa(x: number, y: number): boolean {
    return Math.hypot(x - this.coreX, y - this.przedsionekY) <= RDZEN.suchaStrefa;
  }

  private ellipse(cx: number, cy: number, rx: number, ry: number, t: number): void {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (!this.inb(x, y) || y < SURFACE_Y - 6) continue;
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.tile[y * this.w + x] = t;
      }
    }
  }

  private blob(cx: number, cy: number, r: number, fn: (i: number) => void): void {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (!this.inb(x, y)) continue;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r) fn(y * this.w + x);
      }
    }
  }

  // ------------------------------------------------------------------- płyny

  /** Woda i magma jako objętość w kafelku, nie jako kafelek. */
  tickFluids(tick: number): void {
    const { w, h, tile, water, magma, prog } = this;
    this.flip = !this.flip;
    const doMagma = tick % 3 === 0;
    for (let y = h - 2; y >= 0; y--) {
      for (let k = 0; k < w; k++) {
        const x = this.flip ? k : w - 1 - k;
        const i = y * w + x;
        const lvl = water[i];
        if (lvl > 0) {
          if (PASSABLE[tile[i]] !== 1) { water[i] = 0; continue; }
          const below = i + w;
          if (y + 1 < h && PASSABLE[tile[below]] === 1 && prog[below] === 0 && water[below] < 8) {
            const move = Math.min(lvl, 8 - water[below]);
            water[below] += move; water[i] -= move;
            if (magma[below] > 0) this.quench(below);
            if (water[i] === 0) continue;
          }
          // rozlew na boki: wyrównanie o jeden stopień
          for (const dx of this.flip ? [-1, 1] : [1, -1]) {
            const j = i + dx;
            if (x + dx < 0 || x + dx >= w) continue;
            if (PASSABLE[tile[j]] !== 1 || prog[j] === 1) continue;
            if (water[j] + 1 < water[i]) { water[j]++; water[i]--; if (magma[j] > 0) this.quench(j); }
          }
        }
        if (doMagma && magma[i] > 0) {
          if (PASSABLE[tile[i]] !== 1) { magma[i] = 0; continue; }
          if (water[i] > 0) { this.quench(i); continue; }
          const below = i + w;
          if (y + 1 < h && PASSABLE[tile[below]] === 1 && prog[below] === 0 && magma[below] < 8) {
            const move = Math.min(magma[i], 8 - magma[below]);
            magma[below] += move; magma[i] -= move;
            if (water[below] > 0) this.quench(below);
          } else {
            for (const dx of this.flip ? [-1, 1] : [1, -1]) {
              const j = i + dx;
              if (x + dx < 0 || x + dx >= w) continue;
              if (PASSABLE[tile[j]] !== 1 || prog[j] === 1) continue;
              if (magma[j] + 2 < magma[i]) { magma[j]++; magma[i]--; if (water[j] > 0) this.quench(j); }
            }
          }
        }
      }
    }
  }

  /** Magma w wodzie zastyga w kamień — przejście zamknięte na zawsze. */
  private quench(i: number): void {
    this.magma[i] = 0;
    this.water[i] = Math.max(0, this.water[i] - 4);
    this.tile[i] = T.STONE;
  }

  /** Ziemia sypie się, gdy podkopiesz — stropy nie są wieczne. */
  tickSoil(tick: number): void {
    const { w, h, tile } = this;
    const right = tick % 2 === 0;
    for (let y = h - 2; y >= 1; y--) {
      for (let k = 0; k < w; k++) {
        const x = right ? k : w - 1 - k;
        const i = y * w + x;
        if (tile[i] !== T.SOIL) continue;
        const below = i + w;
        if (PASSABLE[tile[below]] !== 1) continue;
        const lp = x > 0 && PASSABLE[tile[i - 1]] === 1;
        const rp = x < w - 1 && PASSABLE[tile[i + 1]] === 1;
        if (!lp && !rp) continue;                 // strop trzyma się ścian
        tile[below] = T.SOIL; tile[i] = T.AIR;
        this.water[below] = 0;
      }
    }
  }

  /**
   * Zapisuje, że to miejsce zmieniła twoja ręka. Takie kafle zostają na rysunku
   * na zawsze — inaczej własny wykop w pustce znikał i nie było widać, co się zrobiło.
   */
  oznaczSlad(x: number, y: number, rodzaj: 1 | 2, tick: number): void {
    if (!this.inb(x, y)) return;
    const i = y * this.w + x;
    this.slad[i] = rodzaj;
    this.mem[i] = this.tile[i];
    this.lastSeen[i] = tick;
    if (!this.ever[i]) { this.ever[i] = 1; if (this.unknown > 0) this.unknown--; }
  }

  /** Ile ciebie nikt teraz nie pamięta. Liczone rzadko — pełny skan to 42 tysiące kafli. */
  countUnknown(tick: number): number {
    let n = 0;
    for (let i = 0; i < this.tile.length; i++) {
      if (!this.ever[i] || tick - this.lastSeen[i] > MEM_SPAN) n++;
    }
    this.unknown = n;
    return n;
  }

  /**
   * Zasklepienie nieznanego: wydana Otchłań dosłownie domalowuje kawałek ciebie.
   * Zwraca, ile kafli udało się zasklepić.
   */
  seal(tiles: number, tick: number, rng: { int: (n: number) => number }): number {
    let done = 0, guard = 0;
    while (done < tiles && guard++ < 400) {
      const cx = rng.int(this.w), cy = rng.int(this.h);
      const r = GORA.zasklepianiePromien;
      for (let y = Math.max(0, cy - r); y <= Math.min(this.h - 1, cy + r) && done < tiles; y++) {
        for (let x = Math.max(0, cx - r); x <= Math.min(this.w - 1, cx + r) && done < tiles; x++) {
          const dx = x - cx, dy = y - cy;
          if (dx * dx + dy * dy > r * r) continue;
          const i = y * this.w + x;
          if (this.ever[i] && tick - this.lastSeen[i] <= MEM_SPAN) continue;
          this.ever[i] = 1;
          this.mem[i] = this.tile[i];
          this.lastSeen[i] = tick;
          done++;
        }
      }
    }
    this.unknown = Math.max(0, this.unknown - done);
    return done;
  }

  /**
   * Stworzenie rozgląda się dookoła. Wiesz o sobie tyle, ile wiedzą ci, co w tobie
   * mieszkają — więc to jedyny sposób, w jaki rysunek twojego ciała się uzupełnia.
   */
  observe(cx: number, cy: number, r: number, tick: number): number {
    let fresh = 0;
    const r2 = r * r;
    const x0 = Math.max(0, cx - r), x1 = Math.min(this.w - 1, cx + r);
    const y0 = Math.max(0, cy - r), y1 = Math.min(this.h - 1, cy + r);
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        if (dx * dx + dy * dy > r2) continue;
        const i = y * this.w + x;
        this.mem[i] = this.tile[i];
        this.lastSeen[i] = tick;
        if (!this.ever[i]) { this.ever[i] = 1; fresh++; }
      }
    }
    return fresh;
  }
}
