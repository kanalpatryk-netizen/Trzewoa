/**
 * Alpha, etap 5 — WIELKI POMNIK DEMONA zamiast rdzenia (sim/pomnik.ts, rysunek: render/pomnik.ts).
 * Decyzje użytkownika (18.10): pomnik przedstawia demona — olbrzymi posąg zakuty w kamień, w którym śpi boss;
 * modlitwa pobożnych kruszy go w 3 widocznych stanach; gdy pęknie do końca, z gruzów wychodzi demon (boss),
 * a gra kończy się wygraną, gdy rycerz go pokona — ze stosowną animacją przy ostatnim uderzeniu.
 * Tiki: 120 = sekunda, 7200 = minuta.
 */
export const POMNIK = {
  /** Wyłącznik (typ boolean — żeby kompilator nie uznał starego kodu skorupy za martwy). */
  wlaczony: true as boolean,
  /** Tyle pełnych odmodleń (rytuał — nastawy/rytual.ts) kruszy pomnik do końca; jedno to 20%. */
  pekniec: 5,
  /** Widoczne stany pękania: od tylu procent stan 1 (rysy), 2 (odpadają kawałki) i 3 (światło z wnętrza). */
  stany: [20, 45, 70],

  // ---------------------------------------------------------------- przebieg (tiki)
  /** Pomnik rozpada się w gruz, a potem z gruzów wstaje demon — dopiero wtedy rusza walka. */
  rozpad: 300, wyjscie: 420,
  /** Ostatnie uderzenie: demon kona tyle tików (ekran zwalnia czas na pierwsze `zwolnienie` z nich, do `zwolnienieTempo`). */
  konanie: 420, zwolnienie: 150, zwolnienieTempo: 0.25,

  // ---------------------------------------------------------------- wygląd (kafle)
  /** Wysokość posągu (od dna komory w górę) i szerokość u podstawy. */
  wysokosc: 12, szerokosc: 13,
};

/** Kto śpi w pomniku — boss ostatniej fali (sim/boss.ts: demon). Liczby walki jak Śniącego Kamienia. */
export const DEMON = {
  nazwa: 'Demon z pomnika',
  hp: 500,
  /** cios i jego rytm (tiki), zasięg ciosu (kafle) */
  sila: 10, ciosCo: 160, zasieg: 2.2,
  /** prędkość (kafle na tik) */
  szybkosc: 0.014,
  /** wielkość na mapie (× zwykła postać) — wyższy od Śniącego Kamienia: to on spał w pomniku */
  rozmiar: 3.2,
};
