// Wzorzec sin/cos/atan2/hypot z Chromium (V8 z LLVM libc) dla testy/Trzewia.Testy/JsMathTesty.cs.
// Uruchomienie (z folderu trzewia-cs; Playwright z Chromium): NODE_PATH=$(npm root -g) node narzedzia/trygonometria-chromium.cjs [ile]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const ile = Number(process.argv[2] || 10000);
  const b = await chromium.launch();
  const p = await b.newPage();
  const tekst = await p.evaluate((ile) => {
    let s = 12345;
    const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    const f64 = new Float64Array(1), u = new BigUint64Array(f64.buffer);
    const bits = (x) => { f64[0] = x; return u[0].toString(16); };
    const out = [];
    for (let i = 0; i < ile; i++) {
      const zakres = [1, 10, 100, 1e4, 1e6][i % 5];
      const a = (rnd() * 2 - 1) * zakres, c = (rnd() * 2 - 1) * zakres;
      out.push([bits(a), bits(c), bits(Math.sin(a)), bits(Math.cos(a)), bits(Math.atan2(a, c)), bits(Math.hypot(a, c)), bits(Math.sqrt(Math.abs(a)))].join(' '));
    }
    return out.join('\n') + '\n';
  }, ile);
  fs.writeFileSync(path.join(__dirname, '..', 'testy', 'zlote', 'chromium-trygonometria.txt'), tekst);
  console.log(`${ile} wierszy — ${await b.version()}`);
  await b.close();
})();
