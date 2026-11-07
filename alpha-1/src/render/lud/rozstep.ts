import type { Sim } from '../../sim/sim';
import type { Creature } from '../../sim/creatures';
import type { Camera } from '../camera';
import { rolaPostaci } from '../../sim/lud';
import { ustawienia } from '../../core/settings-store';
import { naSchodach } from '../schody';

/**
 * Rozstęp tłumu — tylko na rysunku, symulacja o nim nie wie. Postacie ludu stojące prawie w tym samym
 * miejscu (dwóch kopaczy przy jednym kaflu, grupka przy siedzibie) rysujemy obok siebie: każda dostaje
 * przesunięcie w poziomie (w kaflach), które płynie ku celowi, więc postacie rozchodzą się krokiem,
 * a nie skaczą.
 *
 * Stopy zostają na podłodze: przesunięcie nie wyprowadza postaci nad pustkę ani w skałę (dalej, niż
 * stoi w symulacji). Gdy miejsca brak — szyb na jeden kafel — drugi staje odrobinę z tyłu: ciemniejszy
 * i rysowany wcześniej, jak dalsza postać na rycinie.
 */

interface Rozstep {
  /** przesunięcie na rysunku (kafle) i jego cel */
  dx: number; cel: number;
  /** 0..1 — o ile postać stoi „z tyłu” (przyciemniona, pod sąsiadem) i cel tego */
  tlo: number; celTlo: number;
  /** granice rysunku w poziomie (kafle świata) z ostatniego układu */
  lo: number; hi: number;
  t: number;
  nowy: boolean;
  /**
   * 6.11: schody kręcone drogi wiernych (render/schody.ts) — o ile postać idzie po spirali (0..1, płynnie przy wejściu
   * i zejściu), gdzie na niej jest (przesunięcie w poziomie i pionie, „w tle” za słupem) i w którą stronę idzie.
   */
  sch: number; schCel: number; hx: number; hy: number; hTlo: number; zw: number; px: number;
  /**
   * Na spirali: numer stopnia pod stopami (ciągły) i z poprzedniej klatki, kąt na spirali, kierunek (1 — schodzi,
   * −1 — wchodzi, 0 — stoi; od kiedy stoi), szerokość sylwetki (1 — bokiem do widza, mniej — gdy obraca się w głąb).
   */
  stopien: number; pStopien: number; kat: number; kier: number; ruchT: number; szer: number;
}

const stan = new WeakMap<Creature, Rozstep>();
let klatka = NaN;

/** Szerokość sylwetki (z narzędziem przy ciele) jako część jej wysokości. */
const SZEROKOSC = 0.34;
/**
 * Odstęp środków dwóch sąsiadów jako część średniej szerokości — każda sylwetka stoi osobno, z małą szparą
 * (przy 0,7 grupa przy siedzibie zlewała się w jedną plamę, a kij pobożnego wchodził w sąsiada).
 */
const ODSTEP = 1.08;
/** Najdalej od miejsca w symulacji (kafle) — szóstka przy siedzibie stoi w symulacji na dwóch kaflach. */
const MAKS = 1.9;
/** Granice szuka się najwyżej tyle kafli w każdą stronę. */
const ZASIEG = Math.ceil(MAKS) + 1;
/** Środek stóp nie bliżej ściany niż tyle (kafle) — pół tułowia. */
const MARGINES = 0.24;
/** Sąsiedzi w jednym rzędzie: różnica wysokości stóp mniejsza niż tyle (kafle). */
const RZAD = 1.5;
/** Stała czasowa płynięcia ku celowi (ms). */
const PLYN_MS = 230;

/** Przesunięcie postaci na rysunku (kafle, w poziomie) — pierścienie, dymki i trafienie palcem idą za nim. */
export function przesuniecieX(c: Creature): number {
  const s = stan.get(c);
  return s ? s.dx * (1 - s.sch) + s.hx * s.sch : 0;
}

