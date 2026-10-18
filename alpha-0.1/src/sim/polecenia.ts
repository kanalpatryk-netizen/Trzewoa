/**
 * POLECENIA (Alpha, etap 2) — rozkazy gracza dla zaznaczonych postaci ludu. Liczby w src/nastawy/polecenia.ts.
 *
 * Szept rozkazu nic nie kosztuje — to sterowanie, nie cud:
 *  - „idź tam” — postać idzie we wskazane miejsce i trzyma tam posterunek (pobożny modli się, rycerz pilnuje),
 *    aż rozkaz odwołasz. Pobożny i rycerz idą tylko tam, dokąd prowadzi droga — inaczej odmawiają (dymek
 *    nad głową, kręcą głową). Robotnik, gdy drogi nie ma, wykuwa sobie przejście sam (sim/droga.ts: szukajKopiac).
 *  - wskazanie litej skały robotnikowi — „kop tam”: przekopuje się do tego kafla i go wykuwa.
 *    Gdy wskażesz rudę (żelazo, złoto), to „kop żyłę”: po tym kaflu bierze kolejne odsłonięte kafle
 *    tej samej rudy (etap 3b; nastepnyKafelZyly), aż kępa się skończy.
 *  - „kop drogę wiernych” (robotnik) — kopie czoło złotej kreski (plan drogi pod rdzeń), aż będzie gotowa.
 *  - etap 3c: wskazanie planu pomieszczenia — robotnicy go kują (kafel po kaflu, „kop” z polem `pom`); wskazanie
 *    gotowego warsztatu albo kuźni — robotnik w nim pracuje („praca”); sypialni — każdy idzie spać („sen”).
 *    Wolni robotnicy sami nic z tego nie biorą (sim/pomieszczenia.ts).
 * Robotnicy nie kopią już sami: bez rozkazu tylko noszą jedzenie i odpoczywają przy obozie.
 * Rozkaz wykonuje planer ludu (creatures.ts: planPolecenia); przerywa go tylko to, co pilne —
 * głód, fala Strażników, walka — a potem postać wraca do rozkazu.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { Job, Thought } from './creatures';
import { POLECENIA as P } from '../nastawy/polecenia';
import { rolaPostaci } from './lud';
import { szukajDrogi, szukajKopiac, kosztKuciaLudu, budzetDrog, nowyTik, stoi, podDroga } from './droga';
import { czoloDrogi, nieWykopane } from './pielgrzymka';
import { zapisz, kto } from './dziennik';
import { kruszecKafla, type RodzajKruszcu } from './kruszce';
import { kafleDoKucia, siegaPlanu, miejsceWPom, type Pomieszczenie } from './pomieszczenia';
import { NAZWA_POMIESZCZENIA } from '../nastawy/pomieszczenia';

export type TypPolecenia = 'idz' | 'kop' | 'droga' | 'praca' | 'sen';

export interface Polecenie {
  typ: TypPolecenia;
  /** kafel celu: przy „idź” — podłoga, na której stanie; przy „kop” — lity kafel do wykucia */
  x: number; y: number;
  /** tik wydania (znacznik celu na płycie) */
  od: number;
  /** doszedł — trzyma posterunek */
  na?: boolean;
  /** ile razy w drodze szukał nowego przejścia */
  prob?: number;
  /** Alpha, etap 3b: „kop żyłę” — jaką rudę kuje, skąd zaczął (zasięg) i ile kafli już wykuł */
  zyla?: RodzajKruszcu; zx?: number; zy?: number; zylaIle?: number;
  /**
   * Alpha, etap 3c: pomieszczenie (sim/pomieszczenia.ts) — plan do wykucia („kop”), warsztat albo kuźnia („praca”),
   * sypialnia („sen”)
   */
  pom?: number;
}

/** Odmowa wykonania rozkazu — dymek nad głową i kręcenie głową (render/lud/ruch.ts). */
export interface Odmowa { od: number; tekst: string }

