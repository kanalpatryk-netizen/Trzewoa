/**
 * RYTUAŁ, PIELGRZYMKA I WEJŚCIE DO RDZENIA — droga do wygranej.
 *
 * Jak to działa: wierni jednej nacji schodzą pod skorupę rdzenia (pielgrzymka),
 * modlą się tam (rytuał), a każde „pełne” odmodlenie wykuwa jedno pęknięcie
 * w skorupie. Gdy przez pęknięcia prowadzi droga, wierni schodzą do rdzenia —
 * i jeśli wierzą dość mocno, gra kończy się Uwolnieniem.
 *
 * Wartości „oddania” są w skali 0..1 (0 = nie wierzy wcale, 1 = całym sobą).
 * Odległości w kaflach od środka rdzenia.
 */
export const RYTUAL = {
  // ------------------------------------------------------------- kto się liczy
  /** Modlitwa liczy się w tym promieniu od rdzenia (kwadrat, nie koło). */
  promien: 16,
  /** Minimalne własne oddanie wiernego, żeby jego modlitwa się liczyła. */
  minOddanie: 0.35,
  /** Tylu wiernych jednej nacji naraz pod skorupą, żeby kamień w ogóle drgnął. */
  potrzebaWiernych: 3,
  /** Więcej wiernych przyspiesza — ale najwyżej do tylu. */
  maxWiernychLiczonych: 6,
  /** Liczba wiernych, przy której tempo jest „normalne” (×1). */
  normaWiernych: 3,

  // ------------------------------------------------------------------- tempo
  /**
   * Postęp jednego pęknięcia na kontrolę (kontrola co `coIleTikow`). Pęknięcie = 1.
   * WIĘCEJ = szybsza wygrana. Przy 4 wiernych i pełnym oddaniu 5 pęknięć to
   * ok. 10–15 minut warty.
   */
  tempo: 0.0004,
  /** Co ile tików liczy się postęp rytuału. */
  coIleTikow: 5,
  /** Oddanie nacji dodaje się do tej podstawy: tempo × (podstawa + oddanie). */
  podstawaOddania: 0.6,
  /** Każde kolejne pęknięcie idzie oporniej: dzielnik 1 + pęknięcia × opór. */
  oporNaPekniecie: 0.18,
  /** Mnożnik tempa w trybie „łaskawa góra”. */
  laskawaMnoznik: 1.3,
  /** Na początku partii skorupa jest twardsza: tempo startuje od tego ułamka… */
  wczesnieOd: 0.35,
  /** …i dochodzi do pełnego po tylu minutach gry. */
  wczesnieMinut: 12,

  // -------------------------------------------------------- kronika rytuału
  /** Przy tym postępie pierwszego pęknięcia kronika pisze, że zaczęli. */
  kronikaStart: 0.08,
  /** Przy tym — że kamień zaczyna się rysować. */
  kronikaPolowa: 0.55,

  // -------------------------------------------------------------- pęknięcia
  /** Każde pęknięcie daje graczowi tyle Wiary. */
  nagrodaWiary: 20,
  /** Pęknięcie schodzi kolumną w głąb aż do tylu kafli od rdzenia. */
  glebokoscPekniecia: 16,
  /** Kolejność kolumn przy kruszeniu: środek, potem boki. */
  kolumnyPekniec: [0, -1, 1, -2, 2],
  /** Co ile tików sprawdzać, czy do rdzenia prowadzi już droga. */
  sprawdzDrogeCo: 60,
  /** Szukanie drogi zaczyna się poza tym kwadratem wokół rdzenia… */
  drogaStartPozaPromieniem: 17,
  /** …i obejmuje pudło: tyle w bok, w górę i w dół. */
  drogaPudloX: 24, drogaPudloGora: 30, drogaPudloDol: 24,
  /** Kamień liczony w kolumnie nad rdzeniem (do kamieni milowych) — od tylu kafli. */
  kolumnaSkorupy: 16,

  // -------------------------------------------------------- zejście do rdzenia
  /** Co ile tików (gdy skorupa otwarta) szukamy kolejnego wiernego do zejścia. */
  zejscieCo: 20,
  /** Schodzi tylko ktoś w tej odległości od rdzenia. */
  zejscieZasieg: 22,
  /** Obcy (spoza prowadzącej nacji) schodzi, jeśli jego oddanie przekracza to. */
  zejscieObcyOddanie: 0.8,
  /** Budżet tików na zejście wysłanego wiernego. */
  zejscieTikow: 1500,
  /** Budżet tików na zejście pielgrzyma, który sam zauważył otwartą skorupę. */
  zejsciePielgrzymaTikow: 1200,
  /** Limit kroków szukania drogi do rdzenia. */
  zejscieLimitDrogi: 6000,

  // ------------------------------------------------------ wejście i wyrok
  /** Nacja wchodzi „jako wierni”, jeśli jej średnie oddanie przekracza to… */
  uwolnienieNacja: 0.55,
  /** …albo jeśli wchodzący sam wierzy mocniej niż to. Inaczej wejście = śmierć boga. */
  uwolnienieWlasne: 0.7,
  /** Dotknięcie rdzenia: stworzenie w tym kwadracie od środka sprawdza sąsiednie kafle. */
  dotykZasieg: 4,
  /** Wejście do komory przez otwartą skorupę: tyle kafli w poziomie i w pionie od środka. */
  komoraX: 8, komoraY: 7,
};

