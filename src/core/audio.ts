import { ustawienia } from './settings-store';
/**
 * Nie ma muzyki. Jest rezonans: niski dźwięk kamienia, który zmienia wysokość
 * wraz z głębokością, praca słyszana jako rytm i szum modlitwy. Gdy rasa ginie,
 * jej warstwa po prostu cichnie — wymieranie słychać, zanim się je zobaczy.
 */
export class Resonance {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private drone!: OscillatorNode;
  private drone2!: OscillatorNode;
  private droneFilter!: BiquadFilterNode;
  private breath!: GainNode;
  private noiseGain!: GainNode;
  private prayGain!: GainNode;
  private prayFilter!: BiquadFilterNode;
  private nextWork = 0;
  started = false;

  start(): void {
    if (this.started) return;
    const Ctor = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return;
    this.started = true;
    const ctx: AudioContext = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    this.master.connect(ctx.destination);
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.0002, ustawienia.glosnosc * 0.55), ctx.currentTime + 4);

    // rezonans: dwa bliskie tony, dudnienie robi „oddech" skały
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 220;
    this.droneFilter.Q.value = 3;
    this.droneFilter.connect(this.master);

    this.breath = ctx.createGain();
    this.breath.gain.value = 0.28;
    this.breath.connect(this.droneFilter);

    this.drone = ctx.createOscillator();
    this.drone.type = 'sine';
    this.drone.frequency.value = 46;
    this.drone.connect(this.breath);
    this.drone.start();

    this.drone2 = ctx.createOscillator();
    this.drone2.type = 'triangle';
    this.drone2.frequency.value = 46.7;
    const g2 = ctx.createGain();
    g2.gain.value = 0.12;
    this.drone2.connect(g2); g2.connect(this.droneFilter);
    this.drone2.start();

    // szum: powietrze w korytarzach, głośniejsze, im więcej tam życia
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lastv = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      lastv = (lastv + 0.02 * white) / 1.02;       // brąz, nie biel — ciepły szum
      data[i] = lastv * 3.2;
    }
    buf.copyToChannel(data, 0);
    noise.buffer = buf; noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 340; nf.Q.value = 0.7;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.05;
    noise.connect(nf); nf.connect(this.noiseGain); this.noiseGain.connect(this.master);
    noise.start();

    // modlitwa: wąski szum, który narasta razem z wiarą
    const pray = ctx.createBufferSource();
    pray.buffer = buf; pray.loop = true;
    this.prayFilter = ctx.createBiquadFilter();
    this.prayFilter.type = 'bandpass'; this.prayFilter.frequency.value = 1400; this.prayFilter.Q.value = 6;
    this.prayGain = ctx.createGain();
    this.prayGain.gain.value = 0.0;
    pray.connect(this.prayFilter); this.prayFilter.connect(this.prayGain); this.prayGain.connect(this.master);
    pray.start();
  }

  /** Stuk kucia — praca jest rytmem, nie efektem. */
  private knock(when: number, pitch: number, level: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(pitch, when);
    o.frequency.exponentialRampToValueAtTime(pitch * 0.4, when + 0.05);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(level, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    o.connect(g); g.connect(f); f.connect(this.master);
    o.start(when); o.stop(when + 0.12);
  }

  /** depth 0..1 — na co patrzysz; work 0..1 — ilu kuje; faith 0..1; life 0..1. */
  update(depth: number, work: number, faith: number, life: number, hungerRate: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const docelowa = ustawienia.rezonans ? ustawienia.glosnosc * 0.55 : 0.0001;
    this.master.gain.setTargetAtTime(Math.max(0.0001, docelowa), t, 0.6);
    const base = 58 - depth * 26;                  // im głębiej, tym niżej dudni
    this.drone.frequency.setTargetAtTime(base, t, 1.2);
    this.drone2.frequency.setTargetAtTime(base * 1.013, t, 1.2);
    this.droneFilter.frequency.setTargetAtTime(120 + depth * 60 + life * 160, t, 1.5);
    this.breath.gain.setTargetAtTime(0.2 + 0.12 * Math.sin(t * (0.5 + hungerRate * 2)), t, 0.4);
    this.noiseGain.gain.setTargetAtTime(0.02 + life * 0.08, t, 1.5);
    this.prayGain.gain.setTargetAtTime(faith * 0.05, t, 2);
    this.prayFilter.frequency.setTargetAtTime(900 + faith * 900, t, 2);

    // rytm pracy: tym gęstszy, im więcej kilofów
    if (work > 0.01) {
      const interval = 0.9 - Math.min(0.75, work * 0.8);
      if (this.nextWork < t) this.nextWork = t + 0.05;
      while (this.nextWork < t + 0.6) {
        this.knock(this.nextWork, 160 + Math.random() * 90 - depth * 60, 0.05 + work * 0.06);
        this.nextWork += interval * (0.7 + Math.random() * 0.6);
      }
    }
  }

  /** Cud słychać jako uderzenie w skałę, nie jako fanfarę. */
  toll(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.knock(t + i * 0.16, 70 - i * 8, 0.22);
  }
}
