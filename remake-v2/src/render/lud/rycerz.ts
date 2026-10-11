import { CIEN, clamp, cos, kier, lerp, los, mieszaj, PI, sin, TAU, tonC, type Pkt, type Rgb } from './matma';
import { but, dlon, glowaProfil, konczyna, naGlowie, nos, podeszwa, twarz, type Malarz } from './malarz';
import { grzyb, miecz, poswiata, tulowSciezka, type Rysunek } from './wspolne';
import { broda, poGlowie } from './robotnik';
import { sladBroni, uderzenie } from './pamiec';
import type { Stopa } from './szkielet';

/**
 * Rycerz — krzyżowiec po bitwie (Remake v2). Smukły, w ciemnej kolczudze od kaptura po stopy, na niej
 * brudny płócienny wapenrok z krwawym krzyżem, podarty u dołu, rozcięty i zachlapany zaschniętą krwią;
 * z tyłu postrzępiony ciemny płaszcz. Garnczkowy hełm z wizjerem, otworami i wgnieceniami — albo otwarty
 * hełm z nosalem, spod którego widać twarz z blizną i strużką krwi z czoła. Wyszczerbiona tarcza z krzyżem,
 * w niej utkwione strzały; miecz we krwi. Część nosi bandaż na przedramieniu, część — złamaną strzałę w barku.
 *
 * Cieniowanie jest miękkie (płynne przejścia zamiast trzech twardych pasów fresku) — twarde pasy dawały
 * kanciaste, „klockowe” kończyny. Wygląd zależy od numeru postaci (los), więc każdy rycerz jest trochę inny.
 * Zdrajca (bunt) — poczerniały wapenrok i tarcza, krzyż żarzy się czerwienią.
 */

/** Skąd pada światło lampki (jak w malarzu): z góry, trochę od przodu. */
const SW = { x: 0.45, y: -0.89 };
const KREW: Rgb = [92, 14, 12];
const KREW_SWIEZA: Rgb = [128, 18, 14];
const DREWNO: Rgb = [92, 66, 44];

/** Miękka bryła: światło, ton, głęboki cień i słaby odblask z tyłu — bez twardych pasów. */
function walec(m: Malarz, a: Pkt, b: Pkt, r: number, kol: Rgb, dalej = false, cien: Rgb = CIEN.metal, blask = 0): string | CanvasGradient {
  const baza = dalej ? -0.32 : 0;
  if (m.prosto || (dalej && m.lod < 2)) return tonC(kol, baza - 0.06, cien);
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L;
  if (nx * SW.x + ny * SW.y < 0) { nx = -nx; ny = -ny; }
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const gr = m.g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
  gr.addColorStop(0, tonC(kol, baza + 0.12 + blask, cien));
  gr.addColorStop(0.24, tonC(kol, baza + 0.04 + blask * 0.4, cien));
  gr.addColorStop(0.58, tonC(kol, baza - 0.12, cien));
  gr.addColorStop(0.88, tonC(kol, baza - 0.44, cien));
  gr.addColorStop(1, tonC(kol, baza - 0.32, cien));
  return gr;
}

/** Miękka płaszczyzna (płótno): od światła przy (x0, y0) do cienia przy (x1, y1). */
function plotno(m: Malarz, x0: number, y0: number, x1: number, y1: number, kol: Rgb, dalej = false): string | CanvasGradient {
  const baza = dalej ? -0.3 : 0;
  if (m.prosto || (dalej && m.lod < 2)) return tonC(kol, baza - 0.06, CIEN.tkanina);
  const gr = m.g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, tonC(kol, baza + 0.08, CIEN.tkanina));
  gr.addColorStop(0.45, tonC(kol, baza - 0.04, CIEN.tkanina));
  gr.addColorStop(1, tonC(kol, baza - 0.36, CIEN.tkanina));
  return gr;
}

/** Oczka kolczugi: z bliska rzędy drobnych kółek, z daleka cienkie prążki — w obrębie ścieżki. */
function oczka(m: Malarz, g: CanvasRenderingContext2D, sciezka: Path2D, a: Pkt, b: Pkt, szer: number, kol: Rgb, h: number): void {
  if (m.lod < 1) return;
  const x0 = Math.min(a.x, b.x) - szer, x1 = Math.max(a.x, b.x) + szer, y0 = Math.min(a.y, b.y) - szer, y1 = Math.max(a.y, b.y) + szer;
  g.save();
  g.clip(sciezka);
  if (m.lod === 2) {
    const d = Math.max(1.7, h * 0.0125);
    g.strokeStyle = tonC(kol, -0.62, CIEN.metal, 0.55); g.lineWidth = Math.max(0.35, d * 0.22);
    g.beginPath();
    let rzad = 0;
    for (let y = y0; y <= y1; y += d * 0.78, rzad++) {
      for (let x = x0 + (rzad % 2) * d * 0.5; x <= x1; x += d) { g.moveTo(x + d * 0.42, y); g.arc(x, y, d * 0.42, 0, PI); }
    }
    g.stroke();
    g.strokeStyle = tonC(kol, 0.45, CIEN.metal, 0.18); g.lineWidth = Math.max(0.3, d * 0.16);
    g.beginPath();
    rzad = 0;
    for (let y = y0; y <= y1; y += d * 0.78, rzad++) {
      for (let x = x0 + (rzad % 2) * d * 0.5; x <= x1; x += d) { g.moveTo(x - d * 0.3, y - d * 0.1); g.arc(x, y, d * 0.42, PI + 0.6, TAU - 0.9); }
    }
    g.stroke();
  } else {
    const d = Math.max(1.5, h * 0.02);
    g.strokeStyle = tonC(kol, -0.55, CIEN.metal, 0.4); g.lineWidth = Math.max(0.4, h * 0.004);
    g.beginPath();
    for (let y = y0; y <= y1; y += d) { g.moveTo(x0, y); g.lineTo(x1, y + d * 0.3); }
    g.stroke();
  }
  g.restore();
}

