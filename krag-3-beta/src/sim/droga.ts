import type { Sim } from './sim';
import type { Creature } from './creatures';
import { RACES } from './races';
import { HARDNESS, PASSABLE, T } from './tiles';
import { LUD, REMAKE } from '../nastawy/lud';
import { SWIAT } from '../nastawy/swiat';
import { WORLD_W, WORLD_H } from './world';

/**
 * Szukanie drogi po kaflach — wszerz, z fizyką, jaką stworzenia naprawdę mają:
 * po podłodze się chodzi, przy ścianie wspina i zsuwa, z krawędzi spada, na półkę
 * wchodzi z wiszenia. Magmy i (dla niepływających) głębokiej wody się nie dotyka,
 * a nad jezioro ognia nie wychodzi. Wcześniej każdy szedł „na wprost" do celu i utykał
 * pod pierwszą półką: głodni umierali pod grzybem, Żużlowcy pod rudą.
 *
 * Remake v2: lud nie wspina się po ścianach i nie ma lin ani klamer — z podłogi wchodzi
 * najwyżej o jeden kafel (na stopień), a wyżej musi wykuć sobie schody (creatures.ts).
 * Alpha: albo wejść po linie, którą powiesił gracz (albo która sama spadła na zakręcie drogi wiernych) — na linie
 * się wisi (`stoi`), więc wchodzi się po niej kafel po kaflu i tak samo schodzi.
 * W dół łatwiej: szybem zsuwa się po ścianach, z niewysokiej półki zeskakuje; w przepaść
 * głębszą niż `LUD.spadekMaks` sam nie skacze.
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
/** Ile szukań zostało w tym tiku — żeby odróżnić „nie ma drogi" od „nie było czasu szukać". */
export function budzetDrog(): number { return budzet; }

export function wolny(sim: Sim, i: number, plywa: boolean): boolean {
  const w = sim.world;
  return PASSABLE[w.tile[i]] === 1 && w.magma[i] === 0 && (plywa || w.water[i] <= 5);
}

/** Remake v2: czy to lud gracza — on chodzi po nowemu: najwyżej stopień w górę, wyżej kuje schody. */
export function ludRuch(c: Creature): boolean {
  return REMAKE && c.race === 0 && !c.straznik;
}

/** Czy w tym kafelku da się wisieć — ściana z boku albo krawędź pod ręką. */
export function uchwyt(sim: Sim, x: number, y: number): boolean {
  const w = sim.world;
  return w.solid(x - 1, y) || w.solid(x + 1, y) || w.solid(x - 1, y + 1) || w.solid(x + 1, y + 1);
}

/** Czy tu się stoi: pod spodem lita skała albo woda, na której się unosi — albo na linie (Alpha; w 3d były tu drabiny). */
export function stoi(sim: Sim, x: number, y: number): boolean {
  const w = sim.world;
  if (!w.inb(x, y + 1)) return true;
  if (w.lina[y * w.w + x] === 1 || w.schody[y * w.w + x] === 1) return true;
  return w.solid(x, y + 1) || w.water[w.idx(x, y + 1)] >= 4;
}

/** Ile pustych kafli ziała pod (x, y), licząc do pierwszej podłogi (najwyżej limit+1). */
export function glebiaPod(sim: Sim, x: number, y: number, limit: number): number {
  const w = sim.world;
  let n = 0;
  for (let yy = y + 1; yy < w.h && n <= limit; yy++) {
    if (!w.passable(x, yy) || w.water[w.idx(x, yy)] >= 4) break;
    n++;
  }
  return n;
}

/**
 * Remake v1: krok w przepaść — tu nie ma podłogi ani ściany do trzymania, a pod spodem
 * ziała pustka głębsza niż `LUD.spadekMaks`. Lud tak nie chodzi: zeskok w jaskinię
 * bez dna to droga w jedną stronę (robotnicy lądowali przy rdzeniu w pół minuty).
 */
export function przepasc(sim: Sim, x: number, y: number): boolean {
  return !stoi(sim, x, y) && !uchwyt(sim, x, y) && glebiaPod(sim, x, y, LUD.spadekMaks) > LUD.spadekMaks;
}