/** 6.11: przesunięcie w pionie (kafle) — na schodach kręconych dalsza strona spirali leży wyżej (rzut z góry). */
export function przesuniecieY(c: Creature): number {
  const s = stan.get(c);
  return s ? s.hy * s.sch : 0;
}

/** 0..1 — o ile postać stoi z tyłu (nie zmieściła się obok sąsiada; na schodach kręconych — z tyłu, za słupem). */
export function wTle(c: Creature): number {
  const s = stan.get(c);
  return s ? Math.max(s.tlo, s.hTlo * s.sch) : 0;
}

/** 6.11: zwrot na rysunku (−1, 1), gdy idzie po spirali — w stronę, w którą idzie po stopniach; 0 — jak w symulacji. */
export function zwrotNaRysunku(c: Creature): number {
  const s = stan.get(c);
  return s && s.sch > 0.5 ? s.zw : 0;
}

/**
 * 6.11: szerokość sylwetki na rysunku (0..1) — na spirali postać obraca się z nią: bokiem do widza (z przodu i z tyłu
 * spirali) jest cała, przy ścianach szybu, gdzie idzie w głąb albo ku widzowi, zwęża się jak obracająca się postać.
 */
export function szerokoscNaRysunku(c: Creature): number {
  const s = stan.get(c);
  return s ? 1 + (s.szer - 1) * s.sch : 1;
}

/** 6.11: na schodach kręconych — czy postać jest z tyłu spirali (za płaszczyzną słupa); rysuje się ją przed innymi. */
export function zTyluSchodow(c: Creature): boolean {
  const s = stan.get(c);
  return !!s && s.sch > 0.5 && Math.cos(s.kat) > 0;
}

/** 6.11: chód po schodach kręconych — numer stopnia pod stopami (ciągły) i kierunek (1 — w dół, −1 — w górę, 0 — stoi). */
export function chodNaSchodach(c: Creature): { stopien: number; kier: number } | null {
  const s = stan.get(c);
  return s && s.sch > 0.5 ? { stopien: s.stopien, kier: s.kier } : null;
}

/** Czy postać może zejść z miejsca na rysunku — nie w locie, nie na linie, nie leżąc. */
function moznaRozsunac(sim: Sim, c: Creature): boolean {
  return !c.lot && !c.wDloni && c.naLinie === undefined && !c.naWiadrze && c.vy <= 0.3
    && c.czynnosc !== 'spi' && !((c.ogluszonyDo ?? -1) > sim.tick);
}

/**
 * Granice rysunku w poziomie: postać stojąca na ziemi może przejść tylko po kaflach z podłogą, a wisząca
 * w powietrzu (wspinaczka) — po wolnych; nie dalej niż MAKS i nigdy głębiej w ścianę, niż stoi naprawdę.
 */
function granice(sim: Sim, c: Creature): [number, number] {
  const w = sim.world;
  const tx = Math.floor(c.x), ry = Math.floor(c.y + 0.02);
  const naZiemi = w.solid(tx, ry + 1);
  const wolna = (x: number): boolean => w.inb(x, ry) && !w.solid(x, ry) && (!naZiemi || w.solid(x, ry + 1));
  if (!wolna(tx)) return [c.x, c.x];
  let l = tx, r = tx;
  while (l > tx - ZASIEG && wolna(l - 1)) l--;
  while (r < tx + ZASIEG && wolna(r + 1)) r++;
  return [Math.max(c.x - MAKS, Math.min(c.x, l + MARGINES)), Math.min(c.x + MAKS, Math.max(c.x, r + 1 - MARGINES))];
}

interface Wpis { c: Creature; s: Rozstep; y: number; w: number; q: number; klucz: number }

/**
 * Układ rozstępu na tę klatkę (liczy się raz na `czas` — pierwsza z funkcji rysujących, która go potrzebuje).
 * `wysokosc` — wysokość sylwetki w pikselach ekranu (render/figury.ts: wysokoscPostaci).
 */