/** Czy postać właśnie odmawia (dymek jeszcze wisi). */
export function odmawia(sim: Sim, c: Creature): boolean {
  return !!c.odmowa && sim.tick - c.odmowa.od < P.odmowaTikow;
}

/** Odmowa: zapisuje ją postaci (rysunek) i zwraca tekst dla gracza. */
export function odmow(sim: Sim, c: Creature, tekst: string): string {
  c.odmowa = { od: sim.tick, tekst };
  return tekst;
}

/** Podłoga pod wskazanym miejscem w pustce: w dół do pierwszego kafla, na którym się stoi (albo null). */
export function podlogaPod(sim: Sim, x: number, y: number): [number, number] | null {
  const w = sim.world;
  if (!w.inb(x, y) || !w.passable(x, y)) return null;
  for (let yy = y, k = 0; k <= P.podlogaNizej && yy < w.h - 1; yy++, k++) {
    if (!w.passable(x, yy)) return null;
    if (stoi(sim, x, yy)) return [x, yy];
  }
  return null;
}

/** Najbliższe miejsce do stania wokół (x, y), najwyżej `promien` kafli dalej (albo null). */
export function najblizszaPodloga(sim: Sim, x: number, y: number, promien: number): [number, number] | null {
  const w = sim.world;
  for (let r = 0; r <= promien; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const xx = x + dx, yy = y + dy;
      if (w.inb(xx, yy) && w.passable(xx, yy) && stoi(sim, xx, yy) && w.magma[w.idx(xx, yy)] === 0) return [xx, yy];
    }
  }
  return null;
}

/** Szukanie drogi na rozkaz — poza budżetem tiku (rozkazy są rzadkie, a „nie było czasu szukać” to nie odmowa). */
function drogaTeraz(sim: Sim, c: Creature, cel: (x: number, y: number) => boolean, limit: number): number[] | null {
  const zostalo = budzetDrog();
  nowyTik(1);
  const d = szukajDrogi(sim, c, (_i, x, y) => cel(x, y), limit);
  nowyTik(zostalo);
  return d;
}

/** Czy robotnik da radę się tam dokopać (bez budżetu tiku). */
function dokopieSie(sim: Sim, c: Creature, cel: (i: number, x: number, y: number) => boolean): boolean {
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  if (!w.inb(cx, cy)) return false;
  return !!szukajKopiac(sim, [w.idx(cx, cy)], cel, { koszt: kosztKuciaLudu(sim, true), limit: P.szukanieKopania, zBudzetu: false });
}

/** Postać przestaje robić to, co robiła — planer ludu weźmie rozkaz od razu. */
function przerwij(sim: Sim, c: Creature): void {
  c.wyprawa = false;
  if (c.job === Job.PIELGRZYM) c.job = Job.WANDER;
  if (c.thought === Thought.PRAY_CORE) c.thought = Thought.NONE;
  c.kopieDroge = false;
  c.modliPrzyObozie = false;
  c.posterunek = undefined;
  c.droga = undefined; c.drogaKopie = false;
  c.jt = 0; c.zamiarDo = sim.tick;
}

/**
 * Rozkaz dla jednej postaci: „idź tam” (albo „kop tam”, gdy robotnikowi wskażesz litą skałę) albo
 * „kop drogę wiernych”. Zwraca powód odmowy albo null, gdy postać przyjęła rozkaz.
 */
