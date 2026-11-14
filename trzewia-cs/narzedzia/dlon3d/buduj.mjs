// Buduje modele 3D dłoni (dłoń z otchłani / demona i dłoń anielska) z oryginalnego modelu gry TS
// (alpha-1/scripts/dlon/model.html) i zapisuje je jako glTF 2.0 w jednym pliku (.glb):
//
//   node narzedzia/dlon3d/buduj.mjs            → dane/grafika/modele/dlon-z-otchlani.glb, dlon-anielska.glb
//
// W pliku: siatka skóry (wagi do 16 kości) i pazurów (sztywno przy ostatnich członach palców), szkielet
// (dłoń + 5 palców × 3 kości), animacje: „zacisk” (otwarta → pięść; czas 0..1 s = zacisk 0..1) oraz — dłoń demona —
// „rzut”, „tarcza”, „zawal” (10 póz z alpha-1/scripts/dlon/renderuj.mjs, klatka k w chwili k/9 s; obrót całej dłoni
// jest w kości „dlon”). Barwa skóry jest w barwach wierzchołków (COLOR_0, liniowo; A — zanik ramienia ku łokciowi),
// TEXCOORD_0 = (okluzja, wklęsłość), TEXCOORD_1 = (wnętrze dłoni 0..1 — skóra / miejsce na szponie 0..1 — pazury, 0).
// Jednostki: jednostki modelu (nadgarstek w (0,0,0), palce w +x, grzbiet dłoni w +y, kciuk po stronie −z).
// Siatkę i resztę liczy strona.js w Chromium (tam jest shader modelu); tutaj tylko zapis pliku.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium, ALPHA } from '../duszki/paczka.mjs';

const TU = path.dirname(fileURLToPath(import.meta.url));
const CEL = process.env.CEL ?? path.resolve(TU, '../../dane/grafika/modele');

// pozy etapu 5b: wprost z renderuj.mjs (od „const palce” do „const def”), żeby nie rozjechały się z oryginałem
function pozy5b() {
  const kod = fs.readFileSync(path.join(ALPHA, 'scripts/dlon/renderuj.mjs'), 'utf8');
  const a = kod.indexOf('const palce ='), b = kod.indexOf('const def =');
  if (a < 0 || b < 0) throw new Error('renderuj.mjs się zmienił — nie ma tabeli póz');
  return new Function(kod.slice(a, b) + '\nreturn KLATKI_5B;')();
}

// ---------------------------------------------------------------------------------------------- zapis glb
const FLOAT = 5126, USHORT = 5123, UBYTE = 5121, UINT = 5125;
class Glb {
  constructor() {
    this.czesci = []; this.dlugosc = 0;
    this.json = { asset: { version: '2.0', generator: 'Trzewia — narzedzia/dlon3d' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [],
      skins: [], animations: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }] };
  }
  akcesor(dane, typ, skladowa, opcje = {}) {
    const bajty = Buffer.from(dane.buffer, dane.byteOffset, dane.byteLength);
    const dopelnienie = (4 - (this.dlugosc % 4)) % 4;
    if (dopelnienie) { this.czesci.push(Buffer.alloc(dopelnienie)); this.dlugosc += dopelnienie; }
    const widok = { buffer: 0, byteOffset: this.dlugosc, byteLength: bajty.length };
    if (opcje.cel) widok.target = opcje.cel;
    this.czesci.push(bajty); this.dlugosc += bajty.length;
    this.json.bufferViews.push(widok);
    const ile = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[typ];
    const a = { bufferView: this.json.bufferViews.length - 1, componentType: skladowa, count: dane.length / ile, type: typ };
    if (opcje.znormalizowane) a.normalized = true;
    if (opcje.minmax) {
      a.min = new Array(ile).fill(Infinity); a.max = new Array(ile).fill(-Infinity);
      for (let i = 0; i < dane.length; i++) { const k = i % ile; a.min[k] = Math.min(a.min[k], dane[i]); a.max[k] = Math.max(a.max[k], dane[i]); }
    }
    this.json.accessors.push(a);
    return this.json.accessors.length - 1;
  }
  bajty() {
    this.json.buffers[0].byteLength = this.dlugosc;
    let j = Buffer.from(JSON.stringify(this.json), 'utf8');
    if (j.length % 4) j = Buffer.concat([j, Buffer.alloc(4 - (j.length % 4), 0x20)]);
    let b = Buffer.concat(this.czesci);
    if (b.length % 4) b = Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]);
    const glowa = Buffer.alloc(12);
    glowa.writeUInt32LE(0x46546c67, 0); glowa.writeUInt32LE(2, 4); glowa.writeUInt32LE(12 + 8 + j.length + 8 + b.length, 8);
    const gj = Buffer.alloc(8); gj.writeUInt32LE(j.length, 0); gj.writeUInt32LE(0x4e4f534a, 4);
    const gb = Buffer.alloc(8); gb.writeUInt32LE(b.length, 0); gb.writeUInt32LE(0x004e4942, 4);
    return Buffer.concat([glowa, gj, j, gb, b]);
  }
}

