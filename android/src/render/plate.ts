import { Sim } from '../sim/sim';
import { RACES, RACE_COUNT, Race, odmien } from '../sim/races';
import { SERIF } from './overlay';
import { ustawienia } from '../core/settings-store';
import { lewaKrawedzPrzyciskow } from './przyciski';
import { EKRAN, TELEFON } from '../nastawy/ekran';

/**
 * `waski` — telefon (albo tablet) trzymany pionowo; `niski` — telefon trzymany poziomo.
 * Oba to układy telefonu z nastaw TELEFON; gdy oba są fałszywe, to układ szerokiego ekranu.
 */
export interface Plate { x: number; y: number; w: number; h: number; left: number; bottom: number; right: number; top: number; waski: boolean; niski: boolean; }

/**
 * Rysunek ma ramę jak rycina w atlasie: świat siedzi na płycie, a wszystko, co nie
 * jest górą — ryty, kronika, organy — leży na marginesie. Nic nie przykrywa skały.
 */
export function computePlate(vw: number, vh: number): Plate {
  // telefon w pionie (i tablet w pionie): inny podział marginesów — na szerokim układzie
  // pod płytą brakowało miejsca na spis, Otchłań i osiem przycisków naraz
  // ekran szerszy niż wyższy nigdy nie dostaje układu pionowego — mały telefon trzymany
  // poziomo (640×360) dostawał kolumnę na ryty i rząd przycisków pod płytą wysoką na 130 px
  const pion = vh > vw;
  const waski = pion
    ? vw < EKRAN.pionowyTabletPonizej || vh > vw * EKRAN.pionowyOd
    : vw < EKRAN.waskiPonizej && vh >= TELEFON.niskiPonizej;
  const niski = !waski && !pion && vh < TELEFON.niskiPonizej;
  const T = waski ? TELEFON.pion : niski ? TELEFON.poziom : null;
  const left = T ? T.lewo : Math.max(58, Math.min(104, vw * 0.075));
  const right = T ? T.prawo : Math.max(58, Math.min(104, vw * 0.075));
  const top = T ? T.gora : Math.max(34, Math.min(72, vh * 0.07));
  const bottom = T ? T.dol : Math.max(132, Math.min(206, vh * 0.26));
  return { x: left, y: top, w: Math.max(80, vw - left - right), h: Math.max(80, vh - top - bottom), left, right, top, bottom, waski, niski };
}

const INK = 'rgba(206,192,166,';

/** Prostokąt na ekranie — samouczek wskazuje nim organy w ramie. */
export interface Obszar { x: number; y: number; w: number; h: number; }

/**
 * Dolny margines telefonu — wszystko liczone od górnej krawędzi marginesu (dół płyty):
 * pionowo rząd przycisków, spis ras, a na dole krew i Otchłań obok siebie;
 * poziomo jeden cienki pasek: spis, Otchłań, krew.
 */
const TEL = {
  pion: { spisY: 82, spisH: 12, rzadY: 122, otchlanBok: 34 },
  poziom: { spisY: 17, spisH: 9, otchlanBok: 24, spisCzesc: 0.46 },
};

/** Rysa Krwi pod płytą. */
export function obszarKrwi(p: Plate, vh: number): Obszar {
  const mt = vh - p.bottom;
  if (p.waski) {
    // obok Otchłani, w dolnym rzędzie marginesu
    const o = obszarOtchlani(p, vh);
    const y = mt + TEL.pion.rzadY + 10;
    return { x: p.x + 28, y, w: o.x - p.x - 28 - 16, h: vh - 8 - y };
  }
  if (p.niski) {
    const o = obszarOtchlani(p, vh);
    const x = o.x + o.w + 14;
    // napis „KREW” nad rysą nie może wejść na ramę płyty
    return { x, y: mt + 22, w: p.x + p.w - x, h: p.bottom - 28 };
  }
  const cx0 = p.x + p.w * 0.6;
  const base = vh - p.bottom * 0.1;
  const maxH = p.bottom * 0.34;
  return { x: cx0, y: base - maxH, w: p.x + p.w - cx0, h: maxH };
}

