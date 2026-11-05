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
  wersja: 'Alpha 1',
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
  /**
   * Bijące serce w logo. Serce jest w logo połączone kreskami z ornamentami, więc wycina się je
   * obrysem: wielokąt w pikselach pliku logo (szerokości `obrysSzer` — przy innej rozdzielczości tego
   * samego rysunku skaluje się sam; przy nowym rysunku trzeba obrys poprawić). `rozszerz` i `miekkosc`
   * (px logo): o ile obrys jest szerszy i jak miękka jest jego krawędź.
   * Rytm jak u żywego serca: mocne „lub” i słabsze „dub” zaraz po nim, potem przerwa. `sila` — o ile
   * serce rośnie (0,03 = 3%), `od` — kiedy w okresie (0..1), narastanie i opadanie w ms.
   * Przy „Ogranicz ruch” serce nie bije.
   */
  serce: {
    obrysSzer: 1153,
    obrys: [
      [514, 361], [530, 355], [570, 342], [616, 348], [618, 376], [641, 388], [645, 418], [642, 436], [661, 459],
      [669, 495], [664, 531], [651, 554], [625, 561], [590, 558], [561, 552], [559, 558], [533, 558], [528, 524],
      [520, 497], [513, 473], [509, 456], [512, 448], [513, 428], [522, 422], [523, 400], [518, 379],
    ] as [number, number][],
    rozszerz: 4, miekkosc: 2,
    okresMs: 1000,
    uderzenia: [{ od: 0, sila: 0.03 }, { od: 0.26, sila: 0.017 }],
    narastanieMs: 70, opadanieMs: 240,
  },
  /** Logo: górna krawędź (× h), wysokość (× h), najwyżej taka część szerokości. */
  logoGora: 0.03, logoWysokosc: 0.42, logoMaxSzer: 0.5,
  /** Spis: rozmiar liter (× h, obcięty do min–max), odstęp wierszy (× rozmiar), odstęp od logo (× rozmiar). */
  spisRozmiar: 0.043, spisRozmiarMin: 14, spisRozmiarMax: 42, spisOdstep: 1.62, spisPodLogo: 0.85,
  /** Ozdobnik: szerokość (× rozmiar liter) i odstęp od napisu (× rozmiar liter). */
  ozdobnikSzer: 1.05, ozdobnikOdstep: 0.22,
  /** Margines od krawędzi ekranu (× h, najmniej px). */
  margines: 0.045, marginesMin: 14,
  /**
   * Znaki zespołu w lewym dolnym rogu, od lewej: plik (`obrazy/menu/zespol-<plik>.png`) i wysokość (× h).
   * Każdy znak to przycisk: `link` pusty = kliknięcie nic nie robi; wpisany adres otworzy się w nowej karcie.
   * Rząd zmniejsza się sam, gdy nie mieści się obok spisu.
   */
  zespol: [
    { plik: 'dollum', nazwa: 'Dollum', wysokosc: 0.15, link: '' },
    { plik: 'pillow-bleach', nazwa: 'Pillow Bleach', wysokosc: 0.11, link: '' },
    { plik: 'podpis-brych', nazwa: 'Brych', wysokosc: 0.065, link: '' },
  ],
  /** Odstęp między znakami zespołu (× h) i ich krycie: zwykłe i pod myszą. */
  zespolOdstep: 0.025, zespolAlfa: 0.85, zespolAlfaNajechany: 1,
  /**
   * Podświetlenie znaku pod myszą: poświata idzie wzdłuż kresek (liter, konturów), nie całego prostokąta
   * obrazka — obrazki mają przezroczyste tło. Barwa (rgb), rozmycie (× wysokość znaku, najmniej px)
   * i czas rozjaśniania (ms).
   */
  zespolPoswiata: '255,236,210', zespolRozmycie: 0.09, zespolRozmycieMin: 6, zespolPodswietlenieMs: 160,
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
