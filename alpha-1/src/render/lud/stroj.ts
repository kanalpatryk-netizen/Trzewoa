import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import type { Rola } from '../../sim/lud';
import { clamp, los, mieszaj, type Rgb } from './matma';

/**
 * Barwy postaci — pigmenty fresku: biel wapienna, ugry, czerwień ziemi, caput mortuum, zieleń
 * ziemi, umbra, czerń kostna, przyćmione złoto. Matowe, ciepłe, przygaszone jak malowidło
 * w krypcie oglądane przy lampce.
 *
 * - robotnik — kopacz z trzewi góry (Remake v2): kaptur z pelerynką, szorstka tunika, skórzany fartuch
 *   z tyłu, owijki, kilof i gliniana lampka oliwna,
 * - pobożny — diakon z krypty (Remake v2): zżółkła, ubłocona alba do ziemi, karmazynowa stuła, sznur pokutny
 *   z różańcem, tonsura, krzyż procesyjny z ciemnego brązu,
 * - rycerz — krzyżowiec po bitwie (Remake v2): kolczuga, brudny wapenrok z krwawym krzyżem, podarty ciemny
 *   płaszcz, garnczkowy albo otwarty hełm, wyszczerbiona tarcza z krzyżem — krew, blizny, bandaże.
 * Stałe cechy (karnacja, włosy, broda, barwy szat) losowane z numeru postaci.
 * Półtony szat są o ton jaśniejsze niż w pierwszym malowaniu — na jaśniejszej rycinie świata ciemnoszare
 * postacie zlewały się z cieniem skały; czernie (płaszcz rycerza, kapa) zostają prawie czarne.
 */
export interface Stroj {
  /** Alpha: szał krwi z ołtarza — rycerz żarzy się czerwienią (wizjer, krzyż, smuga miecza, tarcza) */
  rola: Rola; szal: boolean;
  /** barwa roli — zabarwia jasną aurę wokół sylwetki */
  obwodka: Rgb;
  skora: Rgb; wlosy: Rgb;
  /** 0 — gładko, 1 — wąsy, 2 — pełna broda, 3 — krótka broda */
  broda: number;
  stary: boolean;
  /** robotnik: tunika, clavi (pasy), pas, owijki */
  tunika: Rgb; clavi: Rgb; pas: Rgb; owijki: Rgb;
  /** Remake v2 — kopacz: kaptur z pelerynką (naciągnięty albo zsunięty na kark, czasem z długim ogonem) i nogawice */
  kaptur: Rgb; nogawice: Rgb; wKapturze: boolean; ogon: boolean;
  /** pobożny: szata (alba), stuła (orarion); Remake v2 — czarna kapa z kapturem (nosi ją część pobożnych) */
  szata: Rgb; stula: Rgb; kapa: Rgb; wKapie: boolean;
  /** rycerz: zbroja łuskowa, spódnica tuniki, chlamida, hełm, skórzane pasy, tarcza */
  zbroja: Rgb; spodnica: Rgb; chlamida: Rgb; helm: Rgb; skorzane: Rgb; tarcza: Rgb; znak: Rgb;
  /** Remake v2 — krzyżowiec: kolczuga, wapenrok (płócienna narzuta), krzyż, płaszcz, zaschnięta krew */
  kolczuga: Rgb; wapenrok: Rgb; krzyz: Rgb; plaszcz: Rgb; krewSucha: Rgb;
  /** wspólne */
  zloto: Rgb; drewno: Rgb; zelazo: Rgb; glina: Rgb; buty: Rgb; krew: Rgb;
  /** stany widoczne na ciele */
  zatruty: boolean; okaleczony: boolean;
  /** 0..1 — szaleństwo z głębokości (puste oczy, szarpnięcia) i strach (drżenie) */
  szalenstwo: number; strach: number;
}

const OBWODKA: Record<Rola | 'szal', Rgb> = {
  pobozny: [214, 190, 130], robotnik: [196, 140, 80], rycerz: [160, 176, 196], szal: [200, 44, 32],
};

