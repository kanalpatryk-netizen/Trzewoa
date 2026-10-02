import type { Sim, Clan } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import { pierwszaGrafika, rysujGrafike, RASY_W_PLIKACH } from '../grafiki/grafiki';
import { Job } from '../sim/creatures';
import { Race, RACES } from '../sim/races';
import type { Camera } from './camera';
import { ustawienia } from '../core/settings-store';
import { BUDOWA, MAKS_KROKOW_NA_SEKUNDE, type Budowa } from '../nastawy/wyglad/postacie';

/**
 * Mieszkańcy jak postacie z ryciny: sylwetka obwiedziona barwą nacji, w środku
 * kreskowanie właściwe rasie (skóra Ślepego Ludu, fartuch Żużlowca, kamień trola,
 * płaszcz człowieka, blade odwłoki Prządek). Ruch wynika z tego, co stworzenie
 * naprawdę robi: krok rośnie z przebytą drogą, wspinaczka idzie ręka za ręką,
 * spadający macha rękami, kopiący bierze zamach i uderza, modlący klęka.
 *
 * Rysunek idzie w trzech przejściach — obrys całej sylwetki, wypełnienie od tyłu
 * do przodu, szczegóły — więc kontur jest tylko na zewnątrz, jak w miedziorycie.
 */

// ------------------------------------------------------------------ stan ruchu

/** Pamięć animacji — tylko po stronie rysunku, symulacja o niej nie wie. */
interface Ruch {
  x: number; y: number;
  /** Faza kroku 0..1 — rośnie z drogą, nie z czasem: stojący nie przebiera nogami. */
  faza: number;
  /** Faza wspinaczki — rośnie z drogą w pionie. */
  fazaPion: number;
  /** Wygładzona prędkość w kaflach na sekundę. */
  v: number;
  t: number;
  /** Zegar czynności (zamach, pokłon) — własny, żeby tłum nie ruszał się w takt. */
  zegar: number;
  /** Ostatnie uderzenie kilofa — odpryski rysujemy tylko w chwili trafienia. */
  uderzenie: number;
}

const pamiec = new WeakMap<Creature, Ruch>();


function ruch(c: Creature, czas: number): Ruch {
  let r = pamiec.get(c);
  if (!r) {
    r = { x: c.x, y: c.y, faza: (c.id * 0.37) % 1, fazaPion: (c.id * 0.61) % 1, v: 0, t: czas, zegar: (c.id * 0.29) % 1, uderzenie: -1e9 };
    pamiec.set(c, r);
    return r;
  }
  const dt = Math.max(1, Math.min(250, czas - r.t)) / 1000;
  const dx = c.x - r.x, dy = c.y - r.y;
  const droga = Math.hypot(dx, dy);
  if (droga > 4) { r.x = c.x; r.y = c.y; r.t = czas; return r; }          // skok (wczytanie, teleport)
  const krok = krokRasy(c.race);
  const przyrost = Math.min(Math.abs(dx) / krok, MAKS_KROKOW_NA_SEKUNDE * dt);
  r.faza = (r.faza + przyrost) % 1;
  r.fazaPion = (r.fazaPion + Math.min(Math.abs(dy) / 0.9, 2.4 * dt)) % 1;
  r.v += (droga / dt - r.v) * Math.min(1, dt * 8);
  r.zegar = (r.zegar + dt) % 1000;
  r.x = c.x; r.y = c.y; r.t = czas;
  return r;
}

/** Długość pełnego kroku w kaflach — duzi stawiają kroki rzadziej. */
function krokRasy(r: Race): number {
  return r === Race.TROLL ? 1.6 : r === Race.DWARF ? 0.8 : r === Race.SPINNER ? 0.7 : 1.0;
}

export type Czynnosc =
  | 'stoi' | 'idzie' | 'biegnie' | 'wspina' | 'spada'
  | 'kopie' | 'modli' | 'je' | 'walczy' | 'spi' | 'buduje' | 'wysysa';

/** Co widać: czynność wynika z zajęcia, ale i z tego, czy stworzenie w ogóle się rusza. */
function czynnosc(c: Creature, r: Ruch, sim: Sim): Czynnosc {
  if (c.vy > 0.3) return 'spada';
  const wspina = (sim.tick - (c.wspina ?? -99)) < 4 && !sim.world.solid(Math.floor(c.x), Math.floor(c.y) + 1);
  if (wspina) return 'wspina';
  const przy = (x: number, y: number, d: number) => Math.abs(x + 0.5 - c.x) <= d && Math.abs(y + 0.5 - c.y) <= d + 0.6;
  const stoi = r.v < 0.6;
  switch (c.job) {
    case Job.SLEEP: return 'spi';
    case Job.DIG: case Job.DESCEND:
      if (przy(c.jx, c.jy, 1.6)) return 'kopie';
      break;
    case Job.PRAY: case Job.SACRIFICE:
      if (przy(c.jx, c.jy, 2.6) && stoi) return 'modli';
      break;
    case Job.PIELGRZYM: if (stoi) return 'modli'; break;
    case Job.EAT: if (stoi && przy(c.jx, c.jy, 1.6)) return 'je'; break;
    case Job.BUILD: if (przy(c.jx, c.jy, 1.6)) return 'buduje'; break;
    case Job.DRAIN: return stoi ? 'wysysa' : 'idzie';
    case Job.FIGHT: case Job.SLAVE: {
      const cel = sim.creatureById(sim.target.get(c.id) ?? -1);
      if (cel && !cel.dead && Math.hypot(cel.x - c.x, cel.y - c.y) < 1.8) return 'walczy';
      return r.v > 0.6 ? 'biegnie' : 'stoi';
    }
    case Job.FLEE: return r.v > 0.3 ? 'biegnie' : 'stoi';
    case Job.HEAT: if (stoi) return 'stoi'; break;
  }
  if (r.v > 0.6) return c.fear > 0.55 ? 'biegnie' : 'idzie';
  return 'stoi';
}

// ------------------------------------------------------------------- faktury

interface Faktura {
  cialo: CanvasPattern | string;
  cien: CanvasPattern | string;
  jasna: CanvasPattern | string;
}

const faktury = new Map<string, Faktura>();

