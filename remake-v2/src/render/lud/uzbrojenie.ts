import { CIEN, clamp, kier, lerp, los, PI, sin, TAU, tonC, type Pkt, type Rgb } from './matma';
import type { Malarz } from './malarz';
import { poswiata, type Rysunek } from './wspolne';
import { bryla, klaks, KREW, KREW_SUCHA, KREW_SWIEZA, rgba, rozbryzg, swiatlocien, SWB, TUSZ, warstwaTuszu, zaciek, ziarno } from './tusz';

/**
 * Uzbrojenie krzyżowca (Remake v2): tarcza w kształcie żelazka — wyszczerbiona, z odpryśniętą farbą,
 * cięciami, utkwioną strzałą i krwawym śladem dłoni; miecz o ciemnym żelaznym jelcu i tarczowej głowicy,
 * z krwią na głowni; strzały.
 */

const DREWNO: Rgb = [96, 70, 46];
const ZELAZO: Rgb = [70, 68, 70];
const PIORO: Rgb = [58, 54, 50];

// ------------------------------------------------------------------ tarcza

/** Obrys tarczy w jej własnym układzie (środek w 0, y w dół): górna krawędź, boki zbiegające się w szpic; wyszczerbienia. */
function obrysTarczy(w: number, H: number, id: number): [number, number][] {
  const N = 26, gora = -0.42 * H;
  const bok = (s: number, znak: number): [number, number] => [znak * w * Math.pow(1 - Math.pow(s, 2.3), 0.62), gora + s * H];
  const pk: [number, number][] = [];
  // górna krawędź (lekko wygięta ku górze) od lewej do prawej
  for (let i = 0; i <= 10; i++) { const x = -w + (2 * w * i) / 10; pk.push([x, gora - 0.025 * H * (1 - (x * x) / (w * w))]); }
  for (let i = 1; i <= N; i++) pk.push(bok(i / N, 1));
  for (let i = N - 1; i >= 1; i--) pk.push(bok(i / N, -1));
  // wyszczerbienia od ciosów: punkt wciśnięty ku środkowi
  const ile = 2 + (los(id, 600) < 0.5 ? 1 : 0);
  for (let k = 0; k < ile; k++) {
    const i = 3 + Math.floor(los(id, 601 + k) * (pk.length - 6));
    const [x, y] = pk[i], gl = (0.07 + 0.09 * los(id, 610 + k)) * w;
    const dl = Math.hypot(x, y - 0.05 * H) || 1;
    pk[i] = [x - (x / dl) * gl * 1.4, y - ((y - 0.05 * H) / dl) * gl];
  }
  return pk;
}

/** Obrys tarczy w miejscu, gdzie wisi — także do rzucania jej cienia na wapenrok. */
export function sciezkaTarczy(h: number, id: number, tx: number, ty: number, obr: number, skala: number): Path2D {
  const w = 0.098 * h * skala, H = 0.29 * h * skala;
  const co = Math.cos(obr), sn = Math.sin(obr);
  const pk = obrysTarczy(w, H, id);
  const tr = new Path2D();
  tr.moveTo(tx + pk[0][0] * co - pk[0][1] * sn, ty + pk[0][0] * sn + pk[0][1] * co);
  for (let i = 1; i < pk.length; i++) tr.lineTo(tx + pk[i][0] * co - pk[i][1] * sn, ty + pk[i][0] * sn + pk[i][1] * co);
  tr.closePath();
  return tr;
}

/**
 * Tarcza: (tx, ty) — środek, obr — obrót, skala — wielkość. Pole i krzyż zależą od numeru postaci:
 * czerwone pole z krzyżem z kości albo brudnobiałe z krwawym krzyżem. Zdrajca — poczerniała, krzyż żarzy się.
 */
