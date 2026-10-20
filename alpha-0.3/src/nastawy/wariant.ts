/**
 * WARIANT (Alpha 0.3) — dwie wersje tej samej gry, budowane z jednego kodu:
 *  - 'patryk' — imienna drużyna: 6 stałych postaci (te same w każdej partii) z perkami, wadą i okruchem
 *    historii świata; na dole ekranu pas 6 kart postaci (src/render/karty.ts);
 *  - 'pawel' — ślub na starcie (1 z 3, bonus dla każdej roli na całą partię) i talia tarota: karty losowane
 *    za wiarę dają całej kompanii buff albo (odwrócone) nerf na pewien czas; na dole pas tarota.
 * Wersję wybiera build: `npm run pack` buduje obie (trzewia-alpha-0.3-patryk.html i -pawel.html).
 * Serwer deweloperski: `WARIANT=pawel npx vite`. Skrypty (testy, próby botów) czytają zmienną WARIANT.
 */
export type Wariant = 'patryk' | 'pawel';

declare const __WARIANT__: string | undefined;

function zBudowy(): string | undefined {
  if (typeof __WARIANT__ !== 'undefined') return __WARIANT__;
  const g = globalThis as { TRZEWIA_WARIANT?: string; process?: { env?: Record<string, string | undefined> } };
  return g.TRZEWIA_WARIANT ?? g.process?.env?.WARIANT;
}

export const WARIANT: Wariant = zBudowy() === 'pawel' ? 'pawel' : 'patryk';

/** Podpis wersji w menu i w nazwie pliku. */
export const NAZWA_WARIANTU: Record<Wariant, string> = { patryk: 'wizja Patryka', pawel: 'wizja Pawła' };
