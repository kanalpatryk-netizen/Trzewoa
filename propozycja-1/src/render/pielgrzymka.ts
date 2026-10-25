import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { doKopania, type PlanDrogi } from '../sim/pielgrzymka';

/**
 * Droga pielgrzymów narysowana na płycie jak szkic w atlasie: kropki tam, gdzie już
 * da się przejść, znaki wyryte w skale tam, gdzie trzeba ją wydrążyć. Wyraźniejsza,
 * kiedy gracz trzyma Kształtowanie — wtedy to jest instrukcja, nie ozdoba.
 */
export function rysujDrogePielgrzymow(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, plan: PlanDrogi, teraz: number, wyrazna: boolean): void {
  const w = sim.world;
  const s = plan.sciezka;
  if (s.length < 2) return;
  // skała, którą ktoś już wydrążył, nie jest już do kopania — kreska gaśnie za kilofem
  const kop = new Set(plan.kopac.filter((i) => doKopania(w.tile[i])));
  if (!kop.size) return;
  const z = cam.zoom;
  const px = (i: number) => cam.toScreenX((i % w.w) + 0.5);
  const py = (i: number) => cam.toScreenY(((i / w.w) | 0) + 0.5);
  const moc = wyrazna ? 1 : 0.55;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // przejście, które już jest: rzadkie kropki
  ctx.fillStyle = `rgba(236,214,160,${0.5 * moc})`;
  const krok = Math.max(1, Math.round(6 / Math.max(1, z)));
  for (let k = 0; k < s.length; k += krok) {
    if (kop.has(s[k])) continue;
    ctx.beginPath();
    ctx.arc(px(s[k]), py(s[k]), Math.max(1, z * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  // skała do wydrążenia: delikatne znaki wyryte w skale co kafel — szewrony w stronę przedsionka, nacięcie z jasną
  // wargą (dawniej przerywana, płynąca żółta kreska — jak trasa w edytorze map)
  const ile = s.length, sz = Math.max(2.5, z * 0.26);
  for (let k = 0; k < ile; k++) {
    const i = s[k];
    if (!kop.has(i)) continue;
    const a = s[Math.max(0, k - 2)], b = s[Math.min(ile - 1, k + 2)];
    let dx = px(a) - px(b), dy = py(a) - py(b);
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const x = px(i), y = py(i), nx = -dy, ny = dx;
    const szewron = (ox: number, oy: number): void => {
      ctx.beginPath();
      ctx.moveTo(x + ox - dx * sz * 0.5 + nx * sz * 0.6, y + oy - dy * sz * 0.5 + ny * sz * 0.6);
      ctx.lineTo(x + ox + dx * sz * 0.4, y + oy + dy * sz * 0.4);
      ctx.lineTo(x + ox - dx * sz * 0.5 - nx * sz * 0.6, y + oy - dy * sz * 0.5 - ny * sz * 0.6);
      ctx.stroke();
    };
    ctx.lineWidth = Math.max(1, z * 0.07);
    ctx.strokeStyle = `rgba(22,14,10,${0.7 * moc})`;
    szewron(0, 0);
    ctx.lineWidth = Math.max(0.8, z * 0.04);
    ctx.strokeStyle = `rgba(232,200,142,${0.6 * moc})`;
    szewron(0, Math.max(0.8, z * 0.06));
  }
  // oba końce: gniazdo i przedsionek
  const koniec = (i: number) => {
    const x = px(i), y = py(i);
    ctx.strokeStyle = `rgba(250,210,140,${0.7 * moc})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(4, z * 0.9), 0, Math.PI * 2); ctx.stroke();
  };
  koniec(s[0]);
  koniec(s[s.length - 1]);
  ctx.restore();
}

// ---------------------------------------------------------------- droga wiernych jako szyb ze schodami (25.10)

const ZLOTO = (a: number) => `rgba(232,196,130,${a})`;
const KAMIEN = 'rgba(132,118,98,0.97)', KAMIEN_JASNY = 'rgba(176,160,132,0.95)', TUSZ = 'rgba(20,12,8,0.95)';
const DREWNO = 'rgba(112,74,42,0.95)';
/** Kiedy stopień pojawił się na ekranie (do animacji „wyrasta”) — stan rysunku, nie gry. */
const pojawienie = new Map<number, number>();
let pierwszaKlatka = true;
const WYRASTA_MS = 420;

/** Widoczne rzędy i kolumny szybu (kafle) — reszty nie rysuje się wcale. */
function widoczne(sim: Sim, cam: Camera): { x0: number; x1: number; y0: number; y1: number } | null {
  const s = sim.world.szybDrogi;
  if (s.x1 < s.x0) return null;
  const z = cam.zoom;
  const lewa = cam.x - cam.vw / 2 / z, gora = cam.y - cam.vh / 2 / z;
  const x0 = Math.max(s.x0, Math.floor(lewa)), x1 = Math.min(s.x1, Math.ceil(lewa + cam.vw / z));
  const y0 = Math.max(s.y0, Math.floor(gora)), y1 = Math.min(s.y1, Math.ceil(gora + cam.vh / z));
  return x0 > x1 || y0 > y1 ? null : { x0, x1, y0, y1 };
}

/**
 * Schody w szybie drogi wiernych (przed mrokiem — ciemność je zakrywa jak skałę): biegi na całą szerokość szybu,
 * na przemian w prawo i w lewo — stopnie z ciosanego kamienia na ukośnej płycie biegu, drewniana poręcz na słupkach.
 * Placeholder do podmiany na grafikę. Świeżo wykuty stopień wyrasta z pyłem.
 */
export function rysujSchodyDrogi(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world, s = w.szybDrogi;
  const v = widoczne(sim, cam);
  const z = cam.zoom;
  const start = w.salaOltarza.y1 + 1;               // pierwszy rząd pod wnęką
  const szer = s.x1 - s.x0 + 1;
  if (pierwszaKlatka) {
    pierwszaKlatka = false;
    for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) if (w.schody[w.idx(x, y)]) pojawienie.set(w.idx(x, y), -1e9);
  }
  if (!v) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const gr = Math.max(0.8, z * 0.045);
  for (let y = Math.max(v.y0 - 1, start); y <= v.y1; y++) {
    const k = (y - start) % szer, bieg = Math.floor((y - start) / szer);
    const dir = bieg % 2 === 0 ? 1 : -1;
    const x = dir > 0 ? s.x0 + k : s.x1 - k;
    const i = w.idx(x, y);
    if (!w.schody[i]) { pojawienie.delete(i); continue; }
    if (!pojawienie.has(i)) pojawienie.set(i, teraz);
    const t = Math.min(1, (teraz - (pojawienie.get(i) ?? -1e9)) / WYRASTA_MS);
    const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
    const top = sy + z * (1 - 0.42 * (0.25 + 0.75 * t));    // wierzch stopnia — rośnie od dołu przy wykuciu
    // płyta biegu pod stopniem: trójkąt w dół, ku następnemu stopniowi (ostatni w biegu — podest na całą szerokość)
    const ostatni = k === szer - 1;
    ctx.fillStyle = 'rgba(70,60,50,0.96)';
    ctx.beginPath();
    if (ostatni) ctx.rect(cam.toScreenX(s.x0), sy + z, szer * z, z * 0.22);
    else if (dir > 0) { ctx.moveTo(sx, sy + z); ctx.lineTo(sx + z, sy + z); ctx.lineTo(sx + z, sy + z * 1.75); ctx.closePath(); }
    else { ctx.moveTo(sx + z, sy + z); ctx.lineTo(sx, sy + z); ctx.lineTo(sx, sy + z * 1.75); ctx.closePath(); }
    ctx.globalAlpha = t; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = gr; ctx.stroke(); ctx.globalAlpha = 1;
    // stopień: bryła z ciosanego kamienia, jasna krawędź, spoina
    ctx.fillStyle = KAMIEN; ctx.fillRect(sx, top, z, sy + z - top);
    ctx.fillStyle = KAMIEN_JASNY; ctx.fillRect(sx, top, z, Math.max(1, z * 0.08));
    ctx.strokeStyle = TUSZ; ctx.lineWidth = gr; ctx.strokeRect(sx, top, z, sy + z - top);
    // poręcz: słupek przy stopniu i drąg do następnego (po skosie biegu)
    ctx.globalAlpha = t;
    const px = sx + z * 0.5, py = top - z * 0.95;
    ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1.6, z * 0.11);
    ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, py); if (!ostatni) ctx.lineTo(px + dir * z, py + z); ctx.stroke();
    ctx.strokeStyle = DREWNO; ctx.lineWidth = Math.max(0.9, z * 0.06); ctx.stroke();
    ctx.globalAlpha = 1;
    // pył przy wykuciu
    if (t < 1) {
      ctx.fillStyle = `rgba(190,170,140,${0.5 * (1 - t)})`;
      for (let n = 0; n < 5; n++) {
        const a = (n / 5) * Math.PI * 2 + i, r = z * (0.3 + 0.6 * t);
        ctx.beginPath(); ctx.arc(sx + z / 2 + Math.cos(a) * r, sy + z * 0.75 - Math.abs(Math.sin(a)) * r * 0.6, Math.max(1, z * 0.09), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

/**
 * Plan szybu drogi wiernych — zawsze widoczny (nad mrokiem): niewykuta część jako plan pomieszczenia (przerywany złoty
 * zarys, przekreślone kafle skały; bez napisów — decyzja użytkownika z 22.10), a we wnęce, dopóki nikt nie zaczął, znak „tu zacznij”: rusztowanie z belek,
 * kilof i strzałka w dół kredą. Placeholder do podmiany na grafikę.
 */
export function rysujPlanDrogi(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, plan: PlanDrogi, teraz: number, podKursorem = false, rozkaz = 0): void {
  const w = sim.world, s = w.szybDrogi;
  if (!plan.szyb || s.x1 < s.x0) return;
  const z = cam.zoom;
  const start = w.salaOltarza.y1 + 1;
  // najwyższy rząd, w którym jeszcze stoi skała szybu
  let gora = -1;
  for (const i of plan.szyb) if (doKopania(w.tile[i])) { gora = (i / w.w) | 0; break; }
  ctx.save();
  if (gora >= 0) {
    const v = widoczne(sim, cam);
    if (v) {
      ctx.strokeStyle = ZLOTO(0.32); ctx.lineWidth = Math.max(1, z * 0.04);
      ctx.beginPath();
      const m = z * 0.24;
      for (let y = Math.max(v.y0, gora); y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
        if (!doKopania(w.tile[w.idx(x, y)])) continue;
        const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
        ctx.moveTo(sx + m, sy + m); ctx.lineTo(sx + z - m, sy + z - m);
      }
      ctx.stroke();
    }
    const lx = cam.toScreenX(s.x0), gy = cam.toScreenY(gora), sw = (s.x1 - s.x0 + 1) * z, sh = (s.y1 - gora + 1) * z;
    // zaznaczony robotnik i kursor nad szybem: szyb jaśnieje — kliknięcie każe go kuć
    const puls = 0.5 + 0.5 * Math.sin(teraz * 0.008);
    if (podKursorem) { ctx.fillStyle = ZLOTO(0.16 + 0.12 * puls); ctx.fillRect(lx, gy, sw, sh); }
    // zarys: od najwyższego niewykutego rzędu do dna krypty
    ctx.setLineDash([Math.max(3, z * 0.4), Math.max(2, z * 0.22)]);
    ctx.lineDashOffset = podKursorem ? -teraz * 0.02 : 0;
    ctx.strokeStyle = podKursorem ? `rgba(255,226,150,${0.8 + 0.2 * puls})` : ZLOTO(0.85); ctx.lineWidth = Math.max(1.4, z * (podKursorem ? 0.16 : 0.08));
    ctx.strokeRect(lx, gy, sw, sh);
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // rozkaz „kop drogę wiernych”: złota fala spływa szybem od czoła w dół (ok. 30 kafli — tyle widać), a czoło rozbłyska
    const t = (teraz - rozkaz) / 1600;
    if (rozkaz > 0 && t >= 0 && t < 1) {
      const fy = gy + Math.min(sh, z * 30) * (1 - (1 - t) * (1 - t)), pas = z * 4;
      const g = ctx.createLinearGradient(0, fy - pas, 0, fy + pas * 0.3);
      g.addColorStop(0, ZLOTO(0)); g.addColorStop(0.8, ZLOTO(0.6 * (1 - t))); g.addColorStop(1, ZLOTO(0));
      ctx.fillStyle = g; ctx.fillRect(lx, Math.max(gy, fy - pas), sw, Math.min(fy + pas * 0.3, gy + sh) - Math.max(gy, fy - pas));
      ctx.fillStyle = ZLOTO(0.7 * (1 - t)); ctx.fillRect(lx, gy, sw, z);
    }
  }
  // wnęka „tu zacznij”: dopóki pierwszy rząd szybu pod nią stoi cały
  let nikt = true;
  for (let x = s.x0; x <= s.x1; x++) if (!doKopania(w.tile[w.idx(x, start)])) nikt = false;
  if (nikt) {
    const puls = 0.55 + 0.45 * Math.sin(teraz * 0.005);
    const lx = cam.toScreenX(s.x0), px = cam.toScreenX(s.x1 + 1), gy = cam.toScreenY(s.y0), dy = cam.toScreenY(start);
    // pierwszy rząd do wykucia — pulsuje złotem
    ctx.fillStyle = ZLOTO(0.12 + 0.16 * puls); ctx.fillRect(lx, dy, px - lx, z);
    ctx.strokeStyle = ZLOTO(0.55 + 0.4 * puls); ctx.lineWidth = Math.max(1.4, z * 0.09); ctx.strokeRect(lx, dy, px - lx, z);
    // rama z belek nad wnęką: dwa słupy, oczep i zastrzały
    const belka = (ax: number, ay: number, bx: number, by: number, g: number) => {
      ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(2.4, z * g * 1.6);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = DREWNO; ctx.lineWidth = Math.max(1.4, z * g); ctx.stroke();
    };
    const l = lx + z * 0.25, r = px - z * 0.25, g0 = gy + z * 0.18;
    belka(l, dy, l, g0, 0.14); belka(r, dy, r, g0, 0.14); belka(l - z * 0.15, g0, r + z * 0.15, g0, 0.14);
    belka(l, g0 + z * 0.55, l + z * 0.55, g0, 0.08); belka(r, g0 + z * 0.55, r - z * 0.55, g0, 0.08);
    // lampka na oczepie
    const cx = (lx + px) / 2;
    const blask = ctx.createRadialGradient(cx, g0 + z * 0.45, 0, cx, g0 + z * 0.45, z * 2.2);
    blask.addColorStop(0, `rgba(255,214,140,${0.35 + 0.15 * puls})`); blask.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = blask; ctx.fillRect(cx - z * 2.2, g0 - z * 1.8, z * 4.4, z * 4.4);
    ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.05);
    ctx.beginPath(); ctx.moveTo(cx, g0); ctx.lineTo(cx, g0 + z * 0.3); ctx.stroke();
    ctx.fillStyle = `rgba(255,220,150,${0.8 + 0.2 * puls})`; ctx.beginPath(); ctx.arc(cx, g0 + z * 0.45, Math.max(2, z * 0.14), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // kilof wbity w pierwszy rząd i strzałka kredą w dół
    ctx.shadowColor = ZLOTO(0.9); ctx.shadowBlur = 8 * puls;
    ctx.strokeStyle = `rgba(240,226,196,${0.6 + 0.4 * puls})`; ctx.lineWidth = Math.max(1.6, z * 0.1);
    const a1 = dy + z * (0.75 + 0.1 * puls), a0 = a1 - z * 1.1, sx = lx + z * 0.9;
    ctx.beginPath(); ctx.moveTo(sx, a0); ctx.lineTo(sx, a1); ctx.moveTo(sx - z * 0.32, a1 - z * 0.32); ctx.lineTo(sx, a1); ctx.lineTo(sx + z * 0.32, a1 - z * 0.32); ctx.stroke();
    const kx = px - z * 1.1, ky = dy + z * 0.15;
    ctx.beginPath(); ctx.moveTo(kx - z * 0.45, ky - z * 0.55); ctx.lineTo(kx + z * 0.25, ky + z * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(kx - z * 0.45, ky - z * 0.25, z * 0.42, Math.PI * 1.2, Math.PI * 1.95); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
