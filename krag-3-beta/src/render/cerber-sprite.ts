/**
 * CERBER Z WYPIEKU (Krąg Trzeci, beta) — po uwagach użytkownika (15.11): „wygląda jak kukiełka w przedszkolu”,
 * „możesz go zrobić 3D”, „gry na PS1 wyglądały tylko trochę gorzej — popraw szczegóły”.
 *
 * Model 3D (render/cerber3d.ts) liczy się zbyt wolno, żeby renderować go w każdej klatce, więc wypiekamy go raz
 * (scripts/wypiek-cerbera.mjs → obrazy/cerber/*.webp, położenia w render/cerber-wypiek.ts) i w grze składamy
 * Cerbera z części jak lalkę wycinankę, według tego samego szkieletu (render/cerber-rig.ts):
 *  - ciało (tułów, łapy, grzywa, kolce) — klatka chodu (12), stania, dęba (4), przysiadu (2), leżenia, odrzutu, kamienia;
 *  - ogon — spokojny, wychylony, smagający; obraca się z tułowiem przy staniu dęba;
 *  - trzy szyje — rozciągane i obracane między nasadą na piersi a głową (za tułowiem: pierś zakrywa ich nasady);
 *  - trzy głowy — w 4 kątach × 5 rozwarciach paszczy × 2 stopniach zakrwawienia; resztę kąta dokręca obrót.
 * Do tego to, co było w rysunku 2D: cień, poświata szału, żarzące się rany i złote światło konania, ogień ze
 * środkowej paszczy i żar oczu. Dopóki obrazki się nie wczytały, wołający rysuje Cerbera po staremu (2D).
 */
import { WYPIEK } from './cerber-wypiek';
import { rigCerbera, type Rig, type V3 } from './cerber-rig';
import type { PozaCerbera, PunktyCerbera } from './cerber';

type P = [number, number];

/** Kąt kamery wypieku (render/cerber3d.ts: YAW_CERBERA). */
const YAW = 0.5;
const KATY = [-0.6, 0, 0.6, 1.2];
const PASZCZE = [0, 0.25, 0.5, 0.75, 1];
/** Wysokość modelu do czubka uszu górnej głowy (jednostki) — rysunek 2D miał `h` do czubka najwyższej głowy. */
const WYS_MODELU = 1.12;

const pliki = import.meta.glob('../../obrazy/cerber/*.webp', { eager: true, import: 'default' }) as Record<string, string>;

interface Obraz { img: HTMLImageElement; gotowy: boolean; mip: CanvasImageSource[]; wym: [number, number][] }
const obrazy = new Map<string, Obraz>();
let zaczete = false, gotowych = 0, wszystkich = 0;

