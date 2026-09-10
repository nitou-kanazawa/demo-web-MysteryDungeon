import { keyOf, type Vec2 } from '../core/Vec2';
import type { Actor } from '../entity/Actor';
import type { Ally } from '../entity/Ally';
import type { Monster } from '../entity/Monster';
import type { Player } from '../entity/Player';
import type { ItemInstance } from '../item/ItemInstance';
import type { DungeonMap } from '../map/DungeonMap';
import { Visibility } from '../map/Visibility';
import type { Room } from '../map/Room';
import type { Tactic } from './Tactic';
import type { Shopkeeper } from '../entity/Shopkeeper';

/** フロアの店。keeper が undefined なら店主は敵化済み */
export interface ShopState {
  readonly room: Room;
  keeper: Shopkeeper | undefined;
}

export type GameStatus = 'playing' | 'dead' | 'won' | 'escaped';

/** 1プレイの可変状態をまとめたコンテナ。ロジックは持たない */
export class GameState {
  floor = 1;
  turn = 0;
  status: GameStatus = 'playing';
  map: DungeonMap;
  visibility: Visibility;
  monsters: Monster[] = [];
  allies: Ally[] = [];
  shop: ShopState | undefined;
  /** 仲間への作戦 */
  tactic: Tactic = 'aggressive';
  private readonly ground = new Map<string, ItemInstance>();

  constructor(
    map: DungeonMap,
    readonly player: Player,
  ) {
    this.map = map;
    this.visibility = new Visibility(map);
  }

  replaceMap(map: DungeonMap): void {
    this.map = map;
    this.visibility = new Visibility(map);
    this.monsters = [];
    this.shop = undefined;
    this.ground.clear();
  }

  get actors(): Actor[] {
    const keeper = this.shop?.keeper;
    return keeper ? [this.player, ...this.allies, ...this.monsters, keeper] : [this.player, ...this.allies, ...this.monsters];
  }

  actorAt(p: Vec2): Actor | undefined {
    if (this.player.isAlive && this.player.pos.x === p.x && this.player.pos.y === p.y) return this.player;
    const keeper = this.shop?.keeper;
    if (keeper && keeper.isAlive && keeper.pos.x === p.x && keeper.pos.y === p.y) return keeper;
    return (
      this.allies.find((a) => a.isAlive && a.pos.x === p.x && a.pos.y === p.y) ??
      this.monsters.find((m) => m.isAlive && m.pos.x === p.x && m.pos.y === p.y)
    );
  }

  isOccupied(p: Vec2): boolean {
    return this.actorAt(p) !== undefined;
  }

  itemAt(p: Vec2): ItemInstance | undefined {
    return this.ground.get(keyOf(p));
  }

  placeItem(p: Vec2, item: ItemInstance): void {
    this.ground.set(keyOf(p), item);
  }

  removeItemAt(p: Vec2): ItemInstance | undefined {
    const k = keyOf(p);
    const item = this.ground.get(k);
    this.ground.delete(k);
    return item;
  }

  get groundItems(): IterableIterator<[string, ItemInstance]> {
    return this.ground.entries();
  }

  removeDeadMonsters(): void {
    this.monsters = this.monsters.filter((m) => m.isAlive);
    this.allies = this.allies.filter((a) => a.isAlive);
  }
}
