import type { MonsterDef } from '../entity/MonsterDef';

/** モンスター定義テーブル（DQ風の名前・特徴を持つオリジナルデータ） */
export const MONSTER_DEFS: readonly MonsterDef[] = [
  { id: 'slime', name: 'スライム', family: 'slime', glyph: 'ス', color: '#4FA7FF', hp: 8, atk: 3, def: 1, exp: 3, minFloor: 1, maxFloor: 3, speed: 1, recruitChance: 0.25, rank: 1, skills: [{ id: 'hoimi', level: 2 }] },
  { id: 'dracky', name: 'ドラキー', family: 'bird', glyph: 'ド', color: '#B08CFF', hp: 9, atk: 4, def: 1, exp: 4, minFloor: 1, maxFloor: 4, speed: 1, recruitChance: 0.2, rank: 1, skills: [{ id: 'drain', level: 1 }] },
  { id: 'hammerhood', name: 'おおきづち', family: 'beast', glyph: 'お', color: '#E0B070', hp: 14, atk: 6, def: 2, exp: 7, minFloor: 2, maxFloor: 5, speed: 1, recruitChance: 0.15, rank: 2, skills: [{ id: 'smash', level: 3 }] },
  { id: 'ghost', name: 'ゴースト', family: 'zombie', glyph: 'ゴ', color: '#C8E8FF', hp: 12, atk: 7, def: 1, exp: 8, minFloor: 3, maxFloor: 6, speed: 2, recruitChance: 0, rank: 2, skills: [{ id: 'drain', level: 1 }] },
  { id: 'shebeth', name: 'スライムベス', family: 'slime', glyph: 'ベ', color: '#FF7A7A', hp: 18, atk: 9, def: 3, exp: 12, minFloor: 4, maxFloor: 7, speed: 1, recruitChance: 0.2, rank: 3, skills: [{ id: 'hoimi', level: 1 }] },
  { id: 'chimaera', name: 'キメラ', family: 'bird', glyph: 'キ', color: '#FFD24F', hp: 24, atk: 11, def: 4, exp: 18, minFloor: 5, maxFloor: 8, speed: 2, recruitChance: 0.1, rank: 4, skills: [{ id: 'fire_breath', level: 1 }, { id: 'behoimi', level: 5 }] },
  { id: 'golem', name: 'ゴーレム', family: 'material', glyph: 'ゴ', color: '#A0A0A0', hp: 40, atk: 14, def: 8, exp: 30, minFloor: 7, maxFloor: 10, speed: 1, recruitChance: 0.05, rank: 5, skills: [{ id: 'smash', level: 1 }] },
  { id: 'dragon', name: 'ドラゴン', family: 'dragon', glyph: '竜', color: '#FF5533', hp: 55, atk: 18, def: 9, exp: 50, minFloor: 9, maxFloor: 10, speed: 1, recruitChance: 0.03, rank: 6, skills: [{ id: 'fire_breath', level: 1 }, { id: 'big_fire', level: 6 }] },
];

/** ガーゴイル（店主）。通常は出現テーブルに含まれず、どろぼうをすると敵になる。配合でも生まれる */
export const GARGOYLE_DEF: MonsterDef = { id: 'gargoyle', name: 'ガーゴイル', family: 'devil', glyph: 'ガ', color: '#8b9bb4', hp: 120, atk: 32, def: 18, exp: 200, minFloor: 0, maxFloor: 0, speed: 2, recruitChance: 0, rank: 7, skills: [{ id: 'smash', level: 1 }, { id: 'fire_breath', level: 4 }] };

