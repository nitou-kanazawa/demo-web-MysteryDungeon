import { DIRECTIONS, DIR_VEC, addVec, type Vec2 } from '../core/Vec2';
import type { GameState } from './GameState';

/** origin から近い順に、アクターがいない歩行可能マスを探す（最大距離 radius） */
export function findFreeTileNear(state: GameState, origin: Vec2, radius = 4): Vec2 | undefined {
  if (state.map.isWalkable(origin) && !state.isOccupied(origin)) return origin;
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const p = { x: origin.x + dx, y: origin.y + dy };
        if (state.map.isWalkable(p) && !state.isOccupied(p)) return p;
      }
    }
  }
  return undefined;
}

/** origin から近い順に、アイテムが置かれていない歩行可能マスを探す */
export function findItemDropTile(state: GameState, origin: Vec2, radius = 3): Vec2 | undefined {
  const ok = (p: Vec2): boolean => state.map.isWalkable(p) && !state.itemAt(p) && state.map.get(p) !== 3;
  if (ok(origin)) return origin;
  for (let r = 1; r <= radius; r++) {
    for (const d of DIRECTIONS) {
      let p = origin;
      for (let i = 0; i < r; i++) p = addVec(p, DIR_VEC[d]);
      if (ok(p)) return p;
    }
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const p = { x: origin.x + dx, y: origin.y + dy };
        if (ok(p)) return p;
      }
    }
  }
  return undefined;
}
