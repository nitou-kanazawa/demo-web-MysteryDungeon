import type { Vec2 } from '../../domain/core/Vec2';
import type { VisualEvent } from '../../domain/game/VisualEvent';
import { TILE } from './RenderConfig';

interface Scheduled {
  readonly ev: VisualEvent;
  start: number;
  end: number;
  /** 入力をブロックする（移動・攻撃・投擲などの「動き」）。ポップアップなどは非ブロック */
  readonly blocking: boolean;
}

export interface ActorVisual {
  /** ピクセル単位の表示オフセット */
  dx: number;
  dy: number;
  alpha: number;
}

export type Overlay =
  | { kind: 'text'; x: number; y: number; text: string; color: string; alpha: number; size: number }
  | { kind: 'death'; x: number; y: number; defId: string | undefined; faction: string; alpha: number; scale: number }
  | { kind: 'item'; x: number; y: number; itemDefId: string; alpha: number }
  | { kind: 'bolt'; x: number; y: number; color: string; trail: Array<{ x: number; y: number }> }
  | { kind: 'breath'; from: Vec2; to: Vec2; progress: number; color: string };

const MOVE_MS = 110;
const ATTACK_MS = 170;
const TELEPORT_MS = 280;
const POPUP_MS = 850;
const DEATH_MS = 380;

const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);
const dist = (a: Vec2, b: Vec2): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/**
 * 演出イベントを時間軸に並べて再生する。
 * - 連続する move は同時に再生（敵が一斉に動く）
 * - 攻撃・投擲・ワープは順番に再生し、その間はダッシュを止める
 * - ポップアップ・回復・死亡はブロックせず重ねて表示
 * - 入力があれば skip() でブロック中の動きを省略して即応答
 */
export class AnimationPlayer {
  private items: Scheduled[] = [];
  private cursor = 0;

  push(events: readonly VisualEvent[], now: number): void {
    let t = Math.max(now, this.cursor);
    let i = 0;
    while (i < events.length) {
      const ev = events[i] as VisualEvent;
      if (ev.type === 'floor') {
        this.items = [];
        t = now;
        i++;
        continue;
      }
      if (ev.type === 'move') {
        const start = t;
        let end = t;
        while (i < events.length && (events[i] as VisualEvent).type === 'move') {
          const m = events[i] as Extract<VisualEvent, { type: 'move' }>;
          const d = m.fast ? Math.min(260, 40 * Math.max(1, dist(m.from, m.to))) : MOVE_MS;
          this.items.push({ ev: m, start, end: start + d, blocking: true });
          end = Math.max(end, start + d);
          i++;
        }
        t = end;
        continue;
      }
      switch (ev.type) {
        case 'attack':
          this.items.push({ ev, start: t, end: t + ATTACK_MS, blocking: true });
          t += ATTACK_MS * 0.6; // 当たりの瞬間に次（ダメージ表示）が重なる
          break;
        case 'damage':
        case 'miss':
          this.items.push({ ev, start: t, end: t + POPUP_MS, blocking: false });
          t += 40;
          break;
        case 'heal':
        case 'popup':
          this.items.push({ ev, start: t, end: t + POPUP_MS, blocking: false });
          break;
        case 'death':
          this.items.push({ ev, start: t, end: t + DEATH_MS, blocking: false });
          break;
        case 'projectile': {
          const d = Math.max(120, 28 * dist(ev.from, ev.to));
          this.items.push({ ev, start: t, end: t + d, blocking: true });
          t += d;
          break;
        }
        case 'teleport':
          this.items.push({ ev, start: t, end: t + TELEPORT_MS, blocking: true });
          t += TELEPORT_MS;
          break;
      }
      i++;
    }
    this.cursor = t;
  }

  isBusy(now: number): boolean {
    return this.items.some((s) => s.blocking && s.end > now);
  }

  /** ブロック中の動きを省略する（ポップアップは残す） */
  skip(now: number): void {
    this.items = this.items.filter((s) => !s.blocking);
    this.cursor = now;
  }

  prune(now: number): void {
    this.items = this.items.filter((s) => s.end > now);
  }

