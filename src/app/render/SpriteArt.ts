import type { Actor } from '../../domain/entity/Actor';
import type { ItemInstance } from '../../domain/item/ItemInstance';
import { FONT, TILE } from './RenderConfig';

/** アクター・アイテムをプリミティブで描く（アセット不要の簡易スプライト） */
export class SpriteArt {
  drawActor(g: CanvasRenderingContext2D, a: Actor, px: number, py: number, t: number): void {
    const cx = px + TILE / 2;
    const cy = py + TILE / 2;
    // 足元の影
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath();
    g.ellipse(cx, py + TILE - 3, TILE * 0.36, TILE * 0.14, 0, 0, Math.PI * 2);
    g.fill();

    if (a.faction === 'player') {
      this.drawHero(g, px, py, t);
    } else {
      this.drawMonster(g, a, cx, cy, t);
    }

    if (a.faction === 'ally') {
      g.strokeStyle = '#7CFC00';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, cy, TILE * 0.47, 0, Math.PI * 2);
      g.stroke();
    }

    if (a.hp < a.maxHp) {
      const w = TILE - 6;
      const ratio = a.hp / a.maxHp;
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(px + 3, py + 1, w, 3);
      g.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#ef4444';
      g.fillRect(px + 3, py + 1, w * ratio, 3);
    }
    if (a.hasStatus('paralysis')) this.drawStatusMark(g, px, py, '縛', '#c084fc');
    else if (a.hasStatus('confusion')) this.drawStatusMark(g, px, py, '？', '#facc15');
  }

  /** 主人公: 赤いバンダナの盗賊風ピクセル図案 */
  private drawHero(g: CanvasRenderingContext2D, px: number, py: number, t: number): void {
    const bob = Math.round(Math.sin(t / 260) * 1);
    const x = px + 4;
    const y = py + 2 + bob;
    const P = (col: string, rx: number, ry: number, w: number, h: number): void => {
      g.fillStyle = col;
      g.fillRect(x + rx, y + ry, w, h);
    };
    P('#c0392b', 3, 0, 10, 4); // バンダナ
    P('#e74c3c', 12, 1, 4, 2); // バンダナの結び目
    P('#f1c27d', 4, 4, 8, 6); // 顔
    P('#3b2412', 6, 6, 2, 2); // 目
    P('#3b2412', 9, 6, 2, 2);
    P('#2e8b57', 3, 10, 10, 6); // 服
    P('#8b5a2b', 3, 16, 3, 4); // 足
    P('#8b5a2b', 10, 16, 3, 4);
    P('#d9d9d9', 13, 9, 2, 8); // 剣
    P('#8b5a2b', 12, 16, 4, 2);
  }

  private drawMonster(g: CanvasRenderingContext2D, a: Actor, cx: number, cy: number, t: number): void {
    const r = TILE * 0.38;
    const pulse = 1 + Math.sin(t / 300 + a.id) * 0.04;
    const grad = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
    grad.addColorStop(0, lighten(a.color, 0.35));
    grad.addColorStop(1, darken(a.color, 0.35));
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, cy + 1, r * pulse, r * 0.92 * pulse, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.lineWidth = 1.5;
    g.stroke();
    // 目
    g.fillStyle = '#fff';
    g.fillRect(cx - 5, cy - 2, 3, 3);
    g.fillRect(cx + 2, cy - 2, 3, 3);
    g.fillStyle = '#111';
    g.fillRect(cx - 4, cy - 1, 2, 2);
    g.fillRect(cx + 3, cy - 1, 2, 2);
    // 種別の文字
    g.font = `bold 9px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillText(a.glyph, cx, cy + 6);
  }

  private drawStatusMark(g: CanvasRenderingContext2D, px: number, py: number, mark: string, color: string): void {
    g.font = `bold 10px ${FONT}`;
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.fillStyle = color;
    g.fillText(mark, px + TILE - 1, py + 1);
  }

  drawItem(g: CanvasRenderingContext2D, item: ItemInstance, px: number, py: number): void {
    const cx = px + TILE / 2;
    const cy = py + TILE / 2;
    g.lineWidth = 1.5;
    switch (item.def.category) {
      case 'weapon':
        g.strokeStyle = '#e5e7eb';
        g.beginPath();
        g.moveTo(cx - 6, cy + 6);
        g.lineTo(cx + 5, cy - 5);
        g.stroke();
        g.strokeStyle = '#b8860b';
        g.beginPath();
        g.moveTo(cx - 7, cy + 2);
        g.lineTo(cx - 2, cy + 7);
        g.stroke();
        break;
      case 'shield':
        g.fillStyle = '#9ca3af';
        g.beginPath();
        g.moveTo(cx - 6, cy - 6);
        g.lineTo(cx + 6, cy - 6);
        g.lineTo(cx + 6, cy + 1);
        g.quadraticCurveTo(cx + 6, cy + 6, cx, cy + 8);
        g.quadraticCurveTo(cx - 6, cy + 6, cx - 6, cy + 1);
        g.closePath();
        g.fill();
        g.strokeStyle = '#374151';
        g.stroke();
        g.fillStyle = '#b91c1c';
        g.fillRect(cx - 1, cy - 4, 2, 8);
        break;
      case 'food':
        g.fillStyle = '#d4a056';
        g.beginPath();
        g.ellipse(cx, cy, 8, 5.5, -0.3, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#8b5a2b';
        g.stroke();
        break;
      case 'herb':
        g.fillStyle = '#22c55e';
        g.beginPath();
        g.moveTo(cx, cy + 7);
        g.quadraticCurveTo(cx - 9, cy, cx - 2, cy - 7);
        g.quadraticCurveTo(cx + 8, cy - 2, cx, cy + 7);
        g.fill();
        g.strokeStyle = '#14532d';
        g.beginPath();
        g.moveTo(cx, cy + 7);
        g.lineTo(cx - 1, cy - 4);
        g.stroke();
        break;
      case 'seed':
        g.fillStyle = '#f97316';
        for (const [dx, dy] of [[-4, 2], [3, 3], [0, -4]] as const) {
          g.beginPath();
          g.ellipse(cx + dx, cy + dy, 3, 2.2, 0.5, 0, Math.PI * 2);
          g.fill();
        }
        break;
      case 'scroll':
        g.fillStyle = '#f5e6c8';
        g.fillRect(cx - 6, cy - 7, 12, 14);
        g.strokeStyle = '#8b6b3b';
        g.strokeRect(cx - 6, cy - 7, 12, 14);
        g.fillStyle = '#8b6b3b';
        g.fillRect(cx - 4, cy - 4, 8, 1);
        g.fillRect(cx - 4, cy - 1, 8, 1);
        g.fillRect(cx - 4, cy + 2, 6, 1);
        break;
      case 'staff':
        g.strokeStyle = '#a16207';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(cx - 5, cy + 8);
        g.lineTo(cx + 3, cy - 4);
        g.stroke();
        g.fillStyle = '#60a5fa';
        g.beginPath();
        g.arc(cx + 4, cy - 6, 3.5, 0, Math.PI * 2);
        g.fill();
        break;
      case 'pot': {
        g.fillStyle = '#b45309';
        g.beginPath();
        g.moveTo(cx - 4, cy - 8);
        g.lineTo(cx + 4, cy - 8);
        g.lineTo(cx + 3, cy - 5);
        g.quadraticCurveTo(cx + 9, cy, cx + 5, cy + 8);
        g.lineTo(cx - 5, cy + 8);
        g.quadraticCurveTo(cx - 9, cy, cx - 3, cy - 5);
        g.closePath();
        g.fill();
        g.strokeStyle = '#451a03';
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(cx - 4, cy - 2, 2, 6);
        break;
      }
      case 'material':
        g.fillStyle = '#94a3b8';
        g.beginPath();
        g.moveTo(cx, cy - 8);
        g.lineTo(cx + 7, cy);
        g.lineTo(cx, cy + 8);
        g.lineTo(cx - 7, cy);
        g.closePath();
        g.fill();
        g.strokeStyle = '#334155';
        g.stroke();
        break;
      case 'gold':
        g.fillStyle = '#fbbf24';
        g.beginPath();
        g.arc(cx, cy, 6.5, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#92400e';
        g.stroke();
        g.fillStyle = '#92400e';
        g.font = `bold 9px ${FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('G', cx, cy + 0.5);
        break;
    }
  }
}

function parseHex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten(c: string, k: number): string {
  const [r, g, b] = parseHex(c);
  return `rgb(${r + (255 - r) * k},${g + (255 - g) * k},${b + (255 - b) * k})`;
}
function darken(c: string, k: number): string {
  const [r, g, b] = parseHex(c);
  return `rgb(${r * (1 - k)},${g * (1 - k)},${b * (1 - k)})`;
}
