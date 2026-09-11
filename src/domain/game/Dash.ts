import { DIRECTIONS, DIR_VEC, addVec, eqVec, type Direction, type Vec2 } from '../core/Vec2';
import { TileType } from '../map/Tile';
import type { GameSession } from './GameSession';
import type { GameState } from './GameState';

/**
 * 通路の自動ダッシュ。
 * 1 歩ごとに通常の move コマンドを発行するので、記録・リプレイと完全に互換。
 * 停止条件:
 *  - 敵が視界内にいる / 1 歩でメッセージが出た（拾った・階段・店など）/ HP が減った
 *  - 通路の分岐・行き止まり / 部屋と通路の境目（出入口）
 *  - 移動できなかった（壁・仲間との入れ替えは不可）
 */
export class DashRunner {
  private dir: Direction | undefined;
  private prev: Vec2 | undefined;
  private steps = 0;

  constructor(
    private readonly session: GameSession,
    private readonly maxSteps = 100,
  ) {}

  get isRunning(): boolean {
    return this.dir !== undefined;
  }

  start(dir: Direction): void {
    this.dir = dir;
    this.prev = undefined;
    this.steps = 0;
  }

  stop(): void {
    this.dir = undefined;
  }

  /** 1 歩進める。続行できなければ false（停止済み） */
  step(): boolean {
    if (!this.dir) return false;
    const st = this.session.state;
    if (st.status !== 'playing' || this.steps >= this.maxSteps || DashRunner.enemyVisible(st) || DashRunner.rockVisible(st)) {
      this.stop();
      return false;
    }
    const from = st.player.pos;
    const next = DashRunner.nextDirection(st, this.dir, this.prev, this.steps === 0);
    if (!next) {
      this.stop();
      return false;
    }
    const ahead = addVec(from, DIR_VEC[next]);
    if (st.map.get(ahead) === TileType.Lava || st.map.get(ahead) === TileType.Ice) {
      this.stop();
      return false;
    }
    const feature = st.featureAt(ahead);
    if (feature && !(feature.kind === 'trap' && feature.hidden)) {
      // 見えている罠・跳ね床などの手前で止まる
      this.stop();
      return false;
    }
    const logBefore = this.session.log.all.length;
    const hpBefore = st.player.hp;
    const tileBefore = st.map.get(from);
    const r = this.session.execute({ type: 'move', dir: next });
    this.steps++;
    if (!r.consumedTurn || eqVec(st.player.pos, from)) {
      this.stop();
      return false;
    }
    this.prev = from;
    this.dir = next;
    const tileAfter = st.map.get(st.player.pos);
    const crossedDoorway = (tileBefore === TileType.Corridor) !== (tileAfter === TileType.Corridor);
    if (
      this.session.log.all.length !== logBefore ||
      st.player.hp < hpBefore ||
      DashRunner.enemyVisible(st) ||
      DashRunner.rockVisible(st) ||
      (crossedDoorway && this.steps > 1) ||
      st.status !== 'playing'
    ) {
      this.stop();
      return false;
    }
    return true;
  }

  static enemyVisible(st: GameState): boolean {
    return st.monsters.some((m) => m.isAlive && st.visibility.isVisible(m.pos));
  }

  /** 転がる岩が見えていたら止まる */
  static rockVisible(st: GameState): boolean {
    for (const [k, f] of st.allFeatures) {
      if (f.kind !== 'rock') continue;
      const [x, y] = k.split(',').map(Number);
      if (st.visibility.isVisible({ x: x ?? -1, y: y ?? -1 })) return true;
    }
    return false;
  }

  /**
   * 次に進む方向。通路では「来た道以外に進める一本道」を追従し、
   * 分岐（2 方向以上）や行き止まりなら undefined。部屋では真っ直ぐ進む。
   */
  static nextDirection(st: GameState, dir: Direction, prev: Vec2 | undefined, first: boolean): Direction | undefined {
    const pos = st.player.pos;
    const inCorridor = st.map.get(pos) === TileType.Corridor;
    const canGo = (d: Direction): boolean => {
      if (!st.map.canStep(pos, d)) return false;
      const to = addVec(pos, DIR_VEC[d]);
      return !st.isOccupied(to);
    };
    if (!inCorridor || first) {
      return canGo(dir) ? dir : undefined;
    }
    const options = DIRECTIONS.filter((d) => {
      if (!canGo(d)) return false;
      const to = addVec(pos, DIR_VEC[d]);
      return !(prev && eqVec(to, prev));
    });
    if (options.length === 0) return undefined;
    if (options.includes(dir)) {
      // 直進できるなら直進。ただし他にも道があれば分岐なので止まる
      return options.length === 1 ? dir : undefined;
    }
    if (options.length === 1) return options[0];
    // 斜めと直交の両方が同じ角を指すことがある（L 字の曲がり角）: 直交を優先
    const orthogonal = options.filter((d) => d.length === 1);
    if (orthogonal.length === 1 && options.length <= 2) return orthogonal[0];
    return undefined;
  }
}
