import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Creature } from '../sim/creatures';
import { procentSkorupy } from '../sim/rytual';
import { miejscePomnika, stanPekania } from '../sim/pomnik';
import { aktywnyBoss } from '../sim/boss';
import { POMNIK } from '../nastawy/pomnik';
import { RACES, Race } from '../sim/races';
import { ustawienia } from '../core/settings-store';
import { rysujDemona, type PozaDemona, type PunktyDemona } from './demon';
import { tetnoRdzenia } from './rdzen';
import { glif } from './tajemnica';
import { wolnoRuszac } from './nastroj';
import { SERIF } from './ink';

/**
 * WIELKI POMNIK DEMONA (Alpha, etap 5) — rysunek do sim/pomnik.ts. Na dnie komory pod kryptą, na cokole z wyrytymi
 * znakami, kuca kamienny demon zakuty w łańcuchy. Modlitwa go kruszy:
 *  - stan 1: po kamieniu biegną rysy (przy pęknięciu — błysk, posąg drga, sypie się pył);
 *  - stan 2: odpadają kawałki (utrącony róg, wyszczerbione skrzydło, bark i udo), u stóp leżą odłamki;
 *  - stan 3: rysy żarzą się czerwono od środka, w piersi bije żar, oczy się tlą.
 * Rozpad: posąg drży coraz mocniej, rysy płoną, łańcuchy pękają — i kamień rozlatuje się na kawałki w obłoku pyłu,
 * zostaje kopiec gruzu. Wyjście: z gruzu wstaje żywy demon — prostuje się, otwiera oczy, rozpościera skrzydła.
 * Boss na mapie (żywy demon) i jego konanie po ostatnim uderzeniu — rysujDemonaBossa (wołane z render/straznicy.ts):
 * złote światło rozsadza go od środka, pada na kolana i rozsypuje się w popiół; fala światła i błysk — rysujNadPomnikiem.
 * Animacje idą tikami gry (od tiku zmiany fazy), drgania i żar — zegarem ekranu.
 */

const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/** Tani skrót liczby — stałe kształty odłamków (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Wysokość posągu (H stojącej postaci) w pikselach. */
const wysokoscPosagu = (z: number): number => z * POMNIK.wysokosc;
/** Wysokość żywego demona — ta sama co bossa na mapie (render/figury.ts × straznicy.ts). */
export function wysokoscDemona(z: number): number {
  return Math.max(16, RACES[Race.TROLL].size * z * 1.9 * ustawienia.wielkoscSylwetek) * aktywnyBoss().rozmiar * 0.6;
}

/**
 * Rysuje coś pocięte na kawałki, które się rozpadają (`k` 0…1): rozpad posągu i konanie demona. Kawałki to
 * nieregularne bryły (siatka z rozedrganymi węzłami — sąsiednie bryły pasują do siebie), nie kliny od środka
 * (dawniej posąg kroił się jak tort). `opad` > 0 — bryły spadają i toczą się w bok (kamień), < 0 — unoszą się (popiół).
 */
function rozbite(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, k: number, ziarno: number, opad: number, rysuj: () => void): void {
  const nx = 5, ny = 6;
  const x0 = cx - R * 1.15, y0 = cy - R * 1.35, sw = (R * 2.3) / nx, sh = (R * 2.7) / ny;
  const wezel = (i: number, j: number): [number, number] => {
    const brzeg = i === 0 || j === 0 || i === nx || j === ny;
    const jx = brzeg ? 0 : (los(ziarno + i * 31 + j * 7) - 0.5) * sw * 0.7;
    const jy = brzeg ? 0 : (los(ziarno + i * 13 + j * 29 + 5) - 0.5) * sh * 0.7;
    return [x0 + i * sw + jx, y0 + j * sh + jy];
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const id = ziarno + j * nx + i;
      const a = wezel(i, j), b = wezel(i + 1, j), c = wezel(i + 1, j + 1), d = wezel(i, j + 1);
      const mx = (a[0] + b[0] + c[0] + d[0]) / 4, my = (a[1] + b[1] + c[1] + d[1]) / 4;
      // górne bryły ruszają pierwsze; każda z własnym opóźnieniem
      const opoz = (1 - j / ny) * 0.25 + los(id * 3) * 0.15;
      const t = Math.max(0, Math.min(1, (k - opoz) / (1 - opoz)));
      const bok = (mx - cx) / R;
      const dx = (bok * 0.5 + (los(id * 7) - 0.5) * 0.6) * R * t;
      const dy = opad > 0 ? (cy + R * 1.35 - my) * gladko(t * 1.2) * opad : opad * R * 1.8 * t * t;
      const obrot = (los(id * 5) - 0.5) * 1.8 * t;
      ctx.save();
      ctx.globalAlpha *= 1 - gladko((t - 0.7) / 0.3);
      ctx.translate(mx + dx, my + dy);
      ctx.rotate(obrot);
      ctx.translate(-mx, -my);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.clip();
      rysuj();
      ctx.restore();
    }
  }
}

