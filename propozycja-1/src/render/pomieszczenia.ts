import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Creature } from '../sim/creatures';
import { czyPokoj, zostaloKafli, kotwicaLiny, type Pomieszczenie, type ProbaPlanu, type ZdarzeniePom } from '../sim/pomieszczenia';
import { NAZWA_POMIESZCZENIA, POMIESZCZENIA, type RodzajPomieszczenia } from '../nastawy/pomieszczenia';
import { wolnoRuszac } from './nastroj';
import { SERIF } from './ink';
import { fazaMlota, wysokoscPostaci } from './figury';
import { krzyz, type Urobki } from './kruszce';
import { naWieszaku } from '../sim/zbroja';
import { ZBROJA, CZESC, type CzescZbroi } from '../nastawy/zbroja';

/**
 * POMIESZCZENIA (Alpha, etap 3c) — rysunek planów i gotowych pomieszczeń:
 *  - plan: kontur podwójną kreską rycinową, kafle do wykucia przekreślone, nad nim nazwa i ile zostało;
 *    pod kursorem (zaznaczeni) — rozjaśniony, z podpisem, co zrobią;
 *  - podgląd szablonu pod kursorem: jasny, gdy wolno, czerwony z powodem, gdy nie;
 *  - warsztat: stół, tygiel z roztopionym złotem i krzyż, który złoci się z postępem; gotowy rozbłyskuje i leci
 *    do licznika wiary (render/kruszce.ts);
 *  - kuźnia: palenisko z ogniem, kowadło z rozżarzoną częścią zbroi, iskry w takt młota, wieszak z gotowymi częściami;
 *    gotowa część błyska i unosi się nad kowadłem; etap 3f: rycerz zdejmuje część z wieszaka, ta wędruje w jego rękach
 *    na miejsce (głowa, barki, pierś, kolana, ramię), a gdy siądzie — rozbłyska i unosi się podpis, co daje;
 *  - sypialnia: posłania i świeca, nad śpiącymi „z z z”; kto wstaje bez osłabienia — czerwona aureola rozpływa się;
 *  - gotowe pomieszczenie: obłok pyłu, a wyposażenie opada na swoje miejsce;
 *  - lina (Alpha; w 3d była tu drabina): wisi z żelaznego haka wbitego w skałę, skręcona z konopi, z węzłami na chwyt,
 *    i lekko się kołysze; nowa spada z haka jako zwój, który rozwija się w dół, a potem lina napina się i uspokaja
 *    (z haka sypie się pył, na dole zostaje zwój). Podgląd: złota, przerywana lina, strzałka na półkę i cena.
 * Animacja idzie zegarem ekranu. Symulacja: src/sim/pomieszczenia.ts.
 */

/** Tani skrót liczby — stałe kształty i kierunki iskier (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ZLOTO_PLANU = (a: number) => `rgba(232,196,130,${a})`;
const CZERWIEN = (a: number) => `rgba(226,96,72,${a})`;
const DREWNO = 'rgba(112,74,42,0.98)', TUSZ = 'rgba(20,12,8,0.95)';

/**
 * Gdzie w pomieszczeniu stoi wyposażenie (piksele ekranu) — wspólne dla rzeczy i świateł. Robotnik pracuje na
 * drugim kaflu od lewej (sim/pomieszczenia.ts: miejsceWPom), twarzą w prawo: stół albo kowadło stoi przed nim.
 */
function uklad(cam: Camera, pom: Pomieszczenie) {
  const z = cam.zoom;
  const X = (tx: number) => cam.toScreenX(pom.x + tx);
  const yp = cam.toScreenY(pom.y + pom.h);                     // podłoga
  const stolY = yp - z * 1.05;
  return {
    yp,
    stol: { x1: X(2.15), x2: X(3.9), y: stolY },
    tygiel: { x: X(3.45), y: stolY - z * 0.5 },
    krzyz: { x: X(2.7), y: stolY - z * 0.5, a: z * 0.42 },
    // kuźnia: palenisko pod lewą ścianą (za robotnikiem), kowadło przed nim, wieszak pod prawą ścianą
    kowadlo: { x: X(2.8), y: yp - z * 0.95 },
    palenisko: { x: X(0.5), w: z * 0.5, h: z * 1.9 },
    polka: pom.rodzaj === 'kuznia' ? { x1: X(2.4), x2: X(3.92), y: yp - z * 2.5 } : { x1: X(0.08), x2: X(1.5), y: yp - z * 2.5 },
    // posłania: lewe z poduszką z lewej, prawe — z prawej (głowy pod ścianami)
    poslania: [[X(0.1), X(2.4), -1], [X(2.6), X(4.9), 1]] as [number, number, number][],
    swieca: { x: X(2.5), y: yp - z * 1.9 },
  };
}

/**
 * Tylna ściana, podłoga i rama gotowego pokoju — bez nich pokój wyglądał jak zwykły korytarz w skale.
 * Kuźnia: okopcona cegła (sadza gęstnieje ku stropowi); warsztat: pionowe deski; sypialnia: bielony tynk z lamperią.
 * Podłoga: płyty w kuźni, deski w warsztacie i sypialni. Rama: dwa słupy i belka nad wejściem — pokój jest zbudowany.
 */
