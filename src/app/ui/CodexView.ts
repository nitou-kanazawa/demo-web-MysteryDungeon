import { RECIPES } from '../../domain/data/recipes';
import { ITEM_DEFS } from '../../domain/data/items';
import { ALL_MONSTER_DEFS } from '../../domain/data/monsters';

export type CodexTab = 'monsters' | 'items' | 'recipes';
export const CODEX_TABS: readonly CodexTab[] = ['monsters', 'items', 'recipes'];
export const CODEX_TAB_LABEL: Readonly<Record<CodexTab, string>> = {
  monsters: 'モンスター',
  items: 'アイテム',
  recipes: 'レシピ',
};

/** 図鑑画面のカーソル状態（拠点・ダンジョン共通） */
export interface CodexView {
  tab: CodexTab;
  cursor: number;
}

export const newCodexView = (): CodexView => ({ tab: 'monsters', cursor: 0 });

export function codexEntryCount(tab: CodexTab): number {
  switch (tab) {
    case 'monsters':
      return ALL_MONSTER_DEFS.length;
    case 'items':
      return ITEM_DEFS.filter((d) => d.category !== 'gold').length;
    case 'recipes':
      return RECIPES.length;
  }
}

/** 図鑑のキー操作。'close' で閉じる、true で処理済み */
export function handleCodexKey(e: KeyboardEvent, view: CodexView): 'close' | boolean {
  if (e.code === 'Escape' || e.code === 'KeyM' || e.code === 'Tab') return 'close';
  const n = codexEntryCount(view.tab);
  if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyH') {
    view.tab = CODEX_TABS[(CODEX_TABS.indexOf(view.tab) + CODEX_TABS.length - 1) % CODEX_TABS.length] as CodexTab;
    view.cursor = 0;
    return true;
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'KeyL') {
    view.tab = CODEX_TABS[(CODEX_TABS.indexOf(view.tab) + 1) % CODEX_TABS.length] as CodexTab;
    view.cursor = 0;
    return true;
  }
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyK') {
    view.cursor = (view.cursor + n - 1) % n;
    return true;
  }
  if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'KeyJ') {
    view.cursor = (view.cursor + 1) % n;
    return true;
  }
  return false;
}
