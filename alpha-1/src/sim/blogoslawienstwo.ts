/**
 * Modlitwa za innych (6.11, decyzja użytkownika). Pobożny, który się modli — na rozkaz „Módl się za innych”, przy
 * obozie, przy ołtarzu albo w krypcie pod pomnikiem — błogosławi swoich w promieniu: rany się goją, a każdy dostaje
 * dar swojej roli na chwilę po wyjściu z kręgu (rycerz silniejszy i szybszy, robotnik kopie szybciej, pobożny modli się
 * mocniej; każdy wolniej głodnieje). Siebie nie błogosławi — modli się za innych. Rzucający zaklęcia przy kotle się
 * nie modlą. Liczby — nastawy/loch.ts (BLOGOSLAWIENSTWO); dary liczy mnoznik (sim/lud.ts), rysunek — render/loch.ts.
 */
import type { Sim } from './sim';
import { Job, type Creature } from './creatures';
import { BLOGOSLAWIENSTWO as B } from '../nastawy/loch';
import { PIELGRZYMKA as P } from '../nastawy/rytual';
import { rolaPostaci, maxHp } from './lud';

/** Czy ten pobożny modli się teraz za innych (jego krąg błogosławi). */
export function modliSieZaInnych(sim: Sim, c: Creature): boolean {
  if (c.dead || rolaPostaci(c) !== 'pobozny') return false;
  const p = c.polecenie;
  if (p?.zaklinaj) return false;
  if (p?.zaInnych) return !!p.na;
  const w = sim.world;
  if (c.job === Job.PIELGRZYM) return Math.abs(c.x - w.coreX) < P.przedsionekX && Math.abs(c.y - w.przedsionekY) < P.przedsionekY;
  return !!c.modliPrzyObozie || c.job === Job.PRAY;
}

/** Tik błogosławieństwa: co `B.co` tików każdy z ludu w kręgu modlącego się pobożnego leczy się i dostaje dar. */
export function tikBlogoslawienstwa(sim: Sim): void {
  if (sim.tick % B.co !== 0) return;
  const zrodla = sim.creatures.filter((c) => modliSieZaInnych(sim, c));
  if (!zrodla.length) return;
  for (const o of sim.creatures) {
    if (o.dead || !rolaPostaci(o)) continue;
    let best: Creature | null = null, bd = Infinity;
    for (const s of zrodla) {
      if (s === o) continue;
      const d = Math.hypot(s.x - o.x, s.y - o.y);
      if (d <= B.promien && d < bd) { bd = d; best = s; }
    }
    if (!best) continue;
    const max = maxHp(sim, o);
    if (o.hp < max) o.hp = Math.min(max, o.hp + B.leczenie * B.co / 120);
    if (o.blogDo === undefined || sim.tick >= o.blogDo) sim.efekt(o.x, o.y - 0.8, 'mysl', 'błogosławiony');
    o.blogDo = sim.tick + B.trwa;
    o.blogOd = best.id;
    o.blogT = sim.tick;
  }
}
