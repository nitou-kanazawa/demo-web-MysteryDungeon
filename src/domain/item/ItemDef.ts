export type ItemCategory =
  | 'weapon'
  | 'shield'
  | 'food'
  | 'herb'
  | 'seed'
  | 'scroll'
  | 'staff'
  | 'pot'
  | 'material'
  | 'gold';

export type PotKind = 'storage' | 'alchemy' | 'merge' | 'change';

/** 使用時の効果。解釈はゲーム層の EffectResolver が行う */
export type ItemEffect =
  | { readonly kind: 'heal'; readonly amount: number }
  | { readonly kind: 'fullHeal' }
  | { readonly kind: 'feed'; readonly nutrition: number }
  | { readonly kind: 'maxHpUp'; readonly amount: number }
  | { readonly kind: 'atkUp'; readonly amount: number }
  | { readonly kind: 'defUp'; readonly amount: number }
  | { readonly kind: 'revealMap' }
  | { readonly kind: 'teleport' }
  | { readonly kind: 'confuseVisible'; readonly turns: number }
  | { readonly kind: 'boltParalyze'; readonly turns: number }
  | { readonly kind: 'boltKnockback' }
  | { readonly kind: 'boltDamage'; readonly amount: number };

export interface ItemDef {
  readonly id: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly description: string;
  /** 武器の攻撃力 */
  readonly atk?: number;
  /** 盾の防御力 */
  readonly def?: number;
  /** 投げたときのダメージ（未指定なら 2） */
  readonly throwDamage?: number;
  /** 使用効果（食料・草・種・巻物・杖） */
  readonly effect?: ItemEffect;
  /** 杖の初期回数 */
  readonly charges?: number;
  /** 壺の種類 */
  readonly potKind?: PotKind;
  /** 壺の容量 */
  readonly capacity?: number;
  /** 金貨の額 */
  readonly goldAmount?: number;
}

export const CATEGORY_LABEL: Readonly<Record<ItemCategory, string>> = {
  weapon: '武器',
  shield: '盾',
  food: '食料',
  herb: '草',
  seed: '種',
  scroll: '巻物',
  staff: '杖',
  pot: '壺',
  material: '素材',
  gold: 'ゴールド',
};

export const POT_KIND_LABEL: Readonly<Record<PotKind, string>> = {
  storage: '保存の壺',
  alchemy: '錬金の壺',
  merge: '合成の壺',
  change: '変化の壺',
};

export const isEquipment = (def: ItemDef): boolean => def.category === 'weapon' || def.category === 'shield';
export const isConsumable = (def: ItemDef): boolean =>
  def.category === 'food' || def.category === 'herb' || def.category === 'seed' || def.category === 'scroll';
