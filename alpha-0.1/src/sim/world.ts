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
  /** Alpha: sala startowa pod szybem z jedzeniem — środek jej podłogi (kafel, na którym się stoi). */
  salaStart = { x: (WORLD_W / 2) | 0, y: SURFACE_Y + 2 };
  /** Alpha: kolumna środka szybu z jedzeniem i jego wylot (pierwszy rząd sali pod szybem). */
  szybX = (WORLD_W / 2) | 0;
  szybDol = SURFACE_Y;
  /**
   * Alpha, etap 3: kafle napoczęte kilofem — ile z nich już wykuto (0..1). Postęp zostaje w skale: odświeżony
   * rozkaz, nowy zamiar ani drugi kopacz go nie zerują, a na ekranie skała pęka coraz mocniej. Zmiana kafla czyści wpis.
   */
  readonly kucie = new Map<number, number>();
  private flip = false;

  constructor(seed: number) {
    this.rng = new Rng(seed);
    this.noise = new Noise(this.rng);
    this.generate();
  }

  idx(x: number, y: number): number { return y * this.w + x; }
  inb(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x: number, y: number): number { return this.inb(x, y) ? this.tile[y * this.w + x] : T.ROCK; }
  set(x: number, y: number, t: number): void {
    if (!this.inb(x, y)) return;
    const i = y * this.w + x;
    this.tile[i] = t;
    if (this.kucie.size) this.kucie.delete(i);
  }
  passable(x: number, y: number): boolean { return this.inb(x, y) ? PASSABLE[this.tile[y * this.w + x]] === 1 : false; }
  solid(x: number, y: number): boolean { return !this.passable(x, y); }
  hardness(x: number, y: number): number { return HARDNESS[this.get(x, y)]; }
  /** Głębokość 0..1 — waluta ryzyka. */
  depth(y: number): number { return Math.max(0, (y - SURFACE_Y) / (this.h - SURFACE_Y)); }

  // ---------------------------------------------------------------- generacja

  private generate(): void {
    if (SWIAT.warstwy.wlaczone) { this.generujWarstwy(); return; }
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

    // Remake v1: w górze nie ma ani wody, ani lawy — są za to rozległe jaskinie.
    this.rzezbJaskinie();

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

    this.unknown = this.w * this.h;
  }

  /** Alpha: granica warstw w kolumnie x — na głębokości `g` (0..1), falująca szumem. */
  private granica(x: number, g: number, ziarno: number): number {
    const fal = SWIAT.warstwy.falowanie;
    return Math.round(SURFACE_Y + g * (this.h - SURFACE_Y) + (this.noise.fbm(ziarno + x * 0.05, ziarno * 0.7, 2) - 0.5) * 2 * fal);
  }

  /**
   * Alpha, etap 3 — góra według szkicu (SWIAT.warstwy): pod powierzchnią czapa kamienia, przez nią szyb z jedzeniem
   * do jasnej sali startowej na środku u góry; trzy warstwy skały z żyłami żelaza, małymi jaskiniami (pod dnem
   * złoto) i kieszeniami; gruba rama dookoła; rdzeń w skorupie na środku u dołu, nad nim przedsionek.
   */
  private generujWarstwy(): void {
    const { w, h, rng, noise, tile } = this;
    const S = SWIAT.warstwy;
    const cx = (w / 2) | 0;
    const dnoSali = SURFACE_Y + S.sala.dnoPod;                 // pierwszy rząd podłogi sali
    const stropSali = Math.round(dnoSali - S.sala.ry * 2);       // najwyższy rząd sali
    const g1 = new Int16Array(w), g2 = new Int16Array(w);
    // 1. kolumny: niebo, ziemia, warstwy skały
    for (let x = 0; x < w; x++) {
      this.surface[x] = SURFACE_Y;
      g1[x] = this.granica(x, S.plytkaDo, 11); g2[x] = this.granica(x, S.srodkowaDo, 37);
      for (let y = 0; y < h; y++) {
        const i = y * w + x;
        tile[i] = y < SURFACE_Y ? T.SKY : y < SURFACE_Y + S.ziemia ? T.SOIL : y < g1[x] ? T.MIEKKA : y < g2[x] ? T.ROCK : T.TWARDA;
      }
    }
    const wolno = (x: number, y: number) => x >= S.rama + 2 && x < w - S.rama - 2 && y >= stropSali + 2 && y < h - S.rama - 2;
    const podlogaKrypty = this.przedsionekY + RDZEN.przedsionekY;   // pierwszy lity rząd pod kryptą
    const zaRdzeniem = (x: number, y: number, zapas: number) => Math.hypot(x - this.coreX, (y - this.coreY) * 0.8) < RDZEN.skorupaX + zapas
      || Math.hypot(x - this.coreX, y - this.przedsionekY) < RDZEN.suchaStrefa + zapas * 0.5
      || (Math.abs(x - this.coreX) < S.krypta.rx + zapas && y > podlogaKrypty - S.krypta.wysokosc - zapas);
    const wSali = (x: number, y: number, zapas: number) => Math.abs(x - cx) < S.sala.rx + zapas && y < dnoSali + zapas;
    // 2. żyły żelaza: kępy rudy w miękkiej i zwykłej skale
    const kepa = (x0: number, y0: number, r: number): void => {
      for (let y = Math.floor(y0 - r - 1); y <= y0 + r + 1; y++) for (let x = Math.floor(x0 - r - 1); x <= x0 + r + 1; x++) {
        if (!wolno(x, y)) continue;
        const i = y * w + x;
        if (tile[i] !== T.MIEKKA && tile[i] !== T.ROCK) continue;
        const brzeg = r * (0.75 + 0.5 * noise.fbm(900 + x * 0.4, 400 + y * 0.4, 2));
        if (Math.hypot(x - x0, (y - y0) * 1.3) <= brzeg) tile[i] = T.ORE;
      }
    };
    const losX = () => S.rama + 4 + rng.int(w - 2 * S.rama - 8);
    for (let k = 0; k < S.zelazo.plytka + S.zelazo.srodkowa; k++) {
      const x = losX();
      const plytka = k < S.zelazo.plytka;
      const y0 = plytka ? stropSali + 4 : g1[x] + 2, y1 = plytka ? g1[x] - 1 : g2[x] - 2;
      if (y1 <= y0) continue;
      const y = y0 + rng.int(y1 - y0);
      if (wSali(x, y, 3)) continue;
      kepa(x, y, rng.range(S.zelazo.promienOd, S.zelazo.promienDo));
    }
    // 3. kieszenie i jaskinie: nieregularna elipsa z płaskim dnem; zwraca rząd dna (pierwszy lity pod środkiem)
    const jaskinia = (x0: number, y0: number, rx: number, ry: number): number => {
      const dno = Math.round(y0 + ry * 0.6);
      for (let y = Math.floor(y0 - ry - 1); y < dno; y++) for (let x = Math.floor(x0 - rx - 2); x <= x0 + rx + 2; x++) {
        if (!wolno(x, y)) continue;
        const brzeg = 1 + (noise.fbm(300 + x * 0.17, 700 + y * 0.21, 2) - 0.5) * 0.5;
        const dx = (x - x0) / rx, dy = (y - y0) / ry;
        if (dx * dx + dy * dy <= brzeg * brzeg) tile[y * w + x] = T.AIR;
      }
      return dno;
    };
    const losuj = (y0: number, y1: number, rx: number, ry: number, zapas: number): [number, number] | null => {
      for (let p = 0; p < 30; p++) {
        const x = Math.round(S.rama + 3 + rx + rng.next() * (w - 2 * (S.rama + 3 + rx)));
        const y = Math.round(y0 + rng.next() * Math.max(1, y1 - y0));
        if (wSali(x, y, rx + 4) || zaRdzeniem(x, y, rx + zapas)) continue;
        return [x, y];
      }
      return null;
    };
    const K = S.kieszenie, J = S.jaskinie;
    for (let k = 0; k < K.plytka + K.gleboka; k++) {
      const plytka = k < K.plytka;
      const rx = rng.range(K.rxOd, K.rxDo), ry = rng.range(K.ryOd, K.ryDo);
      const m = plytka ? losuj(stropSali + 10, h * (S.plytkaDo + 0.04), rx, ry, 4) : losuj(h * (S.srodkowaDo + 0.06), this.przedsionekY - 6, rx, ry, 6);
      if (m) jaskinia(m[0], m[1], rx, ry);
    }
    for (let k = 0; k < J.ile; k++) {
      const rx = rng.range(J.rxOd, J.rxDo), ry = rng.range(J.ryOd, J.ryDo);
      const m = losuj(h * (S.plytkaDo + 0.05), h * (S.srodkowaDo - 0.02), rx, ry, 4);
      if (!m) continue;
      const dno = jaskinia(m[0], m[1], rx, ry);
      if (!rng.chance(J.zlotoSzansa)) continue;
      // złoto pod dnem jaskini: pas kruszcu w pierwszym litym rzędzie, czasem i w drugim
      const szer = J.zlotoOd + rng.int(J.zlotoDo - J.zlotoOd + 1);
      const x0 = Math.round(m[0] - szer / 2 + rng.range(-rx * 0.4, rx * 0.4));
      for (let x = x0; x < x0 + szer; x++) {
        let y = dno - 2;
        while (y < dno + 4 && wolno(x, y) && PASSABLE[tile[y * w + x]] === 1) y++;
        if (!wolno(x, y)) continue;
        if (tile[y * w + x] === T.ROCK || tile[y * w + x] === T.MIEKKA) tile[y * w + x] = T.ZLOTO;
        if (rng.chance(0.45) && wolno(x, y + 1) && tile[(y + 1) * w + x] === T.ROCK) tile[(y + 1) * w + x] = T.ZLOTO;
      }
    }
    // 4. czapa nad salą i rama dookoła: kamień nie do ruszenia
    for (let y = SURFACE_Y + S.ziemia; y < stropSali; y++) for (let x = 0; x < w; x++) tile[y * w + x] = T.STONE;
    for (let y = SURFACE_Y; y < h; y++) for (let x = 0; x < w; x++) {
      if (x < S.rama || x >= w - S.rama || y >= h - S.rama) tile[y * w + x] = T.STONE;
    }
    // 5. szyb z jedzeniem i sala startowa: sklepienie łukiem, płaska podłoga z miękkiej skały
    const pol = S.szyb >> 1;
    for (let y = SURFACE_Y - 1; y <= stropSali; y++) for (let x = cx - pol; x <= cx + pol; x++) tile[y * w + x] = T.AIR;
    for (let y = stropSali; y < dnoSali; y++) for (let x = cx - S.sala.rx - 1; x <= cx + S.sala.rx + 1; x++) {
      const dx = (x - cx) / S.sala.rx;
      const luk = stropSali + (S.sala.ry * 0.9) * dx * dx + (noise.fbm(x * 0.3, 55, 2) - 0.5) * 1.2;
      if (Math.abs(x - cx) <= S.sala.rx && y >= luk) tile[y * w + x] = T.AIR;
    }
    for (let x = cx - S.sala.rx - 1; x <= cx + S.sala.rx + 1; x++) for (let y = dnoSali; y < dnoSali + 2; y++) {
      if (PASSABLE[tile[y * w + x]] === 1 || tile[y * w + x] === T.ORE) tile[y * w + x] = T.MIEKKA;
    }
    this.salaStart = { x: cx, y: dnoSali - 1 };
    this.szybX = cx; this.szybDol = stropSali;
    // 6. rdzeń — zamknięty w skorupie, której nikt nie przekopie; nad nim krypta (szeroki pas z płaską podłogą,
    //    sklepienie najwyżej nad rdzeniem) i w niej przedsionek
    this.ellipse(this.coreX, this.coreY, RDZEN.skorupaX, RDZEN.skorupaY, T.STONE);
    this.ellipse(this.coreX, this.coreY, RDZEN.komoraX, RDZEN.komoraY, T.AIR);
    this.ellipse(this.coreX, this.coreY, RDZEN.promien, RDZEN.promien, T.CORE);
    const KR = S.krypta;
    for (let x = this.coreX - KR.rx; x <= this.coreX + KR.rx; x++) {
      if (x < S.rama || x >= w - S.rama) continue;
      const dx = (x - this.coreX) / KR.rx;
      const wys = Math.max(KR.niska, Math.round(KR.wysokosc * (1 - 0.45 * dx * dx) + (noise.fbm(x * 0.21, 91, 2) - 0.5) * 2));
      for (let y = podlogaKrypty - wys; y < podlogaKrypty; y++) tile[y * w + x] = T.AIR;
      const i = podlogaKrypty * w + x;
      if (tile[i] !== T.STONE) tile[i] = T.TWARDA;
    }
    this.ellipse(this.coreX, this.przedsionekY, RDZEN.przedsionekX, RDZEN.przedsionekY, T.AIR);
    this.osuszPrzedsionek();
    for (let k = 0; k < SWIAT.osypywanieNaStart; k++) this.tickSoil(k);
    this.unknown = this.w * this.h;
  }

  /**
   * Rozległe jaskinie (Remake v1): wielkie sale z płaską podłogą, filarami i naciekami,
   * kręte galerie, które łączą sale między sobą, kominy w pionie i niskie groty w głębi
   * (tam, gdzie dawniej leżały jeziora magmy). Liczby w SWIAT.sale / galerie / kominy / groty.
   */
  private rzezbJaskinie(): void {
    const { w, h, rng } = this;
    const S = SWIAT;
    const sale: { x: number; y: number; rx: number; ry: number }[] = [];
    // sale: od pierwszej warstwy pod ziemią do głębi, równo rozrzucone w pionie
    for (let k = 0; k < S.sale.ile; k++) {
      const pas = (k + rng.next()) / S.sale.ile;
      const y = Math.round(SURFACE_Y + S.sale.odPowierzchni + pas * (h * S.sale.doGlebokosci - SURFACE_Y - S.sale.odPowierzchni));
      const rx = rng.range(S.sale.szerokoscOd, S.sale.szerokoscDo), ry = rng.range(S.sale.wysokoscOd, S.sale.wysokoscDo);
      const x = Math.round(rx + 3 + rng.next() * (w - rx * 2 - 6));
      this.sala(x, y, rx, ry);
      sale.push({ x, y, rx, ry });
    }
    // groty w głębi: niskie i szerokie
    for (let k = 0; k < S.groty.ile; k++) {
      const y = Math.round(h * (S.groty.od + rng.next() * S.groty.pas));
      const rx = rng.range(S.groty.szerokoscOd, S.groty.szerokoscDo), ry = rng.range(S.groty.wysokoscOd, S.groty.wysokoscDo);
      const x = Math.round(rx + 3 + rng.next() * (w - rx * 2 - 6));
      this.sala(x, y, rx, ry);
      sale.push({ x, y, rx, ry });
    }
    // galerie: każda sala łączy się z najbliższą sąsiadką i czasem z drugą
    for (let a = 0; a < sale.length; a++) {
      const odl = sale.map((b, j) => ({ j, d: j === a ? 1e9 : Math.hypot(b.x - sale[a].x, (b.y - sale[a].y) * 1.6) })).sort((p, q) => p.d - q.d);
      const ile = rng.chance(S.galerie.drugaSzansa) ? 2 : 1;
      for (let n = 0; n < ile && n < odl.length; n++) {
        const b = sale[odl[n].j];
        if (odl[n].d > S.galerie.najdluzsza) continue;
        this.galeria(sale[a].x, sale[a].y + sale[a].ry * 0.4, b.x, b.y + b.ry * 0.4);
      }
    }
    // kominy: pionowe szyby z sali w dół
    for (let k = 0; k < S.kominy.ile; k++) {
      const s0 = sale[rng.int(sale.length)];
      this.komin(s0.x + rng.range(-s0.rx * 0.6, s0.rx * 0.6), s0.y, rng.range(S.kominy.dlugoscOd, S.kominy.dlugoscDo));
    }
  }

  /** Sala: nieregularna elipsa z płaską podłogą, filary od dna do stropu, stalaktyty i stalagmity. */
  private sala(cx: number, cy: number, rx: number, ry: number): void {
    const { noise, rng, tile } = this;
    const S = SWIAT.sale;
    const podloga = S.podloga;                       // część promienia pod środkiem, gdzie kończy się sala
    for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
      for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
        if (!this.inb(x, y) || y < SURFACE_Y + 3 || x < 1 || x > this.w - 2) continue;
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        const brzeg = 1 + (noise.fbm(300 + x * 0.13, 700 + y * 0.17, 3) - 0.5) * S.poszarpanie;
        if (dy > podloga + (noise.fbm(x * 0.2, 40, 2) - 0.5) * 0.12) continue;        // płaskie dno
        if (dx * dx + dy * dy <= brzeg * brzeg) tile[y * this.w + x] = T.AIR;
      }
    }
    const dno = Math.floor(cy + ry * podloga);
    // filary: kolumny skały od dna do stropu
    const filarow = Math.floor(rx / S.filarCo * rng.next() * 2);
    for (let f = 0; f < filarow; f++) {
      const fx = Math.round(cx + rng.range(-rx * 0.7, rx * 0.7));
      const gruby = 2 + (rng.chance(0.4) ? 1 : 0);
      for (let y = dno; y > cy - ry - 2; y--) {
        if (!this.inb(fx, y)) break;
        const i = y * this.w + fx;
        if (PASSABLE[tile[i]] !== 1 && y < dno - 1) break;
        for (let gx = 0; gx < gruby; gx++) if (this.inb(fx + gx, y)) tile[i + gx] = T.ROCK;
      }
    }
    // nacieki: zęby ze stropu i z dna
    const naciekow = Math.floor(rx * S.naciekiNaKafel);
    for (let n = 0; n < naciekow; n++) {
      const nx = Math.round(cx + rng.range(-rx * 0.85, rx * 0.85));
      const zDolu = rng.chance(0.4);
      const dl = 1 + rng.int(zDolu ? 2 : 3);
      if (zDolu) {
        for (let k = 0; k < dl; k++) if (this.inb(nx, dno - k) && PASSABLE[tile[(dno - k) * this.w + nx]] === 1 && !this.passable(nx, dno - k + 1)) tile[(dno - k) * this.w + nx] = T.ROCK; else break;
      } else {
        let y = Math.floor(cy);
        while (y > 1 && this.passable(nx, y - 1)) y--;
        for (let k = 0; k < dl; k++) if (this.inb(nx, y + k) && PASSABLE[tile[(y + k) * this.w + nx]] === 1) tile[(y + k) * this.w + nx] = T.ROCK;
      }
    }
  }

  /** Galeria: kręty korytarz z punktu do punktu, o zmiennej szerokości. */
  private galeria(x0: number, y0: number, x1: number, y1: number): void {
    const { noise, rng } = this;
    const S = SWIAT.galerie;
    let x = x0, y = y0;
    const krokow = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.6);
    const ziarno = rng.next() * 100;
    for (let k = 0; k < krokow; k++) {
      const a = Math.atan2(y1 - y, x1 - x) + (noise.fbm(ziarno + k * 0.08, 5, 2) - 0.5) * S.krety;
      x += Math.cos(a) * 0.8; y += Math.sin(a) * 0.8;
      // galeria nie przecina boków góry ani nie wychodzi pod niebo
      x = Math.max(3, Math.min(this.w - 4, x)); y = Math.max(SURFACE_Y + 4, Math.min(this.h - 3, y));
      const r = S.promienOd + (S.promienDo - S.promienOd) * noise.fbm(ziarno + 50 + k * 0.05, 9, 2);
      this.ellipse(x, y, r * 1.25, r, T.AIR);
      if (Math.hypot(x1 - x, y1 - y) < 1.5) break;
    }
  }

  /** Komin: pionowy szyb, lekko falujący na boki. */
  private komin(x: number, y: number, dl: number): void {
    const { noise, rng } = this;
    const z = rng.next() * 100;
    for (let k = 0; k < dl; k++) {
      const xx = Math.max(3, Math.min(this.w - 4, x + (noise.fbm(z + k * 0.09, 3, 2) - 0.5) * 6));
      this.ellipse(xx, y + k, SWIAT.kominy.promien, 1.2, T.AIR);
    }
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

  // ------------------------------------------------------------------- płyny

  /** Woda i magma jako objętość w kafelku, nie jako kafelek. */
  tickFluids(tick: number): void {
    if (!SWIAT.plyny) return;
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
