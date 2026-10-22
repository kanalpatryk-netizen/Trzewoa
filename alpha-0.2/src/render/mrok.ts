import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { Job } from '../sim/creatures';
import { rolaPostaci, klanLudu } from '../sim/lud';
import { MROK } from '../nastawy/mrok';
import { migotLampy } from './fresk';
import { glif } from './tajemnica';
import { obrazFresku } from './freski';
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
  // tryb deweloperski: „bez ciemności” — mrok i Patrzący działają, tylko ich nie widać
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

  const m = sim.lud.mrok;
  const ofiara = m && (m.faza === 'patrzy' || m.faza === 'podchodzi') ? m.cel : null;
  for (const c of sim.creatures) {
    if (c.dead || c.straznik) continue;
    const r = rolaPostaci(c);
    if (!r) continue;
    let pr = r === 'robotnik' ? S.robotnik : r === 'rycerz' ? S.rycerz
      : (c.job === Job.PRAY || c.job === Job.PIELGRZYM || c.modliPrzyObozie) ? S.pobozny_modli : S.pobozny;
    const migot = 0.92 + 0.1 * migotLampy(teraz + c.id * 977);
    // lampka tego, na kogo patrzy ciemność, przygasa i się krztusi
    if (c.id === ofiara) {
      const dusi = m!.faza === 'patrzy' ? MROK.lampkaPrzygasa : 0.6;
      pr *= dusi + (1 - dusi) * Math.max(0, Math.sin(teraz * 0.013 + c.id)) * 0.3;
    }
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

/**
 * Ten, który patrzy: para oczu w skale, gęstniejąca wokół nich ciemność, a gdy patrzy
 * na kogoś — cień postaci z fresku, znaki szeptu i zamykające się koło wokół ofiary.
 */
export function rysujPatrzacego(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const m = sim.lud.mrok;
  if (!MROK.wlaczony || !m) return;
  const z = cam.zoom;
  const zabrany = m.zabranyT !== undefined ? sim.tick - m.zabranyT : 1e9;
  const przegnany = m.przegnanyT !== undefined ? sim.tick - m.przegnanyT : 1e9;

  // zabranie: ciemność zaciska się na postaci i wciąga ją w skałę (na chwilę widać sylwetkę tego, co ją wzięło),
  // a na ziemi zostaje jej lampka, która jeszcze chwilę się pali — dawniej robotnik znikał bez śladu
  if (m.zabranyX !== undefined && m.zabranyY !== undefined) {
    if (zabrany < 300) {
      sylwetka(ctx, cam, m.zabranyX, m.zabranyY, z, 0.55 * (1 - zabrany / 300), 1);
      wciaganie(ctx, cam, m.zabranyX, m.zabranyY, z, zabrany / 300);
    }
    if (zabrany < LAMPKA_TIKOW) lampka(ctx, cam, m.zabranyX, m.zabranyY, z, 1 - Math.max(0, (zabrany - LAMPKA_TIKOW + 600) / 600), teraz);
  }
  if (m.faza === 'czeka') {
    // przegnany Cudem: oczy rozbiegają się i gasną
    if (przegnany < 160) oczy(ctx, cam.toScreenX(m.x), cam.toScreenY(m.y), z, (1 - przegnany / 160) * 0.8, teraz, 1 + przegnany / 40);
    return;
  }

  const sx = cam.toScreenX(m.x), sy = cam.toScreenY(m.y);
  if (sx < -120 || sy < -120 || sx > cam.vw + 120 || sy > cam.vh + 120) return;
  let alfa = 0;
  if (m.faza === 'krazy') {
    // krążąc, pokazuje się rzadko i na krótko
    const f = Math.sin(teraz * 0.0011 + m.kx * 0.7) * Math.sin(teraz * 0.00037 + m.ky);
    alfa = f > 0.55 ? Math.min(1, (f - 0.55) / 0.25) * 0.5 : 0;
  } else alfa = m.faza === 'podchodzi' ? 0.75 : 1;
  if (alfa <= 0) return;

  // ciemność gęstnieje wokół niego: mgła z kilku kłębów, które powoli się przelewają
  const R = Math.max(30, 3.2 * z);
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
  g.addColorStop(0, `rgba(0,0,0,${0.55 * alfa})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
  mgla(ctx, sx, sy + z * 0.6, z, alfa, teraz);

  const cel = m.faza === 'patrzy' && m.cel !== null ? sim.creatures.find((c) => c.id === m.cel && !c.dead) : undefined;
  if (cel) {
    const postep = Math.min(1, (sim.tick - m.od) / MROK.patrzyTikow);
    sylwetka(ctx, cam, m.x, m.y + 0.9, z, (0.22 + 0.1 * Math.sin(teraz * 0.004)) * (0.6 + postep), cel.x < m.x ? -1 : 1);
    // światło wokół samotnego gaśnie: ciemność zamyka się pierścieniem, im bliżej końca, tym ciaśniej
    // (dawniej czerwone kółko-licznik jak z interfejsu)
    const cx = cam.toScreenX(cel.x + 0.5), cy = cam.toScreenY(cel.y + 0.5);
    const rw = z * (4.2 - 3 * postep), rz = rw + z * 4;
    const gc = ctx.createRadialGradient(cx, cy, rw, cx, cy, rz);
    gc.addColorStop(0, 'rgba(0,0,0,0)');
    gc.addColorStop(0.3, `rgba(0,0,0,${0.45 + 0.35 * postep})`);
    gc.addColorStop(0.6, `rgba(0,0,0,${0.35 + 0.3 * postep})`);
    gc.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = gc;
    ctx.beginPath(); ctx.arc(cx, cy, rz, 0, Math.PI * 2); ctx.fill();
    // szept: znaki nieznanego pisma płyną od oczu do niego
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const f = ((teraz * 0.00035 + i / 3) % 1);
      const px = sx + (cx - sx) * f, py = sy + (cy - sy) * f - Math.sin(f * Math.PI) * z * 0.8;
      const s = Math.max(5, z * 0.32);
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(s, s);
      ctx.lineWidth = 1.3 / s;
      ctx.strokeStyle = `rgba(176,96,72,${Math.sin(f * Math.PI) * 0.55})`;
      ctx.stroke(glif(m.od + i * 13, 1));
      ctx.restore();
    }
    ctx.restore();
  }
  oczy(ctx, sx, sy, z, alfa, teraz, 1);
}

/**
 * Para oczu w mgle: wąskie, skośne szczeliny bladego żaru z ledwie widoczną poświatą, co jakiś czas mrugnięcie
 * (dawniej okrągłe oczka z wielką czerwoną poświatą — kreskówka, w ciemności dwa czerwone punkciki jak błąd).
 */
function oczy(ctx: CanvasRenderingContext2D, sx: number, sy: number, z: number, alfa: number, teraz: number, rozstaw: number): void {
  const r = Math.max(3, z * 0.17);
  const odst = Math.max(5, z * 0.3) * rozstaw;
  const mrug = Math.sin(teraz * 0.0007) > 0.96 ? 0.15 : 1;
  ctx.save();
  for (const d of [-1, 1]) {
    const x = sx + d * odst, y = sy;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
    g.addColorStop(0, `rgba(210,120,70,${0.35 * alfa})`);
    g.addColorStop(1, 'rgba(120,30,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6);
    ctx.fillStyle = `rgba(232,196,140,${0.8 * alfa})`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.26 * mrug, d * -0.35, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Mgła Patrzącego: ciemne kłęby wokół oczu, które powoli się przelewają. */
function mgla(ctx: CanvasRenderingContext2D, sx: number, sy: number, z: number, alfa: number, teraz: number): void {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const kat = i * 0.9 + teraz * 0.00025 * (i % 2 ? 1 : -1);
    const d = z * (0.6 + 0.5 * ((i * 3) % 4) / 3);
    const x = sx + Math.cos(kat) * d * 1.3, y = sy + Math.sin(kat) * d * 0.7 - z * 0.4;
    const R = z * (1.1 + 0.4 * Math.sin(teraz * 0.0009 + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(4,3,3,${0.4 * alfa})`); g.addColorStop(1, 'rgba(4,3,3,0)');
    ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  }
  ctx.restore();
}

