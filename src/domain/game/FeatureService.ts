import type { IdGenerator } from '../core/Id';
import type { IRng } from '../core/Rng';
import { DIRECTIONS, DIR_VEC, addVec, type Direction, type Vec2 } from '../core/Vec2';
import { TileType } from '../map/Tile';
import type { Actor } from '../entity/Actor';
import { Monster } from '../entity/Monster';
import { Player } from '../entity/Player';
import { Ally } from '../entity/Ally';
import { MONSTER_MAP } from '../data/monsters';
import type { ActionExecutor } from './ActionExecutor';
import type { GameState } from './GameState';
import type { MessageLog } from './MessageLog';
import { findFreeTileNear } from './Placement';
import { TRAP_KINDS, TRAP_LABEL, type TileFeature, type TrapKind } from './TileFeature';
import type { FloorBuilder } from './FloorBuilder';
import { POPUP_COLORS, type VisualSink } from './VisualEvent';

export interface FeatureHooks {
  /** 落とし穴: プレイヤーを次の階へ */
  readonly fallToNextFloor: () => void;
  /** ワープ: プレイヤーをランダムな場所へ */
  readonly teleportPlayer: () => void;
  /** 仲間の最大数（檻から加入するときの上限） */
  readonly maxAllies: number;
}

/**
 * マスに付く物（罠・跳ね床・泉・石碑）の発動ルール。
 * 敵・仲間は罠を踏んでも発動しない（本家準拠）。トラップの杖で強制発動できる。
 */
export class FeatureService {
  constructor(
    private readonly state: GameState,
    private readonly rng: IRng,
    private readonly log: MessageLog,
    private readonly actions: ActionExecutor,
    private readonly ids: IdGenerator,
    private readonly floors: FloorBuilder,
    private readonly hooks: FeatureHooks,
    private readonly visuals: VisualSink,
  ) {}

  /** アクターがマスに入ったとき */
  onEntered(actor: Actor, pos: Vec2): void {
    const f = this.state.featureAt(pos);
    if (!f) return;
    switch (f.kind) {
      case 'trap':
        if (actor instanceof Player) this.triggerTrap(f, actor, pos);
        break;
      case 'spring': {
        this.log.push(`${actor.name}は跳ね床で飛ばされた！`);
        this.actions.knockback(actor, f.dir);
        if (actor instanceof Player) this.onEntered(actor, actor.pos);
        break;
      }
      case 'fountain':
        if (actor instanceof Player) this.drinkFountain(f, actor, pos);
        break;
      case 'sign':
        if (actor instanceof Player) this.log.push(`石碑「${f.text}」`);
        break;
      case 'switch':
        if (actor instanceof Player) this.activateSwitch(f, pos);
        break;
      case 'boulder':
      case 'crack':
      case 'door':
      case 'gate':
      case 'cage':
      case 'rock':
        break;
    }
  }

  /** スイッチ: 1 回だけ作動し、橋を架ける／格子を開く */
  private activateSwitch(f: Extract<TileFeature, { kind: 'switch' }>, pos: Vec2): void {
    if (f.active) {
      this.log.push('スイッチはもう作動している。');
      return;
    }
    f.active = true;
    this.visuals.emit({ type: 'popup', pos, text: 'カチッ', color: POPUP_COLORS.warn });
    if (f.mode === 'bridge') {
      for (const t of f.targets) {
        if (this.state.map.get(t) === this.state.map.solid) this.state.map.set(t, TileType.Corridor);
      }
      this.log.push('スイッチを踏んだ！ 遠くで橋が架かる音がした。');
    } else {
      let opened = 0;
      for (const t of f.targets) {
        if (this.state.featureAt(t)?.kind === 'gate') {
          this.state.removeFeatureAt(t);
          opened++;
        }
      }
      this.log.push(opened > 0 ? 'スイッチを踏んだ！ どこかで格子が開いた。' : 'スイッチを踏んだが、何も起こらなかった。');
    }
    this.state.visibility.update(this.state.player.pos);
  }

  /** 持ち物のカギを 1 つ消費する。無ければ false */
  private consumeKey(player: Player): boolean {
    const key = player.inventory.items.find((i) => i.def.id === 'key');
    if (!key) return false;
    player.inventory.remove(key);
    return true;
  }

