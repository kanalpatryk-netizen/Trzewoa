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
};

/** EKRAN ŁADOWANIA — napisy i czasy. */
export const LADOWANIE = {
  tytul: 'TRZEWIA',
  /** Podpis pod paskiem, gdy wszystko gotowe. */
  gotowe: 'góra się budzi',
  /** Ekran ładowania nie znika szybciej niż po tylu ms (żeby nie mignął). */
  minCzasMs: 1100,
  /** Przejście do menu (ms). */
  wygaszenieMs: 450,
};
