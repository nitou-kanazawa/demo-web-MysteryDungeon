/** アイテム実体の永続化・リプレイ用の純粋データ表現 */
export interface ItemSnapshot {
  readonly id: string;
  readonly plus?: number;
  readonly charges?: number;
  readonly contents?: readonly ItemSnapshot[];
  readonly brewing?: { readonly result: string; readonly remaining: number };
}