  /** 扉に体当たり: カギがあれば開く */
  openDoor(player: Player, pos: Vec2): boolean {
    const f = this.state.featureAt(pos);
    if (!f || f.kind !== 'door') return false;
    if (!this.consumeKey(player)) {
      this.log.push('扉には鍵がかかっている。カギが必要だ。');
      return false;
    }
    this.state.removeFeatureAt(pos);
    this.log.push('カギを使って扉を開けた！');
    this.visuals.emit({ type: 'popup', pos, text: '開いた', color: POPUP_COLORS.good });
    return true;
  }

  /** 檻に体当たり: カギがあれば中の魔物が仲間になる */
  openCage(player: Player, pos: Vec2): boolean {
    const f = this.state.featureAt(pos);
    if (!f || f.kind !== 'cage') return false;
    const def = MONSTER_MAP.get(f.defId);
    if (!def) return false;
    const hasKey = player.inventory.items.some((i) => i.def.id === 'key');
    if (!hasKey) {
      this.log.push(`檻には鍵がかかっている。中の${def.name}が助けを求めている…`);
      return false;
    }
    if (this.state.allies.length >= this.hooks.maxAllies) {
      this.log.push('仲間がいっぱいで連れて行けない。');
      return false;
    }
    this.consumeKey(player);
    this.state.removeFeatureAt(pos);
    const ally = new Ally(this.ids.generate(), def, pos);
    ally.joinedTurn = this.state.turn;
    this.state.allies.push(ally);
    this.log.push(`檻を開けた！ ${def.name}が仲間になった！`);
    this.visuals.emit({ type: 'popup', pos, text: '仲間になった！', color: POPUP_COLORS.good });
    return true;
  }

  /**
   * 岩を dir 方向へ押す。押せたら true（プレイヤーはその後に岩のあった位置へ進む）。
   * 先が水なら沈んで足場（床）に、空なら落ちて消える。壁・アクター・別の物があれば押せない。
   */
  pushBoulder(from: Vec2, dir: Direction): boolean {
    const boulderPos = addVec(from, DIR_VEC[dir]);
    const f = this.state.featureAt(boulderPos);
    if (!f || f.kind !== 'boulder') return false;
    const beyond = addVec(boulderPos, DIR_VEC[dir]);
    const tile = this.state.map.get(beyond);
    if (!this.state.map.inBounds(beyond) || tile === TileType.Wall || this.state.isOccupied(beyond) || this.state.featureAt(beyond)) {
      this.log.push('岩はびくともしない。');
      return false;
    }
    this.state.removeFeatureAt(boulderPos);
    if (tile === TileType.Water) {
      this.state.map.set(beyond, TileType.Floor);
      this.log.push('岩が水に沈み、足場になった！');
    } else if (tile === TileType.Lava) {
      this.state.map.set(beyond, TileType.Floor);
      this.log.push('岩が溶岩を塞いで冷え固まった！');
    } else if (tile === TileType.Void) {
      this.log.push('岩は空の彼方へ落ちていった。');
    } else {
      const item = this.state.itemAt(beyond);
      if (item) {
        this.state.removeItemAt(beyond);
        this.log.push(`${item.displayName}は岩に潰れた。`);
      }
      this.state.placeFeature(beyond, { kind: 'boulder' });
      this.log.push('岩を押した。');
    }
    return true;
  }

  /** フロアの罠をすべて可視化する。可視化した数を返す */
  revealAllTraps(): number {
    let n = 0;
    for (const [, f] of this.state.allFeatures) {
      if (f.kind === 'trap' && f.hidden) {
        f.hidden = false;
        n++;
      }
    }
    return n;
  }

  /** トラップの杖: 対象の足元に罠を作って発動させる */
  plantAndTrigger(target: Actor): void {
    const trap: TrapKind = this.rng.pick(TRAP_KINDS.filter((k) => k !== 'pitfall' || target.faction === 'enemy'));
    const f: TileFeature = { kind: 'trap', trap, hidden: false };
    this.state.placeFeature(target.pos, f);
    this.log.push(`${target.name}の足元に${TRAP_LABEL[trap]}の罠が現れた！`);
    this.triggerTrap(f, target, target.pos);
  }

