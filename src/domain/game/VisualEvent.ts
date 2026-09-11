import type { Vec2 } from '../core/Vec2';
import type { Faction } from '../entity/Actor';

/**
 * 描画用の演出イベント。ゲームロジックには一切影響せず、
 * セッションが execute() 中に発行し、画面側が取り出して再生する。
 */
export type VisualEvent =
  | { readonly type: 'move'; readonly actorId: number; readonly from: Vec2; readonly to: Vec2; readonly fast: boolean }
  | { readonly type: 'attack'; readonly actorId: number; readonly from: Vec2; readonly target: Vec2 }
  | { readonly type: 'damage'; readonly actorId: number; readonly pos: Vec2; readonly amount: number; readonly faction: Faction }
  | { readonly type: 'miss'; readonly pos: Vec2 }
  | { readonly type: 'heal'; readonly actorId: number; readonly pos: Vec2; readonly amount: number }
  | { readonly type: 'death'; readonly pos: Vec2; readonly defId: string | undefined; readonly faction: Faction }
  | {
      readonly type: 'projectile';
      readonly from: Vec2;
      readonly to: Vec2;
      readonly kind: 'item' | 'bolt' | 'breath';
      readonly itemDefId?: string;
      readonly color?: string;
    }
  | { readonly type: 'popup'; readonly pos: Vec2; readonly text: string; readonly color: string }
  | { readonly type: 'teleport'; readonly actorId: number; readonly from: Vec2; readonly to: Vec2 }
  /** フロアが変わった: 再生中の演出をすべて破棄する */
  | { readonly type: 'floor' };

/** 演出イベントの収集口。ドメインの各サービスに注入する */
export class VisualSink {
  private queue: VisualEvent[] = [];

  emit(e: VisualEvent): void {
    this.queue.push(e);
  }

  /** 溜まったイベントを取り出して空にする */
  drain(): VisualEvent[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  get pending(): readonly VisualEvent[] {
    return this.queue;
  }
}

export const POPUP_COLORS = {
  status: '#c084fc',
  skill: '#93c5fd',
  good: '#4ade80',
  warn: '#fbbf24',
  trap: '#f97316',
} as const;
