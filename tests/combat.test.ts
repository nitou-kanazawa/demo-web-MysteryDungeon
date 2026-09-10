import { describe, expect, it } from 'vitest';
import { SeededRng } from '../src/domain/core/Rng';
import { calcDamage } from '../src/domain/game/Combat';
import { Player, expToNextLevel } from '../src/domain/entity/Player';

describe('calcDamage', () => {
  it('攻撃力 - 防御力/2 に ±12.5% の範囲で、最低 1', () => {
    const rng = new SeededRng(5);
    for (let i = 0; i < 500; i++) {
      const d = calcDamage(10, 4, rng);
      expect(d).toBeGreaterThanOrEqual(7);
      expect(d).toBeLessThanOrEqual(9);
    }
    expect(calcDamage(1, 100, rng)).toBe(1);
  });
});

describe('Player', () => {
  it('経験値でレベルアップし、ステータスが上がる', () => {
    const p = new Player(1, { x: 0, y: 0 });
    const before = { hp: p.maxHp, atk: p.atk, def: p.def };
    const ups = p.gainExp(expToNextLevel(1) + expToNextLevel(2));
    expect(ups).toBe(2);
    expect(p.level).toBe(3);
    expect(p.maxHp).toBe(before.hp + 8);
    expect(p.atk).toBe(before.atk + 4);
    expect(p.def).toBe(before.def + 2);
  });
});
