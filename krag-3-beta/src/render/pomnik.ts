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
import { wzorGotowy } from './demon-wzor';
import { tetnoRdzenia } from './rdzen';
import { glif } from './tajemnica';
import { wolnoRuszac } from './nastroj';
import { rysujCerbera, pozaCerbera, type PozaCerbera, type PunktyCerbera } from './cerber';
import { pozaBossa } from './cerber-boss';

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
  // (wzór grafika z aureolą jest wyższy od dawnej ryciny — warstwa z zapasem w górę)
  const W = Math.ceil(H * 1.5), Hh = Math.ceil(H * 1.55), ox = W / 2, oy = H * 1.35;
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
  // wzór grafika ma własne ubytki na brzegu swojej sylwetki (render/demon-wzor.ts) — tu tylko dawna rycina
  g.globalAlpha = wzorGotowy() ? 0 : Math.min(1, poza.ubytki * 1.5);
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
  if (poza.ubytki <= 0.01 || typeof document === 'undefined' || wzorGotowy()) {
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
      // pieczęć drży, rysy płoną, łańcuchy się naprężają
      pieczec(ctx, bx + drga, top, H, z, 3, teraz, gladko(k / PEK), 1 + gladko(k / PEK));
    } else {
      const kk = (k - PEK) / (1 - PEK);
      otworZejscia(ctx, bx, top, H, teraz, gladko(kk * 2));
      gruz(ctx, bx, by, H, gladko(kk * 1.6), teraz, z);
      const L = warstwaPieczeci(ctx, H, z, teraz);
      rozbite(ctx, bx, top - H * 0.42, H * 0.5, kk, 300, 1, () => { ctx.drawImage(L.c, 0, 0, L.cw, L.ch, bx - L.ox, top - L.oy, L.W, L.Hh); });
      lancuch(ctx, [bx - H * 0.2, top - H * 0.6], [bx - H * 0.29, top + H * 0.02], z, gladko(kk * 2));
      lancuch(ctx, [bx + H * 0.2, top - H * 0.6], [bx + H * 0.29, top + H * 0.02], z, gladko(kk * 2));
    }
  } else {
    // Krąg Trzeci: pieczęć rozbita — otwarte zejście do kręgu czwartego; z góry zeskakuje Cerber
    const top = cokol(ctx, bx, by, H, true, z);
    otworZejscia(ctx, bx, top, H, teraz, 1);
    gruz(ctx, bx, by, H, 1, teraz, z);
    if (faza === 'wychodzi') wstajacyDemon(ctx, sim, cam, bx, by, H, teraz);
  }

  ctx.restore();
}

/**
 * Posąg na cokole, zakuty w łańcuchy, w danym stanie pękania (`swieze` 0…1 — pęknięcie przed chwilą: drgnięcie,
 * pył i odłamki). Stopy cokołu w (bx, by). Także rycina w atlasie.
 */
export function rysujPosag(ctx: CanvasRenderingContext2D, bx: number, by: number, H: number, z: number, stan: number, teraz: number, swieze = 0, ruch = true): void {
  // Krąg Trzeci: na dnie trzewi — zapieczętowane zejście do kręgu czwartego; modlitwa kruszy pieczęć
  const drga = ruch && swieze > 0 ? Math.sin(teraz * 0.09) * H * 0.006 * swieze : 0;
  const top = cokol(ctx, bx, by, H, false, z);
  pieczec(ctx, bx + drga, top, H, z, stan, ruch ? teraz : 0, swieze, 1);
  if (swieze > 0) odlamki(ctx, bx, top, H, 1 - swieze, stan, z);
  if (stan >= 2) gruz(ctx, bx + H * 0.24, top, H * 0.35, 1, teraz, z);
}

/**
 * Pieczęć zejścia: kamienne koło stojące na cokole, w nim wyryty trójgłowy pies, dookoła runy, na krzyż dwa łańcuchy.
 * Rysy (`stan` 0…3) świecą czerwono — spod spodu bije łuna kręgu czwartego. `napiecie` > 1 — łańcuchy pękają.
 */
