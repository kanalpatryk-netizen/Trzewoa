import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Prost } from '../sim/world';
import { SCHODY as S, BUDOWA_SCHODOW as B } from '../nastawy/loch';
import {
  spirala, szczytSchodow, wysokoscSzczytu, stanSchodow, pozycjaDrabiny, dolDrabiny, pomostNadSchodami,
  type Spirala, type BudowaOdcinka,
} from '../sim/budowa-schodow';
import { rysujKamienStopnia, zaczepStopnia } from './schody';

/**
 * BUDOWA SCHODÓW DROGI WIERNYCH — rysunek (6.11, decyzja użytkownika: „pełny system tworzenia tych schodów, czyli
 * rusztowania, liny, drabiny itp., nie kopanie blok po bloku”; symulacja — sim/budowa-schodow.ts). W odcinku szybu,
 * który się jeszcze kopie albo w którym stawia się schody:
 *  - drabina oparta o tylną ścianę surowego szybu: dwie żerdzie i szczeble, w odcinkach wiązanych liną; od wylotu
 *    (wystaje nad posadzkę — jest się czego chwycić, wchodząc) do dna wykopu albo do pomostu rusztowania nad schodami;
 *  - rusztowanie (przy budowie): stojaki przy ścianie, rygle, zastrzały na krzyż i pomost z desek — nad najwyższym
 *    stopniem, przestawiane w górę razem ze schodami;
 *  - kołowrót nad wylotem: słup na posadzce, wysięgnik z blokiem nad środkiem szybu, wał z korbą (kręci się, gdy ktoś
 *    przy nim stoi) i lina w dół — przy kopaniu z kubłem urobku (w dół pusty, w górę pełny, u góry wysypuje się na
 *    hałdę), przy budowie z ciosanym stopniem, który zjeżdża nad słup, siada na swoim miejscu i zostaje odczepiony;
 *  - hałda urobku przy kołowrocie (rośnie z wykopem), a przy budowie — stos ciosanych stopni, który maleje.
 * Rysunek idzie po schodach (render/schody.ts) i przed mrokiem — ciemność zakrywa go jak skałę. Placeholder do
 * podmiany na grafikę.
 */

type RGB = [number, number, number];
type Pkt = [number, number];
const TAU = Math.PI * 2;
const TUSZ = 'rgba(30,20,14,0.9)';
const DREWNO: RGB = [118, 82, 50];
const LINA: RGB = [168, 134, 88];
const ZELAZO = 'rgba(46,42,44,0.95)';

const barwa = (k: RGB, m: number, a = 1): string =>
  `rgba(${Math.min(255, Math.round(k[0] * m))},${Math.min(255, Math.round(k[1] * m))},${Math.min(255, Math.round(k[2] * m))},${a})`;

/** Rzut punktu w szybie (jak render/schody.ts): kąt, promień od środka, wysokość — dalej w głąb, odrobinę wyżej. */
function rzut(cam: Camera, sp: Spirala, th: number, r: number, y: number): Pkt {
  return [cam.toScreenX(sp.c + r * Math.sin(th)), cam.toScreenY(y - S.ukos * r * Math.cos(th))];
}

/** Belka: ciemny obrys pod spodem, drewno na wierzchu i jaśniejsza krawędź od światła. */
function belka(ctx: CanvasRenderingContext2D, a: Pkt, b: Pkt, grubosc: number, z: number, jasnosc = 1): void {
  const g = Math.max(1.2, grubosc * z);
  ctx.strokeStyle = TUSZ; ctx.lineWidth = g + Math.max(1, z * 0.05);
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.strokeStyle = barwa(DREWNO, jasnosc); ctx.lineWidth = g;
  ctx.stroke();
  if (z >= 9) {
    ctx.strokeStyle = barwa(DREWNO, jasnosc * 1.32, 0.55); ctx.lineWidth = Math.max(0.6, g * 0.3);
    ctx.beginPath(); ctx.moveTo(a[0] - g * 0.18, a[1] - g * 0.18); ctx.lineTo(b[0] - g * 0.18, b[1] - g * 0.18); ctx.stroke();
  }
}

