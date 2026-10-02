/**
 * Test generowania świata: w suchej strefie wokół przedsionka nie wolno mieć magmy,
 * wody ani kryształu — to jedyna droga, którą wierni schodzą do rytuału.
 *
 *   node scripts/test-swiata.mjs [ile światów]
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ILE = Number(process.argv[2] ?? 100);
const katalog = mkdtempSync(join(tmpdir(), 'trzewia-test-'));
const wejscie = join(katalog, 'wejscie.ts');
const wyjscie = join(katalog, 'wyjscie.mjs');

writeFileSync(wejscie, `
import { World } from ${JSON.stringify(join(process.cwd(), 'src/sim/world.ts'))};
import { T } from ${JSON.stringify(join(process.cwd(), 'src/sim/tiles.ts'))};

export function sprawdz(ile) {
  const zle = [];
  let magmaRazem = 0, wodaRazem = 0, krysztalRazem = 0;
  for (let s = 0; s < ile; s++) {
    const w = new World(s * 7919 + 13);
    for (let k = 0; k < 400; k++) w.tickFluids(k);   // ciecze mają czas spłynąć
    let magma = 0, woda = 0, krysztal = 0;
    for (let y = 0; y < w.h; y++) {
      for (let x = 0; x < w.w; x++) {
        if (!w.suchaStrefa(x, y)) continue;
        const i = w.idx(x, y);
        if (w.magma[i] > 0) magma++;
        if (w.water[i] > 0) woda++;
        if (w.tile[i] === T.CRYSTAL) krysztal++;
      }
    }
    magmaRazem += magma; wodaRazem += woda; krysztalRazem += krysztal;
    if (magma || woda || krysztal) zle.push({ ziarno: s, magma, woda, krysztal });
  }
  return { swiatow: ile, zlych: zle.length, zle: zle.slice(0, 8), magmaRazem, wodaRazem, krysztalRazem };
}
`);

await build({ entryPoints: [wejscie], outfile: wyjscie, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' });
const { sprawdz } = await import(pathToFileURL(wyjscie).href);
const wynik = sprawdz(ILE);
console.log(JSON.stringify(wynik, null, 2));
if (wynik.zlych > 0) {
  console.error(`\nPRZEDSIONEK ZALANY w ${wynik.zlych} z ${ILE} światów.`);
  process.exit(1);
}
console.log(`\nOK: przedsionek suchy w ${ILE} z ${ILE} światów.`);
