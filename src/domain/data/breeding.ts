/** 配合レシピ。parents は順不同 */
export interface BreedRecipe {
  readonly parents: readonly [string, string];
  readonly child: string;
}

export const BREED_RECIPES: readonly BreedRecipe[] = [
  { parents: ['slime', 'slime'], child: 'king_slime' },
  { parents: ['dracky', 'dracky'], child: 'taho_dracky' },
  { parents: ['golem', 'chimaera'], child: 'gargoyle' },
  { parents: ['king_slime', 'dragon'], child: 'metal_dragon' },
];

export function findBreedRecipe(a: string, b: string): BreedRecipe | undefined {
  return BREED_RECIPES.find(
    (r) => (r.parents[0] === a && r.parents[1] === b) || (r.parents[0] === b && r.parents[1] === a),
  );
}
