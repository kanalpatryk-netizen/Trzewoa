// Scena piekarni duszków: świat z pustą salą, w której stoi jedna postać, zegar ekranu (60 klatek/s) i tików gry
// (120/s), zdjęcie klatki z przycięciem do rysunku. Rysuje kod gry TS (alpha-1/src/render) — tu jest tylko reżyseria.
import { Sim } from '../../../alpha-1/src/sim/sim';
import { T } from '../../../alpha-1/src/sim/tiles';
import { Job, makeCreature } from '../../../alpha-1/src/sim/creatures';
import { Race } from '../../../alpha-1/src/sim/races';
import { nadajRole, klanLudu } from '../../../alpha-1/src/sim/lud';

/**
 * Skala ekranu wzorcowego: 1920×1080 — ekran logiczny gry ma 820 jednostek wysokości (jak w C#: Ekran), więc jedna
 * jednostka rysunku to 1080/820 piksela.
 */
export const SKALA = 1080 / 820;
/**
 * Poziomy wielkości: wysokość postaci ludu w pikselach ekranu (rycerz i więksi — razy ich mnożnik). Dobrane do
 * najczęstszych wielkości na ekranie, żeby duszek szedł piksel w piksel: 21 — najmniejsza sylwetka (16 jednostek)
 * w 1080p, 28 — to samo w 1440p, 40 — zwykłe przybliżenie gry (14 px na kafel) w 1080p, 56 — w 1440p, 80 — z bliska.
 */
export const POZIOMY = [21, 28, 40, 56, 80];
/** Piksel słabszy niż to (alfa 0–255) nie liczy się do przycięcia klatki. */
export const PROG_ALFY = 3;
export const KLATKA_MS = 1000 / 60;
/** Tików gry na milisekundę (120 na sekundę). */
const TIKI_NA_KLATKE = 2;

export const G = globalThis as any;

export interface Klatka {
  p: HTMLCanvasElement | null; w: number; h: number;
  /** przesunięcie lewego górnego rogu przyciętej klatki względem punktu zaczepienia (px tego poziomu) */
  ox: number; oy: number;
  /** punkty na klatce w ułamkach wysokości postaci (np. głowa: x, y, r) */
  pkt?: number[];
  /** światła poza klatką (swiatla.ts): x, y, promień w ułamkach wysokości postaci od punktu zaczepienia; barwa; siła */
  sw: number[][];
}

export class Scena {
  sim: any;
  c: any;
  /** zegar ekranu w ms */
  czas = 200000;
  /** miejsce postaci w sali sceny (kafle) */
  readonly X0 = 40.5; readonly Y0 = 140;
  plotno = document.createElement('canvas');
  g = this.plotno.getContext('2d', { willReadFrequently: true })!;
  W = 0; H = 0; px0 = 0; py0 = 0;
  /** wysokość postaci: w pikselach ekranu i w jednostkach rysunku (logiczna) */
  hPx = 0; hLog = 0;
  /** rysunek jednej klatki — ustawia go opis postaci */
  rysuj: () => void = () => {};
  /** punkty zaczepienia po narysowaniu (głowa…) */
  punkty: () => number[] | undefined = () => undefined;
  ostrzezenia: string[] = [];
  /** co się teraz piecze (do ostrzeżeń) */
  co = '';

  constructor() {
    this.sim = new Sim(1);
    const w = this.sim.world;
    // sala: pusto od x 20 do 60, y 120 do 140; podłoga i ściany z litej skały
    for (let y = 116; y <= 144; y++) for (let x = 16; x <= 64; x++) {
      const i = w.idx(x, y);
      const wSali = x >= 20 && x <= 60 && y >= 120 && y <= 140;
      w.tile[i] = wSali ? T.AIR : T.ROCK;
      w.water[i] = 0; w.magma[i] = 0; w.lina[i] = 0; w.schody[i] = 0;
    }
    this.sim.tick = 20000;
  }

  /** Postać o numerze `id` w roli `rola` (numery 1–6 są w świeżej górze; inne powstają jak przybysz od anioła). */
  postac(id: number, rola: string): any {
    let c = this.sim.creatures.find((q: any) => q.id === id);
    if (!c) {
      const klan = klanLudu(this.sim)!;
      c = makeCreature(Race.GOBLIN, klan.id, this.X0, this.Y0, id);
      this.sim.creatures.push(c); this.sim.byId.set(id, c);
    }
    nadajRole(this.sim, c, rola as never);
    this.c = c;
    this.spokoj();
    return c;
  }

