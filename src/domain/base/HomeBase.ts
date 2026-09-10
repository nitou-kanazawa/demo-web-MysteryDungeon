import { IdGenerator } from '../core/Id';
import { ITEM_MAP } from '../data/items';
import { ItemFactory } from '../item/ItemFactory';
import type { ItemInstance } from '../item/ItemInstance';
import type { ItemSnapshot } from '../item/ItemSnapshot';
import { Codex } from '../game/Codex';

export interface HomeBaseJson {
  readonly inventory: readonly ItemSnapshot[];
  readonly storage: readonly ItemSnapshot[];
  readonly gold: number;
  readonly codex: { monsters: string[]; items: string[]; recipes: string[] };
  readonly sorties: number;
  readonly bestFloor: number;
  readonly clears: number;
}

export interface HomeBaseConfig {
  readonly inventoryCapacity: number;
  readonly storageCapacity: number;
  readonly initialItems: readonly string[];
}

export const DEFAULT_HOME_CONFIG: HomeBaseConfig = {
  inventoryCapacity: 20,
  storageCapacity: 40,
  initialItems: ['copper_sword', 'bread', 'herb'],
};

/**
 * 拠点。出撃をまたいで残るもの（持ち物・倉庫・ゴールド・図鑑・戦績）を保持する。
 * ダンジョン内の GameSession とは独立しており、Campaign が橋渡しをする。
 */
export class HomeBase {
  readonly inventory: ItemInstance[] = [];
  readonly storage: ItemInstance[] = [];
  gold = 0;
  readonly codex: Codex;
  sorties = 0;
  bestFloor = 0;
  clears = 0;
  private readonly factory: ItemFactory;

  constructor(
    readonly config: HomeBaseConfig = DEFAULT_HOME_CONFIG,
    codex?: Codex,
  ) {
    this.factory = new ItemFactory(new IdGenerator(), ITEM_MAP);
    this.codex = codex ?? new Codex();
  }

  /** 初回起動用: 初期装備を持ち物に入れる */
  static createNew(config: HomeBaseConfig = DEFAULT_HOME_CONFIG): HomeBase {
    const base = new HomeBase(config);
    for (const id of config.initialItems) {
      const item = base.factory.create(id);
      base.inventory.push(item);
      base.codex.obtainItem(id);
    }
    return base;
  }

  static fromJSON(json: HomeBaseJson, config: HomeBaseConfig = DEFAULT_HOME_CONFIG): HomeBase {
    const base = new HomeBase(config, new Codex(json.codex));
    for (const s of json.inventory) base.inventory.push(base.factory.restore(s));
    for (const s of json.storage) base.storage.push(base.factory.restore(s));
    base.gold = json.gold;
    base.sorties = json.sorties;
    base.bestFloor = json.bestFloor;
    base.clears = json.clears;
    return base;
  }

  toJSON(): HomeBaseJson {
    return {
      inventory: this.inventory.map((i) => ItemFactory.snapshot(i)),
      storage: this.storage.map((i) => ItemFactory.snapshot(i)),
      gold: this.gold,
      codex: this.codex.toJSON(),
      sorties: this.sorties,
      bestFloor: this.bestFloor,
      clears: this.clears,
    };
  }

  /** 持ち物 → 倉庫 */
  deposit(index: number): boolean {
    const item = this.inventory[index];
    if (!item || this.storage.length >= this.config.storageCapacity) return false;
    this.inventory.splice(index, 1);
    this.storage.push(item);
    return true;
  }

  /** 倉庫 → 持ち物 */
  withdraw(index: number): boolean {
    const item = this.storage[index];
    if (!item || this.inventory.length >= this.config.inventoryCapacity) return false;
    this.storage.splice(index, 1);
    this.inventory.push(item);
    return true;
  }

  /** 出撃用スナップショット */
  inventorySnapshot(): ItemSnapshot[] {
    return this.inventory.map((i) => ItemFactory.snapshot(i));
  }

  /** 帰還時に持ち物を差し替える */
  replaceInventory(snaps: readonly ItemSnapshot[]): void {
    this.inventory.length = 0;
    for (const s of snaps) this.inventory.push(this.factory.restore(s));
  }
}
