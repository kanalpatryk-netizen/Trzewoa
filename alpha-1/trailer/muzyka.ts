/**
 * MUZYKA TRAILERA — cała ścieżka dźwiękowa syntezowana kodem (OfflineAudioContext), bez żadnego nagrania.
 * Język muzyczny jak w grze (src/core/music.ts, pracownia-dzwieku): skala frygijska od D (D Es F G A B C), kamienny
 * akord z pił, dzwon „głosu rdzenia” (FM), chór formantowy (samogłoska o→a), puls serca. Tempo 75 BPM, takt 3,2 s —
 * cięcia obrazu stoją na taktach, a uderzenia muzyki na zdarzeniach w obrazie (lista `wskazowki` z muzyka.mjs).
 * Na wygranej (złote światło) skala przechodzi w D-dur — jedyny jasny akord w całym trailerze.
 */
import { BPM, MUZYKA, T, TAKT } from './scenariusz.mjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dowolny = any;

const SR = 48000;
const BEAT = 60 / BPM;          // 0,8 s
let ctx: OfflineAudioContext;
let suchy: GainNode, poglos: GainNode, szum: AudioBuffer, szumRozowy: AudioBuffer;

// ---------------------------------------------------------------- strój i skala
const D2 = 73.416;
/** Półtony od D → Hz (oktawa 2 = D2). */
const hz = (polton: number, oktawa = 2): number => D2 * Math.pow(2, (polton + (oktawa - 2) * 12) / 12);
/** Nuty: nazwa → półton od D. */
const N: Record<string, number> = { D: 0, Es: 1, E: 2, F: 3, Fis: 4, G: 5, As: 6, A: 7, B: 8, H: 9, C: 10, Cis: 11 };
const nuta = (n: string, o: number): number => hz(N[n], o);

/** Deterministyczny los. */
let ziarno = 12345;
const los = (): number => { ziarno = (ziarno * 1664525 + 1013904223) >>> 0; return ziarno / 4294967296; };
const losZ = (a: number, b: number): number => a + (b - a) * los();

// ---------------------------------------------------------------- tor: suchy + pogłos, panorama
function tor(pan = 0, suchoGlos = 1, poglosGlos = 0.3): GainNode {
  const we = ctx.createGain();
  const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
  we.connect(p);
  const d = ctx.createGain(); d.gain.value = suchoGlos; p.connect(d); d.connect(suchy);
  const w = ctx.createGain(); w.gain.value = poglosGlos; p.connect(w); w.connect(poglos);
  return we;
}

/** Obwiednia: atak, utrzymanie do t1, wybrzmienie. */
function obwiednia(g: AudioParam, t0: number, t1: number, szczyt: number, atak: number, wybrzm: number, krzywa: 'lin' | 'exp' = 'exp'): void {
  g.setValueAtTime(0.0001, t0);
  if (krzywa === 'lin') g.linearRampToValueAtTime(szczyt, t0 + atak);
  else g.exponentialRampToValueAtTime(Math.max(0.0002, szczyt), t0 + atak);
  g.setValueAtTime(Math.max(0.0002, szczyt), Math.max(t0 + atak, t1));
  g.exponentialRampToValueAtTime(0.0001, Math.max(t0 + atak, t1) + wybrzm);
}

function szumZrodlo(t0: number, t1: number, rozowy = false): AudioBufferSourceNode {
  const s = ctx.createBufferSource();
  s.buffer = rozowy ? szumRozowy : szum; s.loop = true;
  s.start(t0, los() * 3); s.stop(t1 + 0.05);
  return s;
}

function filtr(typ: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
  const b = ctx.createBiquadFilter(); b.type = typ; b.frequency.value = f; b.Q.value = q; return b;
}

function przester(ile: number): WaveShaperNode {
  const w = ctx.createWaveShaper();
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * ile) / Math.tanh(ile); }
  w.curve = c; w.oversample = '2x';
  return w;
}

// ---------------------------------------------------------------- instrumenty
/** Kamienny akord: trzy piły na głos, rozstrojone, przez dolnoprzepustowy (cutoff: od → do). */
function akord(t0: number, t1: number, czestotliwosci: number[], glos: number, cutoff: [number, number] = [500, 900], atak = 1.2, wybrzm = 2.0, pogl = 0.45): void {
  czestotliwosci.forEach((f, i) => {
    const out = tor((i / Math.max(1, czestotliwosci.length - 1) - 0.5) * 0.9, 1, pogl);
    const lp = filtr('lowpass', cutoff[0], 0.6);
    lp.frequency.setValueAtTime(cutoff[0], t0);
    lp.frequency.linearRampToValueAtTime(cutoff[1], t1);
    const g = ctx.createGain();
    obwiednia(g.gain, t0, t1, glos / czestotliwosci.length, atak, wybrzm);
    lp.connect(g); g.connect(out);
    for (const c of [-9, 0, 8]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = f; o.detune.value = c + losZ(-2, 2);
      o.connect(lp); o.start(t0); o.stop(t1 + wybrzm + 0.1);
    }
  });
}

/** Bas pod akordem: sinus + trochę piły (mruczenie). */
function bas(t0: number, t1: number, f: number, glos: number, atak = 0.8, wybrzm = 1.5): void {
  // bas zawsze co najmniej w oktawie D2 — D1 (37 Hz) zjadał zapas i nie słychać go na małych głośnikach
  while (f < 60) f *= 2;
  glos *= 0.42;
  const out = tor(0, 1, 0.12);
  const g = ctx.createGain(); obwiednia(g.gain, t0, t1, glos, atak, wybrzm);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
  const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = 4;
  const lp = filtr('lowpass', f * 3, 0.5);
  const gs = ctx.createGain(); gs.gain.value = 0.35;
  o.connect(g); s.connect(lp); lp.connect(gs); gs.connect(g); g.connect(out);
  o.start(t0); o.stop(t1 + wybrzm + 0.1); s.start(t0); s.stop(t1 + wybrzm + 0.1);
}

