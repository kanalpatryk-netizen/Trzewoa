import type { Sim } from './sim';
import { T, PASSABLE } from './tiles';
import { Race, RACES } from './races';
import { pielgrzymowKlanu, PIELGRZYMOW } from './rytual';

export enum Job {
  WANDER, DIG, EAT, PRAY, BUILD, FIGHT, FLEE, BREED, HAUL, SLAVE, DESCEND, RAID, SACRIFICE,
  /** Trol nie umiera z głodu — zasypia w skale i czeka, aż coś przejdzie obok. */
  SLEEP,
  /** Żużlowiec wraca do ognia; Prządka wysysa wziętego w jarzmo. */
  HEAT, DRAIN,
  /** Wierni idą pod skorupę rdzenia i modlą się tam, aż kamień ustąpi. */
  PIELGRZYM,
}

/** Myśl, którą wkładasz stworzeniu do głowy. Znika, gdy zostanie wykonana. */
export enum Thought { NONE = 0, DIG_DOWN, KILL_KIN, PROPHESY, FLEE_UP, BREED }

export interface Creature {
  id: number;
  race: Race;
  clan: number;
  x: number; y: number;
  vy: number;
  hp: number;
  hunger: number;
  fear: number;
  devotion: number;
  age: number;
  job: Job;
  jx: number; jy: number; jt: number;
  dig: number;
  carry: number;      // niesiona ruda
  /** Jak długo to nosi — po czasie i tak chowa łup dla klanu. */
  carryT: number;
  face: number;       // -1 / 1
  anim: number;
  thought: Thought;
  /** Ile tików stoi w miejscu — bez tego zalany korytarz zatrzymuje kolonię na zawsze. */
  stall: number;
  lx: number; ly: number;
  prophet: boolean;
  /** Wzięty w jarzmo — Prządki nie rodzą, tylko przerabiają cudze dzieci na swoje. */
  slave: boolean;
  mad: number;        // szaleństwo z głębokości
  dead: boolean;
}

/** Numer nadaje symulacja: licznik wspólny dla wszystkich gór sprawiał, że ta sama góra
 *  w drugiej partii żyła inaczej niż w pierwszej (od numeru zależy rytm rozglądania się). */
export function makeCreature(race: Race, clan: number, x: number, y: number, id: number): Creature {
  const d = RACES[race];
  return {
    id, race, clan, x, y, vy: 0,
    hp: d.maxHp, hunger: 0.2, fear: 0, devotion: 0.25, age: 0,
    job: Job.WANDER, jx: x, jy: y, jt: 0, dig: 0, carry: 0, carryT: 0,
    face: 1, anim: 0, thought: Thought.NONE, stall: 0, lx: x, ly: y, prophet: false, slave: false, mad: 0, dead: false,
  };
}

const FOOD_TILES = new Set<number>([T.FUNGUS, T.BONES]);
/**
 * Żużlowcy nie jedzą rudy — żywią się ciepłem przy ogniu. Gdy ruda była dla nich
 * jedzeniem, zjadali własny materiał na nowych kowali i klan nigdy nie rósł.
 */
function edible(race: Race, t: number): boolean { return race === Race.DWARF ? false : FOOD_TILES.has(t); }

