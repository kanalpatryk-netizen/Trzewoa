/**
 * DEMON Z POMNIKA — ŻYCIE BOSSA (Alpha 1, 5.11). Kukła z render/demon-kukla.ts poruszana stanem gry:
 *  - zawsze: oddech (szybszy, gdy ranny i w szale), drobne ruchy dłoni, kołysanie przepaski, mrugnięcia, warczenie,
 *    głowa śledzi cel albo się rozgląda;
 *  - ruch: ciężki chód (stopa w górę, tupnięcie, pył spod stóp), w pionie i w skale — lot z wiszącymi nogami
 *    (w skale prześwituje i sypie się z niej żwir); przy celu — postawa do walki;
 *  - cios (sim: ciosT, co DEMON.ciosCo) w trzech odmianach: cios z góry, zamach pazurami (smuga ognia) i podcięcie
 *    od dołu — zamach zaczyna się przed uderzeniem (gra wie, kiedy minie przerwa), uderzenie trafia w tik ciosu;
 *  - uderzenie w ziemię (sim: zasypT, zasypuje drogę wiernych): ręce w górę z rykiem, przysiad i obie pięści
 *    w ziemię — fala, pył, gruz ze stropu, żarzące się pęknięcia podłogi;
 *  - ryk: po wstaniu z gruzu, gdy wpada w szał, po zabiciu celu i co jakiś czas, gdy nikogo nie widzi;
 *  - rozkazy dla dłoni z otchłani (sim/dlon-demona.ts): wskazuje rycerza i zaciska dłoń (chwyt), unosi i ciska
 *    (rzut), krzyżuje ręce (tarcza; za nią się śmieje), drze strop pazurami i ściąga go w dół (zawał);
 *    za ścianą gruzu wali się w piers;
 *  - modlitwa wiernych: kuli się, zasłania twarz, drży, żyły świecą złotem, pada na niego złoty pył, z rys bucha para;
 *    bez modlitwy się zrasta — czerwone iskry wpływają mu w piers, a żar pulsuje jak serce;
 *  - rany: pęknięcia odsłaniają się w czterech stopniach, garbi się, kuleje, dymi; poniżej ćwierci życia — szał:
 *    drży, oczy płoną smugą, aureola bucha;
 *  - oberwanie (spadek życia): wstrząs, odrzucona głowa, biały błysk, odpryski i iskry.
 * Wstawanie z gruzu i konanie to osobne sceny (rysujWstajacegoKukla, rysujKonajacegoKukla — także ryciny w atlasie).
 * Animacje zdarzeń idą tikami gry (120 na sekundę), oddech i ogień — zegarem ekranu.
 */
import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import { DEMON, POMNIK } from '../nastawy/pomnik';
import { SNIACY_KAMIEN as K } from '../nastawy/boss';
import { DLON } from '../nastawy/dlon';
import { RACES } from '../sim/races';
import { aktywnyBoss } from '../sim/boss';
import { demonCzeka, scianaGruzu } from '../sim/dlon-demona';
import { ustawienia } from '../core/settings-store';
import { wolnoRuszac } from './nastroj';
import {
  rysujKukle, kuklaGotowa, spoczynek, dodaj, wygladZywy, szum, hasz, skalaKukly, zloz, naPunkt, nowyStanLancuchow, PUNKTY_KUKLY,
  ZIEMIA_KUKLY, SRODEK_KUKLY,
  type PozaKukly, type RuchKukly, type WygladKukly, type KosciKukly, type StanLancuchow, type P, type CzescDemona, type Odpad,
} from './demon-kukla';
import { CZESCI_DEMONA } from './demon-czesci';

const TPS = 120;
/** Cel nadgarstka (przesunięcie od spoczynku) dla punktu w układzie tułowia. */
function doNadgarstka(b: 'L' | 'P', x: number, y: number): P {
  const w = b === 'L' ? PUNKTY_KUKLY.nadgarstekL : PUNKTY_KUKLY.nadgarstekP;
  return [x - w[0], y - w[1]];
}
/** Zamach i powrót po ciosie, po uderzeniu w ziemię; ryk (tiki). */
const ZAMACH = 40, PO_CIOSIE = 70, ZASYP_ZAMACH = 84, ZASYP_PO = 120, RYK = 120;

const gl = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const zakres = (k: number, a: number, b: number): number => gl((k - a) / (b - a));
const dzwon = (k: number, a: number, b: number): number => (k <= a || k >= b ? 0 : Math.sin(Math.PI * (k - a) / (b - a)));
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const obetnij = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

// ---------- klatki kluczowe ----------

type Klatki = [number, RuchKukly][];
function mieszaj(a: RuchKukly, b: RuchKukly, u: number): RuchKukly {
  const out: Record<string, number | P> = {};
  const A = a as Record<string, number | P | undefined>, B = b as Record<string, number | P | undefined>;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = A[k], vb = B[k];
    if (Array.isArray(va) || Array.isArray(vb)) {
      const x = (va as P | undefined) ?? [0, 0], y = (vb as P | undefined) ?? [0, 0];
      out[k] = [mix(x[0], y[0], u), mix(x[1], y[1], u)];
    } else out[k] = mix((va as number | undefined) ?? 0, (vb as number | undefined) ?? 0, u);
  }
  return out as RuchKukly;
}
function klatki(kl: Klatki, t: number): RuchKukly {
  if (t <= kl[0][0]) return kl[0][1];
  for (let i = 1; i < kl.length; i++) {
    if (t <= kl[i][0]) return mieszaj(kl[i - 1][1], kl[i][1], gl((t - kl[i - 1][0]) / (kl[i][0] - kl[i - 1][0])));
  }
  return kl[kl.length - 1][1];
}

// ---------- ruchy ----------

/** Cios prawą (bliższą celowi) ręką; `tau` — tiki od uderzenia (ujemne: zamach), `cel` — przesunięcie nadgarstka do celu. */
function ruchCiosu(wariant: number, tau: number, cel: P): RuchKukly {
  const [ax, ay] = cel;
  if (wariant === 0) {
    // cios z góry: ręka nad głowę, odchylenie — i w dół na cel
    return klatki([
      [-ZAMACH, {}],
      [-9, { rP: [-130, -236], dP: -0.55, bP: -12, tr: -0.08, gr: -0.13, szczeka: 0.55, rL: [70, 110], my: 14, aureola: 0.07 }],
      [0, { rP: [ax, ay + 24], dP: 0.65, tr: 0.21, gr: 0.11, szczeka: 1.05, rL: [24, 64], my: 44, mx: 22, aureola: 0.13 }],
      [14, { rP: [ax + 12, ay + 34], dP: 0.6, tr: 0.19, gr: 0.08, szczeka: 0.7, rL: [24, 64], my: 38, mx: 18 }],
      [PO_CIOSIE, {}],
    ], tau);
  }
  if (wariant === 1) {
    // zamach pazurami: ręka przez piers na drugą stronę i łukiem przez cel
    return klatki([
      [-ZAMACH, {}],
      [-12, { rP: [-286, -36], dP: -1.05, tr: -0.13, tsx: -0.03, gr: -0.06, rL: [-30, 50], szczeka: 0.3, my: 20 }],
      [-4, { rP: [-60, 190], dP: -0.3, tr: -0.02, rL: [-40, 30], szczeka: 0.6, my: 26 }],
      [0, { rP: [ax, ay], dP: 0.45, tr: 0.16, rL: [-62, -18], szczeka: 0.95, my: 30, aureola: 0.1 }],
      [11, { rP: [ax + 90, ay - 70], dP: 0.95, tr: 0.21, rL: [-62, -18], szczeka: 0.7, my: 26 }],
      [PO_CIOSIE, {}],
    ], tau);
  }
  // podcięcie: przysiad, ręka nisko — i wybuch w górę przez cel
  return klatki([
    [-ZAMACH, {}],
    [-13, { my: 62, rP: [-30, 520], dP: 0.95, tr: 0.15, gr: 0.13, rL: [60, 80], szczeka: 0.2, nL: [-10, 0], nP: [10, 0] }],
    [0, { rP: [ax + 40, ay - 160], dP: -0.65, tr: -0.11, my: -8, gr: -0.16, szczeka: 1.15, rL: [-40, 40], aureola: 0.14 }],
    [12, { rP: [100, -226], dP: -0.8, tr: -0.13, my: -4, gr: -0.14, szczeka: 0.8, rL: [-40, 40] }],
    [PO_CIOSIE, {}],
  ], tau);
}

/** Uderzenie w ziemię; `tau` — tiki od uderzenia. `my` przysiadu przelicza cele dłoni na ziemię. */
function ruchZasypu(tau: number): RuchKukly {
  const MY = 150;
  const naZiemi = (x: number, y: number, b: 'L' | 'P'): P => {
    const w = b === 'L' ? PUNKTY_KUKLY.nadgarstekL : PUNKTY_KUKLY.nadgarstekP;
    return [x - w[0], y - MY - w[1]];
  };
  return klatki([
    [-ZASYP_ZAMACH, {}],
    [-40, { rL: [100, -262], rP: [-100, -262], dL: -0.3, dP: 0.3, my: -16, gr: -0.22, gy: -4, szczeka: 1.25, aureola: 0.2, tsy: 0.03, bL: -14, bP: -14 }],
    [-26, { rL: [96, -270], rP: [-96, -270], dL: -0.25, dP: 0.25, my: -18, gr: -0.2, szczeka: 1.3, aureola: 0.22, tsy: 0.035, bL: -14, bP: -14 }],
    [-6, { rL: [140, 190], rP: [-140, 190], my: 50, gr: 0.05, szczeka: 0.9, aureola: 0.1 }],
    [0, { rL: naZiemi(190, 902, 'L'), rP: naZiemi(440, 902, 'P'), dL: 0.6, dP: -0.6, my: MY, tsy: -0.1, gy: 16, gr: 0.2, szczeka: 0.7, nL: [-34, 0], nP: [34, 0], aureola: 0.08 }],
    [36, { rL: naZiemi(190, 902, 'L'), rP: naZiemi(440, 902, 'P'), dL: 0.6, dP: -0.6, my: MY - 12, tsy: -0.09, gy: 14, gr: 0.16, szczeka: 0.5, nL: [-34, 0], nP: [34, 0] }],
    [ZASYP_PO, {}],
  ], tau);
}

