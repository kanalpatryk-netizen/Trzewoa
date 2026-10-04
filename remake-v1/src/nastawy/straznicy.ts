/**
 * STRAŻNICY SNU (Remake v1, etap 3) — fale przeciwników spod skorupy rdzenia.
 *
 * Fala wychodzi ze skały, gdy skorupa jest skruszona w `prog` procentach. Dopóki trwa,
 * skorupa nie pęka (modlitwa nie kruszy kamienia). Fala kończy się, gdy padnie ostatni
 * Strażnik — wtedy pękanie rusza dalej, a góra płaci wiarą. Ostatnia fala przychodzi z bossem
 * (jego nastawy i zachowanie: src/nastawy/boss.ts i src/sim/boss.ts).
 * Tiki: 120 = sekunda, 7200 = minuta gry.
 */
export interface Fala {
  /** przy tylu procentach skorupy wychodzi */
  prog: number;
  /** ilu zwykłych Strażników */
  straznikow: number;
  /** czy z bossem */
  boss?: boolean;
}

export const STRAZNICY = {
  fale: [
    { prog: 20, straznikow: 2 },
    { prog: 45, straznikow: 3 },
    { prog: 70, straznikow: 4 },
    { prog: 90, straznikow: 2, boss: true },
  ] as Fala[],

  /** Życie i siła ciosu Strażnika w pierwszej fali; każda następna fala × (1 + `wzrostNaFale`). */
  hp: 36, sila: 2, wzrostNaFale: 0.2,
  /** Co tyle tików Strażnik zadaje cios (gdy stoi przy celu) i z jakiej odległości (kafle). */
  ciosCo: 120, zasieg: 1.4,
  /** Prędkość (kafle na tik). Strażnicy przenikają skałę — idą prosto do celu. */
  szybkosc: 0.028,
  /** Nie odchodzą od rdzenia dalej niż tyle kafli (nie wchodzą wysoko). */
  limitOdRdzenia: 30,
  /** Wychodzą ze skały w tej odległości od przedsionka (kafle). */
  pojawOd: 7, pojawDo: 15,
  /** Rycerz w tej odległości od Strażnika rusza do walki; uderza co `rycerzCiosCo` tików z `rycerzZasieg` kafli. */
  rycerzWidzi: 40, rycerzCiosCo: 60, rycerzZasieg: 1.6,
  /** Strażnicy biorą na cel rycerza, choćby stał o tyle kafli dalej niż ktoś inny. */
  rycerzPierwszy: 12,
  /** Kto nie jest rycerzem, oddaje zaatakowany słabszy cios (× siła roli × to). */
  oddajeCios: 0.6,
  /**
   * Podczas zwykłej fali wszyscy poza rycerzami odchodzą od rdzenia (dalej niż limit + `ucieczkaZapas`)
   * — modlitwa i tak nic nie kruszy. Przy fali z bossem pobożni zostają: ich modlitwa go osłabia.
   */
  ucieczkaZapas: 6,
  /**
   * Zwykła fala, która przez tyle tików (3 min) nikogo nie uderzy (lud uciekł, rycerzy brak), wraca do snu —
   * ale skorupa się zrasta: postęp trwającego pęknięcia przepada, nagrody nie ma. Fala z bossem nie zasypia.
   */
  zasypiaPo: 21600,
  /**
   * Boss bez przeciwnika: gdy przez tyle tików (2 min) pod rdzeniem nie ma ani jednego rycerza, wraca do ściany
   * i śpi `bossSpi` tików (4 min) — lud odżywa i zbiera rycerzy, skorupa w tym czasie nie pęka, potem boss wraca.
   * (Bez tego fala z bossem bez rycerzy trwała wiecznie i lud wymierał z głodu, czekając.)
   */
  bossZasypiaBezRycerzy: 14400, bossSpi: 28800,
  /**
   * Na bossa rycerze ruszają dopiero razem: dopóki w ludzie jest ich mniej niż tyle (a w skale śpią jeszcze
   * gniazda), czekają z dala od rdzenia — pojedynczo ginęli od razu. Gdy gniazd już nie ma, idą, ilu jest.
   */
  rycerzyNaBossa: 3,
  /** Czekający rycerz broni się, gdy Strażnik (albo boss) podejdzie bliżej niż tyle kafli. */
  rycerzBroniSieOd: 4,
  /** Głodny z ludu nie ucieka przed falą (idzie jeść), dopóki żaden Strażnik nie jest bliżej niż tyle kafli. */
  glodnyNieUciekaOd: 12,
  /** Wiara za pokonaną falę. */
  nagrodaWiary: 15,
};
