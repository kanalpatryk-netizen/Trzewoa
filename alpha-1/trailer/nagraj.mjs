// Nagrywa ujęcia z gry klatka po klatce (1920×1080, 30 kl/s) do trailer/klatki/<id>/00000.jpg (+ meta.json).
// Ujęcia bierze ze scenariusza (trailer/scenariusz.mjs, wpisy typ: 'gra'). Uruchom z alpha-1 przy działającym
// `npx vite --port 5180`:
//   node trailer/nagraj.mjs [id ujęć…] [--czesc 1/3] [--co N] [--do katalog] [--bez-zapasu]
// Każde ujęcie zaczyna się od nowej partii z danym ziarnem, przewiniętej (bot gra) do tiku startu — wynik nie zależy
// od kolejności nagrywania, więc ujęcia można nagrywać w kilku procesach naraz (--czesc).
import fs from 'fs';
import path from 'path';
import { otworzGre, KATALOG, FPS } from './wspolne.mjs';
import { SCENARIUSZ } from './scenariusz.mjs';

const arg = process.argv.slice(2);
const opcja = (n, d) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : d; };
const co = Number(opcja('--co', 1));
const doKatalogu = opcja('--do', path.join(KATALOG, 'klatki'));
const czesc = opcja('--czesc', '1/1').split('/').map(Number);
const bezZapasu = arg.includes('--bez-zapasu');
const zWartoscia = new Set(['--co', '--do', '--czesc']);
const wybrane = arg.filter((a, i) => !a.startsWith('--') && !(i > 0 && zWartoscia.has(arg[i - 1])));
let lista = SCENARIUSZ.filter((u) => u.typ === 'gra' && (!wybrane.length || wybrane.includes(u.id)));
if (!lista.length) { console.error('Brak ujęć do nagrania.'); process.exit(1); }

/** Zapas klatek przed i po widocznej części (na przenikanie i skracanie w montażu). */
const ZAPAS = bezZapasu ? 0 : 15;
const klatekUjecia = (u) => Math.round(u.dl * FPS) + 2 * (u.zapas ?? ZAPAS);

// podział na procesy: zachłannie po liczbie klatek
if (czesc[1] > 1) {
  const kosze = Array.from({ length: czesc[1] }, () => ({ n: 0, u: [] }));
  for (const u of [...lista].sort((a, b) => klatekUjecia(b) - klatekUjecia(a))) {
    const k = kosze.reduce((m, q) => (q.n < m.n ? q : m));
    k.n += klatekUjecia(u) + (u.rozbieg ?? 30); k.u.push(u);
  }
  lista = kosze[czesc[0] - 1].u;
}

// ---------------------------------------------------------------- krzywe i klucze
const ease = {
  liniowo: (t) => t,
  gladko: (t) => t * t * (3 - 2 * t),
  wejscie: (t) => t * t * t,
  wyjscie: (t) => 1 - Math.pow(1 - t, 3),
  miekko: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sinus: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  wyjscieMocno: (t) => 1 - Math.pow(1 - t, 5),
};
const krzywa = (e) => ease[e ?? 'miekko'] ?? ease.miekko;

/** Klucze: gdy każde f ≤ 1 — f to ułamek widocznej długości ujęcia, inaczej numer klatki. */
function normuj(klucze, n) {
  const ulamki = klucze.every((q) => q.f <= 1);
  return klucze.map((q) => ({ ...q, f: ulamki ? q.f * (n - 1) : q.f }));
}

/** Kamera z kluczy: każdy odcinek z własną krzywą (x, y liniowo, przybliżenie logarytmicznie). */
function kameraKlucze(klucze, f, n) {
  const k = normuj(klucze, n);
  if (f <= k[0].f) return k[0];
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i].f) {
      const a = k[i - 1], b = k[i];
      const t = krzywa(b.e)((f - a.f) / Math.max(1e-9, b.f - a.f));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t) };
    }
  }
  return k[k.length - 1];
}

/**
 * Kamera po gładkiej ścieżce (Catmull-Rom przez wszystkie klucze, stała prędkość po długości łuku) z jedną krzywą
 * na całe ujęcie — bez zatrzymań w kluczach pośrednich.
 */
