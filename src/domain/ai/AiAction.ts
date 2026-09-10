import type { Direction } from '../core/Vec2';
import type { Actor } from '../entity/Actor';

export type AiAction =
  | { readonly type: 'move'; readonly dir: Direction }
  | { readonly type: 'attack'; readonly target: Actor; readonly dir: Direction }
  | { readonly type: 'wait' };
