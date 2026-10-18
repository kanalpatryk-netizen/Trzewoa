/**
 * Alpha, etap 3f — zbroja rycerza (sim/zbroja.ts, rysunek: render/lud/rycerz.ts, render/lud/helm.ts).
 *
 * Rycerz zaczyna w kolczudze, z mieczem i w płaszczu — życie i siła jak dotąd. Kuźnia (sim/pomieszczenia.ts) wykuwa
 * z żelaza kolejne części i odkłada je na wieszak; rycerz sam po nie idzie, gdy nie ma fali Strażników ani rozkazu
 * (albo gdy go tam poślesz), zakłada jedną po drugiej i wraca. Każda noszona część dokłada swoją premię.
 * Decyzje użytkownika 18.10: zestaw startowy — kolczuga, miecz, płaszcz; rycerz idzie sam, gdy nie ma fali.
 * Tiki: 120 = sekunda, 7200 = minuta.
 */
export type CzescZbroi = 'helm' | 'naramienniki' | 'napiersnik' | 'nakolanniki' | 'tarcza';

export const ZBROJA = {
  /** Mnożniki rycerza za każdą noszoną część (życie, siła, szybkość; tarcza — ile zostaje z rany). */
  premie: {
    helm: { hp: 1.15 },
    napiersnik: { hp: 1.25 },
    naramienniki: { sila: 1.15 },
    nakolanniki: { szybkosc: 1.1 },
    tarcza: { rany: 0.8 },
  } as Record<CzescZbroi, { hp?: number; sila?: number; szybkosc?: number; rany?: number }>,
  /** Tyle tików zakłada jedną część (część leci z wieszaka, błysk). */
  zakladanieTikow: 150,
  /** Sam idzie po części tylko, gdy jest najedzony (głód poniżej tego). */
  glodDo: 0.35,
  /** Kuźni, do której nie doszedł, sam nie próbuje przez tyle tików (1 min). */
  ponowPo: 7200,
  /** Szukanie drogi do kuźni — limit kroków. */
  szukanieDrogi: 9000,
};

const proc = (m: number): string => `${m >= 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}%`;
const P = ZBROJA.premie;

/** Nazwy części (mianownik, biernik — „zakłada hełm”, „tarczę”) i co dają (karta postaci, atlas). */
export const CZESC: Record<CzescZbroi, { nazwa: string; biernik: string; skutek: string }> = {
  helm: { nazwa: 'hełm', biernik: 'hełm', skutek: `życie ${proc(P.helm.hp!)}` },
  naramienniki: { nazwa: 'naramienniki', biernik: 'naramienniki', skutek: `siła ${proc(P.naramienniki.sila!)}` },
  napiersnik: { nazwa: 'napierśnik', biernik: 'napierśnik', skutek: `życie ${proc(P.napiersnik.hp!)}` },
  nakolanniki: { nazwa: 'nakolanniki', biernik: 'nakolanniki', skutek: `szybkość ${proc(P.nakolanniki.szybkosc!)}` },
  tarcza: { nazwa: 'tarcza', biernik: 'tarczę', skutek: `rany ${proc(P.tarcza.rany!)}` },
};
