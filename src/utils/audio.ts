/**
 * High-tech procedural Web Audio synthesizer for Mars Colony & Harvesters.
 * Zero external audio assets, works instantly in browser.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private isAmbientRunning: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientGain) {
      this.ambientGain.gain.value = muted ? 0 : 0.05;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startAmbient() {
    if (this.isAmbientRunning || this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      this.ambientOsc = this.ctx.createOscillator();
      this.ambientGain = this.ctx.createGain();
      this.ambientFilter = this.ctx.createBiquadFilter();

      this.ambientOsc.type = 'sawtooth';
      this.ambientOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A

      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
      this.ambientFilter.Q.setValueAtTime(4, this.ctx.currentTime);

      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.04, this.ctx.currentTime);

      this.ambientOsc.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      this.ambientOsc.start();
      this.isAmbientRunning = true;
    } catch {
      // Audio autoplay policy handled silently
    }
  }

  /**
   * UI Click / Blip
   */
  public playClick(pitch: number = 800) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.6, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Ignore
    }
  }

  /**
   * Module constructed / snapped into place
   */
  public playBuild() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(160, t);
      osc1.frequency.exponentialRampToValueAtTime(320, t + 0.12);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(440, t + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(880, t + 0.2);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc1.stop(t + 0.15);
      osc2.start(t + 0.08);
      osc2.stop(t + 0.25);
    } catch {
      // Ignore
    }
  }

  /**
   * Spice Laser / Harvester Drill sound
   */
  public playMiningPulse() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(480, t + 0.08);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.12);
    } catch {
      // Ignore
    }
  }

  /**
   * Spice cargo unloaded & credits deposited
   */
  public playSpiceDelivered() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteStart = t + idx * 0.07;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.1, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.25);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Klaxon alarm for dust storm or severe event
   */
  public playAlarm() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = t + i * 0.35;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(750, start);
        osc.frequency.linearRampToValueAtTime(450, start + 0.25);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.005, start + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.3);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Rocket Launch rumble & thrusters
   */
  public playRocketLaunch() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, t);
      filter.frequency.exponentialRampToValueAtTime(800, t + 1.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 1.5);
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEngine();
