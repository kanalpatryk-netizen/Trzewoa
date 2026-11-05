/**
 * „Budowa” (Alpha 1): ciemna płyta obok księgi (klawisz jak „wyznacz pomieszczenie”), pod nią „odwołaj rozkaz”,
 * a po dotknięciu płyty — menu kafli z pomieszczeniami: łuk wyrobiska z ikoną, rozmiar pod spodem, nazwa;
 * nad kaflami opis „co daje” i „jak postawić” wskazanego (albo wybranego) pomieszczenia.
 * Placeholder rysowany w kodzie. Zwraca pola do kliknięcia.
 */
import type { Plate } from './plate';
import { ukladDolu, type Prostokat } from './przyciski';
import { SERIF, SERIF_TYTUL } from './ink';
import { ikonaBudowy, ikonaOdwolaj, ikonaPomieszczenia } from './ikony-hud';
import { klawisze, nazwaKlawisza } from '../core/keybinds';
import { POMIESZCZENIA, NAZWA_POMIESZCZENIA, SZABLONY, type RodzajPomieszczenia } from '../nastawy/pomieszczenia';

export interface PoleBudowy { akcja: 'buduj' | 'odwolaj' | 'menu' | 'szablon'; szablon?: RodzajPomieszczenia; x: number; y: number; w: number; h: number; }
export interface StanBudowy {
  kursor: { x: number; y: number }; czas: number;
  /** Menu kafli otwarte. */
  menu: boolean;
  /** Wybrany szablon (plan pod kursorem). */
  szablon: RodzajPomieszczenia | null;
  /** Ktoś z zaznaczonych ma rozkaz — „odwołaj” jest czynne. */
  maRozkaz: boolean;
  liny: { darmowe: number; cena: number };
}

