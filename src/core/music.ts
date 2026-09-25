import { ustawienia } from './settings-store';

/**
 * Muzyka gry. Nie melodia z pierwszego planu — powolny akord kamienia, po którym
 * co kilkanaście sekund ktoś uderza w metal. Wszystko syntezowane w locie, zero plików.
 *
 * Skala: frygijska od D (D Eb F G A Bb C) — półton na drugim stopniu brzmi staro
 * i niepokojąco, a przy tym nie robi z podziemia horroru.
 */
type Scena = 'menu' | 'gra' | 'samouczek' | 'koniec';

const SKALA = [0, 1, 3, 5, 7, 8, 10];          // półtony frygijskie
const BAZA = 146.83;                            // D3

interface Akord { stopnie: number[]; bas: number; }

const PROGRESJA: Record<Scena, Akord[]> = {
  menu: [
    { stopnie: [0, 2, 4], bas: -12 },
    { stopnie: [0, 3, 5], bas: -12 },
    { stopnie: [-2, 1, 3], bas: -14 },
    { stopnie: [0, 2, 5], bas: -12 },
  ],
  samouczek: [
    { stopnie: [0, 2, 4], bas: -12 },
    { stopnie: [1, 3, 5], bas: -11 },
    { stopnie: [0, 2, 4], bas: -12 },
    { stopnie: [-1, 2, 4], bas: -13 },
  ],
  gra: [
    { stopnie: [0, 2, 4], bas: -12 },
    { stopnie: [-2, 0, 3], bas: -14 },
    { stopnie: [1, 3, 5], bas: -11 },
    { stopnie: [0, 2, 6], bas: -12 },
    { stopnie: [-3, -1, 2], bas: -15 },
  ],
  koniec: [
    { stopnie: [0, 3, 5], bas: -12 },
    { stopnie: [-2, 1, 3], bas: -14 },
  ],
};

function czestotliwosc(stopien: number): number {
  const oktawa = Math.floor(stopien / SKALA.length);
  const idx = ((stopien % SKALA.length) + SKALA.length) % SKALA.length;
  return BAZA * Math.pow(2, (SKALA[idx] + oktawa * 12) / 12);
}

export class Muzyka {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private padGain!: GainNode;
  private timer: number | null = null;
  private nastepnyAkord = 0;
  private nastepnyDzwon = 0;
  private krokAkordu = 0;
  private scena: Scena = 'menu';
  private napiecie = 0;
  gra = false;

