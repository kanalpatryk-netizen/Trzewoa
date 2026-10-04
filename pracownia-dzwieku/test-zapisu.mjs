// Sprawdzenie stroju i zapisu nastaw.
//   1. składnia całego skryptu pracowni (node --check),
//   2. generator: czy z wpisanych Hz wychodzą te Hz,
//   3. strój: czy przestraja kamień, chór i strażników,
//   4. zapis: czy `dzwiek.ts` KOMPILUJE SIĘ przez tsc --strict (to jest ten kontrakt),
//   5. JSON: czy wraca do pracowni prawdziwym wyborem pliku.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const TU = path.dirname(fileURLToPath(import.meta.url));
const PLIK = 'file://' + path.join(TU, 'index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pracownia-'));

let chromium;
for (const skad of ['playwright', '/opt/node-tools/node_modules/playwright/index.js']) {
  try { const m = await import(skad); chromium = (m.default || m).chromium; break; } catch (e) { /* dalej */ }
}
if (!chromium) { console.error('Brak Playwrighta. Zainstaluj: npm i -D playwright'); process.exit(2); }

const bledy = []; let zle = 0;
const niezgoda = (t) => { console.log('     ✗ ' + t); zle++; };

// ── 1. składnia: wyciągnij <script> i przepuść przez node --check
{
  const html = fs.readFileSync(path.join(TU, 'index.html'), 'utf8');
  const m = html.match(/<script>\n([\s\S]*)\n<\/script>/);
  if (!m) { console.error('nie znalazłem skryptu w index.html'); process.exit(2); }
  const js = path.join(TMP, 'skrypt.js');
  fs.writeFileSync(js, m[1]);
  try {
    execFileSync(process.execPath, ['--check', js], { stdio: 'pipe' });
    console.log('✓ składnia skryptu pracowni OK (' + m[1].split('\n').length + ' linii)');
  } catch (e) {
    console.log('✗ BŁĄD SKŁADNI w skrypcie pracowni:\n' + String(e.stderr || e));
    process.exit(1);
  }
}

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const s = await b.newPage();
s.on('console', (m) => { if (m.type() === 'error') bledy.push('console: ' + m.text()); });
s.on('pageerror', (e) => bledy.push('pageerror: ' + e.message));
await s.goto(PLIK);
await s.click('#obudz');
await s.waitForTimeout(900);

// `const el` na poziomie skryptu to wiązanie leksykalne, nie własność window —
// dlatego pytamy o samą nazwę, nie o window.el
if (!await s.evaluate(() => typeof el === 'function')) {
  console.log('✗ skrypt pracowni nie wystartował:\n   ' + bledy.join('\n   '));
  await b.close(); process.exit(1);
}

// ── 2. generator tonu
await s.check('#p-zegar');
await s.evaluate(() => {
  Object.assign(stan, { sen: 0, wiara: 0, krew: 0, zywi: 0, kopie: 0, rycerze: 0, dominacja: 0, magma: 0, fala: false, bossSpi: false });
  odswiezStanUI(); Dyrygent.ustaw();
  window.__szczytHz = (ms) => new Promise((res) => {
    const a = Mikser.analiza, n = a.frequencyBinCount, d = new Uint8Array(n), sr = Mikser.ctx.sampleRate;
    let najH = 0, najV = 0; const t0 = performance.now();
    const krok = () => {
      a.getByteFrequencyData(d);
      for (let i = 1; i < n; i++) if (d[i] > najV) { najV = d[i]; najH = i * sr / a.fftSize; }
      if (performance.now() - t0 < ms) requestAnimationFrame(krok); else res({ hz: najH, moc: najV });
    };
    requestAnimationFrame(krok);
  });
});
await s.waitForTimeout(5000);
const prazek = await s.evaluate(() => Mikser.ctx.sampleRate / 2048);
console.log('\n── GENERATOR TONU (rozdzielczość widma ' + prazek.toFixed(1) + ' Hz) ──');
for (const cel of [852, 174, 528, 963]) {
  await s.fill('#gen-hz', String(cel));
  await s.click('#gen-graj');
  const r = await s.evaluate(() => window.__szczytHz(1500));
  const ok = Math.abs(r.hz - cel) <= prazek;
  if (!ok) zle++;
  console.log('   ' + (ok ? '✓' : '✗') + ' wpisane ' + String(cel).padStart(4) +
              ' Hz → zmierzone ' + r.hz.toFixed(0).padStart(4) + ' Hz');
  await s.waitForTimeout(3200);
}

