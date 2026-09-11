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
import { CATEGORY_ORDER, isConsumable, isEquipment } from '../item/ItemDef';
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
import { SkillExecutor } from './SkillExecutor';
import { Ally } from '../entity/Ally';
import type { AllySnapshot } from '../entity/AllySnapshot';
import { MONSTER_MAP } from '../data/monsters';
import { TACTIC_LABEL } from './Tactic';
import { FeatureService } from './FeatureService';
import { SmithService } from './SmithService';
import { Shopkeeper } from '../entity/Shopkeeper';
import { Npc } from '../entity/Npc';
import { chebyshev } from '../core/Vec2';
import { CollapseEvent, RefreezeEvent } from './FloorEvent';
import { VisualSink } from './VisualEvent';
import type { ItemSnapshot } from '../item/ItemSnapshot';
import { traceProjectile } from './Projectile';
import { effectiveSightRadius } from './Sight';

export interface SessionOptions {
  readonly floorConfig?: FloorConfig;
  readonly generatorConfig?: GeneratorConfig;
  /** 初期所持品（定義ID）。テスト・デバッグ用 */
  readonly startingItems?: readonly string[];
  /** 拠点から持ち込むアイテム（修正値・中身を含む） */
  readonly startingInventory?: readonly ItemSnapshot[];
  readonly startingGold?: number;
  /** 出撃時に連れて行く仲間 */
  readonly startingAllies?: readonly AllySnapshot[];
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
  readonly features: FeatureService;
  readonly smith: SmithService;
  /** 演出イベント（画面側が drain して再生する） */
  readonly visuals = new VisualSink();
  readonly history: Command[] = [];
  private readonly startingInventory: readonly ItemSnapshot[];
  private readonly startingGold: number;
  private readonly startingAllies: readonly AllySnapshot[];
  private readonly skills: SkillExecutor;

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

    this.startingAllies = options.startingAllies ?? [];
    for (const snap of this.startingAllies) {
      const def = MONSTER_MAP.get(snap.defId);
      if (!def) throw new Error(`unknown monster def: ${snap.defId}`);
      this.state.allies.push(new Ally(this.ids.generate(), def, player.pos, snap));
    }

    this.actions = new ActionExecutor(this.state, this.rng, this.log, this.ids, this.config, this.shops, this.visuals);
    this.effects = new EffectResolver(this.state, this.rng, this.log, this.actions, this.visuals);
    this.skills = new SkillExecutor(this.state, this.rng, this.log, this.actions, this.visuals, (p) => {
      for (const e of this.state.events) if (e instanceof RefreezeEvent) e.markMelted(this.state, p);
    });
    this.smith = new SmithService(this.log);
    this.features = new FeatureService(
      this.state,
      this.rng,
      this.log,
      this.actions,
      this.ids,
      this.floors,
      {
        fallToNextFloor: () => this.fallToNextFloor(),
        teleportPlayer: () => {
          this.effects.applySelf({ kind: 'teleport' });
        },
        maxAllies: this.config.maxAllies,
      },
      this.visuals,
    );
    this.effects.setHooks({
      revealTraps: () => this.features.revealAllTraps(),
      plantTrapOn: (target) => this.features.plantAndTrigger(target),
    });
    this.actions.setGuardianHandler((victim) => this.floors.dropGuardianReward(this.state, this.rng, victim.pos));
    this.actions.setMovedHandler((actor) => {
      if (actor.faction !== 'player') {
        const f = this.state.featureAt(actor.pos);
        if (f?.kind === 'spring') this.features.onEntered(actor, actor.pos);
      }
    });

