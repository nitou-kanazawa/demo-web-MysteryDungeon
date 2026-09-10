import type { IdGenerator } from '../core/Id';
import type { IRng } from '../core/Rng';
import type { ItemDef } from './ItemDef';
import { ItemInstance } from './ItemInstance';

/** アイテム定義から実体を生成する。修正値のランダム付与もここで行う */
export class ItemFactory {
  constructor(
    private readonly ids: IdGenerator,
    private readonly defs: ReadonlyMap<string, ItemDef>,
  ) {}

  create(defId: string, rng?: IRng): ItemInstance {
    const def = this.defs.get(defId);
    if (!def) throw new Error(`unknown item def: ${defId}`);
    return this.createFromDef(def, rng);
  }

  createFromDef(def: ItemDef, rng?: IRng): ItemInstance {
    const item = new ItemInstance(this.ids.generate(), def);
    if (rng && (def.category === 'weapon' || def.category === 'shield')) {
      if (rng.chance(0.3)) item.plus = rng.int(1, 3);
    }
    if (rng && def.category === 'staff') {
      item.charges = rng.int(3, def.charges ?? 5);
    }
    return item;
  }

  get(defId: string): ItemDef {
    const def = this.defs.get(defId);
    if (!def) throw new Error(`unknown item def: ${defId}`);
    return def;
  }
}