/**
 * Odpadłe kawałki posągu (w jednostkach H, stopy w 0,0; środek i promień): czubek skrzydła i kęs z jego brzegu,
 * bark, palce stopy, koniec ogona — zawsze na brzegu sylwetki (w środku wyglądałyby jak dziura na wylot).
 */
const UBYTKI: [number, number, number][] = [[-0.07, -0.665, 0.04], [-0.205, -0.42, 0.034], [0.02, -0.565, 0.032], [0.19, -0.012, 0.026], [-0.3, -0.02, 0.03]];

interface WarstwaPosagu { c: HTMLCanvasElement; cw: number; ch: number; W: number; Hh: number; ox: number; oy: number; pkt: PunktyDemona }

/**
 * Posąg z prawdziwymi ubytkami na osobnej warstwie: z niej wycina się odpadłe kawałki (sylwetka traci róg skrzydła,
 * kolano i palce), a na przełomie zostaje jasna krawędź świeżego kamienia. Stopy w (ox, oy) warstwy.
 */
function warstwaPosagu(ctx: CanvasRenderingContext2D, H: number, poza: PozaDemona): WarstwaPosagu {
  const m = ctx.getTransform(), dpr = Math.max(1, Math.hypot(m.a, m.b));
  const W = Math.ceil(H * 1.5), Hh = Math.ceil(H * 1.35), ox = W / 2, oy = H * 1.15;
  warstwa ??= document.createElement('canvas');
  const cw = Math.ceil(W * dpr), ch = Math.ceil(Hh * dpr);
  if (warstwa.width < cw || warstwa.height < ch) { warstwa.width = cw; warstwa.height = ch; }
  const g = warstwa.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cw, ch);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.translate(ox, oy);
  const pkt = rysujDemona(g, H, poza);
  g.scale(H, H);
  const wyrwa = new Path2D();
  UBYTKI.forEach(([ux, uy, r], i) => {
    const n = 6;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2 + los(i * 17 + j) * 0.6;
      const rr = r * (0.65 + los(i * 23 + j) * 0.6);
      if (j === 0) wyrwa.moveTo(ux + Math.cos(a) * rr, uy + Math.sin(a) * rr);
      else wyrwa.lineTo(ux + Math.cos(a) * rr, uy + Math.sin(a) * rr);
    }
    wyrwa.closePath();
  });
  g.globalAlpha = Math.min(1, poza.ubytki * 1.5);
  g.globalCompositeOperation = 'destination-out';
  g.fill(wyrwa);
  // przełom: jasna krawędź świeżego kamienia i cień pod nią — tylko tam, gdzie kamień został
  g.globalCompositeOperation = 'source-atop';
  g.strokeStyle = 'rgba(214,200,174,0.9)'; g.lineWidth = 2.6 / H;
  g.stroke(wyrwa);
  g.strokeStyle = 'rgba(20,14,10,0.5)'; g.lineWidth = 1.2 / H;
  g.translate(0.8 / H, 1.4 / H); g.stroke(wyrwa);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { c: warstwa, cw, ch, W, Hh, ox, oy, pkt };
}
let warstwa: HTMLCanvasElement | null = null;

/** Posąg (stopy w x, top): z ubytkami — z warstwy, bez nich — wprost. */
function posagZUbytkami(ctx: CanvasRenderingContext2D, x: number, top: number, H: number, poza: PozaDemona): PunktyDemona {
  if (poza.ubytki <= 0.01 || typeof document === 'undefined') {
    ctx.save(); ctx.translate(x, top);
    const p = rysujDemona(ctx, H, poza);
    ctx.restore();
    return p;
  }
  const L = warstwaPosagu(ctx, H, poza);
  ctx.drawImage(L.c, 0, 0, L.cw, L.ch, x - L.ox, top - L.oy, L.W, L.Hh);
  return L.pkt;
}

