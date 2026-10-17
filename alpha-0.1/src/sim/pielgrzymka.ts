import type { Sim } from './sim';
import { zapisz, NAZWY_KAFLI } from './dziennik';
import { RACES, Race } from './races';
import { PASSABLE, T } from './tiles';
import { WORLD_W, WORLD_H } from './world';
import { wolny, stoi, uchwyt, nadOgniem, przepasc, szukajKopiac, szukajDrogi, budzetDrog, nowyTik } from './droga';
import { rolaPostaci } from './lud';
import { zdarzenie } from './pomieszczenia';
import { Job } from './creatures';
import { PLAN_DROGI, PIELGRZYMKA } from '../nastawy/rytual';
import { REMAKE } from '../nastawy/lud';

/**
 * Droga pielgrzymów: którędy najwierniejsza nacja zejdzie pod rdzeń i — co ważniejsze —
 * wróci. Pielgrzymka rusza dopiero wtedy, gdy spod rdzenia da się wrócić do gniazda,
 * a gniazdo zwykle leży daleko w bok. Gracz nie miał jak zgadnąć, gdzie kopać:
 * podpowiedź kazała drążyć pion pod rdzeniem, który z gniazdem się nie łączył.
 *
 * Plan to najtańsza droga od przedsionka do gniazda, z tą samą fizyką co chodzenie
 * (wspinać się trzeba przy ścianie, z krawędzi się spada), w której skała jest
 * dozwolona, ale drogo — każdy kafel skały to kafel do wydrążenia.
 *
 * Remake v2: lud nie ma już lin ani klamer i wchodzi najwyżej o stopień, więc plan liczy się tak,
 * jak pójdą — od siedziby w dół pod rdzeń (szybem się zsuwają, skałę kują po drodze); trasa nie musi
 * się dać przejść pod górę. Kafle planu wciąż trzymają się sucho (próg), ale nie są już drabiną.
 */
export interface PlanDrogi {
  klan: number;
  tick: number;
  /** Kafle od przedsionka do gniazda. */
  sciezka: number[];
  /** Kafle skały na tej drodze — to trzeba wydrążyć. */
  kopac: number[];
  /** Alpha: droga schodami (nigdzie zeskoku wyższego niż o kafel; pod górę nie przejdzie się tylko na zakrętach). */
  dwukierunkowa?: boolean;
  /** Alpha (jedno wiadro): kafle drogi, w których robotnicy dobijają szczebel — na zakrętach, żeby dało się wrócić. */
  szczeble?: number[];
  /** (kafle `sciezka` jako zbiór — liczony raz, przy pierwszym pytaniu; sim/droga.ts: podDroga) */
  zbior?: Set<number>;
}

const KOSZT_SKALY = PLAN_DROGI.kosztSkaly;
const N = WORLD_W * WORLD_H;

/** Co da się wydrążyć rytem: lita skała, ziemia i ruda — ale nie ołtarz, kuźnia ani skorupa. */
export function doKopania(t: number): boolean {
  return PASSABLE[t] !== 1 && t !== T.STONE && t !== T.CORE && t !== T.SHRINE && t !== T.FORGE;
}

/**
 * Remake v1: kafle, do których da się dojść z siedziby (te same zasady ruchu co lud, z drogą
 * wiernych jako drogą w obie strony). Plan musi kończyć się na jednym z nich — inaczej
 * kończył się „przy siedzibie”, ale za szczeliną, i nikt nie mógł zacząć kopać.
 */
