import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { DLON } from '../nastawy/dlon';
import { ustawienia } from '../core/settings-store';
import arkuszUrl from '../grafiki/dlon/dlon-z-otchlani.webp';

/**
 * Dłoń z otchłani (Koszmar): pod kimś z ludu otchłań zaczyna się żarzyć na czerwono i z głębi,
 * zawsze od dołu, powoli wznosi się ogromna dłoń — sięga w górę, chwyta jedną albo dwie postacie
 * i zapada się z nimi z powrotem w ciemność. Dłoń to klatki wyrenderowane z trójwymiarowego modelu
 * (scripts/dlon/: kości, ścięgna, żyły, stawy ze zmarszczkami, rogowe szpony, czerwona łuna i ciepłe
 * światło lampek od strony palców) — od otwartej, szponiastej dłoni po zaciśniętą pięść.
 * Co jest jeszcze pod brzegiem otchłani, tonie w ciemności, a od brzegu bije na dłoń czerwień.
 * Rysowane po mroku i po postaciach — dłoń zamyka się na nich. Logika: src/sim/dlon.ts.
 */

const gladko = (t: number) => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

// ---------------------------------------------------------------- arkusz klatek

/**
 * Arkusz: 10 klatek (2 kolumny × 5 rzędów) po 792×360 px, od otwartej dłoni do pięści.
 * Kadr obejmuje płaszczyznę obrazu x ∈ [−17, 27], y ∈ [−11, 9] w jednostkach modelu
 * (18 px na jednostkę); nadgarstek to (0, 0), palce celują w +x, kciuk jest u dołu.
 */
const ARKUSZ = { kolumny: 2, klatek: 10, szer: 792, wys: 360, x0: -17, y1: 9, pxNaJedn: 18 };
/** Miejsce chwytu (między palcami a kciukiem) w otwartej dłoni i środek zaciśniętej pięści — jednostki modelu. */
const CHWYT_OTWARTA = { x: 18, y: -6.0 };
const CHWYT_PIESC = { x: 10, y: -3.3 };
/** Koniec najdłuższego szponu (od nadgarstka) — do wychylania się z ciemności. */
const ZASIEG_SZPONOW = 25.5;
/** Kafle świata na jednostkę modelu przy DLON.wielkosc = 1 (dłoń z szponami ok. 5,4 kafla). */
const KAFLE_NA_JEDN = 0.21;

let arkusz: HTMLImageElement | null = null;
function obrazArkusza(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!arkusz) { arkusz = new Image(); arkusz.src = arkuszUrl; }
  return arkusz.complete && arkusz.naturalWidth > 0 ? arkusz : null;
}
// wczytaj od razu — miniatura w atlasie rysuje się raz i trafia do pamięci
obrazArkusza();

/** Miejsce chwytu dla danego zacisku (0 — otwarta, 1 — pięść), w jednostkach modelu. */
function chwyt(zacisk: number): { x: number; y: number } {
  const k = gladko(zacisk);
  return { x: CHWYT_OTWARTA.x + (CHWYT_PIESC.x - CHWYT_OTWARTA.x) * k, y: CHWYT_OTWARTA.y + (CHWYT_PIESC.y - CHWYT_OTWARTA.y) * k };
}

/**
 * Rysuje klatkę dłoni: nadgarstek w (sx, sy) na ekranie, palce w kierunku `kat`, `skala` — piksele
 * ekranu na jednostkę modelu. `lustro` −1 odbija dłoń w poprzek (kciuk po drugiej stronie).
 * Wokół obrysu tli się czerwona łuna otchłani (`luna` — jej siła).
 */
