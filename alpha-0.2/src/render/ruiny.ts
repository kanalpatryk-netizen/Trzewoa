import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Ruina } from '../sim/ruiny';
import type { TypZabytku } from '../nastawy/zabytki';
import { ZABYTKI } from '../nastawy/zabytki';
import { wolnoRuszac } from './nastroj';
import { wysokoscPostaci } from './figury';

/**
 * RUINY I ZABYTKI (Alpha, etap 3e) — rysunek zawalonych budowli z sim/ruiny.ts i animacje zabytków z sim/zabytki.ts:
 *  - mury z ciosów (bloki w wiązaniu, póki kafel muru jest lity), gruz, kamienne łuki i filary w tle, drewniane belki
 *    (słupy, oczepy, zwalone), w kopalni szyny i porzucony wózek; zabytek leży na posadzce, z rzadka błyska w mroku;
 *  - odkrycie: ze sklepienia sypie się kurz, zabytek rozbłyskuje, z wnętrza bije światło i zabytek unosi się nad
 *    posadzką — i wisi tak, kołysząc się, póki nie wybierzesz (karta: „Weź” albo „Zostaw”);
 *  - wzięcie: zabytek leci do tego, kto go odkrył, ten podnosi go nad głowę, błysk — a od niego rozchodzi się fala
 *    światła i iskry lecą do każdego z ludu (na głowach zapalają się aureole: jasna i czerwona);
 *  - zostawienie: zabytek opada na posadzkę, światło gaśnie, unosi się szary dym, a zostaje szary, zgaszony kształt.
 * Kamień i drewno rysują się przed mrokiem (ciemność je zakrywa), światło zabytku — nad mrokiem.
 * Animacje odkrycia, wzięcia i zostawienia idą tikami gry (od tiku zmiany stanu), kołysanie i błyski — zegarem ekranu.
 */

/** Tani skrót liczby — stałe kształty bloków i kierunki pyłu (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const TUSZ = 'rgba(20,12,8,0.95)';
/** Czas animacji (tiki gry): wzlot po odkryciu, lot do rąk i fala światła po wzięciu, gaśnięcie po zostawieniu. */
const WZLOT = ZABYTKI.kartaPo, DO_RAK = 90, NAD_GLOWA = 70, FALA = 110, GASNIE = 140;

/** Czy obrys ruiny jest w kadrze. */
function widac(cam: Camera, r: Ruina): boolean {
  const z = cam.zoom;
  const x1 = cam.toScreenX(r.x0 - 2), y1 = cam.toScreenY(r.y0 - 2), x2 = cam.toScreenX(r.x1 + 3), y2 = cam.toScreenY(r.dno + 2);
  return x2 > -z && y2 > -z && x1 < cam.vw + z && y1 < cam.vh + z;
}

export class Ruiny {
  /** Kamień, drewno i zabytek na posadzce — przed mrokiem. */
  rysuj(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
    const w = sim.world;
    const z = cam.zoom;
    const st = sim.lud.zabytki;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    w.ruiny.forEach((r, n) => {
      if (!widac(cam, r)) return;
      // łuki i filary w tle, potem belki, mury, gruz, a na wierzchu wózek
      for (const l of r.luki) luk(ctx, cam, l, r.dno, z);
      for (const b of r.belki) belka(ctx, cam, b, z);
      for (const i of r.mury) if (w.solid(i % w.w, (i / w.w) | 0)) ciosy(ctx, cam, i % w.w, (i / w.w) | 0, z, i);
      for (const i of r.gruz) if (w.solid(i % w.w, (i / w.w) | 0)) gruz(ctx, cam, i % w.w, (i / w.w) | 0, z, i);
      if (r.wozek) wozek(ctx, cam, r, z);
      // zabytek na posadzce: nieodkryty — przyćmiony; zostawiony — szary, zgaszony (gaśnie w rysujNad)
      const stan = st?.stan[n];
      const zx = cam.toScreenX(r.zabytek.x + 0.5), zy = cam.toScreenY(r.zabytek.y + 1);
      if (!stan) rysujZabytek(ctx, r.zabytek.typ, zx, zy - z * 0.18, z * 0.75, 0.8, 0);
      else if (stan === 'zostawiony' && sim.tick - (st!.od[n] ?? 0) >= GASNIE) rysujZabytek(ctx, r.zabytek.typ, zx, zy - z * 0.18, z * 0.75, 0.75, 1);
    });
    ctx.restore();
  }