/** Wiązanie liną na złączu belek: kilka zwojów. */
function wiazanie(ctx: CanvasRenderingContext2D, p: Pkt, z: number): void {
  if (z < 7) return;
  ctx.strokeStyle = barwa(LINA, 0.78); ctx.lineWidth = Math.max(0.8, z * 0.035);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(p[0] - z * 0.09, p[1] + i * z * 0.05 - z * 0.03); ctx.lineTo(p[0] + z * 0.09, p[1] + i * z * 0.05 + z * 0.03); ctx.stroke();
  }
}

/** Lina: ciemny obrys i konopna barwa. */
function lina(ctx: CanvasRenderingContext2D, pts: Pkt[], z: number): void {
  if (pts.length < 2) return;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = 'rgba(30,18,10,0.7)'; ctx.lineWidth = Math.max(1.6, z * 0.07); ctx.stroke();
  ctx.strokeStyle = barwa(LINA, 1); ctx.lineWidth = Math.max(0.9, z * 0.038); ctx.stroke();
}

/** Czy wylot odcinka jest wykuty (kołowrót stoi nad otworem, drabina wystaje nad posadzkę). */
function wylotOtwarty(sim: Sim, o: Prost, sp: Spirala): boolean {
  const w = sim.world, y = Math.floor(sp.ys);
  for (let x = o.x0; x <= o.x1; x++) if (!w.passable(x, y)) return false;
  return true;
}

/** Kołowrót nad wylotem odcinka: słup z prawej, wysięgnik do bloku nad środkiem szybu, wał z korbą na słupie. */
interface Kolowrot { slup: number; podloga: number; gora: number; blokX: number; blokY: number; walX: number; walY: number }
function kolowrot(sim: Sim, o: Prost, sp: Spirala): Kolowrot {
  const w = sim.world;
  const podloga = sp.ys;
  let wolne = 0;
  for (let y = Math.floor(podloga) - 1; y >= 0 && wolne < 6 && w.passable(Math.floor(sp.c), y) && w.passable(o.x1 + 1, y); y--) wolne++;
  const hK = Math.max(1.4, Math.min(3, wolne - 0.35));
  const slup = o.x1 + 1.35;
  return { slup, podloga, gora: podloga - hK, blokX: sp.c, blokY: podloga - hK + 0.24, walX: slup + 0.38, walY: podloga - 0.9 };
}

/** Przycina rysunek do wnętrza szybu (wykute kafle odcinka w kadrze) i do przestrzeni nad wylotem. */
function przytnijDoSzybu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, o: Prost, sp: Spirala, gora: number, dol: number): void {
  const w = sim.world, z = cam.zoom;
  const p = new Path2D();
  const y0 = Math.max(Math.floor(sp.ys) - 2, Math.floor(gora)), y1 = Math.min(o.y1, Math.ceil(dol));
  for (let y = y0; y <= y1; y++) {
    let x = o.x0;
    while (x <= o.x1) {
      if (!w.passable(x, y)) { x++; continue; }
      let x2 = x;
      while (x2 + 1 <= o.x1 && w.passable(x2 + 1, y)) x2++;
      p.rect(cam.toScreenX(x), cam.toScreenY(y), (x2 - x + 1) * z + 0.5, z + 0.5);
      x = x2 + 1;
    }
  }
  ctx.clip(p);
}

/**
 * Drabina o tylną ścianę: dwie żerdzie, szczeble co `szczebel`, odcinki po ~6 kafli wiązane liną (złącza lekko
 * przesunięte — tak się je nadstawia). Od `y0` (nad posadzką przy wylocie) do `y1` (dno wykopu albo pomost).
 */
