import type { MonsterDef, MonsterFamily } from '../entity/MonsterDef';
import { MONSTER_MAP } from './monsters';

/** 種族レシピ。parents は順不同 */
export interface BreedRecipe {
  readonly parents: readonly [string, string];
  readonly child: string;
}

/** 系統レシピ。families は順不同 */
export interface FamilyRecipe {
  readonly families: readonly [MonsterFamily, MonsterFamily];
  readonly child: string;
}

export const BREED_RECIPES: readonly BreedRecipe[] = [
  { parents: ['slime', 'slime'], child: 'king_slime' },
  { parents: ['dracky', 'dracky'], child: 'taho_dracky' },
  { parents: ['golem', 'chimaera'], child: 'gargoyle' },
  { parents: ['king_slime', 'dragon'], child: 'metal_dragon' },
];

export const FAMILY_RECIPES: readonly FamilyRecipe[] = [
  { families: ['slime', 'dragon'], child: 'drago_slime' },
  { families: ['slime', 'beast'], child: 'slime_knight' },
  { families: ['bird', 'dragon'], child: 'wyvern' },
  { families: ['bird', 'devil'], child: 'hawkman' },
  { families: ['material', 'material'], child: 'stoneman' },
  { families: ['zombie', 'devil'], child: 'shadow' },
  { families: ['beast', 'beast'], child: 'killer_panther' },
  { families: ['dragon', 'dragon'], child: 'dragon_kids' },
];

const unorderedMatch = <T>(pair: readonly [T, T], a: T, b: T): boolean =>
  (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a);

export function findBreedRecipe(a: string, b: string): BreedRecipe | undefined {
  return BREED_RECIPES.find((r) => unorderedMatch(r.parents, a, b));
}

export function findFamilyRecipe(a: MonsterFamily, b: MonsterFamily): FamilyRecipe | undefined {
  return FAMILY_RECIPES.find((r) => unorderedMatch(r.families, a, b));
}

export type BreedSource = 'species' | 'family' | 'fallback';

/**
 * 配合結果の解決。優先順は 種族レシピ → 系統レシピ → ランクの高い方の種族。
 */
export function resolveBreedChild(a: MonsterDef, b: MonsterDef): { child: MonsterDef; source: BreedSource } {
  const species = findBreedRecipe(a.id, b.id);
  if (species) {
    const def = MONSTER_MAP.get(species.child);
    if (def) return { child: def, source: 'species' };
  }
  const family = findFamilyRecipe(a.family, b.family);
  if (family) {
    const def = MONSTER_MAP.get(family.child);
    if (def) return { child: def, source: 'family' };
  }
  return { child: a.rank >= b.rank ? a : b, source: 'fallback' };
}
