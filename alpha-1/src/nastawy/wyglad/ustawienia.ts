/**
 * EKRAN USTAWIEŃ — napisy, barwy i układ.
 *
 * W stylu menu głównego: czarne tło, jasne napisy, ozdobniki przy wybranym wierszu.
 * Kategorie to ikonki w kolumnie po lewej; po najechaniu
 * wysuwa się z nich nazwa kategorii. W każdej kategorii najwyżej 5 ustawień.
 * Same pozycje (co da się ustawić) są w src/app/screens/settings.ts.
 * „r” to rozmiar liter wiersza; większość wymiarów to jego wielokrotności (× r).
 */
export const EKRAN_USTAWIEN = {
  // ------------------------------------------------------------------ napisy
  tytul: 'Ustawienia',
  /** Przycisk powrotu w lewym górnym rogu. */
  wstecz: '‹ menu',
  /** Słowa przełącznika. */
  nie: 'nie', tak: 'tak',
  /** Napis po wykonaniu akcji (np. „Przywróć domyślne”). */
  gotowe: 'gotowe',

  // ------------------------------------------------------------------ barwy
  tlo: '#000000',
  tytulBarwa: '#d9d4cb',
  napis: '#a9a49c', napisWybrany: '#ffffff',
  /** Wartość ustawienia (tak / 70% / kryzysy) i wartość nieaktywna (drugie słowo przełącznika). */
  wartosc: '#e8e3da', wartoscCicha: '#5f5b55',
  ozdobnik: '#78736c', ozdobnikWybrany: '#f2ede4',
  /** Ikonki kategorii: zwykła, najechana, wybrana. */
  ikona: '#6f6a64', ikonaNajechana: '#d6d1c8', ikonaWybrana: '#ffffff',
  /** Poświata wybranego wiersza (rgb). */
  poswiata: '255,236,210',

  // ----------------------------------------------------------------- układ
  /** Rozmiar liter wiersza (× h, obcięty do min–max) i odstęp wierszy (× r). */
  rozmiar: 0.034, rozmiarMin: 15, rozmiarMax: 30, odstep: 2.15,
  /** Tytuł: rozmiar (× h, min–max) i położenie (× h). */
  tytulRozmiar: 0.062, tytulMin: 26, tytulMax: 58, tytulY: 0.13,
  /** Lista: szerokość (× r, najwyżej część ekranu) i górna krawędź (× h). */
  szerokosc: 21, szerokoscMaxCzesc: 0.62, gora: 0.3,
  /** Ikonki: rozmiar (× r), odstęp (× rozmiar ikonki), odległość kolumny od listy (× r). */
  ikonaRozmiar: 1.9, ikonaOdstep: 1.75, ikonaOdListy: 3.2,
  /** Suwak: długość linijki i miejsce na liczbę (× r). */
  suwakDl: 6.5, suwakLiczba: 3.2,
  /** Ozdobnik: szerokość i odstęp od napisu (× r). */
  ozdobnikSzer: 1.05, ozdobnikOdstep: 0.25,

  // --------------------------------------------------------------- animacja
  /** Wysuwanie nazwy kategorii (ms) i jak długo wisi po zmianie kategorii klawiszem (ms). */
  wysuwMs: 180, nazwaPoKlawiszuMs: 1200,
  /** Rozbłysk po zmianie wartości i napis „gotowe” po akcji (ms). */
  blyskMs: 500, gotoweMs: 1400,
  /** Wejście na ekran (ms). */
  wejscieMs: 450,
};
