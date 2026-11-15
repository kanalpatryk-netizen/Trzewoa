/**
 * Cerber jako boss (Krąg Trzeci, beta): poza z bieżącego stanu walki (sim/walka.ts — te same ruchy co dawny demon,
 * odegrane psem: ciosy to kłapnięcia jednej z trzech głów, zgniecenie — wszystkich trzech, tupnięcie i uderzenie
 * w ziemię — stanięcie dęba, tchnienie — ogień ze środkowej paszczy, bicz — smagnięcie wężowym ogonem, szarża —
 * przysiad i skok, ryk — trzy głowy wyją w górę). Okup (sim/krag.ts): głowy spuszczone, żrą.
 */
import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import { RUCHY_BOSSA } from '../nastawy/walka';
import { DEMON } from '../nastawy/pomnik';
import { cerberZre } from '../sim/krag';
import { pozaCerbera, type PozaCerbera, type GlowaCerbera } from './cerber';

const pamiec = new WeakMap<Creature, { x: number; czas: number; faza: number; krok: number }>();
const obetnij = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const gladko = (t: number): number => { const x = obetnij(t, 0, 1); return x * x * (3 - 2 * x); };
/** Dzwon: 0 przed a, 1 w środku, 0 po b. */
const dzwon = (u: number, a: number, b: number): number => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));

/** Kłapnięcie głowy: paszcza otwiera się przed trafieniem, zatrzaskuje w chwili trafienia (hitU), głowa wysunięta. */
function klap(g: GlowaCerbera, u: number, hitU: number): void {
  const przed = gladko((u - (hitU - 0.4)) / 0.35);
  const po = u > hitU ? gladko((u - hitU) / 0.08) : 0;
  g.paszcza = Math.max(g.paszcza, przed * (1 - po) * 1.0);
  g.wysun = Math.max(g.wysun, przed * (1 - gladko((u - hitU - 0.15) / 0.35)));
  g.pochyl += 0.25 * przed - 0.2 * dzwon(u, hitU - 0.4, hitU - 0.1);
}