  actorVisual(actorId: number, now: number): ActorVisual {
    const v: ActorVisual = { dx: 0, dy: 0, alpha: 1 };
    for (const s of this.items) {
      if (now < s.start || now >= s.end) continue;
      const p = (now - s.start) / (s.end - s.start);
      const ev = s.ev;
      if (ev.type === 'move' && ev.actorId === actorId) {
        const q = easeOut(p);
        v.dx += (ev.from.x - ev.to.x) * (1 - q) * TILE;
        v.dy += (ev.from.y - ev.to.y) * (1 - q) * TILE;
      } else if (ev.type === 'attack' && ev.actorId === actorId) {
        const k = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
        v.dx += Math.sign(ev.target.x - ev.from.x) * k * TILE * 0.4;
        v.dy += Math.sign(ev.target.y - ev.from.y) * k * TILE * 0.4;
      } else if (ev.type === 'damage' && ev.actorId === actorId && p < 0.3) {
        const k = 1 - p / 0.3;
        v.dx += Math.sin(now * 0.09) * 3 * k;
      } else if (ev.type === 'teleport' && ev.actorId === actorId) {
        if (p < 0.5) {
          v.alpha = Math.min(v.alpha, 1 - p / 0.5);
          v.dx += (ev.from.x - ev.to.x) * TILE;
          v.dy += (ev.from.y - ev.to.y) * TILE;
        } else {
          v.alpha = Math.min(v.alpha, (p - 0.5) / 0.5);
        }
      }
    }
    return v;
  }

  /** 画面に重ねる演出（ピクセル座標はタイル左上原点からの相対で返す） */
  overlays(now: number): Overlay[] {
    const out: Overlay[] = [];
    const stack = new Map<string, number>();
    for (const s of this.items) {
      if (now < s.start || now >= s.end) continue;
      const p = (now - s.start) / (s.end - s.start);
      const ev = s.ev;
      switch (ev.type) {
        case 'damage':
        case 'miss':
        case 'heal':
        case 'popup': {
          const pos = ev.pos;
          const key = `${pos.x},${pos.y}`;
          const n = stack.get(key) ?? 0;
          stack.set(key, n + 1);
          const text =
            ev.type === 'damage' ? String(ev.amount) : ev.type === 'miss' ? 'MISS' : ev.type === 'heal' ? `+${ev.amount}` : ev.text;
          const color =
            ev.type === 'damage'
              ? ev.faction === 'player' || ev.faction === 'ally'
                ? '#f87171'
                : '#ffffff'
              : ev.type === 'miss'
                ? '#9ca3af'
                : ev.type === 'heal'
                  ? '#4ade80'
                  : ev.color;
          const size = ev.type === 'damage' ? (ev.faction === 'player' ? 18 : 16) : 13;
          const rise = ev.type === 'damage' || ev.type === 'heal' ? 26 : 18;
          out.push({
            kind: 'text',
            x: (pos.x + 0.5) * TILE,
            y: pos.y * TILE - 2 - easeOut(p) * rise - n * 14,
            text,
            color,
            alpha: 1 - p * p,
            size,
          });
          break;
        }
        case 'death':
          out.push({
            kind: 'death',
            x: (ev.pos.x + 0.5) * TILE,
            y: (ev.pos.y + 0.5) * TILE,
            defId: ev.defId,
            faction: ev.faction,
            alpha: 1 - p,
            scale: 1 + p * 0.35,
          });
          break;
        case 'projectile': {
          const q = ev.kind === 'breath' ? p : easeOut(p);
          const x = (ev.from.x + (ev.to.x - ev.from.x) * q + 0.5) * TILE;
          const y = (ev.from.y + (ev.to.y - ev.from.y) * q + 0.5) * TILE;
          if (ev.kind === 'item' && ev.itemDefId) out.push({ kind: 'item', x, y: y - Math.sin(p * Math.PI) * 10, itemDefId: ev.itemDefId, alpha: 1 });
          else if (ev.kind === 'bolt') {
            const trail = [0.15, 0.3, 0.45].map((back) => {
              const qq = Math.max(0, q - back);
              return { x: (ev.from.x + (ev.to.x - ev.from.x) * qq + 0.5) * TILE, y: (ev.from.y + (ev.to.y - ev.from.y) * qq + 0.5) * TILE };
            });
            out.push({ kind: 'bolt', x, y, color: ev.color ?? '#c084fc', trail });
          } else out.push({ kind: 'breath', from: ev.from, to: ev.to, progress: p, color: ev.color ?? '#f97316' });
          break;
        }
        default:
          break;
      }
    }
    return out;
  }
}
