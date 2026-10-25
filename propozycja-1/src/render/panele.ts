/**
 * Panele interfejsu (propozycje Pawła, 25.10: „wgl potrzeba o wiele więcej tła”) — tła pod zasobami, mocami,
 * medalionami postaci, kroniką i przyciskami. Wszystko rysowane w kodzie jako placeholder: grafik podmieni je
 * na właściwe obrazy, a rozmieszczenie zostanie. Barwy i grubości w jednym miejscu, niżej.
 *
 *  - kamień: ciemna tablica z ciosanego kamienia w podwójnej złotej obwódce, z nitami w rogach;
 *  - płótno: szorstka tkanina (wątek i osnowa), obszyta ściegiem — pod medalionami postaci (dopisek Pawła „płutno”);
 *  - księga: otwarta księga, dwie karty i grzbiet — pod kroniką (dopisek „książka”);
 *  - przegródki: osobna wnęka na każdy przycisk w panelu (rysunek Pawła: prostokąt z przegródkami).
 */

const ZLOTO = (a: number) => `rgba(204,160,92,${a})`;

/** Ścieżka prostokąta z zaokrąglonymi rogami. */
function zaokraglony(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Tani skrót liczby — stałe ziarno faktury (rysunek nie sięga po los gry). */
function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Kamienna tablica w złotej obwódce — tło zasobów, mocy, dłoni oddania i panelu przycisków. */
export function panelKamien(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 7): void {
  ctx.save();
  // cień pod tablicą
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  zaokraglony(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(46,37,31,0.94)'); g.addColorStop(1, 'rgba(22,17,14,0.94)');
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  // ziarno kamienia: kilka jaśniejszych i ciemniejszych plamek
  ctx.save(); ctx.clip();
  for (let i = 0; i < Math.min(60, (w * h) / 220); i++) {
    const px = x + los(i * 3 + Math.round(x)) * w, py = y + los(i * 7 + Math.round(y)) * h;
    ctx.fillStyle = los(i) > 0.5 ? 'rgba(120,104,86,0.08)' : 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.arc(px, py, 1 + los(i * 11) * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // fazowanie: jasna krawędź u góry
  ctx.strokeStyle = 'rgba(255,236,200,0.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + r, y + 1.5); ctx.lineTo(x + w - r, y + 1.5); ctx.stroke();
  // podwójna obwódka: złota na zewnątrz, ciemna wewnątrz
  zaokraglony(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.strokeStyle = ZLOTO(0.7); ctx.lineWidth = 1.4; ctx.stroke();
  zaokraglony(ctx, x + 3.5, y + 3.5, w - 7, h - 7, Math.max(2, r - 3));
  ctx.strokeStyle = 'rgba(96,70,40,0.75)'; ctx.lineWidth = 1; ctx.stroke();
  // nity w rogach
  if (w > 40 && h > 24) {
    for (const [nx, ny] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) {
      ctx.fillStyle = ZLOTO(0.85); ctx.beginPath(); ctx.arc(nx, ny, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

/** Płótno obszyte ściegiem — tło medalionów postaci. */
export function panelPlotno(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  zaokraglony(ctx, x, y, w, h, 4);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(112,92,66,0.96)'); g.addColorStop(1, 'rgba(86,70,50,0.96)');
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); ctx.clip();
  // splot: osnowa i wątek co 3 px, nierówne jak w samodziale
  ctx.lineWidth = 1;
  for (let yy = y + 1; yy < y + h; yy += 3) { ctx.strokeStyle = `rgba(40,28,16,${0.14 + 0.1 * los(Math.round(yy))})`; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
  for (let xx = x + 1; xx < x + w; xx += 3) { ctx.strokeStyle = `rgba(214,190,150,${0.05 + 0.06 * los(Math.round(xx) * 5)})`; ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
  // przetarcia i przybrudzenia ku brzegom
  const v = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,12,6,0.45)');
  ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
  ctx.restore();
  // obszycie: ścieg przerywaną nicią i brzeg tkaniny
  zaokraglony(ctx, x + 4, y + 4, w - 8, h - 8, 3);
  ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(222,196,146,0.55)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
  zaokraglony(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 4);
  ctx.strokeStyle = 'rgba(40,26,14,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

/** Otwarta księga: dwie karty pergaminu z grzbietem pośrodku. Zwraca obszary kart (do pisania). */
export function panelKsiega(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): { lewa: { x: number; w: number }; prawa: { x: number; w: number } } {
  const pol = w / 2;
  ctx.save();
  // oprawa pod kartami
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  zaokraglony(ctx, x - 6, y - 5, w + 12, h + 11, 6);
  ctx.fillStyle = 'rgba(70,32,22,0.97)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = ZLOTO(0.5); ctx.lineWidth = 1; ctx.stroke();
  // karty: lekko wybrzuszone ku grzbietowi, pożółkłe brzegi
  for (const strona of [-1, 1]) {
    const kx = strona < 0 ? x : x + pol;
    const g = ctx.createLinearGradient(kx, 0, kx + pol, 0);
    if (strona < 0) { g.addColorStop(0, 'rgba(206,186,148,1)'); g.addColorStop(0.85, 'rgba(222,204,166,1)'); g.addColorStop(1, 'rgba(150,126,92,1)'); }
    else { g.addColorStop(0, 'rgba(150,126,92,1)'); g.addColorStop(0.15, 'rgba(222,204,166,1)'); g.addColorStop(1, 'rgba(206,186,148,1)'); }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(kx, y + (strona < 0 ? 2 : 0));
    ctx.quadraticCurveTo(kx + pol / 2, y - 3, kx + pol, y + (strona < 0 ? 0 : 2));
    ctx.lineTo(kx + pol, y + h);
    ctx.quadraticCurveTo(kx + pol / 2, y + h + 3, kx, y + h);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,64,40,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // grzbiet: cień w zgięciu
  const s = ctx.createLinearGradient(x + pol - 10, 0, x + pol + 10, 0);
  s.addColorStop(0, 'rgba(60,40,24,0)'); s.addColorStop(0.5, 'rgba(60,40,24,0.45)'); s.addColorStop(1, 'rgba(60,40,24,0)');
  ctx.fillStyle = s; ctx.fillRect(x + pol - 10, y, 20, h);
  ctx.restore();
  return { lewa: { x: x + 14, w: pol - 26 }, prawa: { x: x + pol + 12, w: pol - 26 } };
}

/** Przegródki panelu przycisków: osobna wnęka na każdy przycisk (środek, promień). */
export function przegrodki(ctx: CanvasRenderingContext2D, wneki: { x: number; y: number; r: number }[]): void {
  ctx.save();
  for (const b of wneki) {
    const s = b.r * 1.08;
    zaokraglony(ctx, b.x - s, b.y - s, s * 2, s * 2, 5);
    const g = ctx.createLinearGradient(0, b.y - s, 0, b.y + s);
    g.addColorStop(0, 'rgba(8,6,5,0.55)'); g.addColorStop(1, 'rgba(40,32,26,0.35)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = ZLOTO(0.45); ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}
