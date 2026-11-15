/**
 * ŻARŁOK — potępiony do scen z Cerberem (film na początku gry i zabijanie na kręgu): nagi, obrzmiały, oblepiony
 * błotem człowiek rysowany tuszem, ze stawami, więc da się go położyć, wlec, trzymać w paszczy, rozerwać i zjeść.
 * Układ: biodro w (0, 0), y w górę ujemne, wzrost stojącego `h` (piksele), twarzą w prawo (+x).
 * Kąty kończyn są bezwzględne: 0 — w dół, dodatnie — do przodu (ku +x).
 */

export interface PozaLudzika {
  /** pochylenie tułowia od pionu (0 — prosto, π/2 — leży twarzą w prawo, −π/2 — na plecach w lewo) */
  tulow: number;
  /** głowa względem tułowia */
  glowa: number;
  /** ramiona i łokcie (bezwzględnie / zgięcie) — L dalsza, P bliższa */
  ramieL: number; lokiecL: number; ramieP: number; lokiecP: number;
  /** uda i kolana */
  udoL: number; kolanoL: number; udoP: number; kolanoP: number;
  /** otwarte usta 0…1 (krzyk), brzuch 0…1 (obżarstwo) */
  usta: number; brzuch: number;
  /** błoto 0…1, krew 0…1 (rany, zachlapanie) */
  bloto: number; krew: number;
  /** odcięte: kończyny, głowa; połowy: 'gora' — rysuj tylko od pasa w górę, 'dol' — tylko nogi i miednicę */
  brak?: { rekaL?: boolean; rekaP?: boolean; nogaL?: boolean; nogaP?: boolean; glowa?: boolean; polowa?: 'gora' | 'dol' };
}

export function pozaStoi(): PozaLudzika {
  return { tulow: 0.08, glowa: 0.05, ramieL: -0.1, lokiecL: 0.3, ramieP: 0.1, lokiecP: 0.3, udoL: -0.05, kolanoL: 0.05, udoP: 0.05, kolanoP: 0.05, usta: 0, brzuch: 0.7, bloto: 0.6, krew: 0 };
}

const TUSZ = 'rgba(16,10,8,0.96)';
const SKORA = 'rgb(176,152,124)', SKORA_D = 'rgb(128,108,88)';
const KREW = 'rgb(128,14,10)';
type P = [number, number];

const od = (a: P, kat: number, dl: number): P => [a[0] + Math.sin(kat) * dl, a[1] + Math.cos(kat) * dl];

/** Punkty ciała (do przyczepiania: paszcza trzyma za tułów, łapa przygniata). */
export interface PunktyLudzika { glowa: P; kark: P; dlonL: P; dlonP: P; stopaL: P; stopaP: P; pas: P }