function ruchRyku(tau: number): RuchKukly {
  return klatki([
    [0, {}],
    [18, { my: 10, tsy: -0.03, gr: 0.09, bL: -9, bP: -9, szczeka: 0.1, rL: [20, 30], rP: [-20, 30] }],
    [30, { gr: -0.25, gy: -6, szczeka: 1.45, tsy: 0.03, rL: [-72, 84], rP: [72, 84], dL: -0.55, dP: 0.55, aureola: 0.15, my: 6 }],
    [88, { gr: -0.22, gy: -5, szczeka: 1.35, tsy: 0.025, rL: [-64, 76], rP: [64, 76], dL: -0.45, dP: 0.45, aureola: 0.12, my: 6 }],
    [RYK, {}],
  ], tau);
}

/** Postawa do walki: przysiad, pochylenie ku celowi, ręce przed sobą. */
const RUCH_WALKI: RuchKukly = { my: 22, tsy: -0.015, tr: 0.04, gy: 6, rP: [30, 50], rL: [-10, 30], nL: [-14, 0], nP: [14, 0], szczeka: 0.12 };
/** Rany: garbi się, lewa ręka zwisa. */
const RUCH_GARBU: RuchKukly = { tsy: -0.03, gy: 6, gr: 0.05, rL: [0, 40], my: 10 };

/** Ciężki chód: `faza` w cyklach (dwa kroki na cykl), `kul` — lewa noga podnosi się słabiej (ranny). */
function ruchChodu(faza: number, kul: number): RuchKukly {
  const a = faza * Math.PI * 2, sa = Math.sin(a);
  const liftL = Math.pow(Math.max(0, sa), 1.3) * kul, liftP = Math.pow(Math.max(0, -sa), 1.3);
  return {
    nL: [-6 * liftL, -46 * liftL], nP: [6 * liftP, -46 * liftP], sL: -0.12 * liftL, sP: 0.12 * liftP,
    mx: 16 * sa, my: 10 * (1 - Math.abs(sa)) - 4, mr: 0.04 * sa, tr: -0.03 * sa, gr: 0.02 * sa, rL: [0, 16 * sa], rP: [0, -16 * sa], obrot: 0.03,
  };
}
/** Lot (w pionie i w skale): nogi zwisają, palce stóp w dół, ręce rozłożone, kołysze się. */
const ruchLotu = (t: number): RuchKukly => ({
  nL: [18, -40], nP: [-18, -40], sL: -0.35, sP: 0.35, my: -10, rL: [-30, -34], rP: [30, -34], aureola: 0.08,
  y: 7 * Math.sin(t * 2.2), przepaska: 0.03 * Math.sin(t * 1.7),
});
/** Modlitwa wiernych: kuli się, zasłania twarz lewą ręką, drży. */
const ruchModlitwy = (t: number, ruch: number): RuchKukly => ({
  rL: doNadgarstka('L', 336, 118), dL: 0.95, gr: 0.17, gy: 10, tr: -0.06, tsy: -0.03, rP: [30, 140], my: 16,
  mx: 2.5 * ruch * Math.sin(t * 83),
});


/** Rozkaz dla dłoni z otchłani: gest wg akcji i fazy (u — postęp fazy 0…1), `cel` — punkt celu (piksele rysunku). */
function ruchRozkazu(akcja: string, faza: string, u: number, t: number, cel: P): RuchKukly {
  const wskaz = doNadgarstka('P', Math.min(760, cel[0]), 860);
  if (akcja === 'rzut') {
    if (faza === 'wstaje') return { rP: wskaz, dP: 0.85, rL: [30, -130], dL: -0.3, gr: 0.1, szczeka: 0.3, tr: 0.06 };
    if (faza === 'chwyta') return { rP: [wskaz[0] - 30, wskaz[1] - 50 * u], dP: 0.85 + 0.6 * u, rL: [30, -130], gr: 0.1, szczeka: 0.5, tr: 0.06 };
    if (faza === 'unosi') return { rP: [wskaz[0] - 30, mix(wskaz[1] - 50, 60, gl(u))], dP: 1.45, rL: [30, -130], gr: mix(0.1, -0.12, u), szczeka: 0.7, tr: 0.04 };
    if (faza === 'rzuca') return { rP: [mix(wskaz[0] - 30, -130, gl(u * 1.6)), mix(60, -240, gl(u * 1.6))], dP: mix(1.45, -0.6, gl(u * 1.6)), rL: [30, -100], gr: -0.14, szczeka: 1.1, tr: -0.08 };
    return {};
  }
  if (akcja === 'tarcza') {
    const smiech = faza === 'stoi' ? Math.abs(Math.sin(t * 14)) : 0;
    return {
      rL: doNadgarstka('L', 402, 304), rP: doNadgarstka('P', 228, 300), dL: 0.95, dP: -0.95, gr: 0.1, gy: 6 + 3 * smiech, my: 20,
      szczeka: 0.25 + 0.35 * smiech, tsy: -0.01 * smiech,
    };
  }
  if (akcja === 'zawal') {
    if (faza === 'wstaje') return { rL: [80, -252], rP: [-80, -252], dL: -0.3, dP: 0.3, gr: -0.26, szczeka: 0.4, bL: -12, bP: -12 };
    if (faza === 'drze') return {
      rL: [80 + 30 * Math.sin(t * 11), -240 + 40 * Math.sin(t * 13)], rP: [-80 + 30 * Math.sin(t * 12 + 1), -240 + 40 * Math.sin(t * 11 + 2)],
      dL: -0.3 + 0.4 * Math.sin(t * 9), dP: 0.3 - 0.4 * Math.sin(t * 10), gr: -0.24, szczeka: 0.85, bL: -12, bP: -12,
    };
    if (faza === 'wali') return { rL: [150, 200], rP: [-150, 200], my: 40, gr: 0.08, szczeka: 1.0 };
  }
  return {};
}

/** Długość fazy dłoni (tiki). */
function dlugoscFazy(akcja: string, faza: string): number {
  const D = DLON.demon as unknown as Record<string, Record<string, number>>;
  return Math.max(1, D[akcja]?.[faza] ?? 60);
}

// ---------- cząstki ----------

type Typ = 'pyl' | 'dym' | 'gruz' | 'iskra' | 'zar' | 'zloto' | 'popiol' | 'fala' | 'krag' | 'szczelina' | 'para';
interface Czastka {
  typ: Typ; x: number; y: number; vx: number; vy: number; t: number; dl: number; r: number;
  kat: number; w: number; ziemia: number; ziarno: number; cel?: P;
}
const MAKS_CZASTEK = 320;

function dodajCzastke(p: Pamiec, c: Partial<Czastka> & { typ: Typ; x: number; y: number }): void {
  if (p.czastki.length >= MAKS_CZASTEK) p.czastki.shift();
  p.czastki.push({ vx: 0, vy: 0, t: 0, dl: 1, r: 0.1, kat: 0, w: 0, ziemia: 1e9, ziarno: Math.random(), ...c });
}

function krokCzastek(p: Pamiec, dt: number): void {
  const out: Czastka[] = [];
  for (const q of p.czastki) {
    q.t += dt;
    if (q.t >= q.dl) continue;
    switch (q.typ) {
      case 'gruz':
        q.vy += 18 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.kat += q.w * dt;
        if (q.y > q.ziemia) { q.y = q.ziemia; q.vy *= -0.28; q.vx *= 0.55; q.w *= 0.5; if (Math.abs(q.vy) < 0.4) q.vy = 0; }
        break;
      case 'iskra': q.vy += 9 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.985; if (q.y > q.ziemia) { q.y = q.ziemia; q.vy *= -0.3; } break;
      case 'zar': q.x += (q.vx + Math.sin(q.t * 5 + q.ziarno * 9) * 0.4) * dt; q.y += q.vy * dt; break;
      case 'zloto':
        if (q.cel) { q.vx += (q.cel[0] - q.x) * 2.2 * dt; q.vy += (q.cel[1] - q.y) * 2.2 * dt; q.vx *= 0.96; q.vy *= 0.96; }
        q.x += q.vx * dt; q.y += q.vy * dt; break;
      case 'popiol': q.x += (q.vx + Math.sin(q.t * 3 + q.ziarno * 7) * 0.3) * dt; q.y += q.vy * dt; q.kat += q.w * dt; break;
      default: q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97;
    }
    out.push(q);
  }
  p.czastki = out;
}

