/**
 * Bot — automatyczny gracz do obserwatorium (obserwatorium.html: cztery okna gry, w każdym gra bot).
 * Robi to, co próbni gracze ze skryptów (scripts/test-balansu.mjs, scripts/proby-graczy.mjs):
 * odpowiada na karty wydarzeń, wybiera, kogo wydaje skała, karmi głodnych grzybem, szepcze
 * „przemyśl i kop” ku gniazdom rycerzy, stawia Cud przy ludzie i posyła pobożnych pod rdzeń.
 * Wołany co BOT_CO tików symulacji; karty rozstrzyga od razu, żeby gra nie stawała.
 */
import type { Sim } from '../sim/sim';
import { Race } from '../sim/races';
import { Job } from '../sim/creatures';
import { rozstrzygnij } from '../sim/wydarzenia';
import { gniazdaWSkale } from '../sim/lud';
import { seed, sign, whisper } from '../powers/powers';

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
interface Pamiec { przemysl: number; losowo: number; wymarsz: number }
const pamieci = new WeakMap<Sim, Pamiec>();
function pamiec(sim: Sim): Pamiec {
  let p = pamieci.get(sim);
  if (!p) { p = { przemysl: -1e9, losowo: -1e9, wymarsz: 0 }; pamieci.set(sim, p); }
  return p;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = any;
const zywi = (sim: Sim): C[] => sim.creatures.filter((c) => !c.dead && c.race === Race.GOBLIN);
function role(sim: Sim): { pobozny: number; robotnik: number; rycerz: number } {
  const r = { pobozny: 0, robotnik: 0, rycerz: 0 };
  for (const c of zywi(sim)) if (!c.buntownik) r[(c.rola ?? 'pobozny') as keyof typeof r]++;
  return r;
}
function jedzenie(sim: Sim): number {
  const k = sim.clans.find((x) => !x.dead && x.race === Race.GOBLIN);
  return (k ? k.stock : 0) + (sim.lud.spizarnie ?? []).reduce((s, o) => s + o.ilosc, 0);
}
const ktosNaTorze = (sim: Sim) => sim.creatures.some((c: C) => !c.dead && (c.tor || c.przemysl !== undefined));

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

/** Wspólne dla budowniczego i speedrunu: grzyb najgłodniejszemu, rycerze z gniazd. */
function wspolne(sim: Sim): void {
  const p = pamiec(sim);
  const r = role(sim);
  let najg: C = null;
  for (const c of zywi(sim)) if (c.hunger > 0.65 && (!najg || c.hunger > najg.hunger)) najg = c;
  if (najg && sim.krew > 60 && sim.tick % 600 === 0) seed(sim, 'grzyb', Math.round(najg.x), Math.round(najg.y));
  if (!ktosNaTorze(sim) && r.robotnik >= 2 && r.rycerz < 6 && gniazdaWSkale(sim).length && sim.tick - p.przemysl > 3600) {
    const ilu = gniazdaWSkale(sim).some((g) => g.znany) ? 1 : 3;
    if (sim.wiara >= 6 * ilu) {
      let n = 0;
      for (const c of zywi(sim)) if (n < ilu && c.rola === 'robotnik' && c.hunger < 0.45 && whisper(sim, 'przemysl', c)) n++;
      if (n) p.przemysl = sim.tick;
    }
  }
}

function rozsadny(sim: Sim): void {
  const p = pamiec(sim);
  const w = sim.world;
  const r = role(sim);
  sim.lud.rola = r.pobozny < 3 ? 'pobozny' : r.robotnik < 6 ? 'robotnik' : r.pobozny < 8 ? 'pobozny' : r.robotnik < 10 ? 'robotnik' : 'pobozny';
  // nikt się nie modli i nie ma krwi na pobożnego — ofiara z robotnika
  if (r.pobozny === 0 && sim.krew < 30 && sim.wiara >= 10) {
    const c = zywi(sim).find((q) => q.rola === 'robotnik');
    if (c) whisper(sim, 'ofiaruj', c);
  }
  // mało rycerzy — trzech robotników „przemyśli i kopie” ku gniazdu
  if (r.robotnik >= 3 && r.rycerz < 6 && sim.wiara >= 18 && sim.tick - p.przemysl > 7200 && !ktosNaTorze(sim)) {
    let n = 0;
    for (const c of zywi(sim)) if (n < 3 && c.rola === 'robotnik' && c.hunger < 0.4 && whisper(sim, 'przemysl', c)) n++;
    if (n) p.przemysl = sim.tick;
  }
  // gniazdo pokazane — jeden robotnik wystarczy
  if (r.robotnik >= 2 && r.rycerz < 6 && sim.wiara >= 6 && sim.tick - p.przemysl > 3600
      && (sim.lud.gniazda ?? []).some((g: C) => g.znany && !g.odkryte) && !ktosNaTorze(sim)) {
    const c = zywi(sim).find((q) => q.rola === 'robotnik' && q.hunger < 0.5);
    if (c && whisper(sim, 'przemysl', c)) p.przemysl = sim.tick;
  }
  // głodujący dostają grzyb pod nogi
  let najg: C = null;
  for (const c of zywi(sim)) if (c.hunger >= 0.6 && (!najg || c.hunger > najg.hunger)) najg = c;
  if (najg && sim.krew > 70) seed(sim, 'grzyb', Math.round(najg.x), Math.round(najg.y));
  // grzyb w przedsionku, żeby warta pod rdzeniem miała co jeść
  if (sim.tick % 900 === 0 && sim.krew > 60 && sim.jedzeniePrzedsionka < 3) {
    for (let k = 0; k < 4; k++) seed(sim, 'grzyb', w.coreX + (k - 2) * 3, w.przedsionekY);
  }
  // Cud przy ludzie — oddanie rośnie, a z nim rytuał
  if (sim.wiara >= 35 && sim.tick % 1200 === 0) {
    const k = sim.clans.find((x) => !x.dead && x.race === Race.GOBLIN);
    if (k && k.devotion < 0.7) sign(sim, 'objawienie', k.hx, k.hy);
  }
  // „módl się”: gdy przy przedsionku rośnie grzyb, trzech wiernych idzie pod rdzeń
  if (sim.tick % 600 === 0 && !sim.rytual.otwarta && sim.jedzeniePrzedsionka >= 3 && sim.wiara >= 8) {
    let idzie = zywi(sim).filter((c) => c.job === Job.PIELGRZYM).length;
    for (const c of zywi(sim)) {
      if (idzie >= 3 || sim.wiara < 8) break;
      if (c.job === Job.PIELGRZYM || c.hunger > 0.35 || (c.rola ?? 'pobozny') !== 'pobozny') continue;
      if (whisper(sim, 'modl', c)) idzie++;
    }
  }
}

function budowniczy(sim: Sim): void {
  const p = pamiec(sim);
  const r = role(sim);
  sim.lud.rola = r.robotnik < 6 ? 'robotnik' : r.pobozny < 6 ? 'pobozny' : r.robotnik < 7 ? 'robotnik' : 'pobozny';
  wspolne(sim);
  // rycerz kopie na chybił trafił, gdy gniazda jeszcze śpią
  if (gniazdaWSkale(sim).length && sim.wiara >= 20 && sim.tick - p.losowo > 10800 && !sim.lud.straznicy?.trwa) {
    const ryc = zywi(sim).find((c) => c.rola === 'rycerz' && !c.losowo && c.hunger < 0.5);
    if (ryc && whisper(sim, 'kopLosowo', ryc)) p.losowo = sim.tick;
  }
  if (sim.wiara >= 70 && sim.tick % 2400 === 0) {
    const k = sim.clans.find((x) => !x.dead && x.race === Race.GOBLIN);
    if (k && k.devotion < 0.9) sign(sim, 'objawienie', k.hx, k.hy);
  }
  // wymarsz pod rdzeń, gdy wszystkiego dużo (albo po 16 minutach)
  if (!p.wymarsz) {
    const plan = sim.planDrogi ? sim.planDrogi.kopac.length : 99;
    const gotowy = zywi(sim).length >= 12 && jedzenie(sim) >= 150 && (r.rycerz >= 3 || !gniazdaWSkale(sim).length) && sim.krew >= 40 && plan === 0;
    if (gotowy || sim.tick > 16 * M) p.wymarsz = sim.tick;
  }
  if (p.wymarsz && sim.tick % 600 === 0) {
    for (const c of zywi(sim)) if (c.rola === 'pobozny' && c.job !== Job.PIELGRZYM && !c.wyprawa && c.hunger < 0.5 && sim.wiara >= 8) whisper(sim, 'modl', c);
  }
}

function speedrun(sim: Sim): void {
  const r = role(sim);
  sim.lud.rola = r.pobozny < 5 ? 'pobozny' : r.robotnik < 4 ? 'robotnik' : 'pobozny';
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