export function wydajPolecenie(sim: Sim, c: Creature, typ: 'idz' | 'droga', x: number, y: number): string | null {
  const w = sim.world;
  const rola = rolaPostaci(c);
  if (c.dead || !rola) return 'To nie twój lud.';
  if (typ === 'droga') {
    if (rola !== 'robotnik') return odmow(sim, c, 'kopią tylko robotnicy');
    const cz = czoloDrogi(sim);
    if (cz < 0) return odmow(sim, c, sim.rytual.otwarta ? 'skorupa już otwarta' : sim.planDrogi ? 'droga wiernych już wykopana' : 'nie wiem, którędy kopać');
    // dojdzie na miejsce tuż przy czole albo przekopie się do niego — inaczej odmawia od razu
    // (z dna jaskini pod czołem, kilkadziesiąt kafli niżej, nie wejdzie: lud nie wspina się po ścianach)
    // (na drodze w dół dalszy kawałek kreski też się liczy — kto zszedł niżej, kuje to, do czego dojdzie;
    // drogę schodami kopie się tylko od czoła)
    const reszta = new Set(sim.planDrogi?.dwukierunkowa ? [cz] : nieWykopane(sim));
    const przyKresce = (xx: number, yy: number) => {
      if (!stoi(sim, xx, yy)) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && w.inb(xx + dx, yy + dy) && reszta.has(w.idx(xx + dx, yy + dy))) return true;
      return false;
    };
    if (!drogaTeraz(sim, c, przyKresce, P.szukanieDrogi) && !dokopieSie(sim, c, (i) => i === cz)) return odmow(sim, c, 'nie dojdę do drogi wiernych');
    przerwij(sim, c);
    c.polecenie = { typ: 'droga', x: cz % w.w, y: (cz / w.w) | 0, od: sim.tick };
    c.odmowa = undefined;
    zapisz(sim, 'praca', `${kto(sim, c)}: rozkaz — kop drogę wiernych`, c.x, c.y);
    return null;
  }
  if (!w.inb(x, y)) return odmow(sim, c, 'tam nie sięgnę');
  // lita skała: robotnik się do niej przekopie, reszta stanie najbliżej, jak się da
  if (w.solid(x, y)) {
    if (rola === 'robotnik' && w.hardness(x, y) > 0) {
      const cel = w.idx(x, y);
      // (Alpha, jedno wiadro: podłoga drogi wiernych — wykuta urwałaby drogę do wiadra)
      if (podDroga(sim, cel)) return odmow(sim, c, 'to podłoga drogi wiernych');
      // stoi obok albo dojdzie obok — kuje stamtąd; inaczej przekopuje się przez skałę
      const obok = (xx: number, yy: number) => Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1 && stoi(sim, xx, yy);
      if (!drogaTeraz(sim, c, obok, P.szukanieDrogi) && !dokopieSie(sim, c, (i) => i === cel)) return odmow(sim, c, 'tam się nie dokopię');
      przerwij(sim, c);
      // ruda: kuje całą żyłę, nie jeden kafel
      const zyla = kruszecKafla(w.get(x, y)) ?? undefined;
      c.polecenie = zyla ? { typ: 'kop', x, y, od: sim.tick, zyla, zx: x, zy: y, zylaIle: 0 } : { typ: 'kop', x, y, od: sim.tick };
      c.odmowa = undefined;
      zapisz(sim, 'praca', `${kto(sim, c)}: rozkaz — ${zyla ? `kop żyłę ${zyla === 'zelazo' ? 'żelaza' : 'złota'} od` : 'kop do'} (${x}, ${y})`, x, y);
      return null;
    }
    const p = najblizszaPodloga(sim, x, y, P.celPromien);
    if (!p) return odmow(sim, c, rola === 'robotnik' ? 'tej skały nie ruszę' : 'tam jest lita skała');
    x = p[0]; y = p[1];
  } else {
    const p = podlogaPod(sim, x, y) ?? najblizszaPodloga(sim, x, y, P.celPromien);
    if (!p) return odmow(sim, c, 'tam nie ma na czym stanąć');
    x = p[0]; y = p[1];
  }
  const tam = (xx: number, yy: number) => Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1 && stoi(sim, xx, yy);
  if (!drogaTeraz(sim, c, tam, P.szukanieDrogi)) {
    // pobożny i rycerz nie kują sobie drogi — odmawiają; robotnik przekopie się sam
    if (rola !== 'robotnik') return odmow(sim, c, 'nie dojdę tam — nie ma drogi');
    if (!dokopieSie(sim, c, (_i, xx, yy) => tam(xx, yy))) return odmow(sim, c, 'tam się nie dokopię');
  }
  przerwij(sim, c);
  c.polecenie = { typ: 'idz', x, y, od: sim.tick };
  c.odmowa = undefined;
  zapisz(sim, 'praca', `${kto(sim, c)}: rozkaz — idź do (${x}, ${y})`, x, y);
  return null;
}

