import { describe, expect, it } from 'vitest';
import { SeededRng } from '../src/domain/core/Rng';
import { DungeonGenerator } from '../src/domain/map/DungeonGenerator';
import { reachableFrom } from '../src/domain/map/Pathfinding';
import { TileType } from '../src/domain/map/Tile';
import { keyOf } from '../src/domain/core/Vec2';

describe('DungeonGenerator', () => {
  it('100 シードすべてで全床タイルが連結し、階段に到達できる', () => {
    const gen = new DungeonGenerator();
    for (let seed = 0; seed < 100; seed++) {
      const map = gen.generate(new SeededRng(seed));
      const walkable = [...map.walkableTiles()];
      expect(walkable.length).toBeGreaterThan(50);
      const start = walkable[0]!;
      const reach = reachableFrom(map, start);
      for (const t of walkable) expect(reach.has(keyOf(t))).toBe(true);
      expect(map.get(map.stairs)).toBe(TileType.Stairs);
      expect(reach.has(keyOf(map.stairs))).toBe(true);
    }
  });

  it('部屋は互いに重ならず、外周は壁', () => {
    const map = new DungeonGenerator().generate(new SeededRng(7));
    expect(map.rooms.length).toBe(6);
    for (let i = 0; i < map.rooms.length; i++) {
      for (let j = i + 1; j < map.rooms.length; j++) {
        expect(map.rooms[i]!.intersects(map.rooms[j]!, 1)).toBe(false);
      }
    }
    for (let x = 0; x < map.width; x++) {
      expect(map.get({ x, y: 0 })).toBe(TileType.Wall);
      expect(map.get({ x, y: map.height - 1 })).toBe(TileType.Wall);
    }
  });

  it('斜め移動は角抜けできない', () => {
    const map = new DungeonGenerator().generate(new SeededRng(3));
    // 通路の入口など、直交どちらかが壁のマスでは斜め不可
    let checked = 0;
    for (const p of map.walkableTiles()) {
      const ne = { x: p.x + 1, y: p.y - 1 };
      if (map.isWalkable(ne) && (!map.isWalkable({ x: p.x + 1, y: p.y }) || !map.isWalkable({ x: p.x, y: p.y - 1 }))) {
        expect(map.canStep(p, 'NE')).toBe(false);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
