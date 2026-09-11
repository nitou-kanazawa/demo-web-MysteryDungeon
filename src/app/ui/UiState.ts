import type { CodexView } from './CodexView';

/**
 * 画面側の状態機械。ゲームロジックとは独立し、
 * どのメニューを開いているか・カーソル位置だけを持つ。
 */
export type UiMode =
  | { readonly kind: 'explore' }
  | { readonly kind: 'inventory'; cursor: number }
  | { readonly kind: 'itemActions'; readonly itemIndex: number; cursor: number }
  | { readonly kind: 'potContents'; readonly potIndex: number; cursor: number }
  | { readonly kind: 'potInsertSelect'; readonly potIndex: number; cursor: number }
  | { readonly kind: 'help' }
  | { readonly kind: 'codex'; readonly view: CodexView };

export type ItemActionId = 'use' | 'equip' | 'unequip' | 'throw' | 'drop' | 'potIn' | 'potOut' | 'sell';

export interface ItemAction {
  readonly id: ItemActionId;
  readonly label: string;
}
