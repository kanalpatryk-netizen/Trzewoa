import { BARWA, rgba } from '../../render/palette';
import { sylwetka, kreskuj, type Plotno } from './common';

/** Sześć sposobów istnienia w jednym szeregu — każdy inny, żaden nie „lepszy". */
export function rysujRasy({ ctx, w, h, t, takt, taktP }: Plotno): void {
  const etap = takt + taktP;
  const s = Math.min(w * 0.062, h * 0.26);
  const typy: Array<'goblin' | 'kowal' | 'trol' | 'przadka'> = ['goblin', 'kowal', 'trol', 'przadka'];
  const nazwy = ['Ślepy Lud', 'Żużlowcy', 'Trole', 'Prządki', 'Ludzie', 'Grzybnia'];
  const ile = nazwy.length;
  const rozstaw = Math.min((w * 0.82) / ile, s * 2.6);
  const x0 = w / 2 - (rozstaw * (ile - 1)) / 2;
  const podloga = h * 0.62;

  ctx.save();
  const grunt = new Path2D();
  grunt.rect(0, podloga, w, Math.max(h - podloga, s * 1.1));
  ctx.fillStyle = rgba('#100b0a', 0.92);
  ctx.fill(grunt);
  kreskuj(ctx, grunt, 0.6, 6, rgba(BARWA.atrament, 0.35), 1);

  for (let i = 0; i < ile; i++) {
    const x = x0 + i * rozstaw;
    // kolejne rasy wchodzą w kadr w takt narracji, nie na raz
    const widoczny = Math.min(1, Math.max(0, (etap / 4) * ile - i));
    if (widoczny <= 0) continue;
    ctx.save();
    ctx.globalAlpha = widoczny;
    if (i < 4) {
      // każda rasa porusza się inaczej: Ślepy Lud faluje, Żużlowcy skaczą co pół kroku,
      // Trole ledwie drgają, Prządki stoją i nagle się przesuwają
      const chod = i === 0 ? Math.sin(t * 0.004 + i) * s * 0.05
        : i === 1 ? (Math.round(Math.sin(t * 0.002) * 2) / 2) * s * 0.05
        : i === 2 ? Math.sin(t * 0.0008) * s * 0.02
        : (Math.floor(t / 900) % 2) * s * 0.06;
      const wejscieX = (1 - widoczny) * -s * 1.5;
      sylwetka(ctx, x + chod + wejscieX, podloga, s * (i === 2 ? 1.05 : 0.8), typy[i], 1);
    } else if (i === 4) {
      sylwetka(ctx, x + (1 - widoczny) * -s * 1.5, podloga, s * 0.95, 'kowal', 1);
      ctx.fillStyle = rgba(BARWA.zar, 0.6 + 0.3 * Math.sin(t * 0.008));
      ctx.beginPath();
      ctx.arc(x + s * 0.3 + (1 - widoczny) * -s * 1.5, podloga - s * 0.62, s * 0.12 * (0.9 + 0.2 * Math.sin(t * 0.01)), 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grzyb = new Path2D();
      for (let k = 0; k < 9; k++) {
        const gx = x - s * 0.4 + (k / 8) * s * 0.8;
        const gy = podloga - s * (0.12 + 0.28 * Math.abs(Math.sin(k * 1.7))) * (0.6 + 0.4 * Math.min(1, widoczny * 1.5 + Math.sin(t * 0.0006 + k) * 0.1));
        grzyb.moveTo(gx, podloga);
        grzyb.lineTo(gx, gy);
        grzyb.ellipse(gx, gy, s * 0.09, s * 0.06, 0, 0, Math.PI * 2);
      }
      ctx.strokeStyle = rgba(BARWA.biolumina, 0.85);
      ctx.lineWidth = 1.4;
      ctx.stroke(grzyb);
    }
    ctx.restore();
    ctx.fillStyle = rgba(BARWA.atrament, 0.9 * widoczny);
    ctx.font = `${Math.max(11, s * 0.3)}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(nazwy[i], x, podloga + s * 0.62);
  }
  ctx.restore();
}
