import type { Sim } from './sim';
import type { Creature } from './creatures';
import { RACES } from './races';
import { PASSABLE } from './tiles';
import { WORLD_W, WORLD_H } from './world';

/**
 * Szukanie drogi po kaflach — wszerz, z fizyką, jaką stworzenia naprawdę mają:
 * po podłodze się chodzi, przy ścianie wspina i zsuwa, z krawędzi spada, na półkę
 * wchodzi z wiszenia. Magmy i (dla niepływających) głębokiej wody się nie dotyka,
 * a nad jezioro ognia nie wychodzi. Wcześniej każdy szedł „na wprost" do celu i utykał
 * pod pierwszą półką: głodni umierali pod grzybem, Żużlowcy pod rudą.
 *
 * Droga to lista kafli (bez kafla startowego). Szukanie ma limit węzłów i limit na tik —
 * gdy go zabraknie, stworzenie idzie po staremu, na przełaj i z kilofem.
 */

const N = WORLD_W * WORLD_H;
const znak = new Int32Array(N);
const skad = new Int32Array(N);
const kolejka = new Int32Array(N);
let pokolenie = 0;

/** Ile szukań zostało w tym tiku — reszta czeka albo idzie na przełaj. */
let budzet = 0;
export function nowyTik(ile = 18): void { budzet = ile; }

function wolny(sim: Sim, i: number, plywa: boolean): boolean {
  const w = sim.world;
  return PASSABLE[w.tile[i]] === 1 && w.magma[i] === 0 && (plywa || w.water[i] <= 5);
}

/** Czy w tym kafelku da się wisieć — ściana z boku albo krawędź pod ręką. */
export function uchwyt(sim: Sim, x: number, y: number): boolean {
  const w = sim.world;
  return w.solid(x - 1, y) || w.solid(x + 1, y) || w.solid(x - 1, y + 1) || w.solid(x + 1, y + 1);
}

/** Czy tu się stoi: pod spodem lita skała albo woda, na której się unosi. */
function stoi(sim: Sim, x: number, y: number): boolean {
  const w = sim.world;
  if (!w.inb(x, y + 1)) return true;
  return w.solid(x, y + 1) || w.water[w.idx(x, y + 1)] >= 4;
}

/** Spadając stąd, wylądowałby w ogniu. */
function nadOgniem(sim: Sim, x: number, y: number): boolean {
  const w = sim.world;
  for (let yy = y + 1; yy <= y + 16 && yy < w.h; yy++) {
    const j = w.idx(x, yy);
    if (w.magma[j] > 0) return true;
    if (PASSABLE[w.tile[j]] !== 1 || w.water[j] >= 4) return false;
  }
  return false;
}

/**
 * Najbliższy drogą kafel spełniający `cel`. Zwraca listę kafli do przejścia
 * (pusta, gdy cel jest tu, gdzie stoi) albo null, gdy nie ma drogi w zasięgu
 * lub skończył się budżet tiku.
 */
export function szukajDrogi(
  sim: Sim, c: Creature, cel: (i: number, x: number, y: number) => boolean, limit = 1400,
): number[] | null {
  if (budzet <= 0) return null;
  budzet--;
  const w = sim.world;
  const W = w.w;
  const plywa = RACES[c.race].swims;
  const sx = Math.floor(c.x), sy = Math.floor(c.y);
  if (!w.inb(sx, sy)) return null;
  pokolenie++;
  if (pokolenie > 2_000_000_000) { znak.fill(0); pokolenie = 1; }
  const start = sy * W + sx;
  let glowa = 0, ogon = 0;
  kolejka[ogon++] = start;
  znak[start] = pokolenie;
  skad[start] = -1;

  const dodaj = (j: number, od: number): void => {
    if (znak[j] === pokolenie) return;
    znak[j] = pokolenie;
    skad[j] = od;
    kolejka[ogon++] = j;
  };

  while (glowa < ogon && ogon < limit) {
    const i = kolejka[glowa++];
    const x = i % W, y = (i / W) | 0;
    if (cel(i, x, y)) {
      const droga: number[] = [];
      for (let k = i; k !== start; k = skad[k]) droga.push(k);
      droga.reverse();
      return droga;
    }
    const naPodlodze = stoi(sim, x, y);
    const wisi = !naPodlodze && uchwyt(sim, x, y);
    // w dół: z wiszenia albo w locie
    if (!naPodlodze && y + 1 < WORLD_H && wolny(sim, i + W, plywa)) dodaj(i + W, i);
    if (!naPodlodze && !wisi) continue;            // w locie nie ma innego wyboru
    // w górę: tylko tam, gdzie da się chwycić
    if (y > 0 && wolny(sim, i - W, plywa) && uchwyt(sim, x, y - 1)) dodaj(i - W, i);
    // w bok
    for (const dx of [-1, 1]) {
      const nx = x + dx;
      if (nx < 0 || nx >= W) continue;
      const j = i + dx;
      if (!wolny(sim, j, plywa)) continue;
      const tamStoi = stoi(sim, nx, y);
      // z wiszenia tylko na półkę; z podłogi wszędzie, byle nie nad ogień
      if (wisi && !tamStoi) continue;
      if (!tamStoi && nadOgniem(sim, nx, y)) continue;
      dodaj(j, i);
    }
  }
  return null;
}

/** Na drodze do celu: 1 = doszedł, 0 = idzie, -1 = zgubił drogę. Sam ruch robi `krok`. */
export function nastepnyKafel(sim: Sim, c: Creature): number {
  const d = c.droga;
  if (!d) return -1;
  const w = sim.world;
  const cur = w.idx(Math.floor(c.x), Math.floor(c.y));
  let i = c.drogaI ?? 0;
  // doszedł do któregoś z dalszych kafli (np. spadł kawałek) — przeskakuje
  const dalej = d.indexOf(cur, i);
  if (dalej >= 0) i = dalej + 1;
  c.drogaI = i;
  if (i >= d.length) return -2;                  // na miejscu
  const next = d[i];
  const nx = next % w.w, ny = (next / w.w) | 0;
  const cx = cur % w.w, cy = (cur / w.w) | 0;
  if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) return -1;
  if (!wolny(sim, next, RACES[c.race].swims)) return -1;
  return next;
}
