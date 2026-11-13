// Wzorce obrazów do testu duszków: node narzedzia/duszki/porownaj.mjs
// → testy/zlote/duszki/<nazwa>.png (rysunek postaci z gry TS) i sceny.json (parametry scen dla testu C#).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zbuduj, otworz, zapiszPng } from './paczka.mjs';

const TU = path.dirname(fileURLToPath(import.meta.url));
const CEL = path.resolve(TU, '../../testy/zlote/duszki');
// kamera w kaflach; ekran logiczny vw × vh, skala ekranu 1080/820 (1920×1080)
const SCENY = [
  // początek partii: obóz przy sali i dwóch robotników kujących w lewo — największe przybliżenie
  { nazwa: 'ziarno1-tik1200', ziarno: 1, tik: 1200, klatek: 240, kam: { x: 91, y: 38, zoom: 24, vw: 1150, vh: 300 }, skala: 1080 / 820 },
  // obóz z bliska (pobożni, robotnik, rycerz)
  { nazwa: 'ziarno1-tik9000-oboz', ziarno: 1, tik: 9000, klatek: 240, kam: { x: 103, y: 36.6, zoom: 26, vw: 420, vh: 200 }, skala: 1080 / 820 },
  // kopacze w głębi
  { nazwa: 'ziarno1-tik9000-kopacze', ziarno: 1, tik: 9000, klatek: 240, kam: { x: 46, y: 100, zoom: 26, vw: 300, vh: 220 }, skala: 1080 / 820 },
  // zwykłe przybliżenie gry (14) — średni poziom wielkości duszków
  { nazwa: 'ziarno2-tik30000', ziarno: 2, tik: 30000, klatek: 240, kam: { x: 100, y: 36.6, zoom: 14, vw: 420, vh: 160 }, skala: 1080 / 820 },
  // z daleka (poniżej 9 px na kafel postacie grupują się i dostają „×n”)
  { nazwa: 'ziarno2-tik30000-daleko', ziarno: 2, tik: 30000, klatek: 240, kam: { x: 100, y: 37, zoom: 6, vw: 420, vh: 160 }, skala: 1080 / 820 },
];
const s = await otworz(await zbuduj(path.join(TU, 'porownanie.ts')));
fs.mkdirSync(CEL, { recursive: true });
const opis = [];
for (const sc of SCENY) {
  const w = await s.wolaj('scena', sc.ziarno, sc.tik, sc.klatek, sc.kam, sc.skala);
  zapiszPng(path.join(CEL, sc.nazwa + '.png'), w.url);
  opis.push({ ...sc, tikKoniec: w.tik, postacie: w.postacie });
  console.log(`${sc.nazwa}: tik ${w.tik}, postaci ${w.postacie.length}`);
}
fs.writeFileSync(path.join(CEL, 'sceny.json'), JSON.stringify(opis, null, 1));
await s.zamknij();