/** Co daje pomieszczenie i jak je postawić (opis w menu „Budowa”). */
const OPIS_POMIESZCZENIA: Record<RodzajPomieszczenia, { daje: string; jak: string }> = { sypialnia: { daje: "sen w niej zdejmuje os\u0142abienia", jak: "dotknij ska\u0142y \u2014 plan stanie pod kursorem; kuj\u0105 go robotnicy" }, warsztat: { daje: "robotnicy zamieniaj\u0105 w nim z\u0142oto w wiar\u0119", jak: "dotknij ska\u0142y \u2014 plan stanie pod kursorem; kuj\u0105 go robotnicy" }, kuznia: { daje: "z \u017Celaza wykuwa zbroj\u0119 rycerza", jak: "dotknij ska\u0142y \u2014 plan stanie pod kursorem; kuj\u0105 go robotnicy" }, korytarz: { daje: "przej\u015Bcie w bok, na 2 kafle wysoko\u015Bci", jak: "przeci\u0105gnij w bok od miejsca, gdzie stoi lud" }, szyb: { daje: "proste schody w d\xF3\u0142 \u2014 da si\u0119 nimi wr\xF3ci\u0107", jak: "przeci\u0105gnij w d\xF3\u0142 i w bok od miejsca, gdzie stoi lud" }, lina: { daje: "lud wchodzi po niej wy\u017Cej ni\u017C o stopie\u0144", jak: "dotknij ska\u0142y, kt\xF3rej uczepi si\u0119 hak \u2014 lina spadnie do pod\u0142ogi" } };
/** Rozmiar pod ikoną kafla: „5×3”, „do 30”, „5 za darmo”. */
function rozmiarPomieszczenia(A: RodzajPomieszczenia): string {
  const M = POMIESZCZENIA;
  return A === "sypialnia" || A === "warsztat" || A === "kuznia" ? `${M.szablony[A].w}\xD7${M.szablony[A].h}` : A === "korytarz" ? `do ${M.korytarzMaks}` : A === "szyb" ? `do ${M.szybMaks}` : `${M.linyDarmowe} za darmo`;
}
function lamLinie(ctx: CanvasRenderingContext2D, M: string, g: number): string[] {
  const B = [];
  let C = "";
  for (const o of M.split(" ")) {
    const E = C ? `${C} ${o}` : o;
    ctx.measureText(E).width > g && C ? (B.push(C), C = o) : C = E;
  }
  return C && B.push(C), B;
}
const jasny = (a: number): string => `rgba(222,206,172,${a})`;
/** Ciemna płyta z rogami z kreski; `g` 0..1 — żar od dołu (podświetlenie), `B` — wybrana (złota obwódka). */
function panelCiemny(ctx: CanvasRenderingContext2D, M: Prostokat, g: number, B: boolean, C = 6): void {
  ctx.save(), ctx.shadowColor = "rgba(0,0,0,0.7)", ctx.shadowBlur = 12, ctx.shadowOffsetY = 3, ctx.beginPath(), ctx.roundRect(M.x, M.y, M.w, M.h, C);
  const o = ctx.createLinearGradient(0, M.y, 0, M.y + M.h);
  o.addColorStop(0, "#0b0907"), o.addColorStop(0.5, "#15110e"), o.addColorStop(1, "#1d1712"), ctx.fillStyle = o, ctx.fill(), ctx.shadowColor = "transparent", ctx.save(), ctx.clip();
  const E = ctx.createLinearGradient(0, M.y, 0, M.y + 10);
  if (E.addColorStop(0, "rgba(0,0,0,0.75)"), E.addColorStop(1, "rgba(0,0,0,0)"), ctx.fillStyle = E, ctx.fillRect(M.x, M.y, M.w, 10), g > 0) {
    const I = ctx.createRadialGradient(M.x + M.w / 2, M.y + M.h * 1.05, 2, M.x + M.w / 2, M.y + M.h, Math.max(M.w, M.h) * 0.9);
    I.addColorStop(0, `rgba(255,160,70,${0.32 * g})`), I.addColorStop(0.5, `rgba(200,110,40,${0.12 * g})`), I.addColorStop(1, "rgba(200,110,40,0)"), ctx.fillStyle = I, ctx.fillRect(M.x, M.y, M.w, M.h);
  }
  ctx.restore(), ctx.lineWidth = 1, ctx.strokeStyle = B ? "rgba(214,170,96,0.85)" : jasny(0.22 + 0.25 * g), ctx.beginPath(), ctx.roundRect(M.x + 0.5, M.y + 0.5, M.w - 1, M.h - 1, C), ctx.stroke(), ctx.strokeStyle = jasny(0.1 + 0.12 * g), ctx.beginPath(), ctx.roundRect(M.x + 3.5, M.y + 3.5, M.w - 7, M.h - 7, Math.max(2, C - 3)), ctx.stroke(), ctx.strokeStyle = B ? "rgba(214,170,96,0.9)" : jasny(0.35 + 0.3 * g);
  const Q = Math.min(8, M.w / 6, M.h / 4);
  ctx.beginPath();
  for (const [I, Y, i, w] of [[M.x + 3.5, M.y + 3.5, 1, 1], [M.x + M.w - 3.5, M.y + 3.5, -1, 1], [M.x + 3.5, M.y + M.h - 3.5, 1, -1], [M.x + M.w - 3.5, M.y + M.h - 3.5, -1, -1]]) ctx.moveTo(I + i * Q, Y), ctx.lineTo(I, Y), ctx.lineTo(I, Y + w * Q);
  ctx.stroke(), ctx.restore();
}
function napisRozstrzelony(ctx: CanvasRenderingContext2D, M: string, g: number, B: number, C: number, o: string, E: CanvasTextAlign = "left", Q?: number): void {
  ctx.save(), ctx.font = `600 ${C}px ${SERIF_TYTUL}`, ctx.textAlign = E, ctx.textBaseline = "alphabetic", ctx.fillStyle = o, ctx.shadowColor = "rgba(0,0,0,0.9)", ctx.shadowBlur = 2, ctx.fillText(M.toUpperCase().split("").join("\u2009"), g, B, Q), ctx.restore();
}
/** Wygładzone podświetlenia (0..1) — płyty i kafle rozjaśniają się łagodnie. */
const wygladzone = new Map<string, { v: number; t: number }>();
function wygladz(A: string, M: number, g: number): number {
  let o;
  const B = (o = wygladzone.get(A)) != null ? o : { v: 0, t: g }, C = Math.min(100, Math.max(0, g - B.t));
  return B.v += (M - B.v) * Math.min(1, C / 140), B.t = g, wygladzone.set(A, B), B.v;
}
/** Płyta „Budowa”, „odwołaj rozkaz” i (gdy otwarte) menu kafli. */
export function rysujBudowe(ctx: CanvasRenderingContext2D, M: Plate, g: number, B: StanBudowy): PoleBudowy[] {
  const C = ukladDolu(M, g), o: PoleBudowy[] = [], E = (D: Prostokat): boolean => B.kursor.x >= D.x && B.kursor.x <= D.x + D.w && B.kursor.y >= D.y && B.kursor.y <= D.y + D.h, Q = C.buduj, I = wygladz("buduj", E(Q) || B.menu ? 1 : 0, B.czas);
  panelCiemny(ctx, Q, I, B.menu);
  const Y = Math.min(Q.h * 0.7, Q.w * 0.34);
  ikonaBudowy(ctx, Q.x + 12 + Y / 2, Q.y + Q.h / 2, Y, 0.6 + 0.4 * I);
  const i = Q.x + 20 + Y, w = Math.max(13, Math.min(19, Q.h * 0.24));
  napisRozstrzelony(ctx, "Budowa", i, Q.y + Q.h * 0.5, w, B.menu ? "rgba(236,200,130,1)" : jasny(0.78 + 0.2 * I), "left", Q.x + Q.w - i - 8), ctx.save(), ctx.font = `italic ${Math.max(11, w * 0.72)}px ${SERIF}`, ctx.textAlign = "left", ctx.fillStyle = jasny(0.45), ctx.fillText(B.menu ? B.szablon ? NAZWA_POMIESZCZENIA[B.szablon] : "co wyku\u0107?" : "wykuj w skale", i, Q.y + Q.h * 0.5 + w * 1.15, Q.x + Q.w - i - 8), ctx.font = `${Math.max(10, w * 0.62)}px ${SERIF}`, ctx.textAlign = "right", ctx.fillStyle = jasny(0.3), ctx.fillText(nazwaKlawisza(klawisze.planuj).toUpperCase(), Q.x + Q.w - 9, Q.y + Math.max(15, w * 0.95)), ctx.restore(), o.push({ akcja: "buduj", x: Q.x, y: Q.y, w: Q.w, h: Q.h });
  const G = C.odwolaj, h = wygladz("odwolaj", B.maRozkaz && E(G) ? 1 : 0, B.czas);
  panelCiemny(ctx, G, h, false, 5);
  const a = G.h * 0.62;
  ikonaOdwolaj(ctx, G.x + 10 + a / 2, G.y + G.h / 2, a, B.maRozkaz ? 0.65 + 0.35 * h : 0.25), ctx.save();
  const k = Math.max(12, Math.min(15, G.h * 0.4));
  return ctx.font = `italic ${k}px ${SERIF}`, ctx.textAlign = "left", ctx.textBaseline = "middle", ctx.fillStyle = B.maRozkaz ? jasny(0.75 + 0.25 * h) : jasny(0.25), ctx.fillText("odwo\u0142aj rozkaz", G.x + 16 + a, G.y + G.h / 2 + 1, G.x + G.w - (G.x + 16 + a) - 6), ctx.restore(), o.push({ akcja: "odwolaj", x: G.x, y: G.y, w: G.w, h: G.h }), B.menu && o.push(...menuBudowy(ctx, M, Q, B)), o;
}
function lukKafla(A: number, M: number, g: number, B: number): Path2D {
  const C = g / 2, o = new Path2D();
  return o.moveTo(A, M + B), o.lineTo(A, M + C * 0.55), o.quadraticCurveTo(A, M, A + C, M), o.quadraticCurveTo(A + g, M, A + g, M + C * 0.55), o.lineTo(A + g, M + B), o.closePath(), o;
}
function menuBudowy(ctx: CanvasRenderingContext2D, M: Plate, g: Prostokat, B: StanBudowy): PoleBudowy[] {
  const C: PoleBudowy[] = [], E = SZABLONY.length, Q = Math.ceil(E / 3), I = Math.max(64, Math.min(88, M.h * 0.145)), Y = I * 1.12, i = 10, w = 16, G = Math.max(12, Math.min(14, I * 0.17)), h = G * 2.2, a = G * 4.3, k = G * 1.7, D = 3 * I + 2 * i + w * 2, l = w + h + a + Q * (Y + k) + (Q - 1) * i * 0.5 + w * 0.5, U = Math.max(M.x + 8, Math.min(M.x + M.w - D - 8, g.x + g.w / 2 - D / 2)), K = Math.max(M.y + 8, g.y - 14 - l);
  panelCiemny(ctx, { x: U, y: K, w: D, h: l }, 0, false, 8), C.push({ akcja: "menu", x: U, y: K, w: D, h: l + 14 }), ctx.save();
  const S = K + w + G * 1.05;
  napisRozstrzelony(ctx, "Budowa", U + D / 2, S, G * 1.15, jasny(0.85), "center"), ctx.font = `600 ${G * 1.15}px ${SERIF_TYTUL}`;
  const J = ctx.measureText("B U D O W A").width;
  ctx.strokeStyle = jasny(0.25), ctx.lineWidth = 1, ctx.beginPath(), ctx.moveTo(U + w, S - G * 0.35), ctx.lineTo(U + D / 2 - J / 2 - 10, S - G * 0.35), ctx.moveTo(U + D / 2 + J / 2 + 10, S - G * 0.35), ctx.lineTo(U + D - w, S - G * 0.35), ctx.stroke(), ctx.restore();
  let m: RodzajPomieszczenia | null = null;
  const s = SZABLONY.map((q, F) => ({ s: q, kx: U + w + F % 3 * (I + i), ky: K + w + h + a + Math.floor(F / 3) * (Y + k + i * 0.5) }));
  for (const q of s) B.kursor.x >= q.kx && B.kursor.x <= q.kx + I && B.kursor.y >= q.ky && B.kursor.y <= q.ky + Y + k && (m = q.s);
  const R = m != null ? m : B.szablon;
  ctx.save(), ctx.textAlign = "left", ctx.textBaseline = "alphabetic";
  const V = K + w + h + G * 0.9;
  if (R) {
    ctx.font = `italic ${G * 1.05}px ${SERIF}`, ctx.fillStyle = "rgba(236,200,130,0.95)";
    const q = NAZWA_POMIESZCZENIA[R];
    ctx.fillText(q[0].toUpperCase() + q.slice(1) + " \u2014 " + OPIS_POMIESZCZENIA[R].daje + ".", U + w, V, D - w * 2), ctx.font = `italic ${G * 0.92}px ${SERIF}`, ctx.fillStyle = jasny(0.55);
    const F = R === "lina" ? `${OPIS_POMIESZCZENIA.lina.jak}; ${B.liny.darmowe > 0 ? `za darmo \u2014 zosta\u0142o ${B.liny.darmowe}` : `ka\u017Cda kosztuje ${B.liny.cena} krwi`}.` : `${OPIS_POMIESZCZENIA[R].jak}.`;
    lamLinie(ctx, F, D - w * 2).slice(0, 2).forEach((y, Z) => ctx.fillText(y, U + w, V + G * (1.3 + Z * 1.15)));
  } else ctx.font = `italic ${G * 0.95}px ${SERIF}`, ctx.fillStyle = jasny(0.55), lamLinie(ctx, "Wybierz, co wyku\u0107, i wska\u017C miejsce w skale. Plan kuj\u0105 robotnicy, kt\xF3rym go wska\u017Cesz; prawy przycisk na planie \u2014 skre\u015Bla go.", D - w * 2).slice(0, 3).forEach((q, F) => ctx.fillText(q, U + w, V + F * G * 1.15));
  ctx.restore();
  for (const q of s) {
    const F = B.szablon === q.s, y = m === q.s, Z = wygladz(`kafel-${q.s}`, F ? 1 : y ? 0.75 : 0, B.czas), p = lukKafla(q.kx, q.ky, I, Y);
    ctx.save();
    const c = ctx.createLinearGradient(0, q.ky, 0, q.ky + Y);
    if (c.addColorStop(0, "#050403"), c.addColorStop(1, "#14100c"), ctx.fillStyle = c, ctx.fill(p), ctx.save(), ctx.clip(p), Z > 0.01) {
      const j = ctx.createRadialGradient(q.kx + I / 2, q.ky + Y, 2, q.kx + I / 2, q.ky + Y * 0.75, I * 0.85);
      j.addColorStop(0, `rgba(255,160,70,${0.36 * Z})`), j.addColorStop(0.6, `rgba(170,90,30,${0.12 * Z})`), j.addColorStop(1, "rgba(170,90,30,0)"), ctx.fillStyle = j, ctx.fillRect(q.kx, q.ky, I, Y);
    }
    const t = ctx.createLinearGradient(0, q.ky, 0, q.ky + I * 0.4);
    if (t.addColorStop(0, "rgba(0,0,0,0.8)"), t.addColorStop(1, "rgba(0,0,0,0)"), ctx.fillStyle = t, ctx.fillRect(q.kx, q.ky, I, I * 0.4), ikonaPomieszczenia(ctx, q.s, q.kx + I / 2, q.ky + Y * 0.56, I * 0.8, B.czas, 0.5 + 0.5 * Z), ctx.restore(), ctx.lineWidth = F ? 1.4 : 1, ctx.strokeStyle = F ? "rgba(214,170,96,0.95)" : jasny(0.2 + 0.35 * Z), ctx.stroke(p), F) {
      ctx.strokeStyle = "rgba(214,170,96,0.8)", ctx.beginPath();
      for (const j of [-1, 1]) {
        const e = q.kx + I / 2 + j * (I / 2 + 4);
        ctx.moveTo(e, q.ky + Y * 0.45), ctx.lineTo(e, q.ky + Y * 0.75);
      }
      ctx.stroke();
    }
    ctx.font = `italic ${Math.max(10, I * 0.13)}px ${SERIF}`, ctx.textAlign = "center", ctx.textBaseline = "alphabetic", ctx.fillStyle = jasny(0.3 + 0.2 * Z), ctx.fillText(rozmiarPomieszczenia(q.s), q.kx + I / 2, q.ky + Y - 5), ctx.restore(), napisRozstrzelony(ctx, NAZWA_POMIESZCZENIA[q.s], q.kx + I / 2, q.ky + Y + G * 1.25, G * 0.78, F ? "rgba(236,200,130,1)" : jasny(0.5 + 0.4 * Z), "center", I + i), C.push({ akcja: "szablon", szablon: q.s, x: q.kx - 3, y: q.ky - 3, w: I + 6, h: Y + k + 3 });
  }
  return C;
}
