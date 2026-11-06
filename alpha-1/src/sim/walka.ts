/**
 * RUCHY WALKI (Alpha 1, 6.11) — rycerz i demon walczą ruchami, nie pojedynczymi ciosami co ileś tików.
 * Ruch (nastawy/walka.ts) trwa swoje tiki, trafia w swoich chwilach i zadaje swoje rany; w tym czasie postać nic innego
 * nie robi (cios idzie do końca). Rysunek (render/lud/walka-rycerza.ts, render/demon-boss.ts) odgrywa ten sam ruch od tego
 * samego tiku, więc ostrze spada wtedy, gdy rana naprawdę pada, a siła trafienia jest widać w odrzucie i iskrach.
 *
 * Rycerz: losuje atak spośród dostępnych — podstawowe zawsze, ataki weterana tylko jako weteran (sim/lud.ts:
 * weteranAktywny), a ataki z tarczą, naramiennikami, nakolannikami, hełmem i napierśnikiem tylko w tych częściach zbroi
 * (sim/zbroja.ts). Przyjmując cios, broni się: blok tarczą, parowanie (weteran), unik (nakolanniki), kontra na
 * napierśniku; bez obrony — lekkie trafienie (walczy dalej), mocne (przerywa atak, zatacza się) albo powalenie.
 * Demon: 12 ataków (zwarcie, obszar, dystans) wybieranych wg odległości, liczby ludu wokół i życia (część dopiero,
 * gdy słabnie), uderzenie w ziemię co jakiś czas, ryk, rozkazy dla dłoni z otchłani; zasłania się przedramieniem przed
 * zamachem rycerza, chwieje się po ciężkim ciosie, a przy połowie i ćwierci życia pada na kolano.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { RACES } from './races';
import { rolaPostaci, mnoznik, maxHp, walczacy, oznaczCios, weteranAktywny } from './lud';
import { nosi, ranyZbroi } from './zbroja';
import {
  RUCHY_RYCERZA as RR, OBRONA_RYCERZA as OB, RUCHY_BOSSA as RB, WALKA_BOSSA as WB,
  type IdRuchuRycerza, type IdRuchuBossa, type RuchRycerza, type RuchBossa,
} from '../nastawy/walka';
import { STRAZNICY as S } from '../nastawy/straznicy';
import { DEMON } from '../nastawy/pomnik';
import { SNIACY_KAMIEN as K } from '../nastawy/boss';
import { DLON } from '../nastawy/dlon';
import { ranStraznika, ruchStraznika, celStraznika } from './straznicy';
import { demonCzeka } from './dlon-demona';

/** Ruch w toku (c.ruch — trafia do zapisu). */
export interface RuchTrwa {
  id: string;
  /** od którego tiku i ile trwa */
  od: number; dl: number;
  /** na kogo (id stworzenia, −1 — nikt) */
  cel: number;
  /** ile trafień już padło i ile każde zadało (ujemne — zablokowane, 0 — chybione) */
  traf: number; zadane: number[];
  /** reakcja: skąd przyszedł cios (−1/1) i jak mocny (ułamek życia); wariant (zachwianie: 2 — klęka) */
  kier?: number; sila?: number; wariant?: number;
  /** przemieszczenie: skąd (szarża) i dokąd */
  x0?: number; y0?: number; cx?: number; cy?: number;
}

const losujWage = <T>(sim: Sim, lista: [T, number][]): T | null => {
  let suma = 0;
  for (const [, w] of lista) suma += w;
  if (suma <= 0) return null;
  let r = sim.rng.next() * suma;
  for (const [id, w] of lista) { r -= w; if (r <= 0) return id; }
  return lista[lista.length - 1][0];
};

