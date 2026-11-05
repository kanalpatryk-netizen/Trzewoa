/**
 * KRUSZCE (Alpha, etap 3b) — żelazo i złoto bez ekwipunku: kafel rudy wykuty przez lud od razu podbija
 * licznik (sim.zelazo, sim.zloto), kronika to odnotowuje („+3 żelaza”), a na krótką listę sim.urobek
 * trafia znak dla rysunku — skąd ma wylecieć okruch do licznika (render/kruszce.ts).
 * W Alphie T.ORE to żelazo (kępy w płytkiej warstwie), a T.ZLOTO — złoto pod dnami jaskiń środkowej.
 * Liczby w src/nastawy/kruszce.ts.
 */
import type { Sim } from './sim';
import { T } from './tiles';
import { KRUSZCE as K } from '../nastawy/kruszce';

export type RodzajKruszcu = 'zelazo' | 'zloto';

/** Świeżo wykuty kruszec — rysunek tylko to czyta; nie trafia do zapisu. */
export interface Urobek { x: number; y: number; rodzaj: RodzajKruszcu; ile: number; tik: number }

/** Jaki kruszec kryje kafel (albo null, gdy to zwykła skała). */
export function kruszecKafla(t: number): RodzajKruszcu | null {
  return t === T.ORE ? 'zelazo' : t === T.ZLOTO ? 'zloto' : null;
}

/** Lud wykuł kafel (x, y), który był typu `t` — jeśli to ruda, licznik rośnie od razu. */
export function wykutyKafel(sim: Sim, t: number, x: number, y: number): void {
  const rodzaj = kruszecKafla(t);
  if (!rodzaj) return;
  const ile = rodzaj === 'zelazo' ? K.zelazoZaKafel : K.zlotoZaKafel;
  if (rodzaj === 'zelazo') sim.zelazo += ile; else sim.zloto += ile;
  const u = sim.urobek;
  while (u.length && (u.length >= K.urobekMaks || sim.tick - u[0].tik > K.urobekTikow)) u.shift();
  u.push({ x, y, rodzaj, ile, tik: sim.tick });
  // kronika sumuje urobek z krótkiego okna w jeden wpis
  const nazwa = rodzaj === 'zelazo' ? 'żelaza' : 'złota';
  sim.gdzie(x + 0.5, y + 0.5).log(`Robotnicy wykuli kruszec: +${ile} ${nazwa}.`, 'swiat',
    'urobek-' + rodzaj, (n) => `Robotnicy wykuli kruszec: +${n * ile} ${nazwa}.`);
}