function scianaPokoju(ctx: CanvasRenderingContext2D, cam: Camera, pom: Pomieszczenie): void {
  const z = cam.zoom;
  const x0 = cam.toScreenX(pom.x), x1 = cam.toScreenX(pom.x + pom.w);
  const y0 = cam.toScreenY(pom.y), yp = cam.toScreenY(pom.y + pom.h);
  const W = x1 - x0, H = yp - y0;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
  const lw = Math.max(1, z * 0.05);
  if (pom.rodzaj === 'kuznia') {
    ctx.fillStyle = 'rgb(92,52,40)'; ctx.fillRect(x0, y0, W, H);
    // cegły na zakładkę: rząd = pół kafla, cegła = kafel; co któraś ciemniejsza
    const rh = z * 0.5;
    for (let r = 0, y = yp - rh; y > y0 - rh; r++, y -= rh) {
      for (let c = -1, x = x0 - (r & 1) * z * 0.5; x < x1; c++, x += z) {
        const ciemna = ((c * 7 + r * 13) & 3) === 0;
        ctx.fillStyle = ciemna ? 'rgba(40,18,12,0.35)' : 'rgba(150,90,64,0.12)';
        ctx.fillRect(x + lw, y + lw, z - lw * 2, rh - lw * 2);
      }
    }
    ctx.strokeStyle = 'rgba(28,14,10,0.7)'; ctx.lineWidth = lw;
    ctx.beginPath();
    for (let r = 0, y = yp; y > y0; r++, y -= rh) {
      ctx.moveTo(x0, y); ctx.lineTo(x1, y);
      for (let x = x0 - (r & 1) * z * 0.5; x < x1; x += z) { ctx.moveTo(x, y); ctx.lineTo(x, y - rh); }
    }
    ctx.stroke();
    // sadza: od paleniska (lewa ściana) w górę i pod stropem
    const sadza = ctx.createLinearGradient(0, y0, 0, yp);
    sadza.addColorStop(0, 'rgba(14,8,6,0.75)'); sadza.addColorStop(0.55, 'rgba(14,8,6,0.2)'); sadza.addColorStop(1, 'rgba(14,8,6,0)');
    ctx.fillStyle = sadza; ctx.fillRect(x0, y0, W, H);
  } else if (pom.rodzaj === 'warsztat') {
    ctx.fillStyle = 'rgb(112,80,52)'; ctx.fillRect(x0, y0, W, H);
    // pionowe deski z słojami i sękami, belka pod stropem
    const dw = z * 0.5;
    ctx.lineWidth = lw;
    for (let i = 0, x = x0; x < x1; i++, x += dw) {
      ctx.fillStyle = (i * 5) % 3 === 0 ? 'rgba(60,36,20,0.18)' : (i % 2 ? 'rgba(170,124,80,0.1)' : 'rgba(0,0,0,0)');
      ctx.fillRect(x, y0, dw, H);
      ctx.strokeStyle = 'rgba(36,22,12,0.75)';
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, yp); ctx.stroke();
      ctx.strokeStyle = 'rgba(52,32,18,0.3)';
      ctx.beginPath();
      for (let k = 1; k <= 2; k++) { const sx = x + dw * k / 3; ctx.moveTo(sx, y0); ctx.bezierCurveTo(sx + dw * 0.08, y0 + H * 0.35, sx - dw * 0.08, y0 + H * 0.65, sx, yp); }
      ctx.stroke();
      if (((i * 11) & 3) === 1) { ctx.fillStyle = 'rgba(46,28,14,0.6)'; ctx.beginPath(); ctx.ellipse(x + dw * 0.5, y0 + H * (0.3 + ((i * 7) % 5) * 0.1), dw * 0.12, dw * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  } else {
    // sypialnia w półmroku: ciepły, przybrudzony tynk (dawniej biały — najjaśniejszy punkt kadru, jak ikona kłódki)
    ctx.fillStyle = 'rgb(116,96,76)'; ctx.fillRect(x0, y0, W, H);
    // tynk: plamy wilgoci i rysy, ciemniejsza lamperia u dołu
    const plama = ctx.createRadialGradient(x0 + W * 0.7, y0 + H * 0.2, 0, x0 + W * 0.7, y0 + H * 0.2, W * 0.5);
    plama.addColorStop(0, 'rgba(70,56,42,0.3)'); plama.addColorStop(1, 'rgba(70,56,42,0)');
    ctx.fillStyle = plama; ctx.fillRect(x0, y0, W, H);
    ctx.fillStyle = 'rgba(64,46,32,0.6)'; ctx.fillRect(x0, yp - z * 0.55, W, z * 0.55);
    ctx.strokeStyle = 'rgba(60,42,30,0.6)'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x0, yp - z * 0.55); ctx.lineTo(x1, yp - z * 0.55); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,76,58,0.45)';
    ctx.beginPath(); ctx.moveTo(x0 + W * 0.18, y0); ctx.lineTo(x0 + W * 0.22, y0 + H * 0.2); ctx.lineTo(x0 + W * 0.19, y0 + H * 0.33); ctx.stroke();
  }
  // cień w kątach: ściana chowa się pod stropem i przy bokach skały
  const gora = ctx.createLinearGradient(0, y0, 0, y0 + z * 0.8);
  gora.addColorStop(0, 'rgba(10,6,4,0.55)'); gora.addColorStop(1, 'rgba(10,6,4,0)');
  ctx.fillStyle = gora; ctx.fillRect(x0, y0, W, z * 0.8);
  for (const [xs, kier] of [[x0, 1], [x1, -1]] as const) {
    const bok = ctx.createLinearGradient(xs, 0, xs + kier * z * 0.6, 0);
    bok.addColorStop(0, 'rgba(10,6,4,0.45)'); bok.addColorStop(1, 'rgba(10,6,4,0)');
    ctx.fillStyle = bok; ctx.fillRect(Math.min(xs, xs + kier * z * 0.6), y0, z * 0.6, H);
  }
  ctx.restore();
  // podłoga: pas na wierzchu litej podłogi — płyty w kuźni, deski gdzie indziej
  const ph = Math.max(2, z * 0.2);
  ctx.save();
  ctx.lineWidth = lw; ctx.strokeStyle = TUSZ;
  ctx.fillStyle = pom.rodzaj === 'kuznia' ? 'rgb(88,84,80)' : 'rgb(120,86,54)';
  ctx.beginPath(); ctx.rect(x0, yp, W, ph); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  const krok = pom.rodzaj === 'kuznia' ? z * 0.9 : z * 0.6;
  for (let x = x0 + krok; x < x1 - 1; x += krok) { ctx.moveTo(x, yp); ctx.lineTo(x, yp + ph); }
  ctx.stroke();
  // obramowanie skałą: poszarpana krawędź wykutego wnętrza tuszem (dawniej gruba belka i słupy — szafka w ścianie)
  ctx.lineWidth = Math.max(1.2, z * 0.07);
  ctx.beginPath();
  const drg = (n: number) => (Math.sin(n * 12.9898 + pom.x * 78.233) * 43758.5453 % 1) * z * 0.06;
  ctx.moveTo(x0, yp);
  for (let k = 0, y = yp; y > y0; k++, y -= z * 0.4) ctx.lineTo(x0 + drg(k), y);
  for (let k = 0, x = x0; x < x1; k++, x += z * 0.4) ctx.lineTo(x, y0 + drg(k + 50));
  for (let k = 0, y = y0; y < yp; k++, y += z * 0.4) ctx.lineTo(x1 + drg(k + 90), y);
  ctx.lineTo(x1, yp);
  ctx.stroke();
  ctx.restore();
}

/** Półka albo wieszak na lewej ścianie. */
function polka(ctx: CanvasRenderingContext2D, p: { x1: number; x2: number; y: number }, z: number): void {
  ctx.fillStyle = DREWNO;
  ctx.beginPath(); ctx.rect(p.x1, p.y, p.x2 - p.x1, z * 0.1); ctx.fill(); ctx.stroke();
}

/** Co zrobią zaznaczeni, gdy dotkniesz tego miejsca — podpis nad pomieszczeniem pod kursorem. */
export interface PodKursorem { pom: Pomieszczenie; akcja: string; ok: boolean }

/** Część zbroi jako mały znak: hełm, naramienniki, napierśnik, nakolanniki, tarcza (środek w x, y, wielkość s). */
export function rysujCzesc(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, s: number, wypelnienie: string, obrys: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  switch (id) {
    case 'helm':
      ctx.arc(0, s * 0.1, s * 0.42, Math.PI, 0);
      ctx.lineTo(s * 0.42, s * 0.3); ctx.lineTo(-s * 0.42, s * 0.3); ctx.closePath();
      break;
    case 'naramienniki':
      for (const k of [-1, 1]) { ctx.moveTo(k * s * 0.08, s * 0.25); ctx.quadraticCurveTo(k * s * 0.1, -s * 0.3, k * s * 0.5, -s * 0.05); ctx.lineTo(k * s * 0.42, s * 0.25); ctx.closePath(); }
      break;
    case 'napiersnik':
      ctx.moveTo(-s * 0.36, -s * 0.38); ctx.lineTo(s * 0.36, -s * 0.38); ctx.lineTo(s * 0.3, s * 0.18);
      ctx.quadraticCurveTo(0, s * 0.48, -s * 0.3, s * 0.18); ctx.closePath();
      break;
    case 'nakolanniki':
      for (const k of [-1, 1]) { ctx.moveTo(k * s * 0.22 + s * 0.17, 0); ctx.arc(k * s * 0.22, 0, s * 0.17, 0, Math.PI * 2); }
      break;
    default: // tarcza
      ctx.moveTo(-s * 0.36, -s * 0.4); ctx.lineTo(s * 0.36, -s * 0.4); ctx.lineTo(s * 0.34, 0);
      ctx.quadraticCurveTo(s * 0.2, s * 0.36, 0, s * 0.48); ctx.quadraticCurveTo(-s * 0.2, s * 0.36, -s * 0.34, 0); ctx.closePath();
  }
  ctx.fillStyle = wypelnienie; ctx.fill();
  ctx.strokeStyle = obrys; ctx.lineWidth = Math.max(1, s * 0.07); ctx.stroke();
  if (id === 'tarcza') {
    ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.lineTo(0, s * 0.3); ctx.moveTo(-s * 0.22, -s * 0.08); ctx.lineTo(s * 0.22, -s * 0.08); ctx.stroke();
  }
  ctx.restore();
}

export class Pokoje {
  private widziane = new WeakSet<ZdarzeniePom>();
  private animacje: { z: ZdarzeniePom; od: number }[] = [];
  /** Kiedy (zegar ekranu) pomieszczenie stało się gotowe — wyposażenie opada na miejsce. */
  private gotoweOd = new Map<number, number>();
  /** Liny, które właśnie spadły (zegar ekranu): kolumna, od–do — rozwijają się i uspokajają. */
  private liny: { x: number; y0: number; y1: number; od: number }[] = [];

