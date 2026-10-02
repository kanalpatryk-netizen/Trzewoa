/**
 * Test nakładania interfejsu: na rozmiarach telefonów i tabletów otwiera grę i samouczek,
 * zbiera prostokąty elementów (obszaryHud) i zgłasza każde przecięcie.
 *
 *   npm run dev                      (w drugim oknie)
 *   npm run test:nakladanie          [adres, domyślnie http://localhost:5180/]
 *
 * Wymaga playwright-core i Chromium (ścieżka w CHROMIUM albo domyślna Playwrighta).
 */
let chromium;
try { ({ chromium } = await import('playwright-core')); } catch {
  console.error('Brak playwright-core: npm i -D playwright-core'); process.exit(2);
}
const ADRES = process.argv[2] || 'http://localhost:5180/';
// wersja Android: telefony pionowo i poziomo (widoczny obszar Chrome) oraz tablety
const ROZMIARY = [[360, 640], [360, 664], [390, 844], [412, 839], [412, 915], [640, 360], [740, 360], [844, 390], [915, 360], [768, 1024], [1024, 600]];
const ZAPAS = 1;   // px — styk krawędziami to jeszcze nie nakładanie

const przecina = (a, b) => a.x + ZAPAS < b.x + b.w && b.x + ZAPAS < a.x + a.w && a.y + ZAPAS < b.y + b.h && b.y + ZAPAS < a.y + a.h;
function kolizje(lista) {
  const out = [];
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
    if (przecina(lista[i], lista[j])) out.push(`${lista[i].nazwa} × ${lista[j].nazwa}`);
  }
  return out;
}

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let bledy = 0;
for (const [W, H] of ROZMIARY) {
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const wyjatki = []; p.on('pageerror', (e) => wyjatki.push(e.message));
  await p.goto(ADRES);
  await p.waitForFunction(() => window.__trzewia?.app.aktywnyEkran?.nazwa === 'menu', null, { timeout: 30000 });
  // gra: po chwili pojawia się też wstęga drogi
  await p.evaluate(() => window.__trzewia.idz('gra', { tryb: 'nowa' }));
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const g = window.__trzewia.app.aktywnyEkran; g.atlas?.zamknij?.(); });
  await p.waitForTimeout(300);
  const gra = await p.evaluate(() => window.__trzewia.app.aktywnyEkran.obszaryHud());
  // samouczek: karta leży na płycie, ale nie może wejść na ryty, klepsydrę ani przyciski
  await p.evaluate(() => window.__trzewia.idz('samouczek'));
  await p.waitForTimeout(800);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(1500);
  const sam = await p.evaluate(() => {
    const t = window.__trzewia.app.aktywnyEkran;
    const lista = t.gra.obszaryHud().filter((o) => o.nazwa !== 'droga');
    if (t.pola?.karta) lista.push({ nazwa: 'karta samouczka', ...t.pola.karta });
    return lista;
  });
  const k = [...kolizje(gra).map((s) => `gra: ${s}`), ...kolizje(sam).map((s) => `samouczek: ${s}`)];
  bledy += k.length + wyjatki.length;
  console.log(`${W}×${H}: ${gra.length}+${sam.length} obszarów — ${k.length ? k.join('; ') : 'bez nakładania'}${wyjatki.length ? ' | WYJĄTKI: ' + wyjatki.join('; ') : ''}`);
  await p.close();
}
await b.close();
console.log(bledy ? `BŁĄD: ${bledy} problemów` : 'OK: nic na nic nie nachodzi');
process.exit(bledy ? 1 : 0);