/** Smyczki spiccato (ostinato): krótka nuta z filtra o szybkiej obwiedni. */
function spiccato(t: number, f: number, glos: number, pan = 0, jasnosc = 1): void {
  const out = tor(pan, 1, 0.22);
  const lp = filtr('lowpass', 2400 * jasnosc, 1.1);
  lp.frequency.setValueAtTime(2600 * jasnosc, t);
  lp.frequency.exponentialRampToValueAtTime(380 * jasnosc + 120, t + 0.16);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(glos, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  lp.connect(g); g.connect(out);
  for (const c of [-7, 6]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c;
    o.connect(lp); o.start(t); o.stop(t + 0.3);
  }
}

/** Taiko: korpus (sinus z opadającą wysokością) + skóra (szum pasmowy). */
function taiko(t: number, f: number, glos: number, pan = 0): void {
  const out = tor(pan, 1, 0.35);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(f * 1.9, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.035);
  o.frequency.exponentialRampToValueAtTime(f * 0.82, t + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.9);
  const sk = szumZrodlo(t, t + 0.15);
  const bp = filtr('bandpass', 700, 0.9);
  const gs = ctx.createGain();
  gs.gain.setValueAtTime(0.0001, t); gs.gain.exponentialRampToValueAtTime(glos * 0.55, t + 0.002);
  gs.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  sk.connect(bp); bp.connect(gs); gs.connect(out);
}

/** Wielkie uderzenie: opadający sub, szum, „braam” (przesterowane piły z otwierającym się filtrem). */
function boom(t: number, glos: number, braam = true): void {
  const out = tor(0, 1, 0.55);
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + 3.3);
  const s = szumZrodlo(t, t + 2, true);
  const lp = filtr('lowpass', 2400, 0.5);
  lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(120, t + 1.1);
  const gs = ctx.createGain();
  gs.gain.setValueAtTime(0.0001, t); gs.gain.exponentialRampToValueAtTime(glos * 0.7, t + 0.004);
  gs.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  s.connect(lp); lp.connect(gs); gs.connect(out);
  if (!braam) return;
  const sh = przester(2.2);
  const lp2 = filtr('lowpass', 200, 2.2);
  lp2.frequency.setValueAtTime(160, t);
  lp2.frequency.exponentialRampToValueAtTime(1300, t + 0.25);
  lp2.frequency.exponentialRampToValueAtTime(260, t + 3.0);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(glos * 0.45, t + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
  sh.connect(lp2); lp2.connect(g2); g2.connect(tor(0, 1, 0.6));
  for (const f of [nuta('D', 2), nuta('A', 2), nuta('D', 3), nuta('F', 3)]) {
    for (const c of [-12, 10]) {
      const p = ctx.createOscillator(); p.type = 'sawtooth'; p.frequency.value = f; p.detune.value = c;
      const pg = ctx.createGain(); pg.gain.value = 0.25;
      p.connect(pg); pg.connect(sh); p.start(t); p.stop(t + 3.9);
    }
  }
}

/** Dzwon „głosu rdzenia”: FM z opadającym indeksem i długim ogonem. */
function dzwon(t: number, f: number, glos: number, ogon = 7, pan = 0): void {
  const out = tor(pan, 0.8, 0.7);
  for (const [k, ratio, ogonK, g0] of [[1, 1.4, 1, 1], [2.76, 1.0, 0.45, 0.35], [5.4, 1.0, 0.25, 0.12]] as const) {
    const c = ctx.createOscillator(); c.type = 'sine'; c.frequency.value = f * k;
    const m = ctx.createOscillator(); m.type = 'sine'; m.frequency.value = f * k * ratio;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * k * 3.2, t); mg.gain.exponentialRampToValueAtTime(f * k * 0.15, t + 2.2);
    m.connect(mg); mg.connect(c.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos * g0, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ogon * ogonK);
    c.connect(g); g.connect(out);
    c.start(t); c.stop(t + ogon * ogonK + 0.1); m.start(t); m.stop(t + ogon * ogonK + 0.1);
  }
}

const FORMANTY: Record<string, number[][]> = {
  // [częstotliwość, Q, wzmocnienie]
  o: [[450, 9, 1], [800, 10, 0.55], [2830, 14, 0.12]],
  a: [[730, 8, 1], [1090, 10, 0.5], [2440, 14, 0.14]],
  u: [[330, 9, 1], [700, 10, 0.3], [2250, 14, 0.08]],
};

/** Chór: piły z wibratem przez trzy formanty; samogłoska przechodzi z `od` w `do`. */
function chor(t0: number, t1: number, czestotliwosci: number[], glos: number, odS = 'o', doS = 'a', atak = 1.4, wybrzm = 2.4): void {
  czestotliwosci.forEach((f, i) => {
    const out = tor((i % 2 ? 1 : -1) * 0.35 * (0.4 + los() * 0.6), 0.75, 0.9);
    const g = ctx.createGain(); obwiednia(g.gain, t0, t1, glos / czestotliwosci.length, atak, wybrzm);
    const suma = ctx.createGain(); suma.gain.value = 1;
    FORMANTY[odS].forEach(([ff, q, w], k) => {
      const bp = filtr('bandpass', ff, q);
      bp.frequency.setValueAtTime(ff, t0);
      bp.frequency.linearRampToValueAtTime(FORMANTY[doS][k][0], t1);
      const wg = ctx.createGain(); wg.gain.value = w * 3.2;
      suma.connect(bp); bp.connect(wg); wg.connect(g);
    });
    g.connect(out);
    for (const c of [-11, -3, 5, 12]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c;
      const vib = ctx.createOscillator(); vib.frequency.value = 4.6 + los() * 1.2;
      const vg = ctx.createGain(); vg.gain.value = f * 0.0045;
      vib.connect(vg); vg.connect(o.frequency);
      o.connect(suma);
      o.start(t0); o.stop(t1 + wybrzm + 0.1); vib.start(t0); vib.stop(t1 + wybrzm + 0.1);
    }
  });
}