export function tarcza(r: Rysunek, tx: number, ty: number, obr: number, skala: number): void {
  const { m, st, h, c, czas } = r;
  const id = c.id;
  const w = 0.098 * h * skala, H = 0.29 * h * skala;
  const co = Math.cos(obr), sn = Math.sin(obr);
  const P = (x: number, y: number): [number, number] => [tx + x * co - y * sn, ty + x * sn + y * co];
  const pk = obrysTarczy(w, H, id);
  const tr = sciezkaTarczy(h, id, tx, ty, obr, skala);
  const pole = st.tarcza, znak = st.znak;
  // pole: od światła (góra, przód) ku cieniowi (szpic)
  const [ax, ay] = P(w * 0.6, -0.45 * H), [bx, by] = P(-w * 0.4, 0.6 * H);
  let styl: string | CanvasGradient = tonC(pole, -0.08, CIEN.tkanina);
  if (!m.prosto) {
    const gr = m.g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, tonC(pole, 0.08, CIEN.tkanina)); gr.addColorStop(0.5, tonC(pole, -0.08, CIEN.tkanina)); gr.addColorStop(1, tonC(pole, -0.42, CIEN.tkanina));
    styl = gr;
  }
  m.ksztalt(tr, styl, (g) => {
    g.save();
    g.clip(tr);
    // krzyż przez całe pole
    const kw = w * 0.24, ky = -0.1 * H;
    const krzyz = new Path2D();
    krzyz.moveTo(...P(-kw / 2, -0.5 * H)); krzyz.lineTo(...P(kw / 2, -0.5 * H)); krzyz.lineTo(...P(kw / 2, 0.6 * H)); krzyz.lineTo(...P(-kw / 2, 0.6 * H)); krzyz.closePath();
    krzyz.moveTo(...P(-w * 1.1, ky - kw / 2)); krzyz.lineTo(...P(-w * 1.1, ky + kw / 2)); krzyz.lineTo(...P(w * 1.1, ky + kw / 2)); krzyz.lineTo(...P(w * 1.1, ky - kw / 2)); krzyz.closePath();
    g.fillStyle = tonC(znak, m.prosto ? -0.05 : 0, CIEN.tkanina); g.fill(krzyz);
    if (m.prosto) { g.restore(); return; }
    if (st.bunt) poswiata(g, ...P(0, ky), w * 1.3, [255, 46, 20], 0.22 + 0.08 * sin(czas * 0.004 + id));
    if (m.bogato) {
      // drewno pod farbą: drobne, poszarpane odpryski przy brzegu i przy wyszczerbieniach
      for (let i = 0; i < 9; i++) {
        const j = Math.floor(los(id, 620 + i) * pk.length);
        const [ex, ey] = pk[j];
        const [qx, qy] = P(ex * 0.93, ey * 0.95 + 0.02 * H);
        const ch = klaks(qx, qy, w * (0.035 + 0.045 * los(id, 640 + i)), id + i * 7, 650, 6, 0.55, 1.6, obr + los(id, 630 + i) * PI);
        g.fillStyle = tonC(DREWNO, -0.1, CIEN.tkanina); g.fill(ch);
        g.strokeStyle = 'rgba(16,10,6,0.6)'; g.lineWidth = Math.max(0.35, h * 0.0014); g.stroke(ch);
      }
    }
    // brud ku szpicowi
    const [g0x, g0y] = P(0, 0), [g1x, g1y] = P(0, 0.6 * H);
    const bl = g.createLinearGradient(g0x, g0y, g1x, g1y);
    bl.addColorStop(0, 'rgba(34,22,14,0)'); bl.addColorStop(1, 'rgba(30,18,12,0.6)');
    g.fillStyle = bl; g.fill(tr);
    // krwawy ślad dłoni zsuwającej się po tarczy — cztery palce ciągną krew w dół
    {
      const hx = w * (-0.2 + 0.45 * los(id, 660)), hy = -0.2 * H + 0.15 * H * los(id, 661);
      const sm = new Path2D();
      for (let i = 0; i < 4; i++) {
        const x0 = hx + (i - 1.5) * w * 0.12, dlg = H * (0.13 + 0.12 * los(id, 662 + i)), sz = w * 0.045;
        const pa = P(x0 - sz, hy), pb = P(x0 + sz, hy), pc = P(x0 + sz * 0.5 + w * 0.03, hy + dlg), pd = P(x0 - sz * 0.4 + w * 0.03, hy + dlg * 1.04);
        sm.moveTo(...pa); sm.lineTo(...pb); sm.lineTo(...pc); sm.lineTo(...pd); sm.closePath();
      }
      const [px, py] = P(hx, hy - w * 0.05);
      sm.moveTo(px + w * 0.24, py); sm.ellipse(px, py, w * 0.24, w * 0.15, obr, 0, TAU);
      g.fillStyle = rgba(KREW, 0.72); g.fill(sm);
      if (m.bogato) { g.strokeStyle = rgba(KREW_SUCHA, 0.5); g.lineWidth = Math.max(0.4, h * 0.0016); g.stroke(sm); }
    }
    const [rx, ry] = P(w * (0.25 - 0.4 * los(id, 670)), H * (0.12 + 0.2 * los(id, 671)));
    rozbryzg(g, rx, ry, w * 0.13, obr + PI * 0.15, id + 31, KREW, 0.8, m.lod);
    // cięcia po ciosach: ciemna szczelina z jasną wargą
    if (m.bogato) {
      for (let i = 0; i < 3; i++) {
        const x0 = (los(id, 680 + i) - 0.5) * w * 1.3, y0 = (los(id, 690 + i) - 0.4) * H * 0.8;
        const dx = w * (0.25 + 0.2 * los(id, 700 + i)), dy = H * (0.04 + 0.06 * los(id, 710 + i));
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(14,8,6,0.85)'; g.lineWidth = Math.max(0.6, h * 0.0035 * skala);
        g.beginPath(); g.moveTo(...P(x0, y0)); g.lineTo(...P(x0 + dx, y0 + dy)); g.stroke();
        g.strokeStyle = 'rgba(200,170,130,0.35)'; g.lineWidth = Math.max(0.4, h * 0.0015 * skala);
        g.beginPath(); g.moveTo(...P(x0 + w * 0.01, y0 + h * 0.003)); g.lineTo(...P(x0 + dx, y0 + dy + h * 0.003)); g.stroke();
      }
      const z = ziarno(g);
      if (z) { g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.6; g.fillStyle = z; g.fill(tr); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    }
    // okucie brzegu: ciemna skóra naciągnięta na krawędź (widać połowę kreski — reszta poza obcięciem)
    g.strokeStyle = 'rgba(30,20,16,0.95)'; g.lineWidth = Math.max(1, h * 0.016 * skala); g.stroke(tr);
    if (m.bogato) {
      g.setLineDash([w * 0.12, w * 0.22, w * 0.05, w * 0.3]);
      g.strokeStyle = 'rgba(150,120,96,0.32)'; g.lineWidth = Math.max(0.4, h * 0.0024 * skala); g.stroke(tr);
      g.setLineDash([]);
    }
    // światłocień wypukłej tarczy: cień od tyłu i od szpica, blask przy przedniej krawędzi
    bryla(g, tr, h, m.bogato
      ? [[w * 0.42, 'rgba(10,6,8,0.42)'], [w * 0.14, 'rgba(10,6,8,0.45)'], [-w * 0.1, 'rgba(255,236,206,0.12)']]
      : [[w * 0.42, 'rgba(10,6,8,0.55)'], [-w * 0.1, 'rgba(255,236,206,0.12)']], { x: 0.78, y: -0.62 }, 1.1, 0, undefined, false, true);
    g.restore();
    if (m.lod === 2) {
      // utkwiona strzała, czasem druga — złamana
      const [s1x, s1y] = P(-w * (0.2 + 0.3 * los(id, 720)), H * (0.0 + 0.25 * los(id, 721)));
      strzala(g, s1x, s1y, obr + PI * (0.6 + 0.12 * los(id, 722)), 0.12 * h * skala, h, false, m.lod);
      if (los(id, 723) < 0.5) { const [s2x, s2y] = P(w * 0.42, -0.28 * H); strzala(g, s2x, s2y, obr + PI * 0.76, 0.05 * h * skala, h, true, m.lod); }
    }
  });
}

