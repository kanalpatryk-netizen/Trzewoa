/**
 * DZIENNIK DEWELOPERA (v4 beta) — proste logi tego, co się teraz dzieje w świecie:
 * kto czym się zajął, który blok zniknął i gdzie, kto umarł, kto się urodził, jakie karty.
 * Zbiera tylko wtedy, gdy włączony jest tryb deweloperski — w zwykłej grze nic nie kosztuje.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { RACES } from './races';
import { ktoTo } from './druzyna';

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
  /** Mnożnik czasu (1 = zwykły czas). Działa tylko w trybie deweloperskim — w grze czas jest jeden. */
  mnoznik: 1,
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
  /** Rysunek bez ciemności (mrok i Patrzący działają dalej — tylko ich nie widać). */
  bezMroku: false,
  /** Na płycie: to, czego gracz nie widzi — Patrzący (w każdej fazie). */
  pokazUkryte: true,
  /** Na płycie: drogi wszystkich postaci, nie tylko śledzonej. */
  pokazDrogi: false,
};

export function zapisz(sim: Sim, kat: KategoriaWpisu, tekst: string, x?: number, y?: number): void {
  if (!DZIENNIK.wlaczony) return;
  DZIENNIK.wpisy.push({ nr: DZIENNIK.nastepny++, tick: sim.tick, kat, tekst, x: x === undefined ? undefined : Math.floor(x), y: y === undefined ? undefined : Math.floor(y) });
  if (DZIENNIK.wpisy.length > DZIENNIK.max) DZIENNIK.wpisy.splice(0, DZIENNIK.wpisy.length - DZIENNIK.max);
}

/** „Ślepy Lud #12 (Grzmotowie)”; Alpha 0.3: „Bogdan, robotnik” (numer tylko w trybie deweloperskim). */
export function kto(sim: Sim, c: Creature): string {
  if (c.imie) return `${ktoTo(sim, c)}${DZIENNIK.wlaczony ? ` #${c.id}` : ''}`;
  const rola = c.race === 0 ? ({ pobozny: 'Pobożny', robotnik: 'Robotnik', rycerz: 'Rycerz' } as Record<string, string>)[c.rola ?? 'pobozny'] : null;
  return `${rola ?? RACES[c.race].name} #${c.id} (${sim.clans[c.clan]?.name ?? '?'})`;
}

/** Co robi, kiedy dostaje dane zajęcie (kolejność jak w enum Job). */
export const OPIS_PRACY = [
  'wędruje', 'kopie', 'idzie jeść', 'modli się', 'buduje', 'walczy', 'ucieka', 'idzie płodzić',
  'niesie łup', 'bierze w jarzmo', 'schodzi w głąb', 'najeżdża', 'składa ofiarę', 'śpi w skale',
  'grzeje się przy ogniu', 'wysysa jeńca', 'idzie do krypty jako pielgrzym',
  'zbiera jedzenie do spiżarni', 'idzie jeść do spiżarni', 'niesie jedzenie głodnemu', 'trzyma wartę w krypcie', 'stoi przy obozie',
];

export const NAZWY_KAFLI = [
  'pustka', 'niebo', 'ziemia', 'skała', 'ruda', 'kryształ', 'kamień', 'grzybnia', 'kości',
  'kapliczka', 'kuźnia', 'sieć', 'lęgowisko', 'rdzeń', 'glif', 'miękka skała', 'twarda skała', 'złoto',
];
