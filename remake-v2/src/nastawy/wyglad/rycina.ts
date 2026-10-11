import { T } from '../../sim/tiles';

/**
 * RYCINA — jak wygląda góra na płycie w grze.
 *
 * Każdy materiał jest kreskowany jak na miedziorycie:
 *  - ton: ile atramentu w kaflu (0 = pusty papier, ok. 0,6 = prawie czarny),
 *  - kąt: kierunek kreski w radianach (0 = poziomo, 1,57 = pionowo),
 *  - odstęp: co ile pikseli kolejna kreska (więcej = rzadziej),
 *  - krzyż: jak mocno dochodzi kreska krzyżowa (0..1),
 *  - kropki: ile punktowania (0..1),
 *  - barwa: [r, g, b] światła kreski albo null (sama głębia).
 */
export const TON_MAX = 0.62;

export interface Kreskowanie { tone: number; ang: number; sp: number; cross: number; stipple: number; tint: [number, number, number] | null; }

export const MATERIALY: Record<number, Kreskowanie> = {
  [T.SOIL]:    { tone: 0.22, ang: 0.7, sp: 5.2, cross: 0.4, stipple: 0.25, tint: [214, 176, 124] },
  [T.ROCK]:    { tone: 0.17, ang: 0.62, sp: 5.8, cross: 0.34, stipple: 0, tint: [212, 206, 190] },
  [T.ORE]:     { tone: 0.5, ang: 0.62, sp: 6.2, cross: 0.55, stipple: 0.18, tint: [236, 206, 140] },
  [T.CRYSTAL]: { tone: 0.44, ang: -0.55, sp: 7.4, cross: 0.66, stipple: 0.3, tint: [232, 228, 236] },
  [T.STONE]:   { tone: 0.19, ang: 1.62, sp: 6.0, cross: 0.55, stipple: 0.04, tint: [186, 194, 200] },
  [T.FUNGUS]:  { tone: 0.64, ang: 0.20, sp: 4.8, cross: 0.5, stipple: 0.55, tint: [150, 214, 118] },
  [T.BONES]:   { tone: 0.5, ang: 0.90, sp: 5.4, cross: 0.60, stipple: 0.35, tint: [226, 218, 196] },
  [T.SHRINE]:  { tone: 0.66, ang: 1.57, sp: 3.6, cross: 0.44, stipple: 0.20, tint: [230, 198, 140] },
  [T.FORGE]:   { tone: 0.7, ang: 1.57, sp: 3.6, cross: 0.40, stipple: 0.30, tint: [255, 158, 70] },
  [T.NEST]:    { tone: 0.6, ang: 0.35, sp: 4.2, cross: 0.50, stipple: 0.45, tint: [204, 170, 120] },
  [T.WEB]:     { tone: 0.18, ang: 0.79, sp: 3.4, cross: 0.30, stipple: 0.12, tint: [222, 220, 228] },
  [T.CORE]:    { tone: 0.60, ang: 1.10, sp: 3.0, cross: 0.34, stipple: 0.50, tint: [226, 74, 74] },
  [T.GLYPH]:   { tone: 0.56, ang: 0.00, sp: 3.4, cross: 0.36, stipple: 0.55, tint: [246, 214, 130] },
  [T.SKY]:     { tone: 0.07, ang: 1.57, sp: 9.0, cross: 0.95, stipple: 0, tint: [176, 178, 172] },
};

/** Kolor masy materiału pod kreską [r, g, b] — skała ciemna, żyła świeci barwą. */
export const MASA: Record<number, [number, number, number]> = {
  [T.SOIL]: [26, 18, 12],
  [T.ORE]: [34, 26, 12],
  [T.CRYSTAL]: [30, 20, 44],
  [T.STONE]: [14, 15, 19],
  [T.SHRINE]: [52, 38, 22],
  [T.FORGE]: [84, 34, 12],
  [T.CORE]: [96, 14, 20],
};
