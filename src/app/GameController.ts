import type { Direction } from '../domain/core/Vec2';
import type { GameSession } from '../domain/game/GameSession';
import { directionFromKey } from './input/KeyMap';
import { handleCodexKey, newCodexView } from './ui/CodexView';
import { TACTICS } from '../domain/game/Tactic';
import { buildItemActions } from './ui/ItemActionMenu';
import type { UiMode } from './ui/UiState';

/**
 * キー入力を UI 状態機械に通し、ゲームセッションへのコマンドに変換する。
 * 描画は行わず、「状態が変わったか」だけを返す。
 */
export class GameController {
  mode: UiMode = { kind: 'explore' };
  /** 終了画面でキーが押された（拠点へ戻る） */
  exitRequested = false;

  constructor(readonly session: GameSession) {}

  exportReplay(): string {
    return JSON.stringify(this.session.toReplay());
  }

  /** 店の中で店主が健在なら売れる */
  get canSell(): boolean {
    const st = this.session.state;
    return st.shop?.keeper !== undefined && this.session.shops.isInShop(st, st.player.pos);
  }

  handleKey(e: KeyboardEvent): boolean {
    const status = this.session.state.status;
    if (status !== 'playing') {
      this.exitRequested = true;
      return true;
    }
    switch (this.mode.kind) {
      case 'codex': {
        const r = handleCodexKey(e, this.mode.view);
        if (r === 'close') this.mode = { kind: 'explore' };
        return r !== false;
      }
      case 'explore':
        return this.handleExplore(e);
      case 'inventory':
        return this.handleInventory(e, this.mode);
      case 'itemActions':
        return this.handleItemActions(e, this.mode);
      case 'potContents':
        return this.handlePotContents(e, this.mode);
      case 'potInsertSelect':
        return this.handlePotInsertSelect(e, this.mode);
      case 'help':
        this.mode = { kind: 'explore' };
        return true;
    }
  }

  private handleExplore(e: KeyboardEvent): boolean {
    const dir: Direction | undefined = directionFromKey(e.key, e.code);
    if (dir) {
      this.session.execute({ type: 'move', dir });
      return true;
    }
    switch (e.code) {
      case 'Period':
      case 'Space':
        this.session.execute({ type: 'wait' });
        return true;
      case 'Comma':
      case 'KeyG':
        this.session.execute({ type: 'pickup' });
        return true;
      case 'Enter':
        this.session.execute({ type: 'descend' });
        return true;
      case 'KeyI':
      case 'Tab':
        this.mode = { kind: 'inventory', cursor: 0 };
        return true;
      case 'Slash':
      case 'F1':
        this.mode = { kind: 'help' };
        return true;
      case 'KeyM':
        this.mode = { kind: 'codex', view: newCodexView() };
        return true;
      case 'KeyT': {
        const cur = this.session.state.tactic;
        const next = TACTICS[(TACTICS.indexOf(cur) + 1) % TACTICS.length] ?? cur;
        this.session.execute({ type: 'tactic', tactic: next });
        return true;
      }
      default:
        return false;
    }
  }

  private moveCursor(mode: { cursor: number }, e: KeyboardEvent, length: number): boolean {
    if (length === 0) return false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyK') {
      mode.cursor = (mode.cursor + length - 1) % length;
      return true;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'KeyJ') {
      mode.cursor = (mode.cursor + 1) % length;
      return true;
    }
    return false;
  }

  private isConfirm(e: KeyboardEvent): boolean {
    return e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyX';
  }

  private isCancel(e: KeyboardEvent): boolean {
    return e.code === 'Escape' || e.code === 'KeyI' || e.code === 'Tab';
  }

  private handleInventory(e: KeyboardEvent, mode: { cursor: number }): boolean {
    const items = this.session.state.player.inventory.items;
    if (this.isCancel(e)) {
      this.mode = { kind: 'explore' };
      return true;
    }
    if (this.moveCursor(mode, e, items.length)) return true;
    if (this.isConfirm(e) && items.length > 0) {
      this.mode = { kind: 'itemActions', itemIndex: mode.cursor, cursor: 0 };
      return true;
    }
    return false;
  }

  private handleItemActions(e: KeyboardEvent, mode: { readonly itemIndex: number; cursor: number }): boolean {
    const player = this.session.state.player;
    const item = player.inventory.at(mode.itemIndex);
    if (!item) {
      this.mode = { kind: 'inventory', cursor: 0 };
      return true;
    }
    const actions = buildItemActions(item, player, this.canSell);
    if (this.isCancel(e)) {
      this.mode = { kind: 'inventory', cursor: mode.itemIndex };
      return true;
    }
    if (this.moveCursor(mode, e, actions.length)) return true;
    if (!this.isConfirm(e)) return false;
    const action = actions[mode.cursor];
    if (!action) return false;
    const i = mode.itemIndex;
    switch (action.id) {
      case 'use':
        this.session.execute({ type: 'use', index: i });
        break;
      case 'equip':
        this.session.execute({ type: 'equip', index: i });
        break;
      case 'unequip':
        this.session.execute({ type: 'unequip', index: i });
        break;
      case 'throw':
        this.session.execute({ type: 'throw', index: i });
        break;
      case 'drop':
        this.session.execute({ type: 'drop', index: i });
        break;
      case 'sell':
        this.session.execute({ type: 'sell', index: i });
        break;
      case 'potIn':
        this.mode = { kind: 'potInsertSelect', potIndex: i, cursor: 0 };
        return true;
      case 'potOut':
        this.mode = { kind: 'potContents', potIndex: i, cursor: 0 };
        return true;
    }
    this.mode = { kind: 'explore' };
    return true;
  }

  private handlePotContents(e: KeyboardEvent, mode: { readonly potIndex: number; cursor: number }): boolean {
    const pot = this.session.state.player.inventory.at(mode.potIndex);
    if (!pot || this.isCancel(e)) {
      this.mode = { kind: 'inventory', cursor: mode.potIndex };
      return true;
    }
    if (this.moveCursor(mode, e, pot.contents.length)) return true;
    if (this.isConfirm(e) && pot.contents.length > 0) {
      this.session.execute({ type: 'potTakeOut', potIndex: mode.potIndex, contentIndex: mode.cursor });
      this.mode = { kind: 'explore' };
      return true;
    }
    return false;
  }

  private handlePotInsertSelect(e: KeyboardEvent, mode: { readonly potIndex: number; cursor: number }): boolean {
    const items = this.session.state.player.inventory.items;
    if (this.isCancel(e)) {
      this.mode = { kind: 'inventory', cursor: mode.potIndex };
      return true;
    }
    if (this.moveCursor(mode, e, items.length)) return true;
    if (this.isConfirm(e)) {
      if (mode.cursor === mode.potIndex) return false;
      const r = this.session.execute({ type: 'potInsert', potIndex: mode.potIndex, itemIndex: mode.cursor });
      if (r.consumedTurn) this.mode = { kind: 'explore' };
      return true;
    }
    return false;
  }
}
