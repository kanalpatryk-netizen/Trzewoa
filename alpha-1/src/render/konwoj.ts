import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { SURFACE_Y, type World } from '../sim/world';
import { SWIAT } from '../nastawy/swiat';
import { WIADRO, KONWOJ as KW } from '../nastawy/wiadro';
import { wiadra } from '../sim/wiadro';
import { migotLampy } from './fresk';
import { wolnoRuszac } from './nastroj';

/**
 * KONWÓJ Z JEDZENIEM (Alpha 0.2) — skąd się bierze wiadro. Nad szybem wiadra stoi drewniany kozioł z bloczkiem,
 * przez który biegnie lina. Przed każdą dostawą z prawej, zza brzegu góry, przyjeżdża wóz z parą koni: kłusem po
 * grzbiecie, z latarnią na tyczce, woźnica w kapeluszu na koźle, z tyłu na ładunku pomocnik w kapturze. Przy koźle
 * wóz zawraca, pomocnik zeskakuje i spuszcza wiadro na linie, ręka za ręką, póki wiadro zjeżdża — a gdy wiadro jeszcze
 * stoi na dnie, zsyła do niego po linie worek. Potem wskakuje na wóz i konwój odjeżdża tą samą drogą. Gdy konwoju nie
 * ma, wolny koniec liny jest uwiązany do nogi kozła, a puste wiadro wisi pod bloczkiem.
 * Wszystko liczy się z tiku gry i z tego, kiedy wypada następna dostawa (sim.lud.wiadra.nastepne) — pauza, tempo
 * i wczytany zapis zgadzają się same. Tylko rysunek: symulacja wiadra o konwoju nie wie. Nastawy: KONWOJ w
 * src/nastawy/wiadro.ts. Kamień, drewno i konie — przed mrokiem; płomień latarni — nad mrokiem (mrok wycina wokół niej).
 */

const TUSZ = 'rgba(20,12,8,0.95)';
/** Długość konwoju (kafle): od tyłu wozu do pysków koni. */
const DL = 7.6;
/** Postój (tiki): zapowiedź i najdłuższy zjazd wiadra, z zapasem — tyle pomocnik spuszcza linę. */
const postoj = (): number => WIADRO.zapowiedz + WIADRO.zjazdMaks + 100;
/** Przyjazd i odjazd trwają po tyle (tiki) — razem z postojem i zawracaniem mieszczą się między dostawami. */
const jazda = (): number => Math.max(240, Math.floor((WIADRO.co - postoj() - KW.zawracanie) / 2) - 10);

/** Tani skrót liczby — stałe kształty (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/** Kolumna liny wiadra (środek szybu) i bloczek na kozle — kafle; null, gdy góra nie ma szybu wiadra. */
export function bloczekWiadra(w: World): { x: number; y: number } | null {
  if (!KW.wlaczony || !SWIAT.warstwy.wlaczone || w.salaOltarza.x1 < 0) return null;
  return { x: w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer / 2, y: SURFACE_Y - KW.koziol.wys };
}

/** Równy plac przy koźle, na którym staje wóz (x kafli) — tu grzbiet schodzi do powierzchni. */
export function placKonwoju(w: World): { x0: number; x1: number } | null {
  const b = bloczekWiadra(w);
  return b ? { x0: b.x - KW.koziol.rozstaw - 0.5, x1: b.x + KW.postoj + DL + 1 } : null;
}

type Faza = 'przyjazd' | 'zawraca' | 'postoj' | 'odjazd';
/** Gdzie jest konwój: środek (x kafli), zwrot (−1 w lewo … 1 w prawo, w zawracaniu pomiędzy), faza i jej postęp. */
interface Stan { faza: Faza; xc: number; zwrot: number; q: number; t: number; droga: number; tempo: number; postoj: number }

/** Przebyta część drogi przy przyjeździe: równy kłus, na ostatniej piątej części hamuje. */
function hamowanie(q: number): number {
  return q <= 0.8 ? q / 0.9 : (0.8 + (q - 0.8) - ((q - 0.8) ** 2) / 0.4) / 0.9;
}

function stan(sim: Sim, tick: number): Stan | null {
  const b = bloczekWiadra(sim.world);
  if (!b) return null;
  const N = sim.lud.wiadra?.nastepne ?? WIADRO.pierwsze;
  const xStoi = b.x + KW.postoj + DL / 2, xStart = KW.start + DL / 2, dlugosc = xStart - xStoi;
  const Z = KW.zawracanie, d = N - tick, JAZDA = jazda(), POSTOJ = postoj();
  if (d <= JAZDA + Z) {
    if (d > Z) {
      const q = 1 - (d - Z) / JAZDA, f = hamowanie(q);
      return { faza: 'przyjazd', xc: xStart - dlugosc * f, zwrot: -1, q, t: 0, droga: dlugosc * f, tempo: q < 0.8 ? 1 : (1 - q) / 0.2, postoj: xStoi };
    }
    const q = 1 - Math.max(0, d) / Z;
    return { faza: 'zawraca', xc: xStoi, zwrot: -Math.cos(Math.PI * q), q, t: 0, droga: dlugosc + q * 1.4, tempo: 0.45 * Math.sin(Math.PI * q), postoj: xStoi };
  }
  const t = tick - (N - WIADRO.co);
  if (t >= 0 && t < POSTOJ) return { faza: 'postoj', xc: xStoi, zwrot: 1, q: t / POSTOJ, t, droga: 0, tempo: 0, postoj: xStoi };
  if (t >= POSTOJ && t < POSTOJ + JAZDA) {
    const q = (t - POSTOJ) / JAZDA, f = 1 - hamowanie(1 - q);
    return { faza: 'odjazd', xc: xStoi + dlugosc * f, zwrot: 1, q, t, droga: dlugosc * f, tempo: q > 0.2 ? 1 : q / 0.2, postoj: xStoi };
  }
  return null;
}

