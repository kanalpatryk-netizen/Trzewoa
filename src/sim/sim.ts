import { Rng } from '../core/rng';
import { World, SURFACE_Y } from './world';
import { T, PASSABLE } from './tiles';
import { Race, RACES, RACE_COUNT, clanName } from './races';
import { Creature, Job, Thought, makeCreature, stepCreature } from './creatures';
import type { Efekt, RodzajEfektu } from '../render/efekty';
import { tikRytualu, type StanRytualu } from './rytual';

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
export const OTCHLAN_PER_TILE = 0.0035;

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
  dug = 0;
  wiara = 30;
  krew = 60;
  /** Otchłań nie jest dochodem — jest miarą tego, o czym nikt nie pamięta. */
  get otchlan(): number { return this.world.unknown * OTCHLAN_PER_TILE; }
  sen = 0;                    // 0 = czuwasz, 1 = zasnąłeś na zawsze
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
  raceCap = [180, 90, 24, 64, 9999, 0];
  /** Pojemność środowiska dla każdej rasy: z jej sposobu istnienia, nie z tempa. */
  carrying = new Float32Array(RACE_COUNT);
  /** Zatłoczenie = populacja / pojemność. Powyżej 1 zaczyna się głód masowy. */
  crowding = new Float32Array(RACE_COUNT);
  bonesTiles = 0;
  /** Wszystkie kuźnie w górze — ciepło nie pyta, do którego klanu należysz. */
  allForges: number[] = [];
  taints: string[][] = [[], [], [], [], [], []];
  nextTide = 2600;
  lastSettlers = -9999;
  /** Ilu przybyszów już zeszło. Góra nie jest hotelem — po tylu partiach musi zostać sama. */
  przybyszow = 0;
  /** W samouczku świat ma stać spokojnie — bez przypływów i wymierania nacji. */
  spokojnySwiat = false;
  /** Ustawiane przy przekroczeniu progu senności — ekran gry bije w dzwon i kasuje. */
  senDzwon = false;
  /** Postęp kruszenia skorupy rdzenia — koniec gry wymaga kultu, nie jednego kilofa. */
  rytual: StanRytualu = { postep: 0, klan: -1, wierni: 0, pekniecia: 0, otwarta: false, skorupa: 0 };
  lastTide = '';

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
        if (w.passable(x, y) && !w.passable(x, y + 1) && w.magma[w.idx(x, y)] === 0 && w.water[w.idx(x, y)] < 3) return [x, y];
      }
      return [(w.w / 2) | 0, (w.h / 3) | 0];
    };

    /** Miejsce z ogniem w zasięgu — Żużlowcy żyją z żużla, nie z grzyba. */
    const hotSpot = (minD: number, maxD: number): [number, number] => {
      for (let tries = 0; tries < 3000; tries++) {
        const [x, y] = spot(minD, maxD);
        for (let r = 2; r <= 9; r++) {
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
        const c = this.spawn(race, clan.id, hx + this.rng.int(5) - 2, hy - this.rng.int(2));
        // pokolenie zastane: część z nich jest już dorosła, inaczej kolonia nie zdąży się rozmnożyć
        if (c) c.age = this.rng.int(Math.floor(RACES[race].lifespan * 0.45));
      }
    };

    found(Race.GOBLIN, 14, 0.06, 0.22);
    const goblinTwo = this.clans[this.clans.length - 1];
    found(Race.GOBLIN, 12, 0.24, 0.42);
    found(Race.DWARF, 9, 0.45, 0.66, hotSpot(0.45, 0.72));
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
    found(Race.TROLL, 2, 0.55, 0.8);
    // Prządki są pasożytem politycznym — siadają tam, gdzie jest kogo brać
    // niedaleko Ślepego Ludu, ale nie na jego głowie — inaczej rzeź zaczyna się w pierwszej minucie
    found(Race.SPINNER, 5, 0.3, 0.5, [
      goblinTwo.hx + (this.rng.chance(0.5) ? 1 : -1) * (14 + this.rng.int(10)),
      goblinTwo.hy - this.rng.int(6),
    ]);

    // to, co wiedzą od pokoleń: okolice własnych gniazd
    for (const clan of this.clans) {
      this.world.observe(clan.hx, clan.hy, 16, 0);
      for (let k = 0; k < 6; k++) {
        this.world.observe(
          Math.max(2, Math.min(w.w - 3, clan.hx + this.rng.int(31) - 15)),
          Math.max(2, Math.min(w.h - 3, clan.hy + this.rng.int(21) - 10)), 7, 0);
      }
    }

    // pełna spiżarnia przy gniazdach: pierwsze pokolenie nie ma szukać jedzenia
    // przez pół góry, bo wtedy umiera, zanim gracz zdąży cokolwiek zrobić
    this.nakarmSwiat(12);

    // pierwsza grzybnia — tam, gdzie mokro
    for (let k = 0; k < 900; k++) {
      const x = 2 + this.rng.int(w.w - 4), y = SURFACE_Y + this.rng.int(w.h - SURFACE_Y - 4);
      const i = w.idx(x, y);
      const wet = w.water[i] > 0 || w.water[w.idx(x, Math.min(w.h - 1, y + 1))] > 0;
      if (w.tile[i] !== T.AIR || w.magma[i] > 0) continue;
      if (wet || (!w.passable(x, y + 1) && this.rng.chance(0.25))) w.tile[i] = T.FUNGUS;
    }
  }

  newClan(race: Race, hx: number, hy: number): Clan {
    const clan: Clan = {
      id: this.clans.length, race, name: clanName(race, (n) => this.rng.int(n)),
      hx, hy, pop: 0, cap: race === Race.GOBLIN ? 60 : race === Race.DWARF ? 34 : race === Race.SPINNER ? 20 : 8,
      devotion: race === Race.GOBLIN ? 0.45 : race === Race.DWARF ? 0.3 : 0.08,
      stock: 0, grudge: new Map(), founded: this.tick, dead: false, forges: [], rytual: 0, pekniecia: 0,
      tint: this.rng.range(-0.18, 0.18),
    };
    this.clans.push(clan);
    if (this.world.passable(hx, hy)) this.world.set(hx, hy, T.NEST);
    return clan;
  }

  spawn(race: Race, clanId: number, x: number, y: number): Creature | null {
    const w = this.world;
    x = Math.max(1, Math.min(w.w - 2, x)); y = Math.max(1, Math.min(w.h - 2, y));
    if (!w.passable(x, y)) w.set(x, y, T.AIR);
    const c = makeCreature(race, clanId, x + 0.5, y);
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
  findTile(x: number, y: number, r: number, pred: (t: number) => boolean): [number, number] | null {
    const w = this.world;
    const ox = Math.floor(x), oy = Math.floor(y);
    for (let ring = 1; ring <= r; ring++) {
      const step = ring > 12 ? 2 : 1;
      for (let dy = -ring; dy <= ring; dy += step) {
        for (let dx = -ring; dx <= ring; dx += step) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const tx = ox + dx, ty = oy + dy;
          if (!w.inb(tx, ty)) continue;
          if (pred(w.tile[w.idx(tx, ty)])) return [tx, ty];
        }
      }
    }
    return null;
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

  hostile(a: Creature, b: Creature): boolean {
    if (b.dead || b.id === a.id) return false;
    if (this.spokojnySwiat) return false;      // w samouczku nikt nikogo nie bije ani nie bierze w jarzmo
    // Rozejm na rozruch: przy starcie wszyscy siedzą sobie na głowach i w pierwszej
    // minucie wyrzynali się nawzajem — góra traciła połowę mieszkańców, zanim gracz
    // zdążył cokolwiek zrobić.
    if (this.tick < 1200) return false;
    if (b.race === Race.HUMAN || a.race === Race.HUMAN) return b.race !== a.race;
    if (a.clan === b.clan) return false;
    if (a.race === b.race) {
      const g = this.clans[a.clan].grudge.get(b.clan) ?? 0;
      return g > 2;                        // swoi biją się dopiero, gdy jest o co
    }
    if (a.race === Race.TROLL) return a.hunger > 0.45 || a.fear > 0.3;
    return (this.clans[a.clan].grudge.get(b.clan) ?? 0) > 0 || this.rng.chance(0.15);
  }

  feud(ca: number, cb: number): void {
    const A = this.clans[ca], B = this.clans[cb];
    A.grudge.set(cb, (A.grudge.get(cb) ?? 0) + 1);
    B.grudge.set(ca, (B.grudge.get(ca) ?? 0) + 2);
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
    const last = this.chronicle[this.chronicle.length - 1];
    if (last && this.tick - last.tick < 900) {
      if (last.text === text) { last.tick = this.tick; return; }
      if (key && last.key === key) {
        last.n = (last.n ?? 1) + 1;
        last.text = agg ? agg(last.n) : text;
        last.tick = this.tick;
        return;
      }
    }
    this.chronicle.push({ tick: this.tick, text, kind, key, n: 1, x: poz?.[0], y: poz?.[1] });
    if (this.chronicle.length > 400) this.chronicle.shift();
  }

  /** Dodaje widoczny znak w świecie. */
  efekt(x: number, y: number, rodzaj: RodzajEfektu, tekst?: string): void {
    const max = rodzaj === 'cud' || rodzaj === 'skaza' ? 90 : rodzaj === 'mysl' ? 140 : 40;
    this.efekty.push({ x, y, rodzaj, t: 0, max, tekst });
    if (this.efekty.length > 60) this.efekty.shift();
  }

  spark(x: number, y: number, kind: 'hit' | 'pray' | 'spore' | 'ember' | 'dust' | 'glint'): void {
    const map = { hit: PK.BLOOD, pray: PK.PRAY, spore: PK.SPORE, ember: PK.EMBER, dust: PK.DUST, glint: PK.GLINT };
    const k = map[kind];
    const n = k === PK.BLOOD ? 6 : 2;
    for (let i = 0; i < n; i++) {
      if (this.particles.length > 900) break;
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
    this.deaths.set(tag + ':' + RACES[c.race].short, (this.deaths.get(tag + ':' + RACES[c.race].short) ?? 0) + 1);
    const d = RACES[c.race];
    this.krew += 4 * d.size;
    this.fungusBudget += 1.5 * d.size;
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
    if (c.mad >= 0.95 && this.world.depth(c.y) > 0.78 && c.race !== Race.TROLL) {
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
    if (this.rng.chance(0.5) && clan.pop > 6) {
      const nc = this.newClan(c.race, Math.floor(c.x), Math.floor(c.y));
      nc.devotion = clan.devotion * 0.5;
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
    nc.devotion = Math.min(1, old.devotion + 0.35);
    nc.tint = old.tint + 0.25;
    c.prophet = true;
    old.pop--; c.clan = nc.id; nc.pop++;
    // kilku wiernych idzie za nim
    let taken = 0;
    for (const o of this.creatures) {
      if (taken >= 6 || o.dead || o.clan !== old.id || o.race !== c.race) continue;
      if (Math.hypot(o.x - c.x, o.y - c.y) > 12) continue;
      old.pop--; o.clan = nc.id; nc.pop++; taken++;
    }
    this.feud(nc.id, old.id);
    this.gdzie(nc.hx, nc.hy).log(`Szept stał się ciałem: ${nc.name} odłączyli się od ${old.name}.`, 'wiara');
  }

  enslave(foe: Creature, clanId: number): void {
    const old = this.clans[foe.clan];
    if (old.id === clanId) return;
    old.pop--; foe.clan = clanId; this.clans[clanId].pop++;
    foe.fear = 1; foe.devotion *= 0.5; foe.slave = true;
    if (this.rng.chance(0.15)) this.gdzie(foe.x, foe.y).log(`${this.clans[clanId].name} wzięli kogoś z ${RACES[foe.race].dopelniacz} w jarzmo.`, 'swiat');
  }

  pray(c: Creature, tile: number): void {
    const clan = this.clans[c.clan];
    const mult = tile === T.CORE ? 3 : tile === T.GLYPH ? 2 : 1;
    this.prayers++;
    this.wiara += RACES[c.race].faithGain * clan.devotion * 0.05 * mult * this.incomeMult();
    clan.devotion = Math.min(1, clan.devotion + 0.0006);
    if (this.rng.chance(0.06)) this.spark(c.x, c.y - 0.6, 'pray');
  }

  sacrifice(c: Creature): void {
    const victim = this.nearestCreature(c.x, c.y, 8, (o) => o.clan === c.clan && o.age < 900 && o.id !== c.id);
    const clan = this.clans[c.clan];
    if (!victim) { clan.devotion = Math.max(0, clan.devotion - 0.02); return; }
    this.kill(victim, 'na ołtarzu', 'ofiara');
    this.wiara += 14 * this.incomeMult();
    this.krew += 6;
    clan.devotion = Math.min(1, clan.devotion + 0.04);
    if (this.rng.chance(0.3)) this.gdzie(c.x, c.y).log(`${clan.name} złożyli ci w ofierze własne dziecko. Zrobili to chętnie.`, 'wiara',
      'ofiara', (n) => `${clan.name} złożyli ci w ofierze ${n === 2 ? 'dwoje' : n === 3 ? 'troje' : n} własnych dzieci.`);
  }

  birth(c: Creature): void {
    const clan = this.clans[c.clan];
    if (clan.pop >= clan.cap) return;
    this.spawn(c.race, c.clan, Math.floor(c.x), Math.floor(c.y));
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
    const need = c.race === Race.GOBLIN ? 2 : c.race === Race.DWARF ? 3 : 0;
    if (clan.stock < need) return false;
    const R = 13;
    let best: [number, number] | null = null;
    let bestD = 1e9;

    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        if (!w.inb(x, y) || w.tile[w.idx(x, y)] !== T.AIR) continue;
        if (w.water[w.idx(x, y)] > 2 || w.magma[w.idx(x, y)] > 0) continue;
        if (!w.solid(x, y + 1)) continue;                 // musi mieć na czym stanąć
        if (c.race === Race.DWARF) {
          let hot = false;
          for (let dy = -4; dy <= 4 && !hot; dy++)
            for (let dx = -4; dx <= 4 && !hot; dx++)
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
    if (Math.abs(c.jx - c.x) > 1.6 || Math.abs(c.jy - c.y) > 1.6) return true;   // jeszcze idzie
    const clan = this.clans[c.clan];
    if (c.race === Race.GOBLIN && clan.stock >= 2) {
      clan.stock -= 2; w.set(c.jx, c.jy, T.SHRINE);
      clan.devotion = Math.min(1, clan.devotion + 0.03);
      if (this.rng.chance(0.4)) this.gdzie(c.jx, c.jy).log(`${clan.name} postawili ci ołtarz.`, 'wiara',
        'oltarz', (n) => `${clan.name} postawili ci ${n} ołtarze.`);
    } else if (c.race === Race.DWARF && clan.stock >= 3) {
      clan.stock -= 3; w.set(c.jx, c.jy, T.FORGE);
      clan.forges.push(w.idx(c.jx, c.jy));
      this.allForges.push(w.idx(c.jx, c.jy));
      this.wiara += 6 * this.incomeMult();
      if (this.rng.chance(0.6)) this.gdzie(c.jx, c.jy).log(`${clan.name} rozpalili kuźnię — czczą cię pracą.`, 'wiara');
    } else if (c.race === Race.SPINNER) {
      w.set(c.jx, c.jy, T.WEB);
    }
    return false;
  }

  reachCore(c: Creature): void {
    if (this.ending) return;
    const clan = this.clans[c.clan];
    if (clan.devotion > 0.55) {
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
    if (this.dominance <= 0.6) return 1;
    // podłoga 0,25: zjedzona przez jedną krew góra ma głodować, a nie być martwa —
    // przy zerze gracz tracił wszystkie narzędzia dokładnie wtedy, gdy ich potrzebował
    return Math.max(0.25, 1 - (this.dominance - 0.6) / 0.35);
  }

  /**
   * Ekologia zamiast balansu. Pojemność każdej rasy wynika z tego, czym ona jest:
   * Ślepy Lud żyje z grzyba i padliny, Żużlowcy z ognia, Prządki z cudzych dzieci,
   * Trole z szaleństwa. Przekroczenie pojemności to nie spowolnienie, tylko załamanie —
   * i dlatego krótka pętla Ślepego Ludu staje się ich słabością, a nie przewagą.
   */
  private capacities(): void {
    const food = this.fungusTiles + this.bonesTiles * 2;
    this.carrying[Race.GOBLIN] = 14 + food * 0.15;
    let forges = 0;
    for (const c of this.clans) if (!c.dead && c.race === Race.DWARF) forges += c.forges.length;
    this.carrying[Race.DWARF] = 6 + forges * 9;
    const prey = this.popByRace[Race.GOBLIN] + this.popByRace[Race.DWARF];
    this.carrying[Race.SPINNER] = 4 + prey * 0.14;
    this.carrying[Race.TROLL] = 3 + this.popByRace[Race.MYCELIUM] * 0.05;
    this.carrying[Race.HUMAN] = 9999;
    this.carrying[Race.MYCELIUM] = 9999;
    let razem = 0;
    for (let r = 0; r < RACE_COUNT; r++) if (r !== Race.MYCELIUM) razem += this.popByRace[r];
    for (let r = 0; r < RACE_COUNT; r++) {
      const cap = Math.min(this.carrying[r], this.raceCap[r]);
      // Monokultura dusi sama siebie: jedna krew na całą górę je z tego samego kawałka
      // grzyba. Bez tego zwycięzca rósł w nieskończoność i każda partia kończyła się snem.
      const udzial = razem > 0 ? this.popByRace[r] / razem : 0;
      const ciasno = 1 + Math.max(0, udzial - 0.58) * 1.6;
      this.crowding[r] = cap > 0 ? (this.popByRace[r] / cap) * ciasno : 0;
    }
  }

  private census(): void {
    this.popByRace.fill(0);
    for (const c of this.creatures) if (!c.dead && c.race !== Race.HUMAN) this.popByRace[c.race]++;
    this.popByRace[Race.MYCELIUM] = Math.floor(this.fungusTiles / 22);
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
    const nadmiar = Math.max(0, this.dominance - 0.62) / 0.38;
    // Pustka usypia tak samo jak monokultura — i jedno nie kasuje drugiego. Wcześniej
    // góra z sześcioma mieszkańcami budziła się w nieskończoność, bo „nikt nie górował".
    // Góra o kilkunastu mieszkańcach jeszcze żyje — usypia dopiero naprawdę pusta.
    const pustka = total < 10 ? 1 - total / 10 : 0;
    const rosnie = 0.000012 * nadmiar + 0.00004 * pustka;
    this.sen = Math.max(0, Math.min(1, this.sen + (rosnie > 0 ? rosnie : -0.0005)));
    // sen ma być słyszalny, a nie tylko widoczny na krawędziach płyty
    for (const prog of [0.25, 0.5, 0.8]) {
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
  fungusBudget = 60;

  /**
   * Grzybnia nie ma jednostek — rośnie po krawędziach. Losowanie z listy żywych
   * kafli zamiast z całej góry: przy 100 kafelkach na 42 tysiące i tak nigdy byśmy
   * w nią nie trafili, a grzyb by wymarł.
   */
  private tickMycelium(): void {
    const w = this.world;
    if (this.tick % 40 === 0) {
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
    const tries = Math.max(4, Math.min(140, Math.ceil(list.length * 0.06)));
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
      if (fromCorpse || (t === T.AIR && wet && this.rng.chance(0.35)) || (t === T.AIR && this.rng.chance(0.03))) {
        w.tile[j] = T.FUNGUS;
        list.push(j);
        this.fungusTiles++;
        this.fungusBudget -= fromCorpse ? 0.5 : 1;
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
    if (alive < 14 && this.tick > this.lastSettlers + 6000 && this.przybyszow < 10 && !this.ending) {
      this.settlers();
      return;
    }
    if (this.tick < this.nextTide || this.ending) return;
    this.nextTide = this.tick + 2200 + this.rng.int(1800);
    // gdy jedna krew zjada resztę, góra sama ściąga obcych — inaczej każda partia
    // kończyła się tą samą monokulturą i zaśnięciem
    if (this.dominance > 0.74 && this.tick > this.lastSettlers + 6000 && this.przybyszow < 10
        && this.rng.chance(0.65) && this.obcyLud()) return;
    const roll = this.rng.int(4);
    if (roll === 0) this.humanRaid();
    else if (roll === 1) this.flood();
    else if (roll === 2) this.plague();
    else this.madVein();
  }

  /** Nowe plemię schodzi w pustą górę. To nie litość — to głód, który cię karmi. */
  settlers(): void {
    const w = this.world;
    this.lastSettlers = this.tick;
    let x = 10 + this.rng.int(w.w - 20), y = SURFACE_Y + 2;
    // najpierw szukamy podłogi przy grzybie: plemię wysadzone na gołej skale
    // przy powierzchni ginęło z głodu w kilkanaście sekund
    const przyGrzybie = this.miejscePrzyJedzeniu();
    if (przyGrzybie) { x = przyGrzybie[0]; y = przyGrzybie[1]; }
    else for (let k = 0; k < 60; k++) {
      const xx = 10 + this.rng.int(w.w - 20);
      for (let yy = SURFACE_Y; yy < w.h * 0.3; yy++) {
        if (w.passable(xx, yy) && !w.passable(xx, yy + 1)) { x = xx; y = yy; k = 60; break; }
      }
    }
    // Schodzi ta krew, której w górze brakuje. Gdy zawsze schodził Ślepy Lud,
    // każde opustoszenie góry wzmacniało zwycięzcę i monokultura była nie do cofnięcia.
    const kandydaci = [Race.GOBLIN, Race.DWARF, Race.SPINNER];
    let race = Race.GOBLIN, najmniej = Infinity;
    for (const r of kandydaci) {
      const ilu = this.popByRace[r] + (r === Race.GOBLIN ? 6 : 0);   // Ślepy Lud i tak się rodzi
      if (ilu < najmniej) { najmniej = ilu; race = r; }
    }
    const clan = this.newClan(race, x, y);
    clan.devotion = 0.3 + this.rng.next() * 0.3;
    const n = (race === Race.GOBLIN ? 8 : 6) + this.rng.int(6);
    for (let i = 0; i < n; i++) {
      const c = this.spawn(race, clan.id, x + this.rng.int(5) - 2, y);
      if (c) c.age = this.rng.int(1200);
    }
    if (race === Race.DWARF) clan.stock = 6;        // mają z czego rozpalić pierwszą kuźnię
    clan.founded = this.tick;
    this.przybyszow++;
    this.lastTide = 'nowe plemię';
    this.gdzie(clan.hx, clan.hy).log(`${clan.name} zeszli w pustą górę. Nie wiedzą, co ich tu ściągnęło.`, 'swiat');
  }

  /**
   * Obcy lud: garstka wymarłej rasy wychodzi ze szczelin w głębi. Bez tego świat
   * zsuwał się w jedną krew i usypiał, cokolwiek gracz robił.
   * Zwraca false, gdy nie ma kogo ani gdzie wypuścić.
   */
  obcyLud(): boolean {
    const w = this.world;
    const chetni = [Race.DWARF, Race.SPINNER, Race.TROLL, Race.GOBLIN]
      .filter((r) => r !== this.domRace && this.popByRace[r] <= 2);
    if (!chetni.length) return false;
    const race = chetni[this.rng.int(chetni.length)];

    let x = -1, y = -1;
    for (let k = 0; k < 400; k++) {
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
    clan.devotion = 0.22 + this.rng.next() * 0.3;
    const n = 4 + this.rng.int(4);
    for (let i = 0; i < n; i++) {
      const c = this.spawn(race, clan.id, x + this.rng.int(5) - 2, y);
      if (c) c.age = this.rng.int(800);
    }
    this.lastTide = 'obcy lud';
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
      let jedzenie = false;
      for (let dy = -4; dy <= 4 && !jedzenie; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
          if (!w.inb(x + dx, y + dy)) continue;
          const t = w.tile[w.idx(x + dx, y + dy)];
          if (t === T.FUNGUS || t === T.BONES) { jedzenie = true; break; }
        }
      }
      if (jedzenie) return [x, y];
    }
    return null;
  }

  /**
   * Obsiewa okolice gniazd grzybem. Świat samouczka startuje z pełną górą ludzi
   * i pustą spiżarnią — bez tego nauka sprowadzała się do patrzenia na głód.
   */
  nakarmSwiat(ile = 26): void {
    const w = this.world;
    for (const klan of this.clans) {
      if (klan.dead) continue;
      let poszlo = 0;
      for (let k = 0; k < 600 && poszlo < ile; k++) {
        const x = klan.hx + this.rng.int(19) - 9;
        const y = klan.hy + this.rng.int(13) - 6;
        if (!w.inb(x, y)) continue;
        const i = w.idx(x, y);
        if (w.tile[i] !== T.AIR || w.water[i] > 0) continue;
        if (w.passable(x, y + 1)) continue;
        w.set(x, y, T.FUNGUS);
        poszlo++;
      }
    }
    this.fungusBudget += 240;
    for (const c of this.creatures) if (!c.dead) c.hunger = Math.min(c.hunger, 0.12);
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

  humanRaid(): void {
    const w = this.world;
    let x = 8 + this.rng.int(w.w - 16), y = SURFACE_Y - 2;
    for (let k = 0; k < 40 && !w.passable(x, y); k++) { x = 8 + this.rng.int(w.w - 16); }
    const clan = this.newClan(Race.HUMAN, x, y);
    const n = 5 + this.rng.int(7);
    for (let i = 0; i < n; i++) this.spawn(Race.HUMAN, clan.id, x + this.rng.int(6) - 3, y);
    this.lastTide = 'krucjata';
    this.gdzie(clan.hx, clan.hy).log(`Z powierzchni zeszli ludzie: ${clan.name}. Szukają rudy i sławy.`, 'swiat');
  }

  flood(): void {
    const w = this.world;
    // świeże plemiona mają spokój: zalanie gniazda w pierwszej minucie to nie dramat, tylko bug
    const swiezi = this.clans.filter((k) => !k.dead && this.tick - k.founded < 3000);
    let x = 6 + this.rng.int(w.w - 12);
    for (let k = 0; k < 24 && swiezi.some((s) => Math.abs(s.hx - x) < 14); k++) x = 6 + this.rng.int(w.w - 12);
    for (let k = 0; k < 900; k++) {
      const xx = Math.max(1, Math.min(w.w - 2, x + this.rng.int(9) - 4));
      const yy = SURFACE_Y + this.rng.int(12);
      const i = w.idx(xx, yy);
      if (PASSABLE[w.tile[i]] === 1) w.water[i] = 8;
    }
    this.lastTide = 'zalanie';
    this.log('Woda znalazła szczelinę. Zalewa górne korytarze.', 'swiat');
  }

  plague(): void {
    let hit = 0;
    for (const c of this.creatures) {
      if (c.dead) continue;
      if (this.tick - this.clans[c.clan].founded < 3000) continue;   // przybysze mają chwilę spokoju
      const celowana = c.race === this.domRace;     // ciasnota choruje pierwsza
      if (this.rng.chance(celowana ? 0.25 : 0.82)) continue;
      c.hp -= RACES[c.race].maxHp * (celowana ? 0.6 : 0.35); c.fear = 1; hit++;
    }
    this.lastTide = 'zaraza';
    // zaraza, która nikogo nie tknęła, nie jest zdarzeniem — nie ma po co o niej pisać
    if (hit > 0) this.log(`Zaraza przeszła przez twoje trzewia. Zachorowało ${hit}.`, 'krew');
  }

  madVein(): void {
    const w = this.world;
    const x = 6 + this.rng.int(w.w - 12), y = Math.floor(w.h * (0.6 + this.rng.next() * 0.3));
    for (let k = 0; k < 120; k++) {
      const xx = Math.max(1, Math.min(w.w - 2, x + this.rng.int(11) - 5));
      const yy = Math.max(1, Math.min(w.h - 2, y + this.rng.int(11) - 5));
      const i = w.idx(xx, yy);
      if (w.suchaStrefa(xx, yy)) continue;            // droga pielgrzymów zostaje czysta
      if (w.tile[i] === T.ROCK) w.tile[i] = T.CRYSTAL;
    }
    this.lastTide = 'żyła szaleństwa';
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
      if (clan.race === Race.DWARF && clan.stock >= 3 && clan.forges.length > 0
          && this.crowding[Race.DWARF] < 0.95 && clan.pop < clan.cap) {
        const f = clan.forges[this.rng.int(clan.forges.length)];
        if (this.world.tile[f] !== T.FORGE) { clan.forges = clan.forges.filter((i) => i !== f); continue; }
        clan.stock -= 3;
        const fx = f % this.world.w, fy = (f / this.world.w) | 0;
        const born = this.spawn(Race.DWARF, clan.id, fx, fy - 1);
        if (born) born.age = 400;
        if (this.rng.chance(0.5)) this.log(`${clan.name} wykuli nowego w ogniu. Ruda zamiast dziecka.`, 'swiat');
      }
      if (clan.race === Race.SPINNER && this.crowding[Race.SPINNER] < 0.95) {
        const slave = this.creatures.find((o) => !o.dead && o.clan === clan.id && o.slave && o.race !== Race.SPINNER);
        if (slave && this.rng.chance(0.35)) {
          const was = RACES[slave.race].dopelniacz;
          slave.race = Race.SPINNER;
          slave.slave = false;
          slave.hp = RACES[Race.SPINNER].maxHp;
          slave.age = 300;
          if (this.rng.chance(0.4)) this.gdzie(slave.x, slave.y).log(`${clan.name} przerobiły kogoś z ${was} na swoje. Nikt nie pytał o zgodę.`, 'krew');
        }
      }
    }
  }

  /** Klan, który urósł i się rozlazł, pęka sam — z powodu odległości, nie twojego szeptu. */
  private schism(): void {
    for (const clan of this.clans) {
      if (clan.dead || clan.pop < clan.cap * 0.7 || this.clans.length > 24) continue;
      if (!this.rng.chance(0.25)) continue;
      let far: Creature | null = null, fd = 18;
      for (const c of this.creatures) {
        if (c.dead || c.clan !== clan.id) continue;
        const d = Math.hypot(c.x - clan.hx, c.y - clan.hy);
        if (d > fd) { fd = d; far = c; }
      }
      if (!far) continue;
      const nc = this.newClan(clan.race, Math.floor(far.x), Math.floor(far.y));
      nc.devotion = clan.devotion * this.rng.range(0.5, 1.2);
      clan.pop--; far.clan = nc.id; nc.pop++;
      let taken = 0;
      for (const o of this.creatures) {
        if (taken >= 8 || o.dead || o.clan !== clan.id) continue;
        if (Math.hypot(o.x - far.x, o.y - far.y) > 10) continue;
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
    if (this.tick % 90 === 0) this.forgeAndThread();
    if (this.tick % 240 === 0) this.schism();
    if (this.tick % 45 === 0) w.countUnknown(this.tick);
    if (this.tick % 5 === 0) tikRytualu(this, this.rytual);
    this.census();
    this.tides();
  }
}

export { Job, Thought };
export type { Creature };
