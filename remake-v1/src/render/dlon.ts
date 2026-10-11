import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Rola } from '../sim/lud';
import { DLON } from '../nastawy/dlon';
import { ustawienia } from '../core/settings-store';

/**
 * Dłoń z otchłani (Koszmar): wielkie czerwone oczy w ciemności nieznanego i ogromna dłoń,
 * która wysuwa się z otchłani, chwyta jedną albo dwie postacie i cofa się z nimi w ciemność.
 * Rysowane po mroku i po postaciach — dłoń zamyka się na nich. Logika: src/sim/dlon.ts.
 */

const gladko = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

// ---------------------------------------------------------------- dłoń (jednostka = kafel)

/** Palce: miejsce u nasady (y), długość, grubość, rozchylenie (rad). */
const PALCE = [
  { y: -1.12, dl: 2.0, gr: 0.42, kat: -0.34 },
  { y: -0.4, dl: 2.45, gr: 0.47, kat: -0.12 },
  { y: 0.34, dl: 2.3, gr: 0.45, kat: 0.08 },
  { y: 1.02, dl: 1.75, gr: 0.37, kat: 0.28 },
];
const CZLONY = [0.46, 0.32, 0.22];
const ZGIECIE = [0.95, 1.15, 1.05];

const SKORA = '#1d1411';
const SKORA_JASNA = 'rgba(120,88,72,0.32)';
const KONTUR = 'rgba(6,3,2,0.95)';
const PAZUR = '#cdbda4';

