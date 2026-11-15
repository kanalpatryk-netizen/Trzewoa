import { BARWA, rgba } from '../../render/palette';
import { kreskuj, sylwetka, blask, pseudo, type Plotno } from './common';

/** Znak: jawny cud. Widzą go wszyscy i wszyscy zapamiętują, kto go zrobił. */
export function rysujZnak({ ctx, w, h, t, p, takt, taktP }: Plotno): void {
  const etap = takt + taktP;
  const cx = w / 2, cy = h * 0.46;
  const s = Math.min(w * 0.3, h * 0.45);

  ctx.save();
  const sciana = new Path2D();
  sciana.rect(cx - s * 1.6, cy - s * 0.9, s * 3.2, s * 1.9);
  ctx.fillStyle = rgba('#0f0b0a', 0.96);
  ctx.fill(sciana);
  kreskuj(ctx, sciana, 0.6, 6, rgba(BARWA.atrament, 0.4), 1);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke(sciana);

  // rozbłysk w chwili, w której narracja mówi o cudzie
  const odBlysku = Math.max(0, etap - 1);
  const blysk = odBlysku < 0.35 ? 1 - odBlysku / 0.35 : 0;
  const moc = Math.min(1, Math.max(p * 0.6, odBlysku * 1.6)) * (1 + blysk * 1.6);
  blask(ctx, cx, cy, s * (0.7 + 0.15 * Math.sin(t * 0.003)), BARWA.zar, 0.3 * moc);

  // promienie rytego znaku
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9 * moc);
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.0002;
    const r1 = s * 0.14, r2 = s * (0.3 + pseudo(i) * 0.22) * moc;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = rgba(BARWA.zar, 0.5 * moc);
  ctx.fill();
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9);
  ctx.stroke();

  // klęczący: to nie strach, to rachunek — bóg właśnie pokazał, że jest
  for (let i = 0; i < 6; i++) {
    const x = cx - s * 1.1 + i * s * 0.44;
    const y = cy + s * 0.78;
    const uklon = Math.max(0, Math.min(1, (etap - 1.2) * 1.6 - i * 0.12));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(i * 1.7) * 0.1 - 0.5 * uklon);
    sylwetka(ctx, 0, 0, s * 0.26, i === 3 ? 'kowal' : 'goblin', 0.95);
    ctx.restore();
  }
  ctx.restore();
}
