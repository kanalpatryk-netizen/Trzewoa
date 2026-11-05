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
  wielkosc: 2.05,
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

  // ---------------------------------------------------------------- Alpha, etap 5b: dłoń pomaga demonowi
  /**
   * W walce z demonem z Wielkiego Pomnika (sim/dlon-demona.ts) dłoń z otchłani mu pomaga — każdą akcją inaczej
   * (decyzja użytkownika 18.10: „chwyta rycerza i daje go kilkanaście metrów do góry, zasłania bossa, może zawalić szyb”;
   * „każda akcja tej ręki ma mieć inną animację”). Pierwsza akcja po `pierwszaPo` tikach walki, potem co `przerwa`.
   * `wielkosc` — osobno dla każdej akcji (krypta jest niska). `wagi` — jak często która akcja, gdy ma sens.
   */
  demon: {
    wlaczona: true as boolean,
    pierwszaPo: 300, przerwa: 720,
    wielkosc: { rzut: 1.6, tarcza: 1.5, zawal: 1.6 } as Record<'rzut' | 'tarcza' | 'zawal', number>,
    wagi: { rzut: 2, tarcza: 1, zawal: 1.5 } as Record<'rzut' | 'tarcza' | 'zawal', number>,
    /**
     * Rzut: spod podłogi pod rycerzem wyrasta dłoń, obejmuje go palcami (nie pięścią), unosi i ciska w górę i w bok, z dala
     * od demona — na wysokość do `wysokosc` kafli (strop krypty go zatrzyma) i `wBok` kafla na tik w bok. Spadając rani
     * (`rana` × życie) i ogłusza na `ogluszenie` tików. Tylko gdy rycerz stoi najwyżej `zasieg` kafli od demona.
     */
    rzut: { wstaje: 70, chwyta: 55, unosi: 50, rzuca: 24, cofa: 90, wysokosc: 13, wBok: 0.12, grawitacja: 0.012, rana: 0.1, ogluszenie: 300, zasieg: 4.5 },
    /**
     * Tarcza: między rycerzem a demonem wyrasta z podłogi otwarta dłoń, wnętrzem do rycerza, palce rozczapierzone jak mur.
     * Póki stoi (`stoi` tików), demona nic nie rani — ciosy odbijają się od dłoni i odrzucają rycerza. Stoi `przedDemonem`
     * kafla przed demonem; tylko gdy rycerz jest najwyżej `zasieg` kafli od niego.
     */
    tarcza: { wstaje: 80, stoi: 600, cofa: 80, przedDemonem: 2.2, zasieg: 10, odrzut: 0.35 },
    /**
     * Zawał: między rycerzem a demonem (co najmniej `minOdstep` kafli od siebie) dłoń przebija się przez strop, szpony drą
     * skałę, płaskie uderzenie — i strop się zawala: ściana gruzu na `szer` kafli, od podłogi do stropu (najwyżej `maxWys`).
     * Gruz trzyma `trwa` tików (robotnicy mogą go rozkuć wcześniej), potem się kruszy (`kruszy` tików). Póki stoi, demon
     * jest odcięty: nie przechodzi na drugą stronę i zrasta się szybciej (× `zrastanie`).
     */
    zawal: { wstaje: 70, drze: 80, wali: 30, cofa: 70, trwa: 1800, kruszy: 150, szer: 2, minOdstep: 5, maxOdstep: 16, maxWys: 10, zrastanie: 3 },
  },
};
