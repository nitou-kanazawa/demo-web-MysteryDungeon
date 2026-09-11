import { SeededRng } from '../core/Rng';
import { ITEM_MAP } from '../data/items';
import type { ItemDef } from '../item/ItemDef';

/** 武器屋の品揃え候補（定価で販売） */
const WEAPON_POOL = ['copper_sword', 'iron_sword'];
const SHIELD_POOL = ['scale_shield', 'iron_shield'];
const GOODS_POOL = ['herb', 'herb', 'good_herb', 'bread', 'big_bread', 'scroll_light', 'scroll_escape', 'scroll_search', 'staff_paralyze', 'pot_storage', 'iron_lump', 'holy_water', 'torch', 'torch'];

/**
 * 拠点の武器屋。品揃えは「出撃回数」をシードに決定論的に生成し、出撃するたびに入れ替わる。
 * 買値は定価、売値は半額。
 */
export class BaseShop {
  static generateStock(seed: number): string[] {
    const rng = new SeededRng((seed * 2654435761) >>> 0);
    const stock: string[] = [];
    stock.push(rng.pick(WEAPON_POOL));
    stock.push(rng.pick(SHIELD_POOL));
    for (const id of rng.shuffle(GOODS_POOL).slice(0, 5)) stock.push(id);
    return stock;
  }

  static defOf(id: string): ItemDef {
    const def = ITEM_MAP.get(id);
    if (!def) throw new Error(`unknown item def: ${id}`);
    return def;
  }

  static buyPrice(def: ItemDef): number {
    return def.price;
  }

  static sellPrice(def: ItemDef, plus = 0): number {
    return Math.floor((def.price + Math.max(0, plus) * Math.floor(def.price * 0.2)) / 2);
  }
}
