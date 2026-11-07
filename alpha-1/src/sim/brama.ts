/**
 * Stalowa brama lochu (6.11, decyzja użytkownika). Do lochu z Wielkim Pomnikiem wchodzi się tylko przez nią. Krata
 * podnosi się wyłącznie wtedy, gdy przy kotle w starej komnacie (zakręt drogi wiernych) rzuca zaklęcia co najmniej
 * dwóch pobożnych: pełne otwarcie po 40 s zaklinania. Gdy przestaną, krata powoli opada. Póki nie opadła do końca,
 * da się przejść: wyprostowanym przy wysokim otwarciu, niżej tylko się przeczołgać (wolniej). Opadająca krata nikogo
 * nie miażdży — kto leży w przejściu, gdy się zamyka, zostaje wypchnięty na tę stronę, w którą szedł.
 * Liczby — nastawy/loch.ts (BRAMA); geometria — world.brama, world.kociol.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { T } from './tiles';
import { BRAMA } from '../nastawy/loch';
import { rolaPostaci } from './lud';

export interface StanBramy {
  /** 0 — zamknięta, 1 — podniesiona do końca. */
  otwarcie: number;
  /** Ilu pobożnych rzuca teraz zaklęcia przy kotle (rysunek, podpowiedzi). */
  zaklina: number;
  /** Czy przejście jest wolne (kafle przejścia to pustka) — od `BRAMA.czolgaOd`. */
  wolne: boolean;
  /** Najwyższe otwarcie w tym podniesieniu — do kroniki. */
  szczyt?: number;
  /** Porcje w koszu przy kracie (od środka lochu) — robotnicy podają je przez pręty, gdy brama jest zamknięta. */
  kosz?: number;
}

export function stanBramy(sim: Sim): StanBramy {
  if (!sim.lud.brama) sim.lud.brama = { otwarcie: 0, zaklina: 0, wolne: false };
  return sim.lud.brama;
}

/** Czy postać stoi przy kotle (tam rzuca się zaklęcia). */
export function przyKotle(sim: Sim, c: Creature): boolean {
  const k = sim.world.kociol;
  return Math.abs(c.x - (k.x + 0.5)) <= BRAMA.przyKotle && Math.abs(Math.floor(c.y) - k.y) <= 1;
}

/** Pobożni, którzy właśnie rzucają zaklęcia nad kotłem: z rozkazu „Do kotła”, doszli, stoją przy nim i nie padają z głodu. */
export function zaklinajacy(sim: Sim): Creature[] {
  const out: Creature[] = [];
  for (const c of sim.creatures) {
    if (c.dead || rolaPostaci(c) !== 'pobozny') continue;
    const p = c.polecenie;
    if (!p?.zaklinaj || !p.na || !przyKotle(sim, c)) continue;
    out.push(c);
  }
  return out;
}

/** Czy przejście bramy jest teraz otwarte na tyle, by się przeczołgać (albo wyżej). */
export function bramaOtwarta(sim: Sim): boolean {
  return stanBramy(sim).otwarcie >= BRAMA.czolgaOd;
}

/** Czy postać czołga się pod kratą: leży w przejściu, a krata wisi niżej, niż da się przejść wyprostowanym. */
export function czolgaSie(sim: Sim, c: Creature): boolean {
  const w = sim.world, b = w.brama;
  if (b.x1 < b.x0) return false;
  const tx = Math.floor(c.x), ty = Math.floor(c.y);
  if (tx < b.x0 || tx > b.x1 || ty < b.y0 || ty > b.y1) return false;
  return stanBramy(sim).otwarcie < BRAMA.idzieOd;
}

