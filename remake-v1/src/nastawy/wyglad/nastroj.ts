/**
 * NASTRÓJ INTERFEJSU — drobne, ciche animacje ściany krypty (src/render/nastroj.ts).
 * Wszystko gaśnie przy „ogranicz ruch” i przy wyłączonym oddechu świata.
 */
export const NASTROJ = {
  // ---------------------------------------------------------------- pył w świetle lampki
  /** Ile drobin pyłu unosi się nad ścianą. */
  pylIle: 34,
  /** Jak szybko się wznoszą (część wysokości ekranu na sekundę, najwolniejsza i najszybsza). */
  pylTempo: [0.006, 0.018] as [number, number],
  /** Krycie drobiny w ciemności i w samym świetle lampki. */
  pylKrycie: [0.05, 0.38] as [number, number],

  // ---------------------------------------------------------------- pismo na ścianie
  /** Co tyle ms w tynku ściany pojawia się nowy napis nieznanym pismem (ile naraz). */
  napisOkres: 8000, napisowNaraz: 2,
  /** Wielkość znaku (połowa boku w px) i krycie żaru. */
  napisRozmiar: 5.5, napisKrycie: 0.26,

  // ---------------------------------------------------------------- krążki i liczby
  /** Jak szybko krążek rozjaśnia się pod kursorem (ms do ~2/3 drogi). */
  podswietlenieMs: 140,
  /** Krążek pod kursorem: krycie poświaty i krążącego błysku na obrzeżu. */
  poswiataKrazka: 0.26, blyskKrazka: 0.6,
  /** Wycinek fresku na krążku w spoczynku — przyciemnienie i odbarwienie (0..1). */
  ikonaCien: 0.42, ikonaSzarosc: 0.4,
  /** Zmiana wiary, krwi albo jedzenia: jak długo liczba się żarzy (ms). */
  liczbaZar: 700,
  /** Nowa linijka kroniki pisze się od lewej przez tyle tików świata. */
  kronikaPisanie: 80,
  /** Oko w ramie płyty: jak daleko źrenica podąża za kursorem (część oka). */
  okoPodaza: 0.38,
};
