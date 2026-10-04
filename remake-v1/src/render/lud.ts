/**
 * Remake v1: znaczniki ludu na mapie — stara spiżarnia po przenosinach siedziby
 * i obozy odciętych grupek. Podpisy w ramce, jak nazwa siedziby: cienkie kreski
 * bez tła ginęły w rycinie skały.
 */
import type { Sim } from '../sim/sim';
import { Race } from '../sim/races';
import type { Camera } from './camera';
import { SERIF } from './ink';
import { grzybPrzy, gniazdaWSkale } from '../sim/lud';
import { LUD } from '../nastawy/lud';

/** Podpis w ciemnej ramce z kreską odniesienia do miejsca (sx, sy). */
function podpis(ctx: CanvasRenderingContext2D, tekst: string, sx: number, sy: number, barwa: string, rozmiar: number): void {
  const szer = ctx.measureText(tekst).width;
  const lx = sx + 12, ly = sy - rozmiar * 1.4;
  ctx.strokeStyle = barwa; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lx - 6, ly + 4); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(12,8,7,0.9)';
  ctx.fillRect(lx - 6, ly - rozmiar, szer + 12, rozmiar * 1.5);
  ctx.strokeStyle = barwa; ctx.globalAlpha = 0.55;
  ctx.strokeRect(lx - 6 + 0.5, ly - rozmiar + 0.5, szer + 11, rozmiar * 1.5 - 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = barwa;
  ctx.fillText(tekst, lx, ly + rozmiar * 0.15);
}

export function rysujZnacznikiLudu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const z = cam.zoom;
  const sx = (x: number) => cam.toScreenX(x), sy = (y: number) => cam.toScreenY(y);
  const rozmiar = Math.max(13, Math.min(18, z * 1.05));
  ctx.save();
  ctx.font = `italic ${rozmiar}px ${SERIF}`;
  ctx.textAlign = 'left';
  // etap 2: gniazda kamiennych rycerzy — słaby żar w skale, gdy ktoś z ludu jest blisko (im bliżej, tym jaśniej)
  const czas = performance.now();
  for (const g of gniazdaWSkale(sim)) {
    let najblizej = Infinity;
    for (const c of sim.creatures) {
      if (c.dead || c.race !== Race.GOBLIN) continue;
      const d = Math.hypot(c.x - g.x, c.y - g.y);
      if (d < najblizej) najblizej = d;
    }
    if (najblizej > LUD.gniazdoZar && !g.znany) continue;
    // pokazane kartą „sen o rycerzach” świeci zawsze
    const sila = Math.max(g.znany ? 0.6 : 0, 1 - najblizej / LUD.gniazdoZar);
    const puls = 0.7 + 0.3 * Math.sin(czas * 0.003 + g.id * 1.7);
    const x = sx(g.x + 0.5), y = sy(g.y + 0.5), r = Math.max(16, z * 3.6);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,178,96,${(0.25 + 0.55 * sila) * puls})`);
    grad.addColorStop(0.35, `rgba(240,130,60,${(0.12 + 0.3 * sila) * puls})`);
    grad.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // obozy ze spiżarniami (siedziba ma swój podpis przy gnieździe)
  for (const o of sim.lud.spizarnie) {
    const x = sx(o.x + 0.5), y = sy(o.y + 1);
    const r = Math.max(7, z * 0.9);
    // namiot: wypełniony trójkąt z ciemnym wejściem — widać go na każdym przybliżeniu
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y - r * 1.3); ctx.lineTo(x + r, y); ctx.closePath();
    ctx.fillStyle = 'rgba(150,104,60,0.88)'; ctx.fill();
    ctx.strokeStyle = 'rgba(240,214,164,0.98)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(12,8,7,0.95)';
    ctx.beginPath(); ctx.moveTo(x - r * 0.25, y); ctx.lineTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.25, y); ctx.closePath(); ctx.fill();
    const barwa = o.ilosc > 0 ? 'rgba(240,214,164,0.98)' : 'rgba(226,150,120,0.95)';
    const g = grzybPrzy(sim, o.x, o.y);
    podpis(ctx, `obóz · spiżarnia ${o.ilosc}${g ? ` · grzyb obok ${g}` : ''}`, x, y - r * 1.3, barwa, rozmiar);
  }
  ctx.restore();
}

/**
 * Etap 4: klamry — żelazne zaczepy, które lud wbija tam, którędy schodził. Przy ścianie
 * rysują się jako klamra wbita w skałę, w otwartej pustce jako lina z węzłami.
 * Pokazujemy je tylko tam, gdzie gracz już widział (w.ever).
 */
export function rysujKlamry(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const w = sim.world;
  const z = cam.zoom;
  if (z < 3) return;                                   // z daleka to tylko szum
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const x0 = Math.max(0, Math.floor(left)), x1 = Math.min(w.w - 1, Math.ceil(left + cam.vw / z));
  const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(w.h - 1, Math.ceil(top + cam.vh / z));
  ctx.save();
  ctx.lineCap = 'round';
  const lw = Math.max(0.8, z * 0.05);
  ctx.strokeStyle = 'rgba(182,168,140,0.5)';
  ctx.lineWidth = lw;
  // tylko liny w pustce — ciągłą kreską od kołka w górze do dołu; klamry przy ścianach nie są rysowane
  // (ściana i tak daje chwyt, a setki znaczków zaśmiecały każdą jaskinię)
  const lina = (x: number, y: number) => {
    const i = w.idx(x, y);
    return w.drabina[i] === 1 && !!w.ever[i] && w.passable(x, y) && !w.solid(x, y + 1) && !w.solid(x - 1, y) && !w.solid(x + 1, y);
  };
  for (let x = x0; x <= x1; x++) {
    let y = y0;
    while (y <= y1) {
      if (!lina(x, y)) { y++; continue; }
      const od = y;
      while (y <= y1 && lina(x, y)) y++;
      if (y - od < 2) continue;                       // pojedynczy kafel — to krok, nie lina
      const px = (x + 0.5 - left) * z;
      ctx.beginPath(); ctx.moveTo(px, (od - top) * z); ctx.lineTo(px, (y - top) * z); ctx.stroke();
      if (od > 0 && w.solid(x, od - 1)) { ctx.fillStyle = 'rgba(182,168,140,0.7)'; ctx.fillRect(px - lw * 1.5, (od - top) * z, lw * 3, lw * 2); }
    }
  }
  ctx.restore();
}
