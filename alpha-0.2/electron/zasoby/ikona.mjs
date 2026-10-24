// Ikona programu: zasoby/ikona.svg (pełny rysunek, 40–256 px) i jego uproszczona wersja na 16–32 px (`mala` niżej:
// grubsza kreska, bez kreskowania i znaków — w małym rozmiarze zostają góra, rama i żar rdzenia) → zasoby/ikona.ico
// (16–128 px jako mapy bitowe 32-bit z kanałem alfa, 256 px jako PNG) i zasoby/ikona.png (256 px, podgląd).
// Rysuje Chromium z Playwright:  node zasoby/ikona.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const tu = dirname(fileURLToPath(import.meta.url));
const ROZMIARY = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256];

/** Mała ikona (`px` pikseli): ten sam rysunek co ikona.svg, kreska liczona w pikselach ekranu. */
function mala(px) {
  const u = 256 / px;
  const obrys = (px <= 20 ? 1 : 1.25) * u, rama = (px <= 20 ? 1 : 1.5) * u;
  const r = (px <= 20 ? 2.6 : px <= 24 ? 3.6 : 4) * u, cy = 196, R = r + 2.4 * u;
  const krzyz = px < 20 ? '' : `
    <g stroke="#efe3c6" stroke-width="${u}"><line x1="128" y1="56" x2="128" y2="${56 - 3.2 * u}"/><line x1="${128 - 1.5 * u}" y1="${56 - 2.2 * u}" x2="${128 + 1.5 * u}" y2="${56 - 2.2 * u}"/></g>`;
  const droga = px < 24 ? '' : `
    <path d="M128 70 L106 106 L148 136 L122 ${Math.round(cy - r - 6)}" fill="none" stroke="#f0bf6e" stroke-width="${u}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const krag = px < 24 ? '' : `
    <circle cx="128" cy="${cy}" r="${r + 1.4 * u}" fill="none" stroke="#ff8c32" stroke-width="${0.8 * u}" stroke-opacity="0.75"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="tlo" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#3b261b"/><stop offset="0.6" stop-color="#1b110d"/><stop offset="1" stop-color="#0b0807"/></radialGradient>
    <linearGradient id="skala" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a08367"/><stop offset="0.5" stop-color="#6e5440"/><stop offset="1" stop-color="#3a2a1f"/></linearGradient>
    <radialGradient id="poswiata" cx="128" cy="${cy}" r="${r * 2.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff8c32" stop-opacity="0.85"/><stop offset="0.45" stop-color="#e2452c" stop-opacity="0.4"/><stop offset="1" stop-color="#8a1a16" stop-opacity="0"/></radialGradient>
    <radialGradient id="rdzen" cx="0.4" cy="0.36" r="0.72"><stop offset="0" stop-color="#fff4dc"/><stop offset="0.3" stop-color="#ffb066"/><stop offset="0.7" stop-color="#ef5a32"/><stop offset="1" stop-color="#a3201a"/></radialGradient>
    <clipPath id="plyta"><rect x="${rama / 2}" y="${rama / 2}" width="${256 - rama}" height="${256 - rama}" rx="48"/></clipPath>
  </defs>
  <rect width="256" height="256" rx="52" fill="#0b0807"/>
  <g clip-path="url(#plyta)">
    <rect width="256" height="256" fill="url(#tlo)"/>
    <path d="M0 214 L52 152 L84 138 L100 146 L128 56 L166 112 L186 122 L256 196 L256 256 L0 256 Z" fill="url(#skala)"/>
    <path d="M0 214 L52 152 L84 138 L100 146 L128 56 L166 112 L186 122 L256 196" fill="none" stroke="#efe0bc" stroke-width="${obrys}" stroke-linejoin="round"/>
    <circle cx="128" cy="${cy}" r="${r * 2.6}" fill="url(#poswiata)"/>
    <path d="M${128 - R} 256 V${cy} A${R} ${R} 0 0 1 ${128 + R} ${cy} V256 Z" fill="#1e0907"/>${krag}${droga}${krzyz}
    <circle cx="128" cy="${cy}" r="${r}" fill="url(#rdzen)"/>
  </g>
  <rect x="${rama / 2}" y="${rama / 2}" width="${256 - rama}" height="${256 - rama}" rx="48" fill="none" stroke="#9c4630" stroke-width="${rama}"/>
</svg>`;
}

/** Wpis .ico jako mapa bitowa: nagłówek DIB, piksele BGRA od dołu i maska przezroczystości. */
function bmp(n, rgba) {
  const wierszMaski = Math.ceil(n / 32) * 4;
  const naglowek = Buffer.alloc(40);
  naglowek.writeUInt32LE(40, 0); naglowek.writeInt32LE(n, 4); naglowek.writeInt32LE(n * 2, 8);
  naglowek.writeUInt16LE(1, 12); naglowek.writeUInt16LE(32, 14);
  naglowek.writeUInt32LE(n * n * 4 + wierszMaski * n, 20);
  const piksele = Buffer.alloc(n * n * 4), maska = Buffer.alloc(wierszMaski * n);
  for (let y = 0; y < n; y++) {
    const wy = n - 1 - y;
    for (let x = 0; x < n; x++) {
      const s = (y * n + x) * 4, d = (wy * n + x) * 4;
      piksele[d] = rgba[s + 2]; piksele[d + 1] = rgba[s + 1]; piksele[d + 2] = rgba[s]; piksele[d + 3] = rgba[s + 3];
      if (rgba[s + 3] === 0) maska[wy * wierszMaski + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return Buffer.concat([naglowek, piksele, maska]);
}

const pelna = readFileSync(join(tu, 'ikona.svg'), 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent('<canvas id="c"></canvas>');
const wpisy = [];
for (const n of ROZMIARY) {
  const svg = (n <= 32 ? mala(n) : pelna).replace('<svg ', `<svg width="${n}" height="${n}" `);
  const { rgba, png } = await p.evaluate(async ({ svg, n }) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    await img.decode();
    const c = document.getElementById('c');
    c.width = n; c.height = n;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, n, n);
    return { rgba: Array.from(g.getImageData(0, 0, n, n).data), png: c.toDataURL('image/png').split(',')[1] };
  }, { svg, n });
  const dane = n >= 256 ? Buffer.from(png, 'base64') : bmp(n, rgba);
  wpisy.push({ n, dane });
  if (n === 256) writeFileSync(join(tu, 'ikona.png'), Buffer.from(png, 'base64'));
}
await b.close();

const glowa = Buffer.alloc(6 + 16 * wpisy.length);
glowa.writeUInt16LE(1, 2); glowa.writeUInt16LE(wpisy.length, 4);
let gdzie = glowa.length;
wpisy.forEach(({ n, dane }, i) => {
  const o = 6 + 16 * i;
  glowa[o] = n >= 256 ? 0 : n; glowa[o + 1] = n >= 256 ? 0 : n;
  glowa.writeUInt16LE(1, o + 4); glowa.writeUInt16LE(32, o + 6);
  glowa.writeUInt32LE(dane.length, o + 8); glowa.writeUInt32LE(gdzie, o + 12);
  gdzie += dane.length;
});
writeFileSync(join(tu, 'ikona.ico'), Buffer.concat([glowa, ...wpisy.map((w) => w.dane)]));
console.log(`zasoby/ikona.ico — ${ROZMIARY.join(', ')} px, ${(gdzie / 1024).toFixed(0)} kB`);
