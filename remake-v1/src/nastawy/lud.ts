/**
 * LUD (Remake v1) — jeden lud w górze i jego trzy role.
 *
 * Pobożni modlą się i schodzą pod rdzeń, robotnicy kopią i znoszą jedzenie do siedziby,
 * rycerze walczą. Nikt się nie rodzi: co `wyjscieCo` tików skała wydaje nową postać tej
 * roli, którą wybrałeś u góry ekranu — za krew i z osłabieniem na pierwszą minutę.
 * Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry, 120 = sekunda).
 */
export type Rola = 'pobozny' | 'robotnik' | 'rycerz';
export interface MnoznikiRoli { hp: number; sila: number; szybkosc: number; kopanie: number; modlitwa: number; glod: number }

/** Remake v1: wyłącza stare mechanizmy (rozród, samoistne ofiary, przybysze). Typ boolean — żeby kompilator nie uznał kodu za martwy. */
export const REMAKE: boolean = true;

export const LUD = {
  /** Kto stoi przy siedzibie na początku partii. */
  start: { pobozny: 3, robotnik: 3, rycerz: 1 } as Record<Rola, number>,
  /** Jedzenie w spiżarni siedziby na start. */
  jedzenieStart: 60,
  /** Krew na start — zapas, z którego płacisz za nowych i za ryty. */
  krewStart: 120,
  /** Co tyle tików skała wydaje nową postać (20 s). */
  wyjscieCo: 2400,
  /** Ile krwi kosztuje wyjście ze skały (rycerzy się nie przywołuje — odkopuje się ich w skale). */
  koszt: { pobozny: 30, robotnik: 20 } as Record<'pobozny' | 'robotnik', number>,
  /** Najwięcej żywych postaci ludu naraz. */
  limit: 14,
  /** Świeżo wyszły ze skały: przez tyle tików siła, szybkość, kopanie i modlitwa × `oslabienie` (−60%). */
  oslabienieTikow: 7200, oslabienie: 0.4,

  /** Mnożniki statystyk rasy dla każdej roli (1 = bez zmian). */
  role: {
    pobozny: { hp: 1, sila: 1, szybkosc: 1, kopanie: 0.5, modlitwa: 1, glod: 0.3 },
    robotnik: { hp: 1.3, sila: 1.2, szybkosc: 1.05, kopanie: 1.4, modlitwa: 0.15, glod: 0.35 },
    rycerz: { hp: 4, sila: 5, szybkosc: 0.6, kopanie: 0.3, modlitwa: 0.1, glod: 0.45 },
  } as Record<Rola, MnoznikiRoli>,

  /** Samookaleczenie pobożnego: tyle krwi, a on na zawsze ma życie, siłę i szybkość × `okaleczenie`. */
  okaleczenieKrew: 25, okaleczenie: 0.75,
  /** Ofiara z własnego: tyle krwi (ponad zwykłą krew za śmierć). */
  ofiaraKrew: 40,

  /** Jedzenie: robotnicy znoszą do siedziby, dopóki w spiżarni jest mniej niż `zapasDo`. */
  zapasDo: 40,
  /** Jeden zebrany grzyb daje tyle jedzenia w spiżarni; jedno jedzenie ze spiżarni gasi tyle głodu. */
  plon: 2, posilek: 0.45,
  /** Szukając drogi do spiżarni, przeszukuje się najwyżej tyle kafli (to nie długość drogi, tylko zasięg szukania). */
  doSpizarni: 4000,
  /** Kto nie zdołał dojść do spiżarni, przez tyle tików szuka grzyba sam (10 s). */
  spizarniaPrzerwa: 1200,

  /** Siedziba: co tyle tików sprawdzamy, kto może do niej wrócić. */
  siedzibaCo: 600,
  /** Przenosiny, gdy więcej niż ta część ludu nie może wrócić — i nie częściej niż co tyle tików (2,5 min). */
  odcieciProg: 0.5, siedzibaPrzerwa: 18000,
  /** Odcięta grupka co najmniej tylu zakłada obóz (znacznik na mapie). */
  obozMin: 2,
  /** Ile jedzenia ze starej spiżarni robotnik bierze na raz. */
  przenoszenie: 3,

  /** Robotnik kopie i zbiera w tym prostokącie wokół siedziby (kafle w bok / w pionie). */
  robotnikZasieg: { x: 22, y: 9 },
  /** Nie kopie kafla, pod którym ziała pustka głębsza niż tyle — tak wpadali do jaskiń bez dna. */
  spadekMaks: 4,
  /** Strefa wokół rdzenia, do której robotnicy nie wchodzą — tam modlą się pobożni. */
  strefaRdzenia: 20,
  /** Rycerze na warcie stoją tyle kafli za krawędzią przedsionka, po obu jego stronach. */
  wartaOdstep: 2,
  /** Po szepcie „przerwij” pobożny przez tyle tików nie wraca do modlitwy (1 min). */
  przerwaModlitwy: 7200,

  /** Obóz ze spiżarnią: tylu stacjonujących (pobożni, rycerze) dalej niż `obozOdleglosc` od każdej spiżarni. */
  obozOdleglosc: 20, obozyMaks: 5, obozMinStacjonujacych: 3,
  /** Robotnik donosi jedzenie pobożnemu albo rycerzowi, gdy ten jest głodniejszy niż to. */
  glodDostawy: 0.35,
  /** Pobożni i rycerze sami idą jeść dopiero tak głodni — albo gdy nie ma żadnego robotnika. */
  glodSam: 0.8,
  /** Zasięg szukania drogi przy donoszeniu (kafle przeszukane, nie długość drogi). */
  dostawaLimit: 9000,

  /** Co tyle tików sprawdzamy, czy da się jeszcze wygrać. */
  przegranaCo: 240,
};