/** Jeden krok życia. Wszystko, co stworzenie robi, wynika z potrzeb — nie z rozkazu. */
export function stepCreature(sim: Sim, c: Creature): void {
  const w = sim.world;
  const d = RACES[c.race];
  const tx = Math.max(0, Math.min(w.w - 1, Math.floor(c.x)));
  const ty = Math.max(0, Math.min(w.h - 1, Math.floor(c.y)));
  c.age++;
  c.anim++;

  // --- żywioły
  const i = w.idx(Math.max(0, Math.min(w.w - 1, tx)), Math.max(0, Math.min(w.h - 1, ty)));
  if (w.magma[i] > 0) { c.hp -= 4 + w.magma[i]; c.fear = 1; }
  if (w.water[i] > 5 && !d.swims) { c.hp -= 0.22; c.fear = Math.min(1, c.fear + 0.05); }
  if (w.tile[i] === T.FUNGUS && c.race !== Race.GOBLIN) c.hp -= 0.05;

  // --- głód i wiek
  // zatłoczenie bije w głód natychmiast: nadmiar nie chudnie powoli, tylko pada
  const over = sim.crowding[c.race] - 1;
  const press = over > 0 ? 1 + over * over * 3 : 1;
  // w samouczku góra trawi wolniej: nauka nie może polegać na patrzeniu, jak wszyscy mrą
  c.hunger += 0.0003 * d.metabolism * (1 + c.mad * 0.5) * press * (sim.spokojnySwiat ? 0.35 : 1);
  // Żużlowcy żywią się tym, co wypluwa ogień — przy gorącu głód im nie doskwiera
  if (c.race === Race.DWARF) {
    // ciepło własnej kuźni sięga daleko — przy niej się mieszka, nie tylko je
    let hot = false;
    for (const f of sim.allForges) {
      const fx = f % w.w, fy = (f / w.w) | 0;
      if (Math.abs(fx - tx) <= 8 && Math.abs(fy - ty) <= 8) { hot = true; break; }
    }
    if (!hot) {
      for (let dy = -2; dy <= 2 && !hot; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const x = tx + dx, y = ty + dy;
          if (w.inb(x, y) && w.magma[w.idx(x, y)] > 0) { hot = true; break; }
        }
    }
    if (hot) c.hunger = Math.max(0, c.hunger - 0.0035);
  }
  if (c.hunger > 1) c.hp -= 0.6;
  else if (c.hunger < 0.5 && c.hp < RACES[c.race].maxHp) c.hp = Math.min(RACES[c.race].maxHp, c.hp + 0.02);
  if (c.age > d.lifespan && !sim.spokojnySwiat) c.hp -= 0.5;
  c.fear *= 0.985;

  // --- szaleństwo głębi: im niżej, tym mniej z niego zostaje
  const depth = w.depth(ty);
  // Blisko rdzenia wiara trzyma głowę na miejscu. Bez tego przedsionek zjadał
  // każdą pielgrzymkę: wierni wariowali, rozszczepiali się i wracali trolami.
  const podRdzeniem = c.devotion > 0.5
    && Math.abs(c.x - w.coreX) < 20 && Math.abs(c.y - w.coreY) < 20;
  if (!podRdzeniem && depth > 0.72 && c.race !== Race.TROLL && sim.rng.chance(0.0016 * (depth - 0.7) * 10)) {
    c.mad = Math.min(1, c.mad + 0.12);
    if (c.mad > 0.6 && sim.rng.chance(0.05)) sim.maddenCreature(c);
  }
  if (podRdzeniem && c.mad > 0) c.mad = Math.max(0, c.mad - 0.0015);

  if (c.hp <= 0) { sim.kill(c, 'z wycieńczenia', c.age > d.lifespan ? 'starość' : 'wycieńczenie'); return; }

  // --- przysypanie: kiedy strop się osunie, stworzenie zostaje w litej skale.
  // Bez tego stało nieruchomo do śmierci i wyglądało to jak zawieszona gra.
  if (!w.passable(tx, ty)) {
    c.hp -= 0.12;
    c.fear = Math.min(1, c.fear + 0.08);
    if (d.digPower > 0) {
      c.dig += d.digPower * 2.5;
      const twardosc = w.hardness(tx, ty);
      if (twardosc > 0 && c.dig >= twardosc * 5) {
        c.dig = 0;
        w.set(tx, ty, T.AIR);
        sim.spark(c.x, c.y, 'dust');
      }
    } else if (w.passable(tx, ty - 1)) {
      c.y -= 0.35;                       // kto nie kopie, ten się wygrzebuje w górę
    }
    return;
  }

  // --- grawitacja
  if (w.passable(tx, ty + 1) && w.water[w.idx(tx, Math.min(w.h - 1, ty + 1))] < 4) {
    c.vy = Math.min(0.9, c.vy + 0.12);
    c.y += c.vy;
    // Upadek boli, ale nie zabija na miejscu. Wcześniej jeden lot szybem, który
    // stworzenie samo sobie wykopało, zabierał osiem z dziesięciu punktów życia —
    // i połowa góry ginęła „z wycieńczenia" w wieku trzystu tików.
    if (c.vy > 0.75 && !w.passable(tx, Math.floor(c.y) + 1)) {
      c.hp -= Math.min(RACES[c.race].maxHp * 0.2, (c.vy - 0.7) * 10);
    }
    return;
  }
  if (c.vy > 0.35) {
    // każdy upadek wzbija kurz — widać, że grunt naprawdę im uciekł spod nóg
    const ile = c.vy > 0.7 ? 3 : 1;
    for (let k = 0; k < ile; k++) sim.spark(c.x + sim.rng.range(-0.4, 0.4), c.y + 0.3, 'dust');
    if (c.vy > 0.7) sim.efekt(c.x, c.y + 0.4, 'kopniecie');
  }
  if (c.vy > 0.6) c.hp -= Math.min(RACES[c.race].maxHp * 0.15, (c.vy - 0.6) * 7);
  c.vy = 0;

  // --- rozglądanie się: rysunek twojego ciała powstaje tylko z ich oczu
  if ((c.id + sim.tick) % 7 === 0) {
    const r = c.race === Race.HUMAN ? 8 : c.race === Race.TROLL ? 8 : 6;
    const fresh = w.observe(tx, ty, r, sim.tick);
    if (fresh) sim.onVisit(fresh);
  }

  if (c.carry > 0) c.carryT++; else c.carryT = 0;

  // --- zakleszczenie: stoi w miejscu mimo zajęcia, więc niech spróbuje czegoś innego
  if ((c.id + sim.tick) % 12 === 0) {
    if (Math.abs(c.x - c.lx) < 0.12 && Math.abs(c.y - c.ly) < 0.12) c.stall++;
    else c.stall = 0;
    c.lx = c.x; c.ly = c.y;
    if (c.stall > 4) {
      c.stall = 0;
      c.jt = 0;
      c.job = Job.WANDER;
      c.jx = c.x + sim.rng.range(-9, 9);
      c.jy = c.y + sim.rng.range(-4, 4);
      c.face = -c.face;
    }
  }

  // Dotknięcie rdzenia kończy grę. Wcześniej trzeba było wykuć sam kafel rdzenia,
  // więc stworzenie potrafiło stać na nim godzinami i nigdy nie „dojść".
  if (Math.abs(c.x - w.coreX) <= 3 && Math.abs(c.y - w.coreY) <= 3) {
    const cx = Math.round(c.x), cy = Math.round(c.y);
    for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (w.get(cx + dx, cy + dy) === T.CORE) { sim.reachCore(c); return; }
    }
  }

  // --- wybór zajęcia
  if (c.jt-- <= 0) pickJob(sim, c);

  switch (c.job) {
    case Job.EAT: doEat(sim, c); break;
    case Job.DIG: case Job.DESCEND: doDig(sim, c); break;
    case Job.PRAY: doPray(sim, c); break;
    case Job.BUILD: doBuild(sim, c); break;
    case Job.FIGHT: doFight(sim, c); break;
    case Job.FLEE: doFlee(sim, c); break;
    case Job.BREED: doBreed(sim, c); break;
    case Job.HAUL: doHaul(sim, c); break;
    case Job.SLAVE: doSlave(sim, c); break;
    case Job.SACRIFICE: doSacrifice(sim, c); break;
    case Job.RAID: doRaid(sim, c); break;
    case Job.SLEEP: doSleep(sim, c); break;
    case Job.HEAT: doHeat(sim, c); break;
    case Job.DRAIN: doDrain(sim, c); break;
    case Job.PIELGRZYM: doPielgrzym(sim, c); break;
    default: doWander(sim, c); break;
  }
}

