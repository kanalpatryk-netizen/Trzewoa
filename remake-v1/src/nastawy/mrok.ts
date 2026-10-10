/**
 * MROK (Remake v1) — ciemność w górze i Ten, który patrzy.
 *
 * Światło niosą lampki robotników, aureole pobożnych, siedziba, obozy, rdzeń i Cud.
 * Poza nim góra jest ciemna, a w ciemności coś jest: krąży w skale, wypatruje kogoś,
 * kto został sam daleko od obozu, i patrzy na niego. Gdy patrzy dość długo, zabiera go —
 * ty dostajesz krew, lud traci człowieka. Odpędza je Cud rzucony blisko niego albo
 * ktoś z ludu, kto podejdzie do samotnego.
 *
 * Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry, 120 = sekunda).
 */
export const MROK = {
  /** Wyłącznik całej warstwy (ciemność na rysunku i Patrzący). Typ boolean — żeby kompilator nie uznał kodu za martwy. */
  wlaczony: true as boolean,

  // ---------------------------------------------------------------- Patrzący
  /** Pierwszy raz wyjdzie z ciemności po tylu tikach partii (3 min). */
  pierwszyPo: 21600,
  /** Nie poluje, gdy ludu jest mniej niż tylu — nie dobija ostatnich. */
  minLudu: 7,
  /** Samotny: nikt z ludu bliżej niż tyle kafli… */
  samotnyBezLudu: 5,
  /** …i dalej niż tyle od siedziby i obozów, i od rdzenia (tam jest światło). */
  samotnyOdObozu: 15, samotnyOdRdzenia: 12,
  /** Rycerzy nie rusza — żelazo i tarcza. */
  rycerzeBezpieczni: true as boolean,
  /** Jak szybko przenika skałę (kafli na tik): krążąc i gdy już kogoś wypatrzył. */
  tempoKrazy: 0.012, tempoPodchodzi: 0.03,
  /** Krąży w takiej odległości od siedziby (kafli). */
  krazyPromien: 22,
  /** Z takiej odległości zaczyna patrzeć (kafli). */
  patrzyZ: 3,
  /** Tyle tików patrzy, zanim zabierze (15 s) — czas na Cud albo na posłanie kogoś. Samotny stoi przez ten czas jak wryty. */
  patrzyTikow: 1800,
  /** Po zabraniu kogoś cichnie na tyle tików (4 min); po przegnaniu Cudem na tyle (3 min). */
  przerwaPoOfierze: 28800, przerwaPoCudzie: 21600,
  /** Cud bliżej niż tyle kafli od niego przegania go. */
  cudPromien: 10,
  /** Gdy ktoś przyjdzie do samotnego w trakcie patrzenia, Patrzący cofa się na tyle tików (2 min). */
  przerwaPoUcieczce: 14400,
  /** Kogo i jak często szuka (co tyle tików). */
  szukajCo: 60,

  // ---------------------------------------------------------------- ciemność na rysunku
  /**
   * Krycie ciemności poza światłem (0 = brak, 1 = czarno); w pauzie jaśniej — planujesz.
   * Dzielone przez suwak jasności z ustawień (domyślnie 1,25 → 0,58 i 0,36).
   */
  ciemnosc: 0.72, ciemnoscPauza: 0.45,
  /** Promienie światła (kafle). */
  swiatlo: {
    robotnik: 4.6, pobozny: 3.2, pobozny_modli: 4.2, rycerz: 2.6,
    siedziba: 9, oboz: 6, rdzen: 7, cud: 11,
  },
  /** Lampka samotnego, na którego patrzy, przygasa do tej części promienia. */
  lampkaPrzygasa: 0.25,
  /** Ciemność liczona w mniejszej rozdzielczości (×) — szybciej, a krawędzie światła i tak są miękkie. */
  skala: 0.5,
};
