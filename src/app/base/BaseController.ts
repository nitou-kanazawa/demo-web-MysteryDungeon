import type { HomeBase } from '../../domain/base/HomeBase';
import { handleCodexKey, newCodexView, type CodexView } from '../ui/CodexView';
import { renderSettings } from '../render/RenderSettings';
import { BUILDINGS, HERO_SPEED, HERO_START_X, buildingAt, clampHeroX, type Building } from './BaseWorld';

export type BaseMode =
  | { readonly kind: 'walk' }
  | { readonly kind: 'house'; cursor: number }
  | { readonly kind: 'storage'; side: 'inventory' | 'storage'; cursor: number }
  | { readonly kind: 'settings'; cursor: number }
  | { readonly kind: 'shop'; tab: 'buy' | 'sell'; cursor: number }
  | { readonly kind: 'ranch'; cursor: number }
  | { readonly kind: 'ranchAction'; readonly index: number; cursor: number }
  | { readonly kind: 'breed'; cursor: number; first: number | undefined }
  | { readonly kind: 'codex'; readonly view: CodexView }
  | { readonly kind: 'dungeonConfirm'; cursor: number }
  | { readonly kind: 'result'; readonly message: string; readonly notes: readonly string[] };

export const HOUSE_MENU = ['倉庫', '設定', '出る'] as const;
export const RANCH_ACTIONS = ['連れて行く／留守番', '逃がす', '戻る'] as const;
export const SETTINGS_ITEMS = ['敵の見た目'] as const;
export const DUNGEON_CONFIRM = ['出撃する', 'やめる'] as const;

export interface HeroState {
  x: number;
  /** 1: 右向き, -1: 左向き */
  facing: 1 | -1;
  moving: boolean;
}

/**
 * 拠点（横スクロールの村）の入力処理。
 * 歩いて施設の前に立ち、↑/Enter で中に入る。各施設の中身は既存のメニュー画面。
 */
export class BaseController {
  mode: BaseMode = { kind: 'walk' };
  sortieRequested = false;
  notice = '';
  readonly hero: HeroState = { x: HERO_START_X, facing: 1, moving: false };
  /** 連れて行く仲間の表示位置（後ろをついて歩く） */
  readonly partyX: number[] = [];
  private readonly held = new Set<string>();

  constructor(readonly base: HomeBase) {}

  get nearBuilding(): Building | undefined {
    return buildingAt(this.hero.x);
  }

  showResult(message: string, notes: readonly string[] = []): void {
    const dungeon = BUILDINGS.find((b) => b.id === 'dungeon');
    if (dungeon) {
      this.hero.x = dungeon.doorX - 70;
      this.hero.facing = -1;
    }
    this.partyX.length = 0;
    this.mode = { kind: 'result', message, notes };
  }

  setHeld(code: string, down: boolean): void {
    if (down) this.held.add(code);
    else this.held.delete(code);
  }

  releaseAll(): void {
    this.held.clear();
  }

  /** 毎フレーム。歩行と仲間の追従 */
  tick(dt: number): void {
    const left = this.held.has('ArrowLeft') || this.held.has('KeyA');
    const right = this.held.has('ArrowRight') || this.held.has('KeyD');
    let dir = 0;
    if (this.mode.kind === 'walk') dir = (right ? 1 : 0) - (left ? 1 : 0);
    this.hero.moving = dir !== 0;
    if (dir !== 0) {
      this.hero.facing = dir > 0 ? 1 : -1;
      this.hero.x = clampHeroX(this.hero.x + dir * HERO_SPEED * dt);
    }
    const party = this.base.allies.filter((a) => a.inParty);
    while (this.partyX.length < party.length) this.partyX.push(this.hero.x - 48 * (this.partyX.length + 1) * this.hero.facing);
    this.partyX.length = party.length;
    for (let i = 0; i < this.partyX.length; i++) {
      const target = this.hero.x - 52 * (i + 1) * this.hero.facing;
      const cur = this.partyX[i] ?? target;
      const k = Math.min(1, dt / 160);
      this.partyX[i] = cur + (target - cur) * k;
    }
  }

