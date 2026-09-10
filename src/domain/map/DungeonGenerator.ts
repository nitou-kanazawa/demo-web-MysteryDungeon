import type { IRng } from '../core/Rng';
import type { Vec2 } from '../core/Vec2';
import { DungeonMap } from './DungeonMap';
import { Room } from './Room';
import { TileType } from './Tile';

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

interface Sector {
  readonly col: number;
  readonly row: number;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number; // exclusive
  readonly y1: number; // exclusive
  room: Room;
}

/**
 * セクター分割式ダンジョン生成（風来のシレン系の定番手法）。
 * 1. マップを cols×rows のセクターに分割し、各セクターに部屋を1つ配置
 * 2. 隣接セクター間を辺として、ランダム全域木 + 追加辺で接続
 * 3. 各辺をL字通路で掘る
 * 4. 階段を配置
 */
export class DungeonGenerator {
  constructor(private readonly config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG) {}

  generate(rng: IRng): DungeonMap {
    const { width, height, cols, rows } = this.config;
    const map = new DungeonMap(width, height);
    const sectors = this.createSectors(rng);

    for (const s of sectors) {
      map.rooms.push(s.room);
      for (const t of s.room.tiles()) map.set(t, TileType.Floor);
    }

    for (const [a, b] of this.chooseConnections(sectors, rng)) {
      this.carveCorridor(map, a, b, rng);
    }

    const stairsRoom = rng.pick(map.rooms);
    map.set(this.randomTileIn(stairsRoom, rng), TileType.Stairs);
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
  private chooseConnections(sectors: Sector[], rng: IRng): Array<[Sector, Sector]> {
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
    const chosen: Array<[Sector, Sector]> = [];
    const rest: Array<[Sector, Sector]> = [];
    for (const e of shuffled) {
      const ra = find(e[0]);
      const rb = find(e[1]);
      if (ra !== rb) {
        parent.set(ra, rb);
        chosen.push(e);
      } else {
        rest.push(e);
      }
    }
    for (let i = 0; i < Math.min(this.config.extraConnections, rest.length); i++) {
      chosen.push(rest[i] as [Sector, Sector]);
    }
    return chosen;
  }

  /** a→b をセクター境界線で折れるL字（コの字）通路で接続する */
  private carveCorridor(map: DungeonMap, a: Sector, b: Sector, rng: IRng): void {
    const ra = a.room;
    const rb = b.room;
    if (a.row === b.row) {
      // 横接続: a の右辺 → 境界 x → b の左辺
      const ya = rng.int(ra.y, ra.bottom);
      const yb = rng.int(rb.y, rb.bottom);
      const bx = a.x1 - 1;
      this.carveH(map, ra.right + 1, bx, ya);
      this.carveV(map, bx, ya, yb);
      this.carveH(map, bx, rb.x - 1, yb);
    } else {
      // 縦接続: a の下辺 → 境界 y → b の上辺
      const xa = rng.int(ra.x, ra.right);
      const xb = rng.int(rb.x, rb.right);
      const by = a.y1 - 1;
      this.carveV(map, xa, ra.bottom + 1, by);
      this.carveH(map, xa, xb, by);
      this.carveV(map, xb, by, rb.y - 1);
    }
  }

  private carveH(map: DungeonMap, x0: number, x1: number, y: number): void {
    const [lo, hi] = x0 <= x1 ? [x0, x1] : [x1, x0];
    for (let x = lo; x <= hi; x++) this.carveTile(map, { x, y });
  }

  private carveV(map: DungeonMap, x: number, y0: number, y1: number): void {
    const [lo, hi] = y0 <= y1 ? [y0, y1] : [y1, y0];
    for (let y = lo; y <= hi; y++) this.carveTile(map, { x, y });
  }

  private carveTile(map: DungeonMap, p: Vec2): void {
    if (map.get(p) === TileType.Wall) map.set(p, TileType.Corridor);
  }

  private randomTileIn(room: Room, rng: IRng): Vec2 {
    return { x: rng.int(room.x, room.right), y: rng.int(room.y, room.bottom) };
  }
}
