/**
 * KRĄG TRZECI — świat dookoła trzewi (beta, 2. podejście po uwagach użytkownika: „gdzie każdy potępiony, czemu nie
 * jest to w formie żadnego kręgu… Cerber w Boskiej Komedii nie był w żadnym lochu zamknięty”):
 *  - LEJ: nad powierzchnią widać wnętrze leja piekła — tarasy wyższych kręgów jak rzędy amfiteatru (II — wicher
 *    zmysłowych, I — Otchłań z blaskiem zamku), a po prawej krawędź naszego tarasu i przepaść do kręgu czwartego;
 *  - TŁUM: cały taras trzeciego kręgu zalegają żarłocy — leżą twarzą w błocie, siedzą skuleni, czołgają się, wyją;
 *  - CERBER krąży po kręgu (sim/krag.ts: cerberNaPowierzchni) i szarpie potępionych;
 *  - TRZEWIA: w ścianach wykutych korytarzy tkwią wciągani przez ziemię żarłocy — twarze, ręce, brzuchy.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { SURFACE_Y } from '../sim/world';
import { cerberNaPowierzchni } from '../sim/krag';
import { ukladKatedry } from './katedra';
import { wysokoscGrzbietu } from './grzbiet';
import { wolnoRuszac } from './nastroj';
import { rysujCerbera, pozaCerbera } from './cerber';
import { bloczekWiadra, placKonwoju } from './konwoj';

const TUSZ = 'rgba(14,10,8,0.95)';
const los = (n: number): number => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Wstęp (app/wstep-kregu.ts) przesuwa zegar Cerbera, gdy symulacja stoi. */
export const WIDOK_KREGU = { tik: null as number | null, tlum: true };

/** Grunt powierzchni (y kafli) w kolumnie x. */
export function gruntKregu(sim: Sim, x: number): number {
  return SURFACE_Y - wysokoscGrzbietu(sim.world, Math.max(0, Math.min(sim.world.w - 1, Math.floor(x))));
}

// ---------------------------------------------------------------- lej piekła

/**
 * Wnętrze leja nad tarasem trzeciego kręgu — po rycinie świata, przed resztą. Rzędy wyższych kręgów wyginają się
 * w górę ku brzegom kadru (patrzymy z wnętrza misy), lekka paralaksa.
 */
