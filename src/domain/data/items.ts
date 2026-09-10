import type { ItemDef } from '../item/ItemDef';

/** アイテム定義テーブル */
export const ITEM_DEFS: readonly ItemDef[] = [
  // 武器
  { id: 'copper_sword', name: 'どうのつるぎ', category: 'weapon', atk: 3, description: '銅でできた剣。攻撃力+3。' },
  { id: 'iron_sword', name: 'てつのつるぎ', category: 'weapon', atk: 6, description: '鉄の剣。攻撃力+6。' },
  { id: 'dragon_killer', name: 'ドラゴンキラー', category: 'weapon', atk: 10, description: '竜を狩るための大剣。攻撃力+10。' },
  // 盾
  { id: 'scale_shield', name: 'うろこのたて', category: 'shield', def: 2, description: '魔物のうろこでできた盾。防御力+2。' },
  { id: 'iron_shield', name: 'てつのたて', category: 'shield', def: 4, description: '鉄の盾。防御力+4。' },
  // 食料
  { id: 'bread', name: 'パン', category: 'food', effect: { kind: 'feed', nutrition: 50 }, description: '満腹度を50回復する。' },
  { id: 'big_bread', name: 'おおきなパン', category: 'food', effect: { kind: 'feed', nutrition: 100 }, description: '満腹度を100回復する。' },
  // 草
  { id: 'herb', name: 'やくそう', category: 'herb', effect: { kind: 'heal', amount: 30 }, description: 'HPを30回復する。' },
  { id: 'good_herb', name: 'じょうやくそう', category: 'herb', effect: { kind: 'heal', amount: 80 }, description: 'HPを80回復する。' },
  { id: 'special_herb', name: 'とくやくそう', category: 'herb', effect: { kind: 'fullHeal' }, description: 'HPを全回復する。' },
  // 種
  { id: 'life_nut', name: 'いのちのきのみ', category: 'seed', effect: { kind: 'maxHpUp', amount: 5 }, description: '最大HPが5上がる。' },
  { id: 'power_seed', name: 'ちからのたね', category: 'seed', effect: { kind: 'atkUp', amount: 2 }, description: '攻撃力が2上がる。' },
  { id: 'guard_seed', name: 'まもりのたね', category: 'seed', effect: { kind: 'defUp', amount: 1 }, description: '防御力が1上がる。' },
  // 巻物
  { id: 'scroll_light', name: 'あかりの巻物', category: 'scroll', effect: { kind: 'revealMap' }, description: 'フロアの地形がすべて分かる。' },
  { id: 'scroll_warp', name: 'ワープの巻物', category: 'scroll', effect: { kind: 'teleport' }, description: 'フロアのどこかへ瞬間移動する。' },
  { id: 'scroll_confuse', name: '混乱の巻物', category: 'scroll', effect: { kind: 'confuseVisible', turns: 10 }, description: '視界内の敵を混乱させる。' },
  // 杖
  { id: 'staff_paralyze', name: 'かなしばりの杖', category: 'staff', charges: 5, effect: { kind: 'boltParalyze', turns: 8 }, description: '魔法弾が当たった相手を動けなくする。' },
  { id: 'staff_blow', name: 'ふきとばしの杖', category: 'staff', charges: 5, effect: { kind: 'boltKnockback' }, description: '魔法弾が当たった相手を壁まで吹き飛ばす。' },
  { id: 'staff_thunder', name: 'いかずちの杖', category: 'staff', charges: 4, effect: { kind: 'boltDamage', amount: 25 }, description: '雷の魔法弾で25ダメージを与える。' },
  // 壺
  { id: 'pot_storage', name: '保存の壺', category: 'pot', potKind: 'storage', capacity: 4, description: 'アイテムを入れて持ち運べる。中身はいつでも出せる。' },
  { id: 'pot_alchemy', name: '錬金の壺', category: 'pot', potKind: 'alchemy', capacity: 3, description: 'レシピ通りに素材を入れると、時間をかけて新しいアイテムができる。' },
  { id: 'pot_merge', name: '合成の壺', category: 'pot', potKind: 'merge', capacity: 3, description: '同じ種類の装備を入れると修正値が合成される。' },
  { id: 'pot_change', name: '変化の壺', category: 'pot', potKind: 'change', capacity: 3, description: '入れたアイテムが別のアイテムに変わる。' },
  // 素材
  { id: 'iron_lump', name: 'てつのかたまり', category: 'material', description: '錬金の素材。武具を強くする。' },
  { id: 'holy_water', name: 'せいすい', category: 'material', description: '錬金の素材。清らかな水。' },
  { id: 'monster_fang', name: 'まもののキバ', category: 'material', description: '錬金の素材。鋭いキバ。' },
  // ゴールド
  { id: 'gold', name: 'ゴールド', category: 'gold', goldAmount: 1, description: 'お金。' },
];

export const ITEM_MAP: ReadonlyMap<string, ItemDef> = new Map(ITEM_DEFS.map((d) => [d.id, d]));
