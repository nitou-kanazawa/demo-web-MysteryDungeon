import type { GameState } from '../../domain/game/GameState';
import { TILE } from './RenderConfig';

/**
 * ライティング層。
 * - 未探索: 完全な闇
 * - 探索済み・視界外: 記憶として薄暗く
 * - 視界内: 主人公の松明による放射状の光（ゆらぎ付き）と、階段の淡い光
 * - 最後に暖色の soft-light を重ねて、松明のオレンジを乗せる
 */
export class Lighting {
  private overlay: HTMLCanvasElement | undefined;

  apply(g: CanvasRenderingContext2D, state: GameState, ox: number, oy: number, t: number): void {
    const { map, visibility, player } = state;
    const w = map.width * TILE;
    const h = map.height * TILE;
    const ov = this.getOverlay(w, h);
    const og = ov.getContext('2d');
    if (!og) return;

    const profile = state.theme.lighting;
    og.globalCompositeOperation = 'source-over';
    og.fillStyle =
      state.theme.id === 'sky' ? 'rgb(12,18,40)' : state.theme.id === 'water' ? 'rgb(2,6,18)' : state.theme.id === 'dark' ? 'rgb(0,0,2)' : 'rgb(3,2,8)';
    og.fillRect(0, 0, w, h);

    // 探索済み: 記憶の薄明かり
    og.globalCompositeOperation = 'destination-out';
    og.fillStyle = `rgba(0,0,0,${profile.explored})`;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const p = { x, y };
        if (visibility.isExplored(p) && !visibility.isVisible(p)) og.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    // 視界内: 松明の光（クリップして視界の外へ漏れないように）
    og.save();
    og.beginPath();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (visibility.isVisible({ x, y })) og.rect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    og.clip();
    // 松明が消えていると視界内のベース明るさも落ちる（見えてはいるが暗い）
    og.fillStyle = `rgba(0,0,0,${player.torch <= 0 ? profile.visible * 0.55 : profile.visible})`;
    og.fillRect(0, 0, w, h);

    const flicker = 1 + Math.sin(t / 90) * 0.035 + Math.sin(t / 37) * 0.02;
    const cx = (player.pos.x + 0.5) * TILE;
    const cy = (player.pos.y + 0.5) * TILE;
    // 松明の燃料が残り 100 を切ると光が小さくなる（0 でも最低限の明かりは残す）
    const fuel = player.torch >= 100 ? 1 : Math.max(0.4, player.torch / 100);
    const radius = TILE * profile.torchRadius * flicker * fuel;
    const torch = og.createRadialGradient(cx, cy, TILE * 0.5, cx, cy, radius);
    torch.addColorStop(0, 'rgba(0,0,0,1)');
    torch.addColorStop(0.45, 'rgba(0,0,0,0.85)');
    torch.addColorStop(1, 'rgba(0,0,0,0)');
    og.fillStyle = torch;
    og.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    // 溶岩は光源
    if (state.theme.id === 'volcano') {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (map.get({ x, y }) !== 7 || !visibility.isVisible({ x, y })) continue;
          const lx = (x + 0.5) * TILE;
          const ly = (y + 0.5) * TILE;
          const lr = TILE * 1.6;
          const lg = og.createRadialGradient(lx, ly, 0, lx, ly, lr);
          lg.addColorStop(0, 'rgba(0,0,0,0.9)');
          lg.addColorStop(1, 'rgba(0,0,0,0)');
          og.fillStyle = lg;
          og.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
        }
      }
    }

    const s = map.stairs;
    const sx = (s.x + 0.5) * TILE;
    const sy = (s.y + 0.5) * TILE;
    const sr = TILE * 2.2;
    const glow = og.createRadialGradient(sx, sy, 0, sx, sy, sr);
    glow.addColorStop(0, 'rgba(0,0,0,0.9)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    og.fillStyle = glow;
    og.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    og.restore();

    g.drawImage(ov, ox, oy);

    // 暖色トーン（松明のオレンジ）を視界内に重ねる
    g.save();
    g.beginPath();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (visibility.isVisible({ x, y })) g.rect(ox + x * TILE, oy + y * TILE, TILE, TILE);
      }
    }
    g.clip();
    g.globalCompositeOperation = 'soft-light';
    const warm = g.createRadialGradient(ox + cx, oy + cy, 0, ox + cx, oy + cy, radius);
    const k = profile.warm;
    warm.addColorStop(0, `rgba(255,170,70,${0.9 * k})`);
    warm.addColorStop(0.6, `rgba(255,140,50,${0.45 * k})`);
    warm.addColorStop(1, 'rgba(60,40,120,0)');
    g.fillStyle = warm;
    g.fillRect(ox + cx - radius, oy + cy - radius, radius * 2, radius * 2);
    g.globalCompositeOperation = 'source-over';
    // 霧: 視界内に灰色の霞を重ねる
    if (state.fog) {
      const drift = Math.sin(t / 900) * 6;
      g.fillStyle = 'rgba(190,200,215,0.18)';
      g.fillRect(ox, oy, w, h);
      g.fillStyle = 'rgba(220,228,240,0.10)';
      for (let i = 0; i < 4; i++) {
        const fy = oy + ((i * 137 + drift * (i + 1)) % h);
        g.fillRect(ox, fy, w, 14);
      }
    }
    g.restore();
  }

  private getOverlay(w: number, h: number): HTMLCanvasElement {
    if (!this.overlay || this.overlay.width !== w || this.overlay.height !== h) {
      this.overlay = document.createElement('canvas');
      this.overlay.width = w;
      this.overlay.height = h;
    }
    return this.overlay;
  }
}
