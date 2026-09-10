import { describe, expect, it } from 'vitest';
import { SeededRng } from '../src/domain/core/Rng';

describe('SeededRng', () => {
  it('同じシードなら同じ列を返す（決定論）', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('int は両端を含む範囲を返す', () => {
    const rng = new SeededRng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(1, 3);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect(seen.size).toBe(3);
  });
});
