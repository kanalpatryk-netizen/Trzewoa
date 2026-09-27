import type { Creature } from '../sim/creatures';
import { SERIF } from './ink';

/**
 * Trzy stany, które decydują o wszystkim: głód, oddanie, szaleństwo.
 * Rysowane jako wypełniające się znaki — kropla, płomień, spirala — bo karta
 * ma być kartą z bestiariusza, a nie tabelką z liczbami.
 */
export function rysujStany(ctx: CanvasRenderingContext2D, c: Creature, x: number, y: number, s: number, odstep = s * 2.1): void {
  const pola: { etykieta: string; v: number; barwa: [number, number, number]; ksztalt: 'kropla' | 'plomien' | 'spirala' }[] = [
    { etykieta: 'głód', v: Math.min(1, c.hunger), barwa: [214, 120, 96], ksztalt: 'kropla' },
    { etykieta: 'wiara', v: Math.min(1, c.devotion), barwa: [238, 214, 160], ksztalt: 'plomien' },
    { etykieta: 'obłęd', v: Math.min(1, c.mad), barwa: [190, 170, 220], ksztalt: 'spirala' },
  ];

  for (let i = 0; i < pola.length; i++) {
    const p = pola[i];
    const cx = x + i * odstep;
    ctx.save();
    ctx.translate(cx, y);
    const sciezka = () => {
      ctx.beginPath();
      if (p.ksztalt === 'kropla') {
        ctx.moveTo(0, -s * 0.62);
        ctx.bezierCurveTo(s * 0.52, 0, s * 0.42, s * 0.6, 0, s * 0.6);
        ctx.bezierCurveTo(-s * 0.42, s * 0.6, -s * 0.52, 0, 0, -s * 0.62);
      } else if (p.ksztalt === 'plomien') {
        ctx.moveTo(0, s * 0.6);
        ctx.bezierCurveTo(-s * 0.5, s * 0.2, -s * 0.2, -s * 0.2, 0, -s * 0.66);
        ctx.bezierCurveTo(s * 0.26, -s * 0.16, s * 0.5, s * 0.2, 0, s * 0.6);
      } else {
        for (let a = 0; a < 7.4; a += 0.16) {
          const r = s * 0.09 * a;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      }
    };

    if (p.ksztalt !== 'spirala') {          // znak napełnia się od dołu
      ctx.save();
      sciezka(); ctx.clip();
      ctx.fillStyle = `rgba(${p.barwa[0]},${p.barwa[1]},${p.barwa[2]},0.55)`;
      ctx.fillRect(-s, s * 0.6 - s * 1.25 * p.v, s * 2, s * 1.4);
      ctx.restore();
    } else {
      ctx.strokeStyle = `rgba(${p.barwa[0]},${p.barwa[1]},${p.barwa[2]},${0.2 + p.v * 0.75})`;
      ctx.lineWidth = 0.9 + p.v * 1.4;
      sciezka(); ctx.stroke();
    }
    ctx.strokeStyle = `rgba(226,212,186,${p.ksztalt === 'spirala' ? 0.3 : 0.75})`;
    ctx.lineWidth = 1.1;
    if (p.ksztalt !== 'spirala') { sciezka(); ctx.stroke(); }

    ctx.textAlign = 'center';
    ctx.font = `italic ${Math.max(12, s * 0.62)}px ${SERIF}`;
    ctx.fillStyle = 'rgba(200,188,166,0.78)';
    ctx.fillText(p.etykieta, 0, s * 1.5);
    ctx.restore();
  }
}
