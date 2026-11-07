/**
 * Alpha 1 (6.11): 25 RUCHÓW WALKI RYCERZA — rysunek ruchów z sim/walka.ts (liczby: nastawy/walka.ts).
 * Symulacja mówi, który ruch trwa i od którego tiku (c.ruch); tu jest jego poza w każdej chwili: klatki kluczowe
 * w tikach ruchu — zamach (wolno, z zatrzymaniem), uderzenie dokładnie w tiku trafienia, dokończenie i powrót do gardy —
 * oraz ruch całego ciała (wypad, wyskok, obrót, upadek na plecy, odskok) i efekty: iskry, odpryski, krąg uderzenia,
 * pył spod stóp, krew. Wielkość efektu bierze się z rany, którą cios naprawdę zadał (c.ruch.zadane): mały cios — kilka
 * iskier, ciężki — grad odprysków i fala; zablokowany przez demona — sam brzęk i iskry z jego przedramienia.
 *  - podstawowe: cięcie z góry, pchnięcie, cięcie z boku, cięcie odwrotne, seria trzech cięć, cięcie od dołu;
 *  - weteran: cięcie z obrotu (piruet), cios z wyskoku, młynek, finta i pchnięcie, cios dobijający (oburącz, klęka);
 *  - zbroja: uderzenie tarczą, szarża z tarczą, taran barkiem, cios kolanem, uderzenie hełmem, kontra na napierśniku;
 *  - obrona i reakcje: blok tarczą, parowanie, unik, lekkie trafienie, mocne trafienie, powalenie (i wstawanie);
 *  - garda między ciosami i podejście w gardzie.
 */
import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import { Job } from '../../sim/creatures';
import { RACES } from '../../sim/races';
import { nosi } from '../../sim/zbroja';
import { ustawienia } from '../../core/settings-store';
import { RUCHY_RYCERZA as RR, type IdRuchuRycerza } from '../../nastawy/walka';
import { clamp, cos, gladko, lerp, PI, sin, szum, TAU, wej, wejWyj, wyj, type Pkt } from './matma';
import { klucze, type Poza, type Tryb } from './poza';
import type { Szkielet } from './szkielet';
import { tikZUlamkiem } from '../zegar-gry';

type K = [number, Partial<Poza>, ((t: number) => number)?];

/** Garda: na ugiętych nogach, miecz w górze przed sobą, tarcza (albo pięść) przed piersią. */
const G: Partial<Poza> = {
  rA: 0.78, eA: 0.95, narz: 2.25, tulow: 0.13, glowa: 0.05, uA: 0.42, kA: 0.34, sA: 0, uB: -0.34, kB: 0.24, sB: -0.05,
  tarcza: 0.6, rB: 0.8, eB: 0.95, smuga: 0, cios: 0, wysilek: 0.22, usta: 0, lot: 0, oczy: 1,
};

/** Klatki w tikach ruchu → klatki w ułamku ruchu (pierwsza — garda, po ostatniej wraca do gardy). */
function kl(dl: number, lista: K[]): K[] {
  return [[0, G], ...lista.map(([t, p, e]): K => [clamp(t / dl, 0.0001, 0.9999), p, e])];
}
const uderz = (t: number): number => wej(t, 2.4);

/** Ciało: przesunięcie (w h), skok (y < 0), obrót wokół stóp, odbicie w poziomie (obrót w piruecie). */
interface Cialo { x: number; y: number; kat: number; sx: number }
const nowe = (): Cialo => ({ x: 0, y: 0, kat: 0, sx: 1 });
const dzwonU = (u: number, a: number, b: number): number => (u <= a || u >= b ? 0 : sin(PI * (u - a) / (b - a)));

/** Bieg w szarży: q — faza (cykle). */
function biegNogi(p: Poza, q: number): void {
  const f = q * TAU;
  p.uA = 0.58 * sin(f) + 0.2; p.kA = 0.35 + 1.3 * Math.pow(0.5 + 0.5 * cos(f + 0.45), 1.7); p.sA = 0.25 * Math.max(0, sin(f));
  p.uB = 0.58 * sin(f + PI) + 0.2; p.kB = 0.35 + 1.3 * Math.pow(0.5 + 0.5 * cos(f + PI + 0.45), 1.7); p.sB = 0.25 * Math.max(0, sin(f + PI));
  p.lot = 0.04 * Math.pow(Math.max(0, sin(f * 2 - 0.5)), 1.5);
}

/** Kafel w ułamkach wzrostu rycerza (jak w render/figury.ts: wysokoscPostaci). */
const kafel = (c: Creature): number => 1 / Math.max(0.2, RACES[c.race].size * 1.9 * ustawienia.wielkoscSylwetek * 1.3);

type Anim = (p: Poza, u: number, t: number, ci: Cialo, tryb: Tryb, c: Creature, czas: number) => void;

