import { Sim } from '../sim/sim';
import { RACES, RACE_COUNT, Race, odmien } from '../sim/races';
import { SERIF } from './overlay';
import { ustawienia } from '../core/settings-store';
import { dolPrzyciskow, lewaKrawedzPrzyciskow } from './przyciski';
import { EKRAN, TELEFON } from '../nastawy/ekran';
import { PIELGRZYMKA } from '../nastawy/rytual';
import { najwierniejsza } from '../sim/pielgrzymka';
import { cost } from '../powers/powers';
import { liczRole } from '../sim/lud';
import { LUD, REMAKE } from '../nastawy/lud';
import { GORA } from '../nastawy/gora';
import { ramaFresku } from './fresk';
import { FRESK } from '../nastawy/barwy';
import { NASTROJ } from '../nastawy/wyglad/nastroj';
import { plynnie, wolnoRuszac } from './nastroj';
import { rysujZnakOddania } from './modlitwa';
import { rysujRelikwiarz, RELIKWIARZ_PROPORCJA } from './relikwiarz';

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
 * pionowo rząd przycisków, spis ras, a na dole krew i oddanie obok siebie;
 * poziomo jeden cienki pasek: spis, oddanie, krew.
 */
const TEL = {
  // rzadY: krew i oddanie schodzą pod wiersz „ze skały” (TELEFON.pion.dol)
  pion: { spisY: 82, spisH: 12, rzadY: 144, oddanieBok: 34 },
  poziom: { spisY: 17, spisH: 9, oddanieBok: 24, spisCzesc: 0.46 },
};

/**
 * Relikwiarz krwi z podpisem. Na komputerze stoi od dołu marginesu aż pod przyciski i dłonie
 * oddania — ma być wysoki, żeby z bliska było widać złotnictwo; na telefonie ma wysokość dłoni.
 */
export function obszarKrwi(p: Plate, vh: number): Obszar {
  const o = obszarOddania(p, vh);
  if (p.waski) {
    // obok dłoni oddania, w dolnym rzędzie marginesu
    return { x: p.x + 28, y: o.y, w: o.x - p.x - 28 - 16, h: o.h };
  }
  if (p.niski) {
    const x = o.x + o.w + 14;
    return { x, y: o.y, w: p.x + p.w - x, h: o.h };
  }
  const cx0 = p.x + p.w * 0.6;
  const base = vh - p.bottom * 0.1;
  const nadOddaniem = o.x + o.w > cx0 ? o.y + o.h : vh - p.bottom;
  const gora = Math.max(dolPrzyciskow(p, vh), nadOddaniem) + 8;
  const h = Math.max(p.bottom * 0.34, base - gora);
  return { x: cx0, y: base - h, w: p.x + p.w - cx0, h };
}

/** Złożone dłonie oddania razem z podpisem (na komputerze w tym miejscu stoi Otchłań). */
export function obszarOddania(p: Plate, vh: number): Obszar {
  const mt = vh - p.bottom;
  if (p.waski) {
    const bok = TEL.pion.oddanieBok;
    const w = bok + 6 + 18 * 6.6;
    return { x: p.x + p.w - w, y: mt + TEL.pion.rzadY + 4, w, h: bok };
  }
  if (p.niski) {
    const bok = TEL.poziom.oddanieBok;
    const w = bok + 6 + 13 * 5.6;
    return { x: p.x + p.w * TEL.poziom.spisCzesc + 18, y: mt + 12, w, h: bok };
  }
  const bok = Math.max(26, Math.min(46, p.bottom * 0.28));
  // szerokość z podpisem („pielgrzymka od 50%”) — podpis nie może wyjść poza płytę
  const w = bok + 6 + Math.max(13, bok * 0.3) * 9;
  // szeroko: w połowie, ale nigdy na przyciskach
  const x = Math.min(p.x + p.w * 0.5, lewaKrawedzPrzyciskow(p) - w - 14);
  const y = vh - p.bottom + p.bottom * 0.14;
  return { x, y, w, h: bok };
}

