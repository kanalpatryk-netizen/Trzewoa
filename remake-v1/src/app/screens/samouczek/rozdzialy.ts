import type { EkranSamouczka } from '../tutorial';
import type { EkranGry, ZdarzenieGry } from '../game';
import type { Cel } from '../../../render/znaczniki';
import { obszarOddania, obszarSpisu, type Obszar } from '../../../render/plate';
import { wylosuj } from '../../../sim/wydarzenia';
import { PIELGRZYMKA, RYTUAL } from '../../../nastawy/rytual';

/** Próg pielgrzymki w procentach — samouczek mówi tę samą liczbę, co studnia oddania. */
const PROG = `${Math.round(PIELGRZYMKA.oddanieNacji * 100)}%`;

/**
 * TREŚĆ SAMOUCZKA — osiem krótkich rozdziałów: tytuł, wstęp, czynności do odhaczenia
 * (z palcem, który wskazuje, w co kliknąć) i zdanie na koniec. Logika karty,
 * palca i przechodzenia między rozdziałami jest w ../tutorial.ts.
 */

/** Na co samouczek wskazuje palcem. */
export type Wskazanie =
  | { typ: 'punkt'; x: number; y: number; r: number }     // ryt, słowo, przycisk — ekran
  | { typ: 'obszar'; o: Obszar }                           // organ w ramie
  | { typ: 'swiat'; cel: Cel };                            // miejsce na płycie

export type Gest = 'przeciagnij' | 'kolko';

export type Tekst = string | ((s: EkranSamouczka) => string);

export interface Etap {
  /** Polecenie: jedno krótkie zdanie. */
  tekst: Tekst;
  /** Skrót: akcja z klawiszologii albo gotowy napis („kółko myszy"). */
  klawisz?: Tekst;
  wskaz?: (s: EkranSamouczka) => Wskazanie | null;
  gest?: Gest;
  /** Czy etap jest spełniony — stan gry albo zdarzenie. */
  gotowe?: (g: EkranGry, z: ZdarzenieGry | null, s: EkranSamouczka) => boolean;
  /** Etap wyboru (ryt, słowo): odznaczenie cofa do niego. */
  cofa?: boolean;
  /** Etap opisowy — kończy go „Rozumiem". */
  rozumiem?: boolean;
  /** Przy wejściu w etap. */
  wejdz?: (g: EkranGry, s: EkranSamouczka) => void;
}

export interface Rozdzial {
  tytul: string;
  /** Po co — jedno, dwa zdania. */
  wstep: string;
  etapy: Etap[];
  /** Co się właśnie stało. */
  koniec: Tekst;
  czasowniki?: string[];
  /** Świat stoi przez cały rozdział — gdy trzeba trafić w konkretne stworzenie. */
  stopCzasu?: boolean;
  przygotuj?: (g: EkranGry, s: EkranSamouczka) => void;
}

