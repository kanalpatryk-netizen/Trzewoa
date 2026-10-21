/**
 * ŚLUBY I TAROT (Alpha 0.3, wizja Pawła).
 *
 * Ślub: po „Nowa gra” gracz wybiera 1 z 3 — każdy daje bonus wszystkim rolom na całą partię (mnożniki ról,
 * te same, które liczy mnoznik() w src/sim/lud.ts).
 * Tarot: talia 22 wielkich arkanów. Dotknięcie talii kosztuje wiarę (każda kolejna karta drożej) i wyciąga
 * kartę — prosto daje całej kompanii buff, odwrócona nerf, na pewien czas. Naraz leży najwyżej `miejsc` kart;
 * wypalona karta gaśnie i wraca do talii. Hazard: nie wiesz, co wypadnie.
 * Logika: src/sim/tarot.ts, rysunek pasa: src/render/tarot.ts.
 */
import type { MnoznikiRoli, Rola } from './lud';

/** Skutek na role: `wszyscy` dotyczy każdej roli, a pola roli dokładają się do niego. */
export type SkutekRol = Partial<Record<Rola | 'wszyscy', Partial<MnoznikiRoli>>>;

export interface Slub { id: string; nazwa: string; motto: string; skutek: SkutekRol; opis: Record<Rola, string> }

export const SLUBY: Slub[] = [
  {
    id: 'cisza', nazwa: 'Ślub ciszy', motto: 'Milczą i robią swoje.',
    skutek: { robotnik: { kopanie: 1.1 }, pobozny: { modlitwa: 1.1 }, rycerz: { sila: 1.1 } },
    opis: { robotnik: '+10% szybkości kopania', pobozny: '+10% siły modlitwy', rycerz: '+10% siły ciosów' },
  },
  {
    id: 'ogien', nazwa: 'Ślub ognia', motto: 'Idą przez górę jak żar.',
    skutek: { robotnik: { szybkosc: 1.15 }, pobozny: { hp: 1.2 }, rycerz: { szybkosc: 1.15, hp: 1.1 } },
    opis: { robotnik: '+15% szybkości chodu', pobozny: '+20% życia', rycerz: '+15% szybkości, +10% życia' },
  },
  {
    id: 'glod', nazwa: 'Ślub głodu', motto: 'Jedzą raz, gdy inni dwa razy.',
    skutek: { wszyscy: { glod: 0.8 } },
    opis: { robotnik: '−20% narastania głodu', pobozny: '−20% narastania głodu', rycerz: '−20% narastania głodu' },
  },
];

export interface StronaKarty {
  /** co robi, jednym zdaniem (podpis na karcie i w kronice) */
  opis: string;
  skutek?: SkutekRol;
  /** od razu, przy wyciągnięciu: krew i wiara (ujemne — zabiera) */
  krew?: number;
  wiara?: number;
}

export interface Arkan { id: string; nr: string; nazwa: string; prosto: StronaKarty; odwrocona: StronaKarty }

export const TAROT = {
  /** Ile kart leży naraz (miejsca na pasie). */
  miejsc: 6,
  /** Pierwsza karta kosztuje tyle wiary… */
  cena: 15,
  /** …a każda następna w tej partii o tyle więcej… */
  cenaWzrost: 5,
  /** …ale nie więcej niż tyle. */
  cenaMaks: 60,
  /** Szansa, że karta wypadnie odwrócona (nerf). */
  odwroconaSzansa: 1 / 3,
  /** Karta działa tyle tików (90 s). */
  trwa: 10800,
  /** Animacja odwracania karty na pasie (ms ekranu). */
  odwracanieMs: 900,
};