// ---------------------------------------------------------------- wybór celu

function pickJob(sim: Sim, c: Creature): void {
  const w = sim.world;
  const d = RACES[c.race];
  const clan = sim.clans[c.clan];
  const oldX = c.jx, oldY = c.jy;
  c.jt = 18 + sim.rng.int(24);
  // Łup i tak trafia do klanu: chowają go po drodze. Warunek „tylko gdy niesie"
  // rozbijał się o antyzakleszczenie, które kasowało zajęcie — ruda krążyła w kółko.
  if (c.carry > 0 && (c.job === Job.HAUL || c.carryT > 240)) {
    clan.stock += c.carry; c.carry = 0; c.carryT = 0;
  }
  /** Zachowaj postęp kucia, jeśli cel się nie zmienił — inaczej tunel nigdy nie powstaje. */
  const keepDig = () => { if (c.jx !== oldX || c.jy !== oldY) c.dig = 0; };

  // myśl od ciebie jest silniejsza niż każdy instynkt
  if (c.thought !== Thought.NONE) {
    switch (c.thought) {
      case Thought.DIG_DOWN:
        c.job = Job.DESCEND; c.jx = Math.floor(c.x); c.jy = Math.min(w.h - 2, Math.floor(c.y) + 12);
        c.jt = 120; return;
      case Thought.KILL_KIN: {
        // szuka najpierw swoich, potem kogokolwiek z rasy — szept nie może gasnąć bez skutku
        const swoj = sim.nearestCreature(c.x, c.y, 40, (o) => o.id !== c.id && o.clan === c.clan);
        const ktokolwiek = swoj ?? sim.nearestCreature(c.x, c.y, 60, (o) => o.id !== c.id && o.race === c.race);
        if (ktokolwiek) {
          c.job = Job.FIGHT; c.jx = ktokolwiek.x; c.jy = ktokolwiek.y;
          sim.target.set(c.id, ktokolwiek.id); c.jt = 90;
          return;
        }
        c.thought = Thought.NONE; break;
      }
      case Thought.PROPHESY:
        if (!c.prophet) sim.makeProphet(c);
        c.thought = Thought.NONE; break;
      case Thought.FLEE_UP:
        c.job = Job.FLEE; c.jx = c.x + sim.rng.range(-8, 8); c.jy = Math.max(2, c.y - 14); c.jt = 80; return;
      case Thought.BREED:
        c.job = Job.BREED; c.jt = 40; c.thought = Thought.NONE; return;
    }
  }

  if (c.hp < RACES[c.race].maxHp * 0.3 && c.fear > 0.3) { c.job = Job.FLEE; c.jt = 40; return; }

  // każda rasa ma własny sposób na głód; bez tego wszystkie poza Ślepym Ludem wymierały
  if (c.hunger > (c.race === Race.DWARF ? 0.34 : 0.5)) {
    if (c.race === Race.TROLL && c.hunger > 0.85) {
      const prey = sim.spokojnySwiat ? null : sim.nearestCreature(c.x, c.y, 7, (o) => o.id !== c.id && o.race !== Race.TROLL);
      if (!prey) { c.job = Job.SLEEP; c.jt = 220; return; }
    }
    if (c.race === Race.DWARF) {
      const heat = sim.findHeat(c.x, c.y, 40);
      if (heat) { c.job = Job.HEAT; c.jx = heat[0]; c.jy = heat[1]; c.jt = 200; return; }
    }
    if (c.race === Race.SPINNER && !sim.spokojnySwiat) {
      const slave = sim.nearestCreature(c.x, c.y, 16, (o) => o.clan === c.clan && o.slave);
      if (slave) { c.job = Job.DRAIN; sim.target.set(c.id, slave.id); c.jt = 90; return; }
    }
  }

  // wróg w pobliżu
  const foe = sim.nearestCreature(c.x, c.y, c.race === Race.HUMAN ? 16 : 11, (o) => sim.hostile(c, o));
  if (foe) {
    const scary = RACES[foe.race].strength > d.strength * 2.2;
    if (scary && sim.rng.chance(0.6 * d.fearGain)) {
      c.job = Job.FLEE; c.jx = c.x - (foe.x - c.x); c.jy = c.y - (foe.y - c.y); c.jt = 40; c.fear = 1; return;
    }
    if (c.race === Race.SPINNER && RACES[foe.race].strength < 7 && sim.rng.chance(0.75)) {
      c.job = Job.SLAVE; sim.target.set(c.id, foe.id); c.jt = 70; return;
    }
    c.job = Job.FIGHT; sim.target.set(c.id, foe.id); c.jt = 60; return;
  }

  if (c.race === Race.HUMAN) { c.job = Job.RAID; c.jt = 90; return; }

  if (c.hunger > 0.45 && c.race !== Race.DWARF) {
    const food = sim.findFood(c.x, c.y, c.hunger > 0.8 ? 30 : 18, d.swims, (t) => edible(c.race, t));
    if (food) { c.job = Job.EAT; c.jx = food[0]; c.jy = food[1]; c.jt = 60 + Math.round(Math.hypot(food[0] - c.x, food[1] - c.y) * 14); return; }
    sim.foodMiss++;
    if (d.eatsMeat && !sim.spokojnySwiat) {
      const prey = sim.nearestCreature(c.x, c.y, 18, (o) => o.id !== c.id && (o.race !== c.race || c.hunger > 0.9));
      if (prey) { c.job = Job.FIGHT; sim.target.set(c.id, prey.id); c.jt = 70; return; }
    }
  }

  // Pielgrzymka pod rdzeń: nacja trzyma pod skorupą stałą wartę. Kto zgłodnieje,
  // wraca do gniazda, a na jego miejsce schodzi następny — postęp i tak należy
  // do nacji (patrz rytual.ts), więc zmiana warty niczego nie kasuje.
  // Na pielgrzymkę idzie garstka najedzonych z dużej nacji. Wcześniej ruszała połowa
  // plemienia — razem z tymi, którzy ledwo się trzymali — i cała góra wymierała w drodze
  // pod rdzeń, choć grzyb rósł tuż obok gniazda.
  if (d.faithGain > 0 && clan.devotion > 0.5 && c.devotion > 0.45 && c.hunger < 0.35
      && clan.pop >= 8 && sim.crowding[c.race] < 0.95
      && pielgrzymowKlanu(sim, clan.id) < Math.min(PIELGRZYMOW, Math.floor(clan.pop * 0.25))) {
    // im bliżej przedsionka ktoś już jest, tym chętniej schodzi resztę drogi
    const dystans = Math.hypot(c.x - w.coreX, c.y - (w.coreY - 14));
    const chec = 0.06 + 0.3 * Math.max(0, 1 - dystans / 90);
    if (sim.rng.chance(chec)) {
      c.job = Job.PIELGRZYM;
      c.jx = w.coreX + sim.rng.int(7) - 3;
      c.jy = w.coreY - 14;
      c.jt = 7000; c.dig = 0; return;       // to wyprawa, nie spacer — nie porzuca jej po chwili
    }
  }

  if (c.carry > 0) { c.job = Job.HAUL; c.jx = clan.hx; c.jy = clan.hy; c.jt = 120; return; }

  // klan bez ognia przestaje istnieć — odbudowa kuźni jest ważniejsza niż wszystko
  if (c.race === Race.DWARF && clan.forges.length === 0 && clan.stock >= 3 && sim.canBuild(c)) {
    c.job = Job.BUILD; c.jt = 200; return;
  }

  if (c.race === Race.DWARF && clan.stock < 8 && c.hunger < 0.6) {
    // nie oddalają się od ognia dalej, niż zdążą wrócić
    const ore = sim.findTile(c.x, c.y, 14, (t) => t === T.ORE || t === T.CRYSTAL);
    if (ore) {
      const dist = Math.hypot(ore[0] - c.x, ore[1] - c.y);
      c.job = Job.DIG; c.jx = ore[0]; c.jy = ore[1]; c.jt = 140 + Math.round(dist * 30);
      keepDig(); return;
    }
  }

  // rytuał: ofiara z własnych dzieci, gdy oddanie jest wysokie
  if (c.race === Race.GOBLIN && clan.devotion > 0.6 && clan.pop > 12 && sim.rng.chance(0.05)) {
    const shrine = sim.findTile(c.x, c.y, 20, (t) => t === T.SHRINE || t === T.GLYPH);
    if (shrine) { c.job = Job.SACRIFICE; c.jx = shrine[0]; c.jy = shrine[1]; c.jt = 120; return; }
  }

  // Rozmnaża się wyłącznie Ślepy Lud. Żużlowców się wykuwa, Prządki przerabiają
  // niewolników, Trole są końcem drogi kogoś, kto kopał za głęboko, a Grzybnia rośnie
  // ze zwłok. Inaczej jedyny wektor wzrostu wygrywa ten, kto rodzi najszybciej.
  if (c.race === Race.GOBLIN && clan.pop < clan.cap && sim.crowding[c.race] < 0.92
      && sim.popByRace[c.race] < sim.raceCap[c.race]
      && c.hunger < 0.5 && c.age > 400 && sim.rng.chance(RACES[c.race].breedRate)) {
    c.job = Job.BREED; c.jt = 60; return;
  }

  // modlitwa albo praca — zależnie od tego, jak dana rasa cię czci
  if (d.faithGain > 0 && sim.rng.chance(0.22 + clan.devotion * 0.5)) {
    const holy = sim.findTile(c.x, c.y, 22, (t) => t === (c.race === Race.DWARF ? T.FORGE : T.SHRINE) || t === T.GLYPH || t === T.CORE);
    if (holy) { c.job = Job.PRAY; c.jx = holy[0]; c.jy = holy[1]; c.jt = 110; return; }
    if (sim.canBuild(c)) { c.job = Job.BUILD; c.jt = 90; return; }
  }

  // kopanie: ruda ciągnie, ale pusty korytarz też trzeba komuś wydrążyć
  if (d.digPower > 0 && sim.rng.chance(0.55)) {
    const ore = sim.findTile(c.x, c.y, 14, (t) => t === T.ORE || (c.race === Race.DWARF && t === T.CRYSTAL));
    if (ore) {
      const dist = Math.hypot(ore[0] - c.x, ore[1] - c.y);
      c.job = Job.DIG; c.jx = ore[0]; c.jy = ore[1]; c.jt = 100 + Math.round(dist * 30);
      keepDig(); return;
    }
    c.job = Job.DIG;
    c.jx = Math.floor(c.x) + sim.rng.int(13) - 6;
    c.jy = Math.floor(c.y) + sim.rng.int(9) - 3;
    c.jt = 90; c.dig = 0; return;
  }

  c.job = Job.WANDER;
  c.jx = c.x + sim.rng.range(-10, 10);
  c.jy = c.y + sim.rng.range(-3, 3);
}

