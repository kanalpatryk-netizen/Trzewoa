import { T } from '../../sim/tiles';

/**
 * RYCINA — jak wygląda góra na płycie w grze.
 *
 * Każdy materiał jest kreskowany jak na miedziorycie:
 *  - ton: ile atramentu w kaflu (0 = pusty papier, ok. 0,6 = prawie czarny),
 *  - kąt: kierunek w poprzek kreski w radianach (1,57 = kreska pozioma, 0 = pionowa, ±1,8 najwyżej),
 *  - odstęp: co ile pikseli kolejna kreska (więcej = rzadziej),
 *  - krzyż: jak mocno dochodzi kreska krzyżowa (0..1),
 *  - kropki: ile punktowania (0..1),
 *  - barwa: [r, g, b] światła kreski albo null (sama głębia).
 */
export const TON_MAX = 0.62;

export interface Kreskowanie { tone: number; ang: number; sp: number; cross: number; stipple: number; tint: [number, number, number] | null; }

export const MATERIALY: Record<number, Kreskowanie> = {
  [T.SOIL]:    { tone: 0.22, ang: 0.8, sp: 5.6, cross: 0.4, stipple: 0.5, tint: [222, 178, 118] },
  // środkowa warstwa: neutralna umbra, kreska średnio gęsta na przeciwnym skosie, krzyż w ciemniejszych płatach
  [T.ROCK]:    { tone: 0.22, ang: -0.74, sp: 5.0, cross: 0.17, stipple: 0.08, tint: [210, 178, 136] },
  [T.ORE]:     { tone: 0.27, ang: -0.74, sp: 5.0, cross: 0.2, stipple: 0.3, tint: [196, 154, 118] },   // pod bryłkami (zyly.ts): skała warstwy, ciemniejsza i przyrdzewiała
  [T.CRYSTAL]: { tone: 0.44, ang: -0.55, sp: 7.4, cross: 0.66, stipple: 0.3, tint: [232, 228, 236] },
  // kamień nie do ruszenia (rama, czapa, skorupa): gęsta siatka na przeciwnym skosie — inny rylec niż warstwy
  [T.STONE]:   { tone: 0.26, ang: -0.72, sp: 3.4, cross: 0.06, stipple: 0, tint: [150, 136, 120] },
  [T.FUNGUS]:  { tone: 0.64, ang: 0.20, sp: 4.8, cross: 0.5, stipple: 0.55, tint: [150, 214, 118] },
  [T.BONES]:   { tone: 0.5, ang: 0.90, sp: 5.4, cross: 0.60, stipple: 0.35, tint: [226, 218, 196] },
  [T.SHRINE]:  { tone: 0.66, ang: 1.57, sp: 3.6, cross: 0.44, stipple: 0.20, tint: [230, 198, 140] },
  [T.FORGE]:   { tone: 0.7, ang: 1.57, sp: 3.6, cross: 0.40, stipple: 0.30, tint: [255, 158, 70] },
  [T.NEST]:    { tone: 0.6, ang: 0.35, sp: 4.2, cross: 0.50, stipple: 0.45, tint: [204, 170, 120] },
  [T.WEB]:     { tone: 0.18, ang: 0.79, sp: 3.4, cross: 0.30, stipple: 0.12, tint: [222, 220, 228] },
  [T.CORE]:    { tone: 0.60, ang: 1.10, sp: 3.0, cross: 0.34, stipple: 0.50, tint: [226, 74, 74] },
  [T.GLYPH]:   { tone: 0.56, ang: 0.00, sp: 3.4, cross: 0.36, stipple: 0.55, tint: [246, 214, 130] },
  [T.SKY]:     { tone: 0.07, ang: 1.57, sp: 9.0, cross: 0.95, stipple: 0, tint: [176, 178, 172] },
  // Alpha: warstwy — miękka skała rzadką, ciepłą kreską ugru z punktowaniem; twarda ciemnym łupkiem, gęsto i na krzyż
  [T.MIEKKA]:  { tone: 0.17, ang: 0.8, sp: 6.2, cross: 0.3, stipple: 0.6, tint: [232, 186, 116] },
  [T.TWARDA]:  { tone: 0.27, ang: 1.12, sp: 4.4, cross: 0.12, stipple: 0.04, tint: [176, 158, 138] },
  [T.ZLOTO]:   { tone: 0.25, ang: -0.74, sp: 5.0, cross: 0.2, stipple: 0.1, tint: [204, 176, 130] },   // pod żyłą (zyly.ts): skała warstwy, ciut ciemniejsza
};