/** Latarnia na tyczce wozu (kafle) — mrok wycina wokół niej światło; null, gdy konwoju nie ma. */
export function latarniaKonwoju(sim: Sim, grunt: Grunt): { x: number; y: number } | null {
  const s = stan(sim, sim.tick);
  if (!s) return null;
  const kier = s.zwrot >= 0 ? 1 : -1, y0 = grunt(s.xc);
  const U = ukladWozu((xl) => grunt(s.xc + kier * xl) - y0);
  const [lx, ly] = U.zWozu(U.latarnia[0], U.latarnia[1]);
  return { x: s.xc + s.zwrot * lx, y: y0 + ly };
}

/** Pomocnik: 0 — siedzi na wozie, 1 — stoi przy koźle (zeskok i powrót płynnie). */
function naZiemi(s: Stan): number {
  if (s.faza !== 'postoj') return 0;
  return gladko(s.t / KW.zeskok) * (1 - gladko((s.t - (postoj() - KW.zeskok)) / KW.zeskok));
}

/** Ziemia pod x (y kafli): powierzchnia minus garb grzbietu (render/grzbiet.ts). */
export type Grunt = (x: number) => number;

/**
 * Kozioł, lina do pomocnika (albo uwiązana do nogi kozła), worek zsyłany po linie, wóz, konie i ludzie — przed mrokiem.
 * `grunt` — wysokość ziemi z ryciny (garby grzbietu), żeby koła i kopyta stały na ziemi.
 */
export function rysujKonwoj(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, grunt: Grunt): void {
  const w = sim.world;
  const b = bloczekWiadra(w);
  if (!b) return;
  const z = cam.zoom;
  const s = stan(sim, sim.tick);
  const ruch = wolnoRuszac();
  const ziemia = SURFACE_Y;
  // w kadrze: kozioł albo konwój
  const widacKozla = cam.toScreenX(b.x + 2) > 0 && cam.toScreenX(b.x - 2) < cam.vw && cam.toScreenY(b.y - 1) < cam.vh && cam.toScreenY(ziemia) > 0;
  const widacWozu = !!s && cam.toScreenX(s.xc + DL / 2 + 1) > 0 && cam.toScreenX(s.xc - DL / 2 - 1) < cam.vw && cam.toScreenY(ziemia - 3.2) < cam.vh && cam.toScreenY(ziemia + 0.5) > 0;
  if (!widacKozla && !widacWozu) return;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const X = (x: number) => cam.toScreenX(x), Y = (y: number) => cam.toScreenY(y);
  const rk = KW.koziol.rozstaw, bx = b.x + 0.22, by = b.y;          // bloczek: lina do szybu schodzi po jego lewej
  const pomoc = s ? naZiemi(s) : 0;
  // gdzie stoi pomocnik i gdzie trzyma linę (kafle)
  const px = s ? s.postoj - DL / 2 - 0.5 : 0;
  const jedzie = wiadra(sim).find((wd) => wd.szyb && (wd.faza === 'zjezdza' || wd.faza === 'odjezdza'));
  const ciagnie = pomoc > 0.95 && !!jedzie && ruch;
  const reka = ciagnie ? Math.sin(teraz * 0.009) : 0;
  const dlon = { x: px - 0.32, y: ziemia - 1.28 - 0.1 * reka };

  if (widacKozla) {
    // lina: od bloczka do dłoni pomocnika (i zwój u jego stóp) albo uwiązana do nogi kozła
    const knaga = { x: b.x + rk * 0.62, y: ziemia - 1.35 };
    const gr = Math.max(1, z * 0.08);
    const lina = (x1: number, y1: number, x2: number, y2: number, ugiecie: number): void => {
      ctx.strokeStyle = 'rgba(20,12,8,0.85)'; ctx.lineWidth = gr + 1.2;
      ctx.beginPath(); ctx.moveTo(X(x1), Y(y1)); ctx.quadraticCurveTo(X((x1 + x2) / 2 + ugiecie * 0.3), Y((y1 + y2) / 2 + ugiecie), X(x2), Y(y2)); ctx.stroke();
      ctx.strokeStyle = 'rgba(176,140,92,0.95)'; ctx.lineWidth = gr; ctx.stroke();
    };
    if (pomoc > 0.5 && s) {
      lina(bx + 0.2, by, dlon.x, dlon.y, 0.15);
      lina(dlon.x, dlon.y, px + 0.25, ziemia - 0.12, 0.25);
      zwoj(ctx, X(px + 0.45), Y(ziemia), z);
    } else {
      lina(bx + 0.2, by, knaga.x, knaga.y, 0.1);
      ctx.strokeStyle = 'rgba(150,114,70,1)'; ctx.lineWidth = Math.max(0.8, z * 0.05);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(X(knaga.x), Y(knaga.y + 0.08 + i * 0.09), z * 0.12, z * 0.05, 0, 0, Math.PI * 2); ctx.stroke(); }
      lina(knaga.x, knaga.y + 0.3, knaga.x + 0.15, knaga.y + 0.85, 0.1);
    }
    koziol(ctx, X, Y, z, b.x, by, rk, ziemia, bx);
    // worek po linie: gdy wiadro jeszcze stoi na dnie, dostawa zjeżdża do niego na haku
    const wd = wiadra(sim).find((q) => q.szyb && q.faza === 'stoi');
    if (s && s.faza === 'postoj' && wd && wd.od < sim.tick - s.t) {
      const f = (s.t - KW.worek.od) / KW.worek.trwa;
      if (f > 0 && f < 1) {
        const yk = (wd.y + 1) - 1.6 * 0.95;
        const y = by + 0.4 + (yk - by - 0.6) * gladko(f);
        worek(ctx, X(b.x), Y(y), z, ruch ? Math.sin(teraz * 0.004) * 0.08 : 0);
      }
    }
  }
  if (s && widacWozu) woz(ctx, cam, teraz, s, grunt, pomoc, reka, ruch);
  ctx.restore();
}

