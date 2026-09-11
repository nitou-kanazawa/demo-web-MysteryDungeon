import type { IRng } from '../core/Rng';
import { DIR_VEC, addVec, type Direction, type Vec2 } from '../core/Vec2';
import type { Actor } from '../entity/Actor';
import type { ItemEffect } from '../item/ItemDef';
import { findFreeTileNear } from './Placement';
import type { GameState } from './GameState';
import type { MessageLog } from './MessageLog';
import type { ActionExecutor } from './ActionExecutor';

/** アイテム効果をゲーム状態に適用する */
export interface EffectHooks {
  readonly revealTraps: () => number;
  readonly plantTrapOn: (target: Actor) => void;
}

export class EffectResolver {
  private hooks: EffectHooks | undefined;

  constructor(
    private readonly state: GameState,
    private readonly rng: IRng,
    private readonly log: MessageLog,
    private readonly actions: ActionExecutor,
  ) {}

  setHooks(hooks: EffectHooks): void {
    this.hooks = hooks;
  }

  /** プレイヤーが自分に使う効果（食料・草・種・巻物） */
  applySelf(effect: ItemEffect): boolean {
    const p = this.state.player;
    switch (effect.kind) {
      case 'heal': {
        const healed = p.heal(effect.amount);
        if (healed === 0) {
          p.maxHp += 1;
          p.hp = p.maxHp;
          this.log.push('HPは満タンだ。最大HPが1上がった。');
        } else {
          this.log.push(`HPが${healed}回復した。`);
        }
        return true;
      }
      case 'fullHeal':
        p.hp = p.maxHp;
        this.log.push('HPが全回復した！');
        return true;
      case 'feed': {
        const before = p.hunger;
        p.hunger = Math.min(p.maxHunger, p.hunger + effect.nutrition);
        this.log.push(before === p.maxHunger ? 'おなかがいっぱいで食べきれなかった。' : 'おなかがふくれた。');
        return true;
      }
      case 'maxHpUp':
        p.maxHp += effect.amount;
        p.hp += effect.amount;
        this.log.push(`最大HPが${effect.amount}上がった！`);
        return true;
      case 'atkUp':
        p.baseAtk += effect.amount;
        this.log.push(`ちからが${effect.amount}上がった！`);
        return true;
      case 'defUp':
        p.baseDef += effect.amount;
        this.log.push(`まもりが${effect.amount}上がった！`);
        return true;
      case 'revealMap':
        this.state.visibility.revealAll();
        this.log.push('フロアの地形が頭に浮かんだ！');
        return true;
      case 'teleport': {
        const tiles = [...this.state.map.walkableTiles()].filter((t) => !this.state.isOccupied(t));
        const dest = findFreeTileNear(this.state, this.rng.pick(tiles));
        if (dest) {
          p.pos = dest;
          this.state.visibility.update(p.pos);
        }
        this.log.push('どこかへ飛ばされた！');
        return true;
      }
      case 'confuseVisible': {
        let n = 0;
        for (const m of this.state.monsters) {
          if (this.state.visibility.isVisible(m.pos)) {
            m.addStatus('confusion', effect.turns);
            n++;
          }
        }
        this.log.push(n > 0 ? '周囲の敵が混乱した！' : '何も起こらなかった。');
        return true;
      }
      case 'escape':
        this.state.status = 'escaped';
        this.log.push('リレミト！ 光に包まれてダンジョンから脱出した。');
        return true;
      case 'revealTraps': {
        const n = this.hooks?.revealTraps() ?? 0;
        this.log.push(n > 0 ? `${n}個の罠が見えるようになった！` : 'このフロアに罠は無いようだ。');
        return true;
      }
      default:
        this.log.push('何も起こらなかった。');
        return false;
    }
  }

  /** 杖の魔法弾: from から dir へ直進し、最初に当たったアクターに効果を与える */
  applyBolt(effect: ItemEffect, from: Vec2, dir: Direction, maxRange = 10): void {
    const target = this.findBoltTarget(from, dir, maxRange);
    if (!target) {
      this.log.push('魔法弾は何にも当たらなかった。');
      return;
    }
    switch (effect.kind) {
      case 'boltParalyze':
        target.addStatus('paralysis', effect.turns);
        this.log.push(`${target.name}は動けなくなった！`);
        break;
      case 'boltKnockback': {
        const moved = this.actions.knockback(target, dir);
        this.log.push(moved > 0 ? `${target.name}は吹き飛ばされた！` : `${target.name}は動かなかった。`);
        break;
      }
      case 'boltDamage': {
        this.log.push(`${target.name}に雷が落ちた！`);
        this.actions.dealDamage(this.state.player, target, effect.amount);
        break;
      }
      case 'boltTrap':
        this.hooks?.plantTrapOn(target);
        break;
      default:
        this.log.push('何も起こらなかった。');
    }
  }

  private findBoltTarget(from: Vec2, dir: Direction, maxRange: number): Actor | undefined {
    let p = from;
    for (let i = 0; i < maxRange; i++) {
      const next = addVec(p, DIR_VEC[dir]);
      if (!this.state.map.passesProjectile(next)) return undefined;
      const a = this.state.actorAt(next);
      if (a) return a;
      p = next;
    }
    return undefined;
  }
}