/** Plama zaschniętej krwi: kilka nachodzących kropli i (gdy `zacieki`) strużki w dół. Kształt z numeru postaci. */
function plama(g: CanvasRenderingContext2D, x: number, y: number, r: number, id: number, n: number, kol: Rgb, alfa: number, zacieki: number, h: number): void {
  g.fillStyle = `rgba(${kol[0]},${kol[1]},${kol[2]},${alfa})`;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = los(id, 40 + i) * TAU, d = los(id, 60 + i) * r * 0.9, rr = r * (0.35 + 0.55 * los(id, 80 + i));
    g.moveTo(x + Math.cos(a) * d + rr, y + Math.sin(a) * d);
    g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, TAU);
  }
  g.fill();
  if (zacieki > 0) {
    g.strokeStyle = `rgba(${kol[0]},${kol[1]},${kol[2]},${alfa * 0.9})`; g.lineCap = 'round';
    for (let i = 0; i < zacieki; i++) {
      const sx = x + (los(id, 100 + i) - 0.5) * r * 1.4, dl = r * (1.2 + 2.2 * los(id, 120 + i));
      g.lineWidth = Math.max(0.5, r * (0.18 + 0.14 * los(id, 140 + i)));
      g.beginPath(); g.moveTo(sx, y); g.quadraticCurveTo(sx + (los(id, 160 + i) - 0.5) * r * 0.4, y + dl * 0.6, sx + (los(id, 170 + i) - 0.5) * r * 0.3, y + dl); g.stroke();
      g.beginPath(); g.arc(sx + (los(id, 170 + i) - 0.5) * r * 0.3, y + dl, g.lineWidth * 0.75, 0, TAU); g.fill();
    }
  }
  if (h > 0 && alfa > 0.4) {
    // ciemniejszy brzeg zaschniętej plamy
    g.fillStyle = `rgba(${(kol[0] * 0.5) | 0},${(kol[1] * 0.5) | 0},${(kol[2] * 0.5) | 0},${alfa * 0.35})`;
    g.beginPath(); g.arc(x + r * 0.2, y + r * 0.25, r * 0.45, 0, TAU); g.fill();
  }
}

/** Wgniecenie w blasze: płytkie zagłębienie (cień) z odblaskiem na krawędzi od strony światła. */
function wgniecenie(g: CanvasRenderingContext2D, x: number, y: number, r: number, kat: number): void {
  g.fillStyle = 'rgba(14,12,12,0.38)';
  g.beginPath(); g.ellipse(x, y, r, r * 0.6, kat, 0, TAU); g.fill();
  g.fillStyle = 'rgba(230,224,212,0.22)';
  g.beginPath(); g.ellipse(x + r * 0.25, y + r * 0.3, r * 0.7, r * 0.32, kat, 0, TAU); g.fill();
}

/** Strzała: drzewce od (x, y) w kierunku kąta `kat` (do tyłu, od celu), długości `dl`; złamana — bez lotek. */
function strzala(g: CanvasRenderingContext2D, x: number, y: number, kat: number, dl: number, h: number, zlamana: boolean, lod: number): void {
  const d = kier(kat), n = kier(kat - PI / 2);
  const ex = x + d.x * dl, ey = y + d.y * dl;
  g.lineCap = 'round';
  g.strokeStyle = tonC(DREWNO, -0.5, CIEN.tkanina); g.lineWidth = Math.max(1, h * 0.012);
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  g.strokeStyle = tonC(DREWNO, 0.15, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.007);
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  if (zlamana) {
    // drzazgi na końcu
    g.strokeStyle = tonC(DREWNO, 0.25, CIEN.tkanina); g.lineWidth = Math.max(0.4, h * 0.004);
    g.beginPath();
    for (const k of [-1, 0.4, 1]) { g.moveTo(ex, ey); g.lineTo(ex + d.x * h * 0.018 + n.x * k * h * 0.008, ey + d.y * h * 0.018 + n.y * k * h * 0.008); }
    g.stroke();
  } else if (lod === 2) {
    // lotki z ciemnego pióra
    g.fillStyle = 'rgba(40,36,34,0.92)';
    for (const k of [-1, 1]) {
      g.beginPath();
      g.moveTo(ex - d.x * h * 0.04, ey - d.y * h * 0.04);
      g.lineTo(ex + n.x * k * h * 0.016, ey + n.y * k * h * 0.016);
      g.lineTo(ex + d.x * h * 0.008, ey + d.y * h * 0.008);
      g.closePath(); g.fill();
    }
  }
}