/** Kozioł z dwóch bali, z poprzeczką, na szczycie bloczek; na prawej nodze knaga. */
function koziol(ctx: CanvasRenderingContext2D, X: (x: number) => number, Y: (y: number) => number, z: number, x: number, by: number, rk: number, ziemia: number, bx: number): void {
  const szczyt = by - 0.18;
  const bal = (x0: number, y0: number, x1: number, y1: number, gr: number): void => {
    const dx = X(x1) - X(x0), dy = Y(y1) - Y(y0), d = Math.hypot(dx, dy) || 1, nx = (-dy / d) * gr * z / 2, ny = (dx / d) * gr * z / 2;
    ctx.beginPath();
    ctx.moveTo(X(x0) + nx, Y(y0) + ny); ctx.lineTo(X(x1) + nx, Y(y1) + ny); ctx.lineTo(X(x1) - nx, Y(y1) - ny); ctx.lineTo(X(x0) - nx, Y(y0) - ny);
    ctx.closePath();
    ctx.fillStyle = 'rgba(96,68,42,1)'; ctx.fill();
    ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.7, z * 0.045); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,112,72,0.55)'; ctx.lineWidth = Math.max(0.5, z * 0.025);
    ctx.beginPath(); ctx.moveTo(X(x0) + nx * 0.4, Y(y0) + ny * 0.4); ctx.lineTo(X(x1) + nx * 0.4, Y(y1) + ny * 0.4); ctx.stroke();
  };
  bal(x - rk, ziemia, x + 0.05, szczyt, 0.2);
  bal(x + rk, ziemia, x + 0.15, szczyt, 0.2);
  bal(x - rk * 0.62, ziemia - 1.5, x + rk * 0.62, ziemia - 1.5, 0.14);
  // bloczek: drewniane koło w żelaznej oprawie
  ctx.fillStyle = 'rgba(70,52,36,1)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.7, z * 0.045);
  ctx.beginPath(); ctx.rect(X(bx - 0.12), Y(szczyt - 0.06), z * 0.24, z * 0.3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(X(bx), Y(by), z * 0.22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(110,80,50,1)'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(X(bx), Y(by), z * 0.07, 0, Math.PI * 2); ctx.fillStyle = 'rgba(52,50,52,1)'; ctx.fill();
}

/** Zwój liny na ziemi. */
function zwoj(ctx: CanvasRenderingContext2D, x: number, y: number, z: number): void {
  ctx.strokeStyle = 'rgba(20,12,8,0.85)'; ctx.lineWidth = Math.max(1.4, z * 0.1);
  for (const pass of [0, 1]) {
    if (pass) { ctx.strokeStyle = 'rgba(176,140,92,0.95)'; ctx.lineWidth = Math.max(0.8, z * 0.06); }
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + i * z * 0.04, y - z * 0.05 - i * z * 0.06, z * (0.3 - i * 0.05), z * 0.07, 0.05, 0, Math.PI * 2); ctx.stroke(); }
  }
}

