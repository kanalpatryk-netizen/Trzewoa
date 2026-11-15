// Dźwięk gry TS nagrany ORYGINALNYM kodem (alpha-1/src/core: audio.ts, music.ts, gesty.ts, mikser.ts, nagrania.ts) do plików:
// każdy dźwięk renderuje się w OfflineAudioContext przez ten sam tor co w grze (pogłos jaskini, wzmocnienie, ogranicznik),
// przy głośności 1 (suwak gracza stosuje gra). Pętle (dudnienie, modlitwa, akordy, pomruk, ton pauzy) — z przenikaniem
// końca w początek, więc grają bez szwu. Wywołuje to narzedzia/dzwieki/nagraj.mjs.
import { mikser } from '../../../alpha-1/src/core/mikser';
import { Resonance } from '../../../alpha-1/src/core/audio';
import { Muzyka } from '../../../alpha-1/src/core/music';
import { Gesty } from '../../../alpha-1/src/core/gesty';
import { ZestawNagran } from '../../../alpha-1/src/core/nagrania';
import { ustawienia } from '../../../alpha-1/src/core/settings-store';
import { MUZYKA as M, REZONANS, GLOSY_LUDU, GLOS_RYCERZA, GLOS_POBOZNEGO } from '../../../alpha-1/src/nastawy/dzwiek';

const SR = 48000;
const KWANT = 128 / SR;
let off: OfflineAudioContext;
let srodek = false;

const mx = mikser as any;
const panoramaOryginalna = mx.panorama.bind(mikser);
mx.panorama = (x: number) => panoramaOryginalna(srodek ? 0 : x);

ustawienia.glosnosc = 1;
ustawienia.efekty = true;
ustawienia.rezonans = true;
ustawienia.muzyka = true;

/** Nowy kontekst offline i świeży mikser na nim (ten sam tor co w grze). */
function nowy(sekundy: number): void {
  off = new OfflineAudioContext(2, Math.ceil(SR * sekundy), SR);
  (window as any).AudioContext = function () { return off; };
  mx.ctx = null;
  mx.zawieszenie = 0;
  mikser.kontekst();
  mikser.gesty.gain.value = 1;
}

/** Wywołania co `krok` s w czasie renderu (w grze: klatki i setInterval) — przez suspend. */
function co(krok: number, od: number, doS: number, f: (t: number) => void): void {
  const k = Math.max(1, Math.round(krok / KWANT)) * KWANT;
  for (let t = Math.ceil(od / KWANT) * KWANT; t < doS - KWANT; t += k) {
    const tt = t;
    off.suspend(tt).then(() => { f(tt); off.resume(); });
  }
}

interface Wynik { wav: string; sekundy: number; szczyt: number }

/** AudioBuffer → WAV 16 bit (base64). */
function wav(l: Float32Array, r: Float32Array): Wynik {
  const n = l.length;
  const bufor = new ArrayBuffer(44 + n * 4);
  const v = new DataView(bufor);
  const pisz = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  pisz(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); pisz(8, 'WAVE'); pisz(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, SR, true);
  v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); pisz(36, 'data'); v.setUint32(40, n * 4, true);
  let szczyt = 0;
  for (let i = 0; i < n; i++) {
    for (const [k, x] of [[0, l[i]], [1, r[i]]] as const) {
      const a = Math.abs(x); if (a > szczyt) szczyt = a;
      v.setInt16(44 + i * 4 + k * 2, Math.max(-32768, Math.min(32767, Math.round(x * 32767))), true);
    }
  }
  const bajty = new Uint8Array(bufor);
  let s = '';
  for (let i = 0; i < bajty.length; i += 0x8000) s += String.fromCharCode(...bajty.subarray(i, i + 0x8000));
  return { wav: btoa(s), sekundy: n / SR, szczyt };
}

/** Jednorazowy dźwięk: od 0 do końca ogona (cisza poniżej −72 dB z końca odcięta). */
function jednorazowy(b: AudioBuffer): Wynik {
  const l = b.getChannelData(0), r = b.getChannelData(1);
  const prog = 10 ** (-72 / 20);
  let z = l.length - 1;
  while (z > 0 && Math.abs(l[z]) < prog && Math.abs(r[z]) < prog) z--;
  const n = Math.min(l.length, z + Math.round(0.05 * SR));
  // ostatnie 20 ms łagodnie do zera — bez trzasku na końcu
  const L = l.slice(0, n), R = r.slice(0, n), w = Math.min(n, Math.round(0.02 * SR));
  for (let i = 0; i < w; i++) { const k = i / w; L[n - 1 - i] *= k; R[n - 1 - i] *= k; }
  return wav(L, R);
}

