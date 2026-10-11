/**
 * Renderuje arkusz klatek dłoni z otchłani (src/grafiki/dlon/dlon-z-otchlani.webp) z modelu 3D
 * w scripts/dlon/model.html: dłoń zbudowana z brył zlewających się w jedną (kości śródręcza,
 * ścięgna, żyły, stawy ze zmarszczkami, rogowe szpony), cieniowana promieniem (ray marching)
 * w WebGL — z cieniami, okluzją, fakturą skóry, czerwoną łuną oczu zza dłoni i ciepłym światłem
 * lampek od strony palców.
 *
 *   node scripts/dlon/renderuj.mjs            (potrzebny Playwright z Chromium)
 *
 * 10 klatek od otwartej dłoni do pięści, każda renderowana 2× większa i zmniejszana (gładkie
 * krawędzie), złożone w arkusz 2 × 5 po 792 × 360 px i zapisane jako WebP (jakość 0,9).
 * Zmiana kadru albo liczby klatek wymaga tej samej zmiany w ARKUSZ w src/render/dlon.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tu = path.dirname(fileURLToPath(import.meta.url));
const pw = await import(process.env.PLAYWRIGHT ?? 'playwright');
const chromium = pw.chromium ?? pw.default.chromium;
const KLATKI = 10, SZER = 792, WYS = 360, KOLUMNY = 2;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('file://' + path.join(tu, 'model.html'));
await p.waitForFunction(() => window.gotowe === true, null, { timeout: 120000 });
const url = await p.evaluate(async ([KLATKI, SZER, WYS, KOLUMNY]) => {
  const arkusz = document.createElement('canvas');
  arkusz.width = SZER * KOLUMNY; arkusz.height = WYS * Math.ceil(KLATKI / KOLUMNY);
  const g = arkusz.getContext('2d');
  g.imageSmoothingQuality = 'high';
  for (let k = 0; k < KLATKI; k++) {
    const img = new Image();
    img.src = window.renderuj(k / (KLATKI - 1), SZER * 2, WYS * 2, [-17, 27, -11, 9], 1);
    await img.decode();
    g.drawImage(img, (k % KOLUMNY) * SZER, Math.floor(k / KOLUMNY) * WYS, SZER, WYS);
  }
  return arkusz.toDataURL('image/webp', 0.9);
}, [KLATKI, SZER, WYS, KOLUMNY]);
const cel = path.join(tu, '../../src/grafiki/dlon/dlon-z-otchlani.webp');
fs.writeFileSync(cel, Buffer.from(url.split(',')[1], 'base64'));
console.log('zapisano', cel, fs.statSync(cel).size, 'B');
await b.close();
