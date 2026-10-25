import { KURSOR as K } from '../nastawy/ekran';
import zwyklyUrl from '../../obrazy/kursor1.png?url';
import klikUrl from '../../obrazy/kursor2.png?url';

/**
 * Kursor gry: stalowa rękawica rysowana przez grę pod myszką (nastawy/ekran.ts — KURSOR).
 * Zwykle `kursor1.png`, a póki przycisk myszy jest wciśnięty — `kursor2.png`. Obie przycięte do samej
 * rękawicy i zmniejszone do tego samego rozmiaru; czubek palca każdej trafia dokładnie w punkt myszy,
 * więc przy kliknięciu palec nie skacze. Systemowa strzałka chowa się dopiero, gdy rękawica stoi już
 * pod myszką — do tego czasu (i na dotyku) jest zwykły kursor.
 */
export function zalozKursor(): void {
  Promise.all([wczytaj(zwyklyUrl), wczytaj(klikUrl)]).then(([o1, o2]) => {
    const warstwa = document.createElement('div');
    warstwa.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483647;display:none;will-change:transform';
    const zwykly = rekawica(o1, K.czubek), klik = rekawica(o2, K.czubekKlik);
    klik.el.style.visibility = 'hidden';
    warstwa.append(zwykly.el, klik.el);
    document.body.appendChild(warstwa);

    let wcisniety = false, wcisnietyOd = 0, puscZa = 0;
    const pokaz = (k: boolean) => {
      clearTimeout(puscZa);
      wcisniety = k;
      zwykly.el.style.visibility = k ? 'hidden' : 'visible';
      klik.el.style.visibility = k ? 'visible' : 'hidden';
    };
    const pusc = () => {
      if (!wcisniety) return;
      clearTimeout(puscZa);
      puscZa = window.setTimeout(() => pokaz(false), Math.max(0, wcisnietyOd + K.klikMinMs - performance.now()));
    };
    const ruch = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') { warstwa.style.display = 'none'; return; }
      warstwa.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      if (warstwa.style.display === 'none') {
        warstwa.style.display = 'block';
        document.documentElement.style.cursor = 'none';
      }
      if (wcisniety && e.buttons === 0) pusc();      // puszczony poza oknem
    };
    addEventListener('pointermove', ruch, { capture: true, passive: true });
    addEventListener('pointerdown', (e) => { ruch(e); if (e.pointerType === 'mouse') { pokaz(true); wcisnietyOd = performance.now(); } }, { capture: true, passive: true });
    addEventListener('pointerup', pusc, { capture: true, passive: true });
    addEventListener('pointercancel', pusc, { capture: true, passive: true });
    addEventListener('blur', () => pokaz(false));
    // mysz wyszła z okna — rękawica nie zostaje przy krawędzi
    document.documentElement.addEventListener('mouseleave', () => { warstwa.style.display = 'none'; });
  }).catch(() => { /* bez obrazka zostaje zwykła strzałka */ });
}

/** Rękawica przycięta i zmniejszona do rysowania na płótnie: wymiary i czubek palca w pikselach ekranu. */
export interface RekawicaRys { plotno: HTMLCanvasElement; w: number; h: number; czubekX: number; czubekY: number }

/**
 * Obie rękawice (zwykła i wciskająca) do rysowania na płótnie — tak samo przycięte jak kursor, tylko w rozmiarze
 * `rozmiar` px (dłuższy bok). Samouczek pokazuje nimi, co zrobić.
 */
export function rekawiceDoRysunku(rozmiar: number): Promise<{ zwykla: RekawicaRys; klik: RekawicaRys }> {
  return Promise.all([wczytaj(zwyklyUrl), wczytaj(klikUrl)])
    .then(([o1, o2]) => ({ zwykla: przytnij(o1, K.czubek, rozmiar), klik: przytnij(o2, K.czubekKlik, rozmiar) }));
}

function wczytaj(url: string): Promise<HTMLImageElement> {
  return new Promise((gotowe, blad) => {
    const o = new Image();
    o.onload = () => gotowe(o);
    o.onerror = blad;
    o.src = url;
  });
}

/**
 * Rękawica jako <img>: obrazek przycięty do nieprzezroczystych pikseli, zmniejszony tak, żeby
 * dłuższy bok miał `K.rozmiar` px ekranu (w gęstości pikseli ekranu, więc ostro), i przesunięty
 * tak, żeby czubek palca wypadał w punkcie (0, 0) warstwy — czyli pod myszką.
 */
function rekawica(o: HTMLImageElement, czubek: { x: number; y: number }): { el: HTMLImageElement } {
  const r = przytnij(o, czubek, K.rozmiar);
  const el = new Image();
  el.src = r.plotno.toDataURL('image/png');
  el.draggable = false;
  el.style.cssText = `position:absolute;display:block;max-width:none;width:${r.w}px;height:${r.h}px;` +
    `left:${-r.czubekX}px;top:${-r.czubekY}px`;
  return { el };
}

/** Obrazek przycięty do nieprzezroczystych pikseli i zmniejszony tak, żeby dłuższy bok miał `rozmiar` px ekranu. */
function przytnij(o: HTMLImageElement, czubek: { x: number; y: number }, rozmiar: number): RekawicaRys {
  const W = o.naturalWidth, H = o.naturalHeight;
  const c = plotno(W, H);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(o, 0, 0);
  const alfa = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alfa[(y * W + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const s = rozmiar / Math.max(w, h);
  const gestosc = Math.min(4, Math.max(1, Math.ceil(window.devicePixelRatio || 1)));
  const obraz = pomniejsz(c, x0, y0, w, h, Math.round(w * s * gestosc), Math.round(h * s * gestosc));
  return { plotno: obraz, w: w * s, h: h * s, czubekX: (czubek.x - x0) * s, czubekY: (czubek.y - y0) * s };
}

/**
 * Wycinek (sx, sy, sw, sh) płótna w rozmiarze W×H. Duży obrazek zmniejszany od razu do
 * kilkudziesięciu pikseli gubi kontury, więc schodzimy po połowie, a dopiero ostatni krok trafia w rozmiar.
 */
function pomniejsz(zrodlo: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, W: number, H: number): HTMLCanvasElement {
  let c = plotno(sw, sh);
  c.getContext('2d')!.drawImage(zrodlo, sx, sy, sw, sh, 0, 0, sw, sh);
  while (c.width / 2 >= W && c.height / 2 >= H) {
    const m = plotno(Math.round(c.width / 2), Math.round(c.height / 2));
    m.getContext('2d')!.drawImage(c, 0, 0, m.width, m.height);
    c = m;
  }
  const k = plotno(W, H);
  k.getContext('2d')!.drawImage(c, 0, 0, W, H);
  return k;
}

function plotno(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return c;
}
