import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { T } from '../sim/tiles';
import { glif } from './tajemnica';
import { RDZEN_WYGLAD as RW } from '../nastawy/wyglad/rdzen';

/**
 * Rdzeń i jego skorupa jako cel gry, nie kolorowy kafel. Skorupa to ciosane bloki
 * z wyrytymi znakami i jasnym obrzeżem; rdzeń — serce z kamienia, które bije
 * podwójnym uderzeniem, z żyłami i wieńcem pisma dookoła. Wieniec ma tyle ogniw,
 * ile pęknięć trzeba; zapalają się, gdy skorupa pęka. Z daleka rdzeń świeci jak
 * latarnia, żeby było wiadomo, dokąd to wszystko prowadzi.
 */
export function rysujRdzen(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const w = sim.world;
  const z = cam.zoom;
  const sx = cam.toScreenX(w.coreX + 0.5), sy = cam.toScreenY(w.coreY + 0.5);
  const zasieg = 22 * z;
  if (sx < -zasieg || sy < -zasieg || sx > cam.vw + zasieg || sy > cam.vh + zasieg) return;
  const r = sim.rytual;
  // tętno: podwójne uderzenie, jak serce — „bum-bum", pauza
  const uderz = tetnoRdzenia(teraz);
  const otwarta = r.otwarta;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // --- skorupa: ciosane bloki z obrzeżem od strony komory i od strony świata
  const px = (x: number) => cam.toScreenX(x), py = (y: number) => cam.toScreenY(y);
  const kamien = (x: number, y: number) => w.inb(x, y) && w.tile[w.idx(x, y)] === T.STONE;
  ctx.lineWidth = Math.max(1, z * 0.12);
  for (let y = w.coreY - RW.skorupaZasieg; y <= w.coreY + RW.skorupaZasieg; y++) {
    for (let x = w.coreX - RW.skorupaZasieg; x <= w.coreX + RW.skorupaZasieg; x++) {
      if (!kamien(x, y)) continue;
      const x0 = px(x), y0 = py(y);
      // ciemny blok z ukośną fakturą ciosu
      ctx.fillStyle = RW.blok;
      ctx.fillRect(x0, y0, z, z);
      if (z >= 5) {
        ctx.strokeStyle = RW.blokFaktura;
        ctx.beginPath();
        ctx.moveTo(x0 + z * 0.2, y0 + z * 0.9); ctx.lineTo(x0 + z * 0.9, y0 + z * 0.2);
        ctx.stroke();
      }
      // obrzeże: jasna krawędź tam, gdzie kamień się kończy
      ctx.strokeStyle = RW.blokObrzeze;
      ctx.beginPath();
      if (!kamien(x, y - 1)) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + z, y0); }
      if (!kamien(x, y + 1)) { ctx.moveTo(x0, y0 + z); ctx.lineTo(x0 + z, y0 + z); }
      if (!kamien(x - 1, y)) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + z); }
      if (!kamien(x + 1, y)) { ctx.moveTo(x0 + z, y0); ctx.lineTo(x0 + z, y0 + z); }
      ctx.stroke();
      // co któryś blok ma wyryty znak — skorupa jest napisana, nie tylko twarda
      if (z >= RW.znakiOdZoom && ((x * 7 + y * 13) & 7) === 0) {
        ctx.save();
        ctx.translate(x0 + z / 2, y0 + z / 2);
        ctx.scale(z * 0.3, z * 0.3);
        ctx.lineWidth = 1.2 / (z * 0.3);
        ctx.strokeStyle = RW.znak;
        ctx.stroke(glif(x * 31 + y, 2));
        ctx.restore();
      }
    }
  }

  // --- latarnia: szeroka poświata, widoczna z daleka i przy małym przybliżeniu
  const Rh = Math.max(RW.latarnia.min, z * RW.latarnia.naZoom);
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, Rh);
  const moc = otwarta ? RW.mocOtwarty : RW.mocZamkniety;
  halo.addColorStop(0, `rgba(255,120,80,${moc + 0.12 * uderz})`);
  halo.addColorStop(0.35, `rgba(200,50,40,${(moc * 0.5) + 0.06 * uderz})`);
  halo.addColorStop(1, 'rgba(120,20,20,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = halo;
  ctx.fillRect(sx - Rh, sy - Rh, Rh * 2, Rh * 2);
  ctx.globalCompositeOperation = 'source-over';

  // --- promienie: cienkie smugi od serca ku wieńcowi, pulsujące z tętnem
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,150,100,${RW.promienAlfa + RW.promienTetno * uderz})`;
  ctx.lineWidth = Math.max(1, z * 0.18);
  ctx.beginPath();
  const Rs = Math.max(RW.serce.min, z * RW.serce.naZoom);
  for (let i = 0; i < RW.promieni; i++) {
    const a = (i / RW.promieni) * Math.PI * 2 + teraz * 0.00004;
    const d0 = Rs * 1.1, d1 = Rs * (1.7 + 0.25 * (i % 3));
    ctx.moveTo(sx + Math.cos(a) * d0, sy + Math.sin(a) * d0);
    ctx.lineTo(sx + Math.cos(a) * d1, sy + Math.sin(a) * d1);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';

  // --- serce z kamienia: ośmiokąt ciosany, żyły i jasny środek
  const R = Rs * (1 + RW.puchniecie * uderz);
  rysujSerce(ctx, sx, sy, R, uderz, otwarta);

  // --- wieniec: tyle ogniw, ile pęknięć trzeba; zapalone = pęknięte
  const potrzeba = Math.max(1, Math.max(r.skorupa, r.pekniecia + (otwarta ? 0 : 1)));
  const zrobione = otwarta ? potrzeba : Math.min(potrzeba, r.pekniecia);
  const Rw = Math.max(R * RW.wieniec, z * RW.wieniecNaZoom);
  const obrot = teraz * 0.00008;
  for (let i = 0; i < potrzeba; i++) {
    const a0 = obrot + (i / potrzeba) * Math.PI * 2 + 0.08, a1 = obrot + ((i + 1) / potrzeba) * Math.PI * 2 - 0.08;
    const lit = i < zrobione;
    ctx.strokeStyle = lit ? `rgba(${RW.ogniwoZapalone},${0.75 + 0.25 * uderz})` : RW.ogniwoZgaszone;
    ctx.lineWidth = lit ? Math.max(2, z * 0.3) : Math.max(1, z * 0.14);
    ctx.beginPath(); ctx.arc(sx, sy, Rw, a0, a1); ctx.stroke();
  }
  // znaki na wieńcu, obracające się powoli w przeciwną stronę
  if (Rw > RW.znakiWiencaOd) {
    const n = RW.znakowWienca;
    for (let i = 0; i < n; i++) {
      const a = -obrot * 1.6 + (i / n) * Math.PI * 2;
      const gr = Math.max(3, z * 0.55);
      ctx.save();
      ctx.translate(sx + Math.cos(a) * (Rw + gr * 2.2), sy + Math.sin(a) * (Rw + gr * 2.2));
      ctx.rotate(a + Math.PI / 2);
      ctx.scale(gr, gr);
      ctx.lineWidth = 1.2 / gr;
      ctx.strokeStyle = 'rgba(230,180,120,0.5)';
      ctx.stroke(glif(700 + i, 1));
      ctx.restore();
    }
  }
  // podpis — cel gry nazwany wprost, póki kamera jest blisko
  if (z >= RW.podpisOdZoom) {
    const rozm = Math.max(12, Math.min(18, z * 1.2));
    ctx.font = `italic ${rozm}px "Trzewia Tekst", Georgia, serif`;
    ctx.textAlign = 'center';
    const tekst = otwarta ? RW.podpisOtwarty
      : r.pekniecia > 0 ? RW.podpisPeka.replace('{ile}', String(r.pekniecia)).replace('{z}', String(potrzeba)) : RW.podpisZamkniety;
    const ty = sy + Rw + rozm * 2.4;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,7,6,0.85)';
    ctx.strokeText(tekst, sx, ty);
    ctx.fillStyle = 'rgba(250,214,160,0.95)';
    ctx.fillText(tekst, sx, ty);
  }
  ctx.restore();
}

/** Tętno rdzenia 0..1: podwójne uderzenie „bum-bum" i pauza, wspólne dla gry i menu. */
export function tetnoRdzenia(teraz: number): number {
  const f = (teraz % RW.tetnoMs) / RW.tetnoMs;
  return Math.max(0, 1 - Math.abs(f - RW.uderzenie1) * 14) + RW.sila2 * Math.max(0, 1 - Math.abs(f - RW.uderzenie2) * 14);
}

/** Serce z kamienia: ciosany ośmiokąt, żyły, kreska cienia i jasne obrzeże. */
export function rysujSerce(ctx: CanvasRenderingContext2D, sx: number, sy: number, R: number, uderz: number, otwarta: boolean): void {
  const kanty = new Path2D();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rr = R * (i % 2 ? 0.92 : 1);
    if (i === 0) kanty.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
    else kanty.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
  }
  kanty.closePath();
  const wnetrze = ctx.createRadialGradient(sx - R * 0.25, sy - R * 0.3, R * 0.05, sx, sy, R);
  wnetrze.addColorStop(0, otwarta ? RW.serceJasneOtwarte : RW.serceJasne);
  wnetrze.addColorStop(0.3, otwarta ? RW.serceZarOtwarte : RW.serceZar);
  wnetrze.addColorStop(0.75, RW.serceCiemne);
  wnetrze.addColorStop(1, RW.serceBrzeg);
  ctx.fillStyle = wnetrze;
  ctx.fill(kanty);
  // żyły: kilka pękniętych linii od środka, jaśniejące z uderzeniem
  ctx.save();
  ctx.clip(kanty);
  ctx.strokeStyle = `rgba(255,214,160,${0.35 + 0.45 * uderz})`;
  ctx.lineWidth = Math.max(1, R * 0.06);
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.4;
    let x = sx, y = sy;
    ctx.moveTo(x, y);
    for (let k = 1; k <= 3; k++) {
      x = sx + Math.cos(a + Math.sin(i * 3 + k) * 0.35) * R * k / 3;
      y = sy + Math.sin(a + Math.sin(i * 3 + k) * 0.35) * R * k / 3;
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  // kreska ryciny na kuli — cień po prawej stronie
  ctx.strokeStyle = 'rgba(20,4,4,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let d = -R; d < R; d += Math.max(2.2, R * 0.12)) { ctx.moveTo(sx + d, sy + R); ctx.lineTo(sx + d + R, sy); }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,220,180,0.85)';
  ctx.lineWidth = Math.max(1.2, R * 0.07);
  ctx.stroke(kanty);

}
