import { Rng } from '../core/rng';
import { zapisz, kto } from './dziennik';
import { World, SURFACE_Y } from './world';
import { T, PASSABLE } from './tiles';
import { Race, RACES, RACE_COUNT, clanName } from './races';
import { Creature, Job, Thought, makeCreature, stepCreature } from './creatures';
import type { Efekt, RodzajEfektu } from '../render/efekty';
import { tikRytualu, type StanRytualu } from './rytual';
import { odswiezPlan, drazDrogeWiernym, type PlanDrogi } from './pielgrzymka';
import { policzJedzeniePrzedsionka } from './rytual';
import { nowyTik } from './droga';
import { tikWydarzen, nowyStanWydarzen, kartaPlemienia, paraNacji, type StanWydarzen } from './wydarzenia';
import { RYTUAL, PIELGRZYMKA, PLAN_DROGI } from '../nastawy/rytual';
import { GORA as G, LUDY as L, ZASIEDLENIE as Z, PRZYPLYWY as PP } from '../nastawy/gora';
import { SWIAT } from '../nastawy/swiat';

export interface Clan {
  id: number;
  race: Race;
  name: string;
  hx: number; hy: number;   // gniazdo
  pop: number;
  cap: number;
  devotion: number;         // ile cię czci
  stock: number;            // zniesiona ruda
  grudge: Map<number, number>;
  founded: number;
  dead: boolean;
  /** Kuźnie klanu — Żużlowcy wychodzą z ognia, nie z gniazda. */
  forges: number[];
  /** Tik ostatniego wykucia (brak w starych zapisach). */
  kuto?: number;
  /** Nacja z twojego szeptu (prorok) — jej wojny cię budzą. */
  zSzeptu?: boolean;
  /** Czy spod rdzenia da się wrócić do gniazda i kiedy to sprawdzono (patrz pielgrzymka). */
  powrotOk?: boolean;
  powrotT?: number;
  tint: number;             // odcień, żeby odróżnić nacje tej samej rasy
  /**
   * Postęp kruszenia skorupy rdzenia. Należy do nacji, nie do konkretnych wiernych:
   * pielgrzymi się zmieniają, umierają i wracają, a robota zostaje zrobiona.
   */
  rytual: number;
  /** Ile pęknięć ta nacja już wykuła modlitwą. */
  pekniecia: number;
}

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; kind: number; }
export const PK = { EMBER: 0, SPORE: 1, BLOOD: 2, PRAY: 3, DUST: 4, GLINT: 5 };

export interface ChronicleEntry {
  tick: number; text: string; kind: 'krew' | 'wiara' | 'otchlan' | 'swiat' | 'koniec';
  key?: string; n?: number;
  /** Miejsce zdarzenia — po kliknięciu w zapiskach kamera tam skacze. */
  x?: number; y?: number;
}

const SAVE_BASE = RACES.map((r) => ({ ...r }));
export function resetRaces(): void { for (let i = 0; i < RACES.length; i++) Object.assign(RACES[i], SAVE_BASE[i]); }

/** Ile Otchłani daje jeden zapomniany kafel. Wydanie jej zasklepia tyle samo. */
export const OTCHLAN_PER_TILE = G.otchlanNaKafel;

export class Sim {
  world: World;
  rng: Rng;
  creatures: Creature[] = [];
  byId = new Map<number, Creature>();
  clans: Clan[] = [];
  target = new Map<number, number>();
  particles: Particle[] = [];
  /** Krótkie znaki po użyciu czasownika — żeby było widać, że coś się stało. */
  efekty: Efekt[] = [];
  chronicle: ChronicleEntry[] = [];

  tick = 0;
  /** Numer następnego stworzenia — osobny dla każdej góry, żeby partia była powtarzalna. */
  nextId = 1;
  dug = 0;
  wiara = G.startWiara;
  krew = G.startKrew;
  /** Otchłań nie jest dochodem — jest miarą tego, o czym nikt nie pamięta. */
  get otchlan(): number { return this.world.unknown * OTCHLAN_PER_TILE; }
  sen = 0;                    // 0 = czuwasz, 1 = zasnąłeś na zawsze
  /** Zasoby zarezerwowane przez rozkazy wydane w pauzie (nie idą do zapisu). */
  rezerwa = { krew: 0, wiara: 0, otchlan: 0 };
  dominance = 0;
  domRace = -1;
  ending: string | null = null;
  fungusTiles = 0;
  /** Na co umierają — do strojenia, nie do pokazywania graczowi. */
  deaths = new Map<string, number>();
  meals = 0;
  foodMiss = 0;
  prayers = 0;
  popByRace = new Int32Array(RACE_COUNT);
  /** Twardy sufit gatunku — ostatnia zapora, nie główny mechanizm. */
  raceCap = [...L.sufitRasy];
  /** Pojemność środowiska dla każdej rasy: z jej sposobu istnienia, nie z tempa. */
  carrying = new Float32Array(RACE_COUNT);
  /** Zatłoczenie = populacja / pojemność. Powyżej 1 zaczyna się głód masowy. */
  crowding = new Float32Array(RACE_COUNT);
  bonesTiles = 0;
  /** Wszystkie kuźnie w górze — ciepło nie pyta, do którego klanu należysz. */
  allForges: number[] = [];
  taints: string[][] = [[], [], [], [], [], []];
  nextTide = PP.pierwszy;
  lastSettlers = -9999;
  /** Ilu przybyszów już zeszło. Góra nie jest hotelem — po tylu partiach musi zostać sama. */
  przybyszow = 0;
  /** W samouczku świat ma stać spokojnie — bez przypływów i wymierania nacji. */
  spokojnySwiat = false;
  /**
   * Łaskawa góra: na pierwsze partie. Sen przychodzi wolniej, a modlitwa pod skorupą
   * kruszy ją szybciej — reszta świata jest taka sama, więc nauka się nie marnuje.
   */
  lagodna = false;
  /** Ile jedzenia rośnie w suchej strefie przy przedsionku — liczone co sekundę gry. */
  jedzeniePrzedsionka = 0;
  /** Ustawiane przy przekroczeniu progu senności — ekran gry bije w dzwon i kasuje. */
  senDzwon = false;
  /** Postęp kruszenia skorupy rdzenia — koniec gry wymaga kultu, nie jednego kilofa. */
  rytual: StanRytualu = { postep: 0, klan: -1, wierni: 0, pekniecia: 0, otwarta: false, skorupa: 0 };
  /** Karty wydarzeń (patrz wydarzenia.ts) — główny sposób grania na telefonie. */
  wydarzenia: StanWydarzen = nowyStanWydarzen();
  /** Plan drogi pielgrzymów (patrz pielgrzymka.ts) — pamięć podręczna, nie stan gry. */
  planDrogi: PlanDrogi | null = null;
  lastTide = '';
  /** Tik ostatniego przypływu — po nim strażnik pauzy poznaje, że coś weszło z zewnątrz. */
  tideTick = -1;