const zBazy = new Uint8Array(N);
function osiagalneZBazy(sim: Sim, hx: number, hy: number): void {
  const w = sim.world, W = w.w;
  zBazy.fill(0);
  const kolejka: number[] = [];
  const dodaj = (j: number) => { if (!zBazy[j]) { zBazy[j] = 1; kolejka.push(j); } };
  if (!w.inb(hx, hy)) return;
  dodaj(w.idx(hx, hy));
  for (let g = 0; g < kolejka.length && kolejka.length < 8000; g++) {
    const i = kolejka[g];
    const x = i % W, y = (i / W) | 0;
    const naPodlodze = stoi(sim, x, y);
    const wisi = !naPodlodze && uchwyt(sim, x, y);
    // (Alpha: droga w obie strony — z powietrza w dół tylko o kafel, na podłogę)
    if (!naPodlodze && y + 1 < WORLD_H && wolny(sim, i + W, false) && !(wisi && przepasc(sim, x, y + 1))
        && (!PLAN_DROGI.dwukierunkowa || stoi(sim, x, y + 1))) dodaj(i + W);
    if (!naPodlodze && !wisi) continue;
    // w górę tylko z podłogi, na stopień (Remake v2)
    if (naPodlodze && y > 0 && wolny(sim, i - W, false)) dodaj(i - W);
    for (const dx of [-1, 1]) {
      const nx = x + dx;
      if (nx < 0 || nx >= W) continue;
      const j = i + dx;
      if (!wolny(sim, j, false)) continue;
      const tamStoi = stoi(sim, nx, y);
      if (wisi && !tamStoi) continue;
      if (!tamStoi && (nadOgniem(sim, nx, y) || przepasc(sim, nx, y))) continue;
      dodaj(j);
    }
  }
}

export function planujDroge(sim: Sim, klanId: number, proba = 0, dwukierunkowa = PLAN_DROGI.dwukierunkowa): PlanDrogi | null {
  const w = sim.world, W = w.w;
  const klan = sim.clans[klanId];
  if (!klan) return null;
  if (proba === 0) osiagalneZBazy(sim, klan.hx, klan.hy);
  const plywa = RACES[klan.race].swims;
  // skały przy ogniu i przy wodzie nie ruszamy: przebity strop zalałby drogę i gniazdo
  const bezpieczna = (i: number) => {
    const x = i % W;
    for (const j of [i - W, i + W, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1]) {
      if (j < 0 || j >= N) continue;
      if (w.magma[j] > 0 || w.water[j] > 2) return false;
    }
    return true;
  };
  // (czoło, do którego kopacze nie mogli dojść, plan chwilowo omija)
  const omijaj = new Set((sim.lud?.omijaj ?? []).filter(([, do_]) => do_ > sim.tick).map(([i]) => i));
  // (Alpha: nie przez kolumnę pod otworem z wiadrem — droga wiernych wykopana pod wiadrem sprowadzała je w głąb
  // i lud w sali zostawał bez jedzenia; pogłębić szyb może tylko gracz)
  const podWiadrem = (i: number) => i % W === w.szybWiadraX && ((i / W) | 0) > w.szybWiadraDol;
  const skala = (i: number) => doKopania(w.tile[i]) && w.magma[i] === 0 && bezpieczna(i) && !omijaj.has(i) && !podWiadrem(i);
  // start: kafle osiągalne z siedziby — w pudle przy niej, a zapasowo dowolne (i w ostateczności tuż przy siedzibie)
  const starty: number[] = [];
  for (let i = 0; i < N; i++) {
    if (!wolny(sim, i, plywa)) continue;
    const x = i % W, y = (i / W) | 0;
    const blisko = proba === 0 ? zBazy[i] === 1 && Math.abs(x - klan.hx) <= 12 && Math.abs(y - klan.hy) <= 8
      : proba === 1 ? zBazy[i] === 1 : Math.abs(x - klan.hx) <= 3 && Math.abs(y - klan.hy) <= 3;
    if (blisko) starty.push(i);
  }
  // meta: przedsionek (środek ± 4 kafle w poziomie i ± 2 w pionie)
  // (Alpha, droga w obie strony: stojąc w przedsionku, na jego dnie — w locie przez pas ± 2 już się nie przelatuje;
  // tylko w dolnej połowie: stojąc na jego stropie z boku, droga kończyła się w kieszeni nad kryptą, za jednym kaflem
  // skały. Do krypty droga wchodzi tam, gdzie najtaniej, a dalej prowadzi jej podłogą pod rdzeń)
  const wPrzedsionku = (x: number, y: number) => Math.abs(x - w.coreX) <= 4
    && (dwukierunkowa ? y >= w.przedsionekY && y - w.przedsionekY < PIELGRZYMKA.przedsionekY && stoi(sim, x, y) : Math.abs(y - w.przedsionekY) <= 2);
  const r = szukajKopiac(sim, starty, (_i, x, y) => wPrzedsionku(x, y), {
    koszt: (i) => (skala(i) ? KOSZT_SKALY : -1), limit: N, plywa, zBudzetu: false, dwukierunkowa,
  });
  // (gdy schodami w obie strony się nie da — na przykład pod rdzeń prowadzi tylko zeskok — zostaje droga w dół)
  if (!r) return proba < 2 ? planujDroge(sim, klanId, proba + 1, dwukierunkowa) : dwukierunkowa ? planujDroge(sim, klanId, 0, false) : null;
  // kreska od przedsionka do siedziby (tak ją czytają kopacze i pielgrzymi — od końca)
  const sciezka = [r.start, ...r.droga].reverse();
  return { klan: klanId, tick: sim.tick, sciezka, kopac: sciezka.filter((i) => skala(i)), dwukierunkowa, szczeble: szczebleDrogi(sim, sciezka) };
}

