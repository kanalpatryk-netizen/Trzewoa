/**
 * KARTY LUDU (Remake v1, etap 4) — talia pod jeden lud: zatrute plony, woda w obozie, zawał nad drogą wiernych.
 * (Alpha: bez spisku rycerzy, buntu i snu o kamiennych rycerzach.)
 * Koszty w krwi i wierze; tiki: 120 = sekunda, 7200 = minuta.
 */
export const KARTY_LUDU = {
  /** Zatrute plony: spalenie grzybu (wiara) w promieniu przy spiżarni; zatrucie trwa `zatrucieTikow` (−`zatrucie`). */
  plonySpal: 6, plonyPromien: 10, zatrucieTikow: 7200, zatrucie: 0.6, plonyZatrutych: 4, plonyZapasy: 0.5,

  /** Woda w obozie: zatkanie kosztuje krew; „odwróć” — wiara, woda płynie gdzie indziej. */
  zalanieZatkaj: 12, zalanieOdwroc: 8,
  /** Ile wody (0–8) leje się ze stropu nad obozem przy „niech płynie”. */
  zalanieWoda: 3,

  /** Zawał nad drogą wiernych: podparcie (wiara); inaczej tyle kafli drogi znów jest skałą. */
  zawalPodeprzyj: 6, zawalKafli: 6,
};
