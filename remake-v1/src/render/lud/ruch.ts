import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import type { Rola } from '../../sim/lud';
import type { Czynnosc } from '../figury';
import { clamp, cos, frac, gladko, lerp, PI, sin, szum, TAU, wej, wejWyj, wyj } from './matma';
import { klucze, mieszajPozy, nowaPoza, nowyTryb, siegnij, type Poza, type Tryb } from './poza';
import type { Pamiec } from './pamiec';

/**
 * Animacje ludu. Każda czynność daje pozę z klatek kluczowych albo z cyklu (chód, bieg, wspinaczka).
 * Ciosy mają zamach (powoli, z zatrzymaniem w górze), uderzenie (szybko), chwilę trafienia
 * i powrót — dlatego czytają się jako wysiłek, a nie machanie.
 */

export interface Wejscie {
  cz: Czynnosc; rola: Rola; czas: number; faza: number; fazaPion: number; zegar: number;
  c: Creature; m: Pamiec; sim: Sim;
}

/** Krzywa dzwonowa wokół kąta c (szerokość w). */
function dzwon(x: number, c: number, w: number): number {
  const d = ((((x - c + PI) % TAU) + TAU) % TAU) - PI;
  return Math.exp(-(d / w) * (d / w));
}

function mrugniecie(czas: number, id: number): number {
  const k = (czas + id * 977) % 4100;
  return k < 130 ? Math.abs(k - 65) / 65 : 1;
}

// ------------------------------------------------------------------ chód i bieg

/** Noga w chodzie: φ = π/2 — pięta uderza z przodu, φ = 3π/2 — palce odpychają z tyłu. */
function nogaChod(f: number, amp: number): [number, number, number] {
  const u = amp * sin(f);
  const k = 0.08 + 0.95 * Math.pow(0.5 + 0.5 * cos(f + 0.3), 2.3) + 0.12 * Math.max(0, sin((f - PI / 2) * 1.7)) * (f > PI / 2 && f < PI / 2 + PI / 1.7 ? 1 : 0);
  const s = 0.28 * dzwon(f, PI / 2 + 0.1, 0.45) - 0.62 * dzwon(f, 1.5 * PI - 0.1, 0.42) + 0.1 * dzwon(f, -0.3, 0.7);
  return [u, k, s];
}

function nogaBieg(f: number): [number, number, number] {
  const u = 0.78 * sin(f) + 0.12;
  const k = 0.28 + 1.55 * Math.pow(0.5 + 0.5 * cos(f + 0.45), 1.7);
  const s = 0.3 * dzwon(f, PI / 2, 0.5) - 0.85 * dzwon(f, 1.5 * PI, 0.5);
  return [u, k, s];
}

function chod(p: Poza, faza: number, sila: number): void {
  const q = faza * TAU;
  const amp = 0.36 + 0.14 * sila;
  [p.uA, p.kA, p.sA] = nogaChod(q, amp);
  [p.uB, p.kB, p.sB] = nogaChod(q + PI, amp);
  p.rA = -amp * 0.85 * sin(q); p.eA = 0.2 + 0.42 * Math.max(0, -sin(q));
  p.rB = amp * 0.85 * sin(q); p.eB = 0.2 + 0.42 * Math.max(0, sin(q));
  p.tulow = 0.05 + 0.07 * sila + 0.018 * cos(q * 2);
  p.glowa = -0.04 - 0.015 * cos(q * 2);
}

function bieg(p: Poza, faza: number): void {
  const q = faza * TAU;
  [p.uA, p.kA, p.sA] = nogaBieg(q);
  [p.uB, p.kB, p.sB] = nogaBieg(q + PI);
  p.rA = -0.9 * sin(q) + 0.25; p.eA = 1.45 + 0.15 * sin(q);
  p.rB = 0.9 * sin(q) + 0.25; p.eB = 1.45 - 0.15 * sin(q);
  p.tulow = 0.32 + 0.03 * cos(q * 2);
  p.glowa = -0.22;
  p.lot = 0.05 * Math.pow(Math.max(0, sin(q * 2 - 0.5)), 1.5);
  p.usta = 0.35;
}

