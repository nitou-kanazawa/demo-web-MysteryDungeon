import type { Vec2 } from '../core/Vec2';
import type { Actor } from '../entity/Actor';
import { TileType } from '../map/Tile';
import type { GameState } from './GameState';
import type { MessageLog } from './MessageLog';
import { findFreeTileNear } from './Placement';

export interface FloorEventContext {
  readonly state: GameState;
  readonly log: MessageLog;
}

/** フロアで毎ターン進む出来事（満潮・崩落など）。FloorBuilder が登録し、endTurn で tick される */
export interface FloorEvent {
  readonly id: string;
  tick(ctx: FloorEventContext): void;
}

/** そのマスに立つアクターを近くの床へ退避させる */
function evacuate(state: GameState, log: MessageLog, p: Vec2, why: string): void {
  const a = state.actorAt(p);
  if (!a) return;
  const dest = findFreeTileNear(state, p, 6);
  if (dest) {
    a.pos = dest;
    log.push(`${a.name}は${why}`);
  }
}

function dropItemsAt(state: GameState, log: MessageLog, p: Vec2, why: string): void {
  const item = state.itemAt(p);
  if (item) {
    state.removeItemAt(p);
    log.push(`${item.displayName}は${why}`);
  }
}

/**
 * 満潮（地底湖）。period ターン周期で highDuration ターンだけ橋（通路）が水没する。
 * 直前 warn ターンで予告する。
 */
export class TideEvent implements FloorEvent {
  readonly id = 'tide';
  private readonly bridges: Vec2[] = [];
  private high = false;

  constructor(
    state: GameState,
    private readonly period = 60,
    private readonly highDuration = 15,
    private readonly warn = 5,
  ) {
    for (const p of state.map.walkableTiles()) if (state.map.get(p) === TileType.Corridor) this.bridges.push(p);
  }

  get isHighTide(): boolean {
    return this.high;
  }

  tick({ state, log }: FloorEventContext): void {
    const t = state.turn % this.period;
    const highStart = this.period - this.highDuration;
    if (t === highStart - this.warn) log.push('潮が満ちてきた… もうすぐ橋が沈む。');
    if (t === highStart && !this.high) {
      this.high = true;
      log.push('満潮だ！ 橋が水没した！');
      for (const p of this.bridges) {
        evacuate(state, log, p, '水に流されて岸に打ち上げられた。');
        dropItemsAt(state, log, p, '水に流された。');
        state.map.set(p, TileType.Water);
      }
      state.visibility.update(state.player.pos);
    }
    if (t === 0 && this.high) {
      this.high = false;
      log.push('潮が引いた。橋が現れた。');
      for (const p of this.bridges) state.map.set(p, TileType.Corridor);
      state.visibility.update(state.player.pos);
    }
  }
}

/**
 * 崩落（天空）。プレイヤーが通った回廊は delay ターン後に崩れて空になり、
 * restoreAfter ターン後に浮き石が戻る。誰かが乗っていれば 1 ターン待つ。
 */
export class CollapseEvent implements FloorEvent {
  readonly id = 'collapse';
  private readonly scheduled = new Map<string, { p: Vec2; at: number }>();
  private readonly collapsed = new Map<string, { p: Vec2; at: number }>();

  constructor(
    private readonly delay = 6,
    private readonly restoreAfter = 30,
  ) {}

  /** プレイヤーが回廊を踏んだときに呼ぶ */
  markVisited(state: GameState, p: Vec2): void {
    const k = `${p.x},${p.y}`;
    if (state.map.get(p) !== TileType.Corridor || this.scheduled.has(k)) return;
    this.scheduled.set(k, { p, at: state.turn + this.delay });
    state.placeFeature(p, { kind: 'crack' });
  }

  get pendingCount(): number {
    return this.scheduled.size;
  }

  tick({ state, log }: FloorEventContext): void {
    for (const [k, s] of [...this.scheduled]) {
      if (state.turn < s.at) continue;
      if (state.isOccupied(s.p)) {
        s.at = state.turn + 1;
        continue;
      }
      this.scheduled.delete(k);
      state.removeFeatureAt(s.p);
      dropItemsAt(state, log, s.p, '空の彼方へ落ちていった。');
      state.map.set(s.p, TileType.Void);
      this.collapsed.set(k, { p: s.p, at: state.turn + this.restoreAfter });
      if (state.visibility.isVisible(s.p)) log.push('回廊が崩れ落ちた！');
    }
    for (const [k, c] of [...this.collapsed]) {
      if (state.turn < c.at) continue;
      this.collapsed.delete(k);
      state.map.set(c.p, TileType.Corridor);
      if (state.visibility.isVisible(c.p)) log.push('浮き石が戻ってきた。');
    }
  }
}

export const isFloorEventActor = (a: Actor): boolean => a.isAlive;
