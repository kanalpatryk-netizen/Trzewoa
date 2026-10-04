/**
 * WYDARZENIA — karty z wyborem, główny sposób grania w wersji na telefon.
 *
 * Co jakiś czas gra staje i pokazuje wydarzenie (najazd, zaraza, powódź, prorok, głód…)
 * z dwoma–trzema wyborami opisanymi wprost. Tu są odstępy między kartami i ceny wyborów.
 * Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry).
 */
export const WYDARZENIA = {
  // ----------------------------------------------------------------- rytm
  /** Pierwsza karta po tylu tikach od początku partii. */
  pierwsze: 3600,
  /** Kolejna karta po tylu tikach + los do `rozrzut`. */
  odstep: 4200, rozrzut: 2400,
  /** Karta pilna (głód całej nacji) przychodzi poza kolejką, gdy głoduje taka część — ale nie częściej niż co `pilnaPo` tików. */
  pilnyGlod: 0.7, pilnaPo: 5400,
  /** Świat bez gracza (testy, automat): po tylu tikach wydarzenie rozstrzyga się samo, domyślnym wyborem. */
  bezGraczaPo: 600,

  // ----------------------------------------------------------------- ceny
  /** Najazd: zawalenie wejścia / poprowadzenie ich na najsilniejszych. */
  najazdZawal: 20, najazdProwadz: 10,
  /** Remake v1: najazd schodzi co najmniej tyle kafli (w poziomie) od siedziby ludu. */
  najazdOdSiedziby: 55,
  /** Powódź: zatkanie szczeliny / skierowanie wody na najsilniejszych. */
  powodzZatkaj: 15, powodzKieruj: 10,
  /** Zaraza: uzdrowienie (Wiara) i ile oddania dostaje wtedy każda nacja. */
  zarazaUzdrow: 20, zarazaUzdrowOddanie: 0.05,
  /** Żyła szaleństwa: zasklepienie. */
  zylaZasklep: 15,
  /** Głód: grzyb (Krew), ile kafli jedzenia i o ile spada głód. */
  glodGrzyb: 12, glodJedzenia: 16, glodUlga: 0.35,
  /** Głód: „niech jedzą zmarłych” — tylu najsłabszych ginie, reszcie ubywa tyle głodu. */
  glodZmarlych: 2, glodZmarlychUlga: 0.3,
  /** Prorok: wysłuchanie (Wiara); uciszenie daje nacji tyle oddania. */
  prorokWysluchaj: 15, prorokUciszOddanie: 0.05,
  /** Ruda: tyle rudy dostaje nacja. */
  rudaOltarz: 4, rudaKuznia: 6,
  /** Prośba o znak: objawienie (Wiara), ile oddania daje; milczenie tyle zabiera. */
  znakObjaw: 20, znakOddanie: 0.2, znakMilczenie: 0.05,
  /** Warta pod rdzeniem: posłanie trzech (Wiara) i grzyb przy przedsionku (Krew). */
  wartaPosl: 15, wartaGrzyb: 15, wartaIlu: 3,
  /** Kłótnia: podsycenie (Wiara); pogodzenie daje obu tyle oddania. */
  klotniaPodsyc: 10, klotniaPogodzOddanie: 0.03,
  /** Ratunek ginącej krwi (Krew) i ile jedzenia dostaje. */
  ratunek: 15, ratunekJedzenia: 14,
  /** Nowe plemię: nakarmienie (Krew). */
  plemieNakarm: 10, plemieJedzenia: 12,
  /** Pierwsza krew (dwie nacje zaczynają wojnę): rozdzielenie (Krew — tej, której nie przeleją) i na ile tików rozejm. */
  wojnaRozdziel: 15, wojnaPokoj: 14400,

  // -------------------------------------------------------------- warunki
  /** Głód: karta, gdy głoduje taka część nacji liczącej co najmniej `glodMinNacja`. */
  glodUdzial: 0.4, glodMinNacja: 4,
  /** Prorok: nacja liczy co najmniej tylu. */
  prorokMinNacja: 14,
  /** Prośba o znak: oddanie najwierniejszej nacji w tym przedziale. */
  znakOd: 0.2, znakDo: 0.5,
  /** Warta: nacja ma co najmniej tyle oddania i tylu ludzi. */
  wartaOddanie: 0.4, wartaMinNacja: 6,
  /** Obcy lud: tylko przy takiej dominacji jednej krwi i nie wcześniej niż po tylu tikach. */
  obcyOdDominacji: 0.74, obcyPo: 21600,
  /** Pierwsza krew: ta sama para nie wraca z kartą przez tyle tików; karty wojen nie częściej niż co `wojnaPo`. */
  wojnaCisza: 43200, wojnaPo: 16200,   // v4.2 beta: było 10800 — „pierwsza krew” zalewała partię
  /** Pierwsza krew: rozsądnie rozdzielić, gdy słabsza krew liczy tylu albo mniej. */
  wojnaChronPonizej: 10,
  /** Wymieranie: rasa ma tylu albo mniej, a miała co najmniej `wymieraSzczyt`. */
  wymieraPonizej: 3, wymieraSzczyt: 7,

  // ------------------------------------------------- v4 beta: skutki odroczone
  /** Układ z głębią: tyle Krwi teraz… */
  dlugKrew: 80,
  /** …a po tylu tikach głębia się upomina: sen rośnie o tyle (Koszmar: × `koszmarDlug`). */
  dlugPo: 21600, dlugSen: 0.12, koszmarDlug: 1.5,
  /** Układ z głębią nie wcześniej niż po tylu tikach i nie gdy sen już jest wysoko. */
  dlugOd: 14400, dlugMaxSen: 0.4,
  /** Przysięga dwóch nacji: cena błogosławieństwa (Wiara) i po ilu tikach przysięga się spełnia. */
  przysiegaWiara: 25, przysiegaPo: 14400,
  /** Spełniona przysięga: tyle oddania obu nacjom i pokój na tyle tików. */
  przysiegaOddanie: 0.12, przysiegaPokoj: 86400,
  /** Zlekceważona przysięga: tyle urazy między nimi. */
  przysiegaUraza: 3,

  // ------------------------------------------------- v4.1 beta: łańcuchy kart
  /** Karta z łańcucha wraca po tylu tikach od wyboru, który ją zaczął (wojna szybciej)… */
  lancuchPo: 18000, zemstaPo: 7200,
  /** …i nie wcześniej niż tyle tików po poprzedniej karcie. */
  lancuchOdstep: 1800,
  /** Heretyk (po uciszonym proroku): nawrócenie (Wiara) i jego oddanie; zmiażdżenie — tylu ginie, reszta uwierzy o tyle; „niech mówi” zabiera tyle oddania. */
  heretykNawroc: 20, heretykNawrocOddanie: 0.12, heretykOfiar: 2, heretykStrachOddanie: 0.04, heretykZwatpienie: 0.1,
  /** Proroctwo (po wysłuchanym proroku): spełnienie (Wiara), oddanie każdej nacji, postęp kucia skorupy; milczenie zabiera tyle oddania. */
  proroctwoWiara: 25, proroctwoOddanie: 0.08, proroctwoSkorupa: 0.15, proroctwoZwatpienie: 0.1,
  /** Wdzięczni (po nakarmionym głodzie): ofiara (krew, wiara) albo oddanie. */
  wdzieczniKrew: 30, wdzieczniWiara: 20, wdzieczniOddanie: 0.12,
  /** Ozdrowieńcy (po zarazie): błogosławieństwo (Wiara), oddanie każdej nacji, ulga w głodzie; przy milczeniu zaraza wraca z taką szansą. */
  ozdrowiencyWiara: 15, ozdrowiencyOddanie: 0.05, ozdrowiencyUlga: 0.2, ozdrowiencyNawrot: 0.35,
  /** Zemsta (po „niech walczą”): siła dla słabszych (Krew) i ile dostają jedzenia. */
  zemstaKrew: 15, zemstaJedzenia: 12,

  // ----------------------------------------------- v4.2 beta: drożejące wybory
  /** Płatny wybór drożeje o tyle (× cena wyjściowa) za każde wcześniejsze kupno tego samego wyboru w tej partii. */
  drozeje: 0.5,
};
