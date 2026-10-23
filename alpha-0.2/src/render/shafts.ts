import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { PASSABLE } from '../sim/tiles';
import { MEM_SPAN, SURFACE_Y, type World } from '../sim/world';
import { SWIAT } from '../nastawy/swiat';

/** Odległość kafla od prostokąta kafli (włącznie z brzegami); 0 — w środku. */
function odProstokata(x: number, y: number, x0: number, x1: number, y0: number, y1: number): number {
  const dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0;
  const dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
  return dx === 0 && dy === 0 ? 0 : Math.sqrt(dx * dx + dy * dy);
}

/**
 * Alpha: jak daleko (w kaflach) kafel leży od tego, co dzień trzyma na widoku — jasnej sali z ołtarzem i obu
 * otworów, którymi wpada do niej z powierzchni: szerszego szybu nad ołtarzem i węższego, którym zjeżdża wiadro
 * (z kaflem skały dookoła). 0 — na widoku: rycina rysuje go bez niczyjego spojrzenia, a znaki nieznanego go
 * omijają. Dawniej tylko salę — szyby w czapie rysowały się jak lity kamień, więc smuga światła na ołtarz brała
 * się znikąd, a wiadro zjeżdżało przez skałę.
 */
export function odWidoku(w: World, x: number, y: number): number {
  const so = w.salaOltarza;
  if (so.x1 < 0) return Infinity;
  const pol = SWIAT.warstwy.szyb >> 1;
  return Math.min(
    odProstokata(x, y, so.x0 - 1, so.x1 + 1, so.y0 - 1, so.y1 + 2),
    odProstokata(x, y, w.szybX - pol - 1, w.szybX + pol + 1, SURFACE_Y - 1, w.szybDol),
    odProstokata(x, y, w.szybWiadraX - 1, w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer, SURFACE_Y - 1, w.szybWiadraDol),
  );
}

/**
 * Smugi światła z powierzchni. Wpadają tylko tam, gdzie ktoś przebił się do nieba —
 * więc pokazują graczowi, którędy przyjdą ludzie.
 */
export function smugiSwiatla(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number): void {
  const w = sim.world;
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z;
  const right = left + cam.vw / z;
  const top = cam.y - cam.vh / 2 / z;
  if (top > 70) return;                       // głęboko pod ziemią nie ma czego wpuszczać

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const x0 = Math.max(1, Math.floor(left) - 2);
  const x1 = Math.min(w.w - 2, Math.ceil(right) + 2);
  // Alpha: oba szyby do sali mają własne światło dnia — nad ołtarzem smugę od nieba do ołtarza (render/oltarz.ts),
  // szyb wiadra jaśnieje w mroku (render/mrok.ts); smuga stąd rozlewała się w wąskim szybie stożkiem na skałę
  const pol = SWIAT.warstwy.szyb >> 1, wiad = SWIAT.warstwy.szybWiadra.szer;
  const doSali = (x: number) => w.salaOltarza.x1 >= 0
    && ((x >= w.szybX - pol && x <= w.szybX + pol) || (x >= w.szybWiadraX && x < w.szybWiadraX + wiad));

  for (let x = x0; x <= x1; x++) {
    const sh = w.surface[x];
    if (PASSABLE[w.tile[w.idx(x, sh + 1)]] !== 1) continue;      // strop zamknięty
    if (doSali(x)) continue;
    // jak głęboko sięga szyb
    // smuga kończy się tam, gdzie kończy się pamięć — światło nie oświetla Otchłani
    let g = sh + 1;
    while (g < w.h - 1 && g < sh + 60) {
      const i = w.idx(x, g);
      if (PASSABLE[w.tile[i]] !== 1) break;
      if (!w.ever[i] || sim.tick - w.lastSeen[i] > MEM_SPAN * 0.6) break;
      g++;
    }
    const dl = g - sh;
    if (dl < 4) continue;

    const sx = (x + 0.5 - left) * z;
    const sy = (sh - top) * z;
    const sdl = dl * z;
    const drganie = Math.sin(czas * 0.0004 + x) * z * 0.3;
    const grad = ctx.createLinearGradient(sx, sy, sx + drganie, sy + sdl);
    grad.addColorStop(0, 'rgba(236,214,170,0.13)');
    grad.addColorStop(0.55, 'rgba(228,196,150,0.05)');
    grad.addColorStop(1, 'rgba(228,196,150,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx - z * 0.7, sy);
    ctx.lineTo(sx + z * 0.7, sy);
    ctx.lineTo(sx + drganie + z * 2.4, sy + sdl);
    ctx.lineTo(sx + drganie - z * 2.4, sy + sdl);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
