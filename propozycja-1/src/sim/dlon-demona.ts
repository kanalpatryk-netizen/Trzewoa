import type { Sim } from './sim';
import type { Creature } from './creatures';
import { DLON } from '../nastawy/dlon';
import { walczacy, maxHp, rolaPostaci, oznaczCios } from './lud';
import { kto, zapisz } from './dziennik';
import { T } from './tiles';

/**
 * DŁOŃ Z OTCHŁANI POMAGA DEMONOWI (Alpha, etap 5b). W walce z demonem z Wielkiego Pomnika (sim/pomnik.ts, faza „walka”)
 * dłoń co jakiś czas robi jedną z trzech rzeczy — każdą inaczej, z własnymi klatkami (render/dlon-demona.ts, arkusze
 * z modelu 3D: scripts/dlon/renderuj.mjs rzut | tarcza | zawal):
 *  - RZUT: spod podłogi pod rycerzem wyrasta dłoń, obejmuje go palcami jak naczynie, unosi i ciska w górę i w bok, z dala
 *    od demona. Rycerz koziołkuje, uderza o strop, spada — ranny i ogłuszony (leży, nad głową krążą gwiazdki);
 *  - TARCZA: między rycerzem a demonem wyrasta otwarta dłoń, wnętrzem do rycerza, palce rozczapierzone jak mur. Póki
 *    stoi, demona nic nie rani — ciosy odbijają się od dłoni i odrzucają rycerza;
 *  - ZAWAŁ: między nimi dłoń przebija się przez strop, szpony drą skałę, płaskie uderzenie — strop się zawala: ściana
 *    gruzu odcina demona. Póki stoi, demon nie przechodzi na drugą stronę i zrasta się szybciej; gruz kruszy się sam
 *    po chwili (albo rozkują go robotnicy).
 * Liczby: nastawy/dlon.ts (DLON.demon).
 */
export type AkcjaDloni = 'rzut' | 'tarcza' | 'zawal';
export type FazaAkcji = 'wstaje' | 'chwyta' | 'unosi' | 'rzuca' | 'stoi' | 'drze' | 'wali' | 'cofa';

/** Ściana gruzu po zawale (zostaje po odejściu dłoni). */
export interface ScianaGruzu {
  kafle: number[];
  x: number; strop: number; dno: number;
  od: number; do: number;
  /** Od kiedy się kruszy (albo undefined). */
  kruszy?: number;
}

/** Stan (sim.lud.dlonDemona — trafia do zapisu). */
export interface StanDloniDemona {
  akcja: AkcjaDloni | null;
  faza: FazaAkcji;
  od: number;
  nastT: number;
  ostatnia?: AkcjaDloni;
  /** Kogo (rycerz) i gdzie: rzut — pod nim; tarcza — przed demonem; zawał — kolumna gruzu. Strona: gdzie stoi rycerz. */
  cel?: number;
  x: number; y: number; bok: number;
  /** Zawał: strop i dno kolumny. */
  strop?: number; dno?: number;
  sciana?: ScianaGruzu;
  /** Tarcza: ostatnie odbite uderzenie (iskry na dłoni). */
  odbicieT?: number;
  ile: Record<AkcjaDloni, number>;
  widziana?: boolean;
}

const D = DLON.demon;
const DLUGOSC: Record<AkcjaDloni, [FazaAkcji, number][]> = {
  rzut: [['wstaje', D.rzut.wstaje], ['chwyta', D.rzut.chwyta], ['unosi', D.rzut.unosi], ['rzuca', D.rzut.rzuca], ['cofa', D.rzut.cofa]],
  tarcza: [['wstaje', D.tarcza.wstaje], ['stoi', D.tarcza.stoi], ['cofa', D.tarcza.cofa]],
  zawal: [['wstaje', D.zawal.wstaje], ['drze', D.zawal.drze], ['wali', D.zawal.wali], ['cofa', D.zawal.cofa]],
};

export function stanDloniDemona(sim: Sim): StanDloniDemona {
  return (sim.lud.dlonDemona ??= { akcja: null, faza: 'wstaje', od: 0, nastT: 0, x: 0, y: 0, bok: 1, ile: { rzut: 0, tarcza: 0, zawal: 0 } });
}

