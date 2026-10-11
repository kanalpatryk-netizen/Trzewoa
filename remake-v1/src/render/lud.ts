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
 * Liny, które lud zostawia tam, którędy schodził w dół (i po których wraca): skręcany sznur
 * przypięty żelaznymi klamrami do skały obok — nie kreska przez środek szybu. Przylega do
 * najbliższej ściany (do 3 kafli w bok), między klamrami lekko odstaje, na dole kończy się
 * zwojem na podłodze albo węzłem. W otwartej pustce wisi tylko z kołka w stropie.
 * Pokazujemy je tylko tam, gdzie gracz już widział (w.ever).
 */
export function rysujKlamry(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const w = sim.world;
  const z = cam.zoom;
  if (z < 3) return;                                   // z daleka to tylko szum
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const x0 = Math.max(0, Math.floor(left)), x1 = Math.min(w.w - 1, Math.ceil(left + cam.vw / z));
  const y0 = Math.max(0, Math.floor(top)) - 2, y1 = Math.min(w.h - 1, Math.ceil(top + cam.vh / z));
  const SX = (x: number) => (x - left) * z, SY = (y: number) => (y - top) * z;
  // kafel liny: tędy ktoś się wspinał albo schodził, a pod nim nie ma podłogi
  const lina = (x: number, y: number) => {
    if (!w.inb(x, y)) return false;
    const i = w.idx(x, y);
    return w.drabina[i] === 1 && !!w.ever[i] && w.passable(x, y) && !w.solid(x, y + 1);
  };
  const plany: PlanLiny[] = [];
  for (let x = x0; x <= x1; x++) {
    let y = Math.max(0, y0);
    while (y <= y1) {
      if (!lina(x, y)) { y++; continue; }
      const od = y;
      while (y <= y1 + 2 && lina(x, y)) y++;
      let koniec = y;
      // ostatni kafel szybu (już z podłogą) — lina sięga do dna
      const naDnie = w.inb(x, koniec) && w.drabina[w.idx(x, koniec)] === 1 && w.passable(x, koniec) && w.solid(x, koniec + 1);
      if (naDnie) koniec++;
      if (koniec - od < 2) continue;                   // pojedynczy kafel — to krok, nie lina
      const plan = planLiny(w, x, od, koniec, naDnie);
      if (plan) plany.push(plan);
    }
  }
  // kilka kolumn wspinaczki przy tej samej ścianie to jedna lina, nie pęk sznurków obok siebie
  plany.sort((a, b) => (b.koniec - b.od) - (a.koniec - a.od));
  const zostaja: PlanLiny[] = [];
  for (const p of plany) {
    const dubel = zostaja.some((q) => Math.abs(q.lx - p.lx) < 1.2
      && Math.min(q.koniec, p.koniec) - Math.max(q.od, p.od) > (p.koniec - p.od) * 0.4);
    if (!dubel) zostaja.push(p);
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const p of zostaja) rysujLine(ctx, p, z, SX, SY);
  ctx.restore();
}

interface PlanLiny {
  x: number; od: number; koniec: number; naDnie: boolean;
  /** Strona ściany (−1 lewa, 1 prawa, 0 wisi z kołka w stropie) i x liny w świecie. */
  bok: -1 | 0 | 1; lx: number;
  strop: boolean;
  lico: { l: number | null; p: number | null }[];
}

/** Gdzie wisi lina z kolumny x, wierszy [od, koniec): przy której ścianie i jak daleko. */
function planLiny(w: Sim['world'], x: number, od: number, koniec: number, naDnie: boolean): PlanLiny | null {
  // najbliższa ściana z każdej strony (do 3 kafli): x jej lica w świecie
  const lico: { l: number | null; p: number | null }[] = [];
  let wagaL = 0, wagaP = 0;
  for (let r = od; r < koniec; r++) {
    let l: number | null = null, p: number | null = null;
    for (let d = 1; d <= 3; d++) if (w.solid(x - d, r)) { l = x - d + 1; wagaL += 1 / d; break; }
    for (let d = 1; d <= 3; d++) if (w.solid(x + d, r)) { p = x + d; wagaP += 1 / d; break; }
    lico.push({ l, p });
  }
  const promien = PROMIEN_LINY;
  const strop = w.solid(x, od - 1);
  let bok: -1 | 0 | 1 = wagaL === 0 && wagaP === 0 ? 0 : wagaL >= wagaP ? -1 : 1;
  // w pustce bez stropu nie ma jej do czego przywiązać
  if (bok === 0 && !strop) return null;
  let lx = x + 0.5;
  if (bok === -1) lx = Math.max(...lico.map((q) => q.l ?? -1e9)) + promien + 0.05;
  else if (bok === 1) lx = Math.min(...lico.map((q) => q.p ?? 1e9)) - promien - 0.05;
  // lina nie odchodzi dalej niż o półtora kafla od tych, którzy się po niej wspinają
  if (Math.abs(lx - (x + 0.5)) > 1.6) { bok = 0; lx = x + 0.5; if (!strop) return null; }
  return { x, od, koniec, naDnie, bok, lx, strop, lico };
}

