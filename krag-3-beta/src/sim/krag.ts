/**
 * KRĄG TRZECI (beta) — mechaniki kręgu żarłoków: obżarstwo, ulewa, okup dla Cerbera. Nastawy: nastawy/krag.ts,
 * rysunek: render/krag.ts. Stan: sim.lud.krag (bez zapisu — po wczytaniu ulewa liczy się od nowa).
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { KRAG } from '../nastawy/krag';
import { Race } from './races';
import { rolaPostaci } from './lud';
import { porcjiWWiadrach, zabierzPorcje } from './wiadro';

export interface StanKregu {
  /** Ulewa: od kiedy do kiedy trwa bieżąca (albo ostatnia) i kiedy następna. */
  ulewaOd: number; ulewaDo: number; nastepna: number;
  /** Okup dla Cerbera: kiedy ostatni, kto rzucił i skąd (rysunek: lot jedzenia do paszczy). */
  okupT: number; okupX: number; okupY: number; okupKto: number;
  /** Ile razy ktoś padł w błoto z przejedzenia, ile okupów. */
  upadkow: number; okupow: number;
}

export function stanKregu(sim: Sim): StanKregu {
  if (!sim.lud.krag) {
    sim.lud.krag = { ulewaOd: -1e9, ulewaDo: -1e9, nastepna: sim.tick + KRAG.deszcz.pierwsza, okupT: -1e9, okupX: 0, okupY: 0, okupKto: -1, upadkow: 0, okupow: 0 };
  }
  return sim.lud.krag;
}

/** Czy teraz leje (i jak mocno: 0…1, z łagodnym wejściem i wyjściem). */
export function ulewa(sim: Sim): number {
  const k = sim.lud.krag;
  if (!k || sim.tick < k.ulewaOd || sim.tick > k.ulewaDo) return 0;
  const a = (sim.tick - k.ulewaOd) / 600, b = (k.ulewaDo - sim.tick) / 600;
  return Math.max(0, Math.min(1, a, b));
}

/** Mnożnik do lud.ts: mnoznik(): ulewa (głód, szybkość) i obżarstwo (szybkość, kucie, siła). */
export function mnoznikKregu(sim: Sim, c: Creature, co: string): number {
  let v = 1;
  const u = ulewa(sim);
  if (u > 0) {
    if (co === 'glod') v *= 1 + (KRAG.deszcz.glod - 1) * u;
    if (co === 'szybkosc') v *= 1 - (1 - KRAG.deszcz.szybkosc) * u;
  }
  const o = Math.min(1, c.obzarstwo ?? 0);
  if (o > 0) {
    const O = KRAG.obzarstwo;
    if (co === 'szybkosc') v *= 1 - O.spowalnia * o;
    else if (co === 'kopanie') v *= 1 - O.kopanie * o;
    else if (co === 'sila') v *= 1 - O.sila * o;
  }
  return v;
}

/** Jedzenia w bród — żarłocy jedzą ponad głód. */
export function obfitosc(sim: Sim): boolean {
  return porcjiWWiadrach(sim) > KRAG.obzarstwo.obfitoscOd;
}

/**
 * Posiłek z wiadra (wołane z creatures.ts: doZapas): żarłok najadł się — gdy jedzenia w bród, sięga po więcej
 * (`wez(1)` zabiera porcję). Każda porcja ponad głód to obżarstwo.
 */
export function zarloczy(sim: Sim, c: Creature, glodPrzed: number, wez: (n: number) => number): void {
  const O = KRAG.obzarstwo;
  if (glodPrzed < O.najedzonyPonizej) c.obzarstwo = (c.obzarstwo ?? 0) + O.zaSytaPorcje;
  if (!obfitosc(sim)) return;
  let zjadl = 0;
  for (let n = 0; n < O.nadmiar && wez(1) > 0; n++) { zjadl++; sim.meals++; }
  if (!zjadl) return;
  c.obzarstwo = (c.obzarstwo ?? 0) + O.zaPorcje * zjadl;
  c.hunger = 0;
  if ((c.obzarstwo ?? 0) > 0.5 && (sim.tick + c.id) % 3 === 0) sim.efekt(c.x, c.y - 1, 'mysl', 'jeszcze… jeszcze jedną…');
}

