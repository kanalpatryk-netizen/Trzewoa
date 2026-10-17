/**
 * WIADRO Z JEDZENIEM (Remake v2). Liczby są w src/nastawy/wiadro.ts.
 *
 * Grzyba i spiżarni już nie ma. Co 40 sekund z góry, na linie, zjeżdża wiadro pełne jedzenia —
 * do pierwszego odkrytego, pustego miejsca, do którego lud może dojść (szuka od niewiele nad
 * siedzibą w dół, w pasie kolumn wokół niej). Najpierw ze stropu jamy sypie się pył, potem wiadro
 * wyłania się ze skały i powoli zjeżdża na podłogę. Lud je z niego (robotnicy noszą porcje tym,
 * którzy stoją daleko — na warcie pod rdzeniem), a puste wiadro odjeżdża w górę.
 *
 * Kto skrajnie głoduje, nie czeka, aż wiadro zjedzie: biegnie pod linę, wspina się po niej,
 * wsiada do wiadra w locie i zaczyna jeść od razu (krokNaLinie, wołane z creatures.ts).
 *
 * Ryt „Nakarm” spuszcza dodatkowe wiadro tam, gdzie wskażesz (wiadroNaZadanie).
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { WIADRO } from '../nastawy/wiadro';
import { LUD } from '../nastawy/lud';
import { STWORZENIA as K } from '../nastawy/stworzenia';
import { klanLudu, rolaPostaci, maxHp, type MiejsceJedzenia } from './lud';
import { szukajDrogi, budzetDrog, nowyTik, stoi } from './droga';
import { falaTrwa, wStrefieStraznikow } from './straznicy';
import { STRAZNICY } from '../nastawy/straznicy';
import { zapisz } from './dziennik';
import { T } from './tiles';
import { SWIAT } from '../nastawy/swiat';
import { SURFACE_Y } from './world';

export type FazaWiadra = 'zapowiedz' | 'zjezdza' | 'stoi' | 'odjezdza';

export interface Wiadro {
  id: number;
  /** Kolumna liny i wiadra. */
  x: number;
  /** Pierwszy pusty kafel pod stropem jamy — stąd wyłania się z góry. */
  sufit: number;
  /** Kafel, na którym stanie (pod nim podłoga). */
  cel: number;
  /** Kafel, w którym jest teraz (ułamek w czasie jazdy). */
  y: number;
  faza: FazaWiadra;
  /** Tik początku fazy. */
  od: number;
  porcje: number;
  pelne: number;
  /** Prędkość zjazdu (kafle na tik). */
  v: number;
  /** Spuszczone rytem „Nakarm”. */
  nakarm?: boolean;
  /** Alpha: zjeżdża szybem z powierzchni do sali z siedzibą — z góry dosypują do niego, nie odjeżdża zapomniane. */
  szyb?: boolean;
}

export interface StanWiader {
  lista: Wiadro[];
  /** Tik następnego wiadra. */
  nastepne: number;
  nr: number;
  /** Tik ostatniego wyłonienia się wiadra — ekran gra wtedy dźwięk. */
  zjazdT?: number;
}

function stan(sim: Sim): StanWiader {
  return (sim.lud.wiadra ??= { lista: [], nastepne: WIADRO.pierwsze, nr: 0 });
}

/** Wszystkie wiadra (do rysunku i do karty postaci). */
export function wiadra(sim: Sim): Wiadro[] {
  return sim.lud.wiadra?.lista ?? [];
}

export function wiadroId(sim: Sim, id: number | undefined): Wiadro | null {
  if (id === undefined) return null;
  return wiadra(sim).find((w) => w.id === id) ?? null;
}

/** Ile tików do następnego wiadra. */
export function doNastepnego(sim: Sim): number {
  return Math.max(0, stan(sim).nastepne - sim.tick);
}

/** Ile jedzenia czeka w wiadrach (porcje). */
export function porcjiWWiadrach(sim: Sim): number {
  return wiadra(sim).reduce((n, w) => n + (w.faza === 'odjezdza' ? 0 : w.porcje), 0);
}