  /** Postać stoi w sali, zdrowa i bez żadnych stanów — punkt wyjścia każdej animacji. */
  spokoj(): void {
    const c = this.c;
    Object.assign(c, {
      x: this.X0, y: this.Y0, vy: 0, face: 1, job: Job.STOI, jx: this.X0, jy: this.Y0, jt: 0, carry: 0, fear: 0, mad: 0,
      hunger: 0.1, dead: false, stall: 0, thought: 0,
      odmowa: undefined, naLinie: undefined, naWiadrze: undefined, wspina: undefined, ksiegaT: undefined, czynnosc: undefined,
      ruch: undefined, drgniecie: undefined, polecenie: undefined, lot: undefined, wDloni: undefined, kujeT: undefined,
      ogluszonyDo: undefined, zatrutyDo: undefined, szalDo: undefined, zakladanie: undefined, oberwal: undefined,
      ciosT: undefined, budowa: undefined, naprawia: undefined, okaleczony: undefined, zamarlyDo: undefined, pali: undefined,
    });
    G.PIEK_SZUM = 0; G.PIEK_SCHODY = null; G.PIEK_CZOLGA = false;
    // strop nad głową odkryty (bez kucania)
    const w = this.sim.world;
    w.tile[w.idx(Math.floor(this.X0), this.Y0 - 1)] = T.AIR;
  }

  /** Niski strop nad postacią (kucanie) albo zwykła sala. */
  strop(niski: boolean): void {
    const w = this.sim.world;
    for (let x = 20; x <= 60; x++) w.tile[w.idx(x, this.Y0 - 1)] = niski ? T.ROCK : T.AIR;
  }

  /** Płótno na postać wysoką na `hPx` pikseli ekranu. */
  wymiary(hPx: number): void {
    this.hPx = hPx; this.hLog = hPx / SKALA;
    // (pod stopami 1,9 wysokości zapasu: miecz wbity w ziemię przy wstawaniu, krople krwi, które spadają niżej)
    this.W = Math.ceil(hPx * 6.4); this.H = Math.ceil(hPx * 5.4);
    this.px0 = Math.round(this.W / 2); this.py0 = Math.round(hPx * 3.5);
    this.plotno.width = this.W; this.plotno.height = this.H;
  }

  /** Jedna klatka ekranu naprzód: zegar o `ms`, gra o dwa tiki na 1/60 s. */
  krok(ms = KLATKA_MS): void {
    this.czas += ms;
    this.sim.tick += Math.max(1, Math.round((ms / KLATKA_MS) * TIKI_NA_KLATKE));
  }

