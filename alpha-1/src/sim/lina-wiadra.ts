import type { Sim } from './sim';
import type { Creature } from './creatures';
import { rolaPostaci } from './lud';
import { kto, zapisz } from './dziennik';
import { stanWiader, poNaprawie, type LinaPrzecieta } from './wiadro';
import { WIADRO } from '../nastawy/wiadro';

/**
 * PRZECIĘTA LINA WIADRA (Alpha, etap 4). W Koszmarze dłoń z otchłani (sim/dlon.ts) potrafi wznieść się spod podłogi
 * sali i przeciąć pazurem linę, na której zjeżdża jedzenie. Wiadro w drodze spada i się roztrzaskuje (sim/wiadro.ts),
 * stojące zostaje bez liny, a z góry nic nie zjedzie, póki ktoś liny nie sklei. Górny kawałek zwisa ze szybu — jego
 * koniec wisi nad dnem tak, że sięgnie go stojący; dolny leży zwinięty przy wiadrze.
 *
 * „Napraw linę” (przycisk przy medalionach i na karcie postaci, rozkaz „naprawa” — sim/polecenia.ts) posyła kogoś
 * z ludu pod szyb: chwyta zwisający koniec, wspina się po nim, owija i wiąże oba kawałki (krokNaprawy — zamiast zwykłego
 * ruchu), lina się napina, a on zsuwa się na dno. Zaraz potem z góry zjeżdża nowe wiadro (poNaprawie).
 * Rysunek: render/wiadro.ts (kikut ze strzępami, zwój, wiadro w kawałkach, napinanie), poza „skleja” — render/lud/ruch.ts.
 */

/** Przecięta lina albo null (cała). */
export function linaPrzecieta(sim: Sim): LinaPrzecieta | null {
  return sim.lud.wiadra?.przecieta ?? null;
}

/** Kto teraz skleja linę (wisi na niej) — albo null. */
export function sklejajacy(sim: Sim): Creature | null {
  const lp = linaPrzecieta(sim);
  if (!lp || lp.naprawia === undefined) return null;
  const c = sim.creatureById(lp.naprawia);
  if (!c || c.dead || !c.naprawia) { lp.naprawia = undefined; return null; }
  return c;
}

/**
 * Gdzie dłoń przetnie linę teraz (kafle) — tuż nad wiadrem, w sali — albo null, gdy w szybie nie ma wiadra na linie.
 * `czeka` — wiadro jest jeszcze w wąskim szybie, gdzie pazur go nie dosięgnie: dłoń czeka pod wylotem szybu.
 */
export function miejsceCiecia(sim: Sim): { x: number; y: number; dno: number; czeka: boolean } | null {
  const st = sim.lud.wiadra;
  if (!st || st.przecieta) return null;
  const wd = st.lista.find((w) => w.faza === 'zapowiedz' || w.faza === 'zjezdza' || w.faza === 'stoi');
  if (!wd) return null;
  const strop = sim.world.szybWiadraDol + 1;
  const nadWiadrem = wd.faza === 'zapowiedz' ? strop : wd.y - 0.9;
  const y = Math.max(strop + 0.4, Math.min(wd.cel - 0.9, nadWiadrem));
  return { x: wd.x, y, dno: wd.cel, czeka: nadWiadrem < y - 0.05 };
}

/** Pazur przeciął linę na wysokości `y`: wiadro w drodze spada, stojące zostaje, nic więcej nie zjedzie. */
export function przetnijLine(sim: Sim, y: number): boolean {
  const st = stanWiader(sim);
  const m = miejsceCiecia(sim);
  if (st.przecieta || !m || m.czeka) return false;
  for (const wd of st.lista) {
    // wiadro jeszcze w skale nad szybem — wciągają je z powrotem, nie zjedzie
    if (wd.faza === 'zapowiedz') { wd.faza = 'odjezdza'; wd.od = sim.tick - WIADRO.odjazd; continue; }
    // w drodze w dół leci dalej z tą samą prędkością, a puste, które jechało w górę, zaczyna spadać od zera
    if (wd.faza === 'zjezdza' || wd.faza === 'odjezdza') { wd.v = wd.faza === 'zjezdza' ? wd.v : 0; wd.faza = 'spada'; wd.od = sim.tick; }
  }
  st.przecieta = { od: sim.tick, x: m.x, koniec: m.dno + 1 - WIADRO.naprawa.koniecNadDnem, dno: m.dno, ciecie: y };
  st.ciec = (st.ciec ?? 0) + 1;
  for (let k = 0; k < 6; k++) sim.spark(m.x + 0.5, y, 'hit');
  sim.gdzie(m.x, y).log('Dłoń z otchłani przecięła linę wiadra. Z góry nic nie zjedzie, póki ktoś jej nie sklei — „napraw linę”.', 'krew', 'lina-przecieta');
  zapisz(sim, 'swiat', `lina wiadra przecięta na wysokości ${y.toFixed(1)}`, m.x, Math.round(y));
  return true;
}