// ------------------------------------------------------------------ ciosy

/** Kopanie kilofem (też: rycerz przebija się mieczem, robotnik walczy). */
function kopanie(p: Poza, k: number): void {
  klucze(p, k, [
    [0.0, { rA: 0.75, eA: 0.55, narz: 1.75, tulow: 0.3, glowa: 0.12, uA: 0.36, kA: 0.32, uB: -0.3, kB: 0.2, wysilek: 0.2, cios: 0 }],
    [0.4, { rA: 2.8, eA: 0.85, narz: 3.95, tulow: -0.12, glowa: -0.12, uA: 0.24, kA: 0.12, uB: -0.24, kB: 0.1, wysilek: 0.7, cios: 0 }, wejWyj],
    [0.47, { rA: 2.92, eA: 0.9, narz: 4.1, tulow: -0.16, glowa: -0.14, uA: 0.22, kA: 0.1, uB: -0.24, kB: 0.1, wysilek: 0.9, cios: 0 }, wyj],
    [0.56, { rA: 1.05, eA: 0.18, narz: 1.45, tulow: 0.52, glowa: 0.32, uA: 0.48, kA: 0.5, uB: -0.32, kB: 0.36, wysilek: 1, cios: 1 }, (t) => wej(t, 2.6)],
    [0.66, { rA: 1.0, eA: 0.2, narz: 1.42, tulow: 0.5, glowa: 0.3, uA: 0.46, kA: 0.47, uB: -0.32, kB: 0.34, wysilek: 0.8, cios: 0 }],
    [0.8, { rA: 0.82, eA: 0.45, narz: 1.65, tulow: 0.36, glowa: 0.18, uA: 0.38, kA: 0.36, uB: -0.3, kB: 0.24, wysilek: 0.4, cios: 0 }, wyj],
  ]);
  p.oczy = 1 - p.wysilek * 0.45;
}

/** Cięcie mieczem z góry (A) albo pchnięcie (B) — rycerz przeplata oba. */
function ciecie(p: Poza, k: number): void {
  klucze(p, k, [
    [0.0, { rA: 0.78, eA: 0.95, narz: 2.3, tulow: 0.12, glowa: 0.02, uA: 0.4, kA: 0.25, uB: -0.32, kB: 0.18, tarcza: 0.45, rB: 0.75, eB: 0.95, smuga: 0, cios: 0, wysilek: 0.2 }],
    [0.36, { rA: 2.9, eA: 0.9, narz: 4.1, tulow: -0.12, glowa: -0.1, uA: 0.3, kA: 0.16, uB: -0.3, kB: 0.12, tarcza: 0.8, rB: 1.0, eB: 0.75, smuga: 0, cios: 0, wysilek: 0.7 }, wejWyj],
    [0.45, { rA: 3.0, eA: 0.92, narz: 4.25, tulow: -0.15, glowa: -0.12, smuga: 0, wysilek: 0.9 }, wyj],
    [0.56, { rA: 0.62, eA: 0.12, narz: 0.95, tulow: 0.44, glowa: 0.22, uA: 0.58, kA: 0.46, uB: -0.42, kB: 0.16, tarcza: 0.5, rB: 0.7, eB: 0.9, smuga: 1, cios: 1, wysilek: 1 }, (t) => wej(t, 2.4)],
    [0.7, { rA: 0.22, eA: 0.28, narz: 0.32, tulow: 0.36, glowa: 0.18, smuga: 0, cios: 0, wysilek: 0.5 }, wyj],
  ]);
  p.oczy = 1 - p.wysilek * 0.4;
}