/** Serce: „lub” i ciszsze „dub”. */
function serce(t: number, glos: number): void {
  for (const [dt, k, f0, f1] of [[0, 1, 92, 52], [0.19, 0.62, 104, 58]] as const) {
    const out = tor(0, 1, 0.12);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t + dt); o.frequency.exponentialRampToValueAtTime(f1, t + dt + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(glos * k, t + dt + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.3);
    o.connect(g); g.connect(out); o.start(t + dt); o.stop(t + dt + 0.35);
    const h = ctx.createOscillator(); h.type = 'sine';
    h.frequency.setValueAtTime(f0 * 2.02, t + dt); h.frequency.exponentialRampToValueAtTime(f1 * 2, t + dt + 0.1);
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0.0001, t + dt); hg.gain.exponentialRampToValueAtTime(glos * k * 0.35, t + dt + 0.005);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.16);
    h.connect(hg); hg.connect(out); h.start(t + dt); h.stop(t + dt + 0.2);
    const s = szumZrodlo(t + dt, t + dt + 0.12, true);
    const lp = filtr('lowpass', 420, 0.7);
    const gs = ctx.createGain();
    gs.gain.setValueAtTime(0.0001, t + dt); gs.gain.exponentialRampToValueAtTime(glos * k * 0.5, t + dt + 0.004);
    gs.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.09);
    s.connect(lp); lp.connect(gs); gs.connect(out);
  }
}

/** Narastanie: szum przez przesuwany pasmowy + rosnący ton; ucina się w t1. */
function narastanie(t0: number, t1: number, glos: number, ton = true): void {
  const out = tor(0, 1, 0.35);
  const s = szumZrodlo(t0, t1);
  const bp = filtr('bandpass', 300, 1.6);
  bp.frequency.setValueAtTime(260, t0); bp.frequency.exponentialRampToValueAtTime(7200, t1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(glos, t1 - 0.02);
  g.gain.linearRampToValueAtTime(0.0001, t1 + 0.01);
  s.connect(bp); bp.connect(g); g.connect(out);
  if (!ton) return;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1);
  const lp = filtr('lowpass', 1800, 0.7);
  const go = ctx.createGain();
  go.gain.setValueAtTime(0.0001, t0); go.gain.exponentialRampToValueAtTime(glos * 0.35, t1 - 0.02);
  go.gain.linearRampToValueAtTime(0.0001, t1 + 0.01);
  o.connect(lp); lp.connect(go); go.connect(out); o.start(t0); o.stop(t1 + 0.05);
}

/** Odwrócony talerz: szum wysoki narastający do t1. */
function zassanie(t0: number, t1: number, glos: number): void {
  const out = tor(0, 1, 0.5);
  const s = szumZrodlo(t0, t1);
  const hp = filtr('highpass', 2500, 0.7);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(glos, t1 - 0.01);
  g.gain.linearRampToValueAtTime(0.0001, t1 + 0.01);
  s.connect(hp); hp.connect(g); g.connect(out);
}

/** Świst: szum przez przesuwany pasmowy z obwiednią dzwonu, przelot w panoramie. */
function swist(t: number, dl: number, glos: number, wGore = false, pan0 = -0.6, pan1 = 0.6): void {
  const p = ctx.createStereoPanner();
  p.pan.setValueAtTime(pan0, t); p.pan.linearRampToValueAtTime(pan1, t + dl);
  const d = ctx.createGain(); d.gain.value = 1; const w = ctx.createGain(); w.gain.value = 0.35;
  p.connect(d); d.connect(suchy); p.connect(w); w.connect(poglos);
  const s = szumZrodlo(t, t + dl);
  const bp = filtr('bandpass', 800, 1.4);
  bp.frequency.setValueAtTime(wGore ? 300 : 3200, t); bp.frequency.exponentialRampToValueAtTime(wGore ? 3600 : 260, t + dl);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(glos, t + dl * 0.55);
  g.gain.linearRampToValueAtTime(0.0001, t + dl);
  s.connect(bp); bp.connect(g); g.connect(p);
}

/** Pękający kamień: trzask, okruchy i głuchy łomot. */
function trzask(t: number, glos: number): void {
  const out = tor(losZ(-0.2, 0.2), 1, 0.4);
  const s = szumZrodlo(t, t + 0.05);
  const hp = filtr('highpass', 1200, 0.7);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  s.connect(hp); hp.connect(g); g.connect(out);
  for (let i = 0; i < 16; i++) {
    const tt = t + 0.02 + Math.pow(los(), 1.7) * 0.6;
    const ss = szumZrodlo(tt, tt + 0.03);
    const bp = filtr('bandpass', losZ(1800, 5200), 3);
    const gg = ctx.createGain();
    const v = glos * 0.5 * (1 - (tt - t) / 0.7);
    gg.gain.setValueAtTime(0.0001, tt); gg.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), tt + 0.001);
    gg.gain.exponentialRampToValueAtTime(0.0001, tt + losZ(0.01, 0.03));
    ss.connect(bp); bp.connect(gg); gg.connect(tor(losZ(-0.6, 0.6), 1, 0.3));
  }
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
  const go = ctx.createGain();
  go.gain.setValueAtTime(0.0001, t); go.gain.exponentialRampToValueAtTime(glos * 0.9, t + 0.004);
  go.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(go); go.connect(out); o.start(t); o.stop(t + 0.7);
  const r = szumZrodlo(t, t + 1.6, true);
  const lp = filtr('lowpass', 380, 0.6);
  const gr = ctx.createGain();
  gr.gain.setValueAtTime(0.0001, t); gr.gain.exponentialRampToValueAtTime(glos * 0.5, t + 0.05);
  gr.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  r.connect(lp); lp.connect(gr); gr.connect(out);
}