  /** Światło zabytków, kurz, wzlot, lot do rąk, fala do ludu i gaśnięcie — nad mrokiem. */
  rysujNad(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
    const w = sim.world;
    const st = sim.lud.zabytki;
    const z = cam.zoom;
    const ruch = wolnoRuszac();
    ctx.save();
    w.ruiny.forEach((r, n) => {
      if (!widac(cam, r)) return;
      const stan = st?.stan[n];
      const zx = cam.toScreenX(r.zabytek.x + 0.5), dol = cam.toScreenY(r.zabytek.y + 1) - z * 0.18;
      if (!stan) {
        // nieodkryty: co kilka sekund krótki błysk w ciemności — żeby było widać, że coś tam leży
        const f = ((teraz / 1000 + n * 1.7) % 4.2) / 4.2;
        if (ruch && f < 0.12) blask(ctx, zx, dol - z * 0.2, z * 0.9, 0.5 * Math.sin((f / 0.12) * Math.PI), 0.25);
        return;
      }
      const dt = sim.tick - (st!.od[n] ?? 0);
      const bob = ruch ? Math.sin(teraz * 0.003 + n) * z * 0.08 : 0;
      if (stan === 'odkryty') {
        const p = gladko(dt / WZLOT);
        const y = dol - p * z * 0.95 + (p >= 1 ? bob : 0);
        kurz(ctx, cam, r, z, dt);
        swiatlo(ctx, zx, y, z, p, teraz, ruch);
        rysujZabytek(ctx, r.zabytek.typ, zx, y, z * 0.75 * (1 + 0.15 * p), 1, 0);
      } else if (stan === 'wziety') {
        wziecie(ctx, sim, cam, r, n, zx, dol - z * 0.95, z, dt, teraz);
      } else if (stan === 'zostawiony' && dt < GASNIE) {
        // opada na posadzkę, światło gaśnie, a z gasnącego zabytku idzie szary dym
        const p = gladko(dt / GASNIE);
        const y = dol - (1 - p) * z * 0.95;
        swiatlo(ctx, zx, y, z, 1 - p, teraz, ruch);
        rysujZabytek(ctx, r.zabytek.typ, zx, y, z * 0.75 * (1.15 - 0.15 * p), 1, p);
        for (let k = 0; k < 7; k++) {
          const q = (p + k / 7) % 1;
          ctx.fillStyle = `rgba(120,116,110,${0.35 * Math.sin(q * Math.PI) * (1 - p * 0.6)})`;
          ctx.beginPath(); ctx.arc(zx + (los(k * 5 + n) - 0.5) * z * 0.8 + Math.sin(q * 6 + k) * z * 0.15, y - q * z * 1.8, z * (0.12 + q * 0.3), 0, Math.PI * 2); ctx.fill();
        }
      }
    });
    ctx.restore();
  }
}

