import { Sim } from '../sim/sim';
import { T, PASSABLE } from '../sim/tiles';
import { Race, RACES } from '../sim/races';
import { Creature, Thought } from '../sim/creatures';
import { KOSZTY, MOCE, SKAZY } from '../nastawy/moce';
import { odswiezPlan } from '../sim/pielgrzymka';

export type Verb = 'ksztaltuj' | 'zasiej' | 'szept' | 'znak';

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
  ],
  szept: [
    { id: 'modl', label: 'módl się', hint: 'idzie pod twój rdzeń i modli się tam' },
    { id: 'prorok', label: 'prorokuj', hint: 'odchodzi z wiernymi i zakłada nową nację' },
    { id: 'uciekaj', label: 'uciekaj', hint: 'ucieka w górę, z dala od niebezpieczeństwa' },
  ],
  znak: [
    { id: 'objawienie', label: 'objawienie', hint: 'wszyscy widzą; oddanie rośnie' },
    { id: 'panika', label: 'panika', hint: 'wszyscy widzą; uciekają' },
  ],
};

/** Ile kosztuje. Gracz nigdy nie widzi liczby — tylko to, czy ryt się rozjarza. */
export function cost(verb: Verb, tool: string): { krew: number; wiara: number; otchlan: number } {
  // cennik jest w nastawy/moce.ts; nieznane narzędzie kosztuje tyle, co pierwsze z listy
  const cennik = KOSZTY[verb];
  return { ...(cennik[tool] ?? Object.values(cennik)[0]) };
}

/** Czy stać cię na to — z odliczeniem tego, co już zarezerwowały rozkazy z pauzy. */
export function affordable(sim: Sim, verb: Verb, tool: string): boolean {
  const c = cost(verb, tool);
  const r = sim.rezerwa;
  return sim.krew - r.krew >= c.krew && sim.wiara - r.wiara >= c.wiara && sim.otchlan - r.otchlan >= c.otchlan;
}

function pay(sim: Sim, verb: Verb, tool: string): boolean {
  const c = cost(verb, tool);
  if (!affordable(sim, verb, tool)) return false;
  if (c.otchlan > 0 && !sim.spendOtchlan(c.otchlan)) return false;
  sim.krew -= c.krew; sim.wiara -= c.wiara;
  return true;
}

/**
 * Kafle, które kształtowanie by zmieniło, albo null, gdy nie ma tu nic do zrobienia.
 * Wspólne dla wykonania i dla planu w pauzie — szkic nie może obiecywać czegoś,
 * czego wykonanie potem nie zrobi.
 */
export function kafleKsztaltu(sim: Sim, tool: string, tx: number, ty: number, radius = MOCE.ksztaltPromien): number[] | null {
  const w = sim.world;
  if (!w.inb(tx, ty)) return null;
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
  if ((tool === 'woda' || tool === 'zar') && w.suchaStrefa(tx, ty)) return null;
  if (tool === 'zawal' && !kafle.some((i) => PASSABLE[w.tile[i]] === 1)) return null;
  if (tool === 'draz' && !kafle.some((i) => PASSABLE[w.tile[i]] !== 1 && w.tile[i] !== T.STONE)) return null;
  return kafle.length ? kafle : null;
}

/** Kształtowanie — drążysz, zawalasz, wpuszczasz wodę albo otwierasz żyłę gorąca. */
export function shape(sim: Sim, tool: string, tx: number, ty: number, radius = MOCE.ksztaltPromien): boolean {
  const w = sim.world;
  // Najpierw sprawdzamy, czy jest co robić — inaczej narzędzie brało zapłatę
  // i nie zmieniało niczego, co wyglądało jak zepsuta mechanika.
  const kafle = kafleKsztaltu(sim, tool, tx, ty, radius);
  if (!kafle) return false;
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
        if (PASSABLE[w.tile[i]] === 1) { w.water[i] = MOCE.plynPoziom; w.magma[i] = 0; }
        break;
      case 'zar':
        if (PASSABLE[w.tile[i]] !== 1 && w.tile[i] !== T.STONE) w.tile[i] = T.AIR;
        if (PASSABLE[w.tile[i]] === 1) { w.magma[i] = MOCE.plynPoziom; w.water[i] = 0; }
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
  const r = MOCE.zasiewPromien;
  const szansa = MOCE.zasiewSzansa;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx, y = ty + dy;
      if (!w.inb(x, y) || dx * dx + dy * dy > r * r) continue;
      const i = w.idx(x, y);
      const solid = PASSABLE[w.tile[i]] !== 1;
      // skorupy rdzenia, ołtarza i kuźni nie da się przemienić — ruda na skorupie była
      // furtką: potem wystarczyło ją wydrążyć i rytuał tracił sens
      const twarde = w.tile[i] === T.CORE || w.tile[i] === T.STONE || w.tile[i] === T.SHRINE || w.tile[i] === T.FORGE;
      if (tool === 'ruda' && solid && !twarde && sim.rng.chance(szansa.ruda)) w.tile[i] = T.ORE;
      if (tool === 'grzyb' && !solid && sim.rng.chance(szansa.grzyb)) w.tile[i] = T.FUNGUS;
      if (tool === 'kosci' && !solid && sim.rng.chance(szansa.kosci)) w.tile[i] = T.BONES;
      w.oznaczSlad(x, y, 1, sim.tick);
    }
  }
  sim.efekt(tx + 0.5, ty + 0.5, 'zasiew');
  for (let i = 0; i < 4; i++) sim.spark(tx + 0.5, ty + 0.5, tool === 'grzyb' ? 'spore' : 'glint');
  return true;
}

