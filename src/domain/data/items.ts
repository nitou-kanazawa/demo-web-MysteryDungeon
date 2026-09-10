import type { ItemDef } from '../item/ItemDef';

/** アイテム定義テーブル */
export const ITEM_DEFS: readonly ItemDef[] = [
  // 武器
  { id: 'copper_sword', name: 'どうのつるぎ', category: 'weapon', price: 300, atk: 3, description: '銅でできた剣。攻撃力+3。' },
  { id: 'iron_sword', name: 'てつのつるぎ', category: 'weapon', price: 800, atk: 6, description: '鉄の剣。攻撃力+6。' },
  { id: 'dragon_killer', name: 'ドラゴンキラー', category: 'weapon', price: 2500, atk: 10, description: '竜を狩るための大剣。攻撃力+10。' },
  // 盾
  { id: 'scale_shield', name: 'うろこのたて', category: 'shield', price: 300, def: 2, description: '魔物のうろこでできた盾。防御力+2。' },
  { id: 'iron_shield', name: 'てつのたて', category: 'shield', price: 800, def: 4, description: '鉄の盾。防御力+4。' },
  // 食料
  { id: 'bread', name: 'パン', category: 'food', price: 60, effect: { kind: 'feed', nutrition: 50 }, description: '満腹度を50回復する。' },
  { id: 'big_bread', name: 'おおきなパン', category: 'food', price: 150, effect: { kind: 'feed', nutrition: 100 }, description: '満腹度を100回復する。' },
  // 草
  { id: 'herb', name: 'やくそう', category: 'herb', price: 50, effect: { kind: 'heal', amount: 30 }, description: 'HPを30回復する。' },
  { id: 'good_herb', name: 'じょうやくそう', category: 'herb', price: 150, effect: { kind: 'heal', amount: 80 }, description: 'HPを80回復する。' },
  { id: 'special_herb', name: 'とくやくそう', category: 'herb', price: 400, effect: { kind: 'fullHeal' }, description: 'HPを全回復する。' },
  // 種
  { id: 'life_nut', name: 'いのちのきのみ', category: 'seed', price: 1000, effect: { kind: 'maxHpUp', amount: 5 }, description: '最大HPが5上がる。' },
  { id: 'power_seed', name: 'ちからのたね', category: 'seed', price: 800, effect: { kind: 'atkUp', amount: 2 }, description: '攻撃力が2上がる。' },
  { id: 'guard_seed', name: 'まもりのたね', category: 'seed', price: 800, effect: { kind: 'defUp', amount: 1 }, description: '防御力が1上がる。' },
  // 巻物
  { id: 'scroll_light', name: 'あかりの巻物', category: 'scroll', price: 200, effect: { kind: 'revealMap' }, description: 'フロアの地形がすべて分かる。' },
  { id: 'scroll_warp', name: 'ワープの巻物', category: 'scroll', price: 250, effect: { kind: 'teleport' }, description: 'フロアのどこかへ瞬間移動する。' },
  { id: 'scroll_escape', name: 'リレミトの巻物', category: 'scroll', price: 350, effect: { kind: 'escape' }, description: 'ダンジョンから脱出して拠点に帰る。' },
  { id: 'scroll_confuse', name: '混乱の巻物', category: 'scroll', price: 300, effect: { kind: 'confuseVisible', turns: 10 }, description: '視界内の敵を混乱させる。' },
  // 杖
  { id: 'staff_paralyze', name: 'かなしばりの杖', category: 'staff', price: 600, charges: 5, effect: { kind: 'boltParalyze', turns: 8 }, description: '魔法弾が当たった相手を動けなくする。' },
  { id: 'staff_blow', name: 'ふきとばしの杖', category: 'staff', price: 500, charges: 5, effect: { kind: 'boltKnockback' }, description: '魔法弾が当たった相手を壁まで吹き飛ばす。' },
  { id: 'staff_thunder', name: 'いかずちの杖', category: 'staff', price: 900, charges: 4, effect: { kind: 'boltDamage', amount: 25 }, description: '雷の魔法弾で25ダメージを与える。' },
  // 壺
  { id: 'pot_storage', name: '保存の壺', category: 'pot', price: 500, potKind: 'storage', capacity: 4, description: 'アイテムを入れて持ち運べる。中身はいつでも出せる。' },
  { id: 'pot_alchemy', name: '錬金の壺', category: 'pot', price: 800, potKind: 'alchemy', capacity: 3, description: 'レシピ通りに素材を入れると、時間をかけて新しいアイテムができる。' },
  { id: 'pot_merge', name: '合成の壺', category: 'pot', price: 1200, potKind: 'merge', capacity: 3, description: '同じ種類の装備を入れると修正値が合成される。' },
  { id: 'pot_change', name: '変化の壺', category: 'pot', price: 700, potKind: 'change', capacity: 3, description: '入れたアイテムが別のアイテムに変わる。' },
  // 素材
  { id: 'iron_lump', name: 'てつのかたまり', category: 'material', price: 200, description: '錬金の素材。武具を強くする。' },
  { id: 'holy_water', name: 'せいすい', category: 'material', price: 150, description: '錬金の素材。清らかな水。' },
  { id: 'monster_fang', name: 'まもののキバ', category: 'material', price: 400, description: '錬金の素材。鋭いキバ。' },
  // ゴールド
  { id: 'gold', name: 'ゴールド', category: 'gold', price: 0, goldAmount: 1, description: 'お金。' },
];

export const ITEM_MAP: ReadonlyMap<string, ItemDef> = new Map(ITEM_DEFS.map((d) => [d.id, d]));