const A: Record<IdRuchuRycerza, Anim> = {
  // ------------------------------------------------------------ podstawowe
  ciecieZGory: (p, u, _t, ci) => {
    klucze(p, u, kl(102, [
      [31, { rA: 2.85, eA: 0.85, narz: 4.05, tulow: -0.1, glowa: -0.12, uA: 0.32, kA: 0.18, uB: -0.3, kB: 0.12, tarcza: 0.85, wysilek: 0.7 }, wejWyj],
      [48, { rA: 2.95, eA: 0.88, narz: 4.2, tulow: -0.14, glowa: -0.14, wysilek: 0.9 }, wyj],
      [56, { rA: 0.6, eA: 0.12, narz: 0.92, tulow: 0.46, glowa: 0.24, uA: 0.62, kA: 0.5, uB: -0.44, kB: 0.16, tarcza: 0.5, smuga: 1, cios: 1, wysilek: 1, usta: 0.6 }, uderz],
      [67, { rA: 0.24, eA: 0.3, narz: 0.32, tulow: 0.38, glowa: 0.18, smuga: 0, cios: 0, wysilek: 0.55, usta: 0.2 }, wyj],
      [88, { rA: 0.62, eA: 0.8, narz: 1.6, tulow: 0.2, uA: 0.5, kA: 0.4 }, wejWyj],
    ]));
    ci.x = 0.07 * dzwonU(u, 0.4, 0.95);
  },
  pchniecie: (p, u, _t, ci) => {
    klucze(p, u, kl(78, [
      [28, { rA: -0.35, eA: 1.95, narz: 1.62, tulow: -0.06, glowa: 0, uA: 0.22, kA: 0.2, uB: -0.38, kB: 0.25, tarcza: 0.9, rB: 1.05, eB: 0.6, wysilek: 0.7 }, wejWyj],
      [36, { rA: -0.42, eA: 2.0, narz: 1.64, tulow: -0.08, wysilek: 0.9 }, wyj],
      [40, { rA: 1.5, eA: 0.04, narz: 1.57, tulow: 0.42, glowa: 0.05, uA: 0.85, kA: 0.62, uB: -0.62, kB: 0.1, tarcza: 0.55, rB: 0.6, eB: 1.0, smuga: 1, cios: 1, wysilek: 1, usta: 0.5 }, (x) => wej(x, 2.2)],
      [53, { rA: 1.42, eA: 0.08, narz: 1.58, tulow: 0.38, smuga: 0, cios: 0, wysilek: 0.6 }],
      [68, { rA: 0.9, eA: 0.7, narz: 2.0, tulow: 0.2 }, wejWyj],
    ]));
    ci.x = 0.1 * dzwonU(u, 0.4, 0.98);
  },
  ciecieBoczne: (p, u, _t, ci) => {
    klucze(p, u, kl(90, [
      [31, { rA: -0.9, eA: 0.7, narz: -1.3, tulow: -0.05, glowa: 0, uA: 0.3, kA: 0.25, uB: -0.4, kB: 0.3, tarcza: 0.9, rB: 1.2, eB: 0.5, wysilek: 0.7 }, wejWyj],
      [42, { rA: -1.02, eA: 0.72, narz: -1.45, tulow: -0.08, wysilek: 0.9 }, wyj],
      [48, { rA: 1.55, eA: 0.1, narz: 1.62, tulow: 0.3, uA: 0.6, kA: 0.45, uB: -0.5, kB: 0.2, tarcza: 0.4, rB: 0.4, eB: 1.2, smuga: 1, cios: 1, wysilek: 1, usta: 0.6 }, uderz],
      [56, { rA: 2.3, eA: 0.5, narz: 2.65, tulow: 0.22, smuga: 0.6, cios: 0, wysilek: 0.6 }, wyj],
      [76, { rA: 1.2, eA: 0.9, narz: 2.3, tulow: 0.15, smuga: 0, uA: 0.45, kA: 0.36 }, wejWyj],
    ]));
    ci.sx = 1 - 0.14 * dzwonU(u, 0.05, 0.53);
    ci.x = 0.05 * dzwonU(u, 0.45, 0.95);
  },
  ciecieOdwrotne: (p, u, _t, ci) => {
    klucze(p, u, kl(90, [
      [30, { rA: 1.9, eA: 2.3, narz: 4.3, tulow: 0.0, glowa: -0.05, uA: 0.35, kA: 0.3, uB: -0.3, kB: 0.2, tarcza: 0.9, wysilek: 0.7 }, wejWyj],
      [41, { rA: 2.02, eA: 2.35, narz: 4.45, tulow: -0.03, wysilek: 0.9 }, wyj],
      [46, { rA: 1.0, eA: 0.25, narz: 0.75, tulow: 0.42, uA: 0.55, kA: 0.42, uB: -0.46, kB: 0.16, smuga: 1, cios: 1, wysilek: 1, usta: 0.5 }, uderz],
      [56, { rA: 0.5, eA: 0.4, narz: 0.2, tulow: 0.36, smuga: 0, cios: 0, wysilek: 0.55 }, wyj],
      [77, { rA: 0.7, eA: 0.85, narz: 1.7, tulow: 0.2 }, wejWyj],
    ]));
    ci.sx = 1 - 0.18 * dzwonU(u, 0.05, 0.5);
    ci.x = 0.06 * dzwonU(u, 0.42, 0.95);
  },
  seriaTrzech: (p, u, _t, ci) => {
    klucze(p, u, kl(168, [
      [28, { rA: 2.7, eA: 0.85, narz: 3.95, tulow: -0.08, glowa: -0.1, uA: 0.32, kA: 0.2, wysilek: 0.7 }, wejWyj],
      [46, { rA: 0.7, eA: 0.15, narz: 1.0, tulow: 0.4, glowa: 0.2, uA: 0.55, kA: 0.45, uB: -0.42, kB: 0.16, smuga: 1, cios: 1, wysilek: 1, usta: 0.5 }, uderz],
      [62, { rA: -0.6, eA: 0.8, narz: -1.1, tulow: 0.1, glowa: 0.05, uA: 0.3, kA: 0.3, uB: -0.4, kB: 0.3, smuga: 0, cios: 0, wysilek: 0.75, usta: 0.1 }, wejWyj],
      [86, { rA: 1.55, eA: 0.1, narz: 1.6, tulow: 0.32, uA: 0.62, kA: 0.48, uB: -0.5, kB: 0.2, smuga: 1, cios: 1, wysilek: 1, usta: 0.6 }, (x) => wej(x, 2.2)],
      [102, { rA: -0.35, eA: 1.9, narz: 1.62, tulow: -0.04, uA: 0.25, kA: 0.22, uB: -0.4, kB: 0.25, smuga: 0, cios: 0, wysilek: 0.8, usta: 0.1 }, wejWyj],
      [128, { rA: 1.5, eA: 0.04, narz: 1.57, tulow: 0.45, uA: 0.88, kA: 0.64, uB: -0.64, kB: 0.1, smuga: 1, cios: 1, wysilek: 1, usta: 0.7 }, (x) => wej(x, 2.2)],
      [142, { rA: 1.4, eA: 0.1, narz: 1.58, tulow: 0.38, smuga: 0, cios: 0, wysilek: 0.5 }],
      [158, { rA: 0.9, eA: 0.7, narz: 2.0, tulow: 0.22 }, wejWyj],
    ]));
    ci.x = 0.04 * dzwonU(u, 0.18, 0.4) + 0.08 * dzwonU(u, 0.42, 0.62) + 0.12 * dzwonU(u, 0.66, 0.99);
    ci.sx = 1 - 0.12 * dzwonU(u, 0.3, 0.52);
  },
  ciecieOdDolu: (p, u) => {
    klucze(p, u, kl(96, [
      [33, { rA: -0.4, eA: 0.3, narz: -0.5, tulow: 0.38, glowa: 0.12, uA: 0.95, kA: 1.25, uB: -0.15, kB: 0.9, tarcza: 0.8, wysilek: 0.75 }, wejWyj],
      [46, { rA: -0.46, eA: 0.32, narz: -0.62, tulow: 0.4, wysilek: 0.9 }, wyj],
      [54, { rA: 2.6, eA: 0.25, narz: 2.95, tulow: -0.12, glowa: -0.15, uA: 0.25, kA: 0.08, uB: -0.35, kB: 0.05, sA: 0.3, lot: 0.035, smuga: 1, cios: 1, wysilek: 1, usta: 0.6 }, (x) => wej(x, 2.2)],
      [64, { rA: 2.85, eA: 0.3, narz: 3.3, tulow: -0.15, lot: 0, sA: 0, smuga: 0, cios: 0, wysilek: 0.5 }, wyj],
      [84, { rA: 1.3, eA: 0.8, narz: 2.4, tulow: 0.15 }, wejWyj],
    ]));
  },
  // ------------------------------------------------------------ weteran
  piruet: (p, u, t, ci) => {
    klucze(p, u, kl(132, [
      [26, { rA: -0.5, eA: 0.5, narz: -0.9, tulow: 0.2, uA: 0.5, kA: 0.5, uB: -0.4, kB: 0.4, wysilek: 0.6 }, wejWyj],
      [40, { rA: 1.45, eA: 0.12, narz: 1.55, tulow: 0.15, uA: 0.15, kA: 0.2, uB: -0.15, kB: 0.25, wysilek: 0.8 }, wejWyj],
      [70, { rA: 1.5, eA: 0.1, narz: 1.6, tulow: 0.2, uA: 0.3, kA: 0.3, uB: -0.3, kB: 0.3, wysilek: 0.9, usta: 0.3 }],
      [78, { rA: 1.6, eA: 0.05, narz: 1.62, tulow: 0.36, uA: 0.7, kA: 0.55, uB: -0.6, kB: 0.15, smuga: 1, cios: 1, wysilek: 1, usta: 0.7 }, uderz],
      [92, { rA: 2.4, eA: 0.4, narz: 2.8, tulow: 0.25, smuga: 0, cios: 0, wysilek: 0.5 }, wyj],
      [116, { rA: 1.1, eA: 0.9, narz: 2.3, tulow: 0.15 }, wejWyj],
    ]));
    // pełny obrót: sylwetka zwęża się do krawędzi, odwraca i wraca — płaszcz w powietrzu
    const k = clamp((t - 36) / 40, 0, 1);
    ci.sx = cos(gladko(k) * TAU);
    if (t > 66 && t < 84) p.smuga = 1;
  },
  ciosZWyskoku: (p, u, t, ci, _tr, c) => {
    klucze(p, u, kl(150, [
      [36, { uA: 1.0, kA: 1.35, uB: 0.0, kB: 1.1, tulow: 0.32, glowa: 0.15, rA: 1.8, eA: 1.3, narz: 3.4, wysilek: 0.7 }, wejWyj],
      [46, { uA: 0.3, kA: 0.2, uB: -0.4, kB: 0.4, sA: -0.5, sB: -0.5, tulow: -0.08, glowa: -0.1, rA: 2.9, eA: 0.7, narz: 4.2, wysilek: 0.9, usta: 0.5 }, (x) => wej(x, 1.6)],
      [70, { uA: 0.9, kA: 1.1, uB: 0.2, kB: 1.2, sA: -0.2, sB: -0.2, tulow: -0.15, rA: 3.0, eA: 0.8, narz: 4.35, wysilek: 1, usta: 0.6 }, wyj],
      [96, { uA: 1.05, kA: 1.25, uB: -0.2, kB: 1.0, sA: 0, sB: 0, tulow: 0.55, glowa: 0.3, rA: 0.5, eA: 0.1, narz: 0.7, smuga: 1, cios: 1, wysilek: 1, usta: 0.8 }, (x) => wej(x, 2.6)],
      [111, { tulow: 0.5, smuga: 0, cios: 0, wysilek: 0.6, usta: 0.2 }],
      [136, { uA: 0.5, kA: 0.45, uB: -0.35, kB: 0.3, tulow: 0.2, glowa: 0.08, rA: 0.8, eA: 0.9, narz: 1.9 }, wejWyj],
    ]));
    // lot: wybicie w 46, szczyt w 70, lądowanie w 96 (symulacja niesie go 0,9 kafla w przód)
    const w = t < 46 || t > 96 ? 0 : sin(PI * (t - 46) / 50);
    ci.y = -0.34 * w * (0.7 + 0.3 * w);
    ci.kat = 0.12 * w;
    void c;
  },
  mlynek: (p, u, t) => {
    klucze(p, u, kl(180, [
      [18, { rA: 1.3, eA: 0.3, narz: 2.4, tulow: 0.22, uA: 0.45, kA: 0.4, uB: -0.38, kB: 0.3, wysilek: 0.8, usta: 0.2 }, wejWyj],
      [150, { rA: 1.3, eA: 0.3, tulow: 0.26, wysilek: 0.9, usta: 0.4 }],
      [166, { rA: 0.9, eA: 0.7, narz: 2.0, tulow: 0.18, wysilek: 0.5, usta: 0 }, wejWyj],
    ]));
    if (t > 14 && t < 152) {
      // ostrze wiruje kołem: przez dół w przód — trafia, gdy mija przód (co 32 tiki: 42, 74, 106, 138)
      const f = (t - 42) / 32;
      p.narz = 1.2 - TAU * f;
      p.rA = 1.25 + 0.28 * sin(TAU * f + 0.6); p.eA = 0.28 + 0.25 * cos(TAU * f);
      p.smuga = 1;
      const bl = Math.abs(f - Math.round(f));
      p.cios = bl < 0.06 ? 1 - bl / 0.06 : 0;
      // drobne kroki w przód w rytm cięć
      const q = (t - 14) / 64;
      p.uA = 0.45 + 0.12 * sin(q * TAU); p.uB = -0.38 + 0.12 * sin(q * TAU + PI);
    }
  },
  finta: (p, u, _t, ci) => {
    klucze(p, u, kl(120, [
      [32, { rA: 2.6, eA: 0.9, narz: 3.8, tulow: -0.08, glowa: -0.1, uA: 0.32, kA: 0.2, wysilek: 0.6 }, wejWyj],
      [50, { rA: 2.2, eA: 0.85, narz: 3.0, tulow: 0.05, wysilek: 0.7 }, wyj],
      [66, { rA: -0.2, eA: 1.8, narz: 1.45, tulow: 0.15, glowa: 0.1, uA: 0.6, kA: 0.8, uB: -0.45, kB: 0.5, wysilek: 0.9 }, (x) => wej(x, 3)],
      [86, { rA: 1.35, eA: 0.05, narz: 1.35, tulow: 0.55, glowa: 0.12, uA: 1.0, kA: 0.75, uB: -0.75, kB: 0.1, smuga: 1, cios: 1, wysilek: 1, usta: 0.6 }, uderz],
      [98, { rA: 1.3, eA: 0.08, tulow: 0.5, smuga: 0, cios: 0, wysilek: 0.5 }],
      [112, { rA: 0.9, eA: 0.7, narz: 2.0, tulow: 0.22, uA: 0.5, kA: 0.4 }, wejWyj],
    ]));
    ci.x = 0.13 * dzwonU(u, 0.55, 0.98);
  },
  egzekucja: (p, u, _t, ci, tryb) => {
    tryb.oburacz = true; tryb.chwyt = 0.07;
    klucze(p, u, kl(168, [
      [50, { rA: 2.95, eA: 0.7, narz: 4.4, tulow: -0.18, glowa: -0.2, uA: 0.35, kA: 0.2, uB: -0.35, kB: 0.15, wysilek: 0.95, usta: 0.3 }, wejWyj],
      [104, { rA: 3.05, eA: 0.72, narz: 4.5, tulow: -0.2, glowa: -0.24, wysilek: 1, usta: 0.85 }],
      [114, { rA: 0.45, eA: 0.05, narz: 0.55, tulow: 0.62, glowa: 0.35, uA: 1.35, kA: 1.5, sA: 0, uB: 0.1, kB: 1.65, sB: -0.9, smuga: 1, cios: 1, wysilek: 1, usta: 1 }, (x) => wej(x, 3)],
      [134, { tulow: 0.58, smuga: 0, cios: 0, wysilek: 0.6, usta: 0.2 }],
      [160, { rA: 0.7, eA: 0.8, narz: 1.8, tulow: 0.25, uA: 0.5, kA: 0.45, uB: -0.3, kB: 0.3, sB: 0 }, wejWyj],
    ]));
    // drży, zbierając siłę
    if (u > 0.3 && u < 0.62) p.rA += 0.025 * sin(u * 900);
    ci.x = 0.06 * dzwonU(u, 0.6, 1);
  },
  // ------------------------------------------------------------ zbroja
  uderzenieTarcza: (p, u, _t, ci) => {
    klucze(p, u, kl(84, [
      [28, { rB: 0.2, eB: 1.7, tarcza: 1.0, tulow: -0.05, uA: 0.3, kA: 0.3, uB: -0.4, kB: 0.3, rA: 0.5, eA: 1.2, narz: 2.6, wysilek: 0.7 }, wejWyj],
      [42, { rB: 1.55, eB: 0.15, tarcza: 1.0, tulow: 0.45, glowa: 0.12, uA: 0.8, kA: 0.6, uB: -0.6, kB: 0.1, wysilek: 1, usta: 0.5 }, uderz],
      [54, { rB: 1.45, eB: 0.2, tulow: 0.4, wysilek: 0.6 }],
      [72, { rB: 0.9, eB: 0.9, tarcza: 0.7, tulow: 0.2 }, wejWyj],
    ]));
    ci.x = 0.12 * dzwonU(u, 0.32, 0.92);
  },
  szarzaZTarcza: (p, u, t) => {
    klucze(p, u, kl(132, [
      [16, { tulow: 0.45, glowa: 0.12, uA: 0.8, kA: 0.9, uB: -0.2, kB: 0.8, rB: 1.2, eB: 0.6, tarcza: 1, rA: 0.4, eA: 1.2, narz: 2.4, wysilek: 0.8 }, wejWyj],
      [80, { tulow: 0.52, glowa: 0.2, rB: 1.3, eB: 0.5, tarcza: 1, rA: 0.35, eA: 1.25, narz: 2.3, wysilek: 0.9, usta: 0.7 }],
      [84, { tulow: 0.64, glowa: 0.22, rB: 1.6, eB: 0.1, uA: 0.9, kA: 0.5, uB: -0.7, kB: 0.2, wysilek: 1, usta: 0.8 }, uderz],
      [100, { tulow: 0.2, uA: 0.45, kA: 0.45, uB: -0.3, kB: 0.3, wysilek: 0.5, usta: 0.2 }, wyj],
      [120, { rB: 0.9, eB: 0.9, tarcza: 0.7 }, wejWyj],
    ]));
    if (t >= 20 && t < 80) biegNogi(p, (t - 20) / 15);
  },
  taranBarkiem: (p, u, _t, ci) => {
    klucze(p, u, kl(108, [
      [28, { tulow: 0.6, glowa: 0.35, rA: 0.3, eA: 1.4, narz: 1.8, rB: 0.5, eB: 1.6, uA: 0.7, kA: 0.8, uB: -0.3, kB: 0.6, wysilek: 0.8 }, wejWyj],
      [50, { tulow: 0.66, glowa: 0.38, uA: 0.95, kA: 0.7, uB: -0.55, kB: 0.4, wysilek: 0.9, usta: 0.5 }],
      [62, { tulow: 0.74, glowa: 0.4, uA: 1.0, kA: 0.6, uB: -0.75, kB: 0.15, wysilek: 1, usta: 0.7 }, uderz],
      [76, { tulow: 0.5, glowa: 0.2, wysilek: 0.6, usta: 0.2 }],
      [96, { tulow: 0.2, glowa: 0.08 }, wejWyj],
    ]));
    ci.x = 0.06 * dzwonU(u, 0.45, 0.85);
  },
  kolano: (p, u) => {
    klucze(p, u, kl(72, [
      [22, { rB: 1.5, eB: 0.4, tulow: 0.05, uA: 0.2, kA: 0.2, wysilek: 0.6 }, wejWyj],
      [38, { uA: 1.75, kA: 2.2, sA: 0.4, uB: -0.1, kB: 0.15, tulow: -0.12, rB: 1.0, eB: 1.2, glowa: 0.12, wysilek: 1, usta: 0.5 }, uderz],
      [48, { uA: 1.6, kA: 2.0, tulow: -0.08, wysilek: 0.7 }],
      [62, { uA: 0.45, kA: 0.35, sA: 0, rB: 0.85, eB: 0.95, tulow: 0.12 }, wejWyj],
    ]));
  },
  uderzenieHelmem: (p, u, _t, ci) => {
    klucze(p, u, kl(80, [
      [29, { tulow: -0.25, glowa: -0.35, rB: 1.4, eB: 0.6, rA: 1.2, eA: 0.8, narz: 1.8, wysilek: 0.7 }, wejWyj],
      [44, { tulow: 0.45, glowa: 0.55, uA: 0.6, kA: 0.45, uB: -0.45, kB: 0.15, wysilek: 1, usta: 0.4 }, uderz],
      [54, { tulow: 0.4, glowa: 0.48, wysilek: 0.6 }],
      [70, { tulow: 0.15, glowa: 0.06, rA: 0.78, eA: 0.95, narz: 2.25 }, wejWyj],
    ]));
    ci.x = 0.05 * dzwonU(u, 0.36, 0.85);
  },
  kontraNapiersnika: (p, u) => {
    klucze(p, u, kl(110, [
      [3, { tulow: -0.28, glowa: -0.25, uA: 0.2, kA: 0.3, uB: -0.5, kB: 0.35, rA: 0.6, eA: 1.1, narz: 2.2, wysilek: 0.9, usta: 0.6, oczy: 0.4 }, (x) => wyj(x, 3)],
      [22, { tulow: -0.15, glowa: -0.1, wysilek: 0.9, usta: 0.2, oczy: 1 }],
      [50, { rA: 2.8, eA: 0.85, narz: 4.0, tulow: -0.1, glowa: -0.1, uA: 0.32, kA: 0.2, wysilek: 0.9 }, wejWyj],
      [70, { rA: 0.6, eA: 0.1, narz: 0.9, tulow: 0.5, glowa: 0.22, uA: 0.65, kA: 0.5, uB: -0.46, kB: 0.16, smuga: 1, cios: 1, wysilek: 1, usta: 0.7 }, uderz],
      [84, { rA: 0.25, eA: 0.3, narz: 0.3, tulow: 0.4, smuga: 0, cios: 0, wysilek: 0.5 }, wyj],
      [100, { rA: 0.65, eA: 0.8, narz: 1.6, tulow: 0.2 }, wejWyj],
    ]));
  },
  // ------------------------------------------------------------ obrona i reakcje
  blokTarcza: (p, u, _t, ci, _tr, c) => {
    const tarcza = nosi(c, 'tarcza');
    klucze(p, u, kl(46, [
      [4, { tarcza: 1, rB: tarcza ? 1.45 : 1.6, eB: 0.35, tulow: -0.1, glowa: 0.15, uA: 0.45, kA: 0.55, uB: -0.45, kB: 0.45, wysilek: 0.9, oczy: 0.5 }, (x) => wyj(x, 3)],
      [14, { tulow: -0.18, glowa: 0.12, wysilek: 0.9 }],
      [30, { tarcza: 0.8, rB: 1.0, eB: 0.8, tulow: 0.05, wysilek: 0.5, oczy: 1 }, wejWyj],
    ]));
    ci.x = -0.05 * dzwonU(u, 0.05, 0.8);
  },
  parowanie: (p, u, _t, ci) => {
    klucze(p, u, kl(48, [
      [5, { rA: 1.6, eA: 0.5, narz: 2.4, tulow: 0.0, glowa: -0.05, wysilek: 0.9 }, (x) => wyj(x, 3)],
      [14, { rA: 1.2, eA: 0.45, narz: 1.2, tulow: 0.1, wysilek: 0.7 }, wyj],
      [30, { rA: 0.4, eA: 1.6, narz: 1.6, tulow: 0.12, uA: 0.5, kA: 0.45, wysilek: 0.6 }, wejWyj],
    ]));
    ci.x = -0.03 * dzwonU(u, 0.05, 0.5);
  },
  unik: (p, u, _t, ci, _tr, c) => {
    klucze(p, u, kl(54, [
      [8, { tulow: -0.3, glowa: -0.15, uA: -0.2, kA: 0.3, uB: 0.3, kB: 0.4, rA: 0.4, eA: 1.0, narz: 2.0, rB: 1.2, eB: 0.6, wysilek: 0.6, lot: 0.06 }, (x) => wyj(x, 2)],
      [24, { tulow: 0.25, glowa: 0.1, uA: 0.55, kA: 0.7, uB: -0.4, kB: 0.6, lot: 0, wysilek: 0.5 }, wej],
      [42, { tulow: 0.15, uA: 0.45, kA: 0.4, uB: -0.34, kB: 0.26 }, wejWyj],
    ]));
    // symulacja odsunęła go w tył od razu — rysunek dociąga go tam w podskoku
    ci.x = 0.55 * kafel(c) * (1 - wyj(clamp(u / 0.45, 0, 1), 2));
  },
  trafionyLekko: (p, u) => {
    klucze(p, u, kl(30, [
      [4, { tulow: -0.12, glowa: -0.2, oczy: 0.3, usta: 0.4, wysilek: 0.8 }, (x) => wyj(x, 3)],
      [16, { tulow: 0.08, glowa: 0.02, oczy: 1, usta: 0.1 }],
    ]));
  },
  trafionyMocno: (p, u, _t, ci, _tr, c) => {
    klucze(p, u, kl(66, [
      [3, { tulow: -0.42, glowa: -0.48, rA: 0.3, eA: 0.4, narz: 1.0, rB: -0.4, eB: 0.3, uA: -0.1, kA: 0.2, uB: 0.35, kB: 0.5, oczy: 0.2, usta: 0.75, wysilek: 1, tarcza: 0.2 }, (x) => wyj(x, 3)],
      [18, { tulow: -0.22, glowa: -0.25, uA: 0.4, kA: 0.6, uB: -0.5, kB: 0.3, oczy: 0.5 }],
      [34, { tulow: 0.28, glowa: 0.22, uA: 0.62, kA: 0.85, uB: -0.4, kB: 0.6, rA: 0.5, eA: 0.7, narz: 1.4, oczy: 1, usta: 0.3 }, wejWyj],
      [56, { tulow: 0.18, glowa: 0.1, uA: 0.45, kA: 0.4 }, wejWyj],
    ]));
    ci.x = 0.3 * kafel(c) * (1 - wyj(clamp(u / 0.35, 0, 1), 2));
  },
  powalony: (p, u, t, ci, _tr, c) => {
    // upadek na plecy (0–22), leży (do końca ogłuszenia), wstaje przez klęk, podpierając się mieczem (ostatnie 64 tiki)
    const R = c.ruch!;
    const dl = R.dl, lezyDo = dl - 64;
    const upad = clamp(t / 22, 0, 1), wstaje = clamp((t - lezyDo) / 64, 0, 1);
    const podpora = gladko(clamp(wstaje / 0.3, 0, 1));
    p.rA = lerp(2.2, 0.6, podpora); p.eA = lerp(0.6, 0.3, podpora); p.narz = lerp(3.4, 0.05, podpora);
    p.rB = lerp(2.5, 0.9, wstaje); p.eB = lerp(0.5, 0.9, wstaje);
    p.uA = lerp(0.6, 1.3, gladko(wstaje)); p.kA = lerp(0.2, 1.5, gladko(wstaje)); p.uB = lerp(0.35, 0.1, wstaje); p.kB = lerp(0.3, 1.65, gladko(wstaje)); p.sB = -0.9 * gladko(wstaje);
    p.tulow = lerp(0.05, 0.4, gladko(wstaje)); p.glowa = lerp(-0.3, 0.25, wstaje);
    p.oczy = t < lezyDo ? 0.25 + 0.2 * sin(t * 0.05) : 1; p.usta = t < 22 ? 0.8 : 0.2; p.wysilek = wstaje > 0 ? 0.9 : 0.6;
    p.tarcza = 0;
    // leżąc: drgnie, uniesie głowę; przygnieciony dłonią demona — szarpie się
    if (t > 22 && t < lezyDo) {
      const s = R.wariant === 1 ? 0.12 : 0.04;
      p.rA += s * sin(t * 0.21); p.rB += s * sin(t * 0.17 + 1); p.glowa += 0.1 * sin(t * 0.04);
    }
    // wstaje: klęk na jedno kolano z mieczem wbitym w ziemię, potem prostuje się
    const stoi = gladko(clamp((wstaje - 0.55) / 0.45, 0, 1));
    p.uA = lerp(p.uA, G.uA!, stoi); p.kA = lerp(p.kA, G.kA!, stoi); p.uB = lerp(p.uB, G.uB!, stoi); p.kB = lerp(p.kB, G.kB!, stoi); p.sB = lerp(p.sB, 0, stoi);
    p.rA = lerp(p.rA, G.rA!, stoi); p.eA = lerp(p.eA, G.eA!, stoi); p.narz = lerp(p.narz, G.narz!, stoi); p.tulow = lerp(p.tulow, G.tulow!, stoi);
    ci.kat = -1.48 * wej(upad, 1.6) * (1 - gladko(clamp(wstaje / 0.55, 0, 1)));
    ci.y = -0.06 * Math.min(1, -ci.kat / 1.48);
    // symulacja odrzuciła go w tył — rysunek dociąga w upadku
    ci.x = 0.7 * kafel(c) * (1 - wyj(upad, 2));
  },
  // ------------------------------------------------------------ postawa i podejście
  garda: (p, _u, _t, _ci, _tr, c, czas) => {
    Object.assign(p, G);
    const wg = szum(czas * 0.0009, c.id), od = sin(czas * 0.0032 + c.id);
    p.uA += 0.05 * wg; p.uB += 0.04 * wg; p.kA += 0.05 * Math.max(0, wg); p.kB += 0.05 * Math.max(0, -wg);
    p.tulow += 0.02 * od; p.glowa += 0.03 * szum(czas * 0.0007, c.id + 3);
    p.narz += 0.08 * szum(czas * 0.0011, c.id + 7); p.rA += 0.04 * od;
    p.tarcza += 0.08 * szum(czas * 0.0013, c.id + 9);
  },
  podejscie: (p, _u, _t, _ci, _tr, c, czas) => {
    Object.assign(p, G);
    const q = (czas * 0.0016 + c.id * 0.3) * TAU;
    p.uA = 0.3 + 0.26 * sin(q); p.kA = 0.3 + 0.35 * Math.max(0, cos(q + 0.4));
    p.uB = -0.2 + 0.26 * sin(q + PI); p.kB = 0.3 + 0.35 * Math.max(0, cos(q + PI + 0.4));
    p.tulow = 0.18 + 0.02 * cos(q * 2); p.glowa = 0.08;
    p.narz += 0.05 * sin(q); p.rA += 0.04 * sin(q);
  },
};