/** Kwadrat Otchłani razem z podpisem. */
export function obszarOtchlani(p: Plate, vh: number): Obszar {
  const mt = vh - p.bottom;
  if (p.waski) {
    const bok = TEL.pion.otchlanBok;
    const w = bok + 6 + 13 * 7.8;
    return { x: p.x + p.w - w, y: mt + TEL.pion.rzadY + 4, w, h: bok };
  }
  if (p.niski) {
    const bok = TEL.poziom.otchlanBok;
    const w = bok + 6 + 12 * 5.2;
    return { x: p.x + p.w * TEL.poziom.spisCzesc + 18, y: mt + 12, w, h: bok };
  }
  const bok = Math.max(26, Math.min(46, p.bottom * 0.28));
  // szerokość z podpisem („stać cię na Skazę”) — podpis nie może wyjść poza płytę
  const w = bok + 6 + Math.max(13, bok * 0.3) * 7.8;
  // szeroko: w połowie, ale nigdy na przyciskach
  const x = Math.min(p.x + p.w * 0.5, lewaKrawedzPrzyciskow(p) - w - 14);
  const y = vh - p.bottom + p.bottom * 0.14;
  return { x, y, w, h: bok };
}

/** Szerokość wstęgi spisu ras — kończy się przed Otchłanią. */
function szerokoscSpisu(p: Plate, vh: number): number {
  if (p.niski) return p.w * TEL.poziom.spisCzesc;
  return p.waski ? p.w - 28 : Math.max(p.w * 0.25, Math.min(p.w * 0.46, obszarOtchlani(p, vh).x - p.x - 16));
}

/** Pasmo dymu Wiary pod górną krawędzią płyty. */
export function obszarWiary(p: Plate): Obszar {
  return { x: p.x, y: p.y, w: p.w, h: Math.max(30, p.h * 0.13) };
}

/** Wstęga warstw — spis ras. */
export function obszarSpisu(p: Plate, vh: number): Obszar {
  const { y, h } = pasmoSpisu(p, vh);
  return { x: p.x, y: y - h * 0.4, w: szerokoscSpisu(p, vh), h: h * 2.4 };
}

/** Górna krawędź i grubość wstęgi spisu. */
function pasmoSpisu(p: Plate, vh: number): { y: number; h: number } {
  const mt = vh - p.bottom;
  if (p.waski) return { y: mt + TEL.pion.spisY, h: TEL.pion.spisH };
  if (p.niski) return { y: mt + TEL.poziom.spisY, h: TEL.poziom.spisH };
  return { y: mt + p.bottom * 0.17, h: Math.max(12, p.bottom * 0.11) };
}

