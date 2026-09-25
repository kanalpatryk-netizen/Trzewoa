/**
 * Jedna przestrzeń dźwięku dla całej gry. Muzyka i rezonans świata płyną wspólną
 * szyną, którą pauza przytłumia — czas stoi, więc góra brzmi jak zza ściany.
 * Gesty gracza idą obok i zostają wyraźne. Całość przechodzi przez pogłos jaskini
 * i miękki ogranicznik, żeby nic nie charczało na małym głośniku telefonu.
 */
class Mikser {
  ctx: AudioContext | null = null;
  /** Muzyka i rezonans — przytłumiane, kiedy świat stoi. */
  swiat!: GainNode;
  /** Gesty gracza: szkic, pauza, ostrzeżenia. */
  gesty!: GainNode;
  /** Wysyłka do pogłosu jaskini. */
  poglos!: GainNode;
  private tlumik!: BiquadFilterNode;
  private przyciszenie!: GainNode;
  private zawieszenie = 0;

  /** Kontekst powstaje dopiero przy pierwszym dotknięciu — wcześniej przeglądarka go nie wpuści. */
  kontekst(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    let ctx: AudioContext;
    try { ctx = new Ctor(); } catch { return null; }
    this.ctx = ctx;

    const ogranicznik = ctx.createDynamicsCompressor();
    ogranicznik.threshold.value = -10;
    ogranicznik.knee.value = 8;
    ogranicznik.ratio.value = 6;
    ogranicznik.attack.value = 0.005;
    ogranicznik.release.value = 0.25;
    ogranicznik.connect(ctx.destination);
    // cała gra o kilka decybeli głośniej niż kiedyś — zapas zjadało dudnienie, którego
    // telefon i tak nie gra; szczyty łapie ogranicznik
    const wzmocnienie = ctx.createGain();
    wzmocnienie.gain.value = 1.6;
    wzmocnienie.connect(ogranicznik);

    this.przyciszenie = ctx.createGain();
    this.przyciszenie.connect(wzmocnienie);

    this.tlumik = ctx.createBiquadFilter();
    this.tlumik.type = 'lowpass';
    this.tlumik.frequency.value = 16000;
    this.tlumik.Q.value = 0.6;
    this.tlumik.connect(this.przyciszenie);

    this.swiat = ctx.createGain();
    this.swiat.connect(this.tlumik);

    this.gesty = ctx.createGain();
    this.gesty.gain.value = 0;
    this.gesty.connect(wzmocnienie);

    const splot = ctx.createConvolver();
    splot.buffer = jaskinia(ctx, 3.4);
    splot.connect(this.tlumik);
    this.poglos = ctx.createGain();
    this.poglos.connect(splot);
    return ctx;
  }

  /** Telefon usypia dźwięk w tle; wraca przy pierwszym dotknięciu albo powrocie karty. */
  wznow(): void {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => { /* bez gestu nie wolno */ });
  }

  usnij(): void {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => { /* nic */ });
  }

  /**
   * 0 — świat płynie; 1 — pauza: góra słychać jak przez skałę; pomiędzy — otwarta
   * karta albo atlas, kiedy uwaga idzie na tekst.
   */
  zawies(ile: number): void {
    if (!this.ctx || ile === this.zawieszenie) return;
    this.zawieszenie = ile;
    const t = this.ctx.currentTime;
    const hz = 16000 * Math.pow(420 / 16000, Math.max(0, Math.min(1, ile)));
    this.tlumik.frequency.cancelScheduledValues(t);
    this.tlumik.frequency.setTargetAtTime(hz, t, ile > 0 ? 0.3 : 0.18);
    this.swiat.gain.cancelScheduledValues(t);
    this.swiat.gain.setTargetAtTime(1 - ile * 0.35, t, 0.4);
  }

  /** Ostrzeżenie przygasza całą resztę na chwilę, żeby było je słychać i na telefonie. */
  przycisz(sekundy: number, doPoziomu = 0.35): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.przyciszenie.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(doPoziomu, t, 0.06);
    g.setTargetAtTime(1, t + sekundy, 0.9);
  }

  /** Węzeł kierujący dźwięk w lewo albo w prawo (-1..1); stare przeglądarki grają środkiem. */
  panorama(x: number): AudioNode {
    const ctx = this.ctx!;
    if (typeof ctx.createStereoPanner !== 'function') return ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, x));
    return p;
  }
}

/**
 * Odpowiedź impulsowa jaskini: kilka wczesnych odbić od bliskich ścian, potem
 * ciemniejący ogon — im dalej w skałę, tym mniej zostaje z wysokich tonów.
 */
function jaskinia(ctx: AudioContext, sekundy: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * sekundy);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = buf.getChannelData(k);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      lp += (Math.random() * 2 - 1 - lp) * (0.55 - 0.45 * t);
      d[i] = lp * Math.pow(1 - t, 2.8) * 0.5;
    }
    for (let e = 0; e < 7; e++) {
      const i = Math.floor(ctx.sampleRate * (0.009 + e * 0.014 + Math.random() * 0.02));
      if (i < n) d[i] += (Math.random() < 0.5 ? -1 : 1) * (0.55 - e * 0.06);
    }
  }
  return buf;
}

export const mikser = new Mikser();
