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
import { featureSprite } from './sprites/featureSprites';
import { paintSprite } from './sprites/PixelSprite';
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

  render(session: GameSession, mode: UiMode, t: number): void {
    const g = this.g;
    const state = session.state;
    const ox = 0;
    const oy = HUD_HEIGHT;

    g.fillStyle = '#07060a';
    g.fillRect(0, 0, this.width, this.height);

    const frame: 0 | 1 = Math.floor(t / 700) % 2 === 0 ? 0 : 1;
    g.drawImage(this.tiles.render(state.map, state.theme.id, state.shop?.room, frame), ox, oy);

    g.imageSmoothingEnabled = false;
    for (const [key, f] of state.allFeatures) {
      const sprite = featureSprite(f);
      if (!sprite) continue;
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      if (!state.visibility.isExplored({ x, y })) continue;
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
      this.sprites.drawActor(g, a, ox + a.pos.x * TILE, oy + a.pos.y * TILE, t, highlight);
    }

    this.lighting.apply(g, state, ox, oy, t);

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
