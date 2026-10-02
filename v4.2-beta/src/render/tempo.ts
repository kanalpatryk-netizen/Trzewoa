import type { Plate } from './plate';
import { SERIF } from './ink';

export type StanCzasu = 'stoi' | 'zwalnia' | 'plynie';

/** Gdzie leży klepsydra — to także przycisk pauzy (dotknięcie ją przewraca). */
export function miejsceKlepsydry(p: Plate): { x: number; y: number; r: number; s: number } {
  const s = Math.max(15, Math.min(22, p.w * 0.017));
  // wąski ekran nie ma marginesu nad płytą — klepsydra wchodzi do środka, w róg
  const x = p.waski ? p.x + p.w - s * 1.5 : p.x + p.w - s * 1.6;
  const y = p.waski ? p.y + s * 1.6 : p.y - Math.max(s * 1.35, p.top * 0.3);
  return { x, y, r: Math.max(24, s * 1.4), s };
}

/**
 * Klepsydra przy krawędzi płyty: widać, czy czas stoi, sączy się, czy leci,
 * i ile razy szybciej. Bez tego gracz nie wiedział, czemu świat nagle zamarł.
 */
export function rysujTempo(
  ctx: CanvasRenderingContext2D, p: Plate, stan: StanCzasu, mnoznik: number, teraz: number,
): void {
  const { x, y, s } = miejsceKlepsydry(p);
  const zywa = stan === 'plynie' ? 1 : stan === 'zwalnia' ? 0.45 : 0;
  const puls = stan === 'stoi' ? 0.55 + 0.2 * Math.sin(teraz * 0.0024) : 0.9;

  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `rgba(226,210,180,${puls})`;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();                               // klepsydra: dwa trójkąty i ramki
  ctx.moveTo(-s * 0.42, -s * 0.5); ctx.lineTo(s * 0.42, -s * 0.5);
  ctx.lineTo(-s * 0.42, s * 0.5); ctx.lineTo(s * 0.42, s * 0.5);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, -s * 0.56); ctx.lineTo(s * 0.5, -s * 0.56);
  ctx.moveTo(-s * 0.5, s * 0.56); ctx.lineTo(s * 0.5, s * 0.56);
  ctx.stroke();

  if (zywa > 0) {                                // sypiący się piasek
    const faza = (teraz * 0.004 * zywa) % 1;
    ctx.fillStyle = `rgba(240,222,186,${0.5 + 0.4 * zywa})`;
    ctx.fillRect(-0.8, -s * 0.2 + faza * s * 0.6, 1.6, s * 0.22);
  }

  ctx.textAlign = 'right';
  ctx.font = `italic ${s * 0.82}px ${SERIF}`;
  ctx.fillStyle = `rgba(216,200,172,${stan === 'stoi' ? puls : 0.8})`;
  const podpis = stan === 'stoi' ? 'czas stoi' : stan === 'zwalnia' ? 'czas sączy się' : `×${mnoznik}`;
  ctx.fillText(podpis, -s * 0.8, s * 0.36);
  ctx.restore();
}
