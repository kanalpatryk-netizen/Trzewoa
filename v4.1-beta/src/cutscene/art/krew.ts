import { BARWA, rgba } from '../../render/palette';
import { kreskuj, sylwetka, blask, pseudo, type Plotno } from './common';

/** Skażenie: zmieniasz krew gatunku. Zmiana idzie w dół pokoleń i nie wraca. */
export function rysujKrew({ ctx, w, h, t, p, takt, taktP }: Plotno): void {
  const etap = takt + taktP;
  void p;
  const cx = w / 2, cy = h / 2;
  const s = Math.min(w * 0.26, h * 0.4);

  ctx.save();
  // rodowód: jedno stworzenie u góry, coraz więcej niżej
  const rzedy = 4;
  for (let r = 0; r < rzedy; r++) {
    const ile = r + 1;
    const skazenie = Math.max(0, Math.min(1, (etap - 1.2) * 0.9 - r * 0.3));
    for (let i = 0; i < ile; i++) {
      const x = cx + (i - (ile - 1) / 2) * s * 0.55;
      const y = cy - s * 0.75 + r * s * 0.5;
      ctx.save();
      if (skazenie > 0) blask(ctx, x, y - s * 0.12, s * 0.22 * skazenie, BARWA.krew, 0.35 * skazenie);
      sylwetka(ctx, x, y, s * 0.3 * (1 + skazenie * 0.25), 'goblin', 1);
      ctx.restore();
      if (r > 0) {
        ctx.strokeStyle = rgba(BARWA.krew, 0.25 + 0.5 * skazenie);
        ctx.lineWidth = 1 + skazenie * 2;
        ctx.beginPath();
        ctx.moveTo(cx + (Math.floor(i / 2) - (r - 1) / 2) * s * 0.55, y - s * 0.5 + s * 0.02);
        ctx.lineTo(x, y - s * 0.32);
        ctx.stroke();
      }
    }
  }

  // kropla, która zmienia wszystko poniżej
  const kropla = new Path2D();
  const spadanie = Math.max(0, Math.min(1, etap - 0.7));
  const ky = cy - s * 1.15 + spadanie * s * 0.35;
  kropla.moveTo(cx, ky - s * 0.12);
  kropla.quadraticCurveTo(cx + s * 0.07, ky, cx, ky + s * 0.08);
  kropla.quadraticCurveTo(cx - s * 0.07, ky, cx, ky - s * 0.12);
  ctx.fillStyle = rgba(BARWA.krew, 0.85);
  ctx.fill(kropla);
  kreskuj(ctx, kropla, 1.1, 3, rgba(BARWA.krewJasna, 0.8), 1);
  blask(ctx, cx, ky, s * 0.18, BARWA.krew, 0.3);
  void t; void pseudo;
  ctx.restore();
}
