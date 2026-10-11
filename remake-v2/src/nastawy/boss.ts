/**
 * BOSS (Remake v1, etap 3) — kogo przynosi ostatnia fala Strażników Snu.
 *
 * Żeby zmienić bossa: dopisz nowe nastawy tutaj, jego zachowanie w src/sim/boss.ts
 * (obiekt z `pojaw`, `tik`, `przyjmij`), wpisz go do rejestru BOSSOWIE i przestaw `AKTYWNY_BOSS`.
 * Reszta gry (fale, pasek życia, karta, rysunek) pyta tylko o aktywnego bossa.
 */
export type IdBossa = 'sniacyKamien';

/** Którego bossa przynosi ostatnia fala. */
export const AKTYWNY_BOSS: IdBossa = 'sniacyKamien';

/**
 * Śniący Kamień: wielki strażnik wynurza się ze ściany przedsionka. Powolny, bardzo wytrzymały,
 * ranić go mogą tylko rycerze. Co jakiś czas uderza w ziemię i zasypuje kawałek drogi wiernych
 * (robotnicy muszą ją odkopać pod atakiem). Gdy pod rdzeniem modli się dość pobożnych, słabnie
 * (bierze więcej ran); gdy modlitwa cichnie — zrasta się.
 */
export const SNIACY_KAMIEN = {
  nazwa: 'Śniący Kamień',
  hp: 500,
  /** cios i jego rytm (tiki), zasięg ciosu (kafle) */
  sila: 10, ciosCo: 160, zasieg: 2.2,
  /** prędkość (kafle na tik) */
  szybkosc: 0.014,
  /** wielkość na mapie (× zwykła postać) */
  rozmiar: 2.6,
  /** rany zadają mu tylko rycerze */
  tylkoRycerze: true,
  /** co tyle tików zasypuje kawałek drogi wiernych: tyle kafli, najwyżej tak daleko od rdzenia */
  zasypCo: 2400, zasypKafli: 5, zasypZasieg: 40,
  /** tylu wiernych modlących się pod rdzeniem osłabia go: rany × `modlitwaRany` */
  modlitwaWiernych: 3, modlitwaRany: 1.6,
  /** bez tej modlitwy zrasta się o tyle życia na tik */
  zrastanie: 0.03,
  /**
   * Ostatnia deska: gdy nie ma już ani rycerzy, ani nieodkopanych gniazd, rani go też pobożny —
   * unosi przed siebie księgę i razi z dystansu `ksiegaZasieg` kafli, co `ksiegaCo` tików za
   * `ksiegaRana`; gdy boss podejdzie bliżej niż `ksiegaCofa`, pobożny się cofa.
   */
  ksiegaZasieg: 9, ksiegaCo: 150, ksiegaRana: 2, ksiegaCofa: 6,
  /** z jak daleka (kafle) pobożni ruszają na Strażników z księgą */
  ksiegaWidzi: 60,
};
