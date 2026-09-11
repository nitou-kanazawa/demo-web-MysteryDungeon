import { DIR_VEC, addVec, type Direction, type Vec2 } from '../core/Vec2';
import { reflectsProjectile } from '../map/Tile';
import type { Actor } from '../entity/Actor';
import type { GameState } from './GameState';

export interface ProjectileSegment {
  readonly from: Vec2;
  readonly to: Vec2;
}

export interface ProjectileTrace {
  /** 最後に到達した（歩けるか分からないが通過できた）マス */
  readonly end: Vec2;
  /** 最初に当たったアクター */
  readonly hit: Actor | undefined;
  /** 反射で折れた区間ごとの始点・終点（演出用） */
  readonly segments: readonly ProjectileSegment[];
  /** 鏡で反射したか */
  readonly reflected: boolean;
  /** 最終的な進行方向 */
  readonly dir: Direction;
}

export const OPPOSITE: Readonly<Record<Direction, Direction>> = {
  N: 'S',
  NE: 'SW',
  E: 'W',
  SE: 'NW',
  S: 'N',
  SW: 'NE',
  W: 'E',
  NW: 'SE',
};

/**
 * 投げ物・魔法弾・ブレスの共通経路。from から dir へ最大 range マス進む。
 * - 岩壁・岩・扉・格子・檻は遮る。水・空は飛び越える
 * - 鏡に当たると向きが反転し、来た道を戻る（使った本人にも当たる）
 * - stopAtActor が true なら最初のアクターで止まる
 * - onTile は通過した各マスで呼ばれる（ブレスの氷解かしなど）
 */
export function traceProjectile(
  state: GameState,
  from: Vec2,
  dir: Direction,
  range: number,
  options: { readonly stopAtActor?: boolean; readonly onTile?: (p: Vec2) => void; readonly ignore?: Actor } = {},
): ProjectileTrace {
  const stopAtActor = options.stopAtActor ?? true;
  let p = from;
  let d = dir;
  let segStart = from;
  let reflected = false;
  const segments: ProjectileSegment[] = [];
  let hit: Actor | undefined;
  for (let i = 0; i < range; i++) {
    const next = addVec(p, DIR_VEC[d]);
    if (reflectsProjectile(state.map.get(next)) && !reflected) {
      // 反射: 区間を閉じ、向きを反転して同じマスから戻る
      segments.push({ from: segStart, to: p });
      segStart = p;
      d = OPPOSITE[d];
      reflected = true;
      // 鏡の手前に立っている者（使った本人など）にはその場で返る
      const here = state.actorAt(p);
      if (here && here !== options.ignore && stopAtActor) {
        hit = here;
        break;
      }
      continue;
    }
    if (!state.map.passesProjectile(next) || state.blocksProjectileAt(next)) break;
    p = next;
    options.onTile?.(p);
    const a = state.actorAt(p);
    if (a && a !== options.ignore && stopAtActor) {
      hit = a;
      break;
    }
  }
  segments.push({ from: segStart, to: p });
  return { end: p, hit, segments, reflected, dir: d };
}
