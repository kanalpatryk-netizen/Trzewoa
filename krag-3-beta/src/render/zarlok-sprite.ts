/**
 * ŻARŁOK Z WYPIEKU (Krąg Trzeci, beta) — po uwadze użytkownika (15.11): „popraw wygląd ludzi, którzy są mało
 * realistyczni, a ich rany tym bardziej”. Części ciała wyrenderowane raz z modelu 3D (render/czlowiek3d.ts →
 * scripts/wypiek-cerbera.mjs --zarlok → obrazy/zarlok/*.webp, położenia w render/zarlok-wypiek.ts) gra składa na tych
 * samych stawach co rysunek 2D (render/ludzik.ts), więc działają wszystkie pozy: leży, czołga się, wyje, żre,
 * jest wleczony w paszczy, rozerwany na pół, bez głowy, bez ręki, z rozprutym brzuchem.
 * Dalsze kończyny są ciemniejsze (w cieniu tułowia); przy krwi > 0,4 — wersje zakrwawione.
 */
import { WYPIEK_ZARLOKA } from './zarlok-wypiek';
import type { PozaLudzika, PunktyLudzika } from './ludzik';

type P = [number, number];
const pliki = import.meta.glob('../../obrazy/zarlok/*.webp', { eager: true, import: 'default' }) as Record<string, string>;

interface Obraz { img: HTMLImageElement; gotowy: boolean; mip: CanvasImageSource[]; wym: [number, number][] }
const obrazy = new Map<string, Obraz>();
let zaczete = false, gotowych = 0, wszystkich = 0;

