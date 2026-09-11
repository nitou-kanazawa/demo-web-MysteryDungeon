import { describe, expect, it } from 'vitest';
import { AppController } from '../src/app/AppController';
import { MemoryBaseStorage } from '../src/app/base/BaseStorage';

/**
 * ダンジョン途中のセーブ。出撃中の記録はリプレイそのもので、
 * 同じストレージから AppController を作り直すと途中から再開できる。
 */
describe('出撃の途中再開', () => {
  it('コマンドが増えるたびに記録され、再起動で同じ状態から再開する', () => {
    const storage = new MemoryBaseStorage();
    const app = new AppController(storage, () => 777);
    expect(app.scene.kind).toBe('base');
    app.startSortie(777);
    expect(app.scene.kind).toBe('dungeon');
    if (app.scene.kind !== 'dungeon') return;
    const session = app.scene.game.session;
    session.state.monsters = [];
    for (const dir of ['N', 'E', 'S', 'W', 'N'] as const) session.execute({ type: 'move', dir });
    for (let i = 0; i < 5; i++) session.execute({ type: 'wait' });
    app.tick(100);
    expect(storage.sortie).toBeDefined();
    expect(storage.sortie!.commands.length).toBe(session.history.length);

    const app2 = new AppController(storage, () => 1);
    expect(app2.resumed).toBe(true);
    expect(app2.scene.kind).toBe('dungeon');
    if (app2.scene.kind !== 'dungeon') return;
    const s2 = app2.scene.game.session;
    expect(s2.state.turn).toBe(session.state.turn);
    expect(s2.state.floor).toBe(session.state.floor);
    expect(s2.state.player.pos).toEqual(session.state.player.pos);
    expect(s2.state.player.hp).toBe(session.state.player.hp);
    expect(s2.state.player.inventory.items.map((i) => i.def.id)).toEqual(session.state.player.inventory.items.map((i) => i.def.id));
    expect(s2.log.all.at(-1)).toContain('途中から再開');
  });

  it('帰還すると記録は消え、次の起動は拠点から始まる', () => {
    const storage = new MemoryBaseStorage();
    const app = new AppController(storage, () => 778);
    app.startSortie(778);
    if (app.scene.kind !== 'dungeon') return;
    const session = app.scene.game.session;
    session.execute({ type: 'wait' });
    app.tick(100);
    expect(storage.sortie).toBeDefined();
    session.state.status = 'escaped';
    app.scene.game.exitRequested = true;
    // 終了はキー入力経由（handleKey）で拠点へ戻る
    (app as unknown as { returnToBase: (s: unknown) => void }).returnToBase(session);
    expect(storage.sortie).toBeUndefined();
    const app2 = new AppController(storage, () => 1);
    expect(app2.scene.kind).toBe('base');
    expect(app2.resumed).toBe(false);
  });

  it('壊れた記録は捨てて拠点から始まる', () => {
    const storage = new MemoryBaseStorage();
    storage.sortie = { seed: 1, commands: [{ type: 'use', index: 99 }], startingAllies: [{ defId: 'no_such_monster', level: 1, exp: 0, bonusHp: 0, bonusAtk: 0, bonusDef: 0 }] };
    const app = new AppController(storage, () => 1);
    expect(app.scene.kind).toBe('base');
    expect(storage.sortie).toBeUndefined();
  });
});
