/**
 * WIADRO Z JEDZENIEM (Remake v2) — jedyne jedzenie ludu (grzyba i spiżarni już nie ma).
 * Co `co` tików z góry, na linie, zjeżdża wiadro pełne jedzenia — do pierwszego odkrytego,
 * pustego miejsca, do którego lud może dojść (szuka od niewiele nad siedzibą w dół).
 * Kto skrajnie głoduje, wspina się po linie i wsiada do wiadra, zanim zjedzie, i je od razu.
 * Kod: src/sim/wiadro.ts, rysunek: src/render/wiadro.ts.
 *
 * Tiki przeliczaj przez 120 na sekundę (7200 = minuta gry).
 */
export const WIADRO = {
  /** Co ile tików zjeżdża wiadro (40 s); na start lud dostaje jedno od razu, następne po 40 s. */
  co: 4800, pierwsze: 4800,
  /** Ile porcji (porcja = jeden posiłek): tyle na każdą żywą postać ludu, w tych granicach. */
  porcjiNaGlowe: 1.6, porcjiMin: 6, porcjiMax: 28,
  /** Najwięcej pełnych wiader naraz — następne przyjdzie, gdy któreś się opróżni. */
  maks: 5,
  /** Zapowiedź (ze stropu sypie się pył) w tikach. */
  zapowiedz: 150,
  /** Zjazd: kafle na tik; dłuższa lina jedzie szybciej — zjazd trwa najwyżej `zjazdMaks` tików. */
  zjazd: 1.3 / 120, zjazdMaks: 1500,
  /** Szuka miejsca od tylu kafli nad siedzibą w dół i tyle kolumn w lewo i w prawo od niej. */
  nadSiedziba: 20, zasieg: 32,
  /** Jama niższa niż tyle kafli (od stropu do podłogi) jest gorsza — wiadro by w niej tylko mignęło. */
  wysokoscMin: 4,
  /** Opróżnione wiadro jedzie w górę przez tyle tików i znika. */
  odjazd: 240,
  /**
   * Alpha: wiadro, które stoi dłużej niż tyle tików (2 min), a nikt z ludu nie jest bliżej niż `zapomnianeOd` kafli,
   * odjeżdża z resztą jedzenia — zwalnia miejsce następnemu tam, gdzie lud jest.
   */
  zapomnianePo: 14400, zapomnianeOd: 30,
  /**
   * Alpha, etap 3: zwykłe wiadro, które stoi dłużej niż tyle tików (20 s), a do którego nie dojdzie już nikt z ludu
   * (zostało nad zejściem — pod górę lud wchodzi najwyżej o stopień), odjeżdża z resztą jedzenia.
   */
  nieDojdziePo: 2400,
  /** Alpha, etap 3: kto doszedł do wiadra, je porcję za porcją, aż głód spadnie do tylu (droga w dół bywa w jedną stronę). */
  najadaDo: 0.12,
  /** Alpha: grupa, z której najgłodniejszy (głód powyżej `bezJedzeniaOd`) nie dojdzie do żadnego wiadra, dostaje tyle pierwszeństwa. */
  bezJedzeniaOd: 0.35, bezJedzeniaPierwszenstwo: 3,
  /** Alpha, etap 3: …i jej wiadro zjedzie nawet ponad `maks` — najwyżej o tyle. */
  ponadLimitDlaOdcietych: 3,
  /** Skrajnie głodny (głód ≥ tyle) wspina się po linie do zjeżdżającego wiadra; prędkość wspinaczki (kafle na tik). */
  wspinaczkaOd: 0.85, wspinaczka: 2.4 / 120,
  /** Kto siedzi w wiadrze, je porcję co tyle tików (aż przestanie być głodny). */
  jedzenieCo: 40,
  /**
   * Alpha: zwykłe wiadro zjeżdża szybem z powierzchni do sali z siedzibą (szkic), nie do głodnych — dalej niosą je
   * robotnicy. Gdy poprzednie jeszcze stoi w sali, z góry dosypują do niego — najwyżej `szybMaks` porcji.
   */
  szybem: true as boolean, szybMaks: 40,
  /** Ryt „Nakarm”: dodatkowe wiadro tam, gdzie wskażesz — tyle porcji. */
  nakarmPorcji: 8,
  /** Szukanie miejsca: najwięcej kafli przejrzanych w poszukiwaniu tych, do których lud dojdzie. */
  dostepLimit: 40000,
};
