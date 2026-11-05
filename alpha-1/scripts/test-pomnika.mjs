/**
 * Test Wielkiego Pomnika (Alpha, etap 5): czy modlitwa wiernych kruszy pomnik w trzech stanach, czy przy 100%
 * pomnik się rozpada, a z gruzów wstaje demon, i czy ostatnie uderzenie rycerza kończy grę Uwolnieniem
 * (po animacji konania).
 *
 *   node scripts/test-pomnika.mjs [ile światów]
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ILE = Number(process.argv[2] ?? 12);
const katalog = mkdtempSync(join(tmpdir(), 'trzewia-pomnik-'));
const wejscie = join(katalog, 'wejscie.ts');
const wyjscie = join(katalog, 'wyjscie.mjs');
const src = (f) => JSON.stringify(join(process.cwd(), 'src', f));

writeFileSync(wejscie, `
import { Sim } from ${src('sim/sim.ts')};
import { T } from ${src('sim/tiles.ts')};
import { ranStraznika } from ${src('sim/straznicy.ts')};
import { miejscePomnika } from ${src('sim/pomnik.ts')};
import { POMNIK } from ${src('nastawy/pomnik.ts')};

export function sprawdz(ile: number) {
  const wyniki: any[] = [];
  for (let z = 0; z < ile; z++) {
    const sim: any = new Sim(z * 31337 + 7);
    // test mechaniki pomnika — karty wydarzeń (z domyślnymi wyborami) tylko by go zaszumiły
    sim.wydarzenia.nastepne = Infinity;
    for (let i = 0; i < 400; i++) sim.step();

    // wymuszony rytuał: drużyna trzyma wartę w krypcie i naprawdę w ciebie wierzy
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
      // zwykłe fale „pokonuje” od razu (jak gdyby broniła ich warta) — demona nie
      if (i % 60 === 0) for (const c of sim.creatures) if (!c.dead && c.straznik && !c.boss) sim.kill(c, 'test', 'test');
      const boss = sim.creatures.find((c: any) => !c.dead && c.boss);
      if (boss && !bossStart) bossStart = { x: boss.x, y: boss.y, m: miejscePomnika(sim) };
      // demon: po 5 s walki rycerz bije go aż do ostatniego uderzenia
      if (boss && p?.faza === 'walka' && i - fazy[fazy.length - 1][1] > 600 && i % 30 === 0) {
        const r = sim.creatures.find((c: any) => !c.dead && c.rola === 'rycerz');
        if (r) ranStraznika(sim, boss, r, 60);
      }
      klan.devotion = 1;
      klan.dead = false;
      if (i % 50 === 0) uzupelnij();
      // Alpha: drogę do krypty kopie się na rozkaz gracza — test sam ją wykuwa (sprawdza pomnik, nie kopaczy)
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
    wyniki.push({ ziarno: z, pekniecia: sim.rytual.pekniecia, stany, fazy, bossStart, koniec: sim.ending ?? 'brak', tikow: i, pekniec: POMNIK.pekniec });
  }
  return wyniki;
}
`);

await build({ entryPoints: [wejscie], outfile: wyjscie, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' });
const { sprawdz } = await import(pathToFileURL(wyjscie).href);
const wyniki = sprawdz(ILE);
let zle = 0;
for (const w of wyniki) {
  const okStany = w.stany.map((s) => s[0]).join(',') === '0,1,2,3';
  const okFazy = w.fazy.map((f) => f[0]).join(',') === 'stoi,rozpada,wychodzi,walka,kona';
  const okBoss = !!w.bossStart && Math.abs(w.bossStart.x - w.bossStart.m.x) < 0.01 && Math.abs(w.bossStart.y - w.bossStart.m.y) < 0.5;
  const okKoniec = String(w.koniec).startsWith('uwolnienie') && w.pekniecia === w.pekniec;
  const ok = okStany && okFazy && okBoss && okKoniec;
  if (!ok) zle++;
  console.log(`ziarno ${w.ziarno}: pęknięć ${w.pekniecia} · stany ${w.stany.map((s) => `${s[0]}@${s[1]}`).join(' ')}` +
    ` · fazy ${w.fazy.map((f) => `${f[0]}@${f[1]}`).join(' ')} · demon wstał ${w.bossStart ? `(${w.bossStart.x.toFixed(1)}, ${w.bossStart.y.toFixed(1)})` : 'NIE'}` +
    ` · koniec ${w.koniec} po ${w.tikow} tikach${ok ? '' : '  ← ŹLE'}`);
}
console.log(`\n${ILE - zle}/${ILE} światów w normie (3 stany pękania, rozpad, demon z gruzów, ostatnie uderzenie i Uwolnienie).`);
process.exit(zle === 0 ? 0 : 1);
