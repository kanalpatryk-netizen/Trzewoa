/**
 * EKRAN USTAWIEŃ — napisy i układ listy.
 *
 * „Podstawa” to rozmiar liter etykiety wiersza; większość wymiarów wiersza
 * jest jej wielokrotnością (× podstawa), więc całość skaluje się z ekranem.
 * Same pozycje listy (co da się ustawić) są w src/app/screens/settings.ts.
 */
export const EKRAN_USTAWIEN = {
  // ------------------------------------------------------------------ napisy
  tytul: 'USTAWIENIA',
  ramaGora: 'Ustawienia · jak góra ma śnić',
  ramaDol: 'przeciągnij palcem, żeby przewijać',   // Android (na komputerze: klawisze i kółko)
  ramaDolWaski: 'przeciągnij, żeby przewijać',
  /** Przycisk powrotu w lewym górnym rogu. */
  wstecz: '‹ menu',
  czekamNaKlawisz: 'naciśnij klawisz, który ma to robić · esc anuluje',
  /** Słowa przełącznika. */
  nie: 'nie', tak: 'tak',

  // ----------------------------------------------------------------- układ
  /** Poniżej tej szerokości ekranu znikają długie napisy na ramie. */
  waskiPonizej: 700,
  /** Rozmiar tytułu: ekran / 26 (min–max). */
  tytulRozmiar: { min: 24, max: 44 },
  /** Najszersza lista (px). */
  maxSzerokosc: 880,
  /** Rozmiar etykiety wiersza: ekran / 62 (min–max). */
  podstawa: { min: 16, max: 19 },   // Android: min 16 (na komputerze 15)
  /** Wysokość wiersza i nagłówka działu (× podstawa) i dodatek na każdą kolejną linię opisu. */
  wysokoscWiersza: 3.05, wysokoscNaglowka: 3.1, nastepnaLinia: 0.85,
  /** Opis pod etykietą: rozmiar (× podstawa) i krycie. */
  opisRozmiar: 0.8, opisAlfa: 0.8,   // Android: większe i jaśniejsze (na komputerze 0.72 i 0.75)

  // -------------------------------------------------------------- kontrolki
  /** Długość linijki suwaka (px): wąski ekran (< 480 px listy) / szeroki. */
  suwakWaski: 58, suwak: 86,
  /** Przełącznik zajmuje tyle (× podstawa), klawisz tyle. */
  przelacznikSzer: 4.4, klawiszSzer: 4,
  /** Krycie zaznaczenia wiersza: lewa i prawa krawędź gradientu. */
  zaznaczenieOd: 0.55, zaznaczenieDo: 0.08,
  /** Rozbłysk po zmianie wartości trwa tyle ms. */
  blyskMs: 500,
  /** Pasek przewijania: krycie szyny, uchwytu i rombu. */
  szynaAlfa: 0.15, uchwytAlfa: 0.5, rombAlfa: 0.8,
};
