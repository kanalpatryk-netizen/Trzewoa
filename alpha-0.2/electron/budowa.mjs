// Trzewia.exe (Windows, Electron): kopiuje gotową grę (../trzewia.html po `npm run pack` w alpha-0.2) i buduje
// dist/Trzewia-alpha-0.2.exe — przenośny plik, bez instalacji. Ikona: zasoby/ikona.ico (z zasoby/ikona.svg — node zasoby/ikona.mjs).
// `node budowa.mjs linux` (npm run linux) — to samo na Linuksa: dist/Trzewia-alpha-0.2.AppImage, bez Protona.
//
//   cd alpha-0.2 && npm run pack && cd electron && npm install && npm run exe
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tu = dirname(fileURLToPath(import.meta.url));
const gra = join(tu, '..', 'trzewia.html');
if (!existsSync(gra)) { console.error('Najpierw: npm run pack w alpha-0.2 (brak trzewia.html)'); process.exit(1); }
mkdirSync(join(tu, 'gra'), { recursive: true });
copyFileSync(gra, join(tu, 'gra', 'trzewia.html'));
// ikona okna na Linuksie (na Windowsie okno bierze ikonę z pliku .exe)
copyFileSync(join(tu, 'zasoby', 'ikona.png'), join(tu, 'gra', 'ikona.png'));

const linux = process.argv[2] === 'linux';
const cel = linux ? ['--linux', 'AppImage', '--x64'] : ['--win', 'portable', '--x64'];
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-builder', ...cel], { cwd: tu, stdio: 'inherit' });
console.log(`Gotowe: ${join(tu, 'dist', linux ? 'Trzewia-alpha-0.2.AppImage' : 'Trzewia-alpha-0.2.exe')}`);