// ------------------------------------------------------------------ miecz

/**
 * Miecz rycerski: prosta głownia z rowkiem (zbroczem), wyszczerbiona, we krwi od połowy ku sztychowi;
 * ciemny żelazny jelec wygięty ku głowni, rękojeść owinięta skórą, tarczowa głowica. Zwraca sztych.
 */
export function mieczKrzyzowca(m: Malarz, x: number, y: number, kat: number, h: number, skorzane: Rgb, id: number, czas: number, bunt: boolean): Pkt {
  const d = kier(kat), n = kier(kat - PI / 2);
  const P = (wd: number, wn: number): [number, number] => [x + d.x * wd + n.x * wn, y + d.y * wd + n.y * wn];
  const j = 0.036 * h, dl = 0.5 * h, sz = 0.0165 * h;
  const czubek = { x: x + d.x * (j + dl), y: y + d.y * (j + dl) };
  // głownia z dwiema szczerbami na jednym ostrzu
  const sz1 = 0.3 + 0.3 * los(id, 740), sz2 = sz1 + 0.18 + 0.15 * los(id, 741);
  const gl = new Path2D();
  gl.moveTo(...P(j, sz));
  for (const t of [sz1, sz2]) {
    const s0 = lerp(sz, sz * 0.78, t / 0.82);
    gl.lineTo(...P(j + dl * (t - 0.014), s0)); gl.lineTo(...P(j + dl * t, s0 - sz * 0.32)); gl.lineTo(...P(j + dl * (t + 0.01), s0));
  }
  gl.lineTo(...P(j + dl * 0.82, sz * 0.78)); gl.lineTo(...P(j + dl, 0)); gl.lineTo(...P(j + dl * 0.82, -sz * 0.78)); gl.lineTo(...P(j, -sz));
  gl.closePath();
  // stal: jasne ostrze od światła, ciemniejsze płazy, cień po drugiej stronie
  let styl: string | CanvasGradient = 'rgb(126,126,130)';
  if (!m.prosto) {
    let s1 = 1;
    if (n.x * 0.45 + n.y * -0.89 < 0) s1 = -1;
    const [ax, ay] = P(j + dl * 0.4, sz * s1), [bx, by] = P(j + dl * 0.4, -sz * s1);
    const gr = m.g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, 'rgb(214,212,204)'); gr.addColorStop(0.16, 'rgb(150,150,152)'); gr.addColorStop(0.5, 'rgb(96,96,102)');
    gr.addColorStop(0.84, 'rgb(64,64,70)'); gr.addColorStop(1, 'rgb(120,120,126)');
    styl = gr;
  }
  m.ksztalt(gl, styl, (g) => {
    if (m.prosto) return;
    // zbrocze: ciemny rowek przez dwie trzecie głowni
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(30,30,36,0.7)'; g.lineWidth = Math.max(0.5, sz * 0.32);
    g.beginPath(); g.moveTo(...P(j + dl * 0.02, 0)); g.lineTo(...P(j + dl * 0.68, 0)); g.stroke();
    if (m.bogato) {
      g.strokeStyle = 'rgba(220,218,212,0.35)'; g.lineWidth = Math.max(0.35, sz * 0.1);
      g.beginPath(); g.moveTo(...P(j + dl * 0.02, sz * 0.2)); g.lineTo(...P(j + dl * 0.68, sz * 0.2)); g.stroke();
    }
    // krew: rozmazana od połowy ku sztychowi, gęstsza przy czubku
    g.save(); g.clip(gl);
    const a0 = 0.38 + 0.12 * los(id, 742);
    const [k0x, k0y] = P(j + dl * a0, 0);
    const gr = g.createLinearGradient(k0x, k0y, czubek.x, czubek.y);
    gr.addColorStop(0, rgba(KREW, 0)); gr.addColorStop(0.35, rgba(KREW, 0.55)); gr.addColorStop(1, rgba(KREW_SWIEZA, 0.92));
    g.fillStyle = gr;
    const kr = new Path2D();
    kr.moveTo(...P(j + dl * a0, sz * 0.2));
    for (let i = 1; i <= 6; i++) { const t = a0 + ((1 - a0) * i) / 6; kr.lineTo(...P(j + dl * t, sz * (0.3 + 0.9 * los(id, 750 + i)))); }
    kr.lineTo(...P(j + dl * 1.02, 0));
    for (let i = 6; i >= 1; i--) { const t = a0 + ((1 - a0) * i) / 6; kr.lineTo(...P(j + dl * t, -sz * (0.2 + 0.9 * los(id, 760 + i)))); }
    kr.closePath();
    g.fill(kr);
    if (m.bogato) { g.fillStyle = 'rgba(255,214,200,0.22)'; g.beginPath(); g.ellipse(...P(j + dl * 0.86, sz * 0.3), dl * 0.06, sz * 0.12, Math.atan2(d.y, d.x), 0, TAU); g.fill(); }
    g.restore();
    // zacieki z ostrza, gdy głownia wisi sztychem w dół
    if (d.y > 0.55 && m.lod === 2) {
      zaciek(g, ...P(j + dl * 0.78, -sz * 0.7), h * 0.018, h * 0.0028, KREW_SWIEZA, 0.85, id, 770);
      const k = (czas * 0.0006 + los(id, 772)) % 1;
      g.fillStyle = rgba(KREW_SWIEZA, 0.85 * (1 - k));
      g.beginPath(); g.ellipse(czubek.x, czubek.y + k * 0.06 * h, h * 0.0045, h * 0.0075, 0, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(12,10,10,0.75)'; g.lineWidth = Math.max(0.4, h * 0.0018); g.stroke(gl);
  });
  // jelec: żelazna belka wygięta ku głowni, końce rozszerzone
  const je = new Path2D();
  const lj = 0.058 * h, tj = 0.0062 * h;
  je.moveTo(...P(j + 0.012 * h, -lj));
  je.quadraticCurveTo(...P(j - tj * 0.6, -lj * 0.5), ...P(j - tj, 0));
  je.quadraticCurveTo(...P(j - tj * 0.6, lj * 0.5), ...P(j + 0.012 * h, lj));
  je.lineTo(...P(j + 0.016 * h, lj * 0.98));
  je.quadraticCurveTo(...P(j + tj * 0.5, lj * 0.45), ...P(j + tj, 0));
  je.quadraticCurveTo(...P(j + tj * 0.5, -lj * 0.45), ...P(j + 0.016 * h, -lj * 0.98));
  je.closePath();
  m.ksztalt(je, tonC(ZELAZO, bunt ? -0.3 : -0.05, CIEN.metal), (g) => {
    if (!m.bogato) return;
    swiatlocien(g, je, [[0.006 * h, 'rgba(6,6,10,0.55)'], [-0.003 * h, 'rgba(240,236,226,0.4)']]);
  });
  // rękojeść owinięta skórą i tarczowa głowica
  const rk = new Path2D();
  const [r0x, r0y] = P(j - tj, 0), [r1x, r1y] = P(-0.058 * h, 0);
  const rw = 0.0072 * h;
  rk.moveTo(r0x + n.x * rw, r0y + n.y * rw); rk.lineTo(r1x + n.x * rw * 0.85, r1y + n.y * rw * 0.85);
  rk.lineTo(r1x - n.x * rw * 0.85, r1y - n.y * rw * 0.85); rk.lineTo(r0x - n.x * rw, r0y - n.y * rw); rk.closePath();
  m.ksztalt(rk, tonC(skorzane, -0.35, CIEN.tkanina), (g) => {
    if (!m.bogato) return;
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = Math.max(0.4, h * 0.0016);
    g.beginPath();
    for (let i = 1; i < 6; i++) { const t = i / 6; const [qx, qy] = P(lerp(j - tj, -0.058 * h, t), 0); g.moveTo(qx + n.x * rw + d.x * rw, qy + n.y * rw + d.y * rw); g.lineTo(qx - n.x * rw - d.x * rw, qy - n.y * rw - d.y * rw); }
    g.stroke();
  });
  const [gx, gy] = P(-0.07 * h, 0);
  const rg = 0.016 * h;
  const glw = new Path2D(); glw.ellipse(gx, gy, rg * 0.75, rg, Math.atan2(d.y, d.x), 0, TAU);
  m.ksztalt(glw, tonC(ZELAZO, bunt ? -0.3 : -0.08, CIEN.metal), (g) => {
    if (!m.bogato) return;
    swiatlocien(g, glw, [[rg * 0.45, 'rgba(6,6,10,0.6)'], [-rg * 0.2, 'rgba(240,236,226,0.45)']]);
    if (m.lod === 2) { g.strokeStyle = 'rgba(10,10,12,0.6)'; g.lineWidth = Math.max(0.4, rg * 0.12); g.beginPath(); g.ellipse(gx, gy, rg * 0.38, rg * 0.55, Math.atan2(d.y, d.x), 0, TAU); g.stroke(); }
  });
  return czubek;
}

// ------------------------------------------------------------------ strzała

/** Strzała: drzewce od grotu (x, y) wstecz pod kątem `kat` (od pionu w dół), długości `dl`; złamana — z drzazgami zamiast lotek. */
export function strzala(g: CanvasRenderingContext2D, x: number, y: number, kat: number, dl: number, h: number, zlamana: boolean, lod: number): void {
  const d = kier(kat), n = kier(kat - PI / 2);
  const ex = x + d.x * dl, ey = y + d.y * dl;
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(14,10,8,0.95)'; g.lineWidth = Math.max(1, h * 0.0105);
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  g.strokeStyle = tonC(DREWNO, 0.05, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.0062);
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  if (lod === 2) { g.strokeStyle = 'rgba(230,200,160,0.35)'; g.lineWidth = Math.max(0.3, h * 0.002); g.beginPath(); g.moveTo(x + n.x * h * 0.0015, y + n.y * h * 0.0015); g.lineTo(ex + n.x * h * 0.0015, ey + n.y * h * 0.0015); g.stroke(); }
  if (zlamana) {
    g.strokeStyle = tonC(DREWNO, 0.3, CIEN.tkanina); g.lineWidth = Math.max(0.4, h * 0.0035);
    g.beginPath();
    for (const k of [-1, -0.3, 0.5, 1]) { g.moveTo(ex, ey); g.lineTo(ex + d.x * h * (0.012 + 0.008 * Math.abs(k)) + n.x * k * h * 0.007, ey + d.y * h * (0.012 + 0.008 * Math.abs(k)) + n.y * k * h * 0.007); }
    g.stroke();
  } else if (lod === 2) {
    // lotki: dwa pióra wzdłuż końca drzewca
    for (const k of [-1, 1]) {
      const p = new Path2D();
      p.moveTo(ex - d.x * h * 0.045, ey - d.y * h * 0.045);
      p.quadraticCurveTo(ex - d.x * h * 0.02 + n.x * k * h * 0.016, ey - d.y * h * 0.02 + n.y * k * h * 0.016, ex + n.x * k * h * 0.014, ey + n.y * k * h * 0.014);
      p.lineTo(ex + d.x * h * 0.006, ey + d.y * h * 0.006);
      p.closePath();
      g.fillStyle = tonC(PIORO, k > 0 ? 0.1 : -0.2, CIEN.tkanina, 0.95); g.fill(p);
      g.strokeStyle = 'rgba(10,8,8,0.7)'; g.lineWidth = Math.max(0.3, h * 0.0015); g.stroke(p);
    }
  }
  // krew przy grocie
  if (lod > 0) { g.fillStyle = rgba(KREW, 0.8); g.beginPath(); g.ellipse(x, y, h * clamp(0.006, 0, 1), h * 0.0045, Math.atan2(d.y, d.x), 0, TAU); g.fill(); }
}

// ------------------------------------------------------------------ kilof kopacza

/**
 * Dolabra kopacza: trzonek z ciemnego drewna, wytarty do połysku tam, gdzie go chwytają, z żelazną
 * tuleją; obuch ze szpicem w stronę ciosu i szerokim ostrzem z tyłu — ciemne żelazo, rdza, jasna krawędź.
 * (x, y) — dłoń, kat — kierunek trzonka ku obuchowi. Zwraca szpic.
 */
export function dolabra(m: Malarz, x: number, y: number, kat: number, h: number, id: number, drewno: Rgb, zelazo: Rgb): Pkt {
  const d = kier(kat), a = kier(kat - PI / 2);
  const tylT = 0.13 * h, dl = 0.34 * h;
  const ax = x - d.x * tylT, ay = y - d.y * tylT, ex = x + d.x * dl, ey = y + d.y * dl;
  const r0 = Math.max(0.6, 0.0098 * h), r1 = Math.max(0.55, 0.0085 * h);
  const tr = new Path2D();
  tr.moveTo(ax + a.x * r0, ay + a.y * r0); tr.lineTo(ex + a.x * r1, ey + a.y * r1);
  tr.lineTo(ex - a.x * r1, ey - a.y * r1); tr.lineTo(ax - a.x * r0, ay - a.y * r0);
  tr.arc(ax, ay, r0, Math.atan2(-a.y, -a.x), Math.atan2(a.y, a.x), false);
  tr.closePath();
  let styl: string | CanvasGradient = tonC(drewno, -0.2, CIEN.tkanina);
  if (m.lod > 0) {
    const s1 = a.x * SWB.x + a.y * SWB.y > 0 ? 1 : -1;
    const gr = m.g.createLinearGradient(x + a.x * r0 * s1, y + a.y * r0 * s1, x - a.x * r0 * s1, y - a.y * r0 * s1);
    gr.addColorStop(0, tonC(drewno, 0.1, CIEN.tkanina)); gr.addColorStop(0.45, tonC(drewno, -0.15, CIEN.tkanina)); gr.addColorStop(1, tonC(drewno, -0.55, CIEN.tkanina));
    styl = gr;
  }
  m.ksztalt(tr, styl, (g) => {
    if (!m.bogato) return;
    // słoje i wytarty, ciemny od potu chwyt przy dłoni
    g.strokeStyle = tonC(drewno, -0.5, CIEN.tkanina, 0.5); g.lineWidth = Math.max(0.35, h * 0.0018);
    g.beginPath();
    for (const k of [-0.35, 0.3]) { g.moveTo(ax + a.x * r0 * k, ay + a.y * r0 * k); g.lineTo(ex + a.x * r1 * k, ey + a.y * r1 * k); }
    g.stroke();
    g.strokeStyle = 'rgba(20,12,8,0.45)'; g.lineWidth = r0 * 2; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(x - d.x * 0.04 * h, y - d.y * 0.04 * h); g.lineTo(x + d.x * 0.03 * h, y + d.y * 0.03 * h); g.stroke();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(12,8,8,0.7)'; g.lineWidth = Math.max(0.4, h * 0.002); g.stroke(tr);
  });
  const E = (da: number, dd: number): [number, number] => [ex + a.x * da * h + d.x * dd * h, ey + a.y * da * h + d.y * dd * h];
  const ob = new Path2D();
  ob.moveTo(...E(0.02, 0.018));
  ob.quadraticCurveTo(...E(0.1, 0.012), ...E(0.15, -0.03));
  ob.quadraticCurveTo(...E(0.085, -0.014), ...E(0.02, -0.018));
  ob.lineTo(...E(-0.03, -0.016));
  ob.quadraticCurveTo(...E(-0.07, -0.03), ...E(-0.085, -0.045));
  ob.lineTo(...E(-0.095, 0.03));
  ob.quadraticCurveTo(...E(-0.065, 0.02), ...E(-0.03, 0.018));
  ob.closePath();
  let st2: string | CanvasGradient = tonC(zelazo, -0.15, CIEN.metal);
  if (m.lod > 0) {
    const [g0x, g0y] = E(0, -0.03), [g1x, g1y] = E(0, 0.03);
    const gr = m.g.createLinearGradient(g0x, g0y, g1x, g1y);
    gr.addColorStop(0, tonC(zelazo, 0.12, CIEN.metal)); gr.addColorStop(0.5, tonC(zelazo, -0.15, CIEN.metal)); gr.addColorStop(1, tonC(zelazo, -0.5, CIEN.metal));
    st2 = gr;
  }
  m.ksztalt(ob, st2, (g) => {
    if (!m.bogato) { if (m.lod === 2) { g.strokeStyle = 'rgba(12,8,8,0.7)'; g.lineWidth = Math.max(0.4, h * 0.002); g.stroke(ob); } return; }
    g.save(); g.clip(ob);
    // rdza w zagłębieniach i jasna, wytarta krawędź szpica i ostrza
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgba(170,96,52,0.55)';
    for (let i = 0; i < 3; i++) {
      const [qx, qy] = E(-0.07 + 0.17 * los(id, 1100 + i), -0.02 + 0.04 * los(id, 1110 + i));
      g.beginPath(); g.ellipse(qx, qy, h * (0.006 + 0.008 * los(id, 1120 + i)), h * 0.005, kat, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(236,228,214,0.6)'; g.lineWidth = Math.max(0.4, h * 0.0022);
    g.beginPath(); g.moveTo(...E(0.04, -0.017)); g.quadraticCurveTo(...E(0.09, -0.015), ...E(0.145, -0.029));
    g.moveTo(...E(-0.088, -0.04)); g.lineTo(...E(-0.094, 0.024)); g.stroke();
    swiatlocien(g, ob, [[0.01 * h, 'rgba(4,4,8,0.5)'], [warstwaTuszu(h)[0], TUSZ]], SWB, undefined, true);
    g.restore();
    g.strokeStyle = 'rgba(12,8,8,0.7)'; g.lineWidth = Math.max(0.4, h * 0.002); g.stroke(ob);
  });
  const [tx, ty] = E(0.15, -0.03);
  return { x: tx, y: ty };
}
