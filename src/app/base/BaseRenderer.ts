import type { HomeBase } from '../../domain/base/HomeBase';
import { CodexRenderer } from '../render/CodexRenderer';
import { drawPanel } from '../render/PanelStyle';
import { FONT, hash2 } from '../render/RenderConfig';
import { SpriteArt } from '../render/SpriteArt';
import { BASE_MENU, RANCH_ACTIONS, type BaseMode } from './BaseController';
import { MONSTER_MAP } from '../../domain/data/monsters';
import { SKILL_MAP } from '../../domain/data/skills';
import { Ally } from '../../domain/entity/Ally';

/** 拠点画面（夜の村の広場）。ランタンの光で暖かみを出す */
export class BaseRenderer {
  private readonly sprites = new SpriteArt();
  private readonly codex = new CodexRenderer();
  /** 牧場画面の下に出す通知（BaseController.notice を受け取る） */
  notice = '';

  private partyDefs: Array<{ id: string; glyph: string; color: string }> = [];

  render(g: CanvasRenderingContext2D, base: HomeBase, mode: BaseMode, width: number, height: number, t: number): void {
    this.partyDefs = base.allies
      .filter((a) => a.inParty)
      .map((a) => MONSTER_MAP.get(a.defId))
      .filter((d): d is NonNullable<typeof d> => d !== undefined);
    this.drawScene(g, width, height, t);
    this.drawStatus(g, base, width);
    switch (mode.kind) {
      case 'menu':
        this.drawMenu(g, mode.cursor, width, height);
        break;
      case 'storage':
        this.drawStorage(g, base, mode.side, mode.cursor, width, height);
        break;
      case 'ranch':
        this.drawRanch(g, base, mode.cursor, undefined, undefined, width, height);
        break;
      case 'ranchAction':
        this.drawRanch(g, base, mode.index, mode.cursor, undefined, width, height);
        break;
      case 'breedSelect':
        this.drawRanch(g, base, mode.cursor, undefined, mode.index, width, height);
        break;
      case 'codex':
        this.codex.draw(g, base.codex, mode.view, width, height, t);
        break;
      case 'result':
        this.drawResult(g, mode.message, mode.notes, width, height);
        break;
    }
  }