/** Mały kafelek rytej kreski: tło, linie pod kątem, ewentualnie krzyżówka i punkty. */
function kafelek(tlo: string, kreska: string, odstep: number, kat: number, krzyz: boolean, punkty: number, grubosc = 0.8): HTMLCanvasElement {
  const n = 24;
  const c = document.createElement('canvas');
  c.width = n; c.height = n;
  const g = c.getContext('2d')!;
  g.fillStyle = tlo;
  g.fillRect(0, 0, n, n);
  g.strokeStyle = kreska;
  g.lineWidth = grubosc;
  const linie = (a: number) => {
    const dx = Math.cos(a), dy = Math.sin(a);
    const px = -dy, py = dx;
    for (let k = -n * 2; k <= n * 2; k += odstep) {
      g.beginPath();
      g.moveTo(n / 2 + px * k - dx * n * 2, n / 2 + py * k - dy * n * 2);
      g.lineTo(n / 2 + px * k + dx * n * 2, n / 2 + py * k + dy * n * 2);
      g.stroke();
    }
  };
  linie(kat);
  if (krzyz) linie(kat + Math.PI / 2);
  // kropki rozrzucone deterministycznie — kamień i żużel mają ziarno
  g.fillStyle = kreska;
  for (let i = 0; i < punkty; i++) {
    const x = (i * 7.31) % n, y = (i * 13.7 + i * i * 0.61) % n;
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

function wzor(ctx: CanvasRenderingContext2D, plotno: HTMLCanvasElement, zapas: string): CanvasPattern | string {
  return ctx.createPattern(plotno, 'repeat') ?? zapas;
}

function fakturaRasy(ctx: CanvasRenderingContext2D, rasa: Race): Faktura {
  const klucz = String(rasa);
  const jest = faktury.get(klucz);
  if (jest) return jest;
  let f: Faktura;
  switch (rasa) {
    case Race.GOBLIN:        // skóra: gęsta ukośna kreska, zielonkawy półmrok
      f = {
        cialo: wzor(ctx, kafelek('#141a12', 'rgba(126,150,104,0.55)', 3, -0.9, false, 6), '#141a12'),
        cien: wzor(ctx, kafelek('#0c100b', 'rgba(96,118,80,0.45)', 3, -0.9, true, 0), '#0c100b'),
        jasna: wzor(ctx, kafelek('#26301f', 'rgba(170,190,140,0.6)', 3, -0.9, false, 10), '#26301f'),
      };
      break;
    case Race.DWARF:         // skóra i skórzany fartuch: krzyżówka, ziarno sadzy
      f = {
        cialo: wzor(ctx, kafelek('#1c130e', 'rgba(196,136,84,0.45)', 3.2, 0.6, true, 10), '#1c130e'),
        cien: wzor(ctx, kafelek('#110b08', 'rgba(150,100,60,0.4)', 3.2, 0.6, true, 4), '#110b08'),
        jasna: wzor(ctx, kafelek('#2c1d12', 'rgba(222,170,110,0.5)', 3, 1.57, false, 6), '#2c1d12'),
      };
      break;
    case Race.TROLL:         // kamień: punktowanie i rzadka kreska
      f = {
        cialo: wzor(ctx, kafelek('#17141b', 'rgba(150,130,170,0.5)', 6, 0.35, false, 40, 0.7), '#17141b'),
        cien: wzor(ctx, kafelek('#0e0c11', 'rgba(110,96,130,0.45)', 6, 0.35, true, 20, 0.7), '#0e0c11'),
        jasna: wzor(ctx, kafelek('#25202b', 'rgba(190,170,210,0.55)', 5, 0.35, false, 50, 0.7), '#25202b'),
      };
      break;
    case Race.SPINNER:       // blade odwłoki: jasne tło, ciemna drobna kreska — odwrotność reszty
      f = {
        cialo: wzor(ctx, kafelek('#b8b0c8', 'rgba(40,34,52,0.55)', 2.6, 0.9, false, 4, 0.7), '#b8b0c8'),
        cien: wzor(ctx, kafelek('#8e869e', 'rgba(30,26,40,0.55)', 2.6, 0.9, true, 0, 0.7), '#8e869e'),
        jasna: wzor(ctx, kafelek('#d8d2e4', 'rgba(60,52,76,0.45)', 3, 0.9, false, 2, 0.6), '#d8d2e4'),
      };
      break;
    default:                 // człowiek: płaszcz w pionowych fałdach
      f = {
        cialo: wzor(ctx, kafelek('#1d1813', 'rgba(222,208,176,0.4)', 3.4, 1.57, false, 2), '#1d1813'),
        cien: wzor(ctx, kafelek('#12100c', 'rgba(170,158,130,0.35)', 3.4, 1.57, true, 0), '#12100c'),
        jasna: wzor(ctx, kafelek('#2e271f', 'rgba(236,224,196,0.5)', 3, 1.57, false, 4), '#2e271f'),
      };
  }
  faktury.set(klucz, f);
  return f;
}

// ---------------------------------------------------------------- geometria

/** Część sylwetki. Kapsuła to kończyna: odcinek o zmiennej grubości. */
type Czesc =
  | { k: 'kapsula'; x1: number; y1: number; x2: number; y2: number; r1: number; r2: number; w: 'cialo' | 'cien' | 'jasna' }
  | { k: 'wielokat'; p: number[]; w: 'cialo' | 'cien' | 'jasna' }
  | { k: 'elipsa'; x: number; y: number; rx: number; ry: number; rot: number; w: 'cialo' | 'cien' | 'jasna' };

class Sylwetka {
  czesci: Czesc[] = [];
  kapsula(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number, w: Czesc['w'] = 'cialo'): void {
    this.czesci.push({ k: 'kapsula', x1, y1, x2, y2, r1, r2, w });
  }
  wielokat(p: number[], w: Czesc['w'] = 'cialo'): void { this.czesci.push({ k: 'wielokat', p, w }); }
  elipsa(x: number, y: number, rx: number, ry: number, rot = 0, w: Czesc['w'] = 'cialo'): void {
    this.czesci.push({ k: 'elipsa', x, y, rx, ry, rot, w });
  }
}

function sciezka(ctx: CanvasRenderingContext2D, c: Czesc): void {
  ctx.beginPath();
  if (c.k === 'elipsa') { ctx.ellipse(c.x, c.y, Math.max(0.1, c.rx), Math.max(0.1, c.ry), c.rot, 0, Math.PI * 2); return; }
  if (c.k === 'wielokat') {
    ctx.moveTo(c.p[0], c.p[1]);
    for (let i = 2; i < c.p.length; i += 2) ctx.lineTo(c.p[i], c.p[i + 1]);
    ctx.closePath();
    return;
  }
  // kapsuła: dwa półkola połączone stycznymi
  const dx = c.x2 - c.x1, dy = c.y2 - c.y1;
  const d = Math.hypot(dx, dy) || 0.001;
  const a = Math.atan2(dy, dx);
  const s = Math.asin(Math.max(-1, Math.min(1, (c.r1 - c.r2) / d)));
  ctx.arc(c.x1, c.y1, c.r1, a + Math.PI / 2 + s, a - Math.PI / 2 - s);
  ctx.arc(c.x2, c.y2, c.r2, a - Math.PI / 2 - s, a + Math.PI / 2 + s);
  ctx.closePath();
}

/** Obrys, potem wypełnienie — obwódka zostaje tylko na zewnątrz całej sylwetki. */
function wyrysuj(ctx: CanvasRenderingContext2D, s: Sylwetka, f: Faktura, obrys: string, grubosc: number): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = obrys;
  ctx.lineWidth = grubosc * 2;
  for (const c of s.czesci) { sciezka(ctx, c); ctx.stroke(); }
  for (const c of s.czesci) {
    sciezka(ctx, c);
    ctx.fillStyle = f[c.w];
    ctx.fill();
  }
}

// ---------------------------------------------------------------- szkielet

/** Kąty w radianach; 0 = kończyna w dół, dodatnie = do przodu (w stronę patrzenia). */
interface Poza {
  /** Wysokość bioder nad ziemią jako ułamek h (przysiad, klęk). */
  biodra: number;
  /** Pochylenie tułowia do przodu. */
  tulow: number;
  glowa: number;
  udoA: number; lydkaA: number;
  udoB: number; lydkaB: number;
  ramieA: number; lokiecA: number;
  ramieB: number; lokiecB: number;
  /** Uniesienie całej postaci (podskok kroku). */
  bob: number;
  /** Oddech: rozszerzenie tułowia. */
  oddech: number;
}

// budowa ciała każdej rasy — nastawy/wyglad/postacie.ts

const PI = Math.PI;
const sin = Math.sin, cos = Math.cos;

/** Poza z czynności, fazy kroku i rasy. Tu jest cała choreografia. */
function poza(rasa: Race, cz: Czynnosc, r: Ruch, czas: number, c: Creature): Poza {
  const f = r.faza * PI * 2;
  const oddech = sin(czas * 0.0022 + c.id) * 0.5 + 0.5;
  const p: Poza = {
    biodra: 1, tulow: 0.08, glowa: 0,
    udoA: 0, lydkaA: 0, udoB: 0, lydkaB: 0,
    ramieA: 0.15, lokiecA: 0.25, ramieB: -0.1, lokiecB: 0.2,
    bob: 0, oddech: oddech * 0.04,
  };
  const garb = rasa === Race.GOBLIN ? 0.42 : rasa === Race.TROLL ? 0.62 : rasa === Race.DWARF ? 0.08 : 0.04;
  p.tulow = garb;
  const ruchOgr = ustawienia.ograniczRuch ? 0.5 : 1;

  switch (cz) {
    case 'stoi': {
      // rozgląda się co jakiś czas — każde w swoim rytmie
      const rozglad = sin(czas * 0.0007 + c.id * 2.1);
      p.glowa = rozglad > 0.7 ? 0.25 : rozglad < -0.8 ? -0.2 : 0;
      p.udoA = 0.06; p.udoB = -0.06; p.lydkaA = 0.05; p.lydkaB = 0.05;
      p.ramieA = 0.08 + oddech * 0.04; p.ramieB = -0.06 - oddech * 0.03;
      if (rasa === Race.TROLL) { p.ramieA = 0.45; p.ramieB = 0.3; p.lokiecA = 0.2; p.lokiecB = 0.15; }
      break;
    }
    case 'idzie': case 'biegnie': {
      const bieg = cz === 'biegnie';
      const amp = (bieg ? 0.75 : 0.48) * ruchOgr;
      p.udoA = sin(f) * amp; p.udoB = sin(f + PI) * amp;
      p.lydkaA = Math.max(0, -cos(f)) * (bieg ? 1.3 : 0.8);
      p.lydkaB = Math.max(0, -cos(f + PI)) * (bieg ? 1.3 : 0.8);
      p.ramieA = -sin(f) * amp * 0.9; p.ramieB = -sin(f + PI) * amp * 0.9;
      p.lokiecA = bieg ? 1.3 : 0.35; p.lokiecB = bieg ? 1.3 : 0.35;
      p.bob = Math.abs(sin(f)) * (bieg ? 0.05 : 0.025) * ruchOgr;
      p.tulow = garb + (bieg ? 0.28 : 0.06);
      if (bieg && c.fear > 0.55) {             // ucieka: ręce w górę, głowa się ogląda
        p.ramieA = -2.4 + sin(f * 2) * 0.3; p.ramieB = -2.1 + sin(f * 2 + 1) * 0.3;
        p.lokiecA = 0.3; p.lokiecB = 0.3; p.glowa = -0.35;
      }
      if (rasa === Race.TROLL) {               // na knykciach: ręce idą jak przednie nogi
        p.tulow = 0.95;
        p.ramieA = 0.35 + sin(f + PI) * amp * 0.8; p.ramieB = 0.35 + sin(f) * amp * 0.8;
        p.lokiecA = 0.15; p.lokiecB = 0.15;
      }
      if (rasa === Race.DWARF) {               // ciężki, równy krok — bez podskoków
        p.bob *= 0.4;
      }
      break;
    }
    case 'wspina': {
      const g = r.fazaPion * PI * 2;
      p.tulow = 0;
      p.ramieA = -2.6 + sin(g) * 0.45; p.lokiecA = 0.5 + Math.max(0, cos(g)) * 0.6;
      p.ramieB = -2.6 + sin(g + PI) * 0.45; p.lokiecB = 0.5 + Math.max(0, cos(g + PI)) * 0.6;
      p.udoA = 0.9 + sin(g + PI) * 0.4; p.lydkaA = 1.4;
      p.udoB = 0.9 + sin(g) * 0.4; p.lydkaB = 1.4;
      p.biodra = 0.85;
      p.glowa = -0.3;
      break;
    }
    case 'spada': {
      const m = czas * 0.02;
      p.tulow = 0.1 + sin(m * 0.5) * 0.2;
      p.ramieA = -2.5 + sin(m) * 0.6; p.lokiecA = 0.4;
      p.ramieB = -2.2 + sin(m + 2) * 0.6; p.lokiecB = 0.4;
      p.udoA = 0.4 + sin(m + 1) * 0.3; p.lydkaA = 0.6;
      p.udoB = -0.2 + sin(m + 3) * 0.3; p.lydkaB = 0.8;
      p.glowa = -0.4;
      break;
    }
    case 'kopie': {
      // zamach (0..0.55), uderzenie (0.55..0.68), powrót — każdy własnym tempem
      const tempo = rasa === Race.DWARF ? 1.25 : rasa === Race.TROLL ? 0.7 : 1;
      const k = (r.zegar * tempo * 1.1 + c.id * 0.13) % 1;
      let kat: number;
      if (k < 0.55) kat = -2.6 * (k / 0.55);                          // unosi
      else if (k < 0.68) kat = -2.6 + 3.6 * ((k - 0.55) / 0.13);      // uderza
      else kat = 1.0 - 1.0 * ((k - 0.68) / 0.32);                     // opuszcza
      p.ramieA = kat; p.lokiecA = 0.2; p.ramieB = kat + 0.25; p.lokiecB = 0.35;
      p.tulow = garb + (k > 0.55 && k < 0.75 ? 0.35 : 0.05);
      p.udoA = 0.3; p.lydkaA = 0.3; p.udoB = -0.25; p.lydkaB = 0.1;
      break;
    }
    case 'modli': {
      const pokl = (sin(czas * 0.0018 + c.id) + 1) / 2;
      p.biodra = 0.6;                                                 // na kolanach: udo w dół, łydka za siebie
      p.udoA = 0.45; p.lydkaA = 1.65; p.udoB = 0.35; p.lydkaB = 1.6;
      p.tulow = 0.15 + pokl * 0.75;
      p.ramieA = -2.3 + pokl * 1.8; p.lokiecA = 0.3;
      p.ramieB = -2.1 + pokl * 1.8; p.lokiecB = 0.3;
      p.glowa = 0.2 + pokl * 0.3;
      break;
    }
    case 'je': {
      const k = (r.zegar * 1.6 + c.id * 0.2) % 1;
      p.biodra = 0.7;
      p.udoA = 1.0; p.lydkaA = 1.5; p.udoB = 0.7; p.lydkaB = 1.3;
      p.tulow = garb + 0.35;
      p.ramieA = k < 0.5 ? 0.9 - k * 3 : -0.6 + (k - 0.5) * 3; p.lokiecA = 1.9;   // ręka do ust i z powrotem
      p.ramieB = 0.6; p.lokiecB = 0.4;
      p.glowa = 0.3;
      break;
    }
    case 'walczy': {
      const k = (r.zegar * 1.8 + c.id * 0.17) % 1;
      const cios = k < 0.35 ? -2.2 * (k / 0.35) : k < 0.5 ? -2.2 + 3.4 * ((k - 0.35) / 0.15) : 1.2 - 1.2 * ((k - 0.5) / 0.5);
      p.ramieA = cios; p.lokiecA = 0.3;
      p.ramieB = 0.9; p.lokiecB = 1.2;                                // zasłona
      p.udoA = 0.55; p.lydkaA = 0.2; p.udoB = -0.45; p.lydkaB = 0.15; // wypad
      p.tulow = garb + (k > 0.35 && k < 0.6 ? 0.4 : 0.15);
      p.biodra = 0.92;
      break;
    }
    case 'buduje': {
      const k = (r.zegar * 1.5 + c.id * 0.1) % 1;
      p.biodra = 0.75;
      p.udoA = 0.9; p.lydkaA = 1.4; p.udoB = 0.5; p.lydkaB = 1.0;
      p.tulow = garb + 0.45;
      p.ramieA = k < 0.6 ? -1.4 * (k / 0.6) : -1.4 + 2.6 * ((k - 0.6) / 0.4); p.lokiecA = 0.4;
      p.ramieB = 0.8; p.lokiecB = 0.6;
      break;
    }
    case 'spi': {
      p.biodra = 0.3; p.tulow = 1.3;
      p.udoA = 1.6; p.lydkaA = 2.4; p.udoB = 1.5; p.lydkaB = 2.3;
      p.ramieA = 0.9; p.lokiecA = 1.8; p.ramieB = 0.8; p.lokiecB = 1.8;
      p.oddech = oddech * 0.1;
      p.glowa = 0.6;
      break;
    }
    case 'wysysa': break;
  }
  // szaleństwo: drgania i przekrzywiona głowa
  if (c.mad > 0.4 && !ustawienia.ograniczRuch) {
    const d = c.mad * 0.35;
    p.glowa += sin(czas * 0.037 + c.id) * d;
    p.ramieB += sin(czas * 0.051 + c.id * 3) * d;
  }
  return p;
}

/** Punkt na końcu kończyny: dwa odcinki, drugi zgięty względem pierwszego. */
function staw(x: number, y: number, dl1: number, kat1: number, dl2: number, zgiecie: number): [number, number, number, number] {
  const kx = x + sin(kat1) * dl1, ky = y + cos(kat1) * dl1;
  const k2 = kat1 + zgiecie;
  return [kx, ky, kx + sin(k2) * dl2, ky + cos(k2) * dl2];
}

interface Szkielet {
  biodroX: number; biodroY: number;
  barkX: number; barkY: number;
  glowaX: number; glowaY: number;
  /** końce kończyn: [kolano/łokieć x, y, stopa/dłoń x, y] */
  nogaA: [number, number, number, number]; nogaB: [number, number, number, number];
  rekaA: [number, number, number, number]; rekaB: [number, number, number, number];
}

function szkielet(b: Budowa, p: Poza, h: number): Szkielet {
  const nogi = (b.udo + b.lydka) * h;
  const biodroY = -nogi * p.biodra - p.bob * h;
  const biodroX = 0;
  const tul = b.tulow * h * (1 + p.oddech * 0.3);
  const barkX = biodroX + sin(p.tulow) * tul;
  const barkY = biodroY - cos(p.tulow) * tul;
  const szyja = b.glowa * h * 0.9;
  const kg = p.tulow * 0.6 + p.glowa;
  const glowaX = barkX + sin(kg) * szyja;
  const glowaY = barkY - cos(kg) * szyja;
  return {
    biodroX, biodroY, barkX, barkY, glowaX, glowaY,
    nogaA: staw(biodroX, biodroY, b.udo * h, p.udoA, b.lydka * h, -p.lydkaA),
    nogaB: staw(biodroX, biodroY, b.udo * h, p.udoB, b.lydka * h, -p.lydkaB),
    rekaA: staw(barkX, barkY, b.ramie * h, p.ramieA, b.przedramie * h, p.lokiecA),
    rekaB: staw(barkX, barkY, b.ramie * h, p.ramieB, b.przedramie * h, p.lokiecB),
  };
}

// ------------------------------------------------------------- rasy: bryły

function tulowPoly(s: Szkielet, b: Budowa, h: number, p: Poza, dodaj = 0): number[] {
  // czworobok od bioder do barków, prostopadle do osi tułowia
  const nx = cos(p.tulow), ny = sin(p.tulow);
  const bark = b.bark * h * (1 + p.oddech) + dodaj, pas = b.pas * h + dodaj;
  return [
    s.biodroX - nx * pas, s.biodroY - ny * pas,
    s.barkX - nx * bark, s.barkY - ny * bark,
    s.barkX + nx * bark, s.barkY + ny * bark,
    s.biodroX + nx * pas, s.biodroY + ny * pas,
  ];
}

function czlekoksztaltny(rasa: Race, s: Szkielet, b: Budowa, h: number, p: Poza): Sylwetka {
  const sy = new Sylwetka();
  const gu = b.grubUda * h, gr = b.grubRamienia * h;
  // z tyłu: dalsza noga i dalsza ręka w cieniu
  sy.kapsula(s.biodroX, s.biodroY, s.nogaB[0], s.nogaB[1], gu, gu * 0.8, 'cien');
  sy.kapsula(s.nogaB[0], s.nogaB[1], s.nogaB[2], s.nogaB[3], gu * 0.8, gu * 0.62, 'cien');
  sy.kapsula(s.barkX, s.barkY, s.rekaB[0], s.rekaB[1], gr, gr * 0.85, 'cien');
  sy.kapsula(s.rekaB[0], s.rekaB[1], s.rekaB[2], s.rekaB[3], gr * 0.85, gr * 0.9, 'cien');

  if (rasa === Race.HUMAN) {
    // płaszcz: trapez od barków do kolan, rozwiewa się z krokiem
    const nx = cos(p.tulow), ny = sin(p.tulow);
    const dolX = s.biodroX + sin(p.tulow * 0.5) * h * 0.14, dolY = s.biodroY + h * 0.16;
    const rozwiew = (p.udoA - p.udoB) * h * 0.05;
    sy.wielokat([
      s.barkX - nx * b.bark * h * 1.1, s.barkY - ny * b.bark * h,
      s.barkX + nx * b.bark * h * 1.1, s.barkY + ny * b.bark * h,
      dolX + h * 0.17 + rozwiew, dolY,
      dolX - h * 0.19 - rozwiew * 0.5, dolY + h * 0.02,
    ]);
  } else {
    sy.wielokat(tulowPoly(s, b, h, p));
  }
  if (rasa === Race.DWARF) {
    // fartuch kowala: szeroki płat od piersi po kolana
    const nx = cos(p.tulow), ny = sin(p.tulow);
    const sx = s.barkX * 0.55 + s.biodroX * 0.45, syy = s.barkY * 0.55 + s.biodroY * 0.45;
    sy.wielokat([
      sx - nx * b.bark * h * 0.8, syy - ny * b.bark * h * 0.8,
      sx + nx * b.bark * h * 0.9, syy + ny * b.bark * h * 0.9,
      s.biodroX + nx * b.pas * h * 1.1 + h * 0.02, s.biodroY + h * 0.06,
      s.biodroX - nx * b.pas * h * 1.0 + h * 0.02, s.biodroY + h * 0.06,
    ], 'jasna');
  }
  if (rasa === Race.TROLL) {
    // garb: guz kamienia na karku
    sy.elipsa(s.barkX - cos(p.tulow) * h * 0.06, s.barkY - h * 0.02, b.bark * h * 0.8, b.bark * h * 0.62, p.tulow);
  }
  // głowa
  const gr2 = b.glowa * h;
  if (rasa === Race.GOBLIN) {
    sy.elipsa(s.glowaX + gr2 * 0.1, s.glowaY, gr2 * 1.05, gr2 * 0.9, 0.3);
    // spiczaste ucho, wysoko i do tyłu — słuchem widzą
    sy.wielokat([
      s.glowaX - gr2 * 0.15, s.glowaY - gr2 * 0.55,
      s.glowaX - gr2 * 1.35, s.glowaY - gr2 * 1.45 - p.bob * h * 2,
      s.glowaX - gr2 * 0.75, s.glowaY + gr2 * 0.05,
    ]);
    // nos, którym widzą
    sy.wielokat([
      s.glowaX + gr2 * 0.8, s.glowaY - gr2 * 0.2,
      s.glowaX + gr2 * 1.55, s.glowaY + gr2 * 0.35,
      s.glowaX + gr2 * 0.75, s.glowaY + gr2 * 0.3,
    ]);
  } else if (rasa === Race.DWARF) {
    sy.elipsa(s.glowaX, s.glowaY, gr2, gr2 * 0.95);
    // broda sięgająca piersi
    sy.wielokat([
      s.glowaX - gr2 * 0.3, s.glowaY + gr2 * 0.2,
      s.glowaX + gr2 * 1.0, s.glowaY + gr2 * 0.1,
      s.glowaX + gr2 * 0.55, s.glowaY + gr2 * 2.0,
      s.glowaX - gr2 * 0.1, s.glowaY + gr2 * 1.3,
    ], 'jasna');
    // hełm z rondem
    sy.wielokat([
      s.glowaX - gr2 * 1.35, s.glowaY - gr2 * 0.25,
      s.glowaX - gr2 * 0.8, s.glowaY - gr2 * 1.25,
      s.glowaX + gr2 * 0.8, s.glowaY - gr2 * 1.25,
      s.glowaX + gr2 * 1.45, s.glowaY - gr2 * 0.25,
    ], 'cien');
  } else if (rasa === Race.TROLL) {
    sy.elipsa(s.glowaX + gr2 * 0.3, s.glowaY + gr2 * 0.2, gr2 * 1.1, gr2 * 0.95, 0.2);
  } else {
    // kaptur
    sy.wielokat([
      s.glowaX - gr2 * 1.2, s.glowaY + gr2 * 0.9,
      s.glowaX - gr2 * 1.0, s.glowaY - gr2 * 0.6,
      s.glowaX + gr2 * 0.1, s.glowaY - gr2 * 1.5,
      s.glowaX + gr2 * 1.2, s.glowaY - gr2 * 0.3,
      s.glowaX + gr2 * 1.1, s.glowaY + gr2 * 0.9,
    ]);
  }
  // z przodu: bliższa noga i ręka
  sy.kapsula(s.biodroX, s.biodroY, s.nogaA[0], s.nogaA[1], gu, gu * 0.8);
  sy.kapsula(s.nogaA[0], s.nogaA[1], s.nogaA[2], s.nogaA[3], gu * 0.8, gu * 0.62);
  sy.kapsula(s.barkX, s.barkY, s.rekaA[0], s.rekaA[1], gr, gr * 0.85);
  sy.kapsula(s.rekaA[0], s.rekaA[1], s.rekaA[2], s.rekaA[3], gr * 0.85, rasa === Race.TROLL ? gr * 1.25 : gr * 0.9);
  // stopy
  const stopa = (x: number, y: number, w: Czesc['w']) => sy.elipsa(x + gu * 0.6, y, gu * (rasa === Race.TROLL ? 1.4 : 1.1), gu * 0.55, 0, w);
  stopa(s.nogaB[2], s.nogaB[3], 'cien');
  stopa(s.nogaA[2], s.nogaA[3], 'cialo');
  return sy;
}

/** Twarz, narzędzia, żar — to, co idzie na wierzch sylwetki. */
function szczegoly(ctx: CanvasRenderingContext2D, rasa: Race, s: Szkielet, b: Budowa, h: number, p: Poza, cz: Czynnosc, czas: number, c: Creature, obrys: string): void {
  const gr = b.glowa * h;
  const lw = Math.max(0.8, h * 0.035);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // narzędzie w dłoni: kilof przy kopaniu, młot przy budowie, pałka w walce
  if (cz === 'kopie' || cz === 'buduje' || (cz === 'walczy' && rasa !== Race.SPINNER)) {
    const [, , dx, dy] = s.rekaA;
    const kat = Math.atan2(dy - s.rekaA[1], dx - s.rekaA[0]);
    const dl = h * (rasa === Race.TROLL ? 0.2 : 0.34);
    const ex = dx + cos(kat) * dl, ey = dy + sin(kat) * dl;
    ctx.strokeStyle = 'rgba(12,8,6,0.95)';
    ctx.lineWidth = lw * 2.4;
    ctx.beginPath(); ctx.moveTo(dx - cos(kat) * dl * 0.25, dy - sin(kat) * dl * 0.25); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = 'rgba(176,150,112,0.95)';
    ctx.lineWidth = lw * 1.1;
    ctx.stroke();
    // główka narzędzia
    ctx.strokeStyle = 'rgba(214,206,192,0.95)';
    ctx.lineWidth = lw * (cz === 'buduje' ? 2.6 : 1.6);
    ctx.beginPath();
    if (cz === 'kopie') {
      const px = -sin(kat), py = cos(kat);
      ctx.moveTo(ex - px * h * 0.13 - cos(kat) * h * 0.04, ey - py * h * 0.13 - sin(kat) * h * 0.04);
      ctx.quadraticCurveTo(ex + cos(kat) * h * 0.03, ey + sin(kat) * h * 0.03, ex + px * h * 0.13 - cos(kat) * h * 0.04, ey + py * h * 0.13 - sin(kat) * h * 0.04);
    } else {
      const px = -sin(kat), py = cos(kat);
      ctx.moveTo(ex - px * h * 0.05, ey - py * h * 0.05);
      ctx.lineTo(ex + px * h * 0.05, ey + py * h * 0.05);
    }
    ctx.stroke();
  }

  // twarze — mało kresek, bo to rycina, nie komiks
  ctx.lineWidth = lw;
  if (rasa === Race.GOBLIN) {
    // Ślepy Lud: przepaska w miejscu oczu
    ctx.strokeStyle = 'rgba(214,196,160,0.85)';
    ctx.beginPath();
    ctx.moveTo(s.glowaX - gr * 0.55, s.glowaY - gr * 0.25);
    ctx.lineTo(s.glowaX + gr * 1.0, s.glowaY - gr * 0.05);
    ctx.stroke();
    // usta w pokłonie i przy jedzeniu otwarte
    if (cz === 'je' || cz === 'modli') {
      ctx.strokeStyle = 'rgba(10,6,6,0.9)';
      ctx.beginPath(); ctx.arc(s.glowaX + gr * 0.8, s.glowaY + gr * 0.45, gr * 0.18, 0, PI * 2); ctx.stroke();
    }
  } else if (rasa === Race.DWARF) {
    // oczy pod rondem hełmu, żar w szczelinach fartucha
    ctx.fillStyle = 'rgba(255,210,150,0.9)';
    ctx.fillRect(s.glowaX + gr * 0.35, s.glowaY - gr * 0.2, Math.max(1, gr * 0.22), Math.max(1, gr * 0.14));
    const migot = 0.55 + 0.45 * sin(czas * 0.009 + c.id * 1.7);
    const cx = s.barkX * 0.45 + s.biodroX * 0.55, cy = s.barkY * 0.45 + s.biodroY * 0.55;
    ctx.fillStyle = `rgba(255,${(120 + 90 * migot) | 0},50,${0.55 + migot * 0.4})`;
    for (let i = 0; i < 3; i++) {
      const ox = ((i * 0.37 + c.id * 0.11) % 1 - 0.5) * b.bark * h * 1.2;
      const oy = ((i * 0.61 + c.id * 0.07) % 1 - 0.5) * h * 0.12;
      ctx.fillRect(cx + ox, cy + oy, Math.max(1, h * 0.028), Math.max(1, h * 0.028));
    }
  } else if (rasa === Race.TROLL) {
    // kieł i słabe, czerwone oko w mroku
    ctx.strokeStyle = 'rgba(226,218,196,0.9)';
    ctx.beginPath();
    ctx.moveTo(s.glowaX + gr * 1.0, s.glowaY + gr * 0.55);
    ctx.lineTo(s.glowaX + gr * 1.15, s.glowaY - gr * 0.05);
    ctx.stroke();
    if (cz !== 'spi') {
      ctx.fillStyle = `rgba(220,70,50,${0.5 + 0.4 * sin(czas * 0.004 + c.id)})`;
      ctx.fillRect(s.glowaX + gr * 0.55, s.glowaY - gr * 0.15, Math.max(1, gr * 0.25), Math.max(1, gr * 0.2));
    }
    // spękania kamiennej skóry
    ctx.strokeStyle = 'rgba(6,4,8,0.8)';
    ctx.lineWidth = lw * 0.8;
    const nx = cos(p.tulow), ny = sin(p.tulow);
    ctx.beginPath();
    ctx.moveTo(s.barkX - nx * h * 0.05, s.barkY - ny * h * 0.05);
    ctx.lineTo(s.barkX * 0.6 + s.biodroX * 0.4 + nx * h * 0.04, s.barkY * 0.6 + s.biodroY * 0.4 + ny * h * 0.04);
    ctx.lineTo(s.biodroX - nx * h * 0.03, s.biodroY - ny * h * 0.02);
    ctx.stroke();
  } else if (rasa === Race.HUMAN) {
    // twarz w cieniu kaptura i pochodnia
    ctx.fillStyle = 'rgba(232,214,186,0.8)';
    ctx.fillRect(s.glowaX + gr * 0.35, s.glowaY - gr * 0.1, Math.max(1, gr * 0.3), Math.max(1, gr * 0.2));
    const [, , hx, hy] = s.rekaA;
    ctx.strokeStyle = 'rgba(120,90,60,0.95)';
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + h * 0.06, hy - h * 0.2); ctx.stroke();
    const migot = 0.7 + sin(czas * 0.013 + c.id) * 0.3;
    const fx = hx + h * 0.07, fy = hy - h * 0.26;
    const blask = ctx.createRadialGradient(fx, fy, 0, fx, fy, h * 0.5);
    blask.addColorStop(0, `rgba(255,190,100,${0.35 * migot})`);
    blask.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = blask;
    ctx.fillRect(fx - h * 0.5, fy - h * 0.5, h, h);
    ctx.fillStyle = `rgba(255,${(170 * migot) | 0},70,0.95)`;
    ctx.beginPath();
    ctx.moveTo(fx - h * 0.045, fy + h * 0.03);
    ctx.quadraticCurveTo(fx + sin(czas * 0.02) * h * 0.03, fy - h * 0.16 * migot, fx + h * 0.045, fy + h * 0.03);
    ctx.fill();
  }

  // wzięty w jarzmo: pętla nici na szyi i nić ciągnąca się za plecy, do tej, co go trzyma
  if (c.slave) {
    const nx = s.glowaX * 0.4 + s.barkX * 0.6, ny = s.glowaY * 0.4 + s.barkY * 0.6;
    ctx.strokeStyle = 'rgba(226,220,236,0.8)';
    ctx.lineWidth = Math.max(0.7, h * 0.02);
    ctx.beginPath(); ctx.ellipse(nx, ny, b.glowa * h * 0.55, b.glowa * h * 0.3, 0.4, 0, PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nx - b.glowa * h * 0.5, ny);
    ctx.quadraticCurveTo(nx - h * 0.3, ny + h * 0.1 + sin(czas * 0.003 + c.id) * h * 0.04, nx - h * 0.55, ny - h * 0.05);
    ctx.stroke();
  }

  // niesiony łup: worek na plecach z błyskiem rudy
  if (c.carry > 0) {
    const nx = cos(p.tulow), ny = sin(p.tulow);
    const wx = s.barkX * 0.6 + s.biodroX * 0.4 - nx * b.bark * h * 1.4;
    const wy = s.barkY * 0.6 + s.biodroY * 0.4 - ny * b.bark * h * 0.6;
    ctx.fillStyle = 'rgba(38,28,20,0.97)';
    ctx.strokeStyle = obrys;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.ellipse(wx, wy, h * 0.12, h * 0.1, 0.3, 0, PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(242,212,142,0.95)';
    ctx.fillRect(wx - h * 0.02, wy - h * 0.06, Math.max(1.2, h * 0.04), Math.max(1.2, h * 0.04));
  }
}

// ------------------------------------------------------------------ Prządka

/**
 * Prządka: blady odwłok, głowotułów i osiem odnóży stąpających czwórkami na przemian.
 * Odnóża liczone od miejsca stopy, więc stoją na ziemi, zamiast pływać w powietrzu.
 */
function przadka(ctx: CanvasRenderingContext2D, h: number, r: Ruch, cz: Czynnosc, czas: number, c: Creature, f: Faktura, obrys: string): void {
  const faza = r.faza * PI * 2;
  const idzie = cz === 'idzie' || cz === 'biegnie';
  const oddech = sin(czas * 0.003 + c.id) * 0.03;
  const cialoY = -h * (cz === 'wysysa' ? 0.2 : cz === 'spada' ? 0.36 : 0.28) + (idzie ? sin(faza * 2) * h * 0.015 : 0);
  const sy = new Sylwetka();
  const gr = Math.max(0.6, h * 0.02);
  // Odnóża w rzucie z boku: cztery pary od przodu do tyłu. Stąpają czwórkami na
  // przemian (1. i 3. jednej strony z 2. i 4. drugiej), stopa stoi, kolano wysoko.
  const nogi: { bx: number; kx: number; ky: number; sx: number; syy: number; blizsza: boolean }[] = [];
  for (let i = 0; i < 4; i++) {
    for (const blizsza of [false, true]) {
      const g = ((i + (blizsza ? 1 : 0)) % 2) * PI;
      const krok = idzie ? sin(faza + g) : 0;
      const unies = idzie ? Math.max(0, cos(faza + g)) * h * 0.07 : 0;
      const bx = h * (0.2 - i * 0.07);
      const sx = h * (0.5 - i * 0.3) + krok * h * 0.07 + (blizsza ? 0 : h * 0.05);
      const syy = cz === 'spada' ? -h * 0.1 + sin(czas * 0.03 + i) * h * 0.04 : -unies;
      const kx = bx + (sx - bx) * 0.45;
      const ky = cialoY - h * (0.2 + (i === 0 || i === 3 ? 0.03 : 0.07)) - unies * 0.4;
      nogi.push({ bx, kx, ky, sx, syy, blizsza });
    }
  }
  for (const n of nogi) if (!n.blizsza) {
    sy.kapsula(n.bx, cialoY, n.kx, n.ky, gr, gr * 0.9, 'cien');
    sy.kapsula(n.kx, n.ky, n.sx, n.syy, gr * 0.9, gr * 0.5, 'cien');
  }
  sy.elipsa(-h * 0.2, cialoY - h * 0.04, h * 0.2 * (1 + oddech), h * 0.16 * (1 + oddech), -0.25, 'jasna');  // odwłok
  sy.elipsa(h * 0.12, cialoY, h * 0.11, h * 0.085, 0.05);                                               // głowotułów
  for (const n of nogi) if (n.blizsza) {
    sy.kapsula(n.bx, cialoY, n.kx, n.ky, gr, gr * 0.9);
    sy.kapsula(n.kx, n.ky, n.sx, n.syy, gr * 0.9, gr * 0.5);
  }
  // jasne ciało potrzebuje ciemnego konturu — inaczej zlewało się z blada obwódką w jedną plamę
  wyrysuj(ctx, sy, f, 'rgba(18,14,24,0.95)', Math.max(0.8, h * 0.028));
  // barwa nacji jako znak na odwłoku: szpula nici
  ctx.strokeStyle = obrys;
  ctx.lineWidth = Math.max(0.8, h * 0.024);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(-h * 0.2, cialoY - h * 0.04, h * (0.05 + i * 0.045), h * (0.03 + i * 0.03), -0.25, PI * 0.1, PI * 0.9);
    ctx.stroke();
  }
  // gromada oczu
  ctx.fillStyle = 'rgba(120,20,40,0.95)';
  for (let i = 0; i < 4; i++) ctx.fillRect(h * 0.16 + (i % 2) * h * 0.035, cialoY - h * 0.05 + ((i / 2) | 0) * h * 0.03, Math.max(1, h * 0.022), Math.max(1, h * 0.022));
  // przy wysysaniu: nić do ofiary
  if (cz === 'wysysa') {
    ctx.strokeStyle = 'rgba(226,220,236,0.6)';
    ctx.lineWidth = Math.max(0.6, h * 0.015);
    ctx.beginPath();
    ctx.moveTo(h * 0.2, cialoY + h * 0.05);
    ctx.quadraticCurveTo(h * 0.35, cialoY + h * 0.2 + sin(czas * 0.004) * h * 0.04, h * 0.5, -h * 0.05);
    ctx.stroke();
  }
}

