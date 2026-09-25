import { Sim } from '../sim/sim';
import { T, PASSABLE } from '../sim/tiles';
import { Race, RACES, odmien } from '../sim/races';
import { Creature, Thought } from '../sim/creatures';

export type Verb = 'ksztaltuj' | 'zasiej' | 'szept' | 'znak' | 'skaz';

export interface Tool { id: string; label: string; hint: string; }

export const TOOLS: Record<Verb, Tool[]> = {
  ksztaltuj: [
    { id: 'draz', label: 'drąż', hint: 'skała ustępuje' },
    { id: 'zawal', label: 'zawal', hint: 'strop wraca na miejsce' },
    { id: 'woda', label: 'woda', hint: 'żyła wodna pęka' },
    { id: 'zar', label: 'żar', hint: 'otwierasz gorąco' },
  ],
  zasiej: [
    { id: 'ruda', label: 'ruda', hint: 'będą się o nią bić' },
    { id: 'grzyb', label: 'grzyb', hint: 'jedzenie, które rośnie samo' },
    { id: 'kosci', label: 'kości', hint: 'padlina i pamięć' },
    { id: 'trucizna', label: 'trucizna', hint: 'kryształ, co miesza w głowie' },
  ],
  szept: [
    { id: 'kop', label: 'kop w dół', hint: 'niech zejdzie głębiej, niż powinien' },
    { id: 'zabij', label: 'zabij swoich', hint: 'schizma zaczyna się od jednego noża' },
    { id: 'prorok', label: 'prorokuj', hint: 'zrób z niego proroka' },
    { id: 'uciekaj', label: 'uciekaj', hint: 'strach rozchodzi się sam' },
  ],
  znak: [
    { id: 'objawienie', label: 'objawienie', hint: 'wszyscy widzą; oddanie rośnie' },
    { id: 'panika', label: 'panika', hint: 'wszyscy widzą; uciekają' },
  ],
  skaz: [
    { id: 'plodnosc', label: 'płodność', hint: 'więcej dzieci, krótsze życie, większy głód' },
    { id: 'zadza', label: 'żądza krwi', hint: 'silniejsi i nieustraszeni — ale przestają się modlić' },
    { id: 'slepota', label: 'ślepota', hint: 'wolniejsi, wierzą mocniej, kopią głębiej' },
    { id: 'kamien', label: 'kamienna skóra', hint: 'twardsi, ciężsi, gorzej kopią i więcej jedzą' },
  ],
};

/** Ile kosztuje. Gracz nigdy nie widzi liczby — tylko to, czy ryt się rozjarza. */
export function cost(verb: Verb, tool: string): { krew: number; wiara: number; otchlan: number } {
  switch (verb) {
    case 'ksztaltuj': return { krew: tool === 'zar' ? 14 : tool === 'woda' ? 10 : 6, wiara: 0, otchlan: 0 };
    case 'zasiej': return { krew: tool === 'trucizna' ? 6 : 8, wiara: tool === 'grzyb' ? 0 : 4, otchlan: tool === 'trucizna' ? 12 : 0 };
    case 'szept': return { krew: 0, wiara: tool === 'prorok' ? 18 : 5, otchlan: 0 };
    case 'znak': return { krew: 0, wiara: 45, otchlan: 0 };
    case 'skaz': return { krew: 90, wiara: 0, otchlan: 55 };
  }
}

export function affordable(sim: Sim, verb: Verb, tool: string): boolean {
  const c = cost(verb, tool);
  return sim.krew >= c.krew && sim.wiara >= c.wiara && sim.otchlan >= c.otchlan;
}

function pay(sim: Sim, verb: Verb, tool: string): boolean {
  const c = cost(verb, tool);
  if (!affordable(sim, verb, tool)) return false;
  if (c.otchlan > 0 && !sim.spendOtchlan(c.otchlan)) return false;
  sim.krew -= c.krew; sim.wiara -= c.wiara;
  return true;
}