/** Karnacje jak na portretach fajumskich: oliwkowe, śniade, blade. */
const SKORY: Rgb[] = [[182, 142, 104], [168, 128, 94], [196, 160, 122], [150, 112, 80], [188, 156, 124], [160, 124, 96]];
const WLOSY: Rgb[] = [[38, 28, 22], [26, 20, 18], [66, 42, 28], [54, 40, 30]];
/** Kopacz (Remake v2): szorstka wełna w barwach ziemi — ugier, szarobrązowy, umbra. */
const TUNIKI: Rgb[] = [[144, 116, 80], [132, 110, 82], [150, 122, 86], [126, 106, 80]];
const KAPTURY: Rgb[] = [[98, 76, 56], [88, 79, 70], [114, 70, 52], [92, 89, 74], [106, 88, 62]];
const NOGAWICE: Rgb[] = [[68, 59, 52], [60, 55, 50], [72, 61, 48]];
const CLAVI: Rgb[] = [[108, 38, 28], [88, 40, 36], [76, 58, 40]];
/** Pobożny (Remake v2): len alby zżółkły jak kość albo szary od sadzy, stuła z ciemnego karmazynu. */
const SZATY: Rgb[] = [[178, 166, 140], [170, 160, 138], [184, 172, 148], [166, 160, 146]];
const STULE: Rgb[] = [[116, 30, 28], [100, 26, 30], [92, 38, 34]];
const KAPY: Rgb[] = [[52, 45, 43], [46, 42, 46], [56, 45, 38]];
const SPODNICE: Rgb[] = [[60, 76, 88], [72, 84, 66], [88, 50, 46]];
const CHLAMIDY: Rgb[] = [[132, 42, 32], [118, 36, 30], [144, 58, 36]];
/** Krzyżowiec: płótno wapenroku (brudna kość, popiół), płaszcze (węgiel, umbra, wino tak ciemne, że prawie czarne). */
const WAPENROKI: Rgb[] = [[152, 142, 120], [144, 135, 116], [158, 148, 126], [138, 130, 112]];
const PLASZCZE: Rgb[] = [[50, 44, 42], [44, 40, 43], [56, 42, 37], [54, 35, 34]];
/** Tarcza: czerwone pole z krzyżem z kości albo brudnobiałe pole z krwawym krzyżem. */
const TARCZE: [Rgb, Rgb][] = [[[104, 26, 22], [164, 152, 128]], [[104, 26, 22], [164, 152, 128]], [[146, 136, 114], [120, 22, 20]]];

export function stroj(rola: Rola, c: Creature, sim: Sim): Stroj {
  const l = (n: number) => los(c.id, n);
  const wybierz = <T>(t: T[], n: number): T => t[Math.floor(l(n) * t.length) % t.length];
  const szal = (c.szalDo ?? -1) > sim.tick;
  const zatruty = (c.zatrutyDo ?? -1) > sim.tick;
  let skora = wybierz(SKORY, 1);
  if (zatruty) skora = mieszaj(skora, [128, 150, 96], 0.5);
  const stary = rola === 'pobozny' ? l(9) < 0.35 : l(9) < 0.15;
  const tarcza = wybierz(TARCZE, 13);
  return {
    rola, szal, obwodka: szal ? OBWODKA.szal : OBWODKA[rola],
    skora, wlosy: stary ? [150, 144, 134] : wybierz(WLOSY, 2), stary,
    broda: rola === 'pobozny' ? (stary ? 2 : l(3) < 0.35 ? 3 : 0) : rola === 'rycerz' ? (l(3) < 0.6 ? 3 : 0) : Math.floor(l(3) * 4),
    tunika: wybierz(TUNIKI, 4), clavi: wybierz(CLAVI, 5), pas: [74, 52, 34], owijki: [124, 108, 86],
    kaptur: wybierz(KAPTURY, 14), nogawice: wybierz(NOGAWICE, 15), wKapturze: l(16) < 0.72, ogon: l(17) < 0.6,
    szata: wybierz(SZATY, 10), stula: wybierz(STULE, 6), kapa: wybierz(KAPY, 18), wKapie: l(19) < 0.55,
    zbroja: [134, 116, 80], spodnica: wybierz(SPODNICE, 7),
    chlamida: wybierz(CHLAMIDY, 8), helm: [112, 112, 116],
    kolczuga: [92, 94, 100], wapenrok: wybierz(WAPENROKI, 11),
    krzyz: szal ? [150, 18, 12] : [122, 22, 20], plaszcz: wybierz(PLASZCZE, 12), krewSucha: [86, 14, 12],
    skorzane: [66, 46, 32], tarcza: tarcza[0], znak: szal ? [160, 24, 16] : tarcza[1],
    zloto: [184, 148, 78], drewno: [96, 68, 46], zelazo: [92, 92, 94], glina: [156, 92, 58], buty: [70, 50, 37], krew: [116, 20, 16],
    zatruty, okaleczony: !!c.okaleczony,
    szalenstwo: clamp(c.mad ?? 0, 0, 1), strach: clamp(c.fear ?? 0, 0, 1),
  };
}
