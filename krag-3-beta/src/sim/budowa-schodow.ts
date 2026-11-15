/**
 * BUDOWA SCHODÓW DROGI WIERNYCH (6.11, decyzja użytkownika: „Stwórz pełny system tworzenia tych schodów, czyli
 * rusztowania, liny, drabiny itp., nie kopanie blok po bloku — to mało realistyczne”).
 *
 * Każdy odcinek szybu powstaje w dwóch etapach:
 *  1. Wykop. Robotnicy kują szyb od góry w dół (rozkaz „kop drogę wiernych”, jak dotąd). W wykutym szybie nie ma
 *     jeszcze stopni — to surowa studnia w skale. Schodzi się do dna po drabinie, którą kopacze przedłużają za sobą,
 *     a przy wylocie stoi kołowrót: kto przy nim stanie, wyciąga kubłem urobek.
 *  2. Budowa. Gdy odcinek jest wykopany do dna, robotnicy stawiają w nim schody od dołu: kołowrotem opuszczają ciosane
 *     stopnie (każdy z kawałkiem słupa — tak jak w prawdziwych schodach kręconych), a murarze osadzają je na zaprawie
 *     jeden po drugim, na każdym poprzednim. Rusztowanie i drabina idą w górę razem ze schodami; po ostatnim stopniu
 *     rozbiera się rusztowanie, drabinę i kołowrót.
 * Przez wykopany szyb da się przejść od razu — drabiną — więc budowa nie wstrzymuje pielgrzymki: kto idzie w dół,
 * schodzi po drabinie do miejsca, gdzie zaczynają się schody, a dalej po stopniach.
 *
 * Kto buduje: robotnicy z rozkazem „kop drogę wiernych” (gdy nie ma już czego kuć, rozkaz przechodzi w budowę) i wolni
 * robotnicy (po noszeniu jedzenia — sim/creatures.ts: planRobotnika). Przy czole budowy mieści się dwóch murarzy, przy
 * kołowrocie jeden; bez nikogo przy kołowrocie murarze sami opuszczają kamień — wolniej.
 * Liczby — nastawy/loch.ts (SCHODY, BUDOWA_SCHODOW); rysunek — render/schody.ts i render/budowa-schodow.ts.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import type { Prost } from './world';
import { SCHODY, BUDOWA_SCHODOW as B } from '../nastawy/loch';
import { doKopania } from './pielgrzymka';
import { rolaPostaci } from './lud';

/** Spirala jednego odcinka szybu: środek, promień (do ściany) i słupa, pierwszy rząd stopni, posadzka pod nimi, faza. */
export interface Spirala { c: number; R: number; rn: number; ys: number; ye: number; th0: number }

export function spirala(sim: Sim, o: Prost): Spirala {
  return {
    c: (o.x0 + o.x1 + 1) / 2, R: (o.x1 - o.x0 + 1) / 2 - 0.05, rn: SCHODY.slup,
    ys: Math.max(o.y0, sim.world.salaOltarza.y1 + 1), ye: o.y1 + 1,
    // na szczycie spirala zaczyna się z prawej — od strony, z której się na nią wchodzi (sala, posadzka komnaty)
    th0: Math.PI / 2,
  };
}

/** Wysokość stopnia (kafle). */
export const wysokoscStopnia = (): number => SCHODY.obrot / SCHODY.stopni;

/** Kąt na spirali na danej wysokości (0 — tył szybu, π/2 — prawa ściana, π — przód). */
export function katSpirali(sp: Spirala, y: number): number { return sp.th0 + ((y - sp.ys) / SCHODY.obrot) * Math.PI * 2; }

/** Drabina w niezabudowanej części szybu: oparta o tylną ścianę (kąt z nastaw) — gdzie w poziomie i jak głęboko. */
export function pozycjaDrabiny(sp: Spirala): { x: number; glebia: number } {
  const r = sp.R - 0.32;
  return { x: sp.c + r * Math.sin(B.drabinaKat), glebia: r * Math.cos(B.drabinaKat) };
}

/**
 * Dolny koniec drabiny (kafle, wysokość): przy kopaniu — dno wykopu (pod najniższym wykutym rzędem środka szybu); przy
 * budowie — najniższy pomost rusztowania nad najwyższym stopniem (pomosty przestawia się co `przestawianie` kafli).
 */