export function rysujRycerza(r: Rysunek): void {
  const { m, s, p, tryb, st, h, c, czas, pm } = r;
  const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
  const L = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const T = (u: number, f: number): Pkt => ({ x: s.biodro.x + tx * u * L + fx * f * h, y: s.biodro.y + ty * u * L + fy * f * h });
  const id = c.id;
  const strzalaWBarku = los(id, 22) < 0.35;
  const bandaz = los(id, 23) < 0.5;

  // ---- płaszcz: ciemny, spięty żelazną klamrą na barku, postrzępiony u dołu, w biegu odlatuje
  {
    const a = clamp(pm.peleryna.a + 0.18, -1.6, 0.4) * 0.8 - 0.06;
    const dl = 0.64 * h;
    const A = T(0.99, -0.07);
    const H = { x: A.x + sin(a) * dl, y: A.y + cos(a) * dl };
    const fal = sin(czas * 0.006 + id) * 0.012 * h * clamp(Math.abs(pm.vx) / 3 + 0.25, 0, 1);
    const Hp = { x: H.x + cos(a) * 0.1 * h, y: H.y - sin(a) * 0.1 * h }, Ht = { x: H.x - cos(a) * 0.14 * h + fal, y: H.y + sin(a) * 0.14 * h };
    const F = T(1.01, 0.03);
    const pl = new Path2D();
    pl.moveTo(F.x, F.y);
    pl.quadraticCurveTo(T(0.6, 0.02).x, T(0.6, 0.02).y, Hp.x, Hp.y);
    // podarty rąbek: zęby różnej długości od przodu do tyłu
    const zebow = 7;
    for (let i = 1; i <= zebow; i++) {
      const t = i / zebow, x = lerp(Hp.x, Ht.x, t), y = lerp(Hp.y, Ht.y, t);
      const gl = (0.012 + 0.05 * los(id, 200 + i)) * h, srod = lerp(Hp.x, Ht.x, t - 0.5 / zebow), srodY = lerp(Hp.y, Ht.y, t - 0.5 / zebow);
      pl.lineTo(srod + sin(a) * gl * 0.2, srodY + cos(a) * gl);
      pl.lineTo(x, y - 0.006 * h * los(id, 220 + i));
    }
    pl.quadraticCurveTo(A.x - 0.1 * h + fal * 0.5, (A.y + Ht.y) / 2, A.x - 0.012 * h, A.y - 0.02 * h);
    pl.quadraticCurveTo(T(1.04, -0.02).x, T(1.04, -0.02).y, F.x, F.y);
    pl.closePath();
    m.ksztalt(pl, plotno(m, A.x + 0.05 * h, A.y, Ht.x, Ht.y, st.plaszcz, true), (g) => {
      if (m.prosto) return;
      // fałdy od klamry ku rąbkowi
      g.strokeStyle = 'rgba(8,4,4,0.5)'; g.lineWidth = Math.max(0.6, h * 0.009);
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const t = 0.2 + i * 0.3;
        const kx = lerp(Hp.x, Ht.x, t), ky = lerp(Hp.y, Ht.y, t) - 0.02 * h;
        g.moveTo(A.x - 0.01 * h, A.y + 0.04 * h);
        g.quadraticCurveTo(lerp(A.x, kx, 0.5) - 0.02 * h + sin(czas * 0.005 + i) * 0.006 * h, lerp(A.y, ky, 0.55), kx, ky);
      }
      g.stroke();
      if (m.lod === 2) {
        // dziury i przetarcia, zaschnięta krew przy rąbku
        g.fillStyle = 'rgba(6,3,3,0.75)';
        for (let i = 0; i < 2; i++) {
          const t = 0.3 + 0.4 * los(id, 230 + i), q = { x: lerp(A.x, lerp(Hp.x, Ht.x, t), 0.75), y: lerp(A.y, lerp(Hp.y, Ht.y, t), 0.75) };
          g.beginPath(); g.ellipse(q.x, q.y, h * (0.006 + 0.008 * los(id, 240 + i)), h * 0.012, a, 0, TAU); g.fill();
        }
        plama(g, lerp(Hp.x, Ht.x, 0.35), lerp(Hp.y, Ht.y, 0.35) - 0.04 * h, 0.022 * h, id + 7, 4, KREW, 0.55, 1, h);
      }
    }, false, true);
  }

  // ---- tarcza na plecach przy wspinaczce i upadku
  const naPlecach = r.cz === 'wspina' || r.cz === 'spada';
  if (naPlecach) tarcza(r, s.bark.x - 0.08 * h, s.bark.y + 0.13 * h, 0.3 + pm.worek.a * 0.3, 0.85);

  // ---- dalsza ręka i nogi w kolczudze
  rekaKolczuga(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, true);
  nogaKolczuga(r, s.kolB, s.stB, true);
  nogaKolczuga(r, s.kolA, s.stA, false);

  // ---- kolczuga na tułowiu (widać ją na barkach i w rozcięciu wapenroku)
  {
    const sciezka = tulowSciezka(s, h, 0.07, 0.064, 1.05, 1.0);
    const a = T(0.6, 0.085), b = T(0.6, -0.085);
    m.ksztalt(sciezka, walec(m, T(0.5, 0), T(0.9, 0), 0.08 * h, st.kolczuga, false, CIEN.metal, 0.06), (g) => oczka(m, g, sciezka, a, b, 0.42 * h, st.kolczuga, h), false, false);
  }

  // ---- wapenrok: płócienna narzuta bez rękawów, przepasana, do połowy łydki, podarta, z krzyżem
  const PAS = 0.16;
  const kolanoY = Math.max(s.kolA.y, s.kolB.y);
  const przod = Math.max(s.kolA.x, s.kolB.x, s.biodro.x + 0.06 * h) + 0.035 * h + pm.szata.a * -0.012 * h;
  const tyl = Math.min(s.kolA.x, s.kolB.x, s.biodro.x - 0.065 * h) - 0.032 * h + pm.szata.a * 0.045 * h;
  const rabek = Math.min(kolanoY + 0.06 * h, s.biodro.y + 0.33 * h);
  {
    const b0 = T(0.94, -0.072), b1 = T(0.95, 0.06);
    const p0 = T(PAS + 0.05, -0.062), p1 = T(PAS + 0.05, 0.066);
    const w = new Path2D();
    w.moveTo(b0.x, b0.y);
    w.quadraticCurveTo(T(0.99, 0).x, T(0.99, 0).y, b1.x, b1.y);
    // pierś, wcięcie w pasie, potem płótno rozkloszowuje się ku rąbkowi
    w.bezierCurveTo(T(0.78, 0.09).x, T(0.78, 0.09).y, T(0.45, 0.082).x, T(0.45, 0.082).y, p1.x, p1.y);
    w.bezierCurveTo(T(PAS - 0.1, 0.07).x, T(PAS - 0.1, 0.07).y, przod - 0.012 * h, rabek - 0.12 * h, przod, rabek - 0.01 * h);
    // podarty rąbek od przodu do tyłu
    const zebow = 8;
    for (let i = 1; i <= zebow; i++) {
      const t = i / zebow;
      const xs = lerp(przod, tyl, t - 0.5 / zebow), x = lerp(przod, tyl, t);
      w.lineTo(xs, rabek + (0.008 + 0.034 * los(id, 300 + i)) * h);
      w.lineTo(x, rabek - 0.004 * h * los(id, 320 + i));
    }
    w.bezierCurveTo(tyl + 0.01 * h, rabek - 0.12 * h, T(PAS - 0.1, -0.07).x, T(PAS - 0.1, -0.07).y, p0.x, p0.y);
    w.bezierCurveTo(T(0.45, -0.082).x, T(0.45, -0.082).y, T(0.8, -0.085).x, T(0.8, -0.085).y, b0.x, b0.y);
    w.closePath();
    m.ksztalt(w, plotno(m, T(0.9, 0.08).x, T(0.9, 0.08).y, (przod + tyl) / 2, rabek + 0.03 * h, st.wapenrok), (g) => {
      if (m.prosto) {
        // z daleka: sam krzyż i jedna plama
        g.fillStyle = tonC(st.krzyz, 0, CIEN.tkanina);
        const q = T(0.68, 0.01);
        g.fillRect(q.x - 0.012 * h, q.y - 0.07 * h, 0.024 * h, 0.15 * h);
        g.fillRect(q.x - 0.05 * h, q.y - 0.03 * h, 0.1 * h, 0.022 * h);
        return;
      }
      g.save();
      g.clip(w);
      // brud i błoto ku rąbkowi
      const bl = g.createLinearGradient(0, s.biodro.y, 0, rabek + 0.04 * h);
      bl.addColorStop(0, 'rgba(50,36,24,0)'); bl.addColorStop(0.55, 'rgba(50,36,24,0.18)'); bl.addColorStop(1, 'rgba(40,28,18,0.62)');
      g.fillStyle = bl; g.fillRect(tyl - 0.05 * h, s.biodro.y - 0.05 * h, przod - tyl + 0.1 * h, rabek - s.biodro.y + 0.12 * h);
      // fałdy od pasa w dół
      g.strokeStyle = 'rgba(40,30,22,0.38)'; g.lineWidth = Math.max(0.6, h * 0.008);
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const xx = lerp(tyl, przod, 0.22 + i * 0.28);
        g.moveTo(lerp(p0.x, p1.x, 0.22 + i * 0.28), p1.y + 0.01 * h);
        g.quadraticCurveTo(xx + pm.szata.a * 0.02 * h, (p1.y + rabek) / 2, xx + (i - 1) * 0.01 * h, rabek);
      }
      g.stroke();
      // krzyż na piersi — wyblakły, przetarty
      const kq = T(0.68, 0.012), kw = Math.max(1.2, 0.026 * h);
      g.fillStyle = tonC(st.krzyz, 0, CIEN.tkanina);
      g.save(); g.translate(kq.x, kq.y); g.rotate(s.katT);
      g.fillRect(-kw / 2, -0.11 * h, kw, 0.23 * h);
      g.fillRect(-0.058 * h, -0.05 * h, 0.116 * h, kw);
      if (m.lod === 2) {
        // przetarcia na krzyżu
        g.fillStyle = tonC(st.wapenrok, -0.05, CIEN.tkanina, 0.55);
        for (let i = 0; i < 5; i++) { g.beginPath(); g.arc((los(id, 340 + i) - 0.5) * kw, (los(id, 350 + i) - 0.5) * 0.2 * h, h * 0.004 * (1 + los(id, 360 + i)), 0, TAU); g.fill(); }
      }
      g.restore();
      if (st.bunt) poswiata(g, kq.x, kq.y, h * 0.1, [255, 50, 24], 0.14 + 0.06 * sin(czas * 0.004 + id));
      // rozdarcie od cięcia: wąska szpara, przez którą widać kolczugę, brzegi postrzępione i we krwi
      {
        const c0 = T(0.36 + 0.1 * los(id, 370), -0.045), c1 = T(0.22 + 0.06 * los(id, 371), 0.05);
        const mx = (c0.x + c1.x) / 2, my = (c0.y + c1.y) / 2;
        const dx = c1.x - c0.x, dy = c1.y - c0.y, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
        const sz = 0.011 * h;
        const rz = new Path2D();
        rz.moveTo(c0.x, c0.y);
        rz.quadraticCurveTo(mx + nx * sz, my + ny * sz, c1.x, c1.y);
        rz.quadraticCurveTo(mx - nx * sz * 0.7, my - ny * sz * 0.7, c0.x, c0.y);
        rz.closePath();
        g.fillStyle = tonC(st.kolczuga, -0.25, CIEN.metal); g.fill(rz);
        if (m.lod === 2) {
          g.fillStyle = tonC(st.kolczuga, 0.35, CIEN.metal, 0.6);
          for (let i = 1; i < 6; i++) { const t = i / 6; g.beginPath(); g.arc(lerp(c0.x, c1.x, t), lerp(c0.y, c1.y, t), h * 0.0025, 0, TAU); g.fill(); }
          // nitki płótna na brzegach
          g.strokeStyle = tonC(st.wapenrok, 0.15, CIEN.tkanina, 0.85); g.lineWidth = Math.max(0.35, h * 0.0028);
          g.beginPath();
          for (let i = 1; i < 6; i++) {
            const t = i / 6, sx = lerp(c0.x, c1.x, t), sy = lerp(c0.y, c1.y, t), k = Math.sin(t * PI) * sz;
            g.moveTo(sx + nx * k * 0.9, sy + ny * k * 0.9); g.lineTo(sx + nx * k * 0.3 + dx / dl * h * 0.004, sy + ny * k * 0.3 + dy / dl * h * 0.004);
          }
          g.stroke();
        }
        g.strokeStyle = `rgba(${KREW[0]},${KREW[1]},${KREW[2]},0.75)`; g.lineWidth = Math.max(0.6, h * 0.006);
        g.beginPath(); g.moveTo(c0.x, c0.y); g.quadraticCurveTo(mx - nx * sz * 0.9, my - ny * sz * 0.9 + 0.003 * h, c1.x, c1.y); g.stroke();
      }
      // krew: duża plama na brzuchu ze strużkami, rozbryzg na piersi, ślad przy rąbku
      const k1 = T(0.38 + 0.12 * los(id, 380), 0.03);
      plama(g, k1.x, k1.y, 0.03 * h, id, 6, KREW, 0.72, m.lod === 2 ? 3 : 1, h);
      const k2 = T(0.82, -0.02 + 0.05 * los(id, 381));
      plama(g, k2.x, k2.y, 0.014 * h, id + 3, 4, KREW_SWIEZA, 0.6, m.lod === 2 ? 2 : 0, h);
      plama(g, lerp(tyl, przod, 0.3 + 0.4 * los(id, 382)), rabek - 0.03 * h, 0.022 * h, id + 5, 4, KREW, 0.45, 0, h);
      g.restore();
    }, false, true);
  }

  // ---- pas z żelazną klamrą i pochwa miecza przy biodrze
  {
    const z1 = T(PAS + 0.03, -0.072), z2 = T(PAS + 0.03, 0.076);
    m.kreska(z1.x, z1.y, z2.x, z2.y, Math.max(1, h * 0.017), tonC(st.skorzane, -0.35, CIEN.tkanina), (g) => {
      if (m.prosto) return;
      const kl = T(PAS + 0.03, 0.058);
      g.fillStyle = tonC(st.kolczuga, 0.3, CIEN.metal); g.fillRect(kl.x - 0.008 * h, kl.y - 0.01 * h, 0.016 * h, 0.02 * h);
    });
    const ps = T(PAS, -0.06), pk = kier(-0.32);
    const pe = { x: ps.x + pk.x * 0.34 * h, y: ps.y + pk.y * 0.34 * h };
    m.kreska(ps.x, ps.y, pe.x, pe.y, Math.max(1.2, h * 0.024), walec(m, ps, pe, 0.012 * h, [46, 34, 26], true, CIEN.tkanina));
    if (!m.prosto) m.kreska(pe.x - pk.x * 0.03 * h, pe.y - pk.y * 0.03 * h, pe.x, pe.y, Math.max(1.2, h * 0.026), tonC(st.kolczuga, 0.1, CIEN.metal));
    if (tryb.narzedzie !== 'miecz') {
      const hx = ps.x - pk.x * 0.09 * h, hy = ps.y - pk.y * 0.09 * h;
      m.kreska(ps.x, ps.y, hx, hy, Math.max(1, h * 0.018), tonC(st.skorzane, -0.2, CIEN.tkanina));
      m.kreska(ps.x - 0.045 * h * pk.y, ps.y + 0.045 * h * pk.x, ps.x + 0.045 * h * pk.y, ps.y - 0.045 * h * pk.x, Math.max(1, h * 0.018), tonC(st.kolczuga, 0.2, CIEN.metal));
    }
  }

  // ---- głowa: kolczy kaptur i hełm (garnczkowy albo otwarty z twarzą)
  glowaKrzyzowca(r);

  // ---- złamana strzała wbita w bark (od tyłu)
  if (strzalaWBarku && !m.prosto) {
    const q = T(0.86, -0.065);
    m.szczegol((g) => {
      plama(g, q.x, q.y + 0.004 * h, 0.012 * h, id + 11, 3, KREW, 0.75, m.lod === 2 ? 1 : 0, h);
      strzala(g, q.x, q.y, PI + 0.9 + 0.3 * los(id, 24), (0.06 + 0.03 * los(id, 25)) * h, h, true, m.lod);
    });
  }

  // ---- tarcza w dalszej ręce — przed tułowiem
  if (!naPlecach) {
    const unies = p.tarcza;
    tarcza(r, s.dlonB.x + 0.035 * h, s.dlonB.y + 0.03 * h - unies * 0.06 * h, -0.06 + unies * 0.1, 1);
  }

  // ---- miecz (we krwi) i bliższa ręka; żelazna klamra płaszcza na barku
  if (tryb.narzedzie === 'miecz') {
    const czubek = { x: s.dlonA.x + sin(s.narz) * 0.555 * h, y: s.dlonA.y + cos(s.narz) * 0.555 * h };
    const slad = sladBroni(pm, czubek, h, czas, p.smuga > 0.05);
    if (slad.length > 1 && !m.prosto) m.szczegol((g) => smuga(g, slad, s.bark, h, p.smuga, st.bunt));
    const koniec = miecz(m, s.dlonA.x, s.dlonA.y, s.narz, h, st, czas + id * 300);
    uderzenie(pm, p.cios, koniec, h, czas);
    if (!m.prosto) {
      const d = kier(s.narz), nn = kier(s.narz - PI / 2);
      const bx = s.dlonA.x + d.x * 0.035 * h, by = s.dlonA.y + d.y * 0.035 * h;
      m.szczegol((g) => {
        // krew na ostrzu: od połowy ku sztychowi, gęstniejąca przy czubku
        const a0 = 0.42 + 0.12 * los(id, 26), dl = 0.52 * h;
        const gr = g.createLinearGradient(bx + d.x * dl * a0, by + d.y * dl * a0, koniec.x, koniec.y);
        gr.addColorStop(0, `rgba(${KREW[0]},${KREW[1]},${KREW[2]},0)`);
        gr.addColorStop(0.45, `rgba(${KREW[0]},${KREW[1]},${KREW[2]},0.7)`);
        gr.addColorStop(1, `rgba(${KREW_SWIEZA[0]},${KREW_SWIEZA[1]},${KREW_SWIEZA[2]},0.9)`);
        g.strokeStyle = gr; g.lineCap = 'round'; g.lineWidth = Math.max(0.8, h * 0.02);
        g.beginPath();
        g.moveTo(bx + d.x * dl * a0 + nn.x * h * 0.003, by + d.y * dl * a0 + nn.y * h * 0.003);
        g.lineTo(koniec.x - d.x * h * 0.01, koniec.y - d.y * h * 0.01);
        g.stroke();
        // kropla na sztychu, gdy miecz wisi czubkiem w dół
        if (d.y > 0.5 && m.lod === 2) {
          const k = (czas * 0.0006 + los(id, 27)) % 1;
          g.fillStyle = `rgba(${KREW_SWIEZA[0]},${KREW_SWIEZA[1]},${KREW_SWIEZA[2]},${0.85 * (1 - k)})`;
          g.beginPath(); g.ellipse(koniec.x, koniec.y + k * 0.06 * h, h * 0.005, h * 0.008, 0, 0, TAU); g.fill();
        }
      });
    }
  }
  rekaKolczuga(r, s.bark, s.lokA, s.dlonA, s.przedA, false, tryb.narzedzie === 'miecz' || tryb.grzyb, bandaz);
  {
    const f = T(1.0, 0.035);
    const fb = new Path2D(); fb.arc(f.x, f.y, Math.max(1, 0.015 * h), 0, TAU);
    m.ksztalt(fb, m.kula(f, 0.015 * h, [90, 88, 86], false, 0.3, CIEN.metal));
  }
  if (tryb.grzyb) m.szczegol((g) => grzyb(g, s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h, h, m.lod));
}

