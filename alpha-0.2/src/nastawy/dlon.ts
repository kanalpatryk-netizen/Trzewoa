/**
 * DŁOŃ Z OTCHŁANI (Remake v1, tylko Koszmar) — rzadkie wydarzenie: pod kimś z ludu porusza się
 * otchłań, z głębi w dole wznosi się ogromna dłoń, chwyta jedną albo dwie postacie i cofa się
 * z nimi w dół, w ciemność. Cud rzucony przy nich, zanim dłoń chwyci, odpycha ją.
 * Kod: src/sim/dlon.ts, rysunek: src/render/dlon.ts.
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
  /** …a pod nią zaczyna się otchłań (nieznane): tyle kafli w dół do obejrzenia (w pasie ±6 kafli)… */
  otchlanPromien: 10,
  /** …i co najmniej tyle nieznanych kafli w tym pasie. */
  otchlanMin: 30,
  /** Z jakiej głębi pod ofiarą wznosi się dłoń (kafle) i jak bardzo może się pochylić w bok (część pionu). */
  glebia: 16, pochylenie: 0.45,
  /** Ofiara stoi co najmniej tyle kafli od lewej i prawej krawędzi świata (żeby kamera mogła pokazać całość). */
  odKrawedzi: 22,
  /** Drugi zabrany: ktoś z ludu najdalej tyle kafli od pierwszego — z taką szansą. */
  drugiDo: 3.5, drugiSzansa: 0.6,

  // ---------------------------------------------------------------- przebieg (tiki)
  /** Dłoń wznosi się z głębi (ofiary stoją jak wryte), sięga, zaciska się, cofa w dół, łuna gaśnie. */
  wstaje: 420, siega: 240, chwyta: 80, cofa: 260, gasnie: 220,
  /** Cud bliżej niż tyle kafli od ofiary albo brzegu otchłani pod nią, zanim dłoń chwyci, odpycha ją. */
  cudPromien: 12,

  // ---------------------------------------------------------------- wygląd (kafle)
  /** Wielkość dłoni (mnożnik; 1 = dłoń od nadgarstka po szpony ok. 5,4 kafla, a postać ma ok. 2,5). */
  wielkosc: 1.8,
  /** Czerwona łuna otchłani pod ofiarą: promień (kafle). */
  lunaPromien: 6,

  // ---------------------------------------------------------------- Alpha, etap 4: lina wiadra
  /**
   * Dłoń wznosi się spod podłogi sali przy wiadrze i przecina pazurem linę, na której zjeżdża jedzenie
   * (sim/lina-wiadra.ts). Tylko w Koszmarze (decyzja użytkownika 18.10; w Alphie Koszmar jest zawsze). Nie patrzy na to,
   * ilu jest ludu (`minLudu` dotyczy tylko chwytania). Najwcześniej po `pierwszaPo` tikach (5 min), potem co `losujCo`
   * los z szansą `szansa` (średnio raz na ok. 6 min, gdy wiadro jest w szybie), po każdym razie cisza `przerwa`
   * (6 min), najwyżej `maxNaPartie` razy. `bok` — o ile kafli w bok od liny przebija się przez podłogę.
   */
  lina: { pierwszaPo: 36000, losujCo: 3600, szansa: 0.08, przerwa: 43200, maxNaPartie: 3, bok: 1.6 },
};