/** Kształtowanie — drążysz, zawalasz, wpuszczasz wodę albo otwierasz żyłę gorąca. */
export function shape(sim: Sim, tool: string, tx: number, ty: number, radius = 1.6): boolean {
  const w = sim.world;
  if (!w.inb(tx, ty)) return false;

  // Najpierw sprawdzamy, czy jest co robić — inaczej narzędzie brało zapłatę
  // i nie zmieniało niczego, co wyglądało jak zepsuta mechanika.
  const r = Math.ceil(radius);
  const kafle: number[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const x = tx + dx, y = ty + dy;
      if (!w.inb(x, y)) continue;
      const i = w.idx(x, y);
      if (w.tile[i] === T.CORE) continue;
      kafle.push(i);
    }
  }
  // sucha strefa wokół przedsionka: ani wody, ani żaru — to jedyna droga do rdzenia
  if ((tool === 'woda' || tool === 'zar') && w.suchaStrefa(tx, ty)) return false;
  if (tool === 'zawal' && !kafle.some((i) => PASSABLE[w.tile[i]] === 1)) return false;
  if (tool === 'draz' && !kafle.some((i) => PASSABLE[w.tile[i]] !== 1 && w.tile[i] !== T.STONE)) return false;
  if (!kafle.length) return false;
  if (!pay(sim, 'ksztaltuj', tool)) return false;

  for (const i of kafle) {
    const sx = i % w.w, sy = (i / w.w) | 0;
    w.oznaczSlad(sx, sy, tool === 'zawal' ? 2 : 1, sim.tick);
    switch (tool) {
      case 'draz':
        if (w.tile[i] !== T.STONE) w.tile[i] = T.AIR;
        break;
      case 'zawal':
        if (PASSABLE[w.tile[i]] === 1) { w.tile[i] = T.SOIL; w.water[i] = 0; w.magma[i] = 0; }
        break;
      case 'woda':
        // żyła pęka także w litej skale — inaczej woda działała tylko w korytarzu
        if (PASSABLE[w.tile[i]] !== 1 && w.tile[i] !== T.STONE) w.tile[i] = T.AIR;
        if (PASSABLE[w.tile[i]] === 1) { w.water[i] = 8; w.magma[i] = 0; }
        break;
      case 'zar':
        if (PASSABLE[w.tile[i]] !== 1 && w.tile[i] !== T.STONE) w.tile[i] = T.AIR;
        if (PASSABLE[w.tile[i]] === 1) { w.magma[i] = 8; w.water[i] = 0; }
        break;
    }
  }
  if (tool === 'zawal') {
    const victim = sim.nearestCreature(tx, ty, radius + 1, () => true);
    if (victim) sim.kill(victim, 'pod zawałem', 'zawał');
  }
  sim.efekt(tx + 0.5, ty + 0.5, tool === 'zawal' ? 'zawal' : 'kopniecie');
  for (let i = 0; i < 4; i++) sim.spark(tx + 0.5, ty + 0.5, tool === 'zar' ? 'ember' : 'dust');
  return true;
}

export function seed(sim: Sim, tool: string, tx: number, ty: number): boolean {
  const w = sim.world;
  if (!w.inb(tx, ty)) return false;
  if (!pay(sim, 'zasiej', tool)) return false;
  const r = 2;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx, y = ty + dy;
      if (!w.inb(x, y) || dx * dx + dy * dy > r * r) continue;
      const i = w.idx(x, y);
      const solid = PASSABLE[w.tile[i]] !== 1;
      if (tool === 'ruda' && solid && w.tile[i] !== T.CORE && sim.rng.chance(0.6)) w.tile[i] = T.ORE;
      if (tool === 'grzyb' && !solid && sim.rng.chance(0.5)) w.tile[i] = T.FUNGUS;
      if (tool === 'kosci' && !solid && sim.rng.chance(0.5)) w.tile[i] = T.BONES;
      if (tool === 'trucizna' && solid && sim.rng.chance(0.5)) w.tile[i] = T.CRYSTAL;
      w.oznaczSlad(x, y, 1, sim.tick);
    }
  }
  sim.efekt(tx + 0.5, ty + 0.5, 'zasiew');
  for (let i = 0; i < 4; i++) sim.spark(tx + 0.5, ty + 0.5, tool === 'grzyb' ? 'spore' : 'glint');
  return true;
}

const THOUGHTS: Record<string, Thought> = {
  kop: Thought.DIG_DOWN, zabij: Thought.KILL_KIN, prorok: Thought.PROPHESY, uciekaj: Thought.FLEE_UP,
};

