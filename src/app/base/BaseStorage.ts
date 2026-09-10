import type { HomeBaseJson } from '../../domain/base/HomeBase';

/** 拠点データの永続化先の抽象 */
export interface BaseStorage {
  load(): HomeBaseJson | undefined;
  save(json: HomeBaseJson): void;
}

export class LocalStorageBaseStorage implements BaseStorage {
  constructor(private readonly key = 'mysterydungeon.home.v1') {}

  load(): HomeBaseJson | undefined {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as HomeBaseJson) : undefined;
    } catch {
      return undefined;
    }
  }

  save(json: HomeBaseJson): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(json));
    } catch {
      /* 保存できない環境では無視 */
    }
  }
}

export class MemoryBaseStorage implements BaseStorage {
  private data: HomeBaseJson | undefined;
  load(): HomeBaseJson | undefined {
    return this.data;
  }
  save(json: HomeBaseJson): void {
    this.data = json;
  }
}
