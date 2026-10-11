import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Rola } from '../sim/lud';
import { DLON } from '../nastawy/dlon';
import { ustawienia } from '../core/settings-store';
import arkuszUrl from '../grafiki/dlon/dlon-z-otchlani.webp';

/**
 * Dłoń z otchłani (Koszmar): wielkie czerwone oczy w ciemności nieznanego i ogromna dłoń,
 * która wysuwa się z otchłani, chwyta jedną albo dwie postacie i cofa się z nimi w ciemność.
 * Dłoń to klatki wyrenderowane z trójwymiarowego modelu (scripts/dlon/: kości, ścięgna, żyły,
 * stawy ze zmarszczkami, rogowe szpony; czerwona łuna oczu zza dłoni i ciepłe światło lampek
 * od strony palców) — od otwartej, szponiastej dłoni po zaciśniętą pięść.
 * Rysowane po mroku i po postaciach — dłoń zamyka się na nich. Logika: src/sim/dlon.ts.
 */

const gladko = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

// ---------------------------------------------------------------- arkusz klatek

/**
 * Arkusz: 10 klatek (2 kolumny × 5 rzędów) po 792×360 px, od otwartej dłoni do pięści.
 * Kadr obejmuje płaszczyznę obrazu x ∈ [−17, 27], y ∈ [−11, 9] w jednostkach modelu
 * (18 px na jednostkę); nadgarstek to (0, 0), palce celują w +x, kciuk jest u dołu.
 */
const ARKUSZ = { kolumny: 2, klatek: 10, szer: 792, wys: 360, x0: -17, y1: 9, pxNaJedn: 18 };
/** Miejsce chwytu (między palcami a kciukiem) w otwartej dłoni i środek zaciśniętej pięści — jednostki modelu. */
const CHWYT_OTWARTA = { x: 18, y: -6.0 };
const CHWYT_PIESC = { x: 10, y: -3.3 };
/** Koniec najdłuższego szponu (od nadgarstka) — do wychylania się z ciemności. */
const ZASIEG_SZPONOW = 25.5;
/** Kafle świata na jednostkę modelu przy DLON.wielkosc = 1 (dłoń z szponami ok. 5,4 kafla). */
const KAFLE_NA_JEDN = 0.21;

let arkusz: HTMLImageElement | null = null;
function obrazArkusza(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!arkusz) { arkusz = new Image(); arkusz.src = arkuszUrl; }
  return arkusz.complete && arkusz.naturalWidth > 0 ? arkusz : null;
}

/** Miejsce chwytu dla danego zacisku (0 — otwarta, 1 — pięść), w jednostkach modelu. */
function chwyt(zacisk: number): { x: number; y: number } {
  const k = gladko(zacisk);
  return { x: CHWYT_OTWARTA.x + (CHWYT_PIESC.x - CHWYT_OTWARTA.x) * k, y: CHWYT_OTWARTA.y + (CHWYT_PIESC.y - CHWYT_OTWARTA.y) * k };
}

/**
 * Rysuje klatkę dłoni: nadgarstek w (sx, sy) na ekranie, palce w kierunku `kat`, `skala` — piksele
 * ekranu na jednostkę modelu. `lustro` −1 odbija dłoń w pionie (żeby palce były zawsze u góry).
 * Za obrysem świeci czerwona łuna oczu.
 */
