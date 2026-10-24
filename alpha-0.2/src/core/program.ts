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
  /** Do licznika klatek: monitor, płótno na karcie i Wine (Proton) — tego strona sama nie wie. */
  info?(): Promise<InfoProgramu>;
}

export interface InfoProgramu {
  /** Odświeżanie monitora z oknem gry (Hz). */
  hz: number;
  /** Program działa w Wine (Proton na Linuksie), a nie na Windowsie. */
  wine: boolean;
  /** Chromium rysuje płótno kartą graficzną (a nie procesorem). */
  plotnoNaKarcie: boolean;
}

/** Okno programu (electron/preload.js) albo null w przeglądarce. */
export function oknoProgramu(): OknoProgramu | null {
  return (window as Window & { trzewiaOkno?: OknoProgramu }).trzewiaOkno ?? null;
}