/** Noga w kolczych nogawicach: nakolannik z blachy, ciemny skórzany but z ostrogą. */
function nogaKolczuga(r: Rysunek, kol: Pkt, stp: Stopa, dalej: boolean): void {
  const { m, s, h, st } = r;
  const ru = 0.046 * h, rk = 0.033 * h, rs = 0.025 * h;
  const udo = konczyna(s.biodro, ru, kol, rk, 0.004 * h, 0.008 * h, 0.35);
  m.ksztalt(udo, walec(m, s.biodro, kol, ru, st.kolczuga, dalej), (g) => oczka(m, g, udo, s.biodro, kol, ru, st.kolczuga, h), !dalej);
  const golen = konczyna(kol, rk, stp.kostka, rs, 0.009 * h, 0.003 * h, 0.3);
  m.ksztalt(golen, walec(m, kol, stp.kostka, rk, st.kolczuga, dalej), (g) => oczka(m, g, golen, kol, stp.kostka, rk, st.kolczuga, h), !dalej);
  // nakolannik: blaszana miseczka na kolanie
  const nk = new Path2D(); nk.ellipse(kol.x + 0.008 * h, kol.y, rk * 1.05, rk * 1.2, 0, 0, TAU);
  m.ksztalt(nk, m.kula({ x: kol.x + 0.008 * h, y: kol.y }, rk * 1.1, st.helm, dalej, 0.5, CIEN.metal));
  // but: smukły, ciemna skóra; z bliska ostroga przy pięcie
  m.ksztalt(but(stp, h, 0.06, 0.92), plotno(m, stp.kostka.x, stp.kostka.y - 0.03 * h, stp.podeszwa.x, stp.podeszwa.y + 0.01 * h, [48, 36, 28], dalej), (g) => {
    if (m.prosto) return;
    podeszwa(g, stp, h, 'rgba(14,10,8,0.95)');
    if (m.lod === 2) {
      const pc = stp.pieta;
      g.strokeStyle = tonC(st.helm, 0.1, CIEN.metal); g.lineWidth = Math.max(0.5, h * 0.005);
      g.beginPath(); g.moveTo(pc.x, pc.y - 0.02 * h); g.lineTo(pc.x - 0.022 * h, pc.y - 0.026 * h); g.stroke();
      g.beginPath(); g.arc(pc.x - 0.025 * h, pc.y - 0.026 * h, Math.max(0.6, h * 0.005), 0, TAU); g.stroke();
    }
  });
}

