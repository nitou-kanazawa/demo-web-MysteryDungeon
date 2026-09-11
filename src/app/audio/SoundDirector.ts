import type { VisualEvent } from '../../domain/game/VisualEvent';
import type { DungeonTheme } from '../../domain/data/themes';
import { AudioEngine } from './AudioEngine';
import { BgmPlayer } from './Bgm';

export type UiSound = 'cursor' | 'open' | 'close' | 'confirm' | 'error' | 'door';
export type SceneSound = 'sortie' | 'floor' | 'dead' | 'won' | 'escaped' | 'toBase';

/**
 * 演出イベント・画面遷移・UI 操作を効果音に写す。ゲームロジックには一切依存されない。
 * 音はすべて AudioEngine で合成する。
 */
export class SoundDirector {
  readonly engine = new AudioEngine();
  readonly bgm = new BgmPlayer(this.engine);
  private sfxEnabled = true;
  private lastAt = new Map<string, number>();

  unlock(): void {
    this.engine.unlock();
    this.engine.setSfxVolume(this.sfxEnabled ? 0.5 : 0);
  }

  setSfxEnabled(on: boolean): void {
    this.sfxEnabled = on;
    this.engine.setSfxVolume(on ? 0.5 : 0);
  }

  setBgmEnabled(on: boolean): void {
    this.bgm.setEnabled(on);
  }

  /** 拠点 or ダンジョンのテーマに合わせて BGM を切り替える */
  playScene(scene: 'village' | DungeonTheme): void {
    this.bgm.play(scene);
  }

  /** 同じ音が同フレームに何度も鳴らないように間引く */
  private throttle(key: string, ms: number): boolean {
    const now = performance.now();
    const last = this.lastAt.get(key) ?? -Infinity;
    if (now - last < ms) return false;
    this.lastAt.set(key, now);
    return true;
  }

  onVisuals(events: readonly VisualEvent[]): void {
    if (!this.sfxEnabled || !this.engine.ready) return;
    for (const ev of events) this.onVisual(ev);
  }

  private onVisual(ev: VisualEvent): void {
    const e = this.engine;
    switch (ev.type) {
      case 'attack':
        if (this.throttle('attack', 40)) e.noise({ dur: 0.09, gain: 0.25, filter: 2400, type: 'highpass' });
        break;
      case 'damage':
        if (!this.throttle('damage', 30)) break;
        if (ev.faction === 'player') {
          e.tone({ freq: 150, freqEnd: 50, dur: 0.22, type: 'square', gain: 0.25 });
          e.noise({ dur: 0.18, gain: 0.3, filter: 600 });
        } else {
          e.tone({ freq: 220, freqEnd: 90, dur: 0.12, type: 'square', gain: 0.18 });
          e.noise({ dur: 0.1, gain: 0.2, filter: 900 });
        }
        break;
      case 'miss':
        e.noise({ dur: 0.12, gain: 0.12, filter: 3500, type: 'bandpass' });
        break;
      case 'heal': {
        const t = e.now;
        [523, 659, 784].forEach((f, i) => e.tone({ freq: f, dur: 0.18, type: 'sine', gain: 0.16, at: t + i * 0.07 }));
        break;
      }
      case 'death':
        if (ev.faction === 'player') {
          e.tone({ freq: 260, freqEnd: 40, dur: 0.9, type: 'sawtooth', gain: 0.22 });
          e.noise({ dur: 0.6, gain: 0.25, filter: 500 });
        } else {
          e.tone({ freq: 330, freqEnd: 60, dur: 0.3, type: 'sawtooth', gain: 0.14 });
        }
        break;
      case 'projectile':
        if (ev.kind === 'bolt') e.tone({ freq: 1100, freqEnd: 300, dur: 0.22, type: 'square', gain: 0.12 });
        else if (ev.kind === 'breath') e.noise({ dur: 0.4, gain: 0.25, filter: 900 });
        else e.noise({ dur: 0.15, gain: 0.12, filter: 1800, type: 'highpass' });
        break;
      case 'teleport':
        e.tone({ freq: 300, freqEnd: 1400, dur: 0.25, type: 'sine', gain: 0.14 });
        e.tone({ freq: 1400, freqEnd: 300, dur: 0.25, type: 'sine', gain: 0.14, at: e.now + 0.25 });
        break;
      case 'floor':
        break;
      case 'popup':
        this.onPopup(ev.text);
        break;
      case 'move':
        break;
    }
  }