function pchniecie(p: Poza, k: number): void {
  klucze(p, k, [
    [0.0, { rA: 0.78, eA: 0.95, narz: 2.3, tulow: 0.12, glowa: 0.02, uA: 0.4, kA: 0.25, uB: -0.32, kB: 0.18, tarcza: 0.45, rB: 0.75, eB: 0.95, smuga: 0, cios: 0, wysilek: 0.2 }],
    [0.34, { rA: -0.35, eA: 1.95, narz: 1.62, tulow: -0.06, glowa: 0.0, uA: 0.22, kA: 0.2, uB: -0.38, kB: 0.25, tarcza: 0.9, rB: 1.05, eB: 0.6, wysilek: 0.7 }, wejWyj],
    [0.44, { rA: -0.42, eA: 2.0, narz: 1.64, tulow: -0.08, wysilek: 0.9 }, wyj],
    [0.52, { rA: 1.48, eA: 0.04, narz: 1.58, tulow: 0.42, glowa: 0.05, uA: 0.8, kA: 0.6, uB: -0.6, kB: 0.1, tarcza: 0.55, rB: 0.6, eB: 1.0, smuga: 1, cios: 1, wysilek: 1 }, (t) => wej(t, 2.2)],
    [0.68, { rA: 1.4, eA: 0.08, narz: 1.58, tulow: 0.38, smuga: 0, cios: 0, wysilek: 0.6 }],
  ]);
  p.oczy = 1 - p.wysilek * 0.4;
}

/** Pobożny: pchnięcie laską trzymaną oburącz. */
function laskaWalka(p: Poza, k: number): void {
  klucze(p, k, [
    [0.0, { rA: 0.72, eA: 0.85, narz: 1.85, tulow: 0.1, uA: 0.35, kA: 0.25, uB: -0.3, kB: 0.18, cios: 0, wysilek: 0.2 }],
    [0.38, { rA: 0.12, eA: 1.35, narz: 1.95, tulow: -0.06, uA: 0.25, kA: 0.2, uB: -0.35, kB: 0.25, cios: 0, wysilek: 0.7 }, wejWyj],
    [0.5, { rA: 1.12, eA: 0.12, narz: 1.42, tulow: 0.4, uA: 0.72, kA: 0.55, uB: -0.55, kB: 0.12, cios: 1, wysilek: 1 }, (t) => wej(t, 2.2)],
    [0.66, { rA: 1.08, eA: 0.16, narz: 1.45, tulow: 0.36, cios: 0, wysilek: 0.5 }],
  ]);
}

/** Klęczy i stuka młotkiem (stawia ołtarz). */
function budowa(p: Poza, k: number): void {
  p.uA = 1.3; p.kA = 1.5; p.sA = 0; p.uB = 0.14; p.kB = 1.68; p.sB = -0.9;
  klucze(p, k, [
    [0.0, { rA: 0.95, eA: 0.45, narz: 1.35, tulow: 0.38, glowa: 0.32, cios: 0 }],
    [0.42, { rA: 1.5, eA: 1.6, narz: 2.9, tulow: 0.3, glowa: 0.3, cios: 0 }, wejWyj],
    [0.52, { rA: 0.95, eA: 0.4, narz: 1.3, tulow: 0.42, glowa: 0.35, cios: 1 }, (t) => wej(t, 2.4)],
    [0.62, { rA: 0.95, eA: 0.45, narz: 1.35, tulow: 0.4, cios: 0 }],
  ]);
  p.rB = 0.95; p.eB = 0.35;
}

// ------------------------------------------------------------------ czynności

