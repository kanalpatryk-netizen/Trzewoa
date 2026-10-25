import type { Sim } from './sim';
import { Race } from './races';
import { makeCreature } from './creatures';
import { T } from './tiles';
import { klanLudu, nadajRole, podloga, rolaPostaci } from './lud';
import { nieWykopane } from './pielgrzymka';
import { wykutyKafel } from './kruszce';
import { kto, zapisz } from './dziennik';
import { ANIOL, DAR, type DarAniola } from '../nastawy/aniol';
import { GORA as G } from '../nastawy/gora';

/**
 * DŁOŃ ANIELSKA (Alpha, etap 4). Losowe wydarzenie w każdej grze: z góry, przez skałę, sączy się złote światło,
 * w nim schodzi jasna dłoń palcami w dół i daje dar, który sama wybiera, za darmo (decyzje użytkownika):
 *  - podkop — opuszkami kruszy kolejne kafle drogi wiernych, od czoła w dół (droga idzie schodami, więc nikt
 *    nie utknie w przepaści); ruda z nich trafia do liczników jak przy kuciu;
 *  - dar ludzi — niesie w dłoni nowego robotnika i stawia go przy ołtarzu;
 *  - dar krwi — otwiera dłoń nad ołtarzem, a z niej spływa struga krwi do relikwiarza.
 * Potem wraca w światło. Fazy: swiatlo → schodzi → dar → wraca. Liczby: nastawy/aniol.ts, rysunek: render/aniol.ts.
 */
export type FazaAniola = 'brak' | 'swiatlo' | 'schodzi' | 'dar' | 'wraca';

/** Stan wydarzenia (sim.lud.aniol — trafia do zapisu). */
export interface StanAniola {
  faza: FazaAniola;
  od: number;
  losT: number;
  ciszaDo: number;
  ile: number;
  /** Co niesie i gdzie (kafle): podkop — kafel, który właśnie kruszy; ludzie — gdzie stanie robotnik; krew — nad ołtarzem. */
  dar?: DarAniola;
  x: number; y: number;
  /** Podkop: kafle drogi do wykruszenia (po kolei) i ile już wykruszyła. */
  kafle?: number[];
  wykute?: number;
  /** Dar ludzi: id postawionego robotnika. Dar krwi: ile już wlała. */
  nowy?: number;
  krewDana?: number;
  /** Ktoś ją już widział — atlas ma tablicę. */
  widziana?: boolean;
}

const DLUGOSC: Record<Exclude<FazaAniola, 'brak'>, number> = { swiatlo: ANIOL.swiatlo, schodzi: ANIOL.schodzi, dar: ANIOL.dar, wraca: ANIOL.wraca };
const NASTEPNA: Record<Exclude<FazaAniola, 'brak'>, FazaAniola> = { swiatlo: 'schodzi', schodzi: 'dar', dar: 'wraca', wraca: 'brak' };

function stan(sim: Sim): StanAniola {
  return (sim.lud.aniol ??= { faza: 'brak', od: 0, losT: ANIOL.pierwszaPo, ciszaDo: 0, ile: 0, x: 0, y: 0 });
}

/** Które dary mają teraz sens, z miejscem, gdzie dłoń zejdzie. */
function mozliweDary(sim: Sim): { dar: DarAniola; x: number; y: number; kafle?: number[] }[] {
  const w = sim.world;
  const out: { dar: DarAniola; x: number; y: number; kafle?: number[] }[] = [];
  const P = ANIOL.dary.podkop;
  const kafle = nieWykopane(sim).filter((i) => w.tile[i] !== T.CORE).slice(0, P.kafli);
  if (kafle.length >= P.najmniej) out.push({ dar: 'podkop', x: kafle[0] % w.w, y: (kafle[0] / w.w) | 0, kafle });
  const o = w.oltarz;
  let ludu = 0;
  for (const c of sim.creatures) if (!c.dead && rolaPostaci(c)) ludu++;
  if (klanLudu(sim) && ludu < ANIOL.dary.ludzie.maksLudu) {
    // obok ołtarza, po stronie z wolną podłogą
    const m = podloga(sim, o.x + (sim.rng.next() < 0.5 ? -3 : 3), o.y, 4);
    if (m) out.push({ dar: 'ludzie', x: m[0], y: m[1] });
  }
  if (sim.krew < G.krewMax * ANIOL.dary.krew.niePonad) out.push({ dar: 'krew', x: o.x, y: o.y - 2 });
  return out;
}

function zacznij(sim: Sim, s: StanAniola, m: { dar: DarAniola; x: number; y: number; kafle?: number[] }): void {
  s.faza = 'swiatlo'; s.od = sim.tick;
  s.dar = m.dar; s.x = m.x; s.y = m.y;
  s.kafle = m.kafle; s.wykute = 0; s.nowy = undefined; s.krewDana = 0;
  s.widziana = true;
  sim.gdzie(m.x + 0.5, m.y).log('Z góry, przez skałę, sączy się złote światło. Schodzi w nim jasna dłoń.', 'wiara', 'aniol');
  zapisz(sim, 'swiat', `Dłoń anielska: ${DAR[m.dar].nazwa} → (${m.x}, ${m.y})`, m.x, m.y);
}

