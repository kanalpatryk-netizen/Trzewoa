import type { EkranSamouczka } from '../tutorial';
import type { EkranGry, ZdarzenieGry } from '../game';
import type { Cel } from '../../../render/znaczniki';
import { obszarOddania, obszarSpisu, type Obszar } from '../../../render/plate';
import { wylosuj } from '../../../sim/wydarzenia';
import { PIELGRZYMKA } from '../../../nastawy/rytual';
import { LUD } from '../../../nastawy/lud';
import { WIADRO } from '../../../nastawy/wiadro';
import { DLON } from '../../../nastawy/dlon';
import { STRAZNICY } from '../../../nastawy/straznicy';
import { KOSZTY } from '../../../nastawy/moce';
import { wiadroTeraz } from '../../../sim/wiadro';
import { probaPlanu } from '../../../sim/pomieszczenia';
import { POMIESZCZENIA } from '../../../nastawy/pomieszczenia';
import { OLTARZ } from '../../../nastawy/oltarz';
import type { Sim } from '../../../sim/sim';

/** Samouczek pomieszczeń: pierwsze miejsce w skale obok sali, gdzie wolno położyć warsztat (dolny rząd wnętrza). */
function miejsceNaWarsztat(sim: Sim): { x: number; y: number } | null {
  const s = sim.world.salaStart;
  for (let dx = 0; dx < 40; dx++) for (const k of [1, -1]) for (const dy of [0, -1, 1]) {
    const x = s.x + k * dx, y = s.y + dy;
    const p = probaPlanu(sim, 'warsztat', x, y);
    // w litej skale (najwyżej kolumna wejścia już pusta) — nie pod sklepieniem sali
    const litych = p.kafle.filter((i) => sim.world.solid(i % sim.world.w, (i / sim.world.w) | 0)).length;
    if (p.ok && litych >= p.kafle.length - p.h) return { x, y };
  }
  return null;
}

/** Próg pielgrzymki w procentach — samouczek mówi tę samą liczbę, co dłonie oddania. */
const PROG = `${Math.round(PIELGRZYMKA.oddanieNacji * 100)}%`;

