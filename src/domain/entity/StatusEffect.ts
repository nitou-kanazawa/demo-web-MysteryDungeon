/** 状態異常の種類 */
export type StatusKind = 'paralysis' | 'confusion' | 'sleep';

export const STATUS_LABEL: Readonly<Record<StatusKind, string>> = {
  paralysis: 'かなしばり',
  confusion: '混乱',
  sleep: '眠り',
};