/** Pętla bez szwu: odcinek [od, od + dl) z końcem przenikającym w początek (przez `x` s, równa moc). */
function petla(b: AudioBuffer, od: number, dl: number, x: number): Wynik {
  const l = b.getChannelData(0), r = b.getChannelData(1);
  const s = Math.round(od * SR), n = Math.round(dl * SR), m = Math.round(x * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = l[s + i]; R[i] = r[s + i]; }
  for (let i = 0; i < m; i++) {
    const k = i / m, a = Math.sin(k * Math.PI / 2), c = Math.cos(k * Math.PI / 2);
    L[i] = l[s + i] * a + l[s + n + i] * c;
    R[i] = r[s + i] * a + r[s + n + i] * c;
  }
  return wav(L, R);
}

// ------------------------------------------------------------------ gesty (core/gesty.ts)

export async function gest(nazwa: string, args: unknown[] = []): Promise<Wynik> {
  nowy(14);
  srodek = false;
  const g = new Gesty();
  g.start();
  if (nazwa === 'tonPauzyWejscie') g.tonPauzy(true);
  else (g as any)[nazwa](...args);
  return jednorazowy(await off.startRendering());
}

/** Ton zawieszenia (pauza) — pętla: LFO 0,13 Hz, cztery okresy. */
export async function tonPauzyPetla(): Promise<Wynik> {
  const okres = 1 / 0.13, dl = okres * 4;
  nowy(10 + dl + 3);
  const g = new Gesty();
  g.start();
  g.tonPauzy(true);
  return petla(await off.startRendering(), 10, dl, 2);
}

// ------------------------------------------------------------------ rezonans świata (core/audio.ts)

function rezonans(warstwy: { dudnienie: boolean; szum: boolean; modlitwa: boolean }): Resonance {
  const res = new Resonance();
  res.start();
  const r = res as any;
  r.master.gain.cancelScheduledValues(0);
  r.master.gain.value = REZONANS.glosnosc;
  if (!warstwy.dudnienie) { r.droneFilter.disconnect(); r.alikwoty.disconnect(); }
  if (!warstwy.szum) r.noiseGain.disconnect();
  if (!warstwy.modlitwa) r.prayGain.disconnect();
  return res;
}

/** Jednorazowy dźwięk świata: wiadro, kruszec, rytuał, kropla, zawał, cud (toll). */
export async function swiat(nazwa: string, args: unknown[] = [], wSrodku = false): Promise<Wynik> {
  nowy(12);
  srodek = wSrodku;
  const res = rezonans({ dudnienie: false, szum: false, modlitwa: false });
  (res as any)[nazwa](...args);
  const w = jednorazowy(await off.startRendering());
  srodek = false;
  return w;
}

/** Jeden stuk kilofa (Resonance.knock) o wysokości `hz`, na środku, przy pracy pełnej (poziom 0,11). */
export async function stuk(hz: number): Promise<Wynik> {
  nowy(6);
  srodek = true;
  const res = rezonans({ dudnienie: false, szum: false, modlitwa: false });
  (res as any).knock(0.02, hz, 0.11, 0, 0.25);
  const w = jednorazowy(await off.startRendering());
  srodek = false;
  return w;
}

/** Warstwa ciągła rezonansu jako pętla: update() co klatkę (30 /s), jak w grze. */
export async function warstwa(rodzaj: 'dudnienie' | 'szum' | 'modlitwa', glebia: number, zycie: number, wiara: number, glod: number): Promise<Wynik> {
  const okresOddechu = (2 * Math.PI) / (0.5 + glod * 2);
  const dl = rodzaj === 'dudnienie' ? okresOddechu * Math.max(1, Math.round(30 / okresOddechu)) : 30;
  const rozgrzewka = 12;
  nowy(rozgrzewka + dl + 4);
  const res = rezonans({ dudnienie: rodzaj === 'dudnienie', szum: rodzaj === 'szum', modlitwa: rodzaj === 'modlitwa' });
  co(1 / 30, 0, rozgrzewka + dl + 4, () => res.update(glebia, 0, wiara, zycie, glod, false));
  return petla(await off.startRendering(), rozgrzewka, dl, 2.5);
}

// ------------------------------------------------------------------ muzyka (core/music.ts)

function muzyka(): Muzyka {
  const m = new Muzyka();
  m.start();
  const u = m as any;
  clearInterval(u.timer); u.timer = null;
  u.master.gain.cancelScheduledValues(0);
  u.master.gain.value = M.glosnosc;
  return m;
}