  private maluj(): void {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)';
    g.clearRect(0, 0, this.W, this.H);
    g.setTransform(SKALA, 0, 0, SKALA, this.px0, this.py0);
    this.rysuj();
  }

  /** Rysunek bez zdjęcia — po to, żeby pamięć ruchu (sprężyny, przejścia póz, ślad ostrza) szła jak w grze. */
  przebieg(): void { this.maluj(); }

  zdjecie(): Klatka {
    G.PIEK_SWIATLA = [];
    this.maluj();
    const r4 = (v: number): number => Math.round(v * 10000) / 10000;
    const sw = (G.PIEK_SWIATLA as number[][]).map(([x, y, r, cr, cg, cb, a]) =>
      [r4((x - this.px0) / this.hPx), r4((y - this.py0) / this.hPx), r4(r / this.hPx), cr, cg, cb, Math.round(a * 1000) / 1000]);
    G.PIEK_SWIATLA = null;
    const W = this.W, H = this.H;
    const d = this.g.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      let i = y * W * 4 + 3;
      for (let x = 0; x < W; x++, i += 4) {
        if (d[i] >= PROG_ALFY) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    const pkt = this.punkty();
    if (x1 < 0) return { p: null, w: 0, h: 0, ox: 0, oy: 0, pkt, sw };
    if (x0 === 0 || y0 === 0 || x1 === W - 1 || y1 === H - 1) this.ostrzezenia.push(`klatka dotyka brzegu płótna (${this.co}: ${x0},${y0}–${x1},${y1} z ${W}×${H})`);
    const p = document.createElement('canvas');
    p.width = x1 - x0 + 1; p.height = y1 - y0 + 1;
    p.getContext('2d')!.drawImage(this.plotno, x0, y0, p.width, p.height, 0, 0, p.width, p.height);
    return { p, w: p.width, h: p.height, ox: x0 - this.px0, oy: y0 - this.py0, pkt, sw };
  }

  /** Mrugnięcie (render/lud/ruch.ts: co 4100 ms przez 130 ms) wypada w chwili `t`? */
  mruga(t: number): boolean { return ((t + this.c.id * 977) % 4100) < 140; }

  /** Przestawia zegar tuż za mrugnięcie — najbliższe 3,9 s jest bez niego. Skok zeruje pamięć ruchu (potem rozgrzewka). */
  zaMrugniecie(): void {
    const t = this.czas + 5000;
    const k = (t + this.c.id * 977) % 4100;
    this.czas = t + (4100 - k) + 150;
  }

  /**
   * Pętla sterowana wielkością `u` (faza kroku, zamach…): `ustaw(u)` ustawia stan dla u (rośnie bez zawijania),
   * rozgrzewka trwa co najmniej `rozgrzewkaMs` (całe cykle), potem `n` zdjęć w środkach przedziałów jednego cyklu.
   */
  cykl(o: { okresMs: number; n: number; ustaw: (u: number) => void; rozgrzewkaMs?: number }, zdj: (k: Klatka) => void): void {
    this.zaMrugniecie();
    const cykliRozgrz = Math.max(1, Math.ceil((o.rozgrzewkaMs ?? 900) / o.okresMs));
    const dtZdj = o.okresMs / o.n, pod = Math.max(1, Math.ceil(dtZdj / KLATKA_MS)), dt = dtZdj / pod;
    // start: u = −cykliRozgrz; pierwsze zdjęcie w u = 0,5/n
    let u = -cykliRozgrz;
    const du = 1 / (o.n * pod);
    const krokow = cykliRozgrz * o.n * pod;
    o.ustaw(u); this.przebieg();
    for (let i = 0; i < krokow; i++) { u += du; this.krok(dt); o.ustaw(u); this.przebieg(); }
    // teraz u = 0; do środka pierwszego przedziału
    let cel = 0.5 / o.n;
    for (let k = 0; k < o.n; k++, cel += 1 / o.n) {
      while (u < cel - du * 0.75) { u += du; this.krok(dt); o.ustaw(u); this.przebieg(); }
      const reszta = cel - u;
      u = cel; this.krok(Math.max(0.01, reszta * o.okresMs)); o.ustaw(u);
      zdj(this.zdjecie());
    }
  }

  /**
   * Pętla sterowana zegarem ekranu: `faza(czas)` 0…1 z okresem `okresMs`; szuka chwili z fazą 0, w której wszystkie
   * zdjęcia spełniają `dobre` (bez mrugnięcia, bez gestu), i robi `n` zdjęć w środkach przedziałów.
   */
  cyklCzasu(o: { okresMs: number; n: number; faza: (czas: number) => number; dobre?: (czas: number) => boolean; rozgrzewkaMs?: number },
    zdj: (k: Klatka) => void): void {
    let t0 = this.czas + 5000;
    t0 += ((1 - o.faza(t0)) % 1) * o.okresMs;
    const chwile = (t: number): number[] => Array.from({ length: o.n }, (_, i) => t + ((i + 0.5) / o.n) * o.okresMs);
    const ok = (t: number): boolean => chwile(t).every((q) => !this.mruga(q) && (!o.dobre || o.dobre(q)));
    let proby = 0;
    while (!ok(t0) && proby++ < 400) t0 += o.okresMs;
    if (!ok(t0)) this.ostrzezenia.push('nie ma chwili bez mrugnięcia/gestu dla pętli czasu');
    const rozgrz = o.rozgrzewkaMs ?? 900;
    this.czas = t0 - rozgrz;
    this.przebieg();
    const dojdz = (cel: number): void => {
      while (this.czas < cel - 0.01) { this.krok(Math.min(KLATKA_MS, cel - this.czas)); if (this.czas < cel - 0.01) this.przebieg(); }
    };
    for (const q of chwile(t0)) { dojdz(q); zdj(this.zdjecie()); }
  }

  /**
   * Przebieg jednorazowy: rozgrzewka w stanie `przed`, potem `ustaw(u)` dla u od 0 do 1 w czasie `czasMs`;
   * `n` zdjęć w u = i/(n−1) (pierwsze — początek, ostatnie — koniec).
   */
  raz(o: { czasMs: number; n: number; przed?: () => void; ustaw: (u: number) => void; rozgrzewkaMs?: number }, zdj: (k: Klatka) => void): void {
    this.zaMrugniecie();
    o.przed?.();
    const rozgrz = Math.ceil((o.rozgrzewkaMs ?? 700) / KLATKA_MS);
    this.przebieg();
    for (let i = 0; i < rozgrz; i++) { this.krok(); o.przed?.(); this.przebieg(); }
    const krokow = Math.max(o.n - 1, Math.ceil(o.czasMs / KLATKA_MS));
    let nast = 0;
    for (let i = 0; i <= krokow; i++) {
      const u = i / krokow;
      if (i > 0) this.krok(o.czasMs / krokow);
      o.ustaw(u);
      // zdjęcie, gdy minęliśmy kolejny punkt i/(n−1)
      if (nast < o.n && u >= nast / (o.n - 1) - 1e-9) { zdj(this.zdjecie()); nast++; } else this.przebieg();
    }
    while (nast < o.n) { zdj(this.zdjecie()); nast++; }
  }
}