/**
 * „Kop żyłę”: wskazany kafel rudy już wykuty — następny odsłonięty kafel tej samej rudy, najbliżej robotnika
 * (albo null, gdy kępa się skończyła). W dół schodzi stopniami — najwyżej kafel niżej niż stopy robotnika albo
 * dopiero co wykuty kafel (w ten wejdzie) — tyle, ile lud wejdzie z powrotem; głębszą jamę robotnik i tak umie
 * opuścić: wykuje sobie schody. Nie rusza podłogi pod złotą kreską drogi wiernych — dół w niej odciąłby
 * pobożnych, którzy nie kują (podłoga sali rudy nie ma — generator ją stamtąd usuwa).
 */
export function nastepnyKafelZyly(sim: Sim, c: Creature, p: Polecenie): [number, number] | null {
  const w = sim.world;
  if (!p.zyla || (p.zylaIle ?? 0) >= P.zylaKafli) return null;
  const R = P.zylaZasieg;
  const zx = p.zx ?? p.x, zy = p.zy ?? p.y;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const sciezka = sim.planDrogi ? new Set(sim.planDrogi.sciezka) : null;
  let best: [number, number] | null = null, bestD = Infinity;
  for (let y = Math.max(0, zy - R); y <= Math.min(w.h - 1, zy + R, Math.max(cy, p.y) + 1); y++) {
    for (let x = Math.max(0, zx - R); x <= Math.min(w.w - 1, zx + R); x++) {
      if (!w.solid(x, y) || kruszecKafla(w.get(x, y)) !== p.zyla || w.hardness(x, y) <= 0) continue;
      // odsłonięty: obok jest pustka — żyła rośnie od tego, co już wykute
      if (!(w.passable(x - 1, y) || w.passable(x + 1, y) || w.passable(x, y - 1) || w.passable(x, y + 1))) continue;
      if (sciezka?.has(w.idx(x, y - 1))) continue;
      const d = Math.abs(x - cx) + Math.abs(y - cy);
      if (d < bestD) { bestD = d; best = [x, y]; }
    }
  }
  return best;
}

/**
 * Rozkaz dla grupy: każdy dostaje własne miejsce obok wskazanego (co dwa kafle w bok, po podłodze),
 * żeby nie stanęli jeden na drugim. Zwraca, ilu przyjęło rozkaz, i odmowy.
 */
export function wydajGrupie(sim: Sim, ids: readonly number[], x: number, y: number): { przyjeli: number; odmowy: string[] } {
  const w = sim.world;
  const lud = ids.map((id) => sim.creatureById(id)).filter((c): c is Creature => !!c && !c.dead && !!rolaPostaci(c));
  // miejsca w szeregu wokół wskazanego: 0, +2, −2, +4, −4… — tylko tam, gdzie da się stanąć
  const baza = w.inb(x, y) && !w.solid(x, y) ? (podlogaPod(sim, x, y) ?? [x, y]) : [x, y];
  const miejsca: [number, number][] = [];
  for (let k = 0; miejsca.length < lud.length && k < 24; k++) {
    const dx = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2;
    const mx = baza[0] + dx, my = baza[1];
    if (k === 0 || (w.inb(mx, my) && w.passable(mx, my) && stoi(sim, mx, my))) miejsca.push([mx, my]);
  }
  let przyjeli = 0;
  const odmowy: string[] = [];
  lud.forEach((c, i) => {
    const [mx, my] = miejsca[i] ?? baza;
    const powod = wydajPolecenie(sim, c, 'idz', mx, my);
    if (powod) odmowy.push(powod); else przyjeli++;
  });
  return { przyjeli, odmowy };
}

