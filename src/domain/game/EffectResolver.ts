import type { IRng } from '../core/Rng';
import type { Direction, Vec2 } from '../core/Vec2';
import type { Actor } from '../entity/Actor';
import type { ItemEffect } from '../item/ItemDef';
import { findFreeTileNear } from './Placement';
import type { GameState } from './GameState';
import type { MessageLog } from './MessageLog';
import type { ActionExecutor } from './ActionExecutor';
import { POPUP_COLORS, type VisualSink } from './VisualEvent';
import { traceProjectile } from './Projectile';
import { effectiveSightRadius } from './Sight';

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
    private readonly visuals: VisualSink,
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
          this.visuals.emit({ type: 'popup', pos: p.pos, text: '最大HP+1', color: POPUP_COLORS.good });
        } else {
          this.log.push(`HPが${healed}回復した。`);
          this.visuals.emit({ type: 'heal', actorId: p.id, pos: p.pos, amount: healed });
        }
        return true;
      }
      case 'fullHeal': {
        const healed = p.maxHp - p.hp;
        p.hp = p.maxHp;
        this.log.push('HPが全回復した！');
        this.visuals.emit({ type: 'heal', actorId: p.id, pos: p.pos, amount: healed });
        return true;
      }
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
          this.visuals.emit({ type: 'teleport', actorId: p.id, from: p.pos, to: dest });
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
            this.visuals.emit({ type: 'popup', pos: m.pos, text: '混乱', color: POPUP_COLORS.status });
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
      case 'refuelTorch': {
        const wasOut = p.torch <= 0;
        p.torch = Math.min(p.maxTorch, p.torch + effect.amount);
        this.state.visibility.sightRadius = effectiveSightRadius(this.state);
        this.state.visibility.update(p.pos);
        this.log.push(wasOut ? '松明に火が灯った！ 周りが見えるようになった。' : '松明の火が大きくなった。');
        this.visuals.emit({ type: 'popup', pos: p.pos, text: '松明', color: POPUP_COLORS.warn });
        return true;
      }
      default:
        this.log.push('何も起こらなかった。');
        return false;
    }
  }

  /** 杖の魔法弾: from から dir へ直進し、最初に当たったアクターに効果を与える */
  applyBolt(effect: ItemEffect, from: Vec2, dir: Direction, maxRange = 10): void {
    const trace = traceProjectile(this.state, from, dir, maxRange);
    for (const seg of trace.segments) this.visuals.emit({ type: 'projectile', from: seg.from, to: seg.to, kind: 'bolt', color: '#c084fc' });
    if (trace.reflected) this.log.push('魔法弾は鏡に反射した！');
    const target = trace.hit;
    if (!target) {
      this.log.push('魔法弾は何にも当たらなかった。');
      return;
    }
    // 反射後は向きが反転している（吹き飛ばしの方向に使う）
    dir = trace.dir;
    switch (effect.kind) {
      case 'boltParalyze':
        target.addStatus('paralysis', effect.turns);
        this.log.push(`${target.name}は動けなくなった！`);
        this.visuals.emit({ type: 'popup', pos: target.pos, text: 'かなしばり', color: POPUP_COLORS.status });
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

}
