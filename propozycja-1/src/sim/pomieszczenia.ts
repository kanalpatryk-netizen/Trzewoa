/**
 * POMIESZCZENIA (Alpha, etap 3c) — plany do wykucia i to, co dzieje się w gotowych.
 *
 *  - Plan kładzie gracz (szablon pod kursorem): sypialnia, warsztat, kuźnia (prostokąt na płaskiej podłodze,
 *    z wejściem z boku na poziomie podłogi albo o kafel wyżej lub niżej), korytarz (pas poziomy na 2 kafle)
 *    i szyb (proste schody w dół — da się nimi wrócić). Oba ostatnie zaczynają się tam, gdzie lud stoi.
 *  - Kują go tylko zaznaczeni robotnicy, którym plan wskażesz (rozkaz „kop” z polem `pom`, sim/polecenia.ts);
 *    wolni robotnicy sami nic nie biorą. Kując plan, robotnik sięga kafel wyżej niż zwykle — nad głowę.
 *  - Lina (Alpha; w 3d — drabina, budowana przez robotników): gracz wskazuje, gdzie ma wisieć hak — jedynym warunkiem
 *    jest skała, której lina się uczepi (kotwicaLiny) — a lina spada z niego do podłogi. Wisi od razu (powiesLine,
 *    world.lina): pierwsze kilka za darmo, potem za krew. To nie plan — nie trafia na listę.
 *  - Gotowy warsztat: robotnik wskazany na warsztat przerabia złoto na dewocjonalia, które od razu stają się wiarą.
 *    Gotowa kuźnia: z żelaza wykuwa kolejne części zbroi rycerza (sim.zbroja); rycerz je zakłada — sim/zbroja.ts.
 *    Sypialnia: kto się w niej wyśpi, traci osłabienia (okaleczenie, zatrucie).
 * Rysunek tylko czyta stan i krótką listę zdarzeń `sim.zdarzeniaPom` (render/pomieszczenia.ts).
 * Liczby: src/nastawy/pomieszczenia.ts.
 */
import type { Sim } from './sim';
import type { World } from './world';
import type { Creature } from './creatures';
import { stoi, blokWiadra } from './droga';
import { T } from './tiles';
import { kto, zapisz } from './dziennik';
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
  /** etap 3f: rycerz założył część zbroi z wieszaka (x, y — wieszak) */
  | { rodzaj: 'zbroja'; kto: number; czesc: string; x: number; y: number; tik: number }
  /** lina spadła w kolumnie x, od kafla y0 do y1 (gracz — powiesił ją gracz; inaczej sama, na zakręcie drogi wiernych) */
  | { rodzaj: 'lina'; x: number; y0: number; y1: number; tik: number; gracz: boolean };

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
    // (propozycja Pawła, 25.10: pokój stawia się gdziekolwiek — także w litej skale bez wejścia i nad pustką; gdy
    // robotnicy do niego nie dojdą, to wina gracza: skreśla plan i stawia go od nowa. Brakującą podłogę lud układa,
    // gdy pokój jest wykuty — tikPomieszczen)
  } else if (rodzaj === 'lina') {
    // Decyzja użytkownika (18.10): jedyny warunek liny — jej górny koniec musi być uczepiony skały (strop nad nią,
    // krawędź półki obok albo ściana przy górnym kafelku); nie trzyma się powietrza. Wskazujesz, gdzie ma wisieć hak
    // (dotknięciem albo przeciągnięciem w górę — liczy się wyższy punkt w kolumnie, od której zacząłeś); wskazana
    // skała to strop: lina zawiśnie tuż pod nią. Z haka lina spada do podłogi.
    let yt = Math.min(y, y2);
    for (let k = 0; k < 3 && w.inb(x, yt) && !w.passable(x, yt); k++) yt++;
    if (!w.inb(x, yt) || !w.passable(x, yt)) return zle({ ok: false, rodzaj, x, y: yt, w: 1, h: 1, kafle: [] }, 'lina nie przejdzie przez skałę');
    let ys = yt;
    while (w.inb(x, ys + 1) && w.passable(x, ys + 1)) ys++;
    const kafle: number[] = [];
    for (let yy = yt; yy < ys; yy++) kafle.push(w.idx(x, yy));
    const kot = kotwicaLiny(w, x, yt);
    p = { ok: true, rodzaj, x, y: yt, w: 1, h: ys - yt + 1, kafle, kier: kot?.strona || undefined };
    if (!kot) return zle(p, 'lina nie ma się czego uczepić — u góry musi być skała');
    if (!kafle.length) return zle(p, 'tu stoi się na podłodze — lina nie ma gdzie zwisać');
    if (kafle.every((i) => w.lina[i] === 1)) return zle(p, 'tu już wisi lina');
    // lina to nie plan: nie zajmuje miejsca na liście planów, a kosztuje krew (po kilku darmowych)
    const k = cenaLiny(sim);
    if (k > 0 && sim.krew - sim.rezerwa.krew < k) return zle(p, `nie starczy krwi — lina kosztuje ${k}`);
    return p;
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
  // nic w szybie drogi wiernych ani pod jej linią — dół w niej odciąłby pobożnych
  if (p.kafle.some((i) => w.wSzybie(i % w.w, (i / w.w) | 0))) return zle(p, 'na drodze wiernych');
  const sciezka = sim.planDrogi ? new Set(sim.planDrogi.sciezka) : null;
  if (sciezka && p.kafle.some((i) => sciezka.has(i - w.w))) return zle(p, 'pod drogą wiernych');
  const zajete = new Set<number>();
  for (const q of sim.pomieszczenia) for (const i of q.kafle) zajete.add(i);
  if (p.kafle.some((i) => zajete.has(i))) return zle(p, 'tu już jest plan');
  if (sim.pomieszczenia.length >= P.maks) return zle(p, `najwyżej ${P.maks} planów naraz`);
  return p;
}