/** Miecz: świst cięcia i metaliczne uderzenie (nieharmoniczne alikwoty). */
function miecz(t: number, glos: number, zBrzekiem = true): void {
  swist(t - 0.12, 0.16, glos * 0.35, los() > 0.5, losZ(-0.5, 0), losZ(0, 0.5));
  if (!zBrzekiem) return;
  const out = tor(losZ(-0.4, 0.4), 1, 0.4);
  const p = losZ(0.92, 1.08);
  for (const [f, d, k] of [[1180, 0.5, 1], [1910, 0.35, 0.7], [2870, 0.28, 0.5], [3990, 0.2, 0.35], [5230, 0.14, 0.25]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * p;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos * k * 0.3, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05);
  }
  const s = szumZrodlo(t, t + 0.04);
  const hp = filtr('highpass', 2500, 0.7);
  const gs = ctx.createGain();
  gs.gain.setValueAtTime(0.0001, t); gs.gain.exponentialRampToValueAtTime(glos * 0.6, t + 0.001);
  gs.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  s.connect(hp); hp.connect(gs); gs.connect(out);
}

/** Ryk demona: przesterowane piły z drżącą wysokością przez formanty, z szumem. */
function ryk(t: number, dl: number, glos: number): void {
  const out = tor(0, 1, 0.6);
  const sh = przester(3.5);
  const suma = ctx.createGain(); suma.gain.value = 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(glos, t + 0.22);
  g.gain.setValueAtTime(glos, t + dl * 0.65);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dl);
  sh.connect(suma);
  for (const [ff, q, w] of [[320, 3, 1], [760, 4, 0.8], [1650, 5, 0.45], [3000, 6, 0.2]]) {
    const bp = filtr('bandpass', ff, q);
    bp.frequency.setValueAtTime(ff * 0.8, t); bp.frequency.linearRampToValueAtTime(ff * 1.15, t + dl * 0.4);
    bp.frequency.linearRampToValueAtTime(ff * 0.9, t + dl);
    const wg = ctx.createGain(); wg.gain.value = w * 2.4;
    suma.connect(bp); bp.connect(wg); wg.connect(g);
  }
  const lp = filtr('lowpass', 220, 0.7); suma.connect(lp);
  const lg = ctx.createGain(); lg.gain.value = 1.2; lp.connect(lg); lg.connect(g);
  g.connect(out);
  for (const [f0, f1, k] of [[96, 64, 1], [71, 50, 0.8], [48, 36, 0.7]]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.12, t + dl * 0.3);
    o.frequency.exponentialRampToValueAtTime(f1, t + dl);
    const drz = ctx.createOscillator(); drz.type = 'sawtooth'; drz.frequency.value = losZ(17, 31);
    const dg = ctx.createGain(); dg.gain.value = f0 * 0.12;
    drz.connect(dg); dg.connect(o.frequency);
    const og = ctx.createGain(); og.gain.value = k * 0.5;
    o.connect(og); og.connect(sh);
    o.start(t); o.stop(t + dl + 0.1); drz.start(t); drz.stop(t + dl + 0.1);
  }
  const s = szumZrodlo(t, t + dl, true);
  const sg = ctx.createGain(); sg.gain.value = 0.5;
  s.connect(sg); sg.connect(sh);
}

/** Ogień: szum dolnoprzepustowy z trzaskami (aureola bucha, tchnienie). */
function ogien(t: number, dl: number, glos: number): void {
  const out = tor(0, 1, 0.4);
  const s = szumZrodlo(t, t + dl, true);
  const lp = filtr('lowpass', 900, 0.6);
  lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(2600, t + dl * 0.3);
  lp.frequency.exponentialRampToValueAtTime(500, t + dl);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos, t + dl * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dl);
  s.connect(lp); lp.connect(g); g.connect(out);
  for (let i = 0; i < dl * 22; i++) {
    const tt = t + los() * dl;
    const ss = szumZrodlo(tt, tt + 0.02);
    const bp = filtr('bandpass', losZ(1500, 4500), 2);
    const gg = ctx.createGain();
    gg.gain.setValueAtTime(0.0001, tt); gg.gain.exponentialRampToValueAtTime(glos * 0.25, tt + 0.001);
    gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.015);
    ss.connect(bp); bp.connect(gg); gg.connect(tor(losZ(-0.5, 0.5), 1, 0.2));
  }
}

/** Blask: wysokie dzwoneczki ze skali, gęsto, z długim pogłosem (Cud, dłoń anielska, złote światło). */
function blask(t0: number, t1: number, glos: number, dur = false): void {
  const skala = dur ? ['D', 'Fis', 'A', 'H', 'Cis', 'E'] : ['D', 'F', 'A', 'C', 'G'];
  let t = t0;
  while (t < t1) {
    const f = nuta(skala[Math.floor(los() * skala.length)], 5 + Math.floor(los() * 2));
    const out = tor(losZ(-0.8, 0.8), 0.6, 0.9);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 3.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos * losZ(0.4, 1), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    const g2 = ctx.createGain(); g2.gain.value = 0.15;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out);
    o.start(t); o.stop(t + 1.9); o2.start(t); o2.stop(t + 1.9);
    t += losZ(0.05, 0.18);
  }
}

/** Kopyta i turkot wozu. */
function kopyta(t0: number, t1: number, glos: number): void {
  let t = t0;
  let i = 0;
  while (t < t1) {
    const out = tor(0.3, 1, 0.15);
    const s = szumZrodlo(t, t + 0.05);
    const bp = filtr('bandpass', losZ(380, 620), 2.5);
    const g = ctx.createGain();
    const v = glos * (i % 2 ? 0.6 : 1) * losZ(0.7, 1);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(bp); bp.connect(g); g.connect(out);
    t += i % 2 ? 0.19 : 0.11; i++;
  }
  const r = szumZrodlo(t0, t1);
  const bp = filtr('bandpass', 1400, 4);
  const g = ctx.createGain(); obwiednia(g.gain, t0, t1 - 0.4, glos * 0.12, 0.4, 0.4);
  const am = ctx.createOscillator(); am.frequency.value = 13; const ag = ctx.createGain(); ag.gain.value = glos * 0.08;
  am.connect(ag); ag.connect(g.gain); am.start(t0); am.stop(t1);
  r.connect(bp); bp.connect(g); g.connect(tor(0.3, 1, 0.1));
}

