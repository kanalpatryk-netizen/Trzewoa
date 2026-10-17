/**
 * POMIESZCZENIA (Alpha, etap 3c) — plany do wykucia i to, co dzieje się w gotowych.
 *
 *  - Plan kładzie gracz (szablon pod kursorem): sypialnia, warsztat, kuźnia (prostokąt na płaskiej podłodze,
 *    z wejściem z boku na poziomie podłogi albo o kafel wyżej lub niżej), korytarz (pas poziomy na 2 kafle)
 *    i szyb (proste schody w dół — da się nimi wrócić). Oba ostatnie zaczynają się tam, gdzie lud stoi.
 *  - Kują go tylko zaznaczeni robotnicy, którym plan wskażesz (rozkaz „kop” z polem `pom`, sim/polecenia.ts);
 *    wolni robotnicy sami nic nie biorą. Kując plan, robotnik sięga kafel wyżej niż zwykle — nad głowę.
 *  - Etap 3d: drabina — przeciągana w górę od miejsca, gdzie lud stoi, do półki; tylko tam, gdzie na półkę nie da się
 *    wejść inaczej (probaPlanu sprawdza drogę bez drabiny). Zaznaczeni robotnicy budują ją od dołu, szczebel po
 *    szczeblu (rozkaz „drabina”, world.drabina); gotowa znika z listy planów, a szczeble zostają w świecie.
 *  - Gotowy warsztat: robotnik wskazany na warsztat przerabia złoto na dewocjonalia, które od razu stają się wiarą.
 *    Gotowa kuźnia: z żelaza wykuwa kolejne części zbroi rycerza (sim.zbroja; rysunek na rycerzu — etap 3f).
 *    Sypialnia: kto się w niej wyśpi, traci osłabienia (okaleczenie, zatrucie).
 * Rysunek tylko czyta stan i krótką listę zdarzeń `sim.zdarzeniaPom` (render/pomieszczenia.ts).
 * Liczby: src/nastawy/pomieszczenia.ts.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { stoi, szukajDrogi, budzetDrog, nowyTik } from './droga';
import { PASSABLE } from './tiles';
import { kto } from './dziennik';
import { POMIESZCZENIA as P, BIERNIK_POMIESZCZENIA, type RodzajPomieszczenia } from '../nastawy/pomieszczenia';

export interface Pomieszczenie {
  id: number;
  rodzaj: RodzajPomieszczenia;
  /** Prostokąt opisujący (lewy górny róg i wymiary) — rysunek i trafienie kursorem. */
  x: number; y: number; w: number; h: number;
  /** Kafle wnętrza (indeksy) — to trzeba wykuć. */
  kafle: number[];
  /** Szyb: w którą stronę schodzi (−1 w lewo, 1 w prawo). */
  kier?: number;
  od: number;
  /** Ile kafli było do wykucia przy położeniu planu (0 — urządzony w pustce, nikt nie kuł). */
  doKucia?: number;
  gotowe: boolean;
  gotoweOd?: number;
  /** Warsztat i kuźnia: postęp bieżącej sztuki 0..1 i czy surowiec na nią już poszedł. */
  postep?: number;
  zaplacone?: boolean;
  /** Warsztat i kuźnia: czego brakuje do pracy (podpis na mapie). */
  brak?: string;
}

/** Zdarzenia dla rysunku (nie idą do zapisu): pomieszczenie gotowe, krzyż do licznika wiary, część zbroi, wypoczęty. */
export type ZdarzeniePom =
  | { rodzaj: 'gotowe'; pom: number; tik: number }
  | { rodzaj: 'krzyz'; x: number; y: number; ile: number; tik: number }
  | { rodzaj: 'czesc'; x: number; y: number; czesc: string; tik: number }
  | { rodzaj: 'wypoczety'; kto: number; tik: number }
  /** etap 3d: robotnik dobił szczebel drabiny w kaflu (x, y) */
  | { rodzaj: 'szczebel'; x: number; y: number; tik: number };

/** Wynik sprawdzenia planu: kafle do wykucia albo powód, dla którego tu nie wolno. */
export interface ProbaPlanu {
  ok: boolean;
  powod?: string;
  rodzaj: RodzajPomieszczenia;
  x: number; y: number; w: number; h: number;
  kafle: number[];
  kier?: number;
}

