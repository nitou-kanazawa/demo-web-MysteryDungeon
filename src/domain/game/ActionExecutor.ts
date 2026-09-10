import type { IdGenerator } from '../core/Id';
import type { IRng } from '../core/Rng';
import { DIR_VEC, addVec, type Direction } from '../core/Vec2';
import type { Actor } from '../entity/Actor';
import { Ally } from '../entity/Ally';
import { Monster } from '../entity/Monster';
import { Player } from '../entity/Player';
import type { FloorConfig } from '../data/spawnTables';
import { HIT_CHANCE, calcDamage } from './Combat';
import type { GameState } from './GameState';
import type { MessageLog } from './MessageLog';
import { findFreeTileNear } from './Placement';
import { Shopkeeper } from '../entity/Shopkeeper';
import type { ShopService } from './ShopService';

/**
 * 「移動」「攻撃」「ダメージ」「撃破処理」など、プレイヤーと AI が共有する
 * 盤面操作をまとめた実行器。ルールの一元化が目的。
 */
export class ActionExecutor {
  constructor(
    private readonly state: GameState,
    private readonly rng: IRng,
    private readonly log: MessageLog,
    private readonly ids: IdGenerator,
    private readonly config: FloorConfig,
    private readonly shops: ShopService,
  ) {}

  /** dir へ 1 マス移動。地形・アクターに阻まれれば false */
  move(actor: Actor, dir: Direction): boolean {
    if (!this.state.map.canStep(actor.pos, dir)) return false;
    const to = addVec(actor.pos, DIR_VEC[dir]);
    if (this.state.isOccupied(to)) return false;
    actor.pos = to;
    return true;
  }

  /** 通常攻撃。命中判定 → ダメージ → 撃破処理 */
  attack(attacker: Actor, defender: Actor): void {
    if (!this.rng.chance(HIT_CHANCE)) {
      this.log.push(`${attacker.name}の攻撃は外れた。`);
      return;
    }
    const dmg = calcDamage(attacker.atk, defender.def, this.rng);
    this.dealDamage(attacker, defender, dmg);
  }

  /** 固定ダメージ（杖・投擲など）。撃破処理を含む */
  dealDamage(source: Actor | undefined, target: Actor, amount: number): void {
    if (target instanceof Shopkeeper) {
      target.takeDamage(amount);
      this.log.push(`${target.name}に${amount}のダメージ！`);
      this.shops.becomeThief(this.state);
      return;
    }
    const dealt = target.takeDamage(amount);
    const who = source ? `${source.name}は` : '';
    this.log.push(`${who}${target.name}に${dealt}のダメージ！`);
    if (!target.isAlive) this.onKilled(source, target);
  }

  /** dir 方向へ壁か他アクターにぶつかるまで押し出す。移動マス数を返す */
  knockback(target: Actor, dir: Direction, maxDistance = 10): number {
    let moved = 0;
    while (moved < maxDistance && this.move(target, dir)) moved++;
    if (moved > 0 && target.faction !== 'player') this.dealDamage(undefined, target, 5);
    return moved;
  }

  private onKilled(killer: Actor | undefined, victim: Actor): void {
    if (victim instanceof Player) {
      this.log.push(`${victim.name}は力尽きた…`);
      this.state.status = 'dead';
      return;
    }
    this.log.push(`${victim.name}を倒した！`);
    if (victim instanceof Monster) {
      this.grantExp(killer, victim);
      if (killer instanceof Player) this.tryRecruit(victim);
    }
    this.state.removeDeadMonsters();
  }

  private grantExp(killer: Actor | undefined, victim: Monster): void {
    const exp = victim.definition.exp;
    if (killer instanceof Player || killer instanceof Ally) {
      const ups = killer.gainExp(exp);
      if (ups > 0) this.log.push(`${killer.name}はレベル${killer.level}に上がった！`);
    }
  }

  private tryRecruit(victim: Monster): void {
    const chance = victim.definition.recruitChance;
    if (chance <= 0 || this.state.allies.length >= this.config.maxAllies) return;
    if (!this.rng.chance(chance)) return;
    const pos = findFreeTileNear(this.state, victim.pos) ?? findFreeTileNear(this.state, this.state.player.pos);
    if (!pos) return;
    const ally = new Ally(this.ids.generate(), victim.definition, pos);
    this.state.allies.push(ally);
    this.log.push(`${ally.name}が仲間になった！`);
  }
}
