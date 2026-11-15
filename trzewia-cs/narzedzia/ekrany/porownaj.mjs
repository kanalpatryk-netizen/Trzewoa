// Końcowe porównanie ekranów: node narzedzia/ekrany/porownaj.mjs [1920x1080] → testy/zlote/ekrany[/1920x1080]/<nazwa>.png
// (TS) i sceny.json;
// test C# PorownanieEkranow rysuje to samo i zapisuje testy/wyniki/ekrany-*.png: TS | C# | różnica ×4.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zbuduj, otworz, zapiszPng } from '../duszki/paczka.mjs';

const TU = path.dirname(fileURLToPath(import.meta.url));
// rozdzielczość podstawowa (skala 1) i Full HD (skala ≈ 1,32 — przekształcenia, które przy skali 1 nic nie zmieniają)
const [W, H] = (process.argv[2] ?? '1366x820').split('x').map(Number);
const CEL = path.resolve(TU, '../../testy/zlote/ekrany', W === 1366 && H === 820 ? '' : `${W}x${H}`);
const kod = await zbuduj(path.join(TU, 'ekrany.ts'));
const s = await otworz(kod, { viewport: { width: W, height: H } });
fs.mkdirSync(CEL, { recursive: true });
const rozmiar = await s.wolaj('przygotuj');
console.log('ekran logiczny', rozmiar);
const sceny = [];
for (const [nazwa, po] of [['menu', 6000], ['ustawienia', 3000], ['osiagniecia', 3000], ['bestiariusz', 3000]]) {
  zapiszPng(path.join(CEL, `${nazwa}.png`), await s.wolaj('ekran', nazwa, po));
  sceny.push({ nazwa, rodzaj: 'ekran', po });
  console.log(nazwa);
}
for (const [ziarno, tik] of [[12345, 1800], [777, 7200]]) {
  const nazwa = `gra-${ziarno}-${tik}`;
  zapiszPng(path.join(CEL, `${nazwa}.png`), await s.wolaj('partia', ziarno, tik));
  sceny.push({ nazwa, rodzaj: 'gra', ziarno, tik });
  console.log(nazwa);
}
zapiszPng(path.join(CEL, 'kronika.png'), await s.wolaj('kronika', 5000));
sceny.push({ nazwa: 'kronika', rodzaj: 'kronika', po: 5000, ziarno: 777, tik: 7200 });
fs.writeFileSync(path.join(CEL, 'sceny.json'), JSON.stringify({ w: W, h: H, lw: rozmiar.w, lh: rozmiar.h, sceny }, null, 1));
await s.zamknij();