export function rysujKlatkeDloni(ctx: CanvasRenderingContext2D, sx: number, sy: number, kat: number, skala: number, zacisk: number, lustro: number, alfa: number, luna = 1): boolean {
  const o = obrazArkusza();
  if (!o) return false;
  const k = Math.max(0, Math.min(ARKUSZ.klatek - 1, Math.round(zacisk * (ARKUSZ.klatek - 1))));
  const kx = (k % ARKUSZ.kolumny) * ARKUSZ.szer, ky = Math.floor(k / ARKUSZ.kolumny) * ARKUSZ.wys;
  const s = skala / ARKUSZ.pxNaJedn;
  const wx = -ARKUSZ.x0 * ARKUSZ.pxNaJedn, wy = ARKUSZ.y1 * ARKUSZ.pxNaJedn;   // nadgarstek w pikselach klatki
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.translate(sx, sy);
  ctx.rotate(kat);
  ctx.scale(s, s * lustro);
  if (luna > 0) {
    ctx.shadowColor = `rgba(200,24,12,${0.75 * luna})`;
    ctx.shadowBlur = Math.max(6, skala * 0.9);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(o, kx, ky, ARKUSZ.szer, ARKUSZ.wys, -wx, -wy, ARKUSZ.szer, ARKUSZ.wys);
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------- łuna otchłani

/** Czerwona łuna sącząca się z otchłani (spod brzegu) — szeroka, pulsuje jak oddech. */
export function lunaOtchlani(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kat: number, sila: number, teraz: number, ruch = true): void {
  if (sila <= 0.01 || r <= 1) return;
  const puls = ruch ? 0.84 + 0.12 * Math.sin(teraz * 0.0037) + 0.05 * Math.sin(teraz * 0.0131) : 0.9;
  const a = sila * puls;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(x, y);
  ctx.rotate(kat);
  ctx.scale(1, 0.62);                                    // spłaszczona wzdłuż brzegu
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(196,34,16,${0.62 * a})`);
  g.addColorStop(0.3, `rgba(132,16,8,${0.42 * a})`);
  g.addColorStop(0.7, `rgba(64,4,2,${0.18 * a})`);
  g.addColorStop(1, 'rgba(30,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

// ---------------------------------------------------------------- zabrani w pięści

/**
 * Zabrany w pięści: pas i nogi zakrywają palce, nad kłykciami widać tułów, głowę i ręce wyrzucone
 * w górę. (x, y) — pas; `kat` obraca sylwetkę tak, żeby „w górę” było w stronę palców.
 */
function wPiesci(ctx: CanvasRenderingContext2D, x: number, y: number, hgt: number, kat: number, szarpanie: number, alfa: number): void {
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.translate(x, y);
  ctx.rotate(kat);
  ctx.lineCap = 'round';
  const u = hgt / 10;
  const ramie = (s: number, a: number) => {
    const bx = s * u, by = -u * 4.4;
    const lx = bx + s * Math.sin(a) * u * 2.2, ly = by - Math.cos(a) * u * 2.2;
    const hx = lx + s * Math.sin(a * 0.6) * u * 2, hy = ly - Math.cos(a * 0.6) * u * 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(lx, ly); ctx.lineTo(hx, hy);
  };
  const a1 = 0.55 + 0.35 * Math.sin(szarpanie), a2 = 0.4 + 0.4 * Math.sin(szarpanie * 1.3 + 1.7);
  for (const [kolor, grub] of [['rgba(214,190,150,0.5)', 1.1], ['rgba(28,20,16,0.96)', 0.8]] as const) {
    ctx.strokeStyle = kolor; ctx.lineWidth = u * grub;
    ramie(-1, a1); ctx.stroke();
    ramie(1, a2); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(28,20,16,0.96)';
  ctx.strokeStyle = 'rgba(214,190,150,0.5)'; ctx.lineWidth = Math.max(0.8, u * 0.25);
  ctx.beginPath(); ctx.ellipse(0, -u * 2.4, u * 1.3, u * 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(Math.sin(szarpanie * 0.7) * u * 0.3, -u * 6.1, u * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- warstwa (to, co pod brzegiem, tonie w ciemności)

let warstwa: HTMLCanvasElement | null = null;
/** Pomocnicze płótno w pikselach urządzenia — tam dłoń dostaje maskę otchłani i czerwone podświetlenie. */
function dajWarstwe(pw: number, ph: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!warstwa) warstwa = document.createElement('canvas');
  if (warstwa.width < pw || warstwa.height < ph) {
    warstwa.width = Math.max(warstwa.width, pw);
    warstwa.height = Math.max(warstwa.height, ph);
  }
  const g = warstwa.getContext('2d');
  if (!g) return null;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, pw, ph);
  return g;
}

// ---------------------------------------------------------------- całość

type Pkt = { x: number; y: number };
const mix = (a: Pkt, b: Pkt, u: number): Pkt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

export function rysujDlon(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const d = sim.lud.dlon;
  if (!DLON.wlaczona || !d || d.faza === 'brak') return;
  const z = cam.zoom;
  const t = sim.tick - d.od;
  const ruch = !ustawienia.ograniczRuch;

  // oś: z głębi otchłani pod ofiarą (O) w górę, do miejsca chwytu (C)
  let dx = d.cx - d.ox, dy = d.cy - d.oy;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl; dy /= dl;
  const lustro = dx < 0 ? -1 : 1;
  const k = KAFLE_NA_JEDN * DLON.wielkosc;             // kafle świata na jednostkę modelu
  // punkt modelu (x w stronę palców, y w stronę grzbietu dłoni) → świat
  const doSwiata = (wx: number, wy: number, mx: number, my: number): Pkt => ({
    x: wx + (mx * dx + my * lustro * dy) * k,
    y: wy + (mx * dy - my * lustro * dx) * k,
  });
  const naOsi = (s: number): Pkt => ({ x: d.ox + dx * s, y: d.oy + dy * s });
  const sOsi = (p: Pkt) => (p.x - d.ox) * dx + (p.y - d.oy) * dy;
  // gdzie musi być nadgarstek, żeby miejsce chwytu (przy danym zacisku) wypadło na ofiarach
  const nadgarstekNaCelu = (zacisk: number): Pkt => {
    const g = chwyt(zacisk);
    const p = doSwiata(0, 0, g.x, g.y);
    return { x: d.cx - p.x, y: d.cy - p.y };
  };

  // brzeg otchłani na osi; dłoń „wysunięta o przes” = nadgarstek tyle kafli poniżej chwytu
  const sBrzeg = sOsi({ x: d.bx, y: d.by });
  const cel = nadgarstekNaCelu(0);
  const sSzponow = sOsi(cel) + ZASIEG_SZPONOW * k;      // gdzie są szpony w chwili chwytu
  const nizej = (przes: number): Pkt => ({ x: cel.x - dx * przes, y: cel.y - dy * przes });
  const przesDno = sSzponow - (sBrzeg - 3);             // szpony głęboko pod brzegiem
  const przesWych = Math.max(1.5, sSzponow - Math.min(sBrzeg + 1.5, dl - 2.2));   // szpony tuż nad brzegiem
  const przesStart = Math.max(przesDno, przesWych + 4);
  const glebia = nizej(przesStart + 6);
  /** Wysokość dłoni: 0..1 — wznosi się z głębi, 1..2 — sięga po ofiary. */
  const polozenie = (u: number): Pkt => u <= 1
    ? nizej(przesStart + (przesWych - przesStart) * gladko(u))
    : nizej(przesWych * (1 - gladko(u - 1)));

  // łuna otchłani pod ofiarą: rozpala się, gdy dłoń rusza z głębi, gaśnie, gdy się w niej skryje
  let sila = 1;
  if (d.faza === 'wstaje') sila = gladko(t / 110);
  else if (d.faza === 'chwyta') sila = 1 + 0.35 * Math.sin(Math.min(1, t / DLON.chwyta) * Math.PI);
  else if (d.faza === 'cofa') sila = 1 - 0.45 * gladko(t / DLON.cofa);
  else if (d.faza === 'gasnie') sila = 0.55 * (1 - gladko(t / DLON.gasnie));
  const katOsi = Math.atan2(dy, dx);
  const zrodlo = naOsi(sBrzeg - 1.2);
  lunaOtchlani(ctx, cam.toScreenX(zrodlo.x), cam.toScreenY(zrodlo.y), DLON.lunaPromien * z, katOsi + Math.PI / 2, sila, teraz, ruch);

  // nadgarstek: z głębi pod brzegiem w górę do miejsca chwytu i z powrotem w dół
  let w: Pkt, zacisk = 0, alfa = 1;
  // palce drgają, gdy dłoń się zbliża — jak u kogoś, kto już czuje zdobycz
  const drganie = ruch ? 0.06 + 0.05 * Math.sin(teraz * 0.011) : 0.06;
  if (d.faza === 'wstaje') {
    w = polozenie(t / DLON.wstaje);
    // wznosi się zrywami, jak coś ciężkiego, co pnie się przez skałę
    if (ruch) { const zryw = 0.18 * Math.sin(t * 0.045) * (1 - t / DLON.wstaje); w = { x: w.x + dx * zryw, y: w.y + dy * zryw }; }
    zacisk = drganie;
    alfa = gladko(t / 50);
  } else if (d.faza === 'siega') {
    const u = t / DLON.siega;
    w = polozenie(1 + u);
    zacisk = drganie * (1 - gladko(u));
  } else if (d.faza === 'chwyta') {
    zacisk = gladko(t / (DLON.chwyta * 0.85));
    w = nadgarstekNaCelu(zacisk);                      // pięść zamyka się na nich, nie obok
  } else if (d.faza === 'cofa') {
    const u = gladko(t / DLON.cofa);
    const start = d.odpedzona ? polozenie(d.odpedzonaU ?? 1) : nadgarstekNaCelu(1);
    zacisk = d.odpedzona ? 0.1 + 0.3 * u : 1;          // odepchnięta kurczy palce, jak oparzona
    w = mix(start, glebia, u);
    alfa = 1 - gladko((u - 0.6) / 0.4);
  } else return;
  if (alfa <= 0.01) return;

  const kat = katOsi + (ruch ? Math.sin(teraz * 0.0045) * 0.025 : 0);
  const skala = z * k;
  const sx = cam.toScreenX(w.x), sy = cam.toScreenY(w.y);

  // co rysujemy: zabranych za pięścią (głowy i ręce nad kłykciami), potem dłoń
  const rysuj = (g: CanvasRenderingContext2D) => {
    if (d.faza === 'cofa' && d.zabrani.length) {
      const hgt = Math.max(16, z * 1.9 * ustawienia.wielkoscSylwetek) * 0.9;
      const katPostaci = Math.atan2(dx, -dy);
      d.zabrani.forEach((_r, i) => {
        const o = (i - (d.zabrani.length - 1) / 2) * 4.2;
        const p = doSwiata(w.x, w.y, 12.4, -2 + o);
        wPiesci(g, cam.toScreenX(p.x), cam.toScreenY(p.y), hgt, katPostaci + (ruch ? Math.sin(teraz * 0.004 + i * 2) * 0.12 : 0), ruch ? teraz * 0.012 + i * 2.3 : 0, 1);
      });
    }
    rysujKlatkeDloni(g, sx, sy, kat, skala, zacisk, lustro, 1, Math.min(1, sila));
  };

  // prostokąt klatki na ekranie (z zapasem na łunę wokół obrysu)
  const zapas = Math.max(6, skala * 0.9) * 2 + 4;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [mx, my] of [[ARKUSZ.x0, ARKUSZ.y1], [ARKUSZ.x0 + ARKUSZ.szer / ARKUSZ.pxNaJedn, ARKUSZ.y1], [ARKUSZ.x0, ARKUSZ.y1 - ARKUSZ.wys / ARKUSZ.pxNaJedn], [ARKUSZ.x0 + ARKUSZ.szer / ARKUSZ.pxNaJedn, ARKUSZ.y1 - ARKUSZ.wys / ARKUSZ.pxNaJedn]]) {
    const p = doSwiata(w.x, w.y, mx, my);
    const px = cam.toScreenX(p.x), py = cam.toScreenY(p.y);
    x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
  }
  x0 = Math.floor(x0 - zapas); y0 = Math.floor(y0 - zapas); x1 = Math.ceil(x1 + zapas); y1 = Math.ceil(y1 + zapas);
  const m = ctx.getTransform();
  let sc = Math.hypot(m.a, m.b) || 1;
  sc = Math.min(sc, 2048 / Math.max(1, x1 - x0, y1 - y0));
  const pw = Math.ceil((x1 - x0) * sc), ph = Math.ceil((y1 - y0) * sc);
  const g = dajWarstwe(pw, ph);
  if (!g) { ctx.save(); ctx.globalAlpha *= alfa; rysuj(ctx); ctx.restore(); return; }
  g.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc);
  rysuj(g);
  // pod brzegiem otchłani dłoń tonie w ciemności…
  const ekr = (p: Pkt) => ({ x: cam.toScreenX(p.x), y: cam.toScreenY(p.y) });
  const a = ekr(naOsi(sBrzeg - 3.5)), b = ekr(naOsi(sBrzeg + 0.4));
  g.globalCompositeOperation = 'destination-out';
  const ciemno = g.createLinearGradient(a.x, a.y, b.x, b.y);
  ciemno.addColorStop(0, 'rgba(0,0,0,0.9)');
  ciemno.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  ciemno.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = ciemno;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // …a od brzegu bije na nią czerwień otchłani
  g.globalCompositeOperation = 'source-atop';
  const c1 = ekr(naOsi(sBrzeg - 1)), c2 = ekr(naOsi(sBrzeg + 4));
  const czerwien = g.createLinearGradient(c1.x, c1.y, c2.x, c2.y);
  czerwien.addColorStop(0, `rgba(150,18,8,${0.36 * Math.min(1, sila)})`);
  czerwien.addColorStop(1, 'rgba(150,18,8,0)');
  g.fillStyle = czerwien;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.drawImage(warstwa!, 0, 0, pw, ph, x0, y0, pw / sc, ph / sc);
  ctx.restore();
}