/** Wiadra, które stoją na ziemi i mają jedzenie — z nich lud je i robotnicy biorą porcje. */
export function zrodlaJedzenia(sim: Sim): MiejsceJedzenia[] {
  return wiadra(sim).filter((wd) => wd.faza === 'stoi' && wd.porcje > 0).map((wd) => ({
    x: wd.x, y: wd.cel, ilosc: wd.porcje, baza: false,
    wez: (n: number) => { const k = Math.min(n, wd.porcje); wd.porcje -= k; return k; },
    odloz: (n: number) => { wd.porcje += n; },
  }));
}

/** Ile porcji wiezie wiadro: tyle na głowę (jedna porcja = jeden posiłek), w granicach. */
function porcjeNaLud(sim: Sim): number {
  let zywych = 0;
  for (const c of sim.creatures) if (!c.dead && rolaPostaci(c)) zywych++;
  return Math.max(WIADRO.porcjiMin, Math.min(WIADRO.porcjiMax, Math.round(zywych * WIADRO.porcjiNaGlowe)));
}

/**
 * Kafle, do których dojdzie postać `skad` — tym samym szukaniem drogi, którym lud chodzi
 * (stopnie w górę, zejścia; Remake v2 bez lin i klamer). Proste zalewanie przejść uznawało za
 * „osiągalne” dna szybów, z których nie ma powrotu.
 */
function dostepneOd(sim: Sim, skad: Creature): Set<number> {
  const zostalo = budzetDrog();
  nowyTik(2);
  const zbior = new Set<number>();
  szukajDrogi(sim, skad, (i) => { zbior.add(i); return false; }, WIADRO.dostepLimit);
  nowyTik(zostalo);
  return zbior;
}

/** Grupa ludu (skupisko) i to, jak bardzo potrzebuje jedzenia. */
interface Grupa { x: number; y: number; gora: number; czlonkowie: Creature[]; potrzeba: number; skad: Creature; zb: Set<number>; bezJedzenia: boolean }

/** Czy wiadro stoi (albo stanie) tam, skąd postać z tym zasięgiem sięgnie po jedzenie (doZapas sięga na dwa kafle). */
function wZasiegu(sim: Sim, zb: Set<number>, wd: { x: number; cel: number }): boolean {
  const w = sim.world;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) if (w.inb(wd.x + dx, wd.cel + dy) && zb.has(w.idx(wd.x + dx, wd.cel + dy))) return true;
  return false;
}

/**
 * Skupiska ludu od najbardziej potrzebującego: liczy się, ilu ich jest i jak bardzo są głodni,
 * minus jedzenie, które już mają blisko (wiadra stojące albo zjeżdżające obok). Wiadro zjeżdża
 * tam, gdzie lud jest — przy siedzibie na górze lądowało, gdy warta pod rdzeniem umierała z głodu.
 * Alpha: liczy się to, do czego dojdzie najgłodniejszy z grupy — wiadro „obok”, ale nad progiem,
 * którego nie przejdzie, go nie nakarmi (robotnicy w kieszeni pod przedsionkiem umierali z głodu
 * dziesięć kafli pod pełnym wiadrem, a następne nie przychodziło, bo grupa „miała jedzenie”).
 */
