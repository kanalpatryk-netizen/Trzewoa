import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Creature } from '../sim/creatures';
import { makeCreature } from '../sim/creatures';
import { Race } from '../sim/races';
import { klanLudu } from '../sim/lud';
import { ANIOL } from '../nastawy/aniol';
import { ustawienia } from '../core/settings-store';
import { rysujKlatke, chwyt, KAFLE_NA_JEDN } from './dlon';
import { rysujPostac } from './figury';
import { srodekAmpulki, type Plate } from './plate';
import arkuszUrl from '../grafiki/dlon/dlon-anielska.webp';

/**
 * DŁOŃ ANIELSKA (Alpha, etap 4; logika: src/sim/aniol.ts). Z górnego brzegu płyty, przez skałę, sączy się słup złotego
 * światła z pyłem; w nim schodzi jasna dłoń palcami w dół — klatki z tego samego modelu 3D co dłoń z otchłani
 * (scripts/dlon/, wersja anielska), ze złotą poświatą. Gest zależy od daru:
 *  - podkop: opuszki dotykają skały i suną po drodze wiernych, a każdy kafel pęka pod nimi w złotym błysku;
 *  - dar ludzi: w złożonej dłoni siedzi nowy robotnik; dłoń opuszcza go na podłogę, otwiera się, rozbłysk — stoi;
 *  - dar krwi: dłoń otwiera się nad ołtarzem, a z niej struga krwi płynie łukiem do ampułki relikwiarza pod płytą
 *    (rysujStrugeKrwi — na wierzchu ekranu).
 * Potem dłoń wraca w światło, a słup gaśnie. Rysowane po postaciach.
 */

const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

let arkusz: HTMLImageElement | null = null;
function obraz(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!arkusz) { arkusz = new Image(); arkusz.src = arkuszUrl; }
  return arkusz.complete && arkusz.naturalWidth > 0 ? arkusz : null;
}
obraz();

type Pkt = { x: number; y: number };
/** Czubki palców (opuszki) w otwartej dłoni — jednostki modelu (krótkie paznokcie zamiast szponów). */
const OPUSZKI = { x: 23.5, y: -3.2 };

/** Klatka dłoni anielskiej ze złotą poświatą (atlas: rycina „Dłoń anielska”). */
export function rysujKlatkeAnielska(ctx: CanvasRenderingContext2D, sx: number, sy: number, kat: number, skala: number, zacisk: number, lustro: number, alfa: number): boolean {
  const o = obraz();
  return !!o && rysujKlatke(ctx, o, sx, sy, kat, skala, zacisk, lustro, alfa, 'rgba(255,214,120,0.9)');
}

/** Gdzie na płycie (piksele, układ płyty) jest teraz wnętrze dłoni — stąd płynie struga krwi (rysujStrugeKrwi). */
let dlonNaPlycie: Pkt | null = null;
/** Robotnik w dłoni (dar ludzi) — atrapa do rysunku, z numerem, który dostanie (ta sama twarz, gdy stanie). */
let wDloni: Creature | null = null;