/** Przesuwa postać ludu w poziomie (doskok, odrzut) — nie w skałę i nie nad przepaść. */
function przesun(sim: Sim, c: Creature, dx: number): void {
  const w = sim.world;
  const kroki = Math.max(1, Math.ceil(Math.abs(dx) / 0.25));
  for (let i = 0; i < kroki; i++) {
    const nx = c.x + dx / kroki;
    const x = Math.floor(nx), y = Math.floor(c.y);
    if (nx < 1 || nx > w.w - 2 || !w.passable(x, y) || w.passable(x, y + 1) && !w.schody[w.idx(x, y + 1)] && !w.solid(x, y + 1)) return;
    c.x = nx;
  }
}

// ======================================================================== rycerz

const czyRycerz = (c: Creature): boolean => rolaPostaci(c) === 'rycerz';

/** Czy rycerz spełnia wymagania ruchu (weteran, części zbroi). */
export function spelniaWymagania(sim: Sim, c: Creature, def: { weteran?: boolean; zbroja?: string[] }): boolean {
  if (def.weteran && !weteranAktywny(sim, c)) return false;
  if (def.zbroja && !def.zbroja.every((z) => nosi(c, z as never))) return false;
  return true;
}

/** Ataki, które rycerz ma teraz w zanadrzu (karta postaci, atlas). */
export function atakiRycerza(sim: Sim, c: Creature): IdRuchuRycerza[] {
  return (Object.keys(RR) as IdRuchuRycerza[]).filter((id) => RR[id].rodzaj === 'atak' && (RR[id].waga ?? 0) > 0 && spelniaWymagania(sim, c, RR[id]));
}

/** Zasięg zwykłego ciosu rycerza na tego wroga. */
const zasiegRycerza = (s: Creature): number => S.rycerzZasieg + (s.boss ? 0.8 : 0);

function wybierzAtak(sim: Sim, c: Creature, s: Creature, d: number): IdRuchuRycerza | null {
  const zasieg = zasiegRycerza(s);
  const zycieWroga = s.hp / Math.max(1, s.hpMax ?? s.hp);
  const lista: [IdRuchuRycerza, number][] = [];
  for (const id of atakiRycerza(sim, c)) {
    const def = RR[id];
    if (def.wrogPonizej !== undefined && zycieWroga >= def.wrogPonizej) continue;
    const blisko = d <= zasieg + (def.zasieg ?? 0);
    const zDaleka = !!def.zDaleka && d <= zasieg + def.zDaleka && Math.abs(s.y - c.y) < 1.2;
    if (!blisko && !zDaleka) continue;
    let waga = def.waga ?? 1;
    if (c.kombo === id) waga *= OB.komboWaga;
    if (!blisko && zDaleka) waga *= 3;
    lista.push([id, waga]);
  }
  return losujWage(sim, lista);
}

function zacznijRuch(sim: Sim, c: Creature, id: string, dl: number, cel: Creature | null, extra: Partial<RuchTrwa> = {}): RuchTrwa {
  const r: RuchTrwa = { id, od: sim.tick, dl, cel: cel?.id ?? -1, traf: 0, zadane: [], x0: c.x, y0: c.y, ...extra };
  c.ruch = r;
  return r;
}

/** Siła jednego ciosu rycerza (bez mnożnika ruchu). */
const silaRycerza = (sim: Sim, c: Creature): number => RACES[c.race].strength * mnoznik(sim, c, 'sila') * OB.mnoznik * (0.85 + sim.rng.next() * 0.3);

