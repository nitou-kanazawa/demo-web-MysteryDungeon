import type { GameSession } from '../../domain/game/GameSession';
import type { UiMode } from '../ui/UiState';
import { HudRenderer } from './HudRenderer';
import { Lighting } from './Lighting';
import { MenuRenderer } from './MenuRenderer';
import { HUD_HEIGHT, LOG_HEIGHT, TILE } from './RenderConfig';
import { SpriteArt } from './SpriteArt';
import { TileArt } from './TileArt';
import { CodexRenderer } from './CodexRenderer';
import { Ally } from '../../domain/entity/Ally';
import { CAGE_BARS, featureSprite } from './sprites/featureSprites';
import { paintSprite } from './sprites/PixelSprite';
import type { AnimationPlayer } from './Animation';
import { MONSTER_MAP } from '../../domain/data/monsters';
import { ITEM_MAP } from '../../domain/data/items';
import { BLACKSMITH_DEF } from '../../domain/data/npcs';
import { HERO_SPRITE } from './sprites/heroSprite';
import { FONT } from './RenderConfig';

/** 各レイヤーを合成して 1 フレームを描く */
export class Renderer {
  private readonly tiles = new TileArt();
  private readonly sprites = new SpriteArt();
  private readonly lighting = new Lighting();
  private readonly hud = new HudRenderer();
  private readonly menus = new MenuRenderer();
  private readonly codex = new CodexRenderer();
  private readonly g: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement, mapWidth: number, mapHeight: number) {
    canvas.width = mapWidth * TILE;
    canvas.height = HUD_HEIGHT + mapHeight * TILE + LOG_HEIGHT;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('2d context unavailable');
    this.g = g;
  }

  get width(): number {
    return this.canvas.width;
  }
  get height(): number {
    return this.canvas.height;
  }

  /** ダメージ数字・ポップアップ・投げ物・魔法弾・ブレス・撃破の演出 */
  private drawOverlays(g: CanvasRenderingContext2D, anim: AnimationPlayer, ox: number, oy: number, t: number): void {
    for (const o of anim.overlays(t)) {
      g.save();
      switch (o.kind) {
        case 'text': {
          g.globalAlpha = Math.max(0, o.alpha);
          g.font = `bold ${o.size}px ${FONT}`;
          g.textAlign = 'center';
          g.textBaseline = 'bottom';
          g.lineWidth = 3;
          g.strokeStyle = 'rgba(0,0,0,0.85)';
          g.strokeText(o.text, ox + o.x, oy + o.y);
          g.fillStyle = o.color;
          g.fillText(o.text, ox + o.x, oy + o.y);
          break;
        }
        case 'death': {
          g.globalAlpha = Math.max(0, o.alpha);
          const def = o.defId ? (MONSTER_MAP.get(o.defId) ?? (o.defId === 'blacksmith' ? BLACKSMITH_DEF : undefined)) : undefined;
          if (def) this.sprites.drawCreature(g, def, ox + o.x, oy + o.y, t, o.scale);
          else if (o.faction === 'player') this.sprites.drawSprite(g, 'hero', HERO_SPRITE, ox + o.x, oy + o.y, (TILE / 32) * o.scale);
          // 白い閃光
          g.globalAlpha = Math.max(0, o.alpha) * 0.6;
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(ox + o.x, oy + o.y, TILE * 0.5 * o.scale, 0, Math.PI * 2);
          g.fill();
          break;
        }
        case 'item': {
          const def = ITEM_MAP.get(o.itemDefId);
          if (def) this.sprites.drawItemDef(g, def, ox + o.x, oy + o.y, TILE / 32);
          break;
        }
        case 'bolt': {
          o.trail.forEach((p, i) => {
            g.globalAlpha = 0.35 - i * 0.1;
            g.fillStyle = o.color;
            g.beginPath();
            g.arc(ox + p.x, oy + p.y, 6 - i, 0, Math.PI * 2);
            g.fill();
          });
          g.globalAlpha = 1;
          const grad = g.createRadialGradient(ox + o.x, oy + o.y, 1, ox + o.x, oy + o.y, 10);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.5, o.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = grad;
          g.beginPath();
          g.arc(ox + o.x, oy + o.y, 10, 0, Math.PI * 2);
          g.fill();
          break;
        }
        case 'breath': {
          const n = Math.max(1, Math.max(Math.abs(o.to.x - o.from.x), Math.abs(o.to.y - o.from.y)));
          const reach = Math.min(n, o.progress * (n + 1));
          for (let i = 1; i <= reach; i++) {
            const k = i / n;
            const cx = ox + (o.from.x + (o.to.x - o.from.x) * k + 0.5) * TILE;
            const cy = oy + (o.from.y + (o.to.y - o.from.y) * k + 0.5) * TILE;
            const r = TILE * (0.3 + 0.15 * Math.sin(t / 40 + i));
            g.globalAlpha = 0.85 * (1 - o.progress * 0.6);
            const grad = g.createRadialGradient(cx, cy, 2, cx, cy, r);
            grad.addColorStop(0, '#fde68a');
            grad.addColorStop(0.5, o.color);
            grad.addColorStop(1, 'rgba(220,38,38,0)');
            g.fillStyle = grad;
            g.beginPath();
            g.arc(cx, cy, r, 0, Math.PI * 2);
            g.fill();
          }
          break;
        }
      }
      g.restore();
    }
  }

  render(session: GameSession, mode: UiMode, t: number, anim?: AnimationPlayer): void {
    const g = this.g;
    const state = session.state;
    const ox = 0;
    const oy = HUD_HEIGHT;

    g.fillStyle = '#07060a';
    g.fillRect(0, 0, this.width, this.height);

    const frame: 0 | 1 = Math.floor(t / 700) % 2 === 0 ? 0 : 1;
    g.drawImage(this.tiles.render(state.map, state.theme.id, state.shop?.room, frame, state.blackMarket?.room), ox, oy);

    g.imageSmoothingEnabled = false;
    for (const [key, f] of state.allFeatures) {
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      if (!state.visibility.isExplored({ x, y })) continue;
      if (f.kind === 'cage') {
        const def = MONSTER_MAP.get(f.defId);
        if (def) this.sprites.drawCreature(g, def, ox + x * TILE + TILE / 2, oy + y * TILE + TILE / 2, t, (TILE / 32) * 0.8);
        paintSprite(g, CAGE_BARS, ox + x * TILE, oy + y * TILE, TILE / 32);
        continue;
      }
      const sprite = featureSprite(f);
      if (!sprite) continue;
      paintSprite(g, sprite, ox + x * TILE, oy + y * TILE, TILE / 32);
    }

    for (const [key, item] of state.groundItems) {
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      if (!state.visibility.isExplored({ x, y })) continue;
      this.sprites.drawItem(g, item, ox + x * TILE, oy + y * TILE);
    }

    for (const a of state.actors) {
      if (!a.isAlive) continue;
      if (a.faction !== 'player' && !state.visibility.isVisible(a.pos)) continue;
      const highlight = a instanceof Ally && a.joinedTurn >= 0 && state.turn - a.joinedTurn < 4;
      const v = anim ? anim.actorVisual(a.id, t) : { dx: 0, dy: 0, alpha: 1 };
      if (v.alpha <= 0) continue;
      g.save();
      g.globalAlpha = v.alpha;
      this.sprites.drawActor(g, a, ox + a.pos.x * TILE + v.dx, oy + a.pos.y * TILE + v.dy, t, highlight);
      g.restore();
    }

    this.lighting.apply(g, state, ox, oy, t);
    if (anim) this.drawOverlays(g, anim, ox, oy, t);

    // 店の値札（視界内のみ）
    g.font = `bold 10px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    for (const [key, item] of state.groundItems) {
      if (item.price === undefined) continue;
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      if (!state.visibility.isVisible({ x, y })) continue;
      const label = `${item.price}G`;
      const tx = ox + x * TILE + TILE / 2;
      const ty = oy + y * TILE + 2;
      g.fillStyle = 'rgba(0,0,0,0.7)';
      g.fillRect(tx - 14, ty - 11, 28, 11);
      g.fillStyle = '#fbbf24';
      g.fillText(label, tx, ty);
    }

    this.hud.drawTop(g, session, this.width);
    this.hud.drawLog(g, session, oy + state.map.height * TILE, this.width);
    this.menus.draw(g, session, mode, this.width, this.height);
    if (mode.kind === 'codex') this.codex.draw(g, session.codex, mode.view, this.width, this.height, t);
  }
}
