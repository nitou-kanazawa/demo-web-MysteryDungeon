/**
 * Web Audio で効果音と BGM を合成する薄いラッパー。音源ファイルは使わない。
 * AudioContext はブラウザの制約でユーザー操作後にしか鳴らせないので、
 * 最初のキー入力で unlock() を呼ぶ。
 */
export class AudioEngine {
  private ctx: AudioContext | undefined;
  private master: GainNode | undefined;
  private sfxBus: GainNode | undefined;
  private bgmBus: GainNode | undefined;
  private noiseBuffer: AudioBuffer | undefined;

  /** ユーザー操作の中で呼ぶ（AudioContext の生成・再開） */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.bgmBus = this.ctx.createGain();
      this.bgmBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get ready(): boolean {
    return this.ctx !== undefined && this.ctx.state === 'running';
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  setSfxVolume(v: number): void {
    if (this.sfxBus) this.sfxBus.gain.value = v;
  }

  setBgmVolume(v: number): void {
    if (this.bgmBus && this.ctx) this.bgmBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** 単音。type: 波形、freq → freqEnd へスイープ、gain は減衰エンベロープ */
  tone(
    opts: {
      readonly freq: number;
      readonly freqEnd?: number;
      readonly dur: number;
      readonly type?: OscillatorType;
      readonly gain?: number;
      readonly at?: number;
      readonly attack?: number;
      readonly bus?: 'sfx' | 'bgm';
    },
  ): void {
    const ctx = this.ctx;
    const bus = opts.bus === 'bgm' ? this.bgmBus : this.sfxBus;
    if (!ctx || !bus) return;
    const t0 = opts.at ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + opts.dur);
    const g = ctx.createGain();
    const peak = opts.gain ?? 0.2;
    const attack = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  /** ノイズ（打撃・風・炎）。filter で音色を変える */
  noise(opts: { readonly dur: number; readonly gain?: number; readonly filter?: number; readonly type?: BiquadFilterType; readonly at?: number }): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus) return;
    const t0 = opts.at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? 'lowpass';
    filter.frequency.value = opts.filter ?? 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.gain ?? 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(bus);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
  }

  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = (seed / 0xffffffff) * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    return this.noiseBuffer;
  }
}
