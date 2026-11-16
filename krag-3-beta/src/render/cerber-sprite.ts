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

/**
 * Tętnicza fontanna z kikuta szyi (Krąg Trzeci, 16.11): łuki kropel wzdłuż osi szyi w rytm serca, coraz słabsze przez
 * ok. 9 s po ścięciu; potem krew już tylko cieknie po kikucie. `kat` — kierunek szyi na ekranie, `ms` — od ścięcia.
 */
function tryska(ctx: CanvasRenderingContext2D, x: number, y: number, kat: number, h: number, ms: number): void {
  const swiezo = Math.max(0, 1 - ms / 9000);
  const t = ms / 1000;
  ctx.save();
  if (swiezo > 0) {
    const serce = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.3)), 2);
    // strumień: gęsty łuk tuż przy kikucie
    ctx.strokeStyle = `rgba(110,4,2,${0.85 * swiezo * serce})`;
    ctx.lineWidth = Math.max(1.5, h * 0.022 * swiezo * serce); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y);
    const v0 = h * 0.5 * (0.5 + 0.5 * swiezo) * serce;
    for (let i = 1; i <= 8; i++) {
      const f = i / 8 * 0.45;
      ctx.lineTo(x + Math.cos(kat) * v0 * f, y + Math.sin(kat) * v0 * f + h * 1.4 * f * f);
    }
    ctx.stroke();
    // krople: rozlatują się z łuku i spadają
    const n = 30;
    for (let i = 0; i < n; i++) {
      const f = ((t * 1.25) + i / n) % 1;
      const r1 = los(i * 13 + 5), r2 = los(i * 7 + 11);
      const v = h * (0.35 + 0.45 * r1) * (0.4 + 0.6 * swiezo) * (0.6 + 0.4 * serce);
      const a = kat + (r2 - 0.5) * 0.6;
      const px = x + Math.cos(a) * v * f, py = y + Math.sin(a) * v * f + h * 1.5 * f * f;
      const r = Math.max(0.8, h * (0.005 + 0.007 * r1) * (1 - 0.5 * f));
      ctx.fillStyle = `rgba(${96 + 40 * r2},4,3,${(0.9 - 0.6 * f) * swiezo})`;
      ctx.beginPath(); ctx.ellipse(px, py, r * 1.6, r, a + f, 0, Math.PI * 2); ctx.fill();
    }
  }
  // cieknie: krople zsuwają się po kikucie i kapią
  ctx.fillStyle = 'rgba(90,4,3,0.85)';
  for (let i = 0; i < 4; i++) {
    const f = ((t * 0.6) + i * 0.27) % 1;
    ctx.beginPath(); ctx.ellipse(x + (i - 1.5) * h * 0.012, y + h * 0.02 + f * h * 0.5, h * 0.006, h * 0.012 * (1 + f), 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Bryzg krwi z paszczy w chwili ugryzienia: krople na boki i w dół, czerwona mgiełka; `f` — postęp 0…1. */
function bryzgPaszczy(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, f: number, ziarno: number): void {
  ctx.save();
  const mg = ctx.createRadialGradient(x, y, 0, x, y, h * 0.16);
  mg.addColorStop(0, `rgba(120,6,4,${0.45 * (1 - f)})`); mg.addColorStop(1, 'rgba(90,0,0,0)');
  ctx.fillStyle = mg; ctx.fillRect(x - h * 0.16, y - h * 0.16, h * 0.32, h * 0.32);
  for (let i = 0; i < 22; i++) {
    const r1 = los(ziarno * 31 + i * 7), r2 = los(ziarno * 13 + i * 11);
    const a = -Math.PI * 0.15 + (r1 - 0.5) * Math.PI * 1.5;
    const v = h * (0.12 + 0.3 * r2);
    const px = x + Math.cos(a) * v * f, py = y + Math.sin(a) * v * f + h * 0.5 * f * f;
    const r = Math.max(0.8, h * (0.004 + 0.007 * r1) * (1 - 0.5 * f));
    ctx.fillStyle = `rgba(${100 + 50 * r2},5,3,${0.95 - 0.6 * f})`;
    ctx.beginPath(); ctx.ellipse(px, py, r * 1.5, r, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Fala po posadzce od łap psa (tupnięcie, uderzenie w ziemię, wycie): spłaszczony krąg pyłu i lecące odłamki. */
function fala(ctx: CanvasRenderingContext2D, x: number, h: number, f: number): void {
  ctx.save();
  const R = h * (0.25 + 1.5 * f);
  ctx.strokeStyle = `rgba(170,150,128,${0.55 * (1 - f)})`; ctx.lineWidth = Math.max(1.5, h * 0.02 * (1 - f));
  ctx.beginPath(); ctx.ellipse(x, 0, R, R * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(200,80,40,${0.35 * (1 - f)})`; ctx.lineWidth = Math.max(1, h * 0.01 * (1 - f));
  ctx.beginPath(); ctx.ellipse(x, 0, R * 0.7, R * 0.085, 0, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const s = i % 2 ? 1 : -1, r1 = los(i * 5 + 3), r2 = los(i * 9 + 1);
    const px = x + s * R * (0.5 + 0.5 * r1), py = -h * (0.05 + 0.25 * r2) * Math.sin(Math.PI * Math.min(1, f * 1.3));
    ctx.fillStyle = `rgba(${90 + 40 * r2},${80 + 30 * r2},${70 + 20 * r2},${0.8 * (1 - f)})`;
    ctx.fillRect(px - h * 0.006, py - h * 0.006, h * (0.008 + 0.01 * r1), h * (0.008 + 0.01 * r1));
  }
  ctx.restore();
}

/**
 * Ścięta głowa Cerbera leżąca na posadzce (Krąg Trzeci, 16.11): `ctx` w punkcie na posadzce, zwrot już ustawiony,
 * `hRys` — wysokość Cerbera jak w rysujCerbera, `ms` — od ścięcia (kałuża rośnie, krew sączy się z karku).
 */
export function rysujScietaGlowe(ctx: CanvasRenderingContext2D, nr: number, hRys: number, ms: number): void {
  if (!cerberZWypieku()) return;
  const h = hRys / WYS_MODELU;
  const k = Math.min(1, ms / 3000);
  ctx.save();
  ctx.fillStyle = 'rgba(70,3,2,0.9)';
  ctx.beginPath(); ctx.ellipse(-h * 0.08, 0, h * (0.06 + 0.2 * k), h * (0.012 + 0.025 * k), 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(150,30,24,0.25)';
  ctx.beginPath(); ctx.ellipse(-h * 0.12, -h * 0.004, h * 0.08 * k, h * 0.008 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -h * 0.085);
  ctx.rotate(0.42);
  czesc(ctx, `glowa-${nr}-odcieta`, h);
  ctx.restore();
}

/** Klatka ciała dla pozy i poza tułowia, w jakiej ją wypieczono (szkielet liczymy z tej samej, by części pasowały). */
function klatkaCiala(p: PozaCerbera): [string, Partial<PozaCerbera>] {
  const zero = { lezy: 0, deba: 0, przysiad: 0, odrzut: 0, krok: 0, faza: 0, oddech: 0.5, lapa: 0, skok: 0, kleka: 0 };
  if (p.kamien > 0.5) return p.lezy > 0.5 ? ['cialo-kamien-lezy', { ...zero, lezy: 1 }] : ['cialo-kamien', zero];
  if (p.lezy > 0.5) return ['cialo-lezy', { ...zero, lezy: 1 }];
  if ((p.kleka ?? 0) > 0.45) return ['cialo-kleka', { ...zero, kleka: 1 }];
  const L = p.lapa ?? 0;
  if (L > 0.06 && L < 0.96) { const fazy = [0.18, 0.35, 0.48, 0.62, 0.82], n = najblizszy(fazy, L); return [`cialo-lapa-${n + 1}`, { ...zero, lapa: fazy[n] }]; }
  if ((p.skok ?? 0) > 0.25) { const n = (p.skok ?? 0) > 0.75 ? 2 : 1; return [`cialo-skok-${n}`, { ...zero, skok: n * 0.5 }]; }
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
  // szyje (za tułowiem: pierś zakrywa ich nasady): obraz z pozy spoczynku przeniesiony na odcinek nasada → koniec;
  // ścięta głowa — zostaje kikut szyi (ucięty w połowie), z którego bije krew
  const odc = kam ? [] : p.odciete ?? [];
  const kikuty: { x: number; y: number; kat: number; ms: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = rz(rig.nasady[i], h), [bx, by] = rz(rig.konce[i], h);
    const [a0x, a0y] = rz(r0.nasady[i], h), [b0x, b0y] = rz(r0.konce[i], h);
    const k = Math.atan2(by - ay, bx - ax), k0 = Math.atan2(b0y - a0y, b0x - a0x);
    const j = odc.indexOf(i);
    if (j >= 0) {
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(k - k0); czesc(ctx, `szyja-${i}-kikut`, h); ctx.restore();
      const kx = (b0x - a0x) * 0.5, ky = (b0y - a0y) * 0.5, c = Math.cos(k - k0), sn = Math.sin(k - k0);
      kikuty.push({ x: ax + kx * c - ky * sn, y: ay + kx * sn + ky * c, kat: k, ms: p.odcieteMs?.[j] ?? 1e6 });
      continue;
    }
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
    if (odc.includes(i)) continue;
    // głowa: najbliższy wypieczony kąt, reszta obrotem
    {
      const kat = rig.katy[i];
      const a = najblizszy(KATY, kat);
      const nazwa = kam ? `glowa-${i}-a${a}-kamien` : `glowa-${i}-a${a}-p${najblizszy(PASZCZE, g.paszcza)}-k${krewG}`;
      const [x, y] = rz(rig.kotwice[i], h);
      // smuga: szybki rzut łbem naprzód — ten sam łeb dwa razy za sobą, coraz słabiej
      const sm = kam ? 0 : g.smuga ?? 0;
      if (sm > 0.05) {
        const [kx, ky] = rz(rig.konce[i], h);
        const dx = x - kx, dy = y - ky, l = Math.hypot(dx, dy) || 1;
        for (const [d, al] of [[0.07, 0.32], [0.14, 0.16], [0.21, 0.08]]) {
          ctx.save(); ctx.globalAlpha *= al * sm;
          ctx.translate(x - (dx / l) * h * d * sm, y - (dy / l) * h * d * sm); ctx.rotate(kat - KATY[a]); czesc(ctx, nazwa, h);
          ctx.restore();
        }
      }
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
  // krew z kikutów: fontanna w rytm serca (słabnie), potem cieknie
  for (const kk of kikuty) tryska(ctx, kk.x, kk.y, kk.kat, h, kk.ms);
  const paszcze = rig.paszcze.map((q) => rz(q, h)) as [P, P, P];
  // kły trafiły: krew bryzga z paszczy
  for (let i = 0; i < 3; i++) {
    const f = p.glowy[i].ugryz ?? 0;
    if (f > 0 && f < 1 && !odc.includes(i)) bryzgPaszczy(ctx, paszcze[i][0], paszcze[i][1], h, f, i * 17 + Math.floor(p.czas / 2000));
  }
  // fala uderzenia / wycia po posadzce: krąg pyłu i odłamków
  if ((p.fala ?? 0) > 0 && (p.fala ?? 0) < 1 && !kam) fala(ctx, rz(rig.brzuch, h)[0], h, p.fala ?? 0);
  // ogień ze środkowej paszczy
  if (p.ogien > 0.02) {
    const [fx, fy] = paszcze[p.ogienGlowa ?? 1];
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
