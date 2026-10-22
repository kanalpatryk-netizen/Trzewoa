import type { Sim } from '../sim/sim';
import { procentSkorupy } from '../sim/rytual';
import type { Camera } from './camera';
import { T } from '../sim/tiles';
import { glif } from './tajemnica';
import { RDZEN_WYGLAD as RW } from '../nastawy/wyglad/rdzen';
import { POMNIK } from '../nastawy/pomnik';

/**
 * Rdzeń i jego skorupa jako cel gry, nie kolorowy kafel. Skorupa to ciosane bloki
 * z wyrytymi znakami i jasnym obrzeżem; rdzeń — serce z kamienia, które bije
 * podwójnym uderzeniem, z żyłami i wieńcem pisma dookoła. Wieniec ma tyle ogniw,
 * ile pęknięć trzeba; zapalają się, gdy skorupa pęka. Z daleka rdzeń świeci jak
 * latarnia, żeby było wiadomo, dokąd to wszystko prowadzi.
 */
export function rysujRdzen(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world;
  const z = cam.zoom;
  const sx = cam.toScreenX(w.coreX + 0.5), sy = cam.toScreenY(w.coreY + 0.5);
  const zasieg = 22 * z;
  if (sx < -zasieg || sy < -zasieg || sx > cam.vw + zasieg || sy > cam.vh + zasieg) return;
  const r = sim.rytual;
  // tętno: podwójne uderzenie, jak serce — „bum-bum", pauza
  const uderz = tetnoRdzenia(teraz);
  const otwarta = r.otwarta;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // --- krypta: komora o wygładzonym obrysie (bez schodków co kafel), ciemna tylna ściana z wielkich ciosów
  //     i pierścień klińców wzdłuż obrysu — sklepienie, ściany i posadzka. Reszta skorupy to rytowana skała
  //     (render/engrave.ts); cała skorupa z cegieł wyglądała jak schodkowy zikkurat albo piec.
  const px = (x: number) => cam.toScreenX(x), py = (y: number) => cam.toScreenY(y);
  const kamien = (x: number, y: number) => w.inb(x, y) && w.tile[w.idx(x, y)] === T.STONE;
  const Z = RW.skorupaZasieg;
  /**
   * Kafel wnętrza komory: pusty, a nad nim, po lewej i po prawej (w zasięgu) stoi kamień skorupy. Inne lite kafle po
   * drodze (ściana gruzu po zawale w walce z demonem) nie przerywają szukania — komora zostaje komorą.
   */
  const wnetrze = (x: number, y: number): boolean => {
    if (!w.inb(x, y) || w.solid(x, y)) return false;
    const trafia = (dx: number, dy: number): boolean => {
      for (let k = 1; k <= Z * 2; k++) {
        const xx = x + dx * k, yy = y + dy * k;
        if (!w.inb(xx, yy)) return false;
        if (kamien(xx, yy)) return true;
      }
      return false;
    };
    return trafia(0, -1) && trafia(-1, 0) && trafia(1, 0);
  };
  const petle = obrysKomory(wnetrze, w.coreX - Z, w.coreY - Z, w.coreX + Z, w.coreY + Z);
  if (petle.length) {
    const sciezka = new Path2D();
    for (const p of petle) {
      p.forEach((q, i) => (i ? sciezka.lineTo(px(q.x), py(q.y)) : sciezka.moveTo(px(q.x), py(q.y))));
      sciezka.closePath();
    }
    // tylna ściana: ciemny kamień w wielkich ciosach na zakładkę, ledwie widocznych; przy obrysie cień sklepienia
    ctx.save();
    ctx.clip(sciezka);
    const [sr, sg, sb] = RW.scianaKomory;
    ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
    ctx.fillRect(px(w.coreX - Z), py(w.coreY - Z), (Z * 2 + 1) * z, (Z * 2 + 1) * z);
    ctx.strokeStyle = RW.fugaKomory;
    ctx.lineWidth = Math.max(1, z * 0.06);
    ctx.beginPath();
    for (let rz = 0, y = w.coreY + Z + 1; y > w.coreY - Z; rz++, y -= RW.rzadSciany) {
      ctx.moveTo(px(w.coreX - Z), py(y)); ctx.lineTo(px(w.coreX + Z + 1), py(y));
      const prz = (rz & 1) * RW.ciosSciany * 0.5;
      for (let x = w.coreX - Z - RW.ciosSciany + prz; x <= w.coreX + Z + 1; x += RW.ciosSciany) {
        ctx.moveTo(px(x), py(y)); ctx.lineTo(px(x), py(y - RW.rzadSciany));
      }
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(6,3,3,0.32)';
    ctx.lineWidth = z * 1.4;
    ctx.stroke(sciezka);
    ctx.restore();
    for (const p of petle) pierscienKlincow(ctx, sim, cam, p, wnetrze);
    wylom(ctx, sim, cam, petle.reduce((a, b) => (b.length > a.length ? b : a)));
  }

  // Alpha, etap 5: zamiast serca rdzenia — Wielki Pomnik demona (render/pomnik.ts; rysuje się nad mrokiem)
  if (POMNIK.wlaczony) { ctx.restore(); return; }

  // --- latarnia: szeroka poświata, widoczna z daleka i przy małym przybliżeniu
  const Rh = Math.max(RW.latarnia.min, z * RW.latarnia.naZoom);
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, Rh);
  const moc = otwarta ? RW.mocOtwarty : RW.mocZamkniety;
  halo.addColorStop(0, `rgba(255,120,80,${moc + 0.12 * uderz})`);
  halo.addColorStop(0.35, `rgba(200,50,40,${(moc * 0.5) + 0.06 * uderz})`);
  halo.addColorStop(1, 'rgba(120,20,20,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = halo;
  ctx.fillRect(sx - Rh, sy - Rh, Rh * 2, Rh * 2);
  ctx.globalCompositeOperation = 'source-over';

  // --- promienie: cienkie smugi od serca ku wieńcowi, pulsujące z tętnem
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,150,100,${RW.promienAlfa + RW.promienTetno * uderz})`;
  ctx.lineWidth = Math.max(1, z * 0.18);
  ctx.beginPath();
  const Rs = Math.max(RW.serce.min, z * RW.serce.naZoom);
  for (let i = 0; i < RW.promieni; i++) {
    const a = (i / RW.promieni) * Math.PI * 2 + teraz * 0.00004;
    const d0 = Rs * 1.1, d1 = Rs * (1.7 + 0.25 * (i % 3));
    ctx.moveTo(sx + Math.cos(a) * d0, sy + Math.sin(a) * d0);
    ctx.lineTo(sx + Math.cos(a) * d1, sy + Math.sin(a) * d1);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';

  // --- serce z kamienia: ośmiokąt ciosany, żyły i jasny środek
  const R = Rs * (1 + RW.puchniecie * uderz);
  rysujSerce(ctx, sx, sy, R, uderz, otwarta);

  // --- wieniec: zapala się płynnie, w procentach skruszonej skorupy (bez etapów „1 z 5”)
  const proc = procentSkorupy(sim);
  const Rw = Math.max(R * RW.wieniec, z * RW.wieniecNaZoom);
  const obrot = teraz * 0.00008;
  ctx.strokeStyle = RW.ogniwoZgaszone;
  ctx.lineWidth = Math.max(1, z * 0.14);
  ctx.beginPath(); ctx.arc(sx, sy, Rw, 0, Math.PI * 2); ctx.stroke();
  if (proc > 0) {
    ctx.strokeStyle = `rgba(${RW.ogniwoZapalone},${0.75 + 0.25 * uderz})`;
    ctx.lineWidth = Math.max(2, z * 0.3);
    ctx.beginPath(); ctx.arc(sx, sy, Rw, -Math.PI / 2, -Math.PI / 2 + (proc / 100) * Math.PI * 2); ctx.stroke();
  }
  // znaki na wieńcu, obracające się powoli w przeciwną stronę
  if (Rw > RW.znakiWiencaOd) {
    const n = RW.znakowWienca;
    for (let i = 0; i < n; i++) {
      const a = -obrot * 1.6 + (i / n) * Math.PI * 2;
      const gr = Math.max(3, z * 0.55);
      ctx.save();
      ctx.translate(sx + Math.cos(a) * (Rw + gr * 2.2), sy + Math.sin(a) * (Rw + gr * 2.2));
      ctx.rotate(a + Math.PI / 2);
      ctx.scale(gr, gr);
      ctx.lineWidth = 1.2 / gr;
      ctx.strokeStyle = 'rgba(230,180,120,0.5)';
      ctx.stroke(glif(700 + i, 1));
      ctx.restore();
    }
  }
  // podpis — cel gry nazwany wprost, póki kamera jest blisko
  if (z >= RW.podpisOdZoom) {
    const rozm = Math.max(12, Math.min(18, z * 1.2));
    ctx.font = `italic ${rozm}px "Trzewia Tekst", Georgia, serif`;
    ctx.textAlign = 'center';
    const tekst = otwarta ? RW.podpisOtwarty
      : proc > 0 ? RW.podpisPeka.replace('{proc}', String(proc)) : RW.podpisZamkniety;
    const ty = sy + Rw + rozm * 2.4;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,7,6,0.85)';
    ctx.strokeText(tekst, sx, ty);
    ctx.fillStyle = 'rgba(250,214,160,0.95)';
    ctx.fillText(tekst, sx, ty);
  }
  ctx.restore();
}

/** Tętno rdzenia 0..1: podwójne uderzenie „bum-bum" i pauza, wspólne dla gry i menu. */
export function tetnoRdzenia(teraz: number): number {
  const f = (teraz % RW.tetnoMs) / RW.tetnoMs;
  return Math.max(0, 1 - Math.abs(f - RW.uderzenie1) * 14) + RW.sila2 * Math.max(0, 1 - Math.abs(f - RW.uderzenie2) * 14);
}

/** Serce z kamienia: ciosany ośmiokąt, żyły, kreska cienia i jasne obrzeże. */
export function rysujSerce(ctx: CanvasRenderingContext2D, sx: number, sy: number, R: number, uderz: number, otwarta: boolean): void {
  const kanty = new Path2D();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rr = R * (i % 2 ? 0.92 : 1);
    if (i === 0) kanty.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
    else kanty.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
  }
  kanty.closePath();
  const wnetrze = ctx.createRadialGradient(sx - R * 0.25, sy - R * 0.3, R * 0.05, sx, sy, R);
  wnetrze.addColorStop(0, otwarta ? RW.serceJasneOtwarte : RW.serceJasne);
  wnetrze.addColorStop(0.3, otwarta ? RW.serceZarOtwarte : RW.serceZar);
  wnetrze.addColorStop(0.75, RW.serceCiemne);
  wnetrze.addColorStop(1, RW.serceBrzeg);
  ctx.fillStyle = wnetrze;
  ctx.fill(kanty);
  // żyły: kilka pękniętych linii od środka, jaśniejące z uderzeniem
  ctx.save();
  ctx.clip(kanty);
  ctx.strokeStyle = `rgba(255,214,160,${0.35 + 0.45 * uderz})`;
  ctx.lineWidth = Math.max(1, R * 0.06);
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.4;
    let x = sx, y = sy;
    ctx.moveTo(x, y);
    for (let k = 1; k <= 3; k++) {
      x = sx + Math.cos(a + Math.sin(i * 3 + k) * 0.35) * R * k / 3;
      y = sy + Math.sin(a + Math.sin(i * 3 + k) * 0.35) * R * k / 3;
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  // kreska ryciny na kuli — cień po prawej stronie
  ctx.strokeStyle = 'rgba(20,4,4,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let d = -R; d < R; d += Math.max(2.2, R * 0.12)) { ctx.moveTo(sx + d, sy + R); ctx.lineTo(sx + d + R, sy); }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,220,180,0.85)';
  ctx.lineWidth = Math.max(1.2, R * 0.07);
  ctx.stroke(kanty);

}

type Pkt = { x: number; y: number };

/**
 * Obrys komory: pętle krawędzi kafli wnętrza (zgodnie ze wskazówkami zegara na ekranie — wnętrze po prawej),
 * bez punktów na prostych i wygładzone trzykrotnym ścinaniem rogów (Chaikin), w kaflach świata.
 */
function obrysKomory(wnetrze: (x: number, y: number) => boolean, x0: number, y0: number, x1: number, y1: number): Pkt[][] {
  const W = x1 - x0 + 3, H = y1 - y0 + 3;
  const m = new Uint8Array(W * H);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (wnetrze(x, y)) m[(y - y0 + 1) * W + (x - x0 + 1)] = 1;
  const jest = (x: number, y: number) => m[(y - y0 + 1) * W + (x - x0 + 1)] === 1;
  const klucz = (x: number, y: number) => (y - y0 + 1) * (W + 1) + (x - x0 + 1);
  const wyjscia = new Map<number, Pkt[]>();
  const krawedz = (ax: number, ay: number, bx: number, by: number) => {
    const k = klucz(ax, ay);
    const l = wyjscia.get(k);
    if (l) l.push({ x: bx, y: by }); else wyjscia.set(k, [{ x: bx, y: by }]);
  };
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!jest(x, y)) continue;
      if (!jest(x, y - 1)) krawedz(x, y, x + 1, y);
      if (!jest(x + 1, y)) krawedz(x + 1, y, x + 1, y + 1);
      if (!jest(x, y + 1)) krawedz(x + 1, y + 1, x, y + 1);
      if (!jest(x - 1, y)) krawedz(x, y + 1, x, y);
    }
  }
  const petle: Pkt[][] = [];
  for (const [k0, l0] of wyjscia) {
    while (l0.length) {
      const sx = (k0 % (W + 1)) + x0 - 1, sy = Math.floor(k0 / (W + 1)) + y0 - 1;
      const petla: Pkt[] = [{ x: sx, y: sy }];
      let nx = l0.pop()!;
      for (let bez = 0; bez < 4000 && (nx.x !== sx || nx.y !== sy); bez++) {
        petla.push(nx);
        const l = wyjscia.get(klucz(nx.x, nx.y));
        if (!l || !l.length) break;
        nx = l.pop()!;
      }
      if (petla.length < 4) continue;
      // bez punktów w środku prostych
      const proste = petla.filter((q, i) => {
        const a = petla[(i + petla.length - 1) % petla.length], b = petla[(i + 1) % petla.length];
        return (q.x - a.x) * (b.y - q.y) - (q.y - a.y) * (b.x - q.x) !== 0;
      });
      // równe próbki co pół kafla i dwa razy średnia krocząca ±1,5 kafla: schodki znikają, kształt komory zostaje
      // (samo ścinanie rogów zostawiało na łuku fale po każdym schodku)
      let gl: Pkt[] = [];
      for (let i = 0; i < proste.length; i++) {
        const a = proste[i], b = proste[(i + 1) % proste.length];
        const d = Math.hypot(b.x - a.x, b.y - a.y), ile = Math.max(1, Math.round(d / 0.5));
        for (let q = 0; q < ile; q++) gl.push({ x: a.x + (b.x - a.x) * (q / ile), y: a.y + (b.y - a.y) * (q / ile) });
      }
      for (let it = 0; it < 2; it++) {
        const n = gl.length, o: Pkt[] = [];
        for (let i = 0; i < n; i++) {
          let sx2 = 0, sy2 = 0;
          for (let d = -3; d <= 3; d++) { const q = gl[(i + d + n) % n]; sx2 += q.x; sy2 += q.y; }
          o.push({ x: sx2 / 7, y: sy2 / 7 });
        }
        gl = o;
      }
      petle.push(ksztaltKrypty(gl));
    }
  }
  return petle;
}

/**
 * Pierścień klińców wzdłuż obrysu komory: ciosy w kształcie klina (fugi prostopadłe do obrysu), jaśniejsza faza od
 * strony komory, ciemna fuga na zewnątrz. Na dole (normalna w dół) — płyty posadzki, płytsze i dłuższe. Gdzie za
 * obrysem jest przejście (pusty kafel spoza komory), kliniec się nie rysuje. Co któryś ma wyryty znak — jeden fryz.
 */
function pierscienKlincow(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, p: Pkt[], wnetrze: (x: number, y: number) => boolean): void {
  const w = sim.world, z = cam.zoom, n = p.length;
  // normalne na zewnątrz (lewa strona obiegu), uśrednione w punktach
  const nx = new Float32Array(n), ny = new Float32Array(n), dl = new Float32Array(n + 1);
  for (let i = 0; i < n; i++) {
    const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n];
    let ex = (b.y - a.y) + (c.y - b.y), ey = -(b.x - a.x) - (c.x - b.x);
    const d = Math.hypot(ex, ey) || 1;
    ex /= d; ey /= d;
    nx[i] = ex; ny[i] = ey;
    dl[i + 1] = dl[i] + Math.hypot(c.x - b.x, c.y - b.y);
  }
  const caly = dl[n];
  const ile = Math.max(8, Math.round(caly / RW.klin));
  /** Punkt obrysu i normalna po długości s. */
  const wPunkcie = (s: number): [number, number, number, number] => {
    s = ((s % caly) + caly) % caly;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (dl[m] <= s) lo = m; else hi = m; }
    const i = lo, j = (lo + 1) % n, t = (s - dl[i]) / Math.max(1e-6, dl[i + 1] - dl[i]);
    let ex = nx[i] * (1 - t) + nx[j] * t, ey = ny[i] * (1 - t) + ny[j] * t;
    const d = Math.hypot(ex, ey) || 1;
    ex /= d; ey /= d;
    return [p[i].x + (p[j].x - p[i].x) * t, p[i].y + (p[j].y - p[i].y) * t, ex, ey];
  };
  const px = (x: number) => cam.toScreenX(x), py = (y: number) => cam.toScreenY(y);
  const kroki = 4;
  for (let k = 0; k < ile; k++) {
    const s0 = (k / ile) * caly, s1 = ((k + 1) / ile) * caly;
    const [mx, my, mnx, mny] = wPunkcie((s0 + s1) / 2);
    const posadzka = mny > 0.7;
    const gleb = posadzka ? RW.posadzkaGlebia : RW.klinGlebia;
    // przejście za obrysem (wyjście z komory) — tam nie ma muru
    const tx = Math.floor(mx + mnx * gleb * 0.5), ty = Math.floor(my + mny * gleb * 0.5);
    if (w.inb(tx, ty) && !w.solid(tx, ty) && !wnetrze(tx, ty)) continue;
    const wew: [number, number][] = [], zew: [number, number][] = [];
    for (let q = 0; q <= kroki; q++) {
      const [x, y, ex, ey] = wPunkcie(s0 + (s1 - s0) * (q / kroki));
      wew.push([px(x), py(y)]);
      zew.push([px(x + ex * gleb), py(y + ey * gleb)]);
    }
    let h = Math.imul(k * 2654435761 ^ (w.coreX * 97 + w.coreY), 0x85ebca6b);
    h ^= h >>> 13;
    const b = RW.murRozrzut * ((((h >>> 0) % 1000) / 1000) - 0.5) * 2 + (posadzka ? 0.08 : 0);
    const [r, g, bl] = RW.mur;
    ctx.beginPath();
    wew.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let q = zew.length - 1; q >= 0; q--) ctx.lineTo(zew[q][0], zew[q][1]);
    ctx.closePath();
    ctx.fillStyle = `rgb(${Math.round(r * (1 + b))},${Math.round(g * (1 + b))},${Math.round(bl * (1 + b))})`;
    ctx.fill();
    ctx.strokeStyle = RW.fuga;
    ctx.lineWidth = Math.max(1, z * 0.07);
    ctx.stroke();
    if (z >= RW.fazaOdZoom) {
      // faza od strony komory: kamień ma grubość
      ctx.strokeStyle = RW.faza;
      ctx.lineWidth = Math.max(1, z * 0.09);
      ctx.beginPath();
      wew.forEach(([x, y], i) => {
        const [ex, ey] = [zew[i][0] - x, zew[i][1] - y];
        const d = Math.hypot(ex, ey) || 1, o = Math.max(1, z * 0.1);
        const ax = x + (ex / d) * o, ay = y + (ey / d) * o;
        if (i) ctx.lineTo(ax, ay); else ctx.moveTo(ax, ay);
      });
      ctx.stroke();
    }
    // fryz: co któryś kliniec sklepienia i ścian ma wyryty znak, obrócony wzdłuż łuku
    if (!posadzka && z >= RW.znakiOdZoom && k % RW.znakCo === 2) {
      const gr = Math.min(gleb, (s1 - s0)) * z * 0.32;
      ctx.save();
      ctx.translate(px(mx + mnx * gleb * 0.5), py(my + mny * gleb * 0.5));
      ctx.rotate(Math.atan2(mnx, -mny));
      ctx.scale(gr, gr);
      ctx.lineWidth = 1.4 / gr;
      ctx.translate(0, 1 / gr);
      ctx.strokeStyle = 'rgba(230,200,160,0.3)';
      ctx.stroke(glif(k * 31 + w.coreX, 2));
      ctx.translate(0, -1 / gr);
      ctx.strokeStyle = 'rgba(12,8,6,0.75)';
      ctx.stroke(glif(k * 31 + w.coreX, 2));
      ctx.restore();
    }
  }
}

/**
 * Kształt krypty z gładkiego obrysu komory: sklepienie to górna połowa obrysu (od najdalej wysuniętego punktu
 * po lewej do takiego po prawej), pod nim pionowe ściany i płaska posadzka na wysokości dna komory.
 * Sam owal czytał się jak bulaj albo piec. Wynik w równych próbkach co pół kafla (normalne pierścienia).
 */
function ksztaltKrypty(p: Pkt[]): Pkt[] {
  const n = p.length;
  let iL = 0, iR = 0, dno = -Infinity;
  for (let i = 0; i < n; i++) {
    if (p[i].x < p[iL].x) iL = i;
    if (p[i].x > p[iR].x) iR = i;
    dno = Math.max(dno, p[i].y);
  }
  const zarys: Pkt[] = [];
  for (let i = iL; ; i = (i + 1) % n) { zarys.push(p[i]); if (i === iR) break; }
  zarys.push({ x: p[iR].x, y: dno }, { x: p[iL].x, y: dno });
  const wynik: Pkt[] = [];
  for (let i = 0; i < zarys.length; i++) {
    const a = zarys[i], b = zarys[(i + 1) % zarys.length];
    const ile = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 0.5));
    for (let q = 0; q < ile; q++) wynik.push({ x: a.x + (b.x - a.x) * (q / ile), y: a.y + (b.y - a.y) * (q / ile) });
  }
  return wynik;
}

/**
 * Wyłom w sklepieniu: demon z gruzów wychodzi w górę, do przedsionka — przez rozbite sklepienie i skałę nad nim,
 * a nie przez litą ścianę. Wyłom otwiera się od dołu w czasie wychodzenia i zostaje do końca gry: ciemna,
 * poszarpana szczelina z jasnym brzegiem przełomu, od szczytu sklepienia do posadzki przedsionka.
 */
function wylom(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, p: Pkt[]): void {
  if (!POMNIK.wlaczony) return;
  const s = sim.lud.pomnik;
  if (!s) return;
  const k = s.faza === 'wychodzi' ? Math.min(1, ((sim.tick - s.od) / POMNIK.wyjscie) * 1.6) : s.faza === 'walka' || s.faza === 'kona' ? 1 : 0;
  if (k <= 0) return;
  const w = sim.world, z = cam.zoom;
  let szczyt = Infinity, sx = 0;
  for (const q of p) { szczyt = Math.min(szczyt, q.y); sx += q.x; }
  sx /= p.length;
  // posadzka przedsionka nad komorą: pierwszy pusty kafel w górę od szczytu sklepienia
  let gora = szczyt - 3;
  for (let y = Math.floor(szczyt) - 1; y > szczyt - 14; y--) {
    if (w.inb(Math.floor(sx), y) && !w.solid(Math.floor(sx), y)) { gora = y + 1; break; }
  }
  const dol = szczyt + 0.9, wys = (dol - gora) * k, g = dol - wys;
  const lewy: [number, number][] = [], prawy: [number, number][] = [];
  const kroki = Math.max(3, Math.ceil(wys / 0.45));
  for (let i = 0; i <= kroki; i++) {
    const t = i / kroki, y = dol - wys * t;
    const szer = 2.5 - 0.7 * t;
    const drg = (n: number) => (los01(n) - 0.5) * 0.7;
    lewy.push([sx - szer + drg(i * 2 + 1), y]);
    prawy.push([sx + szer + drg(i * 2 + 2), y]);
  }
  const px = (x: number) => cam.toScreenX(x), py = (y: number) => cam.toScreenY(y);
  const P = new Path2D();
  lewy.forEach(([x, y], i) => (i ? P.lineTo(px(x), py(y)) : P.moveTo(px(x), py(y))));
  for (let i = prawy.length - 1; i >= 0; i--) P.lineTo(px(prawy[i][0]), py(prawy[i][1]));
  P.closePath();
  ctx.save();
  const gr = ctx.createLinearGradient(0, py(g), 0, py(dol));
  gr.addColorStop(0, 'rgb(30,24,21)'); gr.addColorStop(1, 'rgb(16,11,10)');
  ctx.fillStyle = gr;
  ctx.fill(P);
  // brzeg przełomu: jasna, poszarpana krawędź kamienia i cień pod nią
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,6,5,0.9)'; ctx.lineWidth = Math.max(1.5, z * 0.16);
  ctx.stroke(P);
  ctx.strokeStyle = 'rgba(206,190,164,0.55)'; ctx.lineWidth = Math.max(1, z * 0.07);
  ctx.stroke(P);
  // okruchy wiszące na brzegach wyłomu
  for (let i = 0; i < 8; i++) {
    const strona = i % 2 ? prawy : lewy;
    const [x, y] = strona[Math.floor(los01(i * 7 + 3) * strona.length)];
    const r = (0.12 + los01(i * 5 + 1) * 0.18) * z, cx = px(x) + (i % 2 ? r : -r) * 0.6, cy = py(y);
    ctx.beginPath();
    for (let j = 0; j < 5; j++) { const a = (j / 5) * Math.PI * 2 + los01(i * 11 + j); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8); }
    ctx.closePath();
    ctx.fillStyle = 'rgb(86,74,64)'; ctx.fill();
    ctx.strokeStyle = 'rgba(12,8,6,0.85)'; ctx.lineWidth = Math.max(1, z * 0.05); ctx.stroke();
  }
  ctx.restore();
}

/** Stały skrót liczby → 0..1 (kształt wyłomu nie migocze między klatkami). */
function los01(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
