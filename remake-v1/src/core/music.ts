import { ustawienia } from './settings-store';
import { mikser } from './mikser';
import { MUZYKA as M } from '../nastawy/dzwiek';

/**
 * Muzyka gry. Nie melodia z pierwszego planu — powolny akord kamienia, po którym
 * co kilkanaście sekund ktoś uderza w metal. Wszystko syntezowane w locie, zero plików.
 *
 * Skala: frygijska od D (D Eb F G A Bb C) — półton na drugim stopniu brzmi staro
 * i niepokojąco, a przy tym nie robi z podziemia horroru.
 */
type Scena = 'menu' | 'gra' | 'samouczek' | 'koniec';

// skala, akordy, głośności i tempo są w nastawy/dzwiek.ts
const SKALA = M.skala;
const BAZA = M.podstawa;

interface Akord { stopnie: number[]; bas: number; }

const PROGRESJA: Record<Scena, Akord[]> = M.progresja;

const GLOSNOSC = M.glosnosc;
const PAD = M.akordy;

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
    const ctx = mikser.kontekst();
    if (!ctx) return;
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(mikser.swiat);

    this.padGain = ctx.createGain();
    this.padGain.gain.value = PAD;
    this.padGain.connect(this.master);

    this.gra = true;
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.0002, ustawienia.glosnosc * GLOSNOSC), ctx.currentTime + M.narastanie);
    this.timer = window.setInterval(() => this.planuj(), 250);
    void this.timer;
    this.nastepnyAkord = ctx.currentTime + 0.2;
  }

  private wznow(): void {
    if (!this.ctx) return;
    this.ctx.resume();
    this.gra = true;
    if (this.timer === null) this.timer = window.setInterval(() => this.planuj(), 250);
    this.master.gain.setTargetAtTime(Math.max(0.0001, ustawienia.glosnosc * GLOSNOSC), this.ctx.currentTime, 1.5);
  }

  stop(): void {
    if (!this.ctx) return;
    this.gra = false;
    this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.8);
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }

  glosnosc(v: number): void {
    if (!this.ctx || !this.gra) return;
    this.master.gain.setTargetAtTime(Math.max(0.0001, v * GLOSNOSC), this.ctx.currentTime, 0.4);
  }

  /** Scena zmienia progresję i gęstość; napięcie (0..1) dokłada dysonans i tempo. */
  ustawScene(s: Scena): void {
    if (this.scena === s) return;
    const zejscie = this.scena === 'menu' && (s === 'gra' || s === 'samouczek');
    this.scena = s;
    this.krokAkordu = 0;
    if (!this.ctx || !this.gra) return;
    const t = this.ctx.currentTime;
    // poprzedni akord gaśnie szybciej, zanim wejdzie nowy — przejście bez zbitki dwóch harmonii
    this.padGain.gain.cancelScheduledValues(t);
    this.padGain.gain.setTargetAtTime(PAD * 0.3, t, 0.5);
    this.padGain.gain.setTargetAtTime(PAD, t + 1.6, 1.6);
    this.nastepnyAkord = Math.min(this.nastepnyAkord, t + 1.4);
    // zejście w górę: jedno niskie uderzenie, które długo odbija się w korytarzach
    if (zejscie) this.dzwon(t + 0.1, czestotliwosc(-7), 0.2, 7);
    else if (s === 'koniec') this.dzwon(t + 0.1, czestotliwosc(-4), 0.14, 6);
  }

  ustawNapiecie(n: number): void { this.napiecie = Math.max(0, Math.min(1, n)); }

  private planuj(): void {
    const ctx = this.ctx;
    if (!ctx || !this.gra) return;
    const teraz = ctx.currentTime;
    const dlugosc = this.scena === 'gra' ? M.akordGra - this.napiecie * M.skrotNapiecia : M.akordInne;

    if (teraz + 0.5 > this.nastepnyAkord) {
      const lista = PROGRESJA[this.scena];
      const akord = lista[this.krokAkordu % lista.length];
      this.krokAkordu++;
      this.zagrajAkord(this.nastepnyAkord, dlugosc, akord);
      this.nastepnyAkord += dlugosc;
    }

    if (teraz > this.nastepnyDzwon) {
      const przerwa = (this.scena === 'menu' ? M.dzwonMenu : M.dzwonGra) + Math.random() * M.dzwonRozrzut - this.napiecie * M.dzwonNapiecie;
      this.nastepnyDzwon = teraz + Math.max(M.dzwonMinPrzerwa, przerwa);
      if (this.scena !== 'koniec' || Math.random() < 0.5) {
        const lista = PROGRESJA[this.scena];
        const akord = lista[(this.krokAkordu - 1 + lista.length) % lista.length];
        const stopien = akord.stopnie[(Math.random() * akord.stopnie.length) | 0] + 7;
        this.dzwon(teraz + 0.05, czestotliwosc(stopien), M.dzwonGlos + Math.random() * M.dzwonGlosRozrzut);
      }
    }
  }

  /**
   * Akord: trzy filtrowane piły rozstawione szeroko plus bas. Wchodzi i schodzi tak
   * wolno, że nie da się go złapać, a filtr otwiera się i zamyka jak oddech.
   */
  private zagrajAkord(kiedy: number, dlugosc: number, akord: Akord): void {
    const ctx = this.ctx!;
    const wejscie = dlugosc * 0.45, wyjscie = dlugosc * 0.55;
    const szczyt = M.filtrSzczyt + this.napiecie * M.filtrNapiecie;
    akord.stopnie.forEach((st, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.value = czestotliwosc(st);
      o.detune.value = (Math.random() - 0.5) * M.odstrojenie;
      f.type = 'lowpass';
      f.Q.value = 0.9;
      f.frequency.setValueAtTime(M.filtrOd, kiedy);
      f.frequency.linearRampToValueAtTime(szczyt, kiedy + wejscie);
      f.frequency.exponentialRampToValueAtTime(M.filtrDo, kiedy + wejscie + wyjscie);
      g.gain.setValueAtTime(0.0001, kiedy);
      g.gain.exponentialRampToValueAtTime(M.akordGlos + Math.random() * M.akordRozrzut, kiedy + wejscie);
      g.gain.exponentialRampToValueAtTime(0.0001, kiedy + wejscie + wyjscie);
      const p = mikser.panorama((i - 1) * M.rozstaw);
      o.connect(f); f.connect(g); g.connect(p); p.connect(this.padGain);
      o.start(kiedy); o.stop(kiedy + dlugosc + 0.3);
    });
    // bas oktawę wyżej niż kiedyś: 33–49 Hz ginęło w każdym małym głośniku,
    // a zjadało zapas głośności całej reszcie
    const bas = ctx.createOscillator();
    const bg = ctx.createGain();
    bas.type = 'triangle';
    bas.frequency.value = czestotliwosc(akord.bas + 7);
    bg.gain.setValueAtTime(0.0001, kiedy);
    bg.gain.exponentialRampToValueAtTime(M.bas, kiedy + wejscie * 0.6);
    bg.gain.exponentialRampToValueAtTime(0.0001, kiedy + dlugosc);
    bas.connect(bg); bg.connect(this.master);
    bas.start(kiedy); bas.stop(kiedy + dlugosc + 0.3);
  }

  /** Uderzenie w kamień z metalicznym ogonem — jedyny dźwięk o wyraźnej wysokości. */
  private dzwon(kiedy: number, hz: number, glosno: number, ogon = 4.5): void {
    const ctx = this.ctx!;
    const nosna = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modG = ctx.createGain();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    nosna.type = 'sine'; nosna.frequency.value = hz;
    mod.type = 'sine'; mod.frequency.value = hz * M.dzwonMetal;      // nieharmoniczny — stąd metal
    modG.gain.value = hz * M.dzwonModulacja;
    mod.connect(modG); modG.connect(nosna.frequency);
    f.type = 'bandpass'; f.frequency.value = hz * 1.6; f.Q.value = 1.4;
    g.gain.setValueAtTime(0.0001, kiedy);
    g.gain.exponentialRampToValueAtTime(glosno, kiedy + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, kiedy + ogon);
    // dzwon stoi gdzieś w głębi — raz z lewej, raz z prawej, zawsze z echem korytarzy
    const p = mikser.panorama((Math.random() - 0.5) * 1.1);
    const s = ctx.createGain();
    s.gain.value = M.dzwonPoglos;
    nosna.connect(f); f.connect(g); g.connect(p); p.connect(this.master);
    g.connect(s); s.connect(mikser.poglos);
    nosna.start(kiedy); nosna.stop(kiedy + ogon + 0.5);
    mod.start(kiedy); mod.stop(kiedy + ogon + 0.5);
  }
}
