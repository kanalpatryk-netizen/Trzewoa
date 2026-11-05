import { BARWA, rgba } from '../../render/palette';

export interface Plotno {
  ctx: CanvasRenderingContext2D;
  w: number; h: number;
  /** czas w ms — do drgania, migotania i oddechu */
  t: number;
  /** postęp całej sceny 0..1, liczony z tego, ile narracji już padło */
  p: number;
  /** numer linijki narracji, która właśnie leci */
  takt: number;
  /** postęp w obrębie tej linijki 0..1 */
  taktP: number;
}

/** Wypełnienie kształtu kreskowaniem pod zadanym kątem — podstawa każdej ryciny. */
export function kreskuj(ctx: CanvasRenderingContext2D, ksztalt: Path2D, kat: number, odstep: number, kolor: string, grubosc = 1): void {
  ctx.save();
  ctx.clip(ksztalt);
  ctx.strokeStyle = kolor;
  ctx.lineWidth = grubosc;
  const d = 4000;
  ctx.translate(0, 0);
  ctx.beginPath();
  const kos = Math.cos(kat), sin = Math.sin(kat);
  for (let i = -d; i < d; i += odstep) {
    ctx.moveTo(-sin * d + kos * i, kos * d + sin * i);
    ctx.lineTo(sin * d + kos * i, -kos * d + sin * i);
  }
  ctx.stroke();
  ctx.restore();
}

/** Kropkowanie — do faktur miękkich: grzybni, dymu, zwłok. */
export function kropkuj(ctx: CanvasRenderingContext2D, ksztalt: Path2D, gestosc: number, kolor: string, ziarno = 1): void {
  ctx.save();
  ctx.clip(ksztalt);
  ctx.fillStyle = kolor;
  const n = Math.round(gestosc);
  for (let i = 0; i < n; i++) {
    const x = pseudo(i * 2.3 + ziarno) * 4000 - 500;
    const y = pseudo(i * 5.7 + ziarno * 3) * 3000 - 400;
    const r = 0.5 + pseudo(i * 1.1 + ziarno) * 1.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Powtarzalny „szum" bez losowości — rysunek ma być ten sam przy każdym otwarciu. */
export function pseudo(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Kontur rysowany na oczach: pokazuje tylko pierwsze `ulamek` punktów. */
export function obrysPostep(ctx: CanvasRenderingContext2D, punkty: [number, number][], kolor: string, grubosc: number, ulamek: number): void {
  const ile = Math.max(2, Math.round(punkty.length * Math.max(0, Math.min(1, ulamek))));
  obrys(ctx, punkty.slice(0, ile), kolor, grubosc, false);
}

/** Kontur drżącą kreską po zadanych punktach. */
export function obrys(ctx: CanvasRenderingContext2D, punkty: [number, number][], kolor: string, grubosc = 1.4, zamknij = false): void {
  ctx.save();
  ctx.strokeStyle = kolor;
  ctx.lineWidth = grubosc;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < punkty.length; i++) {
    const [x, y] = punkty[i];
    const dx = (pseudo(i * 3.1) - 0.5) * 1.6;
    const dy = (pseudo(i * 7.3) - 0.5) * 1.6;
    if (i === 0) ctx.moveTo(x + dx, y + dy);
    else ctx.lineTo(x + dx, y + dy);
  }
  if (zamknij) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Mała sylwetka mieszkańca — ta sama kreska, co w grze. */
export function sylwetka(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, typ: 'goblin' | 'kowal' | 'trol' | 'przadka' = 'goblin', alfa = 1): void {
  const P = new Path2D();
  if (typ === 'goblin') {
    P.moveTo(x - h * 0.22, y);
    P.quadraticCurveTo(x - h * 0.3, y - h * 0.7, x, y - h * 0.74);
    P.quadraticCurveTo(x + h * 0.26, y - h * 0.76, x + h * 0.22, y);
    P.closePath();
    P.moveTo(x + h * 0.1, y - h * 0.98);
    P.arc(x + h * 0.08, y - h * 0.88, h * 0.13, 0, Math.PI * 2);
  } else if (typ === 'kowal') {
    P.rect(x - h * 0.3, y - h * 0.55, h * 0.6, h * 0.55);
    P.moveTo(x - h * 0.34, y - h * 0.86);
    P.lineTo(x + h * 0.34, y - h * 0.86);
    P.lineTo(x + h * 0.22, y - h * 0.99);
    P.lineTo(x - h * 0.22, y - h * 0.99);
    P.closePath();
  } else if (typ === 'trol') {
    P.moveTo(x - h * 0.4, y);
    P.quadraticCurveTo(x - h * 0.5, y - h * 0.6, x, y - h);
    P.quadraticCurveTo(x + h * 0.5, y - h * 0.6, x + h * 0.4, y);
    P.closePath();
  } else {
    P.ellipse(x, y - h * 0.4, h * 0.26, h * 0.2, 0, 0, Math.PI * 2);
    for (let i = 0; i < 4; i++) {
      const a = -0.4 - i * 0.42;
      P.moveTo(x, y - h * 0.42);
      P.lineTo(x + Math.cos(a) * h * 0.62, y - h * 0.42 + Math.sin(-a) * h * 0.5);
      P.moveTo(x, y - h * 0.42);
      P.lineTo(x - Math.cos(a) * h * 0.62, y - h * 0.42 + Math.sin(-a) * h * 0.5);
    }
  }
  ctx.save();
  ctx.globalAlpha *= alfa;          // mnożymy, żeby nie kasować przenikania całej sceny
  ctx.fillStyle = rgba('#100b0a', 0.92);
  ctx.fill(P);
  kreskuj(ctx, P, 0.7, 3, rgba(BARWA.atrament, 0.85), 1);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9);
  ctx.lineWidth = 1.1;
  ctx.stroke(P);
  ctx.restore();
}

/** Poświata źródła światła — jedyny kolor, jaki wolno wpuścić. */
export function blask(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kolor: string, moc = 0.5): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(kolor, moc));
  g.addColorStop(1, rgba(kolor, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
