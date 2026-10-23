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
import { SURFACE_Y } from '../sim/world';
import { SWIAT } from '../nastawy/swiat';
import { ukladKatedry } from './katedra';
import { latarniaKonwoju } from './konwoj';
import { wysokoscGrzbietu } from './grzbiet';

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
    // światło wpada z góry: z rozety katedry (jej łuna, płomienie świec przy otworze) albo, bez katedry, z wylotu
    // szybu — szyb nad ołtarzem jasny na całej wysokości, do stropu sali… (wycinanie od pierwszego rzędu ziemi:
    // plama światła wyżej wisiała nad wylotem na niebie jak księżyc)
    const kat = ukladKatedry(w);
    if (kat) {
      swiec(kat.rozeta.x, kat.rozeta.y, S.rozeta, 0.95);
      for (let y = kat.rozeta.y + 1.2; y < kat.posadzka; y += 1.4) swiec(kat.cx, y, S.smugaGora * 1.15, 0.8);
      for (const p of kat.plomienie) swiec(p.x, p.y, S.swieca * (0.95 + 0.07 * migotLampy(teraz + p.x * 311)), 0.9);
    }
    for (let y = kat ? kat.posadzka : SURFACE_Y + 0.5; y < w.szybDol; y += 1.6) swiec(w.szybX + 0.5, y, S.smugaGora, 0.75);
    // …a z jego wylotu smuga rozchodzi się na ołtarz
    const dy = o.y - w.szybDol;
    for (let k = 0; k <= dy; k += 1.6) {
      const f = k / Math.max(1, dy);
      swiec(w.szybX + 0.5 + (o.x - w.szybX) * f, w.szybDol + k, S.smugaGora + (S.smugaDol - S.smugaGora) * f, 0.75);
    }
    // węższym szybem, którym zjeżdża wiadro, dnia wpada mniej
    const wx = w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer / 2;
    for (let y = SURFACE_Y + 0.5; y <= w.szybWiadraDol; y += 1.4) swiec(wx, y, S.szybWiadra, 0.4);
  }
  // latarnia konwoju z jedzeniem (render/konwoj.ts) — świeci, gdy wóz jedzie albo stoi przy koźle
  const lat = latarniaKonwoju(sim, (x) => SURFACE_Y - wysokoscGrzbietu(w, x));
  if (lat) swiec(lat.x, lat.y, S.latarnia * (0.95 + 0.07 * migotLampy(teraz + 4127)));
  for (const e of sim.efekty) if (e.rodzaj === 'cud') swiec(e.x, e.y, S.cud * (1 - e.t / e.max * 0.5));
  // jasna sala: cała w świetle, nie tylko krąg wokół ołtarza — to tu lud odpoczywa i tu wraca
  const so = w.salaOltarza;
  if (so.x1 >= 0) {
    const cy = (so.y0 + so.y1) / 2 + 1;
    for (let x = so.x0 + 3; x <= so.x1 - 2; x += S.salaKrok) swiec(x + 0.5, cy, S.sala);
  }
  // gotowe pomieszczenia: kuźnia jaśnieje ogniem, warsztat świecą, sypialnia ledwo (korytarz i szyb — nic)
  for (const p of sim.pomieszczenia) {
    const z = p.gotowe ? S.pomieszczenia[p.rodzaj] : undefined;
    if (!z) continue;
    const r = Math.max(p.w, p.h) / 2 + z;
    const migotP = p.rodzaj === 'kuznia' && !ustawienia.ograniczRuch ? 0.94 + 0.08 * migotLampy(teraz + p.id * 613) : 1;
    swiec(p.x + p.w / 2, p.y + p.h / 2, r * migotP, p.rodzaj === 'sypialnia' ? 0.75 : 1);
  }

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
  // żar kuźni na ścianach: ciepła, pomarańczowa poświata nad mrokiem (drga razem z ogniem)
  for (const p of sim.pomieszczenia) {
    if (!p.gotowe || p.rodzaj !== 'kuznia') continue;
    const R = MROK.zarKuzniPromien * cam.zoom;
    const sx = cam.toScreenX(p.x + p.w / 2), sy = cam.toScreenY(p.y + p.h * 0.7);
    if (sx + R < 0 || sy + R < 0 || sx - R > cam.vw || sy - R > cam.vh) continue;
    const a = MROK.zarKuzni * (ustawienia.ograniczRuch ? 1 : 0.9 + 0.12 * migotLampy(teraz + p.id * 613));
    const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    gr.addColorStop(0, `rgba(255,128,48,${a})`);
    gr.addColorStop(0.5, `rgba(220,90,30,${a * 0.4})`);
    gr.addColorStop(1, 'rgba(160,50,20,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gr;
    ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
    ctx.restore();
  }
}
