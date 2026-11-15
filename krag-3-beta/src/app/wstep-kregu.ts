/**
 * WSTĘP KRĘGU TRZECIEGO (beta) — polecenie użytkownika (15.11): „na początku gry zrób parę cutscenek, które dużo nam
 * mówią, a po cutscence włącz chwilowy gameplay, w którym gracz nie może nic ruszyć, w którym postacie dostają się
 * do miejsca początku gry, i dopiero gdy się tam dostaną, gracz przejmuje kontrolę”.
 *
 *  1. PLANSZE — pięć ilustrowanych scen (rysowanych w kodzie, tuszem jak gra): lej piekła; krąg żarłoków i Cerber;
 *     żywy człowiek i jego przewodnik (garść ziemi w paszcze Cerbera — pieśń VI); sześciu wstaje z błota (kim są
 *     i skąd mają swoje umiejętności); ty jesteś trzewiami kręgu (co robisz, po co schodzą, co ich czeka).
 *     Kliknięcie albo spacja — następna scena (najpierw dopisuje resztę tekstu).
 *  2. WEJŚCIE — scena w silniku gry bez sterowania: symulacja stoi, a szóstka wstaje z błota na tarasie kręgu,
 *     idzie między leżącymi żarłokami do szybu kosza i po kolei schodzi po linie w trzewia, do sali, na swoje
 *     miejsca. Gdy wszyscy dojdą — „Teraz ty.” — i gracz przejmuje kontrolę.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from '../render/camera';
import { makeCreature, type Creature } from '../sim/creatures';
import { Race } from '../sim/races';
import { SURFACE_Y } from '../sim/world';
import { wiadra } from '../sim/wiadro';
import { rysujPostac, type Czynnosc } from '../render/figury';
import { rysujCerbera, pozaCerbera } from '../render/cerber';
import { gruntKregu, zarlok, WIDOK_KREGU } from '../render/krag-swiat';
import { OBRYS } from '../render/potepieni';

const TUSZ = 'rgba(14,10,8,0.95)';
const KROJ = '"Trzewia Tekst", Georgia, serif';
const los = (n: number): number => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

interface Scena { tytul: string; linie: string[]; rysuj: (ctx: CanvasRenderingContext2D, R: Prost, t: number, czas: number, sim: Sim) => void }
interface Prost { x: number; y: number; w: number; h: number }

/** Na jedną linijkę tekstu tyle sekund (czytanie), plus chwila na samą ilustrację. */
const NA_LINIE = 3.4, NA_POCZATEK = 1.6;

// ---------------------------------------------------------------- postacie do ilustracji

const atrapy = new Map<string, Creature>();
function atrapa(klucz: string, rasa: Race, rola?: 'robotnik' | 'pobozny' | 'rycerz'): Creature {
  let c = atrapy.get(klucz);
  if (!c) {
    c = makeCreature(rasa, -1, 0, 0, 200000 + atrapy.size);
    if (rola) c.rola = rola;
    else (c as { obrys?: string }).obrys = OBRYS;
    atrapy.set(klucz, c);
  }
  return c;
}
function postac(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, x: number, y: number, h: number, czas: number, cz: Czynnosc, zwrot = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(zwrot, 1);
  rysujPostac(ctx, sim, c, h, czas, cz);
  ctx.restore();
}

