import { DEFAULT_GENERATOR_CONFIG } from '../domain/map/DungeonGenerator';
import { AppController } from './AppController';
import { BaseRenderer } from './base/BaseRenderer';
import { LocalStorageBaseStorage } from './base/BaseStorage';
import { Renderer } from './render/Renderer';
import { renderSettings } from './render/RenderSettings';

function seedFromUrl(): number | undefined {
  const s = new URLSearchParams(location.search).get('seed');
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) ? n >>> 0 : undefined;
}

function main(): void {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#game canvas not found');
  const fixedSeed = seedFromUrl();
  renderSettings.load();
  const skinParam = new URLSearchParams(location.search).get('skin');
  if (skinParam === 'girl' || skinParam === 'classic') renderSettings.skin = skinParam;
  const app = new AppController(new LocalStorageBaseStorage(), () => fixedSeed ?? Date.now() >>> 0);
  const renderer = new Renderer(canvas, DEFAULT_GENERATOR_CONFIG.width, DEFAULT_GENERATOR_CONFIG.height);
  const baseRenderer = new BaseRenderer();
  app.canvas = canvas;

  const fit = (): void => {
    const scale = Math.min(window.innerWidth / renderer.width, window.innerHeight / renderer.height, 1.5);
    canvas.style.width = `${Math.floor(renderer.width * scale)}px`;
    canvas.style.height = `${Math.floor(renderer.height * scale)}px`;
  };
  fit();
  window.addEventListener('resize', fit);

  window.addEventListener('keyup', (e) => app.setHeld(e.code, false));
  window.addEventListener('blur', () => app.baseCtrl.releaseAll());
  window.addEventListener('keydown', (e) => {
    app.setHeld(e.code, true);
    if (e.code === 'KeyP' && app.scene.kind === 'dungeon') {
      const json = app.scene.game.exportReplay();
      void navigator.clipboard?.writeText(json);
      console.log('[replay]', json);
      app.scene.game.session.log.push('リプレイをクリップボードにコピーした。');
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyO' && app.scene.kind === 'base') {
      const json = window.prompt('リプレイ JSON を貼り付け（デバッグ用・拠点には反映されません）');
      if (json) app.loadReplay(json);
      e.preventDefault();
      return;
    }
    if (app.handleKey(e)) e.preventDefault();
  });

  const g = canvas.getContext('2d');
  if (!g) throw new Error('2d context unavailable');
  const loop = (t: number): void => {
    app.tick(t);
    // 帰還要求は handleKey 経由で処理される（scene が拠点に切り替わるので再評価する）
    if (app.scene.kind === 'dungeon' && app.scene.game.exitRequested) {
      app.handleKey(new KeyboardEvent('keydown', { code: 'Space' }));
    }
    const scene = app.scene;
    if (scene.kind === 'dungeon') {
      renderer.render(scene.game.session, scene.game.mode, t, scene.game.anim);
    } else {
      baseRenderer.notice = app.baseCtrl.notice;
      baseRenderer.render(g, app.base, app.baseCtrl, renderer.width, renderer.height, t);
    }
    app.transition.draw(g, renderer.width, renderer.height, t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  (window as unknown as { app: AppController }).app = app;
}

main();