/** Robotnik idzie kuć plan: pierwszy kafel, do którego dojdzie (inaczej przekopie się do najbliższego). */
function kujPlan(sim: Sim, c: Creature, pom: Pomieszczenie): string | null {
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const kafle = kafleDoKucia(sim, c, pom, 4);
  if (!kafle.length) return odmow(sim, c, 'nie ma tu czego kuć');
  let cel: [number, number] | null = null;
  for (const [x, y] of kafle) {
    const obok = (xx: number, yy: number) => siegaPlanu(xx, yy, x, y) && stoi(sim, xx, yy);
    if (obok(cx, cy) || drogaTeraz(sim, c, obok, P.szukanieDrogi)) { cel = [x, y]; break; }
  }
  if (!cel && dokopieSie(sim, c, (i) => i === w.idx(kafle[0][0], kafle[0][1]))) cel = kafle[0];
  if (!cel) return odmow(sim, c, 'nie dojdę do planu');
  przerwij(sim, c);
  c.polecenie = { typ: 'kop', x: cel[0], y: cel[1], od: sim.tick, pom: pom.id };
  c.odmowa = undefined;
  zapisz(sim, 'praca', `${kto(sim, c)}: rozkaz — kuj plan (${NAZWA_POMIESZCZENIA[pom.rodzaj]})`, cel[0], cel[1]);
  return null;
}

/** Do gotowego pomieszczenia: pracować przy stole albo kowadle („praca”) albo spać na posłaniu („sen”). */
function doPomieszczenia(sim: Sim, c: Creature, pom: Pomieszczenie, typ: 'praca' | 'sen', n: number): string | null {
  const [mx, my] = miejsceWPom(pom, n);
  const tam = (x: number, y: number) => Math.abs(x - mx) <= 1 && y === my && stoi(sim, x, y);
  if (!tam(Math.floor(c.x), Math.floor(c.y)) && !drogaTeraz(sim, c, tam, P.szukanieDrogi)) return odmow(sim, c, 'nie dojdę tam — nie ma drogi');
  przerwij(sim, c);
  c.polecenie = { typ, x: mx, y: my, od: sim.tick, pom: pom.id };
  c.odmowa = undefined;
  c.snu = 0;
  zapisz(sim, 'praca', `${kto(sim, c)}: rozkaz — ${typ === 'sen' ? 'śpij w sypialni' : `pracuj: ${NAZWA_POMIESZCZENIA[pom.rodzaj]}`}`, mx, my);
  return null;
}

/**
 * Alpha, etap 3c: zaznaczonym wskazano plan albo gotowe pomieszczenie. Plan — robotnicy go kują (reszta odmawia:
 * kują tylko robotnicy). Warsztat i kuźnia — robotnicy pracują, reszta wchodzi do środka. Sypialnia — każdy idzie
 * spać. Zwraca, ilu przyjęło rozkaz, i odmowy.
 */
export function wydajNaPomieszczenie(sim: Sim, ids: readonly number[], pom: Pomieszczenie): { przyjeli: number; odmowy: string[] } {
  const lud = ids.map((id) => sim.creatureById(id)).filter((c): c is Creature => !!c && !c.dead && !!rolaPostaci(c));
  // miejsca przy stole, kowadle i na posłaniach liczą się od tych, którzy już tam są
  let zajete = sim.creatures.filter((o) => !o.dead && !ids.includes(o.id) && o.polecenie?.pom === pom.id && (o.polecenie.typ === 'praca' || o.polecenie.typ === 'sen')).length;
  let przyjeli = 0;
  const odmowy: string[] = [];
  for (const c of lud) {
    const rola = rolaPostaci(c);
    let powod: string | null;
    if (!pom.gotowe) powod = rola === 'robotnik' ? kujPlan(sim, c, pom) : odmow(sim, c, 'kują tylko robotnicy');
    else if (pom.rodzaj === 'sypialnia') powod = doPomieszczenia(sim, c, pom, 'sen', zajete);
    else if (rola === 'robotnik') powod = doPomieszczenia(sim, c, pom, 'praca', zajete);
    else { const [mx, my] = miejsceWPom(pom, 2); powod = wydajPolecenie(sim, c, 'idz', mx, my); }
    if (powod) odmowy.push(powod);
    else { przyjeli++; if (c.polecenie?.typ === 'praca' || c.polecenie?.typ === 'sen') zajete++; }
  }
  return { przyjeli, odmowy };
}

