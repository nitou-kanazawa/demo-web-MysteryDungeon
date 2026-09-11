import type { IdGenerator } from '../core/Id';
import type { IRng } from '../core/Rng';
import type { ItemDef } from './ItemDef';
import { ItemInstance } from './ItemInstance';
import type { ItemSnapshot } from './ItemSnapshot';

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

  /** スナップショットから実体を復元する（値札は含めない） */
  restore(snap: ItemSnapshot): ItemInstance {
    const item = new ItemInstance(this.ids.generate(), this.get(snap.id));
    item.plus = snap.plus ?? 0;
    if (snap.charges !== undefined) item.charges = snap.charges;
    for (const c of snap.contents ?? []) item.contents.push(this.restore(c));
    if (snap.brewing) item.brewing = { result: this.get(snap.brewing.result), remaining: snap.brewing.remaining };
    return item;
  }

  static snapshot(item: ItemInstance): ItemSnapshot {
    const snap: {
      id: string;
      plus?: number;
      charges?: number;
      contents?: ItemSnapshot[];
      brewing?: { result: string; remaining: number };
    } = { id: item.def.id };
    if (item.plus !== 0) snap.plus = item.plus;
    if (item.def.category === 'staff') snap.charges = item.charges;
    if (item.contents.length > 0) snap.contents = item.contents.map((c) => ItemFactory.snapshot(c));
    if (item.brewing) snap.brewing = { result: item.brewing.result.id, remaining: item.brewing.remaining };
    return snap;
  }

  get(defId: string): ItemDef {
    const def = this.defs.get(defId);
    if (!def) throw new Error(`unknown item def: ${defId}`);
    return def;
  }
}
