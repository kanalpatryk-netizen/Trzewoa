import { clamp, cos, katOdc, kier, sin, type Pkt } from './matma';
import type { Poza, Tryb } from './poza';

/**
 * Długości w ułamkach wzrostu h (od podeszwy do czubka głowy ≈ 1 h). Proporcje jak na freskach
 * i ikonach: mała głowa (ok. 1/6 wzrostu), wydłużony tułów i nogi, smukłe ramiona.
 */
export const D = {
  glowa: 0.08, szyja: 0.042, tulow: 0.3,
  udo: 0.236, golen: 0.228, kostka: 0.03, stopa: 0.068, pieta: 0.028,
  ramie: 0.166, przed: 0.15,
};

export interface Stopa {
  kostka: Pkt; podeszwa: Pkt; palce: Pkt; pieta: Pkt;
  /** pochylenie stopy (+ palce w górę) */
  kat: number;
}

export interface Szkielet {
  h: number;
  biodro: Pkt; bark: Pkt; barkB: Pkt; szyja: Pkt; glowa: Pkt; rg: number;
  /** kąt tułowia (od pionu w górę, + do przodu) i kąt głowy */
  katT: number; katG: number;
  kolA: Pkt; kolB: Pkt; stA: Stopa; stB: Stopa;
  lokA: Pkt; dlonA: Pkt; lokB: Pkt; dlonB: Pkt;
  /** bezwzględne kąty przedramion i narzędzia */
  przedA: number; przedB: number; narz: number;
}

function stopa(kostka: Pkt, s: number, h: number): Stopa {
  const fx = cos(s), fy = -sin(s);          // do przodu (palce w górę = obrót w lewo)
  const nx = sin(s), ny = cos(s);           // w dół
  const podeszwa = { x: kostka.x + nx * D.kostka * h, y: kostka.y + ny * D.kostka * h };
  return {
    kostka, podeszwa, kat: s,
    palce: { x: podeszwa.x + fx * D.stopa * h, y: podeszwa.y + fy * D.stopa * h },
    pieta: { x: podeszwa.x - fx * D.pieta * h, y: podeszwa.y - fy * D.pieta * h },
  };
}

function ik(s: Pkt, cel: Pkt, l1: number, l2: number): [Pkt, Pkt] {
  let dx = cel.x - s.x, dy = cel.y - s.y;
  let d = Math.hypot(dx, dy);
  const maks = (l1 + l2) * 0.999;
  if (d > maks) { dx *= maks / d; dy *= maks / d; d = maks; }
  d = Math.max(1e-6, d);
  const a = Math.atan2(dy, dx);
  const b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return [{ x: s.x + Math.cos(a + b) * l1, y: s.y + Math.sin(a + b) * l1 }, { x: s.x + dx, y: s.y + dy }];
}

/** Szkielet z pozy: biodro opada tak, by najniższy punkt (pięta, palce, kolano) stał na ziemi y = 0. */
export function szkielet(p: Poza, h: number, tryb: Tryb): Szkielet {
  const noga = (u: number, k: number, s: number) => {
    const ku = kier(u), kg = kier(u - k);
    const kol = { x: ku.x * D.udo * h, y: ku.y * D.udo * h };
    const kost = { x: kol.x + kg.x * D.golen * h, y: kol.y + kg.y * D.golen * h };
    return { kol, st: stopa(kost, s, h) };
  };
  const A = noga(p.uA, p.kA, p.sA), B = noga(p.uB, p.kB, p.sB);
  const dol = Math.max(A.st.palce.y, A.st.pieta.y, B.st.palce.y, B.st.pieta.y, A.kol.y + 0.03 * h, B.kol.y + 0.03 * h);
  const by = (-dol - p.lot * h) * (1 - p.wis) + -p.wisY * h * p.wis;
  const prz = (q: Pkt): Pkt => ({ x: q.x, y: q.y + by });
  const przS = (s: Stopa): Stopa => ({ kat: s.kat, kostka: prz(s.kostka), podeszwa: prz(s.podeszwa), palce: prz(s.palce), pieta: prz(s.pieta) });

  const biodro = { x: 0, y: by };
  const katT = p.tulow;
  const kt = { x: sin(katT), y: -cos(katT) };                 // tułów w górę, pochylony do przodu
  const dlT = D.tulow * h * (1 + p.oddech * 0.012);
  const bark = { x: biodro.x + kt.x * dlT, y: biodro.y + kt.y * dlT };
  const barkB = { x: bark.x - 0.016 * h, y: bark.y + 0.004 * h };
  const szyja = { x: bark.x + kt.x * D.szyja * h, y: bark.y + kt.y * D.szyja * h };
  const katG = katT + p.glowa * 0.6;
  const rg = D.glowa * h;
  const glowa = { x: szyja.x + sin(katG) * rg * 0.82 + rg * 0.06, y: szyja.y - cos(katG) * rg * 0.82 };

  const reka = (z: Pkt, r: number, e: number): [Pkt, Pkt, number] => {
    const ar = r + p.tulow * 0.5, af = ar + e;
    const lok = { x: z.x + sin(ar) * D.ramie * h, y: z.y + cos(ar) * D.ramie * h };
    return [lok, { x: lok.x + sin(af) * D.przed * h, y: lok.y + cos(af) * D.przed * h }, af];
  };
  const [lokA, dlonA, przedA] = reka(bark, p.rA, p.eA);
  let lokB: Pkt, dlonB: Pkt, przedB: number;
  if (tryb.oburacz) {
    // dalsza dłoń chwyta trzonek niżej — tam, skąd narzędzie wychodzi z bliższej dłoni ku tyłowi
    const cel = { x: dlonA.x - sin(p.narz) * tryb.chwyt * h, y: dlonA.y - cos(p.narz) * tryb.chwyt * h };
    [lokB, dlonB] = ik(barkB, cel, D.ramie * h, D.przed * h);
    przedB = katOdc(lokB, dlonB);
  } else [lokB, dlonB, przedB] = reka(barkB, p.rB, p.eB);

  return {
    h, biodro, bark, barkB, szyja, glowa, rg, katT, katG,
    kolA: prz(A.kol), kolB: prz(B.kol), stA: przS(A.st), stB: przS(B.st),
    lokA, dlonA, lokB, dlonB, przedA, przedB, narz: p.narz,
  };
}
