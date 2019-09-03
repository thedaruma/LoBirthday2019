import { Effect } from "../battle/CombatDataStructures";

export enum ItemCategory {
  consumable,
  keyItem,
  equipment,
}

export interface ItemData {
  id: number | string,
  name: string,
  description: string,
  effectId: Effect,
  effectPotency: number,
  spriteKey: string,
  frame: number,
  category: string,
  collectSound: string
}

export class Item {
  private limit = 99;
  constructor(
    public id: number | string,
    public name: string,
    public description: string,
    public effect: Effect,
    public effectPotency: number,
    public spriteKey: string,
    public frame: number,
    public category: ItemCategory,
    public quantity: number = 1,
    public collectSound: string) {
  }
  public incrementQuantity() {
    if (this.quantity >= this.limit) {
      this.quantity = this.quantity;
    }
    else {
      this.quantity++;
    }
  }
  public decrementQuantity() {
    if (this.quantity <= 0) {
      this.quantity = this.quantity;
    }
    else {
      this.quantity--;
    }
  }
  public setQuantity(amount: number) {
    this.quantity = amount;
  }
}
