/**
 * OZDOBY — rama ryciny, kartusz z tytułem, przerywniki i nagłówki działów.
 * Wspólne dla menu, atlasu i ustawień.
 *
 * Rozmiary „min / max / część” = rozmiar to `część × szerokość ekranu`,
 * ale nie mniej niż `min` i nie więcej niż `max` pikseli.
 * „Alfa” = krycie 0..1 (0 = niewidoczne, 1 = pełne).
 * Mnożniki „× rozmiar” liczone są od wielkości czcionki danego elementu.
 */
export const RAMA = {
  /** Odstęp ramy od krawędzi ekranu. */
  margines: { min: 12, max: 34, czesc: 0.024 },
  /** Szerokość pasa podziałki między linią zewnętrzną a wewnętrzną. */
  pas: { min: 8, max: 14, czesc: 0.01 },
  /** Odstęp kresek podziałki: ekran / dzielnik, obcięty do min–max. */
  krok: { min: 14, max: 24, dzielnik: 60 },
  /** Co która kreska jest długa. Krótka ma taką część szerokości pasa. */
  dlugaCo: 5, krotka: 0.45,
  /** Krycie: linia zewnętrzna, wewnętrzna, podziałka, rogi. */
  alfaZewnetrzna: 0.5, alfaWewnetrzna: 0.32, alfaPodzialki: 0.26, alfaRogow: 0.6,
  /** Tło kwadratu w rogu. */
  alfaTlaRogu: 0.95,
  /** Rozeta w rogu (× szerokość pasa) i zwoje wychodzące na boki. */
  rozeta: 0.22, zwojRogu: 0.55,
  /** Napisy na marginesie: rozmiar = ekran / dzielnik (min–max). */
  napis: { min: 10, max: 13, dzielnik: 110 },
  /** Rozstrzelenie liter napisu (× rozmiar) i krycie napisu i jego tła. */
  napisRozstrzelenie: 0.35, alfaNapisu: 0.7, alfaTlaNapisu: 0.97,
};

export const KARTUSZ = {
  /** Grubość czcionki tytułu (400 = zwykła, 700 = gruba). */
  waga: 600,
  /** Rozstrzelenie liter tytułu (× rozmiar). */
  rozstrzelenie: 0.16,
  /** Wstęga jest szersza od napisu o tyle (× rozmiar)… */
  poszerzenie: 1.6,
  /** …i ma taką wysokość (× rozmiar). */
  wysokosc: 1.25,
  /** Kreska wstęgi: grubość i krycie. */
  grubosc: 1.1, alfaWstegi: 0.55,
  /** Cień pod literami (krycie) i jego przesunięcie (× rozmiar). */
  alfaCienia: 0.8, cienX: 0.02, cienY: 0.035,
  /** Nadtytuł nad wstęgą: rozmiar (× rozmiar tytułu, nie mniej niż min), rozstrzelenie, krycie. */
  nadtytul: { min: 10, czesc: 0.16, rozstrzelenie: 0.4, alfa: 0.7 },
  /** Podtytuł pod wstęgą (kursywa). */
  podtytul: { min: 13, czesc: 0.2, odstep: 1.7, alfa: 0.8 },
};

export const PRZERYWNIK = {
  /** Krycie kreski i rombu. */
  alfaKreski: 0.45, alfaRombu: 0.7,
  /** Pół-szerokość rombu w pikselach. */
  romb: 4,
  /** Przerwa na romb i zwoje (piksele od środka). */
  przerwa: 18,
  /** Zwoje po bokach rombu: odległość od środka i promień. */
  zwojOdstep: 12, zwojPromien: 4,
};

export const NAGLOWEK_DZIALU = {
  /** Promień kółka z glifem (× rozmiar). */
  kolko: 0.62,
  /** Krycie kółka, tekstu, kreski i dopisku z prawej. */
  alfaKolka: 0.65, alfaTekstu: 0.9, alfaKreski: 0.3, alfaDopisku: 0.8,
  /** Tekst zaczyna się tyle promieni kółka od lewej. */
  wciecie: 2.8,
  /** Rozstrzelenie liter (× rozmiar). */
  rozstrzelenie: 0.22,
};

/** Karty w grze (stworzenie, podpis rytu, samouczek) i etykiety działów marginesu. */
export const KARTA = {
  /** Krycie tła karty. */
  tlo: 0.95,
  /** Krycie linii zewnętrznej, wewnętrznej i rogów. */
  linia: 0.55, liniaWew: 0.22, rogi: 0.6,
  /** Odstęp linii wewnętrznej (i wielkość kwadratów w rogach), px. */
  wciecie: 5,
  /** Tytuł na zakładce: rozmiar liter i krycie. */
  tytulRozmiar: 11, tytulAlfa: 0.85,
  /** Etykiety działów na marginesie („spis ras”, „otchłań”…): rozmiar i krycie. */
  etykietaRozmiar: 10, etykietaAlfa: 0.7,
};