function rysujDrabine(ctx: CanvasRenderingContext2D, cam: Camera, sp: Spirala, y0: number, y1: number, z: number, gora: number, dol: number): void {
  if (y1 - y0 < 0.3) return;
  const d = pozycjaDrabiny(sp);
  const off = -S.ukos * d.glebia;
  const ya = Math.max(y0, gora - 1), yb = Math.min(y1, dol + 1);
  if (yb <= ya) return;
  const pol = 0.3;
  const X = (dx: number) => cam.toScreenX(d.x + dx), Y = (y: number) => cam.toScreenY(y + off);
  // szczeble (za żerdziami)
  const krok = B.szczebel;
  const pierwszy = y0 + 0.22 + Math.ceil((ya - y0 - 0.22) / krok) * krok;
  for (let y = pierwszy; y <= yb - 0.08; y += krok) {
    belka(ctx, [X(-pol), Y(y)], [X(pol), Y(y)], 0.06, z, 0.92);
  }
  // żerdzie w odcinkach (co ~6 kafli złącze: nadstawka zachodzi na poprzednią i jest związana)
  const odc = 6;
  for (let s0 = y0; s0 < y1; s0 += odc) {
    const s1 = Math.min(y1, s0 + odc + 0.35);
    if (s1 < ya || s0 > yb) continue;
    const przes = (Math.round((s0 - y0) / odc) % 2) * 0.035;
    for (const bok of [-1, 1]) {
      const x = X(bok * (pol + przes));
      belka(ctx, [x, Y(Math.max(s0, ya))], [x, Y(Math.min(s1, yb))], 0.085, z, 1);
      if (s0 > y0 && s0 >= ya && s0 <= yb) { wiazanie(ctx, [x, Y(s0 + 0.12)], z); wiazanie(ctx, [x, Y(s0 + 0.3)], z); }
    }
  }
}

/**
 * Rusztowanie nad najwyższym stopniem: cztery stojaki przy ścianie (dwa z tyłu, dwa z przodu), na każdym poziomie
 * pomostu rygle dookoła, z tyłu pomost z desek, między tylnymi stojakami zastrzały na krzyż. `czesc` — „tyl” (za
 * drabiną) albo „przod” (przed nią). `yP` — najniższy pomost (sim/budowa-schodow.ts: pomostNadSchodami).
 */
function rysujRusztowanie(ctx: CanvasRenderingContext2D, cam: Camera, sp: Spirala, yTop: number, yP: number, z: number, czesc: 'tyl' | 'przod'): void {
  const r = sp.R - 0.2;
  const yGora = yP - B.rusztowanie;
  const yStopa = Math.min(yTop + 0.25, yP + 2.4);
  const tyl = [-0.95, 0.95], przod = [-2.3, 2.3];
  const poziomy: number[] = [];
  for (let y = yP; y >= yGora + 0.4; y -= B.pomost) poziomy.push(y);
  if (czesc === 'tyl') {
    // stojaki z tyłu
    for (const f of tyl) belka(ctx, rzut(cam, sp, f, r, yStopa), rzut(cam, sp, f, r, yGora), 0.13, z, 0.82);
    for (let i = 0; i < poziomy.length; i++) {
      const y = poziomy[i];
      // zastrzały na krzyż między tylnymi stojakami (pod pomostem)
      const yn = i + 1 < poziomy.length ? poziomy[i + 1] : yGora;
      belka(ctx, rzut(cam, sp, tyl[0], r, y), rzut(cam, sp, tyl[1], r, yn + 0.15), 0.06, z, 0.7);
      belka(ctx, rzut(cam, sp, tyl[1], r, y), rzut(cam, sp, tyl[0], r, yn + 0.15), 0.06, z, 0.7);
      // pomost z desek między ścianą a tylnymi stojakami — widać z wierzchu (lekko z góry) i krawędź desek
      const a = rzut(cam, sp, tyl[0], r, y), b = rzut(cam, sp, tyl[1], r, y);
      const aw = rzut(cam, sp, -0.6, sp.R - 0.05, y), bw = rzut(cam, sp, 0.6, sp.R - 0.05, y);
      ctx.fillStyle = barwa(DREWNO, 1.1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(aw[0], aw[1]); ctx.lineTo(bw[0], bw[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
      if (z >= 9) {
        ctx.strokeStyle = 'rgba(40,26,16,0.45)'; ctx.lineWidth = Math.max(0.6, z * 0.025);
        for (let t = 1; t < 6; t++) {
          const u = t / 6;
          const p0: Pkt = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], p1: Pkt = [aw[0] + (bw[0] - aw[0]) * u, aw[1] + (bw[1] - aw[1]) * u];
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        }
      }
      ctx.fillStyle = barwa(DREWNO, 0.72);
      ctx.fillRect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), Math.max(1.5, z * 0.11));
      belka(ctx, a, b, 0.09, z, 0.9);
      wiazanie(ctx, a, z); wiazanie(ctx, b, z);
    }
    return;
  }
  // z przodu: rygle po bokach (od tylnego do przedniego stojaka) i z przodu, potem przednie stojaki
  for (const y of poziomy) {
    belka(ctx, rzut(cam, sp, tyl[0], r, y), rzut(cam, sp, przod[0], r, y), 0.08, z, 0.95);
    belka(ctx, rzut(cam, sp, tyl[1], r, y), rzut(cam, sp, przod[1], r, y), 0.08, z, 0.95);
    belka(ctx, rzut(cam, sp, przod[0], r, y), rzut(cam, sp, przod[1], r, y), 0.08, z, 1.02);
  }
  for (const f of przod) belka(ctx, rzut(cam, sp, f, r, yStopa), rzut(cam, sp, f, r, yGora), 0.13, z, 1.05);
  for (const y of poziomy) for (const f of przod) wiazanie(ctx, rzut(cam, sp, f, r, y), z);
}

