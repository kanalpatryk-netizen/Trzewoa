import { Sim } from '../sim/sim';
import { Race } from '../sim/races';
import { SERIF } from './overlay';
import { ustawienia } from '../core/settings-store';
import { EKRAN, TELEFON, PAS } from '../nastawy/ekran';
import { dolPasaPion, ukladPasa } from './pas';
import { WARIANT } from '../nastawy/wariant';
import { PIELGRZYMKA } from '../nastawy/rytual';
import { najwierniejsza } from '../sim/pielgrzymka';
import { cost } from '../powers/powers';
import { GORA } from '../nastawy/gora';
import { OLTARZ } from '../nastawy/oltarz';
import { rysujRelikwiarz, RELIKWIARZ_PROPORCJA } from './relikwiarz';
import { ramaFresku, pigment } from './fresk';
import { FRESK } from '../nastawy/barwy';
import { NASTROJ } from '../nastawy/wyglad/nastroj';
import { plynnie, wolnoRuszac } from './nastroj';

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
  // Alpha 0.3 (wersja „razem”): lewy margines to kolumna kafelków drużyny — szerszy niż dawna kolumna rytów
  const kolumna = WARIANT === 'razem';
  const left = kolumna ? (waski ? PAS.pionLewo : niski ? PAS.poziomLewo : Math.max(PAS.kolumnaMin, Math.min(PAS.kolumnaMax, vw * PAS.kolumnaCzesc)))
    : T ? T.lewo : Math.max(58, Math.min(104, vw * 0.075));
  const right = T ? T.prawo : Math.max(58, Math.min(104, vw * 0.075));
  // Alpha 0.3: dolny margines to pas kart (render/pas.ts), a górny mieści zasoby, kronikę i przyciski
  const top = kolumna && waski ? PAS.pionGora : T ? T.gora : Math.max(PAS.goraMin, Math.min(PAS.goraMax, vh * PAS.goraCzesc));
  const bottom = waski ? dolPasaPion() : niski ? PAS.poziomDol : Math.max(PAS.dolMin, Math.min(PAS.dolMax, vh * PAS.dolCzesc));
  return { x: left, y: top, w: Math.max(80, vw - left - right), h: Math.max(80, vh - top - bottom), left, right, top, bottom, waski, niski };
}

const INK = 'rgba(206,192,166,';

/** Prostokąt na ekranie — samouczek wskazuje nim organy w ramie. */
export interface Obszar { x: number; y: number; w: number; h: number; }


/**
 * Relikwiarz krwi z podpisem (Alpha, etap 4 — z Remake v2). Alpha 0.3: na komputerze w bloku z prawej strony pasa
 * kart (pod dłońmi oddania), na telefonie poziomo — w górnym pasku, pionowo — w dolnym rzędzie (render/pas.ts).
 */
export function obszarKrwi(p: Plate, vh: number): Obszar {
  return ukladPasa(p, vh).krew;
}

/** Środek ampułki relikwiarza na ekranie — tam spływa krew (dar dłoni anielskiej, render/aniol.ts). */
export function srodekAmpulki(p: Plate, vh: number): { x: number; y: number } {
  const o = obszarKrwi(p, vh);
  return { x: o.x + o.h * RELIKWIARZ_PROPORCJA * 0.5, y: o.y + o.h * 0.42 };
}

/** Złożone dłonie oddania razem z podpisem (Alpha 0.3: obok relikwiarza — render/pas.ts). */
export function obszarOddania(p: Plate, vh: number): Obszar {
  return ukladPasa(p, vh).oddanie;
}

/** Alpha 0.3: dawna wstęga ludu — teraz cały pas kart (samouczek wskazuje go palcem). */
export function obszarSpisu(p: Plate, vh: number): Obszar {
  return ukladPasa(p, vh).karty;
}

