import { CIEN, clamp, cos, lerp, mieszaj, PI, sin, TAU, tonC, type Pkt } from './matma';
import { glowaProfil, konczyna, naGlowie, nos, twarz } from './malarz';
import { grzyb, krople, laska, mlotek, muchy, nimb, para, poswiata, swieca, type Rysunek } from './wspolne';
import { broda, wlosy } from './robotnik';
import { uderzenie } from './pamiec';
import type { Szkielet } from './szkielet';

/**
 * Pobożny — diakon z fresków i mozaik: długa jasna szata (sticharion) z czerwonymi clavi
 * i haftowanym rąbkiem, przez ramię czerwona stuła (orarion) z krzyżykami wyszytymi złotem,
 * tonsura, odsłonięta twarz o dużych oczach ikony. Niesie krzyż procesyjny, modli się
 * z rękami wzniesionymi jak orant — wtedy za głową zapala się złoty nimb.
 * Mrok daje mu otoczenie, nie strój: drżące światło świecy, strach i krew na bandażu.
 */

/** Punkty na krzywej kwadratowej a → b (c — punkt kontrolny). */
function krzywa(a: Pkt, c: Pkt, b: Pkt, n: number): Pkt[] {
  const w: Pkt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    w.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
  }
  return w;
}

/** Pasmo materiału stałej szerokości wzdłuż łamanej. */
function pasmo(pk: Pkt[], szer: number): Path2D {
  const L: Pkt[] = [], R: Pkt[] = [];
  for (let i = 0; i < pk.length; i++) {
    const a = pk[Math.max(0, i - 1)], b = pk[Math.min(pk.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const nx = (-dy / d) * szer * 0.5, ny = (dx / d) * szer * 0.5;
    L.push({ x: pk[i].x + nx, y: pk[i].y + ny }); R.push({ x: pk[i].x - nx, y: pk[i].y - ny });
  }
  const p = new Path2D();
  p.moveTo(L[0].x, L[0].y);
  for (let i = 1; i < L.length; i++) p.lineTo(L[i].x, L[i].y);
  for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i].x, R[i].y);
  p.closePath();
  return p;
}

/** Stuła (orarion): czerwone pasmo, złote krzyżyki co kawałek, frędzle na końcu. */
function stula(r: Rysunek, pk: Pkt[], dalej: boolean): void {
  const { m, st, h } = r;
  const szer = 0.03 * h, n = pk.length;
  const a = pk[0], b = pk[n - 1];
  m.ksztalt(pasmo(pk, szer), m.plaszczyzna(a.x + 0.02 * h, a.y, b.x - 0.02 * h, b.y, st.stula, dalej), (g) => {
    if (m.prosto) return;
    g.strokeStyle = tonC(st.zloto, dalej ? -0.35 : 0.05, CIEN.tkanina); g.lineWidth = Math.max(0.5, h * 0.0055);
    g.beginPath();
    for (let i = 1; i < n - 1; i += 2) {
      const q = pk[i], p0 = pk[i - 1], p1 = pk[i + 1];
      const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, k = szer * 0.32;
      g.moveTo(q.x - ux * k, q.y - uy * k); g.lineTo(q.x + ux * k, q.y + uy * k);
      g.moveTo(q.x + uy * k, q.y - ux * k); g.lineTo(q.x - uy * k, q.y + ux * k);
    }
    g.stroke();
    // złoty brzeg i frędzle na końcu
    const p0 = pk[n - 2], dx = b.x - p0.x, dy = b.y - p0.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    g.strokeStyle = tonC(st.zloto, dalej ? -0.4 : -0.1, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.008);
    g.beginPath(); g.moveTo(b.x + uy * szer * 0.5, b.y - ux * szer * 0.5); g.lineTo(b.x - uy * szer * 0.5, b.y + ux * szer * 0.5); g.stroke();
    if (m.lod === 2) {
      g.strokeStyle = tonC(st.stula, -0.1, CIEN.tkanina); g.lineWidth = Math.max(0.4, h * 0.004);
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const t = (i / 4 - 0.5) * 0.9, x = b.x - uy * szer * t, y = b.y + ux * szer * t;
        g.moveTo(x, y); g.lineTo(x + ux * 0.022 * h, y + uy * 0.022 * h);
      }
      g.stroke();
    }
  });
}

