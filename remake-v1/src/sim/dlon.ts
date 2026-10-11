/**
 * DŁOŃ Z OTCHŁANI (Remake v1, tylko Koszmar). Liczby są w src/nastawy/dlon.ts.
 *
 * Otchłań to nieznane — ta część góry, której nikt nie widział albo o której już zapomniano.
 * Rzadko, gdy ktoś z ludu stoi daleko od światła obozu na samym brzegu nieznanego, w ciemności
 * otwierają się wielkie czerwone oczy. Ofiara (jedna, czasem dwie) staje jak wryta. Potem
 * z otchłani wysuwa się ogromna dłoń, chwyta je i cofa się w ciemność; oczy gasną. Nie zostają
 * nawet kości — krew i tak spływa do ciebie. Cud rzucony przy oczach, zanim dłoń chwyci, odpędza ją.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { DLON } from '../nastawy/dlon';
import { rolaPostaci, klanLudu, type Rola } from './lud';
import { zapisz } from './dziennik';
import { MEM_SPAN, SURFACE_Y } from './world';
import { T } from './tiles';

export type FazaDloni = 'brak' | 'oczy' | 'siega' | 'chwyta' | 'cofa' | 'gasnie';

/** Stan wydarzenia (trafia do zapisu razem z ludem). */
export interface StanDloni {
  faza: FazaDloni;
  /** Tik początku bieżącej fazy. */
  od: number;
  /** Kiedy następne losowanie i do kiedy cisza po ostatnim razie. */
  losT: number;
  ciszaDo: number;
  /** Ile razy w tej partii. */
  ile: number;
  /** Oczy (głęboko w otchłani), brzeg otchłani (stąd wychodzi dłoń) i miejsce chwytu. */
  ox: number; oy: number;
  bx: number; by: number;
  cx: number; cy: number;
  /** Kogo bierze (id) i jakie role miały zabrane postacie (dla rysunku w pięści). */
  ofiary: number[];
  zabrani: Rola[];
  /** Cud odpędził ją przed chwytem. */
  odpedzona?: boolean;
  /** Ktoś już widział oczy — atlas ma tablicę. */
  widziana?: boolean;
  /** Tik, w którym otworzyły się oczy / dłoń zacisnęła się — ekran gra wtedy dźwięk. */
  oczyT?: number;
  chwytT?: number;
}

/** Biernik roli: „patrzą na pobożnego”, „zabrała robotnika”. */
const KOGO: Record<Rola, string> = { pobozny: 'pobożnego', robotnik: 'robotnika', rycerz: 'rycerza' };

const DLUGOSC: Record<Exclude<FazaDloni, 'brak'>, number> = {
  oczy: DLON.oczy, siega: DLON.siega, chwyta: DLON.chwyta, cofa: DLON.cofa, gasnie: DLON.gasnie,
};
const NASTEPNA: Record<Exclude<FazaDloni, 'brak'>, FazaDloni> = {
  oczy: 'siega', siega: 'chwyta', chwyta: 'cofa', cofa: 'gasnie', gasnie: 'brak',
};

function nowyStan(): StanDloni {
  return { faza: 'brak', od: 0, losT: DLON.pierwszaPo, ciszaDo: 0, ile: 0, ox: 0, oy: 0, bx: 0, by: 0, cx: 0, cy: 0, ofiary: [], zabrani: [] };
}

/** Czy kafel jest w otchłani (nieznany albo zapomniany). */
function wOtchlani(sim: Sim, x: number, y: number): boolean {
  const w = sim.world;
  // otchłań jest w głębi góry — nie w niebie nad nią
  if (!w.inb(x, y) || y <= SURFACE_Y + 2) return false;
  const i = w.idx(x, y);
  if (w.tile[i] === T.SKY) return false;
  return !w.ever[i] || sim.tick - w.lastSeen[i] > MEM_SPAN;
}

function moznaWziac(c: Creature): boolean {
  return !c.dead && !c.straznik && !c.buntownik && !!rolaPostaci(c);
}

