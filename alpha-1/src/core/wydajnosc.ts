/**
 * Licznik wydajności (F3 albo Ustawienia → Wydajność): ile klatek na sekundę widać, ile milisekund zabiera każda
 * część klatki i na jakiej karcie graficznej gra rysuje. Mierzy zawsze — to kilka odczytów zegara na klatkę —
 * a pokazuje tylko po włączeniu (render/licznik-wydajnosci.ts). Wynik odświeża się dwa razy na sekundę.
 */

/** Części klatki, w kolejności, w jakiej licznik je wypisuje. */
export const CZESCI = ['logika', 'rycina', 'swiat', 'mrok', 'poswiata', 'postacie', 'interfejs'] as const;
export type Czesc = (typeof CZESCI)[number];

export const NAZWA_CZESCI: Record<Czesc, string> = {
  logika: 'logika gry',
  rycina: 'rycina świata',
  swiat: 'świat',
  mrok: 'mrok',
  poswiata: 'poświata',
  postacie: 'postacie, efekty',
  interfejs: 'interfejs',
};

/** Co tyle ms licznik podaje nowy wynik (średnie z tego okna). */
const OKNO_MS = 500;

export interface WynikLicznika {
  /** Klatki na sekundę, średni i najdłuższy odstęp między klatkami (ms). */
  fps: number;
  klatkaMs: number;
  najdluzszaMs: number;
  /** Średni czas JS na klatkę (logika i rysunek) i jego części; reszta to to, czego żadna część nie objęła. */
  jsMs: number;
  czesci: Record<Czesc, number>;
  resztaMs: number;
  /** Rycina w osobnym wątku: średni czas jednej odbitki (ms) i ile odbitek na sekundę; 0 — bez wątku. */
  watekMs: number;
  watekNaSek: number;
}

function zera(): Record<Czesc, number> {
  return { logika: 0, rycina: 0, swiat: 0, mrok: 0, poswiata: 0, postacie: 0, interfejs: 0 };
}

class Licznik {
  /** Rycina liczy się w osobnym wątku (render/rycina-watek.ts) — dla podpisu w liczniku. */
  rycinaWWatku = false;
  wynik: WynikLicznika = {
    fps: 0, klatkaMs: 0, najdluzszaMs: 0, jsMs: 0, czesci: zera(), resztaMs: 0, watekMs: 0, watekNaSek: 0,
  };

  private suma = zera();
  private klatek = 0;
  private sumaJs = 0;
  private odOkna = 0;
  private poprzednia = 0;
  private najdluzsza = 0;
  private watekSuma = 0;
  private watekIle = 0;

  /** Dolicza czas od `od` do teraz do części `c` i zwraca teraz — kolejne odcinki klatki mierzy się łańcuchem. */
  znacz(c: Czesc, od: number): number {
    const t = performance.now();
    this.suma[c] += t - od;
    return t;
  }

  dodaj(c: Czesc, ms: number): void { this.suma[c] += ms; }

  /** Rycina policzona w osobnym wątku: tyle ms pracy wątku. */
  watek(ms: number): void { this.watekSuma += ms; this.watekIle++; }

  /** Koniec klatki (App): czas klatki z requestAnimationFrame i ile ms zajął w niej JS. */
  klatka(teraz: number, jsMs: number): void {
    if (this.poprzednia) {
      const odstep = teraz - this.poprzednia;
      // długa przerwa (okno w tle, ekran ładowania) nie jest klatką — zaczyna pomiar od nowa
      if (odstep > 1000) { this.zeruj(teraz); return; }
      if (odstep > this.najdluzsza) this.najdluzsza = odstep;
    }
    this.poprzednia = teraz;
    if (!this.odOkna) this.odOkna = teraz;
    this.klatek++;
    this.sumaJs += jsMs;
    const uplynelo = teraz - this.odOkna;
    if (uplynelo < OKNO_MS || this.klatek < 2) return;
    const n = this.klatek;
    const czesci = zera();
    let razem = 0;
    for (const c of CZESCI) { czesci[c] = this.suma[c] / n; razem += czesci[c]; }
    const js = this.sumaJs / n;
    this.wynik = {
      fps: (n * 1000) / uplynelo,
      klatkaMs: uplynelo / n,
      najdluzszaMs: this.najdluzsza,
      jsMs: js,
      czesci,
      resztaMs: Math.max(0, js - razem),
      watekMs: this.watekIle ? this.watekSuma / this.watekIle : 0,
      watekNaSek: (this.watekIle * 1000) / uplynelo,
    };
    this.zeruj(teraz);
  }

  private zeruj(teraz: number): void {
    this.suma = zera();
    this.klatek = 0;
    this.sumaJs = 0;
    this.najdluzsza = 0;
    this.watekSuma = 0;
    this.watekIle = 0;
    this.odOkna = teraz;
    this.poprzednia = teraz;
  }
}

export const licznik = new Licznik();
