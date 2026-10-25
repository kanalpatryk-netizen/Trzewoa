import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Creature } from '../sim/creatures';
import type { Trup } from '../sim/trupy';
import { Race } from '../sim/races';
import { rytualOltarza, type ZdarzenieOltarza } from '../sim/oltarz';
import type { RodzajRytualu } from '../nastawy/oltarz';
import { wolnoRuszac } from './nastroj';
import { SERIF } from './ink';
import { migotLampy } from './fresk';
import { glif } from './tajemnica';
import { rysujLud } from './postacie';
import { wysokoscPostaci } from './figury';
import { kropla, type Urobki } from './kruszce';
import { LUD } from '../nastawy/lud';
import { SURFACE_Y } from '../sim/world';
import { ukladKatedry } from './katedra';

/**
 * OŁTARZ (Alpha, etap 3d) — rysunek ołtarza na środku sali i animacje rytuałów:
 *  - kamienny kopczyk, na nim kamienna mensa z misą i dwiema świecami, za nią drewniany krzyż; z rozety katedry na
 *    powierzchni, szybem nad nim, pada promień światła z pyłem, który w nim wiruje (render/promien.ts; w mroku też go
 *    widać — render/mrok.ts);
 *  - modlitwa: od krzyża biją promienie, złote iskry płyną od klęczącego do krzyża;
 *  - szał krwi: krew spływa po krzyżu do misy, wokół ołtarza zapala się krąg czerwonych znaków (glif z
 *    render/tajemnica.ts), na koniec czerwona smuga leci do rycerza — jego czerwoną poświatę rysuje już strój;
 *  - wskrzeszenie: ciało poległego blednie i rozsypuje się w jasne iskry, które płyną do ołtarza; nad mensą unosi
 *    się ta sama postać, z szarej coraz barwniejsza, a na koniec błysk — i stoi obok ołtarza;
 *  - ofiara krwi: krople z ręki klęczącego spadają do misy, misa się napełnia, kropla leci do licznika krwi;
 *  - ofiara życia: krąg ciemnoczerwonych znaków i słup czerwonego światła, na koniec rozbłysk;
 *  - przerwany rytuał: znaki gasną w szarym dymie.
 * Animacja idzie zegarem ekranu, postęp rytuału — tikami gry (pauza go wstrzymuje). Symulacja: src/sim/oltarz.ts.
 */

/** Tani skrót liczby — stałe położenia pyłu i iskier (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

const TUSZ = 'rgba(20,12,8,0.95)';
/** Barwa kręgu znaków dla rytuału (r, g, b). */
const KRAG: Record<RodzajRytualu, [number, number, number]> = {
  modlitwa: [255, 226, 150], szal: [255, 64, 44], wskrzeszenie: [255, 244, 210], ofiaraKrwi: [236, 70, 52], ofiaraZycia: [190, 24, 20],
};
/**
 * Rytuały z kręgiem znaków: tylko wskrzeszenie. Rytuały krwi mają własne motywy (szał — czerwona aura rycerza,
 * ofiara krwi — struga do misy, ofiara życia — dusza, która ulatuje); dawniej wszystkie trzy miały ten sam
 * jaskrawy krąg czerwonych run.
 */
const Z_KREGIEM: RodzajRytualu[] = ['wskrzeszenie'];

/** Układ ołtarza na ekranie (piksele kamery) — wspólny dla kamienia, świateł i trafienia kursorem. */
function uklad(sim: Sim, cam: Camera) {
  const o = sim.world.oltarz;
  return ukladZ(cam.toScreenX(o.x + 0.5), cam.toScreenY(o.y + 1), cam.zoom);
}

/** Układ ołtarza stojącego środkiem w `cx` na podłodze `yp`, w skali `z` pikseli na kafel (gra i ryciny atlasu). */
function ukladZ(cx: number, yp: number, z: number) {
  const kopiec = z * 0.55;
  const blokDol = yp - kopiec + z * 0.08, blokGora = yp - kopiec - z * 0.8;
  return {
    z, cx, yp,
    kopiec: { rx: z * 1.9, h: kopiec },
    blok: { x1: cx - z * 0.9, x2: cx + z * 0.9, y1: blokGora, y2: blokDol },
    plyta: { x1: cx - z * 1.1, x2: cx + z * 1.1, y: blokGora - z * 0.18, h: z * 0.18 },
    krzyz: { x: cx, gora: blokGora - z * 2.75, dol: blokGora - z * 0.18, belka: blokGora - z * 2.1, ramie: z * 0.72, szer: z * 0.24 },
    swiece: [cx - z * 0.88, cx + z * 0.88],
    swiecaH: z * 0.42,
    misa: { x: cx + z * 0.38, y: blokGora - z * 0.18, rx: z * 0.3, h: z * 0.16 },
    krag: { x: cx, y: blokGora - z * 0.55, rx: z * 3.0, ry: z * 1.05 },
  };
}
type Uklad = ReturnType<typeof ukladZ>;

/** Czy punkt ekranu (piksele kamery) trafia w ołtarz — kopczyk, mensa albo krzyż. */
export function oltarzPod(sim: Sim, cam: Camera, sx: number, sy: number): boolean {
  if (sim.world.salaOltarza.x1 < 0) return false;
  const u = uklad(sim, cam);
  const tol = Math.max(6, u.z * 0.3);
  return sx >= u.cx - u.kopiec.rx - tol && sx <= u.cx + u.kopiec.rx + tol && sy >= u.krzyz.gora - tol && sy <= u.yp + tol;
}

/** Trwający rytuał: rodzaj i postęp 0..1 (tikami gry). */
function postep(sim: Sim): { rodzaj: RodzajRytualu; p: number; kto: number; cel?: number } | null {
  const r = rytualOltarza(sim);
  if (!r) return null;
  return { rodzaj: r.rodzaj, p: Math.max(0, Math.min(1, (sim.tick - r.od) / Math.max(1, r.do - r.od))), kto: r.kto, cel: r.cel };
}

