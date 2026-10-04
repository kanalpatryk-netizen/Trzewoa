import { clamp, cos, lerp, PI, sin, TAU, ton, type Pkt, type Rgb } from './matma';
import { glowaProfil, konczyna, naGlowie, nos, twarz } from './malarz';
import { iskry, laska, mlotek, poswiata, type Rysunek } from './wspolne';
import { broda, poGlowie } from './robotnik';
import { uderzenie } from './pamiec';
import type { Szkielet } from './szkielet';

/** Szeroki rękaw: ramię, przedramię i zwisający pod nim płat materiału. */
function rekaw(r: Rysunek, bark: Pkt, lok: Pkt, dl: Pkt, przed: number, dalej: boolean, szata: Rgb, piesc: boolean): void {
  const { m, h, st, pm } = r;
  const r1 = 0.046 * h, r2 = 0.045 * h;
  m.ksztalt(konczyna(bark, r1, lok, r2, 0.004 * h, 0.006 * h), m.bryla(bark, lok, r1, szata, dalej), undefined, !dalej);
  // rękaw rozszerza się ku nadgarstkowi i zwisa
  const ux = dl.x - lok.x, uy = dl.y - lok.y, L = Math.hypot(ux, uy) || 1;
  const nx = -uy / L, ny = ux / L;
  const k = 0.82;
  const ex = lok.x + ux * k, ey = lok.y + uy * k;
  const zwis = 0.075 * h * (0.5 + 0.5 * Math.abs(nx)) + pm.szata.a * 0.02 * h;
  const p = new Path2D();
  p.moveTo(lok.x + nx * r2, lok.y + ny * r2);
  p.lineTo(ex + nx * 0.06 * h, ey + ny * 0.06 * h);
  p.quadraticCurveTo(ex + 0.01 * h, ey + zwis, ex - nx * 0.05 * h, ey - ny * 0.05 * h + 0.01 * h);
  p.lineTo(lok.x - nx * r2, lok.y - ny * r2);
  p.arc(lok.x, lok.y, r2, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
  p.closePath();
  m.ksztalt(p, m.bryla(lok, { x: ex, y: ey }, 0.05 * h, szata, dalej), (g) => {
    if (m.prosto) return;
    g.strokeStyle = ton(st.lamowka, dalej ? -0.35 : 0, 0.9); g.lineWidth = Math.max(0.7, h * 0.012);
    g.beginPath(); g.moveTo(ex + nx * 0.058 * h, ey + ny * 0.058 * h); g.quadraticCurveTo(ex + 0.01 * h, ey + zwis - 0.006 * h, ex - nx * 0.048 * h, ey - ny * 0.048 * h + 0.01 * h); g.stroke();
  }, !dalej);
  // dłoń wychodzi z rękawa
  const d = new Path2D();
  if (piesc) d.arc(dl.x, dl.y, 0.027 * h, 0, TAU);
  else d.ellipse(dl.x + Math.sin(przed) * 0.012 * h, dl.y + Math.cos(przed) * 0.012 * h, 0.03 * h, 0.022 * h, Math.atan2(Math.cos(przed), Math.sin(przed)), 0, TAU);
  m.ksztalt(d, m.kula(dl, 0.03 * h, st.skora, dalej));
}

export function rysujPoboznego(r: Rysunek): void {
  const { m, s, p, tryb, st, h, c, czas, pm, cz } = r;
  const kat = s.katG;
  const szata = st.szata, cien: Rgb = [st.szata[0] - 26, st.szata[1] - 28, st.szata[2] - 30];
  const kleczy = cz === 'modli' || cz === 'je' || cz === 'buduje' || p.wis > 0.5;

  // ---- szpic kaptura na plecach (z bezwładnością)
  {
    const a = pm.kaptur.a + s.katT * 0.4;
    const nasada = naGlowie(s, kat, -0.85, -0.55);
    const L = 0.2 * h;
    const kx = nasada.x - 0.05 * h + sin(a) * L * 0.6, ky = nasada.y + L * 0.95 - Math.abs(a) * 0.04 * h;
    const k = new Path2D();
    const b1 = naGlowie(s, kat, -0.35, -1.25), b2 = naGlowie(s, kat, -1.15, 0.5);
    k.moveTo(b1.x, b1.y);
    k.quadraticCurveTo(nasada.x - 0.06 * h, nasada.y, kx, ky);
    k.quadraticCurveTo(nasada.x - 0.01 * h, nasada.y + 0.08 * h, b2.x, b2.y);
    k.closePath();
    m.ksztalt(k, m.plaszczyzna(b1.x, b1.y, kx, ky, cien, true));
  }

  // ---- dalsza ręka
  if (!tryb.oburacz && !tryb.zlozone && !tryb.ksiega) rekaw(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, szata, false);

  // ---- nogi: przy klęczeniu i wiszeniu widać kolana pod szatą, inaczej tylko stopy
  if (kleczy) {
    for (const [kol, stp, dalej] of [[s.kolB, s.stB, true], [s.kolA, s.stA, false]] as const) {
      m.ksztalt(konczyna(s.biodro, 0.07 * h, kol, 0.05 * h, 0.01 * h, 0.012 * h), m.bryla(s.biodro, kol, 0.07 * h, dalej ? cien : szata, dalej));
      m.ksztalt(konczyna(kol, 0.05 * h, stp.kostka, 0.045 * h, 0.01 * h, 0.004 * h), m.bryla(kol, stp.kostka, 0.05 * h, dalej ? cien : szata, dalej));
      const b = new Path2D(); b.ellipse(stp.podeszwa.x + 0.02 * h, stp.podeszwa.y - 0.012 * h, 0.045 * h, 0.02 * h, -stp.kat, 0, TAU);
      m.ksztalt(b, ton([84, 60, 42], dalej ? -0.35 : 0));
    }
  } else {
    for (const [stp, dalej] of [[s.stB, true], [s.stA, false]] as const) {
      const b = new Path2D(); b.ellipse(stp.podeszwa.x + 0.026 * h, stp.podeszwa.y - 0.012 * h, 0.05 * h, 0.022 * h, -stp.kat, PI, 0); b.closePath();
      m.ksztalt(b, m.plaszczyzna(stp.podeszwa.x, stp.podeszwa.y - 0.03 * h, stp.podeszwa.x, stp.podeszwa.y, [92, 64, 44], dalej));
    }
  }

  // ---- szata
  const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
  const Lt = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const T = (u: number, f: number): Pkt => ({ x: s.biodro.x + tx * u * Lt + fx * f * h, y: s.biodro.y + ty * u * Lt + fy * f * h });
  const stopyY = Math.max(s.stA.podeszwa.y, s.stB.podeszwa.y);
  const fal = sin(czas * 0.006 + c.id) * 0.01 * h * clamp(Math.abs(pm.vx) / 2 + 0.3, 0, 1);
  let przod: number, tyl: number, dol: number;
  if (kleczy) {
    przod = Math.max(s.kolA.x, s.kolB.x) + 0.02 * h; tyl = Math.min(s.biodro.x - 0.08 * h, s.kolB.x - 0.04 * h);
    dol = Math.max(s.kolA.y, s.kolB.y) - 0.02 * h;
  } else {
    przod = Math.max(s.kolA.x, s.stA.palce.x - 0.02 * h, s.kolB.x, s.stB.palce.x - 0.02 * h, s.biodro.x + 0.1 * h) + 0.03 * h;
    tyl = Math.min(s.kolA.x, s.stA.pieta.x, s.kolB.x, s.stB.pieta.x, s.biodro.x - 0.1 * h) - 0.03 * h + pm.szata.a * 0.06 * h;
    // szata trzyma kształt: przy długim kroku nie rozkłada się w trójkąt
    przod = Math.min(przod, s.biodro.x + 0.2 * h); tyl = Math.max(tyl, s.biodro.x - 0.22 * h);
    dol = stopyY - 0.03 * h;
  }
  const bp = T(1.0, 0.075), bt = T(1.0, -0.09), pas = T(0.12, 0), kolPrzod = s.kolA.x > s.kolB.x ? s.kolA : s.kolB;
  const sz = new Path2D();
  sz.moveTo(bt.x, bt.y);
  sz.quadraticCurveTo(T(0.4, -0.11).x, T(0.4, -0.11).y, lerp(s.biodro.x - 0.1 * h, tyl, 0.4), s.biodro.y + 0.04 * h);
  sz.quadraticCurveTo(tyl - 0.01 * h, (s.biodro.y + dol) / 2 + 0.05 * h, tyl, dol + fal);
  sz.quadraticCurveTo((tyl + przod) / 2, dol + 0.02 * h - fal, przod, dol - fal);
  if (!kleczy) sz.quadraticCurveTo(kolPrzod.x + 0.06 * h, kolPrzod.y + 0.02 * h, T(-0.05, 0.09).x, T(-0.05, 0.09).y);
  else sz.lineTo(T(-0.05, 0.08).x, T(-0.05, 0.08).y);
  sz.quadraticCurveTo(T(0.55, 0.12).x, T(0.55, 0.12).y, bp.x, bp.y);
  sz.closePath();
  m.ksztalt(sz, m.plaszczyzna(przod, s.bark.y, tyl, dol, szata, false, 1.1), (g) => {
    if (m.prosto) return;
    // (bez przycinania do szaty: wszystko liczone tak, by mieściło się w jej obrysie)
    // szkaplerz z przodu
    const sk = new Path2D();
    const a1 = T(0.97, 0.025), a2 = T(0.97, 0.066);
    const sd = dol - 0.03 * h;
    sk.moveTo(a1.x, a1.y); sk.lineTo(a2.x, a2.y);
    sk.lineTo(Math.min(przod - 0.012 * h, a2.x + 0.07 * h), sd); sk.lineTo(Math.min(przod - 0.07 * h, a1.x + 0.03 * h), sd); sk.closePath();
    g.fillStyle = ton(st.szkaplerz, -0.05); g.fill(sk);
    g.strokeStyle = ton(st.lamowka, -0.05, 0.9); g.lineWidth = Math.max(0.6, h * 0.008); g.stroke(sk);
    // fałdy: od pasa ku rąbkowi, przez kolana
    g.strokeStyle = 'rgba(110,92,70,0.42)'; g.lineWidth = Math.max(0.6, h * 0.011);
    const kol = [s.kolA, s.kolB].sort((a, b) => a.x - b.x);
    for (let i = 0; i < 4; i++) {
      const fx2 = lerp(tyl + 0.02 * h, przod - 0.02 * h, 0.15 + i * 0.24);
      const k = kol[i < 2 ? 0 : 1];
      g.beginPath(); g.moveTo(lerp(pas.x, fx2, 0.35), pas.y + 0.02 * h);
      g.quadraticCurveTo(lerp(fx2, k.x, 0.5) + sin(czas * 0.004 + i) * 0.006 * h, (pas.y + dol) / 2, fx2, dol);
      g.stroke();
    }
    // haftowany pas u dołu
    g.strokeStyle = ton(st.lamowka, 0.05); g.lineWidth = Math.max(1, h * 0.022); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(tyl + 0.008 * h, dol + fal - 0.016 * h); g.quadraticCurveTo((tyl + przod) / 2, dol + 0.004 * h - fal, przod - 0.006 * h, dol - fal - 0.016 * h); g.stroke();
    g.lineCap = 'round';
    if (m.lod === 2) {
      g.fillStyle = ton([150, 40, 40]);
      const n = Math.max(3, Math.round((przod - tyl) / (0.04 * h)));
      for (let i = 0; i <= n; i++) {
        const t = 0.07 + (0.86 * i) / n, x = lerp(tyl, przod, t), y = lerp(dol + fal, dol - fal, t) - 0.016 * h + 4 * t * (1 - t) * (0.004 * h - 0.0) ;
        g.beginPath(); g.moveTo(x, y - 0.007 * h); g.lineTo(x + 0.006 * h, y); g.lineTo(x, y + 0.007 * h); g.lineTo(x - 0.006 * h, y); g.closePath(); g.fill();
      }
    }
    // haft krzyża na szkaplerzu
    const kc = T(0.72, 0.045);
    g.strokeStyle = ton(st.lamowka, 0.15); g.lineWidth = Math.max(0.8, h * 0.012);
    g.beginPath(); g.moveTo(kc.x, kc.y - 0.03 * h); g.lineTo(kc.x, kc.y + 0.035 * h); g.moveTo(kc.x - 0.018 * h, kc.y - 0.008 * h); g.lineTo(kc.x + 0.018 * h, kc.y - 0.008 * h); g.stroke();
    // sznur w pasie z węzłem i frędzlem
    const p1 = T(0.12, -0.11), p2 = T(0.12, 0.1);
    g.strokeStyle = ton(st.sznur); g.lineWidth = Math.max(0.9, h * 0.016);
    g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.stroke();
    const w = T(0.12, 0.06);
    const a = pm.szata.a * 1.4 + sin(czas * 0.005 + c.id) * 0.12;
    const kx = w.x + sin(a) * 0.02 * h, ky = w.y + 0.11 * h;
    g.beginPath(); g.moveTo(w.x, w.y); g.quadraticCurveTo(w.x + 0.005 * h, w.y + 0.06 * h, kx, ky); g.stroke();
    g.fillStyle = ton(st.sznur, -0.1);
    for (const t of [0.35, 0.7]) { g.beginPath(); g.arc(lerp(w.x, kx, t), lerp(w.y, ky, t), Math.max(0.7, h * 0.01), 0, TAU); g.fill(); }
    if (m.lod === 2) {
      g.strokeStyle = ton(st.sznur, 0.1); g.lineWidth = Math.max(0.5, h * 0.006);
      g.beginPath();
      for (let i = -1; i <= 1; i++) { g.moveTo(kx, ky); g.lineTo(kx + i * 0.008 * h + sin(a) * 0.01 * h, ky + 0.025 * h); }
      g.stroke();
    }
  });

  // ---- krzyżyk na piersi (kołysze się)
  if (!m.prosto) m.szczegol((g) => {
    const z = T(0.98, 0.05), a = -pm.kaptur.a * 0.5 + sin(czas * 0.004 + c.id) * 0.05 - s.katT;
    const kx = z.x + sin(a) * 0.075 * h, ky = z.y + cos(a) * 0.075 * h;
    g.strokeStyle = 'rgba(80,58,40,0.85)'; g.lineWidth = Math.max(0.5, h * 0.005);
    g.beginPath(); g.moveTo(z.x - 0.02 * h, z.y - 0.01 * h); g.lineTo(kx, ky - 0.02 * h); g.stroke();
    g.strokeStyle = ton([150, 104, 62]); g.lineWidth = Math.max(0.8, h * 0.011);
    g.beginPath(); g.moveTo(kx, ky - 0.022 * h); g.lineTo(kx, ky + 0.022 * h); g.moveTo(kx - 0.012 * h, ky - 0.008 * h); g.lineTo(kx + 0.012 * h, ky - 0.008 * h); g.stroke();
  });

  // ---- głowa w kapturze
  glowaPoboznego(r, s, kat, szata);

  // ---- bliższa ręka, laska, księga, młotek
  if (tryb.narzedzie === 'laska') {
    laska(m, s.dlonA.x, s.dlonA.y, s.narz, h, st, pm.wstega.a, czas, cz !== 'walczy');
    if (cz === 'walczy') {
      const d = { x: sin(s.narz), y: cos(s.narz) };
      const k = { x: s.dlonA.x + d.x * 0.45 * h, y: s.dlonA.y + d.y * 0.45 * h };
      uderzenie(pm, p.cios, k, h, czas);
      if (p.cios > 0.05 && !m.prosto) m.szczegol((g) => poswiata(g, k.x, k.y, h * 0.2 * p.cios + h * 0.05, [255, 230, 160], 0.7 * p.cios));
    }
  } else if (tryb.narzedzie === 'mlot') {
    uderzenie(pm, p.cios, mlotek(m, s.dlonA.x, s.dlonA.y, s.narz, h, st), h, czas);
    // kamień ołtarza pod ręką
    const kx = s.dlonA.x + 0.12 * h, ky = 0;
    const k = new Path2D(); k.rect(kx - 0.06 * h, ky - 0.07 * h, 0.12 * h, 0.07 * h);
    m.ksztalt(k, m.plaszczyzna(kx, ky - 0.07 * h, kx, ky, [150, 140, 126]), (g) => {
      if (m.prosto) return;
      g.strokeStyle = 'rgba(60,50,40,0.6)'; g.lineWidth = Math.max(0.5, h * 0.006);
      g.beginPath(); g.moveTo(kx - 0.06 * h, ky - 0.035 * h); g.lineTo(kx + 0.06 * h, ky - 0.035 * h); g.moveTo(kx, ky - 0.07 * h); g.lineTo(kx, ky - 0.035 * h); g.stroke();
    });
  }
  if (tryb.ksiega) ksiega(r);
  if (tryb.oburacz || tryb.zlozone || tryb.ksiega) rekaw(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, szata, true);
  rekaw(r, s.bark, s.lokA, s.dlonA, s.przedA, false, szata, tryb.narzedzie !== null || tryb.oburacz);
  if (tryb.zlozone) {
    // złożone dłonie: palce ku górze
    m.szczegol((g) => {
      const x = (s.dlonA.x + s.dlonB.x) / 2, y = (s.dlonA.y + s.dlonB.y) / 2;
      g.fillStyle = ton(st.skora, 0.05);
      g.beginPath(); g.ellipse(x + 0.006 * h, y - 0.02 * h, 0.017 * h, 0.034 * h, 0.35, 0, TAU); g.fill();
      if (!m.prosto) { g.strokeStyle = ton(st.skora, -0.4, 0.8); g.lineWidth = Math.max(0.4, h * 0.004); g.beginPath(); g.moveTo(x + 0.002 * h, y + 0.008 * h); g.lineTo(x + 0.012 * h, y - 0.048 * h); g.stroke(); }
    });
  }
  if (tryb.grzyb) m.szczegol((g) => { g.save(); g.translate(s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h); g.fillStyle = ton([232, 220, 196]); g.fillRect(-h * 0.008, -h * 0.035, h * 0.016, h * 0.035); g.fillStyle = ton([200, 58, 46]); g.beginPath(); g.ellipse(0, -h * 0.035, h * 0.034, h * 0.024, 0, PI, 0); g.closePath(); g.fill(); g.restore(); });

  // ---- światło modlitwy i iskry
  if (p.blask > 0.02 && !m.prosto && cz === 'modli') {
    m.szczegol((g) => {
      const x = (s.dlonA.x + s.dlonB.x) / 2, y = Math.min(s.dlonA.y, s.dlonB.y);
      poswiata(g, x, y - 0.05 * h, h * (0.25 + p.blask * 0.35), [255, 226, 150], 0.18 + p.blask * 0.32);
      iskry(g, x, y, h, czas, c.id, 6, 0.6 + p.blask * 0.4);
    });
  }
}

function glowaPoboznego(r: Rysunek, s: Szkielet, kat: number, szata: Rgb): void {
  const { m, p, st, h } = r;
  // twarz (widoczna w otworze kaptura)
  m.ksztalt(glowaProfil(s, kat), m.kula(s.glowa, s.rg, st.skora), (g) => {
    twarz(g, s, kat, p, st.skora, m.lod, { bezUcha: true, brew: st.stary ? 'rgba(200,196,188,0.95)' : undefined });
    if (st.broda && !m.prosto) broda(g, s, kat, st.broda, st.wlosy, m.lod);
  });
  m.ksztalt(nos(s, kat, 1.0), m.kula(naGlowie(s, kat, 1.05, 0.15), s.rg * 0.3, st.skora));
  // kaptur
  const k = poGlowie(s, kat, [[-0.95, 1.12], [-1.42, 0.25], [-1.2, -1.05], [-0.4, -1.45], [0.45, -1.38], [0.98, -0.98], [1.06, -0.62], [0.66, -0.58], [0.3, -0.18], [0.2, 0.55], [0.42, 1.1], [-0.2, 1.22]]);
  m.ksztalt(k, m.kula(naGlowie(s, kat, 0.2, -0.6), s.rg * 1.4, szata), (g) => {
    if (m.prosto) return;
    // cień kaptura na twarzy (z bliska)
    if (m.lod === 2) {
      g.save();
      g.clip(glowaProfil(s, kat));
      const a = naGlowie(s, kat, 0.6, -0.55), b = naGlowie(s, kat, 0.75, 0.25);
      const gr = g.createLinearGradient(a.x, a.y, b.x, b.y);
      gr.addColorStop(0, 'rgba(30,18,12,0.62)'); gr.addColorStop(1, 'rgba(30,18,12,0)');
      g.fillStyle = gr; g.fillRect(s.glowa.x - s.rg * 2, s.glowa.y - s.rg * 2, s.rg * 4, s.rg * 4);
      g.restore();
    }
    // oko błyszczy w cieniu kaptura
    if (p.oczy > 0.3) {
      const o = naGlowie(s, kat, 0.6, -0.13);
      g.fillStyle = 'rgba(255,244,220,0.9)'; g.beginPath(); g.arc(o.x, o.y, Math.max(0.5, s.rg * 0.045), 0, TAU); g.fill();
    }
    // brzeg kaptura — złota lamówka
    g.strokeStyle = ton(st.lamowka, 0.05); g.lineWidth = Math.max(0.8, h * 0.014);
    const e = [[1.06, -0.62], [0.66, -0.58], [0.3, -0.18], [0.2, 0.55], [0.42, 1.1]].map(([x, y]) => naGlowie(s, kat, x, y));
    g.beginPath(); g.moveTo(e[0].x, e[0].y);
    for (let i = 1; i < e.length - 1; i++) g.quadraticCurveTo(e[i].x, e[i].y, (e[i].x + e[i + 1].x) / 2, (e[i].y + e[i + 1].y) / 2);
    g.lineTo(e[e.length - 1].x, e[e.length - 1].y);
    g.stroke();
    if (m.lod === 2) {
      g.strokeStyle = 'rgba(110,92,70,0.4)'; g.lineWidth = Math.max(0.5, h * 0.008);
      const f1 = naGlowie(s, kat, -0.3, -1.35), f2 = naGlowie(s, kat, -0.9, 0.6), f3 = naGlowie(s, kat, -1.1, -0.4);
      g.beginPath(); g.moveTo(f1.x, f1.y); g.quadraticCurveTo(f3.x, f3.y, f2.x, f2.y); g.stroke();
    }
  });
}

function ksiega(r: Rysunek): void {
  const { m, s, p, st, h, c, czas, sim } = r;
  const bx = (s.dlonA.x + s.dlonB.x) / 2 + 0.035 * h, by = (s.dlonA.y + s.dlonB.y) / 2 - 0.02 * h;
  const blysk = c.ksiegaT !== undefined ? clamp(1 - (sim.tick - c.ksiegaT) / 60, 0, 1) : 0;
  m.szczegol((g) => poswiata(g, bx, by, h * (0.3 + blysk * 0.35), [255, 232, 160], 0.35 + p.blask * 0.3));
  const w = 0.075 * h, hh = 0.1 * h;
  const ok = new Path2D(); ok.rect(bx - w - 0.007 * h, by - hh / 2 - 0.007 * h, w * 2 + 0.014 * h, hh + 0.014 * h);
  m.ksztalt(ok, m.plaszczyzna(bx, by - hh, bx, by + hh, [104, 50, 34]), (g) => {
    // kartki z wypukłością
    g.fillStyle = ton([250, 242, 222]);
    g.beginPath();
    g.moveTo(bx - w, by - hh / 2); g.quadraticCurveTo(bx - w / 2, by - hh / 2 - 0.012 * h, bx, by - hh / 2 + 0.004 * h);
    g.quadraticCurveTo(bx + w / 2, by - hh / 2 - 0.012 * h, bx + w, by - hh / 2);
    g.lineTo(bx + w, by + hh / 2); g.quadraticCurveTo(bx + w / 2, by + hh / 2 - 0.008 * h, bx, by + hh / 2 + 0.004 * h);
    g.quadraticCurveTo(bx - w / 2, by + hh / 2 - 0.008 * h, bx - w, by + hh / 2); g.closePath(); g.fill();
    if (m.prosto) return;
    g.fillStyle = 'rgba(120,96,70,0.25)'; g.fillRect(bx - 0.006 * h, by - hh / 2, 0.012 * h, hh);
    g.strokeStyle = 'rgba(90,70,60,0.55)'; g.lineWidth = Math.max(0.4, h * 0.004);
    for (let i = 1; i < 5; i++) {
      const y = by - hh / 2 + (hh * i) / 5;
      g.beginPath(); g.moveTo(bx - w * 0.82, y); g.lineTo(bx - w * 0.15, y); g.moveTo(bx + w * 0.15, y); g.lineTo(bx + w * 0.82, y); g.stroke();
    }
    g.fillStyle = ton([170, 40, 36]); g.fillRect(bx - w * 0.8, by - hh / 2 + hh * 0.08, w * 0.18, w * 0.18);
    // przewracana kartka
    const kk = (czas * 0.0009 + c.id) % 1;
    if (kk < 0.3) {
      const t = kk / 0.3, x = bx + w * Math.cos(t * PI), lift = 0.02 * h * Math.sin(t * PI);
      g.fillStyle = ton([238, 228, 204]);
      g.beginPath(); g.moveTo(bx, by - hh / 2); g.quadraticCurveTo((bx + x) / 2, by - hh / 2 - lift * 1.5, x, by - hh / 2 - lift); g.lineTo(x, by + hh / 2 - lift); g.quadraticCurveTo((bx + x) / 2, by + hh / 2 - lift * 1.2, bx, by + hh / 2); g.closePath(); g.fill();
    }
    g.fillStyle = ton(st.lamowka, 0.1);
    g.fillRect(bx - w - 0.007 * h, by - 0.006 * h, 0.012 * h, 0.012 * h);
    // litery światła unoszą się z kart
    if (m.lod === 2) {
      g.fillStyle = 'rgba(255,236,170,0.8)';
      for (let i = 0; i < 4; i++) {
        const t = (czas * 0.0005 + i * 0.25 + c.id * 0.1) % 1;
        const x = bx + sin(t * 7 + i) * 0.04 * h + (i - 1.5) * 0.02 * h, y = by - hh / 2 - t * 0.25 * h;
        g.globalAlpha = 1 - t; g.fillRect(x, y, h * 0.008, h * 0.012); g.fillRect(x - h * 0.004, y + h * 0.003, h * 0.016, h * 0.004);
      }
      g.globalAlpha = 1;
    }
  });
  if (blysk > 0 && !m.prosto) m.szczegol((g) => poswiata(g, bx + 0.08 * h, by, h * 0.6 * blysk + 0.1 * h, [255, 244, 200], 0.6 * blysk));
}
