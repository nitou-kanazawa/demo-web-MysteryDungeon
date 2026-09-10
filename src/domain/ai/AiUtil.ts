import { DIRECTIONS, DIR_VEC, addVec, chebyshev, dirFromDelta, type Direction, type Vec2 } from '../core/Vec2';
import type { IRng } from '../core/Rng';
import type { Actor } from '../entity/Actor';
import { firstStepToward } from '../map/Pathfinding';
import type { GameState } from '../game/GameState';
import type { AiAction } from './AiAction';
import type { SkillDef } from '../data/skills';

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

/** ブレスが届く直線上の対象を探す（縦・横・斜めの直線、射程内、途中の地形が通れる） */
export function breathTarget<T extends Actor>(
  state: GameState,
  user: Actor,
  skill: SkillDef,
  candidates: readonly T[],
): T | undefined {
  for (const t of candidates) {
    const dx = t.pos.x - user.pos.x;
    const dy = t.pos.y - user.pos.y;
    const straight = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
    const dist = chebyshev(user.pos, t.pos);
    if (!straight || dist === 0 || dist > skill.range) continue;
    const dir = dirFromDelta(dx, dy);
    if (!dir) continue;
    let p = user.pos;
    let clear = true;
    for (let i = 0; i < dist; i++) {
      if (!state.map.canStep(p, dir)) {
        clear = false;
        break;
      }
      p = addVec(p, DIR_VEC[dir]);
    }
    if (clear) return t;
  }
  return undefined;
}

/** 射程内で最も HP 割合が低い味方（threshold 未満のみ） */
export function healTarget<T extends Actor>(user: Actor, friends: readonly T[], range: number, threshold: number): T | undefined {
  let best: T | undefined;
  let bestRatio = threshold;
  for (const f of friends) {
    if (!f.isAlive || chebyshev(user.pos, f.pos) > range) continue;
    const ratio = f.hp / f.maxHp;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      best = f;
    }
  }
  return best;
}

/** threat から離れる一歩（離れられる中で最も遠くなる方向） */
export function stepAwayFrom(state: GameState, self: Actor, threat: Vec2): Direction | undefined {
  let best: Direction | undefined;
  let bestD = chebyshev(self.pos, threat);
  for (const d of DIRECTIONS) {
    if (!state.map.canStep(self.pos, d)) continue;
    const p = addVec(self.pos, DIR_VEC[d]);
    if (state.isOccupied(p)) continue;
    const dist = chebyshev(p, threat);
    if (dist > bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
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
