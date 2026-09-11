import { smithCost } from '../data/npcs';
import type { Player } from '../entity/Player';
import type { MessageLog } from './MessageLog';

/** 鍛冶屋: ゴールドで装備中の武器（無ければ盾）の修正値を +1 */
export class SmithService {
  constructor(private readonly log: MessageLog) {}

  talk(player: Player): void {
    const target = player.weapon ?? player.shield;
    if (!target) {
      this.log.push('ドワーフ「装備してる物がねえと打てねえよ」');
      return;
    }
    const cost = smithCost(target.plus);
    if (player.gold < cost) {
      this.log.push(`ドワーフ「${target.def.name}を鍛えるなら${cost}Gだ。金が足りねえな」（所持 ${player.gold}G）`);
      return;
    }
    player.gold -= cost;
    target.plus += 1;
    this.log.push(`ドワーフ「いい仕事だ！」 ${target.displayName}になった。（${cost}G）`);
  }
}