export interface StanWalki { id: IdRuchuRycerza; u: number; t: number; dl: number }

/** Który ruch walki rycerza pokazać teraz (null — nie walczy). */
export function stanWalki(sim: Sim, c: Creature, cz: string, czas: number): StanWalki | null {
  const tF = tikZUlamkiem(sim, czas);
  const R = c.ruch;
  if (R && RR[R.id as IdRuchuRycerza] && tF - R.od < R.dl + 0.5 && tF >= R.od) {
    const t = Math.max(0, tF - R.od);
    return { id: R.id as IdRuchuRycerza, u: clamp(t / R.dl, 0, 1), t, dl: R.dl };
  }
  // lekkie trafienie
  const d = c.drgniecie;
  if (d && tF - d.t < RR.trafionyLekko.dl) return { id: 'trafionyLekko', u: (tF - d.t) / RR.trafionyLekko.dl, t: tF - d.t, dl: RR.trafionyLekko.dl };
  if (c.job !== Job.FIGHT) return null;
  const cel = sim.creatureById(sim.target.get(c.id) ?? -1);
  if (!cel || cel.dead || !cel.straznik) return null;
  const dist = Math.hypot(cel.x - c.x, cel.y - c.y);
  if (dist > 9) return null;
  if (cz === 'idzie' || cz === 'biegnie') return dist < 7 ? { id: 'podejscie', u: 0, t: 0, dl: 0 } : null;
  if (cz === 'walczy' || cz === 'stoi') return { id: 'garda', u: 0, t: 0, dl: 0 };
  return null;
}

