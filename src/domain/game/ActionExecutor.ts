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
import { Npc } from '../entity/Npc';
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
    /** 番人撃破時のドロップなど、フロア生成器に頼む処理 */
    private onGuardianKilled: ((victim: Monster) => void) | undefined = undefined,
  ) {}

  setGuardianHandler(handler: (victim: Monster) => void): void {
    this.onGuardianKilled = handler;
  }

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
    if (target instanceof Npc) {
      target.takeDamage(amount);
      this.log.push(`${target.name}に${amount}のダメージ！`);
      this.angerNpc(target);
      return;
    }
    if (target instanceof Monster && target.asleep) {
      target.asleep = false;
      this.log.push(`${target.name}は目を覚ました！`);
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
    this.log.push(`${victim instanceof Monster ? victim.displayName : victim.name}を倒した！`);
    if (victim instanceof Monster) {
      this.grantExp(killer, victim);
      if (victim.guardian) {
        this.log.push('番人を倒した！ 何かを落としたようだ。');
        this.onGuardianKilled?.(victim);
      } else if (killer instanceof Player) {
        this.tryRecruit(victim);
      }
    }
    this.state.removeDeadMonsters();
  }

  /** 中立 NPC を怒らせて敵にする */
  angerNpc(npc: Npc): void {
    this.state.npcs = this.state.npcs.filter((n) => n !== npc);
    const m = new Monster(this.ids.generate(), npc.definition, npc.pos);
    m.hp = npc.hp;
    m.lastSeenPlayerPos = this.state.player.pos;
    this.state.monsters.push(m);
    this.log.push(`${npc.name}は怒って襲いかかってきた！`);
  }

  private grantExp(killer: Actor | undefined, victim: Monster): void {
    const exp = victim.definition.exp * (victim.guardian ? 2 : 1);
    if (killer instanceof Player) {
      const ups = killer.gainExp(exp);
      if (ups > 0) this.log.push(`${killer.name}はレベル${killer.level}に上がった！`);
    } else if (killer instanceof Ally) {
      const before = killer.level;
      const ups = killer.gainExp(exp);
      if (ups > 0) {
        this.log.push(`${killer.name}はレベル${killer.level}に上がった！`);
        for (let lv = before + 1; lv <= killer.level; lv++) {
          for (const s of killer.skillsLearnedAt(lv)) this.log.push(`${killer.name}は${s.name}を覚えた！`);
        }
      }
    }
  }

  private tryRecruit(victim: Monster): void {
    const chance = victim.definition.recruitChance;
    if (chance <= 0 || this.state.allies.length >= this.config.maxAllies) return;
    if (!this.rng.chance(chance)) return;
    const pos = findFreeTileNear(this.state, victim.pos) ?? findFreeTileNear(this.state, this.state.player.pos);
    if (!pos) return;
    const ally = new Ally(this.ids.generate(), victim.definition, pos);
    ally.joinedTurn = this.state.turn;
    this.state.allies.push(ally);
    this.log.push(`${ally.name}は起き上がり、仲間になりたそうにこちらを見ている…`);
    this.log.push(`${ally.name}が仲間になった！`);
  }
}
