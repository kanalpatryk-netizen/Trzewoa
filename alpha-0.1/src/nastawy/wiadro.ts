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
  /** Skrajnie głodny (głód ≥ tyle) wspina się po linie do zjeżdżającego wiadra; prędkość wspinaczki (kafle na tik). */
  wspinaczkaOd: 0.85, wspinaczka: 2.4 / 120,
  /** Kto siedzi w wiadrze, je porcję co tyle tików (aż przestanie być głodny). */
  jedzenieCo: 40,
  /** Ryt „Nakarm”: dodatkowe wiadro tam, gdzie wskażesz — tyle porcji. */
  nakarmPorcji: 8,
  /** Szukanie miejsca: najwięcej kafli przejrzanych w poszukiwaniu tych, do których lud dojdzie. */
  dostepLimit: 40000,
};