const THOUGHTS: Record<string, Thought> = {
  modl: Thought.PRAY_CORE, prorok: Thought.PROPHESY, uciekaj: Thought.FLEE_UP,
};

/** Szept — najtańszy i najprecyzyjniejszy. Tak wysyła się wiernych pod rdzeń i robi proroków. */
export function whisper(sim: Sim, tool: string, c: Creature): boolean {
  if (!pay(sim, 'szept', tool)) return false;
  c.thought = THOUGHTS[tool] ?? Thought.NONE;
  c.jt = 0;
  if (tool === 'uciekaj') c.fear = 1;
  const napis = TOOLS.szept.find((t) => t.id === tool)?.label ?? tool;
  sim.efekt(c.x, c.y, 'mysl', napis);
  // wysłany pod rdzeń musi mieć czym iść — plan drogi liczymy od razu, a nie za dziesięć sekund
  if (tool === 'modl') odswiezPlan(sim);
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
    if (d > MOCE.znakZasieg) continue;
    seen.add(c.clan);
    if (tool === 'objawienie') {
      c.devotion = Math.min(1, c.devotion + MOCE.objawienieOddanie);
      c.fear *= MOCE.objawienieStrach;
    } else {
      c.fear = 1;
      c.thought = Thought.FLEE_UP;
      c.jt = 0;
    }
  }
  // Nacja dostaje (albo traci) oddanie raz — nie raz za każdego, kto widział. Liczone od
  // widzów jedno objawienie przy gnieździe czternastu goblinów dawało od razu 100%,
  // a panika zerowała wiarę całego ludu; nie dało się z tego nic zrozumieć.
  for (const id of seen) {
    const k = sim.clans[id];
    k.devotion = tool === 'objawienie' ? Math.min(1, k.devotion + MOCE.objawienieNacja) : Math.max(0, k.devotion - MOCE.panikaNacja);
  }
  sim.efekt(tx + 0.5, ty + 0.5, 'cud');
  for (let i = 0; i < 8; i++) sim.spark(tx + 0.5, ty + 0.5, 'pray');
  const names = [...seen].map((i) => sim.clans[i].name).slice(0, 3).join(', ');
  sim.log(tool === 'objawienie'
    ? `Znak rozbłysł w skale. Widzieli go: ${names || 'nikt'}.`
    : `Skała krzyknęła. ${names || 'Nikt'} rzucili się do ucieczki.`, 'wiara');
  return true;
}

/**
 * Zmiana krwi gatunku. Wersja na telefon nie ma już rytu „Skaź”, ale stare zapisy
 * mogą nosić skazy — wczytywanie odtwarza je tą funkcją.
 */
export function applyTaintEffect(race: Race, tool: string): void {
  const d = RACES[race];
  switch (tool) {
    // każda skaza ma cenę płaconą przez pokolenia, nie tylko zysk
    case 'plodnosc': { const s = SKAZY.plodnosc; d.breedRate *= s.plodnosc; d.lifespan *= s.dlugoscZycia; d.metabolism *= s.metabolizm; break; }
    case 'zadza': { const s = SKAZY.zadza; d.strength *= s.sila; d.eatsMeat = true; d.fearGain *= s.strach; d.faithGain *= s.wiara; break; }
    case 'slepota': { const s = SKAZY.slepota; d.speed *= s.szybkosc; d.faithGain *= s.wiara; d.digPower *= s.kopanie; break; }
    case 'kamien': { const s = SKAZY.kamien; d.maxHp *= s.zdrowie; d.speed *= s.szybkosc; d.digPower *= s.kopanie; d.metabolism *= s.metabolizm; break; }
  }
}
