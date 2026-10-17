/**
 * LUD (Remake v1, Alpha) — jeden lud w górze i jego trzy role.
 *
 * Pobożni modlą się i schodzą pod rdzeń, robotnicy kopią i noszą jedzenie z wiader,
 * rycerz walczy. Alpha: stała drużyna — nikt się nie rodzi, skała nie wydaje nowych,
 * a kamiennych rycerzy w skale nie ma.
 * Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry, 120 = sekunda).
 */
export type Rola = 'pobozny' | 'robotnik' | 'rycerz';
export interface MnoznikiRoli { hp: number; sila: number; szybkosc: number; kopanie: number; modlitwa: number; glod: number }

/** Remake v1: wyłącza stare mechanizmy (rozród, samoistne ofiary, przybysze). Typ boolean — żeby kompilator nie uznał kodu za martwy. */
export const REMAKE: boolean = true;

export const LUD = {
  /** Kto stoi przy siedzibie na początku partii — cała drużyna na całą partię. */
  start: { pobozny: 2, robotnik: 3, rycerz: 1 } as Record<Rola, number>,
  /** Jedzenie w spiżarni siedziby na start. */
  jedzenieStart: 60,
  /** Krew na start — zapas, z którego płacisz za ryty i wybory na kartach. */
  krewStart: 120,
  /** Najwięcej żywych postaci ludu naraz (więcej niż na start da tylko dar z góry). */
  limit: 14,
  /**
   * Alpha: drużyna stała, więc się nie starzeje — ginie tylko z głodu, od ran i w ofierze (dawniej wszyscy
   * umierali ze starości w 15.–17. minucie, a nowych nikt nie przysyłał). `true` przywraca starość.
   */
  starzejeSie: false,

  /** Mnożniki statystyk rasy dla każdej roli (1 = bez zmian). */
  role: {
    pobozny: { hp: 1, sila: 1, szybkosc: 1, kopanie: 0.5, modlitwa: 1, glod: 0.3 },
    robotnik: { hp: 1.3, sila: 1.2, szybkosc: 1.05, kopanie: 1.4, modlitwa: 0.15, glod: 0.35 },
    // Alpha: rycerz jest jeden — dużo silniejszy (dawniej życie ×4, siła ×5, szybkość ×0,6)
    rycerz: { hp: 12, sila: 11, szybkosc: 0.75, kopanie: 0.3, modlitwa: 0.1, glod: 0.35 },
  } as Record<Rola, MnoznikiRoli>,

  /** Samookaleczenie pobożnego: tyle krwi, a on na zawsze ma życie, siłę i szybkość × `okaleczenie`. */
  okaleczenieKrew: 25, okaleczenie: 0.75,
  /** Ofiara z własnego: tyle krwi (ponad zwykłą krew za śmierć). */
  ofiaraKrew: 40,

  /** Jedzenie: robotnicy znoszą do siedziby, dopóki w spiżarni jest mniej niż `zapasDo`. */
  zapasDo: 150,
  /** Jeden zebrany grzyb daje tyle jedzenia w spiżarni; jedno jedzenie ze spiżarni gasi tyle głodu. */
  plon: 2, posilek: 0.45,
  /** Szukając drogi do spiżarni, przeszukuje się najwyżej tyle kafli (to nie długość drogi, tylko zasięg szukania). */
  doSpizarni: 9000,
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

  /**
   * Nie kopie kafla, pod którym ziała pustka głębsza niż tyle — tak wpadali do jaskiń bez dna; i sam nie
   * zeskakuje z wyższej półki (Remake v2: bez lin i klamer — w górę wchodzi najwyżej o stopień, wyżej kuje schody).
   */
  spadekMaks: 4,
  /** Strefa wokół rdzenia, do której robotnicy nie wchodzą — tam modlą się pobożni. */
  strefaRdzenia: 20,
  /** Rycerze na warcie stoją tyle kafli za krawędzią przedsionka, po obu jego stronach. */
  wartaOdstep: 2,
  /** Po szepcie „przerwij” pobożny przez tyle tików nie wraca do modlitwy (1 min). */
  przerwaModlitwy: 7200,

  /** Obóz ze spiżarnią: tylu stacjonujących (pobożni, rycerze) dalej niż `obozOdleglosc` od każdej spiżarni. */
  obozOdleglosc: 20, obozyMaks: 5, obozMinStacjonujacych: 3,
  /** Obóz staje na płaskiej półce co najmniej tak szerokiej (kafle); nowy najwyżej co minutę; pusty obóz żyje co najmniej 2 min. */
  obozSzerokosc: 5, obozWysokosc: 3, obozPrzerwa: 7200, obozZycie: 14400,
  /** Robotnik donosi jedzenie pobożnemu albo rycerzowi, gdy ten jest głodniejszy niż to. */
  glodDostawy: 0.35,
  /** …a stojącym daleko od jedzenia (dalej niż `daleko`) już przy takim głodzie. */
  glodDostawyDaleko: 0.2,
  /** Pobożni i rycerze sami idą jeść dopiero tak głodni — albo gdy nie ma żadnego robotnika. */
  glodSam: 0.6,
  /** Gdy we wszystkich spiżarniach razem jest mniej jedzenia niż tyle, robotnik idzie po grzyb także poza strefę pracy. */
  pustoPonizej: 15,
  /** Przy takim głodzie niosący jedzenie zjada własny ładunek, zamiast paść z nim w rękach. */
  zjadaNiesione: 0.85,
  /** Stacjonujący ze spiżarnią z jedzeniem w tej odległości (kafle) je sam, gdy tylko zgłodnieje. */
  spizarniaObok: 10,
  /** Tak głodny stacjonujący bez dostawy odrywa kopacza drogi od pracy. */
  glodPilny: 0.55,
  /** Obóz frontowy z mniej niż tyle jedzenia robotnicy zaopatrują z najbogatszej spiżarni, po tyle naraz. */
  obozMinZapas: 24, zapasPartia: 12,
  /** Najwyżej tylu robotników naraz niesie zapas do obozu frontowego. */
  zapasNosicieli: 3,
  /** Zasięg szukania drogi przy donoszeniu (kafle przeszukane, nie długość drogi). */
  dostawaLimit: 9000,

  /** Lud ucieka w górę, gdy woda pod nogami sięga tyle (0–8). */
  wodaUcieka: 4,
  /** Dalej niż tyle kafli od spiżarni z jedzeniem robotnik rusza jeść wcześniej, a kopacz drogi dostaje dostawę. */
  daleko: 45,
  /** Grzyb w tej odległości od obozu (kafle) robotnicy zbierają do jego spiżarni. */
  grzybPrzyObozie: 10,
  /** Zamiar postaci trwa tyle tików (10 s), chyba że cel osiągnie wcześniej albo przerwie go coś pilnego. */
  zamiarTikow: 1200,

  /**
   * Weteran: po `weteranPo` tikach w ludzie (4 min), dopóki najedzony (głód poniżej `weteranGlod`)
   * i wierny (oddanie co najmniej `weteranWiara`) — siła, szybkość, kopanie i modlitwa × `weteranPremia`.
   */
  weteranPo: 28800, weteranGlod: 0.45, weteranWiara: 0.2, weteranPremia: 1.3,

  /**
   * Uprawa: przy każdej spiżarni, przy której w promieniu `uprawaZasieg` jest robotnik, co `uprawaCo` tików
   * odrasta jeden grzyb (na podłodze, najwyżej `uprawaPromien` kafli od spiżarni), dopóki rośnie ich tam mniej niż `uprawaDo`.
   */
  uprawaCo: 600, uprawaDo: 8, uprawaPromien: 7, uprawaZasieg: 14,
  /** Uprawa: gdy przy spiżarni nie ma podłogi, sadzi do `uprawaZasieg` kafli w bok i tyle w pionie (i tam liczy grzyb). */
  uprawaWPionie: 6,

  /** Co tyle tików sprawdzamy, czy da się jeszcze wygrać. */
  przegranaCo: 240,

  // ---------------------------------------------------------------- Remake v2
  /**
   * Gdy w ludzie nie zostanie ani jeden rycerz, robotnicy zakładają hełmy i biorą kilofy do walki:
   * życie i siła × tyle, walczą ze Strażnikami Snu i bossem jak rycerze (zdejmują hełmy, gdy rycerze wrócą).
   */
  helm: { hp: 1.8, sila: 3.2 },
  /** Trupy ludu zostają na ziemi — najwyżej tyle naraz (najstarsze rozsypują się w kości). */
  trupyMax: 40,
  /** Pobożni stawiają ołtarz najwyżej raz na tyle tików (3 min) — bez spiżarni nie płacą jedzeniem. */
  oltarzCo: 21600,
};
