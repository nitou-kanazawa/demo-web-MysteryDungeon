import { DIRECTIONS, DIR_VEC, addVec, chebyshev, dirFromDelta, type Direction, type Vec2 } from '../core/Vec2';
import type { IRng } from '../core/Rng';
import type { Actor } from '../entity/Actor';
import { firstStepToward } from '../map/Pathfinding';
import type { GameState } from '../game/GameState';
import type { AiAction } from './AiAction';

/** 隣接していて、角抜けせずに攻撃できる相手への方向を返す */
export function adjacentAttackDir(state: GameState, self: Actor, target: Actor): Direction | undefined {
  if (chebyshev(self.pos, target.pos) !== 1) return undefined;
  const d = dirFromDelta(target.pos.x - self.pos.x, target.pos.y - self.pos.y);
  if (!d) return undefined;
  return state.map.canStep(self.pos, d) ? d : undefined;
}

/** 他アクターを避けて target へ向かう一歩 */
export function stepToward(state: GameState, self: Actor, target: Vec2): Direction | undefined {
  const blocked = (p: Vec2): boolean => {
    const a = state.actorAt(p);
    return a !== undefined && a !== self;
  };
  const dir = firstStepToward(state.map, self.pos, target, blocked);
  if (!dir) return undefined;
  const next = addVec(self.pos, DIR_VEC[dir]);
  return blocked(next) ? undefined : dir;
}

export function randomStep(state: GameState, self: Actor, rng: IRng): Direction | undefined {
  const candidates = DIRECTIONS.filter((d) => {
    if (!state.map.canStep(self.pos, d)) return false;
    return !state.isOccupied(addVec(self.pos, DIR_VEC[d]));
  });
  return candidates.length > 0 ? rng.pick(candidates) : undefined;
}

/** 混乱中の行動: ランダム方向へ移動、そこに誰かいれば敵味方問わず攻撃 */
export function confusedAction(state: GameState, self: Actor, rng: IRng): AiAction {
  const d = rng.pick(DIRECTIONS);
  if (!state.map.canStep(self.pos, d)) return { type: 'wait' };
  const target = state.actorAt(addVec(self.pos, DIR_VEC[d]));
  if (target) return { type: 'attack', target, dir: d };
  return { type: 'move', dir: d };
}

/** 自分と同じ部屋、または近距離にいるか（気づき判定） */
export function canNotice(state: GameState, self: Actor, target: Actor, corridorRange = 2): boolean {
  const room = state.map.roomAt(self.pos);
  if (room && room.containsWithBorder(target.pos)) return true;
  return chebyshev(self.pos, target.pos) <= corridorRange;
}

export function nearest<T extends Actor>(from: Vec2, actors: readonly T[]): T | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  for (const a of actors) {
    const d = chebyshev(from, a.pos);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}