function ileLudu(sim: Sim): number {
  let n = 0;
  for (const c of sim.creatures) if (moznaWziac(c)) n++;
  return n;
}

function przyObozie(sim: Sim, x: number, y: number): boolean {
  const klan = klanLudu(sim);
  const r = DLON.odObozu;
  if (klan && Math.hypot(klan.hx - x, klan.hy - y) < r) return true;
  for (const o of sim.lud.obozy ?? []) if (Math.hypot(o.x - x, o.y - y) < r * 0.8) return true;
  for (const s of sim.lud.spizarnie ?? []) if (Math.hypot(s.x - x, s.y - y) < r * 0.8) return true;
  return Math.hypot(sim.world.coreX - x, sim.world.coreY - y) < r;
}

/**
 * Szuka ofiary na brzegu otchłani: ktoś z ludu daleko od obozu, przy kim zaczyna się dużo
 * nieznanego. Ustawia oczy, brzeg i miejsce chwytu. `wszedzie` — narzędzie dewelopera
 * (bierze najlepszego, nawet blisko obozu).
 */
function znajdzOfiare(sim: Sim, d: StanDloni, wszedzie = false): boolean {
  const R = DLON.otchlanPromien;
  const w = sim.world;
  type Kandydat = { c: Creature; ocena: number; bx: number; by: number; ox: number; oy: number };
  let naj: Kandydat | null = null;
  for (const c of sim.creatures) {
    if (!moznaWziac(c)) continue;
    if (!wszedzie && przyObozie(sim, c.x, c.y)) continue;
    // nie przy samej krawędzi świata — tam kamera nie dojedzie i całe zdarzenie byłoby z boku ekranu
    if (!wszedzie && (c.x < DLON.odKrawedzi || c.x > w.w - DLON.odKrawedzi)) continue;
    const x0 = Math.floor(c.x), y0 = Math.floor(c.y);
    let ile = 0, sx = 0, sy = 0, bx = 0, by = 0, bd = 1e9;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const dd = Math.hypot(dx, dy);
        if (dd > R || dd < 2) continue;
        if (!wOtchlani(sim, x0 + dx, y0 + dy)) continue;
        ile++; sx += dx; sy += dy;
        if (dd < bd) { bd = dd; bx = dx; by = dy; }
      }
    }
    if (ile < (wszedzie ? 1 : DLON.otchlanMin)) continue;
    // kierunek w głąb otchłani: ku środkowi ciężkości nieznanego; brzeg — najbliższy nieznany kafel
    const dl = Math.hypot(sx, sy) || 1;
    const kx = sx / dl, ky = sy / dl;
    const brzegX = x0 + bx + 0.5, brzegY = y0 + by + 0.5;
    const ox = brzegX + kx * DLON.oczyGlebiej, oy = brzegY + ky * DLON.oczyGlebiej - 1;
    // oczy muszą się zmieścić w głębi góry — nie na krawędzi świata ani w niebie
    const mieszcza = ox >= 5 && ox <= w.w - 6 && oy >= SURFACE_Y + 4 && oy <= w.h - 5;
    if (!mieszcza && !wszedzie) continue;
    const ocena = ile * (0.7 + sim.rng.next() * 0.6) * (mieszcza ? 1 : 0.2);
    if (!naj || ocena > naj.ocena) naj = { c, ocena, bx: brzegX, by: brzegY, ox, oy };
  }
  if (!naj) return false;
  const { c } = naj;
  d.cx = c.x + 0.5; d.cy = c.y - 0.6;
  d.bx = naj.bx; d.by = naj.by;
  d.ox = Math.max(4, Math.min(w.w - 5, naj.ox));
  d.oy = Math.max(SURFACE_Y + 4, Math.min(w.h - 5, naj.oy));
  d.ofiary = [c.id];
  if (sim.rng.next() < DLON.drugiSzansa) {
    let drugi: Creature | null = null, dd = DLON.drugiDo;
    for (const o of sim.creatures) {
      if (o === c || !moznaWziac(o)) continue;
      const odl = Math.hypot(o.x - c.x, o.y - c.y);
      if (odl < dd) { dd = odl; drugi = o; }
    }
    if (drugi) {
      d.ofiary.push(drugi.id);
      d.cx = (c.x + drugi.x) / 2 + 0.5; d.cy = (c.y + drugi.y) / 2 - 0.6;
    }
  }
  return true;
}

