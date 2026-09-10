import type { GameSession } from '../../domain/game/GameSession';
import { CATEGORY_LABEL } from '../../domain/item/ItemDef';
import type { ItemInstance } from '../../domain/item/ItemInstance';
import { buildItemActions } from '../ui/ItemActionMenu';
import type { UiMode } from '../ui/UiState';
import { FONT } from './RenderConfig';
import { drawPanel } from './PanelStyle';

/** 持ち物・壺・ヘルプ・ゲームオーバーなどのオーバーレイ描画 */
export class MenuRenderer {
  draw(g: CanvasRenderingContext2D, session: GameSession, mode: UiMode, width: number, height: number): void {
    switch (mode.kind) {
      case 'inventory':
        this.drawInventory(g, session, mode.cursor, undefined);
        break;
      case 'itemActions':
        this.drawInventory(g, session, mode.itemIndex, undefined);
        this.drawItemActions(g, session, mode.itemIndex, mode.cursor);
        break;
      case 'potInsertSelect':
        this.drawInventory(g, session, mode.cursor, `どれを${session.state.player.inventory.at(mode.potIndex)?.def.name ?? '壺'}に入れる？`);
        break;
      case 'potContents':
        this.drawInventory(g, session, mode.potIndex, undefined);
        this.drawPotContents(g, session, mode.potIndex, mode.cursor);
        break;
      case 'help':
        this.drawHelp(g, width, height);
        break;
      case 'explore':
      case 'codex':
        break;
    }
    if (session.state.status !== 'playing') this.drawGameEnd(g, session, width, height);
  }

