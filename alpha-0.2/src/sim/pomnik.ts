import type { Sim } from './sim';
import type { Creature } from './creatures';
import { procentSkorupy } from './rytual';
import { zacznijFaleBossa, zywiStraznicy } from './straznicy';
import { klanLudu } from './lud';
import { kto, zapisz } from './dziennik';
import { POMNIK } from '../nastawy/pomnik';
import { STRAZNICY } from '../nastawy/straznicy';
import { RDZEN } from '../nastawy/swiat';
import { T } from './tiles';

/**
 * WIELKI POMNIK DEMONA (Alpha, etap 5) — stoi na dnie, w komorze pod kryptą, tam gdzie dawniej rdzeń.
 * Modlitwa pobożnych w krypcie kruszy go (ten sam rytuał co dawniej skorupę — sim/rytual.ts, procentSkorupy):
 * przy 20, 45 i 70% pomnik przechodzi w kolejny stan pękania (rysy → odpadające kawałki → światło z wnętrza)
 * i za każdym razem ze skały wychodzi fala Strażników Snu. Przy 100% pomnik rozpada się w gruz, a z gruzów wstaje
 * demon — boss ostatniej fali (sim/boss.ts). Gdy rycerz zada mu ostatnie uderzenie, demon kona (czas na ekranie
 * zwalnia, demon pęka od światła i rozsypuje się) i gra kończy się wygraną — Uwolnieniem.
 * Fazy: stoi → rozpada → wychodzi → walka → kona → (koniec gry). Liczby: nastawy/pomnik.ts, rysunek: render/pomnik.ts.
 */
export type FazaPomnika = 'stoi' | 'rozpada' | 'wychodzi' | 'walka' | 'kona';

/** Stan pomnika (sim.lud.pomnik — trafia do zapisu). */
export interface StanPomnika {
  faza: FazaPomnika;
  od: number;
  /** Widoczny stan pękania: 0 — cały, 1–3 — kolejne stany; i od kiedy (błysk przy pęknięciu). */
  stan: number;
  stanT: number;
  /** Ostatnie uderzenie: kto je zadał i gdzie stał demon. */
  cios?: { kto: number; x: number; y: number };
}

export function stanPomnika(sim: Sim): StanPomnika {
  if (!sim.lud.pomnik) {
    // starszy zapis: w komorze leżą jeszcze kafle rdzenia — teraz stoi tam pomnik
    const w = sim.world;
    for (let y = w.coreY - 4; y <= w.coreY + 4; y++) for (let x = w.coreX - 4; x <= w.coreX + 4; x++) if (w.inb(x, y) && w.tile[w.idx(x, y)] === T.CORE) w.tile[w.idx(x, y)] = T.AIR;
    sim.lud.pomnik = { faza: 'stoi', od: 0, stan: 0, stanT: -1e9 };
  }
  return sim.lud.pomnik;
}

/** Gdzie stoi pomnik: środek u podstawy (x) i rząd kafli tuż nad dnem komory (y) — tam też wstaje demon. */
export function miejscePomnika(sim: Sim): { x: number; y: number } {
  const w = sim.world;
  return { x: w.coreX + 0.5, y: w.coreY + Math.floor(RDZEN.komoraY) };
}

/** Pomnik pękł do końca (rytuał już nic nie kruszy). */
export function pomnikRozbity(sim: Sim): boolean {
  return POMNIK.wlaczony && sim.rytual.pekniecia >= POMNIK.pekniec;
}

/** Demon kona po ostatnim uderzeniu — nie rusza się i nie bije. */
export function demonKona(sim: Sim): boolean {
  return sim.lud.pomnik?.faza === 'kona';
}

/** Ile stanów pękania przy tylu procentach. */
export function stanPekania(proc: number): number {
  let n = 0;
  for (const p of POMNIK.stany) if (proc >= p) n++;
  return n;
}

const LOG_STANU = [
  '',
  'Wielki Pomnik pęka pod modlitwą — po kamiennym demonie biegną pierwsze rysy.',
  'Z pomnika odpadają kawałki kamienia. Coś w środku się porusza.',
  'Przez szczeliny pomnika bije czerwone światło. Demon w środku się budzi.',
];