export function dolDrabiny(sim: Sim, n: number): number {
  const w = sim.world, o = w.odcinkiDrogi[n];
  const sp = spirala(sim, o);
  const b = stanSchodow(sim).odcinki[n];
  if (b.etap === 'budowa' && b.stopni > 0) return pomostNadSchodami(sim, n);
  const sx = (o.x0 + o.x1) >> 1;
  let y = Math.floor(sp.ys);
  while (y <= o.y1 && w.schody[w.idx(sx, y)] === 1) y++;
  return y;
}

/** Najniższy pomost rusztowania (wysokość) — nad najwyższym stopniem, przestawiany skokami w górę. */
export function pomostNadSchodami(sim: Sim, n: number): number {
  const o = sim.world.odcinkiDrogi[n];
  const sp = spirala(sim, o);
  const yTop = wysokoscSzczytu(sim, n);
  const k = B.przestawianie;
  return Math.max(sp.ys, sp.ys + Math.floor((yTop - 0.9 - sp.ys) / k) * k);
}

/** Ile stopni ma odcinek (stopień k leży na wysokości ys + k·h, od 0 — najwyższy). */
export function liczbaStopni(sp: Spirala): number {
  return Math.max(0, Math.ceil((sp.ye - 0.02 - sp.ys) / wysokoscStopnia()));
}

export type EtapOdcinka = 'kopanie' | 'budowa' | 'gotowe';
export type RolaBudowy = 'murarz' | 'kolowrot';

export interface BudowaOdcinka {
  /** Ile stopni już stoi — od dołu odcinka. */
  stopni: number;
  /** Postęp bieżącego stopnia (0..1): kamień zjeżdża na linie kołowrotu, murarze go osadzają. */
  postep: number;
  /** Kurs kubła z urobkiem przy kopaniu (0..1, w kółko) — rusza tylko, gdy ktoś kręci kołowrotem. */
  kubel: number;
  /** Etap (liczony co tik) i od kiedy trwa budowa / kiedy się skończyła. */
  etap: EtapOdcinka;
  od?: number;
  koniec?: number;
  /** Czy w tym tiku ktoś kręcił kołowrotem i ilu murarzy osadzało kamień (rysunek: korba, młotki). */
  kreci?: boolean;
  murarzy?: number;
}

export interface StanBudowySchodow { odcinki: BudowaOdcinka[] }

/** Stan budowy (tworzony przy pierwszym pytaniu — po jednym wpisie na odcinek szybu). */
export function stanSchodow(sim: Sim): StanBudowySchodow {
  const w = sim.world;
  let s = sim.lud.schody;
  if (!s) s = sim.lud.schody = { odcinki: [] };
  while (s.odcinki.length < w.odcinkiDrogi.length) s.odcinki.push({ stopni: 0, postep: 0, kubel: 0, etap: 'kopanie' });
  return s;
}

/** Czy cały odcinek (wszystkie kafle szybu, od wnęki do dna) jest już wykuty. */
function wykopany(sim: Sim, o: Prost): boolean {
  const w = sim.world;
  for (let y = o.y0; y <= o.y1; y++) for (let x = o.x0; x <= o.x1; x++) if (doKopania(w.tile[w.idx(x, y)])) return false;
  return true;
}

/** Numer odcinka, w którym leży kafel (albo −1). */
export function numerOdcinka(sim: Sim, x: number, y: number): number {
  const w = sim.world;
  return w.odcinkiDrogi.findIndex((o) => x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1);
}

/**
 * Najwyższy zbudowany stopień odcinka (numer k — od góry; schody stoją od niego w dół) — albo liczba stopni,
 * gdy nie stoi jeszcze żaden. Wysokość jego stopnicy: ys + k·h (gdy żaden — posadzka pod odcinkiem).
 */
export function szczytSchodow(sim: Sim, n: number): number {
  const o = sim.world.odcinkiDrogi[n];
  if (!o) return 0;
  const sp = spirala(sim, o);
  const N = liczbaStopni(sp);
  const b = stanSchodow(sim).odcinki[n];
  return Math.max(0, N - Math.min(N, b.stopni));
}

/** Wysokość (kafle) stopnicy najwyższego zbudowanego stopnia — albo posadzki pod odcinkiem, gdy nie ma żadnego. */
export function wysokoscSzczytu(sim: Sim, n: number): number {
  const o = sim.world.odcinkiDrogi[n];
  if (!o) return 0;
  const sp = spirala(sim, o);
  const k = szczytSchodow(sim, n);
  return k >= liczbaStopni(sp) ? sp.ye : sp.ys + k * wysokoscStopnia();
}

