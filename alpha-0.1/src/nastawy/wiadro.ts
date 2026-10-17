/**
 * WIADRO Z JEDZENIEM (Remake v2) — jedyne jedzenie ludu (grzyba i spiżarni już nie ma).
 * Co `co` tików z góry, na linie, zjeżdża wiadro pełne jedzenia — w Alphie jedno, zawsze szybem obok szybu ze
 * światłem, na dno kolumny pod otworem (kto ją pogłębi kopaniem, sprowadzi wiadro niżej).
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
  /** Zapowiedź (ze stropu sypie się pył) w tikach. */
  zapowiedz: 150,
  /** Zjazd: kafle na tik; dłuższa lina jedzie szybciej — zjazd trwa najwyżej `zjazdMaks` tików. */
  zjazd: 1.3 / 120, zjazdMaks: 1500,
  /** Opróżnione wiadro jedzie w górę przez tyle tików i znika. */
  odjazd: 240,
  /** Alpha, etap 3: kto doszedł do wiadra, je porcję za porcją, aż głód spadnie do tylu (droga w dół bywa w jedną stronę). */
  najadaDo: 0.12,
  /** Skrajnie głodny (głód ≥ tyle) wspina się po linie do zjeżdżającego wiadra; prędkość wspinaczki (kafle na tik). */
  wspinaczkaOd: 0.85, wspinaczka: 2.4 / 120,
  /** Kto siedzi w wiadrze, je porcję co tyle tików (aż przestanie być głodny). */
  jedzenieCo: 40,
  /**
   * Alpha (decyzja użytkownika): wiadro jest jedno — zjeżdża tylko szybem z powierzchni, na dno kolumny pod otworem
   * (kto ją pogłębi, sprowadzi wiadro niżej), nie do głodnych; dalej niosą je robotnicy. Gdy poprzednie jeszcze stoi,
   * z góry dosypują do niego — najwyżej `szybMaks` porcji.
   */
  szybMaks: 40,
  /** Ryt „Nakarm”: dodatkowe jedzenie tym samym szybem, do tego samego wiadra — tyle porcji. */
  nakarmPorcji: 8,
};
