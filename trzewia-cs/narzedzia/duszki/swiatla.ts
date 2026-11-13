// Światła postaci poza klatką. Rysunek TS dokłada ciepłe poświaty (lampka robotnika, świeca, księga) addytywnie:
// gradient kołowy od barwy do zera, tryb „lighter”. Wtopione w klatkę dawałyby wielkie, półprzezroczyste plamy
// (większe arkusze, gorsza kompresja), a po wklejeniu duszka nie świeciłyby addytywnie. Dlatego piekarnia:
//   • zapisuje każde takie światło (środek, promień, barwa, siła) przy klatce — gra dorysuje je POD duszkiem, addytywnie,
//   • na tym, co w chwili wywołania jest już narysowane (części ciała pod światłem), rozjaśnia piksele tak samo,
//     jak zrobiłby to „lighter” — części rysowane później zostają nietknięte, jak w grze.
// Wynik po złożeniu (tło + światło + duszek) jest taki sam jak rysunek TS, także na półprzezroczystej obwódce.
// Przechwytywany jest dokładnie wzór z render/lud/wspolne.ts: poswiata — createRadialGradient(x, y, 0, x, y, r),
// dwa przystanki tej samej barwy (alfa a → 0), fill() w trybie „lighter”. Inne gradienty rysują się zwykle.
const G = globalThis as any;

interface Rad { x0: number; y0: number; r0: number; x1: number; y1: number; r1: number; stopy: [number, string][] }

function barwa(s: string): [number, number, number, number] | null {
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null;
}

/** Czy to światło wg wzoru; jeśli tak — zapisuje je i rozjaśnia to, co już narysowane. */
function swiatlo(g: CanvasRenderingContext2D, rad: Rad): boolean {
  if (rad.r0 !== 0 || rad.x0 !== rad.x1 || rad.y0 !== rad.y1 || rad.stopy.length !== 2) return false;
  const a = barwa(rad.stopy[0][1]), b = barwa(rad.stopy[1][1]);
  if (!a || !b || rad.stopy[0][0] !== 0 || rad.stopy[1][0] !== 1 || b[3] !== 0 || a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) return false;
  const t = g.getTransform();
  const X = t.a * rad.x1 + t.c * rad.y1 + t.e, Y = t.b * rad.x1 + t.d * rad.y1 + t.f;
  const R = rad.r1 * Math.hypot(t.a, t.b), sila = a[3] * g.globalAlpha;
  if (R <= 0.5 || sila <= 0.004) return true;
  (G.PIEK_SWIATLA as number[][]).push([X, Y, R, a[0], a[1], a[2], sila]);
  const x0 = Math.max(0, Math.floor(X - R)), y0 = Math.max(0, Math.floor(Y - R));
  const x1 = Math.min(g.canvas.width, Math.ceil(X + R)), y1 = Math.min(g.canvas.height, Math.ceil(Y + R));
  if (x1 <= x0 || y1 <= y0) return true;
  const im = g.getImageData(x0, y0, x1 - x0, y1 - y0), d = im.data;
  let zmiana = false;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = ((y - y0) * (x1 - x0) + (x - x0)) * 4;
      if (d[i + 3] === 0) continue;
      const k = sila * (1 - Math.hypot(x + 0.5 - X, y + 0.5 - Y) / R);
      if (k <= 0) continue;
      d[i] = Math.min(255, d[i] + a[0] * k); d[i + 1] = Math.min(255, d[i + 1] + a[1] * k); d[i + 2] = Math.min(255, d[i + 2] + a[2] * k);
      zmiana = true;
    }
  }
  if (zmiana) g.putImageData(im, x0, y0);
  return true;
}

/** Zakłada przechwytywanie na płótnach strony (raz). Działa tylko, gdy G.PIEK_SWIATLA jest listą. */
export function przechwytujSwiatla(): void {
  const P = CanvasRenderingContext2D.prototype as any;
  if (P.__piekarnia) return;
  P.__piekarnia = true;
  const crg = P.createRadialGradient;
  P.createRadialGradient = function (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    const gr = crg.call(this, x0, y0, r0, x1, y1, r1);
    gr.__rad = { x0, y0, r0, x1, y1, r1, stopy: [] } as Rad;
    return gr;
  };
  const acs = CanvasGradient.prototype.addColorStop;
  CanvasGradient.prototype.addColorStop = function (o: number, c: string) {
    (this as any).__rad?.stopy.push([o, c]);
    return acs.call(this, o, c);
  };
  const fill = P.fill;
  P.fill = function (...arg: unknown[]) {
    const st = this.fillStyle;
    if (Array.isArray(G.PIEK_SWIATLA) && arg.length === 0 && this.globalCompositeOperation === 'lighter' && st && typeof st === 'object' && st.__rad
      && swiatlo(this, st.__rad)) return;
    return fill.apply(this, arg);
  };
}
