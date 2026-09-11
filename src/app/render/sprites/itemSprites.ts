import type { ItemCategory, ItemDef, PotKind } from '../../../domain/item/ItemDef';
import { PixelCanvas } from './PixelCanvas';
import { recolor, type PixelSprite } from './PixelSprite';

/** 剣: b 刃、e 刃の光、g 鍔・柄、k 柄巻き */
const SWORD: PixelSprite = new PixelCanvas()
  .line(8, 24, 24, 8, 'b', 3)
  .line(9, 23, 23, 9, 'e')
  .line(7, 21, 12, 26, 'g', 2)
  .line(5, 26, 8, 29, 'k', 2)
  .stamp(4, 28, ['gg', 'gg'])
  .outline('#')
  .toSprite({ '#': '#1b1b24', b: '#d9dde3', e: '#ffffff', g: '#b8860b', k: '#6b3e1a' });

/** 盾: s 面、r 縁、c 紋章 */
const SHIELD: PixelSprite = new PixelCanvas()
  .rect(7, 5, 18, 12, 's')
  .ellipse(15.5, 17, 9, 10, 's')
  .rect(7, 5, 18, 2, 'r')
  .rect(7, 5, 2, 14, 'r')
  .rect(23, 5, 2, 14, 'r')
  .rect(14, 9, 4, 12, 'c')
  .rect(11, 12, 10, 3, 'c')
  .outline('#')
  .toSprite({ '#': '#1b1b24', s: '#9ca3af', r: '#4b5563', c: '#b91c1c' });

/** パン */
const BREAD: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 17, 11, 6, 'b')
  .ellipse(15.5, 15, 10, 5, 'l')
  .stamp(9, 13, ['..s', '.s', 's']).stamp(15, 12, ['..s', '.s', 's']).stamp(21, 12, ['..s', '.s', 's'])
  .outline('#')
  .toSprite({ '#': '#3d2a14', b: '#b8843c', l: '#d9a85a', s: '#f0d9a6' });

/** 葉（草） */
const HERB: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 15, 7, 10, 'g')
  .line(15, 26, 15, 6, 'v')
  .line(15, 20, 10, 14, 'v')
  .line(16, 16, 21, 10, 'v')
  .line(15, 28, 15, 24, 't', 2)
  .outline('#')
  .toSprite({ '#': '#0f3d1c', g: '#22c55e', v: '#15803d', t: '#7c4a1d' });

/** 種（3 粒） */
const SEED: PixelSprite = new PixelCanvas()
  .ellipse(10, 20, 4, 3, 's')
  .ellipse(21, 21, 4, 3, 's')
  .ellipse(15.5, 12, 4, 3, 's')
  .stamp(8, 19, ['h']).stamp(19, 20, ['h']).stamp(14, 11, ['h'])
  .outline('#')
  .toSprite({ '#': '#5a2a0a', s: '#f97316', h: '#fdba74' });

/** 巻物 */
const SCROLL: PixelSprite = new PixelCanvas()
  .rect(8, 6, 16, 20, 'p')
  .rect(6, 5, 20, 3, 'r')
  .rect(6, 24, 20, 3, 'r')
  .rect(10, 11, 12, 1, 'i').rect(10, 14, 12, 1, 'i').rect(10, 17, 8, 1, 'i').rect(10, 20, 10, 1, 'i')
  .outline('#')
  .toSprite({ '#': '#3d2a14', p: '#f5e6c8', r: '#a67c52', i: '#7c5a3a' });

/** 杖: w 柄、o 宝玉、s 宝玉の光 */
const STAFF: PixelSprite = new PixelCanvas()
  .line(9, 27, 21, 9, 'w', 3)
  .ellipse(22, 8, 4, 4, 'o')
  .stamp(20, 6, ['s'])
  .stamp(8, 26, ['ww', 'ww'])
  .outline('#')
  .toSprite({ '#': '#2a1a0e', w: '#a16207', o: '#60a5fa', s: '#e0f2fe' });

/** 壺 */
const POT: PixelSprite = new PixelCanvas()
  .rect(11, 4, 10, 3, 'p')
  .ellipse(15.5, 18, 10, 10, 'p')
  .rect(9, 26, 14, 3, 'p')
  .rect(10, 12, 3, 8, 'h')
  .rect(11, 6, 10, 2, 'd')
  .ellipse(15.5, 5, 5, 1, 'd')
  .outline('#')
  .toSprite({ '#': '#3a1a05', p: '#b45309', h: '#d97706', d: '#7c3306' });

/** 素材（結晶） */
const GEM: PixelSprite = new PixelCanvas()
  .stamp(15, 4, ['g'])
  .trapezoid(15.5, 5, 9, 2, 16, 'g')
  .trapezoid(15.5, 14, 12, 16, 2, 'g')
  .line(15, 5, 15, 25, 'l')
  .line(9, 14, 15, 5, 'l')
  .outline('#')
  .toSprite({ '#': '#1e293b', g: '#94a3b8', l: '#e2e8f0' });

