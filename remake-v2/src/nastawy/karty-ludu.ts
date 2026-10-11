/**
 * KARTY LUDU (Remake v1, etap 4) — talia pod jeden lud: spisek rycerzy (i bunt, gdy go zostawisz),
 * zatrute plony, woda w obozie, zawał nad drogą wiernych, sen o kamiennych rycerzach.
 * Koszty w krwi i wierze; tiki: 120 = sekunda, 7200 = minuta.
 */
export const KARTY_LUDU = {
  /** Spisek: co najmniej tylu rycerzy; zgładzenie zabija `spisekSpiskowcow`, przekupstwo kosztuje krew. */
  spisekMinRycerzy: 4, spisekSpiskowcow: 2, spisekPrzekup: 25, spisekStlum: 6,
  /** Waga karty spisku w losowaniu (była 2,5 — spiski zabierały rycerzy, potrzebnych na bossa) i przerwa po spisku (5 min). */
  spisekWaga: 1, spisekPrzerwa: 36000,
  /** Zostawiony spisek wraca jako bunt po tylu tikach (2 min); buntuje się taka część rycerzy (co najmniej 1). */
  buntPo: 14400, buntCzesc: 0.4,
  /** Bunt: „przemów do nich” (wiara) zawraca połowę buntowników; „oddaj obóz” — odchodzą z jedzeniem. */
  buntPrzemow: 14, buntOddajJedzenie: 30,
  /** Buntownik: cios co tyle tików, siła × rycerz; cel w promieniu (kafle). */
  buntCiosCo: 70, buntZasieg: 1.6, buntWidzi: 60,

  /** Zatrute plony: spalenie grzybu (wiara) w promieniu przy spiżarni; zatrucie trwa `zatrucieTikow` (−`zatrucie`). */
  plonySpal: 6, plonyPromien: 10, zatrucieTikow: 7200, zatrucie: 0.6, plonyZatrutych: 4, plonyZapasy: 0.5,

  /** Woda w obozie: zatkanie kosztuje krew; „odwróć” — wiara, woda płynie gdzie indziej. */
  zalanieZatkaj: 12, zalanieOdwroc: 8,
  /** Ile wody (0–8) leje się ze stropu nad obozem przy „niech płynie”. */
  zalanieWoda: 3,

  /** Zawał nad drogą wiernych: podparcie (wiara); inaczej tyle kafli drogi znów jest skałą. */
  zawalPodeprzyj: 6, zawalKafli: 6,

  /** Sen o rycerzach: wiara za to, że gniazdo zaświeci (widać je zawsze), i krew za „ich krew”. */
  senPokaz: 8,
};
