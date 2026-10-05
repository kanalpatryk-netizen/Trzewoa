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
 * - rycerz — święty wojownik: zbroja łuskowa, czerwona chlamida, stożkowy hełm, tarcza migdałowa.
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

export function stroj(rola: Rola, c: Creature, sim: Sim): Stroj {
  const l = (n: number) => los(c.id, n);
  const wybierz = <T>(t: T[], n: number): T => t[Math.floor(l(n) * t.length) % t.length];
  const bunt = !!c.buntownik;
  const zatruty = (c.zatrutyDo ?? -1) > sim.tick;
  let skora = wybierz(SKORY, 1);
  if (zatruty) skora = mieszaj(skora, [128, 150, 96], 0.5);
  const stary = rola === 'pobozny' ? l(9) < 0.35 : l(9) < 0.15;
  return {
    rola, bunt, obwodka: bunt ? OBWODKA.buntownik : OBWODKA[rola],
    skora, wlosy: stary ? [150, 144, 134] : wybierz(WLOSY, 2), stary,
    broda: rola === 'pobozny' ? (stary ? 2 : l(3) < 0.35 ? 3 : 0) : rola === 'rycerz' ? (l(3) < 0.6 ? 3 : 0) : Math.floor(l(3) * 4),
    tunika: wybierz(TUNIKI, 4), clavi: wybierz(CLAVI, 5), pas: [74, 52, 34], owijki: [130, 112, 86],
    szata: wybierz(SZATY, 10), stula: wybierz(STULE, 6),
    zbroja: bunt ? [70, 66, 62] : [134, 116, 80], spodnica: bunt ? [34, 26, 26] : wybierz(SPODNICE, 7),
    chlamida: bunt ? [36, 22, 22] : wybierz(CHLAMIDY, 8), helm: bunt ? [62, 60, 60] : [112, 110, 104],
    skorzane: [92, 62, 40], tarcza: bunt ? [30, 22, 22] : [118, 44, 32], znak: bunt ? [170, 30, 24] : [196, 160, 88],
    zloto: [184, 148, 78], drewno: [96, 68, 46], zelazo: [92, 92, 94], glina: [156, 92, 58], buty: [62, 44, 32], krew: [116, 20, 16],
    zatruty, okaleczony: !!c.okaleczony,
    szalenstwo: clamp(c.mad ?? 0, 0, 1), strach: clamp(c.fear ?? 0, 0, 1),
  };
}
