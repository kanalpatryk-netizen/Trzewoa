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

/**
 * Schody drogi wiernych (6.11, decyzja użytkownika: dawne „były obrzydliwe i wyglądały nowocześnie” i „budowały się
 * nierealistycznie”): w każdym odcinku szybu schody kręcone wykute w skale — stopnie wokół kamiennego słupa, jak
 * w wieży zamku. Widać je tylko tam, gdzie robotnicy wykuli już skałę (render/schody.ts), a postacie idą po spirali
 * (render/lud/rozstep.ts). Odległości w kaflach.
 */
export const SCHODY = {
  /** Jeden pełny obrót spirali (kafle wysokości) i ile stopni na obrót. */
  obrot: 5, stopni: 12,
  /** Promień kamiennego słupa i linii, którą się chodzi (od środka szybu). */
  slup: 0.5, linia: 1.58,
  /** Rysunek odrobinę z góry: o tyle kafli wyżej na ekranie leży punkt kafel dalej w głąb (widać stopnice i bębny słupa). */
  ukos: 0.2,
  /** Grubość bloku stopnia (wysokości stopnia) — bloki zachodzą na siebie, spód spirali jest ciągły. */
  grubosc: 2,
  /** Lina na żelaznych pierścieniach w ścianie: wysokość nad stopniami i pierścień co tyle stopni. */
  lina: 0.8, pierscienCo: 3,
  /**
   * Ruch w pionie po schodach (mnożnik prędkości chodu): w górę, w dół. Po spirali idzie się dalej niż w pionie —
   * przy tych liczbach postać idzie po stopniach żwawo, trochę szybciej niż po płaskim (ok. 1,4 obrotu i 17 stopni
   * na sekundę gry). Dawniej zjeżdżała szybem dwa razy szybciej, niż chodzi (0,6 w górę, 1,2 w dół) — na spirali
   * byłoby to ponad 3 obroty i 40 stopni na sekundę, nogi migałyby zamiast stawać na stopniach. Zupełnie „po płaskiemu”
   * (0,42 / 0,46) wydłużało każdą drogę z jedzeniem do lochu: bot wygrywał 26 partii z 32, przy tych liczbach 63 z 64
   * (przy dawnych 64 z 64; partia dłuższa średnio o minutę).
   */
  wGore: 0.5, wDol: 0.55,
  /** Świeżo wykuty kafel: ile ms sypią się okruchy i pył, ile ms kamień jest jaśniejszy (świeży). */
  okruchyMs: 950, swiezyMs: 7000,
};

/**
 * Budowa schodów drogi wiernych (sim/budowa-schodow.ts, decyzja użytkownika: schody powstają z rusztowaniem, liną
 * i drabiną, nie wyłaniają się kafel po kaflu przy kopaniu). Czas w tikach (120 = sekunda).
 */
export const BUDOWA_SCHODOW = {
  /**
   * Tików pracy jednego murarza na stopień (kołowrót z obsługą opuszcza kamienie) — dwóch murarzy: ~0,6 s na stopień
   * (pierwszy odcinek ~1 min, drugi ~3 min przy pełnej obsadzie). Kołowrót opuszcza naraz paletę z 4 stopniami.
   */
  tikowNaStopien: 140,
  /** Ilu murarzy mieści się przy czole budowy (na najwyższych stopniach). */
  murarzy: 2,
  /** Bez nikogo przy kołowrocie murarze sami opuszczają kamień — tyle razy wolniej idzie. */
  bezKolowrotu: 0.6,
  /** Kurs kubła z urobkiem przy kopaniu (w dół i w górę) — tików. */
  kubelTikow: 420,
  /** Zmiana przy budowie (tików pracy, zanim robotnik znów rozejrzy się, co robić — jedzenie ma pierwszeństwo). */
  zmiana: 1800,
  /** Wolny robotnik idzie pomóc przy schodach dopiero po tylu tikach bez zajęcia (i gdy przy obozie zostaje inny wolny). */
  bezczynnyPo: 30 * 120,
  /** Rysunek: drabina — kąt na ścianie szybu (0 — tył, ujemny — w lewo) i odstęp szczebli (kafle). */
  drabinaKat: -0.5, szczebel: 0.42,
  /** Rysunek: rusztowanie — wysokość nad czołem budowy, odstęp pomostów, co ile kafli się je przestawia (kafle). */
  rusztowanie: 5, pomost: 2.2, przestawianie: 2,
};
