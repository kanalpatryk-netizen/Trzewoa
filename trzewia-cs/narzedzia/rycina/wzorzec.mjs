// Wzorce ryciny świata: node narzedzia/rycina/wzorzec.mjs → testy/zlote/rycina/<nazwa>.png (+ .emis.gz) i sceny.json.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { zbuduj, otworz, zapiszPng } from '../duszki/paczka.mjs';

const TU = path.dirname(fileURLToPath(import.meta.url));
const CEL = path.resolve(TU, '../../testy/zlote/rycina');
const SCENY = [
  // jasna sala na początku partii: ołtarz, ciosy tylnej ściany, posadzka, lampki ludu
  { nazwa: 'sala-start', ziarno: 1, tik: 1200, kam: { x: 99, y: 37, zoom: 14, vw: 600, vh: 380 }, czas: 123456 },
  // obóz z bliska: płaty i rysy skały, świetlik podłogi, grube kontury
  { nazwa: 'oboz-blisko', ziarno: 1, tik: 9000, kam: { x: 103, y: 38, zoom: 26, vw: 600, vh: 380 }, czas: 98765 },
  // korytarze w głębi i blaknąca pamięć
  { nazwa: 'kopalnia', ziarno: 2, tik: 30000, kam: { x: 60, y: 110, zoom: 10, vw: 600, vh: 380 }, czas: 5555 },
  // krypta: rdzeń, czerwień głębi, skorupa pomnika
  { nazwa: 'krypta', ziarno: 1, tik: 60000, kam: { x: 96, y: 212, zoom: 12, vw: 600, vh: 380 }, czas: 77777 },
  // z daleka (przybliżenie 5) i całkiem z daleka (płaski ton, poza światem)
  { nazwa: 'daleko', ziarno: 3, tik: 20000, kam: { x: 96, y: 70, zoom: 5, vw: 600, vh: 380 }, czas: 4242 },
  { nazwa: 'plasko', ziarno: 3, tik: 20000, kam: { x: 96, y: 110, zoom: 2.2, vw: 600, vh: 380 }, czas: 4242 },
  // powierzchnia: niebo, grzbiet góry, szyby
  { nazwa: 'powierzchnia', ziarno: 2, tik: 4000, kam: { x: 100, y: 27, zoom: 12, vw: 600, vh: 380 }, czas: 31337 },
  // fresk (ustawienia → „Rysunek świata”)
  { nazwa: 'fresk', ziarno: 1, tik: 9000, kam: { x: 100, y: 42, zoom: 14, vw: 600, vh: 380 }, czas: 98765, fresk: true },
];
const s = await otworz(await zbuduj(path.join(TU, 'wzorzec.ts')));
fs.mkdirSync(CEL, { recursive: true });
const opis = [];
for (const sc of SCENY) {
  const w = await s.wolaj('odbitka', sc.ziarno, sc.tik, sc.kam, sc.czas, !!sc.fresk);
  zapiszPng(path.join(CEL, sc.nazwa + '.png'), w.png);
  fs.writeFileSync(path.join(CEL, sc.nazwa + '.emis.gz'), zlib.gzipSync(Buffer.from(w.emis, 'base64'), { level: 9 }));
  opis.push({ ...sc, fresk: !!sc.fresk, aw: w.aw, ah: w.ah, dx: w.dx, dy: w.dy });
  console.log(`${sc.nazwa}: tik ${w.tik}, ${w.aw}×${w.ah}`);
}
fs.writeFileSync(path.join(CEL, 'sceny.json'), JSON.stringify(opis, null, 1));
await s.zamknij();
