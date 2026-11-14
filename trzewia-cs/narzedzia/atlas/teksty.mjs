// Teksty tablic atlasu z kodu TS → testy/zlote/atlas-teksty.json (test C#: TekstyAtlasu porównuje znak w znak).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zbuduj, otworz } from '../duszki/paczka.mjs';

const TU = path.dirname(fileURLToPath(import.meta.url));
const s = await otworz(await zbuduj(path.join(TU, 'teksty.ts')));
const t = await s.wolaj('teksty');
fs.writeFileSync(path.resolve(TU, '../../testy/zlote/atlas-teksty.json'), JSON.stringify(t, null, 1));
console.log(`tablic: ${t.length}`);
await s.zamknij();
