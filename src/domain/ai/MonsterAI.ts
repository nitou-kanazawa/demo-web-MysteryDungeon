import type { IRng } from '../core/Rng';
import { eqVec } from '../core/Vec2';
import type { Monster } from '../entity/Monster';
import type { GameState } from '../game/GameState';
import type { AiAction } from './AiAction';
import { adjacentAttackDir, breathTarget, canNotice, confusedAction, nearest, randomStep, stepToward } from './AiUtil';

/**
 * 敵モンスターの思考ルーチン。
 * 1. 混乱中はランダム行動
 * 2. HP が半分未満なら回復特技（自分に）
 * 3. 隣接する標的（プレイヤー／仲間）がいれば 近接特技 or 攻撃
 * 4. 直線上の標的にブレス
 * 5. 気づいている標的へ接近（最後に見た位置を記憶）
 * 6. それ以外は徘徊
 */
export class MonsterAI {
  decide(monster: Monster, state: GameState, rng: IRng): AiAction {
    if (monster.hasStatus('confusion')) return confusedAction(state, monster, rng);

    const skills = monster.skills.filter((s) => monster.isSkillReady(s.id));
    const heal = skills.find((s) => s.kind === 'heal');
    if (heal && monster.hp < monster.maxHp / 2) return { type: 'skill', skill: heal, target: monster };

    const targets = [state.player, ...state.allies].filter((a) => a.isAlive);
    for (const t of targets) {
      const dir = adjacentAttackDir(state, monster, t);
      if (dir) {
        const melee = skills.find((s) => s.kind === 'drain' || s.kind === 'smash');
        if (melee) return { type: 'skill', skill: melee, target: t };
        return { type: 'attack', target: t, dir };
      }
    }

    const noticed = targets.filter((t) => canNotice(state, monster, t));
    const breath = skills.find((s) => s.kind === 'breath');
    if (breath) {
      const bt = breathTarget(state, monster, breath, noticed);
      if (bt) return { type: 'skill', skill: breath, target: bt };
    }

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
