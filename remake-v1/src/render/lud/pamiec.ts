import type { Creature } from '../../sim/creatures';
import { clamp, wyj, type Pkt } from './matma';
import { kopiuj, mieszajPozy, type Poza } from './poza';

/**
 * Pamięć ruchu postaci — tylko po stronie rysunku, symulacja o niej nie wie.
 * Sprężyny (peleryna, pióropusz, kaptur, rąbek szaty, worek, wstążki) zostają z tyłu, gdy postać
 * rusza, i dociągają, gdy staje. Zmiana czynności nie przeskakuje: poza przechodzi z ostatnio
 * pokazanej w nową (kilkaset ms), a w obrębie jednej czynności ruch jest ostry — cios trafia w porę.
 */

export interface Spr { a: number; v: number }

export interface Pamiec {
  t: number; x: number; y: number;
  /** wygładzona prędkość: vx w stronę twarzy, vy w dół (kafle/s) */
  vx: number; vy: number;
  peleryna: Spr; pioro: Spr; kaptur: Spr; szata: Spr; worek: Spr; wstega: Spr;
  /** kroki na sekundę (z fazy chodu) */
  kadencja: number; faza: number;
  cz: string | null; czPoprz: string | null; czOd: number;
  zPozy: Poza | null; ostatnia: Poza | null;
  hp: number; trafionyT: number;
  /** ślad czubka broni (współrzędne postaci w ułamkach wzrostu — ta sama postać bywa rysowana w kilku wielkościach) */
  slad: { x: number; y: number; t: number }[];
  /** miejsce (w ułamkach wzrostu) i chwila ostatniego uderzenia narzędziem */
  udar: { x: number; y: number; t: number } | null;
  ciosPoprz: number;
}

const pamieci = new WeakMap<Creature, Pamiec>();

const spr = (a = 0): Spr => ({ a, v: 0 });

function nowa(c: Creature, czas: number): Pamiec {
  return {
    t: czas, x: c.x, y: c.y, vx: 0, vy: 0,
    peleryna: spr(-0.2), pioro: spr(-0.3), kaptur: spr(0), szata: spr(0), worek: spr(0), wstega: spr(-0.3),
    kadencja: 0, faza: -1,
    cz: null, czPoprz: null, czOd: -1e9, zPozy: null, ostatnia: null,
    hp: c.hp, trafionyT: -1e9, slad: [], udar: null, ciosPoprz: 0,
  };
}

function sprezyna(s: Spr, cel: number, dt: number, k: number, tl: number): void {
  // półjawny Euler w krokach po ~16 ms — stabilny przy nierównych klatkach
  const n = Math.max(1, Math.ceil(dt / 0.016));
  const h = dt / n;
  for (let i = 0; i < n; i++) { s.v += (k * (cel - s.a) - tl * s.v) * h; s.a += s.v * h; }
}

/** Pamięć postaci uaktualniona na chwilę `czas`; zwraca też krok czasu w sekundach (0 — ta sama klatka). */
export function pamiec(c: Creature, czas: number, kierunek: number, faza: number): [Pamiec, number] {
  let m = pamieci.get(c);
  if (!m) { m = nowa(c, czas); pamieci.set(c, m); return [m, 0]; }
  const dtMs = czas - m.t;
  const dx = c.x - m.x, dy = c.y - m.y;
  // skok w czasie albo w przestrzeni (wczytanie, atlas rysujący tę samą postać kilka razy) — od nowa
  if (dtMs < -1 || dtMs > 1500 || Math.hypot(dx, dy) > 4) {
    const z = nowa(c, czas); z.cz = m.cz; z.ostatnia = m.ostatnia;
    pamieci.set(c, z);
    return [z, 0];
  }
  if (dtMs <= 0) return [m, 0];
  const dt = Math.min(0.25, dtMs / 1000);
  const w = Math.min(1, dt * 7);
  m.vx += ((dx / dt) * kierunek - m.vx) * w;
  m.vy += (dy / dt - m.vy) * w;
  if (m.faza >= 0) {
    let d = faza - m.faza; if (d < 0) d += 1;
    m.kadencja += (d / dt - m.kadencja) * Math.min(1, dt * 5);
  }
  m.faza = faza;
  // trafienie, nie głód czy topienie (te odbierają po ułamku życia na tik)
  if (c.hp < m.hp - 0.8) m.trafionyT = czas;
  m.hp = c.hp;

  const pred = clamp(Math.abs(m.vx) / 4.5, 0, 1);
  const wstecz = m.vx >= 0 ? 1 : -0.5;
  const spada = clamp(m.vy / 6, 0, 1), wznosi = clamp(-m.vy / 3, 0, 1);
  sprezyna(m.peleryna, -0.18 - pred * 0.95 * wstecz - spada * 1.5 + wznosi * 0.15, dt, 34, 6);
  sprezyna(m.pioro, -0.28 - pred * 0.75 * wstecz - spada * 1.0, dt, 60, 6.5);
  sprezyna(m.kaptur, -pred * 0.55 * wstecz - spada * 0.8, dt, 48, 6.5);
  sprezyna(m.szata, -pred * 0.45 * wstecz - spada * 0.5, dt, 40, 6);
  sprezyna(m.worek, -pred * 0.35 * wstecz - spada * 0.6, dt, 30, 4.5);
  sprezyna(m.wstega, -0.35 - pred * 0.9 * wstecz - spada * 1.2, dt, 26, 4);
  m.x = c.x; m.y = c.y; m.t = czas;
  return [m, dt];
}

