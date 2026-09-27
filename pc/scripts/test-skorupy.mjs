/**
 * Test skorupy rdzenia: ile pęknięć otwiera drogę do rdzenia i czy wymuszony rytuał
 * wiernej nacji kończy się Uwolnieniem.
 *
 *   node scripts/test-skorupy.mjs [ile światów]
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ILE = Number(process.argv[2] ?? 12);
const katalog = mkdtempSync(join(tmpdir(), 'trzewia-skorupa-'));
const wejscie = join(katalog, 'wejscie.ts');
const wyjscie = join(katalog, 'wyjscie.mjs');
const src = (f) => JSON.stringify(join(process.cwd(), 'src', f));

writeFileSync(wejscie, `
import { Sim } from ${src('sim/sim.ts')};
import { drogaDoRdzenia, kamienNadRdzeniem } from ${src('sim/rytual.ts')};

export function sprawdz(ile: number) {
  const wyniki: any[] = [];
  for (let z = 0; z < ile; z++) {
    const sim: any = new Sim(z * 31337 + 7);
    for (let i = 0; i < 400; i++) sim.step();
    const skorupa = kamienNadRdzeniem(sim);

    // wymuszony rytuał: jedna nacja trzyma wartę pod skorupą i naprawdę w ciebie wierzy
    const klan = sim.clans.find((k: any) => !k.dead && k.pop > 3) ?? sim.clans[0];
    let warta: any[] = [];
    const uzupelnij = () => {
      warta = warta.filter((c) => !c.dead);
      while (warta.length < 4) {
        const c = sim.creatures.find((o: any) => !o.dead && !warta.includes(o));
        if (!c) break;
        c.clan = klan.id;
        warta.push(c);
      }
      klan.pop = Math.max(klan.pop, warta.length);
    };

    let pekniecDoDrogi = -1;
    const tikiPeknieć: number[] = [];
    let ost = 0;
    let i = 0;
    for (; i < 200000 && !sim.ending; i++) {
      sim.step();
      klan.devotion = 1;
      klan.dead = false;
      if (i % 50 === 0) uzupelnij();
      for (const c of warta) {
        if (c.dead) continue;
        c.devotion = 1;
        c.hunger = 0.1;
        c.hp = 30;
        if (!sim.rytual.otwarta) { c.x = sim.world.coreX + (i % 5) - 2; c.y = sim.world.coreY - 14; }
      }
      sim.sen = 0;
      if (sim.rytual.pekniecia > ost) { ost = sim.rytual.pekniecia; tikiPeknieć.push(i); }
      if (pekniecDoDrogi < 0 && sim.rytual.otwarta) pekniecDoDrogi = sim.rytual.pekniecia;
    }
    wyniki.push({
      ziarno: z, skorupa, pekniecDoDrogi,
      pekniecia: sim.rytual.pekniecia,
      otwarta: sim.rytual.otwarta,
      droga: drogaDoRdzenia(sim),
      koniec: sim.ending ?? 'brak',
      tikow: i,
      tikiPeknieć,
    });
  }
  return wyniki;
}
`);

await build({ entryPoints: [wejscie], outfile: wyjscie, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' });
const { sprawdz } = await import(pathToFileURL(wyjscie).href);
const wyniki = sprawdz(ILE);
let zle = 0;
for (const w of wyniki) {
  const okPekniec = w.pekniecDoDrogi >= 1 && w.pekniecDoDrogi <= 8;
  const okKoniec = String(w.koniec).startsWith('uwolnienie');
  if (!okPekniec || !okKoniec) zle++;
  console.log(`ziarno ${w.ziarno}: skorupa ${w.skorupa} kafli · droga po ${w.pekniecDoDrogi} pęknięciach` +
    ` · pęknięć ${w.pekniecia} · otwarta ${w.otwarta} · droga teraz ${w.droga}` +
    ` · koniec ${w.koniec} po ${w.tikow} tikach ${okPekniec && okKoniec ? '' : '  ← ŹLE'}`);
  if (w.tikiPeknieć?.length) console.log(`   pęknięcia w tikach: ${w.tikiPeknieć.join(', ')}`);
}
console.log(`\n${ILE - zle}/${ILE} światów w normie (droga po ≤8 pęknięciach i Uwolnienie).`);
process.exit(zle === 0 ? 0 : 1);
