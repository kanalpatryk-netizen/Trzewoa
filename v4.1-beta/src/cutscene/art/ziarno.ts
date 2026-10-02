import { BARWA, rgba } from '../../render/palette';
import { kreskuj, kropkuj, sylwetka, pseudo, blask, type Plotno } from './common';

/** Zasiew: rzucasz w skałę rudę i grzyb, a oni przychodzą po to jak po swoje. */
export function rysujZiarno({ ctx, w, h, t, p }: Plotno): void {
  const cx = w / 2, cy = h * 0.58;
  const s = Math.min(w * 0.3, h * 0.44);

  const jaskinia = new Path2D();
  jaskinia.moveTo(cx - s * 1.5, cy + s * 0.55);
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    jaskinia.lineTo(cx - s * 1.5 + u * s * 3, cy - Math.sin(u * Math.PI) * s * 0.7 + pseudo(i * 2.3) * s * 0.06);
  }
  jaskinia.lineTo(cx + s * 1.5, cy + s * 0.55);
  jaskinia.closePath();

  ctx.save();
  ctx.fillStyle = rgba('#0f0a09', 0.96);
  ctx.fill(jaskinia);
  kreskuj(ctx, jaskinia, 1.15, 6, rgba(BARWA.atrament, 0.44), 1);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6);
  ctx.lineWidth = 1.4;
  ctx.stroke(jaskinia);

  // grzybnia rośnie od dołu w rytm postępu sceny
  const pas = new Path2D();
  pas.rect(cx - s * 1.4, cy + s * 0.15, s * 2.8, s * 0.42 * Math.min(1, p * 1.5));
  kropkuj(ctx, pas, 900, rgba(BARWA.biolumina, 0.55), 3);
  for (let i = 0; i < 14; i++) {
    const x = cx - s * 1.3 + (i / 13) * s * 2.6;
    const wys = s * (0.05 + pseudo(i * 6.1) * 0.09) * Math.min(1, p * 1.7);
    ctx.strokeStyle = rgba(BARWA.biolumina, 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, cy + s * 0.5);
    ctx.lineTo(x, cy + s * 0.5 - wys);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, cy + s * 0.5 - wys, wys * 0.45, wys * 0.3, 0, Math.PI, 0);
    ctx.fillStyle = rgba(BARWA.biolumina, 0.35);
    ctx.fill();
    ctx.stroke();
    blask(ctx, x, cy + s * 0.5 - wys, wys * 1.6, BARWA.biolumina, 0.06);
  }

  // żyła rudy w stropie
  const ruda = new Path2D();
  ruda.moveTo(cx - s * 0.9, cy - s * 0.45);
  ruda.quadraticCurveTo(cx, cy - s * 0.62, cx + s * 0.95, cy - s * 0.38);
  ctx.strokeStyle = rgba(BARWA.zarBlady, 0.75 * Math.min(1, p * 2));
  ctx.lineWidth = s * 0.035;
  ctx.setLineDash([s * 0.05, s * 0.035]);
  ctx.stroke(ruda);
  ctx.setLineDash([]);

  const idacy = Math.min(3, Math.floor(p * 4));
  for (let i = 0; i < idacy; i++) {
    const x = cx - s * 0.8 + i * s * 0.55 + Math.sin(t * 0.002 + i) * 3;
    sylwetka(ctx, x, cy + s * 0.5, s * 0.2, 'goblin', 0.95);
  }
  ctx.restore();
}