function grupyWgPotrzeby(sim: Sim): Grupa[] {
  const lud = sim.creatures.filter((c) => !c.dead && rolaPostaci(c) && c.naLinie === undefined);
  const wzieci = new Set<number>();
  const out: Grupa[] = [];
  for (const c of lud) {
    if (wzieci.has(c.id)) continue;
    const czlonkowie = lud.filter((o) => !wzieci.has(o.id) && Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) < 16);
    for (const o of czlonkowie) wzieci.add(o.id);
    const x = czlonkowie.reduce((s, o) => s + o.x, 0) / czlonkowie.length;
    const y = czlonkowie.reduce((s, o) => s + o.y, 0) / czlonkowie.length;
    // naprawdę głodni ważą najwięcej — inaczej wiadro jechało do licznej, sytej grupy, a garstka obok padała
    let potrzeba = czlonkowie.reduce((s, o) => s + 0.15 + Math.max(0, o.hunger - 0.2) * 2.5, 0);
    const skad = czlonkowie.reduce((a, o) => (o.hunger > a.hunger ? o : a));
    const zb = dostepneOd(sim, skad);
    let maJedzenie = false;
    for (const wd of wiadra(sim)) {
      if (wd.porcje <= 0 || wd.faza === 'odjezdza' || !wZasiegu(sim, zb, wd)) continue;
      maJedzenie = true;
      if (Math.hypot(wd.x - x, wd.cel - y) < 22) potrzeba -= wd.porcje * LUD.posilek;
    }
    // do żadnego wiadra nie dojdzie, a już głodnieje — pierwszeństwo (robotnik, który sam dokopał drogę
    // wiernych na dno, umierał tam z głodu, bo wiadra jechały do licznej grupy na górze, która jedzenie miała)
    const bezJedzenia = !maJedzenie && skad.hunger > WIADRO.bezJedzeniaOd;
    if (bezJedzenia) potrzeba += WIADRO.bezJedzeniaPierwszenstwo;
    out.push({ x, y, gora: Math.min(...czlonkowie.map((o) => o.y)), czlonkowie, potrzeba, skad, zb, bezJedzenia });
  }
  return out.sort((a, b) => b.potrzeba - a.potrzeba);
}

/** Strop jamy nad (x, y): pierwszy pusty kafel licząc w górę. */
function sufitNad(sim: Sim, x: number, y: number): number {
  const w = sim.world;
  let su = y;
  while (su - 1 >= 0 && w.passable(x, su - 1)) su--;
  return su;
}

/**
 * Miejsce dla wiadra przy najbardziej potrzebującej grupie ludu: w każdej kolumnie wokół niej, od
 * niewiele nad nią w dół, pierwsze odkryte puste miejsce, do którego ta grupa dojdzie (z podłogą
 * pod spodem). Z tych — najbliżej grupy, a jama za niska na zjazd gorzej. Gdy przy pierwszej grupie
 * nie ma gdzie — następna.
 */
export function wybierzMiejsce(sim: Sim, grupy?: Grupa[]): MiejsceWiadra | null {
  if (!klanLudu(sim)) return null;
  // Alpha, etap 3: zwykłe wiadro zjeżdża szybem z powierzchni do sali z siedzibą (szkic: „jedzenie” z góry) — dla
  // grupy, która dojdzie do dna szybu. Grupa odcięta od sali (zeszła drogą wiernych w głąb, a pod górę lud wchodzi
  // najwyżej o stopień) dostaje wiadro tam, gdzie stoi, jak dawniej: robotnicy dokopali się do przedsionka
  // i umierali tam z głodu, bo całe jedzenie zjeżdżało do sali, do której już nie mieli jak wrócić.
  const sz = miejsceWSzybie(sim);
  for (const g of (grupy ?? grupyWgPotrzeby(sim)).slice(0, 3)) {
    if (sz && wZasiegu(sim, g.zb, sz)) return sz;
    const m = miejscePrzyGrupie(sim, g);
    if (m) return g.bezJedzenia ? { ...m, pilne: true } : m;
  }
  return sz;
}

/**
 * Gdzie zjedzie wiadro: kolumna liny, strop, z którego się wyłoni, kafel, na którym stanie. `pilne` — dla grupy,
 * która do żadnego wiadra nie dojdzie (zjedzie i ponad limit pełnych wiader).
 */
export interface MiejsceWiadra { x: number; sufit: number; cel: number; szyb?: boolean; pilne?: boolean }

/** Alpha: dno szybu z jedzeniem — wiadro zjeżdża tam z samej powierzchni (null, gdy góra nie ma szybu albo go zasypano). */
export function miejsceWSzybie(sim: Sim): MiejsceWiadra | null {
  if (!SWIAT.warstwy.wlaczone || !WIADRO.szybem) return null;
  const w = sim.world;
  const x = w.szybX;
  for (let y = SURFACE_Y - 1; y <= w.szybDol; y++) if (!w.passable(x, y)) return null;
  let cel = w.szybDol;
  while (cel + 1 < w.h && w.passable(x, cel + 1)) cel++;
  if (!stoi(sim, x, cel)) return null;
  return { x, sufit: SURFACE_Y - 1, cel, szyb: true };
}

