import type { IdGenerator } from '../core/Id';
import type { IRng } from '../core/Rng';
import type { Vec2 } from '../core/Vec2';
import { GARGOYLE_DEF } from '../data/monsters';
import type { ItemSpawnEntry } from '../data/spawnTables';
import { Monster } from '../entity/Monster';
import type { Player } from '../entity/Player';
import { Shopkeeper } from '../entity/Shopkeeper';
import type { ItemFactory } from '../item/ItemFactory';
import type { ItemInstance } from '../item/ItemInstance';
import type { Room } from '../map/Room';
import type { GameState } from './GameState';
import type { MessageLog } from './MessageLog';
import { findItemDropTile } from './Placement';

export type ShopResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * ガーゴイルの店のルール。
 * - 値札付きアイテムを拾うと「未払い」になり、店主にぶつかると支払う
 * - 未払いのまま店の部屋を出る／脱出すると「どろぼう」。店主がガーゴイル（敵）になる
 * - 店内では持ち物を売れる（売値は買値の半分、売った品は値札付きで店に並ぶ）
 */
export class ShopService {
  constructor(
    private readonly factory: ItemFactory,
    private readonly ids: IdGenerator,
    private readonly log: MessageLog,
  ) {}

  /** 店の部屋を作る（商品＋店主） */
  setup(state: GameState, room: Room, table: readonly ItemSpawnEntry[], count: number, rng: IRng): void {
    const tiles = rng.shuffle([...room.tiles()]);
    const keeperPos = tiles.pop();
    if (!keeperPos) return;
    const keeper = new Shopkeeper(this.ids.generate(), GARGOYLE_DEF, keeperPos);
    state.shop = { room, keeper };
    const pool = table.filter((e) => e.defId !== 'gold' && state.floor >= e.minFloor && state.floor <= e.maxFloor);
    for (let i = 0; i < count && tiles.length > 0; i++) {
      const p = tiles.pop() as Vec2;
      if (state.map.get(p) === 3) continue;
      const entry = rng.pick(pool);
      const item = this.factory.create(entry.defId, rng);
      item.price = ShopService.buyPrice(item);
      state.placeItem(p, item);
    }
  }

  static buyPrice(item: ItemInstance): number {
    return item.def.price + Math.max(0, item.plus) * Math.floor(item.def.price * 0.2);
  }

  static sellPrice(item: ItemInstance): number {
    return Math.floor(ShopService.buyPrice(item) / 2);
  }

  /** 所持品（壺の中身を含む）の未払い合計 */
  debtOf(player: Player): number {
    let total = 0;
    const walk = (items: readonly ItemInstance[]): void => {
      for (const it of items) {
        if (it.price !== undefined) total += it.price;
        walk(it.contents);
      }
    };
    walk(player.inventory.items);
    return total;
  }

  isInShop(state: GameState, p: Vec2): boolean {
    return state.shop !== undefined && state.shop.room.contains(p);
  }

  /** 店主にぶつかったときの対応（支払い） */
  talk(state: GameState): ShopResult {
    const player = state.player;
    const debt = this.debtOf(player);
    if (debt === 0) return { ok: true, message: 'ガーゴイル「いらっしゃい。売りたい物があれば持ち物から「売る」だ」' };
    if (player.gold < debt) {
      return { ok: false, message: `ガーゴイル「合計${debt}Gだ。金が足りないぞ」（所持 ${player.gold}G）` };
    }
    player.gold -= debt;
    this.clearTags(player.inventory.items);
    return { ok: true, message: `ガーゴイル「まいどあり！」 ${debt}G を支払った。` };
  }

  /** 店内でアイテムを売る。売った品は値札付きで床に並ぶ */
  sell(state: GameState, item: ItemInstance): ShopResult {
    if (!this.isInShop(state, state.player.pos) || !state.shop?.keeper) return { ok: false, message: 'ここでは売れない。' };
    if (item.price !== undefined) return { ok: false, message: 'それはまだ店の商品だ。' };
    const tile = findItemDropTile(state, state.player.pos);
    if (!tile || !state.shop.room.contains(tile)) return { ok: false, message: '店に置く場所がない。' };
    const gain = ShopService.sellPrice(item);
    state.player.inventory.remove(item);
    if (state.player.weapon === item) state.player.weapon = undefined;
    if (state.player.shield === item) state.player.shield = undefined;
    item.price = ShopService.buyPrice(item);
    state.placeItem(tile, item);
    state.player.gold += gain;
    return { ok: true, message: `${item.displayName}を${gain}Gで売った。` };
  }

  /** 店内に置いた未払い商品は棚に戻る */
  onItemDropped(state: GameState, item: ItemInstance, at: Vec2): void {
    if (item.price !== undefined && this.isInShop(state, at)) {
      this.log.push(`${item.displayName}を棚に戻した。`);
    }
  }

  /** 拾った商品の扱い（値札を残す＝未払い） */
  onItemPicked(item: ItemInstance): void {
    if (item.price !== undefined) this.log.push(`${item.displayName}（${item.price}G）を手に取った。`);
  }

  /** プレイヤー移動後: 未払いのまま店を出たらどろぼう */
  onPlayerMoved(state: GameState, from: Vec2): void {
    const shop = state.shop;
    if (!shop || !shop.keeper) return;
    if (shop.room.contains(from) && !shop.room.contains(state.player.pos) && this.debtOf(state.player) > 0) {
      this.becomeThief(state);
    }
  }

  /** 脱出・階段など、店主が追えない形で未払い品を持ち去った場合 */
  settleOnLeave(state: GameState): void {
    if (state.shop?.keeper && this.debtOf(state.player) > 0) this.becomeThief(state);
  }

  /** 店主が怒って敵になる（どろぼう・攻撃された） */
  becomeThief(state: GameState): void {
    const shop = state.shop;
    if (!shop?.keeper) return;
    const keeper = shop.keeper;
    shop.keeper = undefined;
    this.clearTags(state.player.inventory.items);
    for (const [, it] of state.groundItems) it.price = undefined;
    const monster = new Monster(this.ids.generate(), GARGOYLE_DEF, keeper.pos);
    monster.hp = keeper.hp;
    monster.lastSeenPlayerPos = state.player.pos;
    state.monsters.push(monster);
    this.log.push('どろぼう！ ガーゴイルが襲いかかってきた！');
  }

  private clearTags(items: readonly ItemInstance[]): void {
    for (const it of items) {
      it.price = undefined;
      this.clearTags(it.contents);
    }
  }
}
