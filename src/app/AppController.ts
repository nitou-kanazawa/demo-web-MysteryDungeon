import { Campaign } from '../domain/base/Campaign';
import { HomeBase } from '../domain/base/HomeBase';
import type { Command } from '../domain/game/Command';
import { GameSession } from '../domain/game/GameSession';
import { BaseController } from './base/BaseController';
import type { BaseStorage } from './base/BaseStorage';
import { GameController } from './GameController';
import { SceneTransition, TRANSITIONS } from './render/Transition';

export type Scene = { readonly kind: 'base' } | { readonly kind: 'dungeon'; readonly game: GameController };

/**
 * アプリ全体の状態機械。拠点 ⇄ ダンジョンの遷移と永続化を担当する。
 */
export class AppController {
  readonly campaign: Campaign;
  readonly baseCtrl: BaseController;
  scene: Scene = { kind: 'base' };
  readonly transition = new SceneTransition();
  /** 遷移のスナップショット元（描画キャンバス）。main が設定する */
  canvas: HTMLCanvasElement | undefined;

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

  private lastTick = 0;

  /** 毎フレーム呼ぶ。拠点の歩行、演出の取り込み、階移動・終了の遷移を起動する */
  tick(now: number): void {
    const dt = this.lastTick ? Math.min(50, now - this.lastTick) : 0;
    this.lastTick = now;
    if (this.scene.kind === 'base') {
      if (!this.transition.blocksInput(now)) this.baseCtrl.tick(dt);
      return;
    }
    const game = this.scene.game;
    game.tick(now);
    const floor = game.consumeFloorChange();
    if (floor) this.transition.start(TRANSITIONS.floor(floor.title, floor.subtitle), now, this.canvas);
    const ended = game.consumeEnded();
    if (ended) this.transition.start(TRANSITIONS[ended](), now, this.canvas);
  }

  /** 押しっぱなしの追跡（拠点の歩行用） */
  setHeld(code: string, down: boolean): void {
    this.baseCtrl.setHeld(code, down);
  }

  handleKey(e: KeyboardEvent): boolean {
    if (this.transition.blocksInput(performance.now())) return true;
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
    const now = performance.now();
    const session = this.campaign.startSortie(seed);
    const game = new GameController(session);
    game.markCurrentTheme();
    // 出撃直後の演出イベント（配置など）は捨てる
    session.visuals.drain();
    this.transition.start(
      TRANSITIONS.sortie(`出撃  ${session.state.floor}F  ${session.state.theme.name}`, session.state.theme.description),
      now,
      this.canvas,
    );
    this.scene = { kind: 'dungeon', game };
    this.save();
  }

  /** リプレイ JSON からダンジョンを再現（デバッグ用。拠点には反映しない） */
  loadReplay(json: string): void {
    const replay = JSON.parse(json) as { seed: number; commands: Command[] };
    this.scene = { kind: 'dungeon', game: new GameController(GameSession.replay(replay)) };
  }

  private returnToBase(session: GameSession): void {
    const now = performance.now();
    const result = this.campaign.endSortie(session);
    this.transition.start(TRANSITIONS.toBase(result.message), now, this.canvas);
    this.scene = { kind: 'base' };
    this.baseCtrl.showResult(result.message, result.allyNotes);
    this.save();
  }

  private save(): void {
    this.storage.save(this.base.toJSON());
  }
}
