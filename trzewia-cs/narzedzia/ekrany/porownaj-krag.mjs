// Porównanie ekranów TRYBU KRĘGU TRZECIEGO:
//   KRAG=<folder krag-3-beta> node narzedzia/ekrany/porownaj-krag.mjs → testy/zlote/ekrany-krag/<nazwa>.png i sceny.json
// (krag-3-beta z gałęzi claude/youthful-wozniak-dqa6s9). Test C# PorownanieEkranowKregu rysuje to samo i zapisuje
// testy/wyniki/ekrany-krag-*.png: TS | C# | różnica ×4.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zbuduj, otworz, zapiszPng } from '../duszki/paczka.mjs';

if (!process.env.KRAG) { console.error('Ustaw KRAG=<folder krag-3-beta>'); process.exit(1); }
const TU = path.dirname(fileURLToPath(import.meta.url));
const [W, H] = (process.argv[2] ?? '1366x820').split('x').map(Number);
const CEL = path.resolve(TU, '../../testy/zlote/ekrany-krag');
const kod = await zbuduj(path.join(TU, 'krag.ts'), {}, { '@krag': path.resolve(process.env.KRAG, 'src') });
const s = await otworz(kod, { viewport: { width: W, height: H } });
fs.mkdirSync(CEL, { recursive: true });
const rozmiar = await s.wolaj('przygotuj');
console.log('ekran logiczny', rozmiar);
const TERAZ = 100000;
const sceny = [];
zapiszPng(path.join(CEL, 'menu.png'), await s.wolaj('menu', TERAZ));
sceny.push({ nazwa: 'menu', rodzaj: 'menu', teraz: TERAZ });
// ziarno 3 (bot „rozsadny”): taras kręgu na początku, walka z Cerberem (trafienie), konanie
for (const [nazwa, tik, x, y, zoom] of [['taras', 2400, 96, 26, 12], ['walka', 97408, null, null, 14], ['kona', 101600, null, null, 14]]) {
  zapiszPng(path.join(CEL, `${nazwa}.png`), await s.wolaj('partia', 3, tik, x, y, zoom, TERAZ));
  sceny.push({ nazwa, rodzaj: 'gra', ziarno: 3, tik, x, y, zoom, teraz: TERAZ });
  console.log(nazwa);
}
fs.writeFileSync(path.join(CEL, 'sceny.json'), JSON.stringify({ w: W, h: H, lw: rozmiar.w, lh: rozmiar.h, sceny }, null, 1));
await s.zamknij();
