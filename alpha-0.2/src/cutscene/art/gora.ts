import { BARWA, rgba } from '../../render/palette';
import { kreskuj, obrysPostep, obrys, blask, sylwetka, pseudo, type Plotno } from './common';

/**
 * Rycina otwierająca, prowadzona rytmem narracji:
 * takt 0 — kontur góry rysuje się na oczach,
 * takt 1 — otwierają się komory i korytarze,
 * takt 2 — pojawiają się mieszkańcy, a ich myśli płyną do rdzenia,
 * takt 3 — rdzeń bije pełną mocą i rozchodzą się promienie.
 */
export function rysujGore({ ctx, w, h, t, takt, taktP }: Plotno): void {
  const cx = w / 2, dol = h * 0.97;
  const szer = Math.min(w * 0.3, h * 0.92);
  const etap = takt + taktP;

  const punkty: [number, number][] = [[cx - szer * 1.55, dol]];
  const bryla = new Path2D();
  bryla.moveTo(cx - szer * 1.55, dol);
  for (let i = 0; i <= 34; i++) {
    const u = i / 34;
    const x = cx - szer * 1.55 + u * szer * 3.1;
    const profil = Math.sin(u * Math.PI) ** 0.75;
    const y = dol - profil * szer * 1.22 - pseudo(i * 3.7) * szer * 0.07;
    bryla.lineTo(x, y);
    punkty.push([x, y]);
  }
  bryla.lineTo(cx + szer * 1.55, dol);
  bryla.closePath();
  punkty.push([cx + szer * 1.55, dol]);

  ctx.save();

  // --- takt 0: sama kreska konturu, potem wypełnienie
  const konturP = Math.min(1, etap * 1.6);
  const wypelnienie = Math.max(0, Math.min(1, etap * 1.2 - 0.25));
  if (wypelnienie > 0) {
    ctx.save();
    ctx.globalAlpha = wypelnienie;
    ctx.fillStyle = rgba('#120c0b', 0.97);
    ctx.fill(bryla);
    kreskuj(ctx, bryla, 0.62, 5, rgba(BARWA.atrament, 0.55), 1);
    kreskuj(ctx, bryla, -0.85, 9, rgba(BARWA.atrament, 0.3), 1);
    kreskuj(ctx, bryla, 1.45, 17, rgba(BARWA.atrament, 0.16), 1);
    ctx.restore();
  }
  if (konturP < 1) obrysPostep(ctx, punkty, rgba(BARWA.atramentMocny, 0.95), 1.8, konturP);
  else obrys(ctx, punkty, rgba(BARWA.atramentMocny, 0.95), 1.8);

  ctx.save();
  ctx.clip(bryla);

  const komory: [number, number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const kx = cx + (pseudo(i * 5.1) - 0.5) * szer * 2.2;
    const ky = dol - szer * (0.12 + pseudo(i * 2.7) * 0.95);
    const kr = szer * (0.055 + pseudo(i * 9.3) * 0.085);
    komory.push([kx, ky, kr]);
  }

  // --- takt 1: korytarze rosną, komory otwierają się po kolei
  const otwarte = Math.max(0, (etap - 0.9)) * komory.length * 1.4;
  ctx.strokeStyle = rgba(BARWA.atrament, 0.35);
  ctx.lineWidth = Math.max(1, szer * 0.012);
  for (let i = 1; i < komory.length; i++) {
    const widok = Math.max(0, Math.min(1, otwarte - i + 1));
    if (widok <= 0) continue;
    const [ax, ay] = komory[i - 1];
    const [bx, by] = komory[i];
    const mx = (ax + bx) / 2 + (pseudo(i) - 0.5) * szer * 0.4, my = (ay + by) / 2;
    ctx.globalAlpha = widok;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx, my, ax + (bx - ax) * widok, ay + (by - ay) * widok);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (let i = 0; i < komory.length; i++) {
    const widok = Math.max(0, Math.min(1, otwarte - i));
    if (widok <= 0) continue;
    const [kx, ky, kr] = komory[i];
    const oddech = 1 + 0.02 * Math.sin(t * 0.0012 + i);
    const komora = new Path2D();
    komora.ellipse(kx, ky, kr * 1.6 * widok * oddech, kr * widok * oddech, pseudo(i) * 2, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#080606', 0.96);
    ctx.fill(komora);
    kreskuj(ctx, komora, 1.1, 8, rgba(BARWA.atrament, 0.22), 1);
    ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.5 * widok);
    ctx.lineWidth = 1.2;
    ctx.stroke(komora);

    // --- takt 2: mieszkańcy i ich myśli
    if (etap > 1.9 && widok > 0.8) {
      const ludzie = Math.max(0, Math.min(1, (etap - 1.9) * 2.5));
      const ilu = i % 3 === 0 ? 2 : 1;
      for (let k = 0; k < ilu; k++) {
        const chwianie = Math.sin(t * 0.0025 + i * 2 + k) * kr * 0.08;
        sylwetka(ctx, kx + (k - (ilu - 1) / 2) * kr * 0.9 + chwianie, ky + kr * 0.75,
          Math.max(6, kr * 0.62), i % 4 === 1 ? 'kowal' : 'goblin', 0.8 * ludzie);
      }
      // myśl płynąca do rdzenia — to jest dosłownie twój pokarm
      if (etap > 2.1) {
        const faza = ((t * 0.0004 + i * 0.37) % 1);
        const rx = dol - szer * 0.2;
        const px = kx + (cx - kx) * faza;
        const py = ky + (rx - ky) * faza;
        ctx.fillStyle = rgba(BARWA.atramentMocny, 0.5 * (1 - faza) * ludzie);
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, szer * 0.008), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // komora rdzenia
  if (etap > 0.8) {
    const ryK = dol - szer * 0.2;
    const jama = new Path2D();
    jama.ellipse(cx, ryK, szer * 0.34, szer * 0.26, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#0a0605', 0.96);
    ctx.fill(jama);
    kreskuj(ctx, jama, 0.4, 7, rgba(BARWA.krew, 0.3), 1);
    ctx.strokeStyle = rgba(BARWA.krewJasna, 0.55);
    ctx.lineWidth = 1.3;
    ctx.stroke(jama);
  }

  // żyła rudy
  if (etap > 1.4) {
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.4);
    ctx.lineWidth = Math.max(1, szer * 0.016);
    ctx.setLineDash([szer * 0.04, szer * 0.03]);
    ctx.lineDashOffset = -t * 0.004;
    ctx.beginPath();
    ctx.moveTo(cx - szer * 1.2, dol - szer * 0.55);
    ctx.quadraticCurveTo(cx, dol - szer * 0.85, cx + szer * 1.1, dol - szer * 0.45);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  // --- rdzeń: ledwie tli się na początku, bije pełną mocą w ostatnim takcie
  const moc = Math.max(0.15, Math.min(1, (etap - 0.6) / 2.2));
  const puls = 0.55 + 0.45 * Math.sin(t * 0.0016);
  const ry = dol - szer * 0.2;
  blask(ctx, cx, ry, szer * (0.5 + puls * 0.3) * (0.6 + moc), BARWA.krew, 0.34 * moc);
  const rdzen = new Path2D();
  rdzen.ellipse(cx, ry, szer * 0.12 * (0.8 + moc * 0.2), szer * 0.095 * (0.8 + moc * 0.2), 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(BARWA.krew, (0.4 + puls * 0.3) * moc + 0.15);
  ctx.fill(rdzen);
  kreskuj(ctx, rdzen, 1.2, 3, rgba(BARWA.krewJasna, 0.8 * moc), 1);
  ctx.strokeStyle = rgba(BARWA.krewJasna, 0.7 * moc);
  ctx.lineWidth = 1.2;
  ctx.stroke(rdzen);

  if (etap > 2.8) {
    const promienie = Math.min(1, (etap - 2.8) * 2);
    ctx.strokeStyle = rgba(BARWA.krew, 0.3 * promienie);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.00012;
      const r1 = szer * 0.17, r2 = szer * (0.24 + puls * 0.1) * (0.6 + promienie * 0.8);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, ry + Math.sin(a) * r1 * 0.85);
      ctx.lineTo(cx + Math.cos(a) * r2, ry + Math.sin(a) * r2 * 0.85);
      ctx.stroke();
    }
  }
  ctx.restore();
}