/** Ile trwa przejście z jednej czynności w drugą (ms). */
function dlugoscPrzejscia(z: string | null, na: string): number {
  if (!z) return 0;
  if (z === 'modli' || na === 'modli' || z === 'je' || na === 'je') return 380;
  if (na === 'walczy' || na === 'spada') return 110;
  if (z === 'spada') return 140;
  if (z === 'stoi' && na === 'idzie') return 160;
  return 220;
}

/**
 * Pokazywana poza: w czasie przejścia mieszanka ostatnio pokazanej i nowej, potem sama nowa.
 * Po spadnięciu na ziemię postać przysiada (lądowanie).
 */
export function przejscie(m: Pamiec, cz: string, p: Poza, czas: number): Poza {
  if (m.cz !== cz) {
    m.zPozy = m.ostatnia ? kopiuj(m.ostatnia) : null;
    m.czPoprz = m.cz; m.cz = cz; m.czOd = czas;
  }
  let w = p;
  const dl = dlugoscPrzejscia(m.czPoprz, cz);
  const t = dl > 0 ? (czas - m.czOd) / dl : 1;
  if (m.zPozy && t < 1) w = mieszajPozy(m.zPozy, p, wyj(t, 2));
  if (m.czPoprz === 'spada' && cz !== 'spada' && cz !== 'wspina') {
    const l = 1 - clamp((czas - m.czOd) / 320, 0, 1);
    if (l > 0) {
      const u = Math.sin(l * Math.PI * 0.5);
      w = { ...w, kA: w.kA + 0.9 * u, kB: w.kB + 0.8 * u, uA: w.uA + 0.45 * u, uB: w.uB + 0.3 * u, tulow: w.tulow + 0.35 * u, rA: w.rA + 0.5 * u, rB: w.rB - 0.4 * u };
    }
  }
  // trafiony: wzdryga się i odchyla
  const tr = 1 - clamp((czas - m.trafionyT) / 260, 0, 1);
  if (tr > 0) {
    const u = Math.sin(tr * Math.PI * 0.5);
    w = { ...w, tulow: w.tulow - 0.3 * u, glowa: w.glowa - 0.35 * u, kA: w.kA + 0.2 * u, oczy: Math.min(w.oczy, 1 - u * 0.7), wysilek: Math.max(w.wysilek, u), usta: Math.max(w.usta, 0.5 * u) };
  }
  m.ostatnia = w;
  return w;
}

/** Zapamiętuje czubek broni (do smugi cięcia) — tylko ostatnie ~110 ms. Zwraca ślad w pikselach dla wzrostu h. */
export function sladBroni(m: Pamiec, czubek: Pkt, h: number, czas: number, zapisz: boolean): Pkt[] {
  if (zapisz) {
    const ost = m.slad[m.slad.length - 1];
    if (!ost || ost.t !== czas) m.slad.push({ x: czubek.x / h, y: czubek.y / h, t: czas });
  }
  while (m.slad.length && czas - m.slad[0].t > 110) m.slad.shift();
  if (m.slad.length > 10) m.slad.splice(0, m.slad.length - 10);
  return m.slad.map((q) => ({ x: q.x * h, y: q.y * h }));
}

/** Wykrywa chwilę uderzenia (cios przechodzi przez 0,85) i zapamiętuje, gdzie trafiło. */
export function uderzenie(m: Pamiec, cios: number, gdzie: Pkt, h: number, czas: number): void {
  if (cios > 0.85 && m.ciosPoprz <= 0.85) m.udar = { x: gdzie.x / h, y: gdzie.y / h, t: czas };
  m.ciosPoprz = cios;
}
