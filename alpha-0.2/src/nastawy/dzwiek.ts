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

/**
 * NIEPOKÓJ — warstwy pod muzyką, które nie dają się uspokoić: dudniący pomruk góry,
 * oddech dobiegający z głębi, odległe trzaski skały i chór bez słów, który czasem
 * przechodzi korytarzem. Wszystko gęstnieje z napięciem (sen i przewaga jednej krwi).
 */
export const NIEPOKOJ = {
  /** Pomruk: dwa niskie tony rozstrojone o tyle Hz (dudnienie) i ich głośność w menu / w grze (+ napięcie). */
  pomrukHz: 73.42, pomrukDudnienie: 0.45, pomrukMenu: 0.05, pomrukGra: 0.045, pomrukNapiecie: 0.06,
  /** Dzwonienie w uszach przy dużym napięciu: wysoka sekunda mała, ledwo słyszalna. */
  piskHz: 2349.3, piskGlos: 0.0035, piskOd: 0.45,
  /** Oddech góry: szum w paśmie, co tyle s (+ losowo), głośność, długość wdechu i wydechu. */
  oddechCo: 11, oddechRozrzut: 9, oddechGlos: 0.05, oddechWdech: 2.2, oddechWydech: 3.4,
  /** Trzaski skały: co tyle s (+ losowo), głośność; z napięciem częściej. */
  trzaskCo: 7, trzaskRozrzut: 14, trzaskGlos: 0.09,
  /** Chór bez słów: co tyle s (+ losowo), głośność, długość frazy; formanty samogłosek. */
  chorCo: 38, chorRozrzut: 30, chorGlos: 0.022, chorDlugosc: 9,
  /** Szept z ciemności (głośność sylab) i głuche uderzenie, gdy dłoń z otchłani kogoś zabiera. */
  szeptGlos: 0.05, zabranieGlos: 0.16,
  /** Pomruk otchłani, gdy z głębi zaczyna się wznosić dłoń (Koszmar: dłoń z otchłani). */
  otchlanGlos: 0.22,
  formanty: [[730, 1090], [570, 840], [300, 870], [440, 1020]] as [number, number][],
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

/**
 * GŁOS RYCERZA (Alpha) — nagrania z gra222/dzwieki/odmowy/rycerz/: rycerz mówi je na głos, gdy odmawia pójścia
 * tam, gdzie mu kazano, a nie da się dojść („nie dojdę tam — nie ma drogi”, „tam nie ma na czym stanąć”…).
 * Za każdym razem losuje jedno nagranie według szansy jego grupy. Szansa to procent na jedno nagranie;
 * razem ma wyjść 100 (tu: 4 × 17 + 3 × 8 + 3 × 2,5 + 1 × 0,5). Żeby zamienić rzadkość, przenieś numer
 * pliku do innej grupy (i popraw szanse, jeśli liczba plików w grupie się zmieni).
 * Nagranie spoza listy (nowy plik w folderze) gra jak pospolite.
 */
export const GLOS_RYCERZA: NastawyGlosu = {
  /** Które odmowy rycerz mówi na głos: te, których powód zaczyna się tak (wszystkie „nie dojdę…” i „tam …”). */
  odmowy: ['nie dojdę', 'tam '],
  /** Głośność głosu (mnożnik; razem z suwakiem głośności i przełącznikiem efektów). */
  glosnosc: 0.7,
  /** Ile głosu idzie w pogłos jaskini. */
  poglos: 0.16,
  /** Głos wchodzi tyle sekund po głuchym stuku odmowy (żeby się nie zlały). */
  opoznienie: 0.12,
  /** Najmniej tyle ms między dwiema odmowami na głos; póki rycerz mówi, następny nie zaczyna. */
  odstepMs: 500,
  /** Nagrania wyrównuje się do jednej głośności: średnia z głośnych fragmentów (dBFS), szczyt najwyżej −1 dBFS. */
  wyrownajDo: -20,
  /**
   * Początek nagrania (szum, stuk, oddech) jest odcinany aż do pierwszego fragmentu nie cichszego niż tyle dB pod
   * najgłośniejszym — rycerz odpowiada od razu. Więcej (np. −40) zostawia cichsze początki słów, mniej (−20) tnie śmielej.
   */
  mowaOd: -30,
  /** Cisza na końcu nagrania (poniżej tylu dBFS) jest odcinana. */
  ciszaPonizej: -45,
  /** Nagranie, którego najgłośniejsze miejsce jest cichsze niż tyle dBFS, uchodzi za puste i nie gra wcale. */
  pustePonizej: -50,
  /** Grupy rzadkości: szansa jednego nagrania (%) i numery plików (dziweki_part-NN.mp3). */
  rzadkosc: {
    pospolite: { szansa: 17, pliki: ['02', '04', '06', '08'] },
    rzadsze: { szansa: 8, pliki: ['10', '12', '14'] },
    bardzoRzadkie: { szansa: 2.5, pliki: ['15', '17', '19'] },
    ekstremalnieRzadkie: { szansa: 0.5, pliki: ['20'] },
  },
};

/**
 * GŁOS POBOŻNEGO (Alpha) — nagrania z gra222/dzwieki/odmowy/pobozny/: pobożny mówi je na głos tak samo jak rycerz,
 * gdy odmawia pójścia tam, gdzie się nie da dojść. Te same zasady co GLOS_RYCERZA wyżej: szansa to procent na jedno
 * nagranie, razem 100 (tu: 11 × 9,09 — wszystkie tak samo częste). Rzadsze nagranie: przenieś jego numer
 * (…_part-NN.mp3) do nowej grupy z mniejszą szansą i popraw resztę. Naraz mówi jeden — pobożny nie wchodzi w słowo rycerzowi.
 */
export const GLOS_POBOZNEGO: NastawyGlosu = {
  /** Które odmowy pobożny mówi na głos: te, których powód zaczyna się tak (wszystkie „nie dojdę…” i „tam …”). */
  odmowy: ['nie dojdę', 'tam '],
  /** Głośność głosu (mnożnik; razem z suwakiem głośności i przełącznikiem efektów). */
  glosnosc: 0.7,
  /** Ile głosu idzie w pogłos jaskini. */
  poglos: 0.16,
  /** Głos wchodzi tyle sekund po głuchym stuku odmowy (żeby się nie zlały). */
  opoznienie: 0.12,
  /** Najmniej tyle ms między dwiema odmowami pobożnego na głos. */
  odstepMs: 500,
  /** Nagrania wyrównuje się do jednej głośności: średnia z głośnych fragmentów (dBFS), szczyt najwyżej −1 dBFS. */
  wyrownajDo: -20,
  /**
   * Początek nagrania (szum, stuk, oddech) jest odcinany aż do pierwszego fragmentu nie cichszego niż tyle dB pod
   * najgłośniejszym — pobożny odpowiada od razu. Więcej (np. −40) zostawia cichsze początki słów, mniej (−20) tnie śmielej.
   */
  mowaOd: -30,
  /** Cisza na końcu nagrania (poniżej tylu dBFS) jest odcinana. */
  ciszaPonizej: -45,
  /** Nagranie, którego najgłośniejsze miejsce jest cichsze niż tyle dBFS, uchodzi za puste i nie gra wcale. */
  pustePonizej: -50,
  /** Grupy rzadkości: szansa jednego nagrania (%) i numery plików (…_part-NN.mp3). */
  rzadkosc: {
    pospolite: { szansa: 9.09, pliki: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'] },
  },
};

/** Nastawy głosu jednej roli (GLOS_RYCERZA, GLOS_POBOZNEGO) — core/glos-odmowy.ts. */
export interface NastawyGlosu {
  odmowy: string[];
  glosnosc: number;
  poglos: number;
  opoznienie: number;
  odstepMs: number;
  wyrownajDo: number;
  mowaOd: number;
  ciszaPonizej: number;
  pustePonizej: number;
  rzadkosc: Record<string, { szansa: number; pliki: string[] }>;
}
