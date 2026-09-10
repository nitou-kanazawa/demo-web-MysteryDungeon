import type { Codex } from '../../domain/game/Codex';
import { ITEM_DEFS, ITEM_MAP } from '../../domain/data/items';
import { ALL_MONSTER_DEFS } from '../../domain/data/monsters';
import { RECIPES } from '../../domain/data/recipes';
import { CATEGORY_LABEL } from '../../domain/item/ItemDef';
import { CODEX_TABS, CODEX_TAB_LABEL, type CodexView } from '../ui/CodexView';
import { SKILL_MAP } from '../../domain/data/skills';
import { BREED_RECIPES } from '../../domain/data/breeding';
import { FONT } from './RenderConfig';
import { drawPanel } from './PanelStyle';

/** 図鑑画面。未発見の項目は ??? で表示する */
export class CodexRenderer {
  draw(g: CanvasRenderingContext2D, codex: Codex, view: CodexView, width: number, height: number): void {
    const w = Math.min(900, width - 40);
    const h = Math.min(560, height - 40);
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    drawPanel(g, x, y, w, h, '図鑑');

    // タブ
    g.font = `bold 14px ${FONT}`;
    g.textBaseline = 'top';
    g.textAlign = 'left';
    let tx = x + 120;
    for (const tab of CODEX_TABS) {
      const active = tab === view.tab;
      const label = `${CODEX_TAB_LABEL[tab]} ${this.countLabel(codex, tab)}`;
      const tw = g.measureText(label).width + 20;
      if (active) {
        g.fillStyle = 'rgba(201,169,97,0.25)';
        g.fillRect(tx, y + 8, tw, 24);
      }
      g.fillStyle = active ? '#fff8e7' : '#8a7f6b';
      g.fillText(label, tx + 10, y + 12);
      tx += tw + 8;
    }
    g.fillStyle = '#6b7280';
    g.font = `12px ${FONT}`;
    g.textAlign = 'right';
    g.fillText('← → タブ  ↑ ↓ 選択  Esc 閉じる', x + w - 16, y + 14);

    const listX = x + 16;
    const listY = y + 48;
    const listW = 300;
    const rowH = 20;
    const maxRows = Math.floor((h - 64) / rowH);
    const entries = this.entries(codex, view);
    const start = Math.max(0, Math.min(view.cursor - Math.floor(maxRows / 2), entries.length - maxRows));
    g.font = `14px ${FONT}`;
    g.textAlign = 'left';
    for (let i = start; i < Math.min(entries.length, start + maxRows); i++) {
      const e = entries[i]!;
      const ry = listY + (i - start) * rowH;
      if (i === view.cursor) {
        g.fillStyle = 'rgba(201,169,97,0.18)';
        g.fillRect(listX, ry - 2, listW, rowH);
        g.fillStyle = '#f5deb3';
        g.fillText('▶', listX + 4, ry);
      }
      g.fillStyle = e.known ? (i === view.cursor ? '#fff8e7' : '#d6cbb3') : '#5b5566';
      g.fillText(`${String(i + 1).padStart(2, '0')}  ${e.known ? e.name : '？？？'}`, listX + 24, ry);
    }

    // 詳細
    const dx = x + listW + 40;
    const dy = listY;
    g.strokeStyle = 'rgba(201,169,97,0.3)';
    g.beginPath();
    g.moveTo(dx - 16, dy);
    g.lineTo(dx - 16, y + h - 16);
    g.stroke();
    const sel = entries[view.cursor];
    if (!sel) return;
    if (!sel.known) {
      g.fillStyle = '#8a7f6b';
      g.fillText('まだ発見していない。', dx, dy);
      return;
    }
    g.font = `bold 18px ${FONT}`;
    g.fillStyle = '#f5deb3';
    g.fillText(sel.name, dx, dy);
    g.font = `14px ${FONT}`;
    g.fillStyle = '#e8dcc0';
    sel.lines.forEach((l, i) => g.fillText(l, dx, dy + 34 + i * 22));
  }

  private countLabel(codex: Codex, tab: CodexView['tab']): string {
    switch (tab) {
      case 'monsters':
        return `${codex.monsters.size}/${ALL_MONSTER_DEFS.length}`;
      case 'items':
        return `${codex.items.size}/${ITEM_DEFS.filter((d) => d.category !== 'gold').length}`;
      case 'recipes':
        return `${codex.recipes.size}/${RECIPES.length}`;
    }
  }

  private entries(codex: Codex, view: CodexView): Array<{ name: string; known: boolean; lines: string[] }> {
    switch (view.tab) {
      case 'monsters':
        return ALL_MONSTER_DEFS.map((m) => ({
          name: m.name,
          known: codex.monsters.has(m.id),
          lines: [
            `HP ${m.hp}  攻撃 ${m.atk}  防御 ${m.def}  経験値 ${m.exp}`,
            m.maxFloor > 0 ? `出現階: ${m.minFloor}F〜${m.maxFloor}F` : m.id === 'gargoyle' ? '出現階: 店の番人（配合でも生まれる）' : '出現階: 配合でのみ生まれる',
            `行動回数: ${m.speed}/ターン`,
            m.recruitChance > 0 ? `仲間になる確率: ${Math.round(m.recruitChance * 100)}%` : '倒しても仲間にならない',
            `特技: ${m.skills.length > 0 ? m.skills.map((s) => `${SKILL_MAP.get(s.id)?.name ?? s.id}(Lv${s.level})`).join('、') : 'なし'}`,
            ...BREED_RECIPES.filter((r) => r.child === m.id).map(
              (r) => `配合: ${r.parents.map((p) => ALL_MONSTER_DEFS.find((d) => d.id === p)?.name ?? p).join(' × ')}`,
            ),
          ],
        }));
      case 'items':
        return ITEM_DEFS.filter((d) => d.category !== 'gold').map((d) => ({
          name: d.name,
          known: codex.items.has(d.id),
          lines: [
            `種類: ${CATEGORY_LABEL[d.category]}`,
            `買値: ${d.price}G  売値: ${Math.floor(d.price / 2)}G`,
            d.description,
          ],
        }));
      case 'recipes':
        return RECIPES.map((r) => {
          const out = ITEM_MAP.get(r.output);
          const known = codex.recipes.has(r.id);
          return {
            name: out?.name ?? r.output,
            known,
            lines: [
              `素材: ${r.inputs.map((i) => ITEM_MAP.get(i)?.name ?? i).join(' + ')}`,
              `完成まで: ${r.turns} ターン`,
              out?.description ?? '',
            ],
          };
        });
    }
  }
}
