import type { Sim } from './sim';
import type { Creature } from './creatures';
import { Job } from './creatures';
import { rolaPostaci, maxHp } from './lud';
import { stoi, budzetDrog } from './droga';
import { kto, zapisz } from './dziennik';
import { miejsceWPom, pomieszczenieId, zdarzenie, type Pomieszczenie } from './pomieszczenia';
import { ZBROJA, CZESC, type CzescZbroi } from '../nastawy/zbroja';
import type { MnoznikiRoli } from '../nastawy/lud';

/**
 * ZBROJA RYCERZA (Alpha, etap 3f). Kuźnia wykuwa części (sim.zbroja — wykute, sim/pomieszczenia.ts) i odkłada je
 * na wieszak; na wieszaku wisi to, czego nikt jeszcze nie nosi. Rycerz idzie po nie sam, gdy nie ma fali Strażników,
 * rozkazu ani głodu (planZbroi z planera ludu), albo gdy go tam poślesz (rozkaz „zbroja” — sim/polecenia.ts). Staje
 * pod wieszakiem i zakłada część po części (czynność „zaklada”, tikZbroi), a potem wraca do swoich zajęć.
 * Premie: mnoznikZbroi (życie, siła, szybkość — sim/lud.ts: mnoznik) i ranyZbroi (tarcza — ciosy Strażników i walka).
 * Rysunek: render/lud/rycerz.ts i helm.ts (co nosi) oraz render/pomieszczenia.ts (wieszak, część leci do rycerza).
 */

/** Wykute części, których nikt nie nosi — wiszą na wieszaku w kuźni. */
export function naWieszaku(sim: Sim): CzescZbroi[] {
  const noszone = new Set<string>();
  for (const c of sim.creatures) for (const z of c.zbroja ?? []) noszone.add(z);
  return (sim.zbroja as CzescZbroi[]).filter((id) => !noszone.has(id));
}

/** Czy postać nosi tę część zbroi. */
export function nosi(c: Creature, cz: CzescZbroi): boolean {
  return !!c.zbroja?.includes(cz);
}

/** Mnożnik życia, siły albo szybkości od zbroi, którą rycerz nosi (inni zbroi z kuźni nie noszą). */
export function mnoznikZbroi(c: Creature, co: keyof MnoznikiRoli): number {
  if (!c.zbroja?.length || (co !== 'hp' && co !== 'sila' && co !== 'szybkosc')) return 1;
  let v = 1;
  for (const z of c.zbroja) v *= ZBROJA.premie[z]?.[co] ?? 1;
  return v;
}

/** Ile zostaje z rany (tarcza zmniejsza ciosy). */
export function ranyZbroi(c: Creature): number {
  return nosi(c, 'tarcza') ? ZBROJA.premie.tarcza.rany ?? 1 : 1;
}

/** Miejsce rycerza w kuźni: pod wieszakiem (prawa strona izby, za kowadłem), twarzą do wieszaka i kowadła. */
export function miejscePodWieszakiem(pom: Pomieszczenie): [number, number, number] {
  const [x, y] = miejsceWPom(pom, 2);
  return [x, y, -1];
}

