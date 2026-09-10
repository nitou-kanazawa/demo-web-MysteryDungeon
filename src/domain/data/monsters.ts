import type { MonsterDef } from '../entity/MonsterDef';

/** モンスター定義テーブル（DQ風の名前・特徴を持つオリジナルデータ） */
export const MONSTER_DEFS: readonly MonsterDef[] = [
  { id: 'slime', name: 'スライム', glyph: 'ス', color: '#4FA7FF', hp: 8, atk: 3, def: 1, exp: 3, minFloor: 1, maxFloor: 3, speed: 1, recruitChance: 0.25 },
  { id: 'dracky', name: 'ドラキー', glyph: 'ド', color: '#B08CFF', hp: 9, atk: 4, def: 1, exp: 4, minFloor: 1, maxFloor: 4, speed: 1, recruitChance: 0.2 },
  { id: 'hammerhood', name: 'おおきづち', glyph: 'お', color: '#E0B070', hp: 14, atk: 6, def: 2, exp: 7, minFloor: 2, maxFloor: 5, speed: 1, recruitChance: 0.15 },
  { id: 'ghost', name: 'ゴースト', glyph: 'ゴ', color: '#C8E8FF', hp: 12, atk: 7, def: 1, exp: 8, minFloor: 3, maxFloor: 6, speed: 2, recruitChance: 0 },
  { id: 'shebeth', name: 'スライムベス', glyph: 'ベ', color: '#FF7A7A', hp: 18, atk: 9, def: 3, exp: 12, minFloor: 4, maxFloor: 7, speed: 1, recruitChance: 0.2 },
  { id: 'chimaera', name: 'キメラ', glyph: 'キ', color: '#FFD24F', hp: 24, atk: 11, def: 4, exp: 18, minFloor: 5, maxFloor: 8, speed: 2, recruitChance: 0.1 },
  { id: 'golem', name: 'ゴーレム', glyph: 'ゴ', color: '#A0A0A0', hp: 40, atk: 14, def: 8, exp: 30, minFloor: 7, maxFloor: 10, speed: 1, recruitChance: 0.05 },
  { id: 'dragon', name: 'ドラゴン', glyph: '竜', color: '#FF5533', hp: 55, atk: 18, def: 9, exp: 50, minFloor: 9, maxFloor: 10, speed: 1, recruitChance: 0.03 },
];

/** ガーゴイル（店主）。通常は出現テーブルに含まれず、どろぼうをすると敵になる */
export const GARGOYLE_DEF: MonsterDef = { id: 'gargoyle', name: 'ガーゴイル', glyph: 'ガ', color: '#8b9bb4', hp: 120, atk: 32, def: 18, exp: 200, minFloor: 0, maxFloor: 0, speed: 2, recruitChance: 0 };

/** 図鑑に載る全モンスター（店主を含む） */
export const ALL_MONSTER_DEFS: readonly MonsterDef[] = [...MONSTER_DEFS, GARGOYLE_DEF];

export const MONSTER_MAP: ReadonlyMap<string, MonsterDef> = new Map(ALL_MONSTER_DEFS.map((m) => [m.id, m]));