/**
 * Alpha (jedno wiadro): szczeble na zakrętach drogi wiernych. Schodami da się zejść, ale tam, gdzie droga skręca,
 * nie wejdzie się z powrotem — a jedzenie zjeżdża już tylko szybem do sali, więc kopacze w głębi i warta pod
 * rdzeniem nie miały jak wrócić się najeść. Liczone na drodze wykopanej „w wyobraźni”: krok po kroku od przedsionka
 * w górę; gdzie z kafla nie dojdzie się do następnego, szczebel w następnym, w tym, w obu albo w dwóch kolejnych.
 */
function szczebleDrogi(sim: Sim, sciezka: number[]): number[] {
  const w = sim.world, W = w.w;
  const zostalo = budzetDrog();
  const bylo = sciezka.map((i) => w.tile[i]);
  for (const i of sciezka) if (PASSABLE[w.tile[i]] !== 1) w.tile[i] = T.AIR;
  const dojdzie = (a: number, b: number) => {
    nowyTik(1);
    const c = { x: (a % W) + 0.5, y: (a / W) | 0, race: Race.GOBLIN } as Parameters<typeof szukajDrogi>[1];
    return !!szukajDrogi(sim, c, (i) => i === b, 80);
  };
  const szczeble: number[] = [];
  for (let k = 0; k + 1 < sciezka.length; k++) {
    const a = sciezka[k], b = sciezka[k + 1];
    if (dojdzie(a, b)) continue;
    for (const proba of [[b], [a], [a, b], [b, sciezka[k + 2] ?? b]]) {
      const nowe = proba.filter((i) => !w.drabina[i]);
      for (const i of nowe) w.drabina[i] = 1;
      if (dojdzie(a, b)) { szczeble.push(...nowe); break; }
      for (const i of nowe) w.drabina[i] = 0;
    }
  }
  sciezka.forEach((i, k) => { w.tile[i] = bylo[k]; });
  for (const i of szczeble) w.drabina[i] = 0;
  nowyTik(zostalo);
  return szczeble;
}

/**
 * Alpha (jedno wiadro): robotnik, który stoi przy wykopanym zakręcie drogi wiernych, dobija w nim szczebel
 * (ta sama drabina i to samo dobicie — błysk i pył — co przy drabinach z planu, render/pomieszczenia.ts).
 */
function dobijajSzczeble(sim: Sim, p: PlanDrogi): void {
  const w = sim.world, W = w.w;
  for (const i of p.szczeble ?? []) {
    if (w.drabina[i] || PASSABLE[w.tile[i]] !== 1 || w.magma[i] > 0) continue;
    const x = i % W, y = (i / W) | 0;
    const kto = sim.creatures.find((c) => !c.dead && rolaPostaci(c) === 'robotnik' && Math.abs(c.x - (x + 0.5)) <= 2.5 && Math.abs(c.y - y) <= 2.5);
    if (!kto) continue;
    w.drabina[i] = 1;
    zdarzenie(sim, { rodzaj: 'szczebel', x, y, tik: sim.tick });
    zapisz(sim, 'praca', `robotnik #${kto.id} dobił szczebel na zakręcie drogi wiernych (${x}, ${y}) — tędy wróci się pod górę`, x, y);
    return;
  }
}