  /** 牧場: 仲間一覧。actionCursor があればアクション窓、breedFrom があれば配合相手の選択 */
  private drawRanch(
    g: CanvasRenderingContext2D,
    base: HomeBase,
    cursor: number,
    actionCursor: number | undefined,
    breedFrom: number | undefined,
    width: number,
    height: number,
  ): void {
    const w = Math.min(900, width - 40);
    const h = Math.min(540, height - 60);
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    const title =
      breedFrom !== undefined
        ? `配合相手を選ぶ（${MONSTER_MAP.get(base.allies[breedFrom]?.defId ?? '')?.name ?? ''} と）`
        : `牧場 (${base.allies.length}/${base.config.ranchCapacity})  連れて行く: ${base.partyCount}/${base.config.partySize}`;
    drawPanel(g, x, y, w, h, title);
    g.font = `12px ${FONT}`;
    g.fillStyle = '#6b7280';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.fillText('↑ ↓ 選択  Enter 決定  Esc 戻る', x + w - 16, y + 14);

    const listX = x + 16;
    const listY = y + 44;
    const rowH = 26;
    g.textAlign = 'left';
    if (base.allies.length === 0) {
      g.font = `14px ${FONT}`;
      g.fillStyle = '#9ca3af';
      g.fillText('まだ仲間がいない。ダンジョンで倒した魔物が起き上がることがある。', listX + 16, listY + 8);
    }
    base.allies.forEach((a, i) => {
      const def = MONSTER_MAP.get(a.defId);
      const ry = listY + i * rowH;
      const sel = i === cursor;
      if (sel) {
        g.fillStyle = 'rgba(201,169,97,0.18)';
        g.fillRect(listX, ry - 2, w - 32, rowH);
        g.fillStyle = '#f5deb3';
        g.font = `14px ${FONT}`;
        g.fillText('▶', listX + 4, ry + 3);
      }
      if (def) this.sprites.drawCreature(g, def, listX + 36, ry + 8, 0, 0.9);
      g.font = `bold 14px ${FONT}`;
      g.fillStyle = i === breedFrom ? '#f472b6' : sel ? '#fff8e7' : '#d6cbb3';
      g.fillText(`${def?.name ?? a.defId}`, listX + 56, ry + 3);
      g.font = `13px ${FONT}`;
      g.fillStyle = '#b7aa8f';
      const bonus = a.bonusHp + a.bonusAtk + a.bonusDef > 0 ? `  配合+${a.bonusHp}/${a.bonusAtk}/${a.bonusDef}` : '';
      g.fillText(`Lv${a.level}${bonus}`, listX + 200, ry + 4);
      if (def) {
        const hp = Ally.maxHpFor(def, a.level, { hp: a.bonusHp, atk: a.bonusAtk, def: a.bonusDef });
        const atk = def.atk + a.bonusAtk + (a.level - 1) * 2;
        const dfn = def.def + a.bonusDef + Math.floor((a.level - 1) / 2);
        g.fillText(`HP${hp} 攻${atk} 守${dfn}`, listX + 330, ry + 4);
        const skills = def.skills.filter((s) => s.level <= a.level).map((s) => SKILL_MAP.get(s.id)?.name ?? s.id);
        g.fillStyle = '#93c5fd';
        g.fillText(skills.length > 0 ? skills.join('・') : '—', listX + 480, ry + 4);
      }
      if (a.inParty) {
        g.fillStyle = '#7CFC00';
        g.font = `bold 13px ${FONT}`;
        g.textAlign = 'right';
        g.fillText('★ 連れて行く', x + w - 24, ry + 4);
        g.textAlign = 'left';
      }
    });

    if (actionCursor !== undefined) {
      const ax = x + w / 2 - 90;
      const ay = listY + Math.min(cursor, 8) * rowH + 20;
      const aw = 220;
      const ah = 20 + RANCH_ACTIONS.length * 24;
      drawPanel(g, ax, ay, aw, ah);
      g.font = `14px ${FONT}`;
      g.textAlign = 'left';
      RANCH_ACTIONS.forEach((label, i) => {
        const ly = ay + 12 + i * 24;
        if (i === actionCursor) {
          g.fillStyle = 'rgba(201,169,97,0.18)';
          g.fillRect(ax + 10, ly - 3, aw - 20, 22);
          g.fillStyle = '#f5deb3';
          g.fillText('▶', ax + 14, ly);
        }
        g.fillStyle = i === actionCursor ? '#fff8e7' : '#d6cbb3';
        g.fillText(label, ax + 34, ly);
      });
    }
    if (this.notice) {
      g.font = `14px ${FONT}`;
      g.fillStyle = '#fde68a';
      g.textAlign = 'left';
      g.fillText(this.notice, x + 16, y + h - 28);
    }
  }