/** Etap odcinka (z ostatniego tiku budowy). */
export function etapOdcinka(sim: Sim, n: number): EtapOdcinka {
  return stanSchodow(sim).odcinki[n]?.etap ?? 'kopanie';
}

/** Gdzie stoi murarz przy czole budowy (kafel; drugi — rząd niżej) — na najwyższych stopniach, środkiem szybu. */
export function posterunekMurarza(sim: Sim, n: number, ktory: number): { x: number; y: number } {
  const o = sim.world.odcinkiDrogi[n];
  const sx = (o.x0 + o.x1) >> 1;
  const y = Math.min(o.y1, Math.floor(wysokoscSzczytu(sim, n) + 0.05) - 1 + ktory);
  return { x: sx, y: Math.max(o.y0, y) };
}

/** Gdzie stoi ten, kto kręci kołowrotem: na posadzce tuż przy wylocie szybu (z prawej). */
export function posterunekKolowrotu(sim: Sim, n: number): { x: number; y: number } {
  const o = sim.world.odcinkiDrogi[n];
  const sp = spirala(sim, o);
  return { x: o.x1 + 2, y: Math.floor(sp.ys) - 1 };
}

/** Posterunek tej postaci przy budowie (albo null, gdy nie buduje). */
export function posterunek(sim: Sim, c: Creature): { x: number; y: number } | null {
  const b = c.budowa;
  if (!b || !sim.world.odcinkiDrogi[b.odcinek]) return null;
  return b.rola === 'kolowrot' ? posterunekKolowrotu(sim, b.odcinek) : posterunekMurarza(sim, b.odcinek, b.ktory ?? 0);
}

/** Czy postać stoi na swoim posterunku (tam pracuje — liczy się do postępu). Przy kołowrocie — tuż przy korbie. */
export function naPosterunku(sim: Sim, c: Creature): boolean {
  const p = posterunek(sim, c);
  if (!p) return false;
  const tol = c.budowa?.rola === 'kolowrot' ? 0.45 : 1.05;
  return Math.abs(c.x - (p.x + 0.5)) <= tol && Math.abs(c.y - p.y) <= 1.35;
}

/** Czy przy wylocie odcinka da się stanąć (wykuty szczyt — kołowrót stoi nad otworem). */
function wylotOtwarty(sim: Sim, o: Prost): boolean {
  const w = sim.world, sp = spirala(sim, o);
  const y = Math.floor(sp.ys);
  for (let x = o.x0; x <= o.x1; x++) if (!w.passable(x, y)) return false;
  return true;
}

/** Kto teraz pracuje przy odcinku n w roli r (bez postaci `poza`). */
function ilu(sim: Sim, n: number, r: RolaBudowy, poza?: Creature): Creature[] {
  return sim.creatures.filter((q) => !q.dead && q !== poza && q.budowa?.odcinek === n && q.budowa.rola === r && q.job === JOB_SCHODY && rolaPostaci(q) === 'robotnik');
}

/** Numer zajęcia „buduje schody” (Job.SCHODY w sim/creatures.ts — tu bez importu wartości, żeby nie zapętlić modułów). */
let JOB_SCHODY = -1;
export function ustawJobSchody(j: number): void { JOB_SCHODY = j; }

/**
 * Co przy schodach może teraz robić ten robotnik: odcinek, rola i posterunek — albo null. Najpierw budowa (murarze,
 * potem kołowrót) w najwyżej położonym odcinku, który ją ma; potem — przy kopaniu — kołowrót z kubłem urobku tam,
 * gdzie kują (`zKubłem` — tylko wolni robotnicy, nie kopacze z rozkazu).
 */
export function zadanieBudowy(sim: Sim, c: Creature, zKublem: boolean): { odcinek: number; rola: RolaBudowy; ktory: number; x: number; y: number } | null {
  const w = sim.world;
  const st = stanSchodow(sim);
  for (let n = 0; n < w.odcinkiDrogi.length; n++) {
    if (st.odcinki[n].etap !== 'budowa') continue;
    const murarze = ilu(sim, n, 'murarz', c);
    if (murarze.length < B.murarzy) {
      const zajete = new Set(murarze.map((q) => q.budowa!.ktory ?? 0));
      const ktory = zajete.has(0) ? 1 : 0;
      return { odcinek: n, rola: 'murarz', ktory, ...posterunekMurarza(sim, n, ktory) };
    }
    if (!ilu(sim, n, 'kolowrot', c).length && wylotOtwarty(sim, w.odcinkiDrogi[n])) return { odcinek: n, rola: 'kolowrot', ktory: 0, ...posterunekKolowrotu(sim, n) };
  }
  if (!zKublem) return null;
  // kopanie: kołowrót nad odcinkiem, w którym ktoś teraz kuje (urobek idzie w górę kubłem)
  for (let n = 0; n < w.odcinkiDrogi.length; n++) {
    const o = w.odcinkiDrogi[n];
    if (st.odcinki[n].etap !== 'kopanie' || !wylotOtwarty(sim, o)) continue;
    const kuja = sim.creatures.some((q) => !q.dead && q.kopieDroge && q.jx >= o.x0 && q.jx <= o.x1 && q.jy >= o.y0 && q.jy <= o.y1);
    if (!kuja || ilu(sim, n, 'kolowrot', c).length) continue;
    return { odcinek: n, rola: 'kolowrot', ktory: 0, ...posterunekKolowrotu(sim, n) };
  }
  return null;
}