/** Rysuje cząstki (`tyl` — za postacią). Układ: stopy w (0, 0), bez odwrócenia zwrotu; z — piksele na kafel. */
function rysujCzastki(ctx: CanvasRenderingContext2D, p: Pamiec, ox: number, oy: number, z: number, tyl: boolean): void {
  for (const q of p.czastki) {
    const zaPostacia = q.typ === 'dym' || q.typ === 'para';
    if (zaPostacia !== tyl) continue;
    const u = q.t / q.dl, x = (q.x - ox) * z, y = (q.y - oy) * z, r = Math.max(0.8, q.r * z);
    switch (q.typ) {
      case 'pyl': case 'dym': case 'para': {
        const rr = r * (1 + 1.6 * u);
        const a = (q.typ === 'pyl' ? 0.34 : q.typ === 'dym' ? 0.3 : 0.22) * Math.pow(1 - u, 1.4) * Math.min(1, u * 8);
        const kol = q.typ === 'pyl' ? '112,100,88' : q.typ === 'dym' ? '38,32,30' : '236,226,206';
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, `rgba(${kol},${a})`); g.addColorStop(1, `rgba(${kol},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        break;
      }
      case 'gruz': {
        const a = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(q.kat);
        ctx.globalAlpha *= a;
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const kk = (j / 5) * Math.PI * 2 + hasz(Math.floor(q.ziarno * 1e6) + j) * 0.8;
          const rr = r * (0.65 + 0.5 * hasz(Math.floor(q.ziarno * 1e6) + j + 7));
          if (j) ctx.lineTo(Math.cos(kk) * rr, Math.sin(kk) * rr); else ctx.moveTo(Math.cos(kk) * rr, Math.sin(kk) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = q.ziarno > 0.5 ? '#6e6356' : '#4e463e'; ctx.fill();
        ctx.strokeStyle = 'rgba(18,12,9,0.9)'; ctx.lineWidth = Math.max(0.8, r * 0.22); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'iskra': {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,${180 + Math.floor(60 * (1 - u))},90,${1 - u})`; ctx.lineWidth = Math.max(1, r * 0.5); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - q.vx * z * 0.035, y - q.vy * z * 0.035); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'zar': case 'zloto': {
        const mig = 0.6 + 0.4 * Math.sin(q.t * 18 + q.ziarno * 30);
        const a = (1 - u) * Math.min(1, u * 6) * mig;
        const rr = r * 3;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, q.typ === 'zar' ? `rgba(255,200,110,${a})` : `rgba(255,240,190,${a})`);
        g.addColorStop(0.35, q.typ === 'zar' ? `rgba(255,96,30,${0.6 * a})` : `rgba(255,200,110,${0.55 * a})`);
        g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        ctx.restore();
        break;
      }
      case 'popiol': {
        ctx.save(); ctx.translate(x, y); ctx.rotate(q.kat);
        ctx.fillStyle = `rgba(52,46,42,${0.8 * (1 - u)})`; ctx.fillRect(-r, -r * 0.4, r * 2, r * 0.8);
        ctx.restore();
        break;
      }
      case 'fala': {
        const e = 1 - Math.pow(1 - u, 2.2), rx = r * e, a = Math.pow(1 - u, 1.3);
        ctx.save();
        ctx.strokeStyle = `rgba(120,106,92,${0.5 * a})`; ctx.lineWidth = Math.max(2, z * 0.35 * (1 - u));
        ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,150,80,${0.45 * a})`; ctx.lineWidth = Math.max(1, z * 0.12 * (1 - u));
        ctx.beginPath(); ctx.ellipse(x, y, rx * 0.97, rx * 0.19, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'krag': {
        const rr = r * (0.2 + 0.8 * (1 - Math.pow(1 - u, 2)));
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,120,60,${0.42 * (1 - u)})`; ctx.lineWidth = Math.max(1.5, z * 0.18 * (1 - u));
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'szczelina': {
        const a = u < 0.1 ? u / 0.1 : 1 - (u - 0.1) / 0.9;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const ziarno = Math.floor(q.ziarno * 1e6);
        for (let g = 0; g < 2; g++) {
          ctx.strokeStyle = g ? `rgba(255,220,140,${0.8 * a})` : `rgba(255,90,30,${0.45 * a})`;
          ctx.lineWidth = g ? Math.max(1, z * 0.06) : Math.max(2, z * 0.2);
          for (let ram = 0; ram < 5; ram++) {
            ctx.beginPath(); ctx.moveTo(x, y);
            let px = x, py = y, k = (ram / 5) * Math.PI + hasz(ziarno + ram) * 0.6 - 0.3;
            for (let j = 0; j < 5; j++) {
              k += (hasz(ziarno + ram * 11 + j) - 0.5) * 0.9;
              px += Math.cos(k) * r * 0.22; py += Math.abs(Math.sin(k)) * r * 0.035 * (hasz(ziarno + j) > 0.5 ? 1 : -1);
              ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
        }
        ctx.restore();
        break;
      }
    }
  }
}

// ---------- pamięć bossa ----------

interface Pamiec {
  sim: Sim; id: number;
  czas: number; tik: number; tikCzas: number; msNaTik: number;
  hp: number; x: number; y: number; vx: number; vy: number;
  krok: number; idzie: number; leci: number; walka: number; modl: number; zrasta: number; szal: number; skala: number;
  oddech: number;
  trafiony: number; silaTrafienia: number;
  ciosT: number; zasypT: number;
  zamach: { cel: number; wariant: number; bez: boolean } | null; wagaZamachu: number;
  zasyp: { cel: number; bez: boolean } | null;
  ryk: number; nastRyk: number; wSzale: boolean;
  celId: number;
  czastki: Czastka[];
  smuga: { x: number; y: number; t: number }[];
  lancuchy: StanLancuchow;
  rozglad: number; rozgladCel: number; rozgladT: number; mrug: number;
  tupniecie: number; progKroku: number; kragRyku: number; dt: number;
  zdarzenia: string[];
}
const pamiec = new Map<number, Pamiec>();

function pamiecBossa(sim: Sim, c: Creature, czas: number): Pamiec {
  let p = pamiec.get(c.id);
  if (!p || p.sim !== sim) {
    if (pamiec.size > 8) pamiec.clear();
    p = {
      sim, id: c.id, czas, tik: sim.tick, tikCzas: czas, msNaTik: 1000 / TPS,
      hp: c.hp, x: c.x, y: c.y, vx: 0, vy: 0,
      krok: 0, idzie: 0, leci: 0, walka: 0, modl: 0, zrasta: 0, szal: 0, skala: 1, oddech: Math.random(),
      trafiony: -1e9, silaTrafienia: 0, ciosT: c.ciosT ?? -1e9, zasypT: c.zasypT ?? -1e9,
      zamach: null, wagaZamachu: 0, zasyp: null,
      ryk: -1e9, nastRyk: sim.tick + 10 * TPS, wSzale: false, celId: -1,
      czastki: [], smuga: [], lancuchy: nowyStanLancuchow(),
      rozglad: 0, rozgladCel: 0, rozgladT: 0, mrug: czas + 3000, tupniecie: -1e9, progKroku: 0, kragRyku: -1, dt: 1 / 60, zdarzenia: [],
    };
    pamiec.set(c.id, p);
  }
  return p;
}

/** Piksele ekranu na kafel (jak w render/straznicy.ts: h = rozmiar × 0,6 × wielkość postaci). */
function pikseliNaKafel(c: Creature, h: number): number {
  return h / Math.max(1e-3, RACES[c.race].size * 1.9 * ustawienia.wielkoscSylwetek * aktywnyBoss().rozmiar * 0.6);
}

/** Krok pamięci (raz na klatkę): czas, ruch, zdarzenia gry. Zwraca tik z ułamkiem. */
function aktualizuj(p: Pamiec, sim: Sim, c: Creature, czas: number): number {
  const dt = obetnij((czas - p.czas) / 1000, 0, 0.1);
  p.czas = czas; p.dt = dt;
  const dtik = sim.tick - p.tik;
  if (dtik !== 0) {
    if (dtik > 0 && dtik < 60) {
      p.msNaTik = obetnij(mix(p.msNaTik, (czas - p.tikCzas) / dtik, 0.25), 1, 120);
      const dx = c.x - p.x, dy = c.y - p.y;
      if (Math.hypot(dx, dy) < 3) {
        p.vx = mix(p.vx, dx / dtik, 0.35); p.vy = mix(p.vy, dy / dtik, 0.35);
        p.krok += Math.abs(dx) / 3.0;
      }
    }
    p.tik = sim.tick; p.tikCzas = czas; p.x = c.x; p.y = c.y;
  } else if (czas - p.tikCzas > 300) { p.vx *= 0.9; p.vy *= 0.9; }
  const tF = sim.tick + obetnij((czas - p.tikCzas) / p.msNaTik, 0, 1);
  const zbliz = (v: number, cel: number, tau: number): number => v + (cel - v) * (1 - Math.exp(-dt / tau));
  const v = Math.hypot(p.vx, p.vy);
  const wSkale = sim.world.solid(Math.floor(c.x), Math.floor(c.y));
  p.idzie = zbliz(p.idzie, v > 0.003 && Math.abs(p.vx) >= Math.abs(p.vy) * 0.8 ? 1 : 0, 0.18);
  p.leci = zbliz(p.leci, (v > 0.003 && Math.abs(p.vy) > Math.abs(p.vx) * 0.8) || wSkale ? 1 : 0, 0.3);
  const hpMax = c.hpMax ?? DEMON.hp;
  const modli = sim.rytual.wierni >= K.modlitwaWiernych;
  p.modl = zbliz(p.modl, modli ? 1 : 0, 0.5);
  p.zrasta = zbliz(p.zrasta, !modli && c.hp < hpMax - 0.5 ? 1 : 0, 0.8);
  p.szal = zbliz(p.szal, c.hp / hpMax < 0.25 ? 1 : 0, 0.6);
  // oddech: szybszy u rannego i w szale (faza całkowana — zmiana tempa nie szarpie)
  p.oddech += dt * (0.3 + 0.28 * (1 - c.hp / hpMax) + 0.35 * p.szal);
  const cel = sim.creatureById(sim.target.get(c.id) ?? -1);
  p.walka = zbliz(p.walka, cel && !cel.dead && Math.hypot(cel.x - c.x, cel.y - c.y) < 6 ? 1 : 0, 0.35);
  // trafienie: spadek życia (zrastanie dodaje po trochu w każdym tiku)
  if (c.hp < p.hp - 0.5) {
    p.trafiony = tF; p.silaTrafienia = obetnij((p.hp - c.hp) / 14, 0.35, 1);
    p.zdarzenia.push('trafienie');
  }
  p.hp = c.hp;
  // cios
  const ciosT = c.ciosT ?? -1e9;
  if (ciosT !== p.ciosT) {
    if (p.zamach && Math.abs(p.zamach.cel - ciosT) < 24) p.zamach = { cel: ciosT, wariant: p.zamach.wariant, bez: false };
    else p.zamach = { cel: ciosT, wariant: Math.floor(hasz(ciosT | 0) * 3), bez: true };
    p.ciosT = ciosT;
    p.zdarzenia.push('cios');
  }
  const czeka = demonCzeka(sim);
  if (!p.zamach || tF - p.zamach.cel > PO_CIOSIE) {
    p.zamach = null;
    const nast = ciosT + DEMON.ciosCo;
    const wZasiegu = !!cel && !cel.dead && !cel.wDloni && !cel.lot && Math.hypot(cel.x - c.x, cel.y - c.y) <= DEMON.zasieg;
    if (!czeka && wZasiegu && nast - tF <= ZAMACH && nast - tF > -4) p.zamach = { cel: nast, wariant: Math.floor(hasz(nast | 0) * 3), bez: false };
  } else if (p.zamach.cel > tF + 1 && tF > p.zamach.cel - ZAMACH && (czeka || !cel || cel.dead)) {
    p.zamach = null;      // zamach w powietrze — cel zniknął
  }
  p.wagaZamachu = zbliz(p.wagaZamachu, p.zamach ? 1 : 0, 0.08);
  // uderzenie w ziemię
  const zasypT = c.zasypT ?? -1e9;
  if (zasypT !== p.zasypT) {
    p.zasyp = { cel: zasypT, bez: !(p.zasyp && Math.abs(p.zasyp.cel - zasypT) < 24) };
    p.zasypT = zasypT;
    p.zdarzenia.push('zasyp');
  }
  if (!p.zasyp || tF - p.zasyp.cel > ZASYP_PO) {
    p.zasyp = null;
    const nast = zasypT + K.zasypCo;
    if (!czeka && nast - tF <= ZASYP_ZAMACH && nast - tF > -4) p.zasyp = { cel: nast, bez: false };
  }
  // ryk: szał, zabity cel, cisza
  if (!p.wSzale && c.hp / hpMax < 0.25) { p.wSzale = true; p.ryk = tF; }
  const poprzedni = sim.creatureById(p.celId);
  if (p.celId >= 0 && (!poprzedni || poprzedni.dead) && tF - p.ryk > RYK * 2) p.ryk = tF;
  p.celId = cel && !cel.dead ? cel.id : -1;
  if (!cel && tF > p.nastRyk && tF - p.ryk > RYK * 3) { p.ryk = tF; p.nastRyk = tF + (14 + 8 * Math.random()) * TPS; }
  if (cel) p.nastRyk = Math.max(p.nastRyk, tF + 6 * TPS);
  if (tF - p.ryk >= 0 && tF - p.ryk < 1) p.zdarzenia.push('ryk');
  // rozglądanie i mrugnięcia
  if (czas > p.rozgladT) { p.rozgladCel = (Math.random() - 0.5) * 0.2; p.rozgladT = czas + 2500 + Math.random() * 3500; }
  p.rozglad = zbliz(p.rozglad, p.rozgladCel, 0.6);
  krokCzastek(p, dt);
  const teraz = czas;
  p.smuga = p.smuga.filter((s) => teraz - s.t < 260);
  return tF;
}

// ---------- poza bossa ----------

interface Klatka { P: PozaKukly; W: WygladKukly; cel: P; tauCiosu: number; tauZasypu: number; tauRyku: number }

function klatkaBossa(p: Pamiec, sim: Sim, c: Creature, tF: number, czas: number, ppk: number): Klatka {
  const P = spoczynek(), W = wygladZywy(czas);
  W.lancuchy = p.lancuchy;
  const t = czas / 1000, ruch = wolnoRuszac() ? 1 : 0;
  const hpMax = c.hpMax ?? DEMON.hp, zycie = obetnij(c.hp / hpMax, 0, 1), rana = 1 - zycie;
  const garb = obetnij((rana - 0.4) / 0.4, 0, 1);
  // cel w układzie kukły (z przodu = +x)
  const cel = sim.creatureById(sim.target.get(c.id) ?? -1);
  const zwrot = c.face >= 0 ? 1 : -1;
  let celP: P = [640, 760];
  if (cel && !cel.dead) {
    const dx = obetnij((cel.x - c.x) * zwrot, 0.4, 3.4), dy = obetnij(cel.y - c.y, -2, 2);
    celP = [SRODEK_KUKLY + dx * ppk, ZIEMIA_KUKLY + dy * ppk - 0.85 * ppk];
  }
  const celNad: P = [celP[0] - PUNKTY_KUKLY.nadgarstekP[0], celP[1] - PUNKTY_KUKLY.nadgarstekP[1]];

  const o = Math.sin(p.oddech * Math.PI * 2);
  dodaj(P, { tsy: 0.02 * o * (1 + rana), tsx: 0.007 * o, bL: -5 * o, bP: -5 * o, gy: -3.5 * o, aureola: 0.025 * o, my: 2.5 * o, naszyjnik: 0.015 * o, rL: [0, -6 * o], rP: [0, -6 * o] });
  // drobne ruchy żywego ciała
  dodaj(P, {
    dL: 0.06 * Math.sin(t * 0.71), dP: 0.06 * Math.sin(t * 0.63 + 2), rL: [3 * Math.sin(t * 0.53), 4 * Math.sin(t * 0.81 + 1)],
    rP: [3 * Math.sin(t * 0.49 + 3), 4 * Math.sin(t * 0.77)], przepaska: 0.014 * Math.sin(t * 0.9), mx: 6 * Math.sin(t * 0.23),
    mr: 0.008 * Math.sin(t * 0.23), szczeka: 0.04 + 0.32 * Math.pow(Math.max(0, Math.sin(t * 0.41 + c.id)), 14),
  });
  // głowa: na cel (rycerz jest mały — patrzy w dół, ku niemu) albo rozgląda się
  P.gr += cel && !cel.dead ? mix(0.05, 0.13, p.walka) : p.rozglad;
  // postawa do walki
  dodaj(P, RUCH_WALKI, p.walka);

  // chód: ciężkie tupnięcia; lot (w pionie, w skale): nogi zwisają
  const wi = p.idzie * (1 - p.leci);
  if (wi > 0.01) dodaj(P, ruchChodu(p.krok, 1 - 0.45 * garb), wi);
  if (p.leci > 0.01) { dodaj(P, ruchLotu(t), p.leci); W.plomien += 0.3 * p.leci; }
  // tupnięcie (krótki przysiad po postawieniu stopy)
  const tup = (czas - p.tupniecie) / 1000;
  if (tup >= 0 && tup < 0.25) { P.sy -= 0.018 * Math.sin((tup / 0.25) * Math.PI); P.sx += 0.008 * Math.sin((tup / 0.25) * Math.PI); }

  // stany: rany (garbi się, ręka zwisa), szał (drży), modlitwa (kuli się), zrastanie
  dodaj(P, RUCH_GARBU, garb);
  if (p.szal > 0.01) {
    const d = 1.6 * ruch * p.szal;
    dodaj(P, { mx: d * Math.sin(t * 131), gx: d * Math.sin(t * 117 + 1), aureola: 0.05 * Math.sin(t * 9) * p.szal, szczeka: 0.2 * p.szal });
  }
  if (p.modl > 0.01) dodaj(P, ruchModlitwy(t, ruch), p.modl);

  // akcje: uderzenie w ziemię > cios > rozkaz dla dłoni > ryk > bicie w piers
  let tauCiosu = 1e9, tauZasypu = 1e9;
  const tauRyku = tF - p.ryk;
  let zajety = 0;
  if (p.zasyp) {
    let tau = tF - p.zasyp.cel;
    if (p.zasyp.bez && tau >= 0) tau = tau < 24 ? -ZASYP_ZAMACH + tau * (ZASYP_ZAMACH / 24) : tau - 24;
    tauZasypu = tau;
    dodaj(P, ruchZasypu(tau));
    zajety = 1;
  } else if (p.zamach && p.wagaZamachu > 0.01) {
    let tau = tF - p.zamach.cel;
    if (p.zamach.bez && tau >= 0) tau = tau < 12 ? -ZAMACH + tau * (ZAMACH / 12) : tau - 12;
    tauCiosu = tau;
    dodaj(P, ruchCiosu(p.zamach.wariant, tau, celNad), p.wagaZamachu);
    zajety = p.wagaZamachu;
  }
  const st = sim.lud.dlonDemona;
  let rozkaz = 0;
  if (st?.akcja && !zajety) {
    const dl = dlugoscFazy(st.akcja, st.faza), u = obetnij((sim.tick - st.od) / dl, 0, 1);
    rozkaz = st.faza === 'cofa' ? 1 - gl(u) : st.faza === 'wstaje' ? gl(u * 2.5) : 1;
    dodaj(P, ruchRozkazu(st.akcja, st.faza, u, t, celP), rozkaz);
    W.dlonie = rozkaz * (st.akcja === 'tarcza' ? 0.6 : 1);
    W.oczy += 0.4 * rozkaz;
  }
  if (tauRyku >= 0 && tauRyku < RYK) {
    const w = 1 - zajety;
    dodaj(P, ruchRyku(tauRyku), w);
    if (ruch && tauRyku > 26 && tauRyku < 90) { P.mx += 1.8 * Math.sin(t * 140) * w; P.gx += 1.5 * Math.sin(t * 127) * w; }
    W.oczy += 0.8 * dzwon(tauRyku, 20, 100) * w; W.usta += dzwon(tauRyku, 20, 100) * w; W.plomien += 0.5 * dzwon(tauRyku, 20, 110) * w;
  } else if (!zajety && !rozkaz && scianaGruzu(sim)) {
    // za ścianą gruzu: wali się w piers
    const a = t * 1.6 * Math.PI * 2;
    const uL = Math.pow(Math.max(0, Math.sin(a)), 3), uP = Math.pow(Math.max(0, -Math.sin(a)), 3);
    dodaj(P, { rL: doNadgarstka('L', 270 - 70 * (1 - uL), 360), rP: doNadgarstka('P', 380 + 70 * (1 - uP), 356), dL: 0.6, dP: -0.6, szczeka: 0.35 + 0.3 * (uL + uP), gr: -0.05 }, 0.9);
  }

  // oberwanie: wstrząs, odrzucona głowa, biały błysk
  const th = tF - p.trafiony;
  if (th >= 0 && th < 60) {
    const f = (th < 3 ? th / 3 : Math.exp(-(th - 3) / 9)) * p.silaTrafienia;
    dodaj(P, { tr: -0.09, gr: -0.15, gx: -5, mx: -12, rP: [-24, 18], rL: [-10, 10], szczeka: 0.45, aureola: 0.05 }, f);
    W.blysk += 0.24 * f; W.zar += 0.3 * f;
  }

  // wygląd
  const serce = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.1)), 6);
  W.rysy = obetnij(rana * 1.3 - 0.06, 0, 1);
  W.zarRys = 0.85 + 0.35 * serce * p.zrasta + 0.3 * p.szal;
  W.zar = 0.6 + 0.12 * Math.sin(t * 1.3) + 0.35 * p.szal + 0.3 * serce * p.zrasta + (W.zar - 0.7);
  W.zloto = 0.6 * p.modl;
  W.zlotyBlask = 0.07 * p.modl * (0.5 + 0.5 * Math.sin(t * 3));
  W.plomien = (W.plomien + 0.45 * p.szal) * (1 - 0.45 * p.modl);
  W.oczy = (W.oczy + 0.6 * p.szal) * (1 - 0.25 * p.modl);
  if (czas > p.mrug) { if (czas > p.mrug + 130) p.mrug = czas + 2500 + Math.random() * 4500; else W.oczy *= 0.12; }
  if (sim.world.solid(Math.floor(c.x), Math.floor(c.y))) W.alfa = 0.62;
  return { P, W, cel: celP, tauCiosu, tauZasypu, tauRyku };
}

