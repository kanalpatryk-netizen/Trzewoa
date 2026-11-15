/**
 * RDZEŃ NA PŁYCIE — jak wygląda cel gry w samej grze.
 *
 * „z” to przybliżenie kamery (ile pikseli ma jeden kafel). Wymiary podane jako
 * „× z” rosną z przybliżeniem; „min” pilnuje, by rdzeń był widoczny z daleka.
 */
export const RDZEN_WYGLAD = {
  /** Tętno: długość jednego cyklu „bum-bum, pauza” (ms). */
  tetnoMs: 1600,
  /** Pierwsze i drugie uderzenie: położenie w cyklu (0..1) i siła drugiego. */
  uderzenie1: 0.08, uderzenie2: 0.26, sila2: 0.7,

  /** Skorupa: kafle w takim promieniu od rdzenia dostają ciosane bloki. */
  skorupaZasieg: 12,
  /** Kolor bloku, faktura ciosu i jasne obrzeże. */
  blok: 'rgba(34,26,24,0.72)', blokFaktura: 'rgba(150,120,96,0.22)', blokObrzeze: 'rgba(214,176,128,0.55)',
  /**
   * Mur skorupy: ciosy na zakładkę (blok = `ciosDl` kafli, co drugi rząd przesunięty o pół), barwa kamienia [r, g, b]
   * i jej rozrzut między blokami, fuga, jasna faza u góry ciosu i ciemna u dołu (od jakiego przybliżenia).
   */
  ciosDl: 2, mur: [74, 62, 54] as [number, number, number], murRozrzut: 0.14,
  fuga: 'rgba(16,10,8,0.85)', faza: 'rgba(232,204,164,0.22)', fazaCien: 'rgba(10,6,4,0.35)', fazaOdZoom: 8,
  /** Wnętrze komory pomnika: ciemna tylna ściana z wielkich ciosów (szerokość ciosu i wysokość rzędu w kaflach), ledwie widocznych. */
  scianaKomory: [40, 32, 29] as [number, number, number], fugaKomory: 'rgba(8,4,4,0.3)', ciosSciany: 3.4, rzadSciany: 1.6,
  /**
   * Pierścień klińców wokół komory: długość klińca wzdłuż obrysu i jego głębokość (kafle), głębokość płyt posadzki,
   * co który kliniec ma wyryty znak (jeden fryz zamiast pieczątek na każdej cegle).
   */
  klin: 1.35, klinGlebia: 1.7, posadzkaGlebia: 0.9, znakCo: 4,
  /** Wyryte znaki: od jakiego przybliżenia i jakim kolorem. */
  znakiOdZoom: 7, znak: 'rgba(226,160,110,0.45)',

  /** Latarnia (szeroka poświata): promień = max(min, z × mnożnik). */
  latarnia: { min: 44, naZoom: 11 },
  /** Moc poświaty: zamknięty / otwarty rdzeń. */
  mocZamkniety: 0.42, mocOtwarty: 0.6,

  /** Promienie: ile i jak jasne (podstawa + tętno). */
  promieni: 12, promienAlfa: 0.12, promienTetno: 0.18,

  /** Serce: promień = max(min, z × mnożnik), puchnie z tętnem o tyle. */
  serce: { min: 13, naZoom: 3 }, puchniecie: 0.06,
  /** Barwy serca: jasny środek, żar, ciemny brzeg (zamknięty / otwarty). */
  serceJasne: '#ffd2a6', serceJasneOtwarte: '#fff0c8',
  serceZar: '#e2553c', serceZarOtwarte: '#f2a04a',
  serceCiemne: '#7a1618', serceBrzeg: '#2a0808',

  /** Wieniec pęknięć: promień = max(serce × to, z × `wieniecNaZoom`). */
  wieniec: 1.9, wieniecNaZoom: 6.2,
  /** Ogniwo zapalone (pęknięte) i zgaszone. */
  ogniwoZapalone: '255,208,130', ogniwoZgaszone: 'rgba(214,190,160,0.28)',
  /** Znaki na wieńcu: ile i od jakiego promienia wieńca w ogóle się pojawiają. */
  znakowWienca: 12, znakiWiencaOd: 30,

  /** Podpis pod rdzeniem — od jakiego przybliżenia. */
  podpisOdZoom: 4,
  podpisZamkniety: 'twój rdzeń — tu cię uwolnią',
  /** {proc} podmieniane na procent skruszonej skorupy. */
  podpisPeka: 'skorupa pęka: {proc}%',
  podpisOtwarty: 'rdzeń otwarty — wierni schodzą',
};
