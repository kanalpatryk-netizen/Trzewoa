/**
 * Rasy nie są zbalansowane — każda istnieje inaczej. Grzybnia nie ma jednostek,
 * Ludzie przychodzą z góry i wracają, Trole nie czczą nikogo.
 */
export enum Race { GOBLIN = 0, DWARF = 1, TROLL = 2, SPINNER = 3, HUMAN = 4, MYCELIUM = 5 }
export const RACE_COUNT = 6;

export interface RaceDef {
  id: Race;
  name: string;
  short: string;
  /** Dopełniacz liczby mnogiej: „ktoś z goblinów”, „przerobiły prządki na swoje”. */
  dopelniacz: string;
  /** Dopełniacz pełnej nazwy nacji: „Krew Ślepego Ludu”, „Krew Żużlowców”. */
  nazwaDopelniacz: string;
  /** Czy nazwa jest w liczbie mnogiej — bez tego wychodziło „Slepy Lud biora gore”. */
  mnoga: boolean;
  color: [number, number, number];
  maxHp: number;
  speed: number;        // kafli na tik
  digPower: number;     // 0 = nie kopie
  strength: number;     // obrażenia w zwarciu
  breedRate: number;    // szansa na potomstwo przy nadmiarze jedzenia
  lifespan: number;     // tiki
  faithGain: number;    // ile Wiary daje jedna modlitwa
  fearGain: number;     // jak łatwo panikuje
  /** Jak szybko im burczy — wielkie ciała jedzą rzadziej. */
  metabolism: number;
  eatsMeat: boolean;
  swims: boolean;
  size: number;         // piksele przy zoomie 1 i mnożnik Krwi
}

export const RACES: RaceDef[] = [
  {
    id: Race.GOBLIN, name: 'Pobożni', nazwaDopelniacz: 'Pobożnych', short: 'pobożni', dopelniacz: 'Pobożnych', mnoga: true, color: [116, 158, 84],
    // Remake v1: nikt się nie rodzi, więc lud żyje dłużej niż cała partia (dawniej 6000 tików i szybki rozród)
    maxHp: 10, speed: 0.115, digPower: 1.0, strength: 2, breedRate: 0.085, lifespan: 150000,
    faithGain: 1.0, fearGain: 1.4, metabolism: 0.8, eatsMeat: true, swims: false, size: 1,
  },
  {
    id: Race.DWARF, name: 'Żużlowcy', nazwaDopelniacz: 'Żużlowców', short: 'żużlowcy', dopelniacz: 'żużlowców', mnoga: true, color: [196, 132, 70],
    maxHp: 22, speed: 0.085, digPower: 2.7, strength: 5, breedRate: 0.03, lifespan: 45000,
    faithGain: 0.45, fearGain: 0.5, metabolism: 0.3, eatsMeat: false, swims: false, size: 1.2,
  },
  {
    id: Race.TROLL, name: 'Trole', nazwaDopelniacz: 'Troli', short: 'trole', dopelniacz: 'trolów', mnoga: true, color: [126, 96, 150],
    maxHp: 70, speed: 0.07, digPower: 2.6, strength: 16, breedRate: 0.012, lifespan: 60000,
    faithGain: 0.08, fearGain: 0.15, metabolism: 0.3, eatsMeat: true, swims: true, size: 2,
  },
  {
    id: Race.SPINNER, name: 'Prządki', nazwaDopelniacz: 'Prządek', short: 'prządki', dopelniacz: 'prządek', mnoga: true, color: [206, 196, 226],
    maxHp: 22, speed: 0.135, digPower: 0.7, strength: 6, breedRate: 0.02, lifespan: 40000,
    faithGain: 0.3, fearGain: 0.35, metabolism: 0.42, eatsMeat: true, swims: false, size: 1.1,
  },
  {
    id: Race.HUMAN, name: 'Ludzie', nazwaDopelniacz: 'Ludzi', short: 'ludzie', dopelniacz: 'ludzi', mnoga: true, color: [222, 208, 176],
    maxHp: 26, speed: 0.1, digPower: 0.9, strength: 7, breedRate: 0, lifespan: 9000,
    faithGain: 0, fearGain: 0.8, metabolism: 1.0, eatsMeat: true, swims: true, size: 1.2,
  },
  {
    id: Race.MYCELIUM, name: 'Grzybnia', nazwaDopelniacz: 'Grzybni', short: 'grzybnia', dopelniacz: 'grzybni', mnoga: false, color: [120, 168, 96],
    maxHp: 1, speed: 0, digPower: 0, strength: 0, breedRate: 0, lifespan: 0,
    faithGain: 0, fearGain: 0, metabolism: 0, eatsMeat: false, swims: false, size: 0,
  },
];

/** Nacje nie są wpisane w grę — powstają z rozłamów. Nazwy też. */
const ROOTS: Record<number, string[]> = {
  [Race.GOBLIN]: ['Mrok', 'Kiełb', 'Szczerb', 'Popiel', 'Ciurk', 'Gnój', 'Płacz', 'Wrzask', 'Ślin', 'Grzmot'],
  [Race.DWARF]: ['Żużel', 'Kowadł', 'Sadz', 'Miech', 'Rdzew', 'Spiek', 'Hutn', 'Klin'],
  [Race.TROLL]: ['Głaz', 'Gnat', 'Wyj', 'Kieł', 'Miaż'],
  [Race.SPINNER]: ['Nić', 'Przęd', 'Osnow', 'Węzeł', 'Snuj'],
  [Race.HUMAN]: ['Wierzbowi', 'Ludzie Popiołu', 'Żelaźni', 'Latarnicy', 'Wolni Kopacze'],
};
const SUFFIX: Record<number, string[]> = {
  [Race.GOBLIN]: ['owie', 'aki', 'uchy', 'iszcze', 'ory'],
  [Race.DWARF]: ['nicy', 'owie', 'arze', 'iny'],
  [Race.TROLL]: ['y', 'iska', 'ory'],
  [Race.SPINNER]: ['arki', 'ice', 'nice'],
  [Race.HUMAN]: [''],
};

export function clanName(race: Race, pick: (n: number) => number): string {
  const roots = ROOTS[race] ?? ['Bez'];
  const sufs = SUFFIX[race] ?? [''];
  return roots[pick(roots.length)] + sufs[pick(sufs.length)];
}


/** Odmienia czasownik pod nazwe rasy. */
export function odmien(race: Race, pojedyncza: string, mnoga: string): string {
  return RACES[race].mnoga ? mnoga : pojedyncza;
}
