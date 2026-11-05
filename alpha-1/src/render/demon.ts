import { los } from './lud/matma';

/**
 * DEMON (Alpha, etap 5) — jedna rycina na dwie role: kamienny posąg Wielkiego Pomnika (przykucnięty, zakuty,
 * pękający) i żywy demon, który wstaje z jego gruzów (boss ostatniej fali). Rysunek stopami w (0, 0), przodem
 * w prawo, w jednostkach wysokości stojącej postaci `H` (rogi sięgają wyżej). Pozę liczy się z dwóch szkieletów —
 * stojącego i przykucniętego — więc wstawanie z gruzów to ta sama postać, płynnie.
 * Zastępstwo do czasu docelowej grafiki (robi ją Paweł).
 */

type P = [number, number];

export interface PozaDemona {
  /** Żywy (boss) czy kamienny (pomnik). */
  zywy: boolean;
  /** 0 — stoi, 1 — przykucnięty jak posąg. */
  kuca: number;
  /** 0 — skrzydła złożone, 1 — rozpostarte. */
  skrzydla: number;
  /** Oczy: 0 — zgaszone, 1 — płoną. */
  oczy: number;
  /** Ile rys (0…1 całego kompletu) i żar w nich (0…1); `swiatlo` — złote światło zamiast czerwonego żaru. */
  rysy: number;
  zar: number;
  swiatlo?: boolean;
  /** Odpadłe kawałki kamienia (0…1): utrącony róg, wyszczerbione skrzydło i bark. */
  ubytki: number;
  /** Zamach bliższą ręką (0…1, szczyt w połowie). */
  cios: number;
  /** Głowa: dodatkowy skłon (rad, + w dół, − w tył). */
  glowa: number;
  /** Oddech 0…1 (pierś unosi się). */
  oddech: number;
}

/** Punkty, do których scena coś przyczepia (kajdany, błysk ciosu, żar w piersi) — w jednostkach H. */
export interface PunktyDemona { wrF: P; wrB: P; glowa: P; piers: P }

interface Szkielet {
  hip: P; chest: P; neck: P; head: P;
  shF: P; elF: P; wrF: P; shB: P; elB: P; wrB: P;
  nF: [P, P, P, P]; nB: [P, P, P, P];
  /** skłon głowy (rad) */
  sklon: number;
}

const STOI: Szkielet = {
  hip: [0, -0.46], chest: [0.03, -0.7], neck: [0.07, -0.79], head: [0.11, -0.86],
  shF: [0.05, -0.73], elF: [0.15, -0.6], wrF: [0.2, -0.47],
  shB: [-0.03, -0.74], elB: [-0.08, -0.6], wrB: [-0.04, -0.47],
  nF: [[0.03, -0.46], [0.11, -0.3], [0.03, -0.12], [0.13, 0]],
  nB: [[-0.04, -0.46], [0.02, -0.3], [-0.08, -0.12], [0.02, 0]],
  sklon: 0,
};
const KUCA: Szkielet = {
  hip: [-0.04, -0.2], chest: [0.06, -0.45], neck: [0.12, -0.53], head: [0.17, -0.57],
  shF: [0.08, -0.48], elF: [0.2, -0.36], wrF: [0.28, -0.29],
  shB: [0.0, -0.49], elB: [0.11, -0.37], wrB: [0.19, -0.29],
  nF: [[-0.02, -0.2], [0.17, -0.33], [0.05, -0.04], [0.17, 0]],
  nB: [[-0.08, -0.2], [0.09, -0.32], [-0.03, -0.04], [0.09, 0]],
  sklon: 0.4,
};

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const mp = (a: P, b: P, t: number): P => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
const plus = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];

