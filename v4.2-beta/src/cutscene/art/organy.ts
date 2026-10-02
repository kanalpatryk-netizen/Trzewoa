import { BARWA, rgba } from '../../render/palette';
import { kreskuj, blask, pseudo, sylwetka, type Plotno } from './common';

/**
 * Trzy zasoby pokazywane po kolei, w rytm narracji: najpierw komora z modlącymi się,
 * potem dym pod stropem, potem krew w szczelinie, na końcu biała dziura Otchłani.
 */
export function rysujOrgany({ ctx, w, h, t, takt, taktP }: Plotno): void {
  const cx = w / 2 + Math.min(w * 0.08, h * 0.2);      // komora po prawej, papier po lewej
  const s = Math.min(w * 0.2, h * 0.42);
  const etap = takt + taktP;
  const podloga = h * 0.7;

  ctx.save();

  // --- komora: zawsze widoczna, żeby scena nigdy nie była czarna
  const komora = new Path2D();
  komora.moveTo(cx - s * 1.2, podloga);
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    komora.lineTo(cx - s * 1.2 + u * s * 2.4, podloga - s * (0.5 + 0.32 * Math.sin(u * 3.1)) - pseudo(i) * s * 0.05);
  }
  komora.lineTo(cx + s * 1.2, podloga);
  komora.closePath();
  ctx.fillStyle = rgba('#120c0b', 0.95);
  ctx.fill(komora);
  kreskuj(ctx, komora, 0.62, 6, rgba(BARWA.atrament, 0.4), 1);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6);
  ctx.lineWidth = 1.4;
  ctx.stroke(komora);

  // podłoga i ołtarz
  ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
  ctx.beginPath();
  ctx.moveTo(cx - s * 1.2, podloga);
  ctx.lineTo(cx + s * 1.2, podloga);
  ctx.stroke();
  const oltarz = new Path2D();
  oltarz.rect(cx - s * 0.13, podloga - s * 0.22, s * 0.26, s * 0.22);
  ctx.fillStyle = rgba('#191110', 0.95);
  ctx.fill(oltarz);
  kreskuj(ctx, oltarz, 1.4, 4, rgba(BARWA.zarBlady, 0.6), 1);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.7);
  ctx.stroke(oltarz);

  // modlący się — od nich wszystko się zaczyna
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * s * 0.36;
    const drg = Math.sin(t * 0.002 + i) * s * 0.012;
    sylwetka(ctx, x, podloga + drg, s * 0.24, i === 2 ? 'kowal' : 'goblin', 0.95);
  }

  // --- takt 1: WIARA jako dym pod stropem
  const wiara = Math.max(0, Math.min(1, etap - 0.6));
  if (wiara > 0) {
    for (let i = 0; i < 9; i++) {
      const faza = ((t * 0.00025 + i * 0.13) % 1);
      const x = cx + (i - 4) * s * 0.26 + Math.sin(t * 0.0009 + i) * s * 0.05;
      const y = podloga - s * 0.3 - faza * s * 0.55;
      const r = s * (0.06 + faza * 0.16);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(BARWA.papier, 0.16 * wiara * (1 - faza)));
      g.addColorStop(1, rgba(BARWA.papier, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.8 * wiara);
    ctx.font = `${Math.max(11, s * 0.13)}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText('WIARA', cx, podloga - s * 0.95);
  }

  // --- takt 2: KREW w szczelinie pod podłogą
  const krew = Math.max(0, Math.min(1, etap - 1.6));
  if (krew > 0) {
    const kx0 = cx + s * 0.2, kx1 = cx + s * 1.15;
    const szczelina = new Path2D();
    szczelina.moveTo(kx0, h);
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const taper = Math.sin(u * Math.PI) ** 0.7;
      szczelina.lineTo(kx0 + u * (kx1 - kx0), h - (h - podloga) * 0.92 * taper * (0.5 + 0.5 * Math.abs(Math.sin(u * 8.3))));
    }
    szczelina.lineTo(kx1, h);
    szczelina.closePath();
    ctx.save();
    ctx.clip(szczelina);
    const poziom = (h - podloga) * 0.85 * krew;
    const gk = ctx.createLinearGradient(0, h - poziom, 0, h);
    gk.addColorStop(0, rgba(BARWA.krew, 0.9));
    gk.addColorStop(1, rgba('#2a0607', 0.95));
    ctx.fillStyle = gk;
    ctx.fillRect(kx0 - 10, h - poziom, kx1 - kx0 + 20, poziom + 10);
    ctx.restore();
    ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
    ctx.lineWidth = 1.1;
    ctx.stroke(szczelina);
    ctx.fillStyle = rgba(BARWA.krewJasna, 0.9 * krew);
    ctx.fillText('KREW', (kx0 + kx1) / 2, h - (h - podloga) * 0.18);
  }

  // --- takt 3: OTCHŁAŃ jako dziura w rysunku
  const otchlan = Math.max(0, Math.min(1, etap - 2.6));
  if (otchlan > 0) {
    const ox = cx - s * 2.1, oy = podloga - s * 0.38;
    const orr = s * 0.55 * otchlan;
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const wr = orr * (0.72 + pseudo(k * 2.7) * 0.55) * (1 + 0.02 * Math.sin(t * 0.0012 + k));
      const px = ox + Math.cos(a) * wr, py = oy + Math.sin(a) * wr * 0.82;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(BARWA.papier, 0.97);
    ctx.fill();
    blask(ctx, ox, oy, orr * 1.8, BARWA.otchlan, 0.05);
    ctx.fillStyle = rgba('#3a332c', 0.92);
    ctx.font = `${Math.max(11, s * 0.13)}px serif`;
    ctx.fillText('OTCHŁAŃ', ox, oy + orr * 0.12);
  }
  ctx.restore();
}