function miejscePrzyGrupie(sim: Sim, g: Grupa): MiejsceWiadra | null {
  const w = sim.world;
  // Alpha: tam, dokąd dojdzie najgłodniejszy z grupy (wcześniej — ten, kto stał najbliżej jej środka)
  const skad = g.skad;
  if (!w.inb(Math.floor(skad.x), Math.floor(skad.y))) return null;
  const zb = g.zb;
  if (!zb.size) return null;
  const gx = Math.round(skad.x);
  const gora = Math.max(1, Math.floor(Math.min(g.gora, skad.y)) - WIADRO.nadSiedziba);
  const fala = falaTrwa(sim);
  let best: MiejsceWiadra | null = null, bs = Infinity;
  for (let dx = 0; dx <= WIADRO.zasieg; dx++) {
    for (const s of dx ? [-1, 1] : [1]) {
      const x = gx + dx * s;
      if (x < 2 || x >= w.w - 2) continue;
      for (let y = gora; y < w.h - 2; y++) {
        const i = w.idx(x, y);
        if (!w.passable(x, y) || !w.ever[i]) continue;
        // na dno tej pustki
        let yy = y;
        while (yy + 1 < w.h && w.passable(x, yy + 1)) yy++;
        const ci = w.idx(x, yy);
        const dobre = zb.has(ci) && stoi(sim, x, yy) && w.magma[ci] === 0 && w.water[ci] < 3 && w.tile[ci] !== T.SKY
          && !sim.przyMagmie(x, yy, 3) && !(fala && wStrefieStraznikow(sim, x, yy, STRAZNICY.ucieczkaZapas))
          && Math.hypot(x - w.coreX, yy - w.coreY) > 14;
        if (!dobre) { y = yy; continue; }       // tu się nie dojdzie — szukamy niżej w tej kolumnie
        const su = sufitNad(sim, x, yy);
        const ocena = Math.abs(yy - skad.y) + Math.abs(x - skad.x) * 0.5 + (yy - su + 1 < WIADRO.wysokoscMin ? 10 : 0);
        if (ocena < bs) { bs = ocena; best = { x, sufit: su, cel: yy }; }
        break;
      }
    }
  }
  return best;
}

function dodajWiadro(sim: Sim, m: MiejsceWiadra, porcje: number, nakarm: boolean): Wiadro {
  const st = stan(sim);
  const v = Math.max(WIADRO.zjazd, (m.cel - m.sufit) / WIADRO.zjazdMaks);
  const wd: Wiadro = { id: ++st.nr, x: m.x, sufit: m.sufit, cel: m.cel, y: m.sufit - 1, faza: 'zapowiedz', od: sim.tick, porcje, pelne: porcje, v, nakarm };
  if (m.szyb && !nakarm) wd.szyb = true;
  st.lista.push(wd);
  zapisz(sim, 'swiat', `wiadro #${wd.id}: ${porcje} porcji → (${m.x}, ${m.cel})${nakarm ? ' — Nakarm' : ''}`, m.x, m.cel);
  return wd;
}

