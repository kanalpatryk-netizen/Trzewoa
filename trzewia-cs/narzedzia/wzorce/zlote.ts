// Wzorce do testów złotych C# (testy/Trzewia.Testy/ZloteTesty.cs). Liczone w Chromium, każde ziarno w świeżej stronie
// (OSOBNO=1 w chromium.mjs). Skrót stanu: FNV-1a 64 po kodach znaków kanonicznego zapisu stanu (stan.ts: kanon).
import { Sim } from '../../../alpha-1/src/sim/sim';
import { T } from '../../../alpha-1/src/sim/tiles';
import { ranStraznika } from '../../../alpha-1/src/sim/straznicy';
import { miejscePomnika } from '../../../alpha-1/src/sim/pomnik';
import { POMNIK } from '../../../alpha-1/src/nastawy/pomnik';
import { ruchBota, BOT_CO } from '../../../alpha-1/src/app/bot';
import { kanon } from './stan';

const PRIM = 0x100000001b3n, MASKA = (1n << 64n) - 1n;
export function fnv64(s: string): string {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) { h ^= BigInt(s.charCodeAt(i)); h = (h * PRIM) & MASKA; }
  return h.toString(16).padStart(16, '0');
}

/** Partia z botem: skrót stanu co `co` tików (od 0 do `doTiku`). */
export function skrotyBot(ziarna: number[], styl: string, co: number, doTiku: number): string[][] {
  return ziarna.map((z) => {
    const sim = new Sim(z);
    const out: string[] = [fnv64(kanon(sim))];
    for (let t = co; t <= doTiku; t += co) {
      while (sim.tick < t && !sim.ending) { sim.step(); if (sim.tick % BOT_CO === 0) ruchBota(sim, styl as never); }
      out.push(fnv64(kanon(sim)));
    }
    return out;
  });
}

/** Partia z botem do końca (albo do `maksTikow`): jak się skończyła i kiedy. */
export function wynikiBota(ziarna: number[], styl: string, maksTikow: number) {
  return ziarna.map((z) => {
    const sim = new Sim(z);
    while (sim.tick < maksTikow && !sim.ending) { sim.step(); if (sim.tick % BOT_CO === 0) ruchBota(sim, styl as never); }
    return { ziarno: z, koniec: sim.ending ?? 'brak', tik: sim.tick, skrot: fnv64(kanon(sim)) };
  });
}

/** Test Wielkiego Pomnika — scripts/test-pomnika.mjs (ta sama pętla), dla ziarna nr `z` (z * 31337 + 7). */
export function pomnik(numery: number[]) {
  return numery.map((z) => {
    const sim: any = new Sim(z * 31337 + 7);
    sim.wydarzenia.nastepne = Infinity;
    for (let i = 0; i < 400; i++) sim.step();
    const klan = sim.clans.find((k: any) => !k.dead && k.pop > 3) ?? sim.clans[0];
    let warta: any[] = [];
    const kolejnosc = (o: any) => (o.rola === 'robotnik' ? 1 : 0);
    const uzupelnij = () => {
      warta = warta.filter((c) => !c.dead);
      while (warta.length < 4) {
        const c = [...sim.creatures].sort((a: any, b: any) => kolejnosc(a) - kolejnosc(b)).find((o: any) => !o.dead && !o.straznik && !warta.includes(o));
        if (!c) break;
        c.clan = klan.id;
        warta.push(c);
      }
      klan.pop = Math.max(klan.pop, warta.length);
    };
    const stany: [number, number][] = [];
    const fazy: [string, number][] = [];
    let bossStart: any = null;
    let i = 0;
    for (; i < 200000 && !sim.ending; i++) {
      sim.step();
      const p = sim.lud.pomnik;
      if (p) {
        if (!stany.length || stany[stany.length - 1][0] !== p.stan) stany.push([p.stan, i]);
        if (!fazy.length || fazy[fazy.length - 1][0] !== p.faza) fazy.push([p.faza, i]);
      }
      if (i % 60 === 0) for (const c of sim.creatures) if (!c.dead && c.straznik && !c.boss) sim.kill(c, 'test', 'test');
      const boss = sim.creatures.find((c: any) => !c.dead && c.boss);
      if (boss && !bossStart) bossStart = { x: boss.x, y: boss.y, m: miejscePomnika(sim) };
      if (boss && p?.faza === 'walka' && i - fazy[fazy.length - 1][1] > 600 && i % 30 === 0) {
        const r = sim.creatures.find((c: any) => !c.dead && c.rola === 'rycerz');
        if (r) ranStraznika(sim, boss, r, 60);
      }
      klan.devotion = 1;
      klan.dead = false;
      if (i % 50 === 0) uzupelnij();
      if (i % 600 === 0 && sim.planDrogi) {
        const w = sim.world;
        for (const k of sim.planDrogi.kopac) if (w.tile[k] !== T.CORE && w.tile[k] !== T.STONE) w.tile[k] = T.AIR;
      }
      for (const c of warta) {
        if (c.dead) continue;
        c.devotion = 1;
        c.hunger = 0.1;
        c.hp = Math.max(c.hp, 30);
        c.x = sim.world.coreX + (i % 5) - 2; c.y = sim.world.coreY - 14;
      }
      sim.sen = 0;
    }
    return { ziarno: z, pekniecia: sim.rytual.pekniecia, stany, fazy, bossStart, koniec: sim.ending ?? 'brak', tikow: i, pekniec: POMNIK.pekniec, skrot: fnv64(kanon(sim)) };
  });
}
