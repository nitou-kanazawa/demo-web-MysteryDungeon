import type { ItemInstance } from './ItemInstance';

export class Inventory {
  private readonly slots: ItemInstance[] = [];

  constructor(readonly capacity: number) {}

  get items(): readonly ItemInstance[] {
    return this.slots;
  }

  get count(): number {
    return this.slots.length;
  }

  get isFull(): boolean {
    return this.slots.length >= this.capacity;
  }

  add(item: ItemInstance): boolean {
    if (this.isFull) return false;
    this.slots.push(item);
    return true;
  }

  remove(item: ItemInstance): boolean {
    const i = this.slots.indexOf(item);
    if (i < 0) return false;
    this.slots.splice(i, 1);
    return true;
  }

  at(index: number): ItemInstance | undefined {
    return this.slots[index];
  }

  has(item: ItemInstance): boolean {
    return this.slots.includes(item);
  }
}
