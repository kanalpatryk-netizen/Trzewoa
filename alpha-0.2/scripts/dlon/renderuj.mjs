/**
 * Renderuje arkusz klatek dłoni z otchłani (src/grafiki/dlon/dlon-z-otchlani.webp) z modelu 3D
 * w scripts/dlon/model.html: dłoń zbudowana z brył zlewających się w jedną (kości śródręcza,
 * ścięgna, żyły, stawy ze zmarszczkami, rogowe szpony), cieniowana promieniem (ray marching)
 * w WebGL — z cieniami, okluzją, fakturą skóry, czerwoną łuną otchłani zza dłoni i ciepłym światłem
 * lampek od strony palców.
 *
 *   node scripts/dlon/renderuj.mjs            (potrzebny Playwright z Chromium)
 *   node scripts/dlon/renderuj.mjs aniol      (etap 4: dłoń anielska — src/grafiki/dlon/dlon-anielska.webp)
 *   node scripts/dlon/renderuj.mjs rzut       (etap 5b: chwyt i rzut rycerzem — dlon-rzut.webp)
 *   node scripts/dlon/renderuj.mjs tarcza     (etap 5b: tarcza przed demonem, wnętrzem dłoni — dlon-tarcza.webp)
 *   node scripts/dlon/renderuj.mjs zawal      (etap 5b: szpony drą strop, płaskie uderzenie — dlon-zawal.webp)
 *
 * 10 klatek, każda renderowana 2× większa i zmniejszana (gładkie krawędzie), złożone w arkusz 2 × 5 po 792 × 360 px
 * i zapisane jako WebP (jakość 0,9). Zwykła dłoń: od otwartej do pięści. Etap 5b: każda akcja ma własne pozy palców
 * (KLATKI niżej) — żadna nie jest zaciskaniem pięści. Zmiana kadru albo liczby klatek wymaga tej samej zmiany
 * w ARKUSZ w src/render/dlon.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tu = path.dirname(fileURLToPath(import.meta.url));
const pw = await import(process.env.PLAYWRIGHT ?? 'playwright');
const chromium = pw.chromium ?? pw.default.chromium;
const KLATKI = 10, SZER = 792, WYS = 360, KOLUMNY = 2;
const TRYB = process.argv[2] ?? '';
const ANIOL = TRYB === 'aniol' ? 1 : 0;
/** Mnożnik rozdzielczości (próbny podgląd: PODGLAD=0.5). */
const SKALA = Number(process.env.PODGLAD ?? 1);