/** Słup światła z góry do (x, y) na płycie, `a` — jasność. Pył opada w nim powoli. */
function slup(ctx: CanvasRenderingContext2D, x: number, y: number, szer: number, a: number, teraz: number, ruch: boolean): void {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x - szer, 0, x + szer, 0);
  g.addColorStop(0, 'rgba(255,220,140,0)'); g.addColorStop(0.5, `rgba(255,232,170,${0.32 * a})`); g.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - szer * 0.7, 0); ctx.lineTo(x + szer * 0.7, 0); ctx.lineTo(x + szer, y); ctx.lineTo(x - szer, y); ctx.closePath(); ctx.fill();
  // u dołu rozlewa się poświata
  const r = szer * 2.2;
  const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
  g2.addColorStop(0, `rgba(255,236,180,${0.45 * a})`); g2.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = g2; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  for (let i = 0; i < 18; i++) {
    const px = x + (los(i * 7) - 0.5) * szer * 1.4, f = ruch ? ((teraz * 0.00005 * (0.6 + los(i))) + los(i * 3)) % 1 : los(i * 3);
    const py = f * y;
    ctx.fillStyle = `rgba(255,244,210,${0.7 * a * Math.sin(f * Math.PI)})`;
    ctx.beginPath(); ctx.arc(px + Math.sin(f * 9 + i) * szer * 0.08, py, Math.max(0.8, szer * 0.025), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Złoty błysk (rozbłysk z promieniami) w (x, y), `u` 0..1. */
function blysk(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, u: number): void {
  if (u < 0 || u > 1) return;
  const a = 1 - u, R = z * (0.6 + 2 * gladko(u * 2));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,248,220,${0.9 * a})`); g.addColorStop(0.4, `rgba(255,214,120,${0.4 * a})`); g.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.strokeStyle = `rgba(255,246,214,${0.9 * a})`; ctx.lineWidth = Math.max(1, z * 0.06); ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const k = (i / 8) * Math.PI * 2, r0 = z * (0.3 + u), r1 = r0 + z * (i % 2 ? 0.4 : 0.8) * a;
    ctx.moveTo(x + Math.cos(k) * r0, y + Math.sin(k) * r0); ctx.lineTo(x + Math.cos(k) * r1, y + Math.sin(k) * r1);
  }
  ctx.stroke();
  ctx.restore();
}

/** Dłoń anielska i jej słup światła (warstwa świata, po postaciach). */
export function rysujAniola(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  dlonNaPlycie = null;
  const s = sim.lud.aniol;
  if (!ANIOL.wlaczona || !s || s.faza === 'brak' || !s.dar) return;
  const z = cam.zoom;
  const ruch = !ustawienia.ograniczRuch;
  const t = sim.tick - s.od;
  const D = ANIOL;
  // gdzie: opuszki na kruszonym kaflu (podkop), dłoń z robotnikiem tuż nad podłogą, otwarta dłoń nad ołtarzem
  const cel: Pkt = s.dar === 'podkop' ? { x: s.x + 0.5, y: s.y + 0.3 } : s.dar === 'ludzie' ? { x: s.x + 0.5, y: s.y + 0.55 } : { x: s.x + 0.5, y: s.y };
  // jasność słupa: rozpala się, trwa, gaśnie razem z powrotem dłoni
  const jasnosc = s.faza === 'swiatlo' ? gladko(t / D.swiatlo) : s.faza === 'wraca' ? 1 - gladko(t / D.wraca) : 1;
  slup(ctx, cam.toScreenX(cel.x), cam.toScreenY(cel.y + 0.6), D.swiatloSzer * z, jasnosc, teraz, ruch);
  if (s.faza === 'swiatlo') return;
  // palce w dół, lekko przechylone; lustro — z której strony kciuk
  const lustro = s.od % 2 ? 1 : -1;
  const pochyl = lustro * 0.14;
  const dx = Math.sin(pochyl), dy = Math.cos(pochyl);
  const k = KAFLE_NA_JEDN * D.wielkosc;
  const doSwiata = (w: Pkt, mx: number, my: number): Pkt => ({ x: w.x + (mx * dx + my * lustro * dy) * k, y: w.y + (mx * dy - my * lustro * dx) * k });
  // zacisk i punkt dłoni, który trafia w cel: opuszki (podkop), złożona dłoń (ludzie), wnętrze otwartej dłoni (krew)
  let zacisk = 0.04;
  if (s.dar === 'ludzie') zacisk = s.faza === 'dar' ? 0.42 - 0.38 * gladko((t - D.dar * 0.5) / (D.dar * 0.2)) : s.faza === 'wraca' ? 0.04 : 0.42;
  if (s.dar === 'podkop' && s.faza === 'dar') zacisk = 0.04 + 0.06 * Math.abs(Math.sin(t * 0.08));
  const punkt = s.dar === 'podkop' ? OPUSZKI : chwyt(zacisk);
  const p0 = doSwiata({ x: 0, y: 0 }, punkt.x, punkt.y);
  const nadgarstek: Pkt = { x: cel.x - p0.x, y: cel.y - p0.y };
  const wysoko = 16;
  let w: Pkt, alfa = 1;
  if (s.faza === 'schodzi') {
    const u = gladko(t / D.schodzi);
    w = { x: nadgarstek.x - dx * wysoko * (1 - u), y: nadgarstek.y - dy * wysoko * (1 - u) };
    alfa = gladko(t / 60);
  } else if (s.faza === 'dar') {
    // podkop: drga przy każdym kaflu; ludzie: opuszcza robotnika o pół kafla; krew: lekko się kołysze
    const drg = s.dar === 'podkop' && ruch ? Math.sin(t * 0.5) * 0.06 : 0;
    const nizej = s.dar === 'ludzie' ? 0.35 * gladko(t / (D.dar * 0.5)) : 0;
    const kolys = s.dar === 'krew' && ruch ? Math.sin(t * 0.03) * 0.08 : 0;
    w = { x: nadgarstek.x + drg + kolys, y: nadgarstek.y + nizej + Math.abs(drg) };
  } else {
    const u = gladko(t / D.wraca);
    w = { x: nadgarstek.x - dx * wysoko * u, y: nadgarstek.y - dy * wysoko * u };
    alfa = 1 - gladko((u - 0.55) / 0.45);
  }
  const kat = Math.atan2(dy, dx);
  const skala = z * k;
  const sx = cam.toScreenX(w.x), sy = cam.toScreenY(w.y);
  // poświata wokół dłoni (przenika skałę — świeci przez nią)
  const srodek = doSwiata(w, 14, -3);
  const gx = cam.toScreenX(srodek.x), gy = cam.toScreenY(srodek.y);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = skala * 22;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
  g.addColorStop(0, `rgba(255,226,150,${0.35 * alfa})`); g.addColorStop(1, 'rgba(255,210,130,0)');
  ctx.fillStyle = g; ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
  ctx.restore();
  const o = obraz();
  if (o) rysujKlatke(ctx, o, sx, sy, kat, skala, zacisk, lustro, alfa, 'rgba(255,214,120,0.9)');
  // robotnik w dłoni — trzymają go złożone palce (przed dłonią, żeby go było widać), aż dłoń go postawi
  if (s.dar === 'ludzie' && s.nowy === undefined && s.faza !== 'wraca') {
    const klan = klanLudu(sim);
    if (klan && (!wDloni || wDloni.id !== sim.nextId)) {
      wDloni = makeCreature(Race.GOBLIN, klan.id, 0, 0, sim.nextId);
      wDloni.rola = 'robotnik';
    }
    if (wDloni) {
      const dl = doSwiata(w, chwyt(zacisk).x, chwyt(zacisk).y);
      ctx.save();
      ctx.globalAlpha *= alfa;
      ctx.translate(cam.toScreenX(dl.x), cam.toScreenY(dl.y + 0.45));
      ctx.scale(lustro, 1);
      rysujPostac(ctx, sim, wDloni, Math.max(16, z * 1.9 * ustawienia.wielkoscSylwetek), teraz, 'stoi');
      ctx.restore();
    }
  }
  // gest i jego skutek
  if (s.faza === 'dar') {
    if (s.dar === 'podkop') {
      // pod opuszkami pęka kafel: złote światło i iskry przy każdym wykruszonym
      const krok = (D.dar * 0.75) / Math.max(1, s.kafle?.length ?? 1);
      const u = ((t - D.dar * 0.2) % krok) / krok;
      if (t > D.dar * 0.2) blysk(ctx, cam.toScreenX(s.x + 0.5), cam.toScreenY(s.y + 0.5), z * 0.7, u);
    } else if (s.dar === 'ludzie' && s.nowy !== undefined) {
      const c = sim.creatureById(s.nowy);
      if (c) blysk(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y + 0.2), z, (t - D.dar * 0.55) / (D.dar * 0.4));
    } else if (s.dar === 'krew') {
      const dl = doSwiata(w, chwyt(zacisk).x, chwyt(zacisk).y);
      dlonNaPlycie = { x: cam.toScreenX(dl.x), y: cam.toScreenY(dl.y) };
    }
  }
}

/**
 * Dar krwi: struga z wnętrza dłoni anielskiej łukiem do ampułki relikwiarza (na wierzchu ekranu, po płycie i ramie).
 * Krew płynie (przesuwające się pasma), na końcu kapie; przy ampułce rozbryzg.
 */
export function rysujStrugeKrwi(ctx: CanvasRenderingContext2D, sim: Sim, plate: Plate, vh: number, teraz: number): void {
  const s = sim.lud.aniol;
  if (!s || s.dar !== 'krew' || s.faza !== 'dar' || !dlonNaPlycie) return;
  const t = sim.tick - s.od;
  const plynie = 1 - gladko((t - ANIOL.dar * 0.8) / (ANIOL.dar * 0.15));
  const narasta = gladko(t / 40);
  if (plynie <= 0.01) return;
  const a = { x: plate.x + dlonNaPlycie.x, y: plate.y + dlonNaPlycie.y };
  const b = srodekAmpulki(plate, vh);
  // łuk: najpierw w dół z dłoni, potem nad ramą płyty do relikwiarza
  const c = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 40 };
  const ruch = !ustawienia.ograniczRuch;
  const gr = Math.max(2.5, plate.w * 0.004) * narasta;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(70,6,6,${0.9 * plynie})`; ctx.lineWidth = gr + 2;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.stroke();
  ctx.strokeStyle = `rgba(176,20,18,${0.95 * plynie})`; ctx.lineWidth = gr;
  ctx.stroke();
  // pasma płynącej krwi
  ctx.setLineDash([gr * 2, gr * 3]);
  ctx.lineDashOffset = ruch ? -teraz * 0.12 : 0;
  ctx.strokeStyle = `rgba(255,120,100,${0.6 * plynie})`; ctx.lineWidth = Math.max(1, gr * 0.35);
  ctx.stroke();
  ctx.setLineDash([]);
  // kropla na początku (wzbiera w dłoni) i rozbryzg w ampułce
  ctx.fillStyle = `rgba(150,14,14,${plynie})`;
  ctx.beginPath(); ctx.arc(a.x, a.y, gr * 1.3, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const k = (los(i * 9) - 0.5) * Math.PI, f = ruch ? (teraz * 0.004 + los(i)) % 1 : 0.5;
    ctx.fillStyle = `rgba(200,30,24,${0.8 * (1 - f) * plynie})`;
    ctx.beginPath(); ctx.arc(b.x + Math.sin(k) * f * 10, b.y - Math.cos(k) * f * 8, Math.max(1, gr * 0.45), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