/** „Kop drogę wiernych” dla zaznaczonych robotników. */
export function drogaGrupie(sim: Sim, ids: readonly number[]): { przyjeli: number; odmowy: string[] } {
  let przyjeli = 0;
  const odmowy: string[] = [];
  for (const id of ids) {
    const c = sim.creatureById(id);
    if (!c || c.dead || rolaPostaci(c) !== 'robotnik') continue;
    const powod = wydajPolecenie(sim, c, 'droga', 0, 0);
    if (powod) odmowy.push(powod); else przyjeli++;
  }
  return { przyjeli, odmowy };
}

/** Odwołuje rozkaz — postać wraca do swoich zajęć (robotnik do noszenia jedzenia, reszta do obozu). */
export function odwolajPolecenie(sim: Sim, c: Creature): void {
  if (!c.polecenie) return;
  c.polecenie = undefined;
  c.kopieDroge = false;
  c.modliPrzyObozie = false;
  c.droga = undefined; c.drogaKopie = false;
  c.jt = 0; c.zamiarDo = sim.tick;
}

/**
 * Alpha, etap 3d: zaznaczonym wskazano ołtarz — idą do niego i zostają (pobożny modli się tuż przy nim, na dwa
 * kafle od krzyża; reszta staje dalej, żeby nie zasłaniać). Zwraca, ilu przyjęło rozkaz, i odmowy.
 */
export function wydajDoOltarza(sim: Sim, ids: readonly number[]): { przyjeli: number; odmowy: string[] } {
  const o = sim.world.oltarz;
  const lud = ids.map((id) => sim.creatureById(id)).filter((c): c is Creature => !!c && !c.dead && !!rolaPostaci(c));
  lud.sort((a, b) => (rolaPostaci(a) === 'pobozny' ? 0 : 1) - (rolaPostaci(b) === 'pobozny' ? 0 : 1));
  const zajete = new Set<number>();
  let przyjeli = 0;
  const odmowy: string[] = [];
  for (const c of lud) {
    // po tej stronie ołtarza, po której stoi — nie przechodzi przez niego bez potrzeby
    const s = c.x < o.x + 0.5 ? -1 : 1;
    const od = rolaPostaci(c) === 'pobozny' ? 2 : 3;
    const dx = [od, -od, od + 1, -(od + 1), od + 2, -(od + 2), od + 3, -(od + 3)].map((d) => d * s).find((d) => !zajete.has(d)) ?? s * od;
    zajete.add(dx);
    const powod = wydajPolecenie(sim, c, 'idz', o.x + dx, o.y);
    if (powod) odmowy.push(powod); else przyjeli++;
  }
  return { przyjeli, odmowy };
}

/** Alpha, etap 3d: okno ołtarza — „przywołaj pobożnego”: najbliższy, który dojdzie, idzie do ołtarza i tam zostaje. */
export function przywolajDoOltarza(sim: Sim): string | null {
  const o = sim.world.oltarz;
  const pobozni = sim.creatures.filter((c) => !c.dead && rolaPostaci(c) === 'pobozny')
    .sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y));
  if (!pobozni.length) return 'nie żyje żaden pobożny';
  let powod: string | null = 'nie dojdzie';
  for (const c of pobozni) {
    powod = wydajPolecenie(sim, c, 'idz', o.x + (c.x < o.x + 0.5 ? -2 : 2), o.y);
    if (!powod) return null;
  }
  return powod;
}
