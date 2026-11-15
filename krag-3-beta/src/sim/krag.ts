/**
 * KRĄG TRZECI (beta) — mechaniki kręgu żarłoków: obżarstwo, ulewa, okup dla Cerbera. Nastawy: nastawy/krag.ts,
 * rysunek: render/krag.ts. Stan: sim.lud.krag (bez zapisu — po wczytaniu ulewa liczy się od nowa).
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { KRAG } from '../nastawy/krag';
import { Race } from './races';
import { rolaPostaci } from './lud';
import { porcjiWWiadrach, zabierzPorcje, wiadra } from './wiadro';
import { SURFACE_Y } from './world';

export interface StanKregu {
  /** Ulewa: od kiedy do kiedy trwa bieżąca (albo ostatnia) i kiedy następna. */
  ulewaOd: number; ulewaDo: number; nastepna: number;
  /** Okup dla Cerbera: kiedy ostatni, kto rzucił i skąd (rysunek: lot jedzenia do paszczy). */
  okupT: number; okupX: number; okupY: number; okupKto: number;
  /** Ile razy ktoś padł w błoto z przejedzenia, ile okupów. */
  upadkow: number; okupow: number;
  /** Ostatnie wiadro, przy którym sprawdzono Cerbera (żeby podjadał raz na dostawę), ile razy podjadł. */
  wiadroSpr?: number; podjadl?: number;
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
  cerberPodjada(sim, k);
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
  return r === 'robotnik' ? 'Grabarz' : r === 'rycerz' ? 'Rycerz' : 'Mnich';
}

// ---------------------------------------------------------------- Cerber na powierzchni kręgu

/** Odcinek obchodu Cerbera (tiki): idzie do celu przez `CH` części odcinka, potem szarpie potępionego w błocie. */
const ODC = 760, CH = 0.42;
/** Szczątki po ofierze leżą tyle tików, potem cień żarłoka znów leży w błocie (potępieni się odradzają). */
export const SZCZATKI_TIKOW = 9000;
/** Sposoby zabijania: 0 szarpie i ciska, 1 rozrywa na pół, 2 połyka, 3 miażdży łapą i żre, 4 podrzuca i chwyta. */
export const SPOSOBOW_ZABIJANIA = 5;
function hasz(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface CerberNaKregu {
  x: number; y: number; zwrot: number;
  /** 0…1 — idzie (1) albo stoi i szarpie (0); szarpie: postęp 0…1 od początku postoju */
  idzie: number; szarpie: number;
  /** czy jest na powierzchni (po rozbiciu pieczęci zszedł za potępionymi w trzewia) */
  jest: boolean;
  /** numer postoju i sposób zabijania przy nim */
  k: number; wariant: number;
}

/** Ofiara Cerbera przy postoju `k`: gdzie leżała (x — przed paszczami), kiedy zginęła, do kiedy leżą szczątki. */
export interface ZabicieCerbera { k: number; x: number; zwrot: number; od: number; zabite: number; do: number; wariant: number }

export function wariantZabicia(sim: Sim, k: number): number {
  return Math.floor(hasz(k * 131 + 7 + (sim.seed | 0)) * SPOSOBOW_ZABIJANIA);
}

/** Ostatnie zabójstwa (do `ile` postojów wstecz), których szczątki jeszcze leżą — rysunek tłumu i szczątków. */
export function zabiciaCerbera(sim: Sim, tik = sim.tick, ile = 14): ZabicieCerbera[] {
  const out: ZabicieCerbera[] = [];
  const faza = sim.lud.pomnik?.faza;
  if (faza && faza !== 'stoi' && faza !== 'rozpada') return out;
  const k0 = Math.floor(tik / ODC);
  for (let k = k0; k > k0 - ile && k >= 1; k--) {
    const x0 = celCerbera(sim, k - 1), x1 = celCerbera(sim, k);
    const zwrot = x1 >= x0 ? 1 : -1;
    const od = k * ODC + CH * ODC;
    if (od > tik) continue;
    out.push({ k, x: x1 + zwrot * 4, zwrot, od, zabite: od + (1 - CH) * ODC * 0.45, do: od + SZCZATKI_TIKOW, wariant: wariantZabicia(sim, k) });
  }
  return out;
}

/**
 * Cerber krąży po powierzchni kręgu nad trzewiami (Piekło, pieśń VI: stoi nad żarłokami, szarpie ich i obdziera
 * ze skóry). Pozycja wynika z samego tiku — obchód od celu do celu, przy każdym postój nad kimś w błocie.
 */
function celCerbera(sim: Sim, k: number): number {
  const xa = 22, xb = sim.world.w - 26;
  return xa + (xb - xa) * hasz(k * 7919 + (sim.seed | 0));
}

export function cerberNaPowierzchni(sim: Sim, tik = sim.tick): CerberNaKregu {
  const cel = (k: number): number => celCerbera(sim, k);
  const k = Math.floor(tik / ODC), u = (tik % ODC) / ODC;
  const x0 = cel(k - 1), x1 = cel(k);
  const f = Math.min(1, u / CH);
  const e = f * f * (3 - 2 * f);
  const faza = sim.lud.pomnik?.faza;
  return {
    x: x0 + (x1 - x0) * e, y: SURFACE_Y - 1,
    zwrot: x1 >= x0 ? 1 : -1,
    idzie: u < CH ? 1 : 0, szarpie: u < CH ? 0 : (u - CH) / (1 - CH),
    jest: !faza || faza === 'stoi' || faza === 'rozpada',
    k, wariant: wariantZabicia(sim, k),
  };
}

/** Cerber nad szybem wiadra podjada dostawę, zanim zjedzie (raz na wiadro). */
function cerberPodjada(sim: Sim, k: StanKregu): void {
  const wd = wiadra(sim).find((q) => q.faza === 'zapowiedz' && q.szyb);
  if (!wd || wd.id === k.wiadroSpr) return;
  k.wiadroSpr = wd.id;
  const c = cerberNaPowierzchni(sim);
  if (!c.jest || Math.abs(c.x - wd.x) > KRAG.cerber.podjadaOd || wd.porcje < 2) return;
  const ile = Math.max(1, Math.floor(wd.porcje * KRAG.cerber.podjada));
  wd.porcje -= ile;
  k.podjadl = (k.podjadl ?? 0) + 1;
  sim.gdzie(wd.x, SURFACE_Y).log(`Cerber dopadł kosza nad szybem i pożarł ${ile} porcji, zanim kosz zjechał w trzewia.`, 'otchlan', 'cerber-kosz');
}
