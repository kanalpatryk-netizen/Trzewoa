import { mikser } from './mikser';
import { ustawienia } from './settings-store';
import { GESTY, GLOSY_LUDU, type KwestiaLudu } from '../nastawy/dzwiek';
import type { Rola } from '../nastawy/lud';
import { GlosOdmowy, type KtoMowi } from './glos-odmowy';
import { GlosyLudu } from './glosy-ludu';
import type { Nagranie } from './nagrania';

/** Pentatonika od D — kaskada wykonanego planu wspina się po niej, nigdy nie fałszuje. */
const KASKADA = GESTY.kaskada;
/** Głośność i odstępy każdego gestu — nastawy/dzwiek.ts. */
const V = GESTY.glosnosc, ODS = GESTY.odstepMs;

/**
 * Dźwięki gestów: każdy zamiar gracza zostawia ślad w uchu, zanim cokolwiek się stanie.
 * Szkic rozkazu skrzypi jak rylec po miedzi, puszczony czas oddycha, ostrzeżenie
 * uderza w dzwon. Wszystko ciche i krótkie — to potwierdzenie, nie nagroda.
 */
export class Gesty {
  private ctx: AudioContext | null = null;
  private szum: AudioBuffer | null = null;
  private ostatnie = new Map<string, number>();
  private ton: { g: GainNode; zrodla: AudioScheduledSourceNode[] } | null = null;
  private glosy: Record<KtoMowi, GlosOdmowy> = { rycerz: new GlosOdmowy('rycerz'), pobozny: new GlosOdmowy('pobozny') };
  private glosyLudu = new GlosyLudu();
  /**
   * Kto teraz mówi: do kiedy (zegar kontekstu), jak ważna jest kwestia (GLOSY_LUDU.waga) i czym ją uciszyć. Naraz mówi
   * jeden — ważniejsza kwestia ucina tę, która trwa, a mniej ważna nie wchodzi nikomu w słowo.
   */
  private mowa: { do: number; waga: number; kwestia: string; g: GainNode; src: AudioBufferSourceNode } | null = null;

  start(): void {
    if (this.ctx) return;
    this.ctx = mikser.kontekst();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.szum = buf;
    for (const g of Object.values(this.glosy)) g.wczytaj(ctx);
    this.glosyLudu.wczytaj(ctx);
    this.odswiezGlosnosc();
  }

  odswiezGlosnosc(): void {
    if (!this.ctx) return;
    const v = ustawienia.efekty ? ustawienia.glosnosc : 0;
    mikser.gesty.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    if (!ustawienia.efekty) this.tonPauzy(false);
  }

  private get gotowe(): boolean { return !!this.ctx && ustawienia.efekty && ustawienia.glosnosc > 0; }

  /** Ten sam gest nie może terkotać — malowanie planu to dziesiątki kafli na sekundę. */
  private wolno(klucz: string, ms: number): boolean {
    const teraz = performance.now();
    if (teraz - (this.ostatnie.get(klucz) ?? -1e9) < ms) return false;
    this.ostatnie.set(klucz, teraz);
    return true;
  }

  private wyjscie(pan: number, poglos: number): AudioNode {
    const p = mikser.panorama(pan);
    p.connect(mikser.gesty);
    if (poglos > 0) {
      const s = this.ctx!.createGain();
      s.gain.value = poglos;
      p.connect(s); s.connect(mikser.poglos);
    }
    return p;
  }

