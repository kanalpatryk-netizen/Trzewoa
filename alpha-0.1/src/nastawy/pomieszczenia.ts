/**
 * POMIESZCZENIA (Alpha, etap 3c) — szablony do wykucia i rzemiosło. Gracz kładzie na skale plan (sypialnia,
 * warsztat, kuźnia, korytarz, szyb), a kują go tylko zaznaczeni robotnicy, którym ten plan wskażesz — wolni
 * robotnicy sami nic nie biorą (decyzja użytkownika). Gotowy warsztat zamienia złoto w dewocjonalia, które od razu
 * stają się wiarą; kuźnia z żelaza wykuwa kolejne części zbroi rycerza; sypialnia zdejmuje osłabienia.
 * Symulacja: src/sim/pomieszczenia.ts; rysunek: src/render/pomieszczenia.ts.
 * Odległości w kaflach, czas w tikach (120 = sekunda, 7200 = minuta gry).
 */
export const POMIESZCZENIA = {
  /** Szablony: szerokość i wysokość wnętrza do wykucia (podłoga to rząd pod spodem — musi być lita i płaska). */
  szablony: {
    sypialnia: { w: 5, h: 3 },
    warsztat: { w: 4, h: 3 },
    kuznia: { w: 4, h: 3 },
  },
  /** Korytarz: pas poziomy tej wysokości (lud stoi w tunelu na 2 kafle), najwyżej tyle kafli długości. */
  korytarzWys: 2,
  korytarzMaks: 30,
  /** Szyb: proste schody w dół (stopień o kafel — da się nimi wrócić), najwyżej tyle stopni. */
  szybMaks: 24,
  /**
   * Alpha: lina (zamiast drabiny z 3d — decyzja użytkownika 18.10) — przeciągana w górę od miejsca, gdzie lud stoi, do
   * półki, na którą inaczej się nie wejdzie (tylko tam, gdzie trzeba się wspinać). Wiesza ją gracz, od razu — nikt jej
   * nie buduje. Najkrótsza i najdłuższa (kafle); pierwsze `linyDarmowe` są za darmo, każda następna kosztuje `linaKrew`.
   */
  linaMin: 2, linaMaks: 16, linyDarmowe: 5, linaKrew: 10,
  /** Szukając, czy na półkę da się wejść bez liny, przegląda najwyżej tyle kafli. */
  linaSzukanie: 5000,
  /** Najwięcej planów i pomieszczeń naraz. */
  maks: 12,
  /** Kując plan, robotnik sięga kilofem kafel wyżej niż zwykle — nad głowę (wnętrze ma 3 kafle wysokości). */
  zasiegWGore: 2,

  warsztat: {
    /** Ile złota idzie na jedną sztukę (krzyż, różaniec, krucyfiks)… */
    zlotoNaSztuke: 1,
    /** …ile wiary daje gotowa sztuka (zamienia się w wiarę od razu — bez ekwipunku)… */
    wiaraZaSztuke: 12,
    /** …i ile tików trwa jej wykonanie. */
    tikowNaSztuke: 1200,
  },

  kuznia: {
    /** Kolejne części zbroi rycerza: ile żelaza i ile tików. Rysowanie części na rycerzu — etap 3f. */
    czesci: [
      { id: 'helm', nazwa: 'hełm', zelazo: 3, tikow: 1500 },
      { id: 'naramienniki', nazwa: 'naramienniki', zelazo: 3, tikow: 1500 },
      { id: 'napiersnik', nazwa: 'napierśnik', zelazo: 6, tikow: 2400 },
      { id: 'nakolanniki', nazwa: 'nakolanniki', zelazo: 3, tikow: 1500 },
      { id: 'tarcza', nazwa: 'tarcza', zelazo: 5, tikow: 2100 },
    ],
  },

  sypialnia: {
    /**
     * Tyle tików snu zdejmuje osłabienia (okaleczenie, zatrucie); potem śpiący wstaje sam. Etap 3d (decyzja
     * użytkownika): ok. 60 s — ofiara krwi przy ołtarzu nie może być darmową pętlą krwi.
     */
    snuTikow: 7200,
  },
};

export type RodzajPomieszczenia = 'sypialnia' | 'warsztat' | 'kuznia' | 'korytarz' | 'szyb' | 'lina';

/** Nazwy w mianowniku — przyciski, podpisy, kronika. */
export const NAZWA_POMIESZCZENIA: Record<RodzajPomieszczenia, string> = {
  sypialnia: 'sypialnia', warsztat: 'warsztat', kuznia: 'kuźnia', korytarz: 'korytarz', szyb: 'szyb', lina: 'lina',
};

/** W bierniku — kronika („wykuli kuźnię”). */
export const BIERNIK_POMIESZCZENIA: Record<RodzajPomieszczenia, string> = {
  sypialnia: 'sypialnię', warsztat: 'warsztat', kuznia: 'kuźnię', korytarz: 'korytarz', szyb: 'szyb', lina: 'linę',
};

/** Kolejność szablonów na przyciskach i pod klawiszem B. */
export const SZABLONY: RodzajPomieszczenia[] = ['sypialnia', 'warsztat', 'kuznia', 'korytarz', 'szyb', 'lina'];
