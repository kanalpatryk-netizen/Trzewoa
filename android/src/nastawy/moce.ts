/**
 * MOCE — co kosztują i jak działają czasowniki gracza.
 *
 * Koszty w punktach zasobów (Krew / Wiara / Otchłań). Gracz nie widzi liczb,
 * tylko to, czy ryt się rozjarza — więc te wartości ustawiają rytm gry.
 */
export const KOSZTY = {
  ksztaltuj: {
    draz: { krew: 6, wiara: 0, otchlan: 0 },
    zawal: { krew: 6, wiara: 0, otchlan: 0 },
    woda: { krew: 10, wiara: 0, otchlan: 0 },
    zar: { krew: 14, wiara: 0, otchlan: 0 },
  },
  zasiej: {
    ruda: { krew: 8, wiara: 4, otchlan: 0 },
    grzyb: { krew: 8, wiara: 0, otchlan: 0 },
    kosci: { krew: 8, wiara: 4, otchlan: 0 },
  },
  szept: {
    modl: { krew: 0, wiara: 8, otchlan: 0 },
    prorok: { krew: 0, wiara: 18, otchlan: 0 },
    uciekaj: { krew: 0, wiara: 5, otchlan: 0 },
  },
  znak: {
    objawienie: { krew: 0, wiara: 30, otchlan: 0 },
    panika: { krew: 0, wiara: 30, otchlan: 0 },
  },
} as Record<string, Record<string, { krew: number; wiara: number; otchlan: number }>>;

export const MOCE = {
  /** Kształtowanie: promień pędzla w kaflach. */
  ksztaltPromien: 1.6,
  /** Woda i żar wlewają tyle płynu na kafel (0..8). */
  plynPoziom: 8,
  /** Zasiew: promień i szansa na kafel dla każdego narzędzia. */
  zasiewPromien: 2,
  zasiewSzansa: { ruda: 0.6, grzyb: 0.5, kosci: 0.5 },
  /** Znak widzą wszyscy w tym promieniu. */
  znakZasieg: 26,
  /** Objawienie: + oddanie każdego widzącego, jego strach × to, + oddanie nacji (raz na nację, nie na widza). */
  objawienieOddanie: 0.35, objawienieStrach: 0.4, objawienieNacja: 0.2,
  /** Panika: nacja traci tyle oddania (raz na nację). */
  panikaNacja: 0.08,
  /** Plan w pauzie: kolejne pociągnięcie bliżej niż to nie dubluje rozkazu. */
  planOdstepKsztalt: 1.2, planOdstepZasiew: 1.6,
};

/**
 * SKAZY — trwałe zmiany krwi rasy. Każda liczba to mnożnik statystyki z sim/races.ts
 * (1 = bez zmian, 2 = dwa razy więcej). Rytu „Skaź” w tej wersji nie ma — skazy
 * zostają tylko po to, żeby stare zapisy wczytywały się takie, jakie były.
 */
export const SKAZY = {
  plodnosc: { plodnosc: 2.4, dlugoscZycia: 0.75, metabolizm: 1.45 },
  zadza: { sila: 1.7, strach: 0.5, wiara: 0.35 },
  slepota: { szybkosc: 0.72, wiara: 2.2, kopanie: 1.2 },
  kamien: { zdrowie: 1.6, szybkosc: 0.8, kopanie: 0.6, metabolizm: 1.2 },
};
