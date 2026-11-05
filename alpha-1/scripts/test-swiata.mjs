/**
 * Test generowania świata: w suchej strefie wokół przedsionka nie wolno mieć magmy,
 * wody ani kryształu — to jedyna droga, którą wierni schodzą do rytuału.
 * Alpha, etap 3d: ołtarz stoi w sali na kamiennym kopczyku, podłoga sali jest z kamienia, a z powierzchni
 * prowadzą do sali dwa otwory — szerszy nad ołtarzem (światło) i węższy, którym zjeżdża wiadro.
 * Alpha (jedno wiadro): pod wiadrem podłoga nie jest z kamienia — gracz pogłębia szyb, kopiąc pod nim.
 * Alpha, etap 3e: w środkowej warstwie 1–2 ruiny, w każdej zabytek na posadzce (pusty kafel, pod nim lita skała).
 *
 *   node scripts/test-swiata.mjs [ile światów]
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ILE = Number(process.argv[2] ?? 100);
const katalog = mkdtempSync(join(tmpdir(), 'trzewia-test-'));
const wejscie = join(katalog, 'wejscie.ts');
const wyjscie = join(katalog, 'wyjscie.mjs');

writeFileSync(wejscie, `
import { World } from ${JSON.stringify(join(process.cwd(), 'src/sim/world.ts'))};
import { T, PASSABLE } from ${JSON.stringify(join(process.cwd(), 'src/sim/tiles.ts'))};
import { SURFACE_Y } from ${JSON.stringify(join(process.cwd(), 'src/sim/world.ts'))};
import { SWIAT } from ${JSON.stringify(join(process.cwd(), 'src/nastawy/swiat.ts'))};

/** Etap 3d: czego brakuje ołtarzowi i otworom w tym świecie (pusta lista — wszystko w porządku). */
function bledyOltarza(w) {
  if (!SWIAT.warstwy.wlaczone) return [];
  const bledy = [];
  const o = w.oltarz;
  const wolny = (x, y) => PASSABLE[w.tile[w.idx(x, y)]] === 1;
  if (!wolny(o.x, o.y) || !wolny(o.x, o.y - 1)) bledy.push('ołtarz zamurowany');
  const O = SWIAT.warstwy.oltarz;
  for (let dx = -(O.kopczykSzer >> 1); dx <= O.kopczykSzer >> 1; dx++) {
    for (let dy = 1; dy <= O.kopczykGleb; dy++) if (w.tile[w.idx(o.x + dx, o.y + dy)] !== T.STONE) { bledy.push('kopczyk pod ołtarzem da się podkopać'); dx = 99; break; }
  }
  // podłoga sali: od ołtarza do wiadra — kamień pod stopami, wolno nad nimi (2 kafle); pod samym wiadrem
  // podłoga jest, ale da się ją wykopać (tak gracz sprowadza wiadro niżej)
  const podWiadrem = w.tile[w.idx(w.szybWiadraX, o.y + 1)];
  if (PASSABLE[podWiadrem] === 1 || podWiadrem === T.STONE || podWiadrem === T.CORE) bledy.push('pod wiadrem nie ma podłogi, którą da się wykopać');
  for (let x = Math.min(o.x, w.szybWiadraX); x <= Math.max(o.x, w.szybWiadraX); x++) {
    if (x !== w.szybWiadraX && w.tile[w.idx(x, o.y + 1)] !== T.STONE) { bledy.push('podłoga sali między ołtarzem a wiadrem nie jest z kamienia'); break; }
    if (!wolny(x, o.y) || !wolny(x, o.y - 1)) { bledy.push('droga od wiadra do ołtarza zagrodzona'); break; }
  }
  for (let y = SURFACE_Y - 1; y <= w.szybDol; y++) if (!wolny(w.szybX, y)) { bledy.push('szyb ze światłem zasypany'); break; }
  for (let y = SURFACE_Y - 1; y <= w.szybWiadraDol; y++) if (!wolny(w.szybWiadraX, y)) { bledy.push('otwór z wiadrem zasypany'); break; }
  if (Math.abs(w.szybWiadraX - w.szybX) < 3) bledy.push('wiadro zjeżdża na ołtarz');
  if (!wolny(w.szybWiadraX, w.szybWiadraDol + 1)) bledy.push('otwór z wiadrem nie wychodzi do sali');
  // etap 3e: ruiny z zabytkami
  const R = SWIAT.warstwy;
  if (w.ruiny.length < 1 || w.ruiny.length > 2) bledy.push('ruin: ' + w.ruiny.length);
  for (const r of w.ruiny) {
    const z = r.zabytek;
    if (!wolny(z.x, z.y) || wolny(z.x, z.y + 1)) bledy.push('zabytek nie leży na posadzce (' + z.x + ', ' + z.y + ')');
    if (z.y < w.h * R.plytkaDo - 4 || z.y > w.h * R.srodkowaDo + 4) bledy.push('ruina poza środkową warstwą (y ' + z.y + ')');
    if (w.wSali(z.x, z.y)) bledy.push('ruina w sali');
  }
  if (w.ruiny.length === 2 && w.ruiny[0].zabytek.typ === w.ruiny[1].zabytek.typ) bledy.push('dwa takie same zabytki');
  // droga wiernych (25.10): wnęka przy lewej ścianie sali pusta i połączona z salą, w szybie nic nie do ruszenia,
  // szyb sięga krypty (dolny rząd szybu to pustka nad jej podłogą)
  const s = w.szybDrogi;
  if (s.x1 < s.x0) bledy.push('brak szybu drogi wiernych');
  else {
    for (let y = s.y0; y <= w.salaOltarza.y1; y++) for (let x = s.x0; x <= s.x1 + 1; x++) if (!wolny(x, y)) { bledy.push('wnęka drogi wiernych zasypana (' + x + ', ' + y + ')'); y = 1e9; break; }
    for (let y = w.salaOltarza.y1 + 1; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) {
      const t = w.tile[w.idx(x, y)];
      if (t === T.STONE || t === T.CORE) { bledy.push('w szybie drogi wiernych kamień nie do ruszenia (' + x + ', ' + y + ')'); y = 1e9; break; }
    }
    for (let x = s.x0; x <= s.x1; x++) if (!wolny(x, s.y1) || wolny(x, s.y1 + 1)) { bledy.push('szyb drogi wiernych nie trafia w podłogę krypty (' + x + ')'); break; }
  }
  return bledy;
}

