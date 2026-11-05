/**
 * Ozdobnik przy napisach menu i ustawień (według szkicu grafika) i łagodne wejście animacji.
 */

export const wygladz = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/** Spirala z punktu (cx, cy): promień maleje od r do 0 przez `obroty` obrotów, zaczyna od kąta a0. */
function spirala(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, obroty: number, kier: number): void {
  const kroki = Math.ceil(28 * obroty);
  for (let i = 0; i <= kroki; i++) {
    const t = i / kroki;
    const a = a0 + kier * t * obroty * Math.PI * 2;
    const rr = r * (1 - t * 0.85);
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
}

/**
 * Ozdobnik przy napisie (jak na szkicu): dwa zawinięte wąsy jak klamra, ostrze na zewnątrz
 * i kropla w środku. `x` — krawędź przy napisie, `kier` = −1 po lewej, +1 po prawej.
 */
export function ozdobnik(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kier: number, barwa: string, alfa: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(kier * s, s);
  ctx.globalAlpha *= alfa;
  ctx.strokeStyle = barwa; ctx.fillStyle = barwa;
  ctx.lineWidth = 0.075; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const v of [-1, 1]) {
    // wąs od ostrza do napisu, zakończony spiralą
    ctx.beginPath();
    ctx.moveTo(0.92, 0);
    ctx.bezierCurveTo(0.68, v * -0.04, 0.62, v * 0.44, 0.34, v * 0.4);
    ctx.bezierCurveTo(0.14, v * 0.37, 0.06, v * 0.2, 0.17, v * 0.12);
    spirala(ctx, 0.25, v * 0.2, 0.1, v > 0 ? Math.PI * 1.1 : -Math.PI * 1.1, 0.9, v > 0 ? -1 : 1);
    ctx.stroke();
    // listek na wąsie
    ctx.beginPath();
    ctx.ellipse(0.62, v * 0.27, 0.11, 0.045, v * -0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // trzon i kropla w środku
  ctx.beginPath(); ctx.moveTo(0.92, 0); ctx.lineTo(0.5, 0); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0.4, 0, 0.085, 0.06, 0, 0, Math.PI * 2); ctx.fill();
  // ostrze na zewnątrz — mały romb
  ctx.beginPath();
  ctx.moveTo(0.9, 0); ctx.lineTo(0.99, -0.07); ctx.lineTo(1.08, 0); ctx.lineTo(0.99, 0.07); ctx.closePath();
  ctx.fill();
  ctx.restore();
}
