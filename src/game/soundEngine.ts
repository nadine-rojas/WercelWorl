class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private musicTimer = 0;
  private stepIdx = 0;

  // Escala pentatónica mayor cálida para el Día (Do mayor pentatónica)
  private readonly dayScale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
  // Escala menor atmosférica para la Noche (La menor / misteriosa)
  private readonly nightScale = [196.0, 220.0, 246.94, 261.63, 329.63, 349.23];

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private pitchJitter(baseFreq: number, pct = 0.08): number {
    return baseFreq * (1 + (Math.random() * 2 - 1) * pct);
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public playFootstep(inWater = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (inWater) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.pitchJitter(260, 0.12), now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    } else {
      osc.type = 'triangle';
      const base = this.stepIdx % 2 === 0 ? 95 : 108;
      this.stepIdx++;
      osc.frequency.setValueAtTime(this.pitchJitter(base, 0.07), now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.055);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playSwing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(310, 0.1), now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.065);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playBreak(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(this.pitchJitter(175), now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.095);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.105);
  }

  public playPlace(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(240), now);
    osc.frequency.exponentialRampToValueAtTime(345, now + 0.07);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playCraft(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [329.63, 440.0, 659.25];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    });
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchJitter(190), now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.12);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.135);
  }

  public playHit(heavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(this.pitchJitter(heavy ? 140 : 220), now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 42 : 80, now + (heavy ? 0.16 : 0.1));
    gain.gain.setValueAtTime(heavy ? 0.22 : 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.17 : 0.11));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (heavy ? 0.18 : 0.12));
  }

  public playHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.22);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playTame(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    });
  }

  /**
   * Música ambiental relajante que cambia sutilmente entre el Día y la Noche
   */
  public tickAmbientMusic(dt: number, isNight: boolean, isPlaying: boolean): void {
    if (this.muted || !isPlaying || !this.ctx || this.ctx.state !== 'running') return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;

    // Intervalo suave entre notas ambientales (2.4s a 4.2s)
    this.musicTimer = (isNight ? 2.8 : 2.2) + Math.random() * 1.8;

    const scale = isNight ? this.nightScale : this.dayScale;
    const freq = scale[Math.floor(Math.random() * scale.length)];
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    subOsc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    subOsc.frequency.setValueAtTime(freq * 0.5, now);

    const dur = isNight ? 3.2 : 2.6;
    const peakGain = isNight ? 0.026 : 0.032;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + dur + 0.05);
    subOsc.stop(now + dur + 0.05);
  }
}

export const soundEngine = new SoundEngine();
