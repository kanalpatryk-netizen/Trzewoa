/**
 * MENU GŁÓWNE — napisy, układ i animacja ekranu tytułowego.
 *
 * Układ według szkicu grafika (5.11): czarne tło, pośrodku u góry rysowane logo „Trzewia”
 * (`obrazy/menu/logo-trzewia.png`), pod nim spis wejść z ozdobnikami po obu stronach,
 * w lewym dolnym rogu znaki zespołu (`obrazy/menu/zespol-*.png`), a po prawej puste miejsce
 * na przyszłą grafikę (trójka postaci — dorysuje grafik).
 *
 * Położenia „× w” / „× h” to ułamki szerokości / wysokości ekranu.
 * Inny obrazek = podmieniony plik o tej samej nazwie (proporcje liczą się same).
 */
export const MENU = {
  // ------------------------------------------------------------------ napisy
  /** Wersja gry — małym drukiem w prawym dolnym rogu. */
  wersja: 'Alpha 0.2',
  /** Pozycje spisu. Kolejność = kolejność na ekranie. */
  pozycje: {
    wroc: { etykieta: 'Graj dalej' },
    nowa: { etykieta: 'Nowa gra' },
    wczytaj: { etykieta: 'Wczytaj grę' },
    samouczek: { etykieta: 'Samouczek' },
    bestiariusz: { etykieta: 'Atlas' },
    osiagniecia: { etykieta: 'Osiągnięcia' },
    ustawienia: { etykieta: 'Ustawienia' },
  },

  // ------------------------------------------------------------------ barwy
  /** Tło — czyste czarne. */
  tlo: '#000000',
  /** Logo (obrazek jest biały — tu dostaje barwę). */
  logoBarwa: '#d9d4cb',
  /** Napisy spisu: zwykły i wybrany. */
  napis: '#a9a49c', napisWybrany: '#ffffff',
  /** Ozdobniki przy napisach: zwykły i przy wybranym. */
  ozdobnik: '#78736c', ozdobnikWybrany: '#f2ede4',
  /** Poświata wybranej pozycji (rgb) i jej rozmycie (× rozmiar liter). */
  poswiata: '255,236,210', poswiataRozmycie: 0.7,
  /** Krycie pozycji nieaktywnej (np. „Graj dalej” bez trwającej gry). */
  alfaNieaktywnej: 0.3,

  // ----------------------------------------------------------------- układ
  /** Logo: górna krawędź (× h), wysokość (× h), najwyżej taka część szerokości. */
  logoGora: 0.03, logoWysokosc: 0.42, logoMaxSzer: 0.5,
  /** Spis: rozmiar liter (× h, obcięty do min–max), odstęp wierszy (× rozmiar), odstęp od logo (× rozmiar). */
  spisRozmiar: 0.043, spisRozmiarMin: 14, spisRozmiarMax: 42, spisOdstep: 1.62, spisPodLogo: 0.85,
  /** Ozdobnik: szerokość (× rozmiar liter) i odstęp od napisu (× rozmiar liter). */
  ozdobnikSzer: 1.05, ozdobnikOdstep: 0.22,
  /** Margines od krawędzi ekranu (× h, najmniej px). */
  margines: 0.045, marginesMin: 14,
  /**
   * Znaki zespołu w lewym dolnym rogu, od lewej: plik i wysokość (× h).
   * Rząd zmniejsza się sam, gdy nie mieści się obok spisu.
   */
  zespol: [
    { plik: 'dollum', wysokosc: 0.15 },
    { plik: 'znak', wysokosc: 0.11 },
    { plik: 'podpis', wysokosc: 0.065 },
  ],
  /** Odstęp między znakami zespołu (× h) i ich krycie. */
  zespolOdstep: 0.025, zespolAlfa: 0.9,
  // Prawa strona (szkic: „tu tę trójkę dam”) zostaje pusta — będzie tam grafika.

  // --------------------------------------------------------------- animacja
  /** Wejście na ekran (ms): logo rozjaśnia się przez tyle. */
  wejscieMs: 1100,
  /** Kolejne pozycje spisu wchodzą z takim opóźnieniem (ms) i trwają tyle. */
  pozycjaOpoznienie: 70, pozycjaCzas: 380, spisOd: 350,
  /** Znaki zespołu pojawiają się po tylu ms. */
  zespolOd: 700,
  /** Komunikat (np. po końcu gry) wisi tyle ms. */
  komunikatMs: 8000,
};
