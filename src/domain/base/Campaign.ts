import { GameSession, type SessionOptions } from '../game/GameSession';
import type { GameStatus } from '../game/GameState';
import type { HomeBase } from './HomeBase';
import { MONSTER_MAP } from '../data/monsters';

export interface SortieResult {
  readonly status: Exclude<GameStatus, 'playing'>;
  readonly floor: number;
  readonly gold: number;
  readonly itemsKept: number;
  readonly message: string;
  /** 仲間に関する補足（戦死・牧場満員など） */
  readonly allyNotes: readonly string[];
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
      startingAllies: this.base.partySnapshots(),
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
    const allyNotes: string[] = [];
    if (status === 'dead') {
      this.base.replaceInventory([]);
      this.base.gold = 0;
      message = `${floor}F で力尽きた… 持ち物とゴールドを失った。`;
      if (session.state.allies.some((a) => a.recordId === undefined)) allyNotes.push('道中で仲間にした魔物とは別れた。');
      if (this.base.partyCount > 0) allyNotes.push('連れていた仲間は牧場に逃げ帰った。');
    } else {
      this.syncAllies(session, allyNotes);
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
    return { status, floor, gold: this.base.gold, itemsKept, message, allyNotes };
  }

  /** 生還時: 連れて行った仲間の成長を書き戻し、戦死した仲間を除き、新しい仲間を迎える */
  private syncAllies(session: GameSession, notes: string[]): void {
    const alive = session.alliesSnapshot();
    const aliveIds = new Set(alive.map((a) => a.uid).filter((u): u is string => u !== undefined));
    for (const rec of [...this.base.allies]) {
      if (!rec.inParty) continue;
      if (!aliveIds.has(rec.uid)) {
        const name = MONSTER_MAP.get(rec.defId)?.name ?? rec.defId;
        notes.push(`${name}は帰ってこなかった…`);
        this.base.allies.splice(this.base.allies.indexOf(rec), 1);
      }
    }
    for (const snap of alive) {
      const name = MONSTER_MAP.get(snap.defId)?.name ?? snap.defId;
      if (snap.uid !== undefined) {
        const rec = this.base.findAlly(snap.uid);
        if (rec) {
          rec.level = snap.level;
          rec.exp = snap.exp;
        }
      } else if (this.base.addAlly(snap)) {
        notes.push(`${name}が牧場に加わった。`);
      } else {
        notes.push(`牧場がいっぱいで${name}とは別れた。`);
      }
    }
  }
}
