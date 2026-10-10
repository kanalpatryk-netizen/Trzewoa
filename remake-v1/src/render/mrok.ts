import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { Job } from '../sim/creatures';
import { rolaPostaci, klanLudu } from '../sim/lud';
import { MROK } from '../nastawy/mrok';
import { migotLampy } from './fresk';
import { glif } from './tajemnica';
import { obrazFresku } from './freski';
import { ustawienia } from '../core/settings-store';

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
  swiec(w.coreX + 0.5, w.coreY + 0.5, S.rdzen);
  for (const e of sim.efekty) if (e.rodzaj === 'cud') swiec(e.x, e.y, S.cud * (1 - e.t / e.max * 0.5));

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

  // zabranie: na chwilę widać sylwetkę, która gaśnie w skale
  if (zabrany < 300 && m.zabranyX !== undefined && m.zabranyY !== undefined) {
    const a = 1 - zabrany / 300;
    sylwetka(ctx, cam, m.zabranyX, m.zabranyY, z, 0.55 * a, 1);
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

  // ciemność gęstnieje wokół niego
  const R = Math.max(30, 3.2 * z);
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
  g.addColorStop(0, `rgba(0,0,0,${0.55 * alfa})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(sx - R, sy - R, R * 2, R * 2);

  const cel = m.faza === 'patrzy' && m.cel !== null ? sim.creatures.find((c) => c.id === m.cel && !c.dead) : undefined;
  if (cel) {
    const postep = Math.min(1, (sim.tick - m.od) / MROK.patrzyTikow);
    sylwetka(ctx, cam, m.x, m.y + 0.9, z, (0.22 + 0.1 * Math.sin(teraz * 0.004)) * (0.6 + postep), cel.x < m.x ? -1 : 1);
    // zamykające się koło wokół samotnego: ile czasu zostało
    const cx = cam.toScreenX(cel.x + 0.5), cy = cam.toScreenY(cel.y + 0.5);
    const r = Math.max(14, 1.5 * z);
    ctx.save();
    ctx.lineWidth = Math.max(1.5, z * 0.09);
    ctx.strokeStyle = `rgba(150,28,20,${0.35 + 0.3 * Math.sin(teraz * 0.009)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (1 - postep) * Math.PI * 2);
    ctx.stroke();
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
      ctx.strokeStyle = `rgba(207,90,58,${Math.sin(f * Math.PI) * 0.7})`;
      ctx.stroke(glif(m.od + i * 13, 1));
      ctx.restore();
    }
    ctx.restore();
  }
  oczy(ctx, sx, sy, z, alfa, teraz, 1);
}

/** Para oczu: żar w skale, źrenice jak szczeliny, co jakiś czas mrugnięcie. */
function oczy(ctx: CanvasRenderingContext2D, sx: number, sy: number, z: number, alfa: number, teraz: number, rozstaw: number): void {
  const r = Math.max(3.5, z * 0.2);
  const odst = Math.max(6, z * 0.36) * rozstaw;
  const mrug = Math.sin(teraz * 0.0007) > 0.96 ? 0.12 : 1;
  ctx.save();
  for (const d of [-1, 1]) {
    const x = sx + d * odst, y = sy;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, `rgba(255,150,90,${0.75 * alfa})`);
    g.addColorStop(0.4, `rgba(190,40,24,${0.35 * alfa})`);
    g.addColorStop(1, 'rgba(120,10,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    ctx.fillStyle = `rgba(255,226,170,${0.95 * alfa})`;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55 * mrug, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(30,6,4,${0.9 * alfa})`;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.18, r * 0.5 * mrug, 0, 0, Math.PI * 2); ctx.fill();
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
