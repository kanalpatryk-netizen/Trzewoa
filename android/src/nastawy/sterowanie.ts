/**
 * STEROWANIE I KAMERA — jak gracz porusza się po górze.
 *
 * Przybliżenie („zoom”) = ile pikseli ma jeden kafel. Klawisze przypisuje się
 * w grze (Ustawienia → Sterowanie); domyślny układ jest w src/core/keybinds.ts,
 * domyślne ustawienia (głośność, tempo…) w src/core/settings-store.ts.
 */
export const KAMERA = {
  /** Przybliżenie na starcie nowej gry. */
  start: 14,
  /** Najmniejsze i największe przybliżenie (najmniejsze rośnie tak, by góra wypełniała ekran). */
  min: 2.5, max: 26,
  /** Najmniejsze przybliżenie nie spada poniżej tego, nawet na wielkim ekranie. */
  minNaDuzymEkranie: 3,
  /** Krok przybliżania kółkiem myszy i klawiszami +/−. */
  krokKolka: 1.25, krokKlawisza: 1.15,
  /** „Wróć do swoich”: największe przybliżenie i zapas wokół skupiska (kafle). */
  powrotMaxZoom: 16, zapasX: 26, zapasY: 18,
  /** Kamera za życiem: jak szybko podąża (0..1 na krok) i jak mocno dopasowuje przybliżenie. */
  podazanie: 0.05, dopasowanie: 0.04,
  /** Automatyczne przybliżenie nie przekracza tego. */
  autoMaxZoom: 20,
  /** Przybliżenie przy pokazywaniu miejsca (rada, wpis kroniki, alarm) — co najmniej tyle. */
  pokazZoom: 10,
};

export const TEMPO = {
  /** Najwyższe tempo czasu (tików na klatkę). */
  max: 8,
};

/** STEROWANIE PALCEM — tylko wersja Android (na telefonie nie ma klawiatury ani myszy). */
export const STEROWANIE = {
  /** Podpowiedzi klawiszy: cyfry przy rytach, „esc”, „P”, klawisze w samouczku i w ustawieniach. */
  pokazKlawisze: false,
  /** Przytrzymanie palca na rycie (ms) otwiera jego tablicę w atlasie — zamiast prawego przycisku. */
  przytrzymanieMs: 520,
  /** Palec, który przesunął się dalej niż tyle px, przewija listę zamiast w nią stukać. */
  progPrzewijania: 10,
  /** Po wybraniu rytu jego opis (co robi, ile kosztuje) wisi przy nim tyle ms — nie ma „najechania”. */
  opisRytuMs: 2600,
};
