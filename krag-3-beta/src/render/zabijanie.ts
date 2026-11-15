/**
 * CERBER ZABIJA (Krąg Trzeci, beta) — polecenie użytkownika (15.11): „Cerber ma być dużo bardziej brutalny, ma mieć
 * animacje zabijania innych (i zabijać dużo potępionych, a nie skupiać się na jednym czy dwóch przez całą grę), ma mieć
 * dużo możliwości rozszarpania czy zjedzenia kogoś i krwi ma być więcej”.
 *
 * Przy każdym postoju na kręgu (sim/krag.ts: zabiciaCerbera) Cerber zabija jednego żarłoka jednym z pięciu sposobów:
 *  0 — chwyta środkową paszczą, trzęsie nim i ciska trupem;   1 — dwie głowy chwytają i rozrywają go na pół;
 *  2 — podnosi i połyka w całości (zostaje ręka i krew);      3 — staje dęba, miażdży łapą i żre we trzy łby;
 *  4 — podrzuca w górę i łapie w paszczę, miażdżąc (głowa odpada).
 * Po zabójstwie zostają szczątki i kałuża krwi (render/potepieni.ts: rysujSzczatki), aż cień się odrodzi.
 */
import { rysujCerbera, pozaCerbera, type PozaCerbera } from './cerber';
import { rysujLudzika, pozaCzolga, pozaWPaszczy, pozaTrup, bryzgKrwi, kaluzaKrwi, type PozaLudzika } from './ludzik';

type P = [number, number];
const gl = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const zakres = (u: number, a: number, b: number): number => gl((u - a) / (b - a));
const dzwon = (u: number, a: number, b: number): number => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));