/**
 * Alpha: czy stary plan wciąż się nadaje — każdy jego kafel da się przejść albo wykuć, nic nie leży na liście
 * omijanych (czoło, które stoi — pilnujCzola) i (gdy droga ma iść w obie strony) plan nie jest zapasową drogą w dół.
 */
function planWciazDobry(sim: Sim, p: PlanDrogi): boolean {
  const w = sim.world;
  if (PLAN_DROGI.dwukierunkowa && !p.dwukierunkowa && sim.tick - p.tick > PLAN_DROGI.zapasowyPonowCo) return false;
  const omijaj = new Set((sim.lud?.omijaj ?? []).filter(([, do_]) => do_ > sim.tick).map(([i]) => i));
  for (const i of p.sciezka) {
    if (omijaj.has(i)) return false;
    if (PASSABLE[w.tile[i]] !== 1 && !doKopania(w.tile[i])) return false;
  }
  return true;
}

/**
 * Remake v1: czoło drogi, które stoi, choć kopacze są do niego wysłani (wisi nad szybem bez podłogi,
 * kopacz zjeżdża po linie i wraca w kółko) — po `czoloStoi` plan drogi omija ten kafel i liczy się od nowa.
 */
export function pilnujCzola(sim: Sim): void {
  if (!REMAKE || !sim.lud) return;
  const cz = czoloDrogi(sim);
  const st = sim.lud.czolo;
  if (!st || st.i !== cz) { sim.lud.czolo = { i: cz, od: sim.tick, prob: 0, zk: 0 }; return; }
  if (cz < 0) return;
  st.prob++;
  // liczy się tylko kopacz tuż przy czole — stoi, bo nie da się go wykuć, a nie dlatego, że nie miał kto przyjść
  // (przy dwóch głodnych robotnikach plan omijał czoło i brał trasę dłuższą o sto kafli)
  const fx = cz % sim.world.w, fy = (cz / sim.world.w) | 0;
  if (sim.creatures.some((c) => !c.dead && c.kopieDroge && Math.abs(c.x - fx) <= 3 && Math.abs(c.y - fy) <= 3)) st.zk++;
  // czoło przy samej magmie — robotnicy tam nie kopią (płonęli), więc nie ma na co czekać; inaczej wszyscy
  // „odpoczywali przy spiżarni”, a droga stała po kilkanaście minut
  const w0 = sim.world, przyOgniu = sim.przyMagmie(cz % w0.w, (cz / w0.w) | 0, 2);
  if (!przyOgniu && (sim.tick - st.od < PLAN_DROGI.czoloStoi || st.zk < st.prob * 0.5)) return;
  sim.lud.omijaj = (sim.lud.omijaj ?? []).filter(([, do_]) => do_ > sim.tick);
  sim.lud.omijaj.push([cz, sim.tick + PLAN_DROGI.czoloOmijaj]);
  sim.lud.czolo = undefined;
  const w = sim.world;
  const stary = sim.planDrogi;
  odswiezPlan(sim);
  // objazd dużo dłuższy niż to, co zostało — zostaje stary plan (przy magmie i tak nikt czoła nie wykuje)
  if (!przyOgniu && stary && sim.planDrogi && sim.planDrogi.kopac.length > stary.kopac.length * 1.5 + 10) {
    sim.lud.omijaj = sim.lud.omijaj.filter(([i]) => i !== cz);
    sim.planDrogi = stary;
    zapisz(sim, 'praca', `czoło drogi (${cz % w.w}, ${(cz / w.w) | 0}) stoi, ale objazd byłby dużo dłuższy — plan zostaje`, cz % w.w, (cz / w.w) | 0);
    return;
  }
  zapisz(sim, 'praca', `czoło drogi (${cz % w.w}, ${(cz / w.w) | 0}) stoi — plan je omija`, cz % w.w, (cz / w.w) | 0);
}