// -------------------------------------------------------------------- ruch

/** Idzie w stronę celu; jak trzeba, wygryza sobie drogę. Tunel to ślad ich potrzeb. */
function walkTo(sim: Sim, c: Creature, tx: number, ty: number, mayDig = true): boolean {
  const w = sim.world;
  const d = RACES[c.race];
  const dx = tx - c.x, dy = ty - c.y;
  if (Math.abs(dx) < 0.6 && Math.abs(dy) < 1.2) return true;

  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const deepWater = (x: number, y: number) => !d.swims && w.inb(x, y) && w.water[w.idx(x, y)] > 5;
  // w magmę nikt nie wchodzi z własnej woli — wcześniej była dla nich zwykłym korytarzem,
  // a Żużlowcy, którzy chodzą do ognia po ciepło, ginęli w nim całymi klanami
  const free = (x: number, y: number) => w.passable(x, y) && !deepWater(x, y) && w.magma[w.idx(x, y)] === 0;
  const speed = d.speed
    * (w.water[w.idx(cx, cy)] > 3 ? 0.5 : 1)
    * (w.tile[w.idx(cx, cy)] === T.WEB && c.race !== Race.SPINNER ? 0.4 : 1);

  // pion: cel wyraźnie wyżej albo niżej i nic nie stoi na drodze w poziomie
  if (Math.abs(dy) > 2.5 && Math.abs(dx) < 3) {
    const ny = cy + Math.sign(dy);
    if (free(cx, ny)) { c.y += Math.sign(dy) * speed * (dy > 0 ? 1.4 : 0.55); return false; }
    if (mayDig && d.digPower > 0 && w.solid(cx, ny)) { digTile(sim, c, cx, ny); return false; }
  }

  const dir = dx === 0 ? c.face : Math.sign(dx);
  c.face = dir;
  const nx = cx + dir;
  if (free(nx, cy)) { c.x += dir * speed; return false; }
  if (free(nx, cy - 1) && free(cx, cy - 1)) { c.x += dir * speed * 0.7; c.y -= 0.45; return false; }
  if (mayDig && d.digPower > 0 && w.solid(nx, cy)) { digTile(sim, c, nx, cy); return false; }

  // droga zablokowana wodą albo skałą, której nie ugryzie — obejściem jest inna strona
  const alt = cx - dir;
  if (free(alt, cy)) { c.x -= dir * speed * 0.8; c.face = -dir; return false; }
  if (mayDig && d.digPower > 0 && w.solid(cx, cy - 1)) { digTile(sim, c, cx, cy - 1); return false; }
  return false;
}