/** Pasmo dymu Wiary pod górną krawędzią płyty. */
export function obszarWiary(p: Plate): Obszar {
  return { x: p.x, y: p.y, w: p.w, h: Math.max(30, p.h * 0.13) };
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

// (Alpha 0.3: spis ras — wstęga ludu — zniknął razem z dolnym panelem; nikt go już nie rysował)

/**
 * Krew: relikwiarz z ampułką (render/relikwiarz.ts) — krew stoi w szkle, a obok napis, ile jej jest i co z tego
 * wynika. Pełna ampułka to ostrzeżenie: więcej się nie zmieści, nadmiar przepada.
 */
export function drawKrew(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, vh: number, time: number): void {
  const o = obszarKrwi(p, vh);
  const max = GORA.krewMax;
  const krew = Math.max(0, sim.krew);
  rysujRelikwiarz(ctx, o.x, o.y, o.h, krew, max, time, { spokoj: ustawienia.ograniczRuch });
  const pelna = krew >= max - 0.5;
  // Alpha: krew to paliwo rytuałów przy ołtarzu — najtańszy z nich mówi, kiedy jej „za mało”
  const koszt = Math.min(...Object.values(OLTARZ.rytualy).map((r) => r.krew).filter((k) => k > 0));
  const tx = o.x + o.h * RELIKWIARZ_PROPORCJA + 8;
  const miejsce = o.x + o.w - tx;
  const rozm = p.niski ? 12 : Math.max(13, obszarOddania(p, vh).h * 0.3);
  ctx.save();
  ctx.font = `italic ${rozm}px ${SERIF}`;
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
      wersje = [`za mało na rytuał (${koszt})`, `za mało (${koszt})`, 'za mało'];
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


/**
 * Złożone do modlitwy dłonie w kwadracie 100×100. Opisana jest prawa dłoń, lewa to jej lustro;
 * między nimi zostaje szpara pod kciukami, jak na ikonach — dzięki niej nawet w 24 px
 * widać dłonie, a nie postać.
 */
const DLON: (['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number])[] = [
  ['M', 50.4, 2],
  ['C', 54, 2, 56, 5, 56.5, 10],       // środkowy palec
  ['C', 59.5, 11.5, 61, 15, 61, 20],   // serdeczny
  ['C', 64, 22, 65.5, 26, 65.5, 31],   // mały
  ['C', 66.5, 41, 69.5, 52, 73.5, 61], // krawędź dłoni
  ['L', 81, 67],                       // mankiet
  ['L', 88, 100],                      // rękaw
  ['L', 66, 100],
  ['L', 64, 82],
  ['L', 59, 77],                       // nadgarstek od środka
  ['C', 55.5, 68, 52, 56, 51.4, 44],   // wnętrze dłoni pod kciukiem
  ['C', 51, 30, 50.5, 14, 50.4, 2],
];
let dlonie: { obrys: Path2D; rysy: Path2D } | null = null;

function zlozoneDlonie(): { obrys: Path2D; rysy: Path2D } {
  if (dlonie) return dlonie;
  const obrys = new Path2D();
  const rysy = new Path2D();
  for (const k of [1, -1]) {
    const X = (v: number) => 50 + k * (v - 50);
    for (const s of DLON) {
      if (s[0] === 'M') obrys.moveTo(X(s[1]), s[2]);
      else if (s[0] === 'L') obrys.lineTo(X(s[1]), s[2]);
      else obrys.bezierCurveTo(X(s[1]), s[2], X(s[3]), s[4], X(s[5]), s[6]);
    }
    obrys.closePath();
    // palce, kciuk i brzegi mankietu
    rysy.moveTo(X(56.5), 10); rysy.bezierCurveTo(X(57), 20, X(59), 34, X(62), 44);
    rysy.moveTo(X(61), 20); rysy.bezierCurveTo(X(61.5), 28, X(63), 36, X(65), 42);
    rysy.moveTo(X(51.6), 46); rysy.bezierCurveTo(X(55), 44, X(57.5), 52, X(58.5), 60);
    rysy.moveTo(X(73.5), 61); rysy.lineTo(X(64), 82);
    rysy.moveTo(X(81), 67); rysy.lineTo(X(66), 86);
  }
  return (dlonie = { obrys, rysy });
}

/**
 * Oddanie najwierniejszej nacji — w miejscu, gdzie na komputerze stoi Otchłań.
 * Złożone dłonie napełniają się złotem od rękawów po czubki palców, a kreska w poprzek
 * to próg, od którego nacja sama wysyła wartę pod rdzeń. Bez tego oddanie było liczbą,
 * której nikt nie widział, a „dlaczego nikt nie idzie pod rdzeń” — zagadką.
 */
export function drawOddanie(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, vh: number): void {
  const klan = najwierniejsza(sim);
  const oddanie = klan ? klan.devotion : 0;
  const prog = PIELGRZYMKA.oddanieNacji;
  const dosc = oddanie > prog;
  const { x, y, h: bok } = obszarOddania(p, vh);
  const { obrys, rysy } = zlozoneDlonie();
  const s = bok / 100;
  const poziom = 100 * (1 - Math.max(0, Math.min(1, oddanie)));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // wierni idą pod rdzeń: za dłońmi tli się blask
  if (dosc) {
    const tetno = 0.5 + 0.5 * Math.sin(performance.now() * 0.0021);
    const g = ctx.createRadialGradient(50, 34, 4, 50, 34, 66);
    g.addColorStop(0, `rgba(240,200,120,${0.22 + 0.12 * tetno})`);
    g.addColorStop(1, 'rgba(240,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, 140, 140);
  }
  ctx.fillStyle = 'rgba(14,9,6,0.96)';
  ctx.fill(obrys);
  const zalane = new Path2D();
  zalane.rect(0, poziom, 100, 100 - poziom);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.clip(obrys);
  pigment(ctx, zalane, dosc ? FRESK.zloto : FRESK.ugier, 0.85, 'zloto');
  // pod lustrem złota rysy malowane sinopią, nad nim — blady szkic na ciemnym
  ctx.lineWidth = 1 / s;
  if (bok >= 26) {
    ctx.save(); ctx.clip(zalane);
    ctx.strokeStyle = 'rgba(92,31,18,0.8)'; ctx.stroke(rysy);
    ctx.restore();
    ctx.strokeStyle = `${INK}0.22)`;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 100, poziom); ctx.clip(); ctx.stroke(rysy); ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,236,186,0.95)';
  ctx.lineWidth = 1.2 / s;
  ctx.beginPath(); ctx.moveTo(0, poziom); ctx.lineTo(100, poziom); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = dosc ? 'rgba(246,216,142,0.95)' : `${INK}0.8)`;
  ctx.lineWidth = 1.1 / s;
  ctx.stroke(obrys);
  // kreska progu pielgrzymki: w poprzek dłoni, żeby było widać, ile brakuje
  const progY = 100 * (1 - prog);
  ctx.strokeStyle = dosc ? 'rgba(246,216,142,0.95)' : 'rgba(246,216,142,0.6)';
  ctx.lineWidth = 1 / s;
  ctx.setLineDash([2 / s, 2 / s]);
  ctx.beginPath(); ctx.moveTo(-5 / s, progY); ctx.lineTo(100, progY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  ctx.save();
  const ile = `${Math.floor(oddanie * 100)}%`;
  const dopisek = !klan ? 'nikt nie wierzy' : dosc ? 'idą do krypty' : `pielgrzymka od ${Math.round(prog * 100)}%`;
  ctx.font = `italic ${Math.max(13, bok * 0.3)}px ${SERIF}`;
  ctx.fillStyle = `${INK}0.9)`;
  ctx.textAlign = 'left';
  if (p.niski) {
    // poziomo pasek ma jedną linijkę wysokości
    ctx.font = `italic 12px ${SERIF}`;
    const { w: szer } = obszarOddania(p, vh);
    ctx.fillText(ctx.measureText(`oddanie ${ile}`).width <= szer - bok - 8 ? `oddanie ${ile}` : ile, x + bok + 6, y + bok * 0.66);
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
 * Kronika: na komputerze (Alpha 0.3) — w górnym marginesie, między zasobami a przyciskami: najnowsza linijka
 * na wysokości zasobów, dwie starsze cichsze nad nią. Na telefonie nie ma na nią miejsca — cała kronika jest
 * pod przyciskiem zapisków.
 */
export function drawChronicle(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, x0: number, x1: number): void {
  if (p.waski || p.niski || x1 - x0 < 160) return;
  const size = Math.max(14, Math.min(17, p.top * 0.24));
  const yBase = p.y - p.top * 0.34;
  const x = x0;
  const maxW = x1 - x0;
  ctx.save();
  ctx.textAlign = 'left';
  const lines = sim.chronicle.slice(-2);
  for (let i = lines.length - 1; i >= 0; i--) {
    const e = lines[i];
    const back = lines.length - 1 - i;
    const age = sim.tick - e.tick;
    // koniec świata nie znika po chwili; zwykły ruch tak
    const zycie = e.kind === 'koniec' ? 12000 : e.kind === 'krew' || e.kind === 'otchlan' ? 6000 : 3400;
    // starsze linijki cichną, ale nie znikają — dawniej gasły do ledwie widocznej szarości
    const fade = Math.max(0.34, 1 - age / zycie) * (1 - back * 0.2);
    const y = yBase - back * size * 1.25;
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
