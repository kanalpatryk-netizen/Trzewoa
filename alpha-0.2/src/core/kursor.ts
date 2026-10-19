import { KURSOR as K } from '../nastawy/ekran';
import kursorUrl from '../../obrazy/kursor1.png?url';

/**
 * Kursor gry: `obrazy/kursor1.png` zmniejszony do rozmiaru kursora (nastawy/ekran.ts — KURSOR),
 * w dwóch gęstościach — zwykłej i podwójnej na ekrany o gęstych pikselach. Zakładamy go na cały
 * dokument, więc dziedziczy go wszystko: płótno gry, film intro, każdy ekran. Do czasu, aż obrazek
 * się wczyta (albo gdy się nie wczyta), zostaje zwykła strzałka.
 */
export function zalozKursor(): void {
  const obraz = new Image();
  obraz.onload = () => {
    const bok = Math.max(obraz.naturalWidth, obraz.naturalHeight);
    if (!bok) return;
    const skala = K.rozmiar / bok;
    const x = Math.round(K.czubek.x * skala), y = Math.round(K.czubek.y * skala);
    const raz = pomniejsz(obraz, skala), dwa = pomniejsz(obraz, skala * 2);
    const el = document.documentElement;
    // przeglądarka odrzuca wartość, której nie zna — zostaje wtedy poprzednia, prostsza
    el.style.cursor = `url(${raz}) ${x} ${y}, default`;
    el.style.cursor = `-webkit-image-set(url(${raz}) 1x, url(${dwa}) 2x) ${x} ${y}, default`;
    el.style.cursor = `image-set(url(${raz}) 1x, url(${dwa}) 2x) ${x} ${y}, default`;
  };
  obraz.src = kursorUrl;
}

/**
 * Obrazek w skali `s` jako data:. Duży obrazek zmniejszany od razu do kilkudziesięciu pikseli gubi
 * kontury, więc schodzimy po połowie, a dopiero ostatni krok trafia w rozmiar.
 */
function pomniejsz(obraz: HTMLImageElement, s: number): string {
  const W = Math.max(1, Math.round(obraz.naturalWidth * s)), H = Math.max(1, Math.round(obraz.naturalHeight * s));
  let zrodlo: CanvasImageSource = obraz;
  let w = obraz.naturalWidth, h = obraz.naturalHeight;
  while (w / 2 >= W && h / 2 >= H) {
    const c = plotno(Math.round(w / 2), Math.round(h / 2));
    c.getContext('2d')!.drawImage(zrodlo, 0, 0, c.width, c.height);
    zrodlo = c; w = c.width; h = c.height;
  }
  const c = plotno(W, H);
  c.getContext('2d')!.drawImage(zrodlo, 0, 0, W, H);
  return c.toDataURL('image/png');
}

function plotno(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return c;
}