export function rozstawTlum(sim: Sim, cam: Camera, czas: number, wysokosc: (c: Creature, zoom: number) => number): void {
  if (czas === klatka) return;
  klatka = czas;
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z - 3, top = cam.y - cam.vh / 2 / z - 3;
  const right = left + cam.vw / z + 6, bottom = top + cam.vh / z + 6;
  // z daleka tłum i tak się grupuje (render/figury.ts: rysujStworzenia) — wtedy wszyscy wracają na swoje miejsca
  const zBliska = z >= 9;
  const wpisy: Wpis[] = [];
  for (const c of sim.creatures) {
    if (c.dead || !rolaPostaci(c)) continue;
    if (c.x < left || c.x > right || c.y < top || c.y > bottom) { stan.delete(c); continue; }
    let s = stan.get(c);
    if (!s) {
      s = { dx: 0, cel: 0, tlo: 0, celTlo: 0, lo: c.x, hi: c.x, t: czas, nowy: true, sch: 0, schCel: 0, hx: 0, hy: 0, hTlo: 0, zw: c.face >= 0 ? 1 : -1, px: c.x,
        stopien: 0, pStopien: NaN, kat: 0, kier: 0, ruchT: -1e9, szer: 1 };
      stan.set(c, s);
    }
    s.cel = 0; s.celTlo = 0;
    // 6.11: na schodach kręconych idzie po spirali — tłum się tu nie rozstępuje
    const ns = moznaRozsunac(sim, c) ? naSchodach(sim, c) : null;
    s.schCel = ns ? 1 : 0;
    if (ns) {
      s.hx = ns.dx; s.hy = ns.dy; s.hTlo = ns.tlo; s.lo = c.x; s.hi = c.x;
      s.stopien = ns.stopien; s.kat = ns.kat;
      continue;
    }
    s.pStopien = NaN;
    if (zBliska && moznaRozsunac(sim, c)) {
      [s.lo, s.hi] = granice(sim, c);
      wpisy.push({ c, s, y: c.y, w: SZEROKOSC * wysokosc(c, z) / z, q: c.x, klucz: c.x + s.dx });
    } else { s.lo = c.x; s.hi = c.x; }
  }
  // rzędy: postacie o podobnej wysokości stóp (łańcuchem)
  wpisy.sort((a, b) => a.y - b.y);
  for (let i = 0; i < wpisy.length;) {
    let j = i + 1;
    while (j < wpisy.length && wpisy[j].y - wpisy[j - 1].y < RZAD) j++;
    if (j - i > 1) rozsun(wpisy.slice(i, j));
    i = j;
  }
  for (const e of wpisy) e.s.cel = e.q - e.c.x;
  // płynięcie ku celowi; granice obowiązują też w drodze (postać nie wchodzi w ścianę, gdy korytarz się zwęża)
  for (const c of sim.creatures) {
    const s = stan.get(c);
    if (!s) continue;
    const dt = Math.max(0, Math.min(250, czas - s.t));
    s.t = czas;
    const k = s.nowy || ustawienia.ograniczRuch ? 1 : 1 - Math.exp(-dt / PLYN_MS);
    const kSch = s.nowy || ustawienia.ograniczRuch ? 1 : 1 - Math.exp(-dt / SCHODY_MS);
    s.nowy = false;
    s.dx += (s.cel - s.dx) * k;
    s.dx = Math.max(s.lo - c.x, Math.min(s.hi - c.x, s.dx));
    if (Math.abs(s.dx) < 1e-3) s.dx = 0;
    s.tlo += (s.celTlo - s.tlo) * k;
    s.sch += (s.schCel - s.sch) * kSch;
    if (s.sch < 1e-3) s.sch = 0;
    // na spirali: kierunek (schodzi czy wchodzi), zwrot i szerokość sylwetki z kierunku marszu po stopniach —
    // schodzący idzie w stronę rosnącego kąta (cos — składowa marszu w poziomie ekranu), wchodzący odwrotnie
    if (s.schCel > 0) {
      if (!Number.isNaN(s.pStopien)) {
        const ds = s.stopien - s.pStopien;
        if (Math.abs(ds) > 0.003) { s.kier = ds > 0 ? 1 : -1; s.ruchT = czas; }
        else if (czas - s.ruchT > 260) s.kier = 0;
      }
      s.pStopien = s.stopien;
      const kierunek = s.kier !== 0 ? s.kier : (s.zw === (Math.cos(s.kat) >= 0 ? 1 : -1) ? 1 : -1);
      const vx = Math.cos(s.kat) * kierunek;
      if (Math.abs(vx) > 0.08) s.zw = vx > 0 ? 1 : -1;
      // (bez wygładzania — szerokość ma iść równo z kątem na spirali; wejście i zejście wygładza `sch`)
      s.szer = 0.34 + 0.66 * Math.abs(vx);
    }
    s.px = c.x + s.dx * (1 - s.sch) + s.hx * s.sch;
  }
}