/** Worek na haku, zjeżdżający po linie. */
function worek(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, kolys: number): void {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(kolys); ctx.scale(z * 1.3, z * 1.3);
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = 'rgba(58,56,56,1)';
  ctx.beginPath(); ctx.arc(0, -0.12, 0.08, Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -0.05); ctx.lineTo(0, 0.08); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.08, 0.1); ctx.quadraticCurveTo(-0.36, 0.25, -0.3, 0.62); ctx.quadraticCurveTo(0, 0.74, 0.3, 0.62); ctx.quadraticCurveTo(0.36, 0.25, 0.08, 0.1);
  ctx.closePath();
  const g = ctx.createLinearGradient(-0.3, 0, 0.3, 0);
  g.addColorStop(0, 'rgba(92,68,42,1)'); g.addColorStop(0.45, 'rgba(132,100,62,1)'); g.addColorStop(1, 'rgba(78,56,34,1)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.045; ctx.stroke();
  ctx.strokeStyle = 'rgba(96,74,48,0.8)'; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(-0.12, 0.3); ctx.quadraticCurveTo(0, 0.36, 0.12, 0.3); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- wóz, konie, ludzie

const KON_BLISKI = { siersc: [116, 76, 46], ciemne: [46, 30, 20], jasne: [168, 128, 88] };
const KON_DALSZY = { siersc: [86, 60, 42], ciemne: [36, 24, 18], jasne: [124, 94, 70] };
const rgb = (c: number[], a = 1): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Układ wozu w układzie konwoju: koła, skrzynia, przechył na garbach i przeliczenie punktu skrzyni na układ konwoju. */
function ukladWozu(pod: (xl: number) => number) {
  const ogon = -DL / 2;
  const kolaT = ogon + 0.95, kolaP = ogon + 3.15, rT = 0.62, rP = 0.5;
  const yT = pod(kolaT) - rT;
  const kat = Math.atan2(pod(kolaP) - pod(kolaT), kolaP - kolaT);
  const dno = yT - 0.18, gora = dno - 0.64;
  const c = Math.cos(kat), sn = Math.sin(kat);
  /** Punkt skrzyni (układ wozu przed obrotem) w układzie konwoju. */
  const zWozu = (x: number, y: number): [number, number] => [kolaT + (x - kolaT) * c - (y - yT) * sn, yT + (x - kolaT) * sn + (y - yT) * c];
  return { ogon, kolaT, kolaP, rT, rP, yT, kat, dno, gora, zWozu, latarnia: [ogon + 4.1, gora - 1.04] as [number, number] };
}

/**
 * Wóz z parą koni w układzie konwoju: (0, 0) — środek konwoju na ziemi, oś x ku koniom, y w dół, kafle;
 * zwrot odbija rysunek w poziomie (w zawracaniu ściska go przez zero — wóz obraca się w głąb).
 */
function woz(ctx: CanvasRenderingContext2D, cam: Camera, teraz: number, s: Stan, grunt: Grunt, pomoc: number, reka: number, ruch: boolean): void {
  const z = cam.zoom;
  const kier = s.zwrot >= 0 ? 1 : -1;
  // ziemia pod punktem układu (kafle względem ziemi pod środkiem)
  const y0 = grunt(s.xc);
  const pod = (xl: number) => grunt(s.xc + kier * xl) - y0;
  const glebia = s.faza === 'zawraca' ? Math.sin(Math.PI * s.q) : 0;
  ctx.save();
  ctx.translate(cam.toScreenX(s.xc), cam.toScreenY(y0) - glebia * z * 0.25);
  // w połowie zawracania wóz widać od czoła — wąski, ale nie kreską
  ctx.scale(z * kier * Math.max(0.14, Math.abs(s.zwrot)), z * (1 - 0.06 * glebia));
  const lw = 1 / z;
  const U = ukladWozu(pod);
  const { ogon, kolaT, kolaP, rT, rP, yT, kat, dno, gora } = U;
  // cień pod konwojem
  ctx.fillStyle = 'rgba(10,6,4,0.35)';
  ctx.beginPath(); ctx.ellipse(-0.3, pod(-0.3) + 0.02, DL * 0.52, 0.12, 0, 0, Math.PI * 2); ctx.fill();

  // nogi i koła idą z przebytą drogą — także przy ograniczonym ruchu (wóz nie może sunąć na sztywnych nogach)
  const krok = s.droga;
  const tempo = s.tempo;
  const kon = 2.15, konD = 2.45;           // środki koni (bliski i dalszy)
  const faza = (krok / 2.3) * Math.PI * 2;
  const stoja = s.faza === 'postoj' && ruch;

  // dalszy koń, za nim dyszel; potem wóz i bliższy koń
  ctx.save();
  ctx.translate(konD, pod(konD) - 0.13);
  kon_(ctx, faza + 0.6, tempo, teraz, lw, KON_DALSZY, (dx) => pod(konD + dx) - pod(konD), stoja, 1);
  ctx.restore();
  const osP = U.zWozu(kolaP, yT + rT - rP);
  ctx.strokeStyle = 'rgba(60,42,26,1)'; ctx.lineWidth = 0.1;
  ctx.beginPath(); ctx.moveTo(osP[0], osP[1]); ctx.lineTo(kon + 0.62, pod(kon) - 1.18); ctx.stroke();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.03; ctx.stroke();

  ctx.save();
  ctx.translate(kolaT, yT); ctx.rotate(kat); ctx.translate(-kolaT, -yT);
  // podwozie
  ctx.strokeStyle = 'rgba(56,38,24,1)'; ctx.lineWidth = 0.09;
  ctx.beginPath(); ctx.moveTo(kolaT, yT + 0.04); ctx.lineTo(kolaP, yT + rT - rP + 0.02); ctx.stroke();
  // ładunek: worki i beczka nad burtą
  for (let i = 0; i < 4; i++) {
    const wx = ogon + 1.0 + i * 0.62, ww = 0.36 + 0.05 * los(i);
    ctx.beginPath();
    ctx.moveTo(wx - ww, gora + 0.05);
    ctx.quadraticCurveTo(wx - ww * 1.05, gora - 0.42 - 0.06 * los(i * 3), wx, gora - 0.48 - 0.06 * los(i * 5));
    ctx.quadraticCurveTo(wx + ww * 1.05, gora - 0.42, wx + ww, gora + 0.05);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? 'rgba(146,118,82,1)' : 'rgba(160,132,92,1)'; ctx.fill();
    ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.04; ctx.stroke();
    ctx.strokeStyle = 'rgba(96,74,48,0.7)'; ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.moveTo(wx - ww * 0.5, gora - 0.2); ctx.quadraticCurveTo(wx, gora - 0.12, wx + ww * 0.5, gora - 0.22); ctx.stroke();
  }
  const bk = ogon + 3.38;
  ctx.beginPath(); ctx.moveTo(bk - 0.28, gora); ctx.quadraticCurveTo(bk - 0.34, gora - 0.34, bk - 0.28, gora - 0.66); ctx.lineTo(bk + 0.28, gora - 0.66); ctx.quadraticCurveTo(bk + 0.34, gora - 0.34, bk + 0.28, gora); ctx.closePath();
  ctx.fillStyle = 'rgba(112,76,44,1)'; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.04; ctx.stroke();
  ctx.strokeStyle = 'rgba(56,54,56,1)'; ctx.lineWidth = 0.06;
  for (const f of [0.2, 0.55]) { ctx.beginPath(); ctx.moveTo(bk - 0.32, gora - 0.66 * f - 0.04); ctx.lineTo(bk + 0.32, gora - 0.66 * f - 0.04); ctx.stroke(); }
  // skrzynia: deski, kłonice
  ctx.beginPath(); ctx.rect(ogon + 0.05, gora, 3.9, dno - gora);
  const gd = ctx.createLinearGradient(0, gora, 0, dno);
  gd.addColorStop(0, 'rgba(128,90,54,1)'); gd.addColorStop(1, 'rgba(84,58,34,1)');
  ctx.fillStyle = gd; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.strokeStyle = 'rgba(44,28,16,0.75)'; ctx.lineWidth = 0.03;
  ctx.beginPath(); for (const f of [0.34, 0.67]) { ctx.moveTo(ogon + 0.05, gora + (dno - gora) * f); ctx.lineTo(ogon + 3.95, gora + (dno - gora) * f); } ctx.stroke();
  ctx.fillStyle = 'rgba(70,46,26,1)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.035;
  for (const f of [0.05, 1.35, 2.65, 3.85]) { ctx.beginPath(); ctx.rect(ogon + f, gora - 0.14, 0.1, dno - gora + 0.14); ctx.fill(); ctx.stroke(); }
  // kozioł woźnicy i latarnia na tyczce
  ctx.fillStyle = 'rgba(96,66,40,1)';
  ctx.beginPath(); ctx.rect(ogon + 3.35, gora - 0.38, 0.62, 0.1); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(54,40,30,1)'; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(ogon + 3.95, gora); ctx.lineTo(ogon + 3.95, gora - 1.32); ctx.lineTo(ogon + 4.1, gora - 1.32); ctx.lineTo(ogon + 4.1, gora - 1.22); ctx.stroke();
  const [lx, ly] = U.latarnia;
  ctx.fillStyle = 'rgba(44,40,38,1)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(lx - 0.1, ly + 0.14); ctx.lineTo(lx + 0.1, ly + 0.14); ctx.lineTo(lx + 0.07, ly - 0.16); ctx.lineTo(lx - 0.07, ly - 0.16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(230,180,100,1)'; ctx.beginPath(); ctx.rect(lx - 0.05, ly - 0.1, 0.1, 0.19); ctx.fill();
  // woźnica w kapeluszu na koźle, z lejcami
  czlowiek(ctx, ogon + 3.62, gora - 0.38, 'siedzi', 1, teraz, tempo, 'kapelusz', 0);
  // koła: szprychy obracają się z drogą
  kolo(ctx, kolaT, yT, rT, krok / rT);
  kolo(ctx, kolaP, yT + rT - rP, rP, krok / rP);
  ctx.restore();

  // bliższy koń, postronek do skrzyni i lejce do rąk woźnicy
  ctx.save();
  ctx.translate(kon, pod(kon));
  kon_(ctx, faza, tempo, teraz, lw, KON_BLISKI, (dx) => pod(kon + dx) - pod(kon), stoja, 0);
  ctx.restore();
  const przodSkrzyni = U.zWozu(ogon + 3.95, dno - 0.16);
  ctx.strokeStyle = 'rgba(40,26,16,1)'; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(kon + 0.74, pod(kon) - 1.26); ctx.lineTo(przodSkrzyni[0], przodSkrzyni[1]); ctx.stroke();
  const rece = U.zWozu(ogon + 3.62 + 0.34, gora - 0.38 - 0.32);
  ctx.strokeStyle = 'rgba(30,20,14,0.9)'; ctx.lineWidth = 0.025;
  ctx.beginPath(); ctx.moveTo(kon + 1.47, pod(kon) - 1.74);
  ctx.quadraticCurveTo((kon + 1.47 + rece[0]) / 2, Math.max(pod(kon) - 1.5, rece[1] + 0.25), rece[0], rece[1]); ctx.stroke();
  // pomocnik: na tyle wozu albo na ziemi przy koźle (twarzą do kozła), ręka za ręką spuszcza linę
  const naWozie = U.zWozu(ogon + 0.3, gora);
  const naZiemiP: [number, number] = [ogon - 0.5, pod(ogon - 0.5)];
  if (pomoc <= 0) czlowiek(ctx, naWozie[0], naWozie[1], 'siedzi', -1, teraz, tempo, 'kaptur', 0);
  else if (pomoc >= 1) czlowiek(ctx, naZiemiP[0], naZiemiP[1], 'stoi', -1, teraz, 0, 'kaptur', reka);
  else {
    const x = naWozie[0] + (naZiemiP[0] - naWozie[0]) * pomoc;
    const y = naWozie[1] + (naZiemiP[1] - naWozie[1]) * pomoc - Math.sin(pomoc * Math.PI) * 0.35;
    czlowiek(ctx, x, y, pomoc < 0.5 ? 'siedzi' : 'stoi', -1, teraz, 0, 'kaptur', 0);
  }
  ctx.restore();
}

/** Koło wozu: obręcz, szprychy (obrót `obr`), piasta. */
function kolo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, obr: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(52,36,22,1)'; ctx.lineWidth = 0.06;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = obr + (i / 8) * Math.PI * 2; ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18); ctx.lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); }
  ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(88,60,36,1)'; ctx.lineWidth = r * 0.16; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(40,38,40,1)'; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.025; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fillStyle = 'rgba(60,44,30,1)'; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.03; ctx.stroke();
  ctx.restore();
}