    this.floors.build(this.state, this.rng);
    this.log.push(`ダンジョン ${this.state.floor}F。最深部 ${this.config.maxFloor}F の階段を目指せ！`);
    this.announceFloor(undefined);
  }

  /** フロア到着時の案内（テーマの変化・霧・フロアの形） */
  private announceFloor(prevTheme: string | undefined): void {
    const s = this.state;
    if (prevTheme !== undefined && s.theme.id !== prevTheme) this.log.push(`ここは「${s.theme.name}」。${s.theme.description}`);
    if (s.fog) this.log.push('霧が濃い… 遠くが見えない。');
    if (s.layout === 'maze') this.log.push('入り組んだ迷路だ。通路の先に広間がある。');
    if (s.layout === 'bigRoom') this.log.push('巨大な一部屋だ！ 階段は遠い。');
    if (s.blackMarket) this.log.push('店主のいない店の気配がする… 出口には番人がいるらしい。');
  }

  /** seed とコマンド列から同じ状態を再構築する */
  static replay(replay: Replay, options: SessionOptions = {}): GameSession {
    const merged: SessionOptions = {
      ...options,
      ...(replay.startingInventory ? { startingInventory: replay.startingInventory } : {}),
      ...(replay.startingGold !== undefined ? { startingGold: replay.startingGold } : {}),
      ...(replay.startingAllies ? { startingAllies: replay.startingAllies } : {}),
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
      startingAllies: [...this.startingAllies],
    };
  }

  /** 現在の仲間をスナップショット化（牧場への持ち帰り用） */
  alliesSnapshot(): AllySnapshot[] {
    return this.state.allies.filter((a) => a.isAlive).map((a) => a.toSnapshot());
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
    for (const a of s.allies) this.codex.seeMonster(a.definition.id);
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
      case 'tactic':
        this.state.tactic = cmd.tactic;
        return { consumedTurn: false, message: `作戦を「${TACTIC_LABEL[cmd.tactic]}」にした。` };
      case 'sort':
        return this.cmdSort();
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
    const blocker = this.state.featureAt(to);
    if (blocker?.kind === 'door') return { consumedTurn: this.features.openDoor(p, to) };
    if (blocker?.kind === 'cage') return { consumedTurn: this.features.openCage(p, to) };
    if (blocker?.kind === 'gate') return { consumedTurn: false, message: '格子が閉まっている。どこかにスイッチがあるはずだ。' };
    if (blocker?.kind === 'rock') return { consumedTurn: false, message: '転がる岩だ！ 近づくと危ない。' };
    if (blocker?.kind === 'boulder') {
      if (!this.features.pushBoulder(p.pos, dir)) return { consumedTurn: false };
      const from = p.pos;
      p.pos = to;
      this.visuals.emit({ type: 'move', actorId: p.id, from, to, fast: false });
      this.afterPlayerMoved(from);
      return { consumedTurn: true };
    }
    const other = this.state.actorAt(to);
    if (other) {
      if (other.faction === 'neutral') {
        if (other instanceof Shopkeeper) {
          const r = this.shops.talk(this.state);
          return { consumedTurn: true, message: r.message };
        }
        if (other instanceof Npc && other.role === 'blacksmith') {
          this.smith.talk(p);
          return { consumedTurn: true };
        }
        return { consumedTurn: true, message: `${other.name}は何も言わない。` };
      }
      if (other.faction === 'enemy' || p.hasStatus('confusion')) {
        this.actions.attack(p, other);
        return { consumedTurn: true };
      }
      // 仲間とは位置を入れ替える
      const from = p.pos;
      other.pos = p.pos;
      p.pos = to;
      this.visuals.emit({ type: 'move', actorId: p.id, from, to, fast: false });
      this.visuals.emit({ type: 'move', actorId: other.id, from: to, to: from, fast: false });
      this.afterPlayerMoved(from);
      return { consumedTurn: true };
    }
    const from = p.pos;
    p.pos = to;
    this.visuals.emit({ type: 'move', actorId: p.id, from, to, fast: false });
    this.actions.slide(p, dir);
    this.afterPlayerMoved(from);
    return { consumedTurn: true };
  }

  private afterPlayerMoved(from: Vec2): void {
    const p = this.state.player;
    this.shops.onPlayerMoved(this.state, from);
    this.checkMonsterHouse();
    this.features.onEntered(p, p.pos);
    if (this.state.status !== 'playing') return;
    for (const e of this.state.events) if (e instanceof CollapseEvent) e.markVisited(this.state, p.pos);
    this.wakeGuardianIfAdjacent();
    const item = this.state.itemAt(p.pos);
    if (item) this.pickupAt(p.pos, item);
    if (this.state.map.get(p.pos) === TileType.Stairs) this.log.push('階段がある。（Enterで降りる）');
  }

  /** 番人はプレイヤーが隣接すると目を覚ます */
  private wakeGuardianIfAdjacent(): void {
    for (const m of this.state.monsters) {
      if (m.guardian && m.asleep && chebyshev(m.pos, this.state.player.pos) <= 1) {
        m.asleep = false;
        m.lastSeenPlayerPos = this.state.player.pos;
        this.log.push(`${m.displayName}が目を覚ました！`);
      }
    }
  }

  /** 落とし穴: 次の階へ落ちる（最深部なら踏破にはならず同じ階に留まる） */
  private fallToNextFloor(): void {
    if (this.state.floor >= this.config.maxFloor) {
      this.log.push('しかし底が浅く、落ちなかった。');
      return;
    }
    this.shops.settleOnLeave(this.state);
    const prevTheme = this.state.theme.id;
    this.state.floor++;
    this.floors.build(this.state, this.rng);
    this.visuals.emit({ type: 'floor' });
    this.log.push(`${this.state.floor}F に落ちた！`);
    this.announceFloor(prevTheme);
  }

  /** モンスターハウスに足を踏み入れたら中の敵を起こす */
  private checkMonsterHouse(): void {
    const house = this.state.monsterHouse;
    if (!house || house.triggered || !house.room.contains(this.state.player.pos)) return;
    house.triggered = true;
    this.log.push('モンスターハウスだ！');
    for (const m of this.state.monsters) {
      if (house.room.contains(m.pos) && m.asleep) {
        m.asleep = false;
        m.lastSeenPlayerPos = this.state.player.pos;
      }
    }
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
    const prevTheme = this.state.theme.id;
    this.state.floor++;
    this.floors.build(this.state, this.rng);
    this.visuals.emit({ type: 'floor' });
    this.log.push(`${this.state.floor}F に降りた。`);
    this.announceFloor(prevTheme);
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

  /** 整頓: 装備中 → 種類順 → 名前 → 修正値の降順 */
  private cmdSort(): CommandResult {
    const p = this.state.player;
    p.inventory.sort((a, b) => {
      const ea = p.isEquipped(a) ? 0 : 1;
      const eb = p.isEquipped(b) ? 0 : 1;
      if (ea !== eb) return ea - eb;
      const ca = CATEGORY_ORDER.indexOf(a.def.category);
      const cb = CATEGORY_ORDER.indexOf(b.def.category);
      if (ca !== cb) return ca - cb;
      if (a.def.name !== b.def.name) return a.def.name < b.def.name ? -1 : 1;
      return b.plus - a.plus;
    });
    return { consumedTurn: false, message: '持ち物を整頓した。' };
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

    // 水や空の上は飛び越えられる。岩壁と相手に当たると止まる。鏡に当たると戻ってくる
    const trace = traceProjectile(this.state, p.pos, p.facing, 10);
    const last = trace.end;
    const hit: Actor | undefined = trace.hit;
    for (const seg of trace.segments) this.visuals.emit({ type: 'projectile', from: seg.from, to: seg.to, kind: 'item', itemDefId: item.def.id });
    if (trace.reflected) this.log.push(`${item.displayName}は鏡に跳ね返った！`);
    if (hit) {
      const dmg = item.def.throwDamage ?? (item.def.atk ? item.def.atk + item.plus : 2);
      this.actions.dealDamage(p, hit, dmg);
    }
    if (!this.state.map.isWalkable(last)) {
      const where = this.state.map.get(last) === TileType.Water ? '水に落ちて沈んだ' : '空の彼方へ落ちていった';
      this.log.push(`${item.displayName}は${where}…`);
      return { consumedTurn: true };
    }
    if (this.state.map.get(last) === TileType.Lava) {
      this.log.push(`${item.displayName}は溶岩で燃え尽きた…`);
      return { consumedTurn: true };
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
        this.perform(ally, this.allyAI.decide(ally, this.state, this.rng, this.state.tactic));
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
      case 'skill':
        this.skills.use(actor, action.skill, action.target);
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
      a.tickCooldowns();
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

    // 松明の燃料（2 ターンで 1 減る）。切れても視界は狭まらず、描画が暗くなるだけ
    if (p.torch > 0 && s.turn % 2 === 0) {
      p.torch--;
      if (p.torch === 100) this.log.push('松明の火が小さくなってきた…');
      if (p.torch === 0) this.log.push('松明が消えた！ 辺りが暗い… たいまつがあれば火を灯せる。');
    }
    s.visibility.sightRadius = effectiveSightRadius(s);

    // 危険度: フロアに長くいるほど湧きが早くなる
    s.floorTurns++;
    if (s.floorTurns === 150) this.log.push('フロアの空気が重くなってきた…');
    if (s.floorTurns === 400) this.log.push('魔物の気配が濃くなっている！');
    if (s.turn % this.respawnInterval() === 0 && s.monsters.length < 10) {
      this.floors.spawnMonster(s, this.rng, true);
    }

    // 溶岩の上にいる者は焼ける
    for (const a of [...s.actors]) {
      if (a.isAlive && a.faction !== 'neutral' && s.map.get(a.pos) === TileType.Lava) {
        this.log.push(`${a.name}は溶岩で焼けた！`);
        this.actions.dealDamage(undefined, a, 5);
      }
    }

    for (const e of s.events) e.tick({ state: s, log: this.log, actions: this.actions, visuals: this.visuals });
  }

  /** 現在の湧き間隔（150 ターンごとに 8 短くなる。下限 8） */
  respawnInterval(): number {
    return Math.max(8, this.config.respawnInterval - Math.floor(this.state.floorTurns / 150) * 8);
  }
}
