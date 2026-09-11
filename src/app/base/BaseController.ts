import type { HomeBase } from '../../domain/base/HomeBase';
import { handleCodexKey, newCodexView, type CodexView } from '../ui/CodexView';
import { renderSettings } from '../render/RenderSettings';

export type BaseMode =
  | { readonly kind: 'menu'; cursor: number }
  | { readonly kind: 'storage'; side: 'inventory' | 'storage'; cursor: number }
  | { readonly kind: 'ranch'; cursor: number }
  | { readonly kind: 'ranchAction'; readonly index: number; cursor: number }
  | { readonly kind: 'breedSelect'; readonly index: number; cursor: number }
  | { readonly kind: 'codex'; readonly view: CodexView }
  | { readonly kind: 'settings'; cursor: number }
  | { readonly kind: 'result'; readonly message: string; readonly notes: readonly string[] };

export const BASE_MENU = ['出撃する', '牧場', '倉庫', '図鑑', '設定'] as const;
export const SETTINGS_ITEMS = ['敵の見た目'] as const;
export const RANCH_ACTIONS = ['連れて行く／留守番', '配合する', '逃がす', '戻る'] as const;

/** 拠点画面の入力処理。出撃要求だけを外へ伝える */
export class BaseController {
  mode: BaseMode = { kind: 'menu', cursor: 0 };
  sortieRequested = false;
  /** 直近の操作結果（牧場画面の下に表示） */
  notice = '';

  constructor(readonly base: HomeBase) {}

  showResult(message: string, notes: readonly string[] = []): void {
    this.mode = { kind: 'result', message, notes };
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
      case 'ranch':
        return this.handleRanch(e, this.mode);
      case 'ranchAction':
        return this.handleRanchAction(e, this.mode);
      case 'breedSelect':
        return this.handleBreedSelect(e, this.mode);
      case 'codex': {
        const r = handleCodexKey(e, this.mode.view);
        if (r === 'close') this.mode = { kind: 'menu', cursor: 3 };
        return r !== false;
      }
      case 'settings':
        return this.handleSettings(e, this.mode);
    }
  }

  private handleSettings(e: KeyboardEvent, mode: { cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'menu', cursor: 4 };
      return true;
    }
    if (this.moveCursor(mode, e, SETTINGS_ITEMS.length)) return true;
    if (this.isConfirm(e) || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      if (mode.cursor === 0) renderSettings.cycleSkin();
      return true;
    }
    return false;
  }

  private isConfirm(e: KeyboardEvent): boolean {
    return e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyX';
  }

  private isCancel(e: KeyboardEvent): boolean {
    return e.code === 'Escape' || e.code === 'Tab';
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

  private handleMenu(e: KeyboardEvent, mode: { cursor: number }): boolean {
    if (this.moveCursor(mode, e, BASE_MENU.length)) return true;
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
        this.notice = '';
        this.mode = { kind: 'ranch', cursor: 0 };
        return true;
      case 2:
        this.mode = { kind: 'storage', side: 'inventory', cursor: 0 };
        return true;
      case 3:
        this.mode = { kind: 'codex', view: newCodexView() };
        return true;
      case 4:
        this.mode = { kind: 'settings', cursor: 0 };
        return true;
      default:
        return false;
    }
  }

  private handleStorage(e: KeyboardEvent, mode: { side: 'inventory' | 'storage'; cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'menu', cursor: 2 };
      return true;
    }
    const list = mode.side === 'inventory' ? this.base.inventory : this.base.storage;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') {
      mode.side = mode.side === 'inventory' ? 'storage' : 'inventory';
      mode.cursor = 0;
      return true;
    }
    if (this.moveCursor(mode, e, list.length)) return true;
    if (this.isConfirm(e) && list.length > 0) {
      const ok = mode.side === 'inventory' ? this.base.deposit(mode.cursor) : this.base.withdraw(mode.cursor);
      if (ok) mode.cursor = Math.min(mode.cursor, Math.max(0, list.length - 1));
      return true;
    }
    return false;
  }

  private handleRanch(e: KeyboardEvent, mode: { cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'menu', cursor: 1 };
      return true;
    }
    if (this.moveCursor(mode, e, this.base.allies.length)) return true;
    if (this.isConfirm(e) && this.base.allies.length > 0) {
      this.mode = { kind: 'ranchAction', index: mode.cursor, cursor: 0 };
      return true;
    }
    return false;
  }

  private handleRanchAction(e: KeyboardEvent, mode: { readonly index: number; cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'ranch', cursor: mode.index };
      return true;
    }
    if (this.moveCursor(mode, e, RANCH_ACTIONS.length)) return true;
    if (!this.isConfirm(e)) return false;
    switch (mode.cursor) {
      case 0: {
        const r = this.base.toggleParty(mode.index);
        this.notice = r.message;
        this.mode = { kind: 'ranch', cursor: mode.index };
        return true;
      }
      case 1:
        if (this.base.allies.length < 2) {
          this.notice = '配合には仲間が2体必要だ。';
          this.mode = { kind: 'ranch', cursor: mode.index };
          return true;
        }
        this.mode = { kind: 'breedSelect', index: mode.index, cursor: mode.index === 0 ? 1 : 0 };
        return true;
      case 2: {
        const r = this.base.release(mode.index);
        this.notice = r.message;
        this.mode = { kind: 'ranch', cursor: Math.max(0, Math.min(mode.index, this.base.allies.length - 1)) };
        return true;
      }
      default:
        this.mode = { kind: 'ranch', cursor: mode.index };
        return true;
    }
  }

  private handleBreedSelect(e: KeyboardEvent, mode: { readonly index: number; cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'ranch', cursor: mode.index };
      return true;
    }
    if (this.moveCursor(mode, e, this.base.allies.length)) return true;
    if (!this.isConfirm(e)) return false;
    if (mode.cursor === mode.index) {
      this.notice = '同じ仲間同士は配合できない。';
      return true;
    }
    const r = this.base.breed(mode.index, mode.cursor);
    this.notice = r.message;
    this.mode = { kind: 'ranch', cursor: r.ok ? this.base.allies.length - 1 : mode.index };
    return true;
  }
}
