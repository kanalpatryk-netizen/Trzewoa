import type { Sim } from './sim';
import { RACES } from './races';
import { PASSABLE, T } from './tiles';
import { WORLD_W, WORLD_H } from './world';
import { wolny, stoi, uchwyt, nadOgniem } from './droga';
import { PLAN_DROGI } from '../nastawy/rytual';

/**
 * Droga pielgrzymów: którędy najwierniejsza nacja zejdzie pod rdzeń i — co ważniejsze —
 * wróci. Pielgrzymka rusza dopiero wtedy, gdy spod rdzenia da się wrócić do gniazda,
 * a gniazdo zwykle leży daleko w bok. Gracz nie miał jak zgadnąć, gdzie kopać:
 * podpowiedź kazała drążyć pion pod rdzeniem, który z gniazdem się nie łączył.
 *
 * Plan to najtańsza droga od przedsionka do gniazda, z tą samą fizyką co chodzenie
 * (wspinać się trzeba przy ścianie, z krawędzi się spada), w której skała jest
 * dozwolona, ale drogo — każdy kafel skały to kafel do wydrążenia.
 */
export interface PlanDrogi {
  klan: number;
  tick: number;
  /** Kafle od przedsionka do gniazda. */
  sciezka: number[];
  /** Kafle skały na tej drodze — to trzeba wydrążyć. */
  kopac: number[];
}

const KOSZT_SKALY = PLAN_DROGI.kosztSkaly;
const K = KOSZT_SKALY + 1;
const N = WORLD_W * WORLD_H;
const odl = new Int32Array(N);
const skad = new Int32Array(N);

/** Co da się wydrążyć rytem: lita skała, ziemia i ruda — ale nie ołtarz, kuźnia ani skorupa. */
export function doKopania(t: number): boolean {
  return PASSABLE[t] !== 1 && t !== T.STONE && t !== T.CORE && t !== T.SHRINE && t !== T.FORGE;
}

export function planujDroge(sim: Sim, klanId: number): PlanDrogi | null {
  const w = sim.world, W = w.w;
  const klan = sim.clans[klanId];
  if (!klan) return null;
  const plywa = RACES[klan.race].swims;
  odl.fill(0x3fffffff);
  const kubly: number[][] = Array.from({ length: K }, () => []);
  let zostalo = 0;
  const wstaw = (j: number, d: number, od: number): void => {
    if (d >= odl[j]) return;
    odl[j] = d; skad[j] = od;
    kubly[d % K].push(j); zostalo++;
  };
  // start: środek przedsionka ± 2 kafle w pionie i ± 4 w poziomie
  for (let y = w.przedsionekY - 2; y <= w.przedsionekY + 2; y++) {
    for (let x = w.coreX - 4; x <= w.coreX + 4; x++) {
      if (!w.inb(x, y)) continue;
      const i = w.idx(x, y);
      if (wolny(sim, i, plywa)) wstaw(i, 0, -1);
    }
  }
  // skały przy ogniu i przy wodzie nie ruszamy: przebity strop zalałby drogę i gniazdo
  const bezpieczna = (i: number) => {
    const x = i % W;
    for (const j of [i - W, i + W, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1]) {
      if (j < 0 || j >= N) continue;
      if (w.magma[j] > 0 || w.water[j] > 2) return false;
    }
    return true;
  };
  const skala = (i: number) => doKopania(w.tile[i]) && w.magma[i] === 0 && bezpieczna(i);
  // czterech sąsiadów bez zawijania przez brzeg mapy — kafel x=0 nie sąsiaduje z x=175
  const sasiedzi = (i: number): number[] => {
    const x = i % W, out: number[] = [];
    if (i - W >= 0) out.push(i - W);
    if (i + W < N) out.push(i + W);
    if (x > 0) out.push(i - 1);
    if (x < W - 1) out.push(i + 1);
    return out;
  };
  let meta = -1;
  for (let d = 0; zostalo > 0; d++) {
    const kubel = kubly[d % K];
    while (kubel.length) {
      const i = kubel.pop()!;
      zostalo--;
      if (odl[i] !== d) continue;
      const x = i % W, y = (i / W) | 0;
      if (Math.abs(x - klan.hx) <= 3 && Math.abs(y - klan.hy) <= 3 && !skala(i)) { meta = i; break; }
      if (skala(i)) {
        // wydrążony wąski korytarz: ściany z obu stron, więc wolno w każdą stronę
        for (const j of sasiedzi(i)) {
          if (wolny(sim, j, plywa)) wstaw(j, d + 1, i);
          else if (skala(j)) wstaw(j, d + KOSZT_SKALY, i);
        }
        continue;
      }
      const naPodlodze = stoi(sim, x, y);
      const wisi = !naPodlodze && uchwyt(sim, x, y);
      if (!naPodlodze && y + 1 < WORLD_H && wolny(sim, i + W, plywa)) wstaw(i + W, d + 1, i);
      if (!naPodlodze && !wisi) continue;
      if (y > 0 && wolny(sim, i - W, plywa) && uchwyt(sim, x, y - 1)) wstaw(i - W, d + 1, i);
      for (const dx of [-1, 1]) {
        const nx = x + dx;
        if (nx < 0 || nx >= W) continue;
        const j = i + dx;
        if (!wolny(sim, j, plywa)) continue;
        const tamStoi = stoi(sim, nx, y);
        if (wisi && !tamStoi) continue;
        if (!tamStoi && nadOgniem(sim, nx, y)) continue;
        wstaw(j, d + 1, i);
      }
      // z podłogi albo z wiszenia można zacząć kuć w każdą stronę
      for (const j of sasiedzi(i)) if (skala(j)) wstaw(j, d + KOSZT_SKALY, i);
    }
    if (meta >= 0) break;
    if (d > N * KOSZT_SKALY) break;
  }
  if (meta < 0) return null;
  const sciezka: number[] = [];
  for (let k = meta; k !== -1; k = skad[k]) sciezka.push(k);
  sciezka.reverse();
  return { klan: klanId, tick: sim.tick, sciezka, kopac: sciezka.filter((i) => skala(i)) };
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
 * Plan dla najwierniejszej nacji, liczony najwyżej raz na kilkaset tików. Gdy droga
 * już istnieje (nic do kopania) albo rytuał trwa, plan jest pusty.
 */
export function aktualnyPlan(sim: Sim): PlanDrogi | null {
  const klan = najwierniejsza(sim);
  // plan rusza, gdy nacja jest gotowa na pielgrzymkę — wcześniej drążenie tylko psuło gniazda
  if (!klan || klan.devotion < PLAN_DROGI.oddanieNacji || klan.pop < PLAN_DROGI.minNacja || sim.rytual.otwarta) { sim.planDrogi = null; return null; }
  const stary = sim.planDrogi;
  if (stary && stary.klan === klan.id && sim.tick - stary.tick < PLAN_DROGI.odswiezCo) {
    stary.kopac = stary.kopac.filter((i) => doKopania(sim.world.tile[i]));
    return stary;
  }
  sim.planDrogi = planujDroge(sim, klan.id);
  return sim.planDrogi;
}