  private hash: Creature[][] = [];
  private hashW = 0; private hashH = 0;
  private readonly CELL = 8;

  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed;
    resetRaces();
    this.world = new World(seed);
    this.rng = new Rng(seed ^ 0x9e3779b9);
    this.hashW = Math.ceil(this.world.w / this.CELL);
    this.hashH = Math.ceil(this.world.h / this.CELL);
    this.hash = Array.from({ length: this.hashW * this.hashH }, () => []);
    // Płyny z generatora najpierw spływają tam, gdzie mają leżeć. Wcześniej jeziora
    // magmy ruszały dopiero z pierwszym tikiem i w kilka sekund zalewały świeżo
    // osadzone gniazda: Żużlowcy i trole ginęli, zanim gracz cokolwiek zobaczył.
    for (let t = 1; t <= SWIAT.splywaniePrzedZasiedleniem; t++) this.world.tickFluids(t);
    this.seedWorld();
    this.log('Budzisz się. Coś w tobie drąży.', 'swiat');
  }

  // ------------------------------------------------------------ zasiedlenie

  private seedWorld(): void {
    const w = this.world;
    const spot = (minD: number, maxD: number): [number, number] => {
      for (let tries = 0; tries < 4000; tries++) {
        const y = Math.floor(SURFACE_Y + (w.h - SURFACE_Y) * (minD + this.rng.next() * (maxD - minD)));
        const x = 4 + this.rng.int(w.w - 8);
        if (w.passable(x, y) && !w.passable(x, y + 1) && w.water[w.idx(x, y)] < 3 && !this.przyMagmie(x, y, 3)) return [x, y];
      }
      return [(w.w / 2) | 0, (w.h / 3) | 0];
    };

    /** Miejsce z ogniem w zasięgu — Żużlowcy żyją z żużla, nie z grzyba. */
    const hotSpot = (minD: number, maxD: number): [number, number] => {
      for (let tries = 0; tries < 3000; tries++) {
        const [x, y] = spot(minD, maxD);
        for (let r = 4; r <= 10; r++) {           // ciepło w zasięgu, ale nie pod nogami
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            const mx = Math.round(x + Math.cos(a) * r), my = Math.round(y + Math.sin(a) * r);
            if (w.inb(mx, my) && w.magma[w.idx(mx, my)] > 0) return [x, y];
          }
        }
      }
      return spot(minD, maxD);
    };

    const found = (race: Race, n: number, minD: number, maxD: number, at?: [number, number]) => {
      const [hx, hy] = at ?? spot(minD, maxD);
      const clan = this.newClan(race, hx, hy);
      for (let i = 0; i < n; i++) {
        let x = hx + this.rng.int(5) - 2, y = hy - this.rng.int(2);
        if (!w.passable(x, y)) { x = hx; y = hy; }       // nie w ścianie — tam zostawali zamurowani
        const c = this.spawn(race, clan.id, x, y);
        // pokolenie zastane: część z nich jest już dorosła, inaczej kolonia nie zdąży się rozmnożyć
        if (c) c.age = this.rng.int(Math.floor(RACES[race].lifespan * Z.dorosliDo));
      }
    };

    found(Race.GOBLIN, Z.slepyLud1.ilu, Z.slepyLud1.od, Z.slepyLud1.do);
    const goblinTwo = this.clans[this.clans.length - 1];
    found(Race.GOBLIN, Z.slepyLud2.ilu, Z.slepyLud2.od, Z.slepyLud2.do);
    found(Race.DWARF, Z.zuzlowcy.ilu, Z.zuzlowcy.od, Z.zuzlowcy.do, hotSpot(Z.zuzlowcy.od, Z.zuzlowcy.doOgnia));
    const dwarfClan = this.clans[this.clans.length - 1];
    for (let r = 1; r < 10 && dwarfClan.forges.length === 0; r++) {
      for (let dy = -r; dy <= r && dwarfClan.forges.length === 0; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const fx = dwarfClan.hx + dx, fy = dwarfClan.hy + dy;
          if (!w.inb(fx, fy) || w.tile[w.idx(fx, fy)] !== T.AIR) continue;
          if (!w.solid(fx, fy + 1) || w.magma[w.idx(fx, fy)] > 0) continue;
          w.set(fx, fy, T.FORGE);
          dwarfClan.forges.push(w.idx(fx, fy));
          this.allForges.push(w.idx(fx, fy));
          break;
        }
      }
    }
    // Trole się nie rodzą, a dwa pierwsze nie dożywały trzeciej minuty — góra bez
    // nich traciła jedyny drapieżnik, który trzymał w ryzach zwycięzcę
    // z dala od gniazd: budzony głodem trol wybijał Żużlowców, zanim się rozejrzeli
    let legowisko = spot(Z.trole.od, Z.trole.do);
    for (let k = 0; k < 300; k++) {
      const najblizej = Math.min(...this.clans.map((cl) => Math.hypot(cl.hx - legowisko[0], cl.hy - legowisko[1])));
      if (najblizej >= Z.trole.odstep) break;
      legowisko = spot(Z.trole.od, Z.trole.do);
    }
    found(Race.TROLL, Z.trole.ilu, Z.trole.od, Z.trole.do, legowisko);
    // Prządki są pasożytem politycznym — siadają tam, gdzie jest kogo brać
    // niedaleko Ślepego Ludu, ale nie na jego głowie — inaczej rzeź zaczyna się w pierwszej minucie
    // (na podłodze: punkt liczony na ślepo wypadał w litej skale i Prządki zaczynały grę
    // zamurowane, a zanim się wygrzebały, ziemia osypywała się im na głowy)
    let gniazdoPrzadek: [number, number] | undefined;
    for (let k = 0; k < 600 && !gniazdoPrzadek; k++) {
      const x = goblinTwo.hx + (this.rng.chance(0.5) ? 1 : -1) * (Z.przadki.bokOd + this.rng.int(Z.przadki.bokRozrzut));
      const y = goblinTwo.hy + this.rng.int(15) - 9;
      if (!w.inb(x, y + 1) || !w.passable(x, y) || w.passable(x, y + 1)) continue;
      if (w.water[w.idx(x, y)] > 2 || this.przyMagmie(x, y, 3)) continue;
      gniazdoPrzadek = [x, y];
    }
    found(Race.SPINNER, Z.przadki.ilu, Z.przadki.od, Z.przadki.do, gniazdoPrzadek);

    // to, co wiedzą od pokoleń: okolice własnych gniazd
    for (const clan of this.clans) {
      this.world.observe(clan.hx, clan.hy, Z.wiedzaPromien, 0);
      for (let k = 0; k < Z.wiedzaPlam; k++) {
        this.world.observe(
          Math.max(2, Math.min(w.w - 3, clan.hx + this.rng.int(31) - 15)),
          Math.max(2, Math.min(w.h - 3, clan.hy + this.rng.int(21) - 10)), Z.wiedzaPlamaPromien, 0);
      }
    }

    // pełna spiżarnia przy gniazdach: pierwsze pokolenie nie ma szukać jedzenia
    // przez pół góry, bo wtedy umiera, zanim gracz zdąży cokolwiek zrobić
    this.nakarmSwiat(Z.spizarnia);

    // pierwsza grzybnia — tam, gdzie mokro
    for (let k = 0; k < G.grzybniaStartProby; k++) {
      const x = 2 + this.rng.int(w.w - 4), y = SURFACE_Y + this.rng.int(w.h - SURFACE_Y - 4);
      const i = w.idx(x, y);
      const wet = w.water[i] > 0 || w.water[w.idx(x, Math.min(w.h - 1, y + 1))] > 0;
      if (w.tile[i] !== T.AIR || w.magma[i] > 0) continue;
      if (wet || (!w.passable(x, y + 1) && this.rng.chance(G.grzybniaStartSucho))) w.tile[i] = T.FUNGUS;
    }
  }

  newClan(race: Race, hx: number, hy: number): Clan {
    const clan: Clan = {
      id: this.clans.length, race, name: clanName(race, (n) => this.rng.int(n)),
      hx, hy, pop: 0,
      cap: race === Race.GOBLIN ? L.limitNacji.slepyLud : race === Race.DWARF ? L.limitNacji.zuzlowcy : race === Race.SPINNER ? L.limitNacji.przadki : L.limitNacji.inni,
      devotion: race === Race.GOBLIN ? L.oddanieStart.slepyLud : race === Race.DWARF ? L.oddanieStart.zuzlowcy : L.oddanieStart.inni,
      stock: 0, grudge: new Map(), founded: this.tick, dead: false, forges: [], rytual: 0, pekniecia: 0,
      tint: this.rng.range(-L.odcien, L.odcien),
    };
    this.clans.push(clan);
    if (this.world.passable(hx, hy)) this.world.set(hx, hy, T.NEST);
    return clan;
  }

  spawn(race: Race, clanId: number, x: number, y: number): Creature | null {
    const w = this.world;
    x = Math.max(1, Math.min(w.w - 2, x)); y = Math.max(1, Math.min(w.h - 2, y));
    if (!w.passable(x, y)) w.set(x, y, T.AIR);
    const c = makeCreature(race, clanId, x + 0.5, y, this.nextId++);
    this.creatures.push(c);
    this.byId.set(c.id, c);
    this.clans[clanId].pop++;
    return c;
  }

  // ---------------------------------------------------------------- pomocne

  creatureById(id: number): Creature | undefined { return this.byId.get(id); }

  /**
   * Środek najgęstszego skupiska — kamera ma pokazywać cywilizację, nie geologię.
   * Środek masy wszystkich stworzeń wypadłby w pustce między koloniami.
   */
  heartOfLife(): { x: number; y: number; w: number; h: number } | null {
    const cell = 16;
    const gw = Math.ceil(this.world.w / cell);
    const buckets = new Map<number, number>();
    for (const c of this.creatures) {
      if (c.dead) continue;
      const k = ((c.y / cell) | 0) * gw + ((c.x / cell) | 0);
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    let bestK = -1, bestN = 0;
    for (const [k, n] of buckets) if (n > bestN) { bestN = n; bestK = k; }
    if (bestK < 0) return null;
    const bx = bestK % gw, by = (bestK / gw) | 0;

    // razem z sąsiednimi komórkami, inaczej kamera skacze, gdy kolonia stoi na granicy
    let n = 0, sx = 0, sy = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const c of this.creatures) {
      if (c.dead) continue;
      const cx = (c.x / cell) | 0, cy = (c.y / cell) | 0;
      if (Math.abs(cx - bx) > 1 || Math.abs(cy - by) > 1) continue;
      n++; sx += c.x; sy += c.y;
      if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x;
      if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y;
    }
    if (!n) return null;
    return { x: sx / n, y: sy / n, w: Math.max(6, x1 - x0), h: Math.max(4, y1 - y0) };
  }

  private rehash(): void {
    for (const cell of this.hash) cell.length = 0;
    for (const c of this.creatures) {
      const cx = Math.min(this.hashW - 1, Math.max(0, (c.x / this.CELL) | 0));
      const cy = Math.min(this.hashH - 1, Math.max(0, (c.y / this.CELL) | 0));
      this.hash[cy * this.hashW + cx].push(c);
    }
  }

  nearestCreature(x: number, y: number, r: number, pred: (c: Creature) => boolean): Creature | null {
    const rc = Math.ceil(r / this.CELL);
    const cx = (x / this.CELL) | 0, cy = (y / this.CELL) | 0;
    let best: Creature | null = null, bd = r * r;
    for (let gy = cy - rc; gy <= cy + rc; gy++) {
      if (gy < 0 || gy >= this.hashH) continue;
      for (let gx = cx - rc; gx <= cx + rc; gx++) {
        if (gx < 0 || gx >= this.hashW) continue;
        for (const o of this.hash[gy * this.hashW + gx]) {
          if (o.dead || !pred(o)) continue;
          const d = (o.x - x) ** 2 + (o.y - y) ** 2;
          if (d < bd) { bd = d; best = o; }
        }
      }
    }
    return best;
  }

  /** Spirala po kaflach — tanie zmysły zamiast wszechwiedzy. */
  findTile(x: number, y: number, r: number, pred: (t: number, tx: number, ty: number) => boolean): [number, number] | null {
    const w = this.world;
    const ox = Math.floor(x), oy = Math.floor(y);
    for (let ring = 1; ring <= r; ring++) {
      const step = ring > 12 ? 2 : 1;
      for (let dy = -ring; dy <= ring; dy += step) {
        for (let dx = -ring; dx <= ring; dx += step) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const tx = ox + dx, ty = oy + dy;
          if (!w.inb(tx, ty)) continue;
          if (pred(w.tile[w.idx(tx, ty)], tx, ty)) return [tx, ty];
        }
      }
    }
    return null;
  }

  /**
   * Jedzenie, do którego da się dojść. Najbliższy grzyb w linii prostej wisiał często
   * pod stropem albo na półce — a w górę wchodzi się tylko po stopniu, więc głodny kręcił
   * się pod nim, aż padł. Liczy się tylko kęs, przy którym jest podłoga do stania,
   * i najpierw ten na własnym poziomie albo niżej: w dół się spada, pod górę trzeba się wspiąć.
   * Kto nie pływa, nie sięgnie też grzyba pod głęboką wodą — a grzybnia rodzi się tam, gdzie mokro.
   */
  findFood(x: number, y: number, r: number, plywa: boolean, pred: (t: number) => boolean): [number, number] | null {
    const w = this.world;
    const ox = Math.floor(x), oy = Math.floor(y);
    const sucho = (tx: number, ty: number) => plywa || w.water[w.idx(tx, ty)] <= 5;
    if (w.inb(ox, oy) && pred(w.tile[w.idx(ox, oy)])) return [ox, oy];
    const doSiegniecia = (tx: number, ty: number): boolean => {
      if (!sucho(tx, ty)) return false;
      for (let sy = ty - 1; sy <= ty + 1; sy++) {
        for (let sx = tx - 1; sx <= tx + 1; sx++) {
          if (w.passable(sx, sy) && !w.passable(sx, sy + 1) && sucho(sx, sy)) return true;
        }
      }
      return false;
    };
    return this.findTile(x, y, r, (t, tx, ty) => ty >= oy - 1 && pred(t) && doSiegniecia(tx, ty))
      ?? this.findTile(x, y, r, (t, tx, ty) => pred(t) && doSiegniecia(tx, ty));
  }

  /** Najbliższy ogień: magma albo kuźnia. Dla Żużlowców to spiżarnia. */
  findHeat(x: number, y: number, r: number): [number, number] | null {
    const w = this.world;
    const ox = Math.floor(x), oy = Math.floor(y);
    for (let ring = 1; ring <= r; ring++) {
      const step = ring > 10 ? 2 : 1;
      for (let dy = -ring; dy <= ring; dy += step) {
        for (let dx = -ring; dx <= ring; dx += step) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const tx = ox + dx, ty = oy + dy;
          if (!w.inb(tx, ty)) continue;
          const i = w.idx(tx, ty);
          if (w.tile[i] === T.FORGE) return [tx, ty];
          if (w.magma[i] > 0 && w.passable(tx, ty - 1)) return [tx, ty - 1];
        }
      }
    }
    return null;
  }

  /**
   * Rozejm na rozruch: przy starcie wszyscy siedzą sobie na głowach i w pierwszej
   * minucie wyrzynali się nawzajem — góra traciła połowę mieszkańców, zanim gracz
   * zdążył cokolwiek zrobić. Obejmuje też głodne trole i polowanie na mięso.
   */
  get rozejm(): boolean { return this.tick < G.rozejmTikow; }

  hostile(a: Creature, b: Creature): boolean {
    if (b.dead || b.id === a.id) return false;
    if (this.spokojnySwiat) return false;      // w samouczku nikt nikogo nie bije ani nie bierze w jarzmo
    if (this.rozejm) return false;
    if (b.race === Race.HUMAN || a.race === Race.HUMAN) return b.race !== a.race;
    if (a.clan === b.clan) return false;
    if (this.pokojMiedzy(a.clan, b.clan)) return false;
    if (a.race === b.race) {
      const g = this.clans[a.clan].grudge.get(b.clan) ?? 0;
      return g > L.urazaWojnaSwoich;       // swoi biją się dopiero, gdy jest o co
    }
    if (a.race === Race.TROLL) return a.hunger > L.trolAtakGlod || a.fear > L.trolAtakStrach;
    // obcy biją się z urazy; bez niej tylko czasem — wcześniej co siódme spotkanie
    // kończyło się bójką, a pierwsza śmierć zapisywała urazę na zawsze
    // garstka nie ściąga na siebie cudzej uwagi — bez tego każda nowa, mała nacja
    // ginęła przy pierwszym spotkaniu z dużą, a rasa wymierała w kilka minut
    return (this.clans[a.clan].grudge.get(b.clan) ?? 0) > 0
      || this.rng.chance(L.bojkaSzansa * Math.min(1, this.clans[b.clan].pop / L.bojkaPelnaOd));
  }

  /** Rozejm między dwiema nacjami z karty „pierwsza krew” („rozdziel ich”). */
  pokojMiedzy(a: number, b: number): boolean {
    const p = this.wydarzenia.pokoj;
    if (p.size === 0) return false;
    const t = p.get(paraNacji(a, b));
    return t !== undefined && t > this.tick;
  }

  /**
   * „Obudzi cię tylko cudza wojna": śmierć w walce, w której bije się nacja z twojego
   * szeptu, cofa sen — także gdy obie strony są tej samej krwi. Prorok to twój sposób
   * na monokulturę, a dotąd nie zmieniał nic, bo sen patrzył wyłącznie na udział ras.
   * Wojny, które toczą się bez ciebie, nie budzą — inaczej góra bez gracza nie zasypiała.
   */
  wojnaBudzi(a: number, b: number): void {
    if (a === b || this.sen <= 0) return;
    if (!this.clans[a]?.zSzeptu && !this.clans[b]?.zSzeptu) return;
    this.sen = Math.max(0, this.sen - G.wojnaBudzi);
  }

  feud(ca: number, cb: number): void {
    const A = this.clans[ca], B = this.clans[cb];
    A.grudge.set(cb, (A.grudge.get(cb) ?? 0) + L.urazaNapastnik);
    B.grudge.set(ca, (B.grudge.get(ca) ?? 0) + L.urazaOfiara);
  }

  // ------------------------------------------------------------- zdarzenia

  /**
   * Kronika nie jąka się: to samo zdarzenie w krótkim oknie nie dopisuje kolejnej
   * linijki, tylko zagęszcza poprzednią („Szepnąłeś trzem. Usłyszeli.").
   */
  /** Miejsce dla najbliższego wpisu kroniki: `this.gdzie(x, y).log(...)`. */
  private pozWpisu: [number, number] | null = null;
  gdzie(x: number, y: number): this { this.pozWpisu = [Math.round(x), Math.round(y)]; return this; }

  log(text: string, kind: ChronicleEntry['kind'], key?: string, agg?: (n: number) => string): void {
    const poz = this.pozWpisu; this.pozWpisu = null;
    zapisz(this, 'swiat', text, poz?.[0], poz?.[1]);
    const last = this.chronicle[this.chronicle.length - 1];
    if (last && this.tick - last.tick < G.kronikaOkno) {
      if (last.text === text) { last.tick = this.tick; return; }
      if (key && last.key === key) {
        last.n = (last.n ?? 1) + 1;
        last.text = agg ? agg(last.n) : text;
        last.tick = this.tick;
        return;
      }
    }
    this.chronicle.push({ tick: this.tick, text, kind, key, n: 1, x: poz?.[0], y: poz?.[1] });
    if (this.chronicle.length > G.kronikaDlugosc) this.chronicle.shift();
  }

  /** Dodaje widoczny znak w świecie. */
  efekt(x: number, y: number, rodzaj: RodzajEfektu, tekst?: string): void {
    const max = rodzaj === 'cud' || rodzaj === 'skaza' ? G.efektCud : rodzaj === 'mysl' ? G.efektMysl : G.efektInny;
    this.efekty.push({ x, y, rodzaj, t: 0, max, tekst });
    if (this.efekty.length > G.efektowMax) this.efekty.shift();
  }

  spark(x: number, y: number, kind: 'hit' | 'pray' | 'spore' | 'ember' | 'dust' | 'glint'): void {
    const map = { hit: PK.BLOOD, pray: PK.PRAY, spore: PK.SPORE, ember: PK.EMBER, dust: PK.DUST, glint: PK.GLINT };
    const k = map[kind];
    const n = k === PK.BLOOD ? 6 : 2;
    for (let i = 0; i < n; i++) {
      if (this.particles.length > G.czasteczekMax) break;
      this.particles.push({
        x, y,
        vx: this.rng.range(-0.08, 0.08),
        vy: k === PK.EMBER || k === PK.PRAY || k === PK.SPORE ? this.rng.range(-0.09, -0.02) : this.rng.range(-0.06, 0.02),
        life: 1, max: k === PK.PRAY ? 40 : 30, kind: k,
      });
    }
  }

  /** Ile ich na co ginie — do strojenia; gracz widzi tylko poziom krwi. */
  kill(c: Creature, why: string, tag = 'inne'): void {
    if (c.dead) return;
    c.dead = true;
    zapisz(this, 'zgon', `${kto(this, c)} umiera: ${why}`, c.x, c.y);
    this.deaths.set(tag + ':' + RACES[c.race].short, (this.deaths.get(tag + ':' + RACES[c.race].short) ?? 0) + 1);
    const d = RACES[c.race];
    this.krew += G.krewZaSmierc * d.size;
    this.fungusBudget += G.grzybniaZaSmierc * d.size;
    this.clans[c.clan].pop--;
    const x = Math.floor(c.x), y = Math.floor(c.y);
    if (this.world.passable(x, y) && this.world.get(x, y) === T.AIR) this.world.set(x, y, T.BONES);
    this.spark(c.x, c.y, 'hit');
    this.efekt(c.x, c.y, 'smierc');
    if (c.prophet) this.gdzie(c.x, c.y).log(`Prorok ${this.clans[c.clan].name} zginął ${why}.`, 'krew');
    if (this.clans[c.clan].pop <= 0 && !this.clans[c.clan].dead) {
      this.clans[c.clan].dead = true;
      this.log(`${this.clans[c.clan].name} — wygaśli. Nikt ich nie opłakał.`, 'krew',
        'wygasli', (n) => `${n} nacje wygasły. Nikt ich nie opłakał.`);
    }
  }

  leaveWorld(c: Creature): void {
    if (c.dead) return;
    c.dead = true;
    this.clans[c.clan].pop--;
    this.log(`Ludzie wynieśli ${c.carry} rudy na powierzchnię.`, 'swiat');
  }

  /** Ktoś zobaczył kawałek ciebie, o którym nikt nie wiedział. Otchłani ubywa sama. */
  onVisit(_freshTiles: number): void { /* liczone w spisie nieznanego */ }

  onCrystal(x: number, y: number): void {
    this.spark(x + 0.5, y + 0.5, 'glint');
  }

  /** Wydanie Otchłani domalowuje część twojego nieznanego — nieodwracalnie. */
  spendOtchlan(amount: number): boolean {
    const tiles = Math.round(amount / OTCHLAN_PER_TILE);
    if (this.world.unknown < tiles) return false;
    const done = this.world.seal(tiles, this.tick, this.rng);
    if (done > 0) this.log('Zasklepiłeś kawałek własnego nieznanego. Już go nie odzyskasz.', 'otchlan');
    return true;
  }

  maddenCreature(c: Creature): void {
    const clan = this.clans[c.clan];
    // koniec drogi kogoś, kto kopał za głęboko: przestaje być sobą
    if (c.mad >= L.trolSzalenstwo && this.world.depth(c.y) > L.trolGlebokosc && c.race !== Race.TROLL) {
      const was = RACES[c.race].dopelniacz;
      const home = this.clans.find((k) => !k.dead && k.race === Race.TROLL)
        ?? this.newClan(Race.TROLL, Math.floor(c.x), Math.floor(c.y));
      clan.pop--; c.clan = home.id; home.pop++;
      c.race = Race.TROLL;
      c.hp = RACES[Race.TROLL].maxHp;
      c.age = 0; c.mad = 1; c.prophet = false; c.slave = false;
      this.gdzie(c.x, c.y).log(`Ktoś z ${was} zszedł za głęboko i wrócił trolem.`, 'otchlan');
      return;
    }
    c.thought = Thought.DIG_DOWN;                        // co raz usłyszał głębię, ciągnie niżej
    if (this.rng.chance(L.sektaSzansa) && clan.pop > L.sektaMinNacja) {
      const nc = this.newClan(c.race, Math.floor(c.x), Math.floor(c.y));
      nc.devotion = clan.devotion * L.sektaOddanie;
      clan.pop--; c.clan = nc.id; nc.pop++;
      this.feud(nc.id, clan.id);
      this.log(`${c.mad > 0.8 ? 'Szaleniec' : 'Odszczepieniec'} z ${clan.name} założył ${nc.name} na głębokości ${Math.floor(c.y)}.`, 'otchlan');
    } else {
      c.thought = Thought.KILL_KIN;
    }
  }

  makeProphet(c: Creature): void {
    const old = this.clans[c.clan];
    const nc = this.newClan(c.race, Math.floor(c.x), Math.floor(c.y));
    nc.devotion = Math.min(1, old.devotion + L.prorokOddanie);
    nc.tint = old.tint + L.prorokOdcien;
    nc.zSzeptu = true;
    c.prophet = true;
    old.pop--; c.clan = nc.id; nc.pop++;
    // kilku wiernych idzie za nim
    let taken = 0;
    for (const o of this.creatures) {
      if (taken >= L.prorokZabiera || o.dead || o.clan !== old.id || o.race !== c.race) continue;
      if (Math.hypot(o.x - c.x, o.y - c.y) > L.prorokZasieg) continue;
      old.pop--; o.clan = nc.id; nc.pop++; taken++;
    }
    this.feud(nc.id, old.id);
    this.gdzie(nc.hx, nc.hy).log(`Szept stał się ciałem: ${nc.name} odłączyli się od ${old.name}.`, 'wiara');
  }

  enslave(foe: Creature, clanId: number): void {
    const old = this.clans[foe.clan];
    if (old.id === clanId) return;
    old.pop--; foe.clan = clanId; this.clans[clanId].pop++;
    foe.fear = 1; foe.devotion *= L.jarzmoOddanie; foe.slave = true;
    if (this.rng.chance(0.15)) this.gdzie(foe.x, foe.y).log(`${this.clans[clanId].name} wzięli kogoś z ${RACES[foe.race].dopelniacz} w jarzmo.`, 'swiat');
  }

  pray(c: Creature, tile: number): void {
    const clan = this.clans[c.clan];
    const mult = tile === T.CORE ? G.modlitwaPrzyRdzeniu : tile === T.GLYPH ? G.modlitwaPrzyZnaku : 1;
    this.prayers++;
    this.wiara += RACES[c.race].faithGain * clan.devotion * G.modlitwaWiara * mult * this.incomeMult();
    // Modlitwa podsyca oddanie, ale coraz słabiej, im go więcej. Wcześniej każdy tik
    // modlitwy dokładał tyle, że klan dochodził do pełnego oddania w kilka sekund —
    // i wtedy zaczynał masowo składać ofiary z dzieci, a Znak gracza nie miał nic do dodania.
    // (i tyle, ile dana krew w ogóle umie wierzyć). Liczone na głowę: oddanie nacji to jej
    // przeciętna pobożność, a nie suma modłów — inaczej każda duża nacja sama dochodziła
    // do pełnego oddania i odprawiała rytuał bez ciebie.
    clan.devotion = Math.min(1, clan.devotion
      + G.modlitwaOddanie * RACES[c.race].faithGain * (1 - clan.devotion) / Math.max(G.modlitwaNaGlowe, clan.pop));
    if (this.rng.chance(G.modlitwaIskra)) this.spark(c.x, c.y - 0.6, 'pray');
  }

  sacrifice(c: Creature): void {
    const victim = this.nearestCreature(c.x, c.y, G.ofiaraZasieg, (o) => o.clan === c.clan && o.age < G.ofiaraWiek && o.id !== c.id);
    const clan = this.clans[c.clan];
    if (!victim) { clan.devotion = Math.max(0, clan.devotion - G.ofiaraBrakKara); return; }
    this.kill(victim, 'na ołtarzu', 'ofiara');
    this.wiara += G.ofiaraWiara * this.incomeMult();
    this.krew += G.ofiaraKrew;
    clan.devotion = Math.min(1, clan.devotion + G.ofiaraOddanie);
    if (this.rng.chance(0.3)) this.gdzie(c.x, c.y).log(`${clan.name} złożyli ci w ofierze własne dziecko. Zrobili to chętnie.`, 'wiara',
      'ofiara', (n) => `${clan.name} złożyli ci w ofierze ${n === 2 ? 'dwoje' : n === 3 ? 'troje' : n} własnych dzieci.`);
  }

  birth(c: Creature): void {
    const clan = this.clans[c.clan];
    if (clan.pop >= clan.cap) return;
    const nowy = this.spawn(c.race, c.clan, Math.floor(c.x), Math.floor(c.y));
    if (nowy) zapisz(this, 'narodziny', `rodzi się ${kto(this, nowy)} — rodzic #${c.id}`, c.x, c.y);
  }

  /**
   * Szukanie miejsca pod budowę. Wcześniej korzystało z findTile, które zawsze
   * zwracało ten sam najbliższy kafel — przez to Żużlowcy nie postawili ani jednej
   * kuźni przez całą symulację.
   */
  canBuild(c: Creature): boolean {
    const w = this.world;
    const clan = this.clans[c.clan];
    const cx = Math.floor(c.x), cy = Math.floor(c.y);
    const need = c.race === Race.GOBLIN ? L.kosztOltarza : c.race === Race.DWARF ? L.kosztKuzni : 0;
    if (clan.stock < need) return false;
    const R = L.budowaZasieg;
    let best: [number, number] | null = null;
    let bestD = 1e9;

    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        if (!w.inb(x, y) || w.tile[w.idx(x, y)] !== T.AIR) continue;
        if (w.water[w.idx(x, y)] > 2 || w.magma[w.idx(x, y)] > 0) continue;
        if (!w.solid(x, y + 1)) continue;                 // musi mieć na czym stanąć
        if (c.race === Race.DWARF) {
          let hot = false;
          for (let dy = -L.kuzniaOgien; dy <= L.kuzniaOgien && !hot; dy++)
            for (let dx = -L.kuzniaOgien; dx <= L.kuzniaOgien && !hot; dx++)
              if (w.inb(x + dx, y + dy) && w.magma[w.idx(x + dx, y + dy)] > 0) hot = true;
          if (!hot) continue;                             // kuźnia bez ognia nie jest kuźnią
        }
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < bestD) { bestD = d; best = [x, y]; }
      }
    }
    if (!best) return false;
    c.jx = best[0]; c.jy = best[1];
    return true;
  }

  buildStep(c: Creature): boolean {
    const w = this.world;
    if (w.get(c.jx, c.jy) !== T.AIR) return false;
    if (Math.abs(c.jx - Math.floor(c.x)) > 1 || Math.abs(c.jy - Math.floor(c.y)) > 1) return true;   // jeszcze idzie
    const clan = this.clans[c.clan];
    if (c.race === Race.GOBLIN && clan.stock >= L.kosztOltarza) {
      clan.stock -= L.kosztOltarza; w.set(c.jx, c.jy, T.SHRINE);
      clan.devotion = Math.min(1, clan.devotion + L.oltarzOddanie);
      if (this.rng.chance(0.4)) this.gdzie(c.jx, c.jy).log(`${clan.name} postawili ci ołtarz.`, 'wiara',
        'oltarz', (n) => `${clan.name} postawili ci ${n} ołtarze.`);
    } else if (c.race === Race.DWARF && clan.stock >= L.kosztKuzni) {
      clan.stock -= L.kosztKuzni; w.set(c.jx, c.jy, T.FORGE);
      clan.forges.push(w.idx(c.jx, c.jy));
      this.allForges.push(w.idx(c.jx, c.jy));
      this.wiara += L.kuzniaWiara * this.incomeMult();
      if (this.rng.chance(0.6)) this.gdzie(c.jx, c.jy).log(`${clan.name} rozpalili kuźnię — czczą cię pracą.`, 'wiara');
    } else if (c.race === Race.SPINNER) {
      w.set(c.jx, c.jy, T.WEB);
    }
    return false;
  }

  reachCore(c: Creature): void {
    if (this.ending) return;
    const clan = this.clans[c.clan];
    // liczy się też wiara tego, kto wchodzi: warta z pełnym oddaniem, której nacja
    // w domu akurat ostygła, wchodziła jako zabójcy — i gracz przegrywał wygraną
    if (clan.devotion > RYTUAL.uwolnienieNacja || c.devotion > RYTUAL.uwolnienieWlasne) {
      this.ending = `uwolnienie:${clan.name}`;
      this.gdzie(this.world.coreX, this.world.coreY).log(`${clan.name} dokopali się do twojego rdzenia i padli na twarz. Jesteś wolny.`, 'koniec');
    } else {
      this.ending = `smierc:${clan.name}`;
      this.gdzie(this.world.coreX, this.world.coreY).log(`${clan.name} dokopali się do twojego rdzenia. Nie modlili się.`, 'koniec');
    }
  }

  // --------------------------------------------------------------- ekonomia

  /** Monokultura to śmierć: zwycięzcy przestają się bać i przestają cię potrzebować. */
  incomeMult(): number {
    if (this.dominance <= G.dochodOdDominacji) return 1;
    // podłoga 0,25: zjedzona przez jedną krew góra ma głodować, a nie być martwa —
    // przy zerze gracz tracił wszystkie narzędzia dokładnie wtedy, gdy ich potrzebował
    return Math.max(G.dochodMin, 1 - (this.dominance - G.dochodOdDominacji) / G.dochodZakres);
  }

  /**
   * Ekologia zamiast balansu. Pojemność każdej rasy wynika z tego, czym ona jest:
   * Ślepy Lud żyje z grzyba i padliny, Żużlowcy z ognia, Prządki z cudzych dzieci,
   * Trole z szaleństwa. Przekroczenie pojemności to nie spowolnienie, tylko załamanie —
   * i dlatego krótka pętla Ślepego Ludu staje się ich słabością, a nie przewagą.
   */
  private capacities(): void {
    const food = this.fungusTiles + this.bonesTiles * 2;
    const P = L.pojemnosc;
    this.carrying[Race.GOBLIN] = P.slepyLud + food * P.slepyLudNaJedzenie;
    let forges = 0;
    for (const c of this.clans) if (!c.dead && c.race === Race.DWARF) forges += c.forges.length;
    this.carrying[Race.DWARF] = P.zuzlowcy + forges * P.zuzlowcyNaKuznie;
    const prey = this.popByRace[Race.GOBLIN] + this.popByRace[Race.DWARF];
    this.carrying[Race.SPINNER] = P.przadki + prey * P.przadkiNaOfiare;
    this.carrying[Race.TROLL] = P.trole + this.popByRace[Race.MYCELIUM] * P.troleNaGrzybnie;
    this.carrying[Race.HUMAN] = 9999;
    this.carrying[Race.MYCELIUM] = 9999;
    let razem = 0;
    for (let r = 0; r < RACE_COUNT; r++) if (r !== Race.MYCELIUM) razem += this.popByRace[r];
    for (let r = 0; r < RACE_COUNT; r++) {
      const cap = Math.min(this.carrying[r], this.raceCap[r]);
      // Monokultura dusi sama siebie: jedna krew na całą górę je z tego samego kawałka
      // grzyba. Bez tego zwycięzca rósł w nieskończoność i każda partia kończyła się snem.
      const udzial = razem > 0 ? this.popByRace[r] / razem : 0;
      const ciasno = 1 + Math.max(0, udzial - L.ciasnotaOdUdzialu) * L.ciasnotaSila;
      this.crowding[r] = cap > 0 ? (this.popByRace[r] / cap) * ciasno : 0;
    }
  }

  private census(): void {
    this.popByRace.fill(0);
    for (const c of this.creatures) if (!c.dead && c.race !== Race.HUMAN) this.popByRace[c.race]++;
    this.popByRace[Race.MYCELIUM] = Math.floor(this.fungusTiles / G.grzybniaNaGlowe);
    // Grzybnia nie jest graczem w tym spisie — liczy sie jako zagrozenie, nie jako rasa.
    let total = 0, max = 0, mr = -1;
    for (let r = 0; r < RACE_COUNT; r++) {
      if (r === Race.MYCELIUM) continue;
      total += this.popByRace[r];
      if (this.popByRace[r] > max) { max = this.popByRace[r]; mr = r; }
    }
    this.dominance = total > 0 ? max / total : 1;
    this.domRace = mr;
    this.capacities();
    const senPrzed = this.sen;
    // Sen liczy się wprost z dominacji, nie z dochodu: dochód ma podłogę, żeby dało się
    // grać, ale monokultura i tak usypia — tylko wolniej i słyszalnie.
    const nadmiar = Math.max(0, this.dominance - G.senOdDominacji) / G.senZakresDominacji;
    // Pustka usypia tak samo jak monokultura — i jedno nie kasuje drugiego. Wcześniej
    // góra z sześcioma mieszkańcami budziła się w nieskończoność, bo „nikt nie górował".
    // Góra o kilkunastu mieszkańcach jeszcze żyje — usypia dopiero naprawdę pusta.
    const pustka = total < G.senPustkaPonizej ? 1 - total / G.senPustkaPonizej : 0;
    // WERSJA ANDROID: kto modli się pod twoim rdzeniem, ten cię budzi — warta nie może
    // uśpić góry tylko dlatego, że jej lud jest liczny (tak kończyły się partie o krok od wygranej)
    const warta = this.rytual.wierni >= RYTUAL.potrzebaWiernych && !this.rytual.otwarta ? 0 : 1;
    const rosnie = (G.senOdMonokultury * nadmiar * warta + G.senOdPustki * pustka) * (this.lagodna ? G.laskawaSen : 1);
    this.sen = Math.max(0, Math.min(1, this.sen + (rosnie > 0 ? rosnie : -G.senCofaSie)));
    // sen ma być słyszalny, a nie tylko widoczny na krawędziach płyty
    for (const prog of G.senProgi) {
      if (senPrzed < prog && this.sen >= prog) {
        this.log(prog < 0.4 ? 'Robi ci się ciepło i cicho. Tak zaczyna się sen.'
          : prog < 0.7 ? 'Powieka opada. Jeszcze chwila jednej krwi i zaśniesz.'
          : 'Ledwo widzisz własne korytarze. Obudzi cię tylko cudza wojna.', 'otchlan', `sen${prog}`);
        this.senDzwon = true;
      }
    }
    if (this.sen >= 1 && !this.ending) {
      this.ending = 'sen';
      this.log('Nikt się już ciebie nie boi. Zasypiasz.', 'koniec');
    }
  }

  // ------------------------------------------------------------- grzybnia

  private fungusList: number[] = [];
  /** Grzybnia rośnie wyłącznie ze zwłok: każda śmierć to paliwo na kilka kafli. */
  fungusBudget = G.grzybniaStart;

  /**
   * Grzybnia nie ma jednostek — rośnie po krawędziach. Losowanie z listy żywych
   * kafli zamiast z całej góry: przy 100 kafelkach na 42 tysiące i tak nigdy byśmy
   * w nią nie trafili, a grzyb by wymarł.
   */
  private tickMycelium(): void {
    const w = this.world;
    if (this.tick % G.grzybniaSpisCo === 0) {
      this.fungusList.length = 0;
      let bones = 0;
      for (let i = 0; i < w.tile.length; i++) {
        if (w.tile[i] === T.FUNGUS) this.fungusList.push(i);
        else if (w.tile[i] === T.BONES) bones++;
      }
      this.fungusTiles = this.fungusList.length;
      this.bonesTiles = bones;
    }
    const list = this.fungusList;
    if (list.length === 0) return;
    const tries = Math.max(G.grzybniaProbyMin, Math.min(G.grzybniaProbyMax, Math.ceil(list.length * G.grzybniaProby)));
    for (let k = 0; k < tries; k++) {
      const i = list[this.rng.int(list.length)];
      if (w.tile[i] !== T.FUNGUS) continue;
      const x = i % w.w, y = (i / w.w) | 0;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const [dx, dy] = dirs[this.rng.int(4)];
      if (!w.inb(x + dx, y + dy)) continue;
      const j = w.idx(x + dx, y + dy);
      const t = w.tile[j];
      if (w.magma[j] > 0) continue;
      const wet = w.water[j] > 0 || w.water[i] > 0;
      if (this.fungusBudget <= 0) break;
      const fromCorpse = t === T.BONES;
      if (fromCorpse || (t === T.AIR && wet && this.rng.chance(G.grzybniaMokro)) || (t === T.AIR && this.rng.chance(G.grzybniaSucho))) {
        w.tile[j] = T.FUNGUS;
        list.push(j);
        this.fungusTiles++;
        this.fungusBudget -= fromCorpse ? G.grzybniaKosztKosci : G.grzybniaKoszt;
      }
      if (this.rng.chance(0.015)) this.spark(x + 0.5, y + 0.5, 'spore');
    }
  }

  // ---------------------------------------------------------------- przypływ

  private tides(): void {
    if (this.spokojnySwiat) return;
    const alive = this.creatures.reduce((n, c) => n + (c.dead ? 0 : 1), 0);
    // Pustka przyciąga, ale nie w nieskończoność: między przybyciami musi minąć
    // sporo czasu, a po kilkunastu partiach góra zostaje sama i po prostu zasypia.
    if (alive < PP.pustkaPonizej && this.tick > this.lastSettlers + PP.osadnicyOdstep && this.przybyszow < PP.maxPrzybyszow && !this.ending) {
      this.settlers();
      const nowy = this.clans[this.clans.length - 1];
      if (nowy && !nowy.dead) kartaPlemienia(this, nowy);
      return;
    }
    // WERSJA ANDROID: najazdy, powodzie, zarazy i żyły szaleństwa przychodzą jako karty
    // wydarzeń z wyborem (wydarzenia.ts) — zanim uderzą, gracz decyduje, co z nimi zrobić
  }

  /** Nowe plemię schodzi w pustą górę. To nie litość — to głód, który cię karmi. */
  settlers(): void {
    const w = this.world;
    this.lastSettlers = this.tick;
    // Schodzi ta krew, której w górze brakuje. Gdy zawsze schodził Ślepy Lud,
    // każde opustoszenie góry wzmacniało zwycięzcę i monokultura była nie do cofnięcia.
    // Prządki tylko tam, gdzie jest kogo brać w jarzmo — w pustej górze umierały z głodu
    const ofiar = this.popByRace[Race.GOBLIN] + this.popByRace[Race.DWARF];
    const kandydaci = ofiar >= PP.przadkiOfiar ? [Race.GOBLIN, Race.DWARF, Race.SPINNER] : [Race.GOBLIN, Race.DWARF];
    let race = Race.GOBLIN, najmniej = Infinity;
    for (const r of kandydaci) {
      const ilu = this.popByRace[r] + (r === Race.GOBLIN ? PP.slepyLudPremia : 0);   // Ślepy Lud i tak się rodzi
      if (ilu < najmniej) { najmniej = ilu; race = r; }
    }
    let x = 10 + this.rng.int(w.w - 20), y = SURFACE_Y + 2;
    // najpierw szukamy podłogi przy tym, z czego ta krew żyje: plemię wysadzone
    // na gołej skale przy powierzchni ginęło z głodu w kilkanaście sekund
    const miejsce = race === Race.DWARF
      ? this.miejsceWCieple(0.3, 0.7) ?? this.miejscePrzyJedzeniu()
      : this.miejscePrzyJedzeniu();
    if (miejsce) { x = miejsce[0]; y = miejsce[1]; }
    else for (let k = 0; k < 60; k++) {
      const xx = 10 + this.rng.int(w.w - 20);
      for (let yy = SURFACE_Y; yy < w.h * 0.3; yy++) {
        if (w.passable(xx, yy) && !w.passable(xx, yy + 1)) { x = xx; y = yy; k = 60; break; }
      }
    }
    const clan = this.newClan(race, x, y);
    clan.devotion = PP.osadnicyOddanie + this.rng.next() * PP.osadnicyOddanieRozrzut;
    const n = (race === Race.GOBLIN ? PP.osadnicySlepyLud : PP.osadnicyInni) + this.rng.int(PP.osadnicyRozrzut);
    for (let i = 0; i < n; i++) {
      const c = this.spawn(race, clan.id, x + this.rng.int(5) - 2, y);
      if (c) c.age = this.rng.int(PP.osadnicyWiek);
    }
    if (race === Race.DWARF) clan.stock = PP.zuzlowcyRuda;   // mają z czego rozpalić pierwszą kuźnię
    this.zapasy(clan, PP.osadnicySpizarnia);                          // przyszli za jedzeniem — niech je zastaną
    clan.founded = this.tick;
    this.przybyszow++;
    this.lastTide = 'nowe plemię'; this.tideTick = this.tick;
    this.gdzie(clan.hx, clan.hy).log(`${clan.name} zeszli w pustą górę. Nie wiedzą, co ich tu ściągnęło.`, 'swiat');
  }

  /**
   * Obcy lud: garstka wymarłej rasy wychodzi ze szczelin w głębi. Bez tego świat
   * zsuwał się w jedną krew i usypiał, cokolwiek gracz robił.
   * Zwraca false, gdy nie ma kogo ani gdzie wypuścić.
   */
  obcyLud(): boolean {
    const w = this.world;
    const ofiar = this.popByRace[Race.GOBLIN] + this.popByRace[Race.DWARF];
    // WERSJA ANDROID: bez trolli — sfora czterech–siedmiu trolli (siła 16) wybijała całą górę
    // w minutę i zostawiała monokulturę gorszą od tej, którą miała przerwać
    const chetni = [Race.DWARF, Race.SPINNER, Race.GOBLIN]
      .filter((r) => r !== this.domRace && this.popByRace[r] <= 2 && (r !== Race.SPINNER || ofiar >= PP.przadkiOfiar));
    if (!chetni.length) return false;
    const race = chetni[this.rng.int(chetni.length)];

    let x = -1, y = -1;
    const cieplo = race === Race.DWARF ? this.miejsceWCieple(0.45, 0.7) : null;   // poniżej 0,72 zaczyna się obłęd
    if (cieplo) { x = cieplo[0]; y = cieplo[1]; }
    for (let k = 0; k < 400 && x < 0; k++) {
      const xx = 6 + this.rng.int(w.w - 12);
      const yy = Math.floor(w.h * 0.45) + this.rng.int(Math.floor(w.h * 0.32));
      if (!w.passable(xx, yy) || w.passable(xx, yy + 1)) continue;
      if (w.water[w.idx(xx, yy)] > 2 || w.magma[w.idx(xx, yy)] > 0) continue;
      x = xx; y = yy; break;
    }
    if (x < 0) {                                  // nie ma pustki — wygryzamy im komorę
      x = 6 + this.rng.int(w.w - 12);
      y = Math.floor(w.h * 0.55) + this.rng.int(Math.floor(w.h * 0.2));
      for (let dy = -2; dy <= 1; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (!w.inb(x + dx, y + dy)) continue;
          const i = w.idx(x + dx, y + dy);
          if (w.tile[i] === T.ROCK || w.tile[i] === T.SOIL || w.tile[i] === T.ORE) w.tile[i] = T.AIR;
        }
      }
    }

    const clan = this.newClan(race, x, y);
    clan.devotion = PP.obcyOddanie + this.rng.next() * PP.obcyOddanieRozrzut;
    const n = PP.obcyIlu + this.rng.int(PP.obcyRozrzut);
    for (let i = 0; i < n; i++) {
      const c = this.spawn(race, clan.id, x + this.rng.int(5) - 2, y);
      if (c) c.age = this.rng.int(PP.obcyWiek);
    }
    this.zapasy(clan, PP.obcySpizarnia);
    this.lastTide = 'obcy lud'; this.tideTick = this.tick;
    this.lastSettlers = this.tick;
    this.przybyszow++;
    this.gdzie(clan.hx, clan.hy).log(`Ze szczelin w głębi wyszli ${clan.name}. Nikt ich nie wołał.`, 'swiat');
    return true;
  }

  /** Podłoga w zasięgu grzybni — tam nowe plemię ma co jeść od pierwszego tiku. */
  private miejscePrzyJedzeniu(): [number, number] | null {
    const w = this.world;
    for (let k = 0; k < 500; k++) {
      const x = 6 + this.rng.int(w.w - 12);
      const y = SURFACE_Y + 2 + this.rng.int(Math.floor(w.h * 0.55));
      if (!w.passable(x, y) || w.passable(x, y + 1)) continue;
      if (w.water[w.idx(x, y)] > 2 || w.magma[w.idx(x, y)] > 0) continue;
      // grzyb za ścianą albo pod wodą to nie spiżarnia — plemię marło przy nim z głodu
      if (this.findFood(x, y, 8, false, (t) => t === T.FUNGUS || t === T.BONES)) return [x, y];
    }
    return null;
  }

  /**
   * Podłoga przy ogniu, ale nie w nim — Żużlowcy żyją z ciepła, nie z grzyba.
   * Wysadzeni przy grzybni głodowali, zanim zdążyli rozpalić pierwszą kuźnię.
   */
  private miejsceWCieple(minD: number, maxD: number): [number, number] | null {
    const w = this.world;
    for (let k = 0; k < 3000; k++) {
      const x = 4 + this.rng.int(w.w - 8);
      const y = Math.floor(SURFACE_Y + (w.h - SURFACE_Y) * (minD + this.rng.next() * (maxD - minD)));
      if (!w.passable(x, y) || w.passable(x, y + 1)) continue;
      if (w.water[w.idx(x, y)] > 2 || this.przyMagmie(x, y, 2)) continue;
      if (this.findHeat(x, y, 9)) return [x, y];
    }
    return null;
  }

  /** Czy tu grzeje: kuźnia w zasięgu ośmiu kafli albo magma tuż obok — tak liczy się głód Żużlowców. */
  goraco(x: number, y: number): boolean {
    const w = this.world;
    for (const f of this.allForges) {
      if (Math.abs((f % w.w) - x) <= 8 && Math.abs(((f / w.w) | 0) - y) <= 8) return true;
    }
    return this.przyMagmie(x, y, 2);
  }

  /** Czy w promieniu r od kafla płynie magma. */
  przyMagmie(x: number, y: number, r = 1): boolean {
    const w = this.world;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (w.inb(x + dx, y + dy) && w.magma[w.idx(x + dx, y + dy)] > 0) return true;
      }
    }
    return false;
  }

  /**
   * Zaopatruje okolice gniazd w to, co dana krew je. Świat samouczka startuje z pełną górą ludzi
   * i pustą spiżarnią — bez tego nauka sprowadzała się do patrzenia na głód.
   */
  nakarmSwiat(ile = Z.nakarmJedzenie): void {
    for (const klan of this.clans) if (!klan.dead) this.zapasy(klan, ile);
    this.fungusBudget += Z.nakarmGrzybnia;
    for (const c of this.creatures) if (!c.dead) c.hunger = Math.min(c.hunger, Z.nakarmGlod);
  }

  /**
   * Spiżarnia przy gnieździe — z tego, co dana krew je. Grzyb dostaje tylko Ślepy Lud:
   * wszystkich innych grzybnia parzy, a Żużlowcy i tak jej nie jedzą, więc obsiany grzybem
   * obóz Żużlowców albo Prządek zabijał własnych mieszkańców. Prządki i Trole dostają kości,
   * Żużlowcy nic — oni żyją z ognia.
   */
  zapasy(klan: Clan, ile: number): void {
    if (klan.race === Race.DWARF || klan.race === Race.HUMAN) return;
    const w = this.world;
    const kafel = klan.race === Race.GOBLIN ? T.FUNGUS : T.BONES;
    let poszlo = 0;
    for (let k = 0; k < 600 && poszlo < ile; k++) {
      const x = klan.hx + this.rng.int(19) - 9;
      const y = klan.hy + this.rng.int(13) - 6;
      if (!w.inb(x, y)) continue;
      const i = w.idx(x, y);
      if (w.tile[i] !== T.AIR || w.water[i] > 0) continue;
      if (w.passable(x, y + 1)) continue;
      w.set(x, y, kafel);
      poszlo++;
    }
  }

  /**
   * Odsuwa całą nację od podanego punktu. W samouczku Prządki startowały w tej samej
   * jaskini co Ślepy Lud, więc pierwszy pierścień pokazywał nie tych, o których mówił.
   */
  odsunKlany(race: Race, odX: number, odY: number, minimum = 45): void {
    const w = this.world;
    for (const klan of this.clans) {
      if (klan.dead || klan.race !== race) continue;
      if (Math.hypot(klan.hx - odX, klan.hy - odY) >= minimum) continue;
      let cel: [number, number] | null = null;
      for (let k = 0; k < 900 && !cel; k++) {
        const x = 6 + this.rng.int(w.w - 12);
        const y = SURFACE_Y + 4 + this.rng.int(Math.floor(w.h * 0.5));
        if (Math.hypot(x - odX, y - odY) < minimum) continue;
        if (!w.passable(x, y) || w.passable(x, y + 1)) continue;
        if (w.water[w.idx(x, y)] > 0 || w.magma[w.idx(x, y)] > 0) continue;
        cel = [x, y];
      }
      if (!cel) continue;
      klan.hx = cel[0]; klan.hy = cel[1];
      if (w.passable(klan.hx, klan.hy)) w.set(klan.hx, klan.hy, T.NEST);
      for (const c of this.creatures) {
        if (c.dead || c.clan !== klan.id) continue;
        c.x = cel[0] + this.rng.range(-2, 2);
        c.y = cel[1];
        c.job = 0; c.jt = 0;
      }
    }
  }

  /** Najazd z powierzchni; `nadX` — schodzą nad tym miejscem (karta wydarzenia „poprowadź ich”). */
  humanRaid(nadX?: number): void {
    const w = this.world;
    let x = nadX ?? 8 + this.rng.int(w.w - 16), y = SURFACE_Y - 2;
    for (let k = 0; k < 40 && !w.passable(x, y); k++) {
      x = nadX !== undefined ? Math.max(8, Math.min(w.w - 9, nadX + this.rng.int(21) - 10)) : 8 + this.rng.int(w.w - 16);
    }
    const clan = this.newClan(Race.HUMAN, x, y);
    const n = PP.ludzieIlu + this.rng.int(PP.ludzieRozrzut);
    for (let i = 0; i < n; i++) this.spawn(Race.HUMAN, clan.id, x + this.rng.int(6) - 3, y);
    this.lastTide = 'krucjata'; this.tideTick = this.tick;
    this.gdzie(clan.hx, clan.hy).log(`Z powierzchni zeszli ludzie: ${clan.name}. Szukają rudy i sławy.`, 'swiat');
  }

  /** Powódź; `nadX` — woda płynie nad tym miejscem (karta wydarzenia „skieruj ją”). */
  flood(nadX?: number): void {
    const w = this.world;
    // świeże plemiona mają spokój: zalanie gniazda w pierwszej minucie to nie dramat, tylko bug
    const swiezi = this.clans.filter((k) => !k.dead && this.tick - k.founded < PP.swiezeTikow);
    let x = nadX ?? 6 + this.rng.int(w.w - 12);
    for (let k = 0; nadX === undefined && k < 24 && swiezi.some((s) => Math.abs(s.hx - x) < PP.powodzOdstep); k++) x = 6 + this.rng.int(w.w - 12);
    for (let k = 0; k < PP.powodzProby; k++) {
      const xx = Math.max(1, Math.min(w.w - 2, x + this.rng.int(9) - 4));
      const yy = SURFACE_Y + this.rng.int(PP.powodzGlebokosc);
      const i = w.idx(xx, yy);
      if (PASSABLE[w.tile[i]] === 1) w.water[i] = 8;
    }
    this.lastTide = 'zalanie'; this.tideTick = this.tick;
    this.log('Woda znalazła szczelinę. Zalewa górne korytarze.', 'swiat');
  }

  plague(): void {
    let hit = 0;
    for (const c of this.creatures) {
      if (c.dead) continue;
      if (this.tick - this.clans[c.clan].founded < PP.swiezeTikow) continue;   // przybysze mają chwilę spokoju
      const celowana = c.race === this.domRace;     // ciasnota choruje pierwsza
      // zaraza ma przerzedzić ciasnotę, nie wymieść całą nację w pół minuty —
      // przy dawnej sile czterdzieści głodnych goblinów znikało naraz
      if (this.rng.chance(celowana ? PP.zarazaOmijaCel : PP.zarazaOmija)) continue;
      c.hp -= RACES[c.race].maxHp * (celowana ? PP.zarazaCel : PP.zaraza); c.fear = 1; hit++;
    }
    this.lastTide = 'zaraza'; this.tideTick = this.tick;
    // zaraza, która nikogo nie tknęła, nie jest zdarzeniem — nie ma po co o niej pisać
    if (hit > 0) this.log(`Zaraza przeszła przez twoje trzewia. Zachorowało ${hit}.`, 'krew');
  }

  madVein(): void {
    const w = this.world;
    const x = 6 + this.rng.int(w.w - 12), y = Math.floor(w.h * (PP.zylaOd + this.rng.next() * PP.zylaRozrzut));
    for (let k = 0; k < PP.zylaProby; k++) {
      const xx = Math.max(1, Math.min(w.w - 2, x + this.rng.int(11) - 5));
      const yy = Math.max(1, Math.min(w.h - 2, y + this.rng.int(11) - 5));
      const i = w.idx(xx, yy);
      if (w.suchaStrefa(xx, yy)) continue;            // droga pielgrzymów zostaje czysta
      if (w.tile[i] === T.ROCK) w.tile[i] = T.CRYSTAL;
    }
    this.lastTide = 'żyła szaleństwa'; this.tideTick = this.tick;
    this.log('Żyła szaleństwa otworzyła się w głębi. Kto tam kopie, wraca inny.', 'otchlan');
  }

  /**
   * Dwa wzrosty, które nie są rozrodem: Żużlowców wykuwa się w ogniu za rudę,
   * a Prządki przerabiają wziętych w jarzmo na swoich. Populacja jednych zależy
   * od kopania, drugich od cudzych strat.
   */
  private forgeAndThread(): void {
    for (const clan of this.clans) {
      if (clan.dead) continue;
      // Kucie trwa: jedna kuźnia daje nowego co dwadzieścia kilka sekund, kilka kuźni
      // szybciej. Wcześniej każde 90 tików przy pełnym składzie rudy wychodził następny
      // i klan rósł z jednego do trzydziestu w minutę, a potem wyrzynał sąsiadów.
      const odstep = Math.max(L.wykuciMinOdstep, L.wykuciOdstep / Math.max(1, clan.forges.length));
      if (clan.race === Race.DWARF && clan.stock >= L.wykuciKoszt && clan.forges.length > 0
          && this.tick - (clan.kuto ?? -1e9) >= odstep
          && this.crowding[Race.DWARF] < L.wykuciTlok && clan.pop < clan.cap) {
        const f = clan.forges[this.rng.int(clan.forges.length)];
        if (this.world.tile[f] !== T.FORGE) { clan.forges = clan.forges.filter((i) => i !== f); continue; }
        clan.stock -= L.wykuciKoszt;
        clan.kuto = this.tick;
        const fx = f % this.world.w, fy = (f / this.world.w) | 0;
        const born = this.spawn(Race.DWARF, clan.id, fx, fy - 1);
        if (born) born.age = L.wykuciWiek;
        if (this.rng.chance(0.5)) this.log(`${clan.name} wykuli nowego w ogniu. Ruda zamiast dziecka.`, 'swiat');
      }
      if (clan.race === Race.SPINNER && this.crowding[Race.SPINNER] < L.przerabianieTlok) {
        const slave = this.creatures.find((o) => !o.dead && o.clan === clan.id && o.slave && o.race !== Race.SPINNER);
        if (slave && this.rng.chance(L.przerabianieSzansa)) {
          const was = RACES[slave.race].dopelniacz;
          slave.race = Race.SPINNER;
          slave.slave = false;
          slave.hp = RACES[Race.SPINNER].maxHp;
          slave.age = L.przerabianieWiek;
          if (this.rng.chance(0.4)) this.gdzie(slave.x, slave.y).log(`${clan.name} przerobiły kogoś z ${was} na swoje. Nikt nie pytał o zgodę.`, 'krew');
        }
      }
    }
  }

  /**
   * Oddanie stygnie samo: bez cudów i ołtarzy każda nacja wraca do tego, jak czci
   * z natury. Dzięki temu Znak coś znaczy, a wysokie oddanie trzeba podtrzymywać.
   */
  private stygnie(): void {
    for (const clan of this.clans) {
      if (clan.dead) continue;
      const natura = clan.race === Race.GOBLIN ? L.oddanieNatura.slepyLud : clan.race === Race.DWARF ? L.oddanieNatura.zuzlowcy : L.oddanieNatura.inni;
      clan.devotion += (natura - clan.devotion) * L.stygniecie;
      // urazy też stygną: wcześniej każda śmierć dopisywała się na zawsze i jedna bójka
      // na granicy zamieniała się w wojnę do ostatniego — dziś wygasa, gdy przestają zabijać
      for (const [k, g] of clan.grudge) {
        if (g <= L.urazyWygasaja) clan.grudge.delete(k);
        else clan.grudge.set(k, g - L.urazyWygasaja);
      }
    }
  }

  /** Klan, który urósł i się rozlazł, pęka sam — z powodu odległości, nie twojego szeptu. */
  private schism(): void {
    // limit dotyczy żyjących nacji — liczony po wszystkich, jakie kiedykolwiek powstały
    // (z wymarłymi i każdą wyprawą ludzi), po kwadransie gry blokował rozłamy na zawsze
    let zywych = 0;
    for (const k of this.clans) if (!k.dead) zywych++;
    for (const clan of this.clans) {
      if (clan.dead || clan.pop < clan.cap * L.rozlamOdLimitu || zywych > L.rozlamMaxNacji) continue;
      if (!this.rng.chance(L.rozlamSzansa)) continue;
      // Pielgrzymi pod rdzeniem są zawsze najdalej od gniazda, więc rozłam odrywał właśnie
      // ich — nowa nacja dostawała losowe oddanie, a postęp rytuału przepadał razem ze starą.
      // Warta należy do nacji, która ją wysłała.
      const wWarcie = (c: Creature) => c.job === Job.PIELGRZYM
        || (Math.abs(c.x - this.world.coreX) < L.rozlamWarta && Math.abs(c.y - this.world.coreY) < L.rozlamWarta);
      let far: Creature | null = null, fd = L.rozlamOdleglosc;
      for (const c of this.creatures) {
        if (c.dead || c.clan !== clan.id || wWarcie(c)) continue;
        const d = Math.hypot(c.x - clan.hx, c.y - clan.hy);
        if (d > fd) { fd = d; far = c; }
      }
      if (!far) continue;
      const nc = this.newClan(clan.race, Math.floor(far.x), Math.floor(far.y));
      zywych++;
      nc.devotion = Math.min(1, clan.devotion * this.rng.range(L.rozlamOddanieOd, L.rozlamOddanieDo));
      clan.pop--; far.clan = nc.id; nc.pop++;
      let taken = 0;
      for (const o of this.creatures) {
        if (taken >= L.rozlamZabiera || o.dead || o.clan !== clan.id || wWarcie(o)) continue;
        if (Math.hypot(o.x - far.x, o.y - far.y) > L.rozlamZasieg) continue;
        clan.pop--; o.clan = nc.id; nc.pop++; taken++;
      }
      this.feud(nc.id, clan.id);
      this.gdzie(nc.hx, nc.hy).log(`${nc.name} odeszli na swoje — za daleko, by słuchać tych samych opowieści.`, 'swiat');
    }
  }

  // ------------------------------------------------------------------- tick

  step(): void {
    if (this.ending) return;
    this.tick++;
    nowyTik();
    const w = this.world;
    w.tickFluids(this.tick);
    if (this.tick % 3 === 0) w.tickSoil(this.tick);
    this.tickMycelium();
    this.rehash();

    for (const c of this.creatures) if (!c.dead) stepCreature(this, c);

    if (this.tick % 16 === 0) {
      this.creatures = this.creatures.filter((c) => { if (c.dead) this.byId.delete(c.id); return !c.dead; });
    }

    for (let i = this.efekty.length - 1; i >= 0; i--) {
      this.efekty[i].t++;
      if (this.efekty[i].t > this.efekty[i].max) this.efekty.splice(i, 1);
    }

    // cząsteczki
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.kind === PK.BLOOD || p.kind === PK.DUST) p.vy += 0.02;
      p.life++;
      if (p.life > p.max) this.particles.splice(i, 1);
    }
    // kurz w powietrzu: widać go tylko tam, gdzie coś świeci
    if (this.tick % 7 === 0) {
      for (let k = 0; k < 3; k++) {
        const x = this.rng.int(w.w), y = SURFACE_Y + this.rng.int(w.h - SURFACE_Y);
        const i = w.idx(x, y);
        if (w.ever[i] && PASSABLE[w.tile[i]] === 1 && w.water[i] === 0 && this.rng.chance(0.4)) {
          this.particles.push({ x: x + this.rng.next(), y: y + this.rng.next(), vx: this.rng.range(-0.01, 0.01), vy: this.rng.range(-0.012, -0.002), life: 1, max: 90, kind: PK.DUST });
        }
      }
    }

    // żar znad magmy
    if (this.tick % 4 === 0) {
      for (let k = 0; k < 6; k++) {
        const x = this.rng.int(w.w), y = Math.floor(w.h * 0.6) + this.rng.int(Math.floor(w.h * 0.4));
        if (w.magma[w.idx(x, y)] > 4 && w.passable(x, y - 1)) this.spark(x + 0.5, y - 0.5, 'ember');
      }
    }

    if (this.tick % 600 === 0) this.allForges = this.allForges.filter((i) => w.tile[i] === T.FORGE);
    if (this.tick % 90 === 0) { this.forgeAndThread(); this.stygnie(); }
    if (this.tick % 240 === 0) this.schism();
    if (this.tick % 45 === 0) w.countUnknown(this.tick);
    if (this.tick % RYTUAL.coIleTikow === 0) tikRytualu(this, this.rytual);
    if (this.tick % PIELGRZYMKA.jedzenieCo === 0) this.jedzeniePrzedsionka = policzJedzeniePrzedsionka(this);
    if (this.tick % PLAN_DROGI.odswiezCo === 0) odswiezPlan(this);
    if (this.tick % PLAN_DROGI.drazenieCo === 0) drazDrogeWiernym(this);
    this.census();
    this.tides();
    tikWydarzen(this);
    if (this.wiara > G.wiaraMax) this.wiara = G.wiaraMax;
    if (this.krew > G.krewMax) this.krew = G.krewMax;
  }
}

export { Job, Thought };
export type { Creature };
