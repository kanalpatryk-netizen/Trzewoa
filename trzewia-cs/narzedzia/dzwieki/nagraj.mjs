// Cały dźwięk gry jako pliki MP3 w trzewia-cs/dane/dzwieki/ (decyzja użytkownika 15.11: „nie chcę już, żeby dźwięk był
// ładowany skryptami”): nagrania głosów (nazwane i poukładane) i wszystko, co gra TS składała w locie — nagrane jej
// własnym kodem (dzwieki.ts w Chromium, OfflineAudioContext). Do tego SPIS.md i spis.json: co gra kiedy i jak.
//   node narzedzia/dzwieki/nagraj.mjs        (potrzebny ffmpeg z libmp3lame)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zbuduj, otworz, ALPHA } from '../duszki/paczka.mjs';

const TU = path.dirname(fileURLToPath(import.meta.url));
const CEL = path.resolve(TU, '../../dane/dzwieki');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'trzewia-dzwieki-'));
const spis = [];

fs.rmSync(CEL, { recursive: true, force: true });
fs.mkdirSync(CEL, { recursive: true });

function mp3(wynik, sciezka) {
  const wav = path.join(TMP, 'x.wav');
  fs.writeFileSync(wav, Buffer.from(wynik.wav, 'base64'));
  const cel = path.join(CEL, sciezka);
  fs.mkdirSync(path.dirname(cel), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-q:a', '2', cel]);
}

const s = await otworz(await zbuduj(path.join(TU, 'dzwieki.ts')));
let licznik = 0;
async function nagraj(sciezka, funkcja, args, opis) {
  const w = await s.wolaj(funkcja, ...args);
  if (!w) { console.warn(`pomijam (cisza): ${sciezka}`); return null; }
  mp3(w, sciezka);
  spis.push({ plik: sciezka, sekundy: +w.sekundy.toFixed(2), szczytDb: +(20 * Math.log10(w.szczyt || 1e-9)).toFixed(1), ...opis });
  if (++licznik % 20 === 0) console.log(`${licznik} plików…`);
  return w;
}
const nr = (i) => String(i).padStart(2, '0');
const proc = (x) => String(Math.round(x * 100)).padStart(3, '0');

// ======================================================================= głosy: nagrania (bez zmian) i gotowe do grania
const ZRODLA = path.join(ALPHA, 'gra222/dzwieki');
const KONCOWKI = { R: 'rycerz', P: 'pobozny' };
const RZADKOSC_RYCERZA = [
  ['pospolita', ['02', '04', '06', '08']], ['rzadsza', ['10', '12', '14']],
  ['bardzo-rzadka', ['15', '17', '19']], ['ekstremalnie-rzadka', ['20']],
];
const glosy = [];   // { zrodlo, nazwa (rola/plik), rodzaj, kto, uzywane, opis }
const numer = (f) => +(/(\d+)\.mp3$/.exec(f)?.[1] ?? 0);
// odmowy rycerza — według grup rzadkości (nastawy GLOS_RYCERZA)
{
  const pliki = fs.readdirSync(path.join(ZRODLA, 'odmowy/rycerz')).filter((f) => f.endsWith('.mp3'));
  for (const [grupa, numery] of RZADKOSC_RYCERZA) {
    numery.forEach((n, i) => {
      const f = pliki.find((p) => p.endsWith(`_part-${n}.mp3`));
      if (f) glosy.push({ zrodlo: `odmowy/rycerz/${f}`, nazwa: `rycerz/odmowa-${grupa}-${nr(i + 1)}.mp3`, rodzaj: 'odmowa', kto: 'rycerz', uzywane: true,
        opis: `odmowa rycerza na głos (${grupa.replace('-', ' ')})` });
    });
  }
}
for (const [i, f] of fs.readdirSync(path.join(ZRODLA, 'odmowy/pobozny')).filter((f) => f.endsWith('.mp3')).sort((a, b) => numer(a) - numer(b)).entries()) {
  glosy.push({ zrodlo: `odmowy/pobozny/${f}`, nazwa: `pobozny/odmowa-${nr(i + 1)}.mp3`, rodzaj: 'odmowa', kto: 'pobozny', uzywane: true, opis: 'odmowa pobożnego na głos' });
}
for (const folder of fs.readdirSync(path.join(ZRODLA, 'jednostki')).sort()) {
  const [, kwestia, litera] = /^(.*?)([A-Z]*)$/.exec(folder);
  const kto = KONCOWKI[litera];
  const pliki = fs.readdirSync(path.join(ZRODLA, 'jednostki', folder)).filter((f) => f.endsWith('.mp3'));
  const zwykle = pliki.filter((f) => !f.startsWith('rzadkie')).sort((a, b) => numer(a) - numer(b));
  const uzywane = folder !== 'atakP';
  zwykle.forEach((f, i) => glosy.push({ zrodlo: `jednostki/${folder}/${f}`, nazwa: `${kto}/${kwestia}-${nr(i + 1)}.mp3`, rodzaj: 'ludu', kto, uzywane,
    opis: `${kwestia} (${kto})${uzywane ? '' : ' — w grze TS pominięte (nastawy GLOSY_LUDU.pomin)'}` }));
  for (const f of pliki.filter((f) => f.startsWith('rzadkie'))) glosy.push({ zrodlo: `jednostki/${folder}/${f}`, nazwa: `${kto}/${kwestia}-rzadkie.mp3`, rodzaj: 'ludu', kto, uzywane,
    opis: `${kwestia} (${kto}), rzadkie — szansa 0,5% przy każdym razie` });
}
for (const g of glosy) {
  const cel = path.join(CEL, 'nagrania', g.nazwa);
  fs.mkdirSync(path.dirname(cel), { recursive: true });
  fs.copyFileSync(path.join(ZRODLA, g.zrodlo), cel);
  spis.push({ plik: `nagrania/${g.nazwa}`, grupa: 'nagrania', zrodlo: `alpha-1/gra222/dzwieki/${g.zrodlo}`, kiedy: g.opis, uwagi: 'oryginał bez zmian' });
  if (!g.uzywane) continue;
  const url = `data:audio/mpeg;base64,${fs.readFileSync(path.join(ZRODLA, g.zrodlo)).toString('base64')}`;
  const mowa = await s.wolaj('mowa', url, g.nazwa, g.rodzaj, g.kto);
  await nagraj(`glosy/${g.nazwa}`, 'glos', [url, g.nazwa, g.rodzaj, g.kto], {
    mowaSekundy: mowa === null ? null : +mowa.toFixed(3),
    grupa: 'glosy', zrodlo: `nagrania/${g.nazwa}`, kiedy: g.opis,
    uwagi: g.rodzaj === 'odmowa'
      ? 'po głuchym stuku odmowy, z opóźnieniem 0,12 s; najwyżej co 500 ms; mówi jeden naraz (waga 2)'
      : ({ potwierdzenie: 'po rozkazie, z opóźnieniem 0,06 s, najwyżej co 1,5 s (waga 2)', atak: 'okrzyk do walki (waga 3)', bol: 'ból, rana, śmierć (waga 4 — ucina inne)', glod: 'marudzenie z głodu (waga 1)' }[g.nazwa.split('/')[1].split('-')[0]] ?? ''),
  });
}
console.log(`głosy: ${glosy.length} nagrań`);

// ======================================================================= gesty gracza (core/gesty.ts)
const G = (nazwa, plik, args, kiedy, uwagi = '', ile = 1) => ({ nazwa, plik, args, kiedy, uwagi, ile });
const GESTY = [
  G('klik', 'gesty/klik', [], 'wybór rytu, narzędzia, przycisku, pozycji', 'najwyżej co 60 ms'),
  G('szkic', 'gesty/szkic', [], 'rozkaz naszkicowany w pauzie (rylec po miedzi)', 'najwyżej co 85 ms; wariant losowy', 5),
  G('skresl', 'gesty/skreslenie', [false], 'szkic skreślony', 'najwyżej co 90 ms', 2),
  G('skresl', 'gesty/skreslenie-wszystkiego', [true], 'cały plan skreślony', '', 2),
  G('odmowa', 'gesty/odmowa', [], 'rozkaz się nie udał (głuchy stuk w skałę)', 'najwyżej co 280 ms', 2),
  G('pauza', 'gesty/czas-staje', [true], 'pauza: czas staje (kamień osiada)', 'potem ton pauzy (pętla); przy pauzie z alarmu bez tego uderzenia', 2),
  G('pauza', 'gesty/czas-rusza', [false], 'pauza puszczona: czas rusza', 'ton pauzy gaśnie (stała 0,15 s)', 2),
  G('alarm', 'gesty/alarm-kryzys', [true], 'karta sytuacji — kryzys (dwa dzwony o pół tonu)', 'przycisza świat i muzykę do 35% na 2,6 s'),
  G('alarm', 'gesty/alarm-wydarzenie', [false], 'karta sytuacji — wydarzenie (czysta kwinta)', 'przycisza świat i muzykę do 55% na 1,6 s'),
  G('kartka', 'gesty/kartka', [], 'kartka atlasu (szelest)', 'najwyżej co 150 ms', 4),
  G('tablica', 'gesty/nowa-tablica', [], 'nowa tablica w atlasie: kartka i dwa dzwonki', '', 2),
  G('pekniecie', 'zdarzenia/pekniecie-pomnika', [], 'Wielki Pomnik pęka', '', 2),
  G('rozpadPomnika', 'zdarzenia/rozpad-pomnika', [], 'pomnik rozpada się w gruz', 'przycisza świat i muzykę do 50% na 3 s', 3),
  G('ostatnieUderzenie', 'zdarzenia/ostatnie-uderzenie', [], 'ostatnie uderzenie w demona', 'przycisza świat i muzykę do 30% na 5 s'),
  G('dlonWyrasta', 'zdarzenia/dlon-wyrasta-z-podlogi', [false], 'dłoń z otchłani wyrasta z podłogi', '', 2),
  G('dlonWyrasta', 'zdarzenia/dlon-wyrasta-ze-stropu', [true], 'dłoń wyrasta ze stropu', '', 2),
  G('rzutDloni', 'zdarzenia/rzut-dloni', [], 'dłoń ciska rycerzem w górę (świst)', '', 2),
  G('upadek', 'zdarzenia/upadek', [], 'ciśnięty spada na ziemię', 'najwyżej co 300 ms', 2),
  G('odbicieOdDloni', 'zdarzenia/odbicie-od-dloni', [], 'cios odbija się od tarczy z dłoni', 'najwyżej co 200 ms', 2),
  G('zawalStropu', 'zdarzenia/zawal-stropu', [], 'dłoń drze strop — lawina kamieni', 'przycisza świat i muzykę do 60% na 2 s', 3),
];
for (const g of GESTY) {
  for (let i = 1; i <= g.ile; i++) {
    await nagraj(`${g.plik}${g.ile > 1 ? `-${i}` : ''}.mp3`, 'gest', [g.nazwa, g.args], { grupa: g.plik.startsWith('zdarzenia/') ? 'zdarzenia' : 'gesty', kiedy: g.kiedy, uwagi: g.uwagi });
  }
}
await nagraj('gesty/ton-pauzy-petla.mp3', 'tonPauzyPetla', [], { grupa: 'gesty', petla: true, kiedy: 'czas stoi (pauza): ton zawieszenia, kwinta D–A wysoko',
  uwagi: 'wchodzi po 0,4 s ze stałą 1,4 s (do pełna ok. 4 s), gaśnie ze stałą 0,15 s, gdy czas rusza' });
for (let u = 0; u <= 8; u++) for (let n = 0; n <= 3; n++) {
  if (!u && !n) continue;
  await nagraj(`gesty/wykonanie/udane-${u}-nieudane-${n}.mp3`, 'gest', ['wykonanie', [u, n]], { grupa: 'gesty',
    kiedy: `plan z pauzy wykonany: ${u} rozkazów udanych, ${n} nieudanych (kaskada stuków w górę i dzwon)`,
    uwagi: 'więcej niż 8 udanych gra jak 8, więcej niż 3 nieudane — jak 3; także zaliczony krok samouczka (3, 0)' });
}
console.log('gesty gotowe');

// ======================================================================= świat — rezonans (core/audio.ts)
const SW = [
  ['wiadro', 'swiat/wiadro', [], 'wiadro z jedzeniem wyłania się ze stropu (skrzyp kołowrotu, stuk drewna)', 3],
  ['kruszec', 'swiat/kruszec-zelazo', [false], 'okruch żelaza wpada do licznika', 1],
  ['kruszec', 'swiat/kruszec-zloto', [true], 'okruch złota wpada do licznika', 1],
  ['kropla', 'swiat/kropla', [], 'kropla krwi wpada do misy albo do licznika', 1],
  ['zawal', 'swiat/zawal', [], 'góra zawala się nad ludem (łoskot)', 3],
  ['toll', 'swiat/cud', [], 'Cud — uderzenie w skałę (trzy stuki)', 1],
];
for (const [nazwa, plik, args, kiedy, ile] of SW) {
  for (let i = 1; i <= ile; i++) await nagraj(`${plik}${ile > 1 ? `-${i}` : ''}.mp3`, 'swiat', [nazwa, args], { grupa: 'swiat', kiedy });
}
for (const faza of ['start', 'koniec', 'przerwany']) for (const krwi of [false, true]) {
  await nagraj(`swiat/rytual/${faza}-${krwi ? 'krwi' : 'zwykly'}.mp3`, 'swiat', ['rytual', [faza, krwi]], { grupa: 'swiat',
    kiedy: `rytuał przy ołtarzu — ${faza}${krwi ? ' (rytuał krwi: niżej, mała tercja)' : ''}` });
}
for (let hz = 100; hz <= 250; hz += 10) {
  await nagraj(`swiat/kucie/stuk-${hz}hz.mp3`, 'stuk', [hz], { grupa: 'swiat',
    kiedy: 'rytm pracy: stuk kilofa (Resonance.knock)',
    uwagi: 'w grze wysokość 160–250 Hz minus głębokość × 60, losowo; głośność (0,05 + praca × 0,06) / 0,11 tego pliku; panorama losowa ±0,6; odstęp (0,9 − min(0,75; praca × 0,8)) × 0,7–1,3 s; w pauzie milknie' });
}
for (const glebia of [0, 0.25, 0.5, 0.75, 1]) for (const glod of [0, 0.5, 1]) {
  await nagraj(`swiat/dudnienie/glebokosc-${proc(glebia)}-glod-${proc(glod)}-petla.mp3`, 'warstwa', ['dudnienie', glebia, 0.5, 0, glod], { grupa: 'swiat', petla: true,
    kiedy: `rezonans skały: dudnienie przy głębokości widoku ${Math.round(glebia * 100)}% i głodzie ${Math.round(glod * 100)}% (oddech skały szybszy z głodem)`,
    uwagi: 'gra przenika między najbliższymi plikami; życie w górze przyjęte 50%; przy wyłączonych odgłosach — cisza' });
}
await nagraj('swiat/szum-korytarzy-petla.mp3', 'warstwa', ['szum', 0.5, 1, 0, 0], { grupa: 'swiat', petla: true,
  kiedy: 'szum powietrza w korytarzach', uwagi: 'nagrany przy życiu 100% (poziom 0,15); w grze głośność (0,03 + życie × 0,12) / 0,15, w pauzie × 0,4' });
for (const wiara of [0.25, 0.5, 0.75, 1]) {
  await nagraj(`swiat/modlitwa/wiara-${proc(wiara)}-petla.mp3`, 'warstwa', ['modlitwa', 0.5, 0.5, wiara, 0], { grupa: 'swiat', petla: true,
    kiedy: `szum modlitwy przy wierze ${Math.round(wiara * 100)}% (pasmo i głośność rosną z wiarą)`, uwagi: 'gra przenika między najbliższymi; w pauzie × 0,3; przy wierze 0 — cisza' });
}
console.log('świat gotowy');

// ======================================================================= muzyka (core/music.ts)
const SKALA = [0, 1, 3, 5, 7, 8, 10], BAZA = 146.83;
const hz = (st) => {
  const ok = Math.floor(st / SKALA.length), i = ((st % SKALA.length) + SKALA.length) % SKALA.length;
  return BAZA * Math.pow(2, (SKALA[i] + ok * 12) / 12);
};
const AKORDY = [['menu', [0]], ['samouczek', [0, 0.5, 1]], ['gra', [0, 0.25, 0.5, 0.75, 1]], ['koniec', [0.2]]];
for (const [scena, napiecia] of AKORDY) for (const n of napiecia) {
  await nagraj(`muzyka/akordy/${scena}-napiecie-${proc(n)}-petla.mp3`, 'akordy', [scena, n], { grupa: 'muzyka', petla: true,
    kiedy: `akordy kamienia: scena „${scena}”, napięcie ${Math.round(n * 100)}% — cały obieg progresji`,
    uwagi: scena === 'gra' ? 'napięcie skraca akordy (13 → 9 s) i otwiera filtr — gra przenika między najbliższymi' : 'przy zmianie sceny stary akord gaśnie szybciej (do 30%), nowy wchodzi po 1,6 s' });
}
const PROGRESJE = { menu: [[0, 2, 4], [0, 3, 5], [-2, 1, 3], [0, 2, 5]], samouczek: [[0, 2, 4], [1, 3, 5], [-1, 2, 4]], gra: [[0, 2, 4], [-2, 0, 3], [1, 3, 5], [0, 2, 6], [-3, -1, 2]], koniec: [[0, 3, 5], [-2, 1, 3]] };
const stopnie = [...new Set(Object.values(PROGRESJE).flat(2))].sort((a, b) => a - b);
for (const st of stopnie) {
  await nagraj(`muzyka/dzwony/stopien-${st + 7}.mp3`, 'dzwon', [hz(st + 7), 0.12, 4.5], { grupa: 'muzyka',
    kiedy: `dzwon nad akordem: stopień ${st + 7} skali (${hz(st + 7).toFixed(1)} Hz)`,
    uwagi: 'co 6 s w grze, 9 s w menu (+ do 7 s losowo, − napięcie × 3, najmniej 2,5 s); stopień losowy z bieżącego akordu + 7; głośność ×1–1,5 losowo; panorama losowa ±0,55; w scenie „koniec” co drugi' });
}
await nagraj('muzyka/dzwony/zejscie-do-gory.mp3', 'dzwon', [hz(-7), 0.2, 7], { grupa: 'muzyka', kiedy: 'z menu do gry albo samouczka: jedno niskie uderzenie' });
await nagraj('muzyka/dzwony/koniec.mp3', 'dzwon', [hz(-4), 0.14, 6], { grupa: 'muzyka', kiedy: 'wejście w kronikę końca' });
await nagraj('muzyka/niepokoj/pomruk-petla.mp3', 'niepokojStaly', ['pomruk', 0.105], { grupa: 'muzyka', petla: true,
  kiedy: 'pomruk za ścianą — gra bez przerwy pod muzyką',
  uwagi: 'nagrany przy poziomie 0,105 (gra przy napięciu 100%); w grze: menu 0,05, gra 0,045 + napięcie × 0,06, koniec 0,063 — czyli głośność pliku × poziom / 0,105 (zmiana ze stałą 2,5 s)' });
await nagraj('muzyka/niepokoj/pisk-petla.mp3', 'niepokojStaly', ['pisk', 0.0035], { grupa: 'muzyka', petla: true,
  kiedy: 'pisk w uszach — tylko w grze przy napięciu > 45%',
  uwagi: 'nagrany przy poziomie 0,0035 (napięcie 100%); w grze głośność pliku × (napięcie − 0,45) / 0,55 (stała 4 s)' });
const NP = [
  ['oddech', 'oddech', [], 6, 'oddech góry (szum, pasmo w dół przy wydechu)', 'co 11–20 s × (1 − napięcie × 0,55); głośność ×(0,7 + napięcie × 0,8) / 0,7 względem pliku'],
  ['trzask', 'trzask', [], 10, 'trzask skały w głębi', '1–3 naraz co 0,08–0,33 s; co 7–21 s × (1 − napięcie × 0,55)'],
  ['chor', 'chor', [], 12, 'chór bez słów (jeden głos fałszuje o pół tonu), przechodzi z boku na bok', 'co 38–68 s × (1 − napięcie × 0,55), nie w samouczku; głośność ×(0,8 + napięcie × 0,9) / 0,8 względem pliku'],
  ['szept', 'szept-z-lewej', [-1], 4, 'szept z ciemności z lewej (przy dłoni z otchłani)', ''],
  ['szept', 'szept-z-prawej', [1], 4, 'szept z ciemności z prawej', ''],
  ['otchlan', 'otchlan', [], 3, 'otchłań otwiera oczy: narastający pomruk i szept', ''],
  ['zabranie', 'zabranie', [], 3, 'ktoś poszedł w ciemność: głuche uderzenie i szept z obu stron', ''],
];
for (const [nazwa, plik, args, ile, kiedy, uwagi] of NP) {
  for (let i = 1; i <= ile; i++) await nagraj(`muzyka/niepokoj/${plik}-${i}.mp3`, 'niepokoj', [nazwa, args, 0], { grupa: 'muzyka', kiedy, uwagi });
}
await s.zamknij();
fs.rmSync(TMP, { recursive: true, force: true });

// ======================================================================= spis
fs.writeFileSync(path.join(CEL, 'spis.json'), JSON.stringify(spis, null, 1));
const GRUPY = {
  nagrania: 'Nagrania głosów — oryginały bez zmian (z `alpha-1/gra222/dzwieki/`), tylko nazwane i poukładane według roli',
  glosy: 'Głosy gotowe do grania — te same nagrania tak, jak brzmią w grze: przycięte do mowy, wyrównane do jednej głośności, pobożny o 1,5 półtonu niżej, z pogłosem jaskini',
  gesty: 'Gesty gracza (core/gesty.ts)',
  zdarzenia: 'Zdarzenia walki o wolność — pomnik, demon, dłoń (core/gesty.ts, etap 5)',
  swiat: 'Świat — rezonans skały (core/audio.ts)',
  muzyka: 'Muzyka i niepokój (core/music.ts)',
};
let md = `# Dźwięki gry\n\nWszystko, co gra Trzewia (alpha-1), jako pliki MP3 — wygenerowane ${new Date().toISOString().slice(0, 10)} przez ` +
  '`narzedzia/dzwieki/nagraj.mjs`. Dźwięki, które gra TS składała w locie (syntezą w przeglądarce), są nagrane jej własnym kodem ' +
  'przez ten sam tor co w grze (pogłos jaskini, wzmocnienie ×1,6, ogranicznik), przy głośności 1 — suwak głośności i przełączniki ' +
  'w ustawieniach stosuje gra. Pliki z `-petla` w nazwie grają w kółko bez szwu. Pliki z numerem na końcu (`-1`, `-2`…) to warianty ' +
  'tego samego dźwięku — w TS każde odtworzenie było trochę inne, więc gra losuje jeden z nich.\n\n' +
  `Razem: ${spis.length} plików.\n`;
for (const [grupa, tytul] of Object.entries(GRUPY)) {
  const lista = spis.filter((x) => x.grupa === grupa);
  md += `\n## ${tytul}\n\n| Plik | Kiedy gra | Uwagi |\n|---|---|---|\n`;
  for (const x of lista) {
    const uwagi = [x.petla ? 'pętla' : '', x.uwagi ?? '', x.zrodlo && grupa !== 'nagrania' ? `z \`${x.zrodlo}\`` : '', grupa === 'nagrania' ? `z \`${x.zrodlo}\`` : '', x.sekundy ? `${x.sekundy} s` : ''].filter(Boolean).join('; ');
    md += `| \`${x.plik}\` | ${x.kiedy} | ${uwagi} |\n`;
  }
}
fs.writeFileSync(path.join(CEL, 'SPIS.md'), md);
console.log(`gotowe: ${spis.length} plików w ${CEL}`);