  private drawScene(g: CanvasRenderingContext2D, width: number, height: number, t: number): void {
    const sky = g.createLinearGradient(0, 0, 0, height * 0.7);
    sky.addColorStop(0, '#05040f');
    sky.addColorStop(1, '#1a1433');
    g.fillStyle = sky;
    g.fillRect(0, 0, width, height);
    // 星
    for (let i = 0; i < 90; i++) {
      const sx = hash2(i, 1) * width;
      const sy = hash2(i, 2) * height * 0.55;
      const tw = 0.5 + Math.sin(t / 700 + i) * 0.4;
      g.fillStyle = `rgba(255,255,230,${0.3 + tw * 0.5})`;
      g.fillRect(sx, sy, hash2(i, 3) < 0.2 ? 2 : 1, hash2(i, 3) < 0.2 ? 2 : 1);
    }
    // 月
    g.fillStyle = '#f3e9c6';
    g.beginPath();
    g.arc(width - 140, 90, 34, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a1433';
    g.beginPath();
    g.arc(width - 152, 80, 30, 0, Math.PI * 2);
    g.fill();
    // 遠景の山
    g.fillStyle = '#0f0c1f';
    g.beginPath();
    g.moveTo(0, height * 0.62);
    for (let x = 0; x <= width; x += 40) g.lineTo(x, height * 0.62 - hash2(x, 9) * 90 - 20);
    g.lineTo(width, height);
    g.lineTo(0, height);
    g.fill();
    // 地面
    const groundY = height * 0.66;
    const ground = g.createLinearGradient(0, groundY, 0, height);
    ground.addColorStop(0, '#2d2418');
    ground.addColorStop(1, '#14100a');
    g.fillStyle = ground;
    g.fillRect(0, groundY, width, height - groundY);
    // 家
    const hx = 120;
    const hy = groundY - 150;
    g.fillStyle = '#3b2c22';
    g.fillRect(hx, hy + 60, 220, 90);
    g.fillStyle = '#5a3a2a';
    g.beginPath();
    g.moveTo(hx - 20, hy + 62);
    g.lineTo(hx + 110, hy - 10);
    g.lineTo(hx + 240, hy + 62);
    g.closePath();
    g.fill();
    g.fillStyle = '#2a1d15';
    g.fillRect(hx + 95, hy + 90, 34, 60);
    const winGlow = 0.75 + Math.sin(t / 400) * 0.1;
    g.fillStyle = `rgba(255,200,110,${winGlow})`;
    g.fillRect(hx + 30, hy + 85, 34, 30);
    g.fillRect(hx + 160, hy + 85, 34, 30);
    // 倉庫の大壺
    const jx = width - 260;
    const jy = groundY - 10;
    g.fillStyle = '#7a4a26';
    g.beginPath();
    g.moveTo(jx - 28, jy - 90);
    g.lineTo(jx + 28, jy - 90);
    g.lineTo(jx + 22, jy - 72);
    g.quadraticCurveTo(jx + 60, jy - 40, jx + 34, jy);
    g.lineTo(jx - 34, jy);
    g.quadraticCurveTo(jx - 60, jy - 40, jx - 22, jy - 72);
    g.closePath();
    g.fill();
    g.strokeStyle = '#3a2213';
    g.lineWidth = 2;
    g.stroke();
    // ランタン
    const lx = width / 2 + 60;
    const ly = groundY - 120;
    g.fillStyle = '#2a2a2a';
    g.fillRect(lx - 3, ly, 6, 120);
    g.fillStyle = '#ffd27a';
    g.fillRect(lx - 8, ly - 18, 16, 20);
    const flicker = 1 + Math.sin(t / 90) * 0.04 + Math.sin(t / 41) * 0.02;
    const glow = g.createRadialGradient(lx, ly - 8, 4, lx, ly - 8, 260 * flicker);
    glow.addColorStop(0, 'rgba(255,190,90,0.55)');
    glow.addColorStop(0.4, 'rgba(255,150,60,0.18)');
    glow.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = glow;
    g.fillRect(lx - 300, ly - 300, 600, 600);
    // 主人公と連れて行く仲間
    this.sprites.drawHeroAt(g, width / 2 - 24, groundY - 48, t, 3);
    this.partyDefs.forEach((def, i) => {
      this.sprites.drawCreature(g, def, width / 2 - 70 - i * 52, groundY - 20, t + i * 300, 1.8);
    });
    // 看板
    g.font = `bold 26px ${FONT}`;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = '#f5deb3';
    g.fillText('拠点 — ポルトの村', 24, 20);
    g.font = `13px ${FONT}`;
    g.fillStyle = '#9c8f78';
    g.fillText('ここから不思議のダンジョンへ出撃する。倒れると持ち物とゴールドを失うが、倉庫と図鑑は残る。', 24, 56);
  }

  private drawStatus(g: CanvasRenderingContext2D, base: HomeBase, width: number): void {
    const w = 260;
    const x = width - w - 24;
    const y = 20;
    drawPanel(g, x, y, w, 172, '戦績');
    g.font = `14px ${FONT}`;
    g.fillStyle = '#e8dcc0';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    const rows = [
      ['ゴールド', `${base.gold} G`],
      ['持ち物', `${base.inventory.length} / ${base.config.inventoryCapacity}`],
      ['倉庫', `${base.storage.length} / ${base.config.storageCapacity}`],
      ['牧場', `${base.allies.length} / ${base.config.ranchCapacity}`],
      ['出撃回数', `${base.sorties}`],
      ['最深到達 / 踏破', `${base.bestFloor}F / ${base.clears}回`],
    ];
    rows.forEach(([k, v], i) => {
      g.fillStyle = '#9c8f78';
      g.fillText(k!, x + 18, y + 40 + i * 21);
      g.fillStyle = '#f5deb3';
      g.textAlign = 'right';
      g.fillText(v!, x + w - 18, y + 40 + i * 21);
      g.textAlign = 'left';
    });
  }

  private drawMenu(g: CanvasRenderingContext2D, cursor: number, width: number, height: number): void {
    const w = 220;
    const h = 40 + BASE_MENU.length * 30;
    const x = 40;
    const y = height - h - 40;
    drawPanel(g, x, y, w, h);
    g.font = `bold 16px ${FONT}`;
    g.textBaseline = 'top';
    g.textAlign = 'left';
    BASE_MENU.forEach((label, i) => {
      const ly = y + 22 + i * 30;
      if (i === cursor) {
        g.fillStyle = 'rgba(201,169,97,0.2)';
        g.fillRect(x + 10, ly - 5, w - 20, 28);
        g.fillStyle = '#f5deb3';
        g.fillText('▶', x + 18, ly);
      }
      g.fillStyle = i === cursor ? '#fff8e7' : '#d6cbb3';
      g.fillText(label, x + 42, ly);
    });
    g.font = `12px ${FONT}`;
    g.fillStyle = '#6b7280';
    g.fillText('↑↓ 選択  Enter 決定  M 図鑑', x, y - 18);
    void width;
  }

  private drawStorage(
    g: CanvasRenderingContext2D,
    base: HomeBase,
    side: 'inventory' | 'storage',
    cursor: number,
    width: number,
    height: number,
  ): void {
    const w = Math.min(860, width - 40);
    const h = Math.min(520, height - 60);
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    drawPanel(g, x, y, w, h, '倉庫');
    g.font = `12px ${FONT}`;
    g.fillStyle = '#6b7280';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.fillText('← → 切替  ↑ ↓ 選択  Enter 移動  Esc 戻る', x + w - 16, y + 14);
    const colW = (w - 48) / 2;
    const cols: Array<['inventory' | 'storage', string, readonly { displayName: string }[]]> = [
      ['inventory', `持ち物 (${base.inventory.length}/${base.config.inventoryCapacity})`, base.inventory],
      ['storage', `倉庫 (${base.storage.length}/${base.config.storageCapacity})`, base.storage],
    ];
    cols.forEach(([key, title, items], ci) => {
      const cx = x + 16 + ci * (colW + 16);
      const cy = y + 44;
      const active = key === side;
      g.fillStyle = active ? 'rgba(201,169,97,0.12)' : 'rgba(255,255,255,0.03)';
      g.fillRect(cx, cy, colW, h - 60);
      g.font = `bold 14px ${FONT}`;
      g.fillStyle = active ? '#f5deb3' : '#8a7f6b';
      g.textAlign = 'left';
      g.fillText(title, cx + 12, cy + 8);
      g.font = `14px ${FONT}`;
      const rowH = 20;
      const maxRows = Math.floor((h - 100) / rowH);
      const start = Math.max(0, Math.min(cursor - Math.floor(maxRows / 2), items.length - maxRows));
      if (items.length === 0) {
        g.fillStyle = '#6b7280';
        g.fillText('（空）', cx + 30, cy + 36);
      }
      for (let i = start; i < Math.min(items.length, start + maxRows); i++) {
        const ry = cy + 36 + (i - start) * rowH;
        const sel = active && i === cursor;
        if (sel) {
          g.fillStyle = 'rgba(201,169,97,0.2)';
          g.fillRect(cx + 6, ry - 2, colW - 12, rowH);
          g.fillStyle = '#f5deb3';
          g.fillText('▶', cx + 10, ry);
        }
        g.fillStyle = sel ? '#fff8e7' : active ? '#d6cbb3' : '#8a7f6b';
        g.fillText(items[i]!.displayName, cx + 30, ry);
      }
    });
  }

  private drawResult(g: CanvasRenderingContext2D, message: string, notes: readonly string[], width: number, height: number): void {
    const w = 600;
    const h = 150 + notes.length * 22;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    drawPanel(g, x, y, w, h, '帰還');
    g.font = `16px ${FONT}`;
    g.fillStyle = '#e8dcc0';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillText(message, x + w / 2, y + 52);
    g.font = `14px ${FONT}`;
    g.fillStyle = '#93c5fd';
    notes.forEach((n, i) => g.fillText(n, x + w / 2, y + 84 + i * 22));
    g.font = `13px ${FONT}`;
    g.fillStyle = '#9c8f78';
    g.fillText('なにかキーを押す', x + w / 2, y + h - 40);
  }
}
