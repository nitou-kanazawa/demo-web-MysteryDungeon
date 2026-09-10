import { GameSession, type SessionOptions } from '../game/GameSession';
import type { GameStatus } from '../game/GameState';
import type { HomeBase } from './HomeBase';

export interface SortieResult {
  readonly status: Exclude<GameStatus, 'playing'>;
  readonly floor: number;
  readonly gold: number;
  readonly itemsKept: number;
  readonly message: string;
}

/**
 * 拠点とダンジョンを往復させるオーケストレータ。
 * - 出撃: 拠点の持ち物・ゴールド・図鑑を GameSession に渡す（レベルは毎回 1 から）
 * - 帰還: 踏破／リレミトなら持ち物とゴールドを持ち帰る。死亡なら両方失う。倉庫は無事
 */
export class Campaign {
  current: GameSession | undefined;

  constructor(readonly base: HomeBase) {}

  startSortie(seed: number, extra: SessionOptions = {}): GameSession {
    const session = new GameSession(seed, {
      ...extra,
      startingInventory: this.base.inventorySnapshot(),
      startingGold: this.base.gold,
      codex: this.base.codex,
    });
    this.base.sorties++;
    this.current = session;
    return session;
  }

  /** 終了したセッションの結果を拠点に反映する */
  endSortie(session: GameSession): SortieResult {
    const status = session.state.status;
    if (status === 'playing') throw new Error('sortie is still in progress');
    const floor = session.state.floor;
    this.base.bestFloor = Math.max(this.base.bestFloor, floor);
    let message: string;
    let itemsKept = 0;
    if (status === 'dead') {
      this.base.replaceInventory([]);
      this.base.gold = 0;
      message = `${floor}F で力尽きた… 持ち物とゴールドを失った。`;
    } else {
      const snaps = session.inventorySnapshot();
      this.base.replaceInventory(snaps);
      this.base.gold = session.state.player.gold;
      itemsKept = snaps.length;
      if (status === 'won') {
        this.base.clears++;
        message = 'ダンジョンを踏破して帰還した！';
      } else {
        message = `${floor}F から脱出して帰還した。`;
      }
    }
    this.current = undefined;
    return { status, floor, gold: this.base.gold, itemsKept, message };
  }
}
