import type { HomeBase } from '../../domain/base/HomeBase';
import { handleCodexKey, newCodexView, type CodexView } from '../ui/CodexView';

export type BaseMode =
  | { readonly kind: 'menu'; cursor: number }
  | { readonly kind: 'storage'; side: 'inventory' | 'storage'; cursor: number }
  | { readonly kind: 'codex'; readonly view: CodexView }
  | { readonly kind: 'result'; readonly message: string };

export const BASE_MENU = ['出撃する', '倉庫', '図鑑'] as const;

/** 拠点画面の入力処理。出撃要求だけを外へ伝える */
export class BaseController {
  mode: BaseMode = { kind: 'menu', cursor: 0 };
  sortieRequested = false;

  constructor(readonly base: HomeBase) {}

  showResult(message: string): void {
    this.mode = { kind: 'result', message };
  }

  handleKey(e: KeyboardEvent): boolean {
    switch (this.mode.kind) {
      case 'result':
        this.mode = { kind: 'menu', cursor: 0 };
        return true;
      case 'menu':
        return this.handleMenu(e, this.mode);
      case 'storage':
        return this.handleStorage(e, this.mode);
      case 'codex': {
        const r = handleCodexKey(e, this.mode.view);
        if (r === 'close') this.mode = { kind: 'menu', cursor: 2 };
        return r !== false;
      }
    }
  }

  private isConfirm(e: KeyboardEvent): boolean {
    return e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyX';
  }

  private handleMenu(e: KeyboardEvent, mode: { cursor: number }): boolean {
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyK') {
      mode.cursor = (mode.cursor + BASE_MENU.length - 1) % BASE_MENU.length;
      return true;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'KeyJ') {
      mode.cursor = (mode.cursor + 1) % BASE_MENU.length;
      return true;
    }
    if (e.code === 'KeyM') {
      this.mode = { kind: 'codex', view: newCodexView() };
      return true;
    }
    if (!this.isConfirm(e)) return false;
    switch (mode.cursor) {
      case 0:
        this.sortieRequested = true;
        return true;
      case 1:
        this.mode = { kind: 'storage', side: 'inventory', cursor: 0 };
        return true;
      case 2:
        this.mode = { kind: 'codex', view: newCodexView() };
        return true;
      default:
        return false;
    }
  }

  private handleStorage(e: KeyboardEvent, mode: { side: 'inventory' | 'storage'; cursor: number }): boolean {
    if (e.code === 'Escape' || e.code === 'Tab') {
      this.mode = { kind: 'menu', cursor: 1 };
      return true;
    }
    const list = mode.side === 'inventory' ? this.base.inventory : this.base.storage;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') {
      mode.side = mode.side === 'inventory' ? 'storage' : 'inventory';
      mode.cursor = 0;
      return true;
    }
    if (list.length > 0 && (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyK')) {
      mode.cursor = (mode.cursor + list.length - 1) % list.length;
      return true;
    }
    if (list.length > 0 && (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'KeyJ')) {
      mode.cursor = (mode.cursor + 1) % list.length;
      return true;
    }
    if (this.isConfirm(e) && list.length > 0) {
      const ok = mode.side === 'inventory' ? this.base.deposit(mode.cursor) : this.base.withdraw(mode.cursor);
      if (ok) mode.cursor = Math.min(mode.cursor, Math.max(0, list.length - 1));
      return true;
    }
    return false;
  }
}
