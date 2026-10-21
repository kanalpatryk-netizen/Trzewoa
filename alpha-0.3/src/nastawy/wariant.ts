/**
 * WARIANT (Alpha 0.3) — trzy wersje tej samej gry, budowane z jednego kodu:
 *  - 'patryk' — imienna drużyna: 6 stałych postaci (te same w każdej partii) z perkami, wadą i okruchem
 *    historii świata; na dole ekranu pas 6 kart postaci (src/render/karty.ts);
 *  - 'pawel' — ślub na starcie (1 z 3, bonus dla każdej roli na całą partię) i talia tarota: karty losowane
 *    za wiarę dają całej kompanii buff albo (odwrócone) nerf na pewien czas; na dole pas tarota.
 *  - 'razem' (od 21.10, główna) — obie wizje połączone na prośbę użytkownika: wszystko, czego chciał Paweł (ślub na
 *    starcie, talia tarota na dole, lore tylko jako historia świata — bez życiorysów), a do tego stała drużyna z perkami
 *    Patryka jako poziome kafelki w lewej kolumnie, w miejscu rytów (Nakarm, Szepnij i Cud chwilowo schowane — RYTY).
 * Wersję wybiera build: `npm run pack` buduje wszystkie trzy (trzewia-razem.html, trzewia-patryk.html, trzewia-pawel.html).
 * Serwer deweloperski: `WARIANT=pawel npx vite` (bez zmiennej — 'razem'). Skrypty (testy, próby botów) czytają WARIANT.
 */
export type Wariant = 'patryk' | 'pawel' | 'razem';

declare const __WARIANT__: string | undefined;

function zBudowy(): string | undefined {
  if (typeof __WARIANT__ !== 'undefined') return __WARIANT__;
  const g = globalThis as { TRZEWIA_WARIANT?: string; process?: { env?: Record<string, string | undefined> } };
  return g.TRZEWIA_WARIANT ?? g.process?.env?.WARIANT;
}

const zb = zBudowy();
export const WARIANT: Wariant = zb === 'pawel' || zb === 'patryk' ? zb : 'razem';

/** Stała obsada z perkami (Patryk) — w wersji Pawła imiona są z puli, bez perków. */
export const maObsade = (w: Wariant): boolean => w !== 'pawel';
/** Ślub na starcie i talia tarota (Paweł). */
export const maTarot = (w: Wariant): boolean => w !== 'patryk';
/** Zdanie „kim była” na karcie — Paweł: biografii nikt nie czyta, lore tylko jako historia świata. */
export const maZyciorysy = (w: Wariant): boolean => w === 'patryk';

/**
 * RYTY — Nakarm, Szepnij i Cud w lewej kolumnie ekranu gry. W wersji 'razem' chwilowo schowane (prośba użytkownika
 * 21.10: „chwilowo je usuń, tam daj poziome kwadraty z jednostkami”); kod rytów zostaje, bot dalej z nich korzysta.
 */
export const RYTY = { widoczne: WARIANT !== 'razem' };

/** Podpis wersji w menu i w nazwie pliku. */
export const NAZWA_WARIANTU: Record<Wariant, string> = { patryk: 'wizja Patryka', pawel: 'wizja Pawła', razem: 'Patryk i Paweł razem' };