/** Co tik symulacji (sam pilnuje rytmu). */
export function tikAniola(sim: Sim): void {
  if (!ANIOL.wlaczona || sim.ending) return;
  const s = stan(sim);
  if (s.faza === 'brak') {
    if (sim.spokojnySwiat || sim.tick < s.losT) return;
    s.losT = sim.tick + ANIOL.losujCo;
    if (sim.tick < s.ciszaDo || s.ile >= ANIOL.maxNaPartie || sim.rng.next() >= ANIOL.szansa) return;
    const dary = mozliweDary(sim);
    if (!dary.length) return;
    let r = sim.rng.next() * dary.reduce((a, d) => a + ANIOL.dary[d.dar].waga, 0);
    const m = dary.find((d) => (r -= ANIOL.dary[d.dar].waga) < 0) ?? dary[0];
    zacznij(sim, s, m);
    return;
  }
  const t = sim.tick - s.od;
  if (s.faza === 'dar') darTik(sim, s, t);
  const faza = s.faza as Exclude<FazaAniola, 'brak'>;
  if (t < DLUGOSC[faza]) return;
  if (faza === 'dar') koniecDaru(sim, s);
  s.faza = NASTEPNA[faza];
  s.od = sim.tick;
  if (s.faza === 'brak') { s.ile++; s.ciszaDo = sim.tick + ANIOL.przerwa; }
}

/** W czasie gestu: podkop kruszy kafel po kaflu, krew spływa porcjami, robotnik staje w połowie. */
function darTik(sim: Sim, s: StanAniola, t: number): void {
  const w = sim.world;
  if (s.dar === 'podkop' && s.kafle?.length) {
    // pierwsze ćwierć gestu — opuszki dotykają skały; potem kafel po kaflu do końca
    const ile = Math.min(s.kafle.length, Math.floor(Math.max(0, t - ANIOL.dar * 0.2) / (ANIOL.dar * 0.75 / s.kafle.length)));
    while ((s.wykute ?? 0) < ile) {
      const i = s.kafle[s.wykute ?? 0];
      s.wykute = (s.wykute ?? 0) + 1;
      const x = i % w.w, y = (i / w.w) | 0;
      s.x = x; s.y = y;
      const k = w.tile[i];
      if (!w.solid(x, y) || w.hardness(x, y) <= 0 || k === T.CORE) continue;
      w.set(x, y, T.AIR);
      w.kucie.delete(i);
      sim.dug++;
      wykutyKafel(sim, k, x, y);
      for (let n = 0; n < 4; n++) sim.spark(x + 0.5 + sim.rng.range(-0.4, 0.4), y + 0.5, 'dust');
    }
  } else if (s.dar === 'krew') {
    // krew spływa strugą przez cały gest (w ostatniej części już tylko kapie)
    const cel = Math.round(ANIOL.dary.krew.ile * Math.min(1, t / (ANIOL.dar * 0.85)));
    const dolej = cel - (s.krewDana ?? 0);
    if (dolej > 0) { sim.krew = Math.min(G.krewMax, sim.krew + dolej); s.krewDana = cel; }
  } else if (s.dar === 'ludzie' && s.nowy === undefined && t >= ANIOL.dar * 0.55) {
    const klan = klanLudu(sim);
    if (!klan) return;
    const c = makeCreature(Race.GOBLIN, klan.id, s.x + 0.5, s.y, sim.nextId++);
    sim.creatures.push(c);
    sim.byId.set(c.id, c);
    klan.pop++;
    klan.dead = false;
    nadajRole(sim, c, 'robotnik');
    c.hunger = 0.15;
    c.devotion = Math.max(c.devotion, 0.8);
    c.od = sim.tick;
    c.face = s.x < w.oltarz.x ? 1 : -1;
    s.nowy = c.id;
    zapisz(sim, 'narodziny', `${kto(sim, c)} — dar dłoni anielskiej`, c.x, c.y);
  }
}

function koniecDaru(sim: Sim, s: StanAniola): void {
  sim.stat.darow = (sim.stat.darow ?? 0) + 1;
  const txt = s.dar === 'podkop' ? `Dłoń anielska wykruszyła palcami ${s.wykute ?? 0} kafli drogi wiernych.`
    : s.dar === 'ludzie' ? 'Dłoń anielska postawiła przy ołtarzu nowego robotnika.'
    : `Z dłoni anielskiej spłynęło do relikwiarza ${s.krewDana ?? 0} krwi.`;
  sim.gdzie(s.x + 0.5, s.y).log(txt, 'wiara', 'aniol-dar');
}

/** Narzędzie dewelopera: dłoń anielska od razu (`dar` — który, inaczej losowy z możliwych). */
export function devAniol(sim: Sim, dar?: DarAniola): string {
  const s = stan(sim);
  if (s.faza !== 'brak') return 'Dłoń anielska już tu jest.';
  const dary = mozliweDary(sim).filter((d) => !dar || d.dar === dar);
  if (!dary.length) return dar ? `Dar „${DAR[dar].nazwa}” nie ma teraz sensu.` : 'Żaden dar nie ma teraz sensu.';
  const m = dary[Math.floor(sim.rng.next() * dary.length)];
  zacznij(sim, s, m);
  return `Dłoń anielska schodzi: ${DAR[m.dar].nazwa}.`;
}
