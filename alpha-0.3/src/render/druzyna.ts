/**
 * DRUŻYNA I ROZKAZY (Alpha, etap 2) — wszystko, co gracz widzi przy sterowaniu ludem:
 *  - pod płytą trzy medaliony z miniaturami robotnika, pobożnego i rycerza (z liczbą) — dotknięcie
 *    zaznacza wszystkich tej roli, a obok nich rozkazy dla zaznaczonych („kop drogę wiernych”, „odwołaj”, „odznacz”);
 *  - na mapie: złoty pierścień pod stopami zaznaczonych, znaczniki celów rozkazów (proporczyk „idź tam”,
 *    kilof „kop tam”, strzałki nad czołem drogi wiernych), fala w miejscu wydania rozkazu
 *    i dymek z powodem odmowy (sama odmowa — kręcenie głową — to poza w render/lud/ruch.ts).
 * Rozkazy wykonuje symulacja: src/sim/polecenia.ts; ekran gry: src/app/screens/game.ts.
 * Etap 3c: przycisk „wyznacz pomieszczenie” (klawisz B) i, gdy planujesz, listwa szablonów u dołu płyty
 * (sypialnia, warsztat, kuźnia, korytarz, szyb) — plany: src/sim/pomieszczenia.ts.
 */
import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import type { Camera } from './camera';
import type { Plate, Obszar } from './plate';
import { ukladPasa, rysujRozkazy, dymekSzczegolow } from './pas';
import { rysujKartyPostaci, wierszeSzczegolow } from './karty';
import { rysujPasTarota, wierszeTarota, wierszeTalii } from './tarot';
import { WARIANT, maObsade, maTarot } from '../nastawy/wariant';
import { rolaPostaci, type Rola } from '../sim/lud';
import { czoloDrogi } from '../sim/pielgrzymka';
import { wysokoscPostaci } from './figury';
import { pigment } from './fresk';
import { SERIF } from './ink';
import { FRESK } from '../nastawy/barwy';
import { POLECENIA } from '../nastawy/polecenia';
import { postepOdmowy, glosOdmowy } from './lud/odmowa';
import { wolnoRuszac } from './nastroj';
import { SZABLONY, NAZWA_POMIESZCZENIA, POMIESZCZENIA, type RodzajPomieszczenia } from '../nastawy/pomieszczenia';

/** Kolejność medalionów pod płytą. */
export const ROLE_DRUZYNY: Rola[] = ['robotnik', 'pobozny', 'rycerz'];

/** Barwy ról (te same co dawna wstęga ludu): biel wapienna pobożnych, ugier robotników, błękit rycerzy. */
export const BARWA_ROLI: Record<Rola, [number, number, number]> = { pobozny: [246, 228, 176], robotnik: [214, 166, 104], rycerz: [168, 190, 226] };

export type AkcjaDruzyny = 'rola' | 'droga' | 'odwolaj' | 'odznacz' | 'pomieszczenia' | 'szablon' | 'koniecSzablonu' | 'naprawa'
  // Alpha 0.3: menu rozkazów (telefon), karta postaci, „+N”, talia i karta tarota
  | 'menuRozkazow' | 'postac' | 'plusKart' | 'talia' | 'tarot';
export interface PoleDruzyny { akcja: AkcjaDruzyny; rola?: Rola; szablon?: RodzajPomieszczenia; id?: number; miejsce?: number; x: number; y: number; w: number; h: number }

/** Co mówi listwa szablonów pod każdym z nich. */
const JAK_PLANOWAC: Record<RodzajPomieszczenia, string> = {
  sypialnia: 'dotknij skały obok przejścia — plan stanie pod kursorem; sen w niej zdejmuje osłabienia',
  warsztat: 'dotknij skały obok przejścia — plan stanie pod kursorem; w warsztacie złoto staje się wiarą',
  kuznia: 'dotknij skały obok przejścia — plan stanie pod kursorem; w kuźni żelazo staje się zbroją rycerza',
  korytarz: 'przeciągnij w bok od miejsca, gdzie stoi lud — korytarz na 2 kafle',
  szyb: 'przeciągnij w dół i w bok od miejsca, gdzie stoi lud — proste schody',
  lina: `dotknij, gdzie ma wisieć hak — przy skale, której się uczepi (krawędź półki, strop, ściana); lina spadnie do podłogi; ${POMIESZCZENIA.linyDarmowe} pierwszych za darmo, potem ${POMIESZCZENIA.linaKrew} krwi`,
};

