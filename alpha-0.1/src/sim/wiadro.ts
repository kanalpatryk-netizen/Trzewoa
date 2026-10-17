/**
 * WIADRO Z JEDZENIEM (Remake v2; Alpha: jedno wiadro w szybie). Liczby są w src/nastawy/wiadro.ts.
 *
 * Grzyba i spiżarni już nie ma. Co 40 sekund z góry, na linie, zjeżdża wiadro pełne jedzenia — zawsze tym samym,
 * węższym otworem obok szybu ze światłem, na dno tej kolumny (decyzja użytkownika: wiadro jest jedno, ma jeden punkt,
 * w który spada). Kto wykopie dziurę pod wiadrem, sprowadzi je niżej — lina sięga do dna kolumny. Gdy poprzednie
 * wiadro jeszcze stoi, z góry do niego dosypują. Najpierw ze stropu sypie się pył, potem wiadro wyłania się ze skały
 * i powoli zjeżdża na dno. Lud je z niego (robotnicy noszą porcje tym, którzy stoją daleko), a puste odjeżdża w górę.
 *
 * Kto skrajnie głoduje, nie czeka, aż wiadro zjedzie: biegnie pod linę, wspina się po niej,
 * wsiada do wiadra w locie i zaczyna jeść od razu (krokNaLinie, wołane z creatures.ts).
 *
 * Ryt „Nakarm” dosypuje do tego samego wiadra albo spuszcza je od razu (wiadroNaZadanie).
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { WIADRO } from '../nastawy/wiadro';
import { LUD } from '../nastawy/lud';
import { STWORZENIA as K } from '../nastawy/stworzenia';
import { klanLudu, rolaPostaci, maxHp, type MiejsceJedzenia } from './lud';
import { stoi } from './droga';
import { zapisz } from './dziennik';
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

/** Gdzie zjedzie wiadro: kolumna liny, strop, z którego się wyłoni, kafel, na którym stanie. */
export interface MiejsceWiadra { x: number; sufit: number; cel: number }

/**
 * Alpha: jedyne miejsce, w które zjeżdża wiadro — dno szybu z jedzeniem (null, gdy góra nie ma szybu albo go zasypano).
 * Etap 3d: węższym otworem na prawo od szybu ze światłem (pod tamtym stoi ołtarz). Wiadro staje na najniższym pustym
 * kaflu tej kolumny — kto wykopie pod nim dziurę, ten sprowadzi je niżej (decyzja użytkownika: wiadro jest jedno).
 */
export function miejsceWSzybie(sim: Sim): MiejsceWiadra | null {
  if (!SWIAT.warstwy.wlaczone) return null;
  const w = sim.world;
  const x = w.szybWiadraX;
  for (let y = SURFACE_Y - 1; y <= w.szybWiadraDol; y++) if (!w.passable(x, y)) return null;
  const cel = dnoKolumny(sim, x, w.szybWiadraDol);
  if (!stoi(sim, x, cel)) return null;
  return { x, sufit: SURFACE_Y - 1, cel };
}

/** Najniższy pusty kafel kolumny `x` od `y` w dół (tam staje wiadro). */
function dnoKolumny(sim: Sim, x: number, y: number): number {
  const w = sim.world;
  while (y + 1 < w.h && w.passable(x, y + 1)) y++;
  return y;
}

/** Wiadro, które jest teraz w szybie (zapowiedź, zjazd albo stoi na dnie) — najwyżej jedno. */
function wiadroWSzybie(sim: Sim): Wiadro | undefined {
  return stan(sim).lista.find((wd) => wd.faza !== 'odjezdza');
}

function dodajWiadro(sim: Sim, m: MiejsceWiadra, porcje: number, nakarm: boolean): Wiadro {
  const st = stan(sim);
  const v = Math.max(WIADRO.zjazd, (m.cel - m.sufit) / WIADRO.zjazdMaks);
  const wd: Wiadro = { id: ++st.nr, x: m.x, sufit: m.sufit, cel: m.cel, y: m.sufit - 1, faza: 'zapowiedz', od: sim.tick, porcje, pelne: porcje, v, nakarm, szyb: true };
  st.lista.push(wd);
  zapisz(sim, 'swiat', `wiadro #${wd.id}: ${porcje} porcji → (${m.x}, ${m.cel})${nakarm ? ' — Nakarm' : ''}`, m.x, m.cel);
  return wd;
}