/** Co tik symulacji (sam pilnuje rytmu). */
export function tikWiader(sim: Sim): void {
  const st = stan(sim);
  if (sim.tick >= st.nastepne) {
    st.nastepne = sim.tick + WIADRO.co;
    const grupy = klanLudu(sim) ? grupyWgPotrzeby(sim) : [];
    // Alpha, etap 3: wiadro, do którego nikt z ludu już nie dojdzie (zostało nad zejściem, którym lud poszedł w dół —
    // pod górę wchodzi najwyżej o stopień), odjeżdża z resztą jedzenia: zajmowało miejsce wiadrom dla tych na dole,
    // a robotnicy przy czole drogi umierali z głodu pod limitem pełnych wiader
    for (const wd of st.lista) {
      if (wd.szyb || wd.nakarm || wd.faza !== 'stoi' || wd.porcje <= 0 || sim.tick - wd.od < WIADRO.nieDojdziePo) continue;
      if (grupy.some((g) => wZasiegu(sim, g.zb, wd))) continue;
      wd.faza = 'odjezdza'; wd.od = sim.tick;
      zapisz(sim, 'swiat', `wiadro #${wd.id}: nikt już do niego nie dojdzie — odjeżdża z ${wd.porcje} porcjami`, wd.x, wd.cel);
    }
    // (wiadro w szybie i te z rytu Nakarm nie zajmują miejsca zwykłym — limit jest na wiadra przy ludzie)
    const pelnych = st.lista.filter((wd) => !wd.szyb && !wd.nakarm && wd.porcje > 0 && wd.faza !== 'odjezdza').length;
    const m = wybierzMiejsce(sim, grupy);
    // Alpha: w szybie wisi jedna lina — gdy wiadro jeszcze stoi w sali, z góry dosypują do niego jedzenia
    const wSzybie = m?.szyb ? st.lista.find((wd) => wd.szyb && wd.faza !== 'odjezdza') : undefined;
    if (m && wSzybie) {
      wSzybie.porcje = Math.min(WIADRO.szybMaks, wSzybie.porcje + porcjeNaLud(sim));
      wSzybie.pelne = Math.max(wSzybie.pelne, wSzybie.porcje);
      for (let k = 0; k < 5; k++) sim.spark(m.x + 0.5 + sim.rng.range(-0.6, 0.6), wSzybie.sufit + 0.2, 'dust');
      zapisz(sim, 'swiat', `wiadro #${wSzybie.id} w szybie: dosypane z góry (${wSzybie.porcje} porcji)`, m.x, m.cel);
    } else if (m && (m.szyb || pelnych < WIADRO.maks + (m.pilne ? WIADRO.ponadLimitDlaOdcietych : 0))) {
      // (grupa odcięta od jedzenia dostaje wiadro i wtedy, gdy limit zajmują wiadra wyżej, do których dojdą inni —
      // robotnicy, którzy przebili się do krypty, umierali tam z głodu pod pięcioma pełnymi wiadrami na drodze)
      dodajWiadro(sim, m, porcjeNaLud(sim), false);
    }
  }
  const w = sim.world;
  for (const wd of st.lista) {
    const t = sim.tick - wd.od;
    if (wd.faza === 'zapowiedz') {
      if (t % 12 === 0) sim.spark(wd.x + 0.5, wd.sufit - 0.1, 'dust');
      if (t >= WIADRO.zapowiedz) {
        wd.faza = 'zjezdza'; wd.od = sim.tick; wd.y = wd.sufit - 0.6; st.zjazdT = sim.tick;
        for (let k = 0; k < 4; k++) sim.spark(wd.x + 0.5, wd.sufit, 'dust');
      }
    } else if (wd.faza === 'zjezdza') {
      wd.y += wd.v;
      // podłoga pod celem zniknęła (wykopana) — wiadro zjeżdża niżej, na nowe dno
      while (wd.cel + 1 < w.h && w.passable(wd.x, wd.cel + 1)) wd.cel++;
      if (wd.y >= wd.cel) {
        wd.y = wd.cel; wd.faza = 'stoi'; wd.od = sim.tick;
        sim.spark(wd.x + 0.5, wd.cel + 0.9, 'dust');
      }
    } else if (wd.faza === 'stoi') {
      // pusty — odjeżdża w górę; ktoś zasypał miejsce — jedzenie przepada pod gruzem
      if (wd.porcje <= 0 || !w.passable(wd.x, wd.cel)) { wd.faza = 'odjezdza'; wd.od = sim.tick; }
      // Alpha: zapomniane — od dawna stoi, a w pobliżu nie ma nikogo z ludu; zajmowało miejsce następnemu
      // (najwyżej `maks` pełnych naraz), a lud głodował daleko od niego
      else if (t > WIADRO.zapomnianePo && t % 120 === 0 && !wd.szyb
          && !sim.creatures.some((c) => !c.dead && rolaPostaci(c) && Math.hypot(c.x - wd.x, c.y - wd.cel) < WIADRO.zapomnianeOd)) {
        wd.faza = 'odjezdza'; wd.od = sim.tick;
        zapisz(sim, 'swiat', `wiadro #${wd.id} zapomniane — odjeżdża z ${wd.porcje} porcjami`, wd.x, wd.cel);
      }
    } else {
      wd.y = wd.cel - (wd.cel - wd.sufit + 1.6) * Math.min(1, t / WIADRO.odjazd);
    }
  }
  st.lista = st.lista.filter((wd) => !(wd.faza === 'odjezdza' && sim.tick - wd.od >= WIADRO.odjazd));
}

