import type { IRng } from '../core/Rng';
import { DIR_VEC, addVec, dirFromDelta } from '../core/Vec2';
import type { SkillDef } from '../data/skills';
import type { Actor } from '../entity/Actor';
import type { ActionExecutor } from './ActionExecutor';
import { calcDamage } from './Combat';
import type { GameState } from './GameState';
import type { MessageLog } from './MessageLog';

/** 敵対関係。中立（店主）はどちらとも敵対しない */
export function isHostile(a: Actor, b: Actor): boolean {
  if (a.faction === 'neutral' || b.faction === 'neutral') return false;
  return (a.faction === 'enemy') !== (b.faction === 'enemy');
}

/** 特技の効果を適用する。対象の選定は AI 側の責務 */
export class SkillExecutor {
  constructor(
    private readonly state: GameState,
    private readonly rng: IRng,
    private readonly log: MessageLog,
    private readonly actions: ActionExecutor,
  ) {}

  use(user: Actor, skill: SkillDef, target: Actor): void {
    user.setCooldown(skill.id, skill.cooldown);
    this.log.push(`${user.name}の${skill.name}！`);
    switch (skill.kind) {
      case 'heal': {
        const healed = target.heal(skill.power);
        this.log.push(`${target.name}のHPが${healed}回復した。`);
        break;
      }
      case 'breath': {
        const dir = dirFromDelta(target.pos.x - user.pos.x, target.pos.y - user.pos.y);
        if (!dir) break;
        let p = user.pos;
        let hit = 0;
        for (let i = 0; i < skill.range; i++) {
          if (!this.state.map.canStep(p, dir)) break;
          p = addVec(p, DIR_VEC[dir]);
          const a = this.state.actorAt(p);
          if (a && isHostile(user, a)) {
            this.actions.dealDamage(user, a, skill.power);
            hit++;
          }
        }
        if (hit === 0) this.log.push('炎は誰にも当たらなかった。');
        break;
      }
      case 'drain': {
        const dmg = Math.floor((calcDamage(user.atk, target.def, this.rng) * skill.power) / 100);
        const before = target.hp;
        this.actions.dealDamage(user, target, dmg);
        const healed = user.heal(Math.floor((before - Math.max(0, target.hp)) / 2));
        if (healed > 0) this.log.push(`${user.name}はHPを${healed}吸い取った。`);
        break;
      }
      case 'smash': {
        const dmg = Math.floor((calcDamage(user.atk, target.def, this.rng) * skill.power) / 100);
        this.actions.dealDamage(user, target, dmg);
        break;
      }
    }
  }
}