  start(): void {
    if (this.ctx) { this.wznow(); return; }
    const Ctor = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx: AudioContext = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(ctx.destination);

    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.16;
    this.padGain.connect(this.master);

    this.gra = true;
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.0002, ustawienia.glosnosc * 0.5), ctx.currentTime + 3);
    this.timer = window.setInterval(() => this.planuj(), 250);
    void this.timer;
    this.nastepnyAkord = ctx.currentTime + 0.2;
  }

  private wznow(): void {
    if (!this.ctx) return;
    this.ctx.resume();
    this.gra = true;
    if (this.timer === null) this.timer = window.setInterval(() => this.planuj(), 250);
    this.master.gain.setTargetAtTime(ustawienia.glosnosc * 0.5, this.ctx.currentTime, 1.5);
  }

  stop(): void {
    if (!this.ctx) return;
    this.gra = false;
    this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.8);
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }

  glosnosc(v: number): void {
    if (!this.ctx || !this.gra) return;
    this.master.gain.setTargetAtTime(Math.max(0.0001, v * 0.5), this.ctx.currentTime, 0.4);
  }

  /** Scena zmienia progresję i gęstość; napięcie (0..1) dokłada dysonans i tempo. */
  ustawScene(s: Scena): void {
    if (this.scena === s) return;
    this.scena = s;
    this.krokAkordu = 0;
    if (this.ctx) this.nastepnyAkord = Math.min(this.nastepnyAkord, this.ctx.currentTime + 1.2);
  }

  ustawNapiecie(n: number): void { this.napiecie = Math.max(0, Math.min(1, n)); }

  private planuj(): void {
    const ctx = this.ctx;
    if (!ctx || !this.gra) return;
    const teraz = ctx.currentTime;
    const dlugosc = this.scena === 'gra' ? 13 - this.napiecie * 4 : 11;

    if (teraz + 0.5 > this.nastepnyAkord) {
      const lista = PROGRESJA[this.scena];
      const akord = lista[this.krokAkordu % lista.length];
      this.krokAkordu++;
      this.zagrajAkord(this.nastepnyAkord, dlugosc, akord);
      this.nastepnyAkord += dlugosc;
    }

    if (teraz > this.nastepnyDzwon) {
      const przerwa = (this.scena === 'menu' ? 9 : 6) + Math.random() * 7 - this.napiecie * 3;
      this.nastepnyDzwon = teraz + Math.max(2.5, przerwa);
      if (this.scena !== 'koniec' || Math.random() < 0.5) {
        const lista = PROGRESJA[this.scena];
        const akord = lista[(this.krokAkordu - 1 + lista.length) % lista.length];
        const stopien = akord.stopnie[(Math.random() * akord.stopnie.length) | 0] + 7;
        this.dzwon(teraz + 0.05, czestotliwosc(stopien), 0.12 + Math.random() * 0.06);
      }
    }
  }

  /** Akord: trzy filtrowane piły plus bas. Wchodzi i schodzi tak wolno, że nie da się go złapać. */
  private zagrajAkord(kiedy: number, dlugosc: number, akord: Akord): void {
    const ctx = this.ctx!;
    const wejscie = dlugosc * 0.45, wyjscie = dlugosc * 0.55;
    for (const st of akord.stopnie) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.value = czestotliwosc(st);
      o.detune.value = (Math.random() - 0.5) * 12;
      f.type = 'lowpass';
      f.frequency.value = 340 + this.napiecie * 260;
      f.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, kiedy);
      g.gain.exponentialRampToValueAtTime(0.07 + Math.random() * 0.03, kiedy + wejscie);
      g.gain.exponentialRampToValueAtTime(0.0001, kiedy + wejscie + wyjscie);
      o.connect(f); f.connect(g); g.connect(this.padGain);
      o.start(kiedy); o.stop(kiedy + dlugosc + 0.3);
    }
    const bas = ctx.createOscillator();
    const bg = ctx.createGain();
    bas.type = 'sine';
    bas.frequency.value = czestotliwosc(akord.bas);
    bg.gain.setValueAtTime(0.0001, kiedy);
    bg.gain.exponentialRampToValueAtTime(0.16, kiedy + wejscie * 0.6);
    bg.gain.exponentialRampToValueAtTime(0.0001, kiedy + dlugosc);
    bas.connect(bg); bg.connect(this.master);
    bas.start(kiedy); bas.stop(kiedy + dlugosc + 0.3);
  }

  /** Uderzenie w kamień z metalicznym ogonem — jedyny dźwięk o wyraźnej wysokości. */
  private dzwon(kiedy: number, hz: number, glosno: number): void {
    const ctx = this.ctx!;
    const nosna = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modG = ctx.createGain();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    nosna.type = 'sine'; nosna.frequency.value = hz;
    mod.type = 'sine'; mod.frequency.value = hz * 2.76;      // nieharmoniczny — stąd metal
    modG.gain.value = hz * 1.4;
    mod.connect(modG); modG.connect(nosna.frequency);
    f.type = 'bandpass'; f.frequency.value = hz * 1.6; f.Q.value = 1.4;
    g.gain.setValueAtTime(0.0001, kiedy);
    g.gain.exponentialRampToValueAtTime(glosno, kiedy + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, kiedy + 4.5);
    nosna.connect(f); f.connect(g); g.connect(this.master);
    nosna.start(kiedy); nosna.stop(kiedy + 5);
    mod.start(kiedy); mod.stop(kiedy + 5);
  }
}