function zacznij(sim: Sim, d: StanDloni): void {
  d.faza = 'oczy';
  d.od = sim.tick;
  d.oczyT = sim.tick;
  d.widziana = true;
  d.odpedzona = false;
  d.zabrani = [];
  for (const id of d.ofiary) {
    const c = sim.creatures.find((q) => q.id === id);
    if (!c) continue;
    c.fear = 1;
    // stoi jak wryty, aż dłoń chwyci (Cud go puszcza)
    c.zamarlyDo = sim.tick + DLON.oczy + DLON.siega + DLON.chwyta;
    c.zamiar = 'stoi jak wryty — z otchłani patrzą wielkie oczy';
    c.zamiarDo = c.zamarlyDo;
  }
  const pierwszy = sim.creatures.find((q) => q.id === d.ofiary[0]);
  const kto = d.ofiary.length > 1 ? 'dwoje z ludu' : KOGO[(pierwszy && rolaPostaci(pierwszy)) ?? 'pobozny'];
  sim.gdzie(d.cx, d.cy).log(`Na brzegu otchłani otworzyły się wielkie czerwone oczy. Patrzą na ${kto}.`, 'otchlan');
  zapisz(sim, 'swiat', `Dłoń z otchłani: oczy otwarte, ofiary ${d.ofiary.map((i) => `#${i}`).join(', ')}`, d.cx, d.cy);
}

/** Dłoń się zacisnęła: ofiary znikają w otchłani (bez kości — krew i tak spływa do ciebie). */
function chwyc(sim: Sim, d: StanDloni): void {
  d.chwytT = sim.tick;
  const nazwy: string[] = [];
  for (const id of d.ofiary) {
    const c = sim.creatures.find((q) => q.id === id);
    if (!c || c.dead) continue;
    const r = rolaPostaci(c) ?? 'pobozny';
    d.zabrani.push(r);
    nazwy.push(KOGO[r]);
    const x = Math.floor(c.x), y = Math.floor(c.y);
    const bylo = sim.world.inb(x, y) ? sim.world.get(x, y) : -1;
    sim.kill(c, 'zabrany w otchłań', 'otchlan');
    if (bylo === T.AIR && sim.world.get(x, y) === T.BONES) sim.world.set(x, y, T.AIR);
    sim.efekty = sim.efekty.filter((e) => !(e.rodzaj === 'smierc' && e.x === c.x && e.y === c.y));
  }
  if (nazwy.length) sim.gdzie(d.cx, d.cy).log(`Z otchłani wysunęła się ogromna dłoń i zabrała ${nazwy.join(' i ')}. Nie zostały nawet kości.`, 'krew');
}

/** Co tik symulacji (sam pilnuje rytmu). */
export function tikDloni(sim: Sim): void {
  if (!DLON.wlaczona || sim.ending) return;
  const d = sim.lud.dlon;
  if (!d && !sim.koszmar) return;
  if (!sim.lud.dlon) sim.lud.dlon = nowyStan();
  const s = sim.lud.dlon;
  if (s.faza === 'brak') {
    if (!sim.koszmar || sim.spokojnySwiat || sim.tick < s.losT) return;
    s.losT = sim.tick + DLON.losujCo;
    if (sim.tick < s.ciszaDo || s.ile >= DLON.maxNaPartie || ileLudu(sim) < DLON.minLudu) return;
    if (sim.rng.next() >= DLON.szansa) return;
    if (znajdzOfiare(sim, s)) zacznij(sim, s);
    return;
  }
  // miejsce chwytu idzie za ofiarami (stoją, ale mogą się osunąć)
  if (s.faza === 'oczy' || s.faza === 'siega') {
    const zywe = s.ofiary.map((id) => sim.creatures.find((q) => q.id === id)).filter((c): c is Creature => !!c && !c.dead);
    if (!zywe.length) { s.faza = 'gasnie'; s.od = sim.tick; return; }
    s.cx = zywe.reduce((a, c) => a + c.x, 0) / zywe.length + 0.5;
    s.cy = zywe.reduce((a, c) => a + c.y, 0) / zywe.length - 0.6;
    for (const c of zywe) c.fear = 1;
  }
  const faza = s.faza as Exclude<FazaDloni, 'brak'>;
  if (sim.tick - s.od < DLUGOSC[faza]) return;
  s.faza = NASTEPNA[faza];
  s.od = sim.tick;
  // palce zamknęły się na nich — w tej chwili znikają z góry, a dłoń cofa się z nimi
  if (s.faza === 'cofa' && !s.odpedzona) chwyc(sim, s);
  if (s.faza === 'brak') {
    s.ile++;
    s.ciszaDo = sim.tick + DLON.przerwa;
    s.ofiary = [];
  }
}

/** Cud rzucony w (tx, ty): jeśli oczy albo ofiara są blisko, a dłoń jeszcze nie chwyciła — odpędza ją. */
export function odpedzDlon(sim: Sim, tx: number, ty: number): boolean {
  const d = sim.lud.dlon;
  if (!d || (d.faza !== 'oczy' && d.faza !== 'siega')) return false;
  const blisko = Math.hypot(d.ox - tx, d.oy - ty) <= DLON.cudPromien || Math.hypot(d.cx - tx, d.cy - ty) <= DLON.cudPromien;
  if (!blisko) return false;
  for (const id of d.ofiary) {
    const c = sim.creatures.find((q) => q.id === id);
    if (c && !c.dead) { c.zamarlyDo = undefined; c.zamiarDo = sim.tick; c.fear = Math.max(c.fear, 0.6); }
  }
  d.odpedzona = true;
  d.faza = d.faza === 'siega' ? 'cofa' : 'gasnie';
  d.od = sim.tick;
  sim.gdzie(d.cx, d.cy).log('Światło Cudu odepchnęło dłoń z powrotem w otchłań. Oczy się zamknęły.', 'wiara');
  zapisz(sim, 'swiat', 'Dłoń z otchłani odpędzona Cudem', d.cx, d.cy);
  return true;
}

/** Narzędzie dewelopera: wydarzenie od razu (także poza Koszmarem). */
export function devDlon(sim: Sim): string {
  if (!sim.lud.dlon) sim.lud.dlon = nowyStan();
  const d = sim.lud.dlon;
  if (d.faza !== 'brak') return 'Dłoń już tu jest.';
  if (!znajdzOfiare(sim, d) && !znajdzOfiare(sim, d, true)) return 'Nikt z ludu nie stoi przy otchłani (nieznanym).';
  zacznij(sim, d);
  return `Oczy otwarte — dłoń sięgnie po ${d.ofiary.map((i) => `#${i}`).join(' i ')}.`;
}

/** Jedna linijka o stanie wydarzenia — dla okienka dewelopera. */
export function opisDloni(sim: Sim): string {
  const d = sim.lud.dlon;
  const mmss = (t: number) => { const s = Math.max(0, Math.ceil(t / 120)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  if (!sim.koszmar && (!d || d.faza === 'brak')) return 'Dłoń z otchłani: tylko w Koszmarze';
  if (!d) return `Dłoń z otchłani: najwcześniej za ${mmss(DLON.pierwszaPo - sim.tick)}`;
  if (d.faza !== 'brak') return `Dłoń z otchłani: ${d.faza} → ${d.ofiary.map((i) => `#${i}`).join(', ')}`;
  if (d.ile >= DLON.maxNaPartie) return `Dłoń z otchłani: była już ${d.ile}× — więcej nie przyjdzie`;
  const za = Math.max(d.ciszaDo, d.losT) - sim.tick;
  return `Dłoń z otchłani: była ${d.ile}× · następny los za ${mmss(za)} (${Math.round(DLON.szansa * 100)}%)`;
}
