// Oś zdarzeń partii bota: co się dzieje i kiedy (tiki), gdzie stoją postacie — do wyboru ujęć.
// Uruchom (z alpha-1, przy działającym `npx vite --port 5180`): node trailer/os-zdarzen.mjs <ziarno> [minut]
import fs from 'fs';
import path from 'path';
import { otworzGre, KATALOG } from './wspolne.mjs';

const ziarno = Number(process.argv[2] ?? 3);
const minut = Number(process.argv[3] ?? 20);
const { browser, page, info } = await otworzGre({ ziarno });
console.log('ekran', JSON.stringify(info));
const miejsca = await page.evaluate(() => window.R.miejsca());
const stany = [], kronika = [];
let od = 0;
const t0 = Date.now();
for (let s = 0; s < minut * 60 / 2; s++) {
  const tick = await page.evaluate(() => window.R.przewin(240));
  const st = await page.evaluate(() => window.R.stanGry());
  stany.push(st);
  const nowe = await page.evaluate((od) => window.R.kronika(od), od);
  for (const e of nowe) { kronika.push(e); console.log(`${(e.tick / 7200).toFixed(2)}m  ${e.text}`); }
  if (nowe.length) od = nowe[nowe.length - 1].tick + 1;
  if (st.ending) { console.log('KONIEC', st.ending, 'tick', tick); break; }
}
console.log('czas', ((Date.now() - t0) / 1000).toFixed(1), 's');
const out = path.join(KATALOG, 'dane', `os-${ziarno}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ ziarno, miejsca, kronika, stany }));
console.log('zapisano', out);
await browser.close();