function poza(p: PozaDemona): Szkielet {
  const t = Math.max(0, Math.min(1, p.kuca));
  const s: Szkielet = {
    hip: mp(STOI.hip, KUCA.hip, t), chest: mp(STOI.chest, KUCA.chest, t), neck: mp(STOI.neck, KUCA.neck, t), head: mp(STOI.head, KUCA.head, t),
    shF: mp(STOI.shF, KUCA.shF, t), elF: mp(STOI.elF, KUCA.elF, t), wrF: mp(STOI.wrF, KUCA.wrF, t),
    shB: mp(STOI.shB, KUCA.shB, t), elB: mp(STOI.elB, KUCA.elB, t), wrB: mp(STOI.wrB, KUCA.wrB, t),
    nF: STOI.nF.map((q, i) => mp(q, KUCA.nF[i], t)) as Szkielet['nF'],
    nB: STOI.nB.map((q, i) => mp(q, KUCA.nB[i], t)) as Szkielet['nB'],
    sklon: mix(STOI.sklon, KUCA.sklon, t) + p.glowa,
  };
  // oddech: pierś i głowa unoszą się odrobinę
  const o = p.oddech * 0.008;
  for (const k of ['chest', 'neck', 'head', 'shF', 'shB'] as const) s[k] = [s[k][0], s[k][1] - o];
  // zamach bliższą ręką: w górę i do tyłu, potem w dół przed siebie
  if (p.cios > 0) {
    const z = Math.sin(Math.min(1, p.cios) * Math.PI);
    s.elF = mp(s.elF, plus(s.shF, [0.04, -0.13]), z);
    s.wrF = mp(s.wrF, plus(s.shF, [0.15, -0.2]), z);
  }
  return s;
}

/** Odcinek kończyny: zwężający się od `wa` do `wb`, z okrągłymi końcami. */
function kon(a: P, b: P, wa: number, wb: number): Path2D {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / d, ny = dx / d;
  const ang = Math.atan2(ny, nx);
  const p = new Path2D();
  p.moveTo(a[0] + nx * wa / 2, a[1] + ny * wa / 2);
  p.lineTo(b[0] + nx * wb / 2, b[1] + ny * wb / 2);
  p.arc(b[0], b[1], wb / 2, ang, ang + Math.PI, true);
  p.lineTo(a[0] - nx * wa / 2, a[1] - ny * wa / 2);
  p.arc(a[0], a[1], wa / 2, ang + Math.PI, ang, true);
  p.closePath();
  return p;
}

/** Krzywa Béziera (kwadratowa) jako pas zwężający się od `w0` do zera — róg, ogon. */
function pasek(a: P, c: P, b: P, w0: number, w1 = 0, n = 10): { path: Path2D; pts: P[] } {
  const pts: P[] = [], L: P[] = [], R: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const x = u * u * a[0] + 2 * u * t * c[0] + t * t * b[0];
    const y = u * u * a[1] + 2 * u * t * c[1] + t * t * b[1];
    const dx = 2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
    const dy = 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
    const d = Math.hypot(dx, dy) || 1e-6;
    const w = mix(w0, w1, t) / 2;
    pts.push([x, y]);
    L.push([x - dy / d * w, y + dx / d * w]);
    R.push([x + dy / d * w, y - dx / d * w]);
  }
  const path = new Path2D();
  path.moveTo(L[0][0], L[0][1]);
  for (const q of L) path.lineTo(q[0], q[1]);
  for (let i = R.length - 1; i >= 0; i--) path.lineTo(R[i][0], R[i][1]);
  path.closePath();
  return { path, pts };
}

/** Barwy: kamień posągu albo skóra żywego demona (dalsze części ciemniejsze). */
function barwy(zywy: boolean): { blisko: [string, string]; daleko: string; tusz: string; plyty: string } {
  return zywy
    // ciemna, przygaszona skóra (dawniej nasycona czerwień — diabełek z kreskówki obok rytej ryciny)
    ? { blisko: ['#5e3027', '#1c0f0c'], daleko: '#1a0d0a', tusz: 'rgba(12,5,4,0.96)', plyty: 'rgba(132,74,54,0.5)' }
    : { blisko: ['#9a8e7e', '#3e362e'], daleko: '#463e36', tusz: 'rgba(22,15,10,0.95)', plyty: 'rgba(40,30,22,0.45)' };
}

