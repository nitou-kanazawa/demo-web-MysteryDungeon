import type { AudioEngine } from './AudioEngine';
import type { DungeonTheme } from '../../domain/data/themes';

/** BGM の場面。拠点 or ダンジョンのテーマ */
export type BgmTrack = 'village' | DungeonTheme | 'none';

interface TrackDef {
  /** テンポ（BPM） */
  readonly bpm: number;
  /** 使う音階（半音、ルートからの相対） */
  readonly scale: readonly number[];
  /** ルート音（Hz） */
  readonly root: number;
  /** 4 拍 × 4 小節のコード進行（音階上の度数） */
  readonly chords: readonly number[];
  readonly lead: OscillatorType;
  readonly bass: OscillatorType;
  /** メロディの密度（0..1） */
  readonly density: number;
  /** 明るさ（ゲイン） */
  readonly gain: number;
}

const MAJOR_PENTA = [0, 2, 4, 7, 9];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

const TRACKS: Readonly<Record<Exclude<BgmTrack, 'none'>, TrackDef>> = {
  village: { bpm: 96, scale: MAJOR_PENTA, root: 220, chords: [0, 3, 4, 0], lead: 'triangle', bass: 'sine', density: 0.7, gain: 1 },
  cave: { bpm: 72, scale: MINOR, root: 110, chords: [0, 5, 3, 4], lead: 'triangle', bass: 'sine', density: 0.35, gain: 0.8 },
  water: { bpm: 84, scale: LYDIAN, root: 146.8, chords: [0, 1, 4, 0], lead: 'sine', bass: 'sine', density: 0.5, gain: 0.8 },
  ice: { bpm: 90, scale: MAJOR_PENTA, root: 261.6, chords: [0, 4, 3, 4], lead: 'sine', bass: 'triangle', density: 0.55, gain: 0.7 },
  volcano: { bpm: 112, scale: MINOR, root: 98, chords: [0, 0, 5, 4], lead: 'sawtooth', bass: 'square', density: 0.6, gain: 0.55 },
  sky: { bpm: 100, scale: MAJOR_PENTA, root: 196, chords: [0, 3, 4, 3], lead: 'triangle', bass: 'sine', density: 0.6, gain: 0.8 },
  ruins: { bpm: 80, scale: DORIAN, root: 130.8, chords: [0, 3, 6, 4], lead: 'triangle', bass: 'sine', density: 0.45, gain: 0.8 },
  dark: { bpm: 60, scale: MINOR, root: 82.4, chords: [0, 0, 1, 0], lead: 'sine', bass: 'sine', density: 0.15, gain: 0.6 },
};

/**
 * 手続き的 BGM。小さなシーケンサで 16 分音符ごとにベース・和音・メロディを鳴らす。
 * 先読みスケジューリング（100ms ごとに 0.35 秒先まで予約）で途切れを防ぐ。
 */
export class BgmPlayer {
  private track: BgmTrack = 'none';
  private timer: ReturnType<typeof setInterval> | undefined;
  private nextStep = 0;
  private stepIndex = 0;
  private seed = 1;
  private volume = 0.12;
  private enabled = true;

  constructor(private readonly engine: AudioEngine) {}

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.engine.setBgmVolume(on ? this.volume : 0);
    if (!on) this.stopTimer();
    else if (this.track !== 'none') this.startTimer();
  }

  /** 曲を切り替える。同じ曲なら何もしない */
  play(track: BgmTrack): void {
    if (track === this.track) return;
    this.track = track;
    this.stepIndex = 0;
    this.seed = 7;
    if (track === 'none') {
      this.stopTimer();
      return;
    }
    if (this.enabled) this.startTimer();
  }

  private startTimer(): void {
    if (this.timer) return;
    this.nextStep = this.engine.now + 0.1;
    this.engine.setBgmVolume(this.volume);
    this.timer = setInterval(() => this.schedule(), 100);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  private schedule(): void {
    if (this.track === 'none' || !this.engine.ready) return;
    const def = TRACKS[this.track];
    const stepDur = 60 / def.bpm / 4;
    while (this.nextStep < this.engine.now + 0.35) {
      this.playStep(def, this.stepIndex, this.nextStep, stepDur);
      this.stepIndex = (this.stepIndex + 1) % 64;
      this.nextStep += stepDur;
    }
  }

  private noteHz(def: TrackDef, degree: number, octave = 0): number {
    const n = def.scale.length;
    const idx = ((degree % n) + n) % n;
    const oct = Math.floor(degree / n) + octave;
    return def.root * Math.pow(2, ((def.scale[idx] ?? 0) + oct * 12) / 12);
  }

  private playStep(def: TrackDef, step: number, at: number, stepDur: number): void {
    const bar = Math.floor(step / 16) % def.chords.length;
    const chordRoot = def.chords[bar] ?? 0;
    const g = def.gain;
    // ベース: 1 拍目と 3 拍目、時々 8 分裏
    if (step % 8 === 0 || (step % 16 === 10 && this.rand() < 0.5)) {
      this.engine.tone({ freq: this.noteHz(def, chordRoot, -1), dur: stepDur * 3, type: def.bass, gain: 0.22 * g, attack: 0.02, at, bus: 'bgm' });
    }
    // 和音: 2 拍目・4 拍目に 3 度・5 度を薄く
    if (step % 8 === 4) {
      this.engine.tone({ freq: this.noteHz(def, chordRoot + 2), dur: stepDur * 3.5, type: 'triangle', gain: 0.06 * g, attack: 0.05, at, bus: 'bgm' });
      this.engine.tone({ freq: this.noteHz(def, chordRoot + 4), dur: stepDur * 3.5, type: 'triangle', gain: 0.05 * g, attack: 0.05, at: at + 0.01, bus: 'bgm' });
    }
    // メロディ: 密度に応じて音階上をゆらぐ
    if (step % 2 === 0 && this.rand() < def.density) {
      const wobble = Math.floor(this.rand() * 5) - 2;
      const degree = chordRoot + [0, 2, 4, 7][Math.floor(this.rand() * 4)]! + wobble;
      const len = this.rand() < 0.3 ? 4 : 2;
      this.engine.tone({ freq: this.noteHz(def, degree, 1), dur: stepDur * len * 0.9, type: def.lead, gain: 0.09 * g, attack: 0.01, at, bus: 'bgm' });
    }
  }
}
