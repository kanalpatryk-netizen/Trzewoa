/**
 * KRĄG TRZECI — świat dookoła trzewi (beta, 2. podejście po uwagach użytkownika: „gdzie każdy potępiony, czemu nie
 * jest to w formie żadnego kręgu… Cerber w Boskiej Komedii nie był w żadnym lochu zamknięty”):
 *  - LEJ: nad powierzchnią widać wnętrze leja piekła — tarasy wyższych kręgów jak rzędy amfiteatru (II — wicher
 *    zmysłowych, I — Otchłań z blaskiem zamku), a po prawej krawędź naszego tarasu i przepaść do kręgu czwartego;
 *  - TŁUM: cały taras trzeciego kręgu zalegają żarłocy — leżą twarzą w błocie, siedzą skuleni, czołgają się, wyją;
 *  - CERBER krąży po kręgu (sim/krag.ts: cerberNaPowierzchni) i szarpie potępionych;
 *  - TRZEWIA: w ścianach wykutych korytarzy tkwią wciągani przez ziemię żarłocy — twarze, ręce, brzuchy.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { SURFACE_Y } from '../sim/world';
import { cerberNaPowierzchni, ulewa } from '../sim/krag';
import { szum1, pasChmur, blyskawica, luna, piorun, iskry, wygladzUlewe } from './pieklo';
import { ukladKatedry } from './katedra';
import { wysokoscGrzbietu } from './grzbiet';
import { wolnoRuszac } from './nastroj';
import { rysujCerbera, pozaCerbera } from './cerber';
import { bloczekWiadra, placKonwoju } from './konwoj';
import { scenaZabijania } from './zabijanie';
import { ustawienia } from '../core/settings-store';

const TUSZ = 'rgba(14,10,8,0.95)';
const los = (n: number): number => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Wstęp (app/wstep-kregu.ts) przesuwa zegar Cerbera, gdy symulacja stoi. */
export const WIDOK_KREGU = { tik: null as number | null, tlum: true };
// podgląd (zrzuty, narzędzia): ten sam obiekt z okna — moduł bywa wczytany pod innym adresem (HMR)
if (typeof window !== 'undefined') (window as unknown as { __widokKregu?: typeof WIDOK_KREGU }).__widokKregu = WIDOK_KREGU;

/** Grunt powierzchni (y kafli) w kolumnie x. */
export function gruntKregu(sim: Sim, x: number): number {
  return SURFACE_Y - wysokoscGrzbietu(sim.world, Math.max(0, Math.min(sim.world.w - 1, Math.floor(x))));
}

// ---------------------------------------------------------------- lej piekła

/** Rzędy leja: [wysokość półki nad naszym tarasem (kafle), wygięcie ku brzegom kadru, nazwa]. */
const RZEDY: [number, number, 'otchlan' | 'limbus' | 'wicher' | 'trzeci'][] = [
  [66, 74, 'otchlan'],
  [49, 54, 'limbus'],
  [32, 35, 'wicher'],
  [15, 16, 'trzeci'],
];
/** Ściana każdego rzędu: [góra (chłodny kamień w burzy), dół (rozgrzany łuną z dna)]. */
const SCIANY: [[number, number, number], [number, number, number]][] = [
  [[20, 18, 22], [76, 28, 19]],
  [[24, 21, 25], [98, 34, 21]],
  [[29, 25, 28], [122, 42, 24]],
  [[34, 29, 30], [146, 52, 27]],
];

/**
 * Wnętrze leja piekła nad tarasem trzeciego kręgu (po rycinie świata, przed resztą). Patrzymy z wnętrza misy:
 * rzędy wyższych kręgów wyginają się w górę ku brzegom kadru, poszarpane jak urwiska u Gustave'a Doré, od spodu
 * rozgrzane czerwoną łuną niższych kręgów. Na półkach tłumy potępionych: w Przedsionku biegną za chorągwią,
 * w Otchłani stoi szlachetny zamek w bladym świetle, nad kręgiem II huczy wicher i niesie ciała zmysłowych,
 * na drugim brzegu naszego kręgu leżą w błocie żarłocy. Nad wszystkim burzowy strop, z którego leje i bije piorun.
 */