/** Cokół: ciosany blok z wyrytymi znakami (rozbity — tylko dolna połowa, w szczerbach). */
export function cokol(ctx: CanvasRenderingContext2D, x: number, y: number, H: number, rozbity: boolean, z: number): number {
  const w = H * 0.62, h = H * 0.075;
  ctx.save();
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, '#6e6458'); g.addColorStop(1, '#2e2822');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(20,14,10,0.95)'; ctx.lineWidth = Math.max(1.2, z * 0.1);
  ctx.beginPath();
  if (rozbity) {
    ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h * 0.6);
    for (let i = 0; i <= 8; i++) ctx.lineTo(x - w / 2 + (w * i) / 8, y - h * (0.35 + los(i + 40) * 0.5));
    ctx.lineTo(x + w / 2, y);
  } else {
    ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h); ctx.lineTo(x - w * 0.46, y - h * 1.18);
    ctx.lineTo(x + w * 0.46, y - h * 1.18); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w / 2, y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // fugi i znaki
  ctx.strokeStyle = 'rgba(20,14,10,0.6)'; ctx.lineWidth = Math.max(0.8, z * 0.06);
  ctx.beginPath();
  for (let i = 1; i < 4; i++) { ctx.moveTo(x - w / 2 + (w * i) / 4, y); ctx.lineTo(x - w / 2 + (w * i) / 4, y - h * (rozbity ? 0.35 : 1)); }
  ctx.stroke();
  if (!rozbity && z >= 6) {
    for (let i = 0; i < 4; i++) {
      const gr = h * 0.28;
      ctx.save();
      ctx.translate(x - w / 2 + (w * (i + 0.5)) / 4, y - h * 0.5);
      ctx.scale(gr, gr);
      ctx.lineWidth = 1.2 / gr;
      ctx.strokeStyle = 'rgba(200,120,90,0.55)';
      ctx.stroke(glif(900 + i, 2));
      ctx.restore();
    }
  }
  ctx.restore();
  return rozbity ? y - h * 0.4 : y - h * 1.18;
}

