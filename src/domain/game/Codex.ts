/** 図鑑。見たモンスター・入手したアイテム・発見したレシピの ID を記録する（出撃をまたいで永続） */
export class Codex {
  readonly monsters: Set<string>;
  readonly items: Set<string>;
  readonly recipes: Set<string>;

  constructor(init?: { monsters?: readonly string[]; items?: readonly string[]; recipes?: readonly string[] }) {
    this.monsters = new Set(init?.monsters ?? []);
    this.items = new Set(init?.items ?? []);
    this.recipes = new Set(init?.recipes ?? []);
  }

  /** 新規登録なら true */
  seeMonster(id: string): boolean {
    if (this.monsters.has(id)) return false;
    this.monsters.add(id);
    return true;
  }

  obtainItem(id: string): boolean {
    if (this.items.has(id)) return false;
    this.items.add(id);
    return true;
  }

  toJSON(): { monsters: string[]; items: string[]; recipes: string[] } {
    return { monsters: [...this.monsters], items: [...this.items], recipes: [...this.recipes] };
  }
}