export function rysujLej(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const yG = cam.toScreenY(SURFACE_Y - 1.5);
  if (yG <= 0) return;
  const ruch = wolnoRuszac();
  const t = ruch ? teraz / 1000 : 0;
  const W = cam.vw, z = cam.zoom;
  const cxS = cam.toScreenX(sim.world.w / 2);
  const par = 0.35;                                   // paralaksa: tło jedzie wolniej niż świat
  const zz = z * (1 - par);                           // pikseli na kafel w leju
  const yS = cam.toScreenY(SURFACE_Y);
  const Y = (wy: number): number => yS + (wy - SURFACE_Y) * zz;
  const u = wygladzUlewe(ulewa(sim), teraz);
  const L = luna(teraz);
  const b = blyskawica(teraz, u);
  const fx = (x: number): number => (x - cxS) / zz;   // współrzędna leja: kafle od środka (cechy skały jadą z nim)
  const gora = (r: number, x: number): number => {
    const [h, wyg] = RZEDY[r];
    const uu = (x - cxS) / Math.max(1, W * 0.75);
    const k = fx(x);
    const zab = (szum1(k * 0.42, r * 7 + 1) - 0.5) * 3 + (szum1(k * 1.6, r * 7 + 3) - 0.5) * 1.1 + (szum1(k * 5.2, r * 7 + 5) - 0.5) * 0.35;
    return Y(SURFACE_Y - h) - uu * uu * wyg * zz - zab * zz;
  };
  const KROK = 8;
  const xs: number[] = [];
  for (let x = -KROK * 2; x <= W + KROK * 2; x += KROK) xs.push(x);
  const krawedz = xs.map(() => 0);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, yG); ctx.clip();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // ciemność nad lejem (skalny strop ziemi), w dół coraz mocniej czerwona łuna niższych kręgów
  const tlo = ctx.createLinearGradient(0, Math.min(0, Y(SURFACE_Y - 90)), 0, yG);
  tlo.addColorStop(0, 'rgb(2,2,4)');
  tlo.addColorStop(0.45, 'rgb(9,6,9)');
  tlo.addColorStop(0.78, `rgb(${(36 * L) | 0},${(13 * L) | 0},${(11 * L) | 0})`);
  tlo.addColorStop(1, `rgb(${(104 * L) | 0},${(32 * L) | 0},${(15 * L) | 0})`);
  ctx.fillStyle = tlo; ctx.fillRect(0, 0, W, yG);
  // rzędy kręgów, od najdalszego
  for (let r = 0; r < RZEDY.length; r++) {
    const nazwa = RZEDY[r][2];
    const gr = xs.map((x) => gora(r, x));
    const dol = r + 1 < RZEDY.length ? xs.map((x) => gora(r + 1, x)) : xs.map(() => yG + 2);
    for (let i = 0; i < xs.length; i++) krawedz[i] = gr[i];
    // ściana pod półką
    ctx.beginPath();
    xs.forEach((x, i) => (i ? ctx.lineTo(x, gr[i]) : ctx.moveTo(x, gr[i])));
    for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], dol[i]);
    ctx.closePath();
    const iS = Math.round((cxS + KROK * 2) / KROK);
    const yA = gr[Math.max(0, Math.min(xs.length - 1, iS))], yB = dol[Math.max(0, Math.min(xs.length - 1, iS))];
    const [kg, kd] = SCIANY[r];
    const g = ctx.createLinearGradient(0, yA, 0, Math.max(yA + 1, yB));
    g.addColorStop(0, `rgb(${kg[0]},${kg[1]},${kg[2]})`);
    g.addColorStop(0.5, `rgb(${(kg[0] * 1.1 + kd[0] * 0.12) | 0},${(kg[1] * 1.05 + kd[1] * 0.08) | 0},${(kg[2] * 1.05 + kd[2] * 0.06) | 0})`);
    g.addColorStop(0.82, `rgb(${((kg[0] + kd[0]) * 0.5) | 0},${((kg[1] + kd[1]) * 0.48) | 0},${((kg[2] + kd[2]) * 0.48) | 0})`);
    g.addColorStop(1, `rgb(${(kd[0] * L) | 0},${(kd[1] * L) | 0},${(kd[2] * L) | 0})`);
    ctx.fillStyle = g; ctx.fill();
    ctx.save();
    // cień nawisu tuż pod krawędzią półki
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    xs.forEach((x, i) => (i ? ctx.lineTo(x, gr[i]) : ctx.moveTo(x, gr[i])));
    for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], gr[i] + zz * (0.9 + 0.8 * szum1(fx(xs[i]) * 0.9, r + 40)));
    ctx.closePath(); ctx.fill();
    // warstwy skały (poziome uskoki) i pionowe rysy — miejsca stałe w leju, jadą z paralaksą
    ctx.strokeStyle = 'rgba(6,3,3,0.38)'; ctx.lineWidth = 1;
    for (const f of [0.28, 0.52, 0.74]) {
      ctx.beginPath();
      xs.forEach((x, i) => {
        const y = gr[i] + (dol[i] - gr[i]) * (f + (szum1(fx(x) * 0.6, r * 13 + f * 10) - 0.5) * 0.12);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    const k0 = Math.floor(fx(-20)), k1 = Math.ceil(fx(W + 20));
    const lico = `rgba(${(220 * L) | 0},${(90 * L) | 0},${(50 * L) | 0},0.07)`;
    // filary skały (jak bazaltowe organy): jasne lico od łuny, ciemny bok — urwisko, nie gładka wstęga
    for (let k = Math.floor(k0 / 2) * 2; k <= k1; k += 2) {
      const s = los(k * 13 + r * 3);
      if (s > 0.45) continue;
      const x = cxS + (k + los(k * 5 + r) * 1.6) * zz;
      const i = Math.max(0, Math.min(xs.length - 1, Math.round((x + KROK * 2) / KROK)));
      const sz = zz * (0.9 + s * 3.5);
      const y0 = gr[i] + zz * 0.3 + (dol[i] - gr[i]) * los(k * 41 + r) * 0.35, y1 = dol[i] - (dol[i] - gr[i]) * los(k * 43 + r) * 0.3;
      if (y1 - y0 < 4) continue;
      ctx.fillStyle = lico; ctx.fillRect(x, y0 + (y1 - y0) * 0.35, sz * 0.45, (y1 - y0) * 0.65);
      ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(x + sz * 0.45, y0, sz * 0.4, y1 - y0);
    }
    for (let k = k0; k <= k1; k++) {
      if (los(k * 31 + r * 7) > 0.32) continue;
      const x = cxS + (k + los(k * 3 + r)) * zz;
      const i = Math.max(0, Math.min(xs.length - 1, Math.round((x + KROK * 2) / KROK)));
      const y0 = gr[i] + zz * 0.8, y1 = dol[i] - 2;
      if (y1 - y0 < 6) continue;
      const dl = (y1 - y0) * (0.35 + los(k * 13 + r) * 0.6);
      ctx.strokeStyle = 'rgba(4,2,2,0.5)'; ctx.lineWidth = Math.max(1, zz * 0.12);
      ctx.beginPath(); ctx.moveTo(x, y0);
      ctx.lineTo(x + (los(k * 5) - 0.5) * zz * 0.8, y0 + dl * 0.5);
      ctx.lineTo(x + (los(k * 9) - 0.5) * zz * 1.2, y0 + dl);
      ctx.stroke();
      // mokre lico obok rysy łapie łunę
      ctx.strokeStyle = `rgba(${150 * L | 0},${60 * L | 0},${34 * L | 0},0.16)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 1.5, y0 + dl * 0.45); ctx.lineTo(x + 1.5 + (los(k * 9) - 0.5) * zz * 1.2, y0 + dl); ctx.stroke();
    }
    // smugi deszczu spływające po ścianie (ciemne zacieki)
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let k = k0; k <= k1; k++) {
      if (los(k * 17 + r * 5) > 0.22) continue;
      const x = cxS + (k + los(k * 19)) * zz;
      const i = Math.max(0, Math.min(xs.length - 1, Math.round((x + KROK * 2) / KROK)));
      const y0 = gr[i] + (dol[i] - gr[i]) * los(k * 23) * 0.3;
      ctx.fillRect(x, y0, Math.max(1, zz * (0.1 + los(k * 29) * 0.25)), (dol[i] - y0) * (0.25 + los(k) * 0.5));
    }
    ctx.restore();
    // krawędź półki: sine światło burzy z góry
    ctx.strokeStyle = `rgba(150,146,160,${0.2 + 0.5 * b.a})`; ctx.lineWidth = Math.max(1, zz * 0.1);
    ctx.beginPath();
    xs.forEach((x, i) => (i ? ctx.lineTo(x, gr[i]) : ctx.moveTo(x, gr[i])));
    ctx.stroke();
    // życie na półkach
    if (nazwa === 'otchlan') przedsionek(ctx, xs, gr, zz, t, cxS);
    else if (nazwa === 'limbus') limbus(ctx, xs, gr, zz, t, cxS, b.a);
    else if (nazwa === 'wicher') wicher(ctx, xs, gr, zz, t, W, cxS);
    else zarlocyNaDrugimBrzegu(ctx, xs, gr, zz, t, cxS, L, b.a);
  }
  // mgła i deszcz w głębi: łuna dna rozlewa się nad horyzontem
  const mg = ctx.createLinearGradient(0, yG - zz * 16, 0, yG);
  mg.addColorStop(0, 'rgba(70,24,14,0)'); mg.addColorStop(1, `rgba(${(120 * L) | 0},${(40 * L) | 0},${(18 * L) | 0},0.55)`);
  ctx.fillStyle = mg; ctx.fillRect(0, yG - zz * 16, W, zz * 16);
  // (łuna dna jest już w tle i w mgle nad horyzontem — bez osobnej poświaty „lighter”: w programowym rysowaniu droga)
  const Hs = yG;
  // zasłony deszczu zwisające z chmur — trzy, szerokie
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const x = ((los(i * 41) * W * 1.4 + t * (8 + 5 * los(i)) + cam.x * z * 0.1) % (W * 1.4)) - W * 0.2;
    const sz = W * (0.1 + los(i * 7) * 0.12);
    const y0 = Hs * 0.25, y1 = yG;
    ctx.fillStyle = `rgba(120,124,140,${0.04 + 0.05 * u})`;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + sz, y0); ctx.lineTo(x + sz - (y1 - y0) * 0.25, y1); ctx.lineTo(x - (y1 - y0) * 0.25, y1); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // błysk: cały lej na mgnienie widać jak za dnia, sino
  if (b.a > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(80,90,120,${0.42 * b.a})`;
    ctx.fillRect(0, 0, W, yG);
    ctx.restore();
  }
  // burzowy strop i strzępy chmur (przyklejone do górnej części nieba — widać je i z bliska, i z daleka)
  const dx = t * 7 + cam.x * z * 0.12;
  pasChmur(ctx, W, -Hs * 0.2, Hs * 0.38, dx, 1.25, 1);
  pasChmur(ctx, W, Hs * 0.1, Hs * 0.5, dx * 1.9 + 300, 0.8, 0.38 + 0.22 * u);
  if (b.a > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    pasChmur(ctx, W, -Hs * 0.2, Hs * 0.38, dx, 1.25, 0.65 * b.a);
    ctx.restore();
    // piorun z chmur w półkę
    if (b.f < 0.42) {
      const x0 = b.x * W;
      const i = Math.max(0, Math.min(xs.length - 1, Math.round((x0 + KROK * 2) / KROK)));
      piorun(ctx, x0, Hs * 0.3, Math.min(yG, krawedz[i] + 4), b.a, b.nr, Math.max(1.2, zz * 0.12));
    }
  }
  // iskry z otchłani: żar wznosi się nad horyzontem
  iskry(ctx, 0, W, yG - Math.min(yG, zz * 24), yG, Math.round(W / 34), t, 3);
  ctx.restore();
}

const SKORA_TLUM = (a: number): string => `rgba(196,170,150,${a})`;

/** Przedsionek: nijacy biegną gęsiego za białą chorągwią (pieśń III), wzdłuż Acheronu. */
function przedsionek(ctx: CanvasRenderingContext2D, xs: number[], gr: number[], zz: number, t: number, cxS: number): void {
  const n = xs.length;
  const naKrawedzi = (x: number): number => {
    const i = Math.max(0, Math.min(n - 1, Math.round((x - xs[0]) / (xs[1] - xs[0]))));
    return gr[i];
  };
  const dl = 160;
  const czolo = ((t * 3.2) % dl) - dl / 2;
  ctx.lineWidth = Math.max(1, zz * 0.16);
  for (let j = 0; j < 90; j++) {
    const k = czolo - 1.2 - j * 0.55 - los(j) * 0.4;
    const x = cxS + k * zz;
    if (x < -10 || x > xs[n - 1]) continue;
    const y = naKrawedzi(x);
    const bieg = Math.sin(t * 9 + j * 1.7);
    ctx.strokeStyle = SKORA_TLUM(0.5);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bieg * zz * 0.25, y - zz * 0.7); ctx.lineTo(x + zz * 0.15, y - zz * 1.25); ctx.stroke();
    ctx.fillStyle = SKORA_TLUM(0.55);
    ctx.fillRect(x + zz * 0.05, y - zz * 1.55, Math.max(1, zz * 0.28), Math.max(1, zz * 0.28));
  }
  // chorągiew na czele
  const xc = cxS + czolo * zz;
  const yc = naKrawedzi(xc);
  ctx.strokeStyle = 'rgba(150,140,130,0.7)'; ctx.lineWidth = Math.max(1, zz * 0.1);
  ctx.beginPath(); ctx.moveTo(xc, yc); ctx.lineTo(xc, yc - zz * 3.2); ctx.stroke();
  ctx.fillStyle = 'rgba(226,222,210,0.75)';
  ctx.beginPath(); ctx.moveTo(xc, yc - zz * 3.2);
  ctx.quadraticCurveTo(xc + zz * 0.9, yc - zz * (3 + 0.3 * Math.sin(t * 6)), xc + zz * 1.8, yc - zz * 2.9);
  ctx.lineTo(xc + zz * 1.7, yc - zz * 2.3); ctx.quadraticCurveTo(xc + zz * 0.9, yc - zz * (2.5 + 0.3 * Math.sin(t * 6 + 1)), xc, yc - zz * 2.4);
  ctx.closePath(); ctx.fill();
}

/** Otchłań (krąg I): szlachetny zamek o siedmiu murach w półkuli bladego światła, nieruchome cienie mędrców. */
function limbus(ctx: CanvasRenderingContext2D, xs: number[], gr: number[], zz: number, t: number, cxS: number, blysk: number): void {
  const n = xs.length;
  const naKrawedzi = (x: number): number => gr[Math.max(0, Math.min(n - 1, Math.round((x - xs[0]) / (xs[1] - xs[0]))))];
  const x = cxS - 38 * zz;
  if (x < -zz * 30 || x > xs[n - 1] + zz * 30) return;
  const y = naKrawedzi(x);
  // półkula światła
  const R = zz * 13;
  const gl = ctx.createRadialGradient(x, y, zz * 2, x, y, R);
  gl.addColorStop(0, `rgba(236,224,180,${0.3 + 0.03 * Math.sin(t)})`); gl.addColorStop(0.6, 'rgba(200,190,150,0.1)'); gl.addColorStop(1, 'rgba(200,190,150,0)');
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(x, y, R, Math.PI, Math.PI * 2); ctx.fill();
  // zamek: siedem murów (schodkami), baszty
  ctx.fillStyle = `rgba(${26 + 60 * blysk | 0},${24 + 60 * blysk | 0},${26 + 66 * blysk | 0},0.96)`;
  for (let m = 0; m < 3; m++) {
    const sz = zz * (9 - m * 2.4), wy = zz * (1.1 + m * 0.9);
    ctx.fillRect(x - sz / 2, y - wy, sz, wy);
    for (let b = 0; b <= 4; b++) {
      const bx = x - sz / 2 + (sz * b) / 4;
      ctx.fillRect(bx - zz * 0.35, y - wy - zz * (0.9 + 0.3 * (b % 2)), zz * 0.7, zz * (0.9 + 0.3 * (b % 2)) + 1);
    }
  }
  ctx.fillRect(x - zz * 0.5, y - zz * 5.4, zz, zz * 1.8);
  ctx.beginPath(); ctx.moveTo(x - zz * 0.7, y - zz * 5.4); ctx.lineTo(x, y - zz * 6.6); ctx.lineTo(x + zz * 0.7, y - zz * 5.4); ctx.fill();
  // okna świecą
  ctx.fillStyle = 'rgba(246,226,170,0.7)';
  for (let i = 0; i < 6; i++) ctx.fillRect(x - zz * 3 + i * zz * 1.2, y - zz * 1.9, Math.max(1, zz * 0.18), Math.max(1, zz * 0.3));
  // cienie mędrców na łące przed zamkiem
  ctx.fillStyle = 'rgba(30,28,30,0.8)';
  for (let i = 0; i < 26; i++) {
    const px = x - zz * 14 + i * zz * 1.1 + los(i * 7) * zz * 0.5;
    if (Math.abs(px - x) < zz * 5) continue;
    const py = naKrawedzi(px);
    ctx.fillRect(px, py - zz * 1.3, Math.max(1, zz * 0.3), zz * 1.3);
    ctx.fillRect(px - zz * 0.02, py - zz * 1.65, Math.max(1, zz * 0.32), Math.max(1, zz * 0.32));
  }
}

/**
 * Krąg II: „piekielny wicher, który nie ustaje, niesie duchy w swym porywie, kręci nimi i bije” (pieśń V) — pas burzy
 * nad półką, smugi wiatru i setki ciał koziołkujących w powietrzu, jak szpaki stadem.
 */
function wicher(ctx: CanvasRenderingContext2D, xs: number[], gr: number[], zz: number, t: number, W: number, cxS: number): void {
  const n = xs.length;
  const naKrawedzi = (x: number): number => gr[Math.max(0, Math.min(n - 1, Math.round((x - xs[0]) / (xs[1] - xs[0]))))];
  const srodek = (x: number): number => naKrawedzi(x) - zz * 6.5;
  // ciemny pas wichru
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,12,0.25)';
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const y = srodek(xs[i]) - zz * (4 + Math.sin(xs[i] * 0.01 + t * 0.7) * 1.2); if (i) ctx.lineTo(xs[i], y); else ctx.moveTo(xs[i], y); }
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(xs[i], srodek(xs[i]) + zz * (3.5 + Math.sin(xs[i] * 0.013 + t * 0.9) * 1.2));
  ctx.closePath(); ctx.fill();
  // smugi wiatru
  for (let i = 0; i < 18; i++) {
    const p = (t * 0.07 * (0.7 + los(i) * 0.7) + los(i * 5)) % 1;
    const x = -W * 0.3 + p * W * 1.6;
    const y = srodek(x) + (los(i * 9) - 0.5) * zz * 7 + Math.sin(t * 0.9 + i) * zz;
    const dl = zz * (10 + los(i * 3) * 12);
    ctx.strokeStyle = `rgba(196,190,206,${0.08 + 0.1 * los(i * 11)})`; ctx.lineWidth = Math.max(1, zz * (0.08 + 0.1 * los(i)));
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - dl * 0.3, y - zz * 1.4, x - dl * 0.6, y + zz * 1.6, x - dl, y + Math.sin(i) * zz);
    ctx.stroke();
  }
  // ciała niesione wichrem
  const ile = Math.min(220, Math.round(W / Math.max(2.5, zz * 0.45)));
  ctx.lineCap = 'round';
  for (let i = 0; i < ile; i++) {
    const v = zz * (2.5 + los(i * 3) * 3.5);
    const x = ((los(i) * W * 1.5 + t * v) % (W * 1.5)) - W * 0.25;
    const y = srodek(x) + Math.sin(x * 0.012 + i * 0.7 + t * 1.3) * zz * 2.6 + (los(i * 7) - 0.5) * zz * 6;
    const kat = t * (1.5 + los(i * 13) * 3) * (i % 2 ? 1 : -1) + i;
    const s = zz * (1.05 + los(i * 17) * 0.6);
    const a = 0.4 + 0.35 * los(i * 19);
    const c = Math.cos(kat), sn = Math.sin(kat);
    // oś ciała: od głowy (−) do bioder (+); kończyny rozrzucone wichrem, machają
    const P = (d: number, b: number): [number, number] => [x + c * d * s - sn * b * s, y + sn * d * s + c * b * s];
    const mach = Math.sin(t * 7 + i * 1.3) * 0.18;
    const kark = P(-0.32, 0), biodra = P(0.28, 0);
    ctx.strokeStyle = SKORA_TLUM(a); ctx.lineWidth = Math.max(1, s * 0.17);
    ctx.beginPath();
    ctx.moveTo(kark[0], kark[1]); ctx.lineTo(biodra[0], biodra[1]);
    const n1 = P(0.78, 0.22 + mach), n2 = P(0.74, -0.2 - mach);
    ctx.moveTo(biodra[0], biodra[1]); ctx.lineTo(n1[0], n1[1]);
    ctx.moveTo(biodra[0], biodra[1]); ctx.lineTo(n2[0], n2[1]);
    const r1 = P(-0.05, 0.42 - mach), r2 = P(-0.55, -0.32 + mach);
    ctx.moveTo(kark[0], kark[1]); ctx.lineTo(r1[0], r1[1]);
    ctx.moveTo(kark[0], kark[1]); ctx.lineTo(r2[0], r2[1]);
    ctx.stroke();
    const gl = P(-0.5, 0);
    ctx.fillStyle = SKORA_TLUM(a);
    ctx.beginPath(); ctx.arc(gl[0], gl[1], Math.max(0.9, s * 0.15), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Drugi brzeg naszego kręgu: żarłocy leżą w błocie gęsto jak ściernisko, kałuże łapią łunę i błysk. */
function zarlocyNaDrugimBrzegu(ctx: CanvasRenderingContext2D, xs: number[], gr: number[], zz: number, t: number, cxS: number, L: number, blysk: number): void {
  const n = xs.length;
  const naKrawedzi = (x: number): number => gr[Math.max(0, Math.min(n - 1, Math.round((x - xs[0]) / (xs[1] - xs[0]))))];
  const k0 = Math.floor((xs[0] - cxS) / zz), k1 = Math.ceil((xs[n - 1] - cxS) / zz);
  for (let k = k0; k <= k1; k++) {
    const x = cxS + (k + los(k * 7)) * zz;
    const y = naKrawedzi(x);
    // kałuża
    if (los(k * 23) < 0.18) {
      ctx.fillStyle = `rgba(${(130 * L + 120 * blysk) | 0},${(44 * L + 120 * blysk) | 0},${(26 + 140 * blysk) | 0},0.45)`;
      ctx.beginPath(); ctx.ellipse(x, y + zz * 0.2, zz * (1 + los(k) * 1.6), zz * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    }
    // ciało: leży (najczęściej), klęczy albo siedzi skulone
    const r = los(k * 11);
    ctx.fillStyle = SKORA_TLUM(0.55);
    if (r < 0.55) {
      ctx.beginPath(); ctx.ellipse(x, y - zz * 0.15, zz * 0.55, zz * 0.17, (los(k) - 0.5) * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + zz * 0.62, y - zz * 0.16, zz * 0.15, 0, Math.PI * 2); ctx.fill();
    } else if (r < 0.8) {
      const kol = Math.sin(t * 1.2 + k) * 0.1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(kol);
      ctx.fillRect(-zz * 0.14, -zz * 0.95, zz * 0.3, zz * 0.95);
      ctx.beginPath(); ctx.arc(0, -zz * 1.1, zz * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

/** Prawa krawędź tarasu: przepaść do kręgu czwartego, w dole żarzy się miasto Dis (po rycinie, nad lejem). */
export function rysujPrzepasc(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world, z = cam.zoom;
  const xk = w.w - 9;
  const sx = cam.toScreenX(xk);
  if (sx > cam.vw + 4) return;
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  const L = luna(teraz);
  const yTop = cam.toScreenY(gruntKregu(sim, xk - 1) - 0.2);
  ctx.save();
  // urwisko: poszarpana krawędź tarasu, za nią ciemność z łuną z dołu
  ctx.beginPath();
  ctx.moveTo(sx, Math.max(-10, yTop));
  for (let i = 0; i <= 40; i++) {
    const wy = gruntKregu(sim, xk) + i * 6;
    ctx.lineTo(sx + (los(i * 17) - 0.3) * z * 1.6 + i * z * 0.25, cam.toScreenY(wy));
  }
  ctx.lineTo(cam.vw + 50, cam.toScreenY(gruntKregu(sim, xk) + 240));
  ctx.lineTo(cam.vw + 50, Math.max(-10, yTop - z * 20));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, yTop - z * 20, 0, yTop + z * 160);
  g.addColorStop(0, 'rgb(8,6,8)'); g.addColorStop(0.35, 'rgb(22,9,8)'); g.addColorStop(0.7, `rgb(${(90 * L) | 0},${(24 * L) | 0},12)`); g.addColorStop(1, `rgb(${(170 * L) | 0},${(52 * L) | 0},16)`);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(150,90,70,0.45)'; ctx.lineWidth = Math.max(1, z * 0.1); ctx.stroke();
  ctx.clip();
  // w dole: mury i wieże miasta Dis, rozpalone do czerwoności (pieśń VIII: „meczety… czerwone, jakby z ognia wyszły”)
  const yD = yTop + z * 120;
  ctx.fillStyle = 'rgba(16,6,6,0.95)';
  for (let i = 0; i < 26; i++) {
    const bx = sx + z * (2 + i * 1.6 + los(i) * 0.8);
    const bh = z * (3 + los(i * 3) * 9);
    ctx.fillRect(bx, yD - bh, z * (0.8 + los(i * 5) * 0.9), bh + z * 60);
    if (los(i * 7) < 0.4) { ctx.beginPath(); ctx.moveTo(bx - z * 0.2, yD - bh); ctx.lineTo(bx + z * 0.5, yD - bh - z * 1.6); ctx.lineTo(bx + z * 1.2, yD - bh); ctx.fill(); }
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    if (los(i * 11) > 0.6) continue;
    const bx = sx + z * (2.3 + i * 1.6 + los(i) * 0.8), by = yD - z * (2 + los(i * 3) * 6);
    ctx.fillStyle = `rgba(255,${(90 + 60 * los(i)) | 0},30,${0.5 + 0.3 * Math.sin(t * 3 + i)})`;
    ctx.fillRect(bx, by, Math.max(1, z * 0.25), Math.max(1, z * 0.4));
  }
  const r = z * 46, ly = yD;
  const lg = ctx.createRadialGradient(sx + z * 18, ly, 0, sx + z * 18, ly, r);
  lg.addColorStop(0, `rgba(255,90,30,${(0.42 + 0.08 * Math.sin(t * 1.7)) * L})`); lg.addColorStop(0.4, 'rgba(200,50,20,0.18)'); lg.addColorStop(1, 'rgba(200,70,30,0)');
  ctx.fillStyle = lg; ctx.fillRect(sx - r, ly - r, r * 3, r * 2);
  ctx.restore();
  // dym kłębami w górę i iskry
  ctx.fillStyle = 'rgba(30,14,12,0.35)';
  for (let i = 0; i < 12; i++) {
    const f = ((t * 0.05 + los(i * 3)) % 1);
    const cx = sx + z * (4 + los(i) * 26) + Math.sin(t * 0.4 + i) * z * 2, cy = yD - f * z * 110;
    ctx.beginPath(); ctx.arc(cx, cy, z * (2 + f * 6), 0, Math.PI * 2); ctx.fill();
  }
  iskry(ctx, sx, sx + z * 40, yTop, yD, 40, t, 7);
  // deszcz spada w przepaść
  ctx.strokeStyle = 'rgba(170,150,150,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const x = sx + los(i * 7) * z * 20, y = yTop + ((los(i * 3) * z * 120 + t * 500) % (z * 120));
    ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 10);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- tłum żarłoków

/** Jeden żarłok w błocie, stopami/biodrem w (0, 0), wzrost h (piksele). `typ` 0…4, `t` — czas (s), `ziarno`. */
export function zarlok(ctx: CanvasRenderingContext2D, h: number, typ: number, t: number, ziarno: number, kier = 1): void {
  const skora = `rgb(${132 + (ziarno % 3) * 8},${124 + (ziarno % 5) * 4},${104})`;
  const bloto = 'rgba(46,42,30,0.95)';
  const lw = Math.max(0.8, h * 0.05);
  ctx.save();
  ctx.scale(kier, 1);
  ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const fill = (p: () => void, k: string): void => { ctx.beginPath(); p(); ctx.fillStyle = k; ctx.fill(); ctx.stroke(); };
  const fala = Math.sin(t * 1.1 + ziarno);
  if (typ === 0) {
    // leży twarzą w błocie: grzbiet, głowa, rozrzucona ręka
    fill(() => ctx.ellipse(0, -h * 0.1 - fala * h * 0.01, h * 0.42, h * 0.12, 0, Math.PI, Math.PI * 2), skora);
    fill(() => ctx.arc(h * 0.48, -h * 0.07, h * 0.1, Math.PI, Math.PI * 2), skora);
    ctx.lineWidth = h * 0.07; ctx.strokeStyle = skora;
    ctx.beginPath(); ctx.moveTo(h * 0.3, -h * 0.05); ctx.lineTo(h * 0.62 + fala * h * 0.03, -h * 0.02); ctx.stroke();
  } else if (typ === 1) {
    // na plecach, ręka wzniesiona ku deszczowi
    fill(() => ctx.ellipse(0, -h * 0.08, h * 0.42, h * 0.1, 0, Math.PI, Math.PI * 2), skora);
    fill(() => ctx.arc(-h * 0.48, -h * 0.08, h * 0.1, 0, Math.PI * 2), skora);
    ctx.lineWidth = h * 0.065; ctx.strokeStyle = skora;
    ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.12); ctx.quadraticCurveTo(-h * 0.25, -h * 0.4, -h * 0.18 + fala * h * 0.06, -h * 0.58); ctx.stroke();
    ctx.lineWidth = lw; ctx.strokeStyle = TUSZ;
    ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.12); ctx.quadraticCurveTo(-h * 0.25, -h * 0.4, -h * 0.18 + fala * h * 0.06, -h * 0.58); ctx.stroke();
  } else if (typ === 2) {
    // siedzi skulony, kołysze się
    ctx.rotate(fala * 0.06);
    fill(() => { ctx.moveTo(-h * 0.2, 0); ctx.quadraticCurveTo(-h * 0.25, -h * 0.5, 0, -h * 0.55); ctx.quadraticCurveTo(h * 0.22, -h * 0.45, h * 0.24, 0); ctx.closePath(); }, skora);
    fill(() => ctx.arc(h * 0.05, -h * 0.62, h * 0.11, 0, Math.PI * 2), skora);
    ctx.beginPath(); ctx.moveTo(h * 0.2, -h * 0.25); ctx.lineTo(-h * 0.05, -h * 0.3); ctx.stroke();
  } else if (typ === 3) {
    // czołga się: tułów nisko, ręka sięga do przodu
    const sieg = Math.max(0, Math.sin(t * 0.9 + ziarno));
    fill(() => ctx.ellipse(0, -h * 0.14, h * 0.4, h * 0.13, -0.08, 0, Math.PI * 2), skora);
    fill(() => ctx.arc(h * 0.44, -h * 0.24, h * 0.1, 0, Math.PI * 2), skora);
    ctx.lineWidth = h * 0.07; ctx.strokeStyle = skora;
    ctx.beginPath(); ctx.moveTo(h * 0.25, -h * 0.15); ctx.lineTo(h * (0.5 + 0.2 * sieg), -h * 0.02); ctx.stroke();
  } else {
    // klęczy i wyje w deszcz jak pies (pieśń VI), głowa odrzucona
    fill(() => { ctx.moveTo(-h * 0.18, 0); ctx.lineTo(-h * 0.12, -h * 0.6); ctx.quadraticCurveTo(0, -h * 0.7, h * 0.1, -h * 0.58); ctx.lineTo(h * 0.2, 0); ctx.closePath(); }, skora);
    fill(() => ctx.arc(-h * 0.02, -h * 0.76, h * 0.11, 0, Math.PI * 2), skora);
    ctx.fillStyle = TUSZ; ctx.beginPath(); ctx.ellipse(h * 0.02, -h * 0.82, h * 0.03, h * 0.045 * (0.6 + 0.4 * Math.abs(fala)), 0, 0, Math.PI * 2); ctx.fill();
  }
  // błoto zalewa dół ciała
  ctx.fillStyle = bloto;
  ctx.beginPath(); ctx.ellipse(0, h * 0.02, h * 0.62, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Ile kafli między żarłokami na tarasie (i gdzie ich nie ma: przy szybach, przy wozie, w przepaści). */
function miejscaTlumu(sim: Sim): number[] {
  const w = sim.world;
  const k = ukladKatedry(w), b = bloczekWiadra(w), plac = placKonwoju(w);
  const out: number[] = [];
  for (let i = 0; i < 400; i++) {
    const x = 6 + i * 0.95 + los(i * 3) * 0.6;
    if (x > w.w - 11) break;
    if (los(i * 11 + 5) < 0.22) continue;
    if (k && x > k.x0 - 2.5 && x < k.x1 + 1.5) continue;
    if (b && Math.abs(x - b.x) < 3) continue;
    if (plac && x > plac.x0 - 1 && x < plac.x1 + 1) continue;
    out.push(x);
  }
  return out;
}
let tlumKlucz: Sim | null = null, tlumMiejsca: number[] = [];

/** Taras trzeciego kręgu: żarłocy w błocie (przed mrokiem, po skałach powierzchni). */
export function rysujTlum(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const z = cam.zoom;
  if (cam.toScreenY(SURFACE_Y - 4) > cam.vh || cam.toScreenY(SURFACE_Y + 1) < 0) return;
  if (tlumKlucz !== sim) { tlumKlucz = sim; tlumMiejsca = miejscaTlumu(sim); }
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  const h = z * 1.7;
  const c = cerberNaPowierzchni(sim, WIDOK_KREGU.tik ?? undefined);
  ctx.save();
  // kałuże i błoto na całym tarasie
  ctx.fillStyle = 'rgba(40,40,30,0.55)';
  for (let i = 0; i < tlumMiejsca.length; i += 3) {
    const x = tlumMiejsca[i];
    const sx = cam.toScreenX(x), sy = cam.toScreenY(gruntKregu(sim, x)) + z * 0.1;
    if (sx < -z * 4 || sx > cam.vw + z * 4) continue;
    ctx.beginPath(); ctx.ellipse(sx, sy, z * 2.2, z * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < tlumMiejsca.length; i++) {
    const x = tlumMiejsca[i];
    const sx = cam.toScreenX(x), sy = cam.toScreenY(gruntKregu(sim, x)) + z * 0.12;
    if (sx < -h || sx > cam.vw + h) continue;
    // pod łapami Cerbera nikt nie leży spokojnie — tych rysuje on sam
    if (c.jest && Math.abs(x - c.x) < 2.2) continue;
    const typ = Math.floor(los(i * 29 + 1) * 5);
    const dx = typ === 3 ? Math.sin(t * 0.25 + i) * z * 0.3 : 0;
    ctx.save(); ctx.translate(sx + dx, sy);
    zarlok(ctx, h, typ, t, i, los(i * 37) < 0.5 ? 1 : -1);
    ctx.restore();
  }
  ctx.restore();
}

/** Cerber na tarasie kręgu: chodzi od żarłoka do żarłoka, szarpie, obdziera, wyje w deszcz (nad mrokiem, przed deszczem). */
export function rysujCerberaNaKregu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const c = cerberNaPowierzchni(sim, WIDOK_KREGU.tik ?? undefined);
  if (!c.jest) return;
  const z = cam.zoom, h = z * 4.4;
  const sx = cam.toScreenX(c.x), sy = cam.toScreenY(gruntKregu(sim, c.x)) + z * 0.1;
  if (sx < -h * 2 || sx > cam.vw + h * 2 || sy < -h || sy > cam.vh + h * 0.5) return;
  const t = teraz / 1000;
  const p = pozaCerbera();
  p.czas = teraz;
  p.krok = c.idzie; p.faza = c.x * 2.2;
  p.oddech = 0.5 + 0.5 * Math.sin(t * 4);
  p.ogon = Math.sin(t * 1.4) * 0.7;
  p.glowy.forEach((g, i) => { g.pochyl = 0.1 * Math.sin(t * 1.6 + i * 2); g.paszcza = 0.15 + 0.1 * Math.max(0, Math.sin(t * 5 + i)); });
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(c.zwrot, 1);
  if (c.szarpie > 0) {
    // zabija żarłoka leżącego przed nim — jeden z pięciu sposobów (render/zabijanie.ts)
    scenaZabijania(ctx, h, Math.max(16, z * 1.9 * ustawienia.wielkoscSylwetek), z * 4, c.wariant, c.szarpie, teraz);
    ctx.restore();
    return;
  }
  rysujCerbera(ctx, h, p);
  ctx.restore();
}

// ---------------------------------------------------------------- trzewia: ciała w ścianach

/** Ciała wciągane przez ziemię w ścianach i posadzkach wykutych korytarzy (przed mrokiem — widać je tylko w świetle). */
export function rysujCialaWScianach(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const z = cam.zoom;
  if (z < 6) return;
  const w = sim.world;
  const t = wolnoRuszac() ? teraz / 1000 : 0;
  const x0 = Math.max(1, Math.floor(cam.toWorldX(0))), x1 = Math.min(w.w - 2, Math.ceil(cam.toWorldX(cam.vw)));
  const y0 = Math.max(SURFACE_Y + 2, Math.floor(cam.toWorldY(0))), y1 = Math.min(w.h - 2, Math.ceil(cam.toWorldY(cam.vh)));
  const skora = 'rgb(138,128,106)';
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = w.idx(x, y);
      if (!w.ever[i] || !w.passable(x, y)) continue;
      const r = los(x * 7349 + y * 211);
      if (r > 0.07) continue;
      const lewa = w.solid(x - 1, y), prawa = w.solid(x + 1, y), dol = w.solid(x, y + 1);
      const fala = Math.sin(t * 0.9 + x + y);
      const lw = Math.max(0.8, z * 0.06);
      ctx.strokeStyle = TUSZ; ctx.lineWidth = lw;
      if ((lewa || prawa) && r < 0.045) {
        // twarz i ręka wychodzące ze ściany
        const kier = lewa ? 1 : -1;
        const sx = cam.toScreenX(lewa ? x : x + 1), sy = cam.toScreenY(y + 0.45);
        ctx.save(); ctx.translate(sx, sy); ctx.scale(kier, 1);
        ctx.fillStyle = skora;
        ctx.beginPath(); ctx.ellipse(z * 0.12, 0, z * 0.2, z * 0.26, 0, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = TUSZ;
        ctx.beginPath(); ctx.ellipse(z * 0.2, z * 0.06, z * 0.04, z * 0.07 * (0.7 + 0.3 * fala), 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(z * 0.18, -z * 0.09, z * 0.025, 0, Math.PI * 2); ctx.fill();
        // ręka
        ctx.strokeStyle = skora; ctx.lineWidth = z * 0.09;
        ctx.beginPath(); ctx.moveTo(0, z * 0.32); ctx.quadraticCurveTo(z * 0.35, z * 0.3, z * (0.55 + 0.08 * fala), z * (0.1 + 0.05 * fala)); ctx.stroke();
        ctx.strokeStyle = TUSZ; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(0, z * 0.32); ctx.quadraticCurveTo(z * 0.35, z * 0.3, z * (0.55 + 0.08 * fala), z * (0.1 + 0.05 * fala)); ctx.stroke();
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(z * (0.55 + 0.08 * fala), z * (0.1 + 0.05 * fala)); ctx.lineTo(z * (0.66 + 0.08 * fala), z * (0.02 + k * 0.06)); ctx.stroke(); }
        ctx.restore();
      } else if (dol && !lewa && !prawa) {
        // brzuch i głowa żarłoka na wpół wciągnięte w posadzkę
        const sx = cam.toScreenX(x + 0.5), sy = cam.toScreenY(y + 1);
        ctx.fillStyle = skora;
        ctx.beginPath(); ctx.ellipse(sx, sy, z * 0.34, z * (0.14 + 0.01 * fala), 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx + z * 0.42, sy, z * 0.11, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
  }
  ctx.restore();
}