export function sprawdz(ile) {
  const zle = [];
  let magmaRazem = 0, wodaRazem = 0, krysztalRazem = 0;
  for (let s = 0; s < ile; s++) {
    const w = new World(s * 7919 + 13);
    for (let k = 0; k < 400; k++) w.tickFluids(k);   // ciecze mają czas spłynąć
    let magma = 0, woda = 0, krysztal = 0;
    for (let y = 0; y < w.h; y++) {
      for (let x = 0; x < w.w; x++) {
        if (!w.suchaStrefa(x, y)) continue;
        const i = w.idx(x, y);
        if (w.magma[i] > 0) magma++;
        if (w.water[i] > 0) woda++;
        if (w.tile[i] === T.CRYSTAL) krysztal++;
      }
    }
    magmaRazem += magma; wodaRazem += woda; krysztalRazem += krysztal;
    const oltarz = bledyOltarza(w);
    if (magma || woda || krysztal || oltarz.length) zle.push({ ziarno: s, magma, woda, krysztal, oltarz });
  }
  return { swiatow: ile, zlych: zle.length, zle: zle.slice(0, 8), magmaRazem, wodaRazem, krysztalRazem };
}
`);

await build({ entryPoints: [wejscie], outfile: wyjscie, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' });
const { sprawdz } = await import(pathToFileURL(wyjscie).href);
const wynik = sprawdz(ILE);
console.log(JSON.stringify(wynik, null, 2));
if (wynik.zlych > 0) {
  console.error(`\nZŁY ŚWIAT (zalany przedsionek albo ołtarz i otwory) w ${wynik.zlych} z ${ILE} światów.`);
  process.exit(1);
}
console.log(`\nOK: przedsionek suchy, ołtarz na kamiennym kopczyku, oba otwory, ruiny z zabytkami i szyb drogi wiernych w ${ILE} z ${ILE} światów.`);