/** Wędrowiec w szacie (żywy w czerwieni z kapturem, przewodnik w szarości z wieńcem) — stopy w (0, 0). */
function wedrowiec(ctx: CanvasRenderingContext2D, h: number, zywy: boolean, krok: number, rekaW: number): void {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, h * 0.025);
  const szata = zywy ? 'rgb(150,36,30)' : 'rgb(88,92,86)';
  const sk = 'rgb(214,190,160)';
  // nogi pod szatą
  const n = Math.sin(krok) * h * 0.06;
  ctx.fillStyle = 'rgb(40,30,24)';
  ctx.beginPath(); ctx.ellipse(-h * 0.06 + n, -h * 0.02, h * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(h * 0.06 - n, -h * 0.02, h * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  // szata
  ctx.fillStyle = szata;
  ctx.beginPath();
  ctx.moveTo(-h * 0.18, -h * 0.03); ctx.lineTo(-h * 0.12, -h * 0.62); ctx.quadraticCurveTo(0, -h * 0.72, h * 0.12, -h * 0.62);
  ctx.lineTo(h * 0.2, -h * 0.03); ctx.closePath(); ctx.fill(); ctx.stroke();
  // ręka (wzniesiona do rzutu)
  ctx.strokeStyle = szata; ctx.lineWidth = h * 0.07;
  const rx = h * (0.12 + 0.18 * rekaW), ry = -h * (0.45 + 0.35 * rekaW);
  ctx.beginPath(); ctx.moveTo(h * 0.06, -h * 0.58); ctx.lineTo(rx, ry); ctx.stroke();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, h * 0.02);
  ctx.beginPath(); ctx.moveTo(h * 0.06, -h * 0.58); ctx.lineTo(rx, ry); ctx.stroke();
  ctx.fillStyle = sk; ctx.beginPath(); ctx.arc(rx, ry, h * 0.03, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // głowa
  ctx.fillStyle = sk;
  ctx.beginPath(); ctx.arc(h * 0.02, -h * 0.8, h * 0.085, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (zywy) {
    // czerwony kaptur
    ctx.fillStyle = szata;
    ctx.beginPath(); ctx.arc(h * 0.0, -h * 0.82, h * 0.1, Math.PI * 0.95, Math.PI * 2.1); ctx.lineTo(-h * 0.1, -h * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    // wieniec laurowy
    ctx.strokeStyle = 'rgb(110,140,70)'; ctx.lineWidth = Math.max(1, h * 0.022);
    ctx.beginPath(); ctx.arc(h * 0.02, -h * 0.83, h * 0.09, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    // broda
    ctx.fillStyle = 'rgb(200,196,186)';
    ctx.beginPath(); ctx.moveTo(-h * 0.02, -h * 0.76); ctx.lineTo(h * 0.09, -h * 0.76); ctx.lineTo(h * 0.04, -h * 0.68); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/** Deszcz w prostokącie (smugi ukośne). */
function deszcz(ctx: CanvasRenderingContext2D, R: Prost, czas: number, gestosc = 1): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(170,186,190,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath();
  const n = Math.round(160 * gestosc);
  for (let i = 0; i < n; i++) {
    const x = R.x + ((los(i) * R.w * 1.2 + czas * 0.06) % (R.w * 1.2)) - R.w * 0.1;
    const y = R.y + ((los(i * 7) * R.h + czas * 0.7 * (0.8 + los(i * 3) * 0.5)) % R.h);
    ctx.moveTo(x, y); ctx.lineTo(x - 4, y - 16);
  }
  ctx.stroke();
  ctx.restore();
}

/** Błotnisty taras: niebo, horyzont z dalekim tłumem, ziemia. Zwraca y gruntu. */
function taras(ctx: CanvasRenderingContext2D, R: Prost, czas: number): number {
  const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
  g.addColorStop(0, 'rgb(14,16,18)'); g.addColorStop(0.55, 'rgb(36,40,40)'); g.addColorStop(0.62, 'rgb(48,46,38)'); g.addColorStop(1, 'rgb(30,28,22)');
  ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
  const yh = R.y + R.h * 0.58;
  // ściana leja na horyzoncie
  ctx.fillStyle = 'rgb(28,28,28)';
  ctx.beginPath(); ctx.moveTo(R.x, yh - R.h * 0.18);
  for (let i = 0; i <= 20; i++) { const u = i / 20; ctx.lineTo(R.x + R.w * u, yh - R.h * (0.1 + 0.12 * (2 * u - 1) ** 2) + (los(i) - 0.5) * 6); }
  ctx.lineTo(R.x + R.w, yh); ctx.lineTo(R.x, yh); ctx.closePath(); ctx.fill();
  // daleki tłum na horyzoncie
  ctx.fillStyle = 'rgba(20,18,16,0.9)';
  for (let i = 0; i < 90; i++) {
    const x = R.x + los(i * 13) * R.w, y = yh + los(i * 5) * R.h * 0.08;
    ctx.beginPath(); ctx.ellipse(x, y, R.h * 0.018, R.h * 0.006, 0, 0, Math.PI * 2); ctx.fill();
  }
  // kałuże
  ctx.fillStyle = 'rgba(90,100,96,0.25)';
  for (let i = 0; i < 14; i++) {
    const x = R.x + los(i * 23) * R.w, y = yh + R.h * (0.12 + los(i * 9) * 0.3);
    ctx.beginPath(); ctx.ellipse(x, y, R.w * 0.04, R.h * 0.008, 0, 0, Math.PI * 2); ctx.fill();
  }
  void czas;
  return R.y + R.h * 0.86;
}

// ---------------------------------------------------------------- sceny

const SCENY: Scena[] = [
  {
    tytul: 'Piekło',
    linie: [
      'Piekło to lej wbity w ziemię aż po jej środek. Dziewięć kręgów — każdy niżej, każdy węższy, każdy straszniejszy.',
      'Kto tu trafił, już nie wraca. Żadna droga nie prowadzi w górę.',
    ],
    rysuj(ctx, R, t, czas) {
      ctx.fillStyle = 'rgb(8,8,10)'; ctx.fillRect(R.x, R.y, R.w, R.h);
      const top = R.y + R.h * 0.14, dol = R.y + R.h * 0.95, cx = R.x + R.w / 2;
      // ziemia w przekroju
      ctx.fillStyle = 'rgb(58,44,32)'; ctx.fillRect(R.x, top, R.w, R.h);
      ctx.strokeStyle = 'rgba(20,14,10,0.4)'; ctx.lineWidth = 1;
      for (let i = 0; i < 60; i++) { const x = R.x + los(i * 3) * R.w, y = top + los(i * 7) * (R.h * 0.85); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y + 6); ctx.stroke(); }
      // lej: dziewięć stopni
      const pol0 = R.w * 0.42;
      ctx.beginPath(); ctx.moveTo(cx - pol0, top);
      const st: [number, number][] = [];
      for (let i = 0; i < 9; i++) {
        const y = top + ((i + 1) / 9) * (dol - top) * 0.92;
        const pol = pol0 * (1 - (i + 1) / 9.6);
        st.push([y, pol]);
        ctx.lineTo(cx - pol - R.w * 0.025, y - (dol - top) * 0.07); ctx.lineTo(cx - pol, y);
      }
      for (let i = 8; i >= 0; i--) { const [y, pol] = st[i]; ctx.lineTo(cx + pol, y); ctx.lineTo(cx + pol + R.w * 0.025, y - (dol - top) * 0.07); }
      ctx.lineTo(cx + pol0, top); ctx.closePath();
      const lg = ctx.createLinearGradient(0, top, 0, dol);
      lg.addColorStop(0, 'rgb(22,20,22)'); lg.addColorStop(1, `rgb(${90 + 20 * Math.sin(czas / 600)},26,14)`);
      ctx.fillStyle = lg; ctx.fill();
      ctx.strokeStyle = 'rgba(190,170,140,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      // numery kręgów i trzeci wyróżniony
      ctx.font = `${Math.max(12, R.h * 0.04)}px ${KROJ}`; ctx.textAlign = 'right';
      const rzym = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
      st.forEach(([y, pol], i) => {
        const trzeci = i === 2;
        ctx.fillStyle = trzeci ? 'rgba(230,226,190,1)' : 'rgba(170,150,120,0.7)';
        ctx.fillText(rzym[i], cx - pol - R.w * 0.04, y - 2);
        if (trzeci) {
          const a = 0.5 + 0.5 * Math.sin(czas / 300);
          ctx.strokeStyle = `rgba(200,220,210,${0.5 + 0.4 * a})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(cx - pol, y); ctx.lineTo(cx + pol, y); ctx.stroke();
          // deszcz nad trzecim
          ctx.save(); ctx.beginPath(); ctx.rect(cx - pol, y - (dol - top) * 0.1, pol * 2, (dol - top) * 0.1); ctx.clip();
          deszcz(ctx, { x: cx - pol, y: y - (dol - top) * 0.1, w: pol * 2, h: (dol - top) * 0.1 }, czas, 0.6);
          ctx.restore();
          ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(230,226,190,0.9)';
          ctx.fillText('— tu', cx + pol + R.w * 0.04, y - 2); ctx.textAlign = 'right';
        }
      });
      // powierzchnia świata nad lejem
      ctx.fillStyle = 'rgb(70,84,60)'; ctx.fillRect(R.x, top - 4, R.w, 5);
      void t;
    },
  },
  {
    tytul: 'Krąg trzeci — żarłocy',
    linie: [
      'Tu leżą żarłocy. Za życia służyli brzuchowi — teraz ich brzuchy należą do błota.',
      'Pada wieczny deszcz, zimny i ciężki, z gradem i brudnym śniegiem. Wyją pod nim jak psy.',
      'Nad nimi stoi Cerber: trzy gardła, czerwone oczy, tłusta czarna broda, brzuch szeroki. Szarpie ich i obdziera ze skóry.',
    ],
    rysuj(ctx, R, t, czas, sim) {
      const yg = taras(ctx, R, czas);
      const h = R.h * 0.2;
      const czyn: Czynnosc[] = ['spi', 'modli', 'je', 'spi', 'kopie', 'spi', 'modli', 'idzie', 'spi', 'je'];
      for (let i = 0; i < 10; i++) {
        const x = R.x + R.w * (0.05 + i * 0.065), y = yg - R.h * (0.02 + (i % 3) * 0.03);
        postac(ctx, sim, atrapa('t' + i, Race.HUMAN), x, y, h * (0.85 + (i % 3) * 0.07), czas + i * 333, czyn[i], i % 2 ? 1 : -1);
      }
      // Cerber szarpie jednego
      ctx.save();
      ctx.translate(R.x + R.w * 0.78, yg);
      ctx.save(); ctx.translate(-R.h * 0.04, 0); ctx.rotate(Math.sin(czas / 90) * 0.25); zarlok(ctx, h, 1, czas / 300, 3, -1); ctx.restore();
      ctx.scale(-1, 1);
      const p = pozaCerbera(); p.czas = czas;
      p.glowy.forEach((g, i) => { g.pochyl = 0.6 + 0.15 * Math.sin(czas / 110 + i * 2); g.paszcza = 0.4 + 0.5 * Math.abs(Math.sin(czas / 140 + i)); g.wysun = 0.3; });
      if ((czas / 1000) % 3 < 1.1) { p.glowy[0].pochyl = -0.8; p.glowy[0].paszcza = 1; p.glowy[0].wysun = 0; }
      rysujCerbera(ctx, R.h * 0.62, p);
      ctx.restore();
      deszcz(ctx, R, czas, 1.2);
      void t;
    },
  },
  {
    tytul: 'Żywy i jego przewodnik',
    linie: [
      'Pewnego dnia przeszło tędy dwóch. Jeden z nich rzucał cień — był żywy.',
      'Gdy Cerber rozwarł na nich paszcze, przewodnik schylił się, nabrał pełne garście ziemi i rzucił mu w gardła.',
      'Pies rzucił się na nią jak głodny na strawę, a oni przeszli. I zeszli niżej — bo z piekła wychodzi się tylko przez jego dno.',
    ],
    rysuj(ctx, R, t, czas, sim) {
      const yg = taras(ctx, R, czas);
      const h = R.h * 0.3;
      for (let i = 0; i < 6; i++) postac(ctx, sim, atrapa('d' + i, Race.HUMAN), R.x + R.w * (0.05 + i * 0.16), yg + R.h * 0.04, h * 0.6, czas + i * 500, 'spi', i % 2 ? 1 : -1);
      const rzut = gladko((t - 4.5) / 1.2), zre = t > 6;
      const odejscie = Math.max(0, t - 8);
      const xw = R.x + R.w * 0.3 + odejscie * R.w * 0.06, xd = R.x + R.w * 0.22 + odejscie * R.w * 0.06;
      const zejscie = Math.max(0, t - 11) * R.h * 0.04;
      // Cerber
      ctx.save();
      ctx.translate(R.x + R.w * 0.72, yg);
      ctx.scale(-1, 1);
      const p = pozaCerbera(); p.czas = czas;
      p.glowy.forEach((g, i) => {
        if (zre) { g.pochyl = 0.6 + 0.08 * Math.sin(czas / 80 + i); g.paszcza = 0.2 + 0.35 * Math.abs(Math.sin(czas / 70 + i)); g.wysun = 0.15; }
        else { g.pochyl = -0.15; g.paszcza = 0.9; g.wysun = 0.25 + 0.1 * Math.sin(czas / 200 + i); }
      });
      rysujCerbera(ctx, R.h * 0.6, p);
      ctx.restore();
      // przewodnik i żywy
      ctx.save(); ctx.translate(xd, yg + zejscie); wedrowiec(ctx, h, true, odejscie * 6, 0); ctx.restore();
      ctx.save(); ctx.translate(xw, yg + zejscie); wedrowiec(ctx, h * 1.05, false, odejscie * 6, t > 3.5 && t < 6 ? gladko((t - 3.5) / 1) : 0); ctx.restore();
      // grudy ziemi w locie do paszcz
      if (rzut > 0 && rzut < 1) {
        for (let i = 0; i < 8; i++) {
          const f = Math.max(0, Math.min(1, rzut * 1.2 - i * 0.03));
          const x0 = xw + h * 0.25, y0 = yg - h * 0.85, x1 = R.x + R.w * 0.6, y1 = yg - R.h * 0.42 + (i % 3) * R.h * 0.06;
          const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * R.h * 0.15;
          ctx.fillStyle = 'rgb(70,54,38)'; ctx.beginPath(); ctx.arc(x, y, R.h * 0.012, 0, Math.PI * 2); ctx.fill();
        }
      }
      deszcz(ctx, R, czas, 1);
    },
  },
  {
    tytul: 'Sześciu wstało z błota',
    linie: [
      'Sześciu żarłoków to widziało. Wstali z błota — pierwszy raz od wieków.',
      'Trzech grabarzy: za życia kopali groby za miskę strawy. Kopią i teraz.',
      'Dwóch mnichów: modlili się z pełnymi ustami — ale wciąż pamiętają słowa modlitw.',
      'I rycerz, który przejadł cały majątek, ale nie zapomniał, jak trzymać miecz.',
    ],
    rysuj(ctx, R, t, czas, sim) {
      const yg = taras(ctx, R, czas);
      const h = R.h * 0.34;
      for (let i = 0; i < 7; i++) postac(ctx, sim, atrapa('w' + i, Race.HUMAN), R.x + R.w * (0.02 + i * 0.16), yg + R.h * 0.07, h * 0.55, czas + i * 400, i % 3 ? 'spi' : 'modli', i % 2 ? 1 : -1);
      const role: ('robotnik' | 'pobozny' | 'rycerz')[] = ['robotnik', 'robotnik', 'robotnik', 'pobozny', 'pobozny', 'rycerz'];
      // kto wstaje kiedy: grabarze przy drugiej linijce, mnisi przy trzeciej, rycerz przy czwartej
      const kiedy = [NA_POCZATEK + NA_LINIE * 1, NA_POCZATEK + NA_LINIE * 1 + 0.4, NA_POCZATEK + NA_LINIE * 1 + 0.8, NA_POCZATEK + NA_LINIE * 2, NA_POCZATEK + NA_LINIE * 2 + 0.4, NA_POCZATEK + NA_LINIE * 3];
      role.forEach((rola, i) => {
        const x = R.x + R.w * (0.18 + i * 0.12), y = yg - R.h * 0.01;
        const wstal = t > kiedy[i];
        const hh = h * (rola === 'rycerz' ? 1.3 : 1);
        if (wstal) {
          const k = gladko((t - kiedy[i]) / 0.6);
          ctx.save(); ctx.globalAlpha = 1;
          postac(ctx, sim, atrapa('s' + i, Race.GOBLIN, rola), x, y + (1 - k) * hh * 0.1, hh, czas + i * 777, 'stoi', i < 3 ? 1 : -1);
          ctx.restore();
          if (k < 1) { ctx.fillStyle = `rgba(60,56,40,${0.6 * (1 - k)})`; ctx.beginPath(); ctx.ellipse(x, y, hh * 0.4 * (1 + k), hh * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
        } else {
          postac(ctx, sim, atrapa('s' + i, Race.GOBLIN, rola), x, y, hh, czas + i * 777, 'spi', i < 3 ? 1 : -1);
        }
      });
      deszcz(ctx, R, czas, 1);
    },
  },
  {
    tytul: 'Ty jesteś trzewiami',
    linie: [
      'Ty jesteś trzewiami tego kręgu — ziemią, która trawi żarłoków. Czujesz każdego, kto w tobie leży.',
      'Szóstka zejdzie w ciebie, by dokopać się do zapieczętowanego zejścia do kręgu czwartego.',
      'Prowadź ich i karm resztkami, które inni potępieni spuszczają im w koszu. Ale nie przekarmiaj — obżarty padnie w błoto jak reszta.',
      'Gdy mnisi skruszą modlitwą pieczęć, Cerber zeskoczy za nimi. Wtedy rzućcie mu jedzenie w paszcze, jak tamten przewodnik — i walczcie.',
    ],
    rysuj(ctx, R, t, czas) {
      const yp = R.y + R.h * 0.18;
      ctx.fillStyle = 'rgb(16,16,18)'; ctx.fillRect(R.x, R.y, R.w, yp - R.y);
      // trzewia: ziemia w fałdach jak jelita
      const g = ctx.createLinearGradient(0, yp, 0, R.y + R.h);
      g.addColorStop(0, 'rgb(70,52,40)'); g.addColorStop(1, 'rgb(40,22,18)');
      ctx.fillStyle = g; ctx.fillRect(R.x, yp, R.w, R.h - (yp - R.y));
      ctx.strokeStyle = 'rgba(120,60,50,0.45)'; ctx.lineWidth = Math.max(2, R.h * 0.012);
      for (let i = 0; i < 9; i++) {
        const y = yp + R.h * (0.1 + i * 0.085);
        ctx.beginPath();
        for (let x = 0; x <= R.w; x += 8) {
          const yy = y + Math.sin(x / (R.w * 0.06) + i * 1.7 + czas / 1400) * R.h * 0.025;
          if (x === 0) ctx.moveTo(R.x + x, yy); else ctx.lineTo(R.x + x, yy);
        }
        ctx.stroke();
      }
      // taras z tłumem i Cerberem
      ctx.fillStyle = 'rgb(46,44,36)'; ctx.fillRect(R.x, yp - 3, R.w, 6);
      ctx.fillStyle = 'rgba(20,18,16,0.95)';
      for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.ellipse(R.x + los(i * 7) * R.w, yp - 2, R.h * 0.014, R.h * 0.005, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.save(); ctx.translate(R.x + R.w * (0.15 + 0.1 * Math.sin(czas / 3000)), yp); const pc = pozaCerbera(); pc.czas = czas; pc.krok = 1; pc.faza = czas / 200; rysujCerbera(ctx, R.h * 0.13, pc); ctx.restore();
      // szyb kosza: lina i kosz zjeżdżający do sali
      const sx = R.x + R.w * 0.55, salaY = R.y + R.h * 0.55;
      ctx.strokeStyle = 'rgb(150,120,80)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, yp - R.h * 0.05); ctx.lineTo(sx, salaY); ctx.stroke();
      const ky = yp + ((czas / 4000) % 1) * (salaY - yp - R.h * 0.03);
      ctx.fillStyle = 'rgb(130,96,56)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(sx - R.h * 0.025, ky, R.h * 0.05, R.h * 0.035); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(30,26,20,0.95)'; ctx.beginPath(); ctx.ellipse(sx - R.h * 0.05 + i * R.h * 0.04, yp - R.h * 0.025, R.h * 0.01, R.h * 0.025, 0, 0, Math.PI * 2); ctx.fill(); }
      // sala w trzewiach — ciepłe światło, szóstka
      ctx.fillStyle = 'rgb(150,130,90)';
      ctx.beginPath(); ctx.ellipse(R.x + R.w * 0.5, salaY + R.h * 0.04, R.w * 0.11, R.h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = TUSZ;
      for (let i = 0; i < 6; i++) ctx.fillRect(R.x + R.w * (0.44 + i * 0.022), salaY + R.h * 0.04, R.h * 0.012, R.h * 0.05);
      // droga w dół do pieczęci
      ctx.strokeStyle = 'rgba(210,180,120,0.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(R.x + R.w * 0.42, salaY + R.h * 0.1); ctx.lineTo(R.x + R.w * 0.42, R.y + R.h * 0.8); ctx.lineTo(R.x + R.w * 0.5, R.y + R.h * 0.85); ctx.stroke();
      ctx.setLineDash([]);
      // pieczęć zejścia
      const px = R.x + R.w * 0.5, py = R.y + R.h * 0.88, pr = R.h * 0.07;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, pr * 2.4);
      pg.addColorStop(0, `rgba(220,60,30,${0.35 + 0.15 * Math.sin(czas / 400)})`); pg.addColorStop(1, 'rgba(220,60,30,0)');
      ctx.fillStyle = pg; ctx.fillRect(px - pr * 2.4, py - pr * 2.4, pr * 4.8, pr * 4.8);
      ctx.fillStyle = 'rgb(90,88,80)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgb(60,56,52)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px - pr * 1.3, py - pr); ctx.lineTo(px + pr * 1.3, py + pr); ctx.moveTo(px + pr * 1.3, py - pr); ctx.lineTo(px - pr * 1.3, py + pr); ctx.stroke();
      void t;
    },
  },
];

// ---------------------------------------------------------------- wejście (scena w silniku gry)

interface Aktor { c: Creature; x0: number; y0: number; f0: number; start: number; kolejka: number; wstaje: number; doLiny: number; zejscie: number; naDole: number; koniec: number }

const V_IDZIE = 2.2, V_LINA = 4.2, V_SALA = 2.4;

export class WstepKregu {
  faza: 'brak' | 'plansze' | 'wejscie' = 'brak';
  private scena = 0;
  private scenaOd = 0;
  private wejscieOd = 0;
  private aktorzy: Aktor[] = [];
  private linaX = 0;
  private tikStart = 0;
  private koniecWejscia = 0;

  trwa(): boolean { return this.faza !== 'brak'; }
  plansze(): boolean { return this.faza === 'plansze'; }

  /** Nowa partia: najpierw plansze, potem wejście. */
  zacznij(): void {
    this.faza = 'plansze'; this.scena = 0; this.scenaOd = -1;
  }

  /** Kliknięcie / spacja: dopisz tekst albo następna scena. */
  dalej(teraz: number): void {
    if (this.faza !== 'plansze') return;
    const t = (teraz - this.scenaOd) / 1000;
    const pelna = NA_POCZATEK + SCENY[this.scena].linie.length * NA_LINIE;
    if (t < pelna - NA_LINIE * 0.5) this.scenaOd = teraz - pelna * 1000;
    else this.nastepna(teraz);
  }

  private nastepna(teraz: number): void {
    this.scena++;
    this.scenaOd = teraz;
    if (this.scena >= SCENY.length) { this.faza = 'wejscie'; this.wejscieOd = -1; }
  }

  /** Plansza na cały ekran. */
  rysujPlansze(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, teraz: number): void {
    if (this.scenaOd < 0) this.scenaOd = teraz;
    const s = SCENY[this.scena];
    const t = (teraz - this.scenaOd) / 1000;
    const dl = NA_POCZATEK + s.linie.length * NA_LINIE + 2.2;
    if (t > dl) { this.nastepna(teraz); if (this.faza !== 'plansze') return; return this.rysujPlansze(ctx, sim, w, h, teraz); }
    const wej = gladko(t / 0.7) * (1 - gladko((t - dl + 0.6) / 0.6));
    ctx.save();
    ctx.fillStyle = 'rgb(5,5,6)'; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = wej;
    const R: Prost = { x: w * 0.12, y: h * 0.05, w: w * 0.76, h: h * (s.linie.length >= 4 ? 0.47 : 0.55) };
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    s.rysuj(ctx, R, t, teraz, sim);
    ctx.restore();
    // rama ryciny
    ctx.strokeStyle = 'rgba(190,160,110,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(R.x, R.y, R.w, R.h);
    ctx.strokeStyle = 'rgba(190,160,110,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(R.x - 6, R.y - 6, R.w + 12, R.h + 12);
    // tytuł i tekst
    const r = Math.max(15, Math.min(26, w / 58));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `italic ${r * 1.5}px ${KROJ}`; ctx.fillStyle = 'rgba(222,214,186,1)';
    ctx.fillText(s.tytul, w / 2, R.y + R.h + r * 0.9);
    ctx.font = `${r}px ${KROJ}`;
    let y = R.y + R.h + r * 3.1;
    s.linie.forEach((linia, i) => {
      const a = gladko((t - NA_POCZATEK - i * NA_LINIE + 0.4) / 0.8);
      if (a <= 0) return;
      ctx.globalAlpha = wej * a;
      ctx.fillStyle = 'rgba(206,202,186,1)';
      for (const kaw of zawin(ctx, linia, w * 0.78)) { ctx.fillText(kaw, w / 2, y); y += r * 1.35; }
      y += r * 0.25;
    });
    ctx.globalAlpha = wej * 0.6;
    ctx.font = `italic ${r * 0.7}px ${KROJ}`; ctx.fillStyle = 'rgba(180,170,150,1)';
    ctx.fillText(`${this.scena + 1} / ${SCENY.length} · kliknij albo spacja — dalej`, w / 2, h - r * 1.6);
    ctx.restore();
  }

  /**
   * Wejście: ustawia szóstkę i kamerę według czasu sceny (symulacja stoi). Zwraca true, gdy scena się skończyła —
   * wtedy postacie są dokładnie tam, gdzie zaczyna się gra.
   */
  krok(sim: Sim, cam: Camera, teraz: number): boolean {
    if (this.faza !== 'wejscie') return false;
    if (this.wejscieOd < 0) this.przygotuj(sim, teraz);
    const t = (teraz - this.wejscieOd) / 1000;
    WIDOK_KREGU.tik = this.tikStart + Math.floor(t * 120);
    let ognisko: { x: number; y: number } | null = null, naLinie: Aktor | null = null;
    let wszyscy = true;
    for (const a of this.aktorzy) {
      const c = a.c;
      c.naLinie = undefined; c.ogluszonyDo = undefined;
      if (t < a.wstaje) {
        c.ogluszonyDo = sim.tick + 1;   // leży w błocie
        c.x = a.start; c.y = gruntKregu(sim, a.start) - 1;
      } else if (t < a.doLiny) {
        const x = Math.min(a.kolejka, a.start + (t - a.wstaje - 0.5 > 0 ? (t - a.wstaje - 0.5) * V_IDZIE : 0));
        c.x = x; c.y = gruntKregu(sim, x) - 1; c.face = 1;
      } else if (t < a.zejscie) {
        c.x = a.kolejka; c.y = gruntKregu(sim, a.kolejka) - 1; c.face = 1;
      } else if (t < a.naDole) {
        const yg = gruntKregu(sim, this.linaX) - 1;
        c.x = this.linaX; c.y = yg + (t - a.zejscie) * V_LINA; c.naLinie = -1;
        naLinie = a;
      } else if (t < a.koniec) {
        const d = a.x0 - this.linaX, s = Math.min(1, (t - a.naDole) * V_SALA / Math.max(0.01, Math.abs(d)));
        c.x = this.linaX + d * s; c.y = a.y0; c.face = d >= 0 ? 1 : -1;
      } else {
        c.x = a.x0; c.y = a.y0; c.face = a.f0;
      }
      if (t < a.koniec) wszyscy = false;
    }
    // kamera: na tarasie za grupą, potem za tym, kto schodzi, na końcu sala
    const naTarasie = this.aktorzy.filter((a) => t < a.zejscie);
    if (naLinie) ognisko = { x: naLinie.c.x, y: naLinie.c.y };
    else if (naTarasie.length) ognisko = { x: naTarasie.reduce((s, a) => s + a.c.x, 0) / naTarasie.length, y: SURFACE_Y - 4 };
    else ognisko = { x: this.aktorzy.reduce((s, a) => s + a.c.x, 0) / Math.max(1, this.aktorzy.length), y: this.aktorzy[0]?.y0 ?? cam.y };
    const zoom = naTarasie.length && !naLinie ? 12 : 14;
    const k = t < 0.05 ? 1 : 0.05;
    cam.x += (ognisko.x - cam.x) * k; cam.y += (ognisko.y - cam.y) * k; cam.zoom += (zoom - cam.zoom) * k;
    cam.clamp(sim.world.w, sim.world.h);
    if (wszyscy) {
      if (!this.koniecWejscia) this.koniecWejscia = teraz;
      if (teraz - this.koniecWejscia > 2600) {
        this.faza = 'brak'; WIDOK_KREGU.tik = null;
        for (const a of this.aktorzy) { a.c.x = a.x0; a.c.y = a.y0; a.c.face = a.f0; a.c.naLinie = undefined; a.c.ogluszonyDo = undefined; }
        return true;
      }
    }
    return false;
  }

  private przygotuj(sim: Sim, teraz: number): void {
    this.wejscieOd = teraz; this.koniecWejscia = 0;
    this.tikStart = sim.tick;
    const w = sim.world;
    const wd = wiadra(sim).find((q) => q.szyb);
    this.linaX = wd ? wd.x + 0.5 : w.szybWiadraX + 0.5;
    const lud = sim.creatures.filter((c) => !c.dead && c.race === Race.GOBLIN).sort((a, b) => a.id - b.id);
    // kolejność: grabarze, mnisi, rycerz na końcu (osłania)
    const waga = (c: Creature): number => (c.rola === 'robotnik' ? 0 : c.rola === 'pobozny' ? 1 : 2);
    lud.sort((a, b) => waga(a) - waga(b) || a.id - b.id);
    let zejscieOst = 0;
    this.aktorzy = lud.map((c, i) => {
      const start = Math.max(6, this.linaX - 20 - i * 1.4);
      const kolejka = this.linaX - 1.4 - i * 0.9;
      const wstaje = 1.2 + i * 0.45;
      const doLiny = wstaje + 0.5 + (kolejka - start) / V_IDZIE;
      const zejscie = Math.max(doLiny + 0.3, zejscieOst + 1.5);
      zejscieOst = zejscie;
      const glebokosc = c.y - (gruntKregu(sim, this.linaX) - 1);
      const naDole = zejscie + Math.max(0.5, glebokosc / V_LINA);
      const koniec = naDole + Math.abs(c.x - this.linaX) / V_SALA + 0.1;
      return { c, x0: c.x, y0: c.y, f0: c.face, start, kolejka, wstaje, doLiny, zejscie, naDole, koniec };
    });
  }

  /** Napisy sceny wejścia (pasy kinowe u góry i u dołu płyty). */
  rysujNapisy(ctx: CanvasRenderingContext2D, plate: Prost, teraz: number): void {
    if (this.faza !== 'wejscie' || this.wejscieOd < 0) return;
    const t = (teraz - this.wejscieOd) / 1000;
    const pas = plate.h * 0.09;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(plate.x, plate.y, plate.w, pas);
    ctx.fillRect(plate.x, plate.y + plate.h - pas, plate.w, pas);
    const ost = this.aktorzy.reduce((m, a) => Math.max(m, a.koniec), 0);
    const zejscie0 = this.aktorzy[0]?.zejscie ?? 99;
    const napis = this.koniecWejscia ? 'Teraz ty.'
      : t < 3.5 ? 'Szóstka wstaje z błota trzeciego kręgu.'
        : t < zejscie0 - 0.5 ? 'Idą między tymi, którzy nigdy nie wstaną… do szybu, którym inni spuszczają im kosz resztek.'
          : t < ost - 1 ? 'Jeden po drugim schodzą po linie w trzewia kręgu.'
            : 'Na dole, w sali pod kręgiem, zaczyna się ich droga w dół.';
    const r = Math.max(14, Math.min(24, plate.w / 60));
    ctx.font = `italic ${this.koniecWejscia ? r * 1.4 : r}px ${KROJ}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(222,214,186,0.95)';
    ctx.fillText(napis, plate.x + plate.w / 2, plate.y + plate.h - pas / 2);
    ctx.font = `${r * 0.65}px ${KROJ}`; ctx.fillStyle = 'rgba(170,160,140,0.8)';
    ctx.fillText('scena — sterowanie przejmiesz, gdy szóstka dojdzie na miejsce', plate.x + plate.w / 2, plate.y + pas / 2);
    ctx.restore();
  }
}

/** Łamie tekst na linijki nie szersze niż `max` pikseli. */
function zawin(ctx: CanvasRenderingContext2D, tekst: string, max: number): string[] {
  const slowa = tekst.split(' ');
  const out: string[] = [];
  let l = '';
  for (const s of slowa) {
    const p = l ? l + ' ' + s : s;
    if (ctx.measureText(p).width > max && l) { out.push(l); l = s; } else l = p;
  }
  if (l) out.push(l);
  return out;
}