/** Kolor masy materiału pod kreską [r, g, b] — skała ciemna, żyła świeci barwą. */
export const MASA: Record<number, [number, number, number]> = {
  [T.SOIL]: [56, 40, 26],
  [T.ORE]: [45, 34, 26],
  [T.CRYSTAL]: [30, 20, 44],
  [T.ROCK]: [51, 41, 31],
  [T.STONE]: [37, 33, 30],
  [T.SHRINE]: [52, 38, 22],
  [T.FORGE]: [84, 34, 12],
  [T.CORE]: [96, 14, 20],
  [T.MIEKKA]: [62, 46, 29],
  [T.TWARDA]: [43, 38, 34],
  [T.ZLOTO]: [47, 38, 28],
};

type RGB = [number, number, number];

/**
 * ŚWIAT RYCINY — wartości całego rysunku: pustka jaśniejsza od skały, skała rytowana masa,
 * nieznane prawie czarne ze szkicem sinopii. Barwy [r, g, b] 0..255, przed suwakiem jasności.
 * Warstwy idą od góry: płytka (miękka), środkowa, głęboka (twarda), a 3 = kamień ramy i czapy.
 */
export const RYCINA_SWIATA = {
  /**
   * Tylna ściana jaskini: przy skale (w cieniu) i na otwartej przestrzeni — płytko, w środku i w głębi.
   * To ona mówi „tu jest przestrzeń”: ciepły, gładki tynk skały, jaśniejszy niż rytowana masa obok.
   */
  pustkaCien: [[94, 75, 54], [86, 74, 61], [82, 72, 62]] as RGB[],
  pustkaOtwarta: [[132, 107, 77], [120, 102, 84], [114, 100, 86]] as RGB[],
  /**
   * Tylna ściana jasnej sali: ciosy na zakładkę — szerokość (kafle), wysokość rzędu (rzędy na kafel), rozrzut jasności
   * między ciosami, przyciemnienie fugi i rozjaśnienie górnej krawędzi ciosu.
   */
  ciosy: { szer: 2.2, wys: 0.85, rozrzut: 0.1, fuga: 0.2, faza: 0.05 },
  /** Posadzka jasnej sali: ciosane płyty ciepłego kamienia (barwa lica przed światłem). */
  posadzka: [118, 98, 76] as RGB,
  /** Nad górą: zmierzch; przy horyzoncie jaśniejszy o `zorza`. Grzbiet: najwyższy garb ziemi nad płaską powierzchnią (kafle). */
  niebo: [46, 44, 46] as RGB,
  zorza: 26,
  grzbiet: 2.4,
  nieboKreska: [120, 112, 104] as RGB,
  /** Plamy tynku na tylnej ścianie (± tyle jasności) i pył w powietrzu. */
  tynk: 12,
  /** Światło (lampki, sala, ogień) na tylnej ścianie i na skale: barwa dodawana przy pełnym świetle. */
  swiatloPustki: [82, 54, 24] as RGB,
  swiatloSkaly: [60, 38, 18] as RGB,

  /** Nieznane: ciemna masa każdej warstwy (płytka, środkowa, głęboka, kamień) — nie czerń, tylko półmrok papieru. */
  nieznaneMasa: [[41, 31, 22], [36, 30, 26], [35, 31, 28], [33, 30, 27]] as RGB[],
  /** Szkic sinopii w nieznanym: granice warstw i brzeg ramy, do tego rzadkie spoiny skały. */
  // stonowana, cicha linia (dawniej jaskrawa i przerywana — czytała się jak linia z rysunku technicznego)
  szkic: [138, 96, 68] as RGB,
  szkicSila: 0.38,
  /** Spoiny szkicu co tyle kafli i ich siła (0..1). */
  szkicSpoinyCo: 2.6, szkicSpoinySila: 0.22,

  /** Granica warstw w poznanej skale: ciemna linia rylca i jasna tuż pod nią (siła 0..1). */
  granicaCiemna: [10, 7, 6] as RGB,
  granicaJasna: [214, 178, 128] as RGB,
  granicaSila: 0.85,

  /**
   * Uwarstwienie skały: pozioma spoina co tyle kafli [odstęp, siła 0..1] — rzadka i słaba, tylko znak, że skała
   * leży warstwami (gęste spoiny razem z poziomą kreską czytały się jak słoje drewna).
   */
  uwarstwienie: {
    [T.SOIL]: [1.1, 0.2],
    [T.MIEKKA]: [2.4, 0.3],
    [T.ROCK]: [3.1, 0.24],
    [T.TWARDA]: [2.0, 0.2],
  } as Record<number, [number, number]>,

  /** Kąt rylca w każdej warstwie (płytka, środkowa, głęboka), w poprzek kreski: 0,8 — kreska „/”, −0,74 — „\”. */
  katWarstw: [0.8, -0.74, 1.12] as [number, number, number],
  /**
   * Płaty skały: kamień pęka na wieloboczne płaszczyzny (komórki Woronoja) — każda ma własny kierunek kreski
   * i trochę inną jasność. Oczko — średnia wielkość płatu (kafle), kąty — odchylenia kreski od kąta warstwy,
   * jasność — ± tyle jasności masy, rysyUdzial — jaka część krawędzi płatów pęka rysą.
   */
  platy: { oczko: 4.5, katy: [-0.62, -0.22, 0.22, 0.62], jasnosc: 0.08, rysyUdzial: 0.55 },
  /** Rysy na styku płatów: przyciemnienie szczeliny (0..1), od jakiego przybliżenia i pół grubości (px × zoom). */
  rysy: { sila: 0.6, odZoom: 7, szer: 0.04 },

  /** Kontur jaskini: atrament rylca; świetlik — jasny brzeg podłogi pod konturem (grubość w kaflach). */
  // ciepła, ciemna sepia zamiast prawie czerni — jaskinie z czarnym konturem wyglądały jak naklejki
  kontur: [26, 18, 12] as RGB,
  swietlik: [238, 194, 130] as RGB,
  swietlikGrubosc: 0.16,
  /** Świetlik bez światła (podłoga w ciemności) i przy pełnym świetle lampki. */
  swietlikBaza: 0.32,

  /** Głęboka warstwa przy krypcie żarzy się czerwienią: od tej głębokości (0..1) do dna. */
  czerwienOd: 0.9,
  czerwienKreski: [176, 96, 66] as RGB,
  /** …i tylko przy pomniku: w bok od krypty gaśnie do zera na tylu szerokościach skorupy. */
  czerwienZasieg: 2.2,
};

