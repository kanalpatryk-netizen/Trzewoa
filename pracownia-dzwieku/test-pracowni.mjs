// Sprawdzenie pracowni w Chromium: błędy JS, odsłony, każdy dźwięk mierzony w ciszy.
// Pomiar idzie w przeglądarce (60 próbek/s), bo kilof trwa 90 ms i gubił się
// przy próbkowaniu z Node'a co 200 ms.
// Playwright bywa globalny, bywa lokalny — spróbuj po kolei.
let chromium;
for (const skad of ['playwright', '/opt/node-tools/node_modules/playwright/index.js']) {
  try { const m = await import(skad); chromium = (m.default || m).chromium; break; } catch (e) { /* dalej */ }
}
if (!chromium) {
  console.error('Brak Playwrighta. Zainstaluj: npm i -D playwright');
  process.exit(2);
}

import { fileURLToPath } from 'url';
import path from 'path';
const PLIK = 'file://' + path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html');
const bledy = []; const ciche = [];

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const s = await b.newPage();
s.on('console', (m) => { if (m.type() === 'error') bledy.push('console: ' + m.text()); });
s.on('pageerror', (e) => bledy.push('pageerror: ' + e.message));

await s.goto(PLIK);
await s.waitForTimeout(400);
await s.click('#obudz');
await s.waitForTimeout(1000);

// mierniki po stronie strony: szczyt RMS i czekanie na ciszę
await s.evaluate(() => {
  const rms = () => {
    const a = Mikser.analiza, n = a.fftSize, d = new Uint8Array(n);
    a.getByteTimeDomainData(d);
    let x = 0; for (let i = 0; i < n; i++) { const v = (d[i] - 128) / 128; x += v * v; }
    return Math.sqrt(x / n) * 1000;
  };
  window.__rms = rms;
  window.__szczyt = (ms) => new Promise((res) => {
    let max = 0; const t0 = performance.now();
    const krok = () => { max = Math.max(max, rms());
      if (performance.now() - t0 < ms) requestAnimationFrame(krok); else res(max); };
    requestAnimationFrame(krok);
  });
  window.__doCiszy = (prog, maxMs) => new Promise((res) => {
    const t0 = performance.now();
    const krok = () => { const v = rms();
      if (v < prog || performance.now() - t0 > maxMs) res(v); else requestAnimationFrame(krok); };
    requestAnimationFrame(krok);
  });
});

const czas = await s.evaluate(async () => {
  const a = Mikser.ctx.currentTime;
  await new Promise((r) => setTimeout(r, 500));
  return { stan: Mikser.ctx.state, idzie: Mikser.ctx.currentTime > a };
});
console.log('kontekst:', czas.stan, czas.idzie ? '— czas idzie' : '— CZAS STOI');

const szczyt = (ms) => s.evaluate((x) => window.__szczyt(x), ms);
const rms = () => s.evaluate(() => window.__rms());

// ───────────────────────────────────────────────────── odsłony, zegar w ruchu
console.log('\n── ODSŁONY (zegar w ruchu, 6 s każda) ──');
for (const g of await s.$$('#odslony button')) {
  const n = (await g.textContent()).trim();
  await g.click();
  await s.waitForTimeout(800);
  const e = await szczyt(6000);
  const i = await s.evaluate(() => ({ bpm: Zegar.bpm.toFixed(1), zrodla: Mikser.zrodla }));
  console.log('  ' + n.padEnd(18) + 'szczyt ' + e.toFixed(0).padStart(5) +
              '   puls ' + i.bpm.padStart(5) + '   źródeł ' + String(i.zrodla).padStart(3));
}

// ──────────────────────────── cisza w tle: zegar stop + wyzerowany stan góry
await s.check('#p-zegar');
await s.evaluate(() => {
  Object.assign(stan, { glebokosc: 0.3, sen: 0, wiara: 0, krew: 0, zywi: 0, kopie: 0,
                        rycerze: 0, dominacja: 0, magma: 0, fala: false, bossSpi: false, zamrozone: false });
  odswiezStanUI(); Dyrygent.ustaw();
});
await s.waitForTimeout(6000);
const PODLOGA = await szczyt(1500);
console.log('\n── POJEDYNCZE DŹWIĘKI ──');
console.log('   podłoga pomiaru (8-bitowa rozdzielczość analizatora): ' + PODLOGA.toFixed(1));

const probuj = async (guzik, etykieta) => {
  await s.evaluate((p) => window.__doCiszy(p, 9000), PODLOGA * 1.5);
  const przed = await rms();
  await guzik.click();
  const po = await szczyt(6500);
  const ok = po > Math.max(PODLOGA * 1.8, przed * 1.5);
  if (!ok) ciche.push(etykieta + ' (' + po.toFixed(0) + ', tło ' + przed.toFixed(0) + ')');
  console.log('     ' + (ok ? '✓' : '✗') + ' ' + etykieta.padEnd(42) +
              po.toFixed(0).padStart(5) + '   (tło ' + przed.toFixed(0) + ')');
};

for (const k of await s.$$('#warstwy .karta')) {
  console.log('  ' + (await k.$eval('h3 span', (e) => e.textContent)).trim() + ':');
  for (const g of await k.$$('.rzad button')) await probuj(g, (await g.textContent()).trim());
}
console.log('  Zdarzenia:');
for (const g of await s.$$('#zdarzenia button')) await probuj(g, (await g.textContent()).trim());

// ───────────────────────────────────────────── cisza i powrót, budżet węzłów
await s.uncheck('#p-zegar');
await s.evaluate(() => {
  Object.assign(stan, { glebokosc: 0.6, wiara: 0.8, krew: 0.5, zywi: 0.8, kopie: 0.9, rycerze: 0.5, magma: 0.4, fala: true });
  odswiezStanUI();
});
await s.waitForTimeout(3000);
const peln = await szczyt(7000);
const zrodel = await s.evaluate(() => Mikser.zrodla);

await s.click('#cisza');
await s.waitForTimeout(2500);
const poCiszy = await szczyt(2000);
await s.click('#obudz');
await s.waitForTimeout(2500);
const poWznow = await szczyt(5000);

console.log('\n── MIKS ──');
console.log('  wszystkie warstwy razem: szczyt ' + peln.toFixed(0) + ', żywych źródeł ' + zrodel +
            (zrodel <= 40 ? '  ✓ w budżecie telefonu (≤40)' : '  ✗ PONAD BUDŻET'));
console.log('  po „Cisza”:      ' + poCiszy.toFixed(1) +
            (poCiszy <= PODLOGA * 1.4 ? '  ✓ milczy (na poziomie podłogi)' : '  ✗ DALEJ GRA'));
console.log('  po wznowieniu:   ' + poWznow.toFixed(0) + (poWznow > PODLOGA * 3 ? '  ✓ wróciło' : '  ✗ nie wróciło'));

console.log('\n' + (bledy.length ? '✗ BŁĘDY JS (' + bledy.length + '):' : '✓ zero błędów JS'));
for (const x of bledy.slice(0, 20)) console.log('   ' + x);
if (ciche.length) { console.log('\nciche przyciski (' + ciche.length + '):'); for (const c of ciche) console.log('   ' + c); }
else console.log('✓ każdy przycisk daje dźwięk');

await b.close();
process.exit(bledy.length ? 1 : 0);