/** Szerokość wstęgi spisu ras — kończy się przed dłońmi oddania. */
function szerokoscSpisu(p: Plate, vh: number): number {
  if (p.niski) return p.w * TEL.poziom.spisCzesc;
  return p.waski ? p.w - 28 : Math.max(p.w * 0.25, Math.min(p.w * 0.46, obszarOddania(p, vh).x - p.x - 16));
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

/**
 * Rama płyty malowana jak obramowanie fresku (render/fresk.ts). W lewym pasie ramy namalowane
 * oko: powieka przybrudzoną bielą, źrenica czerwona — oddycha z rdzeniem, mruga nieregularnie
 * i wodzi źrenicą za kursorem. Z czerwonego pasa wychodzi czasem nieznane pismo i gaśnie.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, p: Plate, time: number, oddech = 0.5, kursor?: { x: number; y: number }): void {
  const pas = p.waski || p.niski ? 6 : 9;
  const gr = pas * 1.66;
  ramaFresku(ctx, p.x - gr, p.y - gr, p.w + gr * 2, p.h + gr * 2, pas, time, p.waski || p.niski ? 0 : 3);
  if (p.waski) return;
  const ex = p.x - gr + pas / 2, ey = p.y + p.h / 2;
  ctx.save();
  // migdał oka na czerwonym pasie; mruga nieregularnie (czasem dwa razy pod rząd)
  const cyklMrugu = Math.floor(time / 5200);
  const losMrugu = Math.sin(cyklMrugu * 91.7) * 4375.85 % 1;
  const wCyklu = time % 5200;
  const mrug = wCyklu < 150 || (losMrugu > 0.6 && wCyklu > 330 && wCyklu < 450) ? 0.15 : 1;
  const hw = pas * 0.62, hh = pas * 1.7;
  // źrenica podąża za kursorem — powoli, jakby oko dopiero się budziło
  const doX = kursor && wolnoRuszac() ? Math.max(-1, Math.min(1, (kursor.x - ex) / 420)) : 0;
  const doY = kursor && wolnoRuszac() ? Math.max(-1, Math.min(1, (kursor.y - ey) / 320)) : 0;
  const ox = plynnie('oko-x', doX, 420) * hw * NASTROJ.okoPodaza;
  const oy = plynnie('oko-y', doY, 420) * hh * NASTROJ.okoPodaza;
  const oko = new Path2D();
  oko.moveTo(ex, ey - hh); oko.quadraticCurveTo(ex + hw * 1.6, ey, ex, ey + hh); oko.quadraticCurveTo(ex - hw * 1.6, ey, ex, ey - hh);
  ctx.fillStyle = '#b9aa8c';
  ctx.save(); ctx.translate(ex, ey); ctx.scale(mrug, 1); ctx.translate(-ex, -ey); ctx.fill(oko); ctx.restore();
  ctx.strokeStyle = '#1e0904'; ctx.lineWidth = 1.2; ctx.stroke(oko);
  if (mrug > 0.5) {
    ctx.save();
    ctx.clip(oko);
    const [zr, zg, zb] = FRESK.zar;
    ctx.shadowColor = `rgba(${zr},${zg},${zb},${0.5 + 0.3 * oddech})`;
    ctx.shadowBlur = pas * 0.8;
    ctx.fillStyle = `rgba(140,26,16,${0.75 + 0.25 * oddech})`;
    ctx.beginPath(); ctx.ellipse(ex + ox, ey + oy, hw * 0.55, hh * (0.3 + 0.12 * oddech), 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0c0403';
    ctx.beginPath(); ctx.ellipse(ex + ox * 1.15, ey + oy * 1.15, hw * 0.2, hh * (0.12 + 0.08 * oddech), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
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
  // Remake v1: jeden lud — zamiast przewagi ras liczba rąk w każdej roli
  if (REMAKE) {
    const n = liczRole(sim);
    const wszyscy = n.pobozny + n.robotnik + n.rycerz;
    if (!wszyscy) return 'W górze nie został nikt z twoich.';
    return `Twój lud: ${n.pobozny} pobożnych, ${n.robotnik} robotników, ${n.rycerz} rycerzy.`;
  }
  const dom = sim.dominance;
  if (sim.domRace < 0) return 'Zadna krew nie goruje. Karmisz sie z wielu naraz.'.replace('Zadna', 'Żadna').replace('goruje', 'góruje').replace('sie', 'się');
  const r = sim.domRace;
  const name = RACES[r].name;
  if (dom > 0.92) return `${name} ${odmien(r, 'został sam', 'zostali sami')}. Nie ma się już kogo bać.`;
  if (dom > 0.78) return `${name} ${odmien(r, 'zajmuje', 'zajmują')} już prawie wszystko w tobie.`;
  if (dom > 0.62) return `${name} ${odmien(r, 'bierze', 'biorą')} górę.`;
  return 'Żadna krew nie góruje. Karmisz się z wielu naraz.';
}

/**
 * Krew: relikwiarz z ampułką (render/relikwiarz.ts) — krew stoi w szkle, a obok napis, ile jej
 * jest i co z tego wynika. Pełna ampułka to ostrzeżenie: więcej się nie zmieści, nadmiar przepada.
 */
export function drawKrew(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, vh: number, time: number): void {
  const o = obszarKrwi(p, vh);
  const max = GORA.krewMax;
  const krew = Math.max(0, sim.krew);
  rysujRelikwiarz(ctx, o.x, o.y, o.h, krew, max, time, { spokoj: ustawienia.ograniczRuch });
  const pelna = krew >= max - 0.5;
  const rola = sim.lud?.rola ?? 'robotnik';
  const koszt = LUD.koszt[rola];
  const kogo = rola === 'robotnik' ? 'robotnika' : 'pobożnego';
  const tx = o.x + o.h * RELIKWIARZ_PROPORCJA + 8;
  const miejsce = o.x + o.w - tx;
  const rozm = p.niski ? 12 : Math.max(13, obszarOddania(p, vh).h * 0.3);
  const font = `italic ${rozm}px ${SERIF}`;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'left';
  const pasuje = (t: string) => ctx.measureText(t).width <= miejsce;
  const ile = Math.floor(krew);
  const napis = [`krew ${ile} z ${max}`, `krew ${ile}`].find(pasuje) ?? `${ile}`;
  // dwie linijki: przy niskiej relikwii jak przy dłoniach oddania, przy wysokiej — w połowie wysokości
  const y1 = p.niski ? o.y + o.h * 0.66 : o.h <= 50 ? o.y + o.h * 0.55 : o.y + o.h * 0.58 - rozm * 0.2;
  const y2 = o.h <= 50 ? o.y + o.h * 0.95 : y1 + rozm * 1.3;
  ctx.fillStyle = `${INK}0.9)`;
  ctx.fillText(napis, tx, y1);
  if (!p.niski) {
    const tetno = ustawienia.ograniczRuch ? 1 : 0.5 + 0.5 * Math.sin(time * 0.0032);
    let wersje: string[];
    if (pelna) {
      ctx.fillStyle = `rgba(236,128,100,${(0.7 + 0.3 * tetno).toFixed(3)})`;
      wersje = ['pełna — nadmiar przepada', 'pełna — przepada', 'pełna'];
    } else if (krew < koszt) {
      ctx.fillStyle = 'rgba(226,120,100,0.95)';
      wersje = [`za mało na ${kogo} (${koszt})`, `za mało (${koszt})`, 'za mało'];
    } else {
      ctx.fillStyle = `${INK}0.7)`;
      wersje = ['płynie z każdej śmierci', 'z każdej śmierci', ''];
    }
    const t2 = wersje.find(pasuje) ?? '';
    if (t2) ctx.fillText(t2, tx, y2);
  }
  ctx.restore();
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

/**
 * Oddanie najwierniejszej nacji — w miejscu, gdzie na komputerze stoi Otchłań.
 * Złożone dłonie (render/modlitwa.ts) napełniają się złotem od mankietu po czubki palców,
 * a kreska w poprzek to próg, od którego nacja sama wysyła wartę pod rdzeń. Bez tego oddanie było liczbą,
 * której nikt nie widział, a „dlaczego nikt nie idzie pod rdzeń” — zagadką.
 */
export function drawOddanie(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, vh: number): void {
  const klan = najwierniejsza(sim);
  const oddanie = klan ? klan.devotion : 0;
  const prog = PIELGRZYMKA.oddanieNacji;
  const dosc = oddanie > prog;
  const { x, y, h: bok } = obszarOddania(p, vh);
  rysujZnakOddania(ctx, x, y, bok, oddanie, prog, INK, performance.now());
  ctx.save();
  const ile = `${Math.floor(oddanie * 100)}%`;
  const dopisek = !klan ? 'nikt nie wierzy' : dosc ? 'idą pod rdzeń' : `pielgrzymka od ${Math.round(prog * 100)}%`;
  ctx.font = `italic ${Math.max(13, bok * 0.3)}px ${SERIF}`;
  ctx.fillStyle = `${INK}0.9)`;
  ctx.textAlign = 'left';
  if (p.niski) {
    // poziomo pasek ma jedną linijkę wysokości
    ctx.font = `italic 12px ${SERIF}`;
    ctx.fillText(`oddanie ${ile}`, x + bok + 6, y + bok * 0.66);
  } else {
    ctx.fillText(`oddanie ${ile}`, x + bok + 6, y + bok * 0.55);
    ctx.fillStyle = dosc ? 'rgba(246,216,142,0.95)' : `${INK}0.7)`;
    ctx.fillText(dopisek, x + bok + 6, y + bok * 0.95);
  }
  ctx.restore();
}

/** Wiara: dym ofiarny gęstniejący pod sklepieniem płyty. */
export function drawSmoke(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, time: number): void {
  const faith = Math.min(1, sim.wiara / 120);
  // na wąskim ekranie klepsydra siedzi w prawym górnym rogu płyty — próg Wiary
  // schodzi wtedy na lewą stronę, żeby napisy się nie nakładały
  const naZnak = sim.wiara >= cost('znak', 'objawienie').wiara;
  // TELEFON: nad płytą stoi „wiara N”, a ryt Cudu świeci, gdy stać — kreska z podpisem „Cud”
  // w rogu wyglądała jak nazwa wybranego rytu (przy Nakarm też pisała „Cud”)
  if (!p.waski && !p.niski) prog(ctx, p.x + p.w - 120, p.x + p.w - 60, p.y + 14, naZnak, 'Cud');
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
  // na telefonie kronika dzieli dolny margines z dłońmi oddania — nie może na nią wchodzić
  const maxW = p.waski ? p.w - obszarOddania(p, vh).w - 14 : p.w * 0.58;
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
    // najnowsza linijka pisze się od lewej, a na końcu pióra tli się żar
    const pisze = back === 0 && wolnoRuszac() ? Math.max(0, Math.min(1, age / NASTROJ.kronikaPisanie)) : 1;
    const szer = ctx.measureText(text).width;
    ctx.save();
    if (pisze < 1) {
      const doklad = 1 - Math.pow(1 - pisze, 2);
      ctx.beginPath(); ctx.rect(x - 4, y - size * 1.3, (szer + 8) * doklad, size * 1.8); ctx.clip();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(10,7,6,${fade * 0.8})`;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${fade})`;
    ctx.fillText(text, x, y);
    ctx.restore();
    if (pisze < 1) {
      const doklad = 1 - Math.pow(1 - pisze, 2);
      const [zr, zg, zb] = FRESK.zar;
      const px = x + szer * doklad, py = y - size * 0.3;
      const zar = ctx.createRadialGradient(px, py, 0, px, py, size * 0.7);
      zar.addColorStop(0, `rgba(255,200,140,${0.8 * (1 - pisze)})`);
      zar.addColorStop(0.4, `rgba(${zr},${zg},${zb},${0.45 * (1 - pisze)})`);
      zar.addColorStop(1, `rgba(${zr},${zg},${zb},0)`);
      ctx.fillStyle = zar;
      ctx.fillRect(px - size, py - size, size * 2, size * 2);
    }
  }
  ctx.restore();
}