/** Rękaw szaty: ramię, przedramię rozszerzone ku dłoni, czerwony mankiet ze złotym brzegiem. */
function rekaw(r: Rysunek, bark: Pkt, lok: Pkt, dl: Pkt, przed: number, dalej: boolean, piesc: boolean, bandaz = false): void {
  const { m, h, st, pm, czas, c } = r;
  const szata = st.szata;
  const r1 = 0.035 * h, r2 = 0.031 * h;
  m.ksztalt(konczyna(bark, r1, lok, r2, 0.003 * h, 0.005 * h), m.bryla(bark, lok, r1, szata, dalej), undefined, !dalej);
  const ux = dl.x - lok.x, uy = dl.y - lok.y, L = Math.hypot(ux, uy) || 1;
  const nx = -uy / L, ny = ux / L;
  const ex = lok.x + ux * 0.8, ey = lok.y + uy * 0.8;
  const roz = 0.04 * h;
  const zwis = 0.02 * h * (0.4 + 0.6 * Math.abs(nx)) + pm.szata.a * 0.01 * h;
  const p = new Path2D();
  p.moveTo(lok.x + nx * r2, lok.y + ny * r2);
  p.lineTo(ex + nx * roz, ey + ny * roz);
  p.quadraticCurveTo(ex + ux / L * 0.012 * h, ey + uy / L * 0.012 * h + zwis * 0.5, ex - nx * roz, ey - ny * roz + zwis * 0.4);
  p.lineTo(lok.x - nx * r2, lok.y - ny * r2);
  p.arc(lok.x, lok.y, r2, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
  p.closePath();
  m.ksztalt(p, m.bryla(lok, { x: ex, y: ey }, roz, szata, dalej), (g) => {
    if (m.prosto) return;
    // mankiet: czerwony pas tuż przy brzegu rękawa
    const kx = ex - (ux / L) * 0.014 * h, ky = ey - (uy / L) * 0.014 * h;
    g.strokeStyle = tonC(st.stula, dalej ? -0.3 : 0, CIEN.tkanina); g.lineWidth = Math.max(0.8, h * 0.016); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(kx + nx * roz * 0.98, ky + ny * roz * 0.98); g.lineTo(kx - nx * roz * 0.98, ky - ny * roz * 0.98 + zwis * 0.3); g.stroke();
    g.lineCap = 'round';
    if (m.lod === 2 && !dalej) {
      g.strokeStyle = tonC(st.zloto, 0, CIEN.tkanina, 0.9); g.lineWidth = Math.max(0.4, h * 0.004);
      const o = 0.009 * h;
      g.beginPath();
      g.moveTo(kx + nx * roz - (ux / L) * o, ky + ny * roz - (uy / L) * o); g.lineTo(kx - nx * roz - (ux / L) * o, ky - ny * roz - (uy / L) * o + zwis * 0.3);
      g.stroke();
    }
  }, !dalej);
  // dłoń
  const d = new Path2D();
  if (piesc) d.arc(dl.x, dl.y, 0.024 * h, 0, TAU);
  else d.ellipse(dl.x + Math.sin(przed) * 0.012 * h, dl.y + Math.cos(przed) * 0.012 * h, 0.027 * h, 0.019 * h, Math.atan2(Math.cos(przed), Math.sin(przed)), 0, TAU);
  m.ksztalt(d, m.kula(dl, 0.028 * h, st.skora, dalej, 0, CIEN.skora), (g) => {
    if (!bandaz || m.prosto) return;
    // bandaż na nadgarstku przesiąknięty krwią — ślad „okalecz się”
    const bx = lerp(lok.x, dl.x, 0.84), by = lerp(lok.y, dl.y, 0.84);
    g.save(); g.translate(bx, by); g.rotate(Math.atan2(uy, ux));
    g.fillStyle = 'rgb(186,176,150)'; g.fillRect(-0.014 * h, -0.022 * h, 0.028 * h, 0.044 * h);
    g.fillStyle = 'rgba(116,16,12,0.9)'; g.beginPath(); g.ellipse(0, 0.006 * h, 0.01 * h, 0.015 * h, 0, 0, TAU); g.fill();
    g.restore();
    krople(g, bx, by + 0.02 * h, h, czas, c.id);
  });
}

export function rysujPoboznego(r: Rysunek): void {
  const { m, s, p, tryb, st, h, c, czas, pm, cz } = r;
  const kat = s.katG;
  const szata = st.szata;
  const kleczy = cz === 'modli' || cz === 'je' || cz === 'buduje' || p.wis > 0.5;
  const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
  const Lt = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const T = (u: number, f: number): Pkt => ({ x: s.biodro.x + tx * u * Lt + fx * f * h, y: s.biodro.y + ty * u * Lt + fy * f * h });

  // ---- nimb za całą postacią (rysowany od razu — pod obrysem)
  if (p.blask > 0.05 && (cz === 'modli' || cz === 'czyta')) {
    const nc = naGlowie(s, kat, -0.15, -0.2);
    nimb(m.g, nc.x, nc.y, s.rg * 1.6, clamp(p.blask * 1.2 - 0.2, 0, 1), m.lod, st.zloto);
  }

  // ---- stuła z tyłu: zwisa z barku wzdłuż pleców, w ruchu odlatuje
  {
    const a = clamp((pm.wstega.a + 0.35) * 0.6, -1.3, 0.3) - s.katT * 0.6;
    const A = T(1.0, -0.02), C = T(0.78, -0.09);
    const B = { x: C.x + sin(a) * 0.4 * h, y: C.y + cos(a) * 0.4 * h };
    stula(r, krzywa(A, C, B, 8), true);
  }

  // ---- dalsza ręka
  if (!tryb.oburacz && !tryb.zlozone && !tryb.ksiega) rekaw(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, true);

  // ---- nogi: przy klęczeniu i wiszeniu kolana pod szatą; stopy w sandałach
  const stopa = mieszaj(st.skora, [96, 76, 60], 0.2);
  const sandal = (stp: typeof s.stA, dalej: boolean) => {
    const b = new Path2D();
    b.ellipse(stp.podeszwa.x + 0.022 * h, stp.podeszwa.y - 0.008 * h, 0.044 * h, 0.016 * h, -stp.kat, PI, 0);
    b.lineTo(stp.podeszwa.x + 0.066 * h, stp.podeszwa.y + 0.002 * h); b.lineTo(stp.podeszwa.x - 0.022 * h, stp.podeszwa.y + 0.002 * h);
    b.closePath();
    m.ksztalt(b, m.plaszczyzna(stp.podeszwa.x, stp.podeszwa.y - 0.03 * h, stp.podeszwa.x, stp.podeszwa.y, stopa, dalej, 1, CIEN.skora), (g) => {
      if (m.prosto) return;
      g.strokeStyle = tonC(st.buty, dalej ? -0.3 : 0, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.008);
      g.beginPath();
      g.moveTo(stp.podeszwa.x - 0.022 * h, stp.podeszwa.y + 0.001 * h); g.lineTo(stp.podeszwa.x + 0.064 * h, stp.podeszwa.y + 0.001 * h);
      g.moveTo(stp.podeszwa.x + 0.008 * h, stp.podeszwa.y - 0.02 * h); g.lineTo(stp.podeszwa.x + 0.03 * h, stp.podeszwa.y - 0.001 * h);
      g.moveTo(stp.podeszwa.x + 0.034 * h, stp.podeszwa.y - 0.015 * h); g.lineTo(stp.podeszwa.x + 0.046 * h, stp.podeszwa.y);
      g.stroke();
    });
  };
  if (kleczy) {
    for (const [kol, stp, dalej] of [[s.kolB, s.stB, true], [s.kolA, s.stA, false]] as const) {
      m.ksztalt(konczyna(s.biodro, 0.064 * h, kol, 0.048 * h, 0.01 * h, 0.012 * h), m.bryla(s.biodro, kol, 0.064 * h, szata, dalej));
      m.ksztalt(konczyna(kol, 0.048 * h, stp.kostka, 0.042 * h, 0.01 * h, 0.004 * h), m.bryla(kol, stp.kostka, 0.048 * h, szata, dalej));
      sandal(stp, dalej);
    }
  } else {
    sandal(s.stB, true);
    sandal(s.stA, false);
  }

  // ---- szata (sticharion)
  const stopyY = Math.max(s.stA.podeszwa.y, s.stB.podeszwa.y);
  const fal = sin(czas * 0.005 + c.id) * 0.008 * h * clamp(Math.abs(pm.vx) / 2 + 0.3, 0, 1);
  let przod: number, tyl: number, dol: number;
  if (kleczy) {
    przod = Math.max(s.kolA.x, s.kolB.x) + 0.02 * h; tyl = Math.min(s.biodro.x - 0.08 * h, s.kolB.x - 0.04 * h);
    dol = Math.max(s.kolA.y, s.kolB.y) - 0.02 * h;
  } else {
    przod = Math.max(s.kolA.x, s.stA.palce.x - 0.03 * h, s.kolB.x, s.stB.palce.x - 0.03 * h, s.biodro.x + 0.085 * h) + 0.025 * h;
    tyl = Math.min(s.kolA.x, s.stA.pieta.x, s.kolB.x, s.stB.pieta.x, s.biodro.x - 0.085 * h) - 0.025 * h + pm.szata.a * 0.05 * h;
    przod = Math.min(przod, s.biodro.x + 0.19 * h); tyl = Math.max(tyl, s.biodro.x - 0.2 * h);
    dol = stopyY - 0.034 * h;
  }
  const bp = T(1.0, 0.06), bt = T(1.0, -0.072), kolPrzod = s.kolA.x > s.kolB.x ? s.kolA : s.kolB;
  const sz = new Path2D();
  sz.moveTo(bt.x, bt.y);
  const c1 = T(0.45, -0.086);
  sz.quadraticCurveTo(c1.x, c1.y, lerp(s.biodro.x - 0.08 * h, tyl, 0.3), s.biodro.y + 0.03 * h);
  sz.quadraticCurveTo(tyl - 0.006 * h, (s.biodro.y + dol) / 2 + 0.05 * h, tyl, dol + fal);
  sz.quadraticCurveTo((tyl + przod) / 2, dol + 0.012 * h, przod, dol - fal);
  const bd = T(-0.05, kleczy ? 0.075 : 0.08);
  if (!kleczy) sz.quadraticCurveTo(kolPrzod.x + 0.05 * h, kolPrzod.y + 0.02 * h, bd.x, bd.y);
  else sz.lineTo(bd.x, bd.y);
  const c2 = T(0.55, 0.088);
  sz.quadraticCurveTo(c2.x, c2.y, bp.x, bp.y);
  sz.closePath();
  const PAS = 0.36;
  m.ksztalt(sz, m.plaszczyzna(przod, s.bark.y, tyl, dol, szata, false, 1.1), (g) => {
    if (m.prosto) return;
    // pył i błoto przy rąbku
    const br = g.createLinearGradient(0, dol - 0.09 * h, 0, dol + 0.012 * h);
    br.addColorStop(0, 'rgba(52,36,26,0)'); br.addColorStop(1, 'rgba(52,36,26,0.5)');
    g.fillStyle = br; g.fill(sz);
    // fałdy rozchodzą się wachlarzem od talii: sinopia w bruzdach, biel wapienna na grzbietach
    const f0 = T(PAS, -0.07), f1 = T(PAS, 0.07);
    const FALDY: [number, number, number][] = [[0.18, 0.03, -1], [0.42, 0.09, 0.6], [0.63, 0.02, -0.4], [0.84, 0.13, 1]];
    for (const [t, od, zg] of FALDY) {
      const x0 = lerp(f0.x, f1.x, t), y0 = lerp(f0.y, f1.y, t) + od * h, x2 = lerp(tyl, przod, t) + zg * 0.008 * h;
      const cx = (x0 + x2) / 2 + zg * 0.018 * h + sin(czas * 0.004 + t * 9) * 0.004 * h, cy = (y0 + dol) / 2;
      g.strokeStyle = 'rgba(92,42,26,0.42)'; g.lineWidth = Math.max(0.5, h * 0.008);
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x2, dol - 0.02 * h); g.stroke();
      if (m.lod === 2) {
        g.strokeStyle = 'rgba(240,232,212,0.35)'; g.lineWidth = Math.max(0.4, h * 0.006);
        g.beginPath(); g.moveTo(x0 + 0.01 * h, y0 + 0.03 * h); g.quadraticCurveTo(cx + 0.011 * h, cy, x2 + 0.011 * h, dol - 0.035 * h); g.stroke();
      }
    }
    // clavi: dwa czerwone pasy od barków do rąbka
    g.strokeStyle = tonC(st.stula, -0.12, CIEN.tkanina); g.lineWidth = Math.max(0.8, h * 0.015); g.lineCap = 'butt';
    const a1 = T(0.98, 0.032), a2 = T(0.1, 0.06), b1 = T(0.98, -0.05), b2 = T(0.1, -0.07);
    g.beginPath();
    g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.lineTo(lerp(a2.x, przod, 0.42), dol - fal - 0.01 * h);
    g.moveTo(b1.x, b1.y); g.lineTo(b2.x, b2.y); g.lineTo(lerp(b2.x, tyl, 0.42), dol + fal - 0.004 * h);
    g.stroke();
    // haftowany rąbek: czerwony pas ze złotymi kropkami
    const r0 = { x: tyl + 0.004 * h, y: dol + fal - 0.016 * h }, rk = { x: przod - 0.004 * h, y: dol - fal - 0.016 * h }, rc = { x: (tyl + przod) / 2, y: dol - 0.004 * h };
    g.strokeStyle = tonC(st.stula, 0, CIEN.tkanina); g.lineWidth = Math.max(0.9, h * 0.02);
    g.beginPath(); g.moveTo(r0.x, r0.y); g.quadraticCurveTo(rc.x, rc.y, rk.x, rk.y); g.stroke();
    if (m.lod === 2) {
      g.fillStyle = tonC(st.zloto, 0.1, CIEN.tkanina);
      for (const q of krzywa(r0, rc, rk, 9)) { g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, h * 0.0045), 0, TAU); g.fill(); }
    }
    g.lineCap = 'round';
    // cienki pas w talii z frędzlem
    const z1 = T(PAS, -0.084), z2 = T(PAS, 0.086);
    g.strokeStyle = tonC(st.stula, -0.3, CIEN.tkanina); g.lineWidth = Math.max(0.7, h * 0.009);
    g.beginPath(); g.moveTo(z1.x, z1.y); g.lineTo(z2.x, z2.y); g.stroke();
    const w = T(PAS, 0.07), a = pm.szata.a * 1.3 + sin(czas * 0.004 + c.id) * 0.1;
    g.beginPath(); g.moveTo(w.x, w.y); g.lineTo(w.x + sin(a) * 0.02 * h, w.y + 0.09 * h); g.stroke();
    // dekolt
    const d1 = T(1.0, 0.0), d2 = T(0.97, 0.05);
    g.strokeStyle = tonC(st.stula, -0.05, CIEN.tkanina); g.lineWidth = Math.max(0.7, h * 0.01);
    g.beginPath(); g.moveTo(d1.x, d1.y); g.quadraticCurveTo(T(0.93, 0.02).x, T(0.93, 0.02).y, d2.x, d2.y); g.stroke();
  }, false, true);

  // ---- stuła z przodu: przez bark i pierś, swobodnie zwisa przed szatą
  {
    const a = clamp((pm.wstega.a + 0.35) * 0.3, -0.5, 0.2) - s.katT * 0.9;
    const A = T(1.02, 0.0), C = T(0.62, 0.078);
    const B = { x: C.x + sin(a) * 0.28 * h + 0.01 * h, y: C.y + cos(a) * 0.28 * h };
    stula(r, krzywa(A, C, B, 8), false);
  }

  // ---- świeca wotywna przed klęczącym
  if (cz === 'modli') {
    const sx = Math.max(s.kolA.x, s.stA.palce.x) + 0.08 * h;
    m.szczegol((g) => swieca(g, sx, 0, h * 0.9, czas, c.id + 3, m.lod));
  }

  // ---- głowa
  glowaPoboznego(r, s, kat);

  // ---- krzyż procesyjny, księga, młotek; bliższa ręka
  if (tryb.narzedzie === 'laska') {
    laska(m, s.dlonA.x, s.dlonA.y, s.narz, h, st, pm.wstega.a + 0.35, czas, cz !== 'walczy', c.id);
    if (cz === 'walczy') {
      const d = { x: sin(s.narz), y: cos(s.narz) };
      const k = { x: s.dlonA.x - d.x * 0.46 * h, y: s.dlonA.y - d.y * 0.46 * h };
      uderzenie(pm, p.cios, k, h, czas);
      if (p.cios > 0.05 && !m.prosto) m.szczegol((g) => poswiata(g, k.x, k.y, h * 0.2 * p.cios + h * 0.05, [255, 220, 160], 0.6 * p.cios));
    }
  } else if (tryb.narzedzie === 'mlot') {
    uderzenie(pm, p.cios, mlotek(m, s.dlonA.x, s.dlonA.y, s.narz, h, st), h, czas);
    const kx = s.dlonA.x + 0.12 * h, ky = 0;
    const k = new Path2D(); k.rect(kx - 0.06 * h, ky - 0.07 * h, 0.12 * h, 0.07 * h);
    m.ksztalt(k, m.plaszczyzna(kx, ky - 0.07 * h, kx, ky, [150, 140, 122], false, 1, CIEN.kamien), (g) => {
      if (m.prosto) return;
      g.strokeStyle = 'rgba(60,40,28,0.6)'; g.lineWidth = Math.max(0.5, h * 0.006);
      g.beginPath(); g.moveTo(kx - 0.06 * h, ky - 0.035 * h); g.lineTo(kx + 0.06 * h, ky - 0.035 * h); g.moveTo(kx, ky - 0.07 * h); g.lineTo(kx, ky - 0.035 * h); g.stroke();
      // krzyż ryty w kamieniu ołtarza
      g.strokeStyle = tonC(st.stula, -0.2, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.008);
      g.beginPath(); g.moveTo(kx + 0.03 * h, ky - 0.066 * h); g.lineTo(kx + 0.03 * h, ky - 0.04 * h); g.moveTo(kx + 0.02 * h, ky - 0.057 * h); g.lineTo(kx + 0.04 * h, ky - 0.057 * h); g.stroke();
    }, false, true);
  }
  if (tryb.ksiega) ksiega(r);
  if (tryb.oburacz || tryb.zlozone || tryb.ksiega) rekaw(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, true);
  rekaw(r, s.bark, s.lokA, s.dlonA, s.przedA, false, tryb.narzedzie !== null || tryb.oburacz, st.okaleczony);
  if (tryb.zlozone) {
    m.szczegol((g) => {
      const x = (s.dlonA.x + s.dlonB.x) / 2, y = (s.dlonA.y + s.dlonB.y) / 2;
      g.fillStyle = tonC(st.skora, -0.05, CIEN.skora);
      g.beginPath(); g.ellipse(x + 0.006 * h, y - 0.02 * h, 0.015 * h, 0.032 * h, 0.35, 0, TAU); g.fill();
      if (!m.prosto) { g.strokeStyle = 'rgba(70,36,24,0.7)'; g.lineWidth = Math.max(0.4, h * 0.004); g.beginPath(); g.moveTo(x + 0.002 * h, y + 0.008 * h); g.lineTo(x + 0.012 * h, y - 0.046 * h); g.stroke(); }
    });
  }
  if (tryb.grzyb) m.szczegol((g) => grzyb(g, s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h, h, m.lod));
  if (!m.prosto && st.zatruty) m.szczegol((g) => muchy(g, s.glowa.x, s.glowa.y, h, czas, c.id));
}