/** Ręka w kolczudze: ramię, przedramię, skórzana rękawica; czasem brudny bandaż z krwią na przedramieniu. */
function rekaKolczuga(r: Rysunek, bark: Pkt, lok: Pkt, dl: Pkt, przed: number, dalej: boolean, piesc: boolean, bandaz = false): void {
  const { m, h, st, c } = r;
  const r1 = 0.034 * h, r2 = 0.027 * h, r3 = 0.021 * h;
  const ramie = konczyna(bark, r1, lok, r2, 0.004 * h, 0.006 * h, 0.3);
  m.ksztalt(ramie, walec(m, bark, lok, r1, st.kolczuga, dalej), (g) => oczka(m, g, ramie, bark, lok, r1, st.kolczuga, h), !dalej);
  const przedr = konczyna(lok, r2, dl, r3, 0.004 * h, 0.005 * h, 0.3);
  m.ksztalt(przedr, walec(m, lok, dl, r2, st.kolczuga, dalej), (g) => {
    oczka(m, g, przedr, lok, dl, r2, st.kolczuga, h);
    if (!bandaz || m.prosto) return;
    // bandaż: dwa zwoje brudnego płótna, przesiąknięte krwią
    const ux = dl.x - lok.x, uy = dl.y - lok.y, LL = Math.hypot(ux, uy) || 1, nx = -uy / LL, ny = ux / LL;
    g.lineCap = 'butt';
    for (const t of [0.3, 0.45]) {
      const x = lok.x + ux * t, y = lok.y + uy * t, rr = r2 * 1.12;
      g.strokeStyle = 'rgba(176,164,140,0.95)'; g.lineWidth = Math.max(1, h * 0.012);
      g.beginPath(); g.moveTo(x + nx * rr, y + ny * rr); g.lineTo(x - nx * rr + ux / LL * h * 0.008, y - ny * rr + uy / LL * h * 0.008); g.stroke();
    }
    plama(g, lok.x + ux * 0.38, lok.y + uy * 0.38, r2 * 0.55, c.id + 13, 3, KREW_SWIEZA, 0.7, 0, h);
    g.lineCap = 'round';
  }, !dalej);
  m.ksztalt(dlon(dl, przed, 0.026 * h, piesc), m.kula(dl, 0.028 * h, [52, 38, 28], dalej, 0, CIEN.tkanina));
}