// ---------------------------------------------------------------- pozy etapu 5b
// p — palce wskazujący…mały, każdy [staw u nasady, środkowy, końcowy] (0 prosto, 1 zgięty, ujemne — przeprost);
// kc — kciuk; roz — rozstaw palców (mnożnik)
const palce = (a, b, c, d = [a, a, a, a]) => d.map((x, i) => [a + (i - 1.5) * 0.02, b + (i - 1.5) * 0.02, c]);
const P = {
  otwarta: { p: palce(0.05, 0.08, 0.05), kc: [0.05, 0.05, 0.05], roz: 1.1 },
  // rzut: dłoń obejmuje rycerza jak naczynie — palce łukiem dookoła, kciuk naprzeciw, w środku pusto
  naczynie: { p: palce(0.42, 0.62, 0.5), kc: [0.55, 0.45, 0.35], roz: 0.55 },
  trzyma: { p: palce(0.55, 0.76, 0.6), kc: [0.68, 0.55, 0.45], roz: 0.45 },
  // …i rozwiera się gwałtownie, palce odgięte do tyłu i rozczapierzone
  wyrzut: { p: palce(-0.28, -0.12, -0.05), kc: [-0.25, -0.15, -0.1], roz: 2.0 },
  // tarcza: wnętrzem dłoni do rycerza, palce wyprostowane jak mur i szeroko rozstawione
  luzna: { p: palce(0.3, 0.4, 0.3), kc: [0.3, 0.2, 0.2], roz: 0.8 },
  mur: { p: palce(-0.15, -0.06, 0), kc: [-0.2, -0.1, 0], roz: 2.1 },
  napina: { p: palce(-0.2, -0.1, -0.02), kc: [-0.25, -0.12, 0], roz: 2.3 },
  drgnie: { p: palce(0.1, 0.16, 0.1), kc: [0.02, 0.05, 0.05], roz: 1.7 },
  // zawał: szpony zakrzywione w hak (stawy u nasady proste, końcowe zgięte) — drą skałę; potem płaskie uderzenie
  rozwarta: { p: palce(0.0, 0.05, 0.05), kc: [0.1, 0.1, 0.1], roz: 1.3 },
  hak: { p: palce(-0.35, 1.0, 1.0), kc: [0.1, 0.5, 0.8], roz: 1.6 },
  drze: { p: palce(-0.2, 1.15, 1.1), kc: [0.2, 0.6, 0.9], roz: 1.35 },
  plaska: { p: palce(-0.05, -0.02, 0), kc: [-0.1, 0, 0], roz: 1.5 },
  uderza: { p: palce(-0.12, -0.04, 0), kc: [-0.15, 0, 0], roz: 1.75 },
};
const mieszaj = (a, b, t) => ({
  p: a.p.map((f, i) => f.map((x, j) => x + (b.p[i][j] - x) * t)),
  kc: a.kc.map((x, j) => x + (b.kc[j] - x) * t),
  roz: a.roz + (b.roz - a.roz) * t,
});
const KLATKI_5B = {
  rzut: { obrot: 0, pozy: [P.otwarta, mieszaj(P.otwarta, P.naczynie, 0.35), mieszaj(P.otwarta, P.naczynie, 0.7), P.naczynie,
    mieszaj(P.naczynie, P.trzyma, 0.5), P.trzyma, mieszaj(P.trzyma, P.wyrzut, 0.3), mieszaj(P.trzyma, P.wyrzut, 0.65), P.wyrzut,
    mieszaj(P.wyrzut, P.otwarta, 0.45)] },
  tarcza: { obrot: -2.24, pozy: [P.luzna, mieszaj(P.luzna, P.mur, 0.2), mieszaj(P.luzna, P.mur, 0.4), mieszaj(P.luzna, P.mur, 0.6),
    mieszaj(P.luzna, P.mur, 0.8), P.mur, P.napina, mieszaj(P.mur, P.drgnie, 0.5), P.drgnie, mieszaj(P.mur, P.napina, 0.5)] },
  zawal: { obrot: -2.0, pozy: [P.rozwarta, mieszaj(P.rozwarta, P.hak, 0.4), mieszaj(P.rozwarta, P.hak, 0.75), P.hak, mieszaj(P.hak, P.drze, 0.5),
    P.drze, mieszaj(P.drze, P.plaska, 0.35), mieszaj(P.drze, P.plaska, 0.7), P.plaska, P.uderza] },
};
const def = KLATKI_5B[TRYB] ?? null;

const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('file://' + path.join(tu, 'model.html'));
await p.waitForFunction(() => window.gotowe === true, null, { timeout: 120000 });
const url = await p.evaluate(async ([KLATKI, SZER, WYS, KOLUMNY, ANIOL, def, SKALA]) => {
  const arkusz = document.createElement('canvas');
  arkusz.width = SZER * KOLUMNY * SKALA; arkusz.height = WYS * Math.ceil(KLATKI / KOLUMNY) * SKALA;
  const g = arkusz.getContext('2d');
  g.imageSmoothingQuality = 'high';
  for (let k = 0; k < KLATKI; k++) {
    const img = new Image();
    img.src = def
      ? window.renderuj(0, SZER * 2 * SKALA, WYS * 2 * SKALA, [-17, 27, -11, 9], 1, 0, def.pozy[k], def.obrot)
      : window.renderuj(k / (KLATKI - 1), SZER * 2 * SKALA, WYS * 2 * SKALA, [-17, 27, -11, 9], 1, ANIOL);
    await img.decode();
    g.drawImage(img, (k % KOLUMNY) * SZER * SKALA, Math.floor(k / KOLUMNY) * WYS * SKALA, SZER * SKALA, WYS * SKALA);
  }
  return arkusz.toDataURL('image/webp', 0.9);
}, [KLATKI, SZER, WYS, KOLUMNY, ANIOL, def, SKALA]);
const nazwa = def ? `dlon-${TRYB}.webp` : ANIOL ? 'dlon-anielska.webp' : 'dlon-z-otchlani.webp';
const cel = process.env.WYJSCIE ?? path.join(tu, '../../src/grafiki/dlon', nazwa);
fs.writeFileSync(cel, Buffer.from(url.split(',')[1], 'base64'));
console.log('zapisano', cel, fs.statSync(cel).size, 'B');
await b.close();
