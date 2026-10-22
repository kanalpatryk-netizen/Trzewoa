/**
 * Remake v2: wiadro z jedzeniem na linie (logika: src/sim/wiadro.ts).
 * Lina wychodzi ze stropu jamy; drewniane wiadro w żelaznych obręczach, z wierzchu bochny
 * i korzenie. W czasie zjazdu pod wiadrem wisi luźny koniec liny aż do ziemi — po nim wspina się
 * skrajnie głodny. Zapowiedź to tylko pył ze stropu (cząstki z symulacji).
 *
 * Alpha, etap 4 — przecięta lina (sim/lina-wiadra.ts): w miejscu cięcia błysk i fruwające włókna, dolny kawałek spada
 * i zwija się na dnie, górny podskakuje i dynda ze strzępami na końcu. Zjeżdżające wiadro leci w dół, obracając się,
 * i roztrzaskuje się: klepki, obręcze i rozsypane jedzenie. Naprawiający wspina się po kikucie, ciągnie za sobą dolny
 * kawałek, a pod jego dłonią rośnie supeł; potem lina się napina — drży i uspokaja się.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { wiadra, type Wiadro, type LinaPrzecieta } from '../sim/wiadro';
import { WIADRO } from '../nastawy/wiadro';
import { SURFACE_Y } from '../sim/world';
import { wysokoscPostaci } from './figury';

/** Tani skrót liczby — stałe kształty strzępów i klepek (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

const LINA = 'rgba(176,140,92,0.95)';
const LINA_CIEN = 'rgba(20,12,8,0.85)';
/** Wiadro jest większe od kafla (postać ma prawie dwa) — wysokie na tyle, żeby ktoś się w nim zmieścił. */
const WIELKOSC = 1.6;

/** Gdzie na ekranie: kolumna liny, strop, wiadro (górny lewy róg układu — środek brzegu), jego wielkość i przechył. */
function uklad(wd: Wiadro, cam: Camera, teraz: number): { sx: number; gora: number; bx: number; top: number; Z: number; kat: number } {
  const z = cam.zoom;
  const sx = cam.toScreenX(wd.x + 0.5), gora = cam.toScreenY(wd.sufit);
  const Z = Math.max(10, z * WIELKOSC);
  // dno wiadra na dole kafla, w którym jest — stojące stoi na podłodze
  const top = cam.toScreenY(wd.y + 1) - Z;
  // kołysanie w czasie jazdy (wiadro stoi — wisi prosto); etap 4: spadające koziołkuje
  const jedzie = wd.faza === 'zjezdza' || wd.faza === 'odjezdza';
  const kat = wd.faza === 'spada' ? (wd.id % 2 ? 1 : -1) * Math.min(1.2, wd.v * 2.4) : jedzie ? Math.sin(teraz * 0.0021 + wd.id * 1.7) * 0.045 : 0;
  const bx = sx + Math.sin(kat) * Math.max(0, top - gora) * 0.6;
  return { sx, gora, bx, top, Z, kat };
}