/** Najbliższa gotowa kuźnia (w linii prostej). */
function najblizszaKuznia(sim: Sim, c: Creature): Pomieszczenie | null {
  let best: Pomieszczenie | null = null, bd = Infinity;
  for (const p of sim.pomieszczenia) {
    if (!p.gotowe || p.rodzaj !== 'kuznia') continue;
    const d = Math.hypot(p.x + p.w / 2 - c.x, p.y + p.h / 2 - c.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/** Czy rycerz pójdzie sam po zbroję: część wisi, gotowa kuźnia stoi, nie jest głodny i niedawno nie zawrócił. */
export function idziePoZbroje(sim: Sim, c: Creature): boolean {
  if (rolaPostaci(c) !== 'rycerz' || c.polecenie || c.hunger >= ZBROJA.glodDo || sim.tick < (c.zbrojaBezDo ?? 0)) return false;
  return naWieszaku(sim).length > 0 && !!najblizszaKuznia(sim, c);
}

/**
 * Rycerz idzie do kuźni i zakłada części z wieszaka. `pomId` — kuźnia z rozkazu (inaczej najbliższa).
 * 'zaklada' / 'idzie' — zajęty tym; 'nic' — nic nie wisi albo nie ma kuźni; 'nie dojdzie' — nie ma drogi.
 */
export function planZbroi(sim: Sim, c: Creature, pomId: number | undefined,
  naDroge: (d: number[], x?: number, y?: number) => void,
  zamiar: (opis: string, job: Job, jt: number) => void,
  droga: (cel: (x: number, y: number) => boolean, limit: number) => number[] | null,
  podroz: (d: number[]) => number): 'zaklada' | 'idzie' | 'nic' | 'nie dojdzie' {
  const czesci = naWieszaku(sim);
  const pom = pomId !== undefined ? pomieszczenieId(sim, pomId) : najblizszaKuznia(sim, c);
  if (!czesci.length || !pom || !pom.gotowe || pom.rodzaj !== 'kuznia') { c.doKuzni = undefined; c.zakladanie = 0; return 'nic'; }
  const [mx, my, kier] = miejscePodWieszakiem(pom);
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const cz = CZESC[czesci[0]];
  c.doKuzni = pom.id;
  const tutaj = cx === mx && cy === my && stoi(sim, cx, cy);
  // staje dokładnie pod wieszakiem; kafel obok wystarczy, gdy tam nie dojdzie (np. stoi tam ktoś przy kowadle)
  const dTam = tutaj || budzetDrog() <= 0 ? null : droga((x, y) => x === mx && y === my && stoi(sim, x, y), ZBROJA.szukanieDrogi);
  if (tutaj || (!dTam && Math.abs(cx - mx) <= 1 && cy === my && stoi(sim, cx, cy))) {
    c.jx = cx; c.jy = cy; c.droga = undefined;
    c.face = kier;
    c.czynnosc = 'zaklada';
    zamiar(`zakłada ${cz.biernik} z wieszaka w kuźni`, Job.STOI, Math.max(30, ZBROJA.zakladanieTikow - (c.zakladanie ?? 0) + 1));
    return 'zaklada';
  }
  c.zakladanie = 0;
  if (budzetDrog() <= 0) { zamiar('zastanawia się, którędy iść', Job.STOI, 30); return 'idzie'; }
  const d = dTam ?? droga((x, y) => Math.abs(x - mx) <= 1 && y === my && stoi(sim, x, y), ZBROJA.szukanieDrogi);
  if (d) {
    naDroge(d, mx, my);
    zamiar(`idzie do kuźni — na wieszaku czeka ${czesci.length > 1 ? `${czesci.length} części zbroi` : cz.nazwa}`, Job.WANDER, podroz(d) + 60);
    return 'idzie';
  }
  c.doKuzni = undefined;
  return 'nie dojdzie';
}

/** Co tik: kto stoi pod wieszakiem i zakłada — po chwili część jest na nim (błysk, wpis w kronice). */
export function tikZbroi(sim: Sim): void {
  for (const c of sim.creatures) {
    // (walka przerywa zakładanie — wtedy planer ustawia inne zajęcie)
    if (c.dead || c.czynnosc !== 'zaklada' || c.doKuzni === undefined || c.job !== Job.STOI) continue;
    const pom = pomieszczenieId(sim, c.doKuzni);
    const czesci = naWieszaku(sim);
    if (!pom || !czesci.length) { koniec(sim, c); continue; }
    const [mx, my] = miejscePodWieszakiem(pom);
    if (Math.abs(Math.floor(c.x) - mx) > 1 || Math.floor(c.y) !== my) continue;
    c.zakladanie = (c.zakladanie ?? 0) + 1;
    if (c.zakladanie < ZBROJA.zakladanieTikow) continue;
    c.zakladanie = 0;
    zaloz(sim, c, czesci[0], pom);
    if (czesci.length === 1) koniec(sim, c);
    else c.jt = 0;   // następna część — planer od razu ustawi nowy zamiar
  }
}

/** Część z wieszaka trafia na rycerza: życie rośnie o tyle, o ile urosło największe życie. */
function zaloz(sim: Sim, c: Creature, cz: CzescZbroi, pom: Pomieszczenie): void {
  const przed = maxHp(sim, c);
  (c.zbroja ??= []).push(cz);
  const po = maxHp(sim, c);
  if (po > przed) c.hp = Math.min(po, c.hp + (po - przed));
  const [mx, my] = miejscePodWieszakiem(pom);
  zdarzenie(sim, { rodzaj: 'zbroja', kto: c.id, czesc: cz, x: mx + 0.1, y: my - 1.55, tik: sim.tick });
  const C = CZESC[cz];
  sim.gdzie(mx, my).log(`Rycerz założył ${C.biernik} — ${C.skutek}.`, 'swiat', `zbroja-${c.id}-${cz}`);
  zapisz(sim, 'praca', `${kto(sim, c)}: zakłada ${C.biernik} (${C.skutek})`, mx, my);
}

/** Wszystko założone (albo nic już nie wisi) — rozkaz do kuźni się kończy, rycerz wraca do swoich zajęć. */
function koniec(sim: Sim, c: Creature): void {
  c.czynnosc = undefined; c.doKuzni = undefined; c.zakladanie = 0;
  if (c.polecenie?.typ === 'zbroja') c.polecenie = undefined;
  c.jt = 0; c.zamiarDo = sim.tick;
}

/** Wiersz na karcie postaci: co nosi i co mu to daje (bez aureoli — zbroję widać na rycerzu). */
export function opisZbroi(c: Creature): string | null {
  if (!c.zbroja?.length) return null;
  return c.zbroja.map((z) => `${CZESC[z].nazwa}: ${CZESC[z].skutek}`).join(', ');
}
