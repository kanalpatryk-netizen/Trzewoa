import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { DLON } from '../nastawy/dlon';
import { ustawienia } from '../core/settings-store';
import { ARKUSZ, KAFLE_NA_JEDN, rysujKlatke, lunaOtchlani } from './dlon';
import { wysokoscPostaci } from './figury';
import { T } from '../sim/tiles';
import rzutUrl from '../grafiki/dlon/dlon-rzut.webp';
import tarczaUrl from '../grafiki/dlon/dlon-tarcza.webp';
import zawalUrl from '../grafiki/dlon/dlon-zawal.webp';

/**
 * DŁOŃ Z OTCHŁANI POMAGA DEMONOWI (Alpha, etap 5b) — rysunek do sim/dlon-demona.ts. Każda akcja ma własne klatki
 * z modelu 3D (scripts/dlon/renderuj.mjs) i własny ruch — żadna nie jest zaciskaniem pięści (prośba użytkownika):
 *  - RZUT: podłoga pod rycerzem pęka, z rysy bije czerwień, wyrasta dłoń palcami w górę i obejmuje go jak naczynie
 *    (klatki „naczynie”, „trzyma”), unosi z zamachem w tył, a potem wyrzuca w górę — palce rozwierają się gwałtownie,
 *    odgięte do tyłu. Rycerz koziołkuje ze smugami pędu, uderza o strop (pył) i spada; leży ogłuszony, nad głową
 *    krążą gwiazdki. Dłoń zapada się otwarta;
 *  - TARCZA: z podłogi przed demonem wyrasta otwarta dłoń, wnętrzem do widza, palce rozczapierzone jak mur, i drży z
 *    wysiłku; cios w demona trafia w nią — iskry, fala na wnętrzu dłoni, palce drgają;
 *  - ZAWAŁ: strop pęka, sypie się pył, przebijają się szpony zagięte w hak, drą skałę szarpnięciami, płaskie uderzenie —
 *    i kolumna stropu spada w dół lawiną głazów; zostaje ściana gruzu, a gdy przejdzie jej czas — kruszy się i osypuje.
 * Dłoń znika w podłodze albo w stropie (co za brzegiem — tonie w ciemności), a od brzegu bije czerwona łuna otchłani.
 */

const D = DLON.demon;
const gladko = (t: number): number => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

/** Tani skrót liczby (stałe kształty pęknięć i głazów). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const obrazy: Record<string, HTMLImageElement | null> = {};
function obraz(url: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let o = obrazy[url];
  if (!o) { o = new Image(); o.src = url; obrazy[url] = o; }
  return o.complete && o.naturalWidth > 0 ? o : null;
}
for (const u of [rzutUrl, tarczaUrl, zawalUrl]) obraz(u);

/** Kafle świata na jednostkę modelu — osobno dla każdej akcji (krypta jest niska). */
const KJ = { rzut: KAFLE_NA_JEDN * D.wielkosc.rzut, tarcza: KAFLE_NA_JEDN * D.wielkosc.tarcza, zawal: KAFLE_NA_JEDN * D.wielkosc.zawal };
/** Środek „naczynia” (gdzie siedzi obejmowany rycerz) — jednostki modelu. */
const NACZYNIE = { x: 13, y: -3.5 };

let warstwa: HTMLCanvasElement | null = null;
function dajWarstwe(pw: number, ph: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!warstwa) warstwa = document.createElement('canvas');
  if (warstwa.width < pw || warstwa.height < ph) { warstwa.width = Math.max(warstwa.width, pw); warstwa.height = Math.max(warstwa.height, ph); }
  const g = warstwa.getContext('2d');
  if (!g) return null;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, pw, ph);
  return g;
}

/**
 * Klatka dłoni wychodzącej z podłogi (`zDolu`) albo ze stropu: nadgarstek (ekran) w (sx, sy), palce w kierunku `kat`.
 * Co jest za brzegiem (`brzegY` na ekranie), tonie w ciemności; od brzegu bije na dłoń czerwień.
 */