const zB64 = (s, Typ) => { const b = Buffer.from(s, 'base64'); return new Typ(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const gladki = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function siatka(s) {
  const m = { wierz: zB64(s.wierz, Float32Array), troj: zB64(s.troj, Uint32Array), normalne: zB64(s.normalne, Float32Array),
    barwa: zB64(s.barwa, Float32Array), okluzja: zB64(s.okluzja, Float32Array) };
  const n = m.wierz.length / 3;
  if (s.kosci) { m.kosci = zB64(s.kosci, Uint8Array); m.wagi = zB64(s.wagi, Float32Array); }
  else { m.kosci = new Uint8Array(n * 4); m.wagi = new Float32Array(n * 4); for (let i = 0; i < n; i++) { m.kosci[i * 4] = s.kosc; m.wagi[i * 4] = 1; } }
  return m;
}
function polacz(siatki) {
  const n = siatki.reduce((a, s) => a + s.wierz.length / 3, 0), t = siatki.reduce((a, s) => a + s.troj.length, 0);
  const w = { wierz: new Float32Array(n * 3), normalne: new Float32Array(n * 3), barwa: new Float32Array(n * 4), okluzja: new Float32Array(n * 4),
    kosci: new Uint8Array(n * 4), wagi: new Float32Array(n * 4), troj: new Uint32Array(t) };
  let ov = 0, ot = 0;
  for (const s of siatki) {
    w.wierz.set(s.wierz, ov * 3); w.normalne.set(s.normalne, ov * 3); w.barwa.set(s.barwa, ov * 4); w.okluzja.set(s.okluzja, ov * 4);
    w.kosci.set(s.kosci, ov * 4); w.wagi.set(s.wagi, ov * 4);
    for (let i = 0; i < s.troj.length; i++) w.troj[ot + i] = s.troj[i] + ov;
    ov += s.wierz.length / 3; ot += s.troj.length;
  }
  return w;
}

function zapisz(plik, m, aniol) {
  const g = new Glb();
  const prymityw = (s, material) => {
    const n = s.wierz.length / 3;
    const barwa = new Uint16Array(n * 4), uv0 = new Float32Array(n * 2), uv1 = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) barwa[i * 4 + k] = Math.round(Math.max(0, Math.min(1, s.barwa[i * 4 + k])) * 65535);
      // zanik ramienia ku łokciowi — jak w main() modelu (anielska: −17,5…−7,5; z otchłani: −17,5…−6,5)
      barwa[i * 4 + 3] = Math.round(gladki(-17.5, aniol ? -7.5 : -6.5, s.wierz[i * 3]) * 65535);
      uv0[i * 2] = s.okluzja[i * 4]; uv0[i * 2 + 1] = s.okluzja[i * 4 + 1];
      uv1[i * 2] = s.barwa[i * 4 + 3];
    }
    return {
      attributes: {
        POSITION: g.akcesor(s.wierz, 'VEC3', FLOAT, { cel: 34962, minmax: true }),
        NORMAL: g.akcesor(s.normalne, 'VEC3', FLOAT, { cel: 34962 }),
        COLOR_0: g.akcesor(barwa, 'VEC4', USHORT, { cel: 34962, znormalizowane: true }),
        TEXCOORD_0: g.akcesor(uv0, 'VEC2', FLOAT, { cel: 34962 }),
        TEXCOORD_1: g.akcesor(uv1, 'VEC2', FLOAT, { cel: 34962 }),
        JOINTS_0: g.akcesor(s.kosci, 'VEC4', UBYTE, { cel: 34962 }),
        WEIGHTS_0: g.akcesor(s.wagi, 'VEC4', FLOAT, { cel: 34962 }),
      },
      indices: g.akcesor(s.troj, 'SCALAR', UINT, { cel: 34963 }),
      material, mode: 4,
    };
  };
  g.json.materials.push(
    { name: 'skora', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.72 } },
    { name: aniol ? 'paznokcie' : 'szpony', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.45 } });
  const skora = polacz([siatka(m.skora), ...(m.latka ? [siatka(m.latka)] : [])]), pazury = polacz(m.pazury.map(siatka));
  g.json.meshes.push({ name: aniol ? 'DlonAnielska' : 'DlonZOtchlani', primitives: [prymityw(skora, 0), prymityw(pazury, 1)] });

  // węzły: 0 — siatka ze skórą, 1… — kości
  const K0 = 1;
  g.json.nodes.push({ name: aniol ? 'DlonAnielska' : 'DlonZOtchlani', mesh: 0, skin: 0 });
  m.kosci.forEach((k, i) => {
    const dzieci = m.kosci.map((x, j) => (x.rodzic === i ? K0 + j : -1)).filter((x) => x >= 0);
    const w = { name: k.nazwa, translation: m.spoczynek[i].t, rotation: m.spoczynek[i].r };
    if (m.spoczynek[i].s) w.scale = m.spoczynek[i].s;
    if (dzieci.length) w.children = dzieci;
    g.json.nodes.push(w);
  });
  g.json.scenes[0].nodes = [0, K0];
  // macierze odwrotne pozy spoczynkowej (kolumnami): [Rᵀ | −Rᵀ·O]
  const ibm = new Float32Array(16 * m.kosci.length);
  m.kosci.forEach((k, i) => {
    const d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    ibm.set([k.X[0], k.Y[0], k.Z[0], 0, k.X[1], k.Y[1], k.Z[1], 0, k.X[2], k.Y[2], k.Z[2], 0, -d(k.X, k.O), -d(k.Y, k.O), -d(k.Z, k.O), 1], i * 16);
  });
  g.json.skins.push({ name: 'szkielet', skeleton: K0, joints: m.kosci.map((_, i) => K0 + i), inverseBindMatrices: g.akcesor(ibm, 'MAT4', FLOAT) });

  for (const klip of m.klipy) {
    const czasy = g.akcesor(new Float32Array(klip.klatki.map((k) => k.czas)), 'SCALAR', FLOAT, { minmax: true });
    const anim = { name: klip.nazwa, samplers: [], channels: [] };
    for (let b = 0; b < m.kosci.length; b++) {
      const q = new Float32Array(klip.klatki.length * 4);
      let poprz = null;
      klip.klatki.forEach((kl, i) => {
        let r = kl.kosci[b].r;
        // ta sama półkula co poprzedni klucz — interpolacja najkrótszą drogą
        if (poprz && r[0] * poprz[0] + r[1] * poprz[1] + r[2] * poprz[2] + r[3] * poprz[3] < 0) r = r.map((x) => -x);
        q.set(r, i * 4); poprz = r;
      });
      anim.samplers.push({ input: czasy, output: g.akcesor(q, 'VEC4', FLOAT), interpolation: 'LINEAR' });
      anim.channels.push({ sampler: anim.samplers.length - 1, target: { node: K0 + b, path: 'rotation' } });
      // skala (kość „piesc”: wnętrze pięści rośnie, gdy dłoń się zaciska)
      if (klip.klatki[0].kosci[b].s) {
        const sk = new Float32Array(klip.klatki.length * 3);
        klip.klatki.forEach((kl, i) => sk.set(kl.kosci[b].s, i * 3));
        anim.samplers.push({ input: czasy, output: g.akcesor(sk, 'VEC3', FLOAT), interpolation: 'LINEAR' });
        anim.channels.push({ sampler: anim.samplers.length - 1, target: { node: K0 + b, path: 'scale' } });
      }
    }
    g.json.animations.push(anim);
  }
  g.json.asset.extras = {
    opis: 'Trzewia: dłoń ' + (aniol ? 'anielska' : 'z otchłani') + ' — z modelu alpha-1/scripts/dlon/model.html',
    jednostki: 'jednostki modelu: nadgarstek (0,0,0), palce +x, grzbiet +y, kciuk −z',
    barwy: 'COLOR_0: barwa skóry liniowo (A — zanik ramienia); TEXCOORD_0: okluzja, wklęsłość; TEXCOORD_1.x: wnętrze dłoni / miejsce na szponie',
  };
  fs.mkdirSync(path.dirname(plik), { recursive: true });
  const b = g.bajty();
  fs.writeFileSync(plik, b);
  // światło póz dla gry C# (silnik liczy cienie sam): <nazwa>.swiatlo.gz — opis w PLAN.md 9.6
  if (m.swiatlo.length) {
    const n = skora.wierz.length / 3 + pazury.wierz.length / 3;
    const cz = [];
    const i32 = (x) => { const t = Buffer.alloc(4); t.writeInt32LE(x); return t; };
    cz.push(Buffer.from('TRZS'), i32(1), i32(n), i32(m.swiatlo.length));
    for (const k of m.swiatlo) {
      const nazwa = Buffer.from(k.nazwa, 'utf8'), dane = Buffer.from(k.dane, 'base64');
      if (dane.length !== k.czasy.length * n * 3) throw new Error(`światło „${k.nazwa}”: ${dane.length} bajtów zamiast ${k.czasy.length * n * 3}`);
      cz.push(i32(nazwa.length), nazwa, i32(k.czasy.length), Buffer.from(new Float32Array(k.czasy).buffer), dane);
    }
    fs.writeFileSync(plik.replace(/\.glb$/, '.swiatlo.gz'), zlib.gzipSync(Buffer.concat(cz), { level: 9 }));
  }
  return { bajty: b.length, wierzcholki: skora.wierz.length / 3 + pazury.wierz.length / 3, trojkaty: (skora.troj.length + pazury.troj.length) / 3 };
}

