import { BARWA, rgba } from '../../render/palette';
import { kreskuj, pseudo, type Plotno } from './common';

/**
 * Rycina celu gry, prowadzona rytmem narracji:
 * takt 0 — w głębi bije rdzeń zamknięty w kamiennej skorupie,
 * takt 1 — u góry nacja się modli, a jej wiara spływa w dół,
 * takt 2 — warta schodzi pod skorupę, kamień pęka kafel po kaflu,
 * takt 3 — skorupa otwarta, wierny klęka przy rdzeniu i wszystko zalewa światło.
 */
export function rysujCel({ ctx, w, h, t, takt, taktP }: Plotno): void {
  const etap = takt + taktP;
  const cx = w / 2, cy = h * 0.72;
  const R = Math.min(h * 0.2, w * 0.12);
  ctx.save();

  // skała: cały przekrój kreskowany, ciemniejszy w głębi
  const skala = new Path2D();
  skala.rect(0, 0, w, h);
  ctx.fillStyle = '#100c0a';
  ctx.fill(skala);
  kreskuj(ctx, skala, 0.66, 6, rgba(BARWA.atrament, 0.08), 1);

  // gniazdo u góry
  const gx = w * 0.26, gy = h * 0.16;
  const gniazdo = new Path2D();
  gniazdo.ellipse(gx, gy, w * 0.13, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0706';
  ctx.fill(gniazdo);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
  ctx.lineWidth = 1.2;
  ctx.stroke(gniazdo);
  const modli = Math.min(1, Math.max(0, etap - 1));
  for (let i = 0; i < 7; i++) {
    const x = gx - w * 0.08 + i * w * 0.027, y = gy + h * 0.035;
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.85);
    ctx.beginPath(); ctx.arc(x, y - 6, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 2, y - 3, 4, 6);
    // wiara: jasne nitki w górę, gdy się modlą
    if (modli > 0) {
      ctx.strokeStyle = `rgba(250,216,150,${0.5 * modli * (0.5 + 0.5 * Math.sin(t * 0.004 + i))})`;
      ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + Math.sin(t * 0.002 + i) * 3, y - 22); ctx.stroke();
    }
  }

  // droga w dół: kropki od gniazda pod skorupę
  const zejscie = Math.min(1, Math.max(0, etap - 1.5));
  if (zejscie > 0) {
    const pkt: [number, number][] = [[gx + w * 0.06, gy + h * 0.07], [w * 0.36, h * 0.3], [w * 0.33, h * 0.42], [w * 0.44, h * 0.46], [cx, cy - R * 1.9]];
    ctx.setLineDash([3, 6]);
    ctx.lineDashOffset = -t * 0.02;
    ctx.strokeStyle = `rgba(250,196,110,${0.8 * zejscie})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    pkt.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // skorupa: pierścień ciosanych bloków; pęknięcia wypadają od góry
  const pekniete = Math.max(0, Math.min(5, Math.floor((etap - 2) * 5)));
  const otwarta = etap >= 3;
  const bloki = 20;
  for (let i = 0; i < bloki; i++) {
    const a0 = (i / bloki) * Math.PI * 2 - Math.PI / 2 - Math.PI / bloki;
    const a1 = a0 + (Math.PI * 2) / bloki - 0.04;
    // bloki na samej górze wypadają jeden po drugim, gdy warta się modli
    const odGory = Math.min(i, bloki - i);
    if (odGory === 0 && pekniete >= 1) continue;
    if (odGory === 1 && pekniete >= 3 && (i === 1 || pekniete >= 5)) continue;
    const blok = new Path2D();
    blok.arc(cx, cy, R * 1.55, a0, a1);
    blok.arc(cx, cy, R * 1.12, a1, a0, true);
    blok.closePath();
    ctx.fillStyle = 'rgba(58,46,40,0.97)';
    ctx.fill(blok);
    kreskuj(ctx, blok, 0.9, 3.5, rgba(BARWA.atrament, 0.22), 1);
    ctx.strokeStyle = 'rgba(214,176,128,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke(blok);
  }
  // rysy biegnące przez skorupę, zanim pęknie
  if (etap > 1.8 && !otwarta) {
    ctx.strokeStyle = `rgba(255,206,130,${0.4 + 0.4 * Math.sin(t * 0.006)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 0.35;
      ctx.moveTo(cx + Math.cos(a) * R * 1.55, cy + Math.sin(a) * R * 1.55);
      ctx.lineTo(cx + Math.cos(a + 0.05) * R * 1.35, cy + Math.sin(a + 0.05) * R * 1.35 + pseudo(k) * 3);
      ctx.lineTo(cx + Math.cos(a - 0.03) * R * 1.15, cy + Math.sin(a - 0.03) * R * 1.15);
    }
    ctx.stroke();
  }

  // warta nad skorupą
  if (etap > 1.9) {
    for (let i = 0; i < 3; i++) {
      const x = cx + (i - 1) * R * 0.5, y = cy - R * 1.72;
      ctx.fillStyle = rgba(BARWA.atramentMocny, 0.9);
      ctx.beginPath(); ctx.arc(x, y - 7, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 2.5, y - 4, 5, 7);
    }
  }

  // rdzeń: serce z kamienia z podwójnym uderzeniem
  const f = (t % 1600) / 1600;
  const uderz = Math.max(0, 1 - Math.abs(f - 0.08) * 14) + 0.7 * Math.max(0, 1 - Math.abs(f - 0.26) * 14);
  const swiatlo = otwarta ? Math.min(1, (etap - 3) * 1.6) : 0;
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (2.2 + swiatlo * 4));
  halo.addColorStop(0, `rgba(255,140,90,${0.55 + 0.2 * uderz + swiatlo * 0.3})`);
  halo.addColorStop(1, 'rgba(160,30,30,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  const r = R * 0.72 * (1 + 0.06 * uderz);
  const kanty = new Path2D();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rr = r * (i % 2 ? 0.92 : 1);
    if (i === 0) kanty.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    else kanty.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  kanty.closePath();
  const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.05, cx, cy, r);
  g.addColorStop(0, swiatlo > 0 ? '#fff4d8' : '#ffd2a6');
  g.addColorStop(0.35, swiatlo > 0 ? '#f2a04a' : '#e2553c');
  g.addColorStop(0.8, '#7a1618');
  g.addColorStop(1, '#2a0808');
  ctx.fillStyle = g;
  ctx.fill(kanty);
  ctx.strokeStyle = 'rgba(255,220,180,0.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke(kanty);

  // klęczący przy rdzeniu i promienie uwolnienia
  if (swiatlo > 0) {
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.95);
    const kx = cx, ky = cy - r * 1.25;
    ctx.beginPath(); ctx.arc(kx, ky - 5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(kx - 3, ky - 2, 6, 5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,220,160,${0.35 * swiatlo})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + t * 0.0002;
      ctx.moveTo(cx + Math.cos(a) * R * 1.7, cy + Math.sin(a) * R * 1.7);
      ctx.lineTo(cx + Math.cos(a) * R * (2.6 + swiatlo * 2), cy + Math.sin(a) * R * (2.6 + swiatlo * 2));
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}
