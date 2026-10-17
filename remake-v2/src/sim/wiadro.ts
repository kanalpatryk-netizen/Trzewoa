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
interface Grupa { x: number; y: number; gora: number; czlonkowie: Creature[]; potrzeba: number }

/**
 * Skupiska ludu od najbardziej potrzebującego: liczy się, ilu ich jest i jak bardzo są głodni,
 * minus jedzenie, które już mają blisko (wiadra stojące albo zjeżdżające obok). Wiadro zjeżdża
 * tam, gdzie lud jest — przy siedzibie na górze lądowało, gdy warta pod rdzeniem umierała z głodu.
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
    for (const wd of wiadra(sim)) {
      if (wd.porcje > 0 && wd.faza !== 'odjezdza' && Math.hypot(wd.x - x, wd.cel - y) < 22) potrzeba -= wd.porcje * LUD.posilek;
    }
    out.push({ x, y, gora: Math.min(...czlonkowie.map((o) => o.y)), czlonkowie, potrzeba });
  }
  return out.sort((a, b) => b.potrzeba - a.potrzeba);
}

/** Strop jamy nad (x, y): pierwszy pusty kafel licząc w górę, nie wyżej niż zawał. */
function sufitNad(sim: Sim, x: number, y: number): number {
  const w = sim.world;
  const gora = Math.max(0, sim.lud.zawal?.strop ?? 0);
  let su = y;
  while (su - 1 >= gora && w.passable(x, su - 1)) su--;
  return su;
}

/**
 * Miejsce dla wiadra przy najbardziej potrzebującej grupie ludu: w każdej kolumnie wokół niej, od
 * niewiele nad nią w dół, pierwsze odkryte puste miejsce, do którego ta grupa dojdzie (z podłogą
 * pod spodem). Z tych — najbliżej grupy, a jama za niska na zjazd gorzej. Gdy przy pierwszej grupie
 * nie ma gdzie — następna.
 */
export function wybierzMiejsce(sim: Sim): { x: number; sufit: number; cel: number } | null {
  if (!klanLudu(sim)) return null;
  for (const g of grupyWgPotrzeby(sim).slice(0, 3)) {
    const m = miejscePrzyGrupie(sim, g);
    if (m) return m;
  }
  return null;
}

function miejscePrzyGrupie(sim: Sim, g: Grupa): { x: number; sufit: number; cel: number } | null {
  const w = sim.world;
  // szuka od tej postaci z grupy, która stoi najbliżej jej środka
  const skad = [...g.czlonkowie].sort((a, b) => Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y))[0];
  if (!skad || !w.inb(Math.floor(skad.x), Math.floor(skad.y))) return null;
  const zb = dostepneOd(sim, skad);
  if (!zb.size) return null;
  const gx = Math.round(g.x);
  const gora = Math.max(1, sim.lud.zawal?.strop ?? 0, Math.floor(g.gora) - WIADRO.nadSiedziba);
  const fala = falaTrwa(sim);
  let best: { x: number; sufit: number; cel: number } | null = null, bs = Infinity;
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
        const ocena = Math.abs(yy - g.y) + Math.abs(x - g.x) * 0.5 + (yy - su + 1 < WIADRO.wysokoscMin ? 10 : 0);
        if (ocena < bs) { bs = ocena; best = { x, sufit: su, cel: yy }; }
        break;
      }
    }
  }
  return best;
}

function dodajWiadro(sim: Sim, m: { x: number; sufit: number; cel: number }, porcje: number, nakarm: boolean): Wiadro {
  const st = stan(sim);
  const v = Math.max(WIADRO.zjazd, (m.cel - m.sufit) / WIADRO.zjazdMaks);
  const wd: Wiadro = { id: ++st.nr, x: m.x, sufit: m.sufit, cel: m.cel, y: m.sufit - 1, faza: 'zapowiedz', od: sim.tick, porcje, pelne: porcje, v, nakarm };
  st.lista.push(wd);
  zapisz(sim, 'swiat', `wiadro #${wd.id}: ${porcje} porcji → (${m.x}, ${m.cel})${nakarm ? ' — Nakarm' : ''}`, m.x, m.cel);
  return wd;
}

/** Co tik symulacji (sam pilnuje rytmu). */
export function tikWiader(sim: Sim): void {
  const st = stan(sim);
  if (sim.tick >= st.nastepne) {
    st.nastepne = sim.tick + WIADRO.co;
    const pelnych = st.lista.filter((wd) => wd.porcje > 0 && wd.faza !== 'odjezdza').length;
    if (pelnych < WIADRO.maks) {
      const m = wybierzMiejsce(sim);
      if (m) dodajWiadro(sim, m, porcjeNaLud(sim), false);
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
  if (y < (sim.lud.zawal?.strop ?? 0)) return 'Tam góra już się zawaliła.';
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