/** Kolczy kaptur i hełm: garnczkowy (zamknięty) albo otwarty z nosalem — wtedy twarz z blizną i krwią. */
function glowaKrzyzowca(r: Rysunek): void {
  const { m, s, p, st, h, c } = r;
  const kat = s.katG;
  const P = (dx: number, dy: number) => naGlowie(s, kat, dx, dy);
  const id = c.id;
  const zamkniety = los(id, 21) < 0.55;
  // szyja w kolczudze i kaptur osłaniający kark
  m.ksztalt(konczyna(s.bark, 0.028 * h, s.glowa, 0.026 * h), walec(m, s.bark, s.glowa, 0.03 * h, st.kolczuga, true));
  const kaptur = poGlowie(s, kat, [[-1.0, -0.6], [-1.18, 0.3], [-1.08, 1.25], [-0.4, 1.62], [0.45, 1.5], [0.9, 1.0], [0.95, 0.2], [0.4, -0.9], [-0.4, -1.05]]);
  m.ksztalt(kaptur, walec(m, P(0.3, -0.8), P(-0.4, 1.4), s.rg, st.kolczuga, false, CIEN.metal), (g) => oczka(m, g, kaptur, P(-1.2, -1.1), P(1, 1.6), s.rg, st.kolczuga, h));
  if (zamkniety) {
    // hełm „głowa cukru”: zaokrąglony, lekko zaostrzony szczyt, boki łagodnie zwężone ku żuchwie,
    // przód wypukły jak dziób — nie płaski garnek (płaski wierzch wyglądał jak klocek)
    const he = poGlowie(s, kat, [[-1.12, -0.7], [-1.02, -1.18], [-0.62, -1.56], [-0.08, -1.84], [0.42, -1.6], [0.92, -1.14], [1.18, -0.5], [1.26, 0.25], [1.12, 0.92], [0.7, 1.2], [-0.2, 1.24], [-0.98, 1.06], [-1.18, 0.4], [-1.18, -0.2]]);
    const gr = m.prosto ? tonC(st.helm, -0.05, CIEN.metal) : (() => {
      const a = P(0.6, -1.5), b = P(-1.0, 1.1);
      const g = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, tonC(st.helm, 0.22, CIEN.metal)); g.addColorStop(0.3, tonC(st.helm, 0.02, CIEN.metal));
      g.addColorStop(0.75, tonC(st.helm, -0.36, CIEN.metal)); g.addColorStop(1, tonC(st.helm, -0.5, CIEN.metal));
      return g;
    })();
    m.ksztalt(he, gr, (g) => {
      g.save();
      g.clip(he);
      // wizjer: ciemna szczelina z przodu
      g.fillStyle = 'rgba(6,4,4,0.95)';
      const w1 = P(0.18, -0.24), w2 = P(1.26, -0.2), w3 = P(1.26, -0.06), w4 = P(0.2, -0.1);
      g.beginPath(); g.moveTo(w1.x, w1.y); g.lineTo(w2.x, w2.y); g.lineTo(w3.x, w3.y); g.lineTo(w4.x, w4.y); g.closePath(); g.fill();
      if (m.prosto) { g.restore(); return; }
      // pas czołowy i pionowa listwa na przodzie — krzyż z blachy
      g.strokeStyle = tonC(st.helm, -0.45, CIEN.metal); g.lineWidth = Math.max(0.7, h * 0.009);
      const c0 = P(-1.14, -0.36), c1 = P(1.2, -0.32);
      g.beginPath(); g.moveTo(c0.x, c0.y); g.quadraticCurveTo(P(0, -0.42).x, P(0, -0.42).y, c1.x, c1.y); g.stroke();
      const l0 = P(0.2, -1.75), l1 = P(1.02, 1.05);
      g.lineWidth = Math.max(0.9, h * 0.012);
      g.beginPath(); g.moveTo(l0.x, l0.y); g.bezierCurveTo(P(0.95, -1.35).x, P(0.95, -1.35).y, P(1.32, 0.0).x, P(1.32, 0.0).y, l1.x, l1.y); g.stroke();
      if (m.lod === 2) {
        // otwory oddechowe, nity, wgniecenia, rysy, krew na boku
        g.fillStyle = 'rgba(8,6,6,0.9)';
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const q = P(0.62 + j * 0.2, 0.3 + i * 0.22); g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, s.rg * 0.06), 0, TAU); g.fill(); }
        g.fillStyle = tonC(st.helm, 0.4, CIEN.metal);
        for (let i = 0; i < 5; i++) { const q = P(-0.9 + i * 0.45, -0.36); g.beginPath(); g.arc(q.x, q.y, Math.max(0.4, s.rg * 0.045), 0, TAU); g.fill(); }
        for (let i = 0; i < 2; i++) { const q = P(-0.6 + 0.9 * los(id, 400 + i), -0.95 + 1.6 * los(id, 410 + i)); wgniecenie(g, q.x, q.y, s.rg * (0.14 + 0.1 * los(id, 415 + i)), los(id, 418 + i) * PI); }
        g.strokeStyle = 'rgba(220,214,200,0.35)'; g.lineWidth = Math.max(0.3, s.rg * 0.03);
        for (let i = 0; i < 3; i++) { const a = P(-0.8 + 1.4 * los(id, 420 + i), 0.2 + 0.7 * los(id, 430 + i)), b = P(-0.5 + 1.4 * los(id, 440 + i), 0.5 + 0.6 * los(id, 450 + i)); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
        const kb = P(-0.4 + 0.6 * los(id, 460), -0.95);
        plama(g, kb.x, kb.y, s.rg * 0.32, id + 17, 4, KREW, 0.65, 2, h);
      }
      g.restore();
    }, false, false);
    return;
  }
  // otwarty hełm: twarz z blizną i krwią z czoła, broda; skóra wyblakła ze zmęczenia, oczy w cieniu ronda
  const skora = mieszaj(st.skora, [128, 118, 112], 0.4);
  const twarzP = glowaProfil(s, kat);
  m.ksztalt(twarzP, m.kula(s.glowa, s.rg, skora, false, 0, CIEN.skora), (g) => {
    twarz(g, s, kat, p, skora, m.lod, {
      bezUcha: true, puste: st.szalenstwo > 0.45 ? st.szalenstwo : 0, strach: Math.max(0, st.strach - 0.3) * 1.4,
    });
    if (st.broda && !m.prosto) broda(g, s, kat, st.broda, st.wlosy, m.lod);
    if (m.prosto) return;
    // cień ronda hełmu na czole i oczach
    {
      const a = P(0.2, -0.85), b = P(0.2, 0.2);
      const cg = g.createLinearGradient(a.x, a.y, b.x, b.y);
      cg.addColorStop(0, 'rgba(10,6,6,0.88)'); cg.addColorStop(0.5, 'rgba(10,6,6,0.5)'); cg.addColorStop(1, 'rgba(10,6,6,0.08)');
      g.save(); g.clip(twarzP); g.fillStyle = cg; g.fill(twarzP); g.restore();
    }
    // cień pod okiem i zapadnięte policzki — zmęczenie po bitwie
    g.fillStyle = 'rgba(40,20,18,0.22)';
    const po = P(0.62, 0.22); g.beginPath(); g.ellipse(po.x, po.y, s.rg * 0.3, s.rg * 0.16, kat, 0, TAU); g.fill();
    // blizna przez oko i policzek
    const b0 = P(0.38, -0.62), b1 = P(0.86, 0.42);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(70,30,26,0.7)'; g.lineWidth = Math.max(0.8, s.rg * 0.13);
    g.beginPath(); g.moveTo(b0.x, b0.y); g.quadraticCurveTo(P(0.72, -0.1).x, P(0.72, -0.1).y, b1.x, b1.y); g.stroke();
    g.strokeStyle = 'rgba(214,170,150,0.7)'; g.lineWidth = Math.max(0.5, s.rg * 0.06);
    g.beginPath(); g.moveTo(b0.x, b0.y); g.quadraticCurveTo(P(0.72, -0.1).x, P(0.72, -0.1).y, b1.x, b1.y); g.stroke();
    if (m.lod === 2) {
      // szwy na bliźnie
      g.strokeStyle = 'rgba(40,20,16,0.6)'; g.lineWidth = Math.max(0.35, s.rg * 0.035);
      for (let i = 1; i < 4; i++) {
        const t = i / 4, q = { x: lerp(b0.x, b1.x, t), y: lerp(b0.y, b1.y, t) };
        g.beginPath(); g.moveTo(q.x - s.rg * 0.08, q.y + s.rg * 0.05); g.lineTo(q.x + s.rg * 0.08, q.y - s.rg * 0.05); g.stroke();
      }
    }
    // krew z rany na czole, spływa po skroni
    const kc = P(0.55, -0.72);
    plama(g, kc.x, kc.y, s.rg * 0.16, id + 19, 3, KREW_SWIEZA, 0.85, 0, h);
    g.strokeStyle = `rgba(${KREW_SWIEZA[0]},${KREW_SWIEZA[1]},${KREW_SWIEZA[2]},0.8)`; g.lineWidth = Math.max(0.5, s.rg * 0.07);
    const k1 = P(0.5, 0.1);
    g.beginPath(); g.moveTo(kc.x, kc.y); g.quadraticCurveTo(P(0.42, -0.3).x, P(0.42, -0.3).y, k1.x, k1.y); g.stroke();
  });
  m.ksztalt(nos(s, kat, 1.1), m.kula(P(1.05, 0.15), s.rg * 0.3, skora, false, 0, CIEN.skora));
  // hełm stożkowy z nosalem, ciemne żelazo, wgniecenie
  const he = poGlowie(s, kat, [[-1.12, -0.18], [-1.04, -0.72], [-0.56, -1.32], [-0.1, -1.78], [0.38, -1.3], [0.94, -0.72], [1.1, -0.22], [0.5, -0.3], [-0.4, -0.3]], false);
  m.ksztalt(he, walec(m, P(0.7, -1.4), P(-0.9, -0.2), s.rg, st.helm, false, CIEN.metal, 0.08), (g) => {
    if (m.prosto) return;
    g.strokeStyle = tonC(st.helm, -0.45, CIEN.metal); g.lineWidth = Math.max(0.8, h * 0.012); g.lineCap = 'butt';
    const o1 = P(-1.1, -0.24), o2 = P(1.08, -0.28);
    g.beginPath(); g.moveTo(o1.x, o1.y); g.quadraticCurveTo(P(0, -0.36).x, P(0, -0.36).y, o2.x, o2.y); g.stroke();
    g.lineCap = 'round';
    if (m.lod === 2) {
      g.save(); g.clip(he);
      const q = P(-0.3 + 0.5 * los(id, 470), -0.9); wgniecenie(g, q.x, q.y, s.rg * 0.18, los(id, 471) * PI);
      plama(g, P(0.4, -0.7).x, P(0.4, -0.7).y, s.rg * 0.18, id + 21, 3, KREW, 0.55, 0, h);
      g.restore();
    }
  }, false, false);
  const n1 = P(0.98, -0.32), n2 = P(1.06, 0.22);
  const ns = new Path2D();
  ns.moveTo(n1.x - s.rg * 0.08, n1.y); ns.lineTo(n1.x + s.rg * 0.1, n1.y); ns.lineTo(n2.x + s.rg * 0.06, n2.y); ns.lineTo(n2.x - s.rg * 0.06, n2.y); ns.closePath();
  m.ksztalt(ns, walec(m, n1, n2, s.rg * 0.1, st.helm, false, CIEN.metal));
}