/** Kafle przejścia: pustka, gdy brama wolna, a gdy opadła — stal nie do ruszenia (leżących wypycha na bok). */
function ustawPrzejscie(sim: Sim, wolne: boolean): void {
  const w = sim.world, b = w.brama;
  if (!wolne) {
    for (const c of sim.creatures) {
      if (c.dead) continue;
      const tx = Math.floor(c.x), ty = Math.floor(c.y);
      if (tx < b.x0 || tx > b.x1 || ty < b.y0 || ty > b.y1) continue;
      // na stronę, w którą szedł (cel za bramą — do lochu; inaczej na przedproże)
      const doLochu = c.jx > b.x1 || (c.droga?.length ? (c.droga[c.droga.length - 1] % w.w) > b.x1 : false);
      c.x = doLochu ? b.x1 + 1.5 : b.x0 - 0.5;
      c.y = b.y1;
      c.droga = undefined;
      sim.efekt(c.x, c.y, 'mysl', doLochu ? 'zdążył!' : 'nie zdążył');
    }
  }
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) w.set(x, y, wolne ? T.AIR : T.STONE);
}

/** Tik bramy: zaklinanie przy kotle podnosi kratę, bez niego krata opada; przejście otwiera się i zamyka z nią. */
export function tikBramy(sim: Sim): void {
  const w = sim.world;
  if (w.brama.x1 < w.brama.x0) return;
  const b = stanBramy(sim);
  const ilu = zaklinajacy(sim).length;
  const przed = b.otwarcie;
  b.zaklina = ilu;
  if (ilu >= BRAMA.potrzeba) b.otwarcie = Math.min(1, b.otwarcie + 1 / BRAMA.otwieranie);
  else b.otwarcie = Math.max(0, b.otwarcie - 1 / BRAMA.opadanie);
  const x = w.brama.x0, y = w.brama.y1;
  if (b.otwarcie > przed) {
    if (przed === 0) sim.gdzie(w.kociol.x, w.kociol.y).log('Nad kotłem w starej komnacie pobożni rzucają zaklęcia. W dole, w murze lochu, drgnęła stalowa brama.', 'wiara', 'brama-drgnela');
    b.szczyt = Math.max(b.szczyt ?? 0, b.otwarcie);
    if (przed < BRAMA.idzieOd && b.otwarcie >= BRAMA.idzieOd) sim.gdzie(x, y).log('Brama lochu podniesiona — można przejść wyprostowanym.', 'wiara', 'brama-idzie');
    if (przed < 1 && b.otwarcie >= 1) sim.gdzie(x, y).log('Brama lochu podniesiona do końca. Gdy zaklęcia ucichną, zacznie powoli opadać.', 'wiara', 'brama-pelna');
  }
  const wolne = b.otwarcie >= BRAMA.czolgaOd;
  if (wolne !== b.wolne) {
    ustawPrzejscie(sim, wolne);
    b.wolne = wolne;
    if (wolne) sim.gdzie(x, y).log('Krata bramy uniosła się nad posadzkę — pod nią da się przeczołgać.', 'wiara', 'brama-czolga');
    else { sim.gdzie(x, y).log('Stalowa brama opadła. Loch znów jest zamknięty.', 'otchlan', 'brama-zamknieta'); b.szczyt = 0; }
  }
}

/** Kafel pod kratą od strony przedproża (tu staje robotnik, który podaje jedzenie przez pręty). */
export function podKrata(sim: Sim): { x: number; y: number } {
  const b = sim.world.brama;
  return { x: b.x0 - 1, y: b.y1 };
}

/** Kafel kosza przy kracie od strony lochu. */
export function miejsceKosza(sim: Sim): { x: number; y: number } {
  const b = sim.world.brama;
  return { x: b.x1 + 1, y: b.y1 };
}

/** Czy postać jest za zamkniętą kratą — w lochu, a brama opadła (jedzenie tylko przez pręty). */
export function zaKrata(sim: Sim, c: Creature): boolean {
  const w = sim.world;
  return w.brama.x1 >= w.brama.x0 && !stanBramy(sim).wolne && w.wLochu(c.x, c.y);
}

/** Robotnik podaje przez kratę wszystko, co niesie — porcje lądują w koszu od strony lochu. */
export function podajPrzezKrate(sim: Sim, c: Creature): void {
  const b = stanBramy(sim);
  b.kosz = (b.kosz ?? 0) + c.carry;
  c.carry = 0;
  const k = miejsceKosza(sim);
  sim.spark(k.x + 0.5, k.y + 0.5, 'spore');
  sim.efekt(c.x, c.y - 0.6, 'mysl', 'podaje jedzenie przez kratę');
}