function dlonZBrzegu(ctx: CanvasRenderingContext2D, img: HTMLImageElement, sx: number, sy: number, kat: number, skala: number, klatka: number,
  lustro: number, alfa: number, brzegY: number, zDolu: boolean, luna: number): void {
  const zasieg = (ARKUSZ.szer / ARKUSZ.pxNaJedn) * skala;
  const x0 = Math.floor(sx - zasieg - 20), x1 = Math.ceil(sx + zasieg + 20);
  const y0 = Math.floor(sy - zasieg - 20), y1 = Math.ceil(sy + zasieg + 20);
  const m = ctx.getTransform();
  let sc = Math.hypot(m.a, m.b) || 1;
  sc = Math.min(sc, 2048 / Math.max(1, x1 - x0, y1 - y0));
  const pw = Math.ceil((x1 - x0) * sc), ph = Math.ceil((y1 - y0) * sc);
  const g = dajWarstwe(pw, ph);
  if (!g) { rysujKlatke(ctx, img, sx, sy, kat, skala, klatka, lustro, alfa, `rgba(200,24,12,${0.7 * luna})`); return; }
  g.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc);
  rysujKlatke(g, img, sx, sy, kat, skala, klatka, lustro, 1, `rgba(200,24,12,${0.7 * luna})`);
  const brzegX = sx + (brzegY - sy) * Math.cos(kat) / (Math.sin(kat) || 1e-6);
  // za brzegiem dłoń tonie w ciemności…
  const pas = Math.max(6, skala * 3);
  g.globalCompositeOperation = 'destination-out';
  const ciemno = g.createLinearGradient(0, brzegY + (zDolu ? pas * 0.15 : -pas * 0.15), 0, brzegY + (zDolu ? pas : -pas));
  ciemno.addColorStop(0, 'rgba(0,0,0,0)');
  ciemno.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = ciemno;
  if (zDolu) g.fillRect(x0, brzegY, x1 - x0, y1 - brzegY); else g.fillRect(x0, y0, x1 - x0, brzegY - y0);
  // …a od brzegu bije na nią czerwień otchłani
  g.globalCompositeOperation = 'source-atop';
  const czerwien = g.createLinearGradient(0, brzegY, 0, brzegY + (zDolu ? -pas * 2.5 : pas * 2.5));
  czerwien.addColorStop(0, `rgba(170,22,10,${0.45 * luna})`);
  czerwien.addColorStop(1, 'rgba(170,22,10,0)');
  g.fillStyle = czerwien;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.drawImage(warstwa!, 0, 0, pw, ph, x0, y0, pw / sc, ph / sc);
  ctx.restore();
  // wyszczerbiony brzeg skały, przez który przeszło ramię (zakrywa miejsce, gdzie znika w ciemności)
  wylom(ctx, brzegX, brzegY, skala * 6, pas, zDolu, alfa);
}