/**
 * Smuga cięcia: łuk zakreślony czubkiem miecza wokół barku. Próbki czubka (ostatnie ~110 ms)
 * łączymy po okręgu — wychodzi sierp, który zanika ku tyłowi. U zdrajcy czerwona.
 */
function smuga(g: CanvasRenderingContext2D, slad: { x: number; y: number }[], bark: Pkt, h: number, sila0: number, bunt: boolean): void {
  const pol = slad.map((q) => ({ a: Math.atan2(q.y - bark.y, q.x - bark.x), r: Math.hypot(q.x - bark.x, q.y - bark.y) }));
  const pk: { a: number; r: number }[] = [pol[0]];
  for (let i = 1; i < pol.length; i++) {
    let d = pol[i].a - pol[i - 1].a;
    d = ((d + PI) % TAU + TAU) % TAU - PI;
    const n = Math.max(1, Math.ceil(Math.abs(d) / 0.12));
    for (let j = 1; j <= n; j++) pk.push({ a: pol[i - 1].a + (d * j) / n, r: lerp(pol[i - 1].r, pol[i].r, j / n) });
  }
  if (pk.length < 2) return;
  const sila = clamp(sila0 + 0.3, 0, 1);
  const [cr, cg, cb] = bunt ? [255, 70, 40] : [255, 226, 170];
  const P = (q: { a: number; r: number }, k: number): Pkt => ({ x: bark.x + Math.cos(q.a) * q.r * k, y: bark.y + Math.sin(q.a) * q.r * k });
  g.save(); g.globalCompositeOperation = 'lighter';
  const n = pk.length;
  for (let i = 1; i < n; i++) {
    const w = i / (n - 1);
    const a0 = P(pk[i - 1], 1), a1 = P(pk[i], 1), b0 = P(pk[i - 1], 1 - 0.22 * w), b1 = P(pk[i], 1 - 0.22 * w);
    g.fillStyle = `rgba(${cr},${cg},${cb},${0.18 * w * w * sila})`;
    g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.lineTo(b1.x, b1.y); g.lineTo(b0.x, b0.y); g.closePath(); g.fill();
  }
  g.strokeStyle = `rgba(${cr},${cg},${cb},${0.42 * sila})`; g.lineWidth = Math.max(0.6, h * 0.007);
  g.beginPath();
  const od = Math.floor(n * 0.35);
  for (let i = od; i < n; i++) { const q = P(pk[i], 1); if (i === od) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y); }
  g.stroke();
  g.restore();
}

