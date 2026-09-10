import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GameSession } from '../src/domain/game/GameSession';
import type { Replay } from '../src/domain/game/Command';
import type { SessionOptions } from '../src/domain/game/GameSession';

interface Fixture {
  replay: Replay;
  options: SessionOptions;
  expected: {
    turn: number;
    floor: number;
    status: string;
    pos: { x: number; y: number };
    hp: number;
    level: number;
    gold: number;
    hunger: number;
    inventory: string[];
    allies: number;
    logLength: number;
    lastLog: string[];
  };
}

/**
 * 記録済みリプレイ（seed + コマンド列）を再生し、結果が固定値と一致することを確認する回帰テスト。
 * ゲームルールや乱数消費順を変えた場合はこのテストが落ちるので、意図した変更なら
 * fixtures/replay-sample.json を更新すること。
 */
describe('Replay regression', () => {
  it('fixtures/replay-sample.json を再生すると記録時と同じ結果になる', () => {
    const fx = JSON.parse(readFileSync('tests/fixtures/replay-sample.json', 'utf8')) as Fixture;
    const s = GameSession.replay(fx.replay, fx.options);
    const p = s.state.player;
    expect(s.state.turn).toBe(fx.expected.turn);
    expect(s.state.floor).toBe(fx.expected.floor);
    expect(s.state.status).toBe(fx.expected.status);
    expect(p.pos).toEqual(fx.expected.pos);
    expect(p.hp).toBe(fx.expected.hp);
    expect(p.level).toBe(fx.expected.level);
    expect(p.gold).toBe(fx.expected.gold);
    expect(p.hunger).toBe(fx.expected.hunger);
    expect(p.inventory.items.map((i) => i.displayName)).toEqual(fx.expected.inventory);
    expect(s.state.allies.length).toBe(fx.expected.allies);
    expect(s.log.all.length).toBe(fx.expected.logLength);
    expect(s.log.recent(3)).toEqual(fx.expected.lastLog);
  });

  it('装備と錬金の壺の操作がリプレイに含まれ、効果が再現される', () => {
    const fx = JSON.parse(readFileSync('tests/fixtures/replay-sample.json', 'utf8')) as Fixture;
    const s = GameSession.replay(fx.replay, fx.options);
    expect(s.state.player.weapon?.def.id).toBe('copper_sword');
    const pot = s.state.player.inventory.items.find((i) => i.def.id === 'pot_alchemy');
    expect(pot).toBeDefined();
    // 150 ターン以上経過しているので、やくそう×2 → じょうやくそう の調合は完了している
    expect(pot?.brewing).toBeUndefined();
    expect(pot?.contents[0]?.def.id).toBe('good_herb');
  });
});
