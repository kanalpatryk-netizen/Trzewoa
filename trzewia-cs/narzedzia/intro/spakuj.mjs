// Film intro dla Trzewia.exe (PLAN.md 3.7): alpha-1/filmy/intro.mp4 → dane/filmy/intro.klatki.
// ffmpeg rozkłada film na klatki WebP (jakość 82 — PSNR ok. 56–60 dB względem filmu, praktycznie bez strat),
// a ten skrypt składa je w jeden plik: nagłówek, spis klatek, klatki. Gra dekoduje je Skią w osobnym wątku.
//
// Format (liczby 32-bitowe, little-endian):
//   "TRZK", wersja (1), klatek na sekundę × 1000, szerokość, wysokość, liczba klatek n,
//   n × (przesunięcie od początku danych, długość), dane klatek jedna za drugą.
//
// Uruchomienie: node narzedzia/intro/spakuj.mjs   (potrzebny ffmpeg w PATH)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TU = path.dirname(fileURLToPath(import.meta.url));
const FILM = path.resolve(TU, '../../../alpha-1/filmy/intro.mp4');
const CEL = path.resolve(TU, '../../dane/filmy/intro.klatki');
const JAKOSC = 82;

const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', FILM]).toString()).streams[0];
const [licz, mian] = info.r_frame_rate.split('/').map(Number);
const fps = licz / mian;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trzewia-intro-'));
execFileSync('ffmpeg', ['-v', 'error', '-i', FILM, '-c:v', 'libwebp', '-quality', String(JAKOSC), '-compression_level', '4', path.join(tmp, 'k%05d.webp')]);
const pliki = fs.readdirSync(tmp).filter((f) => f.endsWith('.webp')).sort();
const klatki = pliki.map((f) => fs.readFileSync(path.join(tmp, f)));
fs.rmSync(tmp, { recursive: true, force: true });

const naglowek = Buffer.alloc(4 + 5 * 4 + klatki.length * 8);
naglowek.write('TRZK', 0, 'ascii');
let o = 4;
for (const v of [1, Math.round(fps * 1000), info.width, info.height, klatki.length]) { naglowek.writeUInt32LE(v, o); o += 4; }
let przes = 0;
for (const k of klatki) { naglowek.writeUInt32LE(przes, o); naglowek.writeUInt32LE(k.length, o + 4); o += 8; przes += k.length; }
fs.mkdirSync(path.dirname(CEL), { recursive: true });
fs.writeFileSync(CEL, Buffer.concat([naglowek, ...klatki]));
console.log(`${klatki.length} klatek ${info.width}×${info.height}, ${fps} kl/s → ${CEL} (${(fs.statSync(CEL).size / 1048576).toFixed(1)} MB)`);