function palec(ctx: CanvasRenderingContext2D, x: number, y: number, kat0: number, dl: number, gr: number, zacisk: number, kierunek: number, poswiata: number): void {
  // stawy palca: najpierw cały kształt, potem rysunek — bez ciemnych obręczy na stawach
  const pkt: [number, number][] = [[x, y]];
  const katy: number[] = [];
  let kat = kat0, px = x, py = y;
  for (let j = 0; j < 3; j++) {
    kat += ZGIECIE[j] * zacisk * kierunek;
    katy.push(kat);
    px += Math.cos(kat) * dl * CZLONY[j]; py += Math.sin(kat) * dl * CZLONY[j];
    pkt.push([px, py]);
  }
  const gr_ = (j: number) => gr * (1 - j * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // obrys z czerwoną poświatą oczu
  ctx.save();
  ctx.shadowColor = `rgba(190,26,14,${0.45 * poswiata})`;
  ctx.shadowBlur = 7;
  ctx.strokeStyle = KONTUR;
  for (let j = 0; j < 3; j++) {
    ctx.lineWidth = gr_(j) + 0.1;
    ctx.beginPath(); ctx.moveTo(...pkt[j]); ctx.lineTo(...pkt[j + 1]); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = SKORA;
  for (let j = 0; j < 3; j++) {
    ctx.lineWidth = gr_(j);
    ctx.beginPath(); ctx.moveTo(...pkt[j]); ctx.lineTo(...pkt[j + 1]); ctx.stroke();
  }
  // grzbiet palca odbija trochę światła; kostki i zmarszczki na stawach
  ctx.strokeStyle = SKORA_JASNA;
  for (let j = 0; j < 3; j++) {
    const k = katy[j], o = gr_(j) * 0.22;
    ctx.lineWidth = gr_(j) * 0.26;
    ctx.beginPath();
    ctx.moveTo(pkt[j][0] + Math.sin(k) * o, pkt[j][1] - Math.cos(k) * o);
    ctx.lineTo(pkt[j + 1][0] + Math.sin(k) * o, pkt[j + 1][1] - Math.cos(k) * o);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 0.035;
  for (let j = 1; j < 3; j++) {
    const k = (katy[j - 1] + katy[j]) / 2, g = gr_(j) * 0.36;
    for (const o of [-0.07, 0.05]) {
      const sx = pkt[j][0] + Math.cos(k) * o, sy = pkt[j][1] + Math.sin(k) * o;
      ctx.beginPath(); ctx.moveTo(sx - Math.sin(k) * g, sy + Math.cos(k) * g); ctx.lineTo(sx + Math.sin(k) * g, sy - Math.cos(k) * g); ctx.stroke();
    }
  }
  // pazur: zakrzywiony, kościany
  const kat3 = katy[2];
  const kp = kat3 + 0.35 * kierunek;
  const w0 = gr * 0.3;
  ctx.fillStyle = PAZUR;
  ctx.strokeStyle = KONTUR;
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(px - Math.sin(kat3) * w0, py + Math.cos(kat3) * w0);
  ctx.quadraticCurveTo(px + Math.cos(kat3) * 0.32, py + Math.sin(kat3) * 0.32, px + Math.cos(kp) * 0.55, py + Math.sin(kp) * 0.55);
  ctx.quadraticCurveTo(px + Math.cos(kat3) * 0.12, py + Math.sin(kat3) * 0.12, px + Math.sin(kat3) * w0, py - Math.cos(kat3) * w0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
}

/**
 * Dłoń w układzie lokalnym: (0, 0) — środek śródręcza, +x — ku palcom, palce od strony −y
 * zaciskają się w stronę +y, kciuk od +y w stronę −y. `zacisk` 0 — otwarta, 1 — pięść.
 * Ramię ciągnie się w −x i rozpływa w ciemności.
 */
export function rysujDlonLokalnie(ctx: CanvasRenderingContext2D, zacisk: number, poswiata = 1): void {
  // ramię: od nadgarstka w głąb otchłani, coraz ciemniejsze
  const ramie = ctx.createLinearGradient(-1.4, 0, -11, 0);
  ramie.addColorStop(0, SKORA);
  ramie.addColorStop(0.45, 'rgba(18,12,10,0.7)');
  ramie.addColorStop(1, 'rgba(10,6,5,0)');
  ctx.fillStyle = ramie;
  ctx.beginPath();
  ctx.moveTo(-1.3, -1.05);
  ctx.bezierCurveTo(-4, -1.35, -7, -1.6, -11, -1.8);
  ctx.lineTo(-11, 1.8);
  ctx.bezierCurveTo(-7, 1.6, -4, 1.3, -1.3, 1.1);
  ctx.closePath();
  ctx.fill();

  // śródręcze z czerwoną poświatą na obrysie
  const dlon = new Path2D();
  dlon.moveTo(-1.5, -1.05);
  dlon.bezierCurveTo(-0.6, -1.45, 0.6, -1.7, 1.3, -1.45);
  dlon.bezierCurveTo(1.55, -0.6, 1.55, 0.6, 1.3, 1.35);
  dlon.bezierCurveTo(0.5, 1.65, -0.7, 1.5, -1.5, 1.1);
  dlon.closePath();
  ctx.save();
  ctx.shadowColor = `rgba(200,30,18,${0.5 * poswiata})`;
  ctx.shadowBlur = 12;
  ctx.fillStyle = SKORA;
  ctx.fill(dlon);
  ctx.restore();
  const g = ctx.createRadialGradient(0.2, -0.5, 0.1, 0, 0, 1.9);
  g.addColorStop(0, 'rgba(120,86,70,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fill(dlon);
  // ścięgna na grzbiecie dłoni
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 0.06;
  for (const p of PALCE) {
    ctx.beginPath(); ctx.moveTo(-1.2, p.y * 0.55); ctx.quadraticCurveTo(0, p.y * 0.8, 1.15, p.y); ctx.stroke();
  }
  ctx.strokeStyle = KONTUR;
  ctx.lineWidth = 0.07;
  ctx.stroke(dlon);

  // kciuk od dołu, potem palce
  const katKciuka = 0.95 - zacisk * 0.25;
  palec(ctx, -0.35, 1.3, katKciuka, 1.75, 0.5, zacisk * 0.95, -1, poswiata);
  for (const p of PALCE) palec(ctx, 1.15, p.y, p.kat * (1 - zacisk * 0.7), p.dl, p.gr, zacisk, 1, poswiata);
  // kostki
  ctx.fillStyle = 'rgba(140,104,86,0.28)';
  for (const p of PALCE) { ctx.beginPath(); ctx.ellipse(1.15, p.y, p.gr * 0.42, p.gr * 0.32, 0, 0, Math.PI * 2); ctx.fill(); }
}

// ---------------------------------------------------------------- oczy

/** Para wielkich oczu: żar bez białek, pionowe źrenice patrzą na (px, py) w pikselach. */
export function rysujOczyOtchlani(ctx: CanvasRenderingContext2D, sx: number, sy: number, z: number, otwarcie: number, alfa: number, px: number, py: number, teraz: number): void {
  if (alfa <= 0.01) return;
  const rozstaw = DLON.oczyRozstaw * z * DLON.wielkosc;
  const w = 0.95 * z * DLON.wielkosc, h = 0.48 * z * DLON.wielkosc;
  const puls = 0.85 + 0.15 * Math.sin(teraz * 0.004);
  ctx.save();
  // ciemność gęstnieje wokół oczu
  const R = rozstaw * 1.4;
  const m = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
  m.addColorStop(0, `rgba(0,0,0,${0.75 * alfa})`);
  m.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = m;
  ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
  for (const s of [-1, 1]) {
    const ex = sx + s * rozstaw / 2, ey = sy;
    // czerwona łuna
    const l = ctx.createRadialGradient(ex, ey, 0, ex, ey, w * 3.2);
    l.addColorStop(0, `rgba(230,40,20,${0.55 * alfa * puls})`);
    l.addColorStop(0.35, `rgba(150,12,8,${0.28 * alfa * puls})`);
    l.addColorStop(1, 'rgba(80,0,0,0)');
    ctx.fillStyle = l;
    ctx.fillRect(ex - w * 3.2, ey - w * 3.2, w * 6.4, w * 6.4);
    if (otwarcie <= 0.02) continue;
    const hh = h * otwarcie;
    // migdał przechylony ku nosowi — gniew
    const oko = new Path2D();
    oko.moveTo(ex - s * w, ey - hh * 0.15);
    oko.quadraticCurveTo(ex, ey - hh * 1.5 + s * 0, ex + s * w, ey + hh * 0.35);
    oko.quadraticCurveTo(ex, ey + hh * 1.2, ex - s * w, ey - hh * 0.15);
    const t = ctx.createRadialGradient(ex, ey, 0, ex, ey, w);
    t.addColorStop(0, `rgba(255,190,110,${alfa})`);
    t.addColorStop(0.35, `rgba(240,70,30,${alfa})`);
    t.addColorStop(1, `rgba(120,8,4,${alfa})`);
    ctx.fillStyle = t;
    ctx.fill(oko);
    // źrenica: pionowa szczelina, patrzy na ofiarę
    ctx.save();
    ctx.clip(oko);
    const dx = Math.max(-1, Math.min(1, (px - ex) / (z * 8))) * w * 0.35;
    const dy = Math.max(-1, Math.min(1, (py - ey) / (z * 8))) * hh * 0.25;
    ctx.fillStyle = `rgba(12,0,0,${0.95 * alfa})`;
    ctx.beginPath(); ctx.ellipse(ex + dx, ey + dy, w * 0.12, hh * 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `rgba(20,2,1,${0.9 * alfa})`;
    ctx.lineWidth = Math.max(1, z * 0.06);
    ctx.stroke(oko);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- zabrani w pięści

function zabrany(ctx: CanvasRenderingContext2D, x: number, y: number, hgt: number, kolysanie: number, alfa: number): void {
  // bezwładna sylwetka zwisająca z pięści (głowa u góry, ręce i nogi w dół)
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.translate(x, y);
  ctx.rotate(kolysanie);
  ctx.strokeStyle = 'rgba(214,190,150,0.55)';
  ctx.fillStyle = 'rgba(28,20,16,0.95)';
  ctx.lineCap = 'round';
  const u = hgt / 10;
  ctx.lineWidth = u * 1.1;
  ctx.beginPath();
  ctx.moveTo(-u * 0.6, u * 4.5); ctx.lineTo(-u * 1.2, u * 9);
  ctx.moveTo(u * 0.6, u * 4.5); ctx.lineTo(u * 1.0, u * 9.2);
  ctx.moveTo(-u * 1, u * 1.2); ctx.lineTo(-u * 2, u * 5);
  ctx.moveTo(u * 1, u * 1.2); ctx.lineTo(u * 1.8, u * 5.2);
  ctx.stroke();
  ctx.lineWidth = u * 0.8;
  ctx.strokeStyle = 'rgba(28,20,16,0.95)';
  ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, u * 2.8, u * 1.3, u * 2.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(214,190,150,0.5)'; ctx.lineWidth = Math.max(0.8, u * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -u * 0.4, u * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- całość

export function rysujDlon(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const d = sim.lud.dlon;
  if (!DLON.wlaczona || !d || d.faza === 'brak') return;
  const z = cam.zoom;
  const t = sim.tick - d.od;
  const S = DLON.wielkosc;
  const ruch = !ustawienia.ograniczRuch;

  // kierunek sięgania: od brzegu otchłani do ofiar
  let dx = d.cx - d.bx, dy = d.cy - d.by;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl; dy /= dl;
  const lustro = dx < 0 ? -1 : 1;                      // palce zawsze od góry
  // gdzie w zaciśniętej pięści są ofiary (od środka śródręcza, w kaflach świata)
  const fa = 1.9 * S, fb = 0.25 * S * lustro;
  const piescX = fa * dx - fb * dy, piescY = fa * dy + fb * dx;

  // oczy
  let otwarcie = 1, alfaOczu = 1;
  if (d.faza === 'oczy') { otwarcie = gladko(t / 80); alfaOczu = gladko(t / 50); }
  if (d.faza === 'gasnie') { otwarcie = 1 - gladko(t / (DLON.gasnie * 0.5)); alfaOczu = 1 - gladko(t / DLON.gasnie); }
  // mrugnięcie w połowie patrzenia
  if (ruch && d.faza === 'oczy' && t > 220 && t < 236) otwarcie *= 0.1;
  rysujOczyOtchlani(ctx, cam.toScreenX(d.ox), cam.toScreenY(d.oy), z, otwarcie, alfaOczu, cam.toScreenX(d.cx), cam.toScreenY(d.cy), teraz);

  // dłoń: gdzie jest środek śródręcza (świat) i jak bardzo zaciśnięta
  const start = { x: d.bx - dx * 3 * S, y: d.by - dy * 3 * S };
  const cel = { x: d.cx - piescX, y: d.cy - piescY };
  const glebia = { x: d.bx - dx * 10 * S, y: d.by - dy * 10 * S };
  let px = 0, py = 0, zacisk = 0, alfa = 1, widac = true;
  if (d.faza === 'oczy') {
    // pod koniec patrzenia palce wychylają się z ciemności
    const k = gladko((t - DLON.oczy * 0.6) / (DLON.oczy * 0.4));
    widac = k > 0;
    px = start.x + dx * k * 1.5 * S; py = start.y + dy * k * 1.5 * S;
    alfa = k * 0.85;
  } else if (d.faza === 'siega') {
    const k = gladko(t / DLON.siega);
    const s0 = { x: start.x + dx * 1.5 * S, y: start.y + dy * 1.5 * S };
    px = s0.x + (cel.x - s0.x) * k; py = s0.y + (cel.y - s0.y) * k;
  } else if (d.faza === 'chwyta') {
    px = cel.x; py = cel.y;
    zacisk = gladko(t / (DLON.chwyta * 0.7));
  } else if (d.faza === 'cofa') {
    const k = gladko(t / DLON.cofa);
    // odpędzona Cudem cofa się z miejsca, do którego zdążyła sięgnąć (umownie: z brzegu)
    const z0 = d.odpedzona ? { x: start.x + dx * 1.5 * S, y: start.y + dy * 1.5 * S } : cel;
    px = z0.x + (glebia.x - z0.x) * k; py = z0.y + (glebia.y - z0.y) * k;
    zacisk = d.odpedzona ? 0.25 : 1;
    alfa = 1 - gladko((k - 0.45) / 0.55);
  } else widac = false;

  if (widac && alfa > 0.01) {
    const kolys = ruch ? Math.sin(teraz * 0.006) * 0.03 : 0;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(cam.toScreenX(px), cam.toScreenY(py));
    ctx.rotate(Math.atan2(dy, dx) + kolys);
    ctx.scale(z * S, z * S * lustro);
    rysujDlonLokalnie(ctx, zacisk, alfaOczu);
    ctx.restore();
    // zabrani wystają z zaciśniętej pięści (głowa i ramiona nad palcami, nogi zwisają) i znikają z nią w ciemności
    if (d.faza === 'cofa' && d.zabrani.length) {
      const hgt = Math.max(16, z * 1.9 * ustawienia.wielkoscSylwetek) * 0.9;
      const fx = px + piescX, fy = py + piescY;
      d.zabrani.forEach((_r: Rola, i) => {
        const o = (i - (d.zabrani.length - 1) / 2) * 0.7;
        zabrany(ctx, cam.toScreenX(fx + o), cam.toScreenY(fy) - hgt * 0.3, hgt, ruch ? Math.sin(teraz * 0.005 + i * 2) * 0.25 : 0, alfa);
      });
    }
  }
}
