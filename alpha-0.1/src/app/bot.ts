/**
 * Bot — automatyczny gracz do obserwatorium (obserwatorium.html: cztery okna gry, w każdym gra bot).
 * Robi to, co próbni gracze ze skryptów (scripts/test-balansu.mjs, scripts/proby-graczy.mjs):
 * odpowiada na karty wydarzeń, karmi głodnych (ryt Nakarm), stawia Cud przy ludzie i posyła
 * pobożnych pod rdzeń. Alpha: drużyna jest stała, a robotnicy kopią tylko na rozkaz — bot posyła ich
 * na czoło drogi wiernych (jeden zostaje przy noszeniu jedzenia).
 * Wołany co BOT_CO tików symulacji; karty rozstrzyga od razu, żeby gra nie stawała.
 */
import type { Sim } from '../sim/sim';
import { Race } from '../sim/races';
import { Job } from '../sim/creatures';
import { rozstrzygnij } from '../sim/wydarzenia';
import { seed, sign, whisper } from '../powers/powers';
import { porcjiWWiadrach } from '../sim/wiadro';
import { wydajPolecenie, odwolajPolecenie } from '../sim/polecenia';
import { STRAZNICY } from '../nastawy/straznicy';
import { czoloDrogi } from '../sim/pielgrzymka';

export type StylBota = 'rozsadny' | 'budowniczy' | 'speedrun' | 'bierny';

export const STYLE_BOTA: Record<StylBota, string> = {
  rozsadny: 'rozsądny',
  budowniczy: 'budowniczy',
  speedrun: 'speedrun',
  bierny: 'bierny (nic nie robi)',
};

/** Co ile tików bot się zastanawia (pół sekundy gry). */
export const BOT_CO = 60;

const M = 7200;