/** Gryzie kafel. Skała ustępuje powoli, ziemia od razu — i wtedy strop może nie wytrzymać. */
function digTile(sim: Sim, c: Creature, x: number, y: number): void {
  const w = sim.world;
  const t = w.get(x, y);
  const hard = w.hardness(x, y);
  if (hard <= 0) return;
  // Nikt przy zdrowych zmysłach nie przebija ściany, za którą płynie ogień: losowe
  // drążenie otwierało kieszenie magmy i wypalało całe plemiona w kilka sekund.
  // Szaleni i ci, którym szepnąłeś „kop w dół", kopią dalej.
  if (t !== T.CORE && c.mad < 0.6 && c.job !== Job.DESCEND && sim.przyMagmie(x, y)) {
    c.dig = 0; c.jt = 0; return;
  }
  c.dig += RACES[c.race].digPower * (1 + c.mad * 0.6);
  if (c.dig < hard * 9) return;
  c.dig = 0;
  if (t === T.ORE) c.carry += 1;
  if (t === T.CRYSTAL) { c.carry += 2; c.mad = Math.min(1, c.mad + 0.2); sim.onCrystal(x, y); }
  if (t === T.CORE) { sim.reachCore(c); return; }
  w.set(x, y, T.AIR);
  sim.dug++;
}