export const PIELGRZYMKA = {
  /** Ilu pielgrzymów naraz wysyła jedna nacja. Reszta zostaje w domu i je. */
  maxPielgrzymow: 5,
  /** Co najmniej tylu (o ile nacja ma ludzi) — tylu trzeba pod skorupą. */
  minPielgrzymow: 3,
  /** Pielgrzymów najwyżej taka część nacji. */
  czescNacji: 0.3,
  /** Nacja musi mieć tyle oddania, żeby w ogóle wysyłać pielgrzymów. */
  oddanieNacji: 0.6,
  /** Pielgrzym sam musi mieć tyle oddania… */
  oddanieWlasne: 0.45,
  /** …i być najedzony (głód poniżej tego). */
  najedzony: 0.35,
  /** Nacja musi liczyć co najmniej tylu. */
  minNacja: 8,
  /** I nie może być przeludniona (zatłoczenie rasy poniżej tego). */
  maxZatloczenie: 0.95,
  /** Schodzą bez drogi powrotnej, jeśli w przedsionku leży co najmniej tyle jedzenia. */
  jedzenieWPrzedsionku: 3,
  /** Szansa zejścia na decyzję: podstawa + bonus za bliskość przedsionka. */
  szansa: 0.06, szansaBliskosc: 0.3,
  /** Bonus za bliskość znika w tej odległości od przedsionka. */
  zasiegBliskosci: 90,
  /** Pielgrzym w drodze nie porzuca wyprawy przez tyle tików. */
  wyprawaTikow: 7000,
  /** Cel w przedsionku rozrzucony o ± tyle kafli w poziomie. */
  rozrzutCelu: 3,
  /** „W przedsionku” = w takim prostokącie od jego środka (pół szerokości, pół wysokości). */
  przedsionekX: 6, przedsionekY: 5,
  /** Pielgrzym szuka jedzenia, gdy głód przekroczy to… */
  glodSzukaJedzenia: 0.62,
  /** …w takim promieniu… */
  zasiegJedzenia: 12,
  /** …a gdy głód przekroczy to i nic nie ma, wraca do gniazda. */
  glodWraca: 0.7,
  /** Na miejscu: przyrost własnego oddania na tik. */
  modlitwaOddanie: 0.0012,
  /** Na miejscu: wiara karmi — tyle głodu ubywa na tik. */
  modlitwaKarmi: 0.00018,
  /** Na miejscu: tyle Wiary na tik dla gracza (× mnożnik dochodu). */
  modlitwaWiara: 0.0025,
  /** Co ile tików pielgrzym może pokazać dymek myśli i z jaką szansą. */
  mysliCo: 24, mysliSzansa: 0.3,
  /** Co ile tików (wg id) pielgrzym sprawdza, czy skorupa już otwarta. */
  sprawdzOtwarcieCo: 30,
  /** Liczenie pielgrzymów klanu: kto jest w pudle wokół punktu nad rdzeniem. */
  wartaPudloX: 20, wartaPudloY: 16, wartaNadRdzeniem: 8,
  /** Wynik sprawdzenia drogi powrotnej trzymany przez tyle tików. */
  powrotPamiecTikow: 3600,
  /** Limit kroków szukania drogi powrotnej. */
  powrotLimitDrogi: 12000,
  /** Jedzenie w przedsionku liczone w prostokącie: pół szerokości i zakres wysokości nad rdzeniem. */
  jedzeniePolSzerokosci: 12, jedzenieOd: 26, jedzenieDo: 2,
  /** Co ile tików liczyć jedzenie w przedsionku. */
  jedzenieCo: 60,
  /** Szaleństwo głębi nie ima się wiernych (oddanie powyżej tego) w pobliżu rdzenia… */
  ochronaOddanie: 0.5,
  /** …w tym kwadracie od rdzenia… */
  ochronaZasieg: 20,
  /** …a nawet im je leczy, o tyle na tik. */
  ochronaLeczy: 0.0015,
};

/**
 * PLAN DROGI PIELGRZYMÓW — kreska na mapie, którą gra podpowiada, gdzie drążyć.
 */
export const PLAN_DROGI = {
  /** Ile kosztuje przekopanie kafla skały względem przejścia korytarzem. */
  kosztSkaly: 6,
  /** Plan liczony dla nacji o oddaniu co najmniej tyle… */
  oddanieNacji: 0.6,
  /** …i liczącej co najmniej tylu. */
  minNacja: 8,
  /** Plan jest przeliczany najwyżej co tyle tików. */
  odswiezCo: 600,
};