function sciezka(klucze) {
  const P = klucze.map((q) => [q.x, q.y, Math.log(q.z)]);
  const pt = (i) => P[Math.max(0, Math.min(P.length - 1, i))];
  const cr = (i, t) => {
    const p0 = pt(i - 1), p1 = pt(i), p2 = pt(i + 1), p3 = pt(i + 2);
    const t2 = t * t, t3 = t2 * t;
    return [0, 1, 2].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3));
  };
  const S = [], L = [0];
  const N = 400 * (P.length - 1);
  for (let j = 0; j <= N; j++) {
    const u = (j / N) * (P.length - 1);
    const i = Math.min(P.length - 2, Math.floor(u));
    S.push(cr(i, u - i));
    if (j) {
      const a = S[j - 1], b = S[j];
      // zmiana przybliżenia też jest „drogą” kamery: 1 w logarytmie ≈ 30 kafli
      L.push(L[j - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] - a[2]) * 30));
    }
  }
  const razem = L[L.length - 1];
  return (s) => {
    const cel = Math.max(0, Math.min(1, s)) * razem;
    let lo = 0, hi = L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] < cel) lo = m; else hi = m; }
    const t = (cel - L[lo]) / Math.max(1e-9, L[hi] - L[lo]);
    const a = S[lo], b = S[hi];
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, z: Math.exp(a[2] + (b[2] - a[2]) * t) };
  };
}

/** Przy śledzeniu klucze kamery to przesunięcie (dx, dy) i mnożnik przybliżenia (zm). */
function przesuniecie(klucze, f, n) {
  if (!klucze?.length) return { dx: 0, dy: 0, zm: 1 };
  const k = normuj(klucze.map((q) => ({ dx: 0, dy: 0, zm: 1, ...q })), n);
  if (f <= k[0].f) return k[0];
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i].f) {
      const a = k[i - 1], b = k[i];
      const t = krzywa(b.e)((f - a.f) / Math.max(1e-9, b.f - a.f));
      return { dx: a.dx + (b.dx - a.dx) * t, dy: a.dy + (b.dy - a.dy) * t, zm: a.zm + (b.zm - a.zm) * t };
    }
  }
  return k[k.length - 1];
}

/** Tempo czasu gry w klatce: liczba albo klucze [{f, v}] (liniowo). */
function tempoW(tempo, f, n) {
  if (typeof tempo === 'number' || tempo === undefined) return tempo ?? 1;
  const k = normuj(tempo, n);
  if (f <= k[0].f) return k[0].v;
  for (let i = 1; i < k.length; i++) if (f <= k[i].f) { const a = k[i - 1], b = k[i]; const t = (f - a.f) / (b.f - a.f); return a.v + (b.v - a.v) * t; }
  return k[k.length - 1].v;
}

const TIKOW_NA_KLATKE = 120 / FPS;

