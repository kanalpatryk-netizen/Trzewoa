/**
 * DRUŻYNA (Alpha 0.3) — imiona, perki, polegli i ukryta historia świata (nastawy: src/nastawy/druzyna.ts,
 * src/nastawy/perki.ts). Stan w sim.lud.druzyna (trafia do zapisu), a imię i perki także na samej postaci
 * (c.imie, c.perki) — mnożnik roli czyta je co tik.
 *  - Wizja Patryka: stała obsada (te same osoby w każdej partii), perk i wada działają przez mnoznik() i haki.
 *  - Wizja Pawła: imiona z puli, losowane ziarnem partii (bez perków); śluby i tarot — src/sim/tarot.ts.
 * Kto padnie, zostaje na liście osób z przyczyną śmierci (karta zgaszona do końca partii); wskrzeszenie
 * przy ołtarzu przywraca tę samą osobę.
 * Rysunek czyta sim.sladyDruzyny (ślad działającego perku, odsłonięty fragment) — nie idzie do zapisu.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { Job } from './creatures';
import { Race } from './races';
import { Rng } from '../core/rng';
import { rolaPostaci, weteranStaz, NAZWA_ROLI, type Rola } from './lud';
import type { MnoznikiRoli } from '../nastawy/lud';
import { WARIANT, type Wariant } from '../nastawy/wariant';
import { OBSADA, IMIONA, HISTORIA, SZANSA_KOBIETY, DRUZYNA, type Plec, type Wyzwalacz, type Fragment } from '../nastawy/druzyna';
import { PERK, perk, type HakPerku } from '../nastawy/perki';
import { SWIAT } from '../nastawy/swiat';
import { mnoznikTarota, type StanTarota } from './tarot';

export interface Osoba {
  /** numer postaci (ten sam po wskrzeszeniu) */
  id: number;
  imie: string;
  przydomek?: string;
  plec: Plec;
  rola: Rola;
  /** perk (wizja Patryka) — id z src/nastawy/perki.ts */
  perk?: string;
  wada?: string;
  /** kim była, zanim trafiła do góry */
  kim?: string;
  /** ukryty fragment historii świata (wizja Patryka) */
  fragment?: string;
  /** pozycja na liście obsady (wizja Patryka) */
  nr?: number;
  polegl?: { tik: number; przyczyna: string };
  /** Nie do zdarcia: już raz przeżył śmiertelny cios */
  zuzyty?: boolean;
  /** Ile razy perk zadziałał (podpis na karcie). */
  razy?: number;
}

export interface StanDruzyny {
  wariant: Wariant;
  osoby: Osoba[];
  /** następny przybysz z obsady (wizja Patryka) */
  nastepny: number;
  /** odsłonięte w tej partii fragmenty historii (id) */
  odsloniete: string[];
  /** wizja Pawła: wybrany ślub (src/nastawy/tarot.ts) */
  slub?: string;
  /** wizja Pawła: talia tarota (src/sim/tarot.ts) */
  tarot?: StanTarota;
}

/** Ślad dla rysunku: perk zadziałał, fragment się odsłonił, ktoś padł albo wstał. */
export interface SladDruzyny { id: number; rodzaj: 'perk' | 'fragment' | 'smierc' | 'wstal' | 'ocalal'; co?: string; tik: number }

const ROLA_K: Record<Rola, string> = { pobozny: 'pobożna', robotnik: 'robotnica', rycerz: 'rycerz' };
const ROLA_M: Record<Rola, string> = { pobozny: 'pobożny', robotnik: 'robotnik', rycerz: 'rycerz' };

export function druzyna(sim: Sim): StanDruzyny {
  return (sim.lud.druzyna ??= { wariant: WARIANT, osoby: [], nastepny: 0, odsloniete: [] });
}

export function osoba(sim: Sim, id: number): Osoba | undefined {
  return sim.lud.druzyna?.osoby.find((o) => o.id === id);
}

/** „Bogdan „Kret”” albo samo imię. */
export function imieOsoby(o: Pick<Osoba, 'imie' | 'przydomek'>): string {
  return o.przydomek ? `${o.imie} „${o.przydomek}”` : o.imie;
}

/** Nazwa roli w rodzaju osoby: robotnica, pobożna. */
export function rolaOsoby(o: Pick<Osoba, 'rola' | 'plec'>): string {
  return (o.plec === 'k' ? ROLA_K : ROLA_M)[o.rola];
}

