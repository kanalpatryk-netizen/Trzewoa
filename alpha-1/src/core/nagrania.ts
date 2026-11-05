/**
 * Nagrane głosy postaci (Alpha): odmowy (core/glos-odmowy.ts) i kwestie ludu (core/glosy-ludu.ts). Każdy plik .mp3
 * trafia do gry sam (w pliku HTML jako data:). Przy pierwszym dźwięku gry wszystkie się dekodują i mierzą — skąd do
 * dokąd ktoś mówi (cisza z brzegów odpada) i jak głośno (wyrównanie do jednej głośności).
 */

/** Jak mierzyć nagrania — nastawy/dzwiek.ts (GLOS_RYCERZA, GLOS_POBOZNEGO, GLOSY_LUDU). */
export interface PomiarNagran {
  wyrownajDo: number;
  mowaOd: number;
  ciszaPonizej: number;
  pustePonizej: number;
  /** (GLOSY_LUDU) Mowa kończy się na pierwszej ciszy tak długiej (s), cichszej niż `przerwaPonizej` dB pod najgłośniejszym. */
  przerwaKonczy?: number;
  przerwaPonizej?: number;
}

/** Krok obwiedni (s). */
const KROK = 0.02;

export interface Nagranie {
  nazwa: string;
  /** Szansa (%) — stała (grupa rzadkości, plik „rzadkie…”) albo null: dzieli resztę do 100 po równo z innymi. */
  szansa: number | null;
  bufor: AudioBuffer;
  /** Gdzie zaczyna i ile trwa mowa (s), bez ciszy z brzegów. */
  od: number; dl: number;
  /** Wzmocnienie do wspólnej głośności. */
  wzm: number;
}

/** Nazwa pliku ze ścieżki („…/atakR/part-13.mp3” → „part-13.mp3”). */
export function nazwaPliku(sciezka: string): string {
  return sciezka.split('/').pop() ?? sciezka;
}

/**
 * Skąd dokąd mowa i jak głośno — albo null, gdy w nagraniu nie ma czego słuchać (sama cisza).
 * Mowa zaczyna się od pierwszego fragmentu nie cichszego niż `mowaOd` dB pod najgłośniejszym: szum, stuk
 * i oddech przed słowami odpadają, więc postać odzywa się od razu. Koniec — gdzie gaśnie poniżej `ciszaPonizej`,
 * a z `przerwaKonczy` najpóźniej na pierwszej długiej ciszy: stuk albo urwany kawałek następnej kwestii na końcu
 * pliku odpada, zamiast trzymać postać przy słowie przez sekundę ciszy.
 */
function zmierz(G: PomiarNagran, b: AudioBuffer): Omit<Nagranie, 'nazwa' | 'szansa' | 'bufor'> | null {
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
  if (G.przerwaKonczy !== undefined) {
    const cicho = najg * 10 ** ((G.przerwaPonizej ?? G.mowaOd) / 20), dluga = Math.round(G.przerwaKonczy / KROK);
    let ostatni = pierwszy;
    for (let j = pierwszy, ile = 0; j < cale.length && ile < dluga; j++) {
      if (cale[j] >= cicho) { ostatni = j; ile = 0; } else ile++;
    }
    z = Math.min(z, (ostatni + 1) * krok);
  }
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

/**
 * Nagrania jednej kwestii (albo odmów jednej roli): dekodowane raz, przy pierwszym dźwięku gry.
 * Gdy każde ma swoją szansę (odmowy), losuje się według nich. Gdy część ma szansę null (kwestie ludu), najpierw
 * liczą się te ze stałą szansą — tyle procent przy każdym losowaniu — a gdy żadne nie wypadnie, gra jedno z reszty,
 * po równo i nie to samo co ostatnio.
 */
export class ZestawNagran {
  private gotowe: Nagranie[] = [];
  private zaczete = false;
  private ostatnie: Nagranie | null = null;
  /** Część nagrań dzieli resztę szans po równo (bez tego — same stałe szanse, jak w odmowach). */
  private readonly zReszta: boolean;

  constructor(private opis: string, private pliki: Record<string, string>, private pomiar: PomiarNagran,
    private szansa: (nazwa: string) => number | null) {
    this.zReszta = Object.keys(pliki).some((s) => szansa(nazwaPliku(s)) === null);
  }

  wczytaj(ctx: AudioContext): void {
    if (this.zaczete) return;
    this.zaczete = true;
    for (const [sciezka, url] of Object.entries(this.pliki)) {
      const nazwa = nazwaPliku(sciezka);
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((dane) => new Promise<AudioBuffer>((ok, zle) => ctx.decodeAudioData(dane, ok, zle)))
        .then((bufor) => {
          const m = zmierz(this.pomiar, bufor);
          // puste nagranie (sama cisza) nie gra wcale — inaczej postać „mówi” milczeniem i zagłusza następną kwestię
          if (!m) { console.warn(`${this.opis}/${nazwa} jest cichy jak grób — pomijam.`); return; }
          this.gotowe.push({ nazwa, szansa: this.szansa(nazwa), bufor, ...m });
        })
        .catch(() => { /* nagranie się nie wczytało — postać zamilknie */ });
    }
  }

  /** Losuje nagranie według szans (albo null, póki nic się nie wczytało). */
  losuj(): Nagranie | null {
    const lista = this.gotowe;
    if (!lista.length) return null;
    let wybrane: Nagranie | null = null;
    if (!this.zReszta) {
      let r = Math.random() * lista.reduce((s, n) => s + (n.szansa ?? 0), 0);
      for (const n of lista) if ((r -= n.szansa ?? 0) < 0) { wybrane = n; break; }
      wybrane ??= lista[lista.length - 1];
    } else {
      // stała szansa (np. „rzadkie” — 0,5%) liczy się przy każdym losowaniu, a reszta po równo
      let r = Math.random() * 100;
      for (const n of lista) if (n.szansa !== null && (r -= n.szansa) < 0) { wybrane = n; break; }
      if (!wybrane) {
        const zwykle = lista.filter((n) => n.szansa === null);
        const bezPowtorki = zwykle.length > 1 ? zwykle.filter((n) => n !== this.ostatnie) : zwykle;
        wybrane = bezPowtorki[Math.floor(Math.random() * bezPowtorki.length)] ?? null;
      }
    }
    if (wybrane) this.ostatnie = wybrane;
    return wybrane;
  }
}
