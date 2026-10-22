import type { Camera } from './camera';
import { glif } from './tajemnica';
import { kropla } from './kruszce';

export type RodzajEfektu = 'kopniecie' | 'zasiew' | 'mysl' | 'cud' | 'skaza' | 'zawal' | 'smierc' | 'objawienie' | 'szept';

const gladko = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

export interface Efekt { x: number; y: number; rodzaj: RodzajEfektu; t: number; max: number; tekst?: string; }

/**
 * Krótkie znaki nad światem: każde użycie czasownika musi zostawić ślad, który widać
 * od razu. Bez tego gracz nie wie, czy jego dotknięcie w ogóle coś zrobiło.
 */
export function rysujEfekty(ctx: CanvasRenderingContext2D, efekty: Efekt[], cam: Camera, czas: number): void {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  ctx.save();
  for (const e of efekty) {
    const p = e.t / e.max;
    if (p > 1) continue;
    const sx = (e.x - left) * z, sy = (e.y - top) * z;
    if (sx < -120 || sy < -120 || sx > cam.vw + 120 || sy > cam.vh + 120) continue;
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
        // Cud gracza: słup światła z góry aż do ziemi, w nim rytowane smugi i pył, który się wznosi; u stóp słupa
        // plama światła i promienie po posadzce. Narasta szybko, gaśnie powoli.
        const a = gladko(p / 0.1) * (1 - gladko((p - 0.65) / 0.35));
        if (a <= 0.01) break;
        const dol = sy + z * 0.5, szer = z * (1.3 + 0.5 * gladko(p / 0.2));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gs = ctx.createLinearGradient(sx - szer, 0, sx + szer, 0);
        gs.addColorStop(0, 'rgba(255,230,170,0)');
        gs.addColorStop(0.5, `rgba(255,238,190,${0.42 * a})`);
        gs.addColorStop(1, 'rgba(255,230,170,0)');
        ctx.fillStyle = gs;
        ctx.fillRect(sx - szer, -cam.vh, szer * 2, dol + cam.vh);
        // smugi rylcem w słupie — światło na rycinie to kreski, nie mgiełka
        ctx.lineWidth = Math.max(1, z * 0.05);
        for (let i = -4; i <= 4; i++) {
          const x = sx + (i / 4.5) * szer * 0.8;
          ctx.strokeStyle = `rgba(255,246,214,${(0.32 - Math.abs(i) * 0.05) * a})`;
          ctx.beginPath(); ctx.moveTo(x, Math.max(0, dol - z * 14)); ctx.lineTo(x, dol); ctx.stroke();
        }
        // plama i promienie u stóp słupa
        const R = z * (2.2 + 2.6 * gladko(p / 0.3));
        const gp = ctx.createRadialGradient(sx, dol, 0, sx, dol, R);
        gp.addColorStop(0, `rgba(255,232,170,${0.5 * a})`); gp.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = gp; ctx.fillRect(sx - R, dol - R, R * 2, R * 2);
        ctx.strokeStyle = `rgba(255,236,190,${0.5 * a})`;
        ctx.lineWidth = Math.max(1, z * 0.06);
        for (let i = 0; i < 10; i++) {
          const kat = Math.PI + (i + 0.5) / 10 * Math.PI, dl = R * (0.55 + 0.35 * ((i * 7) % 3) / 2);
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(kat) * szer * 0.6, dol + Math.sin(kat) * z * 0.2);
          ctx.lineTo(sx + Math.cos(kat) * dl, dol + Math.sin(kat) * dl * 0.35);
          ctx.stroke();
        }
        // pył wznoszący się w słupie
        for (let i = 0; i < 16; i++) {
          const f = (p * 1.6 + i / 16) % 1;
          const x = sx + Math.sin(i * 2.3 + czas * 0.002) * szer * 0.55, y = dol - f * z * 9;
          ctx.fillStyle = `rgba(255,248,222,${0.8 * a * Math.sin(f * Math.PI)})`;
          ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, z * 0.05), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
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
