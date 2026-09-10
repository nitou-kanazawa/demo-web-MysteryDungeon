import { Campaign } from '../domain/base/Campaign';
import { HomeBase } from '../domain/base/HomeBase';
import type { Command } from '../domain/game/Command';
import { GameSession } from '../domain/game/GameSession';
import { BaseController } from './base/BaseController';
import type { BaseStorage } from './base/BaseStorage';
import { GameController } from './GameController';

export type Scene = { readonly kind: 'base' } | { readonly kind: 'dungeon'; readonly game: GameController };

/**
 * アプリ全体の状態機械。拠点 ⇄ ダンジョンの遷移と永続化を担当する。
 */
export class AppController {
  readonly campaign: Campaign;
  readonly baseCtrl: BaseController;
  scene: Scene = { kind: 'base' };

  constructor(
    private readonly storage: BaseStorage,
    private readonly seedProvider: () => number,
  ) {
    const saved = storage.load();
    const base = saved ? HomeBase.fromJSON(saved) : HomeBase.createNew();
    this.campaign = new Campaign(base);
    this.baseCtrl = new BaseController(base);
    this.save();
  }

  get base(): HomeBase {
    return this.campaign.base;
  }

  handleKey(e: KeyboardEvent): boolean {
    if (this.scene.kind === 'base') {
      const handled = this.baseCtrl.handleKey(e);
      if (this.baseCtrl.sortieRequested) {
        this.baseCtrl.sortieRequested = false;
        this.startSortie(this.seedProvider());
      }
      this.save();
      return handled;
    }
    const game = this.scene.game;
    const handled = game.handleKey(e);
    if (game.exitRequested) this.returnToBase(game.session);
    return handled;
  }

  startSortie(seed: number): void {
    const session = this.campaign.startSortie(seed);
    this.scene = { kind: 'dungeon', game: new GameController(session) };
    this.save();
  }

  /** リプレイ JSON からダンジョンを再現（デバッグ用。拠点には反映しない） */
  loadReplay(json: string): void {
    const replay = JSON.parse(json) as { seed: number; commands: Command[] };
    this.scene = { kind: 'dungeon', game: new GameController(GameSession.replay(replay)) };
  }

  private returnToBase(session: GameSession): void {
    const result = this.campaign.endSortie(session);
    this.scene = { kind: 'base' };
    this.baseCtrl.showResult(result.message, result.allyNotes);
    this.save();
  }

  private save(): void {
    this.storage.save(this.base.toJSON());
  }
}
