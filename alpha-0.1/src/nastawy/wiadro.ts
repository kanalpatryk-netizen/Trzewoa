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
  /**
   * Alpha, etap 4: lina przecięta przez dłoń z otchłani (sim/lina-wiadra.ts). Zjeżdżające wiadro spada (przyspiesza
   * o `grawitacja` kafla na tik, najwyżej `spadaMaks`) i roztrzaskuje się — przepada taka część jedzenia.
   */
  ciecie: { strata: 0.5, grawitacja: 0.012, spadaMaks: 0.55 },
  /**
   * Naprawa: górny kawałek zwisa po cięciu tyle kafli nad dnem (sięga go stojący); naprawiający wspina się po nim
   * o `wspinaczka` kafla, skleja przez `sklejanie` tików (owija, wiąże), a lina napina się przez `napinanie` tików.
   */
  naprawa: { koniecNadDnem: 2.2, wspinaczka: 1.2, wspinaczkaV: 1.6 / 120, sklejanie: 420, napinanie: 150, zjazdV: 3 / 120 },
};
