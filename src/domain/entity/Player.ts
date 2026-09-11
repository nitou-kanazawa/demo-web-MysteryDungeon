import type { Direction, Vec2 } from '../core/Vec2';
import { Inventory } from '../item/Inventory';
import type { ItemInstance } from '../item/ItemInstance';
import { Actor } from './Actor';

export interface PlayerConfig {
  readonly maxHp: number;
  readonly atk: number;
  readonly def: number;
  readonly maxHunger: number;
  readonly inventoryCapacity: number;
  /** 松明の初期燃料と上限（ターン） */
  readonly torch: number;
  readonly maxTorch: number;
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  maxHp: 20,
  atk: 4,
  def: 1,
  maxHunger: 100,
  inventoryCapacity: 20,
  torch: 300,
  maxTorch: 400,
};

export class Player extends Actor {
  level = 1;
  exp = 0;
  baseAtk: number;
  baseDef: number;
  hunger: number;
  readonly maxHunger: number;
  gold = 0;
  facing: Direction = 'S';
  /** 松明の燃料（ターン）。0 になると暗闇 */
  torch: number;
  readonly maxTorch: number;
  readonly inventory: Inventory;
  weapon: ItemInstance | undefined;
  shield: ItemInstance | undefined;

  constructor(id: number, pos: Vec2, config: PlayerConfig = DEFAULT_PLAYER_CONFIG) {
    super(id, 'ヤンガス', '@', '#7CFC00', 'player', pos, config.maxHp);
    this.baseAtk = config.atk;
    this.baseDef = config.def;
    this.maxHunger = config.maxHunger;
    this.hunger = config.maxHunger;
    this.torch = config.torch;
    this.maxTorch = config.maxTorch;
    this.inventory = new Inventory(config.inventoryCapacity);
  }

  get atk(): number {
    const w = this.weapon;
    return this.baseAtk + (w ? (w.def.atk ?? 0) + w.plus : 0);
  }

  get def(): number {
    const s = this.shield;
    return this.baseDef + (s ? (s.def.def ?? 0) + s.plus : 0);
  }

  /** 経験値を得てレベルアップした回数を返す */
  gainExp(amount: number): number {
    this.exp += amount;
    let ups = 0;
    while (this.exp >= expToNextLevel(this.level)) {
      this.exp -= expToNextLevel(this.level);
      this.level++;
      this.maxHp += 4;
      this.baseAtk += 2;
      this.baseDef += 1;
      this.hp = Math.min(this.maxHp, this.hp + 4);
      ups++;
    }
    return ups;
  }

  isEquipped(item: ItemInstance): boolean {
    return this.weapon === item || this.shield === item;
  }
}

/** プレイヤーのレベル lv → lv+1 に必要な経験値 */
export function expToNextLevel(lv: number): number {
  return Math.floor(10 * Math.pow(1.6, lv - 1));
}