  handleKey(e: KeyboardEvent): boolean {
    switch (this.mode.kind) {
      case 'walk':
        return this.handleWalk(e);
      case 'result':
        this.mode = { kind: 'walk' };
        return true;
      case 'house':
        return this.handleHouse(e, this.mode);
      case 'storage':
        return this.handleStorage(e, this.mode);
      case 'settings':
        return this.handleSettings(e, this.mode);
      case 'shop':
        return this.handleShop(e, this.mode);
      case 'ranch':
        return this.handleRanch(e, this.mode);
      case 'ranchAction':
        return this.handleRanchAction(e, this.mode);
      case 'breed':
        return this.handleBreed(e, this.mode);
      case 'dungeonConfirm':
        return this.handleDungeonConfirm(e, this.mode);
      case 'codex': {
        const r = handleCodexKey(e, this.mode.view);
        if (r === 'close') this.mode = { kind: 'walk' };
        return r !== false;
      }
    }
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

  // ---------------------------------------------------------------- 村を歩く

  private handleWalk(e: KeyboardEvent): boolean {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') {
      // 押しっぱなしは tick で処理。単押しでも少し動く
      const dir = e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 1;
      this.hero.facing = dir;
      if (!e.repeat) this.hero.x = clampHeroX(this.hero.x + dir * 4);
      return true;
    }
    if (e.code === 'KeyM') {
      this.mode = { kind: 'codex', view: newCodexView() };
      return true;
    }
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || this.isConfirm(e)) {
      const b = this.nearBuilding;
      if (!b) return true;
      this.enter(b);
      return true;
    }
    return false;
  }

  private enter(b: Building): void {
    this.notice = '';
    this.releaseAll();
    switch (b.id) {
      case 'house':
        this.mode = { kind: 'house', cursor: 0 };
        break;
      case 'weapon_shop':
        this.mode = { kind: 'shop', tab: 'buy', cursor: 0 };
        break;
      case 'ranch':
        this.mode = { kind: 'ranch', cursor: 0 };
        break;
      case 'breeding':
        this.mode = { kind: 'breed', cursor: 0, first: undefined };
        break;
      case 'library':
        this.mode = { kind: 'codex', view: newCodexView() };
        break;
      case 'dungeon':
        this.mode = { kind: 'dungeonConfirm', cursor: 0 };
        break;
    }
  }

  private handleHouse(e: KeyboardEvent, mode: { cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'walk' };
      return true;
    }
    if (this.moveCursor(mode, e, HOUSE_MENU.length)) return true;
    if (!this.isConfirm(e)) return false;
    if (mode.cursor === 0) this.mode = { kind: 'storage', side: 'inventory', cursor: 0 };
    else if (mode.cursor === 1) this.mode = { kind: 'settings', cursor: 0 };
    else this.mode = { kind: 'walk' };
    return true;
  }

  private handleStorage(e: KeyboardEvent, mode: { side: 'inventory' | 'storage'; cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'house', cursor: 0 };
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

  private handleSettings(e: KeyboardEvent, mode: { cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'house', cursor: 1 };
      return true;
    }
    if (this.moveCursor(mode, e, SETTINGS_ITEMS.length)) return true;
    if (this.isConfirm(e) || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      if (mode.cursor === 0) renderSettings.cycleSkin();
      return true;
    }
    return false;
  }

  private handleShop(e: KeyboardEvent, mode: { tab: 'buy' | 'sell'; cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'walk' };
      return true;
    }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') {
      mode.tab = mode.tab === 'buy' ? 'sell' : 'buy';
      mode.cursor = 0;
      return true;
    }
    const list = mode.tab === 'buy' ? this.base.shopStock : this.base.inventory;
    if (this.moveCursor(mode, e, list.length)) return true;
    if (this.isConfirm(e) && list.length > 0) {
      const r = mode.tab === 'buy' ? this.base.buy(mode.cursor) : this.base.sell(mode.cursor);
      this.notice = r.message;
      const after = mode.tab === 'buy' ? this.base.shopStock : this.base.inventory;
      mode.cursor = Math.min(mode.cursor, Math.max(0, after.length - 1));
      return true;
    }
    return false;
  }

  private handleRanch(e: KeyboardEvent, mode: { cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'walk' };
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
      case 1: {
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

  private handleBreed(e: KeyboardEvent, mode: { cursor: number; first: number | undefined }): boolean {
    if (this.isCancel(e)) {
      if (mode.first !== undefined) {
        mode.first = undefined;
        return true;
      }
      this.mode = { kind: 'walk' };
      return true;
    }
    if (this.moveCursor(mode, e, this.base.allies.length)) return true;
    if (!this.isConfirm(e) || this.base.allies.length === 0) return false;
    if (mode.first === undefined) {
      if (this.base.allies.length < 2) {
        this.notice = '配合には仲間が2体必要だ。';
        return true;
      }
      mode.first = mode.cursor;
      mode.cursor = mode.cursor === 0 ? Math.min(1, this.base.allies.length - 1) : 0;
      return true;
    }
    if (mode.cursor === mode.first) {
      this.notice = '同じ仲間同士は配合できない。';
      return true;
    }
    const r = this.base.breed(mode.first, mode.cursor);
    this.notice = r.message;
    mode.first = undefined;
    mode.cursor = r.ok ? this.base.allies.length - 1 : 0;
    return true;
  }

  private handleDungeonConfirm(e: KeyboardEvent, mode: { cursor: number }): boolean {
    if (this.isCancel(e)) {
      this.mode = { kind: 'walk' };
      return true;
    }
    if (this.moveCursor(mode, e, DUNGEON_CONFIRM.length)) return true;
    if (!this.isConfirm(e)) return false;
    if (mode.cursor === 0) {
      this.sortieRequested = true;
      this.releaseAll();
    }
    this.mode = { kind: 'walk' };
    return true;
  }
}
