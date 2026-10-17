/**
 * POLECENIA (Alpha, etap 2) — rozkazy gracza dla zaznaczonych postaci ludu. Liczby w src/nastawy/polecenia.ts.
 *
 * Szept rozkazu nic nie kosztuje — to sterowanie, nie cud:
 *  - „idź tam” — postać idzie we wskazane miejsce i trzyma tam posterunek (pobożny modli się, rycerz pilnuje),
 *    aż rozkaz odwołasz. Pobożny i rycerz idą tylko tam, dokąd prowadzi droga — inaczej odmawiają (dymek
 *    nad głową, kręcą głową). Robotnik, gdy drogi nie ma, wykuwa sobie przejście sam (sim/droga.ts: szukajKopiac).
 *  - wskazanie litej skały robotnikowi — „kop tam”: przekopuje się do tego kafla i go wykuwa.
 *  - „kop drogę wiernych” (robotnik) — kopie czoło złotej kreski (plan drogi pod rdzeń), aż będzie gotowa.
 * Robotnicy nie kopią już sami: bez rozkazu tylko noszą jedzenie i odpoczywają przy obozie.
 * Rozkaz wykonuje planer ludu (creatures.ts: planPolecenia); przerywa go tylko to, co pilne —
 * głód, fala Strażników, walka — a potem postać wraca do rozkazu.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { Job, Thought } from './creatures';
import { POLECENIA as P } from '../nastawy/polecenia';
import { rolaPostaci } from './lud';
import { szukajDrogi, szukajKopiac, kosztKuciaLudu, budzetDrog, nowyTik, stoi } from './droga';
import { czoloDrogi, nieWykopane } from './pielgrzymka';
import { zapisz, kto } from './dziennik';

export type TypPolecenia = 'idz' | 'kop' | 'droga';

export interface Polecenie {
  typ: TypPolecenia;
  /** kafel celu: przy „idź” — podłoga, na której stanie; przy „kop” — lity kafel do wykucia */
  x: number; y: number;
  /** tik wydania (znacznik celu na płycie) */
  od: number;
  /** doszedł — trzyma posterunek */
  na?: boolean;
  /** ile razy w drodze szukał nowego przejścia */
  prob?: number;
}

/** Odmowa wykonania rozkazu — dymek nad głową i kręcenie głową (render/lud/ruch.ts). */
export interface Odmowa { od: number; tekst: string }

/** Czy postać właśnie odmawia (dymek jeszcze wisi). */
export function odmawia(sim: Sim, c: Creature): boolean {
  return !!c.odmowa && sim.tick - c.odmowa.od < P.odmowaTikow;
}

/** Odmowa: zapisuje ją postaci (rysunek) i zwraca tekst dla gracza. */
export function odmow(sim: Sim, c: Creature, tekst: string): string {
  c.odmowa = { od: sim.tick, tekst };
  return tekst;
}

/** Podłoga pod wskazanym miejscem w pustce: w dół do pierwszego kafla, na którym się stoi (albo null). */
export function podlogaPod(sim: Sim, x: number, y: number): [number, number] | null {
  const w = sim.world;
  if (!w.inb(x, y) || !w.passable(x, y)) return null;
  for (let yy = y, k = 0; k <= P.podlogaNizej && yy < w.h - 1; yy++, k++) {
    if (!w.passable(x, yy)) return null;
    if (stoi(sim, x, yy)) return [x, yy];
  }
  return null;
}

/** Najbliższe miejsce do stania wokół (x, y), najwyżej `promien` kafli dalej (albo null). */
export function najblizszaPodloga(sim: Sim, x: number, y: number, promien: number): [number, number] | null {
  const w = sim.world;
  for (let r = 0; r <= promien; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const xx = x + dx, yy = y + dy;
      if (w.inb(xx, yy) && w.passable(xx, yy) && stoi(sim, xx, yy) && w.magma[w.idx(xx, yy)] === 0) return [xx, yy];
    }
  }
  return null;
}

/** Szukanie drogi na rozkaz — poza budżetem tiku (rozkazy są rzadkie, a „nie było czasu szukać” to nie odmowa). */
function drogaTeraz(sim: Sim, c: Creature, cel: (x: number, y: number) => boolean, limit: number): number[] | null {
  const zostalo = budzetDrog();
  nowyTik(1);
  const d = szukajDrogi(sim, c, (_i, x, y) => cel(x, y), limit);
  nowyTik(zostalo);
  return d;
}

