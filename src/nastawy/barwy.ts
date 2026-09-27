/**
 * BARWY — paleta całej gry. Ciemność jest ciepła, kolor pojawia się wyłącznie jako światło.
 * Wszystko, co rysuje interfejs, bierze barwy stąd — żeby nic nie świeciło kolorem,
 * którego nie ma w świecie. Zapis: '#rrggbb'.
 */
export const BARWA = {
  /** Tło: prawie czarna sadza i jej jaśniejsza odmiana. */
  sadza: '#0b0807',
  sadzaJasna: '#141010',
  /** Papier tablic atlasu i jego cień. */
  papier: '#ddd6c4',
  papierCien: '#c9c2ae',
  /** Atrament: zwykły tekst, wyróżniony tekst, szeptany tekst. */
  atrament: '#cfc2a6',
  atramentMocny: '#efe3c6',
  atramentCichy: '#a39a8b',
  /** Krew (zasób i zagrożenie). */
  krew: '#8a1a16',
  krewJasna: '#c2503c',
  /** Żar: akcent, zaznaczenie, złoto rytów. */
  zar: '#ff8c32',
  zarBlady: '#e0a860',
  /** Biolumina: grzybnia i życie. */
  biolumina: '#7ab060',
  /** Otchłań: blady, zimny zasób. */
  otchlan: '#e8e6ee',
};

/** Barwa atramentu na płycie zmienia się z głębokością: kość na górze, czerwień na dnie. */
export const ATRAMENT_GLEBI = {
  /** Kolor na powierzchni (r, g, b). */
  gora: [226, 214, 196],
  /** O ile każdy kanał spada do dna. */
  spadek: [96, 176, 178],
  /** Dodatkowe przyciemnienie na dnie (0..1). */
  przyciemnienie: 0.2,
};
