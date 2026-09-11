import type { HomeBase } from '../../domain/base/HomeBase';
import { BaseShop } from '../../domain/base/BaseShop';
import { MONSTER_MAP } from '../../domain/data/monsters';
import { SKILL_MAP } from '../../domain/data/skills';
import { Ally } from '../../domain/entity/Ally';
import { FAMILY_LABEL } from '../../domain/entity/MonsterDef';
import { CATEGORY_LABEL } from '../../domain/item/ItemDef';
import { CodexRenderer } from '../render/CodexRenderer';
import { drawPanel } from '../render/PanelStyle';
import { FONT, hash2 } from '../render/RenderConfig';
import { SKIN_LABEL, renderSettings } from '../render/RenderSettings';
import { SpriteArt } from '../render/SpriteArt';
import { itemSprite } from '../render/sprites/itemSprites';
import {
  DUNGEON_CONFIRM,
  HOUSE_MENU,
  RANCH_ACTIONS,
  SETTINGS_ITEMS,
  type BaseController,
} from './BaseController';
import { BUILDINGS, GROUND_Y_RATIO, WORLD_WIDTH, type Building } from './BaseWorld';

/** 拠点（横スクロールの村）の描画 */
export class BaseRenderer {
  private readonly sprites = new SpriteArt();
  private readonly codex = new CodexRenderer();
  notice = '';

  render(g: CanvasRenderingContext2D, base: HomeBase, ctrl: BaseController, width: number, height: number, t: number): void {
    const groundY = height * GROUND_Y_RATIO;
    const camX = Math.max(0, Math.min(WORLD_WIDTH - width, ctrl.hero.x - width / 2));
    this.drawSky(g, width, height, t, camX);
    this.drawGround(g, width, height, groundY, camX);
    g.save();
    g.translate(-camX, 0);
    for (const b of BUILDINGS) this.drawBuilding(g, b, base, groundY, t);
    this.drawParty(g, base, ctrl, groundY, t);
    this.sprites.drawHeroAt(g, ctrl.hero.x - 32, groundY - 64, t, 2, ctrl.hero.facing < 0, ctrl.hero.moving);
    g.restore();
    if (ctrl.mode.kind === 'walk') this.drawDoorPrompt(g, ctrl, camX, groundY);
    this.drawStatus(g, base, width);
    this.drawHint(g, ctrl, width, height);

    const mode = ctrl.mode;
    switch (mode.kind) {
      case 'walk':
        break;
      case 'house':
        this.drawSimpleMenu(g, 'ヤンガスの家', [...HOUSE_MENU], mode.cursor, width, height);
        break;
      case 'storage':
        this.drawStorage(g, base, mode.side, mode.cursor, width, height);
        break;
      case 'settings':
        this.drawSettings(g, mode.cursor, width, height);
        break;
      case 'shop':
        this.drawShop(g, base, mode.tab, mode.cursor, width, height);
        break;
      case 'ranch':
        this.drawRanch(g, base, mode.cursor, undefined, undefined, '牧場', width, height);
        break;
      case 'ranchAction':
        this.drawRanch(g, base, mode.index, mode.cursor, undefined, '牧場', width, height);
        break;
      case 'breed':
        this.drawRanch(g, base, mode.cursor, undefined, mode.first, mode.first === undefined ? '配合所 — 1体目を選ぶ' : '配合所 — 相手を選ぶ', width, height);
        break;
      case 'codex':
        this.codex.draw(g, base.codex, mode.view, width, height, t);
        break;
      case 'dungeonConfirm':
        this.drawSimpleMenu(g, 'ダンジョンに出撃する？', [...DUNGEON_CONFIRM], mode.cursor, width, height, `持ち物 ${base.inventory.length}  仲間 ${base.partyCount}体  ${base.gold}G`);
        break;
      case 'result':
        this.drawResult(g, mode.message, mode.notes, width, height);
        break;
    }
  }

  // ---------------------------------------------------------------- 背景

