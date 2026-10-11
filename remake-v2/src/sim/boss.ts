/**
 * Bossowie ostatniej fali Strażników Snu (Remake v1, etap 3). Nastawy: src/nastawy/boss.ts.
 *
 * Każdy boss to obiekt z trzema hakami:
 *  - `pojaw(sim)` — wychodzi na świat (zwykle przez `nowyStraznik` + `boss = id`),
 *  - `tik(sim, c)` — jego krok życia (ruch, ciosy, zdolności),
 *  - `przyjmij(sim, c, od, rana)` — ile z zadanej rany naprawdę przyjmuje.
 * Żeby podmienić bossa, wystarczy dopisać obiekt do BOSSOWIE i przestawić AKTYWNY_BOSS.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { T } from './tiles';
import { AKTYWNY_BOSS, SNIACY_KAMIEN as K, type IdBossa } from '../nastawy/boss';
import { STRAZNICY as S } from '../nastawy/straznicy';
import { nowyStraznik, ruchStraznika, celStraznika, ciosStraznika, trybWiernych } from './straznicy';
import { rolaPostaci } from './lud';

export interface Boss {
  id: IdBossa;
  nazwa: string;
  /** opis na karcie i w atlasie */
  opis: string;
  /** wielkość rysunku (× zwykła postać) */
  rozmiar: number;
  pojaw(sim: Sim): Creature | null;
  tik(sim: Sim, c: Creature): void;
  przyjmij(sim: Sim, c: Creature, od: Creature, rana: number): number;
  /** ostatnia deska: jak razi go pobożny z księgą (zasięg, rytm, rana, kiedy się cofa) */
  ksiega: { zasieg: number; co: number; rana: number; cofa: number; widzi: number };
}

/** Ilu wiernych modli się teraz pod rdzeniem (liczy rytuał). */
function modlacych(sim: Sim): number { return sim.rytual.wierni ?? 0; }

const sniacyKamien: Boss = {
  id: 'sniacyKamien',
  nazwa: K.nazwa,
  opis: 'Rani go tylko rycerz. Zasypuje drogę wiernych. Słabnie, gdy pod rdzeniem modli się trzech pobożnych — bez modlitwy się zrasta.',
  rozmiar: K.rozmiar,
  pojaw(sim) {
    const w = sim.world;
    // ze ściany przedsionka — z boku, na wysokości modlących się
    const strona = sim.rng.chance(0.5) ? -1 : 1;
    const c = nowyStraznik(sim, w.coreX + strona * (S.pojawOd + 2), w.przedsionekY - 1, K.hp);
    if (!c) return null;
    c.boss = 'sniacyKamien';
    c.zamiar = sniacyKamien.opis;
    c.zasypT = sim.tick;
    sim.efekt(c.x, c.y, 'cud');
    return c;
  },
  tik(sim, c) {
    // bez modlitwy pod rdzeniem kamień się zrasta
    if (modlacych(sim) < K.modlitwaWiernych) c.hp = Math.min(c.hpMax ?? K.hp, c.hp + K.zrastanie);
    if (sim.tick - (c.zasypT ?? 0) >= K.zasypCo) { c.zasypT = sim.tick; zasypDroge(sim, c); }
    let cel = sim.creatureById(sim.target.get(c.id) ?? -1);
    if (!cel || cel.dead || sim.tick % 90 === 0) {
      cel = celStraznika(sim, c, S.limitOdRdzenia) ?? undefined;
      if (cel) sim.target.set(c.id, cel.id); else sim.target.delete(c.id);
    }
    const w = sim.world;
    if (!cel) { ruchStraznika(sim, c, w.coreX + 0.5, w.przedsionekY - 2, K.szybkosc, S.limitOdRdzenia); return; }
    if (Math.hypot(cel.x - c.x, cel.y - c.y) > K.zasieg) { ruchStraznika(sim, c, cel.x, cel.y - 0.5, K.szybkosc, S.limitOdRdzenia); return; }
    c.face = cel.x > c.x ? 1 : -1;
    if (sim.tick - (c.ciosT ?? -1e9) < K.ciosCo) return;
    c.ciosT = sim.tick;
    ciosStraznika(sim, c, cel, K.sila);
  },
  ksiega: { zasieg: K.ksiegaZasieg, co: K.ksiegaCo, rana: K.ksiegaRana, cofa: K.ksiegaCofa, widzi: K.ksiegaWidzi },
  przyjmij(sim, _c, od, rana) {
    // (ostatnia deska: bez rycerzy i bez gniazd ranią go też pobożni — księgą)
    if (K.tylkoRycerze && rolaPostaci(od) !== 'rycerz' && !(rolaPostaci(od) === 'pobozny' && trybWiernych(sim))) return 0;
    return modlacych(sim) >= K.modlitwaWiernych ? rana * K.modlitwaRany : rana;
  },
};

/** Uderzenie w ziemię: kawałek drogi wiernych znów jest skałą (bez zamurowania kogokolwiek). */
function zasypDroge(sim: Sim, c: Creature): void {
  const plan = sim.planDrogi;
  const w = sim.world;
  if (!plan || sim.rytual.otwarta) return;
  const zajete = new Set<number>();
  for (const o of sim.creatures) if (!o.dead) zajete.add(w.idx(Math.floor(o.x), Math.floor(o.y)));
  const kandydaci = plan.sciezka.filter((i) => {
    const x = i % w.w, y = (i / w.w) | 0;
    return w.passable(x, y) && !zajete.has(i) && Math.hypot(x - w.coreX, y - w.przedsionekY) <= K.zasypZasieg
      && Math.hypot(x - w.coreX, y - w.przedsionekY) > 8;     // nie w samym przedsionku
  });
  if (!kandydaci.length) return;
  const start = sim.rng.int(kandydaci.length);
  let ile = 0;
  for (let k = 0; k < K.zasypKafli && start + k < kandydaci.length; k++) {
    const i = kandydaci[start + k];
    w.tile[i] = T.ROCK;
    ile++;
  }
  if (!ile) return;
  const i = kandydaci[start];
  sim.efekt(c.x, c.y, 'cud');
  sim.gdzie(i % w.w, (i / w.w) | 0).log(`${K.nazwa} uderza w ziemię — zasypał kawałek drogi wiernych. Robotnicy muszą ją odkopać.`, 'swiat', 'boss-zasyp');
}

export const BOSSOWIE: Record<IdBossa, Boss> = { sniacyKamien };

/** Boss ostatniej fali. */
export function aktywnyBoss(): Boss { return BOSSOWIE[AKTYWNY_BOSS]; }
