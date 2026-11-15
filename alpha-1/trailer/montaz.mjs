// Składa film: klatki montażu (trailer/montaz.ts w przeglądarce) → trailer/wyjscie/klatki/00000.jpg.
// node trailer/montaz.mjs [--czesc 1/3] [--od s] [--do s] [--co N] [--katalog dir]
import fs from 'fs';
import path from 'path';
import { playwright, KATALOG, ADRES, W, H } from './wspolne.mjs';

const arg = process.argv.slice(2);
const opcja = (n, d) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : d; };
const [k, n] = opcja('--czesc', '1/1').split('/').map(Number);
const co = Number(opcja('--co', 1));
const katalog = opcja('--katalog', path.join(KATALOG, 'wyjscie', 'klatki'));
fs.mkdirSync(katalog, { recursive: true });
const { chromium } = playwright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[montaż] błąd:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('[montaż]', m.text()); });
await page.goto(new URL('trailer/montaz.html', ADRES).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.__montazGotowy === true, null, { timeout: 120000 });
const stan = await page.evaluate(() => ({ ...window.M.stan }));
const od = Math.round(Number(opcja('--od', 0)) * 30), doK = Math.min(stan.klatek, Math.round(Number(opcja('--do', stan.dlugosc)) * 30));
const dl = doK - od, a = od + Math.floor((dl * (k - 1)) / n), b = od + Math.floor((dl * k) / n);
const t0 = Date.now();
for (let i = a; i < b; i += co) {
  const b64 = await page.evaluate((i) => window.M.klatka(i), i);
  fs.writeFileSync(path.join(katalog, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(b64, 'base64'));
  if ((i - a) % 300 === 0) console.log(`[montaż ${k}/${n}] klatka ${i} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
console.log(`[montaż ${k}/${n}] gotowe: klatki ${a}–${b - 1} w ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close();