function pieczec(ctx: CanvasRenderingContext2D, bx: number, top: number, H: number, z: number, stan: number, teraz: number, swieze: number, napiecie: number): void {
  const R = H * 0.4, cx = bx, cy = top - R - H * 0.02;
  const t = teraz / 1000;
  ctx.save();
  ctx.lineJoin = 'round';
  // koło
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R);
  g.addColorStop(0, 'rgb(128,126,116)'); g.addColorStop(1, 'rgb(58,56,50)');
  ctx.fillStyle = g; ctx.strokeStyle = 'rgba(14,10,8,0.95)'; ctx.lineWidth = Math.max(1.5, H * 0.012);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgb(74,72,64)';
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // runy w pierścieniu
  ctx.strokeStyle = 'rgba(20,14,10,0.7)'; ctx.lineWidth = Math.max(1, H * 0.006);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, r1 = R * 0.83, r2 = R * 0.95;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a + 0.08 * (los(i) - 0.5)) * r2, cy + Math.sin(a + 0.1) * r2);
    if (los(i * 3) < 0.5) ctx.lineTo(cx + Math.cos(a + 0.12) * (r1 + r2) / 2, cy + Math.sin(a + 0.12) * (r1 + r2) / 2);
    ctx.stroke();
  }
  // płaskorzeźba: trójgłowy pies (oczy żarzą się z kolejnymi rysami)
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.74, 0, Math.PI * 2); ctx.clip();
  ctx.globalAlpha = 0.85;
  ctx.translate(cx - R * 0.12, cy + R * 0.5);
  const p = pozaCerbera();
  p.czas = teraz; p.kamien = 1; p.lezy = 0;
  p.glowy.forEach((gl, i) => { gl.oczy = stan > i ? 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(t * 4 + i)) : 0; gl.paszcza = 0.3; gl.pochyl = -0.2; });
  rysujCerbera(ctx, R * 1.15, p);
  ctx.restore();
  // rysy — świecą czerwono od spodu
  if (stan > 0 || swieze > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = stan * 4 + 2;
    for (let i = 0; i < n; i++) {
      const a = los(i * 13 + 5) * Math.PI * 2;
      let x = cx + Math.cos(a) * R * 0.1, y = cy + Math.sin(a) * R * 0.1;
      ctx.strokeStyle = `rgba(255,${80 + 40 * Math.sin(t * 3 + i)},40,${0.35 + 0.15 * stan + 0.3 * swieze})`;
      ctx.lineWidth = Math.max(1, H * (0.006 + 0.003 * stan));
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        const d = R * (0.18 + 0.17 * j);
        x = cx + Math.cos(a + (los(i * 7 + j) - 0.5) * 0.5) * d; y = cy + Math.sin(a + (los(i * 11 + j) - 0.5) * 0.5) * d;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    if (stan >= 3) {
      const lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
      lg.addColorStop(0, `rgba(255,80,30,${0.18 + 0.08 * Math.sin(t * 5)})`); lg.addColorStop(1, 'rgba(255,40,10,0)');
      ctx.fillStyle = lg; ctx.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
    }
    ctx.restore();
  }
  // łańcuchy na krzyż, uwiązane do cokołu
  const dr = napiecie > 1 ? Math.sin(t * 40) * H * 0.004 * (napiecie - 1) : 0;
  lancuch(ctx, [cx - R * 0.95, cy - R * 0.55 + dr], [bx + H * 0.29, top + H * 0.02], z);
  lancuch(ctx, [cx + R * 0.95, cy - R * 0.55 - dr], [bx - H * 0.29, top + H * 0.02], z);
  ctx.restore();
}

let warstwaP: HTMLCanvasElement | null = null;
/** Pieczęć na osobnej warstwie — rozpad kroi ją na bryły. */
function warstwaPieczeci(ctx: CanvasRenderingContext2D, H: number, z: number, teraz: number): { c: HTMLCanvasElement; cw: number; ch: number; W: number; Hh: number; ox: number; oy: number } {
  const m = ctx.getTransform(), dpr = Math.max(1, Math.hypot(m.a, m.b));
  const W = Math.ceil(H * 1.2), Hh = Math.ceil(H * 1.0), ox = W / 2, oy = H * 0.95;
  warstwaP ??= document.createElement('canvas');
  const cw = Math.ceil(W * dpr), ch = Math.ceil(Hh * dpr);
  if (warstwaP.width < cw || warstwaP.height < ch) { warstwaP.width = cw; warstwaP.height = ch; }
  const g = warstwaP.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, warstwaP.width, warstwaP.height);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  pieczec(g, ox, oy, H, z, 3, teraz, 1, 1);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { c: warstwaP, cw, ch, W, Hh, ox, oy };
}