/** Cios rycerza w Strażnika (albo demona): rana, ogłuszenie, odrzut. Zwraca zadaną ranę (ujemną — zablokował ją demon). */
function zadajCios(sim: Sim, c: Creature, s: Creature, mn: number, def: RuchRycerza): number {
  let rana = silaRycerza(sim, c) * mn;
  const blok = !!s.boss && s.ruch?.id === 'blok' && !def.nieDoZablokowania;
  if (blok) {
    rana *= WB.blok.rany;
    for (let k = 0; k < 3; k++) sim.spark(s.x + sim.rng.range(-0.5, 0.5), s.y - 2.5 + sim.rng.range(-0.6, 0.6), 'hit');
  }
  const hp0 = s.hp;
  ranStraznika(sim, s, c, rana, !!def.chwieje);
  const zadane = Math.max(0, hp0 - s.hp);
  if (!s.dead && zadane > 0) {
    if (def.ogluszenie) s.ogluszonyAtakDo = Math.max(s.ogluszonyAtakDo ?? 0, sim.tick + def.ogluszenie);
    if (def.odrzut && !s.boss) {
      const kier = Math.sign(s.x - c.x) || c.face;
      s.x = Math.max(1, Math.min(sim.world.w - 2, s.x + kier * def.odrzut));
    }
  }
  return blok ? -zadane : zadane;
}

/**
 * Rycerz walczy ze Strażnikiem albo demonem (wołane z doFight przez walczZeStraznikiem): podchodzi, a w zasięgu —
 * po krótkiej gardzie — zaczyna ruch. Z daleka może zacząć szarżą z tarczą albo ciosem z wyskoku.
 */
export function walkaRycerza(sim: Sim, c: Creature, s: Creature, podejdz: (x: number, y: number) => void): void {
  const d = Math.hypot(s.x - c.x, s.y - c.y);
  const zasieg = zasiegRycerza(s);
  const gotow = sim.tick - (c.ciosT ?? -1e9) >= OB.przerwa;
  let zDaleka = 0;
  if (gotow && d > zasieg) for (const id of atakiRycerza(sim, c)) zDaleka = Math.max(zDaleka, RR[id].zDaleka ?? 0);
  if (d > zasieg && !(zDaleka > 0 && d <= zasieg + zDaleka && Math.abs(s.y - c.y) < 1.2)) { podejdz(Math.floor(s.x), Math.floor(s.y)); return; }
  c.face = s.x > c.x ? 1 : -1;
  if (!gotow) return;
  const id = wybierzAtak(sim, c, s, d);
  if (!id) { podejdz(Math.floor(s.x), Math.floor(s.y)); return; }
  zacznijRuch(sim, c, id, RR[id].dl, s);
  c.kombo = OB.kombo[id];
  if (s.boss) bossWidziZamach(sim, s, c, RR[id]);
}

/**
 * Krok rycerza w trakcie ruchu (z kroku stworzenia, przed jego zajęciem): doskok, trafienia o czasie. Zwraca true, póki
 * ruch trwa — wtedy postać nic innego nie robi.
 */
export function krokRuchuRycerza(sim: Sim, c: Creature): boolean {
  const R = c.ruch;
  if (!R) return false;
  const def = RR[R.id as IdRuchuRycerza];
  const t = sim.tick - R.od;
  if (!def || !czyRycerz(c) || c.wDloni || c.lot) { c.ruch = undefined; return false; }
  if (t >= R.dl) {
    c.ruch = undefined;
    if (def.rodzaj === 'atak') c.ciosT = sim.tick;
    return false;
  }
  c.vy = 0; c.droga = undefined;
  if (def.rodzaj !== 'atak') return true;
  const s = sim.creatureById(R.cel);
  const zyje = !!s && !s.dead;
  if (def.doskok && zyje) {
    const [kafle, t0, t1] = def.doskok;
    if (t >= t0 && t < t1) {
      const odl = Math.abs(s!.x - c.x), kier = Math.sign(s!.x - c.x) || c.face;
      const stop = s!.boss ? zasiegRycerza(s!) - 0.5 : 0.85;
      if (odl > stop) przesun(sim, c, kier * Math.min(kafle / (t1 - t0), odl - stop));
    }
  }
  while (def.traf && R.traf < def.traf.length && t >= def.traf[R.traf][0]) {
    const mn = def.traf[R.traf][1];
    R.traf++;
    let zad = 0;
    if (zyje && !s!.dead && Math.hypot(s!.x - c.x, s!.y - c.y) <= zasiegRycerza(s!) + (def.zasieg ?? 0) + 0.6) zad = zadajCios(sim, c, s!, mn, def);
    R.zadane.push(zad);
  }
  return true;
}