/** Szept — najtańszy i najprecyzyjniejszy. Tak robi się proroków i zdrajców. */
export function whisper(sim: Sim, tool: string, c: Creature): boolean {
  if (!pay(sim, 'szept', tool)) return false;
  c.thought = THOUGHTS[tool] ?? Thought.NONE;
  c.jt = 0;
  if (tool === 'uciekaj') c.fear = 1;
  const napis = tool === 'kop' ? 'kop w dół' : tool === 'zabij' ? 'zabij swoich' : tool === 'prorok' ? 'prorokuj' : 'uciekaj';
  sim.efekt(c.x, c.y, 'mysl', napis);
  sim.spark(c.x, c.y - 0.5, 'pray');
  return true;
}

/** Znak — jawny cud. Drogi, widziany przez wszystkich w okolicy. */
export function sign(sim: Sim, tool: string, tx: number, ty: number): boolean {
  const w = sim.world;
  if (!pay(sim, 'znak', tool)) return false;
  if (w.inb(tx, ty) && PASSABLE[w.tile[w.idx(tx, ty)]] === 1) w.set(tx, ty, T.GLYPH);
  const seen = new Set<number>();
  for (const c of sim.creatures) {
    if (c.dead) continue;
    const d = Math.hypot(c.x - tx, c.y - ty);
    if (d > 26) continue;
    seen.add(c.clan);
    if (tool === 'objawienie') {
      c.devotion = Math.min(1, c.devotion + 0.35);
      c.fear *= 0.4;
      sim.clans[c.clan].devotion = Math.min(1, sim.clans[c.clan].devotion + 0.12);
    } else {
      c.fear = 1;
      c.thought = Thought.FLEE_UP;
      c.jt = 0;
      sim.clans[c.clan].devotion = Math.max(0, sim.clans[c.clan].devotion - 0.04);
    }
  }
  sim.efekt(tx + 0.5, ty + 0.5, 'cud');
  for (let i = 0; i < 8; i++) sim.spark(tx + 0.5, ty + 0.5, 'pray');
  const names = [...seen].map((i) => sim.clans[i].name).slice(0, 3).join(', ');
  sim.log(tool === 'objawienie'
    ? `Znak rozbłysł w skale. Widzieli go: ${names || 'nikt'}.`
    : `Skała krzyknęła. ${names || 'Nikt'} rzucili się do ucieczki.`, 'wiara');
  return true;
}

/** Sama zmiana krwi, bez kosztu — używa jej też wczytywanie zapisu. */
export function applyTaintEffect(race: Race, tool: string): void {
  const d = RACES[race];
  switch (tool) {
    // każda skaza ma cenę płaconą przez pokolenia, nie tylko zysk
    case 'plodnosc': d.breedRate *= 2.4; d.lifespan *= 0.75; d.metabolism *= 1.45; break;
    case 'zadza': d.strength *= 1.7; d.eatsMeat = true; d.fearGain *= 0.5; d.faithGain *= 0.35; break;
    case 'slepota': d.speed *= 0.72; d.faithGain *= 2.2; d.digPower *= 1.2; break;
    case 'kamien': d.maxHp *= 1.6; d.speed *= 0.8; d.digPower *= 0.6; d.metabolism *= 1.2; break;
  }
}

/** Skażenie — zmieniasz krew gatunku na pokolenia. Nieodwracalne. */
export function taint(sim: Sim, tool: string, race: Race): boolean {
  if (sim.taints[race].includes(tool)) return false;
  if (!pay(sim, 'skaz', tool)) return false;
  applyTaintEffect(race, tool);
  sim.taints[race].push(tool);
  for (const c of sim.creatures) {
    if (c.race !== race || c.dead) continue;
    sim.efekt(c.x, c.y, 'skaza');
    break;
  }
  const d = RACES[race];
  for (const c of sim.creatures) if (c.race === race && !c.dead) c.hp = Math.min(c.hp, d.maxHp);
  sim.log(`Skaziłeś krew: ${d.name} ${odmien(d.id, 'już nigdy nie będzie taki, jak był', 'już nigdy nie będą tacy, jak byli')}.`, 'krew');
  return true;
}
