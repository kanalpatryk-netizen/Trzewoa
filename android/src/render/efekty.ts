import type { Camera } from './camera';

export type RodzajEfektu = 'kopniecie' | 'zasiew' | 'mysl' | 'cud' | 'skaza' | 'zawal' | 'smierc';

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
        // krzyżyk rytownika w miejscu, gdzie ktoś przestał być: znika po chwili,
        // ale wystarcza, żeby gracz zauważył, że kogoś stracił
        const r = z * (0.32 + p * 0.5);
        ctx.strokeStyle = `rgba(226,120,96,${0.85 * gasnie})`;
        ctx.lineWidth = Math.max(1, z * 0.09);
        ctx.beginPath();
        ctx.moveTo(sx - r, sy - r); ctx.lineTo(sx + r, sy + r);
        ctx.moveTo(sx + r, sy - r); ctx.lineTo(sx - r, sy + r);
        ctx.stroke();
        ctx.strokeStyle = `rgba(226,120,96,${0.3 * gasnie})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.9, 0, Math.PI * 2);
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
        ctx.strokeStyle = `rgba(150,200,120,${0.55 * gasnie})`;
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
