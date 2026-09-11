/** 2次元整数座標（イミュータブル） */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const addVec = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const eqVec = (a: Vec2, b: Vec2): boolean => a.x === b.x && a.y === b.y;
/** チェビシェフ距離（8方向移動での最短手数） */
export const chebyshev = (a: Vec2, b: Vec2): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const keyOf = (p: Vec2): string => `${p.x},${p.y}`;

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export const DIRECTIONS: readonly Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const DIR_VEC: Readonly<Record<Direction, Vec2>> = {
  N: vec(0, -1),
  NE: vec(1, -1),
  E: vec(1, 0),
  SE: vec(1, 1),
  S: vec(0, 1),
  SW: vec(-1, 1),
  W: vec(-1, 0),
  NW: vec(-1, -1),
};

export const isDiagonal = (d: Direction): boolean => d.length === 2;

/** 差分ベクトル(-1..1)から方向を求める。ゼロベクトルは undefined */
export function dirFromDelta(dx: number, dy: number): Direction | undefined {
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  for (const d of DIRECTIONS) {
    const v = DIR_VEC[d];
    if (v.x === sx && v.y === sy) return d;
  }
  return undefined;
}