  private panel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title?: string): void {
    drawPanel(g, x, y, w, h, title);
  }

  private drawInventory(g: CanvasRenderingContext2D, session: GameSession, cursor: number, title: string | undefined): void {
    const p = session.state.player;
    const items = p.inventory.items;
    const x = 40;
    const y = 60;
    const w = 380;
    const h = 40 + Math.max(items.length, 1) * 22 + 24;
    this.panel(g, x, y, w, h, title ?? `持ち物 (${items.length}/${p.inventory.capacity})`);
    g.font = `14px ${FONT}`;
    g.textBaseline = 'top';
    if (items.length === 0) {
      g.fillStyle = '#9ca3af';
      g.fillText('何も持っていない', x + 30, y + 42);
    }
    items.forEach((item, i) => {
      const ly = y + 42 + i * 22;
      const selected = i === cursor;
      if (selected) {
        g.fillStyle = 'rgba(201,169,97,0.18)';
        g.fillRect(x + 10, ly - 3, w - 20, 21);
        g.fillStyle = '#f5deb3';
        g.fillText('▶', x + 14, ly);
      }
      g.fillStyle = selected ? '#fff8e7' : '#d6cbb3';
      g.textAlign = 'left';
      g.fillText(this.itemLabel(item, p.isEquipped(item)), x + 34, ly);
      g.fillStyle = '#8a7f6b';
      g.textAlign = 'right';
      g.fillText(CATEGORY_LABEL[item.def.category], x + w - 18, ly);
      g.textAlign = 'left';
    });
    const sel = items[cursor];
    if (sel) {
      g.fillStyle = '#b7aa8f';
      g.font = `12px ${FONT}`;
      g.fillText(sel.def.description, x + 16, y + h - 22);
    }
  }

  private itemLabel(item: ItemInstance, equipped: boolean): string {
    const tag = item.price !== undefined ? ` 【未払い ${item.price}G】` : '';
    return `${equipped ? '[E] ' : ''}${item.displayName}${tag}`;
  }

  private drawItemActions(g: CanvasRenderingContext2D, session: GameSession, itemIndex: number, cursor: number): void {
    const p = session.state.player;
    const item = p.inventory.at(itemIndex);
    if (!item) return;
    const st = session.state;
    const canSell = st.shop?.keeper !== undefined && session.shops.isInShop(st, p.pos);
    const actions = buildItemActions(item, p, canSell);
    const x = 440;
    const y = 60 + itemIndex * 22;
    const w = 150;
    const h = 20 + actions.length * 22;
    this.panel(g, x, y, w, h);
    g.font = `14px ${FONT}`;
    g.textBaseline = 'top';
    g.textAlign = 'left';
    actions.forEach((a, i) => {
      const ly = y + 12 + i * 22;
      if (i === cursor) {
        g.fillStyle = 'rgba(201,169,97,0.18)';
        g.fillRect(x + 10, ly - 3, w - 20, 21);
        g.fillStyle = '#f5deb3';
        g.fillText('▶', x + 14, ly);
      }
      g.fillStyle = i === cursor ? '#fff8e7' : '#d6cbb3';
      g.fillText(a.label, x + 34, ly);
    });
  }

  private drawPotContents(g: CanvasRenderingContext2D, session: GameSession, potIndex: number, cursor: number): void {
    const pot = session.state.player.inventory.at(potIndex);
    if (!pot) return;
    const x = 440;
    const y = 60;
    const w = 300;
    const h = 40 + Math.max(pot.contents.length, 1) * 22 + 12;
    this.panel(g, x, y, w, h, `${pot.def.name}の中身`);
    g.font = `14px ${FONT}`;
    g.textBaseline = 'top';
    g.textAlign = 'left';
    if (pot.brewing) {
      g.fillStyle = '#c084fc';
      g.fillText(`調合中… あと ${pot.brewing.remaining} ターン`, x + 30, y + 42);
      return;
    }
    if (pot.contents.length === 0) {
      g.fillStyle = '#9ca3af';
      g.fillText('空っぽだ', x + 30, y + 42);
    }
    pot.contents.forEach((item, i) => {
      const ly = y + 42 + i * 22;
      if (i === cursor) {
        g.fillStyle = 'rgba(201,169,97,0.18)';
        g.fillRect(x + 10, ly - 3, w - 20, 21);
        g.fillStyle = '#f5deb3';
        g.fillText('▶', x + 14, ly);
      }
      g.fillStyle = i === cursor ? '#fff8e7' : '#d6cbb3';
      g.fillText(item.displayName, x + 34, ly);
    });
  }

  private drawHelp(g: CanvasRenderingContext2D, width: number, height: number): void {
    const lines = [
      '移動      : 矢印 / WASD（直交）  Q E Z C（斜め）  テンキー可',
      '足踏み    : . または Space',
      '拾う      : , または G（移動時は自動で拾う）',
      '階段を降りる: 階段の上で Enter',
      '持ち物    : I または Tab  → Enter で「使う／装備／投げる／置く／壺」',
      '投げる・杖: 最後に移動した向きへ飛ぶ',
      '壺        : 「入れる」で他の持ち物を選択、「出す」で中身を取り出す',
      '錬金の壺  : レシピ通りの素材を入れると、時間経過で新しいアイテムに',
      '仲間      : 倒した魔物がときどき仲間になり、追従して戦う',
      '店        : 値札付きの品を拾って店主（ガーゴイル）にぶつかると支払い。店内では「売る」',
      '            未払いのまま店を出ると「どろぼう」でガーゴイルが襲ってくる',
      'リレミト  : リレミトの巻物を読むと拠点に帰還できる（持ち物は持ち帰れる）',
      '図鑑      : M キー',
      'リプレイ  : P で記録をクリップボードへコピー、O で読み込み',
      '',
      'なにかキーを押すと閉じる',
    ];
    const w = 640;
    const h = 60 + lines.length * 24;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    this.panel(g, x, y, w, h, '操作方法');
    g.font = `14px ${FONT}`;
    g.fillStyle = '#e8dcc0';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, x + 24, y + 44 + i * 24));
  }

  private drawGameEnd(g: CanvasRenderingContext2D, session: GameSession, width: number, height: number): void {
    const status = session.state.status;
    const won = status === 'won';
    const p = session.state.player;
    g.fillStyle = 'rgba(0,0,0,0.65)';
    g.fillRect(0, 0, width, height);
    const w = 480;
    const h = 200;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    this.panel(g, x, y, w, h);
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `bold 28px ${FONT}`;
    g.fillStyle = won ? '#fbbf24' : status === 'escaped' ? '#7dd3fc' : '#f85149';
    g.fillText(won ? 'ダンジョン踏破！' : status === 'escaped' ? 'リレミトで脱出した！' : 'ヤンガスは倒れた…', x + w / 2, y + 30);
    g.font = `15px ${FONT}`;
    g.fillStyle = '#e8dcc0';
    g.fillText(`${session.state.floor}F  Lv ${p.level}  ${p.gold} G  ${session.state.turn} ターン`, x + w / 2, y + 85);
    g.fillStyle = '#9ca3af';
    g.fillText(status === 'dead' ? '持ち物とゴールドを失った… なにかキーで拠点へ' : 'なにかキーで拠点へ戻る', x + w / 2, y + 140);
  }
}