/**
 * Noga konia: od stawu `b` (w tułowiu) do kopyta `f`, staw pośrodku (przednia zgina kolano do przodu, tylna
 * skokowy do tyłu). Zwęża się od mięśnia przy tułowiu do cienkiej nadpęcia; u dołu pęcina i kopyto.
 */
function noga(ctx: CanvasRenderingContext2D, bx: number, by: number, fx: number, fy: number, l1: number, l2: number, przod: boolean, siersc: string, ciemne: string, grub: number): void {
  let dx = fx - bx, dy = fy - by, d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.999;
  if (d > max) { fx = bx + (dx / d) * max; fy = by + (dy / d) * max; dx = fx - bx; dy = fy - by; d = max; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = bx + (dx * a) / d, my = by + (dy * a) / d;
  const s = przod ? 1 : -1;
  const kx = mx + (-dy / d) * h * s, ky = my + (dx / d) * h * s;
  // obrys nogi: z boku odcinków udo–staw i staw–pęcina, szerokość maleje w dół
  const pas = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number): [number, number][] => {
    const ex = x1 - x0, ey = y1 - y0, el = Math.hypot(ex, ey) || 1, nx = -ey / el, ny = ex / el;
    return [[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]];
  };
  const p1 = pas(bx, by, kx, ky, grub * 0.17, grub * 0.075), p2 = pas(kx, ky, fx, fy - 0.12, grub * 0.065, grub * 0.05);
  // udo w barwie sierści, nadpęcie ciemne (jak u gniadosza)
  ctx.beginPath();
  ctx.moveTo(p1[0][0], p1[0][1]); ctx.lineTo(p1[1][0], p1[1][1]); ctx.lineTo(p2[1][0], p2[1][1]); ctx.lineTo(p2[2][0], p2[2][1]);
  ctx.lineTo(p1[2][0], p1[2][1]); ctx.lineTo(p1[3][0], p1[3][1]); ctx.closePath();
  ctx.fillStyle = siersc; ctx.fill();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.03; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p2[0][0], p2[0][1]); ctx.lineTo(p2[1][0], p2[1][1]); ctx.lineTo(p2[2][0], p2[2][1]); ctx.lineTo(p2[3][0], p2[3][1]); ctx.closePath();
  ctx.fillStyle = ciemne; ctx.fill();
  // staw (kolano, skokowy) i pęcina
  ctx.fillStyle = ciemne;
  ctx.beginPath(); ctx.arc(kx, ky, grub * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(fx, fy - 0.15, 0.06, 0.05, 0, 0, Math.PI * 2); ctx.fill();
  // kopyto
  ctx.fillStyle = 'rgba(28,22,20,1)';
  ctx.beginPath(); ctx.moveTo(fx - 0.075, fy); ctx.lineTo(fx + 0.1, fy); ctx.lineTo(fx + 0.06, fy - 0.12); ctx.lineTo(fx - 0.06, fy - 0.12); ctx.closePath(); ctx.fill();
}

