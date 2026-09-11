import type { IRng } from '../core/Rng';
import type { Vec2 } from '../core/Vec2';
import { DungeonMap } from './DungeonMap';
import { Room } from './Room';
import { TileType } from './Tile';

/** フロアの形。FloorBuilder が階層・テーマ・乱数から選ぶ */
export type DungeonLayout = 'sectors' | 'town' | 'maze' | 'bigRoom';

export interface GeneratorConfig {
  readonly width: number;
  readonly height: number;
  /** マップを横に何分割するか */
  readonly cols: number;
  /** マップを縦に何分割するか */
  readonly rows: number;
  readonly minRoomSize: number;
  /** 分割セルの端から部屋までの最小余白（通路用に 2 以上） */
  readonly margin: number;
  /** 全域木に追加する余分な接続数（ループを作る） */
  readonly extraConnections: number;
}

export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  width: 48,
  height: 24,
  cols: 3,
  rows: 2,
  minRoomSize: 4,
  margin: 2,
  extraConnections: 1,
};

/** 廃墟の街: 小部屋が多く、路地でつながる */
export const TOWN_GENERATOR_CONFIG: GeneratorConfig = {
  width: 48,
  height: 24,
  cols: 4,
  rows: 3,
  minRoomSize: 3,
  margin: 2,
  extraConnections: 3,
};

interface Sector {
  readonly col: number;
  readonly row: number;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number; // exclusive
  readonly y1: number; // exclusive
  room: Room;
}

/** 掘った通路の記録。extra は全域木に足した余分な接続（塞いでも連結が保たれる） */
export interface CorridorInfo {
  readonly a: Room;
  readonly b: Room;
  readonly tiles: readonly Vec2[];
  readonly extra: boolean;
}

/**
 * セクター分割式ダンジョン生成（風来のシレン系の定番手法）。
 * 1. マップを cols×rows のセクターに分割し、各セクターに部屋を1つ配置
 * 2. 隣接セクター間を辺として、ランダム全域木 + 追加辺で接続
 * 3. 各辺をL字通路で掘る
 * 4. 階段を配置
 *
 * layout で迷路・大部屋も生成できる。
 */
export class DungeonGenerator {
  constructor(private readonly config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG) {}

  generate(rng: IRng, solid: TileType = TileType.Wall, layout: DungeonLayout = 'sectors'): DungeonMap {
    switch (layout) {
      case 'maze':
        return this.generateMaze(rng, solid);
      case 'bigRoom':
        return this.generateBigRoom(rng, solid);
      case 'town':
        return new DungeonGenerator({ ...TOWN_GENERATOR_CONFIG, width: this.config.width, height: this.config.height }).generateSectors(rng, solid);
      default:
        return this.generateSectors(rng, solid);
    }
  }

  private generateSectors(rng: IRng, solid: TileType): DungeonMap {
    const { width, height } = this.config;
    const map = new DungeonMap(width, height, solid);
    const sectors = this.createSectors(rng);

    for (const s of sectors) {
      map.rooms.push(s.room);
      for (const t of s.room.tiles()) map.set(t, TileType.Floor);
    }

    const { chosen, unused } = this.chooseConnections(sectors, rng);
    for (const { edge, extra } of chosen) {
      const tiles = this.planCorridor(edge[0], edge[1], rng);
      for (const t of tiles) this.carveTile(map, t);
      map.corridors.push({ a: edge[0].room, b: edge[1].room, tiles, extra });
    }
    // 使わなかった接続の経路を残す（スイッチで架かる橋の候補）
    for (const [a, b] of unused) {
      const tiles = this.planCorridor(a, b, rng).filter((t) => map.get(t) === solid);
      if (tiles.length > 0) map.unusedPaths.push(tiles);
    }

    const stairsRoom = rng.pick(map.rooms);
    map.set(this.randomTileIn(stairsRoom, rng), TileType.Stairs);
    return map;
  }