/**
 * Poza rycerza w walce (wołane z render/lud/ruch.ts: animuj). Zwraca false, gdy nie walczy — wtedy zwykła czynność.
 */
export function pozaWalkiRycerza(sim: Sim, c: Creature, cz: string, czas: number, p: Poza, tryb: Tryb): boolean {
  const st = stanWalki(sim, c, cz, czas);
  if (!st) return false;
  const ci = nowe();
  Object.assign(p, G);
  A[st.id](p, st.u, st.t, ci, tryb, c, czas);
  // lekkie trafienie w trakcie innego ruchu: wzdryga się (siła — z rany)
  const d = c.drgniecie, tF = tikZUlamkiem(sim, czas);
  if (d && st.id !== 'trafionyLekko' && tF - d.t < 26) {
    const k = sin(PI * clamp((tF - d.t) / 26, 0, 1)) * clamp(0.5 + d.sila * 6, 0.5, 1.4);
    p.tulow -= 0.14 * k; p.glowa -= 0.2 * k; p.oczy = Math.min(p.oczy, 1 - 0.6 * k); p.usta = Math.max(p.usta, 0.4 * k);
  }
  tryb.cialo = ci;
  if (st.id === 'powalony' || st.id === 'unik' || st.id === 'kolano') tryb.narzedzie = 'miecz';
  return true;
}