/** Akordy jednej sceny przy danym napięciu — pełny obieg progresji jako pętla (bez dzwonów i niepokoju). */
export async function akordy(scena: string, napiecie: number): Promise<Wynik> {
  const lista = (M.progresja as any)[scena] as unknown[];
  const dlAkordu = scena === 'gra' ? M.akordGra - napiecie * M.skrotNapiecia : M.akordInne;
  const obieg = lista.length * dlAkordu;
  nowy(0.2 + obieg * 2 + 1.5);
  const m = muzyka();
  const u = m as any;
  u.pomruk.disconnect(); u.pisk.disconnect(); u.szum = null;
  u.scena = scena; u.krokAkordu = 0; u.napiecie = napiecie;
  u.nastepnyDzwon = Infinity;
  u.nastepnyAkord = 0.2;
  co(0.256, 0, 0.2 + obieg * 2 + 1.5, () => u.planuj());
  // drugi obieg ma już w sobie ogon pierwszego — to jest stan ustalony; tu przenikanie niepotrzebne (koniec = początek)
  return petla(await off.startRendering(), 0.2 + obieg, obieg, 0.05);
}

/** Dzwon muzyki (Muzyka.dzwon): wysokość, głośność i ogon; na środku (panoramę losuje gra). */
export async function dzwon(hz: number, glosno: number, ogon: number): Promise<Wynik> {
  nowy(ogon + 5);
  srodek = true;
  const m = muzyka();
  const u = m as any;
  u.pomruk.disconnect(); u.pisk.disconnect();
  u.dzwon(0.02, hz, glosno, ogon);
  const w = jednorazowy(await off.startRendering());
  srodek = false;
  return w;
}

/**
 * Stała warstwa niepokoju (pomruk albo pisk) jako pętla, przy najwyższym poziomie, jaki ma w grze (`poziom`) — gra tylko
 * ścisza (przy poziomie 1 ogranicznik dusił i przesterowywał).
 */
export async function niepokojStaly(rodzaj: 'pomruk' | 'pisk', poziom: number): Promise<Wynik> {
  const dl = 30;
  nowy(4 + dl + 3);
  const m = muzyka();
  const u = m as any;
  for (const k of ['pomruk', 'pisk']) {
    u[k].gain.cancelScheduledValues(0);
    u[k].gain.value = k === rodzaj ? poziom : 0;
  }
  return petla(await off.startRendering(), 4, dl, 2.5);
}

/** Zdarzenie niepokoju: oddech, trzask, chór (w paśmie napięcia `napiecie`), szept, otchłań, zabranie. */
export async function niepokoj(nazwa: string, args: unknown[] = [], napiecie = 0, wSrodku = false): Promise<Wynik> {
  nowy(18);
  srodek = wSrodku;
  const m = muzyka();
  const u = m as any;
  u.pomruk.disconnect(); u.pisk.disconnect();
  u.napiecie = napiecie;
  u[nazwa](...(args.length ? args : nazwa === 'oddech' || nazwa === 'trzask' || nazwa === 'chor' ? [0.02] : []));
  const w = jednorazowy(await off.startRendering());
  srodek = false;
  return w;
}

// ------------------------------------------------------------------ głosy (core/nagrania.ts, gesty.ts: powiedz)

/**
 * Nagranie mowy tak, jak brzmi w grze: przycięte (mowa bez ciszy z brzegów), wyrównane do jednej głośności, z wysokością
 * roli (pobożny niżej), pogłosem i torem gestów. Bez opóźnienia (opóźnienie po rozkazie stosuje gra). null — nagranie
 * puste (gra go nie gra).
 */
export async function glos(daneUrl: string, nazwa: string, rodzaj: 'odmowa' | 'ludu', kto: 'rycerz' | 'pobozny'): Promise<Wynik | null> {
  const G = rodzaj === 'odmowa' ? (kto === 'rycerz' ? GLOS_RYCERZA : GLOS_POBOZNEGO) : GLOSY_LUDU;
  const dekoder = new OfflineAudioContext(2, 1, SR);
  const z = new ZestawNagran(nazwa, { [nazwa]: daneUrl }, G as any, () => null);
  z.wczytaj(dekoder as any);
  const zz = z as any;
  for (let i = 0; i < 200 && !zz.gotowe.length; i++) await new Promise((ok) => setTimeout(ok, 25));
  const n = zz.gotowe[0];
  if (!n) return null;
  const tempo = 2 ** ((GLOSY_LUDU.wysokosc as any)[kto] / 1200);
  nowy(n.dl / tempo + 5);
  const g = new Gesty();
  g.start();
  const src = off.createBufferSource();
  src.buffer = n.bufor;
  src.playbackRate.value = tempo;
  const wzm = off.createGain();
  wzm.gain.value = n.wzm * G.glosnosc;
  src.connect(wzm); wzm.connect((g as any).wyjscie(0, G.poglos));
  src.start(0.02, n.od, n.dl);
  return jednorazowy(await off.startRendering());
}