// ------------------------------------------------------------------- rysunek

/** Barwa klanu na obrysie — inaczej dwie nacje tej samej rasy są nie do odróżnienia. */
function barwaKlanu(klan: Clan | undefined): string {
  if (!klan) return 'rgba(238,228,206,0.92)';
  const c = RACES[klan.race].color;
  const t = klan.tint;
  const mieszaj = (v: number) => Math.max(40, Math.min(255, v + t * 160));
  return `rgba(${mieszaj(c[0]) | 0},${mieszaj(c[1]) | 0},${mieszaj(c[2]) | 0},0.95)`;
}

/** Jedna postać w miejscu (0,0) = środek stopy, twarzą w prawo. */
export function rysujPostac(
  ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, h: number, czas: number, cz?: Czynnosc,
): Czynnosc {
  const r = ruch(c, czas);
  const czyn = cz ?? czynnosc(c, r, sim);
  // własna grafika (src/grafiki/pliki): postac-<rasa>-<czynność> albo postac-<rasa>
  const rasaPliku = RASY_W_PLIKACH[c.race];
  const wlasna = pierwszaGrafika(`postac-${rasaPliku}-${czyn}`, `postac-${rasaPliku}`);
  if (wlasna && rysujGrafike(ctx, wlasna, 0, 0, h, { kotwicaY: 1, czas: czas + c.id * 97 })) return czyn;
  const obrys = barwaKlanu(sim.clans[c.clan]);
  const f = fakturaRasy(ctx, c.race);
  if (c.race === Race.SPINNER) {
    przadka(ctx, h, r, czyn, czas, c, f, obrys);
    return czyn;
  }
  const b = BUDOWA[c.race] ?? BUDOWA[Race.HUMAN];
  const p = poza(c.race, czyn, r, czas, c);
  if (czyn === 'spi' && c.race === Race.TROLL) {
    // trol śpi w skale: zwinięty głaz, który oddycha
    const sy = new Sylwetka();
    sy.elipsa(0, -h * 0.24, h * 0.46, h * 0.26 * (1 + p.oddech), 0);
    sy.elipsa(h * 0.3, -h * 0.14, h * 0.14, h * 0.12, 0, 'cien');
    wyrysuj(ctx, sy, f, obrys, Math.max(1, h * 0.035));
    ctx.strokeStyle = 'rgba(6,4,8,0.8)';
    ctx.lineWidth = Math.max(0.8, h * 0.025);
    ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.42); ctx.lineTo(-h * 0.05, -h * 0.3); ctx.lineTo(h * 0.1, -h * 0.44); ctx.stroke();
    return czyn;
  }
  const s = szkielet(b, p, h);
  const sy = czlekoksztaltny(c.race, s, b, h, p);
  wyrysuj(ctx, sy, f, obrys, Math.max(0.9, h * 0.035));
  szczegoly(ctx, c.race, s, b, h, p, czyn, czas, c, obrys);
  // przy uderzeniu kilofa pryskają odpryski — w chwili trafienia, nie bez przerwy
  if (czyn === 'kopie') {
    const tempo = c.race === Race.DWARF ? 1.25 : c.race === Race.TROLL ? 0.7 : 1;
    const k = (r.zegar * tempo * 1.1 + c.id * 0.13) % 1;
    if (k > 0.66 && k < 0.8) {
      const t = (k - 0.66) / 0.14;
      const [, , hx, hy] = s.rekaA;
      for (let i = 0; i < 4; i++) {
        const a = -0.6 + i * 0.5 + sin(c.id + i) * 0.3;
        ctx.fillStyle = `rgba(236,222,196,${0.9 * (1 - t)})`;
        ctx.fillRect(hx + h * 0.3 + cos(a) * t * h * 0.35, hy + sin(a) * t * h * 0.35 - t * h * 0.1, Math.max(1, h * 0.035), Math.max(1, h * 0.035));
      }
    }
  }
  return czyn;
}

