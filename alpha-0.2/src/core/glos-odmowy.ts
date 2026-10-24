import { GLOS_RYCERZA, GLOS_POBOZNEGO, type NastawyGlosu } from '../nastawy/dzwiek';
import { ZestawNagran } from './nagrania';

/**
 * Nagrania odmów na głos (Alpha): rycerz i pobożny, każdy ze swojego folderu w gra222/dzwieki/odmowy/.
 * Każdy plik .mp3 z folderu trafia do gry sam; mierzy się je i wyrównuje jak każdy głos (core/nagrania.ts).
 * Szanse grup — nastawy/dzwiek.ts (GLOS_RYCERZA, GLOS_POBOZNEGO).
 */
const PLIKI = {
  rycerz: import.meta.glob('../../gra222/dzwieki/odmowy/rycerz/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
  pobozny: import.meta.glob('../../gra222/dzwieki/odmowy/pobozny/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
};

/** Kto odmawia na głos. */
export type KtoMowi = keyof typeof PLIKI;

/** Nastawy głosu każdej roli. */
export const NASTAWY_GLOSU: Record<KtoMowi, NastawyGlosu> = { rycerz: GLOS_RYCERZA, pobozny: GLOS_POBOZNEGO };

/** Szansa nagrania według numeru w nazwie (…_part-NN.mp3); spoza listy — jak pospolite. */
function szansaPliku(G: NastawyGlosu, nazwa: string): number {
  const nr = /(\d+)\.mp3$/.exec(nazwa)?.[1];
  for (const g of Object.values(G.rzadkosc)) if (nr && g.pliki.includes(nr)) return g.szansa;
  return G.rzadkosc.pospolite?.szansa ?? 1;
}

/** Wszystkie nagrania odmów jednej roli: dekodowane raz, przy pierwszym dźwięku gry. */
export class GlosOdmowy extends ZestawNagran {
  readonly G: NastawyGlosu;

  constructor(kto: KtoMowi) {
    const G = NASTAWY_GLOSU[kto];
    super(`Głos odmowy: ${kto}`, PLIKI[kto], G, (nazwa) => szansaPliku(G, nazwa));
    this.G = G;
  }
}
