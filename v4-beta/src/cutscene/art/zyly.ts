import { BARWA, rgba } from '../../render/palette';
import { kreskuj, obrys, sylwetka, pseudo, type Plotno } from './common';

/** Korytarze jako żyły: ktoś drąży w tobie i to jest twój układ krwionośny. */
export function rysujZyly({ ctx, w, h, t, p }: Plotno): void {
  const cx = w / 2, cy = h / 2;
  const skala = Math.min(w * 0.3, h * 0.46);

  const skala2 = new Path2D();
  skala2.rect(cx - skala * 1.6, cy - skala, skala * 3.2, skala * 2);
  ctx.save();
  ctx.fillStyle = rgba('#100b0a', 0.95);
  ctx.fill(skala2);
  kreskuj(ctx, skala2, 0.62, 6, rgba(BARWA.atrament, 0.42), 1);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
  ctx.lineWidth = 1.2;
  ctx.stroke(skala2);

  // żyły rosną z postępem sceny — rysunek powstaje na oczach
  const galezie = 5;
  for (let g = 0; g < galezie; g++) {
    const kat = -Math.PI / 2 + (g - (galezie - 1) / 2) * 0.55;
    let x = cx, y = cy + skala * 0.8;
    const punkty: [number, number][] = [[x, y]];
    const dlugosc = Math.round(14 * Math.min(1, p * 1.4));
    for (let i = 0; i < dlugosc; i++) {
      const rozchwianie = (pseudo(g * 12.1 + i * 3.3) - 0.5) * 0.8;
      x += Math.cos(kat + rozchwianie) * skala * 0.11;
      y += Math.sin(kat + rozchwianie) * skala * 0.11;
      punkty.push([x, y]);
    }
    const zyla = new Path2D();
    zyla.moveTo(punkty[0][0], punkty[0][1]);
    for (const [px, py] of punkty) zyla.lineTo(px, py);
    ctx.save();
    ctx.strokeStyle = rgba('#070505', 1);
    ctx.lineWidth = skala * 0.055;
    ctx.lineCap = 'round';
    ctx.stroke(zyla);
    ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.5);
    ctx.lineWidth = 1.2;
    ctx.stroke(zyla);
    ctx.restore();
    obrys(ctx, punkty.map(([px, py]) => [px, py - skala * 0.03] as [number, number]), rgba(BARWA.atrament, 0.3), 1);
  }

  // kilofy przy końcach — to nie erozja, to czyjaś praca
  for (let g = 0; g < 3; g++) {
    const faza = (t * 0.0012 + g) % 1;
    const x = cx + (g - 1) * skala * 0.5;
    const y = cy - skala * 0.2 + Math.sin(faza * Math.PI * 2) * 2;
    sylwetka(ctx, x, y, skala * 0.17, g === 1 ? 'kowal' : 'goblin', 0.9 * p);
  }
  ctx.restore();
}