/** Alpha: kafle skały na kresce, których jeszcze nikt nie wykuł — od strony obozu (jak czoło) do przedsionka. */
export function nieWykopane(sim: Sim): number[] {
  const p = sim.planDrogi;
  if (!p || sim.rytual.otwarta) return [];
  const w = sim.world;
  const out: number[] = [];
  for (let k = p.sciezka.length - 1; k >= 0; k--) if (doKopania(w.tile[p.sciezka[k]])) out.push(p.sciezka[k]);
  return out;
}

/** Remake v1: czoło drogi — pierwszy kafel skały na kresce od strony obozu (tam kopie robotnik), albo -1. */
export function czoloDrogi(sim: Sim): number {
  const p = sim.planDrogi;
  if (!p || sim.rytual.otwarta) return -1;
  const w = sim.world;
  for (let k = p.sciezka.length - 1; k >= 0; k--) if (doKopania(w.tile[p.sciezka[k]])) return p.sciezka[k];
  return -1;
}

/** Nacja, która pierwsza może zejść pod rdzeń: najwierniejsza z tych, które mają kogo wysłać. */
export function najwierniejsza(sim: Sim): Sim['clans'][number] | null {
  let best: Sim['clans'][number] | null = null;
  for (const k of sim.clans) {
    if (k.dead || k.pop < PLAN_DROGI.minNacja || RACES[k.race].faithGain <= 0) continue;
    if (!best || k.devotion > best.devotion) best = k;
  }
  return best;
}

/**
 * Plan dla najwierniejszej nacji. Liczy go sama symulacja, w stałym rytmie
 * (co PLAN_DROGI.odswiezCo tików) — idą nim pielgrzymi, więc nie może zależeć od tego,
 * kiedy akurat zapyta o niego ekran. Gdy skorupa otwarta, planu nie ma.
 */
export function odswiezPlan(sim: Sim): void {
  if (sim.rytual.otwarta) { sim.planDrogi = null; return; }
  // Remake v1: drogę kopią robotnicy od początku partii — plan jest zawsze, dla jedynego ludu
  // (przed planem dla wysłanych: lud jest tu jedyną nacją, a pielgrzymi w drodze przeliczali plan od zera —
  // gotowa droga wiernych zamieniała się w nową, niewykopaną, a pielgrzym stawał w pół drogi)
  if (REMAKE) {
    const lud = sim.clans.find((k) => !k.dead && k.race === Race.GOBLIN);
    // Alpha: raz wyznaczona droga zostaje, póki da się nią iść i kopać — przeliczana co 5 s zmieniała trasę
    // po pierwszych wykopanych schodach, a robotników na rozkaz wysyłało do odległego jej kawałka, pod zeskoki
    const stary = sim.planDrogi;
    if (stary && lud && stary.klan === lud.id && PLAN_DROGI.stala && planWciazDobry(sim, stary)) return;
    sim.planDrogi = lud ? planujDroge(sim, lud.id) : null;
    return;
  }
  // Nacja, której ludzi posłałeś szeptem „módl się”, dostaje plan od razu — bez czekania,
  // aż cała uwierzy. Inaczej wysłani szli na przełaj i stawali na pierwszej ścianie.
  const wyslani = klanWyslanych(sim);
  if (wyslani) { sim.planDrogi = planujDroge(sim, wyslani.id); return; }
  const klan = najwierniejsza(sim);
  // plan rusza, gdy nacja jest gotowa na pielgrzymkę — wcześniej drążenie tylko psuło gniazda
  if (!klan || klan.devotion < PLAN_DROGI.oddanieNacji || klan.pop < PLAN_DROGI.minNacja) { sim.planDrogi = null; return; }
  sim.planDrogi = planujDroge(sim, klan.id);
}