/** Czy robotnik da radę się tam dokopać (bez budżetu tiku). */
function dokopieSie(sim: Sim, c: Creature, cel: (i: number, x: number, y: number) => boolean): boolean {
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  if (!w.inb(cx, cy)) return false;
  return !!szukajKopiac(sim, [w.idx(cx, cy)], cel, { koszt: kosztKuciaLudu(sim, true), limit: P.szukanieKopania, zBudzetu: false });
}

/** Postać przestaje robić to, co robiła — planer ludu weźmie rozkaz od razu. */
function przerwij(sim: Sim, c: Creature): void {
  c.wyprawa = false;
  if (c.job === Job.PIELGRZYM) c.job = Job.WANDER;
  if (c.thought === Thought.PRAY_CORE) c.thought = Thought.NONE;
  c.kopieDroge = false;
  c.modliPrzyObozie = false;
  c.posterunek = undefined;
  c.droga = undefined; c.drogaKopie = false;
  c.jt = 0; c.zamiarDo = sim.tick;
}

/**
 * Rozkaz dla jednej postaci: „idź tam” (albo „kop tam”, gdy robotnikowi wskażesz litą skałę) albo
 * „kop drogę wiernych”. Zwraca powód odmowy albo null, gdy postać przyjęła rozkaz.
 */
export function wydajPolecenie(sim: Sim, c: Creature, typ: 'idz' | 'droga', x: number, y: number): string | null {
  const w = sim.world;
  const rola = rolaPostaci(c);
  if (c.dead || !rola) return 'To nie twój lud.';
  if (typ === 'droga') {
    if (rola !== 'robotnik') return odmow(sim, c, 'kopią tylko robotnicy');
    const cz = czoloDrogi(sim);
    if (cz < 0) return odmow(sim, c, sim.rytual.otwarta ? 'skorupa już otwarta' : sim.planDrogi ? 'droga wiernych już wykopana' : 'nie wiem, którędy kopać');
    // dojdzie na miejsce tuż przy czole albo przekopie się do niego — inaczej odmawia od razu
    // (z dna jaskini pod czołem, kilkadziesiąt kafli niżej, nie wejdzie: lud nie wspina się po ścianach)
    // (na drodze w dół dalszy kawałek kreski też się liczy — kto zszedł niżej, kuje to, do czego dojdzie;
    // drogę schodami kopie się tylko od czoła)
    const reszta = new Set(sim.planDrogi?.dwukierunkowa ? [cz] : nieWykopane(sim));
    const przyKresce = (xx: number, yy: number) => {
      if (!stoi(sim, xx, yy)) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && w.inb(xx + dx, yy + dy) && reszta.has(w.idx(xx + dx, yy + dy))) return true;
      return false;
    };
    if (!drogaTeraz(sim, c, przyKresce, P.szukanieDrogi) && !dokopieSie(sim, c, (i) => i === cz)) return odmow(sim, c, 'nie dojdę do drogi wiernych');
    przerwij(sim, c);
    c.polecenie = { typ: 'droga', x: cz % w.w, y: (cz / w.w) | 0, od: sim.tick };
    c.odmowa = undefined;
    zapisz(sim, 'praca', `${kto(sim, c)}: rozkaz — kop drogę wiernych`, c.x, c.y);
    return null;
  }
  if (!w.inb(x, y)) return odmow(sim, c, 'tam nie sięgnę');
  // lita skała: robotnik się do niej przekopie, reszta stanie najbliżej, jak się da
  if (w.solid(x, y)) {
    if (rola === 'robotnik' && w.hardness(x, y) > 0) {
      const cel = w.idx(x, y);
      // stoi obok albo dojdzie obok — kuje stamtąd; inaczej przekopuje się przez skałę
      const obok = (xx: number, yy: number) => Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1 && stoi(sim, xx, yy);
      if (!drogaTeraz(sim, c, obok, P.szukanieDrogi) && !dokopieSie(sim, c, (i) => i === cel)) return odmow(sim, c, 'tam się nie dokopię');
      przerwij(sim, c);
      c.polecenie = { typ: 'kop', x, y, od: sim.tick };
      c.odmowa = undefined;
      zapisz(sim, 'praca', `${kto(sim, c)}: rozkaz — kop do (${x}, ${y})`, x, y);
      return null;
    }
    const p = najblizszaPodloga(sim, x, y, P.celPromien);
    if (!p) return odmow(sim, c, rola === 'robotnik' ? 'tej skały nie ruszę' : 'tam jest lita skała');
    x = p[0]; y = p[1];
  } else {
    const p = podlogaPod(sim, x, y) ?? najblizszaPodloga(sim, x, y, P.celPromien);
    if (!p) return odmow(sim, c, 'tam nie ma na czym stanąć');
    x = p[0]; y = p[1];
  }
  const tam = (xx: number, yy: number) => Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1 && stoi(sim, xx, yy);
  if (!drogaTeraz(sim, c, tam, P.szukanieDrogi)) {
    // pobożny i rycerz nie kują sobie drogi — odmawiają; robotnik przekopie się sam
    if (rola !== 'robotnik') return odmow(sim, c, 'nie dojdę tam — nie ma drogi');
    if (!dokopieSie(sim, c, (_i, xx, yy) => tam(xx, yy))) return odmow(sim, c, 'tam się nie dokopię');
  }
  przerwij(sim, c);
  c.polecenie = { typ: 'idz', x, y, od: sim.tick };
  c.odmowa = undefined;
  zapisz(sim, 'praca', `${kto(sim, c)}: rozkaz — idź do (${x}, ${y})`, x, y);
  return null;
}

