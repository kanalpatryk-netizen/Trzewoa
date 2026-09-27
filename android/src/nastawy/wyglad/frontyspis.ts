/**
 * FRONTYSPIS — przekrój góry na ekranie menu.
 *
 * Wszystkie położenia są ułamkami prostokąta ryciny: x 0..1 od lewej, y 0..1 od góry.
 * Promienie komór „rx” liczone od szerokości, „ry” od wysokości ryciny.
 * Kolory w zapisie 'rgba(r,g,b,krycie)' albo '#rrggbb'.
 */
export const FRONTYSPIS = {
  // ------------------------------------------------------------------ bryła
  /** Dwa szczyty: położenie (0..1), szerokość i względna wysokość. */
  szczyt1: { x: 0.58, szerokosc: 0.2, wysokosc: 1 },
  szczyt2: { x: 0.3, szerokosc: 0.16, wysokosc: 0.72 },
  /** Jaką część wysokości ryciny zajmuje wyższy szczyt (+ podstawa). */
  wysokoscGory: 0.8, podstawaGory: 0.12,
  /** Poszarpanie konturu (część wysokości). */
  poszarpanie: 0.02,
  /** Kolor wnętrza bryły. */
  kolorBryly: '#16100d',
  /** Kontur bryły: grubość i krycie. */
  konturGrubosc: 1.6, konturAlfa: 0.85,

  /** Kreskowanie gęstnieje ku dołowi: pasy [od, do, odstęp kresek px, kąt, krycie]. */
  kreskowanie: [
    [0, 0.5, 6, 0.7, 0.16],
    [0.45, 0.75, 4.5, 0.75, 0.2],
    [0.7, 1, 3.4, 0.8, 0.24],
  ] as [number, number, number, number, number][],
  /** Delikatna kreska krzyżowa przez całą bryłę: kąt, odstęp, krycie. */
  kreskaKrzyzowa: { kat: -0.9, odstep: 9, alfa: 0.06 },
  /** Warstwy skał: ile linii, od której wysokości, co ile i jak widoczne. */
  warstwy: { ile: 7, od: 0.3, co: 0.095, alfa: 0.22 },
  /** Żyły rudy: ile złotych kresek i ich kolor. */
  zylyRudy: { ile: 40, kolor: 'rgba(214,170,96,0.55)' },

  // ------------------------------------------------------------ elementy
  /** Komory z gniazdami: położenie, promienie i ilu mieszkańców w środku. */
  komory: [
    { x: 0.3, y: 0.42, rx: 0.07, ry: 0.035, lud: 4 },
    { x: 0.55, y: 0.36, rx: 0.06, ry: 0.03, lud: 3 },
    { x: 0.68, y: 0.52, rx: 0.08, ry: 0.035, lud: 5 },
    { x: 0.2, y: 0.62, rx: 0.06, ry: 0.03, lud: 2 },
    { x: 0.46, y: 0.62, rx: 0.05, ry: 0.028, lud: 3 },
  ],
  /** Rdzeń: położenie i promień (część krótszego boku ryciny). */
  rdzen: { x: 0.5, y: 0.86, promien: 0.05 },
  /** Kieszeń magmy i jezioro. */
  magma: { x: 0.25, y: 0.8, rx: 0.09, ry: 0.04, wnetrze: 'rgba(70,20,12,0.95)', kreska: 'rgba(230,120,60,0.45)' },
  woda: { x: 0.76, y: 0.68, rx: 0.07, ry: 0.025, wnetrze: 'rgba(18,34,46,0.95)', kreska: 'rgba(120,170,200,0.55)' },
  /** Korytarze: obrzeże i wnętrze (kolor, grubość). */
  korytarzObrzeze: 'rgba(210,190,160,0.4)', korytarzObrzezeGrubosc: 7,
  korytarzWnetrze: '#0c0907', korytarzWnetrzeGrubosc: 5,
  /** Komory: wnętrze, obrys i podłoga. */
  komoraWnetrze: '#0c0907', komoraObrys: 'rgba(214,190,160,0.55)', komoraPodloga: 'rgba(214,190,160,0.3)',

  // ------------------------------------------------------------- skorupa
  /** Ile bloków w pierścieniu skorupy. */
  blokow: 18,
  /** Promień zewnętrzny i wewnętrzny pierścienia (× promień rdzenia). */
  skorupaZewn: 2.2, skorupaWewn: 1.55,
  /** Wyryte znaki leżą na tym promieniu (× promień rdzenia). */
  znakiNaPromieniu: 1.87,
  /** Kolory bloku: wypełnienie, obrys, wyryty znak. */
  blokKolor: '#2c221d', blokObrys: 'rgba(224,184,132,0.6)', blokZnak: 'rgba(236,170,110,0.55)',
  /** Wnętrze komory rdzenia. */
  komoraRdzenia: '#0b0706',
  /** Przerywany wieniec wokół skorupy (× promień rdzenia). */
  wieniec: 2.55,

  // ------------------------------------------------------------ animacja
  /** Poświata rdzenia: zasięg (× promień) i krycie (podstawa + tętno). */
  halo: 7, haloAlfa: 0.45, haloTetno: 0.15,
  /** Poświata magmy: krycie i falowanie. */
  magmaAlfa: 0.12, magmaFalowanie: 0.04,
  /** Tempo wędrowców na korytarzach (większe = szybciej). */
  tempoWedrowcow: 0.00018,
  /** Kolor sylwetek. */
  sylwetki: 0.85,

  // ------------------------------------------------------------- podpisy
  /** Rozmiar liter odnośników: ekran / dzielnik (min–max). */
  podpisRozmiar: { min: 11, max: 15, dzielnik: 60 },
  /** Treść odnośników a–f. */
  podpisy: {
    a: 'gniazdo',
    b: 'kuźnia',
    c: 'jezioro',
    d: 'żar',
    e: 'skorupa',
    f: 'rdzeń — tu cię uwolnią',
  },
};
