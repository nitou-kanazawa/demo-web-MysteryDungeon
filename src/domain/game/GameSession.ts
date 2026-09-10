import { AllyAI } from '../ai/AllyAI';
import { MonsterAI } from '../ai/MonsterAI';
import type { AiAction } from '../ai/AiAction';
import { RecipeBook } from '../alchemy/RecipeBook';
import { IdGenerator } from '../core/Id';
import { SeededRng, type IRng } from '../core/Rng';
import { DIRECTIONS, DIR_VEC, addVec, type Direction, type Vec2 } from '../core/Vec2';
import { ITEM_DEFS, ITEM_MAP } from '../data/items';
import { MONSTER_DEFS } from '../data/monsters';
import { RECIPES } from '../data/recipes';
import { DEFAULT_FLOOR_CONFIG, ITEM_SPAWN_TABLE, type FloorConfig } from '../data/spawnTables';
import type { Actor } from '../entity/Actor';
import { Player } from '../entity/Player';
import { STATUS_LABEL } from '../entity/StatusEffect';
import { ItemFactory } from '../item/ItemFactory';
import { isConsumable, isEquipment } from '../item/ItemDef';
import type { ItemInstance } from '../item/ItemInstance';
import { PotService } from '../item/PotService';
import { DungeonGenerator, DEFAULT_GENERATOR_CONFIG, type GeneratorConfig } from '../map/DungeonGenerator';
import { TileType } from '../map/Tile';
import { ActionExecutor } from './ActionExecutor';
import type { Command, CommandResult, Replay } from './Command';
import { EffectResolver } from './EffectResolver';
import { FloorBuilder } from './FloorBuilder';
import { GameState } from './GameState';
import { MessageLog } from './MessageLog';
import { findItemDropTile } from './Placement';
import { ShopService } from './ShopService';
import { Codex } from './Codex';
import type { ItemSnapshot } from '../item/ItemSnapshot';

export interface SessionOptions {
  readonly floorConfig?: FloorConfig;
  readonly generatorConfig?: GeneratorConfig;
  /** 初期所持品（定義ID）。テスト・デバッグ用 */
  readonly startingItems?: readonly string[];
  /** 拠点から持ち込むアイテム（修正値・中身を含む） */
  readonly startingInventory?: readonly ItemSnapshot[];
  readonly startingGold?: number;
  /** 図鑑（拠点と共有）。省略時はセッション内だけの図鑑 */
  readonly codex?: Codex;
}

/**
 * 1プレイを統括するファサード。
 * UI からはコマンドを execute() するだけで、すべての状態遷移がここを通る。
 * seed + コマンド列で完全に再現できるため、リプレイ・テストが容易。
 */
export class GameSession {
  readonly state: GameState;
  readonly log = new MessageLog();
  readonly codex: Codex;
  readonly recipes: RecipeBook;
  readonly pots: PotService;
  readonly shops: ShopService;
  readonly history: Command[] = [];
  private readonly startingInventory: readonly ItemSnapshot[];
  private readonly startingGold: number;

  private readonly rng: IRng;
  private readonly ids = new IdGenerator();
  private readonly factory: ItemFactory;
  private readonly floors: FloorBuilder;
  private readonly actions: ActionExecutor;
  private readonly effects: EffectResolver;
  private readonly monsterAI = new MonsterAI();
  private readonly allyAI = new AllyAI();
  private readonly config: FloorConfig;