// ------------------------------------------------------- tłum: gotowe szkice
/**
 * WYDAJNOŚĆ (v4 beta): przy tłumie na ekranie postać nie jest rysowana od zera.
 * Rysunek (rasa, nacja, czynność, wielkość, klatka chodu i pracy, kierunek) trafia
 * do małego płótna i jest tylko wklejany — także dla innych postaci w tej samej pozie.
 * Szkice żyją `SZKIC_MS`, potem rysują się na nowo, więc animacja dalej płynie.
 */
/** Od ilu widocznych postaci włącza się tryb tłumu (Infinity = nigdy). */
export const TLUM = { od: 50 };
const SZKIC_MS = 150;
/** Najwięcej szkiców naraz i płócien w zapasie — na telefonie każde płótno to setki kB. */
const SZKICE_MAKS = 500, PULA_MAKS = 250;
const SZKICE = new Map<string, HTMLCanvasElement>();
const pulaPlocien: HTMLCanvasElement[] = [];
let szkiceOd = -1e9;

function postacZeSzkicu(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, h: number, czas: number, kier: number, sx: number, sy: number, cien: boolean): Czynnosc {
  if (czas - szkiceOd > SZKIC_MS || czas < szkiceOd || SZKICE.size > SZKICE_MAKS) {
    for (const p of SZKICE.values()) if (pulaPlocien.length < PULA_MAKS) pulaPlocien.push(p);
    SZKICE.clear();
    szkiceOd = czas;
  }
  const r = ruch(c, czas);
  const cz = czynnosc(c, r, sim);
  const hp = Math.max(8, Math.round(h));
  const klucz = `${c.race}|${c.clan}|${cz}|${hp}|${(r.faza * 6) | 0}|${(r.zegar * 6) | 0}|${kier}|${cien ? 1 : 0}`;
  const w = hp * 2.4, wys = hp * 2.1, stopy = hp * 1.6;
  let p = SZKICE.get(klucz);
  if (!p) {
    const t = ctx.getTransform();
    const skala = Math.max(1, Math.min(4, Math.hypot(t.a, t.b)));
    p = pulaPlocien.pop() ?? document.createElement('canvas');
    p.width = Math.ceil(w * skala); p.height = Math.ceil(wys * skala);
    const g = p.getContext('2d')!;
    g.setTransform(skala, 0, 0, skala, (w / 2) * skala, stopy * skala);
    if (cien) {
      g.fillStyle = 'rgba(6,4,4,0.55)';
      g.beginPath();
      g.ellipse(0, 0, hp * 0.32, hp * 0.065, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.scale(kier, 1);
    rysujPostac(g, sim, c, hp, czas, cz);
    SZKICE.set(klucz, p);
  }
  ctx.drawImage(p, sx - w / 2, sy - stopy, w, wys);
  return cz;
}

export function rysujStworzenia(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number, wybrany?: number): void {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const right = left + cam.vw / z, bottom = top + cam.vh / z;

  // z daleka tłum zlewa się w plamę — grupujemy i podpisujemy liczbą
  const grupowanie = z < 9;
  const zajete = new Map<string, { c: Creature; n: number }>();
  const doRysowania: { c: Creature; n: number }[] = [];
  for (const c of sim.creatures) {
    if (c.dead) continue;
    if (c.x < left - 3 || c.x > right + 3 || c.y < top - 3 || c.y > bottom + 3) { pamiec.delete(c); continue; }
    if (!grupowanie) { doRysowania.push({ c, n: 1 }); continue; }
    const klucz = `${Math.round(c.x / 2.2)},${Math.round(c.y / 2.2)},${c.race}`;
    const jest = zajete.get(klucz);
    if (jest) { jest.n++; continue; }
    const wpis = { c, n: 1 };
    zajete.set(klucz, wpis);
    doRysowania.push(wpis);
  }
  // dalsze (wyżej na ekranie) pierwsze — niższe zachodzą na nie, jak na rycinie z głębią
  doRysowania.sort((a, b) => a.c.y - b.c.y);
  const tlum = doRysowania.length > TLUM.od;

  for (const { c, n } of doRysowania) {
    const d = RACES[c.race];
    // minimalny rozmiar w pikselach: sylwetka musi być widoczna przy każdym zoomie
    const h = Math.max(16, d.size * z * 1.9 * ustawienia.wielkoscSylwetek);
    const sx = (c.x - left) * z;
    const sy = (c.y + 1 - top) * z;
    const kier = c.face >= 0 ? 1 : -1;

    // cień kontaktowy — tylko na ziemi
    const naZiemi = c.vy <= 0.3 && sim.world.solid(Math.floor(c.x), Math.floor(c.y) + 1);
    if (naZiemi && !(tlum && wybrany !== c.id)) {
      ctx.fillStyle = 'rgba(6,4,4,0.55)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, h * 0.32, h * 0.065, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    let cz: Czynnosc;
    if (tlum && wybrany !== c.id) cz = postacZeSzkicu(ctx, sim, c, h, czas, kier, sx, sy, naZiemi);
    else {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(kier, 1);
      cz = rysujPostac(ctx, sim, c, h, czas);
      ctx.restore();
    }

    // ilu ich tu stoi
    if (n > 1) {
      ctx.font = `${Math.max(13, h * 0.45)}px "Trzewia Tekst", Georgia, serif`;
      ctx.textAlign = 'left';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(8,6,5,0.85)';
      ctx.strokeText(`×${n}`, sx + h * 0.42, sy - h * 0.55);
      ctx.fillStyle = 'rgba(238,226,198,0.95)';
      ctx.fillText(`×${n}`, sx + h * 0.42, sy - h * 0.55);
    }
    // zaznaczony do szeptu
    if (wybrany === c.id) {
      ctx.strokeStyle = 'rgba(246,216,142,0.9)';
      ctx.lineWidth = Math.max(1.2, h * 0.06);
      ctx.beginPath();
      ctx.arc(sx, sy - h * 0.5, h * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }
    // prorok: łuk światła nad głową
    if (c.prophet) {
      ctx.strokeStyle = `rgba(246,216,142,${0.65 + 0.25 * Math.sin(czas * 0.004 + c.id)})`;
      ctx.lineWidth = Math.max(1, h * 0.06);
      ctx.beginPath();
      ctx.arc(sx, sy - h * 1.08, h * 0.24, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    // sen: powolne kłęby oddechu
    if (cz === 'spi' && !ustawienia.ograniczRuch) {
      const t = (czas * 0.0006 + c.id * 0.3) % 1;
      ctx.fillStyle = `rgba(214,206,190,${0.35 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(sx + kier * h * (0.3 + t * 0.2), sy - h * (0.5 + t * 0.4), h * (0.04 + t * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