/** Punkt w układzie kości (piksele ekranu wokół stóp, przed odwróceniem) → kafle świata. */
const doSwiata = (c: Creature, z: number, q: P): P => [c.x + (c.face >= 0 ? 1 : -1) * q[0] / z, c.y + 1 + q[1] / z];

/** Zdarzenia tej klatki: cząstki przy dłoniach, stopach, ustach. */
function zdarzeniaBossa(p: Pamiec, sim: Sim, c: Creature, k: KosciKukly, kl: Klatka, z: number, czas: number): void {
  const m = wolnoRuszac() ? 1 : 0.5;
  const ziemia = c.y + 1;
  const ile = (n: number): number => Math.max(1, Math.round(n * m));
  const dlonP = doSwiata(c, z, k.gdzie('dlonP', PUNKTY_KUKLY.dlonP));
  // tupnięcia: stopa ląduje w połowie i na końcu cyklu kroku
  const prog = Math.floor(p.krok * 2);
  if (prog !== p.progKroku && p.idzie * (1 - p.leci) > 0.5) {
    const stopa = prog % 2 ? 'stopaL' : 'stopaP';
    const sp = doSwiata(c, z, k.gdzie(stopa, stopa === 'stopaL' ? PUNKTY_KUKLY.kostkaL : PUNKTY_KUKLY.kostkaP));
    for (let i = 0; i < ile(4); i++) dodajCzastke(p, { typ: 'pyl', x: sp[0] + (Math.random() - 0.5) * 1.2, y: ziemia - 0.1, vx: (Math.random() - 0.5) * 2.4, vy: -0.3 - Math.random() * 0.4, r: 0.35 + Math.random() * 0.3, dl: 0.9 + Math.random() * 0.5 });
    dodajCzastke(p, { typ: 'fala', x: sp[0], y: ziemia, r: 1.6, dl: 0.5 });
    for (let i = 0; i < ile(2); i++) dodajCzastke(p, { typ: 'gruz', x: sp[0], y: ziemia - 0.1, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2, r: 0.06 + Math.random() * 0.05, w: (Math.random() - 0.5) * 12, ziemia, dl: 1.6 });
    p.tupniecie = czas;
  }
  p.progKroku = prog;
  // smuga pazurów (zamach i podcięcie)
  if (p.zamach && p.zamach.wariant > 0 && kl.tauCiosu > -10 && kl.tauCiosu < 14) p.smuga.push({ x: dlonP[0], y: dlonP[1], t: czas });
  for (const e of p.zdarzenia) {
    if (e === 'cios') {
      for (let i = 0; i < ile(12); i++) { const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 6; dodajCzastke(p, { typ: 'iskra', x: dlonP[0], y: dlonP[1], vx: Math.cos(a) * v + 2, vy: Math.sin(a) * v - 2, r: 0.07, dl: 0.35 + Math.random() * 0.3, ziemia }); }
      dodajCzastke(p, { typ: 'krag', x: dlonP[0], y: dlonP[1], r: 1.4, dl: 0.32 });
      if (dlonP[1] > ziemia - 1.2) for (let i = 0; i < ile(5); i++) dodajCzastke(p, { typ: 'pyl', x: dlonP[0] + (Math.random() - 0.5), y: ziemia - 0.2, vx: (Math.random() - 0.5) * 3, vy: -0.5, r: 0.4, dl: 1 });
    } else if (e === 'zasyp') {
      dodajCzastke(p, { typ: 'fala', x: c.x, y: ziemia, r: 7, dl: 0.9 });
      dodajCzastke(p, { typ: 'fala', x: c.x, y: ziemia, r: 4.5, dl: 0.6 });
      for (const b of ['dlonL', 'dlonP'] as const) {
        const d = doSwiata(c, z, k.gdzie(b, b === 'dlonL' ? PUNKTY_KUKLY.dlonL : PUNKTY_KUKLY.dlonP));
        dodajCzastke(p, { typ: 'szczelina', x: d[0], y: ziemia, r: 3.2, dl: 3.2 });
        for (let i = 0; i < ile(8); i++) dodajCzastke(p, { typ: 'gruz', x: d[0] + (Math.random() - 0.5), y: ziemia - 0.2, vx: (Math.random() - 0.5) * 7, vy: -4 - Math.random() * 6, r: 0.08 + Math.random() * 0.1, w: (Math.random() - 0.5) * 14, ziemia, dl: 2.2 });
      }
      for (let i = 0; i < ile(14); i++) dodajCzastke(p, { typ: 'pyl', x: c.x + (Math.random() - 0.5) * 7, y: ziemia - 0.2, vx: (Math.random() - 0.5) * 5, vy: -0.4 - Math.random() * 0.6, r: 0.6 + Math.random() * 0.6, dl: 1.6 + Math.random() });
      // gruz ze stropu: spada z wysoka
      for (let i = 0; i < ile(12); i++) dodajCzastke(p, { typ: 'gruz', x: c.x + (Math.random() - 0.5) * 9, y: ziemia - 9 - Math.random() * 3, vx: (Math.random() - 0.5), vy: Math.random() * 2, r: 0.07 + Math.random() * 0.12, w: (Math.random() - 0.5) * 8, ziemia, dl: 2.6 });
      for (let i = 0; i < ile(10); i++) dodajCzastke(p, { typ: 'zar', x: c.x + (Math.random() - 0.5) * 3, y: ziemia - 0.3, vx: (Math.random() - 0.5) * 2, vy: -1.5 - Math.random() * 2, r: 0.05, dl: 1.2 + Math.random() });
    } else if (e === 'trafienie') {
      const tr = doSwiata(c, z, k.gdzie('tulow', [440, 470]));
      for (let i = 0; i < ile(6); i++) dodajCzastke(p, { typ: 'gruz', x: tr[0], y: tr[1] + (Math.random() - 0.5), vx: 1 + Math.random() * 3, vy: -2 - Math.random() * 3, r: 0.05 + Math.random() * 0.06, w: (Math.random() - 0.5) * 16, ziemia, dl: 1.4 });
      for (let i = 0; i < ile(9); i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4; dodajCzastke(p, { typ: 'iskra', x: tr[0], y: tr[1], vx: Math.cos(a) * 5 + 2, vy: Math.sin(a) * 5, r: 0.06, dl: 0.4, ziemia }); }
    } else if (e === 'ryk') {
      for (let i = 0; i < ile(16); i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.8; dodajCzastke(p, { typ: 'zar', x: c.x + (Math.random() - 0.5) * 3, y: ziemia - 5.5 - Math.random() * 1.5, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, r: 0.05, dl: 1.4 + Math.random() }); }
    }
  }
  p.zdarzenia = [];
  // ryk: kręgi z ust; za uderzeniem w ziemię i przy ryku — pył zdmuchiwany spod stóp
  const krag = kl.tauRyku > 26 && kl.tauRyku < 84 ? Math.floor(kl.tauRyku / 14) : -1;
  if (krag >= 0 && krag !== p.kragRyku) {
    const u = doSwiata(c, z, k.gdzie('szczeka', PUNKTY_KUKLY.usta));
    dodajCzastke(p, { typ: 'krag', x: u[0], y: u[1], r: 3.2, dl: 0.7 });
    dodajCzastke(p, { typ: 'pyl', x: c.x + (Math.random() - 0.5) * 3, y: ziemia - 0.1, vx: (Math.random() - 0.5) * 4, vy: -0.2, r: 0.5, dl: 1 });
  }
  p.kragRyku = krag;
  // ciągłe: żar z aureoli, dym z ran, złoty pył modlitwy, czerwone iskry zrastania, żwir w skale
  const szansa = (naSek: number): boolean => Math.random() < naSek * p.dt * m;
  const aur = doSwiata(c, z, k.gdzie('aureola', [314, 60]));
  if (szansa(3 + 9 * p.szal)) dodajCzastke(p, { typ: 'zar', x: aur[0] + (Math.random() - 0.5) * 3.5, y: aur[1] + Math.random(), vx: (Math.random() - 0.5) * 0.6, vy: -0.8 - Math.random() * 1.2, r: 0.04, dl: 1.5 + Math.random() * 1.5 });
  const garb = obetnij((1 - c.hp / (c.hpMax ?? DEMON.hp) - 0.4) / 0.4, 0, 1);
  const piers = doSwiata(c, z, k.gdzie('tulow', PUNKTY_KUKLY.piers));
  if (szansa(4 * garb)) dodajCzastke(p, { typ: 'dym', x: piers[0] + (Math.random() - 0.5) * 2, y: piers[1] + (Math.random() - 0.5) * 2, vx: (Math.random() - 0.5) * 0.3, vy: -0.6 - Math.random() * 0.4, r: 0.4, dl: 2.2 });
  if (szansa(3 * garb)) dodajCzastke(p, { typ: 'zar', x: piers[0] + (Math.random() - 0.5) * 2.5, y: piers[1] + (Math.random() - 0.5) * 3, vx: 0, vy: 0.8 + Math.random(), r: 0.035, dl: 0.9 });
  if (szansa(14 * p.modl)) dodajCzastke(p, { typ: 'zloto', x: c.x + (Math.random() - 0.5) * 6, y: ziemia - 8 - Math.random() * 2, vx: (Math.random() - 0.5) * 0.5, vy: 1 + Math.random(), r: 0.05, dl: 2.2, cel: piers });
  if (szansa(6 * p.modl)) dodajCzastke(p, { typ: 'para', x: piers[0] + (Math.random() - 0.5) * 3, y: piers[1] + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 0.4, vy: -1 - Math.random() * 0.5, r: 0.45, dl: 1.8 });
  if (szansa(8 * p.zrasta)) {
    const a = Math.random() * Math.PI * 2, R = 2.5 + Math.random() * 1.5;
    dodajCzastke(p, { typ: 'zar', x: piers[0] + Math.cos(a) * R, y: piers[1] + Math.sin(a) * R, vx: -Math.cos(a) * R / 1.1, vy: -Math.sin(a) * R / 1.1, r: 0.04, dl: 1.1 });
  }
  if (sim.world.solid(Math.floor(c.x), Math.floor(c.y)) && szansa(16)) {
    dodajCzastke(p, { typ: 'gruz', x: c.x + (Math.random() - 0.5) * 3, y: c.y + 1 - Math.random() * 6, vx: (Math.random() - 0.5) * 2, vy: Math.random(), r: 0.04 + Math.random() * 0.05, w: 6, ziemia: c.y + 1, dl: 0.8 });
  }
  if (p.leci > 0.5 && !sim.world.solid(Math.floor(c.x), Math.floor(c.y)) && szansa(5)) dodajCzastke(p, { typ: 'dym', x: c.x + (Math.random() - 0.5) * 1.5, y: c.y + 1, vx: 0, vy: 0.4, r: 0.5, dl: 1.5 });
}

