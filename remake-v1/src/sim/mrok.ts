/**
 * MROK (Remake v1) — Ten, który patrzy. Liczby są w src/nastawy/mrok.ts.
 *
 * Nie ma ciała ani życia, nie da się go zabić. Przenika skałę jak Strażnicy Snu, krąży
 * wokół siedziby i wypatruje kogoś, kto został sam daleko od światła. Gdy go znajdzie,
 * podchodzi i patrzy; jeśli nikt nie przyjdzie, a w pobliżu nie rozbłyśnie Cud, zabiera go.
 * Gracz widzi tylko oczy w skale i przygasającą lampkę.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { MROK } from '../nastawy/mrok';
import { rolaPostaci, klanLudu, NAZWA_ROLI } from './lud';
import { zapisz } from './dziennik';

export type FazaMroku = 'czeka' | 'krazy' | 'podchodzi' | 'patrzy';

/** Stan Patrzącego (trafia do zapisu razem z ludem). */
export interface StanMroku {
  x: number; y: number;
  faza: FazaMroku;
  /** Kogo wypatrzył (id postaci) i od kiedy na niego patrzy. */
  cel: number | null;
  od: number;
  /** Do tego tiku czeka w głębi (cisza po ofierze albo po Cudzie). */
  przerwaDo: number;
  /** Dokąd dryfuje, krążąc. */
  kx: number; ky: number;
  ofiary: number;
  /** Ktoś już widział jego oczy — atlas ma tablicę. */
  widziany?: boolean;
  /** Tik ostatniego zdarzenia, które słychać (szept, zabranie, przegnanie) — ekran gra wtedy dźwięk. */
  szeptT?: number;
  zabranyT?: number;
  przegnanyT?: number;
  /** Gdzie ostatnio kogoś zabrał (na rysunku przez chwilę widać sylwetkę). */
  zabranyX?: number; zabranyY?: number;
}

/** Postać ludu, którą Patrzący może wziąć na cel. */
function lowna(c: Creature): boolean {
  if (c.dead || c.straznik || c.buntownik) return false;
  const r = rolaPostaci(c);
  if (!r) return false;
  return !(MROK.rycerzeBezpieczni && r === 'rycerz');
}

/** Światło obozów: siedziba i obozy (z nich lud nie ginie). */
function przyObozie(sim: Sim, x: number, y: number, promien: number): boolean {
  const klan = klanLudu(sim);
  if (klan && Math.hypot(klan.hx - x, klan.hy - y) < promien) return true;
  for (const o of sim.lud.obozy ?? []) if (Math.hypot(o.x - x, o.y - y) < promien * 0.75) return true;
  for (const s of sim.lud.spizarnie ?? []) if (Math.hypot(s.x - x, s.y - y) < promien * 0.75) return true;
  return false;
}

/** Czy ta postać jest teraz sama w ciemności. */
export function samotny(sim: Sim, c: Creature): boolean {
  if (!lowna(c)) return false;
  const w = sim.world;
  if (Math.hypot(w.coreX - c.x, w.coreY - c.y) < MROK.samotnyOdRdzenia) return false;
  if (przyObozie(sim, c.x, c.y, MROK.samotnyOdObozu)) return false;
  const r2 = MROK.samotnyBezLudu * MROK.samotnyBezLudu;
  for (const o of sim.creatures) {
    if (o === c || o.dead || o.straznik || o.buntownik || !rolaPostaci(o)) continue;
    const dx = o.x - c.x, dy = o.y - c.y;
    if (dx * dx + dy * dy < r2) return false;
  }
  return true;
}

function ileLudu(sim: Sim): number {
  let n = 0;
  for (const c of sim.creatures) if (!c.dead && !c.straznik && rolaPostaci(c)) n++;
  return n;
}

function nowyStan(sim: Sim): StanMroku {
  const w = sim.world;
  const klan = klanLudu(sim);
  const x = klan ? klan.hx : w.w / 2, y = klan ? klan.hy + MROK.krazyPromien : w.h / 2;
  return { x, y, faza: 'czeka', cel: null, od: sim.tick, przerwaDo: MROK.pierwszyPo, kx: x, ky: y, ofiary: 0 };
}

/** Nowy punkt krążenia: gdzieś w skale, w ustalonej odległości od siedziby. */
function nowyPunktKrazenia(sim: Sim, m: StanMroku): void {
  const w = sim.world;
  const klan = klanLudu(sim);
  const cx = klan ? klan.hx : w.w / 2, cy = klan ? klan.hy : w.h / 2;
  const a = sim.rng.next() * Math.PI * 2;
  const r = MROK.krazyPromien * (0.8 + sim.rng.next() * 0.5);
  m.kx = Math.max(2, Math.min(w.w - 3, cx + Math.cos(a) * r));
  m.ky = Math.max(4, Math.min(w.h - 3, cy + Math.abs(Math.sin(a)) * r));
}

function idz(m: StanMroku, tx: number, ty: number, tempo: number, krokow: number): number {
  const dx = tx - m.x, dy = ty - m.y;
  const d = Math.hypot(dx, dy);
  const krok = tempo * krokow;
  if (d <= krok) { m.x = tx; m.y = ty; return 0; }
  m.x += (dx / d) * krok; m.y += (dy / d) * krok;
  return d - krok;
}