// ── 3. strój (setTargetAtTime ma stałą 0,4 s — trzeba dać mu dojść)
console.log('\n── STRÓJ ──');
for (const [etykieta, nr] of [['jak teraz', 0], ['852 ÷ 8', 1], ['852 ÷ 4', 2], ['A = 432', 3]]) {
  await s.evaluate((i) => el('stroj-presety').children[i].click(), nr);
  await s.waitForTimeout(2600);
  const st = await s.evaluate(() => ({
    odn: Stroj.odniesienie, podstawa: N.kamien.podstawa,
    straznik: Straznicy.pary[0].o.frequency.value,
    kamien: Kamien.hz(0, Kamien.skala()),
  }));
  const ok = Math.abs(st.podstawa - st.odn) < 0.01 && Math.abs(st.straznik - st.odn / 2) < 0.3;
  if (!ok) zle++;
  console.log('   ' + (ok ? '✓' : '✗') + ' ' + etykieta.padEnd(10) + 'odniesienie ' + st.odn.toFixed(2).padStart(7) +
              '  kamień ' + st.kamien.toFixed(1).padStart(6) + '  strażnik ' + st.straznik.toFixed(2).padStart(7));
}

// ── 4. zapis dzwiek.ts przez kompilator
await s.fill('#stroj-hz', '852');
await s.click('#stroj-ustaw');
await s.check('#stroj-serce');
await s.evaluate(() => { Modlitwa.poziom = 1.25; N.serce.glosnosc = 0.71; });
await s.waitForTimeout(500);

const ts = await s.evaluate(() => nastawyTS());
const plikTS = path.join(TMP, 'dzwiek.ts');
fs.writeFileSync(plikTS, ts);
console.log('\n── ZAPIS dzwiek.ts ──');
console.log('   ' + ts.split('\n').length + ' linii, ' + (Buffer.byteLength(ts) / 1024).toFixed(1) + ' kB, ' +
            (ts.match(/\/\*\* /g) || []).length + ' komentarzy');
console.log('   sekcje: ' + [...ts.matchAll(/^export const (\w+)/gm)].map((m) => m[1]).join(', '));
try {
  execFileSync('npx', ['--yes', 'tsc', '--noEmit', '--strict', plikTS], { stdio: 'pipe' });
  console.log('   ✓ KOMPILUJE SIĘ (tsc --strict) — można wrzucić w grę');
} catch (e) {
  console.log('   ✗ tsc odrzucił:\n' + String(e.stdout || e.stderr || e));
  zle++;
}
if (!ts.includes('podstawa: 852')) niezgoda('strój 852 nie trafił do zapisu');
if (!ts.includes('SERCE_ZE_STROJU = true')) niezgoda('„serce ze stroju” nie zapisane');
if (!/modlitwa: 1\.25/.test(ts)) niezgoda('poziom warstwy nie zapisany pod kluczem modułu');

// ── 5. JSON w obie strony, prawdziwym wyborem pliku
const plikJSON = path.join(TMP, 'nastawy-dzwieku.json');
fs.writeFileSync(plikJSON, await s.evaluate(() => nastawyJSON()));
await s.evaluate(() => el('stroj-presety').children[0].click());
await s.uncheck('#stroj-serce');
await s.evaluate(() => { Modlitwa.poziom = 0.3; N.serce.glosnosc = 0.1; });
await s.waitForTimeout(500);
await s.setInputFiles('#zap-plik', plikJSON);
await s.waitForTimeout(1200);
const po = await s.evaluate(() => ({ odn: Stroj.odniesienie, serce: Stroj.serceZeStroju, m: Modlitwa.poziom, g: N.serce.glosnosc, kom: el('zap-stan').textContent }));
console.log('\n── WCZYTANIE JSON ──');
console.log('   strój ' + po.odn.toFixed(2) + ', serce ze stroju ' + po.serce + ', Modlitwa ' + po.m + ', serce.glosnosc ' + po.g);
if (!(Math.abs(po.odn - 852) < 0.01 && po.serce === true && po.m === 1.25 && Math.abs(po.g - 0.71) < 0.001)) {
  niezgoda('wczytanie nie przywróciło wszystkiego');
} else console.log('   ✓ wszystko przywrócone: ' + po.kom);

fs.writeFileSync(path.join(TMP, 'zly.json'), '{"nie":"to"}');
await s.setInputFiles('#zap-plik', path.join(TMP, 'zly.json'));
await s.waitForTimeout(800);
const kom = await s.evaluate(() => el('zap-stan').textContent);
if (!/nie udało się/.test(kom)) niezgoda('zły plik nie został odrzucony'); else console.log('   ✓ zły plik odrzucony');

console.log('\n' + (bledy.length ? '✗ BŁĘDY JS (' + bledy.length + '):' : '✓ zero błędów JS'));
for (const x of bledy.slice(0, 10)) console.log('   ' + x);
console.log(zle ? '✗ niezgodności: ' + zle : '✓ wszystko zgodne');
fs.rmSync(TMP, { recursive: true, force: true });
await b.close();
process.exit(bledy.length || zle ? 1 : 0);
