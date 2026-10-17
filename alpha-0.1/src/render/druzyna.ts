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
import { Job, type Creature } from '../sim/creatures';
import type { Camera } from './camera';
import type { Plate, Obszar } from './plate';
import { obszarSpisu } from './plate';
import { rolaPostaci, NAZWA_ROLI_MNOGA, type Rola } from '../sim/lud';
import { czoloDrogi } from '../sim/pielgrzymka';
import { rysujPostac, wysokoscPostaci } from './figury';
import { krazek, pigment } from './fresk';
import { SERIF } from './ink';
import { FRESK } from '../nastawy/barwy';
import { POLECENIA } from '../nastawy/polecenia';
import { postepOdmowy } from './lud/odmowa';
import { wolnoRuszac } from './nastroj';
import { SZABLONY, NAZWA_POMIESZCZENIA, type RodzajPomieszczenia } from '../nastawy/pomieszczenia';

/** Kolejność medalionów pod płytą. */
export const ROLE_DRUZYNY: Rola[] = ['robotnik', 'pobozny', 'rycerz'];

/** Barwy ról (te same co dawna wstęga ludu): biel wapienna pobożnych, ugier robotników, błękit rycerzy. */
export const BARWA_ROLI: Record<Rola, [number, number, number]> = { pobozny: [246, 228, 176], robotnik: [214, 166, 104], rycerz: [168, 190, 226] };

export type AkcjaDruzyny = 'rola' | 'droga' | 'odwolaj' | 'odznacz' | 'pomieszczenia' | 'szablon' | 'koniecSzablonu';
export interface PoleDruzyny { akcja: AkcjaDruzyny; rola?: Rola; szablon?: RodzajPomieszczenia; x: number; y: number; w: number; h: number }

/** Co mówi listwa szablonów pod każdym z nich. */
const JAK_PLANOWAC: Record<RodzajPomieszczenia, string> = {
  sypialnia: 'dotknij skały obok przejścia — plan stanie pod kursorem; sen w niej zdejmuje osłabienia',
  warsztat: 'dotknij skały obok przejścia — plan stanie pod kursorem; w warsztacie złoto staje się wiarą',
  kuznia: 'dotknij skały obok przejścia — plan stanie pod kursorem; w kuźni żelazo staje się zbroją rycerza',
  korytarz: 'przeciągnij w bok od miejsca, gdzie stoi lud — korytarz na 2 kafle',
  szyb: 'przeciągnij w dół i w bok od miejsca, gdzie stoi lud — proste schody',
};

/** Fala w miejscu wydania rozkazu (zegar ekranu): złota — przyjęli, czerwona — odmówili. */
export interface FalaRozkazu { x: number; y: number; t: number; ok: boolean }

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;

/** Żywi z ludu w tej roli. */
export function ludRoli(sim: Sim, rola: Rola): Creature[] {
  return sim.creatures.filter((c) => !c.dead && rolaPostaci(c) === rola);
}

/** Gdzie leżą medaliony: na komputerze w paśmie dawnej wstęgi ludu, na telefonie pod rzędem przycisków. */
function uklad(plate: Plate, vh: number): { o: Obszar; r: number; cy: number; podpisy: boolean } {
  const o = obszarSpisu(plate, vh);
  const mt = vh - plate.bottom;
  if (plate.waski) {
    const r = 19;
    return { o: { x: plate.x + 4, y: mt + 98 - r, w: plate.w + plate.left - 12, h: r * 2 }, r, cy: mt + 98, podpisy: false };
  }
  if (plate.niski) {
    const r = Math.max(13, Math.min(19, (plate.bottom - 6) / 2));
    return { o: { ...o, y: mt + 3, h: r * 2 }, r, cy: mt + 3 + r, podpisy: false };
  }
  const r = Math.max(16, Math.min(26, o.h * 0.42));
  return { o, r, cy: o.y + o.h * 0.42, podpisy: true };
}

