import type { IdGenerator } from '../core/Id';
import type { IRng } from '../core/Rng';
import { DIR_VEC, addVec, chebyshev, eqVec, keyOf, type Vec2 } from '../core/Vec2';
import { Monster } from '../entity/Monster';
import type { MonsterDef } from '../entity/MonsterDef';
import type { FloorConfig, ItemSpawnEntry } from '../data/spawnTables';
import type { ItemFactory } from '../item/ItemFactory';
import { DungeonGenerator, type DungeonLayout } from '../map/DungeonGenerator';
import { TileType } from '../map/Tile';
import { reachableFrom } from '../map/Pathfinding';
import type { GameState } from './GameState';
import { findFreeTileNear } from './Placement';
import type { ShopService } from './ShopService';
import { pickTheme, themeForFloor } from '../data/themes';
import { Npc } from '../entity/Npc';
import { BLACKSMITH_DEF } from '../data/npcs';
import { TRAP_KINDS } from './TileFeature';
import { findItemDropTile } from './Placement';
import { CollapseEvent, RefreezeEvent, RollingRockEvent, TideEvent } from './FloorEvent';
import type { TileFeature } from './TileFeature';
import type { Room } from '../map/Room';
import { effectiveSightRadius } from './Sight';

const ORTHO = ['N', 'E', 'S', 'W'] as const;