/** Wzięcie: lot do rąk odkrywcy, zabytek nad jego głową z błyskiem, potem fala światła i iskry do każdego z ludu. */
function wziecie(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, r: Ruina, n: number, zx: number, zy: number, z: number, dt: number, teraz: number): void {
  if (dt > DO_RAK + NAD_GLOWA + FALA) return;
  const kto = sim.creatureById(sim.lud.zabytki?.kto[n] ?? -1);
  const kx = kto && !kto.dead ? cam.toScreenX(kto.x) : zx;
  const h = kto ? wysokoscPostaci(kto, z) : z * 2;
  const ky = kto && !kto.dead ? cam.toScreenY(kto.y + 1) - h * 1.15 : zy;
  if (dt < DO_RAK) {
    // leci łukiem do rąk
    const p = gladko(dt / DO_RAK);
    const x = zx + (kx - zx) * p, y = zy + (ky - zy) * p - Math.sin(p * Math.PI) * z * 1.2;
    swiatlo(ctx, x, y, z, 1, teraz, wolnoRuszac());
    rysujZabytek(ctx, r.zabytek.typ, x, y, z * 0.85, 1, 0);
    return;
  }
  const t2 = dt - DO_RAK;
  if (t2 < NAD_GLOWA) {
    // podnosi go nad głowę — błysk
    const p = t2 / NAD_GLOWA;
    blask(ctx, kx, ky, z * (1.5 + 2.5 * p), 0.8 * Math.sin(p * Math.PI), 1);
    rysujZabytek(ctx, r.zabytek.typ, kx, ky - p * z * 0.3, z * 0.85, 1, 0);
    return;
  }
  // fala światła od niego i iskry do każdego z ludu (aureole zapalają się same — figury.ts)
  const p = (t2 - NAD_GLOWA) / FALA;
  ctx.strokeStyle = `rgba(255,236,170,${0.7 * (1 - p)})`;
  ctx.lineWidth = Math.max(2, z * 0.15 * (1 - p));
  ctx.beginPath(); ctx.ellipse(kx, ky + h * 0.6, z * (1 + 14 * p), z * (0.5 + 5 * p), 0, 0, Math.PI * 2); ctx.stroke();
  rysujZabytek(ctx, r.zabytek.typ, kx, ky - z * 0.3 - p * z * 0.8, z * 0.85 * (1 - p), 1 - p, 0);
  for (const c of sim.creatures) {
    if (c.dead || !c.rola || c.straznik) continue;
    const tx = cam.toScreenX(c.x), ty = cam.toScreenY(c.y + 1) - wysokoscPostaci(c, z) * 1.1;
    const q = gladko(p * 1.3);
    if (q >= 1) continue;
    const x = kx + (tx - kx) * q, y = ky + (ty - ky) * q - Math.sin(q * Math.PI) * z * 1.5;
    blask(ctx, x, y, z * 0.5, 0.9 * (1 - q * 0.5), 1);
  }
}

/** Kurz sypiący się ze sklepienia ruiny przez pierwsze chwile po odkryciu. */
function kurz(ctx: CanvasRenderingContext2D, cam: Camera, r: Ruina, z: number, dt: number): void {
  if (dt > WZLOT * 1.6) return;
  const p = dt / (WZLOT * 1.6);
  for (let k = 0; k < 26; k++) {
    const fx = r.x0 + 1 + los(k * 13) * (r.x1 - r.x0 - 1);
    const start = los(k * 7) * 0.5;
    const q = (p - start) / 0.5;
    if (q <= 0 || q >= 1) continue;
    const x = cam.toScreenX(fx) + Math.sin(q * 4 + k) * z * 0.1;
    const y = cam.toScreenY(r.y0 + 0.5) + q * (cam.toScreenY(r.dno) - cam.toScreenY(r.y0 + 0.5));
    ctx.fillStyle = `rgba(196,176,140,${0.6 * (1 - q)})`;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, z * (0.04 + 0.05 * los(k))), 0, Math.PI * 2); ctx.fill();
  }
  // obłok przy posadzce
  const yd = cam.toScreenY(r.dno);
  for (let k = 0; k < 8; k++) {
    const x = cam.toScreenX(r.x0 + 1 + los(k * 3 + 1) * (r.x1 - r.x0 - 1));
    ctx.fillStyle = `rgba(190,170,136,${0.25 * Math.sin(p * Math.PI)})`;
    ctx.beginPath(); ctx.arc(x, yd - z * 0.3, z * (0.3 + 0.5 * p), 0, Math.PI * 2); ctx.fill();
  }
}

