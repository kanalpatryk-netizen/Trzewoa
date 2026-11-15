// Dopisuje do dane/dzwieki/spis.json długość samej mowy (`mowaSekundy`) w każdym gotowym pliku głosu — bez nagrywania
// plików od nowa (nagraj.mjs liczy to sam przy pełnym przebiegu).   node narzedzia/dzwieki/mowa.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zbuduj, otworz, ALPHA } from '../duszki/paczka.mjs';

const TU = path.dirname(fileURLToPath(import.meta.url));
const SPIS = path.resolve(TU, '../../dane/dzwieki/spis.json');
const spis = JSON.parse(fs.readFileSync(SPIS, 'utf8'));
const s = await otworz(await zbuduj(path.join(TU, 'dzwieki.ts')));
for (const x of spis.filter((x) => x.grupa === 'glosy')) {
  const zr = spis.find((y) => y.plik === x.zrodlo);
  const plik = path.join(ALPHA, zr.zrodlo.replace(/^alpha-1\//, ''));
  const kto = x.plik.split('/')[1];
  const rodzaj = x.plik.includes('/odmowa') ? 'odmowa' : 'ludu';
  const url = `data:audio/mpeg;base64,${fs.readFileSync(plik).toString('base64')}`;
  const m = await s.wolaj('mowa', url, x.plik, rodzaj, kto);
  x.mowaSekundy = m === null ? null : +m.toFixed(3);
}
await s.zamknij();
fs.writeFileSync(SPIS, JSON.stringify(spis, null, 1));
console.log('mowa dopisana:', spis.filter((x) => x.mowaSekundy).length);
