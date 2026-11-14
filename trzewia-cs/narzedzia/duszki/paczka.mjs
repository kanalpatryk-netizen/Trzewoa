// Wspólne dla narzędzi duszków: pakuje plik TS (z importami z alpha-1/src) w jeden skrypt dla Chromium i otwiera stronę.
// Gra TS jest budowana Vite'em — tu esbuild, więc trzy rzeczy z Vite'a trzeba dorobić:
//   • import obrazków (także z dopiskiem ?url) → adres data: (loader dataurl),
//   • import.meta.glob(...) → pusty obiekt (własne grafiki z src/grafiki/pliki — folder jest pusty; freski i ikony
//     nie są potrzebne do rysunku postaci),
//   • podmiany modułów (opcja `podmiany`): moduł gry zastąpiony nakładką z tego folderu, która eksportuje wszystko
//     z oryginału i nadpisuje wybrane funkcje — tak piekarnia steruje np. szumem, nie ruszając alpha-1/.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TU = path.dirname(fileURLToPath(import.meta.url));
export const ALPHA = path.resolve(TU, '../../../alpha-1');
const require = createRequire(import.meta.url);
// esbuild: ten sam, który jest zainstalowany dla wzorców testów (narzedzia/wzorce: npm install)
const { build } = require(path.join(TU, '../wzorce/node_modules/esbuild'));

const OBRAZKI = /\.(png|webp|jpg|jpeg|svg)$/;

function wtyczkaVite(podmiany) {
  return {
    name: 'vite-w-esbuildzie',
    setup(b) {
      // ?worker (Vite: moduł jako wątek) → zastępczy konstruktor; narzędzia liczą wszystko w jednym wątku
      // (render/rycina.ts z ustawienia.rycinaWWatku = false nie tworzy wątku)
      b.onResolve({ filter: /\?worker/ }, (a) => ({ path: a.path, namespace: 'pusty-watek' }));
      b.onLoad({ filter: /.*/, namespace: 'pusty-watek' }, () => ({
        contents: 'export default class { constructor() { throw new Error("wątek niedostępny w narzędziu"); } }', loader: 'js',
      }));
      // ?url → ten sam plik bez dopisku (loader dataurl robi z niego adres data:)
      b.onResolve({ filter: /\?url$/ }, (a) => ({ path: path.resolve(a.resolveDir, a.path.replace(/\?url$/, '')) }));
      // podmiany modułów: { 'render/lud/matma': 'nakladki/matma.ts' } — nie dotyczy importu z samej nakładki
      b.onResolve({ filter: /.*/ }, (a) => {
        if (!a.importer || a.kind === 'entry-point' || !a.path.startsWith('.')) return null;
        const cel = path.resolve(a.resolveDir, a.path).replace(/\.ts$/, '');
        const wzgl = path.relative(path.join(ALPHA, 'src'), cel).replace(/\\/g, '/');
        const nakladka = podmiany[wzgl];
        if (!nakladka) return null;
        const plik = path.resolve(TU, nakladka);
        if (path.resolve(a.importer) === plik) return null;
        return { path: plik };
      });
      b.onLoad({ filter: /\.ts$/ }, (a) => {
        const kod = fs.readFileSync(a.path, 'utf8');
        if (!kod.includes('import.meta.glob')) return null;
        // import.meta.glob('wzorzec', { … }) → ({})
        return { contents: kod.replace(/import\.meta\.glob\((?:[^()]|\([^()]*\))*\)/g, '({})'), loader: 'ts' };
      });
    },
  };
}

/** Kod strony: wszystko, co eksportuje `wejscie`, pod globalną nazwą PIEKARNIA. */
export async function zbuduj(wejscie, podmiany = {}) {
  const w = await build({
    entryPoints: [path.resolve(wejscie)], bundle: true, write: false, format: 'iife', globalName: 'PIEKARNIA',
    platform: 'browser', target: 'es2022', logLevel: 'error',
    loader: { '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.svg': 'dataurl', '.css': 'empty' },
    define: { 'import.meta.env.DEV': 'false' },
    plugins: [wtyczkaVite(podmiany)],
  });
  return w.outputFiles[0].text;
}

export function chromium() {
  const globalne = execSync('npm root -g').toString().trim();
  return require(path.join(globalne, 'playwright')).chromium;
}

/** Strona z wczytanym kodem; `wolaj(funkcja, ...argumenty)` zwraca jej wynik (JSON). */
export async function otworz(kod, opcje = {}) {
  const przegladarka = await chromium().launch();
  const strona = await przegladarka.newPage({ deviceScaleFactor: 1, ...opcje });
  strona.on('console', (m) => { if (m.type() === 'error' || process.env.GADAJ) console.error('[chromium]', m.text()); });
  strona.on('pageerror', (e) => console.error('[chromium wyjątek]', e.message));
  await strona.addScriptTag({ content: kod });
  const wolaj = async (funkcja, ...argumenty) => JSON.parse(await strona.evaluate(async ([f, a]) => JSON.stringify(await globalThis.PIEKARNIA[f](...a)), [funkcja, argumenty]));
  return { przegladarka, strona, wolaj, zamknij: () => przegladarka.close() };
}

/** Zapisuje adres data:image/png;base64,… do pliku. */
export function zapiszPng(plik, dataUrl) {
  fs.mkdirSync(path.dirname(plik), { recursive: true });
  fs.writeFileSync(plik, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}
