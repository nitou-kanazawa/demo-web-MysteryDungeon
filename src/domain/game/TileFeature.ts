import type { Direction, Vec2 } from '../core/Vec2';

export type TrapKind = 'pitfall' | 'mine' | 'sleepGas' | 'warp' | 'rust' | 'summon';

export const TRAP_LABEL: Readonly<Record<TrapKind, string>> = {
  pitfall: '落とし穴',
  mine: '地雷',
  sleepGas: '睡眠ガス',
  warp: 'ワープ',
  rust: '錆び',
  summon: 'モンスター召喚',
};

export const TRAP_KINDS: readonly TrapKind[] = ['pitfall', 'mine', 'sleepGas', 'warp', 'rust', 'summon'];

/**
 * マスに付く物。床上アイテムと同じく位置キーで管理する。
 * 罠は hidden の間は描画されず、踏むか見破ると可視化される。
 */
export type TileFeature =
  | { readonly kind: 'trap'; readonly trap: TrapKind; hidden: boolean }
  | { readonly kind: 'spring'; readonly dir: Direction }
  | { readonly kind: 'fountain'; readonly effect: 'heal' | 'curse'; uses: number }
  | { readonly kind: 'sign'; readonly text: string }
  /** 押せる岩。水・空に落とすと足場になる（水）／消える（空） */
  | { readonly kind: 'boulder' }
  /** 崩落予告のひび */
  | { readonly kind: 'crack' }
  /** 鍵のかかった扉。カギを持って体当たりすると開く。歩行・投擲不可 */
  | { readonly kind: 'door' }
  /** 格子。スイッチで開く。歩行・投擲不可 */
  | { readonly kind: 'gate' }
  /** スイッチ。踏むと targets を開通させる（bridge: 通路化、gate: 格子を消す） */
  | { readonly kind: 'switch'; readonly targets: readonly Vec2[]; readonly mode: 'bridge' | 'gate'; active: boolean }
  /** 檻。中に仲間候補が囚われている。カギで開けると加入 */
  | { readonly kind: 'cage'; readonly defId: string }
  /** 転がる岩（RollingRockEvent が動かす）。乗ると痛い */
  | { readonly kind: 'rock' };

/** アクターの進入を阻む物 */
export const blocksMovement = (f: TileFeature | undefined): boolean =>
  f !== undefined && (f.kind === 'boulder' || f.kind === 'door' || f.kind === 'gate' || f.kind === 'cage' || f.kind === 'rock');

/** 投擲物・魔法弾・ブレスを遮る物 */
export const blocksProjectileFeature = (f: TileFeature | undefined): boolean =>
  f !== undefined && (f.kind === 'boulder' || f.kind === 'door' || f.kind === 'gate' || f.kind === 'cage' || f.kind === 'rock');

export const featureLabel = (f: TileFeature): string => {
  switch (f.kind) {
    case 'trap':
      return `${TRAP_LABEL[f.trap]}の罠`;
    case 'spring':
      return '跳ね床';
    case 'fountain':
      return f.effect === 'heal' ? '回復の泉' : '呪いの泉';
    case 'sign':
      return '石碑';
    case 'boulder':
      return '岩';
    case 'crack':
      return 'ひび';
    case 'door':
      return '鍵のかかった扉';
    case 'gate':
      return '格子';
    case 'switch':
      return f.active ? 'スイッチ（作動済み）' : 'スイッチ';
    case 'cage':
      return '檻';
    case 'rock':
      return '転がる岩';
  }
};
