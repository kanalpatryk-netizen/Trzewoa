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
   * Dzielone przez suwak jasności z ustawień (domyślnie 1,25 → 0,46 i 0,3). Mniej niż dawniej (0,72):
   * rycina ma teraz szkic w nieznanym i jasne jaskinie — ciemność ma je przygasić, nie zgasić.
   */
  ciemnosc: 0.58, ciemnoscPauza: 0.38,
  /** Promienie światła (kafle). */
  swiatlo: {
    robotnik: 7.6, pobozny: 5.6, pobozny_modli: 6.6, rycerz: 5.4,
    siedziba: 10, oboz: 7, rdzen: 7, cud: 11,
    /** Alpha, etap 3d: świece na ołtarzu (przy rytuale jaśniej) i smuga dnia z szybu nad nim (u góry, u dołu). */
    oltarz: 5.5, rytual: 8, smugaGora: 2.2, smugaDol: 4.2,
    /**
     * Jasna sala cała w świetle (dzień z szybu i świece): plamy o tym promieniu co tyle kafli wzdłuż sali.
     * Gotowe pomieszczenia świecą poza swój obrys o tyle kafli: kuźnia ogniem, warsztat świecą, sypialnia ledwo.
     */
    sala: 7.5, salaKrok: 3,
    pomieszczenia: { kuznia: 5.5, warsztat: 3.6, sypialnia: 2.6 } as Record<string, number>,
  },
  /** Kuźnia rzuca na ściany pomarańczowy żar (krycie 0..1, promień w kaflach). */
  zarKuzni: 0.2, zarKuzniPromien: 9,
  /** Ciemność liczona w mniejszej rozdzielczości (×) — szybciej, a krawędzie światła i tak są miękkie. */
  skala: 0.5,
};
