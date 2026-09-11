import { describe, expect, it } from 'vitest';
import { ALL_MONSTER_DEFS, MONSTER_MAP } from '../src/domain/data/monsters';
import { BREED_RECIPES, FAMILY_RECIPES, resolveBreedChild } from '../src/domain/data/breeding';
import { HomeBase } from '../src/domain/base/HomeBase';
import { SKILL_MAP } from '../src/domain/data/skills';

const def = (id: string) => MONSTER_MAP.get(id)!;

describe('系統配合', () => {
  it('全種族に系統・ランク・存在する特技があり、合計 20 種', () => {
    expect(ALL_MONSTER_DEFS.length).toBe(20);
    for (const m of ALL_MONSTER_DEFS) {
      expect(m.family, m.id).toBeDefined();
      expect(m.rank, m.id).toBeGreaterThan(0);
      for (const s of m.skills) expect(SKILL_MAP.get(s.id), `${m.id}:${s.id}`).toBeDefined();
    }
  });

  it('レシピの子はすべて実在する種族', () => {
    for (const r of BREED_RECIPES) expect(MONSTER_MAP.get(r.child), r.child).toBeDefined();
    for (const r of FAMILY_RECIPES) expect(MONSTER_MAP.get(r.child), r.child).toBeDefined();
  });

  it('種族レシピ → 系統レシピ → ランクの高い方 の優先順で解決する', () => {
    // 種族レシピ（スライム×スライム）は系統レシピより優先
    expect(resolveBreedChild(def('slime'), def('slime'))).toEqual({ child: def('king_slime'), source: 'species' });
    // 系統レシピ（スライム系×ドラゴン系）は順不同
    expect(resolveBreedChild(def('slime'), def('dragon')).child.id).toBe('drago_slime');
    expect(resolveBreedChild(def('dragon'), def('shebeth')).child.id).toBe('drago_slime');
    expect(resolveBreedChild(def('dracky'), def('dragon_kids')).child.id).toBe('wyvern');
    expect(resolveBreedChild(def('gargoyle'), def('ghost')).child.id).toBe('shadow');
    expect(resolveBreedChild(def('golem'), def('metal_dragon')).child.id).toBe('stoneman');
    expect(resolveBreedChild(def('hammerhood'), def('killer_panther')).child.id).toBe('killer_panther');
    // どちらにも無ければランクの高い方
    const r = resolveBreedChild(def('ghost'), def('chimaera'));
    expect(r.source).toBe('fallback');
    expect(r.child.id).toBe('chimaera');
  });

  it('牧場の配合で系統レシピの子が生まれ、メッセージに系統名が入る', () => {
    const b = HomeBase.createNew();
    const snap = (defId: string, level = 3) => ({ defId, level, exp: 0, bonusHp: 0, bonusAtk: 0, bonusDef: 0 });
    b.addAlly(snap('slime'));
    b.addAlly(snap('dragon'));
    const r = b.breed(0, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.defId).toBe('drago_slime');
    expect(r.message).toContain('スライム系×ドラゴン系');
    expect(b.allies.length).toBe(1);
    expect(b.codex.monsters.has('drago_slime')).toBe(true);
  });

  it('配合を重ねて上位種へ到達できる（スライム系→ドラゴスライム→…）', () => {
    const b = HomeBase.createNew();
    const snap = (defId: string) => ({ defId, level: 4, exp: 0, bonusHp: 0, bonusAtk: 0, bonusDef: 0 });
    b.addAlly(snap('dracky'));
    b.addAlly(snap('dragon'));
    const w = b.breed(0, 1); // 鳥×ドラゴン → ライバーン
    expect(w.ok && w.value.defId).toBe('wyvern');
    b.addAlly(snap('dragon'));
    const w2 = b.breed(0, 1); // 鳥(ライバーン)×ドラゴン → ライバーン（系統レシピ）でボーナス継承
    expect(w2.ok && w2.value.defId).toBe('wyvern');
    expect(w2.ok && w2.value.bonusHp).toBeGreaterThan(0);
  });
});
