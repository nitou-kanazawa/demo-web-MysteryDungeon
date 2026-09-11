import type { IRng } from '../core/Rng';
import { dirFromDelta, type Vec2 } from '../core/Vec2';
import { TileType } from '../map/Tile';
import type { SkillDef } from '../data/skills';
import type { Actor } from '../entity/Actor';
import type { ActionExecutor } from './ActionExecutor';
import { calcDamage } from './Combat';
import type { GameState } from './GameState';
import type { MessageLog } from './MessageLog';
import { POPUP_COLORS, type VisualSink } from './VisualEvent';
import { traceProjectile } from './Projectile';

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
    private readonly visuals: VisualSink,
    /** 炎で氷が溶けたときに呼ばれる（再凍結の予約用） */
    private readonly onIceMelted: ((p: Vec2) => void) | undefined = undefined,
  ) {}

  use(user: Actor, skill: SkillDef, target: Actor): void {
    user.setCooldown(skill.id, skill.cooldown);
    this.log.push(`${user.name}の${skill.name}！`);
    this.visuals.emit({ type: 'popup', pos: user.pos, text: skill.name, color: POPUP_COLORS.skill });
    switch (skill.kind) {
      case 'heal': {
        const healed = target.heal(skill.power);
        this.log.push(`${target.name}のHPが${healed}回復した。`);
        this.visuals.emit({ type: 'heal', actorId: target.id, pos: target.pos, amount: healed });
        break;
      }
      case 'breath': {
        const dir = dirFromDelta(target.pos.x - user.pos.x, target.pos.y - user.pos.y);
        if (!dir) break;
        let melted = 0;
        const burned = new Set<Actor>();
        const trace = traceProjectile(this.state, user.pos, dir, skill.range, {
          stopAtActor: false,
          onTile: (p) => {
            if (this.state.map.get(p) === TileType.Ice && !this.state.isOccupied(p)) {
              this.state.map.set(p, TileType.Water);
              this.onIceMelted?.(p);
              melted++;
            }
            const a = this.state.actorAt(p);
            if (a && (isHostile(user, a) || a === user)) burned.add(a);
          },
        });
        for (const seg of trace.segments) this.visuals.emit({ type: 'projectile', from: seg.from, to: seg.to, kind: 'breath', color: '#f97316' });
        if (trace.reflected) {
          this.log.push('炎は鏡に反射して戻ってきた！');
          burned.add(user);
        }
        for (const a of burned) this.actions.dealDamage(user, a, skill.power);
        if (burned.size === 0) this.log.push('炎は誰にも当たらなかった。');
        if (melted > 0) this.log.push('炎で氷が溶けて水になった！');
        break;
      }
      case 'drain': {
        const dmg = Math.floor((calcDamage(user.atk, target.def, this.rng) * skill.power) / 100);
        const before = target.hp;
        this.visuals.emit({ type: 'attack', actorId: user.id, from: user.pos, target: target.pos });
        this.actions.dealDamage(user, target, dmg);
        const healed = user.heal(Math.floor((before - Math.max(0, target.hp)) / 2));
        if (healed > 0) {
          this.log.push(`${user.name}はHPを${healed}吸い取った。`);
          this.visuals.emit({ type: 'heal', actorId: user.id, pos: user.pos, amount: healed });
        }
        break;
      }
      case 'smash': {
        const dmg = Math.floor((calcDamage(user.atk, target.def, this.rng) * skill.power) / 100);
        this.visuals.emit({ type: 'attack', actorId: user.id, from: user.pos, target: target.pos });
        this.actions.dealDamage(user, target, dmg);
        break;
      }
    }
  }
}
