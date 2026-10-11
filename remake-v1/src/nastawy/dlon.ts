/**
 * DŁOŃ Z OTCHŁANI (Remake v1, tylko Koszmar) — rzadkie wydarzenie: na brzegu nieznanego
 * otwierają się wielkie czerwone oczy, z ciemności wysuwa się ogromna dłoń, chwyta jedną
 * albo dwie postacie i cofa się z nimi w otchłań. Cud rzucony przy oczach, zanim dłoń
 * chwyci, odpędza ją. Kod: src/sim/dlon.ts, rysunek: src/render/dlon.ts.
 *
 * Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry, 120 = sekunda).
 */
export const DLON = {
  /** Wyłącznik (typ boolean — żeby kompilator nie uznał kodu za martwy). */
  wlaczona: true as boolean,
  /** Najwcześniej po tylu tikach partii (6 min)… */
  pierwszaPo: 43200,
  /** …potem co tyle tików los (co 30 s)… */
  losujCo: 3600,
  /** …z taką szansą — rzadko: średnio raz na ~14 minut, gdy jest kogo zabrać (w co trzeciej, czwartej partii). */
  szansa: 0.035,
  /** Po wydarzeniu (także odpędzonym) cisza na tyle tików (8 min). */
  przerwa: 57600,
  /** Najwięcej razy w jednej partii. */
  maxNaPartie: 2,
  /** Nie przychodzi, gdy ludu jest mniej niż tylu — nie dobija ostatnich. */
  minLudu: 8,

  // ---------------------------------------------------------------- kogo
  /** Ofiara stoi co najmniej tyle kafli od siedziby i obozów (tam jest światło)… */
  odObozu: 10,
  /** …a otchłań (nieznane) zaczyna się przy niej: tyle kafli w promieniu do obejrzenia… */
  otchlanPromien: 10,
  /** …i co najmniej tyle nieznanych kafli w tym promieniu. */
  otchlanMin: 30,
  /** Ofiara stoi co najmniej tyle kafli od lewej i prawej krawędzi świata (żeby kamera mogła pokazać całość). */
  odKrawedzi: 22,
  /** Drugi zabrany: ktoś z ludu najdalej tyle kafli od pierwszego — z taką szansą. */
  drugiDo: 3.5, drugiSzansa: 0.6,

  // ---------------------------------------------------------------- przebieg (tiki)
  /** Oczy otwierają się i patrzą (ofiary stoją jak wryte), dłoń sięga, zaciska się, cofa, oczy gasną. */
  oczy: 420, siega: 240, chwyta: 80, cofa: 260, gasnie: 220,
  /** Cud bliżej niż tyle kafli od oczu albo ofiary, zanim dłoń chwyci, odpędza ją. */
  cudPromien: 12,

  // ---------------------------------------------------------------- wygląd (kafle)
  /** Wielkość dłoni i oczu (mnożnik; 1 = dłoń od nadgarstka po palce ok. 5 kafli, a postać ma ok. 2,5). */
  wielkosc: 1.8,
  /** Odstęp oczu (przed mnożnikiem) i jak głęboko w otchłani, za brzegiem nieznanego, się otwierają. */
  oczyRozstaw: 4.2, oczyGlebiej: 9,
};