/** フロアの生成と初期配置（プレイヤー・仲間・敵・アイテム・ギミック） */
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
    state.theme = this.config.alternativeThemes ? pickTheme(state.floor, (items) => rng.pick(items)) : themeForFloor(state.floor);
    state.layout = this.chooseLayout(state, rng);
    const map = this.generator.generate(rng, state.theme.solid, state.layout);
    state.replaceMap(map);
    if (state.theme.id === 'ice') this.freezeRooms(state, rng);
    if (state.theme.id === 'volcano') this.pourLava(state, rng);
    if (state.floor >= 2 && map.solid === TileType.Wall && rng.chance(this.config.mirrorChance)) this.placeMirrors(state, rng);

    const startRoom = this.chooseStartRoom(state, rng);
    state.player.pos = this.chooseStartTile(state, startRoom, rng);
    if (map.get(state.player.pos) === TileType.Lava) map.set(state.player.pos, TileType.Floor);

    for (const ally of state.allies) {
      ally.pos = findFreeTileNear(state, state.player.pos, 6) ?? state.player.pos;
    }

    const stairsRoom = map.roomAt(map.stairs);
    const shopChance = state.theme.id === 'ruins' ? 0.8 : this.config.shopChance;
    if (state.floor >= 2 && rng.chance(shopChance)) {
      const candidates = map.rooms.filter((r) => r !== startRoom && r !== stairsRoom);
      if (candidates.length > 0) {
        const [lo, hi] = this.config.shopItems;
        this.shops.setup(state, rng.pick(candidates), this.itemTable, rng.int(lo, hi), rng);
      }
    }
    if (!state.shop && state.floor >= 4 && rng.chance(this.config.blackMarketChance)) this.buildBlackMarket(state, rng, startRoom, stairsRoom);

    if (state.floor >= this.config.monsterHouseMinFloor && rng.chance(this.config.monsterHouseChance)) {
      const candidates = map.rooms.filter((r) => r !== startRoom && !this.isReservedRoom(state, r));
      if (candidates.length > 0) this.buildMonsterHouse(state, rng.pick(candidates), rng);
    }

    if (state.floor >= 2 && rng.chance(this.config.vaultChance)) this.buildVault(state, rng, startRoom, stairsRoom);
    if (state.floor >= 2 && rng.chance(this.config.cageChance)) this.placeCage(state, rng, startRoom);
    if (state.floor >= 2 && rng.chance(this.config.switchChance)) this.placeSwitch(state, rng);

    const [mMin, mMax] = this.config.monstersPerFloor;
    for (let i = 0; i < rng.int(mMin, mMax); i++) this.spawnMonster(state, rng, true);

    const [iMin, iMax] = this.config.itemsPerFloor;
    for (let i = 0; i < rng.int(iMin, iMax); i++) this.spawnItem(state, rng);

    if (state.floor >= 2) this.placeTraps(state, rng, startRoom);
    if (state.floor >= 2) this.placeFeatures(state, rng, startRoom);
    if (state.theme.id === 'water') state.events.push(new TideEvent(state));
    if (state.theme.id === 'sky') state.events.push(new CollapseEvent());
    if (state.theme.id === 'ice') state.events.push(new RefreezeEvent());
    if (state.floor >= 3 && rng.chance(this.config.rollingRockChance)) this.placeRollingRock(state, rng);
    const smithChance = state.theme.id === 'ruins' ? 0.7 : this.config.blacksmithChance;
    if (state.floor >= 2 && rng.chance(smithChance)) this.placeBlacksmith(state, rng, startRoom);
    if (state.floor >= 4 && stairsRoom && stairsRoom !== startRoom && rng.chance(this.config.guardianChance)) {
      this.placeGuardian(state, rng, stairsRoom);
    }
    if (state.floor >= 3 && state.theme.id !== 'dark' && rng.chance(this.config.fogChance)) state.fog = true;

    state.visibility.sightRadius = effectiveSightRadius(state);
    state.visibility.update(state.player.pos);
  }

  /** フロアの形を決める。テーマ指定 > 迷路・大部屋の抽選 > 既定 */
  private chooseLayout(state: GameState, rng: IRng): DungeonLayout {
    if (state.theme.layout) return state.theme.layout;
    if (state.floor >= 3) {
      if (rng.chance(this.config.mazeChance)) return 'maze';
      if (rng.chance(this.config.bigRoomChance)) return 'bigRoom';
    }
    return 'sectors';
  }

  private chooseStartRoom(state: GameState, rng: IRng): Room {
    const rooms = state.map.rooms;
    if (rooms.length === 1) return rooms[0] as Room;
    // 迷路など部屋が小さいときは階段の部屋を避ける
    const stairsRoom = state.map.roomAt(state.map.stairs);
    const others = rooms.filter((r) => r !== stairsRoom);
    return rng.pick(others.length > 0 && rooms.length <= 5 ? others : rooms);
  }

  /** 大部屋では階段から最も遠い角、それ以外は部屋のランダムな床 */
  private chooseStartTile(state: GameState, room: Room, rng: IRng): Vec2 {
    if (state.layout === 'bigRoom') {
      const s = state.map.stairs;
      const corners: Vec2[] = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.right - 1, y: room.y + 1 },
        { x: room.x + 1, y: room.bottom - 1 },
        { x: room.right - 1, y: room.bottom - 1 },
      ];
      return corners.reduce((best, c) => (chebyshev(c, s) > chebyshev(best, s) ? c : best), corners[0] as Vec2);
    }
    for (let i = 0; i < 40; i++) {
      const p = this.randomFloorIn(state, room.x, room.right, room.y, room.bottom, rng);
      if (state.map.get(p) !== TileType.Stairs && !state.lockedTiles.has(keyOf(p))) return p;
    }
    return this.randomFloorIn(state, room.x, room.right, room.y, room.bottom, rng);
  }

  /** 店・闇市・モンスターハウスなど、物や敵を勝手に置かない部屋 */
  private isReservedRoom(state: GameState, room: Room): boolean {
    return state.shop?.room === room || state.blackMarket?.room === room || state.monsterHouse?.room === room;
  }

  /** 物を置ける床か（床タイル・空き・鍵の内側でない） */
  private isFreeFloor(state: GameState, t: Vec2): boolean {
    return (
      state.map.get(t) === TileType.Floor &&
      !state.itemAt(t) &&
      !state.featureAt(t) &&
      !state.isOccupied(t) &&
      !state.lockedTiles.has(keyOf(t))
    );
  }

  private freeTileIn(state: GameState, room: Room, rng: IRng): Vec2 | undefined {
    const tiles = [...room.tiles()].filter((t) => this.isFreeFloor(state, t));
    return tiles.length > 0 ? rng.pick(tiles) : undefined;
  }

  /** 隠し罠を部屋の床に置く（開始部屋は避ける） */
  private placeTraps(state: GameState, rng: IRng, startRoom: Room): void {
    const [lo, hi] = this.config.trapsPerFloor;
    const n = rng.int(lo, hi);
    const rooms = state.map.rooms.filter((r) => r !== startRoom && !this.isReservedRoom(state, r));
    for (let i = 0; i < n && rooms.length > 0; i++) {
      const p = this.freeTileIn(state, rng.pick(rooms), rng);
      if (p) state.placeFeature(p, { kind: 'trap', trap: rng.pick(TRAP_KINDS), hidden: true });
    }
  }

  /** 氷の洞窟: 部屋の床の 75% を氷にする（残りは滑り止めの岩床） */
  private freezeRooms(state: GameState, rng: IRng): void {
    for (const room of state.map.rooms) {
      for (const t of room.tiles()) {
        if (state.map.get(t) === TileType.Floor && rng.chance(0.75)) state.map.set(t, TileType.Ice);
      }
    }
  }

  /** 火山: 各部屋に溶岩だまりを 1〜2 つ（楕円）。階段の上には作らない */
  private pourLava(state: GameState, rng: IRng): void {
    for (const room of state.map.rooms) {
      const pools = rng.int(1, 2);
      for (let i = 0; i < pools; i++) {
        const cx = rng.int(room.x, room.right);
        const cy = rng.int(room.y, room.bottom);
        const rx = rng.int(1, 3);
        const ry = rng.int(1, 2);
        for (const t of room.tiles()) {
          const dx = (t.x - cx) / (rx + 0.5);
          const dy = (t.y - cy) / (ry + 0.5);
          if (dx * dx + dy * dy <= 1 && state.map.get(t) === TileType.Floor) state.map.set(t, TileType.Lava);
        }
      }
    }
  }

  /** 反射壁: 部屋の外周の壁（出入口・角以外）を 2〜4 マス鏡にする */
  private placeMirrors(state: GameState, rng: IRng): void {
    const n = rng.int(2, 4);
    for (let i = 0; i < n; i++) {
      const room = rng.pick(state.map.rooms);
      const candidates: Vec2[] = [];
      for (let x = room.x; x <= room.right; x++) {
        candidates.push({ x, y: room.y - 1 }, { x, y: room.bottom + 1 });
      }
      for (let y = room.y; y <= room.bottom; y++) {
        candidates.push({ x: room.x - 1, y }, { x: room.right + 1, y });
      }
      const walls = candidates.filter((p) => state.map.inBounds(p) && state.map.get(p) === TileType.Wall);
      if (walls.length > 0) state.map.set(rng.pick(walls), TileType.Mirror);
    }
  }

  /** 跳ね床・泉・石碑・岩を部屋に置く */
  private placeFeatures(state: GameState, rng: IRng, startRoom: Room): void {
    const rooms = state.map.rooms.filter((r) => !this.isReservedRoom(state, r));
    const put = (f: TileFeature, avoidStart = true): void => {
      const pool = avoidStart ? rooms.filter((r) => r !== startRoom) : rooms;
      if (pool.length === 0) return;
      const p = this.freeTileIn(state, rng.pick(pool), rng);
      if (p) state.placeFeature(p, f);
    };
    const springs = rng.int(1, 2);
    for (let i = 0; i < springs; i++) put({ kind: 'spring', dir: rng.pick(['N', 'E', 'S', 'W'] as const) });
    if (rng.chance(0.15)) put({ kind: 'fountain', effect: rng.chance(0.75) ? 'heal' : 'curse', uses: 1 }, false);
    if (rng.chance(0.35)) put({ kind: 'sign', text: this.signText(state, rng) }, false);
    if (state.theme.id !== 'cave') {
      const boulders = rng.int(1, 3);
      for (let i = 0; i < boulders; i++) {
        // 岸に接した床に置くと「押して足場にする」遊びが生まれる
        const pool = rooms.filter((r) => r !== startRoom);
        if (pool.length === 0) break;
        const room = rng.pick(pool);
        const shore = [...room.tiles()].filter((t) => {
          if (!this.isFreeFloor(state, t)) return false;
          return ORTHO.some((d) => state.map.get(addVec(t, DIR_VEC[d])) === state.map.solid);
        });
        if (shore.length > 0) state.placeFeature(rng.pick(shore), { kind: 'boulder' });
      }
    }
  }

  private signText(state: GameState, rng: IRng): string {
    const hints: string[] = [];
    const s = state.map.stairs;
    const dirH = s.x < state.map.width / 2 ? '西' : '東';
    const dirV = s.y < state.map.height / 2 ? '北' : '南';
    hints.push(`階段は${dirV}${dirH}の方角にある`);
    if (state.shop) hints.push('この階には店がある。品物は大切に');
    if (state.blackMarket) hints.push('店主のいない店がある。だが出口には番人が…');
    if (state.monsterHouse) hints.push('魔物の巣に近づくな… 眠りを妨げれば全員が牙をむく');
    if (state.monsters.some((m) => m.guardian)) hints.push('階段の番人は眠っている。近づけば目を覚ます');
    if (state.npcs.some((n) => n.role === 'blacksmith')) hints.push('ドワーフの鍛冶屋が腕をふるっている');
    if (state.lockedTiles.size > 0) hints.push('宝物庫のカギはどこかの部屋に落ちている');
    if ([...state.allFeatures].some(([, f]) => f.kind === 'cage')) hints.push('檻に囚われた魔物がいる。カギで開けてやれ');
    if ([...state.allFeatures].some(([, f]) => f.kind === 'switch')) hints.push('スイッチを踏めば道が開く');
    if (state.theme.id === 'water') hints.push('潮の満ち引きに気をつけろ。橋は永遠ではない');
    if (state.theme.id === 'sky') hints.push('歩いた回廊は崩れる。振り返るな');
    hints.push('罠は踏むまで見えない。急ぐ者ほど落ちる');
    return rng.pick(hints);
  }

  private placeBlacksmith(state: GameState, rng: IRng, startRoom: Room): void {
    const rooms = state.map.rooms.filter((r) => r !== startRoom && !this.isReservedRoom(state, r));
    if (rooms.length === 0) return;
    const p = this.freeTileIn(state, rng.pick(rooms), rng);
    if (!p) return;
    state.npcs.push(new Npc(this.ids.generate(), 'blacksmith', BLACKSMITH_DEF, p));
  }

  /** 階層 +2 までの最強種族（番人用） */
  private strongestDef(state: GameState): MonsterDef | undefined {
    const candidates = this.monsterDefs.filter((d) => state.floor + 2 >= d.minFloor && d.minFloor > 0);
    const first = candidates[0];
    if (!first) return undefined;
    return candidates.reduce((best, d) => (d.rank > best.rank ? d : best), first);
  }

  /** 番人: 2 階上までの最強種族を HP2倍で階段の部屋に眠らせる */
  private placeGuardian(state: GameState, rng: IRng, stairsRoom: Room): void {
    void stairsRoom;
    void rng;
    const def = this.strongestDef(state);
    if (!def) return;
    const p = findFreeTileNear(state, state.map.stairs, 2);
    if (!p) return;
    state.monsters.push(this.createMonster(state, def, p).makeGuardian());
  }

  /** 番人撃破時のドロップ（出現テーブルから 1 つ） */
  dropGuardianReward(state: GameState, rng: IRng, at: Vec2): void {
    const entry = this.pickWeighted(Math.min(10, state.floor + 3), rng);
    if (!entry || entry.defId === 'gold') return;
    const tile = findItemDropTile(state, at);
    if (tile) state.placeItem(tile, this.factory.create(entry.defId, rng));
  }

  /** テーマの上乗せ（暗黒の攻撃力など）を反映した敵を作る */
  private createMonster(state: GameState, def: MonsterDef, p: Vec2): Monster {
    const m = new Monster(this.ids.generate(), def, p);
    m.atkBonus = state.theme.monsterAtkBonus ?? 0;
    return m;
  }

  /** 指定位置に階層相応の敵を 1 体（召喚の罠など） */
  spawnMonsterAt(state: GameState, rng: IRng, p: Vec2): Monster | undefined {
    const candidates = this.monsterDefs.filter((d) => state.floor >= d.minFloor && state.floor <= d.maxFloor);
    if (candidates.length === 0 || state.isOccupied(p) || state.map.get(p) === TileType.Lava) return undefined;
    const m = this.createMonster(state, rng.pick(candidates), p);
    state.monsters.push(m);
    return m;
  }

  /** モンスターハウス: 部屋いっぱいの眠った敵とアイテム */
  private buildMonsterHouse(state: GameState, room: Room, rng: IRng): void {
    state.monsterHouse = { room, triggered: false };
    const tiles = rng.shuffle([...room.tiles()].filter((t) => state.map.get(t) !== TileType.Stairs && state.map.isWalkable(t)));
    const area = room.w * room.h;
    const monsterCount = Math.min(12, Math.max(4, Math.floor(area / 4)));
    const itemCount = Math.min(8, Math.max(3, Math.floor(area / 6)));
    const candidates = this.monsterDefs.filter((d) => state.floor + 1 >= d.minFloor && state.floor <= d.maxFloor);
    for (let i = 0; i < monsterCount && tiles.length > 0; i++) {
      const p = tiles.pop() as Vec2;
      if (state.isOccupied(p) || candidates.length === 0) continue;
      const m = this.createMonster(state, rng.pick(candidates), p);
      m.asleep = true;
      state.monsters.push(m);
    }
    for (let i = 0; i < itemCount && tiles.length > 0; i++) {
      const p = tiles.pop() as Vec2;
      const entry = this.pickWeighted(state.floor, rng);
      if (entry) state.placeItem(p, this.factory.create(entry.defId, rng));
    }
  }

  /**
   * 闇市: 店主のいない店。商品は値札なしで持ち出し自由だが、部屋の出口ごとに番人が眠っている。
   */
  private buildBlackMarket(state: GameState, rng: IRng, startRoom: Room, stairsRoom: Room | undefined): void {
    const rooms = state.map.rooms.filter((r) => r !== startRoom && r !== stairsRoom && !this.isReservedRoom(state, r));
    if (rooms.length === 0) return;
    const room = rng.pick(rooms);
    const exits: Vec2[] = [];
    for (const t of room.tiles()) {
      for (const d of ORTHO) {
        const n = addVec(t, DIR_VEC[d]);
        if (!room.contains(n) && state.map.get(n) === TileType.Corridor && !exits.some((e) => eqVec(e, n))) exits.push(n);
      }
    }
    if (exits.length === 0) return;
    const def = this.strongestDef(state);
    if (!def) return;
    state.blackMarket = { room };
    for (const e of exits) {
      if (state.isOccupied(e)) continue;
      state.monsters.push(this.createMonster(state, def, e).makeGuardian());
    }
    const pool = this.itemTable.filter((e) => e.defId !== 'gold' && state.floor + 2 >= e.minFloor && state.floor <= e.maxFloor);
    const count = rng.int(4, 6);
    for (let i = 0; i < count && pool.length > 0; i++) {
      const p = this.freeTileIn(state, room, rng);
      if (!p || state.map.get(p) === TileType.Stairs) continue;
      state.placeItem(p, this.factory.create(rng.pick(pool).defId, rng));
    }
  }

  /**
   * 宝物庫: 7×6 以上の部屋の内側に 3×2 の小部屋を壁で囲い、1 マスだけ鍵付きの扉にする。
   * 中には階層 +4 のテーブルから武具・種・壺・素材を 3 つ。カギは別の部屋に置く。
   */
  private buildVault(state: GameState, rng: IRng, startRoom: Room, stairsRoom: Room | undefined): void {
    const rooms = state.map.rooms.filter((r) => r !== startRoom && r !== stairsRoom && !this.isReservedRoom(state, r) && r.w >= 7 && r.h >= 6);
    if (rooms.length === 0) return;
    const room = rng.pick(rooms);
    const vx = rng.int(room.x + 2, room.right - 4);
    const vy = rng.int(room.y + 2, room.bottom - 3);
    const inner: Vec2[] = [];
    for (let y = vy; y <= vy + 1; y++) for (let x = vx; x <= vx + 2; x++) inner.push({ x, y });
    const ring: Vec2[] = [];
    for (let y = vy - 1; y <= vy + 2; y++) {
      for (let x = vx - 1; x <= vx + 3; x++) {
        if (y === vy - 1 || y === vy + 2 || x === vx - 1 || x === vx + 3) ring.push({ x, y });
      }
    }
    const all = [...inner, ...ring];
    if (all.some((t) => state.map.get(t) === TileType.Stairs || state.isOccupied(t) || state.itemAt(t) || state.featureAt(t))) return;
    // 扉は下辺の中央（角以外）
    const door = { x: vx + 1, y: vy + 2 };
    for (const t of ring) {
      if (eqVec(t, door)) {
        state.map.set(t, TileType.Floor);
        state.placeFeature(t, { kind: 'door' });
      } else {
        state.map.set(t, TileType.Wall);
      }
    }
    for (const t of inner) {
      state.map.set(t, TileType.Floor);
      state.lockedTiles.add(keyOf(t));
    }
    state.lockedTiles.add(keyOf(door));
    const pool = this.itemTable.filter(
      (e) =>
        state.floor + 4 >= e.minFloor &&
        ['copper_sword', 'iron_sword', 'dragon_killer', 'scale_shield', 'iron_shield', 'life_nut', 'power_seed', 'guard_seed', 'pot_merge', 'pot_alchemy', 'iron_lump', 'monster_fang'].includes(e.defId),
    );
    const spots = rng.shuffle(inner).slice(0, 3);
    for (const p of spots) {
      if (pool.length === 0) break;
      const item = this.factory.create(rng.pick(pool).defId, rng);
      if (item.def.category === 'weapon' || item.def.category === 'shield') item.plus = rng.int(1, 3);
      state.placeItem(p, item);
    }
    this.placeKey(state, rng, room);
  }

  /** 囚われた仲間: 檻の中に仲間候補。カギは別の部屋に */
  private placeCage(state: GameState, rng: IRng, startRoom: Room): void {
    const rooms = state.map.rooms.filter((r) => r !== startRoom && !this.isReservedRoom(state, r));
    if (rooms.length === 0) return;
    const room = rng.pick(rooms);
    const p = this.freeTileIn(state, room, rng);
    if (!p || state.map.get(p) === TileType.Stairs) return;
    const candidates = this.monsterDefs.filter((d) => d.recruitChance > 0 && d.minFloor > 0 && d.minFloor <= state.floor + 2);
    if (candidates.length === 0) return;
    state.placeFeature(p, { kind: 'cage', defId: rng.pick(candidates).id });
    this.placeKey(state, rng, room);
  }

  /** カギを avoid 以外の部屋の床に置く */
  private placeKey(state: GameState, rng: IRng, avoid: Room): void {
    const rooms = state.map.rooms.filter((r) => r !== avoid && !this.isReservedRoom(state, r));
    const pool = rooms.length > 0 ? rooms : [avoid];
    for (let attempt = 0; attempt < 10; attempt++) {
      const p = this.freeTileIn(state, rng.pick(pool), rng);
      if (p && state.map.get(p) !== TileType.Stairs) {
        state.placeItem(p, this.factory.create('key', rng));
        return;
      }
    }
  }

  /**
   * スイッチ。水・空のテーマでは「使わなかった接続」の経路が橋になる。
   * 壁のテーマでは余分な接続（ループ）の両端に格子を置き、スイッチで開く。
   */
  private placeSwitch(state: GameState, rng: IRng): void {
    const map = state.map;
    const rooms = map.rooms.filter((r) => !this.isReservedRoom(state, r));
    if (rooms.length === 0) return;
    if (map.solid !== TileType.Wall) {
      if (map.unusedPaths.length === 0) return;
      const path = rng.pick(map.unusedPaths).filter((t) => map.get(t) === map.solid);
      if (path.length === 0) return;
      const p = this.freeTileIn(state, rng.pick(rooms), rng);
      if (!p) return;
      state.placeFeature(p, { kind: 'switch', targets: path, mode: 'bridge', active: false });
      return;
    }
    const extras = map.corridors.filter((c) => c.extra && c.tiles.length >= 2);
    if (extras.length === 0) return;
    const corridor = rng.pick(extras);
    const first = corridor.tiles[0] as Vec2;
    const last = corridor.tiles[corridor.tiles.length - 1] as Vec2;
    const gates = [first, last].filter((t) => map.get(t) === TileType.Corridor && !state.isOccupied(t) && !state.featureAt(t));
    if (gates.length === 0) return;
    // 格子を置いても（塞いだ通路自身を除いて）全床が連結していることを確認する
    const corridorKeys = new Set(corridor.tiles.map(keyOf));
    const walkable = [...map.walkableTiles()].filter((t) => !corridorKeys.has(keyOf(t)));
    const start = walkable.find((t) => map.get(t) === TileType.Stairs) ?? walkable[0];
    if (!start) return;
    const reach = reachableFrom(map, start, (t) => gates.some((g) => eqVec(g, t)));
    if (walkable.some((t) => !reach.has(keyOf(t)))) return;
    const candidates = rooms.filter((r) => r !== corridor.a && r !== corridor.b);
    const p = this.freeTileIn(state, rng.pick(candidates.length > 0 ? candidates : rooms), rng);
    if (!p) return;
    for (const g of gates) state.placeFeature(g, { kind: 'gate' });
    state.placeFeature(p, { kind: 'switch', targets: gates, mode: 'gate', active: false });
  }

  /** 転がる岩: 長さ 6 以上の直線通路を探して岩を置く */
  private placeRollingRock(state: GameState, rng: IRng): void {
    const map = state.map;
    const lanes: Vec2[][] = [];
    const isCorridor = (p: Vec2): boolean => map.get(p) === TileType.Corridor;
    for (let y = 0; y < map.height; y++) {
      let run: Vec2[] = [];
      for (let x = 0; x <= map.width; x++) {
        const p = { x, y };
        if (x < map.width && isCorridor(p)) {
          run.push(p);
        } else {
          if (run.length >= 6) lanes.push(run);
          run = [];
        }
      }
    }
    for (let x = 0; x < map.width; x++) {
      let run: Vec2[] = [];
      for (let y = 0; y <= map.height; y++) {
        const p = { x, y };
        if (y < map.height && isCorridor(p)) {
          run.push(p);
        } else {
          if (run.length >= 6) lanes.push(run);
          run = [];
        }
      }
    }
    const usable = lanes.filter((lane) => lane.every((t) => !state.isOccupied(t) && !state.featureAt(t) && !eqVec(t, state.player.pos)));
    if (usable.length === 0) return;
    state.events.push(new RollingRockEvent(state, rng.pick(usable)));
  }

  /** プレイヤーの部屋を避けてモンスターを1体湧かせる */
  spawnMonster(state: GameState, rng: IRng, avoidPlayerRoom: boolean): Monster | undefined {
    const candidates = this.monsterDefs.filter((d) => state.floor >= d.minFloor && state.floor <= d.maxFloor);
    if (candidates.length === 0) return undefined;
    const def = rng.pick(candidates);
    const playerRoom = state.map.roomAt(state.player.pos);
    const rooms = state.map.rooms.filter((r) => (!avoidPlayerRoom || r !== playerRoom) && !this.isReservedRoom(state, r));
    // 大部屋など避けられる部屋が無いときは、プレイヤーから離れたマスに湧く
    const pool = rooms.length > 0 ? rooms : state.map.rooms.filter((r) => !this.isReservedRoom(state, r));
    if (pool.length === 0) return undefined;
    const room = rng.pick(pool);
    const farOnly = rooms.length === 0;
    for (let attempt = 0; attempt < 20; attempt++) {
      const p = this.randomFloorIn(state, room.x, room.right, room.y, room.bottom, rng);
      if (state.isOccupied(p) || eqVec(p, state.player.pos) || state.map.get(p) === TileType.Lava) continue;
      if (state.lockedTiles.has(keyOf(p))) continue;
      if (farOnly && chebyshev(p, state.player.pos) < 8) continue;
      const m = this.createMonster(state, def, p);
      state.monsters.push(m);
      return m;
    }
    return undefined;
  }

  private spawnItem(state: GameState, rng: IRng): void {
    const entry = this.pickWeighted(state.floor, rng);
    if (!entry) return;
    const rooms = state.map.rooms.filter((r) => !this.isReservedRoom(state, r));
    if (rooms.length === 0) return;
    const room = rng.pick(rooms);
    for (let attempt = 0; attempt < 20; attempt++) {
      const p = this.randomFloorIn(state, room.x, room.right, room.y, room.bottom, rng);
      if (state.itemAt(p) || state.map.get(p) === TileType.Stairs || state.map.get(p) === TileType.Lava) continue;
      if (state.featureAt(p) || state.lockedTiles.has(keyOf(p))) continue;
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

  /** 部屋の矩形内から歩ける床を 1 つ選ぶ（宝物庫の壁などを避ける） */
  private randomFloorIn(state: GameState, x0: number, x1: number, y0: number, y1: number, rng: IRng): Vec2 {
    for (let i = 0; i < 30; i++) {
      const p = { x: rng.int(x0, x1), y: rng.int(y0, y1) };
      if (state.map.isWalkable(p)) return p;
    }
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) if (state.map.isWalkable({ x, y })) return { x, y };
    }
    return { x: x0, y: y0 };
  }
}