/** Nacja z największą liczbą pielgrzymów w drodze (z szeptu albo z własnej wiary) — albo null. */
function klanWyslanych(sim: Sim): Sim['clans'][number] | null {
  const ilu = new Map<number, number>();
  for (const c of sim.creatures) {
    if (c.dead || c.job !== Job.PIELGRZYM) continue;
    ilu.set(c.clan, (ilu.get(c.clan) ?? 0) + 1);
  }
  let best: Sim['clans'][number] | null = null, n = 0;
  for (const [id, k] of ilu) {
    const klan = sim.clans[id];
    if (klan && !klan.dead && k > n) { best = klan; n = k; }
  }
  return best;
}

/** Plan do pokazania graczowi: bez przeliczania, a już wydrążone kafle odpadają z listy. */
export function aktualnyPlan(sim: Sim): PlanDrogi | null {
  const p = sim.planDrogi;
  if (!p) return null;
  p.kopac = p.kopac.filter((i) => doKopania(sim.world.tile[i]));
  return p;
}

/**
 * Góra drąży drogę swoim wiernym (wersja na telefon nie ma rytu drążenia): póki ktoś z nacji
 * z planu idzie pod rdzeń, co `PLAN_DROGI.drazenieCo` tików znika jeden kafel skały ze złotej
 * kreski — od strony gniazda, więc korytarz rośnie przed pielgrzymami — a cała droga
 * zostaje sucha. Alpha: góra już sama nie drąży — drogę kopią robotnicy na rozkaz
 * (a skrócić ją może dłoń anielska); zostaje tylko osuszanie kreski.
 */
export function drazDrogeWiernym(sim: Sim): void {
  const p = sim.planDrogi;
  if (!p || sim.rytual.otwarta) return;
  // Remake v1: drogę kopią robotnicy; góra osusza kreskę i daje stopnie, a sama drąży
  // (powoli) tylko wtedy, gdy pielgrzymi czekają, a żaden robotnik akurat nie kopie
  if (REMAKE) {
    const w = sim.world;
    dobijajSzczeble(sim, p);
    for (const i of p.sciezka) {
      w.prog[i] = 1;
      if (w.water[i] > 0 || w.magma[i] > 0) { w.water[i] = 0; w.magma[i] = 0; }
    }
    // magma tuż przy drodze zastyga w kamień — wlewała się do korytarza i paliła kopaczy jednego po drugim
    if (sim.tick % 60 === 0) {
      for (const i of p.sciezka) {
        const x = i % w.w, y = (i / w.w) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!w.inb(x + dx, y + dy)) continue;
          const j = w.idx(x + dx, y + dy);
          if (w.magma[j] > 0 && !p.sciezka.includes(j)) { w.magma[j] = 0; if (w.tile[j] !== T.CORE) w.tile[j] = T.STONE; }
        }
      }
    }
    return;
  }
  let idzie = false;
  for (const c of sim.creatures) if (!c.dead && c.clan === p.klan && c.job === Job.PIELGRZYM) { idzie = true; break; }
  if (!idzie) return;
  const w = sim.world;
  // Góra osusza drogę wiernych: wydrążony korytarz przebijał kieszenie wody i magmy, ciecz
  // zalewała go, a Ślepy Lud (nie pływa) stawał w połowie drogi i plan znikał na dobre.
  // Próg na kaflach drogi nie wpuszcza cieczy (jak pierścień wokół przedsionka).
  for (const i of p.sciezka) {
    w.prog[i] = 1;
    if (w.water[i] > 0 || w.magma[i] > 0) { w.water[i] = 0; w.magma[i] = 0; }
  }
  while (p.kopac.length) {
    const i = p.kopac.pop()!;
    if (!doKopania(w.tile[i])) continue;
    const bylo = w.tile[i];
    w.tile[i] = T.AIR;
    zapisz(sim, 'blok', `blok (${i % w.w}, ${(i / w.w) | 0}) zniszczony: ${NAZWY_KAFLI[bylo] ?? bylo} → pustka — góra drąży drogę wiernym`, i % w.w, (i / w.w) | 0);
    const x = i % w.w, y = (i / w.w) | 0;
    w.oznaczSlad(x, y, 1, sim.tick);
    if (sim.rng.chance(0.25)) sim.spark(x + 0.5, y + 0.5, 'dust');
    return;
  }
}