/** Wyłom w podłodze (albo w stropie): poszarpana krawędź skały wokół ramienia i bryły przy niej. */
function wylom(ctx: CanvasRenderingContext2D, x: number, y: number, szer: number, pas: number, zDolu: boolean, alfa: number): void {
  const k = zDolu ? 1 : -1;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, alfa * 1.5);
  ctx.fillStyle = '#1a120e';
  ctx.strokeStyle = 'rgba(200,170,140,0.55)';
  ctx.lineWidth = Math.max(1, pas * 0.08);
  ctx.beginPath();
  ctx.moveTo(x - szer * 0.75, y + k * pas * 0.05);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const zab = (los(i + 500) - 0.5) * pas * 0.35 + (i % 2 ? -1 : 1) * pas * 0.12;
    ctx.lineTo(x - szer * 0.75 + szer * 1.5 * t, y - k * (Math.sin(t * Math.PI) * pas * 0.22 + zab));
  }
  ctx.lineTo(x + szer * 0.75, y + k * pas * 0.35);
  ctx.lineTo(x - szer * 0.75, y + k * pas * 0.35);
  ctx.closePath();
  const ciemne = ctx.createLinearGradient(0, y - k * pas * 0.3, 0, y + k * pas * 0.35);
  ciemne.addColorStop(0, 'rgba(26,18,14,0.95)'); ciemne.addColorStop(1, 'rgba(26,18,14,0)');
  ctx.fillStyle = ciemne;
  ctx.fill();
  // ramię znika w ciemnej szczelinie (czerwony żar z głębi)
  const g = ctx.createLinearGradient(0, y, 0, y + k * pas);
  g.addColorStop(0, 'rgba(120,16,8,0.6)'); g.addColorStop(1, 'rgba(40,4,2,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - szer * 0.45, Math.min(y, y + k * pas), szer * 0.9, pas);
  // jasna krawędź przełomu
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const zab = (los(i + 500) - 0.5) * pas * 0.35 + (i % 2 ? -1 : 1) * pas * 0.12;
    const px = x - szer * 0.75 + szer * 1.5 * t, py = y - k * (Math.sin(t * Math.PI) * pas * 0.22 + zab);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // bryły odłupane przy krawędzi
  for (let i = 0; i < 5; i++) {
    const bx = x + (los(i + 520) - 0.5) * szer * 1.6, by = y - k * pas * (0.1 + los(i + 530) * 0.25);
    const r = pas * (0.15 + los(i + 540) * 0.15);
    ctx.fillStyle = i % 2 ? '#4a4038' : '#6a5e52';
    ctx.beginPath(); ctx.moveTo(bx - r, by); ctx.lineTo(bx - r * 0.2, by - r); ctx.lineTo(bx + r, by - r * 0.3); ctx.lineTo(bx + r * 0.6, by + r * 0.6); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/** Rysa w podłodze albo w stropie: promieniste pęknięcia z czerwonym żarem (`k` — jak bardzo rozwarta, 0…1). */
function rysa(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, k: number, ziarno: number, wDol: boolean): void {
  if (k <= 0.01) return;
  ctx.save();
  ctx.lineCap = 'round';
  const kier = wDol ? 1 : -1;
  for (const [kolor, gr] of [['rgba(10,4,3,0.95)', Math.max(2, z * 0.16)], [`rgba(255,80,40,${0.8 * k})`, Math.max(1, z * 0.06)]] as const) {
    ctx.strokeStyle = kolor; ctx.lineWidth = gr;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI + (los(ziarno + i) - 0.5) * 0.4;
      const dl = z * (0.8 + los(ziarno + i * 3) * 1.6) * k;
      let px = x, py = y;
      ctx.moveTo(px, py);
      for (let j = 1; j <= 3; j++) {
        px = x + Math.cos(a) * dl * j / 3 + (los(ziarno + i * 7 + j) - 0.5) * z * 0.3;
        py = y + kier * Math.sin(a) * dl * 0.25 * j / 3;
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }
  // żar z rysy
  ctx.globalCompositeOperation = 'lighter';
  const r = z * 2.2 * k;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,70,30,${0.4 * k})`); g.addColorStop(1, 'rgba(255,40,20,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Odłamki: wyrzucone z rysy (w górę) albo sypiące się ze stropu (w dół); `k` 0…1 od początku. */
function odlamki(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, k: number, ziarno: number, wGore: boolean, ile = 10): void {
  if (k <= 0 || k >= 1) return;
  ctx.save();
  for (let i = 0; i < ile; i++) {
    const vx = (los(ziarno + i) - 0.5) * z * 4;
    const vy = (wGore ? -1 : 0.2) * z * (2 + los(ziarno + i * 5) * 3);
    const g = z * 9;
    const t = k * (0.8 + los(ziarno + i * 9) * 0.4);
    const px = x + vx * t, py = y + vy * t + g * t * t * 0.5;
    const r = Math.max(1.2, z * (0.08 + los(ziarno + i * 2) * 0.12));
    ctx.fillStyle = `rgba(${90 + (i % 3) * 20},${80 + (i % 3) * 15},${70 + (i % 3) * 12},${1 - k * 0.7})`;
    ctx.beginPath();
    ctx.moveTo(px - r, py); ctx.lineTo(px, py - r * 0.8); ctx.lineTo(px + r, py + r * 0.2); ctx.lineTo(px + r * 0.1, py + r);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/** Obłok pyłu. */
function pyl(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number): void {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(150,135,118,${0.5 * a})`); g.addColorStop(1, 'rgba(150,135,118,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Główny rysunek — po postaciach i po mroku (dłoń jest nad nimi). */
export function rysujDlonDemona(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const s = sim.lud.dlonDemona;
  if (!s) return;
  const z = cam.zoom;
  const ruch = !ustawienia.ograniczRuch;
  // ściana gruzu po zawale (i jej kruszenie) — także gdy dłoni już nie ma
  if (s.sciana) scianaGruzu(ctx, sim, cam, teraz);
  // ogłuszeni: gwiazdki nad głową; w locie — smugi pędu
  for (const c of sim.creatures) {
    if (c.dead) continue;
    if ((c.ogluszonyDo ?? -1) > sim.tick) gwiazdki(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y + 1), wysokoscPostaci(c, z), c.face >= 0 ? 1 : -1, teraz, ruch);
    if (c.lot) smugiPedu(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y + 0.4), z, c.lot.vx, c.lot.vy, sim.tick - c.lot.od);
    if (c.lot?.stropT !== undefined && sim.tick - c.lot.stropT < 40) {
      const k = (sim.tick - c.lot.stropT) / 40;
      odlamki(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y - 1.4), z, k, c.id * 13, false, 8);
      pyl(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y - 1.4), z * (1 + k * 2), 1 - k);
    }
  }
  if (!s.akcja) return;
  const t = sim.tick - s.od;
  const skala = z * KJ[s.akcja];
  if (s.akcja === 'rzut') rysujRzut(ctx, sim, cam, s, t, skala, teraz, ruch);
  else if (s.akcja === 'tarcza') rysujTarcze(ctx, sim, cam, s, t, skala, teraz, ruch);
  else rysujZawal(ctx, sim, cam, s, t, skala, teraz, ruch);
}

type Stan = NonNullable<Sim['lud']['dlonDemona']>;