/** Z góry dosypują do wiadra, które jest w szybie (pył sypie się ze stropu). */
function dosyp(sim: Sim, wd: Wiadro, porcje: number, limit: number): void {
  wd.porcje = Math.min(limit, wd.porcje + porcje);
  wd.pelne = Math.max(wd.pelne, wd.porcje);
  for (let k = 0; k < 5; k++) sim.spark(wd.x + 0.5 + sim.rng.range(-0.6, 0.6), wd.sufit + 0.2, 'dust');
  zapisz(sim, 'swiat', `wiadro #${wd.id} w szybie: dosypane z góry (${wd.porcje} porcji)`, wd.x, wd.cel);
}

/** Co tik symulacji (sam pilnuje rytmu). */
export function tikWiader(sim: Sim): void {
  const st = stan(sim);
  if (sim.tick >= st.nastepne) {
    st.nastepne = sim.tick + WIADRO.co;
    // Alpha (decyzja użytkownika): wiadro jest jedno i zjeżdża tylko szybem — nie do tych, którzy zeszli w głąb.
    // W szybie wisi jedna lina: gdy wiadro jeszcze tam jest, z góry dosypują do niego jedzenia.
    const m = klanLudu(sim) ? miejsceWSzybie(sim) : null;
    const wSzybie = wiadroWSzybie(sim);
    if (m && wSzybie) dosyp(sim, wSzybie, porcjeNaLud(sim), WIADRO.szybMaks);
    else if (m) dodajWiadro(sim, m, porcjeNaLud(sim), false);
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
      wd.cel = dnoKolumny(sim, wd.x, wd.cel);
      if (wd.y >= wd.cel) {
        wd.y = wd.cel; wd.faza = 'stoi'; wd.od = sim.tick;
        sim.spark(wd.x + 0.5, wd.cel + 0.9, 'dust');
      }
    } else if (wd.faza === 'stoi') {
      // pusty — odjeżdża w górę; ktoś zasypał miejsce — jedzenie przepada pod gruzem
      if (wd.porcje <= 0 || !w.passable(wd.x, wd.cel)) { wd.faza = 'odjezdza'; wd.od = sim.tick; }
      // ktoś wykopał dziurę pod stojącym wiadrem — lina popuszcza i wiadro zjeżdża na nowe dno
      else if (w.passable(wd.x, wd.cel + 1)) { wd.faza = 'zjezdza'; wd.od = sim.tick; wd.cel = dnoKolumny(sim, wd.x, wd.cel); }
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
    const k = Math.min(zostalo, wd.porcje);
    wd.porcje -= k;
    zostalo -= k;
  }
  return n - zostalo;
}

/**
 * Wiadro na start partii albo z karty: od razu, szybem (bez zapowiedzi); do wiadra, które już jest w szybie, dosypują.
 * Zwraca false, gdy szyb zasypano.
 */
export function wiadroTeraz(sim: Sim, porcje?: number): boolean {
  const m = miejsceWSzybie(sim);
  if (!m) return false;
  const wSzybie = wiadroWSzybie(sim);
  if (wSzybie) { dosyp(sim, wSzybie, porcje ?? porcjeNaLud(sim), Infinity); return true; }
  const wd = dodajWiadro(sim, m, porcje ?? porcjeNaLud(sim), false);
  wd.od = sim.tick - WIADRO.zapowiedz + 30;
  return true;
}

/**
 * Ryt „Nakarm”: dodatkowe jedzenie z góry — tym samym szybem, do jednego wiadra (decyzja użytkownika: wiadro jest
 * jedno). Gdy wiadro jest w szybie, dosypują do niego; gdy nie — zjeżdża od razu. Zwraca opis odmowy albo null.
 */
export function wiadroNaZadanie(sim: Sim): string | null {
  const m = miejsceWSzybie(sim);
  if (!m) return 'Szyb z wiadrem jest zasypany.';
  const wSzybie = wiadroWSzybie(sim);
  if (wSzybie) { dosyp(sim, wSzybie, WIADRO.nakarmPorcji, Infinity); return null; }
  dodajWiadro(sim, m, WIADRO.nakarmPorcji, true);
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