export function drawFrame(ctx: CanvasRenderingContext2D, p: Plate, time: number, oddech = 0.5): void {
  ctx.save();
  ctx.lineWidth = 1;
  // rama oddycha razem z rdzeniem — ledwie, ale całość przestaje być martwym prostokątem
  ctx.strokeStyle = `${INK}${0.4 + 0.1 * oddech})`;
  ctx.strokeRect(p.x - 6.5, p.y - 6.5, p.w + 13, p.h + 13);
  ctx.strokeStyle = `${INK}0.18)`;
  ctx.strokeRect(p.x - 10.5, p.y - 10.5, p.w + 21, p.h + 21);
  // narożniki: krótkie nacięcia rylca
  const n = 9 + Math.sin(time * 0.0004) * 1.5;
  ctx.strokeStyle = `${INK}0.5)`;
  for (const [cx, cy, sx, sy] of [[p.x - 6, p.y - 6, 1, 1], [p.x + p.w + 6, p.y - 6, -1, 1],
                                  [p.x - 6, p.y + p.h + 6, 1, -1], [p.x + p.w + 6, p.y + p.h + 6, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * n, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * n);
    ctx.stroke();
    // zwój w rogu zewnętrznej ramy: trzewia zwinięte w ślimak
    const ox = cx - sx * 4.5, oy = cy - sy * 4.5;
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      const k = t * Math.PI * 3.2 + (sx > 0 ? 0 : Math.PI) * (sy > 0 ? 1 : -1);
      const r = 0.6 + t * 3.6;
      const x = ox + Math.cos(k) * r * sx, y = oy + Math.sin(k) * r * sy;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `${INK}0.34)`;
    ctx.stroke();
    ctx.strokeStyle = `${INK}0.5)`;
  }
  // pionowe oko w lewej ramie: przerwa w zewnętrznej linii, powieka i źrenica, która
  // oddycha razem z rdzeniem (pod płytą wchodziło na znaki spisu ras)
  if (!p.waski) {
    const ex = p.x - 10.5, ey = p.y + p.h / 2;
    ctx.fillStyle = '#0b0807';
    ctx.fillRect(ex - 3, ey - 13, 6, 26);
    ctx.strokeStyle = `${INK}0.42)`;
    ctx.beginPath();
    ctx.moveTo(ex, ey - 10); ctx.quadraticCurveTo(ex + 6, ey, ex, ey + 10); ctx.quadraticCurveTo(ex - 6, ey, ex, ey - 10);
    ctx.stroke();
    ctx.fillStyle = `rgba(200,70,48,${0.35 + 0.45 * oddech})`;
    ctx.beginPath(); ctx.ellipse(ex, ey, 0.9 + 0.3 * oddech, 1.8 + 0.6 * oddech, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

const SIGIL: Record<number, (ctx: CanvasRenderingContext2D, s: number) => void> = {
  [Race.GOBLIN]: (c, s) => { c.moveTo(-s, s * 0.6); c.lineTo(0, -s); c.lineTo(s, s * 0.6); },
  [Race.DWARF]: (c, s) => { c.rect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6); },
  [Race.TROLL]: (c, s) => { c.moveTo(-s, s * 0.8); c.lineTo(-s * 0.5, -s); c.lineTo(s * 0.5, -s); c.lineTo(s, s * 0.8); },
  [Race.SPINNER]: (c, s) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.moveTo(0, 0); c.lineTo(Math.cos(a) * s, Math.sin(a) * s); } },
  [Race.HUMAN]: (c, s) => { c.moveTo(0, -s); c.lineTo(0, s); c.moveTo(-s * 0.7, -s * 0.2); c.lineTo(s * 0.7, -s * 0.2); },
  [Race.MYCELIUM]: (c, s) => { c.moveTo(-s, s * 0.6); c.quadraticCurveTo(0, -s * 1.2, s, s * 0.6); },
};

/**
 * Spis ras jako rdzeń wiertniczy: poziomy wycinek skały z warstwami. Każda rasa
 * ma własny kąt kreskowania, granice są pęknięciami, a nie krawędziami widgetu —
 * pasek postępu w tym interfejsie byłby ciałem obcym.
 */
export function drawCensus(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, vh: number): void {
  // grzybnia nie liczy się do dominacji, więc nie ma prawa zajmować połowy wstęgi;
  // idzie osobnym, cieńszym pasmem na końcu
  let total = 0;
  for (let r = 0; r < RACE_COUNT; r++) if (r !== Race.MYCELIUM) total += sim.popByRace[r];
  // górne pasmo marginesu należy do spisu; kronika zaczyna się dopiero pod nim
  const { y, h } = pasmoSpisu(p, vh);
  const telefon = p.waski || p.niski;
  const x0 = p.x + (p.waski ? 28 : 0), x1 = x0 + szerokoscSpisu(p, vh);
  const jag = (t: number, seed: number) => Math.sin(t * 37.1 + seed) * (h * 0.09) + Math.sin(t * 11.3 + seed * 2) * (h * 0.06);

  ctx.save();
  // na telefonie pionowo lewy margines to kolumna rytów — etykieta wchodzi w pas nad krwią
  if (!p.niski) etykietaPionowa(ctx, 'ludy', x0 - 16, y + h / 2);
  // cienkie linie stropu i spągu — wstęga ma ramę jak wszystko inne na marginesie
  ctx.strokeStyle = `${INK}0.18)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y - h * 0.25 + 0.5); ctx.lineTo(x1, y - h * 0.25 + 0.5);
  ctx.moveTo(x0, y + h * 1.25 + 0.5); ctx.lineTo(x1, y + h * 1.25 + 0.5);
  ctx.moveTo(x0 + 0.5, y - h * 0.25 - 3); ctx.lineTo(x0 + 0.5, y + h * 1.25 + 3);
  ctx.moveTo(x1 - 0.5, y - h * 0.25 - 3); ctx.lineTo(x1 - 0.5, y + h * 1.25 + 3);
  ctx.stroke();
  if (total > 0) {
    let cx = x0;
    // grzybnia dostaje swój kawałek z tej samej szerokości — wcześniej doklejała się
    // za pełną wstęgą i wchodziła na Otchłań obok
    const udzialGrzybni = Math.min(0.22, sim.popByRace[Race.MYCELIUM] / Math.max(1, total + sim.popByRace[Race.MYCELIUM])) * 0.8;
    const szerRas = (x1 - x0) * (1 - udzialGrzybni);
    for (let r = 0; r < RACE_COUNT; r++) {
      const grzyb = r === Race.MYCELIUM;
      const share = grzyb ? udzialGrzybni / 0.8 : sim.popByRace[r] / total;
      if (share <= 0.001) continue;
      const bw = grzyb ? (x1 - x0) * udzialGrzybni : szerRas * share;
      const raw = RACES[r].color;
      const col = [(206 + raw[0]) / 2 | 0, (192 + raw[1]) / 2 | 0, (166 + raw[2]) / 2 | 0];
      const ang = 0.35 + r * 0.5;

      ctx.save();
      ctx.beginPath();                               // warstwa z poszarpanym stropem i spągiem
      ctx.moveTo(cx, y + jag(cx * 0.05, r));
      for (let x = cx; x <= cx + bw; x += 4) ctx.lineTo(x, y + jag(x * 0.05, r));
      ctx.lineTo(cx + bw, y + h + jag((cx + bw) * 0.05, r + 3));
      for (let x = cx + bw; x >= cx; x -= 4) ctx.lineTo(x, y + h + jag(x * 0.05, r + 3));
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.75)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = -h * 2; k < bw + h * 2; k += 4) {
        ctx.moveTo(cx + k, y + h * 1.6);
        ctx.lineTo(cx + k + Math.cos(ang) * h * 3, y - h * 0.6);
      }
      ctx.stroke();
      ctx.restore();

      if (r > 0) {                                   // pęknięcie między warstwami
        ctx.strokeStyle = `${INK}0.45)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + jag(cx, r) * 0.4, y - 1);
        ctx.lineTo(cx - jag(cx, r + 1) * 0.5, y + h * 0.5);
        ctx.lineTo(cx + jag(cx, r + 2) * 0.4, y + h + 1);
        ctx.stroke();
      }

      if (bw > 14 && !p.niski) {                    // poziomo nad wstęgą jest już rama płyty
        ctx.save();
        ctx.translate(cx + bw / 2, y - h * 0.62);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.95)`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        SIGIL[r](ctx, Math.min(8, h * 0.4));
        ctx.stroke();
        ctx.restore();
      }
      // nazwa nacji wprost pod jej warstwą — spis przestaje być paskiem kolorów
      const podpisRasy = telefon ? 12 : Math.max(12, Math.min(h * 0.78, p.w * 0.024));
      ctx.font = `${r === Race.MYCELIUM ? "italic " : ""}${podpisRasy}px ${SERIF}`;
      const etykieta = RACES[r].short;
      if (bw > ctx.measureText(etykieta).width + 8) {
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.9)`;
        ctx.fillText(etykieta, cx + bw / 2, y + h + podpisRasy * 1.05);
      }
      cx += bw;
    }
  }
  // na telefonie zdanie o dominacji zabierało miejsce płycie — jest w radzie i w atlasie
  if (telefon) { ctx.restore(); return; }
  ctx.fillStyle = `${INK}0.86)`;
  const rozmiarPodpisu = Math.max(14, Math.min(h * 0.86, p.w * 0.042));
  ctx.font = `italic ${rozmiarPodpisu}px ${SERIF}`;
  ctx.textAlign = 'left';
  let podpis = censusLine(sim);
  while (ctx.measureText(podpis).width > p.w * 0.95 && podpis.length > 16) podpis = podpis.slice(0, -2);
  if (podpis !== censusLine(sim)) podpis += '…';
  ctx.textAlign = 'left';
  ctx.fillText(podpis, x0, y + h + Math.max(14, rozmiarPodpisu * 1.15) + Math.max(12, Math.min(h * 0.78, p.w * 0.024)) * 1.1);
  ctx.restore();
}

