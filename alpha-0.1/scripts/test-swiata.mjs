/**
 * Test generowania świata: w suchej strefie wokół przedsionka nie wolno mieć magmy,
 * wody ani kryształu — to jedyna droga, którą wierni schodzą do rytuału.
 * Alpha, etap 3d: ołtarz stoi w sali na kamiennym kopczyku, podłoga sali jest z kamienia, a z powierzchni
 * prowadzą do sali dwa otwory — szerszy nad ołtarzem (światło) i węższy, którym zjeżdża wiadro.
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
import { T, PASSABLE } from ${JSON.stringify(join(process.cwd(), 'src/sim/tiles.ts'))};
import { SURFACE_Y } from ${JSON.stringify(join(process.cwd(), 'src/sim/world.ts'))};
import { SWIAT } from ${JSON.stringify(join(process.cwd(), 'src/nastawy/swiat.ts'))};

/** Etap 3d: czego brakuje ołtarzowi i otworom w tym świecie (pusta lista — wszystko w porządku). */
function bledyOltarza(w) {
  if (!SWIAT.warstwy.wlaczone) return [];
  const bledy = [];
  const o = w.oltarz;
  const wolny = (x, y) => PASSABLE[w.tile[w.idx(x, y)]] === 1;
  if (!wolny(o.x, o.y) || !wolny(o.x, o.y - 1)) bledy.push('ołtarz zamurowany');
  const O = SWIAT.warstwy.oltarz;
  for (let dx = -(O.kopczykSzer >> 1); dx <= O.kopczykSzer >> 1; dx++) {
    for (let dy = 1; dy <= O.kopczykGleb; dy++) if (w.tile[w.idx(o.x + dx, o.y + dy)] !== T.STONE) { bledy.push('kopczyk pod ołtarzem da się podkopać'); dx = 99; break; }
  }
  // podłoga sali: od ołtarza do wiadra — kamień pod stopami, wolno nad nimi (2 kafle)
  for (let x = Math.min(o.x, w.szybWiadraX); x <= Math.max(o.x, w.szybWiadraX); x++) {
    if (w.tile[w.idx(x, o.y + 1)] !== T.STONE) { bledy.push('podłoga sali między ołtarzem a wiadrem nie jest z kamienia'); break; }
    if (!wolny(x, o.y) || !wolny(x, o.y - 1)) { bledy.push('droga od wiadra do ołtarza zagrodzona'); break; }
  }
  for (let y = SURFACE_Y - 1; y <= w.szybDol; y++) if (!wolny(w.szybX, y)) { bledy.push('szyb ze światłem zasypany'); break; }
  for (let y = SURFACE_Y - 1; y <= w.szybWiadraDol; y++) if (!wolny(w.szybWiadraX, y)) { bledy.push('otwór z wiadrem zasypany'); break; }
  if (Math.abs(w.szybWiadraX - w.szybX) < 3) bledy.push('wiadro zjeżdża na ołtarz');
  if (!wolny(w.szybWiadraX, w.szybWiadraDol + 1)) bledy.push('otwór z wiadrem nie wychodzi do sali');
  return bledy;
}

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
    const oltarz = bledyOltarza(w);
    if (magma || woda || krysztal || oltarz.length) zle.push({ ziarno: s, magma, woda, krysztal, oltarz });
  }
  return { swiatow: ile, zlych: zle.length, zle: zle.slice(0, 8), magmaRazem, wodaRazem, krysztalRazem };
}
`);

await build({ entryPoints: [wejscie], outfile: wyjscie, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' });
const { sprawdz } = await import(pathToFileURL(wyjscie).href);
const wynik = sprawdz(ILE);
console.log(JSON.stringify(wynik, null, 2));
if (wynik.zlych > 0) {
  console.error(`\nZŁY ŚWIAT (zalany przedsionek albo ołtarz i otwory) w ${wynik.zlych} z ${ILE} światów.`);
  process.exit(1);
}
console.log(`\nOK: przedsionek suchy, ołtarz na kamiennym kopczyku i oba otwory w ${ILE} z ${ILE} światów.`);