/** たいまつ */
const TORCH: PixelSprite = new PixelCanvas()
  .line(13, 28, 17, 14, 'w', 3)
  .rect(13, 12, 6, 4, 'b')
  .ellipse(15.5, 8, 5, 6, 'f')
  .ellipse(15.5, 9, 3, 4, 'y')
  .stamp(15, 3, ['s'])
  .outline('#')
  .toSprite({ '#': '#3a1a05', w: '#8b5a2b', b: '#4b2e13', f: '#f97316', y: '#fde047', s: '#fff7ae' });

/** カギ */
const KEY: PixelSprite = new PixelCanvas()
  .ellipse(10, 11, 5, 5, 'k')
  .ellipse(10, 11, 2, 2, 'h')
  .line(14, 13, 25, 24, 'k', 3)
  .stamp(22, 24, ['kk', 'k']).stamp(19, 21, ['.k', 'kk'])
  .outline('#')
  .toSprite({ '#': '#5a3a05', k: '#fbbf24', h: '#1c1917' });

/** 金貨 */
const COIN: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 16, 10, 10, 'c')
  .ellipse(15.5, 16, 7, 7, 'i')
  .stamp(12, 11, ['.gggg', 'gg...', 'gg.gg', 'gg..g', '.gggg'])
  .stamp(9, 9, ['h', 'h'])
  .outline('#')
  .toSprite({ '#': '#5a3a05', c: '#fbbf24', i: '#f59e0b', g: '#92400e', h: '#fef3c7' });

const BY_CATEGORY: Readonly<Record<ItemCategory, PixelSprite>> = {
  weapon: SWORD,
  shield: SHIELD,
  food: BREAD,
  herb: HERB,
  seed: SEED,
  scroll: SCROLL,
  staff: STAFF,
  pot: POT,
  material: GEM,
  tool: TORCH,
  gold: COIN,
};

/** 定義 ID ごとの専用スプライト */
const BY_ID_SPRITE: Readonly<Record<string, PixelSprite>> = {
  key: KEY,
};

/** 定義ごとの色差し替え（種類内のバリエーション） */
const BY_ID: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  copper_sword: { b: '#d08a4a', e: '#f5c08a' },
  iron_sword: { b: '#d9dde3', e: '#ffffff' },
  dragon_killer: { b: '#93c5fd', e: '#e0f2fe', g: '#dc2626' },
  scale_shield: { s: '#4ade80', r: '#166534', c: '#facc15' },
  iron_shield: { s: '#9ca3af', r: '#4b5563', c: '#b91c1c' },
  big_bread: { b: '#a86f2a', l: '#c98f3f' },
  good_herb: { g: '#4ade80', v: '#16a34a' },
  special_herb: { g: '#a3e635', v: '#65a30d' },
  life_nut: { s: '#ef4444', h: '#fca5a5' },
  power_seed: { s: '#f97316', h: '#fdba74' },
  guard_seed: { s: '#3b82f6', h: '#93c5fd' },
  scroll_light: { r: '#facc15' },
  scroll_warp: { r: '#a78bfa' },
  scroll_confuse: { r: '#f472b6' },
  scroll_escape: { r: '#38bdf8' },
  staff_paralyze: { o: '#c084fc', s: '#f3e8ff' },
  staff_blow: { o: '#4ade80', s: '#dcfce7' },
  staff_thunder: { o: '#facc15', s: '#fef9c3' },
  iron_lump: { g: '#94a3b8', l: '#e2e8f0' },
  holy_water: { g: '#7dd3fc', l: '#e0f2fe' },
  monster_fang: { g: '#fde68a', l: '#fffbeb' },
};

const POT_COLORS: Readonly<Record<PotKind, Readonly<Record<string, string>>>> = {
  storage: { p: '#b45309', h: '#d97706', d: '#7c3306' },
  alchemy: { p: '#7c3aed', h: '#a78bfa', d: '#4c1d95' },
  merge: { p: '#dc2626', h: '#f87171', d: '#7f1d1d' },
  change: { p: '#0891b2', h: '#22d3ee', d: '#155e75' },
};

const cache = new Map<string, PixelSprite>();

/** アイテム定義に対応するスプライト */
export function itemSprite(def: ItemDef): PixelSprite {
  const hit = cache.get(def.id);
  if (hit) return hit;
  const base = BY_ID_SPRITE[def.id] ?? BY_CATEGORY[def.category];
  const override = def.category === 'pot' && def.potKind ? POT_COLORS[def.potKind] : BY_ID[def.id];
  const sprite = override ? recolor(base, override) : base;
  cache.set(def.id, sprite);
  return sprite;
}
