import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import type { Rola } from '../../sim/lud';
import { los, mieszaj, type Rgb } from './matma';

/** Barwy postaci. Stałe cechy (skóra, włosy, broda, koszula) losowane z numeru postaci. */
export interface Stroj {
  rola: Rola; bunt: boolean;
  /** jasna obwódka sylwetki — barwa roli (złoto, ochra, stal; zdrajca — czerwień) */
  obwodka: string;
  skora: Rgb; wlosy: Rgb;
  /** 0 — gładko ogolony, 1 — wąsy, 2 — pełna broda, 3 — zarost */
  broda: number;
  stary: boolean;
  // robotnik
  koszula: Rgb; kamizelka: Rgb; spodnie: Rgb; buty: Rgb; czapka: Rgb; chusta: Rgb; latka: boolean;
  // pobożny
  szata: Rgb; szkaplerz: Rgb; lamowka: Rgb; sznur: Rgb;
  // rycerz
  stal: Rgb; tunika: Rgb; krzyz: Rgb; plaszcz: Rgb; podszewka: Rgb; pioro: Rgb; oko: string;
  // wspólne
  zloto: Rgb; drewno: Rgb; skorzany: Rgb;
  /** stany widoczne na ciele */
  zatruty: boolean; okaleczony: boolean;
}

const OBWODKA = {
  pobozny: 'rgba(250,230,170,0.96)', robotnik: 'rgba(232,170,96,0.96)',
  rycerz: 'rgba(170,198,240,0.97)', buntownik: 'rgba(236,64,50,0.98)',
} as const;

const SKORY: Rgb[] = [[226, 178, 138], [212, 160, 118], [196, 140, 100], [176, 120, 84], [150, 100, 70], [232, 192, 156]];
const WLOSY: Rgb[] = [[58, 40, 28], [34, 26, 22], [112, 62, 34], [150, 112, 66], [96, 80, 66], [176, 168, 156]];
const KOSZULE: Rgb[] = [[214, 196, 160], [204, 150, 78], [184, 104, 64], [128, 140, 150], [150, 150, 96]];
const KAMIZELKI: Rgb[] = [[112, 72, 44], [92, 62, 42], [128, 90, 52]];
const SPODNIE: Rgb[] = [[110, 88, 66], [86, 80, 72], [92, 96, 70]];
const CHUSTY: Rgb[] = [[178, 48, 40], [52, 92, 140], [196, 150, 60], [70, 110, 70]];
const SZATY: Rgb[] = [[230, 222, 202], [222, 212, 188], [214, 208, 196]];

export function stroj(rola: Rola, c: Creature, sim: Sim): Stroj {
  const l = (n: number) => los(c.id, n);
  const wybierz = <T>(t: T[], n: number): T => t[Math.floor(l(n) * t.length) % t.length];
  const bunt = !!c.buntownik;
  const zatruty = (c.zatrutyDo ?? -1) > sim.tick;
  let skora = wybierz(SKORY, 1);
  if (zatruty) skora = mieszaj(skora, [150, 176, 104], 0.45);
  const stary = rola === 'pobozny' ? l(9) < 0.4 : l(9) < 0.15;
  return {
    rola, bunt, obwodka: bunt ? OBWODKA.buntownik : OBWODKA[rola],
    skora, wlosy: stary ? [196, 190, 180] : wybierz(WLOSY, 2), stary,
    broda: rola === 'pobozny' ? (stary ? 2 : l(3) < 0.4 ? 3 : 0) : Math.floor(l(3) * 4),
    koszula: wybierz(KOSZULE, 4), kamizelka: wybierz(KAMIZELKI, 5), spodnie: wybierz(SPODNIE, 6),
    buty: [62, 44, 32], czapka: [124, 86, 52], chusta: wybierz(CHUSTY, 7), latka: l(8) < 0.5,
    szata: wybierz(SZATY, 10), szkaplerz: [186, 172, 146], lamowka: [222, 178, 84], sznur: [206, 176, 118],
    stal: l(11) < 0.5 ? [158, 172, 192] : [168, 172, 182],
    tunika: bunt ? [118, 24, 28] : [42, 78, 146],
    krzyz: bunt ? [28, 16, 16] : [242, 238, 228],
    plaszcz: bunt ? [36, 24, 26] : [150, 34, 38], podszewka: bunt ? [90, 20, 22] : [96, 22, 28],
    pioro: bunt ? [30, 22, 24] : [206, 44, 42],
    oko: bunt ? 'rgba(255,72,48,0.95)' : 'rgba(160,210,255,0.6)',
    zloto: [226, 184, 92], drewno: [132, 92, 56], skorzany: [96, 64, 40],
    zatruty, okaleczony: !!c.okaleczony,
  };
}