/** Czy w którymś odcinku trwa budowa schodów (jest co robić po wykopie). */
export function trwaBudowaSchodow(sim: Sim): boolean {
  return stanSchodow(sim).odcinki.some((b) => b.etap === 'budowa');
}

/**
 * Tik budowy: etap każdego odcinka (wykop — budowa — gotowe), kurs kubła z urobkiem, gdy ktoś kręci kołowrotem przy
 * kopaniu, i postęp stopnia — z pracy murarzy przy czole (i kołowrotu, który opuszcza im kamień).
 */
export function tikBudowySchodow(sim: Sim): void {
  const w = sim.world;
  if (!w.odcinkiDrogi.length) return;
  const st = stanSchodow(sim);
  w.odcinkiDrogi.forEach((o, n) => {
    const b = st.odcinki[n];
    const sp = spirala(sim, o);
    const N = liczbaStopni(sp);
    if (b.stopni >= N) b.etap = 'gotowe';
    else if (sim.tick % 30 === n || b.etap === 'gotowe') b.etap = wykopany(sim, o) ? 'budowa' : 'kopanie';
    b.kreci = false; b.murarzy = 0;
    if (b.etap === 'gotowe') return;
    let murarzy = 0;
    for (const c of sim.creatures) {
      if (c.dead || c.budowa?.odcinek !== n || c.job !== JOB_SCHODY || !naPosterunku(sim, c)) continue;
      if (c.budowa.rola === 'murarz') murarzy++; else b.kreci = true;
    }
    b.murarzy = murarzy;
    if (b.etap === 'kopanie') {
      if (b.kreci) b.kubel = (b.kubel + 1 / B.kubelTikow) % 1;
      return;
    }
    if (b.od === undefined) {
      b.od = sim.tick;
      sim.gdzie(sp.c, sp.ye - 1).log(n === 0
        ? 'Szyb do starej komnaty wykopany do dna. Robotnicy stawiają rusztowanie i od dołu osadzają kamienne stopnie.'
        : 'Szyb na przedproże lochu wykopany do dna. Robotnicy stawiają rusztowanie i od dołu osadzają kamienne stopnie.', 'swiat', `schody-start-${n}`);
    }
    if (!murarzy) return;
    b.postep += Math.min(murarzy, B.murarzy) * (b.kreci ? 1 : B.bezKolowrotu) / B.tikowNaStopien;
    while (b.postep >= 1 && b.stopni < N) {
      b.postep -= 1;
      b.stopni++;
      if (b.stopni % S_CO === 0 && b.stopni < N) sim.gdzie(sp.c, sp.ys + (N - b.stopni) * wysokoscStopnia()).log(`Schody drogi wiernych rosną — ${b.stopni} z ${N} stopni osadzonych.`, 'swiat', `schody-${n}`);
    }
    if (b.stopni >= N) {
      b.stopni = N; b.postep = 0; b.etap = 'gotowe'; b.koniec = sim.tick;
      sim.gdzie(sp.c, sp.ys).log(n === 0
        ? 'Schody do starej komnaty gotowe — rusztowanie, drabinę i kołowrót rozebrano.'
        : 'Schody na przedproże lochu gotowe — rusztowanie, drabinę i kołowrót rozebrano. Droga wiernych stoi cała.', 'swiat', `schody-koniec-${n}`);
      for (const c of sim.creatures) if (c.budowa?.odcinek === n) { c.budowa = undefined; if (c.job === JOB_SCHODY) c.jt = 0; }
    }
  });
}

/** Co ile stopni kronika notuje postęp budowy. */
const S_CO = 40;
