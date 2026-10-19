import { GLOS_RYCERZA as G } from '../nastawy/dzwiek';

/**
 * Nagrania głosu rycerza (Alpha): każdy plik .mp3 z folderu trafia do gry sam (w pliku HTML jako data:).
 * Przy pierwszym dźwięku gry wszystkie się dekodują i mierzą — skąd do dokąd ktoś mówi (cisza z brzegów
 * odpada), jak głośno (wyrównanie do jednej głośności) i obwiednia słów, w rytm której przy dymku odmowy
 * biją fale (render/druzyna.ts). Szanse grup — nastawy/dzwiek.ts (GLOS_RYCERZA).
 */
const PLIKI = import.meta.glob('../../gra222/dzwieki/odmowy/rycerz/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** Krok obwiedni (s). */
const KROK = 0.02;

export interface Nagranie {
  nazwa: string;
  /** Szansa (%) — z grupy rzadkości. */
  szansa: number;
  bufor: AudioBuffer;
  /** Gdzie zaczyna i ile trwa mowa (s), bez ciszy z brzegów. */
  od: number; dl: number;
  /** Wzmocnienie do wspólnej głośności. */
  wzm: number;
  /** Głośność słów co `KROK` s (0…1). */
  obwiednia: Float32Array;
}

/** Co rycerz właśnie powiedział — dla fal przy dymku. */
export interface Wypowiedz { nazwa: string; ms: number; opoznienieMs: number; krokMs: number; obwiednia: Float32Array }

/** Szansa nagrania według numeru w nazwie (dziweki_part-NN.mp3); spoza listy — jak pospolite. */
function szansaPliku(nazwa: string): number {
  const nr = /(\d+)\.mp3$/.exec(nazwa)?.[1];
  for (const g of Object.values(G.rzadkosc)) if (nr && g.pliki.includes(nr)) return g.szansa;
  return G.rzadkosc.pospolite?.szansa ?? 1;
}

/** Skąd dokąd mowa, jak głośno i obwiednia słów. */
function zmierz(b: AudioBuffer): Omit<Nagranie, 'nazwa' | 'szansa' | 'bufor'> {
  const n = b.length, sr = b.sampleRate, k = b.numberOfChannels;
  const d = new Float32Array(n);
  let szczyt = 0;
  for (let c = 0; c < k; c++) {
    const x = b.getChannelData(c);
    for (let i = 0; i < n; i++) { d[i] += x[i] / k; const a = Math.abs(x[i]); if (a > szczyt) szczyt = a; }
  }
  const prog = 10 ** (G.ciszaPonizej / 20);
  let a = 0, z = n - 1;
  while (a < n && Math.abs(d[a]) < prog) a++;
  while (z > a && Math.abs(d[z]) < prog) z--;
  if (a >= z) { a = 0; z = n - 1; }
  const od = Math.max(0, a / sr - 0.015), koniec = Math.min(n / sr, z / sr + 0.06);
  const blok = Math.max(1, Math.round(KROK * sr)), i0 = Math.floor(od * sr), i1 = Math.ceil(koniec * sr);
  const obwiednia = new Float32Array(Math.max(1, Math.ceil((i1 - i0) / blok)));
  let max = 0;
  for (let j = 0; j < obwiednia.length; j++) {
    let s = 0;
    const p = i0 + j * blok, q = Math.min(i1, p + blok);
    for (let i = p; i < q; i++) s += d[i] * d[i];
    obwiednia[j] = Math.sqrt(s / Math.max(1, q - p));
    if (obwiednia[j] > max) max = obwiednia[j];
  }
  // głośne fragmenty: do 20 dB pod najgłośniejszym (oddechy i ogon się nie liczą)
  let moc = 0, ile = 0;
  for (const r of obwiednia) if (r > max * 0.1) { moc += r * r; ile++; }
  const rms = Math.sqrt(moc / Math.max(1, ile)) || 1;
  const wzm = Math.min(8, 10 ** (G.wyrownajDo / 20) / rms, 10 ** (-1 / 20) / (szczyt || 1));
  for (let j = 0; j < obwiednia.length; j++) obwiednia[j] = max > 0 ? obwiednia[j] / max : 0;
  return { od, dl: koniec - od, wzm, obwiednia };
}

/** Wszystkie nagrania: dekodowane raz, przy pierwszym dźwięku gry. */
export class GlosRycerza {
  private gotowe: Nagranie[] = [];
  private zaczete = false;

  wczytaj(ctx: AudioContext): void {
    if (this.zaczete) return;
    this.zaczete = true;
    for (const [sciezka, url] of Object.entries(PLIKI)) {
      const nazwa = sciezka.split('/').pop() ?? sciezka;
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((dane) => new Promise<AudioBuffer>((ok, zle) => ctx.decodeAudioData(dane, ok, zle)))
        .then((bufor) => { this.gotowe.push({ nazwa, szansa: szansaPliku(nazwa), bufor, ...zmierz(bufor) }); })
        .catch(() => { /* nagranie się nie wczytało — rycerz odmówi bez głosu */ });
    }
  }

  /** Losuje nagranie według szans (albo null, póki nic się nie wczytało). */
  losuj(): Nagranie | null {
    const lista = this.gotowe;
    if (!lista.length) return null;
    let r = Math.random() * lista.reduce((s, n) => s + n.szansa, 0);
    for (const n of lista) if ((r -= n.szansa) < 0) return n;
    return lista[lista.length - 1];
  }

  static wypowiedz(n: Nagranie): Wypowiedz {
    return { nazwa: n.nazwa, ms: n.dl * 1000, opoznienieMs: G.opoznienie * 1000, krokMs: KROK * 1000, obwiednia: n.obwiednia };
  }
}