// ======================================================================== efekty

interface Iskra { x: number; y: number; t: number; sila: number; typ: 'traf' | 'blok' | 'brzek' | 'pyl' | 'krew' | 'tarcza' | 'parada' }
interface PamiecWalki { ruchOd: number; tOst: number; efekty: Iskra[]; drgT: number }
const pamiecWalki = new WeakMap<Creature, PamiecWalki>();

/** Siła rycerza w ułamkach (rana, jaką zadałby zwykły cios ×1) — do skali efektu. */
function silaBazowa(c: Creature): number { return Math.max(1, RACES[c.race].strength * 11); }

/** Gdzie trafia ruch: czubek miecza, tarcza, kolano, czoło hełmu, bark. */
function punktTrafienia(id: IdRuchuRycerza, s: Szkielet, h: number): Pkt {
  // ostrze trafia w wroga ok. dwóch trzecich długości (nie czubkiem — ten mija go w zamachu)
  const czubek = { x: s.dlonA.x + sin(s.narz) * 0.36 * h, y: s.dlonA.y + cos(s.narz) * 0.36 * h };
  switch (id) {
    case 'uderzenieTarcza': case 'szarzaZTarcza': return { x: s.dlonB.x + 0.06 * h, y: s.dlonB.y - 0.02 * h };
    case 'kolano': return { x: s.kolA.x + 0.02 * h, y: s.kolA.y };
    case 'uderzenieHelmem': return { x: s.glowa.x + s.rg, y: s.glowa.y };
    case 'taranBarkiem': return { x: s.bark.x + 0.05 * h, y: s.bark.y };
    default: return czubek;
  }
}

