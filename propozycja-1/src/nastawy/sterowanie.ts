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
  /** Ponad górny brzeg świata kamera sięga tyle kafli nieba — iglica katedry na powierzchni sięga 7 kafli ponad niego. */
  niebo: 9,
  /** Krok przybliżania kółkiem myszy i klawiszami +/−. */
  krokKolka: 1.25, krokKlawisza: 1.15,
  /** „Wróć do swoich”: największe przybliżenie i zapas wokół skupiska (kafle). */
  powrotMaxZoom: 16, zapasX: 26, zapasY: 18,
  /** Kamera za życiem: jak szybko podąża (0..1 na krok) i jak mocno dopasowuje przybliżenie. */
  podazanie: 0.05, dopasowanie: 0.04,
  /** Automatyczne przybliżenie nie przekracza tego. */
  autoMaxZoom: 20,
  /**
   * Za kim idzie kamera: grupa to postacie bliżej siebie niż grupaX × grupaY kafli (łańcuchem). Waga grupy to
   * liczba postaci plus wagaCzynnosci za każdą, która coś robi (rozkaz, kopanie, modlitwa, walka);
   * grupa, za którą kamera już idzie, ma przewagę przewagaBiezacej.
   */
  grupaX: 10, grupaY: 6, wagaCzynnosci: 0.6, przewagaBiezacej: 1,
  /** Przybliżenie przy pokazywaniu miejsca (rada, wpis kroniki, alarm) — co najmniej tyle. */
  pokazZoom: 10,
};

/**
 * CZAS GRY — jeden, zwykły: tyle tików świata na sekundę, niezależnie od odświeżania ekranu
 * (dawniej liczony w klatkach — na ekranie 120 Hz świat biegł dwa razy szybciej).
 * Przyspieszanie i zwalnianie jest tylko w trybie deweloperskim.
 */
export const TEMPO = {
  /** Tików świata na sekundę zwykłego czasu (TIKOW_NA_MINUTE / 60). */
  tikowNaSekunde: 120,
  /** Mnożniki czasu w trybie deweloperskim (przyciski ‹ ›, klawisze + −, okienko dewelopera). */
  mnozniki: [0.25, 0.5, 1, 2, 3, 5, 10, 20],
  /** Najwięcej tików w jednej klatce — wolny komputer zwalnia świat zamiast się dusić. */
  maxNaKlatke: 60,
  /**
   * Najwięcej milisekund symulacji w jednej klatce (co najmniej jeden tik i tak się liczy). Gdy świat nie nadąża,
   * zwalnia, a obraz dalej płynie — bez tego zaległe tiki przechodziły na następną klatkę, która przez to była
   * jeszcze wolniejsza, i gra stawała. Zwykle tik to ułamek milisekundy, więc budżetu nie widać. Przy przyspieszonym
   * czasie budżet rośnie razem z mnożnikiem.
   */
  budzetKlatkiMs: 8,
};

/** STEROWANIE PALCEM — tylko wersja Android (na telefonie nie ma klawiatury ani myszy). */
export const STEROWANIE = {
  /** Ramka „do wykopania” (zaznaczanie prostokątem, 25.10): najwyżej tyle kafli skały naraz. */
  ramkaMaks: 600,
  /** Podpowiedzi klawiszy: cyfry przy rytach, „esc”, „P”, klawisze w samouczku i w ustawieniach. */
  pokazKlawisze: false,
  /** Przytrzymanie palca na rycie (ms) otwiera jego tablicę w atlasie — zamiast prawego przycisku. */
  przytrzymanieMs: 520,
  /** Palec, który przesunął się dalej niż tyle px, przewija listę zamiast w nią stukać. */
  progPrzewijania: 10,
  /** Po wybraniu rytu jego opis (co robi, ile kosztuje) wisi przy nim tyle ms — nie ma „najechania”. */
  opisRytuMs: 2600,
};
