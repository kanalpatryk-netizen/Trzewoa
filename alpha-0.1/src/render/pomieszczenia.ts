import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Creature } from '../sim/creatures';
import { czyPokoj, zostaloKafli, type Pomieszczenie, type ProbaPlanu, type ZdarzeniePom } from '../sim/pomieszczenia';
import { NAZWA_POMIESZCZENIA, POMIESZCZENIA, type RodzajPomieszczenia } from '../nastawy/pomieszczenia';
import { wolnoRuszac } from './nastroj';
import { SERIF } from './ink';
import { fazaMlota, wysokoscPostaci } from './figury';
import { krzyz, type Urobki } from './kruszce';

/**
 * POMIESZCZENIA (Alpha, etap 3c) — rysunek planów i gotowych pomieszczeń:
 *  - plan: kontur podwójną kreską rycinową, kafle do wykucia przekreślone, nad nim nazwa i ile zostało;
 *    pod kursorem (zaznaczeni) — rozjaśniony, z podpisem, co zrobią;
 *  - podgląd szablonu pod kursorem: jasny, gdy wolno, czerwony z powodem, gdy nie;
 *  - warsztat: stół, tygiel z roztopionym złotem i krzyż, który złoci się z postępem; gotowy rozbłyskuje i leci
 *    do licznika wiary (render/kruszce.ts);
 *  - kuźnia: palenisko z ogniem, kowadło z rozżarzoną częścią zbroi, iskry w takt młota, wieszak z gotowymi częściami;
 *    gotowa część błyska i unosi się nad kowadłem;
 *  - sypialnia: posłania i świeca, nad śpiącymi „z z z”; kto wstaje bez osłabienia — czerwona aureola rozpływa się;
 *  - gotowe pomieszczenie: obłok pyłu, a wyposażenie opada na swoje miejsce.
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

  /** Bierze świeże zdarzenia z symulacji; krzyż z warsztatu rusza do licznika wiary. */
  zbierz(sim: Sim, teraz: number, urobki: Urobki): void {
    for (const z of sim.zdarzeniaPom) {
      if (this.widziane.has(z)) continue;
      this.widziane.add(z);
      if (z.rodzaj === 'krzyz') urobki.dodaj('wiara', z.ile, z.x, z.y, teraz);
      if (z.rodzaj === 'gotowe') this.gotoweOd.set(z.pom, teraz);
      this.animacje.push({ z, od: teraz });
    }
    if (this.animacje.length) this.animacje = this.animacje.filter((a) => teraz - a.od < 2500);
  }

  /** Wyposażenie gotowych pomieszczeń — rzeczy, które ciemność zakrywa (przed mrokiem). Skala postaci: człowiek ma ok. 2 kafle. */
  rysujWnetrza(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
    const z = cam.zoom;
    ctx.save();
    ctx.lineJoin = 'round';
    for (const pom of sim.pomieszczenia) {
      if (!pom.gotowe || !czyPokoj(pom.rodzaj) || !widac(cam, pom)) continue;
      const od = this.gotoweOd.get(pom.id);
      const k = od === undefined || !wolnoRuszac() ? 1 : Math.min(1, (teraz - od) / 700);
      if (k <= 0) continue;
      const u = uklad(cam, pom);
      ctx.globalAlpha = k;
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
        sim.zbroja.forEach((id, i) => rysujCzesc(ctx, id, u.polka.x1 + z * (0.3 + (i % 3) * 0.48), u.polka.y + z * (0.45 + Math.floor(i / 3) * 0.6), z * 0.42, 'rgba(176,182,194,0.98)', TUSZ));
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
        const s = u.swieca;
        ctx.fillStyle = 'rgba(14,9,7,0.95)';
        ctx.beginPath(); ctx.moveTo(s.x - z * 0.3, s.y + z * 0.1); ctx.lineTo(s.x - z * 0.3, s.y - z * 0.45); ctx.quadraticCurveTo(s.x, s.y - z * 0.8, s.x + z * 0.3, s.y - z * 0.45); ctx.lineTo(s.x + z * 0.3, s.y + z * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(230,220,196,0.98)';
        ctx.beginPath(); ctx.rect(s.x - z * 0.06, s.y - z * 0.3, z * 0.12, z * 0.38); ctx.fill(); ctx.stroke();
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
export function akcjaNaPomieszczeniu(pom: Pomieszczenie, robotnikow: number, innych: number): { akcja: string; ok: boolean } {
  if (!pom.gotowe) return robotnikow ? { akcja: 'kujcie ten plan', ok: true } : { akcja: 'kują tylko robotnicy', ok: false };
  const r: RodzajPomieszczenia = pom.rodzaj;
  if (r === 'sypialnia') return { akcja: 'idźcie spać — sen zdejmie osłabienia', ok: true };
  if (robotnikow) return { akcja: r === 'warsztat' ? 'pracuj: krzyże ze złota' : 'pracuj: zbroja z żelaza', ok: true };
  return { akcja: innych ? `wejdź do środka (pracują tu robotnicy)` : '', ok: true };
}