export interface Cios {
  /** skąd przyszedł (−1/1 — po której stronie rycerza stoi bijący) */
  kier: number;
  /** cios powala (gdy się nie obroni); odrzut (kafle); przygniata (tiki) */
  powala?: boolean; odrzut?: number; przygniata?: number;
  /** tego nie da się zablokować ani sparować (ogień) */
  ogien?: boolean;
}

/**
 * Rycerz przyjmuje cios (Strażnika albo demona): obrona albo reakcja. Zwraca ranę, która naprawdę zostaje (zbroja już
 * policzona przez wołającego). Bez obrony lekka rana tylko go wzdryga, a przerwać atak i zwalić z nóg może dopiero mocna.
 */
export function przyjmijCios(sim: Sim, c: Creature, rana: number, o: Cios): number {
  if (!czyRycerz(c) || rana <= 0) return rana;
  const R = c.ruch, def = R ? RR[R.id as IdRuchuRycerza] : undefined;
  const wet = weteranAktywny(sim, c);
  const lezy = R?.id === 'powalony' && sim.tick - R.od < R.dl;
  // w trakcie ataku, do ostatniego trafienia, nie zasłoni się — cios już wyprowadzony
  const wAtaku = !!def && def.rodzaj === 'atak' && !!R && sim.tick - R.od < (def.traf?.[def.traf.length - 1]?.[0] ?? 0);
  const zajety = lezy || wAtaku || (!!R && R.id !== 'garda' && sim.tick - R.od < R.dl && def?.rodzaj !== 'atak');
  if (!zajety && !o.przygniata && !o.ogien) {
    if (nosi(c, 'tarcza') && sim.rng.chance(OB.blok.szansa + (wet ? OB.blok.weteran : 0))) {
      zacznijRuch(sim, c, 'blokTarcza', RR.blokTarcza.dl, null, { kier: o.kier, sila: rana / maxHp(sim, c) });
      for (let k = 0; k < 3; k++) sim.spark(c.x + o.kier * 0.3, c.y - 0.8 + sim.rng.range(-0.3, 0.3), 'hit');
      return rana * OB.blok.rany;
    }
    if (wet && sim.rng.chance(OB.parowanie.szansa)) {
      zacznijRuch(sim, c, 'parowanie', RR.parowanie.dl, null, { kier: o.kier });
      c.ciosT = sim.tick + RR.parowanie.dl - OB.przerwa;   // kontra zaraz po parowaniu
      c.kombo = OB.kombo.parowanie;
      for (let k = 0; k < 4; k++) sim.spark(c.x + o.kier * 0.45, c.y - 1.0 + sim.rng.range(-0.3, 0.3), 'glint');
      return 0;
    }
    if (nosi(c, 'nakolanniki') && sim.rng.chance(OB.unik.szansa)) {
      zacznijRuch(sim, c, 'unik', RR.unik.dl, null, { kier: o.kier });
      przesun(sim, c, -o.kier * OB.unik.krok);
      sim.spark(c.x, c.y, 'dust');
      return 0;
    }
  }
  let r = rana;
  const frac = r / maxHp(sim, c);
  if (!lezy && !o.przygniata && !o.powala && nosi(c, 'napiersnik') && (!wAtaku || frac >= OB.mocneOd) && sim.rng.chance(OB.kontra.szansa)) {
    r *= OB.kontra.rany;
    const bijacy = najblizszyWrog(sim, c);
    zacznijRuch(sim, c, 'kontraNapiersnika', RR.kontraNapiersnika.dl, bijacy, { kier: o.kier, sila: r / maxHp(sim, c) });
    if (bijacy?.boss) bossWidziZamach(sim, bijacy, c, RR.kontraNapiersnika);
    return r;
  }
  const fr = r / maxHp(sim, c);
  if (o.przygniata) {
    zacznijRuch(sim, c, 'powalony', o.przygniata + 64, null, { kier: o.kier, sila: fr, wariant: 1 });
    c.ogluszonyDo = sim.tick + o.przygniata;
  } else if (lezy) {
    // leżący dostaje dalej — bez nowej reakcji
  } else if (fr >= OB.powalenieOd || (o.powala && fr >= OB.powalajacyOd)) {
    zacznijRuch(sim, c, 'powalony', RR.powalony.dl, null, { kier: o.kier, sila: fr });
    c.ogluszonyDo = sim.tick + OB.lezy;
    przesun(sim, c, -o.kier * (o.odrzut ?? OB.odrzutPowalenia));
  } else if (fr >= OB.mocneOd) {
    zacznijRuch(sim, c, 'trafionyMocno', RR.trafionyMocno.dl, null, { kier: o.kier, sila: fr });
    c.przystanDo = sim.tick + OB.zatacza;
    przesun(sim, c, -o.kier * Math.max(OB.odrzutMocny, (o.odrzut ?? 0) * 0.5));
  } else {
    c.drgniecie = { t: sim.tick, sila: fr, kier: o.kier };
    if (o.odrzut) przesun(sim, c, -o.kier * o.odrzut * 0.4);
  }
  return r;
}