export function rysujLej(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const yG = cam.toScreenY(SURFACE_Y - 1.5);
  if (yG <= 0) return;
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  const W = cam.vw, z = cam.zoom;
  const cxS = cam.toScreenX(sim.world.w / 2);
  const par = 0.35;                                   // paralaksa: tło jedzie wolniej niż świat
  const yS = cam.toScreenY(SURFACE_Y);
  const Y = (wy: number): number => yS + (wy - SURFACE_Y) * z * (1 - par);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, yG); ctx.clip();
  // ciemność leja, od dołu czerwona łuna niższych kręgów
  const tlo = ctx.createLinearGradient(0, Y(SURFACE_Y - 70), 0, yG);
  tlo.addColorStop(0, 'rgb(4,4,6)'); tlo.addColorStop(0.55, 'rgb(14,13,15)'); tlo.addColorStop(1, 'rgb(40,22,18)');
  ctx.fillStyle = tlo; ctx.fillRect(0, 0, W, yG);
  // rzędy kręgów: [wysokość ledge nad naszym tarasem (kafle), wygięcie, barwa skały, barwa półki]
  const rzedy: [number, number, [number, number, number], string][] = [
    [62, 70, [26, 24, 26], 'otchlan'],
    [46, 52, [34, 32, 32], 'limbus'],
    [30, 34, [44, 42, 40], 'wicher'],
    [14, 16, [58, 60, 54], 'trzeci'],
  ];
  const krzywa = (h: number, wyg: number, x: number): number => {
    const u = (x - cxS) / Math.max(1, W * 0.75);
    return Y(SURFACE_Y - h) - u * u * wyg * z * (1 - par);
  };
  for (let r = 0; r < rzedy.length; r++) {
    const [h, wyg, kol, nazwa] = rzedy[r];
    const dolny = r + 1 < rzedy.length ? rzedy[r + 1] : null;
    // ściana pod półką: od krawędzi tego kręgu do półki niższego
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 20) { const y = krzywa(h, wyg, x); if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    for (let x = W + 20; x >= -20; x -= 20) ctx.lineTo(x, dolny ? krzywa(dolny[0], dolny[1], x) : yG);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, krzywa(h, wyg, cxS), 0, dolny ? krzywa(dolny[0], dolny[1], cxS) : yG);
    g.addColorStop(0, `rgb(${kol[0] + 14},${kol[1] + 14},${kol[2] + 12})`); g.addColorStop(1, `rgb(${kol[0] * 0.55 | 0},${kol[1] * 0.55 | 0},${kol[2] * 0.55 | 0})`);
    ctx.fillStyle = g; ctx.fill();
    // pionowe żłobienia skały
    ctx.strokeStyle = 'rgba(8,6,6,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const x = (los(i * 31 + r * 7) * (W + 40)) - 20;
      const y0 = krzywa(h, wyg, x) + 3, y1 = (dolny ? krzywa(dolny[0], dolny[1], x) : yG) - 2;
      if (y1 - y0 < 6) continue;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (los(i) - 0.5) * 8, y0 + (y1 - y0) * (0.4 + los(i * 3) * 0.6)); ctx.stroke();
    }
    // krawędź półki
    ctx.strokeStyle = `rgba(${kol[0] + 70},${kol[1] + 66},${kol[2] + 56},0.55)`; ctx.lineWidth = Math.max(1, z * 0.08);
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 20) { const y = krzywa(h, wyg, x); if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    // życie na półkach
    if (nazwa === 'wicher') {
      // krąg II: wicher niesie dusze zmysłowych — smugi i drobne sylwetki wirujące nad półką
      ctx.strokeStyle = 'rgba(190,196,210,0.22)'; ctx.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const p = (t * 0.06 * (0.6 + los(i) * 0.8) + los(i * 5)) % 1;
        const x = -60 + p * (W + 120);
        const y = krzywa(h, wyg, x) - z * (1.5 + 4 * los(i * 9)) + Math.sin(t * 1.3 + i) * z * 0.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - z * 1.2, y - z * 0.5, x - z * 2.6, y + Math.sin(i) * z * 0.4); ctx.stroke();
        ctx.fillStyle = 'rgba(206,208,218,0.4)';
        ctx.beginPath(); ctx.ellipse(x, y, z * 0.18, z * 0.4, 0.9, 0, Math.PI * 2); ctx.fill();
      }
    } else if (nazwa === 'limbus') {
      // krąg I, Otchłań: daleki blask szlachetnego zamku i nieruchome cienie
      const x = cxS - W * 0.28, y = krzywa(h, wyg, x);
      const r2 = z * 6;
      const gl = ctx.createRadialGradient(x, y - z, 0, x, y - z, r2);
      gl.addColorStop(0, 'rgba(230,220,160,0.35)'); gl.addColorStop(1, 'rgba(230,220,160,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - r2, y - z - r2, r2 * 2, r2 * 2);
      ctx.fillStyle = 'rgba(40,38,34,0.9)';
      for (let i = 0; i < 5; i++) ctx.fillRect(x - z * 2 + i * z, y - z * (1.2 + (i % 2) * 0.6), z * 0.6, z * (1.2 + (i % 2) * 0.6));
    } else if (nazwa === 'trzeci') {
      // drugi brzeg naszego kręgu: ten sam taras, daleko — leżący żarłocy jak ciemne grudki
      ctx.fillStyle = 'rgba(30,28,24,0.8)';
      for (let i = 0; i < 70; i++) {
        const x = los(i * 13) * W, y = krzywa(h, wyg, x) + z * 0.1;
        ctx.beginPath(); ctx.ellipse(x, y - z * 0.12, z * 0.35, z * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** Prawa krawędź tarasu: przepaść do kręgu czwartego (po rycinie; skała przy krawędzi i tak jest nie do ruszenia). */
export function rysujPrzepasc(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world, z = cam.zoom;
  const xk = w.w - 9;
  const sx = cam.toScreenX(xk);
  if (sx > cam.vw + 4) return;
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  const yTop = cam.toScreenY(gruntKregu(sim, xk - 1) - 0.2);
  ctx.save();
  // urwisko: poszarpana krawędź tarasu, za nią ciemność z łuną z dołu
  ctx.beginPath();
  ctx.moveTo(sx, Math.max(-10, yTop));
  for (let i = 0; i <= 40; i++) {
    const wy = gruntKregu(sim, xk) + i * 6;
    ctx.lineTo(sx + (los(i * 17) - 0.3) * z * 1.6 + i * z * 0.25, cam.toScreenY(wy));
  }
  ctx.lineTo(cam.vw + 50, cam.toScreenY(gruntKregu(sim, xk) + 240));
  ctx.lineTo(cam.vw + 50, Math.max(-10, yTop - z * 20));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + z * 200);
  g.addColorStop(0, 'rgb(10,9,10)'); g.addColorStop(0.6, 'rgb(18,10,9)'); g.addColorStop(1, 'rgb(70,22,12)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(120,124,110,0.5)'; ctx.lineWidth = Math.max(1, z * 0.1); ctx.stroke();
  // deszcz spada w przepaść, z dołu bije łuna i wyziew
  ctx.clip();
  const r = z * 40, ly = yTop + z * 160;
  const lg = ctx.createRadialGradient(sx + z * 12, ly, 0, sx + z * 12, ly, r);
  lg.addColorStop(0, `rgba(200,70,30,${0.25 + 0.05 * Math.sin(t * 1.7)})`); lg.addColorStop(1, 'rgba(200,70,30,0)');
  ctx.fillStyle = lg; ctx.fillRect(sx - r, ly - r, r * 3, r * 2);
  ctx.strokeStyle = 'rgba(150,160,170,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 50; i++) {
    const x = sx + los(i * 7) * z * 14, y = yTop + ((los(i * 3) * z * 120 + t * 500) % (z * 120));
    ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 10);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- tłum żarłoków

/** Jeden żarłok w błocie, stopami/biodrem w (0, 0), wzrost h (piksele). `typ` 0…4, `t` — czas (s), `ziarno`. */
export function zarlok(ctx: CanvasRenderingContext2D, h: number, typ: number, t: number, ziarno: number, kier = 1): void {
  const skora = `rgb(${132 + (ziarno % 3) * 8},${124 + (ziarno % 5) * 4},${104})`;
  const bloto = 'rgba(46,42,30,0.95)';
  const lw = Math.max(0.8, h * 0.05);
  ctx.save();
  ctx.scale(kier, 1);
  ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const fill = (p: () => void, k: string): void => { ctx.beginPath(); p(); ctx.fillStyle = k; ctx.fill(); ctx.stroke(); };
  const fala = Math.sin(t * 1.1 + ziarno);
  if (typ === 0) {
    // leży twarzą w błocie: grzbiet, głowa, rozrzucona ręka
    fill(() => ctx.ellipse(0, -h * 0.1 - fala * h * 0.01, h * 0.42, h * 0.12, 0, Math.PI, Math.PI * 2), skora);
    fill(() => ctx.arc(h * 0.48, -h * 0.07, h * 0.1, Math.PI, Math.PI * 2), skora);
    ctx.lineWidth = h * 0.07; ctx.strokeStyle = skora;
    ctx.beginPath(); ctx.moveTo(h * 0.3, -h * 0.05); ctx.lineTo(h * 0.62 + fala * h * 0.03, -h * 0.02); ctx.stroke();
  } else if (typ === 1) {
    // na plecach, ręka wzniesiona ku deszczowi
    fill(() => ctx.ellipse(0, -h * 0.08, h * 0.42, h * 0.1, 0, Math.PI, Math.PI * 2), skora);
    fill(() => ctx.arc(-h * 0.48, -h * 0.08, h * 0.1, 0, Math.PI * 2), skora);
    ctx.lineWidth = h * 0.065; ctx.strokeStyle = skora;
    ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.12); ctx.quadraticCurveTo(-h * 0.25, -h * 0.4, -h * 0.18 + fala * h * 0.06, -h * 0.58); ctx.stroke();
    ctx.lineWidth = lw; ctx.strokeStyle = TUSZ;
    ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.12); ctx.quadraticCurveTo(-h * 0.25, -h * 0.4, -h * 0.18 + fala * h * 0.06, -h * 0.58); ctx.stroke();
  } else if (typ === 2) {
    // siedzi skulony, kołysze się
    ctx.rotate(fala * 0.06);
    fill(() => { ctx.moveTo(-h * 0.2, 0); ctx.quadraticCurveTo(-h * 0.25, -h * 0.5, 0, -h * 0.55); ctx.quadraticCurveTo(h * 0.22, -h * 0.45, h * 0.24, 0); ctx.closePath(); }, skora);
    fill(() => ctx.arc(h * 0.05, -h * 0.62, h * 0.11, 0, Math.PI * 2), skora);
    ctx.beginPath(); ctx.moveTo(h * 0.2, -h * 0.25); ctx.lineTo(-h * 0.05, -h * 0.3); ctx.stroke();
  } else if (typ === 3) {
    // czołga się: tułów nisko, ręka sięga do przodu
    const sieg = Math.max(0, Math.sin(t * 0.9 + ziarno));
    fill(() => ctx.ellipse(0, -h * 0.14, h * 0.4, h * 0.13, -0.08, 0, Math.PI * 2), skora);
    fill(() => ctx.arc(h * 0.44, -h * 0.24, h * 0.1, 0, Math.PI * 2), skora);
    ctx.lineWidth = h * 0.07; ctx.strokeStyle = skora;
    ctx.beginPath(); ctx.moveTo(h * 0.25, -h * 0.15); ctx.lineTo(h * (0.5 + 0.2 * sieg), -h * 0.02); ctx.stroke();
  } else {
    // klęczy i wyje w deszcz jak pies (pieśń VI), głowa odrzucona
    fill(() => { ctx.moveTo(-h * 0.18, 0); ctx.lineTo(-h * 0.12, -h * 0.6); ctx.quadraticCurveTo(0, -h * 0.7, h * 0.1, -h * 0.58); ctx.lineTo(h * 0.2, 0); ctx.closePath(); }, skora);
    fill(() => ctx.arc(-h * 0.02, -h * 0.76, h * 0.11, 0, Math.PI * 2), skora);
    ctx.fillStyle = TUSZ; ctx.beginPath(); ctx.ellipse(h * 0.02, -h * 0.82, h * 0.03, h * 0.045 * (0.6 + 0.4 * Math.abs(fala)), 0, 0, Math.PI * 2); ctx.fill();
  }
  // błoto zalewa dół ciała
  ctx.fillStyle = bloto;
  ctx.beginPath(); ctx.ellipse(0, h * 0.02, h * 0.62, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Ile kafli między żarłokami na tarasie (i gdzie ich nie ma: przy szybach, przy wozie, w przepaści). */
function miejscaTlumu(sim: Sim): number[] {
  const w = sim.world;
  const k = ukladKatedry(w), b = bloczekWiadra(w), plac = placKonwoju(w);
  const out: number[] = [];
  for (let i = 0; i < 400; i++) {
    const x = 6 + i * 0.95 + los(i * 3) * 0.6;
    if (x > w.w - 11) break;
    if (los(i * 11 + 5) < 0.22) continue;
    if (k && x > k.x0 - 2.5 && x < k.x1 + 1.5) continue;
    if (b && Math.abs(x - b.x) < 3) continue;
    if (plac && x > plac.x0 - 1 && x < plac.x1 + 1) continue;
    out.push(x);
  }
  return out;
}
let tlumKlucz: Sim | null = null, tlumMiejsca: number[] = [];

/** Taras trzeciego kręgu: żarłocy w błocie (przed mrokiem, po skałach powierzchni). */
export function rysujTlum(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const z = cam.zoom;
  if (cam.toScreenY(SURFACE_Y - 4) > cam.vh || cam.toScreenY(SURFACE_Y + 1) < 0) return;
  if (tlumKlucz !== sim) { tlumKlucz = sim; tlumMiejsca = miejscaTlumu(sim); }
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  const h = z * 1.7;
  const c = cerberNaPowierzchni(sim, WIDOK_KREGU.tik ?? undefined);
  ctx.save();
  // kałuże i błoto na całym tarasie
  ctx.fillStyle = 'rgba(40,40,30,0.55)';
  for (let i = 0; i < tlumMiejsca.length; i += 3) {
    const x = tlumMiejsca[i];
    const sx = cam.toScreenX(x), sy = cam.toScreenY(gruntKregu(sim, x)) + z * 0.1;
    if (sx < -z * 4 || sx > cam.vw + z * 4) continue;
    ctx.beginPath(); ctx.ellipse(sx, sy, z * 2.2, z * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < tlumMiejsca.length; i++) {
    const x = tlumMiejsca[i];
    const sx = cam.toScreenX(x), sy = cam.toScreenY(gruntKregu(sim, x)) + z * 0.12;
    if (sx < -h || sx > cam.vw + h) continue;
    // pod łapami Cerbera nikt nie leży spokojnie — tych rysuje on sam
    if (c.jest && Math.abs(x - c.x) < 2.2) continue;
    const typ = Math.floor(los(i * 29 + 1) * 5);
    const dx = typ === 3 ? Math.sin(t * 0.25 + i) * z * 0.3 : 0;
    ctx.save(); ctx.translate(sx + dx, sy);
    zarlok(ctx, h, typ, t, i, los(i * 37) < 0.5 ? 1 : -1);
    ctx.restore();
  }
  ctx.restore();
}

/** Cerber na tarasie kręgu: chodzi od żarłoka do żarłoka, szarpie, obdziera, wyje w deszcz (nad mrokiem, przed deszczem). */
export function rysujCerberaNaKregu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const c = cerberNaPowierzchni(sim, WIDOK_KREGU.tik ?? undefined);
  if (!c.jest) return;
  const z = cam.zoom, h = z * 4.4;
  const sx = cam.toScreenX(c.x), sy = cam.toScreenY(gruntKregu(sim, c.x)) + z * 0.1;
  if (sx < -h * 2 || sx > cam.vw + h * 2 || sy < -h || sy > cam.vh + h * 0.5) return;
  const t = teraz / 1000;
  const p = pozaCerbera();
  p.czas = teraz;
  p.krok = c.idzie; p.faza = c.x * 2.2;
  p.oddech = 0.5 + 0.5 * Math.sin(t * 4);
  p.ogon = Math.sin(t * 1.4) * 0.7;
  p.glowy.forEach((g, i) => { g.pochyl = 0.1 * Math.sin(t * 1.6 + i * 2); g.paszcza = 0.15 + 0.1 * Math.max(0, Math.sin(t * 5 + i)); });
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(c.zwrot, 1);
  if (c.szarpie > 0) {
    // szarpie potępionego: głowy w dół, paszcze kłapią, ofiara się rzuca, krew
    const sz = c.szarpie;
    const rzut = Math.sin(t * 9) * (sz < 0.8 ? 1 : 0.2);
    ctx.save();
    ctx.translate(h * 0.95, 0);
    ctx.rotate(rzut * 0.25);
    zarlok(ctx, z * 1.7, 1, t * 3, 7, -1);
    ctx.restore();
    ctx.fillStyle = 'rgba(130,16,12,0.8)';
    for (let i = 0; i < 6; i++) {
      const f = (t * 1.5 + i / 6) % 1;
      ctx.beginPath(); ctx.arc(h * (0.85 + (los(i) - 0.5) * 0.4), -h * (0.1 + f * 0.25) + f * f * h * 0.3, z * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    p.glowy.forEach((g, i) => {
      g.pochyl = 0.7 + 0.15 * Math.sin(t * 9 + i * 1.7);
      g.paszcza = 0.4 + 0.5 * Math.abs(Math.sin(t * 7 + i * 2));
      g.wysun = 0.25 + 0.2 * Math.sin(t * 6 + i);
    });
    // co jakiś czas jedna głowa wyje w deszcz
    const wyje = Math.floor(t / 3) % 3;
    if ((t % 3) < 1.2) { p.glowy[wyje].pochyl = -0.8; p.glowy[wyje].paszcza = 1; p.glowy[wyje].wysun = 0; }
  }
  rysujCerbera(ctx, h, p);
  ctx.restore();
}

// ---------------------------------------------------------------- trzewia: ciała w ścianach

/** Ciała wciągane przez ziemię w ścianach i posadzkach wykutych korytarzy (przed mrokiem — widać je tylko w świetle). */
export function rysujCialaWScianach(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const z = cam.zoom;
  if (z < 6) return;
  const w = sim.world;
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  const x0 = Math.max(1, Math.floor(cam.toWorldX(0))), x1 = Math.min(w.w - 2, Math.ceil(cam.toWorldX(cam.vw)));
  const y0 = Math.max(SURFACE_Y + 2, Math.floor(cam.toWorldY(0))), y1 = Math.min(w.h - 2, Math.ceil(cam.toWorldY(cam.vh)));
  const skora = 'rgb(138,128,106)';
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = w.idx(x, y);
      if (!w.ever[i] || !w.passable(x, y)) continue;
      const r = los(x * 7349 + y * 211);
      if (r > 0.07) continue;
      const lewa = w.solid(x - 1, y), prawa = w.solid(x + 1, y), dol = w.solid(x, y + 1);
      const fala = Math.sin(t * 0.9 + x + y);
      const lw = Math.max(0.8, z * 0.06);
      ctx.strokeStyle = TUSZ; ctx.lineWidth = lw;
      if ((lewa || prawa) && r < 0.045) {
        // twarz i ręka wychodzące ze ściany
        const kier = lewa ? 1 : -1;
        const sx = cam.toScreenX(lewa ? x : x + 1), sy = cam.toScreenY(y + 0.45);
        ctx.save(); ctx.translate(sx, sy); ctx.scale(kier, 1);
        ctx.fillStyle = skora;
        ctx.beginPath(); ctx.ellipse(z * 0.12, 0, z * 0.2, z * 0.26, 0, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = TUSZ;
        ctx.beginPath(); ctx.ellipse(z * 0.2, z * 0.06, z * 0.04, z * 0.07 * (0.7 + 0.3 * fala), 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(z * 0.18, -z * 0.09, z * 0.025, 0, Math.PI * 2); ctx.fill();
        // ręka
        ctx.strokeStyle = skora; ctx.lineWidth = z * 0.09;
        ctx.beginPath(); ctx.moveTo(0, z * 0.32); ctx.quadraticCurveTo(z * 0.35, z * 0.3, z * (0.55 + 0.08 * fala), z * (0.1 + 0.05 * fala)); ctx.stroke();
        ctx.strokeStyle = TUSZ; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(0, z * 0.32); ctx.quadraticCurveTo(z * 0.35, z * 0.3, z * (0.55 + 0.08 * fala), z * (0.1 + 0.05 * fala)); ctx.stroke();
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(z * (0.55 + 0.08 * fala), z * (0.1 + 0.05 * fala)); ctx.lineTo(z * (0.66 + 0.08 * fala), z * (0.02 + k * 0.06)); ctx.stroke(); }
        ctx.restore();
      } else if (dol && !lewa && !prawa) {
        // brzuch i głowa żarłoka na wpół wciągnięte w posadzkę
        const sx = cam.toScreenX(x + 0.5), sy = cam.toScreenY(y + 1);
        ctx.fillStyle = skora;
        ctx.beginPath(); ctx.ellipse(sx, sy, z * 0.34, z * (0.14 + 0.01 * fala), 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx + z * 0.42, sy, z * 0.11, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
  }
  ctx.restore();
}