/** Rzut: dłoń wyrasta pod rycerzem, obejmuje go, unosi z zamachem i wyrzuca w górę. */
function rysujRzut(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, s: Stan, t: number, skala: number, teraz: number, ruch: boolean): void {
  const img = obraz(rzutUrl);
  const z = cam.zoom;
  const R = D.rzut;
  const fx = cam.toScreenX(s.x), fy = cam.toScreenY(s.y);
  const r = sim.creatureById(s.cel ?? -1);
  const lustro = -s.bok;
  // gdzie rycerz (pas) — tam środek naczynia
  const pas = r && r.wDloni ? { x: cam.toScreenX(r.x), y: cam.toScreenY(r.y + 1) - wysokoscPostaci(r, z) * 0.42 } : { x: fx, y: fy - z * 1.2 };
  let kat = -Math.PI / 2, klatka = 0, glebiej = 0, alfa = 1, luna = 1;
  let rysaK = 1;
  if (s.faza === 'wstaje') {
    // wyrasta obok rycerza (od strony demona), otwarta, cała nad podłogą — nadgarstek tuż pod nią
    const k = t / R.wstaje;
    glebiej = (1 - gladko(k)) * z * 6;
    klatka = 0;
    if (img) {
      const bx = fx - s.bok * z * 1.6;
      lunaOtchlani(ctx, fx, fy, z * 4, 0, gladko(k / 0.3), teraz, ruch);
      rysa(ctx, bx, fy, z, gladko(k / 0.4), 51, true);
      odlamki(ctx, bx, fy, z, k, 77, true, 12);
      dlonZBrzegu(ctx, img, bx, fy + z * 0.3 + glebiej, kat + (ruch ? Math.sin(t * 0.08) * 0.04 * (1 - k) : 0), skala, 0, lustro, 1, fy, true, gladko(k / 0.3));
    }
    return;
    rysaK = gladko(k / 0.4);
    luna = gladko(k / 0.3);
    if (ruch) kat += Math.sin(t * 0.08) * 0.04 * (1 - k);
  } else if (s.faza === 'chwyta') {
    klatka = gladko(t / R.chwyta) * 5 / 9;
  } else if (s.faza === 'unosi') {
    const k = t / R.unosi;
    klatka = 5 / 9;
    kat += -s.bok * 0.35 * Math.sin(Math.min(1, k) * Math.PI * 0.5);
  } else if (s.faza === 'rzuca') {
    const k = gladko(t / R.rzuca);
    klatka = (5 + 4 * k) / 9;
    kat += -s.bok * 0.35 + s.bok * 0.9 * k;
  } else {
    const k = t / R.cofa;
    klatka = 1;
    kat += s.bok * 0.55 * (1 - gladko(k / 0.4));
    glebiej = gladko(k) * z * 7;
    alfa = 1 - gladko((k - 0.65) / 0.35);
    luna = 1 - gladko(k);
    rysaK = 1 - gladko((k - 0.5) / 0.5);
  }
  if (!img) return;
  // nadgarstek: tak, żeby środek naczynia wypadł na pasie rycerza (w fazie „cofa” — tam, gdzie go puściła)
  const c = Math.cos(kat), sn = Math.sin(kat);
  const ox = NACZYNIE.x * skala, oy = -NACZYNIE.y * skala * lustro;
  const naEkr = { x: ox * c - oy * sn, y: ox * sn + oy * c };
  // chwyta: z miejsca obok rycerza dosuwa się do niego (w dwóch trzecich fazy już obejmuje)
  let cel = s.faza === 'cofa' || !r ? { x: fx, y: fy - z * 3.4 } : pas;
  if (s.faza === 'chwyta') {
    const u = gladko(t / (R.chwyta * 0.66));
    const start = { x: fx - s.bok * z * 1.6 + naEkr.x, y: fy + z * 0.3 + naEkr.y };
    cel = { x: start.x + (pas.x - start.x) * u, y: start.y + (pas.y - start.y) * u };
  }
  const wx = cel.x - naEkr.x, wy = cel.y - naEkr.y + glebiej;
  // rysa i łuna tam, gdzie ramię przechodzi przez podłogę
  const rx = wx + (fy - wy) * Math.cos(kat) / (Math.sin(kat) || 1e-6);
  lunaOtchlani(ctx, rx, fy, z * 4, 0, luna, teraz, ruch);
  rysa(ctx, rx, fy, z, rysaK, 51, true);
  dlonZBrzegu(ctx, img, wx, wy, kat, skala, klatka, lustro, alfa, fy, true, Math.min(1, luna));
  // wyrzut: smuga powietrza nad dłonią, gdy palce się rozwierają
  if (s.faza === 'rzuca') {
    const k = t / R.rzuca;
    ctx.save();
    ctx.strokeStyle = `rgba(255,220,200,${0.5 * Math.sin(k * Math.PI)})`;
    ctx.lineWidth = Math.max(1.5, z * 0.08); ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(pas.x + i * z * 0.6, pas.y + z * 0.8); ctx.lineTo(pas.x + i * z * 0.4 + s.bok * z * 0.8, pas.y - z * 1.6); ctx.stroke();
    }
    ctx.restore();
  }
}

