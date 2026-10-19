/**
 * CECHY NACJI (v4.1 beta) — każda nacja dostaje przy narodzinach jedną cechę.
 *
 * Cecha to kilka mnożników na statystyki rasy (src/sim/races.ts), liczonych tylko dla
 * tej jednej nacji. Każda ma jedną zaletę i jedną wadę, żeby żadna nie była po prostu
 * lepsza. 1 = bez zmian, 1.4 = o 40% więcej, 0.8 = o 20% mniej.
 *
 *   wiara   — ile wiary i oddania daje modlitwa
 *   rozrod  — rodzenie (Ślepy Lud), wykuwanie w ogniu (Żużlowcy), przerabianie jeńców (Prządki)
 *   glod    — jak szybko głodnieją
 *   sila    — obrażenia w walce
 *   kopanie — jak szybko kopią
 *   zycie   — jak długo żyją
 *   strach  — jak łatwo uciekają przed silniejszym wrogiem
 */
export interface Cecha {
  id: string;
  /** Przymiotnik w liczbie mnogiej — na podpisie nacji: „Grzmotowie · 11 · pobożni”. */
  nazwa: string;
  /** Zaleta i wada jednym zdaniem — karta postaci, inspektor, atlas. */
  opis: string;
  wiara: number; rozrod: number; glod: number; sila: number; kopanie: number; zycie: number; strach: number;
}

const ZWYKLA = { wiara: 1, rozrod: 1, glod: 1, sila: 1, kopanie: 1, zycie: 1, strach: 1 };

/** Nacja bez cechy (ludzie z powierzchni, stare zapisy). */
export const BEZ_CECHY: Cecha = { id: '', nazwa: '', opis: '', ...ZWYKLA };

export const CECHY: Cecha[] = [
  { ...ZWYKLA, id: 'pobozni', nazwa: 'pobożni', opis: 'modlitwa daje im o 40% więcej wiary i oddania, ale słabo walczą', wiara: 1.4, sila: 0.8 },
  { ...ZWYKLA, id: 'plodni', nazwa: 'płodni', opis: 'przybywa ich o połowę szybciej, ale szybciej głodnieją', rozrod: 1.5, glod: 1.25 },
  { ...ZWYKLA, id: 'wojowniczy', nazwa: 'wojowniczy', opis: 'biją o 35% mocniej i rzadko uciekają, ale mniej się modlą', sila: 1.35, strach: 0.6, wiara: 0.75 },
  { ...ZWYKLA, id: 'kopacze', nazwa: 'kopacze', opis: 'kopią o 40% szybciej, ale ciężka praca szybciej ich głodzi', kopanie: 1.4, glod: 1.15 },
  { ...ZWYKLA, id: 'dlugowieczni', nazwa: 'długowieczni', opis: 'żyją o 60% dłużej, ale kopią wolniej', zycie: 1.6, kopanie: 0.85 },
  { ...ZWYKLA, id: 'skromni', nazwa: 'skromni', opis: 'jedzą o 30% mniej, ale są słabsi w walce', glod: 0.7, sila: 0.85 },
];

/**
 * Jakie cechy może wylosować dana rasa (numery jak w enum Race: 0 Ślepy Lud, 1 Żużlowcy,
 * 2 trole, 3 Prządki). Trole się nie modlą, a same się nie rozmnażają — pobożność
 * i płodność nic by im nie dały. Ludzie z powierzchni cech nie mają.
 */
export const CECHY_RASY: Record<number, string[]> = {
  0: ['pobozni', 'plodni', 'wojowniczy', 'kopacze', 'dlugowieczni', 'skromni'],
  1: ['pobozni', 'plodni', 'wojowniczy', 'kopacze', 'dlugowieczni', 'skromni'],
  2: ['wojowniczy', 'kopacze', 'dlugowieczni', 'skromni'],
  3: ['pobozni', 'plodni', 'wojowniczy', 'kopacze', 'dlugowieczni', 'skromni'],
};
