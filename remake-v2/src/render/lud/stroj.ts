import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import type { Rola } from '../../sim/lud';
import { clamp, los, mieszaj, type Rgb } from './matma';

/**
 * Barwy postaci — pigmenty fresku: biel wapienna, ugry, czerwień ziemi, caput mortuum, zieleń
 * ziemi, umbra, czerń kostna, przyćmione złoto. Matowe, ciepłe, przygaszone jak malowidło
 * w krypcie oglądane przy lampce.
 *
 * - robotnik — fossor, kopacz katakumb: krótka tunika z clavi, kilof, gliniana lampka oliwna,
 * - pobożny — duchowny (diakon): długa jasna szata, czerwona stuła z krzyżykami, tonsura,
 * - rycerz — krzyżowiec po bitwie (Remake v2): kolczuga, brudny wapenrok z krwawym krzyżem, podarty ciemny
 *   płaszcz, garnczkowy albo otwarty hełm, wyszczerbiona tarcza z krzyżem — krew, blizny, bandaże.
 * Stałe cechy (karnacja, włosy, broda, barwy szat) losowane z numeru postaci.
 */
export interface Stroj {
  rola: Rola; bunt: boolean;
  /** barwa roli — zabarwia jasną aurę wokół sylwetki */
  obwodka: Rgb;
  skora: Rgb; wlosy: Rgb;
  /** 0 — gładko, 1 — wąsy, 2 — pełna broda, 3 — krótka broda */
  broda: number;
  stary: boolean;
  /** robotnik: tunika, clavi (pasy), pas, owijki */
  tunika: Rgb; clavi: Rgb; pas: Rgb; owijki: Rgb;
  /** pobożny: szata (sticharion), stuła (orarion), haft */
  szata: Rgb; stula: Rgb;
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

const OBWODKA: Record<Rola | 'buntownik', Rgb> = {
  pobozny: [214, 190, 130], robotnik: [196, 140, 80], rycerz: [160, 176, 196], buntownik: [200, 44, 32],
};

/** Karnacje jak na portretach fajumskich: oliwkowe, śniade, blade. */
const SKORY: Rgb[] = [[182, 142, 104], [168, 128, 94], [196, 160, 122], [150, 112, 80], [188, 156, 124], [160, 124, 96]];
const WLOSY: Rgb[] = [[38, 28, 22], [26, 20, 18], [66, 42, 28], [54, 40, 30]];
const TUNIKI: Rgb[] = [[160, 140, 106], [150, 132, 100], [166, 148, 114], [142, 126, 98]];
const CLAVI: Rgb[] = [[108, 38, 28], [88, 40, 36], [76, 58, 40]];
const SZATY: Rgb[] = [[188, 176, 150], [180, 168, 140], [192, 184, 160]];
const STULE: Rgb[] = [[128, 38, 30], [110, 34, 30], [96, 52, 40]];
const SPODNICE: Rgb[] = [[60, 76, 88], [72, 84, 66], [88, 50, 46]];
const CHLAMIDY: Rgb[] = [[132, 42, 32], [118, 36, 30], [144, 58, 36]];
/** Krzyżowiec: płótno wapenroku (brudna kość, popiół), płaszcze (węgiel, umbra, wino tak ciemne, że prawie czarne). */
const WAPENROKI: Rgb[] = [[152, 142, 120], [144, 135, 116], [158, 148, 126], [138, 130, 112]];
const PLASZCZE: Rgb[] = [[40, 35, 34], [34, 31, 34], [46, 34, 30], [44, 28, 28]];
/** Tarcza: czerwone pole z krzyżem z kości albo brudnobiałe pole z krwawym krzyżem. */
const TARCZE: [Rgb, Rgb][] = [[[104, 26, 22], [164, 152, 128]], [[104, 26, 22], [164, 152, 128]], [[146, 136, 114], [120, 22, 20]]];

export function stroj(rola: Rola, c: Creature, sim: Sim): Stroj {
  const l = (n: number) => los(c.id, n);
  const wybierz = <T>(t: T[], n: number): T => t[Math.floor(l(n) * t.length) % t.length];
  const bunt = !!c.buntownik;
  const zatruty = (c.zatrutyDo ?? -1) > sim.tick;
  let skora = wybierz(SKORY, 1);
  if (zatruty) skora = mieszaj(skora, [128, 150, 96], 0.5);
  const stary = rola === 'pobozny' ? l(9) < 0.35 : l(9) < 0.15;
  const tarcza = wybierz(TARCZE, 13);
  return {
    rola, bunt, obwodka: bunt ? OBWODKA.buntownik : OBWODKA[rola],
    skora, wlosy: stary ? [150, 144, 134] : wybierz(WLOSY, 2), stary,
    broda: rola === 'pobozny' ? (stary ? 2 : l(3) < 0.35 ? 3 : 0) : rola === 'rycerz' ? (l(3) < 0.6 ? 3 : 0) : Math.floor(l(3) * 4),
    tunika: wybierz(TUNIKI, 4), clavi: wybierz(CLAVI, 5), pas: [74, 52, 34], owijki: [130, 112, 86],
    szata: wybierz(SZATY, 10), stula: wybierz(STULE, 6),
    zbroja: bunt ? [70, 66, 62] : [134, 116, 80], spodnica: bunt ? [34, 26, 26] : wybierz(SPODNICE, 7),
    chlamida: bunt ? [36, 22, 22] : wybierz(CHLAMIDY, 8), helm: bunt ? [50, 48, 50] : [104, 104, 108],
    kolczuga: bunt ? [54, 52, 54] : [84, 86, 92], wapenrok: bunt ? [46, 40, 38] : wybierz(WAPENROKI, 11),
    krzyz: bunt ? [150, 18, 12] : [122, 22, 20], plaszcz: bunt ? [24, 18, 18] : wybierz(PLASZCZE, 12), krewSucha: [86, 14, 12],
    skorzane: [66, 46, 32], tarcza: bunt ? [30, 26, 26] : tarcza[0], znak: bunt ? [160, 24, 16] : tarcza[1],
    zloto: [184, 148, 78], drewno: [96, 68, 46], zelazo: [92, 92, 94], glina: [156, 92, 58], buty: [62, 44, 32], krew: [116, 20, 16],
    zatruty, okaleczony: !!c.okaleczony,
    szalenstwo: clamp(c.mad ?? 0, 0, 1), strach: clamp(c.fear ?? 0, 0, 1),
  };
}