// ------------------------------------------------------------------ zajęcia

function doWander(sim: Sim, c: Creature): void { walkTo(sim, c, c.jx, c.jy, sim.rng.chance(0.25)); }

function doDig(sim: Sim, c: Creature): void {
  const w = sim.world;
  if (w.get(c.jx, c.jy) === T.AIR || !w.inb(c.jx, c.jy)) { c.jt = 0; return; }
  const near = Math.abs(c.jx - c.x) <= 1.8 && Math.abs(c.jy - c.y) <= 1.8;
  if (near) digTile(sim, c, c.jx, c.jy);
  else walkTo(sim, c, c.jx, c.jy);
}

function doEat(sim: Sim, c: Creature): void {
  const w = sim.world;
  const t = w.get(c.jx, c.jy);
  if (!edible(c.race, t)) { c.jt = 0; return; }
  // po kaflach, nie po współrzędnych: jx to lewa krawędź kafla, więc kęs po lewej
  // był „dalej” niż ten sam kęs po prawej, a ten nad głową bywał poza zasięgiem na zawsze
  if (Math.abs(c.jx - Math.floor(c.x)) <= 1 && Math.abs(c.jy - Math.floor(c.y)) <= 1) {
    w.set(c.jx, c.jy, T.AIR);
    sim.meals++;
    c.hunger = Math.max(0, c.hunger - (t === T.BONES ? 0.9 : 0.7));
    c.hp = Math.min(RACES[c.race].maxHp, c.hp + 2);
    c.jt = 0;
  } else walkTo(sim, c, c.jx, c.jy);
}

