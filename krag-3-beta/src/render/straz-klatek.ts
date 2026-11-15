import { JAKOSC } from '../nastawy/ekran';

/**
 * Strażnik klatek: liczy klatki w oknie pomiaru i mówi, czy przez całe okno
 * szły wolniej niż próg z nastaw JAKOSC. Długa przerwa (karta w tle) zeruje pomiar.
 */
export class StrazKlatek {
  private od = 0;
  private ostatnia = 0;
  private klatek = 0;

  zeruj(): void { this.od = 0; this.ostatnia = 0; this.klatek = 0; }

  /** Wołane raz na klatkę; true = w tym oknie było za mało klatek. */
  klatka(teraz: number): boolean {
    if (!this.od || teraz - this.ostatnia > JAKOSC.przerwaMs) {
      this.od = teraz; this.ostatnia = teraz; this.klatek = 0;
      return false;
    }
    this.ostatnia = teraz;
    this.klatek++;
    const uplynelo = teraz - this.od;
    if (uplynelo < JAKOSC.oknoMs) return false;
    const naSekunde = this.klatek * 1000 / uplynelo;
    this.od = teraz; this.klatek = 0;
    return naSekunde < JAKOSC.progKlatek;
  }
}
