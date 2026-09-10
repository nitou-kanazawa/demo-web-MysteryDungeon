import type { IRng } from '../core/Rng';
import { chebyshev } from '../core/Vec2';
import type { Ally } from '../entity/Ally';
import type { GameState } from '../game/GameState';
import type { AiAction } from './AiAction';
import { adjacentAttackDir, canNotice, confusedAction, nearest, stepToward } from './AiUtil';

/**
 * 仲間モンスターの思考ルーチン。
 * 1. 混乱中はランダム行動
 * 2. 隣接する敵を攻撃
 * 3. 近くの敵に接近（プレイヤーから離れすぎない範囲）
 * 4. プレイヤーに追従
 */
export class AllyAI {
  constructor(private readonly leashRange = 5) {}

  decide(ally: Ally, state: GameState, rng: IRng): AiAction {
    if (ally.hasStatus('confusion')) return confusedAction(state, ally, rng);

    const enemies = state.monsters.filter((m) => m.isAlive);
    for (const e of enemies) {
      const dir = adjacentAttackDir(state, ally, e);
      if (dir) return { type: 'attack', target: e, dir };
    }

    const player = state.player;
    const noticed = enemies.filter(
      (e) => canNotice(state, ally, e) && chebyshev(e.pos, player.pos) <= this.leashRange,
    );
    const target = nearest(ally.pos, noticed);
    if (target) {
      const dir = stepToward(state, ally, target.pos);
      if (dir) return { type: 'move', dir };
    }

    if (chebyshev(ally.pos, player.pos) > 1) {
      const dir = stepToward(state, ally, player.pos);
      if (dir) return { type: 'move', dir };
    }
    return { type: 'wait' };
  }
}