/** 配合でのみ生まれる種族 */
export const BRED_MONSTER_DEFS: readonly MonsterDef[] = [
  { id: 'king_slime', name: 'キングスライム', family: 'slime', glyph: '王', color: '#3B82F6', hp: 45, atk: 12, def: 6, exp: 40, minFloor: 0, maxFloor: 0, speed: 1, recruitChance: 0, rank: 5, skills: [{ id: 'hoimi', level: 1 }, { id: 'behoimi', level: 4 }] },
  { id: 'taho_dracky', name: 'タホドラキー', family: 'bird', glyph: '夕', color: '#F472B6', hp: 22, atk: 10, def: 3, exp: 20, minFloor: 0, maxFloor: 0, speed: 2, recruitChance: 0, rank: 4, skills: [{ id: 'drain', level: 1 }, { id: 'hoimi', level: 3 }] },
  { id: 'metal_dragon', name: 'メタルドラゴン', family: 'material', glyph: '鋼', color: '#94A3B8', hp: 90, atk: 26, def: 16, exp: 300, minFloor: 0, maxFloor: 0, speed: 1, recruitChance: 0, rank: 8, skills: [{ id: 'big_fire', level: 1 }, { id: 'smash', level: 3 }] },
];

/** 系統配合で生まれる種族 */
export const FAMILY_BRED_DEFS: readonly MonsterDef[] = [
  { id: 'drago_slime', name: 'ドラゴスライム', family: 'slime', glyph: '龍', color: '#22c55e', hp: 30, atk: 11, def: 5, exp: 25, minFloor: 0, maxFloor: 0, speed: 1, recruitChance: 0, rank: 4, skills: [{ id: 'fire_breath', level: 1 }, { id: 'hoimi', level: 3 }] },
  { id: 'slime_knight', name: 'スライムナイト', family: 'slime', glyph: '騎', color: '#60a5fa', hp: 34, atk: 13, def: 7, exp: 28, minFloor: 0, maxFloor: 0, speed: 1, recruitChance: 0, rank: 4, skills: [{ id: 'smash', level: 1 }, { id: 'hoimi', level: 2 }] },
  { id: 'wyvern', name: 'ライバーン', family: 'bird', glyph: '翼', color: '#fb923c', hp: 60, atk: 20, def: 8, exp: 90, minFloor: 0, maxFloor: 0, speed: 2, recruitChance: 0, rank: 6, skills: [{ id: 'fire_breath', level: 1 }, { id: 'big_fire', level: 5 }] },
  { id: 'hawkman', name: 'ホークマン', family: 'bird', glyph: '鷹', color: '#a16207', hp: 28, atk: 12, def: 4, exp: 24, minFloor: 0, maxFloor: 0, speed: 2, recruitChance: 0, rank: 4, skills: [{ id: 'drain', level: 1 }, { id: 'smash', level: 4 }] },
  { id: 'stoneman', name: 'ストーンマン', family: 'material', glyph: '岩', color: '#78716c', hp: 70, atk: 18, def: 14, exp: 80, minFloor: 0, maxFloor: 0, speed: 1, recruitChance: 0, rank: 6, skills: [{ id: 'smash', level: 1 }] },
  { id: 'shadow', name: 'シャドー', family: 'zombie', glyph: '影', color: '#4c1d95', hp: 26, atk: 13, def: 3, exp: 26, minFloor: 0, maxFloor: 0, speed: 2, recruitChance: 0, rank: 4, skills: [{ id: 'drain', level: 1 }] },
  { id: 'killer_panther', name: 'キラーパンサー', family: 'beast', glyph: '豹', color: '#facc15', hp: 44, atk: 19, def: 6, exp: 60, minFloor: 0, maxFloor: 0, speed: 2, recruitChance: 0, rank: 5, skills: [{ id: 'smash', level: 1 }] },
  { id: 'dragon_kids', name: 'ドラゴンキッズ', family: 'dragon', glyph: '仔', color: '#84cc16', hp: 24, atk: 10, def: 4, exp: 20, minFloor: 0, maxFloor: 0, speed: 1, recruitChance: 0, rank: 3, skills: [{ id: 'fire_breath', level: 2 }] },
];

/** 図鑑に載る全モンスター（店主・配合種を含む） */
export const ALL_MONSTER_DEFS: readonly MonsterDef[] = [...MONSTER_DEFS, GARGOYLE_DEF, ...BRED_MONSTER_DEFS, ...FAMILY_BRED_DEFS];

export const MONSTER_MAP: ReadonlyMap<string, MonsterDef> = new Map(ALL_MONSTER_DEFS.map((m) => [m.id, m]));
