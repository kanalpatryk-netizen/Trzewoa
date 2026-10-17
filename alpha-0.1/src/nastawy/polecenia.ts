/**
 * POLECENIA I ODSTĘPY (Alpha, etap 2) — rozkazy gracza dla zaznaczonych postaci ludu
 * (src/sim/polecenia.ts) i to, jak lud rozstawia się w tłumie (src/sim/creatures.ts).
 * Odległości w kaflach, czas w tikach (120 = sekunda, 7200 = minuta gry).
 */
export const POLECENIA = {
  /** Wskazuje się palcem, nie co do kafla: postać staje najdalej tyle kafli od wskazanego miejsca. */
  celPromien: 2,
  /** Wskazane miejsce w pustce: postać staje na podłodze najwyżej tyle kafli niżej. */
  podlogaNizej: 8,
  /** Ile kafli przejrzeć, sprawdzając przy wydaniu rozkazu, czy da się tam dojść (rozkazy są rzadkie — mogą kosztować). */
  szukanieDrogi: 30000,
  /** …i czy robotnik da radę się tam dokopać. */
  szukanieKopania: 40000,
  /** W drodze: gdy przejście zniknie (zawał, odkopana podłoga), tyle razy szuka nowego, zanim się podda. */
  prob: 3,
  /** Odmowa wisi nad głową tyle tików (2,5 s) — napis w dymku i kręcenie głową. */
  odmowaTikow: 300,
  /** Znacznik celu rozkazu świeci na płycie tyle tików po wydaniu. */
  znacznikTikow: 720,
};

export const ODSTEPY = {
  /** Stojący z ludu nie stoją bliżej siebie niż tyle kafli (mniej więcej szerokość sylwetki) — rozsuwają się. */
  stojacy: 0.9,
  /** O tyle kafli na tik się rozsuwają (powoli, krokiem w bok). */
  rozsuwanie: 0.025,
  /** Idący w tę samą stronę tuż za kimś (bliżej niż tyle) dopasowują krok do niego… */
  idacy: 1.1,
  /** …chyba że są od niego szybsi co najmniej tyle razy — wtedy go wyprzedzają (mijają się bokiem). */
  wyprzedza: 1.15,
};
