import type { IRng } from '../core/Rng';
import { chebyshev } from '../core/Vec2';
import type { Ally } from '../entity/Ally';
import type { GameState } from '../game/GameState';
import type { Tactic } from '../game/Tactic';
import type { AiAction } from './AiAction';
import {
  adjacentAttackDir,
  breathTarget,
  canNotice,
  confusedAction,
  healTarget,
  nearest,
  stepAwayFrom,
  stepToward,
} from './AiUtil';

interface TacticParams {
  /** プレイヤーからこの距離までなら敵を追う（0 なら追わない） */
  readonly leash: number;
  /** この HP 割合未満の味方を回復する */
  readonly healThreshold: number;
  /** この HP 割合未満で隣接敵から退く（0 なら退かない） */
  readonly retreatBelow: number;
  /** 遠距離特技を使うか */
  readonly useRanged: boolean;
  /** プレイヤーとの距離がこれを超えたら追従する */
  readonly followDistance: number;
}

const PARAMS: Readonly<Record<Tactic, TacticParams>> = {
  aggressive: { leash: 7, healThreshold: 0.4, retreatBelow: 0, useRanged: true, followDistance: 2 },
  defensive: { leash: 3, healThreshold: 0.7, retreatBelow: 0.4, useRanged: true, followDistance: 2 },
  follow: { leash: 0, healThreshold: 0.5, retreatBelow: 0, useRanged: false, followDistance: 1 },
};

/**
 * 仲間モンスターの思考ルーチン。作戦（Tactic）でパラメータが変わる。
 * 1. 混乱中はランダム
 * 2. 回復特技: 傷ついた味方（自分・主人公・仲間）を回復
 * 3. 隣接する敵: 退却条件を満たせば退く、そうでなければ近接特技 or 攻撃
 * 4. 遠距離特技（ブレス）
 * 5. 近くの敵に接近（作戦ごとの追跡距離内）
 * 6. プレイヤーに追従
 */
export class AllyAI {
  decide(ally: Ally, state: GameState, rng: IRng, tactic: Tactic): AiAction {
    if (ally.hasStatus('confusion')) return confusedAction(state, ally, rng);
    const P = PARAMS[tactic];
    const player = state.player;
    const friends = [player, ...state.allies].filter((a) => a.isAlive);
    const enemies = state.monsters.filter((m) => m.isAlive);
    const skills = ally.skills.filter((s) => ally.isSkillReady(s.id));

    const heal = skills.find((s) => s.kind === 'heal');
    if (heal) {
      const t = healTarget(ally, friends, heal.range, P.healThreshold);
      if (t) return { type: 'skill', skill: heal, target: t };
    }

    const adjacent = enemies.map((e) => ({ e, dir: adjacentAttackDir(state, ally, e) })).find((x) => x.dir);
    if (adjacent?.dir) {
      if (P.retreatBelow > 0 && ally.hp < ally.maxHp * P.retreatBelow) {
        const away = stepAwayFrom(state, ally, adjacent.e.pos);
        if (away) return { type: 'move', dir: away };
      }
      const melee = skills.find((s) => s.kind === 'drain' || s.kind === 'smash');
      if (melee) return { type: 'skill', skill: melee, target: adjacent.e };
      return { type: 'attack', target: adjacent.e, dir: adjacent.dir };
    }

    const noticed = enemies.filter((e) => canNotice(state, ally, e));
    if (P.useRanged) {
      const breath = skills.find((s) => s.kind === 'breath');
      if (breath) {
        const bt = breathTarget(state, ally, breath, noticed);
        if (bt) return { type: 'skill', skill: breath, target: bt };
      }
    }

    if (P.leash > 0) {
      const target = nearest(ally.pos, noticed.filter((e) => chebyshev(e.pos, player.pos) <= P.leash));
      if (target) {
        const dir = stepToward(state, ally, target.pos);
        if (dir) return { type: 'move', dir };
      }
    }

    if (chebyshev(ally.pos, player.pos) > P.followDistance) {
      const dir = stepToward(state, ally, player.pos);
      if (dir) return { type: 'move', dir };
    }
    return { type: 'wait' };
  }
}