/**
 * Efekty walki rycerza (wołane z render/postacie.ts po rysunku postaci, w jej układzie): w chwili trafienia — iskry,
 * odpryski i krąg wielkości zadanej rany; blok tarczą, parowanie, pył przy wyskoku, upadku i odskoku, krew przy mocnym
 * trafieniu.
 */
export function efektyWalkiRycerza(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, s0: Szkielet, h: number, czas: number, ci?: Cialo): void {
  // punkty szkieletu w układzie stóp (z ruchem ciała: wypad, skok, upadek) — efekty nie obracają się z leżącym
  const s = ci ? przelozSzkielet(s0, h, ci) : s0;
  let pm = pamiecWalki.get(c);
  if (!pm) { pm = { ruchOd: -1, tOst: -1, efekty: [], drgT: -1 }; pamiecWalki.set(c, pm); }
  const R = c.ruch;
  const tF = tikZUlamkiem(sim, czas);
  const def = R ? RR[R.id as IdRuchuRycerza] : undefined;
  if (R && def) {
    const t = tF - R.od;
    if (pm.ruchOd !== R.od) { pm.ruchOd = R.od; pm.tOst = -1; }
    const przeszedl = (tik: number): boolean => pm!.tOst < tik && t >= tik;
    const id = R.id as IdRuchuRycerza;
    if (def.traf) {
      def.traf.forEach(([tik], i) => {
        if (!przeszedl(tik)) return;
        const zad = R.zadane[i] ?? 0;
        const q = punktTrafienia(id, s, h);
        if (zad > 0) pm!.efekty.push({ x: q.x / h, y: q.y / h, t: czas, sila: zad / silaBazowa(c), typ: 'traf' });
        else if (zad < 0) pm!.efekty.push({ x: q.x / h, y: q.y / h, t: czas, sila: -zad / silaBazowa(c), typ: 'brzek' });
      });
    }
    // pył: odbicie i lądowanie wyskoku, start szarży, upadek, odskok, cios dobijający w ziemię
    const pyl = (tik: number, x: number, sila: number): void => { if (przeszedl(tik)) pm!.efekty.push({ x, y: 0, t: czas, sila, typ: 'pyl' }); };
    if (id === 'ciosZWyskoku') { pyl(46, 0, 0.6); pyl(96, 0.08, 1.3); }
    if (id === 'szarzaZTarcza') { pyl(20, -0.05, 0.7); pyl(84, 0.15, 1.0); }
    if (id === 'egzekucja') pyl(114, 0.25, 1.4);
    if (id === 'powalony') { pyl(22, -0.4, 1.2); pyl(R.dl - 30, 0.05, 0.6); }
    if (id === 'unik') pyl(24, 0, 0.6);
    if (id === 'blokTarcza' && przeszedl(4)) pm.efekty.push({ x: s.dlonB.x / h + 0.06, y: s.dlonB.y / h - 0.03, t: czas, sila: 1 + (R.sila ?? 0) * 6, typ: 'tarcza' });
    if (id === 'parowanie' && przeszedl(5)) {
      const q = { x: s.dlonA.x + sin(s.narz) * 0.28 * h, y: s.dlonA.y + cos(s.narz) * 0.28 * h };
      pm.efekty.push({ x: q.x / h, y: q.y / h, t: czas, sila: 1, typ: 'parada' });
    }
    if ((id === 'trafionyMocno' || id === 'powalony') && przeszedl(1)) pm.efekty.push({ x: s.bark.x / h - 0.02, y: (s.bark.y / h + s.biodro.y / h) / 2, t: czas, sila: clamp((R.sila ?? 0.1) * 5, 0.5, 2), typ: 'krew' });
    if (id === 'kontraNapiersnika' && przeszedl(1)) pm.efekty.push({ x: (s.bark.x / h + 0.04), y: (s.bark.y / h + s.biodro.y / h) / 2 - 0.04, t: czas, sila: 1.2, typ: 'blok' });
    pm.tOst = t;
  }
  const d = c.drgniecie;
  if (d && d.t !== pm.drgT && tF - d.t < 4) { pm.drgT = d.t; pm.efekty.push({ x: s.bark.x / h, y: (s.bark.y / h + s.biodro.y / h) / 2, t: czas, sila: clamp(d.sila * 6, 0.3, 1), typ: 'krew' }); }
  pm.efekty = pm.efekty.filter((e) => czas - e.t < 700 && czas >= e.t);
  for (const e of pm.efekty) rysujEfekt(ctx, e, h, czas, c.id);
}