/** Zabiera do `n` porcji z wiader (najpierw z najpełniejszych). Zwraca, ile zabrało. */
export function zabierzPorcje(sim: Sim, n: number): number {
  let zostalo = n;
  const pelne = wiadra(sim).filter((wd) => wd.porcje > 0 && wd.faza !== 'odjezdza').sort((a, b) => b.porcje - a.porcje);
  for (const wd of pelne) {
    if (zostalo <= 0) break;
    const ile = Math.min(wd.porcje, zostalo);
    wd.porcje -= ile; zostalo -= ile;
  }
  return n - zostalo;
}

/**
 * Wiadro na start partii albo z karty: od razu, w najbliższym miejscu (bez zapowiedzi).
 * Zwraca false, gdy nie ma gdzie.
 */
export function wiadroTeraz(sim: Sim, porcje?: number): boolean {
  const m = wybierzMiejsce(sim);
  if (!m) return false;
  // Alpha: w szybie wisi jedna lina — do wiadra, które już stoi w sali, dosypują
  const wSzybie = m.szyb ? stan(sim).lista.find((wd) => wd.szyb && wd.faza !== 'odjezdza') : undefined;
  if (wSzybie) {
    wSzybie.porcje += porcje ?? porcjeNaLud(sim);
    wSzybie.pelne = Math.max(wSzybie.pelne, wSzybie.porcje);
    return true;
  }
  const wd = dodajWiadro(sim, m, porcje ?? porcjeNaLud(sim), false);
  wd.od = sim.tick - WIADRO.zapowiedz + 30;
  return true;
}

/**
 * Ryt „Nakarm”: dodatkowe wiadro tam, gdzie wskażesz — na dno pustki pod tym miejscem
 * (odkrytej). Zwraca opis odmowy albo null, gdy wiadro jedzie.
 */
export function wiadroNaZadanie(sim: Sim, tx: number, ty: number): string | null {
  const w = sim.world;
  if (!w.inb(tx, ty)) return 'Tam nie sięga lina.';
  if (wiadra(sim).some((wd) => wd.nakarm && wd.faza !== 'stoi' && wd.faza !== 'odjezdza')) return 'Wiadro już zjeżdża.';
  // z litej skały — najbliższa pustka w tej kolumnie (w dół, potem w górę)
  let y = ty;
  if (!w.passable(tx, y)) {
    let d = 1;
    while (d < 6 && !(w.inb(tx, ty + d) && w.passable(tx, ty + d)) && !(w.inb(tx, ty - d) && w.passable(tx, ty - d))) d++;
    if (d >= 6) return 'Tam jest lita skała.';
    y = w.inb(tx, ty + d) && w.passable(tx, ty + d) ? ty + d : ty - d;
  }
  if (!w.ever[w.idx(tx, y)]) return 'Tego miejsca nikt jeszcze nie widział.';
  let yy = y;
  while (yy + 1 < w.h && w.passable(tx, yy + 1)) yy++;
  if (!stoi(sim, tx, yy) || w.magma[w.idx(tx, yy)] > 0) return 'Tam wiadro nie ma na czym stanąć.';
  dodajWiadro(sim, { x: tx, sufit: sufitNad(sim, tx, yy), cel: yy }, WIADRO.nakarmPorcji, true);
  return null;
}

