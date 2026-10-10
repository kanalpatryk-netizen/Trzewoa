/**
 * FRONTYSPIS — góra na ekranie menu, malowana jak na ikonie.
 *
 * Pokazuje to, o co chodzi w grze: lud mieszka w siedzibie wysoko w górze, żywi się
 * grzybem ze spiżarni, w skale śpią gniazda kamiennych rycerzy, a wierni kopią drogę
 * w dół, gdzie przy rdzeniu w skorupie czuwają Strażnicy Snu.
 *
 * Wszystkie położenia są ułamkami prostokąta obrazu: x 0..1 od lewej, y 0..1 od góry.
 * Promienie „rx” liczone od szerokości, „ry” od wysokości obrazu.
 */
export const FRONTYSPIS = {
  // ------------------------------------------------------------------ bryła
  /** Dwa szczyty: położenie (0..1), szerokość i względna wysokość. */
  szczyt1: { x: 0.58, szerokosc: 0.2, wysokosc: 1 },
  szczyt2: { x: 0.3, szerokosc: 0.16, wysokosc: 0.72 },
  /** Jaką część wysokości obrazu zajmuje wyższy szczyt (+ podstawa). */
  wysokoscGory: 0.8, podstawaGory: 0.12,

  // ------------------------------------------------------------ elementy
  /** Siedziba ludu: nisza z lampką i mieszkańcami (ilu). */
  siedziba: { x: 0.55, y: 0.37, rx: 0.085, ry: 0.036, lud: 5 },
  /** Spiżarnia: nisza z bladym, świecącym grzybem (ile grzybów). */
  spizarnia: { x: 0.32, y: 0.47, rx: 0.06, ry: 0.03, grzybow: 5 },
  /** Gniazdo kamiennego rycerza: zamurowana nisza w skale, w niej śpiący rycerz. */
  gniazdo: { x: 0.68, y: 0.6, rx: 0.05, ry: 0.07 },
  /** Strażnicy Snu: dwie postaci zatopione w skale po bokach jaskini rdzenia. */
  straznicy: [{ x: 0.35, y: 0.79 }, { x: 0.65, y: 0.79 }],
  /** Wysokość strażnika (część wysokości obrazu). */
  straznikWys: 0.15,
  /** Droga wiernych: od siedziby zakosami w dół, do jaskini rdzenia (punkty łamanej). */
  droga: [[0.57, 0.4], [0.62, 0.48], [0.5, 0.55], [0.57, 0.63], [0.47, 0.7], [0.5, 0.74]] as [number, number][],
  /** Ilu pielgrzymów schodzi drogą i jak szybko (większe = szybciej). */
  pielgrzymow: 3, tempoPielgrzymow: 0.000025,
  /** Rdzeń: położenie i promień (część krótszego boku obrazu). */
  rdzen: { x: 0.5, y: 0.86, promien: 0.05 },
  /** Kieszeń żaru (magmy) w dole zbocza. */
  magma: { x: 0.22, y: 0.8, rx: 0.08, ry: 0.035 },

  // ------------------------------------------------------------- skorupa
  /** Ile bloków w pierścieniu skorupy. */
  blokow: 18,
  /** Promień zewnętrzny i wewnętrzny pierścienia (× promień rdzenia). */
  skorupaZewn: 2.2, skorupaWewn: 1.55,
  /** Wyryte znaki leżą na tym promieniu (× promień rdzenia). */
  znakiNaPromieniu: 1.87,
  /** Złote perełki nimbu wokół skorupy (× promień rdzenia). */
  wieniec: 2.55,

  // ------------------------------------------------------------ animacja
  /** Poświata rdzenia: zasięg (× promień) i krycie (podstawa + tętno). */
  halo: 7, haloAlfa: 0.45, haloTetno: 0.15,
  /** Poświata żaru: krycie i falowanie. */
  magmaAlfa: 0.12, magmaFalowanie: 0.04,
  /** Krycie postaci (biel wapienna). */
  sylwetki: 0.85,
  /** Rycerz w gnieździe otwiera oczy co tyle ms, na taką część okresu. */
  rycerzOkres: 17000, rycerzOtwarte: 0.14,

  // ------------------------------------------------------------- podpisy
  /** Rozmiar liter odnośników: ekran / dzielnik (min–max). */
  podpisRozmiar: { min: 11, max: 15, dzielnik: 60 },
  /** Treść odnośników a–f. */
  podpisy: {
    a: 'siedziba ludu',
    b: 'spiżarnia',
    c: 'gniazdo rycerza',
    d: 'droga wiernych',
    e: 'Strażnicy Snu',
    f: 'rdzeń — tu cię uwolnią',
  },
};