/** Stała czasowa wejścia na spiralę i zejścia z niej (ms) — krótsza niż rozstęp, żeby stopy trzymały się stopni. */
const SCHODY_MS = 140;

/** Poniżej tej różnicy (kafle) kolejność w rzędzie bierze się z rysunku, nie z symulacji. */
const REMIS = 0.15;

/**
 * Rozsuwa jeden rząd: sąsiedzi ustępują sobie po połowie, w swoich granicach. Kolejność — według miejsca
 * w symulacji (idący mija stojącego, zamiast pchać go przed sobą); prawie w jednym miejscu — według rysunku
 * z poprzedniej klatki i numeru, żeby stojący razem nie zamieniali się miejscami przy każdym drgnięciu.
 */
function rozsun(rzad: Wpis[]): void {
  rzad.sort((a, b) => {
    const d = a.c.x - b.c.x;
    return Math.abs(d) > REMIS ? d : (a.klucz - b.klucz) || (a.c.id - b.c.id);
  });
  for (let it = 0; it < 10; it++) {
    let ruch = false;
    for (let k = 0; k + 1 < rzad.length; k++) {
      const a = rzad[k], b = rzad[k + 1];
      if (Math.abs(a.y - b.y) >= RZAD) continue;
      const brak = ODSTEP * (a.w + b.w) / 2 - (b.q - a.q);
      if (brak <= 1e-3) continue;
      const mozeA = Math.max(0, a.q - a.s.lo), mozeB = Math.max(0, b.s.hi - b.q);
      let da = Math.min(brak / 2, mozeA), db = Math.min(brak / 2, mozeB);
      // czego jeden nie może (ściana), oddaje drugiemu
      const reszta = brak - da - db;
      if (reszta > 1e-4) { const ea = Math.min(reszta, mozeA - da); da += ea; db += Math.min(reszta - ea, mozeB - db); }
      if (da + db < 1e-4) continue;
      a.q -= da; b.q += db;
      ruch = true;
    }
    if (!ruch) break;
  }
  // kto nie zmieścił się obok sąsiada (wąski szyb), staje za nim — zawsze ten z wyższym numerem;
  // im ciaśniej, tym głębiej w cieniu
  for (let k = 0; k + 1 < rzad.length; k++) {
    const a = rzad[k], b = rzad[k + 1];
    if (Math.abs(a.y - b.y) >= RZAD * 0.6) continue;
    const d = ODSTEP * (a.w + b.w) / 2;
    const ciasno = Math.min(1, Math.max(0, (0.92 * d - (b.q - a.q)) / (0.45 * d)));
    if (ciasno > 0) { const s = (a.c.id > b.c.id ? a : b).s; s.celTlo = Math.max(s.celTlo, ciasno); }
  }
}
