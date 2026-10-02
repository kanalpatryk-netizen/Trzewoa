import { BARWA, rgba } from '../../render/palette';
import { sylwetka, blask, type Plotno } from './common';

/** Szept: jedna myśl wchodzi w jedną głowę i zmienia wszystko, co po niej idzie. */
export function rysujSzept({ ctx, w, h, t, p, takt, taktP }: Plotno): void {
  const etap = takt + taktP;
  const cx = w / 2, cy = h * 0.6;
  const s = Math.min(w * 0.34, h * 0.62);

  ctx.save();
  // spirala szeptu wchodzi z ciemności
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.75);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const zwoje = 5.5 * Math.min(1, (etap + 0.2) * 0.8);
  void p;
  for (let a = 0; a < zwoje * Math.PI * 2; a += 0.08) {
    const r = s * 0.42 * (1 - a / (zwoje * Math.PI * 2)) + 2;
    const x = cx - s * 0.05 + Math.cos(a + t * 0.0004) * r;
    const y = cy - s * 0.42 + Math.sin(a + t * 0.0004) * r * 0.75;
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  blask(ctx, cx - s * 0.05, cy - s * 0.42, s * 0.2, BARWA.zarBlady, 0.12 * p);

  // ten, który słucha — i nie wie, że słucha
  sylwetka(ctx, cx, cy, s * 0.5, 'goblin', 1);

  // to, co usłyszał, rozchodzi się na innych
  const ile = Math.floor(Math.max(0, etap - 1.4) * 2.2);
  for (let i = 0; i < ile; i++) {
    const x = cx + (i % 2 === 0 ? -1 : 1) * s * (0.38 + i * 0.14);
    sylwetka(ctx, x, cy + s * 0.04, s * 0.3, 'goblin', 0.35 + 0.1 * i);
    // myśl idzie widocznie: kropka biegnie od pierwszego do kolejnych
    ctx.strokeStyle = rgba(BARWA.atrament, 0.25);
    ctx.setLineDash([3, 5]);
    ctx.lineDashOffset = -t * 0.01;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.2);
    ctx.lineTo(x, cy - s * 0.16);
    ctx.stroke();
    ctx.setLineDash([]);
    const bieg = ((t * 0.0005 + i * 0.25) % 1);
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.6 * (1 - bieg));
    ctx.beginPath();
    ctx.arc(cx + (x - cx) * bieg, cy - s * 0.2 + (cy - s * 0.16 - (cy - s * 0.2)) * bieg, Math.max(1.2, s * 0.02), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
