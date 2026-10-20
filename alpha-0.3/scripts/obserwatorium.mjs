// Obserwatorium — cztery okna gry, w każdym gra bot (osobny plik obserwatorium.html).
// Bierze gotowy trzewia.html (po `npm run pack`) i wkłada go w stronę z czterema oknami.
// Uruchom: npm run obserwatorium
import fs from 'fs';
import path from 'path';

// Alpha 0.3: node scripts/obserwatorium.mjs <gra.html> <obserwatorium.html> — po jednym na wersję
const gra = path.resolve(process.argv[2] ?? 'trzewia.html');
if (!fs.existsSync(gra)) { console.error('Najpierw: npm run pack (brak trzewia.html)'); process.exit(1); }
const szablon = fs.readFileSync(path.resolve('scripts/obserwatorium/szablon.html'), 'utf8');
const html = fs.readFileSync(gra, 'utf8');
// gra jako napis JS; „</” rozbite, żeby nie zamknęło skryptu strony
const napis = JSON.stringify(html).replace(/<\//g, '<\\/').replace(/[\u2028\u2029]/g, (z) => (z === '\u2028' ? '\\u2028' : '\\u2029'));
const out = path.resolve(process.argv[3] ?? 'obserwatorium.html');
fs.writeFileSync(out, szablon.replace('/*GRA*/', () => `const GRA = ${napis};`));
console.log(`${out} — ${(fs.statSync(out).size / 1024).toFixed(1)} kB`);