/** Fala w miejscu wydania rozkazu (zegar ekranu): złota — przyjęli, czerwona — odmówili. */
export interface FalaRozkazu { x: number; y: number; t: number; ok: boolean }

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;

/** Żywi z ludu w tej roli. */
export function ludRoli(sim: Sim, rola: Rola): Creature[] {
  return sim.creatures.filter((c) => !c.dead && rolaPostaci(c) === rola);
}

function pigulka(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tekst: string, pod: boolean, rozm: number): void {
  const p = new Path2D();
  const r = h / 2;
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  p.lineTo(x + r, y + h); p.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); p.closePath();
  // kamienna tabliczka jak krążki przycisków — na ciemnym tynku musi być widać, że to przycisk
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.save(); ctx.translate(1, 2); ctx.fill(p); ctx.restore();
  pigment(ctx, p, pod ? FRESK.krazekWlaczony : FRESK.krazek);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,226,180,0.12)'); g.addColorStop(1, 'rgba(16,8,4,0.45)');
  ctx.fillStyle = g; ctx.fill(p);
  ctx.strokeStyle = FRESK.sinopia; ctx.lineWidth = 1.6;
  ctx.stroke(p);
  ctx.strokeStyle = pod ? 'rgba(246,216,142,0.95)' : 'rgba(206,170,112,0.55)'; ctx.lineWidth = 1;
  ctx.save(); ctx.translate(0, 0); ctx.scale(1, 1);
  const q = new Path2D();
  q.moveTo(x + r, y - 2); q.lineTo(x + w - r, y - 2); q.arc(x + w - r, y + r, r + 2, -Math.PI / 2, Math.PI / 2);
  q.lineTo(x + r, y + h + 2); q.arc(x + r, y + r, r + 2, Math.PI / 2, Math.PI * 1.5); q.closePath();
  ctx.stroke(q);
  ctx.restore();
  ctx.fillStyle = pod ? '#1a0f08' : '#efe2c4';
  ctx.font = `${rozm}px ${SERIF}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(tekst, x + w / 2, y + h / 2 + 0.5, w - 8);
}

/** Alpha 0.3: stan pasa kart po stronie ekranu gry — menu rozkazów (telefon), przewinięcie pasa, otwarte szczegóły. */
export interface StanPasa {
  menu: boolean;
  przesun: number;
  szczegoly: { rodzaj: 'postac' | 'tarot' | 'talia'; id: number } | null;
}

/**
 * Pas kart pod płytą (Alpha 0.3, render/pas.ts): rozkazy, a obok karty postaci (wizja Patryka) albo medaliony,
 * talia i karty tarota (wizja Pawła); na końcu dymek szczegółów. Zwraca pola do dotknięcia.
 * `kursor` — gdzie jest wskaźnik (podświetlenie), `czas` — zegar ekranu (animacja miniatur).
 */
export function rysujDruzyne(
  ctx: CanvasRenderingContext2D, sim: Sim, plate: Plate, vh: number,
  zaznaczeni: ReadonlySet<number>, kursor: { x: number; y: number }, czas: number,
  szablon: RodzajPomieszczenia | null, stan: StanPasa,
): PoleDruzyny[] {
  const u = ukladPasa(plate, vh);
  const pola: PoleDruzyny[] = [];
  // dymek szczegółów leży nad płytą — nie na kolumnach rytów i przycisków
  const x0 = plate.x, x1 = plate.x + plate.w;
  ctx.save();
  let miejscaPostaci = new Map<number, Obszar>(), miejscaTarota = new Map<number, Obszar>();
  // pas na dole: tarot (Paweł, razem) albo karty postaci (Patryk); wersja „razem” — kafelki drużyny w lewej kolumnie
  if (maTarot(WARIANT)) {
    const r = rysujPasTarota(ctx, sim, u, zaznaczeni, kursor, czas);
    pola.push(...r.pola);
    miejscaTarota = r.miejsca;
  }
  if (maObsade(WARIANT)) {
    const r = rysujKartyPostaci(ctx, sim, u, zaznaczeni, kursor, czas, stan.przesun, u.kolumna);
    pola.push(...r.pola);
    miejscaPostaci = r.miejsca;
  }
  // rozkazy po kartach — rozwinięte menu (telefon) leży nad pasem
  pola.push(...rysujRozkazy(ctx, sim, u, zaznaczeni, kursor, czas, !!szablon, stan.menu));
  // etap 3c: listwa szablonów u dołu płyty, gdy planujesz
  if (szablon) pola.push(...listwaSzablonow(ctx, plate, szablon, kursor, 14));
  // szczegóły: przytrzymana albo wskazana myszą karta
  const sz = stan.szczegoly;
  if (sz && !stan.menu) {
    if (sz.rodzaj === 'postac') {
      const o = sim.lud.druzyna?.osoby.find((q) => q.id === sz.id);
      const m = miejscaPostaci.get(sz.id);
      // kafelek w lewej kolumnie — dymek obok niego, na płycie; karta w pasie — nad nią
      if (o && m) dymekSzczegolow(ctx, m, wierszeSzczegolow(sim, o), x0, x1, 320, !!u.kolumna);
    } else if (sz.rodzaj === 'tarot') {
      const m = miejscaTarota.get(sz.id);
      const w = wierszeTarota(sim, sz.id);
      if (m && w.length) dymekSzczegolow(ctx, m, w, x0, x1, 300);
    } else if (u.talia) dymekSzczegolow(ctx, u.talia, wierszeTalii(sim), x0, x1, 300);
  }
  ctx.restore();
  return pola;
}

/** Listwa szablonów u dołu płyty: sypialnia, warsztat, kuźnia, korytarz, szyb, lina i „gotowe”; nad nią — jak planować. */
function listwaSzablonow(ctx: CanvasRenderingContext2D, plate: Plate, szablon: RodzajPomieszczenia, kursor: { x: number; y: number }, rozm: number): PoleDruzyny[] {
  const pola: PoleDruzyny[] = [];
  const hp = Math.max(24, rozm * 1.8);
  const y = plate.y + plate.h - hp - 10;
  const opcje: { akcja: AkcjaDruzyny; tekst: string; szablon?: RodzajPomieszczenia }[] = [
    ...SZABLONY.map((s) => ({ akcja: 'szablon' as AkcjaDruzyny, tekst: NAZWA_POMIESZCZENIA[s], szablon: s })),
    { akcja: 'koniecSzablonu', tekst: 'gotowe (Esc)' },
  ];
  ctx.font = `${rozm}px ${SERIF}`;
  const szer = opcje.map((o) => ctx.measureText(o.tekst).width + 22);
  const calosc = szer.reduce((s, w) => s + w + 8, 0) + 12;
  // ciemna listwa pod przyciskami, żeby było je widać na skale
  ctx.fillStyle = 'rgba(12,8,6,0.82)';
  ctx.fillRect(plate.x + 6, y - rozm * 1.9, Math.min(plate.w - 12, Math.max(calosc, rozm * 32)), hp + rozm * 1.9 + 6);
  ctx.font = `italic ${rozm}px ${SERIF}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(246,216,142,0.92)';
  ctx.fillText(`${NAZWA_POMIESZCZENIA[szablon]}: ${JAK_PLANOWAC[szablon]} · prawy przycisk na planie — skreśl`, plate.x + 14, y - 8, plate.w - 28);
  let x = plate.x + 12;
  opcje.forEach((op, i) => {
    const w = szer[i];
    if (x + w > plate.x + plate.w - 8) return;
    const pod = op.szablon === szablon || (kursor.x >= x && kursor.x <= x + w && kursor.y >= y && kursor.y <= y + hp);
    pigulka(ctx, x, y, w, hp, op.tekst, pod, rozm);
    pola.push({ akcja: op.akcja, szablon: op.szablon, x, y: y - 4, w, h: hp + 8 });
    x += w + 8;
  });
  return pola;
}

