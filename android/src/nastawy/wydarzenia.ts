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

  // -------------------------------------------------------------- warunki
  /** Głód: karta, gdy głoduje taka część nacji liczącej co najmniej `glodMinNacja`. */
  glodUdzial: 0.4, glodMinNacja: 4,
  /** Prorok: nacja liczy co najmniej tylu. */
  prorokMinNacja: 14,
  /** Prośba o znak: oddanie najwierniejszej nacji w tym przedziale. */
  znakOd: 0.2, znakDo: 0.5,
  /** Warta: nacja ma co najmniej tyle oddania i tylu ludzi. */
  wartaOddanie: 0.4, wartaMinNacja: 6,
  /** Obcy lud: tylko przy takiej dominacji jednej krwi. */
  obcyOdDominacji: 0.74,
  /** Wymieranie: rasa ma tylu albo mniej, a miała co najmniej `wymieraSzczyt`. */
  wymieraPonizej: 3, wymieraSzczyt: 7,
};