/**
 * Gdzie lina jest uczepiona skały: jej górny kafel to (x, yGora). Najpierw krawędź półki obok (lina zwisa wzdłuż jej
 * ściany, hak wbity w półkę tuż przy brzegu), potem strop tuż nad liną, na końcu ściana obok górnego kafla.
 * `x`, `y` — punkt zaczepienia (kafle, ułamkowo: róg półki, spód stropu); `strona` — gdzie skała (−1, 0 — nad, 1).
 * Null — lina wisiałaby w powietrzu.
 */
export function kotwicaLiny(w: World, x: number, yGora: number): { x: number; y: number; rodzaj: 'krawedz' | 'strop' | 'sciana'; strona: number } | null {
  for (const s of [1, -1]) if (w.solid(x + s, yGora + 1) && w.passable(x + s, yGora)) return { x: x + (s > 0 ? 1 : 0), y: yGora + 1, rodzaj: 'krawedz', strona: s };
  if (w.solid(x, yGora - 1)) return { x: x + 0.5, y: yGora, rodzaj: 'strop', strona: 0 };
  for (const s of [1, -1]) if (w.solid(x + s, yGora)) return { x: x + (s > 0 ? 1 : 0), y: yGora + 0.2, rodzaj: 'sciana', strona: s };
  return null;
}

/** Ile krwi kosztuje teraz lina: pierwsze `linyDarmowe` za darmo, każda następna `linaKrew`. */
export function cenaLiny(sim: Sim): number {
  return (sim.lud.liny ?? 0) < P.linyDarmowe ? 0 : P.linaKrew;
}

/** Ile darmowych lin jeszcze zostało. */
export function darmoweLiny(sim: Sim): number {
  return Math.max(0, P.linyDarmowe - (sim.lud.liny ?? 0));
}

/**
 * Wiesza linę z próby (gracz puścił przeciąganie): płaci krew (jeśli darmowe się skończyły), lina od razu wisi
 * w kaflach próby, a rysunek pokazuje, jak spada z haka i się napina. Zwraca powód odmowy albo null.
 */
