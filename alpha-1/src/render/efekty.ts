import type { Camera } from './camera';
import { glif } from './tajemnica';
import { kropla } from './kruszce';
import { wolnoRuszac } from './nastroj';
import { rolaPostaci } from '../sim/lud';
import { MOCE } from '../nastawy/moce';
import type { Sim } from '../sim/sim';

export type RodzajEfektu = 'kopniecie' | 'zasiew' | 'mysl' | 'cud' | 'skaza' | 'zawal' | 'smierc' | 'objawienie' | 'szept';

const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
/** Okno w czasie: narasta od `a` do `b`, trzyma, gaśnie od `c` do `d`. */
const okno = (t: number, a: number, b: number, c: number, d: number): number => gladko((t - a) / (b - a)) * (1 - gladko((t - c) / (d - c)));
/** Powtarzalny „los” 0..1 z liczby całkowitej. */
function los(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export interface Efekt { x: number; y: number; rodzaj: RodzajEfektu; t: number; max: number; tekst?: string; }

/**
 * Krótkie znaki nad światem: każde użycie czasownika musi zostawić ślad, który widać
 * od razu. Bez tego gracz nie wie, czy jego dotknięcie w ogóle coś zrobiło.
 */
export function rysujEfekty(ctx: CanvasRenderingContext2D, efekty: Efekt[], cam: Camera, czas: number, sim?: Sim): void {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  ctx.save();
  for (const e of efekty) {
    const p = e.t / e.max;
    if (p > 1) continue;
    const sx = (e.x - left) * z, sy = (e.y - top) * z;
    // objawienie sięga daleko (krąg na posadzce, smugi od wiernych) — nie gaśnie, gdy jego środek wyjdzie za ekran
    const zapas = e.rodzaj === 'objawienie' ? z * 12 : 120;
    if (sx < -zapas || sy < -zapas || sx > cam.vw + zapas || sy > cam.vh + zapas) continue;
    const gasnie = 1 - p;

    switch (e.rodzaj) {
      case 'smierc': {
        // krew tryska łukiem i spada, a nad miejscem zostaje na chwilę krótki krzyżyk rytownika
        // (dawniej sam krzyżyk w kółku — śmierć bez kropli krwi)
        for (let i = 0; i < 7; i++) {
          const kat = -Math.PI / 2 + (i - 3) * 0.32, v = z * (1.2 + (i % 3) * 0.35);
          const x = sx + Math.cos(kat) * v * p * 1.4, y = sy + Math.sin(kat) * v * p * 1.4 + z * 3.2 * p * p;
          ctx.fillStyle = `rgba(150,16,10,${0.95 * gasnie})`;
          ctx.save(); ctx.translate(x, y); ctx.beginPath(); kropla(ctx, Math.max(2, z * (0.1 + (i % 2) * 0.04))); ctx.fill(); ctx.restore();
        }
        const r = z * 0.22;
        ctx.strokeStyle = `rgba(200,96,76,${0.8 * gasnie})`;
        ctx.lineWidth = Math.max(1, z * 0.07);
        ctx.beginPath();
        ctx.moveTo(sx - r, sy - z * 1.6 - r); ctx.lineTo(sx + r, sy - z * 1.6 + r);
        ctx.moveTo(sx + r, sy - z * 1.6 - r); ctx.lineTo(sx - r, sy - z * 1.6 + r);
        ctx.stroke();
        break;
      }
      case 'kopniecie': {
        ctx.strokeStyle = `rgba(232,216,186,${0.5 * gasnie})`;
        ctx.lineWidth = 2 * gasnie + 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, z * (0.8 + p * 2.4), 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'zawal': {
        ctx.strokeStyle = `rgba(206,150,110,${0.5 * gasnie})`;
        ctx.lineWidth = 2.5 * gasnie + 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, z * (0.6 + p * 2.6), 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'zasiew': {
        ctx.strokeStyle = `rgba(232,196,130,${0.55 * gasnie})`;
        ctx.lineWidth = 1.8;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + czas * 0.0004;
          const r1 = z * 0.5, r2 = z * (1 + p * 1.6);
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
          ctx.lineTo(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2);
          ctx.stroke();
        }
        break;
      }
      case 'mysl': {
        const uniesienie = p * z * 1.6;
        ctx.strokeStyle = `rgba(240,224,180,${0.85 * gasnie})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let a = 0; a < 3.2; a += 0.14) {
          const r = z * 0.16 * a;
          const px = sx + Math.cos(a * 2.2) * r;
          const py = sy - z * 0.9 - uniesienie + Math.sin(a * 2.2) * r * 0.7;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        if (e.tekst) {
          ctx.font = `italic ${Math.max(14, z * 0.75)}px "Trzewia Tekst", Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(244,228,190,${0.9 * gasnie})`;
          ctx.fillText(e.tekst, sx, sy - z * 1.9 - uniesienie);
        }
        break;
      }
      case 'cud': {
        const r = z * (1 + p * 9);
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `rgba(255,220,150,${0.5 * gasnie})`);
        g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
        ctx.strokeStyle = `rgba(252,226,168,${0.7 * gasnie})`;
        ctx.lineWidth = 2.5 * gasnie;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(a) * r * 0.2, sy + Math.sin(a) * r * 0.2);
          ctx.lineTo(sx + Math.cos(a) * r * 0.75, sy + Math.sin(a) * r * 0.75);
          ctx.stroke();
        }
        break;
      }
      case 'objawienie': {
        // Cud sprowadza pobożny: światło spada z góry tuż przy nim (Alpha 1 — rysunek w objawienie() niżej)
        objawienie(ctx, sim ?? null, cam, e.x, e.y, sx, sy, z, p, czas);
        break;
      }
      case 'szept': {
        // szept do jednej postaci: nić światła schodzi z góry na głowę, nad głową zapala się znak i gaśnie
        const glowa = sy + z - z * 2.4;
        const zejscie = gladko(p / 0.2), a = 1 - gladko((p - 0.7) / 0.3);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gora = glowa - z * 7;
        const koniec = gora + (glowa - z * 0.6 - gora) * zejscie;
        // nić: złota kreska z ciemnym brzegiem — na jasnej ścianie sali samo światło ginęło
        ctx.globalCompositeOperation = 'source-over';
        const kx = sx + Math.sin(czas * 0.004) * z * 0.08;
        for (const [w, kol] of [[0.16, '60,34,12'], [0.07, '255,226,150']] as const) {
          const gn = ctx.createLinearGradient(0, gora, 0, koniec);
          gn.addColorStop(0, `rgba(${kol},0)`); gn.addColorStop(1, `rgba(${kol},${0.8 * a})`);
          ctx.strokeStyle = gn;
          ctx.lineWidth = Math.max(1, z * w);
          ctx.beginPath(); ctx.moveTo(sx, gora); ctx.lineTo(kx, koniec); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'lighter';
        if (zejscie > 0.95) {
          const zn = gladko((p - 0.18) / 0.12) * a, yz = glowa - z * 0.85;
          const R = z * 1.1;
          const gz = ctx.createRadialGradient(sx, yz, 0, sx, yz, R);
          gz.addColorStop(0, `rgba(255,228,160,${0.45 * zn})`); gz.addColorStop(1, 'rgba(255,220,150,0)');
          ctx.fillStyle = gz; ctx.fillRect(sx - R, yz - R, R * 2, R * 2);
          ctx.globalCompositeOperation = 'source-over';
          ctx.translate(sx, yz);
          const sk = z * 0.42;
          ctx.scale(sk, sk);
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(3, z * 0.2) / sk;
          ctx.strokeStyle = `rgba(48,28,12,${0.75 * zn})`;
          ctx.stroke(glif(37, 2));
          ctx.lineWidth = Math.max(1.4, z * 0.08) / sk;
          ctx.strokeStyle = `rgba(255,226,150,${0.95 * zn})`;
          ctx.stroke(glif(37, 2));
        }
        ctx.restore();
        if (e.tekst) {
          ctx.font = `italic ${Math.max(14, z * 0.75)}px "Trzewia Tekst", Georgia, serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(244,228,190,${0.9 * a})`;
          ctx.fillText(e.tekst, sx, glowa - z * 1.8);
        }
        break;
      }
      case 'skaza': {
        const r = z * (1 + p * 7);
        ctx.strokeStyle = `rgba(190,52,44,${0.6 * gasnie})`;
        ctx.lineWidth = 3 * gasnie + 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(150,28,24,${0.35 * gasnie})`;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }
  }
  ctx.restore();
}

/**
 * Objawienie (Cud, Alpha 1): kolejno — przyciemnienie wokół, iskry zbierają się nad głową pobożnego, aureola,
 * krąg glifów w powietrzu, słup światła spada z góry aż do stóp, błysk i fala po posadzce, krąg glifów na ziemi,
 * spadające pióra, smugi światła od pobliskich wiernych i pył na koniec. `p` — postęp 0..1.
 */
function objawienie(ctx: CanvasRenderingContext2D, sim: Sim | null, cam: Camera, wx: number, wy: number,
  sx: number, sy: number, z: number, p: number, czas: number): void {
  const ziarno = Math.round(wx * 131 + wy * 977), ruch = wolnoRuszac();
  const stopy = sy + z * 0.5, glowa = stopy - z * 2.1;
  const gora = Math.max(glowa - z * 9, Math.min(glowa - z * 3, z * 1.2));
  ctx.save();
  // ciemność wokół na samym początku
  const mrok = okno(p, 0, 0.1, 0.22, 0.4) * 0.45;
  if (mrok > 0.01) {
    const R = z * 16, g = ctx.createRadialGradient(sx, glowa, z * 1.5, sx, glowa, R);
    g.addColorStop(0, 'rgba(6,4,10,0)'); g.addColorStop(0.5, `rgba(6,4,10,${mrok * 0.6})`); g.addColorStop(1, `rgba(6,4,10,${mrok})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, cam.vw, cam.vh);
  }
  ctx.globalCompositeOperation = 'lighter';
  // iskry ściągają do głowy
  const iskry = okno(p, 0, 0.04, 0.2, 0.3);
  if (iskry > 0.01) {
    const c = { x: sx, y: glowa - z * 0.7 };
    for (let i = 0; i < 26; i++) {
      const start = los(ziarno + i) * 0.12, t = gladko((p - start) / 0.14);
      if (t <= 0 || t >= 1) continue;
      const kat = los(ziarno + i * 7) * Math.PI * 2 + t * 3.2, r = z * (4 + los(ziarno + i * 3) * 4) * (1 - t);
      const x = c.x + Math.cos(kat) * r, y = c.y + Math.sin(kat) * r * 0.7;
      ctx.fillStyle = `rgba(255,224,150,${0.9 * Math.sin(t * Math.PI) * iskry})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1, z * 0.07), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,210,120,${0.35 * Math.sin(t * Math.PI) * iskry})`; ctx.lineWidth = Math.max(0.8, z * 0.04);
      const k2 = kat - 0.35, r2 = r + z * 0.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(c.x + Math.cos(k2) * r2, c.y + Math.sin(k2) * r2 * 0.7); ctx.stroke();
    }
    const R = z * (0.6 + 0.4 * iskry), g = ctx.createRadialGradient(sx, glowa + z * 0.3, 0, sx, glowa + z * 0.3, R);
    g.addColorStop(0, `rgba(255,236,180,${0.55 * iskry})`); g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - R, glowa + z * 0.3 - R, R * 2, R * 2);
  }
  // aureola nad głową
  const aureola = okno(p, 0.02, 0.14, 0.82, 1);
  if (aureola > 0.01) {
    const y = glowa - z * 0.55;
    ctx.strokeStyle = `rgba(255,226,150,${0.85 * aureola})`; ctx.lineWidth = Math.max(1.2, z * 0.08);
    ctx.beginPath(); ctx.ellipse(sx, y, z * 0.5 * (0.6 + 0.4 * aureola), z * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
    const g = ctx.createRadialGradient(sx, y, 0, sx, y, z * 1.1);
    g.addColorStop(0, `rgba(255,236,180,${0.3 * aureola})`); g.addColorStop(1, 'rgba(255,236,180,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - z * 1.1, y - z * 1.1, z * 2.2, z * 2.2);
  }
  // krąg glifów w powietrzu, u szczytu słupa
  const krag = okno(p, 0.09, 0.18, 0.7, 0.92);
  if (krag > 0.01) {
    const R = z * (2.8 + 0.8 * gladko((p - 0.09) / 0.15)), obrot = (ruch ? czas * 6e-4 : 0) + p * 1.5, blysk = okno(p, 0.15, 0.19, 0.19, 0.3);
    ctx.save(); ctx.translate(sx, gora); ctx.scale(1, 0.32);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.4);
    g.addColorStop(0, `rgba(255,240,200,${(0.35 + 0.5 * blysk) * krag})`); g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g; ctx.fillRect(-R * 1.4, -R * 1.4, R * 2.8, R * 2.8);
    ctx.strokeStyle = `rgba(255,226,150,${0.9 * krag})`; ctx.lineWidth = Math.max(1.2, z * 0.08) / 0.32 * 0.4;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const t = obrot + (i / 12) * Math.PI * 2;
      ctx.save(); ctx.translate(Math.cos(t) * R * 0.89, Math.sin(t) * R * 0.89); ctx.rotate(t + Math.PI / 2);
      const s = z * 0.16;
      ctx.scale(s, (s / 0.32) * 0.5); ctx.lineWidth = 1.5 / s; ctx.strokeStyle = `rgba(255,236,190,${0.95 * krag})`;
      ctx.stroke(glif(ziarno + i, 1)); ctx.restore();
    }
    ctx.rotate(-obrot * 1.6); ctx.lineWidth = Math.max(1, z * 0.05) / 0.32 * 0.4;
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(t) * R * 0.2, Math.sin(t) * R * 0.2); ctx.lineTo(Math.cos(t) * R * 0.7, Math.sin(t) * R * 0.7); ctx.stroke();
    }
    ctx.restore();
  }
  // słup światła: spada z kręgu do stóp, potem gaśnie od góry
  const spada = gladko((p - 0.17) / 0.05), gasnie = gladko((p - 0.8) / 0.18);
  if (spada > 0 && gasnie < 1) {
    const drzenie = ruch ? 0.85 + 0.15 * Math.sin(czas * 0.012) : 1;
    const szer = z * (1.1 + 0.5 * okno(p, 0.2, 0.3, 0.55, 0.85)) * drzenie;
    const yGora = gora - z * 2 + (stopy - gora) * gasnie, yDol = gora + (stopy - gora) * spada, sila = 1 - gasnie * 0.4;
    const poswiata = ctx.createLinearGradient(sx - szer * 2.2, 0, sx + szer * 2.2, 0);
    poswiata.addColorStop(0, 'rgba(255,214,130,0)'); poswiata.addColorStop(0.5, `rgba(255,220,150,${0.3 * sila})`); poswiata.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = poswiata; ctx.fillRect(sx - szer * 2.2, yGora, szer * 4.4, yDol - yGora);
    const slup = ctx.createLinearGradient(sx - szer, 0, sx + szer, 0);
    slup.addColorStop(0, 'rgba(255,220,150,0)'); slup.addColorStop(0.5, `rgba(255,236,190,${0.55 * sila})`); slup.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = slup;
    // na postaci słup przygasa — nie zalewa jej bielą
    const nadGlowa = Math.min(yDol, glowa - z * 0.9);
    if (nadGlowa > yGora) ctx.fillRect(sx - szer, yGora, szer * 2, nadGlowa - yGora);
    if (yDol > nadGlowa) { ctx.globalAlpha = 0.45; ctx.fillRect(sx - szer, nadGlowa, szer * 2, yDol - nadGlowa); ctx.globalAlpha = 1; }
    const rdzen = szer * 0.28, gr = ctx.createLinearGradient(sx - rdzen, 0, sx + rdzen, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,250,${0.85 * sila})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    if (nadGlowa > yGora) ctx.fillRect(sx - rdzen, yGora, rdzen * 2, nadGlowa - yGora);
    if (yDol > nadGlowa) { ctx.globalAlpha = 0.25; ctx.fillRect(sx - rdzen, nadGlowa, rdzen * 2, yDol - nadGlowa); ctx.globalAlpha = 1; }
    // smugi rylcem w słupie
    ctx.lineWidth = Math.max(0.8, z * 0.04);
    for (let i = -5; i <= 5; i++) {
      const x = sx + (i / 5.5) * szer * 0.9 + (ruch ? Math.sin(czas * 3e-3 + i) * z * 0.05 : 0);
      ctx.strokeStyle = `rgba(255,246,214,${(0.3 - Math.abs(i) * 0.04) * sila})`;
      ctx.beginPath(); ctx.moveTo(x, yGora); ctx.lineTo(x, yDol); ctx.stroke();
    }
    // czoło spadającego słupa
    if (spada < 1) {
      const g = ctx.createRadialGradient(sx, yDol, 0, sx, yDol, szer * 1.8);
      g.addColorStop(0, 'rgba(255,255,240,0.95)'); g.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - szer * 1.8, yDol - szer * 1.8, szer * 3.6, szer * 3.6);
    }
    // pył wznosi się w słupie
    if (spada >= 1) for (let i = 0; i < 22; i++) {
      const t = (p * 2.2 + los(ziarno + i * 5)) % 1;
      const x = sx + (los(ziarno + i * 11) - 0.5) * szer * 1.4 + (ruch ? Math.sin(i * 2.3 + czas * 2e-3) * szer * 0.15 : 0);
      const y = stopy - t * (stopy - yGora);
      ctx.fillStyle = `rgba(255,250,226,${0.85 * sila * Math.sin(t * Math.PI)})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, z * (0.03 + 0.04 * los(ziarno + i))), 0, Math.PI * 2); ctx.fill();
    }
  }
  // uderzenie o posadzkę: błysk, fale, promienie i odpryski
  const uderzenie = (p - 0.21) / 0.2;
  if (uderzenie > 0 && uderzenie < 1) {
    const blysk = Math.max(0, 1 - uderzenie * 3.5);
    if (blysk > 0) { ctx.fillStyle = `rgba(255,244,214,${0.28 * blysk})`; ctx.fillRect(0, 0, cam.vw, cam.vh); }
    for (const [op, sila] of [[0, 1], [0.12, 0.6]]) {
      const t = (uderzenie - op) / (1 - op);
      if (t <= 0) continue;
      const r = z * (1 + t * 11);
      ctx.strokeStyle = `rgba(255,232,170,${0.8 * sila * (1 - t)})`; ctx.lineWidth = Math.max(1, z * 0.18 * (1 - t));
      ctx.beginPath(); ctx.ellipse(sx, stopy, r, r * 0.2, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const promienie = gladko(uderzenie / 0.4) * (1 - gladko((uderzenie - 0.5) / 0.5));
    ctx.lineWidth = Math.max(1, z * 0.07);
    for (let i = 0; i < 16; i++) {
      const kat = Math.PI + ((i + 0.5) / 16) * Math.PI, dl = z * (3 + 5 * los(ziarno + i * 13)) * gladko(uderzenie / 0.5);
      ctx.strokeStyle = `rgba(255,240,200,${0.55 * promienie})`;
      ctx.beginPath(); ctx.moveTo(sx + Math.cos(kat) * z * 0.8, stopy + Math.sin(kat) * z * 0.25); ctx.lineTo(sx + Math.cos(kat) * dl, stopy + Math.sin(kat) * dl * 0.55); ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const kat = -Math.PI * (0.08 + 0.84 * los(ziarno + i * 17)), v = z * (4 + 6 * los(ziarno + i * 19)), t = uderzenie;
      const x = sx + Math.cos(kat) * v * t, y = stopy + Math.sin(kat) * v * t + z * 6 * t * t;
      ctx.fillStyle = `rgba(255,${210 + (i * 7) % 40},140,${(1 - t) * 0.95})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1, z * 0.08 * (1 - t * 0.5)), 0, Math.PI * 2); ctx.fill();
    }
  }
  // krąg glifów na posadzce
  const naZiemi = okno(p, 0.2, 0.3, 0.78, 0.98);
  if (naZiemi > 0.01) {
    const R = z * 2.6, obrot = (ruch ? -czas * 9e-4 : 0) - p * 2;
    ctx.save(); ctx.translate(sx, stopy); ctx.scale(1, 0.22);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.3);
    g.addColorStop(0, `rgba(255,232,170,${0.45 * naZiemi})`); g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g; ctx.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6);
    ctx.strokeStyle = `rgba(255,226,150,${0.8 * naZiemi})`; ctx.lineWidth = Math.max(1, z * 0.07) / 0.22 * 0.3;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([R * 0.08, R * 0.05]); ctx.lineDashOffset = obrot * R;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 10; i++) {
      const t = obrot + (i / 10) * Math.PI * 2;
      ctx.save(); ctx.translate(Math.cos(t) * R * 0.91, Math.sin(t) * R * 0.91);
      const s = z * 0.13;
      ctx.scale(s, (s / 0.22) * 0.35); ctx.lineWidth = 1.4 / s; ctx.strokeStyle = `rgba(255,236,190,${0.9 * naZiemi})`;
      ctx.stroke(glif(ziarno + 40 + i, 0)); ctx.restore();
    }
    ctx.restore();
  }
  // pióra spadają z góry
  const piora = okno(p, 0.24, 0.34, 0.85, 1);
  if (piora > 0.01) for (let i = 0; i < 9; i++) {
    const start = 0.24 + los(ziarno + i * 23) * 0.35, t = (p - start) / 0.5;
    if (t <= 0 || t >= 1) continue;
    const x = sx + (los(ziarno + i * 29) - 0.5) * z * 6 + Math.sin(t * 9 + i) * z * 0.6;
    const y = glowa - z * 6 + t * (stopy - glowa + z * 6), kat = Math.sin(t * 9 + i) * 0.7;
    ctx.save(); ctx.translate(x, y); ctx.rotate(kat);
    const d = z * 0.5, a = piora * Math.sin(t * Math.PI);
    ctx.fillStyle = `rgba(255,240,200,${0.9 * a})`;
    ctx.beginPath(); ctx.moveTo(0, -d); ctx.quadraticCurveTo(d * 0.4, -d * 0.2, 0, d); ctx.quadraticCurveTo(-d * 0.4, -d * 0.2, 0, -d); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * a})`; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(0, -d); ctx.lineTo(0, d); ctx.stroke();
    ctx.restore();
  }
  // smugi światła od pobliskich wiernych do pobożnego
  const wierni = okno(p, 0.26, 0.36, 0.7, 0.88);
  if (sim && wierni > 0.01) {
    let ile = 0;
    for (const c of sim.creatures) {
      if (c.dead || !rolaPostaci(c) || ile > 10 || Math.hypot(c.x - wx, c.y - wy) > MOCE.znakZasieg || Math.abs(c.x - wx) < 0.6) continue;
      ile++;
      const x = cam.toScreenX(c.x), y = cam.toScreenY(c.y + 1) - z * 2.2, kx = (x + sx) / 2, ky = Math.min(y, glowa) - z * 2.5;
      ctx.strokeStyle = `rgba(255,220,140,${0.35 * wierni})`; ctx.lineWidth = Math.max(0.8, z * 0.04);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(kx, ky, sx, glowa - z * 1.5); ctx.stroke();
      const t = ((p - 0.26) * 3 + c.id * 0.137) % 1;
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * kx + t * t * sx;
      const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * ky + t * t * (glowa - z * 1.5);
      ctx.fillStyle = `rgba(255,244,210,${0.9 * wierni})`;
      ctx.beginPath(); ctx.arc(px, py, Math.max(1, z * 0.07), 0, Math.PI * 2); ctx.fill();
      const k = z * 0.22 * wierni;
      ctx.strokeStyle = `rgba(255,236,180,${0.9 * wierni})`; ctx.lineWidth = Math.max(1, z * 0.05);
      ctx.beginPath(); ctx.moveTo(x - k, y); ctx.lineTo(x + k, y); ctx.moveTo(x, y - k * 1.4); ctx.lineTo(x, y + k); ctx.stroke();
    }
  }
  // na koniec pył opada
  const pyl = okno(p, 0.78, 0.86, 0.9, 1);
  if (pyl > 0.01) for (let i = 0; i < 18; i++) {
    const t = (p - 0.78) / 0.22, x = sx + (los(ziarno + i * 31) - 0.5) * z * 5, y = stopy - z * (3 + 3 * los(ziarno + i * 37)) * (1 - t);
    ctx.fillStyle = `rgba(255,226,160,${0.7 * pyl})`;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, z * 0.05), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
