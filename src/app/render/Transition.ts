import { FONT } from './RenderConfig';

export interface TransitionSpec {
  /** 塗りつぶす色 */
  readonly color: string;
  readonly outMs: number;
  readonly holdMs: number;
  readonly inMs: number;
  readonly title?: string;
  readonly subtitle?: string;
  readonly textColor?: string;
  readonly subtitleColor?: string;
}

const easeInOut = (p: number): number => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/**
 * 画面遷移の演出。
 * 開始時に前の画面のスナップショットを撮り、
 *   [前の画面 → 色へフェード] → [色の上にタイトルカード] → [新しい画面へフェード]
 * の順に重ねて描く。状態の切り替え自体は即時に行ってよい（スナップショットが隠す）。
 */
export class SceneTransition {
  private spec: TransitionSpec | undefined;
  private startAt = 0;
  private snapshot: HTMLCanvasElement | undefined;
  private hasSnapshot = false;

  start(spec: TransitionSpec, now: number, source?: HTMLCanvasElement): void {
    this.spec = spec;
    this.startAt = now;
    this.hasSnapshot = false;
    if (source) {
      if (!this.snapshot || this.snapshot.width !== source.width || this.snapshot.height !== source.height) {
        this.snapshot = document.createElement('canvas');
        this.snapshot.width = source.width;
        this.snapshot.height = source.height;
      }
      const sg = this.snapshot.getContext('2d');
      if (sg) {
        sg.clearRect(0, 0, source.width, source.height);
        sg.drawImage(source, 0, 0);
        this.hasSnapshot = true;
      }
    }
  }

  get isActive(): boolean {
    return this.spec !== undefined;
  }

  private total(): number {
    const s = this.spec;
    return s ? s.outMs + s.holdMs + s.inMs : 0;
  }

  /** 遷移中は入力を受け付けない */
  blocksInput(now: number): boolean {
    return this.spec !== undefined && now - this.startAt < this.total();
  }

  /** 新しい画面を描いた後に重ねて呼ぶ */
  draw(g: CanvasRenderingContext2D, width: number, height: number, now: number): void {
    const s = this.spec;
    if (!s) return;
    const t = now - this.startAt;
    if (t >= this.total()) {
      this.spec = undefined;
      return;
    }
    let cover = 1;
    let textAlpha = 0;
    if (t < s.outMs) {
      const p = easeInOut(t / s.outMs);
      // 前の画面を敷いて、その上を色で覆っていく
      if (this.hasSnapshot && this.snapshot) g.drawImage(this.snapshot, 0, 0);
      cover = p;
      textAlpha = Math.max(0, (p - 0.6) / 0.4);
    } else if (t < s.outMs + s.holdMs) {
      cover = 1;
      textAlpha = 1;
    } else {
      const p = easeInOut((t - s.outMs - s.holdMs) / s.inMs);
      cover = 1 - p;
      textAlpha = Math.max(0, 1 - p / 0.5);
    }
    g.save();
    g.globalAlpha = cover;
    g.fillStyle = s.color;
    g.fillRect(0, 0, width, height);
    g.restore();
    if (s.title && textAlpha > 0) {
      g.save();
      g.globalAlpha = textAlpha;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `bold 36px ${FONT}`;
      g.fillStyle = s.textColor ?? '#f5deb3';
      g.fillText(s.title, width / 2, height / 2 - (s.subtitle ? 16 : 0));
      if (s.subtitle) {
        g.font = `15px ${FONT}`;
        g.fillStyle = s.subtitleColor ?? '#b7aa8f';
        g.fillText(s.subtitle, width / 2, height / 2 + 24);
      }
      g.restore();
    }
  }
}

/** 場面ごとの既定の演出 */
export const TRANSITIONS = {
  floor: (title: string, subtitle: string | undefined): TransitionSpec => ({
    color: '#050308',
    outMs: 350,
    holdMs: subtitle ? 1100 : 750,
    inMs: 450,
    title,
    ...(subtitle ? { subtitle } : {}),
  }),
  sortie: (title: string, subtitle: string): TransitionSpec => ({
    color: '#050308',
    outMs: 450,
    holdMs: 1100,
    inMs: 550,
    title,
    subtitle,
  }),
  dead: (): TransitionSpec => ({
    color: '#1a0406',
    outMs: 1000,
    holdMs: 700,
    inMs: 450,
    title: '力尽きた…',
    textColor: '#f87171',
  }),
  won: (): TransitionSpec => ({
    color: '#fff7e0',
    outMs: 600,
    holdMs: 800,
    inMs: 500,
    title: 'ダンジョン踏破！',
    textColor: '#92400e',
  }),
  escaped: (): TransitionSpec => ({
    color: '#e0f2fe',
    outMs: 600,
    holdMs: 700,
    inMs: 500,
    title: 'リレミト',
    textColor: '#075985',
  }),
  toBase: (subtitle: string): TransitionSpec => ({
    color: '#050308',
    outMs: 450,
    holdMs: 500,
    inMs: 550,
    title: '拠点へ',
    subtitle,
  }),
} as const;
