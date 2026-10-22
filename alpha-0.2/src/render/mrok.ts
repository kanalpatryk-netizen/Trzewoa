import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { Job } from '../sim/creatures';
import { rolaPostaci, klanLudu } from '../sim/lud';
import { MROK } from '../nastawy/mrok';
import { migotLampy } from './fresk';
import { ustawienia } from '../core/settings-store';
import { DEV } from '../sim/dziennik';
import { wiadra } from '../sim/wiadro';
import { rytualOltarza } from '../sim/oltarz';

/**
 * Ciemność w górze: świat jest widoczny tylko w świetle lampek robotników, aureol
 * pobożnych, siedziby, obozów, rdzenia i Cudu. Reszta tonie w mroku (pamięć zostaje,
 * tylko przygaszona). Liczona w mniejszej rozdzielczości na osobnym płótnie.
 */
let warstwa: HTMLCanvasElement | null = null;
let plamka: HTMLCanvasElement | null = null;

/** Miękka plama światła: biała w środku, wygasa ku brzegom. Rysowana „destination-out” wycina ciemność. */
function plamaSwiatla(): HTMLCanvasElement {
  if (plamka) return plamka;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  gr.addColorStop(0.75, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return (plamka = c);
}

export function rysujMrok(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, pauza: boolean): void {
  if (!MROK.wlaczony || typeof document === 'undefined') return;
  // tryb deweloperski: „bez ciemności” — mrok działa, tylko go nie widać
  if (DEV.bezMroku && ustawienia.trybDeweloperski) return;
  const k = MROK.skala;
  const W = Math.max(1, Math.ceil(cam.vw * k)), H = Math.max(1, Math.ceil(cam.vh * k));
  if (!warstwa) warstwa = document.createElement('canvas');
  if (warstwa.width !== W || warstwa.height !== H) { warstwa.width = W; warstwa.height = H; }
  const g = warstwa.getContext('2d')!;
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, W, H);
  // suwak jasności rozjaśnia też mrok — na ciemnym ekranie telefonu inaczej nic by nie było widać
  const ciemnosc = (pauza ? MROK.ciemnoscPauza : MROK.ciemnosc) / Math.max(1, ustawienia.jasnosc);
  g.fillStyle = `rgba(6,3,2,${ciemnosc})`;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out';
  const spr = plamaSwiatla();
  const z = cam.zoom * k;
  const S = MROK.swiatlo;
  const swiec = (x: number, y: number, r: number, sila = 1): void => {
    const R = r * z;
    const sx = cam.toScreenX(x) * k, sy = cam.toScreenY(y) * k;
    if (sx + R < 0 || sy + R < 0 || sx - R > W || sy - R > H) return;
    g.globalAlpha = Math.max(0, Math.min(1, sila));
    g.drawImage(spr, sx - R, sy - R, R * 2, R * 2);
  };

  const w = sim.world;
  const klan = klanLudu(sim);
  if (klan) swiec(klan.hx + 0.5, klan.hy + 0.5, S.siedziba * (0.96 + 0.06 * migotLampy(teraz)));
  for (const o of sim.lud.obozy ?? []) swiec(o.x + 0.5, o.y + 0.5, S.oboz);
  for (const s of sim.lud.spizarnie ?? []) swiec(s.x + 0.5, s.y + 0.5, S.oboz * 0.8);
  // wiadro z jedzeniem świeci ciepło (pełne mocniej) — widać je w ciemności, nawet gdy nikogo przy nim nie ma
  for (const wd of wiadra(sim)) if (wd.faza !== 'zapowiedz') swiec(wd.x + 0.5, wd.y + 0.3, S.oboz * (wd.porcje > 0 ? 0.75 : 0.4));
  swiec(w.coreX + 0.5, w.coreY + 0.5, S.rdzen);
  // Alpha, etap 3d: świece na ołtarzu i smuga światła dziennego z szybu nad nim
  if (w.salaOltarza.x1 >= 0) {
    const o = w.oltarz;
    swiec(o.x + 0.5, o.y - 0.6, (rytualOltarza(sim) ? S.rytual : S.oltarz) * (0.96 + 0.06 * migotLampy(teraz + 3331)));
    const dy = o.y - w.szybDol;
    for (let k = 0; k <= dy; k += 1.6) {
      const f = k / Math.max(1, dy);
      swiec(w.szybX + 0.5 + (o.x - w.szybX) * f, w.szybDol + k, S.smugaGora + (S.smugaDol - S.smugaGora) * f, 0.75);
    }
  }
  for (const e of sim.efekty) if (e.rodzaj === 'cud') swiec(e.x, e.y, S.cud * (1 - e.t / e.max * 0.5));

  for (const c of sim.creatures) {
    if (c.dead || c.straznik) continue;
    const r = rolaPostaci(c);
    if (!r) continue;
    const pr = r === 'robotnik' ? S.robotnik : r === 'rycerz' ? S.rycerz
      : (c.job === Job.PRAY || c.job === Job.PIELGRZYM || c.modliPrzyObozie) ? S.pobozny_modli : S.pobozny;
    const migot = 0.92 + 0.1 * migotLampy(teraz + c.id * 977);
    swiec(c.x + 0.5, c.y + 0.5, pr * migot);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(warstwa, 0, 0, cam.vw, cam.vh);
}
