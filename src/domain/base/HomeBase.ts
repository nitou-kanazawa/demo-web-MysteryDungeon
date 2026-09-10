import { IdGenerator } from '../core/Id';
import { ITEM_MAP } from '../data/items';
import { ItemFactory } from '../item/ItemFactory';
import type { ItemInstance } from '../item/ItemInstance';
import type { ItemSnapshot } from '../item/ItemSnapshot';
import { Codex } from '../game/Codex';
import type { AllySnapshot } from '../entity/AllySnapshot';
import { MONSTER_MAP } from '../data/monsters';
import { findBreedRecipe } from '../data/breeding';

/** 牧場の仲間記録（成長を書き戻すため level / exp は可変） */
export interface AllyRecord {
  readonly uid: string;
  readonly defId: string;
  level: number;
  exp: number;
  readonly bonusHp: number;
  readonly bonusAtk: number;
  readonly bonusDef: number;
  inParty: boolean;
}

export type RanchResult<T = undefined> = { ok: true; message: string; value: T } | { ok: false; message: string };

export interface HomeBaseJson {
  readonly inventory: readonly ItemSnapshot[];
  readonly storage: readonly ItemSnapshot[];
  readonly gold: number;
  readonly codex: { monsters: string[]; items: string[]; recipes: string[] };
  readonly sorties: number;
  readonly bestFloor: number;
  readonly clears: number;
  readonly allies?: readonly AllyRecord[];
  readonly nextAllyId?: number;
}

export interface HomeBaseConfig {
  readonly inventoryCapacity: number;
  readonly storageCapacity: number;
  readonly initialItems: readonly string[];
  /** 牧場に置ける仲間の数 */
  readonly ranchCapacity: number;
  /** 一度に連れて行ける仲間の数 */
  readonly partySize: number;
}

export const DEFAULT_HOME_CONFIG: HomeBaseConfig = {
  inventoryCapacity: 20,
  storageCapacity: 40,
  initialItems: ['copper_sword', 'bread', 'herb'],
  ranchCapacity: 12,
  partySize: 3,
};

/**
 * 拠点。出撃をまたいで残るもの（持ち物・倉庫・ゴールド・図鑑・戦績）を保持する。
 * ダンジョン内の GameSession とは独立しており、Campaign が橋渡しをする。
 */
export class HomeBase {
  readonly inventory: ItemInstance[] = [];
  readonly storage: ItemInstance[] = [];
  readonly allies: AllyRecord[] = [];
  private nextAllyId = 1;
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
    for (const a of json.allies ?? []) base.allies.push({ ...a });
    base.nextAllyId = json.nextAllyId ?? base.allies.length + 1;
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
      allies: this.allies.map((a) => ({ ...a })),
      nextAllyId: this.nextAllyId,
    };
  }

  // ---------------------------------------------------------------- 牧場

  get partyCount(): number {
    return this.allies.filter((a) => a.inParty).length;
  }

  /** 牧場に仲間を迎える。満員なら undefined */
  addAlly(snap: AllySnapshot, inParty = false): AllyRecord | undefined {
    if (this.allies.length >= this.config.ranchCapacity) return undefined;
    const rec: AllyRecord = { ...snap, uid: `a${this.nextAllyId++}`, inParty };
    this.allies.push(rec);
    this.codex.seeMonster(snap.defId);
    return rec;
  }

  findAlly(uid: string): AllyRecord | undefined {
    return this.allies.find((a) => a.uid === uid);
  }

  /** 連れて行く／留守番 を切り替える */
  toggleParty(index: number): RanchResult {
    const a = this.allies[index];
    if (!a) return { ok: false, message: 'その仲間はいない。' };
    if (!a.inParty && this.partyCount >= this.config.partySize) {
      return { ok: false, message: `連れて行けるのは${this.config.partySize}体までだ。` };
    }
    a.inParty = !a.inParty;
    const name = MONSTER_MAP.get(a.defId)?.name ?? a.defId;
    return { ok: true, message: a.inParty ? `${name}を連れて行く。` : `${name}は留守番。`, value: undefined };
  }

  release(index: number): RanchResult {
    const a = this.allies[index];
    if (!a) return { ok: false, message: 'その仲間はいない。' };
    this.allies.splice(index, 1);
    const name = MONSTER_MAP.get(a.defId)?.name ?? a.defId;
    return { ok: true, message: `${name}を野に放した。`, value: undefined };
  }

  /**
   * 配合。両親は消え、レシピがあれば新種族、なければランクの高い方の種族で Lv1 の子が生まれる。
   * 子は両親のボーナスの平均と、両親のレベルに応じたボーナスを受け継ぐ。
   */
  breed(i: number, j: number): RanchResult<AllyRecord> {
    if (i === j) return { ok: false, message: '同じ仲間同士は配合できない。' };
    const a = this.allies[i];
    const b = this.allies[j];
    if (!a || !b) return { ok: false, message: 'その仲間はいない。' };
    const da = MONSTER_MAP.get(a.defId);
    const db = MONSTER_MAP.get(b.defId);
    if (!da || !db) return { ok: false, message: '不明な種族だ。' };
    const recipe = findBreedRecipe(a.defId, b.defId);
    const childDef = recipe ? MONSTER_MAP.get(recipe.child) : da.rank >= db.rank ? da : db;
    if (!childDef) return { ok: false, message: '不明な種族だ。' };
    const levels = a.level + b.level;
    const child: AllySnapshot = {
      defId: childDef.id,
      level: 1,
      exp: 0,
      bonusHp: Math.floor((a.bonusHp + b.bonusHp) / 2) + Math.floor(levels / 4),
      bonusAtk: Math.floor((a.bonusAtk + b.bonusAtk) / 2) + Math.floor(levels / 6),
      bonusDef: Math.floor((a.bonusDef + b.bonusDef) / 2) + Math.floor(levels / 8),
    };
    // 両親を取り除く（インデックスの大きい方から）
    for (const idx of [i, j].sort((x, y) => y - x)) this.allies.splice(idx, 1);
    const rec = this.addAlly(child);
    if (!rec) return { ok: false, message: '牧場がいっぱいだ。' };
    const born = recipe ? `新しい種族 ${childDef.name} が生まれた！` : `${childDef.name}が生まれた。`;
    return { ok: true, message: `${da.name}と${db.name}を配合した。${born}`, value: rec };
  }

  /** 出撃に連れて行く仲間 */
  partySnapshots(): AllySnapshot[] {
    return this.allies.filter((a) => a.inParty).map((a) => ({ ...a }));
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