/** Cień postaci z fresku (diabeł z „Kuszenia”) — ledwie widoczny, zlany z ciemnością. */
function sylwetka(ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, z: number, alfa: number, strona: number): void {
  const o = obrazFresku('diabel-2');
  if (!o || alfa <= 0.01) return;
  const h = Math.max(40, 3.4 * z), w = h * (o.naturalWidth / o.naturalHeight);
  const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
  ctx.save();
  ctx.globalAlpha = Math.min(1, alfa);
  ctx.filter = 'brightness(0.5) saturate(0.7)';
  ctx.translate(sx, sy);
  ctx.scale(strona, 1);
  // oczy sylwetki wypadają mniej więcej tam, gdzie świecą oczy w skale
  ctx.drawImage(o, -w * 0.5, -h * 0.22, w, h);
  ctx.filter = 'none';
  ctx.restore();
}

/** Jak długo (tiki) pali się lampka po zabranym. */
const LAMPKA_TIKOW = 3600;

/** Ciemność wciąga postać (`k` 0…1): kłęby i macki zaciskają się na miejscu, gdzie stała, i gasną w skale. */
function wciaganie(ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, z: number, k: number): void {
  const sx = cam.toScreenX(x), sy = cam.toScreenY(y + 1) - z * 1.1;
  const a = Math.sin(Math.min(1, k * 1.2) * Math.PI);
  if (a <= 0.01) return;
  ctx.save();
  const R = z * (2.4 - 1.6 * k);
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
  g.addColorStop(0, `rgba(2,1,1,${0.9 * a})`); g.addColorStop(0.6, `rgba(4,2,2,${0.5 * a})`); g.addColorStop(1, 'rgba(4,2,2,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
  ctx.strokeStyle = `rgba(4,2,2,${0.75 * a})`;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const kat = (i / 8) * Math.PI * 2 + 0.4, dl = z * (3.2 - 2.4 * k);
    const x0 = sx + Math.cos(kat) * dl, y0 = sy + Math.sin(kat) * dl * 0.8;
    ctx.lineWidth = Math.max(1, z * 0.12 * (1 - k * 0.6));
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(sx + Math.cos(kat + 0.9) * dl * 0.5, sy + Math.sin(kat + 0.9) * dl * 0.4, sx, sy);
    ctx.stroke();
  }
  ctx.restore();
}

