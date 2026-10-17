/**
 * Remake v2: wiadro z jedzeniem na linie (logika: src/sim/wiadro.ts).
 * Lina wychodzi ze stropu jamy; drewniane wiadro w żelaznych obręczach, z wierzchu bochny
 * i korzenie. W czasie zjazdu pod wiadrem wisi luźny koniec liny aż do ziemi — po nim wspina się
 * skrajnie głodny. Zapowiedź to tylko pył ze stropu (cząstki z symulacji).
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { wiadra, type Wiadro } from '../sim/wiadro';
import { SERIF } from './ink';

const LINA = 'rgba(176,140,92,0.95)';
const LINA_CIEN = 'rgba(20,12,8,0.85)';
/** Wiadro jest większe od kafla (postać ma prawie dwa) — wysokie na tyle, żeby ktoś się w nim zmieścił. */
const WIELKOSC = 1.6;

/** Gdzie na ekranie: kolumna liny, strop, wiadro (górny lewy róg układu — środek brzegu), jego wielkość i przechył. */
function uklad(wd: Wiadro, cam: Camera, teraz: number): { sx: number; gora: number; bx: number; top: number; Z: number; kat: number } {
  const z = cam.zoom;
  const sx = cam.toScreenX(wd.x + 0.5), gora = cam.toScreenY(wd.sufit);
  const Z = Math.max(10, z * WIELKOSC);
  // dno wiadra na dole kafla, w którym jest — stojące stoi na podłodze
  const top = cam.toScreenY(wd.y + 1) - Z;
  // kołysanie w czasie jazdy (wiadro stoi — wisi prosto)
  const jedzie = wd.faza === 'zjezdza' || wd.faza === 'odjezdza';
  const kat = jedzie ? Math.sin(teraz * 0.0021 + wd.id * 1.7) * 0.045 : 0;
  const bx = sx + Math.sin(kat) * Math.max(0, top - gora) * 0.6;
  return { sx, gora, bx, top, Z, kat };
}