export function animuj(w: Wejscie): { p: Poza; tryb: Tryb } {
  const { cz, rola, czas, c, m, sim } = w;
  const id = c.id;
  let p = nowaPoza();
  const tryb = nowyTryb();
  p.oddech = sin(czas * 0.0021 + id) * 0.5 + 0.5;
  p.oczy = mrugniecie(czas, id);
  const sila = clamp(m.kadencja / 3.2, 0, 1);
  const niesie = c.carry > 0 && rola === 'robotnik';

  // narzędzie w dłoni: robotnik — kilof tylko przy pracy; pobożny — laska; rycerz — miecz, chowa go przy wspinaczce i jedzeniu
  if (rola === 'rycerz') tryb.narzedzie = cz === 'wspina' || cz === 'spada' || cz === 'je' || cz === 'spi' || cz === 'buduje' ? null : 'miecz';
  else if (rola === 'pobozny') tryb.narzedzie = cz === 'stoi' || cz === 'idzie' || cz === 'biegnie' || cz === 'walczy' ? 'laska' : cz === 'buduje' ? 'mlot' : null;
  else tryb.narzedzie = cz === 'kopie' || cz === 'walczy' ? 'kilof' : cz === 'buduje' ? 'mlot' : null;

  switch (cz) {
    case 'stoi': {
      const wg = szum(czas * 0.00042, id);
      p.uA = 0.04 + 0.03 * wg; p.kA = 0.06 + 0.07 * Math.max(0, wg);
      p.uB = -0.06 + 0.03 * wg; p.kB = 0.05 + 0.07 * Math.max(0, -wg);
      p.tulow = 0.03 + 0.02 * wg + p.oddech * 0.01;
      p.glowa = 0.06 * szum(czas * 0.0003, id + 5);
      p.rA = 0.07 + p.oddech * 0.03; p.eA = 0.24; p.rB = -0.05 - p.oddech * 0.02; p.eB = 0.22;
      if (rola === 'rycerz') { p.rA = 0.22; p.eA = 0.62; p.narz = 0.48 + 0.04 * wg; p.rB = 0.45; p.eB = 1.05; p.tarcza = 0.15; p.uA = 0.12; p.uB = -0.12; }
      if (rola === 'pobozny') { p.rA = 0.34; p.eA = 0.75; p.narz = 0.05 + 0.02 * wg; }
      // drobne gesty co kilka sekund
      const f = frac(czas * 0.00011 + id * 0.43);
      if (f > 0.9) {
        const t = sin(((f - 0.9) / 0.1) * PI);
        const g: Partial<Poza> =
          rola === 'robotnik' ? (id % 2 ? { rA: 1.95, eA: 1.3, glowa: -0.15 } : { rA: -0.65, eA: 1.6, rB: -0.7, eB: 1.5, tulow: -0.24, glowa: -0.22 })
          : rola === 'pobozny' ? { rB: 0.45, eB: 1.75, glowa: 0.38, tulow: 0.08 }
          : { rA: 0.95, eA: 1.75, narz: 3.05, glowa: 0.05 };
        for (const k in g) { const kk = k as keyof Poza; p[kk] = lerp(p[kk], g[kk]!, t); }
      }
      break;
    }
    case 'idzie': {
      chod(p, w.faza, sila);
      if (rola === 'rycerz') { const q = w.faza * TAU; p.rA = 0.24 - 0.12 * sin(q); p.eA = 0.6; p.narz = 0.75 - 0.12 * sin(q); p.rB = 0.48 + 0.05 * sin(q); p.eB = 1.0; p.tarcza = 0.2; }
      if (rola === 'pobozny') {
        // szata do ziemi — krótszy krok
        const q = w.faza * TAU; p.uA *= 0.72; p.uB *= 0.72; p.kA *= 0.85; p.kB *= 0.85;
        p.rA = 0.4 + 0.2 * sin(q); p.eA = 0.6; p.narz = 0.06 - 0.16 * sin(q + 0.4);
      }
      break;
    }
    case 'biegnie': {
      bieg(p, w.faza);
      if (rola === 'rycerz') { p.rA = 0.55; p.eA = 1.2; p.narz = 2.0; p.rB = 0.7; p.eB = 1.1; p.tarcza = 0.4; }
      if (rola === 'pobozny') { const q = w.faza * TAU; p.uA *= 0.8; p.uB *= 0.8; p.rA = 0.55 + 0.25 * sin(q); p.eA = 0.9; p.narz = -0.5; }
      break;
    }
    case 'kopie': {
      const k = frac(w.zegar * 1.1 + id * 0.13);
      kopanie(p, k);
      if (rola === 'robotnik') { tryb.oburacz = true; tryb.chwyt = 0.085; }
      else { p.rB = 0.3; p.eB = 0.7; p.tarcza = 0.2; }
      break;
    }
    case 'buduje': {
      budowa(p, frac(w.zegar * 1.6 + id * 0.13));
      break;
    }
    case 'walczy': {
      if (rola === 'rycerz') {
        const z = w.zegar * 1.25 + id * 0.31, k = frac(z);
        if (Math.floor(z) % 2 === 0) ciecie(p, k); else pchniecie(p, k);
      } else if (rola === 'robotnik') {
        kopanie(p, frac(w.zegar * 1.5 + id * 0.31));
        tryb.oburacz = true; tryb.chwyt = 0.085;
      } else {
        laskaWalka(p, frac(w.zegar * 1.5 + id * 0.31));
        tryb.oburacz = true; tryb.chwyt = 0.13;
      }
      break;
    }
    case 'modli': {
      // klęczy: bliższa noga przed sobą (stopa płasko), dalsza kolanem w ziemi, palce podwinięte
      p.uA = 1.32; p.kA = 1.48; p.sA = 0; p.uB = 0.12; p.kB = 1.66; p.sB = -1.0;
      p.tulow = 0.12 + p.oddech * 0.025; p.glowa = 0.48 + p.oddech * 0.03;
      if (rola === 'rycerz') {
        // miecz jak krzyż: ostrze w ziemi, dłonie na jelcu przed twarzą
        p.tulow = 0.06; p.glowa = 0.4;
        siegnij(p, 'A', 0.15, 0.06); siegnij(p, 'B', 0.14, 0.07);
        p.narz = 0.02; p.tarcza = 0;
        break;
      }
      const bow = { ...p };
      siegnij(bow, 'A', 0.12, 0.075); siegnij(bow, 'B', 0.115, 0.08);
      const cykl = frac(czas * 0.00016 + id * 0.37);
      const wz = rola === 'pobozny'
        ? (cykl > 0.68 ? gladko((cykl - 0.68) / 0.08) * (1 - gladko((cykl - 0.9) / 0.08)) : 0)
        : (cykl > 0.8 ? gladko((cykl - 0.8) / 0.06) * (1 - gladko((cykl - 0.9) / 0.06)) : 0);
      const orant: Poza = { ...bow, rA: 2.45, eA: 0.3, rB: 2.3, eB: 0.35, glowa: -0.42, tulow: -0.08 };
      if (rola === 'robotnik') { orant.rA = bow.rA; orant.eA = bow.eA; orant.rB = bow.rB; orant.eB = bow.eB; }
      p = mieszajPozy(bow, orant, wz);
      p.blask = rola === 'pobozny' ? 0.35 + wz * 0.65 : wz * 0.4;
      p.oczy = wz > 0.5 ? 1 : 0.15;
      tryb.zlozone = wz < 0.35;
      break;
    }
    case 'czyta': {
      const blysk = c.ksiegaT !== undefined ? clamp(1 - (sim.tick - c.ksiegaT) / 60, 0, 1) : 0;
      const pch = wyj(blysk, 3);
      p.tulow = -0.04 + p.oddech * 0.02 - pch * 0.08; p.glowa = 0.18 - pch * 0.3;
      p.uA = 0.2 + pch * 0.2; p.kA = 0.1; p.uB = -0.18; p.kB = 0.12;
      siegnij(p, 'A', 0.17 + pch * 0.09, 0.0 - pch * 0.08); siegnij(p, 'B', 0.15 + pch * 0.09, 0.02 - pch * 0.08);
      p.blask = 0.45 + 0.15 * sin(czas * 0.006) + blysk * 0.55;
      p.usta = 0.25 + 0.2 * Math.max(0, sin(czas * 0.012 + id));
      tryb.ksiega = true;
      break;
    }
    case 'je': {
      p.uA = 1.45; p.kA = 2.35; p.sA = 0; p.uB = 1.2; p.kB = 2.25; p.sB = -0.3; p.tulow = 0.26; p.glowa = 0.12;
      const gryz = frac(czas * 0.0011 + id * 0.21);
      const doUst = gryz < 0.3 ? wejWyj(gryz / 0.3) : gryz < 0.62 ? 1 : 1 - wejWyj((gryz - 0.62) / 0.38);
      siegnij(p, 'A', lerp(0.17, 0.11, doUst), lerp(0.16, -0.04, doUst));
      siegnij(p, 'B', 0.15, 0.17);
      p.glowa = lerp(0.14, 0.02, doUst);
      p.usta = doUst > 0.9 ? 0.25 + 0.25 * Math.abs(sin(czas * 0.022)) : 0;
      p.oczy = doUst > 0.9 ? 0.6 : p.oczy;
      tryb.grzyb = true;
      break;
    }
    case 'wspina': {
      const q = w.fazaPion * TAU;
      p.wis = 1; p.wisY = 0.47 + 0.015 * sin(q * 2);
      p.rA = 2.88 + 0.28 * sin(q); p.eA = 0.42 - 0.38 * sin(q);
      p.rB = 2.88 + 0.28 * sin(q + PI); p.eB = 0.42 - 0.38 * sin(q + PI);
      p.uA = 0.72 + 0.42 * sin(q + PI); p.kA = 1.3 + 0.3 * sin(q + PI); p.sA = 0.3;
      p.uB = 0.72 + 0.42 * sin(q); p.kB = 1.3 + 0.3 * sin(q); p.sB = 0.3;
      p.tulow = 0.1 + 0.03 * sin(q * 2); p.glowa = -0.42;
      p.wysilek = 0.5;
      break;
    }
    case 'spada': {
      const t = czas * 0.011;
      p.wis = 1; p.wisY = 0.5;
      p.rA = 2.4 + 0.6 * szum(t, id); p.eA = 0.55 + 0.4 * szum(t * 1.3, id + 1);
      p.rB = 2.1 + 0.6 * szum(t, id + 3); p.eB = 0.6 + 0.4 * szum(t * 1.2, id + 4);
      p.uA = 0.55 + 0.35 * szum(t * 0.9, id + 5); p.kA = 1.0 + 0.4 * szum(t, id + 6); p.sA = 0.4;
      p.uB = -0.1 + 0.3 * szum(t * 0.8, id + 7); p.kB = 0.8 + 0.3 * szum(t, id + 8); p.sB = 0.3;
      p.tulow = -0.15; p.glowa = -0.35; p.oczy = 1; p.usta = 0.9;
      break;
    }
    case 'spi': {
      tryb.lezy = true; p.oczy = 0;
      p.uA = 0.25; p.kA = 0.5; p.uB = 0.1; p.kB = 0.4; p.rA = 0.6; p.eA = 1.2; p.rB = 0.3; p.eB = 1.0; p.glowa = 0.1;
      break;
    }
    default: break;
  }

  // tragarz: worek na plecach, bliższa dłoń na rzemieniu przy barku
  if (niesie && (cz === 'stoi' || cz === 'idzie' || cz === 'biegnie')) { p.rA = -0.32; p.eA = 2.35; p.tulow += 0.06; }
  // świeżo przywołany (osłabiony) — zgarbiony; zatruty — chwieje się
  if ((c.slabyDo ?? -1) > sim.tick) { p.tulow += 0.1; p.glowa += 0.12; }
  if ((c.zatrutyDo ?? -1) > sim.tick) { p.tulow += 0.05 * sin(czas * 0.003 + id); p.oczy = Math.min(p.oczy, 0.7); }
  if (p.cios > 0) p.oczy = Math.min(p.oczy, 0.5);
  return { p, tryb };
}
