import type { Player } from '../../domain/entity/Player';
import type { ItemInstance } from '../../domain/item/ItemInstance';
import type { ItemAction } from './UiState';

/** アイテム種別と状態に応じたアクション一覧を組み立てる */
export function buildItemActions(item: ItemInstance, player: Player): ItemAction[] {
  const actions: ItemAction[] = [];
  switch (item.def.category) {
    case 'food':
    case 'herb':
    case 'seed':
      actions.push({ id: 'use', label: '食べる' });
      break;
    case 'scroll':
      actions.push({ id: 'use', label: '読む' });
      break;
    case 'staff':
      actions.push({ id: 'use', label: '振る' });
      break;
    case 'weapon':
    case 'shield':
      actions.push(player.isEquipped(item) ? { id: 'unequip', label: '外す' } : { id: 'equip', label: '装備' });
      break;
    case 'pot':
      actions.push({ id: 'potIn', label: '入れる' });
      actions.push({ id: 'potOut', label: '出す' });
      break;
    default:
      break;
  }
  actions.push({ id: 'throw', label: '投げる' });
  actions.push({ id: 'drop', label: '置く' });
  return actions;
}
