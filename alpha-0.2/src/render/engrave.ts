import { Sim } from '../sim/sim';
import { T, PASSABLE } from '../sim/tiles';
import { MEM_SPAN, SURFACE_Y, type World } from '../sim/world';
import { ustawienia, skalaRenderu } from '../core/settings-store';
import { Camera } from './camera';
import { rolaPostaci, klanLudu } from '../sim/lud';
import { SWIAT, RDZEN } from '../nastawy/swiat';
import { odWidoku } from './shafts';
import { wysokoscGrzbietu } from './grzbiet';

import { TON_MAX, MATERIALY, MASA, RYCINA_SWIATA as RS, SWIATLO_RYCINY as SR, type Kreskowanie } from '../nastawy/wyglad/rycina';
import { FRESK_SWIATA as FS } from '../nastawy/wyglad/fresk-swiata';

// materiały ryciny (ton, kąt, odstęp, krzyż, kropki, barwa) — nastawy/wyglad/rycina.ts
type Hatch = Kreskowanie;
/** Powyżej TONE_MAX linie zlewają się w kleks i cały kamień ma jedną wartość. */
const TONE_MAX = TON_MAX;
const H: Record<number, Hatch> = MATERIALY;
const BAZA: Record<number, [number, number, number]> = MASA;
/** Rylec warstw i płaty skały (nastawy/wyglad/rycina.ts). */
/**
 * Kamień skorupy pomnika (poza ramą płyty) rysuje się jak głęboka skała — mur widać tylko wokół komory
 * (render/rdzen.ts: pierścień klińców). Cała skorupa w innym rylcu była schodkowym zikkuratem w skale.
 */
function skorupaJakSkala(w: World, wx: number, wy: number): boolean {
  const rama = SWIAT.warstwy.rama;
  if (wx < rama || wx >= w.w - rama || wy >= w.h - rama) return false;
  const dx = (wx - w.coreX) / (RDZEN.skorupaX + 1), dy = (wy - w.coreY) / (RDZEN.skorupaY + 1);
  return dx * dx + dy * dy <= 1;
}

const KAT_WARSTW = RS.katWarstw;
const PLAT_OCZKO = RS.platy.oczko, PLAT_IOCZKO = 1 / PLAT_OCZKO;
const RYSA_SILA = RS.rysy.sila;
/** Ziarna płatów skały: po jednym w każdej komórce siatki 64×64 (położenie w komórce, kąt, jasność). */
const VOR_X = new Float32Array(4096), VOR_Y = new Float32Array(4096), VOR_K = new Float32Array(4096), VOR_J = new Float32Array(4096);
for (let i = 0; i < 4096; i++) {
  VOR_X[i] = 0.12 + Math.random() * 0.76;
  VOR_Y[i] = 0.12 + Math.random() * 0.76;
  VOR_K[i] = RS.platy.katy[(Math.random() * RS.platy.katy.length) | 0];
  VOR_J[i] = (Math.random() * 2 - 1) * RS.platy.jasnosc;
}

/** Czerwień głębi: 0 nad `RS.czerwienOd`, 1 na samym dnie — skała przy krypcie żarzy się. */
function czerwienGlebi(depth: number): number {
  const c = (depth - RS.czerwienOd) / (1 - RS.czerwienOd);
  return c <= 0 ? 0 : c >= 1 ? 1 : c * c * (3 - 2 * c);
}

/**
 * Czerwień tylko przy pomniku: 1 nad kryptą, 0 dalej w bok niż `RS.czerwienZasieg` skorup — pas czerwieni przez
 * całą szerokość dna wyglądał jak aksamitna kotara.
 */
function czerwienPrzyPomniku(w: World, wx: number): number {
  const c = (Math.abs(wx - w.coreX) - RDZEN.skorupaX) / (RDZEN.skorupaX * (RS.czerwienZasieg - 1));
  return c <= 0 ? 1 : c >= 1 ? 0 : 1 - c * c * (3 - 2 * c);
}

/**
 * Barwa masy, barwa kreski i ton materiału na danej głębokości — do płynnych przejść
 * między materiałami (7 liczb od `o`). Te same wzory co `ustaw` w `rytujRycine`.
 */
function barwyMaterialu(mat: number, depth: number, przyPomniku: number, out: Float32Array, o: number): void {
  const baza = BAZA[mat];
  const hat = H[mat];
  const tint = hat && hat.tint;
  const cz = czerwienGlebi(depth) * przyPomniku;
  // żar głębi: masa czerwienieje, a chłód łupka z niej uchodzi (zamiast różu z błękitu)
  out[o] = (baza ? baza[0] : 26) + cz * 26;
  out[o + 1] = (baza ? baza[1] : 21) - cz * 5;
  out[o + 2] = (baza ? baza[2] : 18) - cz * 9;
  const kr = tint ? tint[0] : 196, kg = tint ? tint[1] : 176, kb = tint ? tint[2] : 150;
  const cc = cz * 0.55, CK = RS.czerwienKreski;
  out[o + 3] = kr + (CK[0] - kr) * cc;
  out[o + 4] = kg + (CK[1] - kg) * cc;
  out[o + 5] = kb + (CK[2] - kb) * cc;
  out[o + 6] = hat ? hat.tone : 0.2;
}

/** Warstwa skały dla barwy nieznanego, w które gaśnie pamięć: płytka, środkowa, głęboka, kamień. */
function warstwaMaterialu(mat: number): number {
  return mat === T.MIEKKA || mat === T.SOIL ? 0 : mat === T.TWARDA ? 2 : mat === T.STONE ? 3 : 1;
}

/**
 * Granice warstw góry w każdej kolumnie (rząd, w którym zaczyna się środkowa i głęboka), gładkie jak
 * linia rylca, nie schodki z kafli. Liczone raz na świat — z kafli, zanim ktokolwiek je przekopie.
 */
const graniceSwiata = new WeakMap<World, { g1: Float32Array; g2: Float32Array }>();
function graniceWarstw(w: World): { g1: Float32Array; g2: Float32Array } | null {
  if (!SWIAT.warstwy.wlaczone) return null;
  const jest = graniceSwiata.get(w);
  if (jest) return jest;
  const g1 = new Float32Array(w.w).fill(NaN), g2 = new Float32Array(w.w).fill(NaN);
  for (let x = 0; x < w.w; x++) {
    let ostatniaMiekka = -1, pierwszaTwarda = -1;
    for (let y = SURFACE_Y; y < w.h; y++) {
      const t = w.tile[y * w.w + x];
      if (t === T.MIEKKA) ostatniaMiekka = y;
      else if (t === T.TWARDA && pierwszaTwarda < 0) pierwszaTwarda = y;
    }
    if (ostatniaMiekka >= 0) g1[x] = ostatniaMiekka + 1;
    if (pierwszaTwarda >= 0) g2[x] = pierwszaTwarda;
  }
  // dziury (kolumny ramy, przekopane) — z sąsiadów; potem dwa razy wygładzić
  for (const g of [g1, g2]) {
    let ost = NaN;
    for (let x = 0; x < w.w; x++) if (Number.isNaN(g[x])) g[x] = ost; else ost = g[x];
    ost = NaN;
    for (let x = w.w - 1; x >= 0; x--) if (Number.isNaN(g[x])) g[x] = ost; else ost = g[x];
    for (let x = 0; x < w.w; x++) if (Number.isNaN(g[x])) g[x] = w.h * 2;
    const tmp = new Float32Array(w.w);
    for (let p = 0; p < 2; p++) {
      for (let x = 0; x < w.w; x++) {
        let s = 0, n = 0;
        for (let d = -2; d <= 2; d++) { const xx = x + d; if (xx >= 0 && xx < w.w) { s += g[xx]; n++; } }
        tmp[x] = s / n;
      }
      g.set(tmp);
    }
  }
  const wynik = { g1, g2 };
  graniceSwiata.set(w, wynik);
  return wynik;
}

/**
 * Fresk: pigment materiału na danej głębokości i barwa jego świetlika — 7 liczb od `o`,
 * w tym samym układzie co `barwyMaterialu` (masa, kreska, ton), żeby miękkie przejścia
 * między materiałami działały tak samo.
 */