/** Wał kołowrotu (z boku: koło z nawiniętą liną) z korbą — kąt korby `kat`. */
function rysujKolowrot(ctx: CanvasRenderingContext2D, cam: Camera, k: Kolowrot, kat: number, z: number): void {
  const X = (x: number) => cam.toScreenX(x), Y = (y: number) => cam.toScreenY(y);
  // słup na posadzce, wysięgnik nad szyb, zastrzał pod wysięgnikiem, podpora z boku
  belka(ctx, [X(k.slup), Y(k.podloga)], [X(k.slup), Y(k.gora)], 0.17, z, 0.95);
  belka(ctx, [X(k.slup + 0.35), Y(k.gora + 0.08)], [X(k.blokX - 0.25), Y(k.gora + 0.08)], 0.15, z, 1);
  belka(ctx, [X(k.slup), Y(k.gora + 0.85)], [X(k.slup - 0.75), Y(k.gora + 0.1)], 0.08, z, 0.85);
  belka(ctx, [X(k.slup + 0.75), Y(k.podloga)], [X(k.slup), Y(k.podloga - 1.05)], 0.08, z, 0.8);
  wiazanie(ctx, [X(k.slup), Y(k.gora + 0.1)], z);
  // blok na końcu wysięgnika
  const bx = X(k.blokX), by = Y(k.blokY);
  ctx.fillStyle = barwa(DREWNO, 0.8); ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.04);
  ctx.beginPath(); ctx.arc(bx, by, Math.max(2, z * 0.16), 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(bx, by, Math.max(1, z * 0.05), 0, TAU); ctx.fill();
  // wał z nawiniętą liną
  const wx = X(k.walX), wy = Y(k.walY), R = Math.max(3, z * 0.26);
  ctx.fillStyle = barwa(DREWNO, 0.72); ctx.beginPath(); ctx.arc(wx, wy, R, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = barwa(LINA, 0.9); ctx.lineWidth = Math.max(0.8, z * 0.035);
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(wx, wy, R * (0.55 + 0.15 * i), kat * 0.5 + i, kat * 0.5 + i + 4.4); ctx.stroke(); }
  // ramię korby i rączka (od strony tego, kto kręci — z prawej)
  const rk = R * 1.45;
  const hx = wx + Math.cos(kat) * rk * 0.35 + R * 0.5, hy = wy + Math.sin(kat) * rk;
  belka(ctx, [wx, wy], [hx, hy], 0.06, z, 0.95);
  ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(wx, wy, Math.max(1.2, z * 0.06), 0, TAU); ctx.fill();
  belka(ctx, [hx, hy], [hx + Math.max(2, z * 0.22), hy], 0.07, z, 1.1);
}

