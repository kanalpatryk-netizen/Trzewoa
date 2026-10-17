/**
 * ZAWAŁ OD GÓRY (Remake v2) — góra zamyka się za ludem. Gdy przez `czekaj` tików nikogo
 * z ludu nie ma nad linią (najwyżej stojący minus `zapas`), skała nad nią się zawala:
 * wszystko wyżej staje się litą, nie do ruszenia skałą (razem z gniazdami kamiennych
 * rycerzy, obozami i trupami), a kamera nie wjeżdża już ponad strop. Linia schodzi tylko
 * w dół, skokami co `krok` kafli. Kod: src/sim/zawal.ts.
 */
export const ZAWAL = {
  /** Wyłącznik (typ boolean — żeby kompilator nie uznał kodu za martwy). */
  wlaczony: true as boolean,
  /** Co ile tików sprawdza (1 s). */
  sprawdzCo: 120,
  /** Nad najwyżej stojącym z ludu zostaje tyle kafli góry… */
  zapas: 14,
  /** …a strop schodzi skokami co tyle kafli. */
  krok: 16,
  /** Nikt z ludu nie może być nad nową linią przez tyle tików (20 s). */
  czekaj: 2400,
  /** Pierwszy zawał najwcześniej po tylu tikach od startu (1 min) — gracz zdąży zobaczyć szczyt. */
  najwczesniej: 7200,
  /** Najniżej, jak może zejść: tyle kafli nad przedsionkiem rdzenia. */
  doPrzedsionka: 40,
};
