import type { IRng } from '../core/Rng';
import type { RecipeBook } from '../alchemy/RecipeBook';
import type { ItemDef } from './ItemDef';
import type { ItemFactory } from './ItemFactory';
import type { ItemInstance } from './ItemInstance';

export type PotResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * 壺の振る舞い（保存／錬金／合成／変化）を担当するドメインサービス。
 * 状態は ItemInstance 側に持ち、本サービスは純粋にルールだけを扱う。
 */
export class PotService {
  constructor(
    private readonly factory: ItemFactory,
    private readonly recipes: RecipeBook,
    /** 変化の壺の候補（壺・ゴールドを除く定義） */
    private readonly changePool: readonly ItemDef[],
  ) {}

  canTakeOut(pot: ItemInstance): boolean {
    return pot.isPot && !pot.brewing && pot.contents.length > 0;
  }

  insert(pot: ItemInstance, item: ItemInstance, rng: IRng): PotResult {
    if (!pot.isPot) return { ok: false, message: 'それは壺ではない。' };
    if (item.isPot) return { ok: false, message: '壺を壺に入れることはできない。' };
    if (pot.brewing) return { ok: false, message: '調合中は入れられない。' };
    if (pot.contents.length >= pot.capacity) return { ok: false, message: '壺はいっぱいだ。' };

    switch (pot.def.potKind) {
      case 'storage':
        pot.contents.push(item);
        return { ok: true, message: `${item.displayName}を壺に入れた。` };
      case 'alchemy':
        return this.insertAlchemy(pot, item);
      case 'merge':
        return this.insertMerge(pot, item);
      case 'change': {
        const def = rng.pick(this.changePool);
        const changed = this.factory.createFromDef(def, rng);
        pot.contents.push(changed);
        return { ok: true, message: `${item.displayName}を壺に入れた。壺の中で何かが変わった…` };
      }
      default:
        return { ok: false, message: 'この壺には入れられない。' };
    }
  }

  takeOut(pot: ItemInstance, index: number): ItemInstance | undefined {
    if (!this.canTakeOut(pot)) return undefined;
    const [item] = pot.contents.splice(index, 1);
    return item;
  }

  /** ターン経過。調合が完了したら結果を返す */
  tick(pot: ItemInstance): ItemInstance | undefined {
    if (!pot.brewing) return undefined;
    pot.brewing.remaining--;
    if (pot.brewing.remaining > 0) return undefined;
    const result = this.factory.createFromDef(pot.brewing.result);
    pot.brewing = undefined;
    pot.contents.length = 0;
    pot.contents.push(result);
    return result;
  }

  private insertAlchemy(pot: ItemInstance, item: ItemInstance): PotResult {
    const ids = [...pot.contents.map((c) => c.def.id), item.def.id];
    const recipe = this.recipes.find(ids);
    if (recipe) {
      pot.contents.length = 0;
      pot.brewing = { result: this.factory.get(recipe.output), remaining: recipe.turns };
      const first = this.recipes.markDiscovered(recipe);
      const name = this.factory.get(recipe.output).name;
      return {
        ok: true,
        message: first ? `錬金が始まった！ 新しいレシピを発見した：${name}` : `錬金が始まった！（${name}）`,
      };
    }
    if (!this.recipes.isPartialMatch(ids)) {
      return { ok: false, message: 'その組み合わせでは錬金できそうにない。' };
    }
    pot.contents.push(item);
    return { ok: true, message: `${item.displayName}を錬金の壺に入れた。` };
  }

  private insertMerge(pot: ItemInstance, item: ItemInstance): PotResult {
    const cat = item.def.category;
    if (cat !== 'weapon' && cat !== 'shield') return { ok: false, message: '合成の壺には武器か盾しか入らない。' };
    const base = pot.contents[0];
    if (!base) {
      pot.contents.push(item);
      return { ok: true, message: `${item.displayName}を合成の壺に入れた。` };
    }
    if (base.def.category !== cat) return { ok: false, message: '同じ種類の装備しか合成できない。' };
    // ベースに修正値を吸収させる（+1 は合成ボーナス）
    base.plus += item.plus + 1;
    return { ok: true, message: `${item.displayName}が${base.displayName}に合成された！` };
  }
}
