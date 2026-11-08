/**
 * Wątek ryciny (8.11: wydajność): ta sama rycina świata co w głównym wątku (render/engrave.ts), liczona na drugim
 * rdzeniu procesora. Dostaje od gry (render/rycina.ts) migawkę świata wokół kamery i odsyła gotowe obrazy
 * (ImageBitmap): rycinę i rozmytą poświatę świateł. Gra w tym czasie rysuje poprzedni obraz, przesunięty pod
 * bieżącą kamerę — dawniej czekała, aż rycina policzy się w klatce (przy ruchu kamery do 50 ms).
 */
import { Engraver, ustawGraniceWarstw } from './engrave';
import { World } from '../sim/world';
import { ustawienia } from '../core/settings-store';
import type { RowneGrzbietu } from './grzbiet-wzor';
import { TABLICE, wklej, type ProsbaRyciny, type WiadomoscSwiata, type OdbitkaRyciny, type BladRyciny } from './rycina-wspolne';

const zakres = self as unknown as {
  onmessage: ((e: MessageEvent<WiadomoscSwiata | ProsbaRyciny>) => void) | null;
  postMessage(m: OdbitkaRyciny | BladRyciny | { typ: 'pusta'; nr: number }, przenies?: Transferable[]): void;
};

const eng = new Engraver();
let swiat: World | null = null;
let swiatId = -1;
let rowne: RowneGrzbietu | null = null;
/** Poświata: płótno w ćwierci rozdzielczości i czy płótno wątku zna filtry (rozmycie) — bez nich rozmywa gra. */
let posw: OffscreenCanvas | null = null;
let pctx: OffscreenCanvasRenderingContext2D | null = null;
let filtr = true;

function nowySwiat(m: WiadomoscSwiata): void {
  // ten sam kształt co World (te same metody: idx, inb, depth), tylko bez generatora — tablice przychodzą z gry
  const w = Object.create(World.prototype) as World;
  Object.assign(w, { w: m.w, h: m.h, surface: m.surface, ...m.tablice });
  swiat = w;
  swiatId = m.id;
  rowne = m.rowne;
  if (m.granice) ustawGraniceWarstw(w, m.granice);
}

function rysuj(m: ProsbaRyciny): void {
  // prośba do świata, którego już nie ma — gra i tak czeka na odpowiedź, zanim zamówi następną
  if (!swiat || m.swiatId !== swiatId) { zakres.postMessage({ typ: 'pusta', nr: m.nr }); return; }
  const t0 = performance.now();
  const w = swiat;
  for (const n of TABLICE) wklej(w[n], w.w, m.okno, m.tablice[n]);
  w.surface.set(m.surface);
  Object.assign(w, m.skalary);
  ustawienia.kontrast = m.kontrast;
  eng.fresk = m.fresk;
  const aw = Math.max(2, Math.ceil(m.kam.vw / m.skala) + 1), ah = Math.max(2, Math.ceil(m.kam.vh / m.skala) + 1);
  if (eng.scale !== m.skala || eng.aw !== aw || eng.ah !== ah) eng.resize(m.kam.vw, m.kam.vh, m.skala);
  eng.zrodla = m.zrodla;
  eng.rowne = rowne;
  const t1 = performance.now();
  eng.rebuild({ world: w, tick: m.tick }, m.kam, m.czas);
  const t2 = performance.now();
  const bw = eng.aw * eng.scale, bh = eng.ah * eng.scale;
  // poświata: ten sam filtr co render/bloom.ts, w ćwierci rozdzielczości — liczona tu, raz na odbitkę
  let poswiata: ImageBitmap | null = null;
  if (filtr) {
    // kawałek pod prawdziwą płytą: zapas odcięty (rycina bez zapasu miałaby tu swój bufor — ten sam rozmiar i siatka)
    const vw = m.kam.vw - m.zapas * 2, vh = m.kam.vh - m.zapas * 2, z = m.zapas / m.skala;
    const aw0 = Math.max(2, Math.ceil(vw / m.skala) + 1), ah0 = Math.max(2, Math.ceil(vh / m.skala) + 1);
    const pw = Math.max(1, Math.round(vw / m.poswiataPodzial)), ph = Math.max(1, Math.round(vh / m.poswiataPodzial));
    if (!posw || posw.width !== pw || posw.height !== ph) {
      posw = new OffscreenCanvas(pw, ph);
      pctx = posw.getContext('2d');
      filtr = !!pctx && typeof pctx.filter === 'string';
    }
    if (filtr && pctx && posw) {
      pctx.clearRect(0, 0, pw, ph);
      pctx.filter = 'blur(2px) brightness(1.65) contrast(1.5)';
      pctx.drawImage(eng.emis as OffscreenCanvas, z, z, aw0, ah0, 0, 0, pw, ph);
      pctx.filter = 'none';
      poswiata = posw.transferToImageBitmap();
    }
  }
  const t3 = performance.now();
  const buf = (eng.buf as OffscreenCanvas).transferToImageBitmap();
  const emis = poswiata ? null : (eng.emis as OffscreenCanvas).transferToImageBitmap();
  const wynik: OdbitkaRyciny = {
    typ: 'odbitka', nr: m.nr, buf, emis, poswiata, kam: m.kam, skala: eng.scale, dx: eng.dx, dy: eng.dy, bw, bh,
    niedokonczona: eng.niedokonczona, ms: performance.now() - t0,
    czasy: { migawka: t1 - t0, rycina: t2 - t1, poswiata: t3 - t2 },
  };
  const przenies: Transferable[] = [buf];
  if (emis) przenies.push(emis);
  if (poswiata) przenies.push(poswiata);
  zakres.postMessage(wynik, przenies);
}

zakres.onmessage = (e) => {
  try {
    const m = e.data;
    if (m.typ === 'swiat') nowySwiat(m);
    else rysuj(m);
  } catch (blad) {
    zakres.postMessage({ typ: 'blad', tekst: String((blad as Error)?.stack ?? blad) });
  }
};
