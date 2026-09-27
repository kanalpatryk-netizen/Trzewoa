/**
 * EKRAN — jak gra dopasowuje się do rozmiaru okna.
 *
 * Gra rysuje w „pikselach logicznych”. Na dużym monitorze cały obraz rośnie,
 * a na małym ekranie interfejs ZASKAKUJE w mniejszą skalę: logiczny ekran nigdy
 * nie jest mniejszy niż minimum poniżej, więc każdy układ ma dość miejsca
 * i nic na siebie nie nachodzi. Skalę da się jeszcze zmniejszyć w Ustawieniach
 * („Wielkość obrazu”); powiększenie ponad dopasowanie działa tylko tam, gdzie jest miejsce.
 */
export const EKRAN = {
  /** Ekran odniesienia: przy takim rozmiarze (px) skala wynosi 1. */
  wzorzecW: 1366, wzorzecH: 820,
  /** Na dużym monitorze obraz rośnie najwyżej tyle razy. */
  maxPowiekszenie: 2.4,
  /** Najmniejszy ekran logiczny w pionie (telefon trzymany pionowo). */
  pionMinW: 400, pionMinH: 720,
  /** Najmniejszy ekran logiczny w poziomie (telefon poziomo, mały laptop). */
  poziomMinW: 1000, poziomMinH: 560,
  /** Poniżej tej skali już nie schodzimy — tekst stałby się nieczytelny. */
  minSkala: 0.55,
  /** Najwyższa gęstość pikseli, w jakiej rysujemy (więcej = ostrzej, ale wolniej). */
  maxDpr: 2,
  /** Gra dostaje układ „wąski” (ryty i przyciski jak na telefonie) poniżej tej szerokości… */
  waskiPonizej: 700,
  /** …a także ekran w pionie (wyższy niż szerszy × pionowyOd) węższy niż to — tablet. */
  pionowyTabletPonizej: 1000, pionowyOd: 1.15,
};

/**
 * JAKOŚĆ RYCINY „AUTO” — gdy klatek jest za mało, rycina przechodzi na połowę
 * rozdzielczości (jak „szybka” w Ustawieniach). Tylko w dół i raz na grę,
 * żeby obraz nie skakał tam i z powrotem.
 */
export const JAKOSC = {
  /** Średnio mniej klatek na sekundę niż tyle… */
  progKlatek: 40,
  /** …przez tyle ms z rzędu (liczone od wejścia do gry) — i rycina tanieje. */
  oknoMs: 4000,
  /** Przerwa między klatkami dłuższa niż to (karta w tle, zamrożenie) zaczyna pomiar od nowa. */
  przerwaMs: 250,
};

/** EKRAN ŁADOWANIA — napisy i czasy. */
export const LADOWANIE = {
  tytul: 'TRZEWIA',
  /** Podpis pod paskiem, gdy wszystko gotowe. */
  gotowe: 'góra się budzi',
  /**
   * Po załadowaniu gra czeka na dotknięcie albo klawisz — przeglądarka pozwala
   * włączyć dźwięk dopiero po geście gracza, więc muzyka gra już w menu.
   * (W trybie deweloperskim nie czeka.)
   */
  czekajNaDotyk: true,
  dotknij: 'dotknij, aby się obudzić',
  /** Ekran ładowania nie znika szybciej niż po tylu ms (żeby nie mignął). */
  minCzasMs: 1100,
  /** Przejście do menu (ms). */
  wygaszenieMs: 450,
};