/** Kubeł z urobkiem (z boku): klepki, obręcze, kabłąk do haka; pełny — z kamieniami na wierzchu. */
function rysujKubel(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, pelny: boolean, przechyl: number): void {
  const w = z * 0.52, h = z * 0.5;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(przechyl);
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.04);
  ctx.beginPath(); ctx.moveTo(-w * 0.5, 0); ctx.lineTo(w * 0.5, 0); ctx.lineTo(w * 0.42, h); ctx.lineTo(-w * 0.42, h); ctx.closePath();
  ctx.fillStyle = barwa(DREWNO, 0.95); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = ZELAZO; ctx.lineWidth = Math.max(0.8, z * 0.045);
  for (const t of [0.22, 0.78]) { ctx.beginPath(); ctx.moveTo(-w * (0.5 - 0.08 * t), h * t); ctx.lineTo(w * (0.5 - 0.08 * t), h * t); ctx.stroke(); }
  if (pelny) {
    ctx.fillStyle = 'rgba(92,84,76,1)';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-w * 0.32 + i * w * 0.21, -h * 0.04, Math.max(1, z * (0.07 + 0.03 * (i % 2))), 0, TAU); ctx.fill(); }
  }
  // kabłąk
  ctx.strokeStyle = ZELAZO; ctx.lineWidth = Math.max(0.8, z * 0.035);
  ctx.beginPath(); ctx.arc(0, 0, w * 0.5, Math.PI, 0); ctx.stroke();
  ctx.restore();
}

/** Hałda urobku przy kołowrocie (wielkość 0..1) i — przy budowie — stos ciosanych stopni (ile zostało). */
function rysujHalde(ctx: CanvasRenderingContext2D, cam: Camera, k: Kolowrot, wielkosc: number, stopni: number, z: number): void {
  const X = (x: number) => cam.toScreenX(x), Y = (y: number) => cam.toScreenY(y);
  const x0 = k.slup + 2.6, R = 0.5 + 1.1 * wielkosc, H = 0.25 + 0.75 * wielkosc;
  if (wielkosc > 0.02) {
    ctx.fillStyle = 'rgba(78,70,62,1)'; ctx.strokeStyle = 'rgba(24,18,14,0.7)'; ctx.lineWidth = Math.max(0.8, z * 0.035);
    ctx.beginPath(); ctx.moveTo(X(x0 + 0.6 - R), Y(k.podloga));
    ctx.quadraticCurveTo(X(x0 + 0.6), Y(k.podloga - H * 2), X(x0 + 0.6 + R), Y(k.podloga));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // grudy kamienia na zboczach
    ctx.fillStyle = 'rgba(112,104,94,1)';
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7, gx = x0 + 0.6 - R + 2 * R * t, gy = k.podloga - H * 2 * 4 * t * (1 - t) * 0.5 - 0.06;
      ctx.beginPath(); ctx.arc(X(gx), Y(gy), Math.max(1, z * (0.06 + 0.04 * ((i * 7) % 3) / 2)), 0, TAU); ctx.fill();
    }
  }
  // stos ciosanych stopni obok hałdy (przy budowie)
  const ile = Math.min(5, Math.ceil(stopni / 30));
  for (let i = 0; i < ile; i++) {
    const bx = x0 + 0.6 + R + 0.25 + (i % 2) * 0.12, by = k.podloga - 0.24 * (i + 1);
    ctx.fillStyle = 'rgba(150,138,118,1)'; ctx.strokeStyle = 'rgba(30,22,16,0.7)'; ctx.lineWidth = Math.max(0.8, z * 0.03);
    ctx.fillRect(X(bx), Y(by), 0.95 * z, 0.22 * z); ctx.strokeRect(X(bx), Y(by), 0.95 * z, 0.22 * z);
  }
}

/** Gładkie przejście 0..1. */
const gladko = (t: number): number => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