function glowaPoboznego(r: Rysunek, s: Szkielet, kat: number): void {
  const { m, p, st, h, c, czas, cz } = r;
  const modlitwa = cz === 'modli' || cz === 'czyta';
  m.ksztalt(konczyna(s.bark, 0.024 * h, s.glowa, 0.022 * h), m.bryla(s.bark, s.glowa, 0.026 * h, st.skora, true, 1, CIEN.skora));
  m.ksztalt(glowaProfil(s, kat), m.kula(s.glowa, s.rg, st.skora, false, 0, CIEN.skora), (g) => {
    twarz(g, s, kat, p, st.skora, m.lod, {
      brew: st.stary ? 'rgba(150,146,138,0.95)' : undefined, wzrok: modlitwa ? 0.6 + p.blask * 0.6 : 0.15,
      puste: st.szalenstwo > 0.45 ? st.szalenstwo : 0, strach: Math.max(0, st.strach - 0.3) * 1.4,
    });
    if (st.broda && !m.prosto) broda(g, s, kat, st.broda, st.wlosy, m.lod);
    // szept modlitwy: para z ust
    if (m.lod > 0 && modlitwa) { const u = naGlowie(s, kat, 1.0, 0.6); para(g, u.x, u.y, h, czas, c.id, 0.8); }
  });
  m.ksztalt(nos(s, kat, 1.05), m.kula(naGlowie(s, kat, 1.05, 0.15), s.rg * 0.3, st.skora, false, 0, CIEN.skora));
  wlosy(r, s, kat, true);
}

