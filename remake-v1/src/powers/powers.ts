import { Sim } from '../sim/sim';
import { T, PASSABLE } from '../sim/tiles';
import { Race, RACES } from '../sim/races';
import { Creature, Thought, Job } from '../sim/creatures';
import { KOSZTY, MOCE, SKAZY } from '../nastawy/moce';
import { odswiezPlan } from '../sim/pielgrzymka';
import { rolaPostaci, maxHp, gniazdaWSkale } from '../sim/lud';
import { LUD } from '../nastawy/lud';

/**
 * Trzy ryty wersji na telefon: Nakarm (grzyb), Szepnij (jedna myśl w jedną głowę)
 * i Cud (objawienie). Resztę — obronę, rudę, zarazy, powodzie — przynoszą karty wydarzeń
 * (sim/wydarzenia.ts), na które odpowiadasz wyborem.
 * Wewnętrzne nazwy zostały po dawnych rytach: „zasiej” to Nakarm, „znak” to Cud.
 */
export type Verb = 'zasiej' | 'szept' | 'znak';

export interface Tool { id: string; label: string; hint: string; }

export const TOOLS: Record<Verb, Tool[]> = {
  zasiej: [
    { id: 'grzyb', label: 'grzyb', hint: 'jedzenie, które rośnie samo — przeciągnij tam, gdzie mieszkają' },
  ],
  szept: [
    { id: 'modl', label: 'módl się', hint: 'idzie pod twój rdzeń i modli się tam' },
    { id: 'okalecz', label: 'okalecz się', hint: 'pobożny upuszcza krwi: dostajesz krew, a on słabnie na zawsze' },
    { id: 'ofiaruj', label: 'ofiaruj', hint: 'oddaje ci życie — dużo krwi, jedna osoba mniej' },
    { id: 'przerwij', label: 'przerwij modlitwę', hint: 'wraca do swoich i przez minutę nie idzie się modlić' },
    { id: 'przemysl', label: 'przemyśl i kop', hint: 'robotnik klęka, prosi o znak i kopie ku śpiącym rycerzom — znak jest niedokładny: jeden trafia raz na trzy, trzech na pewno' },
  ],
  znak: [
    { id: 'objawienie', label: 'objawienie', hint: 'wszyscy dookoła widzą cud; ich oddanie rośnie' },
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
 * Zasiew. Gracz sieje tylko grzyb (ryt Nakarm); ruda i kości przychodzą z kart wydarzeń,
 * które płacą same — wtedy `zaplac` jest fałszem.
 */
export function seed(sim: Sim, tool: string, tx: number, ty: number, zaplac = true): boolean {
  const w = sim.world;
  if (!w.inb(tx, ty)) return false;
  if (zaplac && !pay(sim, 'zasiej', tool)) return false;
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

/** Remake v1: czy postać się modli albo idzie się modlić (wtedy można jej to przerwać). */
export function modliSie(c: Creature): boolean {
  return c.job === Job.PRAY || c.job === Job.PIELGRZYM || c.thought === Thought.PRAY_CORE || !!c.wyprawa || !!c.modliPrzyObozie;
}

/** Etap 2: „Przemyśl i kop” — tylko robotnik, który jeszcze nie kopie ku znakowi, i tylko gdy w skale śpią rycerze. */
export function moznaPrzemyslec(sim: Sim, c: Creature): boolean {
  return rolaPostaci(c) === 'robotnik' && !c.tor && c.przemysl === undefined && gniazdaWSkale(sim).length > 0;
}

/** Szept — najtańszy i najprecyzyjniejszy. Tak wysyła się wiernych pod rdzeń i robi proroków. */
export function whisper(sim: Sim, tool: string, c: Creature): boolean {
  // Remake v1: okaleczyć może się tylko pobożny i tylko raz; ofiarą może być każdy z ludu
  if (tool === 'okalecz' && (rolaPostaci(c) !== 'pobozny' || c.okaleczony)) return false;
  if (tool === 'ofiaruj' && !rolaPostaci(c)) return false;
  if (tool === 'przerwij' && !modliSie(c)) return false;
  if (tool === 'przemysl' && !moznaPrzemyslec(sim, c)) return false;
  if (!pay(sim, 'szept', tool)) return false;
  if (tool === 'okalecz') {
    c.okaleczony = true;
    sim.krew += LUD.okaleczenieKrew;
    c.hp = Math.min(c.hp, maxHp(sim, c));
    for (let i = 0; i < 6; i++) sim.spark(c.x, c.y - 0.5, 'hit');
    sim.efekt(c.x, c.y, 'mysl', `+${LUD.okaleczenieKrew} krwi`);
    return true;
  }
  if (tool === 'przerwij') {
    const klan = sim.clans[c.clan];
    c.thought = Thought.NONE;
    c.job = Job.WANDER; c.droga = undefined;
    c.jx = klan?.hx ?? Math.floor(c.x); c.jy = klan?.hy ?? Math.floor(c.y);
    c.jt = 0;
    c.bezModlitwyDo = sim.tick + LUD.przerwaModlitwy;
    c.wyprawa = false;
    sim.efekt(c.x, c.y, 'mysl', 'wraca');
    return true;
  }
  if (tool === 'przemysl') {
    c.przemysl = sim.tick + LUD.przemyslModlitwa;
    c.tor = undefined; c.droga = undefined; c.kopieDroge = false;
    c.jt = 0;
    sim.efekt(c.x, c.y, 'mysl', 'przemyśl i kop');
    sim.spark(c.x, c.y - 0.5, 'pray');
    return true;
  }
  if (tool === 'ofiaruj') {
    sim.krew += LUD.ofiaraKrew;
    sim.efekt(c.x, c.y, 'mysl', `+${LUD.ofiaraKrew} krwi`);
    sim.kill(c, 'w ofierze dla ciebie', 'ofiara');
    return true;
  }
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
