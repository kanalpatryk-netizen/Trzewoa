// Wzorzec zgodności z JavaScriptem dla testów C# (testy/Trzewia.Testy/ZgodnoscJsTesty.cs): generator liczb losowych
// i szum z alpha-1/src/core/rng.ts, Math.hypot, Math.round, x | 0, sortowanie V8 (także z porównaniem losowym jak
// w sim/ruiny.ts). Wynik: testy/zlote/js-zgodnosc.json. Uruchomienie (z folderu trzewia-cs):
//   node --experimental-strip-types narzedzia/zgodnosc-js.mjs
import { writeFileSync } from 'node:fs';
import { Rng, Noise } from '../../alpha-1/src/core/rng.ts';

const f64 = new Float64Array(1), u64 = new BigUint64Array(f64.buffer);
const bity = (x) => { f64[0] = x; return u64[0].toString(16); };

const wynik = { rng: {}, szum: {}, hypot: [], round: [], int32: [], sort: [] };
for (const ziarno of [1, 2, 3, 42, 123456, 4294967295, 0, -7, 3.7]) {
  const r = new Rng(ziarno);
  wynik.rng[String(ziarno)] = Array.from({ length: 200 }, () => bity(r.next()));
}
for (const ziarno of [1, 3]) {
  const n = new Noise(new Rng(ziarno));
  const w = [];
  for (let i = 0; i < 300; i++) { const x = i * 0.731 - 40, y = i * 0.377 + 2.5; w.push([bity(x), bity(y), bity(n.fbm(x * 0.05, y * 0.05, 4, 2, 0.5)), bity(n.value(x, y))]); }
  wynik.szum[String(ziarno)] = w;
}
const r = new Rng(99);
for (let i = 0; i < 2000; i++) {
  const s = [1, 1e-3, 1e3, 1e8][i % 4];
  const a = (r.next() * 2 - 1) * s, b = (r.next() * 2 - 1) * s;
  wynik.hypot.push([bity(a), bity(b), bity(Math.hypot(a, b))]);
  const x = (r.next() * 2 - 1) * s;
  wynik.round.push([bity(x), bity(Math.round(x)), bity(Math.round(x + 0.5)), bity(Math.round(-0.5 - x * 0))]);
  const big = (r.next() * 2 - 1) * 1e12;
  wynik.int32.push([bity(big), big | 0, big >>> 0, (x * 1000) | 0]);
}
for (const n of [0, 1, 2, 5, 8, 13, 40, 63, 64, 65, 100, 300]) {
  // porównanie losowe (jak w sim/ruiny.ts) — wynik zależy od kolejności wywołań
  const g = new Rng(n + 1);
  const a = Array.from({ length: n }, (_, i) => i);
  a.sort(() => g.next() - 0.5);
  // stabilność: klucze z powtórzeniami
  const h = new Rng(n + 1000);
  const b = Array.from({ length: n }, (_, i) => ({ i, k: (h.next() * 5) | 0 }));
  b.sort((p, q) => p.k - q.k);
  wynik.sort.push({ n, losowe: a, stabilne: b.map((e) => e.i), stanRng: g.next() });
}
writeFileSync(new URL('../testy/zlote/js-zgodnosc.json', import.meta.url), JSON.stringify(wynik));
console.log('zapisano testy/zlote/js-zgodnosc.json');
