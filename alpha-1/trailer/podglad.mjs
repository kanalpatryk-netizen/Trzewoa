// Stykówka: pojedyncze klatki z wielu chwil partii (kandydaci na ujęcia) → jeden obraz z podpisami.
// node trailer/podglad.mjs <plik.json z [{z, t, x, y, zoom, l} | {z, t, sledz:'walka', l}]> <wyjście.jpg>
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { otworzGre, KATALOG } from './wspolne.mjs';

const [plik, wyjscie] = process.argv.slice(2);
const kandydaci = JSON.parse(fs.readFileSync(plik, 'utf8'));
const tmp = path.join(KATALOG, 'klatki', '_podglad');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
const { browser, page } = await otworzGre({ ziarno: kandydaci[0].z ?? 3 });
const kolejnosc = kandydaci.map((k, i) => ({ ...k, i })).sort((a, b) => (a.z ?? 3) - (b.z ?? 3) || a.t - b.t);
let ziarno = null;
for (const k of kolejnosc) {
  const z = k.z ?? 3;
  const tick = await page.evaluate(() => window.__trzewia.sim.tick);
  if (z !== ziarno || k.t - 40 < tick) { await page.evaluate((z) => window.R.nowaPartia(z, 'rozsadny'), z); ziarno = z; }
  await page.evaluate((t) => { window.R.przewin(Math.max(0, t - 40 - window.__trzewia.sim.tick)); window.R.zapomnij(); }, k.t);
  for (let i = 0; i < 10; i++) {
    let kam = { x: k.x, y: k.y, zoom: k.zoom };
    if (k.sledz) {
      const c = await page.evaluate((kto) => window.R.cel(kto), k.sledz);
      if (c) kam = { x: c.x, y: c.y, zoom: k.zoom ?? Math.max(18, Math.min(36, Math.min(1920 / (c.w + 20), 1080 / (c.h + 14)))) };
    }
    await page.clock.runFor(33);
    await page.evaluate((kam) => { window.R.kamera(kam); window.R.klatka(33, 1); }, kam);
  }
  const b64 = await page.evaluate(() => window.R.zrzut(0.9));
  fs.writeFileSync(path.join(tmp, `${String(k.i).padStart(3, '0')}.jpg`), Buffer.from(b64, 'base64'));
}
await browser.close();
// arkusz: 3 kolumny, miniatury 640×360 z podpisem
const py = `
import sys, json, glob
from PIL import Image, ImageDraw, ImageFont
k = json.load(open(sys.argv[1])); tmp = sys.argv[2]; out = sys.argv[3]
W, H, C = 640, 360, 3
R = (len(k) + C - 1) // C
im = Image.new('RGB', (W * C, (H + 26) * R), (0, 0, 0))
d = ImageDraw.Draw(im)
try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
except Exception: f = ImageFont.load_default()
for i, q in enumerate(k):
    t = Image.open(f'{tmp}/{i:03d}.jpg').resize((W, H), Image.LANCZOS)
    x, y = (i % C) * W, (i // C) * (H + 26)
    im.paste(t, (x, y))
    d.text((x + 6, y + H + 4), f"{i}: {q.get('l','')}  z{q.get('z',3)} t{q['t']} ({q['t']/7200:.2f}m)", fill=(230, 210, 170), font=f)
im.save(out, quality=88)
`;
execFileSync('python3', ['-c', py, plik, tmp, wyjscie], { stdio: 'inherit' });
console.log('arkusz:', wyjscie);