export function powiesLine(sim: Sim, p: ProbaPlanu): string | null {
  if (p.rodzaj !== 'lina') return 'to nie lina';
  if (!p.ok) return p.powod ?? 'tu nie wolno';
  const k = cenaLiny(sim);
  if (k > 0 && sim.krew - sim.rezerwa.krew < k) return `nie starczy krwi — lina kosztuje ${k}`;
  sim.krew -= k;
  const w = sim.world;
  for (const i of p.kafle) w.lina[i] = 1;
  sim.lud.liny = (sim.lud.liny ?? 0) + 1;
  const y0 = p.y, y1 = p.y + p.h - 2;
  zdarzenie(sim, { rodzaj: 'lina', x: p.x, y0, y1, tik: sim.tick, gracz: true });
  sim.gdzie(p.x + 0.5, y0 + 0.5).log(k > 0 ? `Powiesiłeś linę za ${k} krwi — można nią wejść i zejść.` : `Powiesiłeś linę (darmowych zostało: ${darmoweLiny(sim)}).`, 'swiat', 'lina');
  zapisz(sim, 'praca', `gracz powiesił linę (${p.x}, ${y0}–${y1})${k > 0 ? ` za ${k} krwi` : ' za darmo'}`, p.x, y0);
  return null;
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

/** Ile kafli planu jeszcze stoi. */
export function zostaloKafli(sim: Sim, pom: Pomieszczenie): number {
  let n = 0;
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
  const wiadro = blokWiadra(sim);
  // najpierw odsłonięte kafle; plan w litej skale (25.10: pokój wolno postawić gdziekolwiek) — najbliższe w ogóle
  // (robotnik przekopie się do nich)
  for (const odsloniete of [true, false]) {
    for (const i of pom.kafle) {
      const x = i % w.w, y = (i / w.w) | 0;
      if (!w.solid(x, y) || w.hardness(x, y) <= 0 || i === wiadro) continue;
      if (odsloniete && !(w.passable(x - 1, y) || w.passable(x + 1, y) || w.passable(x, y - 1) || w.passable(x, y + 1))) continue;
      out.push([Math.abs(x - cx) + Math.abs(y - cy) * 1.1, x, y]);
    }
    if (out.length) break;
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
      // pokój nad pustką: brakującą podłogę lud układa z gruzu (nie tam, gdzie ktoś akurat stoi)
      if (czyPokoj(pom.rodzaj)) {
        const w = sim.world, yp = pom.y + pom.h;
        const zajete = new Set(sim.creatures.filter((c) => !c.dead).map((c) => w.idx(Math.floor(c.x), Math.floor(c.y))));
        for (let xx = pom.x; xx < pom.x + pom.w; xx++) {
          if (!w.inb(xx, yp) || !w.passable(xx, yp) || zajete.has(w.idx(xx, yp))) continue;
          w.set(xx, yp, T.ROCK);
          sim.spark(xx + 0.5, yp + 0.3, 'dust');
        }
      }
      zdarzenie(sim, { rodzaj: 'gotowe', pom: pom.id, tik: sim.tick });
      // (plan w pustce nikt nie kuł — pomieszczenie urządza się od razu)
      sim.gdzie(pom.x + pom.w / 2, pom.y + pom.h / 2).log(pom.doKucia === 0 ? `Urządziłeś ${BIERNIK_POMIESZCZENIA[pom.rodzaj]}.` : `Robotnicy wykuli ${BIERNIK_POMIESZCZENIA[pom.rodzaj]}.`, 'swiat');
      for (const c of sim.creatures) {
        if (c.polecenie?.pom !== pom.id || c.polecenie.typ !== 'kop') continue;
        c.polecenie = undefined; c.czynnosc = undefined; c.jt = 0;
        sim.efekt(c.x, c.y, 'mysl', 'wykute');
      }
      if (!czyPokoj(pom.rodzaj)) sim.pomieszczenia = sim.pomieszczenia.filter((p) => p !== pom);
    }
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