function najblizszyWrog(sim: Sim, c: Creature): Creature | null {
  let best: Creature | null = null, bd = 4;
  for (const o of sim.creatures) {
    if (o.dead || !o.straznik) continue;
    const d = Math.hypot(o.x - c.x, o.y - c.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

// ======================================================================== demon

const zycieBossa = (c: Creature): number => c.hp / Math.max(1, c.hpMax ?? DEMON.hp);

function zacznijRuchBossa(sim: Sim, c: Creature, id: IdRuchuBossa, cel: Creature | null, dl?: number, extra: Partial<RuchTrwa> = {}): RuchTrwa {
  if (cel) c.face = cel.x > c.x ? 1 : -1;
  return zacznijRuch(sim, c, id, dl ?? RB[id].dl, cel, extra);
}

/** Rycerz bierze zamach — demon (wolny) czasem zasłania się przedramieniem aż do trafienia. */
export function bossWidziZamach(sim: Sim, b: Creature, r: Creature, def: RuchRycerza): void {
  if (b.dead || def.nieDoZablokowania || !def.traf?.length) return;
  if (b.ruch && sim.tick - b.ruch.od < b.ruch.dl) return;
  if (!sim.rng.chance(zycieBossa(b) < 0.3 ? WB.blok.ranny : WB.blok.szansa)) return;
  zacznijRuchBossa(sim, b, 'blok', r, def.traf[0][0] + 24);
}

/**
 * Demon przyjął ranę (z ranStraznika): przy połowie i ćwierci życia pada na kolano, po ciężkim ciosie się chwieje
 * (przerywa zamach, który jeszcze nie trafił).
 */
export function bossPrzyjmuje(sim: Sim, b: Creature, hp0: number, rana: number, chwieje: boolean): void {
  if (b.dead || b.boss !== 'demon') return;
  const max = Math.max(1, b.hpMax ?? DEMON.hp);
  const R = b.ruch;
  for (const prog of WB.kleka) {
    if (hp0 / max >= prog && b.hp / max < prog) {
      b.chwiejT = sim.tick;
      zacznijRuchBossa(sim, b, 'zachwianie', null, WB.dlKleku, { wariant: 2 });
      return;
    }
  }
  if (!(rana / max >= WB.chwiejeOd || (chwieje && rana / max >= WB.chwiejeCiosOd))) return;
  if (R && R.id === 'zachwianie' && sim.tick - R.od < R.dl) return;
  if (sim.tick - (b.chwiejT ?? -1e9) < WB.odporny) return;
  const def = R ? RB[R.id as IdRuchuBossa] : undefined;
  const przedCiosem = !R || sim.tick - R.od >= R.dl || R.id === 'blok' || R.id === 'ryk' || (!!def?.traf && R.traf === 0 && def.rodzaj !== 'zdolnosc');
  if (przedCiosem) { b.chwiejT = sim.tick; zacznijRuchBossa(sim, b, 'zachwianie', null, RB.zachwianie.dl, { wariant: 1 }); }
}

/** Cios demona w kogoś z ludu (zwarcie, obszar, ogień). */
function ciosBossa(sim: Sim, b: Creature, cel: Creature, mn: number, def: RuchBossa, o: { powala?: number; ogien?: boolean } = {}): void {
  if (cel.dead) return;
  if (sim.lud.straznicy) sim.lud.straznicy.cios = sim.tick;
  const kier = Math.sign(cel.x - b.x) || b.face;
  let rana = DEMON.sila * mn * (0.85 + sim.rng.next() * 0.3) * ranyZbroi(cel);
  const powala = sim.rng.chance(o.powala ?? def.powala ?? 0);
  rana = przyjmijCios(sim, cel, rana, { kier: -kier, powala, odrzut: def.odrzut, przygniata: def.przygniata, ogien: o.ogien });
  if (!czyRycerz(cel) && def.odrzut && rana > 0) przesun(sim, cel, kier * def.odrzut * 0.6);
  if (rana <= 0) return;
  cel.hp -= rana;
  oznaczCios(sim, cel, true);
  if (o.ogien) cel.pali = sim.tick + 70;
  sim.spark(cel.x, cel.y - 0.5, 'hit');
  if (def.ogluszenie) cel.przystanDo = Math.max(cel.przystanDo ?? 0, sim.tick + def.ogluszenie);
  if (cel.hp <= 0) {
    sim.kill(cel, `zmiażdżony przez: ${DEMON.nazwa}`, 'straznik');
    b.rykPo = true;
    return;
  }
  if (!walczacy(cel)) ranStraznika(sim, b, cel, RACES[cel.race].strength * mnoznik(sim, cel, 'sila') * S.oddajeCios);
}

/** Lud w promieniu wokół demona. */
function wokol(sim: Sim, b: Creature, r: number, dy = 3): Creature[] {
  return sim.creatures.filter((o) => !o.dead && rolaPostaci(o) && Math.abs(o.x - b.x) <= r && Math.abs(o.y - b.y) <= dy && Math.hypot(o.x - b.x, (o.y - b.y) * 0.8) <= r);
}

function trafienieBossa(sim: Sim, b: Creature, R: RuchTrwa, def: RuchBossa, mn: number, zasyp: (sim: Sim, c: Creature) => void): void {
  const cel = sim.creatureById(R.cel);
  if (R.id === 'uderzenieWZiemie') {
    zasyp(sim, b);
    for (const o of wokol(sim, b, def.promien ?? 3)) o.przystanDo = Math.max(o.przystanDo ?? 0, sim.tick + (def.ogluszenie ?? 30));
    return;
  }
  if (def.promien) {
    for (const o of wokol(sim, b, def.promien)) {
      const d = Math.hypot(o.x - b.x, o.y - b.y);
      ciosBossa(sim, b, o, mn * (1 - 0.45 * Math.min(1, d / def.promien)), def, { powala: def.powalaDo && d <= def.powalaDo ? 0.7 : 0 });
    }
    R.zadane.push(1);
    return;
  }
  if (def.luk) {
    for (const o of wokol(sim, b, def.zasieg ?? 2.7, 2.2)) {
      const przed = Math.sign(o.x - b.x) === b.face || Math.abs(o.x - b.x) < 0.8;
      if (przed) ciosBossa(sim, b, o, mn, def);
    }
    R.zadane.push(1);
    return;
  }
  if (cel && !cel.dead && Math.hypot(cel.x - b.x, cel.y - b.y) <= (def.zasieg ?? DEMON.zasieg) + 0.6) {
    ciosBossa(sim, b, cel, mn, def);
    R.zadane.push(1);
  } else R.zadane.push(0);
}

function krokRuchuBossa(sim: Sim, b: Creature, R: RuchTrwa, t: number, zasyp: (sim: Sim, c: Creature) => void): void {
  const def = RB[R.id as IdRuchuBossa];
  if (!def) { b.ruch = undefined; return; }
  const cel = sim.creatureById(R.cel);
  if (def.przemieszcza) {
    const [t0, t1, maks] = def.przemieszcza;
    if (t >= t0 && t < t1) {
      if (R.id === 'szarza' && R.traf === 0 && cel && !cel.dead) {
        const kier = Math.sign(cel.x - b.x) || b.face;
        b.x = Math.max(1, Math.min(sim.world.w - 2, b.x + kier * (maks / (t1 - t0))));
        b.y += Math.max(-0.05, Math.min(0.05, cel.y - b.y));
        if (Math.hypot(cel.x - b.x, cel.y - b.y) <= 1.9) { R.traf = 1; ciosBossa(sim, b, cel, def.traf![0][1], def); R.zadane.push(1); }
      }
    }
  }
  while (def.traf && R.traf < def.traf.length && def.traf[R.traf][0] > 0 && t >= def.traf[R.traf][0]) {
    const mn = def.traf[R.traf][1];
    R.traf++;
    trafienieBossa(sim, b, R, def, mn, zasyp);
  }
  if (def.oddech) {
    const [a, z, co] = def.oddech;
    if (t >= a && t < z && (t - a) % co === 0) {
      // stożek ognia przed sobą: tym szerszy, im dalej
      for (const o of wokol(sim, b, def.zasieg ?? 5, 3)) {
        const dx = (o.x - b.x) * b.face, dy = Math.abs(o.y - (b.y - 0.3));
        if (dx > 0.2 && dx <= (def.zasieg ?? 5) && dy <= 1.2 + dx * 0.3) ciosBossa(sim, b, o, def.podmuch ?? 0.1, def, { ogien: true });
      }
    }
  }
}

/** Rozkaz dla dłoni z otchłani — który ruch demona do której akcji. */
const ROZKAZ: Record<string, IdRuchuBossa> = { rzut: 'rozkazRzut', tarcza: 'rozkazTarcza', zawal: 'rozkazZawal' };

function wybierzAtakBossa(sim: Sim, b: Creature, cel: Creature, d: number): IdRuchuBossa | null {
  const zycie = zycieBossa(b);
  const tlum = wokol(sim, b, 3.2).length;
  const lista: [IdRuchuBossa, number][] = [];
  for (const id of Object.keys(RB) as IdRuchuBossa[]) {
    const def = RB[id];
    if (def.rodzaj !== 'atak' && def.rodzaj !== 'obszar' && def.rodzaj !== 'dystans') continue;
    if (def.zycieDo !== undefined && zycie >= def.zycieDo) continue;
    if (def.od !== undefined && d < def.od) continue;
    const zasieg = def.zasieg ?? def.promien ?? DEMON.zasieg;
    if (d > zasieg) continue;
    if (Math.abs(cel.y - b.y) > 2.5 && id !== 'biczLancucha') continue;
    let w = def.waga ?? 1;
    if (id === 'odepchniecie' && d > 1.4) continue;
    if (id === 'przygniecenie' && (!czyRycerz(cel) || (cel.ogluszonyDo ?? -1) > sim.tick)) continue;
    if ((id === 'tupniecie' || id === 'wybuchAureoli' || id === 'zamach') && tlum >= 2) w *= 2;
    if (zycie < 0.25 && def.rodzaj !== 'atak') w *= 1.6;
    if (b.ruchPoprz === id) w *= 0.35;
    lista.push([id, w]);
  }
  return losujWage(sim, lista);
}

/**
 * Krok demona z pomnika (zamiast ciosu co DEMON.ciosCo): zrastanie bez modlitwy, ruch w toku, rozkaz dla dłoni,
 * uderzenie w ziemię co K.zasypCo, cel i atak; gdy cel daleko — idzie (przenika skałę).
 */
export function tikDemona(sim: Sim, c: Creature, zasyp: (sim: Sim, c: Creature) => void): void {
  const hpMax = c.hpMax ?? DEMON.hp;
  if ((sim.rytual.wierni ?? 0) < K.modlitwaWiernych) c.hp = Math.min(hpMax, c.hp + K.zrastanie);
  const R = c.ruch;
  if (R) {
    const t = sim.tick - R.od;
    if (t < R.dl) { krokRuchuBossa(sim, c, R, t, zasyp); return; }
    c.ruch = undefined;
    c.ruchPoprz = R.id;
    if (R.id !== 'blok') c.ciosT = sim.tick;
    // po klęknięciu i po zabiciu kogoś — ryk
    if ((R.id === 'zachwianie' && R.wariant === 2) || c.rykPo) {
      c.rykPo = false; c.rykT = sim.tick;
      zacznijRuchBossa(sim, c, 'ryk', null);
      return;
    }
  }
  // dłoń z otchłani wstaje — demon wydaje jej rozkaz gestem
  const st = sim.lud.dlonDemona;
  if (st?.akcja && st.faza === 'wstaje' && c.rozkazOd !== st.od && ROZKAZ[st.akcja]) {
    c.rozkazOd = st.od;
    const D = DLON.demon as unknown as Record<string, Record<string, number>>;
    zacznijRuchBossa(sim, c, ROZKAZ[st.akcja], null, (D[st.akcja]?.wstaje ?? 60) + 50);
    return;
  }
  if (demonCzeka(sim)) return;
  if (sim.tick - (c.zasypT ?? 0) >= K.zasypCo) {
    c.zasypT = sim.tick;
    zacznijRuchBossa(sim, c, 'uderzenieWZiemie', null);
    return;
  }
  let cel = sim.creatureById(sim.target.get(c.id) ?? -1);
  if (!cel || cel.dead || sim.tick % 90 === 0) {
    cel = celStraznika(sim, c, S.limitOdRdzenia) ?? undefined;
    if (cel) sim.target.set(c.id, cel.id); else sim.target.delete(c.id);
  }
  const w = sim.world;
  if (!cel) {
    if (sim.tick - (c.rykT ?? 0) > WB.rykCisza && sim.tick - (c.ciosT ?? -1e9) > WB.przerwa) { c.rykT = sim.tick; zacznijRuchBossa(sim, c, 'ryk', null); return; }
    ruchStraznika(sim, c, w.coreX + 0.5, w.przedsionekY - 2, DEMON.szybkosc, S.limitOdRdzenia);
    return;
  }
  if (cel.wDloni || cel.lot) { c.face = cel.x > c.x ? 1 : -1; return; }
  const d = Math.hypot(cel.x - c.x, cel.y - c.y);
  const gotow = sim.tick - (c.ciosT ?? -1e9) >= WB.przerwa && (c.ogluszonyAtakDo ?? -1) <= sim.tick;
  if (gotow) {
    const id = wybierzAtakBossa(sim, c, cel, d);
    if (id) {
      zacznijRuchBossa(sim, c, id, cel);
      return;
    }
  }
  if (d > DEMON.zasieg) ruchStraznika(sim, c, cel.x, cel.y - 0.5, DEMON.szybkosc, S.limitOdRdzenia);
  else c.face = cel.x > c.x ? 1 : -1;
}

/** Nazwa ruchu (dziennik, karta). */
export function nazwaRuchu(id: string): string {
  return (RR as Record<string, RuchRycerza>)[id]?.nazwa ?? (RB as Record<string, RuchBossa>)[id]?.nazwa ?? id;
}
