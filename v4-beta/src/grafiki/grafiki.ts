/**
 * WŁASNE GRAFIKI — podmiana rysunków gry na obrazki z folderu `pliki/`.
 *
 * Wrzuć plik PNG/WEBP/JPG/SVG do `src/grafiki/pliki/` i nazwij go kluczem (lista w README obok).
 * Gra sama go znajdzie: tam, gdzie jest obrazek, rysuje obrazek; gdzie go nie ma — swoją rycinę.
 * Obrazki trafiają do środka zbudowanej gry (npm run pack daje dalej jeden plik).
 *
 * Animacja: dopisz do nazwy `@N`, a plik to pasek N klatek obok siebie,
 * np. `postac-slepy-lud-idzie@4.png`.
 */

/** Wszystkie pliki z `pliki/` jako adresy data: — wbudowane w kod gry. */
const pliki = import.meta.glob('./pliki/*.{png,webp,jpg,jpeg,svg}', {
  eager: true, query: '?inline', import: 'default',
}) as Record<string, string>;

interface Grafika { img: HTMLImageElement; klatek: number; gotowa: boolean }

const zbior = new Map<string, Grafika>();
for (const [sciezka, url] of Object.entries(pliki)) {
  const nazwa = sciezka.replace(/^.*\//, '').replace(/\.[a-z]+$/i, '').toLowerCase();
  const m = /^(.*)@(\d+)$/.exec(nazwa);
  const klucz = m ? m[1] : nazwa;
  const g: Grafika = { img: new Image(), klatek: m ? Math.max(1, Number(m[2])) : 1, gotowa: false };
  g.img.onload = () => { g.gotowa = true; };
  g.img.src = url;
  zbior.set(klucz, g);
}

/** Czy jest gotowy obrazek pod tym kluczem. */
export function maGrafike(klucz: string): boolean {
  return !!zbior.get(klucz)?.gotowa;
}

/** Pierwszy klucz z listy, który ma obrazek (od najdokładniejszego do ogólnego) — albo null. */
export function pierwszaGrafika(...klucze: string[]): string | null {
  for (const k of klucze) if (maGrafike(k)) return k;
  return null;
}

export interface OpcjeGrafiki {
  /** Punkt zaczepienia w obrazku: 0..1 (domyślnie środek: 0.5, 0.5; postacie: 0.5, 1 = stopy). */
  kotwicaX?: number; kotwicaY?: number;
  /** Lustrzane odbicie w poziomie (postać idzie w lewo). */
  odbij?: boolean;
  /** Czas w ms — wybiera klatkę animacji; `fps` to tempo (domyślnie 8). */
  czas?: number; fps?: number;
  alfa?: number;
}

/**
 * Rysuje obrazek w (x, y) o wysokości `wys` (szerokość z proporcji; `szer` wymusza wymiar).
 * Zwraca false, gdy obrazka nie ma — wtedy wołający rysuje swoją rycinę.
 */
export function rysujGrafike(
  ctx: CanvasRenderingContext2D, klucz: string, x: number, y: number, wys: number, opcje: OpcjeGrafiki = {}, szer?: number,
): boolean {
  const g = zbior.get(klucz);
  if (!g || !g.gotowa) return false;
  const kw = g.img.naturalWidth / g.klatek, kh = g.img.naturalHeight;
  const klatka = g.klatek > 1 ? Math.floor(((opcje.czas ?? 0) / 1000) * (opcje.fps ?? 8)) % g.klatek : 0;
  const w = szer ?? (wys * kw) / kh;
  ctx.save();
  ctx.translate(x, y);
  if (opcje.odbij) ctx.scale(-1, 1);
  if (opcje.alfa !== undefined) ctx.globalAlpha *= opcje.alfa;
  ctx.drawImage(g.img, klatka * kw, 0, kw, kh, -w * (opcje.kotwicaX ?? 0.5), -wys * (opcje.kotwicaY ?? 0.5), w, wys);
  ctx.restore();
  return true;
}

/** Nazwy ras w kluczach plików (`postac-<rasa>`). */
export const RASY_W_PLIKACH = ['slepy-lud', 'zuzlowcy', 'trole', 'przadki', 'ludzie', 'grzybnia'];