export class Oltarz {
  private widziane = new WeakSet<ZdarzenieOltarza>();
  private animacje: { z: ZdarzenieOltarza; od: number }[] = [];
  /** Krew w misie (0..1) — rośnie przy szale i ofierze krwi, potem powoli wsiąka. */
  private misa = 0;
  private misaT = 0;
  /** Atrapy wskrzeszanych (rysunek postaci pamięta pozę po obiekcie). */
  private atrapy = new Map<number, Creature>();
  /** Świeże zdarzenie (dźwięk na ekranie gry). */
  onZdarzenie: ((z: ZdarzenieOltarza) => void) | null = null;

  /** Bierze świeże zdarzenia z symulacji: krew zapłacona spływa z licznika do misy, krew z ofiary leci do licznika. */
  zbierz(sim: Sim, teraz: number, urobki: Urobki): void {
    const o = sim.world.oltarz;
    for (const z of sim.zdarzeniaOltarza) {
      if (this.widziane.has(z)) continue;
      this.widziane.add(z);
      this.animacje.push({ z, od: teraz });
      this.onZdarzenie?.(z);
      if (z.faza === 'start') {
        const r = rytualOltarza(sim);
        if (r && r.krew > 0) urobki.oddaj('krew', r.krew, o.x, o.y - 1, teraz);
      } else if (z.faza === 'koniec' && (z.rodzaj === 'ofiaraKrwi' || z.rodzaj === 'ofiaraZycia')) {
        urobki.dodaj('krew', z.rodzaj === 'ofiaraKrwi' ? LUD.okaleczenieKrew : LUD.ofiaraKrew, o.x, o.y - 1, teraz);
      }
    }
    if (this.animacje.length) this.animacje = this.animacje.filter((a) => teraz - a.od < 2600);
    // krew w misie: napełnia się z postępem rytuału krwi, potem wsiąka przez kilka sekund
    const pr = postep(sim);
    const dt = Math.min(0.1, Math.max(0, (teraz - this.misaT) / 1000));
    this.misaT = teraz;
    if (pr && (pr.rodzaj === 'szal' || pr.rodzaj === 'ofiaraKrwi')) this.misa = Math.max(this.misa, gladko(pr.p * 1.4));
    else this.misa = Math.max(0, this.misa - dt * 0.12);
    if (!pr) this.atrapy.clear();
  }

  /** Kamień i drewno — przed mrokiem (w ciemności gasną jak skała; świece i smuga dnia świecą przez mrok). */
  rysuj(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
    if (sim.world.salaOltarza.x1 < 0) return;           // góra bez sali z ołtarzem (poza Alphą)
    const u = uklad(sim, cam);
    const z = u.z;
    if (u.cx < -z * 6 || u.cx > cam.vw + z * 6 || u.yp < -z * 2 || u.krzyz.gora > cam.vh + z * 2) return;
    rysujKamien(ctx, u);
  }