/** Tarcza: otwarta dłoń wyrasta z podłogi przed demonem, wnętrzem do widza, i drży — ciosy się od niej odbijają. */
function rysujTarcze(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, s: Stan, t: number, skala: number, teraz: number, ruch: boolean): void {
  const img = obraz(tarczaUrl);
  const z = cam.zoom;
  const T = D.tarcza;
  const fx = cam.toScreenX(s.x), fy = cam.toScreenY(s.y);
  let klatka = 5 / 9, glebiej = 0, alfa = 1, luna = 1, rysaK = 1;
  if (s.faza === 'wstaje') {
    const k = t / T.wstaje;
    glebiej = (1 - gladko(k / 0.8)) * z * 6.5;
    klatka = gladko(k) * 5 / 9;
    rysaK = gladko(k / 0.35);
    luna = gladko(k / 0.3);
  } else if (s.faza === 'stoi') {
    // drży z wysiłku (mur ↔ napięcie); trafiona — palce drgają
    const odb = sim.tick - (s.odbicieT ?? -1e9);
    klatka = odb < 18 ? 8 / 9 : odb < 34 ? 7 / 9 : (ruch && Math.sin(teraz * 0.02) > 0.3 ? 6 / 9 : 5 / 9);
  } else {
    const k = t / T.cofa;
    klatka = (1 - gladko(k)) * 5 / 9;
    glebiej = gladko(k) * z * 7;
    alfa = 1 - gladko((k - 0.6) / 0.4);
    luna = 1 - gladko(k);
    rysaK = 1 - gladko((k - 0.4) / 0.6);
  }
  lunaOtchlani(ctx, fx, fy, z * 3.5, 0, luna, teraz, ruch);
  rysa(ctx, fx, fy, z, rysaK, 91, true);
  if (s.faza === 'wstaje') odlamki(ctx, fx, fy, z, t / T.wstaje, 97, true, 10);
  if (!img) return;
  const drz = ruch && s.faza === 'stoi' ? Math.sin(teraz * 0.05) * z * 0.03 : 0;
  const kat = -Math.PI / 2 + (ruch && s.faza === 'stoi' ? Math.sin(teraz * 0.004) * 0.03 : 0);
  // nadgarstek pod podłogą — wnętrze dłoni i palce nad nią
  dlonZBrzegu(ctx, img, fx + drz, fy + z * 0.3 + glebiej, kat, skala, klatka, s.bok, alfa, fy, true, Math.min(1, luna));
  // trafiona: iskry i fala na wnętrzu dłoni
  const odb = sim.tick - (s.odbicieT ?? -1e9);
  if (s.faza === 'stoi' && odb < 40) {
    const k = odb / 40;
    const px = fx, py = fy - z * 1.8;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,120,80,${0.7 * (1 - k)})`;
    ctx.lineWidth = Math.max(1.5, z * 0.1 * (1 - k));
    ctx.beginPath(); ctx.ellipse(px, py, z * (0.5 + k * 2.2), z * (0.8 + k * 3), 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = los(odb + i) * Math.PI * 2, d = z * (0.3 + k * 1.6) * (0.6 + los(i + 5));
      ctx.fillStyle = `rgba(255,230,180,${1 - k})`;
      ctx.fillRect(px + Math.cos(a) * d + s.bok * z * 0.8, py + Math.sin(a) * d, Math.max(1.5, z * 0.1), Math.max(1.5, z * 0.1));
    }
    ctx.restore();
  }
}

/** Zawał: szpony przebijają strop, drą skałę, płaskie uderzenie — strop zawala się w ścianę gruzu. */
function rysujZawal(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, s: Stan, t: number, skala: number, teraz: number, ruch: boolean): void {
  const img = obraz(zawalUrl);
  const z = cam.zoom;
  const Z = D.zawal;
  const strop = (s.strop ?? s.y) + 1;
  const cx = cam.toScreenX(s.x + Z.szer / 2), cy = cam.toScreenY(strop);
  const wys = ((s.dno ?? strop + 4) - strop) * z;
  let klatka = 0, wyzej = 0, alfa = 1, luna = 1, rysaK = 1, szarp = 0;
  if (s.faza === 'wstaje') {
    const k = t / Z.wstaje;
    wyzej = (1 - gladko(k)) * z * 6;
    klatka = gladko(k) * 3 / 9;
    rysaK = gladko(k / 0.35);
    luna = gladko(k / 0.3);
  } else if (s.faza === 'drze') {
    const k = t / Z.drze;
    klatka = (3 + 2 * gladko(k)) / 9;
    // szarpnięcia: szpony wbite w skałę, ciągną w dół
    szarp = ruch ? Math.max(0, Math.sin(t * 0.25)) * z * 0.35 : 0;
    wyzej = -z * 0.6 * k;
  } else if (s.faza === 'wali') {
    const k = t / Z.wali;
    klatka = (6 + 3 * gladko(k)) / 9;
    wyzej = -z * 0.6 + z * 1.4 * gladko(k);       // płaskie uderzenie w górę, w strop
  } else {
    const k = t / Z.cofa;
    klatka = 1;
    wyzej = z * 0.8 + gladko(k) * z * 6;
    alfa = 1 - gladko((k - 0.55) / 0.45);
    luna = 1 - gladko(k);
    rysaK = 1 - gladko(k);
  }
  lunaOtchlani(ctx, cx, cy, z * 3, Math.PI, luna * 0.8, teraz, ruch);
  rysa(ctx, cx, cy, z, rysaK, 131, false);
  // ze stropu sypie się: przy przebiciu i przy każdym szarpnięciu
  if (s.faza === 'wstaje') odlamki(ctx, cx, cy, z, t / Z.wstaje, 141, false, 10);
  if (s.faza === 'drze') { odlamki(ctx, cx, cy, z, (t % 30) / 30, 151 + Math.floor(t / 30), false, 6); pyl(ctx, cx, cy + z * 0.5, z * 1.5, 0.5); }
  if (img) {
    // nadgarstek nad stropem, palce w dół (szpony zagięte w hak)
    const kat = Math.PI / 2 + (ruch ? Math.sin(teraz * 0.006) * 0.03 : 0);
    dlonZBrzegu(ctx, img, cx, cy - z * 0.3 - wyzej + szarp, kat, skala, klatka, -s.bok, alfa, cy, false, Math.min(1, luna));
  }
  // płaskie uderzenie: lawina głazów spada w dół kolumny i wznosi się pył
  if (s.faza === 'wali' || (s.faza === 'cofa' && t < 50)) {
    const k = s.faza === 'wali' ? t / Z.wali * 0.4 : 0.4 + (t / 50) * 0.6;
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const gx = cx + (los(i + 300) - 0.5) * Z.szer * z * 1.1;
      const opoz = los(i + 310) * 0.4;
      const kk = Math.max(0, Math.min(1, (k - opoz) / 0.6));
      const gy = cy + kk * kk * wys;
      const r = z * (0.25 + los(i + 320) * 0.3);
      ctx.fillStyle = i % 2 ? '#6e6458' : '#4e463e';
      ctx.strokeStyle = 'rgba(20,14,10,0.9)'; ctx.lineWidth = Math.max(1, z * 0.06);
      ctx.beginPath();
      for (let j = 0; j < 5; j++) { const a = (j / 5) * Math.PI * 2 + los(i * 7 + j); ctx.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r * 0.8); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    pyl(ctx, cx, cy + wys * 0.6, z * (2 + k * 3), 1 - k * 0.6);
    ctx.restore();
  }
}

/** Ściana gruzu po zawale: głazy ułożone od podłogi do stropu; gdy przejdzie jej czas — pękają i osypują się. */
function scianaGruzu(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const sc = sim.lud.dlonDemona!.sciana!;
  const w = sim.world;
  const z = cam.zoom;
  const kr = sc.kruszy !== undefined ? Math.min(1, (sim.tick - sc.kruszy) / D.zawal.kruszy) : 0;
  ctx.save();
  ctx.lineJoin = 'round';
  for (const i of sc.kafle) {
    if (w.tile[i] !== T.ROCK && kr === 0) continue;      // rozkute — puste
    const x = i % w.w, y = (i / w.w) | 0;
    for (let j = 0; j < 2; j++) {
      const n = i * 2 + j;
      const gx = cam.toScreenX(x + 0.3 + los(n) * 0.4), gy0 = cam.toScreenY(y + 0.3 + los(n + 1) * 0.4);
      // kruszenie: głaz pęka, zsuwa się w dół i blednie
      const opoz = los(n + 2) * 0.5;
      const kk = Math.max(0, Math.min(1, (kr - opoz) / 0.5));
      const gy = gy0 + kk * kk * z * 3;
      const r = z * (0.42 + los(n + 3) * 0.2) * (1 - kk * 0.4);
      ctx.globalAlpha = 1 - kk;
      ctx.fillStyle = j ? '#5e554b' : '#7a6f62';
      ctx.strokeStyle = 'rgba(18,12,8,0.95)'; ctx.lineWidth = Math.max(1, z * 0.07);
      ctx.beginPath();
      for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2 + los(n * 5 + q) * 0.6; const rr = r * (0.75 + los(n * 11 + q) * 0.35); ctx.lineTo(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (kr > 0 && kk < 1) {
        ctx.strokeStyle = 'rgba(10,6,4,0.9)';
        ctx.beginPath(); ctx.moveTo(gx - r * 0.5, gy - r * 0.3); ctx.lineTo(gx + r * 0.1, gy + r * 0.2); ctx.lineTo(gx + r * 0.5, gy - r * 0.1); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  // żarzące się szczeliny — gruz zawalony przez otchłań
  if (kr < 1) {
    ctx.globalCompositeOperation = 'lighter';
    const tl = 0.5 + 0.5 * Math.sin(teraz * 0.004);
    for (let k = 0; k < 4; k++) {
      const gx = cam.toScreenX(sc.x + los(k + 400) * D.zawal.szer), gy = cam.toScreenY(sc.strop + 1 + los(k + 410) * (sc.dno - sc.strop - 1));
      const r = z * 0.7 * (0.6 + 0.4 * tl) * (1 - kr);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      g.addColorStop(0, 'rgba(255,90,40,0.45)'); g.addColorStop(1, 'rgba(255,50,20,0)');
      ctx.fillStyle = g; ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    }
  }
  ctx.restore();
  if (kr > 0 && kr < 1) pyl(ctx, cam.toScreenX(sc.x + 1), cam.toScreenY(sc.dno - 0.5), z * (1.5 + kr * 2), 1 - kr);
}

/** Gwiazdki krążące nad głową ogłuszonego (leży — głowa z boku). */
function gwiazdki(ctx: CanvasRenderingContext2D, sx: number, sy: number, h: number, kier: number, teraz: number, ruch: boolean): void {
  const hx = sx - kier * h * 1.1, hy = sy - h * 0.55;
  ctx.save();
  ctx.fillStyle = 'rgba(255,226,140,0.95)';
  ctx.shadowColor = 'rgba(255,210,120,0.9)'; ctx.shadowBlur = 6;
  for (let i = 0; i < 3; i++) {
    const a = (ruch ? teraz * 0.006 : 0) + (i / 3) * Math.PI * 2;
    const x = hx + Math.cos(a) * h * 0.35, y = hy + Math.sin(a) * h * 0.1;
    const r = Math.max(2.5, h * 0.07);
    ctx.beginPath();
    for (let j = 0; j < 10; j++) { const b = (j / 10) * Math.PI * 2 - Math.PI / 2; const rr = j % 2 ? r * 0.4 : r; ctx.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr); }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/** Smugi pędu za lecącym. */
function smugiPedu(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, vx: number, vy: number, t: number): void {
  const v = Math.hypot(vx, vy);
  if (v < 0.05) return;
  const dx = -vx / v, dy = -vy / v;
  ctx.save();
  ctx.strokeStyle = 'rgba(230,220,200,0.45)';
  ctx.lineWidth = Math.max(1, z * 0.06); ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const px = x - dy * i * z * 0.5, py = y + dx * i * z * 0.5;
    const dl = z * (1.2 + v * 4) * (0.7 + 0.3 * Math.sin(t * 0.5 + i));
    ctx.beginPath(); ctx.moveTo(px + dx * z * 0.6, py + dy * z * 0.6); ctx.lineTo(px + dx * dl, py + dy * dl); ctx.stroke();
  }
  ctx.restore();
}

/** Prosta sylwetka rycerza na rycinie atlasu (stopy w 0, 0; `obrot` — koziołkowanie). */
function rycerzNaRycinie(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, obrot = 0, lezy = false): void {
  ctx.save();
  ctx.translate(x, y);
  if (lezy) { ctx.rotate(-Math.PI / 2); ctx.translate(-h * 0.1, 0); }
  ctx.translate(0, -h * 0.5); ctx.rotate(obrot); ctx.translate(0, h * 0.5);
  ctx.fillStyle = 'rgba(30,26,30,0.96)';
  ctx.strokeStyle = 'rgba(220,210,190,0.7)'; ctx.lineWidth = Math.max(1, h * 0.04);
  ctx.beginPath(); ctx.ellipse(0, -h * 0.42, h * 0.16, h * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -h * 0.84, h * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(210,214,224,0.9)'; ctx.lineWidth = Math.max(1, h * 0.05);
  ctx.beginPath(); ctx.moveTo(h * 0.12, -h * 0.45); ctx.lineTo(h * 0.42, -h * 0.85); ctx.stroke();
  ctx.restore();
}

/** Pas skały (podłoga albo strop) na rycinie. */
function pasSkaly(ctx: CanvasRenderingContext2D, w: number, y: number, h: number): void {
  ctx.fillStyle = '#2a211b';
  ctx.fillRect(0, y, w, h);
  ctx.strokeStyle = 'rgba(200,170,130,0.55)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, h > 0 ? y : y + h); ctx.lineTo(w, h > 0 ? y : y + h); ctx.stroke();
}

/**
 * Ryciny atlasu (etap 5b): ta sama dłoń i te same klatki co w grze, w pętli — rzut rycerzem, tarcza przed demonem,
 * zawał stropu.
 */
export function rycinaDloniDemona(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, akcja: 'rzut' | 'tarcza' | 'zawal'): void {
  ctx.save();
  ctx.fillStyle = '#0d0a09'; ctx.fillRect(0, 0, w, h);
  const z = h / 9;
  const fy = h * 0.84;
  pasSkaly(ctx, w, fy, h - fy);
  if (akcja === 'rzut') {
    const img = obraz(rzutUrl);
    const k = (t % 4600) / 4600;
    const skala = z * KJ.rzut;
    const kx = w * 0.42;
    const ph = z * 3;
    const lustro = 1, bok = -1;
    let unies = 0, klatka = 0, kat = -Math.PI / 2, lot = -1;
    if (k < 0.18) klatka = 0;
    else if (k < 0.36) { const u = (k - 0.18) / 0.18; klatka = gladko(u) * 5 / 9; unies = 1.2 * u * u; }
    else if (k < 0.5) { const u = (k - 0.36) / 0.14; klatka = 5 / 9; unies = 1.2 + 0.8 * u; kat += 0.35 * Math.sin(u * Math.PI / 2); }
    else if (k < 0.56) { const u = (k - 0.5) / 0.06; klatka = (5 + 4 * u) / 9; unies = 2 + 0.6 * u; kat += 0.35 - 0.9 * u; }
    else { klatka = 1; lot = (k - 0.56) / 0.44; kat += -0.55; unies = 2.6; }
    const pas = { x: kx, y: fy - unies * z - ph * 0.42 };
    if (img) {
      if (k < 0.18) {
        const u = k / 0.18;
        dlonZBrzegu(ctx, img, kx + bok * z * 1.6, fy + z * 0.3 + (1 - gladko(u)) * z * 6, kat, skala, 0, lustro, 1, fy, true, gladko(u / 0.3));
      } else {
        const c = Math.cos(kat), sn = Math.sin(kat);
        const ox = NACZYNIE.x * skala, oy = -NACZYNIE.y * skala * lustro;
        let cx = pas.x - (ox * c - oy * sn), cy = pas.y - (ox * sn + oy * c);
        if (lot >= 0) cy += gladko(lot) * z * 7;
        dlonZBrzegu(ctx, img, cx, cy, kat, skala, klatka, lustro, lot >= 0 ? 1 - gladko((lot - 0.5) / 0.5) : 1, fy, true, 1);
      }
    }
    if (lot < 0) rycerzNaRycinie(ctx, kx, fy - unies * z, ph);
    else if (lot < 0.75) {
      const u = lot / 0.75;
      const x = kx - bok * u * w * 0.38, y = fy - unies * z - Math.sin(u * Math.PI) * z * 3.5 + u * unies * z;
      rycerzNaRycinie(ctx, x, y, ph, u * 7);
    } else {
      rycerzNaRycinie(ctx, kx - bok * w * 0.38, fy, ph, 0, true);
      const hx = kx - bok * w * 0.38 + ph * 0.6, hy = fy - ph * 0.3;
      ctx.fillStyle = 'rgba(255,226,140,0.95)';
      for (let i = 0; i < 3; i++) { const a = t * 0.006 + i * 2.1; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * ph * 0.3, hy + Math.sin(a) * ph * 0.08, Math.max(2, ph * 0.05), 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (akcja === 'tarcza') {
    const img = obraz(tarczaUrl);
    const k = (t % 4400) / 4400;
    const skala = z * KJ.tarcza;
    const x = w * 0.5;
    // demon za dłonią (cień z rogami), rycerz przed nią
    ctx.fillStyle = 'rgba(70,14,10,0.9)';
    ctx.beginPath(); ctx.ellipse(x - z * 2.6, fy - z * 2.6, z * 1.1, z * 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - z * 3, fy - z * 4.8); ctx.quadraticCurveTo(x - z * 3.8, fy - z * 6, x - z * 3.2, fy - z * 6.4); ctx.lineTo(x - z * 2.8, fy - z * 4.9); ctx.fill();
    rycerzNaRycinie(ctx, x + z * 2.4, fy, z * 3);
    let klatka = 5 / 9, glebiej = 0, alfa = 1;
    if (k < 0.2) { const u = k / 0.2; glebiej = (1 - gladko(u / 0.8)) * z * 6.5; klatka = gladko(u) * 5 / 9; }
    else if (k > 0.85) { const u = (k - 0.85) / 0.15; klatka = (1 - gladko(u)) * 5 / 9; glebiej = gladko(u) * z * 7; alfa = 1 - gladko((u - 0.6) / 0.4); }
    const uderz = k > 0.25 && k < 0.85 && ((k - 0.25) % 0.15) < 0.03;
    if (uderz) klatka = 8 / 9;
    if (img) dlonZBrzegu(ctx, img, x, fy + z * 0.3 + glebiej, -Math.PI / 2, skala, klatka, -1, alfa, fy, true, 1);
    if (uderz) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,140,90,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, fy - z * 1.8, z * 1.2, z * 1.8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  } else {
    const img = obraz(zawalUrl);
    const k = (t % 5200) / 5200;
    const strop = h * 0.16;
    pasSkaly(ctx, w, strop, -strop);
    const skala = z * KJ.zawal;
    const x = w * 0.5;
    rycerzNaRycinie(ctx, x + z * 3.5, fy, z * 3);
    ctx.fillStyle = 'rgba(70,14,10,0.9)';
    ctx.beginPath(); ctx.ellipse(x - z * 3.5, fy - z * 2.4, z * 1, z * 2.4, 0, 0, Math.PI * 2); ctx.fill();
    let klatka = 0, wyzej = 0, alfa = 1, szarp = 0;
    if (k < 0.18) { const u = k / 0.18; wyzej = (1 - gladko(u)) * z * 6; klatka = gladko(u) * 3 / 9; }
    else if (k < 0.38) { const u = (k - 0.18) / 0.2; klatka = (3 + 2 * gladko(u)) / 9; szarp = Math.max(0, Math.sin(u * 20)) * z * 0.35; wyzej = -z * 0.6 * u; }
    else if (k < 0.46) { const u = (k - 0.38) / 0.08; klatka = (6 + 3 * u) / 9; wyzej = -z * 0.6 + z * 1.4 * u; }
    else { const u = Math.min(1, (k - 0.46) / 0.14); klatka = 1; wyzej = z * 0.8 + u * z * 6; alfa = 1 - u; }
    if (img && alfa > 0.01) dlonZBrzegu(ctx, img, x, strop - z * 0.3 - wyzej + szarp, Math.PI / 2, skala, klatka, 1, alfa, strop, false, 1);
    // gruz: spada przy uderzeniu, stoi, a pod koniec się kruszy
    if (k >= 0.4) {
      const opad = Math.min(1, (k - 0.4) / 0.1);
      const kruszy = Math.max(0, (k - 0.88) / 0.12);
      for (let i = 0; i < 14; i++) {
        const gx = x + (los(i + 700) - 0.5) * z * 1.6;
        const docel = fy - z * 0.45 - (i % 7) * z * 0.85;
        const gy = strop + (docel - strop) * opad * opad + kruszy * kruszy * z * 2;
        const r = z * (0.4 + los(i + 710) * 0.15);
        ctx.globalAlpha = 1 - kruszy;
        ctx.fillStyle = i % 2 ? '#6e6458' : '#4e463e';
        ctx.strokeStyle = 'rgba(20,14,10,0.9)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) { const a = (j / 6) * Math.PI * 2 + los(i * 7 + j); ctx.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r * 0.85); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (opad < 1) pyl(ctx, x, fy - z * 3, z * (2 + opad * 3), 1 - opad * 0.5);
    }
  }
  ctx.restore();
}
