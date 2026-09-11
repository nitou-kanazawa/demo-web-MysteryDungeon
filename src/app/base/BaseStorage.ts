import type { HomeBaseJson } from '../../domain/base/HomeBase';
import type { Replay } from '../../domain/game/Command';

/**
 * 拠点データと「出撃中の記録」の永続化先の抽象。
 * 出撃中の記録はリプレイ（seed＋持ち込み＋コマンド列）そのもので、再生すれば途中から再開できる。
 */
export interface BaseStorage {
  load(): HomeBaseJson | undefined;
  save(json: HomeBaseJson): void;
  loadSortie(): Replay | undefined;
  saveSortie(replay: Replay): void;
  clearSortie(): void;
}

export class LocalStorageBaseStorage implements BaseStorage {
  constructor(
    private readonly key = 'mysterydungeon.home.v1',
    private readonly sortieKey = 'mysterydungeon.sortie.v1',
  ) {}

  loadSortie(): Replay | undefined {
    try {
      const raw = localStorage.getItem(this.sortieKey);
      return raw ? (JSON.parse(raw) as Replay) : undefined;
    } catch {
      return undefined;
    }
  }

  saveSortie(replay: Replay): void {
    try {
      localStorage.setItem(this.sortieKey, JSON.stringify(replay));
    } catch {
      /* 容量超過などは無視 */
    }
  }

  clearSortie(): void {
    try {
      localStorage.removeItem(this.sortieKey);
    } catch {
      /* ignore */
    }
  }

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
  sortie: Replay | undefined;
  load(): HomeBaseJson | undefined {
    return this.data;
  }
  save(json: HomeBaseJson): void {
    this.data = json;
  }
  loadSortie(): Replay | undefined {
    return this.sortie;
  }
  saveSortie(replay: Replay): void {
    this.sortie = replay;
  }
  clearSortie(): void {
    this.sortie = undefined;
  }
}