export function rysujKlatkeDloni(ctx: CanvasRenderingContext2D, sx: number, sy: number, kat: number, skala: number, zacisk: number, lustro: number, alfa: number, luna = 1): boolean {
  const o = obrazArkusza();
  if (!o) return false;
  const k = Math.max(0, Math.min(ARKUSZ.klatek - 1, Math.round(zacisk * (ARKUSZ.klatek - 1))));
  const kx = (k % ARKUSZ.kolumny) * ARKUSZ.szer, ky = Math.floor(k / ARKUSZ.kolumny) * ARKUSZ.wys;
  const s = skala / ARKUSZ.pxNaJedn;
  const wx = -ARKUSZ.x0 * ARKUSZ.pxNaJedn, wy = ARKUSZ.y1 * ARKUSZ.pxNaJedn;   // nadgarstek w pikselach klatki
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.translate(sx, sy);
  ctx.rotate(kat);
  ctx.scale(s, s * lustro);
  if (luna > 0) {
    ctx.shadowColor = `rgba(200,24,12,${0.75 * luna})`;
    ctx.shadowBlur = Math.max(6, skala * 0.9);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(o, kx, ky, ARKUSZ.szer, ARKUSZ.wys, -wx, -wy, ARKUSZ.szer, ARKUSZ.wys);
  ctx.restore();
  return true;
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
  const ruch = !ustawienia.ograniczRuch;

  // kierunek sięgania: od brzegu otchłani do ofiar
  let dx = d.cx - d.bx, dy = d.cy - d.by;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl; dy /= dl;
  const lustro = dx < 0 ? -1 : 1;                      // palce zawsze od góry
  const k = KAFLE_NA_JEDN * DLON.wielkosc;             // kafle świata na jednostkę modelu
  // punkt modelu (x w stronę palców, y w górę obrazu) → świat
  const doSwiata = (wx: number, wy: number, mx: number, my: number) => ({
    x: wx + (mx * dx + my * lustro * dy) * k,
    y: wy + (mx * dy - my * lustro * dx) * k,
  });
  // gdzie musi być nadgarstek, żeby miejsce chwytu (przy danym zacisku) wypadło na ofiarach
  const nadgarstekNaCelu = (zacisk: number) => {
    const g = chwyt(zacisk);
    const p = doSwiata(0, 0, g.x, g.y);
    return { x: d.cx - p.x, y: d.cy - p.y };
  };

  // oczy
  let otwarcie = 1, alfaOczu = 1;
  if (d.faza === 'oczy') { otwarcie = gladko(t / 80); alfaOczu = gladko(t / 50); }
  if (d.faza === 'gasnie') { otwarcie = 1 - gladko(t / (DLON.gasnie * 0.5)); alfaOczu = 1 - gladko(t / DLON.gasnie); }
  // mrugnięcie w połowie patrzenia
  if (ruch && d.faza === 'oczy' && t > 220 && t < 236) otwarcie *= 0.1;
  rysujOczyOtchlani(ctx, cam.toScreenX(d.ox), cam.toScreenY(d.oy), z, otwarcie, alfaOczu, cam.toScreenX(d.cx), cam.toScreenY(d.cy), teraz);

  // nadgarstek: z głębi otchłani (szpony dopiero sięgają brzegu) do miejsca chwytu i z powrotem
  const ukryta = { x: d.bx - dx * (ZASIEG_SZPONOW + 2) * k, y: d.by - dy * (ZASIEG_SZPONOW + 2) * k };
  const wychylona = { x: d.bx - dx * (ZASIEG_SZPONOW - 3) * k, y: d.by - dy * (ZASIEG_SZPONOW - 3) * k };
  const glebia = { x: d.bx - dx * (ZASIEG_SZPONOW + 12) * k, y: d.by - dy * (ZASIEG_SZPONOW + 12) * k };
  const mix = (a: { x: number; y: number }, b: { x: number; y: number }, u: number) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  let w = ukryta, zacisk = 0, alfa = 1, widac = true;
  // palce drgają, gdy dłoń się zbliża — jak u kogoś, kto już czuje zdobycz
  const drganie = ruch ? 0.06 + 0.05 * Math.sin(teraz * 0.011) : 0.06;
  if (d.faza === 'oczy') {
    // pod koniec patrzenia szpony wychylają się z ciemności
    const u = gladko((t - DLON.oczy * 0.55) / (DLON.oczy * 0.45));
    widac = u > 0;
    w = mix(ukryta, wychylona, u);
    alfa = u;
    zacisk = drganie;
  } else if (d.faza === 'siega') {
    const u = gladko(t / DLON.siega);
    w = mix(wychylona, nadgarstekNaCelu(0), u);
    zacisk = drganie * (1 - u);
  } else if (d.faza === 'chwyta') {
    zacisk = gladko(t / (DLON.chwyta * 0.85));
    w = nadgarstekNaCelu(zacisk);                      // pięść zamyka się na nich, nie obok
  } else if (d.faza === 'cofa') {
    const u = gladko(t / DLON.cofa);
    zacisk = d.odpedzona ? 0.25 : 1;
    w = mix(d.odpedzona ? wychylona : nadgarstekNaCelu(1), glebia, u);
    alfa = 1 - gladko((u - 0.5) / 0.5);
  } else widac = false;

  if (!widac || alfa <= 0.01) return;
  const kat = Math.atan2(dy, dx) + (ruch ? Math.sin(teraz * 0.0045) * 0.025 : 0);
  // zabrani zwisają z pięści — pięść zakrywa głowy, widać bezwładne nogi — i znikają z nią w ciemności
  if (d.faza === 'cofa' && d.zabrani.length) {
    const hgt = Math.max(16, z * 1.9 * ustawienia.wielkoscSylwetek) * 0.9;
    const f = doSwiata(w.x, w.y, CHWYT_PIESC.x, CHWYT_PIESC.y);
    d.zabrani.forEach((_r: Rola, i) => {
      const o = (i - (d.zabrani.length - 1) / 2) * 0.8;
      zabrany(ctx, cam.toScreenX(f.x + o), cam.toScreenY(f.y), hgt, ruch ? Math.sin(teraz * 0.005 + i * 2) * 0.2 : 0, alfa);
    });
  }
  rysujKlatkeDloni(ctx, cam.toScreenX(w.x), cam.toScreenY(w.y), kat, z * k, zacisk, lustro, alfa, alfaOczu);
}
