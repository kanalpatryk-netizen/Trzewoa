/**
 * MROK (Remake v1) — ciemność w górze.
 *
 * Światło niosą lampki robotników, aureole pobożnych, siedziba, obozy, rdzeń i Cud.
 * Poza nim góra jest ciemna. (Alpha 0.2: Tego, który patrzy z ciemności, już nie ma.)
 */
export const MROK = {
  /** Wyłącznik ciemności na rysunku. Typ boolean — żeby kompilator nie uznał kodu za martwy. */
  wlaczony: true as boolean,

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
    /** Alpha, etap 3d: świece na ołtarzu (przy rytuale jaśniej) i smuga dnia z szybu nad nim (u góry, u dołu). */
    oltarz: 5.5, rytual: 8, smugaGora: 2.2, smugaDol: 4.2,
  },
  /** Ciemność liczona w mniejszej rozdzielczości (×) — szybciej, a krawędzie światła i tak są miękkie. */
  skala: 0.5,
};