  /**
   * 迷路: 奇数座標のセルを再帰的バックトラックで掘る。
   * 5 つの 3×3 の広間を部屋として登録し、開始・階段・敵の湧きに使う。
   */
  private generateMaze(rng: IRng, solid: TileType): DungeonMap {
    const { width, height } = this.config;
    const map = new DungeonMap(width, height, solid);
    const cellsX = Math.floor((width - 1) / 2);
    const cellsY = Math.floor((height - 1) / 2);
    const visited = new Set<string>();
    const cellPos = (cx: number, cy: number): Vec2 => ({ x: cx * 2 + 1, y: cy * 2 + 1 });
    const key = (cx: number, cy: number): string => `${cx},${cy}`;
    const start = { cx: rng.int(0, cellsX - 1), cy: rng.int(0, cellsY - 1) };
    const stack = [start];
    visited.add(key(start.cx, start.cy));
    map.set(cellPos(start.cx, start.cy), TileType.Corridor);
    while (stack.length > 0) {
      const cur = stack[stack.length - 1] as { cx: number; cy: number };
      const neighbors = (
        [
          { cx: cur.cx + 1, cy: cur.cy },
          { cx: cur.cx - 1, cy: cur.cy },
          { cx: cur.cx, cy: cur.cy + 1 },
          { cx: cur.cx, cy: cur.cy - 1 },
        ] as const
      ).filter((n) => n.cx >= 0 && n.cy >= 0 && n.cx < cellsX && n.cy < cellsY && !visited.has(key(n.cx, n.cy)));
      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }
      const next = rng.pick(neighbors);
      visited.add(key(next.cx, next.cy));
      const a = cellPos(cur.cx, cur.cy);
      const b = cellPos(next.cx, next.cy);
      map.set({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, TileType.Corridor);
      map.set(b, TileType.Corridor);
      stack.push(next);
    }
    // 迷路の壁をところどころ抜いてループを作る（行き止まりだらけを防ぐ）
    for (let i = 0; i < 12; i++) {
      const x = rng.int(1, width - 2);
      const y = rng.int(1, height - 2);
      const p = { x, y };
      if (map.get(p) !== solid) continue;
      const h = map.get({ x: x - 1, y }) === TileType.Corridor && map.get({ x: x + 1, y }) === TileType.Corridor;
      const v = map.get({ x, y: y - 1 }) === TileType.Corridor && map.get({ x, y: y + 1 }) === TileType.Corridor;
      if (h || v) map.set(p, TileType.Corridor);
    }
    // 広間: 3×3 を床にして部屋として登録（重ならないように離す）
    const chambers: Room[] = [];
    for (let attempt = 0; attempt < 200 && chambers.length < 5; attempt++) {
      const cx = rng.int(1, cellsX - 2);
      const cy = rng.int(1, cellsY - 2);
      const c = cellPos(cx, cy);
      const room = new Room(c.x - 1, c.y - 1, 3, 3);
      if (chambers.some((r) => r.intersects(room, 3))) continue;
      chambers.push(room);
      map.rooms.push(room);
      for (const t of room.tiles()) map.set(t, TileType.Floor);
    }
    const stairsRoom = rng.pick(map.rooms);
    map.set(stairsRoom.center, TileType.Stairs);
    return map;
  }

  /** 大部屋: 外周 1 マスだけ残した 1 部屋。階段は角に置く */
  private generateBigRoom(rng: IRng, solid: TileType): DungeonMap {
    const { width, height } = this.config;
    const map = new DungeonMap(width, height, solid);
    const room = new Room(1, 1, width - 2, height - 2);
    map.rooms.push(room);
    for (const t of room.tiles()) map.set(t, TileType.Floor);
    const corners: Vec2[] = [
      { x: room.x + 1, y: room.y + 1 },
      { x: room.right - 1, y: room.y + 1 },
      { x: room.x + 1, y: room.bottom - 1 },
      { x: room.right - 1, y: room.bottom - 1 },
    ];
    map.set(rng.pick(corners), TileType.Stairs);
    return map;
  }

