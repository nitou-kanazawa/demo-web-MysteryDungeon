/** 敵・仲間の見た目スキン。内部の種族ID・ステータスには影響しない */
export type SpriteSkin = 'classic' | 'girl';

export const SPRITE_SKINS: readonly SpriteSkin[] = ['classic', 'girl'];

export const SKIN_LABEL: Readonly<Record<SpriteSkin, string>> = {
  classic: 'クラシック',
  girl: 'モンスター娘',
};

interface SettingsJson {
  skin?: SpriteSkin;
}

/** 描画に関する設定（localStorage に保存） */
export class RenderSettings {
  skin: SpriteSkin = 'classic';

  constructor(private readonly key = 'mysterydungeon.settings.v1') {}

  load(): this {
    try {
      const raw = localStorage.getItem(this.key);
      const json = raw ? (JSON.parse(raw) as SettingsJson) : {};
      if (json.skin && SPRITE_SKINS.includes(json.skin)) this.skin = json.skin;
    } catch {
      /* ignore */
    }
    return this;
  }

  save(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify({ skin: this.skin } satisfies SettingsJson));
    } catch {
      /* ignore */
    }
  }

  cycleSkin(): SpriteSkin {
    const i = SPRITE_SKINS.indexOf(this.skin);
    this.skin = SPRITE_SKINS[(i + 1) % SPRITE_SKINS.length] ?? 'classic';
    this.save();
    return this.skin;
  }
}

/** アプリ全体で共有する描画設定 */
export const renderSettings = new RenderSettings();
