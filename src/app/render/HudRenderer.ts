import type { GameSession } from '../../domain/game/GameSession';
import { STATUS_LABEL } from '../../domain/entity/StatusEffect';
import { FONT, HUD_HEIGHT, LOG_HEIGHT, LOG_LINES } from './RenderConfig';

/** 上部ステータスバーと下部メッセージログ */
export class HudRenderer {
  drawTop(g: CanvasRenderingContext2D, session: GameSession, width: number): void {
    const p = session.state.player;
    g.fillStyle = '#100d16';
    g.fillRect(0, 0, width, HUD_HEIGHT);
    g.fillStyle = '#4b3f5c';
    g.fillRect(0, HUD_HEIGHT - 1, width, 1);

    g.font = `bold 15px ${FONT}`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillStyle = '#f5deb3';
    const y = HUD_HEIGHT / 2;
    g.fillText(`${session.state.floor}F`, 14, y);
    g.fillText(`Lv ${p.level}`, 64, y);

    // HP バー
    g.fillText('HP', 130, y);
    const bx = 160;
    const bw = 180;
    g.fillStyle = '#2b2233';
    g.fillRect(bx, y - 8, bw, 16);
    const ratio = p.hp / p.maxHp;
    g.fillStyle = ratio > 0.5 ? '#3fb950' : ratio > 0.25 ? '#d29922' : '#f85149';
    g.fillRect(bx, y - 8, bw * ratio, 16);
    g.strokeStyle = '#6e5a85';
    g.strokeRect(bx + 0.5, y - 7.5, bw - 1, 15);
    g.fillStyle = '#fff';
    g.font = `bold 12px ${FONT}`;
    g.textAlign = 'center';
    g.fillText(`${p.hp} / ${p.maxHp}`, bx + bw / 2, y + 0.5);

    g.textAlign = 'left';
    g.font = `bold 15px ${FONT}`;
    g.fillStyle = '#f5deb3';
    const hungerColor = p.hunger === 0 ? '#f85149' : p.hunger <= 20 ? '#d29922' : '#f5deb3';
    g.fillStyle = hungerColor;
    g.fillText(`満腹 ${p.hunger}%`, 360, y);
    g.fillStyle = '#f5deb3';
    g.fillText(`攻 ${p.atk}  守 ${p.def}`, 470, y);
    g.fillStyle = '#fbbf24';
    g.fillText(`${p.gold} G`, 590, y);
    g.fillStyle = '#9ca3af';
    g.font = `13px ${FONT}`;
    g.fillText(`Turn ${session.state.turn}`, 680, y);
    const st = p.activeStatuses.map((k) => STATUS_LABEL[k]).join(' ');
    if (st) {
      g.fillStyle = '#c084fc';
      g.fillText(st, 770, y);
    }
    g.textAlign = 'right';
    g.fillStyle = '#6b7280';
    g.fillText('[?] 操作方法  [I] 持ち物', width - 12, y);
  }

  drawLog(g: CanvasRenderingContext2D, session: GameSession, top: number, width: number): void {
    g.fillStyle = '#0c0a12';
    g.fillRect(0, top, width, LOG_HEIGHT);
    g.fillStyle = '#4b3f5c';
    g.fillRect(0, top, width, 1);
    const lines = session.log.recent(LOG_LINES);
    g.font = `14px ${FONT}`;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    lines.forEach((line, i) => {
      const age = lines.length - 1 - i;
      g.fillStyle = age === 0 ? '#f8f0dc' : `rgba(220,205,180,${0.85 - age * 0.18})`;
      g.fillText(line, 14, top + 8 + i * 20);
    });
  }
}