export const ARKANA: Arkan[] = [
  { id: 'glupiec', nr: '0', nazwa: 'Głupiec', prosto: { opis: 'wszyscy chodzą o 20% szybciej', skutek: { wszyscy: { szybkosc: 1.2 } } }, odwrocona: { opis: 'robotnicy kopią o 20% wolniej', skutek: { robotnik: { kopanie: 0.8 } } } },
  { id: 'mag', nr: 'I', nazwa: 'Mag', prosto: { opis: 'robotnicy kopią o 25% szybciej', skutek: { robotnik: { kopanie: 1.25 } } }, odwrocona: { opis: 'pobożni modlą się o 20% słabiej', skutek: { pobozny: { modlitwa: 0.8 } } } },
  { id: 'kaplanka', nr: 'II', nazwa: 'Kapłanka', prosto: { opis: 'pobożni modlą się o 30% mocniej', skutek: { pobozny: { modlitwa: 1.3 } } }, odwrocona: { opis: 'pobożni modlą się o 20% słabiej', skutek: { pobozny: { modlitwa: 0.8 } } } },
  { id: 'cesarzowa', nr: 'III', nazwa: 'Cesarzowa', prosto: { opis: 'wszyscy głodnieją o 30% wolniej', skutek: { wszyscy: { glod: 0.7 } } }, odwrocona: { opis: 'wszyscy głodnieją o 15% szybciej', skutek: { wszyscy: { glod: 1.15 } } } },
  { id: 'cesarz', nr: 'IV', nazwa: 'Cesarz', prosto: { opis: 'rycerz bije o 25% mocniej', skutek: { rycerz: { sila: 1.25 } } }, odwrocona: { opis: 'rycerz bije o 20% słabiej', skutek: { rycerz: { sila: 0.8 } } } },
  { id: 'kaplan', nr: 'V', nazwa: 'Kapłan', prosto: { opis: '+15 wiary i pobożni modlą się o 15% mocniej', wiara: 15, skutek: { pobozny: { modlitwa: 1.15 } } }, odwrocona: { opis: '−15 wiary', wiara: -15 } },
  { id: 'kochankowie', nr: 'VI', nazwa: 'Kochankowie', prosto: { opis: 'wszyscy mają o 20% więcej życia', skutek: { wszyscy: { hp: 1.2 } } }, odwrocona: { opis: 'wszyscy mają o 15% mniej życia', skutek: { wszyscy: { hp: 0.85 } } } },
  { id: 'rydwan', nr: 'VII', nazwa: 'Rydwan', prosto: { opis: 'robotnicy i rycerz chodzą o 25% szybciej', skutek: { robotnik: { szybkosc: 1.25 }, rycerz: { szybkosc: 1.25 } } }, odwrocona: { opis: 'wszyscy chodzą o 10% wolniej', skutek: { wszyscy: { szybkosc: 0.9 } } } },
  { id: 'moc', nr: 'VIII', nazwa: 'Moc', prosto: { opis: 'wszyscy biją o 20% mocniej', skutek: { wszyscy: { sila: 1.2 } } }, odwrocona: { opis: 'wszyscy biją o 15% słabiej', skutek: { wszyscy: { sila: 0.85 } } } },
  { id: 'pustelnik', nr: 'IX', nazwa: 'Pustelnik', prosto: { opis: 'pobożni głodnieją o 20% wolniej i modlą się o 15% mocniej', skutek: { pobozny: { glod: 0.8, modlitwa: 1.15 } } }, odwrocona: { opis: 'pobożni chodzą o 12% wolniej', skutek: { pobozny: { szybkosc: 0.88 } } } },
  { id: 'kolo', nr: 'X', nazwa: 'Koło Fortuny', prosto: { opis: '+30 krwi', krew: 30 }, odwrocona: { opis: '−20 krwi', krew: -20 } },
  { id: 'sprawiedliwosc', nr: 'XI', nazwa: 'Sprawiedliwość', prosto: { opis: 'kopanie, modlitwa i ciosy o 15% mocniej', skutek: { wszyscy: { kopanie: 1.15, modlitwa: 1.15, sila: 1.15 } } }, odwrocona: { opis: 'kopanie, modlitwa i ciosy o 10% słabiej', skutek: { wszyscy: { kopanie: 0.9, modlitwa: 0.9, sila: 0.9 } } } },
  { id: 'wisielec', nr: 'XII', nazwa: 'Wisielec', prosto: { opis: 'pobożni modlą się o 40% mocniej, ale chodzą o 20% wolniej', skutek: { pobozny: { modlitwa: 1.4, szybkosc: 0.8 } } }, odwrocona: { opis: 'robotnicy kopią o 25% wolniej', skutek: { robotnik: { kopanie: 0.75 } } } },
  { id: 'smierc', nr: 'XIII', nazwa: 'Śmierć', prosto: { opis: 'rycerz bije o 35% mocniej', skutek: { rycerz: { sila: 1.35 } } }, odwrocona: { opis: 'rycerz ma o 25% mniej życia', skutek: { rycerz: { hp: 0.75 } } } },
  { id: 'umiarkowanie', nr: 'XIV', nazwa: 'Umiarkowanie', prosto: { opis: 'robotnicy głodnieją o 25% wolniej', skutek: { robotnik: { glod: 0.75 } } }, odwrocona: { opis: 'robotnicy głodnieją o 12% szybciej', skutek: { robotnik: { glod: 1.12 } } } },
  { id: 'diabel', nr: 'XV', nazwa: 'Diabeł', prosto: { opis: 'wszyscy biją o 30% mocniej, ale głodnieją o 10% szybciej', skutek: { wszyscy: { sila: 1.3, glod: 1.1 } } }, odwrocona: { opis: 'pobożni modlą się o 30% słabiej', skutek: { pobozny: { modlitwa: 0.7 } } } },
  { id: 'wieza', nr: 'XVI', nazwa: 'Wieża', prosto: { opis: 'robotnicy kopią o 35% szybciej', skutek: { robotnik: { kopanie: 1.35 } } }, odwrocona: { opis: 'robotnicy kopią o 30% wolniej', skutek: { robotnik: { kopanie: 0.7 } } } },
  { id: 'gwiazda', nr: 'XVII', nazwa: 'Gwiazda', prosto: { opis: '+25 wiary', wiara: 25 }, odwrocona: { opis: '−15 wiary', wiara: -15 } },
  { id: 'ksiezyc', nr: 'XVIII', nazwa: 'Księżyc', prosto: { opis: 'wszyscy chodzą o 15% szybciej', skutek: { wszyscy: { szybkosc: 1.15 } } }, odwrocona: { opis: 'modlitwa o 20% słabsza, chód o 10% wolniejszy', skutek: { wszyscy: { szybkosc: 0.9 }, pobozny: { modlitwa: 0.8 } } } },
  { id: 'slonce', nr: 'XIX', nazwa: 'Słońce', prosto: { opis: 'wszyscy głodnieją o 30% wolniej', skutek: { wszyscy: { glod: 0.7 } } }, odwrocona: { opis: 'wszyscy głodnieją o 18% szybciej', skutek: { wszyscy: { glod: 1.18 } } } },
  { id: 'sad', nr: 'XX', nazwa: 'Sąd', prosto: { opis: 'rycerz ma o 25% więcej życia i bije o 15% mocniej', skutek: { rycerz: { hp: 1.25, sila: 1.15 } } }, odwrocona: { opis: 'rycerz bije o 20% słabiej', skutek: { rycerz: { sila: 0.8 } } } },
  { id: 'swiat', nr: 'XXI', nazwa: 'Świat', prosto: { opis: 'wszystko o 10% lepiej: kopanie, modlitwa, ciosy, chód', skutek: { wszyscy: { kopanie: 1.1, modlitwa: 1.1, sila: 1.1, szybkosc: 1.1 } } }, odwrocona: { opis: 'wszyscy głodnieją o 10% szybciej', skutek: { wszyscy: { glod: 1.1 } } } },
];

const PO_ID = new Map(ARKANA.map((a) => [a.id, a]));
export const arkan = (id: string): Arkan | undefined => PO_ID.get(id);
export const slub = (id: string | undefined): Slub | undefined => SLUBY.find((s) => s.id === id);