  constructor(
    readonly seed: number,
    options: SessionOptions = {},
  ) {
    this.rng = new SeededRng(seed);
    this.config = options.floorConfig ?? DEFAULT_FLOOR_CONFIG;
    this.codex = options.codex ?? new Codex();
    this.recipes = new RecipeBook(RECIPES, this.codex.recipes);
    this.factory = new ItemFactory(this.ids, ITEM_MAP);
    this.shops = new ShopService(this.factory, this.ids, this.log);
    const generator = new DungeonGenerator(options.generatorConfig ?? DEFAULT_GENERATOR_CONFIG);
    this.floors = new FloorBuilder(generator, MONSTER_DEFS, ITEM_SPAWN_TABLE, this.factory, this.ids, this.config, this.shops);
    const changePool = ITEM_DEFS.filter((d) => d.category !== 'pot' && d.category !== 'gold');
    this.pots = new PotService(this.factory, this.recipes, changePool);

    const player = new Player(this.ids.generate(), { x: 0, y: 0 });
    this.state = new GameState(generator.generate(new SeededRng(seed ^ 0x9e3779b9)), player);
    this.startingInventory = options.startingInventory ?? [];
    this.startingGold = options.startingGold ?? 0;
    for (const id of options.startingItems ?? []) this.addStartingItem(this.factory.create(id));
    for (const snap of this.startingInventory) this.addStartingItem(this.factory.restore(snap));
    player.gold = this.startingGold;

    this.actions = new ActionExecutor(this.state, this.rng, this.log, this.ids, this.config, this.shops);
    this.effects = new EffectResolver(this.state, this.rng, this.log, this.actions);

    this.floors.build(this.state, this.rng);
    this.log.push(`ダンジョン ${this.state.floor}F。最深部 ${this.config.maxFloor}F の階段を目指せ！`);
  }

  /** seed とコマンド列から同じ状態を再構築する */
  static replay(replay: Replay, options: SessionOptions = {}): GameSession {
    const merged: SessionOptions = {
      ...options,
      ...(replay.startingInventory ? { startingInventory: replay.startingInventory } : {}),
      ...(replay.startingGold !== undefined ? { startingGold: replay.startingGold } : {}),
    };
    const session = new GameSession(replay.seed, merged);
    for (const cmd of replay.commands) session.execute(cmd);
    return session;
  }

  toReplay(): Replay {
    return {
      seed: this.seed,
      commands: [...this.history],
      startingInventory: [...this.startingInventory],
      startingGold: this.startingGold,
    };
  }

  /** 現在の所持品をスナップショット化（拠点への持ち帰り用） */
  inventorySnapshot(): ItemSnapshot[] {
    return this.state.player.inventory.items.map((i) => ItemFactory.snapshot(i));
  }

  private addStartingItem(item: ItemInstance): void {
    this.state.player.inventory.add(item);
    this.codex.obtainItem(item.def.id);
    for (const c of item.contents) this.codex.obtainItem(c.def.id);
  }

  private recordSightings(): void {
    const s = this.state;
    for (const m of s.monsters) {
      if (s.visibility.isVisible(m.pos) && this.codex.seeMonster(m.definition.id)) {
        this.log.push(`図鑑に${m.name}を登録した。`);
      }
    }
    const keeper = s.shop?.keeper;
    if (keeper && s.visibility.isVisible(keeper.pos)) this.codex.seeMonster(keeper.definition.id);
  }

  get maxFloor(): number {
    return this.config.maxFloor;
  }

  execute(cmd: Command): CommandResult {
    if (this.state.status !== 'playing') return { consumedTurn: false, message: 'ゲームは終了している。' };
    this.history.push(cmd);
    const result = this.dispatch(cmd);
    if (result.message) this.log.push(result.message);
    if (result.consumedTurn && this.state.status === 'playing') this.runNpcPhaseAndEndTurn();
    this.state.visibility.update(this.state.player.pos);
    this.recordSightings();
    return result;
  }

  // ---------------------------------------------------------------- commands

