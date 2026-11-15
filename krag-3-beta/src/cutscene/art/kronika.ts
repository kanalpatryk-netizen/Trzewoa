import { BARWA, rgba } from '../../render/palette';
import { kreskuj, pseudo, type Plotno } from './common';

/** Kronika: zapis tego, czym byłeś dla tych, którzy w tobie mieszkali. */
export function rysujKronike({ ctx, w, h, t, p }: Plotno): void {
  const cx = w / 2, cy = h / 2;
  const kw = Math.min(w * 0.52, 520), kh = Math.min(h * 0.62, 420);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.02 + Math.sin(t * 0.0004) * 0.004);

  const karta = new Path2D();
  karta.moveTo(-kw / 2, -kh / 2);
  for (let i = 0; i <= 12; i++) karta.lineTo(-kw / 2 + (i / 12) * kw, -kh / 2 + Math.sin(i * 1.9) * 3);
  karta.lineTo(kw / 2, kh / 2);
  for (let i = 12; i >= 0; i--) karta.lineTo(-kw / 2 + (i / 12) * kw, kh / 2 + Math.sin(i * 2.3) * 3);
  karta.closePath();
  ctx.fillStyle = rgba(BARWA.papier, 0.95);
  ctx.fill(karta);
  ctx.strokeStyle = rgba('#2a211c', 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke(karta);
  kreskuj(ctx, karta, -0.7, 26, rgba('#7a6b58', 0.18), 1);

  // linijki tekstu pojawiają się jedna po drugiej
  const linie = 13;
  ctx.strokeStyle = rgba('#241c18', 0.62);
  ctx.lineWidth = 1.3;
  for (let i = 0; i < linie; i++) {
    const widoczna = Math.max(0, Math.min(1, p * linie - i));
    if (widoczna <= 0) continue;
    const y = -kh / 2 + kh * 0.14 + i * (kh * 0.062);
    const dl = (kw * 0.72) * (0.55 + pseudo(i * 3.7) * 0.45) * widoczna;
    ctx.beginPath();
    ctx.moveTo(-kw * 0.33, y);
    ctx.lineTo(-kw * 0.33 + dl, y);
    ctx.stroke();
  }
  ctx.restore();
}
