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
  /** Ściana: barwa przed nałożeniem faktury (faktura przyciemnia ją o ok. 1/3). Prawie czarny, wilgotny tynk. */
  sciana: '#3a2b23',
  /** Ciemność w kątach ściany (winieta) i jej krycie. */
  mrok: '5,3,2', mrokAlfa: 0.9,
  /** Pasy ramy: zaschnięta krew, przygasłe złoto, przybrudzona biel; kontur prawie czarną sinopią. */
  czerwien: '#5a2116', ugier: '#76582f', biel: '#b5a688', sinopia: '#2a0d07',
  /** Tablice: ciemny tynk (tekst jasny) i jasny tynk (tekst sinopią). */
  tablicaCiemna: '#2b1f19', tablicaJasna: '#d6c8aa',
  /** Krążki przycisków i rytów: kamień w cieniu; wybrany — stare złoto. */
  krazek: '#6c5e4d', krazekWlaczony: '#a3864e',
  /** Tekst: biel wapienna, przygaszona biel, czerwień napisów, złoto. */
  tekst: '#d4c6a6', tekstCichy: '#8b7b63', napisCzerwony: '#c0533a', zloto: '#c49a50',
  /** Pigmenty wstęgi ludu i drobnych znaków. */
  lapis: '#3d5463', zielen: '#68774e', cynober: '#9c3b24',
  /** Ton, którym mnoży się rycina świata — biel kreski przechodzi w ugier. */
  tonRyciny: '#ecc495',
  /** Żar nieznanego pisma (ramy, ściana) — [r, g, b]. */
  zar: [214, 110, 70] as [number, number, number],
};