  private dispatch(cmd: Command): CommandResult {
    const p = this.state.player;
    if (!p.canAct && cmd.type !== 'wait') {
      return { consumedTurn: true, message: '体が動かない！' };
    }
    switch (cmd.type) {
      case 'move':
        return this.cmdMove(cmd.dir);
      case 'wait':
        return { consumedTurn: true };
      case 'pickup':
        return this.cmdPickup();
      case 'descend':
        return this.cmdDescend();
      case 'use':
        return this.cmdUse(cmd.index);
      case 'equip':
        return this.cmdEquip(cmd.index);
      case 'unequip':
        return this.cmdUnequip(cmd.index);
      case 'drop':
        return this.cmdDrop(cmd.index);
      case 'throw':
        return this.cmdThrow(cmd.index);
      case 'sell':
        return this.cmdSell(cmd.index);
      case 'potInsert':
        return this.cmdPotInsert(cmd.potIndex, cmd.itemIndex);
      case 'potTakeOut':
        return this.cmdPotTakeOut(cmd.potIndex, cmd.contentIndex);
      default:
        return { consumedTurn: false };
    }
  }

  private cmdMove(requested: Direction): CommandResult {
    const p = this.state.player;
    const dir = p.hasStatus('confusion') ? this.rng.pick(DIRECTIONS) : requested;
    p.facing = dir;
    if (!this.state.map.canStep(p.pos, dir)) return { consumedTurn: false };
    const to = addVec(p.pos, DIR_VEC[dir]);
    const other = this.state.actorAt(to);
    if (other) {
      if (other.faction === 'neutral') {
        const r = this.shops.talk(this.state);
        return { consumedTurn: true, message: r.message };
      }
      if (other.faction === 'enemy' || p.hasStatus('confusion')) {
        this.actions.attack(p, other);
        return { consumedTurn: true };
      }
      // 仲間とは位置を入れ替える
      const from = p.pos;
      other.pos = p.pos;
      p.pos = to;
      this.afterPlayerMoved(from);
      return { consumedTurn: true };
    }
    const from = p.pos;
    p.pos = to;
    this.afterPlayerMoved(from);
    return { consumedTurn: true };
  }

  private afterPlayerMoved(from: Vec2): void {
    const p = this.state.player;
    this.shops.onPlayerMoved(this.state, from);
    const item = this.state.itemAt(p.pos);
    if (item) this.pickupAt(p.pos, item);
    if (this.state.map.get(p.pos) === TileType.Stairs) this.log.push('階段がある。（Enterで降りる）');
  }

  private pickupAt(pos: Vec2, item: ItemInstance): boolean {
    const p = this.state.player;
    if (item.def.category === 'gold') {
      this.state.removeItemAt(pos);
      const amount = this.rng.int(20, 60) * this.state.floor;
      p.gold += amount;
      this.log.push(`${amount}ゴールドを拾った。`);
      return true;
    }
    if (p.inventory.isFull) {
      this.log.push(`${item.displayName}の上に乗った。（持ち物がいっぱい）`);
      return false;
    }
    this.state.removeItemAt(pos);
    p.inventory.add(item);
    this.log.push(`${item.displayName}を拾った。`);
    this.shops.onItemPicked(item);
    if (this.codex.obtainItem(item.def.id)) this.log.push(`図鑑に${item.def.name}を登録した。`);
    return true;
  }

  private cmdPickup(): CommandResult {
    const p = this.state.player;
    const item = this.state.itemAt(p.pos);
    if (!item) return { consumedTurn: false, message: 'ここには何もない。' };
    return { consumedTurn: this.pickupAt(p.pos, item) };
  }

  private cmdDescend(): CommandResult {
    const p = this.state.player;
    if (this.state.map.get(p.pos) !== TileType.Stairs) return { consumedTurn: false, message: 'ここに階段はない。' };
    this.shops.settleOnLeave(this.state);
    if (this.state.floor >= this.config.maxFloor) {
      this.state.status = 'won';
      this.log.push('最深部の階段を降りた。ダンジョン踏破！');
      return { consumedTurn: false };
    }
    this.state.floor++;
    this.floors.build(this.state, this.rng);
    this.log.push(`${this.state.floor}F に降りた。`);
    return { consumedTurn: false };
  }