export const czyPokoj = (r: RodzajPomieszczenia): boolean => r === 'sypialnia' || r === 'warsztat' || r === 'kuznia';

/** Pomieszczenie (albo plan) pod kaflem (x, y) — albo null. */
export function pomieszczenieW(sim: Sim, x: number, y: number): Pomieszczenie | null {
  const i = sim.world.idx(x, y);
  for (const p of sim.pomieszczenia) {
    if (czyPokoj(p.rodzaj) ? x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h : p.kafle.includes(i)) return p;
  }
  return null;
}

export const pomieszczenieId = (sim: Sim, id: number | undefined): Pomieszczenie | null =>
  id === undefined ? null : sim.pomieszczenia.find((p) => p.id === id) ?? null;

/**
 * Plan pod kursorem. Pokój: kursor wskazuje środek dolnego rzędu wnętrza (tam, gdzie się stoi). Korytarz i szyb:
 * od kafla (x, y), na którym stoi lud, do (x2, y2) — korytarz w poziomie, szyb schodami w dół w stronę x2.
 */
export function probaPlanu(sim: Sim, rodzaj: RodzajPomieszczenia, x: number, y: number, x2 = x, y2 = y): ProbaPlanu {
  const w = sim.world;
  const zle = (p: ProbaPlanu, powod: string): ProbaPlanu => ({ ...p, ok: false, powod });
  let p: ProbaPlanu;
  if (czyPokoj(rodzaj)) {
    const s = P.szablony[rodzaj as 'sypialnia'];
    const x0 = x - Math.floor((s.w - 1) / 2), y0 = y - s.h + 1;
    const kafle: number[] = [];
    for (let yy = y0; yy < y0 + s.h; yy++) for (let xx = x0; xx < x0 + s.w; xx++) if (w.inb(xx, yy)) kafle.push(w.idx(xx, yy));
    p = { ok: true, rodzaj, x: x0, y: y0, w: s.w, h: s.h, kafle };
    if (kafle.length < s.w * s.h) return zle(p, 'za blisko brzegu góry');
    for (let xx = x0; xx < x0 + s.w; xx++) if (!w.solid(xx, y0 + s.h)) return zle(p, 'podłoga musi być płaska i lita');
    // wejście z boku: kafel, na którym da się stanąć, przy dolnym rzędzie (na poziomie podłogi albo o kafel wyżej, niżej)
    const yb = y0 + s.h - 1;
    let wejscie = false;
    for (const ex of [x0 - 1, x0 + s.w]) for (let ey = yb - 1; ey <= yb + 1; ey++) if (w.passable(ex, ey) && stoi(sim, ex, ey)) wejscie = true;
    for (let xx = x0; xx < x0 + s.w && !wejscie; xx++) if (w.passable(xx, yb) && stoi(sim, xx, yb)) wejscie = true;
    if (!wejscie) return zle(p, 'brak wejścia — z boku, na poziomie podłogi');
  } else if (rodzaj === 'drabina') {
    // od kafla, na którym stoi lud, w górę do półki (x2 — w którą stronę z niej zejść)
    if (!w.passable(x, y) || !stoi(sim, x, y)) return zle({ ok: false, rodzaj, x, y, w: 1, h: 1, kafle: [] }, 'drabina zaczyna się tam, gdzie lud stoi');
    const n = Math.max(P.drabinaMin, Math.min(P.drabinaMaks, y - y2));
    const kafle: number[] = [];
    for (let k = 1; k <= n; k++) if (w.inb(x, y - k)) kafle.push(w.idx(x, y - k));
    const yt = y - n;
    const naPolke = (k: number) => w.passable(x + k, yt) && w.solid(x + k, yt + 1);
    const pierwsza = x2 >= x ? 1 : -1;
    const strona = naPolke(pierwsza) ? pierwsza : naPolke(-pierwsza) ? -pierwsza : 0;
    p = { ok: true, rodzaj, x, y: yt, w: 1, h: n + 1, kafle, kier: strona || pierwsza };
    if (kafle.length < n) return zle(p, 'za blisko brzegu góry');
    if (kafle.some((i) => PASSABLE[w.tile[i]] !== 1)) return zle(p, 'drabina stoi w pustce — skały nie przebije');
    if (kafle.some((i) => w.drabina[i] === 1)) return zle(p, 'tu już jest drabina');
    if (!strona) return zle(p, 'u góry nie ma półki, na którą by się zeszło');
    // decyzja użytkownika: drabina tylko tam, gdzie na półkę nie da się wejść inaczej
    if (daSieWejsc(sim, x, y, x + strona, yt)) return zle(p, 'tu da się wejść bez drabiny');
  } else {
    if (!w.passable(x, y) || !stoi(sim, x, y)) {
      return zle({ ok: false, rodzaj, x, y, w: 1, h: 1, kafle: [] }, rodzaj === 'korytarz' ? 'korytarz zaczyna się tam, gdzie lud stoi' : 'szyb zaczyna się tam, gdzie lud stoi');
    }
    const k = x2 >= x ? 1 : -1;
    const kafle: number[] = [];
    if (rodzaj === 'korytarz') {
      const n = Math.max(1, Math.min(P.korytarzMaks, Math.abs(x2 - x)));
      for (let i = 1; i <= n; i++) for (let dy = 0; dy < P.korytarzWys; dy++) if (w.inb(x + i * k, y - dy)) kafle.push(w.idx(x + i * k, y - dy));
      const xa = k > 0 ? x + 1 : x - n;
      p = { ok: true, rodzaj, x: xa, y: y - P.korytarzWys + 1, w: n, h: P.korytarzWys, kafle, kier: k };
      for (let i = 1; i <= n; i++) if (!w.solid(x + i * k, y + 1)) return zle(p, 'podłoga musi być płaska i lita');
    } else {
      const n = Math.max(1, Math.min(P.szybMaks, y2 - y));
      for (let i = 1; i <= n; i++) for (const dy of [0, -1]) if (w.inb(x + i * k, y + i + dy)) kafle.push(w.idx(x + i * k, y + i + dy));
      const xa = k > 0 ? x + 1 : x - n;
      p = { ok: true, rodzaj, x: xa, y, w: n, h: n + 1, kafle, kier: k };
      for (let i = 1; i <= n; i++) if (!w.solid(x + i * k, y + i + 1)) return zle(p, 'pod schodami musi być lita skała');
    }
  }
  for (const i of p.kafle) {
    const xx = i % w.w, yy = (i / w.w) | 0;
    if (w.solid(xx, yy) && w.hardness(xx, yy) <= 0) return zle(p, 'tej skały nie da się ruszyć');
  }
  // nic pod złotą kreską drogi wiernych — dół w niej odciąłby pobożnych (drabina niczego nie kuje)
  const sciezka = sim.planDrogi && rodzaj !== 'drabina' ? new Set(sim.planDrogi.sciezka) : null;
  if (sciezka && p.kafle.some((i) => sciezka.has(i - w.w))) return zle(p, 'pod złotą kreską drogi wiernych');
  const zajete = new Set<number>();
  for (const q of sim.pomieszczenia) for (const i of q.kafle) zajete.add(i);
  if (p.kafle.some((i) => zajete.has(i))) return zle(p, 'tu już jest plan');
  if (sim.pomieszczenia.length >= P.maks) return zle(p, `najwyżej ${P.maks} planów naraz`);
  return p;
}

