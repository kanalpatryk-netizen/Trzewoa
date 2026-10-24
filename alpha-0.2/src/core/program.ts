/**
 * Program na Windows (`electron/`): okno programu daje grze to, czego strona sama nie ma — pełny ekran całego
 * okna i zamknięcie programu. Pełny ekran strony się tu nie nadaje: Electron wychodzi z niego na Esc, a samego
 * Esc gra wtedy nie dostaje. W przeglądarce okna programu nie ma i gra robi wszystko po staremu.
 */
export interface OknoProgramu {
  /** Pełny ekran (bez ramki i paska zadań) albo zwykłe okno. */
  pelnyEkran(tak: boolean): void;
  /** Zamyka program. */
  zamknij(): void;
}

/** Okno programu (electron/preload.js) albo null w przeglądarce. */
export function oknoProgramu(): OknoProgramu | null {
  return (window as Window & { trzewiaOkno?: OknoProgramu }).trzewiaOkno ?? null;
}
