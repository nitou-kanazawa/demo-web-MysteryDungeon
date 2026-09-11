/** 錬金レシピ。inputs は定義IDの多重集合（順不同） */
export interface Recipe {
  readonly id: string;
  readonly inputs: readonly string[];
  readonly output: string;
  /** 完成までのターン数 */
  readonly turns: number;
}