export function rysujWiadra(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const lista = wiadra(sim);
  const st = sim.lud.wiadra;
  const lp = st?.przecieta;
  const z = cam.zoom;
  ctx.save();
  ctx.lineCap = 'round';
  // etap 4: przecięta lina — kikut ze strzępami, dolny kawałek, cięcie
  if (lp) rysujPrzecieta(ctx, sim, cam, teraz, lp);
  for (const wd of lista) {
    if (wd.faza === 'zapowiedz') continue;
    // etap 4: roztrzaskane — klepki, obręcze i rozsypane jedzenie na dnie
    if (wd.faza === 'rozbite') { rozbite(ctx, sim, wd, cam); continue; }
    const { sx, gora, bx, top, Z, kat } = uklad(wd, cam, teraz);
    const dolJamy = cam.toScreenY(wd.cel + 1);
    if (sx < -60 || sx > cam.vw + 60 || dolJamy < -60 || gora > cam.vh + 60) continue;
    ctx.save();
    // nad stropem jamy jest skała — wiadro wjeżdżające w górę znika w niej
    ctx.beginPath(); ctx.rect(-100, gora, cam.vw + 200, cam.vh + 200 - gora); ctx.clip();
    // lina od stropu do kabłąka (etap 4: przecięta — kikut rysuje rysujPrzecieta, a spadające ciągnie urwany kawałek)
    const kablakY = top + Z * 0.05;
    const gr = Math.max(1, z * 0.09);
    if (wd.faza === 'spada') {
      ctx.save(); ctx.translate(bx, kablakY); ctx.rotate(kat);
      lina(ctx, 0, 0, 0, -z * 1.1, gr);
      strzepy(ctx, 0, -z * 1.1, z, -Math.PI / 2, wd.id);
      ctx.restore();
    } else if (!lp) {
      // po naprawie lina się napina: drży coraz słabiej, a w miejscu sklejenia siedzi supeł
      const napina = st?.naprawionaT !== undefined ? sim.tick - st.naprawionaT : Infinity;
      if (napina < WIADRO.naprawa.napinanie) {
        const k = napina / WIADRO.naprawa.napinanie;
        const drgnij = Math.sin(napina * 0.45) * (1 - k) * (1 - k) * z * 0.55;
        linaLuk(ctx, sx, gora - z * 0.2, bx, kablakY, gr, drgnij);
        const wy = Math.min(kablakY - z * 0.3, cam.toScreenY(wd.cel + 1 - WIADRO.naprawa.koniecNadDnem));
        supel(ctx, sx + (bx - sx) * 0.9 + drgnij * 0.3, wy, z, 1);
      } else lina(ctx, sx, gora - z * 0.2, bx, kablakY, gr);
    }
    // luźny koniec liny pod zjeżdżającym wiadrem — aż do ziemi, lekko wygięty
    if (wd.faza === 'zjezdza') {
      const dno = top + Z, ziemia = dolJamy;
      if (ziemia - dno > z * 0.4) {
        const fala = Math.sin(teraz * 0.003 + wd.id) * z * 0.25;
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = Math.max(1.4, z * 0.1);
        ctx.beginPath(); ctx.moveTo(bx, dno); ctx.quadraticCurveTo(bx + fala, (dno + ziemia) / 2, bx + fala * 0.4, ziemia); ctx.stroke();
        ctx.strokeStyle = LINA; ctx.lineWidth = Math.max(0.8, z * 0.055);
        ctx.stroke();
        // zwój liny na ziemi
        ctx.beginPath(); ctx.ellipse(bx + fala * 0.4, ziemia - z * 0.06, z * 0.22, z * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // ciepła poświata pełnego wiadra
    if (wd.porcje > 0) {
      const r = z * 2.2;
      const gy = top + Z * 0.4;
      const g = ctx.createRadialGradient(bx, gy, 0, bx, gy, r);
      g.addColorStop(0, 'rgba(255,196,110,0.32)'); g.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, gy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.translate(bx, top);
    ctx.rotate(kat);
    kubel(ctx, wd, Z);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Kto siedzi w zjeżdżającym wiadrze, ma być w nim, a nie przed nim: po narysowaniu postaci
 * jeszcze raz sama ścianka wiadra (bez kabłąka i jedzenia) zasłania mu nogi.
 */
export function rysujPrzodWiader(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const zajete = new Set<number>();
  for (const c of sim.creatures) if (!c.dead && c.naWiadrze && c.naLinie !== undefined) zajete.add(c.naLinie);
  if (!zajete.size) return;
  for (const wd of wiadra(sim)) {
    if (!zajete.has(wd.id) || wd.faza === 'zapowiedz') continue;
    const { bx, top, Z, kat } = uklad(wd, cam, teraz);
    ctx.save();
    ctx.translate(bx, top); ctx.rotate(kat);
    kubel(ctx, wd, Z, true);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- etap 4: przecięta lina

/** Strzępy na końcu przeciętej liny: kilka rozczapierzonych włókien w kierunku `kat`. */
function strzepy(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, kat: number, ziarno: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = kat + (los(ziarno * 31 + i) - 0.5) * 1.6, dl = z * (0.12 + 0.2 * los(ziarno * 17 + i));
    ctx.strokeStyle = i % 2 ? LINA : 'rgba(140,108,66,0.95)'; ctx.lineWidth = Math.max(0.6, z * 0.03);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * dl * 0.5, y + Math.sin(a) * dl * 0.5 + z * 0.03, x + Math.cos(a) * dl, y + Math.sin(a) * dl); ctx.stroke();
  }
  ctx.restore();
}

/** Lina wygięta w łuk (drży, zwisa) — od (x1, y1) do (x2, y2), środek odsunięty w bok o `wygiecie`. */
function linaLuk(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, gr: number, wygiecie: number): void {
  const mx = (x1 + x2) / 2 + wygiecie, my = (y1 + y2) / 2;
  ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = gr + 1.2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
  ctx.strokeStyle = LINA; ctx.lineWidth = gr;
  ctx.stroke();
}

/** Supeł: zwoje owinięte wokół liny (`ile` 0..1 — ile już owinął). */
function supel(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, ile: number): void {
  const n = Math.max(1, Math.round(ile * 4));
  ctx.save();
  for (let i = 0; i < n; i++) {
    const yy = y - z * 0.09 * i + z * 0.13;
    ctx.fillStyle = 'rgba(150,114,70,0.98)'; ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = Math.max(0.6, z * 0.025);
    ctx.beginPath(); ctx.ellipse(x, yy, z * 0.13, z * 0.06, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/** Zwój liny leżący na dnie. */
function zwojNaDnie(ctx: CanvasRenderingContext2D, x: number, y: number, z: number): void {
  ctx.save();
  ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = Math.max(1.4, z * 0.1);
  for (const pass of [0, 1]) {
    if (pass) { ctx.strokeStyle = LINA; ctx.lineWidth = Math.max(0.8, z * 0.06); }
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + i * z * 0.05, y - z * 0.05 - i * z * 0.06, z * (0.34 - i * 0.05), z * 0.08, 0.05, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x + z * 0.3, y - z * 0.06); ctx.quadraticCurveTo(x + z * 0.6, y - z * 0.02, x + z * 0.75, y - z * 0.1); ctx.stroke();
  }
  strzepy(ctx, x + z * 0.75, y - z * 0.1, z, -0.3, 7);
  ctx.restore();
}

/**
 * Przecięta lina: z góry zwisa kikut (koniec podskoczył po cięciu i dynda), dolny kawałek spadł i leży zwinięty przy
 * wiadrze — albo zwisa z dłoni tego, kto wspina się po kikucie, aż do wiadra. Przez chwilę po cięciu: błysk i włókna.
 */
function rysujPrzecieta(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, lp: LinaPrzecieta): void {
  const z = cam.zoom;
  const t = sim.tick - lp.od;
  const sx = cam.toScreenX(lp.x + 0.5), gora = cam.toScreenY(SURFACE_Y - 1);
  const dno = cam.toScreenY(lp.dno + 1);
  if (sx < -80 || sx > cam.vw + 80 || dno < -80 || gora > cam.vh + 80) return;
  const gr = Math.max(1, z * 0.09);
  // koniec kikuta: z miejsca cięcia sprężynuje do miejsca, gdzie zawiśnie, i dynda coraz słabiej
  const u = gladko(t / 60);
  const yKonca = cam.toScreenY(lp.ciecie + (lp.koniec - lp.ciecie) * u) + Math.sin(t * 0.2) * Math.exp(-t / 50) * z * 0.25;
  const dynda = Math.sin(t * 0.06) * Math.exp(-t / 500) * z * 0.4 + Math.sin(teraz * 0.0017) * z * 0.05;
  const kto = lp.naprawia !== undefined ? sim.creatureById(lp.naprawia) : null;
  const wisi = !!kto && !kto.dead && !!kto.naprawia && kto.naprawia.faza !== 'schodzi';
  const xKonca = sx + (wisi ? 0 : dynda);
  linaLuk(ctx, sx, gora - z * 0.2, xKonca, yKonca, gr, (xKonca - sx) * 0.3);
  if (!wisi) strzepy(ctx, xKonca, yKonca, z, Math.PI / 2, lp.od);
  // wiadro na dnie (stoi albo roztrzaskane): tu leży albo dochodzi dolny kawałek
  const wd = wiadra(sim).find((w) => w.faza === 'stoi' || w.faza === 'rozbite' || w.faza === 'spada');
  const kablak = wd && wd.faza === 'stoi' ? { x: sx, y: dno - Math.max(10, z * 1.6) * 0.95 } : null;
  if (wisi && kto) {
    // dolny kawałek zwisa z jego dłoni do wiadra (albo do dna), a pod dłonią rośnie supeł
    const h = wysokoscPostaci(kto, z);
    const dx = cam.toScreenX(kto.x), dy = cam.toScreenY(kto.y + 1) - h * 0.85;
    const cel = kablak ?? { x: sx + z * 0.7, y: dno - z * 0.08 };
    linaLuk(ctx, dx, dy, cel.x, cel.y, gr * 0.9, z * 0.45);
    if (kto.naprawia!.faza === 'skleja') {
      const ile = Math.min(1, (sim.tick - kto.naprawia!.od) / WIADRO.naprawa.sklejanie);
      supel(ctx, xKonca, yKonca, z, ile);
    }
  } else {
    // dolny kawałek: przez chwilę spada spod cięcia, potem leży zwinięty obok wiadra
    const spad = gladko(t / 40);
    if (spad < 1) {
      const y0 = cam.toScreenY(lp.ciecie) + (dno - cam.toScreenY(lp.ciecie)) * spad;
      linaLuk(ctx, sx + z * 0.2, y0, sx + z * 0.5, Math.min(dno, y0 + z * 1.4), gr * 0.9, z * 0.3);
    } else zwojNaDnie(ctx, sx + z * 0.75, dno, z);
  }
  // cięcie: błysk i fruwające włókna
  if (t < 140) {
    const cx = sx, cy = cam.toScreenY(lp.ciecie);
    if (t < 24) {
      const a = 1 - t / 24, R = z * (0.6 + t * 0.06);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, `rgba(255,236,200,${0.9 * a})`); g.addColorStop(0.4, `rgba(255,120,60,${0.5 * a})`); g.addColorStop(1, 'rgba(200,40,20,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    for (let i = 0; i < 14; i++) {
      const a = los(lp.od + i * 13) * Math.PI * 2, v = z * (0.02 + 0.03 * los(lp.od + i * 7));
      const px = cx + Math.cos(a) * v * t, py = cy + Math.sin(a) * v * t + 0.00018 * z * t * t;
      ctx.strokeStyle = `rgba(190,150,96,${0.95 * (1 - t / 140)})`; ctx.lineWidth = Math.max(0.6, z * 0.025);
      const obr = t * 0.12 + i;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(obr) * z * 0.12, py + Math.sin(obr) * z * 0.12); ctx.stroke();
    }
  }
}

/** Roztrzaskane wiadro na dnie: rozrzucone klepki, obręcze, rozsypane bochny (ile ich zostało), pył w pierwszej chwili. */
function rozbite(ctx: CanvasRenderingContext2D, sim: Sim, wd: Wiadro, cam: Camera): void {
  const z = cam.zoom, Z = Math.max(10, z * WIELKOSC);
  const x = cam.toScreenX(wd.x + 0.5), dno = cam.toScreenY(wd.cel + 1);
  if (x < -80 || x > cam.vw + 80 || dno < -40 || dno > cam.vh + 80) return;
  const t = sim.tick - wd.od;
  const rozrzut = gladko(t / 25);
  ctx.save();
  const obrys = 'rgba(16,10,6,0.95)';
  // klepki: odlatują od środka i kładą się na dnie
  for (let i = 0; i < 7; i++) {
    const s = (los(wd.id * 11 + i) - 0.5) * 2, dx = s * Z * (0.25 + 0.75 * rozrzut);
    const kat = s * 1.2 * rozrzut + (1 - rozrzut) * 0.1;
    const lez = rozrzut > 0.6 ? 1 : 0;
    ctx.save();
    ctx.translate(x + dx, dno - Z * 0.07 - (1 - rozrzut) * Z * 0.4 * Math.sin(rozrzut * Math.PI));
    ctx.rotate(lez ? Math.PI / 2 * Math.sign(s || 1) * 0.9 + s * 0.2 : kat);
    ctx.fillStyle = i % 2 ? 'rgba(130,88,48,1)' : 'rgba(96,62,34,1)';
    ctx.strokeStyle = obrys; ctx.lineWidth = Math.max(0.8, z * 0.04);
    ctx.beginPath(); ctx.rect(-Z * 0.06, -Z * 0.5, Z * 0.12, Z * 0.5); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // obręcze leżą płasko
  ctx.strokeStyle = 'rgba(58,56,56,1)'; ctx.lineWidth = Math.max(1, z * 0.07);
  for (const s of [-0.35, 0.45]) { ctx.beginPath(); ctx.ellipse(x + s * Z, dno - Z * 0.05, Z * 0.32, Z * 0.07, s * 0.2, 0, Math.PI * 2); ctx.stroke(); }
  // rozsypane jedzenie: tyle bochnów, ile porcji zostało (najwyżej 8)
  const ile = Math.min(8, wd.porcje);
  for (let i = 0; i < ile; i++) {
    const s = (los(wd.id * 23 + i) - 0.5) * 2;
    const px = x + s * Z * 1.1, py = dno - Z * 0.09;
    ctx.fillStyle = i % 3 === 2 ? 'rgba(164,74,48,1)' : i % 2 ? 'rgba(176,118,58,1)' : 'rgba(196,140,72,1)';
    ctx.strokeStyle = obrys; ctx.lineWidth = Math.max(0.6, z * 0.03);
    ctx.beginPath(); ctx.ellipse(px, py, Z * 0.14, Z * 0.09, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // pył w chwili uderzenia
  if (t < 60) {
    const a = 1 - t / 60;
    for (let i = 0; i < 9; i++) {
      const s = (los(wd.id * 5 + i) - 0.5) * 2;
      ctx.fillStyle = `rgba(196,176,140,${0.5 * a})`;
      ctx.beginPath(); ctx.arc(x + s * Z * (0.4 + t * 0.02), dno - Z * 0.1 - t * z * 0.006 * (1 + los(i)), Z * (0.1 + t * 0.004), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function lina(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, gr: number): void {
  ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = gr + 1.2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = LINA; ctx.lineWidth = gr;
  ctx.stroke();
  // skręt liny: krótkie skośne kreski co kawałek
  const dl = Math.hypot(x2 - x1, y2 - y1);
  if (gr < 1.6 || dl < 4) return;
  ctx.strokeStyle = 'rgba(96,70,40,0.8)'; ctx.lineWidth = Math.max(0.5, gr * 0.3);
  ctx.beginPath();
  const krok = gr * 2.2, n = Math.min(200, Math.floor(dl / krok));
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
    ctx.moveTo(x - gr * 0.45, y - gr * 0.4); ctx.lineTo(x + gr * 0.45, y + gr * 0.4);
  }
  ctx.stroke();
}

/** Wiadro w układzie: (0,0) = górny środek kafla, z = piksele na kafel. */
function kubel(ctx: CanvasRenderingContext2D, wd: Wiadro, z: number, przod = false): void {
  const gw = z * 0.46, dw = z * 0.36, gy = z * 0.3, dy = z;
  const obrys = 'rgba(16,10,6,0.95)', lw = Math.max(1, z * 0.07);
  // kabłąk
  if (!przod) {
    ctx.strokeStyle = 'rgba(70,66,64,0.98)'; ctx.lineWidth = Math.max(1, z * 0.07);
    ctx.beginPath(); ctx.moveTo(-gw * 0.95, gy + z * 0.06); ctx.quadraticCurveTo(0, -z * 0.18, gw * 0.95, gy + z * 0.06); ctx.stroke();
  }
  // jedzenie z wierzchu: im mniej porcji, tym niżej
  const pelno = przod ? 0 : wd.pelne > 0 ? Math.max(0, Math.min(1, wd.porcje / wd.pelne)) : 0;
  if (pelno > 0) {
    const wys = z * (0.08 + 0.26 * pelno);
    const kawalki: [number, number, number, string][] = [
      [-0.5, 0.3, 0.32, 'rgba(176,118,58,1)'],   // bochen
      [0.35, 0.36, 0.3, 'rgba(150,96,46,1)'],
      [-0.05, 0.5, 0.34, 'rgba(196,140,72,1)'],
      [0.6, 0.18, 0.2, 'rgba(120,132,62,1)'],    // korzeń / zielenina
      [-0.75, 0.12, 0.2, 'rgba(164,74,48,1)'],   // rzepa
    ];
    for (const [fx, fh, fr, barwa] of kawalki) {
      const x = fx * gw, y = gy - wys * (fh / 0.5) * 0.9 + z * 0.04;
      ctx.fillStyle = barwa; ctx.strokeStyle = obrys; ctx.lineWidth = lw * 0.7;
      ctx.beginPath(); ctx.ellipse(x, y, fr * gw * 1.1, fr * gw * 0.75, fx * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,230,170,0.35)';
      ctx.beginPath(); ctx.ellipse(x - fr * gw * 0.3, y - fr * gw * 0.25, fr * gw * 0.4, fr * gw * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // klepki
  ctx.beginPath();
  ctx.moveTo(-gw, gy); ctx.lineTo(gw, gy); ctx.lineTo(dw, dy); ctx.lineTo(-dw, dy); ctx.closePath();
  const g = ctx.createLinearGradient(-gw, 0, gw, 0);
  g.addColorStop(0, 'rgba(92,60,34,1)'); g.addColorStop(0.45, 'rgba(150,104,58,1)'); g.addColorStop(1, 'rgba(70,44,26,1)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = obrys; ctx.lineWidth = lw; ctx.stroke();
  if (z >= 9) {
    ctx.strokeStyle = 'rgba(40,24,12,0.7)'; ctx.lineWidth = Math.max(0.6, z * 0.025);
    ctx.beginPath();
    for (const f of [-0.5, 0, 0.5]) { ctx.moveTo(f * gw, gy); ctx.lineTo(f * dw, dy); }
    ctx.stroke();
  }
  // żelazne obręcze
  ctx.strokeStyle = 'rgba(58,56,56,1)'; ctx.lineWidth = Math.max(1, z * 0.08);
  for (const t of [0.22, 0.78]) {
    const y = gy + (dy - gy) * t, s = gw + (dw - gw) * t;
    ctx.beginPath(); ctx.moveTo(-s, y); ctx.lineTo(s, y); ctx.stroke();
  }
  // brzeg
  ctx.strokeStyle = 'rgba(190,150,96,0.9)'; ctx.lineWidth = Math.max(0.8, z * 0.05);
  ctx.beginPath(); ctx.moveTo(-gw, gy); ctx.lineTo(gw, gy); ctx.stroke();
}