/** Rysy: przyczepione do odcinków ciała (idą za pozą). [odcinek, u, przesunięcie w bok, kąt, długość] */
const RYSY: [number, number, number, number, number][] = [];
for (let i = 0; i < 16; i++) {
  // najpierw tułów (najlepiej widać), potem kończyny i głowa
  const seg = i < 6 ? 0 : 1 + Math.floor(los(i, 1) * 8);
  RYSY.push([seg, 0.15 + los(i, 2) * 0.7, (los(i, 3) - 0.5) * 0.7, (los(i, 4) - 0.5) * 1.6, 0.05 + los(i, 5) * 0.07]);
}

/**
 * Rysuje demona. `H` w pikselach; kontekst ustawiony stopami w (0, 0), zwrot przez ctx.scale(±1, 1) u wołającego.
 * Zwraca punkty zaczepienia (w jednostkach H).
 */
export function rysujDemona(ctx: CanvasRenderingContext2D, H: number, p: PozaDemona): PunktyDemona {
  const s = poza(p);
  const B = barwy(p.zywy);
  const px = 1 / H;
  ctx.save();
  ctx.scale(H, H);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const grad = ctx.createLinearGradient(-0.2, -0.9, 0.3, 0);
  grad.addColorStop(0, B.blisko[0]); grad.addColorStop(1, B.blisko[1]);
  const obrys = (path: Path2D, fill: string | CanvasGradient, w = 1.5): void => {
    ctx.fillStyle = fill; ctx.fill(path);
    ctx.strokeStyle = B.tusz; ctx.lineWidth = w * px; ctx.stroke(path);
  };
  const cialo = new Path2D();
  /**
   * Bryła z kilku części (kości, mięśnie, tułów) z jednym obrysem: najpierw gruby kontur pod wszystkimi częściami,
   * potem wypełnienia na wierzch — szwy i kółka w stawach znikają, zostaje sylwetka jak z jednego kamienia
   * (dawniej każdy odcinek miał własny obrys i demon wyglądał jak kukiełka na zawiasach).
   */
  const bryla = (czesci: Path2D[], fill: string | CanvasGradient, w = 1.6): void => {
    ctx.strokeStyle = B.tusz; ctx.lineWidth = w * 2 * px;
    for (const c of czesci) ctx.stroke(c);
    ctx.fillStyle = fill;
    for (const c of czesci) { ctx.fill(c); cialo.addPath(c); }
  };
  /** Mięsień: elipsa wzdłuż odcinka a→b, w `t` jego długości, gruba na `grub`, długa na `dl` odcinka (z każdej strony). */
  const miesien = (a: P, b: P, t: number, grub: number, dl = 0.36): Path2D => {
    const c = mp(a, b, t), d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const e = new Path2D();
    e.ellipse(c[0], c[1], d * dl, grub / 2, Math.atan2(b[1] - a[1], b[0] - a[0]), 0, Math.PI * 2);
    return e;
  };

  // --- skrzydła: korzeń między łopatkami; złożone opadają jak płaszcz, rozpostarte sięgają szeroko w tył
  const R: P = plus(s.shB, [-0.03, 0.01]);
  const sk = Math.max(0, Math.min(1, p.skrzydla));
  const W = plus(R, mp([-0.06, -0.15], [-0.24, -0.2], sk));
  const tipy: P[] = [
    mp([-0.17, 0.12], [-0.54, -0.12], sk), mp([-0.13, 0.22], [-0.5, 0.09], sk),
    mp([-0.07, 0.27], [-0.36, 0.24], sk), mp([-0.01, 0.26], [-0.16, 0.28], sk),
  ].map((q) => plus(R, q));
  const skrzydlo = (dx: number, dy: number, fill: string | CanvasGradient, utrac: boolean): void => {
    const o: P = [dx, dy];
    const r = plus(R, o), w = plus(W, o);
    const t = tipy.map((q, i) => (utrac && i === 0 ? mp(plus(q, o), w, 0.3) : plus(q, o)));
    const bl = new Path2D();
    bl.moveTo(r[0], r[1]); bl.lineTo(w[0], w[1]); bl.lineTo(t[0][0], t[0][1]);
    for (let i = 1; i < t.length; i++) {
      // błona między palcami wygina się do środka (falbana)
      const c = mp(mp(t[i - 1], t[i], 0.5), w, 0.22);
      bl.quadraticCurveTo(c[0], c[1], t[i][0], t[i][1]);
    }
    bl.quadraticCurveTo(r[0] + 0.02, r[1] + 0.2, r[0], r[1]);
    bl.closePath();
    obrys(bl, fill, 1.2);
    // kości: ramię skrzydła i palce
    ctx.strokeStyle = B.tusz; ctx.lineWidth = 2.2 * px;
    ctx.beginPath(); ctx.moveTo(r[0], r[1]); ctx.lineTo(w[0], w[1]);
    for (const q of t) { ctx.moveTo(w[0], w[1]); ctx.lineTo(q[0], q[1]); }
    ctx.stroke();
    // szpon na stawie skrzydła
    ctx.fillStyle = B.tusz;
    ctx.beginPath(); ctx.moveTo(w[0], w[1]); ctx.lineTo(w[0] + 0.012, w[1] - 0.035); ctx.lineTo(w[0] + 0.02, w[1] + 0.004); ctx.fill();
  };
  skrzydlo(0.035, -0.025, B.daleko, false);

  // --- dalsza ręka i noga (ciemniejsze), ogon; każda kończyna to jedna bryła: kości, mięśnie i bark
  const reka = (sh: P, el: P, wr: P, fill: string | CanvasGradient): void => {
    const bark = new Path2D();
    bark.arc(sh[0], sh[1], 0.05, 0, Math.PI * 2);
    bryla([kon(sh, el, 0.088, 0.064), miesien(sh, el, 0.42, 0.106), kon(el, wr, 0.064, 0.042), miesien(el, wr, 0.3, 0.074, 0.3), bark], fill);
    // szpony: trzy zakrzywione w dół i do przodu
    const d = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
    ctx.strokeStyle = B.tusz; ctx.lineWidth = 1.6 * px;
    for (let k = -1; k <= 1; k++) {
      const a0 = d + k * 0.35;
      ctx.beginPath();
      ctx.moveTo(wr[0], wr[1]);
      ctx.quadraticCurveTo(wr[0] + Math.cos(a0) * 0.03, wr[1] + Math.sin(a0) * 0.03, wr[0] + Math.cos(a0 + 0.6) * 0.045, wr[1] + Math.sin(a0 + 0.6) * 0.045);
      ctx.stroke();
    }
  };
  const noga = (n: [P, P, P, P], fill: string | CanvasGradient): void => {
    bryla([kon(n[0], n[1], 0.13, 0.08), miesien(n[0], n[1], 0.46, 0.16, 0.4), kon(n[1], n[2], 0.076, 0.046),
      miesien(n[1], n[2], 0.32, 0.086, 0.3), kon(n[2], n[3], 0.046, 0.03)], fill);
    ctx.strokeStyle = B.tusz; ctx.lineWidth = 1.5 * px;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) { ctx.moveTo(n[3][0] - 0.01 + k * 0.012, n[3][1] - 0.006); ctx.lineTo(n[3][0] + 0.012 + k * 0.012, n[3][1] + 0.002); }
    ctx.stroke();
  };
  reka(s.shB, s.elB, s.wrB, B.daleko);
  noga(s.nB, B.daleko);
  const ogon = pasek(plus(s.hip, [-0.05, 0.02]), plus(s.hip, [-0.2, 0.16]), [-0.28, -0.012], 0.04, 0.008);
  obrys(ogon.path, B.daleko, 1.2);
  const kon0 = ogon.pts[ogon.pts.length - 1];
  const grot = new Path2D();
  grot.moveTo(kon0[0], kon0[1] - 0.02); grot.lineTo(kon0[0] - 0.045, kon0[1] + 0.002); grot.lineTo(kon0[0], kon0[1] + 0.014); grot.closePath();
  obrys(grot, B.daleko, 1.2);

  // --- tułów: szeroka pierś, wąska talia, pochylony za kręgosłupem
  const dx = s.neck[0] - s.hip[0], dy = s.neck[1] - s.hip[1];
  const dl = Math.hypot(dx, dy);
  const nx = -dy / dl, ny = dx / dl;
  const wzdl = (t: number, w: number, strona: number): P => [s.hip[0] + dx * t + nx * w * strona, s.hip[1] + dy * t + ny * w * strona];
  const tul = new Path2D();
  const przod = [wzdl(0, 0.085, -1), wzdl(0.35, 0.072, -1), wzdl(0.7, 0.145, -1), wzdl(0.95, 0.1, -1)];
  const tyl = [wzdl(0.95, 0.11, 1), wzdl(0.7, 0.15, 1), wzdl(0.35, 0.078, 1), wzdl(0, 0.09, 1)];
  tul.moveTo(przod[0][0], przod[0][1]);
  tul.quadraticCurveTo(przod[1][0], przod[1][1], mp(przod[1], przod[2], 0.5)[0], mp(przod[1], przod[2], 0.5)[1]);
  tul.quadraticCurveTo(przod[2][0], przod[2][1], przod[3][0], przod[3][1]);
  tul.lineTo(tyl[0][0], tyl[0][1]);
  tul.quadraticCurveTo(tyl[1][0], tyl[1][1], mp(tyl[1], tyl[2], 0.5)[0], mp(tyl[1], tyl[2], 0.5)[1]);
  tul.quadraticCurveTo(tyl[2][0], tyl[2][1], tyl[3][0], tyl[3][1]);
  tul.closePath();
  // tułów razem z karkiem — głowa siedzi na szyi, a nie wisi nad barkami
  bryla([tul, kon(s.neck, s.head, 0.085, 0.062)], grad, 1.7);
  // płyty brzucha i żebra
  ctx.strokeStyle = B.plyty; ctx.lineWidth = 1.1 * px;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const t = 0.18 + k * 0.12;
    const a = wzdl(t, 0.045, -1), b = wzdl(t + 0.02, 0.0, 1);
    ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mix(a[0], b[0], 0.5) + nx * 0.01, mix(a[1], b[1], 0.5) + ny * 0.01 - 0.01, b[0], b[1]);
  }
  for (let k = 0; k < 3; k++) {
    const a = wzdl(0.62 + k * 0.08, 0.09, -1), b = wzdl(0.6 + k * 0.08, 0.02, 1);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();

  // --- bliższe skrzydło (za barkiem), bliższa noga
  noga(s.nF, grad);

  // --- głowa i rogi
  const glowa = (): void => {
    ctx.save();
    ctx.translate(s.head[0], s.head[1]);
    ctx.rotate(s.sklon);
    ctx.scale(1.3, 1.3);
    const g = new Path2D();
    g.moveTo(-0.055, -0.01);
    g.quadraticCurveTo(-0.05, -0.055, 0.0, -0.05);
    g.quadraticCurveTo(0.045, -0.045, 0.06, -0.022);
    g.lineTo(0.085, -0.004);
    g.lineTo(0.08, 0.016);
    g.quadraticCurveTo(0.05, 0.022, 0.035, 0.03);
    g.lineTo(0.03, 0.048);
    g.quadraticCurveTo(0.0, 0.05, -0.02, 0.035);
    g.quadraticCurveTo(-0.05, 0.025, -0.055, -0.01);
    g.closePath();
    obrys(g, grad, 1.5);
    cialo.addPath(g);
    // łuk brwiowy i szczęka
    ctx.strokeStyle = B.tusz; ctx.lineWidth = 2 * px;
    ctx.beginPath(); ctx.moveTo(0.0, -0.03); ctx.quadraticCurveTo(0.035, -0.04, 0.06, -0.018); ctx.stroke();
    ctx.lineWidth = 1.2 * px;
    ctx.beginPath(); ctx.moveTo(0.075, 0.012); ctx.quadraticCurveTo(0.045, 0.012, 0.02, 0.03); ctx.stroke();
    // kły
    ctx.fillStyle = p.zywy ? '#e8d6b0' : '#b8ab98';
    ctx.beginPath(); ctx.moveTo(0.06, 0.012); ctx.lineTo(0.064, 0.03); ctx.lineTo(0.068, 0.012); ctx.fill();
    // oczy: szczeliny pod łukiem brwiowym
    if (p.oczy > 0.01) {
      ctx.save();
      ctx.shadowColor = p.zywy || p.swiatlo ? 'rgba(255,190,80,0.95)' : 'rgba(255,70,30,0.95)';
      ctx.shadowBlur = 10 * p.oczy;
      ctx.fillStyle = p.zywy ? `rgba(255,214,110,${0.4 + 0.6 * p.oczy})` : `rgba(255,96,48,${p.oczy})`;
      ctx.beginPath(); ctx.moveTo(0.02, -0.022); ctx.lineTo(0.05, -0.016); ctx.lineTo(0.022, -0.012); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = B.tusz;
      ctx.beginPath(); ctx.moveTo(0.02, -0.022); ctx.lineTo(0.05, -0.016); ctx.lineTo(0.022, -0.013); ctx.closePath(); ctx.fill();
    }
    // rogi: wielkie, w górę i w tył, końcem do przodu; bliższy utrącony, gdy pomnik się kruszy
    const rog = (bx: number, by: number, sk2: number, fill: string | CanvasGradient, dl2: number): void => {
      const a: P = [bx, by], c: P = [bx - 0.09 * sk2, by - 0.1 * sk2], b: P = [bx - 0.03 * sk2 + 0.07 * sk2 * dl2, by - 0.19 * sk2 * dl2 - 0.02 * (1 - dl2)];
      const r = pasek(a, c, mp(a, b, 1), 0.032 * sk2, 0.004 + 0.012 * (1 - dl2), 12);
      obrys(r.path, fill, 1.3);
      // pierścienie na rogu
      ctx.strokeStyle = B.tusz; ctx.lineWidth = 0.9 * px;
      ctx.beginPath();
      for (let k = 2; k < r.pts.length - 2; k += 2) { const q = r.pts[k]; ctx.moveTo(q[0] - 0.008, q[1] - 0.004); ctx.lineTo(q[0] + 0.008, q[1] + 0.004); }
      ctx.stroke();
    };
    rog(-0.035, -0.04, 0.9, B.daleko, 1);
    rog(-0.012, -0.046, 1, grad, 1 - 0.38 * p.ubytki);
    ctx.restore();
  };

  // --- bliższa ręka na wierzchu, potem głowa
  reka(s.shF, s.elF, s.wrF, grad);
  glowa();
  // bliższe skrzydło wystaje zza barku — tylko jego kość i staw (błona jest za ciałem)
  if (sk > 0.4) skrzydlo(-0.01, 0.01, B.daleko, p.ubytki > 0.3);

  // --- kreska ryciny: ukośne kreski cienia po tylnej stronie ciała
  ctx.save();
  ctx.clip(cialo);
  const kreska = ctx.createLinearGradient(-0.12, 0, 0.18, 0);
  kreska.addColorStop(0, `rgba(10,6,4,${p.zywy ? 0.4 : 0.32})`);
  kreska.addColorStop(1, 'rgba(10,6,4,0)');
  ctx.strokeStyle = kreska; ctx.lineWidth = 0.9 * px;
  ctx.beginPath();
  const krok = Math.max(2.4 * px, 0.012);
  for (let x = -0.5; x < 0.5; x += krok) { ctx.moveTo(x, -1); ctx.lineTo(x + 1.0, 0); }
  ctx.stroke();
  // (ubytki — odpadłe kawałki — wycina z sylwetki render/pomnik.ts: wyciecUbytki; tu tylko utrącony róg i skrzydło)
  ctx.restore();

  // --- rysy (idą za pozą): ciemne, a z żarem — świecą od środka
  const segs: [P, P][] = [[s.hip, s.neck], [s.nF[0], s.nF[1]], [s.nF[1], s.nF[2]], [s.shF, s.elF], [s.elF, s.wrF], [s.nB[0], s.nB[1]], [s.shB, s.elB], [s.neck, s.head], [s.hip, s.chest]];
  const ile = Math.round(Math.max(0, Math.min(1, p.rysy)) * RYSY.length);
  if (ile > 0) {
    const lin = new Path2D();
    for (let i = 0; i < ile; i++) {
      const [seg, u, off, kat, dlug] = RYSY[i];
      const [a, b] = segs[Math.min(segs.length - 1, seg)];
      const ddx = b[0] - a[0], ddy = b[1] - a[1], d = Math.hypot(ddx, ddy) || 1;
      const kx = -ddy / d, ky = ddx / d;
      const w = seg === 0 ? 0.08 : 0.025;
      let x = a[0] + ddx * u + kx * off * w, y = a[1] + ddy * u + ky * off * w;
      const ang = Math.atan2(ddy, ddx) + Math.PI / 2 + kat;
      lin.moveTo(x, y);
      for (let k = 1; k <= 4; k++) {
        const zyg = (los(i * 7 + k, 6) - 0.5) * 0.9;
        x += Math.cos(ang + zyg) * dlug / 4; y += Math.sin(ang + zyg) * dlug / 4;
        lin.lineTo(x, y);
        // odgałęzienie
        if (k === 2 && los(i, 8) > 0.5) { lin.lineTo(x + Math.cos(ang + 1.2) * dlug * 0.25, y + Math.sin(ang + 1.2) * dlug * 0.25); lin.moveTo(x, y); }
      }
    }
    // szczelina: ciemna i szeroka jak rysa w kamieniu, z jasną wargą od światła — widać ją od pierwszego pęknięcia
    ctx.save();
    ctx.clip(cialo);
    ctx.strokeStyle = 'rgba(200,185,160,0.4)'; ctx.lineWidth = 1.1 * px;
    ctx.translate(0.9 * px, 0.9 * px); ctx.stroke(lin); ctx.translate(-0.9 * px, -0.9 * px);
    ctx.strokeStyle = 'rgba(12,7,4,0.95)'; ctx.lineWidth = (2.2 + 0.8 * p.zar) * px;
    ctx.stroke(lin);
    if (p.zar > 0.01) {
      // żar: świeci dno szczeliny (cienki gorący rdzeń między ciemnymi brzegami), nie cała kreska — bez pręg
      const barwa = p.swiatlo ? '255,226,150' : '255,120,52';
      ctx.shadowColor = `rgba(${barwa},0.9)`; ctx.shadowBlur = 6 * p.zar;
      ctx.strokeStyle = `rgba(${barwa},${0.55 + 0.45 * p.zar})`;
      ctx.lineWidth = (0.7 + 0.8 * p.zar) * px;
      ctx.stroke(lin);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,236,190,${0.55 * p.zar})`;
      ctx.lineWidth = 0.5 * px;
      ctx.stroke(lin);
    }
    ctx.restore();
  }
  ctx.restore();
  const piers = mp(s.chest, s.neck, 0.2);
  return { wrF: s.wrF, wrB: s.wrB, glowa: s.head, piers };
}