/** Łańcuch z ogniw od a do b (zwisający łukiem); `pek` — rozerwany w połowie, końce opadają. */
function lancuch(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number], z: number, pek = 0): void {
  const ogniwo = Math.max(2.5, z * 0.32);
  const dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(3, Math.floor(dl / (ogniwo * 1.5)));
  ctx.save();
  ctx.strokeStyle = 'rgba(70,64,60,0.95)'; ctx.lineWidth = Math.max(1, ogniwo * 0.35);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (pek > 0 && Math.abs(t - 0.5) < 0.08) continue;
    let x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * dl * 0.12;
    // rozerwany: obie połowy opadają ku swoim kotwicom
    if (pek > 0) { const kot = t < 0.5 ? a : b; const u = t < 0.5 ? t / 0.5 : (1 - t) / 0.5; x = x + (kot[0] - x) * pek * (1 - u) * 0.2; y = y + pek * dl * 0.5 * u * u; }
    ctx.beginPath();
    ctx.ellipse(x, y, ogniwo * 0.55, ogniwo * 0.32, i % 2 ? Math.PI / 2 : 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Kopiec gruzu u stóp pomnika (`k` 0…1 — rośnie przy rozpadzie); z kawałkami: róg, kawał skrzydła, łapa. */
export function gruz(ctx: CanvasRenderingContext2D, x: number, y: number, H: number, k: number, czas: number, z: number): void {
  if (k <= 0) return;
  // kopiec do połowy komory (dawniej gruz wielkości kota po kilkumetrowym posągu)
  const w = H * 1.3, h = H * 0.48 * k;
  ctx.save();
  const g = ctx.createLinearGradient(0, y - h, 0, y);
  g.addColorStop(0, '#6a6054'); g.addColorStop(1, '#2a241f');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(20,14,10,0.95)'; ctx.lineWidth = Math.max(1, z * 0.08);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const bump = Math.sin(t * Math.PI) * (0.75 + los(i + 60) * 0.35);
    ctx.lineTo(x - w / 2 + w * t, y - h * bump);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // bryły na kopcu
  for (let i = 0; i < 16; i++) {
    const bx = x + (los(i + 70) - 0.5) * w * 0.8, r = H * (0.03 + los(i + 80) * 0.05) * k;
    const by = y - h * Math.sin((bx - x + w / 2) / w * Math.PI) * 0.85;
    ctx.beginPath();
    for (let j = 0; j < 5; j++) { const a = (j / 5) * Math.PI * 2 + los(i * 9 + j); const rr = r * (0.7 + los(i * 11 + j) * 0.5); ctx.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr); }
    ctx.closePath();
    ctx.fillStyle = i % 3 ? '#5a5046' : '#7d7264'; ctx.fill(); ctx.stroke();
  }
  // utrącony róg na wierzchu
  if (k > 0.6) {
    ctx.save();
    ctx.translate(x + w * 0.22, y - h * 0.75);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#7a6e60';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-H * 0.05, -H * 0.06, -H * 0.01, -H * 0.11); ctx.quadraticCurveTo(-H * 0.02, -H * 0.05, H * 0.025, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // żar w szczelinach gruzu
  const tl = 0.5 + 0.5 * Math.sin(czas * 0.004);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const bx = x + (los(i + 90) - 0.5) * w * 0.6, by = y - h * (0.2 + los(i + 95) * 0.4);
    const r = H * 0.03 * (0.6 + 0.4 * tl);
    const gg = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    gg.addColorStop(0, `rgba(255,110,50,${0.45 * k})`); gg.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = gg; ctx.fillRect(bx - r, by - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** Poza kamiennego posągu w danym stanie pękania. */
function pozaPosagu(stan: number, teraz: number, zar = 0): PozaDemona {
  const tetno = tetnoRdzenia(teraz);
  return {
    zywy: false, kuca: 1, skrzydla: 0.12, glowa: 0, cios: 0, oddech: 0,
    rysy: [0, 0.5, 0.8, 1][Math.min(3, stan)],
    ubytki: stan >= 2 ? 1 : 0,
    zar: Math.max(zar, stan >= 3 ? 0.45 + 0.35 * tetno : 0),
    oczy: Math.max(zar, stan >= 3 ? 0.35 + 0.4 * tetno : stan >= 2 ? 0.08 : 0),
  };
}

/** Pomnik na dnie komory — przed mrokiem (wołane z render/rdzen.ts zamiast serca rdzenia). */
export function rysujPomnik(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const z = cam.zoom;
  const m = miejscePomnika(sim);
  const bx = cam.toScreenX(m.x), by = cam.toScreenY(m.y + 1);
  const H = wysokoscPosagu(z);
  if (bx < -H || bx > cam.vw + H || by < -H * 0.2 || by - H > cam.vh) return;
  const s = sim.lud.pomnik;
  const faza = s?.faza ?? 'stoi';
  const stan = s?.stan ?? stanPekania(procentSkorupy(sim));
  const ruch = wolnoRuszac();
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // latarnia: czerwona poświata z piersi demona — widać z daleka, rośnie z pękaniem
  const tetno = tetnoRdzenia(teraz);
  if (faza === 'stoi' || faza === 'rozpada') {
    const moc = 0.1 + stan * 0.07 + (faza === 'rozpada' ? 0.2 : 0);
    const Rh = Math.max(80, H * 0.9);
    const hy = by - H * 0.45;
    const halo = ctx.createRadialGradient(bx, hy, 0, bx, hy, Rh);
    halo.addColorStop(0, `rgba(255,90,50,${moc + 0.08 * tetno})`);
    halo.addColorStop(0.4, `rgba(180,40,30,${moc * 0.45})`);
    halo.addColorStop(1, 'rgba(100,15,15,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = halo; ctx.fillRect(bx - Rh, hy - Rh, Rh * 2, Rh * 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  if (faza === 'stoi') {
    // pęknięcie przed chwilą: błysk, drgnięcie, pył i odłamki spadają u stóp
    const tp = sim.tick - (s?.stanT ?? -1e9);
    rysujPosag(ctx, bx, by, H, z, stan, teraz, tp >= 0 && tp < 200 ? 1 - tp / 200 : 0, ruch);
  } else if (faza === 'rozpada') {
    const k = Math.min(1, (sim.tick - (s?.od ?? 0)) / POMNIK.rozpad);
    const PEK = 0.45;
    const top = cokol(ctx, bx, by, H, k >= PEK, z);
    const drga = ruch ? Math.sin(teraz * 0.11) * H * 0.012 * gladko(k / PEK) : 0;
    if (k < PEK) {
      const pkt = posagZUbytkami(ctx, bx + drga, top, H, pozaPosagu(3, teraz, gladko(k / PEK)));
      for (const [w, strona] of [[pkt.wrF, 1], [pkt.wrB, -1]] as const) {
        lancuch(ctx, [bx + drga + w[0] * H, top + w[1] * H], [bx + strona * H * 0.29, top + H * 0.02], z);
      }
    } else {
      const kk = (k - PEK) / (1 - PEK);
      gruz(ctx, bx, by, H, gladko(kk * 1.6), teraz, z);
      // posąg raz na warstwę, a bryły tylko ją przykładają (30 brył × cały rysunek demona to za dużo na klatkę)
      const L = warstwaPosagu(ctx, H, pozaPosagu(3, teraz, 1 - kk));
      rozbite(ctx, bx, top - H * 0.35, H * 0.5, kk, 300, 1, () => { ctx.drawImage(L.c, 0, 0, L.cw, L.ch, bx - L.ox, top - L.oy, L.W, L.Hh); });
      // zerwane łańcuchy opadają
      lancuch(ctx, [bx + H * 0.15, top - H * 0.3], [bx + H * 0.29, top + H * 0.02], z, gladko(kk * 2));
      lancuch(ctx, [bx + H * 0.08, top - H * 0.3], [bx - H * 0.29, top + H * 0.02], z, gladko(kk * 2));
    }
  } else {
    // gruz po pomniku zostaje do końca gry; z niego wstaje demon (dalej rysuje go mapa jako bossa)
    cokol(ctx, bx, by, H, true, z);
    gruz(ctx, bx, by, H, 1, teraz, z);
    if (faza === 'wychodzi') wstajacyDemon(ctx, sim, cam, bx, by, H, teraz);
  }

  // podpis — póki kamera jest blisko
  if (z >= 9) {
    const rozm = Math.max(12, Math.min(18, z * 1.2));
    ctx.font = `italic ${rozm}px ${SERIF}`;
    ctx.textAlign = 'center';
    const proc = procentSkorupy(sim);
    const tekst = faza === 'stoi' ? (proc > 0 ? `Wielki Pomnik — modlitwa kruszy go: ${proc}%` : 'Wielki Pomnik — modlitwa pobożnych go skruszy')
      : faza === 'rozpada' ? 'Wielki Pomnik się rozpada' : faza === 'wychodzi' ? 'z gruzów wstaje demon' : 'gruz Wielkiego Pomnika';
    const ty = by + rozm * 1.6;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,7,6,0.85)'; ctx.strokeText(tekst, bx, ty);
    ctx.fillStyle = 'rgba(250,214,160,0.95)'; ctx.fillText(tekst, bx, ty);
  }
  ctx.restore();
}

/**
 * Posąg na cokole, zakuty w łańcuchy, w danym stanie pękania (`swieze` 0…1 — pęknięcie przed chwilą: drgnięcie,
 * pył i odłamki). Stopy cokołu w (bx, by). Także rycina w atlasie.
 */
export function rysujPosag(ctx: CanvasRenderingContext2D, bx: number, by: number, H: number, z: number, stan: number, teraz: number, swieze = 0, ruch = true): void {
  const drga = ruch && swieze > 0 ? Math.sin(teraz * 0.09) * H * 0.006 * swieze : 0;
  const top = cokol(ctx, bx, by, H, false, z);
  const pkt = posagZUbytkami(ctx, bx + drga, top, H, pozaPosagu(stan, teraz, swieze * 0.7));
  // kajdany: od nadgarstków do pierścieni w cokole
  for (const [w, strona] of [[pkt.wrF, 1], [pkt.wrB, -1]] as const) {
    lancuch(ctx, [bx + drga + w[0] * H, top + w[1] * H], [bx + strona * H * 0.29, top + H * 0.02], z);
  }
  if (swieze > 0) odlamki(ctx, bx, top, H, 1 - swieze, stan, z);
  if (stan >= 2) gruz(ctx, bx + H * 0.24, top, H * 0.35, 1, teraz, z);
}

/** Odłamki i pył po świeżym pęknięciu (`k` 0…1 od pęknięcia). */
function odlamki(ctx: CanvasRenderingContext2D, bx: number, top: number, H: number, k: number, stan: number, z: number): void {
  ctx.save();
  for (let i = 0; i < 10; i++) {
    const sx = bx + (los(i + stan * 31) - 0.4) * H * 0.4;
    const sy = top - H * (0.25 + los(i + stan * 17) * 0.35);
    const vx = (los(i + 7 + stan) - 0.5) * H * 0.1;
    const y = Math.min(top, sy + k * k * H * 0.9);
    const x = sx + vx * k;
    const r = Math.max(1.5, H * (0.006 + los(i + 3) * 0.01));
    ctx.fillStyle = `rgba(120,108,94,${1 - k * 0.6})`;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // obłok pyłu
  const r = H * (0.15 + k * 0.4);
  const g = ctx.createRadialGradient(bx, top - H * 0.3, 0, bx, top - H * 0.3, r);
  g.addColorStop(0, `rgba(170,150,130,${0.28 * (1 - k)})`); g.addColorStop(1, 'rgba(170,150,130,0)');
  ctx.fillStyle = g; ctx.fillRect(bx - r, top - H * 0.3 - r, r * 2, r * 2);
  ctx.restore();
  void z;
}

/** Faza „wychodzi”: z gruzu wstaje żywy demon — prostuje się, otwiera oczy, rozpościera skrzydła. */
function wstajacyDemon(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, bx: number, by: number, Hp: number, teraz: number): void {
  const s = sim.lud.pomnik!;
  rysujWstajacego(ctx, bx, by, Hp, wysokoscDemona(cam.zoom), Math.min(1, (sim.tick - s.od) / POMNIK.wyjscie), teraz);
}

/** Demon wstaje z gruzu (`k` 0…1): stopy w (bx, by), `Hp` — wysokość posągu (kopiec), `h` — demona. Także w atlasie. */
export function rysujWstajacego(ctx: CanvasRenderingContext2D, bx: number, by: number, Hp: number, h: number, k: number, teraz: number): void {
  const wzlot = gladko(k / 0.6);
  const poza: PozaDemona = {
    zywy: true,
    kuca: 1 - gladko((k - 0.25) / 0.5),
    skrzydla: k < 0.9 ? gladko((k - 0.62) / 0.22) : 1 - 0.65 * gladko((k - 0.9) / 0.1),
    oczy: gladko((k - 0.45) / 0.2),
    rysy: 0.4, zar: 0.5 + 0.3 * Math.sin(teraz * 0.01), ubytki: 0, cios: 0,
    glowa: k > 0.78 && k < 0.92 ? -0.35 * Math.sin(((k - 0.78) / 0.14) * Math.PI) : 0, oddech: 0,
  };
  ctx.save();
  // spod gruzu: dolna część ciała schowana za krawędzią kopca
  ctx.beginPath();
  ctx.rect(bx - Hp, by - Hp * 2, Hp * 2, Hp * 2 - Hp * 0.07 + (1 - wzlot) * 0);
  ctx.clip();
  ctx.translate(bx, by + (1 - wzlot) * h * 0.9);
  rysujDemona(ctx, h, poza);
  ctx.restore();
  // ryk (oczy rozbłyskują, odrzucona głowa): czerwony błysk wokół
  if (k > 0.78 && k < 0.95) {
    const a = Math.sin(((k - 0.78) / 0.17) * Math.PI);
    const r = h * 1.2;
    const g = ctx.createRadialGradient(bx, by - h * 0.7, 0, bx, by - h * 0.7, r);
    g.addColorStop(0, `rgba(255,110,60,${0.35 * a})`); g.addColorStop(1, 'rgba(255,60,30,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(bx - r, by - h * 0.7 - r, r * 2, r * 2); ctx.restore();
  }
  // osypujący się z niego gruz
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const t = ((k * 3 + los(i + 120)) % 1);
    const x = bx + (los(i + 130) - 0.5) * h * 0.4;
    const y = by - h * (0.2 + los(i + 140) * 0.5) * wzlot + t * t * h * 0.8;
    ctx.fillStyle = `rgba(110,98,86,${1 - t})`;
    const r = Math.max(1.5, h * 0.012);
    ctx.fillRect(x - r, Math.min(by - 2, y) - r, r * 2, r * 2);
  }
  ctx.restore();
}

/**
 * Żywy demon na mapie (boss) — wołane z render/straznicy.ts, stopami w (0, 0), zwrot już ustawiony.
 * Po ostatnim uderzeniu kona: złote światło rozsadza go od środka, pada na kolana i rozsypuje się w popiół.
 */
export function rysujDemonaBossa(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, h: number, czas: number): void {
  const s = sim.lud.pomnik;
  const oddech = 0.5 + 0.5 * Math.sin(czas * 0.003 + c.id);
  const ciosT = sim.tick - (c.ciosT ?? -1e9);
  if (s?.faza !== 'kona') {
    rysujDemona(ctx, h, {
      zywy: true, kuca: 0.08, skrzydla: 0.35 + 0.08 * oddech, oczy: 1, rysy: 0.4, zar: 0.35 + 0.25 * oddech,
      ubytki: 0, cios: ciosT >= 0 && ciosT < 40 ? ciosT / 40 : 0, glowa: 0, oddech,
    });
    return;
  }
  rysujKonajacego(ctx, h, Math.min(1, (sim.tick - s.od) / POMNIK.konanie), czas);
}

/** Demon kona po ostatnim uderzeniu (`k` 0…1), stopami w (0, 0). Także rycina w atlasie. */
export function rysujKonajacego(ctx: CanvasRenderingContext2D, h: number, k: number, czas: number): void {
  const PEK = 0.55;
  const poza = (kk: number): PozaDemona => ({
    zywy: true,
    // cios odrzuca go w tył, potem osuwa się na kolana
    kuca: 0.6 * gladko((kk - 0.1) / 0.4), glowa: kk < 0.12 ? -0.5 * Math.sin((kk / 0.12) * Math.PI / 2) : -0.5 + 0.9 * gladko((kk - 0.12) / 0.4),
    skrzydla: 0.35 + 0.5 * Math.sin(Math.min(1, kk / 0.15) * Math.PI) - 0.3 * gladko((kk - 0.2) / 0.3),
    oczy: 1 - gladko((kk - 0.3) / 0.25), rysy: gladko(kk / 0.45), zar: 0.6 + 0.4 * gladko(kk / PEK), swiatlo: true,
    ubytki: 0, cios: 0, oddech: 0,
  });
  const drga = wolnoRuszac() ? Math.sin(czas * 0.12) * h * 0.01 * gladko(k / PEK) : 0;
  if (k < PEK) {
    ctx.save(); ctx.translate(drga, 0); rysujDemona(ctx, h, poza(k)); ctx.restore();
  } else {
    const kk = (k - PEK) / (1 - PEK);
    rozbite(ctx, 0, -h * 0.5, h * 0.55, kk, 700, -0.5, () => rysujDemona(ctx, h, poza(k)));
  }
}

/**
 * Nad mrokiem i nad postaciami: błysk pęknięcia pomnika, błysk rozpadu z obłokiem pyłu, a przy konaniu demona —
 * błysk uderzenia, fala światła rozchodząca się po krypcie i popiół z iskrami, który wznosi się i gaśnie.
 */
export function rysujNadPomnikiem(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const s = sim.lud.pomnik;
  if (!s) return;
  const z = cam.zoom;
  const m = miejscePomnika(sim);
  const bx = cam.toScreenX(m.x), by = cam.toScreenY(m.y + 1);
  const H = wysokoscPosagu(z);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (s.faza === 'stoi') {
    const tp = sim.tick - s.stanT;
    if (tp >= 0 && tp < 60) {
      const a = 1 - tp / 60;
      const r = H * 0.6;
      const g = ctx.createRadialGradient(bx, by - H * 0.4, 0, bx, by - H * 0.4, r);
      g.addColorStop(0, `rgba(255,170,110,${0.5 * a})`); g.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = g; ctx.fillRect(bx - r, by - H * 0.4 - r, r * 2, r * 2);
    }
  } else if (s.faza === 'rozpada') {
    const k = (sim.tick - s.od) / POMNIK.rozpad;
    // błysk w chwili rozpadu i czerwone światło z wnętrza przed nim
    const a = k < 0.45 ? gladko(k / 0.45) * 0.35 : Math.max(0, 1 - (k - 0.45) / 0.25);
    const r = H * (0.6 + (k > 0.45 ? (k - 0.45) * 2 : 0));
    const g = ctx.createRadialGradient(bx, by - H * 0.35, 0, bx, by - H * 0.35, r);
    g.addColorStop(0, `rgba(255,200,150,${0.7 * a})`); g.addColorStop(0.5, `rgba(255,80,40,${0.3 * a})`); g.addColorStop(1, 'rgba(255,40,20,0)');
    ctx.fillStyle = g; ctx.fillRect(bx - r, by - H * 0.35 - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
    // obłok pyłu po rozpadzie
    if (k > 0.45) {
      const kk = (k - 0.45) / 0.55;
      const rr = H * (0.3 + kk * 0.6);
      const gg = ctx.createRadialGradient(bx, by - H * 0.2, 0, bx, by - H * 0.2, rr);
      gg.addColorStop(0, `rgba(150,135,118,${0.45 * (1 - kk)})`); gg.addColorStop(1, 'rgba(150,135,118,0)');
      ctx.fillStyle = gg; ctx.fillRect(bx - rr, by - H * 0.2 - rr, rr * 2, rr * 2);
    }
  } else if (s.faza === 'kona' && s.cios) {
    const k = (sim.tick - s.od) / POMNIK.konanie;
    const h = wysokoscDemona(z);
    const dx = cam.toScreenX(s.cios.x), dy = cam.toScreenY(s.cios.y + 1) - h * 0.55;
    // błysk uderzenia
    if (k < 0.12) {
      const a = 1 - k / 0.12, r = h * 0.9;
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
      g.addColorStop(0, `rgba(255,250,230,${0.9 * a})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.fillRect(dx - r, dy - r, r * 2, r * 2);
    }
    // światło z wnętrza rośnie, potem rozbłysk i fala po krypcie
    const PEK = 0.55;
    const swiat = k < PEK ? gladko(k / PEK) * 0.5 : Math.max(0, 1 - (k - PEK) / 0.3);
    if (swiat > 0) {
      const r = h * (0.8 + swiat);
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
      g.addColorStop(0, `rgba(255,236,180,${0.6 * swiat})`); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.fillRect(dx - r, dy - r, r * 2, r * 2);
    }
    if (k > PEK) {
      const kk = (k - PEK) / (1 - PEK);
      // światło zalewa kryptę: rosnąca, miękka łuna i snopy promieni rytych kreską
      // (dawniej cienka biała elipsa przez pół ekranu — jak z gry na telefon)
      const R = h * (1.2 + kk * 7), moc = 1 - kk * 0.65;
      const g2 = ctx.createRadialGradient(dx, dy, 0, dx, dy, R);
      g2.addColorStop(0, `rgba(255,236,190,${0.45 * moc})`);
      g2.addColorStop(0.5, `rgba(255,222,160,${0.2 * moc})`);
      g2.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = g2; ctx.fillRect(dx - R, dy - R, R * 2, R * 2);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,236,196,${0.3 * (1 - kk)})`;
      ctx.lineWidth = Math.max(1, h * 0.012);
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const kat = (i / 40) * Math.PI * 2 + los(i + 300) * 0.08;
        const r0 = h * 0.35, r1 = R * (0.45 + 0.4 * los(i + 310));
        ctx.moveTo(dx + Math.cos(kat) * r0, dy + Math.sin(kat) * r0);
        ctx.lineTo(dx + Math.cos(kat) * r1, dy + Math.sin(kat) * r1);
      }
      ctx.stroke();
      ctx.restore();
      // popiół i iskry wznoszą się i gasną
      for (let i = 0; i < 26; i++) {
        const t = Math.min(1, kk * (0.7 + los(i + 200) * 0.6));
        const x = dx + (los(i + 210) - 0.5) * h * 0.8 + (los(i + 220) - 0.5) * h * 0.6 * t;
        const y = dy + (los(i + 230) - 0.3) * h * 0.6 - t * h * (0.6 + los(i + 240));
        const r = Math.max(1, h * 0.012 * (1 - t * 0.5));
        ctx.fillStyle = i % 3 ? `rgba(255,190,110,${0.8 * (1 - t)})` : `rgba(180,170,160,${0.6 * (1 - t)})`;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    // cały ekran rozjaśnia się w chwili rozbłysku
    if (k > PEK - 0.02 && k < PEK + 0.12) {
      const a = Math.sin(((k - (PEK - 0.02)) / 0.14) * Math.PI) * 0.35;
      ctx.fillStyle = `rgba(255,240,210,${a})`;
      ctx.fillRect(0, 0, cam.vw, cam.vh);
    }
  }
  ctx.restore();
}