/**
 * ŚWIATŁO NA RYCINIE — tam, gdzie mrok wycina światło, rysunek też się rozgrzewa.
 * Promień w kaflach, moc 0..1 (1 = pełne ciepło na tylnej ścianie).
 */
export const SWIATLO_RYCINY = {
  robotnik: { r: 8, moc: 0.5 },
  pobozny: { r: 6, moc: 0.38 },
  rycerz: { r: 5.5, moc: 0.32 },
  siedziba: { r: 9, moc: 0.5 },
  oboz: { r: 6, moc: 0.42 },
  /** Jasna sala: dzień z szybu i świece — cała w świetle, z miękkim brzegiem tylu kafli. */
  sala: { moc: 0.3, brzeg: 3 },
  /** Świece na ołtarzu i dzień z szybu: jaśniejsza plama w środku sali. */
  oltarz: { r: 16, moc: 0.85 },
  /** Gotowe pomieszczenia: kuźnia żarzy się mocno, warsztat jak przy świecy, sypialnia ledwo. */
  pomieszczenia: { kuznia: 0.8, warsztat: 0.5, sypialnia: 0.3 } as Record<string, number>,
  /** O tyle kafli światło pomieszczenia (okrągła plama ze środka) wychodzi poza jego obrys… */
  pomieszczenieZasieg: 5,
  /** …ale w litą skałę wchodzi najwyżej na tyle kafli (gaśnie po drodze) — strop nad pokojem zostaje ciemny. */
  pomieszczenieWSkale: 1.6,
};