  private onPopup(text: string): void {
    const e = this.engine;
    const t = e.now;
    if (text.startsWith('LEVEL UP')) {
      [523, 659, 784, 1047].forEach((f, i) => e.tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.18, at: t + i * 0.09 }));
    } else if (text.includes('仲間になった')) {
      [659, 880, 1319].forEach((f, i) => e.tone({ freq: f, dur: 0.25, type: 'sine', gain: 0.16, at: t + i * 0.1 }));
    } else if (text.endsWith('の罠！') || text === '岩！') {
      e.tone({ freq: 440, freqEnd: 330, dur: 0.16, type: 'square', gain: 0.16 });
      e.tone({ freq: 440, freqEnd: 330, dur: 0.16, type: 'square', gain: 0.16, at: t + 0.18 });
    } else if (text === 'カチッ') {
      e.tone({ freq: 1800, dur: 0.05, type: 'square', gain: 0.15 });
      e.tone({ freq: 900, dur: 0.08, type: 'square', gain: 0.12, at: t + 0.06 });
    } else if (text === '開いた') {
      e.tone({ freq: 400, freqEnd: 800, dur: 0.2, type: 'triangle', gain: 0.15 });
    } else if (text === '松明') {
      e.noise({ dur: 0.25, gain: 0.12, filter: 1500 });
    } else if (text === '最大HP+1') {
      e.tone({ freq: 880, dur: 0.15, type: 'sine', gain: 0.12 });
    } else {
      // 特技名・状態異常など
      e.tone({ freq: 660, freqEnd: 990, dur: 0.12, type: 'triangle', gain: 0.1 });
    }
  }

  onUi(kind: UiSound): void {
    if (!this.sfxEnabled || !this.engine.ready) return;
    const e = this.engine;
    switch (kind) {
      case 'cursor':
        if (this.throttle('cursor', 30)) e.tone({ freq: 1200, dur: 0.035, type: 'square', gain: 0.06 });
        break;
      case 'open':
        e.tone({ freq: 700, freqEnd: 1000, dur: 0.08, type: 'triangle', gain: 0.1 });
        break;
      case 'close':
        e.tone({ freq: 900, freqEnd: 500, dur: 0.08, type: 'triangle', gain: 0.1 });
        break;
      case 'confirm':
        e.tone({ freq: 880, dur: 0.06, type: 'square', gain: 0.1 });
        e.tone({ freq: 1320, dur: 0.1, type: 'square', gain: 0.1, at: e.now + 0.06 });
        break;
      case 'error':
        e.tone({ freq: 200, dur: 0.15, type: 'square', gain: 0.12 });
        break;
      case 'door':
        e.noise({ dur: 0.2, gain: 0.15, filter: 700 });
        e.tone({ freq: 220, freqEnd: 180, dur: 0.2, type: 'triangle', gain: 0.1 });
        break;
    }
  }

  onScene(kind: SceneSound): void {
    if (!this.sfxEnabled || !this.engine.ready) return;
    const e = this.engine;
    const t = e.now;
    switch (kind) {
      case 'sortie':
        e.noise({ dur: 0.3, gain: 0.3, filter: 300 });
        [220, 330, 440].forEach((f, i) => e.tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.15, at: t + i * 0.12 }));
        break;
      case 'floor':
        [660, 520, 400].forEach((f, i) => e.tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.14, at: t + i * 0.1 }));
        break;
      case 'dead':
        e.tone({ freq: 110, freqEnd: 40, dur: 1.4, type: 'sine', gain: 0.3 });
        e.noise({ dur: 1, gain: 0.2, filter: 300 });
        break;
      case 'won':
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) => e.tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.18, at: t + i * 0.13 }));
        break;
      case 'escaped':
        e.tone({ freq: 400, freqEnd: 1600, dur: 0.6, type: 'sine', gain: 0.16 });
        break;
      case 'toBase':
        [784, 988, 1175].forEach((f, i) => e.tone({ freq: f, dur: 0.3, type: 'sine', gain: 0.14, at: t + i * 0.12 }));
        break;
    }
  }
}
