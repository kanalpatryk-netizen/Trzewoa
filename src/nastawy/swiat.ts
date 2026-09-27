/**
 * ŚWIAT — wymiary góry i przepis na jej wygenerowanie.
 *
 * Jednostka: kafel. Głębokość „0..1” to ułamek drogi od powierzchni do dna
 * (0 = pod trawą, 1 = samo dno). Zmiana wymiarów psuje stare zapisy gry.
 */
export const SWIAT = {
  /** Szerokość góry w kaflach. */
  szerokosc: 176,
  /** Wysokość góry w kaflach. */
  wysokosc: 240,
  /** Na której linii (od góry) zaczyna się ziemia. Nad nią jest niebo. */
  powierzchnia: 14,
  /** Po tylu tikach bez niczyjego spojrzenia rysunek kafla blaknie w pusty papier. */
  pamiecTikow: 9000,

  /** Linia powierzchni faluje: tyle kafli w górę i w dół od średniej. */
  falowaniePowierzchni: 4,
  /** Pod powierzchnią leży tyle kafli miękkiej ziemi, zanim zacznie się skała. */
  gruboscZiemi: 6,
  /** Do tej głębokości (0..1) skała bywa przemieszana z ziemią… */
  ziemiaDoGlebokosci: 0.22,
  /** …z taką szansą na kafel. */
  szansaNaZiemie: 0.4,

  jaskinie: {
    /** Próg szumu: wyżej = mniej jaskiń. */
    prog: 0.5,
    /** Jak mocno próg faluje z głębokością (warstwy gęstsze i rzadsze). */
    falowanie: 0.1,
    /** Ile progu ubywa na dnie — głęboko jaskiń jest więcej. */
    ubytekWGlebi: 0.04,
    /** Drugi szum, który tnie jaskinie na osobne kieszenie. */
    progDrugi: 0.4,
  },

  komory: {
    /** Ile wielkich pustek, w których siadają gniazda. */
    ile: 26,
    /** Promień poziomy komory: od–do. */
    szerokoscOd: 5, szerokoscDo: 13,
    /** Promień pionowy komory: od–do. */
    wysokoscOd: 4, wysokoscDo: 9,
  },

  wejscia: {
    /** Ile korytarzy prowadzi z powierzchni w głąb (tędy schodzą ludzie). */
    ile: 5,
    /** Korytarz schodzi najwyżej do tej głębokości (ułamek wysokości góry). */
    doGlebokosci: 0.4,
    /** Szansa, że korytarz urwie się na danym kroku. */
    szansaUrwania: 0.06,
  },

  rudy: {
    /** Próg szumu rudy na powierzchni; niżej próg spada o `latwiejWGlebi`. */
    prog: 0.7,
    latwiejWGlebi: 0.1,
    /** Szansa na rudę w żyle: bazowa + przyrost z głębokością. */
    szansa: 0.3, szansaWGlebi: 0.5,
    /** Kryształy szaleństwa zaczynają się poniżej tej głębokości… */
    krysztalyOd: 0.62,
    /** …przy tym progu szumu… */
    krysztalyProg: 0.74,
    /** …z szansą rosnącą z głębokością (głębokość × ta liczba). */
    krysztalySzansa: 0.45,
  },

  woda: {
    /** Ile zbiorników wody w górnej połowie. */
    ile: 9,
    /** Promień zbiornika: od–do. */
    promienOd: 3, promienDo: 8,
    /** Zbiorniki leżą najniżej na tej części wysokości góry. */
    doGlebokosci: 0.55,
  },

  magma: {
    /** Ile jezior magmy na dnie. */
    ile: 10,
    /** Jeziora zaczynają się na tej części wysokości… */
    od: 0.74,
    /** …i zajmują pas o takiej wysokości. */
    pas: 0.22,
    /** Rozmiar pustki pod jeziorem: szerokość i wysokość od–do. */
    szerokoscOd: 4, szerokoscDo: 11,
    wysokoscOd: 2, wysokoscDo: 5,
    /** Promień plamy magmy. */
    promien: 7,
  },

  /** Ile tików osypywania ziemi i spływania płynów przed pierwszą klatką. */
  osypywanieNaStart: 160,
  splywanieNaStart: 220,
  /** Dodatkowe spływanie płynów w nowej grze, zanim zasiedlimy gniazda. */
  splywaniePrzedZasiedleniem: 900,
};

/**
 * RDZEŃ I SKORUPA — cel gry, zapisany w geometrii góry.
 * Wszystkie odległości liczone w kaflach od środka rdzenia.
 */
export const RDZEN = {
  /** Rdzeń leży tyle kafli nad dnem góry. */
  nadDnem: 14,
  /** Skorupa z nieprzekopywalnego kamienia: promienie elipsy (poziomy, pionowy). */
  skorupaX: 14, skorupaY: 11,
  /** Komora wokół rdzenia wewnątrz skorupy. */
  komoraX: 8.5, komoraY: 4.5,
  /** Promień samego rdzenia. */
  promien: 2.6,
  /** Przedsionek — jaskinia nad skorupą, w której modli się warta. Tyle kafli nad rdzeniem: */
  przedsionekNad: 14,
  /** Rozmiar przedsionka (promienie elipsy). */
  przedsionekX: 6, przedsionekY: 4,
  /** Sucha strefa wokół przedsionka: promień bez wody, magmy i kryształów. */
  suchaStrefa: 12,
  /** Grubość obrzeża suchej strefy, przez które nie przepływają płyny. */
  progSuchejStrefy: 1.5,
};