  private triggerTrap(f: Extract<TileFeature, { kind: 'trap' }>, victim: Actor, pos: Vec2): void {
    f.hidden = false;
    this.log.push(`${TRAP_LABEL[f.trap]}の罠だ！`);
    this.visuals.emit({ type: 'popup', pos, text: `${TRAP_LABEL[f.trap]}の罠！`, color: POPUP_COLORS.trap });
    switch (f.trap) {
      case 'pitfall':
        if (victim instanceof Player) {
          this.hooks.fallToNextFloor();
        } else {
          this.log.push(`${victim.name}は穴に落ちていった。`);
          victim.takeDamage(victim.hp);
          this.state.removeDeadMonsters();
        }
        break;
      case 'mine': {
        this.log.push('爆発した！');
        const victims = this.state.actors.filter((a) => Math.max(Math.abs(a.pos.x - pos.x), Math.abs(a.pos.y - pos.y)) <= 1);
        for (const a of victims) this.actions.dealDamage(undefined, a, 20);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const p = { x: pos.x + dx, y: pos.y + dy };
            const item = this.state.itemAt(p);
            if (item) {
              this.state.removeItemAt(p);
              this.log.push(`${item.displayName}は爆発で消えた。`);
            }
          }
        }
        this.state.removeFeatureAt(pos);
        break;
      }
      case 'sleepGas':
        victim.addStatus('sleep', 3);
        this.log.push(`${victim.name}は眠ってしまった。`);
        this.visuals.emit({ type: 'popup', pos: victim.pos, text: '眠り', color: POPUP_COLORS.status });
        break;
      case 'warp':
        if (victim instanceof Player) {
          this.hooks.teleportPlayer();
        } else {
          const tiles = [...this.state.map.walkableTiles()].filter((t) => !this.state.isOccupied(t));
          if (tiles.length > 0) victim.pos = this.rng.pick(tiles);
          this.log.push(`${victim.name}はどこかへ飛ばされた。`);
        }
        break;
      case 'rust':
        if (victim instanceof Player) {
          const target = victim.weapon ?? victim.shield;
          if (target) {
            target.plus -= 1;
            this.log.push(`${target.def.name}が錆びた…`);
          } else {
            this.log.push('しかし装備がないので何も起きなかった。');
          }
        } else {
          this.log.push(`${victim.name}には効かなかった。`);
        }
        break;
      case 'summon': {
        let n = 0;
        for (const d of this.rng.shuffle(DIRECTIONS).slice(0, 3)) {
          const p = addVec(pos, DIR_VEC[d]);
          if (!this.state.map.isWalkable(p) || this.state.isOccupied(p)) continue;
          const m = this.floors.spawnMonsterAt(this.state, this.rng, p);
          if (m) n++;
        }
        this.log.push(n > 0 ? '魔物が現れた！' : '何も現れなかった。');
        this.state.removeFeatureAt(pos);
        break;
      }
    }
  }

  private drinkFountain(f: Extract<TileFeature, { kind: 'fountain' }>, p: Player, pos: Vec2): void {
    if (f.uses <= 0) {
      this.log.push('泉は枯れている。');
      return;
    }
    f.uses--;
    if (f.effect === 'heal') {
      p.hp = p.maxHp;
      p.hunger = p.maxHunger;
      this.log.push('回復の泉だ。HPと満腹度が全回復した！');
    } else {
      const target = p.weapon ?? p.shield;
      if (target) target.plus -= 1;
      this.log.push('呪いの泉だ… 装備が錆びた。');
    }
    if (f.uses <= 0) this.state.removeFeatureAt(pos);
  }

  /** 罠を置ける場所（部屋の床で、アイテム・階段・他の物が無い） */
  findTrapTile(rng: IRng, room: { tiles(): IterableIterator<Vec2> }): Vec2 | undefined {
    const candidates = [...room.tiles()].filter(
      (t) => this.state.map.get(t) === 1 && !this.state.itemAt(t) && !this.state.featureAt(t) && !this.state.isOccupied(t),
    );
    return candidates.length > 0 ? rng.pick(candidates) : undefined;
  }

  /** 仲間や敵が跳ね床などで飛ばされたときの退避 */
  relocate(actor: Actor): void {
    const p = findFreeTileNear(this.state, actor.pos);
    if (p) actor.pos = p;
  }

  static isMonster(a: Actor): a is Monster {
    return a instanceof Monster;
  }

  static newId(ids: IdGenerator): number {
    return ids.generate();
  }
}
