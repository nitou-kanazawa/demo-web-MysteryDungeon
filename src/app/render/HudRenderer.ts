import type { GameSession } from '../../domain/game/GameSession';
import { STATUS_LABEL } from '../../domain/entity/StatusEffect';
import { FONT, HUD_HEIGHT, LOG_HEIGHT, LOG_LINES } from './RenderConfig';
import { TACTIC_LABEL } from '../../domain/game/Tactic';

const PARTY_WIDTH = 340;

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
    const debt = session.shops.debtOf(p);
    if (debt > 0) {
      g.fillStyle = '#f97316';
      g.fillText(`未払い ${debt}G`, 850, y);
    }
    g.textAlign = 'right';
    g.fillStyle = '#6b7280';
    g.fillText('[?] 操作方法  [I] 持ち物  [M] 図鑑', width - 12, y);
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
    g.save();
    g.beginPath();
    g.rect(0, top, width - PARTY_WIDTH - 8, LOG_HEIGHT);
    g.clip();
    lines.forEach((line, i) => {
      const age = lines.length - 1 - i;
      g.fillStyle = age === 0 ? '#f8f0dc' : `rgba(220,205,180,${0.85 - age * 0.18})`;
      g.fillText(line, 14, top + 8 + i * 20);
    });
    g.restore();
    this.drawParty(g, session, width - PARTY_WIDTH, top, PARTY_WIDTH, LOG_HEIGHT);
  }

  /** 仲間の一覧と作戦（ログ右側） */
  private drawParty(g: CanvasRenderingContext2D, session: GameSession, x: number, y: number, w: number, h: number): void {
    const st = session.state;
    g.fillStyle = '#4b3f5c';
    g.fillRect(x, y, 1, h);
    g.font = `bold 12px ${FONT}`;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = '#9c8f78';
    g.fillText('仲間', x + 12, y + 8);
    g.fillStyle = '#c9a961';
    g.fillText(`作戦: ${TACTIC_LABEL[st.tactic]}  [T]`, x + 60, y + 8);
    if (st.allies.length === 0) {
      g.fillStyle = '#6b7280';
      g.font = `12px ${FONT}`;
      g.fillText('（いない）', x + 12, y + 30);
      return;
    }
    st.allies.forEach((a, i) => {
      const ry = y + 28 + i * 20;
      g.fillStyle = a.color;
      g.beginPath();
      g.arc(x + 18, ry + 7, 5, 0, Math.PI * 2);
      g.fill();
      g.font = `12px ${FONT}`;
      g.fillStyle = '#e8dcc0';
      g.fillText(`${a.name} Lv${a.level}`, x + 30, ry);
      const bx = x + 170;
      const bw = 110;
      g.fillStyle = '#2b2233';
      g.fillRect(bx, ry + 3, bw, 9);
      const ratio = a.hp / a.maxHp;
      g.fillStyle = ratio > 0.5 ? '#3fb950' : ratio > 0.25 ? '#d29922' : '#f85149';
      g.fillRect(bx, ry + 3, bw * ratio, 9);
      g.fillStyle = '#9c8f78';
      g.textAlign = 'right';
      g.fillText(`${a.hp}/${a.maxHp}`, x + w - 12, ry);
      g.textAlign = 'left';
    });
  }
}
