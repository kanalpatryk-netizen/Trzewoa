import { BARWA, rgba } from '../../render/palette';
import { kreskuj, pseudo, type Plotno } from './common';

/** Spis ras jako warstwy skały: gdy jedna zjada wstęgę, zamyka ci się oko. */
export function rysujSpis({ ctx, w, h, t, p, takt, taktP }: Plotno): void {
  const etap = takt + taktP;
  const cx = w / 2, cy = h / 2;
  const sw = Math.min(w * 0.72, 720), sh = Math.min(h * 0.2, 130);

  ctx.save();
  // wstęga warstw — jedna rośnie kosztem reszty w rytm postępu sceny
  // jedna warstwa zjada wstęgę w rytm zdań, a nie po prostu z czasem
  const zjadanie = Math.max(0, Math.min(1, (etap - 0.8) / 2.2));
  const udzialy = [0.28 + zjadanie * 0.6, 0.26 * (1 - zjadanie * 0.85),
                   0.24 * (1 - zjadanie * 0.9), 0.22 * (1 - zjadanie * 0.8)];
  void p;
  const suma = udzialy.reduce((a, b) => a + b, 0);
  let x = cx - sw / 2;
  const katy = [0.4, 1.1, -0.5, 1.7];
  for (let i = 0; i < udzialy.length; i++) {
    const szer = (udzialy[i] / suma) * sw;
    if (szer < 1) continue;
    const warstwa = new Path2D();
    warstwa.moveTo(x, cy - sh / 2 + pseudo(i) * 6);
    for (let k = 0; k <= 10; k++) warstwa.lineTo(x + (k / 10) * szer, cy - sh / 2 + Math.sin(k * 1.7 + i) * 4);
    warstwa.lineTo(x + szer, cy + sh / 2);
    for (let k = 10; k >= 0; k--) warstwa.lineTo(x + (k / 10) * szer, cy + sh / 2 + Math.sin(k * 2.1 + i) * 4);
    warstwa.closePath();
    ctx.fillStyle = rgba('#100b0a', 0.9);
    ctx.fill(warstwa);
    kreskuj(ctx, warstwa, katy[i], 5, rgba(i === 0 ? BARWA.biolumina : BARWA.atrament, 0.75), 1);
    ctx.strokeStyle = rgba(BARWA.atrament, 0.4);
    ctx.lineWidth = 1;
    ctx.stroke(warstwa);
    x += szer;
  }

  // powieka: im większa monokultura, tym mniej widzisz
  const zamkniecie = Math.max(0, Math.min(1, (etap - 2) / 1.6)) * 0.45;
  for (const gora of [true, false]) {
    const g = ctx.createLinearGradient(0, gora ? 0 : h, 0, gora ? h * zamkniecie : h - h * zamkniecie);
    g.addColorStop(0, rgba('#070504', 0.97));
    g.addColorStop(1, rgba('#070504', 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, gora ? 0 : h - h * zamkniecie, w, h * zamkniecie);
  }
  ctx.fillStyle = rgba(BARWA.atramentCichy, 0.5 + 0.2 * Math.sin(t * 0.001));
  ctx.restore();
}