/**
 * Tarcza migdałowa krzyżowca po bitwie: brudne, płócienne pole naciągnięte na drewno, krwawy krzyż,
 * żelazne okucie brzegu i guz; wyszczerbienia od ciosów, utkwione strzały i rozmazana krew.
 * (tx, ty) — środek, obr — obrót, skala — wielkość.
 */
function tarcza(r: Rysunek, tx: number, ty: number, obr: number, skala: number): void {
  const { m, st, h, c, czas } = r;
  const id = c.id;
  const w = 0.088 * h * skala, hh = 0.34 * h * skala;
  const P = (x: number, y: number): [number, number] => [tx + x * cos(obr) - y * sin(obr), ty + x * sin(obr) + y * cos(obr)];
  const tr = new Path2D();
  tr.moveTo(...P(0, -hh * 0.5));
  tr.quadraticCurveTo(...P(w * 1.02, -hh * 0.48), ...P(w, -hh * 0.18));
  // wyszczerbienie na prawym brzegu
  const zx = 0.2 + 0.3 * los(id, 500);
  tr.quadraticCurveTo(...P(w * 0.98, hh * (zx - 0.12)), ...P(w * 0.9, hh * zx));
  tr.lineTo(...P(w * 0.72, hh * (zx + 0.03)));
  tr.lineTo(...P(w * 0.82, hh * (zx + 0.07)));
  tr.quadraticCurveTo(...P(w * 0.7, hh * 0.4), ...P(0, hh * 0.6));
  tr.quadraticCurveTo(...P(-w * 0.92, hh * 0.22), ...P(-w, -hh * 0.18));
  tr.quadraticCurveTo(...P(-w * 1.02, -hh * 0.48), ...P(0, -hh * 0.5));
  tr.closePath();
  const [ax, ay] = P(w, -hh * 0.5), [bx, by] = P(-w, hh * 0.6);
  m.ksztalt(tr, plotno(m, ax, ay, bx, by, st.tarcza), (g) => {
    g.save();
    g.clip(tr);
    // krzyż przez całe pole, wyblakły
    g.strokeStyle = tonC(st.znak, -0.05, CIEN.tkanina); g.lineWidth = Math.max(1.2, h * 0.026 * skala); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(...P(0, -hh * 0.5)); g.lineTo(...P(0, hh * 0.6)); g.moveTo(...P(-w, -hh * 0.14)); g.lineTo(...P(w, -hh * 0.14)); g.stroke();
    g.lineCap = 'round';
    if (!m.prosto) {
      // brud ku dołowi, przetarcia farby
      const [gx0, gy0] = P(0, -hh * 0.1), [gx1, gy1] = P(0, hh * 0.6);
      const bl = g.createLinearGradient(gx0, gy0, gx1, gy1);
      bl.addColorStop(0, 'rgba(40,28,18,0)'); bl.addColorStop(1, 'rgba(36,24,16,0.55)');
      g.fillStyle = bl; g.fill(tr);
      if (m.lod === 2) {
        g.fillStyle = tonC(st.tarcza, 0.1, CIEN.tkanina, 0.5);
        for (let i = 0; i < 6; i++) { const [qx, qy] = P((los(id, 510 + i) - 0.5) * w * 0.4, (los(id, 520 + i) - 0.4) * hh); g.beginPath(); g.arc(qx, qy, h * 0.004 * skala, 0, TAU); g.fill(); }
      }
      // rozmazana krew — ślad dłoni zsuwającej się po tarczy
      const [kx, ky] = P(w * (0.1 + 0.4 * los(id, 530)), hh * (-0.05 + 0.2 * los(id, 531)));
      plama(g, kx, ky, w * 0.32, id + 23, 5, KREW, 0.7, m.lod === 2 ? 3 : 1, h);
      // cięcia po ciosach
      g.strokeStyle = 'rgba(24,16,12,0.7)'; g.lineWidth = Math.max(0.5, h * 0.005 * skala);
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const [a0, a1] = P((los(id, 540 + i) - 0.5) * w * 1.4, (los(id, 550 + i) - 0.45) * hh), [b0, b1] = P((los(id, 540 + i) - 0.5) * w * 1.4 + w * 0.35, (los(id, 550 + i) - 0.45) * hh + hh * 0.08);
        g.moveTo(a0, a1); g.lineTo(b0, b1);
      }
      g.stroke();
    }
    g.restore();
    if (m.prosto) return;
    // żelazne okucie brzegu i guz
    g.strokeStyle = tonC(st.helm, -0.15, CIEN.metal); g.lineWidth = Math.max(0.9, h * 0.012 * skala); g.stroke(tr);
    const [ux, uy] = P(0, -hh * 0.14);
    g.fillStyle = tonC(st.helm, 0.1, CIEN.metal); g.beginPath(); g.arc(ux, uy, Math.max(0.8, h * 0.016 * skala), 0, TAU); g.fill();
    if (m.lod === 2) {
      g.fillStyle = 'rgba(230,220,200,0.45)'; g.beginPath(); g.arc(ux + h * 0.004, uy - h * 0.005, Math.max(0.4, h * 0.004), 0, TAU); g.fill();
      // utkwione strzały: jedna cała, czasem druga złamana
      const [s1x, s1y] = P(-w * 0.35, hh * 0.15);
      strzala(g, s1x, s1y, obr + PI * 0.62, 0.11 * h * skala, h, false, m.lod);
      if (los(id, 560) < 0.5) { const [s2x, s2y] = P(w * 0.3, -hh * 0.32); strzala(g, s2x, s2y, obr + PI * 0.75, 0.06 * h * skala, h, true, m.lod); }
    }
    if (st.bunt) poswiata(g, ux, uy, h * 0.08, [255, 60, 30], 0.18 + 0.08 * sin(czas * 0.004 + c.id));
  }, false, true);
}
