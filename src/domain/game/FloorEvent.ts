import { DIR_VEC, addVec, eqVec, type Direction, type Vec2 } from '../core/Vec2';
import type { Actor } from '../entity/Actor';
import { TileType } from '../map/Tile';
import type { GameState } from './GameState';
import type { MessageLog } from './MessageLog';
import { findFreeTileNear } from './Placement';
import type { VisualSink } from './VisualEvent';

/** FloorEvent がアクターに干渉するための最小限の口 */
export interface FloorEventActions {
  dealDamage(source: Actor | undefined, target: Actor, amount: number): void;
  knockback(target: Actor, dir: Direction, maxDistance?: number): number;
}

export interface FloorEventContext {
  readonly state: GameState;
  readonly log: MessageLog;
  readonly actions?: FloorEventActions;
  readonly visuals?: VisualSink;
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

/** 溶けた氷（水）が一定ターン後に再び凍る */
export class RefreezeEvent implements FloorEvent {
  readonly id = 'refreeze';
  private readonly melted = new Map<string, { p: Vec2; at: number }>();

  constructor(private readonly after = 20) {}

  /** 氷が溶けたときに呼ぶ */
  markMelted(state: GameState, p: Vec2): void {
    this.melted.set(`${p.x},${p.y}`, { p, at: state.turn + this.after });
  }

  get pendingCount(): number {
    return this.melted.size;
  }

  tick({ state, log }: FloorEventContext): void {
    for (const [k, m] of [...this.melted]) {
      if (state.turn < m.at) continue;
      this.melted.delete(k);
      if (state.map.get(m.p) === TileType.Water) {
        state.map.set(m.p, TileType.Ice);
        if (state.visibility.isVisible(m.p)) log.push('水面が再び凍った。');
      }
    }
  }
}

/**
 * 転がる岩。直線の通路を毎ターン 1 マス進み、端で反転する。
 * 岩のマスに入ったアクターは 10 ダメージ＋進行方向へ吹き飛ばされる。
 * 位置は TileFeature `rock` で表す（押せる岩 boulder とは別）。
 */
export class RollingRockEvent implements FloorEvent {
  readonly id = 'rollingRock';
  pos: Vec2;
  dir: Direction;

  constructor(
    state: GameState,
    /** 岩が往復する通路のマス列（直線） */
    readonly lane: readonly Vec2[],
    startIndex = 0,
  ) {
    const first = lane[0] as Vec2;
    const second = lane[1] ?? first;
    this.pos = lane[startIndex] ?? first;
    this.dir = (second.x > first.x ? 'E' : second.x < first.x ? 'W' : second.y > first.y ? 'S' : 'N') as Direction;
    state.placeFeature(this.pos, { kind: 'rock' });
  }

  static readonly DAMAGE = 10;

  tick({ state, log, actions, visuals }: FloorEventContext): void {
    let next = addVec(this.pos, DIR_VEC[this.dir]);
    if (!this.onLane(next) || state.featureAt(next)?.kind === 'boulder') {
      this.dir = REVERSE[this.dir];
      next = addVec(this.pos, DIR_VEC[this.dir]);
      if (!this.onLane(next)) return;
    }
    const victim = state.actorAt(next);
    if (victim && victim.isAlive) {
      log.push(`転がる岩が${victim.name}にぶつかった！`);
      visuals?.emit({ type: 'popup', pos: next, text: '岩！', color: '#f97316' });
      actions?.dealDamage(undefined, victim, RollingRockEvent.DAMAGE);
      if (victim.isAlive) actions?.knockback(victim, this.dir, 3);
      if (victim.isAlive && eqVec(victim.pos, next)) {
        // 押し出せなかった: 岩が跳ね返る
        this.dir = REVERSE[this.dir];
        return;
      }
    }
    state.removeFeatureAt(this.pos);
    this.pos = next;
    state.placeFeature(next, { kind: 'rock' });
  }

  private onLane(p: Vec2): boolean {
    return this.lane.some((t) => eqVec(t, p));
  }
}

const REVERSE: Readonly<Record<Direction, Direction>> = { N: 'S', S: 'N', E: 'W', W: 'E', NE: 'SW', SW: 'NE', NW: 'SE', SE: 'NW' };

export const isFloorEventActor = (a: Actor): boolean => a.isAlive;