/** Spadając stąd, wylądowałby w ogniu. */
export function nadOgniem(sim: Sim, x: number, y: number): boolean {
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
  // lud omija przepaści i w górę wchodzi tylko z podłogi, o jeden kafel (Remake v2)
  const ostrozny = ludRuch(c);
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
    // z liny (i ze schodów drogi wiernych) — w dół, niżej po linie albo na podłogę pod nią
    if ((w.lina[i] === 1 || w.schody[i] === 1) && y + 1 < WORLD_H && wolny(sim, i + W, plywa)) dodaj(i + W, i);
    // w dół: z wiszenia albo w locie
    if (!naPodlodze && y + 1 < WORLD_H && wolny(sim, i + W, plywa) && !(ostrozny && wisi && przepasc(sim, x, y + 1))) dodaj(i + W, i);
    if (!naPodlodze && !wisi) continue;            // w locie nie ma innego wyboru
    // w górę: tylko tam, gdzie da się chwycić — lud tylko z podłogi, na stopień (dalej już tylko w bok, na półkę)
    if (y > 0 && wolny(sim, i - W, plywa) && (ostrozny ? naPodlodze : uchwyt(sim, x, y - 1))) dodaj(i - W, i);
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
      if (ostrozny && przepasc(sim, nx, y)) continue;
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

// ------------------------------------------------------------------ droga z kopaniem (Remake v2)

/** Koszt wykucia kafla (> 0), albo -1, gdy tego kafla kuć nie wolno albo nie da się. */
export type KosztKucia = (i: number, x: number, y: number) => number;

const odlK = new Int32Array(N);
const skadK = new Int32Array(N);
const znakK = new Int32Array(N);
let pokolenieK = 0;

/** Czy kafel `j` leży na łańcuchu poprzedników `i` (najwyżej `ile` kroków wstecz, licząc z `i`). */
function naLancuchu(i: number, j: number, ile: number): boolean {
  for (let k = i, n = 0; k >= 0 && n < ile; k = skadK[k], n++) if (k === j) return true;
  return false;
}

/** Widok po cztery bajty na tablicę kafli (długość świata dzieli się przez 4) — do szybkiego „czy jest tu cokolwiek”. */
const slowa = new WeakMap<Uint8Array, Uint32Array>();

/**
 * Czy w tablicy kafli (woda, magma) jest choć jedna niezerowa wartość. Pełny przegląd — kilka mikrosekund, liczony
 * raz na szukanie, nie raz na kafel: w Alphie płynów nie ma wcale (SWIAT.plyny), a sprawdzanie ich wokół każdego
 * kafla (5×5 magmy, 3×3 wody, kolumna „nad ogniem”) było połową czasu szukania z kopaniem.
 */
export function maCos(a: Uint8Array): boolean {
  let s = slowa.get(a);
  if (!s) {
    if (a.byteOffset % 4 !== 0 || a.length % 4 !== 0) { for (let i = 0; i < a.length; i++) if (a[i] !== 0) return true; return false; }
    s = new Uint32Array(a.buffer, a.byteOffset, a.length >> 2);
    slowa.set(a, s);
  }
  for (let i = 0; i < s.length; i++) if (s[i] !== 0) return true;
  return false;
}

/**
 * Remake v2: droga, na której wolno kuć skałę — gdy zwykłej nie ma, lud wykuwa sobie przejście sam.
 * Ruch jak w `szukajDrogi` dla ludu: w górę tylko z podłogi, o jeden kafel, a stamtąd już tylko w bok
 * na półkę; z wiszenia w dół albo na półkę; w przepaść ani nad ogień nie wchodzi. Lity kafel kosztuje
 * tyle, ile zwraca `koszt` (i staje się pustką, gdy go wykuje): pod górę wychodzą z tego schody po skosie —
 * kafel nad głową i stopień przed sobą, a kafel pod stopniem zostaje. Stopnia, który sam przed chwilą wybił,
 * nie podkopie (kilka kroków wstecz), więc schody nie zawracają — w dwóch wymiarach zawrócić się nie da.
 * Kuć wolno tylko stojąc (albo nad sobą — kafel pod stopniem kuje się z podłogi przed wejściem).
 *
 * `starty` — kafle, z których się rusza; zwraca kafle od startu (bez niego) do celu i start, z którego
 * wyszła droga — albo null, gdy celu nie ma w zasięgu `limit` przejrzanych kafli.
 */
export interface OpcjeKopania {
  /** koszt wykucia litego kafla (albo -1 — nie wolno) */
  koszt: KosztKucia;
  /** najwyżej tyle przejrzanych kafli */
  limit?: number;
  plywa?: boolean;
  /** liczy się z budżetu szukań tiku (planer drogi wiernych — nie) */
  zBudzetu?: boolean;
  /** dodatkowo: przez które kafle (wolne i lite) w ogóle wolno iść */
  dozwolony?: (i: number, x: number, y: number) => boolean;
  /**
   * Alpha: droga schodami — w dół najwyżej o jeden kafel (z powietrza tylko na podłogę). Taki zeskok da się odwrócić
   * (w drugą stronę to wejście na stopień), ale nie zakręt: gdy schody zawracają, kolumna przy zakręcie ma cztery
   * puste kafle i pod górę trzeba by wejść o dwa — w dwóch wymiarach zawrócić schodami w obie strony się nie da.
   */
  dwukierunkowa?: boolean;
}

export function szukajKopiac(
  sim: Sim, starty: readonly number[], cel: (i: number, x: number, y: number) => boolean, op: OpcjeKopania,
): { droga: number[]; start: number } | null {
  const w = sim.world, W = w.w;
  const { koszt, limit = 6000, plywa = false, zBudzetu = true, dozwolony, dwukierunkowa = false } = op;
  if (!starty.length) return null;
  // szukanie z kopaniem jest droższe od zwykłego — liczy się za dwa z budżetu tiku
  if (zBudzetu) { if (budzet < 2) return null; budzet -= 2; }
  pokolenieK++;
  if (pokolenieK > 2_000_000_000) { znakK.fill(0); pokolenieK = 1; }
  const pk = pokolenieK;
  const tile = w.tile;
  // bez magmy w świecie nikt nie stanie „nad ogniem” — nie trzeba patrzeć w głąb kolumny pod każdym krokiem w bok
  const ogien = maCos(w.magma);
  // kubełki kosztów (koszty są małymi liczbami całkowitymi)
  const KUBLY = 32;
  const kubly: number[][] = Array.from({ length: KUBLY }, () => []);
  let zostalo = 0;
  const wstaw = (j: number, d: number, od: number): void => {
    if (znakK[j] === pk && d >= odlK[j]) return;
    znakK[j] = pk; odlK[j] = d; skadK[j] = od;
    kubly[d % KUBLY].push(j); zostalo++;
  };
  for (const s of starty) wstaw(s, 0, -1);
  const lity = (j: number) => PASSABLE[tile[j]] !== 1;
  // pustka po drodze: wolny kafel albo lity, który ta droga przed chwilą wykuła (kafla, do którego szukanie jeszcze
  // nie doszło, na łańcuchu poprzedników być nie może — wtedy łańcucha nie trzeba przechodzić)
  const kuty = (i: number, j: number) => lity(j) && znakK[j] === pk && naLancuchu(i, j, 8);
  const podloga = (i: number, j: number) => {
    // czy pod kaflem `j` jest na czym stanąć, gdy idzie się z `i`
    // (w szybie drogi wiernych — zawsze: wykuty kafel szybu dostaje schody)
    if (w.schody[j] === 1 || (w.szybDrogi.x1 >= 0 && w.wSzybie(j % W, (j / W) | 0))) return true;
    const b = j + W;
    if (b >= N) return true;
    if (w.water[b] >= 4) return true;
    return lity(b) && !kuty(i, b);
  };
  const sciana = (x: number, y: number) => w.solid(x - 1, y) || w.solid(x + 1, y) || w.solid(x - 1, y + 1) || w.solid(x + 1, y + 1);
  // Alpha (droga w obie strony): zszedł do `i` o kafel — dalej w dół już nie (dwa kroki w dół pod rząd to szyb,
  // którego podłogi następny krok wykuwa: po wykopaniu zostaje zeskok, którym się nie wróci) — w dół schodami
  const wDolWolno = (i: number, j: number) => !dwukierunkowa || (skadK[i] !== i - W && podloga(i, j));
  // wejście z `i` (odległość `d`) na kafel `j` (wolny albo do wykucia) za `krok` + koszt kucia
  const wejdz = (i: number, d: number, j: number, nx: number, ny: number, mozeKuc: boolean): void => {
    if (j < 0 || j >= N || nx < 0 || nx >= W) return;
    if (dozwolony && !dozwolony(j, nx, ny)) return;
    if (lity(j) && !kuty(i, j)) {
      if (!mozeKuc) return;
      const k = koszt(j, nx, ny);
      if (k < 0) return;
      wstaw(j, d + 1 + Math.min(KUBLY - 2, k), i);
      return;
    }
    if (!wolny(sim, j, plywa) && !kuty(i, j)) return;
    wstaw(j, d + 1, i);
  };
  let obejrzane = 0;
  for (let d = 0; zostalo > 0; d++) {
    const kubel = kubly[d % KUBLY];
    while (kubel.length) {
      const i = kubel.pop()!;
      zostalo--;
      if (odlK[i] !== d || znakK[i] !== pk) continue;
      const x = i % W, y = (i / W) | 0;
      if (cel(i, x, y)) {
        const droga: number[] = [];
        let k = i;
        for (; skadK[k] !== -1; k = skadK[k]) droga.push(k);
        droga.reverse();
        return { droga, start: k };
      }
      if (++obejrzane > limit) return null;
      const stoiTu = podloga(i, i);
      const wisiTu = !stoiTu && sciana(x, y);
      // wszedł tu na stopień, prosto z podłogi pod spodem — kafel przed sobą wykuł, zanim się podciągnął
      const zeStopnia = skadK[i] === i + W;
      if (!stoiTu) {
        // w locie albo na ścianie: w dół (byle nie puścić się nad przepaścią) albo z wiszenia na półkę
        if (y + 1 < WORLD_H && (wolny(sim, i + W, plywa) || kuty(i, i + W)) && !(wisiTu && przepasc(sim, x, y + 1))
            && wDolWolno(i, i + W) && (!dozwolony || dozwolony(i + W, x, y + 1))) wstaw(i + W, d + 1, i);
        if (wisiTu) {
          for (let dx = -1; dx <= 1; dx += 2) {
            const j = i + dx;
            if (x + dx < 0 || x + dx >= W) continue;
            // na półkę: kafel z podłogą (do wykucia tylko zaraz po wejściu na stopień — kuje się go, stojąc niżej)
            if (podloga(i, j)) wejdz(i, d, j, x + dx, y, zeStopnia);
          }
        }
        continue;
      }
      // z podłogi: w bok (skrajem półki — byle nie w przepaść ani nad ogień), na stopień w górę, kucie w dół
      for (let dx = -1; dx <= 1; dx += 2) {
        const nx = x + dx;
        if (nx < 0 || nx >= W) continue;
        const j = i + dx;
        if (!lity(j) || kuty(i, j)) {
          if (!podloga(i, j) && (przepasc(sim, nx, y) || (ogien && nadOgniem(sim, nx, y)))) continue;
        } else if (!podloga(i, j) && glebiaPod(sim, nx, y, LUD.spadekMaks) > LUD.spadekMaks && !sciana(nx, y)) continue;
        wejdz(i, d, j, nx, y, true);
      }
      if (y > 0) wejdz(i, d, i - W, x, y - 1, true);
      // ze schodów drogi wiernych — w dół po nich
      if (w.schody[i] === 1 && i + W < N && wolny(sim, i + W, plywa) && (!dozwolony || dozwolony(i + W, x, y + 1))) wstaw(i + W, d + 1, i);
      const b = i + W;
      if (b < N && lity(b) && !kuty(i, b) && (b + W >= N || !(glebiaPod(sim, x, y + 1, LUD.spadekMaks) > LUD.spadekMaks && !sciana(x, y + 1)))
          && wDolWolno(i, b)) wejdz(i, d, b, x, y + 1, true);
    }
    if (d > N * 4) break;
  }
  return null;
}

/** Kafle `sciezka` planu drogi wiernych jako maska świata — liczona raz, przy pierwszym pytaniu (plan się nie zmienia). */
const maskiDrogi = new WeakMap<NonNullable<Sim['planDrogi']>, Uint8Array>();

/** Koszt kucia dla ludu: ziemia tanio, skała drożej; nie przy ogniu, wodzie, rdzeniu ani w skorupie. */
/**
 * Alpha (jedno wiadro): kafel tuż pod złotą kreską drogi wiernych, który sam do niej nie należy — jej podłoga.
 * Tego nikt z ludu nie kuje (jak przy „kop żyłę” i planach pomieszczeń): wykuty stopień urywał drogę w obie strony
 * i cała drużyna zostawała w krypcie, z dala od jedynego wiadra.
 */
export function podDroga(sim: Sim, i: number): boolean {
  const p = sim.planDrogi;
  if (!p || i < WORLD_W) return false;
  // szyb drogi wiernych (25.10) kuje się cały — jego kafle nie są niczyją podłogą
  if (p.szyb && sim.world.wSzybie(i % WORLD_W, (i / WORLD_W) | 0)) return false;
  // szyb drogi wiernych (25.10) kuje się cały — jego kafle nie są niczyją podłogą
  if (p.szyb && sim.world.wSzybie(i % WORLD_W, (i / WORLD_W) | 0)) return false;
  let m = maskiDrogi.get(p);
  if (!m) {
    m = new Uint8Array(N);
    for (const k of p.sciezka) m[k] = 1;
    maskiDrogi.set(p, m);
  }
  return m[i - WORLD_W] === 1 && m[i] === 0;
}

/**
 * Blok, na którym stoi wiadro z jedzeniem (kafel pod dnem jego szybu) — indeks kafla albo -1, gdy już wolno go kuć.
 * Decyzja użytkownika (25.10): robotnicy go nie ruszają, dokąd by ich nie posłać — szukają drogi obok, a gdy jej nie
 * ma, odmawiają. Dopiero rozkaz „kop” wskazany wprost na ten blok odblokowuje całą kolumnę pod szybem, do końca
 * partii (`sim.wiadroOdblokowane`). Wcześniej najkrótsza droga w dół wiodła przez szyb: kopali pod wiadrem i ściągali je na dno dołu.
 */
export function blokWiadra(sim: Sim): number {
  if (sim.wiadroOdblokowane || !SWIAT.warstwy.wlaczone) return -1;
  const w = sim.world;
  const x = w.szybWiadraX;
  let y = w.szybWiadraDol;
  if (!w.inb(x, y) || !w.passable(x, y)) return -1;
  while (y + 1 < w.h && w.passable(x, y + 1)) y++;
  return y + 1 < w.h ? w.idx(x, y + 1) : -1;
}

export function kosztKuciaLudu(sim: Sim, mozeDoRdzenia = false): KosztKucia {
  const w = sim.world;
  const wiadro = blokWiadra(sim);
  // płynów szuka się wokół kafla tylko wtedy, gdy w świecie w ogóle są (maCos) — szukanie się nie zmienia
  const magma = maCos(w.magma), woda = maCos(w.water);
  return (i, x, y) => {
    const t = w.tile[i];
    const tw = HARDNESS[t];
    if (tw <= 0 || t === T.CORE) return -1;
    if (podDroga(sim, i) || i === wiadro) return -1;
    if (magma && (sim.przyMagmie(x, y, 2) || nadOgniem(sim, x, y))) return -1;
    if (woda) for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) if (w.inb(x + k, y + j) && w.water[w.idx(x + k, y + j)] > 2) return -1;
    if (!mozeDoRdzenia && Math.hypot(x - w.coreX, y - w.coreY) < LUD.strefaRdzenia) return -1;
    return 1 + Math.round(tw * 2);
  };
}
