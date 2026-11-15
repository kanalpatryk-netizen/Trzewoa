// Wspólne dla skryptów trailera: przeglądarka z grą pod zegarem Playwrighta i reżyserem w środku.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
/** Playwright z repozytorium (npm i) albo z narzędzi środowiska. */
export function playwright() {
  for (const p of ['playwright', '/opt/node-tools/node_modules/playwright']) {
    try { return require(p); } catch { /* następny */ }
  }
  throw new Error('Brak Playwrighta: npm i -D playwright');
}

export const KATALOG = path.dirname(fileURLToPath(import.meta.url));
export const ADRES = process.env.TRZEWIA_URL || 'http://localhost:5180/';
export const W = 1920, H = 1080, FPS = 30;

export function wczytajJSON(plik, domyslnie = null) {
  try { return JSON.parse(fs.readFileSync(plik, 'utf8')); } catch { return domyslnie; }
}

/**
 * Otwiera grę (tryb bota, podane ziarno) pod sztucznym zegarem, czeka na ekran gry i wstrzykuje reżysera.
 * `wielkosc` — mnożnik wielkości obrazu gry (1/1.317 daje rycinę 1:1 na 1920×1080).
 */
export async function otworzGre({ ziarno = 3, styl = 'rozsadny', wielkosc = 820 / 1080, maxZoom = 72, przegladarka = null } = {}) {
  const { chromium } = playwright();
  const browser = przegladarka ?? await chromium.launch({ args: ['--disable-gpu-vsync', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[gra] błąd:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[gra]', m.text()); });
  await page.addInitScript((u) => { window.__TRZEWIA_BOT = u; }, { ziarno, styl, autoRestart: false, tempo: 1, dzwiek: false });
  await page.clock.install({ time: new Date('2026-11-15T12:00:00Z') });
  await page.goto(ADRES, { waitUntil: 'load' });
  for (let i = 0; i < 2000; i++) {
    await page.clock.runFor(50);
    if (await page.evaluate(() => !!window.__trzewia && window.__trzewia.app.aktywnyEkran?.nazwa === 'gra')) break;
  }
  await page.evaluate(async () => { window.R = await import('/trailer/rezyser.ts'); });
  const info = await page.evaluate(({ wielkosc, maxZoom }) => window.R.przygotuj({ wielkosc, maxZoom }), { wielkosc, maxZoom });
  await page.evaluate(({ ziarno, styl }) => window.R.nowaPartia(ziarno, styl), { ziarno, styl });
  return { browser, page, info };
}