/** Budowa schodów we wszystkich odcinkach szybu drogi wiernych (przed mrokiem, po schodach). */
export function rysujBudoweSchodow(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world;
  if (!w.odcinkiDrogi.length) return;
  const st = stanSchodow(sim);
  const gora = cam.toWorldY(0) - 4, dol = cam.toWorldY(cam.vh) + 4;
  const lewa = cam.toWorldX(0) - 6, prawa = cam.toWorldX(cam.vw) + 6;
  const z = cam.zoom;
  w.odcinkiDrogi.forEach((o, n) => {
    const b = st.odcinki[n];
    if (!b || b.etap === 'gotowe') return;
    if (o.x1 + 7 < lewa || o.x0 - 2 > prawa || o.y1 + 1 < gora || o.y0 - 5 > dol) return;
    const sp = spirala(sim, o);
    if (!wylotOtwarty(sim, o, sp)) return;
    const budowa = b.etap === 'budowa' && b.stopni > 0;
    const yTop = wysokoscSzczytu(sim, n);
    const yDol = dolDrabiny(sim, n);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // w szybie: rusztowanie (tył), drabina, rusztowanie (przód)
    ctx.save();
    przytnijDoSzybu(ctx, sim, cam, o, sp, gora, dol);
    const yP = budowa ? pomostNadSchodami(sim, n) : 0;
    if (budowa) rysujRusztowanie(ctx, cam, sp, yTop, yP, z, 'tyl');
    rysujDrabine(ctx, cam, sp, sp.ys - 1.6, yDol, z, gora, dol);
    if (budowa) rysujRusztowanie(ctx, cam, sp, yTop, yP, z, 'przod');
    ctx.restore();
    // nad wylotem: hałda, ładunek na linie, kołowrót
    const k = kolowrot(sim, o, sp);
    const zaglebienie = Math.max(0, Math.min(1, (yDol - sp.ys) / Math.max(1, sp.ye - sp.ys)));
    rysujHalde(ctx, cam, k, b.etap === 'budowa' ? 1 : zaglebienie, b.etap === 'budowa' ? Math.max(0, szczytSchodow(sim, n)) : 0, z);
    rysujLadunek(ctx, sim, cam, o, n, sp, k, b, yDol, z);
    const kat = b.kreci ? teraz * 0.0042 : 0.6;
    rysujKolowrot(ctx, cam, k, kat, z);
    ctx.restore();
  });
}

/** Paleta (deska na płozach) z ciosanymi stopniami — `ile` kamieni, jeden na drugim; `zawieszona` — z linkami do haka. */
function rysujPalete(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, ile: number, zawieszona: boolean): Pkt {
  const w = z * 1.15, d = Math.max(2, z * 0.12);
  // kamienie (płyty stopni widziane z boku), od dołu
  for (let i = 0; i < ile; i++) {
    const by = y - d - (i + 1) * z * 0.21, bx = x - z * 0.48 + (i % 2) * z * 0.06;
    ctx.fillStyle = `rgba(${146 - i * 4},${134 - i * 4},${114 - i * 4},1)`; ctx.fillRect(bx, by, z * 0.92, z * 0.2);
    ctx.fillStyle = 'rgba(232,220,196,0.35)'; ctx.fillRect(bx, by, z * 0.92, Math.max(1, z * 0.04));
    ctx.strokeStyle = 'rgba(30,22,16,0.7)'; ctx.lineWidth = Math.max(0.7, z * 0.03); ctx.strokeRect(bx, by, z * 0.92, z * 0.2);
  }
  // deska
  ctx.fillStyle = barwa(DREWNO, 0.95); ctx.fillRect(x - w / 2, y - d, w, d);
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.8, z * 0.035); ctx.strokeRect(x - w / 2, y - d, w, d);
  const hak: Pkt = [x, y - d - Math.max(1, ile) * z * 0.21 - z * 0.55];
  if (zawieszona) {
    lina(ctx, [[x - w / 2 + z * 0.06, y - d], hak, [x + w / 2 - z * 0.06, y - d]], z);
    ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(hak[0], hak[1], Math.max(1.2, z * 0.06), 0, TAU); ctx.fill();
  }
  return hak;
}

/** Ile ciosanych stopni zjeżdża naraz na jednej palecie. */
const NA_PALECIE = 4;

/**
 * Lina z bloku w dół i to, co na niej wisi. Przy kopaniu — kubeł urobku (kurs z sim: w dół pusty, chwila na dnie,
 * w górę pełny, u góry przechyla się nad hałdą). Przy budowie — ciosany stopień: zjeżdża nad słup, siada na swoim
 * miejscu (postęp stopnia z sim), potem hak wraca w górę.
 */
