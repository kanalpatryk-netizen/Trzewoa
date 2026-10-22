/**
 * OSIĄGNIĘCIA (Alpha 0.2) — cele dodatkowe, sprawdzane raz, na końcu partii.
 * Zdobyte zostają w przeglądarce, między partiami. Progi są w src/nastawy/cele.ts,
 * liczniki partii w Sim.stat (src/sim/sim.ts). Każda góra to Koszmar.
 */
import type { Sim } from '../sim/sim';
import { CELE } from '../nastawy/cele';
import { TIKOW_NA_MINUTE } from '../nastawy/czas';

const KLUCZ = 'trzewia-alpha-0.2:osiagniecia';

export interface Osiagniecie {
  id: string;
  nazwa: string;
  /** Co trzeba zrobić — jedno zdanie. */
  opis: string;
  /** Czy ta partia je zdobywa (wołane raz, na końcu). */
  sprawdz: (sim: Sim, wygrana: boolean) => boolean;
}

export const OSIAGNIECIA: Osiagniecie[] = [
  { id: 'pierwsza', nazwa: 'Przebudzenie', opis: 'Wygraj pierwszą partię.', sprawdz: (_s, w) => w },
  { id: 'szybko', nazwa: 'Jak kamień w studnię', opis: `Wygraj w mniej niż ${CELE.szybkoMinut} minut czasu gry.`, sprawdz: (s, w) => w && s.tick < CELE.szybkoMinut * TIKOW_NA_MINUTE },
  { id: 'syci', nazwa: 'Pełne wiadra', opis: 'Wygraj tak, żeby nikt z ludu nie umarł z głodu.', sprawdz: (s, w) => w && s.stat.zGlodu === 0 },
  { id: 'ocaleni', nazwa: 'Mało grobów', opis: `Wygraj, tracąc najwyżej ${CELE.zgonowMaks} z ludu.`, sprawdz: (s, w) => w && s.stat.ludZgonow <= CELE.zgonowMaks },
  { id: 'skromny', nazwa: 'Bez jałmużny', opis: 'Wygraj, ani razu nie spuszczając wiadra rytem Nakarm.', sprawdz: (s, w) => w && s.stat.nakarm === 0 },
  { id: 'wspinaczka', nazwa: 'Ostatkiem sił', opis: 'Niech umierający z głodu wespnie się po linie do zjeżdżającego wiadra.', sprawdz: (s) => s.stat.wspinaczek > 0 },
  { id: 'druzyna', nazwa: 'Cała drużyna', opis: 'Wygraj, nie tracąc nikogo z ludu.', sprawdz: (s, w) => w && s.stat.ludZgonow === 0 },
  { id: 'helmy', nazwa: 'Kilofy zamiast mieczy', opis: 'Wygraj partię, w której robotnicy musieli założyć hełmy.', sprawdz: (s, w) => w && s.stat.helmy > 0 },
  { id: 'weterani', nazwa: 'Stara gwardia', opis: `Miej naraz ${CELE.weteranow} weteranów.`, sprawdz: (s) => s.stat.weteranowMax >= CELE.weteranow },
  { id: 'ludna', nazwa: 'Ludna góra', opis: `Miej naraz ${CELE.lud} postaci ludu.`, sprawdz: (s) => s.stat.ludMax >= CELE.lud },
  { id: 'dlon', nazwa: 'Wyrwani z dłoni', opis: 'Odepchnij Cudem dłoń z otchłani, zanim kogoś chwyci.', sprawdz: (s) => s.stat.odepchnieta > 0 },
  { id: 'dlug', nazwa: 'Dłużnik', opis: 'Weź krew od głębi i mimo to wygraj.', sprawdz: (s, w) => w && s.stat.dlug > 0 },
];

function wczytaj(): Set<string> {
  try {
    const raw = localStorage.getItem(KLUCZ);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

/** Zdobyte osiągnięcia (id) — tylko te, które są na obecnej liście (stare z dawnych wersji nie liczą się). */
export function zdobyte(): Set<string> {
  const juz = wczytaj();
  return new Set(OSIAGNIECIA.filter((o) => juz.has(o.id)).map((o) => o.id));
}

export interface Podsumowanie {
  /** Nowe osiągnięcia z tej partii. */
  nowe: Osiagniecie[];
}

/**
 * Podsumowanie skończonej partii: zapisuje nowe osiągnięcia.
 * Liczy się raz na partię — wczytany po końcu zapis nie liczy ich drugi raz.
 */
export function podsumujPartie(sim: Sim): Podsumowanie {
  if (!sim.ending) return { nowe: [] };
  const wygrana = sim.ending.startsWith('uwolnienie');
  if (sim.stat.podsumowana) return sim.podsumowanie ?? { nowe: [] };
  sim.stat.podsumowana = 1;
  const out: Podsumowanie = { nowe: [] };
  const juz = wczytaj();
  for (const o of OSIAGNIECIA) {
    if (juz.has(o.id)) continue;
    if (o.sprawdz(sim, wygrana)) { juz.add(o.id); out.nowe.push(o); }
  }
  try { localStorage.setItem(KLUCZ, JSON.stringify([...juz])); } catch { /* tryb prywatny */ }
  sim.podsumowanie = out;
  return out;
}