/** Lampka, która została po zabranym: leży na ziemi i jeszcze się pali (`a` 0…1 — gaśnie na końcu). */
function lampka(ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, z: number, a: number, teraz: number): void {
  if (a <= 0.01) return;
  const sx = cam.toScreenX(x + 0.3), sy = cam.toScreenY(y + 1);
  const mig = 0.82 + 0.18 * Math.sin(teraz * 0.013) * Math.sin(teraz * 0.0071);
  const s = Math.max(3, z * 0.2);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = z * 1.8;
  const g = ctx.createRadialGradient(sx, sy - s, 0, sx, sy - s, R);
  g.addColorStop(0, `rgba(255,190,110,${0.38 * a * mig})`); g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - R, sy - s - R, R * 2, R * 2);
  ctx.globalCompositeOperation = 'source-over';
  // przewrócona lampka: korpus na boku, szkło z płomykiem
  ctx.translate(sx, sy - s * 0.55);
  ctx.rotate(1.25);
  ctx.globalAlpha = Math.min(1, a * 1.5);
  ctx.fillStyle = 'rgba(40,30,22,1)';
  ctx.strokeStyle = 'rgba(12,8,6,1)'; ctx.lineWidth = Math.max(1, s * 0.18);
  ctx.beginPath(); ctx.rect(-s * 0.45, -s * 0.7, s * 0.9, s * 1.4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgba(255,214,140,${0.9 * a * mig})`;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.22, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