/** Złoty pierścień pod stopami zaznaczonych (rysowany przed postaciami — leży na ziemi). */
export function rysujZaznaczenie(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number, zaznaczeni: ReadonlySet<number>): void {
  if (!zaznaczeni.size) return;
  ctx.save();
  for (const c of sim.creatures) {
    if (c.dead || !zaznaczeni.has(c.id)) continue;
    const sx = cam.toScreenX(c.x), sy = cam.toScreenY(c.y + 1);
    if (sx < -40 || sy < -40 || sx > cam.vw + 40 || sy > cam.vh + 80) continue;
    const h = wysokoscPostaci(c, cam.zoom);
    const puls = wolnoRuszac() ? 0.5 + 0.5 * Math.sin(czas * 0.005 + c.id) : 1;
    const rx = Math.max(9, h * 0.42), ry = Math.max(3, h * 0.12);
    ctx.shadowColor = 'rgba(246,206,120,0.9)'; ctx.shadowBlur = 6 + 6 * puls;
    ctx.strokeStyle = `rgba(246,216,142,${0.7 + 0.3 * puls})`;
    ctx.lineWidth = Math.max(1.6, h * 0.05);
    ctx.setLineDash([Math.max(4, rx * 0.5), Math.max(3, rx * 0.22)]);
    ctx.lineDashOffset = wolnoRuszac() ? -czas * 0.02 : 0;
    ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // znak roli nad głową: drobny romb w barwie roli
    const rola = rolaPostaci(c);
    if (rola) {
      const ty = sy - h * 1.18, t = Math.max(3, h * 0.07);
      ctx.shadowBlur = 0;
      ctx.fillStyle = rgba(BARWA_ROLI[rola], 0.95);
      ctx.beginPath(); ctx.moveTo(sx, ty - t); ctx.lineTo(sx + t * 0.8, ty); ctx.lineTo(sx, ty + t); ctx.lineTo(sx - t * 0.8, ty); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

/** Proporczyk na kiju — cel „idź tam”, wbity w podłogę. */
function proporczyk(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, barwa: string, a: number, czas: number, stoi: boolean): void {
  const wys = Math.max(14, z * 1.15), dl = Math.max(8, z * 0.6);
  const fal = wolnoRuszac() ? Math.sin(czas * 0.006 + x) : 0;
  ctx.globalAlpha = a;
  ctx.strokeStyle = 'rgba(40,24,14,0.95)'; ctx.lineWidth = Math.max(2, z * 0.09);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - wys); ctx.stroke();
  ctx.fillStyle = barwa;
  ctx.beginPath();
  ctx.moveTo(x, y - wys);
  ctx.quadraticCurveTo(x + dl * 0.5, y - wys + dl * 0.15 * fal, x + dl, y - wys + dl * 0.32);
  ctx.quadraticCurveTo(x + dl * 0.5, y - wys + dl * 0.5 + dl * 0.15 * fal, x, y - wys + dl * 0.62);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,6,0.8)'; ctx.lineWidth = 1; ctx.stroke();
  // doszedł i trzyma posterunek — kółko u stopy kija
  if (stoi) {
    ctx.strokeStyle = barwa; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(6, z * 0.45), Math.max(2, z * 0.13), 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Kilof nad kaflem — cel „kop tam”. */
function kilof(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, a: number, czas: number): void {
  const s = Math.max(10, z);
  ctx.globalAlpha = a;
  ctx.strokeStyle = 'rgba(232,170,96,0.95)'; ctx.lineWidth = 1.4;
  ctx.setLineDash([3, 3]); ctx.lineDashOffset = wolnoRuszac() ? -czas * 0.01 : 0;
  ctx.strokeRect(x - s / 2 + 1, y - s / 2 + 1, s - 2, s - 2);
  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1.8, s * 0.1); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s * 0.28, y + s * 0.3); ctx.lineTo(x + s * 0.2, y - s * 0.22); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + s * 0.2, y - s * 0.22, s * 0.3, Math.PI * 0.65, Math.PI * 1.85); ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Strzałki w dół nad czołem drogi wiernych — tam kopią na rozkaz. */
function strzalki(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, a: number, czas: number): void {
  const s = Math.max(6, z * 0.35);
  const ruch = wolnoRuszac() ? (czas * 0.002) % 1 : 0;
  ctx.strokeStyle = 'rgba(246,216,142,0.95)'; ctx.lineWidth = Math.max(1.6, z * 0.08); ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const dy = (k + ruch) * s * 0.9;
    ctx.globalAlpha = a * (1 - (k + ruch) / 2.2);
    ctx.beginPath(); ctx.moveTo(x - s, y - s * 2.6 + dy); ctx.lineTo(x, y - s * 1.8 + dy); ctx.lineTo(x + s, y - s * 2.6 + dy); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Dymek z powodem odmowy nad głową postaci. `zajete` — dymki już narysowane w tej klatce (następny nie wchodzi na nie). */
function dymek(ctx: CanvasRenderingContext2D, cam: Camera, sx: number, sy: number, tekst: string, k: number, zajete: { x: number; y: number; w: number; h: number }[]): void {
  const a = Math.min(1, k / 0.08, (1 - k) / 0.18);
  if (a <= 0) return;
  const rozm = Math.max(12, Math.min(16, cam.zoom * 0.85));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `italic ${rozm}px ${SERIF}`;
  const tw = ctx.measureText(tekst).width;
  const ikona = rozm * 1.1;
  const bw = tw + ikona + rozm * 1.3, bh = rozm * 1.9;
  const unies = wolnoRuszac() ? Math.sin(k * Math.PI * 3) * 1.5 : 0;
  let bx = sx - bw / 2;
  bx = Math.max(4, Math.min(cam.vw - bw - 4, bx));
  let by = Math.max(4, sy - bh - 10 + unies);
  // grupa odmawia naraz — dymki układają się jeden nad drugim
  for (let n = 0; n < 6 && zajete.some((z) => bx < z.x + z.w && bx + bw > z.x && by < z.y + z.h && by + bh + 8 > z.y); n++) by -= bh + 6;
  zajete.push({ x: bx, y: by, w: bw, h: bh + 8 });
  const r = bh * 0.38;
  const p = new Path2D();
  p.moveTo(bx + r, by); p.lineTo(bx + bw - r, by); p.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
  p.lineTo(bx + bw, by + bh - r); p.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
  // ogonek do głowy
  const ox = Math.max(bx + r + 4, Math.min(bx + bw - r - 4, sx));
  p.lineTo(ox + 6, by + bh); p.lineTo(ox, by + bh + 8); p.lineTo(ox - 6, by + bh);
  p.lineTo(bx + r, by + bh); p.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
  p.lineTo(bx, by + r); p.quadraticCurveTo(bx, by, bx + r, by); p.closePath();
  ctx.fillStyle = 'rgba(26,16,11,0.94)'; ctx.fill(p);
  ctx.strokeStyle = 'rgba(192,83,58,0.95)'; ctx.lineWidth = 1.5; ctx.stroke(p);
  // czerwony krzyżyk „nie”
  const ix = bx + rozm * 0.55 + ikona / 2, iy = by + bh / 2, ir = ikona * 0.36;
  ctx.strokeStyle = 'rgba(226,96,72,0.98)'; ctx.lineWidth = Math.max(1.8, rozm * 0.14); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ix - ir, iy - ir); ctx.lineTo(ix + ir, iy + ir); ctx.moveTo(ix + ir, iy - ir); ctx.lineTo(ix - ir, iy + ir); ctx.stroke();
  ctx.fillStyle = FRESK.tekst;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(tekst, bx + rozm * 0.75 + ikona, by + bh / 2 + 0.5);
  ctx.restore();
}

/**
 * Fale głosu przed twarzą (rycerz mówi odmowę na głos): trzy łuki rozchodzą się od ust, jaśniejsze, gdy mówi
 * głośniej (`g` — obwiednia nagrania, 0…1). Bez ruchu (nastrój: wolno ruszać) — stoją, tylko jaśnieją.
 */
function faleGlosu(ctx: CanvasRenderingContext2D, sx: number, sy: number, h: number, kier: number, g: number, czas: number): void {
  const x0 = sx + kier * h * 0.17;
  const krok = Math.max(3, h * 0.13);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.2, h * 0.035);
  for (let i = 0; i < 3; i++) {
    const faza = wolnoRuszac() ? ((czas * 0.004 + i / 3) % 1) : (i + 1) / 4;
    const r = krok * (0.7 + faza * 2.6);
    const a = Math.min(1, 0.25 + g * 1.1) * Math.sin(faza * Math.PI);
    if (a <= 0.02) continue;
    ctx.strokeStyle = `rgba(246,216,142,${(a * 0.9).toFixed(3)})`;
    ctx.beginPath();
    const s0 = kier > 0 ? -0.75 : Math.PI - 0.75;
    ctx.arc(x0, sy, r, s0, s0 + 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Rozkazy na mapie (po postaciach): linie od zaznaczonych do ich celów, znaczniki celów (świeże rozkazy
 * innych gasną po `POLECENIA.znacznikTikow`), fala w miejscu ostatniego rozkazu i dymki odmów.
 */
export function rysujPoleceniaNaMapie(
  ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number,
  zaznaczeni: ReadonlySet<number>, fala: FalaRozkazu | null,
): void {
  const z = cam.zoom;
  const w = sim.world;
  ctx.save();
  let czolo = false;
  const dymki: { x: number; y: number; w: number; h: number }[] = [];
  for (const c of sim.creatures) {
    if (c.dead || !rolaPostaci(c)) continue;
    const p = c.polecenie;
    if (p) {
      const wybrany = zaznaczeni.has(c.id);
      const swiezy = 1 - (sim.tick - p.od) / POLECENIA.znacznikTikow;
      const a = wybrany ? 1 : p.na ? 0 : Math.max(0, swiezy);
      if (a > 0.02) {
        const barwa = rgba(BARWA_ROLI[rolaPostaci(c)!], 0.95);
        const tx = p.typ === 'droga' ? -1 : cam.toScreenX(p.x + 0.5);
        if (wybrany && p.typ !== 'droga') {
          // przerywana nić od postaci do celu
          ctx.strokeStyle = 'rgba(246,216,142,0.42)'; ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 5]); ctx.lineDashOffset = wolnoRuszac() ? -czas * 0.015 : 0;
          ctx.beginPath(); ctx.moveTo(cam.toScreenX(c.x), cam.toScreenY(c.y + 0.4));
          ctx.lineTo(tx, cam.toScreenY(p.y + (p.typ === 'kop' ? 0.5 : 0.9))); ctx.stroke();
          ctx.setLineDash([]);
        }
        if (p.typ === 'idz') proporczyk(ctx, tx, cam.toScreenY(p.y + 1), z, barwa, a, czas, !!p.na);
        else if (p.typ === 'kop') { if (w.solid(p.x, p.y)) kilof(ctx, tx, cam.toScreenY(p.y + 0.5), z, a, czas); }
        else czolo = true;
      }
    }
    // dymek odmowy
    const k = postepOdmowy(sim, c, czas);
    if (k !== null && c.odmowa) {
      const h = wysokoscPostaci(c, z);
      dymek(ctx, cam, cam.toScreenX(c.x), cam.toScreenY(c.y + 1) - h * 1.1, c.odmowa.tekst, k, dymki);
      // rycerz mówi odmowę na głos — przed twarzą biją fale w rytm słów
      const g = glosOdmowy(c, czas);
      if (g !== null) faleGlosu(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y + 1) - h * 0.8, h, c.face < 0 ? -1 : 1, g, czas);
    }
  }
  // czoło drogi wiernych, gdy ktoś kopie ją na rozkaz
  if (czolo) {
    const cz = czoloDrogi(sim);
    if (cz >= 0) strzalki(ctx, cam.toScreenX((cz % w.w) + 0.5), cam.toScreenY((cz / w.w) | 0), z, 1, czas);
  }
  // fala w miejscu wydania rozkazu
  if (fala) {
    const t = (performance.now() - fala.t) / 650;
    if (t >= 0 && t < 1) {
      const fx = cam.toScreenX(fala.x), fy = cam.toScreenY(fala.y);
      ctx.strokeStyle = fala.ok ? `rgba(246,216,142,${0.9 * (1 - t)})` : `rgba(226,96,72,${0.9 * (1 - t)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(fx, fy, 6 + t * z * 1.6, (6 + t * z * 1.6) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}
