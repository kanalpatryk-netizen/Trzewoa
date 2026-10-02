import { BARWA, rgba } from '../../render/palette';
import { kreskuj, obrysPostep, sylwetka, pseudo, type Plotno } from './common';

/**
 * Rysunek, który powstaje i rozpada się na oczach:
 * takt 0 — czysty papier, takt 1 — ktoś przechodzi i tkanka się domalowuje,
 * takt 2 — dziury zapominania zjadają obraz, takt 3 — zostaje sam papier.
 */
export function rysujPamiec({ ctx, w, h, t, takt, taktP }: Plotno): void {
  const cx = w / 2, cy = h * 0.52;
  const r = Math.min(w * 0.22, h * 0.42);
  const etap = takt + taktP;

  ctx.save();
  // papier — zawsze pod spodem, bo Otchłań jest stanem domyślnym
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.85, r * 1.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(BARWA.papier, 0.94);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,104,84,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // kontur tkanki rysuje się w takcie 1
  const punkty: [number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30;
    punkty.push([cx - r * 1.45 + u * r * 2.9, cy + r * 0.72 - Math.sin(u * 3.4) * r * 0.75 - pseudo(i) * r * 0.1]);
  }
  const tkanka = new Path2D();
  tkanka.moveTo(punkty[0][0], punkty[0][1]);
  for (const [x, y] of punkty) tkanka.lineTo(x, y);
  tkanka.lineTo(cx + r * 1.45, cy + r * 0.85);
  tkanka.lineTo(cx - r * 1.45, cy + r * 0.85);
  tkanka.closePath();

  const rysowanie = Math.max(0, Math.min(1, etap * 1.1));
  if (rysowanie > 0.15) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (rysowanie - 0.15) * 1.6);
    ctx.fillStyle = rgba('#141010', 0.93);
    ctx.fill(tkanka);
    kreskuj(ctx, tkanka, 0.6, 5, rgba(BARWA.atrament, 0.55), 1);
    kreskuj(ctx, tkanka, -0.8, 11, rgba(BARWA.atrament, 0.26), 1);
    ctx.restore();
  }
  obrysPostep(ctx, punkty, rgba(BARWA.atramentMocny, 0.85), 1.5, Math.min(1, rysowanie * 1.4));

  // ten, który pamięta: idzie po tkance, a za nim rysunek jest świeży
  if (etap > 0.6 && etap < 2.6) {
    const marsz = ((t * 0.00016) % 1);
    const mx = cx - r * 1.2 + marsz * r * 2.4;
    const my = cy + r * 0.72 - Math.sin(((mx - (cx - r * 1.45)) / (r * 2.9)) * 3.4) * r * 0.75;
    sylwetka(ctx, mx, my, r * 0.2, 'goblin', 0.9);
    const g = ctx.createRadialGradient(mx, my - r * 0.1, 0, mx, my - r * 0.1, r * 0.4);
    g.addColorStop(0, rgba(BARWA.atramentMocny, 0.1));
    g.addColorStop(1, rgba(BARWA.atramentMocny, 0));
    ctx.fillStyle = g;
    ctx.fillRect(mx - r * 0.4, my - r * 0.5, r * 0.8, r * 0.8);
  }

  // --- takt 2 i 3: zapominanie zjada rysunek
  const zapominanie = Math.max(0, etap - 1.7);
  for (let i = 0; i < 9; i++) {
    const faza = Math.max(0, Math.min(1, zapominanie * 1.1 - i * 0.09));
    if (faza <= 0) continue;
    const x = cx + (pseudo(i * 4.1) - 0.5) * r * 2.4;
    const y = cy + (pseudo(i * 8.7) - 0.5) * r * 0.95;
    const rr = r * (0.1 + pseudo(i * 2.2) * 0.16) * faza * (0.94 + 0.06 * Math.sin(t * 0.0009 + i));
    ctx.beginPath();
    for (let k = 0; k <= 22; k++) {
      const a = (k / 22) * Math.PI * 2;
      const wr = rr * (0.68 + pseudo(i * 3 + k) * 0.6);
      const px = x + Math.cos(a) * wr, py = y + Math.sin(a) * wr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(BARWA.papier, 0.97);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,130,113,0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // strzępy kreski unoszące się znad dziur — rysunek dosłownie się sypie
  if (zapominanie > 0.2) {
    for (let i = 0; i < 12; i++) {
      const faza = ((t * 0.0003 + i * 0.17) % 1);
      const x = cx + (pseudo(i * 7.7) - 0.5) * r * 2.2;
      const y = cy + r * 0.4 - faza * r * 0.9;
      ctx.strokeStyle = rgba(BARWA.atrament, 0.25 * (1 - faza) * Math.min(1, zapominanie));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + r * 0.06, y - r * 0.03);
      ctx.stroke();
    }
  }
  ctx.restore();
}