/** Co tik symulacji (z tikLudu). */
export function tikPomnika(sim: Sim): void {
  if (!POMNIK.wlaczony) return;
  const s = stanPomnika(sim);
  const w = sim.world;
  if (s.faza === 'stoi') {
    const nowy = stanPekania(procentSkorupy(sim));
    if (nowy > s.stan) {
      s.stan = nowy; s.stanT = sim.tick;
      for (let k = 0; k < 8; k++) sim.spark(w.coreX + 0.5 + sim.rng.range(-3, 3), w.coreY + sim.rng.range(-4, 3), 'dust');
      sim.gdzie(w.coreX + 0.5, w.coreY).log(LOG_STANU[nowy] ?? LOG_STANU[3], 'otchlan', `pomnik-${nowy}`);
      zapisz(sim, 'rytual', `pomnik demona — stan pękania ${nowy} z ${POMNIK.stany.length}`, w.coreX, w.coreY);
    }
    if (pomnikRozbity(sim)) {
      s.faza = 'rozpada'; s.od = sim.tick; s.stan = POMNIK.stany.length; s.stanT = sim.tick;
      sim.gdzie(w.coreX + 0.5, w.coreY).log('Wielki Pomnik rozpada się w gruz. Spod kamienia coś wstaje.', 'krew', 'pomnik-rozpad');
      zapisz(sim, 'rytual', 'pomnik demona rozpada się', w.coreX, w.coreY);
    }
    return;
  }
  const t = sim.tick - s.od;
  if (s.faza === 'rozpada' && t >= POMNIK.rozpad) { s.faza = 'wychodzi'; s.od = sim.tick; return; }
  if (s.faza === 'wychodzi' && t >= POMNIK.wyjscie) {
    s.faza = 'walka'; s.od = sim.tick;
    zacznijFaleBossa(sim);
    return;
  }
  if (s.faza === 'kona' && t >= POMNIK.konanie) koniecDemona(sim, s);
}

/**
 * Ostatnie uderzenie (sim/straznicy.ts: ranStraznika): demon nie pada od razu — kona przez `POMNIK.konanie` tików,
 * a gra kończy się dopiero potem. Zwraca true, gdy to był demon (rana nie zabija go wprost).
 */
export function ostatnieUderzenie(sim: Sim, demon: Creature, od: Creature): boolean {
  if (!POMNIK.wlaczony || !demon.boss) return false;
  const s = stanPomnika(sim);
  if (s.faza === 'kona') return true;
  demon.hp = 0;
  s.faza = 'kona'; s.od = sim.tick;
  s.cios = { kto: od.id, x: demon.x, y: demon.y };
  sim.target.delete(demon.id);
  for (let k = 0; k < 10; k++) sim.spark(demon.x + sim.rng.range(-0.8, 0.8), demon.y - sim.rng.range(0, 2.5), 'hit');
  sim.gdzie(demon.x, demon.y).log(`${kto(sim, od).split(' (')[0]} zadaje ostatnie uderzenie. Demon z pomnika pęka od środka.`, 'koniec', 'demon-cios');
  zapisz(sim, 'rytual', `ostatnie uderzenie: ${kto(sim, od)}`, Math.floor(demon.x), Math.floor(demon.y));
  return true;
}

/** Demon rozsypał się: znikają Strażnicy, a lud jest wolny — koniec gry. */
function koniecDemona(sim: Sim, s: StanPomnika): void {
  for (const c of zywiStraznicy(sim)) sim.kill(c, c.boss ? 'pokonany — ostatnie uderzenie' : 'rozsypał się razem z demonem', 'walka');
  const klan = klanLudu(sim);
  sim.ending = `uwolnienie:${klan?.name ?? 'Lud'}`;
  const x = s.cios?.x ?? sim.world.coreX, y = s.cios?.y ?? sim.world.przedsionekY;
  sim.gdzie(x, y).log('Demon z pomnika rozsypał się w pył. Nikt już nie strzeże twojego więzienia — jesteś wolny.', 'koniec');
}

/** Narzędzie dewelopera: pomnik od razu w gruz (dalej jak zwykle: demon wstaje i walka). */
export function devRozbijPomnik(sim: Sim): string {
  if (!POMNIK.wlaczony) return 'Pomnik wyłączony.';
  const s = stanPomnika(sim);
  if (s.faza !== 'stoi') return 'Pomnik już rozbity.';
  if (sim.lud.straznicy?.trwa) return 'Trwa fala Strażników — najpierw ją pokonaj.';
  sim.rytual.pekniecia = POMNIK.pekniec;
  for (const k of sim.clans) k.rytual = 0;
  // fale zwykłe, których nie było, przepadają — zostaje fala z demonem
  const fala = Math.max(0, STRAZNICY.fale.findIndex((f) => f.boss));
  const st = sim.lud.straznicy;
  if (st) st.fala = Math.max(st.fala, fala);
  else sim.lud.straznicy = { fala, trwa: false, klan: -1, od: 0 };
  return 'Pomnik rozpada się — za chwilę wstanie demon.';
}
