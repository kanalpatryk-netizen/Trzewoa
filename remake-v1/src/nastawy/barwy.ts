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

/**
 * Pigmenty fresku — interfejs malowany jak ściana krypty oglądana przy lampce:
 * ciemny tynk, ramy z czerwieni ziemi i ugru, kontury sinopią, biel wapienna na krawędziach.
 * Faktura tynku pochodzi ze zdjęcia fresku z Faras (src/grafiki/tekstury).
 */
export const FRESK = {
  /** Ściana: barwa przed nałożeniem faktury (faktura przyciemnia ją o ok. 1/3). */
  sciana: '#5a4130',
  /** Ciemność w kątach ściany (winieta) i jej krycie. */
  mrok: '12,7,4', mrokAlfa: 0.78,
  /** Pasy ramy: czerwień ziemi, ugier, biel wapienna; kontur sinopią. */
  czerwien: '#8e3a22', ugier: '#a8783a', biel: '#e3d6b6', sinopia: '#5c1f12',
  /** Tablice: ciemny tynk (tekst jasny) i jasny tynk (tekst sinopią). */
  tablicaCiemna: '#4a3527', tablicaJasna: '#e8dcc0',
  /** Krążki przycisków i rytów. */
  krazek: '#c4b08a', krazekWlaczony: '#d9b56a',
  /** Tekst: biel wapienna, przygaszona biel, czerwień napisów, złoto. */
  tekst: '#e6d9bb', tekstCichy: '#a8977a', napisCzerwony: '#cf5a3a', zloto: '#d0a456',
  /** Pigmenty wstęgi ludu i drobnych znaków. */
  lapis: '#4d6676', zielen: '#7e8f5e', cynober: '#b8452a',
  /** Ton, którym mnoży się rycina świata — biel kreski przechodzi w ugier. */
  tonRyciny: '#ecc495',
};