/** Przerywa sklejanie (rozkaz odwołany, ktoś inny przejął): wiszący zsuwa się na dno. */
export function przerwijNaprawe(sim: Sim, c: Creature): void {
  const n = c.naprawia;
  if (!n) return;
  if (n.faza !== 'schodzi') { n.faza = 'schodzi'; n.od = sim.tick; }
  const lp = linaPrzecieta(sim);
  if (lp?.naprawia === c.id) lp.naprawia = undefined;
  c.czynnosc = undefined;
}

/** Stanął pod zwisającym końcem — chwyta go i zaczyna się wspinać (dalej krokNaprawy). */
export function zacznijNaprawe(sim: Sim, c: Creature): boolean {
  const lp = linaPrzecieta(sim);
  if (!lp || (sklejajacy(sim) && lp.naprawia !== c.id)) return false;
  lp.naprawia = c.id;
  c.naprawia = { faza: 'wspina', od: sim.tick, x: lp.x, dno: lp.dno };
  c.droga = undefined; c.jx = lp.x; c.jy = lp.dno;
  c.zamiar = 'chwyta zwisający koniec liny i wspina się po nim'; c.zamiarDo = sim.tick + 240;
  zapisz(sim, 'praca', `${kto(sim, c)}: chwyta przeciętą linę wiadra`, lp.x, lp.dno);
  return true;
}

/**
 * Ruch przy naprawie (wołane z creatures.ts zamiast zwykłego ruchu): wspina się po zwisającym końcu, wisi i skleja,
 * a gdy lina się napnie — zsuwa się na dno. Zwraca false, gdy skończył (dalej żyje zwyczajnie).
 */
export function krokNaprawy(sim: Sim, c: Creature): boolean {
  const n = c.naprawia;
  if (!n) return false;
  const N = WIADRO.naprawa;
  const lp = linaPrzecieta(sim);
  const koniec = (): boolean => { c.naprawia = undefined; c.czynnosc = undefined; c.jt = 0; c.droga = undefined; c.zamiarDo = sim.tick; return false; };
  // lina już cała (skleił ją ktoś inny) albo zniknęła — puszcza i schodzi
  if (!lp && n.faza !== 'schodzi') { n.faza = 'schodzi'; n.od = sim.tick; }
  const bx = n.x + 0.5;
  c.vy = 0; c.droga = undefined;
  if (Math.abs(c.x - bx) > 0.02) c.x += Math.sign(bx - c.x) * Math.min(Math.abs(bx - c.x), 0.05);
  if (n.faza === 'wspina') {
    const cel = n.dno - N.wspinaczka;
    if (c.y > cel) {
      c.y = Math.max(cel, c.y - N.wspinaczkaV);
      c.wspina = sim.tick;
      c.face = c.id % 2 ? 1 : -1;
      c.zamiar = 'wspina się po zwisającej linie wiadra'; c.zamiarDo = sim.tick + 120;
      return true;
    }
    n.faza = 'skleja'; n.od = sim.tick;
  }
  if (n.faza === 'skleja') {
    c.czynnosc = 'skleja';
    c.zamiar = 'wisi na linie i skleja ją — owija i wiąże oba kawałki';
    c.zamiarDo = n.od + N.sklejanie;
    if (sim.tick - n.od < N.sklejanie) return true;
    naprawiona(sim, c);
    n.faza = 'schodzi'; n.od = sim.tick;
  }
  // schodzi: zsuwa się po napiętej linie na dno
  c.czynnosc = undefined;
  if (c.y < n.dno) {
    c.y = Math.min(n.dno, c.y + N.zjazdV);
    c.wspina = sim.tick;
    c.zamiar = 'zsuwa się po linie na dno'; c.zamiarDo = sim.tick + 60;
    return true;
  }
  return koniec();
}

/** Lina sklejona: napina się, a z góry od razu zjeżdża wiadro (z resztkami rozsypanego jedzenia). */
function naprawiona(sim: Sim, c: Creature): void {
  const st = stanWiader(sim);
  const lp = st.przecieta;
  if (!lp) return;
  st.przecieta = undefined;
  st.naprawionaT = sim.tick;
  if (c.polecenie?.typ === 'naprawa') c.polecenie = undefined;
  poNaprawie(sim);
  sim.stat.naprawLin = (sim.stat.naprawLin ?? 0) + 1;
  const r = rolaPostaci(c);
  sim.gdzie(lp.x, lp.dno).log(`${r ? kto(sim, c).split(' (')[0] : 'Ktoś'} skleił linę wiadra — napina się, a z góry już zjeżdża jedzenie.`, 'swiat', 'lina-naprawiona');
  zapisz(sim, 'praca', `${kto(sim, c)}: lina wiadra sklejona`, lp.x, lp.dno);
}