/** „Bogdan, robotnik” — do kroniki. Bez osoby: sama rola. */
export function ktoTo(sim: Sim, c: Creature): string {
  const o = osoba(sim, c.id);
  const r = rolaPostaci(c);
  if (!o) return r ? NAZWA_ROLI[r] : 'Ktoś';
  return `${o.imie}, ${rolaOsoby({ rola: r ?? o.rola, plec: o.plec })}`;
}

/** Końcówka czasownika w przeszłym: „poległ” / „poległa”. */
export function rodzaj(sim: Sim, c: Creature, m: string, k: string): string {
  return osoba(sim, c.id)?.plec === 'k' ? k : m;
}

// ---------------------------------------------------------------- nadawanie tożsamości

function losImion(sim: Sim, d: StanDruzyny): Rng {
  return new Rng(((sim.seed >>> 0) * 2654435761 + 7919 + d.osoby.length * 104729) >>> 0);
}

/** Nadaje postaci ludu imię (i w wizji Patryka — osobę z obsady). `zDaru` — przybysz z daru ludzi. */
export function nadajTozsamosc(sim: Sim, c: Creature, zDaru = false): Osoba | null {
  const r = rolaPostaci(c);
  if (!r || c.race !== Race.GOBLIN || c.straznik) return null;
  const d = druzyna(sim);
  const juz = osoba(sim, c.id);
  if (juz) { zalozNaPostac(c, juz); return juz; }
  let o: Osoba;
  if (d.wariant === 'patryk') {
    // start: pierwsza wolna osoba tej roli spośród sześciu; dar: następny przybysz z listy
    const zajete = new Set(d.osoby.map((x) => x.nr));
    let nr = -1;
    if (!zDaru) nr = OBSADA.findIndex((p, i) => i < 6 && p.rola === r && !zajete.has(i));
    if (nr < 0) {
      for (let i = Math.max(6, d.nastepny); i < OBSADA.length; i++) if (!zajete.has(i)) { nr = i; break; }
    }
    if (nr >= 0) {
      const p = OBSADA[nr];
      if (nr >= 6) d.nastepny = nr + 1;
      o = { id: c.id, imie: p.imie, przydomek: p.przydomek, plec: p.plec, rola: r, perk: p.perk, wada: p.wada, kim: p.kim, fragment: p.fragment, nr };
    } else {
      // obsada się skończyła (limit ludu jest większy niż lista) — imię z puli, bez perku
      o = { id: c.id, ...wolneImie(sim, d, r), rola: r };
    }
  } else {
    o = { id: c.id, ...wolneImie(sim, d, r), rola: r };
  }
  d.osoby.push(o);
  zalozNaPostac(c, o);
  return o;
}

function wolneImie(sim: Sim, d: StanDruzyny, r: Rola): { imie: string; plec: Plec } {
  const rng = losImion(sim, d);
  const plec: Plec = r !== 'rycerz' && rng.chance(SZANSA_KOBIETY) ? 'k' : 'm';
  const zajete = new Set(d.osoby.map((o) => o.imie));
  const pula = IMIONA[plec].filter((n) => !zajete.has(n));
  const inna = IMIONA[plec === 'k' ? 'm' : 'k'].filter((n) => !zajete.has(n));
  if (pula.length) return { imie: rng.pick(pula), plec };
  if (inna.length) return { imie: rng.pick(inna), plec: plec === 'k' ? 'm' : 'k' };
  return { imie: `Bezimienny ${d.osoby.length + 1}`, plec: 'm' };
}

/** Imię i perki na samej postaci — mnożnik czyta je co tik. Życie dopasowane do nowego mnożnika. */
function zalozNaPostac(c: Creature, o: Osoba): void {
  c.imie = o.imie;
  c.perki = [o.perk, o.wada].filter((p): p is string => !!p);
  if (!c.perki.length) c.perki = undefined;
}

/** Drużyna startowa (i stary zapis bez imion): każdy żywy z ludu dostaje osobę. */
export function zalozDruzyne(sim: Sim, pelneZycie = true, maxHp?: (c: Creature) => number): void {
  druzyna(sim);
  // kolejność stała: wizja Patryka dobiera osoby po roli, więc kolejność ról nie miesza obsady
  for (const c of sim.creatures) {
    if (c.dead || !rolaPostaci(c) || c.race !== Race.GOBLIN || c.straznik) continue;
    nadajTozsamosc(sim, c);
    if (pelneZycie && maxHp) c.hp = maxHp(c);
  }
}