  /** Bierze świeże zdarzenia z symulacji; krzyż z warsztatu rusza do licznika wiary. */
  zbierz(sim: Sim, teraz: number, urobki: Urobki): void {
    for (const z of sim.zdarzeniaPom) {
      if (this.widziane.has(z)) continue;
      this.widziane.add(z);
      if (z.rodzaj === 'krzyz') urobki.dodaj('wiara', z.ile, z.x, z.y, teraz);
      if (z.rodzaj === 'gotowe') this.gotoweOd.set(z.pom, teraz);
      if (z.rodzaj === 'lina') this.liny.push({ x: z.x, y0: z.y0, y1: z.y1, od: teraz });
      this.animacje.push({ z, od: teraz });
    }
    if (this.animacje.length) this.animacje = this.animacje.filter((a) => teraz - a.od < 2500);
    if (this.liny.length) this.liny = this.liny.filter((a) => teraz - a.od < LINA_SPADA + LINA_USPOKAJA);
  }

  /** Wyposażenie gotowych pomieszczeń — rzeczy, które ciemność zakrywa (przed mrokiem). Skala postaci: człowiek ma ok. 2 kafle. */
  rysujWnetrza(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
    const z = cam.zoom;
    rysujLiny(ctx, sim, cam, teraz, this.liny);
    ctx.save();
    ctx.lineJoin = 'round';
    for (const pom of sim.pomieszczenia) {
      if (!pom.gotowe || !czyPokoj(pom.rodzaj) || !widac(cam, pom)) continue;
      const od = this.gotoweOd.get(pom.id);
      const k = od === undefined || !wolnoRuszac() ? 1 : Math.min(1, (teraz - od) / 700);
      if (k <= 0) continue;
      const u = uklad(cam, pom);
      ctx.globalAlpha = k;
      scianaPokoju(ctx, cam, pom);
      ctx.save();
      ctx.translate(0, -(1 - k) * (1 - k) * z * 1.2);            // wyposażenie opada na miejsce
      ctx.lineWidth = Math.max(1, z * 0.06);
      ctx.strokeStyle = TUSZ;
      if (pom.rodzaj === 'warsztat') {
        // stół na dwóch nogach, tygiel na jego końcu, półka z gotowymi krzyżami na lewej ścianie
        const { x1, x2, y } = u.stol;
        ctx.fillStyle = DREWNO;
        for (const xn of [x1 + z * 0.15, x2 - z * 0.3]) { ctx.beginPath(); ctx.rect(xn, y, z * 0.15, u.yp - y); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.rect(x1, y, x2 - x1, z * 0.16); ctx.fill(); ctx.stroke();
        const t0 = u.tygiel;
        ctx.beginPath(); ctx.moveTo(t0.x - z * 0.28, t0.y); ctx.lineTo(t0.x + z * 0.28, t0.y); ctx.lineTo(t0.x + z * 0.2, y); ctx.lineTo(t0.x - z * 0.2, y); ctx.closePath();
        ctx.fillStyle = 'rgba(58,48,44,0.98)'; ctx.fill(); ctx.stroke();
        polka(ctx, u.polka, z);
        const wyrobow = Math.min(3, sim.stat.dewocjonalia ?? 0);
        for (let i = 0; i < wyrobow; i++) {
          ctx.save(); ctx.translate(u.polka.x1 + z * (0.3 + i * 0.42), u.polka.y - z * 0.27);
          ctx.beginPath(); krzyz(ctx, z * 0.24); ctx.fillStyle = 'rgba(222,178,84,0.95)'; ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
          ctx.restore();
        }
      } else if (pom.rodzaj === 'kuznia') {
        // palenisko pod prawą ścianą (kamienny łuk), kowadło na pniu, wieszak z wykutymi częściami na lewej ścianie
        const { x: hx, w: hw, h: hh } = u.palenisko;
        ctx.fillStyle = 'rgba(70,60,54,0.98)';
        ctx.beginPath(); ctx.moveTo(hx - hw, u.yp); ctx.lineTo(hx - hw, u.yp - hh * 0.6); ctx.quadraticCurveTo(hx, u.yp - hh * 1.3, hx + hw, u.yp - hh * 0.6); ctx.lineTo(hx + hw, u.yp); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(16,8,6,0.98)';
        ctx.beginPath(); ctx.moveTo(hx - hw * 0.62, u.yp); ctx.lineTo(hx - hw * 0.62, u.yp - hh * 0.42); ctx.quadraticCurveTo(hx, u.yp - hh * 0.85, hx + hw * 0.62, u.yp - hh * 0.42); ctx.lineTo(hx + hw * 0.62, u.yp); ctx.closePath(); ctx.fill();
        const { x: ax, y: ay } = u.kowadlo;
        ctx.fillStyle = DREWNO;
        ctx.beginPath(); ctx.rect(ax - z * 0.3, u.yp - z * 0.55, z * 0.6, z * 0.55); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(46,46,52,0.99)';
        ctx.beginPath();
        ctx.moveTo(ax - z * 0.22, u.yp - z * 0.55); ctx.lineTo(ax + z * 0.22, u.yp - z * 0.55); ctx.lineTo(ax + z * 0.3, ay + z * 0.22);
        ctx.lineTo(ax + z * 0.45, ay + z * 0.22); ctx.quadraticCurveTo(ax + z * 0.75, ay + z * 0.12, ax + z * 0.85, ay);
        ctx.lineTo(ax - z * 0.55, ay); ctx.lineTo(ax - z * 0.55, ay + z * 0.22); ctx.lineTo(ax - z * 0.3, ay + z * 0.22); ctx.closePath();
        ctx.fill(); ctx.stroke();
        polka(ctx, u.polka, z);
        // na wieszaku to, czego nikt nie nosi; część, którą rycerz właśnie zdjął, jest już w jego rękach (rysujNad)
        const zdjeta = zakladajacy(sim, pom).some((c) => postepZakladania(c) >= ZDEJMUJE);
        naWieszaku(sim).forEach((id, i) => {
          if (i === 0 && zdjeta) return;
          const [hx, hy] = hakWieszaka(u, z, i);
          rysujCzesc(ctx, id, hx, hy, z * 0.42, 'rgba(176,182,194,0.98)', TUSZ);
        });
      } else {
        // dwa posłania na długość człowieka i świeca w niszy między nimi
        for (const [b1, b2, glowa] of u.poslania) {
          const d = b2 - b1;
          ctx.fillStyle = 'rgba(150,120,70,0.98)';
          ctx.beginPath(); ctx.rect(b1, u.yp - z * 0.3, d, z * 0.3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(112,34,30,0.96)';
          ctx.beginPath(); ctx.rect(glowa < 0 ? b1 + d * 0.3 : b1, u.yp - z * 0.36, d * 0.7, z * 0.16); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(206,190,156,0.98)';
          ctx.beginPath(); ctx.ellipse(glowa < 0 ? b1 + d * 0.14 : b2 - d * 0.14, u.yp - z * 0.36, d * 0.11, z * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        // nisza świecy: płytkie, szerokie wgłębienie w tynku, rozjaśnione od płomienia (dawniej czarny łuk
        // z białą świecą — dziurka od klucza na białej ścianie)
        const s = u.swieca;
        const nisza = new Path2D();
        nisza.moveTo(s.x - z * 0.42, s.y + z * 0.1); nisza.lineTo(s.x - z * 0.42, s.y - z * 0.2);
        nisza.quadraticCurveTo(s.x - z * 0.42, s.y - z * 0.5, s.x, s.y - z * 0.52);
        nisza.quadraticCurveTo(s.x + z * 0.42, s.y - z * 0.5, s.x + z * 0.42, s.y - z * 0.2);
        nisza.lineTo(s.x + z * 0.42, s.y + z * 0.1); nisza.closePath();
        const gn = ctx.createRadialGradient(s.x, s.y - z * 0.25, 0, s.x, s.y - z * 0.2, z * 0.55);
        gn.addColorStop(0, 'rgba(150,104,62,0.95)'); gn.addColorStop(1, 'rgba(58,40,28,0.95)');
        ctx.fillStyle = gn; ctx.fill(nisza);
        ctx.lineWidth = Math.max(1, z * 0.04); ctx.strokeStyle = 'rgba(30,20,14,0.8)'; ctx.stroke(nisza);
        ctx.fillStyle = 'rgba(214,196,160,0.98)';
        ctx.beginPath(); ctx.rect(s.x - z * 0.05, s.y - z * 0.2, z * 0.1, z * 0.28); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /**
   * Nad mrokiem: plany, światła (ogień paleniska, roztopione złoto, iskry, płonąca świeca), „z z z”, zdarzenia
   * i pomieszczenie pod kursorem.
   */
  rysujNad(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, pod: PodKursorem | null): void {
    const z = cam.zoom;
    const ruch = wolnoRuszac();
    ctx.save();
    for (const pom of sim.pomieszczenia) {
      if (!widac(cam, pom)) continue;
      if (!pom.gotowe) { rysujPlan(ctx, sim, cam, pom, teraz, pod?.pom === pom ? pod : null); continue; }
      const u = uklad(cam, pom);
      const przy = pracujacy(sim, pom);
      if (pom.rodzaj === 'kuznia') {
        // ogień paleniska: zawsze się tli, przy pracy bucha
        const hx = u.palenisko.x, hy = u.yp - z * 0.35;
        const migot = ruch ? 0.75 + 0.25 * Math.sin(teraz * 0.013) * Math.sin(teraz * 0.0071 + 1) : 0.85;
        const moc = (przy.length ? 1 : 0.45) * migot;
        const R = z * (2 + moc);
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
        g.addColorStop(0, `rgba(255,170,70,${0.55 * moc})`); g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.fillRect(hx - R, hy - R, R * 2, R * 2);
        for (let i = 0; i < 5; i++) {
          const f = ruch ? (teraz * 0.004 + i * 0.21) % 1 : 0.4;
          const fx = hx + (los(i * 13) - 0.5) * z * 0.5, fh = z * 0.7 * (1 - f) * moc;
          ctx.fillStyle = `rgba(255,${Math.round(150 + 90 * (1 - f))},70,${0.8 * (1 - f)})`;
          ctx.beginPath(); ctx.ellipse(fx, u.yp - z * 0.1 - f * z * 0.5, z * 0.1, fh * 0.5 + 1, 0, 0, Math.PI * 2); ctx.fill();
        }
        // część zbroi na kowadle — rozżarzona, stygnie z postępem
        const ax = u.kowadlo.x, ay = u.kowadlo.y;
        if (pom.zaplacone) {
          const cz = POMIESZCZENIA.kuznia.czesci.find((c) => !sim.zbroja.includes(c.id));
          if (cz) {
            const zar = 1 - (pom.postep ?? 0) * 0.6;
            rysujCzesc(ctx, cz.id, ax - z * 0.05, ay - z * 0.25, z * 0.55, `rgba(255,${Math.round(110 + 80 * (1 - zar))},${Math.round(40 + 120 * (1 - zar))},0.95)`, 'rgba(60,20,8,0.9)');
          }
        }
        for (const c of przy) iskryZKowadla(ctx, ax - z * 0.05, ay - z * 0.1, z, c, teraz);
      } else if (pom.rodzaj === 'warsztat') {
        if (pom.zaplacone) {
          // roztopione złoto w tyglu
          const t0 = u.tygiel;
          const migot = ruch ? 0.8 + 0.2 * Math.sin(teraz * 0.009) : 0.9;
          const g = ctx.createRadialGradient(t0.x, t0.y, 0, t0.x, t0.y, z * 1.4);
          g.addColorStop(0, `rgba(255,214,110,${0.6 * migot})`); g.addColorStop(1, 'rgba(255,190,80,0)');
          ctx.fillStyle = g; ctx.fillRect(t0.x - z * 1.4, t0.y - z * 1.4, z * 2.8, z * 2.8);
          ctx.fillStyle = `rgba(255,226,130,${migot})`;
          ctx.beginPath(); ctx.ellipse(t0.x, t0.y, z * 0.25, z * 0.07, 0, 0, Math.PI * 2); ctx.fill();
          // krzyż na stole złoci się od dołu z postępem
          const { x: kx, y: ky, a } = u.krzyz;
          ctx.save();
          ctx.translate(kx, ky);
          ctx.beginPath(); krzyz(ctx, a);
          ctx.fillStyle = 'rgba(60,44,20,0.9)'; ctx.fill();
          ctx.save(); ctx.clip();
          const pp = pom.postep ?? 0;
          ctx.fillStyle = 'rgba(244,204,104,0.98)';
          ctx.fillRect(-a, a - pp * a * 2, a * 2, pp * a * 2);
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,236,170,0.9)'; ctx.lineWidth = Math.max(1, z * 0.05); ctx.stroke();
          ctx.restore();
          for (const c of przy) iskryZKowadla(ctx, kx, ky, z * 0.6, c, teraz, true);
        }
      } else if (pom.rodzaj === 'sypialnia') {
        // płomyk świecy i „z z z” nad śpiącymi
        const s = u.swieca;
        const m = ruch ? 0.8 + 0.2 * Math.sin(teraz * 0.011) : 0.9;
        const g = ctx.createRadialGradient(s.x, s.y - z * 0.4, 0, s.x, s.y - z * 0.4, z * 1.8);
        g.addColorStop(0, `rgba(255,214,140,${0.45 * m})`); g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g; ctx.fillRect(s.x - z * 1.8, s.y - z * 2.2, z * 3.6, z * 3.6);
        ctx.fillStyle = `rgba(255,230,150,${m})`;
        ctx.beginPath(); ctx.ellipse(s.x, s.y - z * 0.4, z * 0.06, z * 0.13, 0, 0, Math.PI * 2); ctx.fill();
        for (const c of sim.creatures) {
          if (c.dead || c.czynnosc !== 'spi' || c.polecenie?.pom !== pom.id) continue;
          // nad głową leżącego (tułów leży ok. dwóch kafli w stronę, w którą patrzy — render/postacie.ts)
          const glowa = cam.toScreenX(c.x) - wysokoscPostaci(c, z) * 1.3 * (c.face >= 0 ? 1 : -1);
          zzz(ctx, glowa, cam.toScreenY(c.y + 0.5), z, teraz + c.id * 400, ruch);
        }
      }
      // czego brakuje do pracy
      if (pom.brak && przy.length && z >= 5) {
        podpis(ctx, pom.brak, cam.toScreenX(pom.x) + (pom.w * z) / 2, cam.toScreenY(pom.y) - z * 0.3, z, pom.brak === 'zbroja gotowa' ? ZLOTO_PLANU(0.95) : CZERWIEN(0.95));
      }
      if (pod?.pom === pom) obrysPod(ctx, cam, pom, pod, teraz);
    }
    this.rysujZdarzenia(ctx, sim, cam, teraz);
    ctx.restore();
  }

  /**
   * Etap 3f: przed postaciami (rysuje się po nich) — część zbroi w rękach rycerza i błysk, gdy siądzie na nim.
   */
  rysujPrzod(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
    const z = cam.zoom;
    ctx.save();
    for (const pom of sim.pomieszczenia) {
      if (!pom.gotowe || pom.rodzaj !== 'kuznia' || !widac(cam, pom)) continue;
      const u = uklad(cam, pom);
      for (const c of zakladajacy(sim, pom)) czescWRekach(ctx, sim, cam, c, u, teraz);
    }
    for (const { z: e, od } of this.animacje) {
      if (e.rodzaj !== 'zbroja') continue;
      const t = (teraz - od) / 1000;
      // część siadła na rycerzu: błysk z promieniami w tym miejscu, krąg światła i podpis, co daje
      const c = sim.creatureById(e.kto);
      if (!c || t > 1.8) continue;
      const cz = e.czesc as CzescZbroi;
      const [x, y] = naCiele(cam, c, cz);
      const p = t / 1.8, b = Math.max(0, 1 - t / 0.5);
      const R = z * (0.5 + 1.8 * Math.min(1, t * 4));
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, `rgba(255,246,214,${0.85 * (1 - p)})`); g.addColorStop(0.35, `rgba(255,226,160,${0.35 * (1 - p)})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
      if (b > 0) {
        ctx.strokeStyle = `rgba(255,250,230,${0.95 * b})`; ctx.lineWidth = Math.max(1, z * 0.07); ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.3, r0 = z * (0.25 + t * 0.8), r1 = r0 + z * (i % 2 ? 0.35 : 0.65) * b;
          ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        }
        ctx.stroke();
      }
      const a = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      ctx.font = `italic ${Math.max(12, Math.min(16, z * 0.7))}px ${SERIF}`;
      ctx.textAlign = 'center';
      const tekst = `${CZESC[cz].nazwa}: ${CZESC[cz].skutek}`, ty = cam.toScreenY(c.y + 1) - wysokoscPostaci(c, z) * 1.15 - p * z * 1.2;
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(8,6,5,${0.8 * a})`; ctx.strokeText(tekst, x, ty);
      ctx.fillStyle = ZLOTO_PLANU(0.98 * a); ctx.fillText(tekst, x, ty);
    }
    ctx.restore();
  }

  /** Obłok pyłu przy gotowym pomieszczeniu, gotowa część zbroi nad kowadłem, gasnąca czerwona aureola. */
  private rysujZdarzenia(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
    const z = cam.zoom;
    for (const { z: e, od } of this.animacje) {
      const t = (teraz - od) / 1000;
      if (e.rodzaj === 'gotowe') {
        const pom = sim.pomieszczenia.find((p) => p.id === e.pom);
        if (!pom || t > 1) continue;
        for (let i = 0; i < 16; i++) {
          const px = cam.toScreenX(pom.x + los(i * 7 + pom.id) * pom.w), py = cam.toScreenY(pom.y + pom.h - los(i * 11 + pom.id) * pom.h * 0.6);
          const r = z * (0.2 + t * 0.6) * (0.6 + los(i));
          ctx.fillStyle = `rgba(196,176,140,${0.45 * (1 - t)})`;
          ctx.beginPath(); ctx.arc(px, py - t * z * 0.6, r, 0, Math.PI * 2); ctx.fill();
        }
      } else if (e.rodzaj === 'czesc') {
        if (t > 2.2) continue;
        const p = Math.min(1, t / 2.2);
        const x = cam.toScreenX(e.x), y = cam.toScreenY(e.y) - p * z * 1.6;
        const a = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
        const R = z * (0.6 + 1.2 * Math.min(1, t * 3));
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, `rgba(255,236,180,${0.7 * a})`); g.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
        ctx.globalAlpha = a;
        rysujCzesc(ctx, e.czesc, x, y, z * 0.7, 'rgba(206,212,224,0.98)', 'rgba(20,12,8,0.95)');
        const nazwa = POMIESZCZENIA.kuznia.czesci.find((c) => c.id === e.czesc)?.nazwa ?? '';
        ctx.font = `italic ${Math.max(12, Math.min(16, z * 0.7))}px ${SERIF}`;
        ctx.textAlign = 'center'; ctx.fillStyle = ZLOTO_PLANU(0.95);
        ctx.fillText(`${nazwa} dla rycerza`, x, y - z * 0.6);
        ctx.globalAlpha = 1;
      } else if (e.rodzaj === 'lina') {
        // pył sypie się spod haka, a gdy zwój dotknie dna — obłoczek przy podłodze
        if (t > 1.6) continue;
        const x = cam.toScreenX(e.x + 0.5), yh = cam.toScreenY(e.y0);
        const p1 = Math.min(1, t / 0.6);
        for (let i = 0; i < 9; i++) {
          const px = x + (los(i * 5 + e.y0) - 0.5) * z * 0.8, py = yh + p1 * z * (0.5 + 1.2 * los(i * 3 + e.x));
          ctx.fillStyle = `rgba(190,160,110,${0.7 * (1 - p1)})`;
          ctx.beginPath(); ctx.arc(px, py, Math.max(0.8, z * 0.05), 0, Math.PI * 2); ctx.fill();
        }
        const tDol = t - LINA_SPADA / 1000;
        if (tDol > 0 && tDol < 0.8) {
          const pd = tDol / 0.8, yd = cam.toScreenY(e.y1 + 2);
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = `rgba(196,176,140,${0.4 * (1 - pd)})`;
            ctx.beginPath(); ctx.arc(x + (los(i * 7 + e.x) - 0.5) * z * (0.6 + pd), yd - pd * z * 0.3, z * (0.12 + pd * 0.25), 0, Math.PI * 2); ctx.fill();
          }
        }
      } else if (e.rodzaj === 'wypoczety') {
        const c = sim.creatureById(e.kto);
        if (!c || t > 1.4) continue;
        const x = cam.toScreenX(c.x), y = cam.toScreenY(c.y) - z * 0.6;
        const p = t / 1.4;
        // czerwona aureola rośnie i rozpływa się, a na jej miejscu na chwilę jaśnieje
        ctx.strokeStyle = CZERWIEN(0.9 * (1 - p)); ctx.lineWidth = Math.max(1.5, z * 0.08);
        ctx.beginPath(); ctx.ellipse(x, y - p * z * 0.8, z * (0.4 + p * 0.9), z * (0.13 + p * 0.3), 0, 0, Math.PI * 2); ctx.stroke();
        const g = ctx.createRadialGradient(x, y, 0, x, y, z * 1.2);
        g.addColorStop(0, `rgba(255,240,190,${0.5 * Math.sin(p * Math.PI)})`); g.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = g; ctx.fillRect(x - z * 1.2, y - z * 1.2, z * 2.4, z * 2.4);
      }
    }
  }

  /** Podgląd szablonu pod kursorem: jasny kontur, gdy wolno, czerwony z powodem, gdy nie. */
  podglad(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, p: ProbaPlanu, teraz: number, podpowiedz?: string): void {
    const z = cam.zoom;
    ctx.save();
    const barwa = p.ok ? ZLOTO_PLANU : CZERWIEN;
    const w = sim.world;
    ctx.fillStyle = barwa(0.16);
    for (const i of p.kafle) {
      const x = i % w.w, y = (i / w.w) | 0;
      ctx.fillRect(cam.toScreenX(x), cam.toScreenY(y), z, z);
    }
    ctx.setLineDash([Math.max(3, z * 0.35), Math.max(2, z * 0.2)]);
    ctx.lineDashOffset = wolnoRuszac() ? -teraz * 0.02 : 0;
    ctx.strokeStyle = barwa(0.95); ctx.lineWidth = Math.max(1.6, z * 0.1);
    obrysKafli(ctx, cam, p.kafle, w.w);
    ctx.setLineDash([]);
    // lina: przerywany zarys liny z haka (tam, gdzie uczepi się skały) do podłogi, a przy krawędzi półki — strzałka na nią
    if (p.rodzaj === 'lina') {
      const k = kotwicaLiny(w, p.x, p.y);
      const { lx, ly } = zaczepienie(p.x, p.y, k);
      ctx.setLineDash([Math.max(3, z * 0.3), Math.max(2, z * 0.18)]);
      ctx.strokeStyle = barwa(0.9); ctx.lineWidth = Math.max(1.6, z * 0.12);
      ctx.beginPath(); ctx.moveTo(cam.toScreenX(lx), cam.toScreenY(ly)); ctx.lineTo(cam.toScreenX(lx), cam.toScreenY(p.y + p.h)); ctx.stroke();
      ctx.setLineDash([]);
      if (k) hakWSkale(ctx, cam, p.x, p.y, z, k, p.ok ? 0.75 : 0.35);
      if (p.ok && p.kier && k?.rodzaj === 'krawedz') {
        const ax = cam.toScreenX(p.x + 0.5 + p.kier * 0.9), ay = cam.toScreenY(p.y + 0.5);
        ctx.fillStyle = barwa(0.95);
        ctx.beginPath(); ctx.moveTo(ax + p.kier * z * 0.35, ay); ctx.lineTo(ax - p.kier * z * 0.1, ay - z * 0.28); ctx.lineTo(ax - p.kier * z * 0.1, ay + z * 0.28); ctx.closePath(); ctx.fill();
      }
    }
    // podłoga pod planem
    if (czyPokoj(p.rodzaj)) {
      ctx.strokeStyle = barwa(0.6); ctx.lineWidth = Math.max(1, z * 0.06);
      ctx.beginPath(); ctx.moveTo(cam.toScreenX(p.x), cam.toScreenY(p.y + p.h) + 1); ctx.lineTo(cam.toScreenX(p.x + p.w), cam.toScreenY(p.y + p.h) + 1); ctx.stroke();
    }
    const tekst = p.ok ? (podpowiedz ?? `${NAZWA_POMIESZCZENIA[p.rodzaj]} — dotknij, by wyznaczyć`) : (p.powod ?? 'tu nie wolno');
    // korytarz i szyb zaczynają się tam, gdzie stoi lud (nad nimi bywa podpis siedziby) — podpis pod planem
    const yPodpisu = czyPokoj(p.rodzaj) ? cam.toScreenY(p.y) - z * 0.35 : cam.toScreenY(p.y + p.h) + z * 1.1;
    podpis(ctx, tekst, cam.toScreenX(p.x) + (p.w * z) / 2, yPodpisu, z, p.ok ? ZLOTO_PLANU(0.98) : CZERWIEN(0.98));
    ctx.restore();
  }
}

/** Czy pomieszczenie jest w kadrze. */
function widac(cam: Camera, p: Pomieszczenie): boolean {
  const z = cam.zoom;
  const x1 = cam.toScreenX(p.x), y1 = cam.toScreenY(p.y);
  return x1 + p.w * z > -z * 4 && y1 + p.h * z > -z * 4 && x1 < cam.vw + z * 4 && y1 < cam.vh + z * 4;
}

/** Etap 3f: od tej chwili zakładania (0..1) część jest już w rękach rycerza, nie na wieszaku. */
const ZDEJMUJE = 0.22;

/** Ile rycerz już założył bieżącej części (0..1). */
function postepZakladania(c: Creature): number {
  return Math.max(0, Math.min(1, (c.zakladanie ?? 0) / ZBROJA.zakladanieTikow));
}

/** Rycerze, którzy stoją pod wieszakiem tej kuźni i zakładają zbroję. */
function zakladajacy(sim: Sim, pom: Pomieszczenie): Creature[] {
  return sim.creatures.filter((c) => !c.dead && c.czynnosc === 'zaklada' && c.doKuzni === pom.id);
}

/** Hak wieszaka, na którym wisi i-ta część (piksele ekranu). */
function hakWieszaka(u: ReturnType<typeof uklad>, z: number, i: number): [number, number] {
  return [u.polka.x1 + z * (0.3 + (i % 3) * 0.48), u.polka.y + z * (0.45 + Math.floor(i / 3) * 0.6)];
}

/** Gdzie na rycerzu siada część (piksele ekranu): głowa, barki, pierś, kolana, przedramię z tarczą. */
function naCiele(cam: Camera, c: Creature, cz: CzescZbroi): [number, number] {
  const h = wysokoscPostaci(c, cam.zoom), kier = c.face >= 0 ? 1 : -1;
  const wys: Record<CzescZbroi, number> = { helm: 0.92, naramienniki: 0.78, napiersnik: 0.64, nakolanniki: 0.2, tarcza: 0.5 };
  return [cam.toScreenX(c.x) + kier * h * (cz === 'tarcza' ? 0.12 : cz === 'nakolanniki' ? 0.1 : 0.05), cam.toScreenY(c.y + 1) - h * wys[cz]];
}

const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/**
 * Część zbroi w rękach rycerza: zdjęta z haka unosi się (ręce w górze — render/lud/ruch.ts: „zaklada”), schodzi
 * na swoje miejsce na ciele, chwilę ją dopasowuje i część wtapia się w rysunek rycerza (wtedy błysk — zdarzenie).
 */
function czescWRekach(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, c: Creature, u: ReturnType<typeof uklad>, teraz: number): void {
  const k = postepZakladania(c);
  const id = naWieszaku(sim)[0];
  if (k < ZDEJMUJE || !id) return;
  const z = cam.zoom;
  const [hx, hy] = hakWieszaka(u, z, 0);
  const [tx, ty] = naCiele(cam, c, id);
  const lot = gladko((k - 0.4) / 0.2);
  const unos = gladko((k - ZDEJMUJE) / 0.18) * z * 0.25;
  const szarp = k > 0.6 && k < 0.9 && wolnoRuszac() ? Math.sin(teraz * 0.03 + c.id) * z * 0.04 : 0;
  const x = hx + (tx - hx) * lot + szarp, y = hy - unos * (1 - lot) + (ty - hy) * lot;
  const a = k > 0.88 ? Math.max(0, 1 - (k - 0.88) / 0.12) : 1;
  const R = z * 0.9;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,236,190,${0.3 * a})`); g.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.globalAlpha = a;
  rysujCzesc(ctx, id, x, y, z * (0.42 + 0.08 * lot), 'rgba(196,202,214,0.98)', TUSZ);
  ctx.globalAlpha = 1;
}

/** Ci, którzy stoją przy stole albo kowadle tego pomieszczenia. */
function pracujacy(sim: Sim, pom: Pomieszczenie): Creature[] {
  return sim.creatures.filter((c) => !c.dead && c.czynnosc === 'buduje' && c.polecenie?.typ === 'praca' && c.polecenie.pom === pom.id);
}

/** Kontur zbioru kafli: tylko krawędzie, za którymi nie ma kafla z tego zbioru. */
function obrysKafli(ctx: CanvasRenderingContext2D, cam: Camera, kafle: number[], W: number): void {
  const z = cam.zoom;
  const zb = new Set(kafle);
  ctx.beginPath();
  for (const i of kafle) {
    const x = i % W, y = (i / W) | 0;
    const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
    if (!zb.has(i - W)) { ctx.moveTo(sx, sy); ctx.lineTo(sx + z, sy); }
    if (!zb.has(i + W)) { ctx.moveTo(sx, sy + z); ctx.lineTo(sx + z, sy + z); }
    if (!zb.has(i - 1) || x === 0) { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + z); }
    if (!zb.has(i + 1) || x === W - 1) { ctx.moveTo(sx + z, sy); ctx.lineTo(sx + z, sy + z); }
  }
  ctx.stroke();
}

/** Podpis nad planem: kursywa z ciemnym obrysem, żeby była czytelna na skale. */
function podpis(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, z: number, barwa: string): void {
  ctx.font = `italic ${Math.max(12, Math.min(16, z * 0.7))}px ${SERIF}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,7,6,0.85)';
  ctx.strokeText(tekst, x, y);
  ctx.fillStyle = barwa;
  ctx.fillText(tekst, x, y);
}

/** Konopie liny: jaśniejsza nić i ciemniejszy skręt. */
// zgaszone konopie, nie złoto — jasna nić na krótkich odcinkach czytała się jak złote pałeczki albo zapałki
const KONOPIE = 'rgba(142,112,78,0.98)', SKRET = 'rgba(66,46,28,0.9)';
/** Ile trwa spadanie liny z haka i ile jeszcze się kołysze, zanim się uspokoi (ms). */
const LINA_SPADA = 650, LINA_USPOKAJA = 1600;

/**
 * Liny (world.lina): każdy pionowy odcinek kafli z liną to jedna lina — z haka u góry odcinka do podłogi pod nim
 * (gdy pod spodem jest pusty kafel, na którym się staje, lina sięga jego dna i leży tam zwojem). Świeże liny
 * (`anim`) spadają: zwój zjeżdża z haka, za nim rozwija się lina, a potem kołysze się i uspokaja.
 */
function rysujLiny(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, anim: { x: number; y0: number; y1: number; od: number }[]): void {
  const w = sim.world;
  const z = cam.zoom;
  const left = Math.max(0, Math.floor(cam.x - cam.vw / 2 / z) - 1), right = Math.min(w.w - 1, Math.ceil(cam.x + cam.vw / 2 / z) + 1);
  const top = Math.max(0, Math.floor(cam.y - cam.vh / 2 / z) - 1), bottom = Math.min(w.h - 2, Math.ceil(cam.y + cam.vh / 2 / z) + 1);
  const ruch = wolnoRuszac();
  ctx.save();
  ctx.lineCap = 'round';
  for (let x = left; x <= right; x++) {
    for (let y = top; y <= bottom; y++) {
      const i = y * w.w + x;
      if (w.lina[i] !== 1) continue;
      // odcinek liny w tej kolumnie: od tego kafla w dół, póki jest lina (a nad nim — skąd zwisa)
      let ya = y;
      while (ya - 1 >= 0 && w.lina[i - (y - ya + 1) * w.w] === 1) ya--;
      let y2 = y;
      while (y2 + 1 < w.h && w.lina[i + (y2 + 1 - y) * w.w] === 1) y2++;
      const doPodlogi = w.passable(x, y2 + 1) ? 1 : 0;
      const a = anim.find((q) => q.x === x && q.y0 <= y2 && q.y1 >= ya);
      const t = a && ruch ? teraz - a.od : Infinity;
      linaWKolumnie(ctx, cam, x, ya, y2 + doPodlogi, z, t, teraz, ruch, doPodlogi === 1, kotwicaLiny(w, x, ya));
      y = y2;
    }
  }
  ctx.restore();
}

/** Gdzie lina zwisa (kafle): kolumna liny przy skale, punkt, od którego wisi, i hak. */
type Kotwica = ReturnType<typeof kotwicaLiny>;
function zaczepienie(x: number, yOd: number, k: Kotwica): { lx: number; ly: number } {
  if (!k) return { lx: x + 0.5, ly: yOd };
  if (k.rodzaj === 'strop') return { lx: x + 0.5, ly: yOd };
  // krawędź półki i ściana: lina zwisa tuż przy skale, od brzegu półki (albo od haka w ścianie) w dół
  return { lx: x + 0.5 + k.strona * 0.28, ly: k.y };
}

/**
 * Jedna lina w kolumnie `x` (odcinek kafli od `yOd` do `yDo`), uczepiona skały w `k`: z haka w krawędzi półki przez
 * jej brzeg i wzdłuż ściany w dół, z haka w stropie albo w ścianie. `t` — ile ms temu spadła (Infinity — wisi od
 * dawna): najpierw zwój zjeżdża w dół, potem lina się kołysze coraz słabiej.
 */
function linaWKolumnie(ctx: CanvasRenderingContext2D, cam: Camera, x: number, yOd: number, yDo: number, z: number, t: number, teraz: number, ruch: boolean, naPodlodze: boolean, k: Kotwica): void {
  const { lx, ly } = zaczepienie(x, yOd, k);
  const cx = cam.toScreenX(lx), gora = cam.toScreenY(ly), dol = cam.toScreenY(yDo + 1);
  const dl = Math.max(1, dol - gora);
  const rozwin = t < LINA_SPADA ? (t / LINA_SPADA) ** 1.6 : 1;
  const koniec = gora + dl * rozwin;
  // kołysanie: po spadnięciu mocne i gasnące, potem ledwie oddech (koniec liny leży na ziemi — tam nie kołysze;
  // przy samej skale lina kołysze się słabiej)
  const po = t - LINA_SPADA;
  const mocno = t < LINA_SPADA ? 0.5 : po < LINA_USPOKAJA ? 0.5 * (1 - po / LINA_USPOKAJA) : 0;
  const faza = ruch ? teraz * 0.004 + x * 1.7 : 0;
  const amp = z * (0.06 + mocno) * (ruch ? 1 : 0) * (k && k.rodzaj !== 'strop' ? 0.6 : 1);
  const odch = (s: number) => Math.sin(faza + (t < Infinity ? t * 0.012 : 0)) * amp * Math.sin(Math.PI * 0.5 * Math.min(1, s)) * (naPodlodze ? 1 - Math.max(0, s - 0.85) / 0.15 : 1);
  const kroki = Math.max(6, Math.ceil(dl / Math.max(3, z * 0.25)));
  const punkty: [number, number][] = [];
  for (let n = 0; n <= kroki; n++) {
    const s = n / kroki;
    const py = gora + (koniec - gora) * s;
    punkty.push([cx + odch((py - gora) / dl), py]);
  }
  const sciezka = () => { ctx.beginPath(); punkty.forEach(([px, py], n) => (n ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); };
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(2.4, z * 0.17); sciezka(); ctx.stroke();
  ctx.strokeStyle = KONOPIE; ctx.lineWidth = Math.max(1.4, z * 0.1); sciezka(); ctx.stroke();
  // skręt konopi: ukośne kreski co kawałek
  ctx.strokeStyle = SKRET; ctx.lineWidth = Math.max(0.8, z * 0.035);
  ctx.beginPath();
  for (let n = 1; n < punkty.length; n++) {
    const [px, py] = punkty[n];
    ctx.moveTo(px - z * 0.05, py - z * 0.06); ctx.lineTo(px + z * 0.05, py + z * 0.02);
  }
  ctx.stroke();
  // węzły na chwyt — co kafel, w połowie wysokości (tylko tam, gdzie lina już wisi)
  for (let y = yOd; y <= yDo; y++) {
    const wy = cam.toScreenY(y + 0.5);
    if (wy < gora + z * 0.2) continue;
    if (wy > koniec) break;
    const wx = cx + odch((wy - gora) / dl);
    ctx.fillStyle = TUSZ; ctx.beginPath(); ctx.ellipse(wx, wy, z * 0.11, z * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = KONOPIE; ctx.beginPath(); ctx.ellipse(wx, wy, z * 0.07, z * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  }
  // zwój: zjeżdża z liną, a gdy lina sięga podłogi — leży tam
  if (t < LINA_SPADA) zwoj(ctx, punkty[punkty.length - 1][0], koniec, z, 1 - rozwin * 0.6);
  else if (naPodlodze) zwoj(ctx, cx + z * 0.12, dol - z * 0.08, z, 0.45);
  hakWSkale(ctx, cam, x, yOd, z, k, 1);
}

/**
 * Hak wbity w skałę tam, gdzie lina się jej uczepiła: w krawędź półki (kołek w półce tuż przy brzegu, lina przez brzeg
 * w dół), w strop (płytka ze stropu i oczko) albo w ścianę (kołek w ścianie, oczko przy niej).
 */
function hakWSkale(ctx: CanvasRenderingContext2D, cam: Camera, x: number, yOd: number, z: number, k: Kotwica, alfa: number): void {
  const { lx, ly } = zaczepienie(x, yOd, k);
  if (!k || k.rodzaj === 'strop') { hak(ctx, cam.toScreenX(lx), cam.toScreenY(ly), z, alfa); return; }
  const s = k.strona;
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.lineCap = 'round';
  if (k.rodzaj === 'krawedz') {
    // kołek wbity w półkę, kawałek od brzegu; lina z oczka przez brzeg i w dół
    const kx = cam.toScreenX(k.x + s * 0.4), ky = cam.toScreenY(k.y);
    const rx = cam.toScreenX(k.x), sx = cam.toScreenX(lx);
    for (const [barwa, gr] of [[TUSZ, Math.max(2.4, z * 0.17)], [KONOPIE, Math.max(1.4, z * 0.1)]] as const) {
      ctx.strokeStyle = barwa; ctx.lineWidth = gr;
      ctx.beginPath(); ctx.moveTo(kx, ky - z * 0.12); ctx.quadraticCurveTo(rx, ky - z * 0.14, sx, ky + z * 0.08); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(70,70,76,0.98)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.05);
    ctx.beginPath(); ctx.rect(kx - z * 0.06, ky - z * 0.3, z * 0.12, z * 0.42); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,120,128,0.98)'; ctx.lineWidth = Math.max(1.2, z * 0.06);
    ctx.beginPath(); ctx.arc(kx, ky - z * 0.3, z * 0.09, 0, Math.PI * 2); ctx.stroke();
  } else {
    // kołek wbity w ścianę z boku; oczko przy ścianie
    const wx = cam.toScreenX(k.x), wy = cam.toScreenY(k.y);
    ctx.fillStyle = 'rgba(70,70,76,0.98)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.05);
    ctx.beginPath(); ctx.rect(s > 0 ? wx - z * 0.08 : wx - z * 0.22, wy - z * 0.06, z * 0.3, z * 0.12); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,120,128,0.98)'; ctx.lineWidth = Math.max(1.2, z * 0.06);
    ctx.beginPath(); ctx.arc(wx - s * z * 0.12, wy + z * 0.06, z * 0.09, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Żelazny hak wbity w strop nad liną, z oczkiem, przez które przewiązano linę. */
function hak(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, alfa: number): void {
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.fillStyle = 'rgba(70,70,76,0.98)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.05);
  ctx.beginPath(); ctx.rect(x - z * 0.22, y - z * 0.1, z * 0.44, z * 0.12); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(120,120,128,0.98)'; ctx.lineWidth = Math.max(1.2, z * 0.06);
  ctx.beginPath(); ctx.arc(x, y + z * 0.08, z * 0.1, 0, Math.PI * 2); ctx.stroke();
  // owinięcie liny wokół oczka
  ctx.strokeStyle = KONOPIE; ctx.lineWidth = Math.max(1, z * 0.06);
  ctx.beginPath(); ctx.moveTo(x - z * 0.1, y + z * 0.12); ctx.lineTo(x + z * 0.1, y + z * 0.2); ctx.stroke();
  ctx.restore();
}

/** Zwój liny — kilka zwojów konopi (`r` — jak duży, 0..1). */
function zwoj(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, r: number): void {
  ctx.save();
  for (let k = 0; k < 3; k++) {
    const rx = z * (0.18 + 0.14 * r) * (1 - k * 0.18), ry = rx * 0.45;
    ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1.6, z * 0.11);
    ctx.beginPath(); ctx.ellipse(x, y - k * z * 0.05, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = KONOPIE; ctx.lineWidth = Math.max(1, z * 0.06);
    ctx.beginPath(); ctx.ellipse(x, y - k * z * 0.05, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Plan na skale: podwójny kontur kreską rycinową, kafle do wykucia przekreślone, nazwa i ile zostało. */
function rysujPlan(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, pom: Pomieszczenie, teraz: number, pod: PodKursorem | null): void {
  const podKursorem = !!pod;
  const z = cam.zoom;
  const w = sim.world;
  ctx.save();
  // kafle do wykucia — przekreślone ukośnie, jak na planie budowniczego
  ctx.strokeStyle = ZLOTO_PLANU(podKursorem ? 0.75 : 0.45); ctx.lineWidth = Math.max(1, z * 0.05);
  ctx.beginPath();
  const m = z * 0.22;
  for (const i of pom.kafle) {
    const x = i % w.w, y = (i / w.w) | 0;
    if (!w.solid(x, y)) continue;
    const sx = cam.toScreenX(x), sy = cam.toScreenY(y);
    ctx.moveTo(sx + m, sy + m); ctx.lineTo(sx + z - m, sy + z - m);
    ctx.moveTo(sx + z - m, sy + m); ctx.lineTo(sx + m, sy + z - m);
  }
  ctx.stroke();
  // podwójny kontur: przerywany i cienki pod nim
  if (podKursorem) { ctx.shadowColor = 'rgba(246,206,120,0.9)'; ctx.shadowBlur = 10; }
  ctx.setLineDash([Math.max(3, z * 0.4), Math.max(2, z * 0.22)]);
  ctx.lineDashOffset = wolnoRuszac() ? -teraz * 0.01 : 0;
  ctx.strokeStyle = ZLOTO_PLANU(podKursorem ? 1 : 0.85); ctx.lineWidth = Math.max(1.4, z * (podKursorem ? 0.12 : 0.08));
  obrysKafli(ctx, cam, pom.kafle, w.w);
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  if (z >= 5) {
    const zostalo = zostaloKafli(sim, pom);
    podpis(ctx, `plan: ${NAZWA_POMIESZCZENIA[pom.rodzaj]} · ${pom.kafle.length - zostalo}/${pom.kafle.length}`,
      cam.toScreenX(pom.x) + (pom.w * z) / 2, cam.toScreenY(pom.y) - z * 0.35, z, ZLOTO_PLANU(0.92));
  }
  // pod kursorem: co zrobią zaznaczeni — pod podłogą (nad planem stoi dymek z rozkazem)
  if (pod) podpis(ctx, pod.akcja, cam.toScreenX(pom.x) + (pom.w * z) / 2, cam.toScreenY(pom.y + pom.h) + z * 0.95, z, pod.ok ? ZLOTO_PLANU(0.98) : CZERWIEN(0.98));
  ctx.restore();
}

/** Gotowe pomieszczenie pod kursorem: jasny kontur i podpis, co zrobią zaznaczeni. */
function obrysPod(ctx: CanvasRenderingContext2D, cam: Camera, pom: Pomieszczenie, pod: PodKursorem, teraz: number): void {
  const z = cam.zoom;
  ctx.save();
  ctx.shadowColor = pod.ok ? 'rgba(246,206,120,0.9)' : 'rgba(226,96,72,0.9)'; ctx.shadowBlur = 10;
  ctx.strokeStyle = pod.ok ? ZLOTO_PLANU(0.95) : CZERWIEN(0.95); ctx.lineWidth = Math.max(1.6, z * 0.1);
  ctx.setLineDash([Math.max(3, z * 0.4), Math.max(2, z * 0.22)]);
  ctx.lineDashOffset = wolnoRuszac() ? -teraz * 0.02 : 0;
  ctx.strokeRect(cam.toScreenX(pom.x), cam.toScreenY(pom.y), pom.w * z, pom.h * z);
  ctx.restore();
  podpis(ctx, pod.akcja, cam.toScreenX(pom.x) + (pom.w * z) / 2, cam.toScreenY(pom.y + pom.h) + z * 0.95, z, pod.ok ? ZLOTO_PLANU(0.98) : CZERWIEN(0.98));
}

/** Iskry spod młotka w chwili uderzenia (faza zamachu robotnika — figury.ts: fazaMlota). */
function iskryZKowadla(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, c: Creature, teraz: number, zlote = false): void {
  if (!wolnoRuszac()) return;
  const f = fazaMlota(c);
  if (f < 0.5 || f > 0.72) return;
  const p = (f - 0.5) / 0.22;
  const nr = Math.floor(teraz / 625) + c.id * 31;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.2, z * 0.06);
  for (let k = 0; k < (zlote ? 5 : 9); k++) {
    const a = -Math.PI * (0.08 + 0.84 * los(nr * 7 + k));
    const v = z * (0.4 + 0.9 * los(nr * 3 + k * 11));
    const px = x + Math.cos(a) * v * p, py = y + Math.sin(a) * v * p + z * 0.5 * p * p;
    ctx.strokeStyle = zlote ? `rgba(255,236,170,${1 - p})` : `rgba(255,${Math.round(210 - 90 * p)},${Math.round(120 - 80 * p)},${1 - p})`;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(a) * z * 0.18, py - Math.sin(a) * z * 0.18); ctx.stroke();
  }
  ctx.restore();
}

/** „z z z” nad śpiącym: trzy litery unoszą się i rosną. */
function zzz(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, teraz: number, ruch: boolean): void {
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < 3; i++) {
    const f = ruch ? ((teraz * 0.0005 + i / 3) % 1) : i / 3;
    const s = Math.max(9, z * (0.35 + f * 0.35));
    ctx.font = `italic ${s}px ${SERIF}`;
    ctx.fillStyle = `rgba(226,214,186,${0.9 * Math.sin(f * Math.PI)})`;
    ctx.fillText('z', x + z * (0.2 + f * 0.6), y - z * (0.6 + f * 1.2));
  }
  ctx.restore();
}

/** Co zrobią zaznaczeni po dotknięciu tego pomieszczenia (podpis nad nim). */
export function akcjaNaPomieszczeniu(pom: Pomieszczenie, robotnikow: number, innych: number, rycerzy = 0, naWieszaku = 0): { akcja: string; ok: boolean } {
  if (!pom.gotowe) return robotnikow ? { akcja: 'kujcie ten plan', ok: true } : { akcja: 'kują tylko robotnicy', ok: false };
  const r: RodzajPomieszczenia = pom.rodzaj;
  if (r === 'sypialnia') return { akcja: 'idźcie spać — sen zdejmie osłabienia', ok: true };
  // etap 3f: rycerz w kuźni zakłada części z wieszaka
  if (r === 'kuznia' && rycerzy && !robotnikow) return naWieszaku ? { akcja: `załóż zbroję z wieszaka (${naWieszaku} ${naWieszaku === 1 ? 'część' : 'części'})`, ok: true } : { akcja: 'nie ma części na wieszaku', ok: false };
  if (robotnikow) return { akcja: r === 'warsztat' ? 'pracuj: krzyże ze złota' : rycerzy ? 'pracuj: zbroja z żelaza (rycerz ją założy)' : 'pracuj: zbroja z żelaza', ok: true };
  return { akcja: innych ? `wejdź do środka (pracują tu robotnicy)` : '', ok: true };
}