function censusLine(sim: Sim): string {
  const dom = sim.dominance;
  if (sim.domRace < 0) return 'Zadna krew nie goruje. Karmisz sie z wielu naraz.'.replace('Zadna', 'Żadna').replace('goruje', 'góruje').replace('sie', 'się');
  const r = sim.domRace;
  const name = RACES[r].name;
  if (dom > 0.92) return `${name} ${odmien(r, 'został sam', 'zostali sami')}. Nie ma się już kogo bać.`;
  if (dom > 0.78) return `${name} ${odmien(r, 'zajmuje', 'zajmują')} już prawie wszystko w tobie.`;
  if (dom > 0.62) return `${name} ${odmien(r, 'bierze', 'biorą')} górę.`;
  return 'Żadna krew nie góruje. Karmisz się z wielu naraz.';
}

/** Krew: ciecz w szczelinie skalnej u dołu płyty — nie pasek, tylko rysa, która się napełnia. */
export function drawCrack(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, vw: number, vh: number, time: number): void {
  // skala liniowa: przy logarytmicznej „krwi masz dość" wyglądało na pół misy
  const PELNA = 300;
  const level = Math.min(1, sim.krew / PELNA);
  // rysa, nie wykres słupkowy — geometria wspólna z samouczkiem
  const o = obszarKrwi(p, vh);
  const cx0 = o.x, cx1 = o.x + o.w, base = o.y + o.h, maxH = o.h;

  // obrys rysy: postrzępiona góra, końce zbiegające się w szpic
  const segs = 22;
  const top: [number, number][] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = cx0 + (cx1 - cx0) * t;
    const taper = Math.min(1, Math.sin(t * Math.PI) * 1.9);
    const jag = 0.82 + 0.18 * Math.sin(t * 17.3 + 1.1) * Math.sin(t * 5.7);
    top.push([x, base - maxH * taper * jag]);
  }

  ctx.save();
  // podpis organu nad jego lewym końcem
  ctx.font = `9px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(224,168,96,0.6)';
  ctx.fillText('K R E W', cx0, base - maxH - 4);
  ctx.beginPath();
  ctx.moveTo(cx0, base);
  for (const [x, y] of top) ctx.lineTo(x, y);
  ctx.lineTo(cx1, base);
  ctx.closePath();
  ctx.strokeStyle = `${INK}0.4)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.clip();
  const surface = base - Math.max(2, level * maxH);
  const progKrwi = 90 / PELNA;                    // tyle trzeba na Skazę — stąd nacięcie
  prog(ctx, cx0 - 26, cx0 - 6, base - progKrwi * maxH, sim.krew >= 90, '');
  const g = ctx.createLinearGradient(0, surface, 0, base);
  g.addColorStop(0, 'rgba(104,22,20,0.88)');
  g.addColorStop(1, 'rgba(26,4,5,0.96)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx0 - 4, base + 4);
  for (let x = cx0 - 4; x <= cx1 + 4; x += 6) {
    ctx.lineTo(x, surface + Math.sin(x * 0.06 + time * 0.0012) * 1.6 + Math.sin(x * 0.017 - time * 0.0008) * 1.2);
  }
  ctx.lineTo(cx1 + 4, base + 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(206,96,74,0.65)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // krew też jest ryciną: poziome kreski zamiast gładkiej plamy
  ctx.strokeStyle = 'rgba(18,4,4,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = surface + 3; y < base; y += 3.5) { ctx.moveTo(cx0 - 4, y); ctx.lineTo(cx1 + 4, y); }
  ctx.stroke();
  ctx.restore();
  void vw;
}

/** Nacięcie progu na organie: „stać cię na…". Liczby zostają ukryte. */
function prog(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, osiagniety: boolean, podpis: string): void {
  ctx.save();
  ctx.strokeStyle = osiagniety ? 'rgba(246,216,142,0.85)' : 'rgba(180,168,146,0.35)';
  ctx.lineWidth = osiagniety ? 1.6 : 1;
  ctx.beginPath();
  ctx.moveTo(x1, y); ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.font = `italic ${Math.max(13, (x2 - x1) * 0.35)}px ${SERIF}`;
  ctx.fillStyle = osiagniety ? 'rgba(246,216,142,0.9)' : 'rgba(180,168,146,0.45)';
  ctx.textAlign = 'left';
  ctx.fillText(podpis, x2 + 4, y + 3);
  ctx.restore();
}

/** Pionowy podpis działu na lewym marginesie: rozstrzelone kapitaliki czytane od dołu. */
function etykietaPionowa(ctx: CanvasRenderingContext2D, tekst: string, x: number, yc: number): void {
  ctx.save();
  ctx.translate(x, yc);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `9px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(224,168,96,0.6)';
  ctx.fillText(tekst.toUpperCase().split('').join(' '), 0, 0);
  ctx.restore();
}

/** Otchłań jako osobny znak: tyle ciebie jest teraz nieznane. */
export function drawOtchlan(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, vh: number): void {
  const udzial = Math.max(0, Math.min(1, sim.world.unknown / (sim.world.w * sim.world.h)));
  // na wąskim ekranie kwadrat Otchłani wchodził w podpisy nacji — schodzi pod spis
  const { x, y, h: bok } = obszarOtchlani(p, vh);
  ctx.save();
  // studnia: ciemna, w podwójnej ramie; nieznane wypełnia ją bladą kreską od dna —
  // im więcej ciebie zapomniane, tym wyżej sięga
  ctx.fillStyle = 'rgba(8,6,6,1)';
  ctx.fillRect(x, y, bok, bok);
  const poziom = y + bok * (1 - udzial);
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 2, poziom, bok - 4, y + bok - 2 - poziom); ctx.clip();
  ctx.fillStyle = 'rgba(232,230,238,0.16)';
  ctx.fillRect(x, poziom, bok, bok);
  ctx.strokeStyle = 'rgba(232,230,238,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let d = -bok; d < bok * 2; d += 3) { ctx.moveTo(x + d, y + bok); ctx.lineTo(x + d + bok, y); }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(232,230,238,0.85)';
  ctx.beginPath(); ctx.moveTo(x + 2, poziom + 0.5); ctx.lineTo(x + bok - 2, poziom + 0.5); ctx.stroke();
  ctx.strokeStyle = `${INK}0.55)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, bok - 1, bok - 1);
  ctx.strokeStyle = `${INK}0.2)`;
  ctx.strokeRect(x - 2.5, y - 2.5, bok + 5, bok + 5);
  // nacięcie progu Skazy na ścianie studni
  const progS = y + bok * (1 - Math.min(1, 55 / Math.max(1, sim.world.w * sim.world.h * 0.0035)));
  ctx.strokeStyle = sim.otchlan >= 55 ? 'rgba(246,216,142,0.9)' : `${INK}0.35)`;
  ctx.beginPath(); ctx.moveTo(x - 5, progS); ctx.lineTo(x + 3, progS); ctx.stroke();
  ctx.font = `italic ${Math.max(13, bok * 0.3)}px ${SERIF}`;
  ctx.fillStyle = `${INK}0.9)`;
  ctx.textAlign = 'left';
  if (p.niski) {
    // poziomo pasek ma jedną linijkę wysokości
    ctx.font = `italic 12px ${SERIF}`;
    ctx.fillText(sim.otchlan >= 55 ? 'otchłań · Skaza' : 'otchłań', x + bok + 6, y + bok * 0.66);
  } else {
    ctx.fillText('otchłań', x + bok + 6, y + bok * 0.55);
    ctx.fillText(sim.otchlan >= 55 ? 'stać cię na Skazę' : 'za mało na Skazę', x + bok + 6, y + bok * 0.95);
  }
  ctx.restore();
}

