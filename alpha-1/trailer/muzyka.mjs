// Ścieżka dźwiękowa trailera: muzyka i efekty syntezowane w przeglądarce (trailer/muzyka.ts, OfflineAudioContext),
// zsynchronizowane z obrazem — czasy zdarzeń biorą się z tików gry zapisanych przy nagrywaniu (klatki/<id>/meta.json)
// i z ruchów walki (dane/ruchy-3.json). Wynik: trailer/wyjscie/muzyka.wav (48 kHz, 16 bit, stereo).
// node trailer/muzyka.mjs
import fs from 'fs';
import path from 'path';
import { playwright, KATALOG, ADRES } from './wspolne.mjs';
import { SCENARIUSZ, FPS, MUZYKA, T, DLUGOSC } from './scenariusz.mjs';

const ujecia = new Map(SCENARIUSZ.filter((u) => u.typ === 'gra').map((u) => [u.id, u]));
const meta = new Map();
for (const id of ujecia.keys()) {
  try { meta.set(id, JSON.parse(fs.readFileSync(path.join(KATALOG, 'klatki', id, 'meta.json'), 'utf8'))); } catch { /* bez nagrania */ }
}
/** Czas filmu (s), w którym w ujęciu `id` gra dochodzi do tiku `tick` (null — poza widoczną częścią ujęcia). */
function czasTiku(id, tick, zZapasem = false) {
  const u = ujecia.get(id), m = meta.get(id);
  if (!u || !m) return null;
  const nr = m.ticki.findIndex((t) => t >= tick);
  if (nr < 0) return null;
  const f = nr - m.zapas;
  if (!zZapasem && (f < 0 || f >= m.widoczne)) return null;
  return u.od + f / FPS;
}
/** Ujęcie, które w chwili filmu t jest na ekranie. */
const naEkranie = (t) => [...ujecia.values()].find((u) => t >= u.od && t < u.od + u.dl);

const W = [];
const dodaj = (t, co, v = 1, dl) => { if (t !== null && t !== undefined && t >= 0) W.push({ t: +t.toFixed(3), co, v, dl }); };

// ---------------------------------------------------------------- walka: trafienia z ruchów (tik startu + chwile trafień)
const TRAF = {
  ciecieZGory: [56], pchniecie: [40], ciecieBoczne: [48], ciecieOdwrotne: [46], seriaTrzech: [46, 86, 128], ciecieOdDolu: [54],
  piruet: [78], ciosZWyskoku: [96], mlynek: [42, 74, 106, 138], finta: [86], egzekucja: [114], parowanie: [20],
  zGory: [70], zamach: [64], podciecie: [70], podwojnyZamach: [70, 118], przygniecenie: [80, 150], tupniecie: [76],
  biczLancucha: [86], szarza: [10], uderzenieWZiemie: [110], blok: [20], zachwianie: [10],
};
const ruchy = JSON.parse(fs.readFileSync(path.join(KATALOG, 'dane', 'ruchy-3.json'), 'utf8'));
for (const m of ruchy) {
  for (const off of TRAF[m.id] ?? []) {
    const tick = m.od + off;
    for (const id of ujecia.keys()) {
      if ((ujecia.get(id).z ?? 3) !== 3) continue;
      const t = czasTiku(id, tick);
      if (t === null || naEkranie(t)?.id !== id) continue;
      if (m.kto === 'rycerz') dodaj(t, 'miecz', m.id === 'parowanie' ? 0.7 : 1);
      else if (m.id === 'uderzenieWZiemie' || m.id === 'tupniecie') { dodaj(t, 'boom', m.id === 'uderzenieWZiemie' ? 1.4 : 0.9); dodaj(t, 'trzask', 0.9); }
      else if (m.id === 'zachwianie' || m.id === 'blok') dodaj(t, 'taiko', 0.6);
      else { dodaj(t, 'boomMaly', 0.7); dodaj(t - 0.25, 'swist', 0.8, 0.3); }
    }
  }
  if (m.id === 'ryk') { for (const id of ['S33']) { const t = czasTiku(id, m.od + 8); if (t !== null) dodaj(t, 'ryk', 1, 1.7); } }
}