/** Smuga ognia za pazurami. */
function rysujSmuge(ctx: CanvasRenderingContext2D, p: Pamiec, c: Creature, z: number, czas: number): void {
  if (p.smuga.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let warstwa = 0; warstwa < 2; warstwa++) {
    for (let i = 1; i < p.smuga.length; i++) {
      const a = p.smuga[i - 1], b = p.smuga[i];
      const u = 1 - (czas - b.t) / 260;
      if (u <= 0) continue;
      ctx.strokeStyle = warstwa ? `rgba(255,230,160,${0.85 * u})` : `rgba(255,90,30,${0.5 * u})`;
      ctx.lineWidth = (warstwa ? 0.12 : 0.42) * z * u * (i / p.smuga.length + 0.3);
      ctx.beginPath(); ctx.moveTo((a.x - c.x) * z, (a.y - c.y - 1) * z); ctx.lineTo((b.x - c.x) * z, (b.y - c.y - 1) * z); ctx.stroke();
    }
  }
  ctx.restore();
}

/** Poświata za postacią: szał (czerwona, pulsuje), zrastanie (czerwona, w rytm serca), modlitwa (złota). */
function rysujAure(ctx: CanvasRenderingContext2D, p: Pamiec, h: number, czas: number): void {
  const t = czas / 1000;
  const serce = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.1)), 6);
  const cz = 0.22 * p.szal * (0.7 + 0.3 * Math.sin(t * 7)) + 0.12 * p.zrasta * serce;
  const zl = 0.16 * p.modl;
  if (cz + zl < 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const y = -h * 0.55, R = h * 0.85;
  const g = ctx.createRadialGradient(0, y, h * 0.1, 0, y, R);
  if (cz > 0.01) { g.addColorStop(0, `rgba(255,60,24,${cz})`); g.addColorStop(1, 'rgba(160,10,5,0)'); }
  else { g.addColorStop(0, `rgba(255,214,140,${zl})`); g.addColorStop(1, 'rgba(255,190,90,0)'); }
  ctx.fillStyle = g; ctx.fillRect(-R, y - R, R * 2, R * 2);
  ctx.restore();
}