function demon(sim: Sim): Creature | null {
  return sim.creatures.find((c) => !c.dead && c.boss) ?? null;
}

/** Rycerz (albo inny walczący) najbliżej demona — na niego dłoń poluje. */
function rycerzPrzy(sim: Sim, dm: Creature): Creature | null {
  let best: Creature | null = null, bd = Infinity;
  for (const c of sim.creatures) {
    if (c.dead || !walczacy(c) || c.lot || c.wDloni) continue;
    const d = Math.hypot(c.x - dm.x, c.y - dm.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

/** Pierwszy lity kafel w dół od (x, y) — dno — i w górę od dna — strop. */
function kolumna(sim: Sim, x: number, y: number, maks: number): { dno: number; strop: number } | null {
  const w = sim.world;
  let dno = Math.floor(y);
  while (dno < w.h - 1 && !w.solid(x, dno) && dno - y < maks) dno++;
  if (!w.solid(x, dno)) return null;
  let strop = dno - 1;
  while (strop > 0 && !w.solid(x, strop) && dno - strop <= maks + 1) strop--;
  if (!w.solid(x, strop)) return null;
  return { dno, strop };
}

/** Tarcza stoi — demona nic nie rani (straznicy.ts: ranStraznika). */
export function tarczaChroni(sim: Sim): boolean {
  const s = sim.lud.dlonDemona;
  if (!s || s.akcja !== 'tarcza') return false;
  return s.faza === 'stoi' || (s.faza === 'wstaje' && sim.tick - s.od > D.tarcza.wstaje * 0.6);
}

/** Cios w demona odbił się od tarczy: iskry na dłoni i odrzut atakującego. */
export function odbijOdTarczy(sim: Sim, od: Creature): void {
  const s = sim.lud.dlonDemona!;
  s.odbicieT = sim.tick;
  const kier = Math.sign(od.x - s.x) || s.bok;
  // (nie w skałę: rycerz odrzucony w ścianę albo w zasypaną drogę zostawał w litej skale i ginął przysypany)
  const nx = od.x + kier * D.tarcza.odrzut;
  if (sim.world.passable(Math.floor(nx), Math.floor(od.y))) od.x = nx;
  for (let k = 0; k < 4; k++) sim.spark(s.x + sim.rng.range(-0.4, 0.4), od.y - 0.8 + sim.rng.range(-0.5, 0.5), 'hit');
}

/** Dłoń coś szykuje albo zasłania demona — demon czeka (nie idzie i nie bije): za tarczą i pod zawalanym stropem. */
export function demonCzeka(sim: Sim): boolean {
  const s = sim.lud.dlonDemona;
  if (!s?.akcja || s.faza === 'cofa') return false;
  return s.akcja === 'tarcza' || s.akcja === 'zawal';
}

/** Ściana gruzu stoi: demon nie przechodzi na drugą stronę (boss.ts) — zwraca x środka ściany albo null. */
export function scianaGruzu(sim: Sim): ScianaGruzu | null {
  const sc = sim.lud.dlonDemona?.sciana;
  return sc && sim.tick < sc.do + D.zawal.kruszy ? sc : null;
}

/** Co tik symulacji (z tikLudu). */
export function tikDloniDemona(sim: Sim): void {
  if (!D.wlaczona || !DLON.wlaczona) return;
  const p = sim.lud.pomnik;
  const s = sim.lud.dlonDemona;
  // ściana gruzu kruszy się sama po czasie (to, co już rozkuli robotnicy, zostaje puste)
  if (s?.sciana) {
    const sc = s.sciana;
    if (sim.tick >= sc.do && sc.kruszy === undefined) {
      sc.kruszy = sim.tick;
      sim.gdzie(sc.x + 1, sc.dno - 1).log('Gruz po zawale kruszy się i osypuje — przejście znów wolne.', 'swiat', 'zawal-kruszy');
    }
    if (sc.kruszy !== undefined && sim.tick - sc.kruszy >= D.zawal.kruszy) {
      for (const i of sc.kafle) if (sim.world.tile[i] === T.ROCK) sim.world.tile[i] = T.AIR;
      s.sciana = undefined;
    }
  }
  if (!p || (p.faza !== 'walka' && p.faza !== 'kona')) return;
  const st = stanDloniDemona(sim);
  const dm = demon(sim);
  // demon kona (albo go już nie ma) — dłoń puszcza i zapada się
  if (st.akcja && (p.faza === 'kona' || !dm) && st.faza !== 'cofa') { puscRycerza(sim, st, false); st.faza = 'cofa'; st.od = sim.tick; }
  if (st.akcja) { krokAkcji(sim, st, dm); return; }
  if (p.faza !== 'walka' || !dm) return;
  if (st.nastT === 0) st.nastT = sim.tick + D.pierwszaPo;
  // druga dłoń (po ludzi albo po linę) jeszcze jest — ta czeka
  if (sim.tick < st.nastT || (sim.lud.dlon && sim.lud.dlon.faza !== 'brak')) return;
  const r = rycerzPrzy(sim, dm);
  if (!r) { st.nastT = sim.tick + 120; return; }
  wybierz(sim, st, dm, r);
}

/** Wybiera akcję, która ma teraz sens (losowo według wag, nie tę samą co przed chwilą, jeśli jest inna). */
function wybierz(sim: Sim, st: StanDloniDemona, dm: Creature, r: Creature): void {
  const odl = Math.hypot(r.x - dm.x, r.y - dm.y);
  const mozliwe: { a: AkcjaDloni; waga: number; ustaw: () => boolean }[] = [];
  const stoiNaZiemi = sim.world.solid(Math.floor(r.x), Math.floor(r.y) + 1);
  if (odl <= D.rzut.zasieg && stoiNaZiemi && !st.sciana) mozliwe.push({ a: 'rzut', waga: D.wagi.rzut, ustaw: () => ustawRzut(sim, st, dm, r) });
  if (odl <= D.tarcza.zasieg && !st.sciana) mozliwe.push({ a: 'tarcza', waga: D.wagi.tarcza, ustaw: () => ustawTarcze(sim, st, dm, r) });
  const dx = Math.abs(r.x - dm.x);
  if (dx >= D.zawal.minOdstep && dx <= D.zawal.maxOdstep && !st.sciana) mozliwe.push({ a: 'zawal', waga: D.wagi.zawal, ustaw: () => ustawZawal(sim, st, dm, r) });
  const inne = mozliwe.filter((m) => m.a !== st.ostatnia);
  const lista = inne.length ? inne : mozliwe;
  while (lista.length) {
    let los = sim.rng.next() * lista.reduce((a, m) => a + m.waga, 0);
    const i = Math.max(0, lista.findIndex((m) => (los -= m.waga) < 0));
    const m = lista[i];
    if (m.ustaw()) { zacznij(sim, st, m.a, r); return; }
    lista.splice(i, 1);
  }
  st.nastT = sim.tick + 120;
}

function ustawRzut(sim: Sim, st: StanDloniDemona, dm: Creature, r: Creature): boolean {
  st.cel = r.id;
  st.x = r.x; st.y = Math.floor(r.y) + 1;          // podłoga pod rycerzem
  st.bok = Math.sign(r.x - dm.x) || 1;
  return true;
}

function ustawTarcze(sim: Sim, st: StanDloniDemona, dm: Creature, r: Creature): boolean {
  st.bok = Math.sign(r.x - dm.x) || 1;
  const x = dm.x + st.bok * D.tarcza.przedDemonem;
  const k = kolumna(sim, Math.floor(x), Math.max(dm.y, r.y) - 1, 8);
  if (!k) return false;
  st.x = x; st.y = k.dno;
  st.cel = r.id;
  return true;
}

function ustawZawal(sim: Sim, st: StanDloniDemona, dm: Creature, r: Creature): boolean {
  const w = sim.world;
  st.bok = Math.sign(r.x - dm.x) || 1;
  // kolumna w połowie drogi (bliżej rycerza nie — żeby go nie przysypać)
  for (const przes of [0, 1, -1, 2, -2]) {
    // bliżej demona niż rycerza — demon za ścianą, rycerz przed nią
    const x = Math.floor(dm.x + st.bok * Math.max(3, Math.abs(r.x - dm.x) * 0.45)) + przes;
    const k = kolumna(sim, x, r.y, D.zawal.maxWys);
    if (!k || k.dno - k.strop - 1 < 2 || k.dno - k.strop - 1 > D.zawal.maxWys) continue;
    // nikt nie może stać w kolumnie gruzu
    const zajete = sim.creatures.some((c) => !c.dead && !c.straznik && c.x >= x - 0.6 && c.x <= x + D.zawal.szer + 0.6 && c.y > k.strop - 1 && c.y < k.dno + 1);
    if (zajete) continue;
    let wolnych = 0;
    for (let xx = x; xx < x + D.zawal.szer; xx++) for (let yy = k.strop + 1; yy < k.dno; yy++) if (w.inb(xx, yy) && !w.solid(xx, yy)) wolnych++;
    if (wolnych < 3) continue;
    st.x = x; st.strop = k.strop; st.dno = k.dno; st.y = k.strop;
    return true;
  }
  return false;
}

function zacznij(sim: Sim, st: StanDloniDemona, a: AkcjaDloni, r: Creature): void {
  st.akcja = a; st.faza = DLUGOSC[a][0][0]; st.od = sim.tick;
  st.widziana = true;
  st.ile[a]++;
  const kogo = kto(sim, r).split(' (')[0];
  if (a === 'rzut') {
    r.wDloni = true; r.droga = undefined; r.vy = 0;
    r.zamiar = 'spod podłogi wyrasta dłoń z otchłani i go obejmuje'; r.zamiarDo = sim.tick + 400;
    sim.gdzie(st.x, st.y).log(`Spod podłogi krypty wyrasta dłoń z otchłani — obejmuje palcami: ${kogo}.`, 'otchlan', 'dlon-rzut');
  } else if (a === 'tarcza') {
    sim.gdzie(st.x, st.y).log('Przed demonem wyrasta z podłogi dłoń z otchłani — otwarta, wnętrzem do rycerza. Ciosy się od niej odbijają.', 'otchlan', 'dlon-tarcza');
  } else {
    // rycerz staje — przed nim pęka strop i sypie się gruz
    r.przystanDo = sim.tick + D.zawal.wstaje + D.zawal.drze + D.zawal.wali;
    r.zamiar = 'staje — przed nim pęka strop, sypie się gruz'; r.zamiarDo = r.przystanDo;
    sim.gdzie(st.x + 1, st.y).log('Ze stropu krypty wyłaniają się szpony dłoni z otchłani — drą skałę nad przejściem.', 'otchlan', 'dlon-zawal');
  }
  zapisz(sim, 'swiat', `Dłoń z otchłani pomaga demonowi: ${a} → ${kogo}`, Math.floor(st.x), Math.floor(st.y));
}

/** Rycerz w dłoni: unoszony i kołysany razem z nią (rysunek — render/dlon-demona.ts — liczy chwyt tak samo). */
function trzymanyRycerz(sim: Sim, st: StanDloniDemona, t: number): void {
  const r = sim.creatureById(st.cel ?? -1);
  if (!r || r.dead || !r.wDloni) return;
  const R = D.rzut;
  // obejmując, od razu go podnosi (cała dłoń wychodzi nad podłogę), potem zamach w tył i wyrzut
  let unies = 0, wtyl = 0;
  if (st.faza === 'chwyta') { const k = Math.min(1, t / R.chwyta); unies = 1.2 * k * k; }
  else if (st.faza === 'unosi') { const k = Math.min(1, t / R.unosi); unies = 1.2 + 0.8 * k; wtyl = -0.5 * Math.sin(k * Math.PI * 0.5); }
  else if (st.faza === 'rzuca') { const k = Math.min(1, t / R.rzuca); unies = 2.0 + 0.6 * k; wtyl = -0.5 + 1.0 * k; }
  r.x = st.x + st.bok * wtyl;
  r.y = st.y - 1 - unies;
  r.vy = 0; r.droga = undefined;
  r.face = -st.bok;
}

/** Puszcza rycerza: `rzut` — ciska go w górę i w bok, inaczej — opuszcza na ziemię. */
function puscRycerza(sim: Sim, st: StanDloniDemona, rzut: boolean): void {
  const r = sim.creatureById(st.cel ?? -1);
  if (!r || r.dead || !r.wDloni) return;
  r.wDloni = false;
  const R = D.rzut;
  r.lot = rzut
    ? { vx: st.bok * R.wBok, vy: -Math.sqrt(2 * R.grawitacja * R.wysokosc), od: sim.tick }
    : { vx: 0, vy: 0, od: sim.tick };
  if (rzut) {
    sim.gdzie(r.x, r.y).log(`Dłoń ciska ${kto(sim, r).split(' (')[0].toLowerCase()} w górę — koziołkuje pod sam strop.`, 'krew', 'dlon-rzut-lot');
    sim.stat.rzutow = (sim.stat.rzutow ?? 0) + 1;
  }
}

function krokAkcji(sim: Sim, st: StanDloniDemona, dm: Creature | null): void {
  const t = sim.tick - st.od;
  const fazy = DLUGOSC[st.akcja!];
  const i = fazy.findIndex((f) => f[0] === st.faza);
  if (st.akcja === 'rzut' && (st.faza === 'chwyta' || st.faza === 'unosi' || st.faza === 'rzuca')) trzymanyRycerz(sim, st, t);
  if (st.akcja === 'rzut' && st.faza === 'wstaje') {
    // trzymany stoi w miejscu (dłoń wyrasta wokół niego)
    const r = sim.creatureById(st.cel ?? -1);
    if (r && r.wDloni) { r.x = st.x; r.vy = 0; r.droga = undefined; }
  }
  // tarcza idzie za demonem (stoi zawsze przed nim, od strony rycerza)
  if (st.akcja === 'tarcza' && dm && st.faza !== 'cofa') st.x += (dm.x + st.bok * D.tarcza.przedDemonem - st.x) * 0.05;
  if (i < 0 || t < fazy[i][1]) return;
  // koniec fazy
  if (st.akcja === 'rzut' && st.faza === 'rzuca') puscRycerza(sim, st, true);
  if (st.akcja === 'zawal' && st.faza === 'drze') zawal(sim, st);
  if (i + 1 < fazy.length) { st.faza = fazy[i + 1][0]; st.od = sim.tick; return; }
  // koniec akcji
  puscRycerza(sim, st, false);
  st.ostatnia = st.akcja!;
  st.akcja = null; st.cel = undefined;
  st.nastT = sim.tick + D.przerwa;
}

/** Płaskie uderzenie w strop: kolumna zawala się w ścianę gruzu (bez zasypywania kogokolwiek). */
function zawal(sim: Sim, st: StanDloniDemona): void {
  const w = sim.world;
  if (st.strop === undefined || st.dno === undefined) return;
  const kafle: number[] = [];
  for (let xx = st.x; xx < st.x + D.zawal.szer; xx++) {
    for (let yy = st.strop + 1; yy < st.dno; yy++) {
      if (!w.inb(xx, yy) || w.solid(xx, yy)) continue;
      if (sim.creatures.some((c) => !c.dead && !c.straznik && Math.floor(c.x) === xx && Math.abs(c.y - yy) < 1.2)) continue;
      const i = w.idx(xx, yy);
      w.tile[i] = T.ROCK;
      kafle.push(i);
    }
  }
  for (let k = 0; k < 12; k++) sim.spark(st.x + sim.rng.range(0, D.zawal.szer), st.strop + 1 + sim.rng.range(0, st.dno - st.strop - 1), 'dust');
  st.sciana = { kafle, x: st.x, strop: st.strop, dno: st.dno, od: sim.tick, do: sim.tick + D.zawal.trwa };
  sim.stat.zawalow = (sim.stat.zawalow ?? 0) + 1;
  sim.gdzie(st.x + 1, st.dno - 1).log('Strop krypty zawalił się między rycerzem a demonem. Demon jest odcięty — i zrasta się szybciej. Robotnicy mogą rozkuć gruz.', 'krew', 'zawal');
  zapisz(sim, 'swiat', `zawał: ściana gruzu ${kafle.length} kafli`, st.x, st.dno - 1);
}

/**
 * Ruch rycerza ciśniętego przez dłoń (wołane z creatures.ts zamiast zwykłego ruchu): leci łukiem, koziołkuje, odbija się
 * od stropu i ścian, a gdy spadnie na ziemię — jest ranny i ogłuszony. Zwraca true, póki tym zawiaduje.
 */
export function krokLotu(sim: Sim, c: Creature): boolean {
  if (c.wDloni) { c.vy = 0; return true; }
  const L = c.lot;
  if (!L) return false;
  const w = sim.world;
  const R = D.rzut;
  L.vy = Math.min(0.6, L.vy + R.grawitacja);
  let nx = c.x + L.vx, ny = c.y + L.vy;
  const lity = (x: number, y: number) => !w.inb(Math.floor(x), Math.floor(y)) || w.solid(Math.floor(x), Math.floor(y));
  // ściana z boku — odbija się i traci rozpęd
  if (lity(nx, c.y) || lity(nx, c.y - 1)) { L.vx = -L.vx * 0.3; nx = c.x; }
  // strop — uderza głową i spada
  if (L.vy < 0 && lity(nx, ny - 1.4)) {
    L.vy = Math.abs(L.vy) * 0.15; ny = c.y; L.stropT = sim.tick;
    for (let k = 0; k < 6; k++) sim.spark(nx + sim.rng.range(-0.6, 0.6), ny - 1.4, 'dust');
    c.hp -= maxHp(sim, c) * R.rana * 0.3;
    oznaczCios(sim, c, true);
  }
  // ziemia — ląduje, ranny i ogłuszony
  if (L.vy > 0 && lity(nx, Math.floor(ny) + 1)) {
    c.x = nx; c.y = Math.floor(ny);
    while (lity(c.x, c.y) && c.y > 1) c.y--;
    c.lot = undefined;
    c.vy = 0;
    if (L.vy > 0.05 || L.vx !== 0) {
      c.hp -= maxHp(sim, c) * R.rana;
      oznaczCios(sim, c, true);
      c.ogluszonyDo = sim.tick + R.ogluszenie;
      c.zamiar = 'leży ogłuszony po upadku'; c.zamiarDo = c.ogluszonyDo;
      for (let k = 0; k < 8; k++) sim.spark(c.x + sim.rng.range(-0.8, 0.8), c.y + 0.9, 'dust');
      if (rolaPostaci(c)) sim.gdzie(c.x, c.y).log(`${kto(sim, c).split(' (')[0]} spada na ziemię — ranny i ogłuszony.`, 'krew', 'dlon-rzut-ladowanie');
    }
    if (c.hp <= 0) sim.kill(c, 'ciśnięty przez dłoń z otchłani', 'otchlan');
    return true;
  }
  c.x = Math.max(1, Math.min(w.w - 2, nx));
  c.y = Math.max(1, ny);
  c.vy = 0; c.droga = undefined;
  return true;
}

/** Narzędzie dewelopera: akcja dłoni od razu (w walce z demonem). */
export function devDlonDemona(sim: Sim, a: AkcjaDloni): string {
  if (sim.lud.pomnik?.faza !== 'walka') return 'Dłoń pomaga tylko w walce z demonem (najpierw „rozbij pomnik”).';
  const st = stanDloniDemona(sim);
  if (st.akcja) return 'Dłoń już coś robi.';
  const dm = demon(sim);
  const r = dm && rycerzPrzy(sim, dm);
  if (!dm || !r) return 'Nie ma demona albo rycerza.';
  const ok = a === 'rzut' ? ustawRzut(sim, st, dm, r) : a === 'tarcza' ? ustawTarcze(sim, st, dm, r) : ustawZawal(sim, st, dm, r);
  if (!ok) return a === 'zawal' ? 'Rycerz za blisko albo za daleko od demona — nie ma gdzie zawalić stropu.' : 'Nie ma gdzie wyrosnąć dłoni.';
  if (st.sciana && a === 'zawal') return 'Ściana gruzu już stoi.';
  zacznij(sim, st, a, r);
  return `Dłoń z otchłani: ${a === 'rzut' ? 'rzut rycerzem' : a === 'tarcza' ? 'tarcza przed demonem' : 'zawał stropu'}.`;
}
