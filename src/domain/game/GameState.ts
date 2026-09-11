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
import type { ThemeDef } from '../data/themes';
import { themeForFloor } from '../data/themes';

/** モンスターハウス。triggered になると中の敵が起きる */
export interface MonsterHouseState {
  readonly room: Room;
  triggered: boolean;
}
import type { Shopkeeper } from '../entity/Shopkeeper';
import type { Npc } from '../entity/Npc';
import { blocksMovement, blocksProjectileFeature, type TileFeature } from './TileFeature';
import type { FloorEvent } from './FloorEvent';
import type { DungeonLayout } from '../map/DungeonGenerator';

/** フロアの店。keeper が undefined なら店主は敵化済み */
export interface ShopState {
  readonly room: Room;
  keeper: Shopkeeper | undefined;
}

export type GameStatus = 'playing' | 'dead' | 'won' | 'escaped';

/** 闇市: 店主のいない店。出口に番人が眠っている */
export interface BlackMarketState {
  readonly room: Room;
}

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
  monsterHouse: MonsterHouseState | undefined;
  /** 店主以外の中立 NPC（鍛冶屋など） */
  npcs: Npc[] = [];
  /** フロアで毎ターン進む出来事 */
  events: FloorEvent[] = [];
  blackMarket: BlackMarketState | undefined;
  /** 霧: 部屋の中でも視界が狭い */
  fog = false;
  /** このフロアに到着してからのターン数（危険度） */
  floorTurns = 0;
  /** フロアの形（迷路・大部屋など） */
  layout: DungeonLayout = 'sectors';
  /** 鍵のかかった扉の内側のマス（敵・アイテムを勝手に置かない） */
  readonly lockedTiles = new Set<string>();
  private readonly features = new Map<string, TileFeature>();
  theme: ThemeDef = themeForFloor(1);
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
    this.monsterHouse = undefined;
    this.npcs = [];
    this.events = [];
    this.blackMarket = undefined;
    this.fog = false;
    this.floorTurns = 0;
    this.lockedTiles.clear();
    this.features.clear();
    this.ground.clear();
  }

  get actors(): Actor[] {
    const keeper = this.shop?.keeper;
    const base: Actor[] = [this.player, ...this.allies, ...this.monsters, ...this.npcs];
    if (keeper) base.push(keeper);
    return base;
  }

  actorAt(p: Vec2): Actor | undefined {
    if (this.player.isAlive && this.player.pos.x === p.x && this.player.pos.y === p.y) return this.player;
    const keeper = this.shop?.keeper;
    if (keeper && keeper.isAlive && keeper.pos.x === p.x && keeper.pos.y === p.y) return keeper;
    const npc = this.npcs.find((n) => n.isAlive && n.pos.x === p.x && n.pos.y === p.y);
    if (npc) return npc;
    return (
      this.allies.find((a) => a.isAlive && a.pos.x === p.x && a.pos.y === p.y) ??
      this.monsters.find((m) => m.isAlive && m.pos.x === p.x && m.pos.y === p.y)
    );
  }

  /** アクターか、岩・扉・格子・檻があって入れない */
  isOccupied(p: Vec2): boolean {
    return this.actorAt(p) !== undefined || blocksMovement(this.featureAt(p));
  }

  /** 岩・扉・格子・檻が投擲物を遮る */
  blocksProjectileAt(p: Vec2): boolean {
    return blocksProjectileFeature(this.featureAt(p));
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

  featureAt(p: Vec2): TileFeature | undefined {
    return this.features.get(keyOf(p));
  }

  placeFeature(p: Vec2, f: TileFeature): void {
    this.features.set(keyOf(p), f);
  }

  removeFeatureAt(p: Vec2): void {
    this.features.delete(keyOf(p));
  }

  get allFeatures(): IterableIterator<[string, TileFeature]> {
    return this.features.entries();
  }

  removeDeadMonsters(): void {
    this.monsters = this.monsters.filter((m) => m.isAlive);
    this.allies = this.allies.filter((a) => a.isAlive);
    this.npcs = this.npcs.filter((n) => n.isAlive);
  }
}
