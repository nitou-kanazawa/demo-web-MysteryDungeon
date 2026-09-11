import type { Recipe } from './Recipe';

/** レシピの検索と発見状況の管理 */
export class RecipeBook {
  private readonly discovered: Set<string>;

  /** discovered を渡すと図鑑などと発見状況を共有できる */
  constructor(
    readonly recipes: readonly Recipe[],
    discovered?: Set<string>,
  ) {
    this.discovered = discovered ?? new Set<string>();
  }

  /** 定義IDの多重集合に完全一致するレシピを返す */
  find(defIds: readonly string[]): Recipe | undefined {
    const key = RecipeBook.keyOf(defIds);
    return this.recipes.find((r) => RecipeBook.keyOf(r.inputs) === key);
  }

  /** 与えた素材集合が、あるレシピの部分集合になっているか（途中経過判定） */
  isPartialMatch(defIds: readonly string[]): boolean {
    return this.recipes.some((r) => {
      const remain = [...r.inputs];
      for (const id of defIds) {
        const i = remain.indexOf(id);
        if (i < 0) return false;
        remain.splice(i, 1);
      }
      return remain.length > 0;
    });
  }

  markDiscovered(recipe: Recipe): boolean {
    if (this.discovered.has(recipe.id)) return false;
    this.discovered.add(recipe.id);
    return true;
  }

  isDiscovered(recipe: Recipe): boolean {
    return this.discovered.has(recipe.id);
  }

  private static keyOf(ids: readonly string[]): string {
    return [...ids].sort().join('+');
  }
}