function zacznij(): void {
  if (zaczete || typeof Image === 'undefined') return;
  zaczete = true;
  for (const [sciezka, url] of Object.entries(pliki)) {
    const nazwa = sciezka.replace(/^.*\//, '').replace(/\.webp$/i, '');
    if (!WYPIEK[nazwa]) continue;
    const o: Obraz = { img: new Image(), gotowy: false, mip: [], wym: [] };
    wszystkich++;
    o.img.onload = () => { o.gotowy = true; o.mip = [o.img]; o.wym = [[o.img.naturalWidth, o.img.naturalHeight]]; gotowych++; };
    o.img.onerror = () => { wszystkich--; };
    o.img.src = url;
    obrazy.set(nazwa, o);
  }
}

/** Czy obrazki Cerbera są już wczytane (pierwsze wywołanie zaczyna wczytywanie). */
export function cerberZWypieku(): boolean {
  zacznij();
  return wszystkich > 0 && gotowych >= wszystkich;
}

/** Obrazek w rozdzielczości dobranej do skali `f` (piksele ekranu na piksel obrazka): pomniejszenia liczone raz. */
function poziom(o: Obraz, f: number): CanvasImageSource {
  let n = 0;
  while (f * (1 << n) < 0.55 && n < 5) n++;
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

/** Rysuje część `nazwa` z punktem zaczepienia w (0, 0) bieżącego układu; `h` — pikseli na jednostkę modelu. */
function czesc(ctx: CanvasRenderingContext2D, nazwa: string, h: number): void {
  const k = WYPIEK[nazwa], o = obrazy.get(nazwa);
  if (!k || !o?.gotowy) return;
  ctx.drawImage(poziom(o, h / k.S), k.x0 * h, k.y0 * h, (k.w / k.S) * h, (k.h / k.S) * h);
}

const rz = (p: V3, h: number): P => [(p[0] * Math.cos(YAW) + p[2] * Math.sin(YAW)) * h, p[1] * h];
const najblizszy = (lista: number[], v: number): number => {
  let n = 0;
  for (let i = 1; i < lista.length; i++) if (Math.abs(lista[i] - v) < Math.abs(lista[n] - v)) n = i;
  return n;
};
const los = (n: number): number => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/** Klatka ciała dla pozy i poza tułowia, w jakiej ją wypieczono (szkielet liczymy z tej samej, by części pasowały). */
function klatkaCiala(p: PozaCerbera): [string, Partial<PozaCerbera>] {
  const zero = { lezy: 0, deba: 0, przysiad: 0, odrzut: 0, krok: 0, faza: 0, oddech: 0.5 };
  if (p.kamien > 0.5) return p.lezy > 0.5 ? ['cialo-kamien-lezy', { ...zero, lezy: 1 }] : ['cialo-kamien', zero];
  if (p.lezy > 0.5) return ['cialo-lezy', { ...zero, lezy: 1 }];
  if (p.deba > 0.12) { const d = Math.max(1, Math.min(4, Math.round(p.deba * 4))); return [`cialo-deba-${d}`, { ...zero, deba: d * 0.25 }]; }
  if (p.przysiad > 0.25) { const d = p.przysiad > 0.75 ? 2 : 1; return [`cialo-przysiad-${d}`, { ...zero, przysiad: d * 0.5 }]; }
  if (p.odrzut > 0.5) return ['cialo-odrzut', { ...zero, odrzut: 1 }];
  if (p.krok > 0.3) {
    const k = ((Math.round(p.faza / (Math.PI / 6)) % 12) + 12) % 12;
    return [`cialo-krok-${k}`, { ...zero, krok: 1, faza: (k * Math.PI) / 6 }];
  }
  return ['cialo-stoi', zero];
}

let rigSpoczynku: Rig | null = null;
function spoczynek(): Rig {
  if (!rigSpoczynku) {
    const g = { pochyl: 0, paszcza: 0.15, wysun: 0, oczy: 1 };
    rigSpoczynku = rigCerbera({ kamien: 0, lezy: 0, faza: 0, krok: 0, deba: 0, przysiad: 0, odrzut: 0, glowy: [{ ...g }, { ...g }, { ...g }], ogon: 0, bicz: 0, rany: 0, swiatlo: 0, szal: 0, oddech: 0.5, ogien: 0, czas: 0 });
  }
  return rigSpoczynku;
}

/**
 * Rysuje Cerbera z obrazków: stopy w (0, 0) bieżącego układu, `hRys` — wysokość jak w rysunku 2D (do czubka
 * najwyższej głowy). Zwraca punkty (obroża, trzy paszcze, brzuch) w pikselach albo null, gdy obrazki nie są gotowe.
 */
export function rysujCerberaZWypieku(ctx: CanvasRenderingContext2D, hRys: number, p: PozaCerbera): PunktyCerbera | null {
  if (!cerberZWypieku()) return null;
  const h = hRys / WYS_MODELU;
  const t = p.czas / 1000;
  const kam = p.kamien > 0.5;
  const [cialo, pozaCiala] = klatkaCiala(p);
  const rig = rigCerbera({ ...p, ...pozaCiala, glowy: p.glowy });
  const r0 = spoczynek();
  ctx.save();
  // poświata szału (za nim)
  if (p.szal > 0.01 && !kam) {
    const R = hRys * 1.1;
    const g = ctx.createRadialGradient(0, -hRys * 0.5, hRys * 0.1, 0, -hRys * 0.5, R);
    g.addColorStop(0, `rgba(255,40,10,${0.18 * p.szal * (0.7 + 0.3 * Math.sin(t * 7))})`); g.addColorStop(1, 'rgba(150,10,5,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(-R, -hRys * 0.5 - R, R * 2, R * 2); ctx.restore();
  }
  // cień pod nim
  if (!kam) {
    ctx.fillStyle = 'rgba(3,2,2,0.5)';
    ctx.beginPath(); ctx.ellipse(-h * 0.06, 0, h * 0.5, h * 0.04, 0, 0, Math.PI * 2); ctx.fill();
  }
  // ogon (za tułowiem), obrócony z tułowiem
  {
    const nazwa = kam ? 'ogon-kamien' : p.bicz > 0.25 ? (p.bicz > 0.75 ? 'ogon-bicz-2' : 'ogon-bicz-1') : p.ogon < -0.35 ? 'ogon-l' : p.ogon > 0.35 ? 'ogon-p' : 'ogon-0';
    const [x, y] = rz(rig.ogonBaza, h);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-rig.deba); czesc(ctx, nazwa, h); ctx.restore();
  }
  // szyje (za tułowiem: pierś zakrywa ich nasady): obraz z pozy spoczynku przeniesiony na odcinek nasada → koniec
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = rz(rig.nasady[i], h), [bx, by] = rz(rig.konce[i], h);
    const [a0x, a0y] = rz(r0.nasady[i], h), [b0x, b0y] = rz(r0.konce[i], h);
    const k = Math.atan2(by - ay, bx - ax), k0 = Math.atan2(b0y - a0y, b0x - a0x);
    const s = Math.hypot(bx - ax, by - ay) / Math.max(1e-6, Math.hypot(b0x - a0x, b0y - a0y));
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(k); ctx.scale(s, 1); ctx.rotate(-k0);
    czesc(ctx, kam ? `szyja-${i}-kamien` : `szyja-${i}`, h);
    ctx.restore();
  }
  // tułów z łapami
  czesc(ctx, cialo, h);
  // żarzące się rany / złote światło konania na tułowiu
  if (p.rany > 0.02 || p.swiatlo > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const zl = p.swiatlo, n = Math.round(3 + 9 * Math.max(p.rany, zl));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const [sx, sy] = rz(rig.T(-0.42 + los(i * 3 + 1) * 0.7, -0.6 + los(i * 3 + 2) * 0.26, -0.12), h);
      ctx.strokeStyle = zl > 0.05 ? `rgba(255,${200 + 40 * zl},${120 + 80 * zl},${0.4 + 0.6 * zl})` : `rgba(255,${60 + 40 * Math.sin(t * 4 + i)},20,${0.3 + 0.45 * p.rany})`;
      ctx.lineWidth = Math.max(0.8, h * 0.006 * (1 + zl));
      ctx.beginPath(); ctx.moveTo(sx, sy);
      let x = sx, y = sy;
      for (let j = 0; j < 4; j++) { x += (los(i * 17 + j) - 0.5) * h * 0.09; y += (los(i * 29 + j) - 0.3) * h * 0.05; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    if (zl > 0.02) {
      const [bx, by] = rz(rig.brzuch, h);
      const g = ctx.createRadialGradient(bx, by - h * 0.1, 0, bx, by - h * 0.1, h * 0.7);
      g.addColorStop(0, `rgba(255,220,150,${0.35 * zl})`); g.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = g; ctx.fillRect(bx - h * 0.7, by - h * 0.8, h * 1.4, h * 1.4);
    }
    ctx.restore();
  }
  // głowy: dalsza (doberman, wysoko), środkowa (wilk), bliższa (pitbull, nisko)
  const krewG = (p.krew ?? 0.6) >= 0.75 ? 1 : 0;
  for (let i = 0; i < 3; i++) {
    const g = p.glowy[i];
    // głowa: najbliższy wypieczony kąt, reszta obrotem
    {
      const kat = rig.katy[i];
      const a = najblizszy(KATY, kat);
      const nazwa = kam ? `glowa-${i}-a${a}-kamien` : `glowa-${i}-a${a}-p${najblizszy(PASZCZE, g.paszcza)}-k${krewG}`;
      const [x, y] = rz(rig.kotwice[i], h);
      ctx.save(); ctx.translate(x, y); ctx.rotate(kat - KATY[a]); czesc(ctx, nazwa, h); ctx.restore();
    }
    // żar oczu
    if (g.oczy > 0.02) {
      const [x, y] = rz(rig.oczy[i], h);
      const R = h * 0.024 * (0.7 + 0.5 * g.oczy);
      const gg = ctx.createRadialGradient(x, y, 0, x, y, R);
      gg.addColorStop(0, p.swiatlo > 0.3 ? `rgba(255,220,140,${0.4 * g.oczy})` : `rgba(255,70,20,${(kam ? 0.6 : 0.35) * g.oczy})`); gg.addColorStop(1, 'rgba(160,0,0,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gg; ctx.fillRect(x - R, y - R, R * 2, R * 2); ctx.restore();
    }
  }
  const paszcze = rig.paszcze.map((q) => rz(q, h)) as [P, P, P];
  // ogień ze środkowej paszczy
  if (p.ogien > 0.02) {
    const [fx, fy] = paszcze[1];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const u = (t * 2.2 + i / 16) % 1;
      const x = fx + u * hRys * 1.3, y = fy + u * hRys * 0.25 + Math.sin(i * 7 + t * 9) * u * hRys * 0.12;
      const r = hRys * (0.04 + u * 0.16) * p.ogien;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,${210 - u * 120},${90 - u * 80},${0.55 * (1 - u) * p.ogien})`); g.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  ctx.restore();
  return { obroza: rz(rig.obroza, h), paszcze, brzuch: rz(rig.brzuch, h) };
}