/**
 * Koń z boku (pysk w prawo), (0, 0) — ziemia pod środkiem tułowia, kafle. Kłus: nogi po przekątnej w parze, tułów
 * podskakuje, głowa kiwa; na postoju kopyta stoją, ogon się kołysze, czasem kiwnie łbem.
 */
function kon_(ctx: CanvasRenderingContext2D, faza: number, tempo: number, teraz: number, lw: number, B: typeof KON_BLISKI, podKopytem: (dx: number) => number, zyje: boolean, nr: number): void {
  const bob = -0.05 * tempo * (0.5 + 0.5 * Math.cos(faza * 2));
  const kiw = tempo * 0.05 * Math.sin(faza * 2) + (zyje ? 0.06 * Math.max(0, Math.sin(teraz * 0.0013 + nr * 2)) ** 6 : 0);
  const siersc = rgb(B.siersc), ciemne = rgb(B.ciemne), jasne = rgb(B.jasne);
  const A = 0.36 * tempo, unies = 0.3 * tempo;
  const nogi = (dalsze: boolean): void => {
    const sz = dalsze ? 0.78 : 1;
    const kol = rgb(B.siersc.map((c) => c * sz)), ciem = rgb(B.ciemne.map((c) => c * sz));
    for (const [px, py, l1, l2, przod, ph] of [
      [0.66, -1.12, 0.6, 0.56, true, dalsze ? Math.PI : 0],
      [-0.72, -1.18, 0.62, 0.6, false, dalsze ? 0 : Math.PI],
    ] as [number, number, number, number, boolean, number][]) {
      const q = faza + ph, bxN = px + (dalsze ? -0.12 : 0);
      const fx = bxN + A * Math.sin(q), lift = unies * Math.max(0, Math.cos(q));
      noga(ctx, bxN, py + bob, fx, podKopytem(fx) - lift, l1, l2, przod, kol, ciem, przod ? 1 : 1.15);
    }
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  nogi(true);
  // ogon: gęsty, spływa z zadu
  const machaj = zyje ? Math.sin(teraz * 0.0021 + nr) * 0.12 : tempo * 0.18 * Math.sin(faza);
  ctx.fillStyle = ciemne;
  ctx.beginPath();
  ctx.moveTo(-1.08, -1.5 + bob);
  ctx.quadraticCurveTo(-1.42 - tempo * 0.25, -1.3 + bob, -1.36 + machaj, -0.62);
  ctx.quadraticCurveTo(-1.22 + machaj, -0.6, -1.18 + machaj * 0.6, -0.72);
  ctx.quadraticCurveTo(-1.22 - tempo * 0.1, -1.18 + bob, -1.04, -1.36 + bob);
  ctx.closePath(); ctx.fill();
  ctx.save();
  ctx.translate(0, bob);
  // tułów z zadem i łopatką
  ctx.beginPath();
  ctx.moveTo(-1.1, -1.42);
  ctx.bezierCurveTo(-0.95, -1.68, -0.4, -1.64, 0.05, -1.56);
  ctx.bezierCurveTo(0.32, -1.53, 0.5, -1.64, 0.64, -1.68);
  ctx.lineTo(1.02, -1.34);
  ctx.bezierCurveTo(1.1, -1.17, 1.05, -1.0, 0.9, -0.92);
  ctx.bezierCurveTo(0.5, -0.84, -0.3, -0.82, -0.62, -0.92);
  ctx.bezierCurveTo(-0.88, -0.96, -1.2, -1.1, -1.18, -1.3);
  ctx.bezierCurveTo(-1.17, -1.36, -1.14, -1.4, -1.1, -1.42);
  ctx.closePath();
  const gt = ctx.createLinearGradient(0, -1.68, 0, -0.82);
  gt.addColorStop(0, jasne); gt.addColorStop(0.4, siersc); gt.addColorStop(1, ciemne);
  ctx.fillStyle = gt; ctx.fill();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.035, lw * 0.9); ctx.stroke();
  // mięśnie: łuk zadu i linia łopatki
  ctx.strokeStyle = 'rgba(30,18,10,0.45)'; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(-0.5, -1.55); ctx.quadraticCurveTo(-0.45, -1.15, -0.78, -1.0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.5, -1.6); ctx.quadraticCurveTo(0.62, -1.3, 0.8, -1.02); ctx.stroke();
  // szyja i łeb (kiwają się razem)
  ctx.translate(0.55, -1.55); ctx.rotate(kiw); ctx.translate(-0.55, 1.55);
  ctx.beginPath();
  ctx.moveTo(0.36, -1.62);
  ctx.bezierCurveTo(0.6, -1.98, 0.9, -2.18, 1.1, -2.28);
  ctx.lineTo(1.28, -2.1);
  ctx.bezierCurveTo(1.16, -1.84, 1.1, -1.56, 1.02, -1.3);
  ctx.closePath();
  ctx.fillStyle = siersc; ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1.06, -2.3);
  ctx.bezierCurveTo(1.3, -2.36, 1.56, -2.08, 1.74, -1.84);
  ctx.bezierCurveTo(1.8, -1.75, 1.71, -1.64, 1.58, -1.66);
  ctx.bezierCurveTo(1.44, -1.7, 1.31, -1.86, 1.2, -1.96);
  ctx.bezierCurveTo(1.13, -2.04, 1.08, -2.18, 1.06, -2.3);
  ctx.closePath();
  ctx.fillStyle = siersc; ctx.fill(); ctx.stroke();
  // chrapy jaśniejsze, ucho, oko, grzywa, uździenica
  ctx.fillStyle = rgb(B.ciemne, 0.6);
  ctx.beginPath(); ctx.ellipse(1.66, -1.74, 0.08, 0.06, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1.06, -2.3); ctx.lineTo(1.02, -2.5); ctx.lineTo(1.16, -2.32); ctx.closePath(); ctx.fillStyle = ciemne; ctx.fill();
  ctx.fillStyle = 'rgba(12,8,6,1)'; ctx.beginPath(); ctx.arc(1.32, -2.1, 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ciemne;
  ctx.beginPath();
  ctx.moveTo(0.3, -1.64); ctx.bezierCurveTo(0.55, -2.02, 0.84, -2.22, 1.08, -2.32);
  ctx.lineTo(1.0, -2.2); ctx.bezierCurveTo(0.78, -2.06, 0.58, -1.86, 0.42, -1.6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(30,20,14,0.95)'; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(1.14, -2.22); ctx.lineTo(1.5, -1.74); ctx.moveTo(1.38, -2.04); ctx.lineTo(1.62, -1.78); ctx.stroke();
  // chomąto na szyi
  ctx.strokeStyle = 'rgba(66,40,22,1)'; ctx.lineWidth = 0.14;
  ctx.beginPath(); ctx.ellipse(0.78, -1.46, 0.11, 0.32, -0.35, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,120,70,0.8)'; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.ellipse(0.78, -1.46, 0.11, 0.32, -0.35, -1.2, 0.6); ctx.stroke();
  ctx.restore();
  // bliższe nogi przed tułowiem
  nogi(false);
}

/**
 * Człowiek konwoju w płaszczu: woźnica w kapeluszu albo pomocnik w kapturze; (0, 0) — stopy (siedzący — siedzisko),
 * kafle, twarzą w stronę `zwrot` (1 — ku koniom). Pomocnik na ziemi trzyma linę w uniesionych dłoniach — `reka`
 * (−1..1) przekłada je jedną za drugą.
 */
function czlowiek(ctx: CanvasRenderingContext2D, x: number, y: number, poza: 'stoi' | 'siedzi', zwrot: number, teraz: number, tempo: number, glowa: 'kapelusz' | 'kaptur', reka: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(zwrot, 1);
  const plaszcz = glowa === 'kapelusz' ? 'rgba(74,62,52,1)' : 'rgba(92,70,48,1)';
  const ciemny = glowa === 'kapelusz' ? 'rgba(44,36,32,1)' : 'rgba(58,44,30,1)';
  const bob = -0.03 * tempo * Math.abs(Math.sin(teraz * 0.012));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.04;
  if (poza === 'siedzi') {
    // nogi zwieszone przed siedziskiem
    ctx.strokeStyle = ciemny; ctx.lineWidth = 0.11;
    ctx.beginPath(); ctx.moveTo(0.05, -0.02); ctx.lineTo(0.32, 0.02); ctx.lineTo(0.36, 0.48); ctx.stroke();
    ctx.translate(0, bob);
    ctx.beginPath();
    ctx.moveTo(-0.2, 0); ctx.lineTo(-0.16, -0.62); ctx.quadraticCurveTo(0.02, -0.78, 0.16, -0.62); ctx.lineTo(0.28, 0.02); ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.moveTo(-0.26, -0.02); ctx.quadraticCurveTo(-0.24, -0.7, -0.16, -1.3); ctx.quadraticCurveTo(0.02, -1.42, 0.17, -1.3); ctx.quadraticCurveTo(0.26, -0.7, 0.3, -0.02); ctx.closePath();
  }
  const top = poza === 'siedzi' ? -0.68 : -1.36;
  const gp = ctx.createLinearGradient(-0.3, 0, 0.3, 0);
  gp.addColorStop(0, ciemny); gp.addColorStop(0.6, plaszcz); gp.addColorStop(1, ciemny);
  ctx.fillStyle = gp; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.04; ctx.stroke();
  // sznur w pasie
  ctx.strokeStyle = 'rgba(150,120,80,0.9)'; ctx.lineWidth = 0.035;
  const pas = poza === 'siedzi' ? -0.16 : -0.78;
  ctx.beginPath(); ctx.moveTo(-0.2, pas); ctx.lineTo(0.22, pas + 0.02); ctx.stroke();
  // ręce: woźnica trzyma lejce przed sobą, pomocnik — linę nad głową, jedna dłoń za drugą
  const skora = 'rgba(176,136,108,1)';
  const dlonie: [number, number][] = poza === 'siedzi' ? [[0.34, top + 0.36], [0.3, top + 0.4]]
    : [[0.3 + 0.03 * reka, top + 0.08 - 0.12 * reka], [0.22 - 0.03 * reka, top + 0.2 + 0.12 * reka]];
  ctx.strokeStyle = plaszcz; ctx.lineWidth = 0.1;
  for (const [hx, hy] of dlonie) { ctx.beginPath(); ctx.moveTo(0.04, top + 0.16); ctx.quadraticCurveTo((hx + 0.04) / 2 + 0.06, (hy + top) / 2 + 0.12, hx, hy); ctx.stroke(); }
  ctx.fillStyle = skora;
  for (const [hx, hy] of dlonie) { ctx.beginPath(); ctx.arc(hx, hy, 0.05, 0, Math.PI * 2); ctx.fill(); }
  // głowa: twarz w cieniu, kapelusz z rondem albo kaptur
  const gx = 0.03, gy = top - 0.14;
  ctx.fillStyle = 'rgba(150,112,88,1)';
  ctx.beginPath(); ctx.arc(gx + 0.04, gy + 0.02, 0.12, 0, Math.PI * 2); ctx.fill();
  if (glowa === 'kapelusz') {
    ctx.fillStyle = 'rgba(40,32,28,1)';
    ctx.beginPath(); ctx.ellipse(gx + 0.02, gy - 0.08, 0.27, 0.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx - 0.12, gy - 0.09); ctx.quadraticCurveTo(gx - 0.1, gy - 0.3, gx + 0.03, gy - 0.3); ctx.quadraticCurveTo(gx + 0.16, gy - 0.3, gx + 0.16, gy - 0.09); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = plaszcz;
    ctx.beginPath(); ctx.moveTo(gx - 0.2, gy + 0.18); ctx.quadraticCurveTo(gx - 0.24, gy - 0.22, gx + 0.02, gy - 0.26); ctx.quadraticCurveTo(gx + 0.22, gy - 0.22, gx + 0.2, gy + 0.02);
    ctx.quadraticCurveTo(gx + 0.12, gy - 0.06, gx + 0.08, gy + 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/** Nad mrokiem: płomień latarni i jej ciepła łuna. */
export function rysujKonwojNad(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, grunt: Grunt): void {
  const l = latarniaKonwoju(sim, grunt);
  if (!l) return;
  const z = cam.zoom, x = cam.toScreenX(l.x), y = cam.toScreenY(l.y);
  if (x < -z * 4 || x > cam.vw + z * 4 || y < -z * 4 || y > cam.vh + z * 4) return;
  const drg = wolnoRuszac() ? migotLampy(teraz + 4127) : 0.5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = z * (1.6 + 0.15 * drg);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,196,110,${0.36 + 0.08 * drg})`); g.addColorStop(1, 'rgba(255,160,80,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.fillStyle = 'rgba(255,232,170,0.9)';
  ctx.beginPath(); ctx.ellipse(x, y, z * 0.05, z * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