/**
 * TREŚĆ SAMOUCZKA — krótkie rozdziały (Alpha: lud, wiadra, ryty, pauza, wydarzenia, bez lin, ciemność,
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
        tekst: 'Wiara rośnie, gdy pobożni się modlą. Krew płynie z każdej śmierci i z ofiar — na Koszmarze jest jej mało. Jedzenie to porcje w wiadrze, które zjeżdża z góry do sali. Wiarę i krew wydajesz na ryty i wybory na kartach.',
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
    wstep: `Twój lud to stała drużyna: ${LUD.start.robotnik} robotników, ${LUD.start.pobozny} pobożnych i ${LUD.start.rycerz} rycerz. Nikt się nie rodzi i nikt nowy nie przyjdzie.`,
    czasowniki: [],
    etapy: [
      {
        tekst: 'Pobożni modlą się i kruszą skorupę rdzenia. Robotnicy kopią drogę i donoszą jedzenie z wiadra. Rycerz broni i walczy ze Strażnikami Snu — a gdy zginie, robotnicy zakładają hełmy i walczą sami.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarSpisu(s.gra.plate, s.vh) }),
      },
      {
        tekst: `Kto przeżyje ${Math.round(LUD.weteranPo / 7200)} minuty, najedzony, a lud wierzy — zostaje weteranem: +${Math.round((LUD.weteranPremia - 1) * 100)}% do wszystkiego i jasna aureola.`,
        rozumiem: true,
      },
    ],
    koniec: 'Każda postać ma swój zamiar — dotknij jej, a karta powie, co robi i ile jeszcze.',
  },
  {
    tytul: 'Pomieszczenia',
    wstep: 'W skale możesz wyznaczyć pomieszczenia: sypialnię, warsztat, kuźnię, korytarz i szyb — kują je robotnicy, którym plan wskażesz. Linę wieszasz sam, od razu.',
    czasowniki: [],
    etapy: [
      {
        tekst: 'Dotknij „wyznacz pomieszczenie” pod płytą.', klawisz: 'planuj',
        wskaz: (s) => { const p = s.gra.miejscePolaDruzyny('pomieszczenia'); return p ? { typ: 'punkt', x: p.x + p.w / 2, y: p.y + p.h / 2, r: p.h / 2 + 4 } : null; },
        gotowe: (g) => !!g.szablon,
      },
      {
        tekst: 'Pod palcem masz plan warsztatu. Dotknij skały obok sali — tam, gdzie obrys świeci jasno.',
        wejdz: (g) => g.ustawSzablon('warsztat'),
        wskaz: (s) => { const m = miejsceNaWarsztat(s.gra.sim); return m ? { typ: 'swiat', cel: { x: m.x + 0.5, y: m.y - 0.5, r: 3, tekst: 'tutaj' } } : null; },
        gotowe: (_g, z) => z?.typ === 'plan',
      },
      {
        tekst: 'Zaznacz robotników (medalion albo A) i dotknij planu — wykują go.', klawisz: 'robotnicy',
        wejdz: (g) => g.ustawSzablon(null),
        gotowe: (_g, z) => z?.typ === 'polecenie' && z.rodzaj === 'pomieszczenie' && z.przyjeli > 0,
      },
      {
        tekst: `Gotowy warsztat zamienia złoto w wiarę (${POMIESZCZENIA.warsztat.zlotoNaSztuke} złota — ${POMIESZCZENIA.warsztat.wiaraZaSztuke} wiary), kuźnia — żelazo w zbroję rycerza (rycerz sam ją zakłada, gdy nie ma fali), a sen w sypialni zdejmuje osłabienia. Wolni robotnicy sami nic nie biorą: pracują ci, którym wskażesz.`,
        rozumiem: true,
      },
    ],
    koniec: 'Korytarz i szyb ciągniesz palcem od miejsca, gdzie stoi lud — szyb schodzi prostymi schodami, więc da się nim wrócić. Linę wieszasz, wskazując skałę, której się uczepi (krawędź półki, strop) — spada z haka do podłogi; pięć pierwszych jest za darmo, potem kosztują krew.',
  },
  {
    tytul: 'Ołtarz',
    wstep: 'Na środku sali, w smudze światła z góry, stoi ołtarz. Przy nim pobożny odprawia rytuały — płacisz za nie krwią.',
    przygotuj: (g) => { g.sim.krew = Math.max(g.sim.krew, 60); },
    czasowniki: [],
    etapy: [
      {
        tekst: 'Zaznacz pobożnych — medalion pod płytą albo S.', klawisz: 'pobozni',
        wskaz: (s) => { const p = s.gra.miejscePolaDruzyny('rola', 'pobozny'); return p ? { typ: 'punkt', x: p.x + p.w / 2, y: p.y + p.h / 2, r: p.h / 2 + 4 } : null; },
        gotowe: (g) => g.zaznaczeniRoli('pobozny') > 0,
      },
      {
        tekst: 'Dotknij ołtarza — pobożny pójdzie do niego, a otworzy się okno rytuałów.',
        wskaz: (s) => { const o = s.gra.sim.world.oltarz; return { typ: 'swiat', cel: { x: o.x + 0.5, y: o.y - 1.5, r: 3, tekst: 'ołtarz' } }; },
        gotowe: (_g, z) => z?.typ === 'oltarz' && z.rodzaj === 'okno',
      },
      {
        tekst: `Gdy pobożny stanie przy ołtarzu, wybierz „Modlitwa” (${OLTARZ.rytualy.modlitwa.krew} krwi) — od krzyża biją promienie, a wiara rośnie.`,
        wskaz: (s) => { const p = s.gra.poleOltarza('modlitwa'); return p ? { typ: 'punkt', x: p.x + p.w / 2, y: p.y + p.h / 2, r: Math.min(p.w, p.h) / 2 + 4 } : null; },
        gotowe: (_g, z) => z?.typ === 'oltarz' && z.rodzaj === 'modlitwa',
      },
      {
        tekst: `Szał krwi rozpala rycerza na minutę. Wskrzeszenie przywraca poległego, którego ciało jeszcze leży (${OLTARZ.rytualy.wskrzeszenie.krew} krwi). Ofiara krwi i ofiara życia dają krew — tylko tutaj, nie w szeptach.`,
        rozumiem: true,
      },
    ],
    koniec: 'Ołtarz i każdy rytuał mają swoją tablicę w atlasie. Rytuał przepada, gdy pobożny odejdzie od ołtarza — krew wtedy wraca.',
  },
  {
    tytul: 'Jedzenie z góry',
    wstep: 'Grzyba ani spiżarni nie ma. Jedzenie zjeżdża z góry w jednym wiadrze, na linie, zawsze tym samym szybem.',
    przygotuj: (g, s) => { g.sim.krew += 60; if (!s.najblizszeWiadro()) wiadroTeraz(g.sim); },
    czasowniki: ['zasiej'],
    etapy: [
      {
        tekst: `Co ${Math.round(WIADRO.co / 120)} s z góry zjeżdża wiadro pełne jedzenia — węższym otworem do sali, na dno kolumny pod nim. Kto wykopie pod wiadrem dziurę, sprowadzi je niżej. Do tych w głębi samo nie zjedzie — zaniosą im robotnicy, a kto zszedł drogą wiernych, wróci nią po linach na zakrętach. Kto umiera z głodu, a wiadro jeszcze jedzie, wspina się po linie i je w drodze w dół.`,
        rozumiem: true,
        wskaz: (s) => { const c = s.najblizszeWiadro(); return c ? { typ: 'swiat', cel: c } : null; },
      },
      {
        tekst: 'Gdy jedzenia nie starcza, dosyp. Wybierz ryt „Nakarm” po lewej.', klawisz: 'zasiej', cofa: true,
        wskaz: (s) => s.ryt('zasiej'), gotowe: (g) => g.ui.verb === 'zasiej',
      },
      {
        tekst: 'Dotknij płyty — jedzenie zjedzie szybem, do tego samego wiadra.',
        wskaz: (s) => { const c = s.miejsceNaGrzyb(); return c ? { typ: 'swiat', cel: c } : null; },
        gotowe: (_g, z) => z?.typ === 'moc' && z.czasownik === 'zasiej',
      },
    ],
    koniec: `Z góry zjeżdża ${WIADRO.nakarmPorcji} porcji więcej za ${KOSZTY.zasiej.grzyb.krew} krwi. Liczba „jedzenie” nad płytą to porcje w wiadrze.`,
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
    koniec: `Idzie pod twój rdzeń. Gdy się tam pomodli, skorupa zacznie pękać. Krew dają ofiary przy ołtarzu — nie szepty.`,
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
    wstep: 'Co chwilę coś się dzieje: najazd z powierzchni, zaraza, głód, zgniłe jedzenie, zawał nad drogą wiernych. Czas wtedy staje, a ty wybierasz.',
    czasowniki: [],
    przygotuj: (g) => { g.sim.krew += 40; g.sim.wiara += 40; },
    etapy: [
      {
        tekst: 'Za chwilę pokaże się karta. Przeczytaj ją i dotknij jednego z wyborów.',
        wejdz: (g) => { g.sim.wydarzenia.gracz = true; if (!wylosuj(g.sim, 'plony')) wylosuj(g.sim, 'znak'); },
        gotowe: (_g, z) => z?.typ === 'wydarzenie',
      },
    ],
    koniec: 'Każdy wybór ma cenę i skutek, napisane wprost.',
  },
  {
    tytul: 'Bez lin',
    wstep: 'To Koszmar. Góra nie czeka na tych, którzy zostają z tyłu.',
    czasowniki: [],
    etapy: [
      {
        tekst: 'Lud nie ma lin: w górę wchodzi najwyżej o jeden stopień, a wyżej musi wykuć sobie schody. W dół zsuwa się szybem albo zeskakuje z niewysokiej półki — zejść łatwo, wrócić długo.',
        rozumiem: true,
      },
      {
        tekst: 'Gdy zginie rycerz, robotnicy zakładają hełmy i walczą zamiast niego. A kto umrze, nie znika — jego ciało leży tam, gdzie padł.',
        rozumiem: true,
      },
    ],
    koniec: 'Trupy mówią, gdzie lud ginie — tam spuść wiadro albo poślij rycerza.',
  },
  {
    tytul: 'Ciemność',
    wstep: 'Poza światłem lampek, siedziby i rdzenia góra jest ciemna. I coś w tej ciemności jest.',
    czasowniki: [],
    etapy: [
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
        tekst: 'Dopóki fala trwa, skorupa nie pęka. Rycerz (albo robotnicy w hełmach) walczy sam; pobożni i reszta robotników odchodzą spod rdzenia.',
        rozumiem: true,
        wejdz: (g) => { const w = g.sim.world; g.pokazMiejsce(w.coreX, w.przedsionekY, 10, true); },
      },
      {
        tekst: 'Śniącego Kamienia ranią tylko walczący — rycerz idzie na niego sam. Boss słabnie, gdy pod rdzeniem modlą się pobożni, a zasypaną przez niego drogę odkopują robotnicy. Gdy walczących brak, pobożni razią go księgami.',
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
        tekst: 'Najpierw robotnicy kopią drogę do rdzenia (złota kreska). Wysłani pobożni czekają przy obozie, aż będzie gotowa — wtedy schodzą, a rycerz idzie z nimi na wartę.',
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
        tekst: 'Gdy nie zostanie żaden pobożny — to koniec: nikt inny nie skruszy skorupy, a nowych nikt nie wyda. Najczęściej zabija głód: lud rozproszony daleko od wiadra.',
        rozumiem: true, wskaz: (s) => ({ typ: 'obszar', o: obszarSpisu(s.gra.plate, s.vh) }),
      },
    ],
    koniec: 'Trzymaj lud razem, pilnuj, żeby robotnicy donosili jedzenie z wiadra, i nie wysyłaj pod rdzeń ostatniego pobożnego. Wszystko, co tu było, znajdziesz w atlasie.',
  },
];

/** Pasek zasobów nad płytą (telefon) — tam, gdzie EkranGry.rysujZasoby pisze liczby. */
function obszarZasobow(p: { x: number; y: number; w: number; top: number; niski: boolean }): Obszar {
  return { x: p.x + (p.niski ? 0 : p.w * 0.1), y: p.y - p.top * 0.85, w: p.niski ? p.w * 0.6 : p.w * 0.8, h: p.top * 0.75 };
}
