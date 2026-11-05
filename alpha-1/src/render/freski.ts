import { FRESK } from '../nastawy/barwy';
import { pigment } from './fresk';

/**
 * DUŻE FRESKI — wycinki prawdziwych malowideł (pliki w `src/grafiki/freski/`, źródła
 * i licencje w `grafiki-freski/ZRODLA.md`): ilustracje kart wydarzeń, tablic atlasu
 * i ekranu końca, fryz nad kartą i medaliony osiągnięć. Siedzą w kodzie gry jako data:,
 * więc zbudowana gra dalej jest jednym plikiem. Co gdzie leży — `nastawy/wyglad/freski.ts`.
 */
const PLIKI = import.meta.glob('../grafiki/freski/*.{webp,jpg}', { eager: true, import: 'default' }) as Record<string, string>;
const obrazy = new Map<string, HTMLImageElement>();

function adres(nazwa: string): string | undefined {
  return PLIKI[`../grafiki/freski/${nazwa}.webp`] ?? PLIKI[`../grafiki/freski/${nazwa}.jpg`];
}

/** Obraz fresku, gdy już się wczytał; null, gdy jeszcze nie (albo nie ma takiego). */
export function obrazFresku(nazwa: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let o = obrazy.get(nazwa);
  if (!o) {
    const url = adres(nazwa);
    if (!url) return null;
    o = new Image(); o.src = url; obrazy.set(nazwa, o);
  }
  return o.complete && o.naturalWidth > 0 ? o : null;
}

/** Czy taki fresk w ogóle jest w grze. */
export const jestFresk = (nazwa: string): boolean => !!adres(nazwa);

export interface Prost { x: number; y: number; w: number; h: number }

/**
 * Wpisuje cały fresk w prostokąt, bez przycinania. `dol` stawia go na dolnej krawędzi
 * (postać stoi), inaczej leży na środku. Zwraca, gdzie wylądował, albo null.
 */
export function wpiszFresk(ctx: CanvasRenderingContext2D, nazwa: string, x: number, y: number, w: number, h: number, dol = false, alfa = 1): Prost | null {
  const o = obrazFresku(nazwa);
  if (!o || w <= 0 || h <= 0) return null;
  const s = Math.min(w / o.naturalWidth, h / o.naturalHeight);
  const fw = o.naturalWidth * s, fh = o.naturalHeight * s;
  const fx = x + (w - fw) / 2, fy = dol ? y + h - fh : y + (h - fh) / 2;
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.drawImage(o, fx, fy, fw, fh);
  ctx.restore();
  return { x: fx, y: fy, w: fw, h: fh };
}

/**
 * Fryz z tancerzami i zwierzętami (Arlanza) w poprzek pasa: kafel powtarzany, co drugi
 * odbity, żeby szwy się nie powtarzały; pod spodem kreska czerwieni ziemi.
 */
export function fryz(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const o = obrazFresku('fryz-tancerze');
  ctx.save();
  const pas = new Path2D(); pas.rect(x, y, w, h);
  ctx.clip(pas);
  if (o) {
    const kw = o.naturalWidth * (h / o.naturalHeight);
    // od środka na boki: postacie na środku karty zawsze te same
    const start = x + w / 2 - kw / 2 - Math.ceil((w / 2) / kw) * kw;
    for (let i = 0, kx = start; kx < x + w; i++, kx += kw) {
      ctx.save();
      if (i % 2) { ctx.translate(kx + kw, y); ctx.scale(-1, 1); ctx.drawImage(o, 0, 0, kw, h); }
      else ctx.drawImage(o, kx, y, kw, h);
      ctx.restore();
    }
    // światło lampki z góry: dół fryzu ciemnieje
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,230,190,0.06)'); g.addColorStop(1, 'rgba(20,10,6,0.35)');
    ctx.fillStyle = g; ctx.fill(pas);
  } else {
    pigment(ctx, pas, FRESK.tablicaCiemna);
  }
  ctx.restore();
  ctx.save();
  ctx.fillStyle = FRESK.czerwien;
  ctx.fillRect(x, y + h, w, Math.max(2, h * 0.06));
  ctx.fillStyle = 'rgba(227,214,182,0.55)';
  ctx.fillRect(x, y + h + Math.max(2, h * 0.06), w, 1);
  ctx.restore();
}

/**
 * Nisza z łukiem na złotym tle, jak na ikonie: złoto z perełkami na łuku, obrzeże
 * czerwieni ziemi. Zwraca ścieżkę wnętrza, żeby w niej narysować postać.
 */
export function zlotaNisza(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, teraz = 0): Path2D {
  const r = w / 2;
  const nisza = new Path2D();
  nisza.moveTo(x, y + h);
  nisza.lineTo(x, y + r);
  nisza.arc(x + r, y + r, r, Math.PI, 0);
  nisza.lineTo(x + w, y + h);
  nisza.closePath();
  ctx.save();
  pigment(ctx, nisza, FRESK.zloto, 0.9, 'zloto');
  // blask lampki na złocie: przesuwa się z płomieniem
  const m = 0.5 + 0.5 * Math.sin(teraz * 0.0013);
  const g = ctx.createRadialGradient(x + w * (0.4 + 0.2 * m), y + h * 0.35, 1, x + w / 2, y + h * 0.45, h * 0.75);
  g.addColorStop(0, 'rgba(255,236,170,0.32)');
  g.addColorStop(1, 'rgba(60,30,8,0.38)');
  ctx.fillStyle = g;
  ctx.fill(nisza);
  ctx.restore();
  return nisza;
}

/** Obrzeże niszy: czerwień ziemi, cienka biel i perełki na łuku. Rysowane na postaci. */
export function brzegNiszy(ctx: CanvasRenderingContext2D, nisza: Path2D, x: number, y: number, w: number): void {
  const r = w / 2;
  ctx.save();
  ctx.lineWidth = Math.max(2.5, w * 0.045);
  ctx.strokeStyle = FRESK.czerwien;
  ctx.stroke(nisza);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(227,214,182,0.7)';
  ctx.stroke(nisza);
  ctx.fillStyle = 'rgba(236,224,196,0.9)';
  for (let i = 1; i < 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    ctx.beginPath(); ctx.arc(x + r + Math.cos(a) * (r - w * 0.07), y + r + Math.sin(a) * (r - w * 0.07), Math.max(1, w * 0.018), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Medalion osiągnięcia: okrągły wycinek fresku w obwódce ugru. Niezdobyty jest wyblakły
 * i szary — widać, co to, ale nie świeci.
 */
export function medalion(ctx: CanvasRenderingContext2D, nazwa: string, x: number, y: number, r: number, zdobyty: boolean, alfa = 1): void {
  const o = obrazFresku(`medal-${nazwa}`);
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.arc(x + 1, y + 2, r + 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  if (o) {
    if (!zdobyty) ctx.filter = 'grayscale(1) brightness(0.85)';
    ctx.globalAlpha *= zdobyty ? 1 : 0.6;
    ctx.drawImage(o, x - r, y - r, r * 2, r * 2);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = FRESK.tablicaCiemna; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.2, x, y, r);
  g.addColorStop(0, zdobyty ? 'rgba(255,236,200,0.12)' : 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(20,10,6,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.strokeStyle = zdobyty ? FRESK.ugier : 'rgba(110,92,72,0.8)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = zdobyty ? 'rgba(240,214,150,0.8)' : 'rgba(160,140,116,0.35)';
  ctx.beginPath(); ctx.arc(x, y, r + ctx.lineWidth + r * 0.05, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