// Miniatury w medalionach rysujemy z zastępcy postaci — własna pamięć ruchu i pozy, żeby rysunek
// w medalionie nie mieszał się z animacją tej samej postaci na mapie.
const zastepcy = new Map<Rola, Creature>();
function zastepca(rola: Rola, wzor: Creature): Creature {
  let z = zastepcy.get(rola);
  if (!z) { z = { ...wzor }; zastepcy.set(rola, z); }
  Object.assign(z, wzor, {
    x: 0, y: 0, vy: 0, face: 1, carry: 0, fear: 0, mad: 0, job: Job.STOI,
    odmowa: undefined, naLinie: undefined, naWiadrze: undefined, wspina: undefined, ksiegaT: undefined,
  });
  return z;
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

/**
 * Pasek drużyny pod płytą. Zwraca pola do dotknięcia (medaliony i rozkazy).
 * `kursor` — gdzie jest wskaźnik (podświetlenie), `czas` — zegar ekranu (animacja miniatur).
 */
export function rysujDruzyne(
  ctx: CanvasRenderingContext2D, sim: Sim, plate: Plate, vh: number,
  zaznaczeni: ReadonlySet<number>, kursor: { x: number; y: number }, czas: number,
  szablon: RodzajPomieszczenia | null = null,
): PoleDruzyny[] {
  const { o, r, cy, podpisy } = uklad(plate, vh);
  const pola: PoleDruzyny[] = [];
  const odstep = r * 2.75;
  const rozmNazwy = Math.max(11, Math.min(14, r * 0.55));
  ctx.save();
  ROLE_DRUZYNY.forEach((rola, n) => {
    const cx = o.x + r + 6 + n * odstep;
    const lud = ludRoli(sim, rola);
    const ile = lud.length;
    const zazn = lud.filter((c) => zaznaczeni.has(c.id)).length;
    const pod = Math.hypot(kursor.x - cx, kursor.y - cy) <= r + 4;
    const stan = ile === 0 ? 'uspiony' : zazn === ile ? 'wlaczony' : pod ? 'pod' : 'zwykly';
    krazek(ctx, cx, cy, r, stan, `druzyna-${rola}`);
    // miniatura: najpierw zaznaczony z tej roli, inaczej pierwszy żywy
    const wzor = lud.find((c) => zaznaczeni.has(c.id)) ?? lud[0];
    if (wzor) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.clip();
      ctx.translate(cx, cy + r * 0.8);
      rysujPostac(ctx, sim, zastepca(rola, wzor), r * 1.5, czas, 'stoi');
      ctx.restore();
    } else {
      // nikt z tej roli już nie żyje — pusty medalion z krzyżykiem
      ctx.strokeStyle = 'rgba(214,190,150,0.45)'; ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.45); ctx.lineTo(cx, cy + r * 0.45); ctx.moveTo(cx - r * 0.3, cy - r * 0.15); ctx.lineTo(cx + r * 0.3, cy - r * 0.15); ctx.stroke();
    }
    // część roli zaznaczona — złoty łuk po obwodzie (tyle, ilu z nich)
    if (zazn > 0 && zazn < ile) {
      ctx.strokeStyle = 'rgba(246,216,142,0.95)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r + 3.5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * zazn) / ile); ctx.stroke();
    }
    // liczba w ciemnym krążku przy prawym dolnym brzegu
    const lx = cx + r * 0.74, ly = cy + r * 0.68, lr = Math.max(8, r * 0.38);
    ctx.fillStyle = 'rgba(16,10,7,0.94)';
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = zazn > 0 ? 'rgba(246,216,142,0.95)' : FRESK.sinopia; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = ile ? rgba(BARWA_ROLI[rola], 0.98) : 'rgba(226,120,100,0.9)';
    ctx.font = `bold ${Math.round(lr * 1.15)}px ${SERIF}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(ile), lx, ly + 0.5);
    if (podpisy) {
      ctx.font = `italic ${rozmNazwy}px ${SERIF}`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = rgba(BARWA_ROLI[rola], ile ? (zazn ? 0.98 : 0.8) : 0.4);
      ctx.fillText(NAZWA_ROLI_MNOGA[rola], cx, cy + r + rozmNazwy * 1.2);
    }
    pola.push({ akcja: 'rola', rola, x: cx - r - 4, y: cy - r - 4, w: r * 2 + 8, h: r * 2 + 8 });
  });

  // rozkazy dla zaznaczonych — obok medalionów
  const x0 = o.x + r + 6 + (ROLE_DRUZYNY.length - 1) * odstep + r + r * 0.9;
  const x1 = o.x + o.w;
  const zaznaczone = sim.creatures.filter((c) => !c.dead && zaznaczeni.has(c.id) && rolaPostaci(c));
  const rozm = Math.max(12, Math.min(14, r * 0.58));
  if (x1 - x0 > 60) {
    const robotnicy = zaznaczone.filter((c) => rolaPostaci(c) === 'robotnik').length;
    const opcje: { akcja: AkcjaDruzyny; tekst: string; wlaczony?: boolean }[] = [];
    if (robotnicy && czoloDrogi(sim) >= 0) opcje.push({ akcja: 'droga', tekst: 'kop drogę wiernych' });
    if (zaznaczone.some((c) => c.polecenie)) opcje.push({ akcja: 'odwolaj', tekst: 'odwołaj rozkaz' });
    if (zaznaczone.length) opcje.push({ akcja: 'odznacz', tekst: 'odznacz' });
    // etap 3c: plany pomieszczeń — zawsze pod ręką (klawisz B)
    opcje.push({ akcja: 'pomieszczenia', tekst: szablon ? 'planujesz… (B)' : 'wyznacz pomieszczenie', wlaczony: !!szablon });
    // podpowiedź nad przyciskami: co zrobi dotknięcie mapy
    const hp = Math.max(22, r * 0.95);
    const yP = podpisy ? cy - hp * 0.05 : cy - hp / 2;
    if (podpisy) {
      ctx.font = `italic ${rozm}px ${SERIF}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      if (zaznaczone.length) {
        ctx.fillStyle = 'rgba(246,216,142,0.92)';
        const ile = zaznaczone.length === 1 ? 'zaznaczony 1' : `zaznaczonych ${zaznaczone.length}`;
        ctx.fillText(`${ile} — dotknij mapy: idź tam${robotnicy ? ' (w skałę: kop; w plan: kuj)' : ''}`, x0, yP - 6, x1 - x0);
      } else {
        ctx.fillStyle = 'rgba(214,198,166,0.62)';
        ctx.fillText('dotknij postaci albo medalionu — wydasz rozkaz', x0, yP - 6, x1 - x0);
      }
    }
    let x = x0;
    for (const op of opcje) {
      ctx.font = `${rozm}px ${SERIF}`;
      const w = Math.min(x1 - x, ctx.measureText(op.tekst).width + 22);
      if (w < 40) break;
      const pod = op.wlaczony || (kursor.x >= x && kursor.x <= x + w && kursor.y >= yP && kursor.y <= yP + hp);
      pigulka(ctx, x, yP, w, hp, op.tekst, pod, rozm);
      pola.push({ akcja: op.akcja, x, y: yP - 4, w, h: hp + 8 });
      x += w + 8;
    }
  }
  // etap 3c: listwa szablonów u dołu płyty, gdy planujesz
  if (szablon) pola.push(...listwaSzablonow(ctx, plate, szablon, kursor, rozm));
  ctx.restore();
  return pola;
}

/** Listwa szablonów u dołu płyty: sypialnia, warsztat, kuźnia, korytarz, szyb i „gotowe”; nad nią — jak planować. */
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