// ---------------------------------------------------------------- mnożniki

export function maHak(c: Creature, hak: HakPerku): boolean {
  if (!c.perki || !PERK.wlaczone) return false;
  for (const id of c.perki) if (perk(id)?.hak === hak) return true;
  return false;
}

/** Perki, wada, ślub i tarot — mnożnik dla mnoznik() w sim/lud.ts. */
export function mnoznikDruzyny(sim: Sim, c: Creature, r: Rola, co: keyof MnoznikiRoli): number {
  let v = 1;
  if (c.perki && PERK.wlaczone) {
    for (const id of c.perki) {
      const p = perk(id);
      if (!p) continue;
      const e = p.efekt?.[co];
      if (e !== undefined) v *= e;
      // Wytrwały: przy kopaniu głodnieje wolniej
      if (co === 'glod' && p.hak === 'wytrwaly' && c.job === Job.DIG) v *= PERK.wytrwalyGlod;
    }
  }
  const d = sim.lud.druzyna;
  if (d && (d.slub || d.tarot)) v *= mnoznikTarota(sim, d, r, co);
  return v;
}

// ---------------------------------------------------------------- ślady (dla rysunku i kroniki)

export function slad(sim: Sim, id: number, rodzaj: SladDruzyny['rodzaj'], co?: string): void {
  const l = sim.sladyDruzyny;
  while (l.length && (l.length >= 32 || sim.tick - l[0].tik > 2400)) l.shift();
  l.push({ id, rodzaj, co, tik: sim.tick });
}

/** Perk zadziałał (hak) — znak nad postacią i rozbłysk karty; `kronika` — ważne, więc i wpis. */
export function perkZadzialal(sim: Sim, c: Creature, id: string, kronika?: string): void {
  const o = osoba(sim, c.id);
  if (o) o.razy = (o.razy ?? 0) + 1;
  slad(sim, c.id, 'perk', id);
  const p = perk(id);
  if (p) sim.efekt(c.x, c.y - 1.4, 'mysl', p.nazwa.toLowerCase());
  if (kronika) sim.gdzie(c.x, c.y).log(kronika, 'wiara');
}

/** Co jakiś czas: perk z mnożnikiem, który właśnie pracuje (kopie, modli się, walczy) — widoczny ślad. */
function sladyMnoznikow(sim: Sim): void {
  for (const c of sim.creatures) {
    if (c.dead || !c.perki) continue;
    const id = c.perki[0];
    const p = perk(id);
    if (!p || p.wada) continue;
    const e = p.efekt ?? {};
    const pracuje = (e.kopanie && c.job === Job.DIG) || (e.modlitwa && (c.job === Job.PRAY || c.job === Job.PIELGRZYM || (c.job === Job.STOI && rolaPostaci(c) === 'pobozny')))
      || (e.sila && (c.job === Job.FIGHT || c.job === Job.WARTA)) || (p.hak === 'wytrwaly' && c.job === Job.DIG)
      || (e.szybkosc && !!c.droga && c.droga.length > 6);
    if (!pracuje) continue;
    const ost = ostatniSlad.get(c.id) ?? -1e9;
    if (sim.tick - ost < PERK.sladCo) continue;
    ostatniSlad.set(c.id, sim.tick);
    slad(sim, c.id, 'perk', id);
  }
}
const ostatniSlad = new Map<number, number>();

// ---------------------------------------------------------------- śmierć, ocalenie, wskrzeszenie

/** Ciosy, po których „Nie do zdarcia” wstaje (nie głód, nie ofiara, nie ciemność). */
function smiertelnyCios(tag: string, why: string): boolean {
  return tag === 'straznik' || tag === 'walka' || (tag === 'otchlan' && why.startsWith('ciśnięty'));
}