function przelozSzkielet(s: Szkielet, h: number, ci: Cialo): Szkielet {
  const c = Math.cos(ci.kat), sn = Math.sin(ci.kat);
  const P = (q: Pkt): Pkt => { const x = q.x * ci.sx; return { x: x * c - q.y * sn + ci.x * h, y: x * sn + q.y * c + ci.y * h }; };
  return { ...s, dlonA: P(s.dlonA), dlonB: P(s.dlonB), kolA: P(s.kolA), glowa: P(s.glowa), bark: P(s.bark), biodro: P(s.biodro), narz: (ci.sx < 0 ? -s.narz : s.narz) - ci.kat };
}

function rysujEfekt(g: CanvasRenderingContext2D, e: Iskra, h: number, czas: number, id: number): void {
  const t = (czas - e.t) / 1000;
  if (t < 0) return;
  const x = e.x * h, y = e.y * h;
  const s = clamp(e.sila, 0.25, 3);
  g.save();
  if (e.typ === 'traf' || e.typ === 'brzek' || e.typ === 'tarcza' || e.typ === 'parada' || e.typ === 'blok') {
    const dl = e.typ === 'traf' ? 0.45 + 0.12 * s : 0.32;
    if (t > dl) { g.restore(); return; }
    const z = 1 - t / dl;
    g.globalCompositeOperation = 'lighter';
    // błysk
    const R = h * (0.05 + 0.05 * s) * (1 + t * 3);
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    const kol = e.typ === 'traf' ? '255,210,150' : e.typ === 'parada' ? '230,240,255' : '255,236,190';
    gr.addColorStop(0, `rgba(${kol},${0.85 * z})`); gr.addColorStop(1, `rgba(${kol},0)`);
    g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
    // iskry — tym więcej, im mocniej
    const n = e.typ === 'traf' ? Math.round(6 + 10 * s) : 9;
    g.strokeStyle = e.typ === 'parada' ? `rgba(220,235,255,${z})` : `rgba(255,${190 + Math.floor(50 * z)},110,${z})`;
    g.lineWidth = Math.max(0.8, h * 0.008);
    g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = -PI * 0.95 + (i / n) * PI * 1.5 + sin(id * 3.1 + i * 2.7 + e.t) * 0.25;
      const v = h * (0.6 + ((i * 37) % 10) / 12) * (e.typ === 'traf' ? 0.8 + 0.25 * s : 0.8);
      const px = x + Math.cos(a) * v * t, py = y + Math.sin(a) * v * t + 2.4 * h * t * t;
      g.moveTo(px, py); g.lineTo(px - Math.cos(a) * h * 0.035, py - Math.sin(a) * h * 0.035);
    }
    g.stroke();
    // ciężki cios: krąg i odpryski kamienia (wróg pęka)
    if (e.typ === 'traf') {
      if (s > 2.6) {
        g.strokeStyle = `rgba(255,200,140,${0.45 * z})`; g.lineWidth = Math.max(1, h * 0.01 * z);
        g.beginPath(); g.arc(x, y, h * (0.05 + 0.32 * t) * (0.7 + 0.15 * s), 0, TAU); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      const m = Math.round(4 + 6 * s);
      for (let i = 0; i < m; i++) {
        const a = -2.6 + i * (2.2 / m) + sin(id + i * 1.9 + e.t) * 0.3;
        const v = h * (0.5 + ((i * 53) % 10) / 14);
        const px = x + Math.cos(a) * v * t, py = y + Math.sin(a) * v * t + 2.6 * h * t * t;
        const r = Math.max(0.8, h * (0.009 + (i % 3) * 0.005) * (0.8 + 0.2 * s));
        g.fillStyle = i % 3 ? `rgba(150,136,116,${z})` : `rgba(96,84,70,${z})`;
        g.fillRect(px - r / 2, py - r / 2, r, r);
      }
    }
    if (e.typ === 'tarcza' || e.typ === 'brzek') {
      g.strokeStyle = `rgba(255,236,200,${0.5 * z})`; g.lineWidth = Math.max(1, h * 0.01);
      g.beginPath(); g.arc(x, y, h * (0.04 + 0.35 * t), -1.2, 1.2); g.stroke();
    }
  } else if (e.typ === 'pyl') {
    const dl = 0.7;
    if (t > dl) { g.restore(); return; }
    const z = 1 - t / dl;
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * 0.08 * h * (1 + t * 3) * s + x;
      const r = h * (0.05 + 0.1 * t) * (0.7 + 0.3 * s);
      const gr = g.createRadialGradient(dx, y - r * 0.4, 0, dx, y - r * 0.4, r);
      gr.addColorStop(0, `rgba(118,104,90,${0.32 * z})`); gr.addColorStop(1, 'rgba(118,104,90,0)');
      g.fillStyle = gr; g.fillRect(dx - r, y - r * 1.4, r * 2, r * 2);
    }
  } else if (e.typ === 'krew') {
    const dl = 0.6;
    if (t > dl) { g.restore(); return; }
    const z = 1 - t / dl;
    g.fillStyle = `rgba(120,14,10,${0.9 * z})`;
    const n = Math.round(4 + 8 * s);
    for (let i = 0; i < n; i++) {
      const a = PI + (sin(id + i * 2.3 + e.t) * 0.9) - 0.4;
      const v = h * (0.35 + ((i * 41) % 10) / 16) * (0.7 + 0.3 * s);
      const px = x + Math.cos(a) * v * t, py = y + Math.sin(a) * v * t + 2.8 * h * t * t;
      const r = Math.max(0.7, h * 0.008 * (1 + (i % 3) * 0.4));
      g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
    }
  }
  g.restore();
}
