import type { IdGenerator } from '../core/Id';
import type { IRng } from '../core/Rng';
import { eqVec, type Vec2 } from '../core/Vec2';
import { Monster } from '../entity/Monster';
import type { MonsterDef } from '../entity/MonsterDef';
import type { FloorConfig, ItemSpawnEntry } from '../data/spawnTables';
import type { ItemFactory } from '../item/ItemFactory';
import { DungeonGenerator } from '../map/DungeonGenerator';
import { TileType } from '../map/Tile';
import type { GameState } from './GameState';
import { findFreeTileNear } from './Placement';
import type { ShopService } from './ShopService';
import { themeForFloor } from '../data/themes';
import type { Room } from '../map/Room';

/** フロアの生成と初期配置（プレイヤー・仲間・敵・アイテム） */
export class FloorBuilder {
  constructor(
    private readonly generator: DungeonGenerator,
    private readonly monsterDefs: readonly MonsterDef[],
    private readonly itemTable: readonly ItemSpawnEntry[],
    private readonly factory: ItemFactory,
    private readonly ids: IdGenerator,
    private readonly config: FloorConfig,
    private readonly shops: ShopService,
  ) {}

  build(state: GameState, rng: IRng): void {
    state.theme = themeForFloor(state.floor);
    const map = this.generator.generate(rng, state.theme.solid);
    state.replaceMap(map);

    const startRoom = rng.pick(map.rooms);
    state.player.pos = this.randomFloorIn(state, startRoom.x, startRoom.right, startRoom.y, startRoom.bottom, rng);

    for (const ally of state.allies) {
      ally.pos = findFreeTileNear(state, state.player.pos, 6) ?? state.player.pos;
    }

    const stairsRoom = map.roomAt(map.stairs);
    if (state.floor >= 2 && rng.chance(this.config.shopChance)) {
      const candidates = map.rooms.filter((r) => r !== startRoom && r !== stairsRoom);
      if (candidates.length > 0) {
        const [lo, hi] = this.config.shopItems;
        this.shops.setup(state, rng.pick(candidates), this.itemTable, rng.int(lo, hi), rng);
      }
    }

    if (state.floor >= this.config.monsterHouseMinFloor && rng.chance(this.config.monsterHouseChance)) {
      const candidates = map.rooms.filter((r) => r !== startRoom && r !== state.shop?.room);
      if (candidates.length > 0) this.buildMonsterHouse(state, rng.pick(candidates), rng);
    }

    const [mMin, mMax] = this.config.monstersPerFloor;
    for (let i = 0; i < rng.int(mMin, mMax); i++) this.spawnMonster(state, rng, true);

    const [iMin, iMax] = this.config.itemsPerFloor;
    for (let i = 0; i < rng.int(iMin, iMax); i++) this.spawnItem(state, rng);

    state.visibility.update(state.player.pos);
  }

  /** モンスターハウス: 部屋いっぱいの眠った敵とアイテム */
  private buildMonsterHouse(state: GameState, room: Room, rng: IRng): void {
    state.monsterHouse = { room, triggered: false };
    const tiles = rng.shuffle([...room.tiles()].filter((t) => state.map.get(t) !== TileType.Stairs));
    const area = room.w * room.h;
    const monsterCount = Math.min(12, Math.max(4, Math.floor(area / 4)));
    const itemCount = Math.min(8, Math.max(3, Math.floor(area / 6)));
    const candidates = this.monsterDefs.filter((d) => state.floor + 1 >= d.minFloor && state.floor <= d.maxFloor);
    for (let i = 0; i < monsterCount && tiles.length > 0; i++) {
      const p = tiles.pop() as Vec2;
      if (state.isOccupied(p) || candidates.length === 0) continue;
      const m = new Monster(this.ids.generate(), rng.pick(candidates), p);
      m.asleep = true;
      state.monsters.push(m);
    }
    for (let i = 0; i < itemCount && tiles.length > 0; i++) {
      const p = tiles.pop() as Vec2;
      const entry = this.pickWeighted(state.floor, rng);
      if (entry) state.placeItem(p, this.factory.create(entry.defId, rng));
    }
  }

  /** プレイヤーの部屋を避けてモンスターを1体湧かせる */
  spawnMonster(state: GameState, rng: IRng, avoidPlayerRoom: boolean): Monster | undefined {
    const candidates = this.monsterDefs.filter((d) => state.floor >= d.minFloor && state.floor <= d.maxFloor);
    if (candidates.length === 0) return undefined;
    const def = rng.pick(candidates);
    const playerRoom = state.map.roomAt(state.player.pos);
    const rooms = state.map.rooms.filter(
      (r) => (!avoidPlayerRoom || r !== playerRoom) && !this.isShopRoom(state, r) && r !== state.monsterHouse?.room,
    );
    if (rooms.length === 0) return undefined;
    const room = rng.pick(rooms);
    for (let attempt = 0; attempt < 20; attempt++) {
      const p = this.randomFloorIn(state, room.x, room.right, room.y, room.bottom, rng);
      if (!state.isOccupied(p) && !eqVec(p, state.player.pos)) {
        const m = new Monster(this.ids.generate(), def, p);
        state.monsters.push(m);
        return m;
      }
    }
    return undefined;
  }

  private spawnItem(state: GameState, rng: IRng): void {
    const entry = this.pickWeighted(state.floor, rng);
    if (!entry) return;
    const rooms = state.map.rooms.filter((r) => !this.isShopRoom(state, r) && r !== state.monsterHouse?.room);
    if (rooms.length === 0) return;
    const room = rng.pick(rooms);
    for (let attempt = 0; attempt < 20; attempt++) {
      const p = this.randomFloorIn(state, room.x, room.right, room.y, room.bottom, rng);
      if (state.itemAt(p) || state.map.get(p) === TileType.Stairs) continue;
      const item = this.factory.create(entry.defId, rng);
      state.placeItem(p, item);
      return;
    }
  }

  private pickWeighted(floor: number, rng: IRng): ItemSpawnEntry | undefined {
    const pool = this.itemTable.filter((e) => floor >= e.minFloor && floor <= e.maxFloor);
    const total = pool.reduce((s, e) => s + e.weight, 0);
    if (total <= 0) return undefined;
    let r = rng.next() * total;
    for (const e of pool) {
      r -= e.weight;
      if (r < 0) return e;
    }
    return pool[pool.length - 1];
  }

  private isShopRoom(state: GameState, room: Room): boolean {
    return state.shop?.room === room;
  }

  private randomFloorIn(state: GameState, x0: number, x1: number, y0: number, y1: number, rng: IRng): Vec2 {
    void state;
    return { x: rng.int(x0, x1), y: rng.int(y0, y1) };
  }
}
