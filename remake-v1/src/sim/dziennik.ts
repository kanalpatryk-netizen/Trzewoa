/**
 * DZIENNIK DEWELOPERA (v4 beta) — proste logi tego, co się teraz dzieje w świecie:
 * kto czym się zajął, który blok zniknął i gdzie, kto umarł, kto się urodził, jakie karty.
 * Zbiera tylko wtedy, gdy włączony jest tryb deweloperski — w zwykłej grze nic nie kosztuje.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { RACES } from './races';

export type KategoriaWpisu = 'praca' | 'blok' | 'zgon' | 'narodziny' | 'karta' | 'rytual' | 'swiat';

export interface WpisDziennika { nr: number; tick: number; kat: KategoriaWpisu; tekst: string; x?: number; y?: number }

export const DZIENNIK = {
  wlaczony: false,
  wpisy: [] as WpisDziennika[],
  /** Numer następnego wpisu — okienko pamięta, do którego doczytało. */
  nastepny: 0,
  max: 600,
};

/** Narzędzia dewelopera, które sięgają do pętli gry. */
export const DEV = {
  /** Tempo ponad zwykłe ×3 (0 = bez nadpisania). */
  tempo: 0,
  /** Pauza dewelopera: świat stoi, idzie tylko o `krokow` tików na żądanie. */
  pauza: false,
  krokow: 0,
  /** Śledzona postać (id, -1 = nikt) i czy kamera za nią jedzie. */
  sledzony: -1,
  sledz: false,
  /** Kafel pod kursorem (świat) albo null. */
  kursor: null as { x: number; y: number } | null,
  /** Średni czas jednego kroku symulacji w ms. */
  msKroku: 0,
};

export function zapisz(sim: Sim, kat: KategoriaWpisu, tekst: string, x?: number, y?: number): void {
  if (!DZIENNIK.wlaczony) return;
  DZIENNIK.wpisy.push({ nr: DZIENNIK.nastepny++, tick: sim.tick, kat, tekst, x: x === undefined ? undefined : Math.floor(x), y: y === undefined ? undefined : Math.floor(y) });
  if (DZIENNIK.wpisy.length > DZIENNIK.max) DZIENNIK.wpisy.splice(0, DZIENNIK.wpisy.length - DZIENNIK.max);
}

/** „Ślepy Lud #12 (Grzmotowie)”. */
export function kto(sim: Sim, c: Creature): string {
  const rola = c.race === 0 ? ({ pobozny: 'Pobożny', robotnik: 'Robotnik', rycerz: 'Rycerz' } as Record<string, string>)[c.rola ?? 'pobozny'] : null;
  return `${rola ?? RACES[c.race].name} #${c.id} (${sim.clans[c.clan]?.name ?? '?'})`;
}

/** Co robi, kiedy dostaje dane zajęcie (kolejność jak w enum Job). */
export const OPIS_PRACY = [
  'wędruje', 'kopie', 'idzie jeść', 'modli się', 'buduje', 'walczy', 'ucieka', 'idzie płodzić',
  'niesie łup', 'bierze w jarzmo', 'schodzi w głąb', 'najeżdża', 'składa ofiarę', 'śpi w skale',
  'grzeje się przy ogniu', 'wysysa jeńca', 'idzie pod rdzeń jako pielgrzym',
];

export const NAZWY_KAFLI = [
  'pustka', 'niebo', 'ziemia', 'skała', 'ruda', 'kryształ', 'kamień', 'grzybnia', 'kości',
  'ołtarz', 'kuźnia', 'sieć', 'lęgowisko', 'rdzeń', 'glif',
];
