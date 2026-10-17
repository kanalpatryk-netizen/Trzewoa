import type { EkranSamouczka } from '../tutorial';
import type { EkranGry, ZdarzenieGry } from '../game';
import type { Cel } from '../../../render/znaczniki';
import { obszarOddania, obszarSpisu, type Obszar } from '../../../render/plate';
import { wylosuj } from '../../../sim/wydarzenia';
import { PIELGRZYMKA, RYTUAL } from '../../../nastawy/rytual';
import { LUD } from '../../../nastawy/lud';
import { WIADRO } from '../../../nastawy/wiadro';
import { ZAWAL } from '../../../nastawy/zawal';
import { MROK } from '../../../nastawy/mrok';
import { DLON } from '../../../nastawy/dlon';
import { STRAZNICY } from '../../../nastawy/straznicy';
import { KOSZTY } from '../../../nastawy/moce';
import { wiadroTeraz } from '../../../sim/wiadro';

/** Próg pielgrzymki w procentach — samouczek mówi tę samą liczbę, co dłonie oddania. */
const PROG = `${Math.round(PIELGRZYMKA.oddanieNacji * 100)}%`;

/**
 * TREŚĆ SAMOUCZKA — krótkie rozdziały (Remake v2: lud, wiadra, ryty, pauza, wydarzenia, rycerze, zawał, ciemność,
 * Strażnicy Snu, droga do wolności): tytuł, wstęp, czynności do odhaczenia
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
    wstep: 'Jesteś górą. W twoich korytarzach mieszka jeden lud — Pobożni. To na nich patrzysz.',
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
    koniec: 'To Pobożni — pobożni, robotnicy i rycerze. Mieszkają przy siedzibie; jej znak stoi nad nimi.',
    czasowniki: [],
  },
  {
    tytul: 'Czym płacisz',
    wstep: 'Nad płytą stoją trzy liczby. To wszystko, co musisz śledzić.',
    przygotuj: (g) => { g.sim.krew += 60; g.sim.wiara += 40; },
    etapy: [
      {
        tekst: 'Wiara rośnie, gdy pobożni się modlą. Krew płynie z każdej śmierci i z ofiar — na Koszmarze jest jej mało. Jedzenie to porcje w wiadrach, które zjeżdżają z góry. Wiarę i krew wydajesz na ryty, wybory na kartach i nowych ze skały.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarZasobow(s.gra.plate) }),
      },
      {
        tekst: `Oddanie: jak mocno lud w ciebie wierzy. Złożone dłonie napełniają się złotem — od kreski (${PROG}) pobożni sami idą pod twój rdzeń.`,
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarOddania(s.gra.plate, s.vh) }),
      },
    ],
    koniec: 'Gdy na coś cię nie stać, ryt po lewej przygasa, a wybór na karcie ma cenę na czerwono.',
    czasowniki: [],
  },
  {
    tytul: 'Lud i jego role',
    wstep: 'Twój lud ma trzy role. Nikt się nie rodzi — nowych wydaje skała.',
    czasowniki: [],
    przygotuj: (g) => { g.sim.lud.rola = 'robotnik'; },
    etapy: [
      {
        tekst: 'Pobożni modlą się i kruszą skorupę rdzenia. Robotnicy kopią drogę i donoszą jedzenie z wiader. Rycerze bronią i walczą ze Strażnikami Snu — a gdy zabraknie rycerzy, robotnicy zakładają hełmy i walczą sami.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarSpisu(s.gra.plate, s.vh) }),
      },
      {
        tekst: `Co ${Math.round(LUD.wyjscieCo / 120)} s skała wydaje nowego — robotnika za ${LUD.koszt.robotnik} krwi albo pobożnego za ${LUD.koszt.pobozny}. Dotknij „pobożny” pod paskiem ról.`,
        wskaz: (s) => s.rolaZeSkaly('pobozny'),
        gotowe: (g) => g.sim.lud.rola === 'pobozny',
      },
      {
        tekst: `Świeży ze skały przez minutę jest słabszy (czerwona aureola). Kto przeżyje ${Math.round(LUD.weteranPo / 7200)} minuty, najedzony, a lud wierzy — zostaje weteranem: +${Math.round((LUD.weteranPremia - 1) * 100)}% do wszystkiego i jasna aureola.`,
        rozumiem: true,
      },
    ],
    koniec: 'Każda postać ma swój zamiar — dotknij jej, a karta powie, co robi i ile jeszcze.',
  },
  {
    tytul: 'Jedzenie z góry',
    wstep: 'Grzyba ani spiżarni nie ma. Jedzenie zjeżdża z góry w wiadrach, na linach.',
    przygotuj: (g, s) => { g.sim.krew += 60; if (!s.najblizszeWiadro()) wiadroTeraz(g.sim); },
    czasowniki: ['zasiej'],
    etapy: [
      {
        tekst: `Co ${Math.round(WIADRO.co / 120)} s z góry zjeżdża wiadro pełne jedzenia — tam, gdzie lud najbardziej głoduje. Każdy może z niego jeść. Kto umiera z głodu, a wiadro jeszcze jedzie, wspina się po linie i je w drodze w dół.`,
        rozumiem: true,
        wskaz: (s) => { const c = s.najblizszeWiadro(); return c ? { typ: 'swiat', cel: c } : null; },
      },
      {
        tekst: 'Gdy wiadra nie nadążają, spuść własne. Wybierz ryt „Nakarm” po lewej.', klawisz: 'zasiej', cofa: true,
        wskaz: (s) => s.ryt('zasiej'), gotowe: (g) => g.ui.verb === 'zasiej',
      },
      {
        tekst: 'Dotknij zaznaczonego miejsca — tam zjedzie wiadro.',
        wskaz: (s) => { const c = s.miejsceNaGrzyb(); return c ? { typ: 'swiat', cel: c } : null; },
        gotowe: (_g, z) => z?.typ === 'moc' && z.czasownik === 'zasiej',
      },
    ],
    koniec: `Z góry zjeżdża twoje wiadro — ${WIADRO.nakarmPorcji} porcji za ${KOSZTY.zasiej.grzyb.krew} krwi. Liczba „jedzenie” nad płytą to porcje we wszystkich wiadrach.`,
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
        tekst: 'Dotknij płyty przy siedzibie.',
        wskaz: (s) => { const d = s.gniazdoGoblinow(); return d ? { typ: 'swiat', cel: { x: d.x, y: d.y, r: 4, tekst: 'dotknij tutaj' } } : null; },
        gotowe: (_g, z) => z?.typ === 'moc' && z.czasownik === 'znak',
      },
    ],
    koniec: `Oddanie Pobożnych skoczyło w górę — zobacz złożone dłonie. Przy ${PROG} sami pójdą pod twój rdzeń. Światło Cudu przegania też to, co patrzy z ciemności.`,
  },
  {
    tytul: 'Poślij wiernego',
    wstep: 'Szept dotyka jednej głowy. „Módl się” posyła pobożnego pod twój rdzeń — od razu.',
    przygotuj: (g) => { g.sim.wiara += 40; },
    czasowniki: ['szept'],
    stopCzasu: true,
    etapy: [
      {
        tekst: 'Wybierz ryt „Szepnij”.', klawisz: 'szept', cofa: true,
        wskaz: (s) => s.ryt('szept'), gotowe: (g) => g.ui.verb === 'szept',
      },
      {
        tekst: 'Dotknij zaznaczonego pobożnego.', cofa: true,
        wskaz: (s) => { const c = s.wskazanyGoblin('dotknij go', 'pobozny'); return c ? { typ: 'swiat', cel: c } : null; },
        gotowe: (g) => g.ui.verb === 'szept' && !!g.ui.selected && !g.ui.selected.dead,
      },
      {
        tekst: 'Na jego karcie wybierz „módl się”.',
        wskaz: (s) => s.slowo('thought', 'modl'),
        gotowe: (_g, z) => z?.typ === 'szept' && z.narzedzie === 'modl',
      },
    ],
    koniec: `Idzie pod twój rdzeń. Gdy stanie tam ${RYTUAL.potrzebaWiernych} wiernych, skorupa zacznie pękać od ich modlitwy. Inne szepty: „okalecz się” i „ofiaruj” dają krew, „przemyśl i kop” szuka rycerzy.`,
  },
  {
    tytul: 'Zatrzymaj czas',
    wstep: 'Czas możesz zatrzymać. Przy kryzysach gra staje sama.',
    czasowniki: [],
    etapy: [
      {
        tekst: 'Dotknij klepsydry pod płytą.', klawisz: 'pauza',
        wskaz: (s) => s.przycisk('pauza'),
        gotowe: (_g, z) => z?.typ === 'pauza' && z.stoi,
      },
      {
        tekst: 'W pauzie wiadro i Cud rysują się jako szkice — dzieją się naraz, gdy puścisz czas. Puść czas.', klawisz: 'pauza',
        wskaz: (s) => s.przycisk('pauza'),
        gotowe: (_g, z) => z?.typ === 'pauza' && !z.stoi,
      },
    ],
    koniec: 'Zatrzymuj świat, gdy musisz trafić — i przy każdym kryzysie.',
  },
  {
    tytul: 'Wydarzenia',
    wstep: 'Co chwilę coś się dzieje: najazd z powierzchni, zaraza, głód, spisek rycerzy, zgniłe jedzenie, zawał nad drogą wiernych. Czas wtedy staje, a ty wybierasz.',
    czasowniki: [],
    przygotuj: (g) => { g.sim.krew += 40; g.sim.wiara += 40; },
    etapy: [
      {
        tekst: 'Za chwilę pokaże się karta. Przeczytaj ją i dotknij jednego z wyborów.',
        wejdz: (g) => { g.sim.wydarzenia.gracz = true; if (!wylosuj(g.sim, 'sen')) wylosuj(g.sim, 'znak'); },
        gotowe: (_g, z) => z?.typ === 'wydarzenie',
      },
    ],
    koniec: 'Każdy wybór ma cenę i skutek, napisane wprost. Niektóre wracają: zostawiony spisek rycerzy wybucha buntem.',
  },
  {
    tytul: 'Rycerze w skale',
    wstep: `Rycerzy nie wyda skała — śpią w niej. W każdej górze jest ${LUD.gniazda} gniazd kamiennych rycerzy.`,
    czasowniki: [],
    etapy: [
      {
        tekst: 'Gdy ktoś z ludu jest blisko gniazda, skała słabo się żarzy. Kto się do niego dokopie, budzi rycerzy — od razu weteranów.',
        rozumiem: true,
      },
      {
        tekst: 'Szepnij robotnikowi „przemyśl i kop”: uklęknie, poprosi o znak i wykopie tunel ku gniazdu. Znak jest niedokładny — jeden trafia raz na trzy, trzech na pewno. W gniazdo świecące (pokazane) trafia zawsze.',
        rozumiem: true,
      },
    ],
    koniec: 'Szukaj ich wcześnie — bez rycerzy nie pokonasz ostatniej fali, a gniazda nad zawałem przepadają.',
  },
  {
    tytul: 'Góra się zamyka',
    wstep: 'To Koszmar. Góra nie czeka na tych, którzy zostają z tyłu.',
    czasowniki: [],
    etapy: [
      {
        tekst: `Gdy przez ${Math.round(ZAWAL.czekaj / 120)} s nikogo z ludu nie ma wysoko, góra nad nim się zawala — razem z gniazdami rycerzy, które tam spały. Mapa się skraca, a w górę nie ma już powrotu: lud musi walczyć.`,
        rozumiem: true,
      },
      {
        tekst: 'Lud nie ma lin: w górę wchodzi najwyżej o jeden stopień, a wyżej musi wykuć sobie schody. W dół zsuwa się szybem albo zeskakuje z niewysokiej półki — zejść łatwo, wrócić długo.',
        rozumiem: true,
      },
      {
        tekst: 'Gdy nie zostanie ani jeden rycerz, robotnicy zakładają hełmy i walczą zamiast nich. A kto umrze, nie znika — jego ciało leży tam, gdzie padł.',
        rozumiem: true,
      },
    ],
    koniec: 'Trupy mówią, gdzie lud ginie — tam spuść wiadro albo poślij rycerzy.',
  },
  {
    tytul: 'Ciemność',
    wstep: 'Poza światłem lampek, siedziby i rdzenia góra jest ciemna. I coś w tej ciemności jest.',
    czasowniki: [],
    etapy: [
      {
        tekst: `Po ${Math.round(MROK.pierwszyPo / 7200)} minutach Ten, który patrzy, zaczyna wypatrywać kogoś, kto został sam daleko od obozu. Samotny staje jak wryty, w skale świecą oczy — po ${Math.round(MROK.patrzyTikow / 120)} s zabiera go. Cud tuż przy oczach albo ktoś z ludu przy samotnym go przegania.`,
        rozumiem: true,
      },
      {
        tekst: `Rzadko, po ${Math.round(DLON.pierwszaPo / 7200)} minutach, spod nieznanego pod czyimiś stopami sączy się czerwona łuna, a z głębi wznosi się ogromna dłoń. Rzuć Cud przy ofierze, zanim chwyci.`,
        rozumiem: true,
      },
    ],
    koniec: 'Nie puszczaj nikogo samego daleko od obozu, zwłaszcza nad nieznanym.',
  },
  {
    tytul: 'Strażnicy Snu',
    wstep: `Skorupa rdzenia ma strażników. Przy ${STRAZNICY.fale.filter((f) => !f.boss).map((f) => f.prog).join(', ')}% wychodzą fale, przy ${STRAZNICY.fale.find((f) => f.boss)?.prog ?? 90}% — Śniący Kamień.`,
    czasowniki: [],
    etapy: [
      {
        tekst: 'Dopóki fala trwa, skorupa nie pęka. Rycerze (albo robotnicy w hełmach) walczą sami; pobożni i reszta robotników odchodzą spod rdzenia.',
        rozumiem: true,
        wejdz: (g) => { const w = g.sim.world; g.pokazMiejsce(w.coreX, w.przedsionekY, 10, true); },
      },
      {
        tekst: 'Śniącego Kamienia ranią tylko walczący. Rycerze ruszają na niego dopiero we trzech. Słabnie, gdy pod rdzeniem modli się trzech pobożnych, a zasypaną przez niego drogę odkopują robotnicy. Gdy nikt z nim nie walczy przez 2 minuty, zapada w ścianę na 4 minuty i zdradza jedno gniazdo — wtedy zbierz rycerzy.',
        rozumiem: true,
      },
    ],
    koniec: 'Pasek nad płytą pokaże, która to fala i ile życia zostało bossowi.',
  },
  {
    tytul: 'Droga do wolności',
    wstep: 'Tak wygrywasz: pobożni schodzą pod rdzeń i modlą się, aż kamień pęknie.',
    czasowniki: [],
    przygotuj: (g, s) => { const d = s.gniazdoGoblinow(); if (d) g.pokazMiejsce(d.x, d.y, 12, true); },
    etapy: [
      {
        tekst: 'Najpierw robotnicy kopią drogę do rdzenia (złota kreska). Wysłani pobożni czekają przy obozie, aż będzie gotowa — wtedy schodzą, a rycerze idą z nimi na wartę.',
        rozumiem: true,
      },
      {
        tekst: `Przy ${PROG} oddania pobożni sami pójdą pod rdzeń. Karta „chcą zejść pod twój rdzeń” albo szept „módl się” zrobią to od razu.`,
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarOddania(s.gra.plate, s.vh) }),
      },
      {
        tekst: 'Wiadra zjeżdżają tam, gdzie lud najbardziej głoduje — także do warty pod rdzeniem. Gdy nie zdążą, spuść wiadro rytem „Nakarm”.',
        rozumiem: true,
        wejdz: (g) => { const w = g.sim.world; g.pokazMiejsce(w.coreX, w.przedsionekY, 10, true); },
        wskaz: (s) => { const w = s.gra.sim.world; return { typ: 'swiat', cel: { x: w.coreX + 0.5, y: w.przedsionekY + 0.5, r: 6, tekst: 'przedsionek' } }; },
      },
    ],
    koniec: 'Wiara → droga → warta pod rdzeniem → pęknięcia (i fale) → wolność. Każdy krok widać na wstędze drogi.',
  },
  {
    tytul: 'Jak przegrać',
    wstep: 'Przegrywasz, gdy nie da się już wygrać.',
    czasowniki: [],
    etapy: [
      {
        tekst: `Gdy nie zostanie żaden pobożny, a krwi nie starczy, by skała wydała nowego (${LUD.koszt.pobozny}) — to koniec. Najczęściej zabija głód: lud rozproszony daleko od wiader.`,
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarSpisu(s.gra.plate, s.vh) }),
      },
    ],
    koniec: 'Trzymaj lud razem, spuszczaj wiadra tam, gdzie głodują, i nie wysyłaj pod rdzeń ostatniego pobożnego. Wszystko, co tu było, znajdziesz w atlasie.',
  },
];

/** Pasek zasobów nad płytą (telefon) — tam, gdzie EkranGry.rysujZasoby pisze liczby. */
function obszarZasobow(p: { x: number; y: number; w: number; top: number; niski: boolean }): Obszar {
  return { x: p.x + (p.niski ? 0 : p.w * 0.1), y: p.y - p.top * 0.85, w: p.niski ? p.w * 0.6 : p.w * 0.8, h: p.top * 0.75 };
}