// ---------------------------------------------------------------- zdarzenia ujęć
const u = (id) => ujecia.get(id);
dodaj(u('S03').od, 'kopyta', 1, u('S03').dl + 0.4);
dodaj(u('S04').od, 'swistDol', 0.45, u('S04').dl);
dodaj(czasTiku('S04', 10168), 'stuk', 1.2);
dodaj(u('S05').od + 6 / FPS, 'szept', 1, 1.6);
dodaj(u('S05').od + 0.5, 'blask', 0.6, 1.0);
// Cud: rozbłysk w obrazie (najjaśniejsza klatka ujęcia) — dzwon, blask i uderzenie światła
// rozbłysk Cudu w obrazie: 0,47 s po cięciu (najjaśniejsza klatka ujęcia)
const blyskCudu = u('S06').od + 0.47;
dodaj(blyskCudu, 'zassanie', 0.9, 1.1);
dodaj(blyskCudu, 'dzwon', 1.1);
dodaj(blyskCudu, 'boom', 0.75);
dodaj(blyskCudu, 'blask', 1.1, 3.5);
dodaj(czasTiku('S07', 12917), 'dzwon', 0.5);
dodaj(czasTiku('S07', 12917), 'blask', 0.5, 0.8);
for (let t = u('S08').od + 0.2; t < u('S08').od + u('S08').dl; t += 0.42) dodaj(t, 'stuk', 0.5);
for (let t = u('S09').od; t < u('S09').od + u('S09').dl; t += 0.11) dodaj(t, 'kilof', 0.25);
dodaj(u('S10').od, 'swistDol', 1.2, u('S10').dl);
dodaj(u('S11').od + 0.2, 'dzwonNisko', 1);
dodaj(u('S12').od, 'bulgot', 1, u('S12').dl);
dodaj(u('S12').od + 0.3, 'blask', 0.4, 2.5);
dodaj(u('S13').od, 'krata', 1, u('S13').dl);
for (const [id, tick] of [['S15', 54760], ['S18', 68950], ['S20', 84000]]) { const t = czasTiku(id, tick, true); dodaj(Math.max(u(id).od, t), 'trzask', 1.2); }
dodaj(u('S20').od + 0.2, 'ryk', 0.35, 2.4);
dodaj(u('S17').od, 'blask', 1, u('S17').dl);
dodaj(u('S17').od + 0.1, 'dzwon', 0.8);
// rozpad pomnika i wstawanie demona
dodaj(czasTiku('S23', 104270, true) ?? u('S23').od, 'trzask', 1.6);
dodaj(czasTiku('S24', 104660), 'ogien', 1.3, 1.6);
dodaj(czasTiku('S24', 104700), 'ryk', 1.2, 2.2);
dodaj(czasTiku('S25', 105110), 'swist', 1, 0.6);
dodaj(czasTiku('S27', 106600), 'swist', 1, 0.5);
dodaj(czasTiku('S28', 106769), 'swist', 1.2, 1.1);
dodaj(czasTiku('S28', 106836), 'boomMaly', 0.9);
dodaj(czasTiku('S30', 108740), 'lina', 1.2);
dodaj(u('S33').od + 0.05, 'ogien', 0.7, 1.4);
dodaj(czasTiku('S34', 109536), 'dudnienie', 0.7, 1.2);
// ostatni cios: wyskok rycerza, a w chwili ciosu złote światło (muzyka przechodzi w D-dur)
const cios = czasTiku('S35', 109858) ?? (T(42) + 0.9);
dodaj(czasTiku('S35', 109762), 'swist', 1.3, 0.8);
dodaj(cios, 'blaskDur', 1.2, 4);
// demona rozsadza złote światło (S36): zassanie do wybuchu, uderzenie, blask; potem rozpad w pył i dzwon nad pogorzeliskiem
const wybuch = czasTiku('S36', 110087);
dodaj(wybuch, 'zassanie', 1.4, 1.4);
dodaj(wybuch, 'boom', 1.8);
dodaj(wybuch, 'dzwonNisko', 1.2);
dodaj(wybuch, 'blaskDur', 1.5, 3);
dodaj(czasTiku('S36', 110150), 'trzask', 0.5);
dodaj(czasTiku('S36', 110270), 'dzwon', 0.8);
// wielkie uderzenia na cięciach (te, których nie gra już partytura)
const wPartyturze = [T(7), T(20), T(46)];
for (const t of MUZYKA.uderzenia) if (!wPartyturze.some((q) => Math.abs(q - t) < 0.01)) dodaj(t, 'boom', 0.9);

