/**
 * LOCH, KOCIOŁ I BRAMA (6.11, decyzja użytkownika): droga wiernych nie idzie już prosto w dół. Pierwszy szyb schodzi
 * od wnęki przy sali do starej komnaty z pajęczynami i kotłem, komnatą idzie się w bok, a drugi szyb schodzi z jej
 * drugiego końca na przedproże lochu. Do lochu z Wielkim Pomnikiem prowadzi tylko stalowa brama — podnosi się, gdy
 * przy kotle rzuca zaklęcia dwóch pobożnych, a potem powoli opada. Tu wszystkie liczby; geometria — sim/world.ts,
 * brama — sim/brama.ts, rysunek — render/loch.ts. Odległości w kaflach, czas w tikach (120 = sekunda).
 */
export const LOCH = {
  /**
   * Zakręt drogi wiernych: pierwszy szyb sięga tyle rzędów pod podłogę sali (do dna komnaty z kotłem), a drugi zaczyna
   * się tyle kolumn w bok (środek do środka). Strona: −1 — w lewo, w stronę przedproża lochu. Przykład użytkownika
   * „40 w dół, 30 w bok, znowu w dół”; razem do wykucia mniej więcej tyle co dawny prosty szyb (komnata stoi pusta).
   */
  zakret: { wDol: 46, wBok: 30, strona: -1 as -1 | 1 },
  /**
   * Stara komnata na zakręcie (z pajęczynami i kotłem): wysokość wnętrza i ile kafli wystaje za szyby po bokach.
   * Mur dookoła jest nie do ruszenia — wchodzi się szybem z góry, wychodzi szybem w dół.
   */
  komnata: { wys: 7, zaSzybem: 3 },
  /**
   * Loch z Wielkim Pomnikiem: pół szerokości wnętrza (końce leżą dalej od przedsionka niż zasięg Strażników z zapasem —
   * tam bezbronni czekają, gdy trwa fala), wysokość sklepienia w przęsłach (łuki co `przeslo` kafli, każdy wyższy
   * w środku o `luk`) i nad przedsionkiem (`nawa` na tyle kafli w bok). Mury nie do ruszenia, `mur` kafli grube.
   */
  loch: { rx: 42, przeslo: 12, sklepienie: 9, luk: 3, nawa: 15, nawaSzer: 14, mur: 2 },
  /** Przedproże przed bramą (na dnie drugiego szybu): wysokość wnętrza i ile kafli sięga za szyb na lewo. */
  przedproze: { wys: 4, zaSzybem: 1 },
  /** Stalowa brama w lewym murze lochu: wysokość przejścia (kafle) — tyle podnosi się krata przy pełnym otwarciu. */
  brama: { wys: 3 },
};

/**
 * Brama (sim/brama.ts). Otwarcie 0..1: rośnie, póki przy kotle rzuca zaklęcia co najmniej `potrzeba` pobożnych
 * (pełne otwarcie po `otwieranie` tików — 40 s), a gdy przestaną — opada przez `opadanie` (od pełnego otwarcia do
 * zamknięcia). Przejść da się, póki otwarcie ≥ `czolgaOd` (pod kratą trzeba się czołgać), wyprostowanym — od `idzieOd`
 * (40 s zaklinania — przejdzie każdy, 20 s — brama w połowie, tylko się przeczołgać).
 */
export const BRAMA = {
  potrzeba: 2,
  otwieranie: 40 * 120,
  opadanie: 110 * 120,
  czolgaOd: 0.2,
  idzieOd: 0.6,
  /** Czołgający się pod kratą idzie tyle razy wolniej. */
  czolganie: 0.35,
  /** Przy kotle: tyle kafli od środka kotła w bok (i jeden rząd w górę/dół) stoi się, rzucając zaklęcia. */
  przyKotle: 5,
  /** Gdzie stają rzucający zaklęcia — kafle od kotła (po kolei, na zmianę po obu stronach). */
  miejscaPrzyKotle: [2, -2, 3, -3, 4, -4],
};

/**
 * Modlitwa za innych (6.11): modlący się pobożny (na rozkaz „Módl się za innych”, przy obozie, w krypcie albo przy
 * ołtarzu) błogosławi swoich w promieniu: leczy (życia na sekundę) i daje dar swojej roli na `trwa` tików po wyjściu
 * z kręgu. Dary: rycerz — siła i szybkość, robotnik — kopanie i szybkość, pobożny — modlitwa; każdy — wolniej głodnieje.
 */
export const BLOGOSLAWIENSTWO = {
  promien: 8,
  /** Co tyle tików krąg sprawdza, kto w nim stoi (leczenie liczone za cały odstęp). */
  co: 30,
  /** Życia na sekundę (bez względu na rolę — rycerz ma go dużo, więc leczy go to słabiej, niż się wydaje). */
  leczenie: 1.1,
  trwa: 20 * 120,
  dary: {
    rycerz: { sila: 1.15, szybkosc: 1.1 },
    robotnik: { kopanie: 1.25, szybkosc: 1.1 },
    pobozny: { modlitwa: 1.25 },
  } as Record<string, Partial<Record<'sila' | 'szybkosc' | 'kopanie' | 'modlitwa', number>>>,
  glod: 0.85,
};
