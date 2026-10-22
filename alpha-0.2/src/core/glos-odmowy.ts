import { GLOS_RYCERZA, GLOS_POBOZNEGO, type NastawyGlosu } from '../nastawy/dzwiek';

/**
 * Nagrania odmów na głos (Alpha): rycerz i pobożny, każdy ze swojego folderu w gra222/dzwieki/odmowy/.
 * Każdy plik .mp3 z folderu trafia do gry sam (w pliku HTML jako data:). Przy pierwszym dźwięku gry
 * wszystkie się dekodują i mierzą — skąd do dokąd ktoś mówi (cisza z brzegów odpada) i jak głośno
 * (wyrównanie do jednej głośności). Szanse grup — nastawy/dzwiek.ts (GLOS_RYCERZA, GLOS_POBOZNEGO).
 */
const PLIKI = {
  rycerz: import.meta.glob('../../gra222/dzwieki/odmowy/rycerz/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
  pobozny: import.meta.glob('../../gra222/dzwieki/odmowy/pobozny/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
};

/** Kto odmawia na głos. */
export type KtoMowi = keyof typeof PLIKI;

/** Nastawy głosu każdej roli. */
export const NASTAWY_GLOSU: Record<KtoMowi, NastawyGlosu> = { rycerz: GLOS_RYCERZA, pobozny: GLOS_POBOZNEGO };

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
}

/** Szansa nagrania według numeru w nazwie (…_part-NN.mp3); spoza listy — jak pospolite. */
function szansaPliku(G: NastawyGlosu, nazwa: string): number {
  const nr = /(\d+)\.mp3$/.exec(nazwa)?.[1];
  for (const g of Object.values(G.rzadkosc)) if (nr && g.pliki.includes(nr)) return g.szansa;
  return G.rzadkosc.pospolite?.szansa ?? 1;
}

/**
 * Skąd dokąd mowa i jak głośno — albo null, gdy w nagraniu nie ma czego słuchać (sama cisza).
 * Mowa zaczyna się od pierwszego fragmentu nie cichszego niż `mowaOd` dB pod najgłośniejszym: szum, stuk
 * i oddech przed słowami odpadają, więc postać odzywa się od razu. Koniec — gdzie gaśnie poniżej `ciszaPonizej`.
 */
function zmierz(G: NastawyGlosu, b: AudioBuffer): Omit<Nagranie, 'nazwa' | 'szansa' | 'bufor'> | null {
  const n = b.length, sr = b.sampleRate, k = b.numberOfChannels;
  const d = new Float32Array(n);
  let szczyt = 0;
  for (let c = 0; c < k; c++) {
    const x = b.getChannelData(c);
    for (let i = 0; i < n; i++) { d[i] += x[i] / k; const a = Math.abs(x[i]); if (a > szczyt) szczyt = a; }
  }
  if (szczyt < 10 ** (G.pustePonizej / 20)) return null;
  const krok = Math.max(1, Math.round(KROK * sr));
  const cale = new Float32Array(Math.ceil(n / krok));
  let najg = 0;
  for (let j = 0; j < cale.length; j++) {
    let s = 0;
    const p = j * krok, q = Math.min(n, p + krok);
    for (let i = p; i < q; i++) s += d[i] * d[i];
    cale[j] = Math.sqrt(s / Math.max(1, q - p));
    if (cale[j] > najg) najg = cale[j];
  }
  const progMowy = najg * 10 ** (G.mowaOd / 20);
  let pierwszy = 0;
  while (pierwszy < cale.length - 1 && cale[pierwszy] < progMowy) pierwszy++;
  const prog = 10 ** (G.ciszaPonizej / 20);
  let a = pierwszy * krok, z = n - 1;
  while (z > a && Math.abs(d[z]) < prog) z--;
  if (a >= z) { a = 0; z = n - 1; }
  const od = Math.max(0, a / sr - 0.03), koniec = Math.min(n / sr, z / sr + 0.06);
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
  return { od, dl: koniec - od, wzm };
}

/** Wszystkie nagrania jednej roli: dekodowane raz, przy pierwszym dźwięku gry. */
export class GlosOdmowy {
  private gotowe: Nagranie[] = [];
  private zaczete = false;
  readonly G: NastawyGlosu;

  constructor(private kto: KtoMowi) { this.G = NASTAWY_GLOSU[kto]; }

  wczytaj(ctx: AudioContext): void {
    if (this.zaczete) return;
    this.zaczete = true;
    const G = this.G;
    for (const [sciezka, url] of Object.entries(PLIKI[this.kto])) {
      const nazwa = sciezka.split('/').pop() ?? sciezka;
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((dane) => new Promise<AudioBuffer>((ok, zle) => ctx.decodeAudioData(dane, ok, zle)))
        .then((bufor) => {
          const m = zmierz(G, bufor);
          // puste nagranie (sama cisza) nie gra wcale — inaczej postać „mówi” milczeniem i zagłusza następną odmowę
          if (!m) { console.warn(`Głos odmowy: ${this.kto}/${nazwa} jest cichy jak grób — pomijam.`); return; }
          this.gotowe.push({ nazwa, szansa: szansaPliku(G, nazwa), bufor, ...m });
        })
        .catch(() => { /* nagranie się nie wczytało — postać odmówi bez głosu */ });
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
}
