/**
 * Colony audio. Red Horizon loops as the ambient score.
 * The other cues are synthesized, and the alarm and drill refuse to stack.
 */

export type SoundCue = 'music' | 'ui' | 'build' | 'mining' | 'delivery' | 'alarm' | 'rocket';

export type SoundPrefs = Record<SoundCue, boolean>;

const PREF_KEY = 'ares_audio_prefs_v1';

const DEFAULT_PREFS: SoundPrefs = {
  music: true,
  ui: true,
  build: true,
  mining: true,
  delivery: true,
  alarm: true,
  rocket: true,
};

function loadPrefs(): SoundPrefs {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<SoundPrefs>;
    const prefs = { ...DEFAULT_PREFS };
    (Object.keys(DEFAULT_PREFS) as SoundCue[]).forEach((cue) => {
      if (typeof parsed[cue] === 'boolean') prefs[cue] = parsed[cue];
    });
    return prefs;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noise: AudioBuffer | null = null;
  private isMuted = false;
  private prefs: SoundPrefs = loadPrefs();
  private music: HTMLAudioElement | null = null;
  private readonly musicVolume = 0.32;
  private isAmbientRunning = false;
  private lastAlarm = 0;
  private lastMining = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 8;
      this.compressor.ratio.value = 3;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.18;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.isMuted ? 0 : 0.9;
      this.compressor.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private dest(): AudioNode | null {
    this.initCtx();
    return this.compressor;
  }

  private noiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noise) return this.noise;
    const length = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }

  private burst(opts: {
    type?: OscillatorType;
    freq: number;
    endFreq?: number;
    start: number;
    dur: number;
    gain: number;
  }) {
    if (!this.ctx || !this.compressor) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, opts.start);
    if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.endFreq), opts.start + opts.dur);
    gain.gain.setValueAtTime(opts.gain, opts.start);
    gain.gain.exponentialRampToValueAtTime(0.001, opts.start + opts.dur);
    osc.connect(gain);
    gain.connect(this.compressor);
    osc.start(opts.start);
    osc.stop(opts.start + opts.dur + 0.02);
  }

  private allows(cue: SoundCue) {
    return !this.isMuted && this.prefs[cue];
  }

  public getPrefs(): SoundPrefs {
    return { ...this.prefs };
  }

  public setCue(cue: SoundCue, enabled: boolean) {
    this.prefs = { ...this.prefs, [cue]: enabled };
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(this.prefs));
    } catch {
      // The choice still applies for this session.
    }
    if (cue === 'music') {
      if (!enabled) this.music?.pause();
      else if (!this.isMuted) this.startAmbient();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
    if (!this.music) return;
    if (muted || !this.prefs.music) {
      this.music.pause();
    } else {
      this.music.volume = this.musicVolume;
      this.music.play().catch(() => {
        // The next click resumes the score.
      });
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startAmbient(): Promise<boolean> {
    if (!this.prefs.music) return Promise.resolve(true);
    if (this.music && !this.music.paused && !this.music.ended) return Promise.resolve(true);
    if (!this.music) {
      const music = new Audio('/audio/red-horizon.mp3');
      music.loop = true;
      music.preload = 'auto';
      music.volume = 0;
      this.music = music;
    }
    if (this.isMuted || !this.prefs.music) return Promise.resolve(true);

    const started = performance.now();
    const fade = () => {
      if (!this.music || this.isMuted || !this.prefs.music) return;
      const t = Math.min(1, (performance.now() - started) / 1600);
      this.music.volume = this.musicVolume * t;
      if (t < 1) requestAnimationFrame(fade);
    };
    return this.music.play().then(() => {
      this.isAmbientRunning = true;
      fade();
      return true;
    }).catch(() => false);
  }

  /** Short UI tick. Pitch distinguishes which control was pressed. */
  public playClick(pitch: number = 800) {
    if (!this.allows('ui')) return;
    const dest = this.dest();
    if (!this.ctx || !dest) return;
    try {
      const t = this.ctx.currentTime;
      this.burst({ freq: pitch, endFreq: pitch * 0.72, start: t, dur: 0.045, gain: 0.07 });
      this.burst({ type: 'triangle', freq: pitch * 2, start: t, dur: 0.02, gain: 0.03 });
    } catch {
      // Ignore a closed audio device.
    }
  }

  /** Module or rover locking into place. */
  public playBuild() {
    if (!this.allows('build')) return;
    const dest = this.dest();
    if (!this.ctx || !dest) return;
    try {
      const t = this.ctx.currentTime;
      this.burst({ freq: 92, endFreq: 48, start: t, dur: 0.16, gain: 0.16 });
      this.burst({ type: 'triangle', freq: 392, endFreq: 523, start: t + 0.05, dur: 0.14, gain: 0.07 });
      this.burst({ type: 'triangle', freq: 587, endFreq: 784, start: t + 0.1, dur: 0.16, gain: 0.06 });
    } catch {
      // Ignore a closed audio device.
    }
  }

  /** One scoop of the harvester drill. Calls closer than 0.4s are dropped. */
  public playMiningPulse() {
    if (!this.allows('mining')) return;
    const now = performance.now();
    if (now - this.lastMining < 400) return;
    this.lastMining = now;
    const dest = this.dest();
    if (!this.ctx || !dest) return;
    try {
      const t = this.ctx.currentTime;
      const buffer = this.noiseBuffer();
      if (buffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 4;
        filter.frequency.setValueAtTime(280, t);
        filter.frequency.exponentialRampToValueAtTime(1400, t + 0.14);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        src.start(t);
        src.stop(t + 0.16);
      }
      this.burst({ type: 'square', freq: 78, endFreq: 54, start: t, dur: 0.09, gain: 0.04 });
    } catch {
      // Ignore a closed audio device.
    }
  }

  /** Cargo hatch closing, then a short confirmation. */
  public playSpiceDelivered() {
    if (!this.allows('delivery')) return;
    const dest = this.dest();
    if (!this.ctx || !dest) return;
    try {
      const t = this.ctx.currentTime;
      this.burst({ freq: 110, endFreq: 70, start: t, dur: 0.12, gain: 0.12 });
      [659.25, 880, 1174.66].forEach((freq, idx) => {
        this.burst({ type: 'triangle', freq, start: t + 0.08 + idx * 0.07, dur: 0.16, gain: 0.07 });
      });
    } catch {
      // Ignore a closed audio device.
    }
  }

  /** Two-tone klaxon. A second alarm inside 1.2s is ignored. */
  public playAlarm() {
    if (!this.allows('alarm')) return;
    const now = performance.now();
    if (now - this.lastAlarm < 1200) return;
    this.lastAlarm = now;
    const dest = this.dest();
    if (!this.ctx || !dest) return;
    try {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const start = t + i * 0.22;
        this.burst({ type: 'square', freq: i % 2 === 0 ? 740 : 494, start, dur: 0.12, gain: 0.06 });
      }
    } catch {
      // Ignore a closed audio device.
    }
  }

  /** Pad rumble, opening exhaust, and a rising thrust tone. */
  public playRocketLaunch() {
    if (!this.allows('rocket')) return;
    const dest = this.dest();
    if (!this.ctx || !dest) return;
    try {
      const t = this.ctx.currentTime;
      this.burst({ freq: 46, endFreq: 78, start: t, dur: 1.6, gain: 0.14 });
      const buffer = this.noiseBuffer();
      if (buffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, t);
        filter.frequency.exponentialRampToValueAtTime(1600, t + 1.1);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.02, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.7);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        src.start(t);
        src.stop(t + 1.7);
      }
      this.burst({ type: 'sawtooth', freq: 180, endFreq: 640, start: t + 0.25, dur: 1.2, gain: 0.035 });
    } catch {
      // Ignore a closed audio device.
    }
  }

  /** Play one cue even when its checkbox is off, so the menu can demonstrate it. */
  public preview(cue: SoundCue) {
    if (this.isMuted) return;
    if (cue === 'music') {
      const was = this.prefs.music;
      this.prefs.music = true;
      this.startAmbient();
      this.prefs.music = was;
      if (!was) {
        window.setTimeout(() => {
          if (!this.prefs.music) this.music?.pause();
        }, 4000);
      }
      return;
    }
    const was = this.prefs[cue];
    this.prefs[cue] = true;
    if (cue === 'ui') this.playClick(740);
    else if (cue === 'build') this.playBuild();
    else if (cue === 'mining') this.playMiningPulse();
    else if (cue === 'delivery') this.playSpiceDelivered();
    else if (cue === 'alarm') this.playAlarm();
    else this.playRocketLaunch();
    this.prefs[cue] = was;
  }
}

export const sound = new SoundEngine();
