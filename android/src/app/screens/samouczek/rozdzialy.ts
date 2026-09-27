import type { EkranSamouczka } from '../tutorial';
import type { EkranGry, ZdarzenieGry } from '../game';
import type { Cel } from '../../../render/znaczniki';
import { obszarKrwi, obszarOddania, obszarWiary, obszarSpisu, type Obszar } from '../../../render/plate';
import { PIELGRZYMKA, RYTUAL } from '../../../nastawy/rytual';

/** Próg pielgrzymki w procentach — samouczek mówi tę samą liczbę, co studnia oddania. */
const PROG = `${Math.round(PIELGRZYMKA.oddanieNacji * 100)}%`;

/**
 * TREŚĆ SAMOUCZKA — jedenaście rozdziałów: tytuł, wstęp, czynności do odhaczenia
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
        tekst: 'Przeciągnij płytę, żeby się rozejrzeć.', klawisz: 'palcem', gest: 'przeciagnij',
        gotowe: (g, z, s) => z?.typ === 'kamera' && Math.hypot(g.cam.x - s.kamStart.x, g.cam.y - s.kamStart.y) > 3,
      },
      {
        tekst: 'Przybliż i oddal widok.', klawisz: 'rozsuń albo zsuń dwa palce', gest: 'kolko',
        gotowe: (g, z, s) => z?.typ === 'kamera' && z.rodzaj === 'zoom' && Math.abs(Math.log(g.cam.zoom / s.kamStart.zoom)) > 0.25,
      },
      {
        tekst: 'Dotknij „wróć do swoich" (oko pod płytą) — kamera znajdzie mieszkańców.', klawisz: 'kamera',
        wskaz: (s) => s.przycisk('kamera'),
        gotowe: (_g, z) => z?.typ === 'kamera' && z.rodzaj === 'powrot',
      },
    ],
    koniec: 'To twoi pierwsi mieszkańcy — Ślepy Lud. Przy gnieździe stoi imię nacji i liczba żywych.',
    czasowniki: [],
  },
  {
    tytul: 'Czym płacisz',
    wstep: 'Nie ma tu liczb. Twoje zasoby widać w ramie obrazu.',
    przygotuj: (g) => { g.sim.krew += 120; g.sim.wiara += 40; },
    etapy: [
      {
        tekst: 'Krew — czerwona rysa pod płytą. Rośnie z każdej śmierci. Płacisz nią za kształtowanie skały.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarKrwi(s.gra.plate, s.vh) }),
      },
      {
        tekst: 'Wiara — jasny dym pod górną krawędzią płyty. Rośnie, gdy ktoś się do ciebie modli. Płacisz nią za szept i cud.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarWiary(s.gra.plate) }),
      },
      {
        tekst: `Oddanie — złota studnia. Pokazuje, jak mocno wierzy w ciebie najwierniejsza nacja. Kreska to ${PROG}: od niej nacja sama pójdzie pod twój rdzeń.`,
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarOddania(s.gra.plate, s.vh) }),
      },
    ],
    koniec: 'Wiara to twoja waluta, oddanie to ich serce — dwie różne rzeczy. Gdy na coś cię nie stać, ryt po lewej przygasa.',
    czasowniki: [],
  },
  {
    tytul: 'Nakarm ich',
    wstep: 'Nie wydajesz rozkazów. Kładziesz w skale powód, żeby poszli.',
    przygotuj: (g) => { g.sim.krew += 300; g.sim.wiara += 60; },
    czasowniki: ['zasiej'],
    etapy: [
      {
        tekst: 'Wybierz ryt „Zasiej" po lewej.', klawisz: 'zasiej', cofa: true,
        wskaz: (s) => s.ryt('zasiej'), gotowe: (g) => g.ui.verb === 'zasiej',
      },
      {
        tekst: 'U góry wybierz słowo „grzyb".', klawisz: 'narzedzie2', cofa: true,
        wskaz: (s) => s.slowo('tool', 'grzyb'), gotowe: (g) => g.ui.verb === 'zasiej' && g.ui.tool === 'grzyb',
      },
      {
        tekst: 'Przeciągnij po zaznaczonym miejscu.',
        wskaz: (s) => { const c = s.miejsceNaGrzyb(); return c ? { typ: 'swiat', cel: c } : null; },
        gotowe: (_g, z) => z?.typ === 'moc' && z.czasownik === 'zasiej' && z.narzedzie === 'grzyb',
      },
    ],
    koniec: 'Grzyb rośnie. Pójdą jeść — a ilość grzyba wyznacza, ilu ich góra wyżywi.',
  },
  {
    tytul: 'Otwórz drogę',
    wstep: 'Skała jest twoim ciałem. Kształtowanie jej kosztuje Krew.',
    przygotuj: (g) => { g.sim.krew += 300; },
    czasowniki: ['ksztaltuj'],
    etapy: [
      {
        tekst: 'Wybierz ryt „Kształtuj".', klawisz: 'ksztaltuj', cofa: true,
        wskaz: (s) => s.ryt('ksztaltuj'), gotowe: (g) => g.ui.verb === 'ksztaltuj',
      },
      {
        tekst: 'U góry wybierz słowo „drąż".', klawisz: 'narzedzie1', cofa: true,
        wskaz: (s) => s.slowo('tool', 'draz'), gotowe: (g) => g.ui.verb === 'ksztaltuj' && g.ui.tool === 'draz',
      },
      {
        tekst: 'Przeciągnij po zaznaczonej skale — powstanie korytarz.',
        wskaz: (s) => { const c = s.miejsceNaKorytarz(); return c ? { typ: 'swiat', cel: c } : null; },
        gotowe: (_g, z) => z?.typ === 'moc' && z.czasownik === 'ksztaltuj' && z.narzedzie === 'draz',
      },
    ],
    koniec: 'Tunel jest twój, ale pójdą nim oni. Tak się prowadzi cudze życie. „Zawal" robi odwrotnie — zasypuje.',
  },
  {
    tytul: 'Zrób cud',
    wstep: 'Znak to jawny cud. Widzą go wszyscy dookoła — i ich oddanie rośnie.',
    przygotuj: (g) => { g.sim.wiara += 160; },
    czasowniki: ['znak'],
    etapy: [
      {
        tekst: 'Wybierz ryt „Znak".', klawisz: 'znak', cofa: true,
        wskaz: (s) => s.ryt('znak'), gotowe: (g) => g.ui.verb === 'znak',
      },
      {
        tekst: 'U góry wybierz słowo „objawienie".', klawisz: 'narzedzie1', cofa: true,
        wskaz: (s) => s.slowo('tool', 'objawienie'), gotowe: (g) => g.ui.verb === 'znak' && g.ui.tool === 'objawienie',
      },
      {
        tekst: 'Dotknij płyty przy gnieździe.',
        wskaz: (s) => { const d = s.gniazdoGoblinow(); return d ? { typ: 'swiat', cel: { x: d.x, y: d.y, r: 4, tekst: 'dotknij tutaj' } } : null; },
        gotowe: (_g, z) => z?.typ === 'moc' && z.czasownik === 'znak',
      },
      {
        tekst: 'Spójrz na złotą studnię — oddanie Ślepego Ludu skoczyło w górę.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarOddania(s.gra.plate, s.vh) }),
      },
    ],
    koniec: `Został świecący glif — modlitwa przy nim liczy się podwójnie. Jedno, dwa objawienia i nacja przekroczy ${PROG}.`,
  },
  {
    tytul: 'Poślij wiernego',
    wstep: 'Szept dotyka jednej głowy. „Módl się” posyła go pod twój rdzeń — od razu, bez czekania, aż uwierzy cała nacja.',
    przygotuj: (g) => { g.sim.wiara += 150; },
    czasowniki: ['szept'],
    stopCzasu: true,
    etapy: [
      {
        tekst: 'Wybierz ryt „Szepcz".', klawisz: 'szept', cofa: true,
        wskaz: (s) => s.ryt('szept'), gotowe: (g) => g.ui.verb === 'szept',
      },
      {
        tekst: 'Dotknij zaznaczonego goblina — otworzy się jego karta.', cofa: true,
        wskaz: (s) => { const c = s.wskazanyGoblin('dotknij go'); return c ? { typ: 'swiat', cel: c } : null; },
        gotowe: (g) => g.ui.verb === 'szept' && !!g.ui.selected && !g.ui.selected.dead,
      },
      {
        tekst: 'Na karcie wybierz „módl się".',
        wskaz: (s) => s.slowo('thought', 'modl'),
        gotowe: (_g, z) => z?.typ === 'szept' && z.narzedzie === 'modl',
      },
    ],
    koniec: `Idzie pod twój rdzeń. Gdy stanie tam naraz ${RYTUAL.potrzebaWiernych} wiernych z jednej nacji, skorupa zacznie pękać od ich modlitwy.`,
  },
  {
    tytul: 'Wiara i modlitwa',
    wstep: 'Tak zdobywasz wolność: ktoś musi w ciebie uwierzyć, zejść pod rdzeń i modlić się tam, aż kamień puści.',
    czasowniki: [],
    przygotuj: (g, s) => { const d = s.gniazdoGoblinow(); if (d) g.pokazMiejsce(d.x, d.y, 12, true); },
    etapy: [
      {
        tekst: 'Modlą się przy ołtarzu, przy twoim Znaku i pod rdzeniem. Każda modlitwa daje ci Wiarę i trochę podnosi ich oddanie.',
        rozumiem: true,
      },
      {
        tekst: 'Ołtarz stawiają sami — z rudy. Zasiej rudę przy gnieździe Ślepego Ludu, a zaczną się modlić.',
        rozumiem: true,
        wskaz: (s) => { const d = s.gniazdoGoblinow(); return d ? { typ: 'swiat', cel: { x: d.x, y: d.y, r: 5, tekst: 'tu siej rudę' } } : null; },
      },
      {
        tekst: `Gdy oddanie przekroczy ${PROG}, nacja sama wyśle wartę pod rdzeń. Nie chcesz czekać? Szepnij „módl się” trzem jej ludziom.`,
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarOddania(s.gra.plate, s.vh) }),
      },
      {
        tekst: 'Pod rdzeniem warta je to, co rośnie przy przedsionku. Zasiej tam grzyb, zanim zejdą — inaczej zgłodnieją i wrócą.',
        rozumiem: true,
        wejdz: (g) => { const w = g.sim.world; g.pokazMiejsce(w.coreX, w.przedsionekY, 10, true); },
        wskaz: (s) => { const w = s.gra.sim.world; return { typ: 'swiat', cel: { x: w.coreX + 0.5, y: w.przedsionekY + 0.5, r: 6, tekst: 'przedsionek' } }; },
      },
    ],
    koniec: 'Ruda → ołtarz → modlitwa → oddanie → warta pod rdzeniem → pęknięcia → wolność. Kroki tej drogi zawsze widać w rogu płyty.',
  },
  {
    tytul: 'Pauza i plan',
    wstep: 'Jak w dawnych grach taktycznych: zatrzymujesz świat, spokojnie planujesz, a potem wszystko dzieje się naraz.',
    czasowniki: ['zasiej'],
    przygotuj: (g) => { g.sim.krew += 60; },
    etapy: [
      {
        tekst: 'Zatrzymaj czas — klepsydrą albo tym przyciskiem.', klawisz: 'pauza',
        wskaz: (s) => s.przycisk('pauza'), gotowe: (g) => g.pauza,
      },
      {
        tekst: 'Wybierz ryt „Zasiej”, a u góry słowo „grzyb”.', klawisz: 'zasiej', cofa: true,
        wskaz: (s) => s.gra.ui.verb === 'zasiej' ? s.slowo('tool', 'grzyb') : s.ryt('zasiej'),
        gotowe: (g) => g.ui.verb === 'zasiej' && g.ui.tool === 'grzyb',
      },
      {
        tekst: (s) => s.gra.pauza
          ? 'Zaznacz dwa miejsca na grzyb. Nic się jeszcze nie stanie — narysują się szkice.'
          : 'Najpierw zatrzymaj czas — dopiero wtedy rozkazy czekają jako szkice.',
        wskaz: (s) => { const c = s.miejsceNaGrzyb(); return c ? { typ: 'swiat', cel: { ...c, tekst: 'zaznacz tutaj' } } : null; },
        gotowe: (g) => g.rozkazy.ile >= 2,
      },
      {
        tekst: 'Puść czas — rozkazy staną się naraz.', klawisz: 'pauza',
        wskaz: (s) => s.przycisk('pauza'),
        gotowe: (_g, z) => z?.typ === 'moc' && !!z.zPlanu,
      },
    ],
    koniec: 'W pauzie koszt jest tylko zarezerwowany, a szkic skreślisz dotknięciem bez rytu w ręku. Gdy wydarzy się coś ważnego, gra sama zatrzyma czas i powie, co możesz zrobić. Obok pauzy leżą „wolniej” i „szybciej”.',
  },
  {
    tytul: 'Jak to się kończy',
    wstep: 'Jedna wygrana, jedna przegrana — i długa droga między nimi.',
    czasowniki: [],
    etapy: [
      {
        tekst: 'To wstęga warstw: każda nacja ma tu swoje pasmo. Gdy jedna krew zje resztę, zaczniesz zasypiać — to twoja jedyna przegrana.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarSpisu(s.gra.plate, s.vh) }),
      },
      {
        tekst: 'Na dnie bije twój rdzeń — to twoja wygrana. Gdy warta wymodli dość pęknięć, wierni sami wejdą do środka i cię uwolnią.',
        rozumiem: true,
        wejdz: (g, s) => { const c = s.rdzen(); g.pokazMiejsce(c.x, c.y, 9, true); },
        wskaz: (s) => ({ typ: 'swiat', cel: s.rdzen() }),
      },
    ],
    koniec: 'Nie pozwól nikomu wyginąć ani zjeść reszty. Gdy jedna nacja rośnie za bardzo — szepnij komuś z niej „prorokuj” albo zawal jej korytarz.',
  },
  {
    tytul: 'Kronika',
    wstep: 'Gra przez cały czas pisze. Trzy ostatnie zdania widać pod płytą.',
    czasowniki: [],
    przygotuj: (g) => { g.doMieszkancow(); },
    etapy: [
      {
        tekst: 'Otwórz zapiski.', klawisz: 'zapiski',
        wskaz: (s) => s.przycisk('zapiski'), gotowe: (g) => g.zapiski,
      },
      {
        tekst: 'Zamknij je — dotknij gdziekolwiek.',
        gotowe: (g) => !g.zapiski,
      },
    ],
    koniec: 'Tu gra spisuje twoją legendę. Dotknięcie wpisu przenosi wzrok tam, gdzie to się stało.',
  },
];
