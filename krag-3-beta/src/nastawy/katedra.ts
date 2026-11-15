/**
 * KATEDRA NA POWIERZCHNI (Alpha 0.2, wizja użytkownika z 23.10): „na samej górze jest jakaś katedra i z jej górnej
 * szyby pada światło do nas”. Nad szybem ze światłem stoi katedra — w przekroju, jak cała góra pod nią: na zachodzie
 * wieża z iglicą, dalej nawa, na wschodzie skrzyżowanie z rozetą na tylnej ścianie i sygnaturką na dachu. Z rozety
 * pada promień: przez otwór w posadzce (balustrada, dwa kandelabry), szybem do sali i na ołtarz.
 * Rysunek: src/render/katedra.ts (kamień, szkło), src/render/promien.ts (promień). Tylko rysunek — symulacja go nie zna.
 *
 * Odległości w kaflach: `u` w poziomie od środka szybu ze światłem (ujemne — na zachód), `v` w górę od ziemi.
 */
export const KATEDRA = {
  /** Wyłącznik (typ boolean — żeby kompilator nie uznał kodu za martwy). */
  wlaczona: true as boolean,
  /** Posadzka na cokole: tyle nad ziemią. */
  posadzka: 0.4,
  /** Wieża zachodnia (od–do), wysokość korpusu i iglicy nad nim. */
  wieza: { od: -26, do: -20, wys: 14, iglica: 5.6 },
  /**
   * Nawa: od wieży do skrzyżowania, przęsła co `przeslo`. Wysokości: arkada (głowice, wierzchołek łuku), tryforium,
   * okna górne (parapet, wierzchołek), sklepienie (wierzchołek), dach (okap, kalenica).
   */
  nawa: { od: -20, do: -4, przeslo: 4, filar: 0.7, arkada: [4.2, 6.3], tryforium: [6.6, 7.4], okna: [7.7, 10.3], sklepienie: 11 },
  dach: { okap: 11.3, kalenica: 13.2 },
  /** Skrzyżowanie: środek nad szybem; łuk na tylnej ścianie (nasada, wierzchołek), wschodnia ściana i przypora. */
  skrzyzowanie: { od: -4, do: 4, luk: [6.8, 10.8], sciana: 0.9, przypora: 0.6 },
  /** Rozeta na tylnej ścianie skrzyżowania — „górna szyba”: środek (v) i promień obramienia. */
  rozeta: { v: 8.2, r: 2.25 },
  /** Sygnaturka na kalenicy nad skrzyżowaniem: latarnia i iglica (wysokości nad kalenicą). */
  sygnaturka: { latarnia: 1.4, iglica: 3.4 },
  /** Balustrada wokół otworu w posadzce (szerokość boku poza otworem, wysokość) i kandelabry po obu stronach. */
  balustrada: { bok: 0.75, wys: 0.95 },
  kandelabry: { u: 3, wys: 2.3 },
};

/**
 * PROMIEŃ Z ROZETY (src/render/promien.ts) — miękkie światło zamiast płaskiej smugi: brzegi rozmyte coraz mocniej
 * z odległością od otworu, przez który przeszło (rozeta, potem szyb), w środku smugi od maswerku rozety (z barwą
 * witraży tuż pod nią), przez całą długość pył i pasma mgły, które powoli spływają w dół; na posadzce sali — plama.
 */
export const PROMIEN = {
  /** Bufor promienia: pikseli na kafel (mniej — miękciej i taniej; i tak jest rozmyty). */
  rozdzielczosc: 6,
  /** Jasność (0..1, światło dodawane do obrazu): pod rozetą, na posadzce katedry, u wylotu szybu, nad ołtarzem. */
  jasnosc: [0.34, 0.3, 0.27, 0.17] as [number, number, number, number],
  /** Pół szerokości promienia w katedrze (pod rozetą, przy posadzce) i w sali (u wylotu szybu — ten ma szyb, przy posadzce). */
  szerokosc: { rozeta: 1.95, posadzka: 1.8, sala: 2.6 },
  /** Rozmycie brzegu (kafle): pod rozetą, przy posadzce katedry, u wylotu szybu, przy posadzce sali. */
  rozmycie: [0.3, 0.55, 0.12, 1.15] as [number, number, number, number],
  /** Smugi od maswerku: ile, jak wyraźne pod rozetą i nad ołtarzem, jak mocno migoczą. */
  smugi: { ile: 7, kontrastGora: 0.6, kontrastDol: 0.12, migot: 0.16 },
  /** Mgła w promieniu: siła (0..1), jak szybko spływa (kafle na sekundę). */
  mgla: { sila: 0.34, splyw: 0.35 },
  /** Pył: ile drobin w całym promieniu i jak szybko opadają (kafle na sekundę). */
  pyl: { ile: 64, opad: 0.28 },
};