  private drawSky(g: CanvasRenderingContext2D, width: number, height: number, t: number, camX: number): void {
    const sky = g.createLinearGradient(0, 0, 0, height * 0.7);
    sky.addColorStop(0, '#05040f');
    sky.addColorStop(1, '#1a1433');
    g.fillStyle = sky;
    g.fillRect(0, 0, width, height);
    for (let i = 0; i < 120; i++) {
      const sx = ((hash2(i, 1) * WORLD_WIDTH - camX * 0.15) % width + width) % width;
      const sy = hash2(i, 2) * height * 0.55;
      const tw = 0.5 + Math.sin(t / 700 + i) * 0.4;
      g.fillStyle = `rgba(255,255,230,${0.3 + tw * 0.5})`;
      const big = hash2(i, 3) < 0.2;
      g.fillRect(sx, sy, big ? 2 : 1, big ? 2 : 1);
    }
    g.fillStyle = '#f3e9c6';
    g.beginPath();
    g.arc(width - 140 - camX * 0.05, 90, 34, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1a1433';
    g.beginPath();
    g.arc(width - 152 - camX * 0.05, 80, 30, 0, Math.PI * 2);
    g.fill();
    // 遠景の山（視差 0.3）
    g.fillStyle = '#0f0c1f';
    g.beginPath();
    g.moveTo(0, height * 0.62);
    for (let x = 0; x <= width + 40; x += 40) {
      const wx = x + camX * 0.3;
      g.lineTo(x, height * 0.62 - hash2(Math.floor(wx / 40), 9) * 90 - 20);
    }
    g.lineTo(width, height);
    g.lineTo(0, height);
    g.fill();
  }

  private drawGround(g: CanvasRenderingContext2D, width: number, height: number, groundY: number, camX: number): void {
    const ground = g.createLinearGradient(0, groundY, 0, height);
    ground.addColorStop(0, '#2d2418');
    ground.addColorStop(1, '#14100a');
    g.fillStyle = ground;
    g.fillRect(0, groundY, width, height - groundY);
    // 道の石
    g.fillStyle = 'rgba(90,75,55,0.5)';
    for (let i = 0; i < 80; i++) {
      const wx = hash2(i, 21) * WORLD_WIDTH;
      const sx = wx - camX;
      if (sx < -20 || sx > width + 20) continue;
      g.fillRect(sx, groundY + 8 + hash2(i, 22) * 60, 6 + hash2(i, 23) * 10, 3);
    }
  }

  // ---------------------------------------------------------------- 建物

  private drawBuilding(g: CanvasRenderingContext2D, b: Building, base: HomeBase, groundY: number, t: number): void {
    const x = b.x;
    const w = b.width;
    switch (b.id) {
      case 'house': {
        g.fillStyle = '#3b2c22';
        g.fillRect(x, groundY - 110, w, 110);
        g.fillStyle = '#5a3a2a';
        g.beginPath();
        g.moveTo(x - 20, groundY - 108);
        g.lineTo(x + w / 2, groundY - 190);
        g.lineTo(x + w + 20, groundY - 108);
        g.closePath();
        g.fill();
        g.fillStyle = '#2a1d15';
        g.fillRect(b.doorX - 18, groundY - 70, 36, 70);
        const glow = 0.75 + Math.sin(t / 400) * 0.1;
        g.fillStyle = `rgba(255,200,110,${glow})`;
        g.fillRect(x + 30, groundY - 85, 34, 30);
        g.fillRect(x + w - 64, groundY - 85, 34, 30);
        g.fillStyle = '#6b4a3a';
        g.fillRect(x + w - 60, groundY - 175, 18, 50);
        break;
      }
      case 'weapon_shop': {
        g.fillStyle = '#4a3b30';
        g.fillRect(x, groundY - 120, w, 120);
        g.fillStyle = '#6b4a2a';
        g.fillRect(x - 10, groundY - 126, w + 20, 10);
        // ひさし（縞）
        for (let i = 0; i < w / 20; i++) {
          g.fillStyle = i % 2 === 0 ? '#b91c1c' : '#fef3c7';
          g.fillRect(x + i * 20, groundY - 96, 20, 14);
        }
        g.fillStyle = '#2a1d15';
        g.fillRect(b.doorX - 18, groundY - 70, 36, 70);
        g.fillStyle = 'rgba(255,220,150,0.8)';
        g.fillRect(x + 24, groundY - 80, 50, 34);
        // 看板（剣）
        g.fillStyle = '#7c5a3a';
        g.fillRect(b.doorX - 30, groundY - 168, 60, 38);
        this.sprites.drawItemDef(g, BaseShop.defOf('iron_sword'), b.doorX, groundY - 149, 1);
        break;
      }
      case 'ranch': {
        // 柵と納屋
        g.fillStyle = '#7c2d12';
        g.fillRect(x + w - 120, groundY - 100, 120, 100);
        g.fillStyle = '#9a3412';
        g.beginPath();
        g.moveTo(x + w - 130, groundY - 98);
        g.lineTo(x + w - 60, groundY - 150);
        g.lineTo(x + w + 10, groundY - 98);
        g.closePath();
        g.fill();
        g.fillStyle = '#2a1d15';
        g.fillRect(b.doorX - 18, groundY - 70, 36, 70);
        g.fillStyle = '#a16207';
        for (let px = x; px < x + w - 130; px += 28) g.fillRect(px, groundY - 44, 6, 44);
        g.fillRect(x, groundY - 38, w - 130, 5);
        g.fillRect(x, groundY - 20, w - 130, 5);
        // 留守番の仲間が草を食む
        const idle = base.allies.filter((a) => !a.inParty).slice(0, 4);
        idle.forEach((a, i) => {
          const def = MONSTER_MAP.get(a.defId);
          if (def) this.sprites.drawCreature(g, def, x + 30 + i * 46, groundY - 26, t + i * 400, 1.2);
        });
        break;
      }
      case 'breeding': {
        g.fillStyle = '#3b2a4a';
        g.fillRect(x, groundY - 100, w, 100);
        g.fillStyle = '#5b3d7a';
        g.beginPath();
        g.arc(x + w / 2, groundY - 100, w / 2, Math.PI, 0);
        g.fill();
        g.fillStyle = '#2a1d15';
        g.fillRect(b.doorX - 18, groundY - 70, 36, 70);
        const pulse = 0.6 + Math.sin(t / 300) * 0.25;
        g.fillStyle = `rgba(244,114,182,${pulse})`;
        g.beginPath();
        g.arc(x + w / 2, groundY - 130, 14, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = `rgba(147,197,253,${pulse})`;
        g.beginPath();
        g.arc(x + w / 2 + 22, groundY - 118, 9, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case 'library': {
        g.fillStyle = '#4b5563';
        g.fillRect(x, groundY - 110, w, 110);
        g.fillStyle = '#6b7280';
        g.fillRect(x - 10, groundY - 120, w + 20, 12);
        for (let i = 0; i < 4; i++) {
          g.fillStyle = '#9ca3af';
          g.fillRect(x + 20 + i * (w - 40) / 3 - 8, groundY - 108, 16, 108);
        }
        g.fillStyle = '#2a1d15';
        g.fillRect(b.doorX - 18, groundY - 70, 36, 70);
        g.fillStyle = '#f5e6c8';
        g.fillRect(b.doorX - 22, groundY - 158, 44, 30);
        g.fillStyle = '#7c5a3a';
        g.fillRect(b.doorX - 18, groundY - 150, 36, 3);
        g.fillRect(b.doorX - 18, groundY - 142, 36, 3);
        g.fillRect(b.doorX - 18, groundY - 134, 24, 3);
        break;
      }
      case 'dungeon': {
        g.fillStyle = '#2b2436';
        g.beginPath();
        g.moveTo(x - 40, groundY);
        g.lineTo(x + 40, groundY - 170);
        g.lineTo(x + w - 40, groundY - 190);
        g.lineTo(x + w + 60, groundY);
        g.closePath();
        g.fill();
        g.fillStyle = '#0b0910';
        g.beginPath();
        g.ellipse(b.doorX, groundY - 40, 50, 80, 0, Math.PI, 0);
        g.fill();
        g.fillRect(b.doorX - 50, groundY - 40, 100, 40);
        for (const tx of [b.doorX - 70, b.doorX + 70]) {
          g.fillStyle = '#5a3a1a';
          g.fillRect(tx - 3, groundY - 90, 6, 40);
          const f = 1 + Math.sin(t / 80 + tx) * 0.15;
          const glow = g.createRadialGradient(tx, groundY - 96, 2, tx, groundY - 96, 60 * f);
          glow.addColorStop(0, 'rgba(255,190,90,0.7)');
          glow.addColorStop(1, 'rgba(255,120,40,0)');
          g.fillStyle = glow;
          g.fillRect(tx - 70, groundY - 170, 140, 140);
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.ellipse(tx, groundY - 96, 5, 8 * f, 0, 0, Math.PI * 2);
          g.fill();
        }
        break;
      }
    }
    // 看板
    g.font = `bold 13px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const label = b.name;
    const tw = g.measureText(label).width + 20;
    g.fillStyle = '#2a1d15';
    g.fillRect(b.doorX - tw / 2, groundY - 100 - (b.id === 'dungeon' ? 110 : b.id === 'breeding' || b.id === 'library' ? 90 : b.id === 'weapon_shop' ? 110 : b.id === 'ranch' ? 80 : 100), tw, 22);
    g.fillStyle = '#f5deb3';
    g.fillText(label, b.doorX, groundY - 100 - (b.id === 'dungeon' ? 110 : b.id === 'breeding' || b.id === 'library' ? 90 : b.id === 'weapon_shop' ? 110 : b.id === 'ranch' ? 80 : 100) + 11);
  }

  private drawParty(g: CanvasRenderingContext2D, base: HomeBase, ctrl: BaseController, groundY: number, t: number): void {
    const party = base.allies.filter((a) => a.inParty);
    party.forEach((a, i) => {
      const def = MONSTER_MAP.get(a.defId);
      const x = ctrl.partyX[i];
      if (def && x !== undefined) this.sprites.drawCreature(g, def, x, groundY - 30, t + i * 300, 1.8);
    });
  }

  private drawDoorPrompt(g: CanvasRenderingContext2D, ctrl: BaseController, camX: number, groundY: number): void {
    const b = ctrl.nearBuilding;
    if (!b) return;
    const x = ctrl.hero.x - camX;
    const y = groundY - 84 + Math.sin(performance.now() / 300) * 3;
    g.font = `bold 14px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    const text = `▲ ${b.name}：${b.prompt}`;
    const tw = g.measureText(text).width + 24;
    g.fillStyle = 'rgba(12,9,20,0.85)';
    g.fillRect(x - tw / 2, y - 24, tw, 26);
    g.strokeStyle = '#c9a961';
    g.lineWidth = 1;
    g.strokeRect(x - tw / 2 + 0.5, y - 23.5, tw - 1, 25);
    g.fillStyle = '#f5deb3';
    g.fillText(text, x, y - 4);
  }

  private drawHint(g: CanvasRenderingContext2D, ctrl: BaseController, width: number, height: number): void {
    g.font = `12px ${FONT}`;
    g.textAlign = 'left';
    g.textBaseline = 'bottom';
    g.fillStyle = '#9c8f78';
    const hint = ctrl.mode.kind === 'walk' ? '← → 歩く   ↑ / Enter 施設に入る   M 図鑑' : 'Esc 戻る';
    g.fillText(hint, 24, height - 16);
    if (this.notice && ctrl.mode.kind !== 'ranch' && ctrl.mode.kind !== 'breed' && ctrl.mode.kind !== 'shop') {
      g.fillStyle = '#fde68a';
      g.fillText(this.notice, 24, height - 34);
    }
    void width;
  }

  // ---------------------------------------------------------------- 上部ステータス

  private drawStatus(g: CanvasRenderingContext2D, base: HomeBase, width: number): void {
    const w = 260;
    const x = width - w - 24;
    const y = 20;
    drawPanel(g, x, y, w, 172, 'ポルトの村');
    g.font = `14px ${FONT}`;
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
      g.textAlign = 'left';
      g.fillText(k!, x + 18, y + 40 + i * 21);
      g.fillStyle = '#f5deb3';
      g.textAlign = 'right';
      g.fillText(v!, x + w - 18, y + 40 + i * 21);
    });
    g.textAlign = 'left';
  }

  // ---------------------------------------------------------------- メニュー

  private drawSimpleMenu(g: CanvasRenderingContext2D, title: string, items: string[], cursor: number, width: number, height: number, footer?: string): void {
    const w = 360;
    const h = 52 + items.length * 30 + (footer ? 28 : 8);
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    drawPanel(g, x, y, w, h, title);
    g.font = `bold 16px ${FONT}`;
    g.textBaseline = 'top';
    g.textAlign = 'left';
    items.forEach((label, i) => {
      const ly = y + 44 + i * 30;
      if (i === cursor) {
        g.fillStyle = 'rgba(201,169,97,0.2)';
        g.fillRect(x + 10, ly - 5, w - 20, 28);
        g.fillStyle = '#f5deb3';
        g.fillText('▶', x + 18, ly);
      }
      g.fillStyle = i === cursor ? '#fff8e7' : '#d6cbb3';
      g.fillText(label, x + 42, ly);
    });
    if (footer) {
      g.font = `13px ${FONT}`;
      g.fillStyle = '#9c8f78';
      g.fillText(footer, x + 16, y + h - 24);
    }
  }

  private drawSettings(g: CanvasRenderingContext2D, cursor: number, width: number, height: number): void {
    const w = 520;
    const h = 60 + SETTINGS_ITEMS.length * 30 + 120;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    drawPanel(g, x, y, w, h, '設定');
    g.font = `12px ${FONT}`;
    g.fillStyle = '#6b7280';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.fillText('Enter / ← → 切替  Esc 戻る', x + w - 16, y + 14);
    const values = [SKIN_LABEL[renderSettings.skin]];
    SETTINGS_ITEMS.forEach((label, i) => {
      const ly = y + 48 + i * 30;
      const sel = i === cursor;
      if (sel) {
        g.fillStyle = 'rgba(201,169,97,0.18)';
        g.fillRect(x + 10, ly - 5, w - 20, 28);
        g.fillStyle = '#f5deb3';
        g.font = `14px ${FONT}`;
        g.textAlign = 'left';
        g.fillText('▶', x + 18, ly);
      }
      g.font = `bold 15px ${FONT}`;
      g.textAlign = 'left';
      g.fillStyle = sel ? '#fff8e7' : '#d6cbb3';
      g.fillText(label, x + 42, ly);
      g.textAlign = 'right';
      g.fillStyle = '#93c5fd';
      g.fillText(`◀ ${values[i] ?? ''} ▶`, x + w - 24, ly);
    });
    const py = y + h - 60;
    ['slime', 'dracky', 'chimaera', 'dragon'].forEach((id, i) => {
      const def = MONSTER_MAP.get(id);
      if (def) this.sprites.drawCreature(g, def, x + 80 + i * 110, py, 0, 1.4);
    });
    g.font = `12px ${FONT}`;
    g.fillStyle = '#9c8f78';
    g.textAlign = 'left';
    g.fillText('見た目だけの切り替えで、種族・能力・図鑑の記録は変わりません。', x + 16, y + h - 24);
  }

  private drawShop(g: CanvasRenderingContext2D, base: HomeBase, tab: 'buy' | 'sell', cursor: number, width: number, height: number): void {
    const w = Math.min(820, width - 40);
    const h = Math.min(520, height - 60);
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    drawPanel(g, x, y, w, h, `武器屋  所持 ${base.gold}G`);
    g.font = `12px ${FONT}`;
    g.fillStyle = '#6b7280';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.fillText('← → 買う／売る切替  ↑ ↓ 選択  Enter 決定  Esc 出る', x + w - 16, y + 14);
    // タブ
    const tabs: Array<['buy' | 'sell', string]> = [
      ['buy', '買う'],
      ['sell', '売る'],
    ];
    tabs.forEach(([key, label], i) => {
      const tx = x + 16 + i * 90;
      const active = key === tab;
      if (active) {
        g.fillStyle = 'rgba(201,169,97,0.25)';
        g.fillRect(tx, y + 38, 80, 24);
      }
      g.font = `bold 14px ${FONT}`;
      g.textAlign = 'center';
      g.fillStyle = active ? '#fff8e7' : '#8a7f6b';
      g.fillText(label, tx + 40, y + 42);
    });
    const listY = y + 74;
    const rowH = 28;
    g.textAlign = 'left';
    if (tab === 'buy') {
      if (base.shopStock.length === 0) {
        g.font = `14px ${FONT}`;
        g.fillStyle = '#9ca3af';
        g.fillText('売り切れだ。次の出撃のあとに品が入る。', x + 30, listY + 6);
      }
      base.shopStock.forEach((id, i) => {
        const def = BaseShop.defOf(id);
        const ry = listY + i * rowH;
        const sel = i === cursor;
        if (sel) {
          g.fillStyle = 'rgba(201,169,97,0.18)';
          g.fillRect(x + 10, ry - 2, w - 20, rowH);
          g.fillStyle = '#f5deb3';
          g.font = `14px ${FONT}`;
          g.fillText('▶', x + 14, ry + 4);
        }
        this.sprites.drawSprite(g, `item:${def.id}`, itemSprite(def), x + 44, ry + 12, 0.75);
        g.font = `14px ${FONT}`;
        g.fillStyle = sel ? '#fff8e7' : '#d6cbb3';
        g.fillText(def.name, x + 66, ry + 4);
        g.fillStyle = '#8a7f6b';
        g.fillText(CATEGORY_LABEL[def.category], x + 260, ry + 4);
        g.fillStyle = '#b7aa8f';
        g.fillText(def.description, x + 330, ry + 4);
        g.textAlign = 'right';
        g.fillStyle = base.gold >= def.price ? '#fbbf24' : '#f87171';
        g.fillText(`${def.price} G`, x + w - 20, ry + 4);
        g.textAlign = 'left';
      });
    } else {
      if (base.inventory.length === 0) {
        g.font = `14px ${FONT}`;
        g.fillStyle = '#9ca3af';
        g.fillText('売る物がない。', x + 30, listY + 6);
      }
      base.inventory.forEach((item, i) => {
        const ry = listY + i * rowH;
        if (ry > y + h - 60) return;
        const sel = i === cursor;
        if (sel) {
          g.fillStyle = 'rgba(201,169,97,0.18)';
          g.fillRect(x + 10, ry - 2, w - 20, rowH);
          g.fillStyle = '#f5deb3';
          g.font = `14px ${FONT}`;
          g.fillText('▶', x + 14, ry + 4);
        }
        this.sprites.drawSprite(g, `item:${item.def.id}`, itemSprite(item.def), x + 44, ry + 12, 0.75);
        g.font = `14px ${FONT}`;
        g.fillStyle = sel ? '#fff8e7' : '#d6cbb3';
        g.fillText(item.displayName, x + 66, ry + 4);
        g.fillStyle = '#8a7f6b';
        g.fillText(CATEGORY_LABEL[item.def.category], x + 260, ry + 4);
        g.textAlign = 'right';
        g.fillStyle = '#fbbf24';
        g.fillText(`${BaseShop.sellPrice(item.def, item.plus)} G`, x + w - 20, ry + 4);
        g.textAlign = 'left';
      });
    }
    if (this.notice) {
      g.font = `14px ${FONT}`;
      g.fillStyle = '#fde68a';
      g.fillText(this.notice, x + 16, y + h - 28);
    }
  }

  private drawStorage(g: CanvasRenderingContext2D, base: HomeBase, side: 'inventory' | 'storage', cursor: number, width: number, height: number): void {
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

  /** 牧場／配合所の一覧。actionCursor があればアクション窓、breedFrom があれば 1 体目を強調 */
  private drawRanch(
    g: CanvasRenderingContext2D,
    base: HomeBase,
    cursor: number,
    actionCursor: number | undefined,
    breedFrom: number | undefined,
    title: string,
    width: number,
    height: number,
  ): void {
    const w = Math.min(900, width - 40);
    const h = Math.min(540, height - 60);
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    const header = title.startsWith('牧場')
      ? `牧場 (${base.allies.length}/${base.config.ranchCapacity})  連れて行く: ${base.partyCount}/${base.config.partySize}`
      : breedFrom !== undefined
        ? `${title}（${MONSTER_MAP.get(base.allies[breedFrom]?.defId ?? '')?.name ?? ''} と）`
        : title;
    drawPanel(g, x, y, w, h, header);
    g.font = `12px ${FONT}`;
    g.fillStyle = '#6b7280';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.fillText('↑ ↓ 選択  Enter 決定  Esc 戻る', x + w - 16, y + 14);

    const listX = x + 16;
    const listY = y + 44;
    const rowH = 30;
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
      if (def) this.sprites.drawCreature(g, def, listX + 36, ry + 10, 0, 0.7);
      g.font = `bold 14px ${FONT}`;
      g.fillStyle = i === breedFrom ? '#f472b6' : sel ? '#fff8e7' : '#d6cbb3';
      g.fillText(`${def?.name ?? a.defId}`, listX + 56, ry + 3);
      g.font = `11px ${FONT}`;
      g.fillStyle = '#8a7f6b';
      if (def) g.fillText(FAMILY_LABEL[def.family], listX + 56, ry + 18);
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
