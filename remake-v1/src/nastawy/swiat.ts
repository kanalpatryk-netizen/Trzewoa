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
    /** Próg szumu: wyżej = mniej jaskiń. Remake v1: drobnych dziur mniej — kształt góry robią sale i galerie. */
    prog: 0.6,
    /** Jak mocno próg faluje z głębokością (warstwy gęstsze i rzadsze). */
    falowanie: 0.1,
    /** Ile progu ubywa na dnie — głęboko jaskiń jest więcej. */
    ubytekWGlebi: 0.04,
    /** Drugi szum, który tnie jaskinie na osobne kieszenie. */
    progDrugi: 0.4,
  },

  komory: {
    /** Ile wielkich pustek, w których siadają gniazda. */
    ile: 10,
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

  /**
   * Remake v1: w górze nie ma wody ani lawy. Zamiast nich rozległe jaskinie:
   * sale, galerie między nimi, kominy i groty w głębi.
   */
  plyny: false as boolean,

  sale: {
    /** Ile wielkich sal od pierwszej warstwy skały w głąb. */
    ile: 13,
    /** Pierwsza sala tyle kafli pod powierzchnią; ostatnia na tej części wysokości góry. */
    odPowierzchni: 12, doGlebokosci: 0.76,
    /** Promień poziomy i pionowy sali: od–do. */
    szerokoscOd: 10, szerokoscDo: 22,
    wysokoscOd: 5, wysokoscDo: 10,
    /** Jak bardzo brzeg sali jest poszarpany (0 = gładka elipsa). */
    poszarpanie: 0.55,
    /** Dno sali: część promienia pionowego pod środkiem (płaska podłoga). */
    podloga: 0.55,
    /** Filar mniej więcej co tyle kafli szerokości sali. */
    filarCo: 11,
    /** Nacieki (stalaktyty i stalagmity) na kafel szerokości. */
    naciekiNaKafel: 0.35,
  },

  galerie: {
    /** Promień korytarza od–do (kafle). */
    promienOd: 1.3, promienDo: 2.6,
    /** Jak bardzo korytarz się wije (radiany odchylenia). */
    krety: 1.6,
    /** Szansa, że sala łączy się jeszcze z drugą najbliższą. */
    drugaSzansa: 0.45,
    /** Dłuższych połączeń nie kopie (kafle). */
    najdluzsza: 70,
  },

  kominy: {
    /** Ile pionowych szybów z sal w dół; ich promień i długość od–do. */
    ile: 7, promien: 1.4, dlugoscOd: 10, dlugoscDo: 26,
  },

  groty: {
    /** Niskie, szerokie groty w głębi (tam, gdzie dawniej było jezioro magmy). */
    ile: 8,
    od: 0.74, pas: 0.16,
    szerokoscOd: 6, szerokoscDo: 14,
    wysokoscOd: 2.5, wysokoscDo: 5,
  },

  /** Ile tików osypywania ziemi przed pierwszą klatką. */
  osypywanieNaStart: 160,
  /** Dodatkowe spływanie płynów w nowej grze, zanim zasiedlimy gniazda (bez płynów nic nie robi). */
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
  /** Komora wokół rdzenia wewnątrz skorupy. Kto przez otwartą skorupę stanie w komorze, dotarł do rdzenia. */
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