  /** Rylec po miedzi: krótki szum, którego pasmo przesuwa się z ruchem ręki. */
  private rylec(kiedy: number, dlugosc: number, od: number, doHz: number, glosno: number, pan = 0, poglos = 0.12): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.szum;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 2.2;
    f.frequency.setValueAtTime(od, kiedy);
    f.frequency.exponentialRampToValueAtTime(doHz, kiedy + dlugosc);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, kiedy);
    g.gain.exponentialRampToValueAtTime(glosno, kiedy + Math.min(0.02, dlugosc * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, kiedy + dlugosc);
    src.connect(f); f.connect(g); g.connect(this.wyjscie(pan, poglos));
    src.start(kiedy, Math.random() * 0.8); src.stop(kiedy + dlugosc + 0.05);
  }

  /** Uderzenie w drewno albo kamień: sinus, który od razu opada. */
  private stuk(kiedy: number, hz: number, glosno: number, dlugosc = 0.12, pan = 0, poglos = 0.2): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(hz * 1.6, kiedy);
    o.frequency.exponentialRampToValueAtTime(hz, kiedy + 0.012);
    o.frequency.exponentialRampToValueAtTime(hz * 0.7, kiedy + dlugosc);
    g.gain.setValueAtTime(0.0001, kiedy);
    g.gain.exponentialRampToValueAtTime(glosno, kiedy + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, kiedy + dlugosc);
    o.connect(g); g.connect(this.wyjscie(pan, poglos));
    o.start(kiedy); o.stop(kiedy + dlugosc + 0.05);
  }

  /**
   * Kamień: niski stuk z dwoma nieharmonicznymi alikwotami i chrzęstem. Sam sinus
   * poniżej 150 Hz ginął w telefonie — alikwoty niosą uderzenie tam, gdzie głośnik gra.
   */
  private kamien(kiedy: number, hz: number, glosno: number, dlugosc = 0.3, pan = 0, poglos = 0.4): void {
    this.stuk(kiedy, hz, glosno, dlugosc, pan, poglos);
    this.stuk(kiedy, hz * 2.32, glosno * 0.55, dlugosc * 0.6, pan, poglos);
    this.stuk(kiedy, hz * 4.1, glosno * 0.3, dlugosc * 0.35, pan, poglos * 0.5);
    this.rylec(kiedy, Math.min(0.12, dlugosc * 0.5), 900, 300, glosno * 0.9, pan, poglos * 0.5);
  }

  /** Dzwon: ten sam nieharmoniczny metal co w muzyce, tylko bliżej ucha. */
  private dzwon(kiedy: number, hz: number, glosno: number, ogon = 3, pan = 0, poglos = 0.5): void {
    const ctx = this.ctx!;
    const nosna = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modG = ctx.createGain();
    const g = ctx.createGain();
    nosna.type = 'sine'; nosna.frequency.value = hz;
    mod.type = 'sine'; mod.frequency.value = hz * 2.76;
    modG.gain.setValueAtTime(hz * 1.8, kiedy);
    modG.gain.exponentialRampToValueAtTime(hz * 0.2, kiedy + ogon * 0.6);
    mod.connect(modG); modG.connect(nosna.frequency);
    g.gain.setValueAtTime(0.0001, kiedy);
    g.gain.exponentialRampToValueAtTime(glosno, kiedy + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, kiedy + ogon);
    nosna.connect(g); g.connect(this.wyjscie(pan, poglos));
    nosna.start(kiedy); nosna.stop(kiedy + ogon + 0.1);
    mod.start(kiedy); mod.stop(kiedy + ogon + 0.1);
  }

  /** Wybór rytu, narzędzia, przycisku — cichy stuk palca w drewno. */
  klik(): void {
    if (!this.gotowe || !this.wolno('klik', ODS.klik)) return;
    this.stuk(this.ctx!.currentTime, 660, 0.3 * V.klik, 0.05, 0, 0.05);
  }

  /** Rozkaz naszkicowany w pauzie: rylec rysuje kreskę. */
  szkic(): void {
    if (!this.gotowe || !this.wolno('szkic', ODS.szkic)) return;
    const t = this.ctx!.currentTime;
    const pan = (Math.random() - 0.5) * 0.5;
    this.rylec(t, 0.08 + Math.random() * 0.04, 4200, 2000 + Math.random() * 600, 1.1 * V.szkic, pan);
    this.stuk(t, 1400, 0.12 * V.szkic, 0.03, pan, 0);
  }

  /** Szkic skreślony: dwa szybkie pociągnięcia w poprzek. */
  skresl(wszystko = false): void {
    if (!this.gotowe || !this.wolno('skresl', ODS.skresl)) return;
    const t = this.ctx!.currentTime;
    this.rylec(t, 0.1, 1500, 3200, 0.9 * V.skresl, -0.2);
    this.rylec(t + 0.09, wszystko ? 0.3 : 0.12, 3200, 1200, 0.8 * V.skresl, 0.2);
  }

  /** Nie wyszło: głuchy stuk, jak pięść w skałę, która nie ustąpiła. */
  odmowa(): void {
    if (!this.gotowe || !this.wolno('odmowa', ODS.odmowa)) return;
    const t = this.ctx!.currentTime;
    this.kamien(t, 150, 0.28 * V.odmowa, 0.18, 0, 0.1);
    this.kamien(t + 0.1, 118, 0.16 * V.odmowa, 0.22, 0, 0.1);
  }

  /**
   * Rycerz albo pobożny odmawia na głos: jedno z jego nagrań (nastawy/dzwiek.ts — GLOS_RYCERZA, GLOS_POBOZNEGO,
   * szanse rzadkości), tuż po głuchym stuku odmowy. `pan` — gdzie stoi na ekranie (−1 lewo … 1 prawo). Zwraca, czy
   * powiedział — false, gdy dźwięk wyłączony, nagrania jeszcze się nie wczytały albo ktoś jeszcze mówi coś nie mniej
   * ważnego (poprzednia odmowa, potwierdzenie, okrzyk, ból).
   */
  glosOdmowy(kto: KtoMowi, pan = 0): boolean {
    const glos = this.glosy[kto], G = glos.G, waga = GLOSY_LUDU.waga.odmowa;
    if (!this.gotowe || !this.wolnoMowic('odmowa', waga) || !this.wolno(`glos:${kto}`, G.odstepMs)) return false;
    const n = glos.losuj();
    if (!n) return false;
    this.powiedz(n, 'odmowa', waga, G.glosnosc, G.poglos, G.opoznienie, pan, GLOSY_LUDU.wysokosc[kto]);
    return true;
  }

  /**
   * Postać z ludu mówi kwestię z gra222/dzwieki/jednostki/ (nastawy/dzwiek.ts — GLOSY_LUDU): potwierdza rozkaz, krzyczy
   * do walki, jęczy z bólu albo marudzi z głodu — kiedy, decyduje ekran gry. Ważniejsza kwestia ucina tę, która trwa;
   * nowe potwierdzenie ucina poprzednie (najwyżej co `potwierdzenie.odstep` s), a z `ucinaSiebie` każda kwestia ucina
   * taką samą (jęk przy śmierci). Zwraca, czy powiedziała — false, gdy dźwięk wyłączony, rola nie ma tej kwestii,
   * nagrania jeszcze się nie wczytały albo ktoś mówi coś nie mniej ważnego.
   */
  glosLudu(rola: Rola, kwestia: KwestiaLudu, pan = 0, ucinaSiebie = false): boolean {
    const L = GLOSY_LUDU, waga = L.waga[kwestia], potw = kwestia === 'potwierdzenie';
    if (!this.gotowe || !this.glosyLudu.ma(rola, kwestia) || !this.wolnoMowic(kwestia, waga, potw || ucinaSiebie)) return false;
    if (potw && !this.wolno('ludu:potwierdzenie', L.potwierdzenie.odstep * 1000)) return false;
    const n = this.glosyLudu.losuj(rola, kwestia);
    if (!n) return false;
    this.powiedz(n, kwestia, waga, L.glosnosc, L.poglos, potw ? L.potwierdzenie.opoznienie : 0, pan, L.wysokosc[rola]);
    return true;
  }

  /** Czy ta rola ma jakąkolwiek kwestię z gra222/dzwieki/jednostki/ (ekran gry śledzi tylko te postacie). */
  maGlos(rola: Rola): boolean { return this.glosyLudu.ma(rola); }

  /** Czy kwestia o tej wadze może teraz zabrzmieć: nikt nie mówi, mówi się coś mniej ważnego albo (`ucinaSiebie`) to samo. */
  private wolnoMowic(kwestia: string, waga: number, ucinaSiebie = false): boolean {
    const m = this.mowa;
    return !m || this.ctx!.currentTime >= m.do || waga > m.waga || (ucinaSiebie && m.kwestia === kwestia);
  }

  /**
   * Nagranie mowy wchodzi po `opoznienie` s; to, co jeszcze trwało, gaśnie w kilka setnych sekundy (bez trzasku).
   * `wysokosc` (centy, GLOSY_LUDU.wysokosc) obniża albo podnosi głos — wolniejszym albo szybszym odtwarzaniem.
   */
  private powiedz(n: Nagranie, kwestia: string, waga: number, glosnosc: number, poglos: number, opoznienie: number, pan: number, wysokosc = 0): void {
    const ctx = this.ctx!, teraz = ctx.currentTime;
    const m = this.mowa;
    if (m && teraz < m.do) {
      m.g.gain.setTargetAtTime(0, teraz, 0.015);
      m.src.stop(teraz + 0.08);
    }
    const t = teraz + opoznienie;
    const src = ctx.createBufferSource();
    src.buffer = n.bufor;
    const tempo = 2 ** (wysokosc / 1200);
    src.playbackRate.value = tempo;
    const g = ctx.createGain();
    g.gain.value = n.wzm * glosnosc;
    src.connect(g); g.connect(this.wyjscie(pan, poglos));
    src.start(t, n.od, n.dl);
    this.mowa = { do: t + n.dl / tempo, waga, kwestia, g, src };
  }

  /**
   * Czas staje: kamień osiada, powietrze zamiera, zostaje cichy ton zawieszenia.
   * Czas rusza: oddech w górę pasma. Samo przytłumienie świata robi mikser.
   */
  pauza(stoi: boolean, bezUderzenia = false): void {
    if (!this.gotowe) { this.tonPauzy(false); return; }
    const t = this.ctx!.currentTime;
    if (stoi) {
      if (!bezUderzenia) {
        this.kamien(t, 72, 0.34 * V.pauza, 0.5, 0, 0.6);
        this.rylec(t, 0.5, 1600, 260, 0.14 * V.pauza, 0, 0.3);
      }
      this.tonPauzy(true);
    } else {
      this.rylec(t, 0.5, 280, 2400, 0.18 * V.pauza, 0, 0.3);
      this.kamien(t + 0.05, 104, 0.16 * V.pauza, 0.3, 0, 0.4);
      this.tonPauzy(false);
    }
  }

  /**
   * Ton zawieszenia: kwinta D–A, wysoko i ledwo słyszalnie, falująca raz na kilka
   * sekund — jak dzwonienie w uszach w zupełnej ciszy. Znika, gdy czas rusza.
   */
  tonPauzy(on: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (!on) {
      if (!this.ton) return;
      const { g, zrodla } = this.ton;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, 0.15);
      for (const z of zrodla) z.stop(t + 1);
      this.ton = null;
      return;
    }
    if (this.ton || !this.gotowe) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.setTargetAtTime(0.028 * V.tonPauzy, t + 0.4, 1.4);
    const wyj = this.wyjscie(0, 0.6);
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.13;
    lfoG.gain.value = 0.6;
    const drzenie = ctx.createGain();
    drzenie.gain.value = 1;
    lfo.connect(lfoG); lfoG.connect(drzenie.gain);
    g.connect(drzenie); drzenie.connect(wyj);
    const zrodla: AudioScheduledSourceNode[] = [lfo];
    for (const [hz, v] of [[587.33, 1], [880.9, 0.55], [1174.2, 0.18]] as const) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz;
      og.gain.value = v;
      o.connect(og); og.connect(g);
      o.start(t);
      zrodla.push(o);
    }
    lfo.start(t);
    this.ton = { g, zrodla };
  }

  /** Plan staje się ciałem: kaskada stuków w górę, po jednym na każdy rozkaz. */
  wykonanie(udane: number, nieudane: number): void {
    if (!this.gotowe) return;
    const t = this.ctx!.currentTime + 0.05;
    const n = Math.min(8, udane);
    for (let i = 0; i < n; i++) {
      const pan = n > 1 ? -0.5 + i / (n - 1) : 0;
      this.stuk(t + i * 0.075, KASKADA[i], 0.1 * V.wykonanie, 0.22, pan, 0.35);
    }
    if (n) this.dzwon(t + n * 0.075, KASKADA[Math.min(7, n)] / 2, 0.08 * V.wykonanie, 2.4, 0, 0.6);
    for (let i = 0; i < Math.min(3, nieudane); i++) this.kamien(t + n * 0.075 + 0.12 + i * 0.1, 130, 0.16 * V.wykonanie, 0.2, 0, 0.1);
  }

  /**
   * Góra woła o uwagę. Kryzys: dwa dzwony o pół tonu od siebie, zgrzyt, który
   * nie daje się zignorować. Wydarzenie: czysta kwinta.
   */
  alarm(kryzys: boolean): void {
    if (!this.gotowe) return;
    const t = this.ctx!.currentTime;
    if (kryzys) {
      mikser.przycisz(2.6);
      const k = V.alarmKryzys;
      this.kamien(t, 58, 0.4 * k, 0.6, 0, 0.7);
      this.dzwon(t + 0.02, 146.83, 0.34 * k, 5, -0.25, 0.7);
      this.dzwon(t + 0.05, 155.56, 0.22 * k, 4.5, 0.25, 0.7);
      this.dzwon(t + 0.9, 293.66, 0.12 * k, 3.5, 0, 0.6);
    } else {
      mikser.przycisz(1.6, 0.55);
      this.dzwon(t, 293.66, 0.2 * V.alarmWydarzenie, 3.5, -0.15, 0.6);
      this.dzwon(t + 0.32, 440, 0.13 * V.alarmWydarzenie, 3, 0.15, 0.6);
    }
  }

  /** Etap 5: Wielki Pomnik pęka — głuchy trzask kamienia i chrzęst rysy. */
  pekniecie(): void {
    if (!this.gotowe) return;
    const t = this.ctx!.currentTime;
    this.kamien(t, 82, 0.42, 0.7, 0, 0.6);
    this.rylec(t + 0.02, 0.35, 2600, 500, 0.5, 0.1, 0.4);
    this.kamien(t + 0.18, 64, 0.28, 0.9, -0.1, 0.7);
  }

  /** Etap 5: pomnik rozpada się w gruz — długi łoskot, kamienie spadają jeden po drugim. */
  rozpadPomnika(): void {
    if (!this.gotowe) return;
    const t = this.ctx!.currentTime;
    mikser.przycisz(3, 0.5);
    this.kamien(t, 52, 0.5, 1.4, 0, 0.8);
    this.rylec(t + 0.5, 0.9, 1800, 220, 0.6, 0, 0.5);
    for (let i = 0; i < 9; i++) this.kamien(t + 0.55 + i * 0.12 + Math.random() * 0.08, 70 + Math.random() * 60, 0.22, 0.35, (Math.random() - 0.5) * 0.8, 0.5);
  }

  /** Etap 5: ostatnie uderzenie — brzęk ostrza, uderzenie w kamień i dzwony, długo wybrzmiewające. */
  ostatnieUderzenie(): void {
    if (!this.gotowe) return;
    const t = this.ctx!.currentTime;
    mikser.przycisz(5, 0.3);
    this.stuk(t, 1900, 0.35, 0.25, 0, 0.6);
    this.kamien(t + 0.02, 48, 0.55, 1.6, 0, 0.9);
    this.dzwon(t + 0.05, 146.83, 0.3, 6, -0.2, 0.8);
    this.dzwon(t + 0.08, 220, 0.22, 5.5, 0.2, 0.8);
    this.dzwon(t + 1.6, 293.66, 0.2, 5, 0, 0.8);
  }

  /** Etap 5b: dłoń z otchłani wyrasta z podłogi (albo ze stropu) — chrzęst pękającej skały i głuchy pomruk z dołu. */
  dlonWyrasta(zeStropu = false): void {
    if (!this.gotowe) return;
    const t = this.ctx!.currentTime;
    this.kamien(t, zeStropu ? 95 : 60, 0.4, 0.8, 0, 0.6);
    this.rylec(t + 0.05, 0.6, zeStropu ? 3000 : 1800, 300, 0.45, 0, 0.4);
    this.stuk(t + 0.1, 41, 0.35, 1.2, 0, 0.7);
  }

  /** Etap 5b: rzut — świst powietrza w górę. */
  rzutDloni(): void {
    if (!this.gotowe) return;
    const t = this.ctx!.currentTime;
    this.rylec(t, 0.45, 600, 4200, 0.7, 0.3, 0.3);
    this.rylec(t + 0.08, 0.35, 900, 3000, 0.4, -0.3, 0.3);
  }

  /** Etap 5b: ciśnięty spada na ziemię — ciężkie uderzenie i chrzęst zbroi. */
  upadek(): void {
    if (!this.gotowe || !this.wolno('upadek', 300)) return;
    const t = this.ctx!.currentTime;
    this.kamien(t, 70, 0.45, 0.5, 0, 0.4);
    this.stuk(t + 0.02, 1300, 0.12, 0.12, 0, 0.2);
    this.stuk(t + 0.07, 900, 0.08, 0.1, 0, 0.2);
  }

  /** Etap 5b: cios odbija się od tarczy z dłoni — tępe plaśnięcie i dzwonienie ostrza. */
  odbicieOdDloni(): void {
    if (!this.gotowe || !this.wolno('odbicie', 200)) return;
    const t = this.ctx!.currentTime;
    this.stuk(t, 180, 0.4, 0.2, 0, 0.3);
    this.dzwon(t + 0.01, 1480, 0.05, 0.8, 0.1, 0.3);
  }

  /** Etap 5b: zawał stropu — lawina kamieni. */
  zawalStropu(): void {
    if (!this.gotowe) return;
    const t = this.ctx!.currentTime;
    mikser.przycisz(2, 0.6);
    this.kamien(t, 48, 0.55, 1.5, 0, 0.8);
    for (let i = 0; i < 12; i++) this.kamien(t + 0.05 + i * 0.07 + Math.random() * 0.05, 60 + Math.random() * 90, 0.2, 0.3, (Math.random() - 0.5) * 0.6, 0.5);
    this.rylec(t + 0.1, 1.2, 1400, 180, 0.5, 0, 0.6);
  }

  /** Karta atlasu: szelest papieru — trzy krótkie tarcia. */
  kartka(): void {
    if (!this.gotowe || !this.wolno('kartka', ODS.kartka)) return;
    const t = this.ctx!.currentTime;
    this.rylec(t, 0.06, 5200, 3600, 0.55 * V.kartka, -0.2, 0.05);
    this.rylec(t + 0.05, 0.1, 3800, 6000, 0.7 * V.kartka, 0.1, 0.05);
    this.rylec(t + 0.13, 0.14, 6000, 2800, 0.4 * V.kartka, 0.25, 0.08);
  }

  /** Nowa tablica: kartka i dwa jasne dzwonki — odkrycie, nie alarm. */
  tablica(): void {
    if (!this.gotowe) return;
    const t = this.ctx!.currentTime;
    this.kartka();
    this.dzwon(t + 0.12, 587.33, 0.1 * V.tablica, 2.6, -0.2, 0.6);
    this.dzwon(t + 0.3, 880, 0.08 * V.tablica, 2.8, 0.2, 0.6);
  }
}
