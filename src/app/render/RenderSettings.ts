/** 敵・仲間の見た目スキン。内部の種族ID・ステータスには影響しない */
export type SpriteSkin = 'classic' | 'girl';

export const SPRITE_SKINS: readonly SpriteSkin[] = ['classic', 'girl'];

export const SKIN_LABEL: Readonly<Record<SpriteSkin, string>> = {
  classic: 'クラシック',
  girl: 'モンスター娘',
};

interface SettingsJson {
  skin?: SpriteSkin;
  sfx?: boolean;
  bgm?: boolean;
}

/** 描画・音に関する設定（localStorage に保存） */
export class RenderSettings {
  skin: SpriteSkin = 'classic';
  /** 効果音 */
  sfx = true;
  /** BGM */
  bgm = true;
  /** 設定が変わったときに通知する（音の ON/OFF 反映用） */
  onChange: (() => void) | undefined;

  constructor(private readonly key = 'mysterydungeon.settings.v1') {}

  load(): this {
    try {
      const raw = localStorage.getItem(this.key);
      const json = raw ? (JSON.parse(raw) as SettingsJson) : {};
      if (json.skin && SPRITE_SKINS.includes(json.skin)) this.skin = json.skin;
      if (typeof json.sfx === 'boolean') this.sfx = json.sfx;
      if (typeof json.bgm === 'boolean') this.bgm = json.bgm;
    } catch {
      /* ignore */
    }
    return this;
  }

  save(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify({ skin: this.skin, sfx: this.sfx, bgm: this.bgm } satisfies SettingsJson));
    } catch {
      /* ignore */
    }
    this.onChange?.();
  }

  toggleSfx(): boolean {
    this.sfx = !this.sfx;
    this.save();
    return this.sfx;
  }

  toggleBgm(): boolean {
    this.bgm = !this.bgm;
    this.save();
    return this.bgm;
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