/** Krótki stuk (drewno, młotek, kilof). */
function stuk(t: number, f: number, glos: number, metal = false, pan = 0): void {
  const out = tor(pan, 1, 0.25);
  if (metal) {
    for (const [k, d] of [[1, 0.12], [1.52, 0.09], [2.36, 0.06]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * k;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos * 0.4, t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.02);
    }
  }
  const s = szumZrodlo(t, t + 0.04);
  const bp = filtr('bandpass', metal ? f * 1.2 : f, metal ? 2 : 3.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos, t + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  s.connect(bp); bp.connect(g); g.connect(out);
}

/** Bulgot wywaru: krótkie ćwierknięcia sinusa w górę. */
function bulgot(t0: number, t1: number, glos: number): void {
  let t = t0;
  while (t < t1) {
    const out = tor(losZ(-0.4, 0.4), 1, 0.4);
    const o = ctx.createOscillator(); o.type = 'sine';
    const f = losZ(180, 420);
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.3, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos * losZ(0.4, 1), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.08);
    t += losZ(0.04, 0.2);
  }
}

/** Zgrzyt kraty: niski szum z modulacją i brzęk łańcucha. */
function krata(t0: number, t1: number, glos: number): void {
  const out = tor(-0.2, 1, 0.35);
  const s = szumZrodlo(t0, t1, true);
  const bp = filtr('bandpass', 160, 2.5);
  const g = ctx.createGain(); obwiednia(g.gain, t0, t1, glos, 0.3, 0.4);
  const am = ctx.createOscillator(); am.frequency.value = 9; const ag = ctx.createGain(); ag.gain.value = glos * 0.5;
  am.connect(ag); ag.connect(g.gain); am.start(t0); am.stop(t1 + 0.4);
  s.connect(bp); bp.connect(g); g.connect(out);
  for (let t = t0 + 0.1; t < t1; t += losZ(0.18, 0.4)) stuk(t, losZ(1800, 2600), glos * 0.5, true, losZ(-0.5, 0.2));
}

/** Pęknięcie liny: trzask i opadające brzęknięcie. */
function lina(t: number, glos: number): void {
  stuk(t, 2400, glos, false, 0.2);
  const out = tor(0.2, 1, 0.3);
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos * 0.6, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.5);
}

/** Dudnienie skały (pod demonem). */
function dudnienie(t0: number, t1: number, glos: number): void {
  const out = tor(0, 1, 0.3);
  const s = szumZrodlo(t0, t1, true);
  const lp = filtr('lowpass', 120, 0.8);
  const g = ctx.createGain(); obwiednia(g.gain, t0, t1, glos, (t1 - t0) * 0.6, 0.8, 'lin');
  s.connect(lp); lp.connect(g); g.connect(out);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 41;
  const go = ctx.createGain(); obwiednia(go.gain, t0, t1, glos * 0.6, (t1 - t0) * 0.6, 0.8, 'lin');
  o.connect(go); go.connect(out); o.start(t0); o.stop(t1 + 0.9);
}

/** Szept: oddech przez formanty (samogłoski bez głosu). */
function szept(t: number, dl: number, glos: number): void {
  const out = tor(0, 0.8, 0.6);
  const s = szumZrodlo(t, t + dl);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(glos, t + dl * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dl);
  for (const [f, q] of [[1100, 6], [2300, 7], [3300, 8]]) {
    const bp = filtr('bandpass', f, q);
    bp.frequency.setValueAtTime(f * 0.9, t); bp.frequency.linearRampToValueAtTime(f * 1.15, t + dl);
    s.connect(bp); bp.connect(g);
  }
  g.connect(out);
}

// ---------------------------------------------------------------- aranżacja
/** Akordy (półtony od D, oktawa 3) — progresje sekcji. */
const AK: Record<string, string[]> = {
  Dm: ['D', 'F', 'A'], Es: ['Es', 'G', 'B'], B: ['B', 'D', 'F'], Gm: ['G', 'B', 'D'], C: ['C', 'E', 'G'],
  Cm: ['C', 'Es', 'G'], A: ['A', 'Cis', 'E'], D: ['D', 'Fis', 'A'], Asus: ['A', 'D', 'E'],
};
const glosy = (a: string, oktawa = 3): number[] => AK[a].map((n, i) => nuta(n, oktawa + (i > 0 && N[n] < N[AK[a][0]] ? 1 : 0)));
const pryma = (a: string, oktawa = 2): number => nuta(AK[a][0], oktawa);

export interface Wskazowka { t: number; co: string; v?: number; dl?: number }

