/**
 * ATLAS — okno z tablicami (w grze i w menu), siatka miniatur i pojedyncza tablica.
 * Treść samych tablic (nazwy, opisy, ryciny) jest w src/atlas/tablice.ts.
 */
export const ATLAS = {
  // ------------------------------------------------------------------ napisy
  tytul: 'ATLAS',
  zamknij: 'zamknij ×',
  doAtlasu: 'cały atlas ›',
  wstecz: '‹ atlas',
  nowaTablica: 'N O W A   T A B L I C A   W   A T L A S I E',
  /** Pod kropkami postępu; {ile} i {z} podmieniane na liczby. */
  postep: 'odkryte {ile} z {z} tablic — resztę znajdziesz w górze',
  podpowiedz: 'kółko albo przeciągnięcie przewija · esc zamyka',
  /** Napisy na ramie ekranu atlasu w menu (szeroki / wąski ekran). */
  ramaGora: 'Atlas trzewi · tablice ras, rytów i praw góry', ramaGoraWaski: 'Atlas',
  ramaDol: 'odkryte {ile} z {z} · kółko przewija · esc zamyka', ramaDolWaski: 'odkryte {ile} z {z}',
  waskiPonizej: 700,
  /** Tablica „Droga do wolności” otwiera się sama po tylu tikach nowej gry (przy domyślnym tempie 2× i 60 klatkach: 2400 ≈ 20 s). */
  drogaPoTikach: 2400,

  // ----------------------------------------------------------------- układ
  /** Przyciemnienie świata pod oknem w grze. */
  tloAlfa: 0.88,
  /** Rozmiar liter okna: ekran / 60 (min–max). */
  rozmiar: { min: 14, max: 18 },
  /** Najszersza pojedyncza tablica i najszersza siatka (px). */
  maxTablica: 470, maxSiatka: 900,
  /** Tytuł „ATLAS”: ekran / 24 (min–max). */
  tytulRozmiar: { min: 24, max: 44 },
  /** Kropki postępu: odstęp (px) i krycie odkrytej / nieodkrytej. */
  kropkaOdstep: 14, kropkaAlfa: 0.9, kropkaNieznanaAlfa: 0.3,
  /** Przewijanie klawiszami strzałek (px) i kółkiem (mnożnik). */
  przewinStrzalka: 80, przewinKolko: 0.7,

  // --------------------------------------------------------------- siatka
  /** Kolumn: szerokość / 118, obcięte do min–max. */
  kolumny: { min: 2, max: 6, szerokosc: 118 },
  /** Odstęp między miniaturami (px) i ich proporcje (wysokość / szerokość). */
  odstep: 12, proporcje: 1.22,
  /** Kolejność grup w siatce. */
  grupy: ['rasy', 'ryty', 'zasoby', 'prawa'],
};

/** Miniatura tablicy w siatce atlasu. */
export const MINIATURA = {
  /** Wskazana miniatura unosi się o tyle px i rzuca taki cień. */
  uniesienie: 3, cien: 14, cienY: 4, cienAlfa: 0.7,
  /** Krycie ramy: wskazana / zwykła. */
  ramaWskazana: 1.3, ramaZwykla: 0.8,
  /** Wosk pieczęci na nieodkrytej tablicy: jasny i ciemny kolor (r,g,b) i pulsowanie. */
  woskJasny: '170,50,40', woskCiemny: '80,16,14', puls: 0.15,
  /** Pieczęć zajmuje taką część krótszego boku ryciny. */
  pieczec: 0.22,
  /** Złote narożniki wskazanej miniatury: krycie i grubość. */
  naroznikAlfa: 0.85, naroznikGrubosc: 1.5,
};

/** Pełna tablica (po kliknięciu miniatury). */
export const TABLICA = {
  /** Rozmiar liter: szerokość / 24 (min–max). */
  rozmiar: { min: 14, max: 19 },
  /** Rycina ma co najmniej tyle px wysokości i najwyżej taką część szerokości. */
  rycinaMin: 120, rycinaMax: 0.62,
  /** Tytuł tablicy (× rozmiar) i rozstrzelenie liter. */
  tytul: 1.35, rozstrzelenie: 0.14,
  /** Interlinia opisu i akapitu „kiedy”. */
  interlinia: 1.3, interliniaKiedy: 1.25,
};
