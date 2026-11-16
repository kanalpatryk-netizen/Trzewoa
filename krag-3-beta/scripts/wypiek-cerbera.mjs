#!/usr/bin/env node
/**
 * Wypiek Cerbera: renderuje części modelu 3D (src/render/cerber3d.ts) do obrazków WebP w obrazy/cerber/
 * i zapisuje ich położenia w src/render/cerber-wypiek.ts (gra składa z nich Cerbera: src/render/cerber-sprite.ts).
 *
 * Wymaga działającego `npm run dev` i Chromium z Playwright oraz ffmpeg (libwebp).
 *   node scripts/wypiek-cerbera.mjs [adres-serwera] [przedrostek-nazw] [--zarlok]
 * np. `node scripts/wypiek-cerbera.mjs http://localhost:5180 glowa-1` — tylko głowy wilka (kilka przedrostków po przecinku).
 * Z `--zarlok` wypieka części potępionego żarłoka i rany (src/render/czlowiek3d.ts) do obrazy/zarlok/
 * i src/render/zarlok-wypiek.ts (składa je src/render/ludzik.ts).
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const { chromium } = createRequire(import.meta.url)('playwright');

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZARLOK = process.argv.includes('--zarlok');
const arg = process.argv.slice(2).filter((a) => a !== '--zarlok');
const ADRES = arg[0] || 'http://localhost:5180';
const FILTR = arg[1] || '';
const KAT_OBR = path.join(KORZEN, 'obrazy', ZARLOK ? 'zarlok' : 'cerber');
const DANE = path.join(KAT_OBR, 'dane.json');
const MODUL = path.join(KORZEN, 'src', 'render', ZARLOK ? 'zarlok-wypiek.ts' : 'cerber-wypiek.ts');
const STALA = ZARLOK ? 'WYPIEK_ZARLOKA' : 'WYPIEK';
// wyniki najpierw poza projektem: zapis do obrazy/ w trakcie przeładowałby stronę (Vite obserwuje importowane obrazki)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wypiek-'));
const TMP_OBR = path.join(TMP, 'obrazy');
fs.mkdirSync(TMP_OBR);

// ---------------------------------------------------------------- lista zadań
const S_C = 700, S_G = 900;
const zad = [];
for (let k = 0; k < 12; k++) zad.push({ nazwa: `cialo-krok-${k}`, czesc: 'cialo', S: S_C, poza: { krok: 1, faza: (k * Math.PI) / 6 } });
zad.push({ nazwa: 'cialo-stoi', czesc: 'cialo', S: S_C, poza: { krok: 0 } });
for (const d of [1, 2, 3, 4]) zad.push({ nazwa: `cialo-deba-${d}`, czesc: 'cialo', S: S_C, poza: { deba: d * 0.25 } });
for (const d of [1, 2]) zad.push({ nazwa: `cialo-przysiad-${d}`, czesc: 'cialo', S: S_C, poza: { przysiad: d * 0.5 } });
zad.push({ nazwa: 'cialo-lezy', czesc: 'cialo', S: S_C, poza: { lezy: 1 } });
// walka (16.11): szarpnięcie łapą, skok, przypadnięcie na przednie łapy
for (const [n, v] of [[1, 0.18], [2, 0.35], [3, 0.48], [4, 0.62], [5, 0.82]]) zad.push({ nazwa: `cialo-lapa-${n}`, czesc: 'cialo', S: S_C, poza: { lapa: v } });
for (const [n, v] of [[1, 0.5], [2, 1]]) zad.push({ nazwa: `cialo-skok-${n}`, czesc: 'cialo', S: S_C, poza: { skok: v } });
zad.push({ nazwa: 'cialo-kleka', czesc: 'cialo', S: S_C, poza: { kleka: 1 } });
zad.push({ nazwa: 'cialo-odrzut', czesc: 'cialo', S: S_C, poza: { odrzut: 1 } });
zad.push({ nazwa: 'cialo-kamien', czesc: 'cialo', S: S_C, poza: { kamien: 1 } });
zad.push({ nazwa: 'cialo-kamien-lezy', czesc: 'cialo', S: S_C, poza: { kamien: 1, lezy: 1 } });
for (const [n, o, b] of [['0', 0, 0], ['l', -0.7, 0], ['p', 0.7, 0], ['bicz-1', 0, 0.5], ['bicz-2', 0, 1]]) {
  zad.push({ nazwa: `ogon-${n}`, czesc: 'ogon', S: S_C, poza: { ogon: o, bicz: b } });
}
zad.push({ nazwa: 'ogon-kamien', czesc: 'ogon', S: S_C, poza: { kamien: 1 } });
for (const i of [0, 1, 2]) {
  zad.push({ nazwa: `szyja-${i}`, czesc: 'szyja', nr: i, S: S_C });
  zad.push({ nazwa: `szyja-${i}-kamien`, czesc: 'szyja', nr: i, S: S_C, poza: { kamien: 1 } });
}
// ścięcie głowy (Krąg Trzeci, 16.11): kikut szyi i ścięta głowa
for (const i of [0, 1, 2]) {
  zad.push({ nazwa: `szyja-${i}-kikut`, czesc: 'kikut', nr: i, S: S_C });
  zad.push({ nazwa: `glowa-${i}-odcieta`, czesc: 'odcieta', nr: i, S: S_G });
}
const KATY = [-0.6, 0, 0.6, 1.2], PASZCZE = [0, 0.25, 0.5, 0.75, 1], KREW = [0.5, 1];
for (const i of [0, 1, 2]) {
  for (const [a, kat] of KATY.entries()) {
    for (const [j, pa] of PASZCZE.entries()) for (const [k, kr] of KREW.entries()) {
      zad.push({ nazwa: `glowa-${i}-a${a}-p${j}-k${k}`, czesc: 'glowa', nr: i, S: S_G, kat, paszcza: pa, poza: { krew: kr } });
    }
    zad.push({ nazwa: `glowa-${i}-a${a}-kamien`, czesc: 'glowa', nr: i, S: S_G, kat, paszcza: 0.15, poza: { kamien: 1 } });
  }
}

// żarłok: części ciała (bliższe i dalsze — ciemniejsze), czyste i zakrwawione, głowy z ustami, rany
const S_Z = 500;
const zadZ = [];
for (const [k, kr] of [['', 0], ['-k', 0.75]]) {
  zadZ.push({ nazwa: `zarlok-tulow${k}`, czesc: 'zarlok', element: 'tulow', S: S_Z, krew: kr });
  for (const [u, us] of [[0, 0.05], [1, 0.5], [2, 1]]) zadZ.push({ nazwa: `zarlok-glowa-u${u}${k}`, czesc: 'zarlok', element: 'glowa', S: S_Z, krew: kr, usta: us });
  for (const el of ['ramie', 'przedramie', 'udo', 'podudzie']) {
    zadZ.push({ nazwa: `zarlok-${el}${k}`, czesc: 'zarlok', element: el, S: S_Z, krew: kr });
    zadZ.push({ nazwa: `zarlok-${el}-d${k}`, czesc: 'zarlok', element: el, S: S_Z, krew: kr, ciemny: true });
  }
}
// zbliżenie twarzy w błocie (film: „Ktoś to widział”)
zadZ.push({ nazwa: 'zarlok-glowa-blisko', czesc: 'zarlok', element: 'glowa', S: 2600, krew: 0.15, usta: 0.15 });
for (const el of ['tulow-gora', 'tulow-dol', 'tulow-rozpruty', 'glowa-oderwana', 'kikut-reki', 'kikut-nogi', 'trzewia']) {
  zadZ.push({ nazwa: `zarlok-${el}`, czesc: 'zarlok', element: el, S: S_Z, krew: 0.5, usta: 0.9 });
}

// ---------------------------------------------------------------- wypiek
fs.mkdirSync(KAT_OBR, { recursive: true });
const dane = fs.existsSync(DANE) ? JSON.parse(fs.readFileSync(DANE, 'utf8')) : {};
const b = await chromium.launch();
const strona = await b.newPage();
strona.on('pageerror', (e) => { console.error('błąd strony:', e.message); process.exit(1); });
await strona.goto(`${ADRES}/narzedzia/wypiek-cerbera.html`, { waitUntil: 'commit', timeout: 300000 });
await strona.waitForFunction(() => window.gotowe, null, { timeout: 300000 });
const doZrobienia = (ZARLOK ? zadZ : zad).filter((z) => FILTR.split(',').some((f) => z.nazwa.startsWith(f)));
let n = 0;
for (const z of doZrobienia) {
  const t0 = Date.now();
  const w = await strona.evaluate((zz) => window.wypiecz(zz), z);
  if (!w) { console.error('pusto:', z.nazwa); continue; }
  const png = path.join(TMP, `${z.nazwa}.png`);
  fs.writeFileSync(png, Buffer.from(w.png.split(',')[1], 'base64'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', '88', '-compression_level', '6', path.join(TMP_OBR, `${z.nazwa}.webp`)]);
  dane[z.nazwa] = { x0: +w.x0.toFixed(5), y0: +w.y0.toFixed(5), S: w.S, w: w.w, h: w.h };
  console.log(`${++n}/${doZrobienia.length} ${z.nazwa} ${w.w}x${w.h} ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await b.close();
for (const p of fs.readdirSync(TMP_OBR)) fs.copyFileSync(path.join(TMP_OBR, p), path.join(KAT_OBR, p));
fs.writeFileSync(DANE, JSON.stringify(dane, null, 1));
fs.rmSync(TMP, { recursive: true, force: true });

// ---------------------------------------------------------------- moduł z położeniami
const klucze = Object.keys(dane).sort();
const wiersze = klucze.map((k) => `  '${k}': ${JSON.stringify(dane[k]).replace(/"(\w+)":/g, '$1: ')},`);
fs.writeFileSync(MODUL, `/**
 * WYGENEROWANE przez scripts/wypiek-cerbera.mjs — nie edytować ręcznie.
 * Położenie każdego obrazka z obrazy/cerber/: lewy górny róg (x0, y0) w jednostkach modelu względem punktu
 * zaczepienia części, S — pikseli na jednostkę, w × h — rozmiar w pikselach.
 */
${ZARLOK ? "import type { Kawalek } from './cerber-wypiek';" : 'export interface Kawalek { x0: number; y0: number; S: number; w: number; h: number }'}
export const ${STALA}: Record<string, Kawalek> = {
${wiersze.join('\n')}
};
`);
console.log('zapisano', klucze.length, 'położeń w', path.relative(KORZEN, MODUL));
