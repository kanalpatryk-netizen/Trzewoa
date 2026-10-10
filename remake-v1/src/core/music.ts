import { ustawienia } from './settings-store';
import { mikser } from './mikser';
import { MUZYKA as M, NIEPOKOJ as N } from '../nastawy/dzwiek';

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
  // warstwy niepokoju (nastawy/dzwiek.ts → NIEPOKOJ)
  private szum: AudioBuffer | null = null;
  private pomruk: GainNode | null = null;
  private pisk: GainNode | null = null;
  private nastepnyOddech = 0;
  private nastepnyTrzask = 0;
  private nastepnyChor = 0;

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
    this.zacznijNiepokoj(ctx);
  }

  /** Pomruk i pisk grają bez przerwy (głośność zmienia scena i napięcie); szum do oddechu i trzasków. */
  private zacznijNiepokoj(ctx: AudioContext): void {
    const n = Math.round(ctx.sampleRate * 2);
    this.szum = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = this.szum.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // pomruk: dwa tony prawie równe — dudnią wolno jak coś ogromnego, co oddycha za ścianą
    this.pomruk = ctx.createGain();
    this.pomruk.gain.value = 0.0001;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 220;
    for (const [hz, typ] of [[N.pomrukHz, 'sine'], [N.pomrukHz + N.pomrukDudnienie, 'sine'], [N.pomrukHz * 1.5 - 0.3, 'triangle']] as const) {
      const o = ctx.createOscillator();
      o.type = typ; o.frequency.value = hz;
      const g = ctx.createGain(); g.gain.value = typ === 'triangle' ? 0.25 : 0.5;
      o.connect(g); g.connect(f); o.start();
    }
    f.connect(this.pomruk); this.pomruk.connect(this.master);
    // pisk: sekunda mała wysoko, tylko przy dużym napięciu — jak dzwonienie w uszach przed omdleniem
    this.pisk = ctx.createGain();
    this.pisk.gain.value = 0.0001;
    for (const hz of [N.piskHz, N.piskHz * Math.pow(2, 1 / 12)]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz;
      o.connect(this.pisk); o.start();
    }
    this.pisk.connect(this.master);
    const t = ctx.currentTime;
    this.nastepnyOddech = t + 4;
    this.nastepnyTrzask = t + 3;
    this.nastepnyChor = t + 14;
    this.ustawNiepokoj();
  }

  /** Głośność stałych warstw z napięcia i sceny. */
  private ustawNiepokoj(): void {
    const ctx = this.ctx;
    if (!ctx || !this.pomruk || !this.pisk) return;
    const t = ctx.currentTime;
    const p = this.scena === 'gra' ? N.pomrukGra + this.napiecie * N.pomrukNapiecie : this.scena === 'koniec' ? N.pomrukGra * 1.4 : N.pomrukMenu;
    this.pomruk.gain.setTargetAtTime(Math.max(0.0001, p), t, 2.5);
    const pi = this.scena === 'gra' && this.napiecie > N.piskOd ? N.piskGlos * (this.napiecie - N.piskOd) / (1 - N.piskOd) : 0.0001;
    this.pisk.gain.setTargetAtTime(Math.max(0.0001, pi), t, 4);
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
    this.ustawNiepokoj();
  }

  ustawNapiecie(n: number): void {
    const nowe = Math.max(0, Math.min(1, n));
    const zmiana = Math.abs(nowe - this.napiecie) > 0.04;
    this.napiecie = nowe;
    if (zmiana) this.ustawNiepokoj();
  }

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

    this.planujNiepokoj(teraz);

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

  /** Oddech, trzaski i chór — rzadkie zdarzenia, gęstsze z napięciem. */
  private planujNiepokoj(teraz: number): void {
    if (!this.szum) return;
    const gesciej = 1 - this.napiecie * 0.55;
    if (teraz > this.nastepnyOddech) {
      this.oddech(teraz + 0.05);
      this.nastepnyOddech = teraz + (N.oddechCo + Math.random() * N.oddechRozrzut) * gesciej;
    }
    if (teraz > this.nastepnyTrzask) {
      const ile = 1 + ((Math.random() * 3) | 0);
      for (let i = 0; i < ile; i++) this.trzask(teraz + 0.05 + i * (0.08 + Math.random() * 0.25));
      this.nastepnyTrzask = teraz + (N.trzaskCo + Math.random() * N.trzaskRozrzut) * gesciej;
    }
    if (teraz > this.nastepnyChor && this.scena !== 'samouczek') {
      this.chor(teraz + 0.1);
      this.nastepnyChor = teraz + (N.chorCo + Math.random() * N.chorRozrzut) * gesciej;
    }
  }

  /** Oddech góry: szum w paśmie, które wędruje w dół przy wydechu — z lewej albo z prawej. */
  private oddech(kiedy: number): void {
    const ctx = this.ctx!;
    const z = ctx.createBufferSource(); z.buffer = this.szum; z.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.2;
    const g = ctx.createGain();
    const wd = N.oddechWdech, wy = N.oddechWydech;
    f.frequency.setValueAtTime(380, kiedy);
    f.frequency.linearRampToValueAtTime(900, kiedy + wd);
    f.frequency.exponentialRampToValueAtTime(260, kiedy + wd + wy);
    const glos = N.oddechGlos * (0.7 + this.napiecie * 0.8);
    g.gain.setValueAtTime(0.0001, kiedy);
    g.gain.exponentialRampToValueAtTime(glos, kiedy + wd);
    g.gain.exponentialRampToValueAtTime(glos * 0.6, kiedy + wd + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, kiedy + wd + wy);
    const p = mikser.panorama((Math.random() - 0.5) * 1.4);
    z.connect(f); f.connect(g); g.connect(p); p.connect(this.master);
    const s = ctx.createGain(); s.gain.value = 0.6; g.connect(s); s.connect(mikser.poglos);
    z.start(kiedy, Math.random()); z.stop(kiedy + wd + wy + 0.2);
  }

  /** Trzask skały gdzieś w głębi: krótki, suchy, z długim echem korytarzy. */
  private trzask(kiedy: number): void {
    const ctx = this.ctx!;
    const z = ctx.createBufferSource(); z.buffer = this.szum;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600 + Math.random() * 1600; f.Q.value = 6;
    const g = ctx.createGain();
    const glos = N.trzaskGlos * (0.4 + Math.random() * 0.6);
    g.gain.setValueAtTime(0.0001, kiedy);
    g.gain.exponentialRampToValueAtTime(glos, kiedy + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, kiedy + 0.05 + Math.random() * 0.08);
    const p = mikser.panorama((Math.random() - 0.5) * 1.8);
    z.connect(f); f.connect(g); g.connect(p); p.connect(this.master);
    const s = ctx.createGain(); s.gain.value = 1.2; g.connect(s); s.connect(mikser.poglos);
    z.start(kiedy, Math.random() * 1.5); z.stop(kiedy + 0.2);
  }

  /**
   * Chór bez słów: kilka głosów na samogłoskach (formanty), wolno przechodzi korytarzem
   * z jednej strony na drugą. Śpiewa dźwięki ze skali, ale jeden głos zawsze o pół tonu za nisko.
   */
  private chor(kiedy: number): void {
    const ctx = this.ctx!;
    const dl = N.chorDlugosc * (0.8 + Math.random() * 0.5);
    const glos = N.chorGlos * (0.8 + this.napiecie * 0.9);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const wyj = ctx.createGain();
    wyj.gain.setValueAtTime(0.0001, kiedy);
    wyj.gain.exponentialRampToValueAtTime(glos, kiedy + dl * 0.4);
    wyj.gain.exponentialRampToValueAtTime(0.0001, kiedy + dl);
    if (p) {
      const strona = Math.random() < 0.5 ? -1 : 1;
      p.pan.setValueAtTime(-0.8 * strona, kiedy);
      p.pan.linearRampToValueAtTime(0.8 * strona, kiedy + dl);
      wyj.connect(p); p.connect(this.master);
    } else wyj.connect(this.master);
    const s = ctx.createGain(); s.gain.value = 0.9; wyj.connect(s); s.connect(mikser.poglos);
    const samogloska = N.formanty[(Math.random() * N.formanty.length) | 0];
    const stopnie = [0, 4, 7].map((x) => x + (Math.random() < 0.5 ? 0 : -7));
    stopnie.forEach((st, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      // jeden głos zawsze fałszuje o pół tonu — chór, który nie jest stąd
      o.frequency.value = czestotliwosc(st) * (i === 1 ? Math.pow(2, -1 / 12) : 1);
      o.detune.value = (Math.random() - 0.5) * 18;
      const vib = ctx.createOscillator(); vib.frequency.value = 4.6 + Math.random();
      const vg = ctx.createGain(); vg.gain.value = 5;
      vib.connect(vg); vg.connect(o.detune);
      for (const fh of samogloska) {
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fh; f.Q.value = 9;
        o.connect(f); f.connect(wyj);
      }
      o.start(kiedy); o.stop(kiedy + dl + 0.2);
      vib.start(kiedy); vib.stop(kiedy + dl + 0.2);
    });
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