  private createSectors(rng: IRng): Sector[] {
    const { width, height, cols, rows, minRoomSize, margin } = this.config;
    const sw = Math.floor(width / cols);
    const sh = Math.floor(height / rows);
    const sectors: Sector[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x0 = col * sw;
        const y0 = row * sh;
        const x1 = col === cols - 1 ? width : x0 + sw;
        const y1 = row === rows - 1 ? height : y0 + sh;
        const maxW = x1 - x0 - margin * 2;
        const maxH = y1 - y0 - margin * 2;
        const w = rng.int(Math.min(minRoomSize, maxW), maxW);
        const h = rng.int(Math.min(minRoomSize, maxH), maxH);
        const x = rng.int(x0 + margin, x1 - margin - w);
        const y = rng.int(y0 + margin, y1 - margin - h);
        sectors.push({ col, row, x0, y0, x1, y1, room: new Room(x, y, w, h) });
      }
    }
    return sectors;
  }

  /** 隣接セクターの辺からランダム全域木を作り、追加辺を足す（Kruskal + Union-Find） */
  private chooseConnections(
    sectors: Sector[],
    rng: IRng,
  ): { chosen: Array<{ edge: [Sector, Sector]; extra: boolean }>; unused: Array<[Sector, Sector]> } {
    const edges: Array<[Sector, Sector]> = [];
    for (const a of sectors) {
      for (const b of sectors) {
        const adjacentH = a.row === b.row && b.col === a.col + 1;
        const adjacentV = a.col === b.col && b.row === a.row + 1;
        if (adjacentH || adjacentV) edges.push([a, b]);
      }
    }
    const shuffled = rng.shuffle(edges);
    const parent = new Map<Sector, Sector>();
    const find = (s: Sector): Sector => {
      const p = parent.get(s);
      if (!p || p === s) return s;
      const root = find(p);
      parent.set(s, root);
      return root;
    };
    const chosen: Array<{ edge: [Sector, Sector]; extra: boolean }> = [];
    const rest: Array<[Sector, Sector]> = [];
    for (const e of shuffled) {
      const ra = find(e[0]);
      const rb = find(e[1]);
      if (ra !== rb) {
        parent.set(ra, rb);
        chosen.push({ edge: e, extra: false });
      } else {
        rest.push(e);
      }
    }
    const extras = Math.min(this.config.extraConnections, rest.length);
    for (let i = 0; i < extras; i++) chosen.push({ edge: rest[i] as [Sector, Sector], extra: true });
    return { chosen, unused: rest.slice(extras) };
  }

  /** a→b をセクター境界線で折れるL字（コの字）通路として計画する（掘らない） */
  private planCorridor(a: Sector, b: Sector, rng: IRng): Vec2[] {
    const ra = a.room;
    const rb = b.room;
    const tiles: Vec2[] = [];
    if (a.row === b.row) {
      // 横接続: a の右辺 → 境界 x → b の左辺
      const ya = rng.int(ra.y, ra.bottom);
      const yb = rng.int(rb.y, rb.bottom);
      const bx = a.x1 - 1;
      this.lineH(tiles, ra.right + 1, bx, ya);
      this.lineV(tiles, bx, ya, yb);
      this.lineH(tiles, bx, rb.x - 1, yb);
    } else {
      // 縦接続: a の下辺 → 境界 y → b の上辺
      const xa = rng.int(ra.x, ra.right);
      const xb = rng.int(rb.x, rb.right);
      const by = a.y1 - 1;
      this.lineV(tiles, xa, ra.bottom + 1, by);
      this.lineH(tiles, xa, xb, by);
      this.lineV(tiles, xb, by, rb.y - 1);
    }
    // 重複を除く
    const seen = new Set<string>();
    return tiles.filter((t) => {
      const k = `${t.x},${t.y}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  private lineH(out: Vec2[], x0: number, x1: number, y: number): void {
    const [lo, hi] = x0 <= x1 ? [x0, x1] : [x1, x0];
    for (let x = lo; x <= hi; x++) out.push({ x, y });
  }

  private lineV(out: Vec2[], x: number, y0: number, y1: number): void {
    const [lo, hi] = y0 <= y1 ? [y0, y1] : [y1, y0];
    for (let y = lo; y <= hi; y++) out.push({ x, y });
  }

  private carveTile(map: DungeonMap, p: Vec2): void {
    if (map.get(p) === map.solid) map.set(p, TileType.Corridor);
  }

  private randomTileIn(room: Room, rng: IRng): Vec2 {
    return { x: rng.int(room.x, room.right), y: rng.int(room.y, room.bottom) };
  }
}