  /**
   * Nad mrokiem: smuga światła dziennego z pyłem, płomienie świec, krew w misie, rytuał w toku i jego koniec.
   * `podKursorem` — podpis nad ołtarzem (co się stanie po dotknięciu).
   */
  rysujNad(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, podKursorem: string | null): void {
    if (sim.world.salaOltarza.x1 < 0) return;
    const u = uklad(sim, cam);
    const z = u.z;
    const ruch = wolnoRuszac();
    const widac = !(u.cx < -z * 8 || u.cx > cam.vw + z * 8 || u.yp < -z * 3 || u.krzyz.gora > cam.vh + z * 6);
    const pr = postep(sim);
    ctx.save();
    // światło na ołtarz pada z rozety katedry (render/promien.ts); bez katedry — smuga dnia z wylotu szybu,
    // widoczna, choćby sam ołtarz był już poza ekranem
    const w = sim.world;
    const gx = cam.toScreenX(w.szybX + 0.5), gora = cam.toScreenY(SURFACE_Y);
    if (!ukladKatedry(w) && Math.max(gx, u.cx) + z * 3 > 0 && Math.min(gx, u.cx) - z * 3 < cam.vw && u.yp > 0 && gora < cam.vh) {
      smugaDnia(ctx, gx, gora, cam.toScreenY(w.szybDol), u, teraz, ruch);
    }
    if (widac) {
      // płomienie świec — przy rytuale wyższe i jaśniejsze
      plomienie(ctx, u, teraz, pr ? 1.25 : 1, ruch);
      krewWMisie(ctx, u, this.misa);
    }
    // rytuał w toku
    if (pr) {
      const c = sim.creatureById(pr.kto);
      const a = gladko(pr.p * 5);
      if (widac) {
        if (pr.rodzaj === 'modlitwa') promienie(ctx, u, teraz, a, ruch, c, cam);
        if (Z_KREGIEM.includes(pr.rodzaj)) kragZnakow(ctx, u, teraz, pr.rodzaj, Math.min(1, pr.p * 1.25), a, ruch);
        if (pr.rodzaj === 'szal') krewPoKrzyzu(ctx, u, teraz, pr.p, ruch);
        if (pr.rodzaj === 'ofiaraKrwi' && c) kroplezReki(ctx, u, cam, c, teraz, ruch);
        if (pr.rodzaj === 'ofiaraZycia' && c) dusza(ctx, cam, c, u.z, teraz, pr.p, 0, ruch);
      }
      // szał: rycerz, którego rytuał rozpala, płonie czerwoną aurą (gdziekolwiek stoi)
      if (pr.rodzaj === 'szal') {
        const ryc = sim.creatureById(pr.cel ?? -1);
        if (ryc && !ryc.dead) aura(ctx, cam, ryc, u.z, teraz, gladko(pr.p * 1.6), ruch);
      }
      if (pr.rodzaj === 'wskrzeszenie') this.wskrzeszanie(ctx, sim, cam, u, teraz, pr.p, pr.cel, ruch);
    }
    this.rysujZdarzenia(ctx, sim, cam, u, teraz);
    if (podKursorem && widac) {
      const puls = 0.5 + 0.5 * Math.sin(teraz * 0.005);
      ctx.strokeStyle = `rgba(232,196,130,${0.35 + 0.35 * puls})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.ellipse(u.cx, (u.krzyz.gora + u.yp) / 2, u.kopiec.rx + z * 0.4, (u.yp - u.krzyz.gora) / 2 + z * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      podpis(ctx, podKursorem, u.cx, u.krzyz.gora - z * 0.5, z, 'rgba(240,214,160,0.98)');
    }
    ctx.restore();
  }

  /** Wskrzeszenie: ciało blednie w iskry, które płyną do ołtarza; nad mensą unosi się postać i odzyskuje barwę. */
  private wskrzeszanie(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, u: Uklad, teraz: number, p: number, cel: number | undefined, ruch: boolean): void {
    const z = u.z;
    const t = (sim.lud.trupy ?? []).find((q) => q.id === cel);
    if (!t) return;
    // iskry z ciała do ołtarza
    const tx = cam.toScreenX(t.x), ty = cam.toScreenY(t.y + 1) - z * 0.4;
    const ax = u.cx, ay = u.plyta.y - z * 0.5;
    const strumien = Math.sin(Math.min(1, p / 0.7) * Math.PI);
    if (strumien > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const R = z * 1.6;
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, R);
      g.addColorStop(0, `rgba(255,244,210,${0.4 * strumien})`); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(tx - R, ty - R, R * 2, R * 2);
      const d = Math.hypot(ax - tx, ay - ty);
      for (let i = 0; i < 16; i++) {
        const f = ruch ? (teraz * 0.00045 + i / 16) % 1 : i / 16;
        const x = tx + (ax - tx) * f + Math.sin(f * 9 + i) * z * 0.25;
        const y = ty + (ay - ty) * f - Math.sin(f * Math.PI) * Math.min(z * 3, d * 0.25);
        ctx.fillStyle = `rgba(255,246,220,${0.9 * strumien * Math.sin(f * Math.PI)})`;
        ctx.beginPath(); ctx.arc(x, y, Math.max(1, z * 0.07), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // nad mensą: ta sama postać — leży, unosi się, staje do pionu i odzyskuje barwę
    const pojaw = gladko((p - 0.35) / 0.3);
    if (pojaw <= 0) return;
    const barwa = gladko((p - 0.55) / 0.4);
    const pion = gladko((p - 0.5) / 0.42);
    const h = Math.max(16, z * 1.9 * (t.rola === 'rycerz' ? 1.3 : 1));
    const unies = z * 0.9 * gladko((p - 0.35) / 0.5);
    // biodra: nad płytą ołtarza — leżąc tuż nad nią, stojąc tak, że stopy unoszą się nad mensą
    const sx = u.cx, sy = u.plyta.y - z * 0.3 - unies - h * 0.5 * pion;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const R = z * 2.4;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    g.addColorStop(0, `rgba(255,244,210,${0.5 * pojaw})`); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
    ctx.restore();
    const atrapa = this.atrapy.get(t.id) ?? atrapaZmarlego(t);
    this.atrapy.set(t.id, atrapa);
    const W = Math.ceil(h * 2.4);
    const pl = plotno(W, W);
    if (!pl) return;
    const g2 = pl.getContext('2d')!;
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.clearRect(0, 0, W, W);
    // obrót wokół bioder: z leżenia (głową od światła) do pionu
    g2.setTransform(1, 0, 0, 1, W / 2, W / 2);
    g2.rotate((1 - pion) * (Math.PI / 2) * -t.face);
    g2.translate(0, h * 0.5);
    g2.scale(t.face, 1);
    rysujLud(g2, sim, atrapa, t.rola, h, teraz, 'stoi', 0, 0, 0);
    // jeszcze blady jak duch — barwa wraca z postępem
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.globalCompositeOperation = 'source-atop';
    g2.fillStyle = `rgba(232,236,240,${0.88 * (1 - barwa)})`;
    g2.fillRect(0, 0, W, W);
    g2.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalAlpha = pojaw * (0.6 + 0.4 * barwa);
    ctx.drawImage(pl, 0, 0, W, W, sx - W / 2, sy - W / 2, W, W);
    ctx.restore();
  }

  /** Koniec rytuału (błysk, smuga do rycerza, iskry) i przerwany rytuał (szary dym). */
  private rysujZdarzenia(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, u: Uklad, teraz: number): void {
    const z = u.z;
    for (const { z: e, od } of this.animacje) {
      const t = (teraz - od) / 1000;
      if (e.faza === 'start') continue;
      ctx.save();
      if (e.faza === 'przerwany') {
        if (t > 1.6) { ctx.restore(); continue; }
        const p = t / 1.6;
        for (let i = 0; i < 14; i++) {
          const kat = (i / 14) * Math.PI * 2;
          const x = u.krag.x + Math.cos(kat) * u.krag.rx * (0.7 + p * 0.3), y = u.krag.y + Math.sin(kat) * u.krag.ry - p * z * 1.2;
          ctx.fillStyle = `rgba(150,140,130,${0.35 * (1 - p)})`;
          ctx.beginPath(); ctx.arc(x, y, z * (0.3 + p * 0.5), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        continue;
      }
      // koniec: znaki i promienie gasną, a skutek rytuału błyska
      const [r, g, b] = KRAG[e.rodzaj];
      const zgas = Math.max(0, 1 - t / 1.2);
      if (zgas > 0 && Z_KREGIEM.includes(e.rodzaj)) kragZnakow(ctx, u, teraz, e.rodzaj, 1, zgas, wolnoRuszac());
      if (zgas > 0 && e.rodzaj === 'modlitwa') promienie(ctx, u, teraz, zgas, wolnoRuszac(), undefined, cam);
      if (t < 1.2) {
        // rozbłysk nad mensą
        const k = Math.sin(Math.min(1, t / 1.2) * Math.PI);
        const R = z * (1.5 + 3 * Math.min(1, t * 1.5));
        ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createRadialGradient(u.cx, u.plyta.y - z * 0.6, 0, u.cx, u.plyta.y - z * 0.6, R);
        gr.addColorStop(0, `rgba(${r},${g},${b},${0.55 * k})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gr; ctx.fillRect(u.cx - R, u.plyta.y - z * 0.6 - R, R * 2, R * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (e.rodzaj === 'szal') {
        // czerwona smuga z misy do rycerza, potem pierścień wokół niego
        const ryc = sim.creatureById(e.cel ?? -1);
        if (ryc && !ryc.dead && t < 1.8) {
          const hh = wysokoscPostaci(ryc, z);
          const rx = cam.toScreenX(ryc.x), ry = cam.toScreenY(ryc.y + 1) - hh * 0.5;
          const mx = u.misa.x, my = u.misa.y - u.misa.h;
          const kx = (mx + rx) / 2, ky = Math.min(my, ry) - Math.max(z * 2, Math.hypot(rx - mx, ry - my) * 0.3);
          const s = gladko(t / 0.7);
          ctx.lineCap = 'round';
          for (let j = 0; j < 3; j++) {
            ctx.strokeStyle = j === 0 ? 'rgba(255,70,40,0.25)' : j === 1 ? 'rgba(255,60,40,0.6)' : 'rgba(255,200,170,0.9)';
            ctx.lineWidth = Math.max(1, z * [0.5, 0.2, 0.06][j]) * (1 - Math.max(0, (t - 0.7) / 1.1));
            ctx.beginPath();
            for (let q = 0; q <= 24; q++) {
              const f = Math.max(0, s - 0.45) + (s - Math.max(0, s - 0.45)) * (q / 24);
              const x = (1 - f) * (1 - f) * mx + 2 * (1 - f) * f * kx + f * f * rx;
              const y = (1 - f) * (1 - f) * my + 2 * (1 - f) * f * ky + f * f * ry;
              if (q === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          // aura rozbłyska, gdy smuga dobiegnie (zamiast elipsy jak znacznik zaznaczenia)
          if (t > 0.6) aura(ctx, cam, ryc, z, teraz, 1 + 0.8 * Math.max(0, 1 - (t - 0.6) / 0.6), wolnoRuszac());
        }
      } else if (e.rodzaj === 'ofiaraZycia' && e.cx !== undefined && e.cy !== undefined && t < 2.4) {
        // dusza ulatuje w górę i gaśnie
        const atr = { x: e.cx, y: e.cy, rola: 'pobozny', dead: false } as unknown as Creature;
        dusza(ctx, cam, atr, z, teraz, 1, t / 2.4, wolnoRuszac());
      } else if (e.rodzaj === 'wskrzeszenie' && e.cx !== undefined && e.cy !== undefined && t < 2) {
        // błysk przy wstającym i iskry, które wznoszą się nad nim
        const x = cam.toScreenX(e.cx), y = cam.toScreenY(e.cy + 1) - z * 1;
        const k = Math.max(0, 1 - t / 2);
        ctx.globalCompositeOperation = 'lighter';
        const R = z * (2 + t * 2);
        const gr = ctx.createRadialGradient(x, y, 0, x, y, R);
        gr.addColorStop(0, `rgba(255,248,224,${0.6 * k})`); gr.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = gr; ctx.fillRect(x - R, y - R, R * 2, R * 2);
        for (let i = 0; i < 12; i++) {
          const px = x + (los(i * 17) - 0.5) * z * 1.6, py = y + z * 0.8 - t * z * (1.2 + los(i) * 1.6);
          ctx.fillStyle = `rgba(255,246,214,${0.9 * k})`;
          ctx.beginPath(); ctx.arc(px, py, Math.max(1, z * 0.06), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
  }
}

/** Kopczyk, mensa z misą i świecami, drewniany krzyż — bez płomieni (te świecą nad mrokiem). */
function rysujKamien(ctx: CanvasRenderingContext2D, u: Uklad): void {
  const z = u.z;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, z * 0.06);
  ctx.strokeStyle = TUSZ;
  // kopczyk: usypany z kamieni, łagodny łuk na podłodze sali
  const { rx, h } = u.kopiec;
  const kg = ctx.createLinearGradient(0, u.yp - h, 0, u.yp);
  kg.addColorStop(0, 'rgba(118,104,90,0.99)'); kg.addColorStop(1, 'rgba(62,52,44,0.99)');
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.moveTo(u.cx - rx, u.yp);
  ctx.bezierCurveTo(u.cx - rx * 0.7, u.yp - h * 0.9, u.cx - rx * 0.35, u.yp - h * 1.05, u.cx, u.yp - h * 1.05);
  ctx.bezierCurveTo(u.cx + rx * 0.35, u.yp - h * 1.05, u.cx + rx * 0.7, u.yp - h * 0.9, u.cx + rx, u.yp);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // kamienie w kopczyku: kanciaste, różnej wielkości, w dwóch warstwach — dolne większe, górne mniejsze, stykają się
  // (dawniej jeden rząd równych owali — „parówki”)
  for (const [warstwa, ile, wys, wielk] of [[0, 7, 0.28, 0.24], [1, 5, 0.66, 0.17]] as const) {
    for (let i = 0; i < ile; i++) {
      const id = warstwa * 31 + i;
      const fx = ((i + 0.5) / ile * 2 - 1) * (warstwa ? 0.62 : 0.9);
      const kx = u.cx + fx * rx * 0.9 + (los(id * 7) - 0.5) * z * 0.12;
      const ky = u.yp - h * wys * (1 - fx * fx * 0.6) - z * 0.04;
      const kr = z * wielk * (0.75 + 0.5 * los(id * 9));
      const n = 5 + Math.floor(los(id * 13) * 2), a0 = los(id * 3) * Math.PI;
      ctx.beginPath();
      for (let j = 0; j < n; j++) {
        const a = a0 + (j / n) * Math.PI * 2, rr = kr * (0.75 + 0.35 * los(id * 17 + j));
        ctx.lineTo(kx + Math.cos(a) * rr * 1.25, ky + Math.sin(a) * rr * 0.8);
      }
      ctx.closePath();
      const t = 0.75 + 0.3 * los(id) - warstwa * 0.05;
      ctx.fillStyle = `rgba(${Math.round(118 * t)},${Math.round(106 * t)},${Math.round(92 * t)},0.99)`;
      ctx.fill(); ctx.stroke();
    }
  }
  // mensa: kamienny blok, na nim gruba płyta; na czole wyryty krzyżyk
  const b = u.blok, pl = u.plyta;
  const bg = ctx.createLinearGradient(b.x1, 0, b.x2, 0);
  bg.addColorStop(0, 'rgba(112,100,88,0.99)'); bg.addColorStop(0.5, 'rgba(150,136,116,0.99)'); bg.addColorStop(1, 'rgba(96,84,74,0.99)');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.rect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(168,154,132,0.99)';
  ctx.beginPath(); ctx.rect(pl.x1, pl.y, pl.x2 - pl.x1, pl.h); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(52,40,30,0.8)';
  ctx.lineWidth = Math.max(1, z * 0.07);
  const ry = (b.y1 + b.y2) / 2;
  ctx.beginPath();
  ctx.moveTo(u.cx, ry - z * 0.26); ctx.lineTo(u.cx, ry + z * 0.26);
  ctx.moveTo(u.cx - z * 0.16, ry - z * 0.08); ctx.lineTo(u.cx + z * 0.16, ry - z * 0.08);
  ctx.stroke();
  // spękania kamienia
  ctx.strokeStyle = 'rgba(40,30,22,0.55)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(b.x1 + z * 0.15, b.y1 + z * 0.1); ctx.lineTo(b.x1 + z * 0.3, b.y1 + z * 0.4); ctx.lineTo(b.x1 + z * 0.22, b.y2 - z * 0.1);
  ctx.moveTo(b.x2 - z * 0.2, b.y1 + z * 0.15); ctx.lineTo(b.x2 - z * 0.34, b.y1 + z * 0.5);
  ctx.stroke();
  // krzyż z ciemnego drewna, wbity za mensą; od strony światła jaśniejsza krawędź
  const k = u.krzyz;
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.06);
  ctx.fillStyle = 'rgba(84,56,34,0.99)';
  ctx.beginPath();
  ctx.rect(k.x - k.szer / 2, k.gora, k.szer, k.dol - k.gora);
  ctx.rect(k.x - k.ramie, k.belka - k.szer / 2, k.ramie * 2, k.szer);
  ctx.fill();
  ctx.beginPath(); ctx.rect(k.x - k.szer / 2, k.gora, k.szer, k.dol - k.gora); ctx.stroke();
  ctx.beginPath(); ctx.rect(k.x - k.ramie, k.belka - k.szer / 2, k.ramie * 2, k.szer); ctx.stroke();
  ctx.fillStyle = 'rgba(84,56,34,0.99)';
  ctx.fillRect(k.x - k.szer / 2 + 1, k.belka - k.szer / 2 + 1, k.szer - 2, k.szer - 2);
  ctx.strokeStyle = 'rgba(214,170,110,0.55)'; ctx.lineWidth = Math.max(1, z * 0.04);
  ctx.beginPath();
  ctx.moveTo(k.x + k.szer / 2 - 1, k.gora + 1); ctx.lineTo(k.x + k.szer / 2 - 1, k.belka - k.szer / 2);
  ctx.moveTo(k.x - k.ramie + 1, k.belka - k.szer / 2 + 1); ctx.lineTo(k.x + k.ramie - 1, k.belka - k.szer / 2 + 1);
  ctx.stroke();
  // misa z kamienia na płycie
  const m = u.misa;
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(1, z * 0.05);
  ctx.fillStyle = 'rgba(96,86,76,0.99)';
  ctx.beginPath(); ctx.moveTo(m.x - m.rx, m.y - m.h); ctx.quadraticCurveTo(m.x, m.y + m.h * 0.6, m.x + m.rx, m.y - m.h); ctx.closePath(); ctx.fill(); ctx.stroke();
  // świece (płomień — nad mrokiem)
  for (const sx of u.swiece) {
    ctx.fillStyle = 'rgba(232,222,196,0.99)';
    ctx.beginPath(); ctx.rect(sx - z * 0.06, pl.y - u.swiecaH, z * 0.12, u.swiecaH); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(200,180,140,0.9)';
    ctx.beginPath(); ctx.ellipse(sx, pl.y - u.swiecaH + z * 0.02, z * 0.07, z * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Płomienie świec na mensie i ich poświata (`moc` > 1 — przy rytuale wyższe i jaśniejsze). */
function plomienie(ctx: CanvasRenderingContext2D, u: Uklad, teraz: number, moc: number, ruch: boolean): void {
  const z = u.z;
  for (const [i, sx] of u.swiece.entries()) {
    const mg = ruch ? 0.85 + 0.3 * migotLampy(teraz + i * 1777) : 1;
    const fy = u.plyta.y - u.swiecaH - z * 0.14;
    // płomyk z ciepłą, wąską poświatą — dawniej szeroki biały rozbłysk czytał się jak flara
    const R = z * 0.9 * moc * mg;
    const g = ctx.createRadialGradient(sx, fy, 0, sx, fy, R);
    g.addColorStop(0, `rgba(255,200,120,${0.32 * mg})`); g.addColorStop(1, 'rgba(255,180,100,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - R, fy - R, R * 2, R * 2);
    ctx.fillStyle = `rgba(255,232,160,${0.95 * mg})`;
    ctx.beginPath(); ctx.ellipse(sx + (ruch ? Math.sin(teraz * 0.009 + i) * z * 0.015 : 0), fy, z * 0.055 * moc, z * 0.13 * moc * mg, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,240,200,${0.85 * mg})`;
    ctx.beginPath(); ctx.ellipse(sx, fy + z * 0.04, z * 0.022, z * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  }
}

/** Krew w misie (`ile` 0..1). */
function krewWMisie(ctx: CanvasRenderingContext2D, u: Uklad, ile: number): void {
  if (ile <= 0.01) return;
  const z = u.z, m = u.misa;
  const lvl = m.h * (0.25 + 0.75 * ile);
  ctx.fillStyle = 'rgba(150,16,12,0.95)';
  ctx.beginPath(); ctx.ellipse(m.x, m.y - m.h + (m.h - lvl) * 0.2, m.rx * (0.55 + 0.4 * ile), Math.max(1, z * 0.05), 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,120,90,${0.5 * ile})`;
  ctx.beginPath(); ctx.ellipse(m.x - m.rx * 0.2, m.y - m.h, m.rx * 0.18, Math.max(0.6, z * 0.02), 0, 0, Math.PI * 2); ctx.fill();
}

/**
 * Smuga światła dziennego na ołtarz, w niej wirujący pył: wpada z nieba wylotem szybu (`gora`), idzie szybem w jego
 * szerokości (środek szybu w `gx`), a od jego dna (`gy`, strop sali) rozchodzi się na ołtarz. Dawniej zaczynała się
 * dopiero u stropu sali — nie było widać, skąd pada.
 */
function smugaDnia(ctx: CanvasRenderingContext2D, gx: number, gora: number, gy: number, u: Uklad, teraz: number, ruch: boolean): void {
  const z = u.z;
  const dy = u.yp - gy;
  if (dy < z * 2) return;
  const cala = u.yp - gora;
  const s = (gy - gora) / cala;             // ta część smugi biegnie szybem
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // w szybie pełny dzień, w sali gaśnie ku posadzce
  const g = ctx.createLinearGradient(0, gora, 0, u.yp);
  g.addColorStop(0, 'rgba(244,232,200,0.2)');
  g.addColorStop(s, 'rgba(240,226,190,0.16)');
  g.addColorStop(s + (1 - s) * 0.7, 'rgba(236,214,170,0.09)');
  g.addColorStop(1, 'rgba(236,214,170,0.03)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(gx - z * 1.5, gora); ctx.lineTo(gx + z * 1.5, gora); ctx.lineTo(gx + z * 1.5, gy);
  ctx.lineTo(u.cx + z * 2.8, u.yp); ctx.lineTo(u.cx - z * 2.8, u.yp);
  ctx.lineTo(gx - z * 1.5, gy);
  ctx.closePath(); ctx.fill();
  // jaśniejszy środek smugi
  const g2 = ctx.createLinearGradient(0, gora, 0, u.yp);
  g2.addColorStop(0, 'rgba(255,244,214,0.14)'); g2.addColorStop(s, 'rgba(255,244,214,0.12)'); g2.addColorStop(1, 'rgba(255,244,214,0.02)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.moveTo(gx - z * 0.6, gora); ctx.lineTo(gx + z * 0.6, gora); ctx.lineTo(gx + z * 0.6, gy);
  ctx.lineTo(u.cx + z * 1.2, u.yp); ctx.lineTo(u.cx - z * 1.2, u.yp);
  ctx.lineTo(gx - z * 0.6, gy);
  ctx.closePath(); ctx.fill();
  // pył w świetle: drobinki krążą powoli w dół i na boki — w szybie i w sali (w sali tak gęsto i wolno jak dawniej,
  // a w długiej smudze z szybem widać je na całej drodze, nie tylko w jej połowie)
  const ile = Math.min(60, Math.round(22 * cala / dy)), pik = s > 0 ? 1.6 : 1;
  for (let i = 0; i < ile; i++) {
    const f = ruch ? (teraz * 0.00004 * (dy / cala) * (0.6 + los(i * 3)) + los(i)) % 1 : los(i);
    const yy = gora + f * cala;
    const fs = yy < gy ? 0 : (yy - gy) / dy;
    const szer = z * 1.5 + (z * 2.8 - z * 1.5) * fs;
    const xx = gx + (u.cx - gx) * fs + (los(i * 7) * 2 - 1) * szer * 0.8 + (ruch ? Math.sin(teraz * 0.0007 + i) * z * 0.3 : 0);
    const al = 0.5 * Math.min(1, pik * Math.sin(f * Math.PI)) * (ruch ? 0.6 + 0.4 * Math.sin(teraz * 0.003 + i * 2) : 0.8);
    ctx.fillStyle = `rgba(255,246,220,${al})`;
    ctx.beginPath(); ctx.arc(xx, yy, Math.max(0.7, z * 0.04), 0, Math.PI * 2); ctx.fill();
  }
  // plama światła na krzyżu i mensie
  const R = z * 2.6;
  const gp = ctx.createRadialGradient(u.cx, u.krzyz.belka, 0, u.cx, u.krzyz.belka, R);
  gp.addColorStop(0, 'rgba(255,236,190,0.16)'); gp.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = gp; ctx.fillRect(u.cx - R, u.krzyz.belka - R, R * 2, R * 2);
  ctx.restore();
}

/** Modlitwa: promienie od krzyża, złote iskry od klęczącego do krzyża. */
function promienie(ctx: CanvasRenderingContext2D, u: Uklad, teraz: number, a: number, ruch: boolean, c?: Creature, cam?: Camera): void {
  const z = u.z;
  const kx = u.krzyz.x, ky = u.krzyz.belka;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // glorie rytownika: miękka łuna i gęste, cienkie kreski promieni różnej długości
  // (dawniej szesnaście grubych białych promieni — wielka gwiazda-rozbłysk)
  const R = z * 2.6;
  const h = ctx.createRadialGradient(kx, ky, 0, kx, ky, R);
  h.addColorStop(0, `rgba(255,232,170,${0.3 * a})`); h.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = h; ctx.fillRect(kx - R, ky - R, R * 2, R * 2);
  ctx.lineCap = 'round';
  const obrot = ruch ? teraz * 0.00012 : 0;
  for (let i = 0; i < 30; i++) {
    const kat = (i / 30) * Math.PI * 2 + obrot;
    const dl = z * (1.3 + 1.2 * los(i * 13) + (ruch ? 0.3 * Math.sin(teraz * 0.0021 + i * 1.7) : 0));
    const x1 = kx + Math.cos(kat) * z * 0.55, y1 = ky + Math.sin(kat) * z * 0.55;
    const x2 = kx + Math.cos(kat) * dl, y2 = ky + Math.sin(kat) * dl;
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, `rgba(255,232,180,${0.42 * a})`); g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(0.8, z * 0.035);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // iskry modlitwy: od dłoni klęczącego łukiem do krzyża
  if (c && cam && !c.dead) {
    const hh = wysokoscPostaci(c, z);
    const px = cam.toScreenX(c.x), py = cam.toScreenY(c.y + 1) - hh * 0.55;
    for (let i = 0; i < 9; i++) {
      const f = ruch ? (teraz * 0.0005 + i / 9) % 1 : i / 9;
      const x = px + (kx - px) * f, y = py + (ky - py) * f - Math.sin(f * Math.PI) * z * 1.1;
      ctx.fillStyle = `rgba(255,232,160,${0.85 * Math.sin(f * Math.PI) * a})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1, z * 0.07), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Krąg znaków wokół ołtarza: zapalają się po kolei z postępem `p` (krąg z glifów render/tajemnica.ts). */
function kragZnakow(ctx: CanvasRenderingContext2D, u: Uklad, teraz: number, rodzaj: RodzajRytualu, p: number, a: number, ruch: boolean): void {
  const z = u.z;
  const [r, g, b] = KRAG[rodzaj];
  const N = 12;
  const k = u.krag;
  ctx.save();
  // ślad kręgu na posadzce
  ctx.strokeStyle = `rgba(${r},${g},${b},${0.35 * a})`;
  ctx.lineWidth = Math.max(1, z * 0.05);
  ctx.beginPath(); ctx.ellipse(k.x, u.yp - z * 0.05, k.rx, z * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
  const obrot = ruch ? teraz * 0.00012 : 0;
  for (let i = 0; i < N; i++) {
    const zap = gladko(p * N - i);                 // i-ty znak zapala się, gdy przyjdzie jego kolej
    if (zap <= 0) continue;
    const kat = (i / N) * Math.PI * 2 + obrot;
    const x = k.x + Math.cos(kat) * k.rx, y = k.y + Math.sin(kat) * k.ry;
    const przod = Math.sin(kat) > 0 ? 1 : 0.6;       // znaki z przodu kręgu jaśniejsze
    const puls = ruch ? 0.8 + 0.2 * Math.sin(teraz * 0.006 + i) : 1;
    const al = zap * a * przod * puls;
    const R = z * 0.6;
    const gl = ctx.createRadialGradient(x, y, 0, x, y, R);
    gl.addColorStop(0, `rgba(${r},${g},${b},${0.4 * al})`); gl.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gl; ctx.fillRect(x - R, y - R, R * 2, R * 2);
    ctx.save();
    ctx.translate(x, y);
    const s = z * 0.22;
    ctx.scale(s, s);
    ctx.lineWidth = Math.max(1.2, z * 0.07) / s;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 40)},${Math.min(255, b + 40)},${0.95 * al})`;
    ctx.stroke(glif(i * 7 + (rodzaj === 'wskrzeszenie' ? 3 : 11), 2));
    ctx.restore();
  }
  ctx.restore();
}

/** Szał krwi: krew spływa po krzyżu do misy. */
function krewPoKrzyzu(ctx: CanvasRenderingContext2D, u: Uklad, teraz: number, p: number, ruch: boolean): void {
  const z = u.z;
  const k = u.krzyz;
  const dol = k.gora + (k.dol - k.gora) * gladko(p * 2.2);
  ctx.save();
  ctx.strokeStyle = 'rgba(176,20,14,0.95)';
  ctx.lineWidth = Math.max(1.2, z * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(k.x - z * 0.03, k.gora + z * 0.1); ctx.lineTo(k.x - z * 0.03, dol); ctx.stroke();
  // na ramionach krzyża — dwie strużki
  const ram = gladko(p * 3 - 0.4);
  if (ram > 0) {
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(k.x + s * k.ramie * 0.8, k.belka); ctx.lineTo(k.x + s * k.ramie * 0.8, k.belka + z * 0.35 * ram); ctx.stroke();
    }
  }
  // z podstawy krzyża krople kapią do misy
  if (p > 0.4) {
    const m = u.misa;
    for (let i = 0; i < 3; i++) {
      const f = ruch ? (teraz * 0.0016 + i / 3) % 1 : i / 3;
      const x = k.x + (m.x - k.x) * f, y = k.dol + (m.y - m.h - k.dol) * f - Math.sin(f * Math.PI) * z * 0.25;
      ctx.fillStyle = 'rgba(190,24,16,0.95)';
      ctx.save(); ctx.translate(x, y); ctx.beginPath(); kropla(ctx, Math.max(1.5, z * 0.08)); ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
}

/** Ofiara krwi: krople z ręki klęczącego łukiem do misy. */
function kroplezReki(ctx: CanvasRenderingContext2D, u: Uklad, cam: Camera, c: Creature, teraz: number, ruch: boolean): void {
  const z = u.z;
  const hh = wysokoscPostaci(c, z);
  const px = cam.toScreenX(c.x) + (u.cx > cam.toScreenX(c.x) ? 1 : -1) * hh * 0.18, py = cam.toScreenY(c.y + 1) - hh * 0.5;
  const m = u.misa;
  ctx.save();
  // struga: cienka, ciemna nić krwi z ręki łukiem do misy, a po niej krople
  ctx.strokeStyle = 'rgba(150,16,12,0.85)';
  ctx.lineWidth = Math.max(1.2, z * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let q = 0; q <= 16; q++) {
    const f = q / 16;
    const x = px + (m.x - px) * f, y = py + (m.y - m.h - py) * f - Math.sin(f * Math.PI) * z * 0.8;
    if (q === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const f = ruch ? (teraz * 0.0011 + i / 6) % 1 : i / 6;
    const x = px + (m.x - px) * f, y = py + (m.y - m.h - py) * f - Math.sin(f * Math.PI) * z * 0.8;
    ctx.fillStyle = 'rgba(196,26,18,0.95)';
    ctx.save(); ctx.translate(x, y); ctx.beginPath(); kropla(ctx, Math.max(1.8, z * 0.12)); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

/**
 * Ofiara życia: dusza — blady płomyk — wysuwa się z piersi ofiarującego (`p` 0…1) i, gdy ofiara się dopełni,
 * ulatuje w górę (`lot` 0…1) i gaśnie.
 */
function dusza(ctx: CanvasRenderingContext2D, cam: Camera, c: Creature, z: number, teraz: number, p: number, lot: number, ruch: boolean): void {
  const hh = Math.max(16, z * 1.9 * 1.15);
  const px = cam.toScreenX(c.x), piers = cam.toScreenY(c.y + 1) - hh * 0.62;
  const wysun = gladko(p * 1.3), gas = 1 - gladko((lot - 0.5) / 0.5);
  const y = piers - z * 0.9 * wysun - z * 6 * gladko(lot);
  const x = px + (ruch ? Math.sin(teraz * 0.003) * z * 0.12 : 0);
  const a = Math.min(1, 0.25 + 0.75 * wysun) * gas;
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = z * 1.1;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(236,238,244,${0.4 * a})`); g.addColorStop(1, 'rgba(220,226,240,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  // płomyk: łza z ogonem w dół, ku ciału — blady, z cienkim konturem (na jasnej sali samo światło ginęło)
  ctx.globalCompositeOperation = 'source-over';
  const r = z * 0.26, ogon = z * (0.6 + 0.5 * wysun);
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.4);
  ctx.bezierCurveTo(x + r * 1.2, y - r * 0.6, x + r, y + r * 0.8, x + (ruch ? Math.sin(teraz * 0.004 + 1) * r * 0.5 : 0), y + ogon);
  ctx.bezierCurveTo(x - r, y + r * 0.8, x - r * 1.2, y - r * 0.6, x, y - r * 1.4);
  ctx.fillStyle = `rgba(238,240,246,${0.78 * a})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(70,74,90,${0.55 * a})`;
  ctx.lineWidth = Math.max(1, z * 0.04);
  ctx.stroke();
  ctx.restore();
}

/** Szał: czerwona aura wokół rycerza (`moc` 0…1, ponad 1 — rozbłysk na końcu rytuału) i iskry żaru, które z niej ulatują. */
function aura(ctx: CanvasRenderingContext2D, cam: Camera, c: Creature, z: number, teraz: number, moc: number, ruch: boolean): void {
  if (moc <= 0.01) return;
  const hh = wysokoscPostaci(c, z);
  const x = cam.toScreenX(c.x), y = cam.toScreenY(c.y + 1) - hh * 0.5;
  const puls = ruch ? 0.85 + 0.15 * Math.sin(teraz * 0.009) : 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = hh * (0.7 + 0.25 * Math.min(1, moc));
  const g = ctx.createRadialGradient(x, y, hh * 0.1, x, y, R);
  g.addColorStop(0, `rgba(255,70,40,${0.32 * moc * puls})`); g.addColorStop(1, 'rgba(200,30,20,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  for (let i = 0; i < 7; i++) {
    const f = ruch ? (teraz * 0.0009 + i / 7) % 1 : i / 7;
    const ix = x + (los(i * 11) - 0.5) * hh * 0.6, iy = y + hh * 0.3 - f * hh * 1.1;
    ctx.fillStyle = `rgba(255,120,70,${0.8 * Math.min(1, moc) * Math.sin(f * Math.PI)})`;
    ctx.beginPath(); ctx.arc(ix, iy, Math.max(0.8, z * 0.05), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Rycina atlasu: ten sam ołtarz (środek w `cx`, podłoga `yp`, `z` pikseli na kafel) ze smugą dnia z góry, płomieniami
 * świec i — gdy podasz — chwilą rytuału `rodzaj` przy postępie `p`.
 */
export function oltarzNaRycinie(ctx: CanvasRenderingContext2D, cx: number, yp: number, z: number, t: number, rodzaj?: RodzajRytualu, p = 0.75): void {
  const u = ukladZ(cx, yp, z);
  smugaDnia(ctx, cx, yp - z * 8, yp - z * 8, u, t, true);
  rysujKamien(ctx, u);
  plomienie(ctx, u, t, rodzaj ? 1.25 : 1, true);
  if (!rodzaj) return;
  if (rodzaj === 'modlitwa') promienie(ctx, u, t, 1, true);
  if (Z_KREGIEM.includes(rodzaj)) kragZnakow(ctx, u, t, rodzaj, p, 1, true);
  if (rodzaj === 'szal') { krewPoKrzyzu(ctx, u, t, p, true); krewWMisie(ctx, u, p); }
  if (rodzaj === 'ofiaraKrwi') krewWMisie(ctx, u, p);
  void p;
}

/** Atrapa poległego do rysunku (to samo, co czyta rysunek ludu — jak w render/trupy.ts). */
function atrapaZmarlego(t: Trup): Creature {
  return {
    id: t.id, x: t.x, y: t.y, face: t.face, race: Race.GOBLIN, rola: t.rola,
    hp: 1, carry: 0, fear: 0, mad: 0, vy: 0, helm: t.helm,
  } as unknown as Creature;
}

let plotnoWsk: HTMLCanvasElement | null = null;
/** Jedno płótno na unoszącą się postać (rośnie, gdy trzeba). */
function plotno(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!plotnoWsk) plotnoWsk = document.createElement('canvas');
  if (plotnoWsk.width < w) plotnoWsk.width = w;
  if (plotnoWsk.height < h) plotnoWsk.height = h;
  return plotnoWsk;
}

function podpis(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, z: number, barwa: string): void {
  ctx.font = `italic ${Math.max(12, Math.min(16, z * 0.7))}px ${SERIF}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,7,6,0.85)';
  ctx.strokeText(tekst, x, y);
  ctx.fillStyle = barwa;
  ctx.fillText(tekst, x, y);
}
