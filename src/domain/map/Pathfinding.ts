import { DIRECTIONS, DIR_VEC, addVec, keyOf, type Direction, type Vec2, eqVec } from '../core/Vec2';
import type { DungeonMap } from './DungeonMap';

/**
 * BFS で from→to の最短経路の「最初の一歩」を返す。
 * blocked: 通れないマス判定（他アクターなど）。ゴールマス自体は blocked でも到達可とみなす。
 */
export function firstStepToward(
  map: DungeonMap,
  from: Vec2,
  to: Vec2,
  blocked: (p: Vec2) => boolean,
  maxNodes = 2000,
): Direction | undefined {
  if (eqVec(from, to)) return undefined;
  const startKey = keyOf(from);
  const cameFrom = new Map<string, { pos: Vec2; dir: Direction } | null>();
  cameFrom.set(startKey, null);
  const queue: Vec2[] = [from];
  let head = 0;
  let found: Vec2 | undefined;

  while (head < queue.length && cameFrom.size < maxNodes) {
    const cur = queue[head++] as Vec2;
    for (const d of DIRECTIONS) {
      if (!map.canStep(cur, d)) continue;
      const nxt = addVec(cur, DIR_VEC[d]);
      const k = keyOf(nxt);
      if (cameFrom.has(k)) continue;
      const isGoal = eqVec(nxt, to);
      if (!isGoal && blocked(nxt)) continue;
      cameFrom.set(k, { pos: cur, dir: d });
      if (isGoal) {
        found = nxt;
        break;
      }
      queue.push(nxt);
    }
    if (found) break;
  }
  if (!found) return undefined;

  // 逆順に辿って最初の一歩を求める
  let cur = found;
  let dir: Direction | undefined;
  for (;;) {
    const prev = cameFrom.get(keyOf(cur));
    if (!prev) break;
    dir = prev.dir;
    if (eqVec(prev.pos, from)) break;
    cur = prev.pos;
  }
  return dir;
}

/** 到達可能な全マスの集合（連結性チェック用） */
export function reachableFrom(map: DungeonMap, from: Vec2): Set<string> {
  const seen = new Set<string>([keyOf(from)]);
  const queue: Vec2[] = [from];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++] as Vec2;
    for (const d of DIRECTIONS) {
      if (!map.canStep(cur, d)) continue;
      const nxt = addVec(cur, DIR_VEC[d]);
      const k = keyOf(nxt);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push(nxt);
    }
  }
  return seen;
}