/** Ewangeliarz: złota okładka z czerwonymi kamieniami, otwarte karty, unoszące się litery. */
function ksiega(r: Rysunek): void {
  const { m, s, p, st, h, c, czas, sim } = r;
  const bx = (s.dlonA.x + s.dlonB.x) / 2 + 0.035 * h, by = (s.dlonA.y + s.dlonB.y) / 2 - 0.02 * h;
  const blysk = c.ksiegaT !== undefined ? clamp(1 - (sim.tick - c.ksiegaT) / 60, 0, 1) : 0;
  m.szczegol((g) => poswiata(g, bx, by, h * (0.28 + blysk * 0.4), [255, 226, 170], 0.3 + p.blask * 0.22));
  const w = 0.075 * h, hh = 0.1 * h;
  const ok = new Path2D(); ok.rect(bx - w - 0.008 * h, by - hh / 2 - 0.008 * h, w * 2 + 0.016 * h, hh + 0.016 * h);
  m.ksztalt(ok, m.metal({ x: bx - w, y: by - hh }, { x: bx + w, y: by + hh }, hh, st.zloto, false, CIEN.tkanina), (g) => {
    g.fillStyle = 'rgb(222,210,180)';
    g.beginPath();
    g.moveTo(bx - w, by - hh / 2); g.quadraticCurveTo(bx - w / 2, by - hh / 2 - 0.012 * h, bx, by - hh / 2 + 0.004 * h);
    g.quadraticCurveTo(bx + w / 2, by - hh / 2 - 0.012 * h, bx + w, by - hh / 2);
    g.lineTo(bx + w, by + hh / 2); g.quadraticCurveTo(bx + w / 2, by + hh / 2 - 0.008 * h, bx, by + hh / 2 + 0.004 * h);
    g.quadraticCurveTo(bx - w / 2, by + hh / 2 - 0.008 * h, bx - w, by + hh / 2); g.closePath(); g.fill();
    if (m.prosto) return;
    g.fillStyle = 'rgba(90,60,30,0.25)'; g.fillRect(bx - 0.006 * h, by - hh / 2, 0.012 * h, hh);
    g.strokeStyle = 'rgba(50,30,20,0.6)'; g.lineWidth = Math.max(0.4, h * 0.004);
    g.beginPath();
    for (let i = 1; i < 5; i++) { const y = by - hh / 2 + (hh * i) / 5; g.moveTo(bx - w * 0.82, y); g.lineTo(bx - w * 0.15, y); g.moveTo(bx + w * 0.15, y); g.lineTo(bx + w * 0.82, y); }
    g.stroke();
    // czerwony inicjał i czerwone kamienie w narożnikach okładki
    g.fillStyle = tonC(st.stula, 0.1, CIEN.tkanina); g.fillRect(bx - w * 0.8, by - hh / 2 + hh * 0.08, w * 0.2, w * 0.2);
    for (const [kx, ky] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.beginPath(); g.arc(bx + kx * (w + 0.002 * h), by + ky * (hh / 2 + 0.002 * h), Math.max(0.6, h * 0.0065), 0, TAU); g.fill();
    }
    const kk = (czas * 0.0009 + c.id) % 1;
    if (kk < 0.3) {
      const t = kk / 0.3, x = bx + w * Math.cos(t * PI), lift = 0.02 * h * Math.sin(t * PI);
      g.fillStyle = 'rgb(210,198,166)';
      g.beginPath(); g.moveTo(bx, by - hh / 2); g.quadraticCurveTo((bx + x) / 2, by - hh / 2 - lift * 1.5, x, by - hh / 2 - lift); g.lineTo(x, by + hh / 2 - lift); g.quadraticCurveTo((bx + x) / 2, by + hh / 2 - lift * 1.2, bx, by + hh / 2); g.closePath(); g.fill();
    }
    if (m.lod === 2) {
      g.fillStyle = 'rgba(255,232,170,0.8)';
      for (let i = 0; i < 4; i++) {
        const t = (czas * 0.0004 + i * 0.25 + c.id * 0.1) % 1;
        const x = bx + sin(t * 7 + i) * 0.04 * h + (i - 1.5) * 0.02 * h, y = by - hh / 2 - t * 0.25 * h;
        g.globalAlpha = 1 - t; g.fillRect(x, y, h * 0.008, h * 0.012); g.fillRect(x - h * 0.004, y + h * 0.003, h * 0.016, h * 0.004);
      }
      g.globalAlpha = 1;
    }
  });
  if (blysk > 0 && !m.prosto) m.szczegol((g) => poswiata(g, bx + 0.08 * h, by, h * 0.6 * blysk + 0.1 * h, [255, 244, 210], 0.55 * blysk));
}