function konczyna(ctx: CanvasRenderingContext2D, a: P, b: P, c: P, gr: number, kol: string, lw: number, koniec: 'dlon' | 'stopa' | null = null): void {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // obrys: górny odcinek grubszy, dolny węższy (zwężająca się kończyna)
  ctx.strokeStyle = TUSZ;
  ctx.lineWidth = gr + lw * 2; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  ctx.lineWidth = gr * 0.78 + lw * 2; ctx.beginPath(); ctx.moveTo(...b); ctx.lineTo(...c); ctx.stroke();
  if (koniec) {
    ctx.fillStyle = TUSZ;
    const kat = Math.atan2(c[1] - b[1], c[0] - b[0]);
    ctx.save(); ctx.translate(...c); ctx.rotate(koniec === 'stopa' ? 0 : kat);
    ctx.beginPath(); ctx.ellipse(koniec === 'stopa' ? gr * 0.35 : gr * 0.25, 0, gr * (koniec === 'stopa' ? 0.75 : 0.5) + lw, gr * 0.36 + lw, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = kol;
    ctx.beginPath(); ctx.ellipse(koniec === 'stopa' ? gr * 0.35 : gr * 0.25, 0, gr * (koniec === 'stopa' ? 0.75 : 0.5), gr * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = kol;
  ctx.lineWidth = gr; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  ctx.lineWidth = gr * 0.78; ctx.beginPath(); ctx.moveTo(...b); ctx.lineTo(...c); ctx.stroke();
  // światło na krawędzi i cień mięśnia
  ctx.strokeStyle = 'rgba(255,240,210,0.18)'; ctx.lineWidth = gr * 0.25;
  ctx.beginPath(); ctx.moveTo(a[0] - gr * 0.2, a[1] - gr * 0.1); ctx.lineTo(b[0] - gr * 0.2, b[1] - gr * 0.1); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,20,14,0.22)'; ctx.lineWidth = gr * 0.3;
  ctx.beginPath(); ctx.moveTo(b[0] + gr * 0.2, b[1]); ctx.lineTo(c[0] + gr * 0.15, c[1]); ctx.stroke();
}

/** Kikut: czerwony przekrój z kością. */
function kikut(ctx: CanvasRenderingContext2D, p: P, r: number, kat: number): void {
  ctx.save();
  ctx.translate(p[0], p[1]); ctx.rotate(kat);
  ctx.fillStyle = KREW; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.8, r * 0.2);
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgb(226,214,190)';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Poszarpany brzeg rozerwanego tułowia z wiszącymi trzewiami. */
function rozdarcie(ctx: CanvasRenderingContext2D, a: P, b: P, h: number, wGore: boolean, t: number): void {
  ctx.save();
  ctx.fillStyle = KREW; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, h * 0.008);
  ctx.beginPath(); ctx.moveTo(...a);
  for (let i = 1; i < 7; i++) {
    const u = i / 7;
    const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
    const z = (i % 2 ? 1 : -1) * h * 0.025;
    ctx.lineTo(x + z * 0.4, y + z * (wGore ? 1 : -1));
  }
  ctx.lineTo(...b); ctx.closePath(); ctx.fill(); ctx.stroke();
  // trzewia: dwie, trzy pętle zwisające w dół
  ctx.strokeStyle = 'rgb(176,70,70)'; ctx.lineWidth = Math.max(1.5, h * 0.022);
  const sx = (a[0] + b[0]) / 2, sy = (a[1] + b[1]) / 2;
  for (let i = 0; i < 3; i++) {
    const dl = h * (0.08 + i * 0.04);
    const kol = Math.sin(t * 3 + i) * h * 0.02;
    ctx.beginPath(); ctx.moveTo(sx + (i - 1) * h * 0.02, sy);
    ctx.bezierCurveTo(sx + kol + h * 0.04, sy + dl * 0.4, sx - h * 0.04 + kol, sy + dl * 0.8, sx + kol * 1.5, sy + dl);
    ctx.stroke();
  }
  ctx.restore();
}

/** Rysuje żarłoka. `t` — czas (s) do drgań trzewi. Zwraca punkty ciała. */
export function rysujLudzika(ctx: CanvasRenderingContext2D, h: number, p: PozaLudzika, t = 0): PunktyLudzika {
  const lw = Math.max(0.8, h * 0.012);
  const brak = p.brak ?? {};
  const gora = brak.polowa !== 'dol', dol = brak.polowa !== 'gora';
  const biodro: P = [0, 0];
  const kark: P = od(biodro, Math.PI - p.tulow, h * 0.34);   // w górę
  const tulKat = Math.PI - p.tulow;
  const barkL: P = [kark[0] - Math.cos(p.tulow) * h * 0.03, kark[1] + h * 0.02];
  const barkP: P = [kark[0] + Math.cos(p.tulow) * h * 0.03, kark[1] + h * 0.02];
  const lokL = od(barkL, p.ramieL, h * 0.17), dlonL = od(lokL, p.ramieL + p.lokiecL, h * 0.16);
  const lokP = od(barkP, p.ramieP, h * 0.17), dlonP = od(lokP, p.ramieP + p.lokiecP, h * 0.16);
  const kolL = od(biodro, p.udoL, h * 0.25), stopaL = od(kolL, p.udoL - p.kolanoL, h * 0.25);
  const kolP = od(biodro, p.udoP, h * 0.25), stopaP = od(kolP, p.udoP - p.kolanoP, h * 0.25);
  const glowaS = od(kark, tulKat - p.glowa, h * 0.1);
  const gr = h * 0.088;
  // dalsze kończyny (ciemniejsze)
  if (gora && !brak.rekaL) konczyna(ctx, barkL, lokL, dlonL, gr * 0.85, SKORA_D, lw, 'dlon');
  else if (gora) kikut(ctx, barkL, gr * 0.45, tulKat);
  if (dol && !brak.nogaL) konczyna(ctx, biodro, kolL, stopaL, gr * 1.15, SKORA_D, lw, 'stopa');
  // tułów z brzuchem
  if (gora) {
    ctx.save();
    const sr: P = [(biodro[0] + kark[0]) / 2, (biodro[1] + kark[1]) / 2];
    ctx.translate(sr[0], sr[1]); ctx.rotate(-p.tulow);
    ctx.beginPath();
    const W = h * 0.115, B = h * (0.07 + 0.08 * p.brzuch);
    ctx.moveTo(-W, -h * 0.17);
    ctx.quadraticCurveTo(-W * 1.15, 0, -W * 0.9, h * 0.17);
    ctx.lineTo(W * 0.8, h * 0.17);
    ctx.quadraticCurveTo(W + B * 1.4, h * 0.05, W * 0.9, -h * 0.12);
    ctx.quadraticCurveTo(W * 0.6, -h * 0.18, 0, -h * 0.18);
    ctx.closePath();
    const g = ctx.createLinearGradient(-W, 0, W + B, 0);
    g.addColorStop(0, SKORA_D); g.addColorStop(0.6, SKORA); g.addColorStop(1, 'rgb(196,174,146)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
    // fałdy brzucha, żebra
    ctx.strokeStyle = 'rgba(16,10,8,0.45)'; ctx.lineWidth = Math.max(0.6, lw * 0.6);
    ctx.beginPath(); ctx.moveTo(W * 0.2, h * 0.04); ctx.quadraticCurveTo(W + B * 0.8, h * 0.08, W * 0.3, h * 0.12); ctx.stroke();
    // błoto na dole tułowia
    if (p.bloto > 0) {
      ctx.fillStyle = `rgba(52,46,32,${0.7 * p.bloto})`;
      ctx.beginPath(); ctx.ellipse(0, h * 0.13, W * 1.2, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    }
    // krew na skórze
    if (p.krew > 0) {
      ctx.fillStyle = `rgba(128,14,10,${0.85 * p.krew})`;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-W * 0.5 + i * W * 0.45, -h * 0.08 + (i % 2) * h * 0.1, W * 0.25, h * 0.04, 0.4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    if (brak.polowa === 'gora') {
      // rozerwany w pasie: dół tułowia poszarpany
      const a = od(biodro, tulKat + Math.PI / 2, h * 0.09), b = od(biodro, tulKat - Math.PI / 2, h * 0.09);
      rozdarcie(ctx, a, b, h, false, t);
    }
  }
  if (brak.polowa === 'dol') {
    const a: P = [biodro[0] - h * 0.09, biodro[1] - h * 0.03], b: P = [biodro[0] + h * 0.09, biodro[1] - h * 0.03];
    rozdarcie(ctx, a, b, h, true, t);
  }
  // bliższa noga
  if (dol && !brak.nogaP) konczyna(ctx, biodro, kolP, stopaP, gr * 1.2, SKORA, lw, 'stopa');
  if (dol && p.bloto > 0) {
    ctx.fillStyle = `rgba(52,46,32,${0.6 * p.bloto})`;
    for (const s of [stopaL, stopaP, kolP]) { ctx.beginPath(); ctx.arc(s[0], s[1], gr * 0.7, 0, Math.PI * 2); ctx.fill(); }
  }
  // głowa
  if (gora && !brak.glowa) {
    ctx.save();
    ctx.translate(glowaS[0], glowaS[1]); ctx.rotate(-p.tulow + p.glowa);
    const r = h * 0.085;
    ctx.fillStyle = SKORA; ctx.strokeStyle = TUSZ; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 1.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // podbródek obrzmiały
    ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.75, r * 0.55, r * 0.35, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // włosy zlepione błotem
    ctx.strokeStyle = 'rgba(30,24,18,0.9)'; ctx.lineWidth = Math.max(0.8, lw);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.6 + i * r * 0.25, -r * 0.9); ctx.quadraticCurveTo(-r * 0.9 + i * r * 0.2, -r * 0.3, -r * 1.0 + i * r * 0.15, r * 0.1); ctx.stroke(); }
    // oko i usta
    ctx.fillStyle = TUSZ;
    ctx.beginPath(); ctx.ellipse(r * 0.45, -r * 0.15, r * 0.12, r * (0.06 + 0.06 * p.usta), 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.6, r * 0.35, r * 0.18, r * (0.05 + 0.32 * p.usta), 0, 0, Math.PI * 2); ctx.fill();
    if (p.krew > 0.3) { ctx.fillStyle = `rgba(128,14,10,${p.krew})`; ctx.beginPath(); ctx.ellipse(r * 0.6, r * 0.6, r * 0.12, r * 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  } else if (gora && brak.glowa) {
    kikut(ctx, kark, gr * 0.6, tulKat);
  }
  // bliższa ręka
  if (gora && !brak.rekaP) konczyna(ctx, barkP, lokP, dlonP, gr * 0.9, SKORA, lw, 'dlon');
  else if (gora) kikut(ctx, barkP, gr * 0.45, tulKat);
  return { glowa: glowaS, kark, dlonL, dlonP, stopaL, stopaP, pas: [(biodro[0] + kark[0]) / 2, (biodro[1] + kark[1]) / 2] };
}

// ---------------------------------------------------------------- pozy w czasie

/** Leży twarzą w błocie, drga; `t` — sekundy. */
export function pozaLezy(t: number, z = 0): PozaLudzika {
  const d = Math.sin(t * 1.3 + z) * 0.08;
  return { ...pozaStoi(), tulow: Math.PI / 2 + 0.05, glowa: -0.2 + d, ramieL: Math.PI / 2 + 0.6, lokiecL: 0.4, ramieP: Math.PI / 2 - 0.2 + d, lokiecP: 0.8, udoL: -Math.PI / 2 + 0.1, kolanoL: -0.2, udoP: -Math.PI / 2 + 0.25, kolanoP: -0.5 + d, bloto: 1 };
}
/** Czołga się (ucieka), `t` — sekundy, `v` — tempo. */
export function pozaCzolga(t: number, v = 1, z = 0): PozaLudzika {
  const f = t * 5 * v + z;
  return { ...pozaStoi(), tulow: Math.PI / 2 - 0.25, glowa: -0.5, ramieL: Math.PI / 2 + 0.6 + Math.sin(f) * 0.6, lokiecL: -0.6, ramieP: Math.PI / 2 + 0.6 - Math.sin(f) * 0.6, lokiecP: -0.6, udoL: -1.0 + Math.sin(f) * 0.4, kolanoL: -1.2, udoP: -1.0 - Math.sin(f) * 0.4, kolanoP: -1.2, usta: 0.6 + 0.4 * Math.abs(Math.sin(f * 0.7)), bloto: 1 };
}
/** Klęczy i wyje w deszcz. */
export function pozaWyje(t: number, z = 0): PozaLudzika {
  const k = Math.sin(t * 0.9 + z) * 0.1;
  return { ...pozaStoi(), tulow: -0.2 + k, glowa: -0.6, ramieL: -0.4, lokiecL: 0.2, ramieP: 0.5 + k, lokiecP: 0.6, udoL: 1.4, kolanoL: 1.5, udoP: 1.3, kolanoP: 1.5, usta: 0.8 + 0.2 * Math.sin(t * 3 + z), bloto: 1 };
}
/** Siedzi i żre (ręka do ust). */
export function pozaZre(t: number, z = 0): PozaLudzika {
  const r = (Math.sin(t * 2.5 + z) + 1) / 2;
  return { ...pozaStoi(), tulow: 0.35, glowa: 0.3, ramieP: 1.6 - r * 0.6, lokiecP: 1.6 + r * 0.8, ramieL: 0.9, lokiecL: 0.7, udoL: 1.5, kolanoL: 1.4, udoP: 1.6, kolanoP: 1.3, usta: r, bloto: 1 };
}
/** Bije się / sięga po ochłap (zamach ręką). */
export function pozaSzarpie(t: number, z = 0): PozaLudzika {
  const f = Math.sin(t * 6 + z);
  return { ...pozaStoi(), tulow: 0.6, glowa: -0.1, ramieP: 1.8 + f * 0.6, lokiecP: 0.3, ramieL: 1.2 - f * 0.5, lokiecL: 0.5, udoL: 1.2, kolanoL: 1.6, udoP: 0.6, kolanoP: 1.2, usta: 0.6 + 0.4 * Math.abs(f), bloto: 1 };
}
/** Trzymany w paszczy za tułów: zwisa, kończyny młócą (`moc` 0…1 — szarpanie), `t` — sekundy. */
export function pozaWPaszczy(t: number, moc = 1): PozaLudzika {
  const f = t * 14;
  return {
    ...pozaStoi(), tulow: Math.PI / 2 + Math.sin(t * 9) * 0.5 * moc, glowa: -0.6 + Math.sin(f) * 0.4 * moc,
    ramieL: 0.4 + Math.sin(f) * 1.0 * moc, lokiecL: 0.6, ramieP: -0.3 + Math.sin(f + 1) * 1.1 * moc, lokiecP: 0.8,
    udoL: Math.sin(f + 2) * 0.9 * moc, kolanoL: 0.4, udoP: Math.sin(f + 3) * 0.9 * moc, kolanoP: 0.6,
    usta: 0.9 * moc, bloto: 0.8, krew: 0.7,
  };
}
/** Bezwładny trup (po zabiciu). */
export function pozaTrup(z = 0): PozaLudzika {
  return { ...pozaStoi(), tulow: Math.PI / 2 + 0.3, glowa: 0.6, ramieL: 2.4, lokiecL: 0.2, ramieP: -0.4 + z * 0.1, lokiecP: 0.1, udoL: -1.2, kolanoL: 0.1, udoP: -1.6, kolanoP: -0.3, usta: 0.7, bloto: 1, krew: 1 };
}
/** Wstaje z błota (`k` 0…1: z leżenia na kolana i do stania). */
export function pozaWstaje(k: number): PozaLudzika {
  const a = pozaLezy(0), b = pozaStoi();
  const m = (x: number, y: number): number => x + (y - x) * k;
  return { ...b, tulow: m(a.tulow, b.tulow), glowa: m(a.glowa, b.glowa), ramieL: m(a.ramieL, 0.4), lokiecL: m(a.lokiecL, 0.5), ramieP: m(a.ramieP, 0.6), lokiecP: m(a.lokiecP, 0.4), udoL: m(a.udoL, -0.05), kolanoL: m(a.kolanoL, 0.05), udoP: m(a.udoP, 0.4 * (1 - k)), kolanoP: m(a.kolanoP, 0.05), bloto: 1 };
}

/** Kałuża krwi (rośnie z `k` 0…1). */
export function kaluzaKrwi(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, k: number, ziarno = 0): void {
  if (k <= 0) return;
  ctx.save();
  ctx.fillStyle = 'rgba(96,8,6,0.88)';
  ctx.beginPath(); ctx.ellipse(x, y, r * k, r * 0.18 * k, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a = ((ziarno * 7 + i * 13) % 10) / 10 * Math.PI * 2;
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * k * 0.9, y + Math.sin(a) * r * 0.12 * k, r * 0.25 * k, r * 0.06 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(200,60,50,0.25)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.3 * k, y - r * 0.03, r * 0.4 * k, r * 0.04 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Bryzg krwi z punktu (kropla po kropli, `k` 0…1 od chwili rany), kierunek `kat` (rad), siła `moc`. */
export function bryzgKrwi(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, k: number, kat: number, moc = 1, ziarno = 0): void {
  if (k <= 0 || k >= 1) return;
  ctx.save();
  ctx.fillStyle = KREW;
  const n = Math.round(14 * moc);
  for (let i = 0; i < n; i++) {
    const r1 = ((ziarno * 31 + i * 17) % 100) / 100, r2 = ((ziarno * 13 + i * 29) % 100) / 100;
    const a = kat + (r1 - 0.5) * 1.4;
    const v = h * (0.4 + r2 * 0.9) * moc;
    const px = x + Math.cos(a) * v * k, py = y + Math.sin(a) * v * k + k * k * h * 0.8;
    const r = Math.max(1, h * (0.008 + r2 * 0.014) * (1 - k * 0.5));
    ctx.beginPath(); ctx.ellipse(px, py, r * 1.6, r, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Błąka się: zgarbiony, ciężki krok, ręce zwisają. */
export function pozaIdzie(t: number, z = 0): PozaLudzika {
  const f = t * 4 + z;
  return { ...pozaStoi(), tulow: 0.35, glowa: 0.3, ramieL: -0.2 - Math.sin(f) * 0.35, lokiecL: 0.3, ramieP: 0.1 + Math.sin(f) * 0.35, lokiecP: 0.3, udoL: Math.sin(f) * 0.45, kolanoL: 0.15 + Math.max(0, Math.cos(f)) * 0.6, udoP: -Math.sin(f) * 0.45, kolanoP: 0.15 + Math.max(0, -Math.cos(f)) * 0.6, usta: 0.3, bloto: 1 };
}