  private itemAt(index: number): ItemInstance | undefined {
    return this.state.player.inventory.at(index);
  }

  private cmdUse(index: number): CommandResult {
    const p = this.state.player;
    const item = this.itemAt(index);
    if (!item) return { consumedTurn: false, message: 'そのアイテムはない。' };
    const effect = item.def.effect;
    if (item.def.category === 'staff') {
      if (item.charges <= 0) return { consumedTurn: true, message: `${item.def.name}を振ったが何も起こらなかった。` };
      item.charges--;
      this.log.push(`${item.def.name}を振った！`);
      if (effect) this.effects.applyBolt(effect, p.pos, p.facing);
      return { consumedTurn: true };
    }
    if (!isConsumable(item.def) || !effect) return { consumedTurn: false, message: 'それは使えない。' };
    const verb = item.def.category === 'scroll' ? '読んだ' : '食べた';
    this.log.push(`${item.def.name}を${verb}。`);
    p.inventory.remove(item);
    this.effects.applySelf(effect);
    if (this.state.status === 'escaped') this.shops.settleOnLeave(this.state);
    return { consumedTurn: true };
  }

  private cmdSell(index: number): CommandResult {
    const item = this.itemAt(index);
    if (!item) return { consumedTurn: false, message: 'そのアイテムはない。' };
    const r = this.shops.sell(this.state, item);
    return { consumedTurn: r.ok, message: r.message };
  }

  private cmdEquip(index: number): CommandResult {
    const p = this.state.player;
    const item = this.itemAt(index);
    if (!item || !isEquipment(item.def)) return { consumedTurn: false, message: 'それは装備できない。' };
    if (p.isEquipped(item)) return { consumedTurn: false, message: 'すでに装備している。' };
    if (item.def.category === 'weapon') p.weapon = item;
    else p.shield = item;
    return { consumedTurn: true, message: `${item.displayName}を装備した。` };
  }

  private cmdUnequip(index: number): CommandResult {
    const p = this.state.player;
    const item = this.itemAt(index);
    if (!item || !p.isEquipped(item)) return { consumedTurn: false, message: 'それは装備していない。' };
    if (p.weapon === item) p.weapon = undefined;
    if (p.shield === item) p.shield = undefined;
    return { consumedTurn: true, message: `${item.displayName}を外した。` };
  }

  private cmdDrop(index: number): CommandResult {
    const p = this.state.player;
    const item = this.itemAt(index);
    if (!item) return { consumedTurn: false, message: 'そのアイテムはない。' };
    const tile = findItemDropTile(this.state, p.pos);
    if (!tile) return { consumedTurn: false, message: 'ここには置けない。' };
    this.unequipIfNeeded(item);
    p.inventory.remove(item);
    this.state.placeItem(tile, item);
    this.shops.onItemDropped(this.state, item, tile);
    return { consumedTurn: true, message: `${item.displayName}を置いた。` };
  }

  private cmdThrow(index: number): CommandResult {
    const p = this.state.player;
    const item = this.itemAt(index);
    if (!item) return { consumedTurn: false, message: 'そのアイテムはない。' };
    this.unequipIfNeeded(item);
    p.inventory.remove(item);
    this.log.push(`${item.displayName}を投げた！`);

    let last = p.pos;
    let hit: Actor | undefined;
    for (let i = 0; i < 10; i++) {
      const next = addVec(last, DIR_VEC[p.facing]);
      if (!this.state.map.isWalkable(next)) break;
      hit = this.state.actorAt(next);
      if (hit) break;
      last = next;
    }
    if (hit) {
      const dmg = item.def.throwDamage ?? (item.def.atk ? item.def.atk + item.plus : 2);
      this.actions.dealDamage(p, hit, dmg);
    }
    if (item.isPot) {
      this.log.push('壺が割れた！');
      for (const c of item.contents) {
        const t = findItemDropTile(this.state, last);
        if (t) this.state.placeItem(t, c);
      }
      return { consumedTurn: true };
    }
    const tile = findItemDropTile(this.state, last);
    if (tile) this.state.placeItem(tile, item);
    else this.log.push(`${item.displayName}はどこかへ消えた。`);
    return { consumedTurn: true };
  }