function naZiemi(ctx: CanvasRenderingContext2D, x: number, hV: number, p: PozaLudzika, t: number, zwrot = 1, skY = 1): void {
  const lezy = Math.abs(p.tulow) > 1.1;
  ctx.save();
  ctx.translate(x, -hV * (lezy ? 0.08 : 0.3));
  ctx.scale(zwrot, skY);
  rysujLudzika(ctx, hV, p, t);
  ctx.restore();
}
function wPaszczy(ctx: CanvasRenderingContext2D, m: P, hV: number, p: PozaLudzika, kat: number, t: number, skala = 1): void {
  ctx.save();
  ctx.translate(m[0], m[1]); ctx.rotate(kat);
  ctx.translate(-hV * 0.17 * skala, hV * 0.02);
  rysujLudzika(ctx, hV * skala, p, t);
  ctx.restore();
}
function kapie(ctx: CanvasRenderingContext2D, m: P, h: number, czas: number, moc = 1): void {
  ctx.save(); ctx.fillStyle = 'rgb(120,12,8)';
  for (let i = 0; i < 4 * moc; i++) {
    const f = ((czas / 600) + i * 0.27) % 1;
    ctx.beginPath(); ctx.ellipse(m[0] + (i - 1.5) * h * 0.04, m[1] + f * h * 0.9, h * 0.016, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function kawalki(ctx: CanvasRenderingContext2D, x: number, y: number, hV: number, czas: number, moc = 1): void {
  ctx.save();
  for (let i = 0; i < 6 * moc; i++) {
    const f = ((czas / 900) + i * 0.17) % 1;
    const a = -Math.PI / 2 + (((i * 37) % 10) / 10 - 0.5) * 1.6;
    const px = x + Math.cos(a) * hV * 0.8 * f, py = y + Math.sin(a) * hV * 0.8 * f + f * f * hV * 1.0;
    ctx.fillStyle = i % 2 ? 'rgb(150,40,36)' : 'rgb(110,10,8)';
    ctx.beginPath(); ctx.ellipse(px, py, hV * 0.04, hV * 0.025, f * 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Cerber zabija: `ctx` w stopach Cerbera, zwrot już ustawiony (pyski w +x). `hC` — wysokość Cerbera, `hV` — wzrost
 * ofiary, `vx` — gdzie leży ofiara (piksele przed nim), `u` 0…1 — postęp zabijania, `czas` — ms ekranu.
 * Zwraca pozę, w której rysowano Cerbera (do dalszych efektów).
 */
export function scenaZabijania(ctx: CanvasRenderingContext2D, hC: number, hV: number, vx: number, wariant: number, u: number, czas: number): PozaCerbera {
  const t = czas / 1000;
  const p = pozaCerbera();
  p.czas = czas; p.oddech = 0.5 + 0.5 * Math.sin(t * 5); p.szal = 0.4;
  p.ogon = Math.sin(t * 2.2) * 0.9;
  p.glowy.forEach((g, i) => { g.pochyl = 0.45 + 0.05 * i; g.paszcza = 0.6; g.wysun = 0.2; });
  const potrzas = Math.sin(czas / 45);
  // pozy głów przed rysunkiem
  if (wariant === 0) {
    const g = p.glowy[1];
    if (u < 0.12) { const k = u / 0.12; g.pochyl = mix(0.3, 0.8, k); g.paszcza = 0.9; g.wysun = mix(0, 0.6, k); }
    else if (u < 0.7) { g.pochyl = 0.35 + potrzas * 0.45; g.paszcza = 0.3; g.wysun = 0.35; }
    else { g.pochyl = mix(0.35, -0.7, zakres(u, 0.7, 0.8)); g.paszcza = u < 0.8 ? 0.3 : 0.9; g.wysun = 0.1; }
  } else if (wariant === 1) {
    const roz = zakres(u, 0.18, 0.42);
    p.glowy[0].pochyl = u < 0.15 ? mix(0.3, 0.8, u / 0.15) : mix(0.6, -0.4, roz) + (u > 0.42 ? potrzas * 0.3 : 0); p.glowy[0].paszcza = u < 0.15 ? 0.9 : 0.3; p.glowy[0].wysun = 0.4;
    p.glowy[2].pochyl = u < 0.15 ? mix(0.3, 0.9, u / 0.15) : mix(0.8, 1.3, roz) - (u > 0.42 ? potrzas * 0.3 : 0); p.glowy[2].paszcza = u < 0.15 ? 0.9 : 0.3; p.glowy[2].wysun = mix(0.5, 0.7, roz);
    p.glowy[1].pochyl = -0.3; p.glowy[1].paszcza = 0.8 * dzwon(u, 0.4, 0.7) + 0.2;
    p.deba = 0.12 * roz;
  } else if (wariant === 2) {
    const g = p.glowy[1];
    if (u < 0.15) { g.pochyl = mix(0.3, 0.85, u / 0.15); g.paszcza = 0.9; g.wysun = 0.6; }
    else if (u < 0.45) { g.pochyl = mix(0.85, -0.8, zakres(u, 0.15, 0.45)); g.paszcza = 0.35; g.wysun = 0.3; }
    else { g.pochyl = -0.8 + 0.1 * Math.sin(t * 8); g.paszcza = u < 0.75 ? 0.5 + 0.4 * Math.abs(Math.sin(t * 9)) : 0.15; g.wysun = 0.1; }
    p.deba = 0.2 * dzwon(u, 0.3, 0.8);
  } else if (wariant === 3) {
    p.deba = u < 0.22 ? zakres(u, 0, 0.18) * 0.75 : mix(0.75, 0, zakres(u, 0.22, 0.27));
    if (u > 0.3) p.glowy.forEach((g, i) => { g.pochyl = 0.85 + 0.1 * Math.sin(t * 9 + i * 2); g.paszcza = 0.3 + 0.6 * Math.abs(Math.sin(t * 7 + i * 1.7)); g.wysun = 0.55 + 0.15 * Math.sin(t * 5 + i); });
  } else {
    const g = p.glowy[1];
    if (u < 0.12) { g.pochyl = mix(0.3, 0.8, u / 0.12); g.paszcza = 0.9; g.wysun = 0.6; }
    else if (u < 0.42) { g.pochyl = -0.65; g.paszcza = 1; g.wysun = 0.2; }
    else { g.pochyl = -0.4 + potrzas * 0.35 * (1 - zakres(u, 0.7, 0.8)); g.paszcza = u < 0.8 ? 0.25 : 0.7; g.wysun = 0.25; }
  }
  // kałuża krwi rośnie od chwili rany
  const rana = wariant === 3 ? 0.25 : wariant === 4 ? 0.42 : wariant === 1 ? 0.42 : 0.15;
  kaluzaKrwi(ctx, vx, hV * 0.02, hV * (wariant === 3 || wariant === 1 ? 1.1 : 0.8), zakres(u, rana, rana + 0.3), wariant);
  // ofiara na ziemi pod łapą (wariant 3) — przed Cerberem
  if (wariant === 3) {
    if (u < 0.25) naZiemi(ctx, vx, hV, pozaCzolga(t, 1.6, 3), t, 1);
    else {
      naZiemi(ctx, vx, hV, { ...pozaTrup(3), krew: 1 }, t, 1, mix(1, 0.6, zakres(u, 0.25, 0.3)));
      if (u > 0.3) kawalki(ctx, vx, -hV * 0.15, hV, czas, 1.5);
    }
  }
  const m = rysujCerbera(ctx, hC, p).paszcze;
  const t2 = t * 1.0;
  if (wariant === 0) {
    if (u < 0.12) naZiemi(ctx, vx, hV, pozaCzolga(t, 1.8, 1), t, -1);
    else if (u < 0.7) {
      wPaszczy(ctx, m[1], hV, pozaWPaszczy(t2, 1), Math.PI / 2 + potrzas * 0.5, t);
      bryzgKrwi(ctx, m[1][0], m[1][1], hV, ((u - 0.12) * 12) % 1, -1.2 + potrzas, 1.2, Math.floor(u * 12));
      kapie(ctx, m[1], hV, czas, 1.5);
    } else if (u < 0.85) {
      const f = zakres(u, 0.7, 0.85);
      ctx.save(); ctx.translate(mix(m[1][0], vx + hV * 0.5, f), mix(m[1][1], -hV * 0.1, f) - Math.sin(f * Math.PI) * hC * 0.5); ctx.rotate(f * 5);
      rysujLudzika(ctx, hV, pozaTrup(1), t); ctx.restore();
    }
  } else if (wariant === 1) {
    const sr: P = [(m[0][0] + m[2][0]) / 2, (m[0][1] + m[2][1]) / 2];
    if (u < 0.15) naZiemi(ctx, vx, hV, pozaCzolga(t, 2, 2), t, -1);
    else if (u < 0.42) {
      wPaszczy(ctx, sr, hV, { ...pozaWPaszczy(t2, 1), krew: 0.6 }, Math.PI / 2 + potrzas * 0.15, t);
      kapie(ctx, sr, hV, czas, 1);
    } else if (u < 0.8) {
      wPaszczy(ctx, m[0], hV, { ...pozaWPaszczy(t2, 0.5), brak: { polowa: 'gora' } }, Math.PI / 2 + 0.7 + potrzas * 0.3, t);
      wPaszczy(ctx, m[2], hV, { ...pozaWPaszczy(t2, 0.5), brak: { polowa: 'dol' } }, Math.PI / 2 - 0.5 - potrzas * 0.3, t);
      bryzgKrwi(ctx, sr[0], sr[1], hV * 1.5, zakres(u, 0.42, 0.62), -Math.PI / 2, 2.4, 11);
      kapie(ctx, m[0], hV, czas, 2); kapie(ctx, m[2], hV, czas, 2);
    } else {
      const f = zakres(u, 0.8, 0.9);
      naZiemi(ctx, mix(m[0][0], vx - hV * 0.5, f), hV, { ...pozaTrup(2), brak: { polowa: 'gora' } }, t, 1);
      naZiemi(ctx, mix(m[2][0], vx + hV * 0.6, f), hV, { ...pozaTrup(4), brak: { polowa: 'dol' } }, t, -1);
    }
  } else if (wariant === 2) {
    if (u < 0.15) naZiemi(ctx, vx, hV, pozaCzolga(t, 2, 5), t, -1);
    else if (u < 0.75) {
      const lyk = zakres(u, 0.45, 0.75);
      wPaszczy(ctx, m[1], hV, { ...pozaWPaszczy(t2, 1 - lyk * 0.7), krew: 0.9, brak: u > 0.55 ? { rekaL: true } : undefined }, Math.PI / 2 - 1.1 * zakres(u, 0.15, 0.45), t, 1 - lyk * 0.85);
      kapie(ctx, m[1], hV, czas, 2);
      if (u > 0.55 && u < 0.75) bryzgKrwi(ctx, m[1][0], m[1][1], hV, (u - 0.55) / 0.2, 0.3, 1, 21);
    } else kapie(ctx, m[1], hV, czas, 1);
  } else if (wariant === 3) {
    for (const q of m) kapie(ctx, q, hV, czas, 1);
    if (u > 0.22 && u < 0.4) bryzgKrwi(ctx, vx, -hV * 0.1, hV * 1.4, (u - 0.22) / 0.18, -Math.PI / 2, 2.6, 13);
  } else {
    if (u < 0.12) naZiemi(ctx, vx, hV, pozaCzolga(t, 1.8, 7), t, -1);
    else if (u < 0.42) {
      // w górę i z powrotem w paszczę
      const f = zakres(u, 0.12, 0.42);
      const wys = Math.sin(f * Math.PI) * hC * 1.1;
      ctx.save(); ctx.translate(mix(m[1][0], m[1][0] + hV * 0.2, f), m[1][1] - wys); ctx.rotate(f * 9);
      rysujLudzika(ctx, hV, { ...pozaWPaszczy(t2, 1), usta: 1 }, t); ctx.restore();
    } else if (u < 0.8) {
      wPaszczy(ctx, m[1], hV, { ...pozaWPaszczy(t2, 0.3), krew: 1, brak: u > 0.55 ? { glowa: true } : undefined }, Math.PI / 2 + potrzas * 0.4, t);
      bryzgKrwi(ctx, m[1][0], m[1][1], hV * 1.3, zakres(u, 0.42, 0.62), -1.0, 2, 17);
      kapie(ctx, m[1], hV, czas, 2);
    } else {
      const f = zakres(u, 0.8, 0.9);
      naZiemi(ctx, vx, hV, { ...pozaTrup(5), brak: { glowa: true } }, t, 1);
      void f;
    }
  }
  return p;
}

/** Szczątki po zabójstwie (wariant) — `ctx` w punkcie na gruncie, `a` — krycie (zanikanie), `t` — sekundy. */
export function rysujSzczatki(ctx: CanvasRenderingContext2D, hV: number, wariant: number, a: number, t: number, ziarno: number): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  kaluzaKrwi(ctx, 0, hV * 0.02, hV * (wariant === 3 || wariant === 1 ? 1.15 : 0.85), 1, ziarno);
  if (wariant === 0) naZiemi(ctx, hV * 0.5, hV, pozaTrup(1), t, 1);
  else if (wariant === 1) {
    naZiemi(ctx, -hV * 0.5, hV, { ...pozaTrup(2), brak: { polowa: 'gora' } }, t, 1);
    naZiemi(ctx, hV * 0.6, hV, { ...pozaTrup(4), brak: { polowa: 'dol' } }, t, -1);
  } else if (wariant === 2) {
    // została tylko ręka
    ctx.save(); ctx.translate(hV * 0.2, -hV * 0.05); ctx.rotate(1.3);
    ctx.strokeStyle = 'rgba(16,10,8,0.96)'; ctx.lineWidth = hV * 0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, hV * 0.3); ctx.stroke();
    ctx.strokeStyle = 'rgb(176,152,124)'; ctx.lineWidth = hV * 0.07;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, hV * 0.3); ctx.stroke();
    ctx.fillStyle = 'rgb(128,14,10)'; ctx.beginPath(); ctx.arc(0, 0, hV * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (wariant === 3) {
    naZiemi(ctx, 0, hV, { ...pozaTrup(3), krew: 1 }, t, 1, 0.6);
    ctx.fillStyle = 'rgb(110,10,8)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(-hV * 0.8 + i * hV * 0.3, -hV * 0.02, hV * 0.05, hV * 0.025, i, 0, Math.PI * 2); ctx.fill(); }
  } else {
    naZiemi(ctx, 0, hV, { ...pozaTrup(5), brak: { glowa: true } }, t, 1);
    // odgryziona głowa obok
    ctx.fillStyle = 'rgb(176,152,124)'; ctx.strokeStyle = 'rgba(16,10,8,0.96)'; ctx.lineWidth = Math.max(1, hV * 0.012);
    ctx.beginPath(); ctx.arc(hV * 0.9, -hV * 0.08, hV * 0.085, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgb(128,14,10)'; ctx.beginPath(); ctx.ellipse(hV * 0.9, -hV * 0.0, hV * 0.08, hV * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Krótki opis sposobu (do kroniki i testów). */
export const SPOSOBY_ZABIJANIA = ['szarpie i ciska trupem', 'rozrywa na pół', 'połyka w całości', 'miażdży łapą i żre', 'podrzuca i chwyta w paszczę'];
void mix;
