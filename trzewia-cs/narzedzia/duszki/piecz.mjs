// Piecze duszki: node narzedzia/duszki/piecz.mjs [zlecenie…]   (bez argumentów — wszystkie z listy ZLECENIA)
// Wynik: trzewia-cs/dane/grafika/duszki/<zlecenie>.json + strony PNG <zlecenie>-h<wys>-<nr>.png
//        oraz podgląd trzewia-cs/duszki-podglad/<zlecenie>.jpg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { zbuduj, otworz, zapiszPng } from './paczka.mjs';

const TU = path.dirname(fileURLToPath(import.meta.url));
const CEL = process.env.CEL ?? path.resolve(TU, '../../dane/grafika/duszki');
// podglądy (wszystkie klatki animacji obok siebie) są dla ludzi — poza danymi gry
const PODGLAD = process.env.CEL ? path.join(CEL, 'podglad') : path.resolve(TU, '../../duszki-podglad');
export const ZLECENIA = [
  // robotnicy drużyny (numery 3, 4, 5) i dwa wzory dla przybyszów od anioła (7, 8); każdy także w hełmie
  'robotnik-3', 'robotnik-4', 'robotnik-5', 'robotnik-7', 'robotnik-8',
  'robotnik-3-helm', 'robotnik-4-helm', 'robotnik-5-helm', 'robotnik-7-helm', 'robotnik-8-helm',
  'pobozny-1', 'pobozny-2',
  // rycerz: stan zbroi z0…z5 = ile części z kuźni nosi (hełm, naramienniki, napierśnik, nakolanniki, tarcza)
  'rycerz-6-z0', 'rycerz-6-z1', 'rycerz-6-z2', 'rycerz-6-z3', 'rycerz-6-z4', 'rycerz-6-z5',
  'straznik',
];
const PODMIANY = {
  'render/lud/matma': 'nakladki/matma.ts',
  'render/lud/rozstep': 'nakladki/rozstep.ts',
  'sim/brama': 'nakladki/brama.ts',
};

// Paleta 256 barw z alfą (pngquant, apt-get install pngquant): arkusz ok. 4× mniejszy, różnicy nie widać (średnio
// 2–3 stopnie na kanał). Bez pngquanta strony zostają w pełnym kolorze — PEŁNY_KOLOR=1 wymusza to samo.
let pngquant = !process.env.PELNY_KOLOR;
if (pngquant) { try { execFileSync('pngquant', ['--version']); } catch { pngquant = false; console.error('UWAGA: brak pngquant — strony w pełnym kolorze (ok. 4× większe)'); } }
const kwantyzuj = (plik) => { if (pngquant) execFileSync('pngquant', ['--quality=85-100', '--speed', '1', '--strip', '--force', '--skip-if-larger', '--output', plik, plik], { stdio: 'ignore' }); };

const wybrane = process.argv.slice(2).length ? process.argv.slice(2) : ZLECENIA;
const kod = await zbuduj(path.join(TU, 'piekarnia.ts'), PODMIANY);
const s = await otworz(kod);
const poziomy = await s.wolaj('poziomy');
fs.mkdirSync(CEL, { recursive: true });
fs.mkdirSync(PODGLAD, { recursive: true });
for (const nazwa of wybrane) {
  const t0 = Date.now();
  const opis = { wersja: 1, postac: '', wzor: 0, wariant: '', mnoznik: 1, poziomy: [], animacje: {}, glowa: [] };
  let pikseli = 0, bajtow = 0, klatek = 0;
  // stare strony tego zlecenia znikają (liczba stron mogła się zmienić)
  for (const f of fs.readdirSync(CEL)) if (f.startsWith(nazwa + '-h') && f.endsWith('.png')) fs.unlinkSync(path.join(CEL, f));
  for (let nr = 0; nr < poziomy.length; nr++) {
    const w = await s.wolaj('piecz', nazwa, nr);
    for (const o of w.ostrzezenia) console.error(`  ${nazwa} h${w.h}: ${o}`);
    const strony = w.strony.map((url, i) => {
      const plik = `${nazwa}-h${w.h}-${i}.png`;
      zapiszPng(path.join(CEL, plik), url);
      try { kwantyzuj(path.join(CEL, plik)); } catch { /* --skip-if-larger: zostaje oryginał */ }
      bajtow += fs.statSync(path.join(CEL, plik)).size;
      pikseli += w.rozmiary[i][0] * w.rozmiary[i][1];
      return plik;
    });
    opis.poziomy.push({ h: w.h, strony, klatki: w.klatki, swiatla: w.swiatla });
    Object.assign(opis, { postac: w.postac, wzor: w.wzor, wariant: w.wariant, mnoznik: w.mnoznik, animacje: w.animacje, glowa: w.glowa });
    klatek = w.klatki.length;
    if (nr === poziomy.length - 1) {
      const jpg = await s.wolaj('podglad');
      fs.writeFileSync(path.join(PODGLAD, nazwa + '.jpg'), Buffer.from(jpg.replace(/^data:image\/jpeg;base64,/, ''), 'base64'));
    }
  }
  // JSON zwarty: każda klatka w jednym wierszu
  const tekst = JSON.stringify(opis).replace(/\],\[/g, '],\n[');
  fs.writeFileSync(path.join(CEL, nazwa + '.json'), tekst);
  console.log(`${nazwa}: ${klatek} klatek × ${poziomy.length} poziomy, ${(pikseli / 1e6).toFixed(1)} Mpx, PNG ${(bajtow / 1e6).toFixed(2)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
await s.zamknij();