// ---------------------------------------------------------------- wspinaczka po linie

/** Zjeżdżające wiadro, na które skrajnie głodny jeszcze zdąży się wspiąć (najbliższe w linii prostej). */
export function wiadroDoWspinaczki(sim: Sim, c: Creature): Wiadro | null {
  let best: Wiadro | null = null, bd = Infinity;
  for (const wd of wiadra(sim)) {
    if (wd.porcje <= 0 || (wd.faza !== 'zapowiedz' && wd.faza !== 'zjezdza')) continue;
    if (wd.cel - Math.max(wd.y, wd.sufit) < 2.5) continue;           // już prawie na dole — poczeka na nie
    const d = Math.hypot(wd.x - c.x, wd.cel - c.y);
    if (d < bd) { bd = d; best = wd; }
  }
  return best;
}

/**
 * Ruch na linie (wołane z creatures.ts zamiast zwykłego ruchu): wspina się w górę do wiadra,
 * wsiada do niego, zjeżdża razem z nim i je. Zwraca false, gdy lina się skończyła — wtedy
 * stworzenie żyje dalej zwyczajnie (spada, jeśli wisiało w powietrzu).
 */
export function krokNaLinie(sim: Sim, c: Creature): boolean {
  const wd = wiadroId(sim, c.naLinie);
  const zejdz = () => { c.naLinie = undefined; c.naWiadrze = undefined; c.jt = 0; c.droga = undefined; return false; };
  if (!wd || wd.faza === 'odjezdza') return zejdz();
  const bx = wd.x + 0.5;
  c.vy = 0; c.wspina = sim.tick; c.droga = undefined;
  if (!c.naWiadrze) {
    // wiadro już stoi — schodzi z liny i je normalnie
    if (wd.faza === 'stoi') return zejdz();
    if (Math.abs(c.x - bx) > 0.02) c.x += Math.sign(bx - c.x) * Math.min(Math.abs(bx - c.x), 0.06);
    // pod wiadrem: jego dno to wd.y + 1 — wsiada, gdy rękami sięga dna (głowa tuż pod nim)
    const dno = Math.max(wd.y, wd.sufit - 0.6) + 1;
    if (c.y > dno + 0.8) {
      c.y = Math.max(dno + 0.8, c.y - WIADRO.wspinaczka);
      c.face = c.id % 2 ? 1 : -1;
      c.zamiar = 'umiera z głodu — wspina się po linie do zjeżdżającego wiadra';
      c.zamiarDo = sim.tick + 120;
      return true;
    }
    if (wd.faza === 'zapowiedz') return true;   // wiadro jeszcze w skale — wisi pod stropem i czeka
    c.naWiadrze = true;
    sim.stat.wspinaczek++;
    sim.efekt(bx, wd.y, 'mysl', 'jedzenie!');
  }
  // w wiadrze: jedzie z nim w dół i je
  c.x = bx + (c.id % 2 ? 0.12 : -0.12);
  c.y = wd.y - 0.45;
  c.zamiar = 'siedzi w zjeżdżającym wiadrze i je';
  c.zamiarDo = sim.tick + 120;
  if ((sim.tick + c.id) % WIADRO.jedzenieCo === 0 && wd.porcje > 0 && c.hunger > 0.12) {
    wd.porcje--; sim.meals++;
    c.hunger = Math.max(0, c.hunger - LUD.posilek);
    c.hp = Math.min(maxHp(sim, c), c.hp + K.kesLeczy);
    sim.spark(c.x, c.y - 0.4, 'spore');
  }
  if (wd.faza === 'stoi') {
    // wiadro stanęło — wysiada obok
    c.naLinie = undefined; c.naWiadrze = undefined;
    c.y = wd.cel + 0.2; c.x = bx + (c.id % 2 ? 0.7 : -0.7);
    if (!sim.world.passable(Math.floor(c.x), wd.cel)) c.x = bx;
    c.jt = 0;
    return false;
  }
  return true;
}
