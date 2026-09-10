import type { IRng } from '../core/Rng';
import { eqVec } from '../core/Vec2';
import type { Monster } from '../entity/Monster';
import type { GameState } from '../game/GameState';
import type { AiAction } from './AiAction';
import { adjacentAttackDir, canNotice, confusedAction, nearest, randomStep, stepToward } from './AiUtil';

/**
 * 敵モンスターの思考ルーチン。
 * 1. 混乱中はランダム行動
 * 2. 隣接する標的（プレイヤー／仲間）がいれば攻撃
 * 3. 気づいている標的へ接近（最後に見た位置を記憶）
 * 4. それ以外は徘徊
 */
export class MonsterAI {
  decide(monster: Monster, state: GameState, rng: IRng): AiAction {
    if (monster.hasStatus('confusion')) return confusedAction(state, monster, rng);

    const targets = [state.player, ...state.allies].filter((a) => a.isAlive);
    for (const t of targets) {
      const dir = adjacentAttackDir(state, monster, t);
      if (dir) return { type: 'attack', target: t, dir };
    }

    const noticed = targets.filter((t) => canNotice(state, monster, t));
    const target = nearest(monster.pos, noticed);
    if (target) {
      monster.lastSeenPlayerPos = target.pos;
      const dir = stepToward(state, monster, target.pos);
      return dir ? { type: 'move', dir } : { type: 'wait' };
    }

    if (monster.lastSeenPlayerPos) {
      if (eqVec(monster.lastSeenPlayerPos, monster.pos)) {
        monster.lastSeenPlayerPos = undefined;
      } else {
        const dir = stepToward(state, monster, monster.lastSeenPlayerPos);
        if (dir) return { type: 'move', dir };
        monster.lastSeenPlayerPos = undefined;
      }
    }

    const wander = randomStep(state, monster, rng);
    return wander ? { type: 'move', dir: wander } : { type: 'wait' };
  }
}
