// Uruchamia funkcję z pliku TS gry w Chromium (V8 jak w grze w Electronie — ważne dla Math.sin/cos/atan2)
// i wypisuje jej wynik jako JSON.
//   node narzedzia/wzorce/chromium.mjs <plik-wejścia.ts> <funkcja> '<argumenty JSON>' [plik-wyniku]
// Plik wejścia importuje kod z alpha-1/src (esbuild pakuje wszystko w jeden skrypt).
// OSOBNO=1: pierwszy argument to lista, a funkcja idzie dla każdego jej elementu w ŚWIEŻEJ stronie (wynik — lista).
// Po co: V8 po kilkunastu wywołaniach kompiluje funkcję TurboFanem, który ma własny, wbudowany sort krótkich tablic —
// sortowanie z porównaniem losowym (sim/ruiny.ts) daje wtedy inny wynik niż „na zimno”. W grze świat buduje się raz,
// więc wzorcem jest zachowanie na zimno (10.11: ziarna 12–20 różniły się, gdy szły po kolei w jednej stronie).
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const globalne = execSync('npm root -g').toString().trim();
const { chromium } = require(path.join(globalne, 'playwright'));

const [wejscie, funkcja, argJson = '[]', plikWyniku] = process.argv.slice(2);
const wynikBudowy = await build({
  entryPoints: [path.resolve(wejscie)], bundle: true, write: false, format: 'iife', globalName: 'WZORZEC',
  platform: 'browser', target: 'es2022', logLevel: 'error',
});
const kod = wynikBudowy.outputFiles[0].text;
const przegladarka = await chromium.launch();
async function uruchom(argumenty) {
  const strona = await przegladarka.newPage();
  strona.on('console', (m) => { if (m.type() === 'error') console.error('[chromium]', m.text()); });
  await strona.addScriptTag({ content: kod });
  const w = await strona.evaluate(([f, a]) => JSON.stringify(globalThis.WZORZEC[f](...a)), [funkcja, argumenty]);
  await strona.close();
  return w;
}
const args = JSON.parse(argJson);
let wynik;
if (process.env.OSOBNO) {
  const czesci = [];
  for (const el of args[0]) czesci.push(JSON.parse(await uruchom([[el], ...args.slice(1)]))[0]);
  wynik = JSON.stringify(czesci);
} else wynik = await uruchom(args);
const wersja = przegladarka.version();
await przegladarka.close();
if (plikWyniku) { fs.writeFileSync(plikWyniku, wynik); console.error(`${plikWyniku}: ${wynik.length} B (Chromium ${wersja})`); }
else process.stdout.write(wynik);