/** Światło z wnętrza ruiny wokół zabytku: poświata, promienie z niego i obracający się pierścień (`p` — siła 0..1). */
function swiatlo(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, p: number, teraz: number, ruch: boolean): void {
  if (p <= 0.01) return;
  const R = z * (1.2 + 2.2 * p);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,240,190,${0.65 * p})`); g.addColorStop(0.4, `rgba(255,214,140,${0.28 * p})`); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  // promienie
  const obrot = ruch ? teraz * 0.0004 : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 8; k++) {
    const a = obrot + (k / 8) * Math.PI * 2;
    const dl = z * (1.1 + 1.6 * p) * (0.7 + 0.3 * los(k));
    const pr = ctx.createLinearGradient(x, y, x + Math.cos(a) * dl, y + Math.sin(a) * dl);
    pr.addColorStop(0, `rgba(255,230,160,${0.35 * p})`); pr.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.strokeStyle = pr; ctx.lineWidth = Math.max(1, z * 0.12);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * dl, y + Math.sin(a) * dl); ctx.stroke();
  }
  ctx.restore();
  // pierścień pod zabytkiem
  ctx.strokeStyle = `rgba(255,226,150,${0.6 * p})`;
  ctx.lineWidth = Math.max(1, z * 0.06);
  ctx.beginPath(); ctx.ellipse(x, y + z * 0.55, z * 0.7 * p, z * 0.18 * p, 0, 0, Math.PI * 2); ctx.stroke();
}

/** Krótki błysk (gwiazdka z poświatą). */
function blask(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, a: number, rdzen: number): void {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,246,210,${a})`); g.addColorStop(1, 'rgba(255,230,160,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.strokeStyle = `rgba(255,250,230,${a * rdzen})`; ctx.lineWidth = Math.max(1, R * 0.06);
  ctx.beginPath(); ctx.moveTo(x - R * 0.5, y); ctx.lineTo(x + R * 0.5, y); ctx.moveTo(x, y - R * 0.5); ctx.lineTo(x, y + R * 0.5); ctx.stroke();
}

/** Mur z ciosów w kaflu (x, y): dwa rzędy bloków w wiązaniu, fugi tuszem, każdy blok w trochę innym odcieniu. */
function ciosy(ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, z: number, i: number): void {
  const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
  for (let rz = 0; rz < 2; rz++) {
    const przes = (y * 2 + rz) % 2 ? 0.5 : 0;
    for (let k = -1; k < 2; k++) {
      const bx0 = Math.max(0, (k + przes) * 0.5 + 0.0), bx1 = Math.min(1, (k + przes) * 0.5 + 0.5);
      if (bx1 <= bx0) continue;
      const v = los(i * 7 + rz * 3 + k);
      ctx.fillStyle = `rgba(${104 + Math.round(30 * v)},${94 + Math.round(26 * v)},${80 + Math.round(20 * v)},0.97)`;
      ctx.fillRect(sx + bx0 * z, sy + rz * z * 0.5, (bx1 - bx0) * z, z * 0.5);
      ctx.strokeStyle = 'rgba(30,22,16,0.85)'; ctx.lineWidth = Math.max(0.6, z * 0.05);
      ctx.strokeRect(sx + bx0 * z, sy + rz * z * 0.5, (bx1 - bx0) * z, z * 0.5);
    }
  }
  // tu i ówdzie pęknięcie
  if (los(i) < 0.3) {
    ctx.strokeStyle = 'rgba(30,22,16,0.7)'; ctx.lineWidth = Math.max(0.6, z * 0.04);
    ctx.beginPath(); ctx.moveTo(sx + z * 0.2, sy + z * 0.1); ctx.lineTo(sx + z * 0.4, sy + z * 0.45); ctx.lineTo(sx + z * 0.32, sy + z * 0.85); ctx.stroke();
  }
}

