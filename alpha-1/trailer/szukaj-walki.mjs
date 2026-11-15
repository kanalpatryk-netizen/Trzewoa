// Przegląd partii bota pod kątem walki z demonem: ile trwa, jakie ruchy, ile rzutów/zawałów — wybór ziarna do trailera.
// node trailer/szukaj-walki.mjs 1 16
import fs from 'fs';
import path from 'path';
import { otworzGre, KATALOG } from './wspolne.mjs';
const [od, doZ] = [Number(process.argv[2] ?? 1), Number(process.argv[3] ?? 8)];
const { browser, page } = await otworzGre({ ziarno: od });
const wyniki = [];
for (let z = od; z <= doZ; z++) {
  const t0 = Date.now();
  const r = await page.evaluate((z) => {
    const R = window.R; R.nowaPartia(z, 'rozsadny');
    const sim = window.__trzewia.sim;
    // do początku walki
    R.przewinDo("pom.faza !== 'stoi'", 200000, 60);
    const start = sim.tick;
    const ruchy = []; const widziane = new Set();
    let n = 0;
    while (!sim.ending && n < 30000) {
      R.przewin(10); n += 10;
      for (const c of sim.creatures) {
        if (c.dead || !c.ruch) continue;
        if (!(c.boss || c.rola === 'rycerz')) continue;
        const k = c.id + ':' + c.ruch.od;
        if (widziane.has(k)) continue;
        widziane.add(k);
        ruchy.push({ t: c.ruch.od, kto: c.boss ? 'D' : 'R' + c.id, id: c.ruch.id, x: Math.round(c.x), y: Math.round(c.y) });
      }
    }
    const kr = sim.chronicle.filter((e) => e.tick >= start - 1200).map((e) => ((e.tick / 7200).toFixed(2) + 'm ' + e.text));
    return { start, koniec: sim.tick, ending: sim.ending ?? null, ruchy, kr };
  }, z);
  const licz = {};
  for (const m of r.ruchy) licz[m.kto[0] + ':' + m.id] = (licz[m.kto[0] + ':' + m.id] ?? 0) + 1;
  console.log(`\n=== ziarno ${z}: walka od ${(r.start / 7200).toFixed(2)}m, ${((r.koniec - r.start) / 120).toFixed(0)} s, wynik ${r.ending}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  console.log(Object.entries(licz).sort().map(([k, v]) => `${k}×${v}`).join('  '));
  for (const l of r.kr) console.log('   ' + l);
  wyniki.push({ ziarno: z, ...r });
}
fs.mkdirSync(path.join(KATALOG, 'dane'), { recursive: true });
fs.writeFileSync(path.join(KATALOG, 'dane', `walki-${od}-${doZ}.json`), JSON.stringify(wyniki));
await browser.close();
