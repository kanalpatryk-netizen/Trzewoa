import { GLOSY_LUDU, type KwestiaLudu } from '../nastawy/dzwiek';
import type { Rola } from '../nastawy/lud';
import { ZestawNagran, type Nagranie } from './nagrania';

/**
 * Głosy ludu (Alpha): kwestie z gra222/dzwieki/jednostki/<kwestia><litera>/ — nazwa folderu mówi, co postać mówi
 * (potwierdzenie, atak, bol, glod), a wielka litera na końcu — czyja to kwestia (R — rycerz; GLOSY_LUDU.koncowki).
 * Folder bez litery mówi każdy z ludu; folder z literą jest tylko tej roli i ma pierwszeństwo przed wspólnym.
 * Każdy plik .mp3 z folderu trafia do gry sam. Kiedy która kwestia pada — app/screens/game.ts (glosyLudu).
 */
const PLIKI = import.meta.glob('../../gra222/dzwieki/jednostki/*/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const KWESTIE: readonly KwestiaLudu[] = ['potwierdzenie', 'atak', 'bol', 'glod'];
const ROLE: readonly Rola[] = ['pobozny', 'robotnik', 'rycerz'];

/** Plik „rzadkie…” gra ze stałą szansą, reszta folderu dzieli się po równo. */
function szansaPliku(nazwa: string): number | null {
  return nazwa.startsWith(GLOSY_LUDU.rzadkie.nazwa) ? GLOSY_LUDU.rzadkie.szansa : null;
}

/** Kwestie każdej roli: nagrania dekodowane raz, przy pierwszym dźwięku gry. */
export class GlosyLudu {
  /** „rola:kwestia” → nagrania (folder wspólny jest pod każdą rolą). */
  private zestawy = new Map<string, ZestawNagran>();

  constructor() {
    const foldery = new Map<string, Record<string, string>>();
    for (const [sciezka, url] of Object.entries(PLIKI)) {
      const folder = sciezka.split('/').slice(-2)[0];
      if (!foldery.has(folder)) foldery.set(folder, {});
      foldery.get(folder)![sciezka] = url;
    }
    // najpierw foldery wspólne, potem z literą roli — kwestia jednej roli nadpisuje wspólną
    const zLitera = (f: string) => (/[A-Z]$/.test(f) ? 1 : 0);
    for (const folder of [...foldery.keys()].sort((a, b) => zLitera(a) - zLitera(b))) {
      const [, kwestia, litera] = /^(.*?)([A-Z]*)$/.exec(folder)!;
      const rola = litera ? GLOSY_LUDU.koncowki[litera] : undefined;
      if (GLOSY_LUDU.pomin.includes(folder)) continue;
      if (!KWESTIE.includes(kwestia as KwestiaLudu)) { console.warn(`Głos ludu: nie wiem, kiedy mówić „${folder}” — pomijam.`); continue; }
      if (litera && !rola) { console.warn(`Głos ludu: nie wiem, czyj jest „${folder}” (litera ${litera}) — pomijam.`); continue; }
      const zestaw = new ZestawNagran(`Głos ludu: ${folder}`, foldery.get(folder)!, GLOSY_LUDU, szansaPliku);
      for (const r of rola ? [rola] : ROLE) this.zestawy.set(`${r}:${kwestia}`, zestaw);
    }
  }

  wczytaj(ctx: AudioContext): void {
    for (const z of new Set(this.zestawy.values())) z.wczytaj(ctx);
  }

  /** Czy rola ma tę kwestię (bez kwestii — czy ma jakąkolwiek), choćby nagrania jeszcze się nie wczytały. */
  ma(rola: Rola, kwestia?: KwestiaLudu): boolean {
    return kwestia ? this.zestawy.has(`${rola}:${kwestia}`) : KWESTIE.some((k) => this.zestawy.has(`${rola}:${k}`));
  }

  losuj(rola: Rola, kwestia: KwestiaLudu): Nagranie | null {
    return this.zestawy.get(`${rola}:${kwestia}`)?.losuj() ?? null;
  }
}
