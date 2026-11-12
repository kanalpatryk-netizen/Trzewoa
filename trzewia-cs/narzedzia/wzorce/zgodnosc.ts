// Wzorzec zgodności z JavaScriptem (w Chromium, jak w grze) dla testy/Trzewia.Testy/ZgodnoscJsTesty.cs:
// generator liczb losowych i szum z alpha-1/src/core/rng.ts, Math.hypot, Math.round, x | 0, sortowanie V8
// (także z porównaniem losowym jak w sim/ruiny.ts).
//   node narzedzia/wzorce/chromium.mjs narzedzia/wzorce/zgodnosc.ts zgodnosc '[]' testy/zlote/js-zgodnosc.json
import { Rng, Noise } from '../../../alpha-1/src/core/rng';

const f64 = new Float64Array(1), u64 = new BigUint64Array(f64.buffer);
const bity = (x: number) => { f64[0] = x; return u64[0].toString(16); };

export function zgodnosc() {
  const wynik: Record<string, unknown> = {};
  const rng: Record<string, string[]> = {};
  for (const ziarno of [1, 2, 3, 42, 123456, 4294967295, 0, -7, 3.7]) {
    const r = new Rng(ziarno);
    rng[String(ziarno)] = Array.from({ length: 200 }, () => bity(r.next()));
  }
  const szum: Record<string, string[][]> = {};
  for (const ziarno of [1, 3]) {
    const n = new Noise(new Rng(ziarno));
    const w: string[][] = [];
    for (let i = 0; i < 300; i++) { const x = i * 0.731 - 40, y = i * 0.377 + 2.5; w.push([bity(x), bity(y), bity(n.fbm(x * 0.05, y * 0.05, 4, 2, 0.5)), bity(n.value(x, y))]); }
    szum[String(ziarno)] = w;
  }
  const hypot: string[][] = [], round: string[][] = [], int32: (string | number)[][] = [];
  const r = new Rng(99);
  for (let i = 0; i < 2000; i++) {
    const s = [1, 1e-3, 1e3, 1e8][i % 4];
    const a = (r.next() * 2 - 1) * s, b = (r.next() * 2 - 1) * s;
    hypot.push([bity(a), bity(b), bity(Math.hypot(a, b))]);
    const x = (r.next() * 2 - 1) * s;
    round.push([bity(x), bity(Math.round(x)), bity(Math.round(x + 0.5)), bity(Math.round(-0.5 - x * 0))]);
    const big = (r.next() * 2 - 1) * 1e12;
    int32.push([bity(big), big | 0, big >>> 0, (x * 1000) | 0]);
  }
  const sort = [];
  for (const n of [0, 1, 2, 3, 4, 5, 8, 13, 15, 16, 17, 40, 63, 64, 65, 100, 300]) {
    const g = new Rng(n + 1);
    const a = Array.from({ length: n }, (_, i) => i);
    a.sort(() => g.next() - 0.5);
    const h = new Rng(n + 1000);
    const b = Array.from({ length: n }, (_, i) => ({ i, k: (h.next() * 5) | 0 }));
    b.sort((p, q) => p.k - q.k);
    sort.push({ n, losowe: a, stabilne: b.map((e) => e.i), stanRng: g.next() });
  }
  Object.assign(wynik, { rng, szum, hypot, round, int32, sort });
  return wynik;
}
