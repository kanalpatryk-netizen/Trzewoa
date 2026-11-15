// Sonda: śledzi wyrażenie JS w czasie partii i wypisuje każdą jego zmianę.
// node trailer/sonda.mjs <ziarno> "<wyrażenie z sim>" [co tików=20] [do tiku=115000]
import { otworzGre } from './wspolne.mjs';
const [z, wyr, co = 20, doT = 115000] = process.argv.slice(2);
const { browser, page } = await otworzGre({ ziarno: Number(z) });
const zmiany = await page.evaluate(({ wyr, co, doT }) => {
  const sim = window.__trzewia.sim; const f = new Function('sim', 'R', `return (${wyr});`);
  const out = []; let ost;
  while (!sim.ending && sim.tick < doT) {
    window.R.przewin(co);
    let v; try { v = JSON.stringify(f(sim, window.R)); } catch (e) { v = 'ERR ' + e.message; }
    if (v !== ost) { out.push([sim.tick, v]); ost = v; }
  }
  return out;
}, { wyr, co: Number(co), doT: Number(doT) });
for (const [t, v] of zmiany) console.log(t, (t / 7200).toFixed(2) + 'm', v);
await browser.close();