// ---------------------------------------------------------------------------------------------- przebieg
const b = await chromium().launch({ args: ['--enable-unsafe-swiftshader'] });
const strona = await b.newPage();
strona.on('console', (m) => { if (m.type() === 'error' || process.env.GADAJ) console.error('[chromium]', m.text()); });
strona.on('pageerror', (e) => console.error('[chromium wyjątek]', e.message));
await strona.goto('file://' + path.join(ALPHA, 'scripts/dlon/model.html'));
await strona.waitForFunction(() => window.gotowe === true, null, { timeout: 120000 });
await strona.addScriptTag({ path: path.join(TU, 'strona.js') });

const K5 = pozy5b();
const klipy = Object.entries(K5).map(([nazwa, k]) => ({ nazwa, pozy: k.pozy, obrot: k.obrot }));
for (const [nazwa, aniol, kl] of [['dlon-z-otchlani', 0, klipy], ['dlon-anielska', 1, []]]) {
  if (process.argv[2] && process.argv[2] !== nazwa) continue;
  const t0 = Date.now();
  const m = JSON.parse(await strona.evaluate(([a, k, bez]) => JSON.stringify(window.DLON3D.buduj(a, k, bez)), [aniol, kl, !!process.env.BEZ_SWIATLA]));
  for (const w of m.dziennik) console.log('  ' + w);
  const w = zapisz(path.join(CEL, nazwa + '.glb'), m, aniol);
  console.log(`${nazwa}.glb: ${w.wierzcholki} wierzchołków, ${w.trojkaty} trójkątów, ${m.klipy.length} animacji (${m.klipy.map((k) => k.nazwa).join(', ')}), ${(w.bajty / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await b.close();