export function rysujWiadra(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const lista = wiadra(sim);
  if (!lista.length) return;
  const z = cam.zoom;
  ctx.save();
  ctx.lineCap = 'round';
  for (const wd of lista) {
    if (wd.faza === 'zapowiedz') continue;
    const { sx, gora, bx, top, Z, kat } = uklad(wd, cam, teraz);
    const dolJamy = cam.toScreenY(wd.cel + 1);
    if (sx < -60 || sx > cam.vw + 60 || dolJamy < -60 || gora > cam.vh + 60) continue;
    ctx.save();
    // nad stropem jamy jest skała — wiadro wjeżdżające w górę znika w niej
    ctx.beginPath(); ctx.rect(-100, gora, cam.vw + 200, cam.vh + 200 - gora); ctx.clip();
    // lina od stropu do kabłąka
    const kablakY = top + Z * 0.05;
    lina(ctx, sx, gora - z * 0.2, bx, kablakY, Math.max(1, z * 0.09));
    // luźny koniec liny pod zjeżdżającym wiadrem — aż do ziemi, lekko wygięty
    if (wd.faza === 'zjezdza') {
      const dno = top + Z, ziemia = dolJamy;
      if (ziemia - dno > z * 0.4) {
        const fala = Math.sin(teraz * 0.003 + wd.id) * z * 0.25;
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = Math.max(1.4, z * 0.1);
        ctx.beginPath(); ctx.moveTo(bx, dno); ctx.quadraticCurveTo(bx + fala, (dno + ziemia) / 2, bx + fala * 0.4, ziemia); ctx.stroke();
        ctx.strokeStyle = LINA; ctx.lineWidth = Math.max(0.8, z * 0.055);
        ctx.stroke();
        // zwój liny na ziemi
        ctx.beginPath(); ctx.ellipse(bx + fala * 0.4, ziemia - z * 0.06, z * 0.22, z * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // ciepła poświata pełnego wiadra
    if (wd.porcje > 0) {
      const r = z * 2.2;
      const gy = top + Z * 0.4;
      const g = ctx.createRadialGradient(bx, gy, 0, bx, gy, r);
      g.addColorStop(0, 'rgba(255,196,110,0.32)'); g.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, gy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.translate(bx, top);
    ctx.rotate(kat);
    kubel(ctx, wd, Z);
    ctx.restore();
    // ile porcji zostało — z bliska, przy stojącym wiadrze
    if (wd.faza === 'stoi' && z >= 7 && wd.porcje > 0) {
      ctx.font = `italic ${Math.max(11, Math.min(15, z * 0.9))}px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(12,8,7,0.75)';
      const t = `${wd.porcje}`, tw = ctx.measureText(t).width;
      const lx = bx + Z * 0.6, ly = top + Z * 0.2;
      ctx.fillRect(lx - 3, ly - 11, tw + 6, 14);
      ctx.fillStyle = 'rgba(246,214,150,0.95)';
      ctx.fillText(t, lx + tw / 2, ly);
    }
  }
  ctx.restore();
}

/**
 * Kto siedzi w zjeżdżającym wiadrze, ma być w nim, a nie przed nim: po narysowaniu postaci
 * jeszcze raz sama ścianka wiadra (bez kabłąka i jedzenia) zasłania mu nogi.
 */
export function rysujPrzodWiader(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const zajete = new Set<number>();
  for (const c of sim.creatures) if (!c.dead && c.naWiadrze && c.naLinie !== undefined) zajete.add(c.naLinie);
  if (!zajete.size) return;
  for (const wd of wiadra(sim)) {
    if (!zajete.has(wd.id) || wd.faza === 'zapowiedz') continue;
    const { bx, top, Z, kat } = uklad(wd, cam, teraz);
    ctx.save();
    ctx.translate(bx, top); ctx.rotate(kat);
    kubel(ctx, wd, Z, true);
    ctx.restore();
  }
}

function lina(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, gr: number): void {
  ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = gr + 1.2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = LINA; ctx.lineWidth = gr;
  ctx.stroke();
  // skręt liny: krótkie skośne kreski co kawałek
  const dl = Math.hypot(x2 - x1, y2 - y1);
  if (gr < 1.6 || dl < 4) return;
  ctx.strokeStyle = 'rgba(96,70,40,0.8)'; ctx.lineWidth = Math.max(0.5, gr * 0.3);
  ctx.beginPath();
  const krok = gr * 2.2, n = Math.min(200, Math.floor(dl / krok));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
    ctx.moveTo(x - gr * 0.45, y - gr * 0.4); ctx.lineTo(x + gr * 0.45, y + gr * 0.4);
  }
  ctx.stroke();
}

/** Wiadro w układzie: (0,0) = górny środek kafla, z = piksele na kafel. */
function kubel(ctx: CanvasRenderingContext2D, wd: Wiadro, z: number, przod = false): void {
  const gw = z * 0.46, dw = z * 0.36, gy = z * 0.3, dy = z;
  const obrys = 'rgba(16,10,6,0.95)', lw = Math.max(1, z * 0.07);
  // kabłąk
  if (!przod) {
    ctx.strokeStyle = 'rgba(70,66,64,0.98)'; ctx.lineWidth = Math.max(1, z * 0.07);
    ctx.beginPath(); ctx.moveTo(-gw * 0.95, gy + z * 0.06); ctx.quadraticCurveTo(0, -z * 0.18, gw * 0.95, gy + z * 0.06); ctx.stroke();
  }
  // jedzenie z wierzchu: im mniej porcji, tym niżej
  const pelno = przod ? 0 : wd.pelne > 0 ? Math.max(0, Math.min(1, wd.porcje / wd.pelne)) : 0;
  if (pelno > 0) {
    const wys = z * (0.08 + 0.26 * pelno);
    const kawalki: [number, number, number, string][] = [
      [-0.5, 0.3, 0.32, 'rgba(176,118,58,1)'],   // bochen
      [0.35, 0.36, 0.3, 'rgba(150,96,46,1)'],
      [-0.05, 0.5, 0.34, 'rgba(196,140,72,1)'],
      [0.6, 0.18, 0.2, 'rgba(120,132,62,1)'],    // korzeń / zielenina
      [-0.75, 0.12, 0.2, 'rgba(164,74,48,1)'],   // rzepa
    ];
    for (const [fx, fh, fr, barwa] of kawalki) {
      const x = fx * gw, y = gy - wys * (fh / 0.5) * 0.9 + z * 0.04;
      ctx.fillStyle = barwa; ctx.strokeStyle = obrys; ctx.lineWidth = lw * 0.7;
      ctx.beginPath(); ctx.ellipse(x, y, fr * gw * 1.1, fr * gw * 0.75, fx * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,170,0.35)';
      ctx.beginPath(); ctx.ellipse(x - fr * gw * 0.3, y - fr * gw * 0.25, fr * gw * 0.4, fr * gw * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // klepki
  ctx.beginPath();
  ctx.moveTo(-gw, gy); ctx.lineTo(gw, gy); ctx.lineTo(dw, dy); ctx.lineTo(-dw, dy); ctx.closePath();
  const g = ctx.createLinearGradient(-gw, 0, gw, 0);
  g.addColorStop(0, 'rgba(92,60,34,1)'); g.addColorStop(0.45, 'rgba(150,104,58,1)'); g.addColorStop(1, 'rgba(70,44,26,1)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = obrys; ctx.lineWidth = lw; ctx.stroke();
  if (z >= 9) {
    ctx.strokeStyle = 'rgba(40,24,12,0.7)'; ctx.lineWidth = Math.max(0.6, z * 0.025);
    ctx.beginPath();
    for (const f of [-0.5, 0, 0.5]) { ctx.moveTo(f * gw, gy); ctx.lineTo(f * dw, dy); }
    ctx.stroke();
  }
  // żelazne obręcze
  ctx.strokeStyle = 'rgba(58,56,56,1)'; ctx.lineWidth = Math.max(1, z * 0.08);
  for (const t of [0.22, 0.78]) {
    const y = gy + (dy - gy) * t, s = gw + (dw - gw) * t;
    ctx.beginPath(); ctx.moveTo(-s, y); ctx.lineTo(s, y); ctx.stroke();
  }
  // brzeg
  ctx.strokeStyle = 'rgba(190,150,96,0.9)'; ctx.lineWidth = Math.max(0.8, z * 0.05);
  ctx.beginPath(); ctx.moveTo(-gw, gy); ctx.lineTo(gw, gy); ctx.stroke();
}