/** Pół grubości liny w kaflach. */
const PROMIEN_LINY = 0.075;

/** Rysuje jedną linę według planu. */
function rysujLine(
  ctx: CanvasRenderingContext2D, plan: PlanLiny,
  z: number, SX: (x: number) => number, SY: (y: number) => number,
): void {
  const { od, koniec, naDnie, bok, lx, strop, lico } = plan;
  const promien = PROMIEN_LINY;
  // klamry: tam, gdzie skała dotyka liny, nie gęściej niż co 3 kafle
  const kotwy: number[] = [];
  if (bok !== 0) {
    lico.forEach((q, i) => {
      const f = bok === -1 ? q.l : q.p;
      if (f === null || Math.abs(Math.abs(lx - f) - promien - 0.05) > 0.02) return;
      const r = od + i;
      if (!kotwy.length || r - kotwy[kotwy.length - 1] >= 3) kotwy.push(r);
    });
  }
  // punkty zawieszenia: góra, klamry, dół
  const gora = od + (strop ? 0 : 0.15);
  const pkt: number[] = [gora, ...kotwy.map((r) => r + 0.5).filter((v) => v > gora + 0.4 && v < koniec - 0.4), koniec - (naDnie ? 0.05 : 0.3)];
  const rw = Math.max(1.4, z * promien * 2);
  const wypuklosc = bok === 0 ? 0 : -bok;              // między klamrami lina odstaje od ściany

  // ścieżka liny: odcinki między punktami, każdy lekko zwisa od ściany
  const sciezka: [number, number][] = [];
  for (let k = 0; k < pkt.length - 1; k++) {
    const a = pkt[k], b = pkt[k + 1];
    const zwis = Math.min(0.14, (b - a) * 0.035);
    const n = Math.max(2, Math.ceil((b - a) * 4));
    for (let j = k === 0 ? 0 : 1; j <= n; j++) {
      const t = j / n;
      sciezka.push([SX(lx + wypuklosc * Math.sin(Math.PI * t) * zwis), SY(a + (b - a) * t)]);
    }
  }
  const obrys = () => { ctx.beginPath(); sciezka.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); };

  // cień liny na skale (od strony ściany)
  if (bok !== 0) {
    ctx.save();
    ctx.translate(bok * rw * 0.7, rw * 0.4);
    obrys();
    ctx.strokeStyle = 'rgba(8,5,3,0.35)';
    ctx.lineWidth = rw * 1.3;
    ctx.stroke();
    ctx.restore();
  }
  obrys();
  ctx.strokeStyle = 'rgba(24,15,9,0.92)';
  ctx.lineWidth = rw + 1.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(146,112,70,0.95)';
  ctx.lineWidth = rw;
  ctx.stroke();
  // skręt: ukośne pasma włókna (z bliska), a z daleka tylko połysk na grzbiecie
  if (rw >= 2) {
    ctx.lineWidth = Math.max(0.6, rw * 0.28);
    ctx.strokeStyle = 'rgba(64,42,22,0.8)';
    const krok = rw * 1.25;
    ctx.beginPath();
    let zaleglosc = 0;
    for (let i = 1; i < sciezka.length; i++) {
      const [ax, ay] = sciezka[i - 1], [bx, by] = sciezka[i];
      const dl = Math.hypot(bx - ax, by - ay);
      let t = zaleglosc;
      while (t < dl) {
        const f = t / dl, px = ax + (bx - ax) * f, py = ay + (by - ay) * f;
        ctx.moveTo(px - rw * 0.45, py - rw * 0.35); ctx.lineTo(px + rw * 0.45, py + rw * 0.35);
        t += krok;
      }
      zaleglosc = t - dl;
    }
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(-rw * 0.18, 0);
  obrys();
  ctx.strokeStyle = 'rgba(214,184,132,0.35)';
  ctx.lineWidth = Math.max(0.5, rw * 0.22);
  ctx.stroke();
  ctx.restore();

  // węzły co kilka kafli (po nich się wspina) — tam, gdzie nie ma klamry
  ctx.fillStyle = 'rgba(132,100,62,0.98)';
  ctx.strokeStyle = 'rgba(24,15,9,0.92)';
  ctx.lineWidth = 1;
  for (let r = Math.ceil(gora) + 2; r < koniec - 1; r += 4) {
    if (kotwy.some((k) => Math.abs(k + 0.5 - r) < 1.5)) continue;
    // punkt na ścieżce najbliższy wysokości r
    let naj = sciezka[0];
    for (const q of sciezka) if (Math.abs(q[1] - SY(r)) < Math.abs(naj[1] - SY(r))) naj = q;
    ctx.beginPath(); ctx.ellipse(naj[0], naj[1], rw * 0.85, rw * 1.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // klamry: żelazny zaczep wbity w lico skały, obejmujący linę
  const klamra = (wy: number, fx: number) => {
    const ax = SX(fx), bx = SX(lx) + bok * -rw * 0.1, py = SY(wy);
    ctx.strokeStyle = 'rgba(18,14,12,0.95)';
    ctx.lineWidth = Math.max(1.6, rw * 0.9);
    ctx.beginPath(); ctx.moveTo(ax, py); ctx.lineTo(bx, py); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,108,96,0.7)';
    ctx.lineWidth = Math.max(0.6, rw * 0.3);
    ctx.beginPath(); ctx.moveTo(ax, py - rw * 0.2); ctx.lineTo(bx, py - rw * 0.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,34,30,0.95)';
    ctx.lineWidth = Math.max(1, rw * 0.35);
    ctx.beginPath(); ctx.ellipse(SX(lx), py, rw * 0.95, rw * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  };
  if (bok !== 0) {
    for (const r of kotwy) {
      const q = lico[r - od];
      const f = bok === -1 ? q.l : q.p;
      if (f !== null && r + 0.5 > gora + 0.4) klamra(r + 0.5, f);
    }
  }
  // góra: kołek w stropie albo klamra przy ścianie na pierwszym kaflu
  const px = SX(lx), pg = SY(gora);
  if (strop) {
    ctx.fillStyle = 'rgba(18,14,12,0.95)';
    ctx.fillRect(px - rw * 0.6, pg - rw * 1.2, rw * 1.2, rw * 1.4);
    ctx.strokeStyle = 'rgba(40,34,30,0.95)';
    ctx.lineWidth = Math.max(1, rw * 0.35);
    ctx.beginPath(); ctx.ellipse(px, pg + rw * 0.5, rw * 0.9, rw * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (bok !== 0) {
    const f = bok === -1 ? lico[0].l : lico[0].p;
    if (f !== null) klamra(gora + 0.2, f);
  }
  // dół: zwój na podłodze przy ścianie albo węzeł z rozstrzępionym końcem
  const [kx, ky] = sciezka[sciezka.length - 1];
  if (naDnie) {
    ctx.strokeStyle = 'rgba(24,15,9,0.9)';
    ctx.lineWidth = rw + 1;
    for (const [dx, sx] of [[0, 1], [bok === 0 ? 0.6 : -bok * 0.5, 0.75]] as [number, number][]) {
      ctx.beginPath(); ctx.ellipse(kx + dx * rw * 2, ky - rw * 0.4, rw * 2 * sx, rw * 0.7 * sx, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(146,112,70,0.95)';
    ctx.lineWidth = rw * 0.7;
    ctx.beginPath(); ctx.ellipse(kx, ky - rw * 0.4, rw * 2, rw * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(120,90,56,0.95)';
    ctx.strokeStyle = 'rgba(24,15,9,0.92)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(kx, ky, rw * 0.95, rw * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(146,112,70,0.85)';
    ctx.lineWidth = Math.max(0.5, rw * 0.25);
    ctx.beginPath();
    for (const d of [-0.5, 0, 0.5]) { ctx.moveTo(kx + d * rw * 0.6, ky + rw * 0.6); ctx.lineTo(kx + d * rw * 1.2, ky + rw * 1.9); }
    ctx.stroke();
  }
}
