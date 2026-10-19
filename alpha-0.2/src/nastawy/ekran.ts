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
  /**
   * Najmniejszy ekran logiczny w pionie (telefon trzymany pionowo). WERSJA ANDROID:
   * telefon rysuje 1:1 — na komputerze minimum 400×720 zmniejszało wszystko na małych telefonach.
   */
  pionMinW: 360, pionMinH: 600,
  /**
   * Najmniejszy ekran logiczny w poziomie. WERSJA ANDROID: telefon trzymany poziomo ma
   * własny, zwarty układ (TELEFON.poziom), więc nie ściskamy go do 1000×560 (było 64% rozmiaru).
   */
  poziomMinW: 640, poziomMinH: 330,
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
 * TELEFON — układ ekranu gry na telefonie (tylko wersja Android).
 * Marginesy wokół płyty w pikselach logicznych; płyta dostaje całą resztę.
 */
export const TELEFON = {
  /** Ekran szerszy niż wyższy i logicznie niższy niż to — układ „telefon poziomo”. */
  niskiPonizej: 520,
  /**
   * Telefon pionowo: u góry rada, z lewej kolumna rytów, pod płytą rząd przycisków,
   * wstęga ludu z wierszem „ze skały” i pasek z krwią i dłońmi oddania. Przyciski nie
   * leżą już na płycie. Przy 168 wiersz „ze skały” wchodził na rysę krwi.
   */
  pion: { gora: 58, lewo: 50, prawo: 8, dol: 190, przyciskR: 22 },
  /** Telefon poziomo: z lewej ryty, z prawej kolumna przycisków, pod płytą jeden cienki pasek. */
  poziom: { gora: 30, lewo: 60, prawo: 56, dol: 46, przyciskR: 20 },
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
  /** Ekran ładowania nie znika szybciej niż po tylu ms (żeby nie mignął). */
  minCzasMs: 1100,
  /** Przejście do menu (ms). */
  wygaszenieMs: 450,
};

/**
 * INTRO — film `filmy/intro.mp4`, który rusza od razu po otwarciu gry (góra ładuje się pod nim),
 * a po nim menu. Spacja (albo Esc) go pomija; okno obserwatorium go nie puszcza.
 */
export const INTRO = {
  /** Podpis na dole, póki film leci. */
  pomin: 'pomiń',
  klawisz: 'spacja',
  /** Znaczek pojawia się po tylu ms od startu filmu… */
  znaczekOdMs: 400,
  /** …i rozjaśnia przez tyle ms. */
  znaczekRozjasnienieMs: 500,
  /** Zniknięcie filmu na końcu i po pominięciu (ms). */
  wygaszenieMs: 350,
  /** Film, który przez tyle ms nie ruszył (zła taśma, przeglądarka bez kodeka), jest pomijany sam. */
  bezpiecznikMs: 4000,
};

/**
 * KURSOR — `obrazy/kursor1.png` (stalowa rękawica) jako jedyny kursor gry, na każdym ekranie.
 * Gra sama zmniejsza obrazek do rozmiaru kursora (i ostrzejszej wersji na ekrany o gęstych pikselach),
 * więc nowy kursor to po prostu podmieniony plik — najwyżej trzeba poprawić `czubek`.
 */
export const KURSOR = {
  /**
   * Dłuższy bok kursora w pikselach ekranu. Więcej niż 32 nie warto: Chrome większy kursor
   * chowa przy krawędzi okna (pokazuje wtedy zwykłą strzałkę).
   */
  rozmiar: 32,
  /** Punkt, który klika (czubek palca) — w pikselach oryginalnego obrazka. */
  czubek: { x: 14, y: 17 },
};
