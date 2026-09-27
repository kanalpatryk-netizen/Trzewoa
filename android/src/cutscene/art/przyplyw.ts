import { BARWA, rgba } from '../../render/palette';
import { kreskuj, sylwetka, pseudo, blask, type Plotno } from './common';

/** Przypływ: coś wchodzi z zewnątrz i tasuje planszę, zanim gracz się znudzi. */
export function rysujPrzyplyw({ ctx, w, h, t, p }: Plotno): void {
  const s = Math.min(w * 0.3, h * 0.5);
  const cx = w / 2;
  const powierzchnia = h * 0.3;

  ctx.save();
  const gora = new Path2D();
  gora.moveTo(0, powierzchnia);
  for (let i = 0; i <= 20; i++) gora.lineTo((i / 20) * w, powierzchnia + Math.sin(i * 1.3) * 6 + pseudo(i) * 5);
  gora.lineTo(w, h);
  gora.lineTo(0, h);
  gora.closePath();
  ctx.fillStyle = rgba('#100b0a', 0.95);
  ctx.fill(gora);
  kreskuj(ctx, gora, 0.62, 6, rgba(BARWA.atrament, 0.32), 1);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6);
  ctx.lineWidth = 1.4;
  ctx.stroke(gora);

  // woda wlewa się szczeliną
  const struga = new Path2D();
  struga.moveTo(cx - s * 0.12, powierzchnia);
  struga.lineTo(cx + s * 0.12, powierzchnia);
  struga.lineTo(cx + s * 0.3, powierzchnia + s * 1.2 * Math.min(1, p * 1.5));
  struga.lineTo(cx - s * 0.3, powierzchnia + s * 1.2 * Math.min(1, p * 1.5));
  struga.closePath();
  ctx.fillStyle = rgba('#31424d', 0.55);
  ctx.fill(struga);
  kreskuj(ctx, struga, 0.05, 4, rgba(BARWA.papier, 0.5), 1);

  // ludzie schodzą z powierzchni po sławę
  const ile = Math.floor(p * 4);
  for (let i = 0; i < ile; i++) {
    const x = cx - s * 0.9 + i * s * 0.45;
    const y = powierzchnia + s * (0.3 + i * 0.28);
    sylwetka(ctx, x, y, s * 0.3, 'kowal', 0.95);
    blask(ctx, x + s * 0.12, y - s * 0.2, s * 0.22, BARWA.zar, 0.3);
  }
  void t;
  ctx.restore();
}
