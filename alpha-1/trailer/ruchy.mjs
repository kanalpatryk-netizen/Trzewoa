// Ruchy walki (rycerze i demon) z tikami startu — do synchronizacji dźwięku z obrazem (muzyka.mjs).
// node trailer/ruchy.mjs <ziarno>  →  trailer/dane/ruchy-<ziarno>.json
import fs from 'fs';
import path from 'path';
import { otworzGre, KATALOG } from './wspolne.mjs';
const z = Number(process.argv[2] ?? 3);
const { browser, page } = await otworzGre({ ziarno: z });
const ruchy = await page.evaluate(() => {
  const R = window.R, sim = window.__trzewia.sim;
  const out = [], widz = new Set();
  while (!sim.ending && sim.tick < 115000) {
    R.przewin(4);
    for (const c of sim.creatures) {
      if (c.dead || !c.ruch) continue;
      if (!(c.boss || c.rola === 'rycerz')) continue;
      const k = c.id + ':' + c.ruch.od;
      if (widz.has(k)) continue; widz.add(k);
      out.push({ od: c.ruch.od, kto: c.boss ? 'demon' : 'rycerz', id: c.ruch.id, dl: c.ruch.dl, cel: c.ruch.cel });
    }
  }
  return out;
});
fs.writeFileSync(path.join(KATALOG, 'dane', `ruchy-${z}.json`), JSON.stringify(ruchy));
console.log(ruchy.length, 'ruchów');
await browser.close();