/** Gruz po zawalonym sklepieniu: kupka kamieni różnej wielkości. */
function gruz(ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, z: number, i: number): void {
  const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
  ctx.fillStyle = 'rgba(52,44,38,0.97)'; ctx.fillRect(sx, sy, z, z);
  for (let k = 0; k < 6; k++) {
    const px = sx + z * (0.12 + 0.76 * los(i * 5 + k)), py = sy + z * (0.2 + 0.7 * los(i * 9 + k));
    const r = z * (0.12 + 0.12 * los(i + k * 3));
    const v = los(i * 3 + k);
    ctx.fillStyle = `rgba(${110 + Math.round(30 * v)},${100 + Math.round(26 * v)},${86 + Math.round(20 * v)},0.98)`;
    ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.6, z * 0.04);
    ctx.beginPath(); ctx.ellipse(px, py, r * 1.25, r, los(k + i) * 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

/** Kamienny łuk w tle (od x0 do x1, podstawa na y), z klińcami; z filarami do posadzki, gdy `filary`. */
function luk(ctx: CanvasRenderingContext2D, cam: Camera, l: Ruina['luki'][number], dno: number, z: number): void {
  const cx = cam.toScreenX((l.x0 + l.x1) / 2), cy = cam.toScreenY(l.y);
  const R = ((l.x1 - l.x0) / 2) * z, gr = z * 0.32;
  ctx.save();
  ctx.globalAlpha = 0.9;
  if (l.filary) {
    for (const fx of [l.x0, l.x1]) {
      const x = cam.toScreenX(fx);
      ctx.fillStyle = 'rgba(96,86,74,0.95)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.8, z * 0.05);
      ctx.beginPath(); ctx.rect(x - gr / 2, cy, gr, cam.toScreenY(dno) - cy); ctx.fill(); ctx.stroke();
      // głowica i baza
      ctx.beginPath(); ctx.rect(x - gr * 0.8, cy - z * 0.08, gr * 1.6, z * 0.14); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(x - gr * 0.8, cam.toScreenY(dno) - z * 0.14, gr * 1.6, z * 0.14); ctx.fill(); ctx.stroke();
    }
  }
  // klińce łuku
  const n = Math.max(5, Math.round(R / (z * 0.35)));
  for (let k = 0; k < n; k++) {
    const a0 = Math.PI + (k / n) * Math.PI, a1 = Math.PI + ((k + 1) / n) * Math.PI;
    const v = los(k * 11 + Math.round(l.x0));
    ctx.fillStyle = `rgba(${112 + Math.round(26 * v)},${100 + Math.round(22 * v)},${86 + Math.round(18 * v)},0.96)`;
    ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.6, z * 0.045);
    ctx.beginPath();
    ctx.arc(cx, cy, R + gr / 2, a0, a1);
    ctx.arc(cx, cy, Math.max(1, R - gr / 2), a1, a0, true);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/** Belka z ciemnego drewna (odcinek w kaflach), z sękami i gwoździami na końcach. */
function belka(ctx: CanvasRenderingContext2D, cam: Camera, b: Ruina['belki'][number], z: number): void {
  const x0 = cam.toScreenX(b[0]), y0 = cam.toScreenY(b[1]), x1 = cam.toScreenX(b[2]), y1 = cam.toScreenY(b[3]);
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(2.5, z * 0.26);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = 'rgba(96,64,38,0.98)'; ctx.lineWidth = Math.max(1.5, z * 0.17);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = 'rgba(140,100,62,0.7)'; ctx.lineWidth = Math.max(0.6, z * 0.04);
  ctx.beginPath(); ctx.moveTo(x0, y0 - z * 0.03); ctx.lineTo(x1, y1 - z * 0.03); ctx.stroke();
  ctx.fillStyle = 'rgba(40,40,44,0.95)';
  for (const [px, py] of [[x0, y0], [x1, y1]]) { ctx.beginPath(); ctx.arc(px, py, Math.max(0.8, z * 0.05), 0, Math.PI * 2); ctx.fill(); }
}

/** Kopalnia: szyny po spągu na całej długości chodnika i porzucony wózek na kołach. */
function wozek(ctx: CanvasRenderingContext2D, cam: Camera, r: Ruina, z: number): void {
  const yd = cam.toScreenY(r.dno) - z * 0.06;
  ctx.strokeStyle = 'rgba(70,64,60,0.95)'; ctx.lineWidth = Math.max(1, z * 0.07);
  ctx.beginPath(); ctx.moveTo(cam.toScreenX(r.x0), yd); ctx.lineTo(cam.toScreenX(r.x1 + 1), yd); ctx.stroke();
  // podkłady
  ctx.strokeStyle = 'rgba(90,60,36,0.9)'; ctx.lineWidth = Math.max(1, z * 0.1);
  for (let x = r.x0; x <= r.x1; x++) { ctx.beginPath(); ctx.moveTo(cam.toScreenX(x + 0.2), yd + z * 0.04); ctx.lineTo(cam.toScreenX(x + 0.7), yd + z * 0.04); ctx.stroke(); }
  if (!r.wozek) return;
  const wx = cam.toScreenX(r.wozek[0] + 0.5), wy = yd - z * 0.18;
  ctx.fillStyle = 'rgba(92,66,44,0.98)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.06);
  ctx.beginPath();
  ctx.moveTo(wx - z * 0.75, wy - z * 0.75); ctx.lineTo(wx + z * 0.75, wy - z * 0.75); ctx.lineTo(wx + z * 0.6, wy); ctx.lineTo(wx - z * 0.6, wy); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,60,66,0.9)'; ctx.lineWidth = Math.max(1, z * 0.07);
  ctx.beginPath(); ctx.moveTo(wx - z * 0.7, wy - z * 0.45); ctx.lineTo(wx + z * 0.7, wy - z * 0.45); ctx.stroke();
  ctx.fillStyle = 'rgba(50,50,54,0.98)';
  for (const dx of [-0.38, 0.38]) { ctx.beginPath(); ctx.arc(wx + dx * z, wy + z * 0.02, z * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = TUSZ; ctx.stroke(); }
}


/**
 * Zabytek na ekranie: środek dołu w (x, y), rozmiar `s` (pikseli na kafel), `alfa`; `szary` 0..1 — zgaszony
 * (zostawiony: barwy szarzeją). Relikwiarz — srebrna skrzynka z dwuspadowym daszkiem i złotym krzyżykiem; miecz —
 * długie ostrze, jelec i głowica; kielich — złota czasza na nóżce; księga — skórzana oprawa z klamrą i krzyżem.
 */
export function rysujZabytek(ctx: CanvasRenderingContext2D, typ: TypZabytku, x: number, y: number, s: number, alfa: number, szary: number): void {
  const mieszaj = (r: number, g: number, b: number, a = 0.98) => {
    const sz = (r + g + b) / 3 * 0.75;
    return `rgba(${Math.round(r + (sz - r) * szary)},${Math.round(g + (sz - g) * szary)},${Math.round(b + (sz - b) * szary)},${a})`;
  };
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alfa));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, s * 0.06);
  if (typ === 'relikwiarz') {
    const w = s * 0.9, h = s * 0.5;
    ctx.fillStyle = mieszaj(176, 178, 186);
    ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mieszaj(196, 198, 206);
    ctx.beginPath(); ctx.moveTo(x - w * 0.56, y - h); ctx.lineTo(x, y - h - s * 0.32); ctx.lineTo(x + w * 0.56, y - h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = mieszaj(226, 186, 92); ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath(); ctx.moveTo(x, y - h - s * 0.32); ctx.lineTo(x, y - h - s * 0.6); ctx.moveTo(x - s * 0.1, y - h - s * 0.5); ctx.lineTo(x + s * 0.1, y - h - s * 0.5); ctx.stroke();
    ctx.fillStyle = mieszaj(170, 40, 50);
    for (const dx of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.arc(x + dx * w, y - h * 0.5, s * 0.05, 0, Math.PI * 2); ctx.fill(); }
  } else if (typ === 'miecz') {
    // leży ukośnie: ostrze w prawo, rękojeść w lewo
    ctx.save(); ctx.translate(x, y - s * 0.15); ctx.rotate(-0.25);
    ctx.fillStyle = mieszaj(200, 204, 214);
    ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.05); ctx.lineTo(s * 0.75, -s * 0.03); ctx.lineTo(s * 0.85, 0); ctx.lineTo(s * 0.75, s * 0.03); ctx.lineTo(-s * 0.25, s * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mieszaj(170, 132, 64);
    ctx.beginPath(); ctx.rect(-s * 0.3, -s * 0.2, s * 0.08, s * 0.4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mieszaj(90, 58, 36);
    ctx.beginPath(); ctx.rect(-s * 0.55, -s * 0.04, s * 0.25, s * 0.08); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mieszaj(196, 160, 80);
    ctx.beginPath(); ctx.arc(-s * 0.6, 0, s * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (typ === 'kielich') {
    ctx.fillStyle = mieszaj(214, 172, 80);
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.03, s * 0.28, s * 0.06, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(x - s * 0.05, y - s * 0.4, s * 0.1, s * 0.36); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.32, y - s * 0.78); ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.38, x, y - s * 0.38); ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.38, x + s * 0.32, y - s * 0.78); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mieszaj(70, 20, 24);
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.78, s * 0.3, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    const w = s * 0.75, h = s * 0.32;
    ctx.fillStyle = mieszaj(232, 220, 190);
    ctx.beginPath(); ctx.rect(x - w / 2 + s * 0.03, y - h, w - s * 0.06, h); ctx.fill();
    ctx.fillStyle = mieszaj(96, 44, 30);
    ctx.beginPath(); ctx.rect(x - w / 2, y - h - s * 0.06, w, s * 0.1); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(x - w / 2, y - s * 0.06, w, s * 0.08); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = mieszaj(214, 172, 80); ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath(); ctx.moveTo(x, y - h - s * 0.05); ctx.lineTo(x, y - h + s * 0.1); ctx.moveTo(x - s * 0.08, y - h - s * 0.01); ctx.lineTo(x + s * 0.08, y - h - s * 0.01); ctx.stroke();
    ctx.fillStyle = mieszaj(196, 160, 80);
    ctx.beginPath(); ctx.rect(x + w / 2 - s * 0.04, y - h * 0.65, s * 0.08, s * 0.12); ctx.fill();
  }
  ctx.restore();
}

/**
 * Rycina atlasu: zawalona kaplica — mury z ciosów, łuk z filarami, zwalona belka i gruz, a w środku zabytek, który
 * unosi się w świetle (cx — środek, yp — posadzka, z — pikseli na kafel, t — zegar).
 */
export function ruinaNaRycinie(ctx: CanvasRenderingContext2D, cx: number, yp: number, z: number, t: number, typ: TypZabytku): void {
  const cam = { toScreenX: (x: number) => cx + x * z, toScreenY: (y: number) => yp + y * z, zoom: z } as unknown as Camera;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  luk(ctx, cam, { x0: -3, x1: 0, y: -3.5, filary: true }, 0, z);
  luk(ctx, cam, { x0: 0, x1: 3, y: -3.5, filary: true }, 0, z);
  belka(ctx, cam, [3.6, -5.2, 1.6, -0.4], z);
  for (let x = -5; x <= 4; x++) ciosy(ctx, cam, x, 0, z, x + 40);
  for (let y = -5; y < 0; y++) { ciosy(ctx, cam, -5, y, z, y * 7 + 3); if (y < -2) ciosy(ctx, cam, 4, y, z, y * 5 + 9); }
  for (let x = -5; x <= 0; x++) ciosy(ctx, cam, x, -6, z, x * 3 + 77);
  gruz(ctx, cam, 2, -1, z, 5); gruz(ctx, cam, 3, -1, z, 9); gruz(ctx, cam, 3, -2, z, 13);
  const bob = Math.sin(t * 0.003) * z * 0.08;
  swiatlo(ctx, cx + z * 0.5, yp - z * 1.4 + bob, z, 1, t, true);
  rysujZabytek(ctx, typ, cx + z * 0.5, yp - z * 1.1 + bob, z * 0.9, 1, 0);
  ctx.restore();
}

/** Rycina atlasu: zabytek w świetle (do tablicy „Zabytki” — cztery obok siebie). */
export function zabytekNaRycinie(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, typ: TypZabytku, faza: number): void {
  const bob = Math.sin(t * 0.003 + faza) * z * 0.08;
  swiatlo(ctx, x, y - z * 0.3 + bob, z * 0.8, 0.8, t + faza * 500, true);
  rysujZabytek(ctx, typ, x, y + bob, z, 1, 0);
}