export const ROZDZIALY: Rozdzial[] = [
  {
    tytul: 'Rozejrzyj się',
    wstep: 'Jesteś górą. W twoich korytarzach mieszkają małe ludy — to na nich patrzysz.',
    // mieszkańcy obok karty, nie pod nią
    przygotuj: (g, s) => { const d = s.gniazdoGoblinow(); if (d) g.pokazMiejsce(d.x, d.y, 14, true); },
    etapy: [
      {
        tekst: 'Przeciągnij płytę palcem, żeby się rozejrzeć.', klawisz: 'palcem', gest: 'przeciagnij',
        gotowe: (g, z, s) => z?.typ === 'kamera' && Math.hypot(g.cam.x - s.kamStart.x, g.cam.y - s.kamStart.y) > 3,
      },
      {
        tekst: 'Przybliż i oddal widok.', klawisz: 'rozsuń albo zsuń dwa palce', gest: 'kolko',
        gotowe: (g, z, s) => z?.typ === 'kamera' && z.rodzaj === 'zoom' && Math.abs(Math.log(g.cam.zoom / s.kamStart.zoom)) > 0.25,
      },
      {
        tekst: 'Dotknij oka pod płytą — kamera wróci do mieszkańców.', klawisz: 'kamera',
        wskaz: (s) => s.przycisk('kamera'),
        gotowe: (_g, z) => z?.typ === 'kamera' && z.rodzaj === 'powrot',
      },
    ],
    koniec: 'To Pobożni — twój lud: pobożni, robotnicy i rycerze. Przy siedzibie stoi ich nazwa i liczba żywych.',
    czasowniki: [],
  },
  {
    tytul: 'Czym płacisz',
    wstep: 'Nad płytą stoją trzy liczby. To wszystko, co musisz śledzić.',
    przygotuj: (g) => { g.sim.krew += 60; g.sim.wiara += 40; },
    etapy: [
      {
        tekst: 'Wiara rośnie, gdy ktoś się do ciebie modli. Krew — z każdej śmierci. Obie wydajesz na ryty i wybory.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarZasobow(s.gra.plate) }),
      },
      {
        tekst: `Oddanie: jak mocno wierzy w ciebie najwierniejsza nacja. Złota studnia pokazuje to samo — od kreski (${PROG}) nacja sama idzie pod twój rdzeń.`,
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarOddania(s.gra.plate, s.vh) }),
      },
    ],
    koniec: 'Gdy na coś cię nie stać, ryt po lewej przygasa, a wybór na karcie ma cenę na czerwono.',
    czasowniki: [],
  },
  {
    tytul: 'Nakarm ich',
    wstep: 'Nie wydajesz rozkazów. Dajesz im powód, żeby żyli dalej.',
    przygotuj: (g) => { g.sim.krew += 120; },
    czasowniki: ['zasiej'],
    etapy: [
      {
        tekst: 'Wybierz ryt „Nakarm” po lewej.', klawisz: 'zasiej', cofa: true,
        wskaz: (s) => s.ryt('zasiej'), gotowe: (g) => g.ui.verb === 'zasiej',
      },
      {
        tekst: 'Przeciągnij palcem po zaznaczonym miejscu.',
        wskaz: (s) => { const c = s.miejsceNaGrzyb(); return c ? { typ: 'swiat', cel: c } : null; },
        gotowe: (_g, z) => z?.typ === 'moc' && z.czasownik === 'zasiej',
      },
    ],
    koniec: 'Wyrósł grzyb. Pójdą jeść — im więcej jedzenia, tym więcej ich góra wyżywi.',
  },
  {
    tytul: 'Zrób cud',
    wstep: 'Cud widzą wszyscy dookoła — i ich wiara w ciebie rośnie.',
    przygotuj: (g) => { g.sim.wiara += 60; },
    czasowniki: ['znak'],
    etapy: [
      {
        tekst: 'Wybierz ryt „Cud”.', klawisz: 'znak', cofa: true,
        wskaz: (s) => s.ryt('znak'), gotowe: (g) => g.ui.verb === 'znak',
      },
      {
        tekst: 'Dotknij płyty przy gnieździe.',
        wskaz: (s) => { const d = s.gniazdoGoblinow(); return d ? { typ: 'swiat', cel: { x: d.x, y: d.y, r: 4, tekst: 'dotknij tutaj' } } : null; },
        gotowe: (_g, z) => z?.typ === 'moc' && z.czasownik === 'znak',
      },
    ],
    koniec: `Oddanie Pobożnych skoczyło w górę — zobacz liczbę nad płytą. Przy ${PROG} sami pójdą pod twój rdzeń.`,
  },
  {
    tytul: 'Poślij wiernego',
    wstep: 'Szept dotyka jednej głowy. „Módl się” posyła go pod twój rdzeń — od razu.',
    przygotuj: (g) => { g.sim.wiara += 40; },
    czasowniki: ['szept'],
    stopCzasu: true,
    etapy: [
      {
        tekst: 'Wybierz ryt „Szepnij”.', klawisz: 'szept', cofa: true,
        wskaz: (s) => s.ryt('szept'), gotowe: (g) => g.ui.verb === 'szept',
      },
      {
        tekst: 'Dotknij zaznaczonego mieszkańca.', cofa: true,
        wskaz: (s) => { const c = s.wskazanyGoblin('dotknij go'); return c ? { typ: 'swiat', cel: c } : null; },
        gotowe: (g) => g.ui.verb === 'szept' && !!g.ui.selected && !g.ui.selected.dead,
      },
      {
        tekst: 'Na jego karcie wybierz „módl się”.',
        wskaz: (s) => s.slowo('thought', 'modl'),
        gotowe: (_g, z) => z?.typ === 'szept' && z.narzedzie === 'modl',
      },
    ],
    koniec: `Idzie pod twój rdzeń. Gdy stanie tam ${RYTUAL.potrzebaWiernych} wiernych, skorupa zacznie pękać od ich modlitwy.`,
  },
  {
    tytul: 'Wydarzenia',
    wstep: 'Co chwilę coś się dzieje: najazd, zaraza, głód, prorok. Czas wtedy staje, a ty wybierasz.',
    czasowniki: [],
    przygotuj: (g) => { g.sim.krew += 40; g.sim.wiara += 40; },
    etapy: [
      {
        tekst: 'Za chwilę pokaże się karta. Przeczytaj ją i dotknij jednego z wyborów.',
        wejdz: (g) => { g.sim.wydarzenia.gracz = true; wylosuj(g.sim, 'ruda'); },
        gotowe: (_g, z) => z?.typ === 'wydarzenie',
      },
    ],
    koniec: 'Każdy wybór ma cenę i skutek, napisane wprost. To główna część gry — resztę robią twoi mieszkańcy.',
  },
  {
    tytul: 'Droga do wolności',
    wstep: 'Tak wygrywasz: jedna nacja musi uwierzyć, zejść pod rdzeń i modlić się, aż kamień pęknie.',
    czasowniki: [],
    przygotuj: (g, s) => { const d = s.gniazdoGoblinow(); if (d) g.pokazMiejsce(d.x, d.y, 12, true); },
    etapy: [
      {
        tekst: 'Modlą się przy ołtarzu, przy twoim Cudzie i pod rdzeniem. Każda modlitwa to Wiara dla ciebie i trochę oddania.',
        rozumiem: true,
      },
      {
        tekst: `Przy ${PROG} oddania nacja sama wyśle wartę pod rdzeń. Karta „chcą zejść pod twój rdzeń” albo szept „módl się” zrobią to od razu.`,
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarOddania(s.gra.plate, s.vh) }),
      },
      {
        tekst: 'Pod rdzeniem warta je to, co rośnie przy przedsionku. Nakarm to miejsce, zanim zejdą.',
        rozumiem: true,
        wejdz: (g) => { const w = g.sim.world; g.pokazMiejsce(w.coreX, w.przedsionekY, 10, true); },
        wskaz: (s) => { const w = s.gra.sim.world; return { typ: 'swiat', cel: { x: w.coreX + 0.5, y: w.przedsionekY + 0.5, r: 6, tekst: 'przedsionek' } }; },
      },
    ],
    koniec: 'Wiara → oddanie → warta pod rdzeniem → pęknięcia → wolność. Każdy krok widać na wstędze u dołu płyty.',
  },
  {
    tytul: 'Jak przegrać',
    wstep: 'Jest tylko jedna przegrana: zaśniesz.',
    czasowniki: [],
    etapy: [
      {
        tekst: 'To wstęga ludów. Gdy jedna krew zje resztę albo wszyscy wymrą — zaczniesz zasypiać.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarSpisu(s.gra.plate, s.vh) }),
      },
    ],
    koniec: 'Karm słabszych. Gdy jedna nacja rośnie za bardzo — wysłuchaj jej proroka albo skieruj na nią najazd.',
  },
];

/** Pasek zasobów nad płytą (telefon) — tam, gdzie EkranGry.rysujZasoby pisze liczby. */
function obszarZasobow(p: { x: number; y: number; w: number; top: number; niski: boolean }): Obszar {
  return { x: p.x + (p.niski ? 0 : p.w * 0.1), y: p.y - p.top * 0.85, w: p.niski ? p.w * 0.6 : p.w * 0.8, h: p.top * 0.75 };
}
