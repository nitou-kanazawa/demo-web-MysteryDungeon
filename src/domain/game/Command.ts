import type { Direction } from '../core/Vec2';

/**
 * プレイヤーの入力をデータとして表現したコマンド。
 * アイテムは実体ではなく所持品インデックス／壺内インデックスで参照するため、
 * シード + コマンド列だけでプレイを完全に再現（リプレイ）できる。
 */
export type Command =
  | { readonly type: 'move'; readonly dir: Direction }
  | { readonly type: 'wait' }
  | { readonly type: 'pickup' }
  | { readonly type: 'descend' }
  | { readonly type: 'use'; readonly index: number }
  | { readonly type: 'equip'; readonly index: number }
  | { readonly type: 'unequip'; readonly index: number }
  | { readonly type: 'drop'; readonly index: number }
  | { readonly type: 'throw'; readonly index: number }
  | { readonly type: 'potInsert'; readonly potIndex: number; readonly itemIndex: number }
  | { readonly type: 'potTakeOut'; readonly potIndex: number; readonly contentIndex: number };

export interface CommandResult {
  /** ターンを消費したか（消費した場合のみ敵が行動する） */
  readonly consumedTurn: boolean;
  /** 失敗理由など（UI表示用） */
  readonly message?: string;
}

/** リプレイ用の記録。seed と commands で決定論的に再現できる */
export interface Replay {
  readonly seed: number;
  readonly commands: Command[];
}