W.sort((a, b) => a.t - b.t);
console.log(`wskazówek: ${W.length}, ostatni cios: ${cios.toFixed(2)} s`);
fs.mkdirSync(path.join(KATALOG, 'wyjscie'), { recursive: true });
fs.writeFileSync(path.join(KATALOG, 'wyjscie', 'wskazowki.json'), JSON.stringify(W, null, 1));

// ---------------------------------------------------------------- synteza w przeglądarce
const { chromium } = playwright();
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[muzyka] błąd:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('[muzyka]', m.text()); });
await page.goto(new URL('trailer/muzyka.html', ADRES).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.__muzykaGotowa === true, null, { timeout: 60000 });
const dlugosc = DLUGOSC + 2.5;
const t0 = Date.now();
const n = await page.evaluate(async ({ W, dlugosc, cios }) => {
  const r = await window.Muzyka.zrob(W, dlugosc, cios);
  window.__audio = r;
  return r.L.length;
}, { W, dlugosc, cios });
console.log(`synteza: ${n} próbek w ${((Date.now() - t0) / 1000).toFixed(1)} s`);
// odbiór kawałkami (Int16, base64)
const kanaly = [new Int16Array(n), new Int16Array(n)];
let szczyt = 0;
const KAWAL = 1 << 20;
for (let od = 0; od < n; od += KAWAL) {
  const b64 = await page.evaluate(({ od, KAWAL }) => {
    const { L, P } = window.__audio;
    const dl = Math.min(KAWAL, L.length - od);
    const buf = new Int16Array(dl * 2);
    let szczyt = 0;
    for (let i = 0; i < dl; i++) {
      const l = L[od + i], p = P[od + i];
      szczyt = Math.max(szczyt, Math.abs(l), Math.abs(p));
      buf[i * 2] = Math.max(-32767, Math.min(32767, Math.round(l * 32767)));
      buf[i * 2 + 1] = Math.max(-32767, Math.min(32767, Math.round(p * 32767)));
    }
    let s = '';
    const u8 = new Uint8Array(buf.buffer);
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return JSON.stringify({ b: btoa(s), szczyt });
  }, { od, KAWAL });
  const { b, szczyt: s } = JSON.parse(b64);
  szczyt = Math.max(szczyt, s);
  const i16 = new Int16Array(Buffer.from(b, 'base64').buffer.slice(0));
  for (let i = 0; i < i16.length / 2; i++) { kanaly[0][od + i] = i16[i * 2]; kanaly[1][od + i] = i16[i * 2 + 1]; }
}
await browser.close();
console.log(`szczyt: ${szczyt.toFixed(3)}`);
// WAV
const sr = 48000, dane = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) { dane.writeInt16LE(kanaly[0][i], i * 4); dane.writeInt16LE(kanaly[1][i], i * 4 + 2); }
const naglowek = Buffer.alloc(44);
naglowek.write('RIFF', 0); naglowek.writeUInt32LE(36 + dane.length, 4); naglowek.write('WAVE', 8);
naglowek.write('fmt ', 12); naglowek.writeUInt32LE(16, 16); naglowek.writeUInt16LE(1, 20); naglowek.writeUInt16LE(2, 22);
naglowek.writeUInt32LE(sr, 24); naglowek.writeUInt32LE(sr * 4, 28); naglowek.writeUInt16LE(4, 32); naglowek.writeUInt16LE(16, 34);
naglowek.write('data', 36); naglowek.writeUInt32LE(dane.length, 40);
const wy = path.join(KATALOG, 'wyjscie', 'muzyka.wav');
fs.writeFileSync(wy, Buffer.concat([naglowek, dane]));
console.log('zapisano', wy);