/** Najbardziej samotny z ludu (najdalej od siedziby), albo nikt. */
function wypatrz(sim: Sim): Creature | null {
  const klan = klanLudu(sim);
  let naj: Creature | null = null, najD = -1;
  for (const c of sim.creatures) {
    if (!samotny(sim, c)) continue;
    const d = klan ? Math.hypot(klan.hx - c.x, klan.hy - c.y) : 0;
    if (d > najD) { najD = d; naj = c; }
  }
  return naj;
}

function zgas(sim: Sim, m: StanMroku, przerwa: number): void {
  m.faza = 'czeka';
  m.cel = null;
  m.przerwaDo = sim.tick + przerwa;
  nowyPunktKrazenia(sim, m);
}

/** Co tik symulacji (sam pilnuje swojego rytmu). */
export function tikMroku(sim: Sim): void {
  if (!MROK.wlaczony || sim.spokojnySwiat || sim.ending) return;
  if (!sim.lud.mrok) sim.lud.mrok = nowyStan(sim);
  const m = sim.lud.mrok;
  const CO = 10;
  if (sim.tick % CO !== 0) return;

  if (m.faza === 'czeka') {
    if (sim.tick < m.przerwaDo) return;
    m.faza = 'krazy';
    nowyPunktKrazenia(sim, m);
  }

  const cel = m.cel !== null ? sim.creatures.find((c) => c.id === m.cel) ?? null : null;

  if (m.faza === 'krazy') {
    if (idz(m, m.kx, m.ky, MROK.tempoKrazy, CO) < 0.5) nowyPunktKrazenia(sim, m);
    if (sim.tick % MROK.szukajCo === 0 && ileLudu(sim) >= MROK.minLudu) {
      const c = wypatrz(sim);
      if (c) { m.faza = 'podchodzi'; m.cel = c.id; m.od = sim.tick; }
    }
    return;
  }

  // podchodzi albo patrzy: cel musi wciąż być sam
  if (!cel || cel.dead || !samotny(sim, cel)) {
    if (cel) cel.zamarlyDo = undefined;
    if (m.faza === 'patrzy' && cel && !cel.dead) {
      sim.gdzie(cel.x, cel.y).log(`${NAZWA_ROLI[rolaPostaci(cel) ?? 'pobozny']} nie był już sam. To, co patrzyło z ciemności, cofnęło się.`, 'swiat');
      cel.fear = Math.max(cel.fear, 0.6);
    }
    zgas(sim, m, m.faza === 'patrzy' ? MROK.przerwaPoUcieczce : 0);
    if (m.przerwaDo <= sim.tick) m.faza = 'krazy';
    return;
  }

  if (m.faza === 'podchodzi') {
    const d = idz(m, cel.x + (cel.x > m.x ? -1.2 : 1.2), cel.y - 0.6, MROK.tempoPodchodzi, CO);
    if (d < MROK.patrzyZ) {
      m.faza = 'patrzy';
      m.od = sim.tick;
      m.widziany = true;
      m.szeptT = sim.tick;
      cel.fear = 1;
      // stoi jak wryty: sam już nie odejdzie — uratuje go Cud albo ktoś, kto do niego przyjdzie
      cel.zamarlyDo = sim.tick + MROK.patrzyTikow + CO;
      sim.gdzie(cel.x, cel.y).log(`${NAZWA_ROLI[rolaPostaci(cel) ?? 'pobozny']} został sam w ciemności. Coś na niego patrzy.`, 'otchlan');
      zapisz(sim, 'swiat', `Patrzący patrzy na #${cel.id}`, cel.x, cel.y);
    }
    return;
  }

  // patrzy: trzyma się przy nim, aż minie czas
  idz(m, cel.x + (cel.x > m.x ? -1.4 : 1.4), cel.y - 0.6, MROK.tempoPodchodzi, CO);
  cel.fear = 1;
  if (sim.tick - m.od >= MROK.patrzyTikow) {
    m.ofiary++;
    m.zabranyT = sim.tick; m.zabranyX = cel.x; m.zabranyY = cel.y;
    const kto = NAZWA_ROLI[rolaPostaci(cel) ?? 'pobozny'];
    sim.kill(cel, 'zabrany przez ciemność', 'mrok');
    sim.gdzie(cel.x, cel.y).log(`${kto} poszedł w ciemność i nie wrócił.`, 'krew');
    zgas(sim, m, MROK.przerwaPoOfierze);
  }
}

/** Cud rzucony w (tx, ty): jeśli Patrzący jest blisko, światło go przegania. */
export function odpedzMrok(sim: Sim, tx: number, ty: number): boolean {
  const m = sim.lud.mrok;
  if (!m || m.faza === 'czeka') return false;
  if (Math.hypot(m.x - tx, m.y - ty) > MROK.cudPromien) return false;
  const cel = m.cel !== null ? sim.creatures.find((c) => c.id === m.cel) : undefined;
  m.przegnanyT = sim.tick;
  sim.gdzie(m.x, m.y).log('Światło Cudu przegnało to, co patrzyło z ciemności.', 'wiara');
  if (cel && !cel.dead) { cel.fear = Math.max(cel.fear, 0.5); cel.zamarlyDo = undefined; }
  zgas(sim, m, MROK.przerwaPoCudzie);
  return true;
}

/** Na kogo teraz patrzy (dla karty postaci i rysunku). */
export function naKogoPatrzy(sim: Sim): number | null {
  const m = sim.lud.mrok;
  return m && m.faza === 'patrzy' ? m.cel : null;
}