/**
 * Etap 3d: czy z kafla (x, y) da się dojść na (ex, ey) bez nowej drabiny — szukaniem drogi ludu (wchodzi o stopień,
 * zeskakuje nisko; istniejące drabiny się liczą). Poza budżetem tiku: plan sprawdza się rzadko, na prośbę gracza.
 */
function daSieWejsc(sim: Sim, x: number, y: number, ex: number, ey: number): boolean {
  const ktos = { x: x + 0.5, y, race: 0 } as Creature;
  const zostalo = budzetDrog();
  nowyTik(1);
  const d = szukajDrogi(sim, ktos, (_i, xx, yy) => xx === ex && yy === ey, P.drabinaSzukanie);
  nowyTik(zostalo);
  return !!d;
}

/** Etap 3d: następny szczebel do zbudowania — najniższy, którego jeszcze nie ma (albo null). */
export function nastepnySzczebel(sim: Sim, pom: Pomieszczenie): [number, number] | null {
  const w = sim.world;
  let best = -1;
  for (const i of pom.kafle) if (w.drabina[i] === 0 && (best < 0 || i > best)) best = i;
  return best < 0 ? null : [best % w.w, (best / w.w) | 0];
}

/** Kładzie plan z udanej próby. */
export function polozPlan(sim: Sim, p: ProbaPlanu): Pomieszczenie {
  const pom: Pomieszczenie = { id: sim.nrPomieszczenia++, rodzaj: p.rodzaj, x: p.x, y: p.y, w: p.w, h: p.h, kafle: [...p.kafle], kier: p.kier, od: sim.tick, gotowe: false };
  pom.doKucia = zostaloKafli(sim, pom);
  sim.pomieszczenia.push(pom);
  if (pom.doKucia) sim.gdzie(p.x + p.w / 2, p.y + p.h / 2).log(`Wyznaczyłeś ${BIERNIK_POMIESZCZENIA[p.rodzaj]} — zaznacz robotników i wskaż im plan.`, 'swiat');
  pom.postep = 0;
  return pom;
}