/**
 * Żywy demon na mapie — wołane z render/pomnik.ts (rysujDemonaBossa), stopami w (0, 0), zwrot już ustawiony.
 * Faza „kona” — scena konania.
 */
export function rysujBossaKukla(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, h: number, czas: number): boolean {
  if (!kuklaGotowa()) return false;
  const s = sim.lud.pomnik;
  if (s?.faza === 'kona') return rysujKonajacegoKukla(ctx, h, Math.min(1, (sim.tick - s.od) / POMNIK.konanie), czas);
  const p = pamiecBossa(sim, c, czas);
  const z = pikseliNaKafel(c, h), ppk = z / skalaKukly(h);
  const nowa = czas !== p.czas;
  const tF = nowa ? aktualizuj(p, sim, c, czas) : p.tik + obetnij((czas - p.tikCzas) / p.msNaTik, 0, 1);
  const kl = klatkaBossa(p, sim, c, tF, czas, ppk);
  const zwrot = c.face >= 0 ? 1 : -1;
  // za postacią: poświata i dym (bez odwrócenia zwrotu — cząstki są w świecie)
  rysujAure(ctx, p, h, czas);
  ctx.save(); ctx.scale(zwrot, 1); rysujCzastki(ctx, p, c.x, c.y + 1, z, true); ctx.restore();
  const k = rysujKukle(ctx, h, kl.P, kl.W);
  if (!k) return false;
  if (nowa) zdarzeniaBossa(p, sim, c, k, kl, z, czas);
  ctx.save(); ctx.scale(zwrot, 1);
  rysujSmuge(ctx, p, c, z, czas);
  rysujCzastki(ctx, p, c.x, c.y + 1, z, false);
  ctx.restore();
  return true;
}

// ---------- sceny: wstawanie z gruzu ----------

/** Kolejność ożywania części (od piersi ku dłoniom i stopom). */
const OZYWANIE: Record<CzescDemona, number> = {
  tulow: 0, naszyjnik: 0.05, przepaska: 0.15, glowa: 0.2, szczeka: 0.22, ramieL: 0.35, ramieP: 0.35, udoL: 0.42, udoP: 0.42,
  aureola: 0.5, przedramieL: 0.6, przedramieP: 0.6, lydkaL: 0.72, lydkaP: 0.72, dlonL: 0.85, dlonP: 0.85, stopaL: 0.95, stopaP: 0.95,
};
const SEK_WYJSCIA = POMNIK.wyjscie / TPS, SEK_KONANIA = POMNIK.konanie / TPS;

function pozaWstawania(k: number, czas: number): { P: PozaKukly; W: WygladKukly } {
  const P = spoczynek(), W = wygladZywy(czas);
  const t = czas / 1000, ruch = wolnoRuszac() ? 1 : 0;
  // zanurzenie pod podłogą: ręce, głowa, barki — i wstaje z przysiadu
  const zan = k < 0.12 ? 920 : k < 0.3 ? mix(920, 560, zakres(k, 0.12, 0.3)) : k < 0.5 ? mix(560, 210, zakres(k, 0.3, 0.5)) : mix(210, 0, zakres(k, 0.5, 0.64));
  P.y += zan;
  P.my += 120 * dzwon(k, 0.42, 0.72) + 30 * zakres(k, 0.3, 0.45) * (1 - zakres(k, 0.5, 0.66));
  // ręce: prawa przebija gruz, potem lewa; potem obie wspierają się o podłogę
  const wPrawa = zakres(k, 0.08, 0.16) * (1 - zakres(k, 0.3, 0.42)), wLewa = zakres(k, 0.18, 0.26) * (1 - zakres(k, 0.3, 0.42));
  dodaj(P, { rP: [40, -300], dP: 0.25 * Math.sin(t * 9) }, wPrawa);
  dodaj(P, { rL: [-40, -300], dL: -0.25 * Math.sin(t * 8) }, wLewa);
  const podparcie = zakres(k, 0.3, 0.4) * (1 - zakres(k, 0.56, 0.66));
  const dol = (b: 'L' | 'P'): P => { const w = b === 'L' ? PUNKTY_KUKLY.nadgarstekL : PUNKTY_KUKLY.nadgarstekP; return [b === 'L' ? -70 : 70, ZIEMIA_KUKLY - 10 - zan - P.my - w[1]]; };
  dodaj(P, { rL: dol('L'), rP: dol('P'), dL: 0.7, dP: -0.7 }, podparcie);
  // wysiłek: drży, głowa nisko; potem rozpościera ręce i ryczy
  if (k > 0.3 && k < 0.64) { P.mx += 2.2 * ruch * Math.sin(t * 97); P.gr += 0.12; }
  const rozpost = zakres(k, 0.64, 0.72) * (1 - zakres(k, 0.94, 1));
  dodaj(P, { rL: [-60, 40], rP: [60, 40], dL: -0.4, dP: 0.4, gr: -0.05 }, rozpost * (1 - dzwon(k, 0.76, 0.94)));
  const rykU = obetnij((k - 0.76) / 0.18, 0, 1);
  if (k > 0.76 && k < 0.94) {
    dodaj(P, ruchRyku(rykU * RYK));
    if (ruch) { P.mx += 1.8 * Math.sin(t * 140); P.gx += 1.5 * Math.sin(t * 127); }
  }
  dodaj(P, RUCH_WALKI, zakres(k, 0.94, 1));
  // wygląd: kamień ożywa od piersi; oczy zapalają się w kamiennej twarzy; pęknięcia żarzą się i goją; aureola bucha
  W.kamien = (n) => 1 - zakres(k, 0.46 + 0.16 * OZYWANIE[n], 0.5 + 0.16 * OZYWANIE[n]);
  W.oczy = zakres(k, 0.36, 0.42) * (1 + 0.3 * dzwon(k, 0.36, 0.5)) + 0.8 * dzwon(k, 0.78, 0.94);
  W.rysy = 1;
  W.zarRys = mix(0.25, 1.3, zakres(k, 0.3, 0.55)) * (1 - zakres(k, 0.72, 0.96));
  W.zar = 0.75 * zakres(k, 0.5, 0.66) + 0.3 * dzwon(k, 0.66, 0.8);
  W.plomien = 1.6 * zakres(k, 0.66, 0.72) - 0.5 * zakres(k, 0.74, 0.9) + 0.5 * dzwon(k, 0.78, 0.94);
  P.aureola += -0.3 * (1 - zakres(k, 0.64, 0.74)) + 0.15 * dzwon(k, 0.68, 0.8);
  W.usta = 1;
  W.blysk = 0.16 * dzwon(k, 0.66, 0.71);
  return { P, W };
}

