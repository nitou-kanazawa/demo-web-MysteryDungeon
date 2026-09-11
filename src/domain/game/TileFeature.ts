import type { Direction } from '../core/Vec2';

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
  | { readonly kind: 'sign'; readonly text: string };

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
  }
};
