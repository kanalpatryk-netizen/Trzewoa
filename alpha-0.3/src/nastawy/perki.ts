/**
 * PERKI (Alpha 0.3, wizja Patryka) — cechy imiennych postaci. Każda postać ma jeden perk i czasem jedną wadę.
 * Perk działa przez mnożnik roli (`efekt` — mnoży to, co liczy mnoznik() w src/sim/lud.ts: życie, siła,
 * szybkość, kopanie, modlitwa, głód) albo przez osobny hak w symulacji (`hak`, src/sim/druzyna.ts).
 * Wartości rzędu 15–30%: strata postaci ma boleć, ale nie psuć balansu. `znak` — ikonka na karcie postaci
 * (rysunek: src/render/karty.ts).
 */
import type { MnoznikiRoli, Rola } from './lud';

/** Haki: to, czego nie da się powiedzieć mnożnikiem. */
export type HakPerku =
  /** z rozbitej rudy czasem leci drugi okruch */
  | 'zyla'
  /** przy kopaniu głodnieje wolniej */
  | 'wytrwaly'
  /** Ten, który patrzy z ciemności, nie wybiera go na ofiarę */
  | 'swiatlo'
  /** rytuał, który odprawia przy ołtarzu, trwa krócej */
  | 'kaplan'
  /** raz na partię przeżywa śmiertelny cios */
  | 'twardy';

export type ZnakPerku = 'kilof' | 'okruch' | 'chleb' | 'serce' | 'plomien' | 'post' | 'oko' | 'dlonie' | 'tarcza' | 'miecz' | 'zbroja' | 'stopa' | 'wada';

export interface Perk {
  id: string;
  nazwa: string;
  /** jedno zdanie: co daje w grze */
  opis: string;
  /** komu może przypaść */
  role: Rola[];
  efekt?: Partial<MnoznikiRoli>;
  hak?: HakPerku;
  /** wada — ujemna cecha, dla równowagi */
  wada?: boolean;
  znak: ZnakPerku;
}

export const PERK = {
  /** Perki i wady działają (false — same imiona, bez skutków; do porównań balansu w próbach botów). */
  wlaczone: true,
  /** Nos do żył: szansa na drugi okruch z rozbitej rudy. */
  zylaSzansa: 0.35,
  /** Wytrwały: mnożnik głodu, gdy kopie. */
  wytrwalyGlod: 0.7,
  /** Ręka kapłana: rytuał trwa tyle razy krócej. */
  kaplanCzas: 0.65,
  /** Nie do zdarcia: po śmiertelnym ciosie zostaje z taką częścią życia (raz na partię). */
  twardyZycie: 0.3,
  /** Ślad działającego perku (znak nad postacią, rozbłysk karty) — nie częściej niż co tyle tików (8 s). */
  sladCo: 960,
};

export const PERKI: Perk[] = [
  // robotnicy
  { id: 'kilof', nazwa: 'Ciężka ręka', opis: 'Kopie o 30% szybciej.', role: ['robotnik'], efekt: { kopanie: 1.3 }, znak: 'kilof' },
  { id: 'zyla', nazwa: 'Nos do żył', opis: `Z co trzeciej rudy wybija drugi okruch (szansa ${Math.round(PERK.zylaSzansa * 100)}%).`, role: ['robotnik'], hak: 'zyla', znak: 'okruch' },
  { id: 'wytrwaly', nazwa: 'Wytrwały', opis: `Przy kopaniu głodnieje o ${Math.round((1 - PERK.wytrwalyGlod) * 100)}% wolniej.`, role: ['robotnik'], hak: 'wytrwaly', znak: 'chleb' },
  { id: 'krzepki', nazwa: 'Krzepki', opis: 'Ma o 30% więcej życia i o 20% mocniejszy cios.', role: ['robotnik'], efekt: { hp: 1.3, sila: 1.2 }, znak: 'serce' },
  // pobożni
  { id: 'zarliwy', nazwa: 'Żarliwy', opis: 'Modli się o 30% skuteczniej (wiara, pomnik).', role: ['pobozny'], efekt: { modlitwa: 1.3 }, znak: 'plomien' },
  { id: 'asceta', nazwa: 'Asceta', opis: 'Głodnieje o 30% wolniej.', role: ['pobozny'], efekt: { glod: 0.7 }, znak: 'post' },
  { id: 'swiatlo', nazwa: 'Światło w oczach', opis: 'Ten, który patrzy z ciemności, nigdy go nie wybiera.', role: ['pobozny'], hak: 'swiatlo', znak: 'oko' },
  { id: 'kaplan', nazwa: 'Ręka kapłana', opis: `Rytuał, który odprawia przy ołtarzu, trwa o ${Math.round((1 - PERK.kaplanCzas) * 100)}% krócej.`, role: ['pobozny'], hak: 'kaplan', znak: 'dlonie' },
  // rycerz
  { id: 'twardy', nazwa: 'Nie do zdarcia', opis: `Raz na partię przeżywa śmiertelny cios (zostaje z ${Math.round(PERK.twardyZycie * 100)}% życia).`, role: ['rycerz'], hak: 'twardy', znak: 'tarcza' },
  { id: 'miecz', nazwa: 'Mistrz miecza', opis: 'Bije o 25% mocniej.', role: ['rycerz'], efekt: { sila: 1.25 }, znak: 'miecz' },
  { id: 'zelazny', nazwa: 'Żelazne zdrowie', opis: 'Ma o 25% więcej życia.', role: ['rycerz'], efekt: { hp: 1.25 }, znak: 'zbroja' },
  // każdy
  { id: 'lekki', nazwa: 'Lekka stopa', opis: 'Chodzi o 20% szybciej.', role: ['robotnik', 'pobozny', 'rycerz'], efekt: { szybkosc: 1.2 }, znak: 'stopa' },
  // wady
  { id: 'lakomy', nazwa: 'Łakomy', opis: 'Głodnieje o 20% szybciej.', role: ['robotnik', 'pobozny', 'rycerz'], efekt: { glod: 1.2 }, wada: true, znak: 'wada' },
  { id: 'kulawy', nazwa: 'Kulawy', opis: 'Chodzi o 15% wolniej.', role: ['robotnik', 'pobozny', 'rycerz'], efekt: { szybkosc: 0.85 }, wada: true, znak: 'wada' },
  { id: 'watly', nazwa: 'Wątły', opis: 'Ma o 20% mniej życia.', role: ['robotnik', 'pobozny', 'rycerz'], efekt: { hp: 0.8 }, wada: true, znak: 'wada' },
  { id: 'watpiacy', nazwa: 'Wątpiący', opis: 'Modli się o 15% słabiej.', role: ['pobozny'], efekt: { modlitwa: 0.85 }, wada: true, znak: 'wada' },
  { id: 'niezdara', nazwa: 'Niezdara', opis: 'Kopie o 15% wolniej.', role: ['robotnik'], efekt: { kopanie: 0.85 }, wada: true, znak: 'wada' },
];

const PO_ID = new Map(PERKI.map((p) => [p.id, p]));
export const perk = (id: string): Perk | undefined => PO_ID.get(id);