/** Odłamek w scenie: x0, y0 (piksele wokół stóp), prędkość (h/s), od kiedy (k), rozmiar (h). */
interface Odlamek { k: number; x: number; y: number; vx: number; vy: number; r: number; ziarno: number }
function odlamkiWyjscia(h: number): Odlamek[] {
  const wyb: [number, number, number][] = [[0.12, 0.36, 14], [0.22, -0.36, 12], [0.32, 0, 12], [0.52, 0, 20]];
  const out: Odlamek[] = [];
  let i = 0;
  for (const [kb, x, n] of wyb) {
    for (let j = 0; j < n; j++, i++) {
      const a = -Math.PI / 2 + (hasz(i * 3 + 1) - 0.5) * 2.2, v = 0.9 + hasz(i * 5 + 2) * 1.6;
      out.push({ k: kb + hasz(i * 7) * 0.02, x: (x + (hasz(i * 11) - 0.5) * 0.3) * h, y: -0.02 * h, vx: Math.cos(a) * v * h, vy: Math.sin(a) * v * h, r: (0.012 + hasz(i * 13) * 0.02) * h, ziarno: i });
    }
  }
  return out;
}

function rysujOdlamek(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kat: number, ziarno: number, a: number, kolor: string): void {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(kat); ctx.globalAlpha *= a;
  ctx.beginPath();
  for (let j = 0; j < 5; j++) {
    const kk = (j / 5) * Math.PI * 2 + hasz(ziarno * 9 + j) * 0.8, rr = r * (0.65 + 0.5 * hasz(ziarno * 17 + j));
    if (j) ctx.lineTo(Math.cos(kk) * rr, Math.sin(kk) * rr); else ctx.moveTo(Math.cos(kk) * rr, Math.sin(kk) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = kolor; ctx.fill();
  ctx.strokeStyle = 'rgba(18,12,9,0.9)'; ctx.lineWidth = Math.max(0.8, r * 0.2); ctx.stroke();
  ctx.restore();
}

function oblok(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, kol: string): void {
  if (a <= 0.005) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${kol},${a})`); g.addColorStop(1, `rgba(${kol},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * Demon wstaje z gruzu (`k` 0…1): stopy w (bx, by), `Hp` — wysokość posągu (kopiec), `h` — demona. Spod gruzu bije
 * czerwony żar, przebija się prawa ręka, lewa, kamienna głowa z zapalającymi się oczami; wspiera się o podłogę
 * i wstaje z przysiadu, kamień pęka i ożywa od piersi, aureola bucha ogniem — i ryk. Także rycina w atlasie.
 */
export function rysujWstajacegoKukla(ctx: CanvasRenderingContext2D, bx: number, by: number, Hp: number, h: number, k: number, czas: number): boolean {
  if (!kuklaGotowa()) return false;
  const { P, W } = pozaWstawania(k, czas);
  // żar spod gruzu (zanim cokolwiek się pokaże)
  const zar = zakres(k, 0, 0.1) * (1 - zakres(k, 0.5, 0.7));
  if (zar > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const R = h * 0.7, puls = 0.75 + 0.25 * Math.sin(czas * 0.012);
    const g = ctx.createRadialGradient(bx, by - h * 0.05, 0, bx, by - h * 0.05, R);
    g.addColorStop(0, `rgba(255,110,40,${0.5 * zar * puls})`); g.addColorStop(0.5, `rgba(200,40,15,${0.2 * zar})`); g.addColorStop(1, 'rgba(120,10,5,0)');
    ctx.fillStyle = g; ctx.fillRect(bx - R, by - h * 0.05 - R, R * 2, R * 2);
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(bx - h * 3, by - h * 4, h * 6, h * 4 - Hp * 0.01); ctx.clip();
  ctx.translate(bx, by);
  const kosci = rysujKukle(ctx, h, P, W);
  ctx.restore();
  if (!kosci) return false;
  // odłamki i pył z każdego przebicia; płatki kamienia z ożywających części
  ctx.save();
  ctx.translate(bx, by);
  for (const o of odlamkiWyjscia(h)) {
    if (k < o.k) continue;
    const tt = (k - o.k) * SEK_WYJSCIA;
    let x = o.x + o.vx * tt, y = o.y + o.vy * tt + 0.5 * 2.6 * h * tt * tt;
    const lezy = y > 0;
    if (lezy) { y = 0; x = o.x + o.vx * (2 * -o.vy / (2.6 * h)); }
    const a = 1 - obetnij((tt - 1.4) / 0.6, 0, 1);
    if (a > 0) rysujOdlamek(ctx, x, y - o.r * 0.5, o.r, tt * 6 * (hasz(o.ziarno) - 0.5) * (lezy ? 0.3 : 1), o.ziarno, a, hasz(o.ziarno + 3) > 0.5 ? '#6e6356' : '#4e463e');
  }
  for (const [kb, x] of [[0.12, 0.36], [0.22, -0.36], [0.32, 0], [0.52, 0]] as const) {
    if (k < kb) continue;
    const tt = (k - kb) * SEK_WYJSCIA;
    for (let j = 0; j < 4; j++) oblok(ctx, (x + (j - 1.5) * 0.12) * h, -h * (0.04 + 0.06 * tt), h * (0.1 + 0.2 * tt), 0.32 * Math.max(0, 1 - tt / 1.4), '112,100,88');
  }
  for (const n of Object.keys(OZYWANIE) as CzescDemona[]) {
    const kn = 0.48 + 0.16 * OZYWANIE[n];
    if (k < kn || k > kn + 0.12) continue;
    const c = CZESCI_DEMONA[n];
    const [cx, cy] = kosci.gdzie(n, [c.x + c.w / 2, c.y + c.h / 2]);
    const tt = (k - kn) * SEK_WYJSCIA;
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * Math.PI * 2 + hasz(j + n.length * 7), v = h * (0.25 + 0.3 * hasz(j * 3 + n.length));
      rysujOdlamek(ctx, cx + Math.cos(a) * v * tt, cy + Math.sin(a) * v * tt + 1.3 * h * tt * tt, h * 0.012, tt * 9, j + n.length * 13, 1 - tt / (0.12 * SEK_WYJSCIA), '#8a8072');
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    oblok(ctx, cx, cy, h * 0.12, 0.35 * (1 - tt / (0.12 * SEK_WYJSCIA)), '255,120,50');
    ctx.restore();
  }
  // ryk: kręgi z ust i iskry z aureoli
  if (k > 0.78 && k < 0.96) {
    const [ux, uy] = kosci.gdzie('szczeka', PUNKTY_KUKLY.usta);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 3; j++) {
      const u = ((k - 0.78) / 0.18 * 3 - j * 0.6);
      if (u <= 0 || u >= 1) continue;
      ctx.strokeStyle = `rgba(255,120,60,${0.45 * (1 - u)})`; ctx.lineWidth = Math.max(1.5, h * 0.012 * (1 - u));
      ctx.beginPath(); ctx.arc(ux, uy, h * 0.6 * u, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  if (k > 0.66) {
    const [ax, ay] = kosci.gdzie('aureola', [314, 80]);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 24; j++) {
      const k0 = 0.66 + hasz(j * 5) * 0.25;
      if (k < k0) continue;
      const tt = (k - k0) * SEK_WYJSCIA, u = tt / 1.6;
      if (u >= 1) continue;
      const x = ax + (hasz(j * 7) - 0.5) * h * 0.7 + Math.sin(tt * 4 + j) * h * 0.02, y = ay - tt * h * (0.2 + 0.2 * hasz(j * 9));
      oblok(ctx, x, y, h * 0.012, (1 - u), '255,170,80');
    }
    ctx.restore();
  }
  ctx.restore();
  return true;
}

// ---------- sceny: konanie ----------

/** Środek części w spoczynku (y — do kolejności kamienienia od stóp w górę). */
const srodekCzesci = (n: CzescDemona): P => { const c = CZESCI_DEMONA[n]; return [c.x + c.w / 2, c.y + c.h / 2]; };

function pozaKonania(k: number, czas: number): { P: PozaKukly; W: WygladKukly } {
  const P = spoczynek(), W = wygladZywy(czas);
  const t = czas / 1000, ruch = wolnoRuszac() ? 1 : 0;
  // A: ostatni cios odrzuca go w tył, złote światło rozsadza piers
  const A = dzwon(k, 0, 0.12);
  dodaj(P, { tr: -0.2, gr: -0.32, gx: -8, mx: -26, rL: [-80, -60], rP: [80, -100], szczeka: 1.2, aureola: 0.2 }, A);
  // B: zatacza się, prawa ręka na piersi, lewa sięga w górę; krok w tył
  const B = zakres(k, 0.05, 0.12) * (1 - zakres(k, 0.36, 0.46));
  dodaj(P, {
    rP: doNadgarstka('P', 362, 360), dP: -0.6, rL: [-40, -150 + 12 * Math.sin(t * 9)], dL: -0.4 + 0.2 * Math.sin(t * 7),
    tr: 0.06 * Math.sin(t * 1.7), gr: -0.12 + 0.18 * Math.sin(t * 1.3), szczeka: 0.7 + 0.25 * Math.sin(t * 3), my: 30,
  }, B);
  const krok = dzwon(k, 0.1, 0.22);
  dodaj(P, { nP: [-30 * zakres(k, 0.1, 0.22), -34 * krok], mx: -14 * zakres(k, 0.1, 0.22) });
  // C: pada na kolana — głęboki przysiad, tułów opada, głowa w dół, ręce zwisają
  const C = zakres(k, 0.36, 0.5);
  dodaj(P, { my: 150, nL: [-44, 0], nP: [44, 0], tsy: -0.11, gy: 24, gr: 0.3, rL: [60, 270], rP: [-40, 220], dL: 0.3, dP: -0.3, szczeka: 0.9, tr: 0.03 }, C);
  // drżenie aż do skamienienia
  const drz = ruch * (2 + 3 * zakres(k, 0.1, 0.4)) * (1 - zakres(k, 0.55, 0.62));
  P.mx += drz * Math.sin(t * 91); P.gx += drz * 0.8 * Math.sin(t * 103);
  // wygląd: złote pęknięcia rozchodzą się, aureola gaśnie, kamień od stóp w górę, potem rozpad
  W.zloto = 1;
  W.rysy = zakres(k, 0.03, 0.34);
  W.zarRys = 1.5;
  W.zar = 1.2 * (1 - zakres(k, 0.6, 0.8));
  W.zlotyBlask = 0.42 * dzwon(k, 0, 0.1) + 0.22 * zakres(k, 0.1, 0.3) * (1 - zakres(k, 0.55, 0.7));
  W.blysk = 0.3 * dzwon(k, 0, 0.05);
  const gasnie = 1 - zakres(k, 0.08, 0.4);
  W.plomien = gasnie * (szum(t * 7) > 0.35 ? 1 : 0.35);
  W.oczy = 1.8 * (1 - zakres(k, 0.5, 0.62));
  W.usta = 1.2;
  W.kamien = (n) => zakres(k, 0.5 + 0.12 * (1 - srodekCzesci(n)[1] / ZIEMIA_KUKLY), 0.54 + 0.12 * (1 - srodekCzesci(n)[1] / ZIEMIA_KUKLY));
  W.odpad = (n): Odpad | null => {
    const [cx, cy] = srodekCzesci(n);
    const kd = 0.66 + 0.12 * (cy / ZIEMIA_KUKLY) + 0.05 * hasz(n.length * 31 + cx);
    if (k < kd) return null;
    const tt = (k - kd) * SEK_KONANIA;
    const kier = cx < SRODEK_KUKLY ? -1 : 1;
    return {
      dx: kier * (40 + 90 * hasz(cx)) * tt, dy: -50 * hasz(cy) * tt + 0.5 * 1200 * tt * tt, r: kier * (0.8 + hasz(cx + cy)) * tt,
      s: 1 - 0.25 * Math.min(1, tt), a: 1 - gl((k - kd) / 0.1),
    };
  };
  W.kajdany = k < 0.7;
  return { P, W };
}

/**
 * Demon kona po ostatnim uderzeniu (`k` 0…1), stopami w (0, 0): cios odrzuca go w tył, złote światło rozsadza piers,
 * zatacza się z dłonią na piersi, złote pęknięcia biegną po całym ciele, aureola gaśnie; pada na kolana, kamienieje
 * od stóp w górę — i rozpada się na kawałki, które obracają się w pył i popiół. Także rycina w atlasie.
 */
export function rysujKonajacegoKukla(ctx: CanvasRenderingContext2D, h: number, k: number, czas: number): boolean {
  if (!kuklaGotowa()) return false;
  const { P, W } = pozaKonania(k, czas);
  // złote promienie z piersi (za postacią)
  const kosciPrzed = zloz(P);
  const [px, py] = naPunkt(kosciPrzed.m.tulow, PUNKTY_KUKLY.piers[0], PUNKTY_KUKLY.piers[1]);
  const s = skalaKukly(h), cx = (px - SRODEK_KUKLY) * s, cy = (py - ZIEMIA_KUKLY) * s;
  const prom = zakres(k, 0.02, 0.1) * (1 - zakres(k, 0.6, 0.75));
  if (prom > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const t = czas * 0.0004;
    for (let i = 0; i < 9; i++) {
      const a = t * (i % 2 ? 1 : -1) + (i / 9) * Math.PI * 2, L = h * (0.5 + 0.35 * hasz(i * 3)) * (0.6 + 0.4 * zakres(k, 0.05, 0.4)), sz = 0.07 + 0.05 * hasz(i);
      const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
      g.addColorStop(0, `rgba(255,236,170,${0.5 * prom})`); g.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - sz) * L, cy + Math.sin(a - sz) * L); ctx.lineTo(cx + Math.cos(a + sz) * L, cy + Math.sin(a + sz) * L);
      ctx.closePath(); ctx.fill();
    }
    oblok(ctx, cx, cy, h * 0.4, 0.4 * prom, '255,220,150');
    ctx.restore();
  }
  const kosci = rysujKukle(ctx, h, P, W);
  if (!kosci) return false;
  // rozpad: pył i popiół z odpadających części, złote iskry; na koniec kupka kamieni
  for (const n of Object.keys(OZYWANIE) as CzescDemona[]) {
    const [sx0, sy0] = srodekCzesci(n);
    const kd = 0.66 + 0.12 * (sy0 / ZIEMIA_KUKLY) + 0.05 * hasz(n.length * 31 + sx0);
    if (k < kd) continue;
    const tt = (k - kd) * SEK_KONANIA;
    const od = W.odpad?.(n);
    const [x0, y0] = kosci.gdzie(n, [sx0, sy0]);
    const x = x0 + (od ? od.dx * kosci.s : 0), y = y0 + (od ? od.dy * kosci.s : 0);
    for (let j = 0; j < 3; j++) oblok(ctx, x + (j - 1) * h * 0.05, y - tt * h * 0.15, h * (0.07 + 0.16 * tt), 0.4 * Math.max(0, 1 - tt / 1.1), '130,118,104');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 4; j++) {
      const u = tt / 1.2 - j * 0.1;
      if (u <= 0 || u >= 1) continue;
      oblok(ctx, x + (hasz(j + sx0) - 0.5) * h * 0.2, y - u * h * 0.4, h * 0.012, 1 - u, '255,220,140');
    }
    ctx.restore();
  }
  if (k > 0.72) {
    for (let i = 0; i < 40; i++) {
      const k0 = 0.72 + hasz(i * 3 + 1) * 0.2;
      if (k < k0) continue;
      const tt = (k - k0) * SEK_KONANIA, u = tt / 1.4;
      if (u >= 1) continue;
      const x = (hasz(i * 5) - 0.5) * h * 0.6 + Math.sin(tt * 3 + i) * h * 0.03, y = -h * (0.1 + 0.5 * hasz(i * 7)) - tt * h * 0.25;
      ctx.save(); ctx.translate(x, y); ctx.rotate(tt * 3 + i);
      ctx.fillStyle = `rgba(52,46,42,${0.85 * (1 - u)})`; ctx.fillRect(-h * 0.006, -h * 0.003, h * 0.012, h * 0.006);
      ctx.restore();
    }
    const kupka = zakres(k, 0.74, 0.86);
    for (let i = 0; i < 14; i++) {
      const x = (hasz(i * 9 + 4) - 0.5) * h * 0.5, r = h * (0.015 + 0.025 * hasz(i * 11));
      rysujOdlamek(ctx, x, -r * 0.4 - (1 - kupka) * h * 0.3 * hasz(i), r, hasz(i * 13) * 6, i + 50, kupka, i % 3 ? '#5a5046' : '#7d7264');
    }
  }
  return true;
}

/**
 * Narzędzie dewelopera: jeden ruch bossa w chwili `u` (0…1), stopami w (0, 0) — arkusz kontrolny animacji.
 * Ruchy: spoczynek, walka, chod, lot, cios0…2, zasyp, ryk, rozkaz:<akcja>:<faza>, modlitwa, zrastanie, rany, szal, oberwanie.
 */
export function podgladRuchu(ctx: CanvasRenderingContext2D, h: number, ruch: string, u: number, czas: number): boolean {
  if (!kuklaGotowa()) return false;
  const P = spoczynek(), W = wygladZywy(czas);
  const t = czas / 1000, cel: P = [640 - PUNKTY_KUKLY.nadgarstekP[0], 740 - PUNKTY_KUKLY.nadgarstekP[1]];
  const [nazwa, akcja, faza] = ruch.split(':');
  if (nazwa === 'walka') dodaj(P, RUCH_WALKI);
  else if (nazwa === 'chod') dodaj(P, ruchChodu(u, 1));
  else if (nazwa === 'lot') { dodaj(P, ruchLotu(t)); W.plomien = 1.3; }
  else if (nazwa.startsWith('cios')) { dodaj(P, RUCH_WALKI); dodaj(P, ruchCiosu(+nazwa[4], mix(-ZAMACH, PO_CIOSIE * 0.6, u), cel)); }
  else if (nazwa === 'zasyp') dodaj(P, ruchZasypu(mix(-ZASYP_ZAMACH, ZASYP_PO * 0.5, u)));
  else if (nazwa === 'ryk') { dodaj(P, ruchRyku(u * RYK)); W.oczy += 0.8 * dzwon(u * RYK, 20, 100); W.usta += dzwon(u * RYK, 20, 100); W.plomien += 0.5 * dzwon(u * RYK, 20, 110); }
  else if (nazwa === 'rozkaz') { dodaj(P, ruchRozkazu(akcja, faza, u, t, [660, 760])); W.dlonie = akcja === 'tarcza' ? 0.6 : 1; W.oczy = 1.4; }
  else if (nazwa === 'modlitwa') { dodaj(P, ruchModlitwy(t, 1)); W.zloto = 0.6; W.zlotyBlask = 0.07; W.plomien = 0.55; W.oczy = 0.75; }
  else if (nazwa === 'zrastanie') { W.rysy = 0.5; W.zarRys = 1.2; W.zar = 1; }
  else if (nazwa === 'rany') { dodaj(P, RUCH_GARBU, obetnij((u - 0.4) / 0.4, 0, 1)); W.rysy = obetnij(u * 1.3 - 0.06, 0, 1); }
  else if (nazwa === 'szal') { dodaj(P, RUCH_GARBU); dodaj(P, { szczeka: 0.2, aureola: 0.05 }); W.rysy = 1; W.oczy = 1.6; W.plomien = 1.45; W.zar = 0.95; W.zarRys = 1.15; }
  else if (nazwa === 'oberwanie') { const f = u < 0.1 ? u / 0.1 : Math.exp(-(u - 0.1) * 6); dodaj(P, { tr: -0.09, gr: -0.15, gx: -5, mx: -12, rP: [-24, 18], rL: [-10, 10], szczeka: 0.45, aureola: 0.05 }, f); W.blysk = 0.24 * f; }
  return !!rysujKukle(ctx, h, P, W);
}