/** Wołane z sim.kill przed śmiercią: perk może ją odwrócić. Zwraca true — postać żyje dalej. */
export function ocalonyPerkiem(sim: Sim, c: Creature, why: string, tag: string, maxHp: number): boolean {
  if (!maHak(c, 'twardy') || !smiertelnyCios(tag, why)) return false;
  const o = osoba(sim, c.id);
  if (!o || o.zuzyty) return false;
  o.zuzyty = true;
  c.hp = Math.max(1, maxHp * PERK.twardyZycie);
  slad(sim, c.id, 'ocalal', 'twardy');
  perkZadzialal(sim, c, 'twardy', `${imieOsoby(o)} ${rodzaj(sim, c, 'przyjął', 'przyjęła')} cios, który powinien zabić — i ${rodzaj(sim, c, 'wstał', 'wstała')}. „Nie do zdarcia” już ${rodzaj(sim, c, 'go', 'jej')} drugi raz nie ocali.`);
  return true;
}

/** Wołane z sim.kill: osoba zostaje na liście z przyczyną; kronika podaje imię. */
export function poleglaOsoba(sim: Sim, c: Creature, why: string): void {
  const o = osoba(sim, c.id);
  if (!o) return;
  o.polegl = { tik: sim.tick, przyczyna: why };
  slad(sim, c.id, 'smierc');
  sim.gdzie(c.x, c.y).log(`${imieOsoby(o)}, ${rolaOsoby(o)}, ${rodzaj(sim, c, 'poległ', 'poległa')} — ${why}.`, 'krew');
  wyzwol(sim, c, 'smierc');
}

/** Wskrzeszony przy ołtarzu: ta sama osoba (imię, perki) wraca. */
export function wstalaOsoba(sim: Sim, c: Creature): void {
  const o = osoba(sim, c.id);
  if (!o) { nadajTozsamosc(sim, c); return; }
  o.polegl = undefined;
  zalozNaPostac(c, o);
  slad(sim, c.id, 'wstal');
  wyzwol(sim, c, 'wskrzeszony');
}

// ---------------------------------------------------------------- historia świata

/** Zdarzenie w grze: jeśli to wyzwalacz fragmentu tej postaci (Patryk) albo pierwszy taki (Paweł) — odsłania. */
export function wyzwol(sim: Sim, c: Creature, w: Wyzwalacz): void {
  const d = sim.lud.druzyna;
  if (!d) return;
  let f: Fragment | undefined;
  if (d.wariant === 'patryk') {
    const o = osoba(sim, c.id);
    if (!o?.fragment) return;
    f = HISTORIA.find((h) => h.id === o.fragment && h.wyzwalacz === w);
  } else {
    if (!osoba(sim, c.id)) return;
    f = HISTORIA.find((h) => h.wyzwalacz === w && !d.odsloniete.includes(h.id));
  }
  if (!f || d.odsloniete.includes(f.id)) return;
  d.odsloniete.push(f.id);
  slad(sim, c.id, 'fragment', f.id);
  const o = osoba(sim, c.id)!;
  sim.efekt(c.x, c.y - 1.6, 'mysl', 'pamięta…');
  sim.gdzie(c.x, c.y).log(`${imieOsoby(o)} ${rodzaj(sim, c, 'przypomniał', 'przypomniała')} sobie coś o tej górze — ${f.tytul} (atlas).`, 'wiara');
}

/** Co tik (sam pilnuje rytmu): wyzwalacze z miejsca, ślady perków. */
export function tikDruzyny(sim: Sim): void {
  const d = sim.lud.druzyna;
  if (!d || sim.tick % DRUZYNA.sprawdzajCo !== 0) return;
  const w = sim.world;
  const gleboko = w.h * SWIAT.warstwy.srodkowaDo;
  const demon = sim.lud.pomnik && sim.lud.pomnik.faza !== 'stoi' && sim.lud.pomnik.faza !== 'rozpada';
  for (const c of sim.creatures) {
    if (c.dead || !c.imie) continue;
    if (c.y > gleboko) wyzwol(sim, c, 'gleboko');
    if (Math.abs(c.y - w.przedsionekY) < 7 && Math.abs(c.x - w.coreX) < 40) wyzwol(sim, c, 'krypta');
    if (demon) wyzwol(sim, c, 'demon');
    if (weteranStaz(sim, c)) wyzwol(sim, c, 'weteran');
  }
  sladyMnoznikow(sim);
}

/** Ile żyje imiennych postaci. */
export function zywychOsob(sim: Sim): number {
  return (sim.lud.druzyna?.osoby ?? []).filter((o) => !o.polegl && sim.creatureById(o.id) && !sim.creatureById(o.id)!.dead).length;
}