function zacznij(): void {
  if (zaczete || typeof Image === 'undefined') return;
  zaczete = true;
  for (const [sciezka, url] of Object.entries(pliki)) {
    const nazwa = sciezka.replace(/^.*\//, '').replace(/\.webp$/i, '');
    if (!WYPIEK_ZARLOKA[nazwa]) continue;
    const o: Obraz = { img: new Image(), gotowy: false, mip: [], wym: [] };
    wszystkich++;
    o.img.onload = () => { o.gotowy = true; o.mip = [o.img]; o.wym = [[o.img.naturalWidth, o.img.naturalHeight]]; gotowych++; };
    o.img.onerror = () => { wszystkich--; };
    o.img.src = url;
    obrazy.set(nazwa, o);
  }
}

/** Czy obrazki żarłoka są już wczytane (pierwsze wywołanie zaczyna wczytywanie). */
export function zarlokZWypieku(): boolean {
  zacznij();
  return wszystkich > 0 && gotowych >= wszystkich;
}

function poziom(o: Obraz, f: number): CanvasImageSource {
  let n = 0;
  while (f * (1 << n) < 0.55 && n < 6) n++;
  while (o.mip.length <= n) {
    const [w0, h0] = o.wym[o.wym.length - 1];
    const w = Math.max(1, Math.round(w0 / 2)), h = Math.max(1, Math.round(h0 / 2));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (!g) break;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(o.mip[o.mip.length - 1], 0, 0, w, h);
    o.mip.push(c); o.wym.push([w, h]);
  }
  return o.mip[Math.min(n, o.mip.length - 1)];
}

/** Część w punkcie `a`, obrócona o `kat` (0 — tak, jak wypieczona); `h` — wzrost w pikselach. */
function czesc(ctx: CanvasRenderingContext2D, nazwa: string, h: number, a: P, kat: number): void {
  const k = WYPIEK_ZARLOKA[nazwa], o = obrazy.get(nazwa);
  if (!k || !o?.gotowy) return;
  ctx.save();
  ctx.translate(a[0], a[1]);
  if (kat) ctx.rotate(kat);
  ctx.drawImage(poziom(o, h / k.S), k.x0 * h, k.y0 * h, (k.w / k.S) * h, (k.h / k.S) * h);
  ctx.restore();
}

const od = (a: P, kat: number, dl: number): P => [a[0] + Math.sin(kat) * dl, a[1] + Math.cos(kat) * dl];

/** Rysuje żarłoka z obrazków (układ jak rysujLudzika: biodro w (0, 0), wzrost `h`); null — obrazki niegotowe. */
export function rysujLudzikaZWypieku(ctx: CanvasRenderingContext2D, h: number, p: PozaLudzika): PunktyLudzika | null {
  if (!zarlokZWypieku()) return null;
  const brak = p.brak ?? {};
  const gora = brak.polowa !== 'dol', dol = brak.polowa !== 'gora';
  const k = p.krew > 0.4 ? '-k' : '';
  const biodro: P = [0, 0];
  const tulKat = Math.PI - p.tulow;
  const kark: P = od(biodro, tulKat, h * 0.34);
  const barkL: P = [kark[0] - Math.cos(p.tulow) * h * 0.03, kark[1] + h * 0.02];
  const barkP: P = [kark[0] + Math.cos(p.tulow) * h * 0.03, kark[1] + h * 0.02];
  const lokL = od(barkL, p.ramieL, h * 0.17), dlonL = od(lokL, p.ramieL + p.lokiecL, h * 0.16);
  const lokP = od(barkP, p.ramieP, h * 0.17), dlonP = od(lokP, p.ramieP + p.lokiecP, h * 0.16);
  const kolL = od(biodro, p.udoL, h * 0.25), stopaL = od(kolL, p.udoL - p.kolanoL, h * 0.25);
  const kolP = od(biodro, p.udoP, h * 0.25), stopaP = od(kolP, p.udoP - p.kolanoP, h * 0.25);
  const glowaS = od(kark, tulKat - p.glowa, h * 0.1);
  // stawy chowają się pod rodzicem: najpierw przedramię i podudzie, na nich ramię i udo (łokieć i kolano zakrywają
  // początek dziecka), a tułów zakrywa nasady ud i dalszego ramienia — bez „kulek” w stawach jak u manekina
  const reka = (bark: P, lok: P, ramie: number, lokiec: number, d: string, bez?: boolean): void => {
    if (bez) { czesc(ctx, 'zarlok-kikut-reki', h, bark, -ramie); return; }
    czesc(ctx, `zarlok-przedramie${d}${k}`, h, lok, -(ramie + lokiec));
    czesc(ctx, `zarlok-ramie${d}${k}`, h, bark, -ramie);
  };
  const noga = (kol: P, udo: number, kolano: number, d: string, bez?: boolean): void => {
    if (bez) { czesc(ctx, 'zarlok-kikut-nogi', h, biodro, -udo); return; }
    czesc(ctx, `zarlok-podudzie${d}${k}`, h, kol, -(udo - kolano));
    czesc(ctx, `zarlok-udo${d}${k}`, h, biodro, -udo);
  };
  // dalsza ręka, obie nogi (bliższa przed dalszą), tułów na nasadach ud, głowa, bliższa ręka na wierzchu
  if (gora) reka(barkL, lokL, p.ramieL, p.lokiecL, '-d', brak.rekaL);
  if (dol) noga(kolL, p.udoL, p.kolanoL, '-d', brak.nogaL);
  if (dol) noga(kolP, p.udoP, p.kolanoP, '', brak.nogaP);
  // tułów (cały, rozpruty, górna albo dolna połowa po rozerwaniu)
  const tulow = brak.polowa === 'gora' ? 'zarlok-tulow-gora' : brak.polowa === 'dol' ? 'zarlok-tulow-dol' : brak.trzewia ? 'zarlok-tulow-rozpruty' : `zarlok-tulow${k}`;
  czesc(ctx, tulow, h, biodro, p.tulow);
  // głowa (usta: zamknięte, otwarte, krzyk) albo kikut szyi
  if (gora && !brak.glowa) czesc(ctx, `zarlok-glowa-u${p.usta > 0.7 ? 2 : p.usta > 0.25 ? 1 : 0}${k}`, h, kark, p.tulow + p.glowa);
  else if (gora) czesc(ctx, 'zarlok-kikut-nogi', h, kark, p.tulow + Math.PI);
  // bliższa ręka
  if (gora) reka(barkP, lokP, p.ramieP, p.lokiecP, '', brak.rekaP);
  return { glowa: glowaS, kark, dlonL, dlonP, stopaL, stopaP, pas: [(biodro[0] + kark[0]) / 2, (biodro[1] + kark[1]) / 2] };
}

/** Oderwana głowa (szczątki): kikut szyi w (0, 0), `kat` — obrót. */
export function rysujOderwanaGlowe(ctx: CanvasRenderingContext2D, h: number, kat: number): boolean {
  if (!zarlokZWypieku()) return false;
  czesc(ctx, 'zarlok-glowa-oderwana', h, [0, 0], kat);
  return true;
}

/** Kupa trzewi na ziemi (szczątki), środek w (0, 0). */
export function rysujTrzewia(ctx: CanvasRenderingContext2D, h: number, kat = 0): boolean {
  if (!zarlokZWypieku()) return false;
  czesc(ctx, 'zarlok-trzewia', h, [0, 0], kat);
  return true;
}

/** Oderwana ręka (szczątki): poszarpany bark w (0, 0), ręka w kierunku `kat` (0 — w dół), zgięta w łokciu. */
export function rysujOderwanaReke(ctx: CanvasRenderingContext2D, h: number, kat: number, zgiecie = 0.5): boolean {
  if (!zarlokZWypieku()) return false;
  const lok: P = [-Math.sin(kat) * h * 0.17, Math.cos(kat) * h * 0.17];
  czesc(ctx, 'zarlok-ramie-k', h, [0, 0], kat);
  czesc(ctx, 'zarlok-przedramie-k', h, lok, kat + zgiecie);
  czesc(ctx, 'zarlok-kikut-reki', h, [0, 0], kat + Math.PI);
  return true;
}

/** Dowolna wypieczona część żarłoka po nazwie (np. zbliżenie głowy do filmu); `a` — punkt zaczepienia, `kat` — obrót. */
export function rysujCzescZarloka(ctx: CanvasRenderingContext2D, nazwa: string, h: number, a: P, kat: number): boolean {
  if (!zarlokZWypieku()) return false;
  czesc(ctx, nazwa, h, a, kat);
  return true;
}