function pigmentFresku(mat: number, depth: number, _wy: number, out: Float32Array, o: number): void {
  const a = depth < 0.5 ? depth * 2 : (depth - 0.5) * 2;
  const p0 = depth < 0.5 ? FS.gora : FS.srodek, p1 = depth < 0.5 ? FS.srodek : FS.dno;
  let r = p0[0] + (p1[0] - p0[0]) * a, g = p0[1] + (p1[1] - p0[1]) * a, b = p0[2] + (p1[2] - p0[2]) * a;
  const m = FS.materialy[mat];
  if (m) { r += (m.barwa[0] - r) * m.wlasny; g += (m.barwa[1] - g) * m.wlasny; b += (m.barwa[2] - b) * m.wlasny; }
  out[o] = r; out[o + 1] = g; out[o + 2] = b;
  out[o + 3] = FS.swietlik[0] * 0.8 + r * 0.2;
  out[o + 4] = FS.swietlik[1] * 0.8 + g * 0.2;
  out[o + 5] = FS.swietlik[2] * 0.8 + b * 0.2;
  out[o + 6] = 0.5;
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
  /** Ziarno papieru pod nieznanym (0..1): gotowa mieszanka szumu gładkiego i drobnego. */
  private ziarno = new Float32Array(256 * 256);
  private fresh = new Float32Array(1);
  private freshB = new Float32Array(1);
  /** Kąt kreskowania per kafel, wygładzany — twarde szwy między materiałami wyglądały jak dżins. */
  private angle = new Float32Array(1);
  private angleB = new Float32Array(1);
  private cosT = new Float32Array(257);
  private sinT = new Float32Array(257);
  /** Światło samych kafli (ogień, grzybnia, Znak) — tylko ono idzie do poświaty. */
  private light = new Float32Array(1);
  /** Całe światło na rysunku: kafle i do tego lampki ludu, jasna sala, gotowe pomieszczenia. */
  private swiatlo = new Float32Array(1);
  /** Bliskość jaskini dla skały: 1 przy samej krawędzi, 0 w głębi masy. Z niej płaskorzeźba. */
  private bliskosc = new Float32Array(1);
  private odl = new Uint8Array(1);
  /** Otwartość pustki: 0 przy ścianie, 1 kilka kafli od niej — z niej głębia tylnej ściany jaskini. */
  private otwarcie = new Float32Array(1);
  /** Strop nad pustką: 0 tuż pod skałą, 1 trzy kafle niżej — pod sklepieniem jaskini zalega cień. */
  private strop = new Float32Array(1);
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
  /** Kolumny ekranu: x świata, granice warstw i falowanie spoin — liczone raz na przerysowanie. */
  private kolX = new Float32Array(1);
  private kolG1 = new Float32Array(1);
  private kolG2 = new Float32Array(1);
  private kolFala = new Float32Array(1);
  /** Grzbiet góry nad powierzchnią w każdej kolumnie (kafle ponad SURFACE_Y; tylko rysunek). */
  private kolGrzbiet = new Float32Array(1);
  private kolDX = new Float32Array(1);
  private kolRama = new Uint8Array(1);
  private wierszDY = new Float32Array(1);
  private wierszRama = new Uint8Array(1);
  private wierszWy = new Float32Array(1);
  /** Ten sam bufor pikseli widziany jako słowa 32-bitowe (ABGR) — szybszy zapis gotowej barwy. */
  private d32: Uint32Array = new Uint32Array(1);
  private e32: Uint32Array = new Uint32Array(1);
  /**
   * Przesunięcie bufora na płycie (px płyty, od -1 do 0): rycina leży na siatce pikseli świata, więc przy
   * przesuwaniu kamery jej kreska się nie przepróbkowuje, tylko cały obraz jedzie o ułamek piksela.
   */
  dx = 0; dy = 0;
  /**
   * Pamięć poprzedniej odbitki: klucz wejść każdego kafla (materiał, pamięć, światło, ciecze…) i położenie
   * siatki. Kafel, którego klucz i klucze sąsiadów się nie zmieniły, zostaje z poprzedniej klatki, a przy
   * przesunięciu kamery obraz przesuwa się o całe piksele i rysuje się tylko odsłonięty pasek. Pełna
   * rozdzielczość kosztuje wtedy mniej niż dawna połówka.
   */
  private odbitkaWazna = false;
  private pZoom = 0; private pOx = 0; private pOy = 0; private pKontrast = 0;
  private pSwiat: World | null = null;
  private klucz = new Uint32Array(1);
  private pKlucz = new Uint32Array(1);
  private pLx0 = 0; private pLy0 = 0; private pLw = 0; private pLh = 0;
  /** 1 = kafel (albo któryś z jego wejść) zmienił się od poprzedniej odbitki albo płynie (woda, magma, rdzeń). */
  private zmiana = new Uint8Array(1);
  /**
   * Kafle świata narysowane na szybko (co drugi piksel) po zmianie przybliżenia: pełna odbitka w pełnej
   * rozdzielczości kosztuje kilka klatek, więc najpierw idzie zgrubna, a kolejne przerysowania dopracowują
   * ją kafel po kaflu w budżecie czasu. `niedokonczona` każe grze przerysować w następnej klatce.
   */
  private zgrubne = new Uint8Array(1);
  niedokonczona = false;
  /** Świat kreskowany jak rycina (domyślnie) albo malowany jak fresk (próba) — ustawienia → „Rysunek świata”. */
  fresk = false;
  /** Szkic sinopii pod nieznanym: poziomice dużego, gładkiego szumu (0..1 na teksel). */
  private szkic = new Float32Array(256 * 256);
  private pig = new Float32Array(7);
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
    // ziarno papieru: płaty i drobny piasek — jedna tablica zamiast dwóch odczytów na piksel
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        this.ziarno[(y << 8) | x] = this.smooth[(((y * 2) & 255) << 8) | ((x * 2) & 255)] * 0.6 + this.noise[(y << 8) | x] * 0.4;
      }
    }
    // szkic sinopii: kilka poziomic szumu o dużym oczku — kreślone pędzlem linie, nie siatka
    const G2 = 8, cell2 = 256 / G2;
    const grid2 = new Float32Array(G2 * G2);
    for (let i = 0; i < grid2.length; i++) grid2[i] = Math.random();
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const gx = x / cell2, gy = y / cell2;
        const x0 = Math.floor(gx) % G2, y0 = Math.floor(gy) % G2;
        const x1 = (x0 + 1) % G2, y1 = (y0 + 1) % G2;
        const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy);
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const a = grid2[y0 * G2 + x0], b = grid2[y0 * G2 + x1];
        const c = grid2[y1 * G2 + x0], d = grid2[y1 * G2 + x1];
        const t = a + (b - a) * sx, u = c + (d - c) * sx;
        const v = t + (u - t) * sy;
        let k = 0;
        for (const poziom of [0.32, 0.5, 0.68]) {
          const odl = Math.abs(v - poziom) / 0.012;
          if (odl < 1) k = Math.max(k, 1 - odl);
        }
        this.szkic[(y << 8) | x] = k;
      }
    }
  }

  resize(vw: number, vh: number): void {
    this.scale = skalaRenderu(vw);
    // piksel zapasu: rycina jest przyklejona do siatki pikseli świata i rysowana z przesunięciem do -1 px
    this.aw = Math.max(2, Math.ceil(vw / this.scale) + 1);
    this.ah = Math.max(2, Math.ceil(vh / this.scale) + 1);
    this.odbitkaWazna = false;
    this.buf.width = this.aw; this.buf.height = this.ah;
    this.img = this.bctx.createImageData(this.aw, this.ah);
    this.data = this.img.data;
    this.emis.width = this.aw; this.emis.height = this.ah;
    this.eimg = this.ectx.createImageData(this.aw, this.ah);
    this.edata = this.eimg.data;
    this.kolX = new Float32Array(this.aw);
    this.kolG1 = new Float32Array(this.aw);
    this.kolG2 = new Float32Array(this.aw);
    this.kolFala = new Float32Array(this.aw);
    this.kolGrzbiet = new Float32Array(this.aw);
    this.kolDX = new Float32Array(this.aw);
    this.kolRama = new Uint8Array(this.aw);
    this.wierszDY = new Float32Array(this.ah);
    this.wierszRama = new Uint8Array(this.ah);
    this.wierszWy = new Float32Array(this.ah);
    this.d32 = new Uint32Array(this.data.buffer);
    this.e32 = new Uint32Array(this.edata.buffer);
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
      this.swiatlo = new Float32Array(tilesX * tilesY);
      this.otwarcie = new Float32Array(tilesX * tilesY);
      this.strop = new Float32Array(tilesX * tilesY);
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
    const gr = graniceWarstw(w);

    for (let y = 0; y < tilesY; y++) {
      const wy = y0 + y;
      for (let x = 0; x < tilesX; x++) {
        const wx = x0 + x;
        const k = y * tilesX + x;
        if (!w.inb(wx, wy)) { F[k] = 0; this.magmaP[k] = 0; this.wodaP[k] = 0; continue; }
        const i = w.idx(wx, wy);
        const age = sim.tick - w.lastSeen[i];
        // to, co zrobiła twoja ręka, nie blaknie do zera
        // jasna sala i oba szyby nad nią są zawsze na widoku — dzień z powierzchni nie pozwala ich zapomnieć
        const dW = odWidoku(w, wx, wy);
        let podstawa = wy <= w.surface[wx] + 1 || dW === 0 ? 1
          : (w.ever[i] ? Math.max(0, 1 - age / MEM_SPAN) : 0);
        // wokół nich pamięć gaśnie łagodnie przez kilka kafli (bez prostego brzegu z kafli); poniżej 0,82,
        // więc nigdy niewidziany kafel rysuje się tam jako lita skała warstwy, nie zdradza jaskiń
        if (podstawa < 0.8) {
          const ws = 0.8 - dW * 0.16;
          if (ws > podstawa) podstawa = ws;
        }
        F[k] = w.slad[i] ? Math.max(0.42, podstawa) : podstawa;
        const t = w.tile[i];
        this.magmaP[k] = w.magma[i] > 0 ? 0.55 + w.magma[i] / 8 * 0.45 : 0;
        this.wodaP[k] = w.water[i] > 0 && PASSABLE[t] === 1 ? 0.5 + w.water[i] / 8 * 0.5 : 0;
        // jeden rylec na warstwę: dawny skręt kąta za słojami skały rysował odciski palców i wiry
        // (falowanie daje teraz spoina — kreska idzie wzdłuż warstw). Żyła, ziemia i pustka biorą kąt
        // swojej warstwy (inny kąt w każdej kępce rudy skręcał kreskę w wiry); własny mają tylko kamień
        // nie do ruszenia i kryształ
        const wlasny = (t === T.STONE && !skorupaJakSkala(w, wx, wy)) || t === T.CRYSTAL ? t : gr ? (wy < gr.g1[wx] ? T.MIEKKA : wy < gr.g2[wx] ? T.ROCK : T.TWARDA) : t;
        const hh = H[wlasny];
        this.angle[k] = hh ? hh.ang : 1.36;
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

    // co się rysuje: dobrze widziane — prawda, dawno widziane — pamięć, nieznane — lita skała
    const S = this.sol, R = this.rys;
    const ramaW = SWIAT.warstwy.rama, czapaOdW = SURFACE_Y + SWIAT.warstwy.ziemia;
    const czapaDoW = w.salaOltarza.x1 >= 0 ? w.salaOltarza.y0 : -1e6;
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const k = y * tilesX + x;
        const wx = x0 + x, wy = y0 + y;
        // nad światem niebo ciągnie się dalej — bez tego nad powierzchnią wisiała linia krawędzi mapy
        if (wy < 0 && wx >= 0 && wx < w.w) { R[k] = T.SKY; S[k] = 0; continue; }
        if (!w.inb(wx, wy) || F[k] <= 0.01) { R[k] = T.ROCK; S[k] = 1; continue; }
        const i = w.idx(wx, wy);
        // nigdy niewidziane (brzeg rozmytej pamięci): lita skała swojej warstwy, nie pusta „pamięć”; w czapie
        // i ramie — kamień (inaczej odkryte kafle czapy były ciemnymi plamami w jaśniejszej, zgadywanej skale)
        const kamienny = gr !== null && (wy >= czapaOdW && wy < czapaDoW || wx < ramaW || wx >= w.w - ramaW || wy >= w.h - ramaW);
        let t = F[k] > 0.82 ? w.tile[i] : w.ever[i] ? w.mem[i]
          : kamienny ? T.STONE : gr ? (wy < gr.g1[wx] ? T.MIEKKA : wy < gr.g2[wx] ? T.ROCK : T.TWARDA) : T.ROCK;
        // wyloty szybów nad powierzchnią to niebo — pusty kafel nad nią sterczał jak komin
        if (wy < SURFACE_Y && PASSABLE[t] === 1) t = T.SKY;
        else if (t === T.STONE && skorupaJakSkala(w, wx, wy)) t = T.TWARDA;
        R[k] = t;
        S[k] = PASSABLE[t] === 1 ? 0 : 1;
      }
    }
    // odległość skały od najbliższej (narysowanej) pustki, do 5 kafli — dwa przejścia jak w mapie odległości;
    // z prawdziwych kafli nieznana jaskinia zdradzała się poświatą w skale
    const O = this.odl, B = this.bliskosc;
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const k = y * tilesX + x;
        O[k] = S[k] === 1 ? 5 : 0;
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

    // otwartość pustki: odległość od najbliższej skały (do 4 kafli) — tylna ściana jaśnieje ku środkowi jaskini
    const OA = this.otwarcie;
    for (let k = 0; k < OA.length; k++) OA[k] = S[k] === 1 ? 0 : 9;
    for (let pass = 0; pass < 2; pass++) {
      const fwd = pass === 0;
      for (let yy = 0; yy < tilesY; yy++) {
        const y = fwd ? yy : tilesY - 1 - yy;
        for (let xx = 0; xx < tilesX; xx++) {
          const x = fwd ? xx : tilesX - 1 - xx;
          const k = y * tilesX + x;
          let m = OA[k];
          if (m === 0) continue;
          if (x > 0 && OA[k - 1] + 1 < m) m = OA[k - 1] + 1;
          if (x < tilesX - 1 && OA[k + 1] + 1 < m) m = OA[k + 1] + 1;
          if (y > 0 && OA[k - tilesX] + 1 < m) m = OA[k - tilesX] + 1;
          if (y < tilesY - 1 && OA[k + tilesX] + 1 < m) m = OA[k + tilesX] + 1;
          OA[k] = m;
        }
      }
    }
    for (let k = 0; k < OA.length; k++) { const v = (OA[k] - 0.3) / 2.6; OA[k] = v <= 0 ? 0 : v >= 1 ? 1 : v; }
    const ST = this.strop;
    for (let x = 0; x < tilesX; x++) {
      let pod = 0;
      for (let y = 0; y < tilesY; y++) {
        const k = y * tilesX + x;
        if (S[k] === 1) { pod = 0; ST[k] = 0; continue; }
        pod++;
        ST[k] = pod >= 4 ? 1 : (pod - 0.5) / 3.5;
      }
    }

    // barwy materiałów i ich średnie w narożnikach — tylko z litych kafli
    const MK = this.matK, RK = this.rogK;
    for (let y = 0; y < tilesY; y++) {
      const wy = y0 + y;
      const d = w.depth(wy);
      for (let x = 0; x < tilesX; x++) {
        const k = y * tilesX + x;
        if (S[k] !== 1) continue;
        if (this.fresk) pigmentFresku(R[k], d, wy, MK, k * 7);
        else barwyMaterialu(R[k], d, czerwienPrzyPomniku(w, x0 + x), MK, k * 7);
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
    this.swiatloLudu(sim, x0, y0, tilesX, tilesY);
  }

  /**
   * Światło, które niesie lud i jego miejsca: lampki, siedziba, obozy, jasna sala z ołtarzem
   * i gotowe pomieszczenia. Miękkie koła bez cieni — te same plamy, które wycina mrok — żeby
   * rysunek w świetle się rozgrzał, a nie tylko odsłonił.
   */
  private swiatloLudu(sim: Sim, x0: number, y0: number, tilesX: number, tilesY: number): void {
    const w = sim.world;
    const L = this.light, LT = this.swiatlo, O = this.odl;
    LT.set(L);
    /** `wSkale` — najwyżej tyle kafli światło wchodzi w litą skałę (pomieszczenia nie świecą przez strop). */
    const plama = (cx: number, cy: number, r: number, moc: number, wSkale = Infinity): void => {
      const xa = Math.max(0, Math.floor(cx - r) - x0), xb = Math.min(tilesX - 1, Math.ceil(cx + r) - x0);
      const ya = Math.max(0, Math.floor(cy - r) - y0), yb = Math.min(tilesY - 1, Math.ceil(cy + r) - y0);
      const r2 = 1 / (r * r);
      for (let y = ya; y <= yb; y++) {
        const dy = y0 + y + 0.5 - cy;
        for (let x = xa; x <= xb; x++) {
          const dx = x0 + x + 0.5 - cx;
          const d2 = (dx * dx + dy * dy) * r2;
          if (d2 >= 1) continue;
          const s = 1 - Math.sqrt(d2);
          const k = y * tilesX + x;
          const skala = wSkale === Infinity || O[k] === 0 ? 1 : Math.max(0, 1 - O[k] / wSkale);
          const v = moc * s * s * (3 - 2 * s) * skala;
          if (v > LT[k]) LT[k] = v;
        }
      }
    };
    /** Prostokąt w pełnym świetle z miękkim brzegiem (sala, pomieszczenie, szyb dnia). */
    const prostokat = (ax: number, ay: number, bx: number, by: number, brzeg: number, moc: number): void => {
      const xa = Math.max(0, Math.floor(ax - brzeg) - x0), xb = Math.min(tilesX - 1, Math.ceil(bx + brzeg) - x0);
      const ya = Math.max(0, Math.floor(ay - brzeg) - y0), yb = Math.min(tilesY - 1, Math.ceil(by + brzeg) - y0);
      for (let y = ya; y <= yb; y++) {
        const cy = y0 + y + 0.5;
        const dy = cy < ay ? ay - cy : cy > by ? cy - by : 0;
        for (let x = xa; x <= xb; x++) {
          const cx = x0 + x + 0.5;
          const dx = cx < ax ? ax - cx : cx > bx ? cx - bx : 0;
          const d = Math.sqrt(dx * dx + dy * dy) / brzeg;
          if (d >= 1) continue;
          const s = 1 - d;
          const v = moc * s * s * (3 - 2 * s);
          const k = y * tilesX + x;
          if (v > LT[k]) LT[k] = v;
        }
      }
    };
    // jasna sala: dzień z szybu nad ołtarzem i świece — cała, nie tylko krąg wokół ołtarza
    const so = w.salaOltarza;
    if (so.x1 >= 0) {
      prostokat(so.x0 + 1, so.y0, so.x1, so.y1 + 1, SR.sala.brzeg, SR.sala.moc);
      prostokat(w.szybX - 1, SURFACE_Y - 2, w.szybX + 2, so.y0, 2.5, SR.sala.moc * 0.55);
      // węższym szybem, którym zjeżdża wiadro, dnia wpada mniej
      prostokat(w.szybWiadraX, SURFACE_Y - 2, w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer, w.szybWiadraDol + 1, 1.5, SR.sala.moc * 0.5);
      plama(w.oltarz.x + 0.5, w.oltarz.y - 1, SR.oltarz.r, SR.oltarz.moc);
    }
    for (const p of sim.pomieszczenia) {
      if (!p.gotowe) continue;
      const moc = SR.pomieszczenia[p.rodzaj];
      // okrągła plama, nie prostokąt — prostokątne światło rysowało w skale jasne słupy
      // i tylko na kafel–dwa w głąb skały: światło pokoju przez lity strop świeciło jak przez mgłę
      if (moc) plama(p.x + p.w / 2, p.y + p.h / 2, Math.max(p.w, p.h) / 2 + SR.pomieszczenieZasieg, moc, SR.pomieszczenieWSkale);
    }
    const klan = klanLudu(sim);
    if (klan) plama(klan.hx + 0.5, klan.hy + 0.5, SR.siedziba.r, SR.siedziba.moc);
    for (const o of sim.lud.obozy ?? []) plama(o.x + 0.5, o.y + 0.5, SR.oboz.r, SR.oboz.moc);
    for (const c of sim.creatures) {
      if (c.dead || c.straznik) continue;
      const r = rolaPostaci(c);
      if (!r) continue;
      const s = r === 'robotnik' ? SR.robotnik : r === 'rycerz' ? SR.rycerz : SR.pobozny;
      plama(c.x + 0.5, c.y + 0.5, s.r, s.moc);
    }
  }

  // ------------------------------------------------------------------ kreska

  rebuild(sim: Sim, cam: Camera, time: number): void {
    this.computeLight(sim, cam);
    if (this.fresk) {
      this.edata.fill(0);
      this.dx = 0; this.dy = 0;
      this.odbitkaWazna = false;
      this.malujFresk(sim, cam, time);
    } else this.rytujRycine(sim, cam, time);
    this.bctx.putImageData(this.img, 0, 0);
    this.ectx.putImageData(this.eimg, 0, 0);
  }

  /**
   * Rycina (domyślny rysunek świata). Trzy wartości, które oko czyta od razu:
   *  - pustka jaskini to gładka, ciepła tylna ściana — najjaśniejsze miejsce w skale, ciemniejsze tylko
   *    w kątach przy ścianach;
   *  - skała to ciemna masa rytowana kreską; każda warstwa ma swój rylec (ugier rzadko, umbra średnio,
   *    łupek gęsto i na krzyż), a poziome spoiny i linie granic mówią, gdzie jest która;
   *  - nieznane to półmrok papieru, na którym widać tylko szkic sinopii: granice warstw i brzeg ramy.
   * Kreska jest wygładzana (pokrycie z odległości od osi linii), więc w pełnej rozdzielczości czyta się
   * jak miedzioryt, a nie szum pikseli.
   */
  private rytujRycine(sim: Sim, cam: Camera, time: number): void {
    const w = sim.world;
    const data = this.data, edata = this.edata;
    const noise = this.noise, smooth = this.smooth, ziarno = this.ziarno;
    const cosT = this.cosT, sinT = this.sinT;
    const aw = this.aw, ah = this.ah;
    const zoom = cam.zoom / this.scale;
    const izoom = 1 / zoom;
    // siatka pikseli przyklejona do świata: lewy górny róg bufora to zawsze cały piksel świata, a resztę
    // (ułamek piksela) dokłada rysowanie bufora — faktura jedzie razem ze skałą i nie migocze
    const leftC = cam.x - cam.vw / this.scale / 2 / zoom, topC = cam.y - cam.vh / this.scale / 2 / zoom;
    const ox = Math.floor(leftC * zoom), oy = Math.floor(topC * zoom);
    const left = ox / zoom, top = oy / zoom;
    this.dx = (left - leftC) * zoom * this.scale;
    this.dy = (top - topC) * zoom * this.scale;

    const tx0 = Math.floor(left) - 1, ty0 = Math.floor(top) - 1;
    const tx1 = Math.ceil(left + aw / zoom) + 1, ty1 = Math.ceil(top + ah / zoom) + 1;
    const fala = time * 0.0016;                 // woda i magma płyną
    // poziom szczegółu: z daleka płaski ton, z bliska pełne kreskowanie
    const far = zoom < 6 ? Math.max(0.55, zoom / 6) : 1;
    const plaski = zoom < 2.6;   // liczone w pikselach sztuki, nie ekranu
    // bliski plan: siatka rośnie razem z kaflem, żeby faktura nie zamieniła się w słoje
    // (z bliska rośnie wolniej niż kafel: rzadka, gruba kreska z bliska wyglądała jak deski)
    const spWide = zoom < 6 ? 1.6 : Math.min(2.1, Math.max(1, zoom / 10));
    const kontrast = ustawienia.kontrast;
    const tetno = 0.5 + 0.5 * Math.sin(time * 0.0025);
    // kontur ściany: atrament rylca, na podłodze grubszy — to na niej się stoi
    const linie = zoom >= 1.6;
    const hwP = Math.max(0.7, zoom / 15), hwS = Math.max(0.45, zoom / 32);
    const rimW = 1 + zoom * RS.swietlikGrubosc;
    const S9 = this.s9, M9 = this.m9, W9 = this.w9;
    const pA = this.pA, pB = this.pB;
    const lw = this.lw;
    const F = this.fresh, L = this.light, LT = this.swiatlo, A = this.angle, B = this.bliskosc, S = this.sol, R = this.rys;
    const OA = this.otwarcie, ST = this.strop;
    const MP = this.magmaP, WP = this.wodaP, MI = this.miek, RK = this.rogK;
    const KO = RS.kontur, SW = RS.swietlik, swBaza = RS.swietlikBaza;
    const SP = RS.swiatloPustki, SS = RS.swiatloSkaly;
    const GC = RS.granicaCiemna, GJ = RS.granicaJasna, gSila = RS.granicaSila;
    const gW = Math.max(0.6, zoom * 0.045);              // pół grubości linii granicy warstw (px)
    const hwMax = 0.42 + zoom * 0.015;                   // najgrubsza kreska (pół grubości, px) — z bliska cienko, jak rylcem
    const dashF = 1 / Math.max(4.5, zoom * 0.24);          // odcinki kreski: krótkie, jak dziobane rylcem (z daleka dłuższe)
    const wSp = Math.max(2.6, zoom * 0.17), iwSp = 1 / wSp; // kreska tylnej ściany jaskini (odstęp, px)
    // rysy na styku płatów: z bliska, szerokość w jednostkach pola płatów (ok. 0,7 px na ekranie)
    const rysyWidac = zoom >= RS.rysy.odZoom, rysaW = Math.max(0.6, zoom * RS.rysy.szer);
    // płaty kafla: trzy najbliższe ziarna (x, y w kaflach), ich kąt i jasność, a dla par: czy pęka i 1/(2·odległość)
    const PL = new Float32Array(6), PLK = new Float32Array(3), PLJ = new Float32Array(3), PLI = new Float32Array(3);
    const PLR = new Uint8Array(3), PID = new Int32Array(3);

    // ---- kolumny ekranu: x świata, granice warstw i falowanie spoin
    const kolX = this.kolX, kolG1 = this.kolG1, kolG2 = this.kolG2, kolFala = this.kolFala, kolGrzbiet = this.kolGrzbiet;
    const gr = graniceWarstw(w);
    for (let px = 0; px < aw; px++) {
      const wx = left + (px + 0.5) * izoom;
      kolX[px] = wx;
      // spoiny falują łagodnie, raz na kilka kafli — interpolowane, bez schodków
      const f1 = wx * 1.6, i1 = Math.floor(f1), t1 = f1 - i1;
      const s1 = smooth[(37 << 8) | (i1 & 255)], s2 = smooth[(37 << 8) | ((i1 + 1) & 255)];
      const f2 = wx * 7, i2 = Math.floor(f2), t2 = f2 - i2;
      const s3 = smooth[(91 << 8) | (i2 & 255)], s4 = smooth[(91 << 8) | ((i2 + 1) & 255)];
      kolFala[px] = (s1 + (s2 - s1) * t1 - 0.5) * 0.9 + (s3 + (s4 - s3) * t2 - 0.5) * 0.12;
      // grzbiet: łagodne garby ziemi ponad płaską powierzchnią świata (render/grzbiet.ts — równo przy wylotach szybów,
      // pod katedrą i na placu konwoju)
      kolGrzbiet[px] = gr ? wysokoscGrzbietu(w, wx) : 0;
      if (gr) {
        const xf = wx - 0.5, xi = Math.floor(xf), xt = xf - xi;
        const a = xi < 0 ? 0 : xi >= w.w ? w.w - 1 : xi, b = xi + 1 < 0 ? 0 : xi + 1 >= w.w ? w.w - 1 : xi + 1;
        const drzy = (s3 + (s4 - s3) * t2 - 0.5) * 0.18;     // drżenie rylca
        kolG1[px] = gr.g1[a] + (gr.g1[b] - gr.g1[a]) * xt + drzy;
        kolG2[px] = gr.g2[a] + (gr.g2[b] - gr.g2[a]) * xt - drzy;
      } else { kolG1[px] = -1e6; kolG2[px] = -1e6; }
    }

    // ---- nieznane: półmrok papieru i szkic sinopii (granice warstw, brzeg ramy, rzadkie spoiny)
    const GM = RS.nieznaneMasa, SZ = RS.szkic;
    const GM0 = GM[0], GM1 = GM[1], GM2 = GM[2], GM3 = GM[3];
    const szSila = RS.szkicSila, spSila = RS.szkicSpoinySila, spF = 1 / RS.szkicSpoinyCo;
    const szW = Math.max(1.6, zoom * 0.08);
    const rama = SWIAT.warstwy.rama, ramaP = w.w - rama, ramaD = w.h - rama;
    const czapaOd = SURFACE_Y + SWIAT.warstwy.ziemia, czapaDo = gr && w.salaOltarza.x1 >= 0 ? w.salaOltarza.y0 : -1e6;
    // linie szkicu liczone raz na kolumnę i raz na wiersz ekranu (odległość w pikselach do brzegu ramy i czapy)
    const kolDX = this.kolDX, kolRama = this.kolRama, wierszDY = this.wierszDY, wierszRama = this.wierszRama, wierszWy = this.wierszWy;
    for (let px = 0; px < aw; px++) {
      const wx = kolX[px];
      let d = wx - rama; if (d < 0) d = -d;
      let e = wx - ramaP; if (e < 0) e = -e; if (e < d) d = e;
      kolDX[px] = gr ? d * zoom : 1e9;
      kolRama[px] = wx < rama || wx >= ramaP ? 1 : 0;
    }
    for (let py = 0; py < ah; py++) {
      const wyP = top + (py + 0.5) * izoom;
      wierszWy[py] = wyP;
      let d = wyP - ramaD; if (d < 0) d = -d;
      let e = wyP - czapaDo; if (e < 0) e = -e; if (e < d) d = e;
      wierszDY[py] = gr ? d * zoom : 1e9;
      wierszRama[py] = wyP >= ramaD || (wyP >= czapaOd && wyP < czapaDo) ? 1 : 0;
    }
    const GMR = new Float32Array([GM0[0], GM1[0], GM2[0], GM3[0]]);
    const GMG = new Float32Array([GM0[1], GM1[1], GM2[1], GM3[1]]);
    const GMB = new Float32Array([GM0[2], GM1[2], GM2[2], GM3[2]]);
    const SZR = SZ[0], SZG = SZ[1], SZB = SZ[2];
    const spCo = RS.szkicSpoinyCo * zoom;
    const d32 = this.d32;
    const duch = (o: number, px: number, py: number, gx: number, gy: number): void => {
      const wyP = wierszWy[py];
      const wRamie = (kolRama[px] | wierszRama[py]) === 1;
      const g1 = kolG1[px], g2 = kolG2[px];
      const li = wRamie ? 3 : wyP < g1 ? 0 : wyP < g2 ? 1 : 2;
      const z = ziarno[((gy & 255) << 8) | (gx & 255)];
      let r = GMR[li] + z * 8, g = GMG[li] + z * 6, b = GMB[li] + z * 5.5;
      // linie szkicu: najbliższa granica warstw, brzeg ramy albo czapy
      let d = kolDX[px], e = wierszDY[py];
      if (e < d) d = e;
      if (!wRamie) {
        e = (wyP - g1) * zoom; if (e < 0) e = -e; if (e < d) d = e;
        e = (wyP - g2) * zoom; if (e < 0) e = -e; if (e < d) d = e;
      }
      let k = 0;
      if (d < szW) {
        // pędzel płynnie słabnie i znów dociska (bez twardych przerw — nie linia przerywana)
        const nacisk = smooth[((((gy >> 3) + 61) & 255) << 8) | (((gx >> 3) + 17) & 255)];
        k = (1 - d / szW) * szSila * (0.45 + 0.55 * nacisk);
      } else if (!wRamie && gr) {
        // rzadkie spoiny: ledwie widać, że to skała, nie pustka
        let bt = (wyP + kolFala[px] * 2) * spF;
        bt -= Math.floor(bt);
        if (bt > 0.5) bt = 1 - bt;
        const ds = bt * spCo;
        if (ds < 1.1 && smooth[((((gy >> 2) + 23) & 255) << 8) | ((gx >> 3) & 255)] > 0.45) k = (1.1 - ds) / 1.1 * spSila;
      }
      if (k > 0) { r += (SZR - r) * k; g += (SZG - g) * k; b += (SZB - b) * k; }
      // wszystko tu mieści się w 0..255 — jeden zapis zamiast czterech
      d32[o >> 2] = 0xff000000 | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
    };

    // ---- pamięć poprzedniej odbitki: co trzeba narysować od nowa
    const lw0 = this.lw, lh0 = this.lh, lx0 = this.lx0, ly0 = this.ly0;
    const nk = lw0 * lh0;
    if (this.klucz.length !== nk) { this.klucz = new Uint32Array(nk); this.zmiana = new Uint8Array(nk); }
    const KL = this.klucz, ZM = this.zmiana, PK = this.pKlucz;
    {
      const F0 = this.fresh, LT0 = this.swiatlo, L0 = this.light, A0 = this.angle, B0 = this.bliskosc;
      const S0 = this.sol, R0 = this.rys, OA0 = this.otwarcie, ST0 = this.strop, MI0 = this.miek;
      const MP0 = this.magmaP, WP0 = this.wodaP;
      for (let y = 0; y < lh0; y++) {
        const wy = ly0 + y;
        for (let x = 0; x < lw0; x++) {
          const k = y * lw0 + x, wx = lx0 + x;
          const sl = w.inb(wx, wy) ? w.slad[w.idx(wx, wy)] : 0;
          let h = Math.imul(R0[k] + 1, 0x9e3779b1) ^ (S0[k] << 7) ^ (MI0[k] << 8) ^ (sl << 9);
          h = Math.imul(h ^ ((F0[k] * 40 + 0.5) | 0), 0x85ebca6b);
          h = Math.imul(h ^ ((LT0[k] * 48 + 0.5) | 0) ^ (((L0[k] * 48 + 0.5) | 0) << 8), 0xc2b2ae35);
          h = Math.imul(h ^ ((A0[k] * 64 + 512) | 0) ^ (((B0[k] * 32 + 0.5) | 0) << 12), 0x27d4eb2f);
          h = Math.imul(h ^ ((OA0[k] * 32 + 0.5) | 0) ^ (((ST0[k] * 32 + 0.5) | 0) << 8), 0x165667b1);
          KL[k] = h ^ (h >>> 15);
          // płynie albo tętni: rysuje się co klatkę
          const ruch = MP0[k] > 0 || WP0[k] > 0 || R0[k] === T.CORE;
          const px = wx - this.pLx0, py = wy - this.pLy0;
          const stary = px >= 0 && py >= 0 && px < this.pLw && py < this.pLh ? PK[py * this.pLw + px] : ~KL[k];
          ZM[k] = ruch || stary !== KL[k] ? 1 : 0;
        }
      }
    }
    let pelna = !this.odbitkaWazna || zoom !== this.pZoom || w !== this.pSwiat || kontrast !== this.pKontrast;
    if (this.zgrubne.length !== w.w * w.h) { this.zgrubne = new Uint8Array(w.w * w.h); pelna = true; }
    const ddx = ox - this.pOx, ddy = oy - this.pOy;
    if (!pelna && (ddx >= aw || -ddx >= aw || ddy >= ah || -ddy >= ah)) pelna = true;
    // odsłonięte paski (piksele bufora), które po przesunięciu trzeba narysować
    let odsX0 = 0, odsX1 = 0, odsY0 = 0, odsY1 = 0;
    const d32b = this.d32, e32 = this.e32;
    if (pelna) {
      e32.fill(0);
    } else if (ddx !== 0 || ddy !== 0) {
      // przesunięcie o całe piksele: wiersze kopiowane w kolejności, która nie nadpisze źródła
      const x0 = ddx > 0 ? 0 : -ddx, n = aw - (ddx > 0 ? ddx : -ddx);
      const sx0 = ddx > 0 ? ddx : 0;
      for (let i = 0; i < ah; i++) {
        const y = ddy > 0 ? i : ah - 1 - i;
        const sy = y + ddy;
        if (sy < 0 || sy >= ah) continue;
        d32b.copyWithin(y * aw + x0, sy * aw + sx0, sy * aw + sx0 + n);
        e32.copyWithin(y * aw + x0, sy * aw + sx0, sy * aw + sx0 + n);
      }
      if (ddx > 0) { odsX0 = aw - ddx; odsX1 = aw; } else if (ddx < 0) { odsX0 = 0; odsX1 = -ddx; }
      if (ddy > 0) { odsY0 = ah - ddy; odsY1 = ah; } else if (ddy < 0) { odsY0 = 0; odsY1 = -ddy; }
    }
    // pełna odbitka dużej płyty idzie najpierw zgrubnie; dopracowanie dostaje tyle czasu na przerysowanie
    const zgrubnie = pelna && aw * ah > 250000;
    const ZG = this.zgrubne;
    const koniec = performance.now() + 12;
    this.niedokonczona = false;
    /** Zgrubny kafel: policzony co drugi piksel — skopiuj każdy na sąsiadów w kwadracie 2×2. */
    const powiel = (px0: number, px1: number, py0: number, py1: number): void => {
      for (let py = py0; py < py1; py += 2) {
        const r0 = py * aw, r1 = py + 1 < py1 ? r0 + aw : -1;
        for (let px = px0; px < px1; px += 2) {
          const v = d32b[r0 + px], e = e32[r0 + px];
          const p2 = px + 1 < px1;
          if (p2) { d32b[r0 + px + 1] = v; e32[r0 + px + 1] = e; }
          if (r1 >= 0) { d32b[r1 + px] = v; e32[r1 + px] = e; if (p2) { d32b[r1 + px + 1] = v; e32[r1 + px + 1] = e; } }
        }
      }
    };
    this.odbitkaWazna = true;
    this.pZoom = zoom; this.pOx = ox; this.pOy = oy; this.pSwiat = w; this.pKontrast = kontrast;
    this.pKlucz = KL; this.klucz = PK.length === nk ? PK : new Uint32Array(nk);
    this.pLx0 = lx0; this.pLy0 = ly0; this.pLw = lw0; this.pLh = lh0;

    let depth = 0, czer = 0, przyPomniku = 1;
    const ustaw = (P: Kreska, mat: number): void => {
      const hat = H[mat];
      P.mat = mat;
      barwyMaterialu(mat, depth, przyPomniku, this.pig, 0);
      const pg = this.pig;
      P.br = pg[0]; P.bg = pg[1]; P.bb = pg[2]; P.tr = pg[3]; P.tg = pg[4]; P.tb = pg[5];
      if (hat) { P.toneC = hat.tone; P.sp = hat.sp; P.cross = hat.cross; P.stip = hat.stipple; }
      else { P.toneC = 0.2; P.sp = 4.2; P.cross = 0.6; P.stip = 0; }
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
    const PC = RS.pustkaCien, PO = RS.pustkaOtwarta;
    const POS = RS.posadzka;
    const soX0 = w.salaOltarza.x0, soX1 = w.salaOltarza.x1, soY0 = w.salaOltarza.y0, soY1 = w.salaOltarza.y1;
    const ciosW = Math.max(0.7, zoom * 0.045);              // pół grubości fugi ciosów na ścianie sali (px)

    for (let ty = ty0; ty <= ty1; ty++) {
      const py0 = Math.max(0, Math.round((ty - top) * zoom));
      const py1 = Math.min(ah, Math.round((ty + 1 - top) * zoom));
      if (py1 <= py0) continue;
      const inbY = ty >= 0 && ty < w.h;
      depth = w.depth(ty);
      czer = czerwienGlebi(depth);
      // tylna ściana jaskini: ugier płytko, umbra w środku, chłodny łupek w głębi (płynnie między nimi)
      const dw = depth < 0.17 ? 0 : depth > 0.85 ? 2 : (depth - 0.17) / 0.34;
      const di = dw >= 2 ? 1 : Math.floor(dw), dt = dw - di;
      const acR = PC[di][0] + (PC[di + 1][0] - PC[di][0]) * dt + czer * 14, acG = PC[di][1] + (PC[di + 1][1] - PC[di][1]) * dt, acB = PC[di][2] + (PC[di + 1][2] - PC[di][2]) * dt;
      const aoR = PO[di][0] + (PO[di + 1][0] - PO[di][0]) * dt + czer * 26, aoG = PO[di][1] + (PO[di + 1][1] - PO[di][1]) * dt + czer * 6, aoB = PO[di][2] + (PO[di + 1][2] - PO[di][2]) * dt - czer * 8;

      for (let tx = tx0; tx <= tx1; tx++) {
        przyPomniku = czerwienPrzyPomniku(w, tx);
        const px0 = Math.max(0, Math.round((tx - left) * zoom));
        const px1 = Math.min(aw, Math.round((tx + 1 - left) * zoom));
        if (px1 <= px0) continue;
        const inb = inbY && tx >= 0 && tx < w.w;
        const i = inb ? w.idx(tx, ty) : -1;

        // kafel w oknie pól pomocniczych (okno ma zapas, więc na ekranie zawsze jest wewnątrz)
        const kx = tx - this.lx0, ky = ty - this.ly0;
        const k = ky * lw + kx;
        const wOknie = kx >= 1 && ky >= 1 && kx < lw - 2 && ky < this.lh - 2;
        let krok = zgrubnie ? 2 : 1;
        if (!pelna && wOknie
          && !(px0 < odsX1 && px1 > odsX0) && !(py0 < odsY1 && py1 > odsY0)
          && (ZM[k - lw - 1] | ZM[k - lw] | ZM[k - lw + 1] | ZM[k - 1] | ZM[k] | ZM[k + 1] | ZM[k + lw - 1] | ZM[k + lw] | ZM[k + lw + 1]) === 0) {
          // czysty kafel: zostaje z poprzedniej odbitki, chyba że był zgrubny i starczy czasu na dopracowanie
          if (i < 0 || ZG[i] === 0) continue;
          if (performance.now() > koniec) { this.niedokonczona = true; continue; }
        }
        if (i >= 0) ZG[i] = krok === 2 ? 1 : 0;
        if (!pelna) for (let py = py0; py < py1; py++) e32.fill(0, py * aw + px0, py * aw + px1);
        const f00 = wOknie ? F[k] : 0, f10 = wOknie ? F[k + 1] : 0;
        const f01 = wOknie ? F[k + lw] : 0, f11 = wOknie ? F[k + lw + 1] : 0;
        const known = f00 + f10 + f01 + f11;
        if (known <= 0.002) {
          // nieznane: półmrok ze szkicem — gra dzieje się w ciemności, pustka ciągnie oko mniej niż to, co widać
          for (let py = py0; py < py1; py += krok) {
            const gy = py + oy;
            const row = py * aw;
            for (let px = px0; px < px1; px += krok) duch((row + px) * 4, px, py, px + ox, gy);
          }
          if (krok === 2) powiel(px0, px1, py0, py1);
          continue;
        }
        const l00 = LT[k], l10 = LT[k + 1], l01 = LT[k + lw], l11 = LT[k + lw + 1];
        const e00 = L[k], e10 = L[k + 1], e01 = L[k + lw], e11 = L[k + lw + 1];
        const a00 = A[k], a10 = A[k + 1], a01 = A[k + lw], a11 = A[k + lw + 1];
        const b00 = B[k], b10 = B[k + 1], b01 = B[k + lw], b11 = B[k + lw + 1];
        const o00 = OA[k], o10 = OA[k + 1], o01 = OA[k + lw], o11 = OA[k + lw + 1];
        const t00 = ST[k], t10 = ST[k + 1], t01 = ST[k + lw], t11 = ST[k + lw + 1];

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
        const isp = 1 / pSp, sp2 = pSp * 1.45, isp2 = 1 / sp2;
        const pJas = pMat === T.STONE ? 0.75 : 1;
        // raz na kafel: czy w ogóle sięga go granica warstw, czy świeci (poświata), czy ma iskry kruszcu
        let blisko = false;
        if (gr && inbY) {
          const xc = tx < 0 ? 0 : tx >= w.w ? w.w - 1 : tx;
          const d1 = ty + 0.5 - gr.g1[xc], d2 = ty + 0.5 - gr.g2[xc];
          blisko = (d1 > -2.5 && d1 < 2.5) || (d2 > -2.5 && d2 < 2.5);
        }
        const swieci = e00 > 0.25 || e10 > 0.25 || e01 > 0.25 || e11 > 0.25;
        // miękka skała i ziemia: krótsze odcinki (kreska rwie się jak w piaskowcu), reszta dłuższe
        const przOff = pMat === T.MIEKKA || pMat === T.SOIL ? 0.5 : 0.42;
        const iskry = pMat === T.ORE || pMat === T.CRYSTAL || pMat === T.ZLOTO;
        // kamień pod jasną salą to jej posadzka (dwa rzędy podłogi); niżej zwykła skała ramy, nie ceglany słup
        const posadzka = pMat === T.STONE && soX1 >= 0 && tx >= soX0 && tx <= soX1 && ty >= soY1 && ty <= soY1 + 1;
        // w głębi warstwy kąt jest ten sam we wszystkich rogach — bez interpolacji
        const katStaly = Math.abs(a00 - a10) + Math.abs(a00 - a01) + Math.abs(a00 - a11) < 1e-5;
        // własny rylec mają tylko kamień nie do ruszenia i kryształ; reszta bierze kąt warstwy z gładkiej granicy
        const wlasnyKat = !gr || pMat === T.STONE || pMat === T.CRYSTAL;
        // płaty: trzy najbliższe ziarna spośród 3×3 komórek wokół środka kafla — z nich krawędzie płatów w kaflu
        const platyKafla = !plaski && (lity || brzegowy);
        if (platyKafla) {
          const cx = (tx + 0.5) * PLAT_IOCZKO, cy = (ty + 0.5) * PLAT_IOCZKO;
          const icx = Math.floor(cx), icy = Math.floor(cy);
          let b0 = 1e9, b1 = 1e9, b2 = 1e9;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const id = (((icy + dy) & 63) << 6) | ((icx + dx) & 63);
              const qx = icx + dx + VOR_X[id] - cx, qy = icy + dy + VOR_Y[id] - cy;
              const e = qx * qx + qy * qy;
              if (e < b0) { b2 = b1; PID[2] = PID[1]; b1 = b0; PID[1] = PID[0]; b0 = e; PID[0] = id; }
              else if (e < b1) { b2 = b1; PID[2] = PID[1]; b1 = e; PID[1] = id; }
              else if (e < b2) { b2 = e; PID[2] = id; }
            }
          }
          for (let n = 0; n < 3; n++) {
            const id = PID[n];
            // komórka ziarna względem kafla: id niesie tylko reszty z 64, więc odtwarzamy ją od komórki kafla
            const ix = icx + ((((id & 63) - (icx & 63)) + 96) & 63) - 32, iy = icy + ((((id >> 6) - (icy & 63)) + 96) & 63) - 32;
            PL[n * 2] = (ix + VOR_X[id]) * PLAT_OCZKO; PL[n * 2 + 1] = (iy + VOR_Y[id]) * PLAT_OCZKO;
            PLK[n] = VOR_K[id]; PLJ[n] = VOR_J[id];
          }
          for (let p = 0; p < 3; p++) {
            const a = p === 2 ? 1 : 0, c = p === 0 ? 1 : 2;
            const ddx = PL[a * 2] - PL[c * 2], ddy = PL[a * 2 + 1] - PL[c * 2 + 1];
            PLI[p] = 0.5 / Math.sqrt(ddx * ddx + ddy * ddy + 1e-6);
            const lo = PID[a] < PID[c] ? PID[a] : PID[c], hi = PID[a] < PID[c] ? PID[c] : PID[a];
            PLR[p] = ((Math.imul(lo, 73856093) ^ Math.imul(hi, 19349663)) >>> 4) % 100 < RS.platy.rysyUdzial * 100 ? 1 : 0;
          }
        }
        const ws = warstwaMaterialu(pMat);
        const gmR = GM[ws][0], gmG = GM[ws][1], gmB = GM[ws][2];
        // uwarstwienie: spoina co tyle kafli; z daleka rzadziej, żeby nie zlała się w ton
        const uw = RS.uwarstwienie[pMat];
        let bedF = 0, bedS = 0, bedPx = 0;
        if (uw && !plaski) {
          bedF = 1 / uw[0];
          const krok = Math.max(1, Math.ceil(7 * bedF / zoom));
          bedF /= krok; bedPx = zoom / bedF;
          // z daleka spoiny gasną — inaczej góra wyglądała jak papier w linie
          bedS = uw[1] * kontrast * (zoom < 5 ? 0 : zoom > 12 ? 1 : (zoom - 5) / 7);
        }

        for (let py = py0; py < py1; py += krok) {
          const wyP = top + (py + 0.5) * izoom;
          const fy = wyP - ty;
          const gy = py + oy;
          const row = py * aw;
          const ny = gy & 255, ny2 = (gy + 71) & 255, ny2b = ((gy * 2 + 29) & 255);
          const fyi = 1 - fy;
          const fa0 = f00 * fyi + f01 * fy, fa1 = f10 * fyi + f11 * fy;
          const la0 = l00 * fyi + l01 * fy, la1 = l10 * fyi + l11 * fy;
          const ea0 = e00 * fyi + e01 * fy, ea1 = e10 * fyi + e11 * fy;
          const aa0 = a00 * fyi + a01 * fy, aa1 = a10 * fyi + a11 * fy;
          const ba0 = b00 * fyi + b01 * fy, ba1 = b10 * fyi + b11 * fy;
          const oa0 = o00 * fyi + o01 * fy, oa1 = o10 * fyi + o11 * fy;
          const sa0 = t00 * fyi + t01 * fy, sa1 = t10 * fyi + t11 * fy;
          // ćwiartka między środkami kafli, w której leży wiersz
          const qy = fy < 0.5 ? 0 : 3;
          const v = fy < 0.5 ? fy + 0.5 : fy - 0.5;
          const svM = v * (0.8 + 0.2 * v * (3 - 2 * v)), dvM = 0.8 + 1.2 * v * (1 - v);
          const wyq = (((ty + fy) * 4.3) | 0) & 255;
          const KR = this.kraw;
          if (miekko) {
            for (let c = 0; c < 7; c++) {
              KR[c] = RK[c00 + c] * fyi + RK[c01 + c] * fy;
              KR[7 + c] = RK[c10 + c] * fyi + RK[c11 + c] * fy;
            }
          }
          const ey = fy < 0.5 ? 1 - fy * 2 : fy * 2 - 1;

          for (let px = px0; px < px1; px += krok) {
            const fx = kolX[px] - tx;
            const gx = px + ox;
            const o = (row + px) * 4;

            const ft = fa0 * (1 - fx) + fa1 * fx;
            // brzeg pamięci postrzępiony płatami, ale bez dziur w środku tego, co się pamięta
            // (łagodniej niż dawniej: mocno postrzępiony brzeg zostawiał nad salą czarne plamy jak przypalony papier)
            const fr = ft <= 0.001 ? 0 : ft > 0.985 ? ft : ft + (smooth[(((gy * 0.3) & 255) << 8) | ((gx * 0.2) & 255)] - 0.5) * (ft < 0.5 ? 0.3 : 0.6 * (1 - ft));
            if (fr <= 0.06) {                            // Otchłań — ciemność bez rysunku
              duch(o, px, py, gx, gy);
              continue;
            }
            const lt = la0 * (1 - fx) + la1 * fx;
            const mem = fr < 1 ? fr : 1;

            // gładka ściana: twardość interpolowana między środkami kafli, z drżeniem rylca
            let skala = lity, linia = 0, swP = 0;
            if (brzegowy) {
              const qx = fx < 0.5 ? 0 : 1;
              const u = fx < 0.5 ? fx + 0.5 : fx - 0.5;
              const s00 = S9[qy + qx], s10 = S9[qy + qx + 1], s01 = S9[qy + 3 + qx], s11 = S9[qy + 4 + qx];
              // prawie liniowo, odrobinę gładko: schodki z kafli stają się prostym skosem (jak w marching
              // squares) zamiast falistej wstęgi, a pojedynczy filar jeszcze nie robi się rombem
              const su = u * (0.8 + 0.2 * u * (3 - 2 * u)), du = 0.8 + 1.2 * u * (1 - u);
              const gT = s00 + (s10 - s00) * su, gB = s01 + (s11 - s01) * su;
              const drzy = (smooth[(wyq << 8) | ((((tx + fx) * 4.3) | 0) & 255)] - 0.5) * 0.16;
              const sP = gT + (gB - gT) * svM + drzy;
              skala = sP > 0.5;
              if (linie) {
                const gu = ((s10 - s00) * (1 - svM) + (s11 - s01) * svM) * du;
                const gv = (gB - gT) * dvM;
                const gr2 = Math.sqrt(gu * gu + gv * gv);
                if (gr2 > 0.02) {
                  const d = Math.abs(sP - 0.5) / gr2 * zoom;
                  const podloga = gv > 0 ? gv / gr2 : 0;    // twardość rośnie w dół: pod spodem skała
                  const hw = hwS + (hwP - hwS) * podloga * podloga;
                  const zanik = mem < 0.7 ? mem / 0.7 : 1;
                  linia = hw + 0.5 - d;
                  if (linia > 1) linia = 1;
                  if (linia > 0) linia *= 0.88 * zanik;
                  // świetlik: jasny brzeg podłogi tuż pod konturem — tam pada światło lampki
                  if (skala && podloga > 0.3 && d > hw * 0.5) {
                    const t = 1 - (d - hw * 0.5) / rimW;
                    if (t > 0) {
                      const swiatlo = swBaza + (1 - swBaza) * (lt > 0.6 ? 1 : lt / 0.6);
                      swP = t * t * (podloga - 0.3) / 0.7 * swiatlo * zanik;
                    }
                  }
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
            // granice warstw: ciemna linia rylca i jasna tuż pod nią (w pustce słabiej — to tylna ściana)
            let gC = 0, gJ = 0;
            if (blisko && rodzaj < 2) {
              let d1 = (wyP - kolG1[px]) * zoom, d2 = (wyP - kolG2[px]) * zoom;
              if (d2 > -6 && d2 < d1) d1 = d2;
              if (d1 > -4 && d1 < 8 && kolX[px] >= rama && kolX[px] < ramaP) {
                const ad = d1 < 0 ? -d1 : d1;
                gC = gW + 0.5 - ad; gC = gC < 0 ? 0 : gC > 1 ? 1 : gC;
                const dj = d1 - gW - 1.6;
                gJ = 1.1 - (dj < 0 ? -dj : dj); gJ = gJ < 0 ? 0 : gJ > 1 ? 1 : gJ;
              }
            }

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
              const fal = Math.sin(gx * 0.35 + fala * 3 + ty * 1.7) * 0.8;
              const pas = ((gy + fal) % 4 + 4) % 4 < 1;
              r = 22 + lt * 30; g = 40 + lt * 26 - glab * 6; b = 52 + lt * 12 + glab * 10;
              if (pas && noise[(ny2 << 8) | (gx & 255)] > 0.25) { r += 34; g += 62; b += 70; }
              if (lustro && fy < 0.28) { const k = 1 - fy / 0.28; r += 150 * k; g += 170 * k; b += 170 * k; }
              r = r * (0.35 + 0.65 * mem); g = g * (0.35 + 0.65 * mem); b = b * (0.35 + 0.65 * mem);
            } else if (rodzaj === 1) {
              const mat = pMat;
              if (posadzka) {
                // posadzka sali: ciosane płyty kamienia w przesuniętych rzędach — lud stoi na podłodze, nie na skale
                const v = wyP * 2, ci = Math.floor(v);
                const u = kolX[px] * 0.8 + (ci & 1) * 0.5 + noise[(ci & 255) << 8] * 0.3;
                let fu = u - Math.floor(u); fu = fu < 0.5 ? fu : 1 - fu;
                let fv = v - ci; fv = fv < 0.5 ? fv : 1 - fv;
                const dsp = Math.min(fu * zoom * 1.25, fv * zoom * 0.5);
                const ltp = lt > 1 ? 1 : lt;
                const lico = 0.62 + 0.38 * ltp - (fv < 0.25 && v - ci > 0.5 ? 0.12 : 0) + (smooth[((gy >> 1 & 255) << 8) | (gx >> 1 & 255)] - 0.5) * 0.18;
                r = (POS[0] + lt * SS[0]) * lico; g = (POS[1] + lt * SS[1]) * lico; b = (POS[2] + lt * SS[2]) * lico;
                // spoina: ciemna linia rylca; górna krawędź płyty łapie światło
                const sp2v = 0.9 - dsp;
                if (sp2v > 0) { const kk = (sp2v > 1 ? 1 : sp2v) * 0.8; r += (KO[0] - r) * kk; g += (KO[1] - g) * kk; b += (KO[2] - b) * kk; }
                else if (v - ci < 0.5 && fv * zoom * 0.5 < 2) { const kk = 0.25 * ltp; r += (SW[0] - r) * kk; g += (SW[1] - g) * kk; b += (SW[2] - b) * kk; }
                // poza pamięcią posadzka gaśnie w półmrok nieznanego, nie w czerń
                if (mem < 0.7) { const wm = mem / 0.7; r = gmR + 4 + (r - gmR - 4) * wm; g = gmG + 3 + (g - gmG - 3) * wm; b = gmB + 3 + (b - gmB - 3) * wm; }
              } else if (mat === T.CORE) {
                // rdzeń: serce, nie kamień — jasny środek i kręgi rozchodzące się z każdym uderzeniem
                const dxr = tx + fx - w.coreX - 0.5, dyr = ty + fy - w.coreY - 0.5;
                const dr = Math.sqrt(dxr * dxr + dyr * dyr);
                const krag = 0.5 + 0.5 * Math.sin(dr * 5 - time * 0.004);
                // okrągła kula w ciemnej skorupie, nie krzyż z kafli: brzeg kuli oddycha z tętnem
                const RR = 1.55 + 0.18 * tetno;
                let kula = (RR + 0.3 - dr) / 0.6;
                kula = kula < 0 ? 0 : kula > 1 ? 1 : kula * kula * (3 - 2 * kula);
                const srodek = Math.max(0, 1 - dr / 2.2);
                const pr = 120 + 130 * srodek + 40 * krag, pg = 20 + 80 * srodek * srodek + 20 * krag * srodek, pb = 28 + 56 * srodek * srodek;
                const blask = Math.max(0, 1 - dr / 3.6) * (0.5 + 0.5 * tetno);
                const sr = 30 + 70 * blask, sg = 10 + 12 * blask, sb = 12 + 12 * blask;
                r = sr + (pr - sr) * kula; g = sg + (pg - sg) * kula; b = sb + (pb - sb) * kula;
                edata[o] = r; edata[o + 1] = g * 0.6; edata[o + 2] = b * 0.6; edata[o + 3] = 255 * (0.25 + 0.6 * tetno) * (0.35 + 0.65 * kula);
              } else {
                // skała: ciemna masa rytowana kreską — przy jaskini jaśniejsza i gęstsza (płaskorzeźba)
                const bl = ba0 * (1 - fx) + ba1 * fx;
                // dawno widziana skała nie ciemnieje poniżej półmroku nieznanego (inaczej brzeg pamięci miał ciemne kafle)
                const ciem = 0.8 + 0.2 * mem;
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
                const rel = (0.84 + 0.12 * bl) * ciem;
                r = kBr * rel + lt * SS[0]; g = kBg * rel + lt * SS[1]; b = kBb * rel + lt * SS[2];
                // płat skały (komórka Woronoja z trzech najbliższych ziaren kafla): kamień pęka na wieloboczne
                // płaszczyzny — każda ma własny kierunek kreski i trochę inną jasność, a na styku biegnie rysa
                let platKat = 0, rysa = 0;
                if (platyKafla) {
                  const wxp = kolX[px];
                  const q0x = wxp - PL[0], q0y = wyP - PL[1], q1x = wxp - PL[2], q1y = wyP - PL[3], q2x = wxp - PL[4], q2y = wyP - PL[5];
                  const e0 = q0x * q0x + q0y * q0y, e1 = q1x * q1x + q1y * q1y, e2 = q2x * q2x + q2y * q2y;
                  let n1: number, n2: number, d1: number, d2: number;
                  if (e0 <= e1 && e0 <= e2) { n1 = 0; d1 = e0; if (e1 <= e2) { n2 = 1; d2 = e1; } else { n2 = 2; d2 = e2; } }
                  else if (e1 <= e2) { n1 = 1; d1 = e1; if (e0 <= e2) { n2 = 0; d2 = e0; } else { n2 = 2; d2 = e2; } }
                  else { n1 = 2; d1 = e2; if (e0 <= e1) { n2 = 0; d2 = e0; } else { n2 = 1; d2 = e1; } }
                  platKat = PLK[n1];
                  const kj = 1 + PLJ[n1];
                  r *= kj; g *= kj; b *= kj;
                  const para = n1 + n2 - 1;
                  if (rysyWidac && PLR[para] === 1) {
                    // odległość od dwusiecznej dwóch ziaren (px) — prosta krawędź płatu
                    const de = (d2 - d1) * PLI[para] * zoom;
                    if (de < rysaW && smooth[((((wyP * 2.3) | 0) & 255) << 8) | (((wxp * 2.3) | 0) & 255)] > 0.33) rysa = 1 - de / rysaW;
                  }
                }
                let tone = (kT * (0.5 + 0.85 * bl) + lt * 0.16) * (0.2 + 0.8 * mem) * kontrast;
                if (slad === 1) tone *= 1.25;
                else if (slad === 2) tone *= 0.7;
                if (tone > TONE_MAX) tone = TONE_MAX;
                // spoina warstwy: kreska się na niej urywa, a masa ciemnieje
                let bed = 0;
                if (bedS > 0) {
                  const bp = (wyP + kolFala[px]) * bedF;
                  const bi = Math.floor(bp + 0.5);
                  let bt = bp - bi; if (bt < 0) bt = -bt;
                  const dpx = bt * bedPx;
                  if (dpx < 1.2 && smooth[(((bi * 37) & 255) << 8) | ((gx >> 3) & 255)] > 0.46) bed = (1.2 - dpx) / 1.2 * bedS;
                  r *= 1 - bed * 0.5; g *= 1 - bed * 0.5; b *= 1 - bed * 0.5;
                }
                if (plaski) {
                  // z daleka: gęsta ukośna kreska co cztery piksele — skała ma fakturę, pustka jest gładka
                  const kk = Math.min(1, tone * 1.3) * (((gx + gy) & 3) === 0 ? 0.75 : 0.18);
                  r += (kTr - r) * kk; g += (kTg - g) * kk; b += (kTb - b) * kk;
                } else if (tone > 0.02) {
                  // kierunek rylca: kąt warstwy z gładkiej granicy (nie z kafla — kąt zmienia się dokładnie na linii
                  // granicy, bez wachlarza w kaflu przejścia) i odchylenie płatu
                  let angP: number;
                  if (wlasnyKat) angP = katStaly ? a00 : aa0 * (1 - fx) + aa1 * fx;
                  else angP = KAT_WARSTW[wyP < kolG1[px] ? 0 : wyP < kolG2[px] ? 1 : 2];
                  angP += platKat;
                  let ai = ((angP + 1.8) * 71.1) | 0;
                  ai = ai < 0 ? 0 : ai > 256 ? 256 : ai;
                  const ca = cosT[ai], sa = sinT[ai];
                  // kreska drży wzdłuż siebie jak prowadzona ręką; pokrycie z odległości od jej osi
                  const jit = (smooth[(ny2 << 8) | (gx & 255)] - 0.5) * pSp * 0.12;
                  const gyw = gy;
                  const uu = (gx * ca + gyw * sa + jit) * isp;
                  const nr = Math.floor(uu + 0.5);
                  let tt = uu - nr; if (tt < 0) tt = -tt;
                  let hw = tone * pSp * 0.3;
                  hw = hw < 0.3 ? 0.3 : hw > hwMax ? hwMax : hw;
                  let cov = hw + 0.5 - tt * pSp;
                  // kreska rwie się na odcinki różnej długości, a każdy odcinek pęcznieje w środku i zwęża się
                  // na końcach jak ślad rylca — równe kreski jednej grubości czytały się jak deszcz
                  if (cov > 0) {
                    const wzd = (gyw * ca - gx * sa) * dashF;
                    const wi = Math.floor(wzd), wt = wzd - wi;
                    const rz = ((nr * 29) & 255) << 8;
                    const d0 = smooth[rz | (wi & 255)], d1 = smooth[rz | ((wi + 1) & 255)];
                    // pamiętane dawno: odcinki rzedną (kreska rwie się w szkic, nie w kropki)
                    const przer = d0 + (d1 - d0) * wt - przOff + bl * 0.2 - (mem < 0.9 ? (0.9 - mem) * 0.45 : 0);
                    if (przer <= 0) cov = 0;
                    else if (przer < 0.2) {
                      const nac = przer / 0.2;
                      cov = (0.25 + hw * nac) + 0.25 - tt * pSp;
                      if (cov > 0) cov *= 0.4 + 0.6 * nac;
                    }
                  }
                  cov = cov < 0 ? 0 : cov > 1 ? 1 : cov;
                  if (tone > pCross) {
                    // krzyż pod kątem ok. 63° do kreski i rzadszy — prostopadła siatka czytała się jak plecionka
                    const c2a = ca * 0.4536 - sa * 0.8912, s2a = sa * 0.4536 + ca * 0.8912;
                    const u2 = (gx * c2a + gyw * s2a + jit * 0.6) * isp2;
                    const n2 = Math.floor(u2 + 0.5);
                    let t2 = u2 - n2; if (t2 < 0) t2 = -t2;
                    let hw2 = (tone - pCross) * pSp * 0.3;
                    hw2 = hw2 < 0.28 ? 0.28 : hw2 > hwMax * 0.75 ? hwMax * 0.75 : hw2;
                    let c2 = hw2 + 0.5 - t2 * sp2;
                    if (c2 > 0 && smooth[(((n2 * 53) & 255) << 8) | ((((gyw * c2a - gx * s2a) * dashF) | 0) & 255)] > 0.5) {
                      // krzyż słabszy i w urywkach — równa siatka czytała się jak siatka ogrodzenia
                      c2 = (c2 > 1 ? 1 : c2) * 0.34;
                      if (c2 > cov) cov = c2;
                    }
                  }
                  if (pStip > 0 && cov < 0.6 && noise[(ny2b << 8) | ((gx * 2 + 13) & 255)] < pStip * tone) cov = 0.6;
                  // iskry w rudzie i krysztale: metal i szkło łapią światło
                  if (iskry && noise[(((gy * 5 + 7) & 255) << 8) | ((gx * 5 + 3) & 255)] > 0.996) {
                    r = 255; g = mat === T.ORE || mat === T.ZLOTO ? 230 : 244; b = mat === T.ORE ? 170 : mat === T.ZLOTO ? 120 : 255;
                    if (mat === T.CRYSTAL) { edata[o] = 200; edata[o + 1] = 190; edata[o + 2] = 255; edata[o + 3] = 255; }
                    cov = 0;
                  }
                  if (bed > 0) cov *= 1 - bed * 1.6 < 0 ? 0 : 1 - bed * 1.6;
                  if (rysa > 0) {
                    // w rysie kreska się urywa, a szczelina ciemnieje
                    cov *= 1 - rysa;
                    const kr = rysa * RYSA_SILA * (0.4 + 0.6 * mem);
                    r *= 1 - kr; g *= 1 - kr; b *= 1 - kr;
                  }
                  if (cov > 0) {
                    let cr = kTr, cg = kTg, cb = kTb;
                    if (mem < 0.8) {
                      const sz = (cr + cg + cb) / 3;
                      const ile = (0.8 - mem) / 0.8 * 0.8;
                      cr += (sz - cr) * ile; cg += (sz - cg) * ile; cb += (sz - cb) * ile;
                    }
                    // w głębi masy kreska przygasa, przy jaskini i w świetle jaśnieje — bryła wychodzi ku pustce
                    // (mocniej niż dawniej: kreska ma odcinać się od masy jak rylec od miedzi, a nie mgła)
                    let kk = (0.3 + tone * 0.6 + bl * 0.12 + lt * 0.16) * (0.3 + 0.7 * mem) * pJas;
                    if (kk > 0.85) kk = 0.85;
                    kk *= cov;
                    r += (cr - r) * kk; g += (cg - g) * kk; b += (cb - b) * kk;
                  }
                }
                // na skraju pamięci skała gaśnie w półmrok nieznanego — bez tego nieznane miało brzeg z kafli
                if (mem < 0.45) {
                  const wid = mem / 0.45, w2 = wid * wid * (3 - 2 * wid);
                  r = gmR + 4 + (r - gmR - 4) * w2; g = gmG + 3 + (g - gmG - 3) * w2; b = gmB + 3 + (b - gmB - 3) * w2;
                }
              }
              if (gC > 0) { const kk = gC * gSila * mem; r += (GC[0] - r) * kk; g += (GC[1] - g) * kk; b += (GC[2] - b) * kk; }
              if (gJ > 0) { const kk = gJ * gSila * 0.55 * mem * (0.6 + 0.4 * (lt > 1 ? 1 : lt)); r += (GJ[0] - r) * kk; g += (GJ[1] - g) * kk; b += (GJ[2] - b) * kk; }
            } else {
              // jaskinia: gładka, ciepła tylna ściana — ciemniejsza w kątach przy skale, jaśniejsza w otwartej
              // przestrzeni, z plamami tynku; światło lampek i sali ją rozgrzewa
              const op = oa0 * (1 - fx) + oa1 * fx;
              const sp0 = sa0 * (1 - fx) + sa1 * fx;
              // głębia: kąty przy ścianach i cień pod sklepieniem ciemniejsze, środek i dno jaśniejsze
              const ops = op * (2 - op) * (0.55 + 0.45 * sp0);
              const sciana = (smooth[((((gy * 0.7) | 0) & 255) << 8) | (((gx * 0.7) | 0) & 255)] - 0.5) * RS.tynk
                + (smooth[(ny2 << 8) | ((gx * 3) & 255)] - 0.5) * RS.tynk * 0.35;
              // pamięć: tylna ściana gaśnie płynnie w półmrok nieznanego — bez progu na brzegu
              let pam = (mem - 0.06) / 0.6;
              pam = pam >= 1 ? 1 : pam * (2 - pam);
              const grzbiet = tile === T.SKY ? SURFACE_Y - kolGrzbiet[px] : 1e9;
              if (tile === T.SKY && wyP >= grzbiet) {
                // grzbiet góry: ziemia rytowana skośną kreską, u góry kontur rylca — powierzchnia nie jest linijką
                const zd = (wyP - grzbiet) * zoom;
                const z0 = ziarno[((gy & 255) << 8) | (gx & 255)];
                r = MASA[T.SOIL][0] * 0.9 + z0 * 10; g = MASA[T.SOIL][1] * 0.9 + z0 * 8; b = MASA[T.SOIL][2] * 0.9 + z0 * 6;
                let kt = ((gx + gy) % 6 + 6) % 6;
                kt = kt < 1.2 && smooth[(ny2 << 8) | ((gx >> 2) & 255)] > 0.35 ? 0.35 : 0;
                const tz = MATERIALY[T.SOIL].tint!;
                r += (tz[0] - r) * kt; g += (tz[1] - g) * kt; b += (tz[2] - b) * kt;
                const kon = 1.2 + zoom * 0.05 - zd;
                if (kon > 0) { const kk = kon > 1 ? 0.95 : kon * 0.95; r += (KO[0] - r) * kk; g += (KO[1] - g) * kk; b += (KO[2] - b) * kk; }
              } else if (tile === T.SKY) {
                // niebo nad górą: zmierzch rytowany poziomą kreską, jak niebo na miedziorycie; przy horyzoncie jaśniej
                const hor = (SURFACE_Y - wyP) / 14;
                const zorza = hor >= 1 ? 0 : (1 - (hor < 0 ? 0 : hor)) * RS.zorza;
                r = RS.niebo[0] + sciana * 0.4 + zorza * 1.3; g = RS.niebo[1] + sciana * 0.4 + zorza; b = RS.niebo[2] + sciana * 0.4 + zorza * 0.7;
                const krok = zoom < 8 ? 3 : 4;
                let tn = (gy + (smooth[(ny2 << 8) | ((gx >> 2) & 255)] - 0.5) * 1.6) / krok;
                tn -= Math.floor(tn + 0.5); if (tn < 0) tn = -tn;
                let kn = 0.9 - tn * krok;
                if (kn > 0) {
                  kn *= 0.32 * (smooth[(((gy >> 2) & 255) << 8) | (((gx >> 4) + 40) & 255)] > 0.3 ? 1 : 0.5);
                  const NK = RS.nieboKreska;
                  r += (NK[0] - r) * kn; g += (NK[1] - g) * kn; b += (NK[2] - b) * kn;
                }
              } else {
                const gm = GM[ws];
                // światło mnoży tylną ścianę zamiast ją zalewać — kąty zostają ciemniejsze od środka i sala ma
                // głębię; poza światłem ściana chłodnieje (ciepło lampki gaśnie w szarość kamienia)
                const lm = 1 + lt * 0.5, ch = (1 - (lt > 1 ? 1 : lt)) * 0.1;
                let br = (acR + (aoR - acR) * ops + sciana) * lm * (1 - ch) + lt * SP[0] * 0.5;
                let bg = (acG + (aoG - acG) * ops + sciana * 0.85) * lm + lt * SP[1] * 0.5;
                let bb = (acB + (aoB - acB) * ops + sciana * 0.7) * lm * (1 + ch * 0.6) + lt * SP[2] * 0.5;
                // tylna ściana rytowana: w kątach i pod sklepieniem gęsta, ciemna kreska, w otwartej przestrzeni
                // czysto — tak miedzioryt mówi „głębia”; światło ją rozpuszcza
                if (!plaski) {
                  const ltc = lt > 1 ? 1 : lt;
                  // kąty przy ścianach i to, dokąd światło już nie sięga (kraniec sali, głąb korytarza)
                  const kat = 1 - ops, dal = (1 - ltc) * 0.7;
                  const cien = (kat > dal ? kat : dal) * (1 - ltc * 0.45);
                  if (cien > 0.06) {
                    const uw2 = (gx * 0.2 + gy * 0.98 + (smooth[(ny2 << 8) | ((gx >> 1) & 255)] - 0.5) * 1.2) * iwSp;
                    let tw = uw2 - Math.floor(uw2 + 0.5); if (tw < 0) tw = -tw;
                    let cw = 0.25 + cien * 0.75 + 0.5 - tw * wSp;
                    if (cw > 0) {
                      cw = cw > 1 ? 1 : cw;
                      // odcinki: kreska tylnej ściany rwie się częściej niż w skale
                      const rw = smooth[((((uw2 + 0.5) | 0) * 41 & 255) << 8) | (((gx - gy * 0.2) * dashF * 1.4) & 255)];
                      if (rw > 0.62 - cien * 0.3) {
                        const kw = cw * cien * 0.3;
                        br -= br * kw; bg -= bg * kw; bb -= bb * kw;
                      }
                    }
                  }
                }
                // tylna ściana sali: wielkie ciosy kamienia na zakładkę (fuga ciemna, górna krawędź ciosu łapie
                // światło) — sala jest zbudowana, a nie tylko jaśniejszą plamą w skale
                if (!plaski && soX1 >= 0 && tx >= soX0 && tx <= soX1 && ty >= soY0 && ty <= soY1) {
                  const wiersz = Math.floor(wyP * RS.ciosy.wys), fbyR = wyP * RS.ciosy.wys - wiersz;
                  const bxS = kolX[px] / RS.ciosy.szer + (wiersz & 1) * 0.5, ib = Math.floor(bxS), fbx = bxS - ib;
                  const dV = (fbx < 0.5 ? fbx : 1 - fbx) * RS.ciosy.szer * zoom, dH = (fbyR < 0.5 ? fbyR : 1 - fbyR) * zoom / RS.ciosy.wys;
                  const fuga = 1 - (dV < dH ? dV : dH) / ciosW;
                  const odc = 1 + ((((Math.imul(ib, 73856093) ^ Math.imul(wiersz, 19349663)) >>> 8) & 255) / 255 - 0.5) * RS.ciosy.rozrzut;
                  let kc = odc;
                  if (fuga > 0) kc *= 1 - (fuga > 1 ? 1 : fuga) * RS.ciosy.fuga;
                  else if (fbyR * zoom / RS.ciosy.wys < ciosW * 2.2) kc *= 1 + RS.ciosy.faza;
                  br *= kc; bg *= kc; bb *= kc;
                }
                // pamiętana jaskinia gaśnie w jaśniejszy półmrok niż skała — dawno widziana pustka wciąż
                // czyta się jako pustka, a nie ciemniejsza dziura w kreskowanej masie
                let pj = (mem - 0.06) / 0.2; pj = pj <= 0 ? 1 : pj >= 1 ? 1.6 : 1 + pj * 0.6;
                const gr0 = gm[0] * pj, gg0 = gm[1] * pj, gb0 = gm[2] * pj;
                r = gr0 + (br - gr0) * pam; g = gg0 + (bg - gg0) * pam; b = gb0 + (bb - gb0) * pam;
                if (gC > 0) { const kk = gC * 0.3 * mem; r += (GC[0] - r) * kk; g += (GC[1] - g) * kk; b += (GC[2] - b) * kk; }
              }
              if (slad === 1) { r += 5; g += 4; b += 2; }
              // pył w powietrzu: rzadkie jasne ziarna
              if (!plaski && noise[(ny << 8) | ((gx * 3 + 17) & 255)] > 0.993 - lt * 0.01) { r += 26 * pam; g += 21 * pam; b += 15 * pam; }

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

            // świetlik podłogi, potem kontur rylcem — w tym samym miejscu, w którym ściana naprawdę jest
            if (swP > 0) { r += (SW[0] - r) * swP; g += (SW[1] - g) * swP; b += (SW[2] - b) * swP; }
            if (linia > 0) { r += (KO[0] - r) * linia; g += (KO[1] - g) * linia; b += (KO[2] - b) * linia; }
            data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
            // do poświaty trafia tylko to, co naprawdę świeci (ogień, grzybnia, Znak — nie lampki)
            if (swieci && rodzaj < 2) {
              const le = ea0 * (1 - fx) + ea1 * fx;
              if (le > 0.25) {
                const moc = (le - 0.25) / 0.75 * 0.7;
                if (moc * 255 > edata[o + 3]) { edata[o] = r * moc; edata[o + 1] = g * moc; edata[o + 2] = b * moc; edata[o + 3] = 255 * moc; }
              }
            }
          }
        }
        if (krok === 2) powiel(px0, px1, py0, py1);
      }
    }
  }

  /** Fresk (ustawienia → „Rysunek świata”): półki pigmentu, świetlik i sinopia. */
  private malujFresk(sim: Sim, cam: Camera, time: number): void {
    const w = sim.world;
    const data = this.data;
    const noise = this.noise, smooth = this.smooth;
    const aw = this.aw;
    const zoom = cam.zoom / this.scale;
    const left = cam.x - aw / 2 / zoom;
    const top = cam.y - this.ah / 2 / zoom;

    const tx0 = Math.floor(left) - 1, ty0 = Math.floor(top) - 1;
    const tx1 = Math.ceil(left + aw / zoom) + 1, ty1 = Math.ceil(top + this.ah / zoom) + 1;
    const fala = time * 0.0016;                 // woda i magma płyną
    const edata = this.edata;
    const plaski = zoom < 2.6;   // liczone w pikselach sztuki, nie ekranu
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
    const F = this.fresh, L = this.light, LT = this.swiatlo, B = this.bliskosc, S = this.sol, R = this.rys;
    const MP = this.magmaP, WP = this.wodaP, MI = this.miek, RK = this.rogK;
    const szkic = this.szkic, pig = this.pig;
    /** Piksel nieznanego: ciemna ściana, a pod nią szkic sinopii. */
    const nieznane = (o: number, gx: number, gy: number): void => {
      const ziarno = smooth[(((gy * 2) & 255) << 8) | ((gx * 2) & 255)] * 5 + noise[((gy & 255) << 8) | (gx & 255)] * 4;
      // szkic sinopii, urywany jak kreślony pędzlem
      const k = szkic[(((gy >> 1) & 255) << 8) | ((gx >> 1) & 255)] * FS.szkicSila * (smooth[((((gy >> 2) + 61) & 255) << 8) | (((gx >> 2) + 17) & 255)] > 0.42 ? 1 : 0.25);
      const nr = FS.nieznane[0] + ziarno * 0.6, ng = FS.nieznane[1] + ziarno * 0.5, nb = FS.nieznane[2] + ziarno * 0.45;
      data[o] = nr + (FS.szkic[0] - nr) * k; data[o + 1] = ng + (FS.szkic[1] - ng) * k; data[o + 2] = nb + (FS.szkic[2] - nb) * k;
      data[o + 3] = 255;
    };

    let depth = 0;
    const ustaw = (P: Kreska, mat: number): void => {
      pigmentFresku(mat, depth, 0, pig, 0);
      P.mat = mat;
      P.br = pig[0]; P.bg = pig[1]; P.bb = pig[2]; P.tr = pig[3]; P.tg = pig[4]; P.tb = pig[5];
      P.toneC = 0.5; P.sp = 4; P.cross = 1; P.stip = 0;
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

      const czerwien = Math.pow(depth, 1.9);

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
            const row = py * aw;
            for (let px = px0; px < px1; px++) nieznane((row + px) * 4, px + ox, gy);
          }
          continue;
        }
        const l00 = LT[k], l10 = LT[k + 1], l01 = LT[k + lw], l11 = LT[k + lw + 1];
        const e00 = L[k], e10 = L[k + 1], e01 = L[k + lw], e11 = L[k + lw + 1];
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
        const pMat = P.mat;
        const pBr = P.br, pBg = P.bg, pBb = P.bb, pTr = P.tr, pTg = P.tg, pTb = P.tb;

        for (let py = py0; py < py1; py++) {
          const fy = (py / zoom + top) - ty;
          const gy = py + oy;
          const row = py * aw;
          const ny = gy & 255, ny2 = (gy + 71) & 255, nyS = ((gy * 0.55) & 255);
          const fyi = 1 - fy;
          const fa0 = f00 * fyi + f01 * fy, fa1 = f10 * fyi + f11 * fy;
          const la0 = l00 * fyi + l01 * fy, la1 = l10 * fyi + l11 * fy;
          const ea0 = e00 * fyi + e01 * fy, ea1 = e10 * fyi + e11 * fy;
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
              nieznane(o, gx, gy);
              continue;
            }
            const lt = la0 * (1 - fx) + la1 * fx;
            const mem = fr < 1 ? fr : 1;

            // gładka ściana: twardość interpolowana między środkami kafli, z drżeniem rylca
            let skala = lity, linia = 0, swP = 0;
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
                  // fresk: świetlik — jasny pas na krawędzi podłogi, tuż pod konturem
                  if (skala && podloga > 0.35) {
                    const grub = FS.swietlikGrubosc * zoom + 1;
                    const t = 1 - (d - hw * 0.6) / grub;
                    if (t > 0 && d > hw * 0.6) swP = (t > 1 ? 1 : t) * podloga * FS.swietlikSila * (mem < 0.7 ? mem / 0.7 : 1);
                  }
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
              const fal = Math.sin(gx * 0.35 + fala * 3 + ty * 1.7) * 0.8;
              const pas = ((gy + fal) % 4 + 4) % 4 < 1;
              // lapis z jasnymi falami malowanymi pędzlem
              r = FS.woda[0] + lt * 30; g = FS.woda[1] + lt * 26 - glab * 6; b = FS.woda[2] + lt * 12 + glab * 8;
              if (pas && noise[(ny2 << 8) | (gx & 255)] > 0.3) { r += (FS.fala[0] - r) * 0.6; g += (FS.fala[1] - g) * 0.6; b += (FS.fala[2] - b) * 0.6; }
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
                // fresk: półki pigmentu jak góra z ikony — najjaśniejsza przy jaskini, w głębi ciemniej
                const bl = ba0 * (1 - fx) + ba1 * fx;
                let pr = pBr, pg = pBg, pb = pBb, sr = pTr, sg = pTg, sb = pTb;
                if (miekko) {
                  const ex = fx < 0.5 ? 1 - fx * 2 : fx * 2 - 1;
                  let t = ex > ey ? ex : ey;
                  t *= t;
                  const fxi = 1 - fx;
                  pr += (KR[0] * fxi + KR[7] * fx - pr) * t;
                  pg += (KR[1] * fxi + KR[8] * fx - pg) * t;
                  pb += (KR[2] * fxi + KR[9] * fx - pb) * t;
                  sr += (KR[3] * fxi + KR[10] * fx - sr) * t;
                  sg += (KR[4] * fxi + KR[11] * fx - sg) * t;
                  sb += (KR[5] * fxi + KR[12] * fx - sb) * t;
                }
                // półki: obiegają jaskinie i schodzą stokiem; jasna górna krawędź, ciemny spód
                const fal = (smooth[((((gy * 0.45) | 0) & 255) << 8) | (((gx * 0.3) | 0) & 255)] - 0.5) * FS.falowanie;
                const pole = bl * FS.polkiOdJaskini + (ty + fy) * FS.polkiPion + fal;
                const f = pole - Math.floor(pole);
                let jas = (FS.jasnoscGlebi + (FS.jasnoscKrawedzi - FS.jasnoscGlebi) * bl) * (1 - f * FS.polkaCien * kontrast);
                // smugi pędzla wzdłuż półek
                jas *= 1 + (smooth[((gy & 255) << 8) | (((gx >> 2) + (gy >> 3)) & 255)] - 0.5) * 2 * FS.pedzel;
                r = pr * jas; g = pg * jas; b = pb * jas;
                // brzegi półek: świetlik u góry, kreska sinopii u dołu (grubość stała na ekranie)
                const kr = FS.polkaKreska * FS.polkiPion / Math.max(1, zoom);
                if (f < kr * 1.4) { const k = (1 - f / (kr * 1.4)) * FS.polkaSwietlikSila * kontrast; r += (sr - r) * k; g += (sg - g) * k; b += (sb - b) * k; }
                else if (f > 1 - kr) { const k = (1 - (1 - f) / kr) * FS.polkaKreskaSila * kontrast; r += (FS.kontur[0] - r) * k; g += (FS.kontur[1] - g) * k; b += (FS.kontur[2] - b) * k; }
                // pamięć: pigment blednie ku tynkowi, a gdzieniegdzie odpadł do gołego tynku
                if (mem < 1) {
                  const blak = (1 - mem) * 0.65;
                  r += (FS.tynk[0] - r) * blak; g += (FS.tynk[1] - g) * blak; b += (FS.tynk[2] - b) * blak;
                  if (smooth[((((gy >> 1) + 97) & 255) << 8) | (((gx >> 1) + 41) & 255)] > 1 - FS.ubytki * (1 - mem)) {
                    r = FS.tynk[0] * 0.8; g = FS.tynk[1] * 0.8; b = FS.tynk[2] * 0.8;
                  }
                }
                if (swP > 0) { r += (sr - r) * swP; g += (sg - g) * swP; b += (sb - b) * swP; }
                const ciem = 0.5 + 0.5 * mem;
                r = r * ciem + lt * 46; g = g * ciem + lt * 26; b = b * ciem + lt * 10;
                // na skraju pamięci farba gaśnie w ciemną ścianę — bez tego nieznane miało brzeg z kafli
                if (mem < 0.45) {
                  const wid = mem / 0.45, w2 = wid * wid * (3 - 2 * wid);
                  r = FS.nieznane[0] + (r - FS.nieznane[0]) * w2; g = FS.nieznane[1] + (g - FS.nieznane[1]) * w2; b = FS.nieznane[2] + (b - FS.nieznane[2]) * w2;
                }
                if (slad === 1) { r *= 1.08; g *= 1.06; b *= 1.04; } else if (slad === 2) { r *= 0.8; g *= 0.8; b *= 0.8; }
                // ruda i kryształ: drobiny złota i szkła łapią światło
                if ((mat === T.ORE || mat === T.CRYSTAL || mat === T.ZLOTO) && noise[(((gy * 5 + 7) & 255) << 8) | ((gx * 5 + 3) & 255)] > 0.99) {
                  r = 255; g = mat === T.ORE || mat === T.ZLOTO ? 214 : 236; b = mat === T.ORE ? 120 : mat === T.ZLOTO ? 90 : 255;
                  if (mat === T.CRYSTAL) { edata[o] = 200; edata[o + 1] = 190; edata[o + 2] = 255; edata[o + 3] = 255; }
                }
              }
            } else {
              // jaskinia: gładki półmrok z ledwie widoczną fakturą tylnej ściany;
              // jasność daje tylko światło — ogień, kuźnia, grzybnia
              const sciana = (smooth[((((gy * 0.7) | 0) & 255) << 8) | (((gx * 0.7) | 0) & 255)] - 0.5) * 12
                + (smooth[(ny2 << 8) | ((gx * 3) & 255)] - 0.5) * 4;
              const pam = 0.3 + 0.7 * mem;
              if (tile === T.SKY) {
                // niebo nad górą: przygaszone złoto tła ikony
                r = 84 + sciana * 1.2; g = 62 + sciana; b = 30 + sciana * 0.6;
              } else {
                // grota z ikony: prawie czarna; jasność daje tylko światło — ogień, kuźnia, grzybnia
                r = FS.grota[0] + czerwien * 8 + (sciana * 0.45 + lt * 92) * pam;
                g = FS.grota[1] + (sciana * 0.38 + lt * 56) * pam;
                b = FS.grota[2] + (sciana * 0.3 + lt * 24) * pam;
              }
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
            if (linia > 0) {
              const k = linia * 0.9; r += (FS.kontur[0] - r) * k; g += (FS.kontur[1] - g) * k; b += (FS.kontur[2] - b) * k;
            }
            data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
            // do poświaty trafia tylko to, co naprawdę świeci
            // (lampki i sala grzeją rysunek, ale do poświaty idą tylko ogień, grzybnia i Znak)
            const le = ea0 * (1 - fx) + ea1 * fx;
            if (rodzaj < 2 && le > 0.25) {
              const moc = (le - 0.25) / 0.75 * 0.7;
              if (moc * 255 > edata[o + 3]) { edata[o] = r * moc; edata[o + 1] = g * moc; edata[o + 2] = b * moc; edata[o + 3] = 255 * moc; }
            }
          }
        }
      }
    }
  }}