export function pozaBossa(sim: Sim, c: Creature, czas: number): PozaCerbera {
  const p = pozaCerbera();
  p.czas = czas;
  let m = pamiec.get(c);
  if (!m) { m = { x: c.x, czas, faza: 0, krok: 0 }; pamiec.set(c, m); }
  const dt = Math.max(1, czas - m.czas);
  if (czas !== m.czas) {
    const v = Math.min(4, (Math.abs(c.x - m.x) / dt) * 1000);   // kafli na sekundę ekranu
    m.krok += (Math.min(1, v / 0.9) - m.krok) * Math.min(1, dt / 160);
    m.faza += (v * dt / 1000) * 2.6;
    m.x = c.x; m.czas = czas;
  }
  p.krok = m.krok; p.faza = m.faza;
  p.oddech = 0.5 + 0.5 * Math.sin(czas * 0.004 + c.id);
  const zycie = obetnij(c.hp / Math.max(1, c.hpMax ?? DEMON.hp), 0, 1);
  p.rany = (1 - zycie) * 0.95;
  p.szal = zycie < 0.25 ? 1 : 0;
  p.ogon = Math.sin(czas * 0.0013 + c.id) * 0.6;
  p.glowy.forEach((g, i) => {
    g.pochyl = 0.12 * Math.sin(czas * 0.0016 + i * 2.1) - 0.05;
    g.paszcza = 0.12 + 0.1 * Math.max(0, Math.sin(czas * 0.006 + i * 1.7));   // dyszy
  });

  const R = c.ruch;
  if (R) {
    const def = RUCHY_BOSSA[R.id as keyof typeof RUCHY_BOSSA];
    const dl = Math.max(1, R.dl || def?.dl || 100);
    const u = obetnij((sim.tick - R.od) / dl, 0, 1);
    const traf = (def?.traf ?? []).map(([t]) => t / dl);
    const hit = traf[0] ?? 0.5;
    const glowaNr = (R.od >> 3) % 3;
    switch (R.id) {
      case 'zGory': case 'zamach': case 'podciecie': case 'odepchniecie': case 'przygniecenie':
        klap(p.glowy[glowaNr], u, hit);
        if (R.id === 'zGory') p.deba = 0.35 * dzwon(u, hit - 0.45, hit + 0.05);
        if (R.id === 'odepchniecie') p.przysiad = 0.5 * dzwon(u, 0, hit);
        break;
      case 'podwojnyZamach':
        klap(p.glowy[2], u, traf[0] ?? 0.37); klap(p.glowy[0], u, traf[1] ?? 0.62);
        break;
      case 'zgniecenie':
        for (const g of p.glowy) klap(g, u, hit);
        p.przysiad = 0.4 * dzwon(u, 0, hit);
        break;
      case 'tupniecie': case 'uderzenieWZiemie': case 'wybuchAureoli':
        p.deba = gladko(u / (hit * 0.85)) * (1 - gladko((u - hit + 0.04) / 0.08));
        for (const g of p.glowy) { g.paszcza = Math.max(g.paszcza, 0.8 * dzwon(u, 0.1, hit + 0.2)); g.pochyl -= 0.4 * dzwon(u, 0.05, hit); }
        if (R.id === 'wybuchAureoli') p.szal = Math.max(p.szal, dzwon(u, hit - 0.1, hit + 0.3));
        break;
      case 'tchnienie': {
        const [od, doT] = def?.oddech ?? [84, 174];
        const g = p.glowy[1];
        g.paszcza = Math.max(g.paszcza, gladko((u - od / dl + 0.15) / 0.15));
        g.pochyl += 0.15;
        p.ogien = dzwon(u, od / dl - 0.02, doT / dl + 0.05) > 0 ? 1 : 0;
        p.glowy[0].pochyl -= 0.3; p.glowy[2].pochyl -= 0.1;
        break;
      }
      case 'biczLancucha':
        p.bicz = dzwon(u, hit - 0.35, hit + 0.25);
        p.glowy.forEach((g) => { g.pochyl -= 0.2 * p.bicz; });
        break;
      case 'szarza': {
        const [od] = def?.przemieszcza ?? [48, 104];
        p.przysiad = gladko(u / (od / dl)) * (1 - gladko((u - od / dl) / 0.08));
        if (u > od / dl) { p.krok = 1; p.faza = czas * 0.02; for (const g of p.glowy) { g.wysun = 0.6; g.paszcza = 0.9; } }
        break;
      }
      case 'ryk': case 'rozkazRzut': case 'rozkazTarcza': case 'rozkazZawal': {
        const w = R.id === 'ryk' ? dzwon(u, 0.1, 0.9) : 0.8;
        for (const g of p.glowy) { g.pochyl -= 0.75 * w; g.paszcza = Math.max(g.paszcza, w); }
        p.deba = 0.2 * w;
        break;
      }
      case 'blok':
        p.przysiad = 0.35; p.odrzut = 0.2;
        break;
      case 'zachwianie':
        p.odrzut = dzwon(u, 0, 0.7);
        p.glowy.forEach((g, i) => { g.pochyl += 0.3 * p.odrzut * (i - 1); g.paszcza = Math.max(g.paszcza, 0.5 * p.odrzut); });
        break;
    }
  }
  // okup: trzy głowy żrą rzuconą garść jedzenia
  const zre = cerberZre(sim, c);
  if (zre > 0) {
    p.glowy.forEach((g, i) => {
      g.pochyl = 0.55 + 0.08 * Math.sin(czas * 0.01 + i);
      g.paszcza = 0.15 + 0.35 * Math.abs(Math.sin(czas * 0.018 + i * 1.3));
      g.wysun = 0.15;
    });
    p.ogon = Math.sin(czas * 0.012) * 0.9;
  }
  return p;
}