export async function zrob(wskazowki: Wskazowka[], dlugosc: number, cios: number): Promise<{ L: Float32Array; P: Float32Array; sr: number }> {
  ctx = new OfflineAudioContext(2, Math.ceil(SR * dlugosc), SR);
  cios0 = cios;
  ziarno = 20261115;
  // szum biały i różowy
  szum = ctx.createBuffer(1, SR * 4, SR);
  szumRozowy = ctx.createBuffer(1, SR * 4, SR);
  { const d = szum.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = los() * 2 - 1; }
  {
    const d = szumRozowy.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = los() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
  }
  // pogłos: wielka krypta — stereo szum z opadem, ciemniejący w ogonie, z wczesnymi odbiciami
  const ir = ctx.createBuffer(2, SR * 5, SR);
  for (let k = 0; k < 2; k++) {
    const d = ir.getChannelData(k);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / SR;
      const a = Math.min(1, t / 0.012) * Math.exp(-t * 1.45);
      const c = 0.55 + 0.4 * Math.exp(-t * 1.2);        // im później, tym ciemniej
      lp += c * ((los() * 2 - 1) - lp);
      d[i] = lp * a;
    }
    for (const [tt, g] of [[0.017, 0.5], [0.029, 0.4], [0.043, 0.35], [0.061, 0.3], [0.083, 0.22]]) {
      const i = Math.floor((tt + k * 0.004) * SR); d[i] += g * (k ? -1 : 1);
    }
  }
  const splot = ctx.createConvolver(); splot.normalize = true; splot.buffer = ir;
  // tor główny: suchy + pogłos → kompresor → nasycenie → ogranicznik
  const glowny = ctx.createGain(); glowny.gain.value = 0.9;
  suwak(glowny.gain);
  suchy = ctx.createGain(); suchy.gain.value = 1;
  poglos = ctx.createGain(); poglos.gain.value = 1;
  const poglosWy = ctx.createGain(); poglosWy.gain.value = 0.55;
  const poglosHp = filtr('highpass', 140, 0.6);
  poglos.connect(poglosHp); poglosHp.connect(splot); splot.connect(poglosWy); poglosWy.connect(glowny);
  suchy.connect(glowny);
  const hp = filtr('highpass', 30, 0.7);
  const polka = ctx.createBiquadFilter(); polka.type = 'lowshelf'; polka.frequency.value = 90; polka.gain.value = -3;
  const komp = ctx.createDynamicsCompressor();
  komp.threshold.value = -14; komp.ratio.value = 2.5; komp.attack.value = 0.015; komp.release.value = 0.3; komp.knee.value = 6;
  const nasyc = przester(1.1);
  const ogr = ctx.createDynamicsCompressor();
  ogr.threshold.value = -1.5; ogr.ratio.value = 20; ogr.attack.value = 0.002; ogr.release.value = 0.12; ogr.knee.value = 0;
  glowny.connect(hp); hp.connect(polka); polka.connect(komp); komp.connect(nasyc); nasyc.connect(ogr); ogr.connect(ctx.destination);

  aranzuj(cios);
  for (const w of wskazowki) efekt(w);

  const bufor = await ctx.startRendering();
  return { L: bufor.getChannelData(0), P: bufor.getChannelData(1), sr: SR };
}

/** Suwak miksu: głośność całości po sekcjach (dB) — cicho na początku i w przełomach, pełnia w kulminacji. */
let cios0 = 0;
function suwak(g: AudioParam): void {
  const K: [number, number][] = [
    [0, -14], [T(4, 2), -12], [T(7), -8], [T(12), -6], [T(17), -4], [T(18) - 0.02, -3],
    [T(18), -10], [T(20) - 0.02, -9], [T(20), -6], [T(25), -5], [T(31), -3], [T(32) - 0.02, -2],
    [T(32), -8], [T(33) - 0.02, -6], [T(33), -1], [T(41), 0], [T(42) - 0.02, 0],
    [T(42), -5], [cios0 - 0.02, -3], [cios0, 0], [T(45) - 0.02, -3],
    [T(45), -9], [T(46) - 0.02, -8], [T(46), -2], [T(48), -5], [T(49) + 1, -9],
  ];
  K.sort((a, b) => a[0] - b[0]);
  g.setValueAtTime(Math.pow(10, K[0][1] / 20) * 0.9, 0);
  for (const [t, db] of K.slice(1)) g.linearRampToValueAtTime(Math.pow(10, db / 20) * 0.9, Math.max(0.001, t));
}

/** Efekty dźwiękowe do obrazu (czas filmu z muzyka.mjs — klatki ujęć, w których dzieje się zdarzenie). */
function efekt(w: Wskazowka): void {
  const v = w.v ?? 1;
  switch (w.co) {
    case 'trzask': trzask(w.t, 0.5 * v); break;
    case 'boom': boom(w.t, 0.62 * v); break;
    case 'boomMaly': boom(w.t, 0.4 * v, false); break;
    case 'dzwon': dzwon(w.t, nuta('D', 4), 0.16 * v, 8); break;
    case 'dzwonNisko': dzwon(w.t, nuta('D', 3), 0.2 * v, 9); break;
    case 'miecz': miecz(w.t, 0.28 * v); break;
    case 'swist': swist(w.t, w.dl ?? 0.3, 0.2 * v, true); break;
    case 'swistDol': swist(w.t, w.dl ?? 0.5, 0.22 * v, false, 0, 0); break;
    case 'ryk': ryk(w.t, w.dl ?? 1.8, 0.4 * v); break;
    case 'ogien': ogien(w.t, w.dl ?? 1.2, 0.3 * v); break;
    case 'lina': lina(w.t, 0.4 * v); break;
    case 'szept': szept(w.t, w.dl ?? 1.4, 0.12 * v); break;
    case 'blask': blask(w.t, w.t + (w.dl ?? 2), 0.05 * v, false); break;
    case 'blaskDur': blask(w.t, w.t + (w.dl ?? 2), 0.05 * v, true); break;
    case 'kopyta': kopyta(w.t, w.t + (w.dl ?? 3), 0.18 * v); break;
    case 'bulgot': bulgot(w.t, w.t + (w.dl ?? 3), 0.05 * v); break;
    case 'krata': krata(w.t, w.t + (w.dl ?? 3), 0.12 * v); break;
    case 'dudnienie': dudnienie(w.t, w.t + (w.dl ?? 3), 0.35 * v); break;
    case 'stuk': stuk(w.t, 900, 0.25 * v, false, losZ(-0.3, 0.3)); break;
    case 'kilof': stuk(w.t, 2600, 0.22 * v, true, losZ(-0.4, 0.4)); break;
    case 'taiko': taiko(w.t, 62, 0.5 * v); break;
    case 'serce': serce(w.t, 0.55 * v); break;
    case 'zassanie': zassanie(w.t - (w.dl ?? 1.2), w.t, 0.12 * v); break;
    default: break;
  }
}