function rysujLadunek(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, o: Prost, n: number, sp: Spirala, k: Kolowrot, b: BudowaOdcinka, yDol: number, z: number): void {
  const X = (x: number) => cam.toScreenX(x), Y = (y: number) => cam.toScreenY(y);
  const blok: Pkt = [X(k.blokX), Y(k.blokY)];
  // od wału do bloku
  lina(ctx, [[X(k.walX - 0.2), Y(k.walY - 0.2)], [blok[0] + z * 0.12, blok[1] - z * 0.1]], z);
  if (b.etap === 'kopanie') {
    const f = b.kubel;
    const yG = k.blokY + 0.55, yD = yDol - 0.52;
    let y = yG, pelny = false, przechyl = 0;
    if (f < 0.42) y = yG + (yD - yG) * gladko(f / 0.42);
    else if (f < 0.5) { y = yD; pelny = f > 0.46; }
    else if (f < 0.92) { y = yD + (yG - yD) * gladko((f - 0.5) / 0.42); pelny = true; }
    else { y = yG; przechyl = Math.sin(((f - 0.92) / 0.08) * Math.PI) * 0.9; pelny = f < 0.96; }
    lina(ctx, [blok, [X(k.blokX), Y(y - 0.32)]], z);
    rysujKubel(ctx, X(k.blokX), Y(y - 0.3), z, pelny, przechyl);
    return;
  }
  // budowa: kołowrót opuszcza paletę z NA_PALECIE ciosanymi stopniami — powoli, przez drugą połowę osadzania
  // poprzedniej palety — i stawia ją na pomoście rusztowania; murarze biorą z niej kamienie po kolei, a pusty hak wraca
  // w górę po następną (kurs liczy się z postępu budowy: sim/budowa-schodow.ts)
  const kN = szczytSchodow(sim, n) - 1;
  if (kN < 0) return;
  const p = b.postep;
  const g = ((b.stopni % NA_PALECIE) + p) / NA_PALECIE;
  const yP = pomostNadSchodami(sim, n);
  const pal = { x: sp.c + 0.85, y: yP - S.ukos * 1.6 };
  // na pomoście: paleta z kamieniami, których jeszcze nie wzięto (bieżący bierze się na początku jego osadzania)
  const zostalo = NA_PALECIE - (b.stopni % NA_PALECIE) - (p > 0.05 ? 1 : 0);
  if (zostalo > 0 || p > 0.05) rysujPalete(ctx, X(pal.x), Y(pal.y), z, Math.max(0, zostalo), false);
  // kamień w rękach murarzy: z palety na swoje miejsce, potem siada na zaprawie
  const zacz = zaczepStopnia(sim, o, kN);
  const t = gladko(p / 0.6);
  const dx = (pal.x - zacz.x) * (1 - t), dy = (pal.y - 0.35 - zacz.y) * (1 - t) - 0.18 * Math.sin(Math.min(1, p / 0.6) * Math.PI);
  rysujKamienStopnia(ctx, sim, cam, o, kN, dx, dy);
  // lina i hak: w górę pusty, chwila u góry (ładują), w dół z pełną paletą
  const yG = k.blokY + 0.5, yD = pal.y - 0.05;
  if (g < 0.25) {
    const yh = yD - 0.9 + (yG - (yD - 0.9)) * gladko(g / 0.25);
    lina(ctx, [blok, [X(k.blokX), Y(yh)]], z);
    ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(X(k.blokX), Y(yh), Math.max(1.2, z * 0.06), 0, TAU); ctx.fill();
  } else if (g < 0.5) {
    lina(ctx, [blok, [X(k.blokX), Y(yG)]], z);
    ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(X(k.blokX), Y(yG), Math.max(1.2, z * 0.06), 0, TAU); ctx.fill();
  } else {
    // pełna paleta zjeżdża (pod blokiem, potem w bok nad pomost — linę odciąga murarz)
    const u = gladko((g - 0.5) / 0.5);
    const py = yG + 1.1 + (yD - 0.15 - (yG + 1.1)) * u, px = k.blokX + (pal.x - k.blokX) * gladko((u - 0.75) / 0.25);
    const hak = rysujPalete(ctx, X(px), Y(py), z, NA_PALECIE, true);
    lina(ctx, [blok, hak], z);
  }
}