/** Krok kręgu — raz na tik, z sim.step. */
export function tikKregu(sim: Sim): void {
  const k = stanKregu(sim);
  // ulewa
  if (sim.tick >= k.nastepna) {
    k.ulewaOd = sim.tick; k.ulewaDo = sim.tick + KRAG.deszcz.trwa;
    k.nastepna = k.ulewaDo + KRAG.deszcz.co + Math.floor((sim.rng.next() - 0.5) * 2 * KRAG.deszcz.rozrzut);
    sim.log('Nad kręgiem pęka niebo: wieczny deszcz, zimny i ciężki, z gradem i brudnym śniegiem. Ziemia cuchnie, błoto chwyta za nogi.', 'otchlan');
  }
  if (sim.tick === k.ulewaDo) sim.log('Ulewa słabnie. Błoto zostaje.', 'swiat');

  // obżarstwo: trawienie i upadek w błoto (co 30 tików)
  if (sim.tick % 30 === 0) {
    const O = KRAG.obzarstwo;
    for (const c of sim.creatures) {
      if (c.dead || c.race !== Race.GOBLIN || !c.obzarstwo) continue;
      c.obzarstwo = Math.max(0, c.obzarstwo - O.spadek * 30);
      if (c.obzarstwo >= O.padaOd && !(c.wBlocieDo && sim.tick < c.wBlocieDo)) {
        c.wBlocieDo = sim.tick + O.lezy;
        c.ogluszonyDo = Math.max(c.ogluszonyDo ?? 0, c.wBlocieDo);
        c.obzarstwo = O.poUpadku;
        k.upadkow++;
        sim.efekt(c.x, c.y - 1, 'mysl', 'pada twarzą w błoto — przejedzony');
        sim.gdzie(c.x, c.y).log(`${nazwaRoli(c)} obżarł się i padł twarzą w błoto, jak wszyscy żarłocy tego kręgu.`, 'otchlan', 'blotoUpadek', (n) => `Żarłocy padają w błoto z przejedzenia (${n}).`);
      }
    }
  }

  // okup dla Cerbera
  const boss = sim.lud.pomnik?.faza === 'walka' ? sim.creatures.find((c) => !c.dead && c.boss) : undefined;
  if (boss && sim.tick - k.okupT >= KRAG.okup.co) {
    // rzuca ten, kto niesie jedzenie (kurierzy noszą je do krypty), a gdy nikt nie niesie — porcje z wiadra
    let kto: Creature | null = null, best = Infinity;
    const wiadro = porcjiWWiadrach(sim) >= KRAG.okup.porcji;
    for (const c of sim.creatures) {
      if (c.dead || c.race !== Race.GOBLIN || (c.ogluszonyDo ?? 0) > sim.tick) continue;
      const d = Math.hypot(c.x - boss.x, c.y - boss.y);
      if (d > KRAG.okup.zasieg) continue;
      const ocena = d - (c.carry > 0 ? 100 : 0);
      if ((c.carry > 0 || wiadro) && ocena < best) { best = ocena; kto = c; }
    }
    let rzucil = 0;
    if (kto) {
      if (kto.carry > 0) { rzucil = Math.min(kto.carry, KRAG.okup.porcji); kto.carry -= rzucil; }
      else rzucil = zabierzPorcje(sim, KRAG.okup.porcji);
    }
    if (kto && rzucil > 0) {
      k.okupT = sim.tick; k.okupX = kto.x; k.okupY = kto.y - 1; k.okupKto = kto.id; k.okupow++;
      boss.ogluszonyAtakDo = Math.max(boss.ogluszonyAtakDo ?? 0, sim.tick + KRAG.okup.zre);
      kto.face = boss.x > kto.x ? 1 : -1;
      sim.efekt(kto.x, kto.y - 1.2, 'mysl', 'garść jedzenia w paszczę!');
      sim.gdzie(boss.x, boss.y).log('Jak Wergiliusz: garść jedzenia w trzy paszcze. Cerber żre i na chwilę zapomina o gryzieniu.', 'swiat', 'okup', (n) => `Okup dla Cerbera — garść jedzenia w paszcze (${n}).`);
    }
  }
}

/** Cerber żre okup (do rysunku). */
export function cerberZre(sim: Sim, c: Creature): number {
  const k = sim.lud.krag;
  if (!k) return 0;
  const t = sim.tick - k.okupT;
  return t >= 0 && t < KRAG.okup.zre ? 1 - t / KRAG.okup.zre : 0;
}

function nazwaRoli(c: Creature): string {
  const r = rolaPostaci(c);
  return r === 'robotnik' ? 'Robotnik' : r === 'rycerz' ? 'Rycerz' : 'Pokutnik';
}
