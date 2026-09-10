import { DEFAULT_GENERATOR_CONFIG } from '../domain/map/DungeonGenerator';
import { GameController } from './GameController';
import { Renderer } from './render/Renderer';

function seedFromUrl(): number {
  const s = new URLSearchParams(location.search).get('seed');
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) ? n >>> 0 : Date.now() >>> 0;
}

function main(): void {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#game canvas not found');
  const controller = new GameController(seedFromUrl());
  const renderer = new Renderer(canvas, DEFAULT_GENERATOR_CONFIG.width, DEFAULT_GENERATOR_CONFIG.height);

  const fit = (): void => {
    const scale = Math.min(window.innerWidth / renderer.width, window.innerHeight / renderer.height, 1.5);
    canvas.style.width = `${Math.floor(renderer.width * scale)}px`;
    canvas.style.height = `${Math.floor(renderer.height * scale)}px`;
  };
  fit();
  window.addEventListener('resize', fit);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') {
      const json = controller.exportReplay();
      void navigator.clipboard?.writeText(json);
      console.log('[replay]', json);
      controller.session.log.push('リプレイをクリップボードにコピーした。');
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyO') {
      const json = window.prompt('リプレイ JSON を貼り付け');
      if (json) controller.loadReplay(json);
      e.preventDefault();
      return;
    }
    if (controller.handleKey(e)) e.preventDefault();
  });

  const loop = (t: number): void => {
    renderer.render(controller.session, controller.mode, t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // デバッグ用にグローバル公開
  (window as unknown as { game: GameController }).game = controller;
}

main();