/**
 * Rozkaz dla grupy: każdy dostaje własne miejsce obok wskazanego (co dwa kafle w bok, po podłodze),
 * żeby nie stanęli jeden na drugim. Zwraca, ilu przyjęło rozkaz, i odmowy.
 */
export function wydajGrupie(sim: Sim, ids: readonly number[], x: number, y: number): { przyjeli: number; odmowy: string[] } {
  const w = sim.world;
  const lud = ids.map((id) => sim.creatureById(id)).filter((c): c is Creature => !!c && !c.dead && !!rolaPostaci(c));
  // miejsca w szeregu wokół wskazanego: 0, +2, −2, +4, −4… — tylko tam, gdzie da się stanąć
  const baza = w.inb(x, y) && !w.solid(x, y) ? (podlogaPod(sim, x, y) ?? [x, y]) : [x, y];
  const miejsca: [number, number][] = [];
  for (let k = 0; miejsca.length < lud.length && k < 24; k++) {
    const dx = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2;
    const mx = baza[0] + dx, my = baza[1];
    if (k === 0 || (w.inb(mx, my) && w.passable(mx, my) && stoi(sim, mx, my))) miejsca.push([mx, my]);
  }
  let przyjeli = 0;
  const odmowy: string[] = [];
  lud.forEach((c, i) => {
    const [mx, my] = miejsca[i] ?? baza;
    const powod = wydajPolecenie(sim, c, 'idz', mx, my);
    if (powod) odmowy.push(powod); else przyjeli++;
  });
  return { przyjeli, odmowy };
}

/** „Kop drogę wiernych” dla zaznaczonych robotników. */
export function drogaGrupie(sim: Sim, ids: readonly number[]): { przyjeli: number; odmowy: string[] } {
  let przyjeli = 0;
  const odmowy: string[] = [];
  for (const id of ids) {
    const c = sim.creatureById(id);
    if (!c || c.dead || rolaPostaci(c) !== 'robotnik') continue;
    const powod = wydajPolecenie(sim, c, 'droga', 0, 0);
    if (powod) odmowy.push(powod); else przyjeli++;
  }
  return { przyjeli, odmowy };
}

/** Odwołuje rozkaz — postać wraca do swoich zajęć (robotnik do noszenia jedzenia, reszta do obozu). */
export function odwolajPolecenie(sim: Sim, c: Creature): void {
  if (!c.polecenie) return;
  c.polecenie = undefined;
  c.kopieDroge = false;
  c.modliPrzyObozie = false;
  c.droga = undefined; c.drogaKopie = false;
  c.jt = 0; c.zamiarDo = sim.tick;
}