  private cmdPotInsert(potIndex: number, itemIndex: number): CommandResult {
    const p = this.state.player;
    const pot = this.itemAt(potIndex);
    const item = this.itemAt(itemIndex);
    if (!pot || !item || pot === item) return { consumedTurn: false, message: 'そのアイテムはない。' };
    const result = this.pots.insert(pot, item, this.rng);
    if (!result.ok) return { consumedTurn: false, message: result.message };
    this.unequipIfNeeded(item);
    p.inventory.remove(item);
    return { consumedTurn: true, message: result.message };
  }

  private cmdPotTakeOut(potIndex: number, contentIndex: number): CommandResult {
    const p = this.state.player;
    const pot = this.itemAt(potIndex);
    if (!pot || !pot.isPot) return { consumedTurn: false, message: 'それは壺ではない。' };
    if (pot.brewing) return { consumedTurn: false, message: '調合中は取り出せない。' };
    if (p.inventory.isFull) return { consumedTurn: false, message: '持ち物がいっぱいだ。' };
    const item = this.pots.takeOut(pot, contentIndex);
    if (!item) return { consumedTurn: false, message: '壺は空だ。' };
    p.inventory.add(item);
    return { consumedTurn: true, message: `${item.displayName}を取り出した。` };
  }

  private unequipIfNeeded(item: ItemInstance): void {
    const p = this.state.player;
    if (p.weapon === item) p.weapon = undefined;
    if (p.shield === item) p.shield = undefined;
  }

  // ------------------------------------------------------------- turn system

  private runNpcPhaseAndEndTurn(): void {
    for (const ally of [...this.state.allies]) {
      for (let i = 0; i < ally.speed; i++) {
        if (!ally.canAct || this.state.status !== 'playing') break;
        this.perform(ally, this.allyAI.decide(ally, this.state, this.rng));
      }
    }
    for (const m of [...this.state.monsters]) {
      for (let i = 0; i < m.speed; i++) {
        if (!m.canAct || this.state.status !== 'playing') break;
        this.perform(m, this.monsterAI.decide(m, this.state, this.rng));
      }
    }
    this.endTurn();
  }

  private perform(actor: Actor, action: AiAction): void {
    switch (action.type) {
      case 'move':
        this.actions.move(actor, action.dir);
        break;
      case 'attack':
        this.actions.attack(actor, action.target);
        break;
      case 'wait':
        break;
    }
  }

  private endTurn(): void {
    const s = this.state;
    const p = s.player;
    s.turn++;

    if (s.turn % this.config.hungerInterval === 0 && p.hunger > 0) {
      p.hunger--;
      if (p.hunger === 20) this.log.push('おなかがすいてきた…');
      if (p.hunger === 0) this.log.push('おなかがすいて倒れそうだ！');
    }
    if (p.hunger === 0) {
      this.actions.dealDamage(undefined, p, 1);
    } else if (s.turn % this.config.regenInterval === 0) {
      p.heal(1);
      for (const a of s.allies) a.heal(1);
    }

    for (const a of s.actors) {
      for (const kind of a.tickStatuses()) {
        if (a.faction !== 'enemy') this.log.push(`${a.name}の${STATUS_LABEL[kind]}が解けた。`);
      }
    }

    for (const item of p.inventory.items) {
      const done = this.pots.tick(item);
      if (done) {
        this.log.push(`錬金の壺から${done.displayName}ができた！`);
        this.codex.obtainItem(done.def.id);
      }
    }

    if (s.turn % this.config.respawnInterval === 0 && s.monsters.length < 10) {
      this.floors.spawnMonster(s, this.rng, true);
    }
  }
}
