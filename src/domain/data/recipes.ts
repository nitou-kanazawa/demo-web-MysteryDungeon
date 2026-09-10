import type { Recipe } from '../alchemy/Recipe';

/** 錬金レシピテーブル。inputs は順不同の多重集合 */
export const RECIPES: readonly Recipe[] = [
  { id: 'good_herb', inputs: ['herb', 'herb'], output: 'good_herb', turns: 20 },
  { id: 'special_herb', inputs: ['good_herb', 'good_herb'], output: 'special_herb', turns: 30 },
  { id: 'big_bread', inputs: ['bread', 'bread'], output: 'big_bread', turns: 20 },
  { id: 'life_nut', inputs: ['herb', 'holy_water'], output: 'life_nut', turns: 40 },
  { id: 'iron_sword', inputs: ['copper_sword', 'iron_lump'], output: 'iron_sword', turns: 50 },
  { id: 'iron_shield', inputs: ['scale_shield', 'iron_lump'], output: 'iron_shield', turns: 50 },
  { id: 'dragon_killer', inputs: ['iron_sword', 'monster_fang', 'holy_water'], output: 'dragon_killer', turns: 80 },
];