/** Partytura: sekcje według MUZYKA (scenariusz.mjs). */
function aranzuj(cios: number): void {
  // --------------------------------------------------------- HAK (0 – T7): pomruk, serce, dzwon
  bas(0.2, T(7), nuta('D', 1), 0.28, 4, 1.5);
  akord(1.0, T(4, 2), [nuta('D', 2), nuta('A', 2)], 0.12, [180, 320], 3, 2);
  chor(T(2), T(4, 2), [nuta('D', 3), nuta('A', 3)], 0.06, 'u', 'o', 3, 2.5);
  for (let t = T(1, 2); t < T(7) - 0.1; t += BEAT) serce(t, 0.3 + 0.25 * (t / T(7)));
  dzwon(T(3), nuta('D', 3), 0.2, 9);
  boom(T(3), 0.32, false);
  // rozeta katedry i smuga światła
  dzwon(T(4, 2) + 0.4, nuta('A', 4), 0.12, 8, 0.3);
  chor(T(4, 2), T(7), glosy('Dm', 3), 0.13, 'o', 'a', 2.2, 2.5);
  akord(T(4, 2), T(7), glosy('Dm', 3), 0.18, [300, 1100], 2.5, 1.5);
  narastanie(T(6), T(7), 0.06, false);
  zassanie(T(6, 2), T(7), 0.1);

  // --------------------------------------------------------- ŻYCIE (T7 – T18): ostinato, kilofy, kamienny akord
  const zycie: [string, number][] = [['Dm', 7], ['Dm', 8], ['B', 9], ['B', 10], ['Gm', 11], ['Gm', 12], ['Es', 13], ['Es', 14], ['Dm', 15], ['B', 16], ['Es', 17]];
  boom(T(7), 0.45);
  for (const [a, takt] of zycie) {
    const t0 = T(takt), t1 = T(takt + 1);
    akord(t0, t1, glosy(a, 3), 0.2 + 0.02 * (takt - 7), [500 + (takt - 7) * 60, 700 + (takt - 7) * 80], 0.4, 1.2);
    bas(t0, t1, pryma(a, 1), 0.26, 0.15, 0.8);
    // ostinato: ósemki, od taktu 9; od 15 szesnastki
    if (takt >= 8) {
      const krok = takt >= 15 ? BEAT / 4 : BEAT / 2;
      let i = 0;
      for (let t = t0; t < t1 - 0.01; t += krok, i++) {
        const f = i % 4 === 2 ? pryma(a, 3) : pryma(a, 2);
        const akc = i % (takt >= 15 ? 4 : 2) === 0 ? 1 : 0.6;
        spiccato(t, f, (0.07 + 0.006 * (takt - 8)) * akc, i % 2 ? 0.25 : -0.25, 0.8 + 0.05 * (takt - 8));
      }
    }
    // kocioł bębnów od taktu 11, mocniej od 14
    if (takt >= 11) {
      taiko(t0, 58, 0.34 + 0.03 * (takt - 11));
      if (takt >= 13) taiko(t0 + BEAT * 2.5, 70, 0.22);
      if (takt >= 15) { taiko(t0 + BEAT * 1.5, 82, 0.18, -0.3); taiko(t0 + BEAT * 3.5, 82, 0.2, 0.3); }
    }
  }
  // kilofy na 2 i 4 w taktach pracy (kopanie, kołowrót, schody)
  for (let t = T(12, 2); t < T(16); t += BEAT) if (Math.round((t - T(12, 2)) / BEAT) % 2 === 1) stuk(t, 2700, 0.13, true, losZ(-0.4, 0.4));
  // Cud: chór i blask
  chor(T(11), T(12, 2), glosy('Gm', 4), 0.12, 'o', 'a', 0.8, 2.5);
  // zejście: narastanie do cięcia w czerń
  narastanie(T(16), T(18), 0.16);
  zassanie(T(17), T(18), 0.16);

  // --------------------------------------------------------- DNO (T18 – T20): cisza, serce, dzwon
  bas(T(18), T(20), nuta('D', 1), 0.22, 0.05, 2);
  dzwon(T(18) + 0.05, nuta('D', 3), 0.28, 10);
  for (let t = T(18, 2); t < T(20) - 0.2; t += BEAT) serce(t, 0.5);
  chor(T(18, 2), T(20), [nuta('D', 3), nuta('As', 3)], 0.05, 'u', 'o', 2, 1);
  zassanie(T(19), T(20), 0.18);

  // --------------------------------------------------------- TAJEMNICA (T20 – T32): frygijskie Dm–Es, chór, bębny, tryton
  boom(T(20), 0.55);
  const taj: [string, number][] = [['Dm', 20], ['Dm', 21], ['Es', 22], ['Dm', 23], ['Es', 24], ['Dm', 25], ['Es', 26], ['B', 27], ['B', 28], ['Es', 29], ['Dm', 30], ['Es', 31]];
  for (const [a, takt] of taj) {
    const t0 = T(takt), t1 = T(takt + 1);
    const k = (takt - 20) / 11;
    akord(t0, t1, glosy(a, 3), 0.2 + 0.08 * k, [420 + 600 * k, 600 + 900 * k], 0.3, 1.0);
    bas(t0, t1, pryma(a, 1), 0.3, 0.1, 0.8);
    if (takt >= 22) chor(t0, t1, glosy(a, 3).concat([pryma(a, 4)]), 0.1 + 0.08 * k, 'o', 'a', 0.6, 1.2);
    // bębny: z każdym taktem gęściej
    if (takt >= 21) taiko(t0, 55, 0.4 + 0.15 * k);
    if (takt >= 23) taiko(t0 + BEAT * 2, 66, 0.3 + 0.1 * k);
    if (takt >= 26) { taiko(t0 + BEAT * 1.5, 78, 0.22, -0.4); taiko(t0 + BEAT * 3, 66, 0.26, 0.4); taiko(t0 + BEAT * 3.5, 78, 0.2, 0.2); }
    if (takt >= 29) for (let i = 0; i < 16; i++) spiccato(t0 + (i * BEAT) / 4, i % 4 === 0 ? pryma(a, 2) : pryma(a, 3), 0.06 + (i % 4 === 0 ? 0.04 : 0), i % 2 ? 0.3 : -0.3, 1.1);
    else if (takt >= 24) for (let i = 0; i < 8; i++) spiccato(t0 + (i * BEAT) / 2, i % 2 ? pryma(a, 3) : pryma(a, 2), 0.06, i % 2 ? 0.3 : -0.3, 0.9);
  }
  // Strażnicy: tryton (D–As) — niski, przesterowany
  for (const t of [T(25, 2), T(29), T(31)]) akord(t, t + 0.9, [nuta('D', 2), nuta('As', 2)], 0.2, [700, 300], 0.02, 0.9, 0.5);
  // dłoń anielska: chór w B-dur nad mrokiem
  chor(T(27), T(28, 2), [nuta('B', 3), nuta('D', 4), nuta('F', 4), nuta('B', 4)], 0.16, 'o', 'a', 0.7, 1.4);
  blask(T(27) + 0.3, T(28, 2), 0.035, false);
  // przed burzą
  narastanie(T(31), T(32), 0.12);

  // --------------------------------------------------------- CISZA (T32 – T33): serce przyspiesza, wysoki ton, zassanie
  akord(T(32), T(33), [nuta('D', 5), nuta('Es', 5)], 0.035, [2000, 3000], 0.8, 0.1, 0.6);
  let t = T(32), okres = BEAT;
  while (t < T(33) - 0.15) { serce(t, 0.7); okres *= 0.84; t += okres; }
  dudnienie(T(32), T(33), 0.25);
  zassanie(T(32, 1), T(33), 0.22);

  // --------------------------------------------------------- DEMON (T33 – T42): pełna orkiestra
  const demon: [string, number][] = [['Dm', 33], ['Dm', 34], ['Es', 35], ['B', 36], ['C', 37], ['Dm', 38], ['Es', 39], ['B', 40], ['C', 41]];
  for (const [a, takt] of demon) {
    const t0 = T(takt), t1 = T(takt + 1);
    const pelny = takt >= 35;
    akord(t0, t1, glosy(a, 3).concat([pryma(a, 4)]), pelny ? 0.34 : 0.24, [900, 1800], 0.05, 0.6);
    bas(t0, t1, pryma(a, 1), 0.34, 0.05, 0.6);
    chor(t0, t1, glosy(a, 3).concat([pryma(a, 4)]), pelny ? 0.24 : 0.14, 'o', 'a', 0.2, 0.8);
    if (pelny) {
      // szesnastki smyczków i rytm taiko: 1 . . 1 . 1 . . | 1 . 1 . 1 1 1 1
      for (let i = 0; i < 16; i++) spiccato(t0 + (i * BEAT) / 4, [pryma(a, 2), pryma(a, 3), pryma(a, 3), nuta(AK[a][2], 3)][i % 4], 0.075 + (i % 4 === 0 ? 0.04 : 0), i % 2 ? 0.35 : -0.35, 1.25);
      const wzor = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1];
      wzor.forEach((x, i) => { if (x) taiko(t0 + (i * BEAT) / 4, i % 8 === 0 ? 52 : 64 + (i % 3) * 8, i % 8 === 0 ? 0.62 : 0.3, ((i % 5) - 2) * 0.15); });
      boom(t0, 0.3, true);
    }
  }
  // dudnienie pod wstawaniem demona
  dudnienie(T(33), T(35), 0.42);

  // --------------------------------------------------------- OSTATNI CIOS (T42 – cios): cisza, serce, wyskok rycerza
  bas(T(42), cios, nuta('D', 1), 0.3, 0.02, 0.6);
  akord(T(42), cios, [nuta('D', 4), nuta('Es', 4)], 0.07, [1500, 2600], 0.3, 0.2, 0.7);
  for (let tt = T(42); tt < cios - 0.25; tt += BEAT / 2) serce(tt, 0.65);
  zassanie(cios - 1.0, cios, 0.24);

  // --------------------------------------------------------- ŚWIATŁO (cios – T45,2): D-dur, chór, blask — jedyny jasny akord
  boom(cios, 0.8, true);
  chor(cios, T(45, 2), [nuta('D', 3), nuta('Fis', 3), nuta('A', 3), nuta('D', 4), nuta('Fis', 4)], 0.3, 'o', 'a', 0.25, 3.5);
  akord(cios, T(45, 2), glosy('D', 3).concat([nuta('D', 4)]), 0.28, [700, 1600], 0.15, 3.0, 0.7);
  bas(cios, T(45, 2), nuta('D', 1), 0.32, 0.05, 3);
  blask(cios, T(45), 0.06, true);
  dzwon(cios, nuta('D', 4), 0.2, 9);
  dzwon(T(43, 2), nuta('A', 4), 0.12, 8, 0.3);

  // --------------------------------------------------------- FINAŁ (T45 – koniec): „Uwolnij się.”, logo, serce
  for (let tt = T(45); tt < T(46) - 0.2; tt += BEAT) serce(tt, 0.42);
  zassanie(T(45, 2), T(46), 0.2);
  boom(T(46), 0.75, true);
  dzwon(T(46), nuta('D', 3), 0.3, 10);
  akord(T(46), T(48, 2), [nuta('D', 2), nuta('A', 2), nuta('D', 3), nuta('F', 3), nuta('A', 3)], 0.22, [600, 300], 0.6, 3.5, 0.7);
  chor(T(46), T(48), [nuta('D', 3), nuta('A', 3), nuta('D', 4)], 0.14, 'a', 'o', 0.8, 3.5);
  bas(T(46), T(48, 2), nuta('D', 1), 0.3, 0.05, 3);
  for (let tt = T(46); tt < T(49) - 0.6; tt += BEAT) serce(tt, 0.5 - 0.3 * ((tt - T(46)) / (T(49) - T(46))));
  void MUZYKA; void TAKT;
}