// ---------------------------------------------------------------- nagrywanie
let przegladarka = null, page = null;
const czasStart = Date.now();
let razemKlatek = 0;
for (const u of lista) {
  const t0 = Date.now();
  const ziarno = u.z ?? 3;
  if (!page) {
    const g = await otworzGre({ ziarno, przegladarka });
    przegladarka = g.browser; page = g.page;
  }
  const n = Math.round(u.dl * FPS);
  const zapas = u.zapas ?? ZAPAS;
  const rozbieg = u.rozbieg ?? 30;
  const razem = rozbieg + zapas + n + zapas;
  const katalog = path.join(doKatalogu, u.id);
  fs.rmSync(katalog, { recursive: true, force: true });
  fs.mkdirSync(katalog, { recursive: true });
  // tik pierwszej klatki rozbiegu: start (tik pierwszej widocznej klatki) minus rozbieg i zapas w tempie początku
  const tempo0 = tempoW(u.tempo, 0, n);
  const tikStartu = Math.max(0, Math.round(u.start - (rozbieg + zapas) * TIKOW_NA_KLATKE * tempo0));
  // partia od nowa, prolog (rozkazy gracza w zadanych tikach), przewinięcie do startu
  const prolog = [...(u.prolog ?? [])].sort((a, b) => a.t - b.t);
  const wynik = await page.evaluate(({ ziarno, styl, prolog, tikStartu }) => {
    const R = window.R;
    R.nowaPartia(ziarno, styl);
    const log = [];
    for (const p of prolog) {
      if (p.t >= tikStartu) break;
      R.przewin(Math.max(0, p.t - window.__trzewia.sim.tick));
      try { log.push([p.t, R.wykonaj(p.js)]); } catch (e) { log.push([p.t, 'BŁĄD ' + e.message]); }
    }
    R.przewin(Math.max(0, tikStartu - window.__trzewia.sim.tick));
    return { tick: window.__trzewia.sim.tick, log };
  }, { ziarno, styl: u.styl ?? 'rozsadny', prolog, tikStartu });
  for (const [t, w] of wynik.log) if (w !== undefined && w !== null) console.log(`[${u.id}] prolog t=${t}: ${JSON.stringify(w)}`);
  if (wynik.tick < tikStartu - 1) console.warn(`[${u.id}] partia skończyła się przed startem (tick ${wynik.tick} < ${tikStartu})`);
  await page.evaluate((o) => { window.R.ustaw(o); window.R.zapomnij(); }, { brzegi: u.brzegi ?? true, dym: u.dym ?? true });

  // akcje w klatkach (f liczone od pierwszej widocznej klatki; ujemne — w zapasie albo rozbiegu); `co` — powtarzaj
  const akcje = u.akcje ?? [];
  const prologWUjeciu = prolog.filter((p) => p.t >= tikStartu);
  const droga = u.sciezka ? sciezka(u.kamera) : null;
  const S = u.sledz;
  let sl = null;
  const meta = { id: u.id, zapas, widoczne: n, klatek: zapas + n + zapas, ticki: [] };
  let zaczete = false, nr = 0;
  const bufor = [];
  const wykonane = new Set();
  for (let i = 0; i < razem + 600; i++) {
    // numer klatki względem pierwszej widocznej (przed startem — ujemny, liczony od zaplanowanego rozbiegu)
    const f = zaczete ? nr - zapas : Math.min(-1, i - rozbieg - zapas);
    const fk = Math.max(0, Math.min(n - 1, f));
    // akcje: jednorazowe — raz, w swojej klatce; powtarzane (`co`) — co tyle klatek (przed startem tylko ujemne f)
    const fs_ = zaczete ? nr - zapas : i - rozbieg - zapas;
    for (const [k, a] of akcje.entries()) {
      const teraz = a.co
        ? fs_ >= a.f && (fs_ - a.f) % a.co === 0 && (a.do === undefined || fs_ <= a.do) && (zaczete || fs_ < 0)
        : !wykonane.has(k) && fs_ === a.f && (zaczete || fs_ < 0);
      if (!teraz) continue;
      if (!a.co) wykonane.add(k);
      const w = await page.evaluate((kod) => { try { return window.R.wykonaj(kod); } catch (e) { return 'BŁĄD ' + e.message; } }, a.js);
      if (w !== undefined && w !== null && !a.cicho) console.log(`[${u.id}] akcja f=${fs_}: ${JSON.stringify(w)}`);
    }
    if (prologWUjeciu.length) {
      const tick = await page.evaluate(() => window.__trzewia.sim.tick);
      while (prologWUjeciu.length && prologWUjeciu[0].t <= tick) {
        const p = prologWUjeciu.shift();
        await page.evaluate((kod) => window.R.wykonaj(kod), p.js);
      }
    }
    let kam;
    if (droga) kam = droga(krzywa(u.krzywa ?? 'miekko')(fk / Math.max(1, n - 1)));
    else if (!S) kam = kameraKlucze(u.kamera ?? [{ f: 0, x: 96, y: 40, z: 20 }], fk, n);
    if (S) {
      const c = await page.evaluate((kto) => window.R.cel(kto), S.kto);
      if (c) {
        const marg = S.marg ?? [10, 7];
        const zfit = Math.min(1920 / (c.w + marg[0] * 2), 1080 / (c.h + marg[1] * 2));
        const zr = Array.isArray(S.z) ? Math.max(S.z[0], Math.min(S.z[1], zfit)) : (S.z ?? zfit);
        const cel = { x: c.x + (S.dx ?? 0), y: c.y + (S.dy ?? 0), z: zr };
        if (!sl) sl = { ...cel };
        const k = S.k ?? 0.08, kz = S.kz ?? 0.04;
        sl.x += (cel.x - sl.x) * k; sl.y += (cel.y - sl.y) * k;
        sl.z = Math.exp(Math.log(sl.z) + (Math.log(cel.z) - Math.log(sl.z)) * kz);
      }
      const o = przesuniecie(u.kamera, fk, n);
      kam = sl ? { x: sl.x + o.dx, y: sl.y + o.dy, z: sl.z * o.zm } : (kam ?? { x: 96, y: 215, z: 30 });
    }
    const tempo = tempoW(u.tempo, fk, n);
    const ms = Math.round(((i + 1) * 1000) / FPS) - Math.round((i * 1000) / FPS);
    await page.clock.runFor(ms);
    let tick;
    if (u.rozmycie > 1 && droga && f >= 0 && f < n) {
      // rozmycie ruchu: podklatki z kamerą w ułamkach tej klatki (migawka 180° — połowa czasu klatki)
      const N = u.rozmycie;
      const kamery = [];
      for (let j = 0; j < N; j++) {
        const ff = Math.max(0, Math.min(n - 1, f + ((j + 0.5) / N - 0.5) * 0.5));
        const q = droga(krzywa(u.krzywa ?? 'miekko')(ff / Math.max(1, n - 1)));
        kamery.push({ x: q.x, y: q.y, zoom: q.z });
      }
      tick = await page.evaluate(({ kamery, ms, tempo }) => { window.R.klatkaRozmyta(kamery, ms, tempo); return window.__trzewia.sim.tick; }, { kamery, ms, tempo });
    } else {
      tick = await page.evaluate(({ kam, ms, tempo }) => {
        window.R.kamera({ x: kam.x, y: kam.y, zoom: kam.z });
        window.R.klatka(ms, tempo);
        return window.__trzewia.sim.tick;
      }, { kam, ms, tempo });
    }
    // Pierwsza widoczna klatka to pierwsza, w której gra doszła do tiku `start` — liczenie tików z góry myliło się,
    // gdy gra sama zwalnia czas (konanie demona): ujęcie zaczynało się wcześniej i powtarzało koniec poprzedniego.
    // Zapas przed nią to ostatnie klatki z bufora; zapas po niej i część widoczna — kolejne klatki.
    if (!zaczete) {
      if (tick >= u.start - (zapas + 2) * TIKOW_NA_KLATKE * 4) {
        bufor.push({ b64: await page.evaluate(() => window.R.zrzut(0.94)), tick });
        if (bufor.length > zapas + 1) bufor.shift();
      }
      if (tick >= u.start) {
        zaczete = true;
        while (bufor.length < zapas + 1) bufor.unshift(bufor[0]);
        bufor.forEach((q, k) => {
          fs.writeFileSync(path.join(katalog, `${String(k).padStart(5, '0')}.jpg`), Buffer.from(q.b64, 'base64'));
          meta.ticki.push(q.tick); razemKlatek++;
        });
        nr = bufor.length;
      }
      continue;
    }
    if (nr % co === 0) {
      const b64 = await page.evaluate(() => window.R.zrzut(0.94));
      fs.writeFileSync(path.join(katalog, `${String(nr).padStart(5, '0')}.jpg`), Buffer.from(b64, 'base64'));
      meta.ticki.push(tick);
      razemKlatek++;
    }
    nr++;
    if (nr >= meta.klatek) break;
  }
  fs.writeFileSync(path.join(katalog, 'meta.json'), JSON.stringify(meta));
  const st = await page.evaluate(() => ({ tick: window.__trzewia.sim.tick, ending: window.__trzewia.sim.ending ?? null }));
  console.log(`[${u.id}] ${meta.klatek} kl. w ${((Date.now() - t0) / 1000).toFixed(0)} s (tiki ${meta.ticki[0]}–${st.tick}${st.ending ? ', ' + st.ending : ''})`);
}
await przegladarka?.close();
console.log(`razem ${razemKlatek} klatek w ${((Date.now() - czasStart) / 1000).toFixed(0)} s`);