/** Wiara: dym ofiarny gęstniejący pod sklepieniem płyty. */
export function drawSmoke(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, time: number): void {
  const faith = Math.min(1, sim.wiara / 120);
  // na wąskim ekranie klepsydra siedzi w prawym górnym rogu płyty — próg Wiary
  // schodzi wtedy na lewą stronę, żeby napisy się nie nakładały
  if (p.waski) prog(ctx, p.x + 16, p.x + 66, p.y + 16, sim.wiara >= 45, 'Znak');
  else prog(ctx, p.x + p.w - 120, p.x + p.w - 60, p.y + 14, sim.wiara >= 45, 'Znak');
  if (faith < 0.01) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(p.x, p.y, p.w, p.h);
  ctx.clip();
  // dym musi być czytelny, ale nie może zabielać świata — tło jest teraz ciemne
  const band = p.h * (0.07 + faith * 0.1);
  const g = ctx.createLinearGradient(0, p.y, 0, p.y + band);
  g.addColorStop(0, `rgba(232,216,186,${0.06 + faith * 0.14})`);
  g.addColorStop(1, 'rgba(232,216,186,0)');
  ctx.fillStyle = g;
  ctx.fillRect(p.x, p.y, p.w, band);
  for (let i = 0; i < 6; i++) {
    const t = time * (ustawienia.ograniczRuch ? 0.00005 : 0.00018) + i * 2.1;
    const x = p.x + ((Math.sin(t * 1.3 + i) * 0.5 + 0.5) * p.w);
    const y = p.y + band * (0.25 + 0.45 * Math.sin(t * 2.3 + i));
    const r = band * (0.45 + 0.4 * Math.sin(t + i));
    const rg = ctx.createRadialGradient(x, y, 0, x, y, Math.max(4, r));
    rg.addColorStop(0, `rgba(236,222,192,${0.05 * faith})`);
    rg.addColorStop(1, 'rgba(236,222,192,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** Sen: powieka schodząca z góry i z dołu płyty. Przegraną widać, zanim nadejdzie. */
export function drawEyelid(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, teraz = 0): void {
  if (sim.sen < 0.02) return;
  const d = p.h * 0.42 * sim.sen;
  // powieka jest sina, nie czarna — czarne pasy nie różniły się od zwykłego mroku
  const barwa = (a: number) => `rgba(26,22,44,${a})`;
  const g1 = ctx.createLinearGradient(0, p.y, 0, p.y + d);
  g1.addColorStop(0, barwa(0.97));
  g1.addColorStop(0.7, barwa(0.5));
  g1.addColorStop(1, barwa(0));
  ctx.fillStyle = g1;
  ctx.fillRect(p.x, p.y, p.w, d);
  const g2 = ctx.createLinearGradient(0, p.y + p.h, 0, p.y + p.h - d);
  g2.addColorStop(0, barwa(0.97));
  g2.addColorStop(0.7, barwa(0.5));
  g2.addColorStop(1, barwa(0));
  ctx.fillStyle = g2;
  ctx.fillRect(p.x, p.y + p.h - d, p.w, d);

  // rzęsy: kreski wzdłuż krawędzi powieki, żeby to był kształt oka, a nie winieta
  ctx.save();
  ctx.strokeStyle = `rgba(150,146,180,${0.25 + sim.sen * 0.4})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = p.x; x < p.x + p.w; x += 9) {
    const f = Math.sin(x * 0.07) * 2;
    ctx.moveTo(x, p.y + d + f); ctx.lineTo(x + 3, p.y + d - 5 + f);
    ctx.moveTo(x, p.y + p.h - d - f); ctx.lineTo(x + 3, p.y + p.h - d + 5 - f);
  }
  ctx.stroke();

  if (sim.sen > 0.25) {
    const puls = 0.55 + 0.45 * Math.sin(teraz * 0.0018);
    // dwa różne powody snu mają dwa różne zdania
    const zywych = sim.creatures.reduce((n, c) => n + (c.dead || c.race === Race.HUMAN ? 0 : 1), 0);
    const zPustki = zywych < 14 && sim.dominance < 0.8;
    const podpis = sim.sen <= 0.7 ? 'powieka opada'
      : zPustki ? 'zasypiasz — nie ma już komu o tobie pamiętać'
      : 'zasypiasz — jedna krew zjada resztę';
    const rozmiar = Math.max(15, Math.min(22, p.w * 0.022));
    ctx.textAlign = 'center';
    ctx.font = `italic ${rozmiar}px ${SERIF}`;
    const szer = ctx.measureText(podpis).width;
    const cx = p.x + p.w / 2, cy = p.y + d + Math.max(22, p.h * 0.04);
    ctx.fillStyle = 'rgba(14,12,26,0.86)';           // plakietka, żeby tekst nie ginął w kresce
    ctx.fillRect(cx - szer / 2 - 12, cy - rozmiar, szer + 24, rozmiar * 1.7);
    ctx.strokeStyle = `rgba(150,146,190,${0.35 + puls * 0.3})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - szer / 2 - 12, cy - rozmiar, szer + 24, rozmiar * 1.7);
    ctx.fillStyle = `rgba(214,210,240,${0.75 + puls * 0.25})`;
    ctx.fillText(podpis, cx, cy + rozmiar * 0.2);
  }
  ctx.restore();
}

/**
 * Kronika: główny tekst ekranu, własne pasmo w dolnym marginesie. Nie może wchodzić
 * ani na spis ras, ani na szczelinę — cztery elementy w jednym rogu wyglądały jak awaria.
 */
export function drawChronicle(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, vw: number, vh: number): void {
  // na telefonie nie ma na nią miejsca pod płytą — cała kronika jest pod przyciskiem zapisków
  if (p.waski || p.niski) return;
  // pasmo kroniki: dolne 46% marginesu, nic innego tam nie wchodzi
  const bandTop = vh - p.bottom * (p.waski ? 0.72 : 0.46);
  const yBase = vh - p.bottom * (p.waski ? 0.3 : 0.05);
  const lines3 = (yBase - bandTop) / 3 / 1.4;
  const size = Math.max(14, Math.min(Math.min(22, vw / 46), lines3));
  const x = p.x;
  if (sim.chronicle.length) etykietaPionowa(ctx, 'kronika', x - 16, (bandTop + yBase) / 2);
  // na telefonie kronika dzieli dolny margines z Otchłanią — nie może na nią wchodzić
  const maxW = p.waski ? p.w - obszarOtchlani(p, vh).w - 14 : p.w * 0.58;
  ctx.save();
  ctx.textAlign = 'left';
  const lines = sim.chronicle.slice(-3);
  for (let i = lines.length - 1; i >= 0; i--) {
    const e = lines[i];
    const back = lines.length - 1 - i;
    const age = sim.tick - e.tick;
    // koniec świata nie znika po chwili; zwykły ruch tak
    const zycie = e.kind === 'koniec' ? 12000 : e.kind === 'krew' || e.kind === 'otchlan' ? 6000 : 3400;
    // starsze linijki cichną, ale nie znikają — dawniej gasły do ledwie widocznej szarości
    const fade = Math.max(0.34, 1 - age / zycie) * (1 - back * 0.2);
    const y = yBase - back * size * 1.4;
    ctx.font = `${back === 0 ? '' : 'italic '}${size * (back === 0 ? 1 : 0.84)}px ${SERIF}`;
    let text = e.text;
    while (ctx.measureText(text).width > maxW && text.length > 12) text = text.slice(0, -2);
    if (text !== e.text) text += '…';
    const col = e.kind === 'krew' ? [214, 104, 86]
      : e.kind === 'wiara' ? [234, 214, 166]
      : e.kind === 'otchlan' ? [226, 228, 236]
      : e.kind === 'koniec' ? [246, 226, 196]
      : [206, 194, 172];
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(10,7,6,${fade * 0.8})`;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${fade})`;
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}
