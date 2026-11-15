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

/**
 * KONWÓJ Z JEDZENIEM (Alpha 0.2, użytkownik 23.10: „przyjeżdża jakiś konwój z końmi z przyczepą na te konie i zarzuca
 * nam te jedzenie po linie”) — tylko rysunek (src/render/konwoj.ts), symulacja wiadra się nie zmienia. Nad szybem wiadra
 * stoi drewniany kozioł z bloczkiem. Przed każdą dostawą (sim.lud.wiadra.nastepne) z prawej przyjeżdża wóz z parą koni,
 * zawraca przy koźle, pomocnik zeskakuje z wozu i spuszcza wiadro na linie (albo, gdy wiadro jeszcze stoi na dnie,
 * zsyła po linie worek), potem wskakuje z powrotem i wóz odjeżdża. Tiki: 120 = sekunda.
 */
export const KONWOJ = {
  /** Wyłącznik (typ boolean — żeby kompilator nie uznał kodu za martwy). */
  wlaczony: true as boolean,
  /** Kozioł: nogi tyle kafli w każdą stronę od liny, bloczek tyle nad ziemią. */
  koziol: { rozstaw: 1.25, wys: 3.9 },
  /** Wóz przyjeżdża zza prawego brzegu góry (x kafli) i staje tyłem tyle kafli od liny. */
  start: 198, postoj: 2.1,
  /** Zawracanie przy koźle i zeskok pomocnika z wozu (tiki). */
  zawracanie: 120, zeskok: 54,
  /** Worek zsyłany po linie do wiadra, które jeszcze stoi na dnie: od którego tiku postoju i jak długo jedzie. */
  worek: { od: 150, trwa: 420 },
};
