/**
 * OSIĄGNIĘCIA (v4.1 beta) — cele dodatkowe, sprawdzane raz, na końcu partii.
 * Zdobyte zostają w przeglądarce, między partiami. Progi są w src/nastawy/cele.ts.
 */
import type { Sim } from '../sim/sim';
import { Race } from '../sim/races';
import { CELE } from '../nastawy/cele';
import { TIKOW_NA_MINUTE } from '../nastawy/czas';
import { zapiszProbe, type WynikDnia } from './swiat-dnia';

const KLUCZ = 'trzewia:osiagniecia';

export interface Osiagniecie {
  id: string;
  nazwa: string;
  /** Co trzeba zrobić — jedno zdanie. */
  opis: string;
  /** Czy ta partia je zdobywa (wołane raz, na końcu). */
  sprawdz: (sim: Sim, wygrana: boolean) => boolean;
}

/** Krwie, które nie mogą wymrzeć do końca partii (trole wracają z szaleństwa, ludzie z powierzchni). */
const LUDY = [Race.GOBLIN, Race.DWARF, Race.SPINNER];

export const OSIAGNIECIA: Osiagniecie[] = [
  { id: 'pierwsza', nazwa: 'Przebudzenie', opis: 'Wygraj pierwszą partię.', sprawdz: (_s, w) => w },
  { id: 'szybko', nazwa: 'Jak magma', opis: `Wygraj w mniej niż ${CELE.szybkoMinut} minut czasu gry.`, sprawdz: (s, w) => w && s.tick < CELE.szybkoMinut * TIKOW_NA_MINUTE },
  { id: 'koszmar', nazwa: 'Koszmar na jawie', opis: 'Wygraj na Koszmarze.', sprawdz: (s, w) => w && s.koszmar },
  {
    id: 'pelna', nazwa: 'Wszystkie krwie', opis: 'Wygraj tak, żeby do końca żyli Ślepy Lud, Żużlowcy i Prządki.',
    sprawdz: (s, w) => w && LUDY.every((r) => s.wydarzenia.szczyt[r] === 0 || s.popByRace[r] > 0),
  },
  { id: 'pokoj', nazwa: 'Bez cudzej krwi', opis: 'Wygraj, ani razu nie wybierając wojny („niech walczą”, „podsyć kłótnię”).', sprawdz: (s, w) => w && s.stat.walka === 0 },
  { id: 'dlug', nazwa: 'Dłużnik', opis: 'Weź krew od głębi i mimo to wygraj.', sprawdz: (s, w) => w && s.stat.dlug > 0 },
  { id: 'przysiega', nazwa: 'Świadek', opis: 'Doczekaj, aż dwie nacje dotrzymają przysięgi.', sprawdz: (s) => s.stat.przysiega > 0 },
  { id: 'proroctwo', nazwa: 'Słowo ciałem', opis: 'Spełnij proroctwo, które wróciło po proroku.', sprawdz: (s) => s.stat.proroctwo > 0 },
  { id: 'lancuchy', nazwa: 'Wszystko wraca', opis: `Rozstrzygnij w jednej partii ${CELE.lancuchy} karty, które wróciły po twoich wyborach.`, sprawdz: (s) => s.stat.lancuch >= CELE.lancuchy },
  { id: 'tlum', nazwa: 'Ludna góra', opis: `Miej naraz ${CELE.tlum} mieszkańców.`, sprawdz: (s) => s.stat.szczyt >= CELE.tlum },
  { id: 'dzien', nazwa: 'Świat dnia', opis: 'Wygraj świat dnia.', sprawdz: (s, w) => w && !!s.swiatDnia },
];

function wczytaj(): Set<string> {
  try {
    const raw = localStorage.getItem(KLUCZ);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

/** Zdobyte osiągnięcia (id). */
export function zdobyte(): Set<string> { return wczytaj(); }

export interface Podsumowanie {
  /** Nowe osiągnięcia z tej partii. */
  nowe: Osiagniecie[];
  /** Wynik świata dnia po tej próbie (gdy to był świat dnia). */
  dzien?: { wynik: WynikDnia; rekord: boolean; czas: number | null };
}

/**
 * Podsumowanie skończonej partii: zapisuje próbę świata dnia i nowe osiągnięcia.
 * Liczy się raz na partię — wczytany po końcu zapis nie nabija prób drugi raz.
 */
export function podsumujPartie(sim: Sim): Podsumowanie {
  if (!sim.ending) return { nowe: [] };
  const wygrana = sim.ending.startsWith('uwolnienie');
  if (sim.stat.podsumowana) {
    return sim.podsumowanie ?? { nowe: [] };
  }
  sim.stat.podsumowana = 1;
  const out: Podsumowanie = { nowe: [] };
  if (sim.swiatDnia) {
    const czas = wygrana ? sim.tick : null;
    out.dzien = { ...zapiszProbe(sim.swiatDnia, czas), czas };
  }
  const juz = wczytaj();
  for (const o of OSIAGNIECIA) {
    if (juz.has(o.id)) continue;
    if (o.sprawdz(sim, wygrana)) { juz.add(o.id); out.nowe.push(o); }
  }
  try { localStorage.setItem(KLUCZ, JSON.stringify([...juz])); } catch { /* tryb prywatny */ }
  sim.podsumowanie = out;
  return out;
}