/** Pamięć bota w jednej partii (nie w symulacji — ta trafia do zapisu). */
interface Pamiec { wymarsz: number }
const pamieci = new WeakMap<Sim, Pamiec>();
function pamiec(sim: Sim): Pamiec {
  let p = pamieci.get(sim);
  if (!p) { p = { wymarsz: 0 }; pamieci.set(sim, p); }
  return p;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = any;
const zywi = (sim: Sim): C[] => sim.creatures.filter((c) => !c.dead && c.race === Race.GOBLIN);
function role(sim: Sim): { pobozny: number; robotnik: number; rycerz: number } {
  const r = { pobozny: 0, robotnik: 0, rycerz: 0 };
  for (const c of zywi(sim)) r[(c.rola ?? 'pobozny') as keyof typeof r]++;
  return r;
}
/** Remake v2: jedzenie to porcje w wiadrach. */
function jedzenie(sim: Sim): number {
  return porcjiWWiadrach(sim);
}

/** Karta wydarzenia: rozsądny wybór, a gdy go nie stać — domyślny. Zwraca true, gdy była karta. */
export function kartaBota(sim: Sim, styl: StylBota): boolean {
  const e = sim.wydarzenia.biezace;
  if (!e) return false;
  let i = e.rozsadny;
  if (styl === 'bierny') i = e.domyslny;
  else if (styl === 'budowniczy' && e.rodzaj === 'warta' && !pamiec(sim).wymarsz) i = 2;
  if (rozstrzygnij(sim, i) !== null) rozstrzygnij(sim, e.domyslny);
  return true;
}

/**
 * Alpha: robotnicy kopią tylko na rozkaz — bot posyła ich na czoło drogi wiernych, aż będzie gotowa.
 * Najwyżej `ilu`, zawsze jeden zostaje przy noszeniu jedzenia; głodnych nie odrywa od jedzenia.
 */
function kopaczeDrogi(sim: Sim, ilu: number): void {
  if (czoloDrogi(sim) < 0) return;
  const robotnicy = zywi(sim).filter((c) => c.rola === 'robotnik');
  let kopie = robotnicy.filter((c) => c.polecenie?.typ === 'droga').length;
  const limit = Math.min(ilu, robotnicy.length - 1);
  for (const c of robotnicy) {
    if (kopie >= limit) break;
    // (kto niedawno odmówił — nie dojdzie do czoła — dostaje rozkaz najwcześniej za pół minuty)
    if (c.polecenie || c.hunger > 0.5 || (c.odmowa && sim.tick - c.odmowa.od < M / 2)) continue;
    if (wydajPolecenie(sim, c, 'droga', 0, 0) === null) kopie++;
  }
}

/**
 * Alpha: rycerz jest jeden. Gdy trwa fala Strażników, a on stoi daleko od przedsionka (pilnuje obozu na górze),
 * bot posyła go pod rdzeń; po fali odwołuje rozkaz — rycerz wraca do warty przy pobożnych.
 */
function rycerzNaFale(sim: Sim): void {
  const w = sim.world;
  const fala = !!sim.lud.straznicy?.trwa;
  for (const c of zywi(sim)) {
    if (c.rola !== 'rycerz') continue;
    const daleko = Math.hypot(c.x - w.coreX, c.y - w.przedsionekY) > STRAZNICY.rycerzWidzi * 0.75;
    if (fala && daleko && !c.polecenie && !(c.odmowa && sim.tick - c.odmowa.od < M / 2)) wydajPolecenie(sim, c, 'idz', w.coreX + (c.id % 2 ? -6 : 6), w.przedsionekY);
    else if (!fala && c.polecenie?.typ === 'idz') odwolajPolecenie(sim, c);
  }
}

/** Wspólne dla budowniczego i speedrunu: wiadro najgłodniejszemu (ryt Nakarm), kopacze drogi wiernych. */
function wspolne(sim: Sim): void {
  if (sim.tick % 600 === 0) kopaczeDrogi(sim, 2);
  if (sim.tick % 600 === 300) rycerzNaFale(sim);
  let najg: C = null;
  for (const c of zywi(sim)) if (c.hunger > 0.65 && (!najg || c.hunger > najg.hunger)) najg = c;
  if (najg && sim.krew > 60 && sim.tick % 600 === 0) seed(sim, 'grzyb', Math.round(najg.x), Math.round(najg.y));
}

function rozsadny(sim: Sim): void {
  const w = sim.world;
  if (sim.tick % 600 === 0) kopaczeDrogi(sim, 2);
  if (sim.tick % 600 === 300) rycerzNaFale(sim);
  // głodujący dostają wiadro (ryt Nakarm) tam, gdzie stoją
  let najg: C = null;
  for (const c of zywi(sim)) if (c.hunger >= 0.6 && (!najg || c.hunger > najg.hunger)) najg = c;
  if (najg && sim.krew > 70) seed(sim, 'grzyb', Math.round(najg.x), Math.round(najg.y));
  // wiadro nad przedsionkiem, żeby warta pod rdzeniem miała co jeść
  if (sim.tick % 900 === 0 && sim.krew > 60 && sim.jedzeniePrzedsionka < 3) seed(sim, 'grzyb', w.coreX, w.przedsionekY);
  // Cud przy ludzie — oddanie rośnie, a z nim rytuał
  if (sim.wiara >= 35 && sim.tick % 1200 === 0) {
    const k = sim.clans.find((x) => !x.dead && x.race === Race.GOBLIN);
    if (k && k.devotion < 0.7) sign(sim, 'objawienie', k.hx, k.hy);
  }
  // „módl się”: gdy przy przedsionku jest jedzenie, pobożni idą pod rdzeń
  if (sim.tick % 600 === 0 && !sim.rytual.otwarta && sim.jedzeniePrzedsionka >= 3 && sim.wiara >= 8) {
    let idzie = zywi(sim).filter((c) => c.job === Job.PIELGRZYM).length;
    for (const c of zywi(sim)) {
      if (idzie >= role(sim).pobozny || sim.wiara < 8) break;
      if (c.job === Job.PIELGRZYM || c.hunger > 0.35 || (c.rola ?? 'pobozny') !== 'pobozny') continue;
      if (whisper(sim, 'modl', c)) idzie++;
    }
  }
}

function budowniczy(sim: Sim): void {
  const p = pamiec(sim);
  wspolne(sim);
  if (sim.wiara >= 70 && sim.tick % 2400 === 0) {
    const k = sim.clans.find((x) => !x.dead && x.race === Race.GOBLIN);
    if (k && k.devotion < 0.9) sign(sim, 'objawienie', k.hx, k.hy);
  }
  // wymarsz pod rdzeń, gdy droga gotowa i jest co jeść (albo po 16 minutach)
  if (!p.wymarsz) {
    const plan = sim.planDrogi ? sim.planDrogi.kopac.length : 99;
    const gotowy = jedzenie(sim) >= 12 && sim.krew >= 40 && plan === 0;
    if (gotowy || sim.tick > 16 * M) p.wymarsz = sim.tick;
  }
  if (p.wymarsz && sim.tick % 600 === 0) {
    for (const c of zywi(sim)) if (c.rola === 'pobozny' && c.job !== Job.PIELGRZYM && !c.wyprawa && c.hunger < 0.5 && sim.wiara >= 8) whisper(sim, 'modl', c);
  }
}

function speedrun(sim: Sim): void {
  wspolne(sim);
  if (sim.wiara >= 30 && sim.tick % 1200 === 0) {
    const k = sim.clans.find((x) => !x.dead && x.race === Race.GOBLIN);
    if (k && k.devotion < 0.95) sign(sim, 'objawienie', k.hx, k.hy);
  }
  if (sim.tick % 600 === 0) {
    for (const c of zywi(sim)) if (c.rola === 'pobozny' && c.job !== Job.PIELGRZYM && !c.wyprawa && sim.wiara >= 8) whisper(sim, 'modl', c);
  }
}

/** Jeden ruch bota (co BOT_CO tików). */
export function ruchBota(sim: Sim, styl: StylBota): void {
  if (sim.ending) return;
  if (kartaBota(sim, styl)) return;
  if (styl === 'bierny') return;
  if (styl === 'budowniczy') budowniczy(sim);
  else if (styl === 'speedrun') speedrun(sim);
  else rozsadny(sim);
}