/**
 * Droga pod rdzeń. Po drodze wygryzają sobie tunel w skale, ale w samą skorupę
 * nie ruszą — ta pęka tylko od tego, że stoją pod nią i się modlą (patrz rytual.ts).
 * Wiara ich w tym miejscu podkarmia, inaczej żaden kult nie dotrwałby do końca.
 */
function doPielgrzym(sim: Sim, c: Creature): void {
  const w = sim.world;
  // po drodze je, co znajdzie; dopiero gdy nie ma nic, zawraca do swoich
  if (c.hunger > 0.62) {
    const jedzenie = sim.findFood(c.x, c.y, 12, RACES[c.race].swims, (t) => edible(c.race, t));
    if (jedzenie) { c.job = Job.EAT; c.jx = jedzenie[0]; c.jy = jedzenie[1]; c.jt = 90; return; }
    if (c.hunger > 0.7) { c.job = Job.WANDER; c.jt = 0; c.jx = sim.clans[c.clan].hx; c.jy = sim.clans[c.clan].hy; return; }
  }
  const wPrzedsionku = Math.abs(c.x - w.coreX) < 6 && Math.abs(c.y - (w.coreY - 14)) < 5;
  if (!wPrzedsionku) { walkTo(sim, c, c.jx, c.jy); return; }
  // Dopiero na miejscu widać, czy skorupa już puściła — i liczy się faktyczna droga,
  // nie licznik pęknięć. Wtedy pielgrzym przestaje być pielgrzymem: schodzi do rdzenia.
  if (sim.rytual.otwarta && sim.clans[c.clan].devotion > 0.55) {
    c.job = Job.DIG; c.jx = w.coreX; c.jy = w.coreY; c.jt = 1200; c.dig = 0;
    return;
  }
  c.devotion = Math.min(1, c.devotion + 0.0012);
  c.hunger = Math.max(0, c.hunger - 0.00018);      // wiara trawi wolniej, ale trawi
  sim.wiara += 0.0025 * sim.incomeMult();
  if (sim.tick % 24 === 0 && sim.rng.chance(0.3)) sim.efekt(c.x, c.y - 0.4, 'mysl');
}

function doPray(sim: Sim, c: Creature): void {
  const w = sim.world;
  const t = w.get(c.jx, c.jy);
  if (t !== T.SHRINE && t !== T.FORGE && t !== T.GLYPH && t !== T.CORE) { c.jt = 0; return; }
  if (Math.abs(c.jx - c.x) <= 2 && Math.abs(c.jy - c.y) <= 2) {
    sim.pray(c, t);
    c.devotion = Math.min(1, c.devotion + 0.004);
  } else walkTo(sim, c, c.jx, c.jy);
}

function doBuild(sim: Sim, c: Creature): void {
  if (!sim.buildStep(c)) c.jt = 0;
}

function doFight(sim: Sim, c: Creature): void {
  const foe = sim.creatureById(sim.target.get(c.id) ?? -1);
  if (!foe || foe.dead) { sim.target.delete(c.id); c.jt = 0; return; }
  const dist = Math.hypot(foe.x - c.x, foe.y - c.y);
  if (dist < 1.5) {
    const dmg = RACES[c.race].strength * (0.6 + sim.rng.next() * 0.8) * (1 + c.mad);
    foe.hp -= dmg;
    foe.fear = Math.min(1, foe.fear + 0.3);
    sim.spark(foe.x, foe.y, 'hit');
    if (foe.hp <= 0) {
      sim.kill(foe, `z ręki ${sim.clans[c.clan].name}`, 'walka');
      if (RACES[c.race].eatsMeat) c.hunger = Math.max(0, c.hunger - 0.5);
      sim.feud(c.clan, foe.clan);
    }
  } else if (dist > 22) { sim.target.delete(c.id); c.jt = 0; }
  else walkTo(sim, c, foe.x, foe.y);
}

function doFlee(sim: Sim, c: Creature): void { walkTo(sim, c, c.jx, c.jy, false); }

