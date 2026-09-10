import type { Direction } from '../core/Vec2';
import type { Actor } from '../entity/Actor';
import type { SkillDef } from '../data/skills';

export type AiAction =
  | { readonly type: 'move'; readonly dir: Direction }
  | { readonly type: 'skill'; readonly skill: SkillDef; readonly target: Actor }
  | { readonly type: 'attack'; readonly target: Actor; readonly dir: Direction }
  | { readonly type: 'wait' };
