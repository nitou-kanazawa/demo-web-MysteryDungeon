import { FONT } from './RenderConfig';

/** 金縁の暗いパネル（メニュー共通） */
export function drawPanel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title?: string): void {
  g.fillStyle = 'rgba(12,9,20,0.92)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#c9a961';
  g.lineWidth = 2;
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.strokeStyle = 'rgba(201,169,97,0.4)';
  g.lineWidth = 1;
  g.strokeRect(x + 5.5, y + 5.5, w - 11, h - 11);
  if (title) {
    g.font = `bold 15px ${FONT}`;
    g.fillStyle = '#f5deb3';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(title, x + 16, y + 12);
  }
}