function doBreed(sim: Sim, c: Creature): void {
  const clan = sim.clans[c.clan];
  const far = Math.hypot(clan.hx - c.x, clan.hy - c.y);
  if (far > 14) { sim.birth(c); c.hunger = Math.min(1, c.hunger + 0.3); c.jt = 0; return; }
  if (far > 3) { walkTo(sim, c, clan.hx, clan.hy); return; }
  sim.birth(c);
  c.hunger = Math.min(1, c.hunger + 0.25);
  c.jt = 0;
}

function doHaul(sim: Sim, c: Creature): void {
  const clan = sim.clans[c.clan];
  if (Math.hypot(clan.hx - c.x, clan.hy - c.y) < 3.5) {
    clan.stock += c.carry; c.carry = 0; c.jt = 0;
  } else walkTo(sim, c, clan.hx, clan.hy);
}

/** Prządki nie podbijają — przejmują. Niewolnik zmienia klan, nie rasę. */
function doSlave(sim: Sim, c: Creature): void {
  const foe = sim.creatureById(sim.target.get(c.id) ?? -1);
  if (!foe || foe.dead) { c.jt = 0; return; }
  const dist = Math.hypot(foe.x - c.x, foe.y - c.y);
  if (dist < 1.4) {
    foe.hp -= 1.5;
    foe.fear = 1;
    if (foe.hp < RACES[foe.race].maxHp * 0.62) sim.enslave(foe, c.clan);
    c.jt = 0;
  } else walkTo(sim, c, foe.x, foe.y);
}

function doSacrifice(sim: Sim, c: Creature): void {
  if (Math.abs(c.jx - c.x) > 2 || Math.abs(c.jy - c.y) > 2) { walkTo(sim, c, c.jx, c.jy); return; }
  sim.sacrifice(c);
  c.jt = 0;
}

/** Sen w skale: nie rusza się, nie je, budzi go dopiero czyjś krok. */
function doSleep(sim: Sim, c: Creature): void {
  c.hunger = Math.max(0.5, c.hunger - 0.0004);
  c.hp = Math.min(RACES[c.race].maxHp, c.hp + 0.03);
  if ((c.id + sim.tick) % 30 === 0) {
    const prey = sim.nearestCreature(c.x, c.y, 8, (o) => o.id !== c.id && o.race !== Race.TROLL);
    if (prey) { c.job = Job.FIGHT; sim.target.set(c.id, prey.id); c.jt = 80; c.hunger = Math.min(1, c.hunger); }
  }
}

/** Powrót do ognia: żużel jest dla nich jedzeniem, a kuźnia domem. */
function doHeat(sim: Sim, c: Creature): void {
  const clan = sim.clans[c.clan];
  if (c.carry > 0 && Math.hypot(clan.hx - c.x, clan.hy - c.y) < 4) { clan.stock += c.carry; c.carry = 0; }
  const d = Math.hypot(c.jx - c.x, c.jy - c.y);
  if (d < 3.6) { c.hunger = Math.max(0, c.hunger - 0.005); if (c.hunger < 0.12) c.jt = 0; }
  else walkTo(sim, c, c.jx, c.jy);
}

/** Prządka żywi się tym, co wzięła. Niewolnik nie umiera od razu — to by było marnotrawstwo. */
function doDrain(sim: Sim, c: Creature): void {
  const victim = sim.creatureById(sim.target.get(c.id) ?? -1);
  if (!victim || victim.dead || victim.clan !== c.clan) { c.jt = 0; return; }
  if (Math.hypot(victim.x - c.x, victim.y - c.y) < 1.5) {
    victim.hp -= 0.25;
    victim.fear = 1;
    c.hunger = Math.max(0, c.hunger - 0.006);
    if (sim.rng.chance(0.04)) sim.spark(victim.x, victim.y, 'hit');
    if (victim.hp <= 0) sim.kill(victim, 'wyssany przez Prządki', 'jarzmo');
    if (c.hunger < 0.15) c.jt = 0;
  } else walkTo(sim, c, victim.x, victim.y);
}

/** Ludzie nie mieszkają w tobie. Przychodzą po rudę i po sławę. */
function doRaid(sim: Sim, c: Creature): void {
  if (c.carry >= 4 || c.hp < RACES[c.race].maxHp * 0.35) {
    if (c.y < 12) { sim.leaveWorld(c); return; }
    walkTo(sim, c, c.x + sim.rng.range(-3, 3), 2);
    return;
  }
  const ore = sim.findTile(c.x, c.y, 18, (t) => t === T.ORE);
  if (ore) { c.jx = ore[0]; c.jy = ore[1]; doDig(sim, c); return; }
  walkTo(sim, c, c.x + sim.rng.range(-14, 14), c.y + sim.rng.range(0, 10));
}

export { PASSABLE };