/** Otwarte zejście do kręgu czwartego w miejscu pieczęci: czarna studnia, z dołu czerwona łuna i iskry. */
function otworZejscia(ctx: CanvasRenderingContext2D, bx: number, top: number, H: number, teraz: number, k: number): void {
  if (k <= 0) return;
  const t = teraz / 1000;
  const R = H * 0.36, cy = top - R;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgb(6,4,4)';
  ctx.beginPath(); ctx.ellipse(bx, cy, R, R * 1.05, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(bx, cy + R * 0.6, 0, bx, cy + R * 0.6, R * 1.3);
  g.addColorStop(0, `rgba(220,70,30,${0.55 + 0.1 * Math.sin(t * 3)})`); g.addColorStop(1, 'rgba(160,30,10,0)');
  ctx.fillStyle = g; ctx.fillRect(bx - R * 1.4, cy - R * 1.2, R * 2.8, R * 2.6);
  for (let i = 0; i < 10; i++) {
    const f = (t * 0.4 + los(i)) % 1;
    ctx.fillStyle = `rgba(255,${150 - f * 80},60,${0.8 * (1 - f)})`;
    ctx.fillRect(bx + (los(i * 3) - 0.5) * R * 1.4, cy + R * 0.8 - f * R * 2.4, 2, 2);
  }
  ctx.restore();
}

/** Kamienny Cerber na cokole w danym stanie pękania: oczy budzących się głów, rysy. */
function posagCerbera(stan: number, teraz: number, swieze: number, ruch: boolean): PozaCerbera {
  const p = pozaCerbera();
  p.czas = ruch ? teraz : 0; p.kamien = 1; p.lezy = 1;
  const tetno = 0.5 + 0.5 * Math.sin(teraz * 0.004);
  p.glowy.forEach((g, i) => { g.oczy = stan > i ? 0.45 + 0.45 * tetno : 0; g.paszcza = 0.04 + (stan > i ? 0.1 : 0); g.pochyl = 0.18; });
  p.rany = Math.min(1, stan * 0.28 + swieze * 0.2);
  return p;
}

/** Cerber (stopami w x, top) — przesunięty tak, żeby cielsko leżało na środku cokołu; punkty w układzie wołającego. */
function cerberNaCokole(ctx: CanvasRenderingContext2D, x: number, top: number, H: number, p: PozaCerbera): PunktyCerbera {
  const ox = x - H * 0.15;
  ctx.save(); ctx.translate(ox, top);
  const pk = rysujCerbera(ctx, H * 0.85, p);
  ctx.restore();
  const t = (q: [number, number]): [number, number] => [q[0] + ox, q[1] + top];
  return { obroza: t(pk.obroza), brzuch: t(pk.brzuch), paszcze: [t(pk.paszcze[0]), t(pk.paszcze[1]), t(pk.paszcze[2])] };
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
  // Krąg Trzeci: pieczęć pękła — Cerber zeskakuje z góry za potępionymi, ląduje, przysiada i wyje na trzy gardła
  const SKOK = 0.4;
  const p = pozaCerbera();
  p.czas = teraz;
  let dy = 0;
  if (k < SKOK) {
    const f = k / SKOK;
    dy = -h * 5 * (1 - f * f);
    p.deba = 0.25; p.krok = 0;
    p.glowy.forEach((g) => { g.pochyl = 0.4; g.paszcza = 0.6; });
  } else {
    p.przysiad = Math.max(0, 1 - (k - SKOK) / 0.2);
    if (k > 0.62 && k < 0.94) {
      const w = Math.sin(((k - 0.62) / 0.32) * Math.PI);
      p.glowy.forEach((g, i) => { g.pochyl = -0.85 * w + 0.05 * i; g.paszcza = w; });
      p.deba = 0.25 * w;
    }
  }
  ctx.save();
  ctx.translate(bx - h * 0.15, by + dy);
  rysujCerbera(ctx, h, p);
  ctx.restore();
  // lądowanie: fala pyłu i odłamki
  if (k >= SKOK && k < SKOK + 0.2) {
    const f = (k - SKOK) / 0.2;
    ctx.save();
    ctx.strokeStyle = `rgba(170,150,130,${0.6 * (1 - f)})`; ctx.lineWidth = Math.max(2, h * 0.02);
    ctx.beginPath(); ctx.ellipse(bx, by, h * (0.4 + f * 1.4), h * (0.06 + f * 0.15), 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = Math.PI + los(i + 50) * Math.PI;
      const x = bx + Math.cos(a) * h * 1.2 * f, y = by + Math.sin(a) * h * 0.8 * f + f * f * h * 0.6;
      ctx.fillStyle = `rgba(110,98,86,${1 - f})`;
      ctx.fillRect(x - 2, Math.min(by, y) - 2, 4, 4);
    }
    ctx.restore();
  }
  // wycie: czerwony błysk
  if (k > 0.62 && k < 0.94) {
    const a = Math.sin(((k - 0.62) / 0.32) * Math.PI);
    const r = h * 1.3;
    const g = ctx.createRadialGradient(bx + h * 0.4, by - h * 0.8, 0, bx + h * 0.4, by - h * 0.8, r);
    g.addColorStop(0, `rgba(255,110,60,${0.3 * a})`); g.addColorStop(1, 'rgba(255,60,30,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(bx - r, by - h * 0.8 - r, r * 2.6, r * 2); ctx.restore();
  }
  void Hp;
}

/**
 * Żywy demon na mapie (boss) — wołane z render/straznicy.ts, stopami w (0, 0), zwrot już ustawiony.
 * Po ostatnim uderzeniu kona: złote światło rozsadza go od środka, pada na kolana i rozsypuje się w popiół.
 */
export function rysujDemonaBossa(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, h: number, czas: number): void {
  // Krąg Trzeci: boss to Cerber
  const s = sim.lud.pomnik;
  if (s?.faza === 'kona') { rysujKonajacego(ctx, h, Math.min(1, (sim.tick - s.od) / POMNIK.konanie), czas, c.glowyOdciete?.map((o) => o.nr)); return; }
  rysujCerbera(ctx, h, pozaBossa(sim, c, czas));
}

/** Cerber kona po ostatnim uderzeniu (`k` 0…1), stopami w (0, 0): złote pęknięcia, pada, gasną oczy, rozpada się. */
export function rysujKonajacego(ctx: CanvasRenderingContext2D, h: number, k: number, czas: number, odciete?: number[]): void {
  // Krąg Trzeci (16.11): Cerber z krwi i mięsa — nie pęka od światła: wyje, wali się na przednie łapy, pada w kałużę
  // krwi, łby opadają, ślepia gasną, z paszcz i kikutów leje się krew
  const p = pozaCerbera();
  p.czas = czas; p.krew = 1;
  if (odciete?.length) { p.odciete = odciete; p.odcieteMs = odciete.map(() => 6000 + k * 20000); }
  const wyje = k < 0.2 ? Math.sin((k / 0.2) * Math.PI) : 0;
  p.odrzut = k < 0.12 ? Math.sin((k / 0.12) * Math.PI) * 0.7 : 0;
  p.kleka = gladko((k - 0.1) / 0.12) * (1 - gladko((k - 0.3) / 0.1));
  p.lezy = gladko((k - 0.28) / 0.15);
  p.glowy.forEach((g, i) => {
    g.oczy = 1 - gladko((k - 0.35 - i * 0.06) / 0.25);
    g.pochyl = -0.7 * wyje + 0.85 * gladko((k - 0.25) / 0.3) + 0.08 * Math.sin(i * 2.1);
    g.paszcza = k < 0.2 ? 0.6 + 0.4 * wyje : 0.45 - 0.1 * i;
  });
  // kałuża krwi rośnie spod piersi i paszcz
  const kal = gladko((k - 0.22) / 0.78);
  if (kal > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(64,3,2,0.92)';
    ctx.beginPath(); ctx.ellipse(h * 0.08, 0, h * (0.15 + 0.8 * kal), h * (0.025 + 0.06 * kal), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,26,20,0.22)';
    ctx.beginPath(); ctx.ellipse(h * 0.02, -h * 0.004, h * 0.5 * kal, h * 0.012 * kal, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // drgawki gasną
  const drga = wolnoRuszac() ? Math.sin(czas * 0.09) * h * 0.006 * (1 - gladko((k - 0.3) / 0.5)) : 0;
  ctx.save(); ctx.translate(drga, 0);
  const pk = rysujCerbera(ctx, h, p);
  // krew leje się z paszcz strugami do kałuży
  if (k > 0.15) {
    ctx.strokeStyle = 'rgba(96,5,3,0.8)'; ctx.lineCap = 'round';
    pk.paszcze.forEach(([x, y], i) => {
      if (odciete?.includes(i)) return;
      ctx.lineWidth = Math.max(1, h * 0.008);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + h * 0.02, (y + 0) / 2, x + h * 0.01, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(110,6,4,0.9)';
      for (let j = 0; j < 3; j++) { const f = ((czas / 500) + j * 0.33 + i * 0.2) % 1; ctx.beginPath(); ctx.ellipse(x + h * 0.01, y + (0 - y) * f, h * 0.005, h * 0.01, 0, 0, Math.PI * 2); ctx.fill(); }
    });
  }
  ctx.restore();
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
    // Krąg Trzeci (16.11): śmierć psa piekła — czerwona mgła krwi po ostatnim ciosie, żadnego świętego światła
    ctx.globalCompositeOperation = 'source-over';
    if (k < 0.25) {
      const a = 1 - k / 0.25, r = h * (0.5 + k * 2);
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
      g.addColorStop(0, `rgba(110,4,2,${0.7 * a})`); g.addColorStop(1, 'rgba(80,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(dx - r, dy - r, r * 2, r * 2);
    }
    ctx.restore();
    return;
  }
  ctx.restore();
}

// Krąg Trzeci: dawny posąg demona (Alpha 1) zostaje w kodzie na wzór — rysuje się Cerber (render/cerber.ts)
void [posagZUbytkami, pozaPosagu, posagCerbera, cerberNaCokole];
