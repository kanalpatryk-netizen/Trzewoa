/**
 * DŹWIĘK — muzyka, mikser i dźwięki gestów. Wszystko syntezowane w locie.
 *
 * Głośności to mnożniki (1 = jak teraz, 0.5 = o połowę ciszej, 0 = wyciszone).
 * Czasy w sekundach, częstotliwości w hercach.
 */
export const MUZYKA = {
  /** Udział muzyki we wspólnej głośności. */
  glosnosc: 0.85,
  /** Poziom akordów tła względem dzwonów. */
  akordy: 0.4,
  /** Skala w półtonach od podstawy (tu: frygijska — stara i niepokojąca). */
  skala: [0, 1, 3, 5, 7, 8, 10],
  /** Podstawa skali: D3. */
  podstawa: 146.83,
  /** Długość jednego akordu: w grze (skraca się z napięciem o `skrotNapiecia`) i gdzie indziej. */
  akordGra: 13, akordInne: 11, skrotNapiecia: 4,
  /** Filtr akordu: od ilu Hz się otwiera, do ilu dochodzi (+ tyle przy pełnym napięciu). */
  filtrOd: 260, filtrSzczyt: 520, filtrNapiecie: 520, filtrDo: 240,
  /** Głośność głosu akordu (+ losowo do `akordRozrzut`) i basu. */
  akordGlos: 0.07, akordRozrzut: 0.03, bas: 0.12,
  /** Odstrojenie głosów akordu (centy, ±połowa). */
  odstrojenie: 12,
  /** Rozstaw głosów w panoramie (−1 lewo … 1 prawo). */
  rozstaw: 0.55,
  /** Dzwon: przerwa w menu / w grze + losowo do `dzwonRozrzut` − napięcie × `dzwonNapiecie`. */
  dzwonMenu: 9, dzwonGra: 6, dzwonRozrzut: 7, dzwonNapiecie: 3, dzwonMinPrzerwa: 2.5,
  /** Głośność dzwonu (+ losowo do rozrzutu) i ile idzie w pogłos. */
  dzwonGlos: 0.12, dzwonGlosRozrzut: 0.06, dzwonPoglos: 0.55,
  /** Metaliczność dzwonu: stosunek modulatora i głębokość modulacji. */
  dzwonMetal: 2.76, dzwonModulacja: 1.4,
  /** Narastanie muzyki po starcie (s). */
  narastanie: 3,
  /** Progresje akordów: stopnie skali i bas dla każdej sceny (kolejno, w kółko). */
  progresja: {
    menu: [
      { stopnie: [0, 2, 4], bas: -12 },
      { stopnie: [0, 3, 5], bas: -12 },
      { stopnie: [-2, 1, 3], bas: -14 },
      { stopnie: [0, 2, 5], bas: -12 },
    ],
    samouczek: [
      { stopnie: [0, 2, 4], bas: -12 },
      { stopnie: [1, 3, 5], bas: -11 },
      { stopnie: [0, 2, 4], bas: -12 },
      { stopnie: [-1, 2, 4], bas: -13 },
    ],
    gra: [
      { stopnie: [0, 2, 4], bas: -12 },
      { stopnie: [-2, 0, 3], bas: -14 },
      { stopnie: [1, 3, 5], bas: -11 },
      { stopnie: [0, 2, 6], bas: -12 },
      { stopnie: [-3, -1, 2], bas: -15 },
    ],
    koniec: [
      { stopnie: [0, 3, 5], bas: -12 },
      { stopnie: [-2, 1, 3], bas: -14 },
    ],
  },
};

/** Rezonans świata: niski ton kamienia, praca i modlitwa. */
export const REZONANS = {
  /** Udział rezonansu we wspólnej głośności. */
  glosnosc: 0.55,
};

export const MIKSER = {
  /** Wzmocnienie całej gry przed ogranicznikiem. */
  wzmocnienie: 1.6,
  /** Ogranicznik: próg (dB), kolano, stosunek, atak i zwolnienie (s). */
  ogranicznikProg: -10, ogranicznikKolano: 8, ogranicznikStosunek: 6, ogranicznikAtak: 0.005, ogranicznikZwolnienie: 0.25,
  /** Pogłos jaskini: długość ogona (s). */
  poglos: 3.4,
  /** Pauza: świat słychać jak zza skały — filtr schodzi do tylu Hz… */
  pauzaFiltr: 420,
  /** …a głośność świata spada o tyle. */
  pauzaCiszej: 0.35,
  /** Ostrzeżenie przycisza resztę do tego poziomu. */
  przyciszenie: 0.35,
};

/** Dźwięki gestów gracza: głośność każdego z osobna i minimalny odstęp powtórzeń (ms). */
export const GESTY = {
  glosnosc: {
    klik: 1,
    szkic: 1,
    skresl: 1,
    odmowa: 1,
    pauza: 1,
    tonPauzy: 1,
    wykonanie: 1,
    alarmKryzys: 1,
    alarmWydarzenie: 1,
    kartka: 1,
    tablica: 1,
  },
  odstepMs: { klik: 60, szkic: 85, skresl: 90, odmowa: 280, kartka: 150 },
  /** Kaskada wykonanego planu (Hz) — po jednym tonie na rozkaz. */
  kaskada: [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99],
};