/** Skreśla plan (jeszcze niewykuty). */
export function skreslPlan(sim: Sim, pom: Pomieszczenie): void {
  sim.pomieszczenia = sim.pomieszczenia.filter((p) => p !== pom);
  for (const c of sim.creatures) if (c.polecenie?.pom === pom.id) c.polecenie = undefined;
}

/** Ile kafli planu jeszcze stoi (drabina: ilu szczebli jeszcze nie ma). */
export function zostaloKafli(sim: Sim, pom: Pomieszczenie): number {
  let n = 0;
  if (pom.rodzaj === 'drabina') { for (const i of pom.kafle) if (sim.world.drabina[i] === 0) n++; return n; }
  for (const i of pom.kafle) if (sim.world.solid(i % sim.world.w, (i / sim.world.w) | 0)) n++;
  return n;
}

/**
 * Kafle planu do wykucia w kolejności: odsłonięte (obok pustka), najbliżej robotnika. Z tych planer bierze
 * pierwszy, do którego dojdzie (creatures.ts: planPolecenia).
 */
export function kafleDoKucia(sim: Sim, c: Creature, pom: Pomieszczenie, ile = 6): [number, number][] {
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const out: [number, number, number][] = [];
  for (const i of pom.kafle) {
    const x = i % w.w, y = (i / w.w) | 0;
    if (!w.solid(x, y) || w.hardness(x, y) <= 0) continue;
    if (!(w.passable(x - 1, y) || w.passable(x + 1, y) || w.passable(x, y - 1) || w.passable(x, y + 1))) continue;
    out.push([Math.abs(x - cx) + Math.abs(y - cy) * 1.1, x, y]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out.slice(0, ile).map(([, x, y]) => [x, y]);
}

/** Czy stojąc na (sx, sy), robotnik sięga kilofem kafla planu (tx, ty) — także kafel nad głową. */
export function siegaPlanu(sx: number, sy: number, tx: number, ty: number): boolean {
  return Math.abs(tx - sx) <= 1 && ty - sy >= -P.zasiegWGore && ty - sy <= 1;
}

/** Dolny rząd wnętrza — tu się stoi. */
export const podlogaPom = (pom: Pomieszczenie): number => pom.y + pom.h - 1;

/**
 * Miejsce w gotowym pomieszczeniu i w którą stronę patrzy: warsztat i kuźnia — przed stołem albo kowadłem (drugi
 * kafel od lewej, twarzą w prawo; kolejni obok), sypialnia — na jednym z dwóch posłań. Leżący rysuje się tułowiem
 * ok. dwóch kafli w stronę, w którą patrzy (render/postacie.ts), stąd „na krzyż”: pierwszy stoi na czwartym kaflu
 * twarzą w prawo i leży na lewym posłaniu, drugi — na drugim kaflu twarzą w lewo, na prawym. `n` — który z kolei.
 */
export function miejsceWPom(pom: Pomieszczenie, n: number): [number, number, number] {
  const y = podlogaPom(pom);
  const miejsca: [number, number][] = pom.rodzaj === 'sypialnia' ? [[3, 1], [1, -1], [4, 1], [0, -1]] : [[1, 1], [0, 1], [3, -1]];
  const [dx, k] = miejsca[n % miejsca.length];
  return [pom.x + Math.min(pom.w - 1, dx), y, k];
}

/** Który z kolei jest `c` wśród tych, którzy mają rozkaz do tego pomieszczenia (stałe miejsce dla każdego). */
export function ktoryWPom(sim: Sim, pom: Pomieszczenie, c: Creature): number {
  let n = 0;
  for (const o of sim.creatures) {
    if (o === c) return n;
    if (!o.dead && o.polecenie?.pom === pom.id && (o.polecenie.typ === 'praca' || o.polecenie.typ === 'sen')) n++;
  }
  return n;
}

/** Następna część zbroi do wykucia (albo null — zbroja gotowa). */
export function nastepnaCzesc(sim: Sim): (typeof P.kuznia.czesci)[number] | null {
  return P.kuznia.czesci.find((c) => !sim.zbroja.includes(c.id)) ?? null;
}

export function zdarzenie(sim: Sim, z: ZdarzeniePom): void {
  const l = sim.zdarzeniaPom;
  while (l.length && (l.length >= 32 || sim.tick - l[0].tik > 900)) l.shift();
  l.push(z);
}

/** Co tik: plany, które już wykuto, praca w warsztatach i kuźniach, sen w sypialniach. */
export function tikPomieszczen(sim: Sim): void {
  if (!sim.pomieszczenia.length) return;
  // plan wykuty — pomieszczenie gotowe (korytarz i szyb stają się zwykłym przejściem)
  if (sim.tick % 30 === 0) {
    for (const pom of [...sim.pomieszczenia]) {
      if (pom.gotowe || zostaloKafli(sim, pom) > 0) continue;
      pom.gotowe = true; pom.gotoweOd = sim.tick;
      zdarzenie(sim, { rodzaj: 'gotowe', pom: pom.id, tik: sim.tick });
      // (plan w pustce nikt nie kuł — pomieszczenie urządza się od razu)
      sim.gdzie(pom.x + pom.w / 2, pom.y + pom.h / 2).log(pom.rodzaj === 'drabina' ? 'Robotnicy zbudowali drabinę — można nią wejść i zejść.'
        : pom.doKucia === 0 ? `Urządziłeś ${BIERNIK_POMIESZCZENIA[pom.rodzaj]}.` : `Robotnicy wykuli ${BIERNIK_POMIESZCZENIA[pom.rodzaj]}.`, 'swiat');
      for (const c of sim.creatures) {
        if (c.polecenie?.pom !== pom.id || (c.polecenie.typ !== 'kop' && c.polecenie.typ !== 'drabina')) continue;
        c.polecenie = undefined; c.czynnosc = undefined; c.jt = 0;
        sim.efekt(c.x, c.y, 'mysl', pom.rodzaj === 'drabina' ? 'drabina gotowa' : 'wykute');
      }
      if (!czyPokoj(pom.rodzaj)) sim.pomieszczenia = sim.pomieszczenia.filter((p) => p !== pom);
    }
  }
  // etap 3d: drabina rośnie szczebel po szczeblu — buduje ten, kto stoi pod najniższym brakującym
  for (const pom of sim.pomieszczenia) {
    if (pom.gotowe || pom.rodzaj !== 'drabina') continue;
    const sz = nastepnySzczebel(sim, pom);
    if (!sz) continue;
    const budowniczy = sim.creatures.filter((c) => !c.dead && c.czynnosc === 'buduje' && c.polecenie?.typ === 'drabina' && c.polecenie.pom === pom.id
      && c.polecenie.x === sz[0] && c.polecenie.y === sz[1] && Math.floor(c.y) === sz[1] + 1 && Math.abs(Math.floor(c.x) - sz[0]) <= 1);
    if (!budowniczy.length) continue;
    pom.postep = (pom.postep ?? 0) + (1 + 0.5 * (budowniczy.length - 1)) / P.tikowNaSzczebel;
    if (pom.postep < 1) continue;
    pom.postep = 0;
    const i = sim.world.idx(sz[0], sz[1]);
    if (PASSABLE[sim.world.tile[i]] === 1) sim.world.drabina[i] = 1;
    zdarzenie(sim, { rodzaj: 'szczebel', x: sz[0], y: sz[1], tik: sim.tick });
    // budowniczy od razu wchodzi szczebel wyżej (inaczej czekałby do końca zamiaru)
    for (const c of budowniczy) c.jt = 0;
  }
  for (const pom of sim.pomieszczenia) {
    if (!pom.gotowe || (pom.rodzaj !== 'warsztat' && pom.rodzaj !== 'kuznia')) continue;
    const ilu = sim.creatures.filter((c) => !c.dead && c.polecenie?.typ === 'praca' && c.polecenie.pom === pom.id && c.czynnosc === 'buduje').length;
    if (!ilu) continue;
    const [sx, sy] = miejsceWPom(pom, 0);
    if (pom.rodzaj === 'warsztat') {
      const W = P.warsztat;
      if (!pom.zaplacone) {
        if (sim.zloto < W.zlotoNaSztuke) { pom.brak = 'brak złota'; continue; }
        sim.zloto -= W.zlotoNaSztuke; pom.zaplacone = true; pom.postep = 0; pom.brak = undefined;
      }
      pom.postep = (pom.postep ?? 0) + (1 + 0.5 * (ilu - 1)) / W.tikowNaSztuke;
      if (pom.postep >= 1) {
        pom.postep = 0; pom.zaplacone = false;
        sim.wiara += W.wiaraZaSztuke;
        sim.stat.dewocjonalia = (sim.stat.dewocjonalia ?? 0) + 1;
        zdarzenie(sim, { rodzaj: 'krzyz', x: sx + 1.5, y: sy + 0.2, ile: W.wiaraZaSztuke, tik: sim.tick });
        sim.gdzie(sx + 1, sy).log(`Warsztat: krzyż ze złota — +${W.wiaraZaSztuke} wiary.`, 'wiara', 'warsztat',
          (n) => `Warsztat: ${n} ${n < 5 ? 'krzyże' : 'krzyży'} ze złota — +${n * W.wiaraZaSztuke} wiary.`);
      }
    } else {
      const cz = nastepnaCzesc(sim);
      if (!cz) { pom.brak = 'zbroja gotowa'; continue; }
      if (!pom.zaplacone) {
        if (sim.zelazo < cz.zelazo) { pom.brak = `brak żelaza (${cz.nazwa}: ${cz.zelazo})`; continue; }
        sim.zelazo -= cz.zelazo; pom.zaplacone = true; pom.postep = 0; pom.brak = undefined;
      }
      pom.postep = (pom.postep ?? 0) + (1 + 0.5 * (ilu - 1)) / cz.tikow;
      if (pom.postep >= 1) {
        pom.postep = 0; pom.zaplacone = false;
        sim.zbroja.push(cz.id);
        zdarzenie(sim, { rodzaj: 'czesc', x: sx + 1.5, y: sy - 0.3, czesc: cz.id, tik: sim.tick });
        sim.gdzie(sx + 1, sy).log(`Kuźnia wykuła ${cz.nazwa} dla rycerza.`, 'swiat');
      }
    }
  }
  // sen: kto śpi w sypialni dość długo, traci osłabienia i wstaje
  for (const c of sim.creatures) {
    if (c.dead || c.czynnosc !== 'spi' || c.polecenie?.typ !== 'sen') continue;
    c.snu = (c.snu ?? 0) + 1;
    if (c.snu < P.sypialnia.snuTikow) continue;
    const mial = !!c.okaleczony || (c.zatrutyDo !== undefined && sim.tick < c.zatrutyDo);
    c.okaleczony = false; c.zatrutyDo = undefined; c.snu = 0;
    c.polecenie = undefined; c.czynnosc = undefined; c.jt = 0;
    sim.efekt(c.x, c.y, 'mysl', mial ? 'wypoczęty — osłabienie minęło' : 'wypoczęty');
    if (mial) {
      zdarzenie(sim, { rodzaj: 'wypoczety', kto: c.id, tik: sim.tick });
      sim.gdzie(c.x, c.y).log(`${kto(sim, c)} wstaje z posłania wypoczęty — osłabienie minęło.`, 'swiat');
    }
  }
}
