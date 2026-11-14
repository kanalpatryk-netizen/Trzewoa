// Płyty świata liczone kodem TS do porównania z C#: node narzedzia/plyta/porownaj.mjs
// → testy/zlote/plyta/<nazwa>.png i sceny.json (test C#: PorownaniePlyty — obrazy obok siebie i miary różnicy).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zbuduj, otworz, zapiszPng } from '../duszki/paczka.mjs';

const TU = path.dirname(fileURLToPath(import.meta.url));
const CEL = path.resolve(TU, '../../testy/zlote/plyta');
const VW = 600, VH = 380;
const SCENY = [
  // sala z ołtarzem na początku partii: katedra, promień, lud
  { nazwa: 'sala-start', ziarno: 1, tik: 1200, kam: { x: 99, y: 34, zoom: 12 }, teraz: 123456 },
  // obóz i sala później: wiadro, kołowrót szybu, plan drogi
  { nazwa: 'oboz', ziarno: 1, tik: 9000, kam: { x: 96, y: 38, zoom: 14 }, teraz: 98765 },
  // żelazo w skale z bliska i kopacze
  { nazwa: 'zelazo', ziarno: 1, tik: 9000, kam: { x: 50.5, y: 105.5, zoom: 30 }, teraz: 55555 },
  // powierzchnia: katedra, konwój, kozioł nad szybem wiadra
  { nazwa: 'powierzchnia', ziarno: 2, tik: 4000, kam: { x: 96, y: 24, zoom: 9 }, teraz: 31337 },
  // krypta z pomnikiem
  { nazwa: 'krypta', ziarno: 1, tik: 60000, kam: { x: 96.5, y: 222, zoom: 14 }, teraz: 77777 },
  // z daleka: cała góra
  { nazwa: 'daleko', ziarno: 3, tik: 20000, kam: { x: 96, y: 70, zoom: 5 }, teraz: 4242 },
];
const s = await otworz(await zbuduj(path.join(TU, 'plyta.ts')));
fs.mkdirSync(CEL, { recursive: true });
const opis = [];
for (const sc of SCENY) {
  const w = await s.wolaj('plyta', sc.ziarno, sc.tik, sc.kam, VW, VH, sc.teraz, 3);
  zapiszPng(path.join(CEL, sc.nazwa + '.png'), w.png);
  opis.push({ ...sc, vw: VW, vh: VH, klatek: 3 });
  console.log(`${sc.nazwa}: tik ${w.tik}`);
}
fs.writeFileSync(path.join(CEL, 'sceny.json'), JSON.stringify(opis, null, 1));
await s.zamknij();
